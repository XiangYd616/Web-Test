/**
 * RBAC权限控制中间件
 * 提供路由级别的权限检查和保护
 * 版本: v2.0.0
 */

const { rbacService } = require('../services/core/rbacService.js');
const Logger = require('../utils/logger');

// ==================== 权限中间件 ====================

/**
 * 创建权限检查中间件
 */
function requirePermission(resource, action, options = {}) {
  return async (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '用户未认证'
          }
        });
      }

      const userId = req.user.id;
      let resourceId = null;

      // 从请求参数中获取资源ID
      if (options.resourceIdParam) {
        resourceId = req.params[options.resourceIdParam] || req.query[options.resourceIdParam];
      }

      // 构建权限检查上下文
      const context = {
        user: req.user,
        request: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body
        },
        resource: {
          type: resource,
          id: resourceId
        }
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
          permissionResult
        };
        
        Logger.info('Permission check passed', { 
          userId, 
          resource, 
          action, 
          resourceId,
          reason: permissionResult.reason 
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
              reason: permissionResult.reason
            }
          }
        };

        // 调用自定义拒绝处理函数
        if (options.onDenied) {
          return options.onDenied(req, res, permissionResult.reason);
        }

        Logger.warn('Permission check failed', { 
          userId, 
          resource, 
          action, 
          resourceId,
          reason: permissionResult.reason 
        });

        return res.status(403).json(errorResponse);
      }
    } catch (error) {
      Logger.error('Permission middleware error', error, { 
        userId: req.user?.id, 
        resource, 
        action 
      });

      // 如果是可选权限检查，允许继续
      if (options.optional) {
        return next();
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: '权限检查失败'
        }
      });
    }
  };
}

/**
 * 批量权限检查中间件
 */
function requireBatchPermissions(permissions, options = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '用户未认证'
          }
        });
      }

      const userId = req.user.id;
      const context = {
        user: req.user,
        request: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionId,
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: req.body
        }
      };

      // 构建权限检查列表
      const checks = permissions.map(perm => ({
        resource: perm.resource,
        action: perm.action,
        resourceId: perm.resourceIdParam ? req.params[perm.resourceIdParam] : null
      }));

      // 执行批量权限检查
      const batchResult = await rbacService.checkBatchPermissions(userId, checks, context);

      // 检查是否所有权限都通过
      const allAllowed = Object.values(batchResult.results).every(result => result.allowed);

      if (allAllowed || options.requireAny) {
        // 如果所有权限都通过，或者只需要任一权限通过
        const hasAnyPermission = Object.values(batchResult.results).some(result => result.allowed);
        
        if (allAllowed || (options.requireAny && hasAnyPermission)) {
          req.batchPermissionResults = batchResult;
          return next();
        }
      }

      // 权限检查失败
      const deniedPermissions = Object.entries(batchResult.results)
        .filter(([, result]) => !result.allowed)
        .map(([key]) => key);

      Logger.warn('Batch permission check failed', { 
        userId, 
        deniedPermissions,
        summary: batchResult.summary 
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '权限不足',
          details: {
            deniedPermissions,
            summary: batchResult.summary
          }
        }
      });
    } catch (error) {
      Logger.error('Batch permission middleware error', error, { 
        userId: req.user?.id, 
        permissions 
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: '权限检查失败'
        }
      });
    }
  };
}

/**
 * 角色检查中间件
 */
function requireRole(roleNames, options = {}) {
  const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
  
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '用户未认证'
          }
        });
      }

      const userId = req.user.id;
      
      // 获取用户角色
      const userRoles = await rbacService.getUserRoles(userId);
      const userRoleNames = userRoles.map(role => role.name);

      // 检查是否有匹配的角色
      const hasRequiredRole = options.requireAll 
        ? roles.every(role => userRoleNames.includes(role))
        : roles.some(role => userRoleNames.includes(role));

      if (hasRequiredRole) {
        req.userRoles = userRoles;
        return next();
      }

      Logger.warn('Role check failed', { 
        userId, 
        requiredRoles: roles, 
        userRoles: userRoleNames 
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: '角色权限不足',
          details: {
            requiredRoles: roles,
            userRoles: userRoleNames
          }
        }
      });
    } catch (error) {
      Logger.error('Role middleware error', error, { 
        userId: req.user?.id, 
        roles 
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'ROLE_CHECK_ERROR',
          message: '角色检查失败'
        }
      });
    }
  };
}

/**
 * 超级管理员检查中间件
 */
function requireSuperAdmin() {
  return requireRole('super_admin', { 
    onDenied: (req, res) => {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUPER_ADMIN_REQUIRED',
          message: '需要超级管理员权限'
        }
      });
    }
  });
}

/**
 * 管理员检查中间件
 */
function requireAdmin() {
  return requireRole(['super_admin', 'admin'], { 
    requireAny: true,
    onDenied: (req, res) => {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_REQUIRED',
          message: '需要管理员权限'
        }
      });
    }
  });
}

// ==================== 辅助函数 ====================

/**
 * 检查资源所有权
 */
async function checkResourceOwnership(userId, resourceType, resourceId) {
  // 这里应该根据不同的资源类型实现具体的所有权检查逻辑
  // 例如：检查测试是否属于用户、报告是否属于用户等
  
  try {
    switch (resourceType) {
      case 'test':
        return await checkTestOwnership(userId, resourceId);
      case 'report':
        return await checkReportOwnership(userId, resourceId);
      case 'user':
        return userId === resourceId; // 用户只能操作自己的资源
      default:
        return false;
    }
  } catch (error) {
    Logger.error('Resource ownership check failed', error, { 
      userId, 
      resourceType, 
      resourceId 
    });
    return false;
  }
}

/**
 * 检查测试所有权
 */
async function checkTestOwnership(userId, testId) {
  const { getPool } = require('../config/database');
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT user_id FROM tests WHERE id = $1',
      [testId]
    );
    
    return result.rows.length > 0 && result.rows[0].user_id === userId;
  } catch (error) {
    Logger.error('Test ownership check failed', error, { userId, testId });
    return false;
  }
}

/**
 * 检查报告所有权
 */
async function checkReportOwnership(userId, reportId) {
  const { getPool } = require('../config/database');
  const pool = getPool();
  
  try {
    const result = await pool.query(
      'SELECT user_id FROM reports WHERE id = $1',
      [reportId]
    );
    
    return result.rows.length > 0 && result.rows[0].user_id === userId;
  } catch (error) {
    Logger.error('Report ownership check failed', error, { userId, reportId });
    return false;
  }
}

// ==================== 权限装饰器 ====================

/**
 * 权限装饰器工厂
 */
function Permission(resource, action, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(req, res, next) {
      const middleware = requirePermission(resource, action, options);
      
      return new Promise((resolve, reject) => {
        middleware(req, res, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(originalMethod.call(this, req, res, next));
          }
        });
      });
    };
    
    return descriptor;
  };
}

/**
 * 角色装饰器工厂
 */
function Role(roleNames, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(req, res, next) {
      const middleware = requireRole(roleNames, options);
      
      return new Promise((resolve, reject) => {
        middleware(req, res, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(originalMethod.call(this, req, res, next));
          }
        });
      });
    };
    
    return descriptor;
  };
}

// ==================== 权限检查工具函数 ====================

/**
 * 手动权限检查
 */
async function checkPermission(req, resource, action, resourceId = null) {
  if (!req.user || !req.user.id) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  const context = {
    user: req.user,
    request: {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      body: req.body
    },
    resource: {
      type: resource,
      id: resourceId
    }
  };

  return await rbacService.checkPermission(
    req.user.id,
    resource,
    action,
    resourceId,
    context
  );
}

/**
 * 检查用户是否有指定角色
 */
async function hasRole(req, roleName) {
  if (!req.user || !req.user.id) {
    return false;
  }

  try {
    const userRoles = await rbacService.getUserRoles(req.user.id);
    return userRoles.some(role => role.name === roleName);
  } catch (error) {
    Logger.error('Role check failed', error, { userId: req.user.id, roleName });
    return false;
  }
}

/**
 * 检查用户是否有任一指定角色
 */
async function hasAnyRole(req, roleNames) {
  if (!req.user || !req.user.id) {
    return false;
  }

  try {
    const userRoles = await rbacService.getUserRoles(req.user.id);
    const userRoleNames = userRoles.map(role => role.name);
    return roleNames.some(roleName => userRoleNames.includes(roleName));
  } catch (error) {
    Logger.error('Role check failed', error, { userId: req.user.id, roleNames });
    return false;
  }
}

// ==================== 导出 ====================

module.exports = {
  // 中间件
  requirePermission,
  requireBatchPermissions,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  
  // 装饰器
  Permission,
  Role,
  
  // 工具函数
  checkPermission,
  hasRole,
  hasAnyRole,
  checkResourceOwnership,
  
  // 辅助函数
  checkTestOwnership,
  checkReportOwnership
};
