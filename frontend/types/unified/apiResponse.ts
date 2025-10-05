/**
 * unified/apiResponse.ts - 统一API响应类型
 */

export interface UnifiedAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
  timestamp: number;
  requestId?: string;
}

export interface UnifiedErrorResponse {
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

export type UnifiedAPIResult<T> = UnifiedAPIResponse<T> | UnifiedErrorResponse;

