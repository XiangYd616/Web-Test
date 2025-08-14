/**
 * 错误处理中间件 - 使用统一的API响应格式
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const ErrorNotificationHelper = require('../utils/ErrorNotificationHelper');
const { ErrorFactory, ErrorUtils } = require('../utils/ApiError');
const { ErrorCodes, createErrorResponse } = require('../types/ApiResponse');

/**
 * 异步路由包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 创建全局错误通知助手
const globalErrorNotifier = new ErrorNotificationHelper('System');

/**
 * 全局错误处理中间件 - 使用统一响应格式
 */
const errorHandler = (err, req, res, next) => {
  // 如果响应已经发送，则跳过
  if (res.headersSent) {
    return next(err);
  }

  // 记录错误日志
  logError(err, req);

  // 转换为标准API错误
  const apiError = ErrorFactory.fromError(err);

  // 记录错误详情
  ErrorUtils.logError(apiError, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous'
  });

  // 获取错误分类和建议（保持向后兼容）
  const errorCategory = globalErrorNotifier.getErrorCategory(err);
  const errorSeverity = globalErrorNotifier.getErrorSeverity(err);
  const suggestions = globalErrorNotifier.getErrorSuggestions(err);

  // 构建元数据
  const meta = {
    requestId: req.requestId || generateRequestId(),
    duration: req.startTime ? Date.now() - req.startTime : undefined,
    path: req.originalUrl,
    method: req.method,
    category: errorCategory,
    severity: errorSeverity
  };

  // 在开发环境中添加调试信息
  if (process.env.NODE_ENV === 'development') {
    meta.debug = {
      stack: err.stack,
      originalError: err.message,
      code: err.code
    };
  }

  // 创建标准化错误响应
  const response = createErrorResponse(
    apiError.code,
    apiError.message,
    apiError.details,
    meta
  );

  // 合并额外的建议
  if (suggestions && suggestions.length > 0) {
    response.error.suggestions = [
      ...(response.error.suggestions || []),
      ...suggestions
    ];
  }

  res.status(apiError.statusCode).json(response);
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
 * 生成请求ID（如果不存在）
 */
const generateRequestId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
};

/**
 * 自定义错误类 - 保持向后兼容
 * @deprecated 请使用 ApiError 类
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
