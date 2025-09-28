/**
 * 大数据量处理优化工具
 * 提供数据分片、懒加载、内存管理等功能
 * 版本: v1.0.0
 */

import { defaultMemoryCache } from '../services/cacheStrategy';

// ==================== 类型定义 ====================

export interface DataChunk<T = any> {
  id: string;
  data: T[];
  startIndex: number;
  endIndex: number;
  size: number;
  timestamp: number;
  accessed: number;
}

export interface ChunkingOptions {
  chunkSize: number;
  maxChunks: number;
  enableCache: boolean;
  cacheTimeout: number;
  preloadChunks: number;
}

export interface LazyLoadOptions<T = any> {
  pageSize: number;
  threshold: number;
  loadMore: (offset: number, limit: number) => Promise<T[]>;
  onLoad?: (data: T[], hasMore: boolean) => void;
  onError?: (error: Error) => void;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  chunks: number;
  items: number;
}

export interface OptimizationMetrics {
  totalItems: number;
  chunksCreated: number;
  chunksLoaded: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: MemoryUsage;
  averageLoadTime: number;
  lastOptimization: number;
}

// ==================== 数据分片管理器 ====================

export class DataChunkManager<T = any> {
  private chunks = new Map<string, DataChunk<T>>();
  private options: ChunkingOptions;
  private metrics: OptimizationMetrics;
  private loadingChunks = new Set<string>();

  constructor(options: Partial<ChunkingOptions> = {}) {
    this.options = {
      chunkSize: 100,
      maxChunks: 50,
      enableCache: true,
      cacheTimeout: 300000, // 5分钟
      preloadChunks: 2,
      ...options
    };

    this.metrics = {
      totalItems: 0,
      chunksCreated: 0,
      chunksLoaded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0, chunks: 0, items: 0 },
      averageLoadTime: 0,
      lastOptimization: Date.now()
    };
  }

  /**
   * 创建数据分片
   */
  createChunks(data: T[]): string[] {
    const chunkIds: string[] = [];
    const chunkSize = this.options.chunkSize;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunkData = data.slice(i, i + chunkSize);
      const chunkId = this.generateChunkId(i, i + chunkData.length - 1);

      const chunk: DataChunk<T> = {
        id: chunkId,
        data: chunkData,
        startIndex: i,
        endIndex: i + chunkData.length - 1,
        size: chunkData.length,
        timestamp: Date.now(),
        accessed: 0
      };

      this.chunks.set(chunkId, chunk);
      chunkIds.push(chunkId);
      this.metrics.chunksCreated++;
    }

    this.metrics.totalItems = data.length;
    this.updateMemoryUsage();
    this.optimizeMemory();

    return chunkIds;
  }

  /**
   * 获取数据分片
   */
  async getChunk(chunkId: string): Promise<DataChunk<T> | null> {
    const startTime = Date.now();

    // 检查内存中的分片
    if (this.chunks.has(chunkId)) {
      const chunk = this.chunks.get(chunkId)!;
      chunk.accessed++;
      this.metrics.cacheHits++;
      return chunk;
    }

    // 检查缓存
    if (this.options.enableCache) {
      const cached = await defaultMemoryCache.get(chunkId);
      if (cached) {
        this.chunks.set(chunkId, cached);
        this.metrics.cacheHits++;
        return cached;
      }
    }

    this.metrics.cacheMisses++;
    this.updateAverageLoadTime(Date.now() - startTime);
    return null;
  }

  /**
   * 获取范围内的数据
   */
  async getRange(startIndex: number, endIndex: number): Promise<T[]> {
    const result: T[] = [];
    const chunkSize = this.options.chunkSize;

    const startChunk = Math.floor(startIndex / chunkSize);
    const endChunk = Math.floor(endIndex / chunkSize);

    for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
      const chunkStart = chunkIndex * chunkSize;
      const chunkEnd = chunkStart + chunkSize - 1;
      const chunkId = this.generateChunkId(chunkStart, chunkEnd);

      const chunk = await this.getChunk(chunkId);
      if (chunk) {
        const localStart = Math.max(0, startIndex - chunkStart);
        const localEnd = Math.min(chunk.size - 1, endIndex - chunkStart);

        result.push(...chunk.data.slice(localStart, localEnd + 1));
      }
    }

    return result;
  }

  /**
   * 预加载分片
   */
  async preloadChunks(currentChunkId: string): Promise<void> {
    const currentChunk = await this.getChunk(currentChunkId);
    if (!currentChunk) return;

    const chunkSize = this.options.chunkSize;
    const currentIndex = Math.floor(currentChunk.startIndex / chunkSize);
    const preloadCount = this.options.preloadChunks;

    const preloadPromises: Promise<void>[] = [];

    for (let i = 1; i <= preloadCount; i++) {
      // 预加载前面的分片
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0) {
        const prevChunkId = this.generateChunkId(
          prevIndex * chunkSize,
          (prevIndex + 1) * chunkSize - 1
        );
        preloadPromises.push(this.loadChunkIfNeeded(prevChunkId));
      }

      // 预加载后面的分片
      const nextIndex = currentIndex + i;
      const nextChunkId = this.generateChunkId(
        nextIndex * chunkSize,
        (nextIndex + 1) * chunkSize - 1
      );
      preloadPromises.push(this.loadChunkIfNeeded(nextChunkId));
    }

    await Promise.allSettled(preloadPromises);
  }

  /**
   * 内存优化
   */
  optimizeMemory(): void {
    if (this.chunks.size <= this.options.maxChunks) {
      return;
    }

    // 按访问频率和时间排序
    const sortedChunks = Array.from(this.chunks.entries())
      .sort(([, a], [, b]) => {
        const aScore = a.accessed / (Date.now() - a.timestamp + 1);
        const bScore = b.accessed / (Date.now() - b.timestamp + 1);
        return aScore - bScore;
      });

    // 删除最少使用的分片
    const toRemove = sortedChunks.length - this.options.maxChunks;
    for (let i = 0; i < toRemove; i++) {
      const [chunkId, chunk] = sortedChunks[i];

      // 缓存到持久存储
      if (this.options.enableCache) {
        defaultMemoryCache.set(chunkId, chunk, undefined, this.options.cacheTimeout);
      }

      this.chunks.delete(chunkId);
    }

    this.updateMemoryUsage();
    this.metrics.lastOptimization = Date.now();
  }

  /**
   * 清理过期分片
   */
  cleanup(): void {
    const now = Date.now();
    const expiredChunks: string[] = [];

    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (now - chunk.timestamp > this.options.cacheTimeout) {
        expiredChunks.push(chunkId);
      }
    }

    expiredChunks.forEach(chunkId => {
      this.chunks.delete(chunkId);
    });

    this.updateMemoryUsage();
  }

  /**
   * 获取指标
   */
  getMetrics(): OptimizationMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * 重置
   */
  reset(): void {
    this.chunks.clear();
    this.loadingChunks.clear();
    this.metrics = {
      totalItems: 0,
      chunksCreated: 0,
      chunksLoaded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0, chunks: 0, items: 0 },
      averageLoadTime: 0,
      lastOptimization: Date.now()
    };
  }

  // ==================== 私有方法 ====================

  private generateChunkId(startIndex: number, endIndex: number): string {
    return `chunk_${startIndex}_${endIndex}`;
  }

  private async loadChunkIfNeeded(chunkId: string): Promise<void> {
    if (this.chunks.has(chunkId) || this.loadingChunks.has(chunkId)) {
      return;
    }

    this.loadingChunks.add(chunkId);

    try {
      // 这里应该实现实际的数据加载逻辑
      // 目前只是模拟
      await new Promise(resolve => setTimeout(resolve, 10));
      this.metrics.chunksLoaded++;
    } finally {
      this.loadingChunks.delete(chunkId);
    }
  }

  private updateMemoryUsage(): void {
    const chunks = this.chunks.size;
    const items = Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.size, 0);

    // 估算内存使用量（简化计算）
    const estimatedSize = items * 100; // 假设每个项目100字节
    const totalMemory = (performance as any).memory?.usedJSHeapSize || estimatedSize;

    this.metrics.memoryUsage = {
      used: estimatedSize,
      total: totalMemory,
      percentage: (estimatedSize / totalMemory) * 100,
      chunks,
      items
    };
  }

  private updateAverageLoadTime(loadTime: number): void {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalRequests === 1) {
      this.metrics.averageLoadTime = loadTime;
    } else {
      this.metrics.averageLoadTime =
        (this.metrics.averageLoadTime * (totalRequests - 1) + loadTime) / totalRequests;
    }
  }
}

// ==================== 懒加载管理器 ====================

export class LazyLoadManager<T = any> {
  private data: T[] = [];
  private loading = false;
  private hasMore = true;
  private offset = 0;
  private options: LazyLoadOptions<T>;

  constructor(options: LazyLoadOptions<T>) {
    this.options = options;
  }

  /**
   * 加载更多数据
   */
  async loadMore(): Promise<T[]> {
    if (this.loading || !this.hasMore) {
      return [];
    }

    this.loading = true;

    try {
      const newData = await this.options.loadMore(this.offset, this.options.pageSize);

      this.data.push(...newData);
      this.offset += newData.length;
      this.hasMore = newData.length === this.options.pageSize;

      this.options.onLoad?.(newData, this.hasMore);

      return newData;
    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * 检查是否需要加载更多
   */
  shouldLoadMore(scrollPosition: number, containerHeight: number, contentHeight: number): boolean {
    if (this.loading || !this.hasMore) {
      return false;
    }

    const scrollPercentage = (scrollPosition + containerHeight) / contentHeight;
    return scrollPercentage >= (1 - this.options.threshold / 100);
  }

  /**
   * 重置
   */
  reset(): void {
    this.data = [];
    this.loading = false;
    this.hasMore = true;
    this.offset = 0;
  }

  /**
   * 获取当前数据
   */
  getData(): T[] {
    return this.data;
  }

  /**
   * 获取状态
   */
  getState() {
    return {
      loading: this.loading,
      hasMore: this.hasMore,
      offset: this.offset,
      count: this.data.length
    };
  }
}

// ==================== 性能监控器 ====================

export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private memorySnapshots: MemoryUsage[] = [];
  private maxSnapshots = 100;

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // 保持最近的100个值
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * 获取指标统计
   */
  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * 记录内存快照
   */
  takeMemorySnapshot(): MemoryUsage {
    const memory = (performance as any).memory;
    const snapshot: MemoryUsage = {
      used: memory?.usedJSHeapSize || 0,
      total: memory?.totalJSHeapSize || 0,
      percentage: memory ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 0,
      chunks: 0,
      items: 0
    };

    this.memorySnapshots.push(snapshot);

    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  /**
   * 获取内存趋势
   */
  getMemoryTrend(): MemoryUsage[] {
    return [...this.memorySnapshots];
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeak(): boolean {
    if (this.memorySnapshots.length < 10) {
      return false;
    }

    const recent = this.memorySnapshots.slice(-10);
    const trend = recent.reduce((sum, snapshot, index) => {
      if (index === 0) return 0;
      return sum + (snapshot.used - recent[index - 1].used);
    }, 0);

    // 如果最近10个快照的内存使用量持续增长超过10MB，认为可能有内存泄漏
    return trend > 10 * 1024 * 1024;
  }

  /**
   * 清理
   */
  clear(): void {
    this.metrics.clear();
    this.memorySnapshots = [];
  }
}

// ==================== 工具函数 ====================

/**
 * 数据分批处理
 */
export function processBatches<T, R>(
  data: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  return new Promise(async (resolve, reject) => {
    const results: R[] = [];

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);

        // 让出控制权，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 内存使用量估算
 */
export function estimateMemoryUsage(data: any): number {
  const json = JSON.stringify(data);
  return new Blob([json]).size;
}

/**
 * 数据压缩
 */
export function compressData<T>(data: T[]): { compressed: string; originalSize: number; compressedSize: number } {
  const json = JSON.stringify(data);
  const originalSize = new Blob([json]).size;

  // 简单的压缩（实际项目中可以使用更好的压缩算法）
  const compressed = btoa(json);
  const compressedSize = new Blob([compressed]).size;

  return {
    compressed,
    originalSize,
    compressedSize
  };
}

/**
 * 数据解压缩
 */
export function decompressData<T>(compressed: string): T[] {
  const json = atob(compressed);
  return JSON.parse(json);
}

// ==================== 默认实例 ====================

export const defaultChunkManager = new DataChunkManager();
export const defaultPerformanceMonitor = new PerformanceMonitor();

// 定期记录内存快照
setInterval(() => {
  defaultPerformanceMonitor.takeMemorySnapshot();
}, 30000); // 每30秒记录一次
