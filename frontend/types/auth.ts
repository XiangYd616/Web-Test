export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  TESTER = "tester",
  MANAGER = "manager",
  VIEWER = "viewer"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending"
}

export enum AuthStatus {
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
  LOADING = "loading",
  ERROR = "error"
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem?: boolean;
  userCount?: number;
}

export interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: "zh-CN" | "en-US" | "ja-JP";
  timezone: string;
  dateFormat: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
  timeFormat: "24h" | "12h";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    browser: boolean;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    company?: string;
    department?: string;
    phone?: string;
    bio?: string;
  };
  preferences: UserPreferences;
  permissions: Permission[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  token: string;
  refreshToken?: string;
  tokenExpiresAt: string;
  sessionId: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
  captcha?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  agreeToTerms: boolean;
  captcha?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}

export interface PasswordResetRequest {
  email: string;
  captcha?: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  permissions: Permission[];
  sessionExpiry: string | null;
}

export interface LoginSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  userAgent: string;
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  deviceInfo?: {
    type: "desktop" | "mobile" | "tablet";
    os?: string;
    browser?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AuthConfig {
  sessionTimeout: number;
  refreshTokenExpiry: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    maxAge: number;
    preventReuse: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    methods: Array<"totp" | "sms" | "email">;
    backupCodes: boolean;
  };
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface LoginAttempt {
  id: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: string;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: "login" | "logout" | "password_change" | "permission_change" | "suspicious_activity";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface TwoFactorAuth {
  enabled: boolean;
  method: "totp" | "sms" | "email";
  secret?: string;
  backupCodes?: string[];
  lastUsed?: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "auto",
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24h",
  notifications: {
    email: true,
    push: true,
    sms: false,
    browser: true
  }
};

export function hasPermission(user: User | AuthUser, permission: string): boolean {
  return user.permissions.some(p => p.name === permission);
}

export function hasRole(user: User | AuthUser, role: UserRole): boolean {
  return user.role === role;
}

export function isAdmin(user: User | AuthUser): boolean {
  return user.role === UserRole.ADMIN;
}

export function canManageUsers(user: User | AuthUser): boolean {
  return hasRole(user, UserRole.ADMIN) || hasRole(user, UserRole.MANAGER);
}

export function canCreateTests(user: User | AuthUser): boolean {
  return hasRole(user, UserRole.ADMIN) || 
         hasRole(user, UserRole.MANAGER) || 
         hasRole(user, UserRole.TESTER);
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date();
}

export function getTokenTimeRemaining(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const now = new Date();
  return Math.max(0, expiry.getTime() - now.getTime());
}

// 类型不需要默认导出
