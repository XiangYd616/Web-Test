/**
 * 后端统一错误处理适配器
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 * 
 * 此文件替代以下重复的错误处理文件：
 * - middleware/errorHandler.js
 * - api/middleware/errorHandler.js
 * - utils/errorHandler.js
 * - utils/ApiError.js
 * - utils/asyncErrorHandler.js
 */

const { 
  UnifiedErrorHandler, 
  ErrorCode, 
  ErrorSeverity 
} = require('../../shared/utils/unifiedErrorHandler');

// ==================== 后端特定配置 ====================

const BACKEND_ERROR_CONFIG = {
  enableLogging: true,
  enableReporting: process.env.NODE_ENV === 'production',
  enableUserNotification: false, // 后端不需要用户通知
  enableRetry: false, // 后端不处理重试
  maxRetries: 0,
  retryDelay: 0,
  logLevel: process.env.LOG_LEVEL || 'error'
};

// ==================== 后端错误处理器 ====================

class BackendErrorHandler extends UnifiedErrorHandler {
  constructor() {
    super(BACKEND_ERROR_CONFIG);
  }

  /**
   * Express错误处理中间件
   */
  expressMiddleware() {
    return (err, req, res, next) => {
      // 如果响应已经发送，则跳过
      if (res.headersSent) {
        return next(err);
      }

      // 处理错误
      const standardError = this.handleError(err, {
        requestId: req.requestId || req.id,
        userId: req.user?.id,
        sessionId: req.sessionID,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // 获取HTTP状态码
      const statusCode = this.getHttpStatusCode(standardError.code);

      // 创建API错误响应
      const errorResponse = this.createApiErrorResponse(standardError, {
        requestId: req.requestId || req.id,
        path: req.originalUrl,
        method: req.method,
        version: '2.0.0'
      });

      // 发送错误响应
      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * 异步操作包装器
   */
  asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 404错误处理中间件
   */
  notFoundHandler() {
    return (req, res) => {
      const standardError = this.handleError(new Error('资源不存在'), {
        requestId: req.requestId || req.id,
        url: req.originalUrl,
        method: req.method,
        code: ErrorCode.NOT_FOUND
      });

      const errorResponse = this.createApiErrorResponse(standardError, {
        requestId: req.requestId || req.id,
        path: req.originalUrl,
        method: req.method,
        version: '2.0.0'
      });

      res.status(404).json(errorResponse);
    };
  }

  /**
   * 数据库错误处理
   */
  handleDatabaseError(error, context = {}) {
    let errorCode = ErrorCode.DATABASE_ERROR;
    let message = '数据库操作失败';

    // PostgreSQL错误代码映射
    if (error.code) {
      switch (error.code) {
        case '23505': // 唯一约束违反
          errorCode = ErrorCode.UNIQUE_CONSTRAINT_VIOLATION;
          message = '数据已存在';
          break;
        case '23503': // 外键约束违反
          errorCode = ErrorCode.FOREIGN_KEY_VIOLATION;
          message = '关联数据不存在';
          break;
        case '23502': // 非空约束违反
          errorCode = ErrorCode.VALIDATION_ERROR;
          message = '必填字段不能为空';
          break;
        case '42P01': // 表不存在
          errorCode = ErrorCode.DATABASE_ERROR;
          message = '数据表不存在';
          break;
      }
    }

    const dbError = new Error(message);
    dbError.code = errorCode;
    dbError.originalError = error;

    return this.handleError(dbError, {
      ...context,
      database: true,
      dbCode: error.code,
      dbMessage: error.message
    });
  }

  /**
   * JWT错误处理
   */
  handleJWTError(error, context = {}) {
    let errorCode = ErrorCode.TOKEN_INVALID;
    let message = '无效的访问令牌';

    switch (error.name) {
      case 'TokenExpiredError':
        errorCode = ErrorCode.TOKEN_EXPIRED;
        message = '访问令牌已过期';
        break;
      case 'JsonWebTokenError':
        errorCode = ErrorCode.TOKEN_INVALID;
        message = '无效的访问令牌';
        break;
      case 'NotBeforeError':
        errorCode = ErrorCode.TOKEN_INVALID;
        message = '访问令牌尚未生效';
        break;
    }

    const jwtError = new Error(message);
    jwtError.code = errorCode;
    jwtError.originalError = error;

    return this.handleError(jwtError, {
      ...context,
      jwt: true,
      jwtError: error.name
    });
  }

  /**
   * 验证错误处理
   */
  handleValidationError(errors, context = {}) {
    let message = '数据验证失败';
    let details = null;

    if (Array.isArray(errors)) {
      details = errors.map(err => ({
        field: err.param || err.field,
        message: err.msg || err.message,
        value: err.value
      }));
      message = `验证失败: ${details.map(d => d.field).join(', ')}`;
    } else if (errors.errors) {
      details = errors.errors;
    }

    const validationError = new Error(message);
    validationError.code = ErrorCode.VALIDATION_ERROR;
    validationError.details = details;

    return this.handleError(validationError, {
      ...context,
      validation: true,
      validationDetails: details
    });
  }

  /**
   * 业务逻辑错误处理
   */
  handleBusinessError(code, message, details = null, context = {}) {
    const businessError = new Error(message);
    businessError.code = code;
    businessError.details = details;

    return this.handleError(businessError, {
      ...context,
      business: true
    });
  }

  /**
   * 网络错误处理
   */
  handleNetworkError(error, context = {}) {
    let errorCode = ErrorCode.NETWORK_ERROR;
    let message = '网络连接失败';

    if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
          errorCode = ErrorCode.CONNECTION_ERROR;
          message = '连接被拒绝';
          break;
        case 'ETIMEDOUT':
          errorCode = ErrorCode.TIMEOUT_ERROR;
          message = '连接超时';
          break;
        case 'ENOTFOUND':
          errorCode = ErrorCode.NETWORK_ERROR;
          message = '主机不存在';
          break;
      }
    }

    const networkError = new Error(message);
    networkError.code = errorCode;
    networkError.originalError = error;

    return this.handleError(networkError, {
      ...context,
      network: true,
      networkCode: error.code
    });
  }
}

// ==================== 错误工厂类 ====================

class ErrorFactory {
  static validation(message, details = null) {
    const error = new Error(message);
    error.code = ErrorCode.VALIDATION_ERROR;
    error.details = details;
    return error;
  }

  static notFound(resource = '资源') {
    const error = new Error(`${resource}不存在`);
    error.code = ErrorCode.NOT_FOUND;
    return error;
  }

  static unauthorized(message = '未授权访问') {
    const error = new Error(message);
    error.code = ErrorCode.UNAUTHORIZED;
    return error;
  }

  static forbidden(message = '禁止访问') {
    const error = new Error(message);
    error.code = ErrorCode.FORBIDDEN;
    return error;
  }

  static conflict(message = '资源冲突') {
    const error = new Error(message);
    error.code = ErrorCode.CONFLICT;
    return error;
  }

  static rateLimit(message = '请求频率超限') {
    const error = new Error(message);
    error.code = ErrorCode.RATE_LIMIT_EXCEEDED;
    return error;
  }

  static business(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    return error;
  }
}

// ==================== 默认实例和便捷方法 ====================

const backendErrorHandler = new BackendErrorHandler();

// Express中间件
const errorMiddleware = backendErrorHandler.expressMiddleware();
const asyncHandler = backendErrorHandler.asyncWrapper.bind(backendErrorHandler);
const notFoundHandler = backendErrorHandler.notFoundHandler();

// 错误处理方法
const handleError = (error, context = {}) => backendErrorHandler.handleError(error, context);
const handleDatabaseError = (error, context = {}) => backendErrorHandler.handleDatabaseError(error, context);
const handleJWTError = (error, context = {}) => backendErrorHandler.handleJWTError(error, context);
const handleValidationError = (errors, context = {}) => backendErrorHandler.handleValidationError(errors, context);
const handleBusinessError = (code, message, details, context = {}) => 
  backendErrorHandler.handleBusinessError(code, message, details, context);
const handleNetworkError = (error, context = {}) => backendErrorHandler.handleNetworkError(error, context);

// 向后兼容的导出
const ErrorHandler = {
  handle: errorMiddleware,
  asyncWrapper: asyncHandler,
  notFoundHandler: notFoundHandler
};

module.exports = {
  // 新的统一接口
  backendErrorHandler,
  errorMiddleware,
  asyncHandler,
  notFoundHandler,
  handleError,
  handleDatabaseError,
  handleJWTError,
  handleValidationError,
  handleBusinessError,
  handleNetworkError,
  ErrorFactory,
  
  // 向后兼容
  ErrorHandler,
  unifiedErrorHandler: backendErrorHandler,
  
  // 错误代码和严重程度
  ErrorCode,
  ErrorSeverity
};
