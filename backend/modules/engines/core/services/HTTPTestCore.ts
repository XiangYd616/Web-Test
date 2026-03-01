/**
 * 🌐 HTTP测试核心服务
 * 统一所有HTTP相关测试功能，消除重复代码
 * 支持API测试、压力测试、网络测试等
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { performance } from 'perf_hooks';

interface APIEndpoint {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  expectedStatus?: number;
  expectedHeaders?: Record<string, string>;
  expectedBody?: unknown;
}

interface TestConfig {
  concurrency?: number;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  validateSSL?: boolean;
  userAgent?: string;
  maxRedirects?: number;
}

interface TestResult {
  endpoint: APIEndpoint;
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
  size: number;
  error?: string;
  retries: number;
  validation: {
    statusValid: boolean;
    headersValid: boolean;
    bodyValid: boolean;
    issues: string[];
  };
}

interface BatchTestResult {
  total: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalSize: number;
  results: TestResult[];
  errors: Array<{
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
  summary: {
    successRate: number;
    averageSpeed: string;
    totalErrors: number;
    criticalErrors: number;
  };
}

interface StressTestConfig extends TestConfig {
  duration: number; // 测试持续时间(秒)
  rampUpTime?: number; // 逐步增加时间(秒)
  targetRPS?: number; // 目标每秒请求数
  maxConcurrent?: number; // 最大并发数
  thinkTime?: number; // 请求间隔时间(毫秒)
  testId?: string;
}

interface StressTestResult {
  testId: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageRPS: number;
  peakRPS: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errors: Array<{
    type: string;
    count: number;
    percentage: number;
    samples: Array<{
      timestamp: Date;
      error: string;
      endpoint: string;
    }>;
  }>;
  performance: {
    throughput: number;
    latency: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
}

interface RequestHistory {
  id: string;
  endpoint: string;
  method: string;
  url: string;
  status: number;
  responseTime: number;
  timestamp: Date;
  size: number;
  success: boolean;
  error?: string;
}

class HTTPTestCore {
  private activeRequests: Map<string, AbortController>;
  private requestHistory: RequestHistory[];
  private maxHistorySize: number;

  constructor() {
    this.activeRequests = new Map();
    this.requestHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * 测试API端点 - 统一实现
   * 消除在API测试、压力测试等工具中的重复实现
   */
  async testAPIEndpoints(
    endpoints: APIEndpoint[],
    config: TestConfig = {}
  ): Promise<BatchTestResult> {
    const results: TestResult[] = [];
    const concurrency = config.concurrency || 5;

    // 分批并发测试
    for (let i = 0; i < endpoints.length; i += concurrency) {
      const batch = endpoints.slice(i, i + concurrency);
      const batchPromises = batch.map(endpoint => this.testSingleEndpoint(endpoint, config));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        // 记录批次错误
        console.error(`批次测试失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.analyzeBatchResults(results);
  }

  /**
   * 测试单个端点
   */
  private async testSingleEndpoint(
    endpoint: APIEndpoint,
    config: TestConfig = {}
  ): Promise<TestResult> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    const abortController = new AbortController();

    let response: AxiosResponse | null = null;
    let retries = 0;

    this.activeRequests.set(requestId, abortController);

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: endpoint.method,
        url: endpoint.url,
        headers: {
          'User-Agent': config.userAgent || 'HTTPTestCore/1.0',
          ...endpoint.headers,
          ...config.headers,
        },
        timeout: config.timeout || 30000,
        maxRedirects: config.maxRedirects || 5,
        validateStatus: () => true,
        signal: abortController.signal,
      };

      // 添加请求体
      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        axiosConfig.data = endpoint.body;
      }

      const maxRetries = config.retries || 0;

      // 重试逻辑
      while (retries <= maxRetries) {
        try {
          response = await axios(axiosConfig);
          break;
        } catch (error) {
          retries++;
          if (retries > maxRetries) {
            throw error;
          }
          // 指数退避重试
          await this.delay(Math.pow(2, retries) * 1000);
        }
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // 验证响应
      if (!response) {
        throw new Error('No response received');
      }

      const validation = this.validateResponse(response, endpoint);

      const result: TestResult = {
        endpoint,
        success: validation.statusValid && validation.headersValid && validation.bodyValid,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: response.data,
        responseTime,
        size: this.calculateResponseSize(response),
        retries,
        validation,
      };

      // 添加到历史记录
      this.addToHistory({
        id: requestId,
        endpoint: endpoint.url,
        method: endpoint.method,
        url: endpoint.url,
        status: result.status,
        responseTime,
        timestamp: new Date(),
        size: result.size,
        success: result.success,
        error: result.success ? undefined : 'Validation failed',
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result: TestResult = {
        endpoint,
        success: false,
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        responseTime,
        size: 0,
        retries,
        validation: {
          statusValid: false,
          headersValid: false,
          bodyValid: false,
          issues: [error instanceof Error ? error.message : String(error)],
        },
        error: error instanceof Error ? error.message : String(error),
      };

      // 添加失败记录到历史
      this.addToHistory({
        id: requestId,
        endpoint: endpoint.url,
        method: endpoint.method,
        url: endpoint.url,
        status: 0,
        responseTime,
        timestamp: new Date(),
        size: 0,
        success: false,
        error: result.error,
      });

      return result;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * 压力测试
   */
  async stressTest(endpoints: APIEndpoint[], config: StressTestConfig): Promise<StressTestResult> {
    const testId =
      typeof config.testId === 'string' && config.testId.trim().length > 0
        ? config.testId
        : this.generateRequestId();
    const startTime = Date.now();
    const duration = config.duration * 1000; // 转换为毫秒
    const targetRPS = config.targetRPS || 10;
    const maxConcurrent = config.maxConcurrent || 100;
    const thinkTime = config.thinkTime || 0;

    const results: TestResult[] = [];
    const errors: Array<{
      type: string;
      count: number;
      percentage: number;
      samples: Array<{
        timestamp: Date;
        error: string;
        endpoint: string;
      }>;
    }> = [];

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let currentRPS = 0;
    let peakRPS = 0;

    const endTime = startTime + duration;
    const intervalTime = 1000 / targetRPS; // 每个请求的间隔时间

    // 压力测试主循环
    while (Date.now() < endTime) {
      const promises: Promise<TestResult>[] = [];
      const currentBatchSize = Math.min(
        maxConcurrent,
        Math.ceil(targetRPS / (1000 / intervalTime))
      );

      // 创建请求批次
      for (let i = 0; i < currentBatchSize; i++) {
        const endpoint = endpoints[i % endpoints.length];
        promises.push(this.testSingleEndpoint(endpoint, config));
      }

      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        // 统计结果
        batchResults.forEach(result => {
          totalRequests++;
          if (result.success) {
            successfulRequests++;
          } else {
            failedRequests++;

            // 错误分类
            const errorType = this.categorizeError(result.error || 'Unknown error');
            const existingError = errors.find(e => e.type === errorType);

            if (existingError) {
              existingError.count++;
              existingError.samples.push({
                timestamp: new Date(),
                error: result.error || '',
                endpoint: result.endpoint.url,
              });
            } else {
              errors.push({
                type: errorType,
                count: 1,
                percentage: 0,
                samples: [
                  {
                    timestamp: new Date(),
                    error: result.error || '',
                    endpoint: result.endpoint.url,
                  },
                ],
              });
            }
          }
        });

        // 计算当前RPS
        currentRPS = currentBatchSize / (intervalTime / 1000);
        peakRPS = Math.max(peakRPS, currentRPS);

        // 思考时间
        if (thinkTime > 0) {
          await this.delay(thinkTime);
        }
      } catch (error) {
        console.error(
          `压力测试批次失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // 控制请求频率
      if (intervalTime > 0) {
        await this.delay(intervalTime);
      }
    }

    // 计算错误百分比
    errors.forEach(error => {
      error.percentage = (error.count / totalRequests) * 100;
    });

    // 计算性能指标
    const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const performance = this.calculatePerformanceMetrics(responseTimes);

    const stressResult: StressTestResult = {
      testId,
      duration: config.duration,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageRPS: totalRequests / config.duration,
      peakRPS,
      averageResponseTime:
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      errors,
      performance,
    };

    return stressResult;
  }

  /**
   * 网络连通性测试
   */
  async testConnectivity(urls: string[], config: TestConfig = {}): Promise<BatchTestResult> {
    const endpoints: APIEndpoint[] = urls.map(url => ({
      url,
      method: 'GET',
      timeout: config.timeout || 10000,
    }));

    return this.testAPIEndpoints(endpoints, config);
  }

  /**
   * 健康检查
   */
  async healthCheck(endpoint: APIEndpoint, config: TestConfig = {}): Promise<TestResult> {
    return this.testSingleEndpoint(endpoint, config);
  }

  /**
   * 取消所有活动请求
   */
  cancelAllRequests(): void {
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
      this.activeRequests.delete(id);
    }
  }

  /**
   * 获取活动请求数量
   */
  getActiveRequestsCount(): number {
    return this.activeRequests.size;
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(
    options: {
      limit?: number;
      endpoint?: string;
      method?: string;
      status?: number;
      since?: Date;
    } = {}
  ): RequestHistory[] {
    let history = [...this.requestHistory];

    // 过滤条件
    const endpointFilter = options.endpoint;
    if (endpointFilter) {
      history = history.filter(h => h.endpoint.includes(endpointFilter));
    }
    if (options.method) {
      history = history.filter(h => h.method === options.method);
    }
    if (options.status) {
      history = history.filter(h => h.status === options.status);
    }
    const since = options.since;
    if (since) {
      history = history.filter(h => h.timestamp >= since);
    }

    // 排序和限制
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return options.limit ? history.slice(0, options.limit) : history;
  }

  /**
   * 清理历史记录
   */
  clearHistory(): void {
    this.requestHistory = [];
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const history = this.requestHistory;
    const total = history.length;
    const successful = history.filter(h => h.success).length;
    const failed = total - successful;

    const responseTimes = history.map(h => h.responseTime).sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageResponseTime,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      activeRequests: this.activeRequests.size,
      historySize: this.requestHistory.length,
    };
  }

  /**
   * 分析批量测试结果
   */
  private analyzeBatchResults(results: TestResult[]): BatchTestResult {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;

    const responseTimes = results.map(r => r.responseTime);
    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    // 错误统计
    const errors = this.categorizeErrors(results);

    // 计算速度等级
    const averageSpeed = this.getSpeedGrade(averageResponseTime);

    return {
      total,
      successful,
      failed,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      totalSize,
      results,
      errors,
      summary: {
        successRate: (successful / total) * 100,
        averageSpeed,
        totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
        criticalErrors: errors
          .filter(e => e.severity === 'critical')
          .reduce((sum, e) => sum + e.count, 0),
      },
    };
  }

  /**
   * 分类错误
   */
  private categorizeErrors(results: TestResult[]): Array<{
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }> {
    const errors: Record<
      string,
      { count: number; severity: 'low' | 'medium' | 'high' | 'critical'; message: string }
    > = {};

    results.forEach(result => {
      if (!result.success && result.error) {
        const errorType = this.categorizeError(result.error);

        if (!errors[errorType]) {
          errors[errorType] = {
            count: 0,
            severity: this.getErrorSeverity(errorType),
            message: result.error,
          };
        }
        errors[errorType].count++;
      }
    });

    return Object.entries(errors).map(([type, data]) => ({
      type,
      ...data,
    }));
  }

  /**
   * 分类单个错误
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('timeout')) return 'timeout';
    if (errorLower.includes('network')) return 'network';
    if (errorLower.includes('dns')) return 'dns';
    if (errorLower.includes('ssl') || errorLower.includes('certificate')) return 'ssl';
    if (errorLower.includes('404')) return 'not_found';
    if (errorLower.includes('500')) return 'server_error';
    if (errorLower.includes('401')) return 'unauthorized';
    if (errorLower.includes('403')) return 'forbidden';
    if (errorLower.includes('400')) return 'bad_request';
    if (errorLower.includes('connection')) return 'connection';

    return 'unknown';
  }

  /**
   * 获取错误严重程度
   */
  private getErrorSeverity(errorType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = ['timeout', 'server_error', 'connection'];
    const highErrors = ['ssl', 'network', 'dns'];
    const mediumErrors = ['not_found', 'unauthorized', 'forbidden'];

    if (criticalErrors.includes(errorType)) return 'critical';
    if (highErrors.includes(errorType)) return 'high';
    if (mediumErrors.includes(errorType)) return 'medium';
    return 'low';
  }

  /**
   * 验证响应
   */
  private validateResponse(
    response: AxiosResponse,
    endpoint: APIEndpoint
  ): {
    statusValid: boolean;
    headersValid: boolean;
    bodyValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 验证状态码
    let statusValid = true;
    if (endpoint.expectedStatus) {
      statusValid = response.status === endpoint.expectedStatus;
      if (!statusValid) {
        issues.push(`Expected status ${endpoint.expectedStatus}, got ${response.status}`);
      }
    } else {
      statusValid = response.status >= 200 && response.status < 300;
      if (!statusValid) {
        issues.push(`Unexpected status code: ${response.status}`);
      }
    }

    // 验证响应头
    let headersValid = true;
    if (endpoint.expectedHeaders) {
      for (const [header, expectedValue] of Object.entries(endpoint.expectedHeaders)) {
        const actualValue = response.headers[header];
        if (actualValue !== expectedValue) {
          headersValid = false;
          issues.push(`Expected header ${header}: ${expectedValue}, got: ${actualValue}`);
        }
      }
    }

    // 验证响应体
    let bodyValid = true;
    if (endpoint.expectedBody) {
      // 简单的响应体验证
      if (typeof endpoint.expectedBody === 'object') {
        bodyValid = JSON.stringify(response.data) === JSON.stringify(endpoint.expectedBody);
      } else {
        bodyValid = response.data === endpoint.expectedBody;
      }

      if (!bodyValid) {
        issues.push(`Response body does not match expected value`);
      }
    }

    return {
      statusValid,
      headersValid,
      bodyValid,
      issues,
    };
  }

  /**
   * 计算响应大小
   */
  private calculateResponseSize(response: AxiosResponse): number {
    try {
      const contentLength = response.headers['content-length'];
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(responseTimes: number[]): {
    throughput: number;
    latency: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } {
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const len = sortedTimes.length;

    return {
      throughput: len / (responseTimes.reduce((sum, time) => sum + time, 0) / 1000), // 请求/秒
      latency: {
        p50: this.getPercentile(sortedTimes, 50),
        p90: this.getPercentile(sortedTimes, 90),
        p95: this.getPercentile(sortedTimes, 95),
        p99: this.getPercentile(sortedTimes, 99),
      },
    };
  }

  /**
   * 获取百分位数
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * 获取速度等级
   */
  private getSpeedGrade(responseTime: number): string {
    if (responseTime < 100) return '极快';
    if (responseTime < 500) return '很快';
    if (responseTime < 1000) return '快';
    if (responseTime < 2000) return '正常';
    if (responseTime < 5000) return '慢';
    return '很慢';
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(record: RequestHistory): void {
    this.requestHistory.push(record);

    // 限制历史记录大小
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default HTTPTestCore;
