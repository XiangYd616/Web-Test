/**
 * 基础测试引擎抽象类
 * 提供所有测试引擎的通用功能和默认实现
 */

const Joi = require('joi');

class BaseTestEngine {
  constructor() {
    this.name = 'base';
    this.version = '1.0.0';
    this.activeTests = new Map();
    this.testHistory = [];
  }

  /**
   * 检查引擎可用性
   * 子类应该重写此方法
   */
  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * 获取引擎能力
   * 子类应该重写此方法
   */
  getCapabilities() {
    return {
      supportedTests: [],
      maxConcurrent: 1,
      timeout: 60000
    };
  }

  /**
   * 验证配置
   * 子类可以重写此方法添加自定义验证
   */
  validateConfig(config) {
    const baseSchema = Joi.object({
      url: Joi.string().uri().optional(),
      timeout: Joi.number().min(1000).max(300000).default(60000)
    });

    const { error, value } = baseSchema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  /**
   * 执行测试
   * 子类必须重写此方法
   */
  async executeTest(config) {
    throw new Error('executeTest 方法必须在子类中实现');
  }

  /**
   * 运行测试的通用方法
   */
  async runTest(config) {
    const testId = `${this.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
        config: validatedConfig
      });

      const results = await this.executeTest(validatedConfig);
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      // 添加到历史记录
      this.testHistory.push({
        testId,
        results,
        timestamp: new Date(),
        config: validatedConfig
      });

      // 限制历史记录大小
      if (this.testHistory.length > 100) {
        this.testHistory.shift();
      }

      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped'
      });
      return true;
    }
    return false;
  }

  /**
   * 获取所有活动测试
   */
  getActiveTests() {
    return Array.from(this.activeTests.entries()).map(([testId, test]) => ({
      testId,
      ...test
    }));
  }

  /**
   * 获取测试历史
   */
  getTestHistory(limit = 10) {
    return this.testHistory.slice(-limit).reverse();
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.activeTests.clear();
    this.testHistory = [];
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        progress,
        message,
        lastUpdate: Date.now()
      });
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(testId) {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`测试 ${testId} 不存在`);
    }

    return {
      testId,
      engineName: this.name,
      engineVersion: this.version,
      timestamp: new Date().toISOString(),
      status: test.status,
      progress: test.progress,
      duration: Date.now() - test.startTime,
      results: test.results,
      config: test.config
    };
}

module.exports = BaseTestEngine;
  abstract readonly type: TestEngineType;
  abstract readonly name;
  abstract readonly version;
  abstract readonly capabilities: TestEngineCapabilities;

  // 可选的生命周期钩子
  lifecycle?: TestEngineLifecycle;

  // 运行中的测试追踪
  protected runningTests: Map<string, {
    config: TConfig;
    startTime: Date;
    abortController?: AbortController;
  }> = new Map();

  // 测试历史记录
  protected testHistory: Array<{
    testId;
    result: TResult;
    timestamp: Date;
  }> = [];

  // 引擎是否已初始化
  protected initialized = false;

  /**
   * 初始化测试引擎
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log(`⚠️ 引擎 ${this.name} 已经初始化`);
      return;
    }

    console.log(`🚀 初始化测试引擎: ${this.name}`);

    // 执行生命周期钩子
    if (this.lifecycle?.beforeInit) {
      await this.lifecycle.beforeInit();
    }

    // 执行具体的初始化逻辑
    await this.onInitialize();

    // 执行生命周期钩子
    if (this.lifecycle?.afterInit) {
      await this.lifecycle.afterInit();
    }

    this.initialized = true;
    console.log(`✅ 测试引擎 ${this.name} 初始化完成`);
  }

  /**
   * 子类可以重写此方法实现具体的初始化逻辑
   */
  protected async onInitialize(): Promise<void> {
    // 默认不执行任何操作
  }

  /**
   * 验证测试配置
   */
  public validate(config: TConfig): ValidationResult {
    const errors[] = [];
    const warnings[] = [];
    const suggestions[] = [];

    // 基础验证
    if (!config) {
      errors.push('配置不能为空');
    }

    // URL验证（如果需要）
    if (this.capabilities.requiredConfig.includes('url')) {
      if (!config.url) {
        errors.push('URL是必需的');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push('URL格式无效');
        }
      }
    }

    // 超时验证
    if (config.timeout !== undefined) {
      if (config.timeout < 1000) {
        warnings.push('超时时间过短，建议至少设置为1000ms');
      }
      if (config.timeout > 300000) {
        warnings.push('超时时间过长，可能影响性能');
      }
    }

    // 调用子类的具体验证逻辑
    const customValidation = this.onValidate(config);
    errors.push(...customValidation.errors);
    warnings.push(...customValidation.warnings);
    suggestions.push(...customValidation.suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 子类可以重写此方法添加具体的验证逻辑
   */
  protected onValidate(config: TConfig): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  /**
   * 运行测试
   */
  public async run(
    config: TConfig,
    onProgress?: (progress: TestProgress) => void
  ): Promise<TResult> {
    // 生成测试ID
    const testId = this.generateTestId();
    const startTime = new Date();

    // 记录运行中的测试
    const abortController = new AbortController();
    this.runningTests.set(testId, {
      config,
      startTime,
      abortController
    });

    // 进度报告辅助函数
    const reportProgress = (
      progress,
      currentStep,
      status: TestStatus = TestStatus.RUNNING
    ) => {
      if (onProgress) {
        const progressData: TestProgress = {
          status,
          progress,
          currentStep,
          startTime,
          estimatedEndTime: this.estimateEndTime(startTime, progress),
          messages: []
        };
        onProgress(progressData);
      }
    };

    try {
      // 报告开始
      reportProgress(0, '准备测试环境', TestStatus.PREPARING);

      // 执行生命周期钩子
      if (this.lifecycle?.beforeRun) {
        await this.lifecycle.beforeRun(config);
      }

      reportProgress(5, '初始化测试', TestStatus.RUNNING);

      // 执行具体的测试逻辑
      const result = await this.onRun(
        testId,
        config,
        (progress, step) => reportProgress(progress, step),
        abortController.signal
      );

      // 执行生命周期钩子
      if (this.lifecycle?.afterRun) {
        await this.lifecycle.afterRun(result);
      }

      // 记录测试历史
      this.testHistory.push({
        testId,
        result,
        timestamp: new Date()
      });

      // 清理运行记录
      this.runningTests.delete(testId);

      // 报告完成
      reportProgress(100, '测试完成', TestStatus.COMPLETED);

      return result;

    } catch (error) {
      // 错误处理
      console.error(`❌ 测试引擎 ${this.name} 执行失败:`, error);

      // 执行生命周期钩子
      if (this.lifecycle?.onError) {
        await this.lifecycle.onError(error as Error);
      }

      // 清理运行记录
      this.runningTests.delete(testId);

      // 报告失败
      reportProgress(0, `测试失败: ${(error as Error).message}`, TestStatus.FAILED);

      // 构建错误结果
      const errorResult: TResult = this.createErrorResult(
        testId,
        config,
        error as Error,
        startTime
      );

      return errorResult;
    }
  }

  /**
   * 子类必须实现具体的测试逻辑
   */
  protected abstract onRun(
    testId,
    config: TConfig,
    onProgress: (progress, currentStep) => void,
    signal: AbortSignal
  ): Promise<TResult>;

  /**
   * 取消测试
   */
  public async cancel(testId): Promise<void> {
    const runningTest = this.runningTests.get(testId);
    if (!runningTest) {
      throw new Error(`测试 ${testId} 不存在或已完成`);
    }

    console.log(`🛑 取消测试: ${testId}`);

    // 触发取消信号
    if (runningTest.abortController) {
      runningTest.abortController.abort();
    }

    // 执行生命周期钩子
    if (this.lifecycle?.onCancel) {
      await this.lifecycle.onCancel();
    }

    // 清理运行记录
    this.runningTests.delete(testId);
  }

  /**
   * 获取测试状态
   */
  public getStatus(testId): TestProgress {
    const runningTest = this.runningTests.get(testId);
    if (!runningTest) {
      // 检查历史记录
      const historyRecord = this.testHistory.find(h => h.testId === testId);
      if (historyRecord) {
        return {
          status: TestStatus.COMPLETED,
          progress: 100,
          currentStep: '测试已完成',
          startTime: historyRecord.timestamp,
          messages: []
        };
      }

      return {
        status: TestStatus.IDLE,
        progress: 0,
        currentStep: '测试不存在',
        startTime: new Date(),
        messages: []
      };
    }

    // 计算运行时间和进度
    const runningTime = Date.now() - runningTest.startTime.getTime();
    const estimatedProgress = Math.min(
      95,
      Math.floor((runningTime / (this.capabilities.estimatedDuration.typical * 1000)) * 100)
    );

    return {
      status: TestStatus.RUNNING,
      progress: estimatedProgress,
      currentStep: '测试运行中',
      startTime: runningTest.startTime,
      estimatedEndTime: this.estimateEndTime(runningTest.startTime, estimatedProgress),
      messages: []
    };
  }

  /**
   * 估算测试持续时间
   */
  public estimateDuration(config: TConfig) {
    // 基于配置调整估算时间
    let duration = this.capabilities.estimatedDuration.typical;

    // 根据超时设置调整
    if (config.timeout) {
      duration = Math.min(duration, config.timeout / 1000);
    }

    // 根据重试次数调整
    if (config.retries) {
      duration *= (1 + config.retries * 0.5);
    }

    return Math.floor(duration);
  }

  /**
   * 获取依赖的测试引擎
   */
  public getDependencies() {
    // 默认没有依赖
    return [];
  }

  /**
   * 检查引擎是否可用
   */
  public async isAvailable(): Promise<boolean> {
    // 默认总是可用
    return this.initialized;
  }

  /**
   * 获取引擎指标
   */
  public getMetrics(): Record<string, any> {
    return {
      totalTests: this.testHistory.length,
      runningTests: this.runningTests.size,
      averageScore: this.calculateAverageScore(),
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * 生成唯一的测试ID
   */
  protected generateTestId() {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 估算结束时间
   */
  protected estimateEndTime(startTime: Date, currentProgress): Date {
    if (currentProgress === 0) {
      return new Date(startTime.getTime() + this.capabilities.estimatedDuration.typical * 1000);
    }

    const elapsedTime = Date.now() - startTime.getTime();
    const totalEstimatedTime = elapsedTime / (currentProgress / 100);
    return new Date(startTime.getTime() + totalEstimatedTime);
  }

  /**
   * 创建错误结果
   */
  protected createErrorResult(
    testId,
    config: TConfig,
    error: Error,
    startTime: Date
  ): TResult {
    const endTime = new Date();
    return {
      testId,
      engineType: this.type,
      status: TestStatus.FAILED,
      score: 0,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      summary: `测试失败: ${error.message}`,
      details: {
        config,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      },
      errors: [error.message],
      warnings: [],
      recommendations: ['请检查配置并重试']
    } as TResult;
  }

  /**
   * 计算平均分数
   */
  private calculateAverageScore() {
    if (this.testHistory.length === 0) {
      return 0;
    }

    const totalScore = this.testHistory.reduce(
      (sum, record) => sum + record.result.score,
      0
    );

    return Math.round(totalScore / this.testHistory.length);
  }

  /**
   * 计算成功率
   */
  private calculateSuccessRate() {
    if (this.testHistory.length === 0) {
      return 0;
    }

    const successCount = this.testHistory.filter(
      record => record.result.status === TestStatus.COMPLETED
    ).length;

    return Math.round((successCount / this.testHistory.length) * 100);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    console.log(`🧹 清理测试引擎: ${this.name}`);

    // 取消所有运行中的测试
    for (const testId of this.runningTests.keys()) {
      try {
        await this.cancel(testId);
      } catch (error) {
        console.error(`清理测试 ${testId} 失败:`, error);
      }
    }

    // 执行生命周期钩子
    if (this.lifecycle?.cleanup) {
      await this.lifecycle.cleanup();
    }

    // 清理数据
    this.runningTests.clear();
    this.testHistory = [];
    this.initialized = false;

    console.log(`✅ 测试引擎 ${this.name} 清理完成`);
  }
}


module.exports = BaseTestEngine;