/**
 * 统一日志工具 - Winston实现
 *
 * 提供标准化的日志输出格式和级别控制
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // 添加元数据
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0 && metaKeys[0] !== 'Symbol(level)') {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // 添加错误堆栈
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// 创建Winston logger实例
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: customFormat,
  transports: [
    // 错误日志 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // 综合日志 - 每天轮转
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // 控制台输出 - 开发环境使用
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ],
  
  // 未捕获的Promise拒绝
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ]
});

/**
 * 统一日志工具类 - 包装Winston
 */
class Logger {
  /**
   * 错误日志
   */
  static error(message, error = null, meta = {}) {
    if (error instanceof Error) {
      winstonLogger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else if (error) {
      winstonLogger.error(message, { ...meta, error });
    } else {
      winstonLogger.error(message, meta);
    }
  }

  /**
   * 警告日志
   */
  static warn(message, meta = {}) {
    winstonLogger.warn(message, meta);
  }

  /**
   * 信息日志
   */
  static info(message, meta = {}) {
    winstonLogger.info(message, meta);
  }

  /**
   * 调试日志
   */
  static debug(message, meta = {}) {
    winstonLogger.debug(message, meta);
  }

  /**
   * HTTP请求日志
   */
  static http(method, url, statusCode, responseTime, meta = {}) {
    const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;
    this.info(message, { type: 'http', method, url, statusCode, responseTime, ...meta });
  }

  /**
   * 数据库操作日志
   */
  static db(operation, table, duration, meta = {}) {
    const message = `DB ${operation} on ${table} - ${duration}ms`;
    this.debug(message, { type: 'database', operation, table, duration, ...meta });
  }

  /**
   * 测试相关日志
   */
  static test(testId, phase, message, meta = {}) {
    const logMessage = `[${testId}] [${phase}] ${message}`;
    this.info(logMessage, { type: 'test', testId, phase, ...meta });
  }

  /**
   * 性能监控日志
   */
  static perf(operation, duration, meta = {}) {
    const message = `PERF ${operation} - ${duration}ms`;
    if (duration > 1000) {
      this.warn(message, { type: 'performance', operation, duration, ...meta });
    } else {
      this.debug(message, { type: 'performance', operation, duration, ...meta });
    }
  }

  /**
   * 安全相关日志
   */
  static security(event, details, meta = {}) {
    const message = `SECURITY ${event}: ${details}`;
    this.warn(message, { type: 'security', event, details, ...meta });
  }

  /**
   * 用户操作日志
   */
  static user(userId, action, details, meta = {}) {
    const message = `USER ${userId} ${action}: ${details}`;
    this.info(message, { type: 'user', userId, action, details, ...meta });
  }

  /**
   * API调用日志
   */
  static api(endpoint, method, statusCode, responseTime, userId = null, meta = {}) {
    const message = `API ${method} ${endpoint} ${statusCode} - ${responseTime}ms`;
    this.info(message, {
      type: 'api',
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      ...meta
    });
  }

  /**
   * 系统事件日志
   */
  static system(event, details, meta = {}) {
    const message = `SYSTEM ${event}: ${details}`;
    this.info(message, { type: 'system', event, details, ...meta });
  }

  /**
   * 清理旧日志文件
   */
  static cleanup() {
    // Winston会自动处理日志轮转
    this.info('日志清理完成');
  }
  
  /**
   * 获取Winston实例(用于高级配置)
   */
  static getWinstonInstance() {
    return winstonLogger;
  }
}

// 导出日志工具
module.exports = Logger;
module.exports.winstonLogger = winstonLogger;
