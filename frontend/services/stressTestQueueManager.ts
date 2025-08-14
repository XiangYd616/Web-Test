
import { stressTestRecordService } from './stressTestRecordService';
import { systemResourceMonitor } from './systemResourceMonitor';

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
  estimatedDuration: number; // 预估测试时长（秒）
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface QueueConfig {
  maxConcurrentTests: number;
  maxConcurrentStressTests: number; // 压力测试专用并发限制
  maxQueueSize: number;
  queueTimeout: number; // 队列超时时间（毫秒）
  retryDelay: number; // 重试延迟（毫秒）
  priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };
  stressTestFastTrack: boolean; // 压力测试快速通道
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
  private listeners = new Set<(event: string, data: any) => void>();

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrentTests: 3, // 普通测试并发限制
      maxConcurrentStressTests: 15, // 压力测试专用并发限制（更高）
      maxQueueSize: 20,
      queueTimeout: 30 * 60 * 1000, // 30分钟
      retryDelay: 5000, // 5秒
      stressTestFastTrack: true, // 启用压力测试快速通道
      priorityWeights: {
        high: 3,
        normal: 2,
        low: 1
      },
      ...config
    };

    this.startProcessing();
    this.setupResourceMonitoring();
  }

  /**
   * 设置资源监控（简化版）
   */
  private setupResourceMonitoring(): void {
    // 简化资源监控，不再依赖复杂的系统监控
    console.log('📋 队列管理器使用简化的资源管理策略');

    // 使用固定的并发限制，不再动态调整
    // 这样可以避免不必要的系统资源监控调用
  }

  /**
   * 添加测试到队列
   */
  async enqueueTest(
    testData: Omit<QueuedTest, 'id' | 'queuedAt' | 'retryCount' | 'status'>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    // 检查队列是否已满
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`队列已满，最大容量: ${this.config.maxQueueSize}`);
    }

    // 检查是否已经在队列中
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
      status: 'queued'
    };

    // 压力测试快速通道：如果启用且是压力测试，尝试立即执行
    if (this.config.stressTestFastTrack && queuedTest.testType === 'stress') {
      const canStartImmediately = this.canStartStressTest();
      if (canStartImmediately) {
        console.log(`🚀 压力测试快速通道：立即执行 ${queuedTest.testName}`);
        await this.startTest(queuedTest);
        return queuedTest.id;
      }
    }

    // 根据优先级插入队列
    this.insertByPriority(queuedTest);

    // 更新测试记录状态为准备中（排队等待）
    try {
      await stressTestRecordService.updateTestRecord(testData.recordId, {
        status: 'idle', // 🔧 简化：使用idle作为排队状态
        waitingReason: `排队等待执行 (队列位置: ${this.getQueuePosition(queuedTest.id)})`,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn('更新测试记录状态失败:', error);
    }

    this.notifyListeners('testQueued', {
      test: queuedTest,
      queuePosition: this.getQueuePosition(queuedTest.id),
      estimatedWaitTime: this.estimateWaitTime(queuedTest.id)
    });

    console.log(`📋 测试已加入队列: ${queuedTest.testName} (优先级: ${priority})`);
    return queuedTest.id;
  }

  /**
   * 取消队列中的测试
   */
  async cancelQueuedTest(queueId: string, reason: string = '用户取消'): Promise<boolean> {
    // 从队列中移除
    const queueIndex = this.queue.findIndex(test => test.id === queueId);
    if (queueIndex !== -1) {
      const test = this.queue[queueIndex];
      this.queue.splice(queueIndex, 1);

      // 更新测试记录状态
      try {
        await stressTestRecordService.cancelTestRecord(test.recordId, reason);
      } catch (error) {
        console.warn('更新测试记录状态失败:', error);
      }

      this.notifyListeners('testCancelled', { test, reason });
      return true;
    }

    // 检查是否在运行中
    const runningTest = this.runningTests.get(queueId);
    if (runningTest) {
      runningTest.status = 'cancelled';
      this.runningTests.delete(queueId);

      try {
        await stressTestRecordService.cancelTestRecord(runningTest.recordId, reason);
      } catch (error) {
        console.warn('更新测试记录状态失败:', error);
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
      nextInQueue: this.queue[0] || null
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
    }, 1000); // 每秒检查一次队列
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

    // 检查是否可以启动新测试
    while (this.queue.length > 0) {
      const nextTest = this.queue[0];
      if (!nextTest) break;

      // 根据测试类型检查并发限制
      const canStart = this.canStartTest(nextTest);
      if (!canStart) {
        break; // 无法启动更多测试，退出循环
      }

      // 检查系统资源状态（根据测试类型）
      const testType = nextTest.testType === 'stress' ? 'stress' : 'regular';
      const canStartNewTest = systemResourceMonitor?.canStartNewTest(testType) !== false;
      if (!canStartNewTest) {
        // console.log(`⚠️ 系统资源不足，暂停启动新的${testType}测试`); // 静默处理
        break;
      }

      // 从队列中移除并启动测试
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
      console.log(`🚀 开始执行测试: ${test.testName}`);

      // 调用实际的压力测试执行逻辑
      await this.executeRealStressTest(test);

    } catch (error) {
      console.error(`测试执行失败: ${test.testName}`, error);
      await this.handleTestFailure(test, error as Error);
    }
  }

  /**
   * 执行真实的压力测试
   */
  private async executeRealStressTest(test: QueuedTest): Promise<void> {
    try {
      console.log(`🎯 开始执行真实压力测试: ${test.testName}`);

      // 调用后端压力测试API
      const response = await fetch('/api/test/stress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...test.config,
          url: test.url,
          testId: test.recordId,
          queueId: test.id,
          priority: test.priority
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ 压力测试API调用成功: ${test.testName}`, result);

      await this.waitForTestCompletion(test);

    } catch (error) {
      console.error(`❌ 压力测试执行失败: ${test.testName}`, error);
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
          // 检查测试记录状态
          const record = await stressTestRecordService.getTestRecord(test.recordId);

          if (record.status === 'completed') {
            console.log(`✅ 测试完成: ${test.testName}`);
            await this.handleTestCompletion(test, record.results || {});
            resolve();
            return;
          }

          if (record.status === 'failed' || record.status === 'cancelled') {
            console.log(`❌ 测试失败或取消: ${test.testName}, 状态: ${record.status}`);
            reject(new Error(record.error || `测试${record.status}`));
            return;
          }

          // 检查是否超时
          if (Date.now() - startTime > maxWaitTime) {
            console.log(`⏰ 测试超时: ${test.testName}`);
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
          console.error(`检查测试状态失败: ${test.testName}`, error);
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
  private async handleTestCompletion(test: QueuedTest, result: any): Promise<void> {
    test.status = 'completed';
    this.runningTests.delete(test.id);
    this.completedTests.set(test.id, test);

    try {
      await stressTestRecordService.completeTestRecord(test.recordId, result);
    } catch (error) {
      console.warn('更新测试记录失败:', error);
    }

    if (test.onComplete) {
      test.onComplete(result);
    }

    this.notifyListeners('testCompleted', { test, result });
    console.log(`✅ 测试完成: ${test.testName}`);
  }

  /**
   * 处理测试失败
   */
  private async handleTestFailure(test: QueuedTest, error: Error): Promise<void> {
    test.retryCount++;

    if (test.retryCount < test.maxRetries) {
      // 重新加入队列
      test.status = 'queued';
      this.runningTests.delete(test.id);

      setTimeout(() => {
        this.insertByPriority(test);
        console.log(`🔄 测试重试: ${test.testName} (${test.retryCount}/${test.maxRetries})`);
      }, this.config.retryDelay);
    } else {
      // 标记为失败
      test.status = 'failed';
      this.runningTests.delete(test.id);
      this.failedTests.set(test.id, test);

      try {
        await stressTestRecordService.failTestRecord(test.recordId, error.message);
      } catch (updateError) {
        console.warn('更新测试记录失败:', updateError);
      }

      if (test.onError) {
        test.onError(error);
      }

      this.notifyListeners('testFailed', { test, error });
      console.error(`❌ 测试失败: ${test.testName}`, error);
    }
  }

  /**
   * 根据优先级插入队列
   */
  private insertByPriority(test: QueuedTest): void {
    const weight = this.config.priorityWeights[test.priority];
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      const existingWeight = this.config.priorityWeights[this.queue[i].priority];
      if (weight > existingWeight) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, test);
  }

  /**
   * 检查是否可以启动指定测试
   */
  private canStartTest(test: QueuedTest): boolean {
    if (test.testType === 'stress') {
      return this.canStartStressTest();
    } else {
      return this.canStartRegularTest();
    }
  }

  /**
   * 检查是否可以启动压力测试
   */
  private canStartStressTest(): boolean {
    const runningStressTests = Array.from(this.runningTests.values())
      .filter(test => test.testType === 'stress').length;

    // 检查并发限制
    const withinConcurrencyLimit = runningStressTests < this.config.maxConcurrentStressTests;

    // 检查系统资源（压力测试使用更宽松的检查）
    const hasSystemResources = systemResourceMonitor?.canStartNewTest('stress') !== false;

    return withinConcurrencyLimit && hasSystemResources;
  }

  /**
   * 检查是否可以启动普通测试
   */
  private canStartRegularTest(): boolean {
    const runningRegularTests = Array.from(this.runningTests.values())
      .filter(test => test.testType !== 'stress').length;
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
    // 基于历史数据计算，这里使用简单估算
    return this.queue.length * 30; // 假设每个测试平均30秒
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
   * 添加事件监听器
   */
  addListener(callback: (event: string, data: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('监听器回调失败:', error);
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

// 创建全局队列管理器实例
export const stressTestQueueManager = new StressTestQueueManager();

export default StressTestQueueManager;
