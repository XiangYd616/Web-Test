/**
 * 统一API响应类型定义
 * 版本: v2.0.0
 */

// 基础类型定义
export type Timestamp = string;
export type UUID = string;

// 基础响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | ApiError;
  errors?: Record<string, string>;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// 成功响应类型
export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

// 错误响应类型
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string | ApiError;
  errors?: Record<string, string>;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 分页响应类型
export interface PaginatedResponse<T = any> extends ApiSuccessResponse<T[]> {
  pagination: PaginationInfo;
}

// 查询参数
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// 请求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string | FormData | Blob | ArrayBuffer | URLSearchParams;
  cache?: boolean | 'force-cache' | 'no-cache' | 'reload';
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// 错误代码枚举
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

// API错误
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
}

// 基础用户类型
export interface BaseUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// 基础测试会话类型
export interface BaseTestSession {
  id: string;
  userId: string;
  testType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 基础系统配置类型
export interface BaseSystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: string;
}

// 基础审计日志类型
export interface BaseAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details?: any;
  timestamp: string;
}

// 请求配置类型
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  retries?: number;
  retryDelay?: number;
}

// API请求配置类型
export interface ApiRequestConfig extends RequestConfig {
  baseURL?: string;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  validateStatus?: (status: number) => boolean;
}

// 统一测试配置类型
export interface UnifiedTestConfig {
  testType: string;
  target: string;
  options?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

// 测试回调接口
export interface TestCallbacks {
  onProgress?: (progress: number, step?: string, metrics?: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: any) => void;
}

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明错误

