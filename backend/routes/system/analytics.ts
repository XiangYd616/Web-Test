/**
 * 高级分析API路由
 * 提供趋势分析、对比分析、性能分析等功能
 */

import express from 'express';
import advancedAnalyticsController from '../../controllers/advancedAnalyticsController';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

interface TrendAnalysisRequest {
  metric: string;
  timeRange: string;
  granularity?: string;
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

interface ComparisonAnalysisRequest {
  datasets: Array<{
    name: string;
    data: unknown[];
    metadata?: Record<string, unknown>;
  }>;
  comparisonType: 'absolute' | 'relative' | 'statistical';
  metrics: string[];
  options?: Record<string, unknown>;
}

interface PerformanceAnalysisRequest {
  target: string;
  timeRange: string;
  benchmarks?: string[];
  metrics?: string[];
  options?: Record<string, unknown>;
}

interface TrendAnalysisResult {
  metric: string;
  timeRange: string;
  data: Array<{
    timestamp: Date;
    value: number;
    metadata?: Record<string, unknown>;
  }>;
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    confidence: number;
    seasonality?: {
      detected: boolean;
      pattern?: string;
      strength?: number;
    };
  };
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    outliers: number;
  };
  insights: string[];
  recommendations: string[];
}

interface ComparisonAnalysisResult {
  comparisonType: string;
  datasets: Array<{
    name: string;
    summary: Record<string, number>;
    statistics: Record<string, number>;
  }>;
  correlations: Array<{
    dataset1: string;
    dataset2: string;
    correlation: number;
    significance: number;
  }>;
  differences: Array<{
    metric: string;
    values: number[];
    significance: number;
    interpretation: string;
  }>;
  insights: string[];
  recommendations: string[];
}

interface PerformanceAnalysisResult {
  target: string;
  timeRange: string;
  metrics: Record<
    string,
    {
      current: number;
      baseline: number;
      change: number;
      changePercent: number;
      trend: string;
    }
  >;
  benchmarks: Array<{
    name: string;
    value: number;
    percentile: number;
    rating: 'excellent' | 'good' | 'average' | 'poor';
  }>;
  score: {
    overall: number;
    breakdown: Record<string, number>;
    rating: 'excellent' | 'good' | 'average' | 'poor';
  };
  insights: string[];
  recommendations: string[];
}

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
      if (!request.metric || !request.timeRange) {
        return res.status(400).json({
          success: false,
          message: '指标和时间范围是必需的',
        });
      }

      const result = await advancedAnalyticsController.analyzeTrend(req, res);

      res.json({
        success: true,
        data: result,
      });
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
      if (!request.datasets || request.datasets.length < 2) {
        return res.status(400).json({
          success: false,
          message: '至少需要两个数据集进行对比',
        });
      }

      const result = await advancedAnalyticsController.analyzeComparison(req, res);

      res.json({
        success: true,
        data: result,
      });
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
      if (!request.target || !request.timeRange) {
        return res.status(400).json({
          success: false,
          message: '目标和时间范围是必需的',
        });
      }

      const result = await advancedAnalyticsController.analyzePerformance(req, res);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
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

      const metrics = await advancedAnalyticsController.getAvailableMetrics(category as string);

      res.json({
        success: true,
        data: metrics,
      });
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
      const { metric, timeRange, horizon, method, options } = req.body;

      if (!metric || !timeRange || !horizon) {
        return res.status(400).json({
          success: false,
          message: '指标、时间范围和预测周期是必需的',
        });
      }

      const result = await advancedAnalyticsController.generateForecast(req, res);

      res.json({
        success: true,
        data: result,
      });
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
      const { metric, timeRange, sensitivity, method } = req.body;

      if (!metric || !timeRange) {
        return res.status(400).json({
          success: false,
          message: '指标和时间范围是必需的',
        });
      }

      const result = await advancedAnalyticsController.detectAnomalies(req, res);

      res.json({
        success: true,
        data: result,
      });
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
      const { name, type, config, schedule } = req.body;

      if (!name || !type || !config) {
        return res.status(400).json({
          success: false,
          message: '名称、类型和配置是必需的',
        });
      }

      const report = await advancedAnalyticsController.createAnalysisReport(req, res);

      res.status(201).json({
        success: true,
        message: '分析报告创建成功',
        data: report,
      });
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

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
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

      res.send(exportData);
    } catch (error) {
      res.status(500).json({
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
      const { widgets, timeRange, filters, refreshInterval } = req.body;

      if (!Array.isArray(widgets) || widgets.length === 0) {
        return res.status(400).json({
          success: false,
          message: '组件列表不能为空',
        });
      }

      const dashboardData = await advancedAnalyticsController.generateDashboardData(req, res);

      res.json({
        success: true,
        data: dashboardData,
      });
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
      const health = await advancedAnalyticsController.healthCheck();

      res.json({
        success: true,
        data: health,
      });
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
