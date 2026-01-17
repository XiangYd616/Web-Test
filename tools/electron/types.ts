// Electron测试引擎类型定义

export interface TestConfig {
  url: string;
  startTime?: number;
  [key: string]: any;
}

export interface TestResult {
  testId?: string;
  url: string;
  type: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: string;
  endTime?: string;
  duration?: number;
  results: any;
  summary: string;
  config?: TestConfig;
}

export interface ProgressData {
  testId: string;
  type: string;
  progress: any;
}

export interface TestCompleteData {
  testId: string;
  type: string;
  result: any;
}

// 压力测试结果接口
export interface StressTestResult {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
  overallScore: number;
}

// 兼容性测试结果接口
export interface CompatibilityTestResult {
  overallCompatibility: number;
  supportedBrowsers: number;
  totalBrowsers: number;
  browserResults: Array<{
    browser: string;
    version: string;
    compatible: boolean;
    issues: string[];
  }>;
  deviceCompatibility: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
  };
  accessibilityScore: number;
}

// 测试引擎基类
export abstract class BaseTestEngine {
  protected progressCallback?: (progress: any) => void;
  protected completeCallback?: (result: any) => void;

  constructor(
    progressCallback?: (progress: any) => void,
    completeCallback?: (result: any) => void
  ) {
    this.progressCallback = progressCallback;
    this.completeCallback = completeCallback;
  }

  abstract runTest(config: TestConfig): Promise<any>;
  abstract stop(): void;
  abstract getStatus(): string;
}

// 压力测试引擎
export class StressTestEngine extends BaseTestEngine {
  private isRunning = false;
  private shouldStop = false;

  constructor(
    progressCallback?: (progress: any) => void,
    completeCallback?: (result: any) => void
  ) {
    super(progressCallback, completeCallback);
  }

  async runTest(config: TestConfig): Promise<StressTestResult> {
    this.isRunning = true;
    this.shouldStop = false;

    // 模拟压力测试逻辑
    const result: StressTestResult = {
      concurrentUsers: config.users || 10,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      throughput: 0,
      overallScore: 0,
    };

    // 模拟测试进度
    for (let i = 0; i <= 100; i += 10) {
      if (this.shouldStop) break;

      this.progressCallback?.({
        progress: i,
        stage: `压力测试进行中... ${i}%`,
        currentUsers: Math.floor((config.users || 10) * (i / 100)),
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 模拟测试结果
    result.totalRequests = (config.users || 10) * (config.duration || 60);
    result.successfulRequests = Math.floor(result.totalRequests * 0.95);
    result.failedRequests = result.totalRequests - result.successfulRequests;
    result.averageResponseTime = Math.random() * 1000 + 200;
    result.requestsPerSecond = result.totalRequests / (config.duration || 60);
    result.errorRate = (result.failedRequests / result.totalRequests) * 100;
    result.overallScore = Math.max(
      0,
      100 - result.errorRate - (result.averageResponseTime > 1000 ? 20 : 0)
    );

    this.isRunning = false;
    this.completeCallback?.(result);
    return result;
  }

  stop(): void {
    this.shouldStop = true;
    this.isRunning = false;
  }

  getStatus(): string {
    return this.isRunning ? 'running' : 'idle';
  }
}

// 兼容性测试引擎
export class CompatibilityTestEngine extends BaseTestEngine {
  private isRunning = false;

  async runTest(config: TestConfig): Promise<CompatibilityTestResult> {
    this.isRunning = true;

    // 模拟兼容性测试
    const result: CompatibilityTestResult = {
      overallCompatibility: Math.floor(Math.random() * 20) + 80,
      supportedBrowsers: 4,
      totalBrowsers: 5,
      browserResults: [
        { browser: 'Chrome', version: '120.0', compatible: true, issues: [] },
        { browser: 'Firefox', version: '121.0', compatible: true, issues: [] },
        { browser: 'Safari', version: '17.0', compatible: true, issues: ['CSS Grid支持有限'] },
        { browser: 'Edge', version: '120.0', compatible: true, issues: [] },
        {
          browser: 'IE',
          version: '11.0',
          compatible: false,
          issues: ['不支持ES6', '不支持Flexbox'],
        },
      ],
      deviceCompatibility: {
        desktop: true,
        tablet: true,
        mobile: Math.random() > 0.2,
      },
      accessibilityScore: Math.floor(Math.random() * 20) + 80,
    };

    this.isRunning = false;
    return result;
  }

  stop(): void {
    this.isRunning = false;
  }

  getStatus(): string {
    return this.isRunning ? 'running' : 'idle';
  }
}
