/**
 * 测试引擎注册器 - 插件管理核心
 *
 * 负责管理所有测试引擎插件的注册、执行和协调
 */

import {
  BaseTestConfig,
  BaseTestResult,
  CompositeTestConfig,
  CompositeTestResult,
  ITestEngine,
  TestEngineRegistration,
  TestEngineType,
  TestExecutionOptions,
  TestProgress,
  TestStatus,
  ValidationResult,
} from '../../../shared/types/testEngine.types';
import { query } from '../config/database';
import {
  getQueueConcurrencySummary,
  getQueueName,
  getQueueSummary,
} from '../testing/services/TestQueueService';
import { broadcastTestEvent } from '../websocket/testEngineHandler';

/**
 * 测试引擎注册器单例类
 */
export class TestEngineRegistry {
  private static instance: TestEngineRegistry;
  private engines: Map<TestEngineType, TestEngineRegistration> = new Map();
  private runningTests: Map<string, TestProgress> = new Map();
  private engineActiveCounts: Map<TestEngineType, number> = new Map();
  private engineLastErrors: Map<TestEngineType, string | null> = new Map();
  private engineLastStatuses: Map<TestEngineType, string> = new Map();
  private initialized: boolean = false;

  /**
   * 获取注册器实例（单例模式）
   */
  public static getInstance(): TestEngineRegistry {
    if (!TestEngineRegistry.instance) {
      TestEngineRegistry.instance = new TestEngineRegistry();
    }
    return TestEngineRegistry.instance;
  }

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 初始化注册器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ 注册器已经初始化');
      return;
    }

    console.log('🚀 开始初始化测试引擎注册器...');

    // 初始化所有已注册的引擎
    for (const [type, registration] of this.engines) {
      if (registration.enabled) {
        try {
          await registration.engine.initialize();
          console.log(`✅ 初始化引擎: ${type}`);
          await this.persistEngineStatus(type, registration, {
            status: 'healthy',
            lastError: null,
          });
        } catch (error) {
          console.error(`❌ 初始化引擎失败 ${type}:`, error);
          registration.enabled = false;
          await this.persistEngineStatus(type, registration, {
            status: 'down',
            lastError: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.initialized = true;
    console.log('✅ 测试引擎注册器初始化完成');
  }

  /**
   * 注册测试引擎
   */
  public register(
    engine: ITestEngine,
    options: {
      priority?: number;
      enabled?: boolean;
      dependencies?: TestEngineType[];
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const registration: TestEngineRegistration = {
      engine,
      priority: options.priority || 0,
      enabled: options.enabled !== false,
      dependencies: options.dependencies,
      metadata: options.metadata,
    };

    // 验证依赖关系
    if (registration.dependencies) {
      for (const dep of registration.dependencies) {
        if (!this.engines.has(dep)) {
          console.warn(`⚠️ 引擎 ${engine.type} 依赖 ${dep}，但 ${dep} 尚未注册`);
        }
      }
    }

    this.engines.set(engine.type, registration);
    console.log(`✅ 注册测试引擎: ${engine.type} (${engine.name})`);
    void this.persistEngineStatus(engine.type, registration, {
      status: registration.enabled ? 'unknown' : 'maintenance',
      lastError: null,
    });
  }

  /**
   * 注销测试引擎
   */
  public unregister(type: TestEngineType): boolean {
    const registration = this.engines.get(type);
    if (!registration) {
      return false;
    }

    // 清理引擎资源
    if (registration.engine.lifecycle?.cleanup) {
      registration.engine.lifecycle.cleanup().catch(error => {
        console.error(`清理引擎 ${type} 时出错:`, error);
      });
    }

    return this.engines.delete(type);
  }

  /**
   * 获取测试引擎
   */
  public getEngine(type: TestEngineType): ITestEngine | undefined {
    return this.engines.get(type)?.engine;
  }

  /**
   * 获取所有可用的测试引擎
   */
  public getAvailableEngines(): Array<{
    type: TestEngineType;
    name: string;
    enabled: boolean;
    capabilities: unknown;
  }> {
    const available = [];
    for (const [type, registration] of this.engines) {
      if (registration.enabled) {
        available.push({
          type,
          name: registration.engine.name,
          enabled: registration.enabled,
          capabilities: registration.engine.capabilities,
        });
      }
    }
    return available;
  }

  /**
   * 验证测试配置
   */
  public validate(type: TestEngineType, config: BaseTestConfig): ValidationResult {
    const registration = this.engines.get(type);
    if (!registration) {
      return {
        isValid: false,
        errors: [`测试引擎 ${type} 未注册`],
        warnings: [],
        suggestions: [],
      };
    }

    if (!registration.enabled) {
      return {
        isValid: false,
        errors: [`测试引擎 ${type} 已禁用`],
        warnings: [],
        suggestions: ['请联系管理员启用此测试引擎'],
      };
    }

    // 检查依赖
    if (registration.dependencies) {
      const missingDeps = registration.dependencies.filter(dep => !this.engines.get(dep)?.enabled);
      if (missingDeps.length > 0) {
        return {
          isValid: false,
          errors: [`缺少依赖的测试引擎: ${missingDeps.join(', ')}`],
          warnings: [],
          suggestions: ['请先启用依赖的测试引擎'],
        };
      }
    }

    // 调用引擎自身的验证
    return registration.engine.validate(config);
  }

  /**
   * 执行单个测试引擎
   */
  public async execute(
    type: TestEngineType,
    config: BaseTestConfig,
    onProgress?: (progress: TestProgress) => void
  ): Promise<BaseTestResult> {
    console.log(`🚀 执行测试引擎: ${type}`);

    // 验证配置
    const validation = this.validate(type, config);
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings?.length) {
      console.warn(`⚠️ 测试配置警告: ${validation.warnings.join('; ')}`);
    }

    const registration = this.engines.get(type);
    if (!registration) {
      throw new Error(`测试引擎 ${type} 未注册`);
    }
    const engine = registration.engine;
    this.bumpActiveCount(type, 1);
    await this.persistEngineStatus(type, registration, {
      status: registration.enabled ? 'healthy' : 'maintenance',
      lastError: null,
    });

    const metadata = (config.metadata || {}) as Record<string, unknown>;
    const metadataTestId = typeof metadata.testId === 'string' ? metadata.testId : undefined;
    const configTestId = (config as { testId?: string }).testId;
    const testId = configTestId || metadataTestId;
    if (!testId) {
      throw new Error('测试配置缺少 testId');
    }

    // 创建进度追踪
    const progress: TestProgress = {
      status: TestStatus.PREPARING,
      progress: 0,
      currentStep: '准备测试环境',
      startTime: new Date(),
      messages: [],
    };

    this.runningTests.set(testId, progress);

    // 进度回调包装
    const progressWrapper = (p: TestProgress) => {
      this.runningTests.set(testId, p);
      if (onProgress) {
        onProgress(p);
      }
    };

    // executionTimeout 是整体测试执行超时，与单次请求 timeout 区分
    // 如果未显式设置 executionTimeout，则根据 iterations * timeout 动态计算，留足余量
    const cfgAny = config as Record<string, unknown>;
    let timeoutMs =
      typeof cfgAny.executionTimeout === 'number' && cfgAny.executionTimeout > 0
        ? cfgAny.executionTimeout
        : 0;
    if (!timeoutMs) {
      const durationSec =
        typeof cfgAny.duration === 'number' && cfgAny.duration > 0 ? cfgAny.duration : 0;
      if (durationSec > 0) {
        // 压力测试等基于 duration 的引擎：整体超时 = duration + 60s（rampUp + 结果分析余量）
        timeoutMs = durationSec * 1000 + 60000;
      } else {
        const perRequestTimeout =
          typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : 30000;
        const iterations =
          typeof cfgAny.iterations === 'number' && cfgAny.iterations > 0 ? cfgAny.iterations : 3;
        // 整体超时 = 迭代次数 * 单次超时 * 2（余量）+ 30s（初始化/资源分析开销）
        timeoutMs = iterations * perRequestTimeout * 2 + 30000;
      }
    }

    const runWithTimeout = async () => {
      if (!timeoutMs) {
        return engine.run(config, progressWrapper);
      }

      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutError = new Error(`测试执行超时(${timeoutMs}ms)`);
      timeoutError.name = 'TestTimeoutError';

      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(timeoutError), timeoutMs);
      });

      try {
        return await Promise.race([engine.run(config, progressWrapper), timeoutPromise]);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    };

    try {
      // 执行生命周期钩子
      if (engine.lifecycle?.beforeRun) {
        await engine.lifecycle.beforeRun(config);
      }

      // 执行测试
      const result = await runWithTimeout();

      // 执行生命周期钩子
      if (engine.lifecycle?.afterRun) {
        await engine.lifecycle.afterRun(result);
      }

      // 清理运行状态
      this.runningTests.delete(testId);
      this.bumpActiveCount(type, -1);
      await this.persistEngineStatus(type, registration, {
        status: registration.enabled ? 'healthy' : 'maintenance',
        lastError: null,
      });

      console.log(`✅ 测试引擎 ${type} 执行成功`);
      return result;
    } catch (error) {
      if ((error as Error).name === 'TestTimeoutError') {
        const timeoutProgress: TestProgress = {
          ...progress,
          status: TestStatus.FAILED,
          progress: 100,
          currentStep: '测试超时',
          messages: [...progress.messages, '测试执行超时'],
        };
        progressWrapper(timeoutProgress);
        try {
          await engine.cancel(testId);
        } catch (cancelError) {
          console.warn(`取消超时测试失败: ${testId}`, cancelError);
        }
      }

      // 错误处理
      if (engine.lifecycle?.onError) {
        await engine.lifecycle.onError(error as Error);
      }

      // 清理运行状态
      this.runningTests.delete(testId);
      this.bumpActiveCount(type, -1);
      await this.persistEngineStatus(type, registration, {
        status: 'degraded',
        lastError: error instanceof Error ? error.message : String(error),
      });

      console.error(`❌ 测试引擎 ${type} 执行失败:`, error);
      throw error;
    }
  }

  private bumpActiveCount(type: TestEngineType, delta: number) {
    const current = this.engineActiveCounts.get(type) || 0;
    const next = Math.max(0, current + delta);
    this.engineActiveCounts.set(type, next);
  }

  private getTotalActiveTests() {
    let total = 0;
    for (const count of this.engineActiveCounts.values()) {
      total += count;
    }
    return total;
  }

  private buildEngineStatusPayload(
    queueSummary: Record<string, { waiting: number; delayed: number }>,
    queueConcurrency: Record<string, number>
  ) {
    const engines = Array.from(this.engines.entries()).map(([engineType, registration]) => {
      const activeTests = this.engineActiveCounts.get(engineType) || 0;
      const lastError = this.engineLastErrors.get(engineType) || null;
      const status =
        this.engineLastStatuses.get(engineType) ||
        (registration.enabled ? 'healthy' : 'maintenance');
      const maxConcurrent =
        typeof registration.engine.capabilities?.maxConcurrent === 'number'
          ? registration.engine.capabilities.maxConcurrent
          : 1;
      const queueName = getQueueName(engineType);
      const queueCounts = queueSummary[queueName];
      const queueLength = (queueCounts?.waiting || 0) + (queueCounts?.delayed || 0);
      return {
        engineType,
        engineName: registration.engine.name,
        version: registration.engine.version,
        status,
        activeTests,
        queueLength,
        maxConcurrent,
        isEnabled: registration.enabled,
        lastError,
        lastHeartbeat: Date.now(),
      };
    });
    return {
      isOnline: true,
      activeTests: this.getTotalActiveTests(),
      engines,
      queueSummary,
      queueConcurrency,
    };
  }

  private async persistEngineStatus(
    type: TestEngineType,
    registration: TestEngineRegistration,
    overrides: { status?: string; lastError?: string | null } = {}
  ) {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return;
    }
    const engine = registration.engine;
    const activeTests = this.engineActiveCounts.get(type) || 0;
    const maxConcurrent =
      typeof engine.capabilities?.maxConcurrent === 'number'
        ? engine.capabilities.maxConcurrent
        : 1;
    const queueSummary = await getQueueSummary();
    const queueConcurrency = getQueueConcurrencySummary();
    const queueName = getQueueName(type);
    const queueCounts = queueSummary[queueName];
    const queueLength = (queueCounts?.waiting || 0) + (queueCounts?.delayed || 0);
    const payload = {
      engineName: engine.name,
      engineType: type,
      version: engine.version,
      status: overrides.status || (registration.enabled ? 'healthy' : 'maintenance'),
      lastHeartbeat: new Date(),
      activeTests,
      queueLength,
      maxConcurrentTests: maxConcurrent,
      isEnabled: registration.enabled,
      lastError: overrides.lastError ?? null,
    };
    this.engineLastErrors.set(type, payload.lastError);
    this.engineLastStatuses.set(type, payload.status);

    try {
      await query(
        `INSERT INTO engine_status (
           engine_name, engine_type, version, status, last_heartbeat,
           active_tests, queue_length, max_concurrent_tests, is_enabled, last_error, error_count
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (engine_name, engine_type)
         DO UPDATE SET
           version = EXCLUDED.version,
           status = EXCLUDED.status,
           last_heartbeat = EXCLUDED.last_heartbeat,
           active_tests = EXCLUDED.active_tests,
           queue_length = EXCLUDED.queue_length,
           max_concurrent_tests = EXCLUDED.max_concurrent_tests,
           is_enabled = EXCLUDED.is_enabled,
           last_error = COALESCE(EXCLUDED.last_error, engine_status.last_error),
           error_count = engine_status.error_count +
             CASE WHEN EXCLUDED.last_error IS NULL THEN 0 ELSE 1 END,
           updated_at = NOW()`,
        [
          payload.engineName,
          payload.engineType,
          payload.version,
          payload.status,
          payload.lastHeartbeat,
          payload.activeTests,
          payload.queueLength,
          payload.maxConcurrentTests,
          payload.isEnabled,
          payload.lastError,
          payload.lastError ? 1 : 0,
        ]
      );
      broadcastTestEvent.engineStatus(
        this.buildEngineStatusPayload(queueSummary, queueConcurrency)
      );
    } catch (error) {
      console.warn('⚠️ engine_status 落库失败，已忽略:', error);
    }
  }

  /**
   * 执行组合测试（多个引擎）
   */
  public async executeComposite(
    config: CompositeTestConfig,
    options: TestExecutionOptions = {}
  ): Promise<CompositeTestResult> {
    const startTime = new Date();
    const results = new Map<TestEngineType, BaseTestResult>();
    const errors: Array<{ engine: TestEngineType; error: Error }> = [];

    // 根据是否并行执行选择策略
    if (options.parallel) {
      // 并行执行
      const runEngine = async (engineType: TestEngineType) => {
        try {
          const engineConfig = {
            ...config,
            ...(config.engineConfigs?.[engineType] || {}),
          };

          const result = await this.execute(engineType, engineConfig, progress => {
            if (options.progressCallback) {
              options.progressCallback(engineType, progress);
            }
          });

          results.set(engineType, result);

          if (options.completionCallback) {
            options.completionCallback(engineType, result);
          }
        } catch (error) {
          errors.push({ engine: engineType, error: error as Error });

          if (options.errorCallback) {
            options.errorCallback(engineType, error as Error);
          }

          if (!options.continueOnError) {
            throw error;
          }
        }
      };

      const maxConcurrent = options.maxConcurrent ? Math.max(1, options.maxConcurrent) : null;
      if (maxConcurrent) {
        let queueIndex = 0;
        let firstError: Error | null = null;
        let shouldStop = false;

        const workers = Array.from(
          { length: Math.min(maxConcurrent, config.engines.length) },
          async () => {
            while (queueIndex < config.engines.length && !shouldStop) {
              const engineType = config.engines[queueIndex++];
              try {
                await runEngine(engineType);
              } catch (error) {
                if (!options.continueOnError) {
                  shouldStop = true;
                  if (!firstError) {
                    firstError = error as Error;
                  }
                }
              }
            }
          }
        );

        await Promise.all(workers);

        if (firstError) {
          throw firstError;
        }
      } else {
        const promises = config.engines.map(engineType => runEngine(engineType));
        await Promise.all(promises);
      }
    } else {
      // 串行执行
      for (const engineType of config.engines) {
        try {
          const engineConfig = {
            ...config,
            ...(config.engineConfigs?.[engineType] || {}),
          };

          const result = await this.execute(engineType, engineConfig, progress => {
            if (options.progressCallback) {
              options.progressCallback(engineType, progress);
            }
          });

          results.set(engineType, result);

          if (options.completionCallback) {
            options.completionCallback(engineType, result);
          }
        } catch (error) {
          errors.push({ engine: engineType, error: error as Error });

          if (options.errorCallback) {
            options.errorCallback(engineType, error as Error);
          }

          if (!options.continueOnError) {
            break;
          }
        }
      }
    }

    // 计算综合结果
    const endTime = new Date();
    const successCount = results.size;
    const failureCount = errors.length;
    const skippedCount = config.engines.length - successCount - failureCount;

    // W7: 加权综合评分（不同引擎类型有不同权重）
    const ENGINE_WEIGHTS: Partial<Record<TestEngineType, number>> = {
      [TestEngineType.PERFORMANCE]: 0.3,
      [TestEngineType.SEO]: 0.2,
      [TestEngineType.ACCESSIBILITY]: 0.25,
      [TestEngineType.UX]: 0.25,
      [TestEngineType.SECURITY]: 0.3,
      [TestEngineType.STRESS]: 0.2,
      [TestEngineType.COMPATIBILITY]: 0.2,
    };
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [engineType, result] of results) {
      const w = ENGINE_WEIGHTS[engineType] ?? 0.25;
      weightedSum += result.score * w;
      totalWeight += w;
    }
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // 收集关键问题
    const criticalIssues = [];
    for (const [engineType, result] of results) {
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          criticalIssues.push({
            engine: engineType,
            issue: error,
            severity: 'high' as const,
          });
        }
      }
    }

    // W7: 收集子引擎 recommendations 和 warnings
    const allRecommendations: string[] = [];
    const allWarnings: string[] = [];
    const seenRecs = new Set<string>();
    for (const [engineType, result] of results) {
      if (result.recommendations) {
        for (const rec of result.recommendations) {
          const key = rec.slice(0, 60);
          if (!seenRecs.has(key)) {
            seenRecs.add(key);
            allRecommendations.push(`[${engineType}] ${rec}`);
          }
        }
      }
      if (result.warnings) {
        for (const warn of result.warnings) {
          allWarnings.push(`[${engineType}] ${warn}`);
        }
      }
    }

    // 构建组合测试结果
    const compositeEngineType = config.engines.includes(TestEngineType.INFRASTRUCTURE)
      ? TestEngineType.INFRASTRUCTURE
      : TestEngineType.WEBSITE;

    const compositeResult: CompositeTestResult = {
      testId: `composite_${Date.now()}`,
      engineType: compositeEngineType,
      status: errors.length === 0 ? TestStatus.COMPLETED : TestStatus.FAILED,
      score: overallScore,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      summary: `完成 ${successCount}/${config.engines.length} 个测试`,
      details: {
        engines: config.engines,
        results: Object.fromEntries(results),
        errors: errors.map(e => ({
          engine: e.engine,
          message: e.error.message,
        })),
      },
      engineResults: results,
      successCount,
      failureCount,
      skippedCount,
      overallScore,
      criticalIssues,
      errors: errors.map(e => `${e.engine}: ${e.error.message}`),
      warnings: allWarnings,
      recommendations: allRecommendations.slice(0, 20),
    };

    console.log(`✅ 组合测试完成: ${successCount}/${config.engines.length} 成功`);
    return compositeResult;
  }

  /**
   * 取消正在运行的测试
   */
  public async cancel(testId: string): Promise<void> {
    const progress = this.runningTests.get(testId);
    if (!progress) {
      return;
    }

    this.runningTests.set(testId, {
      ...progress,
      status: TestStatus.CANCELLED,
      currentStep: '已取消',
    });

    // 查找对应的引擎并取消
    for (const [_type, registration] of this.engines) {
      try {
        await registration.engine.cancel(testId);
        if (registration.engine.lifecycle?.onCancel) {
          await registration.engine.lifecycle.onCancel();
        }
        console.log(`✅ 已取消测试: ${testId}`);
        break;
      } catch {
        // 继续尝试其他引擎
      }
    }

    this.runningTests.delete(testId);
  }

  /**
   * 获取测试状态
   */
  public getTestStatus(testId: string): TestProgress | undefined {
    return this.runningTests.get(testId);
  }

  /**
   * 获取所有运行中的测试
   */
  public getRunningTests(): Array<{ testId: string; progress: TestProgress }> {
    return Array.from(this.runningTests.entries()).map(([testId, progress]) => ({
      testId,
      progress,
    }));
  }

  /**
   * 清理所有资源
   */
  public async cleanup(): Promise<void> {
    // 取消所有运行中的测试
    for (const testId of this.runningTests.keys()) {
      try {
        await this.cancel(testId);
      } catch (error) {
        console.error(`清理测试 ${testId} 失败:`, error);
      }
    }

    // 清理所有引擎
    for (const [type, registration] of this.engines) {
      if (registration.engine.lifecycle?.cleanup) {
        try {
          await registration.engine.lifecycle.cleanup();
          console.log(`✅ 清理引擎: ${type}`);
        } catch (error) {
          console.error(`清理引擎 ${type} 失败:`, error);
        }
      }
    }

    this.engines.clear();
    this.runningTests.clear();
    this.initialized = false;

    console.log('✅ 测试引擎注册器清理完成');
  }

  /**
   * 获取注册器统计信息
   */
  public getStats(): {
    totalEngines: number;
    enabledEngines: number;
    runningTests: number;
    engineTypes: TestEngineType[];
  } {
    const enabledEngines = Array.from(this.engines.values()).filter(r => r.enabled).length;

    return {
      totalEngines: this.engines.size,
      enabledEngines,
      runningTests: this.runningTests.size,
      engineTypes: Array.from(this.engines.keys()),
    };
  }
}

// 导出单例实例
const registryInstance = TestEngineRegistry.getInstance();

export default registryInstance;
