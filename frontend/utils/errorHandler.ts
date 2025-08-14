// 统一错误处理工具

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  static handle(error: any): ErrorInfo {
    const timestamp = new Date().toISOString();

    if (error.response) {
      // HTTP错误
      return {
        code: `HTTP_${error.response.status}`,
        message: error.response.data?.message || error.message,
        details: error.response.data,
        timestamp
      };
    } else if (error.request) {
      // 网络错误
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        details: error.request,
        timestamp
      };
    } else {
      // 其他错误
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || '未知错误',
        details: error,
        timestamp
      };
    }
  }

  static isRetryable(error: ErrorInfo): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'HTTP_500', 'HTTP_502', 'HTTP_503', 'HTTP_504'];
    return retryableCodes.includes(error.code);
  }

  static getRetryDelay(attempt: number): number {
    // 指数退避算法
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}

export const errorHandler = new ErrorHandler();
