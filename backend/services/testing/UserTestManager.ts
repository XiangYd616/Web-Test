import Joi from 'joi';
import type { TestProgress } from '../../../shared/types/testEngine.types';
import { TestEngineType, TestStatus } from '../../../shared/types/testEngine.types';
import {
  insertExecutionLog,
  markCompletedWithLog,
  markFailedWithLog,
  updateStatusWithLog,
} from './testLogService';

const testRepository = require('../../repositories/testRepository');
const registry = require('../../core/TestEngineRegistry');

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
  private progressLogState: Map<
    string,
    { lastLoggedAt: number; lastProgress?: number; lastMessage?: string }
  > = new Map();

  constructor() {
    Logger.info('用户测试管理器初始化完成');
  }

  private normalizeResultsPayload(results: Record<string, unknown>): Record<string, unknown> {
    if (!this.isRecord(results)) {
      Logger.warn('测试结果结构异常，已转换为对象', { results });
      return { raw: results } as Record<string, unknown>;
    }

    const warnings = (results as { warnings?: unknown }).warnings;
    const errors = (results as { errors?: unknown }).errors;

    if (warnings !== undefined && !Array.isArray(warnings)) {
      Logger.warn('测试结果 warnings 非数组，已忽略', { warnings });
    }

    if (errors !== undefined && !Array.isArray(errors)) {
      Logger.warn('测试结果 errors 非数组，已忽略', { errors });
    }

    return results;
  }

  private validateResultSchema(results: Record<string, unknown>): void {
    const schema = Joi.object({
      summary: Joi.object().unknown(true),
      warnings: Joi.array().items(Joi.any()).optional(),
      errors: Joi.array().items(Joi.any()).optional(),
      metrics: Joi.alternatives()
        .try(Joi.object().unknown(true), Joi.array().items(Joi.any()))
        .optional(),
      status: Joi.string().optional(),
      score: Joi.number().optional(),
    }).unknown(true);

    const { error } = schema.validate(results, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      Logger.warn('测试结果结构校验失败', { details: error.details.map(item => item.message) });
      void insertExecutionLog(
        (results as { testId?: string }).testId || '',
        'warn',
        '测试结果结构校验失败',
        {
          details: error.details.map(item => item.message),
        }
      );
    }
  }

  private normalizeStatus(value: unknown, fallback: TestStatus = TestStatus.COMPLETED): TestStatus {
    if (!value) {
      return fallback;
    }
    const raw = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
    if (raw === 'completed' || raw === 'success' || raw === 'passed') return TestStatus.COMPLETED;
    if (raw === 'failed' || raw === 'error' || raw === 'timeout') return TestStatus.FAILED;
    if (raw === 'cancelled' || raw === 'canceled' || raw === 'stopped') return TestStatus.CANCELLED;
    if (raw === 'running') return TestStatus.RUNNING;
    if (raw === 'pending' || raw === 'queued' || raw === 'preparing') return TestStatus.PREPARING;
    if (raw === 'idle') return TestStatus.IDLE;
    return fallback;
  }

  private shouldLogProgress(testId: string, progress?: number, message?: string): boolean {
    const now = Date.now();
    const state = this.progressLogState.get(testId);
    const intervalMs = 10000;
    const minProgressDelta = 5;

    if (!state) {
      this.progressLogState.set(testId, {
        lastLoggedAt: now,
        lastProgress: progress,
        lastMessage: message,
      });
      return true;
    }

    const progressChanged =
      typeof progress === 'number' &&
      (typeof state.lastProgress !== 'number' ||
        Math.abs(progress - state.lastProgress) >= minProgressDelta);
    const messageChanged = message && message !== state.lastMessage;
    const intervalReached = now - state.lastLoggedAt >= intervalMs;

    if (progressChanged || messageChanged || intervalReached) {
      this.progressLogState.set(testId, {
        lastLoggedAt: now,
        lastProgress: progress,
        lastMessage: message,
      });
      return true;
    }

    return false;
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

  private parseJsonValue<T>(value: unknown, fallback: T): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    if (value !== null && value !== undefined) {
      return value as T;
    }
    return fallback;
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
              status: this.normalizeStatus(progress.status, TestStatus.RUNNING),
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
      const normalizedStatus = this.normalizeStatus(
        (progress as { status?: unknown }).status,
        TestStatus.RUNNING
      );
      this.sendToUser(userId, 'test-progress', {
        testId,
        ...progress,
        status: normalizedStatus,
      });

      const progressValue = (progress as { progress?: number }).progress;
      if (typeof progressValue === 'number') {
        Promise.resolve(testRepository.updateProgress(testId, progressValue)).catch(error => {
          Logger.warn(`更新测试进度失败: ${testId}`, error);
        });
      }

      const message = (progress as { message?: string }).message;
      if (message && this.shouldLogProgress(testId, progressValue, message)) {
        Promise.resolve(
          insertExecutionLog(testId, 'info', '测试进度更新', {
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

      const isTimeout =
        error.name === 'TestTimeoutError' ||
        error.message.includes('超时') ||
        error.message.toLowerCase().includes('timeout');
      const failureMessage = isTimeout ? '测试执行超时' : '测试执行失败';

      let execution: { status?: string; test_config?: Record<string, unknown> | null } | null =
        null;
      try {
        execution = await testRepository.findById(testId, userId);
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
        await markFailedWithLog(
          testId,
          error.message,
          {
            message: error.message,
            timeout: isTimeout,
            errorName: error.name,
            stack: error.stack,
            details: (error as { details?: unknown }).details,
          },
          failureMessage
        );
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
        await updateStatusWithLog(testId, 'stopped', '测试已停止', {
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

      if (
        execution.status === 'cancelled' ||
        execution.status === 'stopped' ||
        execution.status === 'failed' ||
        execution.status === 'completed'
      ) {
        Logger.warn(`测试已取消/停止，忽略结果落库: ${testId}`);
        return;
      }

      const existingResult = await testRepository.findResults(testId, userId);
      if (existingResult) {
        Logger.warn(`测试结果已存在，跳过重复落库: ${testId}`);
        return;
      }

      const normalizedResults = this.normalizeResultsPayload(results);
      this.validateResultSchema(normalizedResults);
      const summary = this.extractSummary(normalizedResults);
      const score = this.extractScore(results, summary);
      const grade = this.calculateGrade(score);
      const passed = score >= 70;
      const warnings = this.extractArray(normalizedResults, 'warnings');
      const errors = this.extractArray(normalizedResults, 'errors');
      const resultStatus = this.normalizeStatus(
        (normalizedResults as { status?: unknown }).status,
        TestStatus.COMPLETED
      );
      const normalizedSummary = this.normalizeSummary(summary, {
        score,
        grade,
        passed,
        status: resultStatus,
        warningCount: warnings.length,
        errorCount: errors.length,
      });

      const resultId = await testRepository.saveResult(
        execution.id,
        normalizedSummary,
        score,
        grade,
        passed,
        warnings,
        errors
      );

      const metrics = this.buildMetricsFromResults(normalizedResults, resultId, normalizedSummary);
      await testRepository.saveMetrics(metrics);

      const executionTime = this.calculateExecutionTimeSeconds(
        execution.started_at,
        execution.created_at
      );

      const status = (results as { status?: unknown }).status;
      const normalizedStatus = this.normalizeStatus(status, TestStatus.COMPLETED);
      const failureMessage = errors[0] ? String(errors[0]) : '测试失败';
      const isFailed = normalizedStatus !== TestStatus.COMPLETED;

      if (isFailed) {
        await markFailedWithLog(
          testId,
          failureMessage,
          {
            score,
            grade,
            metricCount: metrics.length,
            errorCount: errors.length,
            failureMessage,
          },
          '测试失败'
        );
      } else {
        await markCompletedWithLog(testId, executionTime, {
          score,
          grade,
          metricCount: metrics.length,
          errorCount: errors.length,
        });
      }

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
    const fromDetailSummary = (results as { details?: { summary?: Record<string, unknown> } })
      .details?.summary?.[field];
    const nested = results as { results?: Record<string, unknown> };
    const fromNested = nested.results?.[field];
    const fromSummary = (results as { summary?: Record<string, unknown> }).summary?.[field];

    if (Array.isArray(fromRoot)) return fromRoot;
    if (Array.isArray(fromDetails)) return fromDetails;
    if (Array.isArray(fromDetailSummary)) return fromDetailSummary;
    if (Array.isArray(fromNested)) return fromNested;
    if (Array.isArray(fromSummary)) return fromSummary;
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

  private buildMetricsFromResults(
    results: Record<string, unknown>,
    resultId: number,
    summary: Record<string, unknown>
  ) {
    const metricsSource = this.extractMetricsSource(results, summary);

    if (!this.isRecord(metricsSource)) {
      return [];
    }

    const recordMetrics = this.isRecord(metricsSource)
      ? Object.entries(metricsSource).map(([metricName, metricValue]) => ({
          metricName,
          metricValue,
        }))
      : [];
    const listMetrics = this.extractMetricsList(results).map(item => ({
      metricName: item.name,
      metricValue: item.value,
    }));
    const combinedMetrics = [...recordMetrics, ...listMetrics];

    return combinedMetrics
      .filter(item => item.metricValue !== undefined)
      .map(({ metricName, metricValue }) => {
        const detail = this.parseMetricDetail(metricValue);
        return {
          resultId,
          metricName,
          metricValue: detail.value,
          metricUnit: detail.unit,
          metricType: detail.type,
          passed: detail.passed,
          severity: detail.severity,
          recommendation: detail.recommendation,
        };
      });
  }

  private extractMetricsSource(
    results: Record<string, unknown>,
    summary: Record<string, unknown>
  ): Record<string, unknown> {
    const metricsSource =
      (results as { metrics?: Record<string, unknown> }).metrics ||
      (results as { details?: { metrics?: Record<string, unknown> } }).details?.metrics ||
      (results as { results?: { metrics?: Record<string, unknown> } }).results?.metrics ||
      (results as { results?: { summary?: { metrics?: Record<string, unknown> } } }).results
        ?.summary?.metrics ||
      {};

    if (this.isRecord(metricsSource) && Object.keys(metricsSource).length > 0) {
      return metricsSource;
    }

    return summary;
  }

  private extractMetricsList(
    results: Record<string, unknown>
  ): Array<{ name: string; value: unknown }> {
    const candidates = [
      (results as { metrics?: unknown }).metrics,
      (results as { details?: { metrics?: unknown } }).details?.metrics,
      (results as { results?: { metrics?: unknown } }).results?.metrics,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .filter(item => this.isRecord(item))
          .map(item => {
            const record = item as Record<string, unknown>;
            const name =
              (record.name as string) ||
              (record.metricName as string) ||
              (record.key as string) ||
              'metric';
            const value = record.value ?? record.metricValue ?? record.metric ?? record.data;
            return { name, value };
          });
      }
    }

    return [];
  }

  private normalizeMetricValue(value: unknown): Record<string, unknown> | number | string {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return { values: value };
    }
    if (this.isRecord(value)) {
      return value;
    }
    return String(value ?? '');
  }

  private parseMetricDetail(value: unknown): {
    value: Record<string, unknown> | number | string;
    unit?: string;
    type?: string;
    passed?: boolean;
    severity?: string;
    recommendation?: string;
  } {
    if (this.isRecord(value)) {
      const record = value as Record<string, unknown>;
      const rawValue = record.value ?? record.metricValue ?? record.metric ?? record.data ?? record;
      return {
        value: this.normalizeMetricValue(rawValue),
        unit:
          typeof record.unit === 'string'
            ? record.unit
            : typeof record.metricUnit === 'string'
              ? record.metricUnit
              : undefined,
        type:
          typeof record.type === 'string'
            ? record.type
            : typeof record.metricType === 'string'
              ? record.metricType
              : 'summary',
        passed: typeof record.passed === 'boolean' ? record.passed : undefined,
        severity: typeof record.severity === 'string' ? record.severity : undefined,
        recommendation:
          typeof record.recommendation === 'string' ? record.recommendation : undefined,
      };
    }

    return {
      value: this.normalizeMetricValue(value),
      type: 'summary',
    };
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

  private normalizeSummary(
    summary: Record<string, unknown>,
    extras: {
      score: number;
      grade: string;
      passed: boolean;
      status: string;
      warningCount: number;
      errorCount: number;
    }
  ): Record<string, unknown> {
    return {
      ...summary,
      score: extras.score,
      grade: extras.grade,
      passed: extras.passed,
      status: extras.status,
      warningCount: extras.warningCount,
      errorCount: extras.errorCount,
    };
  }
}

const userTestManager = new UserTestManager();

module.exports = userTestManager;

export {};
