import { query } from '../../config/database';

/** 安全 JSON 序列化：遇到循环引用时自动跳过 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
}

type ApiTestResultData = {
  testResultId: number;
  results: unknown;
  summary: Record<string, unknown>;
  config: Record<string, unknown>;
};

const apiTestResultRepository = {
  async upsert(data: ApiTestResultData): Promise<void> {
    await query(
      `INSERT INTO api_test_results (
         test_result_id,
         results,
         summary,
         config
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (test_result_id)
       DO UPDATE SET
         results = EXCLUDED.results,
         summary = EXCLUDED.summary,
         config = EXCLUDED.config,
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.testResultId,
        safeStringify(data.results ?? {}),
        safeStringify(data.summary ?? {}),
        safeStringify(data.config ?? {}),
      ]
    );
  },

  async getByTestResultId(testResultId: number): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT results, summary, config
       FROM api_test_results
       WHERE test_result_id = $1
       LIMIT 1`,
      [testResultId]
    );

    const row = (result.rows?.[0] || null) as {
      results?: unknown;
      summary?: unknown;
      config?: unknown;
    } | null;

    if (!row) {
      return null;
    }

    const summary =
      row.summary && typeof row.summary === 'object' && !Array.isArray(row.summary)
        ? (row.summary as Record<string, unknown>)
        : {};
    const config =
      row.config && typeof row.config === 'object' && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : {};

    return {
      results: row.results ?? {},
      summary,
      config,
    };
  },
};

export default apiTestResultRepository;
