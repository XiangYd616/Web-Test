/**
 * 分析服务
 * 职责: 处理分析相关的业务逻辑
 *
 * 规范:
 * - 包含所有分析业务逻辑
 * - 调用Repository层访问数据
 * - 不直接处理HTTP请求
 */

import { query } from '../../config/database';
import Logger from '../../utils/logger';

interface AnalyticsSummary {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  testTypes: {
    [key: string]: number;
  };
  trends: {
    date: string;
    count: number;
    averageScore: number;
  }[];
}

interface AnalyticsParams {
  userId: string;
  dateRange?: number;
  period?: string | number;
}

type PerformanceTrend = {
  date: string;
  averageScore: number;
  testCount: number;
  avgDuration: number;
};

type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

type Recommendation = {
  type: 'improvement' | 'issue';
  category: string;
  message: string;
  priority: RecommendationPriority;
  testId?: string;
  recommendation?: unknown;
};

type AnalyticsReport = {
  generatedAt: string;
  dateRange: number;
  summary: AnalyticsSummary;
  trends: PerformanceTrend[];
  recommendations: Recommendation[];
  metadata: {
    totalTests: number;
    averageScore: number;
    completionRate: number;
  };
};

type RealTimeStats = {
  totalTests: number;
  runningTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  updatedAt: string;
};

type SummaryRow = {
  engine_type: string;
  status: string;
  score: number | null;
  created_at: string | Date;
};

type TrendRow = {
  date: string;
  average_score: string | number | null;
  test_count: string | number;
  avg_duration: string | number | null;
};

type RecommendationRow = {
  engine_type: string;
  score: number | null;
  summary: unknown;
  test_id?: string;
  created_at: string | Date;
};

type RealTimeRow = {
  total_tests: string | number;
  running_tests: string | number;
  completed_tests: string | number;
  failed_tests: string | number;
  average_score: string | number | null;
};

class AnalyticsService {
  /**
   * 获取分析摘要
   */
  async getSummary({ userId, dateRange = 30 }: AnalyticsParams): Promise<AnalyticsSummary> {
    try {
      if (!userId) {
        throw new Error('用户未认证');
      }
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      const sql = `
        SELECT 
          te.engine_type,
          te.status,
          tr.score,
          te.created_at
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        WHERE te.user_id = $1 AND te.created_at >= $2
        ORDER BY te.created_at DESC
      `;

      const results = await query(sql, [userId, cutoffDate]);
      const rows = results.rows as SummaryRow[];

      const summary: AnalyticsSummary = {
        totalTests: rows.length,
        completedTests: rows.filter(row => row.status === 'completed').length,
        failedTests: rows.filter(row => row.status === 'failed').length,
        averageScore: 0,
        testTypes: {},
        trends: [],
      };

      // 计算平均分
      const completedTests = rows.filter(
        row => row.status === 'completed' && typeof row.score === 'number'
      );
      if (completedTests.length > 0) {
        summary.averageScore =
          completedTests.reduce((sum, test) => sum + (test.score || 0), 0) / completedTests.length;
      }

      // 统计测试类型
      rows.forEach(test => {
        summary.testTypes[test.engine_type] = (summary.testTypes[test.engine_type] || 0) + 1;
      });

      // 生成趋势数据
      const trendsByDate = new Map<string, { count: number; totalScore: number }>();

      rows.forEach(test => {
        const createdAt = new Date(test.created_at);
        const date = createdAt.toISOString().split('T')[0];
        if (!trendsByDate.has(date)) {
          trendsByDate.set(date, { count: 0, totalScore: 0 });
        }
        const trend = trendsByDate.get(date);
        if (!trend) {
          return;
        }
        trend.count++;
        if (typeof test.score === 'number') {
          trend.totalScore += test.score;
        }
      });

      summary.trends = Array.from(trendsByDate.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          averageScore: data.count > 0 ? data.totalScore / data.count : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return summary;
    } catch (error) {
      Logger.error('获取分析摘要失败', { error, userId });
      throw new Error(
        `获取分析摘要失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取性能趋势
   */
  async getPerformanceTrends({
    userId,
    dateRange,
    period,
  }: AnalyticsParams): Promise<PerformanceTrend[]> {
    try {
      if (!userId) {
        throw new Error('用户未认证');
      }
      const resolvedRange = this.resolveDateRange(dateRange, period, 30);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - resolvedRange);

      const sql = `
        SELECT 
          DATE(te.created_at) as date,
          AVG(tr.score) as average_score,
          COUNT(*) as test_count,
          AVG(EXTRACT(EPOCH FROM (te.completed_at - te.started_at))) as avg_duration
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        WHERE te.user_id = $1 AND te.created_at >= $2 AND te.status = 'completed'
        GROUP BY DATE(te.created_at)
        ORDER BY date DESC
      `;

      const results = await query(sql, [userId, cutoffDate]);
      const rows = results.rows as TrendRow[];

      return rows.map(row => ({
        date: String(row.date),
        averageScore: parseFloat(String(row.average_score ?? 0)) || 0,
        testCount: parseInt(String(row.test_count), 10) || 0,
        avgDuration: parseFloat(String(row.avg_duration ?? 0)) || 0,
      }));
    } catch (error) {
      Logger.error('获取性能趋势失败', { error, userId });
      throw new Error(
        `获取性能趋势失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取建议
   */
  async getRecommendations({
    userId,
    testId,
  }: {
    userId: string;
    testId?: string;
  }): Promise<Recommendation[]> {
    try {
      if (!userId) {
        throw new Error('用户未认证');
      }
      let sql = `
        SELECT 
          te.engine_type,
          tr.score,
          tr.summary,
          te.test_id,
          te.created_at
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        WHERE te.user_id = $1 AND te.status = 'completed'
      `;

      const params = [userId];

      if (testId) {
        sql += ' AND test_id = $2';
        params.push(testId);
      }

      sql += ' ORDER BY created_at DESC LIMIT 10';

      const results = await query(sql, params);
      const rows = results.rows as RecommendationRow[];

      const recommendations: Recommendation[] = [];

      rows.forEach(test => {
        const score = typeof test.score === 'number' ? test.score : 0;
        const summary = this.ensureRecord(test.summary);
        if (score < 80) {
          recommendations.push({
            type: 'improvement',
            category: test.engine_type,
            message: `${test.engine_type}测试得分较低 (${score})，建议优化相关配置`,
            priority: score < 60 ? 'high' : 'medium',
            testId: test.test_id,
          });
        }

        // 分析测试结果中的具体问题
        const issues = Array.isArray(summary.issues)
          ? summary.issues
          : Array.isArray(summary.errors)
            ? summary.errors
            : [];
        issues.forEach(issue => {
          if (typeof issue === 'string') {
            recommendations.push({
              type: 'issue',
              category: test.engine_type,
              message: issue,
              priority: 'medium',
              testId: test.test_id,
            });
            return;
          }
          if (issue && typeof issue === 'object') {
            const issueRecord = issue as Record<string, unknown>;
            const severity = String(issueRecord.severity || issueRecord.level || 'medium');
            if (severity === 'high' || severity === 'critical') {
              recommendations.push({
                type: 'issue',
                category: test.engine_type,
                message: String(issueRecord.description || issueRecord.message || '发现严重问题'),
                priority: severity,
                recommendation: issueRecord.recommendation,
                testId: test.test_id,
              });
            }
          }
        });
      });

      // 去重并按优先级排序
      const uniqueRecommendations = recommendations.filter(
        (rec, index, self) => index === self.findIndex(r => r.message === rec.message)
      );

      return uniqueRecommendations.sort((a, b) => {
        const priorityOrder: Record<RecommendationPriority, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      Logger.error('获取建议失败', { error, userId, testId });
      throw new Error(`获取建议失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 导出报告
   */
  async exportReport({
    userId,
    format = 'json',
    dateRange = 30,
  }: {
    userId: string;
    format?: string;
    dateRange?: number;
  }): Promise<AnalyticsReport | string> {
    try {
      const summary = await this.getSummary({ userId, dateRange });
      const trends = await this.getPerformanceTrends({ userId, dateRange });
      const recommendations = await this.getRecommendations({ userId });

      const report: AnalyticsReport = {
        generatedAt: new Date().toISOString(),
        dateRange,
        summary,
        trends,
        recommendations,
        metadata: {
          totalTests: summary.totalTests,
          averageScore: summary.averageScore,
          completionRate:
            summary.totalTests > 0 ? (summary.completedTests / summary.totalTests) * 100 : 0,
        },
      };

      if (format === 'csv') {
        return this.convertToCSV(report);
      }

      return report;
    } catch (error) {
      Logger.error('导出报告失败', { error, userId, format });
      throw new Error(`导出报告失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取实时统计
   */
  async getRealTimeStats({ userId }: { userId: string }): Promise<RealTimeStats> {
    try {
      if (!userId) {
        throw new Error('用户未认证');
      }
      const sql = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN te.status = 'running' THEN 1 END) as running_tests,
          COUNT(CASE WHEN te.status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN te.status = 'failed' THEN 1 END) as failed_tests,
          AVG(tr.score) as average_score
        FROM test_executions te
        LEFT JOIN test_results tr ON tr.execution_id = te.id
        WHERE te.user_id = $1 AND te.created_at >= CURRENT_DATE
      `;

      const results = await query(sql, [userId]);

      const stats = results.rows[0] as RealTimeRow;

      return {
        totalTests: parseInt(String(stats.total_tests), 10) || 0,
        runningTests: parseInt(String(stats.running_tests), 10) || 0,
        completedTests: parseInt(String(stats.completed_tests), 10) || 0,
        failedTests: parseInt(String(stats.failed_tests), 10) || 0,
        averageScore: parseFloat(String(stats.average_score ?? 0)) || 0,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      Logger.error('获取实时统计失败', { error, userId });
      throw new Error(
        `获取实时统计失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(report: AnalyticsReport): string {
    const headers = ['日期', '测试类型', '状态', '得分', '持续时间'];
    const rows = [headers.join(',')];

    // 这里可以根据实际需要生成CSV数据
    rows.push(`${report.generatedAt},汇总,完成,${report.summary.averageScore},-`);

    return rows.join('\n');
  }

  private ensureRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private resolveDateRange(
    dateRange: number | undefined,
    period: string | number | undefined,
    fallback: number
  ): number {
    if (typeof dateRange === 'number' && Number.isFinite(dateRange)) {
      return dateRange;
    }
    if (typeof period === 'number' && Number.isFinite(period)) {
      return period;
    }
    if (typeof period === 'string') {
      const match = period.match(/(\d+)([dwmy])/i);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit === 'w') return value * 7;
        if (unit === 'm') return value * 30;
        if (unit === 'y') return value * 365;
        return value;
      }
    }
    return fallback;
  }
}

export default new AnalyticsService();
