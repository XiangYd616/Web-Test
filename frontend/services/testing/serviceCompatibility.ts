/**
 * 🔄 测试服务兼容性适配器
 * 为现有代码提供向后兼容性，确保平滑迁移到统一测试服务
 * 
 * 兼容的服务：
 * - backgroundTestManager
 * - unifiedBackgroundTestManager
 * - testApiService
 * - testScheduler
 */

import { TestType } from '../../types/enums';
import { unifiedTestService, type UnifiedTestCallbacks, type UnifiedTestConfig } from './unifiedTestService';

// ==================== backgroundTestManager 兼容性 ====================

/**
 * backgroundTestManager 兼容性适配器
 * @deprecated 请使用 unifiedTestService 替代
 */
export const backgroundTestManagerCompat = {
  /**
   * 开始测试 - 兼容原始接口
   */
  async startTest(
    testType: TestType | string,
    config: any,
    onProgress?: (progress: number, step: string, metrics?: any) => void,
    onComplete?: (result: any) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
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

    return await unifiedTestService.startTest(unifiedConfig, callbacks);
  },

  /**
   * 取消测试 - 兼容原始接口
   */
  async cancelTest(testId: string): Promise<void> {
    return unifiedTestService.cancelTest(testId);
  },

  /**
   * 获取测试状态 - 兼容原始接口
   */
  getTestStatus(testId: string): any {
    const status = unifiedTestService.getTestStatus(testId);
    if (!status) return null;

    return {
      id: status.id,
      type: status.testType,
      status: status.status,
      progress: status.progress,
      currentStep: status.currentStep,
      startTime: status.startTime,
      endTime: status.endTime,
      result: status.result,
      error: status.error
    };
  },

  /**
   * 获取运行中的测试 - 兼容原始接口
   */
  getRunningTests(): any[] {
    return unifiedTestService.getActiveTests()
      .filter(test => test.status === 'running')
      .map(test => ({
        id: test.id,
        type: test.testType,
        status: test.status,
        progress: test.progress,
        currentStep: test.currentStep,
        startTime: test.startTime
      }));
  },

  /**
   * 添加监听器 - 兼容原始接口
   */
  addListener(listener: (event: string, data: any) => void): void {
    unifiedTestService.on('testStarted', (data) => listener('testStarted', data));
    unifiedTestService.on('testProgress', (data) => listener('testProgress', data));
    unifiedTestService.on('testCompleted', (data) => listener('testCompleted', data));
    unifiedTestService.on('testFailed', (data) => listener('testFailed', data));
    unifiedTestService.on('testCancelled', (data) => listener('testCancelled', data));
  },

  /**
   * 清理 - 兼容原始接口
   */
  cleanup(): void {
    unifiedTestService.cleanup();
  }
};

// ==================== testApiService 兼容性 ====================

/**
 * testApiService 兼容性适配器
 * @deprecated 请使用 unifiedTestService 替代
 */
export const testApiServiceCompat = {
  /**
   * 执行测试 - 兼容原始接口
   */
  async executeTest(config: {
    test_type: string;
    target_url: string;
    configuration: Record<string, any>;
  }): Promise<any> {
    const unifiedConfig: UnifiedTestConfig = {
      testType: config.test_type,
      targetUrl: config.target_url,
      configuration: config.configuration
    };

    const testId = await unifiedTestService.startTest(unifiedConfig);

    // 等待测试完成
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const status = unifiedTestService.getTestStatus(testId);
        if (!status) {
          reject(new Error('测试状态丢失'));
          return;
        }

        if (status.status === 'completed') {
          resolve({
            success: true,
            data: status.result,
            execution_id: testId
          });
        } else if (status.status === 'failed') {
          reject(new Error(status.error || '测试执行失败'));
        } else {
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    });
  },

  /**
   * 获取测试结果 - 兼容原始接口
   */
  async getTestResult(executionId: string): Promise<any> {
    const result = unifiedTestService.getTestResult(executionId);
    return {
      success: !!result,
      data: result
    };
  },

  /**
   * 获取测试历史 - 兼容原始接口
   */
  async getTestHistory(): Promise<any> {
    const stats = unifiedTestService.getStats();
    return {
      success: true,
      data: {
        total: stats.totalResults,
        completed: stats.completedTests,
        running: stats.runningTests
      }
    };
  }
};

// ==================== unifiedBackgroundTestManager 兼容性 ====================

/**
 * unifiedBackgroundTestManager 兼容性适配器
 * @deprecated 请使用 unifiedTestService 替代
 */
export const unifiedBackgroundTestManagerCompat = {
  /**
   * 启动后台测试 - 兼容原始接口
   */
  async startBackgroundTest(
    type: TestType,
    config: any,
    callbacks?: {
      onProgress?: (progress: number, step: string) => void;
      onComplete?: (result: any) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<string> {
    const unifiedConfig: UnifiedTestConfig = {
      testType: type,
      targetUrl: config.url || config.targetUrl,
      configuration: config
    };

    return unifiedTestService.startTest(unifiedConfig, callbacks);
  },

  /**
   * 获取任务状态 - 兼容原始接口
   */
  getTaskStatus(taskId: string): any {
    const status = unifiedTestService.getTestStatus(taskId);
    if (!status) return null;

    return {
      id: status.id,
      type: status.testType,
      status: status.status,
      progress: status.progress,
      currentStep: status.currentStep,
      startTime: status.startTime,
      canSwitchPages: true // 后台测试特性
    };
  },

  /**
   * 取消任务 - 兼容原始接口
   */
  async cancelTask(taskId: string): Promise<void> {
    return unifiedTestService.cancelTest(taskId);
  }
};

// ==================== 导出兼容性接口 ====================

// 为了向后兼容，导出原始名称
export const backgroundTestManager = backgroundTestManagerCompat;
export const testApiService = testApiServiceCompat;
export const unifiedBackgroundTestManager = unifiedBackgroundTestManagerCompat;

// 默认导出统一服务
export default unifiedTestService;
