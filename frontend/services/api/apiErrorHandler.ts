/**
 * 统一API错误处理中间件
 * 包含重试逻辑和用户友好的错误提示
 * 版本: v2.0.0
 */

import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '../../types/unified/models';

// ==================== 错误类型定义 ====================

export interface ErrorHandlerConfig {
  // 重试配置
  retry: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoffFactor: number;
    retryableStatuses: number[];
  };
  
  // 通知配置
  notification: {
    enabled: boolean;
    showSuccess: boolean;
    showError: boolean;
    duration: number;
  };
  
  // 日志配置
  logging: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    includeStack: boolean;
  };
  
  // 认证配置
  auth: {
    tokenRefreshEnabled: boolean;
    redirectOnUnauthorized: boolean;
    loginPath: string;
  };
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  userAgent?: string;
  timestamp: string;
  url?: string;
  method?: string;
  retryCount: number;
}

export interface ProcessedError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  context: ErrorContext;
  originalError: any;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000,
    backoffFactor: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  },
  notification: {
    enabled: true,
    showSuccess: false,
    showError: true,
    duration: 5000
  },
  logging: {
    enabled: true,
    logLevel: 'error',
    includeStack: process.env.NODE_ENV === 'development'
  },
  auth: {
    tokenRefreshEnabled: true,
    redirectOnUnauthorized: true,
    loginPath: '/login'
  }
};

// ==================== 错误消息映射 ====================

const ERROR_MESSAGES: Record<string, { message: string; userMessage: string; severity: ProcessedError['severity'] }> = {
  // 网络错误
  'NETWORK_ERROR': {
    message: 'Network connection failed',
    userMessage: '网络连接失败，请检查您的网络设置',
    severity: 'medium'
  },
  'TIMEOUT_ERROR': {
    message: 'Request timeout',
    userMessage: '请求超时，请稍后重试',
    severity: 'medium'
  },
  
  // 认证错误
  'UNAUTHORIZED': {
    message: 'Authentication required',
    userMessage: '请先登录后再进行操作',
    severity: 'high'
  },
  'FORBIDDEN': {
    message: 'Access forbidden',
    userMessage: '您没有权限执行此操作',
    severity: 'high'
  },
  'TOKEN_EXPIRED': {
    message: 'Authentication token expired',
    userMessage: '登录已过期，请重新登录',
    severity: 'high'
  },
  
  // 客户端错误
  'BAD_REQUEST': {
    message: 'Invalid request parameters',
    userMessage: '请求参数有误，请检查后重试',
    severity: 'medium'
  },
  'NOT_FOUND': {
    message: 'Resource not found',
    userMessage: '请求的资源不存在',
    severity: 'medium'
  },
  'VALIDATION_ERROR': {
    message: 'Data validation failed',
    userMessage: '数据验证失败，请检查输入内容',
    severity: 'medium'
  },
  
  // 服务器错误
  'INTERNAL_SERVER_ERROR': {
    message: 'Internal server error',
    userMessage: '服务器内部错误，请稍后重试',
    severity: 'critical'
  },
  'SERVICE_UNAVAILABLE': {
    message: 'Service temporarily unavailable',
    userMessage: '服务暂时不可用，请稍后重试',
    severity: 'high'
  },
  'RATE_LIMITED': {
    message: 'Too many requests',
    userMessage: '请求过于频繁，请稍后重试',
    severity: 'medium'
  },
  
  // 业务错误
  'BUSINESS_ERROR': {
    message: 'Business logic error',
    userMessage: '操作失败，请检查相关条件',
    severity: 'medium'
  },
  
  // 默认错误
  'UNKNOWN_ERROR': {
    message: 'Unknown error occurred',
    userMessage: '发生未知错误，请稍后重试',
    severity: 'medium'
  }
};

// ==================== 错误处理器类 ====================

export class ApiErrorHandler {
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
  private config: ErrorHandlerConfig;
  private notificationService?: any; // 可以注入通知服务
  private loggerService?: any; // 可以注入日志服务

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置通知服务
   */
  setNotificationService(service: any) {
    this.notificationService = service;
  }

  /**
   * 设置日志服务
   */
  setLoggerService(service: any) {
    this.loggerService = service;
  }

  /**
   * 处理错误
   */
  async handleError(error: any, context: Partial<ErrorContext> = {}): Promise<ProcessedError> {
    const processedError = this.processError(error, context);
    
    // 记录日志
    if (this.config.logging.enabled) {
      this.logError(processedError);
    }
    
    // 显示通知
    if (this.config.notification.enabled && this.config.notification.showError) {
      this.showErrorNotification(processedError);
    }
    
    // 处理特殊错误类型
    await this.handleSpecialErrors(processedError);
    
    return processedError;
  }

  /**
   * 处理错误对象
   */
  private processError(error: any, context: Partial<ErrorContext> = {}): ProcessedError {
    const fullContext: ErrorContext = {
      requestId: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      ...context
    };

    // 处理Axios错误
    if (axios.isAxiosError(error)) {
      return this.processAxiosError(error, fullContext);
    }
    
    // 处理API错误响应
    if (this.isApiErrorResponse(error)) {
      return this.processApiError(error, fullContext);
    }
    
    // 处理普通错误
    return this.processGenericError(error, fullContext);
  }

  /**
   * 处理Axios错误
   */
  private processAxiosError(error: AxiosError, context: ErrorContext): ProcessedError {
    const { response, request, code } = error;
    
    // 网络错误
    if (!response && request) {
      
        const errorInfo = ERROR_MESSAGES['NETWORK_ERROR'];
      return {
        code: 'NETWORK_ERROR',
        message: errorInfo.message,
        userMessage: errorInfo.userMessage,
        severity: errorInfo.severity,
        retryable: true,
        context: {
          ...context,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase()
      },
        originalError: error
      };
    }
    
    // 超时错误
    if (code === 'ECONNABORTED') {
      
        const errorInfo = ERROR_MESSAGES['TIMEOUT_ERROR'];
      return {
        code: 'TIMEOUT_ERROR',
        message: errorInfo.message,
        userMessage: errorInfo.userMessage,
        severity: errorInfo.severity,
        retryable: true,
        context,
        originalError: error
      };
    }
    
    // HTTP状态码错误
    if (response) {
      
        return this.processHttpStatusError(response, context, error);
      }
    
    // 其他错误
    const errorInfo = ERROR_MESSAGES['UNKNOWN_ERROR'];
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || errorInfo.message,
      userMessage: errorInfo.userMessage,
      severity: errorInfo.severity,
      retryable: false,
      context,
      originalError: error
    };
  }

  /**
   * 处理HTTP状态码错误
   */
  private processHttpStatusError(response: AxiosResponse, context: ErrorContext, originalError: any): ProcessedError {
    const { status, data } = response;
    
    // 状态码映射
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'TIMEOUT_ERROR',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'SERVICE_UNAVAILABLE',
      503: 'SERVICE_UNAVAILABLE',
      504: 'TIMEOUT_ERROR'
    };
    
    const errorCode = statusCodeMap[status] || 'UNKNOWN_ERROR';
    const errorInfo = ERROR_MESSAGES[errorCode];
    
    // 尝试从响应中获取更详细的错误信息
    let message = errorInfo.message;
    let userMessage = errorInfo.userMessage;
    
    if (data && typeof data === 'object') {
      if (data.error?.message) {
        message = data.error.message;
      }
      if (data.message) {
        userMessage = data.message;
      }
    }
    
    return {
      code: errorCode,
      message,
      userMessage,
      severity: errorInfo.severity,
      retryable: this.config.retry.retryableStatuses.includes(status),
      context: {
        ...context,
        url: response.config?.url,
        method: response.config?.method?.toUpperCase()
      },
      originalError
    };
  }

  /**
   * 处理API错误响应
   */
  private processApiError(error: ApiErrorResponse, context: ErrorContext): ProcessedError {
    const errorCode = error.error.code || 'BUSINESS_ERROR';
    const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['BUSINESS_ERROR'];
    
    return {
      code: errorCode,
      message: error.error.message || errorInfo.message,
      userMessage: error.error.message || errorInfo.userMessage,
      severity: errorInfo.severity,
      retryable: false,
      context,
      originalError: error
    };
  }

  /**
   * 处理通用错误
   */
  private processGenericError(error: any, context: ErrorContext): ProcessedError {
    const errorInfo = ERROR_MESSAGES['UNKNOWN_ERROR'];
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || errorInfo.message,
      userMessage: errorInfo.userMessage,
      severity: errorInfo.severity,
      retryable: false,
      context,
      originalError: error
    };
  }

  /**
   * 检查是否为API错误响应
   */
  private isApiErrorResponse(error: any): error is ApiErrorResponse {
    return error && 
           typeof error === 'object' && 
           error.success === false && 
           error.error && 
           typeof error.error === 'object';
  }

  /**
   * 记录错误日志
   */
  private logError(error: ProcessedError) {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      ...(this.config.logging.includeStack && { stack: error.originalError?.stack })
    };

    if (this.loggerService) {
      this.loggerService[this.config.logging.logLevel](logData);
    } else {
      console.error('[API Error]', logData);
    }
  }

  /**
   * 显示错误通知
   */
  private showErrorNotification(error: ProcessedError) {
    if (this.notificationService) {
      this.notificationService.error({
        title: '操作失败',
        message: error.userMessage,
        duration: this.config.notification.duration
      });
    } else {
      // 简单的控制台输出
      console.warn('[User Error]', error.userMessage);
    }
  }

  /**
   * 处理特殊错误类型
   */
  private async handleSpecialErrors(error: ProcessedError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
      case 'TOKEN_EXPIRED':
        if (this.config.auth.redirectOnUnauthorized) {
          // 清除认证信息
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          
          // 重定向到登录页
          if (typeof window !== 'undefined' && !window.location.pathname.includes(this.config.auth.loginPath)) {
            setTimeout(() => {
              window.location.href = this.config.auth.loginPath;
            }, 2000);
          }
        }
        break;
        
      case 'RATE_LIMITED':
        // 可以实施退避策略
        break;
        
      case 'SERVICE_UNAVAILABLE':
        // 可以显示服务状态页面
        break;
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 检查错误是否可重试
   */
  isRetryable(error: ProcessedError): boolean {
    return error.retryable && 
           this.config.retry.enabled && 
           error.context.retryCount < this.config.retry.maxAttempts;
  }

  /**
   * 计算重试延迟
   */
  getRetryDelay(retryCount: number): number {
    return this.config.retry.delay * Math.pow(this.config.retry.backoffFactor, retryCount);
  }
}

// ==================== 默认实例 ====================

export const defaultErrorHandler = new ApiErrorHandler();

// ==================== 导出 ====================

export default ApiErrorHandler;
