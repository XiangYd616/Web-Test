/**
 * 测试数据访问层
 * 封装所有测试相关的API调用
 */

import { apiClient } from '../api/client';

/**
 * 测试配置接口
 */
export interface TestConfig {
  url: string;
  testType?: string;
  concurrent?: number;
  duration?: number;
  rampUpTime?: number;
  timeout?: number;
  thinkTime?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  assertions?: any[];
  scenarios?: any;
  metadata?: Record<string, any>;
  options?: Record<string, any>;
}

/**
 * 测试结果接口
 */
export interface TestResult {
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 测试列表查询参数
 */
export interface TestQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  testType?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 测试Repository类
 */
export class TestRepository {
  private readonly basePath = '/test';

  /**
   * 获取测试列表
   */
  async getAll(params?: TestQueryParams): Promise<TestResult[]> {
    return apiClient.get<TestResult[]>(this.basePath, { params });
  }

  /**
   * 获取单个测试
   */
  async getById(id: string): Promise<TestResult> {
    return apiClient.get<TestResult>(`${this.basePath}/${id}`);
  }

  /**
   * 创建测试
   */
  async create(config: TestConfig): Promise<TestResult> {
    return apiClient.post<TestResult>(this.basePath, config);
  }

  /**
   * 创建并启动测试(新架构统一入口)
   * 注意: 后端会处理所有验证逻辑
   */
  async createAndStart(config: TestConfig): Promise<TestResult> {
    return apiClient.post<TestResult>(`${this.basePath}/create-and-start`, config);
  }

  /**
   * 更新测试
   */
  async update(id: string, data: Partial<TestResult>): Promise<TestResult> {
    return apiClient.put<TestResult>(`${this.basePath}/${id}`, data);
  }

  /**
   * 删除测试
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * 批量删除测试
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    return apiClient.post<void>(`${this.basePath}/batch-delete`, { ids });
  }

  /**
   * 获取测试结果
   */
  async getResults(testId: string): Promise<any> {
    return apiClient.get<any>(`${this.basePath}/${testId}/results`);
  }

  /**
   * 启动测试
   */
  async start(testId: string): Promise<TestResult> {
    return apiClient.post<TestResult>(`${this.basePath}/${testId}/start`);
  }

  /**
   * 停止测试
   */
  async stop(testId: string): Promise<TestResult> {
    return apiClient.post<TestResult>(`${this.basePath}/${testId}/stop`);
  }

  /**
   * 重试测试
   */
  async retry(testId: string): Promise<TestResult> {
    return apiClient.post<TestResult>(`${this.basePath}/${testId}/retry`);
  }

  /**
   * 获取测试统计
   */
  async getStats(params?: { startDate?: string; endDate?: string }): Promise<any> {
    return apiClient.get<any>(`${this.basePath}/stats`, { params });
  }

  /**
   * 导出测试结果
   */
  async export(testIds: string[], format: 'json' | 'csv' | 'excel' = 'json'): Promise<Blob> {
    const response = await apiClient.getInstance().post(
      `${this.basePath}/export`,
      { testIds, format },
      { responseType: 'blob' }
    );
    return response.data;
  }
}

/**
 * 导出单例
 */
export const testRepository = new TestRepository();

/**
 * 默认导出
 */
export default testRepository;
