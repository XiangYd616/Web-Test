/**
 * 性能指标收集器
 * 负责收集、存储和聚合各种性能指标
 */

import { 
  MetricType, 
  MetricCategory, 
  AggregationType, 
  TimeWindow,
  PredefinedMetrics 
} from './MetricTypes.js';

/**
 * 指标数据点
 */
class MetricDataPoint {
  constructor(name, value, timestamp = null, labels = {}) {
    this.name = name;
    this.value = value;
    this.timestamp = timestamp || Date.now();
    this.labels = labels;
  }

  toJSON() {
    return {
      name: this.name,
      value: this.value,
      timestamp: this.timestamp,
      labels: this.labels
    };
  }
}

/**
 * 时间序列数据
 */
class TimeSeries {
  constructor(name, maxSize = 1000) {
    this.name = name;
    this.points = [];
    this.maxSize = maxSize;
  }

  addPoint(value, timestamp = null, labels = {}) {
    const point = new MetricDataPoint(this.name, value, timestamp, labels);
    this.points.push(point);
    
    // 限制数据点数量
    if (this.points.length > this.maxSize) {
      this.points = this.points.slice(-this.maxSize);
    }
    
    return point;
  }

  getPoints(timeWindow = null, startTime = null, endTime = null) {
    let filteredPoints = [...this.points];
    
    if (timeWindow) {
      const windowStart = Date.now() - timeWindow.value;
      filteredPoints = filteredPoints.filter(p => p.timestamp >= windowStart);
    }
    
    if (startTime) {
      filteredPoints = filteredPoints.filter(p => p.timestamp >= startTime);
    }
    
    if (endTime) {
      filteredPoints = filteredPoints.filter(p => p.timestamp <= endTime);
    }
    
    return filteredPoints;
  }

  getLatestValue() {
    if (this.points.length === 0) return null;
    return this.points[this.points.length - 1].value;
  }

  aggregate(aggregationType, timeWindow = null) {
    const points = this.getPoints(timeWindow);
    if (points.length === 0) return null;
    
    const values = points.map(p => p.value);
    
    switch (aggregationType) {
      case AggregationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      
      case AggregationType.AVERAGE:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      
      case AggregationType.MIN:
        return Math.min(...values);
      
      case AggregationType.MAX:
        return Math.max(...values);
      
      case AggregationType.COUNT:
        return values.length;
      
      case AggregationType.P50:
        return this.percentile(values, 0.5);
      
      case AggregationType.P90:
        return this.percentile(values, 0.9);
      
      case AggregationType.P95:
        return this.percentile(values, 0.95);
      
      case AggregationType.P99:
        return this.percentile(values, 0.99);
      
      default:
        return null;
    }
  }

  percentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  clear() {
    this.points = [];
  }
}

/**
 * 指标收集器主类
 */
class MetricCollector {
  constructor(options = {}) {
    this.options = {
      maxSeriesSize: 1000,
      enableAutoCleanup: true,
      cleanupInterval: 5 * 60 * 1000, // 5分钟
      maxRetentionTime: 24 * 60 * 60 * 1000, // 24小时
      ...options
    };
    
    // 时间序列存储
    this.timeSeries = new Map();
    
    // 指标定义注册
    this.metricDefinitions = new Map();
    
    // 计数器状态
    this.counters = new Map();
    
    // 仪表盘当前值
    this.gauges = new Map();
    
    // 定时器状态
    this.timers = new Map();
    
    // 直方图数据
    this.histograms = new Map();
    
    // 初始化预定义指标
    this.initializePredefinedMetrics();
    
    // 启动自动清理
    if (this.options.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * 初始化预定义指标
   */
  initializePredefinedMetrics() {
    Object.values(PredefinedMetrics).forEach(metric => {
      this.registerMetric(metric);
    });
  }

  /**
   * 注册指标定义
   */
  registerMetric(metricDefinition) {
    this.metricDefinitions.set(metricDefinition.name, metricDefinition);
    
    // 为指标创建时间序列
    if (!this.timeSeries.has(metricDefinition.name)) {
      this.timeSeries.set(metricDefinition.name, 
        new TimeSeries(metricDefinition.name, this.options.maxSeriesSize)
      );
    }
    
    return true;
  }

  /**
   * 记录计数器增量
   */
  incrementCounter(name, increment = 1, labels = {}) {
    const key = this.getCounterKey(name, labels);
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + increment;
    
    this.counters.set(key, newValue);
    this.addDataPoint(name, newValue, labels);
    
    return newValue;
  }

  /**
   * 设置仪表盘值
   */
  setGauge(name, value, labels = {}) {
    const key = this.getGaugeKey(name, labels);
    this.gauges.set(key, value);
    this.addDataPoint(name, value, labels);
    
    return value;
  }

  /**
   * 记录定时器
   */
  recordTimer(name, duration, labels = {}) {
    this.addDataPoint(name, duration, labels);
    return duration;
  }

  /**
   * 开始计时
   */
  startTimer(name, labels = {}) {
    const timerKey = `${name}_${JSON.stringify(labels)}_${Date.now()}`;
    const startTime = Date.now();
    
    this.timers.set(timerKey, startTime);
    
    return {
      end: () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        this.timers.delete(timerKey);
        this.recordTimer(name, duration, labels);
        return duration;
      }
    };
  }

  /**
   * 记录直方图数据
   */
  recordHistogram(name, value, labels = {}) {
    const key = this.getHistogramKey(name, labels);
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    
    const histogram = this.histograms.get(key);
    histogram.push(value);
    
    // 限制直方图大小
    if (histogram.length > this.options.maxSeriesSize) {
      histogram.splice(0, histogram.length - this.options.maxSeriesSize);
    }
    
    this.addDataPoint(name, value, labels);
    return value;
  }

  /**
   * 记录百分比
   */
  recordPercentage(name, value, labels = {}) {
    // 确保值在0-100范围内
    const clampedValue = Math.max(0, Math.min(100, value));
    this.addDataPoint(name, clampedValue, labels);
    return clampedValue;
  }

  /**
   * 记录速率
   */
  recordRate(name, count, timeWindow = TimeWindow.SECOND, labels = {}) {
    const rate = count / (timeWindow.value / 1000); // 转换为每秒
    this.addDataPoint(name, rate, labels);
    return rate;
  }

  /**
   * 添加数据点到时间序列
   */
  addDataPoint(name, value, labels = {}, timestamp = null) {
    const series = this.timeSeries.get(name);
    if (!series) {
      // 如果指标未注册，创建一个基础的时间序列
      this.timeSeries.set(name, new TimeSeries(name, this.options.maxSeriesSize));
    }
    
    const point = this.timeSeries.get(name).addPoint(value, timestamp, labels);
    return point;
  }

  /**
   * 获取指标值
   */
  getMetricValue(name, aggregationType = AggregationType.AVERAGE, timeWindow = null) {
    const series = this.timeSeries.get(name);
    if (!series) return null;
    
    return series.aggregate(aggregationType, timeWindow);
  }

  /**
   * 获取指标时间序列
   */
  getTimeSeries(name) {
    return this.timeSeries.get(name);
  }

  /**
   * 获取所有指标概要
   */
  getMetricsSummary(timeWindow = TimeWindow.HOUR) {
    const summary = {};
    
    this.timeSeries.forEach((series, name) => {
      const definition = this.metricDefinitions.get(name);
      if (!definition) return;
      
      const aggregations = {};
      definition.aggregations.forEach(aggType => {
        aggregations[aggType] = series.aggregate(aggType, timeWindow);
      });
      
      summary[name] = {
        definition,
        aggregations,
        latestValue: series.getLatestValue(),
        dataPoints: series.getPoints(timeWindow).length
      };
    });
    
    return summary;
  }

  /**
   * 获取分类指标
   */
  getMetricsByCategory(category, timeWindow = TimeWindow.HOUR) {
    const categoryMetrics = {};
    
    this.metricDefinitions.forEach((definition, name) => {
      if (definition.category === category) {

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        const series = this.timeSeries.get(name);
        if (series) {
          categoryMetrics[name] = {
            definition,
            latestValue: series.getLatestValue(),
            average: series.aggregate(AggregationType.AVERAGE, timeWindow)
          };
        }
      }
    });
    
    return categoryMetrics;
  }

  /**
   * 获取系统健康状态
   */
  getSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {},
      issues: []
    };
    
    // 检查错误率
    const errorRate = this.getMetricValue(
      PredefinedMetrics.ERROR_RATE.name, 
      AggregationType.AVERAGE, 
      TimeWindow.MINUTE
    );
    
    if (errorRate !== null) {
      health.metrics.errorRate = errorRate;
      if (errorRate > 10) {
        health.status = 'degraded';
        health.issues.push(`高错误率: ${errorRate.toFixed(2)}%`);
      }
    }
    
    // 检查响应时间
    const responseTime = this.getMetricValue(
      PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
      AggregationType.P95,
      TimeWindow.MINUTE
    );
    
    if (responseTime !== null) {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      health.metrics.responseTime = responseTime;
      if (responseTime > 5000) {
        health.status = 'degraded';
        health.issues.push(`响应时间过慢: ${responseTime.toFixed(0)}ms`);
      }
    }
    
    // 检查内存使用
    const memoryUsage = this.getMetricValue(
      PredefinedMetrics.MEMORY_USAGE.name,
      AggregationType.AVERAGE,
      TimeWindow.MINUTE
    );
    
    if (memoryUsage !== null) {
      health.metrics.memoryUsage = memoryUsage;
      if (memoryUsage > 1000) { // 1GB
        health.status = 'warning';
        health.issues.push(`内存使用过高: ${memoryUsage.toFixed(0)}MB`);
      }
    }
    
    // 如果有严重问题，设置为不健康
    if (health.issues.length > 3) {
      health.status = 'unhealthy';
    }
    
    return health;
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const cutoffTime = Date.now() - this.options.maxRetentionTime;
    
    this.timeSeries.forEach((series) => {
      series.points = series.points.filter(point => point.timestamp > cutoffTime);
    });
    
    // 清理过期的计时器
    const expiredTimers = [];
    this.timers.forEach((startTime, key) => {
      if (startTime < cutoffTime) {
        expiredTimers.push(key);
      }
    });
    
    expiredTimers.forEach(key => this.timers.delete(key));
  }

  /**
   * 开始自动清理
   */
  startAutoCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 导出所有数据
   */
  exportData(format = 'json') {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: {},
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges)
    };
    
    this.timeSeries.forEach((series, name) => {
      data.metrics[name] = {
        points: series.points,
        definition: this.metricDefinitions.get(name)
      };
    });
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    return data;
  }

  /**
   * 重置所有数据
   */
  reset() {
    this.timeSeries.forEach(series => series.clear());
    this.counters.clear();
    this.gauges.clear();
    this.timers.clear();
    this.histograms.clear();
  }

  /**
   * 工具方法：生成计数器键
   */
  getCounterKey(name, labels) {
    return `${name}:${JSON.stringify(labels)}`;
  }

  /**
   * 工具方法：生成仪表盘键
   */
  getGaugeKey(name, labels) {
    return `${name}:${JSON.stringify(labels)}`;
  }

  /**
   * 工具方法：生成直方图键
   */
  getHistogramKey(name, labels) {
    return `${name}:${JSON.stringify(labels)}`;
  }

  /**
   * 析构函数
   */
  destroy() {
    this.stopAutoCleanup();
    this.reset();
  }
}

export { MetricDataPoint, TimeSeries, MetricCollector };
export default MetricCollector;
