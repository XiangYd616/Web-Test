/**
 * 缓存管理器
 */

type CacheEntry<T = unknown> = {
  value: T;
  expires: number;
};

class CacheManager {
  private cache = new Map<string, CacheEntry>();

  get<T = unknown>(key: string) {
    return this.cache.get(key) as CacheEntry<T> | undefined;
  }

  set<T = unknown>(key: string, value: T, ttl = 3600000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  delete(key: string) {
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

export default cacheManager;

module.exports = cacheManager;
