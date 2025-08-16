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
 * 测试API速率限制
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
  uploadRateLimiter,
  historyRateLimiter,
  dynamicRateLimiter,
  ipWhitelist
};
