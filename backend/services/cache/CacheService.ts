/**
 * 增强的缓存服务
 * 支持多层缓存、Redis集成、缓存策略等
 */

import Redis from 'ioredis';
import Logger from '../../utils/logger';

enum CacheStrategy {
  MEMORY_ONLY = 'memory_only',
  REDIS_ONLY = 'redis_only',
  MEMORY_FIRST = 'memory_first',
  REDIS_FIRST = 'redis_first',
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  strategy?: CacheStrategy;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
}

interface CacheItem<T> {
  value: T;
  expiry: number;
  createdAt: number;
}

/**
 * 内存缓存实现
 */
class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;
  private defaultTTL: number;
  public stats: CacheStats;

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300; // 5分钟
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL) * 1000;

    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiry,
      createdAt: Date.now(),
    });

    this.stats.sets++;
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 驱逐最旧的项
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Redis缓存实现
 */
class RedisCache<T = unknown> {
  private redis: Redis;
  private defaultTTL: number;
  public stats: CacheStats;

  constructor(
    redisConfig: { host: string; port: number; password?: string; db?: number },
    defaultTTL = 300
  ) {
    this.redis = new Redis(redisConfig);
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    const expiry = ttl || this.defaultTTL;

    await this.redis.setex(key, expiry, serializedValue);
    this.stats.sets++;
  }

  /**
   * 获取缓存
   */
  async get(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      Logger.error('Redis缓存获取失败', { error, key });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      Logger.error('Redis缓存删除失败', { error, key });
      return false;
    }
  }

  /**
   * 健康检查
   */
  async ping(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      Logger.error('Redis缓存清空失败', { error });
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

/**
 * 主缓存服务类
 */
class CacheService<T = unknown> {
  private memoryCache: MemoryCache<T>;
  private redisCache: RedisCache<T> | null = null;
  private strategy: CacheStrategy;

  constructor(options: CacheOptions = {}) {
    this.memoryCache = new MemoryCache<T>({
      maxSize: options.maxSize,
      defaultTTL: options.defaultTTL,
    });

    this.strategy = options.strategy || CacheStrategy.MEMORY_FIRST;

    if (
      options.redis &&
      (this.strategy === CacheStrategy.REDIS_ONLY ||
        this.strategy === CacheStrategy.MEMORY_FIRST ||
        this.strategy === CacheStrategy.REDIS_FIRST)
    ) {
      this.redisCache = new RedisCache<T>(options.redis, options.defaultTTL);
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        this.memoryCache.set(key, value, ttl);
        break;

      case CacheStrategy.REDIS_ONLY:
        if (this.redisCache) {
          await this.redisCache.set(key, value, ttl);
        }
        break;

      case CacheStrategy.MEMORY_FIRST:
        this.memoryCache.set(key, value, ttl);
        if (this.redisCache) {
          await this.redisCache.set(key, value, ttl);
        }
        break;

      case CacheStrategy.REDIS_FIRST:
        if (this.redisCache) {
          await this.redisCache.set(key, value, ttl);
        }
        this.memoryCache.set(key, value, ttl);
        break;
    }
  }

  /**
   * 获取缓存
   */
  async get(key: string): Promise<T | null> {
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return this.memoryCache.get(key);

      case CacheStrategy.REDIS_ONLY:
        return this.redisCache ? await this.redisCache.get(key) : null;

      case CacheStrategy.MEMORY_FIRST: {
        let value = this.memoryCache.get(key);
        if (value === null && this.redisCache) {
          value = await this.redisCache.get(key);
          if (value !== null) {
            // 回填到内存缓存
            this.memoryCache.set(key, value);
          }
        }
        return value;
      }

      case CacheStrategy.REDIS_FIRST: {
        let value = null;
        if (this.redisCache) {
          value = await this.redisCache.get(key);
        }
        if (value === null) {
          value = this.memoryCache.get(key);
          if (value !== null && this.redisCache) {
            // 回填到Redis
            await this.redisCache.set(key, value);
          }
        }
        return value;
      }

      default:
        return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;

    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        deleted = this.memoryCache.delete(key);
        break;

      case CacheStrategy.REDIS_ONLY:
        deleted = this.redisCache ? await this.redisCache.delete(key) : false;
        break;

      case CacheStrategy.MEMORY_FIRST:
      case CacheStrategy.REDIS_FIRST:
        deleted = this.memoryCache.delete(key);
        if (this.redisCache) {
          const redisDeleted = await this.redisCache.delete(key);
          deleted = deleted || redisDeleted;
        }
        break;
    }

    return deleted;
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.redisCache) {
      await this.redisCache.clear();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    const memoryStats = this.memoryCache.stats;
    const redisStats = this.redisCache?.stats || {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };

    return {
      hits: memoryStats.hits + redisStats.hits,
      misses: memoryStats.misses + redisStats.misses,
      sets: memoryStats.sets + redisStats.sets,
      deletes: memoryStats.deletes + redisStats.deletes,
      evictions: memoryStats.evictions + redisStats.evictions,
    };
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    return this.memoryCache.cleanup();
  }

  /**
   * 关闭服务
   */
  async disconnect(): Promise<void> {
    if (this.redisCache) {
      await this.redisCache.disconnect();
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ memory: boolean; redis: boolean }> {
    const memory = this.memoryCache.size() >= 0;
    let redis = false;

    if (this.redisCache) {
      redis = await this.redisCache.ping();
    }

    return { memory, redis };
  }
}

export default CacheService;
export { CacheStrategy, MemoryCache, RedisCache };
