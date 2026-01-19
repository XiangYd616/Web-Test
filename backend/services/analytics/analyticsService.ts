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
}

class AnalyticsService {
  /**
   * 获取分析摘要
   */
  async getSummary({ userId, dateRange = 30 }: AnalyticsParams): Promise<AnalyticsSummary> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      const sql = `
        SELECT 
          test_type,
          status,
          overall_score,
          start_time,
          created_at
        FROM test_history
        WHERE user_id = $1 AND created_at >= $2
        ORDER BY created_at DESC
      `;

      const results = await query(sql, [userId, cutoffDate]);

      const summary: AnalyticsSummary = {
        totalTests: results.rows.length,
        completedTests: results.rows.filter(row => row.status === 'completed').length,
        failedTests: results.rows.filter(row => row.status === 'failed').length,
        averageScore: 0,
        testTypes: {},
        trends: [],
      };

      // 计算平均分
      const completedTests = results.rows.filter(row => row.status === 'completed');
      if (completedTests.length > 0) {
        summary.averageScore =
          completedTests.reduce((sum, test) => sum + (test.overall_score || 0), 0) /
          completedTests.length;
      }

      // 统计测试类型
      results.rows.forEach(test => {
        summary.testTypes[test.test_type] = (summary.testTypes[test.test_type] || 0) + 1;
      });

      // 生成趋势数据
      const trendsByDate = new Map<string, { count: number; totalScore: number }>();

      results.rows.forEach(test => {
        const date = test.created_at.toISOString().split('T')[0];
        if (!trendsByDate.has(date)) {
          trendsByDate.set(date, { count: 0, totalScore: 0 });
        }
        const trend = trendsByDate.get(date)!;
        trend.count++;
        if (test.overall_score) {
          trend.totalScore += test.overall_score;
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
  async getPerformanceTrends({ userId, dateRange = 30 }: AnalyticsParams): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      const sql = `
        SELECT 
          DATE(created_at) as date,
          AVG(overall_score) as average_score,
          COUNT(*) as test_count,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
        FROM test_history
        WHERE user_id = $1 AND created_at >= $2 AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const results = await query(sql, [userId, cutoffDate]);

      return results.rows.map(row => ({
        date: row.date,
        averageScore: parseFloat(row.average_score) || 0,
        testCount: parseInt(row.test_count),
        avgDuration: parseFloat(row.avg_duration) || 0,
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
  }): Promise<any[]> {
    try {
      let sql = `
        SELECT 
          test_type,
          overall_score,
          results,
          created_at
        FROM test_history
        WHERE user_id = $1 AND status = 'completed'
      `;

      const params = [userId];

      if (testId) {
        sql += ' AND test_id = $2';
        params.push(testId);
      }

      sql += ' ORDER BY created_at DESC LIMIT 10';

      const results = await query(sql, params);

      const recommendations: any[] = [];

      results.rows.forEach(test => {
        if (test.overall_score < 80) {
          recommendations.push({
            type: 'improvement',
            category: test.test_type,
            message: `${test.test_type}测试得分较低 (${test.overall_score})，建议优化相关配置`,
            priority: test.overall_score < 60 ? 'high' : 'medium',
            testId: test.test_id,
          });
        }

        // 分析测试结果中的具体问题
        if (test.results && typeof test.results === 'object') {
          const resultsObj = test.results as any;
          if (resultsObj.issues && Array.isArray(resultsObj.issues)) {
            resultsObj.issues.forEach((issue: any) => {
              if (issue.severity === 'high' || issue.severity === 'critical') {
                recommendations.push({
                  type: 'issue',
                  category: test.test_type,
                  message: issue.description || '发现严重问题',
                  priority: issue.severity,
                  recommendation: issue.recommendation,
                  testId: test.test_id,
                });
              }
            });
          }
        }
      });

      // 去重并按优先级排序
      const uniqueRecommendations = recommendations.filter(
        (rec, index, self) => index === self.findIndex(r => r.message === rec.message)
      );

      return uniqueRecommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
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
  }): Promise<any> {
    try {
      const summary = await this.getSummary({ userId, dateRange });
      const trends = await this.getPerformanceTrends({ userId, dateRange });
      const recommendations = await this.getRecommendations({ userId });

      const report = {
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
  async getRealTimeStats({ userId }: { userId: string }): Promise<any> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(overall_score) as average_score
        FROM test_history
        WHERE user_id = $1 AND created_at >= CURRENT_DATE
      `;

      const results = await query(sql, [userId]);

      const stats = results.rows[0];

      return {
        totalTests: parseInt(stats.total_tests),
        runningTests: parseInt(stats.running_tests),
        completedTests: parseInt(stats.completed_tests),
        failedTests: parseInt(stats.failed_tests),
        averageScore: parseFloat(stats.average_score) || 0,
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
  private convertToCSV(report: any): string {
    const headers = ['日期', '测试类型', '状态', '得分', '持续时间'];
    const rows = [headers.join(',')];

    // 这里可以根据实际需要生成CSV数据
    rows.push(`${report.generatedAt},汇总,完成,${report.summary.averageScore},-`);

    return rows.join('\n');
  }
}

export default new AnalyticsService();
