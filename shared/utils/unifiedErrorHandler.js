/**
 * 统一错误处理核心模块
 * 版本: v2.0.0
 * 创建时间: 2025-01-09
 * 
 * 提供跨平台（前端/后端）的统一错误处理能力
 */

const fs = require('fs');
const path = require('path');

// ==================== 错误代码定义 ====================

const ErrorCode = {
  // 系统级错误 (1000-1999)
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  
  // 网络和连接错误 (2000-2999)
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  DNS_ERROR: 'DNS_ERROR',
  SSL_ERROR: 'SSL_ERROR',
  
  // HTTP状态码相关错误 (3000-3999)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // 验证和数据错误 (4000-4999)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  RANGE_ERROR: 'RANGE_ERROR',
  FORMAT_ERROR: 'FORMAT_ERROR',
  
  // 认证和授权错误 (5000-5999)
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 数据库错误 (6000-6999)
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
  CHECK_CONSTRAINT_VIOLATION: 'CHECK_CONSTRAINT_VIOLATION',
  
  // 文件系统错误 (7000-7999)
  FILE_ERROR: 'FILE_ERROR',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  DISK_FULL: 'DISK_FULL',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  
  // 业务逻辑错误 (8000-8999)
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_NOT_AVAILABLE: 'RESOURCE_NOT_AVAILABLE',
  OPERATION_NOT_PERMITTED: 'OPERATION_NOT_PERMITTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // 外部服务错误 (9000-9999)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  API_ERROR: 'API_ERROR',
  THIRD_PARTY_ERROR: 'THIRD_PARTY_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  SMS_ERROR: 'SMS_ERROR',
  
  // 安全相关错误 (10000-10999)
  SECURITY_ERROR: 'SECURITY_ERROR',
  CSRF_ERROR: 'CSRF_ERROR',
  XSS_DETECTED: 'XSS_DETECTED',
  SQL_INJECTION_DETECTED: 'SQL_INJECTION_DETECTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED: 'IP_BLOCKED',
  
  // 配置和环境错误 (11000-11999)
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  VERSION_MISMATCH: 'VERSION_MISMATCH'
};

// ==================== 错误严重程度定义 ====================

const ErrorSeverity = {
  LOW: 'LOW',           // 轻微错误，不影响主要功能
  MEDIUM: 'MEDIUM',     // 中等错误，影响部分功能
  HIGH: 'HIGH',         // 严重错误，影响核心功能
  CRITICAL: 'CRITICAL'  // 致命错误，系统不可用
};

// ==================== HTTP状态码映射 ====================

const HTTP_STATUS_CODES = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNPROCESSABLE_ENTITY]: 422,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.SCHEMA_VALIDATION_ERROR]: 400,
  [ErrorCode.TYPE_ERROR]: 400,
  [ErrorCode.RANGE_ERROR]: 400,
  [ErrorCode.FORMAT_ERROR]: 400,
  [ErrorCode.AUTHENTICATION_ERROR]: 401,
  [ErrorCode.AUTHORIZATION_ERROR]: 403,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.BUSINESS_LOGIC_ERROR]: 422,
  [ErrorCode.DUPLICATE_RESOURCE]: 409,
  [ErrorCode.RESOURCE_NOT_AVAILABLE]: 409,
  [ErrorCode.OPERATION_NOT_PERMITTED]: 403,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.IP_BLOCKED]: 429,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.API_ERROR]: 502,
  [ErrorCode.THIRD_PARTY_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.CONNECTION_TIMEOUT]: 504,
  [ErrorCode.TIMEOUT_ERROR]: 504
};

// ==================== 核心统一错误处理类 ====================

class UnifiedErrorHandler {
  constructor(config = {}) {
    this.config = {
      enableLogging: config.enableLogging !== false,
      enableReporting: config.enableReporting === true,
      enableUserNotification: config.enableUserNotification === true,
      enableRetry: config.enableRetry === true,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      logLevel: config.logLevel || 'error',
      logToFile: config.logToFile === true,
      logDirectory: config.logDirectory || './logs',
      environment: config.environment || process.env.NODE_ENV || 'development',
      serviceName: config.serviceName || 'unknown-service',
      version: config.version || '1.0.0',
      ...config
    };

    // 错误统计
    this.stats = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map(),
      errorsByCode: new Map(),
      recentErrors: [],
      lastReset: new Date()
    };

    // 错误监听器
    this.errorListeners = [];
    
    // 初始化
    this.initialize();
  }

  /**
   * 初始化错误处理器
   */
  initialize() {
    // 确保日志目录存在
    if (this.config.logToFile && this.config.enableLogging) {
      this.ensureLogDirectory();
    }

    // 设置全局错误监听器（仅在Node.js环境中）
    if (typeof process !== 'undefined' && process.on) {
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.config.logDirectory)) {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('❌ 创建日志目录失败:', error);
    }
  }

  /**
   * 设置全局错误处理器（Node.js环境）
   */
  setupGlobalErrorHandlers() {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleError(error, {
        type: 'uncaughtException',
        severity: ErrorSeverity.CRITICAL
      });
      
      // 记录后优雅退出
      setTimeout(() => process.exit(1), 1000);
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      this.handleError(new Error(`Unhandled Rejection: ${reason}`), {
        type: 'unhandledRejection',
        severity: ErrorSeverity.HIGH,
        promise: promise
      });
    });

    // 处理警告
    process.on('warning', (warning) => {
      if (this.config.enableLogging) {
        console.warn('⚠️ 系统警告:', warning.message);
      }
    });
  }

  /**
   * 核心错误处理方法
   */
  handleError(error, context = {}) {
    try {
      // 标准化错误对象
      const standardError = this.standardizeError(error, context);
      
      // 更新统计
      this.updateStats(standardError);
      
      // 记录日志
      if (this.config.enableLogging) {
        this.logError(standardError, context);
      }
      
      // 错误报告（生产环境）
      if (this.config.enableReporting && this.config.environment === 'production') {
        this.reportError(standardError, context);
      }
      
      // 触发错误监听器
      this.triggerErrorListeners(standardError, context);
      
      return standardError;
    } catch (handlerError) {
      // 错误处理器本身出错的情况
      console.error('💀 错误处理器内部错误:', handlerError);
      return this.createFallbackError(error);
    }
  }

  /**
   * 标准化错误对象
   */
  standardizeError(error, context = {}) {
    const timestamp = new Date();
    const errorId = this.generateErrorId();

    // 基本错误信息
    let standardError = {
      id: errorId,
      timestamp: timestamp,
      message: error.message || '未知错误',
      code: context.code || this.detectErrorCode(error),
      severity: context.severity || this.detectErrorSeverity(error),
      type: context.type || error.name || 'Error',
      stack: error.stack,
      originalError: error,
      context: this.sanitizeContext(context),
      metadata: {
        service: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        userId: context.userId,
        requestId: context.requestId,
        correlationId: context.correlationId
      }
    };

    // 额外的错误详情
    if (error.details) {
      standardError.details = error.details;
    }

    return standardError;
  }

  /**
   * 检测错误代码
   */
  detectErrorCode(error) {
    // 如果错误已经有代码，直接使用
    if (error.code && typeof error.code === 'string') {
      return error.code;
    }

    // 根据错误类型和属性推断代码
    if (error.name === 'ValidationError') {
      return ErrorCode.VALIDATION_ERROR;
    }
    
    if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
      return ErrorCode.UNAUTHORIZED;
    }
    
    if (error.name === 'ForbiddenError' || error.message?.includes('forbidden')) {
      return ErrorCode.FORBIDDEN;
    }
    
    if (error.statusCode) {
      // 根据HTTP状态码推断
      switch (error.statusCode) {
        case 400: return ErrorCode.BAD_REQUEST;
        case 401: return ErrorCode.UNAUTHORIZED;
        case 403: return ErrorCode.FORBIDDEN;
        case 404: return ErrorCode.NOT_FOUND;
        case 409: return ErrorCode.CONFLICT;
        case 422: return ErrorCode.UNPROCESSABLE_ENTITY;
        case 429: return ErrorCode.TOO_MANY_REQUESTS;
        default: return ErrorCode.SYSTEM_ERROR;
      }
    }

    // 网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ErrorCode.CONNECTION_ERROR;
    }
    
    if (error.code === 'ETIMEDOUT') {
      return ErrorCode.TIMEOUT_ERROR;
    }

    // 默认为系统错误
    return ErrorCode.SYSTEM_ERROR;
  }

  /**
   * 检测错误严重程度
   */
  detectErrorSeverity(error) {
    // 根据错误代码判断严重程度
    const code = this.detectErrorCode(error);
    
    const criticalErrors = [
      ErrorCode.SYSTEM_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorCode.DATABASE_CONNECTION_ERROR,
      ErrorCode.MEMORY_ERROR
    ];
    
    const highErrors = [
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.SECURITY_ERROR,
      ErrorCode.CONFIGURATION_ERROR
    ];
    
    const mediumErrors = [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.BUSINESS_LOGIC_ERROR,
      ErrorCode.FILE_ERROR,
      ErrorCode.NETWORK_ERROR
    ];

    if (criticalErrors.includes(code)) {
      return ErrorSeverity.CRITICAL;
    } else if (highErrors.includes(code)) {
      return ErrorSeverity.HIGH;
    } else if (mediumErrors.includes(code)) {
      return ErrorSeverity.MEDIUM;
    } else {
      return ErrorSeverity.LOW;
    }
  }

  /**
   * 清理和过滤上下文信息
   */
  sanitizeContext(context) {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    const sanitized = {};

    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, sensitiveKeys);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 递归清理对象中的敏感信息
   */
  sanitizeObject(obj, sensitiveKeys) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, sensitiveKeys);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 更新错误统计
   */
  updateStats(error) {
    this.stats.totalErrors++;
    
    // 按类型统计
    const typeCount = this.stats.errorsByType.get(error.type) || 0;
    this.stats.errorsByType.set(error.type, typeCount + 1);
    
    // 按严重程度统计
    const severityCount = this.stats.errorsBySeverity.get(error.severity) || 0;
    this.stats.errorsBySeverity.set(error.severity, severityCount + 1);
    
    // 按错误代码统计
    const codeCount = this.stats.errorsByCode.get(error.code) || 0;
    this.stats.errorsByCode.set(error.code, codeCount + 1);
    
    // 记录最近的错误（保留最近100个）
    this.stats.recentErrors.push({
      id: error.id,
      timestamp: error.timestamp,
      code: error.code,
      severity: error.severity,
      message: error.message.substring(0, 100) // 截断长消息
    });
    
    if (this.stats.recentErrors.length > 100) {
      this.stats.recentErrors = this.stats.recentErrors.slice(-100);
    }
  }

  /**
   * 记录错误日志
   */
  logError(error, context) {
    const logEntry = {
      timestamp: error.timestamp.toISOString(),
      level: this.config.logLevel,
      service: this.config.serviceName,
      version: this.config.version,
      environment: this.config.environment,
      error: {
        id: error.id,
        code: error.code,
        severity: error.severity,
        type: error.type,
        message: error.message,
        stack: error.stack
      },
      context: error.context,
      metadata: error.metadata
    };

    // 控制台输出（带颜色和图标）
    this.logToConsole(error, logEntry);

    // 文件输出
    if (this.config.logToFile) {
      this.logToFile(logEntry);
    }
  }

  /**
   * 控制台日志输出
   */
  logToConsole(error, logEntry) {
    const severityIcons = {
      [ErrorSeverity.LOW]: '💡',
      [ErrorSeverity.MEDIUM]: '⚠️',
      [ErrorSeverity.HIGH]: '🚨',
      [ErrorSeverity.CRITICAL]: '💀'
    };

    const icon = severityIcons[error.severity] || '❌';
    const timestamp = error.timestamp.toISOString();
    
    console.error(`${icon} [${timestamp}] ${error.code}: ${error.message}`);
    
    if (this.config.environment === 'development' && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    if (Object.keys(error.context).length > 0) {
      console.error('Context:', JSON.stringify(error.context, null, 2));
    }
  }

  /**
   * 文件日志输出
   */
  logToFile(logEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.config.logDirectory, `error-${date}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('❌ 写入日志文件失败:', error);
    }
  }

  /**
   * 错误报告（发送到外部服务）
   */
  reportError(error, context) {
    // 这里可以集成第三方错误报告服务
    // 如 Sentry, Bugsnag, LogRocket 等
    console.log('📢 错误已报告:', {
      id: error.id,
      code: error.code,
      severity: error.severity,
      service: this.config.serviceName
    });
  }

  /**
   * 触发错误监听器
   */
  triggerErrorListeners(error, context) {
    for (const listener of this.errorListeners) {
      try {
        listener(error, context);
      } catch (listenerError) {
        console.error('❌ 错误监听器执行失败:', listenerError);
      }
    }
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener) {
    if (typeof listener === 'function') {
      this.errorListeners.push(listener);
    }
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener) {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 获取HTTP状态码
   */
  getHttpStatusCode(errorCode) {
    return HTTP_STATUS_CODES[errorCode] || 500;
  }

  /**
   * 创建API错误响应
   */
  createApiErrorResponse(error, metadata = {}) {
    return {
      success: false,
      error: {
        id: error.id,
        code: error.code,
        message: error.message,
        severity: error.severity,
        timestamp: error.timestamp.toISOString(),
        details: error.details || null
      },
      metadata: {
        requestId: metadata.requestId,
        path: metadata.path,
        method: metadata.method,
        version: metadata.version || this.config.version,
        service: this.config.serviceName
      }
    };
  }

  /**
   * 创建回退错误（当错误处理器本身失败时使用）
   */
  createFallbackError(originalError) {
    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      code: ErrorCode.SYSTEM_ERROR,
      severity: ErrorSeverity.CRITICAL,
      type: 'FallbackError',
      message: '错误处理器内部错误',
      originalError: originalError,
      context: {},
      metadata: {
        service: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment
      }
    };
  }

  /**
   * 生成唯一错误ID
   */
  generateErrorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `ERR_${timestamp}_${random}`;
  }

  /**
   * 获取错误统计
   */
  getStats() {
    return {
      total: this.stats.totalErrors,
      byType: Object.fromEntries(this.stats.errorsByType),
      bySeverity: Object.fromEntries(this.stats.errorsBySeverity),
      byCode: Object.fromEntries(this.stats.errorsByCode),
      recentErrors: this.stats.recentErrors.slice(-10), // 最近10个
      lastReset: this.stats.lastReset
    };
  }

  /**
   * 重置错误统计
   */
  resetStats() {
    this.stats = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map(),
      errorsByCode: new Map(),
      recentErrors: [],
      lastReset: new Date()
    };
  }
}

// ==================== 导出 ====================

module.exports = {
  UnifiedErrorHandler,
  ErrorCode,
  ErrorSeverity,
  HTTP_STATUS_CODES
};
