/**
 * API错误拦截器
 * 统一处理所有API请求的错误响应
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import {errorService} from './errorService';

// API错误响应接口
interface ApiErrorResponse {
  success: boolean;
  message: string;
  code?: string | number;
  details?: any;
  timestamp?: string;
}

// 错误重试配置
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

class ApiErrorInterceptor {
  private retryConfig: RetryConfig;
  private retryCount = new Map<string, number>();

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: (error: AxiosError) => {
        // 只对网络错误和5xx错误重试
        return !error.response || (error.response.status >= 500 && error.response.status < 600);
      }
    };

    this.setupInterceptors();
  }

  /**
   * 设置axios拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    axios.interceptors.request.use(
      (config) => {
        // 添加请求ID用于重试跟踪
        config.metadata = { 
          requestId: this.generateRequestId(),
          startTime: Date.now()
        };
        return config;
      },
      (error) => {
        return Promise.reject(this.handleRequestError(error));
      }
    );

    // 响应拦截器
    axios.interceptors.response.use(
      (response) => {
        // 成功响应，清除重试计数
        if (response.config.metadata?.requestId) {
          this.retryCount.delete(response.config.metadata.requestId);
        }
        return response;
      },
      async (error) => {
        return Promise.reject(await this.handleResponseError(error));
      }
    );
  }

  /**
   * 处理请求错误
   */
  private handleRequestError(error: any): any {
    const standardError = errorService.handleError(error, {
      phase: 'request',
      url: error.config?.url,
      method: error.config?.method
    });

    return {
      ...error,
      standardError,
      isHandled: true
    };
  }

  /**
   * 处理响应错误
   */
  private async handleResponseError(error: AxiosError): Promise<any> {
    const requestId = error.config?.metadata?.requestId;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    // 检查是否需要重试
    if (requestId && this.shouldRetry(error, requestId)) {
      return this.retryRequest(error);
    }

    // 解析错误响应
    const errorData = this.parseErrorResponse(error);
    
    // 创建标准化错误
    const standardError = errorService.handleError(error, {
      phase: 'response',
      url,
      method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: errorData,
      duration: error.config?.metadata?.startTime ? 
        Date.now() - error.config.metadata.startTime : undefined
    });

    // 特殊处理某些错误类型
    await this.handleSpecialErrors(error, standardError);

    return {
      ...error,
      standardError,
      isHandled: true,
      userMessage: standardError.userFriendlyMessage
    };
  }

  /**
   * 解析错误响应数据
   */
  private parseErrorResponse(error: AxiosError): ApiErrorResponse | null {
    if (!error.response) {
      return null;
    }

    const data = error.response.data;
    
    // 标准API错误格式
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiErrorResponse;
    }

    // 简单字符串错误
    if (typeof data === 'string') {
      return {
        success: false,
        message: data
      };
    }

    // HTML错误页面
    if (typeof data === 'string' && data.includes('<html>')) {
      return {
        success: false,
        message: `服务器返回了HTML页面 (${error.response.status})`
      };
    }

    // 其他格式
    return {
      success: false,
      message: error.message || '未知错误'
    };
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AxiosError, requestId: string): boolean {
    const currentRetries = this.retryCount.get(requestId) || 0;
    
    return (
      currentRetries < this.retryConfig.maxRetries &&
      this.retryConfig.retryCondition(error)
    );
  }

  /**
   * 重试请求
   */
  private async retryRequest(error: AxiosError): Promise<any> {
    const requestId = error.config?.metadata?.requestId;
    if (!requestId) {
      throw error;
    }

    const currentRetries = this.retryCount.get(requestId) || 0;
    this.retryCount.set(requestId, currentRetries + 1);

    // 等待重试延迟
    await this.delay(this.retryConfig.retryDelay * Math.pow(2, currentRetries));

    // 重新发送请求
    try {
      return await axios.request(error.config!);
    } catch (retryError) {
      // 如果重试也失败，继续处理错误
      throw retryError;
    }
  }

  /**
   * 处理特殊错误类型
   */
  private async handleSpecialErrors(error: AxiosError, standardError: any): Promise<void> {
    const status = error.response?.status;

    switch (status) {
      case 401:
        // 未授权，可能需要重新登录
        await this.handleUnauthorized(error);
        break;
      
      case 403:
        // 禁止访问，记录权限问题
        this.handleForbidden(error);
        break;
      
      case 429:
        // 请求过于频繁，实施退避策略
        this.handleRateLimit(error);
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        // 服务器错误，可能需要降级处理
        this.handleServerError(error);
        break;
    }
  }

  /**
   * 处理401未授权错误
   */
  private async handleUnauthorized(error: AxiosError): Promise<void> {
    // 清除本地认证信息
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    // 如果不是登录页面，重定向到登录
    if (!window.location.pathname.includes('/login')) {
      // 保存当前页面用于登录后跳转
      localStorage.setItem('redirect_after_login', window.location.pathname);
      
      // 延迟跳转，让用户看到错误消息
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }

  /**
   * 处理403禁止访问错误
   */
  private handleForbidden(error: AxiosError): void {
    // 记录权限问题，可能需要联系管理员
    console.warn('Access forbidden:', {
      url: error.config?.url,
      user: this.getCurrentUser(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理429请求过于频繁错误
   */
  private handleRateLimit(error: AxiosError): void {
    // 从响应头获取重试时间
    const retryAfter = error.response?.headers['retry-after'];
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

    // 实施退避策略
    console.warn(`Rate limited. Retry after ${waitTime}ms`);
  }

  /**
   * 处理服务器错误
   */
  private handleServerError(error: AxiosError): void {
    // 记录服务器错误，可能需要降级处理
    console.error('Server error:', {
      status: error.response?.status,
      url: error.config?.url,
      timestamp: new Date().toISOString()
    });

    // 可以在这里实施降级策略
    // 例如：使用缓存数据、显示离线模式等
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
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取当前用户信息
   */
  private getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('current_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * 更新重试配置
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * 清除重试计数
   */
  clearRetryCount(): void {
    this.retryCount.clear();
  }

  /**
   * 获取重试统计
   */
  getRetryStats(): { requestId: string; retries: number }[] {
    return Array.from(this.retryCount.entries()).map(([requestId, retries]) => ({
      requestId,
      retries
    }));
  }
}

// 创建全局实例
export const apiErrorInterceptor = new ApiErrorInterceptor();

// 便捷方法：手动处理API错误
export const handleApiError = (error: AxiosError, context?: Record<string, any>) => {
  return errorService.handleError(error, {
    ...context,
    phase: 'manual',
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status
  });
};

export default apiErrorInterceptor;
