/**
 * 测试Repository
 * 统一的测试相关API调用
 */

import { apiClient } from '../client';

export interface TestConfig {
  testType: string;
  target: string;
  options?: Record<string, unknown>;
}

export interface TestExecution {
  id: string;
  testType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  results?: unknown;
  error?: string;
}

export interface TestHistory {
  tests: TestExecution[];
  total: number;
  page: number;
  pageSize: number;
}

export class TestRepository {
  private readonly basePath = '/api/test';

  /**
   * 执行测试
   */
  async executeTest(config: TestConfig): Promise<TestExecution> {
    const response = await apiClient.post<TestExecution>(`${this.basePath}/run`, {
      testType: config.testType,
      url: config.target,
      config: config.options,
    });
    return response;
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string): Promise<TestExecution> {
    return apiClient.get<TestExecution>(`${this.basePath}/history/${testId}`);
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<unknown> {
    return apiClient.get(`${this.basePath}/history/${testId}`);
  }

  /**
   * 停止测试
   */
  async stopTest(testId: string): Promise<void> {
    await apiClient.post(`${this.basePath}/${testId}/stop`);
  }

  /**
   * 取消测试
   */
  async cancelTest(testId: string): Promise<void> {
    await apiClient.post(`${this.basePath}/${testId}/cancel`);
  }

  /**
   * 删除测试
   */
  async deleteTest(testId: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/history/${testId}`);
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(params?: {
    page?: number;
    limit?: number;
    testType?: string;
    status?: string;
  }): Promise<TestHistory> {
    return apiClient.get<TestHistory>(`${this.basePath}/history`, params);
  }

  /**
   * 获取测试统计
   */
  async getTestStatistics(timeRange?: string): Promise<unknown> {
    const params = timeRange ? { timeRange } : undefined;
    return apiClient.get(`${this.basePath}/statistics`, params);
  }

  /**
   * 导出测试结果
   */
  async exportTestResult(
    testId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<unknown> {
    return apiClient.get(`${this.basePath}/${testId}/export`, { format });
  }

  /**
   * 生成测试报告
   */
  async generateReport(testId: string): Promise<unknown> {
    return apiClient.get(`${this.basePath}/${testId}/report`);
  }

  /**
   * 分享测试结果
   */
  async shareTestResult(
    testId: string,
    options?: { email?: string; public?: boolean }
  ): Promise<{ shareUrl: string }> {
    return apiClient.post<{ shareUrl: string }>(`${this.basePath}/${testId}/share`, options);
  }

  /**
   * 特定类型的测试方法
   */

  // 性能测试
  async executePerformanceTest(
    url: string,
    config?: Record<string, unknown>
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/performance`, {
      url,
      ...config,
    });
  }

  // 安全测试
  async executeSecurityTest(url: string, config?: Record<string, unknown>): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/security`, {
      url,
      ...config,
    });
  }

  // SEO测试
  async executeSeoTest(url: string, config?: Record<string, unknown>): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/seo`, {
      url,
      ...config,
    });
  }

  // 压力测试
  async executeStressTest(url: string, config?: Record<string, unknown>): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/stress`, {
      url,
      ...config,
    });
  }

  // 兼容性测试
  async executeCompatibilityTest(
    url: string,
    config?: Record<string, unknown>
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/compatibility`, {
      url,
      ...config,
    });
  }

  // API测试
  async executeApiTest(config: Record<string, unknown>): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/api-test`, config);
  }

  // 无障碍测试
  async executeAccessibilityTest(
    url: string,
    level: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/accessibility`, {
      url,
      level,
    });
  }
}

// 导出单例
export const testRepository = new TestRepository();
export default testRepository;
