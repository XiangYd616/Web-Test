import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';

const { randomUUID } = require('crypto');

const { configManager } = require('../../src/ConfigManager');
const testRepository = require('../../repositories/testRepository');
const { insertExecutionLog, countDeadLetterReplays } = require('./testLogService');

const DEFAULT_QUEUE = 'test-execution';
const HEAVY_QUEUE = 'test-execution-heavy';
const SECURITY_QUEUE = 'test-execution-security';
const DEAD_LETTER_QUEUE = 'test-execution-dead';
const QUEUE_NAMES = [DEFAULT_QUEUE, HEAVY_QUEUE, SECURITY_QUEUE, DEAD_LETTER_QUEUE];

const QUEUE_BY_TYPE: Record<string, string> = {
  stress: HEAVY_QUEUE,
  performance: HEAVY_QUEUE,
  security: SECURITY_QUEUE,
};

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

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
  if (testType && QUEUE_BY_TYPE[testType]) {
    return QUEUE_BY_TYPE[testType];
  }
  return DEFAULT_QUEUE;
};

const getConfiguredMaxConcurrent = (fallback = 5) =>
  Number(
    configManager?.get?.('testEngines.maxConcurrent', undefined) ||
      configManager?.get?.('testEngines.concurrency.max', undefined) ||
      fallback
  );

const getQueueConcurrency = (queueName: string) => {
  if (queueName === HEAVY_QUEUE) {
    return Number(process.env.TEST_QUEUE_HEAVY_CONCURRENCY || getConfiguredMaxConcurrent(5) || 5);
  }
  if (queueName === SECURITY_QUEUE) {
    return Number(
      process.env.TEST_QUEUE_SECURITY_CONCURRENCY || getConfiguredMaxConcurrent(5) || 5
    );
  }
  return Number(process.env.TEST_QUEUE_CONCURRENCY || getConfiguredMaxConcurrent(5) || 5);
};

const getQueue = (name: string) => {
  if (queues.has(name)) {
    return queues.get(name) as Queue;
  }
  const queue = new Queue(name, {
    connection: resolveRedisConfig(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 2000,
      attempts: Number(process.env.TEST_QUEUE_ATTEMPTS || 3),
      backoff: {
        type: 'exponential',
        delay: Number(process.env.TEST_QUEUE_BACKOFF_MS || 5000),
      },
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
  const traceId =
    (payload.config.traceId as string | undefined) ||
    ((payload.config.metadata as Record<string, unknown> | undefined)?.traceId as
      | string
      | undefined) ||
    randomUUID();
  const tags =
    (payload.config.tags as string[] | undefined) ||
    ((payload.config.metadata as Record<string, unknown> | undefined)?.tags as
      | string[]
      | undefined) ||
    [];

  payload.config = {
    ...payload.config,
    traceId,
    tags,
  };

  await insertExecutionLog(payload.testId, 'info', '测试已进入队列', {
    queue: queueName,
    testType,
    traceId,
    tags,
  });

  return queue.add('execute-test', payload, {
    jobId: payload.testId,
    priority: queueName === HEAVY_QUEUE ? 2 : 1,
  });
};

const startWorker = (options: { queueName?: string; concurrency?: number } = {}) => {
  const queueName = options.queueName || DEFAULT_QUEUE;
  const queue = getQueue(queueName);
  const maxConcurrent = Number(options.concurrency || getQueueConcurrency(queueName));

  if (workers.has(queueName)) {
    return queue;
  }

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const { testId, userId, config } = job.data as {
        testId: string;
        userId: string;
        config: Record<string, unknown>;
      };

      try {
        const testBusinessService = require('./TestBusinessService').default;
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
    },
    {
      concurrency: maxConcurrent,
      connection: resolveRedisConfig(),
    }
  );

  worker.on('failed', async (job, err) => {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts || 0;
    const attemptsMade = job.attemptsMade || 0;
    if (attempts && attemptsMade < attempts) {
      return;
    }
    const deadQueue = getQueue(DEAD_LETTER_QUEUE);
    await deadQueue.add('dead-letter', {
      ...job.data,
      error: err?.message || String(err),
      failedAt: new Date().toISOString(),
      sourceQueue: queueName,
    });
  });

  workers.set(queueName, worker);
  return queue;
};

const closeQueues = async () => {
  const workerClosures = Array.from(workers.values()).map(worker => worker.close());
  const queueClosures = Array.from(queues.values()).map(queue => queue.close());
  await Promise.allSettled([...workerClosures, ...queueClosures]);
  workers.clear();
  queues.clear();
};

const isOwnedJob = (job: Job, userId?: string) => {
  if (!userId) {
    return true;
  }
  const data = job.data as Record<string, unknown> | undefined;
  return data?.userId === userId;
};

const getQueueStats = async (
  options: {
    userId?: string;
    isAdmin?: boolean;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const stats: Record<string, unknown> = {};
  const { userId, isAdmin, startTime, endTime, limit, offset } = options;
  const useDbAggregation =
    !isAdmin ||
    startTime !== undefined ||
    endTime !== undefined ||
    limit !== undefined ||
    offset !== undefined;
  const statusResult = useDbAggregation
    ? await testRepository.getQueueStatusCounts({
        userId: isAdmin ? undefined : userId,
        startTime,
        endTime,
        limit,
        offset,
      })
    : { rows: [], total: 0 };
  const statusRows = statusResult.rows;
  for (const name of QUEUE_NAMES) {
    const queue = getQueue(name);
    if (isAdmin && !useDbAggregation) {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );
      stats[name] = {
        counts,
        concurrency: getQueueConcurrency(name),
      };
      continue;
    }
    const counts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
    for (const row of statusRows) {
      if (row.queue_name !== name) {
        continue;
      }
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row.count;
      }
    }
    stats[name] = {
      counts,
      concurrency: getQueueConcurrency(name),
    };
  }
  return {
    stats,
    pagination: {
      limit,
      offset,
      page: typeof limit === 'number' && typeof offset === 'number' ? offset / limit + 1 : 1,
      totalPages:
        typeof limit === 'number' && limit > 0 ? Math.ceil(statusResult.total / limit) : 1,
      startTime,
      endTime,
      total: statusResult.total,
    },
  };
};

const serializeJob = (job: Job | null | undefined) => {
  if (!job) {
    return null;
  }
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    opts: job.opts,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    returnvalue: job.returnvalue,
  };
};

const getJobTraceId = (job: Job) => {
  const data = job.data as Record<string, unknown> | undefined;
  if (!data) {
    return undefined;
  }
  const config = data.config as Record<string, unknown> | undefined;
  return (config?.traceId as string | undefined) || (data.traceId as string | undefined);
};

const getDeadLetterJobs = async (
  options: { start?: number; end?: number; userId?: string; isAdmin?: boolean } = {}
) => {
  const start = options.start ?? 0;
  const end = options.end ?? 19;
  const { userId, isAdmin } = options;
  const queue = getQueue(DEAD_LETTER_QUEUE);
  const jobs = await queue.getJobs(
    ['waiting', 'active', 'completed', 'failed', 'delayed'],
    start,
    end
  );
  return jobs
    .filter(job => (isAdmin ? true : isOwnedJob(job, userId)))
    .map(job => serializeJob(job));
};

const getJobsByTraceId = async (
  traceId: string,
  options: { start?: number; end?: number; userId?: string; isAdmin?: boolean } = {}
) => {
  const start = options.start ?? 0;
  const end = options.end ?? 49;
  const { userId, isAdmin } = options;
  const results: Array<{ queueName: string; job: ReturnType<typeof serializeJob> }> = [];
  for (const name of QUEUE_NAMES) {
    const queue = getQueue(name);
    const jobs = await queue.getJobs(
      ['waiting', 'active', 'completed', 'failed', 'delayed'],
      start,
      end
    );
    for (const job of jobs) {
      if (!isAdmin && !isOwnedJob(job, userId)) {
        continue;
      }
      if (getJobTraceId(job) === traceId) {
        results.push({ queueName: name, job: serializeJob(job) });
      }
    }
  }
  return results;
};

const getJobDetail = async (
  queueName: string,
  jobId: string,
  options: { userId?: string; isAdmin?: boolean } = {}
) => {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }
  if (!options.isAdmin && !isOwnedJob(job, options.userId)) {
    return null;
  }
  return serializeJob(job);
};

const replayDeadLetterJob = async (
  jobId: string,
  options: {
    priority?: number;
    delay?: number;
    queueName?: string;
    auditContext?: Record<string, unknown>;
    maxReplays?: number;
  } = {}
) => {
  const deadQueue = getQueue(DEAD_LETTER_QUEUE);
  const job = await deadQueue.getJob(jobId);
  if (!job) {
    return null;
  }
  const data = job.data as Record<string, unknown>;
  const testId = String(data.testId || jobId);
  if (options.maxReplays !== undefined) {
    const replayCount = await countDeadLetterReplays(testId, { deadLetterJobId: jobId });
    if (replayCount >= options.maxReplays) {
      await insertExecutionLog(testId, 'warn', '死信任务重放次数已达上限', {
        deadLetterJobId: jobId,
        maxReplays: options.maxReplays,
      });
      return null;
    }
  }
  const sourceQueue =
    options.queueName || (data.sourceQueue as string | undefined) || DEFAULT_QUEUE;
  const payload = { ...data } as Record<string, unknown>;
  delete payload.error;
  delete payload.failedAt;
  delete payload.sourceQueue;

  const targetQueue = getQueue(sourceQueue);
  const jobIdSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newJobId = `${(payload.testId as string | undefined) || 'replay'}-${jobIdSuffix}`;
  await insertExecutionLog(testId, 'info', '死信任务已重放', {
    sourceQueue,
    targetQueue: sourceQueue,
    newJobId,
    deadLetterJobId: jobId,
    priority: options.priority,
    delay: options.delay,
    ...options.auditContext,
  });
  const newJob = await targetQueue.add('execute-test', payload, {
    jobId: newJobId,
    priority: options.priority,
    delay: options.delay,
  });
  return serializeJob(newJob);
};

module.exports = {
  enqueueTest,
  startWorker,
  closeQueues,
  getQueue,
  getQueueName,
  getQueueStats,
  getDeadLetterJobs,
  getJobsByTraceId,
  getJobDetail,
  replayDeadLetterJob,
};

export {
  closeQueues,
  enqueueTest,
  getDeadLetterJobs,
  getJobDetail,
  getQueue,
  getQueueName,
  getQueueStats,
  startWorker,
};
