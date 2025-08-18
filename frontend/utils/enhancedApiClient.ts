/**
 * 增强的API客户端
 * 提供完整的错误处理、重试、缓存和监控功能
 */

import authService from '../services/authService';export interface ApiRequestOptions extends RequestInit     {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface ApiResponse<T = any>     {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
  };
}

class EnhancedApiClient {
  private baseUrl: string;
  private cache = new Map < string, { data: any; timestamp: number; ttl: number }> ();
  private metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  errorsByType: new Map < string, number> ()
  };

constructor(baseUrl: string = '/api') {
  this.baseUrl = baseUrl;
}

  /**
   * 通用请求方法
   */
  async request < T > (
  endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise < ApiResponse < T >> {
  const requestId = this.generateRequestId();
  const startTime = Date.now();
  const url = `${this.baseUrl}${endpoint}`;
    
    // 检查缓存
    if (options.cache && options.method === "GET') {
      const cacheKey = this.getCacheKey(url, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestOptions = this.interceptRequest(url, options);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        this.interceptResponse(response, { url, method: options.method, startTime, responseTime });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).statusText = response.statusText;
          
          // 对于某些错误码不进行重试
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          console.warn(`API调用失败，第${attempt}次重试:`, error.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      continue;
    }

    const result = await response.json();
    const apiResponse: ApiResponse<T>  = {
      success: true,
      data: result.data || result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime
      }
    };
    // 缓存GET请求结果
    if (options.cache && options.method === "GET') {
      const cacheKey = this.getCacheKey(url, options);
      this.setCache(cacheKey, apiResponse, options.cacheTTL);
    }

    this.logSuccess({ url, attempt, responseTime });
    return apiResponse;

  } catch(error) {
    if (attempt === maxRetries) {
      this.logError(error as Error, { url, options, attempts: maxRetries });

      return {
        success: false,
        error: {
          code: (error as any).status?.toString() || 'UNKNOWN_ERROR',
          message: (error as Error).message,
          details: error
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      };
    }

    console.warn(`API调用异常，第${attempt}次重试:`, (error as Error).message);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

// 这里不应该到达，但为了类型安全
throw new Error("Unexpected error in request method");
  }

  /**
   * GET请求
   */
  async get < T > (endpoint: string, options: Omit < ApiRequestOptions, 'method' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, { ...options, method: 'GET', cache: true });
}

  /**
   * POST请求
   */
  async post < T > (endpoint: string, data ?: any, options: Omit < ApiRequestOptions, 'method' | 'body' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

  /**
   * PUT请求
   */
  async put < T > (endpoint: string, data ?: any, options: Omit < ApiRequestOptions, 'method' | 'body' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

  /**
   * DELETE请求
   */
  async delete <T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = { }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {...options, method: 'DELETE' });
  }

    /**
     * 请求拦截器
     */
    private interceptRequest(url: string, options: ApiRequestOptions): RequestInit {
    const token = authService.getToken();

    return {
      ...options,
      headers: {
      'Content-Type': 'application/json',
    'X-Request-ID': this.generateRequestId(),
    'X-Timestamp': new Date().toISOString(),
    ...(token && {"Authorization': `Bearer ${token}` }),
    ...options.headers,
      },
    };
  }

    /**
     * 响应拦截器
     */
    private interceptResponse(response: Response, requestInfo: any): Response {
      this.logMetrics({
        url: requestInfo.url,
        method: requestInfo.method,
        status: response.status,
        responseTime: requestInfo.responseTime
      });

    if (response.status === 401) {
      this.handleAuthExpired();
    }
    
    if (response.status >= 500) {
      this.handleServerError(response, requestInfo);
    }

    return response;
  }

    /**
     * 缓存相关方法
     */
    private getCacheKey(url: string, options: ApiRequestOptions): string {
    return `${options.method || "GET'}:${url}:${JSON.stringify(options.body || {})}`;
  }

    private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
    return null;
    }

    return cached.data;
  }

    private setCache(key: string, data: any, ttl: number = 300000): void {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
  }

    /**
     * 监控和日志方法
     */
    private logSuccess(info: any): void {
      this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime =
    (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) /
    this.metrics.successfulRequests;
  }

    private logError(error: Error, context: any): void {
      this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    const errorType = error.name || "UnknownError";
    this.metrics.errorsByType.set(
    errorType,
    (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
  }

    private logMetrics(info: any): void {
      console.debug('API Metrics: ', {
        url: info.url,
        method: info.method,
        status: info.status,
        responseTime: info.responseTime
      });
  }

    private handleAuthExpired(): void {
      console.warn('认证已过期，正在重新登录...");
    // 可以触发重新登录流程
  }

    private handleServerError(response: Response, requestInfo: any): void {
      console.error('服务器错误:', {
        status: response.status,
        url: requestInfo.url,
        method: requestInfo.method
      });
  }

    private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

    /**
     * 获取监控指标
     */
    getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0
    ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
    : 0
    };
  }

    /**
     * 清除缓存
     */
    clearCache(): void {
      this.cache.clear();
  }

    /**
     * 重置指标
     */
    resetMetrics(): void {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorsByType: new Map < string, number> ()
    };
  }
}

    export const enhancedApiClient = new EnhancedApiClient();
    export default enhancedApiClient;