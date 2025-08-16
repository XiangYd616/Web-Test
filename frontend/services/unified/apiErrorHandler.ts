// 统一 API 错误处理器

import type { ApiError, ApiResponse } from '../../types/api';

// 默认错误处理器
export const defaultErrorHandler = {
  /**
   * 处理 API 错误
   */
  handleError(error: ApiError | Error | unknown): ApiError {
    if (this.isApiError(error)) {
      return error;
    }

    if (error instanceof Error) {
      
        return {
        code: 'UNKNOWN_ERROR',
        message: error.message || '未知错误',
        timestamp: new Date().toISOString(),
        details: {
          stack: error.stack,
          name: error.name
      }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: '发生了未知错误',
      timestamp: new Date().toISOString(),
      details: error
    };
  },

  /**
   * 检查是否为 API 错误
   */
  isApiError(error: any): error is ApiError {
    return error && 
           typeof error === 'object' && 
           typeof error.code === 'string' && 
           typeof error.message === 'string';
  },

  /**
   * 格式化错误消息
   */
  formatErrorMessage(error: ApiError): string {
    const baseMessage = error.message || '未知错误';
    
    if (error.details && typeof error.details === 'object') {
      const details = Object.entries(error.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `${baseMessage} (${details})`;
    }

    return baseMessage;
  },

  /**
   * 记录错误
   */
  logError(error: ApiError, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    
    console.error(`${timestamp}${contextStr} API Error:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    });
  },

  /**
   * 创建标准化错误响应
   */
  createErrorResponse<T = any>(error: ApiError): ApiResponse<T> {
    return {
      success: false,
      message: error.message,
      error: error,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        version: '1.0'
      }
    };
  },

  /**
   * 生成请求ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  /**
   * 网络错误处理
   */
  handleNetworkError(error: any): ApiError {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      
        return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        timestamp: new Date().toISOString(),
        details: {
          originalError: error.message
      }
      };
    }

    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      
        return {
        code: 'REQUEST_TIMEOUT',
        message: '请求超时，请稍后重试',
        timestamp: new Date().toISOString(),
        details: {
          timeout: error.timeout || 'unknown'
      }
      };
    }

    return this.handleError(error);
  },

  /**
   * HTTP 状态码错误处理
   */
  handleHttpError(status: number, statusText: string, responseData?: any): ApiError {
    const errorMap: Record<number, { code: string; message: string }> = {
      400: { code: 'BAD_REQUEST', message: '请求参数错误' },
      401: { code: 'UNAUTHORIZED', message: '未授权访问' },
      403: { code: 'FORBIDDEN', message: '访问被禁止' },
      404: { code: 'NOT_FOUND', message: '请求的资源不存在' },
      409: { code: 'CONFLICT', message: '请求冲突' },
      422: { code: 'VALIDATION_ERROR', message: '数据验证失败' },
      429: { code: 'RATE_LIMIT', message: '请求过于频繁' },
      500: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
      502: { code: 'BAD_GATEWAY', message: '网关错误' },
      503: { code: 'SERVICE_UNAVAILABLE', message: '服务暂不可用' },
      504: { code: 'GATEWAY_TIMEOUT', message: '网关超时' }
    };

    const errorInfo = errorMap[status] || {
      code: 'HTTP_ERROR',
      message: `HTTP错误: ${status} ${statusText}`
    };

    return {
      code: errorInfo.code,
      message: errorInfo.message,
      timestamp: new Date().toISOString(),
      details: {
        status,
        statusText,
        responseData
      }
    };
  }
};

// 导出类型
export type ErrorHandler = typeof defaultErrorHandler;

// 导出默认实例
export default defaultErrorHandler;
