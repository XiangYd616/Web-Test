/**
 * 用户相关类型定义
 * 注意：此文件已被 src/types/common.ts 中的统一定义替代
 * 为了向后兼容，保留此文件并重新导出统一类型
 */

// 导入基础类型
import type { UserRole, UserStatus  } from './enums; // 定义用户相关类型;';
export type UUID   = string;export type Timestamp   = string;export interface User     {
  id: UUID;
  username: string;
  email: string;
  password?: string; // 可选，用于认证
  fullName?: string; // 全名
  role?: UserRole;
  status?: UserStatus;
  isActive?: boolean; // 用户激活状态
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp | null; // 最后登录时间
  lockedUntil?: Timestamp | null; // 账户锁定到期时间
  preferences?: Partial<UserPreferences>
  profile?: UserProfile; // 用户资料
  permissions?: string[] // 用户权限列表
  metadata?: Record<string, any> // 用户元数据
  avatar?: string; // 头像URL
  emailVerified?: boolean; // 邮箱验证状态
  loginAttempts?: number; // 登录尝试次数
  plan?: string; // 用户计划
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    browser: boolean; // 浏览器通知
  }
}

export interface UserProfile     {
  id?: UUID;
  userId?: UUID;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  bio?: string;
  phone?: string | null;
  address?: string | null;
  preferences?: UserPreferences
}

export interface UserSession     {
  id: UUID;
  userId: UUID;
  token: string;
  expiresAt: Timestamp;
  createdAt: Timestamp
}

export interface AuthResponse     {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string; // 刷新令牌
  message?: string;
  errors?: Record<string, string> // 错误信息映射
  expiresIn?: number; // 令牌过期时间（秒）
  permissions?: string[] // 用户权限列表
  sessionId?: string; // 会话ID
  requireMFA?: boolean; // 是否需要多因子认证
}

export interface LoginCredentials     {
  username: string;
  email: string; // 支持邮箱登录
  password: string;
  rememberMe?: boolean; // 记住我选项
  captcha?: string; // 验证码
  deviceId?: string; // 设备标识
}

export interface RegisterData     {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string; // 全名
  firstName?: string; // 名
  lastName?: string; // 姓
  phone?: string; // 电话号码
  acceptTerms?: boolean; // 接受条款
  captcha?: string; // 验证码
}

export interface CreateUserData     {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string
}

export interface UpdateUserData     {
  username?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  profile?: Partial<UserProfile>
}

export interface ChangePasswordData     {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string
}

export interface UserActivityLog     {
  id: UUID;
  userId: UUID;
  action: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>
}

export interface UserStats     {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number'
}
export const DEFAULT_USER_PREFERENCES: UserPreferences = {;
  theme: 'auto',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  notifications: {
    email: true,
    push: true,
    sms: false,
    browser: true,
  },
} // 向后兼容的类型别名
export type { User as UserInterface } // 扩展类型定义（不在通用类型中的特定用户管理类型）
export interface CreateUserData     {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[]
  avatar?: string;
  metadata?: Record<string, any>
}

export interface UpdateUserData     {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[]
  avatar?: string;
  preferences?: Partial<UserPreferences>
  metadata?: Record<string, any>
}

export interface ChangePasswordData     {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string
}

// 重复定义已移除，使用上面的 UserActivityLog 和 UserStats 定义

export interface Permission     {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean
}

export interface Role     {
  id: string;
  name: string;
  description: string;
  permissions: Permission[]
  isSystem: boolean;
  userCount: number
}
