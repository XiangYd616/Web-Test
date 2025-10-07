/**
 * 共享API类型定义
 * 前后端通用的API相关类型
 */

// ==================== 基础响应类型 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string | number;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string | number;
  details?: any;
  timestamp: string;
}

// ==================== 请求类型 ====================

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

export interface TestRequest {
  url: string;
  testType: TestType;
  options?: TestOptions;
  config?: Record<string, any>;
}

// ==================== 错误代码枚举 ====================

export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // 认证错误
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',

  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // 业务错误
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED'
}

// ==================== 测试类型枚举 ====================

export enum TestType {
  WEBSITE = 'website',
  API = 'api',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SEO = 'seo',
  COMPATIBILITY = 'compatibility',
  STRESS = 'stress',
  UX = 'ux'
}

export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ==================== 测试相关类型 ====================

export interface TestOptions {
  timeout?: number;
  retryCount?: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  validateSSL?: boolean;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

// Removed TestResult and TestProgress - use types from test.types.ts and testEngine.types.ts instead
// to avoid type conflicts with more specific test type definitions

// ==================== 用户相关类型 ====================
// Removed User, UserRole, UserSettings - use types from user.types.ts and rbac.types.ts instead
// to avoid type conflicts

export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: boolean;
  emailAlerts?: boolean;
  [key: string]: any;
}

// ==================== 认证类型 ====================

export interface AuthCredentials {
  username?: string;
  email?: string;
  password: string;
  remember?: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

// Removed AuthResponse - use type from auth.types.ts instead to avoid conflicts

// ==================== 分页和过滤 ====================
// Removed PaginationParams and FilterParams - use types from base.types.ts instead
// to avoid duplication
