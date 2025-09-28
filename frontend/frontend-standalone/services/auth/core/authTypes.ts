/**
 * 认证核心类型定义
 * 统一的认证接口，支持基础和企业级功能
 */

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
  errors?: Record<string, string> | string[];
  requireMFA?: boolean;
  mfaChallenge?: MFAChallenge;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: string;
  status: string;
  permissions?: any[];
  preferences?: any;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  lockedUntil?: string;
}

// 企业级认证配置
export interface EnhancedAuthConfig {
  // Token配置
  accessTokenExpiry: number; // 访问token过期时间（秒）
  refreshTokenExpiry: number; // 刷新token过期时间（秒）
  autoRefreshThreshold: number; // 自动刷新阈值（秒）

  // 会话配置
  maxConcurrentSessions: number; // 最大并发会话数
  sessionTimeout: number; // 会话超时时间（秒）
  enableSessionTracking: boolean; // 启用会话追踪

  // 安全配置
  enableDeviceFingerprinting: boolean; // 启用设备指纹
  enableSecureStorage: boolean; // 启用安全存储
  requireMFA: boolean; // 要求多因素认证

  // 密码策略
  passwordPolicy: PasswordPolicy;

  // API配置
  apiBaseUrl: string;
  endpoints: AuthEndpoints;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // 密码最大使用天数
  preventReuse: number; // 防止重复使用的历史密码数量
}

export interface AuthEndpoints {
  login: string;
  refresh: string;
  logout: string;
  mfa: string;
  sessions: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface MFAChallenge {
  type: 'sms' | 'email' | 'totp' | 'backup';
  challengeId: string;
  expiresAt: string;
  maskedTarget?: string; // 如 "***@example.com" 或 "***1234"
}

export interface MFAVerification {
  challengeId: string;
  code: string;
  trustDevice?: boolean;
}

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
  };
}

export interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  language: string;
  platform: string;
  fingerprint?: string;
}

// JWT相关类型
export interface JwtPayload {
  sub: string; // 用户ID
  username: string;
  email: string;
  role: string;
  sessionId: string;
  deviceId?: string;
  fingerprint?: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number;
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenPair;
  user?: User;
  error?: string;
  requiresReauth?: boolean;
}

// 认证服务接口
export interface IAuthService {
  // 基础认证方法
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  register(data: RegisterData): Promise<AuthResponse>;
  logout(): void | Promise<void>;
  getCurrentUser(): User | null | Promise<User | null>;
  isAuthenticated(): boolean | Promise<boolean>;
  
  // Token管理
  refreshToken?(): Promise<boolean>;
  
  // 企业级功能（可选）
  verifyMFA?(verification: MFAVerification): Promise<AuthResponse>;
  requestMFAChallenge?(type: 'sms' | 'email'): Promise<{ success: boolean; message: string }>;
  getSessions?(): Promise<SessionInfo[]>;
  terminateSession?(sessionId: string): Promise<boolean>;
  validatePasswordStrength?(password: string): PasswordStrength;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}
