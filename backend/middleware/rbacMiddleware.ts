/**
 * RBAC权限控制中间件
 * 提供路由级别的权限检查和保护
 * 版本: v2.0.0
 */

import type { NextFunction, Request, Response } from 'express';

const { rbacService } = require('../services/core/rbacService');
const Logger = require('../utils/logger');

interface AuthenticatedRequest extends Request {
  user?: Express.User;
  sessionId?: string;
  permissionContext?: {
    user: unknown;
    request: {
      ip: string;
      userAgent: string;
      sessionId?: string;
      method: string;
      path: string;
      params: Record<string, string>;
      query: Record<string, unknown>;
      body: Record<string, unknown>;
    };
    resource: {
      type: string;
      id?: string;
    };
    permissionResult: {
      allowed: boolean;
      reason: string;
    };
  };
}

interface PermissionOptions {
  resourceIdParam?: string;
  allowOwner?: boolean;
  customCheck?: (context: unknown) => Promise<boolean>;
  onDenied?: (req: Request, res: Response, reason: string) => void;
}

interface PermissionContext {
  user: unknown;
  request: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    method: string;
    path: string;
    params: Record<string, string>;
    query: Record<string, unknown>;
    body: Record<string, unknown>;
  };
  resource: {
    type: string;
    id?: string;
  };
}

// ==================== 权限中间件 ====================

/**
 * 创建权限检查中间件
 */
function requirePermission(resource: string, action: string, options: PermissionOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // 检查用户是否已认证
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '用户未认证',
          },
        });
      }

      const userId = req.user.id;
      let resourceId: string | null = null;

      // 从请求参数中获取资源ID
      if (options.resourceIdParam) {
        resourceId =
          req.params[options.resourceIdParam] || (req.query[options.resourceIdParam] as string);
      }

      // 构建权限检查上下文
      const context: PermissionContext = {
        user: req.user,
        request: {
          ip: req.ip || req.connection.remoteAddress || '',
          userAgent: req.get('User-Agent') || '',
          sessionId: req.sessionId,
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body || {},
        },
        resource: {
          type: resource,
          id: resourceId || undefined,
        },
      };

      // 检查资源所有者权限
      if (options.allowOwner && resourceId) {
        const isOwner = await checkResourceOwnership(userId, resource, resourceId);
        if (isOwner) {
          Logger.info('Access granted as resource owner', { userId, resource, resourceId });
          return next();
        }
      }

      // 自定义权限检查
      if (options.customCheck) {
        const customResult = await options.customCheck(context);
        if (customResult) {
          Logger.info('Access granted by custom check', { userId, resource, action });
          return next();
        }
      }

      // 执行权限检查
      const permissionResult = await rbacService.checkPermission(
        userId,
        resource,
        action,
        resourceId,
        context
      );

      if (permissionResult.allowed) {
        // 权限检查通过，继续处理请求
        req.permissionContext = {
          ...context,
          permissionResult,
        };

        Logger.info('Permission check passed', {
          userId,
          resource,
          action,
          resourceId,
          reason: permissionResult.reason,
        });

        return next();
      } else {
        // 权限检查失败
        const errorResponse = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '权限不足',
            details: {
              resource,
              action,
              reason: permissionResult.reason,
            },
          },
        };

        // 调用自定义拒绝处理函数
        if (options.onDenied) {
          return options.onDenied(req, res, permissionResult.reason);
        }

        return res.status(403).json(errorResponse);
      }
    } catch (error) {
      Logger.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限检查过程中发生错误',
        },
      });
    }
  };
}

/**
 * 检查资源所有权
 */
async function checkResourceOwnership(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  try {
    // 这里应该根据具体的资源类型查询数据库
    // 示例实现，实际应该查询相应的表
    const result = await rbacService.checkResourceOwnership(userId, resourceType, resourceId);
    return result;
  } catch (error) {
    Logger.error('Error checking resource ownership:', error);
    return false;
  }
}

/**
 * 角色检查中间件
 */
function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证或角色信息缺失',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '角色权限不足',
          details: {
            requiredRoles: allowedRoles,
            currentRole: req.user.role,
          },
        },
      });
    }

    return next();
  };
}

/**
 * 管理员权限检查
 */
const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * 超级管理员权限检查
 */
const requireSuperAdmin = requireRole('superadmin');

/**
 * 多权限检查中间件
 */
function requireAnyPermission(permissions: Array<{ resource: string; action: string }>) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证',
        },
      });
    }

    try {
      const userId = req.user.id;
      let hasPermission = false;
      let grantedPermission: { resource: string; action: string } | null = null;

      // 检查每个权限，有一个通过即可
      for (const { resource, action } of permissions) {
        const result = await rbacService.checkPermission(userId, resource, action);
        if (result.allowed) {
          hasPermission = true;
          grantedPermission = { resource, action };
          break;
        }
      }

      if (hasPermission && grantedPermission) {
        Logger.info('Permission check passed (any)', {
          userId,
          grantedPermission,
          checkedPermissions: permissions,
        });
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '权限不足',
          details: {
            requiredPermissions: permissions,
            message: '需要满足以下任一权限',
          },
        },
      });
    } catch (error) {
      Logger.error('Multi-permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限检查过程中发生错误',
        },
      });
    }
  };
}

/**
 * 条件权限检查中间件
 */
function requirePermissionIf(
  condition: (req: Request) => boolean,
  resource: string,
  action: string,
  options?: PermissionOptions
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return requirePermission(resource, action, options)(req, res, next);
    }
    return next();
  };
}

/**
 * 动态权限检查中间件
 */
function requireDynamicPermission(
  getResourceAction: (req: Request) => { resource: string; action: string },
  options?: PermissionOptions
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { resource, action } = getResourceAction(req);
    return requirePermission(resource, action, options)(req, res, next);
  };
}

/**
 * 工作空间权限检查中间件
 */
function requireWorkspacePermission(action: string, options?: PermissionOptions) {
  return requirePermission('workspace', action, {
    ...options,
    resourceIdParam: 'workspaceId',
  });
}

/**
 * 项目权限检查中间件
 */
function requireProjectPermission(action: string, options?: PermissionOptions) {
  return requirePermission('project', action, {
    ...options,
    resourceIdParam: 'projectId',
  });
}

/**
 * 测试权限检查中间件
 */
function requireTestPermission(action: string, options?: PermissionOptions) {
  return requirePermission('test', action, {
    ...options,
    resourceIdParam: 'testId',
  });
}

/**
 * 用户权限检查中间件
 */
function requireUserPermission(action: string, options?: PermissionOptions) {
  return requirePermission('user', action, {
    ...options,
    resourceIdParam: 'userId',
  });
}

/**
 * 权限审计中间件
 */
function permissionAudit(auditLevel: 'basic' | 'detailed' = 'basic') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (data: unknown) {
      if (req.permissionContext) {
        logPermissionAudit(req, auditLevel, 'send');
      }
      return originalSend.call(this, data);
    };

    res.json = function (data: unknown) {
      if (req.permissionContext) {
        logPermissionAudit(req, auditLevel, 'json');
      }
      return originalJson.call(this, data);
    };

    return next();
  };
}

/**
 * 记录权限审计日志
 */
function logPermissionAudit(req: AuthenticatedRequest, auditLevel: string, responseType: string) {
  const auditData: {
    userId?: string;
    userRole?: string;
    method: string;
    path: string;
    ip: string;
    userAgent: string | undefined;
    responseType: string;
    timestamp: string;
    permissionContext?: AuthenticatedRequest['permissionContext'];
  } = {
    userId: req.user?.id,
    userRole: req.user?.role,
    method: req.method,
    path: req.path,
    ip: req.ip || '',
    userAgent: req.get('User-Agent') || undefined,
    responseType,
    timestamp: new Date().toISOString(),
  };

  if (auditLevel === 'detailed' && req.permissionContext) {
    auditData.permissionContext = req.permissionContext;
  }

  Logger.info('Permission audit', auditData);
}

/**
 * 权限缓存中间件
 */
function permissionCache(ttl: number = 300000) {
  // 默认5分钟
  const cache = new Map<string, { result: boolean; timestamp: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalCheckPermission = rbacService.checkPermission;

    rbacService.checkPermission = async function (
      userId: string,
      resource: string,
      action: string,
      resourceId?: string,
      context?: unknown
    ) {
      const cacheKey = `${userId}:${resource}:${action}:${resourceId || ''}`;
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.result
          ? { allowed: true, reason: 'cached' }
          : { allowed: false, reason: 'cached_denied' };
      }

      const result = await originalCheckPermission.call(
        this,
        userId,
        resource,
        action,
        resourceId,
        context
      );

      cache.set(cacheKey, {
        result: result.allowed,
        timestamp: Date.now(),
      });

      // 清理过期缓存
      if (cache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of cache.entries()) {
          if (now - value.timestamp > ttl) {
            cache.delete(key);
          }
        }
      }

      return result;
    };

    return next();
  };
}

export {
  checkResourceOwnership,
  permissionAudit,
  permissionCache,
  requireAdmin,
  requireAnyPermission,
  requireDynamicPermission,
  requirePermission,
  requirePermissionIf,
  requireProjectPermission,
  requireRole,
  requireSuperAdmin,
  requireTestPermission,
  requireUserPermission,
  requireWorkspacePermission,
};

module.exports = {
  requirePermission,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireAnyPermission,
  requirePermissionIf,
  requireDynamicPermission,
  requireWorkspacePermission,
  requireProjectPermission,
  requireTestPermission,
  requireUserPermission,
  permissionAudit,
  permissionCache,
  checkResourceOwnership,
};
