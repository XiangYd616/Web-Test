/**
 * 🚀 性能测试核心服务
 * 统一所有性能测试功能，消除重复代码
 */

import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer';
import axios from 'axios';

interface WebVitalsResult {
  id: string;
  url: string;
  timestamp: Date;
  device: string;
  locale: string;
  categories: Array<{
    id: string;
    score: number;
    title: string;
    description: string;
    manualDescription: string;
  }>;
  audits: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    numericValue?: {
      value: number;
      unit: string;
      optimalValue: number;
      optimalUnit: string;
    };
    details: {
      items: Array<{
        node: {
          path: string;
        };
        value: string;
        unit: string;
      }>;
    }>;
  }>;
  lighthouse: {
    version: string;
    requestedUrl: string;
    fetcher: string;
    runner: string;
    settings: {
      device: string;
      locale: string;
      throttling: string;
      categories: string[];
    };
  };
}

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
  pw a: number;
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
      value: string;
      unit: string;
      optimalValue: string;
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
    cls: {
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
  numericValue: {
    value: number;
    unit: string;
    optimalValue: number;
    optimalUnit: string;
  };
  savings: {
    savings: number;
    unit: string;
    unitSavings: number;
  };
  details: {
    items: Array<{
      node: {
        path: string;
        type: string;
        snippet: string;
        explanation: string;
      }>;
    }>;
  };
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
  private defaultConfig: PerformanceConfig;

  constructor() {
    this.name = 'performance-core';
    this.cache = new Map(); // 结果缓存
    this.defaultConfig = {
      device: 'desktop',
      locale: 'zh-CN',
      throttling: 'simulated3G',
      categories: ['performance', 'accessibility', 'best-practices', 'seo']
    };
  }

  /**
   * 获取 Core Web Vitals - 统一实现
   * 消除在多个测试工具中的重复实现
   */
  async getCoreWebVitals(url: string, config: PerformanceConfig = {}): Promise<WebVitalsResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const cacheKey = `cwv_${url}_${JSON.stringify(mergedConfig)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 启动Chrome
      const chrome = await chromeLauncher({
        chromeFlags: mergedConfig.chromeFlags || []
      });

      // 运行Lighthouse
      const runnerResult = await lighthouse(url, {
        port: mergedConfig.port || 9222,
        output: 'json',
        logLevel: 'info',
        onlyAudits: mergedConfig.categories,
        device: mergedConfig.device,
        locale: mergedConfig.locale,
        throttling: mergedConfig.throttling,
        timeout: mergedConfig.timeout || 60000
      });

      // 关闭Chrome
      await chrome.kill();

      const result: WebVitalsResult = {
        id: this.generateId(),
        url,
        timestamp: new Date(),
        device: mergedConfig.device,
        locale: mergedConfig.locale,
        categories: runnerResult.lhr.categories,
        audits: runnerResult.lhr.audits,
        lighthouse: {
          version: runnerResult.lhr.version,
          requestedUrl: runnerResult.lhr.requestedUrl,
          fetcher: runnerResult.lhr.fetcher,
          runner: runnerResult.lhr.runner,
          settings: runnerResult.lhr.settings
        }
      };

      // 缓存结果
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(`获取CoreWebVitals失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 运行完整的性能测试
   */
  async runPerformanceTest(url: string, config: PerformanceConfig = {}): Promise<PerformanceReport> {
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
        summary: this.generateSummary(webVitals, recommendations)
      };

      return report;
    } catch (error) {
      throw new Error(`性能测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取PageSpeed Insights
   */
  private async getPageSpeedInsights(url: string, config: PerformanceConfig = {}): Promise<PageSpeedInsight[]> {
    try {
      // 使用Lighthouse的PageSpeed Insights
      const chrome = await chromeLauncher({
        chromeFlags: config.chromeFlags || []
      });

      const runnerResult = await lighthouse(url, {
        onlyCategories: ['performance'],
        config: {
          onlyAudits: ['performance'],
          settings: {
            device: config.device || 'desktop',
            throttling: config.throttling || 'simulated3g',
            locale: config.locale || 'zh-CN'
          }
        }
      });

      await chrome.kill();

      // 提取PageSpeed Insights
      const insights = runnerResult.lhr.audits
        .filter(audit => audit.id.includes('page-speed'))
        .map(audit => ({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          numericValue: audit.numericValue,
          savings: audit.details?.savings,
          details: audit.details
        }));

      return insights;
    } catch (error) {
      console.warn(`获取PageSpeed Insights失败: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(webVitals: WebVitals, pageSpeedInsights: PageSpeedInsights[]): Array<{
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
    const webVitalsAudits = webVitals.audits;
    
    // LCP建议
    const lcpAudit = webVitalsAudits.find(audit => audit.id === 'largest-contentful-paint');
    if (lcpAudit && lcpAudit.score < 0.9) {
      recommendations.push({
        title: '优化Largest Contentful Paint',
        description: `LCP为${lcpAudit.displayValue}ms，超过建议的2.5秒`,
        priority: 'high',
        potentialSavings: {
          savings: lcpAudit.details?.savings?.savings || 0,
          unit: lcpAudit.details?.savings?.unit || 'ms',
          unitSavings: lcpAudit.details?.savings?.unitSavings || 0
        },
        category: 'performance'
      });
    }

    // FID建议
    const fidAudit = webVitalsAudits.find(audit => audit.id === 'first-input-delay');
    if (fidAudit && fidAudit.score < 0.9) {
      recommendations.push({
        title: '减少首次输入延迟',
        description: `FID为${fidAudit.displayValue}ms，超过建议的100ms`,
        priority: 'medium',
        potentialSavings: {
          savings: fidAudit.details?.savings?.savings || 0,
          unit: fidAudit.details?.savings?.unit || 'ms',
          unitSavings: fidAudit.details?.savings?.unitSavings || 0
        },
        category: 'performance'
      });
    }

    // CLS建议
    const clsAudit = webVitalsAudits.find(audit => audit.id === 'cumulative-layout-shift');
    if (clsAudit && clsAudit.score < 0.9) {
      recommendations.push({
        title: '减少累积布局偏移',
        description: `CLS为${clsAudit.displayValue}，超过建议的0.1`,
        priority: 'medium',
        potentialSavings: {
          savings: clsAudit.details?.savings?.savings || 0,
          unit: clsAudit.details?.savings?.unit || '',
          unitSavings: clsAudit.details?.savings?.unitSavings || 0
        },
        category: 'performance'
      });
    }

    // 基于PageSpeed Insights生成建议
    pageSpeedInsights.forEach(insight => {
      if (insight.savings && insight.savings.savings > 0) {
        recommendations.push({
          title: insight.title,
          description: insight.description,
          priority: this.getPriorityFromSavings(insight.savings.savings),
          potentialSavings: {
            savings: insight.savings.savings,
            unit: insight.savings.unit,
            unitSavings: insight.savings.unitSavings || 0
          },
          category: 'performance'
        });
      }
    });

    // 去重重复建议
    const uniqueRecommendations = recommendations.filter((rec, index, self) => 
      recommendations.findIndex(r => r.title === rec.title) === index
    );

    return uniqueRecommendations;
  }

  /**
   * 获取优先级
   */
  private getPriorityFromSavings(savings: { savings: number; unit: string; unitSavings: number }): 'high' | 'medium' | 'low' {
    const value = savings.savings;
    
    if (value > 5000) return 'high';
    if (value > 2000) return 'medium';
    if (value > 500) return 'medium';
    if (value > 500) return 'medium';
    return 'low';
  }

  /**
   * 计算分类分数
   */
  private calculateCategoryScores(webVitals: WebVitals): Record<string, number> {
    const categories = webVitals.categories;
    const scores: Record<string, number> = {};

    categories.forEach(category => {
      scores[category.id] = category.score;
    });

    return scores;
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(webVitals: WebVitals): number {
    const categories = webVitals.categories;
    const scores = categories.map(cat => cat.score);
    return scores.reduce((sum, score) => sum + score, 0) / categories.length;
  }

  /**
   * 提取Web Vitals指标
   */
  private extractWebVitals(webVitals: WebVitals): PerformanceMetrics['webVitals'] {
    const metrics = webVitals.categories
      .find(cat => cat.id === 'performance')
      ?.auditRefs
      .reduce((acc, ref) => {
        const audit = webVitals.audits.find(a => a.id === ref.id);
        if (audit && audit.numericValue) {
          acc[ref.id] = {
            value: audit.numericValue.value,
            unit: audit.numericValue.unit,
            optimalValue: audit.numericValue.optimalValue,
            optimalUnit: audit.numericValue.optimalUnit
          };
        }
        return acc;
      }, {} as PerformanceMetrics['webVitals']);

    return metrics || {
      lcp: { value: 0, unit: 'ms', optimalValue: 2500, optimalUnit: 'ms' },
      fid: { value: 0, unit: 'ms', optimalValue: 100, optimalUnit: 'ms' },
      cls: { value: 0, unit: '', optimalValue: 0.1, optimalUnit: '' },
      ttfb: { value: 0, unit: 'ms', optimalValue: 600, optimalUnit: 'ms' },
      fcp: { value: '', unit: 'ms', optimalValue: '1.8s', optimalUnit: 's' },
      inp: { value: 0, unit: 'ms', optimalValue: 100, optimalUnit: 'ms' },
      tbt: { value: 0, unit: 'ms', optimalValue: 600, optimalUnit: 'ms' },
      cls: { value: 0, unit: '', optimalValue: 0.1, optimalUnit: '' }
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(webVitals: WebVitals, recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    potentialSavings: {
      savings: number;
      unit: string;
      unitSavings: number;
    };
    category: string;
  }>): {
    const issues = webVitals.audits.filter(audit => audit.score < 0.9).length;
    const warnings = webVitals.audits.filter(audit => audit.score >= 0.9 && audit.score < 1).length;
    const opportunities = recommendations.length;

    const grade = this.getGrade(webVitals.lighthouse.categories[0]?.score || 0);

    return {
      grade,
      issues,
      warnings,
      opportunities
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
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: 实现缓存命中率统计
      entries: Array.from(this.cache.keys()).slice(0, 10)
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
