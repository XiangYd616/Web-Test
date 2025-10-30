/**
 * 数据可视化优化工具
 * 解决大量数据点导致的性能问题
 */

export interface DataPoint {
  timestamp: string | number;
  responseTime?: number;
  throughput?: number;
  tps?: number;
  activeUsers?: number;
  errorRate?: number;
  [key: string]: any;
}

export interface OptimizationConfig {
  maxDataPoints: number;
  samplingStrategy: 'uniform' | 'adaptive' | 'importance';
  preserveKeyPoints: boolean;
  enableCaching: boolean;
  performanceThreshold: number; // ms
}

export interface OptimizationResult {
  data: DataPoint[];
  originalCount: number;
  optimizedCount: number;
  compressionRatio: number;
  processingTime: number;
  cacheHit: boolean;
}

class DataVisualizationOptimizer {
  private cache = new Map<string, OptimizationResult>();
  private performanceMetrics = {
    totalProcessingTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageCompressionRatio: 0
  };

  /**
   * 优化数据集以提升渲染性能
   */
  optimizeDataset(
    data: DataPoint[],
    config: Partial<OptimizationConfig> = {}
  ): OptimizationResult {
    const startTime = performance.now();

    const finalConfig: OptimizationConfig = {
      maxDataPoints: 1000,
      samplingStrategy: 'adaptive',
      preserveKeyPoints: true,
      enableCaching: true,
      performanceThreshold: 50,
      ...config
    };

    // 生成缓存键
    const cacheKey = this.generateCacheKey(data, finalConfig);

    // 检查缓存
    if (finalConfig.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.performanceMetrics.cacheHits++;
      return { ...cached, cacheHit: true };
    }

    // 如果数据量小于阈值，直接返回
    if (data.length <= finalConfig.maxDataPoints) {
      const result: OptimizationResult = {
        data: [...data],
        originalCount: data.length,
        optimizedCount: data.length,
        compressionRatio: 1,
        processingTime: performance.now() - startTime,
        cacheHit: false
      };
      return result;
    }

    // 执行数据优化
    let optimizedData: DataPoint[];

    switch (finalConfig.samplingStrategy) {
      case 'uniform':
        optimizedData = this.uniformSampling(data, finalConfig.maxDataPoints);
        break;
      case 'adaptive':
        optimizedData = this.adaptiveSampling(data, finalConfig);
        break;
      case 'importance':
        optimizedData = this.importanceSampling(data, finalConfig);
        break;
      default:
        optimizedData = this.adaptiveSampling(data, finalConfig);
    }

    const processingTime = performance.now() - startTime;

    const result: OptimizationResult = {
      data: optimizedData,
      originalCount: data.length,
      optimizedCount: optimizedData.length,
      compressionRatio: data.length / optimizedData.length,
      processingTime,
      cacheHit: false
    };

    // 缓存结果
    if (finalConfig.enableCaching) {
      this.cache.set(cacheKey, result);
      this.performanceMetrics.cacheMisses++;
    }

    // 更新性能指标
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.updateAverageCompressionRatio(result.compressionRatio);

    return result;
  }

  /**
   * 均匀采样
   */
  private uniformSampling(data: DataPoint[], maxPoints: number): DataPoint[] {
    if (data.length <= maxPoints) return data;

    const step = data.length / maxPoints;
    const result: DataPoint[] = [];

    for (let i = 0; i < maxPoints; i++) {
      const index = Math.floor(i * step);
      result.push(data[index]);
    }

    return result;
  }

  /**
   * 自适应采样 - 保留重要数据点，同时保持统计特性
   */
  private adaptiveSampling(data: DataPoint[], config: OptimizationConfig): DataPoint[] {
    if (data.length <= config.maxDataPoints) return data;

    // 计算原始数据的统计信息
    const originalStats = this.calculateDataStats(data);

    const step = data.length / config.maxDataPoints;

    // 计算数据变化率来确定重要性
    const importanceScores = this.calculateImportanceScores(data);

    // 根据重要性和均匀分布选择数据点
    const selectedIndices = new Set<number>();
    selectedIndices.add(0);
    selectedIndices.add(data.length - 1);

    // 均匀采样基础点（占70%）
    const uniformCount = Math.floor(config.maxDataPoints * 0.7);
    for (let i = 1; i < uniformCount - 1; i++) {
      const index = Math.floor(i * step);
      selectedIndices.add(index);
    }

    // 如果启用关键点保留，添加高重要性点（占30%）
    if (config.preserveKeyPoints) {
      const importanceCount = config.maxDataPoints - uniformCount;
      const sortedByImportance = importanceScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score)
        .slice(0, importanceCount);

      sortedByImportance.forEach(item => selectedIndices.add(item.index));
    }

    // 转换为排序数组并提取数据
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
    const sampledData = sortedIndices.map(index => data[index]);

    // 验证并调整采样结果以保持统计特性
    const sampledStats = this.calculateDataStats(sampledData);
    const adjustedData = this.adjustSamplingForStats(data, sampledData, originalStats, sampledStats);

    return adjustedData;
  }

  /**
   * 重要性采样 - 基于数据特征的智能采样
   */
  private importanceSampling(data: DataPoint[], config: OptimizationConfig): DataPoint[] {
    const importanceScores = this.calculateImportanceScores(data);

    // 创建加权采样
    const weightedData = data.map((point, index) => ({
      point,
      importance: importanceScores[index],
      index
    }));

    // 按重要性排序
    weightedData.sort((a, b) => b.importance - a.importance);

    // 选择最重要的点，但保持时间顺序
    const selectedData = weightedData
      .slice(0, config.maxDataPoints)
      .sort((a, b) => a.index - b.index)
      .map(item => item.point);

    return selectedData;
  }

  /**
   * 计算数据统计信息
   */
  private calculateDataStats(data: DataPoint[]) {
    if (data.length === 0) return { avgResponseTime: 0, avgThroughput: 0, count: 0 };

    const responseTimes = data.map(d => d.responseTime || 0).filter(rt => rt > 0);
    const throughputs = data.map(d => d.throughput || d.tps || 0).filter(tp => tp > 0);

    return {
      avgResponseTime: responseTimes.length > 0 ?
        responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      avgThroughput: throughputs.length > 0 ?
        throughputs.reduce((sum, tp) => sum + tp, 0) / throughputs.length : 0,
      count: data.length
    };
  }

  /**
   * 调整采样结果以保持统计特性
   */
  private adjustSamplingForStats(
    originalData: DataPoint[],
    sampledData: DataPoint[],
    originalStats: unknown,
    sampledStats: any): DataPoint[] {
    // 如果采样后的平均值偏差超过5%，进行补偿性采样
    const responseTimeDiff = Math.abs((sampledStats as any).avgResponseTime - (originalStats as any).avgResponseTime);
    const responseTimeThreshold = (originalStats as any).avgResponseTime * 0.05; // 5%阈值

    if (responseTimeDiff > responseTimeThreshold && originalData.length > sampledData.length) {
      // 找到被遗漏的中等响应时间数据点
      const sampledIndices = new Set(sampledData.map((_, i) => {
        // 找到原始数据中对应的索引
        return originalData.findIndex(orig =>
          orig.timestamp === sampledData[i].timestamp
        );
      }));

      // 寻找接近平均值的数据点进行补充
      const targetResponseTime = (originalStats as any).avgResponseTime;
      const candidates = originalData
        .map((point, index) => ({ point, index, diff: Math.abs((point.responseTime || 0) - targetResponseTime) }))
        .filter(item => !sampledIndices.has(item.index))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, Math.min(10, Math.floor(sampledData.length * 0.1))); // 最多补充10%

      // 添加这些补偿点
      const compensatedData = [...sampledData];
      candidates.forEach(candidate => {
        compensatedData.push(candidate.point);
      });

      // 按时间戳重新排序
      compensatedData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return compensatedData;
    }

    return sampledData;
  }

  /**
   * 计算数据点重要性分数
   */
  private calculateImportanceScores(data: DataPoint[]): number[] {
    const scores: number[] = new Array(data.length).fill(0);

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];

      // 计算响应时间变化率
      const responseTimeChange = Math.abs(
        (curr.responseTime || 0) - (prev.responseTime || 0)
      ) + Math.abs(
        (next.responseTime || 0) - (curr.responseTime || 0)
      );

      // 计算吞吐量变化率
      const throughputChange = Math.abs(
        (curr.throughput || curr.tps || 0) - (prev.throughput || prev.tps || 0)
      ) + Math.abs(
        (next.throughput || next.tps || 0) - (curr.throughput || curr.tps || 0)
      );

      // 计算错误率变化
      const errorRateChange = Math.abs(
        (curr.errorRate || 0) - (prev.errorRate || 0)
      ) + Math.abs(
        (next.errorRate || 0) - (curr.errorRate || 0)
      );

      // 综合重要性分数
      scores[i] = responseTimeChange * 0.4 + throughputChange * 0.4 + errorRateChange * 0.2;
    }

    // 边界点设为高重要性
    scores[0] = Math.max(...scores) * 1.5;
    scores[scores.length - 1] = Math.max(...scores) * 1.5;

    return scores;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(data: DataPoint[], config: OptimizationConfig): string {
    const dataHash = this.simpleHash(JSON.stringify({
      length: data.length,
      first: data[0],
      last: data[data.length - 1],
      sample: data[Math.floor(data.length / 2)]
    }));

    const configHash = this.simpleHash(JSON.stringify(config));
    return `${dataHash}_${configHash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  /**
   * 更新平均压缩比
   */
  private updateAverageCompressionRatio(newRatio: number): void {
    const totalOperations = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    this.performanceMetrics.averageCompressionRatio =
      (this.performanceMetrics.averageCompressionRatio * (totalOperations - 1) + newRatio) / totalOperations;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.performanceMetrics.cacheHits /
        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
    };
  }
}

// 导出单例实例
export const _dataVisualizationOptimizer = new DataVisualizationOptimizer();
export default DataVisualizationOptimizer;
