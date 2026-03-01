/**
 * 测试业务服务层 (Service)
 * 职责: 包含业务逻辑,协调Repository和其他服务
 */

import { v4 as uuidv4 } from 'uuid';
import { RESULT_SCHEMA_VERSION } from '../../../../shared/types/testResult.types';
import { ErrorFactory } from '../../middleware/errorHandler';
import type { TestResultRecord } from '../../types';
import { toDate } from '../../utils/dateUtils';
import apiTestResultRepository from '../repositories/apiTestResultRepository';
import performanceTestResultRepository from '../repositories/performanceTestResultRepository';
import securityTestResultRepository from '../repositories/securityTestResultRepository';
import seoTestResultRepository from '../repositories/seoTestResultRepository';
import stressTestResultRepository from '../repositories/stressTestResultRepository';
import testHistoryRepository, { type TestHistoryRow } from '../repositories/testHistoryRepository';
import testOperationsRepository from '../repositories/testOperationsRepository';
import testRepository from '../repositories/testRepository';
import testResultRepository from '../repositories/testResultRepository';
import testBusinessService from './TestBusinessService';
import { insertExecutionLog, normalizeTestLogLevel, updateStatusWithLog } from './testLogService';
import testTemplateService from './testTemplateService';
import userTestManager from './UserTestManager';

interface TestResult {
  id: number;
  testId: string;
  userId: string;
  schemaVersion?: string;
  config?: TestConfig;
  summary: Record<string, unknown>;
  metrics?: Array<Record<string, unknown>>;
  score?: number;
  grade?: string;
  passed?: boolean;
  warnings?: unknown[];
  errors?: unknown[];
  details?: Record<string, unknown>;
  createdAt: Date;
}

interface TestExecutionRecord {
  id: number;
  test_id: string;
  user_id: string;
  workspace_id?: string | null;
  engine_type: string;
  engine_name: string;
  test_name: string;
  test_url?: string;
  test_config?: Record<string, unknown>;
  status: string;
  progress?: number;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  execution_time?: number;
  error_message?: string;
}

interface TestConfig {
  testId?: string;
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  concurrency?: number;
  duration?: number;
  batchId?: string;
  templateId?: string;
  scheduleId?: string | number;
  workspaceId?: string;
  history?: {
    saveToHistory?: boolean;
    title?: string;
    tags?: string[];
    retentionDays?: number;
    baselineId?: string;
    notes?: string;
  };
}

type TestHistoryResponse = {
  tests: TestExecutionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  typeCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
  avgScore?: number | null;
  avgDuration?: number | null;
};

type TestDetailResponse = {
  id: string;
  userId: string;
  url: string;
  testType: string;
  status: string;
  results: unknown | null;
  createdAt: Date;
  updatedAt: Date;
  configSnapshot?: Record<string, unknown> | null;
};

type TestStatusResponse = {
  testId: string;
  status: string;
  progress: number;
  startTime: Date;
  endTime: Date;
  errorMessage?: string;
  results: unknown | null;
};

type TestListResponse = {
  tests: Array<{
    id: string;
    url: string;
    testType: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type TestLogEntry = {
  id: number;
  level: string;
  message: string;
  context: Record<string, unknown>;
  createdAt: Date;
};

type TestHistoryPagedResult = {
  results: TestHistoryRow[];
  total: number;
  hasMore: boolean;
};

interface User {
  userId: string;
  role: string;
}

class TestService {
  /**
   * 获取测试结果
   */
  async getTestResults(testId: string, userId: string, workspaceId?: string): Promise<TestResult> {
    // 检查权限
    const hasAccess = await testRepository.checkOwnership(testId, userId, workspaceId);
    if (!hasAccess) {
      throw new Error('无权访问此测试');
    }

    const execution = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;
    if (!execution) {
      throw ErrorFactory.notFound('测试不存在');
    }

    const result = (await testResultRepository.findResults(
      testId,
      userId,
      workspaceId
    )) as TestResultRecord | null;
    if (!result) {
      throw new Error('测试结果不存在');
    }

    const metrics = await testResultRepository.findMetrics(testId, userId, workspaceId);
    const metricsPayload = metrics.map(metric => ({ ...metric }));

    const payload = this.formatResults(execution, result, metricsPayload);

    let stressResults: Record<string, unknown> | null = null;
    let stressTimeline: Array<Record<string, unknown>> | null = null;
    if (execution.engine_type === 'stress') {
      stressResults = await stressTestResultRepository.getResultsByTestId(testId);
      stressTimeline = this.extractStressTimeline(stressResults);
    }

    const performance =
      execution.engine_type === 'performance'
        ? await performanceTestResultRepository.getByTestResultId(result.id)
        : null;
    const security =
      execution.engine_type === 'security'
        ? await securityTestResultRepository.getByTestResultId(result.id)
        : null;
    const seo =
      execution.engine_type === 'seo'
        ? await seoTestResultRepository.getByTestResultId(result.id)
        : null;
    const api =
      execution.engine_type === 'api'
        ? await apiTestResultRepository.getByTestResultId(result.id)
        : null;

    payload.details = this.buildNormalizedDetails(execution.engine_type, payload, {
      performance,
      security,
      seo,
      api,
      stressResults,
      stressTimeline,
    });

    // 过滤概览 summary：移除引擎嵌入的大型数据字段，只保留适合 KPI 卡片的字段
    // 必须在 buildNormalizedDetails 之后执行，因为它需要从原始 summary 中提取图表数据
    payload.summary = this.filterSummaryForOverview(payload.summary);

    return payload;
  }

  /**
   * 重新运行测试
   */
  async rerunTest(
    testId: string,
    userId: string,
    role = 'free',
    workspaceId?: string
  ): Promise<Record<string, unknown>> {
    const execution = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;
    if (!execution) {
      throw ErrorFactory.notFound('测试不存在');
    }

    const config = this.buildConfigFromExecution(execution);
    const newTestId = uuidv4();
    return this.createAndStart({ ...config, testId: newTestId }, { userId, role });
  }

  /**
   * 更新测试配置/信息
   */
  async updateTest(
    testId: string,
    userId: string,
    updates: Record<string, unknown>,
    workspaceId?: string
  ): Promise<Record<string, unknown>> {
    const execution = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;
    if (!execution) {
      throw ErrorFactory.notFound('测试不存在');
    }

    if (!workspaceId && execution.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    const currentConfig = this.parseTestConfig(execution.test_config);
    const nextConfig = {
      ...currentConfig,
      ...updates,
    };

    const nextTestUrl = (updates.url as string) ?? execution.test_url ?? currentConfig.url;
    const nextTestName = (updates.testName as string) ?? execution.test_name;

    const scopeValue = workspaceId ?? userId;
    const scopeColumn = workspaceId ? 'workspace_id' : 'user_id';
    await testOperationsRepository.updateTestConfig(testId, scopeValue, scopeColumn, {
      testName: nextTestName,
      testUrl: nextTestUrl || null,
      testConfig: nextConfig,
    });

    await insertExecutionLog(testId, 'info', '测试配置已更新', {
      updates: Object.keys(updates),
    });

    return {
      testId,
      config: nextConfig,
    };
  }

  /**
   * 批量创建测试
   */
  async createBatchTests(tests: Record<string, unknown>[], user: User) {
    const batchId = uuidv4();
    const results: Array<{ testId: string; status: string }> = [];

    for (const raw of tests) {
      const config = this.normalizeBatchConfig(raw, batchId);
      const result = await this.createAndStart(config, user);
      results.push({
        testId: result.testId as string,
        status: result.status as string,
      });
    }

    return {
      batchId,
      total: results.length,
      tests: results,
    };
  }

  /**
   * 获取批量测试状态
   */
  async getBatchTestStatus(batchId: string, userId: string, workspaceId?: string) {
    const scopeValue = workspaceId ?? userId;
    const scopeColumn = workspaceId ? 'workspace_id' : 'user_id';
    const rows = await testOperationsRepository.getBatchTests(batchId, scopeValue, scopeColumn);

    const tests = rows.map(row => ({
      testId: row.test_id,
      status: row.status,
      progress: typeof row.progress === 'number' ? row.progress : 0,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    }));

    return {
      batchId,
      total: tests.length,
      tests,
    };
  }

  /**
   * 删除批量测试
   */
  async deleteBatchTests(batchId: string, userId: string, workspaceId?: string): Promise<void> {
    const scopeValue = workspaceId ?? userId;
    const scopeColumn = workspaceId ? 'workspace_id' : 'user_id';
    const testIds = await testOperationsRepository.getBatchTestIds(
      batchId,
      scopeValue,
      scopeColumn
    );

    for (const testId of testIds) {
      try {
        await this.stopTestExecution(testId, userId);
      } catch {
        // ignore stop errors for cleanup
      }
      await testRepository.delete(testId);
    }
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(
    userId: string,
    testType?: string,
    page = 1,
    limit = 20,
    keyword?: string,
    workspaceId?: string
  ): Promise<TestHistoryResponse> {
    const offset = (page - 1) * limit;
    const result = await testHistoryRepository.getTestHistory(
      userId,
      testType,
      keyword,
      limit,
      offset,
      workspaceId
    );
    return {
      tests: result.tests,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      typeCounts: result.typeCounts,
      statusCounts: result.statusCounts,
      avgScore: result.avgScore,
      avgDuration: result.avgDuration,
    };
  }

  async getTestHistorySummary(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<TestHistoryRow | null> {
    return testHistoryRepository.getLatestTestResultRecord(testId, userId, workspaceId);
  }

  async getTestHistoryByPeriod(
    testId: string,
    userId: string,
    period: string,
    workspaceId?: string
  ): Promise<TestHistoryRow[]> {
    const days = parseInt(period.replace(/\D/g, ''), 10) || 30;
    return testHistoryRepository.getTestHistoryByTestIdInPeriod(testId, userId, days, workspaceId);
  }

  async getTestHistoryPaged(
    testId: string,
    userId: string,
    limit = 20,
    offset = 0,
    workspaceId?: string
  ): Promise<TestHistoryPagedResult> {
    return testHistoryRepository.getTestHistoryByTestIdPaged(
      testId,
      userId,
      limit,
      offset,
      workspaceId
    );
  }

  async getExecutionIdForTest(
    testId: string,
    userId: string,
    workspaceId?: string
  ): Promise<number | null> {
    return testHistoryRepository.getExecutionIdForTest(testId, userId, workspaceId);
  }

  async getPerformanceTrend(url: string, userId: string, workspaceId?: string, limit = 30) {
    return performanceTestResultRepository.getTrendByUrl(url, userId, workspaceId, limit);
  }

  /**
   * 获取测试详情
   */
  async getTestDetail(
    userId: string,
    testId: string,
    workspaceId?: string
  ): Promise<TestDetailResponse> {
    const test = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;
    if (!test) {
      throw ErrorFactory.notFound('测试不存在');
    }
    const result = (await testResultRepository.findResults(
      testId,
      userId,
      workspaceId
    )) as TestResultRecord | null;
    const parseConfig = (raw: unknown): Record<string, unknown> | null => {
      if (!raw) return null;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    };

    return {
      id: test.test_id,
      userId: test.user_id,
      url: test.test_url || '',
      testType: test.engine_type,
      status: test.status,
      results: result?.summary || null,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
      configSnapshot: parseConfig(test.test_config),
    };
  }

  /**
   * 获取测试日志
   */
  async getTestLogs(
    userId: string,
    testId: string,
    limit = 100,
    offset = 0,
    level?: string,
    workspaceId?: string
  ): Promise<{ logs: TestLogEntry[]; total: number; hasMore: boolean }> {
    const test = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;
    if (!test) {
      throw ErrorFactory.notFound('测试不存在');
    }

    const scopeValue = workspaceId ?? userId;
    const scopeColumn = workspaceId ? 'workspace_id' : 'user_id';
    const normalizedLevel = level ? normalizeTestLogLevel(level, 'info') : undefined;
    const result = await testOperationsRepository.getTestLogs(
      testId,
      scopeValue,
      scopeColumn,
      limit,
      offset,
      normalizedLevel
    );
    const logs = result.rows.map(row => ({
      id: row.id,
      level: row.level,
      message: row.message,
      context: (row.context || {}) as Record<string, unknown>,
      createdAt: toDate(row.created_at),
    }));

    return {
      logs,
      total: result.total,
      hasMore: offset + limit < result.total,
    };
  }

  /**
   * 取消测试
   */
  async cancelTest(userId: string, testId: string, workspaceId?: string): Promise<void> {
    await this.updateAndStopTest(userId, testId, 'cancelled', '测试已取消', workspaceId);
  }

  /**
   * 停止测试
   */
  async stopTest(userId: string, testId: string, workspaceId?: string): Promise<void> {
    await this.updateAndStopTest(userId, testId, 'stopped', '测试已停止', workspaceId);
  }

  /**
   * 创建并启动测试
   */
  async createAndStart(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    const result = await testBusinessService.createAndStartTest(config, user);

    if (config.templateId) {
      await testTemplateService.incrementUsage(config.templateId);
    }

    return {
      testId: result.testId,
      status: result.status,
      startTime: result.startTime,
      estimatedDuration: result.estimatedDuration,
      templateId: result.templateId,
      config,
    };
  }

  /**
   * 创建网站测试
   */
  async createWebsiteTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'website' }, user);
  }

  /**
   * 创建性能测试
   */
  async createPerformanceTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    // @deprecated 使用 createAndStart + testType=performance
    return this.createAndStart({ ...config, testType: 'performance' }, user);
  }

  /**
   * 创建安全测试
   */
  async createSecurityTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'security' }, user);
  }

  /**
   * 创建SEO测试
   */
  async createSEOTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'seo' }, user);
  }

  /**
   * 创建压力测试
   */
  async createStressTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'stress' }, user);
  }

  /**
   * 创建API测试
   */
  async createAPITest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'api' }, user);
  }

  /**
   * 创建可访问性测试
   */
  async createAccessibilityTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'accessibility' }, user);
  }

  /**
   * 创建兼容性测试
   */
  async createCompatibilityTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'compatibility' }, user);
  }

  /**
   * 创建UX测试
   */
  async createUXTest(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    return this.createAndStart({ ...config, testType: 'ux' }, user);
  }

  /**
   * 获取测试状态
   */
  async getStatus(
    userId: string,
    testId: string,
    workspaceId?: string
  ): Promise<TestStatusResponse> {
    const test = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;

    if (!test) {
      throw ErrorFactory.notFound('测试不存在');
    }

    if (!workspaceId && test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    const result = await testResultRepository.findResults(testId, userId, workspaceId);
    const results = result?.summary ?? null;

    return {
      testId: test.test_id,
      status: test.status,
      progress: typeof test.progress === 'number' ? test.progress : 0,
      startTime: test.started_at || test.created_at,
      endTime: test.completed_at || test.updated_at,
      errorMessage: test.error_message || undefined,
      results,
    };
  }

  /**
   * 停止测试
   */
  async updateAndStopTest(
    userId: string,
    testId: string,
    status: 'cancelled' | 'stopped',
    message: string,
    workspaceId?: string
  ): Promise<void> {
    const test = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;

    if (!test) {
      throw ErrorFactory.notFound('测试不存在');
    }

    if (!workspaceId && test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    if (test.status === 'completed') {
      throw new Error('测试已完成，无法停止/取消');
    }

    if (test.status === status) {
      return;
    }

    // 先更新状态，避免停止过程中被错误标记为 failed
    await updateStatusWithLog(testId, status, message, { userId });

    await this.stopTestExecution(testId, userId);
  }

  /**
   * 删除测试
   */
  async deleteTest(userId: string, testId: string, workspaceId?: string): Promise<void> {
    const test = (await testRepository.findById(
      testId,
      userId,
      workspaceId
    )) as TestExecutionRecord | null;

    if (!test) {
      throw ErrorFactory.notFound('测试不存在');
    }

    if (!workspaceId && test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    // 删除测试相关数据
    await testRepository.delete(testId);
  }

  /**
   * 获取测试列表
   */
  async getTestList(
    userId: string,
    page = 1,
    limit = 10,
    workspaceId?: string
  ): Promise<TestListResponse> {
    const offset = (page - 1) * limit;

    const tests = (await testRepository.findByUserId(
      userId,
      limit,
      offset,
      workspaceId
    )) as TestExecutionRecord[];
    const total = await testRepository.countByUserId(userId, workspaceId);

    return {
      tests: tests.map(test => ({
        id: test.test_id,
        url: test.test_url || '',
        testType: test.engine_type,
        status: test.status,
        createdAt: test.created_at,
        updatedAt: test.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 停止测试执行
   */
  private async stopTestExecution(testId: string, userId: string): Promise<void> {
    const engine = userTestManager.getUserTestEngine(userId, testId);
    if (!engine) {
      return;
    }

    await userTestManager.stopUserTest(userId, testId);
  }

  /**
   * 格式化测试结果
   */
  private formatResults(
    execution: TestExecutionRecord,
    result: TestResultRecord,
    metrics: Array<Record<string, unknown>> = []
  ): TestResult {
    return {
      id: result.id,
      testId: execution.test_id,
      userId: execution.user_id,
      schemaVersion: RESULT_SCHEMA_VERSION,
      config: this.buildConfigFromExecution(execution),
      summary: this.parseJsonValue(result.summary, {}),
      metrics,
      score: result.score,
      grade: result.grade,
      passed: result.passed,
      warnings: this.parseJsonArray(result.warnings),
      errors: this.parseJsonArray(result.errors),
      createdAt: toDate(result.created_at),
    };
  }

  // 引擎嵌入的大型数据字段，由 buildNormalizedDetails 提取给图表面板，
  // 不应出现在前端概览 KPI 卡片中
  private static readonly SUMMARY_DATA_KEYS = new Set([
    // UX 引擎
    'metrics',
    'stats',
    'samples',
    'sampleCount',
    'screenshot',
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
    // 兼容性引擎
    'browsers',
    'devices',
    'matrix',
    'realBrowser',
    'featureSummary',
    'compatWarnings',
    // 可访问性引擎
    'checks',
    // Website 引擎
    'websiteSummary',
    'engineMetrics',
    'recommendations',
    // 引擎元数据
    'engine',
    'version',
    'success',
    'testId',
    'results',
    'error',
    'testType',
  ]);

  private filterSummaryForOverview(summary: unknown): Record<string, unknown> {
    if (!this.isRecord(summary)) return {};
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(summary)) {
      if (!TestService.SUMMARY_DATA_KEYS.has(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private extractStressTimeline(
    stressResults: Record<string, unknown> | null
  ): Array<Record<string, unknown>> | null {
    if (!stressResults) {
      return null;
    }

    const candidates: unknown[] = [
      (stressResults as { results?: { details?: { results?: { timeline?: unknown } } } }).results
        ?.details?.results?.timeline,
      (stressResults as { details?: { results?: { timeline?: unknown } } }).details?.results
        ?.timeline,
      (stressResults as { results?: { timeline?: unknown } }).results?.timeline,
      (stressResults as { timeline?: unknown }).timeline,
    ];

    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      const normalized = candidate.filter(item => this.isRecord(item)) as Array<
        Record<string, unknown>
      >;
      if (normalized.length === 0) {
        continue;
      }
      const hasShape = normalized.some(
        item =>
          'timestamp' in item ||
          'activeConnections' in item ||
          'responseTime' in item ||
          'errors' in item
      );
      if (hasShape) {
        return normalized;
      }
    }

    return null;
  }

  private buildNormalizedDetails(
    engineType: string,
    payload: TestResult,
    extras: {
      performance?: Record<string, unknown> | null;
      security?: Record<string, unknown> | null;
      seo?: Record<string, unknown> | null;
      api?: Record<string, unknown> | null;
      stressResults?: Record<string, unknown> | null;
      stressTimeline?: Array<Record<string, unknown>> | null;
    }
  ): Record<string, unknown> {
    const engineDetails: Record<string, unknown> = {
      summary: payload.summary,
      metrics: payload.metrics ?? [],
      warnings: payload.warnings ?? [],
      errors: payload.errors ?? [],
      details: this.isRecord(payload.summary) ? payload.summary : {},
    };

    if (engineType === 'performance' && extras.performance) {
      engineDetails.details = extras.performance;
    }
    if (engineType === 'security' && extras.security) {
      engineDetails.details = extras.security;
    }
    if (engineType === 'seo' && extras.seo) {
      engineDetails.details = extras.seo;
    }
    if (engineType === 'api' && extras.api) {
      engineDetails.details = extras.api;
    }
    if (engineType === 'stress') {
      // stressResults 是 BaseTestResult，其 details 字段才是 StressFinalResult
      // 前端 StressChartPanel 期望 engineDetails.details 直接包含 StressFinalResult
      const base = this.isRecord(extras.stressResults) ? extras.stressResults : {};
      const innerDetails = this.isRecord((base as { details?: unknown }).details)
        ? ((base as { details?: unknown }).details as Record<string, unknown>)
        : base;
      engineDetails.details = {
        ...innerDetails,
        ...(extras.stressTimeline ? { timeline: extras.stressTimeline } : {}),
      };
    }
    // accessibility 引擎：summary 中已嵌入 checks/recommendations，确保 details 包含完整数据
    if (engineType === 'accessibility' && this.isRecord(payload.summary)) {
      const s = payload.summary as {
        checks?: Record<string, unknown>;
        recommendations?: unknown[];
        summary?: Record<string, unknown>;
      };
      if (s.checks) {
        engineDetails.details = {
          checks: s.checks,
          summary: s.summary ?? payload.summary,
          recommendations: s.recommendations ?? [],
        };
      }
    }
    // compatibility 引擎：summary 中已嵌入 browsers/devices/matrix/featureSummary/recommendations
    if (engineType === 'compatibility' && this.isRecord(payload.summary)) {
      const s = payload.summary as {
        browsers?: unknown[];
        devices?: unknown[];
        matrix?: unknown[];
        realBrowser?: unknown[];
        featureSummary?: Record<string, unknown>;
        recommendations?: unknown[];
        compatWarnings?: unknown[];
        overallScore?: number;
        browserCount?: number;
        deviceCount?: number;
        matrixCount?: number;
        realBrowserCount?: number;
      };
      if (s.browsers || s.devices || s.matrix) {
        engineDetails.details = {
          summary: {
            overallScore: s.overallScore,
            browserCount: s.browserCount,
            deviceCount: s.deviceCount,
            matrixCount: s.matrixCount,
            realBrowserCount: s.realBrowserCount,
          },
          browsers: s.browsers ?? [],
          devices: s.devices ?? [],
          matrix: s.matrix ?? [],
          realBrowser: s.realBrowser ?? [],
          featureSummary: s.featureSummary ?? {},
          recommendations: s.recommendations ?? [],
          warnings: s.compatWarnings ?? [],
        };
      }
    }

    // website 引擎：summary 中已嵌入 checks/engineMetrics/recommendations/websiteSummary
    if (engineType === 'website' && this.isRecord(payload.summary)) {
      const s = payload.summary as {
        url?: string;
        websiteSummary?: Record<string, unknown>;
        checks?: Record<string, unknown>;
        engineMetrics?: Record<string, unknown>;
        recommendations?: unknown[];
      };
      if (s.checks || s.engineMetrics) {
        engineDetails.details = {
          results: {
            url: s.url,
            summary: s.websiteSummary ?? {},
            checks: s.checks ?? {},
            engineMetrics: s.engineMetrics ?? {},
            recommendations: s.recommendations ?? [],
          },
        };
      }
    }

    // ux 引擎：summary 中已嵌入 metrics/stats/recommendations/samples/sampleCount/screenshot
    if (engineType === 'ux' && this.isRecord(payload.summary)) {
      const s = payload.summary as {
        url?: string;
        metrics?: Record<string, unknown>;
        stats?: Record<string, unknown>;
        recommendations?: unknown[];
        samples?: unknown[];
        sampleCount?: number;
        screenshot?: Record<string, unknown>;
        description?: string;
        highlights?: string[];
        issues?: string[];
        tags?: unknown[];
        level?: string;
        levelLabel?: string;
        score?: number;
        grade?: string;
      };
      if (s.metrics || s.stats) {
        engineDetails.details = {
          url: s.url,
          metrics: s.metrics ?? {},
          stats: s.stats ?? {},
          recommendations: s.recommendations ?? [],
          samples: s.samples ?? [],
          sampleCount: s.sampleCount ?? 0,
          screenshot: s.screenshot,
          score: s.score,
          grade: s.grade,
          summary: {
            description: s.description,
            highlights: s.highlights ?? [],
            issues: s.issues ?? [],
            tags: s.tags ?? [],
            level: s.level,
            levelLabel: s.levelLabel,
          },
        };
      }
    }

    return {
      results: {
        [engineType]: engineDetails,
      },
    };
  }

  private buildConfigFromExecution(execution: TestExecutionRecord): TestConfig {
    const parsedConfig = this.parseTestConfig(execution.test_config);
    return {
      url: execution.test_url || parsedConfig.url || '',
      testType: execution.engine_type || parsedConfig.testType || '',
      options: parsedConfig.options,
      concurrency: parsedConfig.concurrency,
      duration: parsedConfig.duration,
      templateId: parsedConfig.templateId,
      scheduleId: parsedConfig.scheduleId,
    };
  }

  private parseTestConfig(config?: Record<string, unknown>): TestConfig {
    const parsedConfig = this.parseJsonValue<Record<string, unknown> | null>(config, null);
    if (!parsedConfig || typeof parsedConfig !== 'object') {
      return { url: '', testType: '' };
    }
    const record = parsedConfig as Record<string, unknown>;
    return {
      url: (record.url as string) || '',
      testType: (record.testType as string) || (record.engine_type as string) || '',
      options: record.options as Record<string, unknown> | undefined,
      concurrency: typeof record.concurrency === 'number' ? record.concurrency : undefined,
      duration: typeof record.duration === 'number' ? record.duration : undefined,
      batchId: typeof record.batchId === 'string' ? record.batchId : undefined,
      templateId: typeof record.templateId === 'string' ? record.templateId : undefined,
      scheduleId:
        typeof record.scheduleId === 'string' || typeof record.scheduleId === 'number'
          ? record.scheduleId
          : undefined,
    };
  }

  private normalizeBatchConfig(raw: Record<string, unknown>, batchId: string): TestConfig {
    return {
      url: String(raw.url || ''),
      testType: String(raw.testType || raw.engineType || ''),
      options: (raw.options as Record<string, unknown> | undefined) ?? {},
      concurrency: typeof raw.concurrency === 'number' ? raw.concurrency : undefined,
      duration: typeof raw.duration === 'number' ? raw.duration : undefined,
      batchId,
      templateId: typeof raw.templateId === 'string' ? raw.templateId : undefined,
    };
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

  private parseJsonArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    return this.parseJsonValue(value, [] as unknown[]);
  }
}

export default new TestService();
