export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export enum ErrorCode {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  BAD_GATEWAY = "BAD_GATEWAY"
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

export function createErrorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

export function extractData<T>(response: ApiResponse<T>): T | null {
  return response.success ? response.data || null : null;
}

export function extractError(response: ApiResponse): string | null {
  return response.success ? null : response.error || "Unknown error";
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isApiError(obj: any): obj is ApiError {
  return obj && typeof obj.code === "string" && typeof obj.message === "string";
}

export function isValidationError(obj: any): obj is ValidationError {
  return obj && typeof obj.field === "string" && typeof obj.message === "string";
}

export class ApiErrorBuilder {
  private error: Partial<ApiError>;

  constructor(code: string, message: string) {
    this.error = {
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    };
  }

  withDetails(details: Record<string, any>): this {
    this.error.details = details;
    return this;
  }

  build(): ApiError {
    return this.error as ApiError;
  }
}

export const createApiError = {
  validation: (message: string = "验证失败", details?: Record<string, any>) =>
    new ApiErrorBuilder(ErrorCode.VALIDATION_ERROR, message).withDetails(details || {}),

  unauthorized: (message: string = "未授权访问") =>
    new ApiErrorBuilder(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message: string = "访问被禁止") =>
    new ApiErrorBuilder(ErrorCode.FORBIDDEN, message),

  notFound: (message: string = "资源不存在") =>
    new ApiErrorBuilder(ErrorCode.RESOURCE_NOT_FOUND, message),

  conflict: (message: string = "资源冲突") =>
    new ApiErrorBuilder(ErrorCode.RESOURCE_CONFLICT, message),

  rateLimit: (message: string = "请求过于频繁") =>
    new ApiErrorBuilder(ErrorCode.RATE_LIMIT_EXCEEDED, message),

  network: (message: string = "网络连接失败") =>
    new ApiErrorBuilder(ErrorCode.NETWORK_ERROR, message),

  timeout: (message: string = "请求超时") =>
    new ApiErrorBuilder(ErrorCode.TIMEOUT_ERROR, message),

  internal: (message: string = "服务器内部错误") =>
    new ApiErrorBuilder(ErrorCode.INTERNAL_SERVER_ERROR, message),

  serviceUnavailable: (message: string = "服务暂不可用") =>
    new ApiErrorBuilder(ErrorCode.SERVICE_UNAVAILABLE, message)
};

// 类型不需要默认导出
