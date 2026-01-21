/**
 * 监控服务主类
 * 提供完整的性能监控、告警和仪表板功能
 */

import BaseService, { ServiceConfig, ServiceHealth } from '../services/BaseService';
import MetricCollector, { MemoryMetricStorage, MetricStorage } from './MetricCollector';
import {
  AggregationType,
  AggregationTypeType,
  AlertSeverity,
  AlertSeverityType,
  MetricAlertEvent,
  MetricConfig,
  MetricDashboard,
  MetricPerformance,
  MetricQuery,
  MetricQueryResult,
  MetricReport,
  MetricStatistics,
  MetricType,
  MetricTypeType,
  MetricUnit,
  MetricUtils,
  TimeWindow,
  TimeWindowType,
} from './MetricTypes';

// 告警规则接口
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  type: MetricTypeType;
  condition: AlertCondition;
  severity: AlertSeverityType;
  description: string;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  notificationChannels: string[];
}

// 告警条件接口
export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration?: number;
  aggregation?: AggregationTypeType;
  timeWindow?: TimeWindowType;
}

// 通知渠道接口
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'sms';
  config: Record<string, unknown>;
  enabled: boolean;
}

// 监控配置接口
export type MonitoringConfig = Omit<ServiceConfig, 'metrics'> & {
  metrics: MetricConfig & ServiceConfig['metrics'];
  alerts: {
    enabled: boolean;
    defaultChannels: string[];
    rules: AlertRule[];
  };
  dashboards: {
    enabled: boolean;
    refreshInterval: number;
    defaultDashboards: MetricDashboard[];
  };
  notifications: {
    channels: NotificationChannel[];
    rateLimit: {
      maxPerMinute: number;
      maxPerHour: number;
    };
  };
};

class EngineMonitoringService extends BaseService {
  private collector: MetricCollector;
  private storage: MetricStorage;
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private dashboards: Map<string, MetricDashboard> = new Map();
  private alertHistory: MetricAlertEvent[] = [];
  private monitoringConfig: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    super(config);
    this.monitoringConfig = config;

    // 初始化存储
    this.storage = new MemoryMetricStorage(10000);

    // 初始化收集器
    this.collector = new MetricCollector(this.storage, config.metrics);

    // 设置默认告警规则
    this.setupDefaultAlertRules();

    // 设置默认通知渠道
    this.setupDefaultNotificationChannels();

    // 设置默认仪表板
    this.setupDefaultDashboards();
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    try {
      // 启动指标收集
      if (this.monitoringConfig.metrics.enabled) {
        this.collector.startAutoCollection(
          this.monitoringConfig.metrics.aggregation?.intervals?.[0]
            ? MetricUtils.getTimeWindowMs(
                this.monitoringConfig.metrics.aggregation.intervals[0] as TimeWindowType
              )
            : 60000
        );
      }

      // 启动告警检查
      if (this.monitoringConfig.alerts.enabled) {
        this.startAlertChecking();
      }

      this.log('info', 'EngineMonitoringService initialized successfully');
    } catch (error) {
      throw new Error(
        `Failed to initialize EngineMonitoringService: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行关闭
   */
  protected async performShutdown(): Promise<void> {
    try {
      this.collector.destroy();
      this.alertRules.clear();
      this.notificationChannels.clear();
      this.dashboards.clear();
      this.alertHistory.length = 0;

      this.log('info', 'EngineMonitoringService shutdown successfully');
    } catch (error) {
      this.log('error', 'Error during EngineMonitoringService shutdown', error);
    }
  }

  /**
   * 记录指标
   */
  async recordMetric(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    await this.collector.record(name, value, labels);
  }

  /**
   * 增加计数器
   */
  async incrementCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.collector.increment(name, value, labels);
  }

  /**
   * 设置仪表盘值
   */
  async setGauge(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    await this.collector.set(name, value, labels);
  }

  /**
   * 记录定时器
   */
  async recordTimer(
    name: string,
    duration: number,
    labels?: Record<string, string>
  ): Promise<void> {
    await this.collector.timer(name, duration, labels);
  }

  /**
   * 开始计时
   */
  startTimer(name: string, labels?: Record<string, string>): () => Promise<void> {
    return this.collector.startTimer(name, labels);
  }

  /**
   * 查询指标
   */
  async queryMetrics(query: MetricQuery): Promise<MetricQueryResult> {
    return this.collector.query(query);
  }

  /**
   * 获取指标统计
   */
  async getMetricStatistics(): Promise<MetricStatistics> {
    return this.collector.getStatistics();
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): MetricPerformance {
    return this.collector.getPerformanceMetrics();
  }

  /**
   * 创建告警规则
   */
  createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): string {
    const id = this.generateRuleId();
    const fullRule: AlertRule = {
      ...rule,
      id,
      createdAt: new Date(),
    };

    this.alertRules.set(id, fullRule);
    this.log('info', `Alert rule created: ${rule.name}`);

    return id;
  }

  /**
   * 更新告警规则
   */
  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.log('info', `Alert rule updated: ${rule.name}`);
    return true;
  }

  /**
   * 删除告警规则
   */
  deleteAlertRule(id: string): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) return false;

    this.alertRules.delete(id);
    this.log('info', `Alert rule deleted: ${rule.name}`);
    return true;
  }

  /**
   * 获取告警规则
   */
  getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id);
  }

  /**
   * 获取所有告警规则
   */
  getAllAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * 创建通知渠道
   */
  createNotificationChannel(channel: Omit<NotificationChannel, 'id'>): string {
    const id = this.generateChannelId();
    const fullChannel: NotificationChannel = {
      ...channel,
      id,
    };

    this.notificationChannels.set(id, fullChannel);
    this.log('info', `Notification channel created: ${channel.name}`);

    return id;
  }

  /**
   * 更新通知渠道
   */
  updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.notificationChannels.get(id);
    if (!channel) return false;

    Object.assign(channel, updates);
    this.log('info', `Notification channel updated: ${channel.name}`);
    return true;
  }

  /**
   * 删除通知渠道
   */
  deleteNotificationChannel(id: string): boolean {
    const channel = this.notificationChannels.get(id);
    if (!channel) return false;

    this.notificationChannels.delete(id);
    this.log('info', `Notification channel deleted: ${channel.name}`);
    return true;
  }

  /**
   * 获取通知渠道
   */
  getNotificationChannel(id: string): NotificationChannel | undefined {
    return this.notificationChannels.get(id);
  }

  /**
   * 获取所有通知渠道
   */
  getAllNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  /**
   * 创建仪表板
   */
  createDashboard(dashboard: Omit<MetricDashboard, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateDashboardId();
    const now = new Date();
    const fullDashboard: MetricDashboard = {
      ...dashboard,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.dashboards.set(id, fullDashboard);
    this.log('info', `Dashboard created: ${dashboard.name}`);

    return id;
  }

  /**
   * 更新仪表板
   */
  updateDashboard(id: string, updates: Partial<MetricDashboard>): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;

    Object.assign(dashboard, updates, { updatedAt: new Date() });
    this.log('info', `Dashboard updated: ${dashboard.name}`);
    return true;
  }

  /**
   * 删除仪表板
   */
  deleteDashboard(id: string): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;

    this.dashboards.delete(id);
    this.log('info', `Dashboard deleted: ${dashboard.name}`);
    return true;
  }

  /**
   * 获取仪表板
   */
  getDashboard(id: string): MetricDashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * 获取所有仪表板
   */
  getAllDashboards(): MetricDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): MetricAlertEvent[] {
    const history = [...this.alertHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 生成监控报告
   */
  async generateReport(timeRange: { start: Date; end: Date }): Promise<MetricReport> {
    const reportId = this.generateReportId();

    // 收集统计数据
    const stats = await this.getMetricStatistics();
    const performance = this.getPerformanceMetrics();

    // 收集告警统计
    const alertStats = this.getAlertStats(timeRange);

    // 生成报告章节
    const sections = [
      {
        title: '概览',
        type: 'summary' as const,
        content: {
          totalMetrics: stats.totalMetrics,
          totalDataPoints: stats.dataPoints,
          totalAlerts: alertStats.total,
          activeAlerts: alertStats.active,
          avgResponseTime: performance.collectionLatency,
        },
        metrics: [],
      },
      {
        title: '性能指标',
        type: 'chart' as const,
        content: {
          metrics: ['system.cpu.usage', 'system.memory.usage', 'performance.response.time'],
        },
        metrics: ['system.cpu.usage', 'system.memory.usage', 'performance.response.time'],
      },
      {
        title: '告警统计',
        type: 'table' as const,
        content: alertStats,
        metrics: [],
      },
    ];

    return {
      id: reportId,
      name: '监控报告',
      description: '系统监控和性能分析报告',
      timeRange,
      sections,
      generatedAt: new Date(),
    };
  }

  /**
   * 获取健康状态
   */
  async getHealth(): Promise<ServiceHealth> {
    const baseHealth = await super.getHealth();
    const stats = await this.getMetricStatistics();
    const performance = this.getPerformanceMetrics();

    return {
      ...baseHealth,
      monitoring: {
        metrics: stats,
        performance,
        alerts: {
          rules: this.alertRules.size,
          active: this.alertHistory.filter(e => !e.resolved).length,
          channels: this.notificationChannels.size,
        },
        dashboards: this.dashboards.size,
      },
    } as ServiceHealth;
  }

  /**
   * 设置默认告警规则
   */
  private setupDefaultAlertRules(): void {
    const defaultRules = [
      {
        name: 'CPU使用率过高',
        metric: 'system.cpu.usage',
        type: MetricType.GAUGE,
        condition: {
          operator: 'gt' as const,
          threshold: 80,
          duration: 300,
        },
        severity: AlertSeverity.WARNING,
        description: 'CPU使用率超过80%',
        enabled: true,
        notificationChannels: [],
      },
      {
        name: '内存使用率过高',
        metric: 'system.memory.usage',
        type: MetricType.GAUGE,
        condition: {
          operator: 'gt' as const,
          threshold: 85,
          duration: 300,
        },
        severity: AlertSeverity.WARNING,
        description: '内存使用率超过85%',
        enabled: true,
        notificationChannels: [],
      },
      {
        name: '响应时间过长',
        metric: 'performance.response.time',
        type: MetricType.TIMER,
        condition: {
          operator: 'gt' as const,
          threshold: 5000,
          aggregation: AggregationType.P95,
          timeWindow: TimeWindow.MINUTE_5,
        },
        severity: AlertSeverity.CRITICAL,
        description: '95%的请求响应时间超过5秒',
        enabled: true,
        notificationChannels: [],
      },
    ];

    defaultRules.forEach(rule => {
      this.createAlertRule(rule);
    });
  }

  /**
   * 设置默认通知渠道
   */
  private setupDefaultNotificationChannels(): void {
    // 默认不设置任何通知渠道，需要用户手动配置
  }

  /**
   * 设置默认仪表板
   */
  private setupDefaultDashboards(): void {
    const defaultDashboard: Omit<MetricDashboard, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '系统监控',
      description: '系统性能和健康状态监控',
      panels: [
        {
          id: 'cpu-usage',
          title: 'CPU使用率',
          type: 'gauge',
          position: { x: 0, y: 0, width: 6, height: 4 },
          queries: [{ name: 'system.cpu.usage' }],
          visualization: {
            yAxis: { min: 0, max: 100, unit: MetricUnit.PERCENT },
          },
        },
        {
          id: 'memory-usage',
          title: '内存使用率',
          type: 'gauge',
          position: { x: 6, y: 0, width: 6, height: 4 },
          queries: [{ name: 'system.memory.usage' }],
          visualization: {
            yAxis: { min: 0, max: 100, unit: MetricUnit.PERCENT },
          },
        },
        {
          id: 'response-time',
          title: '响应时间',
          type: 'chart',
          position: { x: 0, y: 4, width: 12, height: 6 },
          queries: [{ name: 'performance.response.time' }],
          visualization: {
            chartType: 'line',
            yAxis: { unit: MetricUnit.MILLISECONDS },
          },
        },
      ],
      timeRange: {
        start: new Date(Date.now() - 3600000), // 1小时前
        end: new Date(),
      },
    };

    this.createDashboard(defaultDashboard);
  }

  /**
   * 启动告警检查
   */
  private startAlertChecking(): void {
    setInterval(async () => {
      await this.checkAlerts();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 检查告警
   */
  private async checkAlerts(): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        const currentValue = await this.getAlertValue(rule);
        const shouldTrigger = this.evaluateAlertCondition(rule.condition, currentValue);

        if (shouldTrigger) {
          await this.triggerAlert(rule, currentValue);
        }
      } catch (error) {
        this.log('error', `Failed to check alert rule: ${rule.name}`, error);
      }
    }
  }

  /**
   * 获取告警值
   */
  private async getAlertValue(rule: AlertRule): Promise<number> {
    if (rule.condition.aggregation && rule.condition.timeWindow) {
      return this.collector.getAggregatedValue(
        rule.metric,
        rule.condition.aggregation,
        rule.condition.timeWindow
      );
    } else {
      return this.collector.getCurrentValue(rule.metric);
    }
  }

  /**
   * 评估告警条件
   */
  private evaluateAlertCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    const event: MetricAlertEvent = {
      id: this.generateEventId(),
      alertId: rule.id,
      severity: rule.severity,
      message: `${rule.name}: ${value} ${rule.condition.operator} ${rule.condition.threshold}`,
      value,
      threshold: rule.condition.threshold,
      timestamp: new Date(),
      resolved: false,
    };

    this.alertHistory.push(event);
    rule.lastTriggered = new Date();

    // 发送通知
    await this.sendNotifications(rule, event);

    // 限制历史记录大小
    if (this.alertHistory.length > 1000) {
      this.alertHistory.splice(0, this.alertHistory.length - 1000);
    }

    this.log('warn', `Alert triggered: ${event.message}`);
  }

  /**
   * 发送通知
   */
  private async sendNotifications(rule: AlertRule, event: MetricAlertEvent): Promise<void> {
    for (const channelId of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) continue;

      try {
        await this.sendNotification(channel, event);
      } catch (error) {
        this.log('error', `Failed to send notification via channel: ${channel.name}`, error);
      }
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(
    channel: NotificationChannel,
    _event: MetricAlertEvent
  ): Promise<void> {
    // 这里可以实现各种通知方式
    switch (channel.type) {
      case 'email':
        // 实现邮件通知
        break;
      case 'webhook':
        // 实现Webhook通知
        break;
      case 'slack':
        // 实现Slack通知
        break;
      case 'sms':
        // 实现短信通知
        break;
      default:
        this.log('warn', `Unsupported notification channel type: ${channel.type}`);
    }
  }

  /**
   * 获取告警统计
   */
  private getAlertStats(timeRange: { start: Date; end: Date }): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
  } {
    const alertsInRange = this.alertHistory.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const bySeverity: Record<string, number> = {};
    alertsInRange.forEach(event => {
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    });

    return {
      total: alertsInRange.length,
      active: alertsInRange.filter(e => !e.resolved).length,
      resolved: alertsInRange.filter(e => e.resolved).length,
      bySeverity,
    };
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成渠道ID
   */
  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成仪表板ID
   */
  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成报告ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { EngineMonitoringService };
export default EngineMonitoringService;
