/**
 * Shared Types - Re-export from types/api
 * This file serves as a bridge for @shared/types imports
 */

// Re-export all API types
export * from '../types/api';

// Explicitly export commonly used types for convenience
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiError,
  ValidationError,
  RequestConfig,
  ApiRequestConfig,
  RequestHeaders,
  AuthConfig,
  QueryParams,
  PaginationInfo,
  PaginatedResponse,
  TestConfig,
  TestResult,
  TestStatus,
  TestType,
  BaseTestConfig,
  HttpMethod,
  Timestamp,
  UUID
} from '../types/api';

export { ErrorCode, TestTypeEnum } from '../types/api';

