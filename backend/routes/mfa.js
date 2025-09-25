/**
 * MFA (Multi-Factor Authentication) 路由
 * 处理双因素认证相关功能
 */

const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../../config/database');
const { models } = require('../../database/sequelize');
const { User } = models;
const { logSecurityEvent } = require('../utils/securityLogger');

// 导入认证中间件 - 从正确路径导入
const { authMiddleware } = require('../../middleware/auth');
// 使用正确的中间件名称
const authenticateToken = authMiddleware;
const { body, validationResult } = require('express-validator');

const router = express.Router();

// 生成随机备用码
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

/**
 * 初始化MFA设置
 * POST /api/auth/mfa/setup
 */
router.post('/setup', 
  authenticateToken,
  [
    body('password').notEmpty().withMessage('需要当前密码验证')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { password } = req.body;
      const userId = req.user.id;

      // 查找用户
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户未找到'
        });
      }

      // 验证当前密码
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        await logSecurityEvent(userId, 'mfa_setup_failed', { reason: 'invalid_password' });
        return res.status(401).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 检查MFA是否已启用
      if (user.mfaEnabled) {
        return res.status(409).json({
          success: false,
          message: 'MFA已启用，请先禁用后再重新设置'
        });
      }

      // 生成密钥
      const secret = speakeasy.generateSecret({
        name: user.email,
        issuer: 'Test Web App',
        length: 32
      });

      // 生成QR码
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // 生成备用码
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );

      // 临时保存到会话或缓存（实际应用中建议使用Redis）
      // 这里简化处理，直接返回给前端
      const tempSecret = {
        secret: secret.base32,
        backupCodes: hashedBackupCodes,
        timestamp: Date.now()
      };

      // 可以将临时数据保存到用户表的临时字段或使用Redis
      await user.update({
        mfaTempSecret: JSON.stringify(tempSecret)
      });

      await logSecurityEvent(userId, 'mfa_setup_initiated');

      res.json({
        success: true,
        message: 'MFA设置初始化成功',
        secretKey: secret.base32,
        qrCodeUrl: qrCodeUrl,
        backupCodes: backupCodes, // 注意：生产环境中应该只返回一次
        manualEntryKey: secret.base32
      });

    } catch (error) {
      console.error('MFA setup error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

/**
 * 验证并完成MFA设置
 * POST /api/auth/mfa/verify-setup
 */
router.post('/verify-setup',
  authenticateToken,
  [
    body('token').isLength({ min: 6, max: 6 }).withMessage('验证码必须为6位数字')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      if (!user || !user.mfaTempSecret) {
        return res.status(400).json({
          success: false,
          message: '请先初始化MFA设置'
        });
      }

      const tempData = JSON.parse(user.mfaTempSecret);
      
      // 检查临时数据是否过期（30分钟）
      if (Date.now() - tempData.timestamp > 30 * 60 * 1000) {
        await user.update({ mfaTempSecret: null });
        return res.status(400).json({
          success: false,
          message: 'MFA设置已过期，请重新开始'
        });
      }

      // 验证TOTP代码
      const verified = speakeasy.totp.verify({
        secret: tempData.secret,
        encoding: 'base32',
        token: token,
        window: 2 // 允许时间窗口误差
      });

      if (!verified) {
        await logSecurityEvent(userId, 'mfa_setup_verification_failed');
        return res.status(400).json({
          success: false,
          message: '验证码无效'
        });
      }

      // 启用MFA
      await user.update({
        mfaEnabled: true,
        mfaSecret: tempData.secret,
        mfaBackupCodes: JSON.stringify(tempData.backupCodes),
        mfaTempSecret: null // 清除临时数据
      });

      await logSecurityEvent(userId, 'mfa_enabled');

      res.json({
        success: true,
        message: 'MFA设置完成'
      });

    } catch (error) {
      console.error('MFA verify setup error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

/**
 * MFA登录验证
 * POST /api/auth/mfa/verify
 */
router.post('/verify',
  [
    body('email').isEmail().withMessage('请提供有效的邮箱地址'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('验证码必须为6位数字'),
    body('trustDevice').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { email, token, trustDevice = false } = req.body;


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const user = await User.findOne({ where: { email } });
      if (!user || !user.mfaEnabled) {
        return res.status(404).json({
          success: false,
          message: '用户未找到或未启用MFA'
        });
      }

      // 验证TOTP代码
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        await logSecurityEvent(user.id, 'mfa_verification_failed');
        return res.status(400).json({
          success: false,
          message: '验证码无效'
        });
      }

      // 生成访问令牌
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_verified: true,
        device_trusted: trustDevice
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      });

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // 如果信任设备，记录设备信息（简化实现）
      if (trustDevice) {
        // 在实际应用中，应该记录设备指纹、IP等信息
        await logSecurityEvent(user.id, 'device_trusted');
      }

      await logSecurityEvent(user.id, 'mfa_verification_success');

      res.json({
        success: true,
        message: 'MFA验证成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          mfaEnabled: user.mfaEnabled
        },
        accessToken,
        refreshToken,
        expiresIn: 3600,
        trustedDevice: trustDevice
      });

    } catch (error) {
      console.error('MFA verify error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

/**
 * 使用备用码验证
 * POST /api/auth/mfa/verify-backup
 */
router.post('/verify-backup',
  [
    body('email').isEmail().withMessage('请提供有效的邮箱地址'),
    body('backupCode').isLength({ min: 8, max: 10 }).withMessage('备用码格式不正确'),
    body('trustDevice').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { email, backupCode, trustDevice = false } = req.body;


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const user = await User.findOne({ where: { email } });
      if (!user || !user.mfaEnabled || !user.mfaBackupCodes) {
        return res.status(404).json({
          success: false,
          message: '用户未找到或未启用MFA'
        });
      }

      const hashedBackupCodes = JSON.parse(user.mfaBackupCodes);
      let codeFound = false;
      let validCodeIndex = -1;

      // 验证备用码
      for (let i = 0; i < hashedBackupCodes.length; i++) {
        if (await bcrypt.compare(backupCode.toUpperCase(), hashedBackupCodes[i])) {
          codeFound = true;
          validCodeIndex = i;
          break;
        }
      }

      if (!codeFound) {
        await logSecurityEvent(user.id, 'backup_code_verification_failed');
        return res.status(400).json({
          success: false,
          message: '备用码无效'
        });
      }

      // 使用后的备用码应该被删除
      hashedBackupCodes.splice(validCodeIndex, 1);
      await user.update({
        mfaBackupCodes: JSON.stringify(hashedBackupCodes)
      });

      // 生成访问令牌
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_verified: true,
        device_trusted: trustDevice
      };

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
      });

      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      await logSecurityEvent(user.id, 'backup_code_used', { codesRemaining: hashedBackupCodes.length });

      res.json({
        success: true,
        message: '备用码验证成功',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          mfaEnabled: user.mfaEnabled
        },
        accessToken,
        refreshToken,
        expiresIn: 3600,
        trustedDevice: trustDevice,
        backupCodesRemaining: hashedBackupCodes.length
      });

    } catch (error) {
      console.error('Backup code verify error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

/**
 * 禁用MFA
 * POST /api/auth/mfa/disable
 */
router.post('/disable',
  authenticateToken,
  [
    body('password').notEmpty().withMessage('需要当前密码验证'),
    body('token').optional().isLength({ min: 6, max: 6 }).withMessage('如果提供验证码，必须为6位数字')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { password, token } = req.body;
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户未找到'
        });
      }

      // 验证密码
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        await logSecurityEvent(userId, 'mfa_disable_failed', { reason: 'invalid_password' });
        return res.status(401).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 如果MFA已启用，需要额外的TOTP验证
      if (user.mfaEnabled && user.mfaSecret) {
        if (!token) {
          return res.status(400).json({
            success: false,
            message: '需要MFA验证码来禁用双因素认证'
          });
        }

        const verified = speakeasy.totp.verify({
          secret: user.mfaSecret,
          encoding: 'base32',
          token: token,
          window: 2
        });

        if (!verified) {
          await logSecurityEvent(userId, 'mfa_disable_failed', { reason: 'invalid_token' });
          return res.status(400).json({
            success: false,
            message: '验证码无效'
          });
        }
      }

      // 禁用MFA
      await user.update({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaTempSecret: null
      });

      await logSecurityEvent(userId, 'mfa_disabled');

      res.json({
        success: true,
        message: 'MFA已成功禁用'
      });

    } catch (error) {
      console.error('MFA disable error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

/**
 * 获取MFA状态
 * GET /api/auth/mfa/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'mfaEnabled', 'mfaBackupCodes']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户未找到'
      });
    }

    const backupCodesCount = user.mfaBackupCodes 
      ? JSON.parse(user.mfaBackupCodes).length 
      : 0;

    res.json({
      success: true,
      data: {
        mfaEnabled: user.mfaEnabled,
        backupCodesRemaining: backupCodesCount,
        setupRequired: !user.mfaEnabled
      }
    });

  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
});

/**
 * 重新生成备用码
 * POST /api/auth/mfa/regenerate-backup-codes
 */
router.post('/regenerate-backup-codes',
  authenticateToken,
  [
    body('password').notEmpty().withMessage('需要当前密码验证'),
    body('token').isLength({ min: 6, max: 6 }).withMessage('需要MFA验证码')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array()
        });
      }

      const { password, token } = req.body;
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      if (!user || !user.mfaEnabled) {
        return res.status(400).json({
          success: false,
          message: '用户未找到或MFA未启用'
        });
      }

      // 验证密码
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 验证TOTP代码
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: '验证码无效'
        });
      }

      // 生成新的备用码
      const newBackupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        newBackupCodes.map(code => bcrypt.hash(code, 10))
      );

      await user.update({
        mfaBackupCodes: JSON.stringify(hashedBackupCodes)
      });

      await logSecurityEvent(userId, 'backup_codes_regenerated');

      res.json({
        success: true,
        message: '备用码重新生成成功',
        backupCodes: newBackupCodes
      });

    } catch (error) {
      console.error('Regenerate backup codes error:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后再试'
      });
    }
  }
);

module.exports = router;
