/**
 * 实时测试执行器
 * 负责管理测试队列、实时执行测试并通过WebSocket推送进度和结果
 */

const EventEmitter = require('events');
const { query, transaction } = require('../../config/database');

// 导入测试引擎
const ApiTestEngine = require('../../engines/api/ApiTestEngine');
const PerformanceTestEngine = require('../../engines/performance/performanceTestEngine');
const SecurityTestEngine = require('../../engines/security/SecurityTestEngine');
const SeoTestEngine = require('../../engines/seo/SEOTestEngine');
const UxTestEngine = require('../../engines/ux/UXTestEngine');

class RealtimeTestRunner extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.activeTests = new Map();
    this.testQueue = [];
    this.maxConcurrentTests = parseInt(process.env.MAX_CONCURRENT_TESTS) || 5;
    this.runningCount = 0;
    
    // 初始化测试引擎
    this.engines = {
      api: new ApiTestEngine(),
      performance: new PerformanceTestEngine(),
      security: new SecurityTestEngine(),
      seo: new SeoTestEngine(),
      ux: new UxTestEngine()
    };

    // 启动队列处理器
    this.startQueueProcessor();
  }

  /**
   * 添加测试到队列
   */
  async addTest(testConfig, userId = null, projectId = null) {
    try {
      // 验证测试类型
      if (!this.engines[testConfig.type]) {
        throw new Error(`不支持的测试类型: ${testConfig.type}`);
      }

      // 创建测试记录
      const result = await query(`
        INSERT INTO tests (type, url, config, status, user_id, project_id, started_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, uuid, type, url, status, created_at
      `, [
        testConfig.type,
        testConfig.url,
        JSON.stringify(testConfig),
        'pending',
        userId,
        projectId
      ]);

      const test = result.rows[0];

      // 添加到队列
      await query(`
        INSERT INTO test_queue (test_id, user_id, priority, status, scheduled_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [test.id, userId, testConfig.priority || 5, 'queued']);

      // 添加到内存队列
      this.testQueue.push({
        testId: test.id,
        uuid: test.uuid,
        type: testConfig.type,
        config: testConfig,
        userId,
        priority: testConfig.priority || 5,
        addedAt: Date.now()
      });

      // 排序队列 (优先级高的先执行)
      this.testQueue.sort((a, b) => b.priority - a.priority);


      // 通知客户端
      this.emitToUser(userId, 'test-queued', {
        testId: test.uuid,
        type: testConfig.type,
        status: 'queued',
        queuePosition: this.testQueue.length,
        estimatedWaitTime: this.getEstimatedWaitTime()
      });

      return test;

    } catch (error) {
      console.error('添加测试到队列失败:', error);
      throw error;
    }
  }

  /**
   * 启动队列处理器
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.runningCount >= this.maxConcurrentTests || this.testQueue.length === 0) {
        return;
      }

      const nextTest = this.testQueue.shift();
      if (nextTest) {
        this.runTest(nextTest);
      }
    }, 1000); // 每秒检查一次队列

    console.log('🚀 测试队列处理器已启动');
  }

  /**
   * 执行单个测试
   */
  async runTest(testItem) {
    const { testId, uuid, type, config, userId } = testItem;
    
    try {
      this.runningCount++;
      
      // 更新测试状态为运行中
      await query(`
        UPDATE tests SET status = $1, started_at = NOW() 
        WHERE id = $2
      `, ['running', testId]);

      await query(`
        UPDATE test_queue SET status = $1, started_at = NOW() 
        WHERE test_id = $2
      `, ['processing', testId]);

      // 添加到活跃测试映射
      this.activeTests.set(testId, {
        uuid,
        type,
        startTime: Date.now(),
        userId,
        progress: 0
      });


      // 通知客户端测试开始
      this.emitToUser(userId, 'test-started', {
        testId: uuid,
        type,
        startTime: Date.now(),
        status: 'running'
      });

      // 监听引擎进度更新
      const engine = this.engines[type];
      const originalUpdateProgress = engine.updateTestProgress.bind(engine);
      
      engine.updateTestProgress = (engineTestId, progress, message) => {
        // 调用原始方法
        originalUpdateProgress(engineTestId, progress, message);
        
        // 发送实时进度更新
        this.emitToUser(userId, 'test-progress', {
          testId: uuid,
          progress,
          message,
          timestamp: Date.now()
        });

        // 更新活跃测试进度
        if (this.activeTests.has(testId)) {
          const activeTest = this.activeTests.get(testId);
          activeTest.progress = progress;
          this.activeTests.set(testId, activeTest);
        }
      };

      // 执行测试
      let results;
      switch (type) {
        case 'api':
          results = await engine.runApiTest(config);
          break;
        case 'performance':
          results = await engine.runPerformanceTest(config);
          break;
        case 'security':
          results = await engine.runSecurityTest(config);
          break;
        case 'seo':
          results = await engine.runSeoTest(config);
          break;
        case 'ux':
          results = await engine.runUxTest(config);
          break;
        default:
          throw new Error(`未实现的测试类型: ${type}`);
      }

      // 计算测试耗时
      const duration = Date.now() - this.activeTests.get(testId).startTime;

      // 更新测试结果
      await query(`
        UPDATE tests 
        SET status = $1, results = $2, duration_ms = $3, completed_at = NOW(), updated_at = NOW()
        WHERE id = $4
      `, ['completed', JSON.stringify(results), duration, testId]);

      await query(`
        UPDATE test_queue 
        SET status = $1, completed_at = NOW()
        WHERE test_id = $2
      `, ['completed', testId]);

      // 记录测试历史
      await query(`
        INSERT INTO test_history (test_id, user_id, action, details, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        testId, 
        userId, 
        'completed', 
        JSON.stringify({ duration, resultsSummary: this.getResultsSummary(results, type) })
      ]);

      console.log(`✅ 测试完成: ${uuid} (用时: ${duration}ms)`);

      // 通知客户端测试完成
      this.emitToUser(userId, 'test-completed', {
        testId: uuid,
        type,
        status: 'completed',
        results,
        duration,
        completedAt: Date.now()
      });

      // 更新统计数据
      await this.updateStatistics(type, 'success');

    } catch (error) {
      console.error(`❌ 测试执行失败: ${uuid}`, error);

      // 更新测试状态为失败
      await query(`
        UPDATE tests 
        SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `, ['failed', error.message, testId]);

      await query(`
        UPDATE test_queue 
        SET status = $1, error_message = $2, completed_at = NOW()
        WHERE test_id = $3
      `, ['failed', error.message, testId]);

      // 记录失败历史
      await query(`
        INSERT INTO test_history (test_id, user_id, action, details, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [testId, userId, 'failed', JSON.stringify({ error: error.message })]);

      // 通知客户端测试失败
      this.emitToUser(userId, 'test-failed', {
        testId: uuid,
        type,
        status: 'failed',
        error: error.message,
        failedAt: Date.now()
      });

      // 更新统计数据
      await this.updateStatistics(type, 'failure');

    } finally {
      // 清理活跃测试
      this.activeTests.delete(testId);
      this.runningCount--;
      
      // 通知队列状态更新
      this.emitToAll('queue-status', {
        runningTests: this.runningCount,
        queuedTests: this.testQueue.length,
        maxConcurrent: this.maxConcurrentTests
      });
    }
  }

  /**
   * 获取结果摘要
   */
  getResultsSummary(results, type) {
    switch (type) {
      case 'api':
        return {
          totalEndpoints: results.summary?.total || 0,
          passedEndpoints: results.summary?.passed || 0,
          avgResponseTime: results.summary?.avgResponseTime || 0
        };
      case 'performance':
        return {
          performanceScore: results.scores?.performance || 0,
          loadTime: results.metrics?.loadTime || 0,
          fcp: results.metrics?.FCP?.value || 0
        };
      case 'security':
        return {
          securityScore: results.summary?.score || 0,
          checksPerformed: results.summary?.totalChecks || 0,
          issuesFound: results.summary?.failed || 0
        };
      case 'seo':
        return {
          seoScore: results.summary?.score || 0,
          checksPerformed: results.summary?.totalChecks || 0,
          issuesFound: results.summary?.failed || 0
        };
      case 'ux':
        return {
          uxScore: results.summary?.score || 0,
          checksPerformed: results.summary?.totalChecks || 0,
          issuesFound: results.summary?.failed || 0
        };
      default:
        return { completed: true };
    }
  }

  /**
   * 更新统计数据
   */
  async updateStatistics(testType, outcome) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 获取或创建今日统计记录
      const existingStats = await query(`
        SELECT id FROM test_statistics WHERE date = $1
      `, [today]);

      if (existingStats.rows.length === 0) {
        // 创建新的统计记录
        await query(`
          INSERT INTO test_statistics (date, total_tests, successful_tests, failed_tests, ${testType}_tests)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          today,
          1,
          outcome === 'success' ? 1 : 0,
          outcome === 'failure' ? 1 : 0,
          1
        ]);
      } else {
        // 更新现有统计记录
        const updateFields = [`${testType}_tests = ${testType}_tests + 1`, 'total_tests = total_tests + 1'];
        
        if (outcome === 'success') {
          updateFields.push('successful_tests = successful_tests + 1');
        } else {
          updateFields.push('failed_tests = failed_tests + 1');
        }

        await query(`
          UPDATE test_statistics 
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE date = $1
        `, [today]);
      }
    } catch (error) {
      console.error('更新统计数据失败:', error);
    }
  }

  /**
   * 获取估算等待时间
   */
  getEstimatedWaitTime() {
    if (this.testQueue.length === 0) return 0;
    
    // 简单估算：队列中每个测试平均用时30秒
    const avgTestDuration = 30000;
    return this.testQueue.length * avgTestDuration;
  }

  /**
   * 发送消息给特定用户
   */
  emitToUser(userId, event, data) {
    if (userId && this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * 发送消息给所有用户
   */
  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testId, reason = '用户取消') {
    try {
      // 查找测试
      const testResult = await query(`
        SELECT id, uuid, status, user_id FROM tests WHERE uuid = $1
      `, [testId]);

      if (testResult.rows.length === 0) {
        throw new Error('测试不存在');
      }

      const test = testResult.rows[0];

      if (test.status === 'completed' || test.status === 'failed') {
        throw new Error('测试已完成，无法取消');
      }

      // 从队列中移除（如果还在队列中）
      const queueIndex = this.testQueue.findIndex(item => item.uuid === testId);
      if (queueIndex !== -1) {
        this.testQueue.splice(queueIndex, 1);
      }

      // 更新数据库状态
      await query(`
        UPDATE tests 
        SET status = $1, error_message = $2, completed_at = NOW(), updated_at = NOW()
        WHERE uuid = $3
      `, ['cancelled', reason, testId]);

      await query(`
        UPDATE test_queue 
        SET status = $1, error_message = $2, completed_at = NOW()
        WHERE test_id = $3
      `, ['cancelled', reason, test.id]);

      // 记录取消历史
      await query(`
        INSERT INTO test_history (test_id, user_id, action, details, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [test.id, test.user_id, 'cancelled', JSON.stringify({ reason })]);

      // 通知客户端
      this.emitToUser(test.user_id, 'test-cancelled', {
        testId,
        reason,
        cancelledAt: Date.now()
      });

      // 清理活跃测试记录
      this.activeTests.delete(test.id);

      return { success: true, message: '测试已取消' };

    } catch (error) {
      console.error('取消测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      runningTests: this.runningCount,
      queuedTests: this.testQueue.length,
      maxConcurrent: this.maxConcurrentTests,
      activeTests: Array.from(this.activeTests.entries()).map(([testId, test]) => ({
        testId,
        uuid: test.uuid,
        type: test.type,
        progress: test.progress,
        duration: Date.now() - test.startTime
      }))
    };
  }

  /**
   * 获取用户的测试历史
   */
  async getUserTestHistory(userId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          t.uuid,
          t.type,
          t.url,
          t.status,
          t.duration_ms,
          t.error_message,
          t.created_at,
          t.completed_at,
          p.name as project_name
        FROM tests t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('获取用户测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试详细结果
   */
  async getTestResults(testId) {
    try {
      const result = await query(`
        SELECT uuid, type, url, status, config, results, duration_ms, error_message, 
               created_at, started_at, completed_at
        FROM tests 
        WHERE uuid = $1
      `, [testId]);

      if (result.rows.length === 0) {
        throw new Error('测试不存在');
      }

      return result.rows[0];
    } catch (error) {
      console.error('获取测试结果失败:', error);
      throw error;
    }
  }
}

module.exports = RealtimeTestRunner;
