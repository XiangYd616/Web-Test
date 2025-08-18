/**
 * 测试状态管理器
 * 管理测试执行状态、结果和用户界面状态
 */

export interface TestState     {
  id: string;
  type: 'performance' | 'security' | 'seo' | 'stress' | 'api' | 'compatibility'
  url: string;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  results?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface GlobalTestState     {
  activeTests: Map<string, TestState>;
  testHistory: TestState[];
  currentTest?: TestState;
  isAnyTestRunning: boolean;
  maxConcurrentTests: number;
  queuedTests: TestState[];
}

export interface StateChangeListener     {
  (state: GlobalTestState): void;
}

class TestStateManager {
  private state: GlobalTestState;
  private listeners: Set<StateChangeListener> = new Set();
  private storageKey = 'test-state'
  constructor() {
    this.state = {
      activeTests: new Map(),
      testHistory: [],
      isAnyTestRunning: false,
      maxConcurrentTests: 3,
      queuedTests: []
    };

    this.loadState();
  }

  /**
   * 获取当前状态
   */
  getState(): GlobalTestState {
    return {
      ...this.state,
      activeTests: new Map(this.state.activeTests)
    };
  }

  /**
   * 添加状态变化监听器
   */
  addListener(listener: StateChangeListener): ()  => void {
    this.listeners.add(listener);
    
    // 返回取消监听函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 创建新测试
   */
  createTest(
    type: TestState['type'],
    url: string,
    metadata?: Record<string, any>
  ): TestState {
    const test: TestState  = {
      id: this.generateTestId(),
      type,
      url,
      status: 'idle',
      progress: 0,
      metadata
    };
    this.updateState(state => {
      // 如果达到最大并发数，加入队列
      if (state.activeTests.size >= state.maxConcurrentTests) {
        state.queuedTests.push(test);
      } else {
        state.activeTests.set(test.id, test);
      }
    });

    return test;
  }

  /**
   * 开始测试
   */
  startTest(testId: string): boolean {
    const test = this.state.activeTests.get(testId);
    if (!test || test.status !== 'idle') {
        return false;
      }

    this.updateState(state => {
      const testToUpdate = state.activeTests.get(testId);
      if (testToUpdate) {
        testToUpdate.status = 'running'
        testToUpdate.startTime = new Date();
        testToUpdate.progress = 0;
        state.currentTest = testToUpdate;
        state.isAnyTestRunning = true;
      }
    });

    return true;
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId: string, progress: number): boolean {
    const test = this.state.activeTests.get(testId);
    if (!test || test.status !== 'running') {
        return false;
      }

    this.updateState(state => {
      const testToUpdate = state.activeTests.get(testId);
      if (testToUpdate) {
        testToUpdate.progress = Math.max(0, Math.min(100, progress));
      }
    });

    return true;
  }

  /**
   * 完成测试
   */
  completeTest(testId: string, results: any): boolean {
    const test = this.state.activeTests.get(testId);
    if (!test || test.status !== 'running') {
        return false;
      }

    this.updateState(state => {
      const testToUpdate = state.activeTests.get(testId);
      if (testToUpdate) {
        testToUpdate.status = 'completed'
        testToUpdate.endTime = new Date();
        testToUpdate.duration = testToUpdate.endTime.getTime() - (testToUpdate.startTime?.getTime() || 0);
        testToUpdate.progress = 100;
        testToUpdate.results = results;

        // 移动到历史记录
        state.testHistory.unshift({ ...testToUpdate });
        state.activeTests.delete(testId);

        // 更新全局状态
        this.updateGlobalFlags(state);

        // 处理队列中的测试
        this.processQueue(state);
      }
    });

    return true;
  }

  /**
   * 测试失败
   */
  failTest(testId: string, error: string): boolean {
    const test = this.state.activeTests.get(testId);
    if (!test) {
      
        return false;
      }

    this.updateState(state => {
      const testToUpdate = state.activeTests.get(testId);
      if (testToUpdate) {
        testToUpdate.status = 'failed'
        testToUpdate.endTime = new Date();
        testToUpdate.duration = testToUpdate.endTime.getTime() - (testToUpdate.startTime?.getTime() || 0);
        testToUpdate.error = error;

        // 移动到历史记录
        state.testHistory.unshift({ ...testToUpdate });
        state.activeTests.delete(testId);

        // 更新全局状态
        this.updateGlobalFlags(state);

        // 处理队列中的测试
        this.processQueue(state);
      }
    });

    return true;
  }

  /**
   * 取消测试
   */
  cancelTest(testId: string): boolean {
    const test = this.state.activeTests.get(testId) || 
                 this.state.queuedTests.find(t => t.id === testId);
    
    if (!test) {
      
        return false;
      }

    this.updateState(state => {
      // 从活跃测试中移除
      if (state.activeTests.has(testId)) {
        const testToUpdate = state.activeTests.get(testId)!;
        testToUpdate.status = 'cancelled'
        testToUpdate.endTime = new Date();
        testToUpdate.duration = testToUpdate.endTime.getTime() - (testToUpdate.startTime?.getTime() || 0);

        state.testHistory.unshift({ ...testToUpdate });
        state.activeTests.delete(testId);
      }

      // 从队列中移除
      const queueIndex = state.queuedTests.findIndex(t => t.id === testId);
      if (queueIndex !== -1) {
        const queuedTest = state.queuedTests[queueIndex];
        queuedTest.status = 'cancelled'
        state.testHistory.unshift({ ...queuedTest });
        state.queuedTests.splice(queueIndex, 1);
      }

      // 更新全局状态
      this.updateGlobalFlags(state);

      // 处理队列中的测试
      this.processQueue(state);
    });

    return true;
  }

  /**
   * 获取测试详情
   */
  getTest(testId: string): TestState | undefined {
    return this.state.activeTests.get(testId) || 
           this.state.queuedTests.find(t => t.id === testId) ||
           this.state.testHistory.find(t => t.id === testId);
  }

  /**
   * 获取活跃测试
   */
  getActiveTests(): TestState[] {
    return Array.from(this.state.activeTests.values());
  }

  /**
   * 获取队列中的测试
   */
  getQueuedTests(): TestState[] {
    return [...this.state.queuedTests];
  }

  /**
   * 获取测试历史
   */
  getTestHistory(limit?: number): TestState[] {
    return limit ? this.state.testHistory.slice(0, limit) : [...this.state.testHistory];
  }

  /**
   * 清空测试历史
   */
  clearHistory(): void {
    this.updateState(state => {
      state.testHistory = [];
    });
  }

  /**
   * 设置最大并发测试数
   */
  setMaxConcurrentTests(max: number): void {
    this.updateState(state => {
      state.maxConcurrentTests = Math.max(1, max);
      this.processQueue(state);
    });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activeCount: number;
    queuedCount: number;
    completedCount: number;
    failedCount: number;
    totalCount: number;
  } {
    const completed = this.state.testHistory.filter(t => t.status === 'completed').length;
    const failed = this.state.testHistory.filter(t => t.status === 'failed').length;
    return {
      activeCount: this.state.activeTests.size,
      queuedCount: this.state.queuedTests.length,
      completedCount: completed,
      failedCount: failed,
      totalCount: this.state.activeTests.size + this.state.queuedTests.length + this.state.testHistory.length
    };
  }

  /**
   * 更新状态
   */
  private updateState(updater: (state: GlobalTestState) => void): void {
    updater(this.state);
    this.saveState();
    this.notifyListeners();
  }

  /**
   * 更新全局标志
   */
  private updateGlobalFlags(state: GlobalTestState): void {
    state.isAnyTestRunning = Array.from(state.activeTests.values()).some(t => t.status === 'running");
    if (!state.isAnyTestRunning) {
      state.currentTest = undefined;
    }
  }

  /**
   * 处理队列
   */
  private processQueue(state: GlobalTestState): void {
    while (state.queuedTests.length > 0 && state.activeTests.size < state.maxConcurrentTests) {
      const nextTest = state.queuedTests.shift()!;
      state.activeTests.set(nextTest.id, nextTest);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state change listener: ', error);
      }
    });
  }

  /**
   * 保存状态
   */
  private saveState(): void {
    try {
      const stateToSave = {
        testHistory: this.state.testHistory.slice(0, 100), // 只保存最近100条
        maxConcurrentTests: this.state.maxConcurrentTests
      };
      localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save test state: ', error);
    }
  }

  /**
   * 加载状态
   */
  private loadState(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.testHistory = (parsed.testHistory || []).map((test: any) => ({
          ...test,
          startTime: test.startTime ? new Date(test.startTime) : undefined,
          endTime: test.endTime ? new Date(test.endTime) : undefined
        }));
        this.state.maxConcurrentTests = parsed.maxConcurrentTests || 3;
      }
    } catch (error) {
      console.warn('Failed to load test state:', error);
    }
  }

  /**
   * 生成测试ID
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// 创建单例实例
const testStateManager = new TestStateManager();

export default testStateManager;
export { TestStateManager };
