/**
 * 增强的错误处理和日志系统
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建Winston日志器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'testweb-api' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * 错误类型定义
 */
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * 自定义错误类
 */
class ServiceError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'ServiceError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, ServiceError);
  }
}

/**
 * 错误处理器
 */
const errorHandler = {
  handle: (error, req, res, next) => {
    // 如果响应已经发送，传递给默认错误处理器
    if (res.headersSent) {
      return next(error);
    }

    // 记录错误
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      type: error.type || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    };

    logger.error('API Error', errorInfo);

    // 确定HTTP状态码
    let statusCode = 500;
    if (error instanceof ServiceError) {
      statusCode = error.statusCode;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
    } else if (error.name === 'CastError') {
      statusCode = 400;
    }

    // 构建错误响应
    const errorResponse = {
      success: false,
      error: {
        code: error.type || 'INTERNAL_ERROR',
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(errorResponse);
  },

  log: (error, context = {}) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      type: error.type || 'UNKNOWN_ERROR',
      ...context,
      timestamp: new Date().toISOString()
    };

    logger.error('Application Error', errorInfo);
  },

  logInfo: (message, meta = {}) => {
    logger.info(message, meta);
  },

  logWarn: (message, meta = {}) => {
    logger.warn(message, meta);
  },

  logDebug: (message, meta = {}) => {
    logger.debug(message, meta);
  }
};

/**
 * 异步错误处理包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404错误处理器
 */
const notFoundHandler = (req, res) => {
  const error = new ServiceError(
    `路径 ${req.originalUrl} 未找到`,
    ErrorTypes.NOT_FOUND_ERROR,
    404
  );

  errorHandler.handle(error, req, res, () => { });
};

/**
 * 进程错误处理
 */
const setupProcessErrorHandlers = () => {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // 优雅关闭
    process.exit(1);
  });

  // 未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason,
      promise: promise,
      timestamp: new Date().toISOString()
    });

    // 优雅关闭
    process.exit(1);
  });

  // SIGTERM信号处理
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // SIGINT信号处理
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

/**
 * 错误监控和警报系统
 */
class ErrorMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.alertThresholds = {
      error: 10,      // 10个错误/分钟
      warning: 20,    // 20个警告/分钟
      critical: 5     // 5个严重错误/分钟
    };
    this.timeWindow = 60000; // 1分钟
  }

  /**
   * 记录错误并检查是否需要警报
   */
  recordError(error, severity = 'error') {
    const now = Date.now();
    const key = `${severity}_${Math.floor(now / this.timeWindow)}`;

    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // 检查是否超过阈值
    if (count + 1 >= this.alertThresholds[severity]) {
      this.sendAlert(severity, count + 1, error);
    }

    // 清理旧数据
    this.cleanupOldCounts(now);
  }

  /**
   * 发送警报
   */
  sendAlert(severity, count, error) {
    const alert = {
      severity,
      count,
      timeWindow: this.timeWindow / 1000,
      error: {
        message: error.message,
        type: error.type,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    logger.error('Error Alert Triggered', alert);

    // 这里可以集成邮件、短信、Slack等通知服务
    // 例如：await this.sendEmailAlert(alert);
    // 例如：await this.sendSlackAlert(alert);
  }

  /**
   * 清理旧的计数数据
   */
  cleanupOldCounts(now) {
    const currentWindow = Math.floor(now / this.timeWindow);

    for (const [key] of this.errorCounts) {
      const keyWindow = parseInt(key.split('_')[1]);
      if (keyWindow < currentWindow - 5) { // 保留最近5个时间窗口
        this.errorCounts.delete(key);
      }
    }
  }

  /**
   * 获取错误统计
   */
  getStats() {
    const stats = {
      error: 0,
      warning: 0,
      critical: 0
    };

    const now = Date.now();
    const currentWindow = Math.floor(now / this.timeWindow);

    for (const [key, count] of this.errorCounts) {
      const [severity, window] = key.split('_');
      if (parseInt(window) === currentWindow) {
        stats[severity] = (stats[severity] || 0) + count;
      }
    }

    return stats;
  }
}

// 创建全局错误监控实例
const errorMonitor = new ErrorMonitor();

/**
 * 初始化错误处理系统
 */
async function initializeErrorHandlingSystem() {
  try {
    // 设置进程错误处理器
    setupProcessErrorHandlers();

    // 创建日志目录
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    logger.info('Error handling system initialized', {
      logLevel: logger.level,
      logDir: logDir,
      timestamp: new Date().toISOString()
    });

    console.log('✅ 增强的错误处理系统初始化完成');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ 错误处理系统初始化失败:', error);
    throw error;
  }
}

/**
 * 统一错误处理器
 */
const unifiedErrorHandler = {
  expressMiddleware: () => {
    return (error, req, res, next) => {
      // 记录到错误监控
      errorMonitor.recordError(error, error.type === ErrorTypes.INTERNAL_ERROR ? 'critical' : 'error');

      // 处理错误
      errorHandler.handle(error, req, res, next);
    };
  }
};

module.exports = {
  errorHandler,
  initializeErrorHandlingSystem,
  unifiedErrorHandler,
  ServiceError,
  ErrorTypes,
  asyncHandler,
  notFoundHandler,
  errorMonitor,
  logger
};
