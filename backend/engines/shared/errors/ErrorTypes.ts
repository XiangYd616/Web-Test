/**
 * 错误类型和分类定义
 * 为所有共享服务提供统一的错误分类系统
 */

// 错误严重级别
export const ErrorSeverity = {
  CRITICAL: 'critical', // 关键错误，服务完全不可用
  HIGH: 'high', // 高级错误，核心功能受影响
  MEDIUM: 'medium', // 中级错误，部分功能受影响
  LOW: 'low', // 低级错误，轻微影响
  INFO: 'info', // 信息性错误，不影响功能
} as const;

export type ErrorSeverityType = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

// 错误分类
export const ErrorCategory = {
  // 系统级错误
  SYSTEM: 'system',
  NETWORK: 'network',
  DEPENDENCY: 'dependency',
  INITIALIZATION: 'initialization',

  // 数据级错误
  VALIDATION: 'validation',
  PARSING: 'parsing',
  PROCESSING: 'processing',

  // 业务级错误
  CONFIGURATION: 'configuration',
  CONTENT: 'content',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',

  // 外部服务错误
  EXTERNAL_SERVICE: 'external-service',
  RATE_LIMIT: 'rate-limit',
  TIMEOUT: 'timeout',

  // 资源错误
  RESOURCE_NOT_FOUND: 'resource-not-found',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  QUOTA_EXCEEDED: 'quota-exceeded',
} as const;

export type ErrorCategoryType = (typeof ErrorCategory)[keyof typeof ErrorCategory];

// 错误代码
export const ErrorCode = {
  // 系统错误代码
  SYSTEM_INIT_FAILED: 'SYSTEM_INIT_FAILED',
  SYSTEM_SHUTDOWN: 'SYSTEM_SHUTDOWN',
  SYSTEM_OVERLOAD: 'SYSTEM_OVERLOAD',

  // 网络错误代码
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',

  // 验证错误代码
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // 解析错误代码
  PARSING_FAILED: 'PARSING_FAILED',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_HTML: 'INVALID_HTML',
  INVALID_XML: 'INVALID_XML',

  // 内容错误代码
  CONTENT_NOT_FOUND: 'CONTENT_NOT_FOUND',
  CONTENT_ACCESS_DENIED: 'CONTENT_ACCESS_DENIED',
  CONTENT_PROCESSING_FAILED: 'CONTENT_PROCESSING_FAILED',

  // 认证授权错误代码
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 外部服务错误代码
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 资源错误代码
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// 基础错误接口
export interface BaseError {
  code: ErrorCodeType;
  message: string;
  category: ErrorCategoryType;
  severity: ErrorSeverityType;
  timestamp: Date;
  context?: Record<string, unknown>;
  cause?: Error;
  stack?: string;
}

// 扩展错误接口
export interface ExtendedError extends BaseError {
  id: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  service: string;
  version: string;
  metadata: Record<string, unknown>;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

// 错误详情接口
export interface ErrorDetail {
  field?: string;
  value?: unknown;
  constraint?: string;
  message: string;
  code?: string;
}

// 验证错误接口
export interface ValidationErrorInfo extends BaseError {
  details: ErrorDetail[];
  invalidFields: string[];
}

// 系统错误接口
export interface SystemErrorInfo extends BaseError {
  systemInfo: {
    hostname: string;
    pid: number;
    memory: {
      used: number;
      total: number;
    };
    uptime: number;
  };
}

// 网络错误接口
export interface NetworkErrorInfo extends BaseError {
  networkInfo: {
    url?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    retryCount: number;
  };
}

// 外部服务错误接口
export interface ExternalServiceErrorInfo extends BaseError {
  serviceInfo: {
    serviceName: string;
    endpoint?: string;
    responseCode?: string;
    responseMessage?: string;
  };
}

// 错误统计接口
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategoryType, number>;
  bySeverity: Record<ErrorSeverityType, number>;
  byCode: Record<ErrorCodeType, number>;
  recent: ExtendedError[];
  trends: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
  };
}

// 错误报告接口
export interface ErrorReport {
  id: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  topErrors: Array<{
    code: ErrorCodeType;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recommendations: string[];
}

// 错误处理策略接口
export interface ErrorHandlingStrategy {
  category: ErrorCategoryType;
  severity: ErrorSeverityType;
  action: 'retry' | 'fallback' | 'ignore' | 'escalate' | 'log';
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: unknown;
  escalationLevel?: number;
}

// 错误通知配置接口
export interface ErrorNotificationConfig {
  enabled: boolean;
  channels: ('email' | 'sms' | 'webhook' | 'slack')[];
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  recipients: string[];
  templates: {
    subject: string;
    body: string;
  };
}

// 自定义错误类
export class CustomError extends Error implements ExtendedError {
  public readonly id: string;
  public readonly code: ErrorCodeType;
  public readonly category: ErrorCategoryType;
  public readonly severity: ErrorSeverityType;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly requestId?: string;
  public readonly service: string;
  public readonly version: string;
  public readonly metadata: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly cause?: Error;
  public retryCount: number;
  public maxRetries?: number;

  constructor(
    code: ErrorCodeType,
    message: string,
    category: ErrorCategoryType,
    severity: ErrorSeverityType,
    options: {
      context?: Record<string, unknown>;
      cause?: Error;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      service?: string;
      version?: string;
      metadata?: Record<string, unknown>;
      retryable?: boolean;
      maxRetries?: number;
    } = {}
  ) {
    super(message);

    this.name = 'CustomError';
    this.id = this.generateId();
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = options.context;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.requestId = options.requestId;
    this.service = options.service || 'unknown';
    this.version = options.version || '1.0.0';
    this.metadata = options.metadata || {};
    this.retryable = options.retryable ?? true;
    this.maxRetries = options.maxRetries;
    this.retryCount = 0;

    if (options.cause) {
      this.cause = options.cause;
    }

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public toJSON(): ExtendedError {
    return {
      id: this.id,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      userId: this.userId,
      sessionId: this.sessionId,
      requestId: this.requestId,
      service: this.service,
      version: this.version,
      metadata: this.metadata,
      retryable: this.retryable,
      retryCount: this.retryCount,
      cause: this.cause,
      maxRetries: this.maxRetries,
    };
  }

  public incrementRetryCount(): void {
    this.retryCount = (this.retryCount || 0) + 1;
  }

  public canRetry(): boolean {
    return this.retryable && (!this.maxRetries || this.retryCount < this.maxRetries);
  }

  public static fromError(
    error: Error,
    options: {
      code?: ErrorCodeType;
      category?: ErrorCategoryType;
      severity?: ErrorSeverityType;
      service?: string;
    } = {}
  ): CustomError {
    return new CustomError(
      options.code || ErrorCode.SYSTEM_OVERLOAD,
      error.message,
      options.category || ErrorCategory.SYSTEM,
      options.severity || ErrorSeverity.MEDIUM,
      {
        cause: error,
        service: options.service,
      }
    );
  }
}

// 验证错误类
export class EngineValidationError extends CustomError {
  public readonly details: ErrorDetail[];
  public readonly invalidFields: string[];

  constructor(
    message: string,
    details: ErrorDetail[],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ) {
    const code = options.code || ErrorCode.VALIDATION_FAILED;
    const severity = options.severity || ErrorSeverity.MEDIUM;

    super(code, message, ErrorCategory.VALIDATION, severity, options);

    this.name = 'ValidationError';
    this.details = details;
    this.invalidFields = details
      .map(detail => detail.field)
      .filter((field): field is string => typeof field === 'string' && field.length > 0);
  }

  public toJSON(): ExtendedError {
    return {
      ...super.toJSON(),
      details: this.details,
      invalidFields: this.invalidFields,
    } as ExtendedError;
  }
}

// 系统错误类
export class EngineSystemError extends CustomError {
  public readonly systemInfo: {
    hostname: string;
    pid: number;
    memory: {
      used: number;
      total: number;
    };
    uptime: number;
  };

  constructor(
    message: string,
    systemInfo: EngineSystemError['systemInfo'],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ) {
    const code = options.code || ErrorCode.SYSTEM_OVERLOAD;
    const severity = options.severity || ErrorSeverity.HIGH;

    super(code, message, ErrorCategory.SYSTEM, severity, options);

    this.name = 'SystemError';
    this.systemInfo = systemInfo;
  }

  public toJSON(): ExtendedError {
    return {
      ...super.toJSON(),
      systemInfo: this.systemInfo,
    } as ExtendedError;
  }

  public static create(
    options: {
      message?: string;
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ): EngineSystemError {
    const systemInfo = {
      hostname: require('os').hostname(),
      pid: process.pid,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
      uptime: process.uptime(),
    };

    return new EngineSystemError(options.message || 'System error occurred', systemInfo, options);
  }
}

// 网络错误类
export class EngineNetworkError extends CustomError {
  public readonly networkInfo: {
    url?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    retryCount: number;
  };

  constructor(
    message: string,
    networkInfo: EngineNetworkError['networkInfo'],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ) {
    const code = options.code || ErrorCode.NETWORK_CONNECTION_FAILED;
    const severity = options.severity || ErrorSeverity.MEDIUM;

    super(code, message, ErrorCategory.NETWORK, severity, options);

    this.name = 'NetworkError';
    this.networkInfo = networkInfo;
  }

  public toJSON(): ExtendedError {
    return {
      ...super.toJSON(),
      networkInfo: this.networkInfo,
    } as ExtendedError;
  }
}

// 外部服务错误类
export class EngineExternalServiceError extends CustomError {
  public readonly serviceInfo: {
    serviceName: string;
    endpoint?: string;
    responseCode?: string;
    responseMessage?: string;
  };

  constructor(
    message: string,
    serviceInfo: EngineExternalServiceError['serviceInfo'],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ) {
    const code = options.code || ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE;
    const severity = options.severity || ErrorSeverity.HIGH;

    super(code, message, ErrorCategory.EXTERNAL_SERVICE, severity, options);

    this.name = 'ExternalServiceError';
    this.serviceInfo = serviceInfo;
  }

  public toJSON(): ExtendedError {
    return {
      ...super.toJSON(),
      serviceInfo: this.serviceInfo,
    } as ExtendedError;
  }
}

// 错误工厂类
export class ErrorFactory {
  /**
   * 创建验证错误
   */
  static createValidationError(
    message: string,
    details: ErrorDetail[],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ): EngineValidationError {
    return new EngineValidationError(message, details, options);
  }

  /**
   * 创建系统错误
   */
  static createSystemError(
    message: string,
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ): EngineSystemError {
    return EngineSystemError.create({ message, ...options });
  }

  /**
   * 创建网络错误
   */
  static createNetworkError(
    message: string,
    networkInfo: NetworkErrorInfo['networkInfo'],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ): EngineNetworkError {
    return new EngineNetworkError(message, networkInfo, options);
  }

  /**
   * 创建外部服务错误
   */
  static createExternalServiceError(
    message: string,
    serviceInfo: ExternalServiceErrorInfo['serviceInfo'],
    options: {
      code?: ErrorCodeType;
      severity?: ErrorSeverityType;
      context?: Record<string, unknown>;
    } = {}
  ): EngineExternalServiceError {
    return new EngineExternalServiceError(message, serviceInfo, options);
  }

  /**
   * 从普通错误创建自定义错误
   */
  static fromError(
    error: Error,
    options: {
      code?: ErrorCodeType;
      category?: ErrorCategoryType;
      severity?: ErrorSeverityType;
      service?: string;
    } = {}
  ): CustomError {
    return CustomError.fromError(error, options);
  }
}

// 错误工具函数
export class ErrorUtils {
  /**
   * 判断是否为可重试错误
   */
  static isRetryable(error: ExtendedError): boolean {
    return Boolean(error.retryable);
  }

  /**
   * 获取错误严重程度数值
   */
  static getSeverityValue(severity: ErrorSeverityType): number {
    const values = {
      [ErrorSeverity.CRITICAL]: 5,
      [ErrorSeverity.HIGH]: 4,
      [ErrorSeverity.MEDIUM]: 3,
      [ErrorSeverity.LOW]: 2,
      [ErrorSeverity.INFO]: 1,
    };
    return values[severity] || 0;
  }

  /**
   * 比较错误严重程度
   */
  static compareSeverity(severity1: ErrorSeverityType, severity2: ErrorSeverityType): number {
    return this.getSeverityValue(severity1) - this.getSeverityValue(severity2);
  }

  /**
   * 格式化错误消息
   */
  static formatMessage(error: ExtendedError): string {
    return `[${error.severity.toUpperCase()}] ${error.category}: ${error.message} (${error.code})`;
  }

  /**
   * 序列化错误
   */
  static serialize(error: ExtendedError): string {
    return JSON.stringify(error);
  }

  /**
   * 反序列化错误
   */
  static deserialize(data: string): ExtendedError {
    const parsed = JSON.parse(data);
    return new CustomError(parsed.code, parsed.message, parsed.category, parsed.severity, {
      context: parsed.context,
      userId: parsed.userId,
      sessionId: parsed.sessionId,
      requestId: parsed.requestId,
      service: parsed.service,
      version: parsed.version,
      metadata: parsed.metadata,
      retryable: parsed.retryable,
      maxRetries: parsed.maxRetries,
    });
  }

  /**
   * 创建错误摘要
   */
  static createSummary(errors: ExtendedError[]): {
    total: number;
    byCategory: Record<ErrorCategoryType, number>;
    bySeverity: Record<ErrorSeverityType, number>;
    topCodes: Array<{ code: ErrorCodeType; count: number }>;
  } {
    const summary = {
      total: errors.length,
      byCategory: {} as Record<ErrorCategoryType, number>,
      bySeverity: {} as Record<ErrorSeverityType, number>,
      topCodes: [] as Array<{ code: ErrorCodeType; count: number }>,
    };

    errors.forEach(error => {
      // 按类别统计
      summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;

      // 按严重程度统计
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
    });

    // 统计错误代码
    const codeCounts = errors.reduce(
      (counts, error) => {
        counts[error.code] = (counts[error.code] || 0) + 1;
        return counts;
      },
      {} as Record<ErrorCodeType, number>
    );

    summary.topCodes = Object.entries(codeCounts)
      .map(([code, count]) => ({ code: code as ErrorCodeType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return summary;
  }
}

export default {
  ErrorSeverity,
  ErrorCategory,
  ErrorCode,
  CustomError,
  EngineValidationError,
  EngineSystemError,
  EngineNetworkError,
  EngineExternalServiceError,
  ErrorFactory,
  ErrorUtils,
};
