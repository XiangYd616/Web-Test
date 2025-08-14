import { apiService } from './apiService';

export interface TestHistoryItem {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'completed' | 'failed' | 'running';
  score?: number;
  duration: number;
  createdAt: string;
  config: any;
  results: any;
  tags?: string[];
  notes?: string;
}

export interface TestHistoryQuery {
  testType?: string;
  status?: string;
  dateRange?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TestHistoryResponse {
  data: TestHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class HistoryService {
  private baseUrl = '/api/test/history';

  /**
   * 获取测试历史列表
   */
  async getTestHistory(query: TestHistoryQuery = {}): Promise<TestHistoryResponse> {
    try {
      const params = new URLSearchParams();

      if (query.testType) params.append('type', query.testType);
      if (query.status) params.append('status', query.status);
      if (query.dateRange) params.append('dateRange', query.dateRange);
      if (query.search) params.append('search', query.search);
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await apiService.get(`${this.baseUrl}?${params.toString()}`);

      return {
        data: response.data?.tests || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      console.error('获取测试历史失败:', error);
      throw new Error('获取测试历史失败');
    }
  }

  /**
   * 获取详细测试历史
   */
  async getDetailedTestHistory(testType: string, query: TestHistoryQuery = {}): Promise<TestHistoryResponse> {
    try {
      const params = new URLSearchParams();
      params.append('testType', testType);

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await apiService.get(`${this.baseUrl}/detailed?${params.toString()}`);

      return {
        data: response.data?.tests || [],
        pagination: response.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      console.error('获取详细测试历史失败:', error);
      throw new Error('获取详细测试历史失败');
    }
  }

  /**
   * 获取单个测试记录详情
   */
  async getTestRecord(testId: string): Promise<TestHistoryItem> {
    try {
      const response = await apiService.get(`${this.baseUrl}/${testId}`);
      return response.data;
    } catch (error) {
      console.error('获取测试记录失败:', error);
      throw new Error('获取测试记录失败');
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTest(testId: string): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/${testId}`);
    } catch (error) {
      console.error('删除测试记录失败:', error);
      throw new Error('删除测试记录失败');
    }
  }

  /**
   * 批量删除测试记录
   */
  async deleteTests(testIds: string[]): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/batch-delete`, { testIds });
    } catch (error) {
      console.error('批量删除测试记录失败:', error);
      throw new Error('批量删除测试记录失败');
    }
  }

  /**
   * 导出测试记录
   */
  async exportTests(tests: TestHistoryItem[]): Promise<void> {
    try {
      const response = await apiService.post(`${this.baseUrl}/export`, { tests }, {
        responseType: 'blob'
      });

      // 创建下载链接
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出测试记录失败:', error);
      throw new Error('导出测试记录失败');
    }
  }

  /**
   * 重新运行测试
   */
  async rerunTest(test: TestHistoryItem): Promise<string> {
    try {
      const response = await apiService.post('/api/test/run', {
        testType: test.testType,
        url: test.url,
        config: test.config,
        testName: `${test.testName} (重新运行)`
      });

      return response.data.testId;
    } catch (error) {
      console.error('重新运行测试失败:', error);
      throw new Error('重新运行测试失败');
    }
  }

  /**
   * 比较测试结果
   */
  async compareTests(testIds: string[]): Promise<any> {
    try {
      const response = await apiService.post(`${this.baseUrl}/compare`, { testIds });
      return response.data;
    } catch (error) {
      console.error('比较测试结果失败:', error);
      throw new Error('比较测试结果失败');
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStats(testType?: string, dateRange?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (testType) params.append('testType', testType);
      if (dateRange) params.append('dateRange', dateRange);

      const response = await apiService.get(`${this.baseUrl}/stats?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('获取测试统计失败:', error);
      throw new Error('获取测试统计失败');
    }
  }
}

export const historyService = new HistoryService();
export default historyService;
