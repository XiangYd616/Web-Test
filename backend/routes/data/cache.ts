/**
 * 缓存中间件
 * 提供路由级别的缓存功能
 */

import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

// 简单的内存缓存实现
class SimpleCache<T = unknown> {
  private cache = new Map<string, T>();
  private timers = new Map<string, NodeJS.Timeout>();

  set(key: string, value: T, ttl = 300): void {
    // 清除现有的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // 设置缓存值
    this.cache.set(key, value);

    // 设置过期定时器
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);

    this.timers.set(key, timer);
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  delete(key: string): boolean {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    // 清除所有定时器
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values(): T[] {
    return Array.from(this.cache.values());
  }

  entries(): Array<[string, T]> {
    return Array.from(this.cache.entries());
  }
}

const cache = new SimpleCache();

const router = express.Router();

/**
 * 获取缓存信息
 * GET /api/data/cache/info
 */
router.get(
  '/info',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const info = {
      size: cache.size(),
      keys: cache.keys(),
      entries: cache.entries().map(([key, value]) => ({
        key,
        size: JSON.stringify(value).length,
        timestamp: new Date().toISOString(),
      })),
    };

    res.json({
      success: true,
      data: info,
    });
  })
);

/**
 * 获取缓存值
 * GET /api/data/cache/:key
 */
router.get(
  '/:key',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { key } = req.params;
    const value = cache.get(key);

    if (value === undefined) {
      return res.status(404).json({
        success: false,
        message: '缓存键不存在',
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * 设置缓存值
 * POST /api/data/cache/:key
 */
router.post(
  '/:key',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { key } = req.params;
    const { value, ttl } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: '缓存值不能为空',
      });
    }

    cache.set(key, value, ttl);

    res.json({
      success: true,
      message: '缓存设置成功',
      data: {
        key,
        ttl: ttl || 300,
      },
    });
  })
);

/**
 * 删除缓存值
 * DELETE /api/data/cache/:key
 */
router.delete(
  '/:key',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { key } = req.params;
    const deleted = cache.delete(key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '缓存键不存在',
      });
    }

    res.json({
      success: true,
      message: '缓存删除成功',
    });
  })
);

/**
 * 清空所有缓存
 * DELETE /api/data/cache
 */
router.delete(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const size = cache.size();
    cache.clear();

    res.json({
      success: true,
      message: '缓存清空成功',
      data: {
        clearedItems: size,
      },
    });
  })
);

/**
 * 批量操作
 * POST /api/data/cache/batch
 */
router.post(
  '/batch',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { operation, items } = req.body;

    if (!operation || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: '操作类型和项目数组是必需的',
      });
    }

    const results: Array<{ key: string; success: boolean; error?: string }> = [];

    switch (operation) {
      case 'get':
        items.forEach(({ key }) => {
          const value = cache.get(key);
          results.push({
            key,
            success: value !== undefined,
            ...(value !== undefined && { value }),
          });
        });
        break;

      case 'set':
        items.forEach(({ key, value, ttl }) => {
          try {
            cache.set(key, value, ttl);
            results.push({ key, success: true });
          } catch (error) {
            results.push({
              key,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
        break;

      case 'delete':
        items.forEach(({ key }) => {
          const deleted = cache.delete(key);
          results.push({ key, success: deleted });
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '不支持的操作类型。支持的操作: get, set, delete',
        });
    }

    res.json({
      success: true,
      data: {
        operation,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      },
    });
  })
);

export default router;
