// 统一 API 响应类型定义 - 重新导出 API 响应相关类型

// 导入基础类型
import type { ApiError,
  ApiResponse,
  PaginatedResponse,
  PaginationInfo
 } from '../api';import type { ValidationError  } from '../common';// 重新导出所有 API 响应类型'
export type {
  ApiError,
  ApiResponse,
  PaginatedResponse,
  PaginationInfo,
  ValidationError
};

// 重新导出 API 响应工具函数
export {
  extractData,
  extractError
} from '../apiResponse'; // 已修复'
// 错误代码枚举
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR   = 'UNKNOWN_ERROR','
  VALIDATION_ERROR = 'VALIDATION_ERROR','
  NETWORK_ERROR = 'NETWORK_ERROR','
  TIMEOUT_ERROR = 'TIMEOUT_ERROR','
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED','
  FORBIDDEN = 'FORBIDDEN','
  TOKEN_EXPIRED = 'TOKEN_EXPIRED','
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS','
  // 业务错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND','
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT','
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED','
  // 服务器错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR','
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE','
  BAD_GATEWAY = 'BAD_GATEWAY';
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low','
  MEDIUM = 'medium','
  HIGH = 'high','
  CRITICAL = 'critical';
}

// 扩展的 API 错误接口
export interface ApiError extends ApiError     {
  severity?: ErrorSeverity;category?: string;
  context?: Record<string, any>;
  helpUrl?: string;
  correlationId?: string;
}

// API 错误构建器
export class ApiErrorBuilder {
  private error: Partial<ApiError>;

  constructor(code: string, message: string) {
    this.error = {
      code,
      message,
      timestamp: new Date().toISOString()
    };
  }

  withDetails(details: Record<string, any>): this {
    this.error.details = details;
    return this;
  }

  withUserMessage(userMessage: string): this {
    this.error.userMessage = userMessage;
    return this;
  }

  withSeverity(severity: ErrorSeverity): this {
    this.error.severity = severity;
    return this;
  }

  withCategory(category: string): this {
    this.error.category = category;
    return this;
  }

  withContext(context: Record<string, any>): this {
    this.error.context = context;
    return this;
  }

  withHelpUrl(helpUrl: string): this {
    this.error.helpUrl = helpUrl;
    return this;
  }

  withCorrelationId(correlationId: string): this {
    this.error.correlationId = correlationId;
    return this;
  }

  retryable(retryable: boolean = true): this {
    this.error.retryable = retryable;
    return this;
  }

  withStatusCode(statusCode: number): this {
    this.error.statusCode = statusCode;
    return this;
  }

  build(): ApiError {
    return {
      code: this.error.code!,
      message: this.error.message!,
      timestamp: this.error.timestamp!,
      ...this.error
    } as ApiError;
  }
}

// 常用错误创建函数
export const createApiError = {
  validation: (message: string, details?: Record<string, any>) => new ApiErrorBuilder(ErrorCode.VALIDATION_ERROR, message)
      .withDetails(details || {})
      .withSeverity(ErrorSeverity.MEDIUM)
      .withCategory('validation')'
      .build(),

  unauthorized: (message: string = '未授权访问') => new ApiErrorBuilder(ErrorCode.UNAUTHORIZED, message)'
      .withSeverity(ErrorSeverity.HIGH)
      .withCategory('auth')'
      .withStatusCode(401)
      .build(),

  forbidden: (message: string = '访问被禁止') => new ApiErrorBuilder(ErrorCode.FORBIDDEN, message)'
      .withSeverity(ErrorSeverity.HIGH)
      .withCategory('auth')'
      .withStatusCode(403)
      .build(),

  notFound: (message: string = '资源不存在') => new ApiErrorBuilder(ErrorCode.RESOURCE_NOT_FOUND, message)'
      .withSeverity(ErrorSeverity.MEDIUM)
      .withCategory('resource')'
      .withStatusCode(404)
      .build(),

  conflict: (message: string = '资源冲突') => new ApiErrorBuilder(ErrorCode.RESOURCE_CONFLICT, message)'
      .withSeverity(ErrorSeverity.MEDIUM)
      .withCategory('resource')'
      .withStatusCode(409)
      .build(),

  rateLimit: (message: string = '请求过于频繁') => new ApiErrorBuilder(ErrorCode.RATE_LIMIT_EXCEEDED, message)'
      .withSeverity(ErrorSeverity.HIGH)
      .withCategory('rate_limit')'
      .withStatusCode(429)
      .retryable(true)
      .build(),

  network: (message: string = '网络连接失败') => new ApiErrorBuilder(ErrorCode.NETWORK_ERROR, message)'
      .withSeverity(ErrorSeverity.HIGH)
      .withCategory('network')'
      .retryable(true)
      .build(),

  timeout: (message: string = '请求超时') => new ApiErrorBuilder(ErrorCode.TIMEOUT_ERROR, message)'
      .withSeverity(ErrorSeverity.MEDIUM)
      .withCategory('timeout')'
      .retryable(true)
      .build(),

  internal: (message: string = '服务器内部错误') => new ApiErrorBuilder(ErrorCode.INTERNAL_SERVER_ERROR, message)'
      .withSeverity(ErrorSeverity.CRITICAL)
      .withCategory('server')'
      .withStatusCode(500)
      .build(),

  serviceUnavailable: (message: string = '服务暂不可用') => new ApiErrorBuilder(ErrorCode.SERVICE_UNAVAILABLE, message)'
      .withSeverity(ErrorSeverity.HIGH)
      .withCategory('server')'
      .withStatusCode(503)
      .retryable(true)
      .build()
};

// 默认导出
export default {
  ErrorCode,
  ErrorSeverity,
  ApiErrorBuilder,
  createApiError
};
