/**
 * 增强的缓存服务
 * 支持多层缓存、Redis集成、缓存策略等
 */

const Redis = require('ioredis');
const { logger } = require('../../utils/errorHandler');

/**
 * 缓存策略枚举
 */
const CacheStrategy = {
  MEMORY_ONLY: 'memory_only',
  REDIS_ONLY: 'redis_only',
  MEMORY_FIRST: 'memory_first',
  REDIS_FIRST: 'redis_first'
};

/**
 * 内存缓存实现
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300; // 5分钟
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取缓存
   */
  async get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = this.defaultTTL) {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    this.stats.sets++;
    return true;
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * 清空缓存
   */
  async clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    return true;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.logDebug(`Memory cache cleanup: removed ${cleaned} expired items`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * 销毁缓存
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

/**
 * Redis缓存实现
 */
class RedisCache {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 300;
    this.keyPrefix = options.keyPrefix || 'testweb:';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    // 创建Redis连接
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    this.redis.on('error', (error) => {
      this.stats.errors++;
      logger.logWarn('Redis cache error', { error: error.message });
    });
    
    this.redis.on('connect', () => {
      logger.logInfo('Redis cache connected');
    });
  }

  /**
   * 生成完整的缓存键
   */
  getFullKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * 获取缓存
   */
  async get(key) {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      this.stats.errors++;
      logger.logWarn('Redis get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
      
      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.logWarn('Redis set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    try {
      const fullKey = this.getFullKey(key);
      const deleted = await this.redis.del(fullKey);
      
      if (deleted > 0) {
        this.stats.deletes++;
      }
      
      return deleted > 0;
    } catch (error) {
      this.stats.errors++;
      logger.logWarn('Redis delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * 清空缓存
   */
  async clear() {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.logWarn('Redis clear error', { error: error.message });
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const memoryUsed = info.match(/used_memory:(\d+)/)?.[1] || 0;
      
      return {
        ...this.stats,
        hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        memoryUsed: parseInt(memoryUsed),
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      return {
        ...this.stats,
        hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * 销毁连接
   */
  async destroy() {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.logWarn('Redis destroy error', { error: error.message });
    }
  }
}

/**
 * 多层缓存服务
 */
class CacheService {
  constructor(options = {}) {
    this.strategy = options.strategy || CacheStrategy.MEMORY_FIRST;
    this.memoryCache = new MemoryCache(options.memory);
    this.redisCache = new RedisCache(options.redis);
    this.defaultTTL = options.defaultTTL || 300;
  }

  /**
   * 获取缓存
   */
  async get(key) {
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return await this.memoryCache.get(key);
        
      case CacheStrategy.REDIS_ONLY:
        return await this.redisCache.get(key);
        
      case CacheStrategy.MEMORY_FIRST:
        // 先查内存缓存
        let value = await this.memoryCache.get(key);
        if (value !== null) {
          return value;
        }
        
        // 再查Redis缓存
        value = await this.redisCache.get(key);
        if (value !== null) {
          // 回填到内存缓存
          await this.memoryCache.set(key, value, this.defaultTTL);
        }
        return value;
        
      case CacheStrategy.REDIS_FIRST:
        // 先查Redis缓存
        value = await this.redisCache.get(key);
        if (value !== null) {
          return value;
        }
        
        // 再查内存缓存
        return await this.memoryCache.get(key);
        
      default:
        return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = this.defaultTTL) {
    const promises = [];
    
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return await this.memoryCache.set(key, value, ttl);
        
      case CacheStrategy.REDIS_ONLY:
        return await this.redisCache.set(key, value, ttl);
        
      case CacheStrategy.MEMORY_FIRST:
      case CacheStrategy.REDIS_FIRST:
        // 同时设置两个缓存
        promises.push(this.memoryCache.set(key, value, ttl));
        promises.push(this.redisCache.set(key, value, ttl));
        
        const results = await Promise.allSettled(promises);
        return results.some(result => result.status === 'fulfilled' && result.value);
        
      default:
        return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    const promises = [];
    
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return await this.memoryCache.delete(key);
        
      case CacheStrategy.REDIS_ONLY:
        return await this.redisCache.delete(key);
        
      case CacheStrategy.MEMORY_FIRST:
      case CacheStrategy.REDIS_FIRST:
        promises.push(this.memoryCache.delete(key));
        promises.push(this.redisCache.delete(key));
        
        const results = await Promise.allSettled(promises);
        return results.some(result => result.status === 'fulfilled' && result.value);
        
      default:
        return false;
    }
  }

  /**
   * 清空缓存
   */
  async clear() {
    const promises = [];
    
    switch (this.strategy) {
      case CacheStrategy.MEMORY_ONLY:
        return await this.memoryCache.clear();
        
      case CacheStrategy.REDIS_ONLY:
        return await this.redisCache.clear();
        
      case CacheStrategy.MEMORY_FIRST:
      case CacheStrategy.REDIS_FIRST:
        promises.push(this.memoryCache.clear());
        promises.push(this.redisCache.clear());
        
        await Promise.allSettled(promises);
        return true;
        
      default:
        return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const memoryStats = this.memoryCache.getStats();
    const redisStats = await this.redisCache.getStats();
    
    return {
      strategy: this.strategy,
      memory: memoryStats,
      redis: redisStats,
      combined: {
        totalHits: memoryStats.hits + redisStats.hits,
        totalMisses: memoryStats.misses + redisStats.misses,
        totalSets: memoryStats.sets + redisStats.sets,
        totalDeletes: memoryStats.deletes + redisStats.deletes,
        overallHitRate: (memoryStats.hits + redisStats.hits) / 
                       (memoryStats.hits + redisStats.hits + memoryStats.misses + redisStats.misses) || 0
      }
    };
  }

  /**
   * 销毁缓存服务
   */
  async destroy() {
    this.memoryCache.destroy();
    await this.redisCache.destroy();
  }
}

// 创建全局缓存服务实例
const cacheService = new CacheService({
  strategy: process.env.CACHE_STRATEGY || CacheStrategy.MEMORY_FIRST,
  defaultTTL: parseInt(process.env.CACHE_TTL) || 300,
  memory: {
    maxSize: parseInt(process.env.MEMORY_CACHE_SIZE) || 1000,
    defaultTTL: parseInt(process.env.MEMORY_CACHE_TTL) || 300
  },
  redis: {
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'testweb:',
    defaultTTL: parseInt(process.env.REDIS_CACHE_TTL) || 300
  }
});

module.exports = {
  CacheService,
  CacheStrategy,
  MemoryCache,
  RedisCache,
  cacheService
};
