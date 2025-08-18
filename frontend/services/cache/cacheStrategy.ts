/**
 * 统一缓存策略系统
 * 提供多层缓存、智能失效、性能优化
 * 版本: v1.0.0
 */

import type { ApiResponse  } from '../types/api';// ==================== 缓存配置类型 ==================== 
export interface CacheConfig     {
  ttl: number; // 生存时间（毫秒）
  maxSize: number; // 最大缓存条目数
  strategy: CacheStrategy;
  compression: boolean;
  encryption: boolean;
  persistToDisk: boolean;
  namespace: string;
}

export type CacheStrategy   = | 'lru' // 最近最少使用
  | 'lfu' // 最少使用频率
  | 'fifo' // 先进先出
  | 'ttl' // 基于时间;| 'adaptive'; // 自适应
export interface CacheEntry<T = any>     {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  metadata?: Record<string, any>;
}

export interface CacheStats     {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  averageAccessTime: number;
  memoryUsage: number;
}

// ==================== 缓存键生成器 ====================

export interface CacheKeyGenerator     {
  generate(namespace: string, identifier: string, params?: Record<string, any>): string;
}

export class DefaultCacheKeyGenerator implements CacheKeyGenerator {
  generate(namespace: string, identifier: string, params?: Record<string, any>): string {
    const baseKey = `${namespace}:${identifier}`;
    
    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }

    // 对参数进行排序以确保一致性
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join("&");

    return `${baseKey}:${this.hashString(sortedParams)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
}

// ==================== 缓存存储接口 ====================

export interface CacheStorage<T = any>     {
  get(key: string): Promise<CacheEntry<T> | null>;
  set(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

// ==================== 内存缓存存储 ====================

export class MemoryCacheStorage<T = any> implements CacheStorage<T> {
  private cache = new Map<string, CacheEntry<T>>();

  async get(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
    }
    return entry || null;
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  getEntries(): Map<string, CacheEntry<T>> {
    return this.cache;
  }
}

// ==================== 本地存储缓存 ====================

export class LocalStorageCacheStorage<T = any> implements CacheStorage<T> {
  private prefix: string;

  constructor(prefix: string = "cache') {
    this.prefix = prefix;
  }

  async get(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(this.getStorageKey(key));
      if (!item) return null;

      const entry: CacheEntry<T>  = JSON.parse(item);
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      
      // 更新访问信息
      await this.set(key, entry);
      
      return entry;
    } catch {
      return null;
    }
  }

  async set(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      // 存储空间不足时清理过期条目
      await this.cleanup();
      try {
        localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      } catch {
        // 如果仍然失败，忽略错误
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const storageKey = this.getStorageKey(key);
    const existed = localStorage.getItem(storageKey) !== null;
    localStorage.removeItem(storageKey);
    return existed;
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    keys.forEach(key => localStorage.removeItem(this.getStorageKey(key)));
  }

  async keys(): Promise<string[]> {
    const keys: string[]  = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.prefix}:`)) {
        keys.push(key.substring(this.prefix.length + 1));
      }
    }
    return keys;
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private async cleanup(): Promise<void> {
    const keys = await this.keys();
    const now = Date.now();
    
    for (const key of keys) {
      const entry = await this.get(key);
      if (entry && now - entry.timestamp > entry.ttl) {
        await this.delete(key);
      }
    }
  }
}

// ==================== 缓存驱逐策略 ====================

export interface EvictionStrategy<T = any>     {
  selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[];
}

export class LRUEvictionStrategy<T = any> implements EvictionStrategy<T> {
  selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const sortedEntries = Array.from(entries.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    return sortedEntries.slice(0, targetCount).map(([key]) => key);
  }
}

export class LFUEvictionStrategy<T = any> implements EvictionStrategy<T> {
  selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const sortedEntries = Array.from(entries.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount);
    
    return sortedEntries.slice(0, targetCount).map(([key]) => key);
  }
}

export class FIFOEvictionStrategy<T = any> implements EvictionStrategy<T> {
  selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const sortedEntries = Array.from(entries.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    return sortedEntries.slice(0, targetCount).map(([key]) => key);
  }
}

export class TTLEvictionStrategy<T = any> implements EvictionStrategy<T> {
  selectForEviction(entries: Map<string, CacheEntry<T>>, targetCount: number): string[] {
    const now = Date.now();
    const expiredEntries = Array.from(entries.entries())
      .filter(([, entry]) => now - entry.timestamp > entry.ttl)
      .map(([key]) => key);
    
    if (expiredEntries.length >= targetCount) {
      
        return expiredEntries.slice(0, targetCount);
      }
    
    // 如果过期条目不够，按剩余TTL排序
    const sortedByTTL = Array.from(entries.entries())
      .filter(([key]) => !expiredEntries.includes(key))
      .sort(([, a], [, b]) => {
        const aTTLRemaining = a.ttl - (now - a.timestamp);
        const bTTLRemaining = b.ttl - (now - b.timestamp);
        return aTTLRemaining - bTTLRemaining;
      })
      .map(([key]) => key);
    
    return [...expiredEntries, ...sortedByTTL.slice(0, targetCount - expiredEntries.length)];
  }
}

// ==================== 主缓存管理器 ====================

export class CacheManager<T = any> {
  private storage: CacheStorage<T>;
  private config: CacheConfig;
  private keyGenerator: CacheKeyGenerator;
  private evictionStrategy: EvictionStrategy<T>;
  private stats: CacheStats;

  constructor(
    storage: CacheStorage<T>,
    config: Partial<CacheConfig> = {},
    keyGenerator: CacheKeyGenerator = new DefaultCacheKeyGenerator()
  ) {
    this.storage = storage;
    this.config = {
      ttl: 300000, // 5分钟
      maxSize: 1000,
      strategy: "lru',
      compression: false,
      encryption: false,
      persistToDisk: false,
      namespace: 'default',
      ...config
    };
    this.keyGenerator = keyGenerator;
    this.evictionStrategy = this.createEvictionStrategy(this.config.strategy);
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    };

    // 定期清理过期条目
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }

  async get(identifier: string, params?: Record<string, any>): Promise<T | null> {
    const key = this.keyGenerator.generate(this.config.namespace, identifier, params);
    const startTime = Date.now();

    try {
      const entry = await this.storage.get(key);
      
      if (!entry) {
        
        this.stats.missCount++;
        return null;
      }

      // 检查是否过期
      if (this.isExpired(entry)) {
        await this.storage.delete(key);
        this.stats.missCount++;
        return null;
      }

      this.stats.hitCount++;
      this.updateStats();
      
      return entry.data;
    } finally {
      const accessTime = Date.now() - startTime;
      this.updateAverageAccessTime(accessTime);
    }
  }

  async set(
    identifier: string, 
    data: T, 
    params?: Record<string, any>,
    customTTL?: number
  ): Promise<void> {
    const key = this.keyGenerator.generate(this.config.namespace, identifier, params);
    const now = Date.now();
    const ttl = customTTL || this.config.ttl;

    const entry: CacheEntry<T>  = {
      key,
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
      size: this.calculateSize(data),
      compressed: this.config.compression,
      encrypted: this.config.encryption
    };
    // 检查是否需要驱逐
    await this.ensureCapacity();

    await this.storage.set(key, entry);
    await this.updateCacheStats();
  }

  async delete(identifier: string, params?: Record<string, any>): Promise<boolean> {
    const key = this.keyGenerator.generate(this.config.namespace, identifier, params);
    const result = await this.storage.delete(key);
    
    if (result) {
      await this.updateCacheStats();
    }
    
    return result;
  }

  async clear(): Promise<void> {
    await this.storage.clear();
    this.resetStats();
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.storage.keys();
    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of keys) {
      if (regex.test(key)) {
        await this.storage.delete(key);
        deletedCount++;
      }
    }

    await this.updateCacheStats();
    return deletedCount;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async getSize(): Promise<number> {
    return this.storage.size();
  }

  // ==================== 私有方法 ====================

  private createEvictionStrategy(strategy: CacheStrategy): EvictionStrategy<T> {
    switch (strategy) {
      case 'lru': 
        return new LRUEvictionStrategy<T>();
      case 'lfu': 
        return new LFUEvictionStrategy<T>();
      case 'fifo': 
        return new FIFOEvictionStrategy<T>();
      case 'ttl': 
        return new TTLEvictionStrategy<T>();
      case "adaptive': 
        // 自适应策略：根据访问模式动态选择
        return new LRUEvictionStrategy<T>(); // 默认使用LRU
      default: undefined, // 已修复
        return new LRUEvictionStrategy<T>();
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private async ensureCapacity(): Promise<void> {
    const currentSize = await this.storage.size();
    
    if (currentSize >= this.config.maxSize) {
      const targetEvictionCount = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // 驱逐10%
      await this.evictEntries(targetEvictionCount);
    }
  }

  private async evictEntries(count: number): Promise<void> {
    if (this.storage instanceof MemoryCacheStorage) {
      const entries = this.storage.getEntries();
      const keysToEvict = this.evictionStrategy.selectForEviction(entries, count);
      
      for (const key of keysToEvict) {
        await this.storage.delete(key);
        this.stats.evictionCount++;
      }
    } else {
      // 对于其他存储类型，使用简单的FIFO策略
      const keys = await this.storage.keys();
      const keysToEvict = keys.slice(0, count);
      
      for (const key of keysToEvict) {
        await this.storage.delete(key);
        this.stats.evictionCount++;
      }
    }
  }

  private async cleanup(): Promise<void> {
    const keys = await this.storage.keys();
    let cleanedCount = 0;

    for (const key of keys) {
      const entry = await this.storage.get(key);
      if (entry && this.isExpired(entry)) {
        await this.storage.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.updateCacheStats();
    }
  }

  private calculateSize(data: T): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private async updateCacheStats(): Promise<void> {
    this.stats.totalEntries = await this.storage.size();
    this.updateStats();
  }

  private updateStats(): void {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;
  }

  private updateAverageAccessTime(accessTime: number): void {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    if (totalRequests === 1) {
      this.stats.averageAccessTime = accessTime;
    } else {
      this.stats.averageAccessTime = 
        (this.stats.averageAccessTime * (totalRequests - 1) + accessTime) / totalRequests;
    }
  }

  private resetStats(): void {
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    };
  }
}

// ==================== 缓存装饰器 ====================

export function cached<T extends (...args: any[]) => Promise<ApiResponse<any>>>(
  cacheManager: CacheManager,
  options: {
    keyGenerator?: (args: Parameters<T>) => string;
    ttl?: number;
    condition?: (args: Parameters<T>) => boolean;
  } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const { keyGenerator, ttl, condition } = options;
      
      // 检查缓存条件
      if (condition && !condition(args)) {
        return originalMethod.apply(this, args);
      }

      // 生成缓存键
      const cacheKey = keyGenerator ? keyGenerator(args) : `${propertyKey}_${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cachedResult = await cacheManager.get(cacheKey);
      if (cachedResult) {
        
        return cachedResult;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);
      
      // 缓存结果（仅当成功时）
      if (result && result.success) {
        await cacheManager.set(cacheKey, result, undefined, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

// ==================== 默认缓存实例 ====================

export const defaultMemoryCache = new CacheManager(
  new MemoryCacheStorage(),
  {
    namespace: "memory',
    maxSize: 1000,
    ttl: 300000, // 5分钟
    strategy: 'lru
  }
);

export const defaultLocalStorageCache = new CacheManager(
  new LocalStorageCacheStorage('app-cache'),
  {
    namespace: 'localStorage',
    maxSize: 500,
    ttl: 3600000, // 1小时
    strategy: 'ttl',
    persistToDisk: true
  }
);

// ==================== 缓存工厂 ====================

export class CacheFactory {
  static createMemoryCache(config?: Partial<CacheConfig>): CacheManager {
    return new CacheManager(new MemoryCacheStorage(), {
      namespace: 'memory',
      strategy: 'lru',
      ...config
    });
  }

  static createLocalStorageCache(prefix?: string, config?: Partial<CacheConfig>): CacheManager {
    return new CacheManager(new LocalStorageCacheStorage(prefix), {
      namespace: 'localStorage',
      strategy: 'ttl',
      persistToDisk: true,
      ...config
    });
  }

  static createHybridCache(config?: Partial<CacheConfig>): {
    memory: CacheManager;
    localStorage: CacheManager;
  } {
    return {
      memory: this.createMemoryCache({ ttl: 60000, ...config }), // 1分钟
      localStorage: this.createLocalStorageCache('hybrid', { ttl: 3600000, ...config }) // 1小时
    };
  }
}
