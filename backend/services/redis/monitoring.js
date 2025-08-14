/**
 * Redis缓存监控模块
 * 提供缓存统计、性能监控和健康检查功能
 */

const redisConnection = require('./connection');
const cacheService = require('./cache');
const keys = require('./keys');
const winston = require('winston');

class CacheMonitoring {
  constructor() {
    this.redis = redisConnection.getClient();
    this.isEnabled = process.env.REDIS_ENABLE_MONITORING === 'true';
    
    // 监控间隔（毫秒）
    this.monitoringInterval = 60000; // 1分钟
    this.healthCheckInterval = 30000; // 30秒
    
    // 性能阈值
    this.thresholds = {
      responseTime: 100, // 100ms
      memoryUsage: 80,   // 80%
      hitRate: 70,       // 70%
      errorRate: 5       // 5%
    };
    
    // 监控数据
    this.metrics = {
      responseTime: [],
      memoryUsage: [],
      hitRate: [],
      errorRate: [],
      connectionCount: [],
      keyCount: []
    };
    
    // 配置日志
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/cache-monitoring.log' }),
        new winston.transports.Console()
      ]
    });

    // 启动监控
    if (this.isEnabled) {
      this.startMonitoring();
    }
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    this.logger.info('启动Redis缓存监控');
    
    // 性能监控
    this.performanceMonitor = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringInterval);
    
    // 健康检查
    this.healthMonitor = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // 清理过期监控数据
    this.cleanupMonitor = setInterval(() => {
      this.cleanupMetrics();
    }, this.monitoringInterval * 10); // 10分钟清理一次
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }
    if (this.cleanupMonitor) {
      clearInterval(this.cleanupMonitor);
    }
    this.logger.info('Redis缓存监控已停止');
  }

  /**
   * 收集性能指标
   */
  async collectMetrics() {
    try {
      if (!redisConnection.isRedisConnected()) {
        return;
      }

      const timestamp = Date.now();
      
      // 响应时间测试
      const responseTime = await this.measureResponseTime();
      this.addMetric('responseTime', responseTime, timestamp);
      
      // 内存使用情况
      const memoryUsage = await this.getMemoryUsage();
      this.addMetric('memoryUsage', memoryUsage, timestamp);
      
      // 缓存命中率
      const hitRate = this.getHitRate();
      this.addMetric('hitRate', hitRate, timestamp);
      
      // 错误率
      const errorRate = this.getErrorRate();
      this.addMetric('errorRate', errorRate, timestamp);
      
      // 连接数
      const connectionCount = await this.getConnectionCount();
      this.addMetric('connectionCount', connectionCount, timestamp);
      
      // 键数量
      const keyCount = await this.getKeyCount();
      this.addMetric('keyCount', keyCount, timestamp);
      
      // 检查阈值
      this.checkThresholds();
      
    } catch (error) {
      this.logger.error('收集监控指标失败:', error);
    }
  }

  /**
   * 测量响应时间
   */
  async measureResponseTime() {
    const start = Date.now();
    try {
      await this.redis.ping();
      return Date.now() - start;
    } catch (error) {
      this.logger.error('响应时间测量失败:', error);
      return -1;
    }
  }

  /**
   * 获取内存使用情况
   */
  async getMemoryUsage() {
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      let usedMemory = 0;
      let maxMemory = 0;
      
      lines.forEach(line => {
        if (line.startsWith('used_memory:')) {
          usedMemory = parseInt(line.split(':')[1]);
        } else if (line.startsWith('maxmemory:')) {
          maxMemory = parseInt(line.split(':')[1]);
        }
      });
      
      if (maxMemory === 0) {
        return 0; // 无限制
      }
      
      return (usedMemory / maxMemory) * 100;
    } catch (error) {
      this.logger.error('获取内存使用情况失败:', error);
      return -1;
    }
  }

  /**
   * 获取缓存命中率
   */
  getHitRate() {
    const stats = cacheService.getStats();
    return parseFloat(stats.hitRate) || 0;
  }

  /**
   * 获取错误率
   */
  getErrorRate() {
    const stats = cacheService.getStats();
    const total = stats.hits + stats.misses + stats.sets + stats.deletes;
    return total > 0 ? (stats.errors / total) * 100 : 0;
  }

  /**
   * 获取连接数
   */
  async getConnectionCount() {
    try {
      const info = await this.redis.info('clients');
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line.startsWith('connected_clients:')) {
          return parseInt(line.split(':')[1]);
        }
      }
      return 0;
    } catch (error) {
      this.logger.error('获取连接数失败:', error);
      return -1;
    }
  }

  /**
   * 获取键数量
   */
  async getKeyCount() {
    try {
      const info = await this.redis.info('keyspace');
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
      this.logger.error('获取键数量失败:', error);
      return -1;
    }
  }

  /**
   * 添加监控指标
   */
  addMetric(type, value, timestamp) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }
    
    this.metrics[type].push({
      value,
      timestamp
    });
    
    // 保持最近1小时的数据
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    this.metrics[type] = this.metrics[type].filter(
      metric => metric.timestamp > oneHourAgo
    );
  }

  /**
   * 检查阈值
   */
  checkThresholds() {
    const latest = this.getLatestMetrics();
    
    // 检查响应时间
    if (latest.responseTime > this.thresholds.responseTime) {
      this.logger.warn(`Redis响应时间过高: ${latest.responseTime}ms`);
    }
    
    // 检查内存使用
    if (latest.memoryUsage > this.thresholds.memoryUsage) {
      this.logger.warn(`Redis内存使用过高: ${latest.memoryUsage}%`);
    }
    
    // 检查命中率
    if (latest.hitRate < this.thresholds.hitRate) {
      this.logger.warn(`缓存命中率过低: ${latest.hitRate}%`);
    }
    
    // 检查错误率
    if (latest.errorRate > this.thresholds.errorRate) {
      this.logger.warn(`缓存错误率过高: ${latest.errorRate}%`);
    }
  }

  /**
   * 获取最新指标
   */
  getLatestMetrics() {
    const latest = {};
    
    Object.keys(this.metrics).forEach(type => {
      const metrics = this.metrics[type];
      if (metrics.length > 0) {
        latest[type] = metrics[metrics.length - 1].value;
      } else {
        latest[type] = 0;
      }
    });
    
    return latest;
  }

  /**
   * 获取指标统计
   */
  getMetricStats(type, period = '1h') {
    const metrics = this.metrics[type] || [];
    if (metrics.length === 0) {
      return null;
    }
    
    // 计算时间范围
    const now = Date.now();
    const periodMs = this.parsePeriod(period);
    const startTime = now - periodMs;
    
    // 过滤时间范围内的数据
    const filteredMetrics = metrics.filter(
      metric => metric.timestamp >= startTime
    );
    
    if (filteredMetrics.length === 0) {
      return null;
    }
    
    const values = filteredMetrics.map(m => m.value);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1],
      period,
      startTime,
      endTime: now
    };
  }

  /**
   * 解析时间周期
   */
  parsePeriod(period) {
    const match = period.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // 默认1小时
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    try {
      const health = await redisConnection.healthCheck();
      
      // 缓存健康状态
      await cacheService.set(
        keys.monitoring.health(),
        health,
        { ttl: 60, type: 'monitoring' }
      );
      
      if (health.status !== 'connected') {
        this.logger.warn('Redis健康检查失败:', health);
      }
      
    } catch (error) {
      this.logger.error('健康检查失败:', error);
    }
  }

  /**
   * 清理过期监控数据
   */
  cleanupMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    Object.keys(this.metrics).forEach(type => {
      const originalLength = this.metrics[type].length;
      this.metrics[type] = this.metrics[type].filter(
        metric => metric.timestamp > oneHourAgo
      );
      
      const cleaned = originalLength - this.metrics[type].length;
      if (cleaned > 0) {
        this.logger.debug(`清理 ${type} 监控数据: ${cleaned} 条`);
      }
    });
  }

  /**
   * 获取完整监控报告
   */
  getMonitoringReport(period = '1h') {
    const report = {
      timestamp: Date.now(),
      period,
      connection: {
        isConnected: redisConnection.isRedisConnected(),
        isEnabled: this.isEnabled
      },
      cache: cacheService.getStats(),
      metrics: {},
      thresholds: this.thresholds,
      alerts: []
    };
    
    // 添加各项指标统计
    Object.keys(this.metrics).forEach(type => {
      report.metrics[type] = this.getMetricStats(type, period);
    });
    
    // 检查告警
    const latest = this.getLatestMetrics();
    if (latest.responseTime > this.thresholds.responseTime) {
      report.alerts.push({
        type: 'warning',
        metric: 'responseTime',
        message: `响应时间过高: ${latest.responseTime}ms`
      });
    }
    
    if (latest.memoryUsage > this.thresholds.memoryUsage) {
      report.alerts.push({
        type: 'warning',
        metric: 'memoryUsage',
        message: `内存使用过高: ${latest.memoryUsage}%`
      });
    }
    
    if (latest.hitRate < this.thresholds.hitRate) {
      report.alerts.push({
        type: 'info',
        metric: 'hitRate',
        message: `命中率偏低: ${latest.hitRate}%`
      });
    }
    
    return report;
  }
}

// 创建单例实例
const cacheMonitoring = new CacheMonitoring();

module.exports = cacheMonitoring;
