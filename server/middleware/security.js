/**
 * 安全中间件
 */

const { securityLogger } = require('./logger');

/**
 * 安全中间件
 */
const securityMiddleware = (req, res, next) => {
  // 检查可疑的用户代理
  const userAgent = req.get('User-Agent') || '';
  const suspiciousAgents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zap'];
  
  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    securityLogger('suspicious_user_agent', {
      userAgent,
      ip: req.ip,
      url: req.originalUrl
    }, req);
  }

  // 检查SQL注入尝试
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ];

  const checkSQLInjection = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  // 检查请求参数
  const checkParams = (params) => {
    for (const key in params) {
      if (checkSQLInjection(params[key])) {
        securityLogger('sql_injection_attempt', {
          parameter: key,
          value: params[key],
          ip: req.ip,
          url: req.originalUrl
        }, req);
        
        return res.status(400).json({
          success: false,
          message: '检测到恶意请求'
        });
      }
    }
  };

  // 检查查询参数
  checkParams(req.query);
  
  // 检查请求体
  if (req.body && typeof req.body === 'object') {
    checkParams(req.body);
  }

  // 检查XSS尝试
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  const checkXSS = (value) => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkXSSInParams = (params) => {
    for (const key in params) {
      if (checkXSS(params[key])) {
        securityLogger('xss_attempt', {
          parameter: key,
          value: params[key],
          ip: req.ip,
          url: req.originalUrl
        }, req);
        
        return res.status(400).json({
          success: false,
          message: '检测到恶意脚本'
        });
      }
    }
  };

  checkXSSInParams(req.query);
  if (req.body && typeof req.body === 'object') {
    checkXSSInParams(req.body);
  }

  next();
};

/**
 * CSRF保护中间件
 */
const csrfProtection = (req, res, next) => {
  // 跳过GET请求
  if (req.method === 'GET') {
    return next();
  }

  // 检查CSRF令牌
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    securityLogger('csrf_token_mismatch', {
      providedToken: token,
      expectedToken: sessionToken,
      ip: req.ip,
      url: req.originalUrl
    }, req);

    return res.status(403).json({
      success: false,
      message: 'CSRF令牌验证失败'
    });
  }

  next();
};

/**
 * 请求大小限制
 */
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      securityLogger('request_size_exceeded', {
        contentLength,
        maxSize,
        ip: req.ip,
        url: req.originalUrl
      }, req);

      return res.status(413).json({
        success: false,
        message: '请求体过大'
      });
    }

    next();
  };
};

/**
 * 解析大小字符串
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
};

/**
 * 文件类型验证
 */
const fileTypeValidation = (allowedTypes = []) => {
  return (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];
    const fileArray = Array.isArray(files) ? files : Object.values(files).flat();

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.mimetype)) {
        securityLogger('invalid_file_type', {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowedTypes,
          ip: req.ip
        }, req);

        return res.status(400).json({
          success: false,
          message: `不允许的文件类型: ${file.mimetype}`
        });
      }
    }

    next();
  };
};

/**
 * 路径遍历保护
 */
const pathTraversalProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,
    /\.\\/,
    /\.\/\./,
    /%2e%2e/i,
    /%2f/i,
    /%5c/i
  ];

  const checkPath = (path) => {
    return suspiciousPatterns.some(pattern => pattern.test(path));
  };

  // 检查URL路径
  if (checkPath(req.path)) {
    securityLogger('path_traversal_attempt', {
      path: req.path,
      ip: req.ip,
      url: req.originalUrl
    }, req);

    return res.status(400).json({
      success: false,
      message: '检测到路径遍历尝试'
    });
  }

  // 检查查询参数
  for (const key in req.query) {
    if (typeof req.query[key] === 'string' && checkPath(req.query[key])) {
      securityLogger('path_traversal_attempt', {
        parameter: key,
        value: req.query[key],
        ip: req.ip,
        url: req.originalUrl
      }, req);

      return res.status(400).json({
        success: false,
        message: '检测到路径遍历尝试'
      });
    }
  }

  next();
};

/**
 * IP黑名单检查
 */
const ipBlacklist = (blacklist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (blacklist.includes(clientIP)) {
      securityLogger('blacklisted_ip_access', {
        ip: clientIP,
        url: req.originalUrl
      }, req);

      return res.status(403).json({
        success: false,
        message: 'IP地址已被禁止访问'
      });
    }

    next();
  };
};

module.exports = {
  securityMiddleware,
  csrfProtection,
  requestSizeLimit,
  fileTypeValidation,
  pathTraversalProtection,
  ipBlacklist
};
