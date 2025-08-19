/**
 * 网站测试服务
 * 
 * 提供网站综合测试的API调用功能
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import { apiClient } from './apiClient';

/**
 * 网站测试配置接口
 */
export interface WebsiteTestConfig {
  url: string;
  checks: string[];
  depth: number;
  maxPages: number;
  timeout: number;
  followExternalLinks: boolean;
}

/**
 * 页面测试结果接口
 */
export interface PageResult {
  url: string;
  status: 'healthy' | 'warning' | 'error';
  statusCode: number;
  loadTime: number;
  score: number;
  checks: {
    health?: any;
    seo?: any;
    performance?: any;
    security?: any;
    accessibility?: any;
    bestPractices?: any;
  };
  issues: string[];
}

/**
 * 网站测试结果接口
 */
export interface WebsiteTestResult {
  testId: string;
  url: string;
  timestamp: string;
  pages: Record<string, PageResult>;
  summary: {
    totalPages: number;
    healthyPages: number;
    warningPages: number;
    errorPages: number;
    overallScore: number;
    categories: Record<string, number>;
  };
  recommendations: string[];
  totalTime: number;
}

/**
 * 测试进度接口
 */
export interface TestProgress {
  testId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime: number;
  results?: WebsiteTestResult;
}

/**
 * 网站测试服务类
 */
export class WebsiteTestService {
  private static instance: WebsiteTestService;
  private activeTests = new Map<string, TestProgress>();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): WebsiteTestService {
    if (!WebsiteTestService.instance) {
      WebsiteTestService.instance = new WebsiteTestService();
    }
    return WebsiteTestService.instance;
  }

  /**
   * 开始网站测试
   */
  async startWebsiteTest(config: WebsiteTestConfig): Promise<string> {
    try {
      const response = await apiClient.post('/test/website', config);
      
      if (response.data.success) {
        const testId = response.data.data.testId;
        
        // 初始化测试状态
        this.activeTests.set(testId, {
          testId,
          status: 'running',
          progress: 0,
          message: '开始网站测试',
          startTime: Date.now()
        });

        return testId;
      } else {
        throw new Error(response.data.message || '启动网站测试失败');
      }
    } catch (error) {
      console.error('启动网站测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试进度
   */
  async getTestProgress(testId: string): Promise<TestProgress | null> {
    try {
      const response = await apiClient.get(`/test/website/status/${testId}`);
      
      if (response.data.success) {
        const progress = response.data.data;
        
        // 更新本地状态
        this.activeTests.set(testId, progress);
        
        return progress;
      } else {
        return this.activeTests.get(testId) || null;
      }
    } catch (error) {
      console.error('获取测试进度失败:', error);
      return this.activeTests.get(testId) || null;
    }
  }

  /**
   * 停止测试
   */
  async stopTest(testId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`/test/website/stop/${testId}`);
      
      if (response.data.success) {
        // 更新本地状态
        const currentTest = this.activeTests.get(testId);
        if (currentTest) {
          this.activeTests.set(testId, {
            ...currentTest,
            status: 'failed',
            message: '测试已停止'
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('停止测试失败:', error);
      return false;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<WebsiteTestResult | null> {
    try {
      const response = await apiClient.get(`/test/website/result/${testId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('获取测试结果失败:', error);
      return null;
    }
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(limit = 10): Promise<WebsiteTestResult[]> {
    try {
      const response = await apiClient.get(`/test/website/history?limit=${limit}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('获取测试历史失败:', error);
      return [];
    }
  }

  /**
   * 删除测试结果
   */
  async deleteTestResult(testId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/test/website/result/${testId}`);
      
      if (response.data.success) {
        this.activeTests.delete(testId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除测试结果失败:', error);
      return false;
    }
  }

  /**
   * 轮询测试进度
   */
  async pollTestProgress(
    testId: string, 
    onProgress: (progress: TestProgress) => void,
    onComplete: (result: WebsiteTestResult) => void,
    onError: (error: Error) => void,
    interval = 2000
  ): Promise<void> {
    const poll = async () => {
      try {
        const progress = await this.getTestProgress(testId);
        
        if (!progress) {
          onError(new Error('无法获取测试进度'));
          return;
        }

        onProgress(progress);

        if (progress.status === 'completed' && progress.results) {
          onComplete(progress.results);
        } else if (progress.status === 'failed') {
          onError(new Error(progress.message || '测试失败'));
        } else if (progress.status === 'running') {
          // 继续轮询
          setTimeout(poll, interval);
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error('轮询失败'));
      }
    };

    poll();
  }

  /**
   * 验证URL格式
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): WebsiteTestConfig {
    return {
      url: '',
      checks: ['health', 'seo', 'performance', 'security'],
      depth: 1,
      maxPages: 10,
      timeout: 60000,
      followExternalLinks: false
    };
  }

  /**
   * 验证测试配置
   */
  validateConfig(config: WebsiteTestConfig): string[] {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL不能为空');
    } else if (!this.validateUrl(config.url)) {
      errors.push('URL格式不正确');
    }

    if (!config.checks || config.checks.length === 0) {
      errors.push('至少选择一种检查类型');
    }

    if (config.depth < 1 || config.depth > 5) {
      errors.push('检查深度必须在1-5之间');
    }

    if (config.maxPages < 1 || config.maxPages > 50) {
      errors.push('最大页面数必须在1-50之间');
    }

    if (config.timeout < 30000 || config.timeout > 300000) {
      errors.push('超时时间必须在30-300秒之间');
    }

    return errors;
  }

  /**
   * 清理本地状态
   */
  clearLocalState(): void {
    this.activeTests.clear();
  }
}

// 导出单例实例
export const websiteTestService = WebsiteTestService.getInstance();
