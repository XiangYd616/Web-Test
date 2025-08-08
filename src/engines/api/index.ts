/**
 * API测试引擎 - 前端
 * 提供API接口测试、性能分析、文档验证功能
 */

export interface APITestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  validateResponse?: boolean;
  expectedStatus?: number;
  expectedSchema?: any;
}

export interface APITestResult {
  url: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  responseSize: number;
  headers: Record<string, string>;
  body: any;
  errors: APIError[];
  validations: APIValidation[];
  timestamp: string;
}

export interface APIError {
  type: string;
  message: string;
  details?: any;
}

export interface APIValidation {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

export interface APIBatchTestConfig {
  name: string;
  tests: APITestConfig[];
  parallel?: boolean;
  stopOnFailure?: boolean;
}

export interface APIBatchTestResult {
  name: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalTime: number;
  results: APITestResult[];
  summary: {
    successRate: number;
    averageResponseTime: number;
    totalRequests: number;
    totalErrors: number;
  };
}

class APITestEngine {
  private baseUrl = '/api/api-test';

  /**
   * 执行单个API测试
   */
  async runTest(config: APITestConfig): Promise<APITestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('API测试失败:', error);
      throw error;
    }
  }

  /**
   * 执行批量API测试
   */
  async runBatchTest(config: APIBatchTestConfig): Promise<APIBatchTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/batch-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '批量API测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('批量API测试失败:', error);
      throw error;
    }
  }

  /**
   * 验证API响应
   */
  async validateResponse(url: string, method: string, expectedSchema: any) {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, method, expectedSchema })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API响应验证失败');
      }

      return data.data;
    } catch (error) {
      console.error('API响应验证失败:', error);
      throw error;
    }
  }

  /**
   * 获取API性能指标
   */
  async getPerformanceMetrics(url: string, method: string = 'GET') {
    try {
      const params = new URLSearchParams({ url, method });
      const response = await fetch(`${this.baseUrl}/metrics?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取API性能指标失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取API性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 监控API健康状态
   */
  async monitorHealth(urls: string[], interval: number = 60000) {
    try {
      const response = await fetch(`${this.baseUrl}/monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls, interval })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API健康监控失败');
      }

      return data.data;
    } catch (error) {
      console.error('API健康监控失败:', error);
      throw error;
    }
  }

  /**
   * 获取API测试历史
   */
  async getHistory(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取API测试历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取API测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 导出API测试报告
   */
  async exportReport(testId: string, format: 'json' | 'html' | 'postman' = 'json'): Promise<string> {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`${this.baseUrl}/${testId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出API测试报告失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: APITestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (!config.method) {
      errors.push('HTTP方法是必需的');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (config.method && !validMethods.includes(config.method)) {
      errors.push('无效的HTTP方法');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
      errors.push('超时时间必须在1-60秒之间');
    }

    if (config.retries && (config.retries < 0 || config.retries > 5)) {
      errors.push('重试次数必须在0-5之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): APITestConfig {
    return {
      url: '',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      retries: 0,
      validateResponse: true,
      expectedStatus: 200
    };
  }

  /**
   * 创建测试集合
   */
  createTestCollection(name: string, tests: APITestConfig[]): APIBatchTestConfig {
    return {
      name,
      tests,
      parallel: false,
      stopOnFailure: false
    };
  }

  /**
   * 格式化测试结果
   */
  formatResults(result: APITestResult): string {
    let report = `API测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `方法: ${result.method}\n`;
    report += `状态: ${result.success ? '成功' : '失败'}\n`;
    report += `HTTP状态码: ${result.status}\n`;
    report += `响应时间: ${result.responseTime}ms\n`;
    report += `响应大小: ${result.responseSize} bytes\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    if (result.headers && Object.keys(result.headers).length > 0) {
      report += `响应头:\n`;
      Object.entries(result.headers).forEach(([key, value]) => {
        report += `- ${key}: ${value}\n`;
      });
      report += '\n';
    }

    if (result.errors.length > 0) {
      report += `错误 (${result.errors.length}个):\n`;
      result.errors.forEach((error, index) => {
        report += `${index + 1}. [${error.type}] ${error.message}\n`;
        if (error.details) {
          report += `   详情: ${JSON.stringify(error.details)}\n`;
        }
      });
      report += '\n';
    }

    if (result.validations.length > 0) {
      report += `验证结果 (${result.validations.length}个):\n`;
      result.validations.forEach((validation, index) => {
        const status = validation.passed ? '✓' : '✗';
        report += `${index + 1}. ${status} [${validation.type}] ${validation.message}\n`;
        if (!validation.passed && validation.expected && validation.actual) {
          report += `   期望: ${JSON.stringify(validation.expected)}\n`;
          report += `   实际: ${JSON.stringify(validation.actual)}\n`;
        }
      });
    }

    return report;
  }

  /**
   * 格式化批量测试结果
   */
  formatBatchResults(result: APIBatchTestResult): string {
    let report = `API批量测试报告\n`;
    report += `测试集合: ${result.name}\n`;
    report += `总测试数: ${result.totalTests}\n`;
    report += `通过: ${result.passedTests}\n`;
    report += `失败: ${result.failedTests}\n`;
    report += `成功率: ${result.summary.successRate.toFixed(1)}%\n`;
    report += `总耗时: ${result.totalTime}ms\n`;
    report += `平均响应时间: ${result.summary.averageResponseTime.toFixed(1)}ms\n\n`;

    report += `详细结果:\n`;
    result.results.forEach((testResult, index) => {
      const status = testResult.success ? '✓' : '✗';
      report += `${index + 1}. ${status} ${testResult.method} ${testResult.url} (${testResult.responseTime}ms)\n`;
      if (!testResult.success && testResult.errors.length > 0) {
        report += `   错误: ${testResult.errors[0].message}\n`;
      }
    });

    return report;
  }

  /**
   * 私有辅助方法
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export const apiTestEngine = new APITestEngine();
export default apiTestEngine;
