/**
 * 数据分析服务
 * 提供测试数据的统计分析功能
 */

import { format, subDays } from 'date-fns';

export interface TestRecord {
  id: string;
  testType: string;
  url?: string;
  status: 'completed' | 'failed' | 'running';
  overallScore?: number;
  startTime: string;
  endTime?: string;
  actualDuration?: number;
  results?: any;
  config?: any;
  scores?: any;
  recommendations?: string[];
  savedAt: string;
}

export interface AnalyticsData {
  totalTests: number;
  successRate: number;
  averageScore: number;
  testsByType: { [key: string]: number };
  testsByStatus: { [key: string]: number };
  dailyTests: Array<{ date: string; count: number; successCount: number }>;
  scoreDistribution: Array<{ range: string; count: number }>;
  performanceTrends: Array<{ date: string; avgScore: number; testCount: number }>;
  topUrls: Array<{ url: string; count: number; avgScore: number }>;
  recentActivity: TestRecord[];
}

export interface PerformanceAnalysis {
  coreWebVitals: {
    fcp: { average: number; trend: 'up' | 'down' | 'stable' };
    lcp: { average: number; trend: 'up' | 'down' | 'stable' };
    cls: { average: number; trend: 'up' | 'down' | 'stable' };
    tti: { average: number; trend: 'up' | 'down' | 'stable' };
  };
  performanceScores: Array<{ date: string; performance: number; seo: number; accessibility: number }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
  urlPerformance: Array<{
    url: string;
    avgScore: number;
    testCount: number;
    lastTested: string;
    trend: 'improving' | 'declining' | 'stable';
  }>;
}

export class DataAnalysisService {
  private baseUrl = 'http://localhost:3001/api';

  /**
   * 处理测试数据
   */
  async processTestData(testRecords: any[], dateRange: number = 30): Promise<AnalyticsData> {
    try {
      // 转换数据库字段到前端期望的字段
      const normalizedRecords = testRecords.map(record => ({
        id: record.id,
        testType: record.test_type || record.testType,
        url: record.url,
        status: record.status,
        overallScore: record.overall_score || record.overallScore,
        startTime: record.start_time || record.startTime,
        endTime: record.end_time || record.endTime,
        actualDuration: record.duration || record.actualDuration,
        results: record.results,
        config: record.config,
        scores: record.scores,
        recommendations: record.recommendations,
        savedAt: record.created_at || record.savedAt
      }));

      // 过滤指定时间范围内的数据
      const cutoffDate = subDays(new Date(), dateRange);
      const filteredRecords = normalizedRecords.filter(record =>
        new Date(record.startTime || record.savedAt) >= cutoffDate
      );

      return this.analyzeTestData(filteredRecords);
    } catch (error) {
      console.error('Error processing test data:', error);
      throw error;
    }
  }

  /**
   * 获取测试数据分析
   */
  async getAnalyticsData(dateRange: number = 30): Promise<AnalyticsData> {
    try {
      // 获取测试数据
      const response = await fetch(`${this.baseUrl}/test/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch test data');
      }

      // 处理API返回的数据结构
      const testRecords: TestRecord[] = data.data.tests || data.data || [];

      // 转换数据库字段到前端期望的字段
      const normalizedRecords = testRecords.map(record => {
        const dbRecord = record as any; // 类型断言以访问数据库字段
        return {
          id: record.id,
          testType: dbRecord.test_type || record.testType,
          url: record.url,
          status: record.status,
          overallScore: dbRecord.overall_score || record.overallScore,
          startTime: dbRecord.start_time || record.startTime,
          endTime: dbRecord.end_time || record.endTime,
          actualDuration: dbRecord.duration || record.actualDuration,
          results: record.results,
          config: record.config,
          scores: record.scores,
          recommendations: record.recommendations,
          savedAt: dbRecord.created_at || record.savedAt
        };
      });

      // 过滤指定时间范围内的数据
      const cutoffDate = subDays(new Date(), dateRange);
      const filteredRecords = normalizedRecords.filter(record =>
        new Date(record.startTime || record.savedAt) >= cutoffDate
      );

      return this.analyzeTestData(filteredRecords);
    } catch (error) {
      console.error('Failed to get analytics data:', error);
      throw error;
    }
  }

  /**
   * 分析测试数据
   */
  private analyzeTestData(records: TestRecord[]): AnalyticsData {
    const totalTests = records.length;
    const completedTests = records.filter(r => r.status === 'completed');
    const successRate = totalTests > 0 ? (completedTests.length / totalTests) * 100 : 0;

    // 计算平均分数
    const scoredTests = records.filter(r => r.overallScore !== undefined);
    const averageScore = scoredTests.length > 0
      ? scoredTests.reduce((sum, r) => sum + (r.overallScore || 0), 0) / scoredTests.length
      : 0;

    // 按类型统计
    const testsByType: { [key: string]: number } = {};
    records.forEach(record => {
      const type = record.testType || 'unknown';
      testsByType[type] = (testsByType[type] || 0) + 1;
    });

    // 按状态统计
    const testsByStatus: { [key: string]: number } = {};
    records.forEach(record => {
      const status = record.status || 'unknown';
      testsByStatus[status] = (testsByStatus[status] || 0) + 1;
    });

    // 每日测试统计
    const dailyTests = this.getDailyTestStats(records);

    // 分数分布
    const scoreDistribution = this.getScoreDistribution(records);

    // 性能趋势
    const performanceTrends = this.getPerformanceTrends(records);

    // 热门URL
    const topUrls = this.getTopUrls(records);

    // 最近活动
    const recentActivity = records
      .sort((a, b) => new Date(b.startTime || b.savedAt).getTime() - new Date(a.startTime || a.savedAt).getTime())
      .slice(0, 10);

    return {
      totalTests,
      successRate,
      averageScore,
      testsByType,
      testsByStatus,
      dailyTests,
      scoreDistribution,
      performanceTrends,
      topUrls,
      recentActivity
    };
  }

  /**
   * 获取每日测试统计
   */
  private getDailyTestStats(records: TestRecord[]): Array<{ date: string; count: number; successCount: number }> {
    const dailyStats: { [key: string]: { count: number; successCount: number } } = {};

    // 初始化最近30天的数据
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyStats[date] = { count: 0, successCount: 0 };
    }

    // 统计每日数据
    records.forEach(record => {
      const date = format(new Date(record.startTime || record.savedAt), 'yyyy-MM-dd');
      if (dailyStats[date]) {
        dailyStats[date].count++;
        if (record.status === 'completed') {
          dailyStats[date].successCount++;
        }
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      count: stats.count,
      successCount: stats.successCount
    }));
  }

  /**
   * 获取分数分布
   */
  private getScoreDistribution(records: TestRecord[]): Array<{ range: string; count: number }> {
    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    records.forEach(record => {
      if (record.overallScore !== undefined) {
        const score = record.overallScore;
        if (score <= 20) distribution['0-20']++;
        else if (score <= 40) distribution['21-40']++;
        else if (score <= 60) distribution['41-60']++;
        else if (score <= 80) distribution['61-80']++;
        else distribution['81-100']++;
      }
    });

    return Object.entries(distribution).map(([range, count]) => ({ range, count }));
  }

  /**
   * 获取性能趋势
   */
  private getPerformanceTrends(records: TestRecord[]): Array<{ date: string; avgScore: number; testCount: number }> {
    const trends: { [key: string]: { scores: number[]; count: number } } = {};

    // 初始化最近30天的数据
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      trends[date] = { scores: [], count: 0 };
    }

    // 收集每日分数数据
    records.forEach(record => {
      const date = format(new Date(record.startTime || record.savedAt), 'yyyy-MM-dd');
      if (trends[date] && record.overallScore !== undefined) {
        trends[date].scores.push(record.overallScore);
        trends[date].count++;
      }
    });

    return Object.entries(trends).map(([date, data]) => ({
      date,
      avgScore: data.scores.length > 0
        ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
        : 0,
      testCount: data.count
    }));
  }

  /**
   * 获取热门URL
   */
  private getTopUrls(records: TestRecord[]): Array<{ url: string; count: number; avgScore: number }> {
    const urlStats: { [key: string]: { count: number; scores: number[] } } = {};

    records.forEach(record => {
      if (record.url) {
        if (!urlStats[record.url]) {
          urlStats[record.url] = { count: 0, scores: [] };
        }
        urlStats[record.url].count++;
        if (record.overallScore !== undefined) {
          urlStats[record.url].scores.push(record.overallScore);
        }
      }
    });

    return Object.entries(urlStats)
      .map(([url, stats]) => ({
        url,
        count: stats.count,
        avgScore: stats.scores.length > 0
          ? stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length
          : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * 获取性能分析数据
   */
  async getPerformanceAnalysis(): Promise<PerformanceAnalysis> {
    try {
      const response = await fetch(`${this.baseUrl}/test-results?testType=website`);
      const data = await response.json();

      if (!data.success) {
        console.warn('Backend not available, using sample data');
        return this.generateSamplePerformanceData();
      }

      const websiteTests: TestRecord[] = data.data || [];

      // 如果没有网站测试数据，生成示例数据
      if (websiteTests.length === 0) {
        console.log('No website test data found, generating sample data');
        return this.generateSamplePerformanceData();
      }

      return this.analyzePerformanceData(websiteTests);
    } catch (error) {
      console.error('Failed to get performance analysis, using sample data:', error);
      return this.generateSamplePerformanceData();
    }
  }

  /**
   * 分析性能数据
   */
  private analyzePerformanceData(records: TestRecord[]): PerformanceAnalysis {
    // 模拟Core Web Vitals数据分析
    const coreWebVitals = {
      fcp: { average: 1.2, trend: 'stable' as 'up' | 'down' | 'stable' },
      lcp: { average: 2.1, trend: 'up' as 'up' | 'down' | 'stable' },
      cls: { average: 0.05, trend: 'stable' as 'up' | 'down' | 'stable' },
      tti: { average: 3.2, trend: 'down' as 'up' | 'down' | 'stable' }
    };

    // 性能分数趋势
    const performanceScores = this.getPerformanceScores(records);

    // 优化建议
    const recommendations = this.generateRecommendations(records);

    // URL性能分析
    const urlPerformance = this.analyzeUrlPerformance(records);

    return {
      coreWebVitals,
      performanceScores,
      recommendations,
      urlPerformance
    };
  }

  /**
   * 获取性能分数趋势
   */
  private getPerformanceScores(records: TestRecord[]): Array<{ date: string; performance: number; seo: number; accessibility: number }> {
    const scores: { [key: string]: { performance: number[]; seo: number[]; accessibility: number[] } } = {};

    // 初始化最近30天的数据
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      scores[date] = { performance: [], seo: [], accessibility: [] };
    }

    // 收集分数数据
    records.forEach(record => {
      const date = format(new Date(record.startTime || record.savedAt), 'yyyy-MM-dd');
      if (scores[date] && record.scores) {
        if (record.scores.performance) scores[date].performance.push(record.scores.performance);
        if (record.scores.seo) scores[date].seo.push(record.scores.seo);
        if (record.scores.accessibility) scores[date].accessibility.push(record.scores.accessibility);
      }
    });

    return Object.entries(scores).map(([date, data]) => ({
      date,
      performance: data.performance.length > 0
        ? data.performance.reduce((sum, score) => sum + score, 0) / data.performance.length
        : 0,
      seo: data.seo.length > 0
        ? data.seo.reduce((sum, score) => sum + score, 0) / data.seo.length
        : 0,
      accessibility: data.accessibility.length > 0
        ? data.accessibility.reduce((sum, score) => sum + score, 0) / data.accessibility.length
        : 0
    }));
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(records: TestRecord[]): Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }> {
    return [
      {
        category: '性能优化',
        priority: 'high',
        title: '优化图片加载',
        description: '使用现代图片格式(WebP)和懒加载技术',
        impact: '可提升LCP 20-30%'
      },
      {
        category: '性能优化',
        priority: 'medium',
        title: '启用Gzip压缩',
        description: '对文本资源启用Gzip或Brotli压缩',
        impact: '可减少传输大小 60-80%'
      },
      {
        category: 'SEO优化',
        priority: 'medium',
        title: '优化页面标题',
        description: '确保每个页面都有唯一且描述性的标题',
        impact: '提升搜索引擎排名'
      },
      {
        category: '可访问性',
        priority: 'low',
        title: '增加Alt文本',
        description: '为所有图片添加有意义的Alt属性',
        impact: '提升可访问性评分'
      }
    ];
  }

  /**
   * 分析URL性能
   */
  private analyzeUrlPerformance(records: TestRecord[]): Array<{
    url: string;
    avgScore: number;
    testCount: number;
    lastTested: string;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const urlStats: { [key: string]: { scores: number[]; dates: string[] } } = {};

    records.forEach(record => {
      if (record.url && record.overallScore !== undefined) {
        if (!urlStats[record.url]) {
          urlStats[record.url] = { scores: [], dates: [] };
        }
        urlStats[record.url].scores.push(record.overallScore);
        urlStats[record.url].dates.push(record.startTime || record.savedAt);
      }
    });

    return Object.entries(urlStats)
      .map(([url, stats]) => {
        const avgScore = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length;
        const lastTested = stats.dates.sort().pop() || '';

        // 简单的趋势分析
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (stats.scores.length >= 2) {
          const recent = stats.scores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, stats.scores.length);
          const earlier = stats.scores.slice(0, -3).reduce((sum, score) => sum + score, 0) / Math.max(1, stats.scores.length - 3);

          if (recent > earlier + 5) trend = 'improving';
          else if (recent < earlier - 5) trend = 'declining';
        }

        return {
          url,
          avgScore,
          testCount: stats.scores.length,
          lastTested,
          trend
        };
      })
      .sort((a, b) => b.testCount - a.testCount)
      .slice(0, 10);
  }

  /**
   * 生成示例性能数据
   */
  private generateSamplePerformanceData(): PerformanceAnalysis {
    // 生成示例Core Web Vitals数据
    const coreWebVitals = {
      fcp: { average: 1.2 + Math.random() * 0.5, trend: 'up' as 'up' | 'down' | 'stable' },
      lcp: { average: 2.1 + Math.random() * 0.8, trend: 'stable' as 'up' | 'down' | 'stable' },
      cls: { average: 0.05 + Math.random() * 0.1, trend: 'up' as 'up' | 'down' | 'stable' },
      tti: { average: 3.2 + Math.random() * 1.0, trend: 'down' as 'up' | 'down' | 'stable' }
    };

    // 生成示例性能分数趋势
    const performanceScores = [];
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      performanceScores.push({
        date,
        performance: 70 + Math.random() * 25,
        seo: 80 + Math.random() * 15,
        accessibility: 75 + Math.random() * 20
      });
    }

    // 生成示例优化建议
    const recommendations = [
      {
        category: '性能优化',
        priority: 'high' as const,
        title: '优化图片加载',
        description: '使用现代图片格式(WebP)和懒加载技术，减少首屏加载时间',
        impact: '可提升LCP 20-30%'
      },
      {
        category: '性能优化',
        priority: 'medium' as const,
        title: '启用Gzip压缩',
        description: '对文本资源启用Gzip或Brotli压缩，减少传输大小',
        impact: '可减少传输大小 60-80%'
      },
      {
        category: 'SEO优化',
        priority: 'medium' as const,
        title: '优化页面标题',
        description: '确保每个页面都有唯一且描述性的标题标签',
        impact: '提升搜索引擎排名'
      },
      {
        category: '可访问性',
        priority: 'low' as const,
        title: '增加Alt文本',
        description: '为所有图片添加有意义的Alt属性，提升可访问性',
        impact: '提升可访问性评分 10-15%'
      }
    ];

    // 生成示例URL性能数据
    const urlPerformance = [
      {
        url: 'https://example.com',
        avgScore: 85.2,
        testCount: 12,
        lastTested: new Date().toISOString(),
        trend: 'improving' as const
      },
      {
        url: 'https://example.com/about',
        avgScore: 78.5,
        testCount: 8,
        lastTested: new Date(Date.now() - 86400000).toISOString(),
        trend: 'stable' as const
      },
      {
        url: 'https://example.com/contact',
        avgScore: 72.1,
        testCount: 5,
        lastTested: new Date(Date.now() - 172800000).toISOString(),
        trend: 'declining' as const
      }
    ];

    return {
      coreWebVitals,
      performanceScores,
      recommendations,
      urlPerformance
    };
  }

  /**
   * 获取实时数据分析
   */
  async getRealTimeAnalysis(): Promise<any> {
    try {
      const response = await fetch('/api/data-management/stats');
      if (!response.ok) {
        throw new Error('获取实时数据失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取实时数据分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控数据分析
   */
  async getMonitoringAnalysis(): Promise<any> {
    try {
      const response = await fetch('/api/monitoring/stats');
      if (!response.ok) {
        throw new Error('获取监控数据失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取监控数据分析失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据备份
   */
  async createBackup(options: {
    includeTests?: boolean;
    includeLogs?: boolean;
    includeSettings?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch('/api/data-management/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('创建备份失败');
      }

      return await response.json();
    } catch (error) {
      console.error('创建数据备份失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupData(options: {
    olderThanDays: number;
    dataTypes?: string[];
  }): Promise<any> {
    try {
      const response = await fetch('/api/data-management/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error('数据清理失败');
      }

      return await response.json();
    } catch (error) {
      console.error('数据清理失败:', error);
      throw error;
    }
  }

  /**
   * 生成报告
   */
  async generateReport(config: {
    title: string;
    description?: string;
    format: 'html' | 'pdf' | 'excel' | 'json';
    template: 'summary' | 'detailed' | 'performance' | 'security' | 'monitoring';
    dateRange: {
      start: string;
      end: string;
    };
    filters?: any;
    includeCharts?: boolean;
    includeRawData?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('生成报告失败');
      }

      return await response.json();
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告任务列表
   */
  async getReportTasks(): Promise<any> {
    try {
      const response = await fetch('/api/reports/tasks');
      if (!response.ok) {
        throw new Error('获取报告任务失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取报告任务失败:', error);
      throw error;
    }
  }

  /**
   * 下载报告
   */
  async downloadReport(taskId: string): Promise<void> {
    try {
      const response = await fetch(`/api/reports/tasks/${taskId}/download`);
      if (!response.ok) {
        throw new Error('下载报告失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${taskId}.html`; // 默认文件名
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取认证头
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * 添加监控站点
   */
  async addMonitoringSite(config: {
    url: string;
    name?: string;
    interval?: number;
    timeout?: number;
    expectedStatus?: number;
    keywords?: string[];
    headers?: { [key: string]: string };
  }): Promise<any> {
    try {
      const response = await fetch('/api/monitoring/sites', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('添加监控站点失败');
      }

      return await response.json();
    } catch (error) {
      console.error('添加监控站点失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控站点列表
   */
  async getMonitoringSites(): Promise<any> {
    try {
      const response = await fetch('/api/monitoring/sites', {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('获取监控站点失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取监控站点失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控实时数据
   */
  async getMonitoringRealTimeData(): Promise<any> {
    try {
      const response = await fetch('/api/monitoring/realtime', {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('获取监控实时数据失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取监控实时数据失败:', error);
      throw error;
    }
  }
}

export const dataAnalysisService = new DataAnalysisService();
