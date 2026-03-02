import axios from 'axios';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';
import type { Element as DomElement } from 'domhandler';
import Joi from 'joi';
import {
  BaseTestConfig,
  BaseTestResult,
  ITestEngine,
  TestEngineCapabilities,
  TestEngineType,
  TestProgress,
  TestStatus,
  ValidationResult,
} from '../../../../shared/types/testEngine.types';
// 进度/完成/错误事件统一由 UserTestManager 回调 -> sendToUser 推送，不再直接走房间广播
import AccessibilityTestEngine from '../accessibility/AccessibilityTestEngine';
import PerformanceTestEngine from '../performance/PerformanceTestEngine';
import SeoTestEngine from '../seo/SEOTestEngine';
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import { diagnoseNetworkError } from '../shared/utils/networkDiagnostics';
import UXTestEngine from '../ux/UXTestEngine';

type WebsiteRunConfig = BaseTestConfig & {
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

type WebsiteConfig = WebsiteRunConfig & {
  testId: string;
  url: string;
};

type WebsiteFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: Record<string, unknown>;
  error?: string;
  status?: TestStatus;
  timestamp: string;
  score?: number;
  summary?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
};

const WEBSITE_PROGRESS_STAGE = {
  STARTED: 'started',
  RUNNING: 'running',
  COMPLETED: 'completed',
} as const;

type WebsiteProgressStage = (typeof WEBSITE_PROGRESS_STAGE)[keyof typeof WEBSITE_PROGRESS_STAGE];

class WebsiteTestEngine implements ITestEngine<WebsiteRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  options: Record<string, unknown>;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: WebsiteFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  lifecycle?: ITestEngine<WebsiteRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  performanceEngine: unknown;
  seoEngine: unknown;
  accessibilityEngine: unknown;
  uxEngine: unknown;

  constructor(options: Record<string, unknown> = {}) {
    this.type = TestEngineType.WEBSITE;
    this.name = 'website';
    this.version = '2.0.0';
    this.description = '网站综合测试引擎';
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'website-testing',
        'comprehensive-analysis',
        'seo-checking',
        'performance-monitoring',
        'accessibility',
        'ux',
      ],
      requiredConfig: ['url'],
      optionalConfig: [
        'enablePerformance',
        'enableSEO',
        'enableAccessibility',
        'enableUX',
        'confirmPuppeteer',
        'performanceConfig',
        'seoConfig',
        'accessibilityConfig',
        'uxConfig',
      ],
      outputFormat: ['summary', 'checks', 'recommendations', 'engineMetrics'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 5000,
        max: 90000,
        typical: 30000,
      },
    };
    this.options = options;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.progressTracker = new Map();
    this.performanceEngine = new PerformanceTestEngine();
    this.seoEngine = new SeoTestEngine();
    this.accessibilityEngine = new AccessibilityTestEngine();
    this.uxEngine = new UXTestEngine();
  }

  // W6: 共享 schema 构建，避免 validate() 和 normalizeConfig() 重复定义
  private buildSchema(requireTestId: boolean) {
    const performanceConfigSchema = Joi.object({
      iterations: Joi.number().min(1),
      includeResources: Joi.boolean(),
    }).unknown(true);
    const seoConfigSchema = Joi.object({
      enableAdvanced: Joi.boolean(),
    }).unknown(true);
    const accessibilityConfigSchema = Joi.object({
      level: Joi.string().valid('A', 'AA', 'AAA'),
    }).unknown(true);
    const uxConfigSchema = Joi.object({
      timeout: Joi.number().min(1000),
      iterations: Joi.number().min(1),
      sampleDelayMs: Joi.number().min(0),
      cpuSlowdownMultiplier: Joi.number().min(1).max(6),
      network: Joi.object({
        downloadKbps: Joi.number().min(0),
        uploadKbps: Joi.number().min(0),
        latencyMs: Joi.number().min(0),
      }),
      device: Joi.object({
        preset: Joi.string().valid('desktop', 'mobile', 'tablet'),
        width: Joi.number().min(320).max(3840),
        height: Joi.number().min(480).max(2160),
        deviceScaleFactor: Joi.number().min(1).max(4),
        isMobile: Joi.boolean(),
        hasTouch: Joi.boolean(),
        userAgent: Joi.string().allow(''),
      }),
      enableScreenshot: Joi.boolean(),
    }).unknown(true);

    return Joi.object({
      testId: requireTestId ? Joi.string().required() : Joi.string(),
      url: Joi.string().uri().required(),
      timeout: Joi.number().min(1000),
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
  }

  validate(config: WebsiteRunConfig): ValidationResult {
    const schema = this.buildSchema(false);
    const { error } = schema.validate(config, { abortEarly: false });
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(item => item.message),
        warnings: [],
        suggestions: [],
      };
    }
    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: WebsiteConfig) {
    // 展开 options：前端发送 { url, testType, options: { enablePerformance, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as WebsiteConfig;
    }

    const schema = this.buildSchema(true);
    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as WebsiteConfig;
  }

  async initialize(): Promise<void> {
    return;
  }

  async run(
    config: WebsiteRunConfig,
    onProgress?: (progress: TestProgress) => void
  ): Promise<BaseTestResult> {
    const metadata = (config.metadata || {}) as Record<string, unknown>;
    const metadataTestId = typeof metadata.testId === 'string' ? metadata.testId : undefined;
    const configTestId = (config as { testId?: string }).testId;
    const testId = configTestId || metadataTestId;
    if (!testId) {
      throw new Error('测试配置缺少 testId');
    }

    const startTime = new Date();
    const initialProgress: TestProgress = {
      status: TestStatus.PREPARING,
      progress: 0,
      currentStep: '准备网站综合测试环境',
      startTime,
      messages: [],
    };
    this.progressTracker.set(testId, initialProgress);
    if (onProgress) {
      onProgress(initialProgress);
    }

    const previousProgressCallback = this.progressCallback;
    if (onProgress) {
      this.progressCallback = payload => {
        const progressValue = Number((payload as { progress?: number }).progress ?? 0);
        const message = String(
          (payload as { message?: string }).message || WEBSITE_PROGRESS_STAGE.RUNNING
        );
        const current = this.progressTracker.get(testId);
        const progress: TestProgress = {
          status: TestStatus.RUNNING,
          progress: progressValue,
          currentStep: message,
          startTime: current?.startTime || startTime,
          messages: current?.messages ? [...current.messages, message] : [message],
        };
        this.progressTracker.set(testId, progress);
        onProgress(progress);
      };
    }

    try {
      const result = (await this.executeTest({
        ...config,
        testId,
      } as WebsiteConfig)) as WebsiteFinalResult;
      const endTime = new Date();
      const resultSummary =
        (result.results as { summary?: Record<string, unknown> })?.summary || {};
      const wsScore = Number(resultSummary.overallScore ?? 0);
      const wsGrade =
        wsScore >= 90 ? 'A' : wsScore >= 80 ? 'B' : wsScore >= 60 ? 'C' : wsScore >= 40 ? 'D' : 'F';
      const structuredSummary = {
        score: wsScore,
        grade: wsGrade,
        passed: wsScore >= 60,
        performance: resultSummary.performance ?? null,
        seo: resultSummary.seo ?? null,
        accessibility: resultSummary.accessibility ?? null,
        ux: resultSummary.ux ?? null,
      };
      const warnings = (result.results as { warnings?: string[] })?.warnings || [];
      const recommendations =
        (result.results as { recommendations?: string[] })?.recommendations || [];
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: wsScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || '网站综合测试失败')],
        warnings,
        recommendations,
      };
      this.progressTracker.set(testId, {
        status: baseResult.status,
        progress: 100,
        currentStep: '完成',
        startTime,
        messages: [],
      });
      return baseResult;
    } catch (error) {
      const endTime = new Date();
      const message = error instanceof Error ? error.message : String(error);
      const failed: BaseTestResult = {
        testId,
        engineType: this.type,
        status: TestStatus.FAILED,
        score: 0,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: '网站综合测试失败',
        details: { error: message },
        errors: [message],
        warnings: [],
        recommendations: [],
      };
      this.progressTracker.set(testId, {
        status: TestStatus.FAILED,
        progress: 100,
        currentStep: '失败',
        startTime,
        messages: [message],
      });
      return failed;
    } finally {
      if (onProgress) {
        this.progressCallback = previousProgressCallback || null;
      }
    }
  }

  async cancel(testId: string): Promise<void> {
    await this.stopTest(testId);
  }

  getStatus(testId: string): TestProgress {
    const progress = this.progressTracker.get(testId);
    if (progress) {
      return progress;
    }
    return {
      status: TestStatus.IDLE,
      progress: 0,
      currentStep: 'idle',
      startTime: new Date(),
      messages: [],
    };
  }

  estimateDuration(config: WebsiteRunConfig): number {
    const engines = [
      config.enablePerformance !== false,
      config.enableSEO !== false,
      config.enableAccessibility !== false,
      config.enableUX !== false,
    ].filter(Boolean).length;
    return Math.max(5000, engines * 10000);
  }

  getDependencies(): TestEngineType[] {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    const availability = await this.checkAvailability();
    return Boolean(availability.available);
  }

  private async checkPuppeteerAvailable(): Promise<boolean> {
    return puppeteerPool.isAvailable();
  }

  getMetrics(): Record<string, unknown> {
    return {
      activeTests: this.activeTests.size,
    };
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
      const validatedConfig = this.normalizeConfig(config);
      const testId = validatedConfig.testId;
      const {
        url,
        timeout = 60000,
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

      if (enableUX) {
        if (confirmPuppeteer !== true) {
          throw new Error('启用UX测试时必须确认Puppeteer环境(confirmPuppeteer=true)');
        }
        const puppeteerAvailable = await this.checkPuppeteerAvailable();
        if (!puppeteerAvailable) {
          throw new Error('未检测到 Puppeteer 依赖，无法执行UX测试');
        }
      }

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 5, '获取页面内容', WEBSITE_PROGRESS_STAGE.STARTED, { url });

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

      const engineWarnings: string[] = [];
      const runEngine = async (
        key: string,
        label: string,
        runner: () => Promise<Record<string, unknown>>,
        progress: number
      ) => {
        this.updateTestProgress(testId, progress, label, WEBSITE_PROGRESS_STAGE.RUNNING);
        const start = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        try {
          const result = await runner();
          const end = Date.now();
          const endMemory = process.memoryUsage().heapUsed;
          engineMetrics[key] = {
            executionTime: end - start,
            memoryUsage: Math.max(0, endMemory - startMemory),
          };
          return result;
        } catch (engineError) {
          const msg = engineError instanceof Error ? engineError.message : String(engineError);
          const end = Date.now();
          engineMetrics[key] = { executionTime: end - start, error: msg };
          engineWarnings.push(`${label}失败: ${msg}`);
          return { skipped: true, error: msg };
        }
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
            ).then((): undefined => undefined)
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
            ).then((): undefined => undefined)
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
            ).then((): undefined => undefined)
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

      // W3: UX 引擎纳入 runEngine 统一框架
      let uxChecks: Record<string, unknown> = enableUX
        ? {}
        : { skipped: true, reason: '未启用UX测试' };
      if (enableUX) {
        uxChecks = await runEngine(
          'ux',
          '执行UX测试',
          async () => {
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
            return (uxResult as { results?: Record<string, unknown> })?.results || {};
          },
          90
        );
      }

      // W5: 统一子引擎评分提取（多路径 fallback）
      const extractScore = (data: Record<string, unknown>): number | null => {
        if ('skipped' in data) return null;
        // 路径1: data.score（UX 引擎）
        const directScore = (data as { score?: unknown }).score;
        if (typeof directScore === 'number' && Number.isFinite(directScore)) return directScore;
        // 路径2: data.summary.score（Performance/SEO/Accessibility 引擎）
        const summary = (data as { summary?: unknown }).summary;
        if (summary && typeof summary === 'object') {
          const summaryScore = (summary as { score?: unknown }).score;
          if (typeof summaryScore === 'number' && Number.isFinite(summaryScore))
            return summaryScore;
        }
        // 路径3: data.results.score
        const results = (data as { results?: unknown }).results;
        if (results && typeof results === 'object') {
          const resultsScore = (results as { score?: unknown }).score;
          if (typeof resultsScore === 'number' && Number.isFinite(resultsScore))
            return resultsScore;
        }
        return null;
      };

      const perfScore = extractScore(performanceChecks);
      const seoScore = extractScore(seoChecks);
      const a11yScore = extractScore(accessibilityChecks);
      const uxScore = enableUX ? extractScore(uxChecks) : null;

      // W1: 加权综合评分（basicChecks 不参与，仅子引擎）
      const WEIGHTS: Record<string, number> = {
        performance: 0.3,
        seo: 0.2,
        accessibility: 0.25,
        ux: 0.25,
      };
      const scoreEntries: Array<{ key: string; score: number }> = [];
      if (perfScore !== null) scoreEntries.push({ key: 'performance', score: perfScore });
      if (seoScore !== null) scoreEntries.push({ key: 'seo', score: seoScore });
      if (a11yScore !== null) scoreEntries.push({ key: 'accessibility', score: a11yScore });
      if (uxScore !== null) scoreEntries.push({ key: 'ux', score: uxScore });

      let overallScore = 0;
      if (scoreEntries.length > 0) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const entry of scoreEntries) {
          const w = WEIGHTS[entry.key] || 0.25;
          weightedSum += entry.score * w;
          totalWeight += w;
        }
        overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      }

      const results = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          performance: perfScore ?? 0,
          seo: seoScore ?? 0,
          accessibility: a11yScore ?? 0,
          ux: uxScore ?? 0,
          status: TestStatus.COMPLETED,
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

      // 先发送 100% 进度（此时 activeTests 状态仍为 RUNNING）
      this.updateTestProgress(testId, 100, '网站测试完成', WEBSITE_PROGRESS_STAGE.COMPLETED);

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results,
      });

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        warnings: engineWarnings,
        timestamp: new Date().toISOString(),
      };

      // 不在此处调用 emitTestComplete —— 由 UserTestManager.completionCallback 统一处理

      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
        },
        5 * 60 * 1000
      );

      return finalResult;
    } catch (error) {
      const rawMessage = (error as Error).message;
      const friendlyMessage = diagnoseNetworkError(error, '网站综合测试', config.url);
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: rawMessage,
        status: TestStatus.FAILED,
        score: 0,
        summary: {},
        metrics: {},
        warnings: [] as string[],
        errors: [friendlyMessage],
        timestamp: new Date().toISOString(),
      };

      // 不在此处调用 emitTestError —— 由 UserTestManager.errorCallback 统一处理

      setTimeout(
        () => {
          this.activeTests.delete(config.testId);
          this.progressTracker.delete(config.testId);
        },
        5 * 60 * 1000
      );

      return errorResult;
    }
  }

  async performBasicChecks($: CheerioAPI) {
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

    // W2: 基础检查评分 — 仅反映 HTML 基础质量，不伪造子维度分数
    const totalChecks = 4; // viewport, h1, alt, link-text
    const failedChecks = errors.length + warnings.length;
    const score = Math.max(0, Math.round((1 - failedChecks / totalChecks) * 100));

    return {
      score,
      totalChecks,
      failedChecks,
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
    const seen = new Set<string>();
    const recommendations: string[] = [];
    const add = (rec: string) => {
      const key = rec.slice(0, 60);
      if (seen.has(key)) return;
      seen.add(key);
      recommendations.push(rec);
    };

    // 基础检查 errors 优先（关键问题）
    const basicErrors = (basic as { errors?: string[] })?.errors || [];
    for (const e of basicErrors) add(`[基础] ${e}`);

    // 子引擎建议（带来源标签）
    const perfRecs = (performance as { recommendations?: string[] })?.recommendations || [];
    for (const r of perfRecs) add(`[性能] ${r}`);

    const seoRecs =
      (seo as { summary?: { recommendations?: string[] } })?.summary?.recommendations || [];
    for (const r of seoRecs) add(`[SEO] ${r}`);

    const a11yRecs = (accessibility as { recommendations?: string[] })?.recommendations || [];
    for (const r of a11yRecs) add(`[可访问性] ${r}`);

    // UX 建议可能是对象数组
    const uxRawRecs = (ux as { recommendations?: unknown[] })?.recommendations || [];
    for (const r of uxRawRecs) {
      if (typeof r === 'string') {
        add(`[UX] ${r}`);
      } else if (r && typeof r === 'object' && (r as { recommendation?: string }).recommendation) {
        add(`[UX] ${(r as { recommendation: string }).recommendation}`);
      }
    }

    // 基础检查 warnings（较低优先级）
    const basicWarnings = (basic as { warnings?: string[] })?.warnings || [];
    for (const w of basicWarnings) add(`[基础] ${w}`);

    // W4: 跨引擎综合性建议
    const perfSkipped = 'skipped' in performance;
    const seoSkipped = 'skipped' in seo;
    const a11ySkipped = 'skipped' in accessibility;
    const uxSkipped = 'skipped' in ux;
    const skippedCount = [perfSkipped, seoSkipped, a11ySkipped, uxSkipped].filter(Boolean).length;
    if (skippedCount >= 2) {
      add('[综合] 多个子引擎被跳过，建议启用全部引擎以获得完整的网站质量评估');
    }

    if (recommendations.length === 0) {
      recommendations.push('页面表现良好，可继续保持当前优化策略');
    }

    // 限制建议数量，避免过多
    return recommendations.slice(0, 20);
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage: WebsiteProgressStage = WEBSITE_PROGRESS_STAGE.RUNNING,
    extra: Record<string, unknown> = {}
  ) {
    const test = this.activeTests.get(testId) || { status: TestStatus.RUNNING };
    this.activeTests.set(testId, {
      ...test,
      status: test.status || TestStatus.RUNNING,
      progress,
      message,
      lastUpdate: Date.now(),
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: stage,
        ...extra,
      });
    }
    const current = this.progressTracker.get(testId);
    this.progressTracker.set(testId, {
      status: TestStatus.RUNNING,
      progress,
      currentStep: message,
      startTime: current?.startTime || new Date(),
      messages: current?.messages ? [...current.messages, message] : [message],
    });
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: TestStatus.CANCELLED,
      });
      const current = this.progressTracker.get(testId);
      this.progressTracker.set(testId, {
        status: TestStatus.CANCELLED,
        progress: current?.progress ?? 0,
        currentStep: '已取消',
        startTime: current?.startTime || new Date(),
        messages: current?.messages ? [...current.messages, '已取消'] : ['已取消'],
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: WebsiteFinalResult) => void) {
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

export default WebsiteTestEngine;
