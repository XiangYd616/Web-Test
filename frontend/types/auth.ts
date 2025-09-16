/**
 * 认证相关类型定义
 */

// 用户信息接口
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 登录请求接口
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
  captcha?: string;
}

// 注册请求接口
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  displayName?: string;
  acceptTerms: boolean;
  captcha?: string;
}

// 基本认证响应接口
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresMFA?: boolean;
}

// MFA设置响应接口
export interface MFASetupResponse {
  success: boolean;
  message: string;
  secretKey: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey?: string;
}

// MFA验证响应接口
export interface MFAVerificationResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  trustedDevice?: boolean;
}

// MFA验证请求接口
export interface MFAVerificationRequest {
  email: string;
  token: string;
  trustDevice?: boolean;
}

// MFA备用码验证请求接口
export interface MFABackupCodeRequest {
  email: string;
  backupCode: string;
  trustDevice?: boolean;
}

// 密码重置请求接口
export interface PasswordResetRequest {
  email: string;
  captcha?: string;
}

// 密码重置确认接口
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// 邮箱验证请求接口
export interface EmailVerificationRequest {
  token: string;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 更新用户资料请求接口
export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  avatar?: string;
}

// OAuth2 提供商类型
export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'apple' | 'facebook';

// OAuth2 授权请求接口
export interface OAuthAuthorizationRequest {
  provider: OAuthProvider;
  redirectUri?: string;
  state?: string;
}

// OAuth2 回调处理接口
export interface OAuthCallbackRequest {
  provider: OAuthProvider;
  code: string;
  state?: string;
}

// 会话信息接口
export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ip: string;
    location?: string;
    device: string;
    browser: string;
  };
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

// API错误响应接口
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  statusCode?: number;
}

// 认证状态枚举
export enum AuthStatus {
  UNAUTHENTICATED = 'unauthenticated',
  AUTHENTICATED = 'authenticated',
  PENDING_MFA = 'pending_mfa',
  PENDING_EMAIL_VERIFICATION = 'pending_email_verification',
  EXPIRED = 'expired'
}

// 认证上下文状态接口
export interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

// 受保护路由配置接口
export interface ProtectedRouteConfig {
  requiresAuth: boolean;
  requiresRole?: string[];
  requiresEmailVerification?: boolean;
  requiresMFASetup?: boolean;
  redirectTo?: string;
}

// JWT 令牌负载接口
export interface JWTPayload {
  sub: string; // 用户ID
  email: string;
  role: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  mfa_verified?: boolean;
  device_trusted?: boolean;
}

// 刷新令牌请求接口
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 令牌验证响应接口
export interface TokenValidationResponse {
  valid: boolean;
  expired?: boolean;
  payload?: JWTPayload;
}

// 安全事件类型
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked'
}

// 安全事件接口
export interface SecurityEvent {
  id: string;
  userId: string;
  type: SecurityEventType;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 账户锁定状态接口
export interface AccountLockStatus {
  isLocked: boolean;
  lockReason?: string;
  lockUntil?: string;
  failedAttempts: number;
  maxAttempts: number;
}

// 设备信任状态接口
export interface DeviceTrustStatus {
  deviceId: string;
  isTrusted: boolean;
  trustedUntil?: string;
  trustGrantedAt?: string;
  deviceFingerprint: string;
}
