/**
 * API响应类型定义和工具函数
 * 统一的API响应格式标准
 */

/**
 * 标准API响应格式
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 请求是否成功
 * @property {string} [message] - 响应消息
 * @property {*} [data] - 响应数据
 * @property {ApiError} [error] - 错误信息
 * @property {ApiMeta} [meta] - 元数据信息
 */

/**
 * API错误信息
 * @typedef {Object} ApiError
 * @property {string} code - 错误代码
 * @property {string} message - 错误消息
 * @property {*} [details] - 错误详情
 * @property {string} [field] - 相关字段（验证错误时使用）
 * @property {boolean} [retryable] - 是否可重试
 * @property {string[]} [suggestions] - 错误建议
 */

/**
 * API元数据信息
 * @typedef {Object} ApiMeta
 * @property {string} timestamp - 响应时间戳
 * @property {string} requestId - 请求ID
 * @property {string} version - API版本
 * @property {number} [duration] - 请求处理时长（毫秒）
 * @property {ApiPagination} [pagination] - 分页信息
 * @property {number} [total] - 总数量
 * @property {Object} [debug] - 调试信息（仅开发环境）
 */

/**
 * 分页信息
 * @typedef {Object} ApiPagination
 * @property {number} page - 当前页码
 * @property {number} limit - 每页数量
 * @property {number} total - 总记录数
 * @property {number} totalPages - 总页数
 * @property {boolean} hasNext - 是否有下一页
 * @property {boolean} hasPrev - 是否有上一页
 */

/**
 * 标准错误代码定义
 */
const ErrorCodes = {
    // 通用错误 (1000-1999)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INVALID_REQUEST: 'INVALID_REQUEST',
    INVALID_PARAMETER: 'INVALID_PARAMETER',
    MISSING_PARAMETER: 'MISSING_PARAMETER',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',

    // 认证和授权错误 (2000-2999)
    UNAUTHORIZED: 'UNAUTHORIZED',
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_INACTIVE: 'USER_INACTIVE',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

    // 数据验证错误 (3000-3999)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_URL: 'INVALID_URL',
    INVALID_DATE: 'INVALID_DATE',
    VALUE_TOO_LONG: 'VALUE_TOO_LONG',
    VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
    VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',

    // 资源错误 (4000-4999)
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    RESOURCE_LOCKED: 'RESOURCE_LOCKED',
    RESOURCE_EXPIRED: 'RESOURCE_EXPIRED',

    // 数据库错误 (5000-5999)
    DATABASE_ERROR: 'DATABASE_ERROR',
    DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    FOREIGN_KEY_CONSTRAINT: 'FOREIGN_KEY_CONSTRAINT',
    NOT_NULL_CONSTRAINT: 'NOT_NULL_CONSTRAINT',

    // 文件操作错误 (6000-6999)
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    FILE_PROCESSING_ERROR: 'FILE_PROCESSING_ERROR',

    // 测试相关错误 (7000-7999)
    TEST_CONFIGURATION_ERROR: 'TEST_CONFIGURATION_ERROR',
    TEST_EXECUTION_ERROR: 'TEST_EXECUTION_ERROR',
    TEST_TIMEOUT: 'TEST_TIMEOUT',
    TEST_CANCELLED: 'TEST_CANCELLED',
    TEST_ENGINE_UNAVAILABLE: 'TEST_ENGINE_UNAVAILABLE',
    INVALID_TEST_TYPE: 'INVALID_TEST_TYPE',

    // 监控相关错误 (8000-8999)
    MONITORING_ERROR: 'MONITORING_ERROR',
    ALERT_CONFIGURATION_ERROR: 'ALERT_CONFIGURATION_ERROR',
    NOTIFICATION_ERROR: 'NOTIFICATION_ERROR',

    // 集成相关错误 (9000-9999)
    INTEGRATION_ERROR: 'INTEGRATION_ERROR',
    WEBHOOK_ERROR: 'WEBHOOK_ERROR',
    THIRD_PARTY_SERVICE_ERROR: 'THIRD_PARTY_SERVICE_ERROR'
};

/**
 * HTTP状态码映射
 */
const StatusCodeMap = {
    [ErrorCodes.INTERNAL_ERROR]: 500,
    [ErrorCodes.INVALID_REQUEST]: 400,
    [ErrorCodes.INVALID_PARAMETER]: 400,
    [ErrorCodes.MISSING_PARAMETER]: 400,
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
    [ErrorCodes.TIMEOUT]: 408,

    [ErrorCodes.UNAUTHORIZED]: 401,
    [ErrorCodes.TOKEN_MISSING]: 401,
    [ErrorCodes.TOKEN_INVALID]: 401,
    [ErrorCodes.TOKEN_EXPIRED]: 401,
    [ErrorCodes.FORBIDDEN]: 403,
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCodes.USER_NOT_FOUND]: 404,
    [ErrorCodes.USER_INACTIVE]: 403,
    [ErrorCodes.INVALID_CREDENTIALS]: 401,

    [ErrorCodes.VALIDATION_ERROR]: 400,
    [ErrorCodes.INVALID_FORMAT]: 400,
    [ErrorCodes.INVALID_EMAIL]: 400,
    [ErrorCodes.INVALID_URL]: 400,
    [ErrorCodes.INVALID_DATE]: 400,
    [ErrorCodes.VALUE_TOO_LONG]: 400,
    [ErrorCodes.VALUE_TOO_SHORT]: 400,
    [ErrorCodes.VALUE_OUT_OF_RANGE]: 400,

    [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
    [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
    [ErrorCodes.RESOURCE_CONFLICT]: 409,
    [ErrorCodes.RESOURCE_LOCKED]: 423,
    [ErrorCodes.RESOURCE_EXPIRED]: 410,

    [ErrorCodes.DATABASE_ERROR]: 500,
    [ErrorCodes.DATABASE_CONNECTION_ERROR]: 503,
    [ErrorCodes.DUPLICATE_ENTRY]: 409,
    [ErrorCodes.FOREIGN_KEY_CONSTRAINT]: 400,
    [ErrorCodes.NOT_NULL_CONSTRAINT]: 400,

    [ErrorCodes.FILE_NOT_FOUND]: 404,
    [ErrorCodes.FILE_TOO_LARGE]: 413,
    [ErrorCodes.INVALID_FILE_TYPE]: 400,
    [ErrorCodes.FILE_UPLOAD_ERROR]: 500,
    [ErrorCodes.FILE_PROCESSING_ERROR]: 500,

    [ErrorCodes.TEST_CONFIGURATION_ERROR]: 400,
    [ErrorCodes.TEST_EXECUTION_ERROR]: 500,
    [ErrorCodes.TEST_TIMEOUT]: 408,
    [ErrorCodes.TEST_CANCELLED]: 409,
    [ErrorCodes.TEST_ENGINE_UNAVAILABLE]: 503,
    [ErrorCodes.INVALID_TEST_TYPE]: 400,

    [ErrorCodes.MONITORING_ERROR]: 500,
    [ErrorCodes.ALERT_CONFIGURATION_ERROR]: 400,
    [ErrorCodes.NOTIFICATION_ERROR]: 500,

    [ErrorCodes.INTEGRATION_ERROR]: 500,
    [ErrorCodes.WEBHOOK_ERROR]: 500,
    [ErrorCodes.THIRD_PARTY_SERVICE_ERROR]: 502
};

/**
 * 错误消息映射（中文）
 */
const ErrorMessages = {
    [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
    [ErrorCodes.INVALID_REQUEST]: '请求格式无效',
    [ErrorCodes.INVALID_PARAMETER]: '参数无效',
    [ErrorCodes.MISSING_PARAMETER]: '缺少必需参数',
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
    [ErrorCodes.SERVICE_UNAVAILABLE]: '服务暂时不可用',
    [ErrorCodes.TIMEOUT]: '请求超时',

    [ErrorCodes.UNAUTHORIZED]: '未授权访问',
    [ErrorCodes.TOKEN_MISSING]: '缺少访问令牌',
    [ErrorCodes.TOKEN_INVALID]: '访问令牌无效',
    [ErrorCodes.TOKEN_EXPIRED]: '访问令牌已过期',
    [ErrorCodes.FORBIDDEN]: '访问被禁止',
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: '权限不足',
    [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
    [ErrorCodes.USER_INACTIVE]: '用户账户已禁用',
    [ErrorCodes.INVALID_CREDENTIALS]: '用户名或密码错误',

    [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
    [ErrorCodes.INVALID_FORMAT]: '数据格式无效',
    [ErrorCodes.INVALID_EMAIL]: '邮箱格式无效',
    [ErrorCodes.INVALID_URL]: 'URL格式无效',
    [ErrorCodes.INVALID_DATE]: '日期格式无效',
    [ErrorCodes.VALUE_TOO_LONG]: '值过长',
    [ErrorCodes.VALUE_TOO_SHORT]: '值过短',
    [ErrorCodes.VALUE_OUT_OF_RANGE]: '值超出范围',

    [ErrorCodes.RESOURCE_NOT_FOUND]: '资源不存在',
    [ErrorCodes.RESOURCE_ALREADY_EXISTS]: '资源已存在',
    [ErrorCodes.RESOURCE_CONFLICT]: '资源冲突',
    [ErrorCodes.RESOURCE_LOCKED]: '资源被锁定',
    [ErrorCodes.RESOURCE_EXPIRED]: '资源已过期',

    [ErrorCodes.DATABASE_ERROR]: '数据库操作失败',
    [ErrorCodes.DATABASE_CONNECTION_ERROR]: '数据库连接失败',
    [ErrorCodes.DUPLICATE_ENTRY]: '数据重复',
    [ErrorCodes.FOREIGN_KEY_CONSTRAINT]: '关联数据不存在',
    [ErrorCodes.NOT_NULL_CONSTRAINT]: '必填字段不能为空',

    [ErrorCodes.FILE_NOT_FOUND]: '文件不存在',
    [ErrorCodes.FILE_TOO_LARGE]: '文件过大',
    [ErrorCodes.INVALID_FILE_TYPE]: '文件类型不支持',
    [ErrorCodes.FILE_UPLOAD_ERROR]: '文件上传失败',
    [ErrorCodes.FILE_PROCESSING_ERROR]: '文件处理失败',

    [ErrorCodes.TEST_CONFIGURATION_ERROR]: '测试配置错误',
    [ErrorCodes.TEST_EXECUTION_ERROR]: '测试执行失败',
    [ErrorCodes.TEST_TIMEOUT]: '测试超时',
    [ErrorCodes.TEST_CANCELLED]: '测试已取消',
    [ErrorCodes.TEST_ENGINE_UNAVAILABLE]: '测试引擎不可用',
    [ErrorCodes.INVALID_TEST_TYPE]: '测试类型无效',

    [ErrorCodes.MONITORING_ERROR]: '监控系统错误',
    [ErrorCodes.ALERT_CONFIGURATION_ERROR]: '告警配置错误',
    [ErrorCodes.NOTIFICATION_ERROR]: '通知发送失败',

    [ErrorCodes.INTEGRATION_ERROR]: '集成服务错误',
    [ErrorCodes.WEBHOOK_ERROR]: 'Webhook调用失败',
    [ErrorCodes.THIRD_PARTY_SERVICE_ERROR]: '第三方服务错误'
};

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {string} [message] - 响应消息
 * @param {Object} [meta] - 元数据
 * @returns {ApiResponse} 标准化的成功响应
 */
const createSuccessResponse = (data = null, message = null, meta = {}) => {
    const response = {
        success: true,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: meta.requestId || generateRequestId(),
            version: meta.version || process.env.API_VERSION || '1.0.0',
            ...meta
        }
    };

    if (message) {
        response.message = message;
    }

    if (data !== null) {
        response.data = data;
    }

    return response;
};

/**
 * 创建错误响应
 * @param {string} code - 错误代码
 * @param {string} [message] - 自定义错误消息
 * @param {*} [details] - 错误详情
 * @param {Object} [meta] - 元数据
 * @returns {ApiResponse} 标准化的错误响应
 */
const createErrorResponse = (code, message = null, details = null, meta = {}) => {
    const errorMessage = message || ErrorMessages[code] || '未知错误';

    const response = {
        success: false,
        error: {
            code,
            message: errorMessage,
            retryable: isRetryableError(code)
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: meta.requestId || generateRequestId(),
            version: meta.version || process.env.API_VERSION || '1.0.0',
            ...meta
        }
    };

    if (details) {
        response.error.details = details;
    }

    // 添加错误建议
    const suggestions = getErrorSuggestions(code);
    if (suggestions.length > 0) {
        response.error.suggestions = suggestions;
    }

    return response;
};

/**
 * 创建分页响应
 * @param {Array} data - 数据数组
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @param {number} total - 总记录数
 * @param {string} [message] - 响应消息
 * @param {Object} [meta] - 额外元数据
 * @returns {ApiResponse} 带分页信息的响应
 */
const createPaginatedResponse = (data, page, limit, total, message = null, meta = {}) => {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext,
        hasPrev
    };

    return createSuccessResponse(data, message, {
        ...meta,
        pagination,
        total
    });
};

/**
 * 判断错误是否可重试
 * @param {string} code - 错误代码
 * @returns {boolean} 是否可重试
 */
const isRetryableError = (code) => {
    const retryableErrors = [
        ErrorCodes.TIMEOUT,
        ErrorCodes.SERVICE_UNAVAILABLE,
        ErrorCodes.DATABASE_CONNECTION_ERROR,
        ErrorCodes.THIRD_PARTY_SERVICE_ERROR,
        ErrorCodes.INTERNAL_ERROR
    ];

    return retryableErrors.includes(code);
};

/**
 * 获取错误建议
 * @param {string} code - 错误代码
 * @returns {string[]} 错误建议数组
 */
const getErrorSuggestions = (code) => {
    const suggestions = {
        [ErrorCodes.TOKEN_EXPIRED]: ['请重新登录获取新的访问令牌'],
        [ErrorCodes.TOKEN_INVALID]: ['请检查令牌格式是否正确', '请重新登录'],
        [ErrorCodes.RATE_LIMIT_EXCEEDED]: ['请稍后再试', '考虑减少请求频率'],
        [ErrorCodes.VALIDATION_ERROR]: ['请检查输入数据格式', '确保所有必填字段都已填写'],
        [ErrorCodes.INVALID_URL]: ['请检查URL格式是否正确', '确保URL包含协议（http://或https://）'],
        [ErrorCodes.FILE_TOO_LARGE]: ['请压缩文件后重试', '选择较小的文件'],
        [ErrorCodes.TEST_ENGINE_UNAVAILABLE]: ['请稍后重试', '联系管理员检查测试引擎状态'],
        [ErrorCodes.DATABASE_CONNECTION_ERROR]: ['请稍后重试', '如问题持续存在，请联系技术支持']
    };

    return suggestions[code] || [];
};

/**
 * 生成请求ID
 * @returns {string} 唯一的请求ID
 */
const generateRequestId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
};

/**
 * 获取HTTP状态码
 * @param {string} code - 错误代码
 * @returns {number} HTTP状态码
 */
const getStatusCode = (code) => {
    return StatusCodeMap[code] || 500;
};

module.exports = {
    ErrorCodes,
    StatusCodeMap,
    ErrorMessages,
    createSuccessResponse,
    createErrorResponse,
    createPaginatedResponse,
    isRetryableError,
    getErrorSuggestions,
    generateRequestId,
    getStatusCode
};