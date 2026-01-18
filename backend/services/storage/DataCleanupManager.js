/**
 * 数据清理管理器
 * 处理测试数据的自动清理和生命周期管理
 */

const fs = require('fs').promises;
const path = require('path');
void path;
const cron = require('node-cron');

class DataCleanupManager {
  constructor(config = {}) {
    this.config = {
      retentionPolicies: config.retentionPolicies || this.getDefaultRetentionPolicies(),
      maxStorageSize: config.maxStorageSize || 10 * 1024 * 1024 * 1024, // 10GB
      cleanupBatchSize: config.cleanupBatchSize || 1000,
      safetyMargin: config.safetyMargin || 0.1, // 10% 安全边际
      scheduleEnabled: config.scheduleEnabled !== false,
      dryRun: config.dryRun || false,
      ...config
    };

    this.isRunning = false;
    this.cleanupJobs = new Map();
    this.statistics = {
      totalCleaned: 0,
      totalSizeFreed: 0,
      lastCleanupTime: null,
      cleanupCount: 0,
      errors: []
    };

    if (this.config.scheduleEnabled) {
      this.initializeScheduler();
    }
  }

  /**
   * 获取默认保留策略
   */
  getDefaultRetentionPolicies() {
    return {
      // 高频数据 - 较短保留期
      performance: {
        hotData: 7,      // 7天热数据
        warmData: 30,    // 30天温数据
        coldData: 90,    // 90天冷数据
        maxRecords: 10000,
        priority: 'high'
      },
      stress: {
        hotData: 3,
        warmData: 15,
        coldData: 60,
        maxRecords: 5000,
        priority: 'high'
      },
      
      // 重要数据 - 较长保留期
      security: {
        hotData: 30,
        warmData: 90,
        coldData: 365,
        maxRecords: 20000,
        priority: 'low'
      },
      
      // 中等频率数据
      website: {
        hotData: 14,
        warmData: 45,
        coldData: 120,
        maxRecords: 10000,
        priority: 'medium'
      },
      api: {
        hotData: 14,
        warmData: 30,
        coldData: 90,
        maxRecords: 15000,
        priority: 'medium'
      },
      seo: {
        hotData: 30,
        warmData: 60,
        coldData: 180,
        maxRecords: 12000,
        priority: 'low'
      },
      accessibility: {
        hotData: 30,
        warmData: 60,
        coldData: 180,
        maxRecords: 12000,
        priority: 'low'
      }
    };
  }

  /**
   * 初始化定时任务
   */
  initializeScheduler() {
    // 每天凌晨1点执行清理任务
    cron.schedule('0 1 * * *', async () => {
      await this.runScheduledCleanup();
    });

    // 每小时检查存储使用情况
    cron.schedule('0 * * * *', async () => {
      await this.checkStorageUsage();
    });

    // 每周日凌晨4点执行深度清理
    cron.schedule('0 4 * * 0', async () => {
      await this.runDeepCleanup();
    });

  }

  /**
   * 执行定时清理
   */
  async runScheduledCleanup() {
    if (this.isRunning) {
      
        console.log('⚠️ 清理任务正在运行中，跳过本次执行');
      return;
      }

    try {
      this.isRunning = true;
      
      // 按优先级执行清理
      const engineTypes = Object.keys(this.config.retentionPolicies);
      const sortedEngines = engineTypes.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[this.config.retentionPolicies[a].priority] || 0;
        const bPriority = priorityOrder[this.config.retentionPolicies[b].priority] || 0;
        return bPriority - aPriority;
      });

      for (const engineType of sortedEngines) {
        await this.cleanupEngineData(engineType);
      }

      this.statistics.lastCleanupTime = new Date().toISOString();
      console.log('✅ 定时清理任务完成');

    } catch (error) {
      console.error('❌ 定时清理任务失败:', error);
      this.statistics.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        type: 'scheduled_cleanup'
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 执行深度清理
   */
  async runDeepCleanup() {
    try {
      // 清理孤立文件
      await this.cleanupOrphanedFiles();
      
      // 清理临时文件
      await this.cleanupTempFiles();
      
      // 优化数据库
      await this.optimizeDatabase();
      
      // 清理日志文件
      await this.cleanupLogFiles();

      console.log('✅ 深度清理任务完成');

    } catch (error) {
      console.error('❌ 深度清理任务失败:', error);
    }
  }

  /**
   * 清理特定引擎的数据
   */
  async cleanupEngineData(engineType) {

    const policy = this.config.retentionPolicies[engineType];
    if (!policy) {
      return;
    }

    try {
      let totalCleaned = 0;
      let totalSizeFreed = 0;

      // 1. 按时间清理过期数据
      const expiredData = await this.getExpiredData(engineType, policy);
      if (expiredData.length > 0) {
        const timeCleanupResult = await this.cleanupExpiredData(expiredData);
        totalCleaned += timeCleanupResult.count;
        totalSizeFreed += timeCleanupResult.size;
      }

      // 2. 按数量限制清理超量数据
      const excessData = await this.getExcessData(engineType, policy);
      if (excessData.length > 0) {
        const countCleanupResult = await this.cleanupExcessData(excessData);
        totalCleaned += countCleanupResult.count;
        totalSizeFreed += countCleanupResult.size;
      }

      // 3. 清理损坏的数据
      const corruptedData = await this.getCorruptedData(engineType);
      if (corruptedData.length > 0) {
        const corruptCleanupResult = await this.cleanupCorruptedData(corruptedData);
        totalCleaned += corruptCleanupResult.count;
        totalSizeFreed += corruptCleanupResult.size;
      }

      // 更新统计信息
      this.statistics.totalCleaned += totalCleaned;
      this.statistics.totalSizeFreed += totalSizeFreed;
      this.statistics.cleanupCount += 1;


    } catch (error) {
      console.error(`   ❌ ${engineType} 清理失败:`, error);
      this.statistics.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        type: 'engine_cleanup',
        engineType
      });
    }
  }

  /**
   * 获取过期数据
   */
  async getExpiredData(engineType, policy) {
    const now = new Date();
    const coldDataCutoff = new Date(now.getTime() - policy.coldData * 24 * 60 * 60 * 1000);
    void coldDataCutoff;

    // 这里应该查询数据库获取过期数据
    // 简化实现，实际应该连接数据库

    // 实际实现应该是：
    // const query = `
    //   SELECT id, session_id, created_at, 
    //          COALESCE(LENGTH(results), 0) as data_size
    //   FROM test_sessions 
    //   WHERE test_type = ? AND created_at < ?
    //   ORDER BY created_at ASC
    //   LIMIT ?
    // `;
    // return await db.query(query, [engineType, coldDataCutoff.toISOString(), this.config.cleanupBatchSize]);

    return []; // 模拟返回空数组
  }

  /**
   * 获取超量数据
   */
  async getExcessData(engineType, policy) {
    void engineType;
    void policy;
    // 查询超过最大记录数的数据

    // 实际实现应该是：
    // const query = `
    //   SELECT id, session_id, created_at,
    //          COALESCE(LENGTH(results), 0) as data_size
    //   FROM test_sessions 
    //   WHERE test_type = ?
    //   ORDER BY created_at ASC
    //   LIMIT ? OFFSET ?
    // `;
    // return await db.query(query, [engineType, this.config.cleanupBatchSize, policy.maxRecords]);

    return []; // 模拟返回空数组
  }

  /**
   * 获取损坏的数据
   */
  async getCorruptedData(engineType) {
    void engineType;
    // 查询损坏或无效的数据

    // 实际实现应该是：
    // const query = `
    //   SELECT id, session_id, created_at,
    //          COALESCE(LENGTH(results), 0) as data_size
    //   FROM test_sessions 
    //   WHERE test_type = ? AND (
    //     results IS NULL OR 
    //     results = '' OR 
    //     status = 'corrupted' OR
    //     JSON_VALID(results) = 0
    //   )
    //   LIMIT ?
    // `;
    // return await db.query(query, [engineType, this.config.cleanupBatchSize]);

    return []; // 模拟返回空数组
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(expiredData) {
    if (this.config.dryRun) {
      return { count: 0, size: 0 };
    }

    let cleanedCount = 0;
    let freedSize = 0;

    for (const data of expiredData) {
      try {
        // 删除数据库记录
        await this.deleteTestRecord(data.id);
        
        // 删除相关文件
        await this.deleteTestFiles(data.session_id);

        cleanedCount++;
        freedSize += data.data_size || 0;

      } catch (error) {
        console.warn(`     ⚠️ 删除记录 ${data.id} 失败:`, error.message);
      }
    }

    return { count: cleanedCount, size: freedSize };
  }

  /**
   * 清理超量数据
   */
  async cleanupExcessData(excessData) {
    if (this.config.dryRun) {
      return { count: 0, size: 0 };
    }

    let cleanedCount = 0;
    let freedSize = 0;

    // 优先删除最旧的数据
    const sortedData = excessData.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const data of sortedData) {
      try {
        await this.deleteTestRecord(data.id);
        await this.deleteTestFiles(data.session_id);

        cleanedCount++;
        freedSize += data.data_size || 0;

      } catch (error) {
        console.warn(`     ⚠️ 删除记录 ${data.id} 失败:`, error.message);
      }
    }

    return { count: cleanedCount, size: freedSize };
  }

  /**
   * 清理损坏数据
   */
  async cleanupCorruptedData(corruptedData) {
    if (this.config.dryRun) {
      return { count: 0, size: 0 };
    }

    let cleanedCount = 0;
    let freedSize = 0;

    for (const data of corruptedData) {
      try {
        await this.deleteTestRecord(data.id);
        await this.deleteTestFiles(data.session_id);

        cleanedCount++;
        freedSize += data.data_size || 0;

      } catch (error) {
        console.warn(`     ⚠️ 删除损坏记录 ${data.id} 失败:`, error.message);
      }
    }

    return { count: cleanedCount, size: freedSize };
  }

  /**
   * 删除测试记录
   */
  async deleteTestRecord(testId) {
    void testId;
    // 实际实现应该是：
    // await db.query('DELETE FROM test_results WHERE session_id = ?', [testId]);
    // await db.query('DELETE FROM test_sessions WHERE id = ?', [testId]);
    
  }

  /**
   * 删除测试文件
   */
  async deleteTestFiles(sessionId) {
    // 删除相关的文件（截图、报告等）
    const filePaths = [
      `./storage/screenshots/${sessionId}`,
      `./storage/reports/${sessionId}`,
      `./storage/traces/${sessionId}`
    ];

    for (const filePath of filePaths) {
      try {
        await fs.rmdir(filePath, { recursive: true });
      } catch (error) {
        void error;
        // 文件可能不存在，忽略错误
      }
    }
  }

  /**
   * 检查存储使用情况
   */
  async checkStorageUsage() {
    try {
      const usage = await this.calculateStorageUsage();
      
      if (usage.totalSize > this.config.maxStorageSize) {
        console.log('⚠️ 存储空间超过限制，触发紧急清理...');
        await this.runEmergencyCleanup();
      }

    } catch (error) {
      console.error('检查存储使用情况失败:', error);
    }
  }

  /**
   * 计算存储使用情况
   */
  async calculateStorageUsage() {
    // 这里应该查询数据库和文件系统计算实际使用量
    // 简化实现
    return {
      totalSize: 0,
      databaseSize: 0,
      fileSystemSize: 0
    };
  }

  /**
   * 运行紧急清理
   */
  async runEmergencyCleanup() {

    // 紧急清理策略：更激进的清理参数
    const emergencyPolicies = { ...this.config.retentionPolicies };
    
    // 将所有保留期减半
    Object.keys(emergencyPolicies).forEach(engineType => {
      emergencyPolicies[engineType].hotData = Math.floor(emergencyPolicies[engineType].hotData / 2);
      emergencyPolicies[engineType].warmData = Math.floor(emergencyPolicies[engineType].warmData / 2);
      emergencyPolicies[engineType].coldData = Math.floor(emergencyPolicies[engineType].coldData / 2);
      emergencyPolicies[engineType].maxRecords = Math.floor(emergencyPolicies[engineType].maxRecords / 2);
    });

    // 使用紧急策略执行清理
    const originalPolicies = this.config.retentionPolicies;
    this.config.retentionPolicies = emergencyPolicies;

    try {
      await this.runScheduledCleanup();
    } finally {
      this.config.retentionPolicies = originalPolicies;
    }
  }

  /**
   * 清理孤立文件
   */
  async cleanupOrphanedFiles() {
    // 实现孤立文件清理逻辑
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles() {
    // 实现临时文件清理逻辑
  }

  /**
   * 优化数据库
   */
  async optimizeDatabase() {
    console.log('🔧 优化数据库...');
    // 实现数据库优化逻辑
  }

  /**
   * 清理日志文件
   */
  async cleanupLogFiles() {
    // 实现日志文件清理逻辑
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * 手动触发清理
   */
  async manualCleanup(engineType = null) {
    if (this.isRunning) {
      throw new Error('清理任务正在运行中');
    }

    if (engineType) {
      
        return await this.cleanupEngineData(engineType);
      } else {
      return await this.runScheduledCleanup();
    }
  }

  /**
   * 设置清理策略
   */
  setRetentionPolicy(engineType, policy) {
    this.config.retentionPolicies[engineType] = { ...policy };
  }

  /**
   * 停止清理管理器
   */
  async shutdown() {
    this.isRunning = false;
    console.log('✅ 数据清理管理器已关闭');
  }
}

module.exports = { DataCleanupManager };
