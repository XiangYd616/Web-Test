/**
 * 真实的后台测试管理器
 * 移除所有模拟实现，使用真实的API调用
 */

export interface TestInfo {
  id: string;
  type: string;
  config: any;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (results: any) => void;
  onError?: (error: Error) => void;
}

export interface TestProgress {
  id: string;
  progress: number;
  message: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results?: any;
  error?: string;
}

export class RealBackgroundTestManager {
  private apiBaseUrl: string;
  private activeTests: Map<string, TestProgress>;
  private progressCallbacks: Map<string, (progress: TestProgress) => void>;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.activeTests = new Map();
    this.progressCallbacks = new Map();
  }

  /**
   * 启动网站综合测试
   */
  async startWebsiteTest(testInfo: TestInfo): Promise<void> {
    try {
      this.initializeTest(testInfo);
      this.updateTestProgress(testInfo.id, 10, '🚀 正在启动网站测试...');

      const response = await fetch(`${this.apiBaseUrl}/test/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testInfo.config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.testId) {
        await this.pollTestStatus(testInfo.id, data.testId, 'website');
      } else {
        // 如果是同步返回结果
        this.completeTest(testInfo.id, data.results || data);
      }

    } catch (error) {
      this.failTest(testInfo.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 启动性能测试
   */
  async startPerformanceTest(testInfo: TestInfo): Promise<void> {
    try {
      this.initializeTest(testInfo);
      this.updateTestProgress(testInfo.id, 10, '⚡ 正在启动性能测试...');

      const response = await fetch(`${this.apiBaseUrl}/test/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testInfo.config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.testId) {
        await this.pollTestStatus(testInfo.id, data.testId, 'performance');
      } else {
        this.completeTest(testInfo.id, data.results || data);
      }

    } catch (error) {
      this.failTest(testInfo.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 启动安全测试
   */
  async startSecurityTest(testInfo: TestInfo): Promise<void> {
    try {
      this.initializeTest(testInfo);
      this.updateTestProgress(testInfo.id, 10, '🛡️ 正在启动安全测试...');

      const response = await fetch(`${this.apiBaseUrl}/test/security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testInfo.config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.testId) {
        await this.pollTestStatus(testInfo.id, data.testId, 'security');
      } else {
        this.completeTest(testInfo.id, data.results || data);
      }

    } catch (error) {
      this.failTest(testInfo.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 启动API测试
   */
  async startApiTest(testInfo: TestInfo): Promise<void> {
    try {
      this.initializeTest(testInfo);
      this.updateTestProgress(testInfo.id, 10, '📡 正在启动API测试...');

      const response = await fetch(`${this.apiBaseUrl}/test/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testInfo.config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.testId) {
        await this.pollTestStatus(testInfo.id, data.testId, 'api');
      } else {
        this.completeTest(testInfo.id, data.results || data);
      }

    } catch (error) {
      this.failTest(testInfo.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 启动压力测试
   */
  async startStressTest(testInfo: TestInfo): Promise<void> {
    try {
      this.initializeTest(testInfo);
      this.updateTestProgress(testInfo.id, 10, '💪 正在启动压力测试...');

      const response = await fetch(`${this.apiBaseUrl}/test/stress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(testInfo.config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.testId) {
        await this.pollTestStatus(testInfo.id, data.testId, 'stress');
      } else {
        this.completeTest(testInfo.id, data.results || data);
      }

    } catch (error) {
      this.failTest(testInfo.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 轮询测试状态直到完成
   */
  async pollTestStatus(
    frontendTestId: string,
    backendTestId: string,
    testType: string,
    maxAttempts: number = 60,
    interval: number = 2000
  ): Promise<void> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/test/${testType}/status/${backendTestId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const statusData = await response.json();

        // 更新进度
        if (statusData.progress !== undefined) {
          this.updateTestProgress(frontendTestId, statusData.progress, statusData.message || '测试进行中...');
        }

        // 检查是否完成
        if (statusData.status === 'completed' || statusData.status === 'finished') {
          this.completeTest(frontendTestId, statusData.results || statusData);
          return;
        }

        // 检查是否失败
        if (statusData.status === 'failed' || statusData.status === 'error') {
          throw new Error(statusData.message || '测试失败');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));

      } catch (error) {
        console.error(`轮询测试状态失败 (尝试 ${attempts + 1}/${maxAttempts}):`, error);
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error(`测试状态轮询超时: ${error instanceof Error ? error.message : String(error)}`);
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('测试状态轮询超时');
  }

  /**
   * 初始化测试
   */
  private initializeTest(testInfo: TestInfo): void {
    this.activeTests.set(testInfo.id, {
      id: testInfo.id,
      progress: 0,
      message: '准备开始测试...',
      status: 'pending'
    });

    if (testInfo.onProgress) {
      this.progressCallbacks.set(testInfo.id, (progress) => {
        testInfo.onProgress!(progress.progress, progress.message);
      });
    }
  }

  /**
   * 更新测试进度
   */
  private updateTestProgress(testId: string, progress: number, message: string): void {
    const testProgress = this.activeTests.get(testId);
    if (testProgress) {
      testProgress.progress = progress;
      testProgress.message = message;
      testProgress.status = 'running';

      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const callback = this.progressCallbacks.get(testId);
      if (callback) {
        callback(testProgress);
      }
    }
  }

  /**
   * 完成测试
   */
  private completeTest(testId: string, results: any): void {
    const testProgress = this.activeTests.get(testId);
    if (testProgress) {
      testProgress.progress = 100;
      testProgress.message = '测试完成';
      testProgress.status = 'completed';
      testProgress.results = results;

      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const callback = this.progressCallbacks.get(testId);
      if (callback) {
        callback(testProgress);
      }
    }
  }

  /**
   * 测试失败
   */
  private failTest(testId: string, error: string): void {
    const testProgress = this.activeTests.get(testId);
    if (testProgress) {
      testProgress.status = 'failed';
      testProgress.error = error;
      testProgress.message = `测试失败: ${error}`;

      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const callback = this.progressCallbacks.get(testId);
      if (callback) {
        callback(testProgress);
      }
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId: string): TestProgress | undefined {
    return this.activeTests.get(testId);
  }

  /**
   * 取消测试
   */
  async cancelTest(testId: string): Promise<void> {
    const testProgress = this.activeTests.get(testId);
    if (testProgress) {
      testProgress.status = 'failed';
      testProgress.message = '测试已取消';
      this.activeTests.delete(testId);
      this.progressCallbacks.delete(testId);
    }
  }
}

// 创建全局实例
export const realBackgroundTestManager = new RealBackgroundTestManager();
