/**
 * 统一错误处理系统
 * 提供一致的错误处理和用户反馈机制
 */

// 错误类型枚举
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 标准化错误接口
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  severity: ErrorSeverity;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  userMessage?: string;
}

// 错误处理配置
interface ErrorHandlerConfig {
  showToast: boolean;
  logToConsole: boolean;
  reportToService: boolean;
  retryable: boolean;
}

// 默认错误配置
const defaultErrorConfigs: Record<ErrorType, ErrorHandlerConfig> = {
  [ErrorType.NETWORK_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: true
  },
  [ErrorType.VALIDATION_ERROR]: {
    showToast: true,
    logToConsole: false,
    reportToService: false,
    retryable: false
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: false
  },
  [ErrorType.AUTHORIZATION_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: false
  },
  [ErrorType.NOT_FOUND_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: false,
    retryable: false
  },
  [ErrorType.SERVER_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: true
  },
  [ErrorType.TIMEOUT_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: true
  },
  [ErrorType.UNKNOWN_ERROR]: {
    showToast: true,
    logToConsole: true,
    reportToService: true,
    retryable: false
  }
};

// 用户友好的错误消息映射
const userFriendlyMessages: Record<ErrorType, string> = {
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ErrorType.VALIDATION_ERROR]: '输入信息有误，请检查后重试',
  [ErrorType.AUTHENTICATION_ERROR]: '登录已过期，请重新登录',
  [ErrorType.AUTHORIZATION_ERROR]: '您没有权限执行此操作',
  [ErrorType.NOT_FOUND_ERROR]: '请求的资源不存在',
  [ErrorType.SERVER_ERROR]: '服务器内部错误，请稍后重试',
  [ErrorType.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ErrorType.UNKNOWN_ERROR]: '发生未知错误，请联系技术支持'
};

/**
 * 创建标准化错误对象
 */
export function createAppError(
  type: ErrorType,
  message: string,
  options: Partial<AppError> = {}
): AppError {
  return {
    type,
    message,
    severity: ErrorSeverity.MEDIUM,
    timestamp: new Date().toISOString(),
    userMessage: userFriendlyMessages[type],
    ...options
  };
}

/**
 * 从原生错误对象创建应用错误
 */
export function fromNativeError(error: Error, type?: ErrorType): AppError {
  const errorType = type || classifyError(error);
  
  return createAppError(errorType, error.message, {
    stack: error.stack,
    context: { originalError: error.name }
  });
}

/**
 * 从HTTP响应创建错误
 */
export function fromHttpResponse(response: Response, data?: any): AppError {
  let type: ErrorType;
  let severity: ErrorSeverity;

  switch (response.status) {
    case 400:
      type = ErrorType.VALIDATION_ERROR;
      severity = ErrorSeverity.LOW;
      break;
    case 401:
      type = ErrorType.AUTHENTICATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 403:
      type = ErrorType.AUTHORIZATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 404:
      type = ErrorType.NOT_FOUND_ERROR;
      severity = ErrorSeverity.LOW;
      break;
    case 408:
      type = ErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      type = ErrorType.SERVER_ERROR;
      severity = ErrorSeverity.HIGH;
      break;
    default:
      type = ErrorType.UNKNOWN_ERROR;
      severity = ErrorSeverity.MEDIUM;
  }

  return createAppError(type, data?.message || response.statusText, {
    code: response.status.toString(),
    severity,
    context: { 
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      data
    }
  });
}

/**
 * 分类原生错误
 */
function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  if (message.includes('timeout')) {
    return ErrorType.TIMEOUT_ERROR;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorType.VALIDATION_ERROR;
  }
  
  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorReportingService?: (error: AppError) => void;
  private toastService?: (message: string, type: string) => void;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 设置错误报告服务
   */
  setErrorReportingService(service: (error: AppError) => void) {
    this.errorReportingService = service;
  }

  /**
   * 设置Toast通知服务
   */
  setToastService(service: (message: string, type: string) => void) {
    this.toastService = service;
  }

  /**
   * 处理错误
   */
  handle(error: AppError, customConfig?: Partial<ErrorHandlerConfig>) {
    const config = { ...defaultErrorConfigs[error.type], ...customConfig };

    // 控制台日志
    if (config.logToConsole) {
      console.error('Application Error:', error);
    }

    // 显示用户通知
    if (config.showToast && this.toastService) {
      const severity = this.getSeverityLevel(error.severity);
      this.toastService(error.userMessage || error.message, severity);
    }

    // 报告到错误服务
    if (config.reportToService && this.errorReportingService) {
      this.errorReportingService(error);
    }

    return {
      canRetry: config.retryable,
      error
    };
  }

  /**
   * 获取严重级别对应的UI类型
   */
  private getSeverityLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'warning';
    }
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export function handleError(error: Error | AppError, customConfig?: Partial<ErrorHandlerConfig>) {
  const appError = error instanceof Error ? fromNativeError(error) : error;
  return errorHandler.handle(appError, customConfig);
}

export function handleHttpError(response: Response, data?: any, customConfig?: Partial<ErrorHandlerConfig>) {
  const appError = fromHttpResponse(response, data);
  return errorHandler.handle(appError, customConfig);
}
