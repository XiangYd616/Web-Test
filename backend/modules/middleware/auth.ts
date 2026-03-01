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

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { query } from '../config/database';
import JwtService from '../core/services/jwtService';
import { PERMISSIONS, PermissionService } from '../core/services/permissionService';
import { ErrorCode } from './errorHandler';

// 创建服务实例
const jwtService = new JwtService();
const permissionService = new PermissionService();

// Supabase JWKS 客户端（用于获取 ES256 公钥验证 JWT）
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const supabaseJwksClient = SUPABASE_URL
  ? jwksClient({
      jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 分钟缓存
      rateLimit: true,
    })
  : null;

/**
 * 通过 JWKS 获取 Supabase 签名公钥
 */
const getSupabaseSigningKey = (header: jwt.JwtHeader): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!supabaseJwksClient) return reject(new Error('Supabase JWKS not configured'));
    supabaseJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      if (!key) return reject(new Error('Signing key not found'));
      resolve(key.getPublicKey());
    });
  });
};

import type { ApiResponse, AuthenticatedRequest } from '../types';

// 本地模式虚拟用户（不写入数据库，仅内存中使用）
const LOCAL_GUEST_USER: Express.User = {
  id: 'local',
  email: 'local@testweb.local',
  username: 'local',
  role: 'admin',
  lastLogin: new Date(),
  emailVerified: true,
  twoFactorEnabled: false,
};

/** 是否运行在本地/桌面 SQLite 模式 */
const isLocalMode = () => process.env.DB_MODE !== 'pg';

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
 * 本地模式(SQLite)下无 token 时自动注入默认用户，免登录使用
 */
const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiRes = res as ApiResponse;
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // 无 token 处理
    if (!token) {
      if (isLocalMode()) {
        // 本地/桌面模式：无需认证，直接注入虚拟游客用户
        req.user = { ...LOCAL_GUEST_USER };
        next();
        return;
      }
      // 云端模式：必须提供 token
      apiRes.unauthorized('请先登录');
      return;
    }

    // 1) 尝试本地 JWT 验证
    let localUser: UserRecord | null = null;
    try {
      const decoded = jwtService.verifyAccessToken(token);
      const userResult = await query(
        'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (userResult.rows.length > 0) {
        localUser = userResult.rows[0] as UserRecord;
      }
    } catch {
      // 本地 JWT 验证失败，继续尝试 Supabase JWT
    }

    // 2) 本地 JWT 未匹配到用户时，尝试 Supabase JWT 验证（ES256 + JWKS）
    if (!localUser && supabaseJwksClient) {
      try {
        // 先解码 header 获取 kid，再用 JWKS 获取对应公钥验证
        const decodedHeader = jwt.decode(token, { complete: true });
        if (!decodedHeader) throw new Error('Invalid JWT');
        const signingKey = await getSupabaseSigningKey(decodedHeader.header);
        const decoded = jwt.verify(token, signingKey, {
          algorithms: ['ES256'],
        }) as jwt.JwtPayload;

        const supabaseUserId = decoded.sub;
        const supabaseEmail = (decoded.email as string) || '';
        const supabaseRole = (decoded.role as string) || 'user';

        if (supabaseUserId) {
          // 查找本地用户记录：先按 Supabase user id，再按 email
          let existingUser = await query(
            'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE id = $1',
            [supabaseUserId]
          );
          if (existingUser.rows.length === 0 && supabaseEmail) {
            existingUser = await query(
              'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE email = $1',
              [supabaseEmail]
            );
          }

          if (existingUser.rows.length > 0) {
            localUser = existingUser.rows[0] as UserRecord;
          } else {
            // 自动创建本地用户记录（Supabase 用户首次访问后端）
            // 处理 username 冲突：加随机后缀
            const baseUsername = supabaseEmail.split('@')[0] || 'user';
            const uniqueSuffix = supabaseUserId.substring(0, 6);
            const username = `${baseUsername}_${uniqueSuffix}`;
            try {
              await query(
                `INSERT INTO users (id, username, email, password_hash, role, is_active, email_verified)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  supabaseUserId,
                  username,
                  supabaseEmail,
                  'supabase_managed',
                  supabaseRole === 'service_role' ? 'admin' : 'user',
                  true,
                  true,
                ]
              );
            } catch {
              // INSERT 失败（极端并发），再查一次
              const retry = await query(
                'SELECT id, email, username, role, is_active, last_login, email_verified, two_factor_enabled FROM users WHERE id = $1',
                [supabaseUserId]
              );
              if (retry.rows.length > 0) {
                localUser = retry.rows[0] as UserRecord;
              }
            }
            if (!localUser) {
              localUser = {
                id: supabaseUserId,
                email: supabaseEmail,
                username,
                role: 'user',
                is_active: true,
                email_verified: true,
              };
            }
          }
        }
      } catch {
        // Supabase JWT 验证也失败
      }
    }

    if (!localUser) {
      apiRes.unauthorized('令牌无效');
      return;
    }

    if (!localUser.is_active) {
      apiRes.forbidden('用户账户已被禁用');
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: localUser.id,
      email: localUser.email,
      username: localUser.username,
      role: localUser.role,
      lastLogin: localUser.last_login,
      emailVerified: localUser.email_verified,
      twoFactorEnabled: localUser.two_factor_enabled,
    };

    // 记录用户活动（异步，不阻塞请求）
    const userId = localUser.id;
    recordUserActivity(userId, req).catch((err: unknown) => {
      console.error('记录用户活动失败:', err);
    });

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    const errorCode = (error as { code?: string }).code;

    if (errorCode === ErrorCode.TOKEN_EXPIRED) {
      apiRes.error(ErrorCode.TOKEN_EXPIRED, '令牌已过期，请重新登录');
      return;
    }
    if (errorCode === ErrorCode.INVALID_TOKEN) {
      apiRes.error(ErrorCode.INVALID_TOKEN, '令牌无效');
      return;
    }

    apiRes.internalError('认证过程中发生错误');
    return;
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
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
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.email_verified,
      };
    } else {
      req.user = undefined;
    }

    next();
  } catch {
    // 可选认证失败时不返回错误，只是设置用户为null
    req.user = undefined;
    next();
  }
};

/**
 * 权限检查中间件
 */
const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const apiRes = res as ApiResponse;
    if (!req.user) {
      apiRes.unauthorized('需要登录才能访问此资源');
      return;
    }

    try {
      const hasPermission = await permissionService.hasPermission(req.user.id, permission);

      if (!hasPermission) {
        apiRes.forbidden('您没有权限访问此资源');
        return;
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      apiRes.internalError('权限检查过程中发生错误');
      return;
    }
  };
};

/**
 * 角色检查中间件
 */
const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const apiRes = res as ApiResponse;
    if (!req.user) {
      apiRes.unauthorized('需要登录才能访问此资源');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      apiRes.forbidden('您的角色无权访问此资源');
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
const apiKeyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiRes = res as ApiResponse;
  try {
    const apiKey = req.header('X-API-Key');

    if (!apiKey) {
      apiRes.unauthorized('需要API密钥');
      return;
    }

    const result = await query(
      'SELECT user_id, permissions FROM api_keys WHERE key_hash = $1 AND is_active = true AND expires_at > NOW()',
      [apiKey]
    );

    if (result.rows.length === 0) {
      apiRes.unauthorized('无效的API密钥');
      return;
    }

    const keyData = result.rows[0];

    // 查询用户信息
    const userResult = await query(
      'SELECT id, email, username, role FROM users WHERE id = $1 AND is_active = true',
      [keyData.user_id]
    );

    if (userResult.rows.length === 0) {
      apiRes.unauthorized('API密钥对应的用户不存在或已被禁用');
      return;
    }

    const user = userResult.rows[0] as UserRecord;

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('API密钥认证错误:', error);
    apiRes.internalError('API密钥认证过程中发生错误');
    return;
  }
};

/**
 * 双因素认证检查中间件
 */
const require2FA = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiRes = res as ApiResponse;
  if (!req.user) {
    apiRes.unauthorized('需要登录才能访问此资源');
    return;
  }

  // 如果用户启用了2FA，检查是否已验证
  if (req.user.twoFactorEnabled) {
    const twoFaVerified = req.header('X-2FA-Verified');

    if (!twoFaVerified || twoFaVerified !== 'true') {
      apiRes.forbidden('需要完成双因素认证');
      return;
    }
  }

  next();
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
