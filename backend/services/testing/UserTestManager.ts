import type { TestProgress } from '../../../shared/types/testEngine.types';

const { query } = require('../../config/database');
const testRepository = require('../../repositories/testRepository');
const registry = require('../../core/TestEngineRegistry');
const { TestEngineType, TestStatus } = require('../../../shared/types/testEngine.types');

type EngineProgress = Record<string, unknown> & { testId?: string };

type EngineInstance = {
  executeTest: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  setProgressCallback: (callback: (progress: EngineProgress) => void) => void;
  setCompletionCallback: (callback: (results: Record<string, unknown>) => void) => void;
  setErrorCallback: (callback: (error: Error) => void) => void;
  getTestStatus: (testId: string) => unknown;
  stopTest: (testId: string) => Promise<void> | void;
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
  private stoppedTests: Set<string> = new Set();

  constructor() {
    Logger.info('用户测试管理器初始化完成');
  }

  private resolveEngineType(engineType: string) {
    const types = Object.values(TestEngineType) as string[];
    if (!types.includes(engineType)) {
      throw new Error(`未知测试引擎类型: ${engineType}`);
    }
    return engineType as (typeof TestEngineType)[keyof typeof TestEngineType];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    const resolvedType = this.resolveEngineType(engineType);
    let progressCallback: ((progress: EngineProgress) => void) | null = null;
    let completionCallback: ((results: Record<string, unknown>) => void) | null = null;
    let errorCallback: ((error: Error) => void) | null = null;

    const testEngine: EngineInstance = {
      executeTest: async (payload: Record<string, unknown>) => {
        const config = {
          ...payload,
          metadata: {
            ...(payload.metadata as Record<string, unknown>),
            testId,
          },
        } as Record<string, unknown>;

        try {
          const result = await registry.execute(resolvedType, config, (progress: TestProgress) => {
            if (!progressCallback) return;
            progressCallback({
              testId,
              progress: progress.progress,
              message: progress.currentStep,
              status: progress.status,
            });
          });
          if (completionCallback) {
            completionCallback(result as Record<string, unknown>);
          }
          return result as Record<string, unknown>;
        } catch (error) {
          if (errorCallback) {
            errorCallback(error as Error);
          }
          throw error;
        }
      },
      setProgressCallback: callback => {
        progressCallback = callback;
      },
      setCompletionCallback: callback => {
        completionCallback = callback;
      },
      setErrorCallback: callback => {
        errorCallback = callback;
      },
      getTestStatus: id => registry.getTestStatus(id),
      stopTest: id => registry.cancel(id),
    };

    testEngine.setProgressCallback(progress => {
      if (this.stoppedTests.has(testId)) {
        return;
      }
      this.sendToUser(userId, 'test-progress', {
        testId,
        ...progress,
      });

      const progressValue = (progress as { progress?: number }).progress;
      if (typeof progressValue === 'number') {
        Promise.resolve(testRepository.updateProgress(testId, progressValue)).catch(error => {
          Logger.warn(`更新测试进度失败: ${testId}`, error);
        });
      }

      const message = (progress as { message?: string }).message;
      if (message) {
        Promise.resolve(
          this.insertExecutionLog(testId, 'info', '测试进度更新', {
            message,
            progress: progressValue,
          })
        ).catch(error => Logger.warn(`记录测试进度日志失败: ${testId}`, error));
      }
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

    testEngine.setErrorCallback(async error => {
      this.sendToUser(userId, 'test-error', {
        testId,
        error: error.message,
      });

      try {
        const execution = await testRepository.findById(testId, userId);
        const currentStatus = execution?.status;
        if (currentStatus === 'cancelled' || currentStatus === 'stopped') {
          Logger.warn(`测试已取消/停止，忽略失败状态写入: ${testId}`);
          this.cleanupUserTest(userId, testId);
          return;
        }
      } catch (lookupError) {
        Logger.warn(`检查测试状态失败，继续记录失败: ${testId}`, lookupError);
      }

      try {
        await testRepository.markFailed(testId, error.message);
        await this.insertExecutionLog(testId, 'error', '测试执行失败', {
          message: error.message,
        });
      } catch (err) {
        Logger.error(`记录失败状态异常: ${testId}`, err);
      }

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

    try {
      const execution = await testRepository.findById(testId, userId);
      const status = execution?.status;
      if (status !== 'stopped' && status !== 'cancelled') {
        await testRepository.updateStatus(testId, 'stopped');
        await this.insertExecutionLog(testId, 'info', '测试已停止', {
          userId,
          source: 'registry.cancel',
        });
      }
    } catch (error) {
      Logger.warn(`停止测试时回写状态失败: ${testId}`, error);
    }

    this.stoppedTests.add(testId);
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

    this.stoppedTests.delete(testId);

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
      const execution = await testRepository.findById(testId, userId);
      if (!execution) {
        throw new Error('测试执行不存在');
      }

      if (execution.status === 'cancelled' || execution.status === 'stopped') {
        Logger.warn(`测试已取消/停止，忽略结果落库: ${testId}`);
        return;
      }

      const summary = this.extractSummary(results);
      const score = this.extractScore(results, summary);
      const grade = this.calculateGrade(score);
      const passed = score >= 70;
      const warnings = this.extractArray(results, 'warnings');
      const errors = this.extractArray(results, 'errors');

      const resultId = await testRepository.saveResult(
        execution.id,
        summary,
        score,
        grade,
        passed,
        warnings,
        errors
      );

      const metrics = this.buildMetricsFromResults(results, resultId);
      await testRepository.saveMetrics(metrics);

      const executionTime = this.calculateExecutionTimeSeconds(
        execution.started_at,
        execution.created_at
      );

      const status = (results as { status?: string }).status;
      if (status && status !== TestStatus.COMPLETED) {
        await testRepository.markFailed(testId, errors[0] ? String(errors[0]) : '测试失败');
      } else {
        await testRepository.markCompleted(testId, executionTime);
      }

      await this.insertExecutionLog(testId, 'info', '测试完成', {
        score,
        grade,
        metricCount: metrics.length,
      });

      Logger.info(`测试结果保存成功: ${testId}`);
    } catch (error) {
      Logger.error(`保存测试结果失败: ${testId}`, error);
      throw error;
    }
  }

  private extractSummary(results: Record<string, unknown>): Record<string, unknown> {
    const nested = results as {
      results?: Record<string, unknown>;
      summary?: Record<string, unknown>;
      details?: Record<string, unknown>;
    };

    if (nested.details && this.isRecord(nested.details)) {
      const detailSummary = (nested.details as { summary?: Record<string, unknown> }).summary;
      if (detailSummary && this.isRecord(detailSummary)) {
        return detailSummary;
      }
      return nested.details;
    }

    if (nested.results?.summary && this.isRecord(nested.results.summary)) {
      return nested.results.summary;
    }

    if (nested.summary && this.isRecord(nested.summary)) {
      return nested.summary;
    }

    if (nested.results && this.isRecord(nested.results)) {
      return nested.results;
    }

    return { raw: results } as Record<string, unknown>;
  }

  private extractScore(results: Record<string, unknown>, summary: Record<string, unknown>): number {
    const directScore =
      (results as { score?: number }).score ??
      (results as { overallScore?: number }).overallScore ??
      (results as { details?: { score?: number; overallScore?: number } }).details?.score ??
      (results as { details?: { score?: number; overallScore?: number } }).details?.overallScore ??
      (summary as { score?: number }).score ??
      (summary as { overallScore?: number }).overallScore;

    if (typeof directScore === 'number' && Number.isFinite(directScore)) {
      return Math.round(directScore);
    }

    return this.calculateOverallScore(results);
  }

  private extractArray(results: Record<string, unknown>, field: 'warnings' | 'errors'): unknown[] {
    const fromRoot = (results as Record<string, unknown>)[field];
    const fromDetails = (results as { details?: Record<string, unknown> }).details?.[field];
    const nested = results as { results?: Record<string, unknown> };
    const fromNested = nested.results?.[field];

    if (Array.isArray(fromRoot)) return fromRoot;
    if (Array.isArray(fromDetails)) return fromDetails;
    if (Array.isArray(fromNested)) return fromNested;
    return [];
  }

  private calculateGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateExecutionTimeSeconds(startedAt?: Date, createdAt?: Date): number {
    const startTime = startedAt ? new Date(startedAt) : createdAt ? new Date(createdAt) : null;
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
  }

  private buildMetricsFromResults(results: Record<string, unknown>, resultId: number) {
    const metricsSource =
      (results as { metrics?: Record<string, unknown> }).metrics ||
      (results as { details?: { metrics?: Record<string, unknown> } }).details?.metrics ||
      (results as { results?: { metrics?: Record<string, unknown> } }).results?.metrics ||
      (results as { results?: { summary?: { metrics?: Record<string, unknown> } } }).results
        ?.summary?.metrics ||
      {};

    if (!metricsSource || typeof metricsSource !== 'object') {
      return [];
    }

    return Object.entries(metricsSource).map(([metricName, metricValue]) => ({
      resultId,
      metricName,
      metricValue: metricValue as Record<string, unknown> | number | string,
      metricType: 'summary',
    }));
  }

  private async insertExecutionLog(
    testId: string,
    level: string,
    message: string,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    await query(
      `INSERT INTO test_logs (execution_id, level, message, context)
       SELECT id, $1, $2, $3 FROM test_executions WHERE test_id = $4`,
      [level, message, JSON.stringify(context), testId]
    );
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
