/**
 * 负载生成器
 * 本地化程度：100%
 * 生成各种类型的负载测试请求
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent as HttpsAgent } from 'http';
import { Agent as HttpAgent } from 'https';

// 负载生成器配置接口
export interface LoadGeneratorConfig {
  maxConcurrency: number;
  timeout: number;
  keepAlive: boolean;
  maxSockets: number;
  maxFreeSockets: number;
  retryAttempts: number;
  retryDelay: number;
  userAgent?: string;
  headers?: Record<string, string>;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

// 负载测试请求接口
export interface LoadTestRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

// 负载测试结果接口
export interface LoadTestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  responseSize: number;
  error?: string;
  attempt: number;
  timestamp: Date;
}

// 负载测试统计接口
export interface LoadTestStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Record<string, number>;
}

/**
 * 负载生成器类
 */
class LoadGenerator {
  private options: LoadGeneratorConfig;
  private httpAgent: HttpAgent;
  private httpsAgent: HttpsAgent;
  private axiosInstance: AxiosInstance;
  private statistics: LoadTestStatistics;
  private activeRequests: number = 0;
  private startTime: Date | null = null;

  constructor(options: Partial<LoadGeneratorConfig> = {}) {
    this.options = {
      maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '10'),
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      keepAlive: true,
      maxSockets: 1000,
      maxFreeSockets: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      userAgent: 'LoadGenerator/1.0',
      headers: {},
      ...options,
    };

    // 创建HTTP代理池
    this.httpAgent = new HttpAgent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
    });

    this.httpsAgent = new HttpsAgent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
      rejectUnauthorized: false, // 负载测试中允许自签名证书
    });

    // 创建axios实例
    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      headers: {
        'User-Agent': this.options.userAgent,
        ...this.options.headers,
      },
    });

    // 初始化统计信息
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      totalResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      errors: {},
    };
  }

  /**
   * 执行单个负载测试请求
   */
  async executeRequest(request: LoadTestRequest): Promise<LoadTestResult> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.options.retryAttempts) {
      attempt++;
      this.activeRequests++;

      try {
        const config: AxiosRequestConfig = {
          method: request.method,
          url: request.url,
          headers: request.headers,
          timeout: request.timeout || this.options.timeout,
          data: request.body,
        };

        const response: AxiosResponse = await this.axiosInstance.request(config);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const result: LoadTestResult = {
          success: true,
          statusCode: response.status,
          responseTime,
          responseSize: JSON.stringify(response.data).length,
          attempt,
          timestamp: new Date(),
        };

        this.updateStatistics(result);
        this.activeRequests--;
        return result;
      } catch (error: any) {
        lastError = error;
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (attempt <= this.options.retryAttempts) {
          await this.delay(this.options.retryDelay);
        }

        if (attempt === this.options.retryAttempts) {
          const result: LoadTestResult = {
            success: false,
            statusCode: error.response?.status || 0,
            responseTime,
            responseSize: 0,
            error: error.message,
            attempt,
            timestamp: new Date(),
          };

          this.updateStatistics(result);
          this.activeRequests--;
          return result;
        }
      }
    }

    // 这种情况理论上不会到达，但为了类型安全
    const result: LoadTestResult = {
      success: false,
      statusCode: 0,
      responseTime: Date.now() - startTime,
      responseSize: 0,
      error: lastError?.message || 'Unknown error',
      attempt: this.options.retryAttempts,
      timestamp: new Date(),
    };

    this.updateStatistics(result);
    this.activeRequests--;
    return result;
  }

  /**
   * 执行并发负载测试
   */
  async executeConcurrentLoad(
    requests: LoadTestRequest[],
    concurrency: number = this.options.maxConcurrency
  ): Promise<LoadTestResult[]> {
    if (!this.startTime) {
      this.startTime = new Date();
    }

    const results: LoadTestResult[] = [];
    const chunks = this.chunkArray(requests, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(request => this.executeRequest(request));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * 执行渐进式负载测试
   */
  async executeRampUpLoad(
    requests: LoadTestRequest[],
    rampUpTime: number,
    maxConcurrency: number = this.options.maxConcurrency
  ): Promise<LoadTestResult[]> {
    if (!this.startTime) {
      this.startTime = new Date();
    }

    const results: LoadTestResult[] = [];
    const stepSize = Math.ceil(maxConcurrency / 10); // 10步渐进
    const stepDelay = rampUpTime / 10;

    for (let i = 1; i <= 10; i++) {
      const currentConcurrency = Math.min(stepSize * i, maxConcurrency);
      const requestsPerStep = Math.floor(requests.length / 10);
      const stepRequests = requests.slice((i - 1) * requestsPerStep, i * requestsPerStep);

      const stepResults = await this.executeConcurrentLoad(stepRequests, currentConcurrency);
      results.push(...stepResults);

      if (i < 10) {
        await this.delay(stepDelay);
      }
    }

    return results;
  }

  /**
   * 执行突发负载测试
   */
  async executeSpikeLoad(
    requests: LoadTestRequest[],
    spikeConcurrency: number,
    normalConcurrency: number = this.options.maxConcurrency,
    spikeDuration: number = 10000
  ): Promise<LoadTestResult[]> {
    if (!this.startTime) {
      this.startTime = new Date();
    }

    const results: LoadTestResult[] = [];
    const spikeRequests = requests.slice(0, Math.floor(requests.length * 0.3));
    const normalRequests = requests.slice(Math.floor(requests.length * 0.3));

    // 正常负载阶段
    const normalResults = await this.executeConcurrentLoad(normalRequests, normalConcurrency);
    results.push(...normalResults);

    // 突发负载阶段
    const spikeResults = await this.executeConcurrentLoad(spikeRequests, spikeConcurrency);
    results.push(...spikeResults);

    // 恢复正常负载
    const recoveryResults = await this.executeConcurrentLoad(
      normalRequests.slice(0, Math.floor(normalRequests.length * 0.5)),
      normalConcurrency
    );
    results.push(...recoveryResults);

    return results;
  }

  /**
   * 获取当前统计信息
   */
  getStatistics(): LoadTestStatistics {
    const now = new Date();
    const duration = this.startTime ? (now.getTime() - this.startTime.getTime()) / 1000 : 1;

    return {
      ...this.statistics,
      requestsPerSecond: this.statistics.totalRequests / duration,
      errorRate:
        this.statistics.totalRequests > 0
          ? (this.statistics.failedRequests / this.statistics.totalRequests) * 100
          : 0,
    };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      totalResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      errors: {},
    };
    this.startTime = null;
  }

  /**
   * 获取活跃请求数
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * 关闭负载生成器
   */
  async close(): Promise<void> {
    // 等待所有活跃请求完成
    while (this.activeRequests > 0) {
      await this.delay(100);
    }

    // 关闭HTTP代理
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(result: LoadTestResult): void {
    this.statistics.totalRequests++;

    if (result.success) {
      this.statistics.successfulRequests++;
    } else {
      this.statistics.failedRequests++;
      if (result.error) {
        const errorKey = result.error;
        this.statistics.errors[errorKey] = (this.statistics.errors[errorKey] || 0) + 1;
      }
    }

    // 更新响应时间统计
    this.statistics.totalResponseTime += result.responseTime;
    this.statistics.averageResponseTime =
      this.statistics.totalResponseTime / this.statistics.totalRequests;
    this.statistics.minResponseTime = Math.min(
      this.statistics.minResponseTime,
      result.responseTime
    );
    this.statistics.maxResponseTime = Math.max(
      this.statistics.maxResponseTime,
      result.responseTime
    );
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成随机请求
   */
  generateRandomRequests(
    baseUrl: string,
    count: number,
    methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[] = ['GET', 'POST']
  ): LoadTestRequest[] {
    const requests: LoadTestRequest[] = [];
    const endpoints = [
      '/api/users',
      '/api/products',
      '/api/orders',
      '/api/reports',
      '/api/analytics',
    ];

    for (let i = 0; i < count; i++) {
      const method = methods[Math.floor(Math.random() * methods.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const url = `${baseUrl}${endpoint}`;

      const request: LoadTestRequest = {
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `req-${i}-${Date.now()}`,
        },
      };

      if (method !== 'GET') {
        request.body = {
          data: `test-data-${i}`,
          timestamp: new Date().toISOString(),
          random: Math.random(),
        };
      }

      requests.push(request);
    }

    return requests;
  }

  /**
   * 生成压力测试请求
   */
  generateStressRequests(
    baseUrl: string,
    count: number,
    complexity: 'low' | 'medium' | 'high' = 'medium'
  ): LoadTestRequest[] {
    const requests: LoadTestRequest[] = [];
    const complexityMap = {
      low: { endpoints: ['/api/health', '/api/status'], bodySize: 100 },
      medium: { endpoints: ['/api/users', '/api/products'], bodySize: 1000 },
      high: { endpoints: ['/api/reports', '/api/analytics'], bodySize: 10000 },
    };

    const config = complexityMap[complexity];

    for (let i = 0; i < count; i++) {
      const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
      const url = `${baseUrl}${endpoint}`;

      const request: LoadTestRequest = {
        url,
        method: Math.random() > 0.5 ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `stress-${i}-${Date.now()}`,
        },
      };

      if (request.method === 'POST') {
        request.body = {
          data: 'x'.repeat(config.bodySize),
          metadata: {
            requestId: `stress-${i}`,
            timestamp: new Date().toISOString(),
            complexity,
          },
        };
      }

      requests.push(request);
    }

    return requests;
  }
}

export default LoadGenerator;
