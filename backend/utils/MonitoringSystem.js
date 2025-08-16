/**
 * 监控系统
 * 本地化程度：100%
 * 提供系统性能监控、健康检查、指标收集等功能
 */

const os = require('os');
const process = require('process');
const Logger = require('./logger');
const { getDatabaseStatus } = require('../config/database');
const CommonUtils = require('./commonUtils');

class MonitoringSystem {
  constructor() {
    this.metrics = {
      system: {},
      application: {},
      database: {},
      tests: {}
    };

    this.alerts = [];
    this.thresholds = {
      cpu: 80,           // CPU使用率阈值
      memory: 85,        // 内存使用率阈值
      disk: 90,          // 磁盘使用率阈值
      responseTime: 5000, // 响应时间阈值(ms)
      errorRate: 5       // 错误率阈值(%)
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.collectInterval = 60000; // 1分钟收集一次
  }

  /**
   * 启动监控
   */
  start() {
    if (this.isMonitoring) {
      
        Logger.warn('监控系统已在运行');
      return;
      }

    Logger.info('启动系统监控');
    this.isMonitoring = true;

    // 立即收集一次指标
    this.collectMetrics();

    // 定期收集指标
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.collectInterval);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isMonitoring) {
      
        return;
      }

    Logger.info('停止系统监控');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 收集系统指标
   */
  async collectMetrics() {
    try {
      const timestamp = new Date().toISOString();

      // 收集系统指标
      this.metrics.system = {
        timestamp,
        cpu: this.getCpuUsage(),
        memory: this.getMemoryUsage(),
        disk: this.getDiskUsage(),
        network: this.getNetworkInfo(),
        uptime: process.uptime(),
        loadAverage: os.loadavg()
      };

      // 收集应用指标
      this.metrics.application = {
        timestamp,
        nodeVersion: process.version,
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length
      };

      // 收集数据库指标
      this.metrics.database = await this.getDatabaseMetrics();

      // 检查告警
      this.checkAlerts();

      Logger.debug('系统指标收集完成', {
        cpu: this.metrics.system.cpu.usage,
        memory: this.metrics.system.memory.usage,
        database: this.metrics.database.isConnected
      });

    } catch (error) {
      Logger.error('收集系统指标失败', error);
    }
  }

  /**
   * 获取CPU使用率
   */
  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return {
      usage,
      cores: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed
    };
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    return {
      total,
      free,
      used,
      usage: Math.round(usage * 100) / 100
    };
  }

  /**
   * 获取磁盘使用情况
   */
  getDiskUsage() {
    // 简化的磁盘使用情况（实际项目中可能需要更复杂的实现）
    return {
      usage: 0, // 需要实际实现
      total: 0,
      free: 0,
      used: 0
    };
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {};

    for (const [name, addresses] of Object.entries(interfaces)) {
      networkInfo[name] = addresses.filter(addr => !addr.internal);
    }

    return networkInfo;
  }

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics() {
    try {
      const status = await getDatabaseStatus();
      return {
        isConnected: status.isConnected,
        connectionPool: status.pool || {},
        stats: status.stats || {},
        lastError: status.stats?.lastError || null
      };
    } catch (error) {
      return {
        isConnected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查告警
   */
  checkAlerts() {
    const alerts = [];

    // CPU告警
    if (this.metrics.system.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `CPU使用率过高: ${this.metrics.system.cpu.usage}%`,
        threshold: this.thresholds.cpu,
        current: this.metrics.system.cpu.usage,
        timestamp: new Date().toISOString()
      });
    }

    // 内存告警
    if (this.metrics.system.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `内存使用率过高: ${this.metrics.system.memory.usage}%`,
        threshold: this.thresholds.memory,
        current: this.metrics.system.memory.usage,
        timestamp: new Date().toISOString()
      });
    }

    // 数据库连接告警
    if (!this.metrics.database.isConnected) {
      alerts.push({
        type: 'database',
        level: 'critical',
        message: '数据库连接失败',
        timestamp: new Date().toISOString()
      });
    }

    // 记录新告警
    alerts.forEach(alert => {
      if (!this.isDuplicateAlert(alert)) {
        this.alerts.push(alert);
        Logger.warn('系统告警', alert);
      }
    });

    // 清理旧告警（保留最近100条）
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * 检查是否为重复告警
   */
  isDuplicateAlert(newAlert) {
    const recentAlerts = this.alerts.slice(-10); // 检查最近10条告警
    return recentAlerts.some(alert =>
      alert.type === newAlert.type &&
      alert.level === newAlert.level &&
      Date.now() - new Date(alert.timestamp).getTime() < 300000 // 5分钟内
    );
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        cpu: this.metrics.system.cpu?.usage < this.thresholds.cpu,
        memory: this.metrics.system.memory?.usage < this.thresholds.memory,
        database: this.metrics.database?.isConnected === true
      },
      metrics: this.metrics,
      alerts: this.alerts.slice(-10) // 最近10条告警
    };

    // 确定整体健康状态
    const criticalAlerts = this.alerts.filter(alert =>
      alert.level === 'critical' &&
      Date.now() - new Date(alert.timestamp).getTime() < 300000
    );

    const warningAlerts = this.alerts.filter(alert =>
      alert.level === 'warning' &&
      Date.now() - new Date(alert.timestamp).getTime() < 300000
    );

    if (criticalAlerts.length > 0) {
      health.status = 'critical';
    } else if (warningAlerts.length > 0) {
      health.status = 'warning';
    } else if (!health.checks.database) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      timestamp: new Date().toISOString(),
      system: {
        cpu: this.metrics.system.cpu,
        memory: this.metrics.system.memory,
        uptime: this.metrics.system.uptime
      },
      application: {
        memoryUsage: this.metrics.application.memoryUsage,
        activeHandles: this.metrics.application.activeHandles,
        activeRequests: this.metrics.application.activeRequests
      },
      database: this.metrics.database
    };
  }

  /**
   * 记录测试指标
   */
  recordTestMetrics(testType, metrics) {
    if (!this.metrics.tests[testType]) {
      this.metrics.tests[testType] = {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        averageResponseTime: 0,
        lastTest: null
      };
    }

    const testStats = this.metrics.tests[testType];
    testStats.totalTests++;

    if (metrics.success) {
      testStats.successfulTests++;
    } else {
      testStats.failedTests++;
    }

    // 更新平均响应时间
    if (metrics.responseTime) {
      testStats.averageResponseTime = (
        (testStats.averageResponseTime * (testStats.totalTests - 1) + metrics.responseTime) /
        testStats.totalTests
      );
    }

    testStats.lastTest = {
      timestamp: new Date().toISOString(),
      success: metrics.success,
      responseTime: metrics.responseTime,
      score: metrics.score
    };

    Logger.debug('记录测试指标', {
      testType,
      totalTests: testStats.totalTests,
      successRate: (testStats.successfulTests / testStats.totalTests * 100).toFixed(2) + '%'
    });
  }

  /**
   * 获取测试统计
   */
  getTestStats() {
    return {
      timestamp: new Date().toISOString(),
      tests: this.metrics.tests
    };
  }

  /**
   * 设置告警阈值
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    Logger.info('更新告警阈值', this.thresholds);
  }

  /**
   * 清除告警
   */
  clearAlerts() {
    this.alerts = [];
    Logger.info('清除所有告警');
  }
}

// 创建全局监控实例
const monitoring = new MonitoringSystem();

module.exports = {
  MonitoringSystem,
  monitoring
};
