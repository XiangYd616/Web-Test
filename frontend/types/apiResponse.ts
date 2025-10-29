/**
 * apiResponse.ts - API响应类型定义
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  timestamp?: number;
}

export interface PaginatedAPIResponse<T = any> extends Omit<APIResponse<T>, 'data'> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  status: number;
  details?: any;
}

