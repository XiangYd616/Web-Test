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

type ForecastOptions = {
  horizon?: number;
  smoothing?: boolean;
  seasonality?: boolean;
};

type AnomalyOptions = {
  severity?: 'high' | 'medium' | 'low';
};

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
      return next(error);
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
      return next(error);
    }
  }

  async analyzePerformance(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: PerformanceFilter;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行性能分析');
      }

      const result = await advancedAnalyticsService.performPerformanceAnalysis(
        dataPoints,
        options as PerformanceFilter
      );
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async generateInsights(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const {
        dataPoints,
        dataType,
        timeRange = '7d',
      } = req.body as {
        dataPoints?: unknown[];
        dataType?: string;
        timeRange?: string;
      };

      if (!dataType) {
        return res.validationError([], '需要指定数据类型');
      }

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) {
        return res.validationError([], '需要提供数据点用于洞察生成');
      }

      const result = await advancedAnalyticsService.generateInsights(dataPoints, {
        context: `timeRange:${timeRange}`,
        type: dataType as 'trend' | 'anomaly' | 'opportunity' | 'risk',
      });
      return res.success(result);
    } catch (error) {
      next(error);
      return undefined;
    }
  }

  async generateForecast(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: ForecastOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行预测分析');
      }

      const forecast = await advancedAnalyticsService.performTrendAnalysis(dataPoints, {
        predictionDays: options.horizon ?? 7,
        smoothing: options.smoothing,
        seasonality: options.seasonality,
      });
      return res.success(forecast);
    } catch (error) {
      next(error);
      return undefined;
    }
  }

  async detectAnomalies(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: AnomalyOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 3) {
        return res.validationError([], '需要至少3个数据点进行异常检测');
      }

      const result = await advancedAnalyticsService.generateInsights(dataPoints, {
        type: 'anomaly',
        severity: options.severity || 'medium',
      });
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async healthCheck(_req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    return res.success({ status: 'ok', timestamp: new Date().toISOString() });
  }

  async getAvailableMetrics(category: string | undefined, res: ApiResponse) {
    const metrics = {
      performance: ['response_time', 'throughput', 'error_rate'],
      usage: ['requests', 'users', 'sessions'],
      system: ['cpu', 'memory', 'disk'],
    } as Record<string, string[]>;

    if (category && metrics[category]) {
      return res.success(metrics[category]);
    }

    return res.success(metrics);
  }

  async getAnalysisReports(params: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return {
      reports: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  async createAnalysisReport(_req: AuthRequest, res: ApiResponse) {
    return res.created({ id: `report_${Date.now()}` }, '分析报告创建成功');
  }

  async getAnalysisReport(_id: string) {
    return null;
  }

  async exportAnalysisReport(_id: string, _format: string, _options: Record<string, unknown>) {
    return JSON.stringify({ message: '暂未生成报告内容' });
  }

  async getSystemInsights(_params: { category?: string; timeRange?: string }) {
    return [];
  }

  async generateDashboardData(_req: AuthRequest, res: ApiResponse) {
    return res.success({ widgets: [] });
  }
}

module.exports = new AdvancedAnalyticsController();
