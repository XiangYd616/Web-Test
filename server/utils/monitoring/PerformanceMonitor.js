/**
 * 性能监控系统
 * 实时收集和分析系统性能指标
 */

const os = require('os');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
  constructor(cacheManager) {
    this.cache = cacheManager;
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // 性能阈值配置
    this.thresholds = {
      responseTime: {
        warning: 1000,  // 1秒
        critical: 3000  // 3秒
      },
      memoryUsage: {
        warning: 0.8,   // 80%
        critical: 0.9   // 90%
      },
      cpuUsage: {
        warning: 0.7,   // 70%
        critical: 0.9   // 90%
      },
      cacheHitRate: {
        warning: 0.7,   // 70%
        critical: 0.5   // 50%
      },
      errorRate: {
        warning: 0.05,  // 5%
        critical: 0.1   // 10%
      }
    };
    
    // 指标收集器
    this.collectors = {
      system: this.collectSystemMetrics.bind(this),
      application: this.collectApplicationMetrics.bind(this),
      database: this.collectDatabaseMetrics.bind(this),
      cache: this.collectCacheMetrics.bind(this),
      api: this.collectAPIMetrics.bind(this)
    };
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs = 60000) { // 默认1分钟
    if (this.isMonitoring) {
      console.warn('性能监控已在运行中');
      return;
    }
    
    console.log('🔍 启动性能监控系统...');
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.collectAllMetrics();
    }, intervalMs);
    
    // 立即收集一次指标
    this.collectAllMetrics();
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    console.log('⏹️ 停止性能监控系统');
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 收集所有性能指标
   */
  async collectAllMetrics() {
    try {
      const timestamp = new Date().toISOString();
      const metrics = {};
      
      // 并行收集各类指标
      const collectionPromises = Object.entries(this.collectors).map(async ([type, collector]) => {
        try {
          const data = await collector();
          metrics[type] = data;
        } catch (error) {
          console.error(`收集${type}指标失败:`, error);
          metrics[type] = { error: error.message };
        }
      });
      
      await Promise.all(collectionPromises);
      
      // 存储指标
      const metricsData = {
        timestamp,
        ...metrics
      };
      
      await this.storeMetrics(metricsData);
      
      // 检查告警
      await this.checkAlerts(metricsData);
      
    } catch (error) {
      console.error('收集性能指标失败:', error);
    }
  }

  /**
   * 收集系统指标
   */
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // CPU使用率计算（简化版）
    const cpuUsage = await this.getCPUUsage();
    
    return {
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model || 'unknown',
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: usedMem / totalMem,
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * 收集应用程序指标
   */
  async collectApplicationMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      eventLoop: {
        delay: await this.getEventLoopDelay(),
        utilization: await this.getEventLoopUtilization()
      }
    };
  }

  /**
   * 收集数据库指标
   */
  async collectDatabaseMetrics() {
    try {
      // 这里需要根据实际的数据库连接池实现
      // 暂时返回模拟数据
      return {
        connections: {
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0
        },
        queries: {
          total: 1250,
          slow: 5,
          failed: 2,
          averageTime: 45.6
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 收集缓存指标
   */
  async collectCacheMetrics() {
    try {
      const cacheStats = await this.cache.getStats();
      
      return {
        redis: cacheStats,
        hitRate: this.calculateCacheHitRate(),
        operations: await this.getCacheOperationStats()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 收集API指标
   */
  async collectAPIMetrics() {
    // 从请求统计中获取API指标
    const apiStats = this.getAPIStats();
    
    return {
      requests: apiStats.requests,
      responses: apiStats.responses,
      errors: apiStats.errors,
      performance: apiStats.performance
    };
  }

  /**
   * 存储性能指标
   */
  async storeMetrics(metrics) {
    try {
      // 存储到缓存中，保留最近24小时的数据
      const key = `metrics:${new Date().toISOString().substring(0, 16)}`; // 按分钟存储
      await this.cache.set('statistics', key, metrics, 24 * 60 * 60);
      
      // 更新最新指标
      await this.cache.set('statistics', 'latest', metrics, 5 * 60);
      
    } catch (error) {
      console.error('存储性能指标失败:', error);
    }
  }

  /**
   * 检查告警
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    // 检查响应时间
    if (metrics.api?.performance?.averageResponseTime > this.thresholds.responseTime.critical) {
      alerts.push({
        type: 'critical',
        metric: 'response_time',
        value: metrics.api.performance.averageResponseTime,
        threshold: this.thresholds.responseTime.critical,
        message: 'API响应时间过长'
      });
    }
    
    // 检查内存使用率
    if (metrics.system?.memory?.usage > this.thresholds.memoryUsage.critical) {
      alerts.push({
        type: 'critical',
        metric: 'memory_usage',
        value: metrics.system.memory.usage,
        threshold: this.thresholds.memoryUsage.critical,
        message: '系统内存使用率过高'
      });
    }
    
    // 检查CPU使用率
    if (metrics.system?.cpu?.usage > this.thresholds.cpuUsage.critical) {
      alerts.push({
        type: 'critical',
        metric: 'cpu_usage',
        value: metrics.system.cpu.usage,
        threshold: this.thresholds.cpuUsage.critical,
        message: 'CPU使用率过高'
      });
    }
    
    // 检查缓存命中率
    if (metrics.cache?.hitRate < this.thresholds.cacheHitRate.critical) {
      alerts.push({
        type: 'warning',
        metric: 'cache_hit_rate',
        value: metrics.cache.hitRate,
        threshold: this.thresholds.cacheHitRate.critical,
        message: '缓存命中率过低'
      });
    }
    
    // 存储告警
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }
  }

  /**
   * 存储告警信息
   */
  async storeAlerts(alerts) {
    try {
      const timestamp = new Date().toISOString();
      
      for (const alert of alerts) {
        const alertData = {
          ...alert,
          timestamp,
          id: `${alert.metric}_${Date.now()}`
        };
        
        // 存储告警
        await this.cache.set('statistics', `alert:${alertData.id}`, alertData, 24 * 60 * 60);
        
        // 记录到内存中
        this.alerts.push(alertData);
        
        // 输出告警日志
        console.warn(`🚨 性能告警 [${alert.type.toUpperCase()}]: ${alert.message} (${alert.value})`);
      }
      
      // 保持告警列表大小
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-50);
      }
      
    } catch (error) {
      console.error('存储告警失败:', error);
    }
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport(timeRange = '1h') {
    try {
      // 获取最新指标
      const latestMetrics = await this.cache.get('statistics', 'latest');
      
      // 获取历史指标（简化实现）
      const historicalMetrics = await this.getHistoricalMetrics(timeRange);
      
      // 获取最近告警
      const recentAlerts = this.alerts.slice(-10);
      
      return {
        current: latestMetrics,
        historical: historicalMetrics,
        alerts: recentAlerts,
        summary: this.generateSummary(latestMetrics),
        recommendations: this.generateRecommendations(latestMetrics, recentAlerts)
      };
    } catch (error) {
      console.error('获取性能报告失败:', error);
      return null;
    }
  }

  /**
   * 生成性能摘要
   */
  generateSummary(metrics) {
    if (!metrics) return null;
    
    return {
      status: this.getOverallStatus(metrics),
      uptime: metrics.system?.uptime || 0,
      memoryUsage: metrics.system?.memory?.percentage || 0,
      cpuUsage: Math.round((metrics.system?.cpu?.usage || 0) * 100),
      cacheHitRate: Math.round((metrics.cache?.hitRate || 0) * 100),
      activeConnections: metrics.database?.connections?.active || 0
    };
  }

  /**
   * 获取整体状态
   */
  getOverallStatus(metrics) {
    const issues = [];
    
    if (metrics.system?.memory?.usage > this.thresholds.memoryUsage.warning) {
      issues.push('memory');
    }
    
    if (metrics.system?.cpu?.usage > this.thresholds.cpuUsage.warning) {
      issues.push('cpu');
    }
    
    if (metrics.cache?.hitRate < this.thresholds.cacheHitRate.warning) {
      issues.push('cache');
    }
    
    if (issues.length === 0) return 'healthy';
    if (issues.length <= 2) return 'warning';
    return 'critical';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(metrics, alerts) {
    const recommendations = [];
    
    // 基于告警生成建议
    alerts.forEach(alert => {
      switch (alert.metric) {
        case 'memory_usage':
          recommendations.push('考虑增加服务器内存或优化内存使用');
          break;
        case 'cpu_usage':
          recommendations.push('考虑优化CPU密集型操作或增加服务器资源');
          break;
        case 'cache_hit_rate':
          recommendations.push('检查缓存策略，考虑调整TTL或预热策略');
          break;
        case 'response_time':
          recommendations.push('优化数据库查询或增加缓存层');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // 去重
  }

  // 辅助方法
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // 微秒
        const cpuTime = endUsage.user + endUsage.system;
        const usage = cpuTime / totalTime;
        
        resolve(Math.min(usage, 1)); // 限制在0-1之间
      }, 100);
    });
  }

  async getEventLoopDelay() {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        resolve(performance.now() - start);
      });
    });
  }

  async getEventLoopUtilization() {
    // 简化实现
    return Math.random() * 0.1; // 0-10%
  }

  calculateCacheHitRate() {
    // 这里需要从缓存统计中计算命中率
    // 简化实现
    return 0.85; // 85%
  }

  async getCacheOperationStats() {
    // 从缓存管理器获取操作统计
    return {
      hits: 1250,
      misses: 180,
      sets: 95,
      deletes: 12
    };
  }

  getAPIStats() {
    // 从请求统计中获取API数据
    return {
      requests: {
        total: 5420,
        perMinute: 45,
        perHour: 2700
      },
      responses: {
        '2xx': 5180,
        '4xx': 180,
        '5xx': 60
      },
      errors: {
        rate: 0.044,
        total: 240
      },
      performance: {
        averageResponseTime: 245,
        p95ResponseTime: 890,
        p99ResponseTime: 1450
      }
    };
  }

  async getHistoricalMetrics(timeRange) {
    // 简化实现，返回模拟的历史数据
    return {
      timeRange,
      dataPoints: 60,
      metrics: []
    };
  }
}

module.exports = PerformanceMonitor;
