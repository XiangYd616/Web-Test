/**
 * 标准API响应构建工具
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 * 
 * 提供统一的API响应构建方法，确保所有API响应格式一致
 */

import {
  PaginationMeta,
  ResponseBuilderOptions,
  StandardApiError,
  StandardApiErrorResponse,
  StandardApiMeta,
  StandardApiResponse,
  StandardApiSuccessResponse,
  StandardCreatedResponse,
  StandardErrorCode,
  StandardErrorMessages,
  StandardNoContentResponse,
  StandardPaginatedResponse,
  StandardStatusCodeMap
} from '../types/standardApiResponse';

// ==================== 工具函数 ====================

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建标准元数据
 */
export function createStandardMeta(options: ResponseBuilderOptions = {}): StandardApiMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId: options.requestId || generateRequestId(),
    ...(options.duration !== undefined && { duration: options.duration }),
    ...(options.path && { path: options.path }),
    ...(options.method && { method: options.method }),
    ...(options.version && { version: options.version }),
    ...options.meta
  };
}

// ==================== 成功响应构建器 ====================

/**
 * 创建标准成功响应
 */
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  options: ResponseBuilderOptions = {}
): StandardApiSuccessResponse<T> {
  const response: StandardApiSuccessResponse<T> = {
    success: true,
    data,
    meta: createStandardMeta(options)
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * 创建标准创建成功响应 (201)
 */
export function createCreatedResponse<T = any>(
  data: T,
  message: string = '创建成功',
  options: ResponseBuilderOptions = {}
): StandardCreatedResponse<T> {
  return createSuccessResponse(data, message, options);
}

/**
 * 创建标准无内容响应 (204)
 */
export function createNoContentResponse(
  message: string = '操作成功',
  options: ResponseBuilderOptions = {}
): StandardNoContentResponse {
  return {
    success: true,
    message,
    meta: createStandardMeta(options)
  };
}

/**
 * 创建标准分页响应
 */
export function createPaginatedResponse<T = any>(
  data: T[],
  pagination: PaginationMeta,
  message?: string,
  options: ResponseBuilderOptions = {}
): StandardPaginatedResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    meta: {
      ...createStandardMeta(options),
      pagination
    }
  };
}

// ==================== 错误响应构建器 ====================

/**
 * 创建标准错误响应
 */
export function createErrorResponse(
  code: StandardErrorCode | string,
  message?: string,
  details?: Record<string, any>,
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  const error: StandardApiError = {
    code,
    message: message || StandardErrorMessages[code as StandardErrorCode] || '未知错误'
  };

  if (details) {
    error.details = details;
  }

  return {
    success: false,
    error,
    message: error.message,
    meta: createStandardMeta(options)
  };
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  errors: Array<{ field: string; message: string; code?: string; value?: any }>,
  message: string = '数据验证失败',
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(
    StandardErrorCode.VALIDATION_ERROR,
    message,
    { validationErrors: errors },
    options
  );
}

/**
 * 创建未授权错误响应
 */
export function createUnauthorizedResponse(
  message: string = '未授权访问',
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(StandardErrorCode.UNAUTHORIZED, message, undefined, options);
}

/**
 * 创建禁止访问错误响应
 */
export function createForbiddenResponse(
  message: string = '禁止访问',
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(StandardErrorCode.FORBIDDEN, message, undefined, options);
}

/**
 * 创建资源未找到错误响应
 */
export function createNotFoundResponse(
  resource: string = '资源',
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(
    StandardErrorCode.NOT_FOUND,
    `${resource}未找到`,
    undefined,
    options
  );
}

/**
 * 创建资源冲突错误响应
 */
export function createConflictResponse(
  resource: string = '资源',
  message?: string,
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(
    StandardErrorCode.CONFLICT,
    message || `${resource}已存在`,
    undefined,
    options
  );
}

/**
 * 创建限流错误响应
 */
export function createRateLimitResponse(
  message: string = '请求过于频繁，请稍后重试',
  retryAfter?: number,
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  const details = retryAfter ? { retryAfter } : undefined;
  return createErrorResponse(
    StandardErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    details,
    options
  );
}

/**
 * 创建服务器内部错误响应
 */
export function createInternalErrorResponse(
  message: string = '服务器内部错误',
  details?: Record<string, any>,
  options: ResponseBuilderOptions = {}
): StandardApiErrorResponse {
  return createErrorResponse(
    StandardErrorCode.INTERNAL_SERVER_ERROR,
    message,
    details,
    options
  );
}

// ==================== 分页工具函数 ====================

/**
 * 创建分页元数据
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
}

// ==================== HTTP状态码工具 ====================

/**
 * 获取错误代码对应的HTTP状态码
 */
export function getHttpStatusCode(errorCode: StandardErrorCode | string): number {
  return StandardStatusCodeMap[errorCode as StandardErrorCode] || 500;
}

// ==================== 响应包装器 ====================

/**
 * 包装异步操作，自动处理错误响应
 */
export async function wrapAsyncOperation<T>(
  operation: () => Promise<T>,
  options: ResponseBuilderOptions = {}
): Promise<StandardApiResponse<T>> {
  try {
    const result = await operation();
    return createSuccessResponse(result, undefined, options);
  } catch (error) {
    console.error('异步操作失败:', error);

    if (error instanceof Error) {
      return createErrorResponse(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        error.message,
        { stack: error.stack },
        options
      );
    }

    return createErrorResponse(
      StandardErrorCode.UNKNOWN_ERROR,
      '未知错误',
      { error: String(error) },
      options
    );
  }
}

// ==================== 导出所有函数 ====================

export const ApiResponseBuilder = {
  // 成功响应
  success: createSuccessResponse,
  created: createCreatedResponse,
  noContent: createNoContentResponse,
  paginated: createPaginatedResponse,

  // 错误响应
  error: createErrorResponse,
  validationError: createValidationErrorResponse,
  unauthorized: createUnauthorizedResponse,
  forbidden: createForbiddenResponse,
  notFound: createNotFoundResponse,
  conflict: createConflictResponse,
  rateLimit: createRateLimitResponse,
  internalError: createInternalErrorResponse,

  // 工具函数
  generateRequestId,
  createMeta: createStandardMeta,
  createPagination: createPaginationMeta,
  getStatusCode: getHttpStatusCode,
  wrapAsync: wrapAsyncOperation
};

export default ApiResponseBuilder;

// ==================== CommonJS导出 (用于Node.js后端) ====================

// 如果在Node.js环境中，也提供CommonJS导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 成功响应
    createSuccessResponse,
    createCreatedResponse,
    createNoContentResponse,
    createPaginatedResponse,

    // 错误响应
    createErrorResponse,
    createValidationErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
    createNotFoundResponse,
    createConflictResponse,
    createRateLimitResponse,
    createInternalErrorResponse,

    // 工具函数
    generateRequestId,
    createStandardMeta,
    createPaginationMeta,
    getHttpStatusCode,
    wrapAsyncOperation,

    // 主要导出对象
    ApiResponseBuilder,

    // 默认导出
    default: ApiResponseBuilder
  };
}
