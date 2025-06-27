/**
 * 测试API服务 - 处理各种测试相关的API调用
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface TestConfig {
  url: string;
  [key: string]: any;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class TestAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<TestResult> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误',
      };
    }
  }

  // 网站综合测试
  async runWebsiteTest(config: TestConfig): Promise<TestResult> {
    return this.request('/test/website', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // 压力测试
  async runPerformanceTest(config: {
    url: string;
    vus: number;
    duration: string;
    testType?: string;
  }): Promise<TestResult> {
    return this.request('/test/stress/run', {
      method: 'POST',
      body: JSON.stringify({
        url: config.url,
        users: config.vus,
        duration: parseInt(config.duration.replace('s', '')),
        testType: config.testType,
      }),
    });
  }

  // 内容测试
  async runContentTest(config: TestConfig): Promise<TestResult> {
    return this.request('/test/content/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // 安全测试
  async runSecurityTest(config: TestConfig): Promise<TestResult> {
    return this.request('/test/security/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // API测试
  async runAPITest(config: TestConfig): Promise<TestResult> {
    return this.request('/test/api/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // 兼容性测试
  async runCompatibilityTest(config: TestConfig): Promise<TestResult> {
    return this.request('/test/compatibility/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // 获取测试结果
  async getTestResult(testId: string): Promise<TestResult> {
    return this.request(`/test/result/${testId}`);
  }

  // 获取测试历史
  async getTestHistory(params?: {
    page?: number;
    limit?: number;
    testType?: string;
    status?: string;
  }): Promise<TestResult> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/tests/history${queryString ? `?${queryString}` : ''}`);
  }

  // 获取测试引擎状态
  async getTestEngineStatus(engine: string): Promise<TestResult> {
    return this.request(`/test-engines/${engine}/status`);
  }

  // 获取所有测试引擎状态
  async getAllTestEnginesStatus(): Promise<TestResult> {
    // 只检查已实现的测试引擎
    const engines = ['k6', 'lighthouse', 'playwright'];
    const results = await Promise.all(
      engines.map(engine => this.getTestEngineStatus(engine))
    );

    const status: Record<string, any> = {};
    engines.forEach((engine, index) => {
      status[engine] = results[index].success ? results[index].data : { available: false };
    });

    // 添加未实现的引擎状态（避免404错误）
    status.zap = { available: false, reason: 'Not implemented yet' };
    status.nuclei = { available: false, reason: 'Not implemented yet' };

    return {
      success: true,
      data: status,
    };
  }

  // 检查引擎状态（用于高级测试引擎）
  async checkEngineStatus(): Promise<TestResult> {
    try {
      const result = await this.getAllTestEnginesStatus();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查引擎状态失败',
        data: {
          lighthouse: false,
          playwright: false,
          k6: false,
          zap: false,
          nuclei: false
        }
      };
    }
  }

  // 导出测试结果（用于高级测试引擎）
  async exportTestResults(testId: string, format: 'json' | 'csv' | 'pdf' | 'html'): Promise<TestResult> {
    return this.exportTestReport(testId, format as any);
  }

  // 获取分析数据
  async getAnalytics(params?: {
    timeRange?: string;
    testType?: string;
  }): Promise<TestResult> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.request(`/tests/analytics${queryString ? `?${queryString}` : ''}`);
  }

  // 导出测试报告
  async exportTestReport(testId: string, format: 'pdf' | 'html' | 'json' = 'pdf'): Promise<TestResult> {
    return this.request(`/tests/export/${testId}?format=${format}`);
  }

  // 删除测试记录
  async deleteTestRecord(testId: string): Promise<TestResult> {
    return this.request(`/tests/${testId}`, {
      method: 'DELETE',
    });
  }

  // 批量删除测试记录
  async batchDeleteTestRecords(testIds: string[]): Promise<TestResult> {
    return this.request('/tests/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ testIds }),
    });
  }

  // 获取测试统计信息
  async getTestStatistics(): Promise<TestResult> {
    return this.request('/tests/statistics');
  }

  // 获取系统健康状态
  async getSystemHealth(): Promise<TestResult> {
    return this.request('/health');
  }

  // 获取API信息
  async getAPIInfo(): Promise<TestResult> {
    return this.request('/info');
  }

  // 测试连接
  async testConnection(url: string): Promise<TestResult> {
    return this.request('/tests/connection', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // 获取网站基本信息
  async getWebsiteInfo(url: string): Promise<TestResult> {
    return this.request('/tests/website-info', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // 预检查网站
  async precheckWebsite(url: string): Promise<TestResult> {
    return this.request('/test/precheck', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // 取消测试
  async cancelTest(testId: string): Promise<TestResult> {
    return this.request(`/test/${testId}/cancel`, {
      method: 'POST',
    });
  }

  // 重新运行测试
  async retryTest(testId: string): Promise<TestResult> {
    return this.request(`/test/${testId}/retry`, {
      method: 'POST',
    });
  }

  // 获取测试模板
  async getTestTemplates(testType?: string): Promise<TestResult> {
    const queryString = testType ? `?testType=${testType}` : '';
    return this.request(`/test/templates${queryString}`);
  }

  // 保存测试模板
  async saveTestTemplate(template: {
    name: string;
    description: string;
    testType: string;
    config: any;
  }): Promise<TestResult> {
    return this.request('/tests/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  // 删除测试模板
  async deleteTestTemplate(templateId: string): Promise<TestResult> {
    return this.request(`/tests/templates/${templateId}`, {
      method: 'DELETE',
    });
  }
}

// 创建单例实例
export const testAPI = new TestAPI();

// 导出类型
export type { TestConfig, TestResult };

// 默认导出
export default TestAPI;
