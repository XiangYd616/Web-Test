import Logger from '@/utils/logger';

import type { ApiResponse } from '@/types/api';

/**
 * 统一的API服务基类
 * 整合项目中重复的API调用逻辑、认证和错误处理
 */

// ApiResponse类型已从统一类型定义导入

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface AuthConfig {
  token?: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string };
}

export class BaseApiService {
  protected baseUrl: string;
  protected defaultTimeout: number = 30000;
  protected defaultRetries: number = 3;
  protected defaultRetryDelay: number = 1000;
  protected authConfig: AuthConfig = {};

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_URL || `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`;
  }

  /**
   * 🔧 统一的认证配置
   */
  setAuth(config: AuthConfig): void {
    this.authConfig = { ...this.authConfig, ...config };
  }

  /**
   * 🔧 获取认证头
   */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.authConfig.token) {
      headers['Authorization'] = `Bearer ${this.authConfig.token}`;
    } else if (this.authConfig.apiKey) {
      headers['X-API-Key'] = this.authConfig.apiKey;
    } else if (this.authConfig.basicAuth) {
      const { username, password } = this.authConfig.basicAuth;
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
    } else {
      // 从localStorage获取token作为备用
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * 🔧 统一的请求方法
   */
  protected async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay
    } = config;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...headers
    };

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      body,
      signal: AbortSignal.timeout(timeout)
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {

        const response = await fetch(url, requestConfig);

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        const responseData = await this.parseResponse<T>(response);

        if (response.ok) {
          Logger.debug(`✅ API请求成功: ${method} ${url}`);
          return responseData;
        } else {
          const errorData = 'error' in responseData ? responseData.error : undefined;
          const errorMessage = typeof errorData === 'string'
            ? errorData
            : (typeof errorData === 'object' && errorData && 'message' in errorData) ? (errorData as any).message : `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        Logger.warn(`⚠️ API请求失败 (尝试 ${attempt + 1}/${retries + 1}): ${lastError?.message}`);

        // 如果是最后一次尝试，或者是不可重试的错误，直接抛出
        if (attempt === retries || this.isNonRetryableError(lastError)) {
          break;
        }

        // 等待后重试
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数退避
        }
      }
    }

    Logger.error(`❌ API请求最终失败: ${method} ${url}`, lastError);
    return {
      success: false,
      error: lastError?.message || 'API请求失败'
    };
  }

  /**
   * 🔧 解析响应数据
   */
  protected async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const text = await response.text();

      if (!text) {
        return {
          success: response.ok,
          data: undefined as T,
          message: response.ok ? '请求成功' : '请求失败'
        };
      }

      const data = JSON.parse(text);

      // 优化：统一响应格式，减少对象创建开销
      if (typeof data === 'object' && data !== null) {
        // 直接使用现有对象结构，避免不必要的属性复制
        const result: ApiResponse<T> = {
          success: response.ok && (data?.success !== false),
          data: data?.data || data
        };

        // 只在存在时才添加可选属性
        if (data?.error !== undefined) (result as any).error = data?.error;
        if (data?.message) (result as any).message = data?.message;
        if (data?.errors) (result as any).errors = data?.errors;

        return result;
      }

      return {
        success: response.ok,
        data: data as T,
        message: response.ok ? '请求成功' : '请求失败'
      };
    } catch (error) {
      return {
        success: false,
        error: `响应解析失败: ${error instanceof Error ? error?.message : String(error)}`
      };
    }
  }

  /**
   * 🔧 判断是否为不可重试的错误
   */
  protected isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /401/i, // 未授权
      /403/i, // 禁止访问
      /404/i, // 未找到
      /422/i, // 验证错误
      /400/i  // 请求错误
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error?.message));
  }

  /**
   * 🔧 延迟工具方法
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🔧 GET请求
   */
  public async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * 🔧 POST请求
   */
  public async post<T = any>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * 🔧 PUT请求
   */
  public async put<T = any>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * 🔧 DELETE请求
   */
  public async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * 🔧 PATCH请求
   */
  public async patch<T = any>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * 🔧 健康检查
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    return this.get('/health');
  }

  /**
   * 🔧 获取API版本信息
   */
  async getVersion(): Promise<ApiResponse<{ version: string; build: string }>> {
    return this.get('/version');
  }

  /**
   * 🔧 公共GET方法（别名）
   */
  async apiGet<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.get<T>(endpoint, config);
  }

  /**
   * 🔧 公共POST方法（别名）
   */
  async apiPost<T = any>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.post<T>(endpoint, data, config);
  }

  /**
   * 🔧 公共PUT方法（别名）
   */
  async apiPut<T = any>(endpoint: string, data?: unknown, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.put<T>(endpoint, data, config);
  }

  /**
   * 🔧 公共DELETE方法（别名）
   */
  async apiDelete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.delete<T>(endpoint, config);
  }
}

// 创建统一API服务实例
export const apiService = new BaseApiService();

export default BaseApiService;
