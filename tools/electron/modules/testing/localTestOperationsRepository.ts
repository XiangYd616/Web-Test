import { generateId, query } from '../localDbAdapter';

type BatchTestRow = {
  test_id: string;
  status: string;
  progress?: number | null;
  created_at: string;
  updated_at: string;
};

type TestLogRow = {
  id: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
};

const localTestOperationsRepository = {
  async getBatchTests(batchId: string, userId: string): Promise<BatchTestRow[]> {
    const result = await query(
      `SELECT test_id, status, progress, created_at, updated_at
       FROM test_executions
       WHERE user_id = ?
         AND json_extract(test_config, '$.batchId') = ?
       ORDER BY created_at DESC`,
      [userId, batchId]
    );
    return result.rows as BatchTestRow[];
  },

  async getBatchTestIds(batchId: string, userId: string): Promise<string[]> {
    const result = await query(
      `SELECT test_id FROM test_executions
       WHERE user_id = ?
         AND json_extract(test_config, '$.batchId') = ?`,
      [userId, batchId]
    );
    return (result.rows || []).map(row => row.test_id as string);
  },

  async getTestLogs(
    testId: string,
    userId: string,
    limit: number,
    offset: number,
    level?: string
  ): Promise<{ rows: TestLogRow[]; total: number }> {
    const params: Array<string | number> = [testId, userId];
    let whereClause = 'te.test_id = ? AND te.user_id = ?';
    if (level) {
      params.push(level);
      whereClause += ' AND tl.level = ?';
    }

    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM test_logs tl
       INNER JOIN test_executions te ON te.test_id = tl.test_id
       WHERE ${whereClause}`,
      params
    );
    const total = Number(countResult.rows?.[0]?.total || 0);

    const listResult = await query(
      `SELECT tl.id, tl.level, tl.message, tl.context, tl.created_at
       FROM test_logs tl
       INNER JOIN test_executions te ON te.test_id = tl.test_id
       WHERE ${whereClause}
       ORDER BY tl.created_at ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      rows: listResult.rows as TestLogRow[],
      total,
    };
  },

  async updateTestConfig(
    testId: string,
    userId: string,
    payload: {
      testName: string;
      testUrl: string | null;
      testConfig: Record<string, unknown>;
    }
  ): Promise<void> {
    await query(
      `UPDATE test_executions
       SET test_name = ?,
           test_url = ?,
           test_config = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND user_id = ?`,
      [payload.testName, payload.testUrl, JSON.stringify(payload.testConfig), testId, userId]
    );
  },

  async updateStatus(testId: string, status: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND status IN ('pending', 'queued', 'running')`,
      [status, testId]
    );
  },

  async updateProgress(testId: string, progress: number): Promise<void> {
    await query(
      `UPDATE test_executions
       SET progress = ?, updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND status = 'running'`,
      [progress, testId]
    );
  },

  async markStarted(testId: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = 'running', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND status IN ('pending', 'queued')`,
      [testId]
    );
  },

  async markCompleted(
    testId: string,
    executionTimeSeconds: number,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           execution_time = ?,
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND status IN ('running', 'pending')`,
      [executionTimeSeconds, errorMessage || null, testId]
    );
  },

  async markFailed(testId: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE test_executions
       SET status = 'failed',
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ? AND status IN ('running', 'pending')`,
      [errorMessage, testId]
    );
  },

  async updateResults(testId: string, results: Record<string, unknown>): Promise<void> {
    // 从引擎结果中提取 score 存到独立列（供历史列表和趋势查询）
    const rawScore =
      results.score ?? (results.summary as Record<string, unknown> | undefined)?.score;
    const score = typeof rawScore === 'number' ? rawScore : null;
    await query(
      `UPDATE test_executions
       SET results = ?, score = ?, updated_at = CURRENT_TIMESTAMP
       WHERE test_id = ?`,
      [JSON.stringify(results), score, testId]
    );
  },

  async insertOperationLog(
    testId: string,
    status: string,
    message: string | null,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    await query(
      `INSERT INTO test_operations (id, test_id, status, message, context, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [generateId(), testId, status, message, JSON.stringify(context)]
    );
  },
};

export default localTestOperationsRepository;
export type { BatchTestRow, TestLogRow };
