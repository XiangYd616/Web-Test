/**
 * Core Web Vitals分析器
 * 本地化程度：100%
 * 实现LCP、FID、CLS等核心性能指标的本地计算
 */

import puppeteer from 'puppeteer';

interface WebVitalsThresholds {
  lcp: {
    good: number;
    needsImprovement: number;
  };
  fid: {
    good: number;
    needsImprovement: number;
  };
  cls: {
    good: number;
    needsImprovement: number;
  };
  fcp: {
    good: number;
    needsImprovement: number;
  };
  ttfb: {
    good: number;
    needsImprovement: number;
  };
}

interface WebVitalsResult {
  lcp: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  };
  fid: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  };
  cls: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  };
  fcp: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  };
  ttfb: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  };
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: number;
  };
}

interface PerformanceMetrics {
  timestamp: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

interface CLSEntry {
  value: number;
  timestamp: number;
}

class CoreWebVitalsAnalyzer {
  private thresholds: WebVitalsThresholds;
  private metrics: PerformanceMetrics[];
  private clsEntries: CLSEntry[];

  constructor() {
    // Core Web Vitals阈值配置
    this.thresholds = {
      lcp: {
        good: 2500, // 2.5秒
        needsImprovement: 4000, // 4秒
      },
      fid: {
        good: 100, // 100毫秒
        needsImprovement: 300, // 300毫秒
      },
      cls: {
        good: 0.1, // 0.1
        needsImprovement: 0.25, // 0.25
      },
      fcp: {
        good: 1800, // 1.8秒
        needsImprovement: 3000, // 3秒
      },
      ttfb: {
        good: 800, // 800毫秒
        needsImprovement: 1800, // 1.8秒
      },
    };
    this.metrics = [];
    this.clsEntries = [];
  }

  /**
   * 分析Core Web Vitals
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      waitTime?: number;
    } = {}
  ): Promise<WebVitalsResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      waitTime = 5000,
    } = options;

    let browser;
    let page;

    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewport(viewport);

      // 设置用户代理
      const userAgent =
        device === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await page.setUserAgent(userAgent);

      // 开始监控性能指标
      const metrics = await this.startMetricsMonitoring(page);

      // 导航到页面
      const navigationStart = Date.now();
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 等待页面完全加载
      await page.waitFor(waitTime);

      // 收集性能指标
      const performanceMetrics = await this.collectMetrics(page, navigationStart);

      // 计算Web Vitals
      const webVitals = this.calculateWebVitals(performanceMetrics);

      return webVitals;
    } catch (error) {
      throw new Error(
        `Core Web Vitals分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 开始监控性能指标
   */
  private async startMetricsMonitoring(page: any): Promise<void> {
    // 监控LCP
    await page.evaluateOnNewDocument(() => {
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        const lcpEntry = entries.find(entry => entry.entryType === 'largest-contentful-paint');
        if (lcpEntry) {
          (window as any).__lcp = lcpEntry.startTime;
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // 监控FID
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'first-input') {
            (window as any).__fid = entry.processingStart - entry.startTime;
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // 监控CLS
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            if (!(window as any).__clsEntries) {
              (window as any).__clsEntries = [];
            }
            (window as any).__clsEntries.push({
              value: entry.value,
              timestamp: entry.startTime,
            });
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });

      // 监控FCP
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          (window as any).__fcp = fcpEntry.startTime;
        }
      }).observe({ entryTypes: ['paint'] });

      // 监控TTFB
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        const navEntry = entries.find(entry => entry.entryType === 'navigation');
        if (navEntry) {
          (window as any).__ttfb = navEntry.responseStart - navEntry.requestStart;
        }
      }).observe({ entryTypes: ['navigation'] });
    });
  }

  /**
   * 收集性能指标
   */
  private async collectMetrics(page: any, navigationStart: number): Promise<PerformanceMetrics> {
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];

      return {
        timestamp: Date.now(),
        lcp: (window as any).__lcp,
        fid: (window as any).__fid,
        cls: (window as any).__clsEntries || [],
        fcp: (window as any).__fcp,
        ttfb: (window as any).__ttfb,
      };
    });

    // 处理CLS数据
    let clsValue = 0;
    if (metrics.cls && Array.isArray(metrics.cls)) {
      clsValue = metrics.cls.reduce((sum: number, entry: CLSEntry) => sum + entry.value, 0);
    }

    return {
      timestamp: metrics.timestamp,
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: clsValue,
      fcp: metrics.fcp,
      ttfb: metrics.ttfb,
    };
  }

  /**
   * 计算Web Vitals
   */
  private calculateWebVitals(metrics: PerformanceMetrics): WebVitalsResult {
    const lcp = this.calculateLCP(metrics.lcp);
    const fid = this.calculateFID(metrics.fid);
    const cls = this.calculateCLS(metrics.cls);
    const fcp = this.calculateFCP(metrics.fcp);
    const ttfb = this.calculateTTFB(metrics.ttfb);

    // 计算总体分数
    const scores = [lcp.rating, fid.rating, cls.rating, fcp.rating, ttfb.rating];
    const goodCount = scores.filter(s => s === 'good').length;
    const needsImprovementCount = scores.filter(s => s === 'needs-improvement').length;
    const poorCount = scores.filter(s => s === 'poor').length;

    const score = (goodCount * 100 + needsImprovementCount * 50 + poorCount * 25) / scores.length;
    const grade = this.getGrade(score);
    const issues = poorCount + needsImprovementCount;

    return {
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      overall: {
        score,
        grade,
        issues,
      },
    };
  }

  /**
   * 计算LCP
   */
  private calculateLCP(value?: number): {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  } {
    if (!value) {
      return {
        value: 0,
        rating: 'poor',
        timestamp: Date.now(),
      };
    }

    const rating = this.getRating(value, this.thresholds.lcp);

    return {
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  /**
   * 计算FID
   */
  private calculateFID(value?: number): {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  } {
    if (!value) {
      return {
        value: 0,
        rating: 'poor',
        timestamp: Date.now(),
      };
    }

    const rating = this.getRating(value, this.thresholds.fid);

    return {
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  /**
   * 计算CLS
   */
  private calculateCLS(value?: number): {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  } {
    if (!value) {
      return {
        value: 0,
        rating: 'poor',
        timestamp: Date.now(),
      };
    }

    const rating = this.getRating(value, this.thresholds.cls);

    return {
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  /**
   * 计算FCP
   */
  private calculateFCP(value?: number): {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  } {
    if (!value) {
      return {
        value: 0,
        rating: 'poor',
        timestamp: Date.now(),
      };
    }

    const rating = this.getRating(value, this.thresholds.fcp);

    return {
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  /**
   * 计算TTFB
   */
  private calculateTTFB(value?: number): {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    timestamp: number;
  } {
    if (!value) {
      return {
        value: 0,
        rating: 'poor',
        timestamp: Date.now(),
      };
    }

    const rating = this.getRating(value, this.thresholds.ttfb);

    return {
      value,
      rating,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取评级
   */
  private getRating(
    value: number,
    thresholds: { good: number; needsImprovement: number }
  ): 'good' | 'needs-improvement' | 'poor' {
    if (value <= thresholds.good) {
      return 'good';
    } else if (value <= thresholds.needsImprovement) {
      return 'needs-improvement';
    } else {
      return 'poor';
    }
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取阈值配置
   */
  getThresholds(): WebVitalsThresholds {
    return { ...this.thresholds };
  }

  /**
   * 设置阈值配置
   */
  setThresholds(thresholds: Partial<WebVitalsThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 生成建议
   */
  generateRecommendations(results: WebVitalsResult): Array<{
    metric: string;
    rating: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      metric: string;
      rating: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // LCP建议
    if (results.lcp.rating !== 'good') {
      recommendations.push({
        metric: 'LCP',
        rating: results.lcp.rating,
        suggestion: this.getLCPSuggestion(results.lcp.value),
        priority: results.lcp.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // FID建议
    if (results.fid.rating !== 'good') {
      recommendations.push({
        metric: 'FID',
        rating: results.fid.rating,
        suggestion: this.getFIDSuggestion(results.fid.value),
        priority: results.fid.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // CLS建议
    if (results.cls.rating !== 'good') {
      recommendations.push({
        metric: 'CLS',
        rating: results.cls.rating,
        suggestion: this.getCLSSuggestion(results.cls.value),
        priority: results.cls.rating === 'poor' ? 'medium' : 'low',
      });
    }

    // FCP建议
    if (results.fcp.rating !== 'good') {
      recommendations.push({
        metric: 'FCP',
        rating: results.fcp.rating,
        suggestion: this.getFCPSuggestion(results.fcp.value),
        priority: results.fcp.rating === 'poor' ? 'medium' : 'low',
      });
    }

    // TTFB建议
    if (results.ttfb.rating !== 'good') {
      recommendations.push({
        metric: 'TTFB',
        rating: results.ttfb.rating,
        suggestion: this.getTTFBSuggestion(results.ttfb.value),
        priority: results.ttfb.rating === 'poor' ? 'high' : 'medium',
      });
    }

    return recommendations;
  }

  /**
   * 获取LCP建议
   */
  private getLCPSuggestion(value: number): string {
    if (value > 4000) {
      return 'LCP过慢，建议优化服务器响应时间、使用CDN、优化图片加载';
    } else if (value > 2500) {
      return 'LCP需要改进，建议优化关键资源加载、减少渲染阻塞';
    }
    return '';
  }

  /**
   * 获取FID建议
   */
  private getFIDSuggestion(value: number): string {
    if (value > 300) {
      return 'FID过高，建议减少JavaScript执行时间、优化主线程工作';
    } else if (value > 100) {
      return 'FID需要改进，建议优化交互响应性、分割JavaScript代码';
    }
    return '';
  }

  /**
   * 获取CLS建议
   */
  private getCLSSuggestion(value: number): string {
    if (value > 0.25) {
      return 'CLS过高，建议为图片和媒体设置尺寸属性、避免动态内容插入';
    } else if (value > 0.1) {
      return 'CLS需要改进，建议优化布局稳定性、预留空间';
    }
    return '';
  }

  /**
   * 获取FCP建议
   */
  private getFCPSuggestion(value: number): string {
    if (value > 3000) {
      return 'FCP过慢，建议优化服务器响应、减少关键资源大小';
    } else if (value > 1800) {
      return 'FCP需要改进，建议内联关键CSS、优化字体加载';
    }
    return '';
  }

  /**
   * 获取TTFB建议
   */
  private getTTFBSuggestion(value: number): string {
    if (value > 1800) {
      return 'TTFB过慢，建议优化服务器配置、使用CDN、启用HTTP/2';
    } else if (value > 800) {
      return 'TTFB需要改进，建议优化数据库查询、减少服务器处理时间';
    }
    return '';
  }

  /**
   * 导出数据
   */
  exportData(results: WebVitalsResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results,
        thresholds: this.thresholds,
        recommendations: this.generateRecommendations(results),
      },
      null,
      2
    );
  }

  /**
   * 清理数据
   */
  clearData(): void {
    this.metrics = [];
    this.clsEntries = [];
  }
}

export default CoreWebVitalsAnalyzer;
