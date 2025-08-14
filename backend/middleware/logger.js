/**
 * 日志中间件
 */

const fs = require('fs');
const path = require('path');

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // 记录请求开始
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous',
    body: req.method === 'POST' || req.method === 'PUT' ? sanitizeBody(req.body) : undefined
  };

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    logEntry.statusCode = res.statusCode;
    logEntry.duration = duration;
    logEntry.responseSize = res.get('Content-Length') || 0;

    // 写入日志文件
    writeLog(logEntry);

    // 控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const statusColor = getStatusColor(res.statusCode);
      console.log(
        `${timestamp} ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms`
      );
    }
  });

  next();
};

/**
 * 清理敏感信息
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * 获取状态码颜色
 */
const getStatusColor = (statusCode) => {
  if (statusCode >= 500) return '\x1b[31m'; // 红色
  if (statusCode >= 400) return '\x1b[33m'; // 黄色
  if (statusCode >= 300) return '\x1b[36m'; // 青色
  if (statusCode >= 200) return '\x1b[32m'; // 绿色
  return '\x1b[0m'; // 默认
};

/**
 * 写入日志文件
 */
const writeLog = (logEntry) => {
  const logPath = path.join(__dirname, '..', 'logs', 'combined.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err) => {
    if (err) {
      console.error('写入日志失败:', err);
    }
  });
};

/**
 * 安全日志记录器
 */
const securityLogger = (event, details, req) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    ip: req ? (req.ip || req.connection.remoteAddress) : 'system',
    userAgent: req ? req.get('User-Agent') : 'system',
    user: req && req.user ? req.user.id : 'anonymous'
  };

  const logPath = path.join(__dirname, '..', 'logs', 'security.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err) => {
    if (err) {
      console.error('写入安全日志失败:', err);
    }
  });

  console.warn(`[SECURITY] ${event}:`, details);
};

/**
 * 数据库日志记录器
 */
const dbLogger = (query, duration, error = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    query: query.substring(0, 500), // 限制查询长度
    duration,
    error: error ? error.message : null
  };

  const logPath = path.join(__dirname, '..', 'logs', 'database.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err) => {
    if (err) {
      console.error('写入数据库日志失败:', err);
    }
  });
};

/**
 * 性能监控中间件
 */
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // 转换为毫秒

    // 记录慢请求
    if (duration > 1000) { // 超过1秒的请求
      console.warn(`[SLOW REQUEST] ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'slow_request',
        method: req.method,
        url: req.originalUrl,
        duration: duration.toFixed(2),
        ip: req.ip,
        user: req.user ? req.user.id : 'anonymous'
      };

      const logPath = path.join(__dirname, '..', 'logs', 'performance.log');
      fs.appendFile(logPath, JSON.stringify(logEntry) + '\n', () => {});
    }
  });

  next();
};

/**
 * API使用统计
 */
const apiStats = (() => {
  const stats = new Map();

  return (req, res, next) => {
    const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;
    
    if (!stats.has(endpoint)) {
      stats.set(endpoint, { count: 0, totalTime: 0, errors: 0 });
    }

    const start = Date.now();
    const endpointStats = stats.get(endpoint);
    endpointStats.count++;

    res.on('finish', () => {
      const duration = Date.now() - start;
      endpointStats.totalTime += duration;
      
      if (res.statusCode >= 400) {
        endpointStats.errors++;
      }
    });

    // 定期输出统计信息
    if (endpointStats.count % 100 === 0) {
      console.log(`[API STATS] ${endpoint}: ${endpointStats.count} calls, avg: ${(endpointStats.totalTime / endpointStats.count).toFixed(2)}ms, errors: ${endpointStats.errors}`);
    }

    next();
  };
})();

module.exports = {
  requestLogger,
  securityLogger,
  dbLogger,
  performanceMonitor,
  apiStats
};
