/**
 * 简单缓存中间件
 * 提供基本的内存缓存功能
 */

const cache = new Map();

/**
 * API缓存中间件
 */
function apiCache(key, options = {}) {
  const { ttl = 300 } = options; // 默认5分钟TTL
  
  return (req, res, next) => {
    // 生成缓存键
    const cacheKey = `${key}_${req.originalUrl}_${JSON.stringify(req.body)}`;
    
    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      return res.json(cached.data);
    }
    
    // 拦截响应
    const originalJson = res.json;
    res.json = function(data) {
      // 缓存响应
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // 清理过期缓存
      cleanExpiredCache();
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * 数据库缓存中间件
 */
function dbCache(key, options = {}) {
  return apiCache(key, options);
}

/**
 * 清理过期缓存
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 3600000) { // 1小时后清理
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
    keys: Array.from(cache.keys())
  };
}

module.exports = {
  apiCache,
  dbCache,
  clearCache,
  getCacheStats
};
