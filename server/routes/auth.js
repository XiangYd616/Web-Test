/**
 * 认证路由
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { generateToken, authMiddleware, refreshToken } = require('../middleware/auth');
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
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: '所有字段都是必填的'
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: '密码确认不匹配'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码长度至少6位'
    });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: '邮箱格式无效'
    });
  }

  try {
    // 检查用户是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const result = await query(
      `INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, username, email, role, is_active, created_at`,
      [username, email, hashedPassword, 'user', true]
    );

    const user = result.rows[0];

    // 生成JWT令牌
    const token = generateToken(user.id);

    // 记录安全日志
    securityLogger('user_registered', {
      userId: user.id,
      username: user.username,
      email: user.email
    }, req);

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
}));

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 验证输入
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '邮箱和密码都是必填的'
    });
  }

  try {
    // 查找用户
    const result = await query(
      'SELECT id, username, email, password, role, is_active, last_login FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      securityLogger('login_failed', {
        email,
        reason: 'user_not_found'
      }, req);

      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    const user = result.rows[0];

    // 检查账户是否激活
    if (!user.is_active) {
      securityLogger('login_failed', {
        userId: user.id,
        email,
        reason: 'account_disabled'
      }, req);

      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      securityLogger('login_failed', {
        userId: user.id,
        email,
        reason: 'invalid_password'
      }, req);

      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 更新最后登录时间
    await query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 生成JWT令牌
    const token = generateToken(user.id);

    // 记录成功登录
    securityLogger('login_success', {
      userId: user.id,
      username: user.username,
      email: user.email
    }, req);

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
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
      'SELECT password FROM users WHERE id = $1',
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
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
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
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
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

module.exports = router;
