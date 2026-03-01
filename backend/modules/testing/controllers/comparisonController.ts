/**
 * 测试对比控制器
 * 职责: 处理测试对比、趋势分析、基准测试等业务逻辑
 * 从 testing/routes/comparison.ts 中提取
 */

import type express from 'express';
import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import ComparisonAnalyzer from '../../utils/ComparisonAnalyzer';
import { toDate } from '../../utils/dateUtils';
import Logger from '../../utils/logger';
import comparisonRepository from '../repositories/comparisonRepository';
import testService from '../services/testService';

// ==================== 类型定义 ====================

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
  dataPoints: Array<{ timestamp: Date; score: number; metrics: Record<string, unknown> }>;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    scoreTrend: number;
    confidence: number;
  };
  insights: string[];
  recommendations: string[];
}

type TestResultRow = {
  test_id: string;
  engine_type: string;
  test_url: string | null;
  created_at: Date;
  completed_at: Date | null;
  score: number | null;
  summary: Record<string, unknown> | null;
};

// ==================== 内部工具函数 ====================

const analyzer = new ComparisonAnalyzer();

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
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
) => {
  return testService.getTestHistoryPaged(testId, userId, limit, offset);
};

const getComparisonHistory = async (
  userId: string,
  limit: number,
  offset: number,
  comparisonType?: string
) => {
  const result = await comparisonRepository.getComparisonHistory(
    userId,
    limit,
    offset,
    comparisonType
  );
  const records = result.rows.map(row => ({
    id: String(row.id),
    name: row.comparison_name as string,
    type: row.comparison_type as string,
    createdAt: toDate(row.created_at),
  }));
  return { records, total: result.total };
};

// ==================== 控制器方法 ====================

const compare = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { currentTestId, previousTestId }: ComparisonRequest = req.body;
  const userId = getUserId(req);

  if (!currentTestId || !previousTestId)
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '当前测试和之前测试都是必需的',
      undefined,
      400
    );

  const [currentRow, previousRow] = await Promise.all([
    getTestResultRecord(currentTestId, userId),
    getTestResultRecord(previousTestId, userId),
  ]);
  if (!currentRow || !previousRow)
    return res.error(StandardErrorCode.NOT_FOUND, '测试结果不存在', undefined, 404);
  if (currentRow.engine_type !== previousRow.engine_type)
    return res.error(StandardErrorCode.INVALID_INPUT, '只能对比相同类型的测试结果', undefined, 400);

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
    if (comparisonId) result.id = comparisonId;
  }

  const scoreChange = result.currentResult.score - result.previousResult.score;
  Logger.info('测试对比完成', {
    comparisonId: result.id,
    currentScore: result.currentResult.score,
    previousScore: result.previousResult.score,
    scoreChange,
  });

  return res.success(result);
};

const historyBenchmark = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  const { limit = 20, offset = 0 } = req.query;
  const userId = getUserId(req);
  const limitValue = Number(limit) || 20;
  const offsetValue = Number(offset) || 0;
  const history = await getComparisonHistory(userId, limitValue, offsetValue, 'benchmark');
  return res.success({
    records: history.records,
    total: history.total,
    pagination: {
      limit: limitValue,
      offset: offsetValue,
      hasMore: offsetValue + limitValue < history.total,
    },
  });
};

const historyList = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { limit = 20, offset = 0, comparisonType } = req.query;
  const userId = getUserId(req);
  const limitValue = Number(limit) || 20;
  const offsetValue = Number(offset) || 0;
  const history = await getComparisonHistory(
    userId,
    limitValue,
    offsetValue,
    typeof comparisonType === 'string' ? comparisonType : undefined
  );
  return res.success({
    records: history.records,
    total: history.total,
    pagination: {
      limit: limitValue,
      offset: offsetValue,
      hasMore: offsetValue + limitValue < history.total,
    },
  });
};

const trend = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testId, period, metrics }: TrendAnalysisRequest = req.body;
  const userId = getUserId(req);
  if (!testId || !period)
    return res.error(StandardErrorCode.INVALID_INPUT, '测试ID和时间周期是必需的', undefined, 400);

  const history = await getTestHistoryResults(testId, userId, period);
  if (history.length < 2)
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '趋势分析需要至少2次测试结果',
      undefined,
      400
    );

  const trendAnalysis = analyzer.analyzeTrend(
    history.map(record => buildTrendRecord(record, metrics))
  );
  if ('error' in trendAnalysis)
    return res.error(StandardErrorCode.INVALID_INPUT, trendAnalysis.error, undefined, 400);

  const result: TrendAnalysisResult = {
    testId,
    period,
    dataPoints: history.map(record => ({
      timestamp: record.completed_at || record.created_at,
      score: record.score || 0,
      metrics: record.summary || {},
    })),
    trend: { direction: 'stable', scoreTrend: 0, confidence: 0 },
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
};

const historyByTestId = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  const { testId } = req.params;
  const { limit = 20, offset = 0 } = req.query;
  const userId = getUserId(req);
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
};

const benchmark = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testResult, benchmarkType } = req.body;
  const userId = getUserId(req);
  if (!testResult || !benchmarkType)
    return res.error(StandardErrorCode.INVALID_INPUT, '测试结果和基准类型是必需的', undefined, 400);

  const testId = typeof testResult?.testId === 'string' ? testResult.testId : undefined;
  const executionId = testId ? await getExecutionId(testId, userId) : null;
  const benchmarkComparison = await analyzer.compareToBenchmark(
    { ...testResult, userId, executionId: executionId ?? undefined },
    benchmarkType
  );
  return res.success(benchmarkComparison);
};

const getBenchmarks = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testType } = req.query;
  const benchmarks = await analyzer.getAvailableBenchmarks(testType as string);
  return res.success(benchmarks);
};

const summary = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { comparisons, groupBy } = req.body;
  if (!Array.isArray(comparisons) || comparisons.length === 0)
    return res.error(StandardErrorCode.INVALID_INPUT, '对比数组不能为空', undefined, 400);
  const summaryResult = await analyzer.generateComparisonSummary(comparisons, groupBy);
  return res.success(summaryResult);
};

const getMetrics = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testType } = req.query;
  const metrics = await analyzer.getComparisonMetrics(testType as string);
  return res.success(metrics);
};

const exportReport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { comparisonId, format = 'json', options } = req.body;
  const hasInlineComparisons = Boolean(options?.comparisons || options?.comparison);
  if (!comparisonId && !hasInlineComparisons)
    return res.error(StandardErrorCode.INVALID_INPUT, '对比ID或对比数据是必需的', undefined, 400);

  const exportData = await analyzer.exportComparisonReport(comparisonId || '', format, options);
  const filename = `comparison_${comparisonId || Date.now()}.${format}`;
  return (res as express.Response & { downloadResponse?: Function }).downloadResponse?.(
    exportData as string | Buffer,
    filename,
    'application/octet-stream'
  );
};

const performanceTrend = async (
  req: AuthenticatedRequest,
  res: ApiResponse,
  _next: NextFunction
) => {
  const { url, limit = 30, workspaceId } = req.query;
  const userId = getUserId(req);
  if (!url || typeof url !== 'string')
    return res.error(StandardErrorCode.INVALID_INPUT, 'URL 参数是必需的', undefined, 400);

  const dataPoints = await testService.getPerformanceTrend(
    url,
    userId,
    typeof workspaceId === 'string' ? workspaceId : undefined,
    Math.min(Number(limit) || 30, 100)
  );
  if (dataPoints.length === 0) return res.success({ url, dataPoints: [], trend: null });

  const extractVitalValue = (wv: Record<string, unknown>, key: string): number | null => {
    const entry = wv[key];
    if (entry && typeof entry === 'object' && 'value' in (entry as Record<string, unknown>)) {
      const v = (entry as Record<string, unknown>).value;
      return typeof v === 'number' ? v : null;
    }
    return null;
  };

  const series = dataPoints.map(dp => ({
    testId: dp.testId,
    createdAt: dp.createdAt,
    score: dp.score,
    lcp: extractVitalValue(dp.webVitals, 'lcp'),
    fcp: extractVitalValue(dp.webVitals, 'fcp'),
    cls: extractVitalValue(dp.webVitals, 'cls'),
    inp: extractVitalValue(dp.webVitals, 'inp'),
    ttfb: extractVitalValue(dp.webVitals, 'ttfb'),
  }));

  const calcTrend = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null);
    if (valid.length < 2) return 'stable';
    const n = valid.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = valid.reduce((s, v) => s + v, 0);
    const xySum = valid.reduce((s, v, i) => s + i * v, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  };

  return res.success({
    url,
    dataPoints: series,
    trend: {
      lcp: calcTrend(series.map(s => s.lcp)),
      fcp: calcTrend(series.map(s => s.fcp)),
      cls: calcTrend(series.map(s => s.cls)),
      ttfb: calcTrend(series.map(s => s.ttfb)),
      score: calcTrend(series.map(s => s.score)),
    },
  });
};

export default {
  compare,
  historyBenchmark,
  historyList,
  trend,
  historyByTestId,
  benchmark,
  getBenchmarks,
  summary,
  getMetrics,
  exportReport,
  performanceTrend,
};
