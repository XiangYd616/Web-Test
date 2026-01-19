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
  results: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestConfig {
  url: string;
  testType: string;
  options?: Record<string, any>;
}

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
   * 创建并启动测试
   */
  async createAndStart(config: TestConfig, user: User): Promise<any> {
    try {
      // 验证配置
      this.validateTestConfig(config);

      // 创建测试记录
      const test = await testRepository.create({
        userId: user.userId,
        url: config.url,
        testType: config.testType,
        options: config.options || {},
        status: 'pending',
        createdAt: new Date(),
      });

      // 启动测试
      const testResult = await this.runTest(test.id, config);

      // 更新测试状态
      await testRepository.updateStatus(test.id, 'running');

      return {
        testId: test.id,
        status: 'running',
        config: config,
        startTime: new Date(),
      };
    } catch (error) {
      throw new Error(`创建测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取测试状态
   */
  async getStatus(userId: string, testId: string): Promise<any> {
    const test = await testRepository.findById(testId);

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.userId !== userId) {
      throw new Error('无权访问此测试');
    }

    return {
      testId: test.id,
      status: test.status,
      progress: test.progress || 0,
      startTime: test.createdAt,
      endTime: test.updatedAt,
      results: test.results || null,
    };
  }

  /**
   * 停止测试
   */
  async stopTest(userId: string, testId: string): Promise<void> {
    const test = await testRepository.findById(testId);

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.userId !== userId) {
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
    const test = await testRepository.findById(testId);

    if (!test) {
      throw new Error('测试不存在');
    }

    if (test.userId !== userId) {
      throw new Error('无权访问此测试');
    }

    // 删除测试相关数据
    await testRepository.delete(testId);
  }

  /**
   * 获取测试列表
   */
  async getTestList(userId: string, page = 1, limit = 10): Promise<any> {
    const offset = (page - 1) * limit;

    const tests = await testRepository.findByUserId(userId, limit, offset);
    const total = await testRepository.countByUserId(userId);

    return {
      tests: tests.map(test => ({
        id: test.id,
        url: test.url,
        testType: test.testType,
        status: test.status,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
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
  private async runTest(testId: string, config: TestConfig): Promise<any> {
    // 根据测试类型调用不同的测试引擎
    switch (config.testType) {
      case 'seo':
        return await testBusinessService.runSEOTest(testId, config);
      case 'performance':
        return await testBusinessService.runPerformanceTest(testId, config);
      case 'accessibility':
        return await testBusinessService.runAccessibilityTest(testId, config);
      case 'security':
        return await testBusinessService.runSecurityTest(testId, config);
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
  private formatResults(results: any): TestResult {
    return {
      id: results.id,
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
