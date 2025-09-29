/**
 * API服务核心类型定义
 * 统一的接口定义，支持基础和增强功能
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError | string;
  errors?: Record<string, string> | string[];
  meta?: {
    timestamp?: string;
    requestId?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  status?: number;
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  cache?: boolean;
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
export type ResponseInterceptor<T = any> = (response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

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
