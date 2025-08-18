/**
 * 增强版API客户端
 * 提供完整的HTTP请求、错误处理、缓存和重试机制
 */

// API响应接口
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
  requestId?: string;
}

// API错误接口
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// 请求配置接口
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class EnhancedApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private cache: Map<string, CacheItem<any>>;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit | Promise<RequestInit>>;
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>>;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultTimeout = 30000;
    this.defaultRetries = 3;
    this.cache = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    // 添加默认请求拦截器
    this.addRequestInterceptor(this.addAuthHeader.bind(this));
    this.addRequestInterceptor(this.addDefaultHeaders.bind(this));

    // 添加默认响应拦截器
    this.addResponseInterceptor(this.handleUnauthorized.bind(this));
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit | Promise<RequestInit>) {
    this.requestInterceptors.push(interceptor);
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>) {
    this.responseInterceptors.push(interceptor);
  }

  // 默认请求头
  private async addDefaultHeaders(config: RequestInit): Promise<RequestInit> {
    return {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...config.headers
      }
    };
  }

  // 添加认证头
  private async addAuthHeader(config: RequestInit): Promise<RequestInit> {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        }
      };
    }
    return config;
  }

  // 处理未授权响应
  private async handleUnauthorized(response: Response): Promise<Response> {
    if (response.status === 401) {
      // 清除认证信息
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // 重定向到登录页面
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return response;
  }

  // 生成缓存键
  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`;
  }

  // 获取缓存数据
  private getCachedData<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // 设置缓存数据
  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // 清除缓存
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // 核心请求方法
  private async request<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      cache = false,
      cacheTTL = 300000, // 5分钟
      signal
    } = config;

    // 构建完整URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    // 检查缓存
    if (cache && (options.method === 'GET' || !options.method)) {
      const cacheKey = this.getCacheKey(fullUrl, options);
      const cachedData = this.getCachedData<ApiResponse<T>>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // 应用请求拦截器
    let finalOptions = { ...options };
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await interceptor(finalOptions);
    }

    // 创建AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    finalOptions.signal = controller.signal;

    let lastError: Error;
    
    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(fullUrl, finalOptions);
        clearTimeout(timeoutId);

        // 应用响应拦截器
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${finalResponse.status}: ${finalResponse.statusText}`);
        }

        const result: ApiResponse<T> = await finalResponse.json();

        // 缓存成功的GET请求
        if (cache && (options.method === 'GET' || !options.method)) {
          const cacheKey = this.getCacheKey(fullUrl, options);
          this.setCachedData(cacheKey, result, cacheTTL);
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // 如果是最后一次尝试或者是不可重试的错误，直接抛出
        if (attempt === retries || error instanceof TypeError || (error as any).name === 'AbortError') {
          break;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }

    clearTimeout(timeoutId);
    throw lastError!;
  }

  // GET请求
  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET' }, { cache: true, ...config });
  }

  // POST请求
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, config);
  }

  // PUT请求
  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, config);
  }

  // PATCH请求
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }, config);
  }

  // DELETE请求
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' }, config);
  }

  // 文件上传
  async upload<T>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>(url, {
      method: 'POST',
      body: formData,
      headers: {} // 让浏览器自动设置Content-Type
    }, config);
  }

  // 批量请求
  async batch<T>(requests: Array<{
    url: string;
    method?: string;
    data?: any;
    config?: RequestConfig;
  }>): Promise<Array<ApiResponse<T> | Error>> {
    const promises = requests.map(req => 
      this.request<T>(req.url, {
        method: req.method || 'GET',
        body: req.data ? JSON.stringify(req.data) : undefined
      }, req.config).catch(error => error)
    );

    return Promise.all(promises);
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', { timeout: 5000, retries: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // 获取缓存统计
  getCacheStats() {
    const now = Date.now();
    let validItems = 0;
    let expiredItems = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        expiredItems++;
      } else {
        validItems++;
      }
    }

    return {
      total: this.cache.size,
      valid: validItems,
      expired: expiredItems
    };
  }

  // 清理过期缓存
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建默认实例
export const apiClient = new EnhancedApiClient();

// 导出类和实例
export default EnhancedApiClient;
