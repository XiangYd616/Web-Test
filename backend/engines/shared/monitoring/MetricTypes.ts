/**
 * 性能监控指标类型定义
 * 定义所有监控指标的类型、分类和计算方法
 */

// 指标类型
export const MetricType = {
  COUNTER: 'counter', // 计数器（单调递增）
  GAUGE: 'gauge', // 仪表盘（可增可减）
  HISTOGRAM: 'histogram', // 直方图（分布统计）
  TIMER: 'timer', // 定时器（耗时统计）
  RATE: 'rate', // 速率（单位时间内的变化）
  PERCENTAGE: 'percentage', // 百分比（0-100）
} as const;

export type MetricTypeType = (typeof MetricType)[keyof typeof MetricType];

// 指标分类
export const MetricCategory = {
  PERFORMANCE: 'performance', // 性能指标
  USAGE: 'usage', // 使用统计
  ERROR: 'error', // 错误指标
  BUSINESS: 'business', // 业务指标
  SYSTEM: 'system', // 系统指标
  QUALITY: 'quality', // 质量指标
} as const;

export type MetricCategoryType = (typeof MetricCategory)[keyof typeof MetricCategory];

// 聚合方式
export const AggregationType = {
  SUM: 'sum', // 求和
  AVERAGE: 'avg', // 平均值
  MIN: 'min', // 最小值
  MAX: 'max', // 最大值
  MEDIAN: 'median', // 中位数
  P95: 'p95', // 95百分位
  P99: 'p99', // 99百分位
  COUNT: 'count', // 计数
  RATE: 'rate', // 速率
} as const;

export type AggregationTypeType = (typeof AggregationType)[keyof typeof AggregationType];

// 时间窗口
export const TimeWindow = {
  MINUTE_1: '1m', // 1分钟
  MINUTE_5: '5m', // 5分钟
  MINUTE_15: '15m', // 15分钟
  HOUR_1: '1h', // 1小时
  HOUR_6: '6h', // 6小时
  HOUR_24: '24h', // 24小时
  DAY_7: '7d', // 7天
  DAY_30: '30d', // 30天
} as const;

export type TimeWindowType = (typeof TimeWindow)[keyof typeof TimeWindow];

// 指标单位
export const MetricUnit = {
  NONE: 'none', // 无单位
  BYTES: 'bytes', // 字节
  KILOBYTES: 'kb', // 千字节
  MEGABYTES: 'mb', // 兆字节
  GIGABYTES: 'gb', // 吉字节
  SECONDS: 'seconds', // 秒
  MILLISECONDS: 'ms', // 毫秒
  MICROSECONDS: 'μs', // 微秒
  NANOSECONDS: 'ns', // 纳秒
  PERCENT: 'percent', // 百分比
  COUNT: 'count', // 计数
  RATE_PER_SECOND: 'rate/s', // 每秒速率
  RATE_PER_MINUTE: 'rate/m', // 每分钟速率
  RATE_PER_HOUR: 'rate/h', // 每小时速率
} as const;

export type MetricUnitType = (typeof MetricUnit)[keyof typeof MetricUnit];

// 基础指标接口
export interface BaseMetric {
  name: string;
  type: MetricTypeType;
  category: MetricCategoryType;
  unit: MetricUnitType;
  description: string;
  labels?: Record<string, string>;
  timestamp: Date;
}

// 计数器指标
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
  value: number;
  total: number;
}

// 仪表盘指标
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
  value: number;
  min?: number;
  max?: number;
}

// 直方图指标
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  buckets: Array<{
    upperBound: number;
    count: number;
  }>;
  count: number;
  sum: number;
}

// 定时器指标
export interface TimerMetric extends BaseMetric {
  type: MetricType.TIMER;
  duration: number;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

// 速率指标
export interface RateMetric extends BaseMetric {
  type: MetricType.RATE;
  value: number;
  interval: number;
  unit:
    | MetricUnitType.RATE_PER_SECOND
    | MetricUnitType.RATE_PER_MINUTE
    | MetricUnitType.RATE_PER_HOUR;
}

// 百分比指标
export interface PercentageMetric extends BaseMetric {
  type: MetricType.PERCENTAGE;
  value: number;
  total: number;
  current: number;
}

// 联合指标类型
export type Metric =
  | CounterMetric
  | GaugeMetric
  | HistogramMetric
  | TimerMetric
  | RateMetric
  | PercentageMetric;

// 指标定义接口
export interface MetricDefinition {
  name: string;
  type: MetricTypeType;
  category: MetricCategoryType;
  unit: MetricUnitType;
  description: string;
  labels?: string[];
  aggregation?: AggregationTypeType[];
  timeWindows?: TimeWindowType[];
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

// 指标数据点接口
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

// 指标时间序列接口
export interface MetricTimeSeries {
  name: string;
  type: MetricTypeType;
  category: MetricCategoryType;
  unit: MetricUnitType;
  dataPoints: MetricDataPoint[];
  aggregation?: Record<AggregationTypeType, number>;
}

// 指标查询接口
export interface MetricQuery {
  name?: string;
  category?: MetricCategoryType;
  type?: MetricTypeType;
  labels?: Record<string, string>;
  timeWindow?: TimeWindowType;
  startTime?: Date;
  endTime?: Date;
  aggregation?: AggregationTypeType[];
  limit?: number;
}

// 指标查询结果接口
export interface MetricQueryResult {
  query: MetricQuery;
  timeSeries: MetricTimeSeries[];
  totalCount: number;
  hasMore: boolean;
}

// 指标警报接口
export interface MetricAlert {
  id: string;
  name: string;
  description: string;
  metricName: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  notificationChannels: string[];
}

// 警报条件接口
export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration?: number; // 持续时间（秒）
  aggregation?: AggregationTypeType;
  timeWindow?: TimeWindowType;
}

// 警报严重程度
export const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export type AlertSeverityType = (typeof AlertSeverity)[keyof typeof AlertSeverity];

// 警报事件接口
export interface MetricAlertEvent {
  id: string;
  alertId: string;
  severity: AlertSeverityType;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// 指标仪表盘接口
export interface MetricDashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  timeRange: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 仪表盘面板接口
export interface DashboardPanel {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'stat' | 'gauge';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  queries: MetricQuery[];
  visualization: {
    chartType?: 'line' | 'bar' | 'area' | 'pie';
    yAxis?: {
      min?: number;
      max?: number;
      unit?: MetricUnitType;
    };
    colors?: string[];
  };
}

// 指标报告接口
export interface MetricReport {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  sections: ReportSection[];
  generatedAt: Date;
}

// 报告章节接口
export interface ReportSection {
  title: string;
  type: 'summary' | 'chart' | 'table' | 'text';
  content: any;
  metrics: string[];
}

// 指标配置接口
export interface MetricConfig {
  enabled: boolean;
  retention: {
    raw: number; // 原始数据保留时间（秒）
    aggregated: number; // 聚合数据保留时间（秒）
  };
  aggregation: {
    intervals: TimeWindowType[];
    functions: AggregationTypeType[];
  };
  alerts: {
    enabled: boolean;
    defaultChannels: string[];
  };
  dashboards: {
    enabled: boolean;
    refreshInterval: number;
  };
}

// 指标统计接口
export interface MetricStatistics {
  totalMetrics: number;
  metricsByType: Record<MetricTypeType, number>;
  metricsByCategory: Record<MetricCategoryType, number>;
  dataPoints: number;
  storageSize: number;
  alerts: {
    total: number;
    active: number;
    resolved: number;
  };
  dashboards: number;
}

// 指标性能接口
export interface MetricPerformance {
  collectionLatency: number;
  queryLatency: number;
  storageLatency: number;
  throughput: number;
  errorRate: number;
}

// 预定义指标定义
export const PredefinedMetrics: Record<string, MetricDefinition> = {
  // 系统指标
  'system.cpu.usage': {
    name: 'system.cpu.usage',
    type: MetricType.GAUGE,
    category: MetricCategory.SYSTEM,
    unit: MetricUnit.PERCENT,
    description: 'CPU使用率',
    thresholds: {
      warning: 80,
      critical: 95,
    },
  },
  'system.memory.usage': {
    name: 'system.memory.usage',
    type: MetricType.GAUGE,
    category: MetricCategory.SYSTEM,
    unit: MetricUnit.PERCENT,
    description: '内存使用率',
    thresholds: {
      warning: 85,
      critical: 95,
    },
  },
  'system.disk.usage': {
    name: 'system.disk.usage',
    type: MetricType.GAUGE,
    category: MetricCategory.SYSTEM,
    unit: MetricUnit.PERCENT,
    description: '磁盘使用率',
    thresholds: {
      warning: 80,
      critical: 90,
    },
  },

  // 性能指标
  'performance.response.time': {
    name: 'performance.response.time',
    type: MetricType.TIMER,
    category: MetricCategory.PERFORMANCE,
    unit: MetricUnit.MILLISECONDS,
    description: '响应时间',
    aggregation: [AggregationType.AVERAGE, AggregationType.P95, AggregationType.P99],
    thresholds: {
      warning: 1000,
      critical: 5000,
    },
  },
  'performance.throughput': {
    name: 'performance.throughput',
    type: MetricType.RATE,
    category: MetricCategory.PERFORMANCE,
    unit: MetricUnit.RATE_PER_SECOND,
    description: '吞吐量',
  },

  // 错误指标
  'error.count': {
    name: 'error.count',
    type: MetricType.COUNTER,
    category: MetricCategory.ERROR,
    unit: MetricUnit.COUNT,
    description: '错误计数',
  },
  'error.rate': {
    name: 'error.rate',
    type: MetricType.RATE,
    category: MetricCategory.ERROR,
    unit: MetricUnit.PERCENT,
    description: '错误率',
    thresholds: {
      warning: 5,
      critical: 10,
    },
  },

  // 使用统计
  'usage.requests': {
    name: 'usage.requests',
    type: MetricType.COUNTER,
    category: MetricCategory.USAGE,
    unit: MetricUnit.COUNT,
    description: '请求总数',
  },
  'usage.users': {
    name: 'usage.users',
    type: MetricType.GAUGE,
    category: MetricCategory.USAGE,
    unit: MetricUnit.COUNT,
    description: '活跃用户数',
  },

  // 业务指标
  'business.conversions': {
    name: 'business.conversions',
    type: MetricType.COUNTER,
    category: MetricCategory.BUSINESS,
    unit: MetricUnit.COUNT,
    description: '转化数',
  },
  'business.revenue': {
    name: 'business.revenue',
    type: MetricType.COUNTER,
    category: MetricCategory.BUSINESS,
    unit: MetricUnit.NONE,
    description: '收入',
  },
};

// 指标工具类
export class MetricUtils {
  /**
   * 验证指标名称
   */
  static validateMetricName(name: string): boolean {
    return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(name);
  }

  /**
   * 格式化指标值
   */
  static formatValue(value: number, unit: MetricUnitType): string {
    switch (unit) {
      case MetricUnit.BYTES:
        return this.formatBytes(value);
      case MetricUnit.MILLISECONDS:
        return `${value}ms`;
      case MetricUnit.SECONDS:
        return `${value}s`;
      case MetricUnit.PERCENT:
        return `${value}%`;
      case MetricUnit.RATE_PER_SECOND:
        return `${value}/s`;
      case MetricUnit.RATE_PER_MINUTE:
        return `${value}/m`;
      case MetricUnit.RATE_PER_HOUR:
        return `${value}/h`;
      default:
        return value.toString();
    }
  }

  /**
   * 格式化字节数
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 计算百分位数
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (index === Math.floor(index)) {
      return sorted[index];
    }

    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    const fraction = index - Math.floor(index);

    return lower + (upper - lower) * fraction;
  }

  /**
   * 聚合指标数据
   */
  static aggregate(dataPoints: MetricDataPoint[], aggregation: AggregationTypeType): number {
    if (dataPoints.length === 0) return 0;

    const values = dataPoints.map(dp => dp.value);

    switch (aggregation) {
      case AggregationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      case AggregationType.AVERAGE:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case AggregationType.MIN:
        return Math.min(...values);
      case AggregationType.MAX:
        return Math.max(...values);
      case AggregationType.MEDIAN:
        return this.calculatePercentile(values, 50);
      case AggregationType.P95:
        return this.calculatePercentile(values, 95);
      case AggregationType.P99:
        return this.calculatePercentile(values, 99);
      case AggregationType.COUNT:
        return values.length;
      case AggregationType.RATE:
        if (dataPoints.length < 2) return 0;
        const timeDiff =
          dataPoints[dataPoints.length - 1].timestamp.getTime() - dataPoints[0].timestamp.getTime();
        const valueDiff = dataPoints[dataPoints.length - 1].value - dataPoints[0].value;
        return timeDiff > 0 ? (valueDiff / timeDiff) * 1000 : 0; // 每秒速率
      default:
        return 0;
    }
  }

  /**
   * 获取时间窗口的毫秒数
   */
  static getTimeWindowMs(window: TimeWindowType): number {
    const multipliers = {
      [TimeWindow.MINUTE_1]: 60 * 1000,
      [TimeWindow.MINUTE_5]: 5 * 60 * 1000,
      [TimeWindow.MINUTE_15]: 15 * 60 * 1000,
      [TimeWindow.HOUR_1]: 60 * 60 * 1000,
      [TimeWindow.HOUR_6]: 6 * 60 * 60 * 1000,
      [TimeWindow.HOUR_24]: 24 * 60 * 60 * 1000,
      [TimeWindow.DAY_7]: 7 * 24 * 60 * 60 * 1000,
      [TimeWindow.DAY_30]: 30 * 24 * 60 * 60 * 1000,
    };

    return multipliers[window] || 0;
  }

  /**
   * 创建指标数据点
   */
  static createDataPoint(value: number, labels?: Record<string, string>): MetricDataPoint {
    return {
      timestamp: new Date(),
      value,
      labels,
    };
  }

  /**
   * 合并标签
   */
  static mergeLabels(...labelSets: (Record<string, string> | undefined)[]): Record<string, string> {
    return labelSets.reduce(
      (merged, labels) => {
        if (labels) {
          Object.assign(merged, labels);
        }
        return merged;
      },
      {} as Record<string, string>
    );
  }
}

export default {
  MetricType,
  MetricCategory,
  AggregationType,
  TimeWindow,
  MetricUnit,
  AlertSeverity,
  PredefinedMetrics,
  MetricUtils,
};
