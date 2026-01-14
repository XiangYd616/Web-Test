/**
 * 统一API客户端
 * 所有HTTP请求的唯一入口
 * 版本: v1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { setupInterceptors } from './interceptors';

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API客户端配置
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 统一API客户端类
 */
class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 创建axios实例
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers
    });

    // 设置拦截器
    setupInterceptors(this.instance);
  }

  /**
   * GET请求
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.get(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * POST请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.post(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * PUT请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.put(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.patch(url, data, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance.delete(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * 处理响应
   */
  private handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { data } = response;

    // 如果响应格式不是标准ApiResponse,直接返回data
    if (!data || typeof data !== 'object') {
      return data as T;
    }

    // 标准ApiResponse格式
    if ('success' in data) {
      if (data.success && data.data !== undefined) {
        return data.data as T;
      }
      
      if (!data.success) {
        throw new Error(data.error?.message || data.message || 'Request failed');
      }
    }

    // 直接返回data
    return data as T;
  }

  /**
   * 处理错误
   */
  private handleError(error: AxiosError): Error {
    if (error.response) {
      // 服务器返回错误
      const data = error.response.data as ApiResponse;
      const message = data?.error?.message || data?.message || error.message;
      return new Error(message);
    } else if (error.request) {
      // 请求发送但未收到响应
      return new Error('网络请求失败,请检查网络连接');
    } else {
      // 其他错误
      return new Error(error.message || '未知错误');
    }
  }

  /**
   * 获取axios实例(供高级用户使用)
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

/**
 * 导出单例
 */
export const apiClient = new ApiClient();

/**
 * 导出类供自定义实例
 */
export { ApiClient };

/**
 * 默认导出
 */
export default apiClient;
