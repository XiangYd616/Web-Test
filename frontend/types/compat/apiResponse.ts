/**
 * unified/apiResponse.ts - 统一API响应类型
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
