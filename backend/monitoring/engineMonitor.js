/**
 * 引擎状态监控系统
 * 统一的引擎健康检查和状态监控机制
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class EngineMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      checkInterval: options.checkInterval || 60000, // 1分钟
      alertThreshold: options.alertThreshold || 0.8,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000,
      historySize: options.historySize || 100,
      ...options
    };
    
    this.engines = new Map();
    this.monitoring = false;
    this.monitoringInterval = null;
    this.healthHistory = new Map();
    this.systemMetrics = {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      timestamp: []
    };
    this.alerts = [];
  }

  /**
   * 注册引擎实例
   */
  registerEngine(name, engineInstance, config = {}) {
    if (this.engines.has(name)) {
      throw new Error(`引擎 ${name} 已经注册`);
    }

    const engineConfig = {
      instance: engineInstance,
      name,
      type: config.type || 'unknown',
      priority: config.priority || 'medium',
      dependencies: config.dependencies || [],
      healthCheckMethod: config.healthCheckMethod || 'checkAvailability',
      thresholds: {
        responseTime: config.thresholds?.responseTime || 5000,
        errorRate: config.thresholds?.errorRate || 0.1,
        availability: config.thresholds?.availability || 0.95,
        ...config.thresholds
      },
      ...config
    };

    this.engines.set(name, engineConfig);
    this.healthHistory.set(name, []);
    
    this.emit('engineRegistered', { name, config: engineConfig });
    console.log(`引擎 ${name} 已注册到监控系统`);
  }

  /**
   * 卸载引擎
   */
  unregisterEngine(name) {
    if (!this.engines.has(name)) {
      throw new Error(`引擎 ${name} 未注册`);
    }

    this.engines.delete(name);
    this.healthHistory.delete(name);
    
    this.emit('engineUnregistered', { name });
    console.log(`引擎 ${name} 已从监控系统中移除`);
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    if (this.monitoring) {
      console.log('监控已经在运行中');
      return;
    }

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.collectSystemMetrics();
      this.checkAlerts();
    }, this.options.checkInterval);

    this.emit('monitoringStarted');
    console.log(`引擎监控已启动，检查间隔: ${this.options.checkInterval}ms`);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.monitoring) {
      console.log('监控未在运行');
      return;
    }

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoringStopped');
    console.log('引擎监控已停止');
  }

  /**
   * 执行所有引擎的健康检查
   */
  async performHealthChecks() {
    const healthChecks = [];
    
    for (const [name, config] of this.engines.entries()) {
      healthChecks.push(this.checkEngineHealth(name, config));
    }

    try {
      await Promise.allSettled(healthChecks);
      this.emit('healthCheckCompleted', {
        timestamp: new Date().toISOString(),
        engineCount: this.engines.size
      });
    } catch (error) {
      this.emit('healthCheckError', { error: error.message });
    }
  }

  /**
   * 检查单个引擎健康状态
   */
  async checkEngineHealth(name, config) {
    const startTime = Date.now();
    let healthData = {
      name,
      timestamp: new Date().toISOString(),
      status: 'unknown',
      responseTime: 0,
      available: false,
      error: null,
      metrics: {},
      details: {}
    };

    try {
      // 调用引擎的健康检查方法
      const healthCheckMethod = config.healthCheckMethod;
      if (typeof config.instance[healthCheckMethod] === 'function') {
        const result = await Promise.race([
          config.instance[healthCheckMethod](),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 
                      config.thresholds.responseTime)
          )
        ]);

        healthData.responseTime = Date.now() - startTime;
        healthData.available = result.available || false;
        healthData.status = result.available ? 'healthy' : 'unhealthy';
        healthData.details = result;

        // 检查响应时间阈值
        if (healthData.responseTime > config.thresholds.responseTime) {
          healthData.status = 'degraded';
          healthData.error = `响应时间超过阈值: ${healthData.responseTime}ms`;
        }

        // 收集额外指标
        if (result.metrics) {
          healthData.metrics = result.metrics;
        }

      } else {
        healthData.status = 'unknown';
        healthData.error = `引擎缺少健康检查方法: ${healthCheckMethod}`;
      }

    } catch (error) {
      healthData.responseTime = Date.now() - startTime;
      healthData.status = 'error';
      healthData.available = false;
      healthData.error = error.message;
    }

    // 保存健康历史
    this.updateHealthHistory(name, healthData);
    
    // 发出健康状态事件
    this.emit('engineHealthCheck', healthData);
    
    // 检查是否需要发出警报
    this.checkEngineAlerts(name, healthData);

    return healthData;
  }

  /**
   * 更新引擎健康历史
   */
  updateHealthHistory(name, healthData) {
    const history = this.healthHistory.get(name) || [];
    history.push(healthData);
    
    // 保持历史大小限制
    if (history.length > this.options.historySize) {
      history.shift();
    }
    
    this.healthHistory.set(name, history);
  }

  /**
   * 检查引擎警报
   */
  checkEngineAlerts(name, healthData) {
    const config = this.engines.get(name);
    const history = this.healthHistory.get(name) || [];
    
    // 检查引擎不可用
    if (!healthData.available && healthData.status !== 'unknown') {
      this.createAlert({
        type: 'engine_unavailable',
        severity: 'critical',
        engine: name,
        message: `引擎 ${name} 不可用: ${healthData.error}`,
        timestamp: healthData.timestamp,
        data: healthData
      });
    }

    // 检查响应时间
    if (healthData.responseTime > config.thresholds.responseTime) {
      this.createAlert({
        type: 'slow_response',
        severity: 'warning',
        engine: name,
        message: `引擎 ${name} 响应时间过长: ${healthData.responseTime}ms`,
        timestamp: healthData.timestamp,
        data: { responseTime: healthData.responseTime, threshold: config.thresholds.responseTime }
      });
    }

    // 检查可用性率
    if (history.length >= 10) {
      const recentChecks = history.slice(-10);
      const successfulChecks = recentChecks.filter(h => h.available).length;
      const availability = successfulChecks / recentChecks.length;
      
      if (availability < config.thresholds.availability) {
        this.createAlert({
          type: 'low_availability',
          severity: 'warning',
          engine: name,
          message: `引擎 ${name} 可用性过低: ${(availability * 100).toFixed(1)}%`,
          timestamp: healthData.timestamp,
          data: { availability, threshold: config.thresholds.availability }
        });
      }
    }
  }

  /**
   * 收集系统指标
   */
  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: await this.getCPUUsage(),
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        disk: await this.getDiskUsage(),
        network: await this.getNetworkStats(),
        process: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid
        }
      };

      // 保存指标历史
      Object.keys(this.systemMetrics).forEach(key => {
        if (key !== 'timestamp' && metrics[key]) {
          this.systemMetrics[key].push(metrics[key]);
          this.systemMetrics.timestamp.push(metrics.timestamp);
          
          // 保持历史大小限制
          if (this.systemMetrics[key].length > this.options.historySize) {
            this.systemMetrics[key].shift();
          }
        }
      });

      // 检查系统警报
      this.checkSystemAlerts(metrics);
      
      this.emit('systemMetricsCollected', metrics);
      
    } catch (error) {
      this.emit('systemMetricsError', { error: error.message });
    }
  }

  /**
   * 获取CPU使用率
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const startTimes = cpus.map(cpu => {
        const times = cpu.times;
        return times.user + times.nice + times.sys + times.idle + times.irq;
      });
      const startIdleTimes = cpus.map(cpu => cpu.times.idle);

      setTimeout(() => {
        const currentCpus = os.cpus();
        const currentTimes = currentCpus.map(cpu => {
          const times = cpu.times;
          return times.user + times.nice + times.sys + times.idle + times.irq;
        });
        const currentIdleTimes = currentCpus.map(cpu => cpu.times.idle);

        let totalUsage = 0;
        for (let i = 0; i < cpus.length; i++) {
          const totalDiff = currentTimes[i] - startTimes[i];
          const idleDiff = currentIdleTimes[i] - startIdleTimes[i];
          const usage = 100 - (100 * idleDiff / totalDiff);
          totalUsage += usage;
        }

        resolve(totalUsage / cpus.length);
      }, 100);
    });
  }

  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      // 这里只是一个简化的实现
      // 在真实环境中可能需要使用更专业的工具
      return {
        total: 1000000000, // 模拟值
        free: 500000000,   // 模拟值
        used: 500000000,   // 模拟值
        usage: 50          // 模拟值
      };
    } catch (error) {
      return { total: 0, free: 0, used: 0, usage: 0 };
    }
  }

  /**
   * 获取网络统计
   */
  async getNetworkStats() {
    // 简化实现，真实环境中可能需要更复杂的逻辑
    return {
      bytesReceived: Math.floor(Math.random() * 1000000),
      bytesSent: Math.floor(Math.random() * 1000000),
      packetsReceived: Math.floor(Math.random() * 10000),
      packetsSent: Math.floor(Math.random() * 10000)
    };
  }

  /**
   * 检查系统警报
   */
  checkSystemAlerts(metrics) {
    // CPU使用率警报
    if (metrics.cpu.usage > 80) {
      this.createAlert({
        type: 'high_cpu_usage',
        severity: metrics.cpu.usage > 95 ? 'critical' : 'warning',
        message: `CPU使用率过高: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        data: { cpuUsage: metrics.cpu.usage }
      });
    }

    // 内存使用率警报
    if (metrics.memory.usage > 80) {
      this.createAlert({
        type: 'high_memory_usage',
        severity: metrics.memory.usage > 95 ? 'critical' : 'warning',
        message: `内存使用率过高: ${metrics.memory.usage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        data: { memoryUsage: metrics.memory.usage }
      });
    }

    // 磁盘使用率警报
    if (metrics.disk.usage > 85) {
      this.createAlert({
        type: 'high_disk_usage',
        severity: metrics.disk.usage > 95 ? 'critical' : 'warning',
        message: `磁盘使用率过高: ${metrics.disk.usage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        data: { diskUsage: metrics.disk.usage }
      });
    }
  }

  /**
   * 创建警报
   */
  createAlert(alertData) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...alertData,
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);
    
    // 保持警报历史大小限制
    if (this.alerts.length > this.options.historySize * 2) {
      this.alerts = this.alerts.slice(-this.options.historySize);
    }

    this.emit('alertCreated', alert);
    
    // 输出警报日志
    const severity = alert.severity.toUpperCase();
    console.log(`[${severity}] ${alert.message}`);
  }

  /**
   * 检查和处理警报
   */
  checkAlerts() {
    const unresolvedAlerts = this.alerts.filter(alert => !alert.resolved);
    
    if (unresolvedAlerts.length > 0) {
      this.emit('alertsSummary', {
        total: unresolvedAlerts.length,
        critical: unresolvedAlerts.filter(a => a.severity === 'critical').length,
        warning: unresolvedAlerts.filter(a => a.severity === 'warning').length,
        info: unresolvedAlerts.filter(a => a.severity === 'info').length
      });
    }
  }

  /**
   * 确认警报
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * 解决警报
   */
  resolveAlert(alertId, resolution) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * 获取所有引擎的健康状态
   */
  getEnginesStatus() {
    const status = {};
    
    for (const [name, config] of this.engines.entries()) {
      const history = this.healthHistory.get(name) || [];
      const latestHealth = history[history.length - 1];
      
      status[name] = {
        name,
        type: config.type,
        priority: config.priority,
        currentStatus: latestHealth?.status || 'unknown',
        available: latestHealth?.available || false,
        lastCheck: latestHealth?.timestamp || null,
        responseTime: latestHealth?.responseTime || 0,
        error: latestHealth?.error || null,
        uptime: this.calculateUptime(history),
        healthHistory: history.slice(-10), // 最近10次检查
        ...latestHealth?.details
      };
    }
    
    return status;
  }

  /**
   * 计算引擎运行时间
   */
  calculateUptime(history) {
    if (history.length < 2) return 0;
    
    const successfulChecks = history.filter(h => h.available).length;
    return (successfulChecks / history.length) * 100;
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics() {
    return {
      current: this.systemMetrics.cpu.length > 0 ? {
        cpu: this.systemMetrics.cpu[this.systemMetrics.cpu.length - 1],
        memory: this.systemMetrics.memory[this.systemMetrics.memory.length - 1],
        disk: this.systemMetrics.disk[this.systemMetrics.disk.length - 1],
        network: this.systemMetrics.network[this.systemMetrics.network.length - 1]
      } : null,
      history: this.systemMetrics
    };
  }

  /**
   * 获取警报列表
   */
  getAlerts(filter = {}) {
    let alerts = [...this.alerts];
    
    if (filter.severity) {
      alerts = alerts.filter(a => a.severity === filter.severity);
    }
    
    if (filter.resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === filter.resolved);
    }
    
    if (filter.engine) {
      alerts = alerts.filter(a => a.engine === filter.engine);
    }
    
    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 获取监控统计
   */
  getMonitoringStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentAlerts = this.alerts.filter(a => 
      new Date(a.timestamp).getTime() > oneHourAgo
    );
    
    return {
      monitoring: this.monitoring,
      enginesCount: this.engines.size,
      healthyEngines: Object.values(this.getEnginesStatus())
        .filter(e => e.currentStatus === 'healthy').length,
      totalAlerts: this.alerts.length,
      recentAlerts: recentAlerts.length,
      criticalAlerts: this.alerts.filter(a => 
        a.severity === 'critical' && !a.resolved
      ).length,
      systemStatus: this.getOverallSystemStatus(),
      uptime: process.uptime(),
      lastHealthCheck: this.systemMetrics.timestamp.length > 0 
        ? new Date(this.systemMetrics.timestamp[this.systemMetrics.timestamp.length - 1]).toISOString()
        : null
    };
  }

  /**
   * 获取整体系统状态
   */
  getOverallSystemStatus() {
    const enginesStatus = this.getEnginesStatus();
    const engines = Object.values(enginesStatus);
    
    const criticalAlerts = this.alerts.filter(a => 
      a.severity === 'critical' && !a.resolved
    ).length;
    
    if (criticalAlerts > 0) return 'critical';
    
    const unhealthyEngines = engines.filter(e => 
      e.currentStatus === 'error' || !e.available
    ).length;
    
    const degradedEngines = engines.filter(e => 
      e.currentStatus === 'degraded'
    ).length;
    
    if (unhealthyEngines > 0) return 'unhealthy';
    if (degradedEngines > 0) return 'degraded';
    
    return 'healthy';
  }

  /**
   * 导出监控数据
   */
  async exportMonitoringData(options = {}) {
    const data = {
      timestamp: new Date().toISOString(),
      engines: this.getEnginesStatus(),
      systemMetrics: this.getSystemMetrics(),
      alerts: this.getAlerts(),
      stats: this.getMonitoringStats()
    };

    if (options.filePath) {
      try {
        await fs.writeFile(options.filePath, JSON.stringify(data, null, 2));
        console.log(`监控数据已导出到: ${options.filePath}`);
      } catch (error) {
        throw new Error(`导出数据失败: ${error.message}`);
      }
    }

    return data;
  }

  /**
   * 清理历史数据
   */
  cleanup(options = {}) {
    const olderThan = options.olderThan || (7 * 24 * 60 * 60 * 1000); // 7天
    const cutoffTime = Date.now() - olderThan;
    
    // 清理老旧警报
    const initialAlertsCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime || !alert.resolved
    );
    
    // 清理引擎健康历史
    for (const [name, history] of this.healthHistory.entries()) {
      const filteredHistory = history.filter(record => 
        new Date(record.timestamp).getTime() > cutoffTime
      );
      this.healthHistory.set(name, filteredHistory);
    }
    
    // 清理系统指标历史
    const filteredIndices = this.systemMetrics.timestamp
      .map((timestamp, index) => ({ timestamp, index }))
      .filter(item => item.timestamp > cutoffTime)
      .map(item => item.index);
    
    Object.keys(this.systemMetrics).forEach(key => {
      if (Array.isArray(this.systemMetrics[key])) {
        this.systemMetrics[key] = filteredIndices
          .map(index => this.systemMetrics[key][index])
          .filter(item => item !== undefined);
      }
    });
    
    const cleanedAlertsCount = initialAlertsCount - this.alerts.length;
    console.log(`清理完成: 删除${cleanedAlertsCount}条警报记录`);
    
    this.emit('cleanupCompleted', { 
      cleanedAlerts: cleanedAlertsCount,
      cutoffTime: new Date(cutoffTime).toISOString()
    });
  }

  /**
   * 销毁监控实例
   */
  destroy() {
    this.stopMonitoring();
    this.engines.clear();
    this.healthHistory.clear();
    this.alerts = [];
    this.removeAllListeners();
    console.log('引擎监控实例已销毁');
  }
}

module.exports = EngineMonitor;
