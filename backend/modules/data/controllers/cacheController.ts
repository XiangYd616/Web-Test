/**
 * 缓存控制器
 * 职责: 处理缓存的 CRUD 和批量操作业务逻辑
 * 从 data/routes/cache.ts 中提取
 */

import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import type { ApiResponse, AuthenticatedRequest } from '../../types';

// ==================== SimpleCache 实现 ====================

class SimpleCache<T = unknown> {
  private cache = new Map<string, T>();
  private timers = new Map<string, NodeJS.Timeout>();

  set(key: string, value: T, ttl = 300): void {
    if (this.timers.has(key)) {
      const existingTimer = this.timers.get(key);
      if (existingTimer) clearTimeout(existingTimer);
    }
    this.cache.set(key, value);
    const timer = setTimeout(() => { this.cache.delete(key); this.timers.delete(key); }, ttl * 1000);
    this.timers.set(key, timer);
  }

  get(key: string): T | undefined { return this.cache.get(key); }

  delete(key: string): boolean {
    if (this.timers.has(key)) {
      const existingTimer = this.timers.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.cache.clear();
  }

  size(): number { return this.cache.size; }
  has(key: string): boolean { return this.cache.has(key); }
  keys(): string[] { return Array.from(this.cache.keys()); }
  values(): T[] { return Array.from(this.cache.values()); }
  entries(): Array<[string, T]> { return Array.from(this.cache.entries()); }
}

const cache = new SimpleCache();

// ==================== 控制器方法 ====================

const getInfo = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const info = {
    size: cache.size(),
    keys: cache.keys(),
    entries: cache.entries().map(([key, value]) => ({ key, size: JSON.stringify(value).length, timestamp: new Date().toISOString() })),
  };
  return res.success(info);
};

const getValue = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { key } = req.params;
  const value = cache.get(key);
  if (value === undefined) return res.error(StandardErrorCode.NOT_FOUND, '缓存键不存在', undefined, 404);
  return res.success({ key, value, timestamp: new Date().toISOString() });
};

const setValue = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { key } = req.params;
  const { value, ttl } = req.body;
  if (value === undefined) return res.error(StandardErrorCode.INVALID_INPUT, '缓存值不能为空', undefined, 400);
  cache.set(key, value, ttl);
  return res.success({ key, ttl: ttl || 300 }, '缓存设置成功');
};

const deleteValue = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { key } = req.params;
  const deleted = cache.delete(key);
  if (!deleted) return res.error(StandardErrorCode.NOT_FOUND, '缓存键不存在', undefined, 404);
  return res.success(null, '缓存删除成功');
};

const clearAll = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const size = cache.size();
  cache.clear();
  return res.success({ clearedItems: size }, '缓存清空成功');
};

const batch = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { operation, items } = req.body;
  if (!operation || !Array.isArray(items)) return res.error(StandardErrorCode.INVALID_INPUT, '操作类型和项目数组是必需的', undefined, 400);

  const results: Array<{ key: string; success: boolean; error?: string; value?: unknown }> = [];

  switch (operation) {
    case 'get':
      items.forEach(({ key }: { key: string }) => {
        const value = cache.get(key);
        results.push({ key, success: value !== undefined, ...(value !== undefined && { value }) });
      });
      break;
    case 'set':
      items.forEach(({ key, value, ttl }: { key: string; value: unknown; ttl?: number }) => {
        try { cache.set(key, value, ttl); results.push({ key, success: true }); }
        catch (error) { results.push({ key, success: false, error: error instanceof Error ? error.message : String(error) }); }
      });
      break;
    case 'delete':
      items.forEach(({ key }: { key: string }) => { results.push({ key, success: cache.delete(key) }); });
      break;
    default:
      return res.error(StandardErrorCode.INVALID_INPUT, '不支持的操作类型。支持的操作: get, set, delete', undefined, 400);
  }

  return res.success({ operation, results, summary: { total: results.length, successful: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length } });
};

export default { getInfo, getValue, setValue, deleteValue, clearAll, batch };
