/**
 * API错误处理器
 * 版本: v2.0.0
 */

import { apiErrorHandler } from '../api/errorHandler';

export {
  ApiErrorHandler,
  apiErrorHandler,
  useErrorHandler,
  withErrorHandling,
} from '../api/errorHandler';

export type {
  ErrorContext,
  ErrorHandlerConfig,
  ErrorHandlingResult,
  RetryConfig,
} from '../api/errorHandler';

export const _errorHandler = apiErrorHandler;
