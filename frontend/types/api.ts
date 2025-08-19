import type { ApiResponse, Timestamp } from "./common";
import type { TestStatus, TestType } from "./enums";

export type UUID = string;

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  credentials?: "include" | "omit" | "same-origin";
}

export interface ApiRequestOptions extends RequestConfig {
  baseURL?: string;
  validateStatus?: (status: number) => boolean;
  transformRequest?: (data: any) => any;
  transformResponse?: (data: any) => any;
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
}

export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
}

export interface ErrorResponse extends BaseApiResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    stack?: string;
  };
}

export interface SuccessResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
    [key: string]: any;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedRequest extends QueryParams {}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message?: string;
  data: T[];
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
    pagination: PaginationInfo;
    [key: string]: any;
  };
}

export interface TestStartRequest {
  url: string;
  testType: TestType;
  config?: Record<string, any>;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TestStartResponse extends ApiResponse<{
  testId: UUID;
  sessionId: UUID;
  status: TestStatus;
  estimatedDuration?: number;
}> {}

export interface TestStatusRequest {
  testId: UUID;
  includeProgress?: boolean;
  includeMetrics?: boolean;
}

export interface TestStatusResponse extends ApiResponse<{
  testId: UUID;
  status: TestStatus;
  progress: number;
  currentStep?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  metrics?: Record<string, any>;
  error?: string;
}> {}

export interface TestResultRequest {
  testId: UUID;
  format?: "json" | "summary" | "detailed";
  includeRawData?: boolean;
}

export interface TestResultResponse extends ApiResponse<{
  testId: UUID;
  testType: TestType;
  status: TestStatus;
  result: Record<string, any>;
  summary?: string;
  score?: number;
  grade?: string;
  recommendations?: Array<{
    category: string;
    priority: "low" | "medium" | "high";
    message: string;
    action?: string;
  }>;
}> {}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  captcha?: string;
}

export interface LoginResponse extends ApiResponse<{
  user: {
    id: UUID;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
  token: string;
  refreshToken: string;
  expiresIn: number;
}> {}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
}

export interface RegisterResponse extends ApiResponse<{
  user: {
    id: UUID;
    username: string;
    email: string;
    status: "pending" | "active";
  };
  requiresVerification: boolean;
}> {}

export interface FileUploadRequest {
  file: File;
  category?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse extends ApiResponse<{
  fileId: UUID;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  downloadUrl?: string;
}> {}

export interface SystemStatusResponse extends ApiResponse<{
  status: "healthy" | "degraded" | "down";
  version: string;
  uptime: number;
  services: Record<string, {
    status: "up" | "down";
    responseTime?: number;
    lastCheck: Timestamp;
  }>;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}> {}

export enum ApiErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
  requestId?: string;
}

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ApiEndpoint = string;
export type ApiHeaders = Record<string, string>;
export type ApiParams = Record<string, any>;

export const DEFAULT_API_CONFIG: RequestConfig = {
  method: "GET",
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: false,
  credentials: "include"
};

export const DEFAULT_PAGINATION: Partial<QueryParams> = {
  page: 1,
  limit: 20,
  order: "desc"
};

// 类型不需要默认导出
