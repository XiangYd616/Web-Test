/**
 * 统一API响应格式定义
 * 确保前后端API响应格式完全一致
 * 版本: v1.0.0
 * 创建时间: 2024-08-08
 */

// ==================== 基础类型定义 ====================

export type UUID = string;
export type Timestamp = string; // ISO 8601 格式

// ==================== 错误代码枚举 ====================

export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // 权限错误
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // 请求错误
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // 业务错误
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TEST_NOT_FOUND = 'TEST_NOT_FOUND',
  TEST_ALREADY_RUNNING = 'TEST_ALREADY_RUNNING'
}

// ==================== API错误接口 ====================

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, any>;
  retryable?: boolean;
  suggestions?: string[];
  timestamp?: Timestamp;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// ==================== API元数据接口 ====================

export interface ApiMeta {
  timestamp: Timestamp;
  requestId: string;
  path: string;
  method: string;
  responseTime?: string;
  pagination?: PaginationInfo;
  [key: string]: any;
}

export interface PaginationInfo {
  current: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
  count: number;
}

// ==================== 统一API响应接口 ====================

/**
 * 统一API响应格式 - 成功响应
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

/**
 * 统一API响应格式 - 错误响应
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta: ApiMeta;
}

/**
 * 统一API响应格式 - 联合类型
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T = any> extends ApiSuccessResponse<T[]> {
  meta: ApiMeta & {
    pagination: PaginationInfo;
  };
}

/**
 * 创建响应格式（201状态码）
 */
export interface CreatedResponse<T = any> extends ApiSuccessResponse<T> {
  // 继承成功响应，但语义上表示创建成功
}

/**
 * 无内容响应格式（204状态码）
 */
export interface NoContentResponse {
  // 204响应通常没有body
}

// ==================== 请求配置接口 ====================

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams | Record<string, any>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface AuthConfig {
  token?: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string };
  oauth2?: { accessToken: string; refreshToken?: string };
}

// ==================== 查询参数接口 ====================

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedRequest extends QueryParams {
  // 继承查询参数
}

// ==================== 响应构建器接口 ====================

export interface ResponseBuilder {
  success<T>(data: T, message?: string, meta?: Partial<ApiMeta>): ApiSuccessResponse<T>;
  error(error: ApiError, meta?: Partial<ApiMeta>): ApiErrorResponse;
  paginated<T>(data: T[], pagination: PaginationInfo, message?: string, meta?: Partial<ApiMeta>): PaginatedResponse<T>;
  created<T>(data: T, message?: string, meta?: Partial<ApiMeta>): CreatedResponse<T>;
  noContent(): NoContentResponse;
}

// ==================== 错误响应快捷方法 ====================

export interface ErrorResponseMethods {
  badRequest(message?: string, details?: Record<string, any>): ApiErrorResponse;
  unauthorized(message?: string, details?: Record<string, any>): ApiErrorResponse;
  forbidden(message?: string, details?: Record<string, any>): ApiErrorResponse;
  notFound(message?: string, details?: Record<string, any>): ApiErrorResponse;
  conflict(message?: string, details?: Record<string, any>): ApiErrorResponse;
  validationError(errors: ValidationError[], message?: string): ApiErrorResponse;
  tooManyRequests(message?: string, details?: Record<string, any>): ApiErrorResponse;
  internalError(message?: string, details?: Record<string, any>): ApiErrorResponse;
  serviceUnavailable(message?: string, details?: Record<string, any>): ApiErrorResponse;
}

// ==================== 工具函数类型 ====================

export interface ApiResponseUtils {
  isSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T>;
  isError<T>(response: ApiResponse<T>): response is ApiErrorResponse;
  isPaginated<T>(response: ApiResponse<T>): response is PaginatedResponse<T>;
  extractData<T>(response: ApiResponse<T>): T | null;
  extractError(response: ApiResponse): ApiError | null;
  extractPagination<T>(response: ApiResponse<T>): PaginationInfo | null;
}

// ==================== 默认值和常量 ====================

export const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [ErrorCode.TOKEN_INVALID]: '无效的令牌',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: '权限不足',
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_INACTIVE]: '用户账户已被禁用',
  [ErrorCode.ACCOUNT_LOCKED]: '账户已被锁定',
  [ErrorCode.TEST_NOT_FOUND]: '测试不存在',
  [ErrorCode.TEST_ALREADY_RUNNING]: '测试已在运行中'
};

export const RETRYABLE_ERROR_CODES: ErrorCode[] = [
  ErrorCode.INTERNAL_ERROR,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.TOO_MANY_REQUESTS
];

export const DEFAULT_PAGINATION: PaginationInfo = {
  current: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
  nextPage: null,
  prevPage: null,
  count: 0
};

// ==================== 类型守卫函数 ====================

export function isApiSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

export function isPaginatedResponse<T>(response: ApiResponse<T>): response is PaginatedResponse<T> {
  return isApiSuccessResponse(response) && 
         'pagination' in response.meta && 
         response.meta.pagination !== undefined;
}

export function isRetryableError(error: ApiError): boolean {
  return error.retryable === true || 
         RETRYABLE_ERROR_CODES.includes(error.code as ErrorCode);
}

// ==================== 工具函数 ====================

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = '操作成功',
  meta: Partial<ApiMeta> = {}
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: '',
      ...meta
    }
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: ErrorCode | string,
  message?: string,
  details?: Record<string, any>,
  meta: Partial<ApiMeta> = {}
): ApiErrorResponse {
  const errorMessage = message || DEFAULT_ERROR_MESSAGES[code as ErrorCode] || '未知错误';
  
  return {
    success: false,
    error: {
      code,
      message: errorMessage,
      details,
      retryable: RETRYABLE_ERROR_CODES.includes(code as ErrorCode),
      timestamp: new Date().toISOString()
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: '',
      ...meta
    }
  };
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message: string = '获取数据成功',
  meta: Partial<ApiMeta> = {}
): PaginatedResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: '',
      pagination,
      ...meta
    }
  };
}

/**
 * 创建分页信息
 */
export function createPagination(
  page: number,
  limit: number,
  total: number,
  dataCount: number = 0
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    current: parseInt(String(page)),
    limit: parseInt(String(limit)),
    total: parseInt(String(total)),
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
    count: dataCount
  };
}

/**
 * 提取响应数据
 */
export function extractData<T>(response: ApiResponse<T>): T | null {
  return isApiSuccessResponse(response) ? response.data : null;
}

/**
 * 提取错误信息
 */
export function extractError<T>(response: ApiResponse<T>): ApiError | null {
  return isApiErrorResponse(response) ? response.error : null;
}

/**
 * 提取分页信息
 */
export function extractPagination<T>(response: ApiResponse<T>): PaginationInfo | null {
  return isPaginatedResponse(response) ? response.meta.pagination : null;
}
