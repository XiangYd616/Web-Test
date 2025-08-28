/**
 * 统一API错误处理器
 * 版本: v2.0.0
 */

import type { ApiError, ApiResponse } from '../../types/unified/apiResponse.types';
import { ErrorCode } from '../../types/unified/apiResponse.types';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// 错误处理器接口
export interface ErrorHandler {
  handle(error: any): ApiError;
  canHandle(error: any): boolean;
}

// 网络错误处理器
export class NetworkErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.name === 'NetworkError' || error.code === 'NETWORK_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: '网络连接失败，请检查网络设置',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 验证错误处理器
export class ValidationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 400 || error.code === 'VALIDATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: error.message || '请求参数验证失败',
      details: error.details || error.errors,
      timestamp: new Date().toISOString()
    };
  }
}

// 认证错误处理器
export class AuthenticationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 401 || error.code === 'AUTHENTICATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.UNAUTHORIZED,
      message: '身份验证失败，请重新登录',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 授权错误处理器
export class AuthorizationErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 403 || error.code === 'AUTHORIZATION_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.FORBIDDEN,
      message: '权限不足，无法执行此操作',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 404错误处理器
export class NotFoundErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status === 404 || error.code === 'NOT_FOUND';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.NOT_FOUND,
      message: '请求的资源不存在',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 服务器错误处理器
export class ServerErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.status >= 500 || error.code === 'SERVER_ERROR';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误，请稍后重试',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 超时错误处理器
export class TimeoutErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return error.name === 'TimeoutError' || error.code === 'TIMEOUT';
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: '请求超时，请稍后重试',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 默认错误处理器
export class DefaultErrorHandler implements ErrorHandler {
  canHandle(error: any): boolean {
    return true;
  }

  handle(error: any): ApiError {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || '未知错误',
      details: error,
      timestamp: new Date().toISOString()
    };
  }
}

// 统一错误处理器
export class UnifiedErrorHandler {
  private handlers: ErrorHandler[] = [
    new NetworkErrorHandler(),
    new ValidationErrorHandler(),
    new AuthenticationErrorHandler(),
    new AuthorizationErrorHandler(),
    new NotFoundErrorHandler(),
    new ServerErrorHandler(),
    new TimeoutErrorHandler(),
    new DefaultErrorHandler()
  ];

  handle(error: any): ApiError {
    const handler = this.handlers.find(h => h.canHandle(error));
    return handler!.handle(error);
  }

  createErrorResponse<T = never>(error: any): ApiResponse<T> {
    const apiError = this.handle(error);
    return {
      success: false,
      error: apiError.message,
      meta: {
        timestamp: apiError.timestamp,
        code: apiError.code,
        details: apiError.details
      }
    };
  }
}

// 导出默认实例
export const errorHandler = new UnifiedErrorHandler();

// 导出所有类型和类已在上面完成

