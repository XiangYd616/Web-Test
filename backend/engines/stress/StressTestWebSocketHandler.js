/**
 * 压力测试WebSocket处理器
 * 负责压力测试过程中的实时数据推送
 */

const webSocketService = require('../../services/WebSocketService');

class StressTestWebSocketHandler {
  constructor() {
    this.activeTests = new Map(); // 存储活跃的测试会话
    this.metricsBuffer = new Map(); // 指标缓冲区
    this.updateInterval = 1000; // 更新间隔（毫秒）
  }

  /**
   * 开始测试会话
   */
  startTestSession(testId, config) {
    console.log(`🚀 开始压力测试会话: ${testId}`);
    
    const session = {
      testId,
      config,
      startTime: Date.now(),
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTime: 0,
        throughput: 0,
        activeUsers: 0,
        errorRate: 0,
        phase: 'starting'
      },
      updateTimer: null
    };

    this.activeTests.set(testId, session);
    this.metricsBuffer.set(testId, []);

    // 开始定期更新
    this.startPeriodicUpdates(testId);

    // 发送测试开始通知
    webSocketService.broadcastTestStatus(testId, 'running', '测试已开始');
  }

  /**
   * 更新测试指标
   */
  updateMetrics(testId, metrics) {
    const session = this.activeTests.get(testId);
    if (!session) {
      return;
    }

    // 更新会话指标
    session.metrics = {
      ...session.metrics,
      ...metrics,
      timestamp: Date.now()
    };

    // 添加到缓冲区
    const buffer = this.metricsBuffer.get(testId) || [];
    buffer.push({
      ...metrics,
      timestamp: Date.now()
    });

    // 限制缓冲区大小
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }

    this.metricsBuffer.set(testId, buffer);
  }

  /**
   * 开始定期更新
   */
  startPeriodicUpdates(testId) {
    const session = this.activeTests.get(testId);
    if (!session) {
      return;
    }

    session.updateTimer = setInterval(() => {
      this.sendProgressUpdate(testId);
    }, this.updateInterval);
  }

  /**
   * 发送进度更新
   */
  sendProgressUpdate(testId) {
    const session = this.activeTests.get(testId);
    if (!session) {
      return;
    }

    const { metrics, startTime, config } = session;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / (config.duration * 1000)) * 100);

    // 计算当前步骤
    let currentStep = '准备中';
    const totalSteps = 4;
    
    if (progress < 10) {
      currentStep = '初始化连接';
    } else if (progress < 20) {
      currentStep = '用户爬坡';
    } else if (progress < 90) {
      currentStep = '压力测试执行';
    } else {
      currentStep = '测试收尾';
    }

    // 广播进度更新
    webSocketService.broadcastTestProgress(
      testId,
      progress,
      currentStep,
      totalSteps,
      `活跃用户: ${metrics.activeUsers}, 吞吐量: ${metrics.throughput.toFixed(1)} req/s`,
      {
        responseTime: metrics.responseTime,
        throughput: metrics.throughput,
        activeUsers: metrics.activeUsers,
        errorRate: metrics.errorRate,
        successRate: 100 - metrics.errorRate,
        phase: metrics.phase
      }
    );
  }

  /**
   * 完成测试会话
   */
  completeTestSession(testId, results) {
    console.log(`✅ 完成压力测试会话: ${testId}`);
    
    const session = this.activeTests.get(testId);
    if (!session) {
      return;
    }

    // 清理定时器
    if (session.updateTimer) {
      clearInterval(session.updateTimer);
    }

    // 发送最终进度更新
    webSocketService.broadcastTestProgress(
      testId,
      100,
      '测试完成',
      4,
      '测试已成功完成',
      session.metrics
    );

    // 发送完成通知
    webSocketService.broadcastTestCompleted(testId, results, true);

    // 清理会话
    this.activeTests.delete(testId);
    this.metricsBuffer.delete(testId);
  }

  /**
   * 失败测试会话
   */
  failTestSession(testId, error) {
    console.log(`❌ 压力测试会话失败: ${testId}`, error);
    
    const session = this.activeTests.get(testId);
    if (session && session.updateTimer) {
      clearInterval(session.updateTimer);
    }

    // 发送错误通知
    webSocketService.broadcastTestError(testId, error);

    // 清理会话
    this.activeTests.delete(testId);
    this.metricsBuffer.delete(testId);
  }

  /**
   * 取消测试会话
   */
  cancelTestSession(testId, reason = '用户取消') {
    
    const session = this.activeTests.get(testId);
    if (session && session.updateTimer) {
      clearInterval(session.updateTimer);
    }

    // 发送取消通知
    webSocketService.broadcastTestStatus(testId, 'cancelled', reason);

    // 清理会话
    this.activeTests.delete(testId);
    this.metricsBuffer.delete(testId);
  }

  /**
   * 获取测试会话信息
   */
  getTestSession(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 获取所有活跃测试
   */
  getActiveTests() {
    return Array.from(this.activeTests.keys());
  }

  /**
   * 获取测试指标历史
   */
  getMetricsHistory(testId) {
    return this.metricsBuffer.get(testId) || [];
  }

  /**
   * 清理所有会话
   */
  cleanup() {
    
    for (const [testId, session] of this.activeTests.entries()) {
      if (session.updateTimer) {
        clearInterval(session.updateTimer);
      }
    }

    this.activeTests.clear();
    this.metricsBuffer.clear();
  }

  /**
   * 模拟测试数据（用于开发测试）
   */
  simulateTestData(testId, duration = 60) {
    
    const config = {
      duration: duration,
      users: 50,
      rampUpTime: 10
    };

    this.startTestSession(testId, config);

    let currentUsers = 0;
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    const simulationInterval = setInterval(() => {
      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const session = this.activeTests.get(testId);
      if (!session) {
        clearInterval(simulationInterval);
        return;
      }

      const elapsed = (Date.now() - session.startTime) / 1000;
      const progress = (elapsed / duration) * 100;

      // 模拟用户爬坡
      if (elapsed < config.rampUpTime) {
        currentUsers = Math.floor((elapsed / config.rampUpTime) * config.users);
      } else {
        currentUsers = config.users;
      }

      // 模拟请求数据
      const requestsThisSecond = Math.floor(Math.random() * currentUsers * 2) + currentUsers;
      totalRequests += requestsThisSecond;
      successfulRequests += Math.floor(requestsThisSecond * (0.95 + Math.random() * 0.04));
      failedRequests = totalRequests - successfulRequests;

      // 模拟指标
      const metrics = {
        totalRequests,
        successfulRequests,
        failedRequests,
        responseTime: 50 + Math.random() * 200 + (progress > 80 ? Math.random() * 100 : 0),
        throughput: requestsThisSecond,
        activeUsers: currentUsers,
        errorRate: (failedRequests / totalRequests) * 100,
        phase: elapsed < config.rampUpTime ? 'ramp-up' : 
               elapsed < duration - 10 ? 'steady' : 'ramp-down'
      };

      this.updateMetrics(testId, metrics);

      // 测试完成
      if (elapsed >= duration) {
        clearInterval(simulationInterval);
        this.completeTestSession(testId, {
          summary: {
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime: metrics.responseTime,
            maxThroughput: Math.max(...this.getMetricsHistory(testId).map(m => m.throughput || 0))
          }
        });
      }
    }, 1000);
  }
}

// 创建单例实例
const stressTestWebSocketHandler = new StressTestWebSocketHandler();

module.exports = stressTestWebSocketHandler;
