/**
 * 日志中间件
 */

import type { NextFunction, Request, Response } from 'express';

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

type RequestWithUser = Request & { user?: { id?: string } };
type RequestWithStats = Request & { stats?: Record<string, unknown> };

/**
 * 请求日志中间件
 */
const requestLogger = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // 记录请求开始
  const logEntry: Record<string, unknown> = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : 'anonymous',
    body: req.method === 'POST' || req.method === 'PUT' ? sanitizeBody(req.body) : undefined,
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
      Logger.info('HTTP 请求完成', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
};

/**
 * 清理敏感信息
 */
const sanitizeBody = (body: Record<string, unknown> | null) => {
  if (!body || typeof body !== 'object') return body;

  const sanitized: Record<string, unknown> = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * 写入日志文件
 */
const writeLog = (logEntry: Record<string, unknown>) => {
  const logPath = path.join(__dirname, '..', 'logs', 'combined.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err: Error) => {
    if (err) {
      Logger.error('写入日志失败', err);
    }
  });
};

/**
 * 安全日志记录器
 */
const securityLogger = (event: string, details: Record<string, unknown>, req?: RequestWithUser) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    ip: req ? req.ip || req.connection.remoteAddress : 'system',
    userAgent: req ? req.get('User-Agent') : 'system',
    user: req && req.user ? req.user.id : 'anonymous',
  };

  const logPath = path.join(__dirname, '..', 'logs', 'security.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err: Error) => {
    if (err) {
      Logger.error('写入安全日志失败', err);
    }
  });

  Logger.warn(`SECURITY ${event}`, { details });
};

/**
 * 数据库日志记录器
 */
const dbLogger = (query: string, duration: number, error: Error | null = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    query: query.substring(0, 500), // 限制查询长度
    duration,
    error: error ? error.message : null,
  };

  const logPath = path.join(__dirname, '..', 'logs', 'database.log');
  const logString = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logPath, logString, (err: Error) => {
    if (err) {
      Logger.error('写入数据库日志失败', err);
    }
  });
};

/**
 * 性能监控中间件
 */
const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // 转换为毫秒

    // 记录慢请求
    if (duration > 1000) {
      Logger.perf('slow_request', duration, {
        method: req.method,
        url: req.originalUrl,
      });

      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'slow_request',
        method: req.method,
        url: req.originalUrl,
        duration: duration.toFixed(2),
        ip: req.ip,
        user: (req as RequestWithUser).user ? (req as RequestWithUser).user?.id : 'anonymous',
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
const apiStatsStartTime = Date.now();
const apiStatsStore = new Map<string, { count: number; totalTime: number; errors: number }>();

const apiStats = (req: RequestWithStats, res: Response, next: NextFunction) => {
  const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;

  if (!apiStatsStore.has(endpoint)) {
    apiStatsStore.set(endpoint, { count: 0, totalTime: 0, errors: 0 });
  }

  const start = Date.now();
  const endpointStats = apiStatsStore.get(endpoint);
  if (!endpointStats) {
    return next();
  }
  endpointStats.count++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    endpointStats.totalTime += duration;

    if (res.statusCode >= 400) {
      endpointStats.errors++;
    }
  });

  next();
};

const getApiStatsSnapshot = () => {
  const totals = { count: 0, totalTime: 0, errors: 0 };
  apiStatsStore.forEach(entry => {
    totals.count += entry.count;
    totals.totalTime += entry.totalTime;
    totals.errors += entry.errors;
  });
  const uptimeMinutes = Math.max((Date.now() - apiStatsStartTime) / 60000, 1);
  return {
    totalRequests: totals.count,
    averageResponseTime: totals.count > 0 ? totals.totalTime / totals.count : 0,
    errorRate: totals.count > 0 ? totals.errors / totals.count : 0,
    requestsPerMinute: totals.count / uptimeMinutes,
    endpoints: Array.from(apiStatsStore.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      averageResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
    })),
  };
};

module.exports = {
  requestLogger,
  securityLogger,
  dbLogger,
  performanceMonitor,
  apiStats,
  getApiStatsSnapshot,
};

export {};
