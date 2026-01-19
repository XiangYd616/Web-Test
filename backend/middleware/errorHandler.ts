/**
 * 统一错误处理导出
 * 整合所有错误处理功能，提供统一的接口
 * 替代之前分散在多个文件中的错误处理逻辑
 */

import type { NextFunction, Request, Response } from 'express';

const { StandardErrorCode } = require('../../shared/types/standardApiResponse');
const { errorResponseFormatter: errorMiddleware, notFoundHandler } = require('./responseFormatter');
const asyncHandler = require('./asyncHandler');

const ErrorCode = StandardErrorCode;

const ErrorSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

type ErrorSeverityType = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

type ErrorContext = Record<string, unknown>;

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  timestamp?: Date;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

const handleError = (error: AppError, context: ErrorContext = {}) => {
  try {
    console.error('Error handled:', {
      message: error?.message,
      code: error?.code,
      context,
    });
  } catch (_e) {
    // ignore logging failures
  }
  return error;
};

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
  static validationError(message: string, details: unknown = null) {
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
  static businessError(code: string, message: string, details: unknown = null) {
    return ErrorFactory.business(code, message, details);
  }
}

/**
 * API错误类（向后兼容）
 * 替代原来的 utils/ApiError.js
 */
class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;
  public timestamp: Date;

  constructor(
    message: string,
    statusCode = 500,
    code: string | null = null,
    details: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'API_ERROR';
    this.details = details;
    this.timestamp = new Date();
  }

  // 静态工厂方法
  static badRequest(message = '请求参数错误', details: unknown = null) {
    return new ApiError(message, 400, ErrorCode.INVALID_INPUT, details);
  }

  static unauthorized(message = '未授权访问', details: unknown = null) {
    return new ApiError(message, 401, ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(message = '禁止访问', details: unknown = null) {
    return new ApiError(message, 403, ErrorCode.FORBIDDEN, details);
  }

  static notFound(message = '资源未找到', details: unknown = null) {
    return new ApiError(message, 404, ErrorCode.NOT_FOUND, details);
  }

  static conflict(message = '资源冲突', details: unknown = null) {
    return new ApiError(message, 409, ErrorCode.CONFLICT, details);
  }

  static internal(message = '服务器内部错误', details: unknown = null) {
    return new ApiError(message, 500, ErrorCode.INTERNAL_ERROR, details);
  }

  static serviceUnavailable(message = '服务不可用', details: unknown = null) {
    return new ApiError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, details);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

/**
 * 错误工厂类
 */
class ErrorFactory {
  static validation(message: string, details: unknown = null) {
    return new ApiError(message, 400, ErrorCode.INVALID_INPUT, details);
  }

  static unauthorized(message: string, details: unknown = null) {
    return new ApiError(message, 401, ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(message: string, details: unknown = null) {
    return new ApiError(message, 403, ErrorCode.FORBIDDEN, details);
  }

  static notFound(message: string, details: unknown = null) {
    return new ApiError(message, 404, ErrorCode.NOT_FOUND, details);
  }

  static conflict(message: string, details: unknown = null) {
    return new ApiError(message, 409, ErrorCode.CONFLICT, details);
  }

  static business(code: string, message: string, details: unknown = null) {
    return new ApiError(message, 400, code, details);
  }

  static internal(message: string, details: unknown = null) {
    return new ApiError(message, 500, ErrorCode.INTERNAL_ERROR, details);
  }

  static serviceUnavailable(message: string, details: unknown = null) {
    return new ApiError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, details);
  }

  static token(type: string, message?: string, details: unknown = null) {
    const code = type === 'expired' ? ErrorCode.TOKEN_EXPIRED : ErrorCode.INVALID_TOKEN;
    const statusCode = type === 'expired' ? 401 : 401;
    const defaultMessage = type === 'expired' ? '令牌已过期' : '令牌无效';
    return new ApiError(message || defaultMessage, statusCode, code, details);
  }

  static database(operation: string, message: string, details: unknown = null) {
    return new ApiError(message, 500, ErrorCode.DATABASE_ERROR, details);
  }

  static fromError(error: Error) {
    if (error instanceof ApiError) {
      return error;
    }

    // 根据错误类型创建相应的 ApiError
    if ((error as any).code === '23505') {
      return new ApiError('数据冲突', 409, ErrorCode.CONFLICT, error.message);
    }

    if ((error as any).code === '23503') {
      return new ApiError('外键约束失败', 400, ErrorCode.INVALID_INPUT, error.message);
    }

    return new ApiError(error.message || '未知错误', 500, ErrorCode.INTERNAL_ERROR, error.stack);
  }
}

/**
 * 错误日志记录器
 */
class ErrorLogger {
  static log(error: AppError, context: ErrorContext = {}) {
    const logData = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      context,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error),
    };

    if (logData.severity === ErrorSeverity.CRITICAL) {
      console.error('🚨 CRITICAL ERROR:', logData);
    } else if (logData.severity === ErrorSeverity.HIGH) {
      console.error('⚠️  HIGH ERROR:', logData);
    } else if (logData.severity === ErrorSeverity.MEDIUM) {
      console.warn('⚠️  MEDIUM ERROR:', logData);
    } else {
      console.log('ℹ️  LOW ERROR:', logData);
    }
  }

  static determineSeverity(error: AppError): ErrorSeverity {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      return ErrorSeverity.CRITICAL;
    } else if (statusCode === 429) {
      return ErrorSeverity.HIGH;
    } else if (statusCode >= 400) {
      return ErrorSeverity.MEDIUM;
    } else {
      return ErrorSeverity.LOW;
    }
  }
}

/**
 * 增强的错误处理中间件
 */
const enhancedErrorHandler = (error: AppError, req: Request, res: Response, next: NextFunction) => {
  // 记录错误
  ErrorLogger.log(error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id,
  });

  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(error);
  }

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.code || ErrorCode.INTERNAL_ERROR,
      message: error.message || '服务器内部错误',
      details: error.details,
      timestamp: new Date().toISOString(),
    },
  };

  // 在开发环境中包含堆栈跟踪
  if (process.env.NODE_ENV === 'development') {
    (errorResponse.error as any).stack = error.stack;
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

/**
 * 404处理中间件
 */
const notFoundMiddleware = (req: Request, res: Response) => {
  const error = ApiError.notFound(`路径 ${req.originalUrl} 不存在`);

  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
    },
  });
};

/**
 * 异步错误处理包装器
 */
const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export {
  ApiError,
  asyncErrorHandler,
  asyncHandler,
  enhancedErrorHandler,
  ErrorCode,
  ErrorFactory,
  ErrorHandler,
  ErrorLogger,
  errorMiddleware,
  ErrorSeverity,
  handleError,
  notFoundHandler,
  notFoundMiddleware,
};

module.exports = {
  ErrorCode,
  ErrorSeverity,
  ErrorHandler,
  ApiError,
  ErrorFactory,
  ErrorLogger,
  handleError,
  enhancedErrorHandler,
  notFoundMiddleware,
  asyncErrorHandler,
  errorMiddleware,
  notFoundHandler,
  asyncHandler,
};
