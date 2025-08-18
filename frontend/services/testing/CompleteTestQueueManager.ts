/**
 * 完整的测试队列管理器
 * 提供测试调度、优先级管理、并发控制和资源分配功能
 * 支持智能调度算法、负载均衡和故障恢复
 */

import type { TestConfig, TestResult, TestType, TestPriority, TestStatus } from './CompleteTestEngine

// 队列项接口
export interface QueueItem {
  id: string;
  config: TestConfig;
  priority: TestPriority;
  status: TestStatus;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  estimatedDuration: number;
  actualDuration?: number;
  userId?: string;
  metadata?: Record<string, any>;
}

// 队列统计接口
export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  throughput: number;
  errorRate: number;
}

// 资源使用情况接口
export interface ResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  activeTests: number;
  maxConcurrency: number;
  queueLength: number;
}

// 调度策略枚举
export enum SchedulingStrategy {
  FIFO = 'fifo',           // 先进先出
  PRIORITY = 'priority',   // 优先级优先
  SJF = 'sjf',            // 最短作业优先
  ROUND_ROBIN = 'round_robin', // 轮询
  WEIGHTED = 'weighted'    // 加权调度
}

// 队列配置接口
export interface QueueConfig {
  maxConcurrency: number;
  maxQueueSize: number;
  defaultTimeout: number;
  retryDelay: number;
  maxRetries: number;
  schedulingStrategy: SchedulingStrategy;
  priorityWeights: Record<TestPriority, number>;
  resourceLimits: {
    cpu: number;
    memory: number;
    network: number;
  };
  autoScaling: {
    enabled: boolean;
    minConcurrency: number;
    maxConcurrency: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
  };
}

// 队列事件接口
export interface QueueEvents {
  onItemAdded: (item: QueueItem) => void;
  onItemStarted: (item: QueueItem) => void;
  onItemCompleted: (item: QueueItem, result: TestResult) => void;
  onItemFailed: (item: QueueItem, error: Error) => void;
  onItemCancelled: (item: QueueItem) => void;
  onQueueEmpty: () => void;
  onQueueFull: () => void;
  onResourceLimitReached: (resource: string, usage: number) => void;
}

// 完整测试队列管理器类
export class CompleteTestQueueManager {
  private queue: QueueItem[] = [];
  private runningTests: Map<string, QueueItem> = new Map();
  private completedTests: Map<string, QueueItem> = new Map();
  private config: QueueConfig;
  private events: Partial<QueueEvents> = {};
  private schedulerTimer: number | null = null;
  private statsTimer: number | null = null;
  private currentStats: QueueStats;
  private resourceMonitor: ResourceUsage;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrency: 5,
      maxQueueSize: 100,
      defaultTimeout: 300000, // 5分钟
      retryDelay: 5000,
      maxRetries: 3,
      schedulingStrategy: SchedulingStrategy.PRIORITY,
      priorityWeights: {
        [TestPriority.URGENT]: 4,
        [TestPriority.HIGH]: 3,
        [TestPriority.NORMAL]: 2,
        [TestPriority.LOW]: 1
      },
      resourceLimits: {
        cpu: 80,
        memory: 80,
        network: 80
      },
      autoScaling: {
        enabled: false,
        minConcurrency: 1,
        maxConcurrency: 10,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3
      },
      ...config
    };

    this.currentStats = this.initializeStats();
    this.resourceMonitor = this.initializeResourceMonitor();
    this.startScheduler();
    this.startStatsCollection();
  }

  // 注册事件监听器
  on<K extends keyof QueueEvents>(event: K, handler: QueueEvents[K]): void {
    this.events[event] = handler;
  }

  // 移除事件监听器
  off<K extends keyof QueueEvents>(event: K): void {
    delete this.events[event];
  }

  // 触发事件
  private emit<K extends keyof QueueEvents>(
    event: K,
    ...args: Parameters<QueueEvents[K]>
  ): void {
    const handler = this.events[event];
    if (handler) {
      try {
        (handler as any)(...args);
      } catch (error) {
        console.error('Error in queue event handler:', error);
      }
    }
  }

  // 添加测试到队列
  async addTest(config: TestConfig): Promise<string> {
    // 检查队列容量
    if (this.queue.length >= this.config.maxQueueSize) {
      this.emit('onQueueFull');
      throw new Error('Queue is full');
    }

    // 创建队列项
    const item: QueueItem = {
      id: this.generateId(),
      config,
      priority: config.priority || TestPriority.NORMAL,
      status: TestStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: config.retries || this.config.maxRetries,
      estimatedDuration: this.estimateDuration(config),
      userId: config.metadata?.userId,
      metadata: config.metadata
    };

    // 添加到队列
    this.insertIntoQueue(item);
    this.emit('onItemAdded', item);
    
    // 更新统计
    this.updateStats();
    
    return item.id;
  }

  // 取消测试
  async cancelTest(testId: string): Promise<boolean> {
    // 检查运行中的测试
    const runningItem = this.runningTests.get(testId);
    if (runningItem) {
      runningItem.status = TestStatus.CANCELLED;
      runningItem.completedAt = new Date();
      this.runningTests.delete(testId);
      this.completedTests.set(testId, runningItem);
      this.emit('onItemCancelled', runningItem);
      return true;
    }

    // 检查队列中的测试
    const queueIndex = this.queue.findIndex(item => item.id === testId);
    if (queueIndex !== -1) {
      const item = this.queue[queueIndex];
      item.status = TestStatus.CANCELLED;
      item.completedAt = new Date();
      this.queue.splice(queueIndex, 1);
      this.completedTests.set(testId, item);
      this.emit('onItemCancelled', item);
      return true;
    }

    return false;
  }

  // 获取测试状态
  getTestStatus(testId: string): TestStatus | null {
    // 检查运行中的测试
    const runningItem = this.runningTests.get(testId);
    if (runningItem) {
      return runningItem.status;
    }

    // 检查队列中的测试
    const queueItem = this.queue.find(item => item.id === testId);
    if (queueItem) {
      return queueItem.status;
    }

    // 检查已完成的测试
    const completedItem = this.completedTests.get(testId);
    if (completedItem) {
      return completedItem.status;
    }

    return null;
  }

  // 获取队列信息
  getQueueInfo(): {
    queue: QueueItem[];
    running: QueueItem[];
    stats: QueueStats;
    resourceUsage: ResourceUsage;
  } {
    return {
      queue: [...this.queue],
      running: Array.from(this.runningTests.values()),
      stats: { ...this.currentStats },
      resourceUsage: { ...this.resourceMonitor }
    };
  }

  // 获取用户的测试
  getUserTests(userId: string): {
    pending: QueueItem[];
    running: QueueItem[];
    completed: QueueItem[];
  } {
    return {
      pending: this.queue.filter(item => item.userId === userId),
      running: Array.from(this.runningTests.values()).filter(item => item.userId === userId),
      completed: Array.from(this.completedTests.values()).filter(item => item.userId === userId)
    };
  }

  // 更新配置
  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果并发数减少，需要调整运行中的测试
    if (newConfig.maxConcurrency && newConfig.maxConcurrency < this.runningTests.size) {
      this.adjustConcurrency();
    }
  }

  // 清空队列
  clearQueue(): void {
    // 取消所有等待中的测试
    this.queue.forEach(item => {
      item.status = TestStatus.CANCELLED;
      item.completedAt = new Date();
      this.completedTests.set(item.id, item);
      this.emit('onItemCancelled', item);
    });
    
    this.queue.length = 0;
    this.updateStats();
  }

  // 暂停队列
  pauseQueue(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // 恢复队列
  resumeQueue(): void {
    if (!this.schedulerTimer) {
      this.startScheduler();
    }
  }

  // 私有方法

  // 插入到队列中（按策略排序）
  private insertIntoQueue(item: QueueItem): void {
    switch (this.config.schedulingStrategy) {
      case SchedulingStrategy.FIFO:
        this.queue.push(item);
        break;
        
      case SchedulingStrategy.PRIORITY:
        this.insertByPriority(item);
        break;
        
      case SchedulingStrategy.SJF:
        this.insertByDuration(item);
        break;
        
      case SchedulingStrategy.WEIGHTED:
        this.insertByWeight(item);
        break;
        
      default:
        this.queue.push(item);
    }
  }

  // 按优先级插入
  private insertByPriority(item: QueueItem): void {
    const itemWeight = this.config.priorityWeights[item.priority];
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const queueWeight = this.config.priorityWeights[this.queue[i].priority];
      if (itemWeight > queueWeight) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, item);
  }

  // 按预估时长插入
  private insertByDuration(item: QueueItem): void {
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      if (item.estimatedDuration < this.queue[i].estimatedDuration) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, item);
  }

  // 按权重插入
  private insertByWeight(item: QueueItem): void {
    const itemScore = this.calculateItemScore(item);
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const queueScore = this.calculateItemScore(this.queue[i]);
      if (itemScore > queueScore) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, item);
  }

  // 计算项目评分
  private calculateItemScore(item: QueueItem): number {
    const priorityWeight = this.config.priorityWeights[item.priority];
    const waitTime = Date.now() - item.createdAt.getTime();
    const waitScore = Math.min(waitTime / (5 * 60 * 1000), 1); // 最多5分钟等待时间
    const durationScore = 1 - Math.min(item.estimatedDuration / (10 * 60 * 1000), 1); // 最多10分钟执行时间
    
    return priorityWeight * 0.5 + waitScore * 0.3 + durationScore * 0.2;
  }

  // 启动调度器
  private startScheduler(): void {
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleNext();
    }, 1000);
  }

  // 调度下一个测试
  private scheduleNext(): void {
    // 检查是否可以启动新测试
    if (this.runningTests.size >= this.config.maxConcurrency || this.queue.length === 0) {
      return;
    }

    // 检查资源限制
    if (!this.checkResourceAvailability()) {
      return;
    }

    // 获取下一个测试
    const nextItem = this.queue.shift();
    if (!nextItem) {
      return;
    }

    // 启动测试
    this.startTest(nextItem);
  }

  // 启动测试
  private async startTest(item: QueueItem): Promise<void> {
    item.status = TestStatus.RUNNING;
    item.startedAt = new Date();
    item.scheduledAt = new Date();
    
    this.runningTests.set(item.id, item);
    this.emit('onItemStarted', item);
    
    try {
      // 这里应该调用实际的测试引擎
      // const result = await testEngine.startTest(item.config);
      
      // 模拟测试执行
      await this.simulateTestExecution(item);
      
    } catch (error) {
      this.handleTestFailure(item, error as Error);
    }
  }

  // 模拟测试执行
  private async simulateTestExecution(item: QueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟成功/失败
        if (Math.random() > 0.1) { // 90% 成功率
          this.handleTestSuccess(item);
          resolve();
        } else {
          reject(new Error('Simulated test failure'));
        }
      }, item.estimatedDuration);
    });
  }

  // 处理测试成功
  private handleTestSuccess(item: QueueItem): void {
    item.status = TestStatus.COMPLETED;
    item.completedAt = new Date();
    item.actualDuration = item.completedAt.getTime() - (item.startedAt?.getTime() || 0);
    
    this.runningTests.delete(item.id);
    this.completedTests.set(item.id, item);
    
    // 模拟测试结果
    const mockResult: TestResult = {
      id: item.id,
      url: item.config.url,
      type: item.config.type,
      status: TestStatus.COMPLETED,
      score: Math.floor(Math.random() * 100),
      metrics: {},
      issues: [],
      recommendations: [],
      startTime: item.startedAt!,
      endTime: item.completedAt,
      duration: item.actualDuration
    };
    
    this.emit('onItemCompleted', item, mockResult);
    this.updateStats();
    
    // 检查队列是否为空
    if (this.queue.length === 0 && this.runningTests.size === 0) {
      this.emit('onQueueEmpty');
    }
  }

  // 处理测试失败
  private handleTestFailure(item: QueueItem, error: Error): void {
    item.retryCount++;
    
    if (item.retryCount < item.maxRetries) {
      // 重新加入队列
      item.status = TestStatus.PENDING;
      this.runningTests.delete(item.id);
      
      // 延迟重试
      setTimeout(() => {
        this.insertIntoQueue(item);
      }, this.config.retryDelay);
      
    } else {
      // 标记为失败
      item.status = TestStatus.FAILED;
      item.completedAt = new Date();
      
      this.runningTests.delete(item.id);
      this.completedTests.set(item.id, item);
      
      this.emit('onItemFailed', item, error);
    }
    
    this.updateStats();
  }

  // 检查资源可用性
  private checkResourceAvailability(): boolean {
    const limits = this.config.resourceLimits;
    
    if (this.resourceMonitor.cpu > limits.cpu) {
      this.emit('onResourceLimitReached', 'cpu', this.resourceMonitor.cpu);
      return false;
    }
    
    if (this.resourceMonitor.memory > limits.memory) {
      this.emit('onResourceLimitReached', 'memory', this.resourceMonitor.memory);
      return false;
    }
    
    if (this.resourceMonitor.network > limits.network) {
      this.emit('onResourceLimitReached', 'network', this.resourceMonitor.network);
      return false;
    }
    
    return true;
  }

  // 调整并发数
  private adjustConcurrency(): void {
    const excess = this.runningTests.size - this.config.maxConcurrency;
    if (excess > 0) {
      // 取消一些运行中的测试（选择优先级最低的）
      const runningArray = Array.from(this.runningTests.values());
      runningArray
        .sort((a, b) => this.config.priorityWeights[a.priority] - this.config.priorityWeights[b.priority])
        .slice(0, excess)
        .forEach(item => {
          this.cancelTest(item.id);
        });
    }
  }

  // 预估测试时长
  private estimateDuration(config: TestConfig): number {
    const baseDurations: Record<TestType, number> = {
      [TestType.PERFORMANCE]: 60000,    // 1分钟
      [TestType.SECURITY]: 120000,     // 2分钟
      [TestType.SEO]: 30000,           // 30秒
      [TestType.ACCESSIBILITY]: 45000, // 45秒
      [TestType.COMPATIBILITY]: 90000, // 1.5分钟
      [TestType.UX]: 75000,            // 1分15秒
      [TestType.API]: 15000,           // 15秒
      [TestType.STRESS]: 300000        // 5分钟
    };
    
    return baseDurations[config.type] || 60000;
  }

  // 生成ID
  private generateId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 初始化统计数据
  private initializeStats(): QueueStats {
    return {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      throughput: 0,
      errorRate: 0
    };
  }

  // 初始化资源监控
  private initializeResourceMonitor(): ResourceUsage {
    return {
      cpu: 0,
      memory: 0,
      network: 0,
      activeTests: 0,
      maxConcurrency: this.config.maxConcurrency,
      queueLength: 0
    };
  }

  // 更新统计数据
  private updateStats(): void {
    const completed = Array.from(this.completedTests.values());
    const failed = completed.filter(item => item.status === TestStatus.FAILED);
    const cancelled = completed.filter(item => item.status === TestStatus.CANCELLED);
    const successful = completed.filter(item => item.status === TestStatus.COMPLETED);
    
    this.currentStats = {
      total: this.queue.length + this.runningTests.size + this.completedTests.size,
      pending: this.queue.length,
      running: this.runningTests.size,
      completed: successful.length,
      failed: failed.length,
      cancelled: cancelled.length,
      averageWaitTime: this.calculateAverageWaitTime(completed),
      averageExecutionTime: this.calculateAverageExecutionTime(successful),
      throughput: this.calculateThroughput(successful),
      errorRate: completed.length > 0 ? (failed.length / completed.length) * 100 : 0
    };
    
    this.resourceMonitor.activeTests = this.runningTests.size;
    this.resourceMonitor.queueLength = this.queue.length;
  }

  // 计算平均等待时间
  private calculateAverageWaitTime(items: QueueItem[]): number {
    if (items.length === 0) return 0;
    
    const waitTimes = items
      .filter(item => item.startedAt && item.createdAt)
      .map(item => item.startedAt!.getTime() - item.createdAt.getTime());
    
    return waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0;
  }

  // 计算平均执行时间
  private calculateAverageExecutionTime(items: QueueItem[]): number {
    if (items.length === 0) return 0;
    
    const executionTimes = items
      .filter(item => item.actualDuration)
      .map(item => item.actualDuration!);
    
    return executionTimes.length > 0 ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0;
  }

  // 计算吞吐量
  private calculateThroughput(items: QueueItem[]): number {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const recentItems = items.filter(item => 
      item.completedAt && item.completedAt.getTime() > oneHourAgo
    );
    
    return recentItems.length; // 每小时完成的测试数
  }

  // 启动统计收集
  private startStatsCollection(): void {
    this.statsTimer = window.setInterval(() => {
      this.updateStats();
      this.updateResourceMonitor();
    }, 5000); // 每5秒更新一次
  }

  // 更新资源监控
  private updateResourceMonitor(): void {
    // 模拟资源使用情况
    this.resourceMonitor.cpu = Math.random() * 100;
    this.resourceMonitor.memory = Math.random() * 100;
    this.resourceMonitor.network = Math.random() * 100;
  }

  // 销毁队列管理器
  destroy(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
    }
    
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    
    this.clearQueue();
    this.runningTests.clear();
    this.completedTests.clear();
  }
}

// 创建默认队列管理器实例
export const completeTestQueueManager = new CompleteTestQueueManager();

export default CompleteTestQueueManager;
