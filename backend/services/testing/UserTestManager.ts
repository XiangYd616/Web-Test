const { createEngine } = require('./TestEngineFactory');
const { query } = require('../../config/database');

type EngineProgress = Record<string, unknown> & { testId?: string };

type EngineInstance = {
  setProgressCallback: (callback: (progress: EngineProgress) => void) => void;
  setCompletionCallback: (callback: (results: Record<string, unknown>) => void) => void;
  setErrorCallback: (callback: (error: Error) => void) => void;
  getTestStatus: (testId: string) => unknown;
  stopTest: (testId: string) => Promise<boolean> | boolean;
};

type SocketLike = {
  connected?: boolean;
  emit: (event: string, data: unknown) => void;
};

const Logger = {
  info: (msg: string, meta?: unknown) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg: string, meta?: unknown) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg: string, error?: unknown, meta?: unknown) =>
    console.error(`[ERROR] ${msg}`, error || '', meta || ''),
  debug: (msg: string, meta?: unknown) =>
    process.env.NODE_ENV === 'development' ? console.log(`[DEBUG] ${msg}`, meta || '') : undefined,
};

class UserTestManager {
  private userTests: Map<string, Map<string, EngineInstance>> = new Map();
  private userSockets: Map<string, SocketLike> = new Map();

  constructor() {
    Logger.info('用户测试管理器初始化完成');
  }

  registerUserSocket(userId: string, socket: SocketLike) {
    this.userSockets.set(userId, socket);
    Logger.info(`用户WebSocket连接已注册: ${userId}`);
  }

  unregisterUserSocket(userId: string) {
    this.userSockets.delete(userId);
    Logger.info(`用户WebSocket连接已移除: ${userId}`);
  }

  getUserTestEngine(userId: string, testId: string) {
    const userTests = this.userTests.get(userId);
    if (!userTests) {
      return null;
    }
    return userTests.get(testId) || null;
  }

  createUserTest(userId: string, testId: string, testType = 'stress') {
    if (!this.userTests.has(userId)) {
      this.userTests.set(userId, new Map());
    }

    const userTests = this.userTests.get(userId) as Map<string, EngineInstance>;
    if (userTests.has(testId)) {
      Logger.info(`返回现有测试实例: ${userId}/${testId}`);
      return userTests.get(testId);
    }

    const engineType = testType || 'stress';
    const testEngine = createEngine(engineType) as EngineInstance;

    testEngine.setProgressCallback(progress => {
      this.sendToUser(userId, 'test-progress', {
        testId,
        ...progress,
      });
    });

    testEngine.setCompletionCallback(async results => {
      this.sendToUser(userId, 'test-completed', {
        testId,
        results,
      });

      try {
        await this.saveTestResults(userId, testId, results);
        Logger.info(`测试结果已保存到数据库: ${userId}/${testId}`);
      } catch (error) {
        Logger.error(`保存测试结果失败: ${userId}/${testId}`, error);
        this.sendToUser(userId, 'test-save-error', {
          testId,
          error: (error as Error).message,
        });
      }

      this.cleanupUserTest(userId, testId);
    });

    testEngine.setErrorCallback(error => {
      this.sendToUser(userId, 'test-error', {
        testId,
        error: error.message,
      });

      this.cleanupUserTest(userId, testId);
    });

    userTests.set(testId, testEngine);
    Logger.info(`创建新测试实例: ${userId}/${testId}`);

    return testEngine;
  }

  getUserTestStatus(userId: string, testId: string) {
    const testEngine = this.getUserTestEngine(userId, testId);
    if (!testEngine) {
      return null;
    }
    return testEngine.getTestStatus(testId);
  }

  async stopUserTest(userId: string, testId: string) {
    const testEngine = this.getUserTestEngine(userId, testId);
    if (!testEngine) {
      throw new Error(`测试不存在: ${userId}/${testId}`);
    }

    await testEngine.stopTest(testId);
    this.cleanupUserTest(userId, testId);

    Logger.info(`用户测试已停止: ${userId}/${testId}`);
  }

  cleanupUserTest(userId: string, testId: string) {
    const userTests = this.userTests.get(userId);
    if (userTests) {
      userTests.delete(testId);

      if (userTests.size === 0) {
        this.userTests.delete(userId);
      }
    }

    Logger.info(`清理测试实例: ${userId}/${testId}`);
  }

  cleanupUserTests(userId: string) {
    const userTests = this.userTests.get(userId);
    if (userTests) {
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

  sendToUser(userId: string, event: string, data: Record<string, unknown>) {
    const socket = this.userSockets.get(userId);
    if (socket && socket.connected) {
      socket.emit(event, data);
      Logger.debug(`向用户发送消息: ${userId} -> ${event}`);
    } else {
      Logger.warn(`用户WebSocket连接不可用: ${userId}`);
    }
  }

  getStats() {
    const totalUsers = this.userTests.size;
    let totalTests = 0;

    for (const userTests of this.userTests.values()) {
      totalTests += userTests.size;
    }

    return {
      totalUsers,
      totalTests,
      connectedSockets: this.userSockets.size,
    };
  }

  cleanup() {
    Logger.info('开始清理用户测试管理器...');

    for (const [userId, userTests] of this.userTests) {
      for (const [testId, testEngine] of userTests) {
        try {
          testEngine.stopTest(testId);
        } catch (error) {
          Logger.error(`清理时停止测试失败: ${userId}/${testId}`, error);
        }
      }
    }

    this.userTests.clear();
    this.userSockets.clear();

    Logger.info('用户测试管理器清理完成');
  }

  async saveTestResults(userId: string, testId: string, results: Record<string, unknown>) {
    try {
      const overallScore =
        (results as { overallScore?: number }).overallScore ??
        (results as { score?: number }).score ??
        this.calculateOverallScore(results);

      let duration = (results as { duration?: number }).duration
        ? Math.floor(((results as { duration?: number }).duration || 0) / 1000)
        : 0;
      if ((results as { actualDuration?: number }).actualDuration) {
        duration = Math.floor(
          ((results as { actualDuration?: number }).actualDuration || 0) / 1000
        );
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

  calculateOverallScore(results: Record<string, unknown>) {
    const metrics = (results as { metrics?: Record<string, number> }).metrics;
    if (!metrics) return 0;

    const {
      totalRequests = 0,
      successfulRequests = 0,
      averageResponseTime = 0,
      errorRate = 0,
    } = metrics;

    let score = 100;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    score = score * (successRate / 100);

    if (averageResponseTime > 1000) {
      score *= 0.8;
    } else if (averageResponseTime > 500) {
      score *= 0.9;
    }

    if (errorRate > 10) {
      score *= 0.7;
    } else if (errorRate > 5) {
      score *= 0.85;
    }

    return Math.max(0, Math.round(score));
  }
}

const userTestManager = new UserTestManager();

module.exports = userTestManager;

export {};
