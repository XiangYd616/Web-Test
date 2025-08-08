/**
 * 压力测试引擎 - 前端
 * 提供压力测试、负载测试、性能监控功能
 */

export interface StressTestConfig {
  url: string;
  duration: number; // 测试持续时间（秒）
  concurrency: number; // 并发用户数
  rampUp?: number; // 爬坡时间（秒）
  requestsPerSecond?: number; // 每秒请求数
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  scenarios?: StressTestScenario[];
}

export interface StressTestScenario {
  name: string;
  weight: number; // 权重百分比
  steps: StressTestStep[];
}

export interface StressTestStep {
  name: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  thinkTime?: number; // 思考时间（毫秒）
  assertions?: StressTestAssertion[];
}

export interface StressTestAssertion {
  type: 'status' | 'response_time' | 'body_contains' | 'header_exists';
  value: any;
  operator?: 'equals' | 'less_than' | 'greater_than' | 'contains';
}

export interface StressTestResult {
  testId: string;
  config: StressTestConfig;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration: number;
  metrics: StressTestMetrics;
  errors: StressTestError[];
  summary: StressTestSummary;
  timeline: StressTestTimelinePoint[];
}

export interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // bytes/sec
  errorRate: number;
  concurrentUsers: number;
}

export interface StressTestError {
  timestamp: string;
  type: string;
  message: string;
  url: string;
  statusCode?: number;
  count: number;
}

export interface StressTestSummary {
  passed: boolean;
  score: number;
  bottlenecks: string[];
  recommendations: string[];
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface StressTestTimelinePoint {
  timestamp: string;
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
}

class StressTestEngine {
  private baseUrl = '/api/stress';
  private activeTests = new Map<string, StressTestResult>();

  /**
   * 启动压力测试
   */
  async startTest(config: StressTestConfig): Promise<{ testId: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '启动压力测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('启动压力测试失败:', error);
      throw error;
    }
  }

  /**
   * 停止压力测试
   */
  async stopTest(testId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${testId}/stop`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '停止压力测试失败');
      }

      this.activeTests.delete(testId);
    } catch (error) {
      console.error('停止压力测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string): Promise<StressTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/${testId}/status`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取测试状态失败');
      }

      const result = data.data;
      this.activeTests.set(testId, result);

      return result;
    } catch (error) {
      console.error('获取测试状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取实时指标
   */
  async getRealTimeMetrics(testId: string): Promise<StressTestMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/${testId}/metrics`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取实时指标失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取实时指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试历史
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
        throw new Error(data.error || '获取测试历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 比较测试结果
   */
  async compareTests(testId1: string, testId2: string) {
    try {
      const response = await fetch(`${this.baseUrl}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testId1, testId2 })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '比较测试结果失败');
      }

      return data.data;
    } catch (error) {
      console.error('比较测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 导出测试报告
   */
  async exportReport(testId: string, format: 'json' | 'html' | 'csv' = 'html'): Promise<string> {
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
      console.error('导出测试报告失败:', error);
      throw error;
    }
  }

  /**
   * 监控测试进度
   */
  monitorTest(
    testId: string,
    onUpdate: (metrics: StressTestMetrics) => void,
    onComplete: (result: StressTestResult) => void,
    onError: (error: string) => void,
    interval: number = 2000
  ): () => void {
    let isMonitoring = true;
    
    const monitor = async () => {
      if (!isMonitoring) return;

      try {
        const result = await this.getTestStatus(testId);
        
        if (result.status === 'running') {
          onUpdate(result.metrics);
          setTimeout(monitor, interval);
        } else if (result.status === 'completed') {
          onComplete(result);
          isMonitoring = false;
        } else if (result.status === 'failed') {
          onError('测试执行失败');
          isMonitoring = false;
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : '监控失败');
        isMonitoring = false;
      }
    };

    monitor();

    return () => {
      isMonitoring = false;
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config: StressTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (!config.duration || config.duration < 1) {
      errors.push('测试持续时间必须大于0秒');
    }

    if (config.duration > 3600) {
      errors.push('测试持续时间不能超过1小时');
    }

    if (!config.concurrency || config.concurrency < 1) {
      errors.push('并发用户数必须大于0');
    }

    if (config.concurrency > 1000) {
      errors.push('并发用户数不能超过1000');
    }

    if (config.rampUp && config.rampUp > config.duration) {
      errors.push('爬坡时间不能超过测试持续时间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): StressTestConfig {
    return {
      url: '',
      duration: 60,
      concurrency: 10,
      rampUp: 10,
      method: 'GET',
      headers: {
        'User-Agent': 'StressTest-Engine/1.0'
      }
    };
  }

  /**
   * 创建测试场景
   */
  createScenario(name: string, weight: number, steps: StressTestStep[]): StressTestScenario {
    return {
      name,
      weight,
      steps
    };
  }

  /**
   * 创建测试步骤
   */
  createStep(
    name: string,
    url: string,
    method: string = 'GET',
    options: {
      headers?: Record<string, string>;
      body?: any;
      thinkTime?: number;
      assertions?: StressTestAssertion[];
    } = {}
  ): StressTestStep {
    return {
      name,
      url,
      method,
      headers: options.headers,
      body: options.body,
      thinkTime: options.thinkTime || 1000,
      assertions: options.assertions || []
    };
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(metrics: StressTestMetrics): number {
    let score = 100;

    // 响应时间评分
    if (metrics.averageResponseTime > 2000) score -= 30;
    else if (metrics.averageResponseTime > 1000) score -= 15;
    else if (metrics.averageResponseTime > 500) score -= 5;

    // 错误率评分
    if (metrics.errorRate > 5) score -= 40;
    else if (metrics.errorRate > 1) score -= 20;
    else if (metrics.errorRate > 0.1) score -= 10;

    // P95响应时间评分
    if (metrics.p95ResponseTime > 5000) score -= 20;
    else if (metrics.p95ResponseTime > 3000) score -= 10;
    else if (metrics.p95ResponseTime > 2000) score -= 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 格式化测试结果
   */
  formatResults(result: StressTestResult): string {
    let report = `压力测试报告\n`;
    report += `测试ID: ${result.testId}\n`;
    report += `URL: ${result.config.url}\n`;
    report += `并发用户: ${result.config.concurrency}\n`;
    report += `测试时长: ${result.config.duration}秒\n`;
    report += `状态: ${this.getStatusText(result.status)}\n`;
    report += `性能评分: ${result.summary.score}/100 (${result.summary.performanceGrade})\n`;
    report += `开始时间: ${new Date(result.startTime).toLocaleString()}\n`;
    if (result.endTime) {
      report += `结束时间: ${new Date(result.endTime).toLocaleString()}\n`;
    }
    report += '\n';

    const metrics = result.metrics;
    report += `性能指标:\n`;
    report += `- 总请求数: ${metrics.totalRequests}\n`;
    report += `- 成功请求: ${metrics.successfulRequests}\n`;
    report += `- 失败请求: ${metrics.failedRequests}\n`;
    report += `- 错误率: ${metrics.errorRate.toFixed(2)}%\n`;
    report += `- 平均响应时间: ${metrics.averageResponseTime.toFixed(0)}ms\n`;
    report += `- P95响应时间: ${metrics.p95ResponseTime.toFixed(0)}ms\n`;
    report += `- P99响应时间: ${metrics.p99ResponseTime.toFixed(0)}ms\n`;
    report += `- 每秒请求数: ${metrics.requestsPerSecond.toFixed(1)}\n`;
    report += `- 吞吐量: ${(metrics.throughput / 1024).toFixed(2)} KB/s\n\n`;

    if (result.errors.length > 0) {
      report += `错误统计 (${result.errors.length}种):\n`;
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error.type}: ${error.message} (${error.count}次)\n`;
      });
      report += '\n';
    }

    if (result.summary.bottlenecks.length > 0) {
      report += `性能瓶颈:\n`;
      result.summary.bottlenecks.forEach((bottleneck, index) => {
        report += `${index + 1}. ${bottleneck}\n`;
      });
      report += '\n';
    }

    if (result.summary.recommendations.length > 0) {
      report += `优化建议:\n`;
      result.summary.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

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

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'running': '运行中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }
}

export const stressTestEngine = new StressTestEngine();
export default stressTestEngine;
