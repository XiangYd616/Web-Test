/**
 * 高级性能分析器
 * 本地化程度：100%
 * 深度分析Core Web Vitals、资源加载、网络优化、缓存策略等
 */

import puppeteer, { Page } from 'puppeteer';

type PerformanceWindow = Window & {
  __lcp?: number;
  __fid?: number;
  __fcp?: number;
  __ttfb?: number;
  __clsEntries?: number[];
  __resourceEntries?: PerformanceResourceTiming[];
};

interface NetworkMetrics {
  requests: number;
  totalTransferTime: number;
  averageResponseTime: number;
  connectionType: string;
  effectiveBandwidth: number;
}

interface CacheMetrics {
  cacheHitRate: number;
  cacheableResources: number;
  optimizedCaching: boolean;
}

interface PerformanceThresholds {
  coreWebVitals: {
    lcp: { good: number; needsImprovement: number };
    fid: { good: number; needsImprovement: number };
    cls: { good: number; needsImprovement: number };
    fcp: { good: number; needsImprovement: number };
    ttfb: { good: number; needsImprovement: number };
  };
  resources: {
    totalSize: { good: number; warning: number };
    imageSize: { good: number; warning: number };
    jsSize: { good: number; warning: number };
    cssSize: { good: number; warning: number };
  };
  timing: {
    domContentLoaded: { good: number; warning: number };
    loadComplete: { good: number; warning: number };
    firstPaint: { good: number; warning: number };
  };
}

interface ResourceInfo {
  url: string;
  type: string;
  size: number;
  loadTime: number;
  cached: boolean;
  compressed: boolean;
  priority: 'high' | 'medium' | 'low';
  renderBlocking: boolean;
}

interface TimingMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

interface PerformanceScore {
  overall: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    coreWebVitals: number;
    resources: number;
    timing: number;
    network: number;
    caching: number;
  };
  details: {
    lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    fcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    ttfb: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  };
  resources: {
    totalSize: number;
    count: number;
    compressed: number;
    cached: number;
    renderBlocking: number;
    categories: Record<string, { size: number; count: number }>;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
  };
  network: {
    requests: number;
    totalTransferTime: number;
    averageResponseTime: number;
  };
  caching: {
    cacheHitRate: number;
    cacheableResources: number;
    optimizedCaching: boolean;
  };
}

interface PerformanceRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  savings?: {
    time: number;
    size: number;
  };
}

class PerformanceAnalyzer {
  private performanceThresholds: PerformanceThresholds;

  constructor() {
    this.performanceThresholds = {
      coreWebVitals: {
        lcp: { good: 2500, needsImprovement: 4000 },
        fid: { good: 100, needsImprovement: 300 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        fcp: { good: 1800, needsImprovement: 3000 },
        ttfb: { good: 800, needsImprovement: 1800 }
      },
      resources: {
        totalSize: { good: 1000000, warning: 3000000 }, // 1MB, 3MB
        imageSize: { good: 500000, warning: 1500000 },   // 500KB, 1.5MB
        jsSize: { good: 300000, warning: 1000000 },      // 300KB, 1MB
        cssSize: { good: 100000, warning: 300000 }       // 100KB, 300KB
      },
      timing: {
        domContentLoaded: { good: 1500, warning: 3000 },
        loadComplete: { good: 3000, warning: 6000 },
        firstPaint: { good: 1000, warning: 2000 }
      }
    };
  }

  /**
   * 运行完整的性能分析
   */
  async analyze(url: string, options: {
    timeout?: number;
    viewport?: { width: number; height: number };
    device?: 'desktop' | 'mobile';
    waitTime?: number;
    analyzeResources?: boolean;
    analyzeNetwork?: boolean;
    analyzeCaching?: boolean;
  } = {}): Promise<PerformanceScore> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      waitTime = 5000,
      analyzeResources = true,
      analyzeNetwork = true,
      analyzeCaching = true
    } = options;

    let browser;
    let page;

    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewport(viewport);

      // 设置用户代理
      const userAgent = device === 'mobile' 
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await page.setUserAgent(userAgent);

      // 开始性能监控
      const performanceData = await this.startPerformanceMonitoring(page);

      // 导航到页面
      const navigationStart = Date.now();
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 等待页面完全加载
      await page.waitFor(waitTime);

      // 收集性能数据
      const metrics = await this.collectPerformanceData(page, navigationStart, {
        analyzeResources,
        analyzeNetwork,
        analyzeCaching
      });

      // 计算性能分数
      const score = this.calculatePerformanceScore(metrics);

      return score;
    } catch (error) {
      throw new Error(`性能分析失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 开始性能监控
   */
  private async startPerformanceMonitoring(page: Page): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      const win = window as PerformanceWindow;
      // 监控Core Web Vitals
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        
        // LCP
        const lcpEntry = entries.find(entry => entry.entryType === 'largest-contentful-paint');
        if (lcpEntry) {
          win.__lcp = lcpEntry.startTime;
        }

        // FID
        entries.forEach((entry) => {
          if (entry.entryType === 'first-input') {
            win.__fid = entry.processingStart - entry.startTime;
          }
        });

        // CLS
        entries.forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
          if (!win.__clsEntries) {
            win.__clsEntries = [];
          }
          win.__clsEntries.push(entry.value);
        }
      }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

      // 监控时间指标
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        
        // FCP
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          win.__fcp = fcpEntry.startTime;
        }

        // TTFB
        const navEntry = entries.find(entry => entry.entryType === 'navigation');
        if (navEntry) {
          win.__ttfb = navEntry.responseStart - navEntry.requestStart;
        }
      }).observe({ entryTypes: ['paint', 'navigation'] });

      // 监控资源加载
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (!win.__resourceEntries) {
          win.__resourceEntries = [];
        }
        win.__resourceEntries.push(...(entries as PerformanceResourceTiming[]));
      }).observe({ entryTypes: ['resource'] });
    });
  }

  /**
   * 收集性能数据
   */
  private async collectPerformanceData(page: Page, navigationStart: number, options: {
    analyzeResources: boolean;
    analyzeNetwork: boolean;
    analyzeCaching: boolean;
  }): Promise<{
    timingMetrics: TimingMetrics;
    resources: ResourceInfo[];
    networkMetrics: NetworkMetrics | null;
    cacheMetrics: CacheMetrics | null;
  }> {
    const data = await page.evaluate(() => {
      const perfEntries = performance.getEntries();
      const win = window as PerformanceWindow;
      
      // 时间指标
      const navEntry = perfEntries.find(entry => entry.entryType === 'navigation');
      const timingMetrics = navEntry ? {
        navigationStart: navEntry.startTime,
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
        loadComplete: navEntry.loadEventEnd - navEntry.startTime,
        firstPaint: 0,
        firstContentfulPaint: win.__fcp || 0,
        largestContentfulPaint: win.__lcp || 0,
        firstInputDelay: win.__fid || 0,
        timeToInteractive: 0
      } : {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        timeToInteractive: 0
      };

      // 资源信息
      const resourceEntries = win.__resourceEntries || [];
      const resources = resourceEntries.map((entry: PerformanceResourceTiming) => ({
        url: entry.name,
        type: this.getResourceType(entry.name),
        size: entry.transferSize || 0,
        loadTime: entry.duration || 0,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
        compressed: entry.encodedBodySize < entry.decodedBodySize,
        priority: this.getResourcePriority(entry),
        renderBlocking: this.isRenderBlocking(entry)
      }));

      return {
        timingMetrics,
        resources,
        networkMetrics: null,
        cacheMetrics: null
      };
    });

    // 分析网络指标
    let networkMetrics: NetworkMetrics | null = null;
    if (options.analyzeNetwork) {
      networkMetrics = await this.analyzeNetworkMetrics(page);
    }

    // 分析缓存指标
    let cacheMetrics: CacheMetrics | null = null;
    if (options.analyzeCaching) {
      cacheMetrics = await this.analyzeCacheMetrics(data.resources);
    }

    return {
      timingMetrics: data.timingMetrics,
      resources: data.resources,
      networkMetrics,
      cacheMetrics
    };
  }

  /**
   * 分析网络指标
   */
  private async analyzeNetworkMetrics(page: Page): Promise<NetworkMetrics> {
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const requests = entries.length;
      const totalTransferTime = entries.reduce((sum, entry) => sum + entry.duration, 0);
      const averageResponseTime = totalTransferTime / requests;

      // 尝试获取网络信息
      const connection = (navigator as { connection?: { effectiveType?: string; downlink?: number } })
        .connection;
      
      return {
        requests,
        totalTransferTime,
        averageResponseTime,
        connectionType: connection ? connection.effectiveType : 'unknown',
        effectiveBandwidth: connection ? connection.downlink : 0
      };
    });

    return metrics;
  }

  /**
   * 分析缓存指标
   */
  private analyzeCacheMetrics(resources: ResourceInfo[]): {
    cacheHitRate: number;
    cacheableResources: number;
    optimizedCaching: boolean;
  } {
    const cacheableResources = resources.filter(resource => 
      this.isCacheableResource(resource.type, resource.url)
    );
    
    const cachedResources = cacheableResources.filter(resource => resource.cached);
    const cacheHitRate = cacheableResources.length > 0 
      ? (cachedResources.length / cacheableResources.length) * 100 
      : 0;

    // 检查缓存策略优化
    const optimizedCaching = this.isOptimizedCaching(resources);

    return {
      cacheHitRate,
      cacheableResources: cacheableResources.length,
      optimizedCaching
    };
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(data: {
    timingMetrics: TimingMetrics;
    resources: ResourceInfo[];
    networkMetrics: NetworkMetrics | null;
    cacheMetrics: CacheMetrics | null;
  }): PerformanceScore {
    // 计算Core Web Vitals分数
    const coreWebVitalsScore = this.calculateCoreWebVitalsScore(data.timingMetrics);

    // 计算资源分数
    const resourcesScore = this.calculateResourcesScore(data.resources);

    // 计算时间分数
    const timingScore = this.calculateTimingScore(data.timingMetrics);

    // 计算网络分数
    const networkScore = data.networkMetrics ? this.calculateNetworkScore(data.networkMetrics) : 50;

    // 计算缓存分数
    const cachingScore = data.cacheMetrics ? this.calculateCachingScore(data.cacheMetrics) : 50;

    // 计算总体分数
    const overall = (coreWebVitalsScore + resourcesScore + timingScore + networkScore + cachingScore) / 5;
    const grade = this.getGrade(overall);

    return {
      overall,
      grade,
      categories: {
        coreWebVitals: coreWebVitalsScore,
        resources: resourcesScore,
        timing: timingScore,
        network: networkScore,
        caching: cachingScore
      },
      details: {
        lcp: this.getRating(data.timingMetrics.largestContentfulPaint, 'lcp'),
        fid: this.getRating(data.timingMetrics.firstInputDelay, 'fid'),
        cls: this.getRating(0, 'cls'), // TODO: 实现CLS计算
        fcp: this.getRating(data.timingMetrics.firstContentfulPaint, 'fcp'),
        ttfb: this.getRating(data.timingMetrics.domContentLoaded, 'ttfb')
      },
      resources: this.getResourceSummary(data.resources),
      timing: {
        domContentLoaded: data.timingMetrics.domContentLoaded,
        loadComplete: data.timingMetrics.loadComplete,
        firstPaint: data.timingMetrics.firstPaint
      },
      network: data.networkMetrics || {
        requests: 0,
        totalTransferTime: 0,
        averageResponseTime: 0
      },
      caching: data.cacheMetrics || {
        cacheHitRate: 0,
        cacheableResources: 0,
        optimizedCaching: false
      }
    };
  }

  /**
   * 计算Core Web Vitals分数
   */
  private calculateCoreWebVitalsScore(timing: TimingMetrics): number {
    const lcpScore = this.getRating(timing.largestContentfulPaint, 'lcp');
    const fidScore = this.getRating(timing.firstInputDelay, 'fid');
    const clsScore = this.getRating(0, 'cls'); // TODO: 实现CLS计算
    const fcpScore = this.getRating(timing.firstContentfulPaint, 'fcp');
    const ttfbScore = this.getRating(timing.domContentLoaded, 'ttfb');

    const scores = [lcpScore, fidScore, clsScore, fcpScore, ttfbScore];
    return scores.reduce((sum, score) => sum + (score === 'good' ? 100 : score === 'needs-improvement' ? 50 : 25), 0) / scores.length;
  }

  /**
   * 计算资源分数
   */
  private calculateResourcesScore(resources: ResourceInfo[]): number {
    const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
    const thresholds = this.performanceThresholds.resources;

    let score = 100;

    // 总大小评分
    if (totalSize > thresholds.totalSize.warning) {
      score -= 30;
    } else if (totalSize > thresholds.totalSize.good) {
      score -= 15;
    }

    // 图片大小评分
    const imageResources = resources.filter(r => r.type === 'image');
    const imageSize = imageResources.reduce((sum, r) => sum + r.size, 0);
    if (imageSize > thresholds.imageSize.warning) {
      score -= 20;
    } else if (imageSize > thresholds.imageSize.good) {
      score -= 10;
    }

    // JavaScript大小评分
    const jsResources = resources.filter(r => r.type === 'script');
    const jsSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    if (jsSize > thresholds.jsSize.warning) {
      score -= 20;
    } else if (jsSize > thresholds.jsSize.good) {
      score -= 10;
    }

    // CSS大小评分
    const cssResources = resources.filter(r => r.type === 'stylesheet');
    const cssSize = cssResources.reduce((sum, r) => sum + r.size, 0);
    if (cssSize > thresholds.cssSize.warning) {
      score -= 15;
    } else if (cssSize > thresholds.cssSize.good) {
      score -= 8;
    }

    // 渲染阻塞资源评分
    const renderBlockingCount = resources.filter(r => r.renderBlocking).length;
    if (renderBlockingCount > 10) {
      score -= 25;
    } else if (renderBlockingCount > 5) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 计算时间分数
   */
  private calculateTimingScore(timing: TimingMetrics): number {
    const thresholds = this.performanceThresholds.timing;
    let score = 100;

    // DOM内容加载时间
    if (timing.domContentLoaded > thresholds.domContentLoaded.warning) {
      score -= 30;
    } else if (timing.domContentLoaded > thresholds.domContentLoaded.good) {
      score -= 15;
    }

    // 完全加载时间
    if (timing.loadComplete > thresholds.loadComplete.warning) {
      score -= 25;
    } else if (timing.loadComplete > thresholds.loadComplete.good) {
      score -= 12;
    }

    // 首次绘制时间
    if (timing.firstPaint > thresholds.firstPaint.warning) {
      score -= 20;
    } else if (timing.firstPaint > thresholds.firstPaint.good) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 计算网络分数
   */
  private calculateNetworkScore(network: {
    requests: number;
    totalTransferTime: number;
    averageResponseTime: number;
  }): number {
    let score = 100;

    // 请求数量
    if (network.requests > 100) {
      score -= 20;
    } else if (network.requests > 50) {
      score -= 10;
    }

    // 平均响应时间
    if (network.averageResponseTime > 1000) {
      score -= 25;
    } else if (network.averageResponseTime > 500) {
      score -= 12;
    }

    // 总传输时间
    if (network.totalTransferTime > 10000) {
      score -= 20;
    } else if (network.totalTransferTime > 5000) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 计算缓存分数
   */
  private calculateCachingScore(cache: {
    cacheHitRate: number;
    cacheableResources: number;
    optimizedCaching: boolean;
  }): number {
    let score = 100;

    // 缓存命中率
    if (cache.cacheHitRate < 50) {
      score -= 30;
    } else if (cache.cacheHitRate < 80) {
      score -= 15;
    }

    // 缓存策略优化
    if (!cache.optimizedCaching) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * 获取评级
   */
  private getRating(value: number, metric: string): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = this.performanceThresholds.coreWebVitals[metric as keyof typeof this.performanceThresholds.coreWebVitals];
    
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
  private getGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取资源摘要
   */
  private getResourceSummary(resources: ResourceInfo[]): {
    const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
    const count = resources.length;
    const compressed = resources.filter(r => r.compressed).length;
    const cached = resources.filter(r => r.cached).length;
    const renderBlocking = resources.filter(r => r.renderBlocking).length;

    const categories: Record<string, { size: number; count: number }> = {};
    
    resources.forEach(resource => {
      if (!categories[resource.type]) {
        categories[resource.type] = { size: 0, count: 0 };
      }
      categories[resource.type].size += resource.size;
      categories[resource.type].count += 1;
    });

    return {
      totalSize,
      count,
      compressed,
      cached,
      renderBlocking,
      categories
    };
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (extension) {
      const typeMap: Record<string, string> = {
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'svg': 'image',
        'webp': 'image',
        'css': 'stylesheet',
        'js': 'script',
        'html': 'document',
        'json': 'data',
        'xml': 'data',
        'txt': 'data',
        'woff': 'font',
        'woff2': 'font',
        'ttf': 'font',
        'eot': 'font'
      };
      
      return typeMap[extension] || 'other';
    }
    
    return 'other';
  }

  /**
   * 获取资源优先级
   */
  private getResourcePriority(entry: PerformanceResourceTiming): 'high' | 'medium' | 'low' {
    // 根据资源类型和加载时间判断优先级
    const type = this.getResourceType(entry.name);
    const loadTime = entry.duration || 0;

    if (type === 'script' || type === 'stylesheet') {
      return loadTime > 100 ? 'low' : 'high';
    } else if (type === 'image') {
      return loadTime > 500 ? 'low' : 'medium';
    }
    
    return 'low';
  }

  /**
   * 判断是否为渲染阻塞资源
   */
  private isRenderBlocking(entry: PerformanceResourceTiming): boolean {
    const type = this.getResourceType(entry.name);
    return type === 'script' || type === 'stylesheet';
  }

  /**
   * 判断是否可缓存资源
   */
  private isCacheableResource(type: string, url: string): boolean {
    // 静态资源通常可以缓存
    const cacheableTypes = ['image', 'stylesheet', 'script', 'font', 'data'];
    return cacheableTypes.includes(type) && !url.includes('nocache');
  }

  /**
   * 判断缓存策略是否优化
   */
  private isOptimizedCaching(resources: ResourceInfo[]): boolean {
    // 检查是否有适当的缓存头
    // 这里简化实现，实际应该检查HTTP头
    const cacheableResources = resources.filter(r => this.isCacheableResource(r.type, r.url));
    const cachedResources = cacheableResources.filter(r => r.cached);
    
    return cachedResources.length / cacheableResources.length > 0.8;
  }

  /**
   * 生成性能建议
   */
  generateRecommendations(score: PerformanceScore): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Core Web Vitals建议
    if (score.details.lcp.rating !== 'good') {
      recommendations.push({
        category: 'core-web-vitals',
        priority: 'high',
        title: '优化Largest Contentful Paint',
        description: `LCP为${score.details.lcp.value}ms，建议优化服务器响应时间、使用CDN、优化图片加载`,
        impact: 100 - this.getScoreFromRating(score.details.lcp.rating),
        effort: 'medium',
        savings: {
          time: score.details.lcp.value - 2500,
          size: 0
        }
      });
    }

    if (score.details.fid.rating !== 'good') {
      recommendations.push({
        category: 'core-web-vitals',
        priority: 'high',
        title: '优化First Input Delay',
        description: `FID为${score.details.fid.value}ms，建议减少JavaScript执行时间、优化主线程工作`,
        impact: 100 - this.getScoreFromRating(score.details.fid.rating),
        effort: 'medium',
        savings: {
          time: score.details.fid.value - 100,
          size: 0
        }
      });
    }

    // 资源优化建议
    if (score.resources.totalSize > this.performanceThresholds.resources.totalSize.warning) {
      recommendations.push({
        category: 'resources',
        priority: 'medium',
        title: '减少页面资源大小',
        description: `页面总大小为${(score.resources.totalSize / 1024 / 1024).toFixed(2)}MB，建议压缩图片、合并CSS/JS文件`,
        impact: 20,
        effort: 'medium',
        savings: {
          time: 0,
          size: score.resources.totalSize - this.performanceThresholds.resources.totalSize.good
        }
      });
    }

    // 缓存优化建议
    if (score.caching.cacheHitRate < 80) {
      recommendations.push({
        category: 'caching',
        priority: 'medium',
        title: '优化缓存策略',
        description: `缓存命中率为${score.caching.cacheHitRate.toFixed(1)}%，建议设置适当的缓存头`,
        impact: 15,
        effort: 'low',
        savings: {
          time: 0,
          size: 0
        }
      });
    }

    return recommendations;
  }

  /**
   * 从评级获取分数
   */
  private getScoreFromRating(rating: 'good' | 'needs-improvement' | 'poor'): number {
    switch (rating) {
      case 'good': return 100;
      case 'needs-improvement': return 50;
      case 'poor': return 25;
    }
  }

  /**
   * 获取阈值配置
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.performanceThresholds };
  }

  /**
   * 设置阈值配置
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
  }

  /**
   * 导出分析报告
   */
  exportReport(score: PerformanceScore): string {
    const recommendations = this.generateRecommendations(score);
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      score,
      recommendations,
      thresholds: this.performanceThresholds
    }, null, 2);
  }
}

export default PerformanceAnalyzer;
