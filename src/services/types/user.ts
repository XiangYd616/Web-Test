// 用户类型定义
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
  testing: {
    defaultTimeout: number;
    maxConcurrentTests: number;
    autoSaveResults: boolean;
    enableAdvancedFeatures: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    allowCookies: boolean;
    trackingEnabled: boolean;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
  profile: {
    firstName?: string;
    lastName?: string;
    company?: string;
    department?: string;
    phone?: string;
    timezone: string;
  };
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
  errors?: string[];
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  department?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 默认用户偏好设置
export const defaultUserPreferences: UserPreferences = {
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
