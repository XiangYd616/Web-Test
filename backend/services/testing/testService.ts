/**
 * 测试业务服务层 (Service)
 * 职责: 包含业务逻辑,协调Repository和其他服务
 */

import { query } from '../../config/database';
import testRepository from '../../repositories/testRepository';
import testBusinessService from './TestBusinessService';

const userTestManager = require('./UserTestManager');

interface TestResult {
  id: number;
  testId: string;
  userId: string;
  summary: Record<string, unknown>;
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

    return this.formatResults(execution, result);
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
   * 取消测试
   */
  async cancelTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.status === 'completed') {
      throw new Error('测试已完成，无法取消');
    }

    await this.stopTestExecution(testId, userId);
    await testRepository.updateStatus(testId, 'cancelled');
    await this.insertExecutionLog(testId, 'info', '测试已取消', {
      userId,
    });
  }

  /**
   * 创建并启动测试
   */
  async createAndStart(config: TestConfig, user: User): Promise<Record<string, unknown>> {
    try {
      const result = await testBusinessService.createAndStartTest(config, user);
      return {
        ...result,
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

    return {
      testId: test.test_id,
      status: test.status,
      progress: typeof test.progress === 'number' ? test.progress : 0,
      startTime: test.started_at || test.created_at,
      endTime: test.completed_at || test.updated_at,
      results: null,
    };
  }

  /**
   * 停止测试
   */
  async stopTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestExecutionRecord | null;

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.user_id !== userId) {
      throw new Error('无权访问此测试');
    }

    if (test.status === 'completed') {
      throw new Error('测试已完成，无法停止');
    }

    // 停止测试执行
    await this.stopTestExecution(testId, userId);

    // 更新状态
    await testRepository.updateStatus(testId, 'stopped');
    await this.insertExecutionLog(testId, 'info', '测试已停止', {
      userId,
    });
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
   * 验证测试配置
   */
  private validateTestConfig(config: TestConfig): void {
    if (!config.url) {
      throw new Error('测试URL不能为空');
    }

    if (!config.testType) {
      throw new Error('测试类型不能为空');
    }

    // URL格式验证
    try {
      new URL(config.url);
    } catch {
      throw new Error('无效的URL格式');
    }
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

  /**
   * 格式化测试结果
   */
  private formatResults(execution: TestExecutionRecord, result: TestResultRecord): TestResult {
    return {
      id: result.id,
      testId: execution.test_id,
      userId: execution.user_id,
      summary: result.summary,
      score: result.score,
      grade: result.grade,
      passed: result.passed,
      warnings: result.warnings,
      errors: result.errors,
      createdAt: result.created_at,
    };
  }
}

export default new TestService();
