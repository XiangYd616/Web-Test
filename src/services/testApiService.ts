/**
 * 测试API服务 - 处理各种测试相关的API调用
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface TestConfig {
  url: string;
  [key: string]: any;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface TestProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
}

interface TestSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: TestProgress[];
  result?: TestResult;
  error?: string;
  startTime: number;
  endTime?: number;
}

class TestApiService {
  private sessions: Map<string, TestSession> = new Map();
  private progressCallbacks: Map<string, (progress: TestProgress) => void> = new Map();

  // 获取认证token
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || localStorage.getItem('token');
  }

  // 通用请求方法
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 网站测试
  async runWebsiteTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'website-test');

      const result = await this.request('/tests/website', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('Website test failed:', error);
      throw error;
    }
  }

  // 性能测试
  async runPerformanceTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'performance-test');

      const result = await this.request('/tests/performance', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('Performance test failed:', error);
      throw error;
    }
  }

  // 安全测试
  async runSecurityTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'security-test');

      const result = await this.request('/tests/security', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('Security test failed:', error);
      throw error;
    }
  }

  // SEO测试
  async runSEOTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'seo-test');

      const result = await this.request('/tests/seo', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('SEO test failed:', error);
      throw error;
    }
  }

  // API测试
  async runAPITest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'api-test');

      const result = await this.request('/tests/api', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('API test failed:', error);
      throw error;
    }
  }

  // 压力测试
  async runStressTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'stress-test');

      const result = await this.request('/tests/stress', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('Stress test failed:', error);
      throw error;
    }
  }

  // 兼容性测试
  async runCompatibilityTest(config: TestConfig): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      this.createSession(sessionId, 'compatibility-test');

      const result = await this.request('/tests/compatibility', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      this.updateSessionResult(sessionId, result);
      return sessionId;
    } catch (error) {
      console.error('Compatibility test failed:', error);
      throw error;
    }
  }

  // 获取测试结果
  async getTestResult(sessionId: string): Promise<TestResult | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      try {
        const result = await this.request(`/tests/results/${sessionId}`);
        return result;
      } catch (error) {
        console.error('Failed to get test result:', error);
        return null;
      }
    }
    return session.result || null;
  }

  // 获取测试状态
  getTestStatus(sessionId: string): TestSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // 取消测试
  async cancelTest(sessionId: string): Promise<boolean> {
    try {
      await this.request(`/tests/cancel/${sessionId}`, {
        method: 'POST',
      });

      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.error = 'Test cancelled by user';
        session.endTime = Date.now();
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel test:', error);
      return false;
    }
  }

  // 获取测试历史
  async getTestHistory(limit = 50): Promise<any[]> {
    try {
      const result = await this.request(`/tests/history?limit=${limit}`);
      return result.data || [];
    } catch (error) {
      console.error('Failed to get test history:', error);
      return [];
    }
  }

  // 导出测试结果
  async exportTestResults(testId: string, format: 'json' | 'csv' | 'pdf' | 'html'): Promise<any> {
    try {
      const result = await this.request(`/tests/export/${testId}?format=${format}`, {
        method: 'GET',
      });
      return result;
    } catch (error) {
      console.error('Failed to export test results:', error);
      throw error;
    }
  }

  // 删除测试结果
  async deleteTestResult(resultId: string): Promise<boolean> {
    try {
      await this.request(`/tests/results/${resultId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to delete test result:', error);
      return false;
    }
  }

  // 检查测试引擎状态
  async checkEngineStatus(): Promise<TestResult> {
    try {
      const result = await this.request('/test-engines/status');
      return {
        success: true,
        data: result.data || result,
        message: result.message || 'Engine status retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to check engine status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check engine status',
        data: {
          lighthouse: { available: false, version: 'unknown' },
          playwright: { available: false, version: 'unknown' },
          k6: { available: false, version: 'unknown' },
          puppeteer: { available: false, version: 'unknown' }
        }
      };
    }
  }

  // 会话管理方法
  private generateSessionId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSession(sessionId: string, type: string): void {
    const session: TestSession = {
      id: sessionId,
      status: 'pending',
      progress: [{
        stage: 'initializing',
        progress: 0,
        message: `Starting ${type}...`,
        timestamp: Date.now()
      }],
      startTime: Date.now()
    };

    this.sessions.set(sessionId, session);
  }

  private updateSessionResult(sessionId: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.result = result;
      session.endTime = Date.now();
      session.progress.push({
        stage: 'completed',
        progress: 100,
        message: 'Test completed successfully',
        timestamp: Date.now()
      });
    }
  }

  // 注册进度回调
  onProgress(sessionId: string, callback: (progress: TestProgress) => void): void {
    this.progressCallbacks.set(sessionId, callback);
  }

  // 移除进度回调
  removeProgressCallback(sessionId: string): void {
    this.progressCallbacks.delete(sessionId);
  }

  // 清理会话
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.progressCallbacks.delete(sessionId);
  }

  // 清理所有会话
  clearAllSessions(): void {
    this.sessions.clear();
    this.progressCallbacks.clear();
  }
}

// 导出单例实例
export const testApiService = new TestApiService();
export const testAPI = testApiService; // 兼容性导出

// 导出类型
export type { TestConfig, TestProgress, TestResult, TestSession };

export default testApiService;
