/**
 * 错误处理中间件
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

/**
 * 异步路由包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logError(err, req);

  // 数据库连接错误
  if (err.code === 'ECONNREFUSED') {
    error.message = '数据库连接失败';
    error.statusCode = 503;
  }

  // PostgreSQL错误
  if (err.code && err.code.startsWith('23')) {
    if (err.code === '23505') {
      error.message = '数据已存在，违反唯一约束';
      error.statusCode = 409;
    } else if (err.code === '23503') {
      error.message = '违反外键约束';
      error.statusCode = 400;
    } else {
      error.message = '数据库约束错误';
      error.statusCode = 400;
    }
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    error.message = '无效的认证令牌';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = '认证令牌已过期';
    error.statusCode = 401;
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error.message = message;
    error.statusCode = 400;
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = '文件大小超出限制';
    error.statusCode = 413;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = '意外的文件字段';
    error.statusCode = 400;
  }

  // 网络错误
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNRESET') {
    error.message = '网络连接错误';
    error.statusCode = 503;
  }

  // 超时错误
  if (err.code === 'ETIMEDOUT') {
    error.message = '请求超时';
    error.statusCode = 408;
  }

  // 默认错误
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || '服务器内部错误';

  // 标准化错误响应格式
  const response = {
    success: false,
    message,
    code: error.code || err.code || statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  };

  res.status(statusCode).json(response);
};

/**
 * 记录错误日志
 */
const logError = (err, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    }
  };

  // 写入错误日志文件
  const logPath = path.join(__dirname, '..', 'logs', 'error.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (writeErr) => {
    if (writeErr) {
      Logger.error('写入错误日志失败', writeErr);
    }
  });

  // 使用统一日志工具输出
  Logger.error(`${err.name}: ${err.message}`, err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
};

/**
 * 404错误处理
 */
const notFound = (req, res, next) => {
  const error = new Error(`未找到路由 - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * 验证错误处理
 */
const validationError = (errors) => {
  const error = new Error('验证失败');
  error.statusCode = 400;
  error.errors = errors;
  return error;
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 数据库错误处理
 */
const handleDatabaseError = (err) => {
  if (err.code === '23505') {
    return new AppError('数据已存在', 409);
  }
  if (err.code === '23503') {
    return new AppError('关联数据不存在', 400);
  }
  if (err.code === '23502') {
    return new AppError('必填字段不能为空', 400);
  }
  return new AppError('数据库操作失败', 500);
};

/**
 * 捕获未处理的Promise拒绝
 */
process.on('unhandledRejection', (err, promise) => {
  Logger.error('未处理的Promise拒绝', err, { type: 'unhandledRejection' });
  logError(err, { method: 'SYSTEM', originalUrl: 'unhandledRejection', ip: 'system' });
});

/**
 * 捕获未捕获的异常
 */
process.on('uncaughtException', (err) => {
  Logger.error('未捕获的异常', err, { type: 'uncaughtException' });

  // 创建一个模拟的req对象用于日志记录
  const mockReq = {
    method: 'SYSTEM',
    originalUrl: 'uncaughtException',
    ip: 'system',
    get: (header) => header === 'User-Agent' ? 'System Process' : null,
    user: null
  };

  logError(err, mockReq);

  // 优雅关闭
  process.exit(1);
});

module.exports = {
  asyncHandler,
  errorHandler,
  notFound,
  validationError,
  AppError,
  handleDatabaseError,
  logError
};
