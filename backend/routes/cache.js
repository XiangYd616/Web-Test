/**
 * 缓存中间件
 * 提供路由级别的缓存功能
 */

// 简单的内存缓存实现
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = 300) {
    // 清除现有的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
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

  get(key) {
    return this.cache.get(key);
  }

  del(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
    });
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  flushAll() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  getStats() {
    return {
      keys: this.cache.size,
      hits: 0, // 简化实现
      misses: 0
    };
  }
}

// 创建缓存实例
const cache = new SimpleCache();

/**
 * 创建缓存中间件
 * @param {number} ttl - 缓存时间（秒）
 * @param {function} keyGenerator - 缓存键生成函数
 * @returns {function} Express中间件
 */
function createCacheMiddleware(ttl = 300, keyGenerator = null) {
  return (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    // 生成缓存键
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `${req.originalUrl || req.url}`;

    // 尝试从缓存获取数据
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // 重写res.json方法以缓存响应
    const originalJson = res.json;
    res.json = function (data) {
      // 只缓存成功的响应
      if (res.statusCode === 200 && data) {
        cache.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 清除特定模式的缓存
 * @param {string} pattern - 缓存键模式
 */
function clearCacheByPattern(pattern) {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  cache.del(matchingKeys);
}

/**
 * 清除所有缓存
 */
function clearAllCache() {
  cache.flushAll();
}

/**
 * 获取缓存统计信息
 * @returns {object} 缓存统计
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * 手动设置缓存
 * @param {string} key - 缓存键
 * @param {any} value - 缓存值
 * @param {number} ttl - 过期时间
 */
function setCache(key, value, ttl = 300) {
  cache.set(key, value, ttl);
}

/**
 * 手动获取缓存
 * @param {string} key - 缓存键
 * @returns {any} 缓存值
 */
function getCache(key) {
  return cache.get(key);
}

/**
 * 删除特定缓存
 * @param {string} key - 缓存键
 */
function deleteCache(key) {
  cache.del(key);
}

// 默认缓存中间件（5分钟）
const defaultCacheMiddleware = createCacheMiddleware(300);

// 短期缓存中间件（1分钟）
const shortCacheMiddleware = createCacheMiddleware(60);

// 长期缓存中间件（1小时）
const longCacheMiddleware = createCacheMiddleware(3600);

// 测试结果缓存中间件（10分钟）
const testResultCacheMiddleware = createCacheMiddleware(600, (req) => {
  return `test_result_${req.params.id || req.query.id || req.originalUrl}`;
});

// 用户数据缓存中间件（5分钟）
const userDataCacheMiddleware = createCacheMiddleware(300, (req) => {
  const userId = req.user?.id || 'anonymous';
  return `user_data_${userId}_${req.originalUrl}`;
});

/**
 * API缓存中间件工厂
 * @param {string} type - 缓存类型
 * @param {object} options - 缓存选项
 * @returns {function} 缓存中间件
 */
function apiCache(type, options = {}) {
  const ttl = options.ttl || 300;
  return createCacheMiddleware(ttl, (req) => {
    return `api_${type}_${req.originalUrl}_${JSON.stringify(req.body || {})}`;
  });
}

/**
 * 数据库缓存中间件工厂
 * @param {string} type - 缓存类型
 * @param {object} options - 缓存选项
 * @returns {function} 缓存中间件
 */
function dbCache(type, options = {}) {
  const ttl = options.ttl || 600; // 默认10分钟
  return createCacheMiddleware(ttl, (req) => {
    return `db_${type}_${req.originalUrl}_${JSON.stringify(req.query || {})}`;
  });
}

module.exports = {
  cache,
  createCacheMiddleware,
  clearCacheByPattern,
  clearAllCache,
  getCacheStats,
  setCache,
  getCache,
  deleteCache,
  apiCache,
  dbCache,

  // 预定义的中间件
  defaultCacheMiddleware,
  shortCacheMiddleware,
  longCacheMiddleware,
  testResultCacheMiddleware,
  userDataCacheMiddleware
};
