/**
 * 简化的错误处理器
 * 用于恢复系统正常运行
 */

// 错误类型枚举
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
  FORBIDDEN_ERROR: 'FORBIDDEN_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  BAD_REQUEST_ERROR: 'BAD_REQUEST_ERROR'
};

// 服务错误类
class ServiceError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// 初始化错误处理系统
function initializeErrorHandlingSystem() {
  console.log('✅ 错误处理系统已初始化');
  return true;
}

// 统一错误处理中间件
function unifiedErrorHandler(err, req, res, next) {
  console.error('错误:', err);

  // 设置默认错误状态码
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  let type = err.type || ErrorTypes.INTERNAL_ERROR;

  // 根据错误类型设置状态码
  switch (type) {
    case ErrorTypes.VALIDATION_ERROR:
      statusCode = 400;
      break;
    case ErrorTypes.NOT_FOUND_ERROR:
      statusCode = 404;
      break;
    case ErrorTypes.UNAUTHORIZED_ERROR:
      statusCode = 401;
      break;
    case ErrorTypes.FORBIDDEN_ERROR:
      statusCode = 403;
      break;
    case ErrorTypes.CONFLICT_ERROR:
      statusCode = 409;
      break;
    case ErrorTypes.BAD_REQUEST_ERROR:
      statusCode = 400;
      break;
    default:
      statusCode = 500;
  }

  // 发送错误响应
  res.status(statusCode).json({
    success: false,
    error: {
      type,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  ErrorTypes,
  ServiceError,
  initializeErrorHandlingSystem,
  unifiedErrorHandler
};
