/**
 * 性能监控集成服务
 * 集成性能监控工具到应用中
 */

import { performanceMonitor } from '../utils/performanceMonitor';

// 性能监控配置
const monitoringConfig = {
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: 0.1, // 10%采样率
  reportInterval: 30000, // 30秒报告间隔
  thresholds: {
    pageLoadTime: 3000,
    renderTime: 16,
    memoryUsage: 50 * 1024 * 1024 // 50MB
  }
};

class PerformanceMonitoringService {
  private reportTimer: NodeJS.Timeout | null = null;

  /**
   * 初始化性能监控
   */
  initialize() {
    if (!monitoringConfig.enabled) return;

    // 开始定期报告
    this.startPeriodicReporting();

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 监听页面卸载
    window.addEventListener('beforeunload', this.handlePageUnload);

    console.log('Performance monitoring initialized');
  }

  /**
   * 开始定期报告
   */
  private startPeriodicReporting() {
    this.reportTimer = setInterval(() => {
      this.generateAndSendReport();
    }, monitoringConfig.reportInterval);
  }

  /**
   * 生成并发送性能报告
   */
  private generateAndSendReport() {
    const report = performanceMonitor.getPerformanceReport();

    // 检查性能阈值
    const issues = this.checkPerformanceThresholds(report);

    if (issues.length > 0 || Math.random() < monitoringConfig.sampleRate) {
      this.sendReport({
        ...report,
        issues,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(report: any): string[] {
    const issues: string[] = [];

    if (report.summary.pageLoadTime > monitoringConfig.thresholds.pageLoadTime) {
      issues.push('Page load time exceeded threshold');
    }

    if (report.summary.averageComponentRenderTime > monitoringConfig.thresholds.renderTime) {
      issues.push('Component render time exceeded threshold');
    }

    return issues;
  }

  /**
   * 发送性能报告
   */
  private sendReport(report: any) {
    // 发送到性能监控服务
    fetch('/api/performance/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    }).catch(error => {
      console.warn('Failed to send performance report:', error);
    });
  }

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // 页面隐藏时发送报告
      this.generateAndSendReport();
    }
  };

  /**
   * 处理页面卸载
   */
  private handlePageUnload = () => {
    // 页面卸载时发送最终报告
    const report = performanceMonitor.getPerformanceReport();

    // 使用sendBeacon确保数据发送
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/performance/report',
        JSON.stringify({
          ...report,
          type: 'unload',
          timestamp: Date.now()
        })
      );
    }
  };

  /**
   * 清理资源
   */
  cleanup() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handlePageUnload);

    performanceMonitor.cleanup();
  }
}

// 创建全局实例
export const performanceMonitoringService = new PerformanceMonitoringService();

// 自动初始化
if (typeof window !== 'undefined') {
  performanceMonitoringService.initialize();
}

export default performanceMonitoringService;