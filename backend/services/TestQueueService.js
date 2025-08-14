const { models } = require('../database/sequelize');
const databaseService = require('./DatabaseService');
const webSocketService = require('./WebSocketService');

/**
 * 测试队列管理服务
 * 控制并发测试数量，管理测试队列和资源使用
 */
class TestQueueService {
  constructor() {
    this.maxConcurrentTests = parseInt(process.env.MAX_CONCURRENT_TESTS) || 5;
    this.runningTests = new Map(); // 当前运行的测试
    this.testQueue = []; // 等待队列
    this.resourceMonitor = {
      cpu: 0,
      memory: 0,
      lastCheck: Date.now()
    };
    this.workerPool = new Map(); // 工作进程池
    this.isProcessing = false;
  }

  /**
   * 初始化队列服务
   */
  async initialize() {
    console.log('🚀 初始化测试队列服务...');
    
    // 恢复未完成的测试
    await this.recoverPendingTests();
    
    // 启动队列处理器
    this.startQueueProcessor();
    
    // 启动资源监控
    this.startResourceMonitor();
    
    console.log(`✅ 测试队列服务初始化完成 (最大并发: ${this.maxConcurrentTests})`);
  }

  /**
   * 添加测试到队列
   */
  async addTestToQueue(testData, priority = 0) {
    const { testId, testType, url, config, userId } = testData;

    try {
      // 检查是否已在队列中
      const existingQueue = await models.TestQueue.findOne({
        where: { test_id: testId }
      });

      if (existingQueue) {
        throw new Error(`测试 ${testId} 已在队列中`);
      }

      // 创建队列记录
      await models.TestQueue.create({
        test_id: testId,
        priority,
        status: 'queued',
        scheduled_at: new Date()
      });

      // 添加到内存队列
      this.testQueue.push({
        testId,
        testType,
        url,
        config,
        userId,
        priority,
        addedAt: new Date()
      });

      // 按优先级排序
      this.testQueue.sort((a, b) => b.priority - a.priority);

      console.log(`📋 测试已加入队列: ${testId} (优先级: ${priority})`);
      
      // 尝试立即处理队列
      this.processQueue();

      return {
        testId,
        queuePosition: this.getQueuePosition(testId),
        estimatedWaitTime: this.estimateWaitTime(testId)
      };

    } catch (error) {
      console.error(`❌ 添加测试到队列失败 (${testId}):`, error);
      throw error;
    }
  }

  /**
   * 处理测试队列
   */
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.testQueue.length > 0 && this.runningTests.size < this.maxConcurrentTests) {
        // 检查系统资源
        if (!this.checkSystemResources()) {
          console.log('⚠️ 系统资源不足，暂停处理队列');
          break;
        }

        const testItem = this.testQueue.shift();
        await this.startTest(testItem);
      }
    } catch (error) {
      console.error('❌ 处理测试队列失败:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 启动测试
   */
  async startTest(testItem) {
    const { testId, testType, url, config, userId } = testItem;

    try {
      // 更新队列状态
      await models.TestQueue.update({
        status: 'processing',
        started_at: new Date()
      }, {
        where: { test_id: testId }
      });

      // 添加到运行中的测试
      this.runningTests.set(testId, {
        ...testItem,
        startedAt: new Date(),
        workerId: this.generateWorkerId()
      });

      // 更新测试状态
      await databaseService.updateTestStatus(testId, 'running', 0);

      // 发送WebSocket通知
      webSocketService.broadcastTestStatusUpdate(testId, 'running', 0, '测试开始执行');

      console.log(`🚀 开始执行测试: ${testId} (类型: ${testType})`);

      // 异步执行测试
      this.executeTest(testItem).catch(error => {
        console.error(`❌ 测试执行失败 (${testId}):`, error);
        this.handleTestFailure(testId, error);
      });

    } catch (error) {
      console.error(`❌ 启动测试失败 (${testId}):`, error);
      await this.handleTestFailure(testId, error);
    }
  }

  /**
   * 执行测试
   */
  async executeTest(testItem) {
    const { testId, testType, url, config } = testItem;

    try {
      let testResult;

      // 根据测试类型调用相应的测试引擎
      switch (testType.toLowerCase()) {
        case 'api':
          const { RealAPITestEngine } = require('../engines/api/apiTestEngine');
          const apiEngine = new RealAPITestEngine();
          testResult = await apiEngine.runAPITest(config, testId);
          break;

        case 'security':
          const RealSecurityTestEngine = require('../engines/security/securityTestEngine');
          const securityEngine = new RealSecurityTestEngine();
          testResult = await securityEngine.runSecurityTest(url, config, testId);
          break;

        case 'stress':
          const { RealStressTestEngine } = require('../engines/stress/stressTestEngine');
          const stressEngine = new RealStressTestEngine();
          testResult = await stressEngine.runStressTest(url, config, testId);
          break;

        // 添加其他测试类型...

        default:
          throw new Error(`不支持的测试类型: ${testType}`);
      }

      // 保存测试结果
      const score = testResult.score || (testResult.results?.score) || null;
      await databaseService.saveTestResult(testId, testResult, score);

      // 完成测试
      await this.completeTest(testId, testResult, true);

    } catch (error) {
      await this.handleTestFailure(testId, error);
    }
  }

  /**
   * 完成测试
   */
  async completeTest(testId, result, success) {
    try {
      // 更新队列状态
      await models.TestQueue.update({
        status: 'completed',
        completed_at: new Date()
      }, {
        where: { test_id: testId }
      });

      // 从运行中的测试移除
      this.runningTests.delete(testId);

      // 发送WebSocket通知
      webSocketService.broadcastTestCompleted(testId, result, success);

      console.log(`✅ 测试完成: ${testId}`);

      // 继续处理队列
      this.processQueue();

    } catch (error) {
      console.error(`❌ 完成测试失败 (${testId}):`, error);
    }
  }

  /**
   * 处理测试失败
   */
  async handleTestFailure(testId, error) {
    try {
      // 更新队列状态
      await models.TestQueue.update({
        status: 'failed',
        completed_at: new Date()
      }, {
        where: { test_id: testId }
      });

      // 更新测试状态
      await databaseService.updateTestStatus(testId, 'failed', 100, error.message);

      // 从运行中的测试移除
      this.runningTests.delete(testId);

      // 发送WebSocket通知
      webSocketService.broadcastTestError(testId, error, 'TEST_EXECUTION_FAILED');

      console.log(`❌ 测试失败: ${testId} - ${error.message}`);

      // 继续处理队列
      this.processQueue();

    } catch (dbError) {
      console.error(`❌ 处理测试失败时出错 (${testId}):`, dbError);
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testId) {
    try {
      // 从队列中移除
      const queueIndex = this.testQueue.findIndex(item => item.testId === testId);
      if (queueIndex !== -1) {
        this.testQueue.splice(queueIndex, 1);
        console.log(`🚫 从队列中移除测试: ${testId}`);
      }

      // 如果正在运行，标记为取消
      if (this.runningTests.has(testId)) {
        this.runningTests.delete(testId);
        console.log(`🚫 取消运行中的测试: ${testId}`);
      }

      // 更新数据库状态
      await models.TestQueue.update({
        status: 'failed',
        completed_at: new Date()
      }, {
        where: { test_id: testId }
      });

      await databaseService.updateTestStatus(testId, 'cancelled', 100, '测试已被取消');

      // 发送WebSocket通知
      webSocketService.broadcastTestStatusUpdate(testId, 'cancelled', 100, '测试已被取消');

      return true;
    } catch (error) {
      console.error(`❌ 取消测试失败 (${testId}):`, error);
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueLength: this.testQueue.length,
      runningTests: this.runningTests.size,
      maxConcurrentTests: this.maxConcurrentTests,
      availableSlots: this.maxConcurrentTests - this.runningTests.size,
      resourceUsage: this.resourceMonitor
    };
  }

  /**
   * 获取队列位置
   */
  getQueuePosition(testId) {
    return this.testQueue.findIndex(item => item.testId === testId) + 1;
  }

  /**
   * 估算等待时间
   */
  estimateWaitTime(testId) {
    const position = this.getQueuePosition(testId);
    if (position === 0) return 0;

    const avgTestDuration = 120000; // 2分钟平均测试时间
    const availableSlots = this.maxConcurrentTests - this.runningTests.size;
    
    if (availableSlots > 0) {
      return 0;
    }

    const estimatedWait = Math.ceil(position / this.maxConcurrentTests) * avgTestDuration;
    return estimatedWait;
  }

  /**
   * 检查系统资源
   */
  checkSystemResources() {
    // 简单的资源检查，实际项目中可以更复杂
    const now = Date.now();
    if (now - this.resourceMonitor.lastCheck > 30000) { // 30秒检查一次
      this.updateResourceUsage();
    }

    // 如果CPU或内存使用率过高，暂停新测试
    return this.resourceMonitor.cpu < 80 && this.resourceMonitor.memory < 80;
  }

  /**
   * 更新资源使用情况
   */
  updateResourceUsage() {
    try {
      const os = require('os');
      
      // CPU使用率（简化计算）
      const cpus = os.cpus();
      this.resourceMonitor.cpu = Math.random() * 50 + 20; // 模拟值

      // 内存使用率
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      this.resourceMonitor.memory = ((totalMem - freeMem) / totalMem) * 100;
      
      this.resourceMonitor.lastCheck = Date.now();
    } catch (error) {
      console.error('❌ 更新资源使用情况失败:', error);
    }
  }

  /**
   * 启动队列处理器
   */
  startQueueProcessor() {
    setInterval(() => {
      if (this.testQueue.length > 0) {
        this.processQueue();
      }
    }, 5000); // 每5秒检查一次队列
  }

  /**
   * 启动资源监控
   */
  startResourceMonitor() {
    setInterval(() => {
      this.updateResourceUsage();
    }, 30000); // 每30秒更新资源使用情况
  }

  /**
   * 恢复未完成的测试
   */
  async recoverPendingTests() {
    try {
      const pendingTests = await models.TestQueue.findAll({
        where: {
          status: ['queued', 'processing']
        }
      });

      for (const queueItem of pendingTests) {
        // 重置为队列状态
        await models.TestQueue.update({
          status: 'queued',
          started_at: null
        }, {
          where: { id: queueItem.id }
        });

        console.log(`🔄 恢复未完成的测试: ${queueItem.test_id}`);
      }

      if (pendingTests.length > 0) {
        console.log(`📋 恢复了 ${pendingTests.length} 个未完成的测试`);
      }
    } catch (error) {
      console.error('❌ 恢复未完成测试失败:', error);
    }
  }

  /**
   * 生成工作进程ID
   */
  generateWorkerId() {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理过期队列项
   */
  async cleanupExpiredQueue() {
    try {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前

      const deletedCount = await models.TestQueue.destroy({
        where: {
          status: ['completed', 'failed'],
          completed_at: {
            [require('sequelize').Op.lt]: expiredTime
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`🧹 清理了 ${deletedCount} 个过期队列项`);
      }
    } catch (error) {
      console.error('❌ 清理过期队列项失败:', error);
    }
  }
}

// 创建单例实例
const testQueueService = new TestQueueService();

module.exports = testQueueService;
