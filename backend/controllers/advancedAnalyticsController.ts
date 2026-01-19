/**
 * 高级分析控制器
 * 职责: 处理趋势分析、对比分析、性能分析、洞察生成的HTTP请求
 */

import type { NextFunction, Request, Response } from 'express';

const advancedAnalyticsService = require('../services/analytics/advancedAnalyticsService');

type AuthRequest = Request & { user?: { id: string } };

type ApiResponse = Response & {
  success: (data?: unknown) => Response;
  validationError: (errors: unknown[], message?: string) => Response;
};

type TrendOptions = Record<string, unknown>;

type ComparisonOptions = Record<string, unknown>;

type PerformanceFilter = Record<string, unknown>;

class AdvancedAnalyticsController {
  async analyzeTrend(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: TrendOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行趋势分析');
      }

      const result = await advancedAnalyticsService.performTrendAnalysis(dataPoints, options);
      return res.success(result);
    } catch (error) {
      next(error);
    }
  }

  async analyzeComparison(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const {
        baseline,
        comparison,
        options = {},
      } = req.body as {
        baseline?: unknown[];
        comparison?: unknown[];
        options?: ComparisonOptions;
      };

      if (!baseline || !comparison || !Array.isArray(baseline) || !Array.isArray(comparison)) {
        return res.validationError([], '需要提供基准数据和对比数据');
      }

      const result = await advancedAnalyticsService.performComparisonAnalysis(
        baseline,
        comparison,
        options
      );
      return res.success(result);
    } catch (error) {
      next(error);
    }
  }

  async analyzePerformance(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { filter = {} } = req.body as { filter?: PerformanceFilter };
      const userId = req.user?.id;

      const result = await advancedAnalyticsService.analyzePerformanceMetrics(filter, userId);
      return res.success(result);
    } catch (error) {
      next(error);
    }
  }

  async generateInsights(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataType, timeRange = '7d' } = req.body as { dataType?: string; timeRange?: string };

      if (!dataType) {
        return res.validationError([], '需要指定数据类型');
      }

      const result = await advancedAnalyticsService.generateInsights(
        dataType,
        timeRange,
        req.user?.id
      );
      return res.success(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdvancedAnalyticsController();
