/**
 * 统一错误处理中间件
 * 处理所有未捕获的错误并返回统一格式的错误响应
 */

const { ERROR_CODES } = require('./responseFormatter');

/**
 * 错误类型映射
 */
const ERROR_TYPE_MAP = {
  // 数据库错误
  '23505': 'DUPLICATE_ENTRY', // 唯一约束违反
  '23503': 'FOREIGN_KEY_VIOLATION', // 外键约束违反
  '23502': 'NOT_NULL_VIOLATION', // 非空约束违反
  '23514': 'CHECK_VIOLATION', // 检查约束违反
  '42P01': 'TABLE_NOT_EXISTS', // 表不存在
  '42703': 'COLUMN_NOT_EXISTS', // 列不存在
  
  // JWT错误
  'TokenExpiredError': 'TOKEN_EXPIRED',
  'JsonWebTokenError': 'TOKEN_INVALID',
  'NotBeforeError': 'TOKEN_NOT_ACTIVE',
  
  // 验证错误
  'ValidationError': 'VALIDATION_ERROR',
  'CastError': 'INVALID_DATA_TYPE',
  
  // 网络错误
  'ECONNREFUSED': 'CONNECTION_REFUSED',
  'ENOTFOUND': 'HOST_NOT_FOUND',
  'ETIMEDOUT': 'REQUEST_TIMEOUT',
  'ECONNRESET': 'CONNECTION_RESET'
};

/**
 * 获取错误的详细信息
 */
const getErrorDetails = (error) => {
  const details = {
    type: error.constructor.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
  
  // PostgreSQL错误详情
  if (error.code && error.code.startsWith('23')) {
    details.constraint = error.constraint;
    details.table = error.table;
    details.column = error.column;
  }
  
  // 验证错误详情
  if (error.name === 'ValidationError' && error.errors) {
    details.validationErrors = Object.keys(error.errors).map(key => ({
      field: key,
      message: error.errors[key].message,
      value: error.errors[key].value
    }));
  }
  
  // JWT错误详情
  if (error.name === 'TokenExpiredError') {
    details.expiredAt = error.expiredAt;
  }
  
  return details;
};

/**
 * 根据错误类型生成用户友好的错误消息
 */
const getUserFriendlyMessage = (error) => {
  // 数据库错误
  if (error.code === '23505') {
    if (error.constraint && error.constraint.includes('email')) {
      return '该邮箱地址已被使用';
    }
    if (error.constraint && error.constraint.includes('username')) {
      return '该用户名已被使用';
    }
    return '数据已存在，请检查输入信息';
  }
  
  if (error.code === '23503') {
    return '关联的数据不存在';
  }
  
  if (error.code === '23502') {
    return '必填字段不能为空';
  }
  
  // JWT错误
  if (error.name === 'TokenExpiredError') {
    return '登录已过期，请重新登录';
  }
  
  if (error.name === 'JsonWebTokenError') {
    return '无效的认证信息';
  }
  
  // 网络错误
  if (error.code === 'ECONNREFUSED') {
    return '服务暂时不可用，请稍后重试';
  }
  
  if (error.code === 'ETIMEDOUT') {
    return '请求超时，请稍后重试';
  }
  
  // 默认消息
  return error.message || '服务器内部错误';
};

/**
 * 获取HTTP状态码
 */
const getStatusCode = (error) => {
  // 已设置状态码的错误
  if (error.statusCode) {
    return error.statusCode;
  }
  
  if (error.status) {
    return error.status;
  }
  
  // 根据错误类型确定状态码
  switch (error.name) {
    case 'ValidationError':
      return 422;
    case 'CastError':
      return 400;
    case 'TokenExpiredError':
    case 'JsonWebTokenError':
    case 'NotBeforeError':
      return 401;
    default:
      break;
  }
  
  // 根据错误代码确定状态码
  switch (error.code) {
    case '23505': // 重复数据
      return 409;
    case '23503': // 外键约束
    case '23502': // 非空约束
    case '23514': // 检查约束
      return 400;
    case '42P01': // 表不存在
    case '42703': // 列不存在
      return 500;
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
      return 503;
    case 'ETIMEDOUT':
      return 408;
    default:
      return 500;
  }
};

/**
 * 获取错误代码
 */
const getErrorCode = (error) => {
  // 自定义错误代码
  if (error.errorCode) {
    return error.errorCode;
  }
  
  // 根据错误类型映射
  if (ERROR_TYPE_MAP[error.name]) {
    return ERROR_TYPE_MAP[error.name];
  }
  
  if (ERROR_TYPE_MAP[error.code]) {
    return ERROR_TYPE_MAP[error.code];
  }
  
  // 默认错误代码
  return ERROR_CODES.INTERNAL_ERROR;
};

/**
 * 记录错误日志
 */
const logError = (error, req) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    }
  };
  
  // 根据错误严重程度选择日志级别
  const statusCode = getStatusCode(error);
  
  if (statusCode >= 500) {
    console.error('🚨 服务器错误:', JSON.stringify(logData, null, 2));
  } else if (statusCode >= 400) {
    console.warn('⚠️ 客户端错误:', JSON.stringify(logData, null, 2));
  } else {
    console.info('ℹ️ 请求错误:', JSON.stringify(logData, null, 2));
  }
  
  // 在生产环境中，可以将错误发送到外部日志服务
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    // 这里可以集成如 Sentry、LogRocket 等错误监控服务
    // sendToErrorMonitoring(logData);
  }
};

/**
 * 主要错误处理中间件
 */
const errorHandler = (error, req, res, next) => {
  // 如果响应已经发送，则交给默认错误处理器
  if (res.headersSent) {
    return next(error);
  }
  
  // 记录错误日志
  logError(error, req);
  
  // 获取错误信息
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);
  const message = getUserFriendlyMessage(error);
  const details = process.env.NODE_ENV === 'development' ? getErrorDetails(error) : null;
  
  // 构建错误响应
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.originalUrl,
      method: req.method
    }
  };
  
  // 添加性能信息（开发环境）
  if (process.env.NODE_ENV === 'development' && req.startTime) {
    errorResponse.meta.responseTime = `${Date.now() - req.startTime}ms`;
  }
  
  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`路径 ${req.originalUrl} 不存在`);
  error.statusCode = 404;
  error.errorCode = ERROR_CODES.NOT_FOUND;
  next(error);
};

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获Promise rejection
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 常用错误创建函数
 */
const createError = {
  badRequest: (message, details) => new AppError(message, 400, ERROR_CODES.BAD_REQUEST, details),
  unauthorized: (message, details) => new AppError(message, 401, ERROR_CODES.UNAUTHORIZED, details),
  forbidden: (message, details) => new AppError(message, 403, ERROR_CODES.FORBIDDEN, details),
  notFound: (message, details) => new AppError(message, 404, ERROR_CODES.NOT_FOUND, details),
  conflict: (message, details) => new AppError(message, 409, ERROR_CODES.CONFLICT, details),
  validationError: (message, details) => new AppError(message, 422, ERROR_CODES.VALIDATION_ERROR, details),
  internalError: (message, details) => new AppError(message, 500, ERROR_CODES.INTERNAL_ERROR, details),
  serviceUnavailable: (message, details) => new AppError(message, 503, ERROR_CODES.SERVICE_UNAVAILABLE, details)
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError,
  ERROR_TYPE_MAP
};
