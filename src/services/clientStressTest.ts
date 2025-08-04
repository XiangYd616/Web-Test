/**
 * 客户端压力测试引擎
 * 在用户浏览器中执行，自动使用用户的代理设置
 */

interface ClientTestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  users: number;
  duration: number; // 秒
  testType: 'gradual' | 'spike' | 'constant' | 'stress';
  timeout: number; // 秒
  headers?: Record<string, string>;
  body?: string;
}

interface TestResult {
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
  timestamp: number;
}

interface TestProgress {
  activeUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ error: string; count: number }>;
}

export class ClientStressTestEngine {
  private isRunning = false;
  private testId: string | null = null;
  private results: TestResult[] = [];
  private startTime: number = 0;
  private activeRequests = 0;
  private onProgress?: (progress: TestProgress) => void;
  private onComplete?: (results: TestResult[]) => void;

  /**
   * 开始压力测试
   */
  async startTest(config: ClientTestConfig): Promise<string> {
    if (this.isRunning) {
      throw new Error('测试已在运行中');
    }

    this.testId = `client-test-${Date.now()}`;
    this.isRunning = true;
    this.results = [];
    this.startTime = Date.now();
    this.activeRequests = 0;

    console.log('🚀 开始客户端压力测试');
    console.log('📍 测试将使用浏览器的代理设置（如果有）');

    try {
      await this.executeTest(config);
      return this.testId;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 停止测试
   */
  stopTest(): void {
    if (this.isRunning) {
      this.isRunning = false;
      console.log('🛑 测试已停止');
    }
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: TestProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * 设置完成回调
   */
  setCompleteCallback(callback: (results: TestResult[]) => void): void {
    this.onComplete = callback;
  }

  /**
   * 执行测试
   */
  private async executeTest(config: ClientTestConfig): Promise<void> {
    const { testType, users, duration } = config;

    switch (testType) {
      case 'gradual':
        await this.executeGradualTest(config);
        break;
      case 'spike':
        await this.executeSpikeTest(config);
        break;
      case 'constant':
        await this.executeConstantTest(config);
        break;
      case 'stress':
        await this.executeStressTest(config);
        break;
      default:
        throw new Error(`不支持的测试类型: ${testType}`);
    }

    this.isRunning = false;
    if (this.onComplete) {
      this.onComplete(this.results);
    }
  }

  /**
   * 渐进式测试
   */
  private async executeGradualTest(config: ClientTestConfig): Promise<void> {
    const { users, duration } = config;
    const rampUpTime = Math.min(duration * 0.3, 60); // 最多60秒爬坡
    const userInterval = (rampUpTime * 1000) / users;

    console.log(`📈 渐进式测试: ${users}个用户，${duration}秒，${rampUpTime}秒爬坡`);

    for (let i = 0; i < users && this.isRunning; i++) {
      setTimeout(() => {
        if (this.isRunning) {
          this.startVirtualUser(config, duration * 1000);
        }
      }, i * userInterval);
    }

    // 等待测试完成
    await this.waitForTestCompletion(duration * 1000 + rampUpTime * 1000);
  }

  /**
   * 峰值测试
   */
  private async executeSpikeTest(config: ClientTestConfig): Promise<void> {
    const { users, duration } = config;

    console.log(`📊 峰值测试: ${users}个用户同时启动，持续${duration}秒`);

    // 同时启动所有用户
    for (let i = 0; i < users && this.isRunning; i++) {
      this.startVirtualUser(config, duration * 1000);
    }

    await this.waitForTestCompletion(duration * 1000);
  }

  /**
   * 恒定负载测试
   */
  private async executeConstantTest(config: ClientTestConfig): Promise<void> {
    const { users, duration } = config;

    console.log(`⚖️ 恒定负载测试: ${users}个用户，持续${duration}秒`);

    // 快速启动所有用户
    for (let i = 0; i < users && this.isRunning; i++) {
      setTimeout(() => {
        if (this.isRunning) {
          this.startVirtualUser(config, duration * 1000);
        }
      }, i * 100); // 100ms间隔启动
    }

    await this.waitForTestCompletion(duration * 1000 + users * 100);
  }

  /**
   * 压力测试
   */
  private async executeStressTest(config: ClientTestConfig): Promise<void> {
    // 类似渐进式，但会持续增加负载直到系统极限
    await this.executeGradualTest(config);
  }

  /**
   * 启动虚拟用户
   */
  private startVirtualUser(config: ClientTestConfig, duration: number): void {
    const endTime = Date.now() + duration;
    
    const runUser = async () => {
      while (Date.now() < endTime && this.isRunning) {
        this.activeRequests++;
        
        try {
          const result = await this.makeRequest(config);
          this.results.push(result);
        } catch (error) {
          this.results.push({
            success: false,
            statusCode: 0,
            responseTime: 0,
            error: error instanceof Error ? error.message : '未知错误',
            timestamp: Date.now()
          });
        }
        
        this.activeRequests--;
        this.updateProgress();
        
        // 思考时间（模拟用户行为）
        await this.sleep(Math.random() * 1000 + 500);
      }
    };

    runUser();
  }

  /**
   * 发送HTTP请求（使用浏览器的fetch，自动使用代理）
   */
  private async makeRequest(config: ClientTestConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // 浏览器的fetch会自动使用系统代理设置
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'User-Agent': 'Client-Stress-Test/1.0',
          ...config.headers
        },
        body: config.body,
        signal: AbortSignal.timeout(config.timeout * 1000)
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        statusCode: response.status,
        responseTime,
        timestamp: Date.now()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        statusCode: 0,
        responseTime,
        error: error instanceof Error ? error.message : '请求失败',
        timestamp: Date.now()
      };
    }
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (!this.onProgress) return;

    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    const avgResponseTime = this.results.length > 0 
      ? this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length 
      : 0;

    const rps = elapsed > 0 ? this.results.length / elapsed : 0;

    // 统计错误
    const errorCounts = new Map<string, number>();
    this.results.filter(r => !r.success && r.error).forEach(r => {
      const error = r.error!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const errors = Array.from(errorCounts.entries()).map(([error, count]) => ({
      error,
      count
    }));

    this.onProgress({
      activeUsers: this.activeRequests,
      totalRequests: this.results.length,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(rps * 100) / 100,
      errors
    });
  }

  /**
   * 等待测试完成
   */
  private async waitForTestCompletion(duration: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.isRunning = false;
        resolve();
      }, duration);
    });
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取测试状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      testId: this.testId,
      activeRequests: this.activeRequests,
      totalResults: this.results.length,
      elapsedTime: this.startTime > 0 ? Date.now() - this.startTime : 0
    };
  }
}
