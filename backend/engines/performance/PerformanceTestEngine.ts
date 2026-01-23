const PerformanceMetricsService = require('../shared/services/PerformanceMetricsService');
const HTMLParsingService = require('../shared/services/HTMLParsingService');
const Joi = require('joi');

type PerformanceConfig = {
  testId?: string;
  url?: string;
  iterations?: number;
  includeResources?: boolean;
  fetchHtml?: boolean;
  verbose?: boolean;
};

type CheerioSelection = {
  each: (callback: (index: number, el: unknown) => void) => void;
  length?: number;
  attr?: (name: string) => string | undefined;
  text?: () => string;
  first?: () => { text: () => string };
};

type CheerioAPI = ((selector: string | unknown) => CheerioSelection) & {
  (el: unknown): CheerioSelection;
};

type PerformanceMetrics = {
  url: string;
  timestamp: string;
  basicTiming: {
    iterations: number;
    totalTime: { avg: number; min: number; max: number };
    dnsTime: { avg: number; min: number; max: number };
    connectionTime: { avg: number; min: number; max: number };
    ttfb: { avg: number; min: number; max: number };
    downloadTime: { avg: number; min: number; max: number };
    contentLength: { avg: number; min: number; max: number };
    rawResults?: Array<{ content?: string }>;
  };
  performanceScore: { score: number; grade: string };
  coreWebVitals: {
    lcp: { value: number; rating: string };
    fcp: { value: number; rating: string };
    cls: { value: number; rating: string };
    ttfb: { value: number; rating: string };
  };
};

type PerformanceResults = {
  url: string;
  timestamp: string;
  iterations: number;
  summary: {
    score: number;
    grade: string;
    averageLoadTime: string;
    fastestLoadTime: string;
    slowestLoadTime: string;
  };
  metrics: {
    dns: { average: string; min: string; max: string };
    connection: { average: string; min: string; max: string };
    ttfb: { average: string; min: string; max: string; rating: string };
    download: { average: string; min: string; max: string };
    contentSize: { average: string; min: string; max: string };
  };
  webVitals: {
    lcp: { value: number; rating: string };
    fcp: { value: number; rating: string };
    cls: { value: number; rating: string };
    ttfb: { value: number; rating: string };
  };
  resources?: { resources: Record<string, unknown>; counts: { total: number } };
  contentAnalysis?: Record<string, unknown>;
  recommendations?: Array<Record<string, unknown>>;
};

class PerformanceTestEngine {
  name: string;
  version: string;
  description: string;
  options: { timeout: number | string; userAgent: string };
  metricsService: Record<string, unknown>;
  htmlService: Record<string, unknown>;
  initialized: boolean;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor() {
    this.name = 'performance';
    this.version = '3.0.0';
    this.description = '性能测试引擎 (使用共享服务)';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Performance-Test/3.0.0',
    };

    this.metricsService = new PerformanceMetricsService();
    this.htmlService = new HTMLParsingService();
    this.initialized = false;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  validateConfig(config: PerformanceConfig) {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      iterations: Joi.number().min(1).max(10).default(3),
      includeResources: Joi.boolean().default(true),
      fetchHtml: Joi.boolean().default(true),
      verbose: Joi.boolean().default(false),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as PerformanceConfig;
  }

  async initialize() {
    if (this.initialized) {
      return true;
    }

    await (this.metricsService as { initialize: () => Promise<void> }).initialize();
    await (this.htmlService as { initialize: () => Promise<void> }).initialize();

    this.initialized = true;
    return true;
  }

  async checkAvailability() {
    await this.initialize();

    return {
      engine: this.name,
      available: this.initialized,
      version: this.version,
      features: [
        'page-load-timing',
        'dns-performance',
        'ttfb-measurement',
        'resource-analysis',
        'performance-scoring',
        'core-web-vitals-simulation',
      ],
      services: {
        metrics: (this.metricsService as { checkAvailability: () => unknown }).checkAvailability(),
        html: (this.htmlService as { checkAvailability: () => unknown }).checkAvailability(),
      },
    };
  }

  async executeTest(config: PerformanceConfig) {
    const testId = config.testId || `performance-${Date.now()}`;
    try {
      await this.initialize();

      this.updateTestProgress(testId, 5, '初始化性能测试');

      const validatedConfig = this.validateConfig(config);
      const {
        url,
        iterations = 3,
        includeResources = true,
        fetchHtml = true,
        verbose = false,
      } = validatedConfig as PerformanceConfig & { url: string };

      if (verbose) {
        console.debug(`[PerformanceTestEngine] 测试中: ${url}`);
      }

      const metricsOptions = {
        iterations,
        userAgent: this.options.userAgent,
        timeout: this.options.timeout,
        includeContent: fetchHtml,
        cacheControl: 'no-cache',
      };

      const metricsResult = await (
        this.metricsService as {
          collectMetrics: (
            targetUrl: string,
            options: Record<string, unknown>
          ) => Promise<Record<string, unknown>>;
        }
      ).collectMetrics(url, metricsOptions);

      if (!(metricsResult as { success?: boolean }).success) {
        throw new Error(`性能指标收集失败: ${(metricsResult as { error?: string }).error}`);
      }

      let resourceAnalysis: null | Record<string, unknown> = null;
      const rawResults = (metricsResult as { data?: PerformanceMetrics }).data?.basicTiming
        ?.rawResults;
      const firstContent = rawResults?.[0]?.content as string | undefined;

      if (includeResources && fetchHtml && firstContent) {
        const parseResult = (
          this.htmlService as {
            parseHTML: (content: string) => { success?: boolean; $?: CheerioAPI };
          }
        ).parseHTML(firstContent);
        if (parseResult.success && parseResult.$) {
          resourceAnalysis = {
            resources: this.analyzeResources(parseResult.$),
            contentAnalysis: this.analyzeContent(parseResult.$, url),
          };
        }
      }

      const results = this.formatResults(
        (metricsResult as { data: PerformanceMetrics }).data,
        resourceAnalysis
      );
      results.recommendations = this.generateRecommendations(results);

      const warnings = (results.recommendations || []).map(item =>
        String(
          (item as { title?: string }).title || (item as { type?: string }).type || '性能优化建议'
        )
      );

      const normalizedResult = {
        testId,
        status: 'completed',
        score: results.summary.score,
        summary: results.summary,
        metrics: results.metrics,
        warnings,
        errors: [] as string[],
        details: results,
      };

      if (verbose) {
        const summary = results.summary;
        console.log(`✅ 性能测试完成，评分: ${summary.score}/100 (${summary.grade})`);
      }

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: normalizedResult.summary,
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        timestamp: new Date().toISOString(),
      };
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results: normalizedResult,
      });
      this.updateTestProgress(testId, 100, '性能测试完成');
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }
      return finalResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ 性能测试失败: ${message}`);
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: message,
        status: 'failed',
        score: 0,
        summary: {},
        metrics: {},
        warnings: [],
        errors: [message],
        timestamp: new Date().toISOString(),
      };
      this.activeTests.set(testId, {
        status: 'failed',
        error: message,
      });
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(message));
      }
      return errorResult;
    }
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      status: test.status || 'running',
      progress,
      message,
      lastUpdate: Date.now(),
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: test.status || 'running',
      });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'cancelled',
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  formatResults(
    metrics: PerformanceMetrics,
    resourceAnalysis: Record<string, unknown> | null
  ): PerformanceResults {
    const results: PerformanceResults = {
      url: metrics.url,
      timestamp: metrics.timestamp,
      iterations: metrics.basicTiming.iterations,
      summary: {
        score: metrics.performanceScore.score,
        grade: metrics.performanceScore.grade,
        averageLoadTime: `${Math.round(metrics.basicTiming.totalTime.avg)}ms`,
        fastestLoadTime: `${Math.round(metrics.basicTiming.totalTime.min)}ms`,
        slowestLoadTime: `${Math.round(metrics.basicTiming.totalTime.max)}ms`,
      },
      metrics: {
        dns: {
          average: `${Math.round(metrics.basicTiming.dnsTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.dnsTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.dnsTime.max)}ms`,
        },
        connection: {
          average: `${Math.round(metrics.basicTiming.connectionTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.connectionTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.connectionTime.max)}ms`,
        },
        ttfb: {
          average: `${Math.round(metrics.basicTiming.ttfb.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.ttfb.min)}ms`,
          max: `${Math.round(metrics.basicTiming.ttfb.max)}ms`,
          rating: this.getRating(metrics.basicTiming.ttfb.avg),
        },
        download: {
          average: `${Math.round(metrics.basicTiming.downloadTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.downloadTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.downloadTime.max)}ms`,
        },
        contentSize: {
          average: `${Math.round(metrics.basicTiming.contentLength.avg / 1024)}KB`,
          min: `${Math.round(metrics.basicTiming.contentLength.min / 1024)}KB`,
          max: `${Math.round(metrics.basicTiming.contentLength.max / 1024)}KB`,
        },
      },
      webVitals: {
        lcp: {
          value: metrics.coreWebVitals.lcp.value,
          rating: metrics.coreWebVitals.lcp.rating,
        },
        fcp: {
          value: metrics.coreWebVitals.fcp.value,
          rating: metrics.coreWebVitals.fcp.rating,
        },
        cls: {
          value: metrics.coreWebVitals.cls.value,
          rating: metrics.coreWebVitals.cls.rating,
        },
        ttfb: {
          value: metrics.coreWebVitals.ttfb.value,
          rating: metrics.coreWebVitals.ttfb.rating,
        },
      },
    };

    if (resourceAnalysis) {
      results.resources = resourceAnalysis.resources as PerformanceResults['resources'];
      results.contentAnalysis =
        resourceAnalysis.contentAnalysis as PerformanceResults['contentAnalysis'];
    }

    return results;
  }

  analyzeResources($: CheerioAPI) {
    const resources: {
      images: Array<{
        src: string | undefined;
        alt: string;
        width: string | null;
        height: string | null;
        loading: string | null;
        type: string;
      }>;
      scripts: Array<{
        src: string | undefined;
        type: string;
        async: boolean;
        defer: boolean;
        integrity: string | null;
      }>;
      stylesheets: Array<{ href: string | undefined; media: string; type: string }>;
      fonts: Array<{ href: string | undefined; type: string | null; crossOrigin: string | null }>;
      other: unknown[];
    } = {
      images: [],
      scripts: [],
      stylesheets: [],
      fonts: [],
      other: [],
    };

    $('img[src]').each((_, el) => {
      const $el = $(el);
      resources.images.push({
        src: $el.attr?.('src'),
        alt: $el.attr?.('alt') || '',
        width: $el.attr?.('width') || null,
        height: $el.attr?.('height') || null,
        loading: $el.attr?.('loading') || null,
        type: 'image',
      });
    });

    $('script[src]').each((_, el) => {
      const $el = $(el);
      resources.scripts.push({
        src: $el.attr?.('src'),
        type: $el.attr?.('type') || 'text/javascript',
        async: $el.attr?.('async') !== undefined,
        defer: $el.attr?.('defer') !== undefined,
        integrity: $el.attr?.('integrity') || null,
      });
    });

    $('link[rel="stylesheet"]').each((_, el) => {
      const $el = $(el);
      resources.stylesheets.push({
        href: $el.attr?.('href'),
        media: $el.attr?.('media') || 'all',
        type: $el.attr?.('type') || 'text/css',
      });
    });

    $('link[rel="preload"][as="font"]').each((_, el) => {
      const $el = $(el);
      resources.fonts.push({
        href: $el.attr?.('href'),
        type: $el.attr?.('type') || null,
        crossOrigin: $el.attr?.('crossorigin') || null,
      });
    });

    const counts = {
      images: resources.images.length,
      scripts: resources.scripts.length,
      stylesheets: resources.stylesheets.length,
      fonts: resources.fonts.length,
      total:
        resources.images.length +
        resources.scripts.length +
        resources.stylesheets.length +
        resources.fonts.length,
    };

    return { resources, counts };
  }

  analyzeContent($: CheerioAPI, _url: string) {
    try {
      const titleNode = $('title');
      const title = (titleNode.text?.() || '').trim();
      const metaNode = $('meta[name="description"]');
      const metaDescription = metaNode.attr?.('content') || '';
      const h1Selection = $('h1');
      const h1Node = h1Selection.first ? h1Selection.first() : h1Selection;
      const h1 = (h1Node.text?.() || '').trim();

      return {
        title: {
          content: title,
          length: title.length,
          hasTitle: title.length > 0,
        },
        meta: {
          description: metaDescription,
          descriptionLength: metaDescription.length,
          hasDescription: metaDescription.length > 0,
        },
        h1: {
          content: h1,
          hasH1: h1.length > 0,
        },
        resourceHints: {
          preconnect: $('link[rel="preconnect"]').length || 0,
          prefetch: $('link[rel="prefetch"]').length || 0,
          preload: $('link[rel="preload"]').length || 0,
          dns_prefetch: $('link[rel="dns-prefetch"]').length || 0,
        },
      };
    } catch (error) {
      console.error('内容分析失败:', error);
      return { error: (error as Error).message };
    }
  }

  getRating(ttfb: number) {
    if (ttfb <= 800) return 'good';
    if (ttfb <= 1800) return 'needs-improvement';
    return 'poor';
  }

  generateRecommendations(results: PerformanceResults) {
    const recommendations: Array<Record<string, unknown>> = [];

    try {
      if (results.metrics.ttfb.rating === 'poor') {
        recommendations.push({
          type: 'server-response',
          priority: 'high',
          title: '优化服务器响应时间',
          description: `服务器响应时间 (TTFB) 为 ${results.metrics.ttfb.average}，远超理想值 (800ms)`,
          impact: '高',
          suggestions: [
            '使用内容分发网络 (CDN)',
            '优化服务器配置和资源使用',
            '改进缓存策略',
            '优化数据库查询',
            '检查第三方服务响应时间',
          ],
        });
      }

      if (results.webVitals.lcp.rating === 'poor') {
        recommendations.push({
          type: 'largest-contentful-paint',
          priority: 'high',
          title: '优化最大内容绘制 (LCP)',
          description: `最大内容绘制时间为 ${results.webVitals.lcp.value}ms，超过推荐的 2500ms`,
          impact: '高',
          suggestions: [
            '优化关键渲染路径',
            '移除渲染阻塞资源',
            '优化和压缩图片',
            '实现适当的资源提示',
            '使用服务工作器缓存资源',
          ],
        });
      }

      if (results.webVitals.cls && results.webVitals.cls.rating === 'poor') {
        recommendations.push({
          type: 'cumulative-layout-shift',
          priority: 'medium',
          title: '减少累积布局偏移 (CLS)',
          description: `累积布局偏移值为 ${results.webVitals.cls.value}，超过推荐的 0.1`,
          impact: '中',
          suggestions: [
            '为所有图片设置尺寸属性（宽度和高度）',
            '确保广告元素有保留空间',
            '避免在用户交互之外插入内容',
            '使用transform动画替代影响布局的属性',
          ],
        });
      }

      if (results.resources && results.resources.counts.total > 30) {
        recommendations.push({
          type: 'resource-optimization',
          priority: 'medium',
          title: '优化资源加载',
          description: `页面包含 ${results.resources.counts.total} 个资源，可能影响加载性能`,
          impact: '中',
          suggestions: [
            '合并和压缩CSS和JavaScript文件',
            '延迟加载非关键JavaScript',
            '优化和压缩图片资源',
            '实现有效的HTTP缓存策略',
            '使用资源优先级提示',
          ],
        });
      }

      return recommendations;
    } catch (error) {
      console.error('生成建议失败:', error);
      return [];
    }
  }
}

module.exports = PerformanceTestEngine;

export {};
