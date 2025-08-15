/**
 * 统一日志工具
 *
 * 提供标准化的日志输出格式和级别控制
 */

// 日志级别配置
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 当前日志级别
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production'
  ? LOG_LEVELS.INFO
  : LOG_LEVELS.DEBUG;

/**
 * 格式化日志消息
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  // 添加元数据
  if (meta && Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`;
  }

  return logMessage;
}

/**
 * 统一日志工具类
 */
class Logger {
  /**
   * 错误日志
   */
  static error(message, error = null, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      let logMessage = formatLogMessage('error', message, meta);

      if (error instanceof Error) {
        logMessage += `/nError: ${error.message}`;
        if (error.stack) {
          logMessage += `/nStack: ${error.stack}`;
        }
      } else if (error) {
        logMessage += `/nError: ${JSON.stringify(error)}`;
      }

      console.error(logMessage);
    }
  }

  /**
   * 警告日志
   */
  static warn(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(formatLogMessage('warn', message, meta));
    }
  }

  /**
   * 信息日志
   */
  static info(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.info(formatLogMessage('info', message, meta));
    }
  }

  /**
   * 调试日志
   */
  static debug(message, meta = {}) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(formatLogMessage('debug', message, meta));
    }
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
    // Winston会自动处理日志轮转，这里可以添加额外的清理逻辑
    this.info('日志清理完成');
  }
}

// 导出日志工具
module.exports = Logger;
module.exports.LOG_LEVELS = LOG_LEVELS;
