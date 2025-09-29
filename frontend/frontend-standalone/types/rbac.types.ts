/**
 * RBAC权限管理类型定义
 * 基于角色的访问控制模型
 * 版本: v2.0.0
 */

// ==================== 基础类型 ====================

export type UUID = string;
export type Timestamp = string;

// ==================== 权限相关枚举 ====================

/**
 * 权限操作类型
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage',
  APPROVE = 'approve',
  EXPORT = 'export',
  IMPORT = 'import'
}

/**
 * 资源类型
 */
export enum ResourceType {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  TEST = 'test',
  REPORT = 'report',
  SYSTEM = 'system',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  AUDIT = 'audit',
  API = 'api'
}

/**
 * 权限效果
 */
export enum PermissionEffect {
  ALLOW = 'allow',
  DENY = 'deny'
}

/**
 * 角色类型
 */
export enum RoleType {
  SYSTEM = 'system',     // 系统角色，不可删除
  CUSTOM = 'custom',     // 自定义角色
  INHERITED = 'inherited' // 继承角色
}

// ==================== 权限接口 ====================

/**
 * 权限定义
 */
export interface Permission {
  id: UUID;
  name: string;
  description: string;
  resource: ResourceType;
  action: PermissionAction;
  effect: PermissionEffect;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 权限条件
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
  description?: string;
}

/**
 * 角色定义
 */
export interface Role {
  id: UUID;
  name: string;
  description: string;
  type: RoleType;
  level: number; // 角色层级，用于继承
  parentRoleId?: UUID;
  permissions: Permission[];
  isActive: boolean;
  isSystem: boolean;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UUID;
  updatedBy: UUID;
}

/**
 * 用户角色关联
 */
export interface UserRole {
  id: UUID;
  userId: UUID;
  roleId: UUID;
  assignedBy: UUID;
  assignedAt: Timestamp;
  expiresAt?: Timestamp;
  isActive: boolean;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
}

/**
 * 权限策略
 */
export interface PermissionPolicy {
  id: UUID;
  name: string;
  description: string;
  rules: PermissionRule[];
  isActive: boolean;
  priority: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 权限规则
 */
export interface PermissionRule {
  id: UUID;
  resource: ResourceType;
  action: PermissionAction;
  effect: PermissionEffect;
  conditions?: PermissionCondition[];
  description?: string;
}

// ==================== 权限检查相关 ====================

/**
 * 权限检查请求
 */
export interface PermissionCheckRequest {
  userId: UUID;
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: string;
  context?: Record<string, any>;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedRules: PermissionRule[];
  deniedBy?: Permission[];
  allowedBy?: Permission[];
  context?: Record<string, any>;
}

/**
 * 批量权限检查请求
 */
export interface BatchPermissionCheckRequest {
  userId: UUID;
  checks: Array<{
    resource: ResourceType;
    action: PermissionAction;
    resourceId?: string;
  }>;
  context?: Record<string, any>;
}

/**
 * 批量权限检查结果
 */
export interface BatchPermissionCheckResult {
  results: Record<string, PermissionCheckResult>;
  summary: {
    total: number;
    allowed: number;
    denied: number;
  };
}

// ==================== 审计日志 ====================

/**
 * 权限审计日志
 */
export interface PermissionAuditLog {
  id: UUID;
  userId: UUID;
  action: string;
  resource: ResourceType;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  result: 'success' | 'failure' | 'denied';
  reason?: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * 角色变更审计
 */
export interface RoleAuditLog {
  id: UUID;
  roleId: UUID;
  userId: UUID; // 执行操作的用户
  targetUserId?: UUID; // 被操作的用户（如果是用户角色分配）
  action: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
  changes: Record<string, { old: unknown; new: unknown }>;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
}

// ==================== 权限管理接口 ====================

/**
 * 权限管理器接口
 */
export interface PermissionManager {
  // 权限检查
  checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult>;
  checkBatchPermissions(request: BatchPermissionCheckRequest): Promise<BatchPermissionCheckResult>;
  
  // 用户权限
  getUserPermissions(userId: UUID): Promise<Permission[]>;
  getUserRoles(userId: UUID): Promise<Role[]>;
  
  // 角色管理
  createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
  updateRole(roleId: UUID, updates: Partial<Role>): Promise<Role>;
  deleteRole(roleId: UUID): Promise<boolean>;
  assignRole(userId: UUID, roleId: UUID, assignedBy: UUID, expiresAt?: Timestamp): Promise<boolean>;
  revokeRole(userId: UUID, roleId: UUID, revokedBy: UUID): Promise<boolean>;
  
  // 权限管理
  createPermission(permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission>;
  updatePermission(permissionId: UUID, updates: Partial<Permission>): Promise<Permission>;
  deletePermission(permissionId: UUID): Promise<boolean>;
  
  // 审计日志
  logPermissionCheck(log: Omit<PermissionAuditLog, 'id' | 'timestamp'>): Promise<void>;
  logRoleChange(log: Omit<RoleAuditLog, 'id' | 'timestamp'>): Promise<void>;
}

// ==================== 权限装饰器和中间件 ====================

/**
 * 权限装饰器选项
 */
export interface RequirePermissionOptions {
  resource: ResourceType;
  action: PermissionAction;
  resourceIdParam?: string; // 从请求参数中获取资源ID的字段名
  allowOwner?: boolean; // 是否允许资源所有者访问
  customCheck?: (context: unknown) => boolean; // 自定义检查函数
}

/**
 * 权限中间件选项
 */
export interface PermissionMiddlewareOptions {
  resource: ResourceType;
  action: PermissionAction;
  optional?: boolean; // 是否为可选权限检查
  onDenied?: (req: unknown, res: unknown, reason: string) => void; // 权限拒绝时的处理函数
}

// ==================== 权限上下文 ====================

/**
 * 权限上下文
 */
export interface PermissionContext {
  user: {
    id: UUID;
    roles: Role[];
    permissions: Permission[];
  };
  request: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    method: string;
    path: string;
    params: Record<string, any>;
    query: Record<string, any>;
    body: Record<string, any>;
  };
  resource?: {
    type: ResourceType;
    id?: string;
    owner?: UUID;
    metadata?: Record<string, any>;
  };
}

// ==================== 数据库映射接口 ====================

/**
 * 权限数据库字段映射
 */
export interface PermissionDatabaseFields {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  effect: string;
  conditions: string; // JSON字符串
  metadata: string; // JSON字符串
  created_at: string;
  updated_at: string;
}

/**
 * 角色数据库字段映射
 */
export interface RoleDatabaseFields {
  id: string;
  name: string;
  description: string;
  type: string;
  level: number;
  parent_role_id?: string;
  is_active: boolean;
  is_system: boolean;
  metadata: string; // JSON字符串
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

/**
 * 用户角色关联数据库字段映射
 */
export interface UserRoleDatabaseFields {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  conditions: string; // JSON字符串
  metadata: string; // JSON字符串
}

// ==================== 数据转换函数 ====================

/**
 * 将数据库字段转换为Permission对象
 */
export function permissionFromDatabase(dbData: PermissionDatabaseFields): Permission {
  return {
    id: dbData.id,
    name: dbData.name,
    description: dbData.description,
    resource: dbData.resource as ResourceType,
    action: dbData.action as PermissionAction,
    effect: dbData.effect as PermissionEffect,
    conditions: dbData.conditions ? JSON.parse(dbData.conditions) : undefined,
    metadata: dbData.metadata ? JSON.parse(dbData.metadata) : undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at
  };
}

/**
 * 将Permission对象转换为数据库字段
 */
export function permissionToDatabase(permission: Permission): PermissionDatabaseFields {
  return {
    id: permission.id,
    name: permission.name,
    description: permission.description,
    resource: permission.resource,
    action: permission.action,
    effect: permission.effect,
    conditions: permission.conditions ? JSON.stringify(permission.conditions) : '',
    metadata: permission.metadata ? JSON.stringify(permission.metadata) : '',
    created_at: permission.createdAt,
    updated_at: permission.updatedAt
  };
}

/**
 * 将数据库字段转换为Role对象
 */
export function roleFromDatabase(dbData: RoleDatabaseFields, permissions: Permission[] = []): Role {
  return {
    id: dbData.id,
    name: dbData.name,
    description: dbData.description,
    type: dbData.type as RoleType,
    level: dbData.level,
    parentRoleId: dbData.parent_role_id,
    permissions,
    isActive: dbData.is_active,
    isSystem: dbData.is_system,
    metadata: dbData.metadata ? JSON.parse(dbData.metadata) : undefined,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    createdBy: dbData.created_by,
    updatedBy: dbData.updated_by
  };
}

/**
 * 将Role对象转换为数据库字段
 */
export function roleToDatabase(role: Role): RoleDatabaseFields {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    type: role.type,
    level: role.level,
    parent_role_id: role.parentRoleId,
    is_active: role.isActive,
    is_system: role.isSystem,
    metadata: role.metadata ? JSON.stringify(role.metadata) : '',
    created_at: role.createdAt,
    updated_at: role.updatedAt,
    created_by: role.createdBy,
    updated_by: role.updatedBy
  };
}

// ==================== 权限验证函数 ====================

/**
 * 验证权限条件
 */
export function validatePermissionCondition(condition: PermissionCondition, context: unknown): boolean {
  const { field, operator, value } = condition;
  const fieldValue = getNestedValue(context, field);

  switch (operator) {
    case 'eq':
      return fieldValue === value;
    case 'ne':
      return fieldValue !== value;
    case 'gt':
      return fieldValue > value;
    case 'gte':
      return fieldValue >= value;
    case 'lt':
      return fieldValue < value;
    case 'lte':
      return fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'nin':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && fieldValue.includes(value);
    case 'regex':
      return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
    default:
      return false;
  }
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 检查权限是否匹配
 */
export function isPermissionMatch(
  permission: Permission,
  resource: ResourceType,
  action: PermissionAction,
  context?: unknown
): boolean {
  // 检查资源和操作是否匹配
  if (permission.resource !== resource || permission.action !== action) {
    return false;
  }

  // 检查条件
  if (permission.conditions && permission.conditions.length > 0 && context) {
    return permission.conditions.every(condition => 
      validatePermissionCondition(condition, context)
    );
  }

  return true;
}

export default {
  PermissionAction,
  ResourceType,
  PermissionEffect,
  RoleType,
  permissionFromDatabase,
  permissionToDatabase,
  roleFromDatabase,
  roleToDatabase,
  validatePermissionCondition,
  isPermissionMatch
};
