
/**
 * 后台测试管理器 - 重构优化版本
 * 现在内部使用统一测试服务，保持向后兼容性
 * 已迁移到新的类型系统，使用统一的类型定义
 *
 * @deprecated 建议使用 unifiedTestService 或通过 serviceCompatibility 导入
 */

import type {
  CompletionCallback,
  ErrorCallback,
  ProgressCallback
} from '../types/base.types';

import {
  TestStatus,
  TestType
} from '../types/enums';

// 导入统一测试服务
import type { UnifiedTestCallbacks, UnifiedTestConfig } from './testing/unifiedTestService';
import { unifiedTestService } from './testing/unifiedTestService';

export interface TestInfo {
  id: string;
  type: TestType;
  config: unknown;
  status: TestStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  currentStep: string;
  result: unknown;
  error: unknown;
  canSwitchPages?: boolean;
  onProgress?: ProgressCallback;
  onComplete?: CompletionCallback;
  onError?: ErrorCallback;
}

export type TestEvent = 'testStarted' | 'testProgress' | 'testCompleted' | 'testFailed' | 'testCancelled';

export type TestListener = (event: TestEvent, data: TestInfo) => void;

class BackgroundTestManager {
  private runningTests = new Map<string, TestInfo>();
  private completedTests = new Map<string, TestInfo>();
  private listeners = new Set<TestListener>();
  private testCounter = 0;

  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  private apiBaseUrl = import.meta.env.VITE_API_URL || `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`;

  constructor() {
    // 从localStorage恢复状态
    this.loadFromStorage();

    // 定期保存状态
    setInterval(() => this.saveToStorage(), 5000);

    // 监听统一测试服务的事件
    this.setupUnifiedServiceListeners();
  }

  /**
   * 设置统一服务监听器
   */
  private setupUnifiedServiceListeners(): void {
    unifiedTestService.on('testStarted', (data) => {
      this.notifyListeners('testStarted', this.adaptUnifiedStatus(data));
    });

    unifiedTestService.on('testProgress', (data) => {
      this.notifyListeners('testProgress', this.adaptUnifiedStatus(data));
    });

    unifiedTestService.on('testCompleted', (data) => {
      this.notifyListeners('testCompleted', this.adaptUnifiedStatus(data));
    });

    unifiedTestService.on('testFailed', (data) => {
      this.notifyListeners('testFailed', this.adaptUnifiedStatus(data));
    });
  }

  /**
   * 适配统一服务状态到本地格式
   */
  private adaptUnifiedStatus(data: unknown): TestInfo {
    return {
      id: data.testId || data.id,
      type: data.testType,
      config: data.config || {},
      status: data.status,
      progress: data.progress || 0,
      startTime: data.startTime || new Date(),
      endTime: data.endTime,
      currentStep: data.step || data.currentStep || '',
      result: data.result,
      error: data.error
    };
  }

  // 生成唯一测试ID
  generateTestId(): string {
    return `test_${Date.now()}_${++this.testCounter}`;
  }

  // 开始新测试 - 重构为使用统一测试服务
  startTest(
    testType: TestType,
    config: unknown,
    onProgress?: ProgressCallback,
    onComplete?: CompletionCallback,
    onError?: ErrorCallback
  ): string {
    // 转换为统一测试配置
    const unifiedConfig: UnifiedTestConfig = {
      testType,
      targetUrl: config.url || config.targetUrl,
      configuration: config
    };

    const callbacks: UnifiedTestCallbacks = {
      onProgress,
      onComplete,
      onError
    };

    // 使用统一测试服务执行
    const testPromise = unifiedTestService.startTest(unifiedConfig, callbacks);

    // 为了保持同步接口兼容性，我们需要立即返回一个ID
    const testId = this.generateTestId();

    // 异步处理实际的测试ID映射
    testPromise.then(actualTestId => {
      // 更新本地映射
      const testInfo: TestInfo = {
        id: actualTestId,
        type: testType,
        config,
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: new Date(),
        currentStep: '正在初始化测试...',
        result: null,
        error: null,
        onProgress,
        onComplete,
        onError
      };

      this.runningTests.set(actualTestId, testInfo);
      this.notifyListeners('testStarted', testInfo);
    });

    return testId;
  }

  // 取消测试 - 重构为使用统一测试服务
  cancelTest(testId: string): void {
    // 委托给统一测试服务
    unifiedTestService.cancelTest(testId);

    // 更新本地状态
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = TestStatus.CANCELLED;
      testInfo.endTime = new Date();
      testInfo.error = '用户取消了测试';

      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.notifyListeners('testCancelled', testInfo);

      if (testInfo.onError) {
        testInfo.onError(new Error('测试已取消'));
      }
    }
  }

  // 执行测试
  private async executeTest(testInfo: TestInfo): Promise<void> {
    try {
      switch (testInfo.type) {
        case TestType.STRESS:
          await this.executeWebsiteTest(testInfo);
          break;
        case 'performance':
          await this.executePerformanceTest(testInfo);
          break;
        case 'security':
          await this.executeSecurityTest(testInfo);
          break;
        case 'seo':
          await this.executeSEOTest(testInfo);
          break;
        case 'api':
          await this.executeAPITest(testInfo);
          break;
        case 'database':
          await this.executeDatabaseTest(testInfo);
          break;
        case 'network':
          await this.executeNetworkTest(testInfo);
          break;
        case 'ux':
          await this.executeUXTest(testInfo);
          break;
        case 'website':
          await this.executeWebsiteTest(testInfo);
          break;
        case 'stress':
          await this.executeStressTest(testInfo);
          break;
        default:
          throw new Error(`不支持的测试类型: ${testInfo.type}`);
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行网站综合测试
  private async executeWebsiteTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🌐 正在准备网站测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔍 正在执行综合测试...');

      // 真实的网站测试 - 等待后端完成
      const data = await response.json();

      if (data.testId) {
        // 轮询测试状态直到完成
        await this.pollTestStatus(testInfo.id, data.testId, 'website');
      }

      if (data.success || data.status === 'completed') {
        const testResult = data.data || data.results || data;
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(data.message || '网站测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行性能测试
  private async executePerformanceTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '⚡ 正在准备性能测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '📊 正在分析性能指标...');

      // 真实的性能测试 - 等待后端完成
      const data = await response.json();

      if (data.testId) {
        // 轮询测试状态直到完成
        await this.pollTestStatus(testInfo.id, data.testId, 'performance');
      }

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '性能测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行安全测试
  private async executeSecurityTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔒 正在准备安全测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🛡️ 正在执行安全扫描...');

      // 模拟安全测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🔍 正在检查SSL证书...',
        '🛡️ 正在扫描安全漏洞...',
        '🔐 正在验证HTTPS配置...',
        '🚨 正在检查恶意软件...',
        '📋 正在生成安全报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '安全测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行SEO测试
  private async executeSEOTest(testInfo: TestInfo): Promise<void> {
    // SEO测试现在使用前端实现，不再需要后端API
    this.handleTestError(testInfo.id, new Error('SEO测试已迁移到专用的SEO测试页面，请使用SEO测试功能'));
  }

  // 执行API测试
  private async executeAPITest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔌 正在准备API测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '📡 正在执行API测试...');

      // 模拟API测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🔗 正在测试API连接...',
        '📊 正在验证响应数据...',
        '⚡ 正在测试响应时间...',
        '🔒 正在检查API安全性...',
        '📈 正在生成测试报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || 'API测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行网络测试
  private async executeNetworkTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🌐 正在准备网络测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/network`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔍 正在执行网络测试...');

      const data = await response.json();

      if (data.testId) {
        // 轮询测试状态直到完成
        await this.pollTestStatus(testInfo.id, data.testId, 'network');
      }

      if (data.success || data.status === 'completed') {
        const testResult = data.data || data.results || data;
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(data.message || '网络测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行UX测试
  private async executeUXTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '👥 正在准备用户体验测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/ux`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔍 正在分析用户体验...');

      const data = await response.json();

      if (data.testId) {
        // 轮询测试状态直到完成
        await this.pollTestStatus(testInfo.id, data.testId, 'ux');
      }

      if (data.success || data.status === 'completed') {
        const testResult = data.data || data.results || data;
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(data.message || 'UX测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行数据库测试
  private async executeDatabaseTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔍 正在连接数据库...');

    try {
      const response = await fetch('/api/test/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 50, '📊 正在分析数据库性能...');

      const data = await response.json();


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.updateTestProgress(testInfo.id, 90, '✅ 正在生成测试报告...');

      if (data.success) {
        this.completeTest(testInfo.id, data.data);
      } else {
        throw new Error(data.message || '数据库测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行压力测试
  private async executeStressTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '💪 正在准备压力测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/stress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🚀 正在执行压力测试...');

      // 模拟压力测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '👥 正在模拟用户负载...',
        '📊 正在收集性能指标...',
        '⚡ 正在分析响应时间...',
        '🔍 正在检测瓶颈...',
        '📈 正在生成压力测试报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '压力测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 更新测试进度
  updateTestProgress(testId: string, progress: number, step: string, metrics?: unknown): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.progress = progress;
      testInfo.currentStep = step;


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.notifyListeners('testProgress', testInfo);

      if (testInfo.onProgress) {
        testInfo.onProgress(progress, step);
      }
    }
  }

  // 完成测试
  completeTest(testId: string, result: unknown): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = TestStatus.COMPLETED;
      testInfo.endTime = new Date();
      testInfo.result = result;
      testInfo.progress = 100;
      testInfo.currentStep = '✅ 测试完成';

      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.notifyListeners('testCompleted', testInfo);

      if (testInfo.onComplete) {
        testInfo.onComplete(result);
      }
    }
  }

  // 处理测试错误
  handleTestError(testId: string, error: Error): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = TestStatus.FAILED;
      testInfo.endTime = new Date();
      testInfo.error = error.message;
      testInfo.currentStep = '❌ 测试失败';

      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.notifyListeners('testFailed', testInfo);

      if (testInfo.onError) {
        testInfo.onError(error);
      }
    }
  }

  // 模拟渐进式测试
  async simulateProgressiveTest(
    testId: string,
    startProgress: number,
    endProgress: number,
    steps: string[],
    stepDuration: number = 2000
  ): Promise<void> {

    /**

     * for功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const progressIncrement = (endProgress - startProgress) / steps.length;

    for (let i = 0; i < steps.length; i++) {
      const currentProgress = startProgress + (progressIncrement * (i + 1));

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      this.updateTestProgress(testId, currentProgress, steps[i]);

      if (i < steps.length - 1) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
  }

  // 获取测试状态
  getTestStatus(testId: string): TestInfo | undefined {
    return this.runningTests.get(testId) || this.completedTests.get(testId);
  }

  // 获取运行中的测试
  getRunningTests(): TestInfo[] {
    return Array.from(this.runningTests.values());
  }

  // 获取已完成的测试
  getCompletedTests(): TestInfo[] {
    return Array.from(this.completedTests.values());
  }

  // 获取测试信息
  getTestInfo(testId: string): TestInfo | undefined {
    return this.runningTests.get(testId) || this.completedTests.get(testId);
  }

  // 获取测试历史
  getTestHistory(limit: number = 50): TestInfo[] {
    const completed = Array.from(this.completedTests.values());
    return completed
      .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
      .slice(0, limit);
  }

  // 清理已完成的测试
  cleanupCompletedTests(): void {
    this.completedTests.clear();
    this.saveToStorage();
  }

  // 添加监听器
  addListener(callback: TestListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 轮询测试状态
  private async pollTestStatus(testId: string, backendTestId: string, testType: string): Promise<void> {
    const maxAttempts = 60; // 最多轮询60次（5分钟）
    const pollInterval = 5000; // 每5秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/test-status/${backendTestId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          // 测试完成，更新结果
          this.completeTest(testId, data.results || data.data);
          return;
        } else if (data.status === 'failed' || data.status === 'error') {
          // 测试失败
          throw new Error(data.message || `${testType}测试失败`);
        } else if (data.status === 'running' || data.status === 'pending') {
          // 测试仍在进行中，更新进度
          const progress = Math.min(90, 30 + (attempt * 2)); // 从30%开始，最多到90%
          this.updateTestProgress(testId, progress, `🔄 ${testType}测试进行中...`);

          // 等待下次轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          // 未知状态，继续轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        console.error(`轮询测试状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);

        if (attempt === maxAttempts - 1) {
          // 最后一次尝试失败，抛出错误
          throw new Error(`${testType}测试轮询超时`);
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // 轮询超时
    throw new Error(`${testType}测试轮询超时`);
  }

  // 通知监听器
  private notifyListeners(event: TestEvent, data: TestInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in test listener:', error);
      }
    });
  }

  // 保存到本地存储
  private saveToStorage(): void {
    try {
      const data = {
        completedTests: Array.from(this.completedTests.entries()),
        testCounter: this.testCounter
      };
      localStorage.setItem('backgroundTestManager', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save test manager state:', error);
    }
  }

  // 从本地存储加载
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('backgroundTestManager');
      if (data) {
        const parsed = JSON.parse(data);
        this.completedTests = new Map(parsed.completedTests || []);
        this.testCounter = parsed.testCounter || 0;
      }
    } catch (error) {
      console.error('Failed to load test manager state:', error);
    }
  }

  // 清理资源
  cleanup(): void {
    this.runningTests.clear();
    this.completedTests.clear();
    this.listeners.clear();
  }
}

// 创建单例实例
const backgroundTestManager = new BackgroundTestManager();

export default backgroundTestManager;
