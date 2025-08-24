/**
 * 前端统一错误处理适配器
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 * 
 * 此文件替代以下重复的错误处理文件：
 * - errorService.ts
 * - api/errorHandler.ts
 * - api/apiErrorHandler.ts
 * - apiErrorInterceptor.ts
 */

import { 
  UnifiedErrorHandler, 
  ErrorCode, 
  ErrorSeverity, 
  type StandardError, 
  type ErrorContext 
} from '../../../shared/utils/unifiedErrorHandler';
import type { AxiosError } from 'axios';

// ==================== 前端特定配置 ====================

interface FrontendErrorConfig {
  enableToast: boolean;
  enableConsoleLog: boolean;
  enableErrorReporting: boolean;
  toastDuration: number;
  maxToastCount: number;
}

// ==================== 前端错误处理器 ====================

export class FrontendErrorHandler extends UnifiedErrorHandler {
  private frontendConfig: FrontendErrorConfig;
  private activeToasts = new Set<string>();

  constructor(config: Partial<FrontendErrorConfig> = {}) {
    super({
      enableLogging: true,
      enableUserNotification: true,
      enableReporting: false,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000
    });

    this.frontendConfig = {
      enableToast: true,
      enableConsoleLog: true,
      enableErrorReporting: false,
      toastDuration: 5000,
      maxToastCount: 3,
      ...config
    };
  }

  /**
   * 处理Axios错误
   */
  handleAxiosError(error: AxiosError, context: ErrorContext = {}): StandardError {
    const enhancedContext: ErrorContext = {
      ...context,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      phase: 'response'
    };

    // 解析响应错误数据
    if (error.response?.data) {
      const responseData = error.response.data as any;
      if (responseData.error) {
        enhancedContext.serverError = responseData.error;
      }
    }

    return this.handleError(error, enhancedContext);
  }

  /**
   * 处理API请求错误
   */
  handleApiError(error: any, operation: string, context: ErrorContext = {}): StandardError {
    return this.handleError(error, {
      ...context,
      operation,
      phase: 'request'
    });
  }

  /**
   * 处理组件错误
   */
  handleComponentError(error: Error, componentName: string, context: ErrorContext = {}): StandardError {
    return this.handleError(error, {
      ...context,
      component: componentName,
      phase: 'rendering'
    });
  }

  /**
   * 显示用户通知（重写父类方法）
   */
  protected showUserNotification(error: StandardError): void {
    if (!this.frontendConfig.enableToast) return;

    // 避免重复显示相同错误
    const errorKey = `${error.code}-${error.message}`;
    if (this.activeToasts.has(errorKey)) return;

    // 限制同时显示的Toast数量
    if (this.activeToasts.size >= this.frontendConfig.maxToastCount) return;

    this.activeToasts.add(errorKey);

    // 显示Toast通知
    this.showToast(error);

    // 自动清除Toast记录
    setTimeout(() => {
      this.activeToasts.delete(errorKey);
    }, this.frontendConfig.toastDuration);
  }

  /**
   * 显示Toast通知
   */
  private showToast(error: StandardError): void {
    // 这里可以集成具体的Toast库，如react-hot-toast
    if (typeof window !== 'undefined') {
      const toastType = this.getToastType(error.severity);
      console.log(`[${toastType.toUpperCase()}] ${error.userFriendlyMessage}`);
      
      // 如果有全局Toast函数，可以在这里调用
      if ((window as any).showToast) {
        (window as any).showToast(error.userFriendlyMessage, toastType);
      }
    }
  }

  /**
   * 获取Toast类型
   */
  private getToastType(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * 创建错误边界处理器
   */
  createErrorBoundaryHandler() {
    return (error: Error, errorInfo: any) => {
      this.handleComponentError(error, 'ErrorBoundary', {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      });
    };
  }

  /**
   * 创建Promise错误处理器
   */
  createPromiseErrorHandler() {
    return (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, {
        type: 'unhandledPromiseRejection',
        promise: true
      });
    };
  }

  /**
   * 创建全局错误处理器
   */
  createGlobalErrorHandler() {
    return (event: ErrorEvent) => {
      this.handleError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        global: true
      });
    };
  }

  /**
   * 初始化全局错误监听
   */
  initializeGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // 监听未捕获的错误
    window.addEventListener('error', this.createGlobalErrorHandler());

    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', this.createPromiseErrorHandler());

    console.log('✅ 全局错误处理已初始化');
  }

  /**
   * 清理全局错误监听
   */
  cleanupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('error', this.createGlobalErrorHandler());
    window.removeEventListener('unhandledrejection', this.createPromiseErrorHandler());
  }
}

// ==================== Axios拦截器 ====================

export class AxiosErrorInterceptor {
  private errorHandler: FrontendErrorHandler;
  private retryQueue = new Map<string, number>();

  constructor(errorHandler: FrontendErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 请求拦截器
   */
  requestInterceptor = (config: any) => {
    // 添加请求ID用于重试跟踪
    config.metadata = {
      requestId: this.generateRequestId(),
      startTime: Date.now()
    };
    return config;
  };

  /**
   * 请求错误拦截器
   */
  requestErrorInterceptor = (error: any) => {
    const standardError = this.errorHandler.handleError(error, {
      phase: 'request',
      url: error.config?.url,
      method: error.config?.method
    });

    return Promise.reject({
      ...error,
      standardError,
      isHandled: true
    });
  };

  /**
   * 响应拦截器
   */
  responseInterceptor = (response: any) => {
    // 清除重试记录
    const requestId = response.config?.metadata?.requestId;
    if (requestId) {
      this.retryQueue.delete(requestId);
    }
    return response;
  };

  /**
   * 响应错误拦截器
   */
  responseErrorInterceptor = async (error: AxiosError) => {
    const requestId = error.config?.metadata?.requestId;
    
    // 检查是否需要重试
    if (requestId && this.shouldRetry(error, requestId)) {
      return this.retryRequest(error);
    }

    // 处理错误
    const standardError = this.errorHandler.handleAxiosError(error);

    return Promise.reject({
      ...error,
      standardError,
      isHandled: true,
      userMessage: standardError.userFriendlyMessage
    });
  };

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AxiosError, requestId: string): boolean {
    const retryCount = this.retryQueue.get(requestId) || 0;
    const maxRetries = 3;

    // 检查重试次数
    if (retryCount >= maxRetries) {
      return false;
    }

    // 检查错误类型是否可重试
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const status = error.response?.status;
    
    return status ? retryableStatuses.includes(status) : false;
  }

  /**
   * 重试请求
   */
  private async retryRequest(error: AxiosError): Promise<any> {
    const requestId = error.config?.metadata?.requestId;
    if (!requestId) return Promise.reject(error);

    const retryCount = this.retryQueue.get(requestId) || 0;
    this.retryQueue.set(requestId, retryCount + 1);

    // 等待后重试
    await this.delay(1000 * Math.pow(2, retryCount)); // 指数退避

    // 重新发送请求
    const axios = (await import('axios')).default;
    return axios.request(error.config!);
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
}

// ==================== 默认实例和便捷方法 ====================

export const frontendErrorHandler = new FrontendErrorHandler();
export const axiosErrorInterceptor = new AxiosErrorInterceptor(frontendErrorHandler);

// 便捷方法
export const handleError = (error: any, context?: ErrorContext) => 
  frontendErrorHandler.handleError(error, context);

export const handleAxiosError = (error: AxiosError, context?: ErrorContext) => 
  frontendErrorHandler.handleAxiosError(error, context);

export const handleApiError = (error: any, operation: string, context?: ErrorContext) => 
  frontendErrorHandler.handleApiError(error, operation, context);

export const handleComponentError = (error: Error, componentName: string, context?: ErrorContext) => 
  frontendErrorHandler.handleComponentError(error, componentName, context);

// 初始化全局错误处理
frontendErrorHandler.initializeGlobalErrorHandling();

export default frontendErrorHandler;
