/**
 * 数据归档管理器
 * 处理测试数据的生命周期管理和归档
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const tar = require('tar');
const cron = require('node-cron');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

class DataArchiveManager {
  constructor(config = {}) {
    this.config = {
      archivePath: config.archivePath || './archives',
      tempPath: config.tempPath || './temp',
      compressionLevel: config.compressionLevel || 9,
      batchSize: config.batchSize || 1000,
      maxArchiveSize: config.maxArchiveSize || 1024 * 1024 * 1024, // 1GB
      scheduleEnabled: config.scheduleEnabled !== false,
      ...config
    };

    this.isRunning = false;
    this.archiveJobs = new Map();
    this.statistics = {
      totalArchived: 0,
      totalSize: 0,
      lastArchiveTime: null,
      archiveCount: 0
    };

    if (this.config.scheduleEnabled) {
      this.initializeScheduler();
    }
  }

  /**
   * 初始化定时任务
   */
  initializeScheduler() {
    // 每天凌晨2点执行归档任务
    cron.schedule('0 2 * * *', async () => {
      await this.runScheduledArchive();
    });

    // 每周日凌晨3点执行深度归档
    cron.schedule('0 3 * * 0', async () => {
      await this.runDeepArchive();
    });

  }

  /**
   * 执行定时归档
   */
  async runScheduledArchive() {
    if (this.isRunning) {
      
        console.log('⚠️ 归档任务正在运行中，跳过本次执行');
      return;
      }

    try {
      this.isRunning = true;
      
      // 获取需要归档的数据
      const archiveCandidates = await this.getArchiveCandidates();
      
      for (const candidate of archiveCandidates) {
        await this.archiveEngineData(candidate.engineType, candidate.criteria);
      }

      this.statistics.lastArchiveTime = new Date().toISOString();
      console.log('✅ 定时归档任务完成');

    } catch (error) {
      console.error('❌ 定时归档任务失败:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 执行深度归档
   */
  async runDeepArchive() {
    try {
      // 压缩旧的归档文件
      await this.compressOldArchives();
      
      // 清理临时文件
      await this.cleanupTempFiles();
      
      // 生成归档报告
      await this.generateArchiveReport();

      console.log('✅ 深度归档任务完成');

    } catch (error) {
      console.error('❌ 深度归档任务失败:', error);
    }
  }

  /**
   * 归档特定引擎的数据
   */
  async archiveEngineData(engineType, criteria = {}) {

    try {
      // 获取需要归档的数据
      const dataToArchive = await this.getDataToArchive(engineType, criteria);
      
      if (dataToArchive.length === 0) {
        return;
      }

      // 创建归档文件
      const archiveInfo = await this.createArchive(engineType, dataToArchive);
      
      // 验证归档完整性
      await this.verifyArchive(archiveInfo);
      
      // 删除原始数据
      await this.removeArchivedData(dataToArchive);
      
      // 更新统计信息
      this.updateStatistics(archiveInfo);

      
      return archiveInfo;

    } catch (error) {
      console.error(`   ❌ ${engineType} 引擎数据归档失败:`, error);
      throw error;
    }
  }

  /**
   * 获取归档候选数据
   */
  async getArchiveCandidates() {
    const candidates = [];
    const now = new Date();

    // 各引擎的归档策略
    const archiveStrategies = {
      performance: { days: 30, priority: 'high' },
      stress: { days: 15, priority: 'high' },
      compatibility: { days: 45, priority: 'medium' },
      security: { days: 90, priority: 'low' },
      ux: { days: 30, priority: 'medium' },
      website: { days: 45, priority: 'medium' },
      api: { days: 30, priority: 'medium' },
      seo: { days: 60, priority: 'low' }
    };

    for (const [engineType, strategy] of Object.entries(archiveStrategies)) {
      const cutoffDate = new Date(now.getTime() - strategy.days * 24 * 60 * 60 * 1000);
      
      candidates.push({
        engineType,
        criteria: {
          beforeDate: cutoffDate.toISOString(),
          priority: strategy.priority
        }
      });
    }

    return candidates;
  }

  /**
   * 获取需要归档的数据
   */
  async getDataToArchive(_engineType, _criteria) {
    // 这里应该查询数据库获取符合条件的数据
    // 简化实现，实际应该连接数据库
    
    const mockData = [];
    
    // 模拟查询逻辑
    
    // 实际实现应该是：
    // const query = `
    //   SELECT * FROM test_sessions 
    //   WHERE test_type = ? AND created_at < ? 
    //   ORDER BY created_at ASC 
    //   LIMIT ?
    // `;
    // const data = await db.query(query, [engineType, criteria.beforeDate, this.config.batchSize]);
    
    return mockData;
  }

  /**
   * 创建归档文件
   */
  async createArchive(engineType, dataToArchive) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${engineType}-archive-${timestamp}.tar.gz`;
    const archivePath = path.join(this.config.archivePath, filename);
    const tempDir = path.join(this.config.tempPath, `archive-${timestamp}`);

    try {
      // 创建临时目录
      await fs.mkdir(tempDir, { recursive: true });
      await fs.mkdir(this.config.archivePath, { recursive: true });

      // 准备归档数据
      const archiveData = {
        metadata: {
          engineType,
          archiveDate: new Date().toISOString(),
          recordCount: dataToArchive.length,
          version: '1.0'
        },
        data: dataToArchive
      };

      // 写入临时文件
      const dataFile = path.join(tempDir, 'data.json');
      await fs.writeFile(dataFile, JSON.stringify(archiveData, null, 2));

      // 创建tar.gz归档
      await tar.create(
        {
          gzip: { level: this.config.compressionLevel },
          file: archivePath,
          cwd: tempDir
        },
        ['data.json']
      );

      // 获取文件信息
      const stats = await fs.stat(archivePath);

      // 清理临时文件
      await fs.rmdir(tempDir, { recursive: true });

      return {
        filename,
        path: archivePath,
        size: stats.size,
        recordCount: dataToArchive.length,
        engineType,
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      // 清理临时文件
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * 验证归档完整性
   */
  async verifyArchive(archiveInfo) {
    try {
      // 读取归档文件
      const tempDir = path.join(this.config.tempPath, `verify-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // 解压归档
      await tar.extract({
        file: archiveInfo.path,
        cwd: tempDir
      });

      // 验证数据文件
      const dataFile = path.join(tempDir, 'data.json');
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));

      // 验证记录数量
      if (data.data.length !== archiveInfo.recordCount) {
        throw new Error(`记录数量不匹配: 期望 ${archiveInfo.recordCount}, 实际 ${data.data.length}`);
      }

      // 验证元数据
      if (data.metadata.engineType !== archiveInfo.engineType) {
        throw new Error(`引擎类型不匹配: 期望 ${archiveInfo.engineType}, 实际 ${data.metadata.engineType}`);
      }

      // 清理验证临时文件
      await fs.rmdir(tempDir, { recursive: true });


    } catch (error) {
      console.error(`   ❌ 归档文件验证失败: ${archiveInfo.filename}`, error);
      throw error;
    }
  }

  /**
   * 删除已归档的数据
   */
  async removeArchivedData(_dataToArchive) {
    // 这里应该从数据库中删除已归档的数据
    // 实际实现应该是批量删除操作
    
    
    // 实际实现应该是：
    // const testIds = dataToArchive.map(item => item.id);
    // await db.query('DELETE FROM test_sessions WHERE id IN (?)', [testIds]);
    // await db.query('DELETE FROM test_results WHERE session_id IN (?)', [testIds]);
  }

  /**
   * 更新统计信息
   */
  updateStatistics(archiveInfo) {
    this.statistics.totalArchived += archiveInfo.recordCount;
    this.statistics.totalSize += archiveInfo.size;
    this.statistics.archiveCount += 1;
    this.statistics.lastArchiveTime = archiveInfo.createdAt;
  }

  /**
   * 压缩旧的归档文件
   */
  async compressOldArchives() {

    try {
      const archiveFiles = await fs.readdir(this.config.archivePath);
      const oldArchives = archiveFiles.filter(file => {
        const filePath = path.join(this.config.archivePath, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays > 90 && !file.endsWith('.compressed');
      });

      for (const archiveFile of oldArchives) {
        await this.compressArchiveFile(archiveFile);
      }


    } catch (error) {
      console.error('   ❌ 压缩旧归档文件失败:', error);
    }
  }

  /**
   * 压缩单个归档文件
   */
  async compressArchiveFile(filename) {
    const filePath = path.join(this.config.archivePath, filename);
    const compressedPath = `${filePath}.compressed`;

    try {
      const data = await fs.readFile(filePath);
      const compressed = await gzip(data, { level: 9 });
      await fs.writeFile(compressedPath, compressed);
      await fs.unlink(filePath);


    } catch (error) {
      console.error(`   ❌ 压缩失败: ${filename}`, error);
    }
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles() {

    try {
      const tempFiles = await fs.readdir(this.config.tempPath);
      let _cleanedCount = 0;

      for (const tempFile of tempFiles) {
        const tempFilePath = path.join(this.config.tempPath, tempFile);
        const stats = await fs.stat(tempFilePath);
        
        // 删除超过24小时的临时文件
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.rmdir(tempFilePath, { recursive: true });
          _cleanedCount++;
        }
      }


    } catch (error) {
      console.error('   ❌ 清理临时文件失败:', error);
    }
  }

  /**
   * 生成归档报告
   */
  async generateArchiveReport() {
    console.log('📊 生成归档报告...');

    try {
      const report = {
        generatedAt: new Date().toISOString(),
        statistics: this.statistics,
        archiveFiles: await this.getArchiveFileList(),
        storageUsage: await this.calculateStorageUsage(),
        recommendations: this.generateRecommendations()
      };

      const reportPath = path.join(this.config.archivePath, 'archive-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));


    } catch (error) {
      console.error('   ❌ 生成归档报告失败:', error);
    }
  }

  /**
   * 获取归档文件列表
   */
  async getArchiveFileList() {
    try {
      const files = await fs.readdir(this.config.archivePath);
      const archiveFiles = [];

      for (const file of files) {
        if (file.endsWith('.tar.gz') || file.endsWith('.compressed')) {
          const filePath = path.join(this.config.archivePath, file);
          const stats = await fs.stat(filePath);
          
          archiveFiles.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
          });
        }
      }

      return archiveFiles;

    } catch (error) {
      console.error('获取归档文件列表失败:', error);
      return [];
    }
  }

  /**
   * 计算存储使用情况
   */
  async calculateStorageUsage() {
    try {
      const archiveFiles = await this.getArchiveFileList();
      const totalSize = archiveFiles.reduce((sum, file) => sum + file.size, 0);

      return {
        totalFiles: archiveFiles.length,
        totalSize,
        averageFileSize: archiveFiles.length > 0 ? totalSize / archiveFiles.length : 0,
        oldestArchive: archiveFiles.length > 0 ? 
          Math.min(...archiveFiles.map(f => new Date(f.createdAt).getTime())) : null,
        newestArchive: archiveFiles.length > 0 ? 
          Math.max(...archiveFiles.map(f => new Date(f.createdAt).getTime())) : null
      };

    } catch (error) {
      console.error('计算存储使用情况失败:', error);
      return {};
    }
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.statistics.totalSize > this.config.maxArchiveSize) {
      recommendations.push({
        type: 'storage',
        message: '归档文件总大小超过限制，建议清理旧的归档文件',
        priority: 'high'
      });
    }

    if (this.statistics.archiveCount > 100) {
      recommendations.push({
        type: 'maintenance',
        message: '归档文件数量较多，建议定期合并旧的归档文件',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return { ...this.statistics };
  }

  /**
   * 手动触发归档
   */
  async manualArchive(engineType, criteria = {}) {
    if (this.isRunning) {
      throw new Error('归档任务正在运行中');
    }

    return await this.archiveEngineData(engineType, criteria);
  }

  /**
   * 停止归档管理器
   */
  async shutdown() {
    this.isRunning = false;
    // 这里可以添加清理逻辑
    console.log('✅ 数据归档管理器已关闭');
  }
}

module.exports = { DataArchiveManager };
