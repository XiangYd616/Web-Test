/**
 * SEO测试引擎 - 前端
 * 提供SEO分析、检测、优化建议功能
 */

export interface SEOTestConfig {
  url: string;
  depth?: number;
  includeImages?: boolean;
  checkMobile?: boolean;
  checkSpeed?: boolean;
}

export interface SEOTestResult {
  url: string;
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  metrics: SEOMetrics;
  timestamp: string;
}

export interface SEOIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  element?: string;
  recommendation?: string;
}

export interface SEORecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
}

export interface SEOMetrics {
  titleTag: {
    exists: boolean;
    length: number;
    isOptimal: boolean;
  };
  metaDescription: {
    exists: boolean;
    length: number;
    isOptimal: boolean;
  };
  headings: {
    h1Count: number;
    h2Count: number;
    structure: boolean;
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
  };
  performance: {
    loadTime: number;
    pageSize: number;
    mobileOptimized: boolean;
  };
}

class SEOTestEngine {
  private baseUrl = '/api/seo';

  /**
   * 执行SEO测试
   */
  async runTest(config: SEOTestConfig): Promise<SEOTestResult> {
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
        throw new Error(data.error || 'SEO测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('SEO测试失败:', error);
      throw error;
    }
  }

  /**
   * 获取SEO建议
   */
  async getSEORecommendations(url: string): Promise<SEORecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取SEO建议失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取SEO建议失败:', error);
      throw error;
    }
  }

  /**
   * 分析页面SEO
   */
  async analyzePage(url: string): Promise<SEOMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '页面SEO分析失败');
      }

      return data.data;
    } catch (error) {
      console.error('页面SEO分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取SEO历史记录
   */
  async getHistory(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取SEO历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取SEO历史失败:', error);
      throw error;
    }
  }

  /**
   * 导出SEO报告
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
      console.error('导出SEO报告失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: SEOTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (config.depth && (config.depth < 1 || config.depth > 10)) {
      errors.push('深度必须在1-10之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): SEOTestConfig {
    return {
      url: '',
      depth: 1,
      includeImages: true,
      checkMobile: true,
      checkSpeed: true
    };
  }

  /**
   * 计算SEO评分
   */
  calculateSEOScore(metrics: SEOMetrics): number {
    let score = 100;

    // 标题标签评分
    if (!metrics.titleTag.exists) score -= 15;
    else if (!metrics.titleTag.isOptimal) score -= 5;

    // Meta描述评分
    if (!metrics.metaDescription.exists) score -= 10;
    else if (!metrics.metaDescription.isOptimal) score -= 3;

    // 标题结构评分
    if (metrics.headings.h1Count === 0) score -= 10;
    else if (metrics.headings.h1Count > 1) score -= 5;
    if (!metrics.headings.structure) score -= 5;

    // 图片Alt属性评分
    if (metrics.images.total > 0) {
      const altRatio = metrics.images.withAlt / metrics.images.total;
      if (altRatio < 0.5) score -= 15;
      else if (altRatio < 0.8) score -= 8;
      else if (altRatio < 1) score -= 3;
    }

    // 链接评分
    if (metrics.links.broken > 0) {
      score -= Math.min(metrics.links.broken * 2, 10);
    }

    // 性能评分
    if (metrics.performance.loadTime > 3000) score -= 10;
    else if (metrics.performance.loadTime > 2000) score -= 5;
    
    if (!metrics.performance.mobileOptimized) score -= 15;

    return Math.max(0, Math.round(score));
  }

  /**
   * 格式化SEO结果
   */
  formatResults(result: SEOTestResult): string {
    let report = `SEO测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `评分: ${result.score}/100\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

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

export const seoTestEngine = new SEOTestEngine();
export default seoTestEngine;
