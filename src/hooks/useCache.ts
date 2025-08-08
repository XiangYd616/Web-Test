/**
 * 缓存管理Hook
 * 提供统一的前端缓存操作接口
 * 版本: v1.0.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { defaultMemoryCache, defaultLocalStorageCache, CacheFactory } from '../services/cacheStrategy';
import type { CacheManager, CacheConfig, CacheStats } from '../services/cacheStrategy';

// ==================== 类型定义 ====================

export interface UseCacheOptions {
  cacheType?: 'memory' | 'localStorage' | 'hybrid';
  namespace?: string;
  ttl?: number;
  enableStats?: boolean;
  onCacheHit?: (key: string, data: any) => void;
  onCacheMiss?: (key: string) => void;
  onCacheSet?: (key: string, data: any) => void;
  onCacheDelete?: (key: string) => void;
}

export interface CacheOperations<T = any> {
  get: (key: string, params?: Record<string, any>) => Promise<T | null>;
  set: (key: string, data: T, params?: Record<string, any>, customTTL?: number) => Promise<void>;
  delete: (key: string, params?: Record<string, any>) => Promise<boolean>;
  clear: () => Promise<void>;
  has: (key: string, params?: Record<string, any>) => Promise<boolean>;
  invalidatePattern: (pattern: string) => Promise<number>;
  getStats: () => Promise<CacheStats>;
  preload: (keys: Array<{ key: string; loader: () => Promise<T>; params?: Record<string, any> }>) => Promise<void>;
}

export interface CacheState {
  isLoading: boolean;
  error: string | null;
  stats: CacheStats | null;
  lastOperation: string | null;
}

// ==================== 主Hook ====================

export function useCache<T = any>(options: UseCacheOptions = {}): [CacheState, CacheOperations<T>] {
  const {
    cacheType = 'memory',
    namespace = 'default',
    ttl = 300000, // 5分钟
    enableStats = false,
    onCacheHit,
    onCacheMiss,
    onCacheSet,
    onCacheDelete
  } = options;

  // 状态管理
  const [state, setState] = useState<CacheState>({
    isLoading: false,
    error: null,
    stats: null,
    lastOperation: null
  });

  // 缓存管理器引用
  const cacheManagerRef = useRef<CacheManager | { memory: CacheManager; localStorage: CacheManager } | null>(null);

  // 初始化缓存管理器
  useEffect(() => {
    switch (cacheType) {
      case 'memory':
        cacheManagerRef.current = defaultMemoryCache;
        break;
      case 'localStorage':
        cacheManagerRef.current = defaultLocalStorageCache;
        break;
      case 'hybrid':
        cacheManagerRef.current = CacheFactory.createHybridCache({ ttl, namespace });
        break;
      default:
        cacheManagerRef.current = defaultMemoryCache;
    }
  }, [cacheType, ttl, namespace]);

  // 获取缓存管理器
  const getCacheManager = useCallback((): CacheManager => {
    const manager = cacheManagerRef.current;
    if (!manager) {
      throw new Error('Cache manager not initialized');
    }

    if (cacheType === 'hybrid') {
      return (manager as { memory: CacheManager; localStorage: CacheManager }).memory;
    }

    return manager as CacheManager;
  }, [cacheType]);

  // 获取混合缓存的localStorage管理器
  const getLocalStorageManager = useCallback((): CacheManager | null => {
    if (cacheType !== 'hybrid') return null;
    
    const manager = cacheManagerRef.current;
    if (!manager) return null;

    return (manager as { memory: CacheManager; localStorage: CacheManager }).localStorage;
  }, [cacheType]);

  // 更新状态
  const updateState = useCallback((updates: Partial<CacheState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 缓存操作
  const operations: CacheOperations<T> = {
    // 获取缓存数据
    get: useCallback(async (key: string, params?: Record<string, any>) => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'get' });

        const cacheManager = getCacheManager();
        let data = await cacheManager.get(key, params);

        // 如果是混合缓存且内存中没有，尝试从localStorage获取
        if (!data && cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            data = await localStorageManager.get(key, params);
            
            // 如果localStorage中有数据，同步到内存缓存
            if (data) {
              await cacheManager.set(key, data, params, ttl);
            }
          }
        }

        if (data) {
          onCacheHit?.(key, data);
        } else {
          onCacheMiss?.(key);
        }

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache get operation failed';
        updateState({ error: errorMessage });
        return null;
      } finally {
        updateState({ isLoading: false });
      }
    }, [getCacheManager, getLocalStorageManager, cacheType, ttl, onCacheHit, onCacheMiss, updateState]),

    // 设置缓存数据
    set: useCallback(async (key: string, data: T, params?: Record<string, any>, customTTL?: number) => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'set' });

        const cacheManager = getCacheManager();
        await cacheManager.set(key, data, params, customTTL || ttl);

        // 如果是混合缓存，同时设置到localStorage
        if (cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            await localStorageManager.set(key, data, params, (customTTL || ttl) * 5); // localStorage保存更久
          }
        }

        onCacheSet?.(key, data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache set operation failed';
        updateState({ error: errorMessage });
      } finally {
        updateState({ isLoading: false });
      }
    }, [getCacheManager, getLocalStorageManager, cacheType, ttl, onCacheSet, updateState]),

    // 删除缓存数据
    delete: useCallback(async (key: string, params?: Record<string, any>) => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'delete' });

        const cacheManager = getCacheManager();
        const deleted = await cacheManager.delete(key, params);

        // 如果是混合缓存，同时从localStorage删除
        if (cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            await localStorageManager.delete(key, params);
          }
        }

        if (deleted) {
          onCacheDelete?.(key);
        }

        return deleted;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache delete operation failed';
        updateState({ error: errorMessage });
        return false;
      } finally {
        updateState({ isLoading: false });
      }
    }, [getCacheManager, getLocalStorageManager, cacheType, onCacheDelete, updateState]),

    // 清空缓存
    clear: useCallback(async () => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'clear' });

        const cacheManager = getCacheManager();
        await cacheManager.clear();

        // 如果是混合缓存，同时清空localStorage
        if (cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            await localStorageManager.clear();
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache clear operation failed';
        updateState({ error: errorMessage });
      } finally {
        updateState({ isLoading: false });
      }
    }, [getCacheManager, getLocalStorageManager, cacheType, updateState]),

    // 检查缓存是否存在
    has: useCallback(async (key: string, params?: Record<string, any>) => {
      try {
        const cacheManager = getCacheManager();
        const exists = await cacheManager.has(key, params);

        // 如果内存中没有但是混合缓存，检查localStorage
        if (!exists && cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            return await localStorageManager.has(key, params);
          }
        }

        return exists;
      } catch (error) {
        return false;
      }
    }, [getCacheManager, getLocalStorageManager, cacheType]),

    // 按模式失效缓存
    invalidatePattern: useCallback(async (pattern: string) => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'invalidatePattern' });

        const cacheManager = getCacheManager();
        let count = await cacheManager.invalidatePattern(pattern);

        // 如果是混合缓存，同时失效localStorage
        if (cacheType === 'hybrid') {
          const localStorageManager = getLocalStorageManager();
          if (localStorageManager) {
            count += await localStorageManager.invalidatePattern(pattern);
          }
        }

        return count;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache invalidate operation failed';
        updateState({ error: errorMessage });
        return 0;
      } finally {
        updateState({ isLoading: false });
      }
    }, [getCacheManager, getLocalStorageManager, cacheType, updateState]),

    // 获取缓存统计
    getStats: useCallback(async () => {
      try {
        const cacheManager = getCacheManager();
        const stats = await cacheManager.getStats();
        
        if (enableStats) {
          updateState({ stats });
        }
        
        return stats;
      } catch (error) {
        return {
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
          memoryUsage: 0,
          operations: 0
        };
      }
    }, [getCacheManager, enableStats, updateState]),

    // 预加载数据
    preload: useCallback(async (keys: Array<{ key: string; loader: () => Promise<T>; params?: Record<string, any> }>) => {
      try {
        updateState({ isLoading: true, error: null, lastOperation: 'preload' });

        const promises = keys.map(async ({ key, loader, params }) => {
          try {
            // 检查是否已经缓存
            const exists = await operations.has(key, params);
            if (!exists) {
              const data = await loader();
              await operations.set(key, data, params);
            }
          } catch (error) {
            console.warn(`Failed to preload cache key: ${key}`, error);
          }
        });

        await Promise.all(promises);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cache preload operation failed';
        updateState({ error: errorMessage });
      } finally {
        updateState({ isLoading: false });
      }
    }, [operations, updateState])
  };

  // 定期更新统计信息
  useEffect(() => {
    if (!enableStats) return;

    const updateStats = async () => {
      try {
        const stats = await operations.getStats();
        updateState({ stats });
      } catch (error) {
        // 忽略统计更新错误
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, [enableStats, operations, updateState]);

  return [state, operations];
}

// ==================== 专用Hook ====================

/**
 * API响应缓存Hook
 */
export function useApiCache<T = any>(options: Omit<UseCacheOptions, 'namespace'> = {}) {
  return useCache<T>({
    ...options,
    namespace: 'api',
    ttl: options.ttl || 300000, // 5分钟
    cacheType: 'hybrid' // API响应使用混合缓存
  });
}

/**
 * 用户数据缓存Hook
 */
export function useUserCache<T = any>(options: Omit<UseCacheOptions, 'namespace'> = {}) {
  return useCache<T>({
    ...options,
    namespace: 'user',
    ttl: options.ttl || 600000, // 10分钟
    cacheType: 'localStorage' // 用户数据使用localStorage
  });
}

/**
 * 临时数据缓存Hook
 */
export function useTempCache<T = any>(options: Omit<UseCacheOptions, 'namespace'> = {}) {
  return useCache<T>({
    ...options,
    namespace: 'temp',
    ttl: options.ttl || 60000, // 1分钟
    cacheType: 'memory' // 临时数据只使用内存缓存
  });
}

/**
 * 测试结果缓存Hook
 */
export function useTestResultCache<T = any>(options: Omit<UseCacheOptions, 'namespace'> = {}) {
  return useCache<T>({
    ...options,
    namespace: 'test_results',
    ttl: options.ttl || 3600000, // 1小时
    cacheType: 'hybrid' // 测试结果使用混合缓存
  });
}

export default useCache;
