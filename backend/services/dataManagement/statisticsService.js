/**
 * 统计分析服务
 * 专门处理数据统计和分析功能
 */

const winston = require('winston');

class StatisticsService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/statistics.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * 获取测试历史统计信息
   */
  async getTestHistoryStatistics(userId, timeRange = 30) {
    try {
      const { query } = require('../../config/database');
      
      // 基础统计
      const overviewResult = await query(
        `SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(overall_score) as average_score,
          AVG(duration) as average_duration,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100) as success_rate
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'`,
        [userId]
      );

      // 按测试类型统计
      const typeStatsResult = await query(
        `SELECT 
          test_type as type,
          COUNT(*) as count,
          AVG(overall_score) as average_score,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100) as success_rate
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY test_type
        ORDER BY count DESC`,
        [userId]
      );

      // 按状态统计
      const statusStatsResult = await query(
        `SELECT 
          status,
          COUNT(*) as count,
          (COUNT(*)::float / (SELECT COUNT(*) FROM test_history WHERE user_id = $1)::float * 100) as percentage
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY status
        ORDER BY count DESC`,
        [userId]
      );

      // 时间趋势统计
      const trendResult = await query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          AVG(overall_score) as average_score
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30`,
        [userId]
      );

      // 热门URL统计
      const urlStatsResult = await query(
        `SELECT 
          url,
          COUNT(*) as count,
          AVG(overall_score) as average_score
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY url
        ORDER BY count DESC
        LIMIT 10`,
        [userId]
      );

      return {
        success: true,
        data: {
          overview: this.formatOverviewStats(overviewResult.rows[0]),
          typeStats: typeStatsResult.rows,
          statusStats: statusStatsResult.rows,
          trends: trendResult.rows,
          topUrls: urlStatsResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 获取性能分析统计
   */
  async getPerformanceStatistics(userId, timeRange = 30) {
    try {
      const { query } = require('../../config/database');
      
      const result = await query(
        `SELECT 
          AVG(duration) as avg_duration,
          MIN(duration) as min_duration,
          MAX(duration) as max_duration,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration,
          COUNT(*) as total_tests
        FROM test_history 
        WHERE user_id = $1 
          AND created_at >= NOW() - INTERVAL '${timeRange} days'
          AND duration IS NOT NULL`,
        [userId]
      );

      // 按测试类型的性能统计
      const typePerformanceResult = await query(
        `SELECT 
          test_type,
          AVG(duration) as avg_duration,
          COUNT(*) as count
        FROM test_history 
        WHERE user_id = $1 
          AND created_at >= NOW() - INTERVAL '${timeRange} days'
          AND duration IS NOT NULL
        GROUP BY test_type
        ORDER BY avg_duration DESC`,
        [userId]
      );

      return {
        success: true,
        data: {
          overall: result.rows[0],
          byType: typePerformanceResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('获取性能统计失败:', error);
      throw new Error(`获取性能统计失败: ${error.message}`);
    }
  }

  /**
   * 获取质量分析统计
   */
  async getQualityStatistics(userId, timeRange = 30) {
    try {
      const { query } = require('../../config/database');
      
      const result = await query(
        `SELECT 
          AVG(overall_score) as avg_score,
          MIN(overall_score) as min_score,
          MAX(overall_score) as max_score,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY overall_score) as median_score,
          COUNT(CASE WHEN overall_score >= 90 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN overall_score >= 70 AND overall_score < 90 THEN 1 END) as good_count,
          COUNT(CASE WHEN overall_score >= 50 AND overall_score < 70 THEN 1 END) as fair_count,
          COUNT(CASE WHEN overall_score < 50 THEN 1 END) as poor_count,
          COUNT(*) as total_tests
        FROM test_history 
        WHERE user_id = $1 
          AND created_at >= NOW() - INTERVAL '${timeRange} days'
          AND overall_score IS NOT NULL`,
        [userId]
      );

      const stats = result.rows[0];
      const total = parseInt(stats.total_tests);

      return {
        success: true,
        data: {
          overall: {
            averageScore: parseFloat(stats.avg_score) || 0,
            minScore: parseFloat(stats.min_score) || 0,
            maxScore: parseFloat(stats.max_score) || 0,
            medianScore: parseFloat(stats.median_score) || 0
          },
          distribution: {
            excellent: { count: parseInt(stats.excellent_count), percentage: total > 0 ? (parseInt(stats.excellent_count) / total * 100) : 0 },
            good: { count: parseInt(stats.good_count), percentage: total > 0 ? (parseInt(stats.good_count) / total * 100) : 0 },
            fair: { count: parseInt(stats.fair_count), percentage: total > 0 ? (parseInt(stats.fair_count) / total * 100) : 0 },
            poor: { count: parseInt(stats.poor_count), percentage: total > 0 ? (parseInt(stats.poor_count) / total * 100) : 0 }
          },
          totalTests: total,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('获取质量统计失败:', error);
      throw new Error(`获取质量统计失败: ${error.message}`);
    }
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivityStatistics(userId, timeRange = 30) {
    try {
      const { query } = require('../../config/database');
      
      // 每日活动统计
      const dailyActivityResult = await query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as tests_count,
          COUNT(DISTINCT test_type) as unique_types
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        [userId]
      );

      // 每小时活动统计
      const hourlyActivityResult = await query(
        `SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as tests_count
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour`,
        [userId]
      );

      return {
        success: true,
        data: {
          daily: dailyActivityResult.rows,
          hourly: hourlyActivityResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('获取用户活动统计失败:', error);
      throw new Error(`获取用户活动统计失败: ${error.message}`);
    }
  }

  /**
   * 获取系统整体统计（管理员用）
   */
  async getSystemStatistics(timeRange = 30) {
    try {
      const { query } = require('../../config/database');
      
      // 整体统计
      const overallResult = await query(
        `SELECT 
          COUNT(*) as total_tests,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          AVG(duration) as avg_duration
        FROM test_history 
        WHERE created_at >= NOW() - INTERVAL '${timeRange} days'`
      );

      // 用户排行
      const userRankingResult = await query(
        `SELECT 
          user_id,
          COUNT(*) as tests_count,
          AVG(overall_score) as avg_score
        FROM test_history 
        WHERE created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY user_id
        ORDER BY tests_count DESC
        LIMIT 10`
      );

      return {
        success: true,
        data: {
          overall: overallResult.rows[0],
          userRanking: userRankingResult.rows,
          timeRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('获取系统统计失败:', error);
      throw new Error(`获取系统统计失败: ${error.message}`);
    }
  }

  /**
   * 格式化概览统计数据
   */
  formatOverviewStats(stats) {
    if (!stats) {
      return {
        totalTests: 0,
        completedTests: 0,
        failedTests: 0,
        averageScore: 0,
        averageDuration: 0,
        successRate: 0
      };
    }

    return {
      totalTests: parseInt(stats.total_tests) || 0,
      completedTests: parseInt(stats.completed_tests) || 0,
      failedTests: parseInt(stats.failed_tests) || 0,
      averageScore: parseFloat(stats.average_score) || 0,
      averageDuration: parseFloat(stats.average_duration) || 0,
      successRate: parseFloat(stats.success_rate) || 0
    };
  }

  /**
   * 生成报告
   */
  async generateReport(userId, reportType = 'summary', timeRange = 30) {
    try {
      let reportData = {};

      switch (reportType) {
        case 'summary':
          reportData = await this.getTestHistoryStatistics(userId, timeRange);
          break;
        case 'performance':
          reportData = await this.getPerformanceStatistics(userId, timeRange);
          break;
        case 'quality':
          reportData = await this.getQualityStatistics(userId, timeRange);
          break;
        case 'activity':
          reportData = await this.getUserActivityStatistics(userId, timeRange);
          break;
        default:
          throw new Error(`不支持的报告类型: ${reportType}`);
      }

      return {
        success: true,
        data: {
          reportType,
          timeRange,
          generatedAt: new Date().toISOString(),
          ...reportData.data
        }
      };

    } catch (error) {
      this.logger.error('生成报告失败:', error);
      throw new Error(`生成报告失败: ${error.message}`);
    }
  }
}

module.exports = StatisticsService;
