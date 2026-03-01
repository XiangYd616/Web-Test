/**
 * 测试历史数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../../config/database';

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
  score?: number | null;
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
    keyword?: string,
    limit = 20,
    offset = 0,
    workspaceId?: string
  ): Promise<{
    tests: TestExecutionHistoryRow[];
    total: number;
    typeCounts: Record<string, number>;
    statusCounts: Record<string, number>;
    avgScore: number | null;
    avgDuration: number | null;
  }> {
    const params: (string | number)[] = [];
    const whereParts: string[] = [];
    const scopedWhereParts: string[] = [];

    if (workspaceId) {
      params.push(workspaceId);
      whereParts.push(`workspace_id = $${params.length}`);
      scopedWhereParts.push(`te.workspace_id = $${params.length}`);
    } else {
      params.push(userId);
      whereParts.push(`user_id = $${params.length}`);
      scopedWhereParts.push(`te.user_id = $${params.length}`);
    }

    if (testType) {
      params.push(testType);
      whereParts.push(`engine_type = $${params.length}`);
      scopedWhereParts.push(`te.engine_type = $${params.length}`);
    }

    if (keyword) {
      const likeValue = `%${keyword}%`;
      params.push(likeValue, likeValue, likeValue);
      const nameIndex = params.length - 2;
      const urlIndex = params.length - 1;
      const idIndex = params.length;
      whereParts.push(
        `(test_name ILIKE $${nameIndex} OR test_url ILIKE $${urlIndex} OR test_id ILIKE $${idIndex})`
      );
      scopedWhereParts.push(
        `(te.test_name ILIKE $${nameIndex} OR te.test_url ILIKE $${urlIndex} OR te.test_id ILIKE $${idIndex})`
      );
    }

    const whereClause = `WHERE ${whereParts.join(' AND ')}`;
    const scopedWhereClause = `WHERE ${scopedWhereParts.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_executions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows?.[0]?.total || '0', 10);

    const testsResult = await query(
      `SELECT te.*,
              (
                SELECT tr.score
                FROM test_results tr
                WHERE tr.execution_id = te.id
                ORDER BY tr.created_at DESC
                LIMIT 1
              ) AS score
       FROM test_executions te
       ${scopedWhereClause}
       ORDER BY te.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    // 全量类型统计（不受 testType/keyword 筛选和分页影响）
    const baseParams: (string | number)[] = [];
    const baseParts: string[] = [];
    if (workspaceId) {
      baseParams.push(workspaceId);
      baseParts.push(`workspace_id = $${baseParams.length}`);
    } else {
      baseParams.push(userId);
      baseParts.push(`user_id = $${baseParams.length}`);
    }
    const baseWhere = `WHERE ${baseParts.join(' AND ')}`;
    const typeCountsResult = await query(
      `SELECT engine_type, COUNT(*) as count FROM test_executions ${baseWhere} GROUP BY engine_type`,
      baseParams
    );
    const typeCounts: Record<string, number> = {};
    for (const row of typeCountsResult.rows as Array<{ engine_type: string; count: string }>) {
      typeCounts[row.engine_type] = parseInt(row.count, 10);
    }

    // 全量状态统计
    const statusCountsResult = await query(
      `SELECT status, COUNT(*) as count FROM test_executions ${baseWhere} GROUP BY status`,
      baseParams
    );
    const statusCounts: Record<string, number> = {};
    for (const row of statusCountsResult.rows as Array<{ status: string; count: string }>) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    // 全量平均分
    const avgScoreResult = await query(
      `SELECT AVG(tr.score) as avg_score FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       ${baseWhere.replace('workspace_id', 'te.workspace_id').replace('user_id', 'te.user_id')}
       AND tr.score IS NOT NULL`,
      baseParams
    );
    const avgScore = avgScoreResult.rows?.[0]?.avg_score
      ? Math.round(Number(avgScoreResult.rows[0].avg_score))
      : null;

    // 全量平均耗时
    const avgDurationResult = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_duration
       FROM test_executions ${baseWhere} AND completed_at IS NOT NULL`,
      baseParams
    );
    const avgDuration = avgDurationResult.rows?.[0]?.avg_duration
      ? Math.round(Number(avgDurationResult.rows[0].avg_duration))
      : null;

    return {
      tests: testsResult.rows as TestExecutionHistoryRow[],
      total,
      typeCounts,
      statusCounts,
      avgScore,
      avgDuration,
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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    params.push(since.toISOString());
    const result = await query(
      `SELECT te.test_id, te.engine_type, te.test_url, te.created_at, te.completed_at,
              tr.score, tr.summary
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       WHERE te.test_id = $1 AND ${scopeClause}
         AND te.created_at >= $${params.length}
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
      `SELECT COUNT(*) AS total
       FROM test_executions te
       WHERE te.test_id = $1 AND ${scopeClause}`,
      params
    );
    const total = parseInt(String(countResult.rows?.[0]?.total || '0'), 10);

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
