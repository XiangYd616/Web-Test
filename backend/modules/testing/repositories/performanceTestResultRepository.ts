import { query } from '../../config/database';

type PerformanceTestResultData = {
  testResultId: number;
  webVitals: Record<string, unknown>;
  metrics: Record<string, unknown>;
  recommendations: unknown[];
  resources: Record<string, unknown>;
  httpInfo?: Record<string, unknown>;
};

const performanceTestResultRepository = {
  async upsert(data: PerformanceTestResultData): Promise<void> {
    await query(
      `INSERT INTO performance_test_results (
         test_result_id,
         web_vitals,
         metrics,
         recommendations,
         resources,
         http_info
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (test_result_id)
       DO UPDATE SET
         web_vitals = EXCLUDED.web_vitals,
         metrics = EXCLUDED.metrics,
         recommendations = EXCLUDED.recommendations,
         resources = EXCLUDED.resources,
         http_info = EXCLUDED.http_info,
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.testResultId,
        JSON.stringify(data.webVitals),
        JSON.stringify(data.metrics),
        JSON.stringify(data.recommendations),
        JSON.stringify(data.resources),
        JSON.stringify(data.httpInfo || {}),
      ]
    );
  },

  async getTrendByUrl(
    url: string,
    userId: string,
    workspaceId?: string,
    limit = 30
  ): Promise<
    Array<{
      testId: string;
      createdAt: string;
      score: number | null;
      webVitals: Record<string, unknown>;
      metrics: Record<string, unknown>;
    }>
  > {
    const params: Array<string | number> = [url];
    let scopeClause: string;
    if (workspaceId) {
      params.push(workspaceId);
      scopeClause = `te.workspace_id = $${params.length}`;
    } else {
      params.push(userId);
      scopeClause = `te.user_id = $${params.length}`;
    }
    params.push(limit);
    const result = await query(
      `SELECT te.test_id, te.created_at, tr.score,
              ptr.web_vitals, ptr.metrics
       FROM test_executions te
       JOIN test_results tr ON tr.execution_id = te.id
       JOIN performance_test_results ptr ON ptr.test_result_id = tr.id
       WHERE te.test_url = $1 AND ${scopeClause}
         AND te.engine_type = 'performance'
         AND te.status = 'completed'
       ORDER BY te.created_at ASC
       LIMIT $${params.length}`,
      params
    );
    return (result.rows || []).map((row: Record<string, unknown>) => {
      const parseJson = (val: unknown) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch {
            return {};
          }
        }
        return val && typeof val === 'object' ? val : {};
      };
      return {
        testId: String(row.test_id || ''),
        createdAt: String(row.created_at || ''),
        score: row.score != null ? Number(row.score) : null,
        webVitals: parseJson(row.web_vitals) as Record<string, unknown>,
        metrics: parseJson(row.metrics) as Record<string, unknown>,
      };
    });
  },

  async getByTestResultId(testResultId: number): Promise<Record<string, unknown> | null> {
    const result = await query(
      `SELECT web_vitals, metrics, recommendations, resources, http_info
       FROM performance_test_results
       WHERE test_result_id = $1
       LIMIT 1`,
      [testResultId]
    );

    const row = (result.rows?.[0] || null) as {
      web_vitals?: unknown;
      metrics?: unknown;
      recommendations?: unknown;
      resources?: unknown;
      http_info?: unknown;
    } | null;

    if (!row) {
      return null;
    }

    const webVitals = typeof row.web_vitals === 'object' && row.web_vitals ? row.web_vitals : {};
    const metrics = typeof row.metrics === 'object' && row.metrics ? row.metrics : {};
    const resources = typeof row.resources === 'object' && row.resources ? row.resources : {};
    const recommendations = Array.isArray(row.recommendations) ? row.recommendations : [];
    const httpInfo = typeof row.http_info === 'object' && row.http_info ? row.http_info : {};

    return {
      webVitals: webVitals as Record<string, unknown>,
      metrics: metrics as Record<string, unknown>,
      resources: resources as Record<string, unknown>,
      recommendations,
      httpInfo: httpInfo as Record<string, unknown>,
    };
  },
};

export default performanceTestResultRepository;
