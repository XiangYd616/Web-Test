/**
    * API缓存管理器
    * 提供智能的API响应缓存功能
    */

    export interface CacheEntry     {
      data: any;
    timestamp: number;
    ttl: number;
    hits: number;
    lastAccessed: number;
}

    export interface CacheConfig     {
      defaultTTL: number;
    maxSize: number;
    enableCompression: boolean;
}

    class ApiCacheManager {
      private cache = new Map<string, CacheEntry>();
    private config: CacheConfig = {
      defaultTTL: 300000, // 5分钟
    maxSize: 1000,
    enableCompression: false
  };

    constructor(config?: Partial<CacheConfig>) {
    if (config) {
        this.config = { ...this.config, ...config };
    }
  }

      /**
       * 设置缓存
       */
      set(key: string, data: any, ttl?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
        this.evictLeastRecentlyUsed();
    }

      const entry: CacheEntry  = {
        data: this.config.enableCompression ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
      lastAccessed: Date.now()
    };
      this.cache.set(key, entry);
  }

      /**
       * 获取缓存
       */
      get(key: string): any | null {
    const entry = this.cache.get(key);
      if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      return null;
    }

      // 更新访问统计
      entry.hits++;
      entry.lastAccessed = Date.now();

      return this.config.enableCompression ? this.decompress(entry.data) : entry.data;
  }

      /**
       * 检查缓存是否存在且有效
       */
      has(key: string): boolean {
    const entry = this.cache.get(key);
      if (!entry) {
      return false;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      return false;
    }

      return true;
  }

      /**
       * 删除缓存
       */
      delete(key: string): boolean {
    return this.cache.delete(key);
  }

      /**
       * 清空所有缓存
       */
      clear(): void {
        this.cache.clear();
  }

      /**
       * 获取缓存统计
       */
      getStats(): {
        size: number;
      hitRate: number;
      totalHits: number;
      totalEntries: number;
      memoryUsage: number;
  } {
        let totalHits = 0;
      let totalEntries = this.cache.size;

      for (const entry of this.cache.values()) {
        totalHits += entry.hits;
    }

      return {
        size: this.cache.size,
      hitRate: totalEntries > 0 ? (totalHits / totalEntries) : 0,
      totalHits,
      totalEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

      /**
       * 清理过期缓存
       */
      cleanup(): number {
        let cleaned = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      cleaned++;
      }
    }

      return cleaned;
  }

      /**
       * 驱逐最少使用的缓存项
       */
      private evictLeastRecentlyUsed(): void {
        let lruKey: string | null = null;
      let lruTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
      lruKey = key;
      }
    }

      if (lruKey) {
        this.cache.delete(lruKey);
    }
  }

      /**
       * 压缩数据（简单实现）
       */
      private compress(data: any): string {
    return JSON.stringify(data);
  }

      /**
       * 解压数据
       */
      private decompress(data: string): any {
    return JSON.parse(data);
  }

      /**
       * 估算内存使用量
       */
      private estimateMemoryUsage(): number {
        let size = 0;
      for (const [key, entry] of this.cache.entries()) {
        size += key.length * 2; // 字符串按2字节计算
      size += JSON.stringify(entry).length * 2;
    }
      return size;
  }

      /**
       * 生成缓存键
       */
      static generateKey(url: string, method: string = 'GET', params?: any): string {
    const paramStr = params ? JSON.stringify(params) : ''
      return `${method}:${url}:${paramStr}`;
  }
}

      export const apiCacheManager = new ApiCacheManager();
      export default apiCacheManager;