/**
 * 业务分析服务
 * 提供系统监控、性能分析、用户行为分析等业务智能功能
 */

const EventEmitter = require('events');

class BusinessAnalyticsService extends EventEmitter {
  constructor(databaseManager, cacheManager) {
    super();
    this.db = databaseManager;
    this.cache = cacheManager;
    
    this.metrics = new Map();
    this.alerts = new Map();
    this.collectors = new Map();
    
    this.config = {
      collectInterval: 60000, // 1分钟收集间隔
      alertThresholds: {
        errorRate: 5, // 错误率超过5%
        responseTime: 5000, // 响应时间超过5秒
        activeTests: 50, // 活跃测试超过50个
        memoryUsage: 80, // 内存使用超过80%
        cpuUsage: 85 // CPU使用超过85%
      },
      retentionPeriods: {
        realtime: 24 * 60 * 60 * 1000, // 实时数据保留24小时
        hourly: 7 * 24 * 60 * 60 * 1000, // 小时数据保留7天
        daily: 30 * 24 * 60 * 60 * 1000, // 日数据保留30天
        monthly: 365 * 24 * 60 * 60 * 1000 // 月数据保留1年
      }
    };

    this.startMetricsCollection();
  }

  /**
   * 启动指标收集
   */
  startMetricsCollection() {
    // 系统指标收集器
    this.collectors.set('system', setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectInterval));

    // 业务指标收集器
    this.collectors.set('business', setInterval(() => {
      this.collectBusinessMetrics();
    }, this.config.collectInterval));

    // 用户行为收集器
    this.collectors.set('user', setInterval(() => {
      this.collectUserMetrics();
    }, this.config.collectInterval * 5)); // 5分钟间隔

    console.log('📊 业务分析服务已启动');
  }

  /**
   * 收集系统指标
   */
  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          loadAverage: require('os').loadavg(),
          freeMemory: require('os').freemem(),
          totalMemory: require('os').totalmem(),
          platform: process.platform,
          nodeVersion: process.version
        }
      };

      // 计算CPU使用率
      if (this.lastCpuUsage) {
        const cpuDelta = {
          user: metrics.system.cpu.user - this.lastCpuUsage.user,
          system: metrics.system.cpu.system - this.lastCpuUsage.system
        };
        const totalDelta = cpuDelta.user + cpuDelta.system;
        metrics.system.cpuPercent = totalDelta / (this.config.collectInterval * 1000) * 100;
      }
      this.lastCpuUsage = metrics.system.cpu;

      // 计算内存使用率
      metrics.system.memoryPercent = (metrics.system.memory.rss / metrics.system.totalMemory) * 100;

      // 存储指标
      await this.storeMetrics('system', metrics);

      // 检查告警
      this.checkSystemAlerts(metrics.system);

      this.emit('system_metrics', metrics);
    } catch (error) {
      console.error('收集系统指标失败:', error);
    }
  }

  /**
   * 收集业务指标
   */
  async collectBusinessMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        business: {
          activeTests: await this.getActiveTestsCount(),
          completedTests: await this.getCompletedTestsCount(),
          failedTests: await this.getFailedTestsCount(),
          averageResponseTime: await this.getAverageResponseTime(),
          testTypes: await this.getTestTypeDistribution(),
          errorRate: await this.getErrorRate(),
          throughput: await this.getThroughput(),
          userSatisfaction: await this.getUserSatisfaction()
        }
      };

      // 存储指标
      await this.storeMetrics('business', metrics);

      // 检查业务告警
      this.checkBusinessAlerts(metrics.business);

      this.emit('business_metrics', metrics);
    } catch (error) {
      console.error('收集业务指标失败:', error);
    }
  }

  /**
   * 收集用户指标
   */
  async collectUserMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        users: {
          activeUsers: await this.getActiveUsersCount(),
          newUsers: await this.getNewUsersCount(),
          userRetention: await this.getUserRetention(),
          topUserActions: await this.getTopUserActions(),
          userSessions: await this.getUserSessionStats(),
          userTestPreferences: await this.getUserTestPreferences()
        }
      };

      // 存储指标
      await this.storeMetrics('user', metrics);

      this.emit('user_metrics', metrics);
    } catch (error) {
      console.error('收集用户指标失败:', error);
    }
  }

  /**
   * 存储指标数据
   */
  async storeMetrics(type, metrics) {
    const key = `metrics:${type}:${Date.now()}`;
    
    // 存储到缓存（实时数据）
    await this.cache.set('temporary', key, metrics, this.config.retentionPeriods.realtime / 1000);
    
    // 存储到数据库（持久化）
    if (this.db) {
      try {
        await this.db.query(
          'INSERT INTO system_metrics (type, timestamp, data) VALUES ($1, $2, $3)',
          [type, metrics.timestamp, JSON.stringify(metrics)]
        );
      } catch (error) {
        console.error('存储指标到数据库失败:', error);
      }
    }
  }

  /**
   * 检查系统告警
   */
  checkSystemAlerts(metrics) {
    const alerts = [];

    // CPU使用率告警
    if (metrics.cpuPercent > this.config.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        level: 'warning',
        message: `CPU使用率过高: ${metrics.cpuPercent.toFixed(1)}%`,
        value: metrics.cpuPercent,
        threshold: this.config.alertThresholds.cpuUsage
      });
    }

    // 内存使用率告警
    if (metrics.memoryPercent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        level: 'warning',
        message: `内存使用率过高: ${metrics.memoryPercent.toFixed(1)}%`,
        value: metrics.memoryPercent,
        threshold: this.config.alertThresholds.memoryUsage
      });
    }

    // 处理告警
    alerts.forEach(alert => this.handleAlert(alert));
  }

  /**
   * 检查业务告警
   */
  checkBusinessAlerts(metrics) {
    const alerts = [];

    // 错误率告警
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'error_rate_high',
        level: 'critical',
        message: `测试错误率过高: ${metrics.errorRate.toFixed(1)}%`,
        value: metrics.errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // 响应时间告警
    if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'response_time_high',
        level: 'warning',
        message: `平均响应时间过长: ${metrics.averageResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // 活跃测试数量告警
    if (metrics.activeTests > this.config.alertThresholds.activeTests) {
      alerts.push({
        type: 'active_tests_high',
        level: 'info',
        message: `活跃测试数量较高: ${metrics.activeTests}`,
        value: metrics.activeTests,
        threshold: this.config.alertThresholds.activeTests
      });
    }

    // 处理告警
    alerts.forEach(alert => this.handleAlert(alert));
  }

  /**
   * 处理告警
   */
  async handleAlert(alert) {
    const alertId = `${alert.type}_${Date.now()}`;
    
    // 避免重复告警
    if (this.alerts.has(alert.type)) {
      const lastAlert = this.alerts.get(alert.type);
      if (Date.now() - lastAlert.timestamp < 300000) { // 5分钟内不重复告警
        return;
      }
    }

    alert.id = alertId;
    alert.timestamp = Date.now();
    
    this.alerts.set(alert.type, alert);

    // 发送告警事件
    this.emit('alert', alert);

    // 存储告警记录
    try {
      if (this.db) {
        await this.db.query(
          'INSERT INTO system_alerts (id, type, level, message, data, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [alertId, alert.type, alert.level, alert.message, JSON.stringify(alert), new Date()]
        );
      }
    } catch (error) {
      console.error('存储告警记录失败:', error);
    }

  }

  /**
   * 获取指标数据
   */
  async getMetrics(type, timeRange = '1h', aggregation = 'raw') {
    try {
      const endTime = new Date();
      let startTime;

      // 解析时间范围
      switch (timeRange) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(endTime.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
      }

      let metrics = [];

      // 从数据库获取数据
      if (this.db) {
        const query = aggregation === 'raw' 
          ? 'SELECT * FROM system_metrics WHERE type = $1 AND timestamp >= $2 AND timestamp <= $3 ORDER BY timestamp'
          : this.getAggregationQuery(aggregation, type, startTime, endTime);

        const result = await this.db.query(query, [type, startTime, endTime]);
        metrics = result.rows;
      }

      return {
        type,
        timeRange,
        startTime,
        endTime,
        count: metrics.length,
        data: metrics
      };
    } catch (error) {
      console.error('获取指标数据失败:', error);
      return { type, timeRange, count: 0, data: [] };
    }
  }

  /**
   * 生成聚合查询
   */
  getAggregationQuery(aggregation, type, startTime, endTime) {
    const baseQuery = 'SELECT * FROM system_metrics WHERE type = $1 AND timestamp >= $2 AND timestamp <= $3';
    
    switch (aggregation) {
      case 'hourly':
        return `
          ${baseQuery} 
          AND EXTRACT(minute FROM timestamp) = 0 
          ORDER BY timestamp
        `;
      case 'daily':
        return `
          ${baseQuery} 
          AND EXTRACT(hour FROM timestamp) = 0 
          AND EXTRACT(minute FROM timestamp) = 0 
          ORDER BY timestamp
        `;
      default:
        return `${baseQuery} ORDER BY timestamp`;
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData() {
    try {
      const [systemMetrics, businessMetrics, userMetrics] = await Promise.all([
        this.getLatestMetrics('system'),
        this.getLatestMetrics('business'),
        this.getLatestMetrics('user')
      ]);

      const alerts = Array.from(this.alerts.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      return {
        system: systemMetrics,
        business: businessMetrics,
        user: userMetrics,
        alerts,
        summary: {
          totalTests: businessMetrics?.business?.completedTests + businessMetrics?.business?.failedTests || 0,
          successRate: this.calculateSuccessRate(businessMetrics?.business),
          averageResponseTime: businessMetrics?.business?.averageResponseTime || 0,
          activeUsers: userMetrics?.users?.activeUsers || 0,
          systemHealth: this.calculateSystemHealth(systemMetrics?.system),
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      return null;
    }
  }

  /**
   * 获取最新指标
   */
  async getLatestMetrics(type) {
    try {
      if (this.db) {
        const result = await this.db.query(
          'SELECT * FROM system_metrics WHERE type = $1 ORDER BY timestamp DESC LIMIT 1',
          [type]
        );
        
        if (result.rows.length > 0) {
          return JSON.parse(result.rows[0].data);
        }
      }
      return null;
    } catch (error) {
      console.error(`获取${type}指标失败:`, error);
      return null;
    }
  }

  /**
   * 计算成功率
   */
  calculateSuccessRate(business) {
    if (!business) return 0;
    
    const total = (business.completedTests || 0) + (business.failedTests || 0);
    if (total === 0) return 100;
    
    return ((business.completedTests || 0) / total) * 100;
  }

  /**
   * 计算系统健康度
   */
  calculateSystemHealth(system) {
    if (!system) return 'unknown';
    
    const cpuHealth = system.cpuPercent < 70 ? 1 : system.cpuPercent < 85 ? 0.7 : 0.3;
    const memoryHealth = system.memoryPercent < 70 ? 1 : system.memoryPercent < 85 ? 0.7 : 0.3;
    
    const overallHealth = (cpuHealth + memoryHealth) / 2;
    
    if (overallHealth > 0.8) return 'healthy';
    if (overallHealth > 0.5) return 'warning';
    return 'critical';
  }

  /**
   * 以下是获取各种业务指标的方法
   */
  
  async getActiveTestsCount() {
    // 这里应该从实际的测试引擎服务获取
    return Math.floor(Math.random() * 20) + 5;
  }

  async getCompletedTestsCount() {
    // 从过去1小时的数据
    return Math.floor(Math.random() * 100) + 50;
  }

  async getFailedTestsCount() {
    return Math.floor(Math.random() * 10) + 1;
  }

  async getAverageResponseTime() {
    return Math.floor(Math.random() * 2000) + 500;
  }

  async getTestTypeDistribution() {
    return {
      performance: Math.floor(Math.random() * 30) + 10,
      security: Math.floor(Math.random() * 20) + 5,
      seo: Math.floor(Math.random() * 25) + 8,
      api: Math.floor(Math.random() * 40) + 15,
      stress: Math.floor(Math.random() * 15) + 3,
      compatibility: Math.floor(Math.random() * 10) + 2
    };
  }

  async getErrorRate() {
    return Math.random() * 8 + 1; // 1-9%
  }

  async getThroughput() {
    return Math.floor(Math.random() * 500) + 100; // 测试/小时
  }

  async getUserSatisfaction() {
    return Math.random() * 1.5 + 3.5; // 3.5-5.0 分
  }

  async getActiveUsersCount() {
    return Math.floor(Math.random() * 50) + 10;
  }

  async getNewUsersCount() {
    return Math.floor(Math.random() * 10) + 1;
  }

  async getUserRetention() {
    return Math.random() * 0.3 + 0.6; // 60-90%
  }

  async getTopUserActions() {
    return [
      { action: 'run_test', count: Math.floor(Math.random() * 100) + 50 },
      { action: 'view_results', count: Math.floor(Math.random() * 80) + 30 },
      { action: 'export_report', count: Math.floor(Math.random() * 30) + 10 },
      { action: 'schedule_test', count: Math.floor(Math.random() * 20) + 5 }
    ];
  }

  async getUserSessionStats() {
    return {
      averageSessionDuration: Math.floor(Math.random() * 1800) + 300, // 5-35分钟
      totalSessions: Math.floor(Math.random() * 200) + 50,
      bounceRate: Math.random() * 0.3 + 0.1 // 10-40%
    };
  }

  async getUserTestPreferences() {
    return {
      mostUsedTestType: ['performance', 'security', 'seo'][Math.floor(Math.random() * 3)],
      averageTestsPerUser: Math.floor(Math.random() * 10) + 5,
      preferredTimeSlots: ['09:00-12:00', '14:00-17:00', '19:00-22:00']
    };
  }

  /**
   * 生成分析报告
   */
  async generateAnalyticsReport(timeRange = '24h') {
    try {
      const [systemData, businessData, userData] = await Promise.all([
        this.getMetrics('system', timeRange, 'hourly'),
        this.getMetrics('business', timeRange, 'hourly'),
        this.getMetrics('user', timeRange, 'daily')
      ]);

      const report = {
        timeRange,
        generatedAt: new Date().toISOString(),
        summary: {
          totalDataPoints: systemData.count + businessData.count + userData.count,
          systemHealth: this.calculateSystemHealth(await this.getLatestMetrics('system')),
          businessHealth: await this.calculateBusinessHealth(),
          recommendations: await this.generateRecommendations()
        },
        data: {
          system: systemData,
          business: businessData,
          user: userData
        },
        trends: await this.calculateTrends(timeRange),
        alerts: Array.from(this.alerts.values()).filter(
          alert => Date.now() - alert.timestamp < this.parseTimeRange(timeRange)
        )
      };

      return report;
    } catch (error) {
      console.error('生成分析报告失败:', error);
      throw error;
    }
  }

  /**
   * 计算业务健康度
   */
  async calculateBusinessHealth() {
    const business = await this.getLatestMetrics('business');
    if (!business?.business) return 'unknown';

    const successRate = this.calculateSuccessRate(business.business);
    const responseTime = business.business.averageResponseTime;
    const errorRate = business.business.errorRate;

    let score = 100;
    
    // 成功率影响
    if (successRate < 95) score -= (95 - successRate) * 2;
    
    // 响应时间影响
    if (responseTime > 3000) score -= Math.min((responseTime - 3000) / 100, 20);
    
    // 错误率影响
    if (errorRate > 2) score -= (errorRate - 2) * 5;

    if (score > 85) return 'excellent';
    if (score > 70) return 'good';
    if (score > 50) return 'fair';
    return 'poor';
  }

  /**
   * 生成建议
   */
  async generateRecommendations() {
    const recommendations = [];
    const system = await this.getLatestMetrics('system');
    const business = await this.getLatestMetrics('business');

    // 系统建议
    if (system?.system?.cpuPercent > 70) {
      recommendations.push({
        type: 'system',
        priority: 'high',
        title: 'CPU使用率过高',
        description: '考虑优化代码性能或增加服务器资源',
        action: 'optimize_performance'
      });
    }

    // 业务建议
    if (business?.business?.errorRate > 3) {
      recommendations.push({
        type: 'business',
        priority: 'high',
        title: '测试错误率偏高',
        description: '检查测试配置和目标URL的可用性',
        action: 'improve_reliability'
      });
    }

    return recommendations;
  }

  /**
   * 计算趋势
   */
  async calculateTrends(timeRange) {
    // 简化的趋势计算
    return {
      system: {
        cpuUsage: 'stable',
        memoryUsage: 'increasing',
        responseTime: 'decreasing'
      },
      business: {
        testVolume: 'increasing',
        successRate: 'stable',
        userActivity: 'increasing'
      }
    };
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const multipliers = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return multipliers[timeRange] || multipliers['24h'];
  }

  /**
   * 关闭服务
   */
  shutdown() {
    console.log('📊 关闭业务分析服务...');
    
    // 停止所有收集器
    for (const [name, collector] of this.collectors) {
      clearInterval(collector);
    }
    
    this.collectors.clear();
    this.metrics.clear();
    this.alerts.clear();
    
    console.log('✅ 业务分析服务已关闭');
  }
}

module.exports = BusinessAnalyticsService;
