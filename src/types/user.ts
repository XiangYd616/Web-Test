// 用户相关类型定义

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'admin' | 'user' | 'tester' | 'manager';
  status: 'active' | 'inactive' | 'suspended';
  permissions?: string[];
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  emailVerified: boolean;
  loginAttempts?: number;
  lockedUntil?: string;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US' | 'ja-JP';
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat: '24h' | '12h';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    browser: boolean;
    testComplete: boolean;
    testFailed: boolean;
    weeklyReport: boolean;
    securityAlert: boolean;
  };
  dashboard?: {
    defaultView: string;
    layout?: string;
    widgets?: string[];
    refreshInterval: number;
    showTips?: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  username?: string; // 支持用户名登录（向后兼容）
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  errors?: Record<string, string>;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: 'admin' | 'user' | 'tester' | 'manager';
  permissions?: string[];
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  fullName?: string;
  role?: 'admin' | 'user' | 'tester';
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

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
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
