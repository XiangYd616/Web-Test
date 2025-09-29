/**
 * API相关类型定义
 * 版本: v2.0.0
 */

// 重新导出统一API响应类型
export * from './unified/apiResponse.types';

// API配置类型
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

// 认证配置类型
export interface AuthConfig {
  tokenKey: string;
  refreshTokenKey: string;
  tokenExpiry: number;
  autoRefresh: boolean;
  loginEndpoint: string;
  refreshEndpoint: string;
  token?: string;
  apiKey?: string;
  basicAuth?: {
    username: string;
    password: string;
  };
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 请求头类型
export interface RequestHeaders {
  'Content-Type'?: string;
  'Authorization'?: string;
  'Accept'?: string;
  [key: string]: string | undefined;
}

// API客户端接口
export interface ApiClient {
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
}

// 重新导入基础类型
import type {
  ApiResponse,
  RequestConfig
} from './unified/apiResponse.types';

// 注释掉重复导出，因为上面已经直接导出了这些类型
// export type {
//   ApiClient, ApiConfig,
//   HttpMethod,
//   RequestHeaders
// };

