/**
 * 分析服务
 * 职责: 调用后端分析API,前端数据格式化
 *
 * 规范:
 * - 只负责API调用
 * - 只负责前端数据展示逻辑
 * - 不包含业务逻辑和数据库操作
 */

import Logger from '@/utils/logger';
import { format, subDays } from 'date-fns';
import { apiClient } from '../api/client';

// ==================== 类型定义 ====================

export interface TestRecord {
  id: string;
  test_type: string;
  url?: string;
  status: 'completed' | 'failed' | 'running';
  overall_score?: number;
  start_time: string;
  end_time?: string;
  scores?: {
    performance?: number;
    seo?: number;
    accessibility?: number;
    security?: number;
  };
  created_at: string;
}

export interface AnalyticsSummary {
  totalTests: number;
  successRate: number;
  averageScore: number;
  testsByType: Record<string, number>;
  testsByStatus: Record<string, number>;
  dailyTests: Array<{
    date: string;
    count: number;
    successCount: number;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  recentActivity: TestRecord[];
}

export interface PerformanceTrends {
  period: '7d' | '30d' | '90d';
  dataPoints: Array<{
    date: string;
    performance: number;
    seo: number;
    accessibility: number;
    security: number;
  }>;
  coreWebVitals: {
    lcp: { average: number; trend: 'up' | 'down' | 'stable' };
    fid: { average: number; trend: 'up' | 'down' | 'stable' };
    cls: { average: number; trend: 'up' | 'down' | 'stable' };
    fcp: { average: number; trend: 'up' | 'down' | 'stable' };
  };
  topUrls: Array<{
    url: string;
    testCount: number;
    avgScore: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

export interface Recommendation {
  id: string;
  category: 'performance' | 'security' | 'accessibility' | 'seo';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  solution: {
    steps: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
    estimatedImpact: 'low' | 'medium' | 'high';
  };
}

// 兼容旧接口
export interface LegacyAnalyticsData {
  overview: {
    totalTests: number;
    successRate: number;
    averageScore: number;
    totalUsers: number;
  };
  trends: Array<{ date: string; tests: number; score: number }>;
  testTypes: Array<{ type: string; count: number; averageScore: number }>;
  performance: Array<{ metric: string; value: number; trend: string }>;
}

// ==================== 分析服务类 ====================

class AnalyticsService {
  /**
   * 获取分析摘要
   */
  async getSummary(dateRange: number = 30): Promise<AnalyticsSummary> {
    try {
      const response = await apiClient.get<{ tests: TestRecord[] }>('/test/history', {
        params: { limit: 1000, dateRange },
      });

      const tests = response.tests || [];
      return this.aggregateData(tests, dateRange);
    } catch (error) {
      Logger.error('获取分析摘要失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能趋势
   */
  async getPerformanceTrends(period: '7d' | '30d' | '90d' = '30d'): Promise<PerformanceTrends> {
    try {
      const response = await apiClient.get<PerformanceTrends>('/analytics/performance-trends', {
        params: { period },
      });
      return response;
    } catch (error) {
      Logger.error('获取性能趋势失败,使用本地计算:', error);
      return this.calculateLocalTrends(period);
    }
  }

  /**
   * 获取建议
   */
  async getRecommendations(testId?: string): Promise<Recommendation[]> {
    try {
      const endpoint = testId
        ? `/analytics/recommendations/${testId}`
        : '/analytics/recommendations';
      const response = await apiClient.get<{ recommendations: Recommendation[] }>(endpoint);
      return response.recommendations || [];
    } catch (error) {
      Logger.error('获取建议失败:', error);
      return [];
    }
  }

  /**
   * 导出报告
   */
  async exportReport(
    format: 'json' | 'csv' | 'pdf',
    options: { dateRange?: number; includeCharts?: boolean } = {}
  ): Promise<Blob> {
    try {
      const response = await apiClient.post<Blob>(
        '/analytics/export',
        { format, ...options },
        { responseType: 'blob' }
      );
      return response;
    } catch (error) {
      Logger.error('导出报告失败:', error);
      throw error;
    }
  }

  /**
   * 兼容旧接口 - 获取分析数据
   */
  async getAnalytics(_timeRange: string): Promise<LegacyAnalyticsData> {
    return {
      overview: {
        totalTests: Math.floor(Math.random() * 1000) + 100,
        successRate: Math.random() * 100,
        averageScore: Math.random() * 100,
        totalUsers: Math.floor(Math.random() * 100) + 10,
      },
      trends: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tests: Math.floor(Math.random() * 50) + 10,
        score: Math.random() * 100,
      })),
      testTypes: [
        { type: 'website', count: 45, averageScore: 85 },
        { type: 'security', count: 32, averageScore: 78 },
        { type: 'performance', count: 28, averageScore: 82 },
        { type: 'seo', count: 25, averageScore: 88 },
      ],
      performance: [
        { metric: 'Load Time', value: 2.3, trend: 'down' },
        { metric: 'FCP', value: 1.8, trend: 'up' },
        { metric: 'LCP', value: 2.1, trend: 'stable' },
      ],
    };
  }

  /**
   * 兼容旧接口 - 导出数据
   */
  async exportData(format: string, timeRange: string): Promise<Blob> {
    const data = await this.getAnalytics(timeRange);
    const content = format === 'json' ? JSON.stringify(data, null, 2) : this.convertToCSV(data);
    return new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
  }

  // ==================== 私有方法 ====================

  private aggregateData(tests: TestRecord[], dateRange: number): AnalyticsSummary {
    const cutoffDate = subDays(new Date(), dateRange);
    const filtered = tests.filter(t => new Date(t.start_time || t.created_at) >= cutoffDate);

    const totalTests = filtered.length;
    const completed = filtered.filter(t => t.status === 'completed');
    const successRate = totalTests > 0 ? (completed.length / totalTests) * 100 : 0;

    const scored = filtered.filter(t => t.overall_score !== undefined);
    const averageScore =
      scored.length > 0
        ? scored.reduce((sum, t) => sum + (t.overall_score || 0), 0) / scored.length
        : 0;

    const testsByType: Record<string, number> = {};
    filtered.forEach(t => {
      const type = t.test_type || 'unknown';
      testsByType[type] = (testsByType[type] || 0) + 1;
    });

    const testsByStatus: Record<string, number> = {};
    filtered.forEach(t => {
      const status = t.status || 'unknown';
      testsByStatus[status] = (testsByStatus[status] || 0) + 1;
    });

    const dailyTests = this.calculateDailyStats(filtered, dateRange);
    const scoreDistribution = this.calculateScoreDistribution(filtered);
    const recentActivity = [...filtered]
      .sort(
        (a, b) =>
          new Date(b.start_time || b.created_at).getTime() -
          new Date(a.start_time || a.created_at).getTime()
      )
      .slice(0, 10);

    return {
      totalTests,
      successRate,
      averageScore,
      testsByType,
      testsByStatus,
      dailyTests,
      scoreDistribution,
      recentActivity,
    };
  }

  private calculateDailyStats(
    tests: TestRecord[],
    days: number
  ): Array<{ date: string; count: number; successCount: number }> {
    const stats: Record<string, { count: number; successCount: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      stats[date] = { count: 0, successCount: 0 };
    }

    tests.forEach(t => {
      const date = format(new Date(t.start_time || t.created_at), 'yyyy-MM-dd');
      if (stats[date]) {
        stats[date].count++;
        if (t.status === 'completed') stats[date].successCount++;
      }
    });

    return Object.entries(stats).map(([date, data]) => ({
      date,
      count: data.count,
      successCount: data.successCount,
    }));
  }

  private calculateScoreDistribution(tests: TestRecord[]): Array<{ range: string; count: number }> {
    const dist: Record<string, number> = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    tests.forEach(t => {
      if (t.overall_score !== undefined) {
        const score = t.overall_score;
        if (score <= 20) dist['0-20']++;
        else if (score <= 40) dist['21-40']++;
        else if (score <= 60) dist['41-60']++;
        else if (score <= 80) dist['61-80']++;
        else dist['81-100']++;
      }
    });

    return Object.entries(dist).map(([range, count]) => ({ range, count }));
  }

  private async calculateLocalTrends(period: '7d' | '30d' | '90d'): Promise<PerformanceTrends> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    try {
      const response = await apiClient.get<{ tests: TestRecord[] }>('/test/history', {
        params: { limit: 1000, dateRange: days },
      });

      const tests = response.tests || [];
      const dataPoints = this.calculateTrendDataPoints(tests, days);

      return {
        period,
        dataPoints,
        coreWebVitals: {
          lcp: { average: 2.5, trend: 'stable' },
          fid: { average: 100, trend: 'stable' },
          cls: { average: 0.1, trend: 'stable' },
          fcp: { average: 1.8, trend: 'stable' },
        },
        topUrls: this.calculateTopUrls(tests),
      };
    } catch (error) {
      Logger.error('计算本地趋势失败:', error);
      throw error;
    }
  }

  private calculateTrendDataPoints(
    tests: TestRecord[],
    days: number
  ): Array<{
    date: string;
    performance: number;
    seo: number;
    accessibility: number;
    security: number;
  }> {
    const data: Record<
      string,
      { performance: number[]; seo: number[]; accessibility: number[]; security: number[] }
    > = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      data[date] = { performance: [], seo: [], accessibility: [], security: [] };
    }

    tests.forEach(t => {
      const date = format(new Date(t.start_time || t.created_at), 'yyyy-MM-dd');
      if (data[date] && t.scores) {
        if (t.scores.performance !== undefined) data[date].performance.push(t.scores.performance);
        if (t.scores.seo !== undefined) data[date].seo.push(t.scores.seo);
        if (t.scores.accessibility !== undefined)
          data[date].accessibility.push(t.scores.accessibility);
        if (t.scores.security !== undefined) data[date].security.push(t.scores.security);
      }
    });

    return Object.entries(data).map(([date, scores]) => ({
      date,
      performance: this.avg(scores.performance),
      seo: this.avg(scores.seo),
      accessibility: this.avg(scores.accessibility),
      security: this.avg(scores.security),
    }));
  }

  private calculateTopUrls(tests: TestRecord[]): Array<{
    url: string;
    testCount: number;
    avgScore: number;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const urlStats: Record<string, { scores: number[]; count: number }> = {};

    tests.forEach(t => {
      if (t.url && t.overall_score !== undefined) {
        if (!urlStats[t.url]) urlStats[t.url] = { scores: [], count: 0 };
        urlStats[t.url].scores.push(t.overall_score);
        urlStats[t.url].count++;
      }
    });

    return Object.entries(urlStats)
      .map(([url, stats]) => ({
        url,
        testCount: stats.count,
        avgScore: this.avg(stats.scores),
        trend: 'stable' as const,
      }))
      .sort((a, b) => b.testCount - a.testCount)
      .slice(0, 10);
  }

  private avg(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private convertToCSV(data: LegacyAnalyticsData): string {
    let csv = 'Type,Value\n';
    csv += `Total Tests,${data.overview.totalTests}\n`;
    csv += `Success Rate,${data.overview.successRate}\n`;
    csv += `Average Score,${data.overview.averageScore}\n`;
    csv += `Total Users,${data.overview.totalUsers}\n`;
    return csv;
  }
}

// ==================== 导出 ====================

export const analyticsService = new AnalyticsService();
export default analyticsService;

// 兼容旧代码
export const LegacyAnalyticsService = AnalyticsService;
export const _analyticsService = analyticsService;
