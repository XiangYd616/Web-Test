/**
 * 测试业务服务层 (Service)
 * 职责: 包含业务逻辑,协调Repository和其他服务
 */

import testRepository from '../../repositories/testRepository';
import testBusinessService from './TestBusinessService';

interface TestResult {
  id: string;
  testId: string;
  userId: string;
  results: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestRecord {
  test_id: string;
  user_id: string;
  url: string;
  test_type: string;
  status: string;
  results?: unknown;
  overall_score?: number;
  duration?: number;
  created_at: Date;
  updated_at: Date;
  progress?: number;
  options?: Record<string, unknown> | string | null;
}

interface TestConfig {
  url: string;
  testType: string;
  options?: Record<string, unknown>;
}

type TestHistoryResponse = {
  tests: TestRecord[];
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

    const results = await testRepository.findResults(testId, userId);
    if (!results) {
      throw new Error('测试结果不存在');
    }

    return this.formatResults(results);
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
    const test = (await testRepository.findById(testId, userId)) as TestRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }
    return {
      id: test.test_id,
      userId: test.user_id,
      url: test.url,
      testType: test.test_type,
      status: test.status,
      results: test.results || null,
      createdAt: test.created_at,
      updatedAt: test.updated_at,
    };
  }

  /**
   * 取消测试
   */
  async cancelTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestRecord | null;
    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.status === 'completed') {
      throw new Error('测试已完成，无法取消');
    }

    await this.stopTestExecution(testId);
    await testRepository.updateStatus(testId, 'cancelled');
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
    const test = (await testRepository.findById(testId, userId)) as TestRecord | null;

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
      startTime: test.created_at,
      endTime: test.updated_at,
      results: test.results ?? null,
    };
  }

  /**
   * 停止测试
   */
  async stopTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestRecord | null;

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
    await this.stopTestExecution(testId);

    // 更新状态
    await testRepository.updateStatus(testId, 'stopped');
  }

  /**
   * 删除测试
   */
  async deleteTest(userId: string, testId: string): Promise<void> {
    const test = (await testRepository.findById(testId, userId)) as TestRecord | null;

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

    const tests = (await testRepository.findByUserId(userId, limit, offset)) as TestRecord[];
    const total = await testRepository.countByUserId(userId);

    return {
      tests: tests.map(test => ({
        id: test.test_id,
        url: test.url,
        testType: test.test_type,
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
   * 运行测试
   */
  private async runTest(testId: string, config: TestConfig): Promise<unknown> {
    // 根据测试类型调用不同的测试引擎
    switch (config.testType) {
      case 'website':
        return await testBusinessService.runWebsiteTest(testId, config);
      case 'seo':
        return await testBusinessService.runSEOTest(testId, config);
      case 'performance':
        return await testBusinessService.runPerformanceTest(testId, config);
      case 'accessibility':
        return await testBusinessService.runAccessibilityTest(testId, config);
      case 'security':
        return await testBusinessService.runSecurityTest(testId, config);
      case 'api':
        return await testBusinessService.runAPITest(testId, config);
      case 'stress':
        return await testBusinessService.runStressTest(testId, config);
      default:
        throw new Error(`不支持的测试类型: ${config.testType}`);
    }
  }

  /**
   * 停止测试执行
   */
  private async stopTestExecution(testId: string): Promise<void> {
    // 实现测试停止逻辑
    // 这里可能需要与测试引擎通信来停止正在运行的测试
    console.log(`停止测试执行: ${testId}`);
  }

  /**
   * 格式化测试结果
   */
  private formatResults(results: TestRecord): TestResult {
    return {
      id: results.test_id,
      testId: results.test_id,
      userId: results.user_id,
      results: results.results,
      status: results.status,
      createdAt: results.created_at,
      updatedAt: results.updated_at,
    };
  }
}

export default new TestService();
