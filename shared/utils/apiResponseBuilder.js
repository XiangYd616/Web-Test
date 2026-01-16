/**
 * 标准API响应构建工具 - JavaScript版本
 * 版本: v2.0.0 (与TypeScript版本保持一致)
 */

const {
  StandardErrorCode,
  StandardErrorMessages,
  StandardStatusCodeMap
} = require('../types/standardApiResponse.js');

// ==================== 工具函数 ====================

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createStandardMeta(options = {}) {
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

function createSuccessResponse(data, message, options = {}) {
  const response = {
    success: true,
    data,
    meta: createStandardMeta(options)
  };

  if (message) {
    response.message = message;
  }

  return response;
}

function createCreatedResponse(data, message = '创建成功', options = {}) {
  return createSuccessResponse(data, message, options);
}

function createNoContentResponse(message = '操作成功', options = {}) {
  return {
    success: true,
    message,
    meta: createStandardMeta(options)
  };
}

function createPaginatedResponse(data, pagination, message, options = {}) {
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

function createErrorResponse(code, message, details, options = {}) {
  const error = {
    code,
    message: message || StandardErrorMessages[code] || '未知错误'
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

function createValidationErrorResponse(errors, message = '数据验证失败', options = {}) {
  return createErrorResponse(
    StandardErrorCode.VALIDATION_ERROR,
    message,
    { validationErrors: errors },
    options
  );
}

function createUnauthorizedResponse(message = '未授权访问', options = {}) {
  return createErrorResponse(StandardErrorCode.UNAUTHORIZED, message, undefined, options);
}

function createForbiddenResponse(message = '禁止访问', options = {}) {
  return createErrorResponse(StandardErrorCode.FORBIDDEN, message, undefined, options);
}

function createNotFoundResponse(resource = '资源', options = {}) {
  return createErrorResponse(
    StandardErrorCode.NOT_FOUND,
    `${resource}未找到`,
    undefined,
    options
  );
}

function createConflictResponse(resource = '资源', message, options = {}) {
  return createErrorResponse(
    StandardErrorCode.CONFLICT,
    message || `${resource}已存在`,
    undefined,
    options
  );
}

function createRateLimitResponse(message = '请求过于频繁，请稍后重试', retryAfter, options = {}) {
  const details = retryAfter ? { retryAfter } : undefined;
  return createErrorResponse(StandardErrorCode.RATE_LIMIT_EXCEEDED, message, details, options);
}

function createInternalErrorResponse(message = '服务器内部错误', details, options = {}) {
  return createErrorResponse(StandardErrorCode.INTERNAL_SERVER_ERROR, message, details, options);
}

// ==================== 分页工具函数 ====================

function createPaginationMeta(page, limit, total) {
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

function getHttpStatusCode(errorCode) {
  return StandardStatusCodeMap[errorCode] || 500;
}

// ==================== 响应包装器 ====================

async function wrapAsyncOperation(operation, options = {}) {
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

// ==================== 导出 ====================

const ApiResponseBuilder = {
  success: createSuccessResponse,
  created: createCreatedResponse,
  noContent: createNoContentResponse,
  paginated: createPaginatedResponse,
  error: createErrorResponse,
  validationError: createValidationErrorResponse,
  unauthorized: createUnauthorizedResponse,
  forbidden: createForbiddenResponse,
  notFound: createNotFoundResponse,
  conflict: createConflictResponse,
  rateLimit: createRateLimitResponse,
  internalError: createInternalErrorResponse,
  generateRequestId,
  createMeta: createStandardMeta,
  createPagination: createPaginationMeta,
  getStatusCode: getHttpStatusCode,
  wrapAsync: wrapAsyncOperation
};

module.exports = {
  createSuccessResponse,
  createCreatedResponse,
  createNoContentResponse,
  createPaginatedResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createRateLimitResponse,
  createInternalErrorResponse,
  generateRequestId,
  createStandardMeta,
  createPaginationMeta,
  getHttpStatusCode,
  wrapAsyncOperation,
  ApiResponseBuilder,
  default: ApiResponseBuilder
};
