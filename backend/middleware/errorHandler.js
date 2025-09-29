/**
 * 统一错误处理导出
 * 整合所有错误处理功能，提供统一的接口
 * 替代之前分散在多个文件中的错误处理逻辑
 */

// 导入核心统一错误处理器
const { 
  errorMiddleware, 
  notFoundHandler, 
  handleError, 
  ErrorFactory,
  ErrorCode,
  ErrorSeverity,
  asyncHandler
} = require('./unifiedErrorHandler');

/**
 * 向后兼容的错误处理器类
 * 保持与旧代码的兼容性
 */
class ErrorHandler {
  /**
   * 全局错误处理中间件（向后兼容）
   */
  static globalErrorHandler = errorMiddleware;

  /**
   * 异步错误包装器（向后兼容）
   */
  static asyncWrapper = asyncHandler;

  /**
   * 404错误处理（向后兼容）
   */
  static notFoundHandler = notFoundHandler;

  /**
   * 创建验证错误（向后兼容）
   */
  static validationError(message, details = null) {
    return ErrorFactory.validation(message, details);
  }

  /**
   * 创建未授权错误（向后兼容）
   */
  static unauthorizedError(message = '未授权访问') {
    return ErrorFactory.unauthorized(message);
  }

  /**
   * 创建禁止访问错误（向后兼容）
   */
  static forbiddenError(message = '禁止访问') {
    return ErrorFactory.forbidden(message);
  }

  /**
   * 创建资源未找到错误（向后兼容）
   */
  static notFoundError(message = '资源未找到') {
    return ErrorFactory.notFound(message);
  }

  /**
   * 创建资源冲突错误（向后兼容）
   */
  static conflictError(message = '资源冲突') {
    return ErrorFactory.conflict(message);
  }

  /**
   * 创建业务逻辑错误（向后兼容）
   */
  static businessError(code, message, details = null) {
    return ErrorFactory.business(code, message, details);
  }
}

/**
 * API错误类（向后兼容）
 * 替代原来的 utils/ApiError.js
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'API_ERROR';
    this.details = details;
    this.timestamp = new Date();
  }

  // 静态工厂方法
  static badRequest(message = '请求参数错误', details = null) {
    return new ApiError(message, 400, ErrorCode.BAD_REQUEST, details);
  }

  static unauthorized(message = '未授权访问', details = null) {
    return new ApiError(message, 401, ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(message = '禁止访问', details = null) {
    return new ApiError(message, 403, ErrorCode.FORBIDDEN, details);
  }

  static notFound(message = '资源不存在', details = null) {
    return new ApiError(message, 404, ErrorCode.NOT_FOUND, details);
  }

  static conflict(message = '资源冲突', details = null) {
    return new ApiError(message, 409, ErrorCode.CONFLICT, details);
  }

  static validationError(message = '数据验证失败', details = null) {
    return new ApiError(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }

  static internal(message = '内部服务器错误', details = null) {
    return new ApiError(message, 500, ErrorCode.SYSTEM_ERROR, details);
  }
}

/**
 * 简化的异步错误处理器（向后兼容）
 * 替代原来的 utils/asyncErrorHandler.js
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 导出所有错误处理功能
module.exports = {
  // 核心统一接口
  errorMiddleware,
  notFoundHandler,
  handleError,
  ErrorFactory,
  ErrorCode,
  ErrorSeverity,
  asyncHandler,

  // 向后兼容接口
  ErrorHandler,
  ApiError,
  asyncErrorHandler,

  // 别名导出（保持兼容性）
  globalErrorHandler: errorMiddleware,
  asyncWrapper: asyncHandler
};
