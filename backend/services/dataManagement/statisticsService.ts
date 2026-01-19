/**
 * 统计分析服务
 * 专门处理数据统计和分析功能
 */

import * as winston from 'winston';

// 统计查询接口
export interface StatisticsQuery {
  userId?: string;
  timeRange?: number;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
  groupBy?: string[];
  aggregations?: string[];
}

// 测试历史统计接口
export interface TestHistoryStatistics {
  total: number;
  successful: number;
  failed: number;
  averageScore: number;
  averageDuration: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byDay: Array<{
    date: string;
    count: number;
    successRate: number;
    averageScore: number;
  }>;
  trends: {
    score: 'increasing' | 'decreasing' | 'stable';
    successRate: 'increasing' | 'decreasing' | 'stable';
    volume: 'increasing' | 'decreasing' | 'stable';
  };
}

// 用户活动统计接口
export interface UserActivityStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  averageTestsPerUser: number;
  topUsers: Array<{
    userId: string;
    username: string;
    testCount: number;
    averageScore: number;
  }>;
  activityByDay: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    totalTests: number;
  }>;
}

// 性能统计接口
export interface PerformanceStatistics {
  averageResponseTime: number;
  averagePageLoadTime: number;
  averageTestDuration: number;
  throughput: number;
  errorRate: number;
  availability: number;
  byEndpoint: Array<{
    endpoint: string;
    averageResponseTime: number;
    requestCount: number;
    errorRate: number;
  }>;
  trends: {
    responseTime: 'improving' | 'degrading' | 'stable';
    throughput: 'improving' | 'degrading' | 'stable';
    errorRate: 'improving' | 'degrading' | 'stable';
  };
}

// 系统使用统计接口
export interface SystemUsageStatistics {
  totalTests: number;
  totalReports: number;
  totalExports: number;
  totalImports: number;
  storageUsed: number;
  apiCalls: number;
  byModule: Record<string, number>;
  byFeature: Record<string, number>;
  growth: {
    tests: number;
    users: number;
    storage: number;
  };
}

// 统计报告接口
export interface StatisticsReport {
  id: string;
  type: string;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  data: {
    testHistory: TestHistoryStatistics;
    userActivity: UserActivityStatistics;
    performance: PerformanceStatistics;
    systemUsage: SystemUsageStatistics;
  };
  summary: {
    totalTests: number;
    successRate: number;
    averageScore: number;
    activeUsers: number;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

// 趋势分析接口
export interface TrendAnalysis {
  metric: string;
  period: number;
  data: Array<{
    date: string;
    value: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  prediction: Array<{
    date: string;
    value: number;
    confidence: number;
  }>;
}

// 统计配置接口
export interface StatisticsConfig {
  cacheEnabled: boolean;
  cacheTimeout: number;
  batchSize: number;
  maxRetries: number;
  loggingEnabled: boolean;
}

class StatisticsService {
  private logger: winston.Logger;
  private config: StatisticsConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: Partial<StatisticsConfig> = {}) {
    this.config = {
      cacheEnabled: true,
      cacheTimeout: 300000, // 5分钟
      batchSize: 1000,
      maxRetries: 3,
      loggingEnabled: true,
      ...config,
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: 'logs/statistics.log' }),
        new winston.transports.Console(),
      ],
    });
  }

  /**
   * 获取测试历史统计信息
   */
  async getTestHistoryStatistics(query: StatisticsQuery): Promise<TestHistoryStatistics> {
    const cacheKey = this.generateCacheKey('testHistory', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { query: dbQuery } = require('../../config/database');

      // 基础统计
      const baseQuery = this.buildBaseQuery(query);
      const [totalResult] = await dbQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(overall_score) as averageScore,
          AVG(duration) as averageDuration
        FROM test_history 
        ${baseQuery}
      `);

      // 按类型统计
      const typeResults = await dbQuery(`
        SELECT test_type, COUNT(*) as count
        FROM test_history 
        ${baseQuery}
        GROUP BY test_type
      `);

      // 按状态统计
      const statusResults = await dbQuery(`
        SELECT status, COUNT(*) as count
        FROM test_history 
        ${baseQuery}
        GROUP BY status
      `);

      // 按日期统计
      const dailyResults = await dbQuery(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 as successRate,
          AVG(overall_score) as averageScore
        FROM test_history 
        ${baseQuery}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `);

      // 趋势分析
      const trends = this.analyzeTrends(dailyResults);

      const statistics: TestHistoryStatistics = {
        total: totalResult.total || 0,
        successful: totalResult.successful || 0,
        failed: totalResult.failed || 0,
        averageScore: totalResult.averageScore || 0,
        averageDuration: totalResult.averageDuration || 0,
        byType: this.arrayToObject(typeResults, 'test_type', 'count'),
        byStatus: this.arrayToObject(statusResults, 'status', 'count'),
        byDay: dailyResults,
        trends,
      };

      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Failed to get test history statistics', { error, query });
      throw error;
    }
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivityStatistics(query: StatisticsQuery): Promise<UserActivityStatistics> {
    const cacheKey = this.generateCacheKey('userActivity', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { query: dbQuery } = require('../../config/database');

      // 基础用户统计
      const baseQuery = this.buildBaseQuery(query);
      const [userStats] = await dbQuery(`
        SELECT 
          COUNT(DISTINCT user_id) as totalUsers,
          COUNT(DISTINCT CASE WHEN last_login > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN user_id END) as activeUsers,
          COUNT(DISTINCT CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN user_id END) as newUsers,
          AVG(test_count) as averageTestsPerUser
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as test_count
          FROM test_history
          ${baseQuery}
          GROUP BY user_id
        ) t ON u.id = t.user_id
      `);

      // 顶级用户
      const topUsers = await dbQuery(`
        SELECT 
          u.id as userId,
          u.username,
          COUNT(t.id) as testCount,
          AVG(t.overall_score) as averageScore
        FROM users u
        JOIN test_history t ON u.id = t.user_id
        ${baseQuery}
        GROUP BY u.id, u.username
        ORDER BY testCount DESC
        LIMIT 10
      `);

      // 每日活动
      const dailyActivity = await dbQuery(`
        SELECT 
          DATE(t.created_at) as date,
          COUNT(DISTINCT t.user_id) as activeUsers,
          COUNT(DISTINCT CASE WHEN u.created_at = DATE(t.created_at) THEN u.id END) as newUsers,
          COUNT(t.id) as totalTests
        FROM test_history t
        LEFT JOIN users u ON t.user_id = u.id
        ${baseQuery}
        GROUP BY DATE(t.created_at)
        ORDER BY date DESC
        LIMIT 30
      `);

      const statistics: UserActivityStatistics = {
        totalUsers: userStats.totalUsers || 0,
        activeUsers: userStats.activeUsers || 0,
        newUsers: userStats.newUsers || 0,
        averageTestsPerUser: userStats.averageTestsPerUser || 0,
        topUsers,
        activityByDay: dailyActivity,
      };

      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Failed to get user activity statistics', { error, query });
      throw error;
    }
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStatistics(query: StatisticsQuery): Promise<PerformanceStatistics> {
    const cacheKey = this.generateCacheKey('performance', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { query: dbQuery } = require('../../config/database');

      // 基础性能统计
      const [perfStats] = await dbQuery(
        `
        SELECT 
          AVG(response_time) as averageResponseTime,
          AVG(page_load_time) as averagePageLoadTime,
          AVG(test_duration) as averageTestDuration,
          COUNT(*) / 3600 as throughput,
          COUNT(CASE WHEN status = 'error' THEN 1 END) / COUNT(*) * 100 as errorRate,
          COUNT(CASE WHEN status = 'success' THEN 1 END) / COUNT(*) * 100 as availability
        FROM performance_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
        [query.timeRange || 30]
      );

      // 按端点统计
      const endpointStats = await dbQuery(
        `
        SELECT 
          endpoint,
          AVG(response_time) as averageResponseTime,
          COUNT(*) as requestCount,
          COUNT(CASE WHEN status = 'error' THEN 1 END) / COUNT(*) * 100 as errorRate
        FROM performance_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY endpoint
        ORDER BY requestCount DESC
      `,
        [query.timeRange || 30]
      );

      // 趋势分析
      const trends = this.analyzePerformanceTrends(query.timeRange || 30);

      const statistics: PerformanceStatistics = {
        averageResponseTime: perfStats.averageResponseTime || 0,
        averagePageLoadTime: perfStats.averagePageLoadTime || 0,
        averageTestDuration: perfStats.averageTestDuration || 0,
        throughput: perfStats.throughput || 0,
        errorRate: perfStats.errorRate || 0,
        availability: perfStats.availability || 0,
        byEndpoint: endpointStats,
        trends,
      };

      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Failed to get performance statistics', { error, query });
      throw error;
    }
  }

  /**
   * 获取系统使用统计
   */
  async getSystemUsageStatistics(query: StatisticsQuery): Promise<SystemUsageStatistics> {
    const cacheKey = this.generateCacheKey('systemUsage', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { query: dbQuery } = require('../../config/database');

      // 基础使用统计
      const [usageStats] = await dbQuery(
        `
        SELECT 
          (SELECT COUNT(*) FROM test_history WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as totalTests,
          (SELECT COUNT(*) FROM reports WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as totalReports,
          (SELECT COUNT(*) FROM export_tasks WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as totalExports,
          (SELECT COUNT(*) FROM import_tasks WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as totalImports,
          (SELECT SUM(file_size) FROM file_storage WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as storageUsed,
          (SELECT COUNT(*) FROM api_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) as apiCalls
      `,
        [
          query.timeRange || 30,
          query.timeRange || 30,
          query.timeRange || 30,
          query.timeRange || 30,
          query.timeRange || 30,
          query.timeRange || 30,
        ]
      );

      // 按模块统计
      const moduleStats = await dbQuery(
        `
        SELECT 
          module,
          COUNT(*) as count
        FROM usage_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY module
      `,
        [query.timeRange || 30]
      );

      // 按功能统计
      const featureStats = await dbQuery(
        `
        SELECT 
          feature,
          COUNT(*) as count
        FROM usage_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY feature
      `,
        [query.timeRange || 30]
      );

      // 增长统计
      const growth = await this.calculateGrowth(query.timeRange || 30);

      const statistics: SystemUsageStatistics = {
        totalTests: usageStats.totalTests || 0,
        totalReports: usageStats.totalReports || 0,
        totalExports: usageStats.totalExports || 0,
        totalImports: usageStats.totalImports || 0,
        storageUsed: usageStats.storageUsed || 0,
        apiCalls: usageStats.apiCalls || 0,
        byModule: this.arrayToObject(moduleStats, 'module', 'count'),
        byFeature: this.arrayToObject(featureStats, 'feature', 'count'),
        growth,
      };

      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Failed to get system usage statistics', { error, query });
      throw error;
    }
  }

  /**
   * 生成统计报告
   */
  async generateReport(query: StatisticsQuery): Promise<StatisticsReport> {
    try {
      const [testHistory, userActivity, performance, systemUsage] = await Promise.all([
        this.getTestHistoryStatistics(query),
        this.getUserActivityStatistics(query),
        this.getPerformanceStatistics(query),
        this.getSystemUsageStatistics(query),
      ]);

      const summary = {
        totalTests: testHistory.total,
        successRate: testHistory.total > 0 ? (testHistory.successful / testHistory.total) * 100 : 0,
        averageScore: testHistory.averageScore,
        activeUsers: userActivity.activeUsers,
        systemHealth: this.calculateSystemHealth(performance, systemUsage),
      };

      const report: StatisticsReport = {
        id: this.generateReportId(),
        type: 'comprehensive',
        period: {
          start:
            query.startDate || new Date(Date.now() - (query.timeRange || 30) * 24 * 60 * 60 * 1000),
          end: query.endDate || new Date(),
        },
        generatedAt: new Date(),
        data: {
          testHistory,
          userActivity,
          performance,
          systemUsage,
        },
        summary,
      };

      this.logger.info('Statistics report generated', { reportId: report.id });
      return report;
    } catch (error) {
      this.logger.error('Failed to generate statistics report', { error, query });
      throw error;
    }
  }

  /**
   * 趋势分析
   */
  async analyzeTrends(metric: string, period: number = 30): Promise<TrendAnalysis> {
    try {
      const { query: dbQuery } = require('../../config/database');

      const data = await dbQuery(
        `
        SELECT 
          DATE(created_at) as date,
          AVG(${metric}) as value
        FROM test_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        [period]
      );

      const trend = this.calculateTrend(data);
      const prediction = this.generatePrediction(data, 7);

      return {
        metric,
        period,
        data,
        trend: trend.direction,
        changeRate: trend.changeRate,
        prediction,
      };
    } catch (error) {
      this.logger.error('Failed to analyze trends', { error, metric, period });
      throw error;
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Statistics cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const now = Date.now();
    let hits = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      hitRate: hits / (hits + this.cache.size),
      oldestEntry: oldestTimestamp < now ? new Date(oldestTimestamp) : undefined,
      newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : undefined,
    };
  }

  /**
   * 构建基础查询条件
   */
  private buildBaseQuery(query: StatisticsQuery): string {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.userId) {
      conditions.push('user_id = ?');
      params.push(query.userId);
    }

    if (query.startDate) {
      conditions.push('created_at >= ?');
      params.push(query.startDate);
    }

    if (query.endDate) {
      conditions.push('created_at <= ?');
      params.push(query.endDate);
    }

    if (query.timeRange) {
      conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
      params.push(query.timeRange);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(data: any[]): TestHistoryStatistics['trends'] {
    if (data.length < 2) {
      return {
        score: 'stable',
        successRate: 'stable',
        volume: 'stable',
      };
    }

    const scoreTrend = this.calculateTrend(data.map(d => d.averageScore));
    const successRateTrend = this.calculateTrend(data.map(d => d.successRate));
    const volumeTrend = this.calculateTrend(data.map(d => d.count));

    return {
      score: scoreTrend.direction,
      successRate: successRateTrend.direction,
      volume: volumeTrend.direction,
    };
  }

  /**
   * 分析性能趋势
   */
  private analyzePerformanceTrends(period: number): PerformanceStatistics['trends'] {
    // 简化实现，实际应该从性能日志中分析
    return {
      responseTime: 'stable',
      throughput: 'stable',
      errorRate: 'stable',
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrend(data: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    changeRate: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', changeRate: 0 };
    }

    const first = data[0];
    const last = data[data.length - 1];
    const changeRate = first !== 0 ? ((last - first) / first) * 100 : 0;

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (changeRate > 5) {
      direction = 'increasing';
    } else if (changeRate < -5) {
      direction = 'decreasing';
    } else {
      direction = 'stable';
    }

    return { direction, changeRate };
  }

  /**
   * 计算增长
   */
  private async calculateGrowth(period: number): Promise<SystemUsageStatistics['growth']> {
    try {
      const { query: dbQuery } = require('../../config/database');

      const [currentPeriod] = await dbQuery(
        `
        SELECT 
          COUNT(*) as tests,
          COUNT(DISTINCT user_id) as users,
          COALESCE(SUM(file_size), 0) as storage
        FROM test_history t
        LEFT JOIN file_storage f ON DATE(f.created_at) = DATE(t.created_at)
        WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
        [period]
      );

      const [previousPeriod] = await dbQuery(
        `
        SELECT 
          COUNT(*) as tests,
          COUNT(DISTINCT user_id) as users,
          COALESCE(SUM(file_size), 0) as storage
        FROM test_history t
        LEFT JOIN file_storage f ON DATE(f.created_at) = DATE(t.created_at)
        WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND t.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
        [period * 2, period]
      );

      return {
        tests: this.calculateGrowthRate(previousPeriod.tests, currentPeriod.tests),
        users: this.calculateGrowthRate(previousPeriod.users, currentPeriod.users),
        storage: this.calculateGrowthRate(previousPeriod.storage, currentPeriod.storage),
      };
    } catch (error) {
      return { tests: 0, users: 0, storage: 0 };
    }
  }

  /**
   * 计算增长率
   */
  private calculateGrowthRate(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * 计算系统健康状态
   */
  private calculateSystemHealth(
    performance: PerformanceStatistics,
    usage: SystemUsageStatistics
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 0;

    // 性能评分 (40%)
    if (performance.availability > 99) score += 40;
    else if (performance.availability > 95) score += 30;
    else if (performance.availability > 90) score += 20;
    else score += 10;

    // 错误率评分 (30%)
    if (performance.errorRate < 1) score += 30;
    else if (performance.errorRate < 5) score += 20;
    else if (performance.errorRate < 10) score += 10;

    // 响应时间评分 (30%)
    if (performance.averageResponseTime < 200) score += 30;
    else if (performance.averageResponseTime < 500) score += 20;
    else if (performance.averageResponseTime < 1000) score += 10;

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * 生成预测
   */
  private generatePrediction(data: any[], days: number): TrendAnalysis['prediction'] {
    // 简化的线性预测
    if (data.length < 2) {
      return [];
    }

    const values = data.map(d => d.value);
    const trend = this.calculateLinearTrend(values);

    const prediction = [];
    const lastDate = new Date(data[data.length - 1].date);

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedValue = trend.slope * (data.length + i) + trend.intercept;

      prediction.push({
        date: futureDate.toISOString().split('T')[0],
        value: Math.max(0, predictedValue),
        confidence: 0.7, // 简化的置信度
      });
    }

    return prediction;
  }

  /**
   * 计算线性趋势
   */
  private calculateLinearTrend(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0 };

    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * 数组转对象
   */
  private arrayToObject(
    array: any[],
    keyField: string,
    valueField: string
  ): Record<string, number> {
    const result: Record<string, number> = {};
    array.forEach(item => {
      result[item[keyField]] = item[valueField];
    });
    return result;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, query: StatisticsQuery): string {
    return `${type}_${JSON.stringify(query)}`;
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): any {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 生成报告ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default StatisticsService;
