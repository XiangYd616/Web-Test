/**
 * 压力测试分析器
 * 提供负载生成、性能分析和并发测试功能
 */

import type { ClientRequest } from 'http';
import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';
import { URL } from 'url';

export type StressProgress = {
  percentage?: number;
  completed?: number;
  total?: number;
  failed?: number;
  avgResponseTime?: number;
  stage?: string;
  message?: string;
  stats?: {
    completed?: number;
    failed?: number;
    avgResponseTime?: number;
  };
};

export interface StressConfig {
  testId: string;
  url: string;
  duration?: number;
  concurrency?: number;
  rampUp?: number;
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  thinkTime?: number;
  userAgent?: string;
  testType?: 'load' | 'stress' | 'spike' | 'volume';
  onProgress?: (progress: StressProgress) => void;
  signal?: AbortSignal;
}

export interface StressResult {
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
  statusCodeDistribution?: Record<string, number>;
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
  statusCode?: number;
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
      duration = 60,
      concurrency = 50,
      rampUp = 15,
      timeout = this.defaultOptions.timeout,
      method = 'GET',
      headers = {},
      body,
      thinkTime = 1000,
      userAgent,
      testType = 'load',
      onProgress,
      signal,
    } = config;

    if (signal?.aborted) {
      throw new Error('测试已取消');
    }

    // 内部 AbortController，用于在测试时间结束后强制终止所有进行中的请求
    const internalAc = new AbortController();
    // 外部 signal abort 时也终止内部
    if (signal) {
      if (signal.aborted) {
        internalAc.abort();
      } else {
        signal.addEventListener('abort', () => internalAc.abort(), { once: true });
      }
    }
    const combinedSignal = internalAc.signal;

    const startTime = performance.now();
    const endTime = startTime + duration * 1000;

    const metrics: RequestMetrics[] = [];
    const timeline: StressResult['timeline'] = [];
    const errors: Map<string, number> = new Map();

    let activeConnections = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let prevFailedForTimeline = 0;
    let prevMetricsCount = 0;

    const connectionPromises: Promise<void>[] = [];
    let connectionsAdded = 0;

    const addUser = () => {
      if (combinedSignal.aborted || performance.now() >= endTime) return;
      connectionsAdded++;
      activeConnections++;

      const promise = this.runUserLoop(url, {
        method,
        headers,
        body,
        timeout,
        thinkTime,
        userAgent,
        endTime,
        signal: combinedSignal,
        metrics,
        errors,
        onRequestComplete: (success: boolean) => {
          if (success) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
        },
        onError: error => {
          const errorType = this.categorizeError(error);
          errors.set(errorType, (errors.get(errorType) || 0) + 1);
        },
      });
      promise.then(() => {
        activeConnections--;
      });
      connectionPromises.push(promise);
    };

    // ---------- testType 差异化调度 ----------
    const timers: ReturnType<typeof setInterval>[] = [];

    if (testType === 'spike') {
      // 峰值测试：瞬间注入全部并发用户，无 ramp-up
      while (connectionsAdded < concurrency) {
        addUser();
      }
    } else if (testType === 'stress') {
      // 压力测试：阶梯递增，每阶段增加 20% 并发，每阶段持续 rampUp 秒（至少 5 秒）
      const steps = 5;
      const usersPerStep = Math.max(1, Math.ceil(concurrency / steps));
      const stepDuration = Math.max(5000, (rampUp * 1000) / steps);
      // 立即添加第一阶段
      for (let i = 0; i < usersPerStep && connectionsAdded < concurrency; i++) {
        addUser();
      }
      let currentStep = 1;
      const stepTimer = setInterval(() => {
        if (
          combinedSignal.aborted ||
          connectionsAdded >= concurrency ||
          performance.now() >= endTime
        ) {
          clearInterval(stepTimer);
          return;
        }
        currentStep++;
        const targetUsers = Math.min(concurrency, usersPerStep * currentStep);
        while (connectionsAdded < targetUsers) {
          addUser();
        }
      }, stepDuration);
      timers.push(stepTimer);
    } else if (testType === 'volume') {
      // 容量测试：快速 ramp-up（rampUp 的 1/3 时间），然后恒定运行
      const fastRampUp = Math.max(1, Math.floor(rampUp / 3));
      const rampInterval = concurrency > 1 ? (fastRampUp * 1000) / concurrency : 0;
      addUser();
      if (rampInterval > 0) {
        const rampTimer = setInterval(() => {
          if (
            combinedSignal.aborted ||
            connectionsAdded >= concurrency ||
            performance.now() >= endTime
          ) {
            clearInterval(rampTimer);
            return;
          }
          addUser();
        }, rampInterval);
        timers.push(rampTimer);
      } else {
        while (connectionsAdded < concurrency) {
          addUser();
        }
      }
    } else {
      // load（默认）：线性 ramp-up
      const rampUpInterval = concurrency > 1 && rampUp > 0 ? (rampUp * 1000) / concurrency : 0;
      addUser();
      if (rampUpInterval > 0) {
        const rampTimer = setInterval(() => {
          if (
            combinedSignal.aborted ||
            connectionsAdded >= concurrency ||
            performance.now() >= endTime
          ) {
            clearInterval(rampTimer);
            return;
          }
          addUser();
        }, rampUpInterval);
        timers.push(rampTimer);
      } else {
        while (connectionsAdded < concurrency) {
          addUser();
        }
      }
    }

    // 记录时间线数据 + 发送进度回调
    const timelineInterval = setInterval(() => {
      if (combinedSignal.aborted) {
        clearInterval(timelineInterval);
        return;
      }
      const now = performance.now();
      if (now < endTime) {
        // 使用自上次采样以来的所有新 metrics 计算平均响应时间
        const recentMetrics = metrics.slice(prevMetricsCount);
        prevMetricsCount = metrics.length;
        const avgResponseTime =
          recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
            : 0;

        // errors 记录增量值（本秒新增错误数）
        const deltaErrors = failedRequests - prevFailedForTimeline;
        prevFailedForTimeline = failedRequests;

        timeline.push({
          timestamp: now,
          activeConnections,
          responseTime: avgResponseTime,
          errors: deltaErrors,
        });

        // 发送进度回调
        if (onProgress) {
          const elapsed = (now - startTime) / 1000;
          const percentage = Math.min(95, Math.round((elapsed / duration) * 100));
          onProgress({
            percentage,
            completed: successfulRequests + failedRequests,
            total: 0,
            failed: failedRequests,
            avgResponseTime,
            stage: 'running',
            message: `已运行 ${Math.round(elapsed)}s / ${duration}s，活跃连接 ${activeConnections}`,
          });
        }
      }
    }, 1000);

    // 等待测试持续时间（可被 abort 中断）
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, duration * 1000);
      if (combinedSignal.aborted) {
        clearTimeout(timer);
        resolve();
      } else {
        combinedSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      }
    });

    // 测试时间到（或被取消），强制终止所有进行中的请求
    internalAc.abort();

    // 清理所有定时器
    for (const t of timers) clearInterval(t);
    clearInterval(timelineInterval);

    // 等待所有连接完成，加安全超时兜底（最多再等 timeout 毫秒）
    await Promise.race([
      Promise.all(connectionPromises),
      new Promise(resolve => setTimeout(resolve, Math.min(timeout, 10000))),
    ]);

    // 如果是外部 abort（用户取消）而非自然结束，抛出取消错误
    // 自然结束时 endTime 已过，signal 也会被 abort（第 323 行 internalAc.abort()），
    // 所以需要检查是否在 endTime 之前就被 abort 了
    if (signal?.aborted && performance.now() < endTime + 2000) {
      throw new Error('测试已取消');
    }

    // 计算最终结果
    const totalTime = (performance.now() - startTime) / 1000;
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);

    const round2 = (v: number) => Math.round(v * 100) / 100;
    const result: StressResult = {
      url,
      totalRequests: metrics.length,
      successfulRequests,
      failedRequests,
      averageResponseTime:
        responseTimes.length > 0
          ? round2(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
          : 0,
      minResponseTime: responseTimes.length > 0 ? round2(responseTimes[0]) : 0,
      maxResponseTime:
        responseTimes.length > 0 ? round2(responseTimes[responseTimes.length - 1]) : 0,
      requestsPerSecond: round2(metrics.length / totalTime),
      errors: Array.from(errors.entries()).map(([type, count]) => ({
        type,
        message: this.getErrorMessage(type),
        count,
      })),
      performance: {
        throughput: round2(successfulRequests / totalTime),
        latency: {
          p50: this.getPercentile(responseTimes, 50),
          p90: this.getPercentile(responseTimes, 90),
          p95: this.getPercentile(responseTimes, 95),
          p99: this.getPercentile(responseTimes, 99),
        },
      },
      statusCodeDistribution: this.buildStatusCodeDistribution(metrics),
      timeline,
    };

    return result;
  }

  /**
   * 虚拟用户循环：持续发送请求直到测试结束，每次请求之间加入 thinkTime 延迟
   */
  private async runUserLoop(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      timeout: number;
      thinkTime: number;
      userAgent?: string;
      endTime: number;
      signal?: AbortSignal;
      metrics: RequestMetrics[];
      errors: Map<string, number>;
      onRequestComplete: (success: boolean) => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    while (performance.now() < options.endTime && !options.signal?.aborted) {
      await this.createConnection(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        timeout: options.timeout,
        userAgent: options.userAgent,
        endTime: options.endTime,
        signal: options.signal,
        metrics: options.metrics,
        errors: options.errors,
        onComplete: () => options.onRequestComplete(true),
        onError: error => {
          options.onRequestComplete(false);
          options.onError(error);
        },
      });

      // thinkTime 延迟（毫秒），可被 abort 中断
      if (
        options.thinkTime > 0 &&
        performance.now() < options.endTime &&
        !options.signal?.aborted
      ) {
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, options.thinkTime);
          if (options.signal?.aborted) {
            clearTimeout(timer);
            resolve();
          } else {
            options.signal?.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true }
            );
          }
        });
      }
    }
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
      userAgent?: string;
      endTime: number;
      signal?: AbortSignal;
      metrics: RequestMetrics[];
      errors: Map<string, number>;
      onComplete: () => void;
      onError: (error: Error) => void;
    }
  ): Promise<void> {
    return new Promise(resolve => {
      const startTime = performance.now();

      // 检查是否已超时
      if (startTime >= options.endTime || options.signal?.aborted) {
        resolve();
        return;
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        if (options.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
        resolve();
      };

      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const requestOptions: {
        hostname: string;
        port: string | number;
        path: string;
        method: string;
        timeout: number;
        headers: Record<string, string>;
        rejectUnauthorized: boolean;
      } = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        timeout: Math.min(options.timeout, Math.max(0, options.endTime - startTime)),
        headers: {
          'User-Agent': options.userAgent || 'Stress-Analyzer/1.0.0',
          ...options.headers,
        },
        rejectUnauthorized: false,
      };

      if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(options.body).toString(),
        };
      }

      const handleAbort = () => {
        // 被 abort 的请求不计入响应时间统计，因为它们的耗时不代表服务器真实响应
        // 也不计为失败请求，因为是测试工具主动终止而非服务器错误
        req.destroy();
        settle();
      };

      const req: ClientRequest = client.request(requestOptions, res => {
        // 必须消费响应体，否则 'end' 事件不会触发
        res.resume();
        res.on('end', () => {
          if (settled) return;
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          const statusCode = res.statusCode ?? 0;

          options.metrics.push({
            startTime,
            endTime,
            responseTime,
            statusCode,
            success: statusCode >= 200 && statusCode < 400,
          });

          if (statusCode >= 200 && statusCode < 400) {
            options.onComplete();
          } else {
            options.onError(new Error(`HTTP ${statusCode}`));
          }

          settle();
        });
      });

      if (options.signal) {
        if (options.signal.aborted) {
          handleAbort();
          return;
        }
        options.signal.addEventListener('abort', handleAbort, { once: true });
      }

      req.on('error', error => {
        if (settled) return;
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        options.metrics.push({
          startTime,
          endTime,
          responseTime,
          success: false,
          error: error.message,
        });

        if (!options.signal?.aborted) {
          options.onError(error);
        }
        settle();
      });

      req.on('timeout', () => {
        if (settled) return;
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        options.metrics.push({
          startTime,
          endTime,
          responseTime,
          success: false,
          error: 'Request timeout',
        });

        if (!options.signal?.aborted) {
          options.onError(new Error('Request timeout'));
        }
        req.destroy();
        settle();
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
    if (message.includes('econnaborted')) return 'connection_aborted';
    if (message.includes('epipe') || message.includes('eproto')) return 'connection_broken';
    if (message.includes('certificate') || message.includes('ssl') || message.includes('tls'))
      return 'ssl_error';
    // 区分 4xx 和 5xx HTTP 错误
    const httpMatch = message.match(/http\s*(\d{3})/);
    if (httpMatch) {
      const code = parseInt(httpMatch[1], 10);
      if (code >= 500) return `http_5xx`;
      if (code >= 400) return `http_4xx`;
      return `http_${code}`;
    }
    if (message.includes('socket hang up')) return 'socket_hangup';

    return 'unknown';
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(type: string): string {
    const messages: Record<string, string> = {
      timeout: '请求超时',
      connection_reset: '连接重置',
      connection_refused: '连接被拒绝',
      connection_aborted: '连接中断',
      connection_broken: '连接断开',
      dns_error: 'DNS解析失败',
      ssl_error: 'SSL/TLS错误',
      http_4xx: '客户端错误(4xx)',
      http_5xx: '服务端错误(5xx)',
      http_error: 'HTTP协议错误',
      socket_hangup: '连接意外关闭',
      unknown: '未知错误',
    };

    return messages[type] || (type.startsWith('http_') ? `HTTP ${type.slice(5)} 错误` : '未知错误');
  }

  /**
   * 构建 HTTP 状态码分布统计
   */
  private buildStatusCodeDistribution(metrics: RequestMetrics[]): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const m of metrics) {
      if (m.statusCode !== undefined && m.statusCode > 0) {
        // 按状态码分组：2xx, 3xx, 4xx, 5xx
        const group = `${Math.floor(m.statusCode / 100)}xx`;
        dist[group] = (dist[group] || 0) + 1;
      } else if (m.error) {
        dist['error'] = (dist['error'] || 0) + 1;
      }
    }
    return dist;
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
    const total = result.totalRequests || 1;

    // 响应时间建议
    if (result.averageResponseTime > 3000) {
      recommendations.push(
        '平均响应时间严重过长(>3s)，建议排查数据库慢查询、外部 API 调用或资源瓶颈'
      );
    } else if (result.averageResponseTime > 1000) {
      recommendations.push('平均响应时间偏长(>1s)，建议优化服务器性能或启用缓存');
    }

    // 错误率建议
    const errorRate = result.failedRequests / total;
    if (errorRate > 0.1) {
      recommendations.push(
        `错误率极高 (${(errorRate * 100).toFixed(1)}%)，服务可能已过载，建议降低并发或扩容`
      );
    } else if (errorRate > 0.05) {
      recommendations.push(
        `错误率偏高 (${(errorRate * 100).toFixed(1)}%)，建议检查服务器稳定性和资源限制`
      );
    }

    // 吞吐量建议
    if (result.requestsPerSecond < 1 && total > 10) {
      recommendations.push('吞吐量极低(<1 RPS)，可能存在严重性能瓶颈');
    } else if (result.requestsPerSecond < 10 && total > 50) {
      recommendations.push('吞吐量较低(<10 RPS)，建议优化服务器配置或代码逻辑');
    }

    // P99/P50 延迟差距分析
    const { p50, p95, p99 } = result.performance.latency;
    if (p99 > 5000) {
      recommendations.push(`P99 延迟过高(${Math.round(p99)}ms)，存在严重长尾请求，建议排查慢路径`);
    } else if (p99 > 2000) {
      recommendations.push(`P99 延迟偏高(${Math.round(p99)}ms)，建议减少并发数或优化慢请求`);
    }
    if (p50 > 0 && p95 / p50 > 5) {
      recommendations.push(
        `P95/P50 延迟比值过大(${(p95 / p50).toFixed(1)}x)，响应时间波动剧烈，建议排查不稳定因素`
      );
    }

    // 状态码分布分析
    if (result.statusCodeDistribution) {
      const dist = result.statusCodeDistribution;
      const s5xx = dist['5xx'] || 0;
      const s4xx = dist['4xx'] || 0;
      const s3xx = dist['3xx'] || 0;
      if (s5xx > 0) {
        recommendations.push(`存在 ${s5xx} 个 5xx 服务端错误，建议检查服务器日志和资源使用情况`);
      }
      if (s4xx > total * 0.1) {
        recommendations.push(
          `4xx 客户端错误占比 ${((s4xx / total) * 100).toFixed(1)}%，建议检查请求参数和认证配置`
        );
      }
      if (s3xx > total * 0.5) {
        recommendations.push(`超过 50% 请求返回 3xx 重定向，建议直接使用最终目标 URL 进行测试`);
      }
    }

    // 错误类型分析
    for (const err of result.errors) {
      if (err.type === 'timeout' && err.count > total * 0.1) {
        recommendations.push('超时请求占比较高，建议增加请求超时时间或优化服务器响应速度');
        break;
      }
      if (err.type === 'connection_refused' && err.count > 0) {
        recommendations.push('存在连接被拒绝错误，服务器可能达到最大连接数限制');
        break;
      }
      if (err.type === 'connection_reset' && err.count > total * 0.05) {
        recommendations.push('连接重置频繁，可能触发了服务器的连接限制或防火墙规则');
        break;
      }
    }

    // 时间线劣化检测
    if (result.timeline.length >= 10) {
      const n = result.timeline.length;
      const firstThird = result.timeline.slice(0, Math.floor(n / 3));
      const lastThird = result.timeline.slice(Math.floor((n * 2) / 3));
      const avg = (arr: typeof result.timeline) =>
        arr.reduce((s, t) => s + t.responseTime, 0) / Math.max(1, arr.length);
      const firstAvg = avg(firstThird);
      const lastAvg = avg(lastThird);
      if (firstAvg > 0 && lastAvg / firstAvg >= 2) {
        recommendations.push('响应时间随测试进行显著劣化，可能存在内存泄漏、连接池耗尽或资源瓶颈');
      }
    }

    return recommendations;
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
