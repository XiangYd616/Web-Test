/**
 * 测试对比API路由
 *
 * 文件路径: backend/routes/comparison.js
 * 创建时间: 2025-11-14
 *
 * 端点:
 * - POST   /api/comparison/compare     - 对比两个测试
 * - POST   /api/comparison/trend       - 趋势分析
 * - GET    /api/comparison/history/:testId - 获取测试历史
 */

import express from 'express';
import ComparisonAnalyzer from '../../utils/ComparisonAnalyzer';
import Logger from '../../utils/logger';

interface TestResult {
  id: string;
  testType: string;
  url: string;
  score: number;
  timestamp: Date;
  metrics: Record<string, unknown>;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

interface ComparisonRequest {
  currentResult: TestResult;
  previousResult: TestResult;
}

interface TrendAnalysisRequest {
  testId: string;
  period: string;
  metrics?: string[];
}

interface ComparisonResult {
  id: string;
  currentResult: TestResult;
  previousResult: TestResult;
  comparison: {
    scoreChange: number;
    scoreChangePercent: number;
    improved: boolean;
    newIssues: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    resolvedIssues: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    metricChanges: Record<
      string,
      {
        current: unknown;
        previous: unknown;
        change: number;
        changePercent: number;
      }
    >;
  };
  timestamp: Date;
}

interface TrendAnalysisResult {
  testId: string;
  period: string;
  dataPoints: Array<{
    timestamp: Date;
    score: number;
    metrics: Record<string, unknown>;
  }>;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    scoreTrend: number;
    confidence: number;
  };
  insights: string[];
  recommendations: string[];
}

const router = express.Router();
const analyzer = new ComparisonAnalyzer();

/**
 * POST /api/comparison/compare
 * 对比两个测试结果
 */
router.post(
  '/compare',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { currentResult, previousResult }: ComparisonRequest = req.body;

      if (!currentResult || !previousResult) {
        return res.status(400).json({
          success: false,
          message: '当前结果和之前结果都是必需的',
        });
      }

      // 验证测试类型是否相同
      if (currentResult.testType !== previousResult.testType) {
        return res.status(400).json({
          success: false,
          message: '只能对比相同类型的测试结果',
        });
      }

      const comparison = await analyzer.compareResults(currentResult, previousResult);

      const result: ComparisonResult = {
        id: `comparison_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        currentResult,
        previousResult,
        comparison,
        timestamp: new Date(),
      };

      Logger.info('测试对比完成', {
        comparisonId: result.id,
        currentScore: currentResult.score,
        previousScore: previousResult.score,
        scoreChange: comparison.scoreChange,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      Logger.error('测试对比失败', { error, body: req.body });

      res.status(500).json({
        success: false,
        message: '测试对比失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/comparison/trend
 * 趋势分析
 */
router.post(
  '/trend',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { testId, period, metrics }: TrendAnalysisRequest = req.body;

      if (!testId || !period) {
        return res.status(400).json({
          success: false,
          message: '测试ID和时间周期是必需的',
        });
      }

      const trendAnalysis = await analyzer.analyzeTrend(testId, period, metrics);

      const result: TrendAnalysisResult = {
        testId,
        period,
        dataPoints: trendAnalysis.dataPoints || [],
        trend: trendAnalysis.trend || {
          direction: 'stable',
          scoreTrend: 0,
          confidence: 0,
        },
        insights: trendAnalysis.insights || [],
        recommendations: trendAnalysis.recommendations || [],
      };

      Logger.info('趋势分析完成', {
        testId,
        period,
        trendDirection: result.trend.direction,
        scoreTrend: result.trend.scoreTrend,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      Logger.error('趋势分析失败', { error, testId: req.body.testId });

      res.status(500).json({
        success: false,
        message: '趋势分析失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/comparison/history/:testId
 * 获取测试历史
 */
router.get(
  '/history/:testId',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    try {
      const history = await analyzer.getTestHistory(testId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        data: {
          testId,
          history: history.results || [],
          total: history.total || 0,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: history.hasMore || false,
          },
        },
      });
    } catch (error) {
      Logger.error('获取测试历史失败', { error, testId });

      res.status(500).json({
        success: false,
        message: '获取测试历史失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/comparison/benchmark
 * 基准测试对比
 */
router.post(
  '/benchmark',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { testResult, benchmarkType } = req.body;

      if (!testResult || !benchmarkType) {
        return res.status(400).json({
          success: false,
          message: '测试结果和基准类型是必需的',
        });
      }

      const benchmarkComparison = await analyzer.compareToBenchmark(testResult, benchmarkType);

      res.json({
        success: true,
        data: benchmarkComparison,
      });
    } catch (error) {
      Logger.error('基准测试对比失败', { error, benchmarkType: req.body.benchmarkType });

      res.status(500).json({
        success: false,
        message: '基准测试对比失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/comparison/benchmarks
 * 获取可用基准测试
 */
router.get(
  '/benchmarks',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testType } = req.query;

    try {
      const benchmarks = await analyzer.getAvailableBenchmarks(testType as string);

      res.json({
        success: true,
        data: benchmarks,
      });
    } catch (error) {
      Logger.error('获取基准测试失败', { error, testType: req.query.testType });

      res.status(500).json({
        success: false,
        message: '获取基准测试失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/comparison/summary
 * 生成对比摘要
 */
router.post(
  '/summary',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { comparisons, groupBy } = req.body;

      if (!Array.isArray(comparisons) || comparisons.length === 0) {
        return res.status(400).json({
          success: false,
          message: '对比数组不能为空',
        });
      }

      const summary = await analyzer.generateComparisonSummary(comparisons, groupBy);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      Logger.error('生成对比摘要失败', { error, comparisonsCount: req.body.comparisons?.length });

      res.status(500).json({
        success: false,
        message: '生成对比摘要失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/comparison/metrics
 * 获取对比指标
 */
router.get(
  '/metrics',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testType } = req.query;

    try {
      const metrics = await analyzer.getComparisonMetrics(testType as string);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      Logger.error('获取对比指标失败', { error, testType: req.query.testType });

      res.status(500).json({
        success: false,
        message: '获取对比指标失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/comparison/export
 * 导出对比报告
 */
router.post(
  '/export',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { comparisonId, format = 'json', options } = req.body;

      if (!comparisonId) {
        return res.status(400).json({
          success: false,
          message: '对比ID是必需的',
        });
      }

      const exportData = await analyzer.exportComparisonReport(comparisonId, format, options);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="comparison_${comparisonId}.${format}"`
      );

      res.send(exportData);
    } catch (error) {
      Logger.error('导出对比报告失败', { error, comparisonId: req.body.comparisonId });

      res.status(500).json({
        success: false,
        message: '导出对比报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
