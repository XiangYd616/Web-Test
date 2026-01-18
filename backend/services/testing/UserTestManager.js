/**
 * 用户测试管理器 - 简化的架构设计
 * 每个用户管理自己的测试实例，不需要全局状态
 */

const { createEngine } = require('./TestEngineFactory');
const { query } = require('../../config/database');
// 暂时使用console.log替代Logger
const Logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, error, meta) => console.error(`[ERROR] ${msg}`, error || '', meta || ''),
  debug: (msg, meta) => process.env.NODE_ENV === 'development' ? console.log(`[DEBUG] ${msg}`, meta || '') : undefined
};

class UserTestManager {
  constructor() {
    // 用户测试实例映射: userId -> { testId -> testEngine }
    this.userTests = new Map();

    // WebSocket连接映射: userId -> socket
    this.userSockets = new Map();

    Logger.info('用户测试管理器初始化完成');
  }

  /**
   * 注册用户WebSocket连接
   */
  registerUserSocket(userId, socket) {
    this.userSockets.set(userId, socket);
    Logger.info(`用户WebSocket连接已注册: ${userId}`);
  }

  /**
   * 移除用户WebSocket连接
   */
  unregisterUserSocket(userId) {
    this.userSockets.delete(userId);
    Logger.info(`用户WebSocket连接已移除: ${userId}`);
  }

  /**
   * 获取用户的测试实例
   */
  getUserTestEngine(userId, testId) {
    const userTests = this.userTests.get(userId);
    if (!userTests) {

      return null;
    }
    return userTests.get(testId);
  }

  /**
   * 为用户创建新的测试实例
   */
  createUserTest(userId, testId, testType = 'stress') {
    // 确保用户测试映射存在
    if (!this.userTests.has(userId)) {
      this.userTests.set(userId, new Map());
    }

    const userTests = this.userTests.get(userId);

    // 如果测试已存在，返回现有实例
    if (userTests.has(testId)) {
      Logger.info(`返回现有测试实例: ${userId}/${testId}`);
      return userTests.get(testId);
    }

    // 创建新的测试引擎实例
    const engineType = testType || 'stress';
    const testEngine = createEngine(engineType);

    // 设置进度回调，直接推送给用户
    testEngine.setProgressCallback((progress) => {
      this.sendToUser(userId, 'test-progress', {
        testId,
        ...progress
      });
    });

    // 设置完成回调
    testEngine.setCompletionCallback(async (results) => {
      this.sendToUser(userId, 'test-completed', {
        testId,
        results
      });

      // 🔧 保存测试结果到数据库
      try {
        await this.saveTestResults(userId, testId, results);
        Logger.info(`测试结果已保存到数据库: ${userId}/${testId}`);
      } catch (error) {
        Logger.error(`保存测试结果失败: ${userId}/${testId}`, error);
        // 发送保存失败通知
        this.sendToUser(userId, 'test-save-error', {
          testId,
          error: error.message
        });
      }

      // 测试完成后清理实例
      this.cleanupUserTest(userId, testId);
    });

    // 设置错误回调
    testEngine.setErrorCallback((error) => {
      this.sendToUser(userId, 'test-error', {
        testId,
        error: error.message
      });

      // 错误后清理实例
      this.cleanupUserTest(userId, testId);
    });

    userTests.set(testId, testEngine);
    Logger.info(`创建新测试实例: ${userId}/${testId}`);

    return testEngine;
  }

  /**
   * 获取用户测试状态
   */
  getUserTestStatus(userId, testId) {
    const testEngine = this.getUserTestEngine(userId, testId);
    if (!testEngine) {

      return null;
    }
    return testEngine.getTestStatus(testId);
  }

  /**
   * 停止用户测试
   */
  async stopUserTest(userId, testId) {
    const testEngine = this.getUserTestEngine(userId, testId);
    if (!testEngine) {
      throw new Error(`测试不存在: ${userId}/${testId}`);
    }

    await testEngine.stopTest(testId);
    this.cleanupUserTest(userId, testId);

    Logger.info(`用户测试已停止: ${userId}/${testId}`);
  }

  /**
   * 清理用户测试实例
   */
  cleanupUserTest(userId, testId) {
    const userTests = this.userTests.get(userId);
    if (userTests) {
      userTests.delete(testId);

      // 如果用户没有其他测试，清理用户映射
      if (userTests.size === 0) {
        this.userTests.delete(userId);
      }
    }

    Logger.info(`清理测试实例: ${userId}/${testId}`);
  }

  /**
   * 清理用户的所有测试
   */
  cleanupUserTests(userId) {
    const userTests = this.userTests.get(userId);
    if (userTests) {
      // 停止所有正在运行的测试
      for (const [testId, testEngine] of userTests) {
        try {
          testEngine.stopTest(testId);
        } catch (error) {
          Logger.error(`停止测试失败: ${userId}/${testId}`, error);
        }
      }

      this.userTests.delete(userId);
      Logger.info(`清理用户所有测试: ${userId}`);
    }
  }

  /**
   * 向用户发送WebSocket消息
   */
  sendToUser(userId, event, data) {
    const socket = this.userSockets.get(userId);
    if (socket && socket.connected) {
      socket.emit(event, data);
      Logger.debug(`向用户发送消息: ${userId} -> ${event}`);
    } else {
      Logger.warn(`用户WebSocket连接不可用: ${userId}`);
    }
  }

  /**
   * 获取系统统计信息
   */
  getStats() {
    const totalUsers = this.userTests.size;
    let totalTests = 0;

    for (const userTests of this.userTests.values()) {
      totalTests += userTests.size;
    }

    return {
      totalUsers,
      totalTests,
      connectedSockets: this.userSockets.size
    };
  }

  /**
   * 清理所有资源（用于应用关闭时）
   */
  cleanup() {
    Logger.info('开始清理用户测试管理器...');

    // 停止所有测试
    for (const [userId, userTests] of this.userTests) {
      for (const [testId, testEngine] of userTests) {
        try {
          testEngine.stopTest(testId);
        } catch (error) {
          Logger.error(`清理时停止测试失败: ${userId}/${testId}`, error);
        }
      }
    }

    // 清理所有映射
    this.userTests.clear();
    this.userSockets.clear();

    Logger.info('用户测试管理器清理完成');
  }

  /**
   * 保存测试结果到数据库
   */
  async saveTestResults(userId, testId, results) {
    try {
      const overallScore = results?.overallScore ?? results?.score ?? this.calculateOverallScore(results);

      let duration = results?.duration ? Math.floor(results.duration / 1000) : 0;
      if (results?.actualDuration) {
        duration = Math.floor(results.actualDuration / 1000);
      }

      if (!duration) {
        const durationResult = await query(
          'SELECT started_at FROM test_history WHERE test_id = $1 AND user_id = $2',
          [testId, userId]
        );
        if (durationResult.rows.length > 0 && durationResult.rows[0].started_at) {
          const startTime = new Date(durationResult.rows[0].started_at);
          duration = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
        }
      }

      await query(
        `UPDATE test_history
         SET status = 'completed',
             results = $1,
             completed_at = NOW(),
             duration = $2,
             overall_score = $3
         WHERE test_id = $4 AND user_id = $5`,
        [JSON.stringify(results), duration, overallScore, testId, userId]
      );

      Logger.info(`测试结果保存成功: ${testId}`);
    } catch (error) {
      Logger.error(`保存测试结果失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(results) {
    if (!results.metrics) return 0;

    const { totalRequests, successfulRequests, averageResponseTime, errorRate } = results.metrics;

    let score = 100;

    // 根据成功率扣分
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    score = score * (successRate / 100);

    // 根据响应时间扣分
    if (averageResponseTime > 1000) {
      score *= 0.8; // 响应时间超过1秒，扣20%
    } else if (averageResponseTime > 500) {
      score *= 0.9; // 响应时间超过500ms，扣10%
    }

    // 根据错误率扣分
    if (errorRate > 10) {
      score *= 0.7; // 错误率超过10%，扣30%
    } else if (errorRate > 5) {
      score *= 0.85; // 错误率超过5%，扣15%
    }

    return Math.max(0, Math.round(score));
  }

}

// 创建单例实例
const userTestManager = new UserTestManager();

module.exports = userTestManager;
