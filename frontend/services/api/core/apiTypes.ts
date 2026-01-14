/**
 * API服务核心类型定义 - 重构版本
 * 统一的接口定义，支持基础和增强功能
 * 现在使用标准API响应类型以确保前后端一致性
 */

// 导入标准API类型
import { ErrorCode as StandardErrorCode } from '../../../types/api/index';
import type {
  ApiMeta as ApiMetaType,
  ApiError as StandardApiError,
} from '../../../types/apiResponse.types';

// 使用标准类型作为主要接口
// 添加向后兼容的扩展，包含所有可能的属性
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | StandardApiError;
  errors?: string[];
  message?: string;
  meta?: ApiMetaType;
  pagination?: any;
  timestamp?: string;
  requestId?: string;
  [key: string]: any;
}

export type ApiError = StandardApiError;
export type ApiMeta = ApiMetaType;

// 导出标准错误代码供前端使用
export { StandardErrorCode as ErrorCode };

export interface RequestConfig extends Omit<RequestInit, 'cache'> {
  timeout?: number;
  retries?: number;
  cache?: boolean | RequestCache;
  retryDelay?: number;
  metadata?: Record<string, any>;
}

export interface AuthConfig {
  token?: string;
  apiKey?: string;
  basicAuth?: {
    username: string;
    password: string;
  };
  customHeaders?: Record<string, string>;
}

// 企业级配置（可选）
export interface ApiConfig {
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
  maxCacheSize?: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  retryAttempts: number;
  errorsByType: Record<string, number>;
}

// 拦截器类型
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor<T = any> = (
  response: ApiResponse<T>
) => ApiResponse<T> | Promise<ApiResponse<T>>;

export interface IApiService {
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;

  // 配置方法
  setAuth(authConfig: AuthConfig): void;

  // 可选的企业级功能
  addRequestInterceptor?(interceptor: RequestInterceptor): void;
  addResponseInterceptor?(interceptor: ResponseInterceptor): void;
  getMetrics?(): ApiMetrics;
  clearCache?(): void;
}
