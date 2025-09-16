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

export interface TestResult {
  testId: string;
  testType: TestType;
  status: TestStatus;
  url: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  score?: number;
  results?: any;
  error?: string;
  recommendations?: string[];
}

export interface TestProgress {
  testId: string;
  progress: number;
  stage: string;
  message: string;
  timestamp: string;
}

// ==================== 用户相关类型 ====================

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  settings?: UserSettings;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

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

export interface AuthResponse extends ApiResponse<{
  user: User;
  token: AuthToken;
}> {}

// ==================== 分页和过滤 ====================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}
