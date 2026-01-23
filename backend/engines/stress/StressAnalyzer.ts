/**
 * 压力测试分析器
 * 提供负载生成、性能分析和并发测试功能
 */

import type { ClientRequest } from 'http';
import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';
import { URL } from 'url';

interface StressConfig {
  url: string;
  duration: number;
  concurrency: number;
  rampUp?: number;
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface StressResult {
  url: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{
    type: string;
    message: string;
    count: number;
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
  timeline: Array<{
    timestamp: number;
    activeConnections: number;
    responseTime: number;
    errors: number;
  }>;
}

interface RequestMetrics {
  startTime: number;
  endTime: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

class StressAnalyzer {
  private defaultOptions: {
    timeout: number;
    maxConcurrent: number;
  };

  constructor(options: Record<string, unknown> = {}) {
    this.defaultOptions = {
      timeout: 30000,
      maxConcurrent: 100,
      ...options,
    };
  }

  /**
   * 执行压力测试
   */
  async analyze(url: string, config: StressConfig): Promise<StressResult> {
    const {
      duration = 30,
      concurrency = 5,
      rampUp = 5,
      timeout = this.defaultOptions.timeout,
      method = 'GET',
      headers = {},
      body,
    } = config;

    const startTime = performance.now();
    const endTime = startTime + duration * 1000;

    const metrics: RequestMetrics[] = [];
    const timeline: StressResult['timeline'] = [];
    const errors: Map<string, number> = new Map();

    let activeConnections = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    // 创建连接池
    const connectionPromises: Promise<void>[] = [];

    // 逐步增加连接数（ramp-up）
    const rampUpInterval = rampUp > 0 ? (duration * 1000) / rampUp : 0;
    let connectionsAdded = 0;

    const rampUpTimer = setInterval(() => {
      if (connectionsAdded < concurrency && performance.now() < endTime) {
        connectionsAdded++;
        activeConnections++;

        const promise = this.createConnection(url, {
          method,
          headers,
          body,
          timeout,
          endTime,
          metrics,
          errors,
          onComplete: () => {
            activeConnections--;
            successfulRequests++;
          },
          onError: error => {
            activeConnections--;
            failedRequests++;
            const errorType = this.categorizeError(error);
            errors.set(errorType, (errors.get(errorType) || 0) + 1);
          },
        });

        connectionPromises.push(promise);
      }
    }, rampUpInterval);

    // 记录时间线数据
    const timelineInterval = setInterval(() => {
      if (performance.now() < endTime) {
        const recentMetrics = metrics.slice(-10);
        const avgResponseTime =
          recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
            : 0;

        timeline.push({
          timestamp: performance.now(),
          activeConnections,
          responseTime: avgResponseTime,
          errors: failedRequests,
        });
      }
    }, 1000);

    // 等待所有连接完成
    await Promise.all(connectionPromises);

    // 清理定时器
    clearInterval(rampUpTimer);
    clearInterval(timelineInterval);

    // 计算最终结果
    const totalTime = (performance.now() - startTime) / 1000;
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);

    const result: StressResult = {
      url,
      totalRequests: metrics.length,
      successfulRequests,
      failedRequests,
      averageResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0,
      minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
      maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      requestsPerSecond: metrics.length / totalTime,
      errors: Array.from(errors.entries()).map(([type, count]) => ({
        type,
        message: this.getErrorMessage(type),
        count,
      })),
      performance: {
        throughput: successfulRequests / totalTime,
        latency: {
          p50: this.getPercentile(responseTimes, 50),
          p90: this.getPercentile(responseTimes, 90),
          p95: this.getPercentile(responseTimes, 95),
          p99: this.getPercentile(responseTimes, 99),
        },
      },
      timeline,
    };

    return result;
  }

  /**
   * 创建单个连接
   */
  private async createConnection(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      timeout: number;
      endTime: number;
      metrics: RequestMetrics[];
      errors: Map<string, number>;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    return new Promise(resolve => {
      const startTime = performance.now();

      // 检查是否已超时
      if (startTime >= options.endTime) {
        resolve();
        return;
      }

      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const requestOptions: Record<string, unknown> = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        timeout: Math.min(options.timeout, options.endTime - startTime),
        headers: {
          'User-Agent': 'Stress-Analyzer/1.0.0',
          ...options.headers,
        },
      };

      if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(options.body).toString(),
        };
      }

      const req: ClientRequest = client.request(requestOptions, res => {
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          const statusCode = res.statusCode ?? 0;

          options.metrics.push({
            startTime,
            endTime,
            responseTime,
            success: statusCode >= 200 && statusCode < 400,
          });

          if (statusCode >= 200 && statusCode < 400) {
            options.onComplete();
          } else {
            options.onError(new Error(`HTTP ${statusCode}`));
          }

          resolve();
        });
      });

      req.on('error', error => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        options.metrics.push({
          startTime,
          endTime,
          responseTime,
          success: false,
          error: error.message,
        });

        options.onError(error);
        resolve();
      });

      req.on('timeout', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        options.metrics.push({
          startTime,
          endTime,
          responseTime,
          success: false,
          error: 'Request timeout',
        });

        options.onError(new Error('Request timeout'));
        req.destroy();
        resolve();
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * 错误分类
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('econnreset')) return 'connection_reset';
    if (message.includes('enotfound')) return 'dns_error';
    if (message.includes('econnrefused')) return 'connection_refused';
    if (message.includes('certificate')) return 'ssl_error';
    if (message.includes('http')) return 'http_error';

    return 'unknown';
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(type: string): string {
    const messages: Record<string, string> = {
      timeout: '请求超时',
      connection_reset: '连接重置',
      dns_error: 'DNS解析失败',
      connection_refused: '连接被拒绝',
      ssl_error: 'SSL证书错误',
      http_error: 'HTTP协议错误',
      unknown: '未知错误',
    };

    return messages[type] || '未知错误';
  }

  /**
   * 计算百分位数
   */
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  /**
   * 生成性能建议
   */
  generateRecommendations(result: StressResult): string[] {
    const recommendations: string[] = [];

    // 响应时间建议
    if (result.averageResponseTime > 1000) {
      recommendations.push('平均响应时间过长，建议优化服务器性能');
    }

    // 错误率建议
    const errorRate = result.failedRequests / result.totalRequests;
    if (errorRate > 0.05) {
      recommendations.push(`错误率过高 (${(errorRate * 100).toFixed(2)}%)，建议检查服务器稳定性`);
    }

    // 吞吐量建议
    if (result.requestsPerSecond < 10) {
      recommendations.push('吞吐量较低，建议优化服务器配置');
    }

    // 并发建议
    if (result.performance.latency.p99 > 2000) {
      recommendations.push('99%响应时间过长，建议减少并发数或优化性能');
    }

    return recommendations;
  }

  /**
   * 计算性能评分
   */
  calculateScore(result: StressResult): number {
    let score = 100;

    // 响应时间评分 (40%)
    const avgResponseTimeScore = Math.max(0, 40 - result.averageResponseTime / 50);
    score += avgResponseTimeScore - 40;

    // 错误率评分 (30%)
    const errorRate = result.failedRequests / result.totalRequests;
    const errorRateScore = Math.max(0, 30 - errorRate * 300);
    score += errorRateScore - 30;

    // 吞吐量评分 (20%)
    const throughputScore = Math.min(20, result.requestsPerSecond / 2);
    score += throughputScore - 20;

    // 稳定性评分 (10%)
    const stabilityScore = result.performance.latency.p99 < 2000 ? 10 : 0;
    score += stabilityScore - 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 获取分析器信息
   */
  getAnalyzerInfo() {
    return {
      name: 'StressAnalyzer',
      version: '1.0.0',
      description: '压力测试分析器',
      capabilities: ['负载生成', '并发测试', '性能分析', '错误统计', '时间线记录'],
      limits: {
        maxConcurrent: this.defaultOptions.maxConcurrent,
        maxDuration: 300, // 5分钟
        defaultTimeout: this.defaultOptions.timeout,
      },
    };
  }
}

export default StressAnalyzer;

module.exports = StressAnalyzer;
