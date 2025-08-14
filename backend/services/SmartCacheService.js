const Redis = require('redis');
const crypto = require('crypto');

/**
 * 智能缓存服务
 * 提供智能缓存策略、缓存失效机制和缓存命中率优化
 */
class SmartCacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new Map(); // 内存缓存作为备用
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    this.cacheStrategies = new Map(); // 缓存策略配置
    this.isRedisAvailable = false;
  }

  /**
   * 初始化缓存服务
   */
  async initialize() {
    console.log('🚀 初始化智能缓存服务...');

    // 尝试连接Redis
    await this.initializeRedis();

    // 设置默认缓存策略
    this.setupDefaultStrategies();

    // 启动缓存清理任务
    this.startCleanupTasks();

    console.log(`✅ 智能缓存服务初始化完成 (Redis: ${this.isRedisAvailable ? '可用' : '不可用'})`);
  }

  /**
   * 初始化Redis连接
   */
  async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = Redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.warn('⚠️ Redis连接被拒绝，使用内存缓存');
            return undefined; // 停止重试
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.warn('⚠️ Redis重试超时，使用内存缓存');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis错误:', err.message);
        this.isRedisAvailable = false;
        this.cacheStats.errors++;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis连接成功');
        this.isRedisAvailable = true;
      });

      this.redis.on('disconnect', () => {
        console.warn('⚠️ Redis连接断开，切换到内存缓存');
        this.isRedisAvailable = false;
      });

      await this.redis.connect();
      this.isRedisAvailable = true;

    } catch (error) {
      console.warn('⚠️ Redis初始化失败，使用内存缓存:', error.message);
      this.isRedisAvailable = false;
    }
  }

  /**
   * 设置默认缓存策略
   */
  setupDefaultStrategies() {
    // 测试结果缓存策略
    this.cacheStrategies.set('test_result', {
      ttl: 24 * 60 * 60, // 24小时
      maxSize: 1000,
      invalidateOn: ['test_update', 'test_delete'],
      compression: true
    });

    // 配置模板缓存策略
    this.cacheStrategies.set('config_template', {
      ttl: 60 * 60, // 1小时
      maxSize: 100,
      invalidateOn: ['template_update', 'template_delete'],
      compression: false
    });

    // API响应缓存策略
    this.cacheStrategies.set('api_response', {
      ttl: 5 * 60, // 5分钟
      maxSize: 500,
      invalidateOn: ['api_change'],
      compression: true
    });

    // 用户会话缓存策略
    this.cacheStrategies.set('user_session', {
      ttl: 30 * 60, // 30分钟
      maxSize: 10000,
      invalidateOn: ['user_logout'],
      compression: false
    });

    // 系统统计缓存策略
    this.cacheStrategies.set('system_stats', {
      ttl: 60, // 1分钟
      maxSize: 50,
      invalidateOn: ['stats_update'],
      compression: false
    });
  }

  /**
   * 获取缓存
   */
  async get(key, category = 'default') {
    try {
      const fullKey = this.buildKey(key, category);
      let value = null;

      // 优先从Redis获取
      if (this.isRedisAvailable) {
        try {
          value = await this.redis.get(fullKey);
          if (value) {
            value = this.deserializeValue(value, category);
            this.cacheStats.hits++;
            return value;
          }
        } catch (error) {
          console.warn('Redis获取失败，尝试内存缓存:', error.message);
          this.isRedisAvailable = false;
        }
      }

      // 从内存缓存获取
      const memoryItem = this.memoryCache.get(fullKey);
      if (memoryItem && !this.isExpired(memoryItem)) {
        this.cacheStats.hits++;
        return memoryItem.value;
      }

      // 缓存未命中
      this.cacheStats.misses++;
      return null;

    } catch (error) {
      console.error('缓存获取失败:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, category = 'default', customTtl = null) {
    try {
      const fullKey = this.buildKey(key, category);
      const strategy = this.cacheStrategies.get(category) || this.cacheStrategies.get('default');
      const ttl = customTtl || strategy?.ttl || 300; // 默认5分钟

      // 设置到Redis
      if (this.isRedisAvailable) {
        try {
          const serializedValue = this.serializeValue(value, category);
          await this.redis.setEx(fullKey, ttl, serializedValue);
        } catch (error) {
          console.warn('Redis设置失败，使用内存缓存:', error.message);
          this.isRedisAvailable = false;
        }
      }

      // 设置到内存缓存
      this.memoryCache.set(fullKey, {
        value,
        expiredAt: Date.now() + (ttl * 1000),
        category
      });

      // 检查内存缓存大小限制
      this.enforceMemoryCacheLimit(category);

      this.cacheStats.sets++;
      return true;

    } catch (error) {
      console.error('缓存设置失败:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key, category = 'default') {
    try {
      const fullKey = this.buildKey(key, category);

      // 从Redis删除
      if (this.isRedisAvailable) {
        try {
          await this.redis.del(fullKey);
        } catch (error) {
          console.warn('Redis删除失败:', error.message);
        }
      }

      // 从内存缓存删除
      this.memoryCache.delete(fullKey);

      this.cacheStats.deletes++;
      return true;

    } catch (error) {
      console.error('缓存删除失败:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern, category = 'default') {
    try {
      const fullPattern = this.buildKey(pattern, category);
      let deletedCount = 0;

      // 从Redis批量删除
      if (this.isRedisAvailable) {
        try {
          const keys = await this.redis.keys(fullPattern);
          if (keys.length > 0) {
            await this.redis.del(keys);
            deletedCount += keys.length;
          }
        } catch (error) {
          console.warn('Redis批量删除失败:', error.message);
        }
      }

      // 从内存缓存批量删除
      const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));
      for (const [key] of this.memoryCache) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      this.cacheStats.deletes += deletedCount;
      return deletedCount;

    } catch (error) {
      console.error('批量删除缓存失败:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * 缓存失效
   */
  async invalidate(event, data = {}) {
    try {
      let invalidatedCount = 0;

      for (const [category, strategy] of this.cacheStrategies) {
        if (strategy.invalidateOn && strategy.invalidateOn.includes(event)) {
          const pattern = `${category}:*`;
          const count = await this.deletePattern(pattern);
          invalidatedCount += count;
          console.log(`🗑️ 缓存失效: ${event} -> ${category} (${count}条)`);
        }
      }

      return invalidatedCount;

    } catch (error) {
      console.error('缓存失效失败:', error);
      return 0;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet(key, fetchFunction, category = 'default', customTtl = null) {
    try {
      // 尝试获取缓存
      let value = await this.get(key, category);
      
      if (value !== null) {
        return value;
      }

      // 缓存未命中，执行获取函数
      value = await fetchFunction();
      
      if (value !== null && value !== undefined) {
        await this.set(key, value, category, customTtl);
      }

      return value;

    } catch (error) {
      console.error('getOrSet失败:', error);
      // 如果缓存操作失败，直接执行获取函数
      return await fetchFunction();
    }
  }

  /**
   * 构建缓存键
   */
  buildKey(key, category) {
    return `testweb:${category}:${key}`;
  }

  /**
   * 序列化值
   */
  serializeValue(value, category) {
    const strategy = this.cacheStrategies.get(category);
    let serialized = JSON.stringify(value);

    if (strategy?.compression && serialized.length > 1000) {
      // 简单的压缩标记，实际项目中可以使用真正的压缩算法
      serialized = `COMPRESSED:${serialized}`;
    }

    return serialized;
  }

  /**
   * 反序列化值
   */
  deserializeValue(serialized, category) {
    if (serialized.startsWith('COMPRESSED:')) {
      serialized = serialized.substring(11);
    }

    return JSON.parse(serialized);
  }

  /**
   * 检查是否过期
   */
  isExpired(item) {
    return Date.now() > item.expiredAt;
  }

  /**
   * 强制执行内存缓存限制
   */
  enforceMemoryCacheLimit(category) {
    const strategy = this.cacheStrategies.get(category);
    if (!strategy?.maxSize) return;

    const categoryItems = Array.from(this.memoryCache.entries())
      .filter(([key, item]) => item.category === category);

    if (categoryItems.length > strategy.maxSize) {
      // 删除最旧的项目
      categoryItems
        .sort((a, b) => a[1].expiredAt - b[1].expiredAt)
        .slice(0, categoryItems.length - strategy.maxSize)
        .forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * 启动清理任务
   */
  startCleanupTasks() {
    // 每5分钟清理过期的内存缓存
    setInterval(() => {
      this.cleanupExpiredMemoryCache();
    }, 5 * 60 * 1000);

    // 每小时重置统计信息
    setInterval(() => {
      this.resetStats();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理过期的内存缓存
   */
  cleanupExpiredMemoryCache() {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.memoryCache) {
      if (now > item.expiredAt) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理过期内存缓存: ${cleanedCount}条`);
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
    console.log(`📊 缓存统计 - 命中率: ${hitRate.toFixed(2)}%, 命中: ${this.cacheStats.hits}, 未命中: ${this.cacheStats.misses}`);
    
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0;
    
    return {
      ...this.cacheStats,
      hitRate: parseFloat(hitRate.toFixed(2)),
      memorySize: this.memoryCache.size,
      redisAvailable: this.isRedisAvailable,
      strategies: Array.from(this.cacheStrategies.keys())
    };
  }

  /**
   * 清空所有缓存
   */
  async flush() {
    try {
      // 清空Redis
      if (this.isRedisAvailable) {
        await this.redis.flushDb();
      }

      // 清空内存缓存
      this.memoryCache.clear();

      console.log('🧹 所有缓存已清空');
      return true;

    } catch (error) {
      console.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * 关闭缓存服务
   */
  async close() {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.memoryCache.clear();
      console.log('✅ 缓存服务已关闭');
    } catch (error) {
      console.error('❌ 关闭缓存服务失败:', error);
    }
  }
}

// 创建单例实例
const smartCacheService = new SmartCacheService();

module.exports = smartCacheService;
