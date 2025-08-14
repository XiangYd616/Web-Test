/**
 * 高级缓存管理器
 * 提供多层缓存、智能失效、性能监控等功能
 */

const Logger = require('./logger');

class CacheManager {
  constructor(options = {}) {
    this.options = {
      defaultTTL: 300000, // 5分钟
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 60000, // 1分钟
      enableMetrics: true,
      enableCompression: false,
      ...options
    };

    // 多层缓存存储
    this.memoryCache = new Map();
    this.lruCache = new Map();
    this.persistentCache = new Map();

    // 缓存统计
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      totalRequests: 0
    };

    // 缓存策略配置
    this.strategies = {
      memory: {
        maxSize: 1000,
        ttl: this.options.defaultTTL
      },
      lru: {
        maxSize: 5000,
        ttl: this.options.defaultTTL * 2
      },
      persistent: {
        maxSize: 10000,
        ttl: this.options.defaultTTL * 5
      }
    };

    // 启动清理任务
    this.startCleanupTask();
  }

  /**
   * 获取缓存值
   */
  async get(key, options = {}) {
    const {
      strategy = 'auto',
      updateTTL = false
    } = options;

    this.metrics.totalRequests++;

    try {
      let result = null;
      let hitLevel = null;

      // 按优先级检查各层缓存
      if (strategy === 'auto' || strategy === 'memory') {
        result = this.getFromMemory(key, updateTTL);
        if (result !== null) {
          hitLevel = 'memory';
        }
      }

      if (result === null && (strategy === 'auto' || strategy === 'lru')) {
        result = this.getFromLRU(key, updateTTL);
        if (result !== null) {
          hitLevel = 'lru';
          // 提升到内存缓存
          this.setToMemory(key, result.data, result.ttl);
        }
      }

      if (result === null && (strategy === 'auto' || strategy === 'persistent')) {
        result = this.getFromPersistent(key, updateTTL);
        if (result !== null) {
          hitLevel = 'persistent';
          // 提升到LRU缓存
          this.setToLRU(key, result.data, result.ttl);
        }
      }

      if (result !== null) {
        this.metrics.hits++;
        this.recordCacheHit(key, hitLevel);
        return result.data;
      } else {
        this.metrics.misses++;
        return null;
      }

    } catch (error) {
      Logger.error('Cache get error', error, { key });
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key, value, options = {}) {
    const {
      ttl = this.options.defaultTTL,
      strategy = 'auto',
      priority = 'normal'
    } = options;

    this.metrics.sets++;

    try {
      const cacheItem = {
        data: value,
        ttl: Date.now() + ttl,
        priority,
        size: this.calculateSize(value),
        createdAt: Date.now(),
        accessCount: 0
      };

      // 根据策略和优先级决定存储位置
      if (strategy === 'auto') {
        this.autoPlaceCache(key, cacheItem);
      } else {
        this.placeInStrategy(key, cacheItem, strategy);
      }

      this.updateMemoryUsage();
      return true;

    } catch (error) {
      Logger.error('Cache set error', error, { key });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key) {
    this.metrics.deletes++;

    let deleted = false;
    
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
      deleted = true;
    }
    
    if (this.lruCache.has(key)) {
      this.lruCache.delete(key);
      deleted = true;
    }
    
    if (this.persistentCache.has(key)) {
      this.persistentCache.delete(key);
      deleted = true;
    }

    this.updateMemoryUsage();
    return deleted;
  }

  /**
   * 批量操作
   */
  async mget(keys) {
    const results = {};
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== null) {
        results[key] = value;
      }
    });

    await Promise.all(promises);
    return results;
  }

  async mset(items, options = {}) {
    const promises = Object.entries(items).map(([key, value]) => 
      this.set(key, value, options)
    );

    const results = await Promise.all(promises);
    return results.every(result => result === true);
  }

  /**
   * 缓存失效模式
   */
  async invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    // 收集匹配的键
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of this.lruCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of this.persistentCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // 删除匹配的键
    const deletePromises = keysToDelete.map(key => this.delete(key));
    await Promise.all(deletePromises);

    Logger.info('Cache pattern invalidation', { 
      pattern, 
      deletedKeys: keysToDelete.length 
    });

    return keysToDelete.length;
  }

  /**
   * 智能缓存放置
   */
  autoPlaceCache(key, cacheItem) {
    const { size, priority } = cacheItem;

    // 高优先级或小数据放入内存缓存
    if (priority === 'high' || size < 1024) {
      this.setToMemory(key, cacheItem.data, cacheItem.ttl);
    }
    // 中等数据放入LRU缓存
    else if (size < 10240) {
      this.setToLRU(key, cacheItem.data, cacheItem.ttl);
    }
    // 大数据放入持久缓存
    else {
      this.setToPersistent(key, cacheItem.data, cacheItem.ttl);
    }
  }

  /**
   * 内存缓存操作
   */
  getFromMemory(key, updateTTL = false) {
    const item = this.memoryCache.get(key);
    if (item && Date.now() < item.ttl) {
      if (updateTTL) {
        item.ttl = Date.now() + this.strategies.memory.ttl;
      }
      item.accessCount++;
      return item;
    }
    if (item) {
      this.memoryCache.delete(key);
    }
    return null;
  }

  setToMemory(key, data, ttl) {
    // 检查容量限制
    if (this.memoryCache.size >= this.strategies.memory.maxSize) {
      this.evictFromMemory();
    }

    this.memoryCache.set(key, {
      data,
      ttl,
      accessCount: 0,
      createdAt: Date.now()
    });
  }

  /**
   * LRU缓存操作
   */
  getFromLRU(key, updateTTL = false) {
    const item = this.lruCache.get(key);
    if (item && Date.now() < item.ttl) {
      // LRU: 移到末尾
      this.lruCache.delete(key);
      this.lruCache.set(key, item);
      
      if (updateTTL) {
        item.ttl = Date.now() + this.strategies.lru.ttl;
      }
      item.accessCount++;
      return item;
    }
    if (item) {
      this.lruCache.delete(key);
    }
    return null;
  }

  setToLRU(key, data, ttl) {
    // 检查容量限制
    if (this.lruCache.size >= this.strategies.lru.maxSize) {
      this.evictFromLRU();
    }

    this.lruCache.set(key, {
      data,
      ttl,
      accessCount: 0,
      createdAt: Date.now()
    });
  }

  /**
   * 持久缓存操作
   */
  getFromPersistent(key, updateTTL = false) {
    const item = this.persistentCache.get(key);
    if (item && Date.now() < item.ttl) {
      if (updateTTL) {
        item.ttl = Date.now() + this.strategies.persistent.ttl;
      }
      item.accessCount++;
      return item;
    }
    if (item) {
      this.persistentCache.delete(key);
    }
    return null;
  }

  setToPersistent(key, data, ttl) {
    // 检查容量限制
    if (this.persistentCache.size >= this.strategies.persistent.maxSize) {
      this.evictFromPersistent();
    }

    this.persistentCache.set(key, {
      data,
      ttl,
      accessCount: 0,
      createdAt: Date.now()
    });
  }

  /**
   * 缓存驱逐策略
   */
  evictFromMemory() {
    // 驱逐最旧的项
    const firstKey = this.memoryCache.keys().next().value;
    if (firstKey) {
      this.memoryCache.delete(firstKey);
      this.metrics.evictions++;
    }
  }

  evictFromLRU() {
    // LRU: 驱逐最少使用的项（第一个）
    const firstKey = this.lruCache.keys().next().value;
    if (firstKey) {
      this.lruCache.delete(firstKey);
      this.metrics.evictions++;
    }
  }

  evictFromPersistent() {
    // 驱逐访问次数最少的项
    let minAccessKey = null;
    let minAccessCount = Infinity;

    for (const [key, item] of this.persistentCache.entries()) {
      if (item.accessCount < minAccessCount) {
        minAccessCount = item.accessCount;
        minAccessKey = key;
      }
    }

    if (minAccessKey) {
      this.persistentCache.delete(minAccessKey);
      this.metrics.evictions++;
    }
  }

  /**
   * 清理过期项
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    // 清理内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (now >= item.ttl) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // 清理LRU缓存
    for (const [key, item] of this.lruCache.entries()) {
      if (now >= item.ttl) {
        this.lruCache.delete(key);
        cleanedCount++;
      }
    }

    // 清理持久缓存
    for (const [key, item] of this.persistentCache.entries()) {
      if (now >= item.ttl) {
        this.persistentCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      Logger.debug('Cache cleanup completed', { cleanedCount });
      this.updateMemoryUsage();
    }

    return cleanedCount;
  }

  /**
   * 启动清理任务
   */
  startCleanupTask() {
    setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * 计算数据大小
   */
  calculateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // 粗略估算
    } catch {
      return 1024; // 默认1KB
    }
  }

  /**
   * 更新内存使用统计
   */
  updateMemoryUsage() {
    let totalSize = 0;
    
    for (const item of this.memoryCache.values()) {
      totalSize += this.calculateSize(item.data);
    }
    
    for (const item of this.lruCache.values()) {
      totalSize += this.calculateSize(item.data);
    }
    
    for (const item of this.persistentCache.values()) {
      totalSize += this.calculateSize(item.data);
    }

    this.metrics.memoryUsage = totalSize;
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(key, level) {
    if (this.options.enableMetrics) {
      Logger.debug('Cache hit', { key, level });
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const hitRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      cacheSize: {
        memory: this.memoryCache.size,
        lru: this.lruCache.size,
        persistent: this.persistentCache.size,
        total: this.memoryCache.size + this.lruCache.size + this.persistentCache.size
      },
      memoryUsage: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
    };
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.memoryCache.clear();
    this.lruCache.clear();
    this.persistentCache.clear();
    this.updateMemoryUsage();
    
    Logger.info('All caches cleared');
  }
}

// 创建全局实例
const cacheManager = new CacheManager();

module.exports = {
  CacheManager,
  cacheManager,
  
  // 便捷方法
  get: (key, options) => cacheManager.get(key, options),
  set: (key, value, options) => cacheManager.set(key, value, options),
  delete: (key) => cacheManager.delete(key),
  mget: (keys) => cacheManager.mget(keys),
  mset: (items, options) => cacheManager.mset(items, options),
  invalidatePattern: (pattern) => cacheManager.invalidatePattern(pattern),
  getStats: () => cacheManager.getStats(),
  clear: () => cacheManager.clear()
};
