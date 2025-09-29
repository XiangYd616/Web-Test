/**
 * API错误处理工具
 * 提供统一的错误创建和处理功能
 */

/**
 * 错误代码枚举
 */
const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  
  // 认证错误
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // 用户错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // 资源错误
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // 数据库错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  
  // 测试错误
  TEST_CONFIGURATION_ERROR: 'TEST_CONFIGURATION_ERROR',
  TEST_EXECUTION_ERROR: 'TEST_EXECUTION_ERROR'
};

/**
 * API错误类
 */
class ApiError extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * 错误工厂类
 */
class ErrorFactory {
  /**
   * 从普通错误创建API错误
   */
  static fromError(error) {
    if (error instanceof ApiError) {
      
        return error;
      }

    // 数据库错误
    if (error.name === 'SequelizeError' || error.name === 'SequelizeDatabaseError') {
      
        return new ApiError(
        ErrorCodes.DATABASE_ERROR,
        '数据库操作失败',
        500,
        { originalError: error.message
      }
      );
    }

    // 验证错误
    if (error.name === 'ValidationError') {
      
        return new ApiError(
        ErrorCodes.VALIDATION_ERROR,
        error.message || '数据验证失败',
        400,
        error.details
      );
      }

    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      
        return new ApiError(
        ErrorCodes.CONNECTION_ERROR,
        '连接失败',
        503,
        { code: error.code
      }
      );
    }

    // 超时错误
    if (error.code === 'ETIMEDOUT') {
      
        return new ApiError(
        ErrorCodes.TIMEOUT_ERROR,
        '请求超时',
        408,
        { code: error.code
      }
      );
    }

    // 默认错误
    return new ApiError(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      error.message || '内部服务器错误',
      500,
      { originalError: error.message }
    );
  }

  /**
   * 创建认证错误
   */
  static auth(type, message, details = null) {
    const errorMap = {
      'token_missing': { code: ErrorCodes.TOKEN_MISSING, status: 401, msg: '缺少访问令牌' },
      'token_invalid': { code: ErrorCodes.TOKEN_INVALID, status: 401, msg: '无效的访问令牌' },
      'token_expired': { code: ErrorCodes.TOKEN_EXPIRED, status: 401, msg: '访问令牌已过期' },
      'user_not_found': { code: ErrorCodes.USER_NOT_FOUND, status: 404, msg: '用户不存在' },
      'user_inactive': { code: ErrorCodes.USER_INACTIVE, status: 403, msg: '用户账户已禁用' },
      'insufficient_permissions': { code: ErrorCodes.INSUFFICIENT_PERMISSIONS, status: 403, msg: '权限不足' }
    };

    const errorInfo = errorMap[type] || errorMap['token_invalid'];
    return new ApiError(errorInfo.code, message || errorInfo.msg, errorInfo.status, details);
  }

  /**
   * 创建验证错误
   */
  static validation(message, details = null) {
    return new ApiError(ErrorCodes.VALIDATION_ERROR, message || '数据验证失败', 400, details);
  }

  /**
   * 创建资源错误
   */
  static resource(type, message, details = null) {
    const errorMap = {
      'not_found': { code: ErrorCodes.RESOURCE_NOT_FOUND, status: 404, msg: '资源不存在' },
      'conflict': { code: ErrorCodes.RESOURCE_CONFLICT, status: 409, msg: '资源冲突' }
    };

    const errorInfo = errorMap[type] || errorMap['not_found'];
    return new ApiError(errorInfo.code, message || errorInfo.msg, errorInfo.status, details);
  }

  /**
   * 创建文件错误
   */
  static file(type, message, details = null) {
    const errorMap = {
      'not_found': { code: ErrorCodes.FILE_NOT_FOUND, status: 404, msg: '文件不存在' },
      'tooLarge': { code: ErrorCodes.FILE_TOO_LARGE, status: 413, msg: '文件过大' },
      'invalidType': { code: ErrorCodes.INVALID_FILE_TYPE, status: 400, msg: '文件类型无效' }
    };

    const errorInfo = errorMap[type] || errorMap['not_found'];
    return new ApiError(errorInfo.code, message || errorInfo.msg, errorInfo.status, details);
  }

  /**
   * 创建测试错误
   */
  static test(type, message, details = null) {
    const errorMap = {
      'configuration': { code: ErrorCodes.TEST_CONFIGURATION_ERROR, status: 400, msg: '测试配置错误' },
      'execution': { code: ErrorCodes.TEST_EXECUTION_ERROR, status: 500, msg: '测试执行失败' }
    };

    const errorInfo = errorMap[type] || errorMap['execution'];
    return new ApiError(errorInfo.code, message || errorInfo.msg, errorInfo.status, details);
  }

  /**
   * 创建数据库错误
   */
  static database(message, details = null) {
    return new ApiError(ErrorCodes.DATABASE_ERROR, message || '数据库操作失败', 500, details);
  }

  /**
   * 创建网络错误
   */
  static network(message, details = null) {
    return new ApiError(ErrorCodes.NETWORK_ERROR, message || '网络连接失败', 503, details);
  }
}

/**
 * 错误工具类
 */
class ErrorUtils {
  /**
   * 记录错误日志
   */
  static logError(error, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      },
      context
    };

    console.error('API Error:', JSON.stringify(logData, null, 2));
  }

  /**
   * 检查是否为API错误
   */
  static isApiError(error) {
    return error instanceof ApiError;
  }

  /**
   * 获取错误状态码
   */
  static getStatusCode(error) {
    if (error instanceof ApiError) {
      
        return error.statusCode;
      }
    return 500;
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserFriendlyMessage(error) {
    if (error instanceof ApiError) {
      
        return error.message;
      }
    return '服务器内部错误，请稍后重试';
  }
}

module.exports = {
  ApiError,
  ErrorFactory,
  ErrorUtils,
  ErrorCodes
};
