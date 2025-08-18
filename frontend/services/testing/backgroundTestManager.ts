
export interface TestInfo     {
  id: string;
  type: 'database' | 'api' | 'performance' | 'security' | 'compatibility' | 'content' | 'stress' | 'seo' | 'website
  // 'accessibility' type removed - functionality moved to compatibility test
  config: any;
  status: 'running' | 'completed' | 'failed' | 'cancelled
  progress: number;
  startTime: Date;
  endTime?: Date;
  currentStep: string;
  result: any;
  error: any;
  onProgress?: (progress: number, step: string, metrics?: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export type TestEvent   = 'testStarted' | 'testProgress' | 'testCompleted' | 'testFailed' | 'testCancelled';export type TestListener   = (event: TestEvent, data: TestInfo) => void;class BackgroundTestManager {
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {>
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private runningTests = new Map<string, TestInfo>();
  private completedTests = new Map<string, TestInfo>();
  private listeners = new Set<TestListener>();
  private testCounter = 0;
  private apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api
  constructor() {
    // 从localStorage恢复状态
    this.loadFromStorage();

    // 定期保存状态
    setInterval(() => this.saveToStorage(), 5000);
  }

  // 生成唯一测试ID
  generateTestId(): string {
    return `test_${Date.now()}_${++this.testCounter}`;
  }

  // 开始新测试
  startTest(testType: TestInfo["type"],
    config: any,
    onProgress?: (progress: number, step: string, metrics?: any) => void,
    onComplete?: (result: any) => void,
    onError?: (error: Error) => void
  ): string {
    const testId = this.generateTestId();

    const testInfo: TestInfo  = {
      id: testId,
      type: testType,
      config: config,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      currentStep: '正在初始化测试...',
      result: null,
      error: null,
      onProgress: onProgress,
      onComplete: onComplete,
      onError: onError
    };
    this.runningTests.set(testId, testInfo);
    this.notifyListeners('testStarted', testInfo');
    // 根据测试类型执行相应的测试
    this.executeTest(testInfo);

    return testId;
  }

  // 取消测试
  cancelTest(testId: string): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'cancelled',
      testInfo.endTime = new Date();
      testInfo.error = '用户取消了测试',
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);

      this.notifyListeners('testCancelled', testInfo');
      if (testInfo.onError) {
        testInfo.onError(new Error('测试已取消')');
      }
    }
  }

  // 执行测试
  private async executeTest(testInfo: TestInfo): Promise<void> {
    try {
      switch (testInfo.type) {
        case 'website': 
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

    this.updateTestProgress(testInfo.id, 10, "🌐 正在准备网站测试...");

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/website`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json','
          'Authorization: `Bearer ${localStorage.getItem("auth_token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, "🔍 正在执行综合测试...");

      // 模拟网站测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, ['⚡ 正在测试性能指标...',
        '🔍 正在分析SEO优化...',
        '🔒 正在检查安全配置...',
        '🌍 正在测试兼容性...',
        '📊 正在生成综合报告...;
      ]);

      const data = await response.json();

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

    this.updateTestProgress(testInfo.id, 10, "⚡ 正在准备性能测试...");
    try {
      const response = await fetch(`${this.apiBaseUrl}/test/performance`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json','
          'Authorization: `Bearer ${localStorage.getItem("auth_token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, "📊 正在分析性能指标...");

      // 模拟性能测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, ['🚀 正在测试页面加载速度...',
        '📱 正在检查移动端性能...',
        '🖼️ 正在优化图片资源...',
        '⚡ 正在分析Core Web Vitals...',
        '📈 正在生成性能报告...;
      ]);

      const data = await response.json();

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

    this.updateTestProgress(testInfo.id, 10, "🔒 正在准备安全测试...");
    try {
      const response = await fetch(`${this.apiBaseUrl}/test/security`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json','
          'Authorization: `Bearer ${localStorage.getItem("auth_token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, "🛡️ 正在执行安全扫描...");

      // 模拟安全测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, ['🔍 正在检查SSL证书...',
        '🛡️ 正在扫描安全漏洞...',
        '🔐 正在验证HTTPS配置...',
        '🚨 正在检查恶意软件...',
        '📋 正在生成安全报告...;
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
    this.handleTestError(testInfo.id, new Error('SEO测试已迁移到专用的SEO测试页面，请使用SEO测试功能')');
  }

  // 执行API测试
  private async executeAPITest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, "🔌 正在准备API测试...");
    try {
      const response = await fetch(`${this.apiBaseUrl}/test/api`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json','
          'Authorization: `Bearer ${localStorage.getItem("auth_token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, "📡 正在执行API测试...");

      // 模拟API测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, ['🔗 正在测试API连接...',
        '📊 正在验证响应数据...',
        '⚡ 正在测试响应时间...',
        '🔒 正在检查API安全性...',
        '📈 正在生成测试报告...;
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

  // 执行数据库测试
  private async executeDatabaseTest(testInfo: TestInfo): Promise<void> {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔍 正在连接数据库...');
    try {
      const response = await fetch('/api/test/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${localStorage.getItem("token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 50, "📊 正在分析数据库性能...");

      const data = await response.json();

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

    this.updateTestProgress(testInfo.id, 10, "💪 正在准备压力测试...");
    try {
      const response = await fetch(`${this.apiBaseUrl}/test/stress`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json','
          'Authorization: `Bearer ${localStorage.getItem("auth_token")"}
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, "🚀 正在执行压力测试...");

      // 模拟压力测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, ['👥 正在模拟用户负载...',
        '📊 正在收集性能指标...',
        '⚡ 正在分析响应时间...',
        '🔍 正在检测瓶颈...',
        '📈 正在生成压力测试报告...;
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
  updateTestProgress(testId: string, progress: number, step: string, metrics?: any): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.progress = progress;
      testInfo.currentStep = step;

      this.notifyListeners('testProgress', testInfo');
      if (testInfo.onProgress) {
        testInfo.onProgress(progress, step, metrics);
      }
    }
  }

  // 完成测试
  completeTest(testId: string, result: any): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'completed',
      testInfo.endTime = new Date();
      testInfo.result = result;
      testInfo.progress = 100;
      testInfo.currentStep = '✅ 测试完成',
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);

      this.notifyListeners('testCompleted', testInfo');
      if (testInfo.onComplete) {
        testInfo.onComplete(result);
      }
    }
  }

  // 处理测试错误
  handleTestError(testId: string, error: Error): void {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'failed',
      testInfo.endTime = new Date();
      testInfo.error = error.message;
      testInfo.currentStep = '❌ 测试失败',
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);

      this.notifyListeners('testFailed', testInfo');
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
    const progressIncrement = (endProgress - startProgress) / steps.length;

    for (let i = 0; i < steps.length; i++) {>
      const currentProgress = startProgress + (progressIncrement * (i + 1));
      this.updateTestProgress(testId, currentProgress, steps[i]);

      if (i < steps.length - 1) {>
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
  addListener(callback: TestListener): ()  => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 通知监听器
  private notifyListeners(event: TestEvent, data: TestInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in test listener: , error);
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
      localStorage.setItem('backgroundTestManager', JSON.stringify(data'));
    } catch (error) {
      console.error('Failed to save test manager state: , error);
    }
  }

  // 从本地存储加载
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('backgroundTestManager);
      if (data) {
        const parsed = JSON.parse(data);
        this.completedTests = new Map(parsed.completedTests || []);
        this.testCounter = parsed.testCounter || 0;
      }
    } catch (error) {
      console.error('Failed to load test manager state:, error);
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
