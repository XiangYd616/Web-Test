/**
 * 分析控制器
 * 职责: 处理分析相关的HTTP请求
 *
 * 规范:
 * - 只负责请求处理和响应格式化
 * - 业务逻辑委托给Service层
 * - 使用统一的响应格式
 */

import type { NextFunction, Request, Response } from 'express';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';

const analyticsService = require('../services/analytics/analyticsService');

type AuthRequest = Request & { user?: { id: string } };

type ApiResponse = Response & {
  success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
  error: (code: string, message?: string, details?: unknown, statusCode?: number) => Response;
};

const handleControllerError = (res: ApiResponse, error: unknown, message = '请求处理失败') => {
  return res.error(
    StandardErrorCode.INTERNAL_SERVER_ERROR,
    message,
    error instanceof Error ? error.message : String(error),
    500
  );
};

type AnalyticsQuery = {
  dateRange?: string | number;
  period?: string;
  testId?: string;
};

type ExportBody = {
  format?: 'json' | 'csv' | 'pdf';
  dateRange?: number;
  includeCharts?: boolean;
};

class AnalyticsController {
  /**
   * 获取分析摘要
   * GET /api/analytics/summary
   */
  async getSummary(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { dateRange = 30 } = req.query as AnalyticsQuery;
      const userId = req.user?.id;

      const summary = await analyticsService.getSummary({
        userId,
        dateRange: parseInt(String(dateRange), 10),
      });

      return res.success(summary);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取性能趋势
   * GET /api/analytics/performance-trends
   */
  async getPerformanceTrends(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { period = '30d' } = req.query as AnalyticsQuery;
      const userId = req.user?.id;

      const trends = await analyticsService.getPerformanceTrends({
        userId,
        period,
      });

      return res.success(trends);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取智能建议
   * GET /api/analytics/recommendations
   * GET /api/analytics/recommendations/:testId
   */
  async getRecommendations(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId?: string };
      const userId = req.user?.id;

      const recommendations = await analyticsService.getRecommendations({
        userId,
        testId,
      });

      return res.success({ recommendations });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * 导出分析报告
   * POST /api/analytics/export
   */
  async exportReport(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { format = 'json', dateRange = 30, includeCharts = true } = req.body as ExportBody;
      const userId = req.user?.id;

      const report = await analyticsService.exportReport({
        userId,
        format,
        dateRange,
        includeCharts,
      });

      const contentTypes: Record<string, string> = {
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
      return handleControllerError(res, error);
    }
  }

  /**
   * 获取实时统计
   * GET /api/analytics/realtime
   */
  async getRealTimeStats(req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const userId = req.user?.id;
      const stats = await analyticsService.getRealTimeStats({ userId });
      return res.success(stats);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }
}

module.exports = new AnalyticsController();
