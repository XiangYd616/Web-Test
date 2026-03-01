import Joi from 'joi';
import type { TestProgress } from '../../../../shared/types/testEngine.types';
import { TestEngineType, TestStatus } from '../../../../shared/types/testEngine.types';
import { query } from '../../config/database';
import registry from '../../core/TestEngineRegistry';
import apiTestResultRepository from '../repositories/apiTestResultRepository';
import performanceTestResultRepository from '../repositories/performanceTestResultRepository';
import securityTestResultRepository from '../repositories/securityTestResultRepository';
import seoTestResultRepository from '../repositories/seoTestResultRepository';
import stressTestResultRepository from '../repositories/stressTestResultRepository';
import testOperationsRepository from '../repositories/testOperationsRepository';
import testRepository from '../repositories/testRepository';
import testResultRepository from '../repositories/testResultRepository';
import {
  insertExecutionLog,
  markCompletedWithLog,
  markFailedWithLog,
  updateStatusWithLog,
} from './testLogService';

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
  /** WS 不可用时的事件缓冲队列，连接建立后重放 */
  private eventBuffer: Map<string, { event: string; data: Record<string, unknown> }[]> = new Map();
  private static readonly EVENT_BUFFER_MAX = 50;
  /** 内存中的实时进度缓存，由 progressCallback 实时更新 */
  private progressCache: Map<
    string,
    { progress: number; currentStep?: string; status?: string; updatedAt: number }
  > = new Map();

  constructor() {
    Logger.info('用户测试管理器初始化完成');
  }

  private async saveApiTestResult(
    resultId: number,
    execution: { test_config?: Record<string, unknown> | null },
    results: Record<string, unknown>
  ) {
    try {
      const details =
        (results as { details?: Record<string, unknown> }).details ||
        (results as { results?: { details?: Record<string, unknown> } }).results?.details ||
        {};
      const apiDetails = this.isRecord(details) ? details : {};
      const apiResults =
        (apiDetails as { results?: unknown }).results ??
        (results as { results?: unknown }).results ??
        {};
      const summary = this.isRecord((apiDetails as { summary?: unknown }).summary)
        ? ((apiDetails as { summary?: Record<string, unknown> }).summary as Record<string, unknown>)
        : this.isRecord((results as { summary?: unknown }).summary)
          ? ((results as { summary?: Record<string, unknown> }).summary as Record<string, unknown>)
          : {};

      let config: Record<string, unknown> = {};
      const rawConfig = execution.test_config;
      if (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) {
        config = rawConfig as Record<string, unknown>;
      } else if (typeof rawConfig === 'string') {
        try {
          const parsed = JSON.parse(rawConfig) as Record<string, unknown>;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            config = parsed;
          }
        } catch {
          config = {};
        }
      }

      await apiTestResultRepository.upsert({
        testResultId: resultId,
        results: apiResults,
        summary,
        config,
      });
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('api_test_results 表不存在，跳过API结果落库');
        return;
      }
      Logger.warn('写入 api_test_results 失败', error);
    }
  }

  private async savePerformanceTestResult(resultId: number, results: Record<string, unknown>) {
    try {
      const performanceDetails =
        (results as { details?: { results?: { details?: Record<string, unknown> } } }).details
          ?.results?.details ||
        (results as { results?: { details?: Record<string, unknown> } }).results?.details ||
        (results as { details?: Record<string, unknown> }).details ||
        {};

      const webVitals = this.isRecord((performanceDetails as Record<string, unknown>).webVitals)
        ? ((performanceDetails as Record<string, unknown>).webVitals as Record<string, unknown>)
        : {};
      const metrics = this.isRecord((performanceDetails as Record<string, unknown>).metrics)
        ? ((performanceDetails as Record<string, unknown>).metrics as Record<string, unknown>)
        : {};
      const resources = this.isRecord((performanceDetails as Record<string, unknown>).resources)
        ? ((performanceDetails as Record<string, unknown>).resources as Record<string, unknown>)
        : {};
      const recommendations = Array.isArray(
        (performanceDetails as Record<string, unknown>).recommendations
      )
        ? ((performanceDetails as Record<string, unknown>).recommendations as unknown[])
        : [];
      const httpInfo = this.isRecord((performanceDetails as Record<string, unknown>).httpInfo)
        ? ((performanceDetails as Record<string, unknown>).httpInfo as Record<string, unknown>)
        : {};

      await performanceTestResultRepository.upsert({
        testResultId: resultId,
        webVitals,
        metrics,
        recommendations,
        resources,
        httpInfo,
      });
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('performance_test_results 表不存在，跳过性能结果落库');
        return;
      }
      Logger.warn('写入 performance_test_results 失败', error);
    }
  }

  private async saveSeoTestResult(resultId: number, results: Record<string, unknown>) {
    try {
      // normalizedResults 结构: { details: { results: { metrics: checks, details: { checks } } } }
      // 也兼容直接结构: { results: { metrics: checks } }
      const detailsObj = this.isRecord(results.details)
        ? (results.details as Record<string, unknown>)
        : null;
      const innerResults =
        detailsObj && this.isRecord(detailsObj.results)
          ? (detailsObj.results as Record<string, unknown>)
          : null;

      const checks =
        // 路径1: results.details.results.metrics (标准路径)
        (innerResults && this.isRecord(innerResults.metrics) ? innerResults.metrics : null) ||
        // 路径2: results.details.results.details.checks
        (innerResults && this.isRecord(innerResults.details)
          ? ((innerResults.details as Record<string, unknown>).checks as Record<string, unknown>)
          : null) ||
        // 路径3: results.results.metrics (直接结构)
        (this.isRecord((results as { results?: { metrics?: unknown } }).results?.metrics)
          ? (results as { results: { metrics: Record<string, unknown> } }).results.metrics
          : null) ||
        // 路径4: results.details.checks (兜底)
        (detailsObj && this.isRecord(detailsObj.checks) ? detailsObj.checks : null) ||
        {};
      const summary =
        (results as { summary?: Record<string, unknown> }).summary ||
        (results as { results?: { summary?: Record<string, unknown> } }).results?.summary ||
        (results as { results?: { details?: { summary?: Record<string, unknown> } } }).results
          ?.details?.summary ||
        {};

      const checksRecord = checks as Record<string, unknown>;
      const extractCheck = (key: string) =>
        this.isRecord(checksRecord[key]) ? (checksRecord[key] as Record<string, unknown>) : {};

      const meta = extractCheck('meta');
      const headings = extractCheck('headings');
      const images = extractCheck('images');
      const links = extractCheck('links');
      const structuredData = extractCheck('structuredData');
      const mobile = extractCheck('mobile');

      const metaTags = this.extractSeoCheckDetails(meta);
      const headingData = this.extractSeoCheckDetails(headings);
      const imageData = this.extractSeoCheckDetails(images);
      const linkData = this.extractSeoCheckDetails(links);
      const structuredDataDetails = this.extractSeoCheckDetails(structuredData);
      const mobileDetails = this.extractSeoCheckDetails(mobile);
      const mobileFriendly = Boolean(
        (mobileDetails as Record<string, unknown>).responsive ??
          (mobileDetails as Record<string, unknown>).touchOptimization ??
          (mobileDetails as Record<string, unknown>).viewport
      );
      const pageSpeedScore = Number(
        (mobileDetails as Record<string, unknown>).mobileSpeed ?? summary.score ?? 0
      );

      // 将完整的 checks 对象存入 checksData，前端可直接读取所有检测维度
      await seoTestResultRepository.upsert({
        testResultId: resultId,
        metaTags,
        headings: headingData,
        images: imageData,
        links: linkData,
        structuredData: structuredDataDetails,
        mobileFriendly,
        pageSpeedScore,
        checksData: checksRecord,
      });
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('seo_test_results 表不存在，跳过SEO结果落库');
        return;
      }
      Logger.warn('写入 seo_test_results 失败', error);
    }
  }

  private async saveSecurityTestResult(resultId: number, results: Record<string, unknown>) {
    try {
      // ── 深度搜索 checks 对象 ──
      // baseResult 结构: { details: { ...finalResult } }
      // finalResult 结构: { results: normalizedResult }
      // normalizedResult 结构: { details: performSecurityScanResult }
      // performSecurityScanResult 结构: { results: { checks, recommendations, score, rating, ... } }
      const securityChecks = this.findSecurityChecks(results);
      const scanResults = this.findScanResults(results);

      const vulnerabilities = this.isRecord(securityChecks.vulnerabilities)
        ? (securityChecks.vulnerabilities as Record<string, unknown>)
        : {};
      const securityHeaders = this.isRecord(securityChecks.headers)
        ? (securityChecks.headers as Record<string, unknown>)
        : {};
      const sslInfo = this.isRecord(securityChecks.ssl)
        ? (securityChecks.ssl as Record<string, unknown>)
        : {};
      const recommendations = this.isRecord(scanResults.recommendations)
        ? (scanResults.recommendations as Record<string, unknown>)
        : {};
      const contentSecurityPolicy = this.extractSecurityCsp(securityHeaders);
      const riskLevel = this.normalizeSecurityRiskLevel(
        (scanResults as { rating?: string }).rating ||
          (results as { summary?: { rating?: string } }).summary?.rating ||
          'low'
      );

      // 提取扩展检测维度（核心维度之外的所有 checks）
      const extendedChecks: Record<string, unknown> = {};
      const extKeys = [
        'informationDisclosure',
        'accessControl',
        'portScan',
        'csrf',
        'cookies',
        'cors',
        'contentSecurity',
      ];
      for (const key of extKeys) {
        if (this.isRecord(securityChecks[key])) {
          extendedChecks[key] = securityChecks[key];
        }
      }
      Logger.info('安全测试扩展检测维度', {
        checksKeys: Object.keys(securityChecks).join(','),
        extKeys: Object.keys(extendedChecks).join(','),
      });

      await securityTestResultRepository.upsert({
        testResultId: resultId,
        vulnerabilities,
        securityHeaders,
        sslInfo,
        contentSecurityPolicy,
        recommendations,
        riskLevel,
        extendedChecks,
      });
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('security_test_results 表不存在，跳过安全结果落库');
        return;
      }
      Logger.warn('写入 security_test_results 失败', error);
    }
  }

  private extractSeoCheckDetails(check: Record<string, unknown>) {
    if (this.isRecord(check.details)) {
      return check.details as Record<string, unknown>;
    }
    return check;
  }

  private extractSecurityCsp(headers: Record<string, unknown>) {
    if (this.isRecord(headers.headers)) {
      return headers.headers as Record<string, unknown>;
    }
    return headers;
  }

  private normalizeSecurityRiskLevel(value: string): 'low' | 'medium' | 'high' | 'critical' {
    const raw = value.toLowerCase();
    if (raw.includes('critical')) return 'critical';
    if (raw.includes('high')) return 'high';
    if (raw.includes('medium')) return 'medium';
    return 'low';
  }

  private async saveStressTestResult(
    execution: {
      test_id: string;
      user_id: string;
      test_name: string;
      test_url?: string | null;
      test_config?: Record<string, unknown> | null;
      started_at?: Date;
      created_at?: Date;
    },
    results: Record<string, unknown>,
    status: TestStatus
  ) {
    try {
      const config = (execution.test_config || {}) as Record<string, unknown>;
      const summary =
        (results as { summary?: Record<string, unknown> }).summary ||
        (results as { results?: { summary?: Record<string, unknown> } }).results?.summary ||
        (results as { results?: Record<string, unknown> }).results ||
        {};
      const detailResults =
        (results as { results?: { details?: { results?: Record<string, unknown> } } }).results
          ?.details?.results ||
        (results as { details?: { results?: Record<string, unknown> } }).details?.results ||
        {};
      const totalRequests = Number(summary.totalRequests ?? detailResults.totalRequests ?? 0);
      const failedRequests = Number(summary.failedRequests ?? detailResults.failedRequests ?? 0);
      const successfulRequests = Number(
        detailResults.successfulRequests ?? Math.max(0, totalRequests - failedRequests)
      );
      const successRate =
        typeof summary.successRate === 'number'
          ? summary.successRate
          : totalRequests > 0
            ? Math.round(((totalRequests - failedRequests) / totalRequests) * 100)
            : null;
      const avgResponseTime = Number(
        summary.averageResponseTime ?? detailResults.averageResponseTime ?? 0
      );
      const minResponseTime = Number(detailResults.minResponseTime ?? 0);
      const maxResponseTime = Number(detailResults.maxResponseTime ?? 0);
      const performance = this.isRecord(detailResults.performance)
        ? (detailResults.performance as Record<string, unknown>)
        : undefined;
      const throughput = Number(performance?.throughput ?? summary.requestsPerSecond ?? 0);
      const startTime = execution.started_at || execution.created_at || new Date();
      const endTime = new Date();
      const duration = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
      const normalizedStatus = this.normalizeStressStatus(status);
      const errorMessage =
        (results as { error?: string }).error ||
        ((results as { errors?: unknown[] }).errors?.[0]
          ? String((results as { errors?: unknown[] }).errors?.[0])
          : null);
      const tags = Array.isArray(config.tags) ? (config.tags as string[]) : [];
      const environment = typeof config.environment === 'string' ? config.environment : null;

      await stressTestResultRepository.upsert({
        testId: execution.test_id,
        userId: execution.user_id,
        testName: execution.test_name,
        url: (results as { url?: string }).url || execution.test_url || '',
        config,
        status: normalizedStatus,
        results,
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
        throughput,
        startTime,
        endTime,
        duration,
        errorMessage,
        tags,
        environment,
        metadata: (results as { metadata?: Record<string, unknown> }).metadata || {},
      });
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('stress_test_results 表不存在，跳过压力测试落库');
        return;
      }
      Logger.error('写入 stress_test_results 失败', {
        code: dbError.code,
        message: dbError.message,
        testId: execution.test_id,
        stack: (error as Error).stack?.split('\n').slice(0, 3).join(' | '),
      });
    }
  }

  private normalizeStressStatus(status: TestStatus) {
    switch (status) {
      case TestStatus.COMPLETED:
        return 'completed';
      case TestStatus.FAILED:
        return 'failed';
      case TestStatus.CANCELLED:
        return 'stopped';
      case TestStatus.RUNNING:
        return 'running';
      case TestStatus.PREPARING:
        return 'pending';
      default:
        return 'completed';
    }
  }

  private normalizeResultsPayload(results: Record<string, unknown>): Record<string, unknown> {
    if (!this.isRecord(results)) {
      Logger.warn('测试结果结构异常，已转换为对象', { results });
      return { raw: results } as Record<string, unknown>;
    }

    const summary = (results as { summary?: unknown }).summary;
    if (summary !== undefined && !this.isRecord(summary)) {
      Logger.warn('测试结果 summary 非对象，已归一化', { summary });
      (results as { summary?: Record<string, unknown> }).summary = { raw: summary };
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
      summary: Joi.object().unknown(true).optional().allow(null),
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
    const intervalMs = 2000;
    const minProgressDelta = 1;

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

  /**
   * 深度搜索安全测试结果中的 checks 对象
   * baseResult 路径: details.results.details.results.checks
   * 兼容多种嵌套层级
   */
  private findSecurityChecks(results: Record<string, unknown>): Record<string, unknown> {
    const candidates: unknown[] = [
      // baseResult.details.results.details.results.checks
      (results as { details?: { results?: { details?: { results?: { checks?: unknown } } } } })
        .details?.results?.details?.results?.checks,
      // baseResult.details.results.details.checks (如果 performSecurityScan 直接返回 checks)
      (results as { details?: { results?: { details?: { checks?: unknown } } } }).details?.results
        ?.details?.checks,
      // results.results.details.results.checks (旧路径)
      (results as { results?: { details?: { results?: { checks?: unknown } } } }).results?.details
        ?.results?.checks,
      // results.details.results.checks
      (results as { details?: { results?: { checks?: unknown } } }).details?.results?.checks,
      // results.results.checks
      (results as { results?: { checks?: unknown } }).results?.checks,
      // results.checks
      (results as { checks?: unknown }).checks,
    ];
    for (const c of candidates) {
      if (this.isRecord(c) && Object.keys(c).length > 0) {
        return c;
      }
    }
    return {};
  }

  /**
   * 深度搜索安全测试结果中的 scanResults（包含 recommendations, rating 等）
   */
  private findScanResults(results: Record<string, unknown>): Record<string, unknown> {
    const candidates: unknown[] = [
      // baseResult.details.results.details.results
      (results as { details?: { results?: { details?: { results?: unknown } } } }).details?.results
        ?.details?.results,
      // results.results.details.results
      (results as { results?: { details?: { results?: unknown } } }).results?.details?.results,
      // results.details.results
      (results as { details?: { results?: unknown } }).details?.results,
      // results.results
      (results as { results?: unknown }).results,
    ];
    for (const c of candidates) {
      if (this.isRecord(c) && ('checks' in c || 'recommendations' in c || 'rating' in c)) {
        return c;
      }
    }
    return {};
  }

  registerUserSocket(userId: string, socket: SocketLike) {
    this.userSockets.set(userId, socket);
    Logger.info(`用户WebSocket连接已注册: ${userId}`);

    // 重放缓冲的事件
    const buffered = this.eventBuffer.get(userId);
    if (buffered && buffered.length > 0) {
      Logger.info(`重放缓冲事件: ${userId}, 共 ${buffered.length} 条`);
      for (const { event, data } of buffered) {
        socket.emit(event, data);
      }
      this.eventBuffer.delete(userId);
    }
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
              ...(progress.extra ? progress.extra : {}),
            });
          });
          if (completionCallback) {
            completionCallback(result as unknown as Record<string, unknown>);
          }
          return result as unknown as Record<string, unknown>;
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
      const stepValue =
        (progress as { currentStep?: string }).currentStep ||
        (progress as { message?: string }).message;
      this.progressCache.set(testId, {
        progress: typeof progressValue === 'number' ? progressValue : 0,
        currentStep: stepValue || undefined,
        status: String(normalizedStatus),
        updatedAt: Date.now(),
      });
      if (typeof progressValue === 'number') {
        Promise.resolve(testOperationsRepository.updateProgress(testId, progressValue)).catch(
          error => {
            Logger.warn(`更新测试进度失败: ${testId}`, error);
          }
        );
      }

      const message = (progress as { message?: string }).message;
      const currentStep = (progress as { currentStep?: string }).currentStep;
      const logMessage = currentStep || message || '测试进度更新';
      if ((message || currentStep) && this.shouldLogProgress(testId, progressValue, logMessage)) {
        Promise.resolve(
          insertExecutionLog(testId, 'info', logMessage, {
            progress: progressValue,
          })
        ).catch(error => Logger.warn(`记录测试进度日志失败: ${testId}`, error));
      }
    });

    testEngine.setCompletionCallback(async results => {
      // 先落库，再通知前端，避免前端拉取时数据库尚未写入
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

      // 安全发送：results 可能含循环引用（如 SEO 引擎），先序列化再解析以打断引用
      let safeResults: Record<string, unknown>;
      try {
        safeResults = JSON.parse(JSON.stringify(results)) as Record<string, unknown>;
      } catch {
        // 序列化失败（循环引用），只发送基本信息
        safeResults = {
          testId,
          status: (results as { status?: unknown }).status ?? 'completed',
          score: (results as { score?: unknown }).score ?? 0,
          success: (results as { success?: unknown }).success ?? true,
        };
        Logger.warn(`test-completed 结果含循环引用，已降级发送: ${testId}`);
      }
      this.sendToUser(userId, 'test-completed', {
        testId,
        results: safeResults,
      });

      this.cleanupUserTest(userId, testId);
    });

    testEngine.setErrorCallback(async error => {
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

      // 先落库，再通知前端
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
    // 不立即调用 cleanupUserTest —— run() 仍在异步执行中，
    // completionCallback / errorCallback 会在 run() 返回后触发 cleanup。
    // 这里只做 engine map 清理，stoppedTests 延迟删除以确保后续回调被拦截。
    this.removeTestFromMap(userId, testId);

    // 安全兜底：30 秒后强制清理 stoppedTests 标记，防止永久泄漏
    setTimeout(() => {
      this.stoppedTests.delete(testId);
    }, 30000);

    Logger.info(`用户测试已停止: ${userId}/${testId}`);
  }

  private removeTestFromMap(userId: string, testId: string) {
    const userTests = this.userTests.get(userId);
    if (userTests) {
      userTests.delete(testId);
      if (userTests.size === 0) {
        this.userTests.delete(userId);
      }
    }
  }

  cleanupUserTest(userId: string, testId: string) {
    this.removeTestFromMap(userId, testId);
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
      // WS 不可用时缓冲事件，等连接建立后重放
      if (!this.eventBuffer.has(userId)) {
        this.eventBuffer.set(userId, []);
      }
      const buffer = this.eventBuffer.get(userId)!;
      if (buffer.length < UserTestManager.EVENT_BUFFER_MAX) {
        buffer.push({ event, data });
      }
      Logger.debug(`事件已缓冲: ${userId} -> ${event} (${buffer.length}条)`);
    }
  }

  /**
   * 通过 testId 反查 userId 并推送日志事件，实现日志实时输出
   */
  sendLogToTestUser(
    testId: string,
    log: { level: string; message: string; context?: Record<string, unknown>; timestamp?: string }
  ) {
    for (const [userId, tests] of this.userTests) {
      if (tests.has(testId)) {
        this.sendToUser(userId, 'test-log', { testId, ...log });
        return;
      }
    }
  }

  /**
   * 从内存缓存获取测试实时进度（比数据库更及时）
   * 返回 null 表示缓存中无此测试
   */
  getProgress(testId: string): { progress: number; currentStep?: string; status?: string } | null {
    const cached = this.progressCache.get(testId);
    if (!cached) return null;
    // 缓存超过 60 秒视为过期
    if (Date.now() - cached.updatedAt > 60_000) {
      this.progressCache.delete(testId);
      return null;
    }
    return { progress: cached.progress, currentStep: cached.currentStep, status: cached.status };
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
    this.progressCache.clear();

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

      const existingResult = await testResultRepository.findResults(testId, userId);
      if (existingResult) {
        Logger.warn(`测试结果已存在，跳过重复落库: ${testId}`);
        return;
      }

      const normalizedResults = this.normalizeResultsPayload(results);
      this.validateResultSchema(normalizedResults);
      const summary = this.extractSummary(normalizedResults);
      const score = this.extractScore(results, summary);
      const grade = this.calculateGrade(score);
      const warnings = this.extractArray(normalizedResults, 'warnings');
      const errors = this.extractArray(normalizedResults, 'errors');
      const resultStatus = this.normalizeStatus(
        (normalizedResults as { status?: unknown }).status,
        TestStatus.COMPLETED
      );
      // 引擎返回 success: true 表示测试执行成功，应视为通过
      // 分数低只代表目标站点质量差，不代表测试本身失败
      // success 可能在顶层或 details 内部（baseResult.details 包含引擎原始结果）
      const engineDetails = (normalizedResults as { details?: Record<string, unknown> }).details;
      const engineSuccess =
        (results as { success?: unknown }).success ??
        (engineDetails as { success?: unknown } | undefined)?.success;
      const passed = engineSuccess === true || resultStatus === TestStatus.COMPLETED || score >= 70;
      // 优先从引擎结果中提取 duration（毫秒），避免时区解析问题
      const rawDuration =
        (normalizedResults as { duration?: unknown }).duration ??
        (engineDetails as { duration?: unknown } | undefined)?.duration ??
        (summary as { duration?: unknown }).duration;
      const durationMs =
        typeof rawDuration === 'number' && rawDuration > 0 ? Math.round(rawDuration) : null;
      const durationStr = durationMs
        ? durationMs >= 1000
          ? `${(durationMs / 1000).toFixed(2)}s`
          : `${durationMs}ms`
        : undefined;
      // 对 accessibility 引擎，把完整的 checks/recommendations 嵌入 summary 以便前端读取
      // baseResult.details = { ...finalResult }，所以 checks 在多种可能路径中：
      //   normalizedResults.details.results.details.checks  (baseResult 包装)
      //   normalizedResults.results.details.checks           (直接 finalResult)
      //   normalizedResults.details.checks                   (扁平)
      if (execution.engine_type === 'accessibility') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        const nrResults = this.isRecord(nr.results)
          ? (nr.results as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅
        const candidates: unknown[] = [
          nrDetails && this.isRecord(nrDetails.results)
            ? (nrDetails.results as Record<string, unknown>).details
            : null,
          nrResults ? nrResults.details : null,
          nrDetails,
        ];
        let accessibilityDetails: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).checks) {
            accessibilityDetails = c as Record<string, unknown>;
            break;
          }
        }
        if (accessibilityDetails) {
          const ad = accessibilityDetails as {
            checks?: Record<string, unknown>;
            recommendations?: unknown[];
            summary?: Record<string, unknown>;
          };
          if (ad.checks) summary.checks = ad.checks;
          if (ad.recommendations) summary.recommendations = ad.recommendations;
          if (ad.summary) {
            Object.assign(summary, ad.summary);
          }
        }
      }

      // 对 compatibility 引擎，把完整的 browsers/devices/matrix/featureSummary/recommendations 嵌入 summary
      // baseResult.details = { ...CompatibilityFinalResult }，所以 results 在：
      //   normalizedResults.details.results  (baseResult 包装)
      //   normalizedResults.results          (直接 finalResult)
      if (execution.engine_type === 'compatibility') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅
        const candidates: unknown[] = [
          nrDetails ? (nrDetails as { results?: unknown }).results : null,
          (nr as { results?: unknown }).results,
        ];
        let compatResults: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).browsers) {
            compatResults = c as Record<string, unknown>;
            break;
          }
        }
        if (compatResults) {
          const cr = compatResults as {
            summary?: Record<string, unknown>;
            browsers?: unknown[];
            devices?: unknown[];
            matrix?: unknown[];
            realBrowser?: unknown[];
            featureSummary?: Record<string, unknown>;
            recommendations?: unknown[];
            warnings?: unknown[];
          };
          // 将 CompatibilityResults.summary 中的统计字段提升到顶层 summary
          if (cr.summary && this.isRecord(cr.summary)) {
            const cs = cr.summary as {
              overallScore?: number;
              browserCount?: number;
              deviceCount?: number;
              matrixCount?: number;
              realBrowserCount?: number;
            };
            if (cs.overallScore !== undefined) summary.overallScore = cs.overallScore;
            if (cs.browserCount !== undefined) summary.browserCount = cs.browserCount;
            if (cs.deviceCount !== undefined) summary.deviceCount = cs.deviceCount;
            if (cs.matrixCount !== undefined) summary.matrixCount = cs.matrixCount;
            if (cs.realBrowserCount !== undefined) summary.realBrowserCount = cs.realBrowserCount;
          }
          if (cr.browsers) summary.browsers = cr.browsers;
          if (cr.devices) summary.devices = cr.devices;
          if (cr.matrix) summary.matrix = cr.matrix;
          if (cr.realBrowser) summary.realBrowser = cr.realBrowser;
          if (cr.featureSummary) summary.featureSummary = cr.featureSummary;
          if (cr.recommendations) summary.recommendations = cr.recommendations;
          if (cr.warnings) summary.compatWarnings = cr.warnings;
        }
      }

      // 对 website 引擎，把完整的 checks/engineMetrics/recommendations/summary 嵌入 summary
      // WebsiteFinalResult = { engine, version, success, testId, results: WebsiteResults }
      // WebsiteResults = { url, timestamp, summary, checks, engineMetrics, recommendations }
      if (execution.engine_type === 'website') {
        const nr = normalizedResults as Record<string, unknown>;
        const candidates: unknown[] = [
          (nr as { results?: unknown }).results,
          this.isRecord(nr.details) ? (nr.details as { results?: unknown }).results : null,
        ];
        let websiteResults: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).checks) {
            websiteResults = c as Record<string, unknown>;
            break;
          }
        }
        if (websiteResults) {
          const wr = websiteResults as {
            url?: string;
            summary?: Record<string, unknown>;
            checks?: Record<string, unknown>;
            engineMetrics?: Record<string, unknown>;
            recommendations?: unknown[];
          };
          if (wr.url) summary.url = wr.url;
          if (wr.summary) summary.websiteSummary = wr.summary;
          if (wr.checks) summary.checks = wr.checks;
          if (wr.engineMetrics) summary.engineMetrics = wr.engineMetrics;
          if (wr.recommendations) summary.recommendations = wr.recommendations;
        }
      }

      // 对 ux 引擎，把完整的 metrics/stats/recommendations/samples 嵌入 summary
      // UXFinalResult = { engine, version, success, testId, status, score, results: UXResult }
      // UXResult = { url, metrics, samples, sampleCount, stats, score, grade, summary, recommendations, screenshot }
      if (execution.engine_type === 'ux') {
        const nr = normalizedResults as Record<string, unknown>;
        // 候选路径：从最深到最浅
        const candidates: unknown[] = [
          (nr as { results?: unknown }).results,
          this.isRecord(nr.details) ? (nr.details as { results?: unknown }).results : null,
        ];
        let uxResults: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).metrics) {
            uxResults = c as Record<string, unknown>;
            break;
          }
        }
        if (uxResults) {
          const ur = uxResults as {
            url?: string;
            metrics?: Record<string, unknown>;
            samples?: unknown[];
            sampleCount?: number;
            stats?: Record<string, unknown>;
            recommendations?: unknown[];
            screenshot?: Record<string, unknown>;
          };
          if (ur.metrics) summary.metrics = ur.metrics;
          if (ur.stats) summary.stats = ur.stats;
          if (ur.recommendations) summary.recommendations = ur.recommendations;
          if (ur.samples) summary.samples = ur.samples;
          if (ur.sampleCount !== undefined) summary.sampleCount = ur.sampleCount;
          if (ur.screenshot) summary.screenshot = ur.screenshot;
          if (ur.url) summary.url = ur.url;
        }
      }

      // 对 performance 引擎，把 webVitals/metrics/recommendations/httpInfo 嵌入 summary
      // PerformanceFinalResult = { engine, version, success, results: PerformanceTestRecord }
      // PerformanceTestRecord.details = PerformanceResults = { webVitals, metrics, resources, httpInfo, recommendations, ... }
      if (execution.engine_type === 'performance') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅
        const candidates: unknown[] = [
          nrDetails && this.isRecord(nrDetails.results)
            ? (nrDetails.results as Record<string, unknown>).details
            : null,
          this.isRecord((nr as { results?: unknown }).results)
            ? ((nr as { results: Record<string, unknown> }).results as { details?: unknown })
                .details
            : null,
          nrDetails,
        ];
        let perfDetails: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).webVitals) {
            perfDetails = c as Record<string, unknown>;
            break;
          }
        }
        if (perfDetails) {
          const pd = perfDetails as {
            webVitals?: Record<string, unknown>;
            metrics?: Record<string, unknown>;
            recommendations?: unknown[];
            httpInfo?: Record<string, unknown>;
            contentAnalysis?: Record<string, unknown>;
            resources?: Record<string, unknown>;
          };
          if (pd.webVitals) summary.webVitals = pd.webVitals;
          if (pd.metrics) summary.performanceMetrics = pd.metrics;
          if (pd.recommendations) summary.recommendations = pd.recommendations;
          if (pd.httpInfo) summary.httpInfo = pd.httpInfo;
          if (pd.contentAnalysis) summary.contentAnalysis = pd.contentAnalysis;
          if (pd.resources) summary.resources = pd.resources;
        }
      }

      // 对 security 引擎，把 checks/score/rating/compliance/recommendations 嵌入 summary
      // SecurityFinalResult.results = SecurityNormalizedResult
      // SecurityNormalizedResult.details = SecurityScanResult = { results: { checks, score, rating, compliance, recommendations, ... } }
      if (execution.engine_type === 'security') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅搜索 scanResults（包含 checks/score/rating）
        const candidates: unknown[] = [
          // path: details.results.details.results (SecurityScanResult.results)
          nrDetails && this.isRecord((nrDetails as { results?: unknown }).results)
            ? ((nrDetails as { results: Record<string, unknown> }).results as { details?: unknown })
                .details
            : null,
          // path: details.results (SecurityNormalizedResult.details = SecurityScanResult)
          nrDetails && this.isRecord((nrDetails as { results?: unknown }).results)
            ? (nrDetails as { results: Record<string, unknown> }).results
            : null,
          nrDetails,
        ];
        // 找到包含 checks 的层
        let scanResults: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (!c || !this.isRecord(c)) continue;
          const cr = c as Record<string, unknown>;
          // SecurityScanResult.results 包含 checks
          if (
            this.isRecord(cr.results) &&
            this.isRecord((cr.results as Record<string, unknown>).checks)
          ) {
            scanResults = cr.results as Record<string, unknown>;
            break;
          }
          if (this.isRecord(cr.checks)) {
            scanResults = cr;
            break;
          }
        }
        if (scanResults) {
          const sr = scanResults as {
            checks?: Record<string, unknown>;
            score?: number;
            rating?: string;
            compliance?: Record<string, unknown>;
            recommendations?: Record<string, unknown>;
          };
          if (sr.score !== undefined) summary.securityScore = sr.score;
          if (sr.rating) summary.securityRating = sr.rating;
          if (sr.compliance) summary.compliance = sr.compliance;
          if (sr.recommendations) summary.securityRecommendations = sr.recommendations;
          if (sr.checks) summary.securityChecks = sr.checks;
        }
      }

      // 对 API 引擎，把 results/summary/recommendations 嵌入 summary
      // ApiFinalResult.results = ApiBatchResult = { summary, results, recommendations, ... }
      if (execution.engine_type === 'api') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅搜索 ApiBatchResult（包含 summary/results）
        const candidates: unknown[] = [
          nrDetails && this.isRecord((nrDetails as { results?: unknown }).results)
            ? (nrDetails as { results: Record<string, unknown> }).results
            : null,
          nrDetails,
          (nr as { results?: unknown }).results,
        ];
        let apiBatchResult: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (!c || !this.isRecord(c)) continue;
          const cr = c as Record<string, unknown>;
          if (this.isRecord(cr.summary) || Array.isArray(cr.results)) {
            apiBatchResult = cr;
            break;
          }
        }
        if (apiBatchResult) {
          if (this.isRecord(apiBatchResult.summary)) {
            summary.apiSummary = apiBatchResult.summary;
          }
          if (Array.isArray(apiBatchResult.results)) {
            summary.apiResults = apiBatchResult.results;
          }
          if (Array.isArray(apiBatchResult.recommendations)) {
            summary.apiRecommendations = apiBatchResult.recommendations;
          }
        }
      }

      // 对 SEO 引擎，把 checks/summary/detailedAnalysis 嵌入 summary
      // SeoFinalResult.results = SeoNormalizedResult
      // SeoNormalizedResult.details = SeoResultDetails = { checks, summary, detailedAnalysis, ... }
      if (execution.engine_type === 'seo') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅搜索 SeoResultDetails（包含 checks/summary）
        const candidates: unknown[] = [
          nrDetails && this.isRecord((nrDetails as { results?: unknown }).results)
            ? ((nrDetails as { results: Record<string, unknown> }).results as { details?: unknown })
                .details
            : null,
          nrDetails && this.isRecord((nrDetails as { results?: unknown }).results)
            ? (nrDetails as { results: Record<string, unknown> }).results
            : null,
          nrDetails,
        ];
        let seoResultDetails: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (!c || !this.isRecord(c)) continue;
          const cr = c as Record<string, unknown>;
          if (this.isRecord(cr.checks)) {
            seoResultDetails = cr;
            break;
          }
        }
        if (seoResultDetails) {
          if (this.isRecord(seoResultDetails.checks)) {
            summary.seoChecks = seoResultDetails.checks;
          }
          if (this.isRecord(seoResultDetails.summary)) {
            // 浅拷贝打断循环引用：extractSummary 可能返回同一个 SeoSummary 对象
            summary.seoSummary = { ...(seoResultDetails.summary as Record<string, unknown>) };
          }
          if (this.isRecord(seoResultDetails.detailedAnalysis)) {
            summary.seoDetailedAnalysis = seoResultDetails.detailedAnalysis;
          }
        }
      }

      // 对 stress 引擎，把 analysis/recommendations/latency 嵌入 summary
      // StressFinalResult = { engine, version, success, testId, url, results: StressNormalizedResult, analysis, ... }
      // StressNormalizedResult.details = { url, results: StressResult, analysis, stressMode, duration, ... }
      if (execution.engine_type === 'stress') {
        const nr = normalizedResults as Record<string, unknown>;
        const nrDetails = this.isRecord(nr.details)
          ? (nr.details as Record<string, unknown>)
          : null;
        // 候选路径：从最深到最浅
        const candidates: unknown[] = [
          nrDetails ? (nrDetails as { results?: unknown }).results : null,
          (nr as { results?: unknown }).results,
          nrDetails,
        ];
        let stressNormalized: Record<string, unknown> | null = null;
        for (const c of candidates) {
          if (c && this.isRecord(c) && (c as Record<string, unknown>).details) {
            stressNormalized = c as Record<string, unknown>;
            break;
          }
        }
        // 提取 analysis 和 recommendations
        const stressAnalysis =
          (nrDetails as { analysis?: unknown } | null)?.analysis ??
          (nr as { analysis?: unknown }).analysis ??
          (stressNormalized as { details?: { analysis?: unknown } } | null)?.details?.analysis;
        if (stressAnalysis && this.isRecord(stressAnalysis)) {
          summary.analysis = stressAnalysis;
        }
        const stressRecs =
          (stressAnalysis as { recommendations?: unknown[] } | null)?.recommendations ??
          (nr as { recommendations?: unknown[] }).recommendations;
        if (Array.isArray(stressRecs) && stressRecs.length > 0) {
          summary.recommendations = stressRecs;
        }
        // 提取 latency 百分位数据
        const perfBlock = summary.latency ?? (summary as { performance?: unknown }).performance;
        if (!perfBlock) {
          const detailResults = (
            stressNormalized as { details?: { results?: Record<string, unknown> } } | null
          )?.details?.results;
          if (detailResults && this.isRecord(detailResults)) {
            const perf = (detailResults as { performance?: Record<string, unknown> }).performance;
            if (perf && this.isRecord(perf) && (perf as { latency?: unknown }).latency) {
              summary.latency = (perf as { latency: unknown }).latency;
            }
          }
        }
      }

      const normalizedSummary = this.normalizeSummary(summary, {
        score,
        grade,
        passed,
        status: resultStatus,
        warningCount: warnings.length,
        errorCount: errors.length,
        duration: durationStr,
      });

      const resultId = await testResultRepository.saveResult(
        execution.id,
        normalizedSummary,
        score,
        grade,
        passed,
        warnings,
        errors
      );

      const metrics = this.buildMetricsFromResults(normalizedResults, resultId, normalizedSummary);
      await testResultRepository.saveMetrics(metrics);

      if (execution.engine_type === TestEngineType.STRESS) {
        await this.saveStressTestResult(execution, normalizedResults, resultStatus);
      }
      if (execution.engine_type === TestEngineType.PERFORMANCE) {
        await this.savePerformanceTestResult(resultId, normalizedResults);
      }
      if (execution.engine_type === TestEngineType.API) {
        await this.saveApiTestResult(resultId, execution, normalizedResults);
      }
      if (execution.engine_type === TestEngineType.SEO) {
        await this.saveSeoTestResult(resultId, normalizedResults);
      }
      if (execution.engine_type === TestEngineType.SECURITY) {
        await this.saveSecurityTestResult(resultId, normalizedResults);
      }

      // ── 错误逐条记录 ERROR 日志 ──
      if (errors.length > 0) {
        const maxErrorLogs = Math.min(errors.length, 10);
        for (let i = 0; i < maxErrorLogs; i++) {
          const errItem = errors[i];
          let errMsg: string;
          const errContext: Record<string, unknown> = {
            errorIndex: i,
            errorTotal: errors.length,
          };
          if (typeof errItem === 'string') {
            errMsg = errItem;
          } else if (errItem && typeof errItem === 'object') {
            const errObj = errItem as Record<string, unknown>;
            errMsg = String(errObj.message ?? errObj.error ?? JSON.stringify(errItem));
            if (errObj.stack) errContext.stack = String(errObj.stack);
            if (errObj.code) errContext.code = errObj.code;
            if (errObj.type) errContext.type = errObj.type;
          } else {
            errMsg = String(errItem);
          }
          void insertExecutionLog(
            testId,
            'error',
            `错误 [${i + 1}/${errors.length}]: ${errMsg}`,
            errContext
          );
        }
        if (errors.length > maxErrorLogs) {
          void insertExecutionLog(
            testId,
            'warn',
            `还有 ${errors.length - maxErrorLogs} 条错误未逐条展示`,
            {
              errorTotal: errors.length,
            }
          );
        }
      }

      // ── 警告汇总 WARN 日志 ──
      if (warnings.length > 0) {
        const maxWarnLogs = Math.min(warnings.length, 5);
        for (let i = 0; i < maxWarnLogs; i++) {
          const warnMsg =
            typeof warnings[i] === 'string' ? (warnings[i] as string) : JSON.stringify(warnings[i]);
          void insertExecutionLog(
            testId,
            'warn',
            `警告 [${i + 1}/${warnings.length}]: ${warnMsg}`,
            {
              warningIndex: i,
              warningTotal: warnings.length,
            }
          );
        }
      }

      // ── 提取关键性能指标用于完成日志 ──
      const perfIndicators: Record<string, unknown> = {};
      const summaryRecord = normalizedSummary as Record<string, unknown>;
      const detailsRecord = (normalizedResults as { details?: Record<string, unknown> }).details;
      const rootRecord = normalizedResults as Record<string, unknown>;
      const perfDetails = (
        detailsRecord as { performanceDetails?: Record<string, unknown> } | undefined
      )?.performanceDetails;

      // 通用指标：从 summary / details / root 三层提取
      const indicatorKeys = [
        'averageLoadTime',
        'average_load_time',
        'avgResponseTime',
        'averageResponseTime',
        'responseTime',
        'minResponseTime',
        'maxResponseTime',
        'throughput',
        'requestsPerSecond',
        'errorRate',
        'totalRequests',
        'successRate',
        'successfulRequests',
        'failedRequests',
        'totalTime',
      ];
      for (const key of indicatorKeys) {
        const val =
          summaryRecord[key] ??
          (detailsRecord as Record<string, unknown> | undefined)?.[key] ??
          rootRecord[key];
        if (val !== undefined && val !== null) perfIndicators[key] = val;
      }

      // 压力测试延迟百分位数 (p50/p90/p95/p99)
      const perfBlock =
        rootRecord.performance ??
        (detailsRecord as Record<string, unknown> | undefined)?.performance;
      if (perfBlock && typeof perfBlock === 'object') {
        const latency = (perfBlock as { latency?: Record<string, unknown>; throughput?: unknown })
          .latency;
        const throughputVal = (perfBlock as { throughput?: unknown }).throughput;
        if (latency && typeof latency === 'object') {
          const lat = latency as Record<string, unknown>;
          const latencySummary: Record<string, unknown> = {};
          for (const pk of ['p50', 'p90', 'p95', 'p99']) {
            if (typeof lat[pk] === 'number')
              latencySummary[pk] = `${(lat[pk] as number).toFixed(0)}ms`;
          }
          if (Object.keys(latencySummary).length > 0) perfIndicators.latency = latencySummary;
        }
        if (throughputVal !== undefined && throughputVal !== null && !perfIndicators.throughput) {
          perfIndicators.throughput = throughputVal;
        }
      }

      // Web Vitals (performance 引擎)
      const webVitals = (perfDetails as { webVitals?: Record<string, unknown> } | undefined)
        ?.webVitals;
      if (webVitals && typeof webVitals === 'object') {
        const vitalSummary: Record<string, unknown> = {};
        for (const [vk, vv] of Object.entries(webVitals)) {
          if (vv && typeof vv === 'object') {
            const item = vv as { value?: unknown; rating?: unknown };
            if (item.value !== undefined)
              vitalSummary[vk] = `${item.value}${item.rating ? ` (${item.rating})` : ''}`;
          }
        }
        if (Object.keys(vitalSummary).length > 0) perfIndicators.webVitals = vitalSummary;
      }

      const failureMessage = errors[0] ? String(errors[0]) : '测试失败';
      // 基于实际测试结果（分数/通过）判断最终状态，而非引擎内部 status 字段
      // 引擎可能因存在 warnings/errors 就标记 status=failed，但分数高且 passed=true 时应视为成功
      const isFailed = !passed;

      await this.updateUserTestStats(userId, execution.engine_type, !isFailed);

      if (isFailed) {
        await markFailedWithLog(
          testId,
          failureMessage,
          {
            score,
            grade,
            engineType: execution.engine_type,
            metricCount: metrics.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            executionTime: durationMs ? durationMs / 1000 : 0,
            failureMessage,
            ...perfIndicators,
          },
          '测试失败'
        );
      } else {
        await markCompletedWithLog(testId, durationMs ? durationMs / 1000 : 0, {
          score,
          grade,
          engineType: execution.engine_type,
          metricCount: metrics.length,
          errorCount: errors.length,
          warningCount: warnings.length,
          ...perfIndicators,
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

  private async updateUserTestStats(userId: string, engineType: string, passed: boolean) {
    const successCount = passed ? 1 : 0;
    const failedCount = passed ? 0 : 1;

    try {
      await query(
        `INSERT INTO user_test_stats (
           user_id, test_type, total_tests, successful_tests, failed_tests, last_test_at, updated_at
         ) VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, test_type)
         DO UPDATE SET
           total_tests = user_test_stats.total_tests + 1,
           successful_tests = user_test_stats.successful_tests + $3,
           failed_tests = user_test_stats.failed_tests + $4,
           last_test_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, engineType, successCount, failedCount]
      );
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '42P01' || dbError.message?.includes('no such table')) {
        Logger.warn('user_test_stats 表不存在，跳过统计写入');
        return;
      }
      Logger.warn('写入 user_test_stats 失败', error);
    }
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

    // 引擎原始指标名黑名单：这些由专用图表面板展示，不应作为独立 KPI 保存
    const RAW_METRIC_BLACKLIST = new Set([
      // UX 原始指标
      'navigation',
      'fcp',
      'lcp',
      'fid',
      'inp',
      'cls',
      'tbt',
      'longTaskCount',
      'userAgent',
      'timestamp',
      // 兼容性引擎大型数据
      'browsers',
      'devices',
      'matrix',
      'realBrowser',
      'featureSummary',
      'compatWarnings',
      // 可访问性引擎大型数据
      'checks',
      // Website 引擎大型数据
      'websiteSummary',
      'engineMetrics',
      // 通用引擎嵌入数据
      'metrics',
      'stats',
      'samples',
      'sampleCount',
      'screenshot',
      'recommendations',
      'url',
    ]);
    // 过滤：1) 黑名单指标名 2) 对象/数组类型值
    const recordMetrics = this.isRecord(metricsSource)
      ? Object.entries(metricsSource)
          .filter(
            ([k, v]) =>
              v !== null && v !== undefined && typeof v !== 'object' && !RAW_METRIC_BLACKLIST.has(k)
          )
          .map(([metricName, metricValue]) => ({
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

  // 不应作为 KPI 指标保存的 summary 元数据字段
  private static readonly SUMMARY_META_KEYS = new Set([
    'status',
    'passed',
    'grade',
    'url',
    'testType',
    'engine_type',
    'description',
    'version',
    'timestamp',
    'duration',
    'warningCount',
    'errorCount',
    'highlights',
    'issues',
    'topIssues',
    'tags',
    'recommendations',
    'recommendation',
  ]);

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

    // 从 summary 中仅提取数值型 KPI 字段，排除元数据
    const numericKpis: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(summary)) {
      if (UserTestManager.SUMMARY_META_KEYS.has(key)) continue;
      if (typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value))) {
        numericKpis[key] = value;
      }
    }
    return numericKpis;
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

  // 引擎内部元数据字段，不应出现在前端概览 summary 中
  // 注意：数据字段（metrics/stats/samples/browsers 等）必须保留在 summary 中，
  // 供 testService 提取给图表面板使用
  private static readonly ENGINE_INTERNAL_KEYS = new Set([
    'engine',
    'version',
    'success',
    'testId',
    'results',
    'error',
    'testType',
    'confirmPuppeteer',
  ]);

  private normalizeSummary(
    summary: Record<string, unknown>,
    extras: {
      score: number;
      grade: string;
      passed: boolean;
      status: string;
      warningCount: number;
      errorCount: number;
      duration?: string;
    }
  ): Record<string, unknown> {
    // 过滤引擎内部字段，避免泄漏到前端概览
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(summary)) {
      if (!UserTestManager.ENGINE_INTERNAL_KEYS.has(key)) {
        filtered[key] = value;
      }
    }
    return {
      ...filtered,
      score: extras.score,
      grade: extras.grade,
      passed: extras.passed,
      status: extras.status,
      warningCount: extras.warningCount,
      errorCount: extras.errorCount,
      ...(extras.duration ? { duration: extras.duration } : {}),
    };
  }
}

const userTestManager = new UserTestManager();

export default userTestManager;
