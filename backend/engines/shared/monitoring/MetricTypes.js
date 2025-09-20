/**
 * 性能监控指标类型定义
 * 定义所有监控指标的类型、分类和计算方法
 */

// 指标类型
export const MetricType = {
  COUNTER: 'counter',           // 计数器（单调递增）
  GAUGE: 'gauge',              // 仪表盘（可增可减）
  HISTOGRAM: 'histogram',      // 直方图（分布统计）
  TIMER: 'timer',              // 定时器（耗时统计）
  RATE: 'rate',                // 速率（单位时间内的变化）
  PERCENTAGE: 'percentage'      // 百分比（0-100）
};

// 指标分类
export const MetricCategory = {
  PERFORMANCE: 'performance',   // 性能指标
  USAGE: 'usage',              // 使用统计
  ERROR: 'error',              // 错误指标  
  BUSINESS: 'business',        // 业务指标
  SYSTEM: 'system',            // 系统指标
  QUALITY: 'quality'           // 质量指标
};

// 聚合方式
export const AggregationType = {
  SUM: 'sum',                  // 求和
  AVERAGE: 'avg',              // 平均值
  MIN: 'min',                  // 最小值
  MAX: 'max',                  // 最大值
  COUNT: 'count',              // 计数
  P50: 'p50',                  // 50分位数
  P90: 'p90',                  // 90分位数
  P95: 'p95',                  // 95分位数
  P99: 'p99'                   // 99分位数
};

// 时间窗口
export const TimeWindow = {
  SECOND: { value: 1000, label: '1秒' },
  MINUTE: { value: 60 * 1000, label: '1分钟' },
  HOUR: { value: 60 * 60 * 1000, label: '1小时' },
  DAY: { value: 24 * 60 * 60 * 1000, label: '1天' },
  WEEK: { value: 7 * 24 * 60 * 60 * 1000, label: '1周' }
};

// 预定义指标
export const PredefinedMetrics = {
  // 性能指标
  SERVICE_RESPONSE_TIME: {
    name: 'service.response_time',
    type: MetricType.TIMER,
    category: MetricCategory.PERFORMANCE,
    description: '服务响应时间',
    unit: 'ms',
    aggregations: [AggregationType.AVERAGE, AggregationType.P95, AggregationType.P99]
  },

  SERVICE_THROUGHPUT: {
    name: 'service.throughput',
    type: MetricType.RATE,
    category: MetricCategory.PERFORMANCE,
    description: '服务吞吐量',
    unit: 'ops/sec',
    aggregations: [AggregationType.SUM, AggregationType.AVERAGE]
  },

  SERVICE_INITIALIZATION_TIME: {
    name: 'service.init_time',
    type: MetricType.TIMER,
    category: MetricCategory.PERFORMANCE,
    description: '服务初始化时间',
    unit: 'ms',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  // 使用统计
  SERVICE_INVOCATION_COUNT: {
    name: 'service.invocation.count',
    type: MetricType.COUNTER,
    category: MetricCategory.USAGE,
    description: '服务调用次数',
    unit: 'count',
    aggregations: [AggregationType.SUM, AggregationType.COUNT]
  },

  SERVICE_CONCURRENT_REQUESTS: {
    name: 'service.concurrent_requests',
    type: MetricType.GAUGE,
    category: MetricCategory.USAGE,
    description: '并发请求数',
    unit: 'count',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  SERVICE_ACTIVE_INSTANCES: {
    name: 'service.active_instances',
    type: MetricType.GAUGE,
    category: MetricCategory.USAGE,
    description: '活跃服务实例数',
    unit: 'count',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  // 错误指标
  ERROR_RATE: {
    name: 'service.error_rate',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.ERROR,
    description: '错误率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  ERROR_COUNT: {
    name: 'service.error.count',
    type: MetricType.COUNTER,
    category: MetricCategory.ERROR,
    description: '错误总数',
    unit: 'count',
    aggregations: [AggregationType.SUM, AggregationType.COUNT]
  },

  RECOVERY_SUCCESS_RATE: {
    name: 'service.recovery.success_rate',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.ERROR,
    description: '错误恢复成功率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE, AggregationType.MIN]
  },

  // 业务指标
  HTML_PARSING_SUCCESS_RATE: {
    name: 'html_parsing.success_rate',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.BUSINESS,
    description: 'HTML解析成功率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE]
  },

  CONTENT_ANALYSIS_COMPLETION_RATE: {
    name: 'content_analysis.completion_rate',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.BUSINESS,
    description: '内容分析完成率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE]
  },

  PERFORMANCE_TEST_SCORE: {
    name: 'performance_test.score',
    type: MetricType.HISTOGRAM,
    category: MetricCategory.BUSINESS,
    description: '性能测试评分',
    unit: 'score',
    aggregations: [AggregationType.AVERAGE, AggregationType.P90]
  },

  // 系统指标
  MEMORY_USAGE: {
    name: 'system.memory.usage',
    type: MetricType.GAUGE,
    category: MetricCategory.SYSTEM,
    description: '内存使用量',
    unit: 'MB',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  CPU_USAGE: {
    name: 'system.cpu.usage',
    type: MetricType.GAUGE,
    category: MetricCategory.SYSTEM,
    description: 'CPU使用率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE, AggregationType.MAX]
  },

  // 质量指标
  CODE_COVERAGE: {
    name: 'quality.code_coverage',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.QUALITY,
    description: '代码覆盖率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE]
  },

  TEST_PASS_RATE: {
    name: 'quality.test_pass_rate',
    type: MetricType.PERCENTAGE,
    category: MetricCategory.QUALITY,
    description: '测试通过率',
    unit: '%',
    aggregations: [AggregationType.AVERAGE]
  }
};

// 告警级别
export const AlertLevel = {
  INFO: { value: 0, label: '信息', color: '#2196F3' },
  WARNING: { value: 1, label: '警告', color: '#FF9800' },
  ERROR: { value: 2, label: '错误', color: '#F44336' },
  CRITICAL: { value: 3, label: '严重', color: '#9C27B0' }
};

// 告警规则类型
export const AlertRuleType = {
  THRESHOLD: 'threshold',       // 阈值告警
  TREND: 'trend',              // 趋势告警
  RATE_CHANGE: 'rate_change',  // 变化率告警
  ANOMALY: 'anomaly'           // 异常检测告警
};

// 预定义告警规则
export const PredefinedAlertRules = {
  HIGH_ERROR_RATE: {
    name: 'high_error_rate',
    metric: PredefinedMetrics.ERROR_RATE.name,
    type: AlertRuleType.THRESHOLD,
    condition: 'greater_than',
    threshold: 5, // 5%
    window: TimeWindow.MINUTE,
    level: AlertLevel.ERROR,
    description: '错误率过高'
  },

  SLOW_RESPONSE_TIME: {
    name: 'slow_response_time',
    metric: PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
    type: AlertRuleType.THRESHOLD,
    condition: 'greater_than',
    threshold: 5000, // 5秒
    window: TimeWindow.MINUTE,
    level: AlertLevel.WARNING,
    description: '响应时间过慢'
  },

  LOW_SUCCESS_RATE: {
    name: 'low_success_rate',
    metric: PredefinedMetrics.HTML_PARSING_SUCCESS_RATE.name,
    type: AlertRuleType.THRESHOLD,
    condition: 'less_than',
    threshold: 90, // 90%
    window: TimeWindow.HOUR,
    level: AlertLevel.WARNING,
    description: '成功率过低'
  },

  HIGH_MEMORY_USAGE: {
    name: 'high_memory_usage',
    metric: PredefinedMetrics.MEMORY_USAGE.name,
    type: AlertRuleType.THRESHOLD,
    condition: 'greater_than',
    threshold: 500, // 500MB
    window: TimeWindow.MINUTE,
    level: AlertLevel.WARNING,
    description: '内存使用过高'
  },

  SERVICE_UNAVAILABLE: {
    name: 'service_unavailable',
    metric: PredefinedMetrics.SERVICE_THROUGHPUT.name,
    type: AlertRuleType.THRESHOLD,
    condition: 'equals',
    threshold: 0,
    window: TimeWindow.MINUTE,
    level: AlertLevel.CRITICAL,
    description: '服务不可用'
  }
};

export default {
  MetricType,
  MetricCategory,
  AggregationType,
  TimeWindow,
  PredefinedMetrics,
  AlertLevel,
  AlertRuleType,
  PredefinedAlertRules
};
