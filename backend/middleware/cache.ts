/**
 * 简单缓存中间件
 * 提供基本的内存缓存功能
 */

import type { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    role?: string;
  };
};

interface CacheItem {
  data: unknown;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number;
}

const cache = new Map<string, CacheItem>();

/**
 * API缓存中间件
 */
function apiCache(key: string, options: CacheOptions = {}) {
  const { ttl = 300 } = options; // 默认5分钟TTL

  return (req: Request, res: Response, next: NextFunction) => {
    // 生成缓存键
    const cacheKey = `${key}_${req.originalUrl}_${JSON.stringify(req.body)}`;

    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return res.json(cached.data);
    }

    // 拦截响应
    const originalJson = res.json;
    res.json = function (data: unknown) {
      // 缓存响应
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // 清理过期缓存
      cleanExpiredCache();

      return originalJson.call(this, data);
    };

    return next();
  };
}

/**
 * 数据库缓存中间件
 */
function dbCache(key: string, options: CacheOptions = {}) {
  return apiCache(key, options);
}

/**
 * 清理过期缓存
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 3600000) {
      // 1小时后清理
      cache.delete(key);
    }
  }
}

/**
 * 清空所有缓存
 */
function clearCache() {
  cache.clear();
}

/**
 * 获取缓存统计
 */
function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * 基于用户ID的缓存中间件
 */
function userCache(key: string, options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user?.id || 'anonymous';
    const userKey = `${key}_user_${userId}_${req.originalUrl}`;

    return apiCache(userKey, options)(req, res, next);
  };
}

/**
 * 基于角色的缓存中间件
 */
function roleCache(key: string, options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as AuthenticatedRequest).user?.role || 'anonymous';
    const roleKey = `${key}_role_${userRole}_${req.originalUrl}`;

    return apiCache(roleKey, options)(req, res, next);
  };
}

/**
 * 条件缓存中间件 - 只缓存成功响应
 */
function conditionalCache(
  key: string,
  options: CacheOptions & { condition?: (data: unknown) => boolean } = {}
) {
  const { ttl = 300, condition } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `${key}_${req.originalUrl}_${JSON.stringify(req.body)}`;

    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return res.json(cached.data);
    }

    // 拦截响应
    const originalJson = res.json;
    res.json = function (data: unknown) {
      // 检查条件
      if (!condition || condition(data)) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        cleanExpiredCache();
      }

      return originalJson.call(this, data);
    };

    return next();
  };
}

/**
 * 智能缓存中间件 - 根据请求方法和内容类型决定是否缓存
 */
function smartCache(key: string, options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    // 检查内容类型
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('multipart/form-data')) {
      return next();
    }

    return apiCache(key, options)(req, res, next);
  };
}

/**
 * 缓存失效中间件 - 根据特定条件清除缓存
 */
function invalidateCache(pattern: string | RegExp) {
  return (req: Request, res: Response, next: NextFunction) => {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }

    next();
  };
}

/**
 * 缓存预热中间件
 */
function warmupCache(entries: Array<{ key: string; data: unknown }>) {
  return (req: Request, res: Response, next: NextFunction) => {
    entries.forEach(({ key, data }) => {
      cache.set(key, {
        data,
        timestamp: Date.now(),
      });
    });

    next();
  };
}

export {
  apiCache,
  cleanExpiredCache,
  clearCache,
  conditionalCache,
  dbCache,
  getCacheStats,
  invalidateCache,
  roleCache,
  smartCache,
  userCache,
  warmupCache,
};

module.exports = {
  apiCache,
  dbCache,
  userCache,
  roleCache,
  conditionalCache,
  smartCache,
  invalidateCache,
  warmupCache,
  clearCache,
  getCacheStats,
};
