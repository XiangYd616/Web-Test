import type { Element as DomElement } from 'domhandler';

const axios = require('axios');
const Joi = require('joi');
const cheerio = require('cheerio');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const PerformanceTestEngine = require('../performance/PerformanceTestEngine');
const SeoTestEngine = require('../seo/SeoTestEngine');
const AccessibilityTestEngine = require('../accessibility/AccessibilityTestEngine');
const UXTestEngine = require('../ux/UXTestEngine');

type WebsiteConfig = {
  testId?: string;
  url?: string;
  timeout?: number;
  enablePerformance?: boolean;
  enableSEO?: boolean;
  enableAccessibility?: boolean;
  enableUX?: boolean;
  confirmPuppeteer?: boolean;
  performanceConfig?: Record<string, unknown>;
  seoConfig?: Record<string, unknown>;
  accessibilityConfig?: Record<string, unknown>;
  uxConfig?: Record<string, unknown>;
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
  uxEngine: Record<string, unknown>;

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
    this.uxEngine = new UXTestEngine();
  }

  private validateConfig(config: WebsiteConfig) {
    const performanceConfigSchema = Joi.object({
      iterations: Joi.number().min(1).max(10),
      includeResources: Joi.boolean(),
    }).unknown(true);
    const seoConfigSchema = Joi.object({
      enableAdvanced: Joi.boolean(),
    }).unknown(true);
    const accessibilityConfigSchema = Joi.object({
      level: Joi.string().valid('A', 'AA', 'AAA'),
    }).unknown(true);
    const uxConfigSchema = Joi.object({
      timeout: Joi.number().min(1000).max(120000),
    }).unknown(true);

    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      timeout: Joi.number().min(1000).max(120000),
      enablePerformance: Joi.boolean(),
      enableSEO: Joi.boolean(),
      enableAccessibility: Joi.boolean(),
      enableUX: Joi.boolean(),
      confirmPuppeteer: Joi.boolean(),
      performanceConfig: performanceConfigSchema,
      seoConfig: seoConfigSchema,
      accessibilityConfig: accessibilityConfigSchema,
      uxConfig: uxConfigSchema,
    }).unknown(true);

    return schema.validate(config, { abortEarly: false });
  }

  private getOptimalStrategy(enabledEngines: string[]) {
    const heavyEngines = enabledEngines.filter(engine =>
      ['performance', 'ux', 'accessibility'].includes(engine)
    );
    if (heavyEngines.length >= 2) {
      return { parallel: false, reason: '重型引擎较多，采用串行策略' };
    }
    if (enabledEngines.length >= 2) {
      return { parallel: true, reason: '轻量组合，采用并行策略' };
    }
    return { parallel: false, reason: '单引擎无需并行' };
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
      const { error, value: validatedConfig } = this.validateConfig(config);
      if (error) {
        throw new Error(
          `配置验证失败: ${error.details
            .map((item: { message: string }) => item.message)
            .join(', ')}`
        );
      }

      const testId = validatedConfig.testId || `website-${Date.now()}`;
      const {
        url,
        timeout = 30000,
        enablePerformance = true,
        enableSEO = true,
        enableAccessibility = true,
        enableUX = true,
        confirmPuppeteer,
        performanceConfig,
        seoConfig,
        accessibilityConfig,
        uxConfig,
      } = validatedConfig as WebsiteConfig;
      if (!url) {
        throw new Error('网站测试URL不能为空');
      }

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 5, '获取页面内容', 'started', { url });

      const response = await axios.get(url, { timeout });
      const $ = cheerio.load(response.data);

      const basicChecks = await this.performBasicChecks($);

      const enabledEngines = [
        enablePerformance ? 'performance' : null,
        enableSEO ? 'seo' : null,
        enableAccessibility ? 'accessibility' : null,
        enableUX ? 'ux' : null,
      ].filter(Boolean) as string[];

      const strategy = this.getOptimalStrategy(enabledEngines);
      const engineMetrics: Record<string, Record<string, unknown>> = {};

      const runEngine = async (
        key: string,
        label: string,
        runner: () => Promise<Record<string, unknown>>,
        progress: number
      ) => {
        this.updateTestProgress(testId, progress, label, 'running');
        const start = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        const result = await runner();
        const end = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        engineMetrics[key] = {
          executionTime: end - start,
          memoryUsage: Math.max(0, endMemory - startMemory),
        };
        return result;
      };

      let performanceChecks: Record<string, unknown> = enablePerformance ? {} : { skipped: true };
      let seoChecks: Record<string, unknown> = enableSEO ? {} : { skipped: true };
      let accessibilityChecks: Record<string, unknown> = enableAccessibility
        ? {}
        : { skipped: true };

      if (strategy.parallel) {
        const tasks: Array<Promise<void>> = [];
        if (enablePerformance) {
          tasks.push(
            runEngine(
              'performance',
              '执行性能测试',
              async () => {
                const performanceResult = await (
                  this.performanceEngine as {
                    executeTest: (
                      payload: Record<string, unknown>
                    ) => Promise<Record<string, unknown>>;
                  }
                ).executeTest({
                  url,
                  testId: `${testId}_performance`,
                  ...(performanceConfig || {}),
                });
                performanceChecks =
                  (performanceResult as { results?: Record<string, unknown> })?.results || {};
                return performanceChecks;
              },
              35
            ).then(() => undefined)
          );
        }
        if (enableSEO) {
          tasks.push(
            runEngine(
              'seo',
              '执行SEO测试',
              async () => {
                const seoResult = await (
                  this.seoEngine as {
                    executeTest: (
                      payload: Record<string, unknown>
                    ) => Promise<Record<string, unknown>>;
                  }
                ).executeTest({
                  url,
                  testId: `${testId}_seo`,
                  ...(seoConfig || {}),
                });
                seoChecks = seoResult || {};
                return seoChecks;
              },
              50
            ).then(() => undefined)
          );
        }
        if (enableAccessibility) {
          tasks.push(
            runEngine(
              'accessibility',
              '执行可访问性测试',
              async () => {
                const accessibilityResult = await (
                  this.accessibilityEngine as {
                    executeTest: (
                      payload: Record<string, unknown>
                    ) => Promise<Record<string, unknown>>;
                  }
                ).executeTest({
                  url,
                  testId: `${testId}_accessibility`,
                  ...(accessibilityConfig || {}),
                });
                accessibilityChecks =
                  (accessibilityResult as { results?: Record<string, unknown> })?.results || {};
                return accessibilityChecks;
              },
              65
            ).then(() => undefined)
          );
        }
        await Promise.all(tasks);
      } else {
        if (enablePerformance) {
          await runEngine(
            'performance',
            '执行性能测试',
            async () => {
              const performanceResult = await (
                this.performanceEngine as {
                  executeTest: (
                    payload: Record<string, unknown>
                  ) => Promise<Record<string, unknown>>;
                }
              ).executeTest({
                url,
                testId: `${testId}_performance`,
                ...(performanceConfig || {}),
              });
              performanceChecks =
                (performanceResult as { results?: Record<string, unknown> })?.results || {};
              return performanceChecks;
            },
            35
          );
        }
        if (enableSEO) {
          await runEngine(
            'seo',
            '执行SEO测试',
            async () => {
              const seoResult = await (
                this.seoEngine as {
                  executeTest: (
                    payload: Record<string, unknown>
                  ) => Promise<Record<string, unknown>>;
                }
              ).executeTest({
                url,
                testId: `${testId}_seo`,
                ...(seoConfig || {}),
              });
              seoChecks = seoResult || {};
              return seoChecks;
            },
            60
          );
        }
        if (enableAccessibility) {
          await runEngine(
            'accessibility',
            '执行可访问性测试',
            async () => {
              const accessibilityResult = await (
                this.accessibilityEngine as {
                  executeTest: (
                    payload: Record<string, unknown>
                  ) => Promise<Record<string, unknown>>;
                }
              ).executeTest({
                url,
                testId: `${testId}_accessibility`,
                ...(accessibilityConfig || {}),
              });
              accessibilityChecks =
                (accessibilityResult as { results?: Record<string, unknown> })?.results || {};
              return accessibilityChecks;
            },
            80
          );
        }
      }

      let uxChecks: Record<string, unknown> = {};
      if (enableUX) {
        if (confirmPuppeteer !== true) {
          uxChecks = { skipped: true, reason: '需确认Puppeteer环境' };
        } else {
          this.updateTestProgress(testId, 90, '执行UX测试', 'running');
          const uxResult = await (
            this.uxEngine as {
              executeTest: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
            }
          ).executeTest({
            url,
            testId: `${testId}_ux`,
            timeout,
            confirmPuppeteer,
            ...(uxConfig || {}),
          });
          uxChecks = (uxResult as { results?: Record<string, unknown> })?.results || {};
        }
      } else {
        uxChecks = { skipped: true, reason: '未启用UX测试' };
      }

      const scores = [
        (basicChecks as { score?: number })?.score,
        !('skipped' in performanceChecks)
          ? (performanceChecks as { summary?: { score?: number } })?.summary?.score
          : null,
        !('skipped' in seoChecks)
          ? (seoChecks as { summary?: { score?: number } })?.summary?.score
          : null,
        !('skipped' in accessibilityChecks)
          ? (accessibilityChecks as { summary?: { score?: number } })?.summary?.score
          : null,
        enableUX && !('skipped' in uxChecks) ? (uxChecks as { score?: number })?.score : null,
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
          accessibility: !('skipped' in accessibilityChecks)
            ? ((accessibilityChecks as { summary?: { score?: number } })?.summary?.score ??
              (basicChecks as { accessibility?: number })?.accessibility)
            : 0,
          performance: !('skipped' in performanceChecks)
            ? ((performanceChecks as { summary?: { score?: number } })?.summary?.score ?? 0)
            : 0,
          seo: !('skipped' in seoChecks)
            ? ((seoChecks as { summary?: { score?: number } })?.summary?.score ?? 0)
            : 0,
          ux:
            enableUX && !('skipped' in uxChecks)
              ? ((uxChecks as { score?: number })?.score ?? 0)
              : 0,
          status: 'completed',
        },
        checks: {
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks,
          ux: enableUX ? uxChecks : { skipped: true },
        },
        engineMetrics,
        recommendations: this.buildRecommendations({
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks,
          ux: uxChecks,
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
        status: 'failed',
        score: 0,
        summary: {},
        metrics: {},
        warnings: [],
        errors: [(error as Error).message],
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
    const imagesWithoutAlt = images.filter(
      (_index: number, el: DomElement) => !$(el).attr('alt')
    ).length;
    if (imagesWithoutAlt > 0) {
      warnings.push(`图片缺少alt属性: ${imagesWithoutAlt}个`);
    }

    const links = $('a');
    const linksWithoutText = links.filter(
      (_index: number, el: DomElement) => !$(el).text().trim()
    ).length;
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
    ux,
  }: {
    basic: Record<string, unknown>;
    performance: Record<string, unknown>;
    seo: Record<string, unknown>;
    accessibility: Record<string, unknown>;
    ux: Record<string, unknown>;
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
    if ((ux as { recommendations?: string[] })?.recommendations?.length) {
      recommendations.push(...((ux as { recommendations?: string[] }).recommendations || []));
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
