/**
 * 统一API响应格式标准 - JavaScript版本
 * 版本: v2.1.0 - 与TypeScript版本同步
 * 创建时间: 2025-08-16
 * 更新时间: 2024-09-29
 * 
 * 此文件定义了项目中所有API接口必须遵循的统一响应格式
 * 确保前后端API响应格式完全一致
 * 
 * 注意: 此文件与standardApiTypes.ts保持同步
 */

// ==================== 错误代码枚举 ====================

const StandardErrorCode = {
  // 通用错误 (1000-1099)
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 验证错误 (1100-1199)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 认证和授权错误 (1200-1299)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 资源错误 (1300-1399)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  CONFLICT: 'CONFLICT',

  // 业务逻辑错误 (1400-1499)
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // 网络和外部服务错误 (1500-1599)
  NETWORK_ERROR: 'NETWORK_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // 限流和配额错误 (1600-1699)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // 测试相关错误 (1700-1799)
  TEST_EXECUTION_ERROR: 'TEST_EXECUTION_ERROR',
  TEST_CONFIGURATION_ERROR: 'TEST_CONFIGURATION_ERROR',
  TEST_TIMEOUT: 'TEST_TIMEOUT',
  TEST_NOT_FOUND: 'TEST_NOT_FOUND',
  TEST_ALREADY_RUNNING: 'TEST_ALREADY_RUNNING'
};

// ==================== HTTP状态码映射 ====================

const StandardStatusCodeMap = {
  [StandardErrorCode.UNKNOWN_ERROR]: 500,
  [StandardErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [StandardErrorCode.SERVICE_UNAVAILABLE]: 503,

  [StandardErrorCode.VALIDATION_ERROR]: 400,
  [StandardErrorCode.INVALID_INPUT]: 400,
  [StandardErrorCode.MISSING_REQUIRED_FIELD]: 400,

  [StandardErrorCode.UNAUTHORIZED]: 401,
  [StandardErrorCode.FORBIDDEN]: 403,
  [StandardErrorCode.TOKEN_EXPIRED]: 401,
  [StandardErrorCode.INVALID_TOKEN]: 401,
  [StandardErrorCode.INVALID_CREDENTIALS]: 401,

  [StandardErrorCode.NOT_FOUND]: 404,
  [StandardErrorCode.RESOURCE_NOT_FOUND]: 404,
  [StandardErrorCode.DUPLICATE_RESOURCE]: 409,
  [StandardErrorCode.CONFLICT]: 409,

  [StandardErrorCode.BUSINESS_LOGIC_ERROR]: 422,
  [StandardErrorCode.OPERATION_NOT_ALLOWED]: 403,

  [StandardErrorCode.NETWORK_ERROR]: 502,
  [StandardErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [StandardErrorCode.TIMEOUT_ERROR]: 504,

  [StandardErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [StandardErrorCode.QUOTA_EXCEEDED]: 429,
  [StandardErrorCode.TOO_MANY_REQUESTS]: 429,

  [StandardErrorCode.TEST_EXECUTION_ERROR]: 422,
  [StandardErrorCode.TEST_CONFIGURATION_ERROR]: 400,
  [StandardErrorCode.TEST_TIMEOUT]: 408,
  [StandardErrorCode.TEST_NOT_FOUND]: 404,
  [StandardErrorCode.TEST_ALREADY_RUNNING]: 409
};

// ==================== 错误消息映射 ====================

const StandardErrorMessages = {
  [StandardErrorCode.UNKNOWN_ERROR]: '未知错误',
  [StandardErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [StandardErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',

  [StandardErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [StandardErrorCode.INVALID_INPUT]: '输入数据无效',
  [StandardErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',

  [StandardErrorCode.UNAUTHORIZED]: '未授权访问',
  [StandardErrorCode.FORBIDDEN]: '禁止访问',
  [StandardErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [StandardErrorCode.INVALID_TOKEN]: '无效令牌',
  [StandardErrorCode.INVALID_CREDENTIALS]: '凭据无效',

  [StandardErrorCode.NOT_FOUND]: '资源未找到',
  [StandardErrorCode.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [StandardErrorCode.DUPLICATE_RESOURCE]: '资源已存在',
  [StandardErrorCode.CONFLICT]: '资源冲突',

  [StandardErrorCode.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [StandardErrorCode.OPERATION_NOT_ALLOWED]: '操作不被允许',

  [StandardErrorCode.NETWORK_ERROR]: '网络连接错误',
  [StandardErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [StandardErrorCode.TIMEOUT_ERROR]: '请求超时',

  [StandardErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
  [StandardErrorCode.QUOTA_EXCEEDED]: '配额已用完',
  [StandardErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',

  [StandardErrorCode.TEST_EXECUTION_ERROR]: '测试执行失败',
  [StandardErrorCode.TEST_CONFIGURATION_ERROR]: '测试配置错误',
  [StandardErrorCode.TEST_TIMEOUT]: '测试执行超时',
  [StandardErrorCode.TEST_NOT_FOUND]: '测试不存在',
  [StandardErrorCode.TEST_ALREADY_RUNNING]: '测试已在运行中'
};

// ==================== 类型守卫函数 ====================

/**
 * 检查是否为成功响应
 * @param {Object} response - API响应对象
 * @returns {boolean}
 */
function isStandardApiSuccessResponse(response) {
  return response && response.success === true;
}

/**
 * 检查是否为错误响应
 * @param {Object} response - API响应对象
 * @returns {boolean}
 */
function isStandardApiErrorResponse(response) {
  return response && response.success === false;
}

// ==================== 响应验证函数 ====================

/**
 * 验证成功响应格式
 * @param {Object} response - 响应对象
 * @returns {boolean}
 */
function validateSuccessResponse(response) {
  return (
    typeof response === 'object' &&
    response !== null &&
    response.success === true &&
    'data' in response &&
    'meta' in response &&
    typeof response.meta === 'object' &&
    typeof response.meta.timestamp === 'string' &&
    typeof response.meta.requestId === 'string'
  );
}

/**
 * 验证错误响应格式
 * @param {Object} response - 响应对象
 * @returns {boolean}
 */
function validateErrorResponse(response) {
  return (
    typeof response === 'object' &&
    response !== null &&
    response.success === false &&
    'error' in response &&
    typeof response.error === 'object' &&
    typeof response.error.code === 'string' &&
    typeof response.error.message === 'string' &&
    'meta' in response &&
    typeof response.meta === 'object' &&
    typeof response.meta.timestamp === 'string' &&
    typeof response.meta.requestId === 'string'
  );
}

/**
 * 验证分页元数据格式
 * @param {Object} pagination - 分页对象
 * @returns {boolean}
 */
function validatePaginationMeta(pagination) {
  return (
    typeof pagination === 'object' &&
    pagination !== null &&
    typeof pagination.page === 'number' &&
    typeof pagination.limit === 'number' &&
    typeof pagination.total === 'number' &&
    typeof pagination.totalPages === 'number' &&
    typeof pagination.hasNext === 'boolean' &&
    typeof pagination.hasPrev === 'boolean'
  );
}

// ==================== 工具函数 ====================

/**
 * 生成请求ID
 * @returns {string}
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 生成时间戳
 * @returns {string}
 */
function generateTimestamp() {
  return new Date().toISOString();
}

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {Object} meta - 元数据
 * @returns {Object}
 */
function createSuccessResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      requestId: generateRequestId(),
      timestamp: generateTimestamp(),
      ...meta
    }
  };
}

/**
 * 创建错误响应
 * @param {string} code - 错误代码
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @param {Object} meta - 元数据
 * @returns {Object}
 */
function createErrorResponse(code, message, details = null, meta = {}) {
  return {
    success: false,
    error: {
      code,
      message: message || StandardErrorMessages[code] || '未知错误',
      details
    },
    meta: {
      requestId: generateRequestId(),
      timestamp: generateTimestamp(),
      ...meta
    }
  };
}

/**
 * 创建分页响应
 * @param {Array} data - 数据列表
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @param {Object} meta - 额外元数据
 * @returns {Object}
 */
function createPaginatedResponse(data, page, limit, total, meta = {}) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    },
    meta: {
      requestId: generateRequestId(),
      timestamp: generateTimestamp(),
      ...meta
    }
  };
}

// ==================== 测试相关类型定义 ====================

/**
 * 测试类型枚举
 */
const TestType = {
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  SEO: 'seo',
  API: 'api',
  STRESS: 'stress',
  COMPATIBILITY: 'compatibility',
  ACCESSIBILITY: 'accessibility',
  UX: 'ux',
  NETWORK: 'network',
  DATABASE: 'database'
};

/**
 * 测试状态枚举
 */
const TestStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// ==================== 导出 ====================

module.exports = {
  // 枚举和常量
  StandardErrorCode,
  StandardStatusCodeMap,
  StandardErrorMessages,
  
  // 测试相关枚举
  TestType,
  TestStatus,

  // 类型守卫函数
  isStandardApiSuccessResponse,
  isStandardApiErrorResponse,

  // 验证函数
  validateSuccessResponse,
  validateErrorResponse,
  validatePaginationMeta,
  
  // 工具函数
  generateRequestId,
  generateTimestamp,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,

  // 向后兼容的别名
  ErrorCode: StandardErrorCode,
  StatusCodeMap: StandardStatusCodeMap,
  ErrorMessages: StandardErrorMessages,
  isApiSuccessResponse: isStandardApiSuccessResponse,
  isApiErrorResponse: isStandardApiErrorResponse
};
