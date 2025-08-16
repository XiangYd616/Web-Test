/**
 * 认证路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const {
  generateTokenPair,
  authMiddleware,
  refreshToken,
  recordSecurityEvent,
  createUserSession
} = require('../middleware/auth');
const { loginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { securityLogger } = require('../middleware/logger');

const router = express.Router();

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', registerRateLimiter, asyncHandler(async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // 验证输入
  const errors = [];

  if (!username) errors.push({ field: 'username', message: '用户名是必填的' });
  if (!email) errors.push({ field: 'email', message: '邮箱是必填的' });
  if (!password) errors.push({ field: 'password', message: '密码是必填的' });
  if (!confirmPassword) errors.push({ field: 'confirmPassword', message: '确认密码是必填的' });

  if (password && confirmPassword && password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: '密码确认不匹配' });
  }

  if (password && password.length < 6) {
    errors.push({ field: 'password', message: '密码长度至少6位' });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push({ field: 'email', message: '邮箱格式无效' });
  }

  if (errors.length > 0) {
    
        return res.validationError(errors);
      }

  try {
    // 检查用户是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      
        return res.conflict('用户', '用户名或邮箱已存在');
      }

    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, role, is_active, created_at`,
      [username, email, hashedPassword, 'user', true]
    );

    const user = result.rows[0];

    // 生成JWT令牌对
    const tokenPair = await generateTokenPair(user.id);

    // 创建用户会话
    await createUserSession(user.id, tokenPair.accessToken, tokenPair.refreshToken, req);

    // 记录安全日志
    securityLogger('user_registered', {
      userId: user.id,
      username: user.username,
      email: user.email
    }, req);

    // 记录安全事件
    await recordSecurityEvent(user.id, 'user_registered', {
      username: user.username,
      email: user.email,
      registrationMethod: 'email'
    }, req, true, 'low');

    return res.success({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
      user: tokenPair.user
    }, '注册成功', 201);
  } catch (error) {
    console.error('注册错误:', error);
    return res.serverError('注册失败，请稍后重试');
  }
}));

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 验证输入
  const errors = [];
  if (!email) errors.push({ field: 'email', message: '邮箱是必填的' });
  if (!password) errors.push({ field: 'password', message: '密码是必填的' });

  if (errors.length > 0) {
    
        return res.validationError(errors);
      }

  try {
    // 查找用户
    const result = await query(
      'SELECT id, username, email, password_hash, role, is_active, last_login, failed_login_attempts, locked_until FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      securityLogger('login_failed', {
        email,
        reason: 'user_not_found'
      }, req);

      await recordSecurityEvent(null, 'login_failed', {
        email,
        reason: 'user_not_found'
      }, req, false, 'medium');

      return res.unauthorized('邮箱或密码错误');
    }

    const user = result.rows[0];

    // 检查账户是否被锁定
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      securityLogger('login_failed', {
        userId: user.id,
        email,
        reason: 'account_locked'
      }, req);

      await recordSecurityEvent(user.id, 'login_failed', {
        email,
        reason: 'account_locked',
        lockedUntil: user.locked_until
      }, req, false, 'high');

      return res.forbidden('账户已被锁定，请稍后重试');
    }

    // 检查账户是否激活
    if (!user.is_active) {
      securityLogger('login_failed', {
        userId: user.id,
        email,
        reason: 'account_disabled'
      }, req);

      await recordSecurityEvent(user.id, 'login_failed', {
        email,
        reason: 'account_disabled'
      }, req, false, 'medium');

      return res.forbidden('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 增加失败登录次数
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;

      // 如果失败次数达到5次，锁定账户30分钟
      if (newFailedAttempts >= 5) {
        lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
      }

      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3',
        [newFailedAttempts, lockUntil, user.id]
      );

      securityLogger('login_failed', {
        userId: user.id,
        email,
        reason: 'invalid_password',
        failedAttempts: newFailedAttempts
      }, req);

      await recordSecurityEvent(user.id, 'login_failed', {
        email,
        reason: 'invalid_password',
        failedAttempts: newFailedAttempts,
        accountLocked: !!lockUntil
      }, req, false, newFailedAttempts >= 3 ? 'high' : 'medium');

      return res.unauthorized('邮箱或密码错误');
    }

    // 重置失败登录次数并更新最后登录时间
    await query(
      'UPDATE users SET last_login = NOW(), failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 生成JWT令牌对
    const tokenPair = await generateTokenPair(user.id);

    // 创建用户会话
    await createUserSession(user.id, tokenPair.accessToken, tokenPair.refreshToken, req);

    // 记录成功登录
    securityLogger('login_success', {
      userId: user.id,
      username: user.username,
      email: user.email
    }, req);

    await recordSecurityEvent(user.id, 'login_success', {
      username: user.username,
      email: user.email,
      loginMethod: 'password'
    }, req, true, 'low');

    return res.success({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
      user: tokenPair.user
    }, '登录成功');
  } catch (error) {
    console.error('登录错误:', error);
    return res.serverError('登录失败，请稍后重试');
  }
}));

/**
 * 验证访问令牌
 * POST /api/auth/verify
 */
router.post('/verify', asyncHandler(async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      
        return res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: '未提供访问令牌'
      });
    }

    // 验证token
    let decoded;
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: '无效的访问令牌'
      });
    }

    // 查找用户
    const result = await query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      
        return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在或已被禁用'
      });
    }

    const user = result.rows[0];

    // 检查用户状态
    if (!user.is_active) {
      
        return res.status(401).json({
        success: false,
        error: 'USER_INACTIVE',
        message: '用户账户已被禁用'
      });
    }

    res.json({
      success: true,
      tokenValid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.username, // 使用username作为fullName的备用值
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        emailVerified: true, // 简化版本默认为true
        preferences: {},
        createdAt: user.created_at,
        lastLoginAt: user.last_login
      }
    });
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Token验证过程中发生错误'
    });
  }
}));

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      
        return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
}));

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', refreshToken);

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // 记录登出日志
  securityLogger('user_logout', {
    userId: req.user.id,
    username: req.user.username
  }, req);

  res.json({
    success: true,
    message: '登出成功'
  });
}));

/**
 * 修改密码
 * PUT /api/auth/change-password
 */
router.put('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // 验证输入
  if (!currentPassword || !newPassword || !confirmPassword) {
    
        return res.status(400).json({
      success: false,
      message: '所有字段都是必填的'
      });
  }

  if (newPassword !== confirmPassword) {
    
        return res.status(400).json({
      success: false,
      message: '新密码确认不匹配'
      });
  }

  if (newPassword.length < 6) {
    
        return res.status(400).json({
      success: false,
      message: '新密码长度至少6位'
      });
  }

  try {
    // 获取当前密码哈希
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      
        return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = result.rows[0];

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      securityLogger('password_change_failed', {
        userId: req.user.id,
        reason: 'invalid_current_password'
      }, req);

      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    // 记录密码修改
    securityLogger('password_changed', {
      userId: req.user.id,
      username: req.user.username
    }, req);

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败，请稍后重试'
    });
  }
}));

/**
 * 密码重置请求
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    
        return res.status(400).json({
      success: false,
      message: '邮箱地址是必需的'
      });
  }

  try {
    // 检查用户是否存在
    const userResult = await query(
      'SELECT id, email, username FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    // 无论用户是否存在，都返回成功消息（安全考虑）
    if (userResult.rows.length === 0) {
      
        return res.json({
        success: true,
        message: '如果该邮箱地址存在，我们已发送重置密码的邮件'
      });
    }

    const user = userResult.rows[0];

    // 生成重置令牌
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期

    // 保存重置令牌
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // TODO: 发送重置密码邮件
    console.log(`密码重置令牌: ${resetToken} (用户: ${user.email})`);

    res.json({
      success: true,
      message: '如果该邮箱地址存在，我们已发送重置密码的邮件'
    });

  } catch (error) {
    console.error('密码重置请求失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}));

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    
        return res.status(400).json({
      success: false,
      message: '所有字段都是必需的'
      });
  }

  if (newPassword !== confirmPassword) {
    
        return res.status(400).json({
      success: false,
      message: '密码确认不匹配'
      });
  }

  if (newPassword.length < 6) {
    
        return res.status(400).json({
      success: false,
      message: '密码长度至少为6个字符'
      });
  }

  try {
    // 查找有效的重置令牌
    const userResult = await query(
      'SELECT id, email, username FROM users WHERE reset_token = $1 AND reset_token_expires > NOW() AND is_active = true',
      [token]
    );

    if (userResult.rows.length === 0) {
      
        return res.status(400).json({
        success: false,
        message: '重置令牌无效或已过期'
      });
    }

    const user = userResult.rows[0];

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码并清除重置令牌
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: '密码重置成功，请使用新密码登录'
    });

  } catch (error) {
    console.error('密码重置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}));

/**
 * 发送邮箱验证
 * POST /api/auth/send-verification
 */
router.post('/send-verification', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const user = req.user;

    if (user.email_verified) {
      
        return res.status(400).json({
        success: false,
        message: '邮箱已经验证过了'
      });
    }

    // 生成验证令牌
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 86400000); // 24小时后过期

    // 保存验证令牌
    await query(
      'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpiry, user.id]
    );

    // TODO: 发送验证邮件
    console.log(`邮箱验证令牌: ${verificationToken} (用户: ${user.email})`);

    res.json({
      success: true,
      message: '验证邮件已发送，请检查您的邮箱'
    });

  } catch (error) {
    console.error('发送验证邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}));

/**
 * 验证邮箱
 * POST /api/auth/verify-email
 */
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    
        return res.status(400).json({
      success: false,
      message: '验证令牌是必需的'
      });
  }

  try {
    // 查找有效的验证令牌
    const userResult = await query(
      'SELECT id, email, username FROM users WHERE verification_token = $1 AND verification_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      
        return res.status(400).json({
        success: false,
        message: '验证令牌无效或已过期'
      });
    }

    const user = userResult.rows[0];

    // 标记邮箱为已验证
    await query(
      'UPDATE users SET email_verified = true, verification_token = NULL, verification_expires = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: '邮箱验证成功'
    });

  } catch (error) {
    console.error('邮箱验证失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}));

module.exports = router;
