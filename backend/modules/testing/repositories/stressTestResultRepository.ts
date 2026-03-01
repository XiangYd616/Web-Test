import { query } from '../../config/database';

type StressTestResultData = {
  testId: string;
  userId?: string | null;
  testName?: string | null;
  url: string;
  config: Record<string, unknown>;
  status: string;
  results: Record<string, unknown> | null;
  totalRequests?: number | null;
  successfulRequests?: number | null;
  failedRequests?: number | null;
  successRate?: number | null;
  avgResponseTime?: number | null;
  minResponseTime?: number | null;
  maxResponseTime?: number | null;
  throughput?: number | null;
  startTime?: Date | null;
  endTime?: Date | null;
  duration?: number | null;
  errorMessage?: string | null;
  tags?: string[];
  environment?: string | null;
  metadata?: Record<string, unknown>;
};

const stressTestResultRepository = {
  async upsert(data: StressTestResultData): Promise<void> {
    await query(
      `INSERT INTO stress_test_results (
         test_id,
         user_id,
         test_name,
         url,
         config,
         status,
         results,
         total_requests,
         successful_requests,
         failed_requests,
         success_rate,
         avg_response_time,
         min_response_time,
         max_response_time,
         throughput,
         start_time,
         end_time,
         duration,
         error_message,
         tags,
         environment,
         metadata
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20, $21, $22
       )
       ON CONFLICT (test_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         test_name = EXCLUDED.test_name,
         url = EXCLUDED.url,
         config = EXCLUDED.config,
         status = EXCLUDED.status,
         results = EXCLUDED.results,
         total_requests = EXCLUDED.total_requests,
         successful_requests = EXCLUDED.successful_requests,
         failed_requests = EXCLUDED.failed_requests,
         success_rate = EXCLUDED.success_rate,
         avg_response_time = EXCLUDED.avg_response_time,
         min_response_time = EXCLUDED.min_response_time,
         max_response_time = EXCLUDED.max_response_time,
         throughput = EXCLUDED.throughput,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         duration = EXCLUDED.duration,
         error_message = EXCLUDED.error_message,
         tags = EXCLUDED.tags,
         environment = EXCLUDED.environment,
         metadata = EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.testId,
        data.userId ?? null,
        data.testName ?? null,
        data.url,
        JSON.stringify(data.config || {}),
        data.status,
        data.results ? JSON.stringify(data.results) : null,
        data.totalRequests ?? null,
        data.successfulRequests ?? null,
        data.failedRequests ?? null,
        data.successRate ?? null,
        data.avgResponseTime ?? null,
        data.minResponseTime ?? null,
        data.maxResponseTime ?? null,
        data.throughput ?? null,
        data.startTime ?? null,
        data.endTime ?? null,
        data.duration ?? null,
        data.errorMessage ?? null,
        data.tags ?? [],
        data.environment ?? null,
        JSON.stringify(data.metadata || {}),
      ]
    );
  },

  async getResultsByTestId(testId: string): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT results
       FROM stress_test_results
       WHERE test_id = $1
       LIMIT 1`,
      [testId]
    );

    const row = (result.rows?.[0] || null) as { results?: unknown } | null;
    if (!row) {
      return null;
    }

    const raw = row.results;
    if (!raw) {
      return null;
    }

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    }

    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    return null;
  },
};

export default stressTestResultRepository;
