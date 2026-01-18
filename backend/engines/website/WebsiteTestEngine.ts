const axios = require('axios');
const cheerio = require('cheerio');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const PerformanceTestEngine = require('../performance/PerformanceTestEngine');
const SeoTestEngine = require('../seo/SeoTestEngine');
const AccessibilityTestEngine = require('../accessibility/AccessibilityTestEngine');

type WebsiteConfig = {
  testId?: string;
  url?: string;
  timeout?: number;
};

class WebsiteTestEngine {
  name: string;
  version: string;
  description: string;
  options: Record<string, unknown>;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  performanceEngine: Record<string, unknown>;
  seoEngine: Record<string, unknown>;
  accessibilityEngine: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.name = 'website';
    this.version = '2.0.0';
    this.description = '网站综合测试引擎';
    this.options = options;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.performanceEngine = new PerformanceTestEngine();
    this.seoEngine = new SeoTestEngine();
    this.accessibilityEngine = new AccessibilityTestEngine();
  }

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'website-testing',
        'comprehensive-analysis',
        'seo-checking',
        'performance-monitoring',
      ],
    };
  }

  async executeTest(config: WebsiteConfig) {
    try {
      const testId = config.testId || `website-${Date.now()}`;
      const { url = 'https://example.com', timeout = 30000 } = config;

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 5, '获取页面内容', 'started', { url });

      const response = await axios.get(url, { timeout });
      const $ = cheerio.load(response.data);

      const basicChecks = await this.performBasicChecks($);

      this.updateTestProgress(testId, 35, '执行性能测试', 'running');
      const performanceResult = await (
        this.performanceEngine as {
          executeTest: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        }
      ).executeTest({
        url,
        testId: `${testId}_performance`,
      });
      const performanceChecks =
        (performanceResult as { results?: Record<string, unknown> })?.results || {};

      this.updateTestProgress(testId, 60, '执行SEO测试', 'running');
      const seoResult = await (
        this.seoEngine as {
          executeTest: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        }
      ).executeTest({
        url,
        testId: `${testId}_seo`,
      });
      const seoChecks = seoResult || {};

      this.updateTestProgress(testId, 80, '执行可访问性测试', 'running');
      const accessibilityResult = await (
        this.accessibilityEngine as {
          executeTest: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        }
      ).executeTest({
        url,
        testId: `${testId}_accessibility`,
      });
      const accessibilityChecks =
        (accessibilityResult as { results?: Record<string, unknown> })?.results || {};

      const scores = [
        (basicChecks as { score?: number })?.score,
        (performanceChecks as { summary?: { score?: number } })?.summary?.score,
        (seoChecks as { summary?: { score?: number } })?.summary?.score,
        (accessibilityChecks as { summary?: { score?: number } })?.summary?.score,
      ].filter(score => Number.isFinite(score));
      const overallScore =
        scores.length > 0
          ? Math.round((scores as number[]).reduce((sum, score) => sum + score, 0) / scores.length)
          : 0;

      const results = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          accessibility:
            (accessibilityChecks as { summary?: { score?: number } })?.summary?.score ??
            (basicChecks as { accessibility?: number })?.accessibility,
          performance: (performanceChecks as { summary?: { score?: number } })?.summary?.score ?? 0,
          seo: (seoChecks as { summary?: { score?: number } })?.summary?.score ?? 0,
          status: 'completed',
        },
        checks: {
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks,
        },
        recommendations: this.buildRecommendations({
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks,
        }),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results,
      });
      this.updateTestProgress(testId, 100, '网站测试完成', 'completed');

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        timestamp: new Date().toISOString(),
      };

      emitTestComplete(testId, finalResult);
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      return finalResult;
    } catch (error) {
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      emitTestError(config?.testId || 'website', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }

      return errorResult;
    }
  }

  async performBasicChecks($: typeof cheerio) {
    const warnings: string[] = [];
    const errors: string[] = [];

    const images = $('img');
    const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt')).length;
    if (imagesWithoutAlt > 0) {
      warnings.push(`图片缺少alt属性: ${imagesWithoutAlt}个`);
    }

    const links = $('a');
    const linksWithoutText = links.filter((_, el) => !$(el).text().trim()).length;
    if (linksWithoutText > 0) {
      warnings.push(`链接缺少文本描述: ${linksWithoutText}个`);
    }

    const hasViewport = $('meta[name="viewport"]').length > 0;
    if (!hasViewport) {
      errors.push('缺少viewport meta，移动端适配风险');
    }

    const h1Count = $('h1').length;
    if (h1Count === 0) {
      warnings.push('页面缺少H1标题');
    }

    const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5);

    return {
      score,
      accessibility: Math.max(60, score),
      responsiveness: hasViewport ? 85 : 60,
      codeQuality: Math.max(70, score - 10),
      errors,
      warnings,
    };
  }

  buildRecommendations({
    basic,
    performance,
    seo,
    accessibility,
  }: {
    basic: Record<string, unknown>;
    performance: Record<string, unknown>;
    seo: Record<string, unknown>;
    accessibility: Record<string, unknown>;
  }) {
    const recommendations: string[] = [];
    if ((basic as { warnings?: string[] })?.warnings?.length) {
      recommendations.push(...((basic as { warnings?: string[] }).warnings || []));
    }
    if ((basic as { errors?: string[] })?.errors?.length) {
      recommendations.push(...((basic as { errors?: string[] }).errors || []));
    }
    if ((performance as { recommendations?: string[] })?.recommendations?.length) {
      recommendations.push(
        ...((performance as { recommendations?: string[] }).recommendations || [])
      );
    }
    if ((seo as { summary?: { recommendations?: string[] } })?.summary?.recommendations?.length) {
      recommendations.push(
        ...((seo as { summary?: { recommendations?: string[] } }).summary?.recommendations || [])
      );
    }
    if ((accessibility as { recommendations?: string[] })?.recommendations?.length) {
      recommendations.push(
        ...((accessibility as { recommendations?: string[] }).recommendations || [])
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('页面表现良好，可继续保持当前优化策略');
    }
    return recommendations;
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: Record<string, unknown> = {}
  ) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now(),
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra,
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: (test as { status?: string }).status || 'running',
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
        status: 'stopped',
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

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability(),
    };
  }

  async cleanup() {
    console.log('✅ 网站测试引擎清理完成');
  }
}

module.exports = WebsiteTestEngine;

export {};
