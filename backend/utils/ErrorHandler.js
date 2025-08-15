/**
 * 统一错误处理工具
 * 提供标准化的错误处理、日志记录、错误分类等功能
 */

const { Logger } = require('./logger');

// 错误类型定义
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// 错误严重程度
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 标准化服务错误类
 */
class ServiceError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, details = {}, statusCode = 500) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.severity = this.calculateSeverity(type, statusCode);
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * 计算错误严重程度
   */
  calculateSeverity(type, statusCode) {
    if (statusCode >= 500) return ErrorSeverity.CRITICAL;
    if (statusCode >= 400) return ErrorSeverity.HIGH;
    if (type === ErrorTypes.RATE_LIMIT_ERROR) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * 转换为API响应格式
   */
  toApiResponse() {
    return {
      success: false,
      error: {
        type: this.type,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        severity: this.severity
      }
    };
  }

  /**
   * 转换为日志格式
   */
  toLogFormat() {
    return {
      error: {
        name: this.name,
        type: this.type,
        message: this.message,
        details: this.details,
        statusCode: this.statusCode,
        severity: this.severity,
        timestamp: this.timestamp,
        stack: this.stack
      }
    };
  }
}

/**
 * 错误处理工具类
 */
class ErrorHandler {
  constructor() {
    this.errorStats = new Map();
    this.alertThresholds = {
      [ErrorSeverity.CRITICAL]: 1, // 立即告警
      [ErrorSeverity.HIGH]: 5,     // 5次后告警
      [ErrorSeverity.MEDIUM]: 20,  // 20次后告警
      [ErrorSeverity.LOW]: 100     // 100次后告警
    };
  }

  /**
   * 创建验证错误
   */
  static createValidationError(message, field, value) {
    return new ServiceError(
      message,
      ErrorTypes.VALIDATION_ERROR,
      { field, value },
      400
    );
  }

  /**
   * 创建认证错误
   */
  static createAuthenticationError(message = '认证失败') {
    return new ServiceError(
      message,
      ErrorTypes.AUTHENTICATION_ERROR,
      {},
      401
    );
  }

  /**
   * 创建授权错误
   */
  static createAuthorizationError(message = '权限不足') {
    return new ServiceError(
      message,
      ErrorTypes.AUTHORIZATION_ERROR,
      {},
      403
    );
  }

  /**
   * 创建资源不存在错误
   */
  static createNotFoundError(resource, id) {
    return new ServiceError(
      `${resource}不存在`,
      ErrorTypes.NOT_FOUND_ERROR,
      { resource, id },
      404
    );
  }

  /**
   * 创建冲突错误
   */
  static createConflictError(message, conflictData) {
    return new ServiceError(
      message,
      ErrorTypes.CONFLICT_ERROR,
      conflictData,
      409
    );
  }

  /**
   * 创建限流错误
   */
  static createRateLimitError(limit, window) {
    return new ServiceError(
      '请求频率过高，请稍后再试',
      ErrorTypes.RATE_LIMIT_ERROR,
      { limit, window },
      429
    );
  }

  /**
   * 创建数据库错误
   */
  static createDatabaseError(message, query, params) {
    return new ServiceError(
      `数据库操作失败: ${message}`,
      ErrorTypes.DATABASE_ERROR,
      { query: query?.substring(0, 100), params },
      500
    );
  }

  /**
   * 创建外部服务错误
   */
  static createExternalServiceError(service, message, statusCode) {
    return new ServiceError(
      `外部服务${service}错误: ${message}`,
      ErrorTypes.EXTERNAL_SERVICE_ERROR,
      { service, originalStatusCode: statusCode },
      502
    );
  }

  /**
   * 处理错误
   */
  async handleError(error, context = {}) {
    // 确保是ServiceError实例
    if (!(error instanceof ServiceError)) {
      error = new ServiceError(
        error.message || '未知错误',
        ErrorTypes.INTERNAL_ERROR,
        { originalError: error.name },
        500
      );
    }

    // 记录错误统计
    this.recordErrorStats(error);

    // 记录日志
    await this.logError(error, context);

    // 检查是否需要告警
    await this.checkAlertThreshold(error);

    return error;
  }

  /**
   * 记录错误统计
   */
  recordErrorStats(error) {
    const key = `${error.type}_${error.severity}`;
    const current = this.errorStats.get(key) || { count: 0, lastOccurred: null };
    
    this.errorStats.set(key, {
      count: current.count + 1,
      lastOccurred: new Date(),
      type: error.type,
      severity: error.severity
    });
  }

  /**
   * 记录错误日志
   */
  async logError(error, context) {
    const logData = {
      ...error.toLogFormat(),
      context
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        Logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        Logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        Logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        Logger.info('Low severity error', logData);
        break;
    }
  }

  /**
   * 检查告警阈值
   */
  async checkAlertThreshold(error) {
    const key = `${error.type}_${error.severity}`;
    const stats = this.errorStats.get(key);
    const threshold = this.alertThresholds[error.severity];

    if (stats && stats.count >= threshold) {
      await this.sendAlert(error, stats);
      // 重置计数器
      this.errorStats.set(key, { ...stats, count: 0 });
    }
  }

  /**
   * 发送告警
   */
  async sendAlert(error, stats) {
    const alertData = {
      type: 'error_threshold_exceeded',
      error: {
        type: error.type,
        severity: error.severity,
        message: error.message
      },
      stats: {
        count: stats.count,
        lastOccurred: stats.lastOccurred
      },
      timestamp: new Date().toISOString()
    };

    Logger.alert('Error threshold exceeded', alertData);
    
    // 这里可以集成邮件、短信、Slack等告警渠道
    // await this.notificationService.sendAlert(alertData);
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {};
    for (const [key, value] of this.errorStats) {
      stats[key] = value;
    }
    return stats;
  }

  /**
   * 清理过期统计
   */
  cleanupStats() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [key, stats] of this.errorStats) {
      if (stats.lastOccurred && stats.lastOccurred < oneHourAgo) {
        this.errorStats.delete(key);
      }
    }
  }

  /**
   * Express错误处理中间件
   */
  static expressErrorHandler() {
    return async (error, req, res, next) => {
      const errorHandler = new ErrorHandler();
      
      const context = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      };

      const handledError = await errorHandler.handleError(error, context);
      
      res.status(handledError.statusCode).json(handledError.toApiResponse());
    };
  }
}

// 创建全局错误处理器实例
const globalErrorHandler = new ErrorHandler();

// 定期清理统计数据
setInterval(() => {
  globalErrorHandler.cleanupStats();
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = {
  ServiceError,
  ErrorHandler,
  ErrorTypes,
  ErrorSeverity,
  globalErrorHandler
};
