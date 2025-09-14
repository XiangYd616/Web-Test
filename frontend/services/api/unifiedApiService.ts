/**
 * 统一API服务 - 整合所有API调用功能
 * 版本: v3.0.0
 * 更新时间: 2025-01-14
 * 
 * 此文件整合了以下重复的API服务文件：
 * - apiService.ts
 * - baseApiService.ts  
 * - enhancedApiService.ts (企业级功能已整合)
 * - unifiedTestApiService.ts
 * - testApiService.ts
 * 
 * 新增企业级功能：
 * - 专业错误处理和分类
 * - 智能重试机制
 * - 高级缓存管理
 * - 性能指标收集
 * - 请求/响应拦截器
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from '@types/common';

// 导入企业级功能模块
import { ApiCache } from './core/apiCache';
import { MetricsCollector } from './core/apiMetrics';
import { 
  createErrorFromResponse, 
  handleRequestError, 
  ApiServiceError,
  NetworkError,
  TimeoutError 
} from './core/apiErrors';
import type { 
  ApiMetrics,
  RequestInterceptor,
  ResponseInterceptor 
} from './core/apiTypes';

// ==================== 配置接口 ====================

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  retryBackoff?: number; // 新增：指数退避系数
  enableCache: boolean;
  cacheTTL: number;
  maxCacheSize?: number; // 新增：最大缓存大小
  enableLogging: boolean;
  enableMetrics: boolean;
  enableVersioning?: boolean; // 新增：启用版本控制
  apiVersion?: string; // 新增：API版本
  enableAdvancedErrors?: boolean; // 新增：启用企业级错误处理
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface AuthConfig {
  token?: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string };
}

// ==================== 测试相关接口 ====================

export interface TestConfig {
  url: string;
  testType?: string;
  [key: string]: any;
}

export interface TestSession {
  id: string;
  type: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  config: TestConfig;
  result?: any;
  error?: string;
}

export interface TestProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  metrics?: any;
}

// ==================== 统一API服务类 ====================

export class UnifiedApiService {
  private config: ApiConfig;
  private authConfig: AuthConfig = {};
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private advancedCache?: ApiCache; // 企业级缓存
  private metricsCollector?: MetricsCollector; // 企业级指标
  private requestInterceptors: RequestInterceptor[] = []; // 请求拦截器
  private responseInterceptors: ResponseInterceptor[] = []; // 响应拦截器
  private metrics = {
    requests: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      retryBackoff: 2, // 新增默认值
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      maxCacheSize: 1000, // 新增默认值
      enableLogging: import.meta.env.DEV,
      enableMetrics: true,
      enableVersioning: false, // 新增默认值
      apiVersion: 'v1', // 新增默认值
      enableAdvancedErrors: true, // 新增默认值
      ...config
    };
    
    // 初始化企业级功能
    this.initializeEnhancedFeatures();
  }
  
  private initializeEnhancedFeatures(): void {
    // 初始化高级缓存
    if (this.config.enableCache && this.config.maxCacheSize) {
      this.advancedCache = new ApiCache(this.config.maxCacheSize);
    }
    
    // 初始化指标收集器
    if (this.config.enableMetrics) {
      this.metricsCollector = new MetricsCollector();
    }
  }

  // ==================== 企业级功能 API ====================

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 获取高级指标
   */
  getAdvancedMetrics(): ApiMetrics | null {
    return this.metricsCollector?.getMetrics() || null;
  }

  /**
   * 清空高级缓存
   */
  clearAdvancedCache(): void {
    this.advancedCache?.clear();
  }

  /**
   * 获取高级缓存状态
   */
  getAdvancedCacheStats() {
    return this.advancedCache ? {
      size: this.advancedCache.size(),
      maxSize: this.config.maxCacheSize || 1000
    } : null;
  }

  // ==================== 认证管理 ====================

  setAuth(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  getToken(): string | undefined {
    return this.authConfig.token || localStorage.getItem('auth_token') || undefined;
  }

  setToken(token: string): void {
    this.authConfig.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearAuth(): void {
    this.authConfig = {};
    localStorage.removeItem('auth_token');
  }

  // ==================== 缓存管理 ====================

  private getCacheKey(url: string, config: RequestConfig): string {
    return `${config.method || 'GET'}:${url}:${JSON.stringify(config.body || {})}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(key);
    if (!cached) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return cached.data;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL
    });
  }

  // ==================== 核心请求方法 ====================

  async request<T = any>(
    url: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, config);
    
    // 记录企业级指标
    this.metricsCollector?.recordRequest();

    // 检查高级缓存（优先使用）
    if (config.method === 'GET' || !config.method) {
      if (this.advancedCache?.has(cacheKey)) {
        const cached = this.advancedCache.get<ApiResponse<T>>(cacheKey);
        if (cached) {
          this.metricsCollector?.recordCacheHit();
          if (this.config.enableLogging) {
            console.log(`🎯 高级缓存命中: ${config.method || 'GET'} ${url}`);
          }
          return cached;
        }
      }
      
      // 备用：检查传统缓存
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metricsCollector?.recordCacheHit();
        if (this.config.enableLogging) {
          console.log(`🎯 缓存命中: ${config.method || 'GET'} ${url}`);
        }
        return cached;
      }
      
      this.metricsCollector?.recordCacheMiss();
    }

    // 构建请求配置
    let requestConfig: RequestConfig = {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
        ...(this.config.enableVersioning ? { 'API-Version': this.config.apiVersion || 'v1' } : {}),
        ...config.headers
      },
      ...(config.body ? { body: JSON.stringify(config.body) } : {}),
      timeout: config.timeout || this.config.timeout
    };
    
    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      try {
        requestConfig = await interceptor(requestConfig);
      } catch (error) {
        console.warn('请求拦截器执行失败:', error);
      }
    }
    
    // 转换为 fetch 配置
    const fetchConfig: RequestInit = {
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: requestConfig.body,
      signal: AbortSignal.timeout(requestConfig.timeout!)
    };

    const retries = config.retries ?? this.config.retries;
    let lastError: Error;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.metrics.requests++;

        if (this.config.enableLogging) {
          console.log(`🌐 API请求 (尝试 ${attempt + 1}/${retries + 1}): ${config.method || 'GET'} ${url}`);
        }

        const response = await fetch(fullUrl, fetchConfig);
        
        // 解析响应
        let responseData: any;
        const contentType = response.headers.get('content-type');
        try {
          if (contentType?.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
        } catch (parseError) {
          responseData = null;
        }

        if (response.ok) {
          const responseTime = Date.now() - startTime;
          
          // 记录成功指标
          this.metricsCollector?.recordSuccess(responseTime);
          
          // 标准化响应格式
          let finalResponse: ApiResponse<T>;
          if (responseData && typeof responseData === 'object' && 'success' in responseData) {
            finalResponse = responseData;
          } else {
            finalResponse = {
              success: true,
              data: responseData as T,
              meta: {
                timestamp: new Date().toISOString()
              }
            };
          }
          
          // 应用响应拦截器
          for (const interceptor of this.responseInterceptors) {
            try {
              finalResponse = await interceptor(finalResponse);
            } catch (error) {
              console.warn('响应拦截器执行失败:', error);
            }
          }
          
          // 缓存成功响应
          if (config.method === 'GET' || !config.method) {
            // 优先使用高级缓存
            if (this.advancedCache) {
              this.advancedCache.set(cacheKey, finalResponse, config.cacheTTL || this.config.cacheTTL);
            } else {
              this.setCache(cacheKey, finalResponse, config.cacheTTL);
            }
          }

          if (this.config.enableLogging) {
            console.log(`✅ API请求成功: ${config.method || 'GET'} ${url} (耗时: ${responseTime}ms)`);
          }

          return finalResponse;
        } else {
          // 使用企业级错误处理
          if (this.config.enableAdvancedErrors) {
            throw createErrorFromResponse(response, responseData);
          } else {
            throw new Error(responseData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.metrics.errors++;
        
        // 记录失败指标
        if (error instanceof ApiServiceError) {
          this.metricsCollector?.recordFailure(error.code);
        }

        if (this.config.enableLogging) {
          console.warn(`⚠️ API请求失败 (尝试 ${attempt + 1}/${retries + 1}): ${lastError.message}`);
        }

        // 判断是否可重试
        let shouldRetry = false;
        if (this.config.enableAdvancedErrors && lastError instanceof ApiServiceError) {
          shouldRetry = lastError.retryable;
        } else {
          shouldRetry = !this.isNonRetryableError(lastError);
        }

        // 如果是最后一次尝试，或者错误不可重试，直接抛出
        if (attempt === retries || !shouldRetry) {
          break;
        }
        
        // 记录重试指标
        this.metricsCollector?.recordRetry();

        // 计算重试延迟（指数退避）
        const retryDelay = this.calculateRetryDelay(attempt, config.retryDelay || this.config.retryDelay);
        await this.delay(retryDelay);
      }
    }

    throw lastError!;
  }

  // ==================== 便捷方法 ====================

  async get<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', body: data });
  }

  async delete<T = any>(url: string, config: Omit<RequestConfig, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', body: data });
  }

  // ==================== 分页请求 ====================

  async getPaginated<T = any>(
    url: string,
    params: PaginationParams,
    config: Omit<RequestConfig, 'method'> = {}
  ): Promise<PaginatedResponse<T>> {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {})
    });

    const fullUrl = `${url}?${queryParams}`;
    return this.get<T[]>(fullUrl, config) as Promise<PaginatedResponse<T>>;
  }

  // ==================== 工具方法 ====================

  private isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'unauthorized',
      'forbidden',
      'not found',
      'bad request',
      'validation error'
    ];

    return nonRetryableMessages.some(msg =>
      error.message.toLowerCase().includes(msg)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 计算指数退避重试延迟
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    const backoff = this.config.retryBackoff || 2;
    const delay = baseDelay * Math.pow(backoff, attempt);
    const maxDelay = 30000; // 最大30秒
    return Math.min(delay, maxDelay);
  }

  // ==================== 测试API方法 ====================

  // 网站测试
  async startWebsiteTest(config: TestConfig): Promise<ApiResponse<TestSession>> {
    return this.post('/test/website', config);
  }

  async getWebsiteTestStatus(testId: string): Promise<ApiResponse<TestSession>> {
    return this.get(`/test/website/status/${testId}`);
  }

  async getWebsiteTestResult(testId: string): Promise<ApiResponse<any>> {
    return this.get(`/test/website/result/${testId}`);
  }

  // API测试
  async startApiTest(config: TestConfig): Promise<ApiResponse<TestSession>> {
    return this.post('/test/api', config);
  }

  async getApiTestStatus(testId: string): Promise<ApiResponse<TestSession>> {
    return this.get(`/test/api/status/${testId}`);
  }

  // 压力测试
  async startStressTest(config: TestConfig): Promise<ApiResponse<TestSession>> {
    return this.post('/test/stress', config);
  }

  async getStressTestStatus(testId: string): Promise<ApiResponse<TestSession>> {
    return this.get(`/test/stress/status/${testId}`);
  }

  async stopStressTest(testId: string): Promise<ApiResponse<void>> {
    return this.post(`/test/stress/stop/${testId}`);
  }

  // 测试历史
  async getTestHistory(params: PaginationParams): Promise<PaginatedResponse<TestSession>> {
    return this.getPaginated('/test/history', params);
  }

  async deleteTest(testId: string): Promise<ApiResponse<void>> {
    return this.delete(`/test/${testId}`);
  }

  // ==================== 用户API方法 ====================

  // 认证
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.post('/auth/login', credentials);
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.post('/auth/logout');
    this.clearAuth();
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.post('/auth/refresh');
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  // 用户信息
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/user/profile');
  }

  async updateProfile(data: any): Promise<ApiResponse<any>> {
    return this.put('/user/profile', data);
  }

  // ==================== 系统API方法 ====================

  async getSystemHealth(): Promise<ApiResponse<any>> {
    return this.get('/system/health');
  }

  async getSystemMetrics(): Promise<ApiResponse<any>> {
    return this.get('/system/metrics');
  }

  // ==================== 监控和调试 ====================

  getMetrics() {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// ==================== 默认实例 ====================

export const unifiedApiService = new UnifiedApiService();
export default unifiedApiService;
