
import { RealTimeMetrics, TestDataPoint, TestPhase } from './testStateManager';

// 原始数据源接口
export interface RawWebSocketData {
  testId?: string;
  timestamp?: number;
  dataPoint?: {
    timestamp: number;
    responseTime: number;
    throughput: number;
    errors: number;
    activeUsers: number;
    errorRate: number;
    phase: string;
    success?: boolean;
    status?: number;
  };
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    throughput: number;
    requestsPerSecond: number;
    currentTPS: number;
    errorRate: number;
    activeUsers: number;
  };
  progress?: number;
}

export interface RawAPIData {
  success: boolean;
  data?: {
    testId: string;
    status: string;
    progress: number;
    realTimeMetrics?: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      lastResponseTime: number;
      lastRequestSuccess: boolean;
      activeRequests: number;
    };
    realTimeData?: Array<{
      timestamp: number;
      responseTime: number;
      throughput: number;
      activeUsers: number;
      success: boolean;
      phase: string;
    }>;
  };
  message?: string;
}

export interface RawBackgroundManagerData {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep: string;
  realTimeData?: Array<{
    timestamp: number;
    responseTime: number;
    throughput: number;
    rps: number;
    activeUsers: number;
    success: boolean;
    phase: string;
  }>;
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    throughput: number;
    requestsPerSecond: number;
    errorRate: number;
    activeUsers: number;
  };
  result?: any;
  error?: string;
}

// 数据验证规则
export interface ValidationRules {
  responseTime: { min: number; max: number };
  throughput: { min: number; max: number };
  activeUsers: { min: number; max: number };
  errorRate: { min: number; max: number };
  timestamp: { maxAge: number }; // 最大数据年龄（毫秒）
}

// 数据清理选项
export interface CleaningOptions {
  removeOutliers: boolean;
  outlierThreshold: number; // 标准差倍数
  smoothingWindow: number; // 平滑窗口大小
  fillMissingValues: boolean;
}

export class DataNormalizationPipeline {
  private validationRules: ValidationRules;
  private cleaningOptions: CleaningOptions;

  constructor(
    validationRules?: Partial<ValidationRules>,
    cleaningOptions?: Partial<CleaningOptions>
  ) {
    this.validationRules = {
      responseTime: { min: 0, max: 60000 }, // 0-60秒
      throughput: { min: 0, max: 10000 }, // 0-10000 TPS
      activeUsers: { min: 0, max: 10000 }, // 0-10000 用户
      errorRate: { min: 0, max: 100 }, // 0-100%
      timestamp: { maxAge: 5 * 60 * 1000 }, // 5分钟
      ...validationRules
    };

    this.cleaningOptions = {
      removeOutliers: true,
      outlierThreshold: 3, // 3倍标准差
      smoothingWindow: 5,
      fillMissingValues: true,
      ...cleaningOptions
    };
  }

  /**
   * 处理WebSocket数据
   */
  processWebSocketData(rawData: RawWebSocketData): {
    dataPoint?: TestDataPoint;
    metrics?: RealTimeMetrics;
  } {
    const result: { dataPoint?: TestDataPoint; metrics?: RealTimeMetrics } = {};

    try {
      // 处理数据点
      if (rawData.dataPoint) {
        const normalizedDataPoint = this.normalizeDataPoint({
          timestamp: rawData.dataPoint.timestamp || Date.now(),
          responseTime: rawData.dataPoint.responseTime || 0,
          activeUsers: rawData.dataPoint.activeUsers || 0,
          throughput: rawData.dataPoint.throughput || 0,
          errorRate: rawData.dataPoint.errorRate || 0,
          status: rawData.dataPoint.status || (rawData.dataPoint.success ? 200 : 500),
          success: rawData.dataPoint.success ?? true,
          phase: this.normalizePhase(rawData.dataPoint.phase)
        });

        if (this.validateDataPoint(normalizedDataPoint)) {
          result.dataPoint = normalizedDataPoint;
        }
      }

      // 处理指标
      if (rawData.metrics) {
        const normalizedMetrics = this.normalizeMetrics({
          totalRequests: rawData.metrics.totalRequests || 0,
          successfulRequests: rawData.metrics.successfulRequests || 0,
          failedRequests: rawData.metrics.failedRequests || 0,
          averageResponseTime: rawData.metrics.averageResponseTime || 0,
          currentTPS: rawData.metrics.currentTPS || rawData.metrics.throughput || rawData.metrics.requestsPerSecond || 0,
          peakTPS: rawData.metrics.currentTPS || rawData.metrics.throughput || 0,
          errorRate: rawData.metrics.errorRate || 0,
          activeUsers: rawData.metrics.activeUsers || 0,
          timestamp: Date.now()
        });

        if (this.validateMetrics(normalizedMetrics)) {
          result.metrics = normalizedMetrics;
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket data:', error);
    }

    return result;
  }

  /**
   * 处理API数据
   */
  processAPIData(rawData: RawAPIData): {
    dataPoints?: TestDataPoint[];
    metrics?: RealTimeMetrics;
  } {
    const result: { dataPoints?: TestDataPoint[]; metrics?: RealTimeMetrics } = {};

    try {
      if (!rawData.success || !rawData.data) {
        return result;
      }

      // 处理实时数据数组 - 使用优化的映射函数
      if (rawData.data.realTimeData && Array.isArray(rawData.data.realTimeData)) {
        const normalizedDataPoints = this.batchNormalizeDataPoints(rawData.data.realTimeData);
        if (normalizedDataPoints.length > 0) {
          result.dataPoints = normalizedDataPoints;
        }
      }

      // 处理实时指标
      if (rawData.data.realTimeMetrics) {
        const metrics = rawData.data.realTimeMetrics;
        const normalizedMetrics = this.normalizeMetrics({
          totalRequests: metrics.totalRequests || 0,
          successfulRequests: metrics.successfulRequests || 0,
          failedRequests: metrics.failedRequests || 0,
          averageResponseTime: metrics.lastResponseTime || 0,
          currentTPS: metrics.totalRequests || 0,
          peakTPS: metrics.totalRequests || 0,
          errorRate: (metrics.failedRequests / Math.max(metrics.totalRequests, 1)) * 100,
          activeUsers: metrics.activeRequests || 0,
          timestamp: Date.now()
        });

        if (this.validateMetrics(normalizedMetrics)) {
          result.metrics = normalizedMetrics;
        }
      }
    } catch (error) {
      console.error('Error processing API data:', error);
    }

    return result;
  }

  /**
   * 处理后台管理器数据
   */
  processBackgroundManagerData(rawData: RawBackgroundManagerData): {
    dataPoints?: TestDataPoint[];
    metrics?: RealTimeMetrics;
  } {
    const result: { dataPoints?: TestDataPoint[]; metrics?: RealTimeMetrics } = {};

    try {
      // 处理实时数据数组 - 使用优化的映射函数
      if (rawData.realTimeData && Array.isArray(rawData.realTimeData)) {
        const normalizedDataPoints = this.batchNormalizeDataPoints(rawData.realTimeData);
        if (normalizedDataPoints.length > 0) {
          result.dataPoints = normalizedDataPoints;
        }
      }

      // 处理指标
      if (rawData.metrics) {
        const normalizedMetrics = this.normalizeMetrics({
          totalRequests: rawData.metrics.totalRequests || 0,
          successfulRequests: rawData.metrics.successfulRequests || 0,
          failedRequests: rawData.metrics.failedRequests || 0,
          averageResponseTime: rawData.metrics.averageResponseTime || 0,
          currentTPS: rawData.metrics.throughput || rawData.metrics.requestsPerSecond || 0,
          peakTPS: rawData.metrics.throughput || 0,
          errorRate: rawData.metrics.errorRate || 0,
          activeUsers: rawData.metrics.activeUsers || 0,
          timestamp: Date.now()
        });

        if (this.validateMetrics(normalizedMetrics)) {
          result.metrics = normalizedMetrics;
        }
      }
    } catch (error) {
      console.error('Error processing background manager data:', error);
    }

    return result;
  }

  /**
   * 批量处理数据点
   */
  processBatchDataPoints(dataPoints: TestDataPoint[]): TestDataPoint[] {
    if (!dataPoints.length) return [];

    let processedData = [...dataPoints];

    // 移除异常值
    if (this.cleaningOptions.removeOutliers) {
      processedData = this.removeOutliers(processedData);
    }

    // 平滑处理
    if (this.cleaningOptions.smoothingWindow > 1) {
      processedData = this.smoothData(processedData);
    }

    // 填充缺失值
    if (this.cleaningOptions.fillMissingValues) {
      processedData = this.fillMissingValues(processedData);
    }

    return processedData;
  }

  /**
   * 标准化数据点
   */
  private normalizeDataPoint(rawPoint: any): TestDataPoint {
    return {
      timestamp: this.normalizeTimestamp(rawPoint.timestamp),
      responseTime: this.normalizeNumber(rawPoint.responseTime, this.validationRules.responseTime),
      activeUsers: this.normalizeNumber(rawPoint.activeUsers, this.validationRules.activeUsers),
      throughput: this.normalizeNumber(rawPoint.throughput, this.validationRules.throughput),
      errorRate: this.normalizeNumber(rawPoint.errorRate, this.validationRules.errorRate),
      status: rawPoint.status || 200,
      success: Boolean(rawPoint.success),
      phase: rawPoint.phase || TestPhase.STEADY_STATE
    };
  }

  /**
   * 标准化指标
   */
  private normalizeMetrics(rawMetrics: any): RealTimeMetrics {
    return {
      totalRequests: Math.max(0, rawMetrics.totalRequests || 0),
      successfulRequests: Math.max(0, rawMetrics.successfulRequests || 0),
      failedRequests: Math.max(0, rawMetrics.failedRequests || 0),
      averageResponseTime: this.normalizeNumber(rawMetrics.averageResponseTime, this.validationRules.responseTime),
      currentTPS: this.normalizeNumber(rawMetrics.currentTPS, this.validationRules.throughput),
      peakTPS: this.normalizeNumber(rawMetrics.peakTPS, this.validationRules.throughput),
      errorRate: this.normalizeNumber(rawMetrics.errorRate, this.validationRules.errorRate),
      activeUsers: this.normalizeNumber(rawMetrics.activeUsers, this.validationRules.activeUsers),
      timestamp: rawMetrics.timestamp || Date.now()
    };
  }

  /**
   * 标准化数字值
   */
  private normalizeNumber(value: any, range: { min: number; max: number }): number {
    const num = Number(value) || 0;
    return Math.max(range.min, Math.min(range.max, num));
  }

  /**
   * 标准化时间戳
   */
  private normalizeTimestamp(timestamp: any): number {
    const ts = Number(timestamp) || Date.now();
    const now = Date.now();

    // 如果时间戳太旧，使用当前时间
    if (now - ts > this.validationRules.timestamp.maxAge) {
      return now;
    }

    return ts;
  }

  /**
   * 标准化测试阶段
   */
  private normalizePhase(phase: any): TestPhase {
    if (typeof phase !== 'string') return TestPhase.STEADY_STATE;

    const phaseMap: Record<string, TestPhase> = {
      'initialization': TestPhase.INITIALIZATION,
      'ramp-up': TestPhase.RAMP_UP,
      'rampup': TestPhase.RAMP_UP,
      'steady': TestPhase.STEADY_STATE,
      'steady-state': TestPhase.STEADY_STATE,
      'running': TestPhase.STEADY_STATE,
      'ramp-down': TestPhase.RAMP_DOWN,
      'rampdown': TestPhase.RAMP_DOWN,
      'cleanup': TestPhase.CLEANUP
    };

    return phaseMap[phase.toLowerCase()] || TestPhase.STEADY_STATE;
  }

  /**
   * 验证数据点
   */
  private validateDataPoint(dataPoint: TestDataPoint): boolean {
    return (
      dataPoint.timestamp > 0 &&
      dataPoint.responseTime >= this.validationRules.responseTime.min &&
      dataPoint.responseTime <= this.validationRules.responseTime.max &&
      dataPoint.activeUsers >= this.validationRules.activeUsers.min &&
      dataPoint.activeUsers <= this.validationRules.activeUsers.max &&
      dataPoint.throughput >= this.validationRules.throughput.min &&
      dataPoint.throughput <= this.validationRules.throughput.max &&
      dataPoint.errorRate >= this.validationRules.errorRate.min &&
      dataPoint.errorRate <= this.validationRules.errorRate.max
    );
  }

  /**
   * 验证指标
   */
  private validateMetrics(metrics: RealTimeMetrics): boolean {
    return (
      metrics.totalRequests >= 0 &&
      metrics.successfulRequests >= 0 &&
      metrics.failedRequests >= 0 &&
      metrics.averageResponseTime >= this.validationRules.responseTime.min &&
      metrics.averageResponseTime <= this.validationRules.responseTime.max &&
      metrics.currentTPS >= this.validationRules.throughput.min &&
      metrics.currentTPS <= this.validationRules.throughput.max &&
      metrics.errorRate >= this.validationRules.errorRate.min &&
      metrics.errorRate <= this.validationRules.errorRate.max
    );
  }

  /**
   * 移除异常值
   */
  private removeOutliers(dataPoints: TestDataPoint[]): TestDataPoint[] {
    if (dataPoints.length < 3) return dataPoints;

    const responseTimes = dataPoints.map(p => p.responseTime);
    const mean = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);
    const threshold = this.cleaningOptions.outlierThreshold * stdDev;

    return dataPoints.filter(point =>
      Math.abs(point.responseTime - mean) <= threshold
    );
  }

  /**
   * 平滑数据
   */
  private smoothData(dataPoints: TestDataPoint[]): TestDataPoint[] {
    if (dataPoints.length < this.cleaningOptions.smoothingWindow) return dataPoints;

    const smoothed = [...dataPoints];
    const window = this.cleaningOptions.smoothingWindow;

    for (let i = window; i < smoothed.length - window; i++) {
      const windowData = smoothed.slice(i - window, i + window + 1);
      const avgResponseTime = windowData.reduce((sum, p) => sum + p.responseTime, 0) / windowData.length;
      const avgThroughput = windowData.reduce((sum, p) => sum + p.throughput, 0) / windowData.length;

      smoothed[i] = {
        ...smoothed[i],
        responseTime: avgResponseTime,
        throughput: avgThroughput
      };
    }

    return smoothed;
  }

  /**
   * 填充缺失值
   */
  private fillMissingValues(dataPoints: TestDataPoint[]): TestDataPoint[] {
    if (dataPoints.length < 2) return dataPoints;

    const filled = [...dataPoints];

    for (let i = 1; i < filled.length; i++) {
      const current = filled[i];
      const previous = filled[i - 1];

      // 如果当前数据点的值为0或异常，使用前一个值
      if (current.responseTime === 0 && previous.responseTime > 0) {
        current.responseTime = previous.responseTime;
      }
      if (current.throughput === 0 && previous.throughput > 0) {
        current.throughput = previous.throughput;
      }
    }

    return filled;
  }

  /**
   * 批量标准化数据点 - 优化性能，减少重复映射
   */
  private batchNormalizeDataPoints(rawPoints: any[]): TestDataPoint[] {
    const normalizedPoints: TestDataPoint[] = [];

    for (const point of rawPoints) {
      const normalizedPoint = this.normalizeDataPoint({
        timestamp: point.timestamp || Date.now(),
        responseTime: point.responseTime || 0,
        activeUsers: point.activeUsers || 0,
        throughput: point.throughput || point.rps || 0,
        errorRate: point.success === false ? 100 : 0,
        status: point.success === false ? 500 : 200,
        success: point.success ?? true,
        phase: this.normalizePhase(point.phase)
      });

      if (this.validateDataPoint(normalizedPoint)) {
        normalizedPoints.push(normalizedPoint);
      }
    }

    return normalizedPoints;
  }

  /**
   * 验证数据点（简化版本）
   */
  private validateDataPointSimple(point: TestDataPoint): boolean {
    return (
      typeof point.timestamp === 'number' &&
      point.timestamp > 0 &&
      typeof point.responseTime === 'number' &&
      point.responseTime >= 0
    );
  }
}

// 创建默认实例
export const dataNormalizationPipeline = new DataNormalizationPipeline();
