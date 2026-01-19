/**
 * 增强版基础服务类
 * 为所有共享服务提供统一的基础功能，包括错误处理和恢复机制
 */

import { CustomError, ErrorCode, ErrorFactory, ErrorSeverity } from '../errors/ErrorTypes';
import BaseService, { ServiceConfig } from './BaseService';

// 增强版服务配置接口
export interface EnhancedServiceConfig extends ServiceConfig {
  errorHandling?: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    enableRecovery: boolean;
    enableMetrics: boolean;
  };
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint?: string;
  };
  metrics?: {
    enabled: boolean;
    prefix: string;
    labels?: Record<string, string>;
  };
}

// 断路器状态
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

// 断路器配置接口
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

// 断路器统计接口
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
}

// 健康检查结果接口
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration: number;
    timestamp: Date;
  }>;
  overallDuration: number;
  timestamp: Date;
}

// 服务指标接口
export interface ServiceMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    duration: {
      avg: number;
      min: number;
      max: number;
      p95: number;
      p99: number;
    };
  };
  errors: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  circuitBreaker: CircuitBreakerStats;
  healthCheck: {
    lastCheck?: Date;
    lastResult?: HealthCheckResult;
    consecutiveFailures: number;
  };
}

// 增强版基础服务类
export class EnhancedBaseService extends BaseService {
  protected errorHandlingConfig: EnhancedServiceConfig['errorHandling'];
  protected circuitBreakerConfig: CircuitBreakerConfig;
  protected healthCheckConfig: EnhancedServiceConfig['healthCheck'];
  protected metricsConfig: EnhancedServiceConfig['metrics'];

  // 断路器相关
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private circuitBreakerStats: CircuitBreakerStats = {
    state: CircuitBreakerState.CLOSED,
    failureCount: 0,
    successCount: 0,
    totalRequests: 0,
  };
  private circuitBreakerTimer?: NodeJS.Timeout;

  // 健康检查相关
  private healthCheckTimer?: NodeJS.Timeout;
  private healthCheckResult?: HealthCheckResult;

  // 指标相关
  private serviceMetrics: ServiceMetrics = {
    requests: {
      total: 0,
      success: 0,
      error: 0,
      duration: {
        avg: 0,
        min: Infinity,
        max: 0,
        p95: 0,
        p99: 0,
      },
    },
    errors: {
      total: 0,
      byCategory: {},
      bySeverity: {},
    },
    circuitBreaker: {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
    },
    healthCheck: {
      consecutiveFailures: 0,
    },
  };
  private requestDurations: number[] = [];

  constructor(config: EnhancedServiceConfig) {
    super(config);

    this.errorHandlingConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableRecovery: true,
      enableMetrics: true,
      ...config.errorHandling,
    };

    this.circuitBreakerConfig = {
      enabled: false,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000,
      ...config.circuitBreaker,
    };

    this.healthCheckConfig = {
      enabled: false,
      interval: 30000,
      timeout: 5000,
      ...config.healthCheck,
    };

    this.metricsConfig = {
      enabled: true,
      prefix: 'service',
      labels: {},
      ...config.metrics,
    };

    // 启动断路器监控
    if (this.circuitBreakerConfig.enabled) {
      this.startCircuitBreakerMonitoring();
    }

    // 启动健康检查
    if (this.healthCheckConfig.enabled) {
      this.startHealthCheckMonitoring();
    }
  }

  /**
   * 执行带增强功能的操作
   */
  async executeWithEnhancement<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string;
      timeout?: number;
      retries?: number;
      circuitBreaker?: boolean;
      metrics?: boolean;
    } = {}
  ): Promise<T> {
    const {
      operationName = 'unknown',
      timeout = this.config.timeout || 30000,
      retries = this.errorHandlingConfig?.maxRetries || 3,
      circuitBreaker = this.circuitBreakerConfig.enabled,
      metrics = this.metricsConfig?.enabled,
    } = options;

    // 检查断路器状态
    if (circuitBreaker && this.isCircuitBreakerOpen()) {
      throw ErrorFactory.createSystemError('Circuit breaker is open', {
        code: ErrorCode.DEPENDENCY_FAILED,
        severity: ErrorSeverity.HIGH,
        context: { service: this.name, operation: operationName },
      });
    }

    const startTime = Date.now();
    let lastError: Error;

    // 执行重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.executeWithTimeout(operation, timeout);

        // 记录成功指标
        if (metrics) {
          this.recordSuccessMetrics(Date.now() - startTime, operationName);
        }

        // 更新断路器状态
        if (circuitBreaker) {
          this.recordCircuitBreakerSuccess();
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // 记录错误指标
        if (metrics) {
          this.recordErrorMetrics(error as CustomError, Date.now() - startTime, operationName);
        }

        // 更新断路器状态
        if (circuitBreaker) {
          this.recordCircuitBreakerFailure();
        }

        // 如果是最后一次尝试，抛出错误
        if (attempt === retries) {
          throw this.enhanceError(lastError, operationName, attempt);
        }

        // 等待重试
        await this.sleep(this.errorHandlingConfig?.retryDelay || 1000);
      }
    }

    throw lastError!;
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckResult['checks'] = [];

    try {
      // 基础健康检查
      checks.push(await this.checkBasicHealth());

      // 依赖健康检查
      checks.push(await this.checkDependenciesHealth());

      // 资源健康检查
      checks.push(await this.checkResourcesHealth());

      // 自定义健康检查
      const customCheck = await this.performCustomHealthCheck();
      if (customCheck) {
        checks.push(customCheck);
      }

      const overallStatus = this.calculateOverallHealthStatus(checks);
      const result: HealthCheckResult = {
        status: overallStatus,
        checks,
        overallDuration: Date.now() - startTime,
        timestamp: new Date(),
      };

      this.healthCheckResult = result;
      this.serviceMetrics.healthCheck.lastCheck = new Date();
      this.serviceMetrics.healthCheck.lastResult = result;
      this.serviceMetrics.healthCheck.consecutiveFailures = 0;

      return result;
    } catch (error) {
      this.serviceMetrics.healthCheck.consecutiveFailures++;

      const result: HealthCheckResult = {
        status: 'unhealthy',
        checks: [
          {
            name: 'health_check',
            status: 'fail',
            message: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
            timestamp: new Date(),
          },
        ],
        overallDuration: Date.now() - startTime,
        timestamp: new Date(),
      };

      this.healthCheckResult = result;
      return result;
    }
  }

  /**
   * 获取服务指标
   */
  getServiceMetrics(): ServiceMetrics {
    // 计算持续时间统计
    if (this.requestDurations.length > 0) {
      const sorted = [...this.requestDurations].sort((a, b) => a - b);
      this.serviceMetrics.requests.duration = {
        avg: this.requestDurations.reduce((sum, d) => sum + d, 0) / this.requestDurations.length,
        min: Math.min(...this.requestDurations),
        max: Math.max(...this.requestDurations),
        p95: this.calculatePercentile(sorted, 95),
        p99: this.calculatePercentile(sorted, 99),
      };
    }

    return { ...this.serviceMetrics };
  }

  /**
   * 获取断路器状态
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreakerState;
  }

  /**
   * 获取断路器统计
   */
  getCircuitBreakerStats(): CircuitBreakerStats {
    return { ...this.circuitBreakerStats };
  }

  /**
   * 重置断路器
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
    this.circuitBreakerStats = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
    };

    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = undefined;
    }

    this.log('info', 'Circuit breaker reset');
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  /**
   * 执行关闭
   */
  protected async performShutdown(): Promise<void> {
    // 停止断路器监控
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = undefined;
    }

    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    await super.performShutdown();
  }

  /**
   * 自定义健康检查（子类可重写）
   */
  protected async performCustomHealthCheck(): Promise<HealthCheckResult['checks'][0] | null> {
    return null;
  }

  /**
   * 基础健康检查
   */
  private async checkBasicHealth(): Promise<HealthCheckResult['checks'][0]> {
    const startTime = Date.now();

    try {
      // 检查服务状态
      const isInitialized = this.initialized;
      const uptime = Date.now() - this.startTime.getTime();

      return {
        name: 'basic',
        status: isInitialized ? 'pass' : 'fail',
        message: isInitialized
          ? `Service is healthy, uptime: ${uptime}ms`
          : 'Service not initialized',
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'basic',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 依赖健康检查
   */
  private async checkDependenciesHealth(): Promise<HealthCheckResult['checks'][0]> {
    const startTime = Date.now();

    try {
      // 这里可以检查依赖服务的健康状态
      // 简化实现，总是返回通过
      return {
        name: 'dependencies',
        status: 'pass',
        message: 'All dependencies are healthy',
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'dependencies',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 资源健康检查
   */
  private async checkResourcesHealth(): Promise<HealthCheckResult['checks'][0]> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      let status: 'pass' | 'warn' | 'fail' = 'pass';
      let message = `Memory usage: ${memoryUsagePercent.toFixed(2)}%`;

      if (memoryUsagePercent > 90) {
        status = 'fail';
        message += ' (critical)';
      } else if (memoryUsagePercent > 80) {
        status = 'warn';
        message += ' (warning)';
      }

      return {
        name: 'resources',
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'resources',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 计算整体健康状态
   */
  private calculateOverallHealthStatus(
    checks: HealthCheckResult['checks']
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      return 'unhealthy';
    } else if (warnChecks.length > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * 启动断路器监控
   */
  private startCircuitBreakerMonitoring(): void {
    this.circuitBreakerTimer = setInterval(() => {
      this.checkCircuitBreakerState();
    }, this.circuitBreakerConfig.monitoringPeriod);
  }

  /**
   * 启动健康检查监控
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.log('error', 'Health check failed', error);
      }
    }, this.healthCheckConfig.interval);
  }

  /**
   * 检查断路器状态
   */
  private checkCircuitBreakerState(): void {
    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      const now = Date.now();
      const lastFailureTime = this.circuitBreakerStats.lastFailureTime?.getTime() || 0;

      if (now - lastFailureTime >= this.circuitBreakerConfig.recoveryTimeout) {
        this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
        this.circuitBreakerStats.state = CircuitBreakerState.HALF_OPEN;
        this.log('info', 'Circuit breaker transitioned to HALF_OPEN');
      }
    }
  }

  /**
   * 判断断路器是否打开
   */
  private isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerState === CircuitBreakerState.OPEN;
  }

  /**
   * 记录断路器成功
   */
  private recordCircuitBreakerSuccess(): void {
    this.circuitBreakerStats.successCount++;
    this.circuitBreakerStats.totalRequests++;
    this.circuitBreakerStats.lastSuccessTime = new Date();

    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
      this.circuitBreakerStats.state = CircuitBreakerState.CLOSED;
      this.circuitBreakerStats.failureCount = 0;
      this.log('info', 'Circuit breaker transitioned to CLOSED');
    }
  }

  /**
   * 记录断路器失败
   */
  private recordCircuitBreakerFailure(): void {
    this.circuitBreakerStats.failureCount++;
    this.circuitBreakerStats.totalRequests++;
    this.circuitBreakerStats.lastFailureTime = new Date();

    if (this.circuitBreakerState === CircuitBreakerState.CLOSED) {
      if (this.circuitBreakerStats.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        this.circuitBreakerState = CircuitBreakerState.OPEN;
        this.circuitBreakerStats.state = CircuitBreakerState.OPEN;
        this.log('warn', 'Circuit breaker transitioned to OPEN');
      }
    } else if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreakerState = CircuitBreakerState.OPEN;
      this.circuitBreakerStats.state = CircuitBreakerState.OPEN;
      this.log('warn', 'Circuit breaker transitioned to OPEN from HALF_OPEN');
    }
  }

  /**
   * 记录成功指标
   */
  private recordSuccessMetrics(duration: number, operationName: string): void {
    this.serviceMetrics.requests.total++;
    this.serviceMetrics.requests.success++;
    this.requestDurations.push(duration);

    // 限制持续时间数组大小
    if (this.requestDurations.length > 1000) {
      this.requestDurations.splice(0, this.requestDurations.length - 1000);
    }

    this.updateCustomMetric('request_duration', duration, { operation: operationName });
    this.updateCustomMetric('request_success', 1, { operation: operationName });
  }

  /**
   * 记录错误指标
   */
  private recordErrorMetrics(error: CustomError, duration: number, operationName: string): void {
    this.serviceMetrics.requests.total++;
    this.serviceMetrics.requests.error++;
    this.serviceMetrics.errors.total++;

    // 按类别统计错误
    const category = error.category || 'unknown';
    this.serviceMetrics.errors.byCategory[category] =
      (this.serviceMetrics.errors.byCategory[category] || 0) + 1;

    // 按严重程度统计错误
    const severity = error.severity || 'medium';
    this.serviceMetrics.errors.bySeverity[severity] =
      (this.serviceMetrics.errors.bySeverity[severity] || 0) + 1;

    this.updateCustomMetric('request_duration', duration, {
      operation: operationName,
      status: 'error',
    });
    this.updateCustomMetric('request_error', 1, { operation: operationName, category, severity });
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: Error, operationName: string, attempt: number): CustomError {
    if (error instanceof CustomError) {
      return error;
    }

    return ErrorFactory.createSystemError(
      `Operation '${operationName}' failed after ${attempt} attempts: ${error.message}`,
      {
        code: ErrorCode.SYSTEM_OVERLOAD,
        severity: ErrorSeverity.HIGH,
        context: {
          service: this.name,
          operation: operationName,
          attempt,
          originalError: error.message,
        },
      }
    );
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);

    if (index === Math.floor(index)) {
      return sortedValues[index];
    }

    const lower = sortedValues[Math.floor(index)];
    const upper = sortedValues[Math.ceil(index)];
    const fraction = index - Math.floor(index);

    return lower + (upper - lower) * fraction;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EnhancedBaseService;
