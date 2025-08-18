
// ==================== 基础类型 ====================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  TESTER = 'tester',
  MANAGER = 'manager',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum AuthStatus {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  LOADING = 'loading',
  ERROR = 'error'
}

export interface Permission     {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem?: boolean;
}

export interface Role     {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem?: boolean;
  userCount?: number;
}

// ==================== 用户相关类型 ====================

export interface UserPreferences     {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US' | 'ja-JP'
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'
  timeFormat: '24h' | '12h'
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
  testing?: {
    defaultTimeout: number;
    maxConcurrentTests: number;
    autoSaveResults: boolean;
    enableAdvancedFeatures: boolean;
  };
  privacy?: {
    shareUsageData: boolean;
    allowCookies: boolean;
    trackingEnabled: boolean;
  };
}

export interface UserProfile     {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  department?: string;
  phone?: string;
  timezone: string;
  avatar?: string;
}

export interface User     {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];

  // 个人信息
  profile: UserProfile;
  preferences: UserPreferences;

  // 状态信息
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  loginAttempts?: number;
  lockedUntil?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;

  // 统计信息
  testCount?: number;

  // 元数据
  metadata?: Record<string, any>;
}

// ==================== 认证相关类型 ====================

export interface LoginCredentials     {
  email: string;
  username?: string; // 支持用户名登录（向后兼容）
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData     {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
  acceptTerms: boolean;
  inviteCode?: string;
}

export interface AuthResponse     {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  errors?: Record<string, string>;
}

export interface UserSession     {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet'
    os?: string;
    browser?: string;
  };
}

export interface PasswordResetRequest     {
  email: string;
}

export interface PasswordReset     {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordData     {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ==================== 用户管理类型 ====================

export interface CreateUserData     {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[];
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserData     {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: string[];
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}

export interface UserFilter     {
  role?: UserRole | UserRole[];
  status?: UserStatus | UserStatus[];
  search?: string;
  emailVerified?: boolean;
  department?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface UserStats     {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<string, number>;
  usersByStatus: Record<string, number>;
}

// ==================== 认证上下文类型 ====================

export interface AuthContextType     {
  // 状态
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;

  // 基础认证方法
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UpdateUserData>) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  refreshToken: () => Promise<void>;

  // 密码重置
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<any>;

  // 邮箱验证
  sendEmailVerification: () => Promise<any>;
  verifyEmail: (token: string) => Promise<any>;

  // 权限检查
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | string) => boolean;
  hasAnyRole: (roles: (UserRole | string)[]) => boolean;

  // 工具方法
  clearError: () => void;
}

// ==================== 认证检查类型 ====================

export interface AuthCheckOptions     {
  feature?: string;
  description?: string;
  requireAuth?: boolean;
  showPrompt?: boolean;
  requiredRole?: UserRole | string;
  requiredPermissions?: string[];
}

export interface AuthCheckResult     {
  isAuthenticated: boolean;
  hasPermission: boolean;
  requireLogin: () => boolean;
  showLoginPrompt: () => void;
  hideLoginPrompt: () => void;
  LoginPromptComponent: React.ReactNode | null;
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T = any>     {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T>     {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== 安全相关类型 ====================

export interface LoginAttempt     {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: string;
}

export interface SecurityEvent     {
  id: string;
  userId?: string;
  type: 'login' | 'logout' | 'password_change' | 'permission_change' | 'suspicious_activity'
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical'
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TwoFactorAuth     {
  enabled: boolean;
  method: 'totp' | 'sms' | 'email'
  backupCodes?: string[];
  lastUsed?: string;
}

// ==================== 导出所有类型 ====================

export type {
  UserSession as AuthSession,
  // 重新导出以保持向后兼容
  User as AuthUser, AuthResponse as LoginResponse,
  AuthResponse as RegisterResponse
};

