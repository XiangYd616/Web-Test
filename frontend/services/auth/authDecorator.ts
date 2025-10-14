/**
 * 认证和权限装饰器
 * 确保测试API调用具有适当的认证和权限检查
 */

import type { ApiResponse } from '@shared/types';

export interface AuthConfig {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requireAdmin?: boolean;
  allowGuest?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * 获取当前认证用户
 */
function getCurrentUser(): AuthUser | null {
  try {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (!token || !userData) {
      return null;
    }

    const user = JSON.parse(userData);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      isAdmin: user.role === 'admin' || user.role === 'super_admin'
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有指定权限
 */
function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.isAdmin) {
    return true; // 管理员拥有所有权限
  }
  return user.permissions.includes(permission);
}

/**
 * 检查用户是否有任意一个权限
 */
function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  if (user.isAdmin) {
    return true;
  }
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * 认证装饰器 - 用于方法级别的权限控制
 */
export function requireAuth<T extends (...args: unknown[]) => Promise<ApiResponse<any>>>(
  config: AuthConfig = {}
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<ApiResponse<any>> {
      try {
        // 检查是否需要认证
        if (config.requireAuth !== false) {
          const user = getCurrentUser();
          
          // 检查用户是否登录
          if (!user) {
            if (!config.allowGuest) {
              return {
                success: false,
                error: '请先登录后再执行此操作',
                code: 'AUTH_REQUIRED'
              };
            }
          } else {
            // 检查管理员权限
            if (config.requireAdmin && !user.isAdmin) {
              return {
                success: false,
                error: '此操作需要管理员权限',
                code: 'ADMIN_REQUIRED'
              };
            }

            // 检查特定权限
            if (config.requiredPermissions && config.requiredPermissions.length > 0) {
              if (!hasAnyPermission(user, config.requiredPermissions)) {
                return {
                  success: false,
                  error: '权限不足，无法执行此操作',
                  code: 'PERMISSION_DENIED'
                };
              }
            }
          }
        }

        // 权限检查通过，执行原方法
        return await originalMethod.apply(this, args);
        
      } catch (error) {
        console.error(`认证装饰器错误 [${propertyKey}]:`, error);
        
        if (error instanceof AuthenticationError) {
          return {
            success: false,
            error: error.message,
            code: 'AUTH_ERROR'
          };
        }
        
        if (error instanceof AuthorizationError) {
          return {
            success: false,
            error: error.message,
            code: 'AUTH_DENIED'
          };
        }
        
        // 重新抛出其他错误
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 权限检查器 - 用于在方法内部进行权限检查
 */
export class PermissionChecker {
  static checkAuth(): AuthUser {
    const user = getCurrentUser();
    if (!user) {
      throw new AuthenticationError('用户未登录');
    }
    return user;
  }

  static checkPermission(permission: string): AuthUser {
    const user = this.checkAuth();
    if (!hasPermission(user, permission)) {
      throw new AuthorizationError(`权限不足: ${permission}`);
    }
    return user;
  }

  static checkAnyPermission(permissions: string[]): AuthUser {
    const user = this.checkAuth();
    if (!hasAnyPermission(user, permissions)) {
      throw new AuthorizationError(`权限不足: ${permissions.join(', ')}`);
    }
    return user;
  }

  static checkAdmin(): AuthUser {
    const user = this.checkAuth();
    if (!user.isAdmin) {
      throw new AuthorizationError('需要管理员权限');
    }
    return user;
  }

  static getCurrentUser(): AuthUser | null {
    return getCurrentUser();
  }
}

/**
 * 测试权限常量
 */
export const _TestPermissions = {
  // 基础测试权限
  RUN_PERFORMANCE_TEST: 'test:performance:run',
  RUN_SECURITY_TEST: 'test:security:run',
  RUN_API_TEST: 'test:api:run',
  RUN_STRESS_TEST: 'test:stress:run',
  RUN_COMPATIBILITY_TEST: 'test:compatibility:run',
  RUN_SEO_TEST: 'test:seo:run',
  
  // 高级权限
  DELETE_TEST_RESULTS: 'test:results:delete',
  EXPORT_TEST_DATA: 'test:data:export',
  MANAGE_TEST_CONFIGS: 'test:config:manage',
  VIEW_SYSTEM_METRICS: 'system:metrics:view',
  PERFORM_MAINTENANCE: 'system:maintenance:execute',
  
  // 管理权限
  ADMIN_ALL_TESTS: 'admin:tests:all',
  ADMIN_USER_MANAGEMENT: 'admin:users:manage',
  ADMIN_SYSTEM_CONFIG: 'admin:system:config'
} as const;

export { AuthenticationError, AuthorizationError };
