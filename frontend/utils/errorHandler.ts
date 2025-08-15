/**
 * 统一错误处理工具
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  /**
   * 处理API错误
   */
  static handleApiError(error: any): AppError {
    const timestamp = new Date().toISOString();

    if (error.response) {
      // HTTP错误响应
      return {
        code: `HTTP_${error.response.status}`,
        message: error.response.data?.message || '请求失败',
        details: error.response.data,
        timestamp
      };
    } else if (error.request) {
      // 网络错误
      return {
        code: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        timestamp
      };
    } else {
      // 其他错误
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || '未知错误',
        timestamp
      };
    }
  }

  /**
   * 显示错误消息
   */
  static showError(error: AppError) {
    console.error('应用错误:', error);

    // 这里可以集成通知组件
    if (typeof window !== 'undefined') {
      // 简单的错误提示
      alert(`错误: ${error.message}`);
    }
  }

  /**
   * 记录错误到后端监控系统
   */
  static async logError(error: AppError) {
    try {
      // 发送错误到统一监控服务
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          id: `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: this.getErrorType(error),
          severity: this.getErrorSeverity(error),
          message: error.message,
          details: error.details,
          code: error.code,
          timestamp: error.timestamp,
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
          },
          stack: error.details?.stack,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (!response.ok) {
        console.warn('错误报告发送失败:', response.status);
      }
    } catch (reportError) {
      console.error('发送错误报告时出错:', reportError);
    }
  }

  /**
   * 获取错误类型
   */
  private static getErrorType(error: AppError): string {
    if (error.code.startsWith('NETWORK_')) return 'network';
    if (error.code.startsWith('HTTP_4')) return 'validation';
    if (error.code.startsWith('HTTP_401') || error.code.startsWith('HTTP_403')) return 'authentication';
    return 'application';
  }

  /**
   * 获取错误严重程度
   */
  private static getErrorSeverity(error: AppError): string {
    if (error.code === 'NETWORK_ERROR') return 'critical';
    if (error.code.startsWith('HTTP_5')) return 'error';
    if (error.code.startsWith('HTTP_4')) return 'warning';
    return 'info';
  }
}