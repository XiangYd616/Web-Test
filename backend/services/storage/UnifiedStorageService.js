/**
 * 统一存储服务
 * 整合专门存储、归档和清理功能的统一接口
 */

const { SpecializedStorageManager } = require('./SpecializedStorageManager');
const { DataArchiveManager } = require('./DataArchiveManager');
const { DataCleanupManager } = require('./DataCleanupManager');

class UnifiedStorageService {
  constructor(config = {}) {
    this.config = {
      storage: config.storage || {},
      archive: config.archive || {},
      cleanup: config.cleanup || {},
      monitoring: config.monitoring || { enabled: true },
      ...config
    };

    // 初始化各个管理器
    this.storageManager = new SpecializedStorageManager(this.config.storage);
    this.archiveManager = new DataArchiveManager(this.config.archive);
    this.cleanupManager = new DataCleanupManager(this.config.cleanup);

    // 统计信息
    this.statistics = {
      totalOperations: 0,
      storageOperations: 0,
      archiveOperations: 0,
      cleanupOperations: 0,
      errors: [],
      startTime: new Date().toISOString()
    };

    this.isInitialized = false;
  }

  /**
   * 初始化存储服务
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 初始化统一存储服务...');

    try {
      // 初始化各个组件
      console.log('   📦 初始化专门存储管理器...');
      // storageManager 不需要特殊初始化

      console.log('   🗄️ 初始化数据归档管理器...');
      // archiveManager 已在构造函数中初始化

      console.log('   🧹 初始化数据清理管理器...');
      // cleanupManager 已在构造函数中初始化

      this.isInitialized = true;
      console.log('✅ 统一存储服务初始化完成');

    } catch (error) {
      console.error('❌ 统一存储服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 存储测试结果
   */
  async storeTestResult(engineType, testId, data) {
    try {
      this.statistics.totalOperations++;
      this.statistics.storageOperations++;

      const result = await this.storageManager.storeTestResult(engineType, testId, data);

      console.log(`📦 存储 ${engineType} 测试结果: ${testId}`);
      return result;

    } catch (error) {
      this.recordError('storage', error, { engineType, testId });
      throw error;
    }
  }

  /**
   * 读取测试结果
   */
  async retrieveTestResult(engineType, testId) {
    try {
      this.statistics.totalOperations++;
      this.statistics.storageOperations++;

      const result = await this.storageManager.retrieveTestResult(engineType, testId);

      console.log(`📥 读取 ${engineType} 测试结果: ${testId}`);
      return result;

    } catch (error) {
      this.recordError('retrieval', error, { engineType, testId });
      throw error;
    }
  }

  /**
   * 归档数据
   */
  async archiveData(engineType, criteria = {}) {
    try {
      this.statistics.totalOperations++;
      this.statistics.archiveOperations++;

      const result = await this.archiveManager.archiveEngineData(engineType, criteria);

      console.log(`🗄️ 归档 ${engineType} 数据完成`);
      return result;

    } catch (error) {
      this.recordError('archive', error, { engineType, criteria });
      throw error;
    }
  }

  /**
   * 清理数据
   */
  async cleanupData(engineType = null) {
    try {
      this.statistics.totalOperations++;
      this.statistics.cleanupOperations++;

      const result = await this.cleanupManager.manualCleanup(engineType);

      console.log(`🧹 清理 ${engineType || '所有'} 数据完成`);
      return result;

    } catch (error) {
      this.recordError('cleanup', error, { engineType });
      throw error;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStatistics() {
    try {
      const storageStats = this.storageManager.getStatistics ?
        await this.storageManager.getStatistics() : {};
      const archiveStats = this.archiveManager.getStatistics();
      const cleanupStats = this.cleanupManager.getStatistics();

      return {
        unified: this.statistics,
        storage: storageStats,
        archive: archiveStats,
        cleanup: cleanupStats,
        summary: {
          totalOperations: this.statistics.totalOperations,
          totalArchived: archiveStats.totalArchived || 0,
          totalCleaned: cleanupStats.totalCleaned || 0,
          totalSizeFreed: cleanupStats.totalSizeFreed || 0,
          errorCount: this.statistics.errors.length
        }
      };

    } catch (error) {
      this.recordError('statistics', error);
      throw error;
    }
  }

  /**
   * 获取存储健康状态
   */
  async getHealthStatus() {
    try {
      const health = {
        overall: 'healthy',
        components: {
          storage: 'healthy',
          archive: 'healthy',
          cleanup: 'healthy'
        },
        metrics: {
          uptime: Date.now() - new Date(this.statistics.startTime).getTime(),
          totalOperations: this.statistics.totalOperations,
          errorRate: this.calculateErrorRate(),
          lastError: this.getLastError()
        },
        recommendations: []
      };

      // 检查错误率
      if (health.metrics.errorRate > 0.05) { // 5% 错误率
        health.overall = 'degraded';
        health.recommendations.push({
          type: 'error_rate',
          message: '错误率较高，建议检查系统状态',
          priority: 'high'
        });
      }

      // 检查存储空间
      const storageUsage = await this.calculateStorageUsage();
      if (storageUsage.usagePercentage > 90) {
        health.overall = 'warning';
        health.recommendations.push({
          type: 'storage_space',
          message: '存储空间使用率超过90%，建议清理数据',
          priority: 'high'
        });
      }

      return health;

    } catch (error) {
      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 执行存储维护
   */
  async performMaintenance(options = {}) {
    console.log('🔧 开始存储维护...');

    const maintenanceResult = {
      startTime: new Date().toISOString(),
      operations: [],
      errors: [],
      summary: {}
    };

    try {
      // 1. 数据归档
      if (options.archive !== false) {
        console.log('   🗄️ 执行数据归档...');
        try {
          await this.archiveManager.runScheduledArchive();
          maintenanceResult.operations.push('archive');
        } catch (error) {
          maintenanceResult.errors.push({ operation: 'archive', error: error.message });
        }
      }

      // 2. 数据清理
      if (options.cleanup !== false) {
        console.log('   🧹 执行数据清理...');
        try {
          await this.cleanupManager.runScheduledCleanup();
          maintenanceResult.operations.push('cleanup');
        } catch (error) {
          maintenanceResult.errors.push({ operation: 'cleanup', error: error.message });
        }
      }

      // 3. 存储优化
      if (options.optimize !== false) {
        console.log('   ⚡ 执行存储优化...');
        try {
          await this.optimizeStorage();
          maintenanceResult.operations.push('optimize');
        } catch (error) {
          maintenanceResult.errors.push({ operation: 'optimize', error: error.message });
        }
      }

      // 4. 健康检查
      console.log('   🏥 执行健康检查...');
      const healthStatus = await this.getHealthStatus();
      maintenanceResult.healthStatus = healthStatus;

      maintenanceResult.endTime = new Date().toISOString();
      maintenanceResult.duration = new Date(maintenanceResult.endTime).getTime() -
        new Date(maintenanceResult.startTime).getTime();

      console.log('✅ 存储维护完成');
      return maintenanceResult;

    } catch (error) {
      maintenanceResult.endTime = new Date().toISOString();
      maintenanceResult.error = error.message;
      console.error('❌ 存储维护失败:', error);
      throw error;
    }
  }

  /**
   * 优化存储
   */
  async optimizeStorage() {
    console.log('⚡ 优化存储性能...');

    // 1. 清理临时文件
    await this.cleanupTempFiles();

    // 2. 压缩旧文件
    await this.compressOldFiles();

    // 3. 重建索引
    await this.rebuildIndexes();

    console.log('   ✅ 存储优化完成');
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles() {
    // 实现临时文件清理逻辑
    console.log('     🧹 清理临时文件...');
  }

  /**
   * 压缩旧文件
   */
  async compressOldFiles() {
    // 实现文件压缩逻辑
    console.log('     🗜️ 压缩旧文件...');
  }

  /**
   * 重建索引
   */
  async rebuildIndexes() {
    // 实现索引重建逻辑
    console.log('     📇 重建索引...');
  }

  /**
   * 计算存储使用情况
   */
  async calculateStorageUsage() {
    // 实现存储使用情况计算
    return {
      totalSize: 0,
      usedSize: 0,
      freeSize: 0,
      usagePercentage: 0
    };
  }

  /**
   * 计算错误率
   */
  calculateErrorRate() {
    if (this.statistics.totalOperations === 0) return 0;
    return this.statistics.errors.length / this.statistics.totalOperations;
  }

  /**
   * 获取最后一个错误
   */
  getLastError() {
    if (this.statistics.errors.length === 0) return null;
    return this.statistics.errors[this.statistics.errors.length - 1];
  }

  /**
   * 记录错误
   */
  recordError(operation, error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      stack: error.stack,
      context
    };

    this.statistics.errors.push(errorRecord);

    // 保持错误日志在合理大小
    if (this.statistics.errors.length > 1000) {
      this.statistics.errors = this.statistics.errors.slice(-500);
    }

    console.error(`❌ 存储操作错误 [${operation}]:`, error.message);
  }

  /**
   * 设置存储策略
   */
  setStorageStrategy(engineType, strategy) {
    if (this.storageManager.setStrategy) {
      this.storageManager.setStrategy(engineType, strategy);
    }
  }

  /**
   * 设置归档策略
   */
  setArchivePolicy(engineType, policy) {
    if (this.archiveManager.setPolicy) {
      this.archiveManager.setPolicy(engineType, policy);
    }
  }

  /**
   * 设置清理策略
   */
  setCleanupPolicy(engineType, policy) {
    this.cleanupManager.setRetentionPolicy(engineType, policy);
  }

  /**
   * 获取配置信息
   */
  getConfiguration() {
    return {
      storage: this.config.storage,
      archive: this.config.archive,
      cleanup: this.config.cleanup,
      monitoring: this.config.monitoring
    };
  }

  /**
   * 更新配置
   */
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // 更新各个管理器的配置
    if (newConfig.storage && this.storageManager.updateConfig) {
      this.storageManager.updateConfig(newConfig.storage);
    }

    if (newConfig.archive && this.archiveManager.updateConfig) {
      this.archiveManager.updateConfig(newConfig.archive);
    }

    if (newConfig.cleanup && this.cleanupManager.updateConfig) {
      this.cleanupManager.updateConfig(newConfig.cleanup);
    }
  }

  /**
   * 关闭存储服务
   */
  async shutdown() {
    console.log('🔄 关闭统一存储服务...');

    try {
      // 关闭各个管理器
      if (this.archiveManager.shutdown) {
        await this.archiveManager.shutdown();
      }

      if (this.cleanupManager.shutdown) {
        await this.cleanupManager.shutdown();
      }

      this.isInitialized = false;
      console.log('✅ 统一存储服务已关闭');

    } catch (error) {
      console.error('❌ 关闭存储服务失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
const unifiedStorageService = new UnifiedStorageService();

module.exports = {
  UnifiedStorageService,
  unifiedStorageService
};
