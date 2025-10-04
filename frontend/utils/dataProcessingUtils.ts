/**
 * 统一的数据处理工具类
 * 整合项目中重复的数据处理逻辑
 */

export interface TestDataPoint {
  timestamp: string | number;
  responseTime: number;
  activeUsers: number;
  throughput: number;
  errorRate: number;
  status: number;
  success: boolean;
  phase?: string;
}

export interface ResponseTimeDistribution {
  range: string;
  count: number;
  percentage: number;
  color?: string;
}

export class DataProcessingUtils {
  /**
   * 标准化时间戳
   */
  static normalizeTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();

    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }

    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * 标准化数值
   */
  static normalizeNumber(value: unknown, min: number = 0, max: number = Infinity): number {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * 标准化数据点
   */
  static normalizeDataPoint(rawPoint: any): TestDataPoint {
    return {
      timestamp: this.normalizeTimestamp(rawPoint.timestamp),
      responseTime: this.normalizeNumber(rawPoint.responseTime, 0, 60000),
      activeUsers: this.normalizeNumber(rawPoint.activeUsers, 0, 10000),
      throughput: this.normalizeNumber(rawPoint.throughput, 0, 10000),
      errorRate: this.normalizeNumber(rawPoint.errorRate, 0, 100),
      status: rawPoint.status || (rawPoint.success ? 200 : 500),
      success: Boolean(rawPoint.success),
      phase: rawPoint.phase || 'steady'
    };
  }

  /**
   * 过滤有效数据
   */
  static filterValidData(data: unknown[]): TestDataPoint[] {
    return data
      .filter(item => item && typeof item === 'object')
      .map(item => this.normalizeDataPoint(item))
      .filter(item => item.responseTime > 0 && item.timestamp);
  }

  /**
   * 计算响应时间分布
   */
  static calculateResponseTimeDistribution(data: TestDataPoint[]): ResponseTimeDistribution[] {
    const validData = data.filter(item => item.responseTime > 0);

    if (validData.length === 0) {
      return [
        { range: '0-50ms', count: 0, percentage: 0, color: 'bg-green-400' },
        { range: '50-100ms', count: 0, percentage: 0, color: 'bg-green-300' },
        { range: '100-200ms', count: 0, percentage: 0, color: 'bg-yellow-400' },
        { range: '200-500ms', count: 0, percentage: 0, color: 'bg-orange-400' },
        { range: '500ms+', count: 0, percentage: 0, color: 'bg-red-400' }
      ];
    }

    const distribution = {
      '0-50': 0,
      '50-100': 0,
      '100-200': 0,
      '200-500': 0,
      '500+': 0
    };

    validData.forEach(item => {
      const responseTime = item.responseTime;
      if (responseTime <= 50) {
        distribution['0-50']++;
      } else if (responseTime <= 100) {
        distribution['50-100']++;
      } else if (responseTime <= 200) {
        distribution['100-200']++;
      } else if (responseTime <= 500) {
        distribution['200-500']++;
      } else {
        distribution['500+']++;
      }
    });

    const totalCount = validData.length;
    return [
      {
        range: '0-50ms',
        count: distribution['0-50'],
        percentage: totalCount > 0 ? (distribution['0-50'] / totalCount) * 100 : 0,
        color: 'bg-green-400'
      },
      {
        range: '50-100ms',
        count: distribution['50-100'],
        percentage: totalCount > 0 ? (distribution['50-100'] / totalCount) * 100 : 0,
        color: 'bg-green-300'
      },
      {
        range: '100-200ms',
        count: distribution['100-200'],
        percentage: totalCount > 0 ? (distribution['100-200'] / totalCount) * 100 : 0,
        color: 'bg-yellow-400'
      },
      {
        range: '200-500ms',
        count: distribution['200-500'],
        percentage: totalCount > 0 ? (distribution['200-500'] / totalCount) * 100 : 0,
        color: 'bg-orange-400'
      },
      {
        range: '500ms+',
        count: distribution['500+'],
        percentage: totalCount > 0 ? (distribution['500+'] / totalCount) * 100 : 0,
        color: 'bg-red-400'
      }
    ];
  }

  /**
   * 计算基础统计指标
   */
  static calculateBasicMetrics(data: TestDataPoint[]) {
    const validData = this.filterValidData(data);

    if (validData.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        errorRate: 0
      };
    }

    const responseTimes = validData.map(d => d?.responseTime);
    const successfulRequests = validData.filter(d => d?.success).length;
    const failedRequests = validData.length - successfulRequests;

    return {
      totalRequests: validData.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: parseFloat((responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length).toFixed(3)),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      errorRate: parseFloat(((failedRequests / validData.length) * 100).toFixed(2))
    };
  }

  /**
   * 数据采样 - 减少数据点数量
   */
  static sampleData(data: TestDataPoint[], maxPoints: number = 1000): TestDataPoint[] {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  /**
   * 时间窗口聚合
   */
  static aggregateByTimeWindow(data: TestDataPoint[], windowMs: number = 5000): TestDataPoint[] {
    if (data.length === 0) return [];

    const sortedData = [...data].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = new Date(sortedData[0].timestamp).getTime();
    const endTime = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
    const aggregatedData: TestDataPoint[] = [];

    for (let windowStart = startTime; windowStart < endTime; windowStart += windowMs) {
      const windowEnd = windowStart + windowMs;
      const windowData = sortedData.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        return itemTime >= windowStart && itemTime < windowEnd;
      });

      if (windowData.length > 0) {
        const avgResponseTime = windowData.reduce((sum, item) => sum + item.responseTime, 0) / windowData.length;
        const avgThroughput = windowData.reduce((sum, item) => sum + item.throughput, 0) / windowData.length;
        const avgActiveUsers = windowData.reduce((sum, item) => sum + item.activeUsers, 0) / windowData.length;
        const errorRate = (windowData.filter(item => !item.success).length / windowData.length) * 100;

        aggregatedData.push({
          timestamp: new Date(windowStart + windowMs / 2).toISOString(),
          responseTime: parseFloat(avgResponseTime.toFixed(3)),
          throughput: parseFloat(avgThroughput.toFixed(1)),
          activeUsers: Math.round(avgActiveUsers),
          errorRate: parseFloat(errorRate.toFixed(2)),
          status: windowData.every(item => item.success) ? 200 : 500,
          success: windowData.every(item => item.success),
          phase: windowData[0].phase
        });
      }
    }

    return aggregatedData;
  }

  /**
   * 🔧 新增：批量处理数据点（整合自DataNormalizationPipeline）
   */
  static processBatchDataPoints(dataPoints: TestDataPoint[], options?: {
    removeOutliers?: boolean;
    outlierThreshold?: number;
    smoothingWindow?: number;
    fillMissingValues?: boolean;
  }): TestDataPoint[] {
    if (!dataPoints.length) return [];

    const defaultOptions = {
      removeOutliers: true,
      outlierThreshold: 3,
      smoothingWindow: 5,
      fillMissingValues: true,
      ...options
    };

    let processedData = [...dataPoints];

    // 移除异常值
    if (defaultOptions.removeOutliers) {
      processedData = this.removeOutliers(processedData, defaultOptions.outlierThreshold);
    }

    // 平滑处理
    if (defaultOptions.smoothingWindow > 1) {
      processedData = this.smoothData(processedData, defaultOptions.smoothingWindow);
    }

    // 填充缺失值
    if (defaultOptions.fillMissingValues) {
      processedData = this.fillMissingValues(processedData);
    }

    return processedData;
  }

  /**
   * 🔧 新增：移除异常值
   */
  static removeOutliers(dataPoints: TestDataPoint[], threshold: number = 3): TestDataPoint[] {
    if (dataPoints.length < 3) return dataPoints;

    const responseTimes = dataPoints.map(p => p.responseTime);
    const mean = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);

    return dataPoints.filter(point => {
      const deviation = Math.abs(point.responseTime - mean);
      return deviation <= threshold * stdDev;
    });
  }

  /**
   * 🔧 新增：数据平滑处理
   */
  static smoothData(dataPoints: TestDataPoint[], windowSize: number = 5): TestDataPoint[] {
    if (dataPoints.length < windowSize) return dataPoints;

    const smoothed = [...dataPoints];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = halfWindow; i < smoothed.length - halfWindow; i++) {
      const window = dataPoints.slice(i - halfWindow, i + halfWindow + 1);
      const avgResponseTime = window.reduce((sum, p) => sum + p.responseTime, 0) / window.length;
      const avgThroughput = window.reduce((sum, p) => sum + p.throughput, 0) / window.length;

      smoothed[i] = {
        ...smoothed[i],
        responseTime: parseFloat(avgResponseTime.toFixed(3)),
        throughput: parseFloat(avgThroughput.toFixed(1))
      };
    }

    return smoothed;
  }

  /**
   * 🔧 新增：填充缺失值
   */
  static fillMissingValues(dataPoints: TestDataPoint[]): TestDataPoint[] {
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
   * 🔧 新增：验证数据点
   */
  static validateDataPoint(dataPoint: TestDataPoint): boolean {
    return (
      typeof dataPoint.responseTime === 'number' &&
      dataPoint.responseTime >= 0 &&
      dataPoint.responseTime <= 60000 &&
      typeof dataPoint.throughput === 'number' &&
      dataPoint.throughput >= 0 &&
      typeof dataPoint.activeUsers === 'number' &&
      dataPoint.activeUsers >= 0
    );
  }
}

export default DataProcessingUtils;
