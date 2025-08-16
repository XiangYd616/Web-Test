import {apiService} from '../api/apiService';

export interface TestConfig {
  [key: string]: any;
}

export interface TestProgress {
  current: number;
  total: number;
  percentage: number;
  stage: string;
  message: string;
  startTime?: string;
  estimatedEndTime?: string;
}

export interface TestResult {
  id: string;
  testType: string;
  url: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  score?: number;
  results?: any;
  error?: string;
  progress?: TestProgress;
  createdAt: string;
  completedAt?: string;
}

export type TestStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

class TestService {
  private runningTests = new Map<string, TestResult>();
  private progressCallbacks = new Map<string, (progress: TestProgress) => void>();
  private resultCallbacks = new Map<string, (result: TestResult) => void>();

  /**
   * 启动测试
   */
  async startTest(testType: string, url: string, config: TestConfig = {}, testName?: string): Promise<string> {
    try {
      const response = await apiService.post('/api/test/run', {
        testType,
        url,
        config,
        testName: testName || `${testType.toUpperCase()}测试 - ${new Date().toLocaleString()}`
      });

      const testId = response.data.testId;

      // 初始化测试状态
      this.runningTests.set(testId, {
        id: testId,
        testType,
        url,
        status: 'running',
        createdAt: new Date().toISOString(),
        progress: {
          current: 0,
          total: 100,
          percentage: 0,
          stage: '初始化测试...',
          message: '正在准备测试环境',
          startTime: new Date().toISOString()
        }
      });

      // 开始轮询测试状态
      this.pollTestStatus(testId);

      return testId;
    } catch (error) {
      console.error('启动测试失败:', error);
      throw new Error(`启动测试失败: ${error.message}`);
    }
  }

  /**
   * 停止测试
   */
  async stopTest(testId: string): Promise<void> {
    try {
      await apiService.post(`/api/test/${testId}/stop`);

      const test = this.runningTests.get(testId);
      if (test) {
        test.status = 'cancelled';
        this.runningTests.set(testId, test);
        this.notifyResult(testId, test);
      }
    } catch (error) {
      console.error('停止测试失败:', error);
      throw new Error('停止测试失败');
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string): Promise<TestResult | null> {
    try {
      const response = await apiService.get(`/api/test/${testId}/status`);
      const result = response.data;

      // 更新本地状态
      this.runningTests.set(testId, result);

      return result;
    } catch (error) {
      console.error('获取测试状态失败:', error);
      return this.runningTests.get(testId) || null;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<TestResult | null> {
    try {
      const response = await apiService.get(`/api/test/${testId}/result`);
      return response.data;
    } catch (error) {
      console.error('获取测试结果失败:', error);
      throw new Error('获取测试结果失败');
    }
  }

  /**
   * 轮询测试状态
   */
  private async pollTestStatus(testId: string): Promise<void> {
    const poll = async () => {
      try {
        const result = await this.getTestStatus(testId);
        if (!result) return;

        // 通知进度更新
        if (result.progress) {
          this.notifyProgress(testId, result.progress);
        }

        // 检查测试是否完成
        if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
          
        this.runningTests.delete(testId);
          this.notifyResult(testId, result);
          return;
      }

        // 继续轮询
        setTimeout(poll, 2000);
      } catch (error) {
        console.error('轮询测试状态失败:', error);

        // 标记测试失败
        const test = this.runningTests.get(testId);
        if (test) {
          test.status = 'failed';
          test.error = error.message;
          this.runningTests.delete(testId);
          this.notifyResult(testId, test);
        }
      }
    };

    poll();
  }

  /**
   * 注册进度回调
   */
  onProgress(testId: string, callback: (progress: TestProgress) => void): void {
    this.progressCallbacks.set(testId, callback);
  }

  /**
   * 注册结果回调
   */
  onResult(testId: string, callback: (result: TestResult) => void): void {
    this.resultCallbacks.set(testId, callback);
  }

  /**
   * 移除回调
   */
  removeCallbacks(testId: string): void {
    this.progressCallbacks.delete(testId);
    this.resultCallbacks.delete(testId);
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(testId: string, progress: TestProgress): void {
    const callback = this.progressCallbacks.get(testId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * 通知结果更新
   */
  private notifyResult(testId: string, result: TestResult): void {
    const callback = this.resultCallbacks.get(testId);
    if (callback) {
      callback(result);
    }

    // 清理回调
    this.removeCallbacks(testId);
  }

  /**
   * 获取所有运行中的测试
   */
  getRunningTests(): TestResult[] {
    return Array.from(this.runningTests.values());
  }

  /**
   * 验证测试配置
   */
  validateConfig(testType: string, config: TestConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (testType) {
      case 'api':
        if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
          errors.push('超时时间必须在1秒到5分钟之间');
        }
        if (config.retries && (config.retries < 0 || config.retries > 10)) {
          errors.push('重试次数必须在0到10之间');
        }
        break;

      case 'stress':
        if (config.duration && (config.duration < 10 || config.duration > 3600)) {
          errors.push('测试时长必须在10秒到1小时之间');
        }
        if (config.concurrency && (config.concurrency < 1 || config.concurrency > 1000)) {
          errors.push('并发用户数必须在1到1000之间');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const testService = new TestService();
export default testService;
