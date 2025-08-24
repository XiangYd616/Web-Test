/**
 * 统一响应格式化中间件 - 已弃用
 * 请使用 backend/middleware/responseFormatter.js 中的标准版本
 *
 * 此文件将被删除，所有功能已迁移到标准版本
 */

console.warn('⚠️ 警告: backend/api/middleware/responseFormatter.js 已弃用，请使用 backend/middleware/responseFormatter.js');

// 重新导出标准版本的中间件
const {
  responseFormatter,
  errorResponseFormatter,
  notFoundHandler,
  responseTimeLogger
} = require('../../middleware/responseFormatter.js');

// 导出标准版本的中间件，保持向后兼容
module.exports = {
  responseFormatter,
  errorResponseFormatter,
  notFoundHandler,
  responseTimeLogger,

  // 向后兼容的别名
  addErrorMethods: (req, res, next) => next(), // 空实现，标准版本已包含
  createPagination: require('../../middleware/responseFormatter.js').createPaginationMeta || (() => { }),
  formatValidationErrors: (errors) => errors, // 简单实现

  // 常量导出（向后兼容）
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  ERROR_CODES: {
    // 通用错误
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
  }
};

// 此文件的其余部分已被弃用，所有功能已迁移到标准版本
