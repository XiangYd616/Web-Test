/**
 * 分析服务
 * 职责: 处理分析相关的业务逻辑
 * 
 * 规范:
 * - 包含所有分析业务逻辑
 * - 调用Repository层访问数据
 * - 不直接处理HTTP请求
 */

const { query } = require('../../config/database');
const Logger = require('../../utils/logger');

class AnalyticsService {
  /**
   * 获取分析摘要
   */
  async getSummary({ userId, dateRange = 30 }) {
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
        WHERE user_id = ? AND (start_time >= ? OR created_at >= ?)
        ORDER BY start_time DESC
      `;

      const tests = await query(sql, [userId, cutoffDate, cutoffDate]);

      return {
        totalTests: tests.length,
        successRate: this.calculateSuccessRate(tests),
        averageScore: this.calculateAverageScore(tests),
        testsByType: this.groupByType(tests),
        testsByStatus: this.groupByStatus(tests),
      };
    } catch (error) {
      Logger.error('获取分析摘要失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能趋势
   */
  async getPerformanceTrends({ userId, period = '30d' }) {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sql = `
        SELECT 
          DATE(start_time) as date,
          AVG(JSON_EXTRACT(scores, '$.performance')) as performance,
          AVG(JSON_EXTRACT(scores, '$.seo')) as seo,
          AVG(JSON_EXTRACT(scores, '$.accessibility')) as accessibility,
          AVG(JSON_EXTRACT(scores, '$.security')) as security
        FROM test_history
        WHERE user_id = ? AND start_time >= ?
        GROUP BY DATE(start_time)
        ORDER BY date ASC
      `;

      const dataPoints = await query(sql, [userId, cutoffDate]);

      return {
        period,
        dataPoints,
        coreWebVitals: await this.calculateCoreWebVitals(userId, days),
        topUrls: await this.getTopUrls(userId, days),
      };
    } catch (error) {
      Logger.error('获取性能趋势失败:', error);
      throw error;
    }
  }

  /**
   * 获取智能建议
   */
  async getRecommendations({ userId, testId }) {
    try {
      const recommendations = [];

      if (testId) {
        const sql = 'SELECT * FROM test_history WHERE id = ? AND user_id = ?';
        const [test] = await query(sql, [testId, userId]);

        if (test) {
          recommendations.push(...this.generateTestRecommendations(test));
        }
      } else {
        const sql = `
          SELECT * FROM test_history 
          WHERE user_id = ? 
          ORDER BY start_time DESC 
          LIMIT 10
        `;
        const tests = await query(sql, [userId]);
        recommendations.push(...this.generateGeneralRecommendations(tests));
      }

      return recommendations;
    } catch (error) {
      Logger.error('获取建议失败:', error);
      throw error;
    }
  }

  /**
   * 导出报告
   */
  async exportReport({ userId, format, dateRange = 30, includeCharts = true }) {
    try {
      const summary = await this.getSummary({ userId, dateRange });
      const trends = await this.getPerformanceTrends({ userId, period: `${dateRange}d` });

      const reportData = {
        summary,
        trends,
        generatedAt: new Date().toISOString(),
        includeCharts,
      };

      if (format === 'json') {
        return JSON.stringify(reportData, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(reportData);
      } else if (format === 'pdf') {
        return this.generatePDF(reportData);
      }

      throw new Error(`不支持的格式: ${format}`);
    } catch (error) {
      Logger.error('导出报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取实时统计
   */
  async getRealTimeStats({ userId }) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM test_history
        WHERE user_id = ? AND DATE(start_time) = CURDATE()
      `;

      const [stats] = await query(sql, [userId]);
      return stats;
    } catch (error) {
      Logger.error('获取实时统计失败:', error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  calculateSuccessRate(tests) {
    if (tests.length === 0) return 0;
    const completed = tests.filter((t) => t.status === 'completed').length;
    return (completed / tests.length) * 100;
  }

  calculateAverageScore(tests) {
    const scored = tests.filter((t) => t.overall_score != null);
    if (scored.length === 0) return 0;
    const sum = scored.reduce((acc, t) => acc + t.overall_score, 0);
    return sum / scored.length;
  }

  groupByType(tests) {
    const groups = {};
    tests.forEach((t) => {
      const type = t.test_type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  groupByStatus(tests) {
    const groups = {};
    tests.forEach((t) => {
      const status = t.status || 'unknown';
      groups[status] = (groups[status] || 0) + 1;
    });
    return groups;
  }

  async calculateCoreWebVitals(userId, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const sql = `
      SELECT 
        AVG(JSON_EXTRACT(results, '$.metrics.lcp')) as lcp,
        AVG(JSON_EXTRACT(results, '$.metrics.fid')) as fid,
        AVG(JSON_EXTRACT(results, '$.metrics.cls')) as cls,
        AVG(JSON_EXTRACT(results, '$.metrics.fcp')) as fcp
      FROM test_history
      WHERE user_id = ? AND start_time >= ? AND test_type = 'performance'
    `;

    const [vitals] = await query(sql, [userId, cutoffDate]);

    return {
      lcp: { average: vitals.lcp || 0, trend: 'stable' },
      fid: { average: vitals.fid || 0, trend: 'stable' },
      cls: { average: vitals.cls || 0, trend: 'stable' },
      fcp: { average: vitals.fcp || 0, trend: 'stable' },
    };
  }

  async getTopUrls(userId, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const sql = `
      SELECT 
        url,
        COUNT(*) as testCount,
        AVG(overall_score) as avgScore
      FROM test_history
      WHERE user_id = ? AND start_time >= ? AND url IS NOT NULL
      GROUP BY url
      ORDER BY testCount DESC
      LIMIT 10
    `;

    const urls = await query(sql, [userId, cutoffDate]);

    return urls.map((u) => ({
      url: u.url,
      testCount: u.testCount,
      avgScore: u.avgScore || 0,
      trend: 'stable',
    }));
  }

  generateTestRecommendations(test) {
    const recommendations = [];

    if (test.overall_score < 60) {
      recommendations.push({
        id: `rec-${test.id}-1`,
        category: 'performance',
        priority: 'high',
        title: '整体性能需要改进',
        description: '测试分数低于60分,建议进行全面优化',
        impact: '可显著提升用户体验',
        solution: {
          steps: ['分析性能瓶颈', '优化关键资源', '减少加载时间'],
          estimatedEffort: 'high',
          estimatedImpact: 'high',
        },
      });
    }

    return recommendations;
  }

  generateGeneralRecommendations(tests) {
    const recommendations = [];

    const avgScore = this.calculateAverageScore(tests);
    if (avgScore < 70) {
      recommendations.push({
        id: 'rec-general-1',
        category: 'performance',
        priority: 'medium',
        title: '平均分数偏低',
        description: '最近测试的平均分数低于70分',
        impact: '影响整体网站质量',
        solution: {
          steps: ['定期进行性能测试', '建立性能监控', '持续优化'],
          estimatedEffort: 'medium',
          estimatedImpact: 'high',
        },
      });
    }

    return recommendations;
  }

  convertToCSV(data) {
    let csv = 'Metric,Value\n';
    csv += `Total Tests,${data.summary.totalTests}\n`;
    csv += `Success Rate,${data.summary.successRate.toFixed(2)}%\n`;
    csv += `Average Score,${data.summary.averageScore.toFixed(2)}\n`;
    return csv;
  }

  generatePDF(_data) {
    throw new Error('PDF生成功能待实现');
  }
}

module.exports = new AnalyticsService();
