/**
 * API响应类型定义 - 标准版本
 * 版本: v2.0.0
 *
 * 注意：此文件现在导入共享的标准类型定义
 */

// 导入共享的标准类型定义
const {
  StandardErrorCode,
  StandardStatusCodeMap,
  StandardErrorMessages,
  isStandardApiSuccessResponse,
  isStandardApiErrorResponse
} = require('../../shared/types/standardApiResponse.js');

// 向后兼容的错误代码别名
const ErrorCodes = StandardErrorCode;

// 向后兼容的别名
const ErrorMessages = StandardErrorMessages;
const StatusCodeMap = StandardStatusCodeMap;

// 导入共享的响应构建工具
const {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  getHttpStatusCode,
  generateRequestId,
  createStandardMeta,
  createPaginationMeta
} = require('../../shared/utils/apiResponseBuilder');

// 向后兼容的函数别名
const getStatusCode = getHttpStatusCode;
const getErrorMessage = (errorCode) => StandardErrorMessages[errorCode] || '未知错误';

// 向后兼容的API响应创建函数
function createApiResponse(success, data = null, message = null, meta = {}) {
  if (success) {
    return createSuccessResponse(data, message, { meta });
  } else {
    return createErrorResponse(data.code || 'UNKNOWN_ERROR', message, data.details, { meta });
  }
}

module.exports = {
  // 标准类型和常量
  ErrorCodes,
  ErrorMessages,
  StatusCodeMap,

  // 响应构建函数
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createApiResponse,

  // 工具函数
  getStatusCode,
  getErrorMessage,
  generateRequestId,
  createStandardMeta,
  createPaginationMeta,

  // 类型守卫函数
  isApiSuccessResponse: isStandardApiSuccessResponse,
  isApiErrorResponse: isStandardApiErrorResponse
};
