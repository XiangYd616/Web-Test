/**
 * 测试结果对比分析器
 *
 * 文件路径: backend/utils/ComparisonAnalyzer.js
 * 创建时间: 2025-11-14
 *
 * 功能:
 * - 历史数据对比
 * - 趋势分析
 * - 性能回归检测
 * - 统计分析
 */

type ComparisonMetric = {
  name: string;
  current: number | string;
  previous: number | string;
  change?: number;
  changePercent?: number;
  status: 'improved' | 'degraded' | 'unchanged' | 'changed';
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

type ComparisonSummary = {
  totalMetrics: number;
  improved: number;
  degraded: number;
  unchanged: number;
  overallStatus: 'improved' | 'degraded' | 'stable';
  message: string;
};

type ComparisonResult = {
  testType: string;
  currentTestId: string;
  previousTestId: string;
  timestamp: Date;
  metrics?: Record<string, ComparisonMetric>;
  summary?: ComparisonSummary;
  message?: string;
};

type TestResultRecord = Record<string, unknown> & {
  testId?: string;
  type?: string;
  result?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  performanceScore?: number;
  score?: number;
  passedChecks?: number;
  totalChecks?: number;
  timestamp?: string;
  createdAt?: string;
};

class ComparisonAnalyzer {
  /**
   * 对比两次测试结果
   */
  compare(currentResult: TestResultRecord, previousResult: TestResultRecord) {
    if (!currentResult || !previousResult) {
      throw new Error('对比需要提供两个测试结果');
    }

    const testType = currentResult.type || previousResult.type;

    switch (testType) {
      case 'stress':
        return this._compareStressTests(currentResult, previousResult);
      case 'api':
        return this._compareApiTests(currentResult, previousResult);
      case 'performance':
        return this._comparePerformanceTests(currentResult, previousResult);
      case 'security':
        return this._compareSecurityTests(currentResult, previousResult);
      default:
        return this._compareGeneric(currentResult, previousResult);
    }
  }

  /**
   * 对比压力测试结果
   * @private
   */
  _compareStressTests(current: TestResultRecord, previous: TestResultRecord): ComparisonResult {
    const curr = (current.result || {}) as Record<string, unknown>;
    const prev = (previous.result || {}) as Record<string, unknown>;

    const metricsMap: Record<string, ComparisonMetric> = {};
    const comparison: ComparisonResult = {
      testType: 'stress',
      currentTestId: current.testId || '',
      previousTestId: previous.testId || '',
      timestamp: new Date(),
      metrics: metricsMap,
    };

    // 对比各项指标
    const metrics = [
      { key: 'totalRequests', name: '总请求数' },
      { key: 'successfulRequests', name: '成功请求数' },
      { key: 'failedRequests', name: '失败请求数', reverse: true },
      { key: 'successRate', name: '成功率 (%)' },
      { key: 'avgResponseTime', name: '平均响应时间 (ms)', reverse: true },
      { key: 'minResponseTime', name: '最小响应时间 (ms)', reverse: true },
      { key: 'maxResponseTime', name: '最大响应时间 (ms)', reverse: true },
      { key: 'throughput', name: '吞吐量 (req/s)' },
    ];

    metrics.forEach(metric => {
      const currentValue = toNumber(curr[metric.key]);
      const previousValue = toNumber(prev[metric.key]);
      const change = currentValue - previousValue;
      const changePercent = previousValue !== 0 ? ((change / previousValue) * 100).toFixed(2) : '0';

      // 判断是改善还是退化
      let status: ComparisonMetric['status'] = 'unchanged';
      if (change !== 0) {
        if (metric.reverse) {
          // 数值越小越好（如响应时间、失败数）
          status = change < 0 ? 'improved' : 'degraded';
        } else {
          // 数值越大越好（如成功率、吞吐量）
          status = change > 0 ? 'improved' : 'degraded';
        }
      }

      metricsMap[metric.key] = {
        name: metric.name,
        current: currentValue,
        previous: previousValue,
        change,
        changePercent: Number.parseFloat(changePercent),
        status,
      };
    });

    // 整体评估
    comparison.summary = this._generateSummary(comparison.metrics || {});

    return comparison;
  }

  /**
   * 对比API测试结果
   * @private
   */
  _compareApiTests(current: TestResultRecord, previous: TestResultRecord): ComparisonResult {
    const curr = (current.result || {}) as Record<string, unknown>;
    const prev = (previous.result || {}) as Record<string, unknown>;

    const metricsMap: Record<string, ComparisonMetric> = {};
    const comparison: ComparisonResult = {
      testType: 'api',
      currentTestId: current.testId || '',
      previousTestId: previous.testId || '',
      timestamp: new Date(),
      metrics: metricsMap,
    };

    // 对比响应时间
    metricsMap.responseTime = this._compareMetric(
      'responseTime',
      '响应时间 (ms)',
      toNumber(curr.responseTime),
      toNumber(prev.responseTime),
      true
    );

    // 对比状态码
    metricsMap.statusCode = {
      name: '状态码',
      current: curr.statusCode ? String(curr.statusCode) : 'N/A',
      previous: prev.statusCode ? String(prev.statusCode) : 'N/A',
      status: curr.statusCode === prev.statusCode ? 'unchanged' : 'changed',
    };

    // 对比断言结果
    if (curr.assertions && prev.assertions) {
      const currAssertions = curr.assertions as Record<string, unknown>;
      const prevAssertions = prev.assertions as Record<string, unknown>;
      metricsMap.assertionPassRate = this._compareMetric(
        'assertionPassRate',
        '断言通过率 (%)',
        toNumber(currAssertions.passRate),
        toNumber(prevAssertions.passRate),
        false
      );

      metricsMap.assertionsPassed = this._compareMetric(
        'assertionsPassed',
        '通过的断言数',
        toNumber(currAssertions.passed),
        toNumber(prevAssertions.passed),
        false
      );
    }

    comparison.summary = this._generateSummary(comparison.metrics || {});

    return comparison;
  }

  /**
   * 对比性能测试结果
   * @private
   */
  _comparePerformanceTests(
    current: TestResultRecord,
    previous: TestResultRecord
  ): ComparisonResult {
    const currMetrics = (current.metrics || {}) as Record<string, unknown>;
    const prevMetrics = (previous.metrics || {}) as Record<string, unknown>;

    const metricsMap: Record<string, ComparisonMetric> = {};
    const comparison: ComparisonResult = {
      testType: 'performance',
      currentTestId: current.testId || '',
      previousTestId: previous.testId || '',
      timestamp: new Date(),
      metrics: metricsMap,
    };

    // 对比性能得分
    metricsMap.performanceScore = this._compareMetric(
      'performanceScore',
      '性能得分',
      toNumber(current.performanceScore),
      toNumber(previous.performanceScore),
      false
    );

    // 对比Core Web Vitals
    const vitals = [
      { key: 'firstContentfulPaint', name: 'FCP (ms)', reverse: true },
      { key: 'largestContentfulPaint', name: 'LCP (ms)', reverse: true },
      { key: 'cumulativeLayoutShift', name: 'CLS', reverse: true },
      { key: 'totalBlockingTime', name: 'TBT (ms)', reverse: true },
      { key: 'speedIndex', name: 'Speed Index (ms)', reverse: true },
      { key: 'timeToInteractive', name: 'TTI (ms)', reverse: true },
    ];

    vitals.forEach(vital => {
      if (currMetrics[vital.key] !== undefined || prevMetrics[vital.key] !== undefined) {
        metricsMap[vital.key] = this._compareMetric(
          vital.key,
          vital.name,
          toNumber(currMetrics[vital.key]),
          toNumber(prevMetrics[vital.key]),
          Boolean(vital.reverse)
        );
      }
    });

    comparison.summary = this._generateSummary(comparison.metrics || {});

    return comparison;
  }

  /**
   * 对比安全测试结果
   * @private
   */
  _compareSecurityTests(current: TestResultRecord, previous: TestResultRecord): ComparisonResult {
    const metricsMap: Record<string, ComparisonMetric> = {};
    const comparison: ComparisonResult = {
      testType: 'security',
      currentTestId: current.testId || '',
      previousTestId: previous.testId || '',
      timestamp: new Date(),
      metrics: metricsMap,
    };

    // 对比安全得分
    metricsMap.securityScore = this._compareMetric(
      'securityScore',
      '安全得分',
      toNumber(current.score),
      toNumber(previous.score),
      false
    );

    // 对比通过的检查数
    metricsMap.passedChecks = this._compareMetric(
      'passedChecks',
      '通过的检查数',
      toNumber(current.passedChecks),
      toNumber(previous.passedChecks),
      false
    );

    // 对比总检查数
    metricsMap.totalChecks = {
      name: '总检查数',
      current: toNumber(current.totalChecks),
      previous: toNumber(previous.totalChecks),
      change: toNumber(current.totalChecks) - toNumber(previous.totalChecks),
      status: 'unchanged',
    };

    comparison.summary = this._generateSummary(comparison.metrics || {});

    return comparison;
  }

  /**
   * 通用对比
   * @private
   */
  _compareGeneric(current: TestResultRecord, previous: TestResultRecord): ComparisonResult {
    return {
      testType: 'generic',
      currentTestId: current.testId || '',
      previousTestId: previous.testId || '',
      timestamp: new Date(),
      message: '不支持该测试类型的详细对比',
    };
  }

  /**
   * 对比单个指标
   * @private
   */
  _compareMetric(
    _key: string,
    name: string,
    currentValue: number,
    previousValue: number,
    reverse = false
  ): ComparisonMetric {
    const change = currentValue - previousValue;
    const changePercent = previousValue !== 0 ? ((change / previousValue) * 100).toFixed(2) : '0';

    let status: ComparisonMetric['status'] = 'unchanged';
    if (change !== 0) {
      if (reverse) {
        status = change < 0 ? 'improved' : 'degraded';
      } else {
        status = change > 0 ? 'improved' : 'degraded';
      }
    }

    return {
      name,
      current: currentValue,
      previous: previousValue,
      change,
      changePercent: Number.parseFloat(changePercent),
      status,
    };
  }

  /**
   * 生成对比摘要
   * @private
   */
  _generateSummary(metrics: Record<string, ComparisonMetric>): ComparisonSummary {
    let improved = 0;
    let degraded = 0;
    let unchanged = 0;

    Object.values(metrics).forEach(metric => {
      if (metric.status === 'improved') improved += 1;
      else if (metric.status === 'degraded') degraded += 1;
      else if (metric.status === 'unchanged') unchanged += 1;
    });

    const total = improved + degraded + unchanged;
    let overallStatus: ComparisonSummary['overallStatus'] = 'stable';

    if (improved > degraded) {
      overallStatus = 'improved';
    } else if (degraded > improved) {
      overallStatus = 'degraded';
    }

    return {
      totalMetrics: total,
      improved,
      degraded,
      unchanged,
      overallStatus,
      message: this._getSummaryMessage(overallStatus, improved, degraded),
    };
  }

  /**
   * 获取摘要消息
   * @private
   */
  _getSummaryMessage(
    status: ComparisonSummary['overallStatus'],
    improved: number,
    degraded: number
  ) {
    if (status === 'improved') {
      return `性能改善：${improved}项指标提升，${degraded}项指标下降`;
    }
    if (status === 'degraded') {
      return `性能退化：${degraded}项指标下降，${improved}项指标提升`;
    }
    return '性能稳定：各项指标变化不大';
  }

  /**
   * 趋势分析（多个测试结果）
   */
  analyzeTrend(results: TestResultRecord[]) {
    if (!results || results.length < 2) {
      return {
        error: '至少需要2个测试结果才能进行趋势分析',
      };
    }

    // 按时间排序
    const sortedResults = [...results].sort((a, b) => {
      const aTime = new Date(a.timestamp || a.createdAt || '').getTime();
      const bTime = new Date(b.timestamp || b.createdAt || '').getTime();
      return aTime - bTime;
    });

    const testType = sortedResults[0].type || 'unknown';
    const trend: {
      testType: string;
      dataPoints: number;
      startTime: string | undefined;
      endTime: string | undefined;
      metrics: Record<string, unknown>;
    } = {
      testType,
      dataPoints: sortedResults.length,
      startTime: sortedResults[0].timestamp || sortedResults[0].createdAt,
      endTime:
        sortedResults[sortedResults.length - 1].timestamp ||
        sortedResults[sortedResults.length - 1].createdAt,
      metrics: {},
    };

    // 提取关键指标的趋势
    if (testType === 'stress') {
      this._analyzeStressTrend(sortedResults, trend);
    } else if (testType === 'performance') {
      this._analyzePerformanceTrend(sortedResults, trend);
    } else if (testType === 'api') {
      this._analyzeApiTrend(sortedResults, trend);
    }

    return trend;
  }

  /**
   * 基准测试对比（占位实现）
   */
  async compareToBenchmark(testResult: Record<string, unknown>, benchmarkType: string) {
    return {
      benchmarkType,
      testResult,
      comparison: {
        status: 'not_implemented',
        message: '基准对比逻辑尚未实现，返回原始数据',
      },
    };
  }

  /**
   * 获取可用基准测试（占位实现）
   */
  async getAvailableBenchmarks(_testType?: string) {
    return [] as string[];
  }

  /**
   * 生成对比摘要（占位实现）
   */
  async generateComparisonSummary(comparisons: unknown[], groupBy?: string) {
    return {
      total: comparisons.length,
      groupBy: groupBy || 'none',
      comparisons,
    };
  }

  /**
   * 获取对比指标（占位实现）
   */
  async getComparisonMetrics(_testType?: string) {
    return [] as string[];
  }

  /**
   * 导出对比报告（占位实现）
   */
  async exportComparisonReport(comparisonId: string, format = 'json', options?: unknown) {
    const payload = {
      comparisonId,
      format,
      options,
      message: '导出功能尚未实现，返回基础信息',
    };
    return Buffer.from(JSON.stringify(payload, null, 2));
  }

  /**
   * 分析压力测试趋势
   * @private
   */
  _analyzeStressTrend(results: TestResultRecord[], trend: { metrics: Record<string, unknown> }) {
    const metrics = ['successRate', 'avgResponseTime', 'throughput'];

    metrics.forEach(metricKey => {
      const values = results.map(r => toNumber(r.result ? r.result[metricKey] : 0));

      trend.metrics[metricKey] = {
        values,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
        trend: this._calculateTrendDirection(values),
      };
    });
  }

  /**
   * 分析性能测试趋势
   * @private
   */
  _analyzePerformanceTrend(
    results: TestResultRecord[],
    trend: { metrics: Record<string, unknown> }
  ) {
    const scores = results.map(r => r.performanceScore || 0);

    trend.metrics.performanceScore = {
      values: scores,
      min: Math.min(...scores),
      max: Math.max(...scores),
      avg: (scores.reduce((sum, v) => sum + v, 0) / scores.length).toFixed(2),
      trend: this._calculateTrendDirection(scores),
    };
  }

  /**
   * 分析API测试趋势
   * @private
   */
  _analyzeApiTrend(results: TestResultRecord[], trend: { metrics: Record<string, unknown> }) {
    const responseTimes = results.map(r => toNumber(r.result ? r.result.responseTime : 0));

    trend.metrics.responseTime = {
      values: responseTimes,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      avg: (responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length).toFixed(2),
      trend: this._calculateTrendDirection(responseTimes),
    };
  }

  /**
   * 计算趋势方向
   * @private
   */
  _calculateTrendDirection(values: number[]) {
    if (values.length < 2) return 'stable';

    // 简单线性回归
    const n = values.length;
    const xSum = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const ySum = values.reduce((sum, v) => sum + v, 0);
    const xySum = values.reduce((sum, v, i) => sum + i * v, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6; // 0^2 + 1^2 + ... + (n-1)^2

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);

    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }
}

export default ComparisonAnalyzer;

module.exports = ComparisonAnalyzer;
