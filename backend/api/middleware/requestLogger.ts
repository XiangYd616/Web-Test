/**
 * 请求日志中间件
 * 记录所有API请求的详细信息，用于监控和调试
 */

import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body?: unknown;
  ip: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  requestSize: number;
  responseSize?: number;
  statusCode?: number;
  duration?: number;
  error?: string;
}

interface RequestLoggerOptions {
  excludePaths?: string[];
  includeHeaders?: boolean;
  includeBody?: boolean;
  maxBodySize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 获取客户端IP地址
 */
const getClientIP = (req: Request): string => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    'unknown'
  );
};

/**
 * 获取用户代理信息
 */
const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * 获取请求大小（字节）
 */
const getRequestSize = (req: Request): number => {
  try {
    const contentLength = req.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * 获取响应大小（字节）
 */
const getResponseSize = (res: Response): number => {
  try {
    const contentLength = res.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * 格式化请求日志
 */
const formatLog = (log: RequestLog): string => {
  const { id, timestamp, method, url, statusCode, duration, ip, userId, error } = log;

  const status = statusCode || '-';
  const time = duration ? `${duration}ms` : '-';
  const user = userId || '-';
  const err = error ? ` ERROR: ${error}` : '';

  return `[${timestamp.toISOString()}] ${id} ${method} ${url} ${status} ${time} ${ip} ${user}${err}`;
};

/**
 * 创建请求日志中间件
 */
const requestLogger = (options: RequestLoggerOptions = {}) => {
  const {
    excludePaths = [],
    includeHeaders = true,
    includeBody = false,
    maxBodySize = 1024,
    logLevel = 'info',
  } = options;

  const logs: RequestLog[] = [];
  const maxLogs = 1000; // 最大日志数量

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否排除此路径
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    const requestId = uuidv4();

    // 创建请求日志
    const log: RequestLog = {
      id: requestId,
      timestamp: new Date(),
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: includeHeaders ? (req.headers as Record<string, string>) : {},
      body: includeBody ? req.body : undefined,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      userId: (req as any).user?.id,
      sessionId: (req as any).session?.id,
      requestSize: getRequestSize(req),
    };

    // 截断过大的请求体
    if (log.body && typeof log.body === 'string' && log.body.length > maxBodySize) {
      log.body = log.body.substring(0, maxBodySize) + '... (truncated)';
    }

    // 监听响应完成
    res.on('finish', () => {
      log.statusCode = res.statusCode;
      log.responseSize = getResponseSize(res);
      log.duration = Date.now() - startTime;

      // 添加到日志数组
      logs.push(log);

      // 限制日志数量
      if (logs.length > maxLogs) {
        logs.shift();
      }

      // 输出日志
      const logMessage = formatLog(log);

      switch (logLevel) {
        case 'debug':
          console.debug(logMessage);
          break;
        case 'info':
          console.info(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'error':
          console.error(logMessage);
          break;
        default:
          console.info(logMessage);
      }
    });

    // 监听错误
    res.on('error', (error: Error) => {
      log.error = error.message;
      log.statusCode = 500;
      log.duration = Date.now() - startTime;

      logs.push(log);
      if (logs.length > maxLogs) {
        logs.shift();
      }

      console.error(formatLog(log));
    });

    next();
  };
};

/**
 * 获取请求日志
 */
const getRequestLogs = (
  options: {
    limit?: number;
    method?: string;
    statusCode?: number;
    userId?: string;
    startTime?: Date;
    endTime?: Date;
  } = {}
): RequestLog[] => {
  const { limit = 100, method, statusCode, userId, startTime, endTime } = options;

  let filteredLogs = [...logs];

  if (method) {
    filteredLogs = filteredLogs.filter(log => log.method === method);
  }

  if (statusCode) {
    filteredLogs = filteredLogs.filter(log => log.statusCode === statusCode);
  }

  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }

  if (startTime) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
  }

  if (endTime) {
    filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
  }

  // 按时间倒序排列
  filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return filteredLogs.slice(0, limit);
};

/**
 * 获取请求统计
 */
const getRequestStats = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentLogs = logs.filter(log => log.timestamp >= oneHourAgo);
  const dailyLogs = logs.filter(log => log.timestamp >= oneDayAgo);

  const stats = {
    total: logs.length,
    lastHour: recentLogs.length,
    last24Hours: dailyLogs.length,
    averageResponseTime:
      recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / recentLogs.length || 0,
    errorRate:
      recentLogs.filter(log => (log.statusCode || 0) >= 400).length / recentLogs.length || 0,
    topEndpoints: Object.entries(
      recentLogs.reduce(
        (acc, log) => {
          const key = `${log.method} ${log.path}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count })),
    statusCodes: recentLogs.reduce(
      (acc, log) => {
        const status = log.statusCode || 0;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    ),
    methods: recentLogs.reduce(
      (acc, log) => {
        acc[log.method] = (acc[log.method] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  return stats;
};

/**
 * 清理旧日志
 */
const cleanupLogs = (maxAge: number = 24 * 60 * 60 * 1000) => {
  const cutoffTime = new Date(Date.now() - maxAge);
  const initialLength = logs.length;

  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].timestamp < cutoffTime) {
      logs.splice(i, 1);
    }
  }

  return initialLength - logs.length;
};

/**
 * 导出日志数据
 */
const exportLogs = (format: 'json' | 'csv' = 'json') => {
  if (format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  if (format === 'csv') {
    const headers = [
      'id',
      'timestamp',
      'method',
      'url',
      'path',
      'statusCode',
      'duration',
      'ip',
      'userId',
      'userAgent',
      'requestSize',
      'responseSize',
    ].join(',');

    const rows = logs.map(log =>
      [
        log.id,
        log.timestamp.toISOString(),
        log.method,
        log.url,
        log.path,
        log.statusCode || '',
        log.duration || '',
        log.ip,
        log.userId || '',
        log.userAgent,
        log.requestSize,
        log.responseSize || '',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  throw new Error(`Unsupported format: ${format}`);
};

export {
  cleanupLogs,
  exportLogs,
  getRequestLogs,
  getRequestStats,
  RequestLog,
  requestLogger,
  RequestLoggerOptions,
};

export default requestLogger;
