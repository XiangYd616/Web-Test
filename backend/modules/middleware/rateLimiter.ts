/**
 * 速率限制中间件
 */

import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { securityLogger } from './logger';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string | { success: boolean; message: string };
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

interface AuthenticatedRequest extends Request {
  user?: (Request['user'] & { id?: string; role?: string }) | undefined;
  rateLimit?: RateLimitInfo;
}

interface RateLimitInfo {
  resetTime: number;
  totalHits: number;
}

interface RateLimitRequest extends Request {
  rateLimit?: RateLimitInfo;
}

const getBodyString = (body: unknown, key: string): string | undefined => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * 通用速率限制
 */
const GENERAL_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '') || 1 * 60 * 1000; // 1分钟窗口，快速恢复
const GENERAL_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '') || 600; // 1分钟600次（约10次/秒）

const rateLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX,
  skipSuccessfulRequests: true, // 成功请求不计入，仅统计失败/异常请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true, // 自动返回 RateLimit-* 响应头
  legacyHeaders: false,
  handler: (req: RateLimitRequest, res: Response) => {
    const retryAfterSeconds = Math.ceil(GENERAL_WINDOW_MS / 1000);
    securityLogger(
      'rate_limit_exceeded',
      {
        ip: req.ip,
        url: req.originalUrl,
        limit: GENERAL_MAX,
      },
      req
    );

    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      success: false,
      error: { code: StandardErrorCode.RATE_LIMIT_EXCEEDED, message: '请求过于频繁，请稍后再试' },
      message: '请求过于频繁，请稍后再试',
      retryAfterSeconds,
    });
  },
});

/**
 * 邮箱验证速率限制
 */
const emailVerificationRateLimiter = rateLimit({
  windowMs: parseInt(process.env.EMAIL_VERIFICATION_WINDOW_MS || '') || 5 * 60 * 1000, // 5分钟
  max: parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || '') || 30,
  message: {
    success: false,
    message: '验证请求过于频繁，请稍后再试',
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'email_verification_rate_limit_exceeded',
      {
        ip: req.ip,
        email: getBodyString(req.body, 'email'),
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '验证请求过于频繁，请稍后再试',
      },
      message: '验证请求过于频繁，请稍后再试',
    });
  },
});

/**
 * 重发验证邮件速率限制
 */
const resendVerificationRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RESEND_VERIFICATION_WINDOW_MS || '') || 60 * 60 * 1000, // 1小时
  max: parseInt(process.env.RESEND_VERIFICATION_MAX_ATTEMPTS || '') || 50,
  message: {
    success: false,
    message: '重发验证邮件过于频繁，请稍后再试',
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'resend_verification_rate_limit_exceeded',
      {
        ip: req.ip,
        email: getBodyString(req.body, 'email'),
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '重发验证邮件过于频繁，请稍后再试',
      },
      message: '重发验证邮件过于频繁，请稍后再试',
    });
  },
});

/**
 * 严格的速率限制（用于敏感操作）
 */
const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 100, // 敏感操作限制
  message: {
    success: false,
    message: '敏感操作请求过于频繁，请稍后再试',
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'strict_rate_limit_exceeded',
      {
        ip: req.ip,
        url: req.originalUrl,
        limit: 5,
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '敏感操作请求过于频繁，请稍后再试',
      },
      message: '敏感操作请求过于频繁，请稍后再试',
    });
  },
});

/**
 * 登录速率限制
 */
const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '') || 5 * 60 * 1000, // 5分钟
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || '') || 30, // 防暴破，但允许合理重试
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  message: {
    success: false,
    message: '登录尝试过于频繁，请5分钟后再试',
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'login_rate_limit_exceeded',
      {
        ip: req.ip,
        email: getBodyString(req.body, 'email'),
        attempts: req.rateLimit?.totalHits ?? 0,
      },
      req
    );

    res.set('Retry-After', '300');
    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '登录尝试过于频繁，请5分钟后再试',
      },
      message: '登录尝试过于频繁，请5分钟后再试',
      retryAfterSeconds: 300,
    });
  },
});

/**
 * 注册速率限制
 */
const registerRateLimiter = rateLimit({
  windowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || '') || 60 * 60 * 1000, // 1小时
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX_ATTEMPTS || '') || 20, // 注册防滥用
  message: {
    success: false,
    message: '注册请求过于频繁，请1小时后再试',
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'register_rate_limit_exceeded',
      {
        ip: req.ip,
        email: getBodyString(req.body, 'email'),
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '注册请求过于频繁，请1小时后再试',
      },
      message: '注册请求过于频繁，请1小时后再试',
    });
  },
});

/**
 * 统一测试引擎速率限制
 * 基于express-rate-limit最佳实践，支持动态限制和用户角色
 */
const testEngineRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2分钟窗口，快速恢复
  limit: async (req: AuthenticatedRequest) => {
    // 根据用户类型和测试类型动态设置限制
    const testType = getBodyString(req.body, 'testType') ?? 'api';
    const userRole = req.user?.role || 'guest';

    const limits: Record<string, number> = {
      guest: 2,
      viewer: 3,
      user: 5,
      free: 5,
      premium: 20,
      manager: 50,
      enterprise: 100,
      admin: 500,
      superadmin: 500,
    };

    const testTypeMultipliers: Record<string, number> = {
      performance: 2,
      security: 3,
      stress: 5,
      seo: 1,
      api: 1,
      accessibility: 1,
    };

    const baseLimit = limits[userRole] || limits.guest;
    const multiplier = testTypeMultipliers[testType] || 1;

    return Math.floor(baseLimit / multiplier);
  },
  message: {
    success: false,
    message: '测试请求过于频繁，请稍后再试',
  },
  handler: (req: AuthenticatedRequest, res: Response) => {
    const testType = getBodyString(req.body, 'testType');
    securityLogger(
      'test_engine_rate_limit_exceeded',
      {
        ip: req.ip,
        userId: req.user?.id,
        testType,
        attempts: req.rateLimit?.totalHits ?? 0,
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '测试请求过于频繁，请稍后再试',
      },
      message: '测试请求过于频繁，请稍后再试',
    });
  },
});

/**
 * API速率限制
 */
const API_WINDOW_MS = 1 * 60 * 1000; // 1分钟窗口
const API_MAX = 300; // 1分钟300次写操作

const apiRateLimiter = rateLimit({
  windowMs: API_WINDOW_MS,
  max: API_MAX,
  skip: (req: Request) => req.method === 'GET', // GET 只读请求不计数
  message: {
    success: false,
    message: 'API调用过于频繁，请稍后再试',
  },
  keyGenerator: (req: AuthenticatedRequest) => {
    return `api_${req.user?.id || req.ip}`;
  },
  handler: (req: AuthenticatedRequest, res: Response) => {
    securityLogger(
      'api_rate_limit_exceeded',
      {
        ip: req.ip,
        userId: req.user?.id,
        endpoint: req.path,
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'API调用过于频繁，请稍后再试',
      },
      message: 'API调用过于频繁，请稍后再试',
    });
  },
});

/**
 * 文件上传速率限制
 */
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 50, // 每个IP最多50次文件上传
  message: {
    success: false,
    message: '文件上传过于频繁，请稍后再试',
  },
  keyGenerator: (req: Request) => {
    // 基于IP和文件类型的组合键
    const fileType = getBodyString(req.body, 'type') || 'unknown';
    return `upload_${req.ip || 'unknown'}_${fileType}`;
  },
  handler: (req: RateLimitRequest, res: Response) => {
    securityLogger(
      'upload_rate_limit_exceeded',
      {
        ip: req.ip,
        fileType: getBodyString(req.body, 'type'),
      },
      req
    );

    res.status(429).json({
      success: false,
      error: {
        code: StandardErrorCode.RATE_LIMIT_EXCEEDED,
        message: '文件上传过于频繁，请稍后再试',
      },
      message: '文件上传过于频繁，请稍后再试',
    });
  },
});

/**
 * 自定义速率限制创建器
 */
function createCustomRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      message: '请求过于频繁，请稍后再试',
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    keyGenerator: options.keyGenerator,
    handler:
      options.handler ||
      ((_req: RateLimitRequest, res: Response) => {
        const msg =
          typeof options.message === 'string' ? options.message : '请求过于频繁，请稍后再试';
        res.status(429).json({
          success: false,
          error: { code: StandardErrorCode.RATE_LIMIT_EXCEEDED, message: msg },
          message: msg,
        });
      }),
  });
}

/**
 * 基于用户的速率限制
 */
function createUserBasedRateLimiter(limits: Record<string, number>) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: async (req: AuthenticatedRequest) => {
      const userRole = req.user?.role || 'guest';
      return limits[userRole] || limits.guest || 10;
    },
    keyGenerator: (req: AuthenticatedRequest) => `user_${req.user?.id || req.ip}`,
    message: {
      success: false,
      message: '请求过于频繁，请稍后再试',
    },
  });
}

/**
 * 基于端点的速率限制
 */
function createEndpointBasedRateLimiter(
  endpoints: Record<string, { max: number; windowMs?: number }>
) {
  return rateLimit({
    limit: async (req: Request) => {
      const endpoint = req.path;
      const config = endpoints[endpoint];
      return config ? config.max : 100;
    },
    windowMs: 15 * 60 * 1000,
    keyGenerator: (req: Request) => `endpoint_${req.path}_${req.ip || 'unknown'}`,
    message: {
      success: false,
      message: '此端点请求过于频繁，请稍后再试',
    },
  });
}

/**
 * 渐进式速率限制
 */
function createProgressiveRateLimiter(baseLimit: number, multiplier: number = 1.5) {
  const attempts = new Map<string, { count: number; lastReset: number }>();

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: async (req: Request) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const record = attempts.get(key);

      if (!record || now - record.lastReset > 15 * 60 * 1000) {
        attempts.set(key, { count: 1, lastReset: now });
        return baseLimit;
      }

      record.count++;
      const progressiveLimit = Math.floor(baseLimit / Math.pow(multiplier, record.count - 1));
      return Math.max(progressiveLimit, 1);
    },
    keyGenerator: (req: Request) => req.ip || 'unknown',
    message: {
      success: false,
      message: '检测到异常请求频率，限制已收紧',
    },
  });
}

/**
 * 条件速率限制
 */
function createConditionalRateLimiter(
  condition: (req: Request) => boolean,
  limiter: Parameters<typeof rateLimit>[0]
) {
  return rateLimit({
    ...limiter,
    skip: (req: Request) => !condition(req),
  });
}

/**
 * 智能速率限制 - 基于请求特征动态调整
 */
function createSmartRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: async (req: Request) => {
      // 基于请求特征计算限制
      let limit = 100; // 基础限制

      // 根据请求方法调整
      if (req.method === 'GET') limit *= 2;
      if (req.method === 'POST') limit *= 0.8;
      if (req.method === 'DELETE') limit *= 0.5;

      // 根据请求大小调整
      const contentLength = parseInt(req.headers['content-length'] || '0');
      if (contentLength > 1024 * 1024) limit *= 0.3; // 大于1MB

      // 根据用户代理调整（可能是机器人）
      const userAgent = req.headers['user-agent'] || '';
      if (userAgent.includes('bot') || userAgent.includes('crawler')) {
        limit *= 0.1;
      }

      return Math.max(Math.floor(limit), 1);
    },
    keyGenerator: (req: Request) => {
      const features = [req.method, req.ip, req.headers['user-agent']?.substring(0, 50) || ''].join(
        ':'
      );
      return `smart_${Buffer.from(features).toString('base64').substring(0, 32)}`;
    },
    message: {
      success: false,
      message: '智能速率限制触发，请稍后再试',
    },
  });
}

export {
  apiRateLimiter,
  createConditionalRateLimiter,
  createCustomRateLimiter,
  createEndpointBasedRateLimiter,
  createProgressiveRateLimiter,
  createSmartRateLimiter,
  createUserBasedRateLimiter,
  emailVerificationRateLimiter,
  loginRateLimiter,
  rateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
  strictRateLimiter,
  testEngineRateLimiter,
  uploadRateLimiter,
};
