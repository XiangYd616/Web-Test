"use strict";
/**
 * 统一API响应格式标准
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 此文件定义了项目中所有API接口必须遵循的统一响应格式
 * 确保前后端API响应格式完全一致
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardErrorMessages = exports.StandardStatusCodeMap = exports.StandardErrorCode = void 0;
exports.isStandardApiSuccessResponse = isStandardApiSuccessResponse;
exports.isStandardApiErrorResponse = isStandardApiErrorResponse;
// ==================== 错误代码枚举 ====================
var StandardErrorCode;
(function (StandardErrorCode) {
    // 通用错误 (1000-1099)
    StandardErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    StandardErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    StandardErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    // 验证错误 (1100-1199)
    StandardErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    StandardErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    StandardErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    // 认证和授权错误 (1200-1299)
    StandardErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    StandardErrorCode["FORBIDDEN"] = "FORBIDDEN";
    StandardErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    StandardErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    StandardErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    // 资源错误 (1300-1399)
    StandardErrorCode["NOT_FOUND"] = "NOT_FOUND";
    StandardErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    StandardErrorCode["DUPLICATE_RESOURCE"] = "DUPLICATE_RESOURCE";
    StandardErrorCode["CONFLICT"] = "CONFLICT";
    // 业务逻辑错误 (1400-1499)
    StandardErrorCode["BUSINESS_LOGIC_ERROR"] = "BUSINESS_LOGIC_ERROR";
    StandardErrorCode["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    // 网络和外部服务错误 (1500-1599)
    StandardErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    StandardErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    StandardErrorCode["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    // 限流和配额错误 (1600-1699)
    StandardErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    StandardErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    StandardErrorCode["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
    // 测试相关错误 (1700-1799)
    StandardErrorCode["TEST_EXECUTION_ERROR"] = "TEST_EXECUTION_ERROR";
    StandardErrorCode["TEST_CONFIGURATION_ERROR"] = "TEST_CONFIGURATION_ERROR";
    StandardErrorCode["TEST_TIMEOUT"] = "TEST_TIMEOUT";
    StandardErrorCode["TEST_NOT_FOUND"] = "TEST_NOT_FOUND";
    StandardErrorCode["TEST_ALREADY_RUNNING"] = "TEST_ALREADY_RUNNING";
})(StandardErrorCode || (exports.StandardErrorCode = StandardErrorCode = {}));
// ==================== HTTP状态码映射 ====================
exports.StandardStatusCodeMap = {
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
exports.StandardErrorMessages = {
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
function isStandardApiSuccessResponse(response) {
    return response.success === true;
}
function isStandardApiErrorResponse(response) {
    return response.success === false;
}
// 向后兼容的默认导出
exports.default = {
    StandardErrorCode,
    StandardStatusCodeMap: exports.StandardStatusCodeMap,
    StandardErrorMessages: exports.StandardErrorMessages,
    isStandardApiSuccessResponse,
    isStandardApiErrorResponse
};
//# sourceMappingURL=standardApiResponse.js.map