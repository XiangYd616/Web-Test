/**
 * 简化的性能监控器
 * 提供基本的性能监控功能
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

/**
 * 简化的性能监控器
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isInitialized = false;

  /**
   * 初始化性能监控
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('✅ Performance Monitor initialized (simplified)');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Performance Monitor:', error);
    }
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: string, value: number, unit = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now()
    };

    this.metrics.push(metric);

    // 保持最近100个指标
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * 开始性能测量
   */
  startMeasure(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * 结束性能测量
   */
  endMeasure(name: string): number {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      const endMark = `${name}-end`;
      const startMark = `${name}-start`;
      
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
      
      const measure = performance.getEntriesByName(name, 'measure')[0] as PerformanceMeasure;
      const duration = measure ? measure.duration : 0;
      
      this.recordMetric(name, duration, 'ms');
      return duration;
    }
    return 0;
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary() {
    return {
      totalMetrics: this.metrics.length,
      isInitialized: this.isInitialized,
      lastMetric: this.metrics[this.metrics.length - 1]
    };
  }

  /**
   * 销毁性能监控器
   */
  destroy(): void {
    this.metrics = [];
    this.isInitialized = false;
    console.log('📝 Performance Monitor destroyed');
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor();
