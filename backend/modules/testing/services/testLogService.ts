import { errorLogAggregator } from '../../utils/ErrorLogAggregator';
import testLogRepository from '../repositories/testLogRepository';
import testOperationsRepository from '../repositories/testOperationsRepository';
import userTestManager from './UserTestManager';

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
  const enrichedContext: Record<string, unknown> = { testId, ...context };

  // 先通过 WS 实时推送日志（不等数据库写入）
  userTestManager.sendLogToTestUser(testId, {
    level: normalizedLevel,
    message,
    context: enrichedContext,
    timestamp: new Date().toISOString(),
  });

  // 再异步持久化到数据库
  await testLogRepository.insertExecutionLog(testId, normalizedLevel, message, enrichedContext);

  void errorLogAggregator.log({
    level: normalizedLevel,
    message,
    type: 'test',
    details: enrichedContext,
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
  await testOperationsRepository.updateStatus(testId, status);
  await insertExecutionLog(testId, 'info', message, context);
};

export const markFailedWithLog = async (
  testId: string,
  errorMessage: string,
  context: Record<string, unknown> = {},
  logMessage = '测试失败'
): Promise<void> => {
  await testOperationsRepository.markFailed(testId, errorMessage);
  const score = typeof context.score === 'number' ? context.score : null;
  const grade = typeof context.grade === 'string' ? context.grade : null;
  const parts = [logMessage];
  if (score !== null) parts.push(`得分 ${score}`);
  if (grade) parts.push(`等级 ${grade}`);
  if (errorMessage && errorMessage !== logMessage) parts.push(`原因: ${errorMessage}`);
  await insertExecutionLog(testId, 'error', parts.join(' · '), {
    errorMessage,
    ...context,
  });
};

export const markCompletedWithLog = async (
  testId: string,
  executionTimeSeconds: number,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testOperationsRepository.markCompleted(testId, executionTimeSeconds);
  const score = typeof context.score === 'number' ? context.score : null;
  const grade = typeof context.grade === 'string' ? context.grade : null;
  const parts = ['测试完成'];
  if (score !== null) parts.push(`得分 ${score}`);
  if (grade) parts.push(`等级 ${grade}`);
  if (executionTimeSeconds > 0) parts.push(`耗时 ${executionTimeSeconds.toFixed(1)}s`);
  await insertExecutionLog(testId, 'info', parts.join(' · '), {
    executionTime: executionTimeSeconds,
    ...context,
  });
};

export const markStartedWithLog = async (
  testId: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testOperationsRepository.markStarted(testId);
  const engineType = typeof context.engineType === 'string' ? context.engineType : null;
  const url = typeof context.url === 'string' ? context.url : null;
  const parts = ['测试启动'];
  if (engineType) parts.push(`[${engineType}]`);
  if (url) parts.push(url);
  await insertExecutionLog(testId, 'info', parts.join(' '), context);
};

export const getLogsByTraceId = async (
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
) => {
  return testLogRepository.getLogsByTraceId(traceId, options);
};

export const countDeadLetterReplays = async (
  testId: string,
  options: { deadLetterJobId?: string } = {}
): Promise<number> => {
  return testLogRepository.countDeadLetterReplays(testId, options.deadLetterJobId);
};
