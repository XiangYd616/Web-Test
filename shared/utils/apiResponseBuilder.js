"use strict";
/**
 * 标准API响应构建工具
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 提供统一的API响应构建方法，确保所有API响应格式一致
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseBuilder = void 0;
exports.generateRequestId = generateRequestId;
exports.createStandardMeta = createStandardMeta;
exports.createSuccessResponse = createSuccessResponse;
exports.createCreatedResponse = createCreatedResponse;
exports.createNoContentResponse = createNoContentResponse;
exports.createPaginatedResponse = createPaginatedResponse;
exports.createErrorResponse = createErrorResponse;
exports.createValidationErrorResponse = createValidationErrorResponse;
exports.createUnauthorizedResponse = createUnauthorizedResponse;
exports.createForbiddenResponse = createForbiddenResponse;
exports.createNotFoundResponse = createNotFoundResponse;
exports.createConflictResponse = createConflictResponse;
exports.createRateLimitResponse = createRateLimitResponse;
exports.createInternalErrorResponse = createInternalErrorResponse;
exports.createPaginationMeta = createPaginationMeta;
exports.getHttpStatusCode = getHttpStatusCode;
exports.wrapAsyncOperation = wrapAsyncOperation;
const standardApiResponse_1 = require("../types/standardApiResponse");
// ==================== 工具函数 ====================
/**
 * 生成请求ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * 创建标准元数据
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
 */
function createCreatedResponse(data, message = '创建成功', options = {}) {
    return createSuccessResponse(data, message, options);
}
/**
 * 创建标准无内容响应 (204)
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
 */
function createErrorResponse(code, message, details, options = {}) {
    const error = {
        code,
        message: message || standardApiResponse_1.StandardErrorMessages[code] || '未知错误'
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
function createValidationErrorResponse(errors, message = '数据验证失败', options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.VALIDATION_ERROR, message, { validationErrors: errors }, options);
}
/**
 * 创建未授权错误响应
 */
function createUnauthorizedResponse(message = '未授权访问', options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.UNAUTHORIZED, message, undefined, options);
}
/**
 * 创建禁止访问错误响应
 */
function createForbiddenResponse(message = '禁止访问', options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.FORBIDDEN, message, undefined, options);
}
/**
 * 创建资源未找到错误响应
 */
function createNotFoundResponse(resource = '资源', options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.NOT_FOUND, `${resource}未找到`, undefined, options);
}
/**
 * 创建资源冲突错误响应
 */
function createConflictResponse(resource = '资源', message, options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.CONFLICT, message || `${resource}已存在`, undefined, options);
}
/**
 * 创建限流错误响应
 */
function createRateLimitResponse(message = '请求过于频繁，请稍后重试', retryAfter, options = {}) {
    const details = retryAfter ? { retryAfter } : undefined;
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.RATE_LIMIT_EXCEEDED, message, details, options);
}
/**
 * 创建服务器内部错误响应
 */
function createInternalErrorResponse(message = '服务器内部错误', details, options = {}) {
    return createErrorResponse(standardApiResponse_1.StandardErrorCode.INTERNAL_SERVER_ERROR, message, details, options);
}
// ==================== 分页工具函数 ====================
/**
 * 创建分页元数据
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
 */
function getHttpStatusCode(errorCode) {
    return standardApiResponse_1.StandardStatusCodeMap[errorCode] || 500;
}
// ==================== 响应包装器 ====================
/**
 * 包装异步操作，自动处理错误响应
 */
async function wrapAsyncOperation(operation, options = {}) {
    try {
        const result = await operation();
        return createSuccessResponse(result, undefined, options);
    }
    catch (error) {
        console.error('异步操作失败:', error);
        if (error instanceof Error) {
            return createErrorResponse(standardApiResponse_1.StandardErrorCode.INTERNAL_SERVER_ERROR, error.message, { stack: error.stack }, options);
        }
        return createErrorResponse(standardApiResponse_1.StandardErrorCode.UNKNOWN_ERROR, '未知错误', { error: String(error) }, options);
    }
}
// ==================== 导出所有函数 ====================
exports.ApiResponseBuilder = {
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
exports.default = exports.ApiResponseBuilder;
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
        ApiResponseBuilder: exports.ApiResponseBuilder,
        // 默认导出
        default: exports.ApiResponseBuilder
    };
}
//# sourceMappingURL=apiResponseBuilder.js.map