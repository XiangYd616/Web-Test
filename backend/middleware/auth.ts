/**
 * 认证中间件 - 使用增强的JWT服务和权限系统
 */

import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      role: string;
      lastLogin?: Date;
      emailVerified?: boolean;
      twoFactorEnabled?: boolean;
    }
  }
}

const JwtService = require('../services/core/jwtService');
const { PermissionService, PERMISSIONS } = require('../services/core/permissionService');
const { query } = require('../config/database');
const { ErrorFactory: _ErrorFactory, ErrorCode } = require('./errorHandler');

// 创建服务实例
const jwtService = new JwtService();
const permissionService = new PermissionService();

type AuthenticatedRequest = Request & {
  user?: Express.User;
};

type ApiResponse = Response & {
  success: (
    data?: unknown,
    message?: string,
    statusCode?: number,
    meta?: Record<string, unknown>
  ) => Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: Record<string, unknown>
  ) => Response;
  unauthorized: (message?: string) => Response;
  forbidden: (message?: string) => Response;
  notFound: (message?: string) => Response;
  conflict: (message?: string) => Response;
  rateLimit: (message?: string) => Response;
  internalError: (message?: string) => Response;
  created: (data?: unknown, message?: string, meta?: Record<string, unknown>) => Response;
  noContent: () => Response;
};

type UserRecord = {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
};

/**
 * 验证JWT令牌 - 使用增强的JWT服务
 */
const authMiddleware = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      res.unauthorized('访问被拒绝，需要认证令牌');
      return;
    }

    // 使用JWT服务验证令牌
    const decoded = jwtService.verifyAccessToken(token);

    // 查询用户信息
    const userResult = await query(
      'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.unauthorized('令牌无效，用户不存在');
      return;
    }

    const user = userResult.rows[0] as UserRecord;

    if (!user.is_active) {
      res.forbidden('用户账户已被禁用');
      return;
    }

    // 将用户信息添加到请求对象
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      lastLogin: user.last_login,
      emailVerified: user.email_verified,
      twoFactorEnabled: user.two_factor_enabled,
    };

    // 记录用户活动（异步，不阻塞请求）
    const userId = user.id;
    recordUserActivity(userId, req).catch((err: unknown) => {
      console.error('记录用户活动失败:', err);
    });

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    const errorCode = (error as { code?: string }).code;

    if (errorCode === ErrorCode.TOKEN_EXPIRED) {
      res.error(ErrorCode.TOKEN_EXPIRED, '令牌已过期，请重新登录');
      return;
    }
    if (errorCode === ErrorCode.INVALID_TOKEN) {
      res.error(ErrorCode.INVALID_TOKEN, '令牌无效');
      return;
    }

    res.serverError('认证过程中发生错误');
    return;
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      req.user = undefined;
      next();
      return;
    }

    // 使用JWT服务验证令牌
    const decoded = jwtService.verifyAccessToken(token);

    const userResult = await query(
      'SELECT id, email, username, role, is_active, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      const user = userResult.rows[0] as UserRecord;
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.email_verified,
      };
    } else {
      (req as AuthenticatedRequest).user = undefined;
    }

    next();
  } catch {
    // 可选认证失败时不返回错误，只是设置用户为null
    (req as AuthenticatedRequest).user = undefined;
    next();
  }
};

/**
 * 权限检查中间件
 */
const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: ApiResponse, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.unauthorized('需要登录才能访问此资源');
      return;
    }

    try {
      const hasPermission = await permissionService.checkUserPermission(req.user.id, permission);

      if (!hasPermission) {
        res.forbidden('您没有权限访问此资源');
        return;
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.serverError('权限检查过程中发生错误');
      return;
    }
  };
};

/**
 * 角色检查中间件
 */
const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: AuthenticatedRequest, res: ApiResponse, next: NextFunction): void => {
    if (!req.user) {
      res.unauthorized('需要登录才能访问此资源');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.forbidden('您的角色无权访问此资源');
      return;
    }

    next();
  };
};

/**
 * 管理员权限检查
 */
const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * 超级管理员权限检查
 */
const requireSuperAdmin = requireRole('superadmin');

/**
 * 记录用户活动
 */
async function recordUserActivity(userId: string, req: Request) {
  try {
    await query(
      'INSERT INTO user_activity (user_id, ip_address, user_agent, endpoint, method, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [userId, req.ip, req.headers['user-agent'] || '', req.originalUrl, req.method]
    );
  } catch (error) {
    // 记录失败不影响主要功能
    console.error('记录用户活动失败:', error);
  }
}

/**
 * API密钥认证中间件
 */
const apiKeyAuth = async (req: Request, res: ApiResponse, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      res.unauthorized('需要API密钥');
      return;
    }

    const result = await query(
      'SELECT user_id, permissions FROM api_keys WHERE key_hash = $2 AND is_active = true AND expires_at > NOW()',
      [apiKey]
    );

    if (result.rows.length === 0) {
      res.unauthorized('无效的API密钥');
      return;
    }

    const keyData = result.rows[0];

    // 查询用户信息
    const userResult = await query(
      'SELECT id, email, username, role FROM users WHERE id = $1 AND is_active = true',
      [keyData.user_id]
    );

    if (userResult.rows.length === 0) {
      res.unauthorized('API密钥对应的用户不存在或已被禁用');
      return;
    }

    const user = userResult.rows[0] as UserRecord;

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('API密钥认证错误:', error);
    res.serverError('API密钥认证过程中发生错误');
    return;
  }
};

/**
 * 双因素认证检查中间件
 */
const require2FA = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.unauthorized('需要登录才能访问此资源');
    return;
  }

  // 如果用户启用了2FA，检查是否已验证
  if (req.user.twoFactorEnabled) {
    const twoFaVerified = req.header('X-2FA-Verified');

    if (!twoFaVerified || twoFaVerified !== 'true') {
      res.forbidden('需要完成双因素认证');
      return;
    }
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  apiKeyAuth,
  require2FA,
  PERMISSIONS,
};

export {
  apiKeyAuth,
  authMiddleware,
  optionalAuth,
  PERMISSIONS,
  require2FA,
  requireAdmin,
  requirePermission,
  requireRole,
  requireSuperAdmin,
};
