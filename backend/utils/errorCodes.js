/**
 * 错误代码定义模块
 * 提供统一的错误代码体系
 */

const ERROR_CODES = {
  // 通用错误 (1000-1999)
  INTERNAL_ERROR: {
    code: 1000,
    message: 'Internal server error',
    httpStatus: 500
  },
  VALIDATION_ERROR: {
    code: 1001,
    message: 'Validation error',
    httpStatus: 400
  },
  NOT_FOUND: {
    code: 1002,
    message: 'Resource not found',
    httpStatus: 404
  },
  BAD_REQUEST: {
    code: 1003,
    message: 'Bad request',
    httpStatus: 400
  },
  UNAUTHORIZED: {
    code: 1004,
    message: 'Unauthorized',
    httpStatus: 401
  },
  FORBIDDEN: {
    code: 1005,
    message: 'Forbidden',
    httpStatus: 403
  },
  CONFLICT: {
    code: 1006,
    message: 'Resource conflict',
    httpStatus: 409
  },
  TOO_MANY_REQUESTS: {
    code: 1007,
    message: 'Too many requests',
    httpStatus: 429
  },
  SERVICE_UNAVAILABLE: {
    code: 1008,
    message: 'Service unavailable',
    httpStatus: 503
  },

  // 认证错误 (2000-2099)
  AUTH_INVALID_CREDENTIALS: {
    code: 2000,
    message: 'Invalid credentials',
    httpStatus: 401
  },
  AUTH_TOKEN_EXPIRED: {
    code: 2001,
    message: 'Token expired',
    httpStatus: 401
  },
  AUTH_TOKEN_INVALID: {
    code: 2002,
    message: 'Invalid token',
    httpStatus: 401
  },
  AUTH_TOKEN_MISSING: {
    code: 2003,
    message: 'Token missing',
    httpStatus: 401
  },
  AUTH_USER_NOT_FOUND: {
    code: 2004,
    message: 'User not found',
    httpStatus: 404
  },
  AUTH_EMAIL_EXISTS: {
    code: 2005,
    message: 'Email already exists',
    httpStatus: 409
  },
  AUTH_PASSWORD_MISMATCH: {
    code: 2006,
    message: 'Password mismatch',
    httpStatus: 400
  },
  AUTH_ACCOUNT_LOCKED: {
    code: 2007,
    message: 'Account locked',
    httpStatus: 403
  },
  AUTH_EMAIL_NOT_VERIFIED: {
    code: 2008,
    message: 'Email not verified',
    httpStatus: 403
  },
  AUTH_MFA_REQUIRED: {
    code: 2009,
    message: 'MFA verification required',
    httpStatus: 401
  },
  AUTH_MFA_INVALID: {
    code: 2010,
    message: 'Invalid MFA code',
    httpStatus: 401
  },

  // 数据库错误 (3000-3099)
  DB_CONNECTION_ERROR: {
    code: 3000,
    message: 'Database connection error',
    httpStatus: 503
  },
  DB_QUERY_ERROR: {
    code: 3001,
    message: 'Database query error',
    httpStatus: 500
  },
  DB_CONSTRAINT_VIOLATION: {
    code: 3002,
    message: 'Database constraint violation',
    httpStatus: 409
  },
  DB_TRANSACTION_ERROR: {
    code: 3003,
    message: 'Transaction error',
    httpStatus: 500
  },

  // 测试相关错误 (4000-4099)
  TEST_NOT_FOUND: {
    code: 4000,
    message: 'Test not found',
    httpStatus: 404
  },
  TEST_ALREADY_RUNNING: {
    code: 4001,
    message: 'Test already running',
    httpStatus: 409
  },
  TEST_EXECUTION_FAILED: {
    code: 4002,
    message: 'Test execution failed',
    httpStatus: 500
  },
  TEST_INVALID_CONFIG: {
    code: 4003,
    message: 'Invalid test configuration',
    httpStatus: 400
  },
  TEST_TIMEOUT: {
    code: 4004,
    message: 'Test timeout',
    httpStatus: 408
  },
  TEST_CANCELLED: {
    code: 4005,
    message: 'Test cancelled',
    httpStatus: 200
  },
  TEST_QUOTA_EXCEEDED: {
    code: 4006,
    message: 'Test quota exceeded',
    httpStatus: 429
  },

  // 文件操作错误 (5000-5099)
  FILE_NOT_FOUND: {
    code: 5000,
    message: 'File not found',
    httpStatus: 404
  },
  FILE_UPLOAD_ERROR: {
    code: 5001,
    message: 'File upload error',
    httpStatus: 500
  },
  FILE_TOO_LARGE: {
    code: 5002,
    message: 'File too large',
    httpStatus: 413
  },
  FILE_INVALID_FORMAT: {
    code: 5003,
    message: 'Invalid file format',
    httpStatus: 400
  },
  FILE_PERMISSION_DENIED: {
    code: 5004,
    message: 'File permission denied',
    httpStatus: 403
  },

  // 缓存错误 (6000-6099)
  CACHE_CONNECTION_ERROR: {
    code: 6000,
    message: 'Cache connection error',
    httpStatus: 503
  },
  CACHE_SET_ERROR: {
    code: 6001,
    message: 'Cache set error',
    httpStatus: 500
  },
  CACHE_GET_ERROR: {
    code: 6002,
    message: 'Cache get error',
    httpStatus: 500
  },

  // 外部服务错误 (7000-7099)
  EXTERNAL_SERVICE_ERROR: {
    code: 7000,
    message: 'External service error',
    httpStatus: 502
  },
  EXTERNAL_SERVICE_TIMEOUT: {
    code: 7001,
    message: 'External service timeout',
    httpStatus: 504
  },
  EXTERNAL_API_RATE_LIMIT: {
    code: 7002,
    message: 'External API rate limit exceeded',
    httpStatus: 429
  },

  // 配置错误 (8000-8099)
  CONFIG_INVALID: {
    code: 8000,
    message: 'Invalid configuration',
    httpStatus: 500
  },
  CONFIG_MISSING: {
    code: 8001,
    message: 'Missing configuration',
    httpStatus: 500
  },

  // 网络错误 (9000-9099)
  NETWORK_ERROR: {
    code: 9000,
    message: 'Network error',
    httpStatus: 500
  },
  NETWORK_TIMEOUT: {
    code: 9001,
    message: 'Network timeout',
    httpStatus: 504
  },
  PROXY_ERROR: {
    code: 9002,
    message: 'Proxy error',
    httpStatus: 502
  }
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(errorCode, details = null, originalError = null) {
    const errorDef = ERROR_CODES[errorCode] || ERROR_CODES.INTERNAL_ERROR;
    
    super(errorDef.message);
    
    this.name = 'AppError';
    this.code = errorDef.code;
    this.httpStatus = errorDef.httpStatus;
    this.details = details;
    this.originalError = originalError;
    
    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * 根据错误代码创建错误
 */
function createError(errorCode, details = null, originalError = null) {
  return new AppError(errorCode, details, originalError);
}

/**
 * 检查是否为AppError
 */
function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  ERROR_CODES,
  AppError,
  createError,
  isAppError
};

