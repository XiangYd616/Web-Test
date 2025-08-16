/**
    * API监控服务
    * 收集和分析API调用的性能指标
    */

    export interface ApiMetrics {
      totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errorsByType: Record<string, number>;
    successRate: number;
    endpointMetrics: Record<string, {
      requests: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
}

    export interface ApiCallLog {
      id: string;
    url: string;
    method: string;
    status: number;
    responseTime: number;
    timestamp: string;
    success: boolean;
    error?: string;
}

    class ApiMonitoringService {
      private metrics: ApiMetrics = {
      totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: { },
    successRate: 0,
    endpointMetrics: { }
  };

    private callLogs: ApiCallLog[] = [];
    private maxLogSize = 1000; // 最多保存1000条日志

    /**
     * 记录API调用
     */
    logApiCall(log: Omit<ApiCallLog, 'id' | 'timestamp'>): void {
    const apiLog: ApiCallLog = {
      ...log,
      id: this.generateId(),
    timestamp: new Date().toISOString()
    };

    // 添加到日志
    this.callLogs.unshift(apiLog);
    if (this.callLogs.length > this.maxLogSize) {
      this.callLogs.pop();
    }

    // 更新指标
    this.updateMetrics(apiLog);
  }

    /**
     * 更新指标
     */
    private updateMetrics(log: ApiCallLog): void {
      this.metrics.totalRequests++;

    if (log.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

    // 记录错误类型
    const errorType = log.error || 'Unknown';
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    }

    // 更新平均响应时间
    this.metrics.averageResponseTime =
    (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + log.responseTime) /
    this.metrics.totalRequests;

    // 更新成功率
    this.metrics.successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;

    // 更新端点指标
    const endpoint = `${log.method} ${log.url}`;
    if (!this.metrics.endpointMetrics[endpoint]) {
      this.metrics.endpointMetrics[endpoint] = {
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }

    const endpointMetric = this.metrics.endpointMetrics[endpoint];
    endpointMetric.requests++;
    endpointMetric.averageResponseTime =
    (endpointMetric.averageResponseTime * (endpointMetric.requests - 1) + log.responseTime) /
    endpointMetric.requests;

    const endpointErrors = this.callLogs.filter(l =>
    `${l.method} ${l.url}` === endpoint && !l.success
    ).length;
    endpointMetric.errorRate = (endpointErrors / endpointMetric.requests) * 100;
  }

    /**
     * 获取指标
     */
    getMetrics(): ApiMetrics {
    return {...this.metrics};
  }

    /**
     * 获取调用日志
     */
    getCallLogs(limit?: number): ApiCallLog[] {
    return limit ? this.callLogs.slice(0, limit) : [...this.callLogs];
  }

    /**
     * 获取错误日志
     */
    getErrorLogs(limit?: number): ApiCallLog[] {
    const errorLogs = this.callLogs.filter(log => !log.success);
    return limit ? errorLogs.slice(0, limit) : errorLogs;
  }

    /**
     * 获取慢请求日志
     */
    getSlowRequests(threshold: number = 2000, limit?: number): ApiCallLog[] {
    const slowRequests = this.callLogs.filter(log => log.responseTime > threshold);
    return limit ? slowRequests.slice(0, limit) : slowRequests;
  }

    /**
     * 重置指标
     */
    resetMetrics(): void {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorsByType: {},
        successRate: 0,
        endpointMetrics: {}
      };
    this.callLogs = [];
  }

    /**
     * 导出指标报告
     */
    exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
    metrics: this.metrics,
    recentErrors: this.getErrorLogs(10),
    slowRequests: this.getSlowRequests(2000, 10),
    topEndpoints: Object.entries(this.metrics.endpointMetrics)
        .sort(([,a], [,b]) => b.requests - a.requests)
    .slice(0, 10)
    };

    return JSON.stringify(report, null, 2);
  }

    private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

    export const apiMonitoringService = new ApiMonitoringService();
    export default apiMonitoringService;