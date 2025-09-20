/**
 * 监控服务主类
 * 提供完整的性能监控、告警和仪表板功能
 */

import BaseService from '../services/BaseService.enhanced.js';
import MetricCollector from './MetricCollector.js';
import { ErrorCode } from '../errors/ErrorTypes.js';
import { 
  MetricCategory, 
  TimeWindow, 
  AlertLevel, 
  AlertRuleType,
  PredefinedAlertRules,
  PredefinedMetrics 
} from './MetricTypes.js';

/**
 * 告警规则
 */
class AlertRule {
  constructor(config) {
    this.name = config.name;
    this.metric = config.metric;
    this.type = config.type;
    this.condition = config.condition;
    this.threshold = config.threshold;
    this.window = config.window;
    this.level = config.level;
    this.description = config.description;
    this.enabled = config.enabled !== false;
    this.lastTriggered = null;
    this.cooldown = config.cooldown || 5 * 60 * 1000; // 5分钟冷却
  }

  evaluate(metricCollector) {
    if (!this.enabled) return null;
    
    // 检查冷却期
    if (this.lastTriggered && (Date.now() - this.lastTriggered) < this.cooldown) {
      return null;
    }

    const value = metricCollector.getMetricValue(this.metric, 'avg', this.window);
    if (value === null) return null;

    let triggered = false;
    
    switch (this.condition) {
      case 'greater_than':
        triggered = value > this.threshold;
        break;
      case 'less_than':
        triggered = value < this.threshold;
        break;
      case 'equals':
        triggered = value === this.threshold;
        break;
      case 'not_equals':
        triggered = value !== this.threshold;
        break;
      default:
        return null;
    }

    if (triggered) {
      this.lastTriggered = Date.now();
      return {
        rule: this.name,
        metric: this.metric,
        value,
        threshold: this.threshold,
        level: this.level,
        description: this.description,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }
}

/**
 * 监控服务
 */
class MonitoringService extends BaseService {
  constructor(options = {}) {
    super('MonitoringService');
    
    this.options = {
      enableRealTimeMonitoring: true,
      monitoringInterval: 30 * 1000, // 30秒
      alertCheckInterval: 60 * 1000, // 1分钟
      enableSystemMetrics: true,
      enableAlerts: true,
      maxAlertHistory: 1000,
      ...options
    };

    // 初始化指标收集器
    this.metricCollector = new MetricCollector({
      maxSeriesSize: 2000,
      enableAutoCleanup: true,
      cleanupInterval: 10 * 60 * 1000, // 10分钟
      maxRetentionTime: 7 * 24 * 60 * 60 * 1000 // 7天
    });

    // 告警系统
    this.alertRules = new Map();
    this.alertHistory = [];
    this.alertListeners = [];

    // 服务实例注册
    this.serviceInstances = new Map();

    // 监控状态
    this.monitoring = {
      realTime: false,
      alerts: false
    };

    // 初始化预定义告警规则
    this.initializeAlertRules();
  }

  async performInitialization() {
    // 注册系统指标收集
    if (this.options.enableSystemMetrics) {
      this.startSystemMetricsCollection();
    }

    // 启动实时监控
    if (this.options.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }

    // 启动告警检查
    if (this.options.enableAlerts) {
      this.startAlertMonitoring();
    }
  }

  getCapabilities() {
    return [
      ...super.getCapabilities(),
      'metric-collection',
      'real-time-monitoring',
      'alert-system',
      'dashboard-data',
      'system-health-check'
    ];
  }

  /**
   * 初始化预定义告警规则
   */
  initializeAlertRules() {
    Object.values(PredefinedAlertRules).forEach(ruleConfig => {
      const rule = new AlertRule(ruleConfig);
      this.alertRules.set(rule.name, rule);
    });
  }

  /**
   * 注册服务实例
   */
  registerService(serviceName, instance) {
    this.serviceInstances.set(serviceName, {
      instance,
      registeredAt: new Date().toISOString(),
      lastHealthCheck: null,
      healthy: true
    });

    // 记录服务注册指标
    this.metricCollector.incrementCounter(
      PredefinedMetrics.SERVICE_ACTIVE_INSTANCES.name,
      1,
      { service: serviceName }
    );

    return true;
  }

  /**
   * 注销服务实例
   */
  unregisterService(serviceName) {
    const removed = this.serviceInstances.delete(serviceName);
    
    if (removed) {
      this.metricCollector.incrementCounter(
        PredefinedMetrics.SERVICE_ACTIVE_INSTANCES.name,
        -1,
        { service: serviceName }
      );
    }

    return removed;
  }

  /**
   * 记录服务调用
   */
  recordServiceCall(serviceName, duration, success = true, errorCode = null) {
    const labels = { service: serviceName };

    // 记录调用次数
    this.metricCollector.incrementCounter(
      PredefinedMetrics.SERVICE_INVOCATION_COUNT.name,
      1,
      labels
    );

    // 记录响应时间
    this.metricCollector.recordTimer(
      PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
      duration,
      labels
    );

    // 记录错误
    if (!success) {
      this.metricCollector.incrementCounter(
        PredefinedMetrics.ERROR_COUNT.name,
        1,
        { ...labels, error_code: errorCode }
      );
    }

    // 计算吞吐量
    this.updateThroughput(serviceName);
  }

  /**
   * 记录业务指标
   */
  recordBusinessMetric(metricName, value, labels = {}) {
    return this.metricCollector.addDataPoint(metricName, value, labels);
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name, type, value, labels = {}) {
    switch (type) {
      case 'counter':
        return this.metricCollector.incrementCounter(name, value, labels);
      case 'gauge':
        return this.metricCollector.setGauge(name, value, labels);
      case 'timer':
        return this.metricCollector.recordTimer(name, value, labels);
      case 'histogram':
        return this.metricCollector.recordHistogram(name, value, labels);
      case 'percentage':
        return this.metricCollector.recordPercentage(name, value, labels);
      default:
        return this.metricCollector.addDataPoint(name, value, labels);
    }
  }

  /**
   * 开始计时
   */
  startTiming(name, labels = {}) {
    return this.metricCollector.startTimer(name, labels);
  }

  /**
   * 获取指标数据
   */
  getMetrics(category = null, timeWindow = TimeWindow.HOUR) {
    if (category) {
      return this.metricCollector.getMetricsByCategory(category, timeWindow);
    }
    
    return this.metricCollector.getMetricsSummary(timeWindow);
  }

  /**
   * 获取仪表板数据
   */
  getDashboardData(timeWindow = TimeWindow.HOUR) {
    const dashboard = {
      timestamp: new Date().toISOString(),
      timeWindow: timeWindow.label,
      health: this.getSystemHealth(),
      metrics: {},
      services: {},
      alerts: {
        active: this.getActiveAlerts(),
        recent: this.getRecentAlerts(10)
      }
    };

    // 按分类组织指标
    Object.values(MetricCategory).forEach(category => {
      dashboard.metrics[category] = this.metricCollector.getMetricsByCategory(category, timeWindow);
    });

    // 服务状态
    this.serviceInstances.forEach((info, serviceName) => {
      dashboard.services[serviceName] = {
        healthy: info.healthy,
        lastHealthCheck: info.lastHealthCheck,
        registeredAt: info.registeredAt,
        metrics: this.getServiceMetrics(serviceName, timeWindow)
      };
    });

    return dashboard;
  }

  /**
   * 获取服务指标
   */
  getServiceMetrics(serviceName, timeWindow = TimeWindow.HOUR) {
    const serviceLabels = { service: serviceName };
    
    return {
      invocations: this.metricCollector.getMetricValue(
        PredefinedMetrics.SERVICE_INVOCATION_COUNT.name,
        'sum',
        timeWindow
      ),
      avgResponseTime: this.metricCollector.getMetricValue(
        PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
        'avg',
        timeWindow
      ),
      p95ResponseTime: this.metricCollector.getMetricValue(
        PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
        'p95',
        timeWindow
      ),
      errorCount: this.metricCollector.getMetricValue(
        PredefinedMetrics.ERROR_COUNT.name,
        'sum',
        timeWindow
      )
    };
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth() {
    const baseHealth = this.metricCollector.getSystemHealth();
    
    // 添加服务健康检查
    const serviceHealth = {
      total: this.serviceInstances.size,
      healthy: 0,
      unhealthy: 0
    };

    this.serviceInstances.forEach((info) => {
      if (info.healthy) {
        serviceHealth.healthy++;
      } else {
        serviceHealth.unhealthy++;
      }
    });

    // 添加告警统计
    const alertStats = {
      active: this.getActiveAlerts().length,
      critical: this.getActiveAlerts().filter(a => a.level === AlertLevel.CRITICAL).length,
      warnings: this.getActiveAlerts().filter(a => a.level === AlertLevel.WARNING).length
    };

    return {
      ...baseHealth,
      services: serviceHealth,
      alerts: alertStats
    };
  }

  /**
   * 添加告警规则
   */
  addAlertRule(ruleConfig) {
    const rule = new AlertRule(ruleConfig);
    this.alertRules.set(rule.name, rule);
    return rule;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts() {
    const now = Date.now();
    const activeWindow = 10 * 60 * 1000; // 10分钟内的告警视为活跃
    
    return this.alertHistory
      .filter(alert => (now - new Date(alert.timestamp).getTime()) < activeWindow)
      .sort((a, b) => b.level.value - a.level.value);
  }

  /**
   * 获取最近告警
   */
  getRecentAlerts(limit = 50) {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 添加告警监听器
   */
  addAlertListener(listener) {
    if (typeof listener === 'function') {
      this.alertListeners.push(listener);
    }
  }

  /**
   * 移除告警监听器
   */
  removeAlertListener(listener) {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * 触发告警
   */
  triggerAlert(alert) {
    // 添加到历史记录
    this.alertHistory.push(alert);
    
    // 限制历史记录大小
    if (this.alertHistory.length > this.options.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.options.maxAlertHistory);
    }

    // 通知监听器
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Alert listener error:', error);
      }
    });
  }

  /**
   * 启动实时监控
   */
  startRealTimeMonitoring() {
    if (this.monitoring.realTime) return;

    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.options.monitoringInterval);

    this.monitoring.realTime = true;
  }

  /**
   * 停止实时监控
   */
  stopRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoring.realTime = false;
  }

  /**
   * 启动告警监控
   */
  startAlertMonitoring() {
    if (this.monitoring.alerts) return;

    this.alertInterval = setInterval(() => {
      this.checkAlerts();
    }, this.options.alertCheckInterval);

    this.monitoring.alerts = true;
  }

  /**
   * 停止告警监控
   */
  stopAlertMonitoring() {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
    this.monitoring.alerts = false;
  }

  /**
   * 收集实时指标
   */
  collectRealTimeMetrics() {
    // 更新服务实例数
    this.metricCollector.setGauge(
      PredefinedMetrics.SERVICE_ACTIVE_INSTANCES.name,
      this.serviceInstances.size
    );

    // 计算错误率
    this.updateErrorRates();

    // 收集系统指标
    this.collectSystemMetrics();
  }

  /**
   * 检查告警
   */
  checkAlerts() {
    this.alertRules.forEach(rule => {
      const alert = rule.evaluate(this.metricCollector);
      if (alert) {
        this.triggerAlert(alert);
      }
    });
  }

  /**
   * 更新错误率
   */
  updateErrorRates() {
    this.serviceInstances.forEach((info, serviceName) => {
      const labels = { service: serviceName };
      const timeWindow = TimeWindow.MINUTE;
      
      const totalCalls = this.metricCollector.getMetricValue(
        PredefinedMetrics.SERVICE_INVOCATION_COUNT.name,
        'count',
        timeWindow
      ) || 0;

      const errors = this.metricCollector.getMetricValue(
        PredefinedMetrics.ERROR_COUNT.name,
        'count',
        timeWindow
      ) || 0;

      const errorRate = totalCalls > 0 ? (errors / totalCalls) * 100 : 0;
      
      this.metricCollector.recordPercentage(
        PredefinedMetrics.ERROR_RATE.name,
        errorRate,
        labels
      );
    });
  }

  /**
   * 更新吞吐量
   */
  updateThroughput(serviceName) {
    const labels = { service: serviceName };
    const timeWindow = TimeWindow.SECOND;
    
    const recentCalls = this.metricCollector.getMetricValue(
      PredefinedMetrics.SERVICE_INVOCATION_COUNT.name,
      'count',
      timeWindow
    ) || 0;

    this.metricCollector.recordRate(
      PredefinedMetrics.SERVICE_THROUGHPUT.name,
      recentCalls,
      timeWindow,
      labels
    );
  }

  /**
   * 启动系统指标收集
   */
  startSystemMetricsCollection() {
    // 这里可以集成实际的系统指标收集
    // 目前使用模拟数据
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.metricCollector.setGauge(
        PredefinedMetrics.MEMORY_USAGE.name,
        memoryUsage.heapUsed / 1024 / 1024 // 转换为MB
      );

      // CPU使用率（模拟）
      this.metricCollector.setGauge(
        PredefinedMetrics.CPU_USAGE.name,
        Math.random() * 20 + 10 // 10-30%的模拟CPU使用率
      );
    }, 10000); // 每10秒收集一次
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    if (!this.options.enableSystemMetrics) return;
    
    // 已在startSystemMetricsCollection中实现
  }

  /**
   * 导出监控数据
   */
  exportData(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      health: this.getSystemHealth(),
      services: Object.fromEntries(this.serviceInstances),
      metrics: this.metricCollector.exportData('object'),
      alerts: {
        rules: Object.fromEntries(this.alertRules),
        history: this.alertHistory
      },
      monitoring: this.monitoring
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    return data;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.stopRealTimeMonitoring();
    this.stopAlertMonitoring();
    this.metricCollector.destroy();
    await super.cleanup();
  }
}

export { AlertRule, MonitoringService };
export default MonitoringService;
