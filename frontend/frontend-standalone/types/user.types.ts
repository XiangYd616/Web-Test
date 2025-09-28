// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator'
}

/**
 * 用户相关类型定义
 * 注意：此文件已被 src/types/common.ts 中的统一定义替代
 * 为了向后兼容，保留此文件并重新导出统一类型
 */

// 重新导出统一的用户类型（避免与本地定义冲突）
export type {
  AuthResponse, UserPreferences as CommonUserPreferences, DEFAULT_USER_PREFERENCES,
  LoginCredentials,
  RegisterData,
  User, UserProfile,
  UserSession,
  UserStatus
} from './common';

// 向后兼容的类型别名
export type { User as UserInterface } from './common';

// 扩展类型定义（不在通用类型中的特定用户管理类型）
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[];
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[];
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<string, number>;
  usersByStatus: Record<string, number>;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  userCount: number;
}


// 用户偏好设置接口
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    itemsPerPage: number;
  };
}

// ==================== 类型导出说明 ====================
// 基于Context7最佳实践：所有interface、type和enum定义已通过export关键字导出
// 无需额外的导出语句，避免重复导出冲突

// 所有类型已通过以下方式导出：
// - export enum UserRole { ... }
// - export interface CreateUserData { ... }
// - export interface UserPreferences { ... }
// - 等等...

