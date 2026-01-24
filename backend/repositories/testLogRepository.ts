/**
 * 测试日志数据访问层 (Repository)
 * 职责: 只负责数据库操作,不包含业务逻辑
 */

import { query } from '../config/database';

export type TestLogTraceRow = {
  id: number;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: Date;
  test_id: string;
  user_id: string;
  engine_type: string;
};

const testLogRepository = {
  async insertExecutionLog(
    testId: string,
    level: string,
    message: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await query(
      `INSERT INTO test_logs (execution_id, level, message, context)
       SELECT id, $1, $2, $3 FROM test_executions WHERE test_id = $4`,
      [level, message, JSON.stringify(context), testId]
    );
  },

  async getLogsByTraceId(
    traceId: string,
    options: {
      userId?: string;
      workspaceId?: string;
      isAdmin?: boolean;
      enforceUserId?: boolean;
      startTime?: string;
      endTime?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ rows: TestLogTraceRow[]; total: number }> {
    const { userId, workspaceId, isAdmin, enforceUserId, startTime, endTime, limit, offset } =
      options;
    const params: Array<string | number> = [traceId];
    const filters: string[] = [];

    if (workspaceId) {
      params.push(workspaceId);
      filters.push(`te.workspace_id = $${params.length}`);
    } else if (userId && (!isAdmin || enforceUserId)) {
      params.push(userId);
      filters.push(`te.user_id = $${params.length}`);
    }

    if (startTime) {
      params.push(startTime);
      filters.push(`tl.created_at >= $${params.length}`);
    }

    if (endTime) {
      params.push(endTime);
      filters.push(`tl.created_at <= $${params.length}`);
    }

    const filterClause = filters.length ? `AND ${filters.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(1) AS count
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE (tl.context->>'traceId' = $1 OR te.test_config->>'traceId' = $1)
       ${filterClause}`,
      params
    );

    const pageParams = [...params];
    let pageClause = '';
    if (typeof limit === 'number') {
      pageParams.push(limit);
      pageClause = ` LIMIT $${pageParams.length}`;
    }
    if (typeof offset === 'number') {
      pageParams.push(offset);
      pageClause += ` OFFSET $${pageParams.length}`;
    }

    const result = await query(
      `SELECT tl.id, tl.level, tl.message, tl.context, tl.created_at,
              te.test_id, te.user_id, te.engine_type
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE (tl.context->>'traceId' = $1 OR te.test_config->>'traceId' = $1)
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
      filter = ` AND (tl.context->>'deadLetterJobId' = $2)`;
    }
    const result = await query(
      `SELECT COUNT(1) AS count
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE te.test_id = $1 AND tl.message = '死信任务已重放'${filter}`,
      params
    );
    return Number(result.rows?.[0]?.count || 0);
  },
};

export default testLogRepository;
