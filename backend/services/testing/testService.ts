/**
 * 测试业务服务层 (Service)
 * 职责: 包含业务逻辑,协调Repository和其他服务
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import testRepository from '../../repositories/testRepository';
import testBusinessService from './TestBusinessService';
import { insertExecutionLog, normalizeTestLogLevel, updateStatusWithLog } from './testLogService';
import testTemplateService from './testTemplateService';

const userTestManager = require('./UserTestManager');

interface TestResult {
  id: number;
  testId: string;
  userId: string;
  summary: Record<string, unknown>;
  metrics?: Array<Record<string, unknown>>;
  score?: number;
  grade?: string;
  passed?: boolean;
  warnings?: unknown[];
  errors?: unknown[];
  createdAt: Date;
}

interface TestExecutionRecord {
  id: number;
  test_id: string;
  user_id: string;
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

interface TestResultRecord {
  id: number;
  execution_id: number;
  summary: Record<string, unknown>;
  score?: number;
  grade?: string;
  passed?: boolean;
  warnings?: unknown[];
  errors?: unknown[];
  created_at: Date;
}

interface TestConfig {
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  concurrency?: number;
  duration?: number;
  batchId?: string;
  templateId?: string;
  scheduleId?: string | number;
}

type TestHistoryResponse = {
  tests: TestExecutionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
};

type TestStatusResponse = {
  testId: string;
  status: string;
  progress: number;
  startTime: Date;
  endTime: Date;
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

interface User {
  userId: string;
  role: string;
}

class TestService {
  /**
   * 获取测试结果
   */
  async getTestResults(testId: string, userId: string): Promise<TestResult> {
    // 检查权限
    const hasAccess = await testRepository.checkOwnership(testId, userId);
    if (!hasAccess) {
      throw new Error('无权访问此测试');
    }

    const execution = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!execution) {
      throw new Error('测试不存在');
    }

    const result = (await testRepository.findResults(testId, userId)) as TestResultRecord | null;
    if (!result) {
      throw new Error('测试结果不存在');
    }

    const metrics = await testRepository.findMetrics(testId, userId);
    const metricsPayload = metrics.map(metric => ({ ...metric }));

    return this.formatResults(execution, result, metricsPayload);
  }

  /**
   * 重新运行测试
   */
  async rerunTest(testId: string, userId: string, role = 'free'): Promise<Record<string, unknown>> {
    const execution = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!execution) {
      throw new Error('测试不存在');
    }

    const config = this.buildConfigFromExecution(execution);
    return this.createAndStart(config, { userId, role });
  }

  /**
   * 更新测试配置/信息
   */
  async updateTest(
    testId: string,
    userId: string,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const execution = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!execution) {
      throw new Error('测试不存在');
    }

    if (execution.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    const currentConfig = this.parseTestConfig(execution.test_config);
    const nextConfig = {
      ...currentConfig,
      ...updates,
    };

    const nextTestUrl = (updates.url as string) ?? execution.test_url ?? currentConfig.url;
    const nextTestName = (updates.testName as string) ?? execution.test_name;

    await query(
      `UPDATE test_executions
       SET test_name = $1,
           test_url = $2,
           test_config = $3,
           updated_at = NOW()
       WHERE test_id = $4 AND user_id = $5`,
      [nextTestName, nextTestUrl || null, JSON.stringify(nextConfig), testId, userId]
    );

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
  async getBatchTestStatus(batchId: string, userId: string) {
    const result = await query(
      `SELECT test_id, status, progress, created_at, updated_at
       FROM test_executions
       WHERE user_id = $1 AND (test_config->>'batchId') = $2
       ORDER BY created_at DESC`,
      [userId, batchId]
    );

    const tests = result.rows.map(row => ({
      testId: row.test_id as string,
      status: row.status as string,
      progress: typeof row.progress === 'number' ? row.progress : 0,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
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
  async deleteBatchTests(batchId: string, userId: string): Promise<void> {
    const testIdsResult = await query(
      `SELECT test_id FROM test_executions
       WHERE user_id = $1 AND (test_config->>'batchId') = $2`,
      [userId, batchId]
    );

    for (const row of testIdsResult.rows) {
      const testId = row.test_id as string;
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
    limit = 20
  ): Promise<TestHistoryResponse> {
    const offset = (page - 1) * limit;
    const result = await testRepository.getTestHistory(userId, testType, limit, offset);
    return {
      tests: result.tests,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * 获取测试详情
   */
  async getTestDetail(userId: string, testId: string): Promise<TestDetailResponse> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }
    const result = (await testRepository.findResults(testId, userId)) as TestResultRecord | null;
    return {
      id: test.test_id,
      userId: test.user_id,
      url: test.test_url || '',
      testType: test.engine_type,
      status: test.status,
      results: result?.summary || null,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
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
    level?: string
  ): Promise<{ logs: TestLogEntry[]; total: number; hasMore: boolean }> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }

    const params: Array<string | number> = [testId, userId];
    let whereClause = 'te.test_id = $1 AND te.user_id = $2';

    const normalizedLevel = level ? normalizeTestLogLevel(level, 'info') : undefined;
    if (normalizedLevel) {
      params.push(normalizedLevel);
      whereClause += ` AND tl.level = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const listResult = await query(
      `SELECT tl.id, tl.level, tl.message, tl.context, tl.created_at
       FROM test_logs tl
       INNER JOIN test_executions te ON te.id = tl.execution_id
       WHERE ${whereClause}
       ORDER BY tl.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const logs = listResult.rows.map(row => ({
      id: row.id as number,
      level: row.level as string,
      message: row.message as string,
      context: (row.context || {}) as Record<string, unknown>,
      createdAt: row.created_at as Date,
    }));

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * 取消测试
   */
  async cancelTest(userId: string, testId: string): Promise<void> {
    await this.updateAndStopTest(userId, testId, 'cancelled', '测试已取消');
  }

  /**
   * 创建并启动测试
   */
  async createAndStart(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    try {
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
    } catch (error) {
      throw new Error(`创建测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * 获取测试状态
   */
  async getStatus(userId: string, testId: string): Promise<TestStatusResponse> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    const result = await testRepository.findResults(testId, userId);
    const results = result?.summary ?? null;

    return {
      testId: test.test_id,
      status: test.status,
      progress: typeof test.progress === 'number' ? test.progress : 0,
      startTime: test.started_at || test.created_at,
      endTime: test.completed_at || test.updated_at,
      results,
    };
  }

  /**
   * 停止测试
   */
  async stopTest(userId: string, testId: string): Promise<void> {
    await this.updateAndStopTest(userId, testId, 'stopped', '测试已停止');
  }

  private async updateAndStopTest(
    userId: string,
    testId: string,
    status: 'cancelled' | 'stopped',
    message: string
  ): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.user_id !== userId) {
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
  async deleteTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    // 删除测试相关数据
    await testRepository.delete(testId);
  }

  /**
   * 获取测试列表
   */
  async getTestList(userId: string, page = 1, limit = 10): Promise<TestListResponse> {
    const offset = (page - 1) * limit;

    const tests = (await testRepository.findByUserId(
      userId,
      limit,
      offset
    )) as TestExecutionRecord[];
    const total = await testRepository.countByUserId(userId);

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
      summary: this.parseJsonValue(result.summary, {}),
      metrics,
      score: result.score,
      grade: result.grade,
      passed: result.passed,
      warnings: this.parseJsonArray(result.warnings),
      errors: this.parseJsonArray(result.errors),
      createdAt: result.created_at,
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
