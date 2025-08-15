/**
 * API响应类型定义
 */

// 错误代码常量
const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // 认证和授权错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // 资源错误
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // 业务逻辑错误
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // 网络和外部服务错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // 数据库错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // 文件操作错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  
  // 测试相关错误
  TEST_EXECUTION_ERROR: 'TEST_EXECUTION_ERROR',
  TEST_CONFIGURATION_ERROR: 'TEST_CONFIGURATION_ERROR',
  TEST_TIMEOUT: 'TEST_TIMEOUT',
  
  // 限流和配额错误
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
};

// 错误消息映射
const ErrorMessages = {
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCodes.INVALID_INPUT]: '输入数据无效',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: '缺少必填字段',
  [ErrorCodes.UNAUTHORIZED]: '未授权访问',
  [ErrorCodes.FORBIDDEN]: '禁止访问',
  [ErrorCodes.TOKEN_EXPIRED]: '令牌已过期',
  [ErrorCodes.INVALID_TOKEN]: '无效令牌',
  [ErrorCodes.NOT_FOUND]: '资源未找到',
  [ErrorCodes.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [ErrorCodes.DUPLICATE_RESOURCE]: '资源已存在',
  [ErrorCodes.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [ErrorCodes.OPERATION_NOT_ALLOWED]: '操作不被允许',
  [ErrorCodes.NETWORK_ERROR]: '网络连接错误',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCodes.TIMEOUT_ERROR]: '请求超时',
  [ErrorCodes.DATABASE_ERROR]: '数据库操作错误',
  [ErrorCodes.CONNECTION_ERROR]: '连接错误',
  [ErrorCodes.FILE_NOT_FOUND]: '文件未找到',
  [ErrorCodes.FILE_UPLOAD_ERROR]: '文件上传失败',
  [ErrorCodes.FILE_SIZE_EXCEEDED]: '文件大小超出限制',
  [ErrorCodes.TEST_EXECUTION_ERROR]: '测试执行失败',
  [ErrorCodes.TEST_CONFIGURATION_ERROR]: '测试配置错误',
  [ErrorCodes.TEST_TIMEOUT]: '测试执行超时',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
  [ErrorCodes.QUOTA_EXCEEDED]: '配额已用完'
};

// HTTP状态码映射
const StatusCodeMap = {
  [ErrorCodes.UNKNOWN_ERROR]: 500,
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.DUPLICATE_RESOURCE]: 409,
  [ErrorCodes.BUSINESS_LOGIC_ERROR]: 422,
  [ErrorCodes.OPERATION_NOT_ALLOWED]: 403,
  [ErrorCodes.NETWORK_ERROR]: 502,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.TIMEOUT_ERROR]: 408,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CONNECTION_ERROR]: 503,
  [ErrorCodes.FILE_NOT_FOUND]: 404,
  [ErrorCodes.FILE_UPLOAD_ERROR]: 400,
  [ErrorCodes.FILE_SIZE_EXCEEDED]: 413,
  [ErrorCodes.TEST_EXECUTION_ERROR]: 500,
  [ErrorCodes.TEST_CONFIGURATION_ERROR]: 400,
  [ErrorCodes.TEST_TIMEOUT]: 408,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.QUOTA_EXCEEDED]: 429
};

/**
 * 根据错误代码获取HTTP状态码
 * @param {string} errorCode - 错误代码
 * @returns {number} HTTP状态码
 */
function getStatusCode(errorCode) {
  return StatusCodeMap[errorCode] || 500;
}

/**
 * 根据错误代码获取错误消息
 * @param {string} errorCode - 错误代码
 * @returns {string} 错误消息
 */
function getErrorMessage(errorCode) {
  return ErrorMessages[errorCode] || '未知错误';
}

/**
 * 创建标准API响应格式
 * @param {boolean} success - 是否成功
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @param {object} meta - 元数据
 * @returns {object} 标准响应格式
 */
function createApiResponse(success, data = null, message = null, meta = {}) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (success) {
    response.data = data;
    if (message) response.message = message;
  } else {
    response.error = data;
    response.message = message || '操作失败';
  }

  return response;
}

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 成功消息
 * @param {object} meta - 元数据
 * @returns {object} 成功响应
 */
function createSuccessResponse(data, message = '操作成功', meta = {}) {
  return createApiResponse(true, data, message, meta);
}

/**
 * 创建错误响应
 * @param {string} errorCode - 错误代码
 * @param {string} message - 错误消息
 * @param {any} details - 错误详情
 * @param {object} meta - 元数据
 * @returns {object} 错误响应
 */
function createErrorResponse(errorCode, message = null, details = null, meta = {}) {
  const errorData = {
    code: errorCode,
    message: message || getErrorMessage(errorCode)
  };

  if (details) {
    errorData.details = details;
  }

  return createApiResponse(false, errorData, errorData.message, meta);
}

/**
 * 创建分页响应
 * @param {Array} items - 数据项
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} limit - 每页数量
 * @param {string} message - 响应消息
 * @returns {object} 分页响应
 */
function createPaginatedResponse(items, total, page, limit, message = '获取成功') {
  const totalPages = Math.ceil(total / limit);
  
  return createSuccessResponse(items, message, {
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

module.exports = {
  ErrorCodes,
  ErrorMessages,
  StatusCodeMap,
  getStatusCode,
  getErrorMessage,
  createApiResponse,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse
};
