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
