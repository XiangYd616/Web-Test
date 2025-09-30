/**
 * API Types - Legacy File (Deprecated)
 * 
 * This file has been consolidated into types/api/index.ts
 * Please update your imports to use the new consolidated API types.
 * 
 * @deprecated Use types/api/index.ts instead
 * Version: v3.0.0
 */

// Re-export all types from the consolidated API types file
export * from './api';

// Maintain backward compatibility with old import paths
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiConfig,
  AuthConfig,
  HttpMethod,
  RequestHeaders,
  RequestConfig,
  ApiClient
} from './api';

