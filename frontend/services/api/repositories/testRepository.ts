/**
 * 测试Repository
 * 统一的测试相关API调用
 */

import { apiClient } from '../client';

export interface TestConfig {
  testType: string;
  target: string;
  options?: Record<string, unknown>;
  workspaceId?: string;
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
      workspaceId: config.workspaceId,
    });
    return response;
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string, workspaceId?: string): Promise<TestExecution> {
    return apiClient.get<TestExecution>(
      `${this.basePath}/history/${testId}`,
      workspaceId ? { workspaceId } : undefined
    );
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string, workspaceId?: string): Promise<unknown> {
    return apiClient.get(
      `${this.basePath}/history/${testId}`,
      workspaceId ? { workspaceId } : undefined
    );
  }

  /**
   * 停止测试
   */
  async stopTest(testId: string, workspaceId?: string): Promise<void> {
    await apiClient.post(`${this.basePath}/${testId}/stop`, undefined, {
      params: workspaceId ? { workspaceId } : undefined,
    });
  }

  /**
   * 取消测试
   */
  async cancelTest(testId: string, workspaceId?: string): Promise<void> {
    await apiClient.post(`${this.basePath}/${testId}/cancel`, undefined, {
      params: workspaceId ? { workspaceId } : undefined,
    });
  }

  /**
   * 删除测试
   */
  async deleteTest(testId: string, workspaceId?: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/history/${testId}`, {
      params: workspaceId ? { workspaceId } : undefined,
    });
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(params?: {
    page?: number;
    limit?: number;
    testType?: string;
    status?: string;
    workspaceId?: string;
  }): Promise<TestHistory> {
    return apiClient.get<TestHistory>(`${this.basePath}/history`, params);
  }

  /**
   * 获取测试统计
   */
  async getTestStatistics(timeRange?: string, workspaceId?: string): Promise<unknown> {
    const params = timeRange || workspaceId ? { timeRange, workspaceId } : undefined;
    return apiClient.get(`${this.basePath}/statistics`, params);
  }

  /**
   * 导出测试结果
   */
  async exportTestResult(
    testId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    workspaceId?: string
  ): Promise<unknown> {
    return apiClient.get(`${this.basePath}/${testId}/export`, {
      format,
      workspaceId,
    });
  }

  /**
   * 生成测试报告
   */
  async generateReport(testId: string, workspaceId?: string): Promise<unknown> {
    return apiClient.get(
      `${this.basePath}/${testId}/report`,
      workspaceId ? { workspaceId } : undefined
    );
  }

  /**
   * 分享测试结果
   */
  async shareTestResult(
    testId: string,
    options?: { email?: string; public?: boolean; workspaceId?: string }
  ): Promise<{ shareUrl: string }> {
    return apiClient.post<{ shareUrl: string }>(`${this.basePath}/${testId}/share`, options, {
      params: options?.workspaceId ? { workspaceId: options.workspaceId } : undefined,
    });
  }

  /**
   * 特定类型的测试方法
   */

  // 性能测试
  async executePerformanceTest(
    url: string,
    config?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/performance`, {
      url,
      ...config,
      workspaceId,
    });
  }

  // 安全测试
  async executeSecurityTest(
    url: string,
    config?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/security`, {
      url,
      ...config,
      workspaceId,
    });
  }

  // SEO测试
  async executeSeoTest(
    url: string,
    config?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/seo`, {
      url,
      ...config,
      workspaceId,
    });
  }

  // 压力测试
  async executeStressTest(
    url: string,
    config?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/stress`, {
      url,
      ...config,
      workspaceId,
    });
  }

  // 兼容性测试
  async executeCompatibilityTest(
    url: string,
    config?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/compatibility`, {
      url,
      ...config,
      workspaceId,
    });
  }

  // API测试
  async executeApiTest(
    config: Record<string, unknown>,
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/api-test`, {
      ...config,
      workspaceId,
    });
  }

  // 无障碍测试
  async executeAccessibilityTest(
    url: string,
    level: 'A' | 'AA' | 'AAA' = 'AA',
    workspaceId?: string
  ): Promise<TestExecution> {
    return apiClient.post<TestExecution>(`${this.basePath}/accessibility`, {
      url,
      level,
      workspaceId,
    });
  }
}

// 导出单例
export const testRepository = new TestRepository();
export default testRepository;
