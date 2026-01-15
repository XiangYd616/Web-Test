/**
 * API Types - Consolidated API Type Definitions
 *
 * This file consolidates all API-related types from scattered files into a single
 * source of truth. It replaces:
 * - types/api.ts
 * - types/api.types.ts
 * - types/apiResponse.ts
 * - types/compat/apiResponse.ts
 * - types/compat/apiResponse.types.ts
 * - types/api/client.types.ts
 *
 * Version: v3.0.0
 */

// ==================== Basic Type Definitions ====================

export type Timestamp = string;
export type UUID = string;
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// ==================== Core API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string | ApiError;
  errors?: Record<string, string> | ValidationError[];
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface ApiSuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string | ApiError;
}

// ==================== Error Handling Types ====================

export enum ErrorCode {
  // General errors
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

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Authentication errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Business errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Execution errors
  EXECUTION_ERROR = 'EXECUTION_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: unknown;
  suggestions?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// ==================== Request Configuration Types ====================

export interface RequestHeaders {
  'Content-Type'?: string;
  Authorization?: string;
  Accept?: string;
  [key: string]: string | undefined;
}

export interface RequestConfig {
  method?: HttpMethod;
  headers?: RequestHeaders;
  body?: string | FormData | URLSearchParams | Blob | ArrayBuffer;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean | 'force-cache' | 'no-cache' | 'reload';
  cacheTTL?: number;
}

export interface ApiRequestConfig extends RequestConfig {
  baseURL?: string;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  validateStatus?: (status: number) => boolean;
}

// ==================== Authentication Types ====================

export interface AuthConfig {
  type?: 'bearer' | 'basic' | 'api-key' | 'oauth2';
  token?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  tokenKey?: string;
  refreshTokenKey?: string;
  tokenExpiry?: number;
  autoRefresh?: boolean;
  loginEndpoint?: string;
  refreshEndpoint?: string;
  basicAuth?: {
    username: string;
    password: string;
  };
  oauth2?: {
    accessToken: string;
    refreshToken?: string;
  };
}

// ==================== Pagination and Query Types ====================

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = unknown> extends ApiSuccessResponse<T[]> {
  pagination: PaginationInfo;
}

export type PaginatedRequest = PaginationParams;

// ==================== API Client Interface ====================

export interface ApiClient {
  get<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: RequestHeaders;
  auth?: AuthConfig;
}

// ==================== Test API Types ====================

// Import test-specific types from the type system
// Use the standard TestType from enums.ts
import { TestType as EnumTestType, TestTypeValue } from '../enums';

// Re-export for compatibility - use enum values as the canonical type
export type TestType = TestTypeValue | EnumTestType;
export { EnumTestType as TestTypeEnum };
export type TestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type NetworkCondition = 'fast-3g' | 'slow-3g' | '4g' | 'wifi' | 'offline' | 'no-throttling';

export interface BaseTestConfig {
  url: string;
  testType: TestType;
  timeout?: number;
  retries?: number;
  device?: DeviceType;
  networkCondition?: NetworkCondition;
  headers?: RequestHeaders;
}

// Extended test configuration for comprehensive testing
export interface TestConfig extends BaseTestConfig {
  name?: string;
  description?: string;
  options?: Record<string, unknown>;
  advanced?: {
    concurrent?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    screenshots?: boolean;
    video?: boolean;
  };
  notifications?: {
    onStart?: boolean;
    onComplete?: boolean;
    onError?: boolean;
  };
}

// Test result interface
export interface TestResult {
  id: UUID;
  testId: UUID;
  testType: TestType;
  status: TestStatus;
  score?: number;
  grade?: string;
  summary?: string;
  details?: Record<string, unknown>;
  metrics?: {
    duration: number;
    responseTime?: number;
    throughput?: number;
    errorRate?: number;
    [key: string]: unknown;
  };
  recommendations?: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action: string;
  }>;
  artifacts?: {
    screenshots?: string[];
    videos?: string[];
    reports?: string[];
    logs?: string[];
  };
  startTime: Timestamp;
  endTime?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TestStartRequest {
  url: string;
  testType: TestType;
  config?: BaseTestConfig;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export type TestStartResponse = ApiSuccessResponse<{
  testId: UUID;
  sessionId: UUID;
  status: TestStatus;
  estimatedDuration?: number;
}>;

export interface TestStatusRequest {
  testId: UUID;
  includeProgress?: boolean;
  includeMetrics?: boolean;
}

export type TestStatusResponse = ApiSuccessResponse<{
  testId: UUID;
  status: TestStatus;
  progress: number;
  currentStep?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  metrics?: Record<string, unknown>;
  error?: string;
}>;

export interface TestResultRequest {
  testId: UUID;
  format?: 'json' | 'summary' | 'detailed';
  includeRawData?: boolean;
}

export type TestResultResponse = ApiSuccessResponse<{
  testId: UUID;
  testType: TestType;
  status: TestStatus;
  result: Record<string, unknown>;
  summary?: string;
  score?: number;
  grade?: string;
  recommendations?: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    action: string;
  }>;
}>;

export interface TestCancelRequest {
  testId: UUID;
  reason?: string;
}

export type TestCancelResponse = ApiSuccessResponse<{
  testId: UUID;
  status: TestStatus;
  cancelled: boolean;
}>;

// ==================== Test History API Types ====================

export interface TestHistoryQuery extends PaginationParams {
  testType?: TestType | TestType[];
  status?: TestStatus | TestStatus[];
  dateFrom?: string;
  dateTo?: string;
  userId?: UUID;
  tags?: string[];
  scoreRange?: {
    min: number;
    max: number;
  };
}

export interface TestHistoryRecord {
  id: UUID;
  testName: string;
  testType: TestType;
  url: string;
  status: TestStatus;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  score?: number;
  grade?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: UUID;
  tags?: string[];
  environment?: string;
}

// ==================== Performance Test Types ====================

export interface PerformanceTestConfig extends BaseTestConfig {
  testType: 'performance';
  includeScreenshots?: boolean;
  lighthouseCategories?: string[];
  customMetrics?: string[];
}

// ==================== API Test Types ====================

export interface ApiTestConfig extends BaseTestConfig {
  testType: 'api';
  endpoints?: ApiEndpoint[];
  authentication?: AuthConfig;
}

export interface ApiEndpoint {
  name: string;
  method: HttpMethod;
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  expectedStatus?: number;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'value' | 'range' | 'pattern';
  expected?: unknown;
  message?: string;
}

// ==================== Security Test Types ====================

export interface SecurityTestConfig extends BaseTestConfig {
  testType: 'security';
  scanDepth?: 'basic' | 'standard' | 'comprehensive';
  securityChecks?: string[];
}

// ==================== Compatibility Test Types ====================

export interface CompatibilityTestConfig extends BaseTestConfig {
  testType: 'compatibility';
  browsers?: string[];
  devices?: DeviceType[];
}

// ==================== UX Test Types ====================

export interface UxTestConfig extends BaseTestConfig {
  testType: 'ux';
  userFlows?: UserFlow[];
  accessibilityChecks?: boolean;
}

export interface UserFlow {
  name: string;
  steps: UserAction[];
}

export interface UserAction {
  type: 'click' | 'type' | 'wait' | 'navigate' | 'scroll';
  selector?: string;
  value?: string;
  timeout?: number;
}

// ==================== Base Entity Types ====================

export interface BaseUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseTestSession {
  id: string;
  userId: string;
  testType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseSystemConfig {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details?: unknown;
  timestamp: string;
}

// ==================== Test Configuration ====================

export interface TestRunConfig {
  testType: TestType;
  target: string;
  options?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
}

export interface TestCallbacks {
  onProgress?: (progress: number, step?: string, metrics?: unknown) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: unknown) => void;
}

// ==================== Legacy Support Types ====================
// These types maintain backward compatibility

export type { ApiResponse as default } from './index';

// Alias for commonly used response types
export type SuccessResponse<T> = ApiSuccessResponse<T>;
export type ErrorResponse = ApiErrorResponse;
export type Response<T> = ApiResponse<T>;

// ==================== Type Guards ====================

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return response.success === false;
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

// ==================== Utility Types ====================

export type ApiMethod<T = unknown> = (config?: RequestConfig) => Promise<ApiResponse<T>>;
export type ApiMethodWithData<T = unknown, D = unknown> = (
  data: D,
  config?: RequestConfig
) => Promise<ApiResponse<T>>;

export interface ApiEndpoints {
  [key: string]: {
    [method in HttpMethod]?: ApiMethod | ApiMethodWithData;
  };
}
