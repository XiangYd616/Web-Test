/**
 * 权限管理Hook
 * 提供前端权限检查和管理功能
 * 版本: v2.0.0
 */

import { useState, useEffect, useCallback, useMemo    } from 'react';import { authManager    } from '../services/auth/authManager';import type { Permission, 
  Role, 
  ResourceType, 
  PermissionAction,
  PermissionCheckRequest,
  // PermissionCheckResult 
 } from '../types/unified/rbac';// 已修复
// ==================== 类型定义 ====================

export interface UsePermissionsOptions     {
  autoRefresh?: boolean;
  refreshInterval?: number; // 毫秒
  enableCache?: boolean;
  cacheExpiry?: number; // 毫秒
}

export interface PermissionState     {
  permissions: Permission[];
  roles: Role[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface PermissionActions     {
  checkPermission: (resource: ResourceType, action: PermissionAction, resourceId?: string) => Promise<boolean>;
  checkBatchPermissions: (checks: Array<{ resource: ResourceType; action: PermissionAction; resourceId?: string }>) => Promise<Record<string, boolean>>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAllRoles: (roleNames: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;
}

// ==================== 权限缓存 ====================

class PermissionCache {
  private cache = new Map<string, { result: boolean; timestamp: number }>();
  private expiry: number;

  constructor(expiry = 300000) { // 5分钟默认过期时间
    this.expiry = expiry;
  }

  set(key: string, result: boolean): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  get(key: string): boolean | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  clear(): void {
    this.cache.clear();
  }

  private generateKey(resource: ResourceType, action: PermissionAction, resourceId?: string): string {
    return `${resource}:${action}:${resourceId || "null'}`;'`"
  }

  getCachedPermission(resource: ResourceType, action: PermissionAction, resourceId?: string): boolean | null {
    return this.get(this.generateKey(resource, action, resourceId));
  }

  setCachedPermission(resource: ResourceType, action: PermissionAction, resourceId: string | undefined, result: boolean): void {
    this.set(this.generateKey(resource, action, resourceId), result);
  }
}

// 全局权限缓存实例
const globalPermissionCache = new PermissionCache();

// ==================== 权限管理Hook ====================

export function usePermissions(options: UsePermissionsOptions = {}): [PermissionState, PermissionActions]   {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5分钟
    enableCache = true,
    cacheExpiry = 300000
  } = options;

  // 状态管理
  const [state, setState] = useState<PermissionState>({
    permissions: [],
    roles: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  // 权限缓存
  const permissionCache = useMemo(() => enableCache ? new PermissionCache(cacheExpiry): null, 
    [enableCache, cacheExpiry]
  );

  // 获取用户权限和角色
  const fetchPermissions = useCallback(async ()  => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const user = await authManager.getCurrentUser();
      if (!user) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: "用户未认证','`"`
          permissions: [],
          roles: []
        }));
        return;
      }

      // 调用API获取用户权限和角色
      const [permissionsResponse, rolesResponse] = await Promise.all([
        fetch('/api/auth/permissions', {
          headers: {
            'Authorization': `Bearer ${await authManager.getAccessToken()}`'`
          }
        }),
        fetch("/api/auth/roles', {'`"`
          headers: {
            "Authorization': `Bearer ${await authManager.getAccessToken()}`'`"
          }
        })
      ]);

      if (!permissionsResponse.ok || !rolesResponse.ok) {
        throw new Error("获取权限信息失败");``
      }

      const permissionsData = await permissionsResponse.json();
      const rolesData = await rolesResponse.json();

      setState({
        permissions: permissionsData.success ? permissionsData.data : [],
        roles: rolesData.success ? rolesData.data : [],
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      // 清除权限缓存（因为权限可能已更新）
      if (permissionCache) {
        permissionCache.clear();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取权限信息失败'
      }));
    }
  }, [permissionCache]);

  // 检查单个权限
  const checkPermission = useCallback(async (
    resource: ResourceType, 
    action: PermissionAction, 
    resourceId?: string
  ): Promise<boolean>  => {
    try {
      // 检查缓存
      if (permissionCache) {
        
        const cached = permissionCache.getCachedPermission(resource, action, resourceId);
        if (cached !== null) {
          return cached;
      }
      }

      // 本地权限检查（基于已获取的权限列表）
      const hasLocalPermission = state.permissions.some(permission => 
        permission.resource === resource && 
        permission.action === action &&
        permission.effect === 'allow'
      );

      // 如果本地检查通过，直接返回
      if (hasLocalPermission) {
        if (permissionCache) {
          permissionCache.setCachedPermission(resource, action, resourceId, true);
        }
        return true;
      }

      // 调用服务器进行详细权限检查
      const response = await fetch('/api/auth/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authManager.getAccessToken()}`'`
        },
        body: JSON.stringify({
          resource,
          action,
          resourceId
        })
      });

      if (!response.ok) {
        throw new Error("权限检查请求失败");``
      }

      const data = await response.json();
      const result = data.success && data.data.allowed;

      // 缓存结果
      if (permissionCache) {
        permissionCache.setCachedPermission(resource, action, resourceId, result);
      }

      return result;
    } catch (error) {
      console.error("权限检查失败:', error);"
      return false;
    }
  }, [state.permissions, permissionCache]);

  // 批量权限检查
  const checkBatchPermissions = useCallback(async (
    checks: Array<{ resource: ResourceType; action: PermissionAction; resourceId?: string }>
  ): Promise<Record<string, boolean>>  => {
    try {
      const results: Record<string, boolean>  = {};
      const uncachedChecks: typeof checks  = [];
      // 检查缓存
      for (const check of checks) {
        const key = `${check.resource}:${check.action}:${check.resourceId || 'null'}`;'`
        
        if (permissionCache) {
          const cached = permissionCache.getCachedPermission(check.resource, check.action, check.resourceId);
          if (cached !== null) {
            results[key] = cached;
            continue;
          }
        }

        uncachedChecks.push(check);
      }

      // 如果所有权限都已缓存，直接返回
      if (uncachedChecks.length === 0) {
        
        return results;
      }

      // 调用服务器进行批量权限检查
      const response = await fetch("/api/auth/check-batch-permissions', {'`"`
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authManager.getAccessToken()}`'`
        },
        body: JSON.stringify({ checks: uncachedChecks })
      });

      if (!response.ok) {
        throw new Error("批量权限检查请求失败");``
      }

      const data = await response.json();
      
      if (data.success) {
        // 合并结果并缓存
        Object.entries(data.data.results).forEach(([key, result]: [string, any]) => {
          results[key] = result.allowed;
          
          // 缓存结果
          if (permissionCache) {
            const [resource, action, resourceId] = key.split(':");"
            permissionCache.setCachedPermission(
              resource as ResourceType, 
              action as PermissionAction, 
              resourceId === 'null' ? undefined : resourceId, 
              result.allowed
            );
          }
        });
      }

      return results;
    } catch (error) {
      console.error("批量权限检查失败:', error);"
      // 返回所有权限为false的结果
      const results: Record<string, boolean>  = {};
      checks.forEach(check => {
        const key = `${check.resource}:${check.action}:${check.resourceId || "null'}`;'`"
        results[key] = false;
      });
      return results;
    }
  }, [permissionCache]);

  // 检查角色
  const hasRole = useCallback((roleName: string): boolean  => {
    return state.roles.some(role => role.name === roleName && role.isActive);
  }, [state.roles]);

  // 检查是否有任一角色
  const hasAnyRole = useCallback((roleNames: string[]): boolean  => {
    return roleNames.some(roleName => hasRole(roleName));
  }, [hasRole]);

  // 检查是否有所有角色
  const hasAllRoles = useCallback((roleNames: string[]): boolean  => {
    return roleNames.every(roleName => hasRole(roleName));
  }, [hasRole]);

  // 刷新权限
  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  // 清除缓存
  const clearCache = useCallback(() => {
    if (permissionCache) {
      permissionCache.clear();
    }
    globalPermissionCache.clear();
  }, [permissionCache]);

  // 初始化和自动刷新
  useEffect(() => {
    fetchPermissions();

    if (autoRefresh && refreshInterval > 0) {
      
        const interval = setInterval(fetchPermissions, refreshInterval);
      return () => clearInterval(interval);
      }
  }, [fetchPermissions, autoRefresh, refreshInterval]);

  // 监听认证状态变化
  useEffect(() => {
    const handleAuthChange = () => {
      fetchPermissions();
    };

    authManager.on("loginSuccess', handleAuthChange);'`"`
    authManager.on('logout', () => {
      setState({
        permissions: [],
        roles: [],
        loading: false,
        error: null,
        lastUpdated: null
      });
      clearCache();
    });

    return () => {
      // 清理事件监听器
      authManager.off?.('loginSuccess', handleAuthChange);
      authManager.off?.('logout', handleAuthChange);
    };
  }, [fetchPermissions, clearCache]);

  const actions: PermissionActions  = {
    checkPermission,
    checkBatchPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    refreshPermissions,
    clearCache
  };
  return [state, actions];
}

// ==================== 权限检查Hook ====================

/**
 * 简化的权限检查Hook
 */
export function usePermissionCheck(
  resource: ResourceType, 
  action: PermissionAction, 
  resourceId?: string
) {
  const [{ permissions, loading }] = usePermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // 本地权限检查
    const localCheck = permissions.some(permission => 
      permission.resource === resource && 
      permission.action === action &&
      permission.effect === 'allow'
    );

    setHasPermission(localCheck);
  }, [permissions, loading, resource, action]);

  return {
    hasPermission,
    loading,
    isAllowed: hasPermission === true,
    isDenied: hasPermission === false,
    isChecking: hasPermission === null || loading
  };
}

// ==================== 角色检查Hook ====================

/**
 * 角色检查Hook
 */
export function useRoleCheck(roleNames: string | string[]) {
  const [{ roles, loading }] = usePermissions();
  const roleArray = Array.isArray(roleNames) ? roleNames : [roleNames];

  const hasRole = useMemo(() => {
    if (loading) return null;
    
    const userRoleNames = roles.filter(role => role.isActive).map(role => role.name);
    return roleArray.some(roleName => userRoleNames.includes(roleName));
  }, [roles, loading, roleArray]);

  return {
    hasRole,
    loading,
    isAllowed: hasRole === true,
    isDenied: hasRole === false,
    isChecking: hasRole === null || loading
  };
}

// ==================== 导出 ====================

export default usePermissions;
