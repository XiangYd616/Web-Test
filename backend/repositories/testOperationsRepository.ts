/**
 * 测试运行操作数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

export type BatchTestRow = {
  test_id: string;
  status: string;
  progress?: number;
  created_at: Date;
  updated_at: Date;
};

export type TestLogRow = {
  id: number;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: Date;
};

const testOperationsRepository = {
  async getBatchTests(
    batchId: string,
    scopeValue: string,
    scopeColumn: 'workspace_id' | 'user_id'
  ): Promise<BatchTestRow[]> {
    const result = await query(
      `SELECT test_id, status, progress, created_at, updated_at
       FROM test_executions
       WHERE ${scopeColumn} = $1
         AND (test_config->>'batchId') = $2
       ORDER BY created_at DESC`,
      [scopeValue, batchId]
    );

    return result.rows as BatchTestRow[];
  },

  async getBatchTestIds(
    batchId: string,
    scopeValue: string,
    scopeColumn: 'workspace_id' | 'user_id'
  ): Promise<string[]> {
    const result = await query(
      `SELECT test_id FROM test_executions
       WHERE ${scopeColumn} = $1
         AND (test_config->>'batchId') = $2`,
      [scopeValue, batchId]
    );

    return (result.rows || []).map(row => row.test_id as string);
  },

  async getTestLogs(
    testId: string,
    scopeValue: string,
    scopeColumn: 'workspace_id' | 'user_id',
    limit: number,
    offset: number,
    level?: string
  ): Promise<{ rows: TestLogRow[]; total: number }> {
    const params: Array<string | number> = [testId, scopeValue];
    let whereClause = `te.test_id = $1 AND te.${scopeColumn} = $2`;

    if (level) {
      params.push(level);
      whereClause += ` AND tl.level = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows?.[0]?.total || 0;

    const listResult = await query(
      `SELECT tl.id, tl.level, tl.message, tl.context, tl.created_at
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE ${whereClause}
       ORDER BY tl.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      rows: listResult.rows as TestLogRow[],
      total,
    };
  },

  async updateTestConfig(
    testId: string,
    scopeValue: string,
    scopeColumn: 'workspace_id' | 'user_id',
    payload: {
      testName: string;
      testUrl: string | null;
      testConfig: Record<string, unknown>;
    }
  ): Promise<void> {
    await query(
      `UPDATE test_executions
       SET test_name = $1,
           test_url = $2,
           test_config = $3,
           updated_at = NOW()
       WHERE test_id = $4 AND ${scopeColumn} = $5`,
      [payload.testName, payload.testUrl, JSON.stringify(payload.testConfig), testId, scopeValue]
    );
  },

  async updateStatus(testId: string, status: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1, updated_at = NOW()
       WHERE test_id = $2 AND status IN ('pending', 'queued', 'running')`,
      [status, testId]
    );
  },

  async updateProgress(testId: string, progress: number): Promise<void> {
    await query(
      `UPDATE test_executions
       SET progress = $1, updated_at = NOW()
       WHERE test_id = $2 AND status = 'running'`,
      [progress, testId]
    );
  },

  async markStarted(testId: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1, started_at = NOW(), updated_at = NOW()
       WHERE test_id = $2 AND status IN ('pending', 'queued')`,
      ['running', testId]
    );
  },

  async markCompleted(
    testId: string,
    executionTimeSeconds: number,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1,
           completed_at = NOW(),
           execution_time = $2,
           error_message = $3,
           updated_at = NOW()
       WHERE test_id = $4 AND status IN ('running', 'pending')`,
      ['completed', executionTimeSeconds, errorMessage || null, testId]
    );
  },

  async markFailed(testId: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = $1,
           error_message = $2,
           updated_at = NOW()
       WHERE test_id = $3 AND status IN ('running', 'pending')`,
      ['failed', errorMessage, testId]
    );
  },
};

export default testOperationsRepository;
