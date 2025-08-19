export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
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
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMIT = "RATE_LIMIT",
  INTERNAL_ERROR = "INTERNAL_ERROR"
}

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams | Record<string, any>;
  timeout?: number;
  retries?: number;
  baseURL?: string;
}

export interface SortConfig {
  field: string;
  order?: "asc" | "desc";
}

export interface FilterConfig {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
  value: any;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: SortConfig[];
  filters?: FilterConfig[];
  search?: string;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

export function createErrorResponse(
  error: string,
  code?: string
): ApiResponse {
  return {
    success: false,
    error,
    code: code ? parseInt(code) : 500,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
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

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isApiError(response: ApiResponse): boolean {
  return !response.success;
}

export function extractData<T>(response: ApiResponse<T>): T | null {
  return response.success ? response.data || null : null;
}

export function extractError(response: ApiResponse): string | null {
  return response.success ? null : response.error || "Unknown error";
}

// 类型不需要默认导出
