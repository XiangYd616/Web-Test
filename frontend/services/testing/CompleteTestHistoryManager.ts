/**
 * 完整的测试历史管理器
 * 提供历史记录管理、对比分析、趋势分析和数据洞察功能
 * 支持数据聚合、智能分析和可视化数据生成
 */

import type { TestResult, TestType } from './CompleteTestEngine';
import { completeApiService } from '../api/CompleteApiService';

// 历史记录接口
export interface TestHistoryRecord {
  id: string;
  testId: string;
  url: string;
  type: TestType;
  score: number;
  metrics: Record<string, any>;
  issues: number;
  recommendations: number;
  duration: number;
  timestamp: Date;
  userId?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

// 趋势数据接口
export interface TrendData {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  data: Array<{
    date: string;
    score: number;
    count: number;
    metrics: Record<string, number>;
  }>;
  summary: {
    averageScore: number;
    totalTests: number;
    improvement: number;
    bestScore: number;
    worstScore: number;
  };
}

// 对比分析结果接口
export interface ComparisonResult {
  baseline: TestHistoryRecord;
  target: TestHistoryRecord;
  differences: {
    scoreChange: number;
    scoreChangePercent: number;
    metricChanges: Record<string, {
      baseline: number;
      target: number;
      change: number;
      changePercent: number;
      significance: 'low' | 'medium' | 'high';
    }>;
    issueChanges: {
      new: number;
      resolved: number;
      persistent: number;
    };
  };
  insights: string[];
  recommendations: string[];
}

// 聚合统计接口
export interface AggregatedStats {
  timeRange: {
    start: Date;
    end: Date;
  };
  overall: {
    totalTests: number;
    averageScore: number;
    scoreDistribution: Record<string, number>;
    testTypeDistribution: Record<TestType, number>;
  };
  performance: {
    averageLoadTime: number;
    averageResponseTime: number;
    performanceTrend: 'improving' | 'stable' | 'declining';
  };
  quality: {
    averageIssues: number;
    criticalIssues: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
  };
  frequency: {
    testsPerDay: number;
    testsPerWeek: number;
    testsPerMonth: number;
  };
}

// 洞察类型枚举
export enum InsightType {
  PERFORMANCE_IMPROVEMENT = 'performance_improvement',
  PERFORMANCE_REGRESSION = 'performance_regression',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  QUALITY_REGRESSION = 'quality_regression',
  FREQUENCY_INCREASE = 'frequency_increase',
  FREQUENCY_DECREASE = 'frequency_decrease',
  PATTERN_DETECTED = 'pattern_detected',
  ANOMALY_DETECTED = 'anomaly_detected'
}

// 洞察接口
export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  data: Record<string, any>;
  recommendations: string[];
  createdAt: Date;
}

// 查询选项接口
export interface HistoryQueryOptions {
  url?: string;
  type?: TestType;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'score' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

// 完整测试历史管理器类
export class CompleteTestHistoryManager {
  private cache: Map<string, any> = new Map();
  private cacheTimeout: number = 300000; // 5分钟缓存

  constructor() {
    this.initializeCache();
  }

  // 添加测试记录
  async addRecord(result: TestResult): Promise<string> {
    const record: TestHistoryRecord = {
      id: this.generateId(),
      testId: result.id,
      url: result.url,
      type: result.type,
      score: result.score,
      metrics: result.metrics,
      issues: result.issues.length,
      recommendations: result.recommendations.length,
      duration: result.duration || 0,
      timestamp: result.endTime || new Date(),
      userId: result.metadata?.userId,
      tags: this.generateTags(result),
      metadata: result.metadata
    };

    try {
      const response = await completeApiService.post('/test/history', record);
      this.clearCache(); // 清除缓存以确保数据一致性
      return response.data.id;
    } catch (error) {
      console.error('Failed to add test record:', error);
      throw error;
    }
  }

  // 获取历史记录
  async getHistory(options: HistoryQueryOptions = {}): Promise<TestHistoryRecord[]> {
    const cacheKey = this.getCacheKey('history', options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await completeApiService.get('/test/history', { params: options });
      const records = response.data.map(this.transformRecord);
      this.setCache(cacheKey, records);
      return records;
    } catch (error) {
      console.error('Failed to get test history:', error);
      throw error;
    }
  }

  // 获取单个记录
  async getRecord(recordId: string): Promise<TestHistoryRecord | null> {
    const cacheKey = `record-${recordId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await completeApiService.get(`/test/history/${recordId}`);
      const record = this.transformRecord(response.data);
      this.setCache(cacheKey, record);
      return record;
    } catch (error) {
      console.error('Failed to get test record:', error);
      return null;
    }
  }

  // 删除记录
  async deleteRecord(recordId: string): Promise<boolean> {
    try {
      await completeApiService.delete(`/test/history/${recordId}`);
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Failed to delete test record:', error);
      return false;
    }
  }

  // 批量删除记录
  async deleteRecords(recordIds: string[]): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of recordIds) {
      try {
        await this.deleteRecord(id);
        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  // 获取趋势数据
  async getTrendData(
    url: string,
    type: TestType,
    period: TrendData['period'] = 'month'
  ): Promise<TrendData> {
    const cacheKey = `trend-${url}-${type}-${period}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await completeApiService.get('/test/history/trends', {
        params: { url, type, period }
      });
      
      const trendData = this.processTrendData(response.data, period);
      this.setCache(cacheKey, trendData);
      return trendData;
    } catch (error) {
      console.error('Failed to get trend data:', error);
      throw error;
    }
  }

  // 对比分析
  async compareRecords(baselineId: string, targetId: string): Promise<ComparisonResult> {
    const cacheKey = `comparison-${baselineId}-${targetId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [baseline, target] = await Promise.all([
        this.getRecord(baselineId),
        this.getRecord(targetId)
      ]);

      if (!baseline || !target) {
        throw new Error('One or both records not found');
      }

      const comparison = this.performComparison(baseline, target);
      this.setCache(cacheKey, comparison);
      return comparison;
    } catch (error) {
      console.error('Failed to compare records:', error);
      throw error;
    }
  }

  // 获取聚合统计
  async getAggregatedStats(
    startDate: Date,
    endDate: Date,
    filters: Partial<HistoryQueryOptions> = {}
  ): Promise<AggregatedStats> {
    const cacheKey = this.getCacheKey('stats', { startDate, endDate, ...filters });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const records = await this.getHistory({
        startDate,
        endDate,
        ...filters
      });

      const stats = this.calculateAggregatedStats(records, startDate, endDate);
      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Failed to get aggregated stats:', error);
      throw error;
    }
  }

  // 生成洞察
  async generateInsights(
    url?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
      end: new Date()
    }
  ): Promise<Insight[]> {
    const cacheKey = `insights-${url || 'all'}-${timeRange.start.getTime()}-${timeRange.end.getTime()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const records = await this.getHistory({
        url,
        startDate: timeRange.start,
        endDate: timeRange.end,
        sortBy: 'timestamp',
        sortOrder: 'asc'
      });

      const insights = this.analyzeRecords(records);
      this.setCache(cacheKey, insights);
      return insights;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw error;
    }
  }

  // 获取最佳和最差记录
  async getBestAndWorstRecords(
    url: string,
    type: TestType,
    timeRange?: { start: Date; end: Date }
  ): Promise<{ best: TestHistoryRecord | null; worst: TestHistoryRecord | null }> {
    try {
      const records = await this.getHistory({
        url,
        type,
        startDate: timeRange?.start,
        endDate: timeRange?.end,
        sortBy: 'score',
        sortOrder: 'desc'
      });

      return {
        best: records.length > 0 ? records[0] : null,
        worst: records.length > 0 ? records[records.length - 1] : null
      };
    } catch (error) {
      console.error('Failed to get best and worst records:', error);
      return { best: null, worst: null };
    }
  }

  // 获取相似URL的记录
  async getSimilarUrlRecords(url: string, limit: number = 10): Promise<TestHistoryRecord[]> {
    try {
      const allRecords = await this.getHistory({ limit: 1000 });
      
      // 简单的URL相似度匹配
      const similarRecords = allRecords
        .filter(record => {
          const similarity = this.calculateUrlSimilarity(url, record.url);
          return similarity > 0.7 && record.url !== url;
        })
        .sort((a, b) => {
          const simA = this.calculateUrlSimilarity(url, a.url);
          const simB = this.calculateUrlSimilarity(url, b.url);
          return simB - simA;
        })
        .slice(0, limit);

      return similarRecords;
    } catch (error) {
      console.error('Failed to get similar URL records:', error);
      return [];
    }
  }

  // 导出历史数据
  async exportHistory(
    options: HistoryQueryOptions & { format: 'json' | 'csv' | 'xlsx' }
  ): Promise<Blob> {
    try {
      const records = await this.getHistory(options);
      
      switch (options.format) {
        case 'json':
          return new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        case 'csv':
          return new Blob([this.convertToCSV(records)], { type: 'text/csv' });
        case 'xlsx':
          // 这里需要集成XLSX库
          throw new Error('XLSX export not implemented');
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      console.error('Failed to export history:', error);
      throw error;
    }
  }

  // 私有方法

  // 生成标签
  private generateTags(result: TestResult): string[] {
    const tags = [result.type];
    
    if (result.score >= 90) tags.push('excellent');
    else if (result.score >= 70) tags.push('good');
    else if (result.score >= 50) tags.push('fair');
    else tags.push('poor');
    
    if (result.issues.length === 0) tags.push('no-issues');
    else if (result.issues.length > 10) tags.push('many-issues');
    
    if (result.duration && result.duration < 30000) tags.push('fast');
    else if (result.duration && result.duration > 120000) tags.push('slow');
    
    return tags;
  }

  // 转换记录格式
  private transformRecord(data: any): TestHistoryRecord {
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      tags: data.tags || []
    };
  }

  // 处理趋势数据
  private processTrendData(rawData: any[], period: TrendData['period']): TrendData {
    const groupedData = this.groupDataByPeriod(rawData, period);
    const processedData = Object.entries(groupedData).map(([date, records]) => ({
      date,
      score: records.reduce((sum, r) => sum + r.score, 0) / records.length,
      count: records.length,
      metrics: this.aggregateMetrics(records)
    }));

    const scores = processedData.map(d => d.score);
    const summary = {
      averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      totalTests: processedData.reduce((sum, d) => sum + d.count, 0),
      improvement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores)
    };

    return { period, data: processedData, summary };
  }

  // 按时间段分组数据
  private groupDataByPeriod(data: any[], period: TrendData['period']): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    data.forEach(record => {
      const date = new Date(record.timestamp);
      let key: string;
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(record);
    });
    
    return grouped;
  }

  // 聚合指标
  private aggregateMetrics(records: any[]): Record<string, number> {
    const metrics: Record<string, number[]> = {};
    
    records.forEach(record => {
      Object.entries(record.metrics || {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!metrics[key]) metrics[key] = [];
          metrics[key].push(value);
        }
      });
    });
    
    const aggregated: Record<string, number> = {};
    Object.entries(metrics).forEach(([key, values]) => {
      aggregated[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
    });
    
    return aggregated;
  }

  // 执行对比分析
  private performComparison(baseline: TestHistoryRecord, target: TestHistoryRecord): ComparisonResult {
    const scoreChange = target.score - baseline.score;
    const scoreChangePercent = baseline.score !== 0 ? (scoreChange / baseline.score) * 100 : 0;
    
    const metricChanges: Record<string, any> = {};
    const allMetricKeys = new Set([
      ...Object.keys(baseline.metrics),
      ...Object.keys(target.metrics)
    ]);
    
    allMetricKeys.forEach(key => {
      const baselineValue = baseline.metrics[key] || 0;
      const targetValue = target.metrics[key] || 0;
      const change = targetValue - baselineValue;
      const changePercent = baselineValue !== 0 ? (change / baselineValue) * 100 : 0;
      
      metricChanges[key] = {
        baseline: baselineValue,
        target: targetValue,
        change,
        changePercent,
        significance: Math.abs(changePercent) > 20 ? 'high' : Math.abs(changePercent) > 10 ? 'medium' : 'low'
      };
    });
    
    const insights = this.generateComparisonInsights(baseline, target, scoreChange, metricChanges);
    const recommendations = this.generateComparisonRecommendations(scoreChange, metricChanges);
    
    return {
      baseline,
      target,
      differences: {
        scoreChange,
        scoreChangePercent,
        metricChanges,
        issueChanges: {
          new: Math.max(0, target.issues - baseline.issues),
          resolved: Math.max(0, baseline.issues - target.issues),
          persistent: Math.min(baseline.issues, target.issues)
        }
      },
      insights,
      recommendations
    };
  }

  // 生成对比洞察
  private generateComparisonInsights(
    baseline: TestHistoryRecord,
    target: TestHistoryRecord,
    scoreChange: number,
    metricChanges: Record<string, any>
  ): string[] {
    const insights: string[] = [];
    
    if (scoreChange > 10) {
      insights.push('整体性能有显著提升');
    } else if (scoreChange < -10) {
      insights.push('整体性能有所下降');
    } else {
      insights.push('整体性能保持稳定');
    }
    
    // 分析具体指标变化
    Object.entries(metricChanges).forEach(([metric, change]) => {
      if (change.significance === 'high') {
        if (change.changePercent > 0) {
          insights.push(`${metric}指标有显著改善`);
        } else {
          insights.push(`${metric}指标有显著下降`);
        }
      }
    });
    
    return insights;
  }

  // 生成对比建议
  private generateComparisonRecommendations(
    scoreChange: number,
    metricChanges: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];
    
    if (scoreChange < -5) {
      recommendations.push('建议分析性能下降的原因并制定改进计划');
    }
    
    Object.entries(metricChanges).forEach(([metric, change]) => {
      if (change.significance === 'high' && change.changePercent < -10) {
        recommendations.push(`重点关注${metric}指标的优化`);
      }
    });
    
    return recommendations;
  }

  // 计算聚合统计
  private calculateAggregatedStats(
    records: TestHistoryRecord[],
    startDate: Date,
    endDate: Date
  ): AggregatedStats {
    const totalTests = records.length;
    const averageScore = totalTests > 0 ? records.reduce((sum, r) => sum + r.score, 0) / totalTests : 0;
    
    // 评分分布
    const scoreDistribution = {
      'excellent (90-100)': records.filter(r => r.score >= 90).length,
      'good (70-89)': records.filter(r => r.score >= 70 && r.score < 90).length,
      'fair (50-69)': records.filter(r => r.score >= 50 && r.score < 70).length,
      'poor (0-49)': records.filter(r => r.score < 50).length
    };
    
    // 测试类型分布
    const testTypeDistribution = Object.values(TestType).reduce((acc, type) => {
      acc[type] = records.filter(r => r.type === type).length;
      return acc;
    }, {} as Record<TestType, number>);
    
    // 时间范围统计
    const timeRangeMs = endDate.getTime() - startDate.getTime();
    const days = timeRangeMs / (24 * 60 * 60 * 1000);
    
    return {
      timeRange: { start: startDate, end: endDate },
      overall: {
        totalTests,
        averageScore,
        scoreDistribution,
        testTypeDistribution
      },
      performance: {
        averageLoadTime: this.calculateAverageMetric(records, 'loadTime'),
        averageResponseTime: this.calculateAverageMetric(records, 'responseTime'),
        performanceTrend: this.calculateTrend(records, 'score')
      },
      quality: {
        averageIssues: totalTests > 0 ? records.reduce((sum, r) => sum + r.issues, 0) / totalTests : 0,
        criticalIssues: records.reduce((sum, r) => sum + (r.metadata?.criticalIssues || 0), 0),
        qualityTrend: this.calculateTrend(records, 'issues', true)
      },
      frequency: {
        testsPerDay: days > 0 ? totalTests / days : 0,
        testsPerWeek: days > 0 ? (totalTests / days) * 7 : 0,
        testsPerMonth: days > 0 ? (totalTests / days) * 30 : 0
      }
    };
  }

  // 分析记录生成洞察
  private analyzeRecords(records: TestHistoryRecord[]): Insight[] {
    const insights: Insight[] = [];
    
    if (records.length < 2) return insights;
    
    // 性能趋势分析
    const performanceTrend = this.calculateTrend(records, 'score');
    if (performanceTrend === 'improving') {
      insights.push({
        id: this.generateId(),
        type: InsightType.PERFORMANCE_IMPROVEMENT,
        title: '性能持续改善',
        description: '测试评分呈上升趋势，网站性能正在改善',
        severity: 'low',
        confidence: 0.8,
        data: { trend: performanceTrend },
        recommendations: ['继续保持当前的优化策略'],
        createdAt: new Date()
      });
    } else if (performanceTrend === 'declining') {
      insights.push({
        id: this.generateId(),
        type: InsightType.PERFORMANCE_REGRESSION,
        title: '性能下降趋势',
        description: '测试评分呈下降趋势，需要关注性能问题',
        severity: 'high',
        confidence: 0.8,
        data: { trend: performanceTrend },
        recommendations: ['分析性能下降原因', '制定性能优化计划'],
        createdAt: new Date()
      });
    }
    
    // 异常检测
    const anomalies = this.detectAnomalies(records);
    anomalies.forEach(anomaly => {
      insights.push({
        id: this.generateId(),
        type: InsightType.ANOMALY_DETECTED,
        title: '检测到异常数据',
        description: `在${anomaly.date}检测到异常的测试结果`,
        severity: 'medium',
        confidence: 0.7,
        data: anomaly,
        recommendations: ['检查该时间段的系统状态', '验证测试结果的准确性'],
        createdAt: new Date()
      });
    });
    
    return insights;
  }

  // 计算趋势
  private calculateTrend(records: TestHistoryRecord[], metric: string, lowerIsBetter: boolean = false): 'improving' | 'stable' | 'declining' {
    if (records.length < 3) return 'stable';
    
    const values = records.map(r => {
      if (metric === 'score') return r.score;
      if (metric === 'issues') return r.issues;
      return r.metrics[metric] || 0;
    });
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const threshold = firstAvg * 0.1; // 10%变化阈值
    
    if (lowerIsBetter) {
      if (change < -threshold) return 'improving';
      if (change > threshold) return 'declining';
    } else {
      if (change > threshold) return 'improving';
      if (change < -threshold) return 'declining';
    }
    
    return 'stable';
  }

  // 计算平均指标
  private calculateAverageMetric(records: TestHistoryRecord[], metric: string): number {
    const values = records
      .map(r => r.metrics[metric])
      .filter(v => typeof v === 'number');
    
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  // 检测异常
  private detectAnomalies(records: TestHistoryRecord[]): any[] {
    const anomalies: any[] = [];
    
    if (records.length < 5) return anomalies;
    
    const scores = records.map(r => r.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    records.forEach((record, index) => {
      const zScore = Math.abs((record.score - mean) / stdDev);
      if (zScore > 2) { // 2个标准差之外视为异常
        anomalies.push({
          index,
          date: record.timestamp.toISOString(),
          score: record.score,
          zScore,
          type: record.score > mean ? 'positive' : 'negative'
        });
      }
    });
    
    return anomalies;
  }

  // 计算URL相似度
  private calculateUrlSimilarity(url1: string, url2: string): number {
    // 简单的Jaccard相似度计算
    const tokens1 = new Set(url1.toLowerCase().split(/[\/\-\._]/));
    const tokens2 = new Set(url2.toLowerCase().split(/[\/\-\._]/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  // 转换为CSV格式
  private convertToCSV(records: TestHistoryRecord[]): string {
    const headers = ['ID', 'URL', 'Type', 'Score', 'Issues', 'Duration', 'Timestamp'];
    const rows = records.map(record => [
      record.id,
      record.url,
      record.type,
      record.score,
      record.issues,
      record.duration,
      record.timestamp.toISOString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // 缓存相关方法
  private getCacheKey(prefix: string, data: any): string {
    return `${prefix}-${JSON.stringify(data)}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private initializeCache(): void {
    // 定期清理过期缓存
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp >= this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTimeout);
  }

  private generateId(): string {
    return `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建默认测试历史管理器实例
export const completeTestHistoryManager = new CompleteTestHistoryManager();

export default CompleteTestHistoryManager;
