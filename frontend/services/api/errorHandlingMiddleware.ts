/**
 * 统一API错误处理中间件
 * 包含重试逻辑和用户友好的错误提示
 * 版本: v1.0.0
 */

import type { ApiResponse, ApiError } from '../../types/unified/apiResponse';

// ==================== 错误处理配置 ====================

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // 毫秒
  retryDelayMultiplier: number; // 指数退避倍数
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

export interface ErrorHandlingConfig {
  showUserFriendlyMessages: boolean;
  logErrors: boolean;
  enableRetry: boolean;
  retryConfig: RetryConfig;
  customErrorMessages: Record<string, string>;
}

// ==================== 默认配置 ====================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrorCodes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'RATE_LIMIT_EXCEEDED'
  ]
};

export const DEFAULT_ERROR_HANDLING_CONFIG: ErrorHandlingConfig = {
  showUserFriendlyMessages: true,
  logErrors: true,
  enableRetry: true,
  retryConfig: DEFAULT_RETRY_CONFIG,
  customErrorMessages: {
    'NETWORK_ERROR': '网络连接失败，请检查网络设置',
    'TIMEOUT_ERROR': '请求超时，请稍后重试',
    'UNAUTHORIZED': '登录已过期，请重新登录',
    'FORBIDDEN': '权限不足，无法执行此操作',
    'NOT_FOUND': '请求的资源不存在',
    'VALIDATION_ERROR': '输入数据格式错误，请检查后重试',
    'RATE_LIMIT_EXCEEDED': '请求过于频繁，请稍后重试',
    'SERVER_ERROR': '服务器内部错误，请稍后重试',
    'MAINTENANCE': '系统维护中，请稍后访问'
  }
};

// ==================== 错误类型定义 ====================

export class ApiRequestError extends Error {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    code: string,
    message: string,
    statusCode?: number,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

// ==================== 错误处理中间件类 ====================

export class ApiErrorHandler {
  private config: ErrorHandlingConfig;
  private errorListeners: Array<(error: ApiRequestError) => void> = [];

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLING_CONFIG, ...config };
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: ApiRequestError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: ApiRequestError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 处理API错误
   */
  async handleError(error: any, requestInfo?: any): Promise<ApiRequestError> {
    const apiError = this.normalizeError(error);
    
    // 记录错误
    if (this.config.logErrors) {
      this.logError(apiError, requestInfo);
    }

    // 通知错误监听器
    this.notifyErrorListeners(apiError);

    return apiError;
  }

  /**
   * 执行带重试的请求
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    requestInfo?: any
  ): Promise<T> {
    let lastError: any;
    let attempt = 0;

    while (attempt <= this.config.retryConfig.maxRetries) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        attempt++;

        const apiError = this.normalizeError(error);
        
        // 检查是否应该重试
        if (!this.shouldRetry(apiError, attempt)) {
          break;
        }

        // 计算延迟时间
        const delay = this.calculateRetryDelay(attempt);
        
        console.warn(`请求失败，${delay}ms后进行第${attempt}次重试:`, apiError.message);
        
        // 等待重试
        await this.sleep(delay);
      }
    }

    // 所有重试都失败了，抛出最后的错误
    throw await this.handleError(lastError, requestInfo);
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(error: ApiRequestError): string {
    if (this.config.customErrorMessages[error.code]) {
      
        return this.config.customErrorMessages[error.code];
      }

    // 根据状态码返回通用消息
    if (error.statusCode) {
      
        switch (Math.floor(error.statusCode / 100)) {
        case 4:
          return '请求错误，请检查输入信息';
        case 5:
          return '服务器错误，请稍后重试';
        default:
          return error.message || '未知错误';
      }
    }

    return error.message || '网络错误，请检查网络连接';
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any): ApiRequestError {
    // 如果已经是ApiRequestError，直接返回
    if (error instanceof ApiRequestError) {
      
        return error;
      }

    // 处理网络错误
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new ApiRequestError(
        'NETWORK_ERROR',
        '网络连接失败',
        undefined,
        error,
        true
      );
    }

    // 处理超时错误
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new ApiRequestError(
        'TIMEOUT_ERROR',
        '请求超时',
        408,
        error,
        true
      );
    }

    // 处理HTTP错误
    if (error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;
      
      let code = 'HTTP_ERROR';
      let message = `HTTP ${statusCode} 错误`;
      let retryable = false;

      // 根据状态码确定错误类型
      switch (statusCode) {
        case 401:
          code = 'UNAUTHORIZED';
          message = '未授权访问';
          break;
        case 403:
          code = 'FORBIDDEN';
          message = '权限不足';
          break;
        case 404:
          code = 'NOT_FOUND';
          message = '资源不存在';
          break;
        case 422:
          code = 'VALIDATION_ERROR';
          message = '数据验证失败';
          break;
        case 429:
          code = 'RATE_LIMIT_EXCEEDED';
          message = '请求过于频繁';
          retryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = 'SERVER_ERROR';
          message = '服务器错误';
          retryable = true;
          break;
      }

      // 尝试从响应中获取更详细的错误信息
      if (responseData && responseData.error) {
        if (responseData.error.code) {
          code = responseData.error.code;
        }
        if (responseData.error.message) {
          message = responseData.error.message;
        }
      }

      return new ApiRequestError(code, message, statusCode, responseData, retryable);
    }

    // 处理其他类型的错误
    return new ApiRequestError(
      'UNKNOWN_ERROR',
      error.message || '未知错误',
      undefined,
      error,
      false
    );
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: ApiRequestError, attempt: number): boolean {
    if (!this.config.enableRetry) {
      
        return false;
      }

    if (attempt > this.config.retryConfig.maxRetries) {
      
        return false;
      }

    // 检查错误是否可重试
    if (!error.retryable) {
      
        return false;
      }

    // 检查状态码是否在可重试列表中
    if (error.statusCode && 
        !this.config.retryConfig.retryableStatusCodes.includes(error.statusCode)) {
      return false;
    }

    // 检查错误代码是否在可重试列表中
    if (!this.config.retryConfig.retryableErrorCodes.includes(error.code)) {
      return false;
    }

    return true;
  }

  /**
   * 计算重试延迟时间（指数退避）
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryConfig.retryDelay;
    const multiplier = this.config.retryConfig.retryDelayMultiplier;
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * 记录错误
   */
  private logError(error: ApiRequestError, requestInfo?: any): void {
    const logData = {
      timestamp: error.timestamp,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      requestInfo,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('API Error:', logData);

    // 在生产环境中，可以发送到错误监控服务
    if (process.env.NODE_ENV === 'production') {
      // 发送到错误监控服务（如Sentry、LogRocket等）
      // this.sendToErrorMonitoring(logData);
    }
  }

  /**
   * 通知错误监听器
   */
  private notifyErrorListeners(error: ApiRequestError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 全局错误处理器实例 ====================

export const globalErrorHandler = new ApiErrorHandler();

// ==================== 错误处理装饰器 ====================

/**
 * API方法错误处理装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value!;

  descriptor.value = async function (...args: any[]) {
    try {
      return await globalErrorHandler.executeWithRetry(
        () => originalMethod.apply(this, args),
        { method: propertyKey, args }
      );
    } catch (error) {
      throw await globalErrorHandler.handleError(error, { method: propertyKey, args });
    }
  } as T;

  return descriptor;
}
