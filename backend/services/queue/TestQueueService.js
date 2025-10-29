/**
 * 测试队列服务
 * 使用Bull和Redis实现测试任务的排队和执行
 */

const Queue = require('bull');
const Redis = require('ioredis');
const logger = require('../../utils/logger');
const { query } = require('../../config/database');
const { CHANNELS, MESSAGE_TYPES, MESSAGE_FORMAT, generateChannelName } = require('../../config/websocket-channels');

class TestQueueService {
  constructor() {
    this.redis = null;
    this.testQueue = null;
    this.initialized = false;
    this.fallbackQueue = []; // 内存队列作为fallback
    this.useFallback = false;
    this.websocketManager = null; // WebSocket管理器实例
  }

  /**
   * 初始化队列服务
   */
  async initialize() {
    try {
      // 尝试连接Redis
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis连接失败，切换到内存队列模式');
            this.useFallback = true;
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      });

      // 监听Redis连接事件
      this.redis.on('connect', () => {
        logger.info('Redis连接成功');
      });

      this.redis.on('error', (err) => {
        logger.error('Redis错误，使用内存队列fallback', err);
        this.useFallback = true;
      });

      // 创建Bull队列
      this.testQueue = new Queue('test-execution', {
        redis: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100, // 保留最近100个完成的任务
          removeOnFail: 500      // 保留最近500个失败的任务
        }
      });

      // 设置队列事件监听
      this.setupQueueEvents();

      // 设置任务处理器
      this.setupProcessors();

      this.initialized = true;
      logger.info('✅ 测试队列服务初始化成功', {
        mode: this.useFallback ? 'memory' : 'redis'
      });

      return true;
    } catch (error) {
      logger.error('测试队列服务初始化失败，切换到内存模式', error);
      this.useFallback = true;
      this.initialized = true;
      return false;
    }
  }

  /**
   * 设置WebSocket管理器
   */
  setWebSocketManager(websocketManager) {
    this.websocketManager = websocketManager;
    logger.info('WebSocket管理器已设置到TestQueueService');
  }

  /**
   * 发送WebSocket消息
   */
  broadcastMessage(channel, event, data) {
    try {
      if (this.websocketManager && this.websocketManager.isReady()) {
        this.websocketManager.sendToRoom(channel, event, data);
      }
    } catch (error) {
      logger.error('WebSocket消息发送失败', error);
    }
  }

  /**
   * 设置队列事件监听
   */
  setupQueueEvents() {
    if (!this.testQueue) return;

    this.testQueue.on('completed', (job, result) => {
      logger.info('测试任务完成', {
        jobId: job.id,
        testId: job.data.testId,
        testType: job.data.testType
      });

      // 广播完成消息
      const channel = generateChannelName(CHANNELS.TEST_PROGRESS, { testId: job.data.testId });
      const message = MESSAGE_FORMAT.createTestCompletedMessage(job.data.testId, result);
      this.broadcastMessage(channel, message.event, message.data);
      this.broadcastMessage(CHANNELS.QUEUE_UPDATES, MESSAGE_TYPES.QUEUE_JOB_COMPLETED, {
        jobId: job.id,
        testId: job.data.testId,
        result
      });
    });

    this.testQueue.on('failed', (job, err) => {
      logger.error('测试任务失败', err, {
        jobId: job.id,
        testId: job.data.testId,
        testType: job.data.testType,
        attempts: job.attemptsMade
      });

      // 广播失败消息
      const channel = generateChannelName(CHANNELS.TEST_PROGRESS, { testId: job.data.testId });
      this.broadcastMessage(channel, MESSAGE_TYPES.TEST_FAILED, {
        testId: job.data.testId,
        error: err.message,
        attempts: job.attemptsMade
      });
      this.broadcastMessage(CHANNELS.QUEUE_UPDATES, MESSAGE_TYPES.QUEUE_JOB_FAILED, {
        jobId: job.id,
        testId: job.data.testId,
        error: err.message
      });
    });

    this.testQueue.on('stalled', (job) => {
      logger.warn('测试任务停滞', {
        jobId: job.id,
        testId: job.data.testId
      });
    });

    this.testQueue.on('progress', (job, progress) => {
      logger.debug('测试任务进度', {
        jobId: job.id,
        testId: job.data.testId,
        progress
      });

      // 广播进度消息
      const channel = generateChannelName(CHANNELS.TEST_PROGRESS, { testId: job.data.testId });
      const message = MESSAGE_FORMAT.createTestProgressMessage(job.data.testId, progress, {
        message: `任务进度: ${progress}%`
      });
      this.broadcastMessage(channel, message.event, message.data);
      this.broadcastMessage(CHANNELS.QUEUE_UPDATES, MESSAGE_TYPES.QUEUE_JOB_PROGRESS, {
        jobId: job.id,
        testId: job.data.testId,
        progress
      });
    });

    // 监听active事件
    this.testQueue.on('active', (job) => {
      logger.info('测试任务开始执行', {
        jobId: job.id,
        testId: job.data.testId
      });

      // 广播开始消息
      const channel = generateChannelName(CHANNELS.TEST_PROGRESS, { testId: job.data.testId });
      this.broadcastMessage(channel, MESSAGE_TYPES.TEST_STARTED, {
        testId: job.data.testId,
        testType: job.data.testType,
        url: job.data.url,
        startedAt: new Date().toISOString()
      });
      this.broadcastMessage(CHANNELS.QUEUE_UPDATES, MESSAGE_TYPES.QUEUE_JOB_STARTED, {
        jobId: job.id,
        testId: job.data.testId
      });
    });
  }

  /**
   * 设置任务处理器
   */
  setupProcessors() {
    if (!this.testQueue) return;

    // 主要处理器 - 并发处理5个任务
    this.testQueue.process(5, async (job) => {
      const { testId, testType, url, config, userId } = job.data;

      logger.info('开始处理测试任务', {
        jobId: job.id,
        testId,
        testType,
        url
      });

      try {
        // 更新数据库状态为running
        await this.updateTestStatus(testId, 'running', 0);

        // 执行测试（这里会调用相应的测试引擎）
        const result = await this.executeTest(job.data, (progress) => {
          job.progress(progress);
        });

        // 更新数据库状态为completed
        await this.updateTestStatus(testId, 'completed', 100, null, result);

        return result;
      } catch (error) {
        // 更新数据库状态为failed
        await this.updateTestStatus(testId, 'failed', job.progress(), error.message);
        throw error;
      }
    });
  }

  /**
   * 添加测试到队列
   */
  async addTest(testData, priority = 0) {
    const { testId, testType, url, config = {}, userId } = testData;

    try {
      // 保存到数据库
      await this.saveTestToDatabase(testData);

      // 添加到队列
      if (this.useFallback) {
        // 使用内存队列
        return await this.addToFallbackQueue(testData, priority);
      } else {
        // 使用Redis队列
        const job = await this.testQueue.add(testData, {
          priority,
          jobId: testId // 使用testId作为jobId，避免重复
        });

        logger.info('测试任务已加入队列', {
          jobId: job.id,
          testId,
          testType,
          priority,
          queueMode: 'redis'
        });

        return {
          success: true,
          jobId: job.id,
          testId,
          queuePosition: await this.getQueuePosition(job.id),
          estimatedWaitTime: await this.getEstimatedWaitTime()
        };
      }
    } catch (error) {
      logger.error('添加测试到队列失败', error, { testId, testType });
      throw error;
    }
  }

  /**
   * 保存测试到数据库
   */
  async saveTestToDatabase(testData) {
    const { testId, testType, url, config, userId, testName } = testData;

    await query(
      `INSERT INTO test_queue (id, test_id, test_type, url, config, user_id, status, priority, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (test_id) DO UPDATE
       SET status = $6, updated_at = NOW()`,
      [testId, testType, url, JSON.stringify(config), userId, 'queued', testData.priority || 0]
    );
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, progress, errorMessage = null, result = null) {
    try {
      const updates = ['status = $1', 'progress = $2'];
      const values = [status, progress, testId];
      let paramIndex = 3;

      if (status === 'running' && progress === 0) {
        updates.push(`started_at = NOW()`);
      }

      if (status === 'completed' || status === 'failed') {
        updates.push(`completed_at = NOW()`);
      }

      if (errorMessage) {
        updates.push(`error_message = $${++paramIndex}`);
        values.splice(paramIndex - 1, 0, errorMessage);
      }

      if (result) {
        updates.push(`result = $${++paramIndex}`);
        values.splice(paramIndex - 1, 0, JSON.stringify(result));
      }

      await query(
        `UPDATE test_queue SET ${updates.join(', ')} WHERE test_id = $${values.length}`,
        values
      );
    } catch (error) {
      logger.error('更新测试状态失败', error, { testId, status });
    }
  }

  /**
   * 执行测试（调用相应的测试引擎）
   */
  async executeTest(testData, progressCallback) {
    const { testType, url, config } = testData;

    // 动态加载测试引擎
    let TestEngine;
    let result;

    try {
      switch (testType) {
        case 'performance':
          TestEngine = require('../../engines/performance/PerformanceTestEngine');
          break;
        case 'security':
          TestEngine = require('../../engines/security/securityTestEngine');
          break;
        case 'seo':
          TestEngine = require('../../engines/seo/SEOTestEngine');
          break;
        case 'api':
          TestEngine = require('../../engines/api/apiTestEngine');
          break;
        case 'compatibility':
          TestEngine = require('../../engines/compatibility/compatibilityTestEngine');
          break;
        case 'accessibility':
          TestEngine = require('../../engines/accessibility/AccessibilityTestEngine');
          break;
        case 'stress':
          TestEngine = require('../../engines/stress/stressTestEngine');
          break;
        default:
          throw new Error(`不支持的测试类型: ${testType}`);
      }

      // 创建引擎实例并执行测试
      const engine = new TestEngine();
      
      // 模拟进度更新
      progressCallback(10);
      
      // 执行测试
      if (typeof engine.analyze === 'function') {
        result = await engine.analyze(url, config);
      } else if (typeof engine.test === 'function') {
        result = await engine.test(url, config);
      } else if (typeof engine.run === 'function') {
        result = await engine.run(url, config);
      } else {
        throw new Error(`测试引擎缺少执行方法: ${testType}`);
      }

      progressCallback(90);

      return result;
    } catch (error) {
      logger.error('测试执行失败', error, { testType, url });
      throw error;
    }
  }

  /**
   * 内存队列fallback - 添加任务
   */
  async addToFallbackQueue(testData, priority) {
    const task = {
      ...testData,
      priority,
      addedAt: Date.now(),
      status: 'queued'
    };

    this.fallbackQueue.push(task);
    this.fallbackQueue.sort((a, b) => b.priority - a.priority);

    // 如果队列未在处理，启动处理
    if (!this.processingFallback) {
      this.processFallbackQueue();
    }

    logger.info('测试任务已加入内存队列', {
      testId: testData.testId,
      testType: testData.testType,
      queueLength: this.fallbackQueue.length,
      queueMode: 'memory'
    });

    return {
      success: true,
      jobId: testData.testId,
      testId: testData.testId,
      queuePosition: this.fallbackQueue.findIndex(t => t.testId === testData.testId),
      estimatedWaitTime: this.fallbackQueue.length * 30 // 估算每个测试30秒
    };
  }

  /**
   * 处理内存队列
   */
  async processFallbackQueue() {
    if (this.processingFallback) return;
    this.processingFallback = true;

    while (this.fallbackQueue.length > 0) {
      const task = this.fallbackQueue.shift();
      
      try {
        await this.updateTestStatus(task.testId, 'running', 0);
        
        const result = await this.executeTest(task, (progress) => {
          // 内存队列的进度更新
          logger.debug('内存队列任务进度', { testId: task.testId, progress });
        });

        await this.updateTestStatus(task.testId, 'completed', 100, null, result);
      } catch (error) {
        await this.updateTestStatus(task.testId, 'failed', 0, error.message);
        logger.error('内存队列任务执行失败', error, { testId: task.testId });
      }
    }

    this.processingFallback = false;
  }

  /**
   * 获取队列位置
   */
  async getQueuePosition(jobId) {
    if (this.useFallback) {
      return this.fallbackQueue.findIndex(t => t.testId === jobId);
    }

    try {
      const waiting = await this.testQueue.getWaiting();
      const position = waiting.findIndex(job => job.id === jobId);
      return position >= 0 ? position : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取预估等待时间（秒）
   */
  async getEstimatedWaitTime() {
    if (this.useFallback) {
      return this.fallbackQueue.length * 30;
    }

    try {
      const waitingCount = await this.testQueue.getWaitingCount();
      return waitingCount * 30; // 假设每个测试平均30秒
    } catch (error) {
      return 0;
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testId) {
    try {
      if (this.useFallback) {
        // 从内存队列中移除
        const index = this.fallbackQueue.findIndex(t => t.testId === testId);
        if (index >= 0) {
          this.fallbackQueue.splice(index, 1);
          await this.updateTestStatus(testId, 'cancelled', 0);
          return { success: true, message: '测试已从内存队列中取消' };
        }
      } else {
        // 从Redis队列中移除
        const job = await this.testQueue.getJob(testId);
        if (job) {
          await job.remove();
          await this.updateTestStatus(testId, 'cancelled', 0);
          return { success: true, message: '测试已从队列中取消' };
        }
      }

      return { success: false, message: '测试不在队列中' };
    } catch (error) {
      logger.error('取消测试失败', error, { testId });
      throw error;
    }
  }

  /**
   * 重试失败的测试
   */
  async retryTest(testId) {
    try {
      // 从数据库获取测试信息
      const result = await query(
        'SELECT * FROM test_queue WHERE test_id = $1',
        [testId]
      );

      if (result.rows.length === 0) {
        throw new Error('测试不存在');
      }

      const test = result.rows[0];
      
      // 增加重试次数
      await query(
        'UPDATE test_queue SET retry_count = retry_count + 1, status = $1 WHERE test_id = $2',
        ['queued', testId]
      );

      // 重新加入队列
      return await this.addTest({
        testId: test.test_id,
        testType: test.test_type,
        url: test.url,
        config: test.config,
        userId: test.user_id
      });
    } catch (error) {
      logger.error('重试测试失败', error, { testId });
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    if (this.useFallback) {
      return {
        mode: 'memory',
        waiting: this.fallbackQueue.filter(t => t.status === 'queued').length,
        active: this.processingFallback ? 1 : 0,
        completed: 0,
        failed: 0,
        total: this.fallbackQueue.length
      };
    }

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.testQueue.getWaitingCount(),
        this.testQueue.getActiveCount(),
        this.testQueue.getCompletedCount(),
        this.testQueue.getFailedCount()
      ]);

      return {
        mode: 'redis',
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
      };
    } catch (error) {
      logger.error('获取队列状态失败', error);
      return {
        mode: 'redis',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * 获取任务列表
   */
  async getJobs(status = 'all', page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      const params = [limit, offset];
      
      if (status !== 'all') {
        whereClause = 'WHERE status = $3';
        params.push(status);
      }

      const result = await query(
        `SELECT * FROM test_queue 
         ${whereClause}
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM test_queue ${whereClause}`,
        status !== 'all' ? [status] : []
      );

      return {
        jobs: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('获取任务列表失败', error);
      throw error;
    }
  }

  /**
   * 清理完成的任务
   */
  async cleanupCompleted(olderThan = 7) {
    try {
      const result = await query(
        `DELETE FROM test_queue 
         WHERE status IN ('completed', 'cancelled') 
         AND completed_at < NOW() - INTERVAL '${olderThan} days'
         RETURNING test_id`,
        []
      );

      logger.info('清理完成的测试任务', {
        count: result.rows.length,
        olderThanDays: olderThan
      });

      return { success: true, cleaned: result.rows.length };
    } catch (error) {
      logger.error('清理任务失败', error);
      throw error;
    }
  }

  /**
   * 关闭队列服务
   */
  async close() {
    try {
      if (this.testQueue) {
        await this.testQueue.close();
      }
      if (this.redis) {
        this.redis.disconnect();
      }
      logger.info('测试队列服务已关闭');
    } catch (error) {
      logger.error('关闭队列服务失败', error);
    }
  }
}

// 创建单例
const testQueueService = new TestQueueService();

module.exports = testQueueService;

