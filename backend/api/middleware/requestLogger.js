/**
 * 请求日志中间件
 * 记录所有API请求的详细信息，用于监控和调试
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 获取客户端IP地址
 */
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
};

/**
 * 获取用户代理信息
 */
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * 获取请求大小（字节）
 */
const getRequestSize = (req) => {
  return parseInt(req.headers['content-length']) || 0;
};

/**
 * 过滤敏感信息
 */
const filterSensitiveData = (obj, sensitiveFields = ['password', 'token', 'secret', 'key']) => {
  if (!obj || typeof obj !== 'object') {
    
        return obj;
      }
  
  const filtered = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      filtered[key] = '[FILTERED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value, sensitiveFields);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
};

/**
 * 格式化请求日志
 */
const formatRequestLog = (req, res, responseTime) => {
  const logData = {
    // 请求基本信息
    requestId: req.id,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: filterSensitiveData(req.query),
    
    // 客户端信息
    ip: getClientIP(req),
    userAgent: getUserAgent(req),
    referer: req.headers.referer || null,
    
    // 请求详情
    headers: filterSensitiveData(req.headers),
    body: req.method !== 'GET' ? filterSensitiveData(req.body) : null,
    requestSize: getRequestSize(req),
    
    // 响应信息
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    responseSize: res.get('content-length') || null,
    
    // 用户信息（如果已认证）
    user: req.user ? {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      plan: req.user.plan
    } : null,
    
    // 性能指标
    performance: {
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  };
  
  return logData;
};

/**
 * 判断是否应该记录请求
 */
const shouldLogRequest = (req) => {
  // 跳过健康检查和静态资源请求
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ];
  
  const skipExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'];
  
  // 检查路径
  if (skipPaths.some(path => req.path === path)) {
    return false;
  }
  
  // 检查文件扩展名
  if (skipExtensions.some(ext => req.path.endsWith(ext))) {
    return false;
  }
  
  // 开发环境跳过某些请求
  if (process.env.NODE_ENV === 'development') {
    
        const devSkipPaths = ['/api/v1/health', '/api/v1/metrics'];
    if (devSkipPaths.some(path => req.path === path)) {
      return false;
      }
  }
  
  return true;
};

/**
 * 获取日志级别
 */
const getLogLevel = (statusCode, responseTime) => {
  // 错误级别
  if (statusCode >= 500) {
    
        return 'error';
      }
  
  // 警告级别
  if (statusCode >= 400 || responseTime > 5000) {
    
        return 'warn';
      }
  
  // 信息级别
  if (statusCode >= 200 && statusCode < 300) {
    
        return 'info';
      }
  
  // 调试级别
  return 'debug';
};

/**
 * 输出彩色日志
 */
const colorLog = (level, message) => {
  const colors = {
    error: '/x1b[31m',   // 红色
    warn: '/x1b[33m',    // 黄色
    info: '/x1b[32m',    // 绿色
    debug: '/x1b[36m',   // 青色
    reset: '/x1b[0m'     // 重置
  };
  
  const color = colors[level] || colors.reset;
  console.log(`${color}${message}${colors.reset}`);
};

/**
 * 简化的控制台日志格式
 */
const formatConsoleLog = (logData) => {
  const { method, url, statusCode, responseTime, user, ip } = logData;
  const userInfo = user ? `[${user.username}]` : '[Anonymous]';
  const statusEmoji = statusCode >= 500 ? '🚨' : statusCode >= 400 ? '⚠️' : '✅';
  
  return `${statusEmoji} ${method} ${url} ${statusCode} ${responseTime} ${userInfo} ${ip}`;
};

/**
 * 主要请求日志中间件
 */
const requestLogger = (req, res, next) => {
  // 为请求生成唯一ID
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // 记录请求开始时间
  const startTime = Date.now();
  req.startTime = startTime;
  
  // 检查是否应该记录此请求
  if (!shouldLogRequest(req)) {
    return next();
  }
  
  // 监听响应完成事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const logData = formatRequestLog(req, res, responseTime);
    const logLevel = getLogLevel(res.statusCode, responseTime);
    
    // 根据环境选择日志格式
    if (process.env.NODE_ENV === 'development') {
      // 开发环境：简化的彩色控制台日志
      const consoleMessage = formatConsoleLog(logData);
      colorLog(logLevel, consoleMessage);
      
      // 详细日志（仅在调试模式下）
      if (process.env.DEBUG === 'true') {
        console.log('📋 详细请求日志:', JSON.stringify(logData, null, 2));
      }
    } else {
      // 生产环境：结构化JSON日志
      const logMessage = JSON.stringify(logData);
      
      switch (logLevel) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'info':
          console.info(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
    
    // 在生产环境中，可以将日志发送到外部日志服务
    if (process.env.NODE_ENV === 'production') {
      // 这里可以集成如 ELK Stack、Splunk、DataDog 等日志服务
      // sendToLogService(logData);
    }
  });
  
  // 监听响应错误事件
  res.on('error', (error) => {
    const responseTime = Date.now() - startTime;
    const logData = formatRequestLog(req, res, responseTime);
    logData.error = {
      message: error.message,
      stack: error.stack
    };
    
    console.error('🚨 响应错误:', JSON.stringify(logData, null, 2));
  });
  
  next();
};

/**
 * API性能监控中间件
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // 转换为毫秒
    
    // 记录慢请求
    if (responseTime > 1000) { // 超过1秒的请求
      console.warn(`🐌 慢请求警告: ${req.method} ${req.originalUrl} - ${responseTime.toFixed(2)}ms`);
    }
    
    // 记录性能指标
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      const performanceData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: responseTime.toFixed(2),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
      
      // 这里可以将性能数据发送到监控系统
      // sendToMonitoringService(performanceData);
    }
  });
  
  next();
};

/**
 * 请求统计中间件
 */
const requestStats = (() => {
  const stats = {
    totalRequests: 0,
    requestsByMethod: {},
    requestsByStatus: {},
    averageResponseTime: 0,
    slowRequests: 0
  };
  
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // 更新统计信息
      stats.totalRequests++;
      stats.requestsByMethod[req.method] = (stats.requestsByMethod[req.method] || 0) + 1;
      stats.requestsByStatus[res.statusCode] = (stats.requestsByStatus[res.statusCode] || 0) + 1;
      
      // 更新平均响应时间
      stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
      
      // 统计慢请求
      if (responseTime > 1000) {
        stats.slowRequests++;
      }
      
      // 将统计信息附加到请求对象（用于监控端点）
      req.stats = stats;
    });
    
    next();
  };
})();

module.exports = {
  requestLogger,
  performanceMonitor,
  requestStats,
  formatRequestLog,
  filterSensitiveData
};
