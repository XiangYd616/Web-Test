/**
 * 基础服务类
 * 提供所有共享服务的公共接口和通用功能
 */

import {
  CustomError,
  ErrorCategory,
  ErrorCode,
  ErrorFactory,
  ErrorSeverity,
} from '../errors/ErrorTypes';

// 服务状态枚举
export enum ServiceStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN = 'shutdown',
}

// 服务配置接口
export interface ServiceConfig {
  name: string;
  version?: string;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  metrics?: {
    enabled: boolean;
    interval: number;
  };
}

// 服务健康状态接口
export interface ServiceHealth {
  status: ServiceStatus;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  lastError?: {
    message: string;
    timestamp: Date;
    code: string;
  };
  dependencies: Record<string, boolean>;
  metrics?: Record<string, unknown>;
}

// 服务依赖接口
export interface ServiceDependency {
  name: string;
  required: boolean;
  version?: string;
  check: () => Promise<boolean>;
}

// 服务事件接口
export interface ServiceEvent {
  type: 'initialized' | 'error' | 'shutdown' | 'metrics';
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: CustomError;
}

// 服务指标接口
export interface ServiceMetrics {
  requests: {
    total: number;
    success: number;
    error: number;
    averageResponseTime: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  custom: Record<string, number>;
}

// 抽象服务基类
export abstract class BaseService {
  protected name: string;
  protected version: string;
  protected status: ServiceStatus;
  protected initialized: boolean;
  protected dependencies: ServiceDependency[];
  protected config: ServiceConfig;
  protected startTime: Date;
  protected lastError?: CustomError;
  protected eventListeners: Map<string, Function[]>;
  protected metrics: ServiceMetrics;

  constructor(config: ServiceConfig) {
    this.name = config.name;
    this.version = config.version || '1.0.0';
    this.status = ServiceStatus.UNINITIALIZED;
    this.initialized = false;
    this.dependencies = [];
    this.config = {
      timeout: 30000,
      retries: 3,
      logging: {
        enabled: true,
        level: 'info',
      },
      metrics: {
        enabled: true,
        interval: 60000,
      },
      ...config,
    };
    this.startTime = new Date();
    this.eventListeners = new Map();
    this.metrics = this.initializeMetrics();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    this.setStatus(ServiceStatus.INITIALIZING);

    try {
      await this.checkDependencies();
      await this.performInitialization();
      this.initialized = true;
      this.setStatus(ServiceStatus.READY);
      this.emitEvent('initialized');
      return true;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.lastError = ErrorFactory.fromError(normalizedError, {
        code: ErrorCode.SYSTEM_INIT_FAILED,
        category: ErrorCategory.INITIALIZATION,
        severity: ErrorSeverity.CRITICAL,
        service: this.name,
      });
      this.setStatus(ServiceStatus.ERROR);
      this.emitEvent('error', { error: this.lastError });
      throw this.lastError;
    }
  }

  /**
   * 关闭服务
   */
  async shutdown(): Promise<void> {
    this.setStatus(ServiceStatus.SHUTTING_DOWN);

    try {
      await this.performShutdown();
      this.setStatus(ServiceStatus.SHUTDOWN);
      this.emitEvent('shutdown');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.lastError = ErrorFactory.fromError(normalizedError, {
        service: this.name,
      });
      this.setStatus(ServiceStatus.ERROR);
      throw this.lastError;
    }
  }

  /**
   * 获取服务健康状态
   */
  async getHealth(): Promise<ServiceHealth> {
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    const dependencyStatus: Record<string, boolean> = {};
    for (const dep of this.dependencies) {
      try {
        dependencyStatus[dep.name] = await dep.check();
      } catch {
        dependencyStatus[dep.name] = false;
      }
    }

    return {
      status: this.status,
      uptime: Date.now() - this.startTime.getTime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round(memoryPercentage * 100) / 100,
      },
      lastError: this.lastError
        ? {
            message: this.lastError.message,
            timestamp: this.lastError.timestamp,
            code: this.lastError.code,
          }
        : undefined,
      dependencies: dependencyStatus,
      metrics: this.config.metrics?.enabled
        ? (this.metrics as unknown as Record<string, unknown>)
        : undefined,
    };
  }

  /**
   * 添加依赖
   */
  addDependency(dependency: ServiceDependency): void {
    this.dependencies.push(dependency);
  }

  /**
   * 移除依赖
   */
  removeDependency(name: string): void {
    this.dependencies = this.dependencies.filter(dep => dep.name !== name);
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.push(listener);
    }
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取服务指标
   */
  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * 更新自定义指标
   */
  updateCustomMetric(name: string, value: number, _meta?: Record<string, unknown>): void {
    this.metrics.custom[name] = value;
  }

  /**
   * 记录请求指标
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // 更新平均响应时间
    const total = this.metrics.requests.total;
    const currentAvg = this.metrics.requests.averageResponseTime;
    this.metrics.requests.averageResponseTime = (currentAvg * (total - 1) + responseTime) / total;
  }

  /**
   * 执行带重试的操作
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: {
      retries?: number;
      delay?: number;
      backoff?: number;
    }
  ): Promise<T> {
    const retries = options?.retries ?? this.config.retries ?? 3;
    const delay = options?.delay ?? 1000;
    const backoff = options?.backoff ?? 2;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          throw ErrorFactory.fromError(lastError, {
            service: this.name,
          });
        }

        const waitTime = delay * Math.pow(backoff, attempt);
        await this.sleep(waitTime);
      }
    }

    throw lastError;
  }

  /**
   * 执行带超时的操作
   */
  protected async executeWithTimeout<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
    const timeoutMs = timeout ?? this.config.timeout ?? 30000;

    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            ErrorFactory.createSystemError(`Operation timed out after ${timeoutMs}ms`, {
              code: ErrorCode.NETWORK_TIMEOUT,
              severity: ErrorSeverity.HIGH,
              context: { timeout: timeoutMs },
            })
          );
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * 记录日志
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.logging?.enabled) return;

    const logLevel = this.config.logging.level;
    const levels = ['debug', 'info', 'warn', 'error'];

    if (levels.indexOf(level) >= levels.indexOf(logLevel)) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`;

      switch (level) {
        case 'debug':
        case 'info':
          console.log(logMessage, data || '');
          break;
        case 'warn':
          console.warn(logMessage, data || '');
          break;
        case 'error':
          console.error(logMessage, data || '');
          break;
      }
    }
  }

  /**
   * 抽象方法：执行初始化
   */
  protected abstract performInitialization(): Promise<void>;

  /**
   * 抽象方法：执行关闭
   */
  protected abstract performShutdown(): Promise<void>;

  /**
   * 检查依赖
   */
  private async checkDependencies(): Promise<void> {
    for (const dependency of this.dependencies) {
      try {
        const isAvailable = await dependency.check();
        if (!isAvailable && dependency.required) {
          throw ErrorFactory.createSystemError(
            `Required dependency '${dependency.name}' is not available`,
            {
              code: ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
              severity: ErrorSeverity.CRITICAL,
              context: { dependency: dependency.name },
            }
          );
        }
      } catch (error) {
        if (dependency.required) {
          throw error;
        } else {
          this.log('warn', `Optional dependency '${dependency.name}' is not available`);
        }
      }
    }
  }

  /**
   * 设置服务状态
   */
  private setStatus(status: ServiceStatus): void {
    const oldStatus = this.status;
    this.status = status;

    if (oldStatus !== status) {
      this.log('debug', `Service status changed from ${oldStatus} to ${status}`);
    }
  }

  /**
   * 发出事件
   */
  private emitEvent(type: ServiceEvent['type'], data?: Record<string, unknown>): void {
    const event: ServiceEvent = {
      type,
      timestamp: new Date(),
      data,
      error: type === 'error' ? this.lastError : undefined,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('error', 'Error in event listener', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    }
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): ServiceMetrics {
    return {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        averageResponseTime: 0,
      },
      resources: {
        cpu: 0,
        memory: 0,
        disk: 0,
      },
      custom: {},
    };
  }

  /**
   * 睡眠函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(): {
    name: string;
    version: string;
    status: ServiceStatus;
    initialized: boolean;
    dependencies: string[];
  } {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      initialized: this.initialized,
      dependencies: this.dependencies.map(dep => dep.name),
    };
  }

  /**
   * 重置服务状态
   */
  async reset(): Promise<void> {
    if (this.initialized) {
      await this.shutdown();
    }

    this.initialized = false;
    this.lastError = undefined;
    this.status = ServiceStatus.UNINITIALIZED;
    this.metrics = this.initializeMetrics();

    await this.initialize();
  }
}

export default BaseService;
