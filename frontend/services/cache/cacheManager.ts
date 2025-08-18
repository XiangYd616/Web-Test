/**
 * 统一缓存管理服务
 * 提供本地存储、内存缓存和失效机制的完整解决方案
 * 版本: v2.0.0 - 完善的缓存策略和性能优化
 */

// 缓存配置接口
export interface CacheConfig     {
  defaultTTL: number; // 默认过期时间（秒）
  maxMemorySize: number; // 最大内存缓存大小（字节）
  enableLocalStorage: boolean; // 是否启用本地存储
  enableMemoryCache: boolean; // 是否启用内存缓存
  compressionThreshold: number; // 压缩阈值（字节）
  enableCompression: boolean; // 是否启用压缩
}

// 缓存项接口
export interface CacheItem<T = any>     {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
  compressed: boolean;
  accessCount: number;
  lastAccessed: number;
}

// 缓存策略枚举
export enum CacheStrategy {
  MEMORY_ONLY = 'memory_only',
  STORAGE_ONLY = 'storage_only',
  MEMORY_FIRST = 'memory_first',
  STORAGE_FIRST = 'storage_first',
  WRITE_THROUGH = 'write_through',
  WRITE_BACK = 'write_back'
}

// 缓存统计信息
export interface CacheStats     {
  memoryHits: number;
  memoryMisses: number;
  storageHits: number;
  storageMisses: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
  evictions: number;
}

// 默认配置
const DEFAULT_CONFIG: CacheConfig  = {
  defaultTTL: 3600, // 1小时
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  enableLocalStorage: true,
  enableMemoryCache: true,
  compressionThreshold: 1024, // 1KB
  enableCompression: true
};
export class CacheManager {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheItem> = new Map();
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    storageHits: 0,
    storageMisses: 0,
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    evictions: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * 设置缓存项
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    strategy: CacheStrategy = CacheStrategy.MEMORY_FIRST
  ): Promise<void> {
    const finalTTL = ttl || this.config.defaultTTL;
    const timestamp = Date.now();
    
    // 序列化和压缩数据
    const serialized = JSON.stringify(value);
    const size = new Blob([serialized]).size;
    
    let finalValue = serialized;
    let compressed = false;
    
    if (this.config.enableCompression && size > this.config.compressionThreshold) {
      try {
        finalValue = await this.compress(serialized);
        compressed = true;
      } catch (error) {
        console.warn('Compression failed, using uncompressed data: ', error);
      }
    }

    const cacheItem: CacheItem<string>  = {
      key,
      value: finalValue,
      timestamp,
      ttl: finalTTL,
      size,
      compressed,
      accessCount: 0,
      lastAccessed: timestamp
    };
    // 根据策略存储
    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        await this.setMemoryCache(key, cacheItem);
        break;
      case CacheStrategy.STORAGE_ONLY:
        await this.setStorageCache(key, cacheItem);
        break;
      case CacheStrategy.MEMORY_FIRST:
        await this.setMemoryCache(key, cacheItem);
        if (this.shouldPersist(cacheItem)) {
          await this.setStorageCache(key, cacheItem);
        }
        break;
      case CacheStrategy.STORAGE_FIRST:
        await this.setStorageCache(key, cacheItem);
        await this.setMemoryCache(key, cacheItem);
        break;
      case CacheStrategy.WRITE_THROUGH:
        await Promise.all([
          this.setMemoryCache(key, cacheItem),
          this.setStorageCache(key, cacheItem)
        ]);
        break;
    }

    this.updateStats();
  }

  /**
   * 获取缓存项
   */
  async get<T>(key: string, strategy: CacheStrategy = CacheStrategy.MEMORY_FIRST): Promise<T | null> {
    let cacheItem: CacheItem<string> | null = null;

    // 根据策略获取
    switch (strategy) {
      case CacheStrategy.MEMORY_ONLY:
        cacheItem = await this.getMemoryCache(key);
        break;
      case CacheStrategy.STORAGE_ONLY:
        cacheItem = await this.getStorageCache(key);
        break;
      case CacheStrategy.MEMORY_FIRST:
        cacheItem = await this.getMemoryCache(key);
        if (!cacheItem) {
          cacheItem = await this.getStorageCache(key);
          if (cacheItem) {
            // 将存储缓存提升到内存缓存
            await this.setMemoryCache(key, cacheItem);
          }
        }
        break;
      case CacheStrategy.STORAGE_FIRST:
        cacheItem = await this.getStorageCache(key);
        if (!cacheItem) {
          cacheItem = await this.getMemoryCache(key);
        }
        break;
    }

    if (!cacheItem) {
      
        return null;
      }

    // 检查是否过期
    if (this.isExpired(cacheItem)) {
      await this.delete(key);
      return null;
    }

    // 更新访问统计
    cacheItem.accessCount++;
    cacheItem.lastAccessed = Date.now();

    // 解压缩和反序列化
    let finalValue = cacheItem.value;
    if (cacheItem.compressed) {
      try {
        finalValue = await this.decompress(cacheItem.value);
      } catch (error) {
        console.error('Decompression failed: ', error);
        await this.delete(key);
        return null;
      }
    }

    try {
      return JSON.parse(finalValue) as T;
    } catch (error) {
      console.error('JSON parse failed: ', error);
      await this.delete(key);
      return null;
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key);
    const storageDeleted = await this.deleteStorageCache(key);
    
    this.updateStats();
    return memoryDeleted || storageDeleted;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.config.enableLocalStorage && typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
    this.resetStats();
  }

  /**
   * 检查缓存项是否存在
   */
  async has(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 设置内存缓存
   */
  private async setMemoryCache(key: string, item: CacheItem<string>): Promise<void> {
    if (!this.config.enableMemoryCache) return;

    // 检查内存限制
    if (this.getCurrentMemorySize() + item.size > this.config.maxMemorySize) {
      await this.evictLRU();
    }

    this.memoryCache.set(key, item);
  }

  /**
   * 获取内存缓存
   */
  private async getMemoryCache(key: string): Promise<CacheItem<string> | null> {
    if (!this.config.enableMemoryCache) {
      
        this.stats.memoryMisses++;
      return null;
      }

    const item = this.memoryCache.get(key);
    if (item) {
      
        this.stats.memoryHits++;
      return item;
      } else {
      this.stats.memoryMisses++;
      return null;
    }
  }

  /**
   * 设置本地存储缓存
   */
  private async setStorageCache(key: string, item: CacheItem<string>): Promise<void> {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') return;
    try {
      const storageKey = `cache_${key}`;
      localStorage.setItem(storageKey, JSON.stringify(item));
    } catch (error) {
      console.warn("Failed to set localStorage cache: ', error);'`
    }
  }

  /**
   * 获取本地存储缓存
   */
  private async getStorageCache(key: string): Promise<CacheItem<string> | null> {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
        this.stats.storageMisses++;
      return null;
      }

    try {
      const storageKey = `cache_${key}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        
        this.stats.storageHits++;
        return JSON.parse(stored) as CacheItem<string>;
      } else {
        this.stats.storageMisses++;
        return null;
      }
    } catch (error) {
      console.warn("Failed to get localStorage cache: ', error);'`
      this.stats.storageMisses++;
      return null;
    }
  }

  /**
   * 删除本地存储缓存
   */
  private async deleteStorageCache(key: string): Promise<boolean> {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') return false;
    try {
      const storageKey = `cache_${key}`;
      const existed = localStorage.getItem(storageKey) !== null;
      localStorage.removeItem(storageKey);
      return existed;
    } catch (error) {
      console.warn("Failed to delete localStorage cache: ', error);'`
      return false;
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl * 1000;
  }

  /**
   * 判断是否应该持久化到存储
   */
  private shouldPersist(item: CacheItem): boolean {
    // 大于1KB或TTL大于1小时的数据持久化
    return item.size > 1024 || item.ttl > 3600;
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemorySize(): number {
    let totalSize = 0;
    this.memoryCache.forEach(item => {
      totalSize += item.size;
    });
    return totalSize;
  }

  /**
   * LRU淘汰策略
   */
  private async evictLRU(): Promise<void> {
    if (this.memoryCache.size === 0) return;

    let oldestKey = ''
    let oldestTime = Date.now();

    this.memoryCache.forEach((item, key) => {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 压缩数据
   */
  private async compress(data: string): Promise<string> {
    // 简单的压缩实现，实际项目中可以使用更高效的压缩算法
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks: Uint8Array[]  = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone }  = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      chunks.forEach(chunk => {
        compressed.set(chunk, offset);
        offset += chunk.length;
      });
      
      return btoa(String.fromCharCode(...compressed));
    }
    
    // 降级方案：简单的字符串压缩
    return btoa(data);
  }

  /**
   * 解压缩数据
   */
  private async decompress(compressedData: string): Promise<string> {
    // 简单的解压缩实现
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks: Uint8Array[]  = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone }  = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        chunks.forEach(chunk => {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        });
        
        return new TextDecoder().decode(decompressed);
      } catch (error) {
        console.warn('Gzip decompression failed, trying base64:', error);
      }
    }
    
    // 降级方案：base64解码
    return atob(compressedData);
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.itemCount = this.memoryCache.size;
    this.stats.totalSize = this.getCurrentMemorySize();
    
    const totalRequests = this.stats.memoryHits + this.stats.memoryMisses + 
                         this.stats.storageHits + this.stats.storageMisses;
    const totalHits = this.stats.memoryHits + this.stats.storageHits;
    
    this.stats.hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      storageHits: 0,
      storageMisses: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      evictions: 0
    };
  }

  /**
   * 启动清理定时器
   */
  private startCleanupInterval(): void {
    // 每5分钟清理一次过期项
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * 清理过期项
   */
  private async cleanupExpired(): Promise<void> {
    const expiredKeys: string[]  = [];
    this.memoryCache.forEach((item, key) => {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    });
    
    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
  }
}

// 创建默认实例
export const cacheManager = new CacheManager();
