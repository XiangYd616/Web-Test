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
  optimized?: boolean; // 启用高性能优化
  useProxy?: boolean; // 是否使用系统代理
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
  private maxConcurrentRequests = 500; // 高性能模式并发数
  private requestQueue: (() => Promise<void>)[] = [];
  private processingQueue = false;
  private optimized = true; // 默认启用优化
  private useProxy = true; // 默认使用系统代理
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
    this.optimized = config.optimized !== false; // 默认启用优化
    this.useProxy = config.useProxy !== false; // 默认使用代理

    console.log('🚀 开始客户端压力测试');
    console.log(`📍 代理模式: ${this.useProxy ? '使用系统代理' : '直连模式'}`);
    console.log(`⚡ 高性能模式: ${this.optimized ? '已启用' : '已禁用'}`);

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

        // 思考时间（根据优化模式调整）
        if (this.optimized) {
          // 高性能模式：更短的思考时间
          await this.sleep(Math.random() * 200 + 50);
        } else {
          // 标准模式：正常思考时间
          await this.sleep(Math.random() * 1000 + 500);
        }
      }
    };

    runUser();
  }

  /**
   * 发送HTTP请求（使用多种方式绕过限制）
   */
  private async makeRequest(config: ClientTestConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // 尝试多种请求方式
      const response = await this.makeRequestWithFallback(config);
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
   * 使用多种方式发送请求（根据代理设置选择不同策略）
   */
  private async makeRequestWithFallback(config: ClientTestConfig): Promise<Response> {
    const requestOptions = {
      method: config.method,
      headers: {
        'User-Agent': 'Client-Stress-Test/1.0',
        ...config.headers
      },
      body: config.body,
      signal: AbortSignal.timeout(config.timeout * 1000)
    };

    // 如果禁用代理，强制使用服务器代理来实现"直连"
    if (!this.useProxy) {
      console.log('🔗 客户端直连模式：通过服务器代理实现直连');
      return await this.makeDirectRequest(config, requestOptions);
    }

    // 启用代理模式：使用浏览器默认行为（包括系统代理）
    console.log('💻 客户端代理模式：使用浏览器默认设置');

    // 如果未启用优化，只使用直接请求
    if (!this.optimized) {
      return await fetch(config.url, requestOptions);
    }

    // 高性能模式：使用多重回退机制
    // 方法1: 直接fetch（使用浏览器默认代理设置）
    try {
      const response = await fetch(config.url, requestOptions);
      return response;
    } catch (error) {
      // 静默处理，继续尝试其他方法
    }

    // 方法2: 使用代理服务器绕过CORS
    try {
      console.log('🔄 尝试代理请求:', config.url);
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(config.url)}`;
      const response = await fetch(proxyUrl, {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'X-Target-URL': config.url,
          'X-Target-Method': config.method
        }
      });
      console.log('✅ 代理请求成功');
      return response;
    } catch (error) {
      console.log('❌ 代理请求失败:', error);
    }

    // 方法3: 使用公共CORS代理
    try {
      console.log('🔄 尝试公共代理:', config.url);
      const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${config.url}`;
      const response = await fetch(corsProxyUrl, {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      console.log('✅ 公共代理请求成功');
      return response;
    } catch (error) {
      console.log('❌ 公共代理请求失败:', error);
    }

    // 方法4: 使用XMLHttpRequest（某些情况下限制较少）
    try {
      console.log('🔄 尝试XMLHttpRequest:', config.url);
      const response = await this.makeXHRRequest(config);
      console.log('✅ XMLHttpRequest成功');
      return response;
    } catch (error) {
      console.log('❌ XMLHttpRequest失败:', error);
    }

    // 如果所有方法都失败，抛出错误
    throw new Error('所有请求方法都失败，可能受到CORS或网络限制');
  }

  /**
   * 直连请求（通过服务器代理实现真正的直连）
   */
  private async makeDirectRequest(config: ClientTestConfig, requestOptions: any): Promise<Response> {
    try {
      // 通过服务器的直连代理端点
      const directProxyUrl = `/api/test/proxy/direct?url=${encodeURIComponent(config.url)}`;
      const response = await fetch(directProxyUrl, {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'X-Target-URL': config.url,
          'X-Target-Method': config.method,
          'X-Direct-Mode': 'true' // 标识为直连模式
        }
      });
      console.log('✅ 直连请求成功（通过服务器）');
      return response;
    } catch (error) {
      console.log('❌ 直连请求失败:', error);
      throw error;
    }
  }

  /**
   * 使用XMLHttpRequest发送请求
   */
  private async makeXHRRequest(config: ClientTestConfig): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(config.method, config.url, true);

      // 设置请求头
      Object.entries(config.headers || {}).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.timeout = config.timeout * 1000;

      xhr.onload = () => {
        // 创建类似Response的对象
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers()
        });
        resolve(response);
      };

      xhr.onerror = () => reject(new Error('XMLHttpRequest failed'));
      xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'));

      xhr.send(config.body);
    });
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
