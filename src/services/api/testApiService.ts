/**
 * 统一的测试API服务
 * 整合testApiService.ts和backgroundTestManager.ts中的重复功能
 */

import { BaseApiService } from './baseApiService';

export interface TestConfig {
  url: string;
  testType?: string;
  [key: string]: any;
}

export interface TestSession {
  id: string;
  type: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  config: TestConfig;
  result?: any;
  error?: string;
}

export interface TestProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: number;
  metrics?: any;
}

export type TestListener = (event: string, data: any) => void;

export class UnifiedTestApiService extends BaseApiService {
  private sessions = new Map<string, TestSession>();
  private listeners = new Set<TestListener>();
  private sessionCounter = 0;

  constructor(baseUrl?: string) {
    super(baseUrl);
    this.loadSessionsFromStorage();

    // 定期保存会话状态
    setInterval(() => this.saveSessionsToStorage(), 5000);
  }

  /**
   * 🔧 生成唯一会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${++this.sessionCounter}`;
  }

  /**
   * 🔧 创建测试会话
   */
  private createSession(type: string, config: TestConfig): TestSession {
    const sessionId = this.generateSessionId();
    const session: TestSession = {
      id: sessionId,
      type,
      status: 'idle', // 🔧 简化：使用idle作为初始状态
      progress: 0,
      currentStep: '正在初始化测试...',
      startTime: new Date(),
      config,
      result: null,
      error: null
    };

    this.sessions.set(sessionId, session);
    this.notifyListeners('sessionCreated', session);
    return session;
  }

  /**
   * 🔧 更新会话状态
   */
  private updateSession(sessionId: string, updates: Partial<TestSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      this.notifyListeners('sessionUpdated', session);
    }
  }

  /**
   * 🔧 更新测试进度
   */
  private updateProgress(sessionId: string, progress: number, step: string, metrics?: any): void {
    this.updateSession(sessionId, {
      progress: Math.min(100, Math.max(0, progress)),
      currentStep: step
    });

    this.notifyListeners('progressUpdated', {
      sessionId,
      progress,
      step,
      metrics,
      timestamp: Date.now()
    });
  }

  /**
   * 🔧 完成测试
   */
  private completeSession(sessionId: string, result: any): void {
    this.updateSession(sessionId, {
      status: 'completed',
      progress: 100,
      currentStep: '测试完成',
      endTime: new Date(),
      result
    });

    this.notifyListeners('sessionCompleted', { sessionId, result });
  }

  /**
   * 🔧 标记测试失败
   */
  private failSession(sessionId: string, error: string): void {
    this.updateSession(sessionId, {
      status: 'failed',
      currentStep: '测试失败',
      endTime: new Date(),
      error
    });

    this.notifyListeners('sessionFailed', { sessionId, error });
  }

  /**
   * 🔧 通知监听器
   */
  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('监听器执行失败:', error);
      }
    });
  }

  /**
   * 🔧 模拟渐进式测试进度
   */
  private async simulateProgressiveTest(
    sessionId: string,
    startProgress: number,
    endProgress: number,
    steps: string[],
    stepDuration: number = 2000
  ): Promise<void> {
    const progressIncrement = (endProgress - startProgress) / steps.length;

    for (let i = 0; i < steps.length; i++) {
      const currentProgress = startProgress + (progressIncrement * (i + 1));
      this.updateProgress(sessionId, currentProgress, steps[i]);

      if (i < steps.length - 1) {
        await this.delay(stepDuration);
      }
    }
  }

  /**
   * 🔧 网站性能测试
   */
  async runWebsiteTest(config: TestConfig): Promise<string> {
    const session = this.createSession('website', config);

    try {
      this.updateSession(session.id, { status: 'running' });
      this.updateProgress(session.id, 10, '🚀 正在启动网站测试...');

      const response = await this.post('/tests/website', config);

      if (response.success) {
        await this.simulateProgressiveTest(session.id, 10, 90, [
          '🔍 正在分析页面结构...',
          '⚡ 正在测试加载速度...',
          '📱 正在检查响应式设计...',
          '🔒 正在验证安全性...',
          '📊 正在生成报告...'
        ]);

        this.completeSession(session.id, response.data);
      } else {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || '网站测试失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.failSession(session.id, error instanceof Error ? error.message : String(error));
    }

    return session.id;
  }

  /**
   * 🔧 压力测试
   */
  async runStressTest(config: TestConfig): Promise<string> {
    const session = this.createSession('stress', config);

    try {
      this.updateSession(session.id, { status: 'running' });
      this.updateProgress(session.id, 10, '💪 正在启动压力测试...');

      const response = await this.post('/tests/stress', config);

      if (response.success) {
        await this.simulateProgressiveTest(session.id, 10, 90, [
          '🔧 正在配置测试环境...',
          '👥 正在模拟用户负载...',
          '📈 正在监控性能指标...',
          '⚡ 正在测试峰值负载...',
          '📊 正在分析结果...'
        ]);

        this.completeSession(session.id, response.data);
      } else {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || '压力测试失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.failSession(session.id, error instanceof Error ? error.message : String(error));
    }

    return session.id;
  }

  /**
   * 🔧 API测试
   */
  async runAPITest(config: TestConfig): Promise<string> {
    const session = this.createSession('api', config);

    try {
      this.updateSession(session.id, { status: 'running' });
      this.updateProgress(session.id, 10, '📡 正在启动API测试...');

      const response = await this.post('/tests/api', config);

      if (response.success) {
        await this.simulateProgressiveTest(session.id, 10, 90, [
          '🔗 正在测试API连接...',
          '📊 正在验证响应数据...',
          '⚡ 正在测试响应时间...',
          '🔒 正在检查API安全性...',
          '📈 正在生成测试报告...'
        ]);

        this.completeSession(session.id, response.data);
      } else {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'API测试失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.failSession(session.id, error instanceof Error ? error.message : String(error));
    }

    return session.id;
  }

  /**
   * 🔧 SEO测试
   */
  async runSEOTest(config: TestConfig): Promise<string> {
    const session = this.createSession('seo', config);

    try {
      this.updateSession(session.id, { status: 'running' });
      this.updateProgress(session.id, 10, '🔍 正在启动SEO测试...');

      const response = await this.post('/tests/seo', config);

      if (response.success) {
        await this.simulateProgressiveTest(session.id, 10, 90, [
          '🏷️ 正在分析页面标签...',
          '📝 正在检查内容质量...',
          '🔗 正在验证链接结构...',
          '📱 正在测试移动友好性...',
          '📊 正在生成SEO报告...'
        ]);

        this.completeSession(session.id, response.data);
      } else {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'SEO测试失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      this.failSession(session.id, error instanceof Error ? error.message : String(error));
    }

    return session.id;
  }

  /**
   * 🔧 获取会话状态
   */
  getSession(sessionId: string): TestSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 🔧 获取所有运行中的会话
   */
  getRunningSessions(): TestSession[] {
    return Array.from(this.sessions.values()).filter(session =>
      session.status === 'running' || session.status === 'starting' // 🔧 简化：使用starting替代pending
    );
  }

  /**
   * 🔧 获取已完成的会话
   */
  getCompletedSessions(): TestSession[] {
    return Array.from(this.sessions.values()).filter(session =>
      session.status === 'completed' || session.status === 'failed'
    );
  }

  /**
   * 🔧 取消测试
   */
  async cancelTest(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') {
      return false;
    }

    try {
      await this.post(`/tests/${sessionId}/cancel`);
      this.updateSession(sessionId, {
        status: 'cancelled',
        currentStep: '测试已取消',
        endTime: new Date()
      });
      return true;
    } catch (error) {
      console.error('取消测试失败:', error);
      return false;
    }
  }

  /**
   * 🔧 添加监听器
   */
  addListener(callback: TestListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 🔧 清理已完成的会话
   */
  clearCompletedSessions(): void {
    const completedIds = this.getCompletedSessions().map(s => s.id);
    completedIds.forEach(id => this.sessions.delete(id));
    this.saveSessionsToStorage();
  }

  /**
   * 🔧 从localStorage加载会话
   */
  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem('test_sessions');
      if (stored) {
        const sessions = JSON.parse(stored);
        sessions.forEach((session: any) => {
          session.startTime = new Date(session.startTime);
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
          this.sessions.set(session.id, session);
        });
      }
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  }

  /**
   * 🔧 保存会话到localStorage
   */
  private saveSessionsToStorage(): void {
    try {
      const sessions = Array.from(this.sessions.values());
      localStorage.setItem('test_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  }
}

// 创建单例实例
export const unifiedTestApiService = new UnifiedTestApiService();
export default unifiedTestApiService;
