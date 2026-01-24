/**
 * API响应格式化中间件 - 标准版本
 * 版本: v2.0.0
 * 确保所有API返回统一的标准数据结构
 */

import type { NextFunction, Request, Response } from 'express';

// 导入标准API响应构建工具
const {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createRateLimitResponse,
  createInternalErrorResponse,
  createCreatedResponse,
  createNoContentResponse,
  generateRequestId,
  getHttpStatusCode,
  createPaginationMeta,
} = require('../../shared/utils/apiResponseBuilder');

const { StandardErrorCode } = require('../../shared/types/standardApiResponse');

interface EnhancedRequest extends Request {
  requestId: string;
  startTime: number;
}

interface EnhancedResponse extends Response {
  success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: unknown
  ) => Response;
  paginated: (
    data: unknown[],
    page: number,
    limit: number,
    total: number,
    message?: string,
    meta?: unknown
  ) => Response;
  validationError: (errors: unknown[] | Record<string, unknown>, message?: string) => Response;
  unauthorized: (message?: string) => Response;
  forbidden: (message?: string) => Response;
  notFound: (message?: string) => Response;
  conflict: (message?: string) => Response;
  rateLimit: (message?: string) => Response;
  internalError: (message?: string) => Response;
  created: (data?: unknown, message?: string, meta?: unknown) => Response;
  noContent: () => Response;
  custom: (statusCode: number, data?: unknown, message?: string, meta?: unknown) => Response;
  redirectResponse: (url: string, message?: string, statusCode?: number) => Response;
}

/**
 * 响应格式化中间件
 * 在所有路由处理之前添加响应格式化方法
 */
const response = (req: EnhancedRequest, res: EnhancedResponse, next: NextFunction) => {
  // 生成请求ID
  const requestId = generateRequestId();
  req.requestId = requestId;

  // 记录请求开始时间
  req.startTime = Date.now();

  /**
   * 发送标准成功响应
   */
  res.success = (
    data: unknown = null,
    message: string | null = null,
    statusCode: number = 200,
    meta: unknown = undefined
  ) => {
    const duration = Date.now() - req.startTime;
    const metaObject = typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : {};

    const response = createSuccessResponse(data, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
      ...metaObject,
    });

    return res.status(statusCode).json(response);
  };

  /**
   * 发送标准错误响应
   */
  res.error = (
    code: string,
    message: string | null = null,
    details: unknown = null,
    statusCode: number | null = null,
    meta: unknown = undefined
  ) => {
    const duration = Date.now() - req.startTime;
    const httpStatusCode = statusCode || getHttpStatusCode(code);
    const metaObject = typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : {};

    const response = createErrorResponse(code, message, details, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
      ...metaObject,
    });

    return res.status(httpStatusCode).json(response);
  };

  /**
   * 发送标准分页响应
   */
  res.paginated = (
    data: unknown[],
    page: number,
    limit: number,
    total: number,
    message: string | null = null,
    meta: unknown = undefined
  ) => {
    const duration = Date.now() - req.startTime;
    const pagination = createPaginationMeta(page, limit, total);
    const metaObject = typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : {};

    const response = createPaginatedResponse(data, pagination, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
      ...metaObject,
    });

    return res.status(200).json(response);
  };

  /**
   * 发送标准验证错误响应
   */
  res.validationError = (
    errors: unknown[] | Record<string, unknown>,
    message: string | null = null
  ) => {
    const duration = Date.now() - req.startTime;
    const formattedErrors = Array.isArray(errors) ? errors : [errors];

    const response = createValidationErrorResponse(formattedErrors, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(400).json(response);
  };

  /**
   * 发送未授权响应
   */
  res.unauthorized = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createUnauthorizedResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(401).json(response);
  };

  /**
   * 发送禁止访问响应
   */
  res.forbidden = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createForbiddenResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(403).json(response);
  };

  /**
   * 发送资源未找到响应
   */
  res.notFound = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createNotFoundResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(404).json(response);
  };

  /**
   * 发送资源冲突响应
   */
  res.conflict = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createConflictResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(409).json(response);
  };

  /**
   * 发送速率限制响应
   */
  res.rateLimit = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createRateLimitResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(429).json(response);
  };

  /**
   * 发送内部服务器错误响应
   */
  res.internalError = (message: string | null = null) => {
    const duration = Date.now() - req.startTime;

    const response = createInternalErrorResponse(message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(500).json(response);
  };

  /**
   * 发送创建成功响应
   */
  res.created = (
    data: unknown = null,
    message: string | null = null,
    meta: unknown = undefined
  ) => {
    const duration = Date.now() - req.startTime;
    const metaObject = typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : {};

    const response = createCreatedResponse(data, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
      ...metaObject,
    });

    return res.status(201).json(response);
  };

  /**
   * 发送无内容响应
   */
  res.noContent = () => {
    const duration = Date.now() - req.startTime;

    const response = createNoContentResponse({
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(204).json(response);
  };

  /**
   * 发送自定义状态码响应
   */
  res.custom = (
    statusCode: number,
    data: unknown = null,
    message: string | null = null,
    meta: unknown = undefined
  ) => {
    const duration = Date.now() - req.startTime;
    const metaObject = typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : {};

    const response = createSuccessResponse(data, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
      ...metaObject,
    });

    return res.status(statusCode).json(response);
  };

  /**
   * 发送重定向响应
   */
  res.redirectResponse = (url: string, message: string | null = null, statusCode: number = 302) => {
    const duration = Date.now() - req.startTime;

    const response = createSuccessResponse({ redirectUrl: url }, message, {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    });

    return res.status(statusCode).json(response);
  };

  next();
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req: EnhancedRequest, res: EnhancedResponse) => {
  const duration = Date.now() - (req.startTime || Date.now());
  const requestId = req.requestId || generateRequestId();

  const response = createNotFoundResponse(`路径 ${req.originalUrl} 不存在`, {
    requestId,
    duration,
    path: req.originalUrl,
    method: req.method,
    version: '2.0.0',
  });

  res.status(404).json(response);
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (
  error: Error,
  req: EnhancedRequest,
  res: EnhancedResponse,
  next: NextFunction
) => {
  const duration = Date.now() - (req.startTime || Date.now());
  const requestId = req.requestId || generateRequestId();

  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(error);
  }

  // 根据错误类型构建响应
  let statusCode = 500;
  let errorCode = StandardErrorCode.INTERNAL_ERROR;
  let message = '服务器内部错误';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = StandardErrorCode.INVALID_INPUT;
    message = '请求参数验证失败';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = StandardErrorCode.UNAUTHORIZED;
    message = '未授权访问';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = StandardErrorCode.FORBIDDEN;
    message = '权限不足';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = StandardErrorCode.NOT_FOUND;
    message = '资源未找到';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    errorCode = StandardErrorCode.CONFLICT;
    message = '资源冲突';
  }

  const response = createErrorResponse(
    errorCode,
    message,
    process.env.NODE_ENV === 'development' ? error.stack : undefined,
    {
      requestId,
      duration,
      path: req.originalUrl,
      method: req.method,
      version: '2.0.0',
    }
  );

  res.status(statusCode).json(response);
};

/**
 * 响应时间记录中间件
 */
const responseTimeLogger = (req: EnhancedRequest, res: EnhancedResponse, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

/**
 * 响头设置中间件
 */
const responseHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 设置通用响应头
  res.setHeader('X-API-Version', '2.0.0');
  res.setHeader('X-Response-Time', Date.now().toString());

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  next();
};

/**
 * 响应压缩中间件（简化版）
 */
const responseCompression = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  }

  next();
};

/**
 * 响应缓存中间件
 */
const responseCache = (
  options: {
    maxAge?: number;
    etag?: boolean;
  } = {}
) => {
  const { maxAge = 300, etag = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 设置缓存控制头
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);

      if (etag) {
        res.setHeader('ETag', `"${Date.now()}"`);
      }
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    next();
  };
};

export {
  errorHandler,
  notFoundHandler,
  response,
  responseCache,
  responseCompression,
  responseHeaders,
  responseTimeLogger,
  StandardErrorCode,
};

module.exports = {
  response,
  notFoundHandler,
  errorHandler,
  responseTimeLogger,
  responseHeaders,
  responseCompression,
  responseCache,
  StandardErrorCode,
};
