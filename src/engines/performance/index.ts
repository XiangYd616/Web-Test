/**
 * 性能测试引擎 - 前端
 * 提供网站性能测试、分析、优化建议功能
 */

export interface PerformanceTestConfig {
  url: string;
  device?: 'desktop' | 'mobile';
  connection?: 'fast' | 'slow' | '3g' | '4g';
  iterations?: number;
  timeout?: number;
}

export interface PerformanceTestResult {
  url: string;
  device: string;
  metrics: PerformanceMetrics;
  score: number;
  issues: PerformanceIssue[];
  recommendations: PerformanceRecommendation[];
  timestamp: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;
  resourceSizes: {
    html: number;
    css: number;
    js: number;
    images: number;
    fonts: number;
    other: number;
    total: number;
  };
  resourceCounts: {
    requests: number;
    domains: number;
    redirects: number;
  };
}

export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  impact: number;
  recommendation?: string;
}

export interface PerformanceRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  potentialSavings: number;
  action: string;
}

class PerformanceTestEngine {
  private baseUrl = '/api/performance';

  /**
   * 执行性能测试
   */
  async runTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '性能测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('性能测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能指标
   */
  async getMetrics(url: string, device: string = 'desktop'): Promise<PerformanceMetrics> {
    try {
      const params = new URLSearchParams({ url, device });
      const response = await fetch(`${this.baseUrl}/metrics?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取性能指标失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能建议
   */
  async getRecommendations(url: string): Promise<PerformanceRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取性能建议失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取性能建议失败:', error);
      throw error;
    }
  }

  /**
   * 比较性能结果
   */
  async compareResults(testId1: string, testId2: string) {
    try {
      const response = await fetch(`${this.baseUrl}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testId1, testId2 })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '性能比较失败');
      }

      return data.data;
    } catch (error) {
      console.error('性能比较失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能历史
   */
  async getHistory(url?: string, pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (url) {
        params.append('url', url);
      }

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取性能历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取性能历史失败:', error);
      throw error;
    }
  }

  /**
   * 监控性能趋势
   */
  async getTrends(url: string, timeRange: number = 30) {
    try {
      const params = new URLSearchParams({
        url,
        timeRange: timeRange.toString()
      });

      const response = await fetch(`${this.baseUrl}/trends?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取性能趋势失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取性能趋势失败:', error);
      throw error;
    }
  }

  /**
   * 导出性能报告
   */
  async exportReport(testId: string, format: 'json' | 'html' | 'pdf' = 'html'): Promise<string> {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`${this.baseUrl}/${testId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出性能报告失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: PerformanceTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (config.iterations && (config.iterations < 1 || config.iterations > 10)) {
      errors.push('迭代次数必须在1-10之间');
    }

    if (config.timeout && (config.timeout < 5000 || config.timeout > 60000)) {
      errors.push('超时时间必须在5-60秒之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): PerformanceTestConfig {
    return {
      url: '',
      device: 'desktop',
      connection: 'fast',
      iterations: 1,
      timeout: 30000
    };
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // 基于Core Web Vitals计算评分
    let score = 100;

    // LCP (Largest Contentful Paint)
    if (metrics.largestContentfulPaint > 4000) score -= 25;
    else if (metrics.largestContentfulPaint > 2500) score -= 15;

    // FID (First Input Delay)
    if (metrics.firstInputDelay > 300) score -= 20;
    else if (metrics.firstInputDelay > 100) score -= 10;

    // CLS (Cumulative Layout Shift)
    if (metrics.cumulativeLayoutShift > 0.25) score -= 20;
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 10;

    // FCP (First Contentful Paint)
    if (metrics.firstContentfulPaint > 3000) score -= 15;
    else if (metrics.firstContentfulPaint > 1800) score -= 8;

    // TTI (Time to Interactive)
    if (metrics.timeToInteractive > 7000) score -= 10;
    else if (metrics.timeToInteractive > 3800) score -= 5;

    // Speed Index
    if (metrics.speedIndex > 5800) score -= 10;
    else if (metrics.speedIndex > 3400) score -= 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * 格式化性能结果
   */
  formatResults(result: PerformanceTestResult): string {
    let report = `性能测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `设备: ${result.device}\n`;
    report += `评分: ${result.score}/100\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    report += `核心指标:\n`;
    report += `- 加载时间: ${result.metrics.loadTime}ms\n`;
    report += `- 首次内容绘制: ${result.metrics.firstContentfulPaint}ms\n`;
    report += `- 最大内容绘制: ${result.metrics.largestContentfulPaint}ms\n`;
    report += `- 首次输入延迟: ${result.metrics.firstInputDelay}ms\n`;
    report += `- 累积布局偏移: ${result.metrics.cumulativeLayoutShift}\n`;
    report += `- 可交互时间: ${result.metrics.timeToInteractive}ms\n\n`;

    report += `资源统计:\n`;
    report += `- 总请求数: ${result.metrics.resourceCounts.requests}\n`;
    report += `- 总大小: ${(result.metrics.resourceSizes.total / 1024).toFixed(2)}KB\n`;
    report += `- HTML: ${(result.metrics.resourceSizes.html / 1024).toFixed(2)}KB\n`;
    report += `- CSS: ${(result.metrics.resourceSizes.css / 1024).toFixed(2)}KB\n`;
    report += `- JavaScript: ${(result.metrics.resourceSizes.js / 1024).toFixed(2)}KB\n`;
    report += `- 图片: ${(result.metrics.resourceSizes.images / 1024).toFixed(2)}KB\n\n`;

    if (result.issues.length > 0) {
      report += `发现的问题 (${result.issues.length}个):\n`;
      result.issues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
        if (issue.recommendation) {
          report += `   建议: ${issue.recommendation}\n`;
        }
      });
      report += '\n';
    }

    if (result.recommendations.length > 0) {
      report += `优化建议 (${result.recommendations.length}个):\n`;
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `   ${rec.description}\n`;
        report += `   潜在节省: ${rec.potentialSavings}ms\n`;
        report += `   操作: ${rec.action}\n`;
      });
    }

    return report;
  }

  /**
   * 私有辅助方法
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export const performanceTestEngine = new PerformanceTestEngine();
export default performanceTestEngine;
