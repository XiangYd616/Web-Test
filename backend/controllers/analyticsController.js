/**
 * 分析控制器
 * 职责: 处理分析相关的HTTP请求
 * 
 * 规范:
 * - 只负责请求处理和响应格式化
 * - 业务逻辑委托给Service层
 * - 使用统一的响应格式
 */

const analyticsService = require('../services/analytics/analyticsService');
const { successResponse, errorResponse } = require('../utils/response');

class AnalyticsController {
  /**
   * 获取分析摘要
   * GET /api/analytics/summary
   */
  async getSummary(req, res, next) {
    try {
      const { dateRange = 30 } = req.query;
      const userId = req.user?.id;

      const summary = await analyticsService.getSummary({
        userId,
        dateRange: parseInt(dateRange),
      });

      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取性能趋势
   * GET /api/analytics/performance-trends
   */
  async getPerformanceTrends(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const userId = req.user?.id;

      const trends = await analyticsService.getPerformanceTrends({
        userId,
        period,
      });

      return successResponse(res, trends);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取智能建议
   * GET /api/analytics/recommendations
   * GET /api/analytics/recommendations/:testId
   */
  async getRecommendations(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user?.id;

      const recommendations = await analyticsService.getRecommendations({
        userId,
        testId,
      });

      return successResponse(res, { recommendations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出分析报告
   * POST /api/analytics/export
   */
  async exportReport(req, res, next) {
    try {
      const { format = 'json', dateRange = 30, includeCharts = true } = req.body;
      const userId = req.user?.id;

      const report = await analyticsService.exportReport({
        userId,
        format,
        dateRange,
        includeCharts,
      });

      const contentTypes = {
        json: 'application/json',
        csv: 'text/csv',
        pdf: 'application/pdf',
      };

      res.setHeader('Content-Type', contentTypes[format] || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-report-${Date.now()}.${format}"`
      );

      return res.send(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取实时统计
   * GET /api/analytics/realtime
   */
  async getRealTimeStats(req, res, next) {
    try {
      const userId = req.user?.id;
      const stats = await analyticsService.getRealTimeStats({ userId });
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
