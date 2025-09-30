/**
 * 🗄️ 统一缓存服务
 * 为测试结果和状态提供缓存和持久化支持
 * 
 * 功能特性：
 * - 内存缓存 (快速访问)
 * - localStorage持久化 (跨会话)
 * - 智能过期机制
 * - 压缩存储
 * - 缓存统计和监控
 */

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // 生存时间 (毫秒)
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
}

// 缓存配置接口
export interface CacheConfig {
  maxMemoryItems: number;
  defaultTTL: number;
  enablePersistence: boolean;
  enableCompression: boolean;
  enableMetrics: boolean;
  cleanupInterval: number;
}

// 缓存统计接口
export interface CacheStats {
  memoryItems: number;
  persistentItems: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  lastCleanup: number;
}

/**
 * 统一缓存服务类
 */
export class cacheService {
  private static instance: cacheService;
  private config: CacheConfig;
  private memoryCache = new Map<string, CacheItem>();
  private stats: CacheStats = {
    memoryItems: 0,
    persistentItems: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    memoryUsage: 0,
    lastCleanup: Date.now()
  };

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxMemoryItems: 1000,
      defaultTTL: 300000, // 5分钟
      enablePersistence: true,
      enableCompression: true,
      enableMetrics: true,
      cleanupInterval: 60000, // 1分钟
      ...config
    };

    this.initializeService();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<CacheConfig>): cacheService {
    if (!cacheService.instance) {
      cacheService.instance = new cacheService(config);
    }
    return cacheService.instance;
  }

  /**
   * 初始化服务
   */
  private initializeService(): void {
    // 从localStorage恢复缓存
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), this.config.cleanupInterval);

    // 页面卸载时保存缓存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.saveToStorage());
    }
  }

  /**
   * 设置缓存项
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      compressed: false
    };

    // 压缩大数据
    if (this.config.enableCompression && this.shouldCompress(data)) {
      (item as any).data = this.compress(data);
      item.compressed = true;
    }

    // 检查内存限制
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      this.evictLeastUsed();
    }

    this.memoryCache.set(key, item);
    this.updateStats();
  }

  /**
   * 获取缓存项
   */
  public get<T>(key: string): T | null {
    const item = this.memoryCache.get(key);

    if (!item) {
      this.stats.totalMisses++;
      this.updateStats();
      return null;
    }

    // 检查是否过期
    if (this.isExpired(item)) {
      this.memoryCache.delete(key);
      this.stats.totalMisses++;
      this.updateStats();
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.totalHits++;
    this.updateStats();

    // 解压缩数据
    if (item.compressed) {
      return this.decompress(item.data);
    }

    return item.data;
  }

  /**
   * 删除缓存项
   */
  public delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.memoryCache.clear();
    if (this.config.enablePersistence) {
      localStorage.removeItem('unifiedCache');
    }
    this.resetStats();
  }

  /**
   * 检查缓存项是否存在
   */
  public has(key: string): boolean {
    const item = this.memoryCache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  /**
   * 获取所有缓存键
   */
  public keys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 检查项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 判断是否需要压缩
   */
  private shouldCompress(data: unknown): boolean {
    const size = JSON.stringify(data).length;
    return size > 10240; // 10KB以上压缩
  }

  /**
   * 压缩数据
   */
  private compress(data: unknown): string {
    // 简单的JSON压缩 (实际项目中可以使用更好的压缩算法)
    return JSON.stringify(data);
  }

  /**
   * 解压缩数据
   */
  private decompress<T>(compressedData: string): T {
    return JSON.parse(compressedData);
  }

  /**
   * 淘汰最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedCount = Infinity;
    let oldestAccess = Infinity;

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.accessCount < leastUsedCount ||
        (item.accessCount === leastUsedCount && item.lastAccessed < oldestAccess)) {
        leastUsedKey = key;
        leastUsedCount = item.accessCount;
        oldestAccess = item.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));

    this.stats.lastCleanup = now;
    this.updateStats();

    if (this.config.enableMetrics && expiredKeys.length > 0) {
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.memoryItems = this.memoryCache.size;
    this.stats.hitRate = this.stats.totalHits / (this.stats.totalHits + this.stats.totalMisses) * 100;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      memoryItems: 0,
      persistentItems: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      memoryUsage: 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const item of this.memoryCache.values()) {
      totalSize += JSON.stringify(item).length * 2; // 粗略估算
    }
    return totalSize;
  }

  /**
   * 保存到localStorage
   */
  private saveToStorage(): void {
    if (!this.config.enablePersistence) return;

    try {
      const data = {
        cache: Array.from(this.memoryCache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };

      localStorage.setItem('unifiedCache', JSON.stringify(data));
    } catch (error) {
      console.warn('保存缓存到localStorage失败:', error);
    }
  }

  /**
   * 从localStorage加载
   */
  private loadFromStorage(): void {
    if (!this.config.enablePersistence) return;

    try {
      const saved = localStorage.getItem('unifiedCache');
      if (saved) {
        const data = JSON.parse(saved);

        // 恢复缓存项
        if (data.cache) {
          this.memoryCache = new Map(data.cache);
          // 清理过期项
          this.cleanup();
        }

        // 恢复统计信息
        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (error) {
      console.warn('从localStorage加载缓存失败:', error);
    }
  }
}

// 导出单例实例
export const cacheService = cacheService.getInstance();
export default cacheService;
