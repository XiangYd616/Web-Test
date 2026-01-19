/**
 * 统计分析服务
 * 专门处理数据统计和分析功能
 */

import * as winston from 'winston';
import { query as dbQuery } from '../../config/database';

// 统计查询接口
export interface StatisticsQuery {
  userId?: string;
  timeRange?: number;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, unknown>;
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
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();

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
    const cached = this.getFromCache<TestHistoryStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 基础统计
      const { clause, params } = this.buildBaseFilter(query, 'te');
      const whereClause = clause ? `WHERE ${clause}` : '';

      const totalResult = await dbQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE te.status = 'completed')::int AS successful,
           COUNT(*) FILTER (WHERE te.status = 'failed')::int AS failed,
           COALESCE(AVG(tr.score), 0)::float AS average_score,
           COALESCE(AVG(te.execution_time), 0)::float AS average_duration
         FROM test_executions te
         LEFT JOIN test_results tr ON tr.execution_id = te.id
         ${whereClause}`,
        params
      );

      // 按类型统计
      const typeResults = await dbQuery(
        `SELECT te.engine_type AS test_type, COUNT(*)::int AS count
         FROM test_executions te
         ${whereClause}
         GROUP BY te.engine_type`,
        params
      );

      // 按状态统计
      const statusResults = await dbQuery(
        `SELECT te.status AS status, COUNT(*)::int AS count
         FROM test_executions te
         ${whereClause}
         GROUP BY te.status`,
        params
      );

      // 按日期统计
      const dailyResults = await dbQuery(
        `SELECT
           DATE(te.created_at) AS date,
           COUNT(*)::int AS count,
           AVG(CASE WHEN te.status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 AS success_rate,
           COALESCE(AVG(tr.score), 0)::float AS average_score
         FROM test_executions te
         LEFT JOIN test_results tr ON tr.execution_id = te.id
         ${whereClause}
         GROUP BY DATE(te.created_at)
         ORDER BY date DESC
         LIMIT 30`,
        params
      );

      const byDay = (dailyResults.rows || []).map(row => ({
        date: String(row.date),
        count: Number(row.count) || 0,
        successRate: Number(row.success_rate) || 0,
        averageScore: Number(row.average_score) || 0,
      }));

      // 趋势分析
      const trends = this.analyzeTestHistoryTrends(byDay);

      const statistics: TestHistoryStatistics = {
        total: Number(totalResult.rows[0]?.total) || 0,
        successful: Number(totalResult.rows[0]?.successful) || 0,
        failed: Number(totalResult.rows[0]?.failed) || 0,
        averageScore: Number(totalResult.rows[0]?.average_score) || 0,
        averageDuration: Number(totalResult.rows[0]?.average_duration) || 0,
        byType: this.arrayToObject(typeResults, 'test_type', 'count'),
        byStatus: this.arrayToObject(statusResults, 'status', 'count'),
        byDay,
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
    const cached = this.getFromCache<UserActivityStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const userParams: unknown[] = [];
      const userConditions: string[] = [];
      if (query.userId) {
        userParams.push(query.userId);
        userConditions.push(`u.id = $${userParams.length}`);
      }
      const userClause = userConditions.length > 0 ? `WHERE ${userConditions.join(' AND ')}` : '';

      const rangeDays = query.timeRange || 30;
      const activeCondition = this.buildDateRangeCondition(
        'u.last_login',
        query,
        userParams,
        rangeDays
      );
      const newUserCondition = this.buildDateRangeCondition(
        'u.created_at',
        query,
        userParams,
        rangeDays
      );

      const activeClause = activeCondition ? `AND ${activeCondition}` : '';
      const newUserClause = newUserCondition ? `AND ${newUserCondition}` : '';

      const userStats = await dbQuery(
        `SELECT
           COUNT(*)::int AS total_users,
           COUNT(*) FILTER (WHERE TRUE ${activeClause})::int AS active_users,
           COUNT(*) FILTER (WHERE TRUE ${newUserClause})::int AS new_users
         FROM users u
         ${userClause}`,
        userParams
      );

      const { clause, params } = this.buildBaseFilter(query, 'te');
      const whereClause = clause ? `WHERE ${clause}` : '';

      const testsPerUser = await dbQuery(
        `SELECT te.user_id, COUNT(*)::int AS test_count
         FROM test_executions te
         ${whereClause}
         GROUP BY te.user_id`,
        params
      );

      const averageTestsPerUser =
        testsPerUser.rows.length > 0
          ? testsPerUser.rows.reduce((sum, row) => sum + Number(row.test_count || 0), 0) /
            testsPerUser.rows.length
          : 0;

      // 顶级用户
      const topUsers = await dbQuery(
        `SELECT
           te.user_id AS userId,
           u.username,
           COUNT(*)::int AS testCount,
           COALESCE(AVG(tr.score), 0)::float AS averageScore
         FROM test_executions te
         JOIN users u ON u.id = te.user_id
         LEFT JOIN test_results tr ON tr.execution_id = te.id
         ${whereClause}
         GROUP BY te.user_id, u.username
         ORDER BY testCount DESC
         LIMIT 10`,
        params
      );

      // 每日活动
      const dailyActivity = await dbQuery(
        `SELECT
           DATE(te.created_at) AS date,
           COUNT(DISTINCT te.user_id)::int AS active_users,
           COUNT(DISTINCT CASE WHEN DATE(u.created_at) = DATE(te.created_at) THEN u.id END)::int AS new_users,
           COUNT(*)::int AS total_tests
         FROM test_executions te
         LEFT JOIN users u ON te.user_id = u.id
         ${whereClause}
         GROUP BY DATE(te.created_at)
         ORDER BY date DESC
         LIMIT 30`,
        params
      );

      const statistics: UserActivityStatistics = {
        totalUsers: Number(userStats.rows[0]?.total_users) || 0,
        activeUsers: Number(userStats.rows[0]?.active_users) || 0,
        newUsers: Number(userStats.rows[0]?.new_users) || 0,
        averageTestsPerUser,
        topUsers: (topUsers.rows || []).map(row => ({
          userId: String(row.userid ?? row.userId),
          username: String(row.username ?? ''),
          testCount: Number(row.testcount ?? row.testCount) || 0,
          averageScore: Number(row.averagescore ?? row.averageScore) || 0,
        })),
        activityByDay: (dailyActivity.rows || []).map(row => ({
          date: String(row.date),
          activeUsers: Number(row.active_users) || 0,
          newUsers: Number(row.new_users) || 0,
          totalTests: Number(row.total_tests) || 0,
        })),
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
    const cached = this.getFromCache<PerformanceStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { clause, params } = this.buildBaseFilter(query, 'te');
      const whereClause = clause ? `WHERE ${clause}` : '';

      const metricValueExpr = this.buildMetricValueExpression('tm.metric_value');

      const perfStats = await dbQuery(
        `SELECT
           AVG(CASE WHEN tm.metric_name IN ('averageResponseTime', 'responseTime') THEN ${metricValueExpr} END)::float AS average_response_time,
           AVG(CASE WHEN tm.metric_name IN ('pageLoadTime', 'averagePageLoadTime') THEN ${metricValueExpr} END)::float AS average_page_load_time,
           AVG(CASE WHEN tm.metric_name IN ('testDuration', 'averageTestDuration', 'duration') THEN ${metricValueExpr} END)::float AS average_test_duration,
           AVG(CASE WHEN tm.metric_name IN ('throughput') THEN ${metricValueExpr} END)::float AS throughput,
           AVG(CASE WHEN tm.metric_name IN ('errorRate') THEN ${metricValueExpr} END)::float AS error_rate,
           AVG(CASE WHEN tm.metric_name IN ('availability') THEN ${metricValueExpr} END)::float AS availability
         FROM test_metrics tm
         JOIN test_results tr ON tr.id = tm.result_id
         JOIN test_executions te ON te.id = tr.execution_id
         ${whereClause}`,
        params
      );

      const endpointStats = await dbQuery(
        `SELECT
           tm.metric_name AS endpoint,
           AVG(${metricValueExpr})::float AS average_response_time,
           COUNT(*)::int AS request_count,
           AVG(CASE WHEN tm.passed = false THEN 1 ELSE 0 END) * 100 AS error_rate
         FROM test_metrics tm
         JOIN test_results tr ON tr.id = tm.result_id
         JOIN test_executions te ON te.id = tr.execution_id
         ${whereClause ? `${whereClause} AND tm.metric_type = 'endpoint'` : "WHERE tm.metric_type = 'endpoint'"}
         GROUP BY tm.metric_name
         ORDER BY request_count DESC
         LIMIT 20`,
        params
      );

      const trends = await this.analyzePerformanceTrends(query);

      const statistics: PerformanceStatistics = {
        averageResponseTime: Number(perfStats.rows[0]?.average_response_time) || 0,
        averagePageLoadTime: Number(perfStats.rows[0]?.average_page_load_time) || 0,
        averageTestDuration: Number(perfStats.rows[0]?.average_test_duration) || 0,
        throughput: Number(perfStats.rows[0]?.throughput) || 0,
        errorRate: Number(perfStats.rows[0]?.error_rate) || 0,
        availability: Number(perfStats.rows[0]?.availability) || 0,
        byEndpoint: (endpointStats.rows || []).map(row => ({
          endpoint: String(row.endpoint),
          averageResponseTime: Number(row.average_response_time) || 0,
          requestCount: Number(row.request_count) || 0,
          errorRate: Number(row.error_rate) || 0,
        })),
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
    const cached = this.getFromCache<SystemUsageStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { clause, params } = this.buildBaseFilter(query, 'te');
      const whereClause = clause ? `WHERE ${clause}` : '';

      const usageStats = await dbQuery(
        `SELECT
           (SELECT COUNT(*) FROM test_executions te ${whereClause})::int AS total_tests,
           (SELECT COUNT(*) FROM test_reports tr
             LEFT JOIN test_executions te ON te.id = tr.execution_id
             ${whereClause})::int AS total_reports,
           (SELECT COUNT(*) FROM export_tasks et
             WHERE et.created_at >= NOW() - ($1::int || ' days')::interval)::int AS total_exports,
           0::int AS total_imports,
           (SELECT COALESCE(SUM(file_size), 0) FROM test_reports tr
             LEFT JOIN test_executions te ON te.id = tr.execution_id
             ${whereClause})::float AS storage_used,
           (SELECT COUNT(*) FROM test_logs tl
             LEFT JOIN test_executions te ON te.id = tl.execution_id
             ${whereClause})::int AS api_calls`,
        params.length > 0 ? params : [query.timeRange || 30]
      );

      const moduleStats = await dbQuery(
        `SELECT te.engine_type AS module, COUNT(*)::int AS count
         FROM test_executions te
         ${whereClause}
         GROUP BY te.engine_type`,
        params
      );

      const featureStats = await dbQuery(
        `SELECT tr.report_type AS feature, COUNT(*)::int AS count
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         ${whereClause}
         GROUP BY tr.report_type`,
        params
      );

      // 增长统计
      const growth = await this.calculateGrowth(query.timeRange || 30);

      const statistics: SystemUsageStatistics = {
        totalTests: Number(usageStats.rows[0]?.total_tests) || 0,
        totalReports: Number(usageStats.rows[0]?.total_reports) || 0,
        totalExports: Number(usageStats.rows[0]?.total_exports) || 0,
        totalImports: Number(usageStats.rows[0]?.total_imports) || 0,
        storageUsed: Number(usageStats.rows[0]?.storage_used) || 0,
        apiCalls: Number(usageStats.rows[0]?.api_calls) || 0,
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
      const metricValueExpr = this.buildMetricValueExpression('tm.metric_value');
      const data = await dbQuery(
        `SELECT
           DATE(te.created_at) AS date,
           AVG(${metricValueExpr})::float AS value
         FROM test_metrics tm
         JOIN test_results tr ON tr.id = tm.result_id
         JOIN test_executions te ON te.id = tr.execution_id
         WHERE tm.metric_name = $1
           AND te.created_at >= NOW() - ($2::int || ' days')::interval
         GROUP BY DATE(te.created_at)
         ORDER BY date ASC`,
        [metric, period]
      );

      const typedData = data as Array<{ date: string; value: number }>;
      const values = typedData.map(item => Number(item.value) || 0);
      const trend = this.calculateTrend(values);
      const prediction = this.generatePrediction(typedData, 7);

      return {
        metric,
        period,
        data: data.rows || [],
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
    const hits = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;

    for (const [_key, entry] of this.cache.entries()) {
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
  private buildBaseFilter(query: StatisticsQuery, alias: string) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.userId) {
      params.push(query.userId);
      conditions.push(`${alias}.user_id = $${params.length}`);
    }

    if (query.startDate) {
      params.push(query.startDate);
      conditions.push(`${alias}.created_at >= $${params.length}`);
    }

    if (query.endDate) {
      params.push(query.endDate);
      conditions.push(`${alias}.created_at <= $${params.length}`);
    }

    if (query.timeRange) {
      params.push(query.timeRange);
      conditions.push(
        `${alias}.created_at >= NOW() - ($${params.length}::int || ' days')::interval`
      );
    }

    return { clause: conditions.join(' AND '), params };
  }

  /**
   * 分析趋势
   */
  private analyzeTestHistoryTrends(
    data: Array<Record<string, unknown>>
  ): TestHistoryStatistics['trends'] {
    if (data.length < 2) {
      return {
        score: 'stable',
        successRate: 'stable',
        volume: 'stable',
      };
    }

    const toNumber = (value: unknown): number =>
      typeof value === 'number' ? value : Number(value) || 0;
    const scoreTrend = this.calculateTrend(data.map(d => toNumber(d.averageScore)));
    const successRateTrend = this.calculateTrend(data.map(d => toNumber(d.successRate)));
    const volumeTrend = this.calculateTrend(data.map(d => toNumber(d.count)));

    return {
      score: scoreTrend.direction,
      successRate: successRateTrend.direction,
      volume: volumeTrend.direction,
    };
  }

  /**
   * 分析性能趋势
   */
  private async analyzePerformanceTrends(
    query: StatisticsQuery
  ): Promise<PerformanceStatistics['trends']> {
    const { clause, params } = this.buildBaseFilter(query, 'te');
    const whereClause = clause ? `WHERE ${clause}` : '';
    const metricValueExpr = this.buildMetricValueExpression('tm.metric_value');

    const metricData = await dbQuery(
      `SELECT
         DATE(te.created_at) AS date,
         AVG(CASE WHEN tm.metric_name IN ('averageResponseTime', 'responseTime') THEN ${metricValueExpr} END)::float AS response_time,
         AVG(CASE WHEN tm.metric_name IN ('throughput') THEN ${metricValueExpr} END)::float AS throughput,
         AVG(CASE WHEN tm.metric_name IN ('errorRate') THEN ${metricValueExpr} END)::float AS error_rate
       FROM test_metrics tm
       JOIN test_results tr ON tr.id = tm.result_id
       JOIN test_executions te ON te.id = tr.execution_id
       ${whereClause}
       GROUP BY DATE(te.created_at)
       ORDER BY date ASC`,
      params
    );

    const rows = metricData.rows || [];
    const responseTrend = this.calculateTrend(rows.map(row => Number(row.response_time) || 0));
    const throughputTrend = this.calculateTrend(rows.map(row => Number(row.throughput) || 0));
    const errorRateTrend = this.calculateTrend(rows.map(row => Number(row.error_rate) || 0));

    return {
      responseTime:
        responseTrend.direction === 'increasing' ? 'degrading' : responseTrend.direction,
      throughput:
        throughputTrend.direction === 'increasing' ? 'improving' : throughputTrend.direction,
      errorRate: errorRateTrend.direction === 'decreasing' ? 'improving' : errorRateTrend.direction,
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
      const currentPeriod = await dbQuery(
        `SELECT
           COUNT(*)::int AS tests,
           COUNT(DISTINCT user_id)::int AS users
         FROM test_executions
         WHERE created_at >= NOW() - ($1::int || ' days')::interval`,
        [period]
      );

      const currentStorage = await dbQuery(
        `SELECT COALESCE(SUM(file_size), 0)::float AS storage
         FROM test_reports
         WHERE generated_at >= NOW() - ($1::int || ' days')::interval`,
        [period]
      );

      const previousPeriod = await dbQuery(
        `SELECT
           COUNT(*)::int AS tests,
           COUNT(DISTINCT user_id)::int AS users
         FROM test_executions
         WHERE created_at >= NOW() - ($1::int || ' days')::interval
           AND created_at < NOW() - ($2::int || ' days')::interval`,
        [period * 2, period]
      );

      const previousStorage = await dbQuery(
        `SELECT COALESCE(SUM(file_size), 0)::float AS storage
         FROM test_reports
         WHERE generated_at >= NOW() - ($1::int || ' days')::interval
           AND generated_at < NOW() - ($2::int || ' days')::interval`,
        [period * 2, period]
      );

      return {
        tests: this.calculateGrowthRate(
          Number(previousPeriod.rows[0]?.tests) || 0,
          Number(currentPeriod.rows[0]?.tests) || 0
        ),
        users: this.calculateGrowthRate(
          Number(previousPeriod.rows[0]?.users) || 0,
          Number(currentPeriod.rows[0]?.users) || 0
        ),
        storage: this.calculateGrowthRate(
          Number(previousStorage.rows[0]?.storage) || 0,
          Number(currentStorage.rows[0]?.storage) || 0
        ),
      };
    } catch {
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
    _usage: SystemUsageStatistics
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
  private generatePrediction(
    data: Array<{ date: string; value: number }>,
    days: number
  ): TrendAnalysis['prediction'] {
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
    array: Array<Record<string, unknown>>,
    keyField: string,
    valueField: string
  ): Record<string, number> {
    const result: Record<string, number> = {};
    array.forEach(item => {
      const key = String(item[keyField]);
      const value =
        typeof item[valueField] === 'number' ? item[valueField] : Number(item[valueField]);
      result[key] = Number.isFinite(value) ? value : 0;
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
  private getFromCache<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: unknown): void {
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

  private buildDateRangeCondition(
    column: string,
    query: StatisticsQuery,
    params: unknown[],
    fallbackDays: number
  ): string {
    const conditions: string[] = [];
    if (query.startDate) {
      params.push(query.startDate);
      conditions.push(`${column} >= $${params.length}`);
    }
    if (query.endDate) {
      params.push(query.endDate);
      conditions.push(`${column} <= $${params.length}`);
    }
    if (conditions.length === 0) {
      params.push(fallbackDays);
      conditions.push(`${column} >= NOW() - ($${params.length}::int || ' days')::interval`);
    }
    return conditions.join(' AND ');
  }

  private buildMetricValueExpression(column: string): string {
    return `CASE
      WHEN jsonb_typeof(${column}) = 'number' THEN (${column})::numeric
      WHEN jsonb_typeof(${column}) = 'string' THEN NULLIF(${column}::text, '')::numeric
      WHEN jsonb_typeof(${column}) = 'object' AND ${column} ? 'value' THEN (${column} ->> 'value')::numeric
      ELSE NULL
    END`;
  }
}

export default StatisticsService;
