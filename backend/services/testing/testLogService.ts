import testLogRepository from '../../repositories/testLogRepository';
import testOperationsRepository from '../../repositories/testOperationsRepository';
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
  await testLogRepository.insertExecutionLog(testId, normalizedLevel, message, context);

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
  await testOperationsRepository.markCompleted(testId, executionTimeSeconds);
  await insertExecutionLog(testId, 'info', '测试完成', context);
};

export const markStartedWithLog = async (
  testId: string,
  context: Record<string, unknown> = {}
): Promise<void> => {
  await testOperationsRepository.markStarted(testId);
  await insertExecutionLog(testId, 'info', '测试启动', context);
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
