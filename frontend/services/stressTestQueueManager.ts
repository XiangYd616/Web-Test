/**
 * stressTestQueueManager.ts - 压力测试队列管理
 *
 * 文件路径: frontend\services\stressTestQueueManager.ts
 * 创建时间: 2025-09-25
 */

import Logger, { type LogContext } from '@/utils/logger';
import { apiClient } from './api/client';
import { stressTestRecordService, type StressTestRecord } from './stressTestRecordService';

export interface QueuedTest {
  id: string;
  recordId: string;
  testName: string;
  url: string;
  config: {
    users: number;
    duration: number;
    rampUpTime: number;
    testType: 'gradual' | 'spike' | 'constant' | 'step';
    method: string;
    timeout: number;
    thinkTime: number;
    warmupDuration?: number;
    cooldownDuration?: number;
    headers?: Record<string, string>;
    body?: string;
    proxy?: {
      enabled: boolean;
      type?: string;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
  };
  priority: 'high' | 'normal' | 'low';
  testType?: 'stress' | 'website' | 'seo' | 'security' | 'performance' | 'api';
  userId?: string;
  queuedAt: Date;
  startTime?: Date;
  estimatedDuration: number; // 预估执行时间(秒)
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export interface QueueConfig {
  maxConcurrentTests: number;
  maxConcurrentStressTests: number; // 压力测试专用并发限制
  maxQueueSize: number;
  queueTimeout: number; // 队列超时时间(毫秒)
  retryDelay: number; // 重试延迟(毫秒)
  priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };
  stressTestFastTrack: boolean; // 压力测试可快速通道
}

export interface QueueStats {
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  queueLength: number;
  runningTests: QueuedTest[];
  nextInQueue: QueuedTest | null;
}

class StressTestQueueManager {
  private queue: QueuedTest[] = [];
  private runningTests = new Map<string, QueuedTest>();
  private completedTests = new Map<string, QueuedTest>();
  private failedTests = new Map<string, QueuedTest>();
  private config: QueueConfig;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private listeners = new Set<(event: string, data: Record<string, unknown>) => void>();

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrentTests: 3, // 普通测试并发限制
      maxConcurrentStressTests: 15, // 压力测试专用并发上限
      maxQueueSize: 20,
      queueTimeout: 30 * 60 * 1000, // 30分钟
      retryDelay: 5000, // 5秒
      stressTestFastTrack: true, // 启用压力测试快速通道
      priorityWeights: {
        high: 3,
        normal: 2,
        low: 1,
      },
      ...config,
    };

    this.startProcessing();
    this.setupResourceMonitoring();
  }

  /**
   * 资源监控(简化版)
   */
  private setupResourceMonitoring(): void {
    // 资源监控，避免过度占用系统资源
    // 使用固定的采样频率，减少动态调整
    // 保证避免不必要的系统资源波动
  }

  /**
   * 加入测试队列
   */
  async enqueueTest(
    testData: Omit<QueuedTest, 'id' | 'queuedAt' | 'retryCount' | 'status'>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    // 检查队列是否已满
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`队列已达到最大长度: ${this.config.maxQueueSize}`);
    }

    // 检查是否已在队列中
    const existingTest = this.queue.find(test => test.recordId === testData.recordId);
    if (existingTest) {
      throw new Error('该测试已在队列中');
    }

    const queuedTest: QueuedTest = {
      ...testData,
      id: this.generateQueueId(),
      priority,
      queuedAt: new Date(),
      retryCount: 0,
      status: 'queued',
    };

    // 压力测试快速通道：满足条件时可直接执行
    if (this.config.stressTestFastTrack && queuedTest.testType === 'stress') {
      const canStartImmediately = this.canStartStressTest();
      if (canStartImmediately) {
        Logger.debug(`[FAST] 压力测试快速通道，立即执行 ${queuedTest.testName}`);
        await this.startTest(queuedTest);
        return queuedTest.id;
      }
    }

    // 按优先级插入队列
    this.insertByPriority(queuedTest);

    // 更新测试记录状态为待机/排队
    try {
      await stressTestRecordService.updateTestRecord(testData.recordId, {
        status: 'idle', // 简化：使用 idle 作为排队状态
        waitingReason: `排队等待执行 (当前位置: ${this.getQueuePosition(queuedTest.id)})`,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      Logger.warn('更新测试记录状态失败:', { error: String(error) });
    }

    this.notifyListeners('testQueued', {
      test: queuedTest,
      queuePosition: this.getQueuePosition(queuedTest.id),
      estimatedWaitTime: this.estimateWaitTime(queuedTest.id),
    });

    return queuedTest.id;
  }

  /**
   * 取消队列中的测试
   */
  async cancelQueuedTest(queueId: string, reason: string = '用户取消'): Promise<boolean> {
    // 从队列移除
    const queueIndex = this.queue.findIndex(test => test.id === queueId);
    if (queueIndex !== -1) {
      const test = this.queue[queueIndex];
      this.queue.splice(queueIndex, 1);

      // 更新测试记录状态
      try {
        await stressTestRecordService.cancelTestRecord(test.recordId, reason);
      } catch (error) {
        Logger.warn('更新测试记录状态失败:', { error: String(error) });
      }

      this.notifyListeners('testCancelled', { test, reason });
      return true;
    }

    // 检查是否正在运行
    const runningTest = this.runningTests.get(queueId);
    if (runningTest) {
      runningTest.status = 'cancelled';
      this.runningTests.delete(queueId);

      try {
        await stressTestRecordService.cancelTestRecord(runningTest.recordId, reason);
      } catch (error) {
        Logger.warn('更新测试记录状态失败:', { error: String(error) });
      }

      this.notifyListeners('testCancelled', { test: runningTest, reason });
      return true;
    }

    return false;
  }

  /**
   * 获取队列状态
   */
  getQueueStats(): QueueStats {
    const completedTests = Array.from(this.completedTests.values());
    const failedTests = Array.from(this.failedTests.values());

    const averageWaitTime = this.calculateAverageWaitTime();
    const averageExecutionTime = this.calculateAverageExecutionTime();

    return {
      totalQueued: this.queue.length,
      totalRunning: this.runningTests.size,
      totalCompleted: completedTests.length,
      totalFailed: failedTests.length,
      averageWaitTime,
      averageExecutionTime,
      queueLength: this.queue.length,
      runningTests: Array.from(this.runningTests.values()),
      nextInQueue: this.queue[0] || null,
    };
  }

  /**
   * 获取测试在队列中的位置
   */
  getQueuePosition(queueId: string): number {
    const index = this.queue.findIndex(test => test.id === queueId);
    return index === -1 ? -1 : index + 1;
  }

  /**
   * 估算等待时间
   */
  estimateWaitTime(queueId: string): number {
    const position = this.getQueuePosition(queueId);
    if (position === -1) return 0;

    const averageExecutionTime = this.calculateAverageExecutionTime();
    const testsAhead = position - 1;
    const availableSlots = Math.max(1, this.config.maxConcurrentTests - this.runningTests.size);

    return Math.ceil(testsAhead / availableSlots) * averageExecutionTime;
  }

  /**
   * 开始处理队列
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // 每秒处理一次
  }

  /**
   * 停止处理队列
   */
  stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 清理超时的测试
    this.cleanupTimeoutTests();

    // 循环检查是否可以启动新测试
    while (this.queue.length > 0) {
      const nextTest = this.queue[0];
      if (!nextTest) break;

      // 根据测试类型检查并发限制
      const canStart = this.canStartTest(nextTest);
      if (!canStart) {
        break; // 无法启动新测试，退出循环
      }

      // 从队列移除并启动
      this.queue.shift();
      await this.startTest(nextTest);
    }
  }

  /**
   * 启动测试
   */
  private async startTest(test: QueuedTest): Promise<void> {
    test.status = 'processing';
    test.startTime = new Date();
    test.progress = 0;
    this.runningTests.set(test.id, test);

    try {
      // 更新测试记录状态为运行中
      await stressTestRecordService.startFromPending(test.recordId);

      this.notifyListeners('testStarted', { test });
      Logger.debug(`开始执行测试: ${test.testName}`);

      // 执行实际压力测试逻辑
      await this.executeRealStressTest(test);
    } catch (error) {
      Logger.error(`测试执行失败: ${test.testName}`, { error: String(error) });
      await this.handleTestFailure(test, error as Error);
    }
  }

  /**
   * 执行真实压力测试
   */
  private async executeRealStressTest(test: QueuedTest): Promise<void> {
    try {
      // 调用后端压力测试 API
      const response = await apiClient.getInstance().post('/test/stress', {
        ...test.config,
        url: test.url,
        testId: test.recordId,
        queueId: test.id,
        priority: test.priority,
      });
      const result = response.data as unknown;
      Logger.debug(`压力测试 API 调用成功: ${test.testName}`, { result } as LogContext);

      await this.waitForTestCompletion(test);
    } catch (error) {
      Logger.error(`压力测试执行失败: ${test.testName}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 等待测试完成
   */
  private async waitForTestCompletion(test: QueuedTest): Promise<void> {
    const maxWaitTime = (test.estimatedDuration + 60) * 1000; // 预估时间 + 1分钟缓冲
    const startTime = Date.now();
    const checkInterval = 2000; // 每2秒检查一次

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // 获取测试记录状态
          const record = await stressTestRecordService.getTestRecord(test.recordId);

          if (record.status === 'completed') {
            Logger.debug(`测试完成: ${test.testName}`);
            await this.handleTestCompletion(test, record.results || {});
            resolve();
            return;
          }

          if (record.status === 'failed' || record.status === 'cancelled') {
            Logger.debug(`测试失败或取消: ${test.testName}, 状态: ${record.status}`);
            reject(new Error(record.error || `测试${record.status}`));
            return;
          }

          // 判断是否超时
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('测试执行超时'));
            return;
          }

          // 更新进度
          if (test.onProgress && record.progress !== undefined) {
            test.onProgress(record.progress, record.currentPhase || '测试进行中...');
          }

          // 继续检查
          setTimeout(checkStatus, checkInterval);
        } catch (error) {
          Logger.error(`获取状态失败: ${test.testName}`, { error: String(error) });
          reject(error);
        }
      };

      // 开始检查
      checkStatus();
    });
  }

  /**
   * 处理测试完成
   */
  private async handleTestCompletion(test: QueuedTest, result: unknown): Promise<void> {
    test.status = 'completed';
    this.runningTests.delete(test.id);
    this.completedTests.set(test.id, test);

    try {
      await stressTestRecordService.completeTestRecord(
        test.recordId,
        result as StressTestRecord['results']
      );
    } catch (error) {
      Logger.warn('更新测试记录失败:', { error: String(error) });
    }

    if (test.onComplete) {
      test.onComplete(result);
    }

    this.notifyListeners('testCompleted', { test, result });
    Logger.debug(`测试完成: ${test.testName}`);
  }

  /**
   * 处理测试失败
   */
  private async handleTestFailure(test: QueuedTest, error: Error): Promise<void> {
    test.retryCount++;

    if (test.retryCount < test.maxRetries) {
      // 重新入队
      test.status = 'queued';
      this.runningTests.delete(test.id);

      setTimeout(() => {
        this.insertByPriority(test);
      }, this.config.retryDelay);
    } else {
      // 标记为失败
      test.status = 'failed';
      this.runningTests.delete(test.id);
      this.failedTests.set(test.id, test);

      try {
        await stressTestRecordService.failTestRecord(test.recordId, error.message);
      } catch (updateError) {
        Logger.warn('更新测试记录失败:', { error: String(updateError) });
      }

      if (test.onError) {
        test.onError(error);
      }

      this.notifyListeners('testFailed', { test, error });
      Logger.error(`测试失败: ${test.testName}`, { error: String(error) });
    }
  }

  /**
   * 按优先级插入队列
   */
  private insertByPriority(test: QueuedTest): void {
    const weight = this.config.priorityWeights[test.priority];
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      /**
       * 优先级插入说明
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const existingWeight = this.config.priorityWeights[this.queue[i].priority];
      if (weight > existingWeight) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, test);
  }

  /**
   * 判断是否可以启动指定测试
   */
  private canStartTest(test: QueuedTest): boolean {
    if (test.testType === 'stress') {
      return this.canStartStressTest();
    } else {
      return this.canStartRegularTest();
    }
  }

  /**
   * 判断是否可以启动压力测试
   */
  private canStartStressTest(): boolean {
    const runningStressTests = Array.from(this.runningTests.values()).filter(
      test => test.testType === 'stress'
    ).length;

    // 检查并发限制
    const withinConcurrencyLimit = runningStressTests < this.config.maxConcurrentStressTests;

    // 考虑系统资源(简化检查)
    const hasSystemResources = true;

    return withinConcurrencyLimit && hasSystemResources;
  }

  /**
   * 判断是否可以启动普通测试
   */
  private canStartRegularTest(): boolean {
    const runningRegularTests = Array.from(this.runningTests.values()).filter(
      test => test.testType !== 'stress'
    ).length;
    return runningRegularTests < this.config.maxConcurrentTests;
  }

  /**
   * 清理超时的测试
   */
  private cleanupTimeoutTests(): void {
    const now = Date.now();

    this.queue = this.queue.filter(test => {
      const isTimeout = now - test.queuedAt.getTime() > this.config.queueTimeout;
      if (isTimeout) {
        this.handleTestFailure(test, new Error('队列超时'));
        return false;
      }
      return true;
    });
  }

  /**
   * 计算平均等待时间
   */
  private calculateAverageWaitTime(): number {
    // 基于历史数据计算，当前使用简单规则
    return this.queue.length * 30; // 估算每个测试平均30秒
  }

  /**
   * 计算平均执行时间
   */
  private calculateAverageExecutionTime(): number {
    const completedTests = Array.from(this.completedTests.values());
    if (completedTests.length === 0) return 60; // 默认60秒

    const totalTime = completedTests.reduce((sum, test) => sum + test.estimatedDuration, 0);
    return totalTime / completedTests.length;
  }

  /**
   * 生成队列ID
   */
  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 注册事件监听
   */
  addListener(callback: (event: string, data: Record<string, unknown>) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 通知监听者
   */
  private notifyListeners(event: string, data: Record<string, unknown>): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        Logger.error('通知回调失败:', { error: String(error) });
      }
    });
  }

  /**
   * 销毁队列管理器
   */
  destroy(): void {
    this.stopProcessing();
    this.queue = [];
    this.runningTests.clear();
    this.completedTests.clear();
    this.failedTests.clear();
    this.listeners.clear();
  }
}

// 导出全局队列管理实例
export const stressTestQueueManager = new StressTestQueueManager();

export default StressTestQueueManager;
