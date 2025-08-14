/**
 * 统一响应格式化中间件
 * 为所有API响应提供一致的格式
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 统一API响应格式
 */
const responseFormatter = (req, res, next) => {
  // 为每个请求生成唯一ID
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // 成功响应格式化
  res.success = (data = null, message = 'Success', meta = {}) => {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.originalUrl,
        method: req.method,
        ...meta
      }
    };
    
    // 添加分页信息（如果存在）
    if (meta.pagination) {
      response.meta.pagination = meta.pagination;
    }
    
    // 添加性能信息（开发环境）
    if (process.env.NODE_ENV === 'development' && req.startTime) {
      response.meta.responseTime = `${Date.now() - req.startTime}ms`;
    }
    
    res.json(response);
  };
  
  // 错误响应格式化
  res.error = (code, message, details = null, statusCode = 400) => {
    const response = {
      success: false,
      error: {
        code,
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
      response.meta.responseTime = `${Date.now() - req.startTime}ms`;
    }
    
    res.status(statusCode).json(response);
  };
  
  // 分页响应格式化
  res.paginated = (data, pagination, message = 'Success') => {
    res.success(data, message, { pagination });
  };
  
  // 创建响应格式化（201状态码）
  res.created = (data, message = 'Created successfully') => {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.originalUrl,
        method: req.method
      }
    };
    
    res.status(201).json(response);
  };
  
  // 无内容响应格式化（204状态码）
  res.noContent = () => {
    res.status(204).send();
  };
  
  // 记录请求开始时间（用于性能监控）
  req.startTime = Date.now();
  
  next();
};

/**
 * 常用错误响应快捷方法
 */
const errorResponses = {
  // 400 Bad Request
  badRequest: (res, message = '请求参数错误', details = null) => {
    res.error('BAD_REQUEST', message, details, 400);
  },
  
  // 401 Unauthorized
  unauthorized: (res, message = '未授权访问', details = null) => {
    res.error('UNAUTHORIZED', message, details, 401);
  },
  
  // 403 Forbidden
  forbidden: (res, message = '禁止访问', details = null) => {
    res.error('FORBIDDEN', message, details, 403);
  },
  
  // 404 Not Found
  notFound: (res, message = '资源不存在', details = null) => {
    res.error('NOT_FOUND', message, details, 404);
  },
  
  // 409 Conflict
  conflict: (res, message = '资源冲突', details = null) => {
    res.error('CONFLICT', message, details, 409);
  },
  
  // 422 Unprocessable Entity
  validationError: (res, message = '数据验证失败', details = null) => {
    res.error('VALIDATION_ERROR', message, details, 422);
  },
  
  // 429 Too Many Requests
  tooManyRequests: (res, message = '请求过于频繁', details = null) => {
    res.error('TOO_MANY_REQUESTS', message, details, 429);
  },
  
  // 500 Internal Server Error
  internalError: (res, message = '服务器内部错误', details = null) => {
    res.error('INTERNAL_ERROR', message, details, 500);
  },
  
  // 503 Service Unavailable
  serviceUnavailable: (res, message = '服务暂时不可用', details = null) => {
    res.error('SERVICE_UNAVAILABLE', message, details, 503);
  }
};

// 将错误响应方法添加到响应对象
const addErrorMethods = (req, res, next) => {
  Object.keys(errorResponses).forEach(method => {
    res[method] = (message, details) => errorResponses[method](res, message, details);
  });
  next();
};

/**
 * 分页辅助函数
 */
const createPagination = (page, limit, total, data) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    current: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
    count: data ? data.length : 0
  };
};

/**
 * 验证错误格式化
 */
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * API响应状态码常量
 */
const HTTP_STATUS = {
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
};

/**
 * API错误代码常量
 */
const ERROR_CODES = {
  // 通用错误
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // 认证相关
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // 测试相关
  TEST_NOT_FOUND: 'TEST_NOT_FOUND',
  TEST_ALREADY_RUNNING: 'TEST_ALREADY_RUNNING',
  TEST_FAILED: 'TEST_FAILED',
  INVALID_TEST_CONFIG: 'INVALID_TEST_CONFIG',
  TEST_TIMEOUT: 'TEST_TIMEOUT',
  ENGINE_UNAVAILABLE: 'ENGINE_UNAVAILABLE',
  
  // 用户相关
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  
  // 系统相关
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE'
};

module.exports = {
  responseFormatter,
  addErrorMethods,
  createPagination,
  formatValidationErrors,
  HTTP_STATUS,
  ERROR_CODES
};
