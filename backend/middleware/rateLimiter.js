/**
 * 速率限制中间件
 */

const rateLimit = require('express-rate-limit');
const { securityLogger } = require('./logger');

/**
 * 通用速率限制
 */
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP在窗口期内最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    securityLogger('rate_limit_exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      limit: 100
    }, req);

    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 严格的速率限制（用于敏感操作）
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP在窗口期内最多5个请求
  message: {
    success: false,
    message: '敏感操作请求过于频繁，请稍后再试'
  },
  handler: (req, res) => {
    securityLogger('strict_rate_limit_exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      limit: 5
    }, req);

    res.status(429).json({
      success: false,
      message: '敏感操作请求过于频繁，请稍后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 登录速率限制
 */
const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5, // 限制每个IP在窗口期内最多5次登录尝试
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试'
  },
  handler: (req, res) => {
    securityLogger('login_rate_limit_exceeded', {
      ip: req.ip,
      email: req.body.email,
      attempts: req.rateLimit.totalHits
    }, req);

    res.status(429).json({
      success: false,
      message: '登录尝试过于频繁，请15分钟后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 注册速率限制
 */
const registerRateLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1小时
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX_ATTEMPTS) || 3, // 限制每个IP在1小时内最多3次注册
  message: {
    success: false,
    message: '注册请求过于频繁，请1小时后再试'
  },
  handler: (req, res) => {
    securityLogger('register_rate_limit_exceeded', {
      ip: req.ip,
      email: req.body.email
    }, req);

    res.status(429).json({
      success: false,
      message: '注册请求过于频繁，请1小时后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 统一测试引擎速率限制
 * 基于express-rate-limit最佳实践，支持动态限制和用户角色
 */
const testEngineRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟窗口
  limit: async (req) => {
    // 根据用户类型和测试类型动态设置限制
    const testType = req.body?.testType;
    const userRole = req.user?.role || 'guest';

    // 压力测试限制更严格
    if (testType === 'stress') {
      switch (userRole) {
        case 'admin': return 100;
        case 'premium': return 10;
        case 'standard': return 5;
        default: return 2;
      }
    }

    // 安全测试适度限制
    if (testType === 'security') {
      switch (userRole) {
        case 'admin': return 100;
        case 'premium': return 30;
        case 'standard': return 15;
        default: return 5;
      }
    }

    // 其他测试类型标准限制
    switch (userRole) {
      case 'admin': return 200;
      case 'premium': return 50;
      case 'standard': return 20;
      default: return 10;
    }
  },
  standardHeaders: 'draft-8', // 使用最新的标准头
  legacyHeaders: false,
  message: async (req) => {
    const testType = req.body?.testType || '测试';
    const userRole = req.user?.role || 'guest';

    return {
      success: false,
      error: '测试执行频率限制',
      message: `${testType}测试请求过于频繁，请稍后再试`,
      userType: userRole,
      testType,
      upgradeHint: userRole === 'guest' ? '注册用户可获得更高的测试限额' :
        userRole === 'standard' ? '升级到高级用户可获得更高的测试限额' : null
    };
  },
  keyGenerator: (req) => {
    // 使用用户ID + IP + 测试类型的组合作为键
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress;
    const testType = req.body?.testType || 'general';
    return `engine:${testType}:${userId}:${ip}`;
  },
  skip: (req) => {
    // 管理员和健康检查跳过限制
    return (req.user && req.user.role === 'admin') || req.path === '/health';
  },
  requestWasSuccessful: (req, res) => {
    // 只对成功启动的测试计数
    return res.statusCode < 400;
  },
  handler: (req, res) => {
    const testType = req.body?.testType || 'unknown';
    const userRole = req.user?.role || 'guest';

    securityLogger('test_engine_rate_limit_exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      user: req.user ? req.user.id : 'anonymous',
      userRole,
      testType,
      limit: req.rateLimit.limit,
      used: req.rateLimit.used
    }, req);

    res.status(429).json({
      success: false,
      error: '测试执行频率限制',
      message: `${testType}测试请求过于频繁，请稍后再试`,
      details: {
        userType: userRole,
        testType,
        currentUsage: req.rateLimit.used,
        limit: req.rateLimit.limit,
        resetTime: new Date(req.rateLimit.resetTime).toISOString(),
        retryAfter: Math.round((req.rateLimit.resetTime - Date.now()) / 1000)
      },
      upgradeHint: userRole === 'guest' ? '注册用户可获得更高的测试限额' :
        userRole === 'standard' ? '升级到高级用户可获得更高的测试限额' : null
    });
  }
});

/**
 * 测试API速率限制（保持向后兼容）
 */
const testRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 10, // 限制每个IP在5分钟内最多10次测试
  message: {
    success: false,
    message: '测试请求过于频繁，请稍后再试'
  },
  handler: (req, res) => {
    securityLogger('test_rate_limit_exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      user: req.user ? req.user.id : 'anonymous'
    }, req);

    res.status(429).json({
      success: false,
      message: '测试请求过于频繁，请稍后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 文件上传速率限制
 */
const uploadRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 20, // 限制每个IP在10分钟内最多20次上传
  message: {
    success: false,
    message: '文件上传过于频繁，请稍后再试'
  },
  handler: (req, res) => {
    securityLogger('upload_rate_limit_exceeded', {
      ip: req.ip,
      user: req.user ? req.user.id : 'anonymous'
    }, req);

    res.status(429).json({
      success: false,
      message: '文件上传过于频繁，请稍后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 历史记录查询速率限制（更宽松）
 */
const historyRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 50, // 限制每个IP在5分钟内最多50次历史查询
  message: {
    success: false,
    message: '历史记录查询过于频繁，请稍后再试'
  },
  handler: (req, res) => {
    securityLogger('history_rate_limit_exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      user: req.user ? req.user.id : 'anonymous'
    }, req);

    res.status(429).json({
      success: false,
      message: '历史记录查询过于频繁，请稍后再试',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * 动态速率限制（基于用户角色）
 */
const dynamicRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: (req) => {
      // 管理员用户更高的限制
      if (req.user && req.user.role === 'admin') {

        return options.adminMax || 1000;
      }
      // 认证用户的限制
      if (req.user) {

        return options.userMax || 200;
      }
      // 匿名用户的限制
      return options.anonymousMax || 50;
    },
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试'
    },
    handler: (req, res) => {
      securityLogger('dynamic_rate_limit_exceeded', {
        ip: req.ip,
        user: req.user ? req.user.id : 'anonymous',
        role: req.user ? req.user.role : 'anonymous',
        url: req.originalUrl
      }, req);

      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      });
    }
  });
};

/**
 * IP白名单检查
 */
const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // 开发环境跳过检查
    if (process.env.NODE_ENV === 'development') {

      return next();
    }

    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      securityLogger('ip_not_whitelisted', {
        ip: clientIP,
        url: req.originalUrl
      }, req);

      return res.status(403).json({
        success: false,
        message: 'IP地址不在白名单中'
      });
    }

    next();
  };
};

module.exports = {
  rateLimiter,
  strictRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  testRateLimiter,
  testEngineRateLimiter, // 新增：测试引擎专用速率限制
  uploadRateLimiter,
  historyRateLimiter,
  dynamicRateLimiter,
  ipWhitelist
};
