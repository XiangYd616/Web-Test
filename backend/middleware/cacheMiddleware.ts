/**
 * 简化的缓存中间件
 * 使用内存缓存提供基础缓存功能
 */

import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

interface CacheItem {
  data: unknown;
  timestamp: number;
}

interface CacheMiddlewareOptions {
  ttl?: number;
  excludeMethods?: string[];
  excludeStatus?: number[];
}

interface CacheRequest {
  user?: {
    id: number | string;
    role?: string;
    username?: string;
    email?: string;
  };
  originalUrl?: string;
  url?: string;
  method: string;
}

// 简单的内存缓存存储
const cache = new Map<string, CacheItem>();

/**
 * 创建缓存中间件
 */
function createCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const defaultOptions: CacheMiddlewareOptions = {
    ttl: 15 * 60, // 15分钟
    excludeMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    excludeStatus: [400, 401, 403, 404, 500, 502, 503, 504],
  };

  const config = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 跳过不缓存的方法
      if (config.excludeMethods?.includes(req.method)) {
        return next();
      }

      // 生成缓存键
      const cacheKey = generateCacheKey({
        user: req.user,
        originalUrl: req.originalUrl,
        url: req.url,
        method: req.method,
      });

      // 尝试从缓存获取
      const cached = cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < (config.ttl ?? 0) * 1000) {
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
      }

      // 设置缓存未命中标记
      res.set('X-Cache', 'MISS');

      // 拦截响应以缓存结果
      const originalJson = res.json;
      res.json = function (data: unknown) {
        // 只缓存成功的响应
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          !config.excludeStatus?.includes(res.statusCode)
        ) {
          cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });

          // 清理过期缓存
          cleanExpiredCache(config.ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('缓存中间件错误:', error);
      next();
    }
  };
}

/**
 * 清理过期缓存
 */
function cleanExpiredCache(ttl?: number) {
  const now = Date.now();
  const maxAge = (ttl || 900) * 1000; // 默认15分钟

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > maxAge) {
      cache.delete(key);
    }
  }
}

/**
 * 生成缓存键
 */
function generateCacheKey(req: CacheRequest) {
  const url = req.originalUrl || req.url;
  const method = req.method;
  const userId = req.user?.id || 'anonymous';

  const keyData = `${method}:${url}:${userId}`;
  return crypto.createHash('md5').update(keyData).digest('hex');
}

/**
 * 缓存控制中间件
 */
function createCacheControlMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 设置缓存控制头
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=300'); // 5分钟
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
}

/**
 * 基于路径模式的缓存中间件
 */
function createPathCacheMiddleware(patterns: string[], options: CacheMiddlewareOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path || req.url;

    // 检查路径是否匹配模式
    const shouldCache = patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    });

    if (shouldCache) {
      return createCacheMiddleware(options)(req, res, next);
    }

    next();
  };
}

/**
 * 基于响应头的缓存中间件
 */
function createHeaderBasedCacheMiddleware(
  options: CacheMiddlewareOptions & {
    cacheHeaders?: string[];
  } = {}
) {
  const { cacheHeaders = ['cache-control'], ...cacheOptions } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查请求头是否包含缓存指令
    const shouldCache = cacheHeaders.some(header => {
      const value = req.headers[header.toLowerCase()];
      return value && value.includes('no-cache') === false;
    });

    if (shouldCache) {
      return createCacheMiddleware(cacheOptions)(req, res, next);
    }

    next();
  };
}

/**
 * 智能缓存中间件 - 根据响应大小决定是否缓存
 */
function createSmartCacheMiddleware(
  options: CacheMiddlewareOptions & {
    maxResponseSize?: number;
  } = {}
) {
  const { maxResponseSize = 1024 * 1024, ...cacheOptions } = options; // 默认1MB

  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: unknown) {
      // 检查响应大小
      const responseSize = JSON.stringify(data).length;

      if (responseSize <= maxResponseSize) {
        // 响应大小合适，使用缓存中间件
        return createCacheMiddleware(cacheOptions)(req, res, () => {
          return originalJson.call(this, data);
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 缓存统计中间件
 */
function createCacheStatsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 添加缓存统计到响应头
    res.set(
      'X-Cache-Stats',
      JSON.stringify({
        size: cache.size,
        timestamp: Date.now(),
      })
    );

    next();
  };
}

/**
 * 缓存预热中间件
 */
function createCacheWarmupMiddleware(
  entries: Array<{
    key: string;
    data: unknown;
    ttl?: number;
  }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    entries.forEach(({ key, data, ttl }) => {
      cache.set(key, {
        data,
        timestamp: Date.now() - (ttl ? ttl * 1000 - 1000 : 0), // 设置为即将过期以测试
      });
    });

    next();
  };
}

export {
  cleanExpiredCache,
  createCacheControlMiddleware,
  createCacheMiddleware,
  createCacheStatsMiddleware,
  createCacheWarmupMiddleware,
  createHeaderBasedCacheMiddleware,
  createPathCacheMiddleware,
  createSmartCacheMiddleware,
  generateCacheKey,
};

module.exports = {
  createCacheMiddleware,
  createCacheControlMiddleware,
  generateCacheKey,
};
