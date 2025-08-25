/**
 * 增强的API服务
 * 统一的错误处理、重试机制、缓存策略
 * 版本: v1.0.0
 */

import type { 
  ApiResponse, 
  RequestConfig, 
  AuthConfig,
  ApiError,
  ValidationError 
} from '../../types/api';
import type { VersionedData } from '../../types/version';

// ==================== 配置接口 ====================

export interface EnhancedApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  retryBackoff: number;
  enableCache: boolean;
  cacheTTL: number;
  enableVersioning: boolean;
  apiVersion: string;
  enableMetrics: boolean;
  enableLogging: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  keyGenerator?: (url: string, config: RequestConfig) => string;
  shouldCache?: (response: any) => boolean;
}

// ==================== 错误类型 ====================

export class ApiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: any,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiServiceError';
  }
}

export class NetworkError extends ApiServiceError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details, true);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiServiceError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`, 'TIMEOUT_ERROR', 408, { timeout }, true);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ApiServiceError {
  constructor(message: string, errors: ValidationError[]) {
    super(message, 'VALIDATION_ERROR', 400, { errors }, false);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiServiceError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401, undefined, false);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiServiceError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, false);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends ApiServiceError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429, { retryAfter }, true);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiServiceError {
  constructor(message: string, status: number, details?: any) {
    super(message, 'SERVER_ERROR', status, details, true);
    this.name = 'ServerError';
  }
}

// ==================== 缓存实现 ====================

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

// ==================== 指标收集 ====================

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  retryAttempts: number;
  errorsByType: Record<string, number>;
  responseTimesByEndpoint: Record<string, number[]>;
}

class MetricsCollector {
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retryAttempts: 0,
    errorsByType: {},
    responseTimesByEndpoint: {}
  };

  recordRequest(endpoint: string): void {
    this.metrics.totalRequests++;
  }

  recordSuccess(endpoint: string, responseTime: number): void {
    this.metrics.successfulRequests++;
    this.recordResponseTime(endpoint, responseTime);
  }

  recordFailure(endpoint: string, error: ApiServiceError): void {
    this.metrics.failedRequests++;
    this.metrics.errorsByType[error.code] = (this.metrics.errorsByType[error.code] || 0) + 1;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordRetry(): void {
    this.metrics.retryAttempts++;
  }

  private recordResponseTime(endpoint: string, responseTime: number): void {
    if (!this.metrics.responseTimesByEndpoint[endpoint]) {
      this.metrics.responseTimesByEndpoint[endpoint] = [];
    }
    this.metrics.responseTimesByEndpoint[endpoint].push(responseTime);

    // 更新平均响应时间
    const allTimes = Object.values(this.metrics.responseTimesByEndpoint).flat();
    this.metrics.averageResponseTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
  }

  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryAttempts: 0,
      errorsByType: {},
      responseTimesByEndpoint: {}
    };
  }
}

// ==================== 增强的API服务类 ====================

export class EnhancedApiService {
  private config: EnhancedApiConfig;
  private retryConfig: RetryConfig;
  private cacheConfig: CacheConfig;
  private cache: ApiCache;
  private metrics: MetricsCollector;
  private authConfig?: AuthConfig;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: any) => any> = [];

  constructor(config: Partial<EnhancedApiConfig> = {}) {
    this.config = {
      baseURL: '',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      retryBackoff: 2,
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      enableVersioning: true,
      apiVersion: 'v1',
      enableMetrics: true,
      enableLogging: true,
      ...config
    };

    this.retryConfig = {
      maxRetries: this.config.retries,
      baseDelay: this.config.retryDelay,
      maxDelay: 30000,
      backoffFactor: this.config.retryBackoff,
      retryCondition: this.defaultRetryCondition.bind(this)
    };

    this.cacheConfig = {
      enabled: this.config.enableCache,
      ttl: this.config.cacheTTL,
      maxSize: 1000
    };

    this.cache = new ApiCache(this.cacheConfig.maxSize);
    this.metrics = new MetricsCollector();
  }

  // ==================== 配置方法 ====================

  setAuth(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  // ==================== 核心请求方法 ====================

  async request<T = any>(
    url: string, 
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const requestConfig = this.buildRequestConfig(config);
    const cacheKey = this.generateCacheKey(fullUrl, requestConfig);

    // 记录请求指标
    if (this.config.enableMetrics) {
      this.metrics.recordRequest(url);
    }

    // 检查缓存
    if (this.shouldUseCache(requestConfig)) {
      const cachedResponse = this.cache.get<ApiResponse<T>>(cacheKey);
      if (cachedResponse) {
        if (this.config.enableMetrics) {
          this.metrics.recordCacheHit();
        }
        return cachedResponse;
      }
      if (this.config.enableMetrics) {
        this.metrics.recordCacheMiss();
      }
    }

    // 执行请求（带重试）
    const startTime = Date.now();
    try {
      const response = await this.executeWithRetry(fullUrl, requestConfig);
      const responseTime = Date.now() - startTime;

      // 记录成功指标
      if (this.config.enableMetrics) {
        this.metrics.recordSuccess(url, responseTime);
      }

      // 缓存响应
      if (this.shouldCacheResponse(response, requestConfig)) {
        this.cache.set(cacheKey, response, this.cacheConfig.ttl);
      }

      return response;
    } catch (error) {
      // 记录失败指标
      if (this.config.enableMetrics && error instanceof ApiServiceError) {
        this.metrics.recordFailure(url, error);
      }
      throw error;
    }
  }

  // ==================== HTTP方法 ====================

  async get<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { 
      ...config, 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { 
      ...config, 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { 
      ...config, 
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // ==================== 工具方法 ====================

  getMetrics(): ApiMetrics {
    return this.metrics.getMetrics();
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size(),
      maxSize: this.cacheConfig.maxSize
    };
  }

  // ==================== 私有方法 ====================

  private buildUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.config.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private buildRequestConfig(config: RequestConfig): RequestConfig {
    let requestConfig: RequestConfig = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      timeout: config.timeout || this.config.timeout,
      ...config
    };

    // 应用认证
    if (this.authConfig) {
      requestConfig = this.applyAuth(requestConfig);
    }

    // 应用版本控制
    if (this.config.enableVersioning) {
      requestConfig.headers = {
        ...requestConfig.headers,
        'API-Version': this.config.apiVersion
      };
    }

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      requestConfig = interceptor(requestConfig);
    }

    return requestConfig;
  }

  private applyAuth(config: RequestConfig): RequestConfig {
    if (!this.authConfig) return config;

    const headers = { ...config.headers };

    if (this.authConfig.token) {
      headers['Authorization'] = `Bearer ${this.authConfig.token}`;
    } else if (this.authConfig.apiKey) {
      headers['X-API-Key'] = this.authConfig.apiKey;
    } else if (this.authConfig.basicAuth) {
      const { username, password } = this.authConfig.basicAuth;
      const credentials = btoa(`${username}:${password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return { ...config, headers };
  }

  private async executeWithRetry<T>(
    url: string, 
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 如果是最后一次尝试，或者错误不可重试，直接抛出
        if (attempt === this.retryConfig.maxRetries || !this.shouldRetry(lastError)) {
          throw lastError;
        }

        // 记录重试指标
        if (this.config.enableMetrics) {
          this.metrics.recordRetry();
        }

        // 调用重试回调
        if (this.retryConfig.onRetry) {
          this.retryConfig.onRetry(attempt + 1, lastError);
        }

        // 等待重试延迟
        await this.delay(this.calculateRetryDelay(attempt));
      }
    }

    throw lastError!;
  }

  private async executeRequest<T>(
    url: string, 
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await this.parseResponse<T>(response);

      // 应用响应拦截器
      let finalResponse = responseData;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = interceptor(finalResponse);
      }

      return finalResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.handleRequestError(error);
    }
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    let data: any;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw this.createErrorFromResponse(response, data);
    }

    // 确保响应符合ApiResponse格式
    if (data && typeof data === 'object' && 'success' in data) {
      return data as ApiResponse<T>;
    }

    // 包装非标准响应
    return {
      success: true,
      data: data as T,
      timestamp: new Date().toISOString()
    };
  }

  private createErrorFromResponse(response: Response, data: any): ApiServiceError {
    const status = response.status;
    const message = data?.message || data?.error?.message || response.statusText;

    switch (status) {
      case 400:
        if (data?.errors) {
          return new ValidationError(message, data.errors);
        }
        return new ApiServiceError(message, 'BAD_REQUEST', status, data);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        return new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message, status, data);
      default:
        return new ApiServiceError(message, 'HTTP_ERROR', status, data, status >= 500);
    }
  }

  private handleRequestError(error: any): ApiServiceError {
    if (error.name === 'AbortError') {
      return new TimeoutError(this.config.timeout);
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network connection failed', error);
    }

    if (error instanceof ApiServiceError) {
      return error;
    }

    return new ApiServiceError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      undefined,
      error,
      true
    );
  }

  private shouldRetry(error: Error): boolean {
    if (error instanceof ApiServiceError) {
      return error.retryable;
    }
    return this.retryConfig.retryCondition(error);
  }

  private defaultRetryCondition(error: any): boolean {
    // 网络错误和服务器错误可以重试
    return error instanceof NetworkError || 
           error instanceof TimeoutError ||
           (error instanceof ServerError && error.status >= 500);
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateCacheKey(url: string, config: RequestConfig): string {
    if (this.cacheConfig.keyGenerator) {
      return this.cacheConfig.keyGenerator(url, config);
    }
    
    const method = config.method || 'GET';
    const body = config.body || '';
    const params = new URLSearchParams(url.split('?')[1] || '').toString();
    
    return `${method}:${url}:${params}:${body}`;
  }

  private shouldUseCache(config: RequestConfig): boolean {
    return this.cacheConfig.enabled && 
           (config.method === 'GET' || !config.method) &&
           (config.cache !== false);
  }

  private shouldCacheResponse(response: any, config: RequestConfig): boolean {
    if (!this.shouldUseCache(config)) {
      return false;
    }

    if (this.cacheConfig.shouldCache) {
      return this.cacheConfig.shouldCache(response);
    }

    return response.success === true;
  }
}

// ==================== 默认实例 ====================

export const apiService = new EnhancedApiService({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  enableLogging: import.meta.env.DEV,
  enableMetrics: true
});

export default apiService;
