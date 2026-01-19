/**
 * 性能指标收集器
 * 负责收集、存储和聚合各种性能指标
 */

import {
  MetricAlert,
  MetricAlertEvent,
  MetricCategory,
  MetricConfig,
  MetricDataPoint,
  MetricPerformance,
  MetricQuery,
  MetricQueryResult,
  MetricStatistics,
  MetricTimeSeries,
  MetricType,
  MetricUnit,
  MetricUtils,
  PredefinedMetrics,
} from './MetricTypes';

// 存储接口
export interface MetricStorage {
  store(metric: MetricDataPoint): Promise<void>;
  query(query: MetricQuery): Promise<MetricQueryResult>;
  delete(query: MetricQuery): Promise<number>;
  aggregate(
    metricName: string,
    aggregation: AggregationType,
    timeWindow: TimeWindow
  ): Promise<number>;
  getStatistics(): Promise<MetricStatistics>;
}

// 内存存储实现
export class MemoryMetricStorage implements MetricStorage {
  private data: Map<string, MetricDataPoint[]> = new Map();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }

  async store(metric: MetricDataPoint): Promise<void> {
    const key = this.getStorageKey(metric.name, metric.labels);

    if (!this.data.has(key)) {
      this.data.set(key, []);
    }

    const points = this.data.get(key)!;
    points.push(metric);

    // 限制存储大小
    if (points.length > this.maxSize) {
      points.splice(0, points.length - this.maxSize);
    }
  }

  async query(query: MetricQuery): Promise<MetricQueryResult> {
    const timeSeries: MetricTimeSeries[] = [];
    let totalCount = 0;

    for (const [key, points] of this.data.entries()) {
      const metricName = this.extractMetricName(key);
      const labels = this.extractLabels(key);

      // 过滤条件检查
      if (query.name && metricName !== query.name) continue;
      if (query.labels && !this.matchLabels(labels, query.labels)) continue;

      // 时间范围过滤
      let filteredPoints = points;
      if (query.startTime || query.endTime) {
        filteredPoints = points.filter(p => {
          if (query.startTime && p.timestamp < query.startTime) return false;
          if (query.endTime && p.timestamp > query.endTime) return false;
          return true;
        });
      }

      if (filteredPoints.length > 0) {
        // 聚合计算
        const aggregation: Record<string, number> = {};
        if (query.aggregation) {
          for (const agg of query.aggregation) {
            aggregation[agg] = MetricUtils.aggregate(filteredPoints, agg);
          }
        }

        timeSeries.push({
          name: metricName,
          type: this.getMetricType(metricName),
          category: this.getMetricCategory(metricName),
          unit: this.getMetricUnit(metricName),
          dataPoints: filteredPoints,
          aggregation: Object.keys(aggregation).length > 0 ? aggregation : undefined,
        });

        totalCount += filteredPoints.length;
      }
    }

    // 限制结果数量
    if (query.limit && timeSeries.length > query.limit) {
      timeSeries.splice(query.limit);
    }

    return {
      query,
      timeSeries,
      totalCount,
      hasMore: false,
    };
  }

  async delete(query: MetricQuery): Promise<number> {
    let deletedCount = 0;

    for (const [key, points] of this.data.entries()) {
      const metricName = this.extractMetricName(key);
      const labels = this.extractLabels(key);

      // 过滤条件检查
      if (query.name && metricName !== query.name) continue;
      if (query.labels && !this.matchLabels(labels, query.labels)) continue;

      // 时间范围过滤
      const filteredPoints = points.filter(p => {
        if (query.startTime && p.timestamp < query.startTime) return false;
        if (query.endTime && p.timestamp > query.endTime) return false;
        return true;
      });

      if (filteredPoints.length === points.length) {
        // 删除整个时间序列
        this.data.delete(key);
        deletedCount += points.length;
      } else {
        // 删除部分数据点
        const remainingPoints = points.filter(p => {
          if (query.startTime && p.timestamp < query.startTime) return false;
          if (query.endTime && p.timestamp > query.endTime) return false;
          return true;
        });

        deletedCount += points.length - remainingPoints.length;
        this.data.set(key, remainingPoints);
      }
    }

    return deletedCount;
  }

  async aggregate(
    metricName: string,
    aggregation: AggregationType,
    timeWindow: TimeWindow
  ): Promise<number> {
    const windowMs = MetricUtils.getTimeWindowMs(timeWindow);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - windowMs);

    const query: MetricQuery = {
      name: metricName,
      startTime,
      endTime,
      aggregation: [aggregation],
    };

    const result = await this.query(query);

    if (result.timeSeries.length === 0) {
      return 0;
    }

    const timeSeries = result.timeSeries[0];
    return timeSeries.aggregation?.[aggregation] || 0;
  }

  async getStatistics(): Promise<MetricStatistics> {
    const totalMetrics = this.data.size;
    const metricsByType: Record<string, number> = {};
    const metricsByCategory: Record<string, number> = {};
    let dataPoints = 0;

    for (const [key, points] of this.data.entries()) {
      const metricName = this.extractMetricName(key);
      const type = this.getMetricType(metricName);
      const category = this.getMetricCategory(metricName);

      metricsByType[type] = (metricsByType[type] || 0) + 1;
      metricsByCategory[category] = (metricsByCategory[category] || 0) + 1;
      dataPoints += points.length;
    }

    return {
      totalMetrics,
      metricsByType: metricsByType as any,
      metricsByCategory: metricsByCategory as any,
      dataPoints,
      storageSize: this.estimateStorageSize(),
      alerts: {
        total: 0,
        active: 0,
        resolved: 0,
      },
      dashboards: 0,
    };
  }

  private getStorageKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${labelPairs}}`;
  }

  private extractMetricName(key: string): string {
    const braceIndex = key.indexOf('{');
    return braceIndex > 0 ? key.substring(0, braceIndex) : key;
  }

  private extractLabels(key: string): Record<string, string> {
    const braceStart = key.indexOf('{');
    const braceEnd = key.indexOf('}');

    if (braceStart < 0 || braceEnd < 0 || braceEnd <= braceStart) {
      return {};
    }

    const labelStr = key.substring(braceStart + 1, braceEnd);
    const labels: Record<string, string> = {};

    labelStr.split(',').forEach(pair => {
      const [name, value] = pair.split('=');
      if (name && value) {
        labels[name.trim()] = value.trim();
      }
    });

    return labels;
  }

  private matchLabels(
    storedLabels: Record<string, string>,
    queryLabels: Record<string, string>
  ): boolean {
    for (const [key, value] of Object.entries(queryLabels)) {
      if (storedLabels[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private getMetricType(name: string): string {
    const definition = PredefinedMetrics[name];
    return definition?.type || MetricType.GAUGE;
  }

  private getMetricCategory(name: string): string {
    const definition = PredefinedMetrics[name];
    return definition?.category || MetricCategory.SYSTEM;
  }

  private getMetricUnit(name: string): string {
    const definition = PredefinedMetrics[name];
    return definition?.unit || MetricUnit.NONE;
  }

  private estimateStorageSize(): number {
    let size = 0;
    for (const points of this.data.values()) {
      size += points.length * 100; // 估算每个数据点100字节
    }
    return size;
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [key, points] of this.data.entries()) {
      const filteredPoints = points.filter(p => now - p.timestamp.getTime() < maxAge);

      if (filteredPoints.length === 0) {
        this.data.delete(key);
      } else if (filteredPoints.length < points.length) {
        this.data.set(key, filteredPoints);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.data.clear();
  }
}

// 指标收集器类
export class MetricCollector {
  private storage: MetricStorage;
  private config: MetricConfig;
  private alerts: Map<string, MetricAlert> = new Map();
  private alertHistory: MetricAlertEvent[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: MetricPerformance;

  constructor(storage: MetricStorage, config: MetricConfig) {
    this.storage = storage;
    this.config = config;
    this.performanceMetrics = {
      collectionLatency: 0,
      queryLatency: 0,
      storageLatency: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  /**
   * 记录指标
   */
  async record(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    if (!this.config.enabled) return;

    const startTime = Date.now();

    try {
      const dataPoint = MetricUtils.createDataPoint(value, labels);
      dataPoint.name = name; // 确保名称正确设置

      await this.storage.store(dataPoint);

      // 检查警报
      await this.checkAlerts(name, value, labels);

      // 更新性能指标
      this.updatePerformanceMetrics('collection', Date.now() - startTime, true);
    } catch (error) {
      this.updatePerformanceMetrics('collection', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * 增加计数器
   */
  async increment(name: string, value: number = 1, labels?: Record<string, string>): Promise<void> {
    // 对于计数器，我们需要获取当前值并增加
    const current = await this.getCurrentValue(name, labels);
    await this.record(name, current + value, labels);
  }

  /**
   * 设置仪表盘值
   */
  async set(name: string, value: number, labels?: Record<string, string>): Promise<void> {
    await this.record(name, value, labels);
  }

  /**
   * 记录定时器
   */
  async timer(name: string, duration: number, labels?: Record<string, string>): Promise<void> {
    await this.record(name, duration, labels);
  }

  /**
   * 开始计时
   */
  startTimer(name: string, labels?: Record<string, string>): () => Promise<void> {
    const startTime = Date.now();

    return async () => {
      const duration = Date.now() - startTime;
      await this.timer(name, duration, labels);
    };
  }

  /**
   * 查询指标
   */
  async query(query: MetricQuery): Promise<MetricQueryResult> {
    const startTime = Date.now();

    try {
      const result = await this.storage.query(query);
      this.updatePerformanceMetrics('query', Date.now() - startTime, true);
      return result;
    } catch (error) {
      this.updatePerformanceMetrics('query', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * 获取当前值
   */
  async getCurrentValue(name: string, labels?: Record<string, string>): Promise<number> {
    const query: MetricQuery = {
      name,
      labels,
      limit: 1,
    };

    const result = await this.query(query);

    if (result.timeSeries.length === 0 || result.timeSeries[0].dataPoints.length === 0) {
      return 0;
    }

    const dataPoints = result.timeSeries[0].dataPoints;
    return dataPoints[dataPoints.length - 1].value;
  }

  /**
   * 获取聚合值
   */
  async getAggregatedValue(
    name: string,
    aggregation: AggregationType,
    timeWindow: TimeWindow,
    labels?: Record<string, string>
  ): Promise<number> {
    return this.storage.aggregate(name, aggregation, timeWindow);
  }

  /**
   * 创建警报
   */
  createAlert(alert: Omit<MetricAlert, 'id' | 'createdAt'>): string {
    const id = this.generateAlertId();
    const fullAlert: MetricAlert = {
      ...alert,
      id,
      createdAt: new Date(),
    };

    this.alerts.set(id, fullAlert);
    return id;
  }

  /**
   * 更新警报
   */
  updateAlert(id: string, updates: Partial<MetricAlert>): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    Object.assign(alert, updates);
    return true;
  }

  /**
   * 删除警报
   */
  deleteAlert(id: string): boolean {
    return this.alerts.delete(id);
  }

  /**
   * 获取警报
   */
  getAlert(id: string): MetricAlert | undefined {
    return this.alerts.get(id);
  }

  /**
   * 获取所有警报
   */
  getAllAlerts(): MetricAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取警报历史
   */
  getAlertHistory(limit?: number): MetricAlertEvent[] {
    const history = [...this.alertHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 启动自动收集
   */
  startAutoCollection(intervalMs: number = 60000): void {
    if (this.collectionInterval) {
      this.stopAutoCollection();
    }

    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, intervalMs);
  }

  /**
   * 停止自动收集
   */
  stopAutoCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * 收集系统指标
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // CPU使用率
      const cpuUsage = process.cpuUsage();
      await this.record('system.cpu.usage', cpuUsage.user + cpuUsage.system);

      // 内存使用率
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      await this.record('system.memory.usage', memoryPercent);

      // 活跃句柄数
      await this.record('system.handles.active', process.getActiveHandlesInfo().length);

      // 请求延迟
      await this.record(
        'performance.collection.latency',
        this.performanceMetrics.collectionLatency
      );
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * 检查警报
   */
  private async checkAlerts(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.metricName !== name) continue;

      const shouldTrigger = this.evaluateAlertCondition(alert.condition, value);

      if (shouldTrigger) {
        await this.triggerAlert(alert, value, labels);
      }
    }
  }

  /**
   * 评估警报条件
   */
  private evaluateAlertCondition(condition: any, value: number): boolean {
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
   * 触发警报
   */
  private async triggerAlert(
    alert: MetricAlert,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    const event: MetricAlertEvent = {
      id: this.generateEventId(),
      alertId: alert.id,
      severity: alert.severity,
      message: `${alert.name}: ${value} ${alert.condition.operator} ${alert.condition.threshold}`,
      value,
      threshold: alert.condition.threshold,
      timestamp: new Date(),
      resolved: false,
    };

    this.alertHistory.push(event);
    alert.lastTriggered = new Date();

    // 发送通知（这里可以集成通知服务）
    console.warn(`Alert triggered: ${event.message}`);

    // 限制历史记录大小
    if (this.alertHistory.length > 1000) {
      this.alertHistory.splice(0, this.alertHistory.length - 1000);
    }
  }

  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(
    operation: 'collection' | 'query' | 'storage',
    latency: number,
    success: boolean
  ): void {
    switch (operation) {
      case 'collection':
        this.performanceMetrics.collectionLatency = latency;
        break;
      case 'query':
        this.performanceMetrics.queryLatency = latency;
        break;
      case 'storage':
        this.performanceMetrics.storageLatency = latency;
        break;
    }

    // 更新错误率
    if (!success) {
      this.performanceMetrics.errorRate = Math.min(1, this.performanceMetrics.errorRate + 0.01);
    } else {
      this.performanceMetrics.errorRate = Math.max(0, this.performanceMetrics.errorRate - 0.001);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): MetricPerformance {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<MetricStatistics> {
    const storageStats = await this.storage.getStatistics();

    return {
      ...storageStats,
      alerts: {
        total: this.alerts.size,
        active: this.alertHistory.filter(e => !e.resolved).length,
        resolved: this.alertHistory.filter(e => e.resolved).length,
      },
    };
  }

  /**
   * 生成警报ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoCollection();

    if (this.storage instanceof MemoryMetricStorage) {
      this.storage.destroy();
    }

    this.alerts.clear();
    this.alertHistory.length = 0;
  }
}

export default MetricCollector;
