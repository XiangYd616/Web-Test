import { apiClient } from './api

export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'seo' | 'accessibility' | 'api
  configuration: {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    assertions?: Array<{
      type: string;
      condition: string;
      value: any;
    }>;
  };
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface TestExecution {
  id: string;
  testId: string;
  templateId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled
  progress: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
  logs?: string[];
  error?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    environment?: string;
  };
}

export interface TestSchedule {
  id: string;
  testId: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
  notifications?: {
    onSuccess: boolean;
    onFailure: boolean;
    emails: string[];
    webhooks: string[];
  };
}

export interface TestMetrics {
  totalTests: number;
  runningTests: number;
  completedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  successRate: number;
  testsToday: number;
  testsThisWeek: number;
  testsThisMonth: number;
  popularCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

class TestManagementService {
  // 测试模板管理
  async getTemplates(params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    templates: TestTemplate[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/test-templates', { params });
      return response.data;
    } catch (error) {
      console.error('获取测试模板失败:', error);
      throw new Error('获取测试模板失败');
    }
  }

  async createTemplate(template: Omit<TestTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<TestTemplate> {
    try {
      const response = await apiClient.post('/test-templates', template);
      return response.data;
    } catch (error) {
      console.error('创建测试模板失败:', error);
      throw new Error('创建测试模板失败');
    }
  }

  async updateTemplate(id: string, template: Partial<TestTemplate>): Promise<TestTemplate> {
    try {
      const response = await apiClient.put(`/test-templates/${id}`, template);
      return response.data;
    } catch (error) {
      console.error('更新测试模板失败:', error);
      throw new Error('更新测试模板失败');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await apiClient.delete(`/test-templates/${id}`);
    } catch (error) {
      console.error('删除测试模板失败:', error);
      throw new Error('删除测试模板失败');
    }
  }

  // 测试执行管理
  async executeTest(testConfig: any): Promise<TestExecution> {
    try {
      const response = await apiClient.post('/test-executions', testConfig);
      return response.data;
    } catch (error) {
      console.error('执行测试失败:', error);
      throw new Error('执行测试失败');
    }
  }

  async getExecution(id: string): Promise<TestExecution> {
    try {
      const response = await apiClient.get(`/test-executions/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取测试执行信息失败:', error);
      throw new Error('获取测试执行信息失败');
    }
  }

  async cancelExecution(id: string): Promise<void> {
    try {
      await apiClient.post(`/test-executions/${id}/cancel`);
    } catch (error) {
      console.error('取消测试执行失败:', error);
      throw new Error('取消测试执行失败');
    }
  }

  async getExecutions(params?: {
    status?: string;
    testId?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    executions: TestExecution[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/test-executions', { params });
      return response.data;
    } catch (error) {
      console.error('获取测试执行列表失败:', error);
      throw new Error('获取测试执行列表失败');
    }
  }

  // 测试调度管理
  async createSchedule(schedule: Omit<TestSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestSchedule> {
    try {
      const response = await apiClient.post('/test-schedules', schedule);
      return response.data;
    } catch (error) {
      console.error('创建测试调度失败:', error);
      throw new Error('创建测试调度失败');
    }
  }

  async updateSchedule(id: string, schedule: Partial<TestSchedule>): Promise<TestSchedule> {
    try {
      const response = await apiClient.put(`/test-schedules/${id}`, schedule);
      return response.data;
    } catch (error) {
      console.error('更新测试调度失败:', error);
      throw new Error('更新测试调度失败');
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      await apiClient.delete(`/test-schedules/${id}`);
    } catch (error) {
      console.error('删除测试调度失败:', error);
      throw new Error('删除测试调度失败');
    }
  }

  async getSchedules(params?: {
    isActive?: boolean;
    testId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    schedules: TestSchedule[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/test-schedules', { params });
      return response.data;
    } catch (error) {
      console.error('获取测试调度列表失败:', error);
      throw new Error('获取测试调度列表失败');
    }
  }

  // 测试指标和统计
  async getMetrics(timeRange?: '24h' | '7d' | '30d' | '90d'): Promise<TestMetrics> {
    try {
      const response = await apiClient.get('/test-metrics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('获取测试指标失败:', error);
      throw new Error('获取测试指标失败');
    }
  }

  async getTestTrends(params: {
    metric: 'count' | 'success_rate' | 'avg_duration
    timeRange: '24h' | '7d' | '30d' | '90d
    granularity: 'hour' | 'day' | 'week
  }): Promise<Array<{
    timestamp: string;
    value: number;
  }>> {
    try {
      const response = await apiClient.get('/test-trends', { params });
      return response.data;
    } catch (error) {
      console.error('获取测试趋势失败:', error);
      throw new Error('获取测试趋势失败');
    }
  }

  // 批量操作
  async batchExecute(testIds: string[]): Promise<TestExecution[]> {
    try {
      const response = await apiClient.post('/test-executions/batch', { testIds });
      return response.data;
    } catch (error) {
      console.error('批量执行测试失败:', error);
      throw new Error('批量执行测试失败');
    }
  }

  async batchCancel(executionIds: string[]): Promise<void> {
    try {
      await apiClient.post('/test-executions/batch-cancel', { executionIds });
    } catch (error) {
      console.error('批量取消测试失败:', error);
      throw new Error('批量取消测试失败');
    }
  }
}

export const testManagementService = new TestManagementService();
