import type { Job, Queue, Worker } from 'bullmq';
import { randomUUID } from 'crypto';
import { configManager } from '../../config/ConfigManager';
import {
  QUEUE_NAMES,
  QUEUE_NAME_LIST,
  getQueueNameByTestType,
} from '../../constants/testEngineMappings';
import testOperationsRepository from '../repositories/testOperationsRepository';
import testRepository from '../repositories/testRepository';
import { countDeadLetterReplays, insertExecutionLog } from './testLogService';

// bullmq 懒加载：仅在 queueEnabled=true 时才实际导入，避免无 Redis 时启动报错
let _bullmq: typeof import('bullmq') | null = null;
const getBullMQ = async () => {
  if (!_bullmq) {
    _bullmq = await import('bullmq');
  }
  return _bullmq;
};

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

/**
 * 队列是否启用（由 server.ts 启动时设置）
 * false 时 dispatchTest 会直接异步执行测试，不经过 Redis
 */
let queueEnabled = false;
export const setQueueEnabled = (enabled: boolean) => {
  queueEnabled = enabled;
};
export const isQueueEnabled = () => queueEnabled;

type RedisConnectionConfig = {
  host: string;
  port: number;
  password?: string;
  db: number;
};

const resolveRedisConfig = (): RedisConnectionConfig => {
  // 本地模式下队列永远禁用（queueEnabled=false），此函数仅在显式启用队列时才会被调用
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
  };
};

const DEFAULT_QUEUE = QUEUE_NAMES.DEFAULT;
const HEAVY_QUEUE = QUEUE_NAMES.HEAVY;
const SECURITY_QUEUE = QUEUE_NAMES.SECURITY;
const DEAD_LETTER_QUEUE = QUEUE_NAMES.DEAD;

const getQueueName = (testType?: string) => getQueueNameByTestType(testType);

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
  // 懒加载创建队列（同步上下文中使用缓存的 bullmq）
  if (!_bullmq) {
    throw new Error('bullmq 未初始化，请先调用 startWorker 或确保队列已启用');
  }
  const queue = new _bullmq.Queue(name, {
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

  const url = typeof payload.config?.url === 'string' ? payload.config.url : '';
  const queueMsg = url ? `测试已进入队列 [${testType}] ${url}` : `测试已进入队列 [${testType}]`;
  await insertExecutionLog(payload.testId, 'info', queueMsg, {
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

const startWorker = async (options: { queueName?: string; concurrency?: number } = {}) => {
  const bullmq = await getBullMQ();
  _bullmq = bullmq; // 确保 getQueue 可用
  const queueName = options.queueName || DEFAULT_QUEUE;
  const queue = getQueue(queueName);
  const maxConcurrent = Number(options.concurrency || getQueueConcurrency(queueName));

  if (workers.has(queueName)) {
    return queue;
  }

  const worker = new bullmq.Worker(
    queueName,
    async (job: Job) => {
      const {
        testId: rawTestId,
        userId,
        config,
      } = job.data as {
        testId?: string;
        userId: string;
        config: Record<string, unknown>;
      };
      const testId =
        typeof rawTestId === 'string' && rawTestId.trim().length > 0
          ? rawTestId
          : String(job.id || 'unknown');

      try {
        const testBusinessService = (await import('./TestBusinessService')).default;
        await testOperationsRepository.updateStatus(testId, 'running');
        const typedConfig = config as unknown as {
          url: string;
          testType: string;
        } & Record<string, unknown>;
        await testBusinessService.executeQueuedTest(testId, typedConfig, {
          userId,
          role: (config as { userRole?: string }).userRole || 'user',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await testOperationsRepository.markFailed(testId, message);
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
  if (!queueEnabled) return;
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
    workspaceId?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  if (!queueEnabled) {
    return {
      stats: {},
      pagination: {
        limit: options.limit,
        offset: options.offset,
        page: 1,
        totalPages: 1,
        total: 0,
      },
    };
  }
  const stats: Record<string, unknown> = {};
  const { userId, isAdmin, workspaceId, startTime, endTime, limit, offset } = options;
  const useDbAggregation =
    !isAdmin ||
    startTime !== undefined ||
    endTime !== undefined ||
    limit !== undefined ||
    offset !== undefined;
  const statusResult = useDbAggregation
    ? await testRepository.getQueueStatusCounts({
        userId: isAdmin ? undefined : userId,
        workspaceId,
        startTime,
        endTime,
        limit,
        offset,
      })
    : { rows: [], total: 0 };
  const statusRows = statusResult.rows;
  for (const name of QUEUE_NAME_LIST) {
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

const getQueueSummary = async () => {
  if (!queueEnabled) {
    return {};
  }
  const summary: Record<string, { waiting: number; active: number; delayed: number }> = {};
  for (const name of QUEUE_NAME_LIST) {
    const queue = getQueue(name);
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
    summary[name] = {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      delayed: counts.delayed || 0,
    };
  }
  return summary;
};

const getQueueConcurrencySummary = () => {
  const summary: Record<string, number> = {};
  for (const name of QUEUE_NAME_LIST) {
    summary[name] = getQueueConcurrency(name);
  }
  return summary;
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
  if (!queueEnabled) return [];
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

export const getJobsByTraceId = async (
  traceId: string,
  options: { start?: number; end?: number; userId?: string; isAdmin?: boolean } = {}
) => {
  if (!queueEnabled) return [];
  const start = options.start ?? 0;
  const end = options.end ?? 49;
  const { userId, isAdmin } = options;
  const results: Array<{ queueName: string; job: ReturnType<typeof serializeJob> }> = [];
  for (const name of QUEUE_NAME_LIST) {
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
  if (!queueEnabled) return null;
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
  if (!queueEnabled) return null;
  const deadQueue = getQueue(DEAD_LETTER_QUEUE);
  const job = await deadQueue.getJob(jobId);
  if (!job) {
    return null;
  }
  const data = job.data as Record<string, unknown>;
  const testId =
    typeof data.testId === 'string' && data.testId.trim().length > 0 ? data.testId : String(jobId);
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
  const payload = { ...data, testId } as Record<string, unknown>;
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

/**
 * 统一测试调度入口
 * 队列启用时入队 Redis；否则直接异步执行
 * 业务代码应调用此函数，不应关心底层是队列还是直接执行
 */
const dispatchTest = async (payload: {
  testId: string;
  userId: string;
  config: Record<string, unknown>;
}) => {
  if (queueEnabled) {
    return enqueueTest(payload);
  }
  // 无队列：直接异步执行，不阻塞调用方
  const testType =
    typeof payload.config?.testType === 'string' ? payload.config.testType : 'unknown';
  const directUrl = typeof payload.config?.url === 'string' ? payload.config.url : '';
  const directMsg = directUrl
    ? `测试已进入队列 [${testType}] ${directUrl}`
    : `测试已进入队列 [${testType}]`;
  void insertExecutionLog(payload.testId, 'info', directMsg, {
    queue: 'direct',
    testType,
  });
  const testBusinessService = (await import('./TestBusinessService')).default;
  const typedConfig = payload.config as unknown as { url: string; testType: string } & Record<
    string,
    unknown
  >;
  testBusinessService
    .executeQueuedTest(payload.testId, typedConfig, {
      userId: payload.userId,
      role: (payload.config.userRole as string) || 'user',
    })
    .catch((err: unknown) => {
      console.error(
        `❌ 本地测试执行失败 [${payload.testId}]:`,
        err instanceof Error ? err.message : String(err)
      );
    });
  return undefined;
};

export {
  closeQueues,
  dispatchTest,
  enqueueTest,
  getDeadLetterJobs,
  getJobDetail,
  getQueue,
  getQueueConcurrencySummary,
  getQueueName,
  getQueueStats,
  getQueueSummary,
  replayDeadLetterJob,
  startWorker,
};
