/**
 * 测试结果数据访问层 (Repository)
 * 职责: 只负责测试结果与指标的数据库操作
 */

import { query } from '../config/database';
import type { TestMetricRecord, TestResultRecord } from '../types';

export interface TestMetricCreateData {
  resultId: number;
  metricName: string;
  metricValue: Record<string, unknown> | number | string;
  metricUnit?: string;
  metricType?: string;
  thresholdMin?: number;
  thresholdMax?: number;
  passed?: boolean;
  severity?: string;
  recommendation?: string;
}

const buildScopeClause = (
  userId: string,
  workspaceId?: string
): { clause: string; params: (string | number)[] } => {
  if (workspaceId) {
    return { clause: 'te.workspace_id = $2', params: [workspaceId] };
  }
  return { clause: 'te.user_id = $2', params: [userId] };
};

const testResultRepository = {
  async saveResult(
    executionId: number,
    summary: Record<string, unknown>,
    score?: number,
    grade?: string,
    passed?: boolean,
    warnings?: unknown[],
    errors?: unknown[]
  ): Promise<number> {
    const result = await query(
      `INSERT INTO test_results (
         execution_id, summary, score, grade, passed, warnings, errors
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        executionId,
        JSON.stringify(summary),
        score ?? null,
        grade ?? null,
        passed ?? null,
        JSON.stringify(warnings || []),
        JSON.stringify(errors || []),
      ]
    );
    return result.rows[0].id as number;
  },

  async saveMetrics(metrics: TestMetricCreateData[]): Promise<void> {
    if (metrics.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders = metrics
      .map((metric, index) => {
        const baseIndex = index * 9;
        values.push(
          metric.resultId,
          metric.metricName,
          JSON.stringify(metric.metricValue),
          metric.metricUnit || null,
          metric.metricType || null,
          metric.thresholdMin ?? null,
          metric.thresholdMax ?? null,
          metric.passed ?? null,
          metric.severity || null
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`;
      })
      .join(', ');

    await query(
      `INSERT INTO test_metrics (
         result_id, metric_name, metric_value, metric_unit, metric_type,
         threshold_min, threshold_max, passed, severity
       ) VALUES ${placeholders}`,
      values
    );
  },

  async findResults(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<TestResultRecord | null> {
    const { clause, params } = buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT tr.*
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.test_id = $1 AND ${clause}
       ORDER BY tr.created_at DESC
       LIMIT 1`,
      [testId, ...params]
    );
    return (result.rows[0] as TestResultRecord) || null;
  },

  async findMetrics(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<TestMetricRecord[]> {
    const { clause, params } = buildScopeClause(userId, workspaceId);
    const result = await query(
      `SELECT tm.id, tm.metric_name, tm.metric_value, tm.metric_unit, tm.metric_type,
              tm.passed, tm.severity, tm.recommendation, tm.created_at
       FROM test_metrics tm
       INNER JOIN test_results tr ON tr.id = tm.result_id
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.test_id = $1 AND ${clause}
       ORDER BY tm.created_at DESC`,
      [testId, ...params]
    );
    return result.rows as TestMetricRecord[];
  },
};

export default testResultRepository;
