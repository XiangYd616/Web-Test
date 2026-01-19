/**
 * 专门存储管理器
 * 为不同测试引擎提供优化的存储策略
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// 存储策略接口
export interface StorageStrategy {
  name: string;
  description: string;
  dataTypes: string[];
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  indexingEnabled: boolean;
  versioningEnabled: boolean;
  cacheEnabled: boolean;
  retentionPolicy: RetentionPolicy;
}

// 保留策略接口
export interface RetentionPolicy {
  maxVersions: number;
  maxAge: number; // 天数
  autoCleanup: boolean;
}

// 存储配置接口
export interface StorageConfig {
  baseStoragePath: string;
  compressionLevel: number;
  encryptionKey?: string;
  maxFileSize: number;
  strategies: StorageStrategy[];
  cacheSize: number;
  indexSize: number;
}

// 存储项目接口
export interface StorageItem {
  id: string;
  name: string;
  type: string;
  strategy: string;
  size: number;
  compressedSize?: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: Record<string, any>;
  tags: string[];
  checksum: string;
}

// 存储结果接口
export interface StorageResult {
  success: boolean;
  itemId: string;
  path: string;
  size: number;
  compressedSize?: number;
  duration: number;
  metadata: Record<string, any>;
}

// 检索结果接口
export interface RetrievalResult {
  success: boolean;
  item: StorageItem;
  data: Buffer | string;
  decompressedSize?: number;
  duration: number;
  metadata: Record<string, any>;
}

// 存储统计接口
export interface StorageStatistics {
  totalItems: number;
  totalSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  byStrategy: Record<
    string,
    {
      items: number;
      size: number;
      compressedSize: number;
    }
  >;
  byType: Record<
    string,
    {
      items: number;
      size: number;
    }
  >;
  trends: Array<{
    date: string;
    items: number;
    size: number;
    compressionRatio: number;
  }>;
}

/**
 * 专门存储管理器
 */
class SpecializedStorageManager {
  private config: StorageConfig;
  private storageStrategies: Map<string, StorageStrategy> = new Map();
  private items: Map<string, StorageItem> = new Map();
  private cache: Map<string, Buffer> = new Map();
  private index: Map<string, Set<string>> = new Map(); // tag -> itemIds

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      baseStoragePath: config.baseStoragePath || './storage',
      compressionLevel: config.compressionLevel || 6,
      encryptionKey: config.encryptionKey || process.env.STORAGE_ENCRYPTION_KEY,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      strategies: config.strategies || this.getDefaultStrategies(),
      cacheSize: config.cacheSize || 100 * 1024 * 1024, // 100MB
      indexSize: config.indexSize || 10000,
    };

    this.initializeStrategies();
  }

  /**
   * 初始化存储策略
   */
  private initializeStrategies(): void {
    this.config.strategies.forEach(strategy => {
      this.storageStrategies.set(strategy.name, strategy);
    });
  }

  /**
   * 存储数据
   */
  async store(
    data: Buffer | string,
    options: {
      name: string;
      type: string;
      strategy: string;
      metadata?: Record<string, any>;
      tags?: string[];
    }
  ): Promise<StorageResult> {
    const startTime = Date.now();
    const itemId = this.generateItemId();

    // 验证策略
    const strategy = this.storageStrategies.get(options.strategy);
    if (!strategy) {
      throw new Error(`Unknown storage strategy: ${options.strategy}`);
    }

    // 验证数据类型
    if (!strategy.dataTypes.includes(options.type)) {
      throw new Error(`Data type ${options.type} not supported by strategy ${options.strategy}`);
    }

    // 验证文件大小
    const dataSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    if (dataSize > this.config.maxFileSize) {
      throw new Error(`Data size exceeds maximum limit: ${dataSize} > ${this.config.maxFileSize}`);
    }

    try {
      // 处理数据
      let processedData = Buffer.isBuffer(data) ? data : Buffer.from(data);
      let compressedSize: number | undefined;

      // 压缩
      if (strategy.compressionEnabled) {
        processedData = await gzip(processedData, { level: this.config.compressionLevel });
        compressedSize = processedData.length;
      }

      // 加密
      if (strategy.encryptionEnabled && this.config.encryptionKey) {
        processedData = await this.encryptData(processedData);
      }

      // 生成校验和
      const checksum = this.calculateChecksum(processedData);

      // 创建存储路径
      const storagePath = this.getStoragePath(options.strategy, itemId);

      // 确保目录存在
      await fs.mkdir(path.dirname(storagePath), { recursive: true });

      // 写入文件
      await fs.writeFile(storagePath, processedData);

      // 创建存储项目
      const item: StorageItem = {
        id: itemId,
        name: options.name,
        type: options.type,
        strategy: options.strategy,
        size: dataSize,
        compressedSize,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        metadata: options.metadata || {},
        tags: options.tags || [],
        checksum,
      };

      this.items.set(itemId, item);

      // 更新索引
      if (strategy.indexingEnabled) {
        this.updateIndex(item);
      }

      // 缓存数据
      if (strategy.cacheEnabled && this.canCache(dataSize)) {
        this.cache.set(itemId, processedData);
      }

      return {
        success: true,
        itemId,
        path: storagePath,
        size: dataSize,
        compressedSize,
        duration: Date.now() - startTime,
        metadata: {
          strategy: options.strategy,
          compressed: strategy.compressionEnabled,
          encrypted: strategy.encryptionEnabled,
          cached: strategy.cacheEnabled,
        },
      };
    } catch (error) {
      return {
        success: false,
        itemId: '',
        path: '',
        size: 0,
        duration: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 检索数据
   */
  async retrieve(itemId: string): Promise<RetrievalResult> {
    const startTime = Date.now();

    const item = this.items.get(itemId);
    if (!item) {
      return {
        success: false,
        item: item as StorageItem,
        data: Buffer.alloc(0),
        duration: Date.now() - startTime,
        metadata: {
          error: 'Item not found',
        },
      };
    }

    try {
      let data: Buffer;

      // 检查缓存
      if (this.cache.has(itemId)) {
        data = this.cache.get(itemId)!;
      } else {
        // 从文件读取
        const storagePath = this.getStoragePath(item.strategy, itemId);
        data = await fs.readFile(storagePath);

        // 缓存数据
        const strategy = this.storageStrategies.get(item.strategy);
        if (strategy?.cacheEnabled && this.canCache(data.length)) {
          this.cache.set(itemId, data);
        }
      }

      // 解密
      if (item.encrypted && this.config.encryptionKey) {
        data = await this.decryptData(data);
      }

      // 解压缩
      let decompressedSize: number | undefined;
      if (item.compressedSize) {
        data = await gunzip(data);
        decompressedSize = data.length;
      }

      // 验证校验和
      const currentChecksum = this.calculateChecksum(data);
      if (currentChecksum !== item.checksum) {
        throw new Error('Data integrity check failed');
      }

      return {
        success: true,
        item,
        data,
        decompressedSize,
        duration: Date.now() - startTime,
        metadata: {
          cached: this.cache.has(itemId),
          compressed: !!item.compressedSize,
          encrypted: item.encrypted,
        },
      };
    } catch (error) {
      return {
        success: false,
        item,
        data: Buffer.alloc(0),
        duration: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 删除数据
   */
  async delete(itemId: string): Promise<boolean> {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    try {
      // 删除文件
      const storagePath = this.getStoragePath(item.strategy, itemId);
      await fs.unlink(storagePath);

      // 清理缓存
      this.cache.delete(itemId);

      // 清理索引
      this.removeFromIndex(item);

      // 删除项目
      this.items.delete(itemId);

      return true;
    } catch (error) {
      console.error(`Failed to delete item ${itemId}:`, error);
      return false;
    }
  }

  /**
   * 更新数据
   */
  async update(
    itemId: string,
    data: Buffer | string,
    options: {
      metadata?: Record<string, any>;
      tags?: string[];
    } = {}
  ): Promise<StorageResult> {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // 创建新版本
    const newVersion = item.version + 1;

    // 检查版本限制
    const strategy = this.storageStrategies.get(item.strategy);
    if (strategy && strategy.versioningEnabled) {
      const maxVersions = strategy.retentionPolicy.maxVersions;
      if (newVersion > maxVersions) {
        // 清理旧版本
        await this.cleanupOldVersions(item.id, maxVersions);
      }
    }

    // 重新存储
    const result = await this.store(data, {
      name: item.name,
      type: item.type,
      strategy: item.strategy,
      metadata: { ...item.metadata, ...options.metadata },
      tags: options.tags || item.tags,
    });

    if (result.success) {
      // 更新版本信息
      const updatedItem = this.items.get(result.itemId);
      if (updatedItem) {
        updatedItem.version = newVersion;
      }
    }

    return result;
  }

  /**
   * 搜索项目
   */
  search(criteria: {
    type?: string;
    strategy?: string;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    metadata?: Record<string, any>;
  }): StorageItem[] {
    let results = Array.from(this.items.values());

    // 按类型过滤
    if (criteria.type) {
      results = results.filter(item => item.type === criteria.type);
    }

    // 按策略过滤
    if (criteria.strategy) {
      results = results.filter(item => item.strategy === criteria.strategy);
    }

    // 按标签过滤
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(item => criteria.tags!.some(tag => item.tags.includes(tag)));
    }

    // 按日期范围过滤
    if (criteria.dateRange) {
      results = results.filter(
        item =>
          item.createdAt >= criteria.dateRange!.start && item.createdAt <= criteria.dateRange!.end
      );
    }

    // 按元数据过滤
    if (criteria.metadata) {
      results = results.filter(item => this.matchesMetadata(item.metadata, criteria.metadata!));
    }

    return results;
  }

  /**
   * 获取存储统计
   */
  async getStatistics(): Promise<StorageStatistics> {
    const items = Array.from(this.items.values());

    const totalItems = items.length;
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const totalCompressedSize = items
      .filter(item => item.compressedSize)
      .reduce((sum, item) => sum + item.compressedSize!, 0);

    const compressionRatios = items
      .filter(item => item.compressedSize)
      .map(item => (item.size - item.compressedSize!) / item.size);
    const averageCompressionRatio =
      compressionRatios.length > 0
        ? compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length
        : 0;

    const byStrategy: Record<string, { items: number; size: number; compressedSize: number }> = {};
    const byType: Record<string, { items: number; size: number }> = {};

    items.forEach(item => {
      // 按策略统计
      if (!byStrategy[item.strategy]) {
        byStrategy[item.strategy] = { items: 0, size: 0, compressedSize: 0 };
      }
      byStrategy[item.strategy].items++;
      byStrategy[item.strategy].size += item.size;
      if (item.compressedSize) {
        byStrategy[item.strategy].compressedSize += item.compressedSize;
      }

      // 按类型统计
      if (!byType[item.type]) {
        byType[item.type] = { items: 0, size: 0 };
      }
      byType[item.type].items++;
      byType[item.type].size += item.size;
    });

    const trends = this.calculateStorageTrends(items);

    return {
      totalItems,
      totalSize,
      totalCompressedSize,
      averageCompressionRatio,
      byStrategy,
      byType,
      trends,
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 重建索引
   */
  async rebuildIndex(): Promise<void> {
    this.index.clear();

    for (const item of this.items.values()) {
      this.updateIndex(item);
    }
  }

  /**
   * 加密数据
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
  }

  /**
   * 解密数据
   */
  private async decryptData(encryptedData: Buffer): Promise<Buffer> {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);

    const iv = encryptedData.slice(0, 16);
    const tag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 获取存储路径
   */
  private getStoragePath(strategy: string, itemId: string): string {
    const strategyDir = path.join(this.config.baseStoragePath, strategy);
    const date = new Date().toISOString().split('T')[0];
    return path.join(strategyDir, date, `${itemId}.dat`);
  }

  /**
   * 更新索引
   */
  private updateIndex(item: StorageItem): void {
    for (const tag of item.tags) {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set());
      }
      this.index.get(tag)!.add(item.id);
    }
  }

  /**
   * 从索引中移除
   */
  private removeFromIndex(item: StorageItem): void {
    for (const tag of item.tags) {
      const tagSet = this.index.get(tag);
      if (tagSet) {
        tagSet.delete(item.id);
        if (tagSet.size === 0) {
          this.index.delete(tag);
        }
      }
    }
  }

  /**
   * 检查是否可以缓存
   */
  private canCache(dataSize: number): boolean {
    const currentCacheSize = Array.from(this.cache.values()).reduce(
      (sum, data) => sum + data.length,
      0
    );

    return currentCacheSize + dataSize <= this.config.cacheSize;
  }

  /**
   * 匹配元数据
   */
  private matchesMetadata(
    itemMetadata: Record<string, any>,
    criteria: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      if (itemMetadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 清理旧版本
   */
  private async cleanupOldVersions(itemId: string, maxVersions: number): Promise<void> {
    // 简化实现，实际应该管理版本历史
    console.log(`Cleaning up old versions for item ${itemId}, keeping ${maxVersions} versions`);
  }

  /**
   * 计算存储趋势
   */
  private calculateStorageTrends(items: StorageItem[]): Array<{
    date: string;
    items: number;
    size: number;
    compressionRatio: number;
  }> {
    const dailyStats: Record<
      string,
      {
        items: number;
        size: number;
        compressedSize: number;
      }
    > = {};

    items.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];

      if (!dailyStats[date]) {
        dailyStats[date] = { items: 0, size: 0, compressedSize: 0 };
      }

      dailyStats[date].items++;
      dailyStats[date].size += item.size;
      if (item.compressedSize) {
        dailyStats[date].compressedSize += item.compressedSize;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        items: stats.items,
        size: stats.size,
        compressionRatio: stats.size > 0 ? (stats.size - stats.compressedSize) / stats.size : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 获取默认策略
   */
  private getDefaultStrategies(): StorageStrategy[] {
    return [
      {
        name: 'seo_test_data',
        description: 'SEO测试数据存储策略',
        dataTypes: ['seo_analysis', 'accessibility_test', 'performance_test'],
        compressionEnabled: true,
        encryptionEnabled: false,
        indexingEnabled: true,
        versioningEnabled: true,
        cacheEnabled: true,
        retentionPolicy: {
          maxVersions: 10,
          maxAge: 90,
          autoCleanup: true,
        },
      },
      {
        name: 'security_scan_data',
        description: '安全扫描数据存储策略',
        dataTypes: ['security_scan', 'vulnerability_report', 'penetration_test'],
        compressionEnabled: true,
        encryptionEnabled: true,
        indexingEnabled: true,
        versioningEnabled: true,
        cacheEnabled: false,
        retentionPolicy: {
          maxVersions: 5,
          maxAge: 365,
          autoCleanup: true,
        },
      },
      {
        name: 'performance_metrics',
        description: '性能指标数据存储策略',
        dataTypes: ['performance_metrics', 'load_test', 'stress_test'],
        compressionEnabled: true,
        encryptionEnabled: false,
        indexingEnabled: true,
        versioningEnabled: false,
        cacheEnabled: true,
        retentionPolicy: {
          maxVersions: 1,
          maxAge: 30,
          autoCleanup: true,
        },
      },
      {
        name: 'user_data',
        description: '用户数据存储策略',
        dataTypes: ['user_profile', 'user_preferences', 'user_activity'],
        compressionEnabled: false,
        encryptionEnabled: true,
        indexingEnabled: true,
        versioningEnabled: true,
        cacheEnabled: true,
        retentionPolicy: {
          maxVersions: 20,
          maxAge: 180,
          autoCleanup: false,
        },
      },
    ];
  }

  /**
   * 生成项目ID
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default SpecializedStorageManager;
