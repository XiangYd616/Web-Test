/**
 * 统一错误处理系统
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 * 
 * 此文件整合了所有重复的错误处理逻辑：
 * - backend/middleware/errorHandler.js
 * - backend/api/middleware/errorHandler.js
 * - backend/utils/errorHandler.js
 * - frontend/services/errorService.ts
 * - frontend/services/api/errorHandler.ts
 * - frontend/services/api/apiErrorHandler.ts
 */

import type { ApiErrorResponse, ApiMeta } from '../types/unifiedTypes';

// ==================== 错误代码枚举 ====================

export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 认证和授权错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_MISSING = 'TOKEN_MISSING',

  // 资源错误
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // 网络和连接错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',

  // 测试相关错误
  TEST_CONFIGURATION_ERROR = 'TEST_CONFIGURATION_ERROR',
  TEST_EXECUTION_ERROR = 'TEST_EXECUTION_ERROR',
  TEST_TIMEOUT = 'TEST_TIMEOUT',
  ENGINE_UNAVAILABLE = 'ENGINE_UNAVAILABLE',

  // 业务逻辑错误
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ==================== 错误接口定义 ====================

export interface StandardError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  retryable: boolean;
  userFriendlyMessage: string;
  suggestions?: string[];
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  operation?: string;
  phase?: 'request' | 'response' | 'processing' | 'validation';
  [key: string]: any;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  enableUserNotification: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ==================== 错误映射配置 ====================

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.TOKEN_MISSING]: 401,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE_RESOURCE]: 409,
  [ErrorCode.NETWORK_ERROR]: 503,
  [ErrorCode.TIMEOUT_ERROR]: 408,
  [ErrorCode.CONNECTION_ERROR]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.FOREIGN_KEY_VIOLATION]: 400,
  [ErrorCode.UNIQUE_CONSTRAINT_VIOLATION]: 409,
  [ErrorCode.TEST_CONFIGURATION_ERROR]: 400,
  [ErrorCode.TEST_EXECUTION_ERROR]: 500,
  [ErrorCode.TEST_TIMEOUT]: 408,
  [ErrorCode.ENGINE_UNAVAILABLE]: 503,
  [ErrorCode.BUSINESS_LOGIC_ERROR]: 400,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429
};

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.UNAUTHORIZED]: '未授权访问',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.TOKEN_EXPIRED]: '访问令牌已过期',
  [ErrorCode.TOKEN_INVALID]: '无效的访问令牌',
  [ErrorCode.TOKEN_MISSING]: '缺少访问令牌',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  [ErrorCode.DUPLICATE_RESOURCE]: '资源已存在',
  [ErrorCode.NETWORK_ERROR]: '网络连接错误',
  [ErrorCode.TIMEOUT_ERROR]: '请求超时',
  [ErrorCode.CONNECTION_ERROR]: '连接失败',
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.FOREIGN_KEY_VIOLATION]: '外键约束违反',
  [ErrorCode.UNIQUE_CONSTRAINT_VIOLATION]: '唯一约束违反',
  [ErrorCode.TEST_CONFIGURATION_ERROR]: '测试配置错误',
  [ErrorCode.TEST_EXECUTION_ERROR]: '测试执行失败',
  [ErrorCode.TEST_TIMEOUT]: '测试超时',
  [ErrorCode.ENGINE_UNAVAILABLE]: '测试引擎不可用',
  [ErrorCode.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
  [ErrorCode.QUOTA_EXCEEDED]: '配额已用完'
};

const RETRYABLE_ERRORS = new Set([
  ErrorCode.NETWORK_ERROR,
  ErrorCode.TIMEOUT_ERROR,
  ErrorCode.CONNECTION_ERROR,
  ErrorCode.INTERNAL_SERVER_ERROR,
  ErrorCode.ENGINE_UNAVAILABLE
]);

// ==================== 统一错误处理器类 ====================

export class UnifiedErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: StandardError[] = [];
  private retryAttempts = new Map<string, number>();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: false,
      enableUserNotification: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      logLevel: 'error',
      ...config
    };
  }

  /**
   * 处理错误的主要方法
   */
  handleError(error: any, context: ErrorContext = {}): StandardError {
    const standardError = this.standardizeError(error, context);

    // 记录错误
    if (this.config.enableLogging) {
      this.logError(standardError);
    }

    // 添加到历史记录
    this.addToHistory(standardError);

    // 显示用户通知（前端环境）
    if (this.config.enableUserNotification && typeof window !== 'undefined') {
      this.showUserNotification(standardError);
    }

    // 报告错误（如果启用）
    if (this.config.enableReporting) {
      this.reportError(standardError, context);
    }

    return standardError;
  }

  /**
   * 标准化错误对象
   */
  private standardizeError(error: any, context: ErrorContext): StandardError {
    let code = ErrorCode.UNKNOWN_ERROR;
    let message = '未知错误';
    let severity = ErrorSeverity.MEDIUM;
    let stack: string | undefined;

    // 解析错误类型和代码
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;

      // 根据错误名称或属性确定错误代码
      code = this.mapErrorToCode(error);
      severity = this.determineSeverity(code);
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      code = error.code || ErrorCode.UNKNOWN_ERROR;
      message = error.message || message;
      severity = error.severity || severity;
    }

    return {
      code,
      message,
      severity,
      timestamp: new Date().toISOString(),
      context,
      stack,
      retryable: RETRYABLE_ERRORS.has(code),
      userFriendlyMessage: ERROR_MESSAGES[code] || message,
      suggestions: this.generateSuggestions(code)
    };
  }

  /**
   * 映射错误到错误代码
   */
  private mapErrorToCode(error: Error): ErrorCode {
    // JWT错误
    if (error.name === 'TokenExpiredError') return ErrorCode.TOKEN_EXPIRED;
    if (error.name === 'JsonWebTokenError') return ErrorCode.TOKEN_INVALID;

    // 验证错误
    if (error.name === 'ValidationError') return ErrorCode.VALIDATION_ERROR;

    // 网络错误
    if ('code' in error) {
      const errorCode = (error as any).code;
      if (errorCode === 'ECONNREFUSED') return ErrorCode.CONNECTION_ERROR;
      if (errorCode === 'ETIMEDOUT') return ErrorCode.TIMEOUT_ERROR;
      if (errorCode === 'ENOTFOUND') return ErrorCode.NETWORK_ERROR;
    }

    // 数据库错误
    if ('code' in error) {
      const dbCode = (error as any).code;
      if (dbCode === '23505') return ErrorCode.UNIQUE_CONSTRAINT_VIOLATION;
      if (dbCode === '23503') return ErrorCode.FOREIGN_KEY_VIOLATION;
    }

    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(code: ErrorCode): ErrorSeverity {
    const criticalErrors = [
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCode.DATABASE_ERROR
    ];

    const highErrors = [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.TEST_EXECUTION_ERROR
    ];

    const lowErrors = [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.BAD_REQUEST,
      ErrorCode.NOT_FOUND
    ];

    if (criticalErrors.includes(code)) return ErrorSeverity.CRITICAL;
    if (highErrors.includes(code)) return ErrorSeverity.HIGH;
    if (lowErrors.includes(code)) return ErrorSeverity.LOW;

    return ErrorSeverity.MEDIUM;
  }

  /**
   * 生成错误建议
   */
  private generateSuggestions(code: ErrorCode): string[] {
    const suggestions: Partial<Record<ErrorCode, string[]>> = {
      [ErrorCode.TOKEN_EXPIRED]: ['请重新登录', '检查系统时间是否正确'],
      [ErrorCode.NETWORK_ERROR]: ['检查网络连接', '稍后重试'],
      [ErrorCode.VALIDATION_ERROR]: ['检查输入数据格式', '确保必填字段已填写'],
      [ErrorCode.NOT_FOUND]: ['检查URL是否正确', '确认资源是否存在'],
      [ErrorCode.RATE_LIMIT_EXCEEDED]: ['降低请求频率', '稍后重试']
    };

    return suggestions[code] || ['请联系技术支持'];
  }

  /**
   * 记录错误日志
   */
  private logError(error: StandardError): void {
    const logLevel = this.config.logLevel;
    const logMessage = `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`;

    if (typeof console !== 'undefined') {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
        case ErrorSeverity.HIGH:
          console.error(logMessage, error);
          break;
        case ErrorSeverity.MEDIUM:
          console.warn(logMessage, error);
          break;
        case ErrorSeverity.LOW:
          console.info(logMessage, error);
          break;
      }
    }
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(error: StandardError): void {
    this.errorHistory.push(error);

    // 保持历史记录在合理范围内
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
  }

  /**
   * 显示用户通知（前端）
   */
  private showUserNotification(error: StandardError): void {
    // 这里可以集成具体的通知系统
    if (typeof window !== 'undefined' && error.severity !== ErrorSeverity.LOW) {
      console.warn('用户通知:', error.userFriendlyMessage);
    }
  }

  /**
   * 报告错误到外部系统
   */
  private async reportError(error: StandardError, context: ErrorContext): Promise<void> {
    try {
      // 这里可以集成错误报告服务
      console.log('报告错误:', { error, context });
    } catch (reportError) {
      console.error('错误报告失败:', reportError);
    }
  }

  /**
   * 获取HTTP状态码
   */
  getHttpStatusCode(code: ErrorCode): number {
    return ERROR_STATUS_MAP[code] || 500;
  }

  /**
   * 创建API错误响应
   */
  createApiErrorResponse(error: StandardError, meta: Partial<ApiMeta>): ApiErrorResponse {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userFriendlyMessage,
        details: error.context
      },
      meta: {
        timestamp: error.timestamp,
        requestId: meta.requestId || 'unknown',
        path: meta.path || '',
        method: meta.method || '',
        version: meta.version || '2.0.0',
        ...meta
      }
    };
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error: StandardError, requestId?: string): boolean {
    if (!this.config.enableRetry || !error.retryable) {
      return false;
    }

    if (requestId) {
      const attempts = this.retryAttempts.get(requestId) || 0;
      if (attempts >= this.config.maxRetries) {
        return false;
      }
      this.retryAttempts.set(requestId, attempts + 1);
    }

    return true;
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): StandardError[] {
    return [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }
}

// ==================== 默认实例和便捷方法 ====================

export const unifiedErrorHandler = new UnifiedErrorHandler();

export const handleError = (error: any, context?: ErrorContext) =>
  unifiedErrorHandler.handleError(error, context);

export const createApiError = (code: ErrorCode, message?: string, context?: ErrorContext) => {
  const error = new Error(message || ERROR_MESSAGES[code]);
  (error as any).code = code;
  return unifiedErrorHandler.handleError(error, context);
};

export default unifiedErrorHandler;
