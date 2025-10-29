/**
 * 测试引擎注册器 - 插件管理核心
 * 
 * 负责管理所有测试引擎插件的注册、执行和协调
 */

import {
  ITestEngine,
  TestEngineType,
  TestEngineRegistration,
  BaseTestConfig,
  BaseTestResult,
  TestProgress,
  TestExecutionOptions,
  CompositeTestConfig,
  CompositeTestResult,
  TestStatus,
  ValidationResult
} from '../../shared/types/testEngine.types';

/**
 * 并发限制器 - 控制同时运行的测试数量
 */
class ConcurrencyLimiter {
  private maxConcurrent: number;
  private running: number = 0;
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    // 如果达到并发上限，加入队列等待
    if (this.running >= this.maxConcurrent) {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
      });
    }

    // 执行任务
    this.running++;
    try {
      const result = await task();
      return result;
    } finally {
      this.running--;
      // 处理队列中的下一个任务
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.running++;
      
      task()
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        })
        .finally(() => {
          this.running--;
          this.processQueue();
        });
    }
  }

  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    // 尝试处理队列中的任务
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      this.processQueue();
    }
  }
}

/**
 * 测试引擎注册器单例类
 */
export class TestEngineRegistry {
  private static instance: TestEngineRegistry;
  private engines: Map<TestEngineType, TestEngineRegistration> = new Map();
  private runningTests: Map<string, TestProgress> = new Map();
  private initialized: boolean = false;
  private concurrencyLimiter: ConcurrencyLimiter;

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
  private constructor() {
    // 初始化并发限制器，默认最多同时运行5个测试
    this.concurrencyLimiter = new ConcurrencyLimiter(5);
  }

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
        } catch (error) {
          console.error(`❌ 初始化引擎失败 ${type}:`, error);
          registration.enabled = false;
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
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const registration: TestEngineRegistration = {
      engine,
      priority: options.priority || 0,
      enabled: options.enabled !== false,
      dependencies: options.dependencies,
      metadata: options.metadata
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
    capabilities: any;
  }> {
    const available = [];
    for (const [type, registration] of this.engines) {
      if (registration.enabled) {
        available.push({
          type,
          name: registration.engine.name,
          enabled: registration.enabled,
          capabilities: registration.engine.capabilities
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
        suggestions: []
      };
    }

    if (!registration.enabled) {
      return {
        isValid: false,
        errors: [`测试引擎 ${type} 已禁用`],
        warnings: [],
        suggestions: ['请联系管理员启用此测试引擎']
      };
    }

    // 检查依赖
    if (registration.dependencies) {
      const missingDeps = registration.dependencies.filter(
        dep => !this.engines.get(dep)?.enabled
      );
      if (missingDeps.length > 0) {
        return {
          isValid: false,
          errors: [`缺少依赖的测试引擎: ${missingDeps.join(', ')}`],
          warnings: [],
          suggestions: ['请先启用依赖的测试引擎']
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

    const registration = this.engines.get(type)!;
    const engine = registration.engine;

    // 生成测试ID
    const testId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建进度追踪
    const progress: TestProgress = {
      status: TestStatus.PREPARING,
      progress: 0,
      currentStep: '准备测试环境',
      startTime: new Date(),
      messages: []
    };

    this.runningTests.set(testId, progress);

    // 进度回调包装
    const progressWrapper = (p: TestProgress) => {
      this.runningTests.set(testId, p);
      if (onProgress) {
        onProgress(p);
      }
    };

    try {
      // 执行生命周期钩子
      if (engine.lifecycle?.beforeRun) {
        await engine.lifecycle.beforeRun(config);
      }

      // 执行测试
      const result = await engine.run(config, progressWrapper);

      // 执行生命周期钩子
      if (engine.lifecycle?.afterRun) {
        await engine.lifecycle.afterRun(result);
      }

      // 清理运行状态
      this.runningTests.delete(testId);

      console.log(`✅ 测试引擎 ${type} 执行成功`);
      return result;

    } catch (error) {
      // 错误处理
      if (engine.lifecycle?.onError) {
        await engine.lifecycle.onError(error as Error);
      }

      // 清理运行状态
      this.runningTests.delete(testId);

      console.error(`❌ 测试引擎 ${type} 执行失败:`, error);
      throw error;
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
      const promises = config.engines.map(async (engineType) => {
        try {
          const engineConfig = {
            ...config,
            ...(config.engineConfigs?.[engineType] || {})
          };

          const result = await this.execute(
            engineType,
            engineConfig,
            (progress) => {
              if (options.progressCallback) {
                options.progressCallback(engineType, progress);
              }
            }
          );

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
      });

      // 限制并发数
      if (options.maxConcurrent) {
        // 使用并发限制器执行任务
        const limiter = new ConcurrencyLimiter(options.maxConcurrent);
        const limitedPromises = promises.map(promise => 
          limiter.execute(() => promise)
        );
        await Promise.all(limitedPromises);
        
        console.log(`✅ 并发限制: 最多 ${options.maxConcurrent} 个并发测试`);
      } else {
        await Promise.all(promises);
      }
    } else {
      // 串行执行
      for (const engineType of config.engines) {
        try {
          const engineConfig = {
            ...config,
            ...(config.engineConfigs?.[engineType] || {})
          };

          const result = await this.execute(
            engineType,
            engineConfig,
            (progress) => {
              if (options.progressCallback) {
                options.progressCallback(engineType, progress);
              }
            }
          );

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

    // 计算总分
    let totalScore = 0;
    for (const result of results.values()) {
      totalScore += result.score;
    }
    const overallScore = results.size > 0 ? Math.round(totalScore / results.size) : 0;

    // 收集关键问题
    const criticalIssues = [];
    for (const [engineType, result] of results) {
      if (result.errors && result.errors.length > 0) {
        for (const error of result.errors) {
          criticalIssues.push({
            engine: engineType,
            issue: error,
            severity: 'high' as const
          });
        }
      }
    }

    // 构建组合测试结果
    const compositeResult: CompositeTestResult = {
      testId: `composite_${Date.now()}`,
      engineType: TestEngineType.UNIFIED,
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
          message: e.error.message
        }))
      },
      engineResults: results,
      successCount,
      failureCount,
      skippedCount,
      overallScore,
      criticalIssues,
      errors: errors.map(e => `${e.engine}: ${e.error.message}`),
      warnings: [],
      recommendations: []
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
      throw new Error(`测试 ${testId} 不存在或已完成`);
    }

    // 查找对应的引擎并取消
    for (const [type, registration] of this.engines) {
      try {
        await registration.engine.cancel(testId);
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
      progress
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
      engineTypes: Array.from(this.engines.keys())
    };
  }
}

// 导出单例实例
export default TestEngineRegistry.getInstance();
