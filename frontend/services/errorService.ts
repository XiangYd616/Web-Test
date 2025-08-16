/**
 * 统一错误处理服务
 * 提供前端错误处理、日志记录、用户通知的统一接口
 */

import { toast } from 'react-hot-toast';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 标准化错误接口
export interface StandardError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string | number;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  userFriendlyMessage?: string;
  suggestions?: string[];
  retryable?: boolean;
}

// 错误处理配置
interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableUserNotification: boolean;
  enableReporting: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

class ErrorService {
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
  private errorQueue: StandardError[] = [];
  private maxQueueSize = 100;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableUserNotification: true,
      enableReporting: false,
      logLevel: 'error',
      ...config
    };
  }

  /**
   * 处理错误的主要方法
   */
  handleError(error: Error | string | any, context?: Record<string, any>): StandardError {
    const standardError = this.standardizeError(error, context);

    // 记录错误
    if (this.config.enableLogging) {
      this.logError(standardError);
    }

    // 显示用户通知
    if (this.config.enableUserNotification) {
      this.showUserNotification(standardError);
    }

    // 添加到错误队列
    this.addToQueue(standardError);

    // 报告错误（如果启用）
    if (this.config.enableReporting) {
      this.reportError(standardError);
    }

    return standardError;
  }

  /**
   * 标准化错误对象
   */
  private standardizeError(error: Error | string | any, context?: Record<string, any>): StandardError {
    const id = this.generateErrorId();
    const timestamp = new Date().toISOString();

    // 处理不同类型的错误输入
    if (typeof error === 'string') {

      return {
        id,
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: error,
        timestamp,
        context,
        userFriendlyMessage: error,
        retryable: false
      };
    }

    if (error instanceof Error) {

      const type = this.determineErrorType(error);
      const severity = this.determineSeverity(error, type);

      return {
        id,
        type,
        severity,
        message: error.message,
        timestamp,
        context,
        stack: error.stack,
        userFriendlyMessage: this.getUserFriendlyMessage(error, type),
        suggestions: this.getSuggestions(error, type),
        retryable: this.isRetryable(error, type)
      };
    }

    // 处理API错误响应
    if (error?.response || error?.status) {

      const status = error.status || error.response?.status;
      const message = error.message || error.response?.data?.message || '请求失败';

      return {
        id,
        type: this.getTypeFromStatus(status),
        severity: this.getSeverityFromStatus(status),
        message,
        code: status,
        timestamp,
        context,
        userFriendlyMessage: this.getStatusMessage(status),
        retryable: this.isStatusRetryable(status)
      };
    }

    // 默认处理
    return {
      id,
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error?.message || '未知错误',
      timestamp,
      context,
      userFriendlyMessage: '发生了未知错误，请稍后重试',
      retryable: true
    };
  }

  /**
   * 确定错误类型
   */
  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorType.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    if (message.includes('server') || message.includes('500')) {
      return ErrorType.SERVER;
    }

    return ErrorType.CLIENT;
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: Error, type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      case ErrorType.SERVER:
        return ErrorSeverity.CRITICAL;
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyMessage(error: Error, type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return '网络连接失败，请检查您的网络设置';
      case ErrorType.TIMEOUT:
        return '请求超时，请稍后重试';
      case ErrorType.AUTHENTICATION:
        return '登录已过期，请重新登录';
      case ErrorType.AUTHORIZATION:
        return '权限不足，无法执行此操作';
      case ErrorType.VALIDATION:
        return '输入信息有误，请检查后重试';
      case ErrorType.SERVER:
        return '服务器暂时不可用，请稍后重试';
      default:
        return '操作失败，请稍后重试';
    }
  }

  /**
   * 获取错误建议
   */
  private getSuggestions(error: Error, type: ErrorType): string[] {
    switch (type) {
      case ErrorType.NETWORK:
        return ['检查网络连接', '尝试刷新页面', '联系网络管理员'];
      case ErrorType.TIMEOUT:
        return ['稍后重试', '检查网络速度', '减少并发操作'];
      case ErrorType.AUTHENTICATION:
        return ['重新登录', '清除浏览器缓存', '联系管理员'];
      case ErrorType.VALIDATION:
        return ['检查输入格式', '确认必填字段', '参考帮助文档'];
      default:
        return ['刷新页面重试', '清除浏览器缓存', '联系技术支持'];
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(error: Error, type: ErrorType): boolean {
    return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER].includes(type);
  }

  /**
   * 根据HTTP状态码获取错误类型
   */
  private getTypeFromStatus(status: number): ErrorType {
    if (status === 401) return ErrorType.AUTHENTICATION;
    if (status === 403) return ErrorType.AUTHORIZATION;
    if (status >= 400 && status < 500) return ErrorType.CLIENT;
    if (status >= 500) return ErrorType.SERVER;
    return ErrorType.UNKNOWN;
  }

  /**
   * 根据HTTP状态码获取严重程度
   */
  private getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status === 401 || status === 403) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * 获取状态码对应的用户消息
   */
  private getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '请求参数错误',
      401: '登录已过期，请重新登录',
      403: '权限不足，无法执行此操作',
      404: '请求的资源不存在',
      408: '请求超时，请稍后重试',
      429: '请求过于频繁，请稍后重试',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务暂时不可用',
      504: '网关超时'
    };

    return messages[status] || `请求失败 (${status})`;
  }

  /**
   * 判断状态码是否可重试
   */
  private isStatusRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * 记录错误日志
   */
  private logError(error: StandardError): void {
    const logMethod = error.severity === ErrorSeverity.CRITICAL ? 'error' :
      error.severity === ErrorSeverity.HIGH ? 'warn' : 'info';

    console[logMethod](`[${error.type}] ${error.message}`, {
      id: error.id,
      severity: error.severity,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    });
  }

  /**
   * 显示用户通知
   */
  private showUserNotification(error: StandardError): void {
    const message = error.userFriendlyMessage || error.message;

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(message, { duration: 6000 });
        break;
      case ErrorSeverity.MEDIUM:
        toast.error(message, { duration: 4000 });
        break;
      case ErrorSeverity.LOW:
        toast(message, { duration: 3000 });
        break;
    }
  }

  /**
   * 添加到错误队列
   */
  private addToQueue(error: StandardError): void {
    this.errorQueue.unshift(error);

    // 保持队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(0, this.maxQueueSize);
    }
  }

  /**
   * 报告错误到服务器
   */
  private async reportError(error: StandardError): Promise<void> {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error)
      });
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): StandardError[] {
    return [...this.errorQueue];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorQueue = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 处理异步操作错误 - 新增方法
   * @param error - 错误对象
   * @param context - 异步操作上下文
   */
  handleAsyncError(error: Error | string, context?: {
    context?: string;
    retryCount?: number;
    maxRetries?: number;
    operation?: string;
  }): StandardError {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const errorType = this.determineAsyncErrorType(errorObj);
    const severity = this.determineAsyncErrorSeverity(errorObj, context);

    const standardError: StandardError = {
      id: this.generateErrorId(),
      type: errorType,
      severity,
      message: errorObj.message,
      timestamp: new Date().toISOString(),
      context: {
        operation: context?.operation || 'async operation',
        retryCount: context?.retryCount || 0,
        maxRetries: context?.maxRetries || 3,
        ...context
      },
      stack: errorObj.stack,
      userFriendlyMessage: this.generateAsyncErrorMessage(errorObj, context),
      suggestions: this.generateAsyncSuggestions(errorObj, context),
      retryable: this.isAsyncRetryable(errorObj, context)
    };

    return this.handleError(standardError);
  }

  /**
   * 确定异步错误类型
   */
  private determineAsyncErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (message.includes('unauthorized') || message.includes('auth')) {
      return ErrorType.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }

    return ErrorType.CLIENT;
  }

  /**
   * 确定异步错误严重程度
   */
  private determineAsyncErrorSeverity(error: Error, context?: any): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (context?.retryCount >= (context?.maxRetries || 3)) {
      return ErrorSeverity.HIGH;
    }

    if (message.includes('network') || message.includes('timeout')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * 生成异步错误的用户友好消息
   */
  private generateAsyncErrorMessage(error: Error, context?: any): string {
    const message = error.message.toLowerCase();

    if (message.includes('network')) {
      return '网络连接失败，请检查网络后重试';
    }
    if (message.includes('timeout')) {
      return '操作超时，请稍后重试';
    }
    if (context?.retryCount >= (context?.maxRetries || 3)) {
      return '操作多次失败，请稍后再试或联系技术支持';
    }

    return '操作失败，请重试';
  }

  /**
   * 生成异步错误建议
   */
  private generateAsyncSuggestions(error: Error, context?: any): string[] {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network')) {
      suggestions.push('检查网络连接', '尝试刷新页面');
    }
    if (message.includes('timeout')) {
      suggestions.push('稍后重试', '检查网络速度');
    }
    if (context?.retryCount >= (context?.maxRetries || 3)) {
      suggestions.push('联系技术支持', '检查系统状态');
    }

    if (suggestions.length === 0) {
      suggestions.push('重试操作', '刷新页面');
    }

    return suggestions;
  }

  /**
   * 判断异步错误是否可重试
   */
  private isAsyncRetryable(error: Error, context?: any): boolean {
    const message = error.message.toLowerCase();

    // 如果已经达到最大重试次数，不再重试
    if (context?.retryCount >= (context?.maxRetries || 3)) {
      return false;
    }

    // 网络错误和超时错误通常可以重试
    if (message.includes('network') || message.includes('timeout') ||
      message.includes('fetch') || message.includes('connection')) {
      return true;
    }

    // 认证和授权错误通常不应该重试
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return false;
    }

    return true;
  }
}

// 创建全局错误服务实例
export const errorService = new ErrorService();

// 便捷方法
export const handleError = (error: Error | string | any, context?: Record<string, any>) =>
  errorService.handleError(error, context);

export default errorService;
