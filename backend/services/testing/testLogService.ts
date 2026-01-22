import { query } from '../../config/database';
import testRepository from '../../repositories/testRepository';
import { errorLogAggregator } from '../../utils/ErrorLogAggregator';

const TEST_LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
export type TestLogLevel = (typeof TEST_LOG_LEVELS)[number];

export const normalizeTestLogLevel = (
  level?: string,
  fallback: TestLogLevel = 'info'
): TestLogLevel => {
  if (level && (TEST_LOG_LEVELS as readonly string[]).includes(level)) {
    return level as TestLogLevel;
  }
  return fallback;
};

export const insertExecutionLog = async (
  testId: string,
  level: string,
  message: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  const normalizedLevel = normalizeTestLogLevel(level, 'info');
  await query(
    `INSERT INTO test_logs (execution_id, level, message, context)
     SELECT id, $1, $2, $3 FROM test_executions WHERE test_id = $4`,
    [normalizedLevel, message, JSON.stringify(context), testId]
  );

  void errorLogAggregator.log({
    level: normalizedLevel,
    message,
    type: 'test',
    details: context,
    context: {
      testId,
    },
  });
};

export const updateStatusWithLog = async (
  testId: string,
  status: string,
  message: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testRepository.updateStatus(testId, status);
  await insertExecutionLog(testId, 'info', message, context);
};

export const markFailedWithLog = async (
  testId: string,
  errorMessage: string,
  context: Record<string, unknown> = {},
  logMessage = '测试失败'
): Promise<void> => {
  await testRepository.markFailed(testId, errorMessage);
  await insertExecutionLog(testId, 'error', logMessage, {
    errorMessage,
    ...context,
  });
};

export const markCompletedWithLog = async (
  testId: string,
  executionTimeSeconds: number,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testRepository.markCompleted(testId, executionTimeSeconds);
  await insertExecutionLog(testId, 'info', '测试完成', context);
};

export const markStartedWithLog = async (
  testId: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testRepository.markStarted(testId);
  await insertExecutionLog(testId, 'info', '测试启动', context);
};

export const getLogsByTraceId = async (
  traceId: string,
  options: {
    userId?: string;
    isAdmin?: boolean;
    enforceUserId?: boolean;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const { userId, isAdmin, enforceUserId, startTime, endTime, limit, offset } = options;
  const params: Array<string | number> = [traceId];
  const filters: string[] = [];

  if (userId && (!isAdmin || enforceUserId)) {
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
    rows: result.rows,
    total: Number(countResult.rows[0]?.count || 0),
  };
};

export const countDeadLetterReplays = async (
  testId: string,
  options: { deadLetterJobId?: string } = {}
): Promise<number> => {
  const params: Array<string> = [testId];
  let filter = '';
  if (options.deadLetterJobId) {
    params.push(options.deadLetterJobId);
    filter = ` AND (tl.context->>'deadLetterJobId' = $2)`;
  }
  const result = await query(
    `SELECT COUNT(1) AS count
     FROM test_logs tl
     INNER JOIN test_executions te ON te.id = tl.execution_id
     WHERE te.test_id = $1 AND tl.message = '死信任务已重放'${filter}`,
    params
  );
  return Number(result.rows[0]?.count || 0);
};
