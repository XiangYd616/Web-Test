/**
 * 智能缓存管理器
 * 基于使用模式和优先级的智能缓存策略
 */

export interface CacheEntry<T = any>     {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'high' | 'medium' | 'low
  size: number;
  tags: string[];
}

export interface CacheStrategy     {
  name: string;
  maxSize: number;
  defaultTTL: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'priority
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

class SmartCacheManager {
  private cache = new Map<string, CacheEntry>();
  private strategies = new Map<string, CacheStrategy>();
  private totalSize = 0;
  private maxTotalSize = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.initializeStrategies();
    this.startCleanupInterval();
  }

  /**
   * 初始化缓存策略
   */
  private initializeStrategies() {
    // API响应缓存策略
    this.strategies.set('api', {
      name: 'api',
      maxSize: 10 * 1024 * 1024, // 10MB
      defaultTTL: 5 * 60 * 1000,  // 5分钟
      evictionPolicy: 'lru',
      compressionEnabled: true,
      persistToDisk: false
    });

    // 静态资源缓存策略
    this.strategies.set('static', {
      name: 'static',
      maxSize: 20 * 1024 * 1024, // 20MB
      defaultTTL: 24 * 60 * 60 * 1000, // 24小时
      evictionPolicy: 'lfu',
      compressionEnabled: false,
      persistToDisk: true
    });

    // 组件缓存策略
    this.strategies.set('component', {
      name: 'component',
      maxSize: 5 * 1024 * 1024, // 5MB
      defaultTTL: 60 * 60 * 1000, // 1小时
      evictionPolicy: 'priority',
      compressionEnabled: true,
      persistToDisk: false
    });

    // 用户数据缓存策略
    this.strategies.set('user', {
      name: 'user',
      maxSize: 2 * 1024 * 1024, // 2MB
      defaultTTL: 30 * 60 * 1000, // 30分钟
      evictionPolicy: 'ttl',
      compressionEnabled: true,
      persistToDisk: true
    });
  }

  /**
   * 设置缓存
   */
  set<T>(
    key: string,
    data: T,
    options: {
      strategy?: string;
      ttl?: number;
      priority?: 'high' | 'medium' | 'low
      tags?: string[];
    } = {}
  ): void {
    const {
      strategy = 'api',
      ttl,
      priority = 'medium',
      tags = []
    } = options;

    const strategyConfig = this.strategies.get(strategy);
    if (!strategyConfig) {
      throw new Error(`Unknown cache strategy: ${strategy}`);
    }

    const size = this.calculateSize(data);
    const entry: CacheEntry<T>  = {
      data: strategyConfig.compressionEnabled ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl: ttl || strategyConfig.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      priority,
      size,
      tags: [...tags, strategy]
    };
    // 检查是否需要清理空间
    if (this.totalSize + size > this.maxTotalSize) {
      this.evictEntries(size);
    }

    this.cache.set(key, entry);
    this.totalSize += size;

    // 持久化到磁盘（如果策略要求）
    if (strategyConfig.persistToDisk) {
      this.persistToDisk(key, entry);
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // 解压缩数据（如果需要）
    const data = this.isCompressed(entry.data) ? this.decompress(entry.data) : entry.data;
    return data as T;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
      this.removeFromDisk(key);
      return true;
    }
    return false;
  }

  /**
   * 根据标签清除缓存
   */
  clearByTag(tag: string): number {
    let cleared = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    strategies: Record<string, any>;
  } {
    const strategies: Record<string, any>  = {};
    for (const [strategyName, strategy] of this.strategies.entries()) {
      const entries = Array.from(this.cache.values()).filter(entry =>
        entry.tags.includes(strategyName)
      );

      strategies[strategyName] = {
        entries: entries.length,
        size: entries.reduce((sum, entry) => sum + entry.size, 0),
        avgAccessCount: entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length || 0
      };
    }

    return {
      totalEntries: this.cache.size,
      totalSize: this.totalSize,
      hitRate: this.calculateHitRate(),
      strategies
    };
  }

  /**
   * 驱逐缓存条目
   */
  private evictEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());

    // 根据策略排序
    entries.sort(([, a], [, b]) => {
      // 优先级排序
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // LRU排序
      return a.lastAccessed - b.lastAccessed;
    });

    let freedSpace = 0;
    for (const [key] of entries) {
      if (freedSpace >= requiredSpace) break;

      const entry = this.cache.get(key);
      if (entry) {
        freedSpace += entry.size;
        this.delete(key);
      }
    }
  }

  /**
   * 计算数据大小
   */
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // 粗略估计
  }

  /**
   * 压缩数据
   */
  private compress(data: any): string {
    // 简单的JSON压缩，实际应用中可以使用更高效的压缩算法
    return JSON.stringify(data);
  }

  /**
   * 解压缩数据
   */
  private decompress(data: string): any {
    return JSON.parse(data);
  }

  /**
   * 检查数据是否被压缩
   */
  private isCompressed(data: any): boolean {
    return typeof data === "string";
  }

  /**
   * 持久化到磁盘
   */
  private persistToDisk(key: string, entry: CacheEntry): void {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn("Failed to persist cache to disk: ', error);
    }
  }

  /**
   * 从磁盘移除
   */
  private removeFromDisk(key: string): void {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn("Failed to remove cache from disk:', error);
    }
  }

  /**
   * 计算命中率
   */
  private calculateHitRate(): number {
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const totalEntries = entries.length;

    return totalEntries > 0 ? (totalAccess / totalEntries) : 0;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
      }
    }
  }
}

export const smartCacheManager = new SmartCacheManager();
export default smartCacheManager;