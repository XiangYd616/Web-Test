/**
 * 缓存管理器
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl = 3600000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

const cacheManager = new CacheManager();
module.exports = cacheManager;
