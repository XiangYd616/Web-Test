/**
 * Shared Types - Re-export from types/api
 * This file serves as a bridge for @shared/types imports
 */

// Re-export all API types
export * from '../types/api';

// Explicitly export commonly used types for convenience
export type {
  ApiError,
  ApiErrorResponse,
  ApiRequestConfig,
  ApiResponse,
  ApiSuccessResponse,
  AuthConfig,
  BaseTestConfig,
  HttpMethod,
  PaginatedResponse,
  PaginationInfo,
  RequestConfig,
  RequestHeaders,
  TestConfig,
  TestResult,
  TestStatus,
  TestType,
  Timestamp,
  UUID,
  ValidationError,
} from '../types/api';

export type { QueryParams } from '../types/apiResponse.types';

export { ErrorCode, TestTypeEnum } from '../types/api';
