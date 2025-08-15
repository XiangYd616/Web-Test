/**
 * API安全中间件
 * 提供全面的API安全保护，包括认证、授权、限流、输入验证等
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const { AppError } = require('./errorHandler');
const Logger = require('../utils/logger');
const { cacheManager } = require('../utils/cacheManager');

class ApiSecurity {
  constructor() {
    this.securityConfig = {
      enableRateLimit: true,
      enableInputValidation: true,
      enableSQLInjectionProtection: true,
      enableXSSProtection: true,
      enableCSRFProtection: true,
      maxRequestSize: '10mb',
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      jwtSecret: process.env.JWT_SECRET || 'default-secret',
      sessionTimeout: 24 * 60 * 60 * 1000 // 24小时
    };

    this.suspiciousPatterns = [
      // SQL注入模式
      /(/b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/b)/i,
      /(/b(OR|AND)/s+/d+/s*=/s*/d+)/i,
      /(/'|\"|;|--|/*|/|)/,
      
      // XSS模式
      /<script/b[^<]*(?:(?!<//script>)<[^<]*)*<//script>/gi,
      /javascript:/i,
      /on/w+/s*=/i,
      
      // 路径遍历
      //././//,
      //././//,
      
      // 命令注入
      /(/||&|;|/$/(|/`)/
    ];

    this.rateLimiters = this.createRateLimiters();
  }

  /**
   * 创建不同级别的限流器
   */
  createRateLimiters() {
    return {
      // 严格限流 - 敏感操作
      strict: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 5, // 最多5次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `strict_${req.ip}_${req.user?.id || 'anonymous'}`
      }),

      // 中等限流 - 一般API
      moderate: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 最多100次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `moderate_${req.ip}_${req.user?.id || 'anonymous'}`
      }),

      // 宽松限流 - 公开API
      lenient: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 1000, // 最多1000次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `lenient_${req.ip}`
      })
    };
  }

  /**
   * 基础安全中间件
   */
  basicSecurity() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'sameorigin' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true
    });
  }

  /**
   * 输入验证中间件
   */
  inputValidation() {
    return (req, res, next) => {
      try {
        // 验证请求体大小
        const contentLength = req.get('content-length');
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
          throw new AppError('请求体过大', 413);
        }

        // 验证Content-Type
        if (req.method !== 'GET' && req.get('content-type')) {
          const contentType = req.get('content-type').toLowerCase();
          const allowedTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain'
          ];
          
          if (!allowedTypes.some(type => contentType.includes(type))) {
            throw new AppError('不支持的Content-Type', 415);
          }
        }

        // 验证请求参数
        this.validateRequestData(req);

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * 验证请求数据
   */
  validateRequestData(req) {
    const dataToValidate = [
      ...Object.values(req.query || {}),
      ...Object.values(req.params || {}),
      ...Object.values(req.body || {})
    ];

    for (const value of dataToValidate) {
      if (typeof value === 'string') {
        // 检查恶意模式
        for (const pattern of this.suspiciousPatterns) {
          if (pattern.test(value)) {
            Logger.warn('Suspicious input detected', {
              value: value.substring(0, 100),
              pattern: pattern.toString(),
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              url: req.originalUrl
            });
            throw new AppError('检测到可疑输入', 400);
          }
        }

        // 检查长度限制
        if (value.length > 10000) {
          throw new AppError('输入数据过长', 400);
        }
      }
    }
  }

  /**
   * API密钥验证中间件
   */
  apiKeyValidation() {
    return async (req, res, next) => {
      try {
        const apiKey = req.get('X-API-Key') || req.query.apiKey;
        
        if (!apiKey) {
          throw new AppError('缺少API密钥', 401);
        }

        // 检查API密钥格式
        if (!validator.isUUID(apiKey) && !validator.isAlphanumeric(apiKey)) {
          throw new AppError('无效的API密钥格式', 401);
        }

        // 验证API密钥（这里应该查询数据库）
        const isValidKey = await this.validateApiKey(apiKey);
        if (!isValidKey) {
          throw new AppError('无效的API密钥', 401);
        }

        // 记录API使用
        await this.logApiUsage(apiKey, req);

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * 权限验证中间件
   */
  permissionCheck(requiredPermissions = []) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AppError('需要登录', 401);
        }

        // 检查用户权限
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.every(permission => 
          userPermissions.includes(permission) || userPermissions.includes('admin')
        );

        if (!hasPermission) {
          Logger.warn('Permission denied', {
            userId: req.user.id,
            requiredPermissions,
            userPermissions,
            url: req.originalUrl
          });
          throw new AppError('权限不足', 403);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * IP白名单验证
   */
  ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        Logger.warn('IP not in whitelist', { clientIP, allowedIPs });
        throw new AppError('IP地址不在允许列表中', 403);
      }

      next();
    };
  }

  /**
   * 请求签名验证
   */
  signatureValidation() {
    return (req, res, next) => {
      try {
        const signature = req.get('X-Signature');
        const timestamp = req.get('X-Timestamp');
        
        if (!signature || !timestamp) {
          throw new AppError('缺少请求签名', 401);
        }

        // 检查时间戳（防重放攻击）
        const requestTime = parseInt(timestamp);
        const currentTime = Date.now();
        const timeDiff = Math.abs(currentTime - requestTime);
        
        if (timeDiff > 5 * 60 * 1000) { // 5分钟
          throw new AppError('请求时间戳过期', 401);
        }

        // 验证签名
        const expectedSignature = this.generateSignature(req, timestamp);
        if (signature !== expectedSignature) {
          throw new AppError('请求签名无效', 401);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * 生成请求签名
   */
  generateSignature(req, timestamp) {
    const crypto = require('crypto');
    const data = `${req.method}${req.originalUrl}${timestamp}${JSON.stringify(req.body || {})}`;
    return crypto.createHmac('sha256', this.securityConfig.jwtSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey) {
    // 检查缓存
    const cacheKey = `api_key_${apiKey}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 这里应该查询数据库验证API密钥
    // 目前返回模拟结果
    const isValid = apiKey.length >= 32; // 简单验证

    // 缓存结果
    await cacheManager.set(cacheKey, isValid, { ttl: 300000 }); // 5分钟

    return isValid;
  }

  /**
   * 记录API使用
   */
  async logApiUsage(apiKey, req) {
    const usage = {
      apiKey: apiKey.substring(0, 8) + '***', // 脱敏
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    Logger.info('API usage', usage);
  }

  /**
   * 获取适当的限流器
   */
  getRateLimiter(level = 'moderate') {
    return this.rateLimiters[level] || this.rateLimiters.moderate;
  }
}

// 创建全局实例
const apiSecurity = new ApiSecurity();

module.exports = {
  ApiSecurity,
  apiSecurity,
  
  // 导出中间件方法
  basicSecurity: () => apiSecurity.basicSecurity(),
  inputValidation: () => apiSecurity.inputValidation(),
  apiKeyValidation: () => apiSecurity.apiKeyValidation(),
  permissionCheck: (permissions) => apiSecurity.permissionCheck(permissions),
  ipWhitelist: (ips) => apiSecurity.ipWhitelist(ips),
  signatureValidation: () => apiSecurity.signatureValidation(),
  
  // 限流器
  strictRateLimit: apiSecurity.getRateLimiter('strict'),
  moderateRateLimit: apiSecurity.getRateLimiter('moderate'),
  lenientRateLimit: apiSecurity.getRateLimiter('lenient')
};
