/**
 * 内容检测服务
 * 
 * 提供内容安全检测的API调用功能
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import { apiClient } from './apiClient';

/**
 * 内容检测配置接口
 */
export interface ContentDetectionConfig {
  url: string;
  checks: string[];
  depth: number;
  timeout: number;
  language: string;
  strictMode: boolean;
}

/**
 * 检查结果接口
 */
export interface CheckResult {
  score: number;
  status: 'safe' | 'warning' | 'dangerous' | 'good' | 'fair' | 'poor' | 'risky';
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    count?: number;
    details?: any;
  }>;
  details: any;
}

/**
 * 内容检测结果接口
 */
export interface ContentDetectionResult {
  testId: string;
  url: string;
  timestamp: string;
  checks: Record<string, CheckResult>;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  issues: any[];
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
  results?: ContentDetectionResult;
}

/**
 * 内容检测服务类
 */
export class ContentDetectionService {
  private static instance: ContentDetectionService;
  private activeTests = new Map<string, TestProgress>();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ContentDetectionService {
    if (!ContentDetectionService.instance) {
      ContentDetectionService.instance = new ContentDetectionService();
    }
    return ContentDetectionService.instance;
  }

  /**
   * 开始内容检测
   */
  async startContentDetection(config: ContentDetectionConfig): Promise<string> {
    try {
      const response = await apiClient.post('/test/content-detection', config);
      
      if (response.data.success) {
        const testId = response.data.data.testId;
        
        // 初始化测试状态
        this.activeTests.set(testId, {
          testId,
          status: 'running',
          progress: 0,
          message: '开始内容检测',
          startTime: Date.now()
        });

        return testId;
      } else {
        throw new Error(response.data.message || '启动内容检测失败');
      }
    } catch (error) {
      console.error('启动内容检测失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试进度
   */
  async getTestProgress(testId: string): Promise<TestProgress | null> {
    try {
      const response = await apiClient.get(`/test/content-detection/status/${testId}`);
      
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
      const response = await apiClient.post(`/test/content-detection/stop/${testId}`);
      
      if (response.data.success) {
        // 更新本地状态
        const currentTest = this.activeTests.get(testId);
        if (currentTest) {
          this.activeTests.set(testId, {
            ...currentTest,
            status: 'failed',
            message: '检测已停止'
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
  async getTestResult(testId: string): Promise<ContentDetectionResult | null> {
    try {
      const response = await apiClient.get(`/test/content-detection/result/${testId}`);
      
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
  async getTestHistory(limit = 10): Promise<ContentDetectionResult[]> {
    try {
      const response = await apiClient.get(`/test/content-detection/history?limit=${limit}`);
      
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
      const response = await apiClient.delete(`/test/content-detection/result/${testId}`);
      
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
    onComplete: (result: ContentDetectionResult) => void,
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
          onError(new Error(progress.message || '检测失败'));
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
  getDefaultConfig(): ContentDetectionConfig {
    return {
      url: '',
      checks: ['malicious', 'sensitive', 'quality'],
      depth: 1,
      timeout: 30000,
      language: 'auto',
      strictMode: false
    };
  }

  /**
   * 验证检测配置
   */
  validateConfig(config: ContentDetectionConfig): string[] {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL不能为空');
    } else if (!this.validateUrl(config.url)) {
      errors.push('URL格式不正确');
    }

    if (!config.checks || config.checks.length === 0) {
      errors.push('至少选择一种检测类型');
    }

    if (config.depth < 1 || config.depth > 3) {
      errors.push('检测深度必须在1-3之间');
    }

    if (config.timeout < 10000 || config.timeout > 120000) {
      errors.push('超时时间必须在10-120秒之间');
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
export const contentDetectionService = ContentDetectionService.getInstance();
