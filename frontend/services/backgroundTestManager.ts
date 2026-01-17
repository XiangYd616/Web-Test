/**
 * 后台测试管理器 - 重构优化版本
 * 现在内部使用测试服务，保持向后兼容性
 * 已迁移到新的类型系统，使用统一的类型定义
 *
 * @deprecated 建议使用 testService 或通过 serviceCompatibility 导入
 */

import Logger from '@/utils/logger';
import type {
  CompletionCallback,
  ErrorCallback,
  ProgressCallback,
  TestServiceConfig,
} from '../types/base.types';
import { apiClient } from './api/client';

import { TestStatus, TestType } from '../types/enums';

// 导入测试服务
import testService from './testing/testService';

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

export type TestEvent =
  | 'testStarted'
  | 'testProgress'
  | 'testCompleted'
  | 'testFailed'
  | 'testCancelled';

export type TestListener = (event: TestEvent, data: TestInfo) => void;

type TestCallbacks = {
  onProgress?: ProgressCallback;
  onComplete?: CompletionCallback;
  onError?: ErrorCallback;
};

class BackgroundTestManager {
  private runningTests = new Map<string, TestInfo>();
  private completedTests = new Map<string, TestInfo>();
  private listeners = new Set<TestListener>();
  private testCounter = 0;
  private abortControllers = new Map<string, AbortController>();
  private backendTestIds = new Map<string, string>();

  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  private apiBaseUrl = '/test';

  constructor() {
    // 从localStorage恢复状态
    this.loadFromStorage();

    // 定期保存状态
    setInterval(() => this.saveToStorage(), 5000);

    // 监听统一测试服务的事件
    this.setupServiceListeners();
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token')
    );
  }

  private createAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * 设置统一服务监听器
   */
  private setupServiceListeners(): void {
    // Note: TestService may not have 'on' method
    // Using try-catch to prevent errors if method doesn't exist
    try {
      const service = testService as unknown as {
        on?: (event: string, handler: (data: unknown) => void) => void;
      };
      if (typeof service.on === 'function') {
        service.on('testStarted', (data: unknown) => {
          this.notifyListeners('testStarted', this.adaptServiceStatus(data));
        });

        service.on('testProgress', (data: unknown) => {
          this.notifyListeners('testProgress', this.adaptServiceStatus(data));
        });

        service.on('testCompleted', (data: unknown) => {
          this.notifyListeners('testCompleted', this.adaptServiceStatus(data));
        });

        service.on('testFailed', (data: unknown) => {
          this.notifyListeners('testFailed', this.adaptServiceStatus(data));
        });
      }
    } catch (error) {
      Logger.warn('Failed to setup test service listeners:', { error: String(error) });
    }
  }

  /**
   * 适配统一服务状态到本地格式
   */
  private adaptServiceStatus(data: unknown): TestInfo {
    const payload = (data || {}) as {
      testId?: string;
      id?: string;
      testType?: TestType;
      config?: unknown;
      status?: TestStatus;
      progress?: number;
      startTime?: Date;
      endTime?: Date;
      step?: string;
      currentStep?: string;
      result?: unknown;
      error?: unknown;
    };
    return {
      id: payload.testId || payload.id || this.generateTestId(),
      type: payload.testType || TestType.WEBSITE,
      config: payload.config || {},
      status: payload.status || TestStatus.PENDING,
      progress: payload.progress ?? 0,
      startTime: payload.startTime || new Date(),
      endTime: payload.endTime,
      currentStep: payload.step || payload.currentStep || '',
      result: payload.result,
      error: payload.error,
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
    const configObj = (config || {}) as Record<string, unknown>;
    const url =
      typeof configObj.url === 'string'
        ? configObj.url
        : typeof configObj.targetUrl === 'string'
          ? configObj.targetUrl
          : '';
    const serviceConfig: TestServiceConfig = {
      testType,
      url,
      timeout: typeof configObj.timeout === 'number' ? configObj.timeout : undefined,
      retries: typeof configObj.retries === 'number' ? configObj.retries : undefined,
    };

    const callbacks: TestCallbacks = {
      onProgress,
      onComplete,
      onError,
    };

    // 为了保持同步接口兼容性，我们需要立即返回一个ID
    const testId = this.generateTestId();

    // 尝试使用统一测试服务执行（如果可用）
    const service = testService as unknown as {
      startTest?: (config: TestServiceConfig, callbacks: TestCallbacks) => Promise<string>;
    };
    if (typeof service.startTest === 'function') {
      const testPromise = service.startTest(serviceConfig, callbacks);
      // 异步处理实际的测试ID映射
      testPromise
        .then((actualTestId: string) => {
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
            onError,
          };

          this.runningTests.set(actualTestId, testInfo);
          this.notifyListeners('testStarted', testInfo);
        })
        .catch((error: Error) => {
          Logger.error('Test service failed:', { error: String(error) });
          if (onError) onError(error);
        });
    } else {
      // Fallback: 直接创建测试信息
      const testInfo: TestInfo = {
        id: testId,
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
        onError,
      };
      this.runningTests.set(testId, testInfo);
      this.notifyListeners('testStarted', testInfo);

      // 异步执行测试
      this.executeTest(testInfo);
    }

    return testId;
  }

  // 取消测试 - 重构为使用统一测试服务
  cancelTest(testId: string): void {
    // 委托给统一测试服务
    const service = testService as unknown as { cancelTest?: (id: string) => void };
    service.cancelTest?.(testId);

    const controller = this.abortControllers.get(testId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(testId);
    }

    const backendTestId = this.backendTestIds.get(testId);
    if (backendTestId) {
      apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/${backendTestId}/stop`, {}, { headers: this.createAuthHeaders() })
        .catch(error => {
          Logger.error('Failed to stop backend test:', error);
        });
      this.backendTestIds.delete(testId);
    }

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
        case 'compatibility':
          await this.executeCompatibilityTest(testInfo);
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
      if (!this.abortControllers.get(testInfo.id)?.signal.aborted) {
        this.handleTestError(testInfo.id, error as Error);
      }
    } finally {
      this.abortControllers.delete(testInfo.id);
    }
  }

  // 执行网站综合测试
  private async executeWebsiteTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🌐 正在准备网站测试...');

    try {
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/website`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        testId?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '🔍 正在执行综合测试...');

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
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/performance`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        testId?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '📊 正在分析性能指标...');

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
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/security`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        message?: string;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '🛡️ 正在执行安全扫描...');

      // 模拟安全测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🔍 正在检查SSL证书...',
        '🛡️ 正在扫描安全漏洞...',
        '🔐 正在验证HTTPS配置...',
        '🚨 正在检查恶意软件...',
        '📋 正在生成安全报告...',
      ]);

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, (data as { results?: unknown }).results || data);
      } else {
        throw new Error(data.message || '安全测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行SEO测试
  private async executeSEOTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;
    const { url, ...options } = (config || {}) as Record<string, unknown>;

    this.updateTestProgress(testInfo.id, 10, '🔍 正在准备SEO测试...');

    try {
      const controller = new AbortController();
      this.abortControllers.set(testInfo.id, controller);

      const response = await apiClient.getInstance().post(
        `${this.apiBaseUrl}/seo`,
        {
          url,
          options,
        },
        {
          headers: this.createAuthHeaders(),
          signal: controller.signal,
        }
      );
      const data = response.data as {
        success?: boolean;
        status?: string;
        message?: string;
        error?: string;
        data?: Record<string, unknown>;
        results?: Record<string, unknown>;
        testId?: string;
        test_id?: string;
      };

      this.updateTestProgress(testInfo.id, 40, '📊 正在分析SEO数据...');

      const responsePayload = (data?.data || data?.results || data) as {
        testId?: string;
        test_id?: string;
        status?: string;
        success?: boolean;
        error?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };
      const backendTestId =
        responsePayload?.testId || responsePayload?.test_id || data?.testId || data?.test_id;

      if (backendTestId) {
        const normalizedTestId = String(backendTestId);
        this.backendTestIds.set(testInfo.id, normalizedTestId);
        await this.pollTestStatus(testInfo.id, normalizedTestId, 'seo');
        return;
      }

      const innerPayload = (responsePayload?.data ||
        responsePayload?.results ||
        responsePayload) as {
        data?: unknown;
        success?: boolean;
      };
      const testResult = innerPayload?.data || innerPayload;
      const isSuccessful =
        (data.success || responsePayload?.status === 'completed' || responsePayload?.success) &&
        responsePayload?.success !== false &&
        innerPayload?.success !== false;

      if (isSuccessful) {
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(
          responsePayload?.error || responsePayload?.message || data.message || 'SEO测试失败'
        );
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行兼容性测试
  private async executeCompatibilityTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;
    const configData = (config || {}) as {
      url?: string;
      browsers?: Array<{ enabled?: boolean; name?: string }>;
      devices?: Array<{ enabled?: boolean; type?: 'desktop' | 'tablet' | 'mobile' }>;
      includeAccessibility?: boolean;
      includeScreenshots?: boolean;
      includePerformance?: boolean;
      features?: unknown;
      testViewports?: unknown;
      testEngine?: unknown;
      timeout?: number;
      retries?: number;
    };

    this.updateTestProgress(testInfo.id, 10, '🧪 正在准备兼容性测试...');

    try {
      const enabledBrowsers = Array.isArray(configData.browsers)
        ? configData.browsers.filter(browser => browser?.enabled).map(browser => browser.name)
        : undefined;
      const devices = Array.isArray(configData.devices)
        ? configData.devices.reduce(
            (acc, device) => {
              if (!device?.enabled) return acc;
              if (device.type === 'desktop') acc.desktop = true;
              if (device.type === 'tablet') acc.tablet = true;
              if (device.type === 'mobile') acc.mobile = true;
              return acc;
            },
            { desktop: false, tablet: false, mobile: false }
          )
        : undefined;

      const response = await apiClient.getInstance().post(
        `${this.apiBaseUrl}/compatibility`,
        {
          url: configData.url,
          options: {
            browsers: enabledBrowsers,
            devices,
            accessibility: configData.includeAccessibility,
            includeScreenshots: configData.includeScreenshots,
            includePerformance: configData.includePerformance,
            features: configData.features,
            testViewports: configData.testViewports,
            testEngine: configData.testEngine,
            timeout: configData.timeout,
            retries: configData.retries,
          },
        },
        { headers: this.createAuthHeaders() }
      );
      const data = response.data as {
        success?: boolean;
        status?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 50, '🧩 正在分析兼容性...');
      const testResult = data.data || data.results || data;

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(data.message || '兼容性测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error as Error);
    }
  }

  // 执行API测试
  private async executeAPITest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔌 正在准备API测试...');

    try {
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/api-test`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '📡 正在执行API测试...');

      // 模拟API测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🔗 正在测试API连接...',
        '📊 正在验证响应数据...',
        '⚡ 正在测试响应时间...',
        '🔒 正在检查API安全性...',
        '📈 正在生成测试报告...',
      ]);

      const testResult = data.data || data.results || data;

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, testResult);
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
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/network`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        testId?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '🔍 正在执行网络测试...');

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
      const response = await apiClient
        .getInstance()
        .post(`${this.apiBaseUrl}/ux`, config, { headers: this.createAuthHeaders() });
      const data = response.data as {
        success?: boolean;
        status?: string;
        testId?: string;
        message?: string;
        data?: unknown;
        results?: unknown;
      };

      this.updateTestProgress(testInfo.id, 30, '🔍 正在分析用户体验...');

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
      const response = await apiClient.getInstance().post(`${this.apiBaseUrl}/database`, config, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = response.data as { success?: boolean; message?: string; data?: unknown };

      this.updateTestProgress(testInfo.id, 50, '📊 正在分析数据库性能...');

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

  // 轮询测试状态
  private async pollTestStatus(
    testId: string,
    backendTestId: string,
    testType: string
  ): Promise<void> {
    const maxAttempts = 60; // 最多轮询60次（5分钟）
    const pollInterval = 5000; // 每5秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await apiClient
          .getInstance()
          .get(`${this.apiBaseUrl}/${backendTestId}/status`, { headers: this.createAuthHeaders() });
        const data = response.data as {
          status?: string;
          progress?: number;
          message?: string;
          error?: string;
          result?: unknown;
          results?: unknown;
          data?: unknown;
        };
        const payload = (data?.data || data?.result || data) as {
          status?: string;
          progress?: number;
          message?: string;
          error?: string;
          result?: unknown;
          results?: unknown;
          data?: unknown;
        };
        const status = payload?.status;
        const progressValue = payload?.progress;
        const message = payload?.message || `🔄 ${testType}测试进行中...`;

        if (status === 'completed') {
          // 测试完成，更新结果
          const result = payload?.result || payload?.results || payload?.data;
          this.completeTest(testId, result);
          return;
        }

        if (status === 'failed' || status === 'error') {
          // 测试失败
          throw new Error(payload?.error || payload?.message || `${testType}测试失败`);
        }

        if (status === 'running' || status === 'pending') {
          // 测试仍在进行中，更新进度
          const progress =
            typeof progressValue === 'number' ? progressValue : Math.min(90, 30 + attempt * 2); // 从30%开始，最多到90%
          this.updateTestProgress(testId, progress, message);

          // 等待下次轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          // 未知状态，继续轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        Logger.error(`轮询测试状态失败 (尝试 ${attempt + 1}/${maxAttempts}):`, error);

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
        Logger.error('Error in test listener:', error);
      }
    });
  }

  // 保存到本地存储
  private saveToStorage(): void {
    try {
      const data = {
        completedTests: Array.from(this.completedTests.entries()),
        testCounter: this.testCounter,
      };
      localStorage.setItem('backgroundTestManager', JSON.stringify(data));
    } catch (error) {
      Logger.error('Failed to save test manager state:', error);
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
      Logger.error('Failed to load test manager state:', error);
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
