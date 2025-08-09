/**
 * 统一用户数据模型定义
 * 确保前后端完全一致的User类型定义
 * 版本: v1.0.0
 * 创建时间: 2024-08-08
 */

// ==================== 基础类型定义 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式
export type Email = string;

// ==================== 枚举定义 ====================

/**
 * 用户角色枚举 - 与数据库约束保持一致
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  TESTER = 'tester',
  MANAGER = 'manager'
}

/**
 * 用户状态枚举 - 与数据库约束保持一致
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

/**
 * 用户计划枚举 - 与数据库约束保持一致
 */
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// ==================== 用户偏好设置 ====================

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  browser: boolean;
  testComplete: boolean;
  testFailed: boolean;
  weeklyReport: boolean;
  securityAlert: boolean;
}

export interface DashboardSettings {
  defaultView: string;
  layout: 'grid' | 'list' | 'cards';
  widgets: string[];
  refreshInterval: number; // 秒
  showTips: boolean;
}

export interface TestingSettings {
  defaultTimeout: number; // 毫秒
  maxConcurrentTests: number;
  autoSaveResults: boolean;
  enableAdvancedFeatures: boolean;
}

export interface PrivacySettings {
  shareUsageData: boolean;
  allowCookies: boolean;
  trackingEnabled: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US' | 'ja-JP';
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat: '24h' | '12h';
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  testing: TestingSettings;
  privacy: PrivacySettings;
}

// ==================== 用户档案信息 ====================

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  fullName?: string; // 计算字段，由firstName + lastName生成
  company?: string;
  department?: string;
  phone?: string;
  timezone: string;
  bio?: string;
  avatar?: string;
}

// ==================== 用户会话信息 ====================

export interface UserSession {
  id: UUID;
  userId: UUID;
  sessionToken: string;
  refreshToken?: string;
  deviceInfo: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Timestamp;
  lastAccessedAt: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;
}

// ==================== 核心用户接口 ====================

/**
 * 统一用户接口 - 前后端共享
 * 字段名称与数据库字段保持映射关系
 */
export interface User {
  // 基础标识信息
  id: UUID;
  username: string;
  email: Email;

  // 角色和权限
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  permissions: string[];

  // 个人信息
  profile: UserProfile;
  preferences: UserPreferences;

  // 安全相关
  emailVerified: boolean;
  emailVerifiedAt?: Timestamp;
  twoFactorEnabled?: boolean;
  loginAttempts: number;
  lockedUntil?: Timestamp;

  // 时间戳 - 使用统一的字段名
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;

  // 统计信息
  loginCount: number;
  testCount?: number;

  // 元数据
  metadata: Record<string, any>;
}

// ==================== 数据库映射接口 ====================

/**
 * 数据库字段映射接口
 * 用于前后端数据转换
 */
export interface UserDatabaseFields {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: string;
  plan: string;
  status: string;
  email_verified: boolean;
  email_verified_at?: string;
  last_login?: string;
  login_count: number;
  failed_login_attempts: number;
  locked_until?: string;
  preferences: string; // JSON字符串
  metadata: string; // JSON字符串
  created_at: string;
  updated_at: string;
}

// ==================== 用户操作相关接口 ====================

export interface CreateUserData {
  username: string;
  email: Email;
  password: string;
  profile?: Partial<UserProfile>;
  role?: UserRole;
  plan?: UserPlan;
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateUserData {
  username?: string;
  email?: Email;
  profile?: Partial<UserProfile>;
  role?: UserRole;
  plan?: UserPlan;
  permissions?: string[];
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ==================== 认证相关接口 ====================

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  username: string;
  email: Email;
  password: string;
  confirmPassword: string;
  profile?: Partial<UserProfile>;
  acceptTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: Timestamp;
  message?: string;
  errors?: string[];
}

// ==================== 用户查询和过滤 ====================

export interface UserFilter {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  plan?: UserPlan | UserPlan[];
  search?: string; // 搜索用户名、邮箱、姓名
  emailVerified?: boolean;
  department?: string;
  createdAfter?: Timestamp;
  createdBefore?: Timestamp;
  lastLoginAfter?: Timestamp;
  lastLoginBefore?: Timestamp;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'username' | 'email';
  sortOrder?: 'asc' | 'desc';
  filter?: UserFilter;
}

// ==================== 用户统计信息 ====================

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
  usersByPlan: Record<UserPlan, number>;
}

// ==================== 用户活动日志 ====================

export interface UserActivityLog {
  id: UUID;
  userId: UUID;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
  severity: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// ==================== 默认值定义 ====================

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  notifications: {
    email: true,
    sms: false,
    push: true,
    browser: true,
    testComplete: true,
    testFailed: true,
    weeklyReport: false,
    securityAlert: true
  },
  dashboard: {
    defaultView: 'overview',
    layout: 'grid',
    widgets: [],
    refreshInterval: 30,
    showTips: true
  },
  testing: {
    defaultTimeout: 30000,
    maxConcurrentTests: 3,
    autoSaveResults: true,
    enableAdvancedFeatures: false
  },
  privacy: {
    shareUsageData: false,
    allowCookies: true,
    trackingEnabled: false
  }
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  timezone: 'Asia/Shanghai'
};

// ==================== 类型守卫函数 ====================

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

export function isValidUserPlan(plan: string): plan is UserPlan {
  return Object.values(UserPlan).includes(plan as UserPlan);
}

// ==================== 数据转换工具函数 ====================

/**
 * 将数据库字段转换为前端User对象
 */
export function fromDatabaseFields(dbData: UserDatabaseFields): User {
  return {
    id: dbData.id,
    username: dbData.username,
    email: dbData.email,
    role: dbData.role as UserRole,
    plan: dbData.plan as UserPlan,
    status: dbData.status as UserStatus,
    permissions: [], // 需要从其他表获取
    profile: {
      firstName: dbData.first_name,
      lastName: dbData.last_name,
      fullName: dbData.first_name && dbData.last_name
        ? `${dbData.first_name} ${dbData.last_name}`
        : undefined,
      timezone: 'Asia/Shanghai' // 默认值
    },
    preferences: dbData.preferences ? JSON.parse(dbData.preferences) : DEFAULT_USER_PREFERENCES,
    emailVerified: dbData.email_verified,
    emailVerifiedAt: dbData.email_verified_at,
    loginAttempts: dbData.failed_login_attempts,
    lockedUntil: dbData.locked_until,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    lastLoginAt: dbData.last_login,
    loginCount: dbData.login_count,
    metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {}
  };
}

/**
 * 将前端User对象转换为数据库字段
 */
export function toDatabaseFields(user: User, passwordHash?: string): UserDatabaseFields {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: passwordHash || '', // 需要单独处理
    first_name: user.profile.firstName,
    last_name: user.profile.lastName,
    role: user.role,
    plan: user.plan,
    status: user.status,
    email_verified: user.emailVerified,
    email_verified_at: user.emailVerifiedAt,
    last_login: user.lastLoginAt,
    login_count: user.loginCount,
    failed_login_attempts: user.loginAttempts,
    locked_until: user.lockedUntil,
    preferences: JSON.stringify(user.preferences),
    metadata: JSON.stringify(user.metadata),
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}
