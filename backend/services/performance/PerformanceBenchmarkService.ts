/**
 * 性能基准测试服务
 * 提供性能测试套件、基线设定、监控报告、优化建议等功能
 */

import { EventEmitter } from 'events';

// 性能指标定义
export interface PerformanceMetrics {
  // 前端性能指标
  FIRST_CONTENTFUL_PAINT: 'first_contentful_paint';
  LARGEST_CONTENTFUL_PAINT: 'largest_contentful_paint';
  FIRST_INPUT_DELAY: 'first_input_delay';
  CUMULATIVE_LAYOUT_SHIFT: 'cumulative_layout_shift';
  TIME_TO_INTERACTIVE: 'time_to_interactive';
  // 后端性能指标
  RESPONSE_TIME: 'response_time';
  THROUGHPUT: 'throughput';
  ERROR_RATE: 'error_rate';
  AVAILABILITY: 'availability';
  // 业务指标
  CONVERSION_RATE: 'conversion_rate';
  USER_SATISFACTION: 'user_satisfaction';
  BOUNCE_RATE: 'bounce_rate';
}

// 基准测试配置接口
export interface BenchmarkConfig {
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'business';
  metrics: PerformanceMetrics[keyof PerformanceMetrics][];
  thresholds: PerformanceThresholds;
  testSuite: string[];
  environment: 'development' | 'staging' | 'production';
  schedule?: {
    enabled: boolean;
    interval: number;
    timezone: string;
  };
  notifications: NotificationConfig[];
}

// 性能阈值接口
export interface PerformanceThresholds {
  excellent: Record<string, number>;
  good: Record<string, number>;
  needsImprovement: Record<string, number>;
  poor: Record<string, number>;
}

// 通知配置接口
export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook';
  condition: 'always' | 'on-degradation' | 'on-failure';
  recipients: string[];
  template?: string;
}

// 基准测试结果接口
export interface BenchmarkResult {
  id: string;
  benchmarkId: string;
  name: string;
  category: string;
  environment: string;
  executedAt: Date;
  duration: number;
  status: 'passed' | 'failed' | 'warning';
  scores: PerformanceScores;
  metrics: PerformanceData;
  comparison: BaselineComparison;
  recommendations: PerformanceRecommendation[];
  artifacts: BenchmarkArtifact[];
  metadata: Record<string, any>;
}

// 性能分数接口
export interface PerformanceScores {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  byCategory: Record<string, number>;
  byMetric: Record<string, number>;
}

// 性能数据接口
export interface PerformanceData {
  timestamp: Date;
  values: Record<string, number>;
  metadata: Record<string, any>;
}

// 基线比较接口
export interface BaselineComparison {
  baseline: PerformanceData;
  current: PerformanceData;
  changes: Record<string, MetricChange>;
  trend: 'improving' | 'degrading' | 'stable';
}

// 指标变化接口
export interface MetricChange {
  value: number;
  percentage: number;
  significance: 'significant' | 'minor' | 'negligible';
  direction: 'improvement' | 'degradation';
}

// 性能建议接口
export interface PerformanceRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  examples: string[];
  metrics: string[];
}

// 基准测试产物接口
export interface BenchmarkArtifact {
  id: string;
  type: 'report' | 'screenshot' | 'video' | 'trace' | 'log';
  name: string;
  url?: string;
  path: string;
  size: number;
  mimeType: string;
  checksum: string;
}

// 性能报告接口
export interface PerformanceReport {
  id: string;
  title: string;
  description: string;
  period: {
    start: Date;
    end: Date;
  };
  benchmarks: BenchmarkResult[];
  summary: PerformanceSummary;
  trends: PerformanceTrend[];
  recommendations: PerformanceRecommendation[];
  generatedAt: Date;
}

// 性能摘要接口
export interface PerformanceSummary {
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalBenchmarks: number;
  passedBenchmarks: number;
  failedBenchmarks: number;
  warningBenchmarks: number;
  keyMetrics: Record<
    string,
    {
      current: number;
      baseline: number;
      change: number;
      trend: string;
    }
  >;
}

// 性能趋势接口
export interface PerformanceTrend {
  metric: string;
  period: number;
  data: Array<{
    date: string;
    value: number;
  }>;
  trend: 'improving' | 'degrading' | 'stable';
  changeRate: number;
  prediction: Array<{
    date: string;
    value: number;
    confidence: number;
  }>;
}

// 性能统计接口
export interface PerformanceStatistics {
  totalBenchmarks: number;
  successfulBenchmarks: number;
  failedBenchmarks: number;
  averageScore: number;
  averageDuration: number;
  byCategory: Record<string, number>;
  byEnvironment: Record<string, number>;
  byGrade: Record<string, number>;
  trends: {
    score: 'improving' | 'degrading' | 'stable';
    performance: 'improving' | 'degrading' | 'stable';
    reliability: 'improving' | 'degrading' | 'stable';
  };
}

class PerformanceBenchmarkService extends EventEmitter {
  private benchmarks: Map<string, BenchmarkConfig> = new Map();
  private baselines: Map<string, PerformanceData> = new Map();
  private testResults: Map<string, BenchmarkResult> = new Map();
  private isInitialized: boolean = false;

  // 性能指标定义
  private metrics: PerformanceMetrics = {
    // 前端性能指标
    FIRST_CONTENTFUL_PAINT: 'first_contentful_paint',
    LARGEST_CONTENTFUL_PAINT: 'largest_contentful_paint',
    FIRST_INPUT_DELAY: 'first_input_delay',
    CUMULATIVE_LAYOUT_SHIFT: 'cumulative_layout_shift',
    TIME_TO_INTERACTIVE: 'time_to_interactive',
    // 后端性能指标
    RESPONSE_TIME: 'response_time',
    THROUGHPUT: 'throughput',
    ERROR_RATE: 'error_rate',
    AVAILABILITY: 'availability',
    // 业务指标
    CONVERSION_RATE: 'conversion_rate',
    USER_SATISFACTION: 'user_satisfaction',
    BOUNCE_RATE: 'bounce_rate',
  };

  constructor() {
    super();
    this.initializeDefaultBenchmarks();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载基准测试配置
      await this.loadBenchmarks();

      // 加载基线数据
      await this.loadBaselines();

      // 设置定时任务
      this.setupScheduledTasks();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 创建基准测试
   */
  async createBenchmark(config: Omit<BenchmarkConfig, 'id'>): Promise<string> {
    const benchmarkId = this.generateId();

    const benchmark: BenchmarkConfig = {
      ...config,
      id: benchmarkId,
    };

    this.benchmarks.set(benchmarkId, benchmark);
    await this.saveBenchmarks();
    this.emit('benchmark_created', benchmark);

    return benchmarkId;
  }

  /**
   * 获取基准测试
   */
  async getBenchmark(benchmarkId: string): Promise<BenchmarkConfig | null> {
    return this.benchmarks.get(benchmarkId) || null;
  }

  /**
   * 获取所有基准测试
   */
  async getAllBenchmarks(): Promise<BenchmarkConfig[]> {
    return Array.from(this.benchmarks.values());
  }

  /**
   * 更新基准测试
   */
  async updateBenchmark(
    benchmarkId: string,
    updates: Partial<BenchmarkConfig>
  ): Promise<BenchmarkConfig> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      throw new Error('Benchmark not found');
    }

    const updatedBenchmark = {
      ...benchmark,
      ...updates,
    };

    this.benchmarks.set(benchmarkId, updatedBenchmark);
    await this.saveBenchmarks();
    this.emit('benchmark_updated', updatedBenchmark);

    return updatedBenchmark;
  }

  /**
   * 删除基准测试
   */
  async deleteBenchmark(benchmarkId: string): Promise<boolean> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      return false;
    }

    this.benchmarks.delete(benchmarkId);
    await this.saveBenchmarks();
    this.emit('benchmark_deleted', { benchmarkId });

    return true;
  }

  /**
   * 执行基准测试
   */
  async executeBenchmark(
    benchmarkId: string,
    options: {
      environment?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      throw new Error('Benchmark not found');
    }

    const testId = this.generateId();
    const startTime = Date.now();

    try {
      // 执行性能测试
      const metrics = await this.runPerformanceTests(benchmark, options);

      // 计算分数
      const scores = this.calculateScores(metrics, benchmark.thresholds);

      // 获取基线数据
      const baseline = this.baselines.get(benchmarkId);

      // 比较结果
      const comparison = baseline ? this.compareWithBaseline(metrics, baseline) : null;

      // 生成建议
      const recommendations = this.generateRecommendations(metrics, scores, benchmark.category);

      // 创建测试结果
      const result: BenchmarkResult = {
        id: testId,
        benchmarkId,
        name: benchmark.name,
        category: benchmark.category,
        environment: options.environment || benchmark.environment,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        status: this.determineStatus(scores),
        scores,
        metrics,
        comparison,
        recommendations,
        artifacts: [],
        metadata: options.metadata || {},
      };

      this.testResults.set(testId, result);
      this.emit('benchmark_executed', result);

      return testId;
    } catch (error) {
      const failedResult: BenchmarkResult = {
        id: testId,
        benchmarkId,
        name: benchmark.name,
        category: benchmark.category,
        environment: options.environment || benchmark.environment,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        scores: { overall: 0, grade: 'F', byCategory: {}, byMetric: {} },
        metrics: { timestamp: new Date(), values: {}, metadata: {} },
        comparison: null,
        recommendations: [],
        artifacts: [],
        metadata: { error: error instanceof Error ? error.message : String(error) },
      };

      this.testResults.set(testId, failedResult);
      this.emit('benchmark_failed', failedResult);
      throw error;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<BenchmarkResult | null> {
    return this.testResults.get(testId) || null;
  }

  /**
   * 获取所有测试结果
   */
  async getAllTestResults(): Promise<BenchmarkResult[]> {
    return Array.from(this.testResults.values());
  }

  /**
   * 设置基线
   */
  async setBaseline(benchmarkId: string, data: PerformanceData): Promise<void> {
    this.baselines.set(benchmarkId, data);
    await this.saveBaselines();
    this.emit('baseline_updated', { benchmarkId, data });
  }

  /**
   * 获取基线
   */
  async getBaseline(benchmarkId: string): Promise<PerformanceData | null> {
    return this.baselines.get(benchmarkId) || null;
  }

  /**
   * 生成性能报告
   */
  async generateReport(
    options: {
      benchmarkIds?: string[];
      period?: {
        start: Date;
        end: Date;
      };
      includeRecommendations?: boolean;
    } = {}
  ): Promise<PerformanceReport> {
    const benchmarkIds = options.benchmarkIds || Array.from(this.benchmarks.keys());
    const results = Array.from(this.testResults.values())
      .filter(result => benchmarkIds.includes(result.benchmarkId))
      .filter(result => {
        if (options.period) {
          return (
            result.executedAt >= options.period.start && result.executedAt <= options.period.end
          );
        }
        return true;
      });

    const summary = this.calculateSummary(results);
    const trends = await this.calculateTrends(benchmarkIds);
    const recommendations = options.includeRecommendations
      ? this.generateGlobalRecommendations(results)
      : [];

    const report: PerformanceReport = {
      id: this.generateId(),
      title: 'Performance Benchmark Report',
      description: 'Comprehensive performance analysis and recommendations',
      period: options.period || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      benchmarks: results,
      summary,
      trends,
      recommendations,
      generatedAt: new Date(),
    };

    this.emit('report_generated', report);
    return report;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<PerformanceStatistics> {
    const results = Array.from(this.testResults.values());

    const totalBenchmarks = results.length;
    const successfulBenchmarks = results.filter(r => r.status === 'passed').length;
    const failedBenchmarks = results.filter(r => r.status === 'failed').length;

    const scores = results.map(r => r.scores.overall);
    const averageScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    const durations = results.map(r => r.duration);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const byCategory: Record<string, number> = {};
    const byEnvironment: Record<string, number> = {};
    const byGrade: Record<string, number> = {};

    results.forEach(result => {
      byCategory[result.category] = (byCategory[result.category] || 0) + 1;
      byEnvironment[result.environment] = (byEnvironment[result.environment] || 0) + 1;
      byGrade[result.scores.grade] = (byGrade[result.scores.grade] || 0) + 1;
    });

    const trends = this.calculateOverallTrends(results);

    return {
      totalBenchmarks,
      successfulBenchmarks,
      failedBenchmarks,
      averageScore,
      averageDuration,
      byCategory,
      byEnvironment,
      byGrade,
      trends,
    };
  }

  /**
   * 运行性能测试
   */
  private async runPerformanceTests(
    benchmark: BenchmarkConfig,
    options: any
  ): Promise<PerformanceData> {
    // 简化实现，实际应该运行真实的性能测试
    const metrics: Record<string, number> = {};

    // 模拟前端性能指标
    if (benchmark.category === 'frontend') {
      metrics[this.metrics.FIRST_CONTENTFUL_PAINT] = 1500 + Math.random() * 500;
      metrics[this.metrics.LARGEST_CONTENTFUL_PAINT] = 2500 + Math.random() * 1000;
      metrics[this.metrics.FIRST_INPUT_DELAY] = 50 + Math.random() * 100;
      metrics[this.metrics.CUMULATIVE_LAYOUT_SHIFT] = 0.05 + Math.random() * 0.15;
      metrics[this.metrics.TIME_TO_INTERACTIVE] = 3000 + Math.random() * 2000;
    }

    // 模拟后端性能指标
    if (benchmark.category === 'backend') {
      metrics[this.metrics.RESPONSE_TIME] = 200 + Math.random() * 300;
      metrics[this.metrics.THROUGHPUT] = 1000 + Math.random() * 500;
      metrics[this.metrics.ERROR_RATE] = Math.random() * 5;
      metrics[this.metrics.AVAILABILITY] = 95 + Math.random() * 4;
    }

    // 模拟业务指标
    if (benchmark.category === 'business') {
      metrics[this.metrics.CONVERSION_RATE] = 2.5 + Math.random() * 2;
      metrics[this.metrics.USER_SATISFACTION] = 4.0 + Math.random();
      metrics[this.metrics.BOUNCE_RATE] = 30 + Math.random() * 20;
    }

    return {
      timestamp: new Date(),
      values: metrics,
      metadata: options.metadata || {},
    };
  }

  /**
   * 计算分数
   */
  private calculateScores(
    metrics: PerformanceData,
    thresholds: PerformanceThresholds
  ): PerformanceScores {
    const scores: Record<string, number> = {};
    let totalScore = 0;
    let metricCount = 0;

    Object.entries(metrics.values).forEach(([metric, value]) => {
      const threshold = thresholds.excellent[metric];
      if (threshold) {
        let score = 0;

        if (value <= threshold) {
          score = 100;
        } else if (value <= thresholds.good[metric]) {
          score = 80;
        } else if (value <= thresholds.needsImprovement[metric]) {
          score = 60;
        } else if (value <= thresholds.poor[metric]) {
          score = 40;
        } else {
          score = 20;
        }

        scores[metric] = score;
        totalScore += score;
        metricCount++;
      }
    });

    const overallScore = metricCount > 0 ? totalScore / metricCount : 0;
    const grade = this.getGrade(overallScore);

    return {
      overall: overallScore,
      grade,
      byCategory: {},
      byMetric: scores,
    };
  }

  /**
   * 与基线比较
   */
  private compareWithBaseline(
    current: PerformanceData,
    baseline: PerformanceData
  ): BaselineComparison {
    const changes: Record<string, MetricChange> = {};

    Object.entries(current.values).forEach(([metric, currentValue]) => {
      const baselineValue = baseline.values[metric];
      if (baselineValue !== undefined) {
        const change = currentValue - baselineValue;
        const percentage = baselineValue !== 0 ? (change / baselineValue) * 100 : 0;

        let significance: 'significant' | 'minor' | 'negligible';
        if (Math.abs(percentage) > 10) {
          significance = 'significant';
        } else if (Math.abs(percentage) > 5) {
          significance = 'minor';
        } else {
          significance = 'negligible';
        }

        changes[metric] = {
          value: change,
          percentage,
          significance,
          direction: change > 0 ? 'degradation' : 'improvement',
        };
      }
    });

    const trend = this.calculateTrend(current, baseline);

    return {
      baseline,
      current,
      changes,
      trend,
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrend(
    current: PerformanceData,
    baseline: PerformanceData
  ): 'improving' | 'degrading' | 'stable' {
    const changes = Object.values(this.compareWithBaseline(current, baseline).changes);

    if (changes.length === 0) return 'stable';

    const improvements = changes.filter(c => c.direction === 'improvement').length;
    const degradations = changes.filter(c => c.direction === 'degradation').length;

    if (improvements > degradations * 1.2) return 'improving';
    if (degradations > improvements * 1.2) return 'degrading';
    return 'stable';
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    metrics: PerformanceData,
    scores: PerformanceScores,
    category: string
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // 基于分数生成建议
    if (scores.overall < 60) {
      recommendations.push({
        id: this.generateId(),
        priority: 'high',
        category,
        title: '整体性能需要优化',
        description: '当前性能分数较低，建议进行全面优化',
        impact: '显著改善用户体验',
        effort: 'high',
        examples: ['优化关键渲染路径', '减少不必要的网络请求', '优化数据库查询'],
        metrics: Object.keys(metrics.values),
      });
    }

    // 基于具体指标生成建议
    Object.entries(metrics.values).forEach(([metric, value]) => {
      if (metric === this.metrics.FIRST_CONTENTFUL_PAINT && value > 2000) {
        recommendations.push({
          id: this.generateId(),
          priority: 'high',
          category,
          title: '优化首次内容绘制',
          description: `FCP为${value}ms，建议优化到2000ms以下`,
          impact: '改善页面加载体验',
          effort: 'medium',
          examples: ['优化关键CSS', '延迟加载非关键资源', '使用CDN加速'],
          metrics: [metric],
        });
      }

      if (metric === this.metrics.LARGEST_CONTENTFUL_PAINT && value > 3000) {
        recommendations.push({
          id: this.generateId(),
          priority: 'high',
          category,
          title: '优化最大内容绘制',
          description: `LCP为${value}ms，建议优化到2500ms以下`,
          impact: '改善页面加载体验',
          effort: 'medium',
          examples: ['优化图片加载', '减少JavaScript执行时间', '使用预加载'],
          metrics: [metric],
        });
      }
    });

    return recommendations;
  }

  /**
   * 确定状态
   */
  private determineStatus(scores: PerformanceScores): 'passed' | 'failed' | 'warning' {
    if (scores.overall >= 80) return 'passed';
    if (scores.overall >= 60) return 'warning';
    return 'failed';
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 计算摘要
   */
  private calculateSummary(results: BenchmarkResult[]): PerformanceSummary {
    const totalBenchmarks = results.length;
    const passedBenchmarks = results.filter(r => r.status === 'passed').length;
    const failedBenchmarks = results.filter(r => r.status === 'failed').length;
    const warningBenchmarks = results.filter(r => r.status === 'warning').length;

    const scores = results.map(r => r.scores.overall);
    const overallScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const overallGrade = this.getGrade(overallScore);

    return {
      overallScore,
      overallGrade,
      totalBenchmarks,
      passedBenchmarks,
      failedBenchmarks,
      warningBenchmarks,
      keyMetrics: {},
      trends: {},
    };
  }

  /**
   * 计算趋势
   */
  private async calculateTrends(benchmarkIds: string[]): Promise<PerformanceTrend[]> {
    const trends: PerformanceTrend[] = [];

    for (const benchmarkId of benchmarkIds) {
      const results = Array.from(this.testResults.values())
        .filter(r => r.benchmarkId === benchmarkId)
        .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());

      if (results.length >= 2) {
        const metric = results[0].metrics.values;
        const data = results.map(r => ({
          date: r.executedAt.toISOString().split('T')[0],
          value: Object.values(metric.values)[0] || 0,
        }));

        const trend = this.calculateLinearTrend(data);
        const prediction = this.generatePrediction(data, 7);

        trends.push({
          metric: Object.keys(metric.values)[0] || '',
          period: 30,
          data,
          trend: trend.direction,
          changeRate: trend.changeRate,
          prediction,
        });
      }
    }

    return trends;
  }

  /**
   * 计算线性趋势
   */
  private calculateLinearTrend(data: Array<{ date: string; value: number }>): {
    direction: 'improving' | 'degrading' | 'stable';
    changeRate: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', changeRate: 0 };
    }

    const values = data.map(d => d.value);
    const first = values[0];
    const last = values[values.length - 1];
    const changeRate = first !== 0 ? ((last - first) / first) * 100 : 0;

    let direction: 'improving' | 'degrading' | 'stable';
    if (changeRate > 5) {
      direction = 'improving';
    } else if (changeRate < -5) {
      direction = 'degrading';
    } else {
      direction = 'stable';
    }

    return { direction, changeRate };
  }

  /**
   * 生成预测
   */
  private generatePrediction(
    data: Array<{ date: string; value: number }>,
    days: number
  ): Array<{
    date: string;
    value: number;
    confidence: number;
  }> {
    // 简化的线性预测
    if (data.length < 2) {
      return [];
    }

    const values = data.map(d => d.value);
    const trend = this.calculateLinearTrend(data);

    const prediction = [];
    const lastDate = new Date(data[data.length - 1].date);

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue =
        values[values.length - 1] + (trend.changeRate / 100) * values[values.length - 1] * i;

      prediction.push({
        date: futureDate.toISOString().split('T')[0],
        value: predictedValue,
        confidence: 0.7,
      });
    }

    return prediction;
  }

  /**
   * 生成全局建议
   */
  private generateGlobalRecommendations(results: BenchmarkResult[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // 分析所有结果中的建议
    const allRecommendations = results.flatMap(r => r.recommendations);

    // 按优先级和频率排序
    const priorityCount: Record<string, number> = {};
    allRecommendations.forEach(rec => {
      priorityCount[rec.priority] = (priorityCount[rec.priority] || 0) + 1;
    });

    // 选择最常见的建议
    const topRecommendations = allRecommendations
      .sort((a, b) => {
        const aPriority = priorityCount[a.priority] || 0;
        const bPriority = priorityCount[b.priority] || 0;
        return bPriority - aPriority;
      })
      .slice(0, 10);

    return topRecommendations;
  }

  /**
   * 计算整体趋势
   */
  private calculateOverallTrends(results: BenchmarkResult[]): PerformanceStatistics['trends'] {
    const scores = results.map(r => r.scores.overall);

    if (scores.length < 2) {
      return {
        score: 'stable',
        performance: 'stable',
        reliability: 'stable',
      };
    }

    const scoreTrend = this.calculateLinearTrend(
      scores.map((score, index) => ({
        date: new Date(Date.now() - (scores.length - index) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        value: score,
      }))
    );

    return {
      score: scoreTrend.direction,
      performance: scoreTrend.direction,
      reliability: scoreTrend.direction,
    };
  }

  /**
   * 初始化默认基准测试
   */
  private initializeDefaultBenchmarks(): void {
    const defaultBenchmarks: Omit<BenchmarkConfig, 'id'>[] = [
      {
        name: 'Web Performance',
        description: 'Web页面性能基准测试',
        category: 'frontend',
        metrics: [
          this.metrics.FIRST_CONTENTFUL_PAINT,
          this.metrics.LARGEST_CONTENTFUL_PAINT,
          this.metrics.FIRST_INPUT_DELAY,
          this.metrics.CUMULATIVE_LAYOUT_SHIFT,
          this.metrics.TIME_TO_INTERACTIVE,
        ],
        thresholds: {
          excellent: {
            [this.metrics.FIRST_CONTENTFUL_PAINT]: 1000,
            [this.metrics.LARGEST_CONTENTFUL_PAINT]: 2000,
            [this.metrics.FIRST_INPUT_DELAY]: 50,
            [this.metrics.CUMULATIVE_LAYOUT_SHIFT]: 0.1,
            [this.metrics.TIME_TO_INTERACTIVE]: 3000,
          },
          good: {
            [this.metrics.FIRST_CONTENTFUL_PAINT]: 1500,
            [this.metrics.LARGEST_CONTENTFUL_PAINT]: 3000,
            [this.metrics.FIRST_INPUT_DELAY]: 100,
            [this.metrics.CUMULATIVE_LAYOUT_SHIFT]: 0.2,
            [this.metrics.TIME_TO_INTERACTIVE]: 4000,
          },
          needsImprovement: {
            [this.metrics.FIRST_CONTENTFUL_PAINT]: 2000,
            [this.metrics.LARGEST_CONTENTFUL_PAINT]: 4000,
            [this.metrics.FIRST_INPUT_DELAY]: 200,
            [this.metrics.CUMULATIVE_LAYOUT_SHIFT]: 0.3,
            [this.metrics.TIME_TO_INTERACTIVE]: 6000,
          },
          poor: {
            [this.metrics.FIRST_CONTENTFUL_PAINT]: 3000,
            [this.metrics.LARGEST_CONTENTFUL_PAINT]: 6000,
            [this.metrics.FIRST_INPUT_DELAY]: 500,
            [this.metrics.CUMULATIVE_LAYOUT_SHIFT]: 0.5,
            [this.metrics.TIME_TO_INTERACTIVE]: 8000,
          },
        },
        testSuite: ['lighthouse', 'webpagetest'],
        environment: 'production',
        notifications: [],
      },
      {
        name: 'API Performance',
        description: 'API性能基准测试',
        category: 'backend',
        metrics: [
          this.metrics.RESPONSE_TIME,
          this.metrics.THROUGHPUT,
          this.metrics.ERROR_RATE,
          this.metrics.AVAILABILITY,
        ],
        thresholds: {
          excellent: {
            [this.metrics.RESPONSE_TIME]: 100,
            [this.metrics.THROUGHPUT]: 1000,
            [this.metrics.ERROR_RATE]: 1,
            [this.metrics.AVAILABILITY]: 99.9,
          },
          good: {
            [this.metrics.RESPONSE_TIME]: 200,
            [this.metrics.THROUGHPUT]: 800,
            [this.metrics.ERROR_RATE]: 2,
            [this.metrics.AVAILABILITY]: 99.5,
          },
          needsImprovement: {
            [this.metrics.RESPONSE_TIME]: 500,
            [this.metrics.THROUGHPUT]: 500,
            [this.metrics.ERROR_RATE]: 5,
            [this.metrics.AVAILABILITY]: 99.0,
          },
          poor: {
            [this.metrics.RESPONSE_TIME]: 1000,
            [this.metrics.THROUGHPUT]: 200,
            [this.metrics.ERROR_RATE]: 10,
            [this.metrics.AVAILABILITY]: 95.0,
          },
        },
        testSuite: ['k6', 'artillery'],
        environment: 'production',
        notifications: [],
      },
    ];

    defaultBenchmarks.forEach(benchmark => {
      this.createBenchmark(benchmark);
    });
  }

  /**
   * 设置定时任务
   */
  private setupScheduledTasks(): void {
    // 简化实现，实际应该设置定时任务
  }

  /**
   * 加载基准测试配置
   */
  private async loadBenchmarks(): Promise<void> {
    // 简化实现，实际应该从数据库或文件加载
  }

  /**
   * 保存基准测试配置
   */
  private async saveBenchmarks(): Promise<void> {
    // 简化实现，实际应该保存到数据库或文件
  }

  /**
   * 加载基线数据
   */
  private async loadBaselines(): Promise<void> {
    // 简化实现，实际应该从数据库或文件加载
  }

  /**
   * 保存基线数据
   */
  private async saveBaselines(): Promise<void> {
    // 简化实现，实际应该保存到数据库或文件
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PerformanceBenchmarkService;
