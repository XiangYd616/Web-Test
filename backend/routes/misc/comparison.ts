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
import { query } from '../../config/database';
import ComparisonAnalyzer from '../../utils/ComparisonAnalyzer';
import Logger from '../../utils/logger';
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

interface ComparisonRequest {
  currentTestId: string;
  previousTestId: string;
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

type TestResultRow = {
  test_id: string;
  engine_type: string;
  test_url: string | null;
  created_at: Date;
  completed_at: Date | null;
  score: number | null;
  summary: Record<string, unknown> | null;
};

const buildComparisonResult = (row: TestResultRow) => ({
  testId: row.test_id,
  type: row.engine_type,
  result: row.summary || {},
  metrics: row.summary || {},
  score: row.score || 0,
  createdAt: row.completed_at || row.created_at,
});

const buildTrendRecord = (row: TestResultRow, metrics?: string[]) => {
  const summary = row.summary || {};
  const filtered = metrics?.length
    ? metrics.reduce<Record<string, unknown>>((acc, key) => {
        if (summary[key] !== undefined) acc[key] = summary[key];
        return acc;
      }, {})
    : summary;

  return {
    testId: row.test_id,
    type: row.engine_type,
    result: filtered,
    metrics: filtered,
    score: row.score || 0,
    createdAt: row.completed_at || row.created_at,
  };
};

const getExecutionId = async (testId: string, userId: string): Promise<number | null> => {
  const result = await query('SELECT id FROM test_executions WHERE test_id = $1 AND user_id = $2', [
    testId,
    userId,
  ]);
  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

const getTestResultRecord = async (
  testId: string,
  userId: string
): Promise<TestResultRow | null> => {
  const result = await query(
    `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
            tr.score, tr.summary
     FROM test_executions te
     LEFT JOIN test_results tr ON tr.execution_id = te.id
     WHERE te.test_id = $1 AND te.user_id = $2
     ORDER BY tr.created_at DESC
     LIMIT 1`,
    [testId, userId]
  );
  return (result.rows[0] as TestResultRow) || null;
};

const getTestHistoryResults = async (
  testId: string,
  userId: string,
  period: string
): Promise<TestResultRow[]> => {
  const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
  const result = await query(
    `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
            tr.score, tr.summary
     FROM test_executions te
     LEFT JOIN test_results tr ON tr.execution_id = te.id
     WHERE te.user_id = $1 AND te.test_id = $2 AND te.created_at >= NOW() - ($3 || ' days')::interval
     ORDER BY te.created_at ASC`,
    [userId, testId, String(days)]
  );

  return result.rows as TestResultRow[];
};

const getTestHistoryPaged = async (
  testId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<{ results: TestResultRow[]; total: number; hasMore: boolean }> => {
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM test_executions te
     WHERE te.user_id = $1 AND te.test_id = $2`,
    [userId, testId]
  );
  const total = countResult.rows[0]?.total || 0;

  const result = await query(
    `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
            tr.score, tr.summary
     FROM test_executions te
     LEFT JOIN test_results tr ON tr.execution_id = te.id
     WHERE te.user_id = $1 AND te.test_id = $2
     ORDER BY te.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, testId, limit, offset]
  );

  return {
    results: result.rows as TestResultRow[],
    total,
    hasMore: offset + limit < total,
  };
};

const getComparisonHistory = async (
  userId: string,
  limit: number,
  offset: number
): Promise<{
  records: Array<{ id: string; name: string; type: string; createdAt: Date }>;
  total: number;
}> => {
  const countResult = await query(
    'SELECT COUNT(*)::int AS total FROM test_comparisons WHERE user_id = $1',
    [userId]
  );
  const total = countResult.rows[0]?.total || 0;

  const listResult = await query(
    `SELECT id, comparison_name, comparison_type, created_at
     FROM test_comparisons
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const records = listResult.rows.map(row => ({
    id: String(row.id),
    name: row.comparison_name as string,
    type: row.comparison_type as string,
    createdAt: row.created_at as Date,
  }));

  return { records, total };
};

/**
 * POST /api/comparison/compare
 * 对比两个测试结果
 */
router.post(
  '/compare',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { currentTestId, previousTestId }: ComparisonRequest = req.body;
      const userId = (req as { user: { id: string } }).user.id;

      if (!currentTestId || !previousTestId) {
        return res.status(400).json({
          success: false,
          message: '当前测试和之前测试都是必需的',
        });
      }

      const [currentRow, previousRow] = await Promise.all([
        getTestResultRecord(currentTestId, userId),
        getTestResultRecord(previousTestId, userId),
      ]);

      if (!currentRow || !previousRow) {
        return res.status(404).json({
          success: false,
          message: '测试结果不存在',
        });
      }

      if (currentRow.engine_type !== previousRow.engine_type) {
        return res.status(400).json({
          success: false,
          message: '只能对比相同类型的测试结果',
        });
      }

      const comparison = analyzer.compare(
        buildComparisonResult(currentRow),
        buildComparisonResult(previousRow)
      );

      const result: ComparisonResult = {
        id: `comparison_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        currentResult: {
          id: currentRow.test_id,
          testType: currentRow.engine_type,
          url: currentRow.test_url || '',
          score: Number(currentRow.score || 0),
          timestamp: currentRow.completed_at || currentRow.created_at,
          metrics: currentRow.summary || {},
          issues: [],
        },
        previousResult: {
          id: previousRow.test_id,
          testType: previousRow.engine_type,
          url: previousRow.test_url || '',
          score: Number(previousRow.score || 0),
          timestamp: previousRow.completed_at || previousRow.created_at,
          metrics: previousRow.summary || {},
          issues: [],
        },
        comparison,
        timestamp: new Date(),
      };

      const [currentExecutionId, previousExecutionId] = await Promise.all([
        getExecutionId(currentTestId, userId),
        getExecutionId(previousTestId, userId),
      ]);

      if (currentExecutionId && previousExecutionId) {
        const comparisonName = `${currentTestId} vs ${previousTestId}`;
        const insertResult = await query(
          `INSERT INTO test_comparisons
            (user_id, comparison_name, execution_ids, comparison_type, comparison_data)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            userId,
            comparisonName,
            [currentExecutionId, previousExecutionId],
            currentRow.engine_type,
            JSON.stringify(result),
          ]
        );
        if (insertResult.rows[0]?.id) {
          result.id = String(insertResult.rows[0].id);
        }
      }

      Logger.info('测试对比完成', {
        comparisonId: result.id,
        currentScore: result.currentResult.score,
        previousScore: result.previousResult.score,
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
 * GET /api/comparison/history
 * 获取对比记录列表
 */
router.get(
  '/history',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { limit = 20, offset = 0 } = req.query;
    const userId = (req as { user: { id: string } }).user.id;

    try {
      const history = await getComparisonHistory(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: {
          records: history.records,
          total: history.total,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: offset + Number(limit) < history.total,
          },
        },
      });
    } catch (error) {
      Logger.error('获取对比记录失败', { error, userId });

      res.status(500).json({
        success: false,
        message: '获取对比记录失败',
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
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { testId, period, metrics }: TrendAnalysisRequest = req.body;
      const userId = (req as { user: { id: string } }).user.id;

      if (!testId || !period) {
        return res.status(400).json({
          success: false,
          message: '测试ID和时间周期是必需的',
        });
      }

      const history = await getTestHistoryResults(testId, userId, period);
      if (history.length < 2) {
        return res.status(400).json({
          success: false,
          message: '趋势分析需要至少2次测试结果',
        });
      }

      const trendAnalysis = analyzer.analyzeTrend(
        history.map(record => buildTrendRecord(record, metrics))
      );

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
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const userId = (req as { user: { id: string } }).user.id;

    try {
      const history = await getTestHistoryPaged(
        testId,
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: {
          testId,
          history: history.results,
          total: history.total,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: history.hasMore,
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
