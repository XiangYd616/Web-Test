/**
 * apiResponse.ts - API响应类型（兼容层）
 */

export interface ApiResponseCompat<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
  timestamp: number;
  requestId?: string;
}

export interface ApiErrorResponseCompat {
  success: false;
  error: string;
  message: string;
  status: number;
  timestamp: number;
  details?: {
    code?: string;
    field?: string;
    constraint?: string;
  };
}

export type ApiResultCompat<T> = ApiResponseCompat<T> | ApiErrorResponseCompat;
