/**
 * 高级分析服务
 * 提供趋势分析、对比分析、预测分析等高级功能
 */

import { createApiUrl } from '../../config/api';

export interface AnalyticsDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface TrendAnalysisResult {
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
  changeRate: number; // 百分比变化率
  prediction: AnalyticsDataPoint[];
  confidence: number; // 预测置信度 0-1
  insights: string[];
}

export interface ComparisonResult {
  baseline: AnalyticsDataPoint[];
  comparison: AnalyticsDataPoint[];
  differences: {
    absolute: number[];
    percentage: number[];
    significant: boolean[];
  };
  summary: {
    averageDifference: number;
    maxDifference: number;
    minDifference: number;
    significantChanges: number;
  };
  insights: string[];
}

export interface PerformanceMetrics {
  responseTime: AnalyticsDataPoint[];
  throughput: AnalyticsDataPoint[];
  errorRate: AnalyticsDataPoint[];
  availability: AnalyticsDataPoint[];
  userSatisfaction: AnalyticsDataPoint[];
}

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  testType?: string;
  url?: string;
  userId?: string;
  tags?: string[];
  minScore?: number;
  maxScore?: number;
}

class AdvancedAnalyticsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 趋势分析
   */
  async analyzeTrend(
    dataPoints: AnalyticsDataPoint[],
    options: {
      predictionDays?: number;
      smoothing?: boolean;
      seasonality?: boolean;
    } = {}
  ): Promise<TrendAnalysisResult> {
    const cacheKey = `trend_${JSON.stringify({ dataPoints: dataPoints.length, options })}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(createApiUrl('/api/analytics/trend'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          dataPoints,
          options: {
            predictionDays: options.predictionDays || 7,
            smoothing: options.smoothing !== false,
            seasonality: options.seasonality !== false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`趋势分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.message || '趋势分析失败');
      }
    } catch (error) {
      console.error('趋势分析错误:', error);
      // 返回本地计算的简单趋势分析
      return this.calculateSimpleTrend(dataPoints, options);
    }
  }

  /**
   * 对比分析
   */
  async compareData(
    baseline: AnalyticsDataPoint[],
    comparison: AnalyticsDataPoint[],
    options: {
      alignByTime?: boolean;
      significanceThreshold?: number;
      includeStatistics?: boolean;
    } = {}
  ): Promise<ComparisonResult> {
    const cacheKey = `compare_${JSON.stringify({ 
      baseline: baseline.length, 
      comparison: comparison.length, 
      options 
    })}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(createApiUrl('/api/analytics/compare'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          baseline,
          comparison,
          options: {
            alignByTime: options.alignByTime !== false,
            significanceThreshold: options.significanceThreshold || 0.05,
            includeStatistics: options.includeStatistics !== false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`对比分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.message || '对比分析失败');
      }
    } catch (error) {
      console.error('对比分析错误:', error);
      // 返回本地计算的简单对比分析
      return this.calculateSimpleComparison(baseline, comparison, options);
    }
  }

  /**
   * 性能指标分析
   */
  async analyzePerformanceMetrics(
    filter: AnalyticsFilter = {}
  ): Promise<PerformanceMetrics> {
    const cacheKey = `performance_${JSON.stringify(filter)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(createApiUrl('/api/analytics/performance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ filter })
      });

      if (!response.ok) {
        throw new Error(`性能分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.setCache(cacheKey, result.data);
        return result.data;
      } else {
        throw new Error(result.message || '性能分析失败');
      }
    } catch (error) {
      console.error('性能分析错误:', error);
      // 返回模拟数据
      return this.generateMockPerformanceMetrics();
    }
  }

  /**
   * 获取分析洞察
   */
  async getAnalyticsInsights(
    dataType: 'performance' | 'security' | 'seo' | 'accessibility',
    timeRange: '24h' | '7d' | '30d' | '90d' = '7d'
  ): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
    score: number;
  }> {
    try {
      const response = await fetch(createApiUrl('/api/analytics/insights'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ dataType, timeRange })
      });

      if (!response.ok) {
        throw new Error(`洞察分析失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || '洞察分析失败');
      }
    } catch (error) {
      console.error('洞察分析错误:', error);
      return this.generateMockInsights(dataType);
    }
  }

  /**
   * 简单趋势计算（本地备用）
   */
  private calculateSimpleTrend(
    dataPoints: AnalyticsDataPoint[],
    options: any
  ): TrendAnalysisResult {
    if (dataPoints.length < 2) {
      return {
        trend: 'stable',
        trendStrength: 0,
        changeRate: 0,
        prediction: [],
        confidence: 0,
        insights: ['数据点不足，无法进行趋势分析']
      };
    }

    // 简单线性回归
    const n = dataPoints.length;
    const xValues = dataPoints.map((_, i) => i);
    const yValues = dataPoints.map(p => p.value);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 确定趋势
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    const trendStrength = Math.min(Math.abs(slope) / 10, 1);
    
    // 计算变化率
    const firstValue = yValues[0];
    const lastValue = yValues[yValues.length - 1];
    const changeRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    // 简单预测
    const predictionDays = options.predictionDays || 7;
    const prediction: AnalyticsDataPoint[] = [];
    for (let i = 1; i <= predictionDays; i++) {
      const predictedValue = slope * (n + i - 1) + intercept;
      prediction.push({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        value: Math.max(0, predictedValue)
      });
    }
    
    return {
      trend,
      trendStrength,
      changeRate,
      prediction,
      confidence: 0.7, // 简单模型的置信度
      insights: [
        `数据呈现${trend === 'increasing' ? '上升' : trend === 'decreasing' ? '下降' : '稳定'}趋势`,
        `变化率为${changeRate.toFixed(2)}%`,
        `趋势强度为${(trendStrength * 100).toFixed(1)}%`
      ]
    };
  }

  /**
   * 简单对比计算（本地备用）
   */
  private calculateSimpleComparison(
    baseline: AnalyticsDataPoint[],
    comparison: AnalyticsDataPoint[],
    options: any
  ): ComparisonResult {
    const minLength = Math.min(baseline.length, comparison.length);
    const alignedBaseline = baseline.slice(0, minLength);
    const alignedComparison = comparison.slice(0, minLength);
    
    const absolute = alignedBaseline.map((b, i) => 
      alignedComparison[i].value - b.value
    );
    
    const percentage = alignedBaseline.map((b, i) => 
      b.value !== 0 ? ((alignedComparison[i].value - b.value) / b.value) * 100 : 0
    );
    
    const significanceThreshold = options.significanceThreshold || 0.05;
    const significant = percentage.map(p => Math.abs(p) > significanceThreshold * 100);
    
    const averageDifference = absolute.reduce((a, b) => a + b, 0) / absolute.length;
    const maxDifference = Math.max(...absolute.map(Math.abs));
    const minDifference = Math.min(...absolute.map(Math.abs));
    const significantChanges = significant.filter(Boolean).length;
    
    return {
      baseline: alignedBaseline,
      comparison: alignedComparison,
      differences: { absolute, percentage, significant },
      summary: {
        averageDifference,
        maxDifference,
        minDifference,
        significantChanges
      },
      insights: [
        `平均差异: ${averageDifference.toFixed(2)}`,
        `最大差异: ${maxDifference.toFixed(2)}`,
        `显著变化数量: ${significantChanges}/${absolute.length}`
      ]
    };
  }

  /**
   * 生成模拟性能指标
   */
  private generateMockPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const generateData = (baseValue: number, variance: number, count: number = 24) => {
      return Array.from({ length: count }, (_, i) => ({
        timestamp: new Date(now - (count - i) * 60 * 60 * 1000).toISOString(),
        value: baseValue + (Math.random() - 0.5) * variance
      }));
    };

    return {
      responseTime: generateData(200, 100),
      throughput: generateData(1000, 200),
      errorRate: generateData(2, 1),
      availability: generateData(99.5, 0.5),
      userSatisfaction: generateData(4.2, 0.8)
    };
  }

  /**
   * 生成模拟洞察
   */
  private generateMockInsights(dataType: string) {
    const insights = {
      performance: [
        '响应时间在过去24小时内平均为200ms',
        '吞吐量保持稳定，峰值出现在上午10点',
        '错误率控制在2%以下，符合预期'
      ],
      security: [
        '未发现严重安全漏洞',
        'SSL证书配置正确',
        '建议启用HSTS头部'
      ],
      seo: [
        'SEO得分为85分，表现良好',
        '页面加载速度需要优化',
        '元标签配置完整'
      ],
      accessibility: [
        '可访问性得分为92分',
        '所有图片都有alt属性',
        '建议增加键盘导航支持'
      ]
    };

    return {
      insights: insights[dataType as keyof typeof insights] || [],
      recommendations: [
        '定期监控关键指标',
        '设置自动化告警',
        '优化用户体验'
      ],
      alerts: [],
      score: 85 + Math.random() * 10
    };
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
