/**
 * 资源加载分析器
 * 本地化程度：100%
 * 分析页面资源加载性能、优化建议等
 */

import puppeteer from 'puppeteer';

interface ResourceTypes {
  document: string[];
  script: string[];
  stylesheet: string[];
  image: string[];
  font: string[];
  media: string[];
  xhr: string[];
  other: string[];
}

interface ResourceThresholds {
  resourceSize: {
    image: number;
    script: number;
    stylesheet: number;
    font: number;
  };
  loadTime: {
    critical: number;
    important: number;
    normal: number;
  };
  compression: {
    minimum: number;
    good: number;
  };
}

interface ResourceInfo {
  url: string;
  type: string;
  size: number;
  compressedSize: number;
  loadTime: number;
  startTime: number;
  endTime: number;
  cached: boolean;
  renderBlocking: boolean;
  priority: 'high' | 'medium' | 'low';
  responseCode: number;
  mimeType: string;
  headers: Record<string, string>;
}

interface ResourceAnalysisResult {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalResources: number;
    totalSize: number;
    compressedSize: number;
    totalLoadTime: number;
  };
  categories: {
    document: ResourceCategoryResult;
    script: ResourceCategoryResult;
    stylesheet: ResourceCategoryResult;
    image: ResourceCategoryResult;
    font: ResourceCategoryResult;
    media: ResourceCategoryResult;
    xhr: ResourceCategoryResult;
    other: ResourceCategoryResult;
  };
  issues: ResourceIssue[];
  recommendations: ResourceRecommendation[];
  optimization: {
    compression: CompressionAnalysis;
    caching: CachingAnalysis;
    bundling: BundlingAnalysis;
  };
}

interface ResourceCategoryResult {
  count: number;
  size: number;
  compressedSize: number;
  averageLoadTime: number;
  score: number;
  issues: string[];
}

interface ResourceIssue {
  type: 'size' | 'load-time' | 'compression' | 'caching' | 'render-blocking';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resource: ResourceInfo;
  description: string;
  impact: number;
}

interface ResourceRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  resources: string[];
  savings: {
    size: number;
    time: number;
  };
  effort: 'low' | 'medium' | 'high';
}

interface CompressionAnalysis {
  compressionRatio: number;
  uncompressedResources: ResourceInfo[];
  potentialSavings: number;
  recommendations: string[];
}

interface CachingAnalysis {
  cacheHitRate: number;
  cacheableResources: ResourceInfo[];
  nonCacheableResources: ResourceInfo[];
  recommendations: string[];
}

interface BundlingAnalysis {
  scriptCount: number;
  stylesheetCount: number;
  bundlingOpportunities: BundlingOpportunity[];
  recommendations: string[];
}

interface BundlingOpportunity {
  type: 'scripts' | 'stylesheets';
  resources: string[];
  potentialSavings: number;
}

class ResourceAnalyzer {
  private resourceTypes: ResourceTypes;
  private thresholds: ResourceThresholds;

  constructor() {
    // 资源类型分类
    this.resourceTypes = {
      document: ['document'],
      script: ['script'],
      stylesheet: ['stylesheet'],
      image: ['image'],
      font: ['font'],
      media: ['media'],
      xhr: ['xhr', 'fetch'],
      other: ['other'],
    };

    // 性能阈值
    this.thresholds = {
      resourceSize: {
        image: 500 * 1024, // 500KB
        script: 200 * 1024, // 200KB
        stylesheet: 100 * 1024, // 100KB
        font: 100 * 1024, // 100KB
      },
      loadTime: {
        critical: 1000, // 1秒
        important: 2000, // 2秒
        normal: 3000, // 3秒
      },
      compression: {
        minimum: 0.7, // 至少30%压缩
        good: 0.5, // 50%压缩为良好
      },
    };
  }

  /**
   * 分析页面资源
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      waitTime?: number;
      analyzeHeaders?: boolean;
    } = {}
  ): Promise<ResourceAnalysisResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      waitTime = 5000,
      analyzeHeaders = true,
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

      // 开始资源监控
      const resourceData = await this.startResourceMonitoring(page, analyzeHeaders);

      // 导航到页面
      const navigationStart = Date.now();
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 等待页面完全加载
      await page.waitFor(waitTime);

      // 收集资源数据
      const resources = await this.collectResourceData(page, navigationStart);

      // 分析资源
      const analysis = this.analyzeResources(resources);

      return analysis;
    } catch (error) {
      throw new Error(`资源分析失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 开始资源监控
   */
  private async startResourceMonitoring(page: any, analyzeHeaders: boolean): Promise<void> {
    await page.evaluateOnNewDocument(() => {
      if (!(window as any).__resourceEntries) {
        (window as any).__resourceEntries = [];
      }

      // 监控资源加载
      new PerformanceObserver(entryList => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceData = {
              name: entry.name,
              type: this.getResourceType(entry.name),
              startTime: entry.startTime,
              duration: entry.duration,
              transferSize: entry.transferSize || 0,
              encodedBodySize: entry.encodedBodySize || 0,
              decodedBodySize: entry.decodedBodySize || 0,
              responseStart: entry.responseStart || 0,
              responseEnd: entry.responseEnd || 0,
              initiatorType: entry.initiatorType || 'other',
            };

            (window as any).__resourceEntries.push(resourceData);
          }
        });
      }).observe({ entryTypes: ['resource'] });

      // 获取资源类型
      (window as any).__getResourceType = function (url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();

        if (extension) {
          const typeMap: Record<string, string> = {
            jpg: 'image',
            jpeg: 'image',
            png: 'image',
            gif: 'image',
            svg: 'image',
            webp: 'image',
            css: 'stylesheet',
            js: 'script',
            html: 'document',
            json: 'xhr',
            xml: 'xhr',
            txt: 'xhr',
            woff: 'font',
            woff2: 'font',
            ttf: 'font',
            eot: 'font',
            mp4: 'media',
            webm: 'media',
            mp3: 'media',
            wav: 'media',
          };

          return typeMap[extension] || 'other';
        }

        return 'other';
      };
    });
  }

  /**
   * 收集资源数据
   */
  private async collectResourceData(page: any, navigationStart: number): Promise<ResourceInfo[]> {
    const data = await page.evaluate(() => {
      const entries = (window as any).__resourceEntries || [];

      return entries.map((entry: any) => ({
        url: entry.name,
        type: entry.type,
        size: entry.decodedBodySize,
        compressedSize: entry.encodedBodySize,
        loadTime: entry.duration,
        startTime: entry.startTime,
        endTime: entry.startTime + entry.duration,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
        renderBlocking: this.isRenderBlocking(entry.type, entry.initiatorType),
        priority: this.getResourcePriority(entry.type, entry.duration),
        responseCode: 200, // 默认值，实际需要通过其他方式获取
        mimeType: this.getMimeType(entry.name),
        headers: {}, // 简化实现
      }));
    });

    return data;
  }

  /**
   * 分析资源
   */
  private analyzeResources(resources: ResourceInfo[]): ResourceAnalysisResult {
    // 计算总体指标
    const overall = this.calculateOverallMetrics(resources);

    // 分类分析
    const categories = this.analyzeCategories(resources);

    // 问题分析
    const issues = this.analyzeIssues(resources);

    // 生成建议
    const recommendations = this.generateRecommendations(resources, issues);

    // 优化分析
    const optimization = this.analyzeOptimization(resources);

    return {
      overall,
      categories,
      issues,
      recommendations,
      optimization,
    };
  }

  /**
   * 计算总体指标
   */
  private calculateOverallMetrics(resources: ResourceInfo[]): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalResources: number;
    totalSize: number;
    compressedSize: number;
    totalLoadTime: number;
  } {
    const totalResources = resources.length;
    const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);
    const compressedSize = resources.reduce((sum, resource) => sum + resource.compressedSize, 0);
    const totalLoadTime =
      Math.max(...resources.map(r => r.endTime)) - Math.min(...resources.map(r => r.startTime));

    // 计算分数
    let score = 100;

    // 资源数量评分
    if (totalResources > 100) {
      score -= 20;
    } else if (totalResources > 50) {
      score -= 10;
    }

    // 总大小评分
    if (totalSize > 5 * 1024 * 1024) {
      // 5MB
      score -= 30;
    } else if (totalSize > 3 * 1024 * 1024) {
      // 3MB
      score -= 15;
    }

    // 加载时间评分
    if (totalLoadTime > 10000) {
      // 10秒
      score -= 25;
    } else if (totalLoadTime > 5000) {
      // 5秒
      score -= 12;
    }

    // 压缩率评分
    const compressionRatio = compressedSize / totalSize;
    if (compressionRatio > 0.8) {
      score -= 15;
    } else if (compressionRatio > 0.6) {
      score -= 8;
    }

    score = Math.max(0, score);
    const grade = this.getGrade(score);

    return {
      score,
      grade,
      totalResources,
      totalSize,
      compressedSize,
      totalLoadTime,
    };
  }

  /**
   * 分类分析
   */
  private analyzeCategories(resources: ResourceInfo[]): {
    document: ResourceCategoryResult;
    script: ResourceCategoryResult;
    stylesheet: ResourceCategoryResult;
    image: ResourceCategoryResult;
    font: ResourceCategoryResult;
    media: ResourceCategoryResult;
    xhr: ResourceCategoryResult;
    other: ResourceCategoryResult;
  } {
    const categories: any = {};

    // 初始化分类
    Object.keys(this.resourceTypes).forEach(type => {
      categories[type] = {
        count: 0,
        size: 0,
        compressedSize: 0,
        averageLoadTime: 0,
        score: 100,
        issues: [],
      };
    });

    // 分类统计
    resources.forEach(resource => {
      const category = resource.type;
      if (categories[category]) {
        categories[category].count++;
        categories[category].size += resource.size;
        categories[category].compressedSize += resource.compressedSize;
      }
    });

    // 计算平均加载时间和分数
    Object.keys(categories).forEach(type => {
      const categoryResources = resources.filter(r => r.type === type);
      const category = categories[type];

      if (categoryResources.length > 0) {
        category.averageLoadTime =
          categoryResources.reduce((sum: number, r: ResourceInfo) => sum + r.loadTime, 0) /
          categoryResources.length;

        // 计算分类分数
        let score = 100;
        const threshold =
          this.thresholds.resourceSize[type as keyof typeof this.thresholds.resourceSize];

        if (threshold && category.size > threshold * 2) {
          score -= 30;
          category.issues.push(`${type}资源总大小过大`);
        } else if (threshold && category.size > threshold) {
          score -= 15;
          category.issues.push(`${type}资源大小需要优化`);
        }

        category.score = Math.max(0, score);
      }
    });

    return categories;
  }

  /**
   * 问题分析
   */
  private analyzeIssues(resources: ResourceInfo[]): ResourceIssue[] {
    const issues: ResourceIssue[] = [];

    resources.forEach(resource => {
      // 大小问题
      const sizeThreshold =
        this.thresholds.resourceSize[resource.type as keyof typeof this.thresholds.resourceSize];
      if (sizeThreshold && resource.size > sizeThreshold) {
        issues.push({
          type: 'size',
          severity: resource.size > sizeThreshold * 2 ? 'critical' : 'high',
          resource,
          description: `${resource.type}资源过大: ${(resource.size / 1024).toFixed(2)}KB`,
          impact: Math.min(50, ((resource.size - sizeThreshold) / sizeThreshold) * 20),
        });
      }

      // 加载时间问题
      let loadTimeThreshold = this.thresholds.loadTime.normal;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (this.isCriticalResource(resource)) {
        loadTimeThreshold = this.thresholds.loadTime.critical;
        severity = resource.loadTime > loadTimeThreshold * 2 ? 'critical' : 'high';
      } else if (this.isImportantResource(resource)) {
        loadTimeThreshold = this.thresholds.loadTime.important;
        severity = resource.loadTime > loadTimeThreshold * 2 ? 'high' : 'medium';
      }

      if (resource.loadTime > loadTimeThreshold) {
        issues.push({
          type: 'load-time',
          severity,
          resource,
          description: `${resource.type}资源加载时间过长: ${resource.loadTime.toFixed(0)}ms`,
          impact: Math.min(30, ((resource.loadTime - loadTimeThreshold) / loadTimeThreshold) * 15),
        });
      }

      // 压缩问题
      if (resource.size > 0 && resource.compressedSize > 0) {
        const compressionRatio = resource.compressedSize / resource.size;
        if (compressionRatio > this.thresholds.compression.minimum) {
          issues.push({
            type: 'compression',
            severity: compressionRatio > 0.9 ? 'medium' : 'low',
            resource,
            description: `${resource.type}资源压缩不足: ${(compressionRatio * 100).toFixed(1)}%`,
            impact: Math.min(20, (compressionRatio - this.thresholds.compression.good) * 50),
          });
        }
      }

      // 缓存问题
      if (this.shouldBeCached(resource) && !resource.cached) {
        issues.push({
          type: 'caching',
          severity: 'medium',
          resource,
          description: `${resource.type}资源未缓存`,
          impact: 15,
        });
      }

      // 渲染阻塞问题
      if (resource.renderBlocking) {
        issues.push({
          type: 'render-blocking',
          severity: 'high',
          resource,
          description: `${resource.type}资源阻塞渲染`,
          impact: 25,
        });
      }
    });

    return issues;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    resources: ResourceInfo[],
    issues: ResourceIssue[]
  ): ResourceRecommendation[] {
    const recommendations: ResourceRecommendation[] = [];

    // 图片优化建议
    const imageIssues = issues.filter(i => i.resource.type === 'image' && i.type === 'size');
    if (imageIssues.length > 0) {
      const totalSavings = imageIssues.reduce((sum, issue) => sum + issue.resource.size * 0.5, 0);
      recommendations.push({
        category: 'images',
        priority: 'high',
        title: '优化图片资源',
        description: '压缩图片、使用现代格式、实现懒加载',
        resources: imageIssues.map(i => i.resource.url),
        savings: {
          size: totalSavings,
          time: (totalSavings / (1024 * 1024)) * 1000, // 简化计算
        },
        effort: 'medium',
      });
    }

    // JavaScript优化建议
    const scriptIssues = issues.filter(i => i.resource.type === 'script');
    if (scriptIssues.length > 0) {
      const totalSavings = scriptIssues.reduce((sum, issue) => sum + issue.resource.size * 0.3, 0);
      recommendations.push({
        category: 'scripts',
        priority: 'high',
        title: '优化JavaScript资源',
        description: '压缩代码、移除未使用代码、实现代码分割',
        resources: scriptIssues.map(i => i.resource.url),
        savings: {
          size: totalSavings,
          time: (totalSavings / (1024 * 1024)) * 500,
        },
        effort: 'high',
      });
    }

    // CSS优化建议
    const cssIssues = issues.filter(i => i.resource.type === 'stylesheet');
    if (cssIssues.length > 0) {
      const totalSavings = cssIssues.reduce((sum, issue) => sum + issue.resource.size * 0.4, 0);
      recommendations.push({
        category: 'stylesheets',
        priority: 'medium',
        title: '优化CSS资源',
        description: '压缩CSS、移除未使用样式、关键CSS内联',
        resources: cssIssues.map(i => i.resource.url),
        savings: {
          size: totalSavings,
          time: (totalSavings / (1024 * 1024)) * 300,
        },
        effort: 'medium',
      });
    }

    // 缓存优化建议
    const cacheIssues = issues.filter(i => i.type === 'caching');
    if (cacheIssues.length > 0) {
      recommendations.push({
        category: 'caching',
        priority: 'medium',
        title: '优化缓存策略',
        description: '设置适当的缓存头、实现浏览器缓存',
        resources: cacheIssues.map(i => i.resource.url),
        savings: {
          size: 0,
          time: cacheIssues.length * 200,
        },
        effort: 'low',
      });
    }

    // 渲染阻塞优化建议
    const blockingIssues = issues.filter(i => i.type === 'render-blocking');
    if (blockingIssues.length > 0) {
      recommendations.push({
        category: 'render-blocking',
        priority: 'high',
        title: '消除渲染阻塞',
        description: '异步加载非关键资源、内联关键CSS',
        resources: blockingIssues.map(i => i.resource.url),
        savings: {
          size: 0,
          time: blockingIssues.length * 300,
        },
        effort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * 优化分析
   */
  private analyzeOptimization(resources: ResourceInfo[]): {
    compression: CompressionAnalysis;
    caching: CachingAnalysis;
    bundling: BundlingAnalysis;
  } {
    return {
      compression: this.analyzeCompression(resources),
      caching: this.analyzeCaching(resources),
      bundling: this.analyzeBundling(resources),
    };
  }

  /**
   * 压缩分析
   */
  private analyzeCompression(resources: ResourceInfo[]): CompressionAnalysis {
    const compressibleResources = resources.filter(r =>
      ['script', 'stylesheet', 'html', 'json', 'xml'].includes(r.type)
    );

    const uncompressedResources = compressibleResources.filter(
      r =>
        r.size > 0 &&
        r.compressedSize > 0 &&
        r.compressedSize / r.size > this.thresholds.compression.minimum
    );

    const totalSize = compressibleResources.reduce((sum, r) => sum + r.size, 0);
    const compressedSize = compressibleResources.reduce((sum, r) => sum + r.compressedSize, 0);
    const compressionRatio = totalSize > 0 ? compressedSize / totalSize : 1;

    const potentialSavings = uncompressedResources.reduce(
      (sum, r) => sum + (r.size - r.size * this.thresholds.compression.good),
      0
    );

    const recommendations: string[] = [];
    if (compressionRatio > this.thresholds.compression.minimum) {
      recommendations.push('启用Gzip或Brotli压缩');
    }
    if (uncompressedResources.length > 0) {
      recommendations.push('优化压缩配置');
    }

    return {
      compressionRatio,
      uncompressedResources,
      potentialSavings,
      recommendations,
    };
  }

  /**
   * 缓存分析
   */
  private analyzeCaching(resources: ResourceInfo[]): CachingAnalysis {
    const cacheableResources = resources.filter(r => this.shouldBeCached(r));
    const cachedResources = cacheableResources.filter(r => r.cached);
    const nonCacheableResources = cacheableResources.filter(r => !r.cached);

    const cacheHitRate =
      cacheableResources.length > 0
        ? (cachedResources.length / cacheableResources.length) * 100
        : 0;

    const recommendations: string[] = [];
    if (cacheHitRate < 80) {
      recommendations.push('设置适当的缓存头');
      recommendations.push('实现浏览器缓存策略');
    }

    return {
      cacheHitRate,
      cacheableResources,
      nonCacheableResources,
      recommendations,
    };
  }

  /**
   * 打包分析
   */
  private analyzeBundling(resources: ResourceInfo[]): BundlingAnalysis {
    const scripts = resources.filter(r => r.type === 'script');
    const stylesheets = resources.filter(r => r.type === 'stylesheet');

    const bundlingOpportunities: BundlingOpportunity[] = [];

    // 分析JavaScript打包机会
    if (scripts.length > 5) {
      const smallScripts = scripts.filter(s => s.size < 50 * 1024); // 小于50KB
      if (smallScripts.length > 3) {
        bundlingOpportunities.push({
          type: 'scripts',
          resources: smallScripts.map(s => s.url),
          potentialSavings: smallScripts.reduce((sum, s) => sum + s.size * 0.2, 0),
        });
      }
    }

    // 分析CSS打包机会
    if (stylesheets.length > 3) {
      const smallStylesheets = stylesheets.filter(s => s.size < 30 * 1024); // 小于30KB
      if (smallStylesheets.length > 2) {
        bundlingOpportunities.push({
          type: 'stylesheets',
          resources: smallStylesheets.map(s => s.url),
          potentialSavings: smallStylesheets.reduce((sum, s) => sum + s.size * 0.15, 0),
        });
      }
    }

    const recommendations: string[] = [];
    if (scripts.length > 5) {
      recommendations.push('考虑合并JavaScript文件');
    }
    if (stylesheets.length > 3) {
      recommendations.push('考虑合并CSS文件');
    }

    return {
      scriptCount: scripts.length,
      stylesheetCount: stylesheets.length,
      bundlingOpportunities,
      recommendations,
    };
  }

  /**
   * 判断是否为关键资源
   */
  private isCriticalResource(resource: ResourceInfo): boolean {
    return (
      resource.type === 'document' ||
      (resource.type === 'stylesheet' && resource.renderBlocking) ||
      (resource.type === 'script' && resource.renderBlocking)
    );
  }

  /**
   * 判断是否为重要资源
   */
  private isImportantResource(resource: ResourceInfo): boolean {
    return (
      resource.type === 'image' || resource.type === 'script' || resource.type === 'stylesheet'
    );
  }

  /**
   * 判断是否应该缓存
   */
  private shouldBeCached(resource: ResourceInfo): boolean {
    return ['script', 'stylesheet', 'image', 'font', 'media'].includes(resource.type);
  }

  /**
   * 判断是否为渲染阻塞
   */
  private isRenderBlocking(type: string, initiatorType: string): boolean {
    return type === 'stylesheet' || (type === 'script' && initiatorType === 'parser');
  }

  /**
   * 获取资源优先级
   */
  private getResourcePriority(type: string, loadTime: number): 'high' | 'medium' | 'low' {
    if (type === 'document' || type === 'stylesheet') {
      return 'high';
    } else if (type === 'script' || type === 'image') {
      return loadTime > 1000 ? 'low' : 'medium';
    }
    return 'low';
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();

    const mimeMap: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      eot: 'application/vnd.ms-fontobject',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    return mimeMap[extension || ''] || 'application/octet-stream';
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
  getThresholds(): ResourceThresholds {
    return { ...this.thresholds };
  }

  /**
   * 设置阈值配置
   */
  setThresholds(thresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: ResourceAnalysisResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        thresholds: this.thresholds,
      },
      null,
      2
    );
  }
}

export default ResourceAnalyzer;
