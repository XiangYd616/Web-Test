import { generateId, query } from '../localDbAdapter';

type TestLogTraceRow = {
  id: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
  test_id: string;
  user_id?: string | null;
  engine_type: string;
};

const localTestLogRepository = {
  async insertExecutionLog(
    testId: string,
    level: string,
    message: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await query(
      `INSERT INTO test_logs (id, test_id, level, message, context, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [generateId(), testId, level, message, JSON.stringify(context)]
    );
  },

  async getLogsByTraceId(
    traceId: string,
    options: {
      userId?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ rows: TestLogTraceRow[]; total: number }> {
    const { userId, startTime, endTime, limit, offset } = options;
    const params: Array<string | number> = [traceId];
    const filters: string[] = [];

    if (userId) {
      params.push(userId);
      filters.push(`te.user_id = ?`);
    }

    if (startTime) {
      params.push(startTime);
      filters.push(`tl.created_at >= ?`);
    }

    if (endTime) {
      params.push(endTime);
      filters.push(`tl.created_at <= ?`);
    }

    const filterClause = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(1) AS count
       FROM test_logs tl
       INNER JOIN test_executions te ON te.test_id = tl.test_id
       WHERE (json_extract(tl.context, '$.traceId') = ? OR json_extract(te.test_config, '$.traceId') = ?)
       ${filterClause}`,
      params.concat(traceId)
    );

    const pageParams = [...params, traceId];
    let pageClause = '';
    if (typeof limit === 'number') {
      pageParams.push(limit);
      pageClause = ` LIMIT ?`;
    }
    if (typeof offset === 'number') {
      pageParams.push(offset);
      pageClause += ` OFFSET ?`;
    }

    const result = await query(
      `SELECT tl.id, tl.level, tl.message, tl.context, tl.created_at,
              te.test_id, te.user_id, te.engine_type
       FROM test_logs tl
       INNER JOIN test_executions te ON te.test_id = tl.test_id
       WHERE (json_extract(tl.context, '$.traceId') = ? OR json_extract(te.test_config, '$.traceId') = ?)
       ${filterClause}
       ORDER BY tl.created_at ASC${pageClause}`,
      pageParams
    );

    return {
      rows: result.rows as TestLogTraceRow[],
      total: Number(countResult.rows?.[0]?.count || 0),
    };
  },

  async countDeadLetterReplays(testId: string, deadLetterJobId?: string): Promise<number> {
    const params: Array<string | number> = [testId];
    let filter = '';
    if (deadLetterJobId) {
      params.push(deadLetterJobId);
      filter = ` AND json_extract(tl.context, '$.deadLetterJobId') = ?`;
    }
    const result = await query(
      `SELECT COUNT(1) AS count
       FROM test_logs tl
       INNER JOIN test_executions te ON te.test_id = tl.test_id
       WHERE te.test_id = ? AND tl.message = '死信任务已重放'${filter}`,
      params
    );
    return Number(result.rows?.[0]?.count || 0);
  },
};

export default localTestLogRepository;
export type { TestLogTraceRow };
