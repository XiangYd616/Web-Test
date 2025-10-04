/**
 * 比较工具服务
 * 提供测试结果比较、性能对比、趋势分析功能
 */

export interface ComparisonResult {
  test1: TestResult;
  test2: TestResult;
  comparison: {
    metrics: Record<string, MetricComparison>;
    improvements: string[];
    regressions: string[];
    unchanged: string[];
  };
  summary: ComparisonSummary;
}

export interface TestResult {
  id: string;
  url: string;
  testType: string;
  metrics: Record<string, number>;
  timestamp: string;
  status: string;
}

export interface MetricComparison {
  before: number;
  after: number;
  change: number;
  changeType: 'improvement' | 'regression' | 'unchanged';
}

export interface ComparisonSummary {
  totalMetrics: number;
  improvements: number;
  regressions: number;
  unchanged: number;
  overallTrend: 'improved' | 'regressed' | 'stable';
}

export interface TrendAnalysis {
  trends: Record<string, TrendData>;
  analysis: TrendInsight[];
  recommendations: Recommendation[];
}

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  average: number;
  min: number;
  max: number;
  variance: number;
}

export interface TrendInsight {
  metric: string;
  direction: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface Recommendation {
  metric: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

class ComparisonService {
  private baseUrl = '/api/comparison';
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 比较两个测试结果
   */
  async compareTestResults(testId1: string, testId2: string): Promise<ComparisonResult> {
    try {
      const response = await fetch(`${this.baseUrl}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testId1, testId2 })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '比较测试结果失败');
      }

      return data.data;
    } catch (error) {
      console.error('比较测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 批量比较多个测试结果
   */
  async batchCompareResults(testIds: string[]): Promise<{
    results: TestResult[];
    comparisons: unknown[];
    trends: TrendAnalysis;
    summary: any;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/batch-compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testIds })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '批量比较测试结果失败');
      }

      return data.data;
    } catch (error) {
      console.error('批量比较测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 性能趋势分析
   */
  async analyzePerformanceTrends(
    testType: string,
    url: string,
    timeRange: number = 30
  ): Promise<TrendAnalysis> {
    const cacheKey = `trends-${testType}-${url}-${timeRange}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const params = new URLSearchParams({
        testType,
        url,
        timeRange: timeRange.toString()
      });

      const response = await fetch(`${this.baseUrl}/trends?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '性能趋势分析失败');
      }

      const trends = data.data;

      // 缓存结果
      this.cache.set(cacheKey, {
        data: trends,
        timestamp: Date.now()
      });

      return trends;
    } catch (error) {
      console.error('性能趋势分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取比较历史
   */
  async getComparisonHistory(
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{
    comparisons: unknown[];
    total: number;
    pagination: any;
  }> {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取比较历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取比较历史失败:', error);
      throw error;
    }
  }

  /**
   * 保存比较结果
   */
  async saveComparison(
    comparisonData: {
      name: string;
      description?: string;
      testIds: string[];
      results: ComparisonResult;
    }
  ): Promise<{ id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(comparisonData)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '保存比较结果失败');
      }

      return data.data;
    } catch (error) {
      console.error('保存比较结果失败:', error);
      throw error;
    }
  }

  /**
   * 删除比较结果
   */
  async deleteComparison(comparisonId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${comparisonId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '删除比较结果失败');
      }

      // 清除相关缓存
      this.clearCache();
    } catch (error) {
      console.error('删除比较结果失败:', error);
      throw error;
    }
  }

  /**
   * 导出比较结果
   */
  async exportComparison(
    comparisonId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<string> {
    try {
      const params = new URLSearchParams({ format });

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const response = await fetch(`${this.baseUrl}/${comparisonId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出比较结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取比较统计信息
   */
  async getComparisonStats(): Promise<{
    totalComparisons: number;
    recentComparisons: number;
    topMetrics: Array<{
      metric: string;
      improvementRate: number;
      regressionRate: number;
    }>;
    trendSummary: {
      improving: number;
      declining: number;
      stable: number;
    };
  }> {
    const cacheKey = 'comparison-stats';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取统计信息失败');
      }

      const stats = data.data;
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 生成比较报告
   */
  async generateComparisonReport(
    comparisonId: string,
    options: {
      includeCharts?: boolean;
      includeRecommendations?: boolean;
      format?: 'html' | 'pdf';
    } = {}
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${comparisonId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '生成比较报告失败');
      }

      return data.data.reportUrl;
    } catch (error) {
      console.error('生成比较报告失败:', error);
      throw error;
    }
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * 计算变化百分比
   */
  calculateChangePercentage(before: number, after: number): number {
    if (before === 0) return after === 0 ? 0 : 100;
    return ((after - before) / before) * 100;
  }

  /**
   * 判断变化类型
   */
  getChangeType(metric: string, change: number): 'improvement' | 'regression' | 'unchanged' {
    const threshold = 5; // 5%阈值
    
    if (Math.abs(change) < threshold) {
      return 'unchanged';
    }

    // 正向指标（越高越好）
    const positiveMetrics = ['throughput', 'score', 'successRate'];
    // 负向指标（越低越好）
    const negativeMetrics = ['responseTime', 'errorRate', 'cpuUsage', 'memoryUsage'];

    if (positiveMetrics.includes(metric)) {
      return change > 0 ? 'improvement' : 'regression';
    } else if (negativeMetrics.includes(metric)) {
      return change < 0 ? 'improvement' : 'regression';
    }

    return 'unchanged';
  }

  /**
   * 格式化变化值
   */
  formatChange(change: number, metric: string): string {
    const absChange = Math.abs(change);
    const direction = change > 0 ? '+' : '';
    
    if (metric.includes('Time') || metric.includes('Duration')) {
      return `${direction}${absChange.toFixed(0)}ms`;
    } else if (metric.includes('Rate') || metric.includes('Percentage')) {
      return `${direction}${absChange.toFixed(1)}%`;
    } else {
      return `${direction}${absChange.toFixed(2)}`;
    }
  }
}

export const comparisonService = new ComparisonService();
export default comparisonService;
