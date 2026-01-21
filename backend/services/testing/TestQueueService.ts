import Queue from 'bull';

const { configManager } = require('../../src/ConfigManager');
const testBusinessService = require('./TestBusinessService').default;
const testRepository = require('../../repositories/testRepository');
const { insertExecutionLog } = require('./testLogService');

const DEFAULT_QUEUE = 'test-execution';
const HEAVY_QUEUE = 'test-execution-heavy';
const HEAVY_TYPES = new Set(['stress', 'performance']);

const queues = new Map<string, Queue.Queue>();

const resolveRedisConfig = () => {
  const config = configManager?.getRedisConfig?.() || {};
  return {
    host: config.host || process.env.REDIS_HOST || '127.0.0.1',
    port: config.port || Number(process.env.REDIS_PORT || 6379),
    password: config.password || process.env.REDIS_PASSWORD || undefined,
    db: config.db || Number(process.env.REDIS_DB || 0),
  };
};

const getQueueName = (testType?: string) => {
  if (testType && HEAVY_TYPES.has(testType)) {
    return HEAVY_QUEUE;
  }
  return DEFAULT_QUEUE;
};

const getQueue = (name: string) => {
  if (queues.has(name)) {
    return queues.get(name) as Queue.Queue;
  }
  const queue = new Queue(name, {
    redis: resolveRedisConfig(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 2000,
      attempts: Number(process.env.TEST_QUEUE_ATTEMPTS || 1),
    },
  });
  queues.set(name, queue);
  return queue;
};

const enqueueTest = async (payload: {
  testId: string;
  userId: string;
  config: Record<string, unknown>;
}) => {
  const testType = String(payload.config.testType || '');
  const queueName = getQueueName(testType);
  const queue = getQueue(queueName);

  await insertExecutionLog(payload.testId, 'info', '测试已进入队列', {
    queue: queueName,
    testType,
  });

  return queue.add('execute-test', payload, {
    jobId: payload.testId,
    priority: HEAVY_TYPES.has(testType) ? 2 : 1,
  });
};

const startWorker = (options: { queueName?: string; concurrency?: number } = {}) => {
  const queueName = options.queueName || DEFAULT_QUEUE;
  const queue = getQueue(queueName);
  const maxConcurrent = Number(
    options.concurrency ||
      (queueName === HEAVY_QUEUE
        ? process.env.TEST_QUEUE_HEAVY_CONCURRENCY
        : process.env.TEST_QUEUE_CONCURRENCY) ||
      configManager?.get?.('testEngines.maxConcurrent', 5) ||
      5
  );

  queue.process('execute-test', maxConcurrent, async job => {
    const { testId, userId, config } = job.data as {
      testId: string;
      userId: string;
      config: Record<string, unknown>;
    };

    try {
      await testRepository.updateStatus(testId, 'running');
      await testBusinessService.executeQueuedTest(testId, config, {
        userId,
        role: (config as { userRole?: string }).userRole || 'user',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await testRepository.markFailed(testId, message);
      await insertExecutionLog(testId, 'error', '测试队列执行失败', {
        error: message,
      });
      throw error;
    }
  });

  return queue;
};

module.exports = {
  enqueueTest,
  startWorker,
  getQueue,
  getQueueName,
};

export { enqueueTest, getQueue, getQueueName, startWorker };
