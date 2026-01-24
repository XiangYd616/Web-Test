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
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import asyncHandler from '../../middleware/asyncHandler';
import comparisonRepository from '../../repositories/comparisonRepository';
import testService from '../../services/testing/testService';
import ComparisonAnalyzer from '../../utils/ComparisonAnalyzer';
import { toDate } from '../../utils/dateUtils';
import Logger from '../../utils/logger';
const { authMiddleware } = require('../../middleware/auth');

interface ComparisonRequest {
  currentTestId: string;
  previousTestId: string;
}

type TestResult = {
  id: string;
  testType: string;
  url: string;
  score: number;
  timestamp: Date;
  metrics: Record<string, unknown>;
  issues: unknown[];
};

interface TrendAnalysisRequest {
  testId: string;
  period: string;
  metrics?: string[];
}

interface ComparisonResult {
  id: string;
  currentResult: TestResult;
  previousResult: TestResult;
  comparison: ReturnType<ComparisonAnalyzer['compare']>;
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
  createdAt: toDate(row.completed_at || row.created_at).toISOString(),
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
    createdAt: toDate(row.completed_at || row.created_at).toISOString(),
  };
};

const getExecutionId = async (testId: string, userId: string): Promise<number | null> => {
  return testService.getExecutionIdForTest(testId, userId);
};

const getTestResultRecord = async (
  testId: string,
  userId: string
): Promise<TestResultRow | null> => {
  return testService.getTestHistorySummary(testId, userId);
};

const getTestHistoryResults = async (
  testId: string,
  userId: string,
  period: string
): Promise<TestResultRow[]> => {
  return testService.getTestHistoryByPeriod(testId, userId, period);
};

const getTestHistoryPaged = async (
  testId: string,
  userId: string,
  limit: number,
  offset: number
): Promise<{ results: TestResultRow[]; total: number; hasMore: boolean }> => {
  return testService.getTestHistoryPaged(testId, userId, limit, offset);
};

const getComparisonHistory = async (
  userId: string,
  limit: number,
  offset: number
): Promise<{
  records: Array<{ id: string; name: string; type: string; createdAt: Date }>;
  total: number;
}> => {
  const result = await comparisonRepository.getComparisonHistory(userId, limit, offset);
  const records = result.rows.map(row => ({
    id: String(row.id),
    name: row.comparison_name as string,
    type: row.comparison_type as string,
    createdAt: toDate(row.created_at),
  }));

  return { records, total: result.total };
};

/**
 * POST /api/comparison/compare
 * 对比两个测试结果
 */
router.post(
  '/compare',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { currentTestId, previousTestId }: ComparisonRequest = req.body;
    const userId = (req as { user: { id: string } }).user.id;

    if (!currentTestId || !previousTestId) {
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        '当前测试和之前测试都是必需的',
        undefined,
        400
      );
    }

    const [currentRow, previousRow] = await Promise.all([
      getTestResultRecord(currentTestId, userId),
      getTestResultRecord(previousTestId, userId),
    ]);

    if (!currentRow || !previousRow) {
      return res.error(StandardErrorCode.NOT_FOUND, '测试结果不存在', undefined, 404);
    }

    if (currentRow.engine_type !== previousRow.engine_type) {
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        '只能对比相同类型的测试结果',
        undefined,
        400
      );
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
      const comparisonId = await comparisonRepository.insertComparison({
        userId,
        comparisonName,
        executionIds: [currentExecutionId, previousExecutionId],
        comparisonType: currentRow.engine_type,
        comparisonData: result as unknown as Record<string, unknown>,
      });
      if (comparisonId) {
        result.id = comparisonId;
      }
    }

    const scoreChange = result.currentResult.score - result.previousResult.score;

    Logger.info('测试对比完成', {
      comparisonId: result.id,
      currentScore: result.currentResult.score,
      previousScore: result.previousResult.score,
      scoreChange,
    });

    return res.success(result);
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
    const limitValue = Number(limit) || 20;
    const offsetValue = Number(offset) || 0;
    const history = await getComparisonHistory(userId, limitValue, offsetValue);

    return res.success({
      records: history.records,
      total: history.total,
      pagination: {
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < history.total,
      },
    });
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
    const { testId, period, metrics }: TrendAnalysisRequest = req.body;
    const userId = (req as { user: { id: string } }).user.id;

    if (!testId || !period) {
      return res.error(StandardErrorCode.INVALID_INPUT, '测试ID和时间周期是必需的', undefined, 400);
    }

    const history = await getTestHistoryResults(testId, userId, period);
    if (history.length < 2) {
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        '趋势分析需要至少2次测试结果',
        undefined,
        400
      );
    }

    const trendAnalysis = analyzer.analyzeTrend(
      history.map(record => buildTrendRecord(record, metrics))
    );

    if ('error' in trendAnalysis) {
      return res.error(StandardErrorCode.INVALID_INPUT, trendAnalysis.error, undefined, 400);
    }

    const result: TrendAnalysisResult = {
      testId,
      period,
      dataPoints: history.map(record => ({
        timestamp: record.completed_at || record.created_at,
        score: record.score || 0,
        metrics: record.summary || {},
      })),
      trend: {
        direction: 'stable',
        scoreTrend: 0,
        confidence: 0,
      },
      insights: [],
      recommendations: [],
    };

    Logger.info('趋势分析完成', {
      testId,
      period,
      trendDirection: result.trend.direction,
      scoreTrend: result.trend.scoreTrend,
    });

    return res.success(result);
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
    const history = await getTestHistoryPaged(
      testId,
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return res.success({
      testId,
      history: history.results,
      total: history.total,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: history.hasMore,
      },
    });
  })
);

/**
 * POST /api/comparison/benchmark
 * 基准测试对比
 */
router.post(
  '/benchmark',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testResult, benchmarkType } = req.body;

    if (!testResult || !benchmarkType) {
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        '测试结果和基准类型是必需的',
        undefined,
        400
      );
    }

    const benchmarkComparison = await analyzer.compareToBenchmark(testResult, benchmarkType);

    return res.success(benchmarkComparison);
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
    const benchmarks = await analyzer.getAvailableBenchmarks(testType as string);

    return res.success(benchmarks);
  })
);

/**
 * POST /api/comparison/summary
 * 生成对比摘要
 */
router.post(
  '/summary',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { comparisons, groupBy } = req.body;

    if (!Array.isArray(comparisons) || comparisons.length === 0) {
      return res.error(StandardErrorCode.INVALID_INPUT, '对比数组不能为空', undefined, 400);
    }

    const summary = await analyzer.generateComparisonSummary(comparisons, groupBy);

    return res.success(summary);
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
    const metrics = await analyzer.getComparisonMetrics(testType as string);

    return res.success(metrics);
  })
);

/**
 * POST /api/comparison/export
 * 导出对比报告
 */
router.post(
  '/export',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { comparisonId, format = 'json', options } = req.body;
    const hasInlineComparisons = Boolean(options?.comparisons || options?.comparison);

    if (!comparisonId && !hasInlineComparisons) {
      return res.error(StandardErrorCode.INVALID_INPUT, '对比ID或对比数据是必需的', undefined, 400);
    }

    const exportData = await analyzer.exportComparisonReport(comparisonId || '', format, options);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comparison_${comparisonId || Date.now()}.${format}"`
    );

    return res.send(exportData);
  })
);

export default router;
