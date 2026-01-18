/**
 * 认证中间件 - 使用增强的JWT服务和权限系统
 */

const JwtService = require('../services/core/jwtService');
const { PermissionService, PERMISSIONS } = require('../services/core/permissionService');
const { query } = require('../config/database');
const { ErrorFactory, ErrorCode } = require('./errorHandler');

// 创建服务实例
const jwtService = new JwtService();
const permissionService = new PermissionService();


/**
 * 验证JWT令牌 - 使用增强的JWT服务
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      
        return res.unauthorized('访问被拒绝，需要认证令牌');
      }

    // 使用JWT服务验证令牌
    const decoded = jwtService.verifyAccessToken(token);

    // 查询用户信息
    const userResult = await query(
      'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      
        return res.unauthorized('令牌无效，用户不存在');
      }

    const user = userResult.rows[0];

    if (!user.is_active) {
      
        return res.forbidden('用户账户已被禁用');
      }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      lastLogin: user.last_login,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled
    };

    // 记录用户活动（异步，不阻塞请求）
    recordUserActivity(req.user.id, req).catch(err => {
      console.error('记录用户活动失败:', err);
    });

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);

    if (error.code === ErrorCode.TOKEN_EXPIRED) {
      
        return res.error(ErrorCode.TOKEN_EXPIRED, '令牌已过期，请重新登录');
      } else if (error.code === ErrorCode.INVALID_TOKEN) {
      
        return res.error(ErrorCode.INVALID_TOKEN, '令牌无效');
      }

    return res.serverError('认证过程中发生错误');
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      
        req.user = null;
      return next();
      }

    // 使用JWT服务验证令牌
    const decoded = jwtService.verifyAccessToken(token);

    const userResult = await query(
      'SELECT id, email, username, role, is_active, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.email_verified
      };
    } else {
      req.user = null;
    }

    next();
  } catch {
    // 可选认证失败时不返回错误，只是设置用户为null
    req.user = null;
    next();
  }
};

/**
 * 管理员权限验证
 */
const adminAuth = async (req, res, next) => {
  if (!req.user) {
    
        return res.unauthorized('需要认证');
      }

  try {
    const isAdmin = await permissionService.isAdmin(req.user.id);

    if (!isAdmin) {
      
        return res.forbidden('需要管理员权限');
      }

    next();
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return res.serverError('权限验证过程中发生错误');
  }
};

/**
 * 角色权限验证
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      
        return res.unauthorized('需要认证');
      }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasPermission = requiredRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      
        return res.forbidden(`需要以下角色之一: ${requiredRoles.join(', ')
      }`);
    }

    next();
  };
};

/**
 * 权限验证中间件
 */
const requirePermission = (permissions, requireAll = true) => {
  return async (req, res, next) => {
    if (!req.user) {
      
        return res.unauthorized('需要认证');
      }

    try {
      const hasPermission = await permissionService.hasPermission(
        req.user.id,
        permissions,
        requireAll
      );

      if (!hasPermission) {
        const permissionList = Array.isArray(permissions) ? permissions : [permissions];
        const message = requireAll
          ? `需要所有权限: ${permissionList.join(', ')}`
          : `需要以下权限之一: ${permissionList.join(', ')}`;

        return res.forbidden(message);
      }

      next();
    } catch (error) {
      console.error('权限验证失败:', error);
      return res.serverError('权限验证过程中发生错误');
    }
  };
};

/**
 * 生成JWT令牌 - 使用新的JWT服务
 */
const generateToken = async (userId, _expiresIn = null) => {
  try {
    const tokenPair = await jwtService.generateTokenPair(userId);
    return tokenPair.accessToken;
  } catch (error) {
    throw ErrorFactory.fromError(error);
  }
};

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 */
const generateTokenPair = async (userId) => {
  try {
    return await jwtService.generateTokenPair(userId);
  } catch (error) {
    throw ErrorFactory.fromError(error);
  }
};

/**
 * 验证令牌（不通过中间件）
 */
const verifyToken = (token) => {
  try {
    return jwtService.verifyAccessToken(token);
  } catch {
    return null;
  }
};

/**
 * 刷新令牌 - 使用新的JWT服务
 */
const refreshToken = async (req, res, _next) => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      return res.error(ErrorCode.MISSING_REQUIRED_FIELD, '缺少刷新令牌');
    }

    // 使用JWT服务刷新令牌
    const tokenPair = await jwtService.refreshAccessToken(refreshTokenValue);

    return res.success({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
      user: tokenPair.user
    }, '令牌刷新成功');

  } catch (error) {
    console.error('刷新令牌错误:', error);

    if (error.code === ErrorCode.TOKEN_EXPIRED) {
      // 刷新令牌已过期
      return res.error(ErrorCode.TOKEN_EXPIRED, '刷新令牌已过期，请重新登录');
    } else if (error.code === ErrorCode.INVALID_TOKEN) {
      // 刷新令牌无效
      return res.error(ErrorCode.INVALID_TOKEN, '刷新令牌无效');
    }

    return res.serverError('刷新令牌失败');
  }
};

// ...

module.exports = {
  // 核心中间件
  authMiddleware,
  optionalAuth,
  adminAuth,
  requireRole,
  requirePermission,

  // 令牌管理
  generateToken,
  generateTokenPair,
  verifyToken,
  refreshToken,
  revokeAllUserTokens,

  // 权限管理
  getUserPermissions,
  checkUserPermission,

  // 会话管理
  createUserSession,
  cleanupExpiredSessions,

  // 安全日志
  recordSecurityEvent,
  recordUserActivity,

  // 工具函数
  hashToken,

  // 服务实例
  jwtService,
  permissionService,

  PERMISSIONS,
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator',
    ANALYST: 'analyst'
  }
};
