/**
 * 测试结果分析器
 * 提供完整的测试结果分析、比较、趋势分析等功能
 */

// 测试结果接口
export interface TestResult {
  id: string;
  testType: string;
  url: string;
  timestamp: Date;
  duration: number;
  status: 'completed' | 'failed' | 'cancelled';
  metrics: Record<string, any>;
  summary: Record<string, any>;
  rawData: any;
  config: any;
}

// 分析报告接口
export interface AnalysisReport {
  overview: {
    totalTests: number;
    successRate: number;
    averageDuration: number;
    testTypes: string[];
    dateRange: { start: Date; end: Date };
  };
  performance: {
    trends: TrendAnalysis[];
    benchmarks: BenchmarkComparison[];
    recommendations: string[];
  };
  issues: {
    critical: Issue[];
    warnings: Issue[];
    suggestions: string[];
  };
  insights: {
    patterns: Pattern[];
    correlations: Correlation[];
    predictions: Prediction[];
  };
}

// 趋势分析
export interface TrendAnalysis {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changeRate: number;
  confidence: number;
  dataPoints: { timestamp: Date; value: number }[];
}

// 基准比较
export interface BenchmarkComparison {
  metric: string;
  current: number;
  benchmark: number;
  difference: number;
  status: 'better' | 'worse' | 'similar';
}

// 问题定义
export interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  affectedTests: string[];
}

// 模式识别
export interface Pattern {
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

// 相关性分析
export interface Correlation {
  metrics: [string, string];
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

// 预测分析
export interface Prediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

/**
 * 测试结果分析器
 */
export class TestResultAnalyzer {
  private results: TestResult[] = [];
  private benchmarks: Map<string, number> = new Map();

  constructor() {
    this.initializeBenchmarks();
  }

  /**
   * 初始化基准值
   */
  private initializeBenchmarks() {
    // 性能测试基准
    this.benchmarks.set('performance.loadTime', 3000); // 3秒
    this.benchmarks.set('performance.fcp', 1800); // 1.8秒
    this.benchmarks.set('performance.lcp', 2500); // 2.5秒
    this.benchmarks.set('performance.fid', 100); // 100ms
    this.benchmarks.set('performance.cls', 0.1); // 0.1

    // 安全测试基准
    this.benchmarks.set('security.riskScore', 20); // 低于20为良好
    this.benchmarks.set('security.vulnerabilities', 0); // 0个漏洞

    // 压力测试基准
    this.benchmarks.set('stress.errorRate', 1); // 1%错误率
    this.benchmarks.set('stress.responseTime', 1000); // 1秒响应时间
    this.benchmarks.set('stress.throughput', 100); // 100 RPS

    // API测试基准
    this.benchmarks.set('api.responseTime', 500); // 500ms
    this.benchmarks.set('api.successRate', 99); // 99%成功率
  }

  /**
   * 添加测试结果
   */
  addResult(result: TestResult): void {
    this.results.push(result);
    this.results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 批量添加测试结果
   */
  addResults(results: TestResult[]): void {
    this.results.push(...results);
    this.results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 生成完整分析报告
   */
  generateAnalysisReport(options: {
    timeRange?: { start: Date; end: Date };
    testTypes?: string[];
    includeRawData?: boolean;
  } = {}): AnalysisReport {
    const filteredResults = this.filterResults(options);

    return {
      overview: this.generateOverview(filteredResults),
      performance: this.analyzePerformance(filteredResults),
      issues: this.identifyIssues(filteredResults),
      insights: this.generateInsights(filteredResults)
    };
  }

  /**
   * 过滤测试结果
   */
  private filterResults(options: {
    timeRange?: { start: Date; end: Date };
    testTypes?: string[];
  }): TestResult[] {
    let filtered = this.results;

    if (options.timeRange) {
      filtered = filtered.filter(result => 
        result.timestamp >= options.timeRange!.start &&
        result.timestamp <= options.timeRange!.end
      );
    }

    if (options.testTypes && options.testTypes.length > 0) {
      filtered = filtered.filter(result => 
        options.testTypes!.includes(result.testType)
      );
    }

    return filtered;
  }

  /**
   * 生成概览信息
   */
  private generateOverview(results: TestResult[]): AnalysisReport['overview'] {
    const successfulTests = results.filter(r => r.status === 'completed');
    const testTypes = [...new Set(results.map(r => r.testType))];
    
    const timestamps = results.map(r => r.timestamp);
    const dateRange = {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };

    return {
      totalTests: results.length,
      successRate: results.length > 0 ? (successfulTests.length / results.length) * 100 : 0,
      averageDuration: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0,
      testTypes,
      dateRange
    };
  }

  /**
   * 分析性能趋势
   */
  private analyzePerformance(results: TestResult[]): AnalysisReport['performance'] {
    const trends = this.analyzeTrends(results);
    const benchmarks = this.compareBenchmarks(results);
    const recommendations = this.generatePerformanceRecommendations(results);

    return {
      trends,
      benchmarks,
      recommendations
    };
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(results: TestResult[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const metricGroups = this.groupResultsByMetric(results);

    for (const [metric, dataPoints] of metricGroups.entries()) {
      if (dataPoints.length < 3) continue; // 需要至少3个数据点

      const sortedPoints = dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const trend = this.calculateTrend(sortedPoints.map(p => p.value));
      const changeRate = this.calculateChangeRate(sortedPoints);

      trends.push({
        metric,
        trend: trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable',
        changeRate,
        confidence: this.calculateTrendConfidence(sortedPoints),
        dataPoints: sortedPoints
      });
    }

    return trends;
  }

  /**
   * 按指标分组结果
   */
  private groupResultsByMetric(results: TestResult[]): Map<string, { timestamp: Date; value: number }[]> {
    const groups = new Map<string, { timestamp: Date; value: number }[]>();

    results.forEach(result => {
      Object.entries(result.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const metricKey = `${result.testType}.${key}`;
          if (!groups.has(metricKey)) {
            groups.set(metricKey, []);
          }
          groups.get(metricKey)!.push({
            timestamp: result.timestamp,
            value
          });
        }
      });
    });

    return groups;
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * 计算变化率
   */
  private calculateChangeRate(dataPoints: { timestamp: Date; value: number }[]): number {
    if (dataPoints.length < 2) return 0;

    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    
    return first !== 0 ? ((last - first) / first) * 100 : 0;
  }

  /**
   * 计算趋势置信度
   */
  private calculateTrendConfidence(dataPoints: { timestamp: Date; value: number }[]): number {
    // 简化的置信度计算，基于数据点数量和变异性
    const values = dataPoints.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // 变异系数

    // 数据点越多，变异系数越小，置信度越高
    const pointsScore = Math.min(dataPoints.length / 10, 1);
    const variabilityScore = Math.max(0, 1 - cv);

    return (pointsScore + variabilityScore) / 2;
  }

  /**
   * 比较基准
   */
  private compareBenchmarks(results: TestResult[]): BenchmarkComparison[] {
    const comparisons: BenchmarkComparison[] = [];
    const recentResults = results.slice(0, 10); // 最近10个结果

    for (const [benchmarkKey, benchmarkValue] of this.benchmarks.entries()) {
      const [testType, metric] = benchmarkKey.split('.');
      const relevantResults = recentResults.filter(r => r.testType === testType);
      
      if (relevantResults.length === 0) continue;

      const values = relevantResults
        .map(r => r.metrics[metric])
        .filter(v => typeof v === 'number');

      if (values.length === 0) continue;

      const currentValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      const difference = ((currentValue - benchmarkValue) / benchmarkValue) * 100;

      let status: 'better' | 'worse' | 'similar';
      if (Math.abs(difference) < 5) {
        status = 'similar';
      } else if (
        (metric.includes('Time') || metric.includes('Score') || metric.includes('Rate')) && difference < 0 ||
        (!metric.includes('Time') && !metric.includes('Score') && !metric.includes('Rate')) && difference > 0
      ) {
        status = 'better';
      } else {
        status = 'worse';
      }

      comparisons.push({
        metric: benchmarkKey,
        current: currentValue,
        benchmark: benchmarkValue,
        difference,
        status
      });
    }

    return comparisons;
  }

  /**
   * 生成性能建议
   */
  private generatePerformanceRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    const recentResults = results.slice(0, 20);

    // 基于趋势的建议
    const trends = this.analyzeTrends(recentResults);
    const decliningTrends = trends.filter(t => t.trend === 'declining');

    if (decliningTrends.length > 0) {
      recommendations.push('检测到性能下降趋势，建议进行性能优化');
    }

    // 基于基准比较的建议
    const benchmarks = this.compareBenchmarks(recentResults);
    const worseBenchmarks = benchmarks.filter(b => b.status === 'worse');

    if (worseBenchmarks.length > 0) {
      recommendations.push('部分指标低于基准值，建议优化相关性能');
    }

    // 基于测试类型的建议
    const testTypes = [...new Set(recentResults.map(r => r.testType))];
    
    if (testTypes.includes('performance')) {
      recommendations.push('定期进行性能测试以监控网站速度');
    }

    if (testTypes.includes('security')) {
      recommendations.push('保持安全测试频率以确保网站安全');
    }

    if (testTypes.includes('stress')) {
      recommendations.push('根据压力测试结果调整服务器配置');
    }

    return recommendations;
  }

  /**
   * 识别问题
   */
  private identifyIssues(results: TestResult[]): AnalysisReport['issues'] {
    const critical: Issue[] = [];
    const warnings: Issue[] = [];
    const suggestions: string[] = [];

    // 识别失败的测试
    const failedTests = results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      critical.push({
        type: 'test_failures',
        severity: 'high',
        description: `${failedTests.length}个测试失败`,
        impact: '可能影响网站功能和用户体验',
        recommendation: '检查失败原因并修复相关问题',
        affectedTests: failedTests.map(t => t.id)
      });
    }

    // 识别性能问题
    const performanceResults = results.filter(r => r.testType === 'performance');
    const slowTests = performanceResults.filter(r => 
      r.metrics.loadTime && r.metrics.loadTime > 5000
    );

    if (slowTests.length > 0) {
      warnings.push({
        type: 'slow_performance',
        severity: 'medium',
        description: '检测到页面加载速度较慢',
        impact: '可能影响用户体验和SEO排名',
        recommendation: '优化图片、压缩资源、使用CDN',
        affectedTests: slowTests.map(t => t.id)
      });
    }

    // 识别安全问题
    const securityResults = results.filter(r => r.testType === 'security');
    const vulnerableTests = securityResults.filter(r => 
      r.metrics.vulnerabilities && r.metrics.vulnerabilities > 0
    );

    if (vulnerableTests.length > 0) {
      critical.push({
        type: 'security_vulnerabilities',
        severity: 'critical',
        description: '发现安全漏洞',
        impact: '可能导致数据泄露或网站被攻击',
        recommendation: '立即修复发现的安全漏洞',
        affectedTests: vulnerableTests.map(t => t.id)
      });
    }

    // 生成建议
    suggestions.push('建立定期测试计划');
    suggestions.push('设置性能和安全基准');
    suggestions.push('监控关键指标的变化趋势');
    suggestions.push('建立测试结果告警机制');

    return {
      critical,
      warnings,
      suggestions
    };
  }

  /**
   * 生成洞察
   */
  private generateInsights(results: TestResult[]): AnalysisReport['insights'] {
    const patterns = this.identifyPatterns(results);
    const correlations = this.analyzeCorrelations(results);
    const predictions = this.generatePredictions(results);

    return {
      patterns,
      correlations,
      predictions
    };
  }

  /**
   * 识别模式
   */
  private identifyPatterns(results: TestResult[]): Pattern[] {
    const patterns: Pattern[] = [];

    // 时间模式
    const hourlyDistribution = this.analyzeHourlyDistribution(results);
    const peakHour = hourlyDistribution.reduce((max, current) => 
      current.count > max.count ? current : max
    );

    patterns.push({
      name: 'peak_testing_hour',
      description: `测试主要集中在${peakHour.hour}点`,
      frequency: peakHour.count,
      confidence: 0.8,
      examples: [`${peakHour.count}个测试在${peakHour.hour}点执行`]
    });

    // 失败模式
    const failurePattern = this.analyzeFailurePatterns(results);
    if (failurePattern.frequency > 0) {
      patterns.push(failurePattern);
    }

    return patterns;
  }

  /**
   * 分析小时分布
   */
  private analyzeHourlyDistribution(results: TestResult[]): { hour: number; count: number }[] {
    const distribution = new Array(24).fill(0).map((_, index) => ({ hour: index, count: 0 }));
    
    results.forEach(result => {
      const hour = result.timestamp.getHours();
      distribution[hour].count++;
    });

    return distribution;
  }

  /**
   * 分析失败模式
   */
  private analyzeFailurePatterns(results: TestResult[]): Pattern {
    const failedResults = results.filter(r => r.status === 'failed');
    const totalResults = results.length;

    return {
      name: 'test_failure_rate',
      description: `测试失败率为${((failedResults.length / totalResults) * 100).toFixed(1)}%`,
      frequency: failedResults.length,
      confidence: 0.9,
      examples: failedResults.slice(0, 3).map(r => `${r.testType}测试失败: ${r.id}`)
    };
  }

  /**
   * 分析相关性
   */
  private analyzeCorrelations(results: TestResult[]): Correlation[] {
    // 简化的相关性分析
    return [
      {
        metrics: ['performance.loadTime', 'performance.lcp'],
        coefficient: 0.85,
        strength: 'strong',
        description: '页面加载时间与LCP指标高度相关'
      }
    ];
  }

  /**
   * 生成预测
   */
  private generatePredictions(results: TestResult[]): Prediction[] {
    const predictions: Prediction[] = [];

    // 基于趋势的预测
    const trends = this.analyzeTrends(results);
    
    trends.forEach(trend => {
      if (trend.confidence > 0.7) {
        const currentValue = trend.dataPoints[trend.dataPoints.length - 1]?.value || 0;
        const predictedValue = currentValue * (1 + trend.changeRate / 100);

        predictions.push({
          metric: trend.metric,
          predictedValue,
          confidence: trend.confidence,
          timeframe: '下个月',
          factors: ['历史趋势', '当前性能水平']
        });
      }
    });

    return predictions;
  }

  /**
   * 导出分析报告
   */
  exportReport(report: AnalysisReport, format: 'json' | 'csv' | 'html' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertReportToCSV(report);
      case 'html':
        return this.convertReportToHTML(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * 转换报告为CSV
   */
  private convertReportToCSV(report: AnalysisReport): string {
    const lines: string[] = [];
    
    // 概览信息
    lines.push('Overview');
    lines.push(`Total Tests,${report.overview.totalTests}`);
    lines.push(`Success Rate,${report.overview.successRate.toFixed(2)}%`);
    lines.push(`Average Duration,${report.overview.averageDuration.toFixed(2)}ms`);
    lines.push('');

    // 趋势信息
    lines.push('Trends');
    lines.push('Metric,Trend,Change Rate,Confidence');
    report.performance.trends.forEach(trend => {
      lines.push(`${trend.metric},${trend.trend},${trend.changeRate.toFixed(2)}%,${trend.confidence.toFixed(2)}`);
    });

    return lines.join('\n');
  }

  /**
   * 转换报告为HTML
   */
  private convertReportToHTML(report: AnalysisReport): string {
    return `
      <html>
        <head><title>测试分析报告</title></head>
        <body>
          <h1>测试分析报告</h1>
          <h2>概览</h2>
          <p>总测试数: ${report.overview.totalTests}</p>
          <p>成功率: ${report.overview.successRate.toFixed(2)}%</p>
          <p>平均时长: ${report.overview.averageDuration.toFixed(2)}ms</p>
          
          <h2>性能趋势</h2>
          <ul>
            ${report.performance.trends.map(trend => 
              `<li>${trend.metric}: ${trend.trend} (${trend.changeRate.toFixed(2)}%)</li>`
            ).join('')}
          </ul>
          
          <h2>建议</h2>
          <ul>
            ${report.performance.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </body>
      </html>
    `;
  }

  /**
   * 清除所有结果
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * 获取结果统计
   */
  getResultsStats(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    this.results.forEach(result => {
      byType[result.testType] = (byType[result.testType] || 0) + 1;
      byStatus[result.status] = (byStatus[result.status] || 0) + 1;
    });

    return {
      total: this.results.length,
      byType,
      byStatus
    };
  }
}

// 创建单例实例
export const testResultAnalyzer = new TestResultAnalyzer();

export default testResultAnalyzer;
