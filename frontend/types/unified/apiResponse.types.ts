/**
 * 统一API响应格式 - 兼容前后端
 * 确保前端类型定义与后端API规范完全兼容
 * 版本: v1.1.0
 */

// 重新导出主要的响应类型，确保兼容性
export type {
  ApiError, ApiErrorResponse, ApiResponse,
  ApiSuccessResponse, PaginatedResponse, PaginationInfo, QueryParams, RequestConfig, ValidationError
} from '../apiResponse.types';

// 导出工具函数
export {
  createErrorResponse,
  createPaginatedResponse, createSuccessResponse, extractData,
  extractError,
  extractPagination, isApiErrorResponse, isApiSuccessResponse, isPaginatedResponse,
  isRetryableError
} from '../apiResponse.types';

// ==================== 后端兼容性类型 ====================

/**
 * 后端API规范的简化响应格式
 * 用于兼容后端返回的数据格式
 */
export interface BackendSuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

export interface BackendErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

export type BackendApiResponse<T = any> = BackendSuccessResponse<T> | BackendErrorResponse;

// ==================== 响应转换器 ====================

/**
 * 将后端响应格式转换为前端统一格式
 */
export function transformBackendResponse<T>(
  backendResponse: BackendApiResponse<T>
): ApiResponse<T> {
  if (backendResponse.success) {
    return {
      success: true,
      message: backendResponse.message,
      data: backendResponse.data,
      meta: {
        timestamp: backendResponse.timestamp,
        requestId: '',
        path: '',
        method: ''
      }
    };
  } else {
    return {
      success: false,
      error: {
        code: backendResponse.error.code,
        message: backendResponse.error.message,
        details: backendResponse.error.details,
        timestamp: backendResponse.timestamp
      },
      meta: {
        timestamp: backendResponse.timestamp,
        requestId: '',
        path: '',
        method: ''
      }
    };
  }
}

/**
 * 将前端响应格式转换为后端格式（用于测试或模拟）
 */
export function transformToBackendResponse<T>(
  frontendResponse: ApiResponse<T>
): BackendApiResponse<T> {
  if (frontendResponse.success) {
    return {
      success: true,
      data: frontendResponse.data,
      message: frontendResponse.message,
      timestamp: frontendResponse.meta.timestamp
    };
  } else {
    return {
      success: false,
      error: {
        code: frontendResponse.error.code,
        message: frontendResponse.error.message,
        details: frontendResponse.error.details
      },
      timestamp: frontendResponse.meta.timestamp
    };
  }
}

// ==================== 类型守卫 ====================

export function isBackendSuccessResponse<T>(
  response: BackendApiResponse<T>
): response is BackendSuccessResponse<T> {
  return response.success === true;
}

export function isBackendErrorResponse<T>(
  response: BackendApiResponse<T>
): response is BackendErrorResponse {
  return response.success === false;
}

// ==================== 响应处理工具 ====================

/**
 * 统一的响应处理器
 * 自动检测响应格式并转换为前端统一格式
 */
export function normalizeApiResponse<T>(
  response: any
): ApiResponse<T> {
  // 如果已经是前端格式（包含meta字段）
  if (response && typeof response === 'object' && 'meta' in response) {
    return response as ApiResponse<T>;
  }

  // 如果是后端格式（包含timestamp字段但没有meta字段）
  if (response && typeof response === 'object' && 'timestamp' in response && !('meta' in response)) {
    return transformBackendResponse<T>(response as BackendApiResponse<T>);
  }

  // 如果是其他格式，尝试构建标准响应
  if (response && typeof response === 'object') {
    if (response.success === true) {
      return {
        success: true,
        message: response.message || '操作成功',
        data: response.data || response,
        meta: {
          timestamp: response.timestamp || new Date().toISOString(),
          requestId: response.requestId || '',
          path: response.path || '',
          method: response.method || ''
        }
      };
    } else if (response.success === false) {
      return {
        success: false,
        error: {
          code: response.error?.code || response.code || 'UNKNOWN_ERROR',
          message: response.error?.message || response.message || '未知错误',
          details: response.error?.details || response.details,
          timestamp: response.timestamp || new Date().toISOString()
        },
        meta: {
          timestamp: response.timestamp || new Date().toISOString(),
          requestId: response.requestId || '',
          path: response.path || '',
          method: response.method || ''
        }
      };
    }
  }

  // 默认错误响应
  return {
    success: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: '无效的响应格式',
      details: { originalResponse: response },
      timestamp: new Date().toISOString()
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: ''
    }
  };
}

// ==================== HTTP状态码映射 ====================

export const HTTP_STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'SERVICE_UNAVAILABLE',
  503: 'SERVICE_UNAVAILABLE',
  504: 'SERVICE_UNAVAILABLE'
};

/**
 * 根据HTTP状态码创建错误响应
 */
export function createErrorFromStatus(
  status: number,
  message?: string,
  details?: Record<string, any>
): ApiResponse<never> {
  const code = HTTP_STATUS_TO_ERROR_CODE[status] || 'UNKNOWN_ERROR';
  const errorMessage = message || `HTTP ${status} 错误`;

  return {
    success: false,
    error: {
      code,
      message: errorMessage,
      details: { httpStatus: status, ...details },
      timestamp: new Date().toISOString()
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: ''
    }
  };
}

// ==================== 导出所有类型和工具 ====================

// 重新导出所有需要的类型
export type {
  BackendApiResponse, BackendErrorResponse, BackendSuccessResponse
};

// 工具函数已在上面单独导出，无需重复导出
