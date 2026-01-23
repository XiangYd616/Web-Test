/**
 * 高级分析API路由
 * 提供趋势分析、对比分析、性能分析等功能
 */

import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
const advancedAnalyticsController = require('../../controllers/advancedAnalyticsController');
const { authMiddleware } = require('../../middleware/auth');

interface TrendAnalysisRequest {
  dataPoints: Array<{ timestamp: Date; value: number; metadata?: Record<string, unknown> }>;
  options?: Record<string, unknown>;
}

interface ComparisonAnalysisRequest {
  baseline: unknown[];
  comparison: unknown[];
  options?: Record<string, unknown>;
}

interface PerformanceAnalysisRequest {
  dataPoints: Array<{ timestamp: Date; value: number; metadata?: Record<string, unknown> }>;
  options?: Record<string, unknown>;
}

type AnalyticsRequest = express.Request & { user?: { id: string } };

type AnalyticsResponse = express.Response & {
  success: (data?: unknown, message?: string) => express.Response;
  created: (data?: unknown, message?: string) => express.Response;
  validationError: (
    errors: unknown[] | Record<string, unknown>,
    message?: string
  ) => express.Response;
};

const router = express.Router();

// 应用认证中间件
router.use(authMiddleware);

/**
 * POST /api/system/analytics/trend
 * 趋势分析
 */
router.post(
  '/trend',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const request: TrendAnalysisRequest = req.body;

      // 验证请求参数
      if (!Array.isArray(request.dataPoints) || request.dataPoints.length < 2) {
        return res.status(400).json({
          success: false,
          message: '需要至少2个数据点进行趋势分析',
        });
      }

      return advancedAnalyticsController.analyzeTrend(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '趋势分析失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/compare
 * 对比分析
 */
router.post(
  '/compare',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const request: ComparisonAnalysisRequest = req.body;

      // 验证请求参数
      if (!request.baseline || !request.comparison) {
        return res.status(400).json({
          success: false,
          message: '需要提供基准数据和对比数据',
        });
      }

      return advancedAnalyticsController.analyzeComparison(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '对比分析失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/performance
 * 性能指标分析
 */
router.post(
  '/performance',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const request: PerformanceAnalysisRequest = req.body;

      // 验证请求参数
      if (!Array.isArray(request.dataPoints) || request.dataPoints.length < 2) {
        return res.status(400).json({
          success: false,
          message: '需要至少2个数据点进行性能分析',
        });
      }

      const result = await advancedAnalyticsController.analyzePerformance(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
      return result;
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '性能分析失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/analytics/metrics
 * 获取可用指标
 */
router.get(
  '/metrics',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { category } = req.query;

      return advancedAnalyticsController.getAvailableMetrics(
        category as string,
        res as AnalyticsResponse
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取可用指标失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/forecast
 * 预测分析
 */
router.post(
  '/forecast',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { dataPoints, options = {} } = req.body;

      if (!Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.status(400).json({
          success: false,
          message: '需要至少2个数据点进行预测分析',
        });
      }

      req.body = { dataPoints, options };
      return advancedAnalyticsController.generateForecast(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '预测分析失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/anomaly
 * 异常检测
 */
router.post(
  '/anomaly',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { dataPoints, options = {} } = req.body;

      if (!Array.isArray(dataPoints) || dataPoints.length < 3) {
        return res.status(400).json({
          success: false,
          message: '需要至少3个数据点进行异常检测',
        });
      }

      req.body = { dataPoints, options };
      return advancedAnalyticsController.detectAnomalies(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '异常检测失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/analytics/reports
 * 获取分析报告列表
 */
router.get(
  '/reports',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { type, status, page = 1, limit = 20 } = req.query;

      const reports = await advancedAnalyticsController.getAnalysisReports({
        type: type as string,
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取分析报告列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/reports
 * 创建分析报告
 */
router.post(
  '/reports',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { name, type, config, schedule: _schedule } = req.body;

      if (!name || !type || !config) {
        return res.status(400).json({
          success: false,
          message: '名称、类型和配置是必需的',
        });
      }

      return advancedAnalyticsController.createAnalysisReport(
        req as AnalyticsRequest,
        res as AnalyticsResponse
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建分析报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/analytics/reports/:id
 * 获取分析报告详情
 */
router.get(
  '/reports/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;

      const report = await advancedAnalyticsController.getAnalysisReport(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '分析报告不存在',
        });
      }

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取分析报告详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/reports/:id/export
 * 导出分析报告
 */
router.post(
  '/reports/:id/export',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { format = 'json', options } = req.body;

      const exportData = await advancedAnalyticsController.exportAnalysisReport(
        id,
        format,
        options
      );

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics_report_${id}.${format}"`
      );

      return res.send(exportData);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '导出分析报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/analytics/insights
 * 获取系统洞察
 */
router.get(
  '/insights',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { category, timeRange = '24h' } = req.query;

      const insights = await advancedAnalyticsController.getSystemInsights({
        category: category as string,
        timeRange: timeRange as string,
      });

      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取系统洞察失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/analytics/dashboard
 * 生成仪表板数据
 */
router.post(
  '/dashboard',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { widgets } = req.body;

      if (!Array.isArray(widgets) || widgets.length === 0) {
        return res.status(400).json({
          success: false,
          message: '组件列表不能为空',
        });
      }

      return advancedAnalyticsController.generateDashboardData(
        req as AnalyticsRequest,
        res as AnalyticsResponse
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '生成仪表板数据失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/analytics/health
 * 分析服务健康检查
 */
router.get(
  '/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      return advancedAnalyticsController.healthCheck(
        req as AnalyticsRequest,
        res as AnalyticsResponse,
        () => undefined
      );
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '分析服务健康检查失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
