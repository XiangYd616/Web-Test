/**
 * 用户相关类型定义
 * 版本: v2.0.0
 */

import { UserRole, UserStatus } from './enums';
import type { ApiResponse } from './unified/apiResponse.types';

// 用户基础信息
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lockedUntil?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
  preferences?: UserPreferences;
  profile?: UserProfile;
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    browser: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
    defaultView?: string;
  };
}

// 用户档案信息
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
  };
}

// 用户统计信息
export interface UserStats {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  lastTestDate?: string;
  favoriteTests: string[];
  testsByType: Record<string, number>;
  mostUsedTestType?: string;
}

// 用户活动统计
export interface UserActivityStats {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  lastTestDate?: string;
  favoriteTests: string[];
  testsByType: Record<string, number>;
  mostUsedTestType?: string;
  totalTestTime: number;
}

// 认证响应接口
export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
  expiresIn?: number;
  errors?: Record<string, string>;
  requireMFA?: boolean;
}

// 登录凭据接口
export interface LoginCredentials {
  username: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}

// 注册数据接口
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  acceptTerms?: boolean;
}

// 修改密码数据接口
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 创建用户数据接口
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: UserRole;
}

// 更新用户数据接口
export interface UpdateUserData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  profile?: Partial<UserProfile>;
}

// 用户创建请求
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

// 用户更新请求
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  profile?: Partial<UserProfile>;
}

// 用户查询参数
export interface UserQuery {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// API响应类型
export type UserResponse = ApiResponse<User>;
export type UserListResponse = ApiResponse<User[]>;
export type UserStatsResponse = ApiResponse<UserStats>;

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误

