// API Response standardization types

export interface StandardAPIResponse<T = any> {
  status: number;
  statusText?: string;
  data?: T;
  message?: string;
  error?: string | Error;
  errors?: string[];
  success: boolean;
  timestamp?: number;
  metadata?: {
    requestId?: string;
    duration?: number;
    version?: string;
  };
}

export interface PaginatedResponse<T = any> extends StandardAPIResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse extends StandardAPIResponse<null> {
  error: string;
  errorCode?: string;
  errorDetails?: any;
  stack?: string;
}

// Type guard functions
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && !response.success && !!response.error;
}

export function isSuccessResponse<T>(response: any): response is StandardAPIResponse<T> {
  return response && response.success === true;
}
