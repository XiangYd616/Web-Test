/**
 * 标准API响应构建工具 - JavaScript版本
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 * 
 * 提供统一的API响应构建方法，确保所有API响应格式一致
 */

const {
  StandardErrorCode,
  StandardStatusCodeMap,
  StandardErrorMessages
} = require('../types/standardApiResponse');

// ==================== 工具函数 ====================

/**
 * 生成请求ID
 * @returns {string}
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建标准元数据
 * @param {Object} options - 选项
 * @returns {Object}
 */
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

/**
 * 创建标准成功响应
 * @param {*} data - 响应数据
 * @param {string} [message] - 响应消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
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

/**
 * 创建标准创建成功响应 (201)
 * @param {*} data - 创建的数据
 * @param {string} [message] - 响应消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createCreatedResponse(data, message = '创建成功', options = {}) {
  return createSuccessResponse(data, message, options);
}

/**
 * 创建标准无内容响应 (204)
 * @param {string} [message] - 响应消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createNoContentResponse(message = '操作成功', options = {}) {
  return {
    success: true,
    message,
    meta: createStandardMeta(options)
  };
}

/**
 * 创建标准分页响应
 * @param {Array} data - 数据数组
 * @param {Object} pagination - 分页信息
 * @param {string} [message] - 响应消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
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

/**
 * 创建标准错误响应
 * @param {string} code - 错误代码
 * @param {string} [message] - 错误消息
 * @param {Object} [details] - 错误详情
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
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

/**
 * 创建验证错误响应
 * @param {Array} errors - 验证错误数组
 * @param {string} [message] - 错误消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createValidationErrorResponse(errors, message = '数据验证失败', options = {}) {
  return createErrorResponse(
    StandardErrorCode.VALIDATION_ERROR,
    message,
    { validationErrors: errors },
    options
  );
}

/**
 * 创建未授权错误响应
 * @param {string} [message] - 错误消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createUnauthorizedResponse(message = '未授权访问', options = {}) {
  return createErrorResponse(StandardErrorCode.UNAUTHORIZED, message, undefined, options);
}

/**
 * 创建禁止访问错误响应
 * @param {string} [message] - 错误消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createForbiddenResponse(message = '禁止访问', options = {}) {
  return createErrorResponse(StandardErrorCode.FORBIDDEN, message, undefined, options);
}

/**
 * 创建资源未找到错误响应
 * @param {string} [resource] - 资源名称
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createNotFoundResponse(resource = '资源', options = {}) {
  return createErrorResponse(
    StandardErrorCode.NOT_FOUND,
    `${resource}未找到`,
    undefined,
    options
  );
}

/**
 * 创建资源冲突错误响应
 * @param {string} [resource] - 资源名称
 * @param {string} [message] - 自定义消息
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createConflictResponse(resource = '资源', message, options = {}) {
  return createErrorResponse(
    StandardErrorCode.CONFLICT,
    message || `${resource}已存在`,
    undefined,
    options
  );
}

/**
 * 创建限流错误响应
 * @param {string} [message] - 错误消息
 * @param {number} [retryAfter] - 重试等待时间
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createRateLimitResponse(message = '请求过于频繁，请稍后重试', retryAfter, options = {}) {
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
 * @param {string} [message] - 错误消息
 * @param {Object} [details] - 错误详情
 * @param {Object} [options] - 选项
 * @returns {Object}
 */
function createInternalErrorResponse(message = '服务器内部错误', details, options = {}) {
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
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @returns {Object}
 */
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

/**
 * 获取错误代码对应的HTTP状态码
 * @param {string} errorCode - 错误代码
 * @returns {number}
 */
function getHttpStatusCode(errorCode) {
  return StandardStatusCodeMap[errorCode] || 500;
}

// ==================== 响应包装器 ====================

/**
 * 包装异步操作，自动处理错误响应
 * @param {Function} operation - 异步操作函数
 * @param {Object} [options] - 选项
 * @returns {Promise<Object>}
 */
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
