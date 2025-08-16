/**
 * API响应类型定义 - 标准版本
 * 版本: v2.0.0
 * 创建时间: 2025-08-16
 *
 * 此文件现在导入共享的标准类型定义，确保前后端完全一致
 */

// 导入共享的标准类型定义
export {
  StandardApiError as ApiError, StandardApiErrorResponse as ApiErrorResponse, StandardApiMeta as ApiMeta,
  StandardApiResponse as ApiResponse,
  StandardApiSuccessResponse as ApiSuccessResponse, StandardCreatedResponse as CreatedResponse, StandardErrorCode as ErrorCode, StandardErrorMessages as ErrorMessages, HttpStatusCode, isStandardApiErrorResponse as isApiErrorResponse, isStandardApiSuccessResponse as isApiSuccessResponse, StandardNoContentResponse as NoContentResponse, StandardPaginatedResponse as PaginatedResponse, PaginationMeta, StandardStatusCodeMap as StatusCodeMap, Timestamp, UUID, ValidationError
} from '../../shared/types/standardApiResponse';
// ==================== 向后兼容的类型别名 ====================

// 为了向后兼容，保留一些旧的类型别名
export type PaginationInfo   = PaginationMeta;// ==================== 向后兼容的工具函数 ====================

// 重新导出一些常用的工具函数，保持向后兼容性
export {
  createCreatedResponse, createErrorResponse, createNoContentResponse, createPaginatedResponse, createPaginationMeta as createPagination, createSuccessResponse, generateRequestId
} from '../../shared/utils/apiResponseBuilder';
// ==================== 前端特有的接口定义 ====================

export interface RequestConfig     {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string | FormData | URLSearchParams | Record<string, any>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface AuthConfig     {
  token?: string;
  apiKey?: string;
  basicAuth?: { username: string; password: string };
  oauth2?: { accessToken: string; refreshToken?: string };
}

export interface QueryParams     {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedRequest extends QueryParams     {
  // 继承查询参数
}

// ==================== 前端API客户端接口 ====================

export interface ApiClient     {
  get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
}

// ==================== 前端特有的常量 ====================

export const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
  nextPage: null,
  prevPage: null
};

// ==================== 前端特有的工具函数 ====================

/**
 * 提取响应数据
 */
export function extractData<T>(response: ApiResponse<T>): T | null   {
  return isApiSuccessResponse(response) ? response.data : null;
}

/**
 * 提取错误信息
 */
export function extractError<T>(response: ApiResponse<T>): ApiError | null   {
  return isApiErrorResponse(response) ? response.error : null;
}

/**
 * 提取分页信息
 */
export function extractPagination<T>(response: ApiResponse<T>): PaginationMeta | null   {
  if (isApiSuccessResponse(response) && 'pagination' in response.meta) {'
    return (response.meta as any).pagination;
  }
  return null;
}
