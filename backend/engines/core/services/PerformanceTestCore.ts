/**
 * 🚀 性能测试核心服务
 * 统一所有性能测试功能，消除重复代码
 */

import chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

interface WebVitalsResult {
  id: string;
  url: string;
  timestamp: Date;
  device: string;
  locale: string;
  categories: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  lighthouse: Record<string, unknown>;
}

type AuditEntry = {
  id?: string;
  score?: number;
  displayValue?: string | number;
  numericValue?:
    | number
    | { value?: number; unit?: string; optimalValue?: number; optimalUnit?: string };
  details?: {
    savings?: {
      savings?: number;
      unit?: string;
      unitSavings?: number;
    };
  };
};

interface PerformanceConfig {
  device?: 'desktop' | 'mobile';
  locale?: string;
  throttling?: 'online' | 'offline' | 'slow-3g' | 'fast-3g' | 'slow-4g';
  categories?: string[];
  timeout?: number;
  port?: number;
  chromeFlags?: string[];
}

interface PerformanceMetrics {
  score: number;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  webVitals: {
    lcp: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    fid: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    cls: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    ttfb: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    fcp: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    inp: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    tbt: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
  };
}

interface PageSpeedInsight {
  id: string;
  title: string;
  description: string;
  numericValue?: Record<string, unknown>;
  savings?: {
    savings: number;
    unit: string;
    unitSavings: number;
  };
  details?: Record<string, unknown>;
}

interface PerformanceReport {
  url: string;
  timestamp: Date;
  device: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  webVitals: PerformanceMetrics['webVitals'];
  pageSpeedInsights: PageSpeedInsight[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    potentialSavings: {
      savings: number;
      unit: string;
      unitSavings: number;
    };
    category: string;
  }>;
  summary: {
    grade: string;
    issues: number;
    warnings: number;
    opportunities: number;
  };
}

class PerformanceTestCore {
  private name: string;
  private cache: Map<string, WebVitalsResult>;
  private cacheHits: number;
  private cacheMisses: number;
  private defaultConfig: PerformanceConfig;

  constructor() {
    this.name = 'performance-core';
    this.cache = new Map(); // 结果缓存
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.defaultConfig = {
      device: 'desktop',
      locale: 'zh-CN',
      throttling: 'slow-3g',
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    };
  }

  /**
   * 获取 Core Web Vitals - 统一实现
   * 消除在多个测试工具中的重复实现
   */
  async getCoreWebVitals(url: string, config: PerformanceConfig = {}): Promise<WebVitalsResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const cacheKey = `cwv_${url}_${JSON.stringify(mergedConfig)}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits += 1;
      return cached;
    }

    try {
      // 启动Chrome
      const chrome = await chromeLauncher.launch({
        chromeFlags: mergedConfig.chromeFlags || [],
      });

      // 运行Lighthouse
      const runnerResult = (await (
        lighthouse as unknown as (url: string, options: Record<string, unknown>) => Promise<unknown>
      )(url, {
        port: mergedConfig.port || 9222,
        output: 'json',
        logLevel: 'info',
        onlyAudits: mergedConfig.categories,
        device: mergedConfig.device,
        locale: mergedConfig.locale,
        throttling: mergedConfig.throttling,
        timeout: mergedConfig.timeout || 60000,
      })) as { lhr?: Record<string, unknown> };

      // 关闭Chrome
      await chrome.kill();

      const result: WebVitalsResult = {
        id: this.generateId(),
        url,
        timestamp: new Date(),
        device: mergedConfig.device || 'desktop',
        locale: mergedConfig.locale || 'zh-CN',
        categories: runnerResult?.lhr?.categories
          ? (Object.values(runnerResult.lhr.categories as Record<string, unknown>) as Array<
              Record<string, unknown>
            >)
          : [],
        audits: runnerResult?.lhr?.audits
          ? (Object.values(runnerResult.lhr.audits as Record<string, unknown>) as Array<
              Record<string, unknown>
            >)
          : [],
        lighthouse: runnerResult?.lhr || {},
      };

      // 缓存结果
      this.cache.set(cacheKey, result);
      this.cacheMisses += 1;

      return result;
    } catch (error) {
      throw new Error(
        `获取CoreWebVitals失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 运行完整的性能测试
   */
  async runPerformanceTest(
    url: string,
    config: PerformanceConfig = {}
  ): Promise<PerformanceReport> {
    try {
      // 获取Core Web Vitals
      const webVitals = await this.getCoreWebVitals(url, config);

      // 获取PageSpeed Insights
      const pageSpeedInsights = await this.getPageSpeedInsights(url, config);

      // 生成建议
      const recommendations = this.generateRecommendations(webVitals, pageSpeedInsights);

      // 计算分类分数
      const categoryScores = this.calculateCategoryScores(webVitals);

      // 计算总体分数
      const overallScore = this.calculateOverallScore(webVitals);

      const report: PerformanceReport = {
        url,
        timestamp: webVitals.timestamp,
        device: webVitals.device,
        overallScore,
        categoryScores,
        webVitals: this.extractWebVitals(webVitals),
        pageSpeedInsights,
        recommendations,
        summary: this.generateSummary(webVitals, recommendations),
      };

      return report;
    } catch (error) {
      throw new Error(`性能测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取PageSpeed Insights
   */
  private async getPageSpeedInsights(
    url: string,
    config: PerformanceConfig = {}
  ): Promise<PageSpeedInsight[]> {
    try {
      // 使用Lighthouse的PageSpeed Insights
      const chrome = await chromeLauncher.launch({
        chromeFlags: config.chromeFlags || [],
      });

      const runnerResult = (await (
        lighthouse as unknown as (url: string, options: Record<string, unknown>) => Promise<unknown>
      )(url, {
        onlyCategories: ['performance'],
        config: {
          onlyAudits: ['performance'],
          settings: {
            device: config.device || 'desktop',
            throttling: config.throttling || 'slow-3g',
            locale: config.locale || 'zh-CN',
          },
        },
      })) as { lhr?: { audits?: Array<Record<string, unknown>> } };

      await chrome.kill();

      // 提取PageSpeed Insights
      const insights = (runnerResult.lhr?.audits || [])
        .filter((audit: Record<string, unknown>) => String(audit.id || '').includes('page-speed'))
        .map((audit: Record<string, unknown>) => ({
          id: String(audit.id || ''),
          title: String(audit.title || ''),
          description: String(audit.description || ''),
          numericValue: audit.numericValue as Record<string, unknown> | undefined,
          savings: (audit.details as { savings?: PageSpeedInsight['savings'] })?.savings,
          details: audit.details as Record<string, unknown> | undefined,
        }));

      return insights;
    } catch (error) {
      console.warn(
        `获取PageSpeed Insights失败: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    webVitals: WebVitalsResult,
    pageSpeedInsights: PageSpeedInsight[]
  ): Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    potentialSavings: {
      savings: number;
      unit: string;
      unitSavings: number;
    };
    category: string;
  }> {
    const recommendations: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      potentialSavings: {
        savings: number;
        unit: string;
        unitSavings: number;
      };
      category: string;
    }> = [];

    // 基于Web Vitals生成建议
    const webVitalsAudits = webVitals.audits as AuditEntry[];
    const getAuditValue = (audit: AuditEntry): number => {
      if (typeof audit.numericValue === 'number') return audit.numericValue;
      if (typeof audit.displayValue === 'number') return audit.displayValue;
      if (typeof audit.displayValue === 'string') {
        const parsed = Number.parseFloat(audit.displayValue);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (audit.numericValue && typeof audit.numericValue === 'object') {
        return typeof audit.numericValue.value === 'number' ? audit.numericValue.value : 0;
      }
      return 0;
    };

    // LCP建议
    const lcpAudit = webVitalsAudits.find(audit => audit.id === 'largest-contentful-paint');
    if (lcpAudit && (lcpAudit.score ?? 1) < 0.9) {
      recommendations.push({
        title: '优化Largest Contentful Paint',
        description: `LCP为${getAuditValue(lcpAudit)}ms，超过建议的2.5秒`,
        priority: 'high',
        potentialSavings: {
          savings: lcpAudit.details?.savings?.savings || 0,
          unit: lcpAudit.details?.savings?.unit || 'ms',
          unitSavings: lcpAudit.details?.savings?.unitSavings || 0,
        },
        category: 'performance',
      });
    }

    // FID建议
    const fidAudit = webVitalsAudits.find(audit => audit.id === 'first-input-delay');
    if (fidAudit && (fidAudit.score ?? 1) < 0.9) {
      recommendations.push({
        title: '减少首次输入延迟',
        description: `FID为${getAuditValue(fidAudit)}ms，超过建议的100ms`,
        priority: 'medium',
        potentialSavings: {
          savings: fidAudit.details?.savings?.savings || 0,
          unit: fidAudit.details?.savings?.unit || 'ms',
          unitSavings: fidAudit.details?.savings?.unitSavings || 0,
        },
        category: 'performance',
      });
    }

    // CLS建议
    const clsAudit = webVitalsAudits.find(audit => audit.id === 'cumulative-layout-shift');
    if (clsAudit && (clsAudit.score ?? 1) < 0.9) {
      recommendations.push({
        title: '减少累积布局偏移',
        description: `CLS为${getAuditValue(clsAudit)}，超过建议的0.1`,
        priority: 'medium',
        potentialSavings: {
          savings: clsAudit.details?.savings?.savings || 0,
          unit: clsAudit.details?.savings?.unit || '',
          unitSavings: clsAudit.details?.savings?.unitSavings || 0,
        },
        category: 'performance',
      });
    }

    // 基于PageSpeed Insights生成建议
    pageSpeedInsights.forEach(insight => {
      if (insight.savings && insight.savings.savings > 0) {
        recommendations.push({
          title: insight.title,
          description: insight.description,
          priority: this.getPriorityFromSavings(insight.savings),
          potentialSavings: {
            savings: insight.savings.savings,
            unit: insight.savings.unit,
            unitSavings: insight.savings.unitSavings || 0,
          },
          category: 'performance',
        });
      }
    });

    // 去重重复建议
    const uniqueRecommendations = recommendations.filter(
      (rec, index, list) => list.findIndex(r => r.title === rec.title) === index
    );

    return uniqueRecommendations;
  }

  /**
   * 获取优先级
   */
  private getPriorityFromSavings(savings: {
    savings: number;
    unit: string;
    unitSavings: number;
  }): 'high' | 'medium' | 'low' {
    const value = savings.savings;

    if (value > 5000) return 'high';
    if (value > 2000) return 'medium';
    if (value > 500) return 'low';
    return 'low';
  }

  /**
   * 计算分类分数
   */
  private calculateCategoryScores(webVitals: WebVitalsResult): Record<string, number> {
    const categories = webVitals.categories;
    const scores: Record<string, number> = {};

    categories.forEach(category => {
      scores[String((category as { id?: string }).id || '')] = Number(
        (category as { score?: number }).score ?? 0
      );
    });

    return scores;
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(webVitals: WebVitalsResult): number {
    const categories = webVitals.categories;
    const scores = categories.map(cat => Number((cat as { score?: number }).score ?? 0));
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  /**
   * 提取Web Vitals指标
   */
  private extractWebVitals(webVitals: WebVitalsResult): PerformanceMetrics['webVitals'] {
    type Metric = { value: number; unit: string; optimalValue: number; optimalUnit: string };
    const metrics = (webVitals.audits || []).reduce(
      (acc, audit: Record<string, unknown>) => {
        const numericValue = (audit as AuditEntry).numericValue;
        const key = String((audit as AuditEntry).id || '');
        if (numericValue) {
          if (typeof numericValue === 'number') {
            acc[key] = { value: numericValue, unit: '', optimalValue: 0, optimalUnit: '' };
          } else {
            acc[key] = {
              value: numericValue.value ?? 0,
              unit: numericValue.unit ?? '',
              optimalValue: numericValue.optimalValue ?? 0,
              optimalUnit: numericValue.optimalUnit ?? '',
            };
          }
        }
        return acc;
      },
      {} as Record<string, Metric>
    );

    const metricOrDefault = (key: string, fallback: Metric): Metric =>
      (metrics[key] as Metric | undefined) ?? fallback;

    return {
      lcp: metricOrDefault('lcp', { value: 0, unit: 'ms', optimalValue: 2500, optimalUnit: 'ms' }),
      fid: metricOrDefault('fid', { value: 0, unit: 'ms', optimalValue: 100, optimalUnit: 'ms' }),
      cls: metricOrDefault('cls', { value: 0, unit: '', optimalValue: 0.1, optimalUnit: '' }),
      ttfb: metricOrDefault('ttfb', { value: 0, unit: 'ms', optimalValue: 600, optimalUnit: 'ms' }),
      fcp: metricOrDefault('fcp', { value: 0, unit: 'ms', optimalValue: 1800, optimalUnit: 'ms' }),
      inp: metricOrDefault('inp', { value: 0, unit: 'ms', optimalValue: 100, optimalUnit: 'ms' }),
      tbt: metricOrDefault('tbt', { value: 0, unit: 'ms', optimalValue: 600, optimalUnit: 'ms' }),
    };
  }

  private generateSummary(
    webVitals: WebVitalsResult,
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      potentialSavings: {
        savings: number;
        unit: string;
        unitSavings: number;
      };
      category: string;
    }>
  ): {
    grade: string;
    issues: number;
    warnings: number;
    opportunities: number;
  } {
    const issues = webVitals.audits.filter(audit => {
      const score = (audit as AuditEntry).score;
      return score !== undefined && score < 0.9;
    }).length;
    const warnings = webVitals.audits.filter(audit => {
      const score = (audit as AuditEntry).score;
      return score !== undefined && score >= 0.9 && score < 1;
    }).length;
    const opportunities = recommendations.length;

    const lighthouseCategories = (
      webVitals.lighthouse as { categories?: Array<{ score?: number }> }
    ).categories;
    const grade = this.getGrade(lighthouseCategories?.[0]?.score ?? 0);

    return {
      grade,
      issues,
      warnings,
      opportunities,
    };
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? Math.round((this.cacheHits / totalRequests) * 100) : 0;
    return {
      size: this.cache.size,
      hitRate,
      entries: Array.from(this.cache.keys()).slice(0, 10),
    };
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default PerformanceTestCore;
