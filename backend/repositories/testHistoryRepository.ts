/**
 * 测试历史数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

export type TestHistoryRow = {
  test_id: string;
  engine_type: string;
  test_url: string | null;
  created_at: Date;
  completed_at: Date | null;
  score: number | null;
  summary: Record<string, unknown> | null;
};

export type TestExecutionHistoryRow = {
  id: number;
  test_id: string;
  user_id: string;
  workspace_id?: string | null;
  engine_type: string;
  engine_name: string;
  test_name: string;
  test_url?: string;
  test_config?: Record<string, unknown>;
  status: string;
  progress?: number;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  execution_time?: number;
  error_message?: string;
};

const buildScopeClause = (
  userId: string,
  workspaceId?: string
): { clause: string; params: (string | number)[] } => {
  if (workspaceId) {
    return { clause: 'workspace_id = $1', params: [workspaceId] };
  }
  return { clause: 'user_id = $1', params: [userId] };
};

const buildScopedClause = (
  params: Array<string | number>,
  userId: string,
  workspaceId?: string
) => {
  if (workspaceId) {
    params.push(workspaceId);
    return `workspace_id = $${params.length}`;
  }
  params.push(userId);
  return `user_id = $${params.length}`;
};

const testHistoryRepository = {
  async getTestHistory(
    userId: string,
    testType?: string,
    limit = 20,
    offset = 0,
    workspaceId?: string
  ): Promise<{ tests: TestExecutionHistoryRow[]; total: number }> {
    const { clause, params } = buildScopeClause(userId, workspaceId);
    let whereClause = `WHERE ${clause}`;

    if (testType) {
      whereClause += ` AND engine_type = $${params.length + 1}`;
      params.push(testType);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_executions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows?.[0]?.total || '0', 10);

    const testsResult = await query(
      `SELECT * FROM test_executions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      tests: testsResult.rows as TestExecutionHistoryRow[],
      total,
    };
  },

  async getExecutionIdForTest(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<number | null> {
    const params: Array<string | number> = [testId];
    const scopeClause = buildScopedClause(params, userId, workspaceId);
    const result = await query(
      `SELECT id FROM test_executions WHERE test_id = $1 AND ${scopeClause} LIMIT 1`,
      params
    );
    return result.rows[0]?.id ? Number(result.rows[0].id) : null;
  },

  async getLatestTestResultRecord(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<TestHistoryRow | null> {
    const params: Array<string | number> = [testId];
    const scopeClause = buildScopedClause(params, userId, workspaceId);
    const result = await query(
      `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
              tr.score, tr.summary
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       WHERE te.test_id = $1 AND ${scopeClause}
       ORDER BY tr.created_at DESC
       LIMIT 1`,
      params
    );
    return (result.rows[0] as TestHistoryRow) || null;
  },

  async getTestHistoryByTestIdInPeriod(
    testId: string,
    userId: string,
    days: number,
    workspaceId?: string
  ): Promise<TestHistoryRow[]> {
    const params: Array<string | number> = [testId];
    const scopeClause = buildScopedClause(params, userId, workspaceId);
    params.push(String(days));
    const result = await query(
      `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
              tr.score, tr.summary
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       WHERE te.test_id = $1 AND ${scopeClause}
         AND te.created_at >= NOW() - ($${params.length} || ' days')::interval
       ORDER BY te.created_at ASC`,
      params
    );
    return result.rows as TestHistoryRow[];
  },

  async getTestHistoryByTestIdPaged(
    testId: string,
    userId: string,
    limit = 20,
    offset = 0,
    workspaceId?: string
  ): Promise<{ results: TestHistoryRow[]; total: number; hasMore: boolean }> {
    const params: Array<string | number> = [testId];
    const scopeClause = buildScopedClause(params, userId, workspaceId);
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM test_executions te
       WHERE te.test_id = $1 AND ${scopeClause}`,
      params
    );
    const total = countResult.rows?.[0]?.total || 0;

    const listResult = await query(
      `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
              tr.score, tr.summary
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       WHERE te.test_id = $1 AND ${scopeClause}
       ORDER BY te.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      results: listResult.rows as TestHistoryRow[],
      total,
      hasMore: offset + limit < total,
    };
  },
};

export default testHistoryRepository;
