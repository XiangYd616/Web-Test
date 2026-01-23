/**
 * API安全中间件
 * 提供全面的API安全保护，包括认证、授权、限流、输入验证等
 */

import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
const { AppError: _AppError } = require('./errorHandler');
const Logger = require('../utils/logger');

type SecurityConfig = {
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  enableSQLInjectionProtection: boolean;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  maxRequestSize: string;
  allowedOrigins: string[];
  jwtSecret: string;
  sessionTimeout: number;
};

type RateLimiterType = 'strict' | 'moderate' | 'lenient';

type RateLimiter = ReturnType<typeof rateLimit>;

type AuthenticatedRequest = Request & { user?: { id: string } };

class ApiSecurity {
  private securityConfig: SecurityConfig;
  private suspiciousPatterns: RegExp[];
  private rateLimiters: Record<RateLimiterType, RateLimiter>;

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
      sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    };

    this.suspiciousPatterns = [
      // SQL注入模式
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/i,
      /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
      /('|"|;|--|\/\*|\/)/,

      // XSS模式
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,

      // 路径遍历
      /\.\.\//,
      /\.\//,

      // 命令注入
      /(\|\||&|;|\$\(|`)/,
    ];

    this.rateLimiters = this.createRateLimiters();
  }

  /**
   * 创建不同级别的限流器
   */
  private createRateLimiters() {
    return {
      // 严格限流 - 敏感操作
      strict: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 5, // 最多5次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: AuthenticatedRequest) =>
          `strict_${req.ip}_${req.user?.id || 'anonymous'}`,
      }),

      // 中等限流 - 一般API
      moderate: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 最多100次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: AuthenticatedRequest) =>
          `moderate_${req.ip}_${req.user?.id || 'anonymous'}`,
      }),

      // 宽松限流 - 公开API
      lenient: rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 1000, // 最多1000次请求
        message: {
          success: false,
          message: '请求过于频繁，请稍后重试',
          retryAfter: '15分钟',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => `lenient_${req.ip}`,
      }),
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
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
  }

  /**
   * CORS配置中间件
   */
  corsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;

      if (
        this.securityConfig.allowedOrigins.includes('*') ||
        (origin && this.securityConfig.allowedOrigins.includes(origin))
      ) {
        res.header('Access-Control-Allow-Origin', origin || '*');
      }

      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400'); // 24小时

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    };
  }

  /**
   * 输入验证中间件
   */
  inputValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.securityConfig.enableInputValidation) {
        return next();
      }

      const suspicious = this.detectSuspiciousContent(req);
      if (suspicious) {
        Logger.warn(`检测到可疑请求: ${suspicious.type}`, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          url: req.url,
          method: req.method,
        });

        return res.status(400).json({
          success: false,
          message: '请求包含非法内容',
          type: suspicious.type,
        });
      }

      next();
    };
  }

  /**
   * 检测可疑内容
   */
  private detectSuspiciousContent(req: Request) {
    const checkString = (str: string, type: string) => {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(str)) {
          return { type, pattern: pattern.source };
        }
      }
      return null;
    };

    // 检查URL
    if (req.url) {
      const result = checkString(req.url, 'URL');
      if (result) return result;
    }

    // 检查查询参数
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        const result = checkString(value, `query.${key}`);
        if (result) return result;
      }
    }

    // 检查请求体
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      const result = checkString(bodyStr, 'body');
      if (result) return result;
    }

    return null;
  }

  /**
   * SQL注入保护
   */
  sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.securityConfig.enableSQLInjectionProtection) {
        return next();
      }

      const sqlPatterns = [
        /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/i,
        /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
        /('|"|;|--|\/\*|\/)/,
      ];

      const checkSQLInjection = (str: string) => {
        return sqlPatterns.some(pattern => pattern.test(str));
      };

      // 检查各个部分
      const checkParts = [
        req.url,
        ...Object.values(req.query).filter(v => typeof v === 'string'),
        req.body ? JSON.stringify(req.body) : '',
      ];

      for (const part of checkParts) {
        if (checkSQLInjection(part)) {
          Logger.warn('检测到SQL注入尝试', {
            ip: req.ip,
            url: req.url,
            method: req.method,
          });

          return res.status(400).json({
            success: false,
            message: '请求包含潜在的SQL注入攻击',
          });
        }
      }

      next();
    };
  }

  /**
   * XSS保护
   */
  xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.securityConfig.enableXSSProtection) {
        return next();
      }

      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/i,
        /on\w+\s*=/i,
      ];

      const checkXSS = (str: string) => {
        return xssPatterns.some(pattern => pattern.test(str));
      };

      const checkParts = [
        req.url,
        ...Object.values(req.query).filter(v => typeof v === 'string'),
        req.body ? JSON.stringify(req.body) : '',
      ];

      for (const part of checkParts) {
        if (checkXSS(part)) {
          Logger.warn('检测到XSS攻击尝试', {
            ip: req.ip,
            url: req.url,
            method: req.method,
          });

          return res.status(400).json({
            success: false,
            message: '请求包含潜在的XSS攻击',
          });
        }
      }

      next();
    };
  }

  /**
   * 获取指定级别的限流器
   */
  getRateLimiter(level: RateLimiterType) {
    if (!this.securityConfig.enableRateLimit) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return this.rateLimiters[level] || this.rateLimiters.moderate;
  }

  /**
   * 请求大小限制
   */
  requestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.headers['content-length'];
      const maxSize = parseInt(this.securityConfig.maxRequestSize.replace('mb', '')) * 1024 * 1024;

      if (contentLength && parseInt(contentLength) > maxSize) {
        return res.status(413).json({
          success: false,
          message: '请求体过大',
        });
      }

      return next();
    };
  }

  /**
   * 安全头中间件
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // 防止点击劫持
      res.header('X-Frame-Options', 'DENY');

      // 防止MIME类型嗅探
      res.header('X-Content-Type-Options', 'nosniff');

      // XSS保护
      res.header('X-XSS-Protection', '1; mode=block');

      // 引用策略
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

      // 权限策略
      res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      next();
    };
  }

  /**
   * 综合安全中间件
   */
  comprehensiveSecurity() {
    return [
      this.basicSecurity(),
      this.corsMiddleware(),
      this.inputValidation(),
      this.sqlInjectionProtection(),
      this.xssProtection(),
      this.requestSizeLimit(),
      this.securityHeaders(),
    ];
  }
}

// 创建单例实例
const apiSecurity = new ApiSecurity();

module.exports = {
  ApiSecurity,
  apiSecurity,
  basicSecurity: apiSecurity.basicSecurity.bind(apiSecurity),
  corsMiddleware: apiSecurity.corsMiddleware.bind(apiSecurity),
  inputValidation: apiSecurity.inputValidation.bind(apiSecurity),
  sqlInjectionProtection: apiSecurity.sqlInjectionProtection.bind(apiSecurity),
  xssProtection: apiSecurity.xssProtection.bind(apiSecurity),
  getRateLimiter: apiSecurity.getRateLimiter.bind(apiSecurity),
  requestSizeLimit: apiSecurity.requestSizeLimit.bind(apiSecurity),
  securityHeaders: apiSecurity.securityHeaders.bind(apiSecurity),
  comprehensiveSecurity: apiSecurity.comprehensiveSecurity.bind(apiSecurity),
};
