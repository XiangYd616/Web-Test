/**
 * 高级分析服务
 * 职责: 提供趋势分析、对比分析、性能分析、洞察生成等业务逻辑
 */

// 数据点接口
export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
};

// 趋势分析选项接口
export interface TrendAnalysisOptions {
  predictionDays?: number;
  smoothing?: boolean;
  seasonality?: boolean;
}

// 趋势分析结果接口
export interface TrendAnalysisResult {
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  changeRate: number;
  regression: {
    slope: number;
    intercept: number;
    r2: number;
  };
  prediction: DataPoint[];
  confidence: number;
  insights: string[];
}

// 对比分析选项接口
export interface ComparisonAnalysisOptions {
  baselinePeriod?: number;
  comparisonPeriod?: number;
  metrics?: string[];
  aggregation?: 'avg' | 'sum' | 'max' | 'min';
}

// 对比分析结果接口
export interface ComparisonAnalysisResult {
  baseline: Record<string, number>;
  comparison: Record<string, number>;
  changes: Record<
    string,
    {
      absolute: number;
      percentage: number;
      significance: 'high' | 'medium' | 'low';
    }
  >;
  insights: string[];
}

// 性能分析选项接口
export interface PerformanceAnalysisOptions {
  timeRange?: number;
  metrics?: string[];
  benchmarks?: Record<string, number>;
}

// 性能分析结果接口
export interface PerformanceAnalysisResult {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  metrics: Record<
    string,
    {
      current: number;
      benchmark: number;
      score: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      trend: 'improving' | 'stable' | 'declining';
    }
  >;
  insights: string[];
  recommendations: string[];
}

// 洞察生成选项接口
export interface InsightGenerationOptions {
  dataPoints?: DataPoint[];
  context?: string;
  type?: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  severity?: 'high' | 'medium' | 'low';
}

// 洞察结果接口
export interface InsightResult {
  insights: Insight[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

// 洞察接口
export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  data: Record<string, unknown>;
  confidence: number;
  timestamp: Date;
  actionable: boolean;
}

type ComparisonChange = {
  absolute: number;
  percentage: number;
  significance: 'high' | 'medium' | 'low';
};

type PerformanceMetricSummary = {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'declining';
  score: number;
};

class AdvancedAnalyticsService {
  /**
   * 执行趋势分析
   */
  async performTrendAnalysis(
    dataPoints: DataPoint[],
    options: TrendAnalysisOptions = {}
  ): Promise<TrendAnalysisResult> {
    const { predictionDays = 7, smoothing = true } = options;

    const processedData = smoothing ? this.applySmoothing(dataPoints) : dataPoints;
    const regression = this.calculateLinearRegression(processedData);

    const trend =
      regression.slope > 0.1 ? 'increasing' : regression.slope < -0.1 ? 'decreasing' : 'stable';

    const trendStrength = Math.min(Math.abs(regression.slope) / 10, 1);
    const firstValue = processedData[0].value;
    const lastValue = processedData[processedData.length - 1].value;
    const changeRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    const prediction = this.generatePrediction(processedData, regression, predictionDays);
    const confidence = this.calculateConfidence(processedData, regression);
    const insights = this.generateTrendInsights(trend, trendStrength, changeRate, confidence);

    return {
      trend,
      trendStrength,
      changeRate,
      regression,
      prediction,
      confidence,
      insights,
    };
  }

  /**
   * 执行对比分析
   */
  async performComparisonAnalysis(
    baselineData: DataPoint[],
    comparisonData: DataPoint[],
    options: ComparisonAnalysisOptions = {}
  ): Promise<ComparisonAnalysisResult> {
    const {
      baselinePeriod = 30,
      comparisonPeriod = 30,
      metrics = ['value'],
      aggregation = 'avg',
    } = options;

    // 聚合基线数据
    const baseline = this.aggregateData(baselineData.slice(-baselinePeriod), aggregation);

    // 聚合对比数据
    const comparison = this.aggregateData(comparisonData.slice(-comparisonPeriod), aggregation);

    // 计算变化
    const changes: Record<
      string,
      {
        absolute: number;
        percentage: number;
        significance: 'high' | 'medium' | 'low';
      }
    > = {};

    metrics.forEach(metric => {
      const baselineValue = baseline[metric] || 0;
      const comparisonValue = comparison[metric] || 0;

      const absolute = comparisonValue - baselineValue;
      const percentage = baselineValue !== 0 ? (absolute / baselineValue) * 100 : 0;

      let significance: 'high' | 'medium' | 'low' = 'low';
      if (Math.abs(percentage) > 20) {
        significance = 'high';
      } else if (Math.abs(percentage) > 10) {
        significance = 'medium';
      }

      changes[metric] = {
        absolute,
        percentage,
        significance,
      };
    });

    // 生成洞察
    const insights = this.generateComparisonInsights(changes);

    return {
      baseline,
      comparison,
      changes,
      insights,
    };
  }

  /**
   * 执行性能分析
   */
  async performPerformanceAnalysis(
    performanceData: DataPoint[],
    options: PerformanceAnalysisOptions = {}
  ): Promise<PerformanceAnalysisResult> {
    const {
      timeRange = 30,
      metrics = ['response_time', 'throughput', 'error_rate'],
      benchmarks = {
        response_time: 1000,
        throughput: 1000,
        error_rate: 1,
      },
    } = options;

    // 聚合性能数据
    const aggregated = this.aggregateData(performanceData.slice(-timeRange), 'avg');

    // 计算各指标分数
    const metricsResult: Record<
      string,
      {
        current: number;
        benchmark: number;
        score: number;
        grade: 'A' | 'B' | 'C' | 'D' | 'F';
        trend: 'improving' | 'stable' | 'declining';
      }
    > = {};

    let totalScore = 0;
    const validMetrics = metrics.filter(metric => aggregated[metric] !== undefined);

    metrics.forEach(metric => {
      const current = aggregated[metric] || 0;
      const benchmark = benchmarks[metric] || 100;

      let score = 100;
      if (current > benchmark) {
        score = Math.max(0, 100 - ((current - benchmark) / benchmark) * 100);
      } else {
        score = Math.min(100, (current / benchmark) * 100);
      }

      const grade = this.getGrade(score);
      const trend = this.calculateTrend(performanceData);

      metricsResult[metric] = {
        current,
        benchmark,
        score,
        grade,
        trend,
      };

      totalScore += score;
    });

    // 计算总体分数
    const overallScore = validMetrics.length > 0 ? totalScore / validMetrics.length : 0;
    const overall = {
      score: overallScore,
      grade: this.getGrade(overallScore),
      status: this.getPerformanceStatus(overallScore),
    };

    // 生成洞察和建议
    const insights = this.generatePerformanceInsights(metricsResult);
    const recommendations = this.generatePerformanceRecommendations(metricsResult);

    return {
      overall,
      metrics: metricsResult,
      insights,
      recommendations,
    };
  }

  /**
   * 生成洞察
   */
  async generateInsights(
    dataPoints: DataPoint[],
    options: InsightGenerationOptions = {}
  ): Promise<InsightResult> {
    const { type = 'trend', severity = 'medium' } = options;

    const insights: Insight[] = [];

    // 根据类型生成不同的洞察
    switch (type) {
      case 'trend':
        insights.push(...this.generateTrendInsightsFromData(dataPoints));
        break;
      case 'anomaly':
        insights.push(...this.detectAnomalies(dataPoints));
        break;
      case 'opportunity':
        insights.push(...this.identifyOpportunities(dataPoints));
        break;
      case 'risk':
        insights.push(...this.identifyRisks(dataPoints));
        break;
    }

    // 按严重程度过滤
    const filteredInsights = insights.filter(
      insight => severity === 'high' || insight.severity === severity
    );

    // 生成摘要
    const summary = {
      total: filteredInsights.length,
      byType: this.groupInsightsByType(filteredInsights),
      bySeverity: this.groupInsightsBySeverity(filteredInsights),
    };

    return {
      insights: filteredInsights,
      summary,
    };
  }

  /**
   * 应用平滑处理
   */
  private applySmoothing(dataPoints: DataPoint[]): DataPoint[] {
    const smoothed: DataPoint[] = [];
    const windowSize = 3;

    for (let i = 0; i < dataPoints.length; i++) {
      if (i < windowSize - 1) {
        smoothed.push(dataPoints[i]);
      } else {
        const start = Math.max(0, i - windowSize + 1);
        const end = i + 1;
        const window = dataPoints.slice(start, end);
        const average = window.reduce((sum, point) => sum + point.value, 0) / window.length;

        smoothed.push({
          ...dataPoints[i],
          value: average,
        });
      }
    }

    return smoothed;
  }

  /**
   * 计算线性回归
   */
  private calculateLinearRegression(dataPoints: DataPoint[]): RegressionResult {
    const n = dataPoints.length;
    if (n < 2) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    dataPoints.forEach((point, index) => {
      const x = index;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;

    dataPoints.forEach((point, index) => {
      const x = index;
      const y = point.value;
      const yFit = slope * x + intercept;
      ssRes += Math.pow(y - yFit, 2);
      ssTot += Math.pow(y - yMean, 2);
    });

    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
  }

  /**
   * 生成预测
   */
  private generatePrediction(
    dataPoints: DataPoint[],
    regression: RegressionResult,
    days: number
  ): DataPoint[] {
    const prediction: DataPoint[] = [];
    const lastIndex = dataPoints.length - 1;
    const lastTimestamp = dataPoints[lastIndex].timestamp;

    for (let i = 1; i <= days; i++) {
      const futureTimestamp = new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000);
      const futureIndex = lastIndex + i;
      const predictedValue = regression.slope * futureIndex + regression.intercept;

      prediction.push({
        timestamp: futureTimestamp,
        value: predictedValue,
      });
    }

    return prediction;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(dataPoints: DataPoint[], regression: RegressionResult): number {
    return Math.max(0, regression.r2);
  }

  /**
   * 生成趋势洞察
   */
  private generateTrendInsights(
    trend: string,
    trendStrength: number,
    changeRate: number,
    confidence: number
  ): string[] {
    const insights: string[] = [];

    if (trend === 'increasing') {
      insights.push(`数据显示上升趋势，强度为${(trendStrength * 100).toFixed(1)}%`);
      insights.push(`变化率为${changeRate.toFixed(2)}%`);
    } else if (trend === 'decreasing') {
      insights.push(`数据显示下降趋势，强度为${(trendStrength * 100).toFixed(1)}%`);
      insights.push(`变化率为${changeRate.toFixed(2)}%`);
    } else {
      insights.push('数据保持稳定');
    }

    if (confidence < 0.5) {
      insights.push('预测置信度较低，建议收集更多数据');
    } else if (confidence > 0.8) {
      insights.push('预测置信度较高，趋势分析可靠');
    }

    return insights;
  }

  /**
   * 生成对比洞察
   */
  private generateComparisonInsights(changes: Record<string, ComparisonChange>): string[] {
    const insights: string[] = [];

    Object.entries(changes).forEach(([metric, change]) => {
      if (change.significance === 'high') {
        insights.push(
          `${metric}发生${change.absolute > 0 ? '显著增加' : '显著减少'}，变化幅度为${change.percentage.toFixed(2)}%`
        );
      } else if (change.significance === 'medium') {
        insights.push(
          `${metric}发生${change.absolute > 0 ? '中等增加' : '中等减少'}，变化幅度为${change.percentage.toFixed(2)}%`
        );
      }
    });

    return insights;
  }

  /**
   * 生成性能洞察
   */
  private generatePerformanceInsights(metrics: Record<string, PerformanceMetricSummary>): string[] {
    const insights: string[] = [];

    Object.entries(metrics).forEach(([metric, data]) => {
      if (data.grade === 'F') {
        insights.push(`${metric}性能极差，需要立即优化`);
      } else if (data.grade === 'D') {
        insights.push(`${metric}性能较差，建议优化`);
      } else if (data.trend === 'declining') {
        insights.push(`${metric}呈下降趋势，需要关注`);
      } else if (data.trend === 'improving') {
        insights.push(`${metric}呈改善趋势，继续保持`);
      }
    });

    return insights;
  }

  /**
   * 生成性能建议
   */
  private generatePerformanceRecommendations(
    metrics: Record<string, PerformanceMetricSummary>
  ): string[] {
    const recommendations: string[] = [];

    Object.entries(metrics).forEach(([metric, data]) => {
      if (data.grade === 'F' || data.grade === 'D') {
        recommendations.push(`优化${metric}性能，当前分数为${data.score}`);
      }
    });

    return recommendations;
  }

  /**
   * 从数据生成趋势洞察
   */
  private generateTrendInsightsFromData(dataPoints: DataPoint[]): Insight[] {
    const insights: Insight[] = [];

    if (dataPoints.length < 2) return insights;

    const regression = this.calculateLinearRegression(dataPoints);
    const trend =
      regression.slope > 0.1 ? 'increasing' : regression.slope < -0.1 ? 'decreasing' : 'stable';

    insights.push({
      id: this.generateId(),
      type: 'trend',
      severity: regression.r2 > 0.7 ? 'high' : regression.r2 > 0.3 ? 'medium' : 'low',
      title: `数据趋势分析`,
      description: `数据呈现${trend}趋势，相关系数R²为${regression.r2.toFixed(3)}`,
      data: { trend, r2: regression.r2 },
      confidence: regression.r2,
      timestamp: new Date(),
      actionable: regression.r2 > 0.5,
    });

    return insights;
  }

  /**
   * 检测异常
   */
  private detectAnomalies(dataPoints: DataPoint[]): Insight[] {
    const insights: Insight[] = [];

    if (dataPoints.length < 3) return insights;

    const values = dataPoints.map(p => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    // 使用3σ规则检测异常
    dataPoints.forEach(point => {
      const zScore = Math.abs((point.value - mean) / stdDev);

      if (zScore > 3) {
        insights.push({
          id: this.generateId(),
          type: 'anomaly',
          severity: zScore > 5 ? 'high' : zScore > 4 ? 'medium' : 'low',
          title: '异常检测',
          description: `在${point.timestamp.toLocaleString()}检测到异常值${point.value}，标准差为${stdDev.toFixed(2)}`,
          data: { value: point.value, zScore, mean, stdDev },
          confidence: Math.min(0.9, zScore / 5),
          timestamp: point.timestamp,
          actionable: true,
        });
      }
    });

    return insights;
  }

  /**
   * 识别机会
   */
  private identifyOpportunities(dataPoints: DataPoint[]): Insight[] {
    const insights: Insight[] = [];

    if (dataPoints.length < 2) return insights;

    // 寻找增长机会
    const regression = this.calculateLinearRegression(dataPoints);

    if (regression.slope > 0.5 && regression.r2 > 0.6) {
      insights.push({
        id: this.generateId(),
        type: 'opportunity',
        severity: 'high',
        title: '增长机会',
        description: `数据显示强劲增长趋势，斜率为${regression.slope.toFixed(3)}，建议加大投入`,
        data: { slope: regression.slope, r2: regression.r2 },
        confidence: regression.r2,
        timestamp: new Date(),
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * 识别风险
   */
  private identifyRisks(dataPoints: DataPoint[]): Insight[] {
    const insights: Insight[] = [];

    if (dataPoints.length < 2) return insights;

    const regression = this.calculateLinearRegression(dataPoints);

    if (regression.slope < -0.5 && regression.r2 > 0.6) {
      insights.push({
        id: this.generateId(),
        type: 'risk',
        severity: 'high',
        title: '下降风险',
        description: `数据显示明显下降趋势，斜率为${regression.slope.toFixed(3)}，需要立即采取措施`,
        data: { slope: regression.slope, r2: regression.r2 },
        confidence: regression.r2,
        timestamp: new Date(),
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * 聚合数据
   */
  private aggregateData(
    dataPoints: DataPoint[],
    aggregation: 'avg' | 'sum' | 'max' | 'min'
  ): Record<string, number> {
    const result: Record<string, number> = {};

    switch (aggregation) {
      case 'avg': {
        const sum = dataPoints.reduce((sum, point) => sum + point.value, 0);
        result.value = sum / dataPoints.length;
        break;
      }
      case 'sum':
        result.value = dataPoints.reduce((sum, point) => sum + point.value, 0);
        break;
      case 'max':
        result.value = Math.max(...dataPoints.map(p => p.value));
        break;
      case 'min':
        result.value = Math.min(...dataPoints.map(p => p.value));
        break;
    }

    return result;
  }

  /**
   * 计算趋势
   */
  private calculateTrend(dataPoints: DataPoint[]): 'improving' | 'stable' | 'declining' {
    if (dataPoints.length < 2) return 'stable';

    const regression = this.calculateLinearRegression(dataPoints);
    return regression.slope > 0.05
      ? 'improving'
      : regression.slope < -0.05
        ? 'declining'
        : 'stable';
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
   * 获取性能状态
   */
  private getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * 按类型分组洞察
   */
  private groupInsightsByType(insights: Insight[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    insights.forEach(insight => {
      grouped[insight.type] = (grouped[insight.type] || 0) + 1;
    });

    return grouped;
  }

  /**
   * 按严重程度分组洞察
   */
  private groupInsightsBySeverity(insights: Insight[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    insights.forEach(insight => {
      grouped[insight.severity] = (grouped[insight.severity] || 0) + 1;
    });

    return grouped;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AdvancedAnalyticsService;
