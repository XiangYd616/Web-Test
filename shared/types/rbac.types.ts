/**
 * rbac.types.ts - 基于角色的访问控制类型定义
 */

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator',
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  level: number;
}

export interface RBACContext {
  user: {
    id: string;
    role: UserRole;
  };
  permissions: Permission[];
  hasPermission: (resource: string, action: string) => boolean;
}

