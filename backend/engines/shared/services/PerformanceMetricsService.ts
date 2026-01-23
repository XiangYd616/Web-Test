/**
 * 性能指标服务
 * 统一性能指标收集和分析，消除多个引擎中的重复性能分析代码
 */

import { ErrorCode, ErrorFactory, ErrorSeverity } from '../errors/ErrorTypes';
import BaseService, { ServiceConfig } from './BaseService';

// 性能指标配置接口
export interface PerformanceMetricsConfig {
  enableCoreWebVitals: boolean;
  enableNavigationTiming: boolean;
  enableResourceTiming: boolean;
  enableUserTiming: boolean;
  enablePaintTiming: boolean;
  enableLayoutShift: boolean;
  thresholds: PerformanceThresholds;
  customMetrics?: string[];
}

// 性能阈值接口
export interface PerformanceThresholds {
  coreWebVitals: {
    lcp: { good: number; needsImprovement: number }; // Largest Contentful Paint (ms)
    fid: { good: number; needsImprovement: number }; // First Input Delay (ms)
    cls: { good: number; needsImprovement: number }; // Cumulative Layout Shift
    fcp: { good: number; needsImprovement: number }; // First Contentful Paint (ms)
    ttfb: { good: number; needsImprovement: number }; // Time to First Byte (ms)
  };
  performance: {
    pageLoad: { good: number; warning: number };
    domContentLoaded: { good: number; warning: number };
    loadComplete: { good: number; warning: number };
    dnsLookup: { good: number; warning: number };
    connection: { good: number; warning: number };
    tlsHandshake: { good: number; warning: number };
  };
  resources: {
    totalSize: { good: number; warning: number };
    requestCount: { good: number; warning: number };
    imageOptimization: { good: number; warning: number };
    caching: { good: number; warning: number };
  };
}

// 性能分析结果接口
export interface PerformanceAnalysisResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    performance: 'good' | 'needsImprovement' | 'poor';
  };
  coreWebVitals: CoreWebVitalsMetrics;
  navigationTiming: NavigationTimingMetrics;
  resourceTiming: ResourceTimingMetrics;
  userTiming: UserTimingMetrics;
  paintTiming: PaintTimingMetrics;
  layoutShift: LayoutShiftMetrics;
  recommendations: PerformanceRecommendation[];
}

// Core Web Vitals指标接口
export interface CoreWebVitalsMetrics {
  lcp: {
    value: number;
    rating: 'good' | 'needsImprovement' | 'poor';
    target: number;
  };
  fid: {
    value: number;
    rating: 'good' | 'needsImprovement' | 'poor';
    target: number;
  };
  cls: {
    value: number;
    rating: 'good' | 'needsImprovement' | 'poor';
    target: number;
  };
  fcp: {
    value: number;
    rating: 'good' | 'needsImprovement' | 'poor';
    target: number;
  };
  ttfb: {
    value: number;
    rating: 'good' | 'needsImprovement' | 'poor';
    target: number;
  };
  overall: {
    score: number;
    passed: number;
    total: number;
  };
}

// 导航时序指标接口
export interface NavigationTimingMetrics {
  navigationStart: number;
  unloadEventStart: number;
  unloadEventEnd: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domLoading: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
  durations: {
    dnsLookup: number;
    connection: number;
    tlsHandshake: number;
    request: number;
    response: number;
    domProcessing: number;
    loadEvent: number;
    total: number;
  };
}

// 资源时序指标接口
export interface ResourceTimingMetrics {
  totalRequests: number;
  totalSize: number;
  cachedRequests: number;
  uncachedRequests: number;
  resourceTypes: Record<
    string,
    {
      count: number;
      size: number;
      cached: number;
    }
  >;
  slowResources: Array<{
    url: string;
    type: string;
    duration: number;
    size: number;
  }>;
  largeResources: Array<{
    url: string;
    type: string;
    size: number;
    duration: number;
  }>;
}

// 用户时序指标接口
export interface UserTimingMetrics {
  marks: Array<{
    name: string;
    startTime: number;
    duration?: number;
  }>;
  measures: Array<{
    name: string;
    startTime: number;
    duration: number;
  }>;
  customMetrics: Record<string, number>;
}

// 绘制时序指标接口
export interface PaintTimingMetrics {
  firstPaint: number;
  firstContentfulPaint: number;
  firstMeaningfulPaint?: number;
  largestContentfulPaint?: number;
}

// 布局偏移指标接口
export interface LayoutShiftMetrics {
  cls: number;
  layoutShifts: Array<{
    value: number;
    startTime: number;
    sources: Array<{
      node: string;
      currentRect: DOMRect;
      previousRect: DOMRect;
    }>;
  }>;
  totalShifts: number;
}

// 性能建议接口
export interface PerformanceRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  examples: string[];
  metrics: string[];
}

class PerformanceMetricsService extends BaseService {
  private thresholds: PerformanceThresholds;
  private defaultConfig: PerformanceMetricsConfig;

  constructor(config?: Partial<ServiceConfig>) {
    const serviceConfig: ServiceConfig = {
      name: 'PerformanceMetricsService',
      version: '1.0.0',
      timeout: 30000,
      retries: 2,
      dependencies: [],
      logging: {
        enabled: true,
        level: 'info',
      },
      metrics: {
        enabled: true,
        interval: 60000,
      },
      ...config,
    };

    super(serviceConfig);

    this.thresholds = {
      coreWebVitals: {
        lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
        fid: { good: 100, needsImprovement: 300 }, // First Input Delay (ms)
        cls: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
        fcp: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint (ms)
        ttfb: { good: 800, needsImprovement: 1800 }, // Time to First Byte (ms)
      },
      performance: {
        pageLoad: { good: 3000, warning: 7000 },
        domContentLoaded: { good: 1500, warning: 3000 },
        loadComplete: { good: 2000, warning: 4000 },
        dnsLookup: { good: 100, warning: 500 },
        connection: { good: 200, warning: 1000 },
        tlsHandshake: { good: 300, warning: 1500 },
      },
      resources: {
        totalSize: { good: 1500000, warning: 3000000 }, // 1.5MB, 3MB
        requestCount: { good: 50, warning: 100 },
        imageOptimization: { good: 80, warning: 60 }, // 百分比
        caching: { good: 90, warning: 70 }, // 百分比
      },
    };

    this.defaultConfig = {
      enableCoreWebVitals: true,
      enableNavigationTiming: true,
      enableResourceTiming: true,
      enableUserTiming: true,
      enablePaintTiming: true,
      enableLayoutShift: true,
      thresholds: this.thresholds,
    };
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    this.log('info', 'PerformanceMetricsService initialized successfully');
  }

  /**
   * 执行关闭
   */
  protected async performShutdown(): Promise<void> {
    this.log('info', 'PerformanceMetricsService shutdown successfully');
  }

  /**
   * 分析性能指标
   */
  async analyzePerformance(
    url: string,
    performanceData: Record<string, unknown>,
    options: Partial<PerformanceMetricsConfig> = {}
  ): Promise<PerformanceAnalysisResult> {
    if (!url || typeof url !== 'string') {
      throw ErrorFactory.createValidationError('URL is required and must be a string', [
        {
          field: 'url',
          value: url,
          constraint: 'non-empty string',
          message: 'URL must be a non-empty string',
        },
      ]);
    }

    const config = { ...this.defaultConfig, ...options };
    const timestamp = new Date();
    const startTime = Date.now();

    try {
      // 分析Core Web Vitals
      const coreWebVitals = config.enableCoreWebVitals
        ? this.analyzeCoreWebVitals(performanceData, config.thresholds)
        : this.createEmptyCoreWebVitals();

      // 分析导航时序
      const navigationTiming = config.enableNavigationTiming
        ? this.analyzeNavigationTiming(performanceData, config.thresholds)
        : this.createEmptyNavigationTiming();

      // 分析资源时序
      const resourceTiming = config.enableResourceTiming
        ? this.analyzeResourceTiming(performanceData, config.thresholds)
        : this.createEmptyResourceTiming();

      // 分析用户时序
      const userTiming = config.enableUserTiming
        ? this.analyzeUserTiming(performanceData)
        : this.createEmptyUserTiming();

      // 分析绘制时序
      const paintTiming = config.enablePaintTiming
        ? this.analyzePaintTiming(performanceData, config.thresholds)
        : this.createEmptyPaintTiming();

      // 分析布局偏移
      const layoutShift = config.enableLayoutShift
        ? this.analyzeLayoutShift(performanceData, config.thresholds)
        : this.createEmptyLayoutShift();

      // 生成建议
      const recommendations = this.generateRecommendations(
        coreWebVitals,
        navigationTiming,
        resourceTiming,
        config.thresholds
      );

      // 计算总体分数
      const overall = this.calculateOverallScore(coreWebVitals, navigationTiming, resourceTiming);

      const result: PerformanceAnalysisResult = {
        url,
        timestamp,
        overall,
        coreWebVitals,
        navigationTiming,
        resourceTiming,
        userTiming,
        paintTiming,
        layoutShift,
        recommendations,
      };

      const responseTime = Date.now() - startTime;
      this.recordRequest(true, responseTime);
      this.log('debug', 'Performance analysis completed', {
        url,
        score: overall.score,
        grade: overall.grade,
        responseTime,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordRequest(false, responseTime);

      throw ErrorFactory.createSystemError(
        `Performance analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: ErrorCode.CONTENT_PROCESSING_FAILED,
          severity: ErrorSeverity.MEDIUM,
          context: { url },
        }
      );
    }
  }

  /**
   * 分析Core Web Vitals
   */
  private analyzeCoreWebVitals(
    performanceData: Record<string, unknown>,
    thresholds: PerformanceThresholds
  ): CoreWebVitalsMetrics {
    const vitals =
      (performanceData as { coreWebVitals?: Record<string, unknown> }).coreWebVitals || {};
    const threshold = thresholds.coreWebVitals;

    // Largest Contentful Paint
    const lcpValue = Number(vitals.lcp ?? 0);
    const lcpRating = this.getRating(lcpValue, threshold.lcp.good, threshold.lcp.needsImprovement);

    // First Input Delay
    const fidValue = Number(vitals.fid ?? 0);
    const fidRating = this.getRating(fidValue, threshold.fid.good, threshold.fid.needsImprovement);

    // Cumulative Layout Shift
    const clsValue = Number(vitals.cls ?? 0);
    const clsRating = this.getRating(clsValue, threshold.cls.good, threshold.cls.needsImprovement);

    // First Contentful Paint
    const fcpValue = Number(vitals.fcp ?? 0);
    const fcpRating = this.getRating(fcpValue, threshold.fcp.good, threshold.fcp.needsImprovement);

    // Time to First Byte
    const ttfbValue = Number(vitals.ttfb ?? 0);
    const ttfbRating = this.getRating(
      ttfbValue,
      threshold.ttfb.good,
      threshold.ttfb.needsImprovement
    );

    // 计算总体分数
    const ratings = [lcpRating, fidRating, clsRating, fcpRating, ttfbRating];
    const passed = ratings.filter(rating => rating === 'good').length;
    const score = (passed / ratings.length) * 100;

    return {
      lcp: {
        value: lcpValue,
        rating: lcpRating,
        target: threshold.lcp.good,
      },
      fid: {
        value: fidValue,
        rating: fidRating,
        target: threshold.fid.good,
      },
      cls: {
        value: clsValue,
        rating: clsRating,
        target: threshold.cls.good,
      },
      fcp: {
        value: fcpValue,
        rating: fcpRating,
        target: threshold.fcp.good,
      },
      ttfb: {
        value: ttfbValue,
        rating: ttfbRating,
        target: threshold.ttfb.good,
      },
      overall: {
        score,
        passed,
        total: ratings.length,
      },
    };
  }

  /**
   * 分析导航时序
   */
  private analyzeNavigationTiming(
    performanceData: Record<string, unknown>,
    _thresholds: PerformanceThresholds
  ): NavigationTimingMetrics {
    const nav =
      (performanceData as { navigationTiming?: Record<string, number> }).navigationTiming || {};

    // 计算各阶段持续时间
    const dnsLookup = nav.domainLookupEnd - nav.domainLookupStart;
    const connection = nav.connectEnd - nav.connectStart;
    const tlsHandshake = nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0;
    const request = nav.responseStart - nav.requestStart;
    const response = nav.responseEnd - nav.responseStart;
    const domProcessing = nav.domComplete - nav.domLoading;
    const loadEvent = nav.loadEventEnd - nav.loadEventStart;
    const total = nav.loadEventEnd - nav.navigationStart;

    return {
      navigationStart: nav.navigationStart || 0,
      unloadEventStart: nav.unloadEventStart || 0,
      unloadEventEnd: nav.unloadEventEnd || 0,
      redirectStart: nav.redirectStart || 0,
      redirectEnd: nav.redirectEnd || 0,
      fetchStart: nav.fetchStart || 0,
      domainLookupStart: nav.domainLookupStart || 0,
      domainLookupEnd: nav.domainLookupEnd || 0,
      connectStart: nav.connectStart || 0,
      connectEnd: nav.connectEnd || 0,
      secureConnectionStart: nav.secureConnectionStart || 0,
      requestStart: nav.requestStart || 0,
      responseStart: nav.responseStart || 0,
      responseEnd: nav.responseEnd || 0,
      domLoading: nav.domLoading || 0,
      domInteractive: nav.domInteractive || 0,
      domContentLoadedEventStart: nav.domContentLoadedEventStart || 0,
      domContentLoadedEventEnd: nav.domContentLoadedEventEnd || 0,
      domComplete: nav.domComplete || 0,
      loadEventStart: nav.loadEventStart || 0,
      loadEventEnd: nav.loadEventEnd || 0,
      durations: {
        dnsLookup,
        connection,
        tlsHandshake,
        request,
        response,
        domProcessing,
        loadEvent,
        total,
      },
    };
  }

  /**
   * 分析资源时序
   */
  private analyzeResourceTiming(
    performanceData: Record<string, unknown>,
    _thresholds: PerformanceThresholds
  ): ResourceTimingMetrics {
    const resources =
      (performanceData as { resources?: Array<Record<string, unknown>> }).resources || [];

    let totalSize = 0;
    const totalRequests = resources.length;
    let cachedRequests = 0;
    let uncachedRequests = 0;

    const resourceTypes: Record<string, { count: number; size: number; cached: number }> = {};
    const slowResources: ResourceTimingMetrics['slowResources'] = [];
    const largeResources: ResourceTimingMetrics['largeResources'] = [];

    resources.forEach(resource => {
      const size = Number(resource.transferSize ?? 0);
      const duration = Number(resource.duration ?? 0);
      const name = typeof resource.name === 'string' ? resource.name : '';
      const type = this.getResourceType(name);
      const decodedBodySize = Number(resource.decodedBodySize ?? 0);
      const isCached = size === 0 && decodedBodySize > 0;

      totalSize += size;
      if (isCached) {
        cachedRequests++;
      } else {
        uncachedRequests++;
      }

      // 按类型统计
      if (!resourceTypes[type]) {
        resourceTypes[type] = { count: 0, size: 0, cached: 0 };
      }
      resourceTypes[type].count++;
      resourceTypes[type].size += size;
      if (isCached) {
        resourceTypes[type].cached++;
      }

      // 慢资源
      if (duration > 1000) {
        slowResources.push({
          url: name,
          type,
          duration,
          size,
        });
      }

      // 大资源
      if (size > 500000) {
        // 500KB
        largeResources.push({
          url: name,
          type,
          size,
          duration,
        });
      }
    });

    return {
      totalRequests,
      totalSize,
      cachedRequests,
      uncachedRequests,
      resourceTypes,
      slowResources,
      largeResources,
    };
  }

  /**
   * 分析用户时序
   */
  private analyzeUserTiming(performanceData: Record<string, unknown>): UserTimingMetrics {
    const userTiming =
      (
        performanceData as {
          userTiming?: {
            marks?: Array<Record<string, unknown>>;
            measures?: Array<Record<string, unknown>>;
          };
        }
      ).userTiming || {};

    const marks = (userTiming.marks || []).map(mark => ({
      name: String(mark.name ?? ''),
      startTime: Number(mark.startTime ?? 0),
      duration: Number(mark.duration ?? 0),
    }));

    const measures = (userTiming.measures || []).map(measure => ({
      name: String(measure.name ?? ''),
      startTime: Number(measure.startTime ?? 0),
      duration: Number(measure.duration ?? 0),
    }));

    const customMetrics: Record<string, number> = {};
    measures.forEach(measure => {
      customMetrics[measure.name] = measure.duration;
    });

    return {
      marks,
      measures,
      customMetrics,
    };
  }

  /**
   * 分析绘制时序
   */
  private analyzePaintTiming(
    performanceData: Record<string, unknown>,
    _thresholds: PerformanceThresholds
  ): PaintTimingMetrics {
    const paint = (performanceData as { paint?: Record<string, number> }).paint || {};

    return {
      firstPaint: paint.firstPaint || 0,
      firstContentfulPaint: paint.firstContentfulPaint || 0,
      firstMeaningfulPaint: paint.firstMeaningfulPaint,
      largestContentfulPaint: paint.largestContentfulPaint,
    };
  }

  /**
   * 分析布局偏移
   */
  private analyzeLayoutShift(
    performanceData: Record<string, unknown>,
    _thresholds: PerformanceThresholds
  ): LayoutShiftMetrics {
    const layoutShift =
      (
        performanceData as {
          layoutShift?: { cls?: number; layoutShifts?: unknown[]; totalShifts?: number };
        }
      ).layoutShift || {};

    const layoutShifts = Array.isArray(layoutShift.layoutShifts)
      ? (layoutShift.layoutShifts as LayoutShiftMetrics['layoutShifts'])
      : [];

    return {
      cls: layoutShift.cls || 0,
      layoutShifts,
      totalShifts: layoutShift.totalShifts || 0,
    };
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(
    coreWebVitals: CoreWebVitalsMetrics,
    navigationTiming: NavigationTimingMetrics,
    resourceTiming: ResourceTimingMetrics,
    thresholds: PerformanceThresholds
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Core Web Vitals建议
    if (coreWebVitals.lcp.rating !== 'good') {
      recommendations.push({
        priority: 'high',
        category: 'core-web-vitals',
        title: '优化Largest Contentful Paint',
        description: `LCP为${coreWebVitals.lcp.value}ms，建议优化到${coreWebVitals.lcp.target}ms以下`,
        impact: '改善用户体验和搜索排名',
        effort: 'medium',
        examples: ['优化图片加载', '预加载关键资源', '使用CDN加速'],
        metrics: ['LCP'],
      });
    }

    if (coreWebVitals.fid.rating !== 'good') {
      recommendations.push({
        priority: 'high',
        category: 'core-web-vitals',
        title: '减少First Input Delay',
        description: `FID为${coreWebVitals.fid.value}ms，建议优化到${coreWebVitals.fid.target}ms以下`,
        impact: '改善交互响应性',
        effort: 'medium',
        examples: ['减少JavaScript执行时间', '代码分割', '使用Web Workers'],
        metrics: ['FID'],
      });
    }

    if (coreWebVitals.cls.rating !== 'good') {
      recommendations.push({
        priority: 'medium',
        category: 'core-web-vitals',
        title: '减少Cumulative Layout Shift',
        description: `CLS为${coreWebVitals.cls.value}，建议优化到${coreWebVitals.cls.target}以下`,
        impact: '改善视觉稳定性',
        effort: 'low',
        examples: ['为图片设置尺寸', '避免动态插入内容', '使用transform动画'],
        metrics: ['CLS'],
      });
    }

    // 资源优化建议
    if (resourceTiming.totalSize > thresholds.resources.totalSize.warning) {
      recommendations.push({
        priority: 'medium',
        category: 'resources',
        title: '优化资源大小',
        description: `总资源大小${(resourceTiming.totalSize / 1024 / 1024).toFixed(2)}MB超过建议值`,
        impact: '减少加载时间',
        effort: 'medium',
        examples: ['压缩图片', '启用Gzip压缩', '移除未使用的资源'],
        metrics: ['资源大小'],
      });
    }

    return recommendations;
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    coreWebVitals: CoreWebVitalsMetrics,
    navigationTiming: NavigationTimingMetrics,
    resourceTiming: ResourceTimingMetrics
  ): PerformanceAnalysisResult['overall'] {
    // Core Web Vitals权重60%
    const cwvScore = coreWebVitals.overall.score;

    // 导航时序权重25%
    const navScore = this.calculateNavigationScore(navigationTiming);

    // 资源时序权重15%
    const resourceScore = this.calculateResourceScore(resourceTiming);

    const overallScore = cwvScore * 0.6 + navScore * 0.25 + resourceScore * 0.15;
    const grade = this.getGrade(overallScore);
    const performance = this.getPerformanceRating(overallScore);

    return {
      score: Math.round(overallScore),
      grade,
      performance,
    };
  }

  /**
   * 计算导航时序分数
   */
  private calculateNavigationScore(navigationTiming: NavigationTimingMetrics): number {
    const durations = navigationTiming.durations;
    let score = 100;

    // DNS查找
    if (durations.dnsLookup > 500) score -= 10;
    if (durations.dnsLookup > 1000) score -= 20;

    // 连接时间
    if (durations.connection > 500) score -= 10;
    if (durations.connection > 1000) score -= 20;

    // 总加载时间
    if (durations.total > 3000) score -= 15;
    if (durations.total > 7000) score -= 30;

    return Math.max(0, score);
  }

  /**
   * 计算资源时序分数
   */
  private calculateResourceScore(resourceTiming: ResourceTimingMetrics): number {
    let score = 100;

    // 资源数量
    if (resourceTiming.totalRequests > 50) score -= 10;
    if (resourceTiming.totalRequests > 100) score -= 20;

    // 资源大小
    if (resourceTiming.totalSize > 1500000) score -= 10; // 1.5MB
    if (resourceTiming.totalSize > 3000000) score -= 20; // 3MB

    // 缓存率
    const cacheRate = resourceTiming.cachedRequests / resourceTiming.totalRequests;
    if (cacheRate < 0.7) score -= 15;
    if (cacheRate < 0.5) score -= 25;

    return Math.max(0, score);
  }

  /**
   * 获取评级
   */
  private getRating(
    value: number,
    good: number,
    needsImprovement: number
  ): 'good' | 'needsImprovement' | 'poor' {
    if (value <= good) return 'good';
    if (value <= needsImprovement) return 'needsImprovement';
    return 'poor';
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
   * 获取性能评级
   */
  private getPerformanceRating(score: number): 'good' | 'needsImprovement' | 'poor' {
    if (score >= 80) return 'good';
    if (score >= 60) return 'needsImprovement';
    return 'poor';
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    } else if (['css'].includes(extension || '')) {
      return 'stylesheet';
    } else if (['js'].includes(extension || '')) {
      return 'script';
    } else if (['woff', 'woff2', 'ttf', 'otf'].includes(extension || '')) {
      return 'font';
    } else if (['mp4', 'webm', 'ogg'].includes(extension || '')) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg'].includes(extension || '')) {
      return 'audio';
    } else {
      return 'other';
    }
  }

  // 创建空结果的方法
  private createEmptyCoreWebVitals(): CoreWebVitalsMetrics {
    return {
      lcp: { value: 0, rating: 'good', target: 2500 },
      fid: { value: 0, rating: 'good', target: 100 },
      cls: { value: 0, rating: 'good', target: 0.1 },
      fcp: { value: 0, rating: 'good', target: 1800 },
      ttfb: { value: 0, rating: 'good', target: 800 },
      overall: { score: 0, passed: 0, total: 5 },
    };
  }

  private createEmptyNavigationTiming(): NavigationTimingMetrics {
    const now = Date.now();
    return {
      navigationStart: now,
      unloadEventStart: 0,
      unloadEventEnd: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: now,
      domainLookupStart: 0,
      domainLookupEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      secureConnectionStart: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      domLoading: 0,
      domInteractive: 0,
      domContentLoadedEventStart: 0,
      domContentLoadedEventEnd: 0,
      domComplete: 0,
      loadEventStart: 0,
      loadEventEnd: 0,
      durations: {
        dnsLookup: 0,
        connection: 0,
        tlsHandshake: 0,
        request: 0,
        response: 0,
        domProcessing: 0,
        loadEvent: 0,
        total: 0,
      },
    };
  }

  private createEmptyResourceTiming(): ResourceTimingMetrics {
    return {
      totalRequests: 0,
      totalSize: 0,
      cachedRequests: 0,
      uncachedRequests: 0,
      resourceTypes: {},
      slowResources: [],
      largeResources: [],
    };
  }

  private createEmptyUserTiming(): UserTimingMetrics {
    return {
      marks: [],
      measures: [],
      customMetrics: {},
    };
  }

  private createEmptyPaintTiming(): PaintTimingMetrics {
    return {
      firstPaint: 0,
      firstContentfulPaint: 0,
    };
  }

  private createEmptyLayoutShift(): LayoutShiftMetrics {
    return {
      cls: 0,
      layoutShifts: [],
      totalShifts: 0,
    };
  }
}

export default PerformanceMetricsService;
