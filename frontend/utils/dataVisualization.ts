/**
 * ���ݿ��ӻ��Ż�����
 * ����������ݵ㵼�µ���������
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
   * �Ż����ݼ���������Ⱦ����
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

    // ���ɻ����
    const cacheKey = this.generateCacheKey(data, finalConfig);

    // ��黺��
    if (finalConfig.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.performanceMetrics.cacheHits++;
      return { ...cached, cacheHit: true };
    }

    // ���������С����ֵ��ֱ�ӷ���
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

    // ִ�������Ż�
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

    // ������
    if (finalConfig.enableCaching) {
      this.cache.set(cacheKey, result);
      this.performanceMetrics.cacheMisses++;
    }

    // ��������ָ��
    this.performanceMetrics.totalProcessingTime += processingTime;
    this.updateAverageCompressionRatio(result.compressionRatio);

    return result;
  }

  /**
   * ���Ȳ���
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
   * ����Ӧ���� - ������Ҫ���ݵ㣬ͬʱ����ͳ������
   */
  private adaptiveSampling(data: DataPoint[], config: OptimizationConfig): DataPoint[] {
    if (data.length <= config.maxDataPoints) return data;

    // ����ԭʼ���ݵ�ͳ����Ϣ
    const originalStats = this.calculateDataStats(data);

    const step = data.length / config.maxDataPoints;

    // �������ݱ仯����ȷ����Ҫ��
    const importanceScores = this.calculateImportanceScores(data);

    // ������Ҫ�Ժ;��ȷֲ�ѡ�����ݵ�
    const selectedIndices = new Set<number>();
    selectedIndices.add(0);
    selectedIndices.add(data.length - 1);

    // ���Ȳ��������㣨ռ70%��
    const uniformCount = Math.floor(config.maxDataPoints * 0.7);
    for (let i = 1; i < uniformCount - 1; i++) {
      const index = Math.floor(i * step);
      selectedIndices.add(index);
    }

    // ������ùؼ��㱣������Ӹ���Ҫ�Ե㣨ռ30%��
    if (config.preserveKeyPoints) {
      const importanceCount = config.maxDataPoints - uniformCount;
      const sortedByImportance = importanceScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score)
        .slice(0, importanceCount);

      sortedByImportance.forEach(item => selectedIndices.add(item.index));
    }

    // ת��Ϊ�������鲢��ȡ����
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
    const sampledData = sortedIndices.map(index => data[index]);

    // ��֤��������������Ա���ͳ������
    const sampledStats = this.calculateDataStats(sampledData);
    const adjustedData = this.adjustSamplingForStats(data, sampledData, originalStats, sampledStats);

    return adjustedData;
  }

  /**
   * ��Ҫ�Բ��� - �����������������ܲ���
   */
  private importanceSampling(data: DataPoint[], config: OptimizationConfig): DataPoint[] {
    const importanceScores = this.calculateImportanceScores(data);

    // ������Ȩ����
    const weightedData = data.map((point, index) => ({
      point,
      importance: importanceScores[index],
      index
    }));

    // ����Ҫ������
    weightedData.sort((a, b) => b.importance - a.importance);

    // ѡ������Ҫ�ĵ㣬������ʱ��˳��
    const selectedData = weightedData
      .slice(0, config.maxDataPoints)
      .sort((a, b) => a.index - b.index)
      .map(item => item.point);

    return selectedData;
  }

  /**
   * ��������ͳ����Ϣ
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
   * ������������Ա���ͳ������
   */
  private adjustSamplingForStats(
    originalData: DataPoint[],
    sampledData: DataPoint[],
    originalStats: unknown,
    sampledStats: any): DataPoint[] {
    // ����������ƽ��ֵƫ���5%�����в����Բ���
    const responseTimeDiff = Math.abs((sampledStats as any).avgResponseTime - (originalStats as any).avgResponseTime);
    const responseTimeThreshold = (originalStats as any).avgResponseTime * 0.05; // 5%��ֵ

    if (responseTimeDiff > responseTimeThreshold && originalData.length > sampledData.length) {
      // �ҵ�����©���е���Ӧʱ�����ݵ�
      const sampledIndices = new Set(sampledData.map((_, i) => {
        // �ҵ�ԭʼ�����ж�Ӧ������
        return originalData.findIndex(orig =>
          orig.timestamp === sampledData[i].timestamp
        );
      }));

      // Ѱ�ҽӽ�ƽ��ֵ�����ݵ���в���
      const targetResponseTime = (originalStats as any).avgResponseTime;
      const candidates = originalData
        .map((point, index) => ({ point, index, diff: Math.abs((point.responseTime || 0) - targetResponseTime) }))
        .filter(item => !sampledIndices.has(item.index))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, Math.min(10, Math.floor(sampledData.length * 0.1))); // ��ಹ��10%

      // �����Щ������
      const compensatedData = [...sampledData];
      candidates.forEach(candidate => {
        compensatedData.push(candidate.point);
      });

      // ��ʱ�����������
      compensatedData.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return compensatedData;
    }

    return sampledData;
  }

  /**
   * �������ݵ���Ҫ�Է���
   */
  private calculateImportanceScores(data: DataPoint[]): number[] {
    const scores: number[] = new Array(data.length).fill(0);

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];

      // ������Ӧʱ��仯��
      const responseTimeChange = Math.abs(
        (curr.responseTime || 0) - (prev.responseTime || 0)
      ) + Math.abs(
        (next.responseTime || 0) - (curr.responseTime || 0)
      );

      // �����������仯��
      const throughputChange = Math.abs(
        (curr.throughput || curr.tps || 0) - (prev.throughput || prev.tps || 0)
      ) + Math.abs(
        (next.throughput || next.tps || 0) - (curr.throughput || curr.tps || 0)
      );

      // ��������ʱ仯
      const errorRateChange = Math.abs(
        (curr.errorRate || 0) - (prev.errorRate || 0)
      ) + Math.abs(
        (next.errorRate || 0) - (curr.errorRate || 0)
      );

      // �ۺ���Ҫ�Է���
      scores[i] = responseTimeChange * 0.4 + throughputChange * 0.4 + errorRateChange * 0.2;
    }

    // �߽����Ϊ����Ҫ��
    scores[0] = Math.max(...scores) * 1.5;
    scores[scores.length - 1] = Math.max(...scores) * 1.5;

    return scores;
  }

  /**
   * ���ɻ����
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
   * �򵥹�ϣ����
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // ת��Ϊ32λ����
    }
    return hash.toString(36);
  }

  /**
   * ����ƽ��ѹ����
   */
  private updateAverageCompressionRatio(newRatio: number): void {
    const totalOperations = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    this.performanceMetrics.averageCompressionRatio =
      (this.performanceMetrics.averageCompressionRatio * (totalOperations - 1) + newRatio) / totalOperations;
  }

  /**
   * ��ȡ����ָ��
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * ������
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * ��ȡ����ͳ��
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.performanceMetrics.cacheHits /
        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
    };
  }
}

// ��������ʵ��
export const _dataVisualizationOptimizer = new DataVisualizationOptimizer();
export default DataVisualizationOptimizer;
