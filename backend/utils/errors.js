/**
 * 统一错误处理类
 * 提供标准化的错误定义和响应格式
 */

/**
 * 基础业务错误类
 */
class BusinessError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.statusCode = 400; // 默认HTTP状态码
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为响应格式
   */
  toResponse() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 验证错误
 */
class ValidationError extends BusinessError {
  constructor(errors, warnings = []) {
    super('验证失败', 'VALIDATION_ERROR', { errors, warnings });
    this.statusCode = 400;
  }
}

/**
 * 配额超限错误
 */
class QuotaExceededError extends BusinessError {
  constructor(quotaType, current, limit) {
    super(
      `${quotaType}已超限`,
      'QUOTA_EXCEEDED',
      { quotaType, current, limit, message: `当前: ${current}, 限制: ${limit}` }
    );
    this.statusCode = 429;
  }
}

/**
 * 权限错误
 */
class PermissionError extends BusinessError {
  constructor(action, resource) {
    super(
      `无权限执行此操作`,
      'PERMISSION_DENIED',
      { action, resource }
    );
    this.statusCode = 403;
  }
}

/**
 * 未授权错误
 */
class UnauthorizedError extends BusinessError {
  constructor(message = '未授权:用户未登录') {
    super(message, 'UNAUTHORIZED', {});
    this.statusCode = 401;
  }
}

/**
 * 资源不存在错误
 */
class NotFoundError extends BusinessError {
  constructor(resource, identifier) {
    super(
      `${resource}不存在`,
      'NOT_FOUND',
      { resource, identifier }
    );
    this.statusCode = 404;
  }
}

/**
 * 冲突错误
 */
class ConflictError extends BusinessError {
  constructor(message, conflictDetails = {}) {
    super(message, 'CONFLICT', conflictDetails);
    this.statusCode = 409;
  }
}

/**
 * 参数错误
 */
class BadRequestError extends BusinessError {
  constructor(message, invalidParams = {}) {
    super(message, 'BAD_REQUEST', { invalidParams });
    this.statusCode = 400;
  }
}

/**
 * 服务不可用错误
 */
class ServiceUnavailableError extends BusinessError {
  constructor(service, reason) {
    super(
      `服务暂时不可用: ${service}`,
      'SERVICE_UNAVAILABLE',
      { service, reason }
    );
    this.statusCode = 503;
  }
}

/**
 * 限流错误
 */
class RateLimitError extends BusinessError {
  constructor(limit, windowMs, retryAfter) {
    super(
      '请求过于频繁,请稍后再试',
      'RATE_LIMIT_EXCEEDED',
      { limit, windowMs, retryAfter }
    );
    this.statusCode = 429;
  }
}

/**
 * 超时错误
 */
class TimeoutError extends BusinessError {
  constructor(operation, timeoutMs) {
    super(
      `操作超时: ${operation}`,
      'TIMEOUT',
      { operation, timeoutMs }
    );
    this.statusCode = 408;
  }
}

/**
 * 数据库错误
 */
class DatabaseError extends BusinessError {
  constructor(operation, originalError) {
    super(
      `数据库操作失败: ${operation}`,
      'DATABASE_ERROR',
      { operation, error: originalError.message }
    );
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

/**
 * 外部服务错误
 */
class ExternalServiceError extends BusinessError {
  constructor(service, statusCode, message) {
    super(
      `外部服务调用失败: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      { service, statusCode, message }
    );
    this.statusCode = 502;
  }
}

/**
 * 统一错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误
  console.error('Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 如果是业务错误,直接返回
  if (err instanceof BusinessError) {
    return res.status(err.statusCode).json(err.toResponse());
  }

  // PostgreSQL错误
  if (err.code && err.code.startsWith('23')) {
    let message = '数据库约束错误';
    if (err.code === '23505') message = '数据已存在,违反唯一约束';
    if (err.code === '23503') message = '违反外键约束';
    if (err.code === '23502') message = '违反非空约束';
    
    return res.status(400).json({
      success: false,
      error: message,
      code: 'DATABASE_CONSTRAINT_ERROR',
      details: process.env.NODE_ENV === 'development' ? { dbError: err.message } : {},
      timestamp: new Date().toISOString()
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token无效',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token已过期',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Multer文件上传错误
  if (err.name === 'MulterError') {
    let message = '文件上传失败';
    if (err.code === 'LIMIT_FILE_SIZE') message = '文件大小超过限制';
    if (err.code === 'LIMIT_FILE_COUNT') message = '文件数量超过限制';
    
    return res.status(400).json({
      success: false,
      error: message,
      code: 'FILE_UPLOAD_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : {},
    timestamp: new Date().toISOString()
  });
}

/**
 * 异步路由包装器(替代asyncHandler)
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404处理中间件
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `路由不存在: ${req.method} ${req.url}`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  // 错误类
  BusinessError,
  ValidationError,
  QuotaExceededError,
  PermissionError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ServiceUnavailableError,
  RateLimitError,
  TimeoutError,
  DatabaseError,
  ExternalServiceError,
  
  // 中间件
  errorHandler,
  asyncHandler,
  notFoundHandler
};
