/**
 * 用户相关类型定义
 * 注意：此文件已被 src/types/common.ts 中的统一定义替代
 * 为了向后兼容，保留此文件并重新导出统一类型
 */

// 重新导出统一的用户类型
export type {
  AuthResponse,
  DEFAULT_USER_PREFERENCES, LoginCredentials,
  RegisterData, User, UserPreferences,
  UserProfile, UserRole, UserSession, UserStatus
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
