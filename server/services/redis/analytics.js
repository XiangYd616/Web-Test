/**
 * Redis缓存分析模块
 * 提供缓存使用分析和优化建议
 */

const cacheService = require('./cache');
const keys = require('./keys');
const redisConnection = require('./connection');
const winston = require('winston');

class CacheAnalytics {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/cache-analytics.log' }),
        new winston.transports.Console()
      ]
    });

    // 分析配置
    this.analysisConfig = {
      sampleSize: 1000,
      analysisInterval: 3600000, // 1小时
      retentionDays: 7
    };

    // 分析数据存储
    this.analysisData = {
      keyPatterns: new Map(),
      accessPatterns: new Map(),
      sizeDistribution: new Map(),
      ttlDistribution: new Map()
    };
  }

  /**
   * 执行完整的缓存分析
   */
  async performAnalysis() {
    if (!cacheService.isAvailable()) {
      this.logger.warn('Redis不可用，跳过缓存分析');
      return null;
    }

    this.logger.info('开始缓存分析...');
    
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        overview: await this.getOverviewAnalysis(),
        keyAnalysis: await this.analyzeKeys(),
        memoryAnalysis: await this.analyzeMemoryUsage(),
        performanceAnalysis: await this.analyzePerformance(),
        recommendations: []
      };

      // 生成优化建议
      analysis.recommendations = this.generateRecommendations(analysis);
      
      // 保存分析结果
      await this.saveAnalysisResult(analysis);
      
      this.logger.info('缓存分析完成');
      return analysis;
    } catch (error) {
      this.logger.error('缓存分析失败:', error);
      return null;
    }
  }

  /**
   * 获取概览分析
   */
  async getOverviewAnalysis() {
    try {
      const redis = redisConnection.getClient();
      const info = await redis.info();
      const stats = cacheService.getStats();
      
      // 解析Redis info
      const infoLines = info.split('\r\n');
      const infoData = {};
      
      infoLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoData[key] = value;
        }
      });

      return {
        connectionInfo: {
          connectedClients: parseInt(infoData.connected_clients) || 0,
          totalConnectionsReceived: parseInt(infoData.total_connections_received) || 0,
          totalCommandsProcessed: parseInt(infoData.total_commands_processed) || 0
        },
        memoryInfo: {
          usedMemory: parseInt(infoData.used_memory) || 0,
          usedMemoryHuman: infoData.used_memory_human || '0B',
          maxMemory: parseInt(infoData.maxmemory) || 0,
          memoryFragmentationRatio: parseFloat(infoData.mem_fragmentation_ratio) || 0
        },
        keyspaceInfo: {
          totalKeys: await this.getTotalKeys(),
          expiredKeys: parseInt(infoData.expired_keys) || 0,
          evictedKeys: parseInt(infoData.evicted_keys) || 0
        },
        cacheStats: stats
      };
    } catch (error) {
      this.logger.error('获取概览分析失败:', error);
      return {};
    }
  }

  /**
   * 分析缓存键
   */
  async analyzeKeys() {
    try {
      const redis = redisConnection.getClient();
      const namespaces = keys.getNamespaces();
      const keyAnalysis = {};

      for (const namespace of namespaces) {
        const pattern = keys.getNamespacePattern(namespace);
        const namespaceKeys = await redis.keys(pattern);
        
        keyAnalysis[namespace] = {
          count: namespaceKeys.length,
          sampleKeys: namespaceKeys.slice(0, 10),
          avgTtl: await this.getAverageTtl(namespaceKeys.slice(0, 100)),
          sizeEstimate: await this.estimateNamespaceSize(namespaceKeys.slice(0, 50))
        };
      }

      return keyAnalysis;
    } catch (error) {
      this.logger.error('键分析失败:', error);
      return {};
    }
  }

  /**
   * 分析内存使用
   */
  async analyzeMemoryUsage() {
    try {
      const redis = redisConnection.getClient();
      const memoryInfo = await redis.memory('usage');
      
      // 按数据类型分析内存使用
      const typeAnalysis = {};
      const sampleKeys = await redis.keys('*');
      const sampleSize = Math.min(sampleKeys.length, this.analysisConfig.sampleSize);
      
      for (let i = 0; i < sampleSize; i++) {
        const key = sampleKeys[i];
        const type = await redis.type(key);
        const memory = await redis.memory('usage', key);
        
        if (!typeAnalysis[type]) {
          typeAnalysis[type] = {
            count: 0,
            totalMemory: 0,
            avgMemory: 0
          };
        }
        
        typeAnalysis[type].count++;
        typeAnalysis[type].totalMemory += memory;
        typeAnalysis[type].avgMemory = typeAnalysis[type].totalMemory / typeAnalysis[type].count;
      }

      return {
        totalMemoryUsage: memoryInfo,
        typeDistribution: typeAnalysis,
        sampleSize,
        estimatedTotalKeys: sampleKeys.length
      };
    } catch (error) {
      this.logger.error('内存分析失败:', error);
      return {};
    }
  }

  /**
   * 分析性能
   */
  async analyzePerformance() {
    try {
      const stats = cacheService.getStats();
      const redis = redisConnection.getClient();
      
      // 测试响应时间
      const responseTimes = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await redis.ping();
        responseTimes.push(Date.now() - start);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      return {
        hitRate: parseFloat(stats.hitRate) || 0,
        totalOperations: stats.total,
        errorRate: stats.total > 0 ? (stats.errors / stats.total * 100) : 0,
        responseTime: {
          avg: avgResponseTime,
          min: minResponseTime,
          max: maxResponseTime,
          samples: responseTimes
        }
      };
    } catch (error) {
      this.logger.error('性能分析失败:', error);
      return {};
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    try {
      // 命中率建议
      if (analysis.performanceAnalysis.hitRate < 70) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          title: '缓存命中率偏低',
          description: `当前命中率为 ${analysis.performanceAnalysis.hitRate}%，建议检查缓存策略和TTL设置`,
          actions: [
            '增加缓存TTL时间',
            '优化缓存键生成策略',
            '预热热点数据'
          ]
        });
      }

      // 内存使用建议
      if (analysis.overview.memoryInfo.memoryFragmentationRatio > 1.5) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          title: '内存碎片率过高',
          description: `内存碎片率为 ${analysis.overview.memoryInfo.memoryFragmentationRatio}，建议进行内存整理`,
          actions: [
            '执行 MEMORY PURGE 命令',
            '考虑重启Redis服务',
            '优化数据结构使用'
          ]
        });
      }

      // 响应时间建议
      if (analysis.performanceAnalysis.responseTime.avg > 10) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: '响应时间较慢',
          description: `平均响应时间为 ${analysis.performanceAnalysis.responseTime.avg}ms`,
          actions: [
            '检查网络连接',
            '优化Redis配置',
            '考虑使用连接池'
          ]
        });
      }

      // 键数量建议
      const totalKeys = analysis.overview.keyspaceInfo.totalKeys;
      if (totalKeys > 100000) {
        recommendations.push({
          type: 'scalability',
          priority: 'low',
          title: '键数量较多',
          description: `当前有 ${totalKeys} 个键，建议考虑数据清理和分片`,
          actions: [
            '清理过期和无用的键',
            '实施数据分片策略',
            '考虑使用Redis集群'
          ]
        });
      }

      // 错误率建议
      if (analysis.performanceAnalysis.errorRate > 5) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          title: '错误率过高',
          description: `错误率为 ${analysis.performanceAnalysis.errorRate.toFixed(2)}%`,
          actions: [
            '检查错误日志',
            '优化错误处理机制',
            '增强监控和告警'
          ]
        });
      }

    } catch (error) {
      this.logger.error('生成建议失败:', error);
    }

    return recommendations;
  }

  /**
   * 获取总键数
   */
  async getTotalKeys() {
    try {
      const redis = redisConnection.getClient();
      const info = await redis.info('keyspace');
      const lines = info.split('\r\n');
      let totalKeys = 0;
      
      lines.forEach(line => {
        if (line.startsWith('db')) {
          const match = line.match(/keys=(\d+)/);
          if (match) {
            totalKeys += parseInt(match[1]);
          }
        }
      });
      
      return totalKeys;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取平均TTL
   */
  async getAverageTtl(keyList) {
    try {
      const redis = redisConnection.getClient();
      const ttls = [];
      
      for (const key of keyList.slice(0, 20)) {
        const ttl = await redis.ttl(key);
        if (ttl > 0) {
          ttls.push(ttl);
        }
      }
      
      return ttls.length > 0 ? ttls.reduce((a, b) => a + b, 0) / ttls.length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 估算命名空间大小
   */
  async estimateNamespaceSize(keyList) {
    try {
      const redis = redisConnection.getClient();
      let totalSize = 0;
      
      for (const key of keyList.slice(0, 10)) {
        const size = await redis.memory('usage', key);
        totalSize += size;
      }
      
      return keyList.length > 0 ? (totalSize / Math.min(keyList.length, 10)) * keyList.length : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 保存分析结果
   */
  async saveAnalysisResult(analysis) {
    try {
      const analysisKey = `analysis_${Date.now()}`;
      await cacheService.set(
        keys.monitoring.stats('analysis'),
        analysis,
        { ttl: 86400, type: 'monitoring' } // 保存24小时
      );
      
      this.logger.info(`分析结果已保存: ${analysisKey}`);
    } catch (error) {
      this.logger.error('保存分析结果失败:', error);
    }
  }

  /**
   * 获取历史分析结果
   */
  async getHistoricalAnalysis(days = 7) {
    try {
      const analysisKey = keys.monitoring.stats('analysis');
      const analysis = await cacheService.get(analysisKey);
      
      return analysis || null;
    } catch (error) {
      this.logger.error('获取历史分析失败:', error);
      return null;
    }
  }

  /**
   * 启动定期分析
   */
  startScheduledAnalysis(interval = 3600000) { // 1小时
    this.logger.info(`启动定期分析任务，间隔: ${interval}ms`);
    
    this.analysisInterval = setInterval(async () => {
      try {
        await this.performAnalysis();
      } catch (error) {
        this.logger.error('定期分析任务失败:', error);
      }
    }, interval);
  }

  /**
   * 停止定期分析
   */
  stopScheduledAnalysis() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      this.logger.info('定期分析任务已停止');
    }
  }

  /**
   * 生成分析报告
   */
  async generateReport(format = 'json') {
    const analysis = await this.performAnalysis();
    
    if (!analysis) {
      return null;
    }

    if (format === 'text') {
      return this.formatTextReport(analysis);
    }
    
    return analysis;
  }

  /**
   * 格式化文本报告
   */
  formatTextReport(analysis) {
    let report = '# Redis缓存分析报告\n\n';
    report += `生成时间: ${analysis.timestamp}\n\n`;
    
    // 概览
    report += '## 概览\n';
    report += `- 总键数: ${analysis.overview.keyspaceInfo.totalKeys}\n`;
    report += `- 内存使用: ${analysis.overview.memoryInfo.usedMemoryHuman}\n`;
    report += `- 命中率: ${analysis.performanceAnalysis.hitRate}%\n`;
    report += `- 平均响应时间: ${analysis.performanceAnalysis.responseTime.avg}ms\n\n`;
    
    // 建议
    if (analysis.recommendations.length > 0) {
      report += '## 优化建议\n';
      analysis.recommendations.forEach((rec, index) => {
        report += `${index + 1}. **${rec.title}** (${rec.priority})\n`;
        report += `   ${rec.description}\n`;
        rec.actions.forEach(action => {
          report += `   - ${action}\n`;
        });
        report += '\n';
      });
    }
    
    return report;
  }
}

// 创建单例实例
const cacheAnalytics = new CacheAnalytics();

module.exports = cacheAnalytics;
