/**
 * 统一API错误处理服务
 * 提供重试机制、用户友好的错误提示和错误分析功能
 * 版本: v2.0.0 - 完善的错误处理和重试机制
 */

import { ApiError, ErrorCode } from '../../types/unified/apiResponse';
import type { ErrorContext as UtilsErrorContext } from '../../utils/errorHandler';

// 错误处理配置
export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  enableLogging: boolean;
  retryableErrors: ErrorCode[];
  userFriendlyMessages: Record<ErrorCode, string>;
}

// 重试策略配置
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
}

// 扩展的错误上下文
export interface ErrorContext extends UtilsErrorContext {
  requestId: string;
  method?: string;
  userId?: string;
  retryCount?: number;
}

// 错误处理结果
export interface ErrorHandlingResult {
  shouldRetry: boolean;
  userMessage: string;
  error: ApiError;
  context: ErrorContext;
  enhancedError?: any; // 来自utils/errorHandler的增强错误
}

// 默认配置
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  enableLogging: true,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'SERVICE_UNAVAILABLE',
    'CONNECTION_ERROR'
  ] as ErrorCode[],
  userFriendlyMessages: {
    [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络设置后重试',
    [ErrorCode.TIMEOUT_ERROR]: '请求超时，请稍后重试',
    [ErrorCode.INTERNAL_SERVER_ERROR]: '服务器暂时不可用，请稍后重试',
    [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
    [ErrorCode.CONNECTION_ERROR]: '连接失败，请检查网络连接',
    [ErrorCode.UNAUTHORIZED]: '用户名或密码错误，请重新输入',
    [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
    [ErrorCode.INVALID_TOKEN]: '登录状态无效，请重新登录',
    [ErrorCode.FORBIDDEN]: '权限不足，无法执行此操作',
    [ErrorCode.NOT_FOUND]: '请求的资源不存在或已被删除',
    [ErrorCode.VALIDATION_ERROR]: '输入信息有误，请检查后重试',
    [ErrorCode.BAD_REQUEST]: '请求参数错误',
    [ErrorCode.CONFLICT]: '数据冲突',
    [ErrorCode.METHOD_NOT_ALLOWED]: '不支持的操作方法',
    [ErrorCode.UNPROCESSABLE_ENTITY]: '数据验证失败',
    [ErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后重试',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁，请稍后重试',
    [ErrorCode.QUOTA_EXCEEDED]: '已达到使用限额，请升级账户或稍后重试',
    [ErrorCode.RESOURCE_LOCKED]: '资源被锁定，请稍后重试',
    [ErrorCode.UNKNOWN_ERROR]: '发生未知错误，请稍后重试或联系技术支持'
  } as Record<ErrorCode, string>
};

export class ApiErrorHandler {
  private config: ErrorHandlerConfig;
  private retryCount: Map<string, number> = new Map();

  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  private errorHistory: Map<string, ErrorContext[]> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 处理API错误 - 主要入口点
   */
  async handleError(
    error: any,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorHandlingResult> {
    const errorContext: ErrorContext = {
      requestId: context.requestId || this.generateRequestId(),
      url: context.url,
      method: context.method,
      timestamp: context.timestamp || Date.now(),
      userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
      userId: context.userId,
      operation: context.operation,
      retryCount: this.retryCount.get(context.requestId || '') || 0
    };

    // 标准化错误
    const apiError = this.normalizeError(error, errorContext);

    // 获取用户友好消息
    const userMessage = this.getUserFriendlyMessage(apiError.code);

    // 判断是否应该重试
    const shouldRetry = this.shouldRetryRequest(apiError.code, errorContext.requestId);

    // 创建增强错误信息
    const enhancedError = {
      ...error,
      url: errorContext.url,
      operation: errorContext.operation,
      userAgent: errorContext.userAgent,
      timestamp: errorContext.timestamp
    };

    // 记录错误历史
    this.recordErrorHistory(errorContext, apiError);

    // 记录错误日志
    if (this.config.enableLogging) {
      this.logError(apiError, errorContext);
    }

    return {
      shouldRetry,
      userMessage,
      error: apiError,
      context: errorContext,
      enhancedError
    };
  }

  /**
   * 执行带重试的请求
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const requestId = context.requestId || this.generateRequestId();
    const finalContext = { ...context, requestId };

    const retry: RetryConfig = {
      maxRetries: retryConfig?.maxRetries ?? this.config.maxRetries,
      baseDelay: retryConfig?.baseDelay ?? this.config.retryDelay,
      maxDelay: retryConfig?.maxDelay ?? 30000,
      exponentialBackoff: retryConfig?.exponentialBackoff ?? this.config.exponentialBackoff,
      jitter: retryConfig?.jitter ?? true
    };

    let lastError: any;
    const maxAttempts = retry.maxRetries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await requestFn();
        // 成功后清除重试计数
        this.retryCount.delete(requestId);
        return result;
      } catch (error) {
        lastError = error;

        const { shouldRetry } = await this.handleError(error, {
          ...finalContext,
          retryCount: attempt - 1
        });

        if (!shouldRetry || attempt === maxAttempts) {
          break;
        }

        // 计算延迟时间
        const delay = this.calculateRetryDelay(attempt, retry);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any, context: ErrorContext): ApiError {
    // 如果已经是标准化的API错误
    if (error.code && error.message) {
      return {
        ...error,
        context: { ...error.context, ...context }
      } as ApiError;
    }

    // 网络相关错误
    if (this.isNetworkError(error)) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: '网络连接失败',
        details: {
          originalError: error.message,
          type: error.name,
          stack: error.stack
        },
        context,
        timestamp: new Date().toISOString(),
        retryable: true
      };
    }

    // 超时错误
    if (this.isTimeoutError(error)) {
      return {
        code: ErrorCode.TIMEOUT_ERROR,
        message: '请求超时',
        details: {
          timeout: error.timeout,
          originalError: error.message
        },
        context,
        timestamp: new Date().toISOString(),
        retryable: true
      };
    }

    // HTTP响应错误
    if (error.response) {
      return this.normalizeHttpError(error, context);
    }

    // 默认未知错误
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || '未知错误',
      details: {
        originalError: error,
        type: error.name,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      retryable: false
    };
  }

  /**
   * 标准化HTTP错误
   */
  private normalizeHttpError(error: any, context: ErrorContext): ApiError {
    const status = error.response.status;
    const data = error.response.data;

    // 如果响应包含标准化的错误格式
    if (data && data.error && data.error.code) {
      return {
        ...data.error,
        context,
        retryable: this.isRetryableHttpStatus(status)
      };
    }

    // 根据HTTP状态码映射错误
    const errorMapping: Record<number, { code: ErrorCode; message: string; retryable: boolean }> = {
      400: { code: ErrorCode.BAD_REQUEST, message: '请求参数错误', retryable: false },
      401: { code: ErrorCode.UNAUTHORIZED, message: '认证失败', retryable: false },
      403: { code: ErrorCode.FORBIDDEN, message: '权限不足', retryable: false },
      404: { code: ErrorCode.NOT_FOUND, message: '资源不存在', retryable: false },
      409: { code: ErrorCode.CONFLICT, message: '数据冲突', retryable: false },
      413: { code: ErrorCode.UNPROCESSABLE_ENTITY, message: '请求体过大', retryable: false },
      415: { code: ErrorCode.UNPROCESSABLE_ENTITY, message: '不支持的媒体类型', retryable: false },
      422: { code: ErrorCode.UNPROCESSABLE_ENTITY, message: '数据验证失败', retryable: false },
      429: { code: ErrorCode.TOO_MANY_REQUESTS, message: '请求过于频繁', retryable: true },
      500: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: '服务器内部错误', retryable: true },
      502: { code: ErrorCode.SERVICE_UNAVAILABLE, message: '网关错误', retryable: true },
      503: { code: ErrorCode.SERVICE_UNAVAILABLE, message: '服务不可用', retryable: true },
      504: { code: ErrorCode.TIMEOUT_ERROR, message: '网关超时', retryable: true }
    };

    const errorInfo = errorMapping[status] || {
      code: ErrorCode.UNKNOWN_ERROR,
      message: `HTTP ${status} 错误`,
      retryable: status >= 500
    };

    return {
      code: errorInfo.code,
      message: errorInfo.message,
      details: {
        status,
        statusText: error.response.statusText,
        data: data,
        headers: error.response.headers
      },
      context,
      timestamp: new Date().toISOString(),
      retryable: errorInfo.retryable
    };
  }

  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: any): boolean {
    return (
      error.name === 'NetworkError' ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('fetch')
    );
  }

  /**
   * 检查是否为超时错误
   */
  private isTimeoutError(error: any): boolean {
    return (
      error.name === 'TimeoutError' ||
      error.code === 'TIMEOUT' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout')
    );
  }

  /**
   * 检查HTTP状态码是否可重试
   */
  private isRetryableHttpStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * 获取用户友好的错误消息
   */
  public getUserFriendlyMessage(errorCode: ErrorCode): string {
    return this.config.userFriendlyMessages[errorCode] || this.config.userFriendlyMessages[ErrorCode.UNKNOWN_ERROR];
  }

  /**
   * 判断是否应该重试请求
   */
  private shouldRetryRequest(errorCode: ErrorCode, requestId: string): boolean {
    // 检查错误类型是否可重试
    if (!this.config.retryableErrors.includes(errorCode)) {
      return false;
    }

    // 检查重试次数
    const currentRetries = this.retryCount.get(requestId) || 0;
    if (currentRetries >= this.config.maxRetries) {
      return false;
    }

    // 增加重试计数
    this.retryCount.set(requestId, currentRetries + 1);
    return true;
  }

  /**
   * 计算重试延迟时间
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay;

    if (config.exponentialBackoff) {
      delay = Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay);
    }

    // 添加抖动以避免雷群效应
    if (config.jitter) {
      delay += Math.random() * 1000;
    }

    return delay;
  }

  /**
   * 记录错误历史
   */
  private recordErrorHistory(context: ErrorContext, error: ApiError): void {
    const key = `${context.userId || 'anonymous'}_${error.code}`;
    const history = this.errorHistory.get(key) || [];

    history.push(context);

    // 只保留最近的10条记录
    if (history.length > 10) {
      history.shift();
    }

    this.errorHistory.set(key, history);
  }

  /**
   * 记录错误日志
   */
  private logError(error: ApiError, context: ErrorContext): void {
    const logData = {
      level: 'error',
      code: error.code,
      message: error.message,
      details: error.details,
      context,
      retryable: error.retryable
    };

    // 在浏览器环境中使用console，在Node.js环境中可以集成专业日志库
    if (typeof window !== 'undefined') {
      console.error(`[API Error] ${context.requestId}:`, logData);
    } else {
      // Node.js环境，可以集成Winston等日志库
      console.error(JSON.stringify(logData));
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): { totalErrors: number; errorsByCode: Record<string, number>; recentErrors: ErrorContext[] } {
    const errorsByCode: Record<string, number> = {};
    const recentErrors: ErrorContext[] = [];
    let totalErrors = 0;

    this.errorHistory.forEach((contexts) => {
      contexts.forEach((context) => {
        totalErrors++;
        recentErrors.push(context);
      });
    });

    // 按时间排序，获取最近的错误
    recentErrors.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return {
      totalErrors,
      errorsByCode,
      recentErrors: recentErrors.slice(0, 20) // 返回最近20个错误
    };
  }

  /**
   * 清除重试计数
   */
  clearRetryCount(requestId?: string): void {
    if (requestId) {
      this.retryCount.delete(requestId);
    } else {
      this.retryCount.clear();
    }
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(userId?: string): void {
    if (userId) {
      const keysToDelete = Array.from(this.errorHistory.keys()).filter(key => key.startsWith(userId));
      keysToDelete.forEach(key => this.errorHistory.delete(key));
    } else {
      this.errorHistory.clear();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * 检查错误是否为认证相关
   */
  isAuthError(error: ApiError): boolean {
    return ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'INVALID_CREDENTIALS', 'PERMISSION_DENIED'].includes(error.code);
  }

  /**
   * 检查错误是否需要用户干预
   */
  requiresUserIntervention(error: ApiError): boolean {
    return ['VALIDATION_ERROR', 'INVALID_CREDENTIALS', 'WEAK_PASSWORD', 'EMAIL_ALREADY_EXISTS'].includes(error.code);
  }

  /**
   * 获取错误的严重程度
   */
  getErrorSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'NETWORK_ERROR': 'medium',
      'TIMEOUT_ERROR': 'medium',
      'SERVER_ERROR': 'high',
      'SERVICE_UNAVAILABLE': 'high',
      'TOKEN_EXPIRED': 'medium',
      'PERMISSION_DENIED': 'high',
      'VALIDATION_ERROR': 'low',
      'ACCOUNT_LOCKED': 'critical',
      'UNKNOWN_ERROR': 'medium'
    };

    return severityMap[error.code] || 'medium';
  }
}

// 创建默认实例
export const apiErrorHandler = new ApiErrorHandler();

// 导出错误处理装饰器
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>,
  retryConfig?: Partial<RetryConfig>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return apiErrorHandler.executeWithRetry(() => fn(...args), context, retryConfig);
  };
}

// 导出错误处理Hook（用于React组件）
export function useErrorHandler() {
  return {
    handleError: apiErrorHandler.handleError.bind(apiErrorHandler),
    executeWithRetry: apiErrorHandler.executeWithRetry.bind(apiErrorHandler),
    getErrorStats: apiErrorHandler.getErrorStats.bind(apiErrorHandler),
    clearErrorHistory: apiErrorHandler.clearErrorHistory.bind(apiErrorHandler),
    isAuthError: apiErrorHandler.isAuthError.bind(apiErrorHandler),
    requiresUserIntervention: apiErrorHandler.requiresUserIntervention.bind(apiErrorHandler),
    getErrorSeverity: apiErrorHandler.getErrorSeverity.bind(apiErrorHandler)
  };
}

// 导出常用的错误处理工具函数
export const ErrorHandlerUtils = {
  /**
   * 创建标准化的错误对象
   */
  createError: (code: ErrorCode, message: string, details?: any): ApiError => ({
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    retryable: [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT_ERROR, ErrorCode.INTERNAL_SERVER_ERROR, ErrorCode.SERVICE_UNAVAILABLE].includes(code)
  }),

  /**
   * 检查错误是否可重试
   */
  isRetryable: (error: ApiError): boolean => {
    return error.retryable === true;
  },

  /**
   * 格式化错误消息用于显示
   */
  formatErrorForDisplay: (error: ApiError): string => {
    const userMessage = apiErrorHandler.getUserFriendlyMessage(error.code);
    return `${userMessage}${error.details?.status ? ` (${error.details.status})` : ''}`;
  },

  /**
   * 从HTTP响应创建错误
   */
  fromHttpResponse: (response: any): ApiError => {
    const status = response.status;
    const data = response.data;

    if (data && data.error) {
      return data.error;
    }

    return ErrorHandlerUtils.createError(
      status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.UNKNOWN_ERROR,
      `HTTP ${status} Error`,
      { status, statusText: response.statusText, data }
    );
  }
};
