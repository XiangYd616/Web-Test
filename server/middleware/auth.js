/**
 * 认证中间件
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'testweb-super-secret-jwt-key-change-in-production-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'testweb-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// 错误类型定义
const AuthErrors = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};

// 创建标准化的认证错误响应
const createAuthError = (type, message, statusCode = 401) => {
  return {
    success: false,
    error: type,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

/**
 * 验证JWT令牌
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      const error = createAuthError(AuthErrors.TOKEN_MISSING, '访问被拒绝，需要认证令牌');
      return res.status(error.statusCode).json(error);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      let error;
      if (jwtError.name === 'TokenExpiredError') {
        error = createAuthError(AuthErrors.TOKEN_EXPIRED, '令牌已过期，请重新登录');
      } else {
        error = createAuthError(AuthErrors.TOKEN_INVALID, '令牌无效');
      }
      return res.status(error.statusCode).json(error);
    }

    // 查询用户信息
    const userResult = await query(
      'SELECT id, email, username, role, is_active, last_login_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      const error = createAuthError(AuthErrors.USER_NOT_FOUND, '令牌无效，用户不存在');
      return res.status(error.statusCode).json(error);
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      const error = createAuthError(AuthErrors.USER_INACTIVE, '用户账户已被禁用');
      return res.status(error.statusCode).json(error);
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      lastLoginAt: user.last_login_at
    };

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);

    const authError = createAuthError(
      AuthErrors.TOKEN_INVALID,
      '认证过程中发生错误',
      500
    );
    return res.status(authError.statusCode).json(authError);
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userResult = await query(
      'SELECT id, email, username, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      req.user = userResult.rows[0];
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * 管理员权限验证
 */
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '需要认证'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }

  next();
};

/**
 * 角色权限验证
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要认证'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasPermission = requiredRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 生成JWT令牌
 */
const generateToken = (userId, expiresIn = null) => {
  const defaultExpiresIn = expiresIn || process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: defaultExpiresIn }
  );
};

/**
 * 验证令牌（不通过中间件）
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * 刷新令牌
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '需要认证令牌'
      });
    }

    // 即使令牌过期也要解析（用于刷新）
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }

    // 检查用户是否存在且活跃
    const userResult = await query(
      'SELECT id, email, username, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
    }

    // 生成新令牌
    const newToken = generateToken(decoded.userId);

    res.json({
      success: true,
      token: newToken,
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '刷新令牌失败'
    });
  }
};

/**
 * 生成token哈希值（用于会话管理）
 */
const hashToken = (token) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * 创建用户会话
 */
const createUserSession = async (userId, token, refreshToken, req) => {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期

    const sessionResult = await query(`
      INSERT INTO user_sessions (
        user_id, token_hash, refresh_token_hash, expires_at,
        ip_address, user_agent, is_active, created_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING id
    `, [
      userId,
      hashToken(token),
      hashToken(refreshToken),
      expiresAt,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent') || 'Unknown'
    ]);

    return sessionResult.rows[0].id;
  } catch (error) {
    console.error('创建用户会话失败:', error);
    throw error;
  }
};

/**
 * 清理过期会话
 */
const cleanupExpiredSessions = async () => {
  try {
    await query('DELETE FROM user_sessions WHERE expires_at < NOW() OR is_active = false');
  } catch (error) {
    console.error('清理过期会话失败:', error);
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminAuth,
  requireRole,
  generateToken,
  verifyToken,
  refreshToken,
  createUserSession,
  cleanupExpiredSessions,
  hashToken,
  AuthErrors,
  createAuthError
};
