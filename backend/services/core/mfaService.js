/**
 * 多因素认证服务
 * 支持短信验证码、邮箱验证、TOTP等多种认证方式
 * 版本: v2.0.0
 */

const crypto = require('crypto');
// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
// 注意：需要安装这些依赖包
// npm install speakeasy qrcode
const { getPool } = require('../config/database');
const Logger = require('../utils/logger');
const emailService = require('./emailService');
const smsService = require('./smsService');

// ==================== 配置 ====================

const MFA_CONFIG = {
  // 验证码配置
  codeLength: 6,
  codeExpiry: 300, // 5分钟
  maxAttempts: 3,

  // TOTP配置
  totpWindow: 2, // 允许的时间窗口
  totpStep: 30, // 时间步长（秒）

  // 备用码配置
  backupCodesCount: 10,
  backupCodeLength: 8,

  // 信任设备配置
  trustDeviceDuration: 30 * 24 * 60 * 60, // 30天

  // 应用信息
  appName: process.env.APP_NAME || 'TestWeb Platform',
  issuer: process.env.MFA_ISSUER || 'TestWeb'
};

// ==================== MFA服务 ====================

class MFAService {
  constructor() {
    this.activeChallenges = new Map(); // 内存中存储活跃的挑战
    this.startCleanupTimer();
  }

  /**
   * 为用户启用TOTP
   */
  async enableTOTP(userId) {
    const pool = getPool();

    try {
      // 生成TOTP密钥
      const secret = speakeasy.generateSecret({
        name: `${MFA_CONFIG.appName} (User ${userId})`,
        issuer: MFA_CONFIG.issuer,
        length: 32
      });

      // 生成QR码
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // 保存到数据库（临时状态，等待验证）
      await pool.query(`
        INSERT INTO user_mfa_settings (user_id, type, secret, is_enabled, created_at)
        VALUES ($1, 'totp', $2, false, NOW())
        ON CONFLICT (user_id, type) 
        DO UPDATE SET secret = $2, is_enabled = false, created_at = NOW()
      `, [userId, secret.base32]);

      Logger.info('TOTP setup initiated', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: await this.generateBackupCodes(userId)
      };
    } catch (error) {
      Logger.error('Failed to enable TOTP', error, { userId });
      throw error;
    }
  }

  /**
   * 验证并确认TOTP设置
   */
  async verifyTOTPSetup(userId, token) {
    const pool = getPool();

    try {
      // 获取用户的TOTP密钥
      const result = await pool.query(`
        SELECT secret FROM user_mfa_settings 
        WHERE user_id = $1 AND type = 'totp' AND is_enabled = false
      `, [userId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'TOTP设置未找到或已启用' };
      }

      const secret = result.rows[0].secret;

      // 验证TOTP令牌
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: MFA_CONFIG.totpWindow,
        step: MFA_CONFIG.totpStep
      });

      if (verified) {
        // 启用TOTP
        await pool.query(`
          UPDATE user_mfa_settings 
          SET is_enabled = true, verified_at = NOW()
          WHERE user_id = $1 AND type = 'totp'
        `, [userId]);

        // 生成备用码
        const backupCodes = await this.generateBackupCodes(userId);

        Logger.info('TOTP enabled successfully', { userId });

        return {
          success: true,
          message: 'TOTP认证已成功启用',
          backupCodes
        };
      } else {
        return { success: false, message: '验证码无效' };
      }
    } catch (error) {
      Logger.error('Failed to verify TOTP setup', error, { userId });
      throw error;
    }
  }

  /**
   * 禁用TOTP
   */
  async disableTOTP(userId, currentPassword) {
    const pool = getPool();

    try {
      // 这里应该验证当前密码
      // const isPasswordValid = await this.verifyPassword(userId, currentPassword);
      // if (!isPasswordValid) {
      //   return { success: false, message: '当前密码错误' };
      // }

      await pool.query(`
        DELETE FROM user_mfa_settings 
        WHERE user_id = $1 AND type IN ('totp', 'backup_codes')
      `, [userId]);

      // 清除信任设备
      await this.clearTrustedDevices(userId);

      Logger.info('TOTP disabled', { userId });

      return { success: true, message: 'TOTP认证已禁用' };
    } catch (error) {
      Logger.error('Failed to disable TOTP', error, { userId });
      throw error;
    }
  }

  /**
   * 生成备用码
   */
  async generateBackupCodes(userId) {
    const pool = getPool();

    try {
      const codes = [];
      for (let i = 0; i < MFA_CONFIG.backupCodesCount; i++) {
        codes.push(this.generateRandomCode(MFA_CONFIG.backupCodeLength));
      }

      // 哈希备用码后存储
      const hashedCodes = codes.map(code => ({
        code: crypto.createHash('sha256').update(code).digest('hex'),
        used: false
      }));

      await pool.query(`
        INSERT INTO user_mfa_settings (user_id, type, secret, is_enabled, created_at)
        VALUES ($1, 'backup_codes', $2, true, NOW())
        ON CONFLICT (user_id, type) 
        DO UPDATE SET secret = $2, created_at = NOW()
      `, [userId, JSON.stringify(hashedCodes)]);

      Logger.info('Backup codes generated', { userId, count: codes.length });

      return codes;
    } catch (error) {
      Logger.error('Failed to generate backup codes', error, { userId });
      throw error;
    }
  }

  /**
   * 发送短信验证码
   */
  async sendSMSChallenge(userId, phoneNumber) {
    try {
      const code = this.generateRandomCode(MFA_CONFIG.codeLength);
      const challengeId = this.generateChallengeId();

      // 存储挑战
      this.activeChallenges.set(challengeId, {
        userId,
        type: 'sms',
        code: crypto.createHash('sha256').update(code).digest('hex'),
        phoneNumber,
        attempts: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + (MFA_CONFIG.codeExpiry * 1000)
      });

      // 发送短信
      await smsService.sendSMS(phoneNumber, `您的验证码是：${code}，有效期${MFA_CONFIG.codeExpiry / 60}分钟。`);

      Logger.info('SMS challenge sent', { userId, challengeId, phoneNumber: this.maskPhoneNumber(phoneNumber) });

      return {
        success: true,
        challengeId,
        maskedPhone: this.maskPhoneNumber(phoneNumber),
        expiresIn: MFA_CONFIG.codeExpiry
      };
    } catch (error) {
      Logger.error('Failed to send SMS challenge', error, { userId, phoneNumber });
      throw error;
    }
  }

  /**
   * 发送邮箱验证码
   */
  async sendEmailChallenge(userId, email) {
    try {
      const code = this.generateRandomCode(MFA_CONFIG.codeLength);
      const challengeId = this.generateChallengeId();

      // 存储挑战
      this.activeChallenges.set(challengeId, {
        userId,
        type: 'email',
        code: crypto.createHash('sha256').update(code).digest('hex'),
        email,
        attempts: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + (MFA_CONFIG.codeExpiry * 1000)
      });

      // 发送邮件
      await emailService.sendEmail({
        to: email,
        subject: '登录验证码',
        template: 'mfa-code',
        data: {
          code,
          expiryMinutes: MFA_CONFIG.codeExpiry / 60,
          appName: MFA_CONFIG.appName
        }
      });

      Logger.info('Email challenge sent', { userId, challengeId, email: this.maskEmail(email) });

      return {
        success: true,
        challengeId,
        maskedEmail: this.maskEmail(email),
        expiresIn: MFA_CONFIG.codeExpiry
      };
    } catch (error) {
      Logger.error('Failed to send email challenge', error, { userId, email });
      throw error;
    }
  }

  /**
   * 验证MFA挑战
   */
  async verifyChallenge(challengeId, code, deviceFingerprint = null) {
    try {
      const challenge = this.activeChallenges.get(challengeId);

      if (!challenge) {
        return { success: false, message: '验证码已过期或无效' };
      }

      // 检查过期时间
      if (Date.now() > challenge.expiresAt) {
        this.activeChallenges.delete(challengeId);
        return { success: false, message: '验证码已过期' };
      }

      // 检查尝试次数
      if (challenge.attempts >= MFA_CONFIG.maxAttempts) {
        this.activeChallenges.delete(challengeId);
        return { success: false, message: '验证失败次数过多，请重新获取验证码' };
      }

      // 验证码码
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      if (challenge.code !== hashedCode) {
        challenge.attempts++;
        return { success: false, message: '验证码错误' };
      }

      // 验证成功，清除挑战
      this.activeChallenges.delete(challengeId);

      // 如果提供了设备指纹，可以选择信任设备
      let trustToken = null;
      if (deviceFingerprint) {
        trustToken = await this.createTrustedDevice(challenge.userId, deviceFingerprint);
      }

      Logger.info('MFA challenge verified', {
        userId: challenge.userId,
        challengeId,
        type: challenge.type
      });

      return {
        success: true,
        message: '验证成功',
        trustToken
      };
    } catch (error) {
      Logger.error('Failed to verify challenge', error, { challengeId });
      throw error;
    }
  }

  /**
   * 验证TOTP令牌
   */
  async verifyTOTP(userId, token) {
    const pool = getPool();

    try {
      // 获取用户的TOTP密钥
      const result = await pool.query(`
        SELECT secret FROM user_mfa_settings 
        WHERE user_id = $1 AND type = 'totp' AND is_enabled = true
      `, [userId]);

      if (result.rows.length === 0) {
        return { success: false, message: 'TOTP未启用' };
      }

      const secret = result.rows[0].secret;

      // 验证TOTP令牌
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: MFA_CONFIG.totpWindow,
        step: MFA_CONFIG.totpStep
      });

      if (verified) {
        Logger.info('TOTP verified successfully', { userId });
        return { success: true, message: 'TOTP验证成功' };
      } else {
        return { success: false, message: 'TOTP令牌无效' };
      }
    } catch (error) {
      Logger.error('Failed to verify TOTP', error, { userId });
      throw error;
    }
  }

  /**
   * 验证备用码
   */
  async verifyBackupCode(userId, code) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        SELECT secret FROM user_mfa_settings 
        WHERE user_id = $1 AND type = 'backup_codes' AND is_enabled = true
      `, [userId]);

      if (result.rows.length === 0) {
        return { success: false, message: '备用码未设置' };
      }

      const backupCodes = JSON.parse(result.rows[0].secret);
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      // 查找匹配的备用码
      const codeIndex = backupCodes.findIndex(bc => bc.code === hashedCode && !bc.used);

      if (codeIndex === -1) {
        return { success: false, message: '备用码无效或已使用' };
      }

      // 标记备用码为已使用
      backupCodes[codeIndex].used = true;
      backupCodes[codeIndex].usedAt = new Date().toISOString();

      await pool.query(`
        UPDATE user_mfa_settings 
        SET secret = $1 
        WHERE user_id = $2 AND type = 'backup_codes'
      `, [JSON.stringify(backupCodes), userId]);

      // 检查剩余备用码数量
      const remainingCodes = backupCodes.filter(bc => !bc.used).length;

      Logger.info('Backup code used', { userId, remainingCodes });

      return {
        success: true,
        message: '备用码验证成功',
        remainingCodes
      };
    } catch (error) {
      Logger.error('Failed to verify backup code', error, { userId });
      throw error;
    }
  }

  /**
   * 检查设备是否受信任
   */
  async isDeviceTrusted(userId, deviceFingerprint) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        SELECT id FROM trusted_devices 
        WHERE user_id = $1 AND device_fingerprint = $2 
        AND expires_at > NOW() AND is_active = true
      `, [userId, deviceFingerprint]);

      return result.rows.length > 0;
    } catch (error) {
      Logger.error('Failed to check trusted device', error, { userId });
      return false;
    }
  }

  /**
   * 创建信任设备
   */
  async createTrustedDevice(userId, deviceFingerprint, deviceInfo = {}) {
    const pool = getPool();

    try {
      const trustToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + MFA_CONFIG.trustDeviceDuration * 1000);

      await pool.query(`
        INSERT INTO trusted_devices (
          user_id, device_fingerprint, trust_token, device_info,
          created_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, NOW(), $5, true)
        ON CONFLICT (user_id, device_fingerprint) 
        DO UPDATE SET 
          trust_token = $3, 
          expires_at = $5, 
          is_active = true,
          updated_at = NOW()
      `, [userId, deviceFingerprint, trustToken, JSON.stringify(deviceInfo), expiresAt]);

      Logger.info('Trusted device created', { userId, deviceFingerprint });

      return trustToken;
    } catch (error) {
      Logger.error('Failed to create trusted device', error, { userId });
      return null;
    }
  }

  /**
   * 清除用户的所有信任设备
   */
  async clearTrustedDevices(userId) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        UPDATE trusted_devices 
        SET is_active = false 
        WHERE user_id = $1 AND is_active = true
        RETURNING id
      `, [userId]);

      Logger.info('Trusted devices cleared', { userId, count: result.rows.length });

      return result.rows.length;
    } catch (error) {
      Logger.error('Failed to clear trusted devices', error, { userId });
      return 0;
    }
  }

  /**
   * 获取用户MFA状态
   */
  async getUserMFAStatus(userId) {
    const pool = getPool();

    try {
      const result = await pool.query(`
        SELECT type, is_enabled, created_at, verified_at 
        FROM user_mfa_settings 
        WHERE user_id = $1
      `, [userId]);

      const mfaSettings = {};
      result.rows.forEach(row => {
        mfaSettings[row.type] = {
          enabled: row.is_enabled,
          createdAt: row.created_at,
          verifiedAt: row.verified_at
        };
      });

      // 获取备用码剩余数量
      if (mfaSettings.backup_codes?.enabled) {
        const backupResult = await pool.query(`
          SELECT secret FROM user_mfa_settings 
          WHERE user_id = $1 AND type = 'backup_codes'
        `, [userId]);

        if (backupResult.rows.length > 0) {
          const backupCodes = JSON.parse(backupResult.rows[0].secret);
          mfaSettings.backup_codes.remaining = backupCodes.filter(bc => !bc.used).length;
        }
      }

      return mfaSettings;
    } catch (error) {
      Logger.error('Failed to get user MFA status', error, { userId });
      return {};
    }
  }

  // ==================== 私有方法 ====================

  generateRandomCode(length) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  generateChallengeId() {
    return crypto.randomBytes(16).toString('hex');
  }

  maskPhoneNumber(phone) {
    if (!phone || phone.length < 4) return '***';
    return phone.slice(0, 3) + '***' + phone.slice(-4);
  }

  maskEmail(email) {
    if (!email || !email.includes('@')) return '***@***.***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
    return `${maskedLocal}@${domain}`;
  }

  startCleanupTimer() {
    // 每分钟清理过期的挑战
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [challengeId, challenge] of this.activeChallenges.entries()) {
        if (now > challenge.expiresAt) {
          this.activeChallenges.delete(challengeId);
        }
      }
    }, 60000);
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.activeChallenges.clear();
  }
}

// ==================== 数据库表创建 ====================

const createMFATables = async () => {
  const pool = getPool();

  try {
    // MFA设置表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_mfa_settings (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        secret TEXT,
        is_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verified_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, type)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_mfa_settings_user_id ON user_mfa_settings(user_id);
    `);

    // 信任设备表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        trust_token VARCHAR(255) NOT NULL,
        device_info JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, device_fingerprint)
      );
      
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(trust_token);
    `);

    Logger.info('MFA tables created/verified');
  } catch (error) {
    Logger.error('Failed to create MFA tables', error);
    throw error;
  }
};

// ==================== 导出 ====================

const mfaService = new MFAService();

module.exports = {
  MFAService,
  mfaService,
  createMFATables,
  MFA_CONFIG
};
