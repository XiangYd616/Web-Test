/**
 * 性能基准测试数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../../config/database';
import type {
  BaselineComparison,
  BenchmarkConfig,
  BenchmarkResult,
  PerformanceData,
} from '../../performance/services/PerformanceBenchmarkService';
import { toDate, toOptionalDate } from '../../utils/dateUtils';

export type BenchmarkRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  metrics: unknown;
  thresholds: unknown;
  test_suite: unknown;
  environment: string;
  schedule?: unknown;
  notifications: unknown;
  created_at?: Date;
  updated_at?: Date;
};

export type BaselineRow = {
  benchmark_id: string;
  baseline_data: unknown;
  created_at?: Date;
  updated_at?: Date;
};

export type BenchmarkResultRow = {
  id: string;
  benchmark_id: string;
  status: string;
  environment: string;
  executed_at: Date;
  duration: number;
  scores: unknown;
  metrics: unknown;
  comparison?: unknown;
  recommendations: unknown;
  artifacts: unknown;
  metadata: unknown;
  created_at?: Date;
};

type RawRow = Record<string, unknown>;

type BenchmarkFilters = {
  benchmarkIds?: string[];
  start?: Date;
  end?: Date;
  limit?: number;
};

const parseJsonValue = <T>(value: unknown, fallback: T): T => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value !== null && value !== undefined) {
    return value as T;
  }
  return fallback;
};

const normalizePerformanceData = (value: unknown): PerformanceData => {
  const raw = parseJsonValue<Record<string, unknown> | null>(value, null);
  if (!raw || typeof raw !== 'object') {
    return { timestamp: new Date(), values: {}, metadata: {} };
  }
  const timestamp = toOptionalDate(raw.timestamp) ?? new Date();
  return {
    timestamp,
    values: parseJsonValue<Record<string, number>>(raw.values, {}),
    metadata: parseJsonValue<Record<string, unknown>>(raw.metadata, {}),
  };
};

const normalizeComparison = (value: unknown): BaselineComparison | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = parseJsonValue<Record<string, unknown> | null>(value, null);
  if (!raw) {
    return null;
  }
  return {
    baseline: normalizePerformanceData(raw.baseline),
    current: normalizePerformanceData(raw.current),
    changes: parseJsonValue(raw.changes, {}),
    trend: (raw.trend as BaselineComparison['trend']) ?? 'stable',
  };
};

const mapBenchmarkRow = (row: RawRow): BenchmarkConfig => {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : '',
    category: row.category as BenchmarkConfig['category'],
    metrics: parseJsonValue(row.metrics, []),
    thresholds: parseJsonValue(row.thresholds, {
      excellent: {},
      good: {},
      needsImprovement: {},
      poor: {},
    }),
    testSuite: parseJsonValue(row.test_suite, []),
    environment: row.environment as BenchmarkConfig['environment'],
    schedule: parseJsonValue(row.schedule, undefined),
    notifications: parseJsonValue(row.notifications, []),
  };
};

const mapBenchmarkResultRow = (row: RawRow): BenchmarkResult => {
  return {
    id: String(row.id),
    benchmarkId: String(row.benchmark_id),
    name: String(row.name ?? ''),
    category: String(row.category ?? ''),
    environment: String(row.environment ?? ''),
    executedAt: toDate(row.executed_at),
    duration: Number(row.duration ?? 0),
    status: row.status as BenchmarkResult['status'],
    scores: parseJsonValue(row.scores, { overall: 0, grade: 'F', byCategory: {}, byMetric: {} }),
    metrics: normalizePerformanceData(row.metrics),
    comparison: normalizeComparison(row.comparison),
    recommendations: parseJsonValue(row.recommendations, []),
    artifacts: parseJsonValue(row.artifacts, []),
    metadata: parseJsonValue(row.metadata, {}),
  };
};

const performanceBenchmarkRepository = {
  async listBenchmarks(): Promise<BenchmarkConfig[]> {
    const result = await query('SELECT * FROM performance_benchmarks ORDER BY created_at ASC');
    return (result.rows as RawRow[]).map(mapBenchmarkRow);
  },

  async getBenchmark(benchmarkId: string): Promise<BenchmarkConfig | null> {
    const result = await query('SELECT * FROM performance_benchmarks WHERE id = $1', [benchmarkId]);
    const row = result.rows?.[0] as RawRow | undefined;
    return row ? mapBenchmarkRow(row) : null;
  },

  async upsertBenchmark(benchmark: BenchmarkConfig): Promise<void> {
    await query(
      `INSERT INTO performance_benchmarks
        (id, name, description, category, metrics, thresholds, test_suite, environment, schedule, notifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         metrics = EXCLUDED.metrics,
         thresholds = EXCLUDED.thresholds,
         test_suite = EXCLUDED.test_suite,
         environment = EXCLUDED.environment,
         schedule = EXCLUDED.schedule,
         notifications = EXCLUDED.notifications,
         updated_at = CURRENT_TIMESTAMP`,
      [
        benchmark.id,
        benchmark.name,
        benchmark.description || null,
        benchmark.category,
        JSON.stringify(benchmark.metrics || []),
        JSON.stringify(benchmark.thresholds || {}),
        JSON.stringify(benchmark.testSuite || []),
        benchmark.environment,
        benchmark.schedule ? JSON.stringify(benchmark.schedule) : null,
        JSON.stringify(benchmark.notifications || []),
      ]
    );
  },

  async deleteBenchmark(benchmarkId: string): Promise<void> {
    await query('DELETE FROM performance_benchmarks WHERE id = $1', [benchmarkId]);
  },

  async listBaselines(): Promise<Array<{ benchmarkId: string; data: PerformanceData }>> {
    const result = await query('SELECT * FROM performance_baselines');
    return (result.rows as RawRow[]).map(row => ({
      benchmarkId: String(row.benchmark_id),
      data: normalizePerformanceData(row.baseline_data),
    }));
  },

  async getBaseline(benchmarkId: string): Promise<PerformanceData | null> {
    const result = await query(
      'SELECT baseline_data FROM performance_baselines WHERE benchmark_id = $1',
      [benchmarkId]
    );
    const row = result.rows?.[0] as RawRow | undefined;
    return row ? normalizePerformanceData(row.baseline_data) : null;
  },

  async upsertBaseline(benchmarkId: string, data: PerformanceData): Promise<void> {
    await query(
      `INSERT INTO performance_baselines (benchmark_id, baseline_data)
       VALUES ($1, $2)
       ON CONFLICT (benchmark_id)
       DO UPDATE SET baseline_data = EXCLUDED.baseline_data, updated_at = CURRENT_TIMESTAMP`,
      [benchmarkId, JSON.stringify(data)]
    );
  },

  async insertResult(result: BenchmarkResult): Promise<void> {
    await query(
      `INSERT INTO performance_benchmark_results
        (id, benchmark_id, status, environment, executed_at, duration, scores, metrics, comparison,
         recommendations, artifacts, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id)
       DO UPDATE SET
         status = EXCLUDED.status,
         environment = EXCLUDED.environment,
         executed_at = EXCLUDED.executed_at,
         duration = EXCLUDED.duration,
         scores = EXCLUDED.scores,
         metrics = EXCLUDED.metrics,
         comparison = EXCLUDED.comparison,
         recommendations = EXCLUDED.recommendations,
         artifacts = EXCLUDED.artifacts,
         metadata = EXCLUDED.metadata`,
      [
        result.id,
        result.benchmarkId,
        result.status,
        result.environment,
        result.executedAt,
        result.duration,
        JSON.stringify(result.scores),
        JSON.stringify(result.metrics),
        result.comparison ? JSON.stringify(result.comparison) : null,
        JSON.stringify(result.recommendations || []),
        JSON.stringify(result.artifacts || []),
        JSON.stringify(result.metadata || {}),
      ]
    );
  },

  async getResult(resultId: string): Promise<BenchmarkResult | null> {
    const result = await query(
      `SELECT r.*, b.name, b.category
       FROM performance_benchmark_results r
       LEFT JOIN performance_benchmarks b ON b.id = r.benchmark_id
       WHERE r.id = $1`,
      [resultId]
    );
    const row = result.rows?.[0] as RawRow | undefined;
    return row ? mapBenchmarkResultRow(row) : null;
  },

  async listResults(filters: BenchmarkFilters = {}): Promise<BenchmarkResult[]> {
    const clauses: string[] = [];
    const params: Array<string | number | Date | string[]> = [];

    if (filters.benchmarkIds && filters.benchmarkIds.length > 0) {
      params.push(filters.benchmarkIds);
      clauses.push(`r.benchmark_id = ANY($${params.length})`);
    }
    if (filters.start) {
      params.push(filters.start);
      clauses.push(`r.executed_at >= $${params.length}`);
    }
    if (filters.end) {
      params.push(filters.end);
      clauses.push(`r.executed_at <= $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    let limitClause = '';
    if (filters.limit) {
      params.push(filters.limit);
      limitClause = `LIMIT $${params.length}`;
    }

    const result = await query(
      `SELECT r.*, b.name, b.category
       FROM performance_benchmark_results r
       LEFT JOIN performance_benchmarks b ON b.id = r.benchmark_id
       ${whereClause}
       ORDER BY r.executed_at DESC
       ${limitClause}`,
      params
    );
    return (result.rows as RawRow[]).map(mapBenchmarkResultRow);
  },
};

export default performanceBenchmarkRepository;
