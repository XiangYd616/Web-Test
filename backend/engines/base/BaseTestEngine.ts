/**
 * 基础测试引擎抽象类
 * 提供所有测试引擎的通用功能和默认实现
 */

import Joi from 'joi';

type TestConfig = Record<string, unknown>;
type TestResult = Record<string, unknown>;
type TestStatus = 'running' | 'completed' | 'failed' | 'cancelled';
type TestRecord = {
  status: TestStatus;
  progress?: number;
  startTime?: number;
  endTime?: number;
  config?: TestConfig;
  results?: TestResult;
  error?: string;
};

type TestHistoryItem = {
  testId: string;
  results: TestResult;
  timestamp: Date;
  config: TestConfig;
};

type ProgressCallback = (progress: Record<string, unknown>) => void;
type CompletionCallback = (results: TestResult) => void;
type ErrorCallback = (error: Error) => void;

abstract class BaseTestEngine {
  name: string;
  version: string;
  activeTests: Map<string, TestRecord>;
  testHistory: TestHistoryItem[];
  progressCallback: ProgressCallback | null;
  completionCallback: CompletionCallback | null;
  errorCallback: ErrorCallback | null;

  constructor() {
    this.name = 'base';
    this.version = '1.0.0';
    this.activeTests = new Map();
    this.testHistory = [];
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  /**
   * 检查引擎可用性
   * 子类应该重写此方法
   */
  async checkAvailability(): Promise<{
    available: boolean;
    version: string;
    capabilities: Record<string, unknown>;
  }> {
    return {
      available: true,
      version: this.version,
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * 获取引擎能力
   * 子类应该重写此方法
   */
  getCapabilities(): Record<string, unknown> {
    return {
      supportedTests: [],
      maxConcurrent: 1,
      timeout: 60000,
    };
  }

  /**
   * 验证配置
   * 子类可以重写此方法添加自定义验证
   */
  validateConfig(config: TestConfig): TestConfig {
    const baseSchema = Joi.object({
      url: Joi.string().uri().optional(),
      timeout: Joi.number().min(1000).max(300000).default(60000),
    });

    const { error, value } = baseSchema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value as TestConfig;
  }

  /**
   * 执行测试
   * 子类必须重写此方法
   */
  abstract executeTest(config: TestConfig): Promise<TestResult>;

  /**
   * 运行测试的通用方法
   */
  async runTest(config: TestConfig): Promise<{
    success: boolean;
    testId: string;
    results: TestResult;
    duration: number;
  }> {
    const testId = `${this.name}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
        config: validatedConfig,
      });

      const results = await this.executeTest(validatedConfig);

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results,
      });

      this.emitCompletion(results);

      // 添加到历史记录
      this.testHistory.push({
        testId,
        results,
        timestamp: new Date(),
        config: validatedConfig,
      });

      // 限制历史记录大小
      if (this.testHistory.length > 100) {
        this.testHistory.shift();
      }

      return {
        success: true,
        testId,
        results,
        duration: Date.now() - (this.activeTests.get(testId)?.startTime || 0),
      };
    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
      });
      this.emitError(error as Error);
      throw error;
    }
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 设置完成回调
   */
  setCompletionCallback(callback: CompletionCallback): void {
    this.completionCallback = callback;
  }

  /**
   * 设置错误回调
   */
  setErrorCallback(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * 获取活跃测试
   */
  getActiveTests(): Map<string, TestRecord> {
    return this.activeTests;
  }

  /**
   * 获取测试历史
   */
  getTestHistory(): TestHistoryItem[] {
    return this.testHistory;
  }

  /**
   * 取消测试
   */
  cancelTest(testId: string): boolean {
    const test = this.activeTests.get(testId);
    if (!test) {
      return false;
    }

    this.activeTests.set(testId, {
      ...test,
      status: 'cancelled',
    });

    return true;
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId: string): TestStatus | null {
    const test = this.activeTests.get(testId);
    return test ? test.status : null;
  }

  /**
   * 获取测试进度
   */
  getTestProgress(testId: string): number | null {
    const test = this.activeTests.get(testId);
    return test ? test.progress || 0 : null;
  }

  /**
   * 清理完成的测试
   */
  cleanupCompletedTests(): void {
    for (const [testId, test] of this.activeTests.entries()) {
      if (test.status === 'completed' || test.status === 'failed' || test.status === 'cancelled') {
        this.activeTests.delete(testId);
      }
    }
  }

  /**
   * 获取引擎统计信息
   */
  getEngineStats(): {
    name: string;
    version: string;
    totalTests: number;
    recentTests: number;
    successRate: number;
    failureRate: number;
    activeTests: number;
    averageDuration: number;
  } {
    const total = this.testHistory.length;
    const recent = this.testHistory.slice(-10);
    const successful = recent.filter(t => !t.results.error).length;
    const failed = recent.filter(t => t.results.error).length;

    return {
      name: this.name,
      version: this.version,
      totalTests: total,
      recentTests: recent.length,
      successRate: recent.length > 0 ? (successful / recent.length) * 100 : 0,
      failureRate: recent.length > 0 ? (failed / recent.length) * 100 : 0,
      activeTests: this.activeTests.size,
      averageDuration:
        recent.length > 0
          ? recent.reduce((sum, t) => {
              const duration = (t.results.duration as number) || 0;
              return sum + duration;
            }, 0) / recent.length
          : 0,
    };
  }

  /**
   * 发送进度更新
   */
  protected emitProgress(testId: string, progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 发送完成通知
   */
  protected emitCompletion(results: TestResult): void {
    if (this.completionCallback) {
      this.completionCallback(results);
    }
  }

  /**
   * 发送错误通知
   */
  protected emitError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * 重置引擎状态
   */
  reset(): void {
    this.activeTests.clear();
    this.testHistory = [];
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  /**
   * 获取引擎信息
   */
  getEngineInfo(): {
    name: string;
    version: string;
    type: string;
    capabilities: Record<string, unknown>;
    stats: {
      name: string;
      version: string;
      totalTests: number;
      recentTests: number;
      successRate: number;
      failureRate: number;
      activeTests: number;
      averageDuration: number;
    };
  } {
    return {
      name: this.name,
      version: this.version,
      type: 'BaseTestEngine',
      capabilities: this.getCapabilities(),
      stats: this.getEngineStats(),
    };
  }
}

export default BaseTestEngine;

module.exports = BaseTestEngine;
