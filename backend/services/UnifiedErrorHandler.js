/**
 * 统一错误处理服务
 * @description 提供标准化的错误处理、日志记录和响应格式
 */

const winston = require('winston');
const path = require('path');

// 错误类型枚举
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  FILE_OPERATION_ERROR: 'FILE_OPERATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// 错误严重级别
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // 标记为可预期的错误
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * 统一错误处理服务
 */
class UnifiedErrorHandler {
  constructor() {
    this.logger = this.setupLogger();
    this.errorStats = new Map(); // 错误统计
    this.setupErrorTracking();
  }

  /**
   * 设置日志记录器
   */
  setupLogger() {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // 错误日志文件
        new winston.transports.File({
          filename: path.join('logs', 'errors.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // 所有日志文件
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          maxsize: 5242880,
          maxFiles: 5
        })
      ]
    });

    // 开发环境添加控制台输出
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * 设置错误跟踪
   */
  setupErrorTracking() {
    // 每小时清理一次统计数据
    setInterval(() => {
      this.errorStats.clear();
    }, 3600000);
  }

  /**
   * 处理错误
   */
  handleError(error, req = null, res = null) {
    // 记录错误
    this.logError(error, req);
    
    // 更新错误统计
    this.updateErrorStats(error);
    
    // 发送告警（如果需要）
    if (this.shouldAlert(error)) {
      this.sendAlert(error, req);
    }

    // 如果有响应对象，发送错误响应
    if (res && !res.headersSent) {
      this.sendErrorResponse(error, res);
    }

    // 如果是非操作性错误，可能需要关闭进程
    if (!error.isOperational) {
      this.handleCriticalError(error);
    }
  }

  /**
   * 记录错误日志
   */
  logError(error, req = null) {
    const errorInfo = {
      message: error.message,
      type: error.type || ErrorTypes.INTERNAL_SERVER_ERROR,
      statusCode: error.statusCode || 500,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    // 添加请求信息
    if (req) {
      errorInfo.request = {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id,
        body: this.sanitizeBody(req.body),
        query: req.query
      };
    }

    // 根据错误级别记录
    const severity = this.getErrorSeverity(error);
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('CRITICAL ERROR', errorInfo);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(errorInfo);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(errorInfo);
        break;
      default:
        this.logger.info(errorInfo);
    }
  }

  /**
   * 清理敏感信息
   */
  sanitizeBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * 获取错误严重级别
   */
  getErrorSeverity(error) {
    if (error.type === ErrorTypes.DATABASE_ERROR || 
        error.type === ErrorTypes.INTERNAL_SERVER_ERROR) {
      return ErrorSeverity.HIGH;
    }
    
    if (error.type === ErrorTypes.EXTERNAL_SERVICE_ERROR ||
        error.type === ErrorTypes.AUTHENTICATION_ERROR) {
      return ErrorSeverity.MEDIUM;
    }
    
    if (!error.isOperational) {
      return ErrorSeverity.CRITICAL;
    }
    
    return ErrorSeverity.LOW;
  }

  /**
   * 更新错误统计
   */
  updateErrorStats(error) {
    const key = error.type || ErrorTypes.INTERNAL_SERVER_ERROR;
    const current = this.errorStats.get(key) || { count: 0, lastOccurrence: null };
    
    this.errorStats.set(key, {
      count: current.count + 1,
      lastOccurrence: new Date()
    });
  }

  /**
   * 判断是否需要发送告警
   */
  shouldAlert(error) {
    const severity = this.getErrorSeverity(error);
    
    // 严重错误总是告警
    if (severity === ErrorSeverity.CRITICAL) return true;
    
    // 高频错误告警
    const stats = this.errorStats.get(error.type);
    if (stats && stats.count > 10) return true;
    
    // 数据库错误告警
    if (error.type === ErrorTypes.DATABASE_ERROR) return true;
    
    return false;
  }

  /**
   * 发送告警
   */
  async sendAlert(error, req) {
    // 这里可以集成邮件、短信、Slack等告警服务
    console.error('🚨 ALERT:', {
      message: error.message,
      type: error.type,
      url: req?.url,
      timestamp: new Date().toISOString()
    });
    
    // TODO: 实际的告警实现
    // await emailService.sendAlert(error);
    // await slackService.sendAlert(error);
  }

  /**
   * 发送错误响应
   */
  sendErrorResponse(error, res) {
    const statusCode = error.statusCode || 500;
    const response = {
      success: false,
      error: {
        message: error.message || '服务器内部错误',
        type: error.type || ErrorTypes.INTERNAL_SERVER_ERROR,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };

    // 开发环境提供更多错误信息
    if (process.env.NODE_ENV === 'development') {
      response.error.details = error.details;
      response.error.stack = error.stack;
    }

    // 添加错误ID供追踪
    response.error.errorId = this.generateErrorId();

    res.status(statusCode).json(response);
  }

  /**
   * 处理严重错误
   */
  handleCriticalError(error) {
    console.error('💀 CRITICAL ERROR - Application may need to restart:', error);
    
    // 给一些时间记录错误和清理
    setTimeout(() => {
      // 在生产环境中可能需要重启进程
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }, 1000);
  }

  /**
   * 生成错误ID
   */
  generateErrorId() {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Express错误处理中间件
   */
  expressErrorHandler() {
    return (error, req, res, next) => {
      this.handleError(error, req, res);
    };
  }

  /**
   * 异步路由处理包装器
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(error => {
        this.handleError(error, req, res);
      });
    };
  }

  /**
   * 创建标准错误
   */
  createError(message, type, statusCode, details) {
    return new AppError(message, type, statusCode, details);
  }

  /**
   * 验证错误
   */
  validationError(message, details = null) {
    return this.createError(
      message || '输入验证失败',
      ErrorTypes.VALIDATION_ERROR,
      400,
      details
    );
  }

  /**
   * 认证错误
   */
  authenticationError(message = '认证失败') {
    return this.createError(
      message,
      ErrorTypes.AUTHENTICATION_ERROR,
      401
    );
  }

  /**
   * 授权错误
   */
  authorizationError(message = '无权访问') {
    return this.createError(
      message,
      ErrorTypes.AUTHORIZATION_ERROR,
      403
    );
  }

  /**
   * 资源未找到错误
   */
  notFoundError(resource = '资源') {
    return this.createError(
      `${resource}未找到`,
      ErrorTypes.NOT_FOUND_ERROR,
      404
    );
  }

  /**
   * 冲突错误
   */
  conflictError(message = '资源冲突') {
    return this.createError(
      message,
      ErrorTypes.CONFLICT_ERROR,
      409
    );
  }

  /**
   * 数据库错误
   */
  databaseError(message = '数据库操作失败', originalError = null) {
    return this.createError(
      message,
      ErrorTypes.DATABASE_ERROR,
      500,
      { originalError: originalError?.message }
    );
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = [];
    for (const [type, data] of this.errorStats) {
      stats.push({ type, ...data });
    }
    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * 清理错误统计
   */
  clearErrorStats() {
    this.errorStats.clear();
  }
}

// 创建单例实例
const errorHandler = new UnifiedErrorHandler();

// 导出
module.exports = {
  UnifiedErrorHandler,
  errorHandler,
  AppError,
  ErrorTypes,
  ErrorSeverity
};
