/**
 * API指标收集模块
 * 从enhancedApiService提取的监控功能
 */

import type { ApiMetrics } from './apiTypes';

export class MetricsCollector {
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retryAttempts: 0,
    errorsByType: {}
  };

  private responseTimes: number[] = [];

  recordRequest(): void {
    this.metrics.totalRequests++;
  }

  recordSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.recordResponseTime(responseTime);
  }

  recordFailure(errorCode: string): void {
    this.metrics.failedRequests++;
    this.metrics.errorsByType[errorCode] = (this.metrics.errorsByType[errorCode] || 0) + 1;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordRetry(): void {
    this.metrics.retryAttempts++;
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // 限制保存的响应时间数量，避免内存泄漏
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }

    // 更新平均响应时间
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retryAttempts: 0,
      errorsByType: {}
    };
    this.responseTimes = [];
  }
}
