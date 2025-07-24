/**
 * 统一的测试状态管理器
 * 解决压力测试中的状态冲突和数据流混乱问题
 */

// 测试状态枚举
export enum TestState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 测试阶段枚举
export enum TestPhase {
  INITIALIZATION = 'initialization',
  RAMP_UP = 'ramp-up',
  STEADY_STATE = 'steady',
  RAMP_DOWN = 'ramp-down',
  CLEANUP = 'cleanup'
}

// 数据源类型
export enum DataSource {
  WEBSOCKET = 'websocket',
  API_POLLING = 'api-polling',
  BACKGROUND_MANAGER = 'background-manager'
}

// 测试配置接口
export interface TestConfig {
  url: string;
  users: number;
  duration: number;
  rampUp: number;
  testType: 'gradual' | 'spike' | 'stress' | 'constant' | 'load' | 'volume';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout: number;
  thinkTime: number;
  // 扩展属性以兼容现有代码
  warmupDuration?: number;
  cooldownDuration?: number;
  // 其他可选属性
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  keepAlive?: boolean;
  compression?: boolean;
  protocols?: ('http1' | 'http2' | 'http3')[];
}

// 实时指标接口
export interface RealTimeMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  currentTPS: number;
  peakTPS: number;
  errorRate: number;
  activeUsers: number;
  timestamp: number;
  // 扩展属性以兼容现有代码
  errorBreakdown?: Record<string, number>;
  p50ResponseTime?: number;
  p75ResponseTime?: number;
  p90ResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  p999ResponseTime?: number;
  throughput?: number;
  requestsPerSecond?: number;
  // 数据传输相关指标
  dataReceived?: number;
  dataSent?: number;
  minResponseTime?: number;
  maxResponseTime?: number;
}

// 测试数据点接口
export interface TestDataPoint {
  timestamp: number;
  responseTime: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
  status: number;
  success: boolean;
  phase: TestPhase;
  // 图表组件需要的额外字段
  errorType?: string;
  connectionTime?: number;
  dnsTime?: number;
}

// 状态变更事件接口
export interface StateChangeEvent {
  previousState: TestState;
  currentState: TestState;
  timestamp: number;
  reason?: string;
  error?: Error;
}

// 状态管理器配置
export interface StateManagerConfig {
  maxDataPoints: number;
  dataRetentionTime: number; // 毫秒
  autoCleanupInterval: number; // 毫秒
  enableLogging: boolean;
}

/**
 * 测试状态管理器类
 */
export class TestStateManager {
  private state: TestState = TestState.IDLE;
  private phase: TestPhase = TestPhase.INITIALIZATION;
  private testId: string | null = null;
  private config: TestConfig | null = null;
  private metrics: RealTimeMetrics | null = null;
  private dataPoints: TestDataPoint[] = [];
  private error: Error | null = null;
  private progress: number = 0;
  private progressMessage: string = '';
  private startTime: number | null = null;
  private endTime: number | null = null;

  // 事件监听器
  private stateChangeListeners: ((event: StateChangeEvent) => void)[] = [];
  private dataUpdateListeners: ((dataPoint: TestDataPoint) => void)[] = [];
  private metricsUpdateListeners: ((metrics: RealTimeMetrics) => void)[] = [];

  // 数据源管理
  private primaryDataSource: DataSource = DataSource.WEBSOCKET;
  private fallbackDataSource: DataSource = DataSource.API_POLLING;
  private currentDataSource: DataSource = DataSource.WEBSOCKET;

  // 配置
  private config_: StateManagerConfig;

  // 清理定时器
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<StateManagerConfig> = {}) {
    this.config_ = {
      maxDataPoints: 1000,
      dataRetentionTime: 5 * 60 * 1000, // 5分钟
      autoCleanupInterval: 30 * 1000, // 30秒
      enableLogging: true,
      ...config
    };

    this.startAutoCleanup();
  }

  /**
   * 获取当前状态
   */
  getState(): TestState {
    return this.state;
  }

  /**
   * 获取当前阶段
   */
  getPhase(): TestPhase {
    return this.phase;
  }

  /**
   * 获取测试ID
   */
  getTestId(): string | null {
    return this.testId;
  }

  /**
   * 获取测试配置
   */
  getConfig(): TestConfig | null {
    return this.config;
  }

  /**
   * 获取当前指标
   */
  getMetrics(): RealTimeMetrics | null {
    return this.metrics;
  }

  /**
   * 获取数据点
   */
  getDataPoints(): TestDataPoint[] {
    return [...this.dataPoints];
  }

  /**
   * 获取最新的数据点
   */
  getLatestDataPoints(count: number = 50): TestDataPoint[] {
    return this.dataPoints.slice(-count);
  }

  /**
   * 获取错误信息
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * 获取进度信息
   */
  getProgress(): { progress: number; message: string } {
    return { progress: this.progress, message: this.progressMessage };
  }

  /**
   * 获取测试持续时间
   */
  getDuration(): number {
    if (!this.startTime) return 0;
    const endTime = this.endTime || Date.now();
    return endTime - this.startTime;
  }

  /**
   * 开始测试
   */
  startTest(testId: string, config: TestConfig): void {
    if (this.state !== TestState.IDLE) {
      throw new Error(`Cannot start test in state: ${this.state}`);
    }

    const previousState = this.state;
    this.state = TestState.STARTING;
    this.phase = TestPhase.INITIALIZATION;
    this.testId = testId;
    this.config = config;
    this.error = null;
    this.progress = 0;
    this.progressMessage = '正在初始化测试...';
    this.startTime = Date.now();
    this.endTime = null;
    this.dataPoints = [];
    this.metrics = null;

    this.log(`Test started: ${testId}`);
    this.notifyStateChange(previousState, this.state);
  }

  /**
   * 设置测试为运行状态
   */
  setRunning(): void {
    if (this.state !== TestState.STARTING) {
      throw new Error(`Cannot set running from state: ${this.state}`);
    }

    const previousState = this.state;
    this.state = TestState.RUNNING;
    this.phase = TestPhase.RAMP_UP;
    this.progressMessage = '测试正在运行...';

    this.log('Test is now running');
    this.notifyStateChange(previousState, this.state);
  }

  /**
   * 完成测试
   */
  completeTest(result?: any): void {
    if (this.state !== TestState.RUNNING) {
      throw new Error(`Cannot complete test from state: ${this.state}`);
    }

    const previousState = this.state;
    this.state = TestState.COMPLETED;
    this.phase = TestPhase.CLEANUP;
    this.endTime = Date.now();
    this.progress = 100;
    this.progressMessage = '测试完成';

    this.log('Test completed successfully');
    this.notifyStateChange(previousState, this.state);
  }

  /**
   * 测试失败
   */
  failTest(error: Error): void {
    const previousState = this.state;
    this.state = TestState.FAILED;
    this.error = error;
    this.endTime = Date.now();
    this.progressMessage = `测试失败: ${error.message}`;

    this.log(`Test failed: ${error.message}`);
    this.notifyStateChange(previousState, this.state, error.message, error);
  }

  /**
   * 取消测试
   */
  cancelTest(): void {
    if (this.state === TestState.COMPLETED || this.state === TestState.FAILED) {
      return; // 已完成的测试无法取消
    }

    const previousState = this.state;
    this.state = TestState.CANCELLED;
    this.endTime = Date.now();
    this.progressMessage = '测试已取消';

    this.log('Test cancelled');
    this.notifyStateChange(previousState, this.state);
  }

  /**
   * 重置状态
   */
  reset(): void {
    const previousState = this.state;
    this.state = TestState.IDLE;
    this.phase = TestPhase.INITIALIZATION;
    this.testId = null;
    this.config = null;
    this.metrics = null;
    this.dataPoints = [];
    this.error = null;
    this.progress = 0;
    this.progressMessage = '';
    this.startTime = null;
    this.endTime = null;

    this.log('State reset to idle');
    this.notifyStateChange(previousState, this.state);
  }

  /**
   * 更新进度
   */
  updateProgress(progress: number, message: string): void {
    this.progress = Math.max(0, Math.min(100, progress));
    this.progressMessage = message;
    this.log(`Progress updated: ${progress}% - ${message}`);
  }

  /**
   * 更新测试阶段
   */
  updatePhase(phase: TestPhase): void {
    this.phase = phase;
    this.log(`Phase updated: ${phase}`);
  }

  /**
   * 添加数据点
   */
  addDataPoint(dataPoint: TestDataPoint): void {
    // 数据验证
    if (!this.isValidDataPoint(dataPoint)) {
      this.log('Invalid data point received, skipping');
      return;
    }

    this.dataPoints.push(dataPoint);

    // 限制数据点数量
    if (this.dataPoints.length > this.config_.maxDataPoints) {
      this.dataPoints = this.dataPoints.slice(-this.config_.maxDataPoints);
    }

    this.notifyDataUpdate(dataPoint);
    this.log(`Data point added: ${dataPoint.timestamp}`);
  }

  /**
   * 更新实时指标
   */
  updateMetrics(metrics: RealTimeMetrics): void {
    this.metrics = { ...metrics, timestamp: Date.now() };
    this.notifyMetricsUpdate(this.metrics);
    this.log(`Metrics updated: TPS=${metrics.currentTPS}, RT=${metrics.averageResponseTime}ms`);
  }

  /**
   * 切换数据源
   */
  switchDataSource(source: DataSource): void {
    this.currentDataSource = source;
    this.log(`Data source switched to: ${source}`);
  }

  /**
   * 获取当前数据源
   */
  getCurrentDataSource(): DataSource {
    return this.currentDataSource;
  }

  // 事件监听器管理
  onStateChange(listener: (event: StateChangeEvent) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  onDataUpdate(listener: (dataPoint: TestDataPoint) => void): () => void {
    this.dataUpdateListeners.push(listener);
    return () => {
      const index = this.dataUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.dataUpdateListeners.splice(index, 1);
      }
    };
  }

  onMetricsUpdate(listener: (metrics: RealTimeMetrics) => void): () => void {
    this.metricsUpdateListeners.push(listener);
    return () => {
      const index = this.metricsUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.metricsUpdateListeners.splice(index, 1);
      }
    };
  }

  // 私有方法
  private notifyStateChange(previousState: TestState, currentState: TestState, reason?: string, error?: Error): void {
    const event: StateChangeEvent = {
      previousState,
      currentState,
      timestamp: Date.now(),
      reason,
      error
    };

    this.stateChangeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in state change listener:', err);
      }
    });
  }

  private notifyDataUpdate(dataPoint: TestDataPoint): void {
    this.dataUpdateListeners.forEach(listener => {
      try {
        listener(dataPoint);
      } catch (err) {
        console.error('Error in data update listener:', err);
      }
    });
  }

  private notifyMetricsUpdate(metrics: RealTimeMetrics): void {
    this.metricsUpdateListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (err) {
        console.error('Error in metrics update listener:', err);
      }
    });
  }

  private isValidDataPoint(dataPoint: TestDataPoint): boolean {
    return (
      typeof dataPoint.timestamp === 'number' &&
      typeof dataPoint.responseTime === 'number' &&
      typeof dataPoint.activeUsers === 'number' &&
      typeof dataPoint.throughput === 'number' &&
      dataPoint.timestamp > 0 &&
      dataPoint.responseTime >= 0 &&
      dataPoint.activeUsers >= 0 &&
      dataPoint.throughput >= 0
    );
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, this.config_.autoCleanupInterval);
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.config_.dataRetentionTime;
    const originalLength = this.dataPoints.length;

    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoffTime);

    if (this.dataPoints.length < originalLength) {
      this.log(`Cleaned up ${originalLength - this.dataPoints.length} old data points`);
    }
  }

  private log(message: string): void {
    if (this.config_.enableLogging) {
      console.log(`[TestStateManager] ${message}`);
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.stateChangeListeners = [];
    this.dataUpdateListeners = [];
    this.metricsUpdateListeners = [];

    this.log('TestStateManager destroyed');
  }
}

// 创建单例实例
export const testStateManager = new TestStateManager();
