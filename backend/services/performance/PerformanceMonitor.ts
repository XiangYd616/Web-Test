/**
 * 性能监控服务
 * 监控API响应时间、系统资源使用、缓存命中率等
 */

import * as os from 'os';
import { performance } from 'perf_hooks';

// 性能指标接口
export interface PerformanceMetrics {
  requests: Map<string, RequestMetric>;
  system: SystemMetrics;
  api: ApiMetrics;
  cache: CacheMetrics;
  database: DatabaseMetrics;
}

// 请求指标接口
export interface RequestMetric {
  id: string;
  method: string;
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  statusCode: number;
  userAgent?: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

// 系统指标接口
export interface SystemMetrics {
  cpu: number[];
  memory: number[];
  timestamps: number[];
  uptime: number;
  loadAverage: number[];
}

// API指标接口
export interface ApiMetrics {
  responseTime: number[];
  throughput: number;
  errorRate: number;
  totalRequests: number;
  activeConnections: number;
}

// 缓存指标接口
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
}

// 数据库指标接口
export interface DatabaseMetrics {
  connections: number;
  queries: number;
  avgQueryTime: number;
  slowQueries: number;
  errors: number;
}

// 性能报告接口
export interface PerformanceReport {
  id: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: PerformanceSummary;
  details: PerformanceDetails;
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
}

// 性能摘要接口
export interface PerformanceSummary {
  overallScore: number;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errorRate: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  keyMetrics: Record<string, number>;
}

// 性能详情接口
export interface PerformanceDetails {
  requests: RequestMetric[];
  system: SystemMetrics;
  api: ApiMetrics;
  cache: CacheMetrics;
  database: DatabaseMetrics;
  endpoints: EndpointMetrics[];
}

// 端点指标接口
export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  averageResponseTime: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}

// 性能告警接口
export interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'error_rate' | 'system_resource' | 'cache_hit_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

// 性能建议接口
export interface PerformanceRecommendation {
  id: string;
  category: 'performance' | 'reliability' | 'scalability' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  metrics: string[];
}

// 性能监控配置接口
export interface PerformanceMonitorConfig {
  enabled: boolean;
  interval: number;
  retentionPeriod: number;
  thresholds: PerformanceThresholds;
  alerts: {
    enabled: boolean;
    channels: string[];
  };
  reporting: {
    enabled: boolean;
    frequency: number;
    recipients: string[];
  };
}

// 性能阈值接口
export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  cacheHitRate: {
    warning: number;
    critical: number;
  };
}

/**
 * 性能指标收集器
 */
class PerformanceCollector {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private requestCount: number;
  private maxDataPoints: number;

  constructor() {
    this.metrics = {
      requests: new Map(),
      system: {
        cpu: [],
        memory: [],
        timestamps: [],
        uptime: 0,
        loadAverage: [],
      },
      api: {
        responseTime: [],
        throughput: 0,
        errorRate: 0,
        totalRequests: 0,
        activeConnections: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        evictions: 0,
      },
      database: {
        connections: 0,
        queries: 0,
        avgQueryTime: 0,
        slowQueries: 0,
        errors: 0,
      },
    };

    this.startTime = Date.now();
    this.requestCount = 0;
    this.maxDataPoints = 1000;
  }

  /**
   * 开始请求监控
   */
  startRequest(request: {
    method: string;
    url: string;
    userAgent?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): string {
    const requestId = this.generateRequestId();
    const metric: RequestMetric = {
      id: requestId,
      method: request.method,
      url: request.url,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      statusCode: 0,
      userAgent: request.userAgent,
      userId: request.userId,
      metadata: request.metadata || {},
    };

    this.metrics.requests.set(requestId, metric);
    this.requestCount++;

    return requestId;
  }

  /**
   * 结束请求监控
   */
  endRequest(requestId: string, statusCode: number): void {
    const metric = this.metrics.requests.get(requestId);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.statusCode = statusCode;

    // 更新API指标
    this.metrics.api.responseTime.push(metric.duration);
    this.metrics.api.totalRequests++;

    if (statusCode >= 400) {
      this.metrics.api.errorRate =
        (this.metrics.api.errorRate * (this.metrics.api.totalRequests - 1) + 1) /
        this.metrics.api.totalRequests;
    }

    // 限制数据点数量
    if (this.metrics.api.responseTime.length > this.maxDataPoints) {
      this.metrics.api.responseTime = this.metrics.api.responseTime.slice(-this.maxDataPoints);
    }
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics(): void {
    const now = Date.now();
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const loadAverage = os.loadavg();

    this.metrics.system.cpu.push(cpuUsage);
    this.metrics.system.memory.push(memoryUsage);
    this.metrics.system.timestamps.push(now);
    this.metrics.system.uptime = now - this.startTime;
    this.metrics.system.loadAverage = loadAverage;

    // 限制数据点数量
    if (this.metrics.system.cpu.length > this.maxDataPoints) {
      this.metrics.system.cpu = this.metrics.system.cpu.slice(-this.maxDataPoints);
      this.metrics.system.memory = this.metrics.system.memory.slice(-this.maxDataPoints);
      this.metrics.system.timestamps = this.metrics.system.timestamps.slice(-this.maxDataPoints);
    }
  }

  /**
   * 更新缓存指标
   */
  updateCacheMetrics(hits: number, misses: number, size: number, evictions: number): void {
    this.metrics.cache.hits = hits;
    this.metrics.cache.misses = misses;
    this.metrics.cache.hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
    this.metrics.cache.size = size;
    this.metrics.cache.evictions = evictions;
  }

  /**
   * 更新数据库指标
   */
  updateDatabaseMetrics(
    connections: number,
    queries: number,
    avgQueryTime: number,
    slowQueries: number,
    errors: number
  ): void {
    this.metrics.database.connections = connections;
    this.metrics.database.queries = queries;
    this.metrics.database.avgQueryTime = avgQueryTime;
    this.metrics.database.slowQueries = slowQueries;
    this.metrics.database.errors = errors;
  }

  /**
   * 获取指标
   */
  getMetrics(): PerformanceMetrics {
    // 计算吞吐量
    const timeWindow = 60000; // 1分钟
    const now = Date.now();
    const recentRequests = Array.from(this.metrics.requests.values()).filter(
      req => now - req.startTime < timeWindow
    );

    this.metrics.api.throughput = recentRequests.length / (timeWindow / 1000);

    return { ...this.metrics };
  }

  /**
   * 清理旧数据
   */
  cleanup(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24小时前

    // 清理请求数据
    for (const [id, metric] of this.metrics.requests.entries()) {
      if (metric.startTime < cutoffTime) {
        this.metrics.requests.delete(id);
      }
    }
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return totalTick > 0 ? ((totalTick - totalIdle) / totalTick) * 100 : 0;
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    const total = os.totalmem();
    const free = os.freemem();
    return ((total - free) / total) * 100;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 性能监控服务
 */
class PerformanceMonitor {
  private collector: PerformanceCollector;
  private config: PerformanceMonitorConfig;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private recommendations: PerformanceRecommendation[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.collector = new PerformanceCollector();
    this.config = {
      enabled: true,
      interval: 5000, // 5秒
      retentionPeriod: 24 * 60 * 60 * 1000, // 24小时
      thresholds: {
        responseTime: { warning: 1000, critical: 2000 },
        errorRate: { warning: 5, critical: 10 },
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        cacheHitRate: { warning: 80, critical: 60 },
      },
      alerts: {
        enabled: true,
        channels: ['email', 'slack'],
      },
      reporting: {
        enabled: true,
        frequency: 3600000, // 1小时
        recipients: [],
      },
      ...config,
    };

    this.initializeRecommendations();
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring || !this.config.enabled) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, this.config.interval);

    console.log('Performance monitoring started');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * 开始请求监控
   */
  startRequest(request: {
    method: string;
    url: string;
    userAgent?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): string {
    return this.collector.startRequest(request);
  }

  /**
   * 结束请求监控
   */
  endRequest(requestId: string, statusCode: number): void {
    this.collector.endRequest(requestId, statusCode);
  }

  /**
   * 获取实时指标
   */
  getMetrics(): PerformanceMetrics {
    return this.collector.getMetrics();
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const metrics = this.collector.getMetrics();
    const summary = this.calculateSummary(metrics);
    const details = this.calculateDetails(metrics);
    const alerts = this.getActiveAlerts();

    return {
      id: this.generateReportId(),
      timestamp: new Date(),
      period: {
        start: new Date(Date.now() - this.config.retentionPeriod),
        end: new Date(),
      },
      summary,
      details,
      alerts,
      recommendations: this.recommendations,
    };
  }

  /**
   * 获取告警
   */
  getAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    return true;
  }

  /**
   * 获取建议
   */
  getRecommendations(): PerformanceRecommendation[] {
    return this.recommendations;
  }

  /**
   * 收集指标
   */
  private collectMetrics(): void {
    this.collector.collectSystemMetrics();
  }

  /**
   * 检查告警
   */
  private checkAlerts(): void {
    const metrics = this.collector.getMetrics();
    const now = new Date();

    // 检查响应时间
    if (metrics.api.responseTime.length > 0) {
      const avgResponseTime =
        metrics.api.responseTime.reduce((sum, time) => sum + time, 0) /
        metrics.api.responseTime.length;

      if (avgResponseTime > this.config.thresholds.responseTime.critical) {
        this.createAlert(
          'response_time',
          'critical',
          `Average response time is ${avgResponseTime.toFixed(2)}ms`,
          avgResponseTime,
          this.config.thresholds.responseTime.critical,
          now
        );
      } else if (avgResponseTime > this.config.thresholds.responseTime.warning) {
        this.createAlert(
          'response_time',
          'medium',
          `Average response time is ${avgResponseTime.toFixed(2)}ms`,
          avgResponseTime,
          this.config.thresholds.responseTime.warning,
          now
        );
      }
    }

    // 检查错误率
    if (metrics.api.errorRate > this.config.thresholds.errorRate.critical) {
      this.createAlert(
        'error_rate',
        'critical',
        `Error rate is ${metrics.api.errorRate.toFixed(2)}%`,
        metrics.api.errorRate,
        this.config.thresholds.errorRate.critical,
        now
      );
    } else if (metrics.api.errorRate > this.config.thresholds.errorRate.warning) {
      this.createAlert(
        'error_rate',
        'medium',
        `Error rate is ${metrics.api.errorRate.toFixed(2)}%`,
        metrics.api.errorRate,
        this.config.thresholds.errorRate.warning,
        now
      );
    }

    // 检查CPU使用率
    if (metrics.system.cpu.length > 0) {
      const latestCpu = metrics.system.cpu[metrics.system.cpu.length - 1];

      if (latestCpu > this.config.thresholds.cpu.critical) {
        this.createAlert(
          'system_resource',
          'critical',
          `CPU usage is ${latestCpu.toFixed(2)}%`,
          latestCpu,
          this.config.thresholds.cpu.critical,
          now
        );
      } else if (latestCpu > this.config.thresholds.cpu.warning) {
        this.createAlert(
          'system_resource',
          'medium',
          `CPU usage is ${latestCpu.toFixed(2)}%`,
          latestCpu,
          this.config.thresholds.cpu.warning,
          now
        );
      }
    }

    // 检查内存使用率
    if (metrics.system.memory.length > 0) {
      const latestMemory = metrics.system.memory[metrics.system.memory.length - 1];

      if (latestMemory > this.config.thresholds.memory.critical) {
        this.createAlert(
          'system_resource',
          'critical',
          `Memory usage is ${latestMemory.toFixed(2)}%`,
          latestMemory,
          this.config.thresholds.memory.critical,
          now
        );
      } else if (latestMemory > this.config.thresholds.memory.warning) {
        this.createAlert(
          'system_resource',
          'medium',
          `Memory usage is ${latestMemory.toFixed(2)}%`,
          latestMemory,
          this.config.thresholds.memory.warning,
          now
        );
      }
    }

    // 检查缓存命中率
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate.critical) {
      this.createAlert(
        'cache_hit_rate',
        'critical',
        `Cache hit rate is ${(metrics.cache.hitRate * 100).toFixed(2)}%`,
        metrics.cache.hitRate,
        this.config.thresholds.cacheHitRate.critical,
        now
      );
    } else if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate.warning) {
      this.createAlert(
        'cache_hit_rate',
        'medium',
        `Cache hit rate is ${(metrics.cache.hitRate * 100).toFixed(2)}%`,
        metrics.cache.hitRate,
        this.config.thresholds.cacheHitRate.warning,
        now
      );
    }
  }

  /**
   * 创建告警
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    timestamp: Date
  ): void {
    const alertId = this.generateAlertId();
    const alert: PerformanceAlert = {
      id: alertId,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp,
      resolved: false,
    };

    this.alerts.set(alertId, alert);
    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`);
  }

  /**
   * 计算摘要
   */
  private calculateSummary(metrics: PerformanceMetrics): PerformanceSummary {
    const responseTimes = metrics.api.responseTime;
    const overallScore = this.calculateOverallScore(metrics);

    let p95 = 0,
      p99 = 0;
    if (responseTimes.length > 0) {
      const sorted = [...responseTimes].sort((a, b) => a - b);
      p95 = sorted[Math.floor(sorted.length * 0.95)];
      p99 = sorted[Math.floor(sorted.length * 0.99)];
    }

    return {
      overallScore,
      responseTime: {
        average:
          responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0,
        p95,
        p99,
      },
      throughput: metrics.api.throughput,
      errorRate: metrics.api.errorRate,
      systemHealth: this.getSystemHealth(overallScore),
      keyMetrics: {
        averageResponseTime:
          responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0,
        throughput: metrics.api.throughput,
        errorRate: metrics.api.errorRate,
        cpuUsage:
          metrics.system.cpu.length > 0 ? metrics.system.cpu[metrics.system.cpu.length - 1] : 0,
        memoryUsage:
          metrics.system.memory.length > 0
            ? metrics.system.memory[metrics.system.memory.length - 1]
            : 0,
        cacheHitRate: metrics.cache.hitRate,
      },
    };
  }

  /**
   * 计算详情
   */
  private calculateDetails(metrics: PerformanceMetrics): PerformanceDetails {
    const endpointMetrics = this.calculateEndpointMetrics(metrics);

    return {
      requests: Array.from(metrics.requests.values()),
      system: metrics.system,
      api: metrics.api,
      cache: metrics.cache,
      database: metrics.database,
      endpoints: endpointMetrics,
    };
  }

  /**
   * 计算端点指标
   */
  private calculateEndpointMetrics(metrics: PerformanceMetrics): EndpointMetrics[] {
    const endpointMap = new Map<string, EndpointMetrics>();

    metrics.requests.forEach(request => {
      const key = `${request.method}:${request.url}`;

      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          path: request.url,
          method: request.method,
          count: 0,
          averageResponseTime: 0,
          errorRate: 0,
          statusCodes: {},
        });
      }

      const endpoint = endpointMap.get(key);
      if (!endpoint) {
        return;
      }
      endpoint.count++;
      endpoint.averageResponseTime =
        (endpoint.averageResponseTime * (endpoint.count - 1) + request.duration) / endpoint.count;

      if (request.statusCode >= 400) {
        endpoint.errorRate = (endpoint.errorRate * (endpoint.count - 1) + 1) / endpoint.count;
      }

      endpoint.statusCodes[request.statusCode] =
        (endpoint.statusCodes[request.statusCode] || 0) + 1;
    });

    return Array.from(endpointMap.values());
  }

  /**
   * 计算整体分数
   */
  private calculateOverallScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // 响应时间影响
    if (metrics.api.responseTime.length > 0) {
      const avgResponseTime =
        metrics.api.responseTime.reduce((sum, time) => sum + time, 0) /
        metrics.api.responseTime.length;
      if (avgResponseTime > 2000) score -= 30;
      else if (avgResponseTime > 1000) score -= 20;
      else if (avgResponseTime > 500) score -= 10;
    }

    // 错误率影响
    if (metrics.api.errorRate > 10) score -= 30;
    else if (metrics.api.errorRate > 5) score -= 20;
    else if (metrics.api.errorRate > 1) score -= 10;

    // 系统资源影响
    if (metrics.system.cpu.length > 0) {
      const latestCpu = metrics.system.cpu[metrics.system.cpu.length - 1];
      if (latestCpu > 90) score -= 20;
      else if (latestCpu > 70) score -= 10;
    }

    if (metrics.system.memory.length > 0) {
      const latestMemory = metrics.system.memory[metrics.system.memory.length - 1];
      if (latestMemory > 95) score -= 20;
      else if (latestMemory > 80) score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 获取系统健康状态
   */
  private getSystemHealth(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * 初始化建议
   */
  private initializeRecommendations(): void {
    this.recommendations = [
      {
        id: 'perf_001',
        category: 'performance',
        priority: 'high',
        title: '优化数据库查询',
        description: '优化慢查询可以提高整体响应时间',
        impact: '显著改善响应时间',
        effort: 'medium',
        metrics: ['avgQueryTime', 'slowQueries'],
      },
      {
        id: 'perf_002',
        category: 'performance',
        priority: 'medium',
        title: '增加缓存命中率',
        description: '提高缓存命中率可以减少数据库负载',
        impact: '改善响应时间和系统资源使用',
        effort: 'low',
        metrics: ['cacheHitRate'],
      },
      {
        id: 'perf_003',
        category: 'reliability',
        priority: 'high',
        title: '降低错误率',
        description: '减少API错误可以提高系统可靠性',
        impact: '改善用户体验和系统稳定性',
        effort: 'medium',
        metrics: ['errorRate'],
      },
    ];
  }

  /**
   * 生成报告ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PerformanceMonitor;
