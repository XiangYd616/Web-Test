/**
 * 数据持久化优化管理器
 * 提供数据缓存、批处理、压缩和优化存储功能
 * 版本: v2.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { handleError, ErrorCode } = require('../middleware/UnifiedErrorHandler');

class DataPersistenceOptimizer {
  constructor(options = {}) {
    this.options = {
      // 缓存配置
      cacheEnabled: options.cacheEnabled !== false,
      cacheMaxSize: options.cacheMaxSize || 1000, // 最大缓存项数
      cacheTTL: options.cacheTTL || 300000, // 缓存过期时间(ms) - 5分钟
      cacheCleanupInterval: options.cacheCleanupInterval || 60000, // 清理间隔(ms) - 1分钟
      
      // 批处理配置
      batchEnabled: options.batchEnabled !== false,
      batchSize: options.batchSize || 100, // 批处理大小
      batchInterval: options.batchInterval || 5000, // 批处理间隔(ms) - 5秒
      
      // 压缩配置
      compressionEnabled: options.compressionEnabled !== false,
      compressionThreshold: options.compressionThreshold || 1024, // 压缩阈值(bytes)
      compressionLevel: options.compressionLevel || 6, // 压缩级别(1-9)
      
      // 存储配置
      dataDirectory: options.dataDirectory || './data',
      backupEnabled: options.backupEnabled !== false,
      backupInterval: options.backupInterval || 86400000, // 备份间隔(ms) - 24小时
      maxBackups: options.maxBackups || 7, // 最大备份数量
      
      // 性能配置
      asyncWriteEnabled: options.asyncWriteEnabled !== false,
      writeQueueSize: options.writeQueueSize || 1000,
      connectionPoolSize: options.connectionPoolSize || 10,
      queryTimeout: options.queryTimeout || 30000, // 查询超时(ms)
      
      // 监控配置
      metricsEnabled: options.metricsEnabled !== false,
      
      ...options
    };

    // 内存缓存
    this.cache = new Map();
    this.cacheAccessTimes = new Map();
    
    // 批处理队列
    this.writeQueue = [];
    this.batchTimer = null;
    
    // 性能统计
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalReads: 0,
      totalWrites: 0,
      totalDeletes: 0,
      batchWrites: 0,
      compressionSaves: 0,
      errors: 0,
      avgReadTime: 0,
      avgWriteTime: 0,
      lastBackup: null,
      startTime: Date.now()
    };
    
    // 写入队列（异步写入）
    this.asyncWriteQueue = [];
    this.writeInProgress = false;
    
    // 初始化
    this.initialize();
  }

  /**
   * 初始化优化器
   */
  async initialize() {
    try {
      // 确保数据目录存在
      await this.ensureDataDirectory();
      
      // 启动缓存清理定时器
      if (this.options.cacheEnabled) {
        this.startCacheCleanup();
      }
      
      // 启动批处理定时器
      if (this.options.batchEnabled) {
        this.startBatchProcessing();
      }
      
      // 启动备份定时器
      if (this.options.backupEnabled) {
        this.startBackupSchedule();
      }
      
      // 启动异步写入处理
      if (this.options.asyncWriteEnabled) {
        this.startAsyncWriteProcessing();
      }
      
      console.log('✅ 数据持久化优化器初始化完成');
    } catch (error) {
      handleError(error, { 
        component: 'DataPersistenceOptimizer',
        method: 'initialize'
      });
    }
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.options.dataDirectory, { recursive: true });
      
      // 创建子目录
      await fs.mkdir(path.join(this.options.dataDirectory, 'cache'), { recursive: true });
      await fs.mkdir(path.join(this.options.dataDirectory, 'backups'), { recursive: true });
      await fs.mkdir(path.join(this.options.dataDirectory, 'temp'), { recursive: true });
    } catch (error) {
      throw handleError(error, {
        code: ErrorCode.FILE_ERROR,
        component: 'DataPersistenceOptimizer',
        method: 'ensureDataDirectory'
      });
    }
  }

  /**
   * 读取数据（带缓存）
   */
  async read(key, options = {}) {
    const startTime = Date.now();
    
    try {
      this.stats.totalReads++;
      
      // 检查缓存
      if (this.options.cacheEnabled && !options.skipCache) {
        const cachedData = this.getFromCache(key);
        if (cachedData !== null) {
          this.stats.cacheHits++;
          this.updateStats('read', Date.now() - startTime);
          return cachedData;
        }
      }
      
      this.stats.cacheMisses++;
      
      // 从存储读取
      const filePath = this.getFilePath(key);
      const data = await this.readFromStorage(filePath);
      
      // 存入缓存
      if (this.options.cacheEnabled && data !== null) {
        this.setToCache(key, data);
      }
      
      this.updateStats('read', Date.now() - startTime);
      return data;
      
    } catch (error) {
      this.stats.errors++;
      throw handleError(error, {
        code: ErrorCode.FILE_ERROR,
        component: 'DataPersistenceOptimizer',
        method: 'read',
        key
      });
    }
  }

  /**
   * 写入数据（支持批处理和异步）
   */
  async write(key, data, options = {}) {
    const startTime = Date.now();
    
    try {
      this.stats.totalWrites++;
      
      // 更新缓存
      if (this.options.cacheEnabled) {
        this.setToCache(key, data);
      }
      
      const writeOperation = {
        key,
        data,
        timestamp: Date.now(),
        options
      };
      
      // 批处理模式
      if (this.options.batchEnabled && !options.immediate) {
        this.writeQueue.push(writeOperation);
        this.updateStats('write', Date.now() - startTime);
        return Promise.resolve();
      }
      
      // 异步写入模式
      if (this.options.asyncWriteEnabled && !options.immediate) {
        return new Promise((resolve, reject) => {
          this.asyncWriteQueue.push({
            ...writeOperation,
            resolve,
            reject
          });
          this.processAsyncWrites();
        });
      }
      
      // 同步写入
      await this.writeToStorage(key, data, options);
      this.updateStats('write', Date.now() - startTime);
      
    } catch (error) {
      this.stats.errors++;
      throw handleError(error, {
        code: ErrorCode.FILE_ERROR,
        component: 'DataPersistenceOptimizer',
        method: 'write',
        key
      });
    }
  }

  /**
   * 删除数据
   */
  async delete(key, options = {}) {
    try {
      this.stats.totalDeletes++;
      
      // 从缓存删除
      if (this.options.cacheEnabled) {
        this.cache.delete(key);
        this.cacheAccessTimes.delete(key);
      }
      
      // 从存储删除
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath).catch(() => {}); // 忽略文件不存在的错误
      
    } catch (error) {
      this.stats.errors++;
      throw handleError(error, {
        code: ErrorCode.FILE_ERROR,
        component: 'DataPersistenceOptimizer',
        method: 'delete',
        key
      });
    }
  }

  /**
   * 批量读取
   */
  async readBatch(keys, options = {}) {
    const results = {};
    const promises = keys.map(async (key) => {
      try {
        results[key] = await this.read(key, options);
      } catch (error) {
        results[key] = { error: error.message };
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * 批量写入
   */
  async writeBatch(dataMap, options = {}) {
    const promises = Object.entries(dataMap).map(([key, data]) => 
      this.write(key, data, options)
    );
    
    await Promise.all(promises);
  }

  /**
   * 从缓存获取数据
   */
  getFromCache(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    const cacheEntry = this.cache.get(key);
    const now = Date.now();
    
    // 检查过期
    if (now - cacheEntry.timestamp > this.options.cacheTTL) {
      this.cache.delete(key);
      this.cacheAccessTimes.delete(key);
      return null;
    }
    
    // 更新访问时间
    this.cacheAccessTimes.set(key, now);
    return cacheEntry.data;
  }

  /**
   * 存入缓存
   */
  setToCache(key, data) {
    const now = Date.now();
    
    // 检查缓存大小限制
    if (this.cache.size >= this.options.cacheMaxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: now
    });
    this.cacheAccessTimes.set(key, now);
  }

  /**
   * 驱逐最少使用的缓存项
   */
  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.cacheAccessTimes) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheAccessTimes.delete(oldestKey);
    }
  }

  /**
   * 从存储读取数据
   */
  async readFromStorage(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      
      // 检查是否压缩
      if (this.isCompressed(buffer)) {
        return await this.decompress(buffer);
      }
      
      return JSON.parse(buffer.toString('utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // 文件不存在
      }
      throw error;
    }
  }

  /**
   * 写入存储
   */
  async writeToStorage(key, data, options = {}) {
    const filePath = this.getFilePath(key);
    const serialized = JSON.stringify(data, null, options.pretty ? 2 : 0);
    
    let buffer = Buffer.from(serialized, 'utf8');
    
    // 压缩大数据
    if (this.options.compressionEnabled && buffer.length > this.options.compressionThreshold) {
      const originalSize = buffer.length;
      buffer = await this.compress(buffer);
      this.stats.compressionSaves += originalSize - buffer.length;
    }
    
    await fs.writeFile(filePath, buffer);
  }

  /**
   * 数据压缩
   */
  async compress(buffer) {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, { level: this.options.compressionLevel }, (error, compressed) => {
        if (error) {
          reject(error);
        } else {
          // 添加压缩标识
          const header = Buffer.from('GZIP', 'utf8');
          resolve(Buffer.concat([header, compressed]));
        }
      });
    });
  }

  /**
   * 数据解压缩
   */
  async decompress(buffer) {
    const zlib = require('zlib');
    
    // 移除压缩标识
    const compressedData = buffer.slice(4);
    
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressedData, (error, decompressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(JSON.parse(decompressed.toString('utf8')));
        }
      });
    });
  }

  /**
   * 检查是否压缩
   */
  isCompressed(buffer) {
    return buffer.length >= 4 && buffer.slice(0, 4).toString('utf8') === 'GZIP';
  }

  /**
   * 获取文件路径
   */
  getFilePath(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const subDir = hash.substring(0, 2); // 使用前两位作为子目录
    const fileName = `${hash}.json`;
    
    return path.join(this.options.dataDirectory, 'cache', subDir, fileName);
  }

  /**
   * 启动缓存清理
   */
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.options.cacheCleanupInterval);
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, cacheEntry] of this.cache) {
      if (now - cacheEntry.timestamp > this.options.cacheTTL) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.cacheAccessTimes.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 清理了 ${expiredKeys.length} 个过期缓存项`);
    }
  }

  /**
   * 启动批处理
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.options.batchInterval);
  }

  /**
   * 处理批次写入
   */
  async processBatch() {
    if (this.writeQueue.length === 0) return;
    
    const batch = this.writeQueue.splice(0, this.options.batchSize);
    this.stats.batchWrites++;
    
    console.log(`📦 处理批次写入: ${batch.length} 项`);
    
    const promises = batch.map(async (operation) => {
      try {
        await this.writeToStorage(operation.key, operation.data, operation.options);
      } catch (error) {
        handleError(error, {
          code: ErrorCode.FILE_ERROR,
          component: 'DataPersistenceOptimizer',
          method: 'processBatch',
          key: operation.key
        });
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * 启动异步写入处理
   */
  startAsyncWriteProcessing() {
    // 异步写入处理在 processAsyncWrites 方法中实现
  }

  /**
   * 处理异步写入队列
   */
  async processAsyncWrites() {
    if (this.writeInProgress || this.asyncWriteQueue.length === 0) {
      return;
    }
    
    this.writeInProgress = true;
    
    while (this.asyncWriteQueue.length > 0) {
      const operation = this.asyncWriteQueue.shift();
      
      try {
        await this.writeToStorage(operation.key, operation.data, operation.options);
        operation.resolve();
      } catch (error) {
        operation.reject(error);
      }
    }
    
    this.writeInProgress = false;
  }

  /**
   * 启动备份调度
   */
  startBackupSchedule() {
    setInterval(() => {
      this.createBackup();
    }, this.options.backupInterval);
  }

  /**
   * 创建备份
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.options.dataDirectory, 'backups', timestamp);
      
      await fs.mkdir(backupDir, { recursive: true });
      
      // 复制数据文件
      const cacheDir = path.join(this.options.dataDirectory, 'cache');
      await this.copyDirectory(cacheDir, backupDir);
      
      // 创建备份元数据
      const metadata = {
        timestamp: new Date().toISOString(),
        stats: this.getStats(),
        version: '2.0.0'
      };
      
      await fs.writeFile(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      this.stats.lastBackup = new Date();
      console.log(`💾 创建备份: ${timestamp}`);
      
      // 清理老备份
      await this.cleanupOldBackups();
      
    } catch (error) {
      handleError(error, {
        code: ErrorCode.FILE_ERROR,
        component: 'DataPersistenceOptimizer',
        method: 'createBackup'
      });
    }
  }

  /**
   * 复制目录
   */
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 清理老备份
   */
  async cleanupOldBackups() {
    try {
      const backupDir = path.join(this.options.dataDirectory, 'backups');
      const backups = await fs.readdir(backupDir);
      
      if (backups.length > this.options.maxBackups) {
        // 按时间排序，删除最老的
        backups.sort();
        const toDelete = backups.slice(0, backups.length - this.options.maxBackups);
        
        for (const backup of toDelete) {
          const backupPath = path.join(backupDir, backup);
          await fs.rmdir(backupPath, { recursive: true });
        }
        
        console.log(`🗑️ 清理了 ${toDelete.length} 个老备份`);
      }
    } catch (error) {
      console.error('清理老备份失败:', error);
    }
  }

  /**
   * 更新性能统计
   */
  updateStats(operation, duration) {
    if (operation === 'read') {
      this.stats.avgReadTime = (this.stats.avgReadTime + duration) / 2;
    } else if (operation === 'write') {
      this.stats.avgWriteTime = (this.stats.avgWriteTime + duration) / 2;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const cacheHitRate = this.stats.totalReads > 0 ? 
      (this.stats.cacheHits / this.stats.totalReads * 100).toFixed(2) : 0;
    
    return {
      uptime,
      cacheSize: this.cache.size,
      cacheHitRate: `${cacheHitRate}%`,
      writeQueueSize: this.writeQueue.length,
      asyncWriteQueueSize: this.asyncWriteQueue.length,
      compressionSavings: `${(this.stats.compressionSaves / 1024).toFixed(2)} KB`,
      ...this.stats
    };
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
    this.cacheAccessTimes.clear();
    console.log('🧹 缓存已清空');
  }

  /**
   * 强制处理所有待写入项
   */
  async flush() {
    // 处理批次队列
    while (this.writeQueue.length > 0) {
      await this.processBatch();
    }
    
    // 处理异步写入队列
    await this.processAsyncWrites();
    
    console.log('💾 所有待写入项已处理完成');
  }

  /**
   * 关闭优化器
   */
  async shutdown() {
    try {
      // 清理定时器
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }
      
      // 处理剩余的写入操作
      await this.flush();
      
      console.log('✅ 数据持久化优化器已关闭');
    } catch (error) {
      handleError(error, {
        component: 'DataPersistenceOptimizer',
        method: 'shutdown'
      });
    }
  }
}

module.exports = DataPersistenceOptimizer;
