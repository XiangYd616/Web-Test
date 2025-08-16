/**
 * 基于角色的访问控制(RBAC)服务
 * 提供角色管理、权限控制、继承机制
 * 版本: v1.0.0
 */

import { useCallback, useState    } from 'react';// ==================== 类型定义 ==================== ''
export interface Permission     {
  id: string;
  name: string;
  description: string;
  resource: string; // 资源类型，如 'user', 'test', 'system';
  action: string; // 操作类型，如 'read', 'write', 'delete', 'execute';
  scope?: string; // 作用域，如 'own', 'team', 'all';
  conditions?: PermissionCondition[]; // 权限条件
  isSystem: boolean; // 是否为系统权限
  category: string; // 权限分类
  createdAt: string;
  updatedAt: string;
}

export interface PermissionCondition     {
  type: 'time' | 'location' | 'device' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  description: string;
}

export interface Role     {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // 权限ID列表
  inheritFrom?: string[]; // 继承的角色ID列表
  isSystem: boolean; // 是否为系统角色
  isActive: boolean;
  priority: number; // 角色优先级，数字越大优先级越高
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions     {
  userId: string;
  roles: string[]; // 用户角色ID列表
  directPermissions: string[]; // 直接分配的权限ID列表
  deniedPermissions: string[]; // 明确拒绝的权限ID列表
  effectivePermissions: string[]; // 有效权限ID列表（计算后的结果）
  lastCalculated: string;
  expiresAt?: string; // 权限过期时间
}

export interface PermissionCheck     {
  resource: string;
  action: string;
  scope?: string;
  context?: Record<string, any>; // 上下文信息，用于条件检查
}

export interface PermissionResult     {
  granted: boolean;
  reason: string;
  matchedPermissions: Permission[];
  deniedBy?: string; // 被哪个规则拒绝
  conditions?: PermissionCondition[]; // 需要满足的条件
}

export interface RoleHierarchy     {
  roleId: string;
  parentRoles: string[];
  childRoles: string[];
  level: number; // 层级深度
}

// ==================== 权限计算器 ====================

class PermissionCalculator {
  /**
   * 计算用户的有效权限
   */
  static calculateEffectivePermissions(
    userRoles: string[],
    directPermissions: string[],
    deniedPermissions: string[],
    roles: Map<string, Role>,
    permissions: Map<string, Permission>
  ): string[] {
    const effectivePermissions = new Set<string>();
    const deniedSet = new Set(deniedPermissions);

    // 1. 添加直接分配的权限
    directPermissions.forEach(permId => {
      if (!deniedSet.has(permId)) {
        effectivePermissions.add(permId);
      }
    });

    // 2. 通过角色继承获取权限
    const allRoles = this.expandRoles(userRoles, roles);

    for (const roleId of allRoles) {
      const role = roles.get(roleId);
      if (role && role.isActive) {
        role.permissions.forEach(permId => {
          if (!deniedSet.has(permId)) {
            effectivePermissions.add(permId);
          }
        });
      }
    }

    return Array.from(effectivePermissions);
  }

  /**
   * 展开角色继承关系
   */
  static expandRoles(userRoles: string[], roles: Map<string, Role>): string[] {
    const expandedRoles = new Set<string>();
    const visited = new Set<string>();

    const expandRole = (roleId: string) => {
      if (visited.has(roleId)) return; // 防止循环引用
      visited.add(roleId);

      const role = roles.get(roleId);
      if (!role || !role.isActive) return;

      expandedRoles.add(roleId);

      // 递归展开继承的角色
      if (role.inheritFrom) {
        role.inheritFrom.forEach(parentRoleId => {
          expandRole(parentRoleId);
        });
      }
    };

    userRoles.forEach(roleId => expandRole(roleId));
    return Array.from(expandedRoles);
  }

  /**
   * 检查权限条件
   */
  static checkConditions(
    conditions: PermissionCondition[],
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.type];

      switch (condition.operator) {
        case 'equals': ''
          return contextValue === condition.value;
        case 'not_equals': ''
          return contextValue !== condition.value;
        case 'in': ''
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'not_in': ''
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        case 'greater_than': ''
          return contextValue > condition.value;
        case 'less_than': ''
          return contextValue < condition.value;
        default:
          return false;
      }
    });
  }
}

// ==================== RBAC服务主类 ====================

export class RBACService {
  private permissions = new Map<string, Permission>();
  private roles = new Map<string, Role>();
  private userPermissions = new Map<string, UserPermissions>();
  private roleHierarchies = new Map<string, RoleHierarchy>();

  constructor() {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
  }

  // ==================== 权限管理 ====================

  /**
   * 创建权限
   */
  async createPermission(permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> {'
    const newPermission: Permission  = {
      ...permission,
      id: this.generateId('perm'),'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.permissions.set(newPermission.id, newPermission);
    await this.cachePermission(newPermission);

    return newPermission;
  }

  /**
   * 获取权限
   */
  async getPermission(permissionId: string): Promise<Permission | null> {
    let permission = this.permissions.get(permissionId);

    if (!permission) {
      permission = await defaultMemoryCache.get(`permission_${permissionId}`);`
      if (permission) {
        this.permissions.set(permissionId, permission);
      }
    }

    return permission || null;
  }

  /**
   * 获取所有权限
   */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * 按分类获取权限
   */
  getPermissionsByCategory(category: string): Permission[] {
    return Array.from(this.permissions.values())
      .filter(permission => permission.category === category);
  }

  /**
   * 按资源获取权限
   */
  getPermissionsByResource(resource: string): Permission[] {
    return Array.from(this.permissions.values())
      .filter(permission => permission.resource === resource);
  }

  // ==================== 角色管理 ====================

  /**
   * 创建角色
   */
  async createRole(role: Omit<Role, "id' | 'createdAt' | 'updatedAt'>): Promise<Role> {'`
    const newRole: Role  = {
      ...role,
      id: this.generateId('role'),'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.roles.set(newRole.id, newRole);
    await this.cacheRole(newRole);
    this.updateRoleHierarchy(newRole);

    return newRole;
  }

  /**
   * 获取角色
   */
  async getRole(roleId: string): Promise<Role | null> {
    let role = this.roles.get(roleId);

    if (!role) {
      role = await defaultMemoryCache.get(`role_${roleId}`);`
      if (role) {
        this.roles.set(roleId, role);
      }
    }

    return role || null;
  }

  /**
   * 获取所有角色
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * 更新角色
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role | null> {
    const role = await this.getRole(roleId);
    if (!role) return null;

    const updatedRole: Role  = {
      ...role,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.roles.set(roleId, updatedRole);
    await this.cacheRole(updatedRole);
    this.updateRoleHierarchy(updatedRole);

    // 重新计算所有用户的权限
    await this.recalculateAllUserPermissions();

    return updatedRole;
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: string): Promise<boolean> {
    const role = await this.getRole(roleId);
    if (!role || role.isSystem) return false;

    this.roles.delete(roleId);
    this.roleHierarchies.delete(roleId);
    await defaultMemoryCache.delete(`role_${roleId}`);`

    // 从所有用户中移除此角色
    for (const [userId, userPerms] of this.userPermissions.entries()) {
      if (userPerms.roles.includes(roleId)) {
        userPerms.roles = userPerms.roles.filter(id => id !== roleId);
        await this.recalculateUserPermissions(userId);
      }
    }

    return true;
  }

  // ==================== 用户权限管理 ====================

  /**
   * 分配角色给用户
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    let userPerms = this.userPermissions.get(userId);

    if (!userPerms) {
      userPerms = {
        userId,
        roles: [],
        directPermissions: [],
        deniedPermissions: [],
        effectivePermissions: [],
        lastCalculated: new Date().toISOString()
      };
    }

    // 验证角色是否存在且有效
    const validRoleIds = [];
    for (const roleId of roleIds) {
      const role = await this.getRole(roleId);
      if (role && role.isActive) {
        validRoleIds.push(roleId);
      }
    }

    userPerms.roles = [...new Set([...userPerms.roles, ...validRoleIds])];
    this.userPermissions.set(userId, userPerms);

    await this.recalculateUserPermissions(userId);
  }

  /**
   * 移除用户角色
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return;

    userPerms.roles = userPerms.roles.filter(roleId => !roleIds.includes(roleId));
    await this.recalculateUserPermissions(userId);
  }

  /**
   * 直接分配权限给用户
   */
  async assignPermissionsToUser(userId: string, permissionIds: string[]): Promise<void> {
    let userPerms = this.userPermissions.get(userId);

    if (!userPerms) {
      userPerms = {
        userId,
        roles: [],
        directPermissions: [],
        deniedPermissions: [],
        effectivePermissions: [],
        lastCalculated: new Date().toISOString()
      };
    }

    userPerms.directPermissions = [...new Set([...userPerms.directPermissions, ...permissionIds])];
    this.userPermissions.set(userId, userPerms);

    await this.recalculateUserPermissions(userId);
  }

  /**
   * 拒绝用户权限
   */
  async denyPermissionsToUser(userId: string, permissionIds: string[]): Promise<void> {
    let userPerms = this.userPermissions.get(userId);

    if (!userPerms) {
      userPerms = {
        userId,
        roles: [],
        directPermissions: [],
        deniedPermissions: [],
        effectivePermissions: [],
        lastCalculated: new Date().toISOString()
      };
    }

    userPerms.deniedPermissions = [...new Set([...userPerms.deniedPermissions, ...permissionIds])];
    this.userPermissions.set(userId, userPerms);

    await this.recalculateUserPermissions(userId);
  }

  /**
   * 重新计算用户权限
   */
  async recalculateUserPermissions(userId: string): Promise<void> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return;

    userPerms.effectivePermissions = PermissionCalculator.calculateEffectivePermissions(
      userPerms.roles,
      userPerms.directPermissions,
      userPerms.deniedPermissions,
      this.roles,
      this.permissions
    );

    userPerms.lastCalculated = new Date().toISOString();
    await this.cacheUserPermissions(userPerms);
  }

  /**
   * 重新计算所有用户权限
   */
  async recalculateAllUserPermissions(): Promise<void> {
    const promises = Array.from(this.userPermissions.keys()).map(userId =>
      this.recalculateUserPermissions(userId)
    );
    await Promise.all(promises);
  }

  // ==================== 权限检查 ====================

  /**
   * 检查用户权限
   */
  async checkPermission(
    userId: string,
    check: PermissionCheck
  ): Promise<PermissionResult> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) {
      
        return {
        granted: false,
        reason: "用户权限信息不存在','`
        matchedPermissions: []
      };
    }

    const matchedPermissions: Permission[]  = [];
    // 检查有效权限
    for (const permId of userPerms.effectivePermissions) {
      const permission = this.permissions.get(permId);
      if (!permission) continue;

      // 检查资源和操作匹配
      if (permission.resource === check.resource && permission.action === check.action) {
        // 检查作用域
        if (check.scope && permission.scope && permission.scope !== check.scope) {
          continue;
        }

        // 检查条件
        if (permission.conditions && permission.conditions.length > 0) {
          
        if (!check.context || !PermissionCalculator.checkConditions(permission.conditions, check.context)) {
            return {
              granted: false,
              reason: '不满足权限条件','
              matchedPermissions: [permission],
              conditions: permission.conditions
      };
          }
        }

        matchedPermissions.push(permission);
      }
    }

    if (matchedPermissions.length > 0) {
      
        return {
        granted: true,
        reason: '权限检查通过','
        matchedPermissions
      };
    }

    return {
      granted: false,
      reason: '没有匹配的权限','
      matchedPermissions: []
    };
  }

  /**
   * 批量检查权限
   */
  async checkPermissions(
    userId: string,
    checks: PermissionCheck[]
  ): Promise<Record<string, PermissionResult>> {
    const results: Record<string, PermissionResult>  = {};
    for (const check of checks) {
      const key = `${check.resource}:${check.action}${check.scope ? ':' + check.scope : ''}`;'`
      results[key] = await this.checkPermission(userId, check);
    }

    return results;
  }

  /**
   * 检查用户是否有角色
   */
  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) return false;

    // 检查直接角色
    if (userPerms.roles.includes(roleId)) return true;

    // 检查继承角色
    const expandedRoles = PermissionCalculator.expandRoles(userPerms.roles, this.roles);
    return expandedRoles.includes(roleId);
  }

  /**
   * 获取用户权限信息
   */
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    let userPerms = this.userPermissions.get(userId);

    if (!userPerms) {
      userPerms = await defaultMemoryCache.get(`user_permissions_${userId}`);`
      if (userPerms) {
        this.userPermissions.set(userId, userPerms);
      }
    }

    return userPerms || null;
  }

  // ==================== 角色层次结构 ====================

  /**
   * 更新角色层次结构
   */
  private updateRoleHierarchy(role: Role): void {
    const hierarchy: RoleHierarchy  = {
      roleId: role.id,
      parentRoles: role.inheritFrom || [],
      childRoles: [],
      level: 0
    };
    // 计算层级
    if (role.inheritFrom) {
      
        const maxParentLevel = Math.max(
        ...role.inheritFrom.map(parentId => {
          const parentHierarchy = this.roleHierarchies.get(parentId);
          return parentHierarchy ? parentHierarchy.level : 0;
      })
      );
      hierarchy.level = maxParentLevel + 1;
    }

    this.roleHierarchies.set(role.id, hierarchy);

    // 更新父角色的子角色列表
    if (role.inheritFrom) {
      role.inheritFrom.forEach(parentId => {
        const parentHierarchy = this.roleHierarchies.get(parentId);
        if (parentHierarchy && !parentHierarchy.childRoles.includes(role.id)) {
          parentHierarchy.childRoles.push(role.id);
        }
      });
    }
  }

  /**
   * 获取角色层次结构
   */
  getRoleHierarchy(roleId: string): RoleHierarchy | null {
    return this.roleHierarchies.get(roleId) || null;
  }

  // ==================== 初始化方法 ====================

  /**
   * 初始化默认权限
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: Omit<Permission, "id' | 'createdAt' | 'updatedAt'>[]  = ['']`
      // 用户管理权限
      { name: '查看用户', description: '查看用户信息', resource: 'user', action: 'read', scope: 'all', isSystem: true, category: 'user_management' },'
      { name: '创建用户', description: '创建新用户', resource: 'user', action: 'create', scope: 'all', isSystem: true, category: 'user_management' },'
      { name: '编辑用户', description: '编辑用户信息', resource: 'user', action: 'update', scope: 'all', isSystem: true, category: 'user_management' },'
      { name: '删除用户', description: '删除用户', resource: 'user', action: 'delete', scope: 'all', isSystem: true, category: 'user_management' },'
      // 测试管理权限
      { name: '运行测试', description: '运行各种测试', resource: 'test', action: 'execute', scope: 'own', isSystem: true, category: 'testing' },'
      { name: '查看测试结果', description: '查看测试结果', resource: 'test', action: 'read', scope: 'own', isSystem: true, category: 'testing' },'
      { name: '管理测试', description: '管理所有测试', resource: 'test', action: 'manage', scope: 'all', isSystem: true, category: 'testing' },'
      // 系统管理权限
      { name: '系统配置', description: '修改系统配置', resource: 'system', action: 'configure', scope: 'all', isSystem: true, category: 'system' },'
      { name: '查看日志', description: '查看系统日志', resource: 'system', action: 'read_logs', scope: 'all', isSystem: true, category: 'system' },'
      { name: '系统监控', description: '监控系统状态', resource: 'system', action: 'monitor', scope: 'all', isSystem: true, category: 'system' }'
    ];
    defaultPermissions.forEach(perm => {
      const permission: Permission  = {
        ...perm,
        id: this.generateId('perm'),'
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.permissions.set(permission.id, permission);
    });
  }

  /**
   * 初始化默认角色
   */
  private initializeDefaultRoles(): void {
    const allPermissions = Array.from(this.permissions.keys());

    const defaultRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[]  = ['']
      {
        name: 'admin','
        description: '系统管理员','
        permissions: allPermissions,
        isSystem: true,
        isActive: true,
        priority: 100
      },
      {
        name: 'manager','
        description: '管理员','
        permissions: allPermissions.filter(id => {
          const perm = this.permissions.get(id);
          return perm && perm.category !== 'system';
        }),
        isSystem: true,
        isActive: true,
        priority: 80
      },
      {
        name: 'user','
        description: '普通用户','
        permissions: allPermissions.filter(id => {
          const perm = this.permissions.get(id);
          return perm && (perm.action === 'read' || perm.action === 'execute') && perm.scope === 'own';
        }),
        isSystem: true,
        isActive: true,
        priority: 50
      },
      {
        name: 'viewer','
        description: '只读用户','
        permissions: allPermissions.filter(id => {
          const perm = this.permissions.get(id);
          return perm && perm.action === 'read';
        }),
        isSystem: true,
        isActive: true,
        priority: 30
      },
      {
        name: 'tester','
        description: '测试员','
        permissions: allPermissions.filter(id => {
          const perm = this.permissions.get(id);
          return perm && perm.category === 'testing';
        }),
        inheritFrom: ['user'],'
        isSystem: true,
        isActive: true,
        priority: 60
      }
    ];

    defaultRoles.forEach(role => {
      const newRole: Role  = {
        ...role,
        id: this.generateId('role'),'
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.roles.set(newRole.id, newRole);
      this.updateRoleHierarchy(newRole);
    });
  }

  // ==================== 工具方法 ====================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;`
  }

  private async cachePermission(permission: Permission): Promise<void> {
    await defaultMemoryCache.set(`permission_${permission.id}`, permission, undefined, 24 * 60 * 60 * 1000);`
  }

  private async cacheRole(role: Role): Promise<void> {
    await defaultMemoryCache.set(`role_${role.id}`, role, undefined, 24 * 60 * 60 * 1000);`
  }

  private async cacheUserPermissions(userPerms: UserPermissions): Promise<void> {
    await defaultMemoryCache.set(`user_permissions_${userPerms.userId}`, userPerms, undefined, 60 * 60 * 1000);`
  }
}

// ==================== React Hook集成 ====================

export function useRBAC() {
  const [rbacService] = useState(() => new RBACService());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async (userId: string, check: PermissionCheck) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rbacService.checkPermission(userId, check);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "权限检查失败';'`
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rbacService]);

  const hasRole = useCallback(async (userId: string, roleId: string) => {
    try {
      return await rbacService.hasRole(userId, roleId);
    } catch (err) {
      console.error('角色检查失败:', err);'
      return false;
    }
  }, [rbacService]);

  const getUserPermissions = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await rbacService.getUserPermissions(userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取用户权限失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rbacService]);

  return {
    rbacService,
    isLoading,
    error,
    checkPermission,
    hasRole,
    getUserPermissions,
    clearError: () => setError(null)
  };
}

// ==================== 默认实例 ====================

export const defaultRBACService = new RBACService();

export default defaultRBACService;
