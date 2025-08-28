/**
 * 统一API服务 - 整合所有API调用功能
 * 版本: v2.0.0
 * 创建时间: 2025-08-24
 * 
 * 此文件整合了以下重复的API服务文件：
 * - apiService.ts
 * - baseApiService.ts  
 * - enhancedApiService.ts
 * - unifiedTestApiService.ts
 * - testApiService.ts
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from '../../types/common';

// ==================== 配置接口 ====================

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  enableCache: boolean;
  cacheTTL: number;
  enableLogging: boolean;
  enableMetrics: boolean;
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
      enableCache: true,
      cacheTTL: 300000, // 5分钟
      enableLogging: import.meta.env.DEV,
      enableMetrics: true,
      ...config
    };
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

    // 检查缓存
    if (config.method === 'GET' || !config.method) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        if (this.config.enableLogging) {
          console.log(`🎯 缓存命中: ${config.method || 'GET'} ${url}`);
        }
        return cached;
      }
    }

    const requestConfig: RequestInit = {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() ? { 'Authorization': `Bearer ${this.getToken()}` } : {}),
        ...config.headers
      },
      ...(config.body ? { body: JSON.stringify(config.body) } : {}),
      signal: AbortSignal.timeout(config.timeout || this.config.timeout)
    };

    const retries = config.retries ?? this.config.retries;
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.metrics.requests++;

        if (this.config.enableLogging) {
          console.log(`🌐 API请求 (尝试 ${attempt + 1}/${retries + 1}): ${config.method || 'GET'} ${url}`);
        }

        const response = await fetch(fullUrl, requestConfig);
        const responseData = await response.json();

        if (response.ok) {
          // 缓存成功响应
          if (config.method === 'GET' || !config.method) {
            this.setCache(cacheKey, responseData, config.cacheTTL);
          }

          if (this.config.enableLogging) {
            console.log(`✅ API请求成功: ${config.method || 'GET'} ${url}`);
          }

          return responseData;
        } else {
          throw new Error(responseData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.metrics.errors++;

        if (this.config.enableLogging) {
          console.warn(`⚠️ API请求失败 (尝试 ${attempt + 1}/${retries + 1}): ${lastError.message}`);
        }

        // 如果是最后一次尝试，或者是不可重试的错误，直接抛出
        if (attempt === retries || this.isNonRetryableError(lastError)) {
          break;
        }

        // 等待后重试
        await this.delay(config.retryDelay || this.config.retryDelay);
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
