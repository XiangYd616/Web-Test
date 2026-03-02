import axios from 'axios';
import axiosPkg from 'axios/package.json';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';
import cheerioPkg from 'cheerio/package.json';
import { EventEmitter } from 'events';
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
import { query } from '../../config/database';
import { insertExecutionLog } from '../../testing/services/testLogService';
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import { diagnoseNetworkError } from '../shared/utils/networkDiagnostics';

type SeoRunConfig = BaseTestConfig & {
  url?: string;
  checks?: string[];
  timeout?: number;
  userAgent?: string;
  testId?: string;
  // 前端配置面板开关
  checkMobile?: boolean;
  checkPerformance?: boolean;
  checkAccessibility?: boolean;
  checkBestPractices?: boolean;
  checkSEO?: boolean;
  checkPWA?: boolean;
  language?: string;
  locale?: string;
  customCategories?: string[];
};

type SeoConfig = SeoRunConfig & {
  url: string;
  testId: string;
};

type SeoCheckStatus = 'passed' | 'warning' | 'failed';

type SeoCheckResult<TDetails = unknown> = {
  status: SeoCheckStatus;
  score: number;
  details?: TDetails;
  issues?: string[];
};

type SeoRecommendationItem = {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  issues: string[];
  estimatedImpact: number;
  difficulty: number;
  timeToImplement: number;
};

type SeoRecommendations = {
  all: SeoRecommendationItem[];
  actionable: SeoRecommendationItem[];
  quickWins: SeoRecommendationItem[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
};

type SeoScoreBreakdownItem = {
  score: number;
  weight: number;
  contribution: number;
  status: SeoCheckStatus;
};

type SeoScoreBreakdown = {
  breakdown: Record<string, SeoScoreBreakdownItem>;
  totalPossibleScore: number;
};

type SeoCompetitiveness = {
  level: string;
  description: string;
};

type SeoSummary = {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
  grade?: string;
  level?: SeoCompetitiveness;
  breakdown?: SeoScoreBreakdown;
  competitiveness?: SeoCompetitiveness;
  recommendations?: SeoRecommendations;
};

type SeoStrengthItem = {
  category: string;
  score: number;
  description: string;
};

type SeoWeaknessItem = {
  category: string;
  score: number;
  status: SeoCheckStatus;
  description: string;
  impact: number;
};

type SeoBenchmarkComparison = {
  industryAverage: number;
  yourScore: number;
  percentile: number;
  gap: number;
  recommendation: string;
};

type SeoCompetitorInsights = {
  marketPosition: string;
  competitiveAdvantages: string[];
  improvementAreas: string[];
  benchmarkComparison: SeoBenchmarkComparison;
};

type SeoActionPlan = {
  immediate: SeoRecommendationItem[];
  shortTerm: SeoRecommendationItem[];
  longTerm: SeoRecommendationItem[];
};

type SeoDetailedAnalysis = {
  strengths: SeoStrengthItem[];
  weaknesses: SeoWeaknessItem[];
  competitorInsights: SeoCompetitorInsights;
  actionPlan: SeoActionPlan | null;
};

type SeoChecksMap = Record<string, SeoCheckResult>;

type SeoResultDetails = {
  testId: string;
  url: string;
  timestamp: string;
  checks: SeoChecksMap;
  summary: SeoSummary;
  totalTime?: number;
  detailedAnalysis?: SeoDetailedAnalysis;
  renderMode?: 'browser' | 'static';
};

type SeoNormalizedResult = {
  testId: string;
  status: TestStatus;
  score: number;
  summary: SeoSummary;
  metrics: SeoChecksMap;
  warnings: string[];
  errors: string[];
  details: SeoResultDetails;
};

type SeoFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: SeoNormalizedResult;
  status: TestStatus;
  score?: number;
  summary?: SeoSummary;
  warnings?: string[];
  errors?: string[];
  error?: string;
  timestamp: string;
};

type SeoActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  message?: string;
  error?: string;
  results?: SeoNormalizedResult;
};

type SeoProgressPayload = {
  testId: string;
  progress: number;
  message: string;
  status?: string;
};

class SeoTestEngine extends EventEmitter implements ITestEngine<SeoRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  activeTests: Map<string, SeoActiveTestRecord>;
  defaultTimeout: number;
  progressCallback: ((progress: SeoProgressPayload) => void) | null;
  completionCallback: ((results: SeoFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  lifecycle?: ITestEngine<SeoRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private cancelledTests: Set<string>;

  constructor() {
    super();
    this.type = TestEngineType.SEO;
    this.name = 'seo';
    this.version = '3.0.0';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.cancelledTests = new Set();
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: 'SEO测试引擎',
      version: this.version,
      supportedFeatures: [
        'meta',
        'headings',
        'images',
        'links',
        'canonical',
        'open-graph',
        'hreflang',
        'structured-data',
        'robots',
        'sitemap',
        'mobile',
        'content',
        'accessibility',
        'pwa',
      ],
      requiredConfig: ['url'],
      optionalConfig: [
        'checks',
        'timeout',
        'userAgent',
        'checkMobile',
        'checkPerformance',
        'checkAccessibility',
        'checkBestPractices',
        'checkSEO',
        'checkPWA',
        'language',
        'locale',
        'customCategories',
      ],
      outputFormat: ['summary', 'metrics', 'warnings', 'errors', 'details'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 3000,
        max: 60000,
        typical: 15000,
      },
    };
    this.progressTracker = new Map();
  }

  validate(config: SeoRunConfig): ValidationResult {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      checks: Joi.array().items(Joi.string()).optional(),
      timeout: Joi.number().min(1000).default(30000),
      userAgent: Joi.string().allow('').empty('').default('Mozilla/5.0 (compatible; SEO-Bot/1.0)'),
      checkMobile: Joi.boolean().optional(),
      checkPerformance: Joi.boolean().optional(),
      checkAccessibility: Joi.boolean().optional(),
      checkBestPractices: Joi.boolean().optional(),
      checkSEO: Joi.boolean().optional(),
      checkPWA: Joi.boolean().optional(),
      language: Joi.string().optional().allow(''),
      locale: Joi.string().optional().allow(''),
      customCategories: Joi.array().items(Joi.string()).optional(),
    }).unknown(true);

    const { error } = schema.validate(config, { abortEarly: false });
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(item => item.message),
        warnings: [],
        suggestions: [],
      };
    }

    // 注入 executionTimeout：TestEngineRegistry.execute() 在调用 engine.run() 之前读取
    const cfgAny = config as Record<string, unknown>;
    let baseTimeout = 60000; // 基础 SEO 检查
    if (cfgAny.checkPWA) baseTimeout += 15000;
    if (cfgAny.checkMobile !== false) baseTimeout += 10000;
    cfgAny.executionTimeout = baseTimeout;

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: SeoConfig) {
    // 展开 options：前端发送 { url, testType, options: { checkMobile, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as SeoConfig;
    }

    const schema = Joi.object({
      testId: Joi.string().required(),
      url: Joi.string().uri().required(),
      checks: Joi.array().items(Joi.string()).optional(),
      timeout: Joi.number().min(1000).default(30000),
      userAgent: Joi.string().allow('').empty('').default('Mozilla/5.0 (compatible; SEO-Bot/1.0)'),
      checkMobile: Joi.boolean().default(true),
      checkPerformance: Joi.boolean().default(true),
      checkAccessibility: Joi.boolean().default(true),
      checkBestPractices: Joi.boolean().default(true),
      checkSEO: Joi.boolean().default(true),
      checkPWA: Joi.boolean().default(false),
      language: Joi.string().optional().allow(''),
      locale: Joi.string().optional().allow(''),
      customCategories: Joi.array().items(Joi.string()).optional(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }

    return value as SeoConfig & {
      checkMobile: boolean;
      checkPerformance: boolean;
      checkAccessibility: boolean;
      checkBestPractices: boolean;
      checkSEO: boolean;
      checkPWA: boolean;
      language?: string;
      locale?: string;
      customCategories?: string[];
    };
  }

  async initialize(): Promise<void> {
    return;
  }

  async run(
    config: SeoRunConfig,
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
      currentStep: '准备SEO测试环境',
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
        const progressValue = Number(payload.progress ?? 0);
        const current = this.progressTracker.get(testId);
        const progress: TestProgress = {
          status: TestStatus.RUNNING,
          progress: progressValue,
          currentStep: payload.message || 'running',
          startTime: current?.startTime || startTime,
          messages: current?.messages
            ? [...current.messages, payload.message].slice(-20)
            : [payload.message],
        };
        this.progressTracker.set(testId, progress);
        onProgress(progress);
      };
    }

    try {
      const result = await this.runSeoTest({
        ...config,
        testId,
      } as SeoConfig);
      const endTime = new Date();
      const seoScore = result.results?.summary?.score ?? result.results?.score ?? 0;
      const seoGrade = result.results?.summary?.grade || this.getGrade(seoScore);
      const seoSummaryData = result.results?.summary;
      const structuredSummary = {
        score: seoScore,
        grade: seoGrade,
        passed: seoScore >= 60,
        totalChecks: seoSummaryData?.totalChecks ?? 0,
        passedChecks: seoSummaryData?.passed ?? 0,
        failedChecks: seoSummaryData?.failed ?? 0,
        level:
          typeof seoSummaryData?.level === 'object' && seoSummaryData?.level
            ? (seoSummaryData.level as { level?: string; description?: string }).level || 'unknown'
            : String(seoSummaryData?.level ?? 'unknown'),
      };
      // 聚合 actionable + quickWins 建议（去重）
      const actionableRecs = (seoSummaryData?.recommendations?.actionable || []).map(
        (item: { category?: string; issues?: string[] }) =>
          `[${item.category || ''}] ${(item.issues || []).join('、')}`
      );
      const quickWinRecs = (seoSummaryData?.recommendations?.quickWins || []).map(
        (item: { category?: string; issues?: string[] }) =>
          `[快速修复] ${(item.issues || []).join('、')}`
      );
      const allSeoRecs = [...actionableRecs];
      for (const rec of quickWinRecs) {
        if (!allSeoRecs.includes(rec)) allSeoRecs.push(rec);
      }
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: seoScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || 'SEO测试失败')],
        warnings: result.results?.warnings || [],
        recommendations: allSeoRecs,
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
        summary: 'SEO测试失败',
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

  estimateDuration(config: SeoRunConfig): number {
    let estimate = 10000; // 基础检查
    if (config.checkSEO !== false) estimate += 8000; // 含死链检测
    if (config.checkBestPractices !== false) estimate += 5000; // robots/sitemap 外部请求
    if (config.checkMobile !== false) estimate += 3000;
    if (config.checkPWA) estimate += 8000; // manifest 外部请求
    return estimate;
  }

  getDependencies(): TestEngineType[] {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    const availability = await this.checkAvailability();
    return Boolean(availability.available);
  }

  getMetrics(): Record<string, unknown> {
    return {
      activeTests: this.activeTests.size,
    };
  }

  async checkAvailability() {
    try {
      const probeUrl = process.env.SEO_HEALTHCHECK_URL || '';
      if (probeUrl) {
        const testResponse = await axios.get(probeUrl, {
          timeout: 5000,
        });

        const $ = cheerio.load(testResponse.data) as CheerioAPI;
        const hasTitle = ($('title').length || 0) > 0;

        return {
          engine: this.name,
          available: testResponse.status === 200 && hasTitle,
          version: {
            cheerio: cheerioPkg.version,
            axios: axiosPkg.version,
          },
          dependencies: ['cheerio', 'axios'],
          probeUrl,
        };
      }

      return {
        engine: this.name,
        available: true,
        version: {
          cheerio: cheerioPkg.version,
          axios: axiosPkg.version,
        },
        dependencies: ['cheerio', 'axios'],
        probeUrl: null,
      };
    } catch (error) {
      return {
        engine: this.name,
        available: false,
        error: (error as Error).message,
        dependencies: ['cheerio', 'axios'],
        probeUrl: process.env.SEO_HEALTHCHECK_URL || null,
      };
    }
  }

  async execute(config: SeoConfig) {
    return this.runSeoTest(config);
  }

  async runSeoTest(config: SeoConfig) {
    const testId = config.testId;

    try {
      const validatedConfig = this.normalizeConfig(config);

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 5, '开始SEO分析');
      void insertExecutionLog(testId, 'info', `SEO 分析开始: ${validatedConfig.url}`, {
        url: validatedConfig.url,
      });

      this.updateTestProgress(testId, 15, '获取页面内容');

      // 优先使用 Puppeteer 获取 JS 渲染后的 HTML（SPA/SSR 场景下 SEO 标签可能是 JS 动态生成的）
      let htmlContent: string;
      let jsRendered = false;
      let fallbackReason: 'unavailable' | 'error' | null = null;
      const poolAvailable = await puppeteerPool.isAvailable();
      if (poolAvailable) {
        try {
          const _cfg = config as unknown as Record<string, unknown>;
          const { page, release } = await puppeteerPool.acquirePage({
            warmupUrl: validatedConfig.url,
            headed: _cfg.showBrowser === true,
            engineMode: typeof _cfg.engineMode === 'string' ? _cfg.engineMode : undefined,
          });
          try {
            if (validatedConfig.userAgent) {
              await page.setUserAgent(validatedConfig.userAgent);
            }
            await page.goto(validatedConfig.url, {
              waitUntil: 'networkidle2',
              timeout: validatedConfig.timeout,
            });
            htmlContent = await page.content();
            jsRendered = true;
          } finally {
            await release();
          }
        } catch {
          fallbackReason = 'error';
          // Puppeteer 失败，回退到 HTTP 请求
          const response = await axios.get(validatedConfig.url, {
            timeout: validatedConfig.timeout,
            headers: { 'User-Agent': validatedConfig.userAgent },
            maxContentLength: 10 * 1024 * 1024, // 10MB
          });
          htmlContent = typeof response.data === 'string' ? response.data : String(response.data);
        }
      } else {
        fallbackReason = 'unavailable';
        const response = await axios.get(validatedConfig.url, {
          timeout: validatedConfig.timeout,
          headers: { 'User-Agent': validatedConfig.userAgent },
          maxContentLength: 10 * 1024 * 1024, // 10MB
        });
        htmlContent = typeof response.data === 'string' ? response.data : String(response.data);
      }

      const $ = cheerio.load(htmlContent) as CheerioAPI;

      // Puppeteer 降级警告：静态获取无法解析 JS 渲染的内容
      const puppeteerWarnings: string[] = [];
      if (fallbackReason === 'unavailable') {
        puppeteerWarnings.push(
          '浏览器引擎不可用，本次使用静态 HTTP 获取页面。如果页面依赖 JavaScript 渲染 SEO 标签（SPA/SSR），检测结果可能不完整。'
        );
      } else if (fallbackReason === 'error') {
        puppeteerWarnings.push(
          '浏览器引擎打开页面失败，已回退到静态 HTTP 获取。JS 动态渲染的 SEO 内容（如 SPA 页面的 meta 标签）可能未被检测到。'
        );
      }

      const results: SeoResultDetails = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {
          totalChecks: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          score: 0,
        },
        renderMode: jsRendered ? 'browser' : 'static',
      };

      // 根据前端开关构建检测任务列表
      const checkTasks: Array<{
        key: string;
        label: string;
        run: () => Promise<SeoCheckResult> | SeoCheckResult;
      }> = [];

      // checkSEO → 核心 SEO 检测
      if (validatedConfig.checkSEO !== false) {
        checkTasks.push(
          { key: 'meta', label: 'Meta 标签', run: () => this.checkMetaTags($) },
          { key: 'headings', label: '标题结构', run: () => this.checkHeadings($) },
          { key: 'images', label: '图片优化', run: () => this.checkImages($) },
          { key: 'links', label: '链接结构', run: () => this.checkLinks($) },
          {
            key: 'canonical',
            label: 'Canonical URL',
            run: () => this.checkCanonical($, validatedConfig.url),
          },
          { key: 'openGraph', label: 'Open Graph', run: () => this.checkOpenGraph($) },
          { key: 'twitterCard', label: 'Twitter Card', run: () => this.checkTwitterCard($) },
          { key: 'hreflang', label: 'Hreflang 国际化', run: () => this.checkHreflang($) }
        );
      }

      // checkBestPractices → 最佳实践
      if (validatedConfig.checkBestPractices !== false) {
        checkTasks.push(
          { key: 'structuredData', label: '结构化数据', run: () => this.checkStructuredData($) },
          {
            key: 'robots',
            label: 'Robots.txt',
            run: () => this.checkRobotsTxt(validatedConfig.url),
          },
          { key: 'sitemap', label: 'Sitemap', run: () => this.checkSitemap(validatedConfig.url) }
        );
      }

      // 死链检测（抽样检测页面内链接可达性）
      if (validatedConfig.checkSEO !== false) {
        checkTasks.push({
          key: 'deadLinks',
          label: '死链检测',
          run: () => this.checkDeadLinks($, validatedConfig.url),
        });
      }

      // checkMobile → 移动端优化
      if (validatedConfig.checkMobile !== false) {
        checkTasks.push({
          key: 'mobile',
          label: '移动端优化',
          run: () => this.checkMobileOptimization(validatedConfig.url, $),
        });
      }

      // checkPerformance → 内容质量与页面性能
      if (validatedConfig.checkPerformance !== false) {
        checkTasks.push({
          key: 'content',
          label: '内容质量',
          run: () => this.checkContentQuality($),
        });
      }

      // checkAccessibility → 可访问性基础检测
      if (validatedConfig.checkAccessibility !== false) {
        checkTasks.push({
          key: 'accessibility',
          label: '可访问性',
          run: () => this.checkAccessibility($),
        });
      }

      // favicon + HTTPS 重定向检测（最佳实践）
      if (validatedConfig.checkBestPractices !== false) {
        checkTasks.push(
          {
            key: 'favicon',
            label: 'Favicon',
            run: () => this.checkFavicon($, validatedConfig.url),
          },
          {
            key: 'httpsRedirect',
            label: 'HTTPS 重定向',
            run: () => this.checkHttpsRedirect(validatedConfig.url),
          }
        );
      }

      // checkPWA → PWA 检测
      if (validatedConfig.checkPWA) {
        checkTasks.push({
          key: 'pwa',
          label: 'PWA',
          run: () => this.checkPWA($, validatedConfig.url),
        });
      }

      const progressStep = checkTasks.length > 0 ? 75 / checkTasks.length : 75;
      let currentProgress = 15;

      for (const task of checkTasks) {
        if (this.isCancelled(testId)) throw new Error('测试已取消');
        this.updateTestProgress(testId, currentProgress, `执行${task.label}检查`);
        try {
          results.checks[task.key] = await task.run();
        } catch (checkError) {
          const msg = checkError instanceof Error ? checkError.message : String(checkError);
          results.checks[task.key] = {
            status: 'failed',
            score: 0,
            issues: [`${task.label}检查异常: ${msg}`],
          };
        }
        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 92, '计算SEO评分和竞争力分析');

      results.summary = this.calculateSeoScore(results.checks);
      results.totalTime = Date.now() - ((this.activeTests.get(testId)?.startTime as number) || 0);
      results.detailedAnalysis = {
        strengths: this.identifyStrengths(results.checks),
        weaknesses: this.identifyWeaknesses(results.checks),
        competitorInsights: await this.generateCompetitorInsights(results.summary.score || 0),
        actionPlan: this.generateActionPlan(results.summary.recommendations),
      };

      this.updateTestProgress(testId, 100, 'SEO分析完成');
      void insertExecutionLog(
        testId,
        'info',
        `SEO 分析完成 · 得分 ${results.summary.score ?? 0} · 耗时 ${((results.totalTime || 0) / 1000).toFixed(1)}s`,
        {
          score: results.summary.score ?? 0,
          executionTime: (results.totalTime || 0) / 1000,
        }
      );

      const warnings: string[] = [...puppeteerWarnings];
      const errors: string[] = [];
      Object.values(results.checks).forEach(check => {
        if (!check) return;
        const issues = Array.isArray(check.issues) ? check.issues : [];
        if (check.status === 'failed') {
          if (issues.length > 0) {
            errors.push(...issues.map(issue => String(issue)));
          } else {
            errors.push('SEO检查失败');
          }
        } else if (check.status === 'warning') {
          warnings.push(...issues.map(issue => String(issue)));
        }
      });

      // 打断循环引用：normalizedResult.summary 和 details.summary 不能是同一个对象
      // 否则 JSON.stringify / socket.io hasBinary 遍历时会无限递归
      // 使用 JSON 深拷贝彻底打断所有嵌套引用（recommendations.all 中的对象
      // 会被 generateActionPlan 复用到 immediate/shortTerm/longTerm，浅拷贝不够）
      const summarySnapshot: SeoSummary = JSON.parse(JSON.stringify(results.summary)) as SeoSummary;

      const normalizedResult: SeoNormalizedResult = {
        testId,
        status: TestStatus.COMPLETED,
        score: results.summary.score ?? 0,
        summary: summarySnapshot,
        metrics: results.checks,
        warnings,
        errors,
        details: results,
      };

      const finalResult: SeoFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: { ...summarySnapshot },
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results: normalizedResult,
      });

      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      if (this.listenerCount('complete') > 0) {
        this.emit('complete', { testId, result: finalResult });
      }

      this.cancelledTests.delete(testId);
      // 延迟清理已完成的测试记录，防止内存泄漏
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
      const message = diagnoseNetworkError(error, 'SEO 分析', config.url);
      const errorResult: SeoFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        error: rawMessage,
        status: TestStatus.FAILED,
        score: 0,
        summary: {
          totalChecks: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          score: 0,
        },
        warnings: [],
        errors: [message],
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: TestStatus.FAILED,
        error: rawMessage,
      });

      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      if (this.listenerCount('error') > 0) {
        this.emit('error', { testId, error: message });
      }

      this.cancelledTests.delete(testId);
      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
        },
        5 * 60 * 1000
      );

      return errorResult;
    }
  }

  checkMetaTags($: CheerioAPI): SeoCheckResult {
    const results: Record<string, unknown> = {
      title: null,
      description: null,
      keywords: null,
      viewport: null,
      charset: null,
      score: 0,
      issues: [] as string[],
    };

    const titleSelection = $('title');
    const title =
      typeof titleSelection.first === 'function' ? titleSelection.first() : titleSelection;
    if ((title?.length || 0) > 0) {
      const titleText = (typeof title.text === 'function' ? title.text() : '').trim();
      results.title = {
        content: titleText,
        length: titleText.length,
        present: true,
      };

      if (titleText.length < 30) {
        (results.issues as string[]).push('标题过短（建议30-60字符）');
      } else if (titleText.length > 60) {
        (results.issues as string[]).push('标题过长（建议30-60字符）');
      } else {
        results.score = (results.score as number) + 25;
      }
    } else {
      results.title = { present: false, diagnosis: 'not_configured' };
      (results.issues as string[]).push('缺少 title 标签（页面未配置 <title>）');
      (results.issues as string[]).push(
        '修复示例：在 <head> 中添加 <title>你的页面标题 - 网站名</title>（建议 30-60 字符）'
      );
    }

    const descriptionSelection = $('meta[name="description"]');
    const description = descriptionSelection.first?.() ?? descriptionSelection;
    if ((description?.length || 0) > 0) {
      const descContent = description.attr?.('content') ?? '';
      results.description = {
        content: descContent,
        length: descContent.length,
        present: true,
      };

      if (descContent.length === 0) {
        (results.issues as string[]).push('meta description 存在但内容为空');
      } else if (descContent.length < 120) {
        (results.issues as string[]).push('描述过短（建议120-160字符）');
      } else if (descContent.length > 160) {
        (results.issues as string[]).push('描述过长（建议120-160字符）');
      } else {
        results.score = (results.score as number) + 25;
      }
    } else {
      results.description = { present: false, diagnosis: 'not_configured' };
      (results.issues as string[]).push('缺少 meta description（页面未配置该标签）');
      (results.issues as string[]).push(
        '修复示例：<meta name="description" content="简洁描述页面内容，120-160 字符">'
      );
    }

    const viewportSelection = $('meta[name="viewport"]');
    const viewport = viewportSelection.first?.() ?? viewportSelection;
    if ((viewport?.length || 0) > 0) {
      results.viewport = {
        content: viewport.attr ? viewport.attr('content') : undefined,
        present: true,
      };
      results.score = (results.score as number) + 25;
    } else {
      results.viewport = { present: false, diagnosis: 'not_configured' };
      (results.issues as string[]).push('缺少 viewport meta 标签');
      (results.issues as string[]).push(
        '修复示例：<meta name="viewport" content="width=device-width, initial-scale=1">'
      );
    }

    const charsetSelection = $('meta[charset]');
    const charset = charsetSelection.first?.() ?? charsetSelection;
    if ((charset?.length || 0) > 0) {
      results.charset = {
        content: charset.attr ? charset.attr('charset') : undefined,
        present: true,
      };
      results.score = (results.score as number) + 25;
    } else {
      // 也检查 http-equiv="Content-Type" 形式的 charset 声明
      const httpEquivCharset = $('meta[http-equiv="Content-Type"]');
      const httpEquivContent = httpEquivCharset?.attr?.('content') ?? '';
      if (httpEquivContent.toLowerCase().includes('charset=')) {
        results.charset = {
          content: httpEquivContent,
          present: true,
          viaHttpEquiv: true,
        };
        results.score = (results.score as number) + 25;
      } else {
        results.charset = { present: false, diagnosis: 'not_configured' };
        (results.issues as string[]).push('缺少 charset 声明');
        (results.issues as string[]).push(
          '修复示例：<meta charset="UTF-8">（应放在 <head> 的第一行）'
        );
      }
    }

    // keywords（不影响评分，仅记录。Google 已不将 keywords 作为排名信号，但部分搜索引擎仍参考）
    const keywordsSelection = $('meta[name="keywords"]');
    const keywords = keywordsSelection.first?.() ?? keywordsSelection;
    const keywordsContent = keywords?.attr?.('content') ?? '';
    if ((keywords?.length || 0) > 0 && keywordsContent) {
      const keywordList = keywordsContent
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
      results.keywords = {
        content: keywordsContent,
        count: keywordList.length,
        present: true,
      };
      if (keywordList.length > 10) {
        (results.issues as string[]).push(
          'keywords 过多（建议不超过 10 个），关键词堆砌可能被搜索引擎惩罚'
        );
      }
    } else {
      results.keywords = { present: false, diagnosis: 'not_configured' };
    }

    return {
      status:
        (results.score as number) >= 75
          ? 'passed'
          : (results.score as number) >= 50
            ? 'warning'
            : 'failed',
      score: results.score as number,
      details: results,
    };
  }

  checkHeadings($: CheerioAPI): SeoCheckResult {
    const headings: Array<Record<string, unknown>> = [];
    let score = 100;
    const issues: string[] = [];

    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const $elem = $(elem);
      headings.push({
        tag: ((elem as { tagName?: string }).tagName || '').toLowerCase(),
        text: ($elem.text?.() ?? '').trim(),
        level: parseInt(((elem as { tagName?: string }).tagName || 'h0').charAt(1), 10),
      });
    });

    if (headings.length === 0) {
      return {
        status: 'failed',
        score: 0,
        details: { headings: [], h1Count: 0, totalHeadings: 0 },
        issues: ['页面缺少任何标题结构，严重影响 SEO'],
      };
    }

    // ── 1. H1 数量（30 分）──
    const h1Count = headings.filter(h => h.tag === 'h1').length;
    if (h1Count === 1) {
      score -= 0; // 满分
    } else if (h1Count === 0) {
      score -= 30;
      issues.push('缺少 H1 标签');
    } else {
      score -= 15;
      issues.push(`H1 标签过多（${h1Count} 个，建议只有一个）`);
    }

    // ── 2. 层级跳跃检测（25 分）──
    let levelSkips = 0;
    for (let i = 1; i < headings.length; i++) {
      const prevLevel = headings[i - 1].level as number;
      const currLevel = headings[i].level as number;
      // 只检查向下跳跃（h1→h3 跳过了 h2），向上回退是正常的
      if (currLevel > prevLevel + 1) {
        levelSkips++;
      }
    }
    if (levelSkips > 0) {
      score -= Math.min(25, levelSkips * 8);
      issues.push(`标题层级跳跃 ${levelSkips} 处（如 H1 直接到 H3），影响内容结构语义`);
    }

    // ── 3. 空标题检测（20 分）──
    const emptyHeadings = headings.filter(h => !(h.text as string));
    if (emptyHeadings.length > 0) {
      score -= Math.min(20, emptyHeadings.length * 7);
      issues.push(`${emptyHeadings.length} 个标题内容为空`);
    }

    // ── 4. 标题过长检测（15 分）──
    const longHeadings = headings.filter(h => (h.text as string).length > 70);
    if (longHeadings.length > 0) {
      score -= Math.min(15, longHeadings.length * 5);
      issues.push(`${longHeadings.length} 个标题超过 70 字符，建议精简`);
    }

    // ── 5. H1 文本与 title 一致性（10 分，仅提示）──
    const h1Text = headings.find(h => h.tag === 'h1');
    const titleText = ($('title').text?.() ?? '').trim();
    if (h1Text && titleText && h1Text.text !== titleText) {
      // 不扣分，仅作为建议
      const h1Str = h1Text.text as string;
      if (!titleText.includes(h1Str) && !h1Str.includes(titleText)) {
        issues.push('H1 文本与 <title> 差异较大，建议保持一致以强化主题信号');
      }
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        headings: headings.slice(0, 20),
        h1Count,
        totalHeadings: headings.length,
        levelSkips,
        emptyCount: emptyHeadings.length,
        longCount: longHeadings.length,
      },
      issues,
    };
  }

  checkImages($: CheerioAPI): SeoCheckResult {
    // SEO 视角的图片优化检查：关注搜索引擎爬虫可理解的信号。
    // alt 属性的可访问性深度检查已由独立的 Accessibility 引擎负责。
    const images: Array<Record<string, unknown>> = [];
    let score = 100;
    const issues: string[] = [];

    let missingAlt = 0;
    let missingDimensions = 0;
    let missingLazyLoading = 0;
    let dataUriCount = 0;

    $('img').each((_, elem) => {
      const $img = $(elem);
      const src = $img.attr ? $img.attr('src') : undefined;
      const alt = $img.attr ? $img.attr('alt') : undefined;
      const hasWidth = !!($img.attr ? $img.attr('width') : undefined);
      const hasHeight = !!($img.attr ? $img.attr('height') : undefined);
      const loading = $img.attr ? $img.attr('loading') : undefined;
      const isDataUri = src?.startsWith('data:');

      if (!alt && alt !== '') missingAlt++;
      if (!hasWidth || !hasHeight) missingDimensions++;
      if (!loading && !isDataUri) missingLazyLoading++;
      if (isDataUri) dataUriCount++;

      images.push({
        src: isDataUri ? 'data:...' : src,
        hasAlt: alt !== undefined,
        hasDimensions: hasWidth && hasHeight,
        loading: loading || null,
      });
    });

    const totalImages = images.length;

    // alt 属性（SEO 排名信号，轻量扣分；深度检查由 Accessibility 引擎负责）
    if (totalImages > 0 && missingAlt > 0) {
      const ratio = missingAlt / totalImages;
      score -= Math.round(ratio * 15);
      issues.push(`${missingAlt}/${totalImages} 张图片缺少 alt 属性（影响图片搜索排名）`);
    }

    // 尺寸属性（防止 CLS，搜索引擎关注的页面体验信号）
    if (totalImages > 0 && missingDimensions > 0) {
      const ratio = missingDimensions / totalImages;
      score -= Math.round(ratio * 10);
      issues.push(
        `${missingDimensions}/${totalImages} 张图片缺少 width/height 属性（可能导致布局偏移）`
      );
    }

    // lazy loading（页面性能信号）
    if (totalImages > 3 && missingLazyLoading > totalImages / 2) {
      score -= 10;
      issues.push(`大部分图片未设置 loading="lazy"，建议对首屏外图片启用懒加载`);
    }

    // data URI 过多（影响 HTML 体积和可缓存性）
    if (dataUriCount > 3) {
      score -= 5;
      issues.push(`${dataUriCount} 张图片使用 data URI 内联，建议改用外部文件以利于缓存`);
    }

    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalImages,
        missingAlt,
        missingDimensions,
        missingLazyLoading,
        dataUriCount,
        images: images.slice(0, 10),
      },
      issues,
    };
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
    }

    const status = test?.status || 'running';
    if (this.progressCallback) {
      this.progressCallback({ testId, progress, message, status });
    }

    // 同步更新 progressTracker（与其他引擎保持一致，供 run() 中的 onProgress 回调使用）
    const current = this.progressTracker.get(testId);
    this.progressTracker.set(testId, {
      status: TestStatus.RUNNING,
      progress,
      currentStep: message,
      startTime: current?.startTime || new Date(),
      messages: current?.messages ? [...current.messages, message].slice(-20) : [message],
    });

    if (this.listenerCount('progress') > 0) {
      this.emit('progress', { testId, progress, message });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  setProgressCallback(callback: (progress: SeoProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: SeoFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  checkLinks($: CheerioAPI): SeoCheckResult {
    const links: Array<Record<string, unknown>> = [];
    let score = 100;
    const issues: string[] = [];

    let emptyLinkCount = 0;
    let noTextCount = 0;
    let missingNoopenerCount = 0;
    let nofollowCount = 0;
    let sponsoredCount = 0;
    const anchorTexts = new Set<string>();

    $('a').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr ? $link.attr('href') : undefined;
      const text = ($link.text ? $link.text() : '').trim();
      const title = $link.attr ? $link.attr('title') : undefined;
      const target = $link.attr ? $link.attr('target') : undefined;
      const rel = $link.attr ? $link.attr('rel') : undefined;
      const relStr = (rel || '').toLowerCase();

      if (relStr.includes('nofollow')) nofollowCount++;
      if (relStr.includes('sponsored') || relStr.includes('ugc')) sponsoredCount++;
      if (text) anchorTexts.add(text.toLowerCase().slice(0, 50));

      const linkInfo = {
        href: href || '',
        text,
        hasTitle: !!title,
        target: target || '_self',
        rel: rel || '',
      };

      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        if (target === '_blank' && !relStr.includes('noopener')) {
          missingNoopenerCount++;
        }
      }

      if (!href || href === '#') {
        emptyLinkCount++;
      }

      if (!text && !title) {
        noTextCount++;
      }

      links.push(linkInfo);
    });

    const internalLinks = links.filter(l => !(l.href as string).startsWith('http'));
    const externalLinks = links.filter(l => (l.href as string).startsWith('http'));

    // ── 评分 ──
    // 1. 空链接扣分（最多 -15）
    if (emptyLinkCount > 0) {
      score -= Math.min(15, emptyLinkCount * 3);
      issues.push(`${emptyLinkCount} 个空链接或占位符链接`);
    }

    // 2. 缺少描述文本扣分（最多 -15）
    if (noTextCount > 0) {
      score -= Math.min(15, noTextCount * 3);
      issues.push(`${noTextCount} 个链接缺少描述文本（影响搜索引擎理解链接用途）`);
    }

    // 3. 外部链接缺少 noopener（最多 -10）
    if (missingNoopenerCount > 0) {
      score -= Math.min(10, missingNoopenerCount * 3);
      issues.push(`${missingNoopenerCount} 个外部链接缺少 rel="noopener"（安全风险）`);
    }

    // 4. 内外链比例分析
    if (links.length > 5 && externalLinks.length > 0) {
      const externalRatio = externalLinks.length / links.length;
      if (externalRatio > 0.7) {
        score -= 10;
        issues.push('外部链接占比过高（>70%），建议增加内部链接以传递页面权重');
      }
    }

    // 5. 锚文本多样性
    if (links.length > 10) {
      const diversityRatio = anchorTexts.size / links.length;
      if (diversityRatio < 0.3) {
        score -= 5;
        issues.push('链接锚文本多样性不足，建议使用更丰富的描述性文本');
      }
    }

    // 6. 无内部链接（页面孤岛）
    if (links.length > 0 && internalLinks.length === 0) {
      score -= 10;
      issues.push('页面没有内部链接，可能成为"孤岛页面"，影响权重传递');
    }

    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalLinks: links.length,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        nofollowCount,
        sponsoredCount,
        anchorTextDiversity: anchorTexts.size,
        links: links.slice(0, 10),
      },
      issues,
    };
  }

  async checkDeadLinks($: CheerioAPI, baseUrl: string): Promise<SeoCheckResult> {
    const issues: string[] = [];
    let score = 100;
    const deadLinks: Array<{ url: string; status: number | string }> = [];
    const checkedCount = { total: 0, dead: 0 };

    // 收集页面内所有绝对链接（用 Set 去重，O(1)）
    let baseHost: string;
    try {
      baseHost = new URL(baseUrl).hostname;
    } catch {
      baseHost = '';
    }
    const hrefSet = new Set<string>();
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr?.('href') ?? '';
      if (
        href &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        !href.startsWith('javascript:')
      ) {
        try {
          const resolved = new URL(href, baseUrl).toString();
          if (hrefSet.has(resolved)) return;
          hrefSet.add(resolved);
          const linkHost = new URL(resolved).hostname;
          if (linkHost === baseHost) {
            internalLinks.push(resolved);
          } else {
            externalLinks.push(resolved);
          }
        } catch {
          // 无效 URL 忽略
        }
      }
    });

    // 抽样策略：优先检测站内链接（最多 12 个），再随机抽样站外链接（最多 8 个）
    const MAX_INTERNAL = 12;
    const MAX_EXTERNAL = 8;
    const MAX_SAMPLE = 20;
    const shuffled = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);
    const sample = [
      ...internalLinks.slice(0, MAX_INTERNAL),
      ...shuffled(externalLinks).slice(0, MAX_EXTERNAL),
    ].slice(0, MAX_SAMPLE);

    const CONCURRENCY = 5;
    const reqHeaders = { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)' };

    for (let i = 0; i < sample.length; i += CONCURRENCY) {
      const batch = sample.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async linkUrl => {
          try {
            // 先 HEAD（省带宽），被 405 拒绝时回退到 GET
            let resp = await axios.head(linkUrl, {
              timeout: 6000,
              maxRedirects: 3,
              validateStatus: () => true,
              headers: reqHeaders,
            });
            if (resp.status === 405) {
              resp = await axios.get(linkUrl, {
                timeout: 6000,
                maxRedirects: 3,
                validateStatus: () => true,
                headers: reqHeaders,
                maxContentLength: 1024 * 1024, // 1MB（仅需状态码）
              });
            }
            return { url: linkUrl, status: resp.status };
          } catch {
            return { url: linkUrl, status: 'error' as const };
          }
        })
      );

      for (const r of results) {
        checkedCount.total++;
        const statusNum = typeof r.status === 'number' ? r.status : 0;
        if (statusNum >= 400 || statusNum === 0) {
          checkedCount.dead++;
          deadLinks.push(r);
          issues.push(`死链 (${r.status}): ${r.url}`);
          score -= statusNum >= 500 ? 10 : 8;
        }
      }
    }

    return {
      status: score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        checkedLinks: checkedCount.total,
        deadLinks: checkedCount.dead,
        sampleSize: sample.length,
        totalLinksOnPage: hrefSet.size,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        deadLinksList: deadLinks.slice(0, 10),
      },
      issues,
    };
  }

  checkFavicon($: CheerioAPI, baseUrl: string): SeoCheckResult {
    let score = 0;
    const issues: string[] = [];
    const details: Record<string, unknown> = {};

    // 检查 <link rel="icon"> 或 <link rel="shortcut icon">
    const iconLink = $('link[rel="icon"], link[rel="shortcut icon"]');
    const hasLinkIcon = (iconLink.length || 0) > 0;
    if (hasLinkIcon) {
      const href = iconLink.first?.()?.attr?.('href') ?? iconLink.attr?.('href') ?? '';
      details.iconHref = href;
      score += 50;
    } else {
      issues.push('缺少 <link rel="icon"> 标签');
    }

    // 检查 apple-touch-icon
    const appleTouchIcon = $(
      'link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
    );
    const hasAppleIcon = (appleTouchIcon.length || 0) > 0;
    if (hasAppleIcon) {
      details.appleTouchIcon =
        appleTouchIcon.first?.()?.attr?.('href') ?? appleTouchIcon.attr?.('href') ?? '';
      score += 30;
    } else {
      issues.push('缺少 apple-touch-icon（影响 iOS 添加到主屏幕的图标）');
    }

    // 检查是否有多尺寸 favicon
    const sizes = new Set<string>();
    $('link[rel="icon"][sizes]').each((_, elem) => {
      const s = $(elem).attr?.('sizes') ?? '';
      if (s) sizes.add(s);
    });
    if (sizes.size >= 2) {
      score += 20;
      details.sizes = Array.from(sizes);
    } else if (sizes.size === 1) {
      score += 10;
      details.sizes = Array.from(sizes);
    } else if (hasLinkIcon) {
      issues.push('建议提供多尺寸 favicon（如 16x16, 32x32, 192x192）');
    }

    void baseUrl;

    return {
      status: score >= 50 ? 'passed' : score >= 30 ? 'warning' : 'failed',
      score: Math.min(100, score),
      details: { ...details, hasLinkIcon, hasAppleIcon },
      issues,
    };
  }

  async checkHttpsRedirect(url: string): Promise<SeoCheckResult> {
    const issues: string[] = [];
    let score = 0;

    try {
      const urlObj = new URL(url);

      // 如果目标本身就是 HTTPS，检查 HTTP 版本是否正确重定向
      if (urlObj.protocol === 'https:') {
        score += 50; // 已经使用 HTTPS

        const httpUrl = url.replace(/^https:/, 'http:');
        try {
          const resp = await axios.get(httpUrl, {
            timeout: 5000,
            maxRedirects: 0,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)' },
          });

          if (resp.status >= 300 && resp.status < 400) {
            const location = resp.headers?.location || '';
            if (location.startsWith('https://')) {
              score += 50;
            } else {
              score += 20;
              issues.push('HTTP 重定向目标不是 HTTPS');
            }
          } else {
            issues.push('HTTP 版本未重定向到 HTTPS（影响 SEO 和安全）');
          }
        } catch {
          // HTTP 端口可能未开放，不扣分
          score += 30;
        }
      } else {
        issues.push('网站未使用 HTTPS（Google 将 HTTPS 作为排名信号）');
      }
    } catch {
      issues.push('无法检测 HTTPS 重定向');
    }

    return {
      status: score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.min(100, score),
      details: { score },
      issues,
    };
  }

  checkStructuredData($: CheerioAPI): SeoCheckResult {
    const structuredData: Array<Record<string, unknown>> = [];
    let score = 0;
    const issues: string[] = [];

    // Schema.org 常见类型的必填/推荐属性（用于深度验证）
    const SCHEMA_REQUIRED_PROPS: Record<string, { required: string[]; recommended: string[] }> = {
      Article: {
        required: ['headline', 'author'],
        recommended: ['datePublished', 'image', 'publisher'],
      },
      NewsArticle: {
        required: ['headline', 'author', 'datePublished'],
        recommended: ['image', 'publisher'],
      },
      BlogPosting: {
        required: ['headline', 'author'],
        recommended: ['datePublished', 'image', 'publisher'],
      },
      Product: {
        required: ['name'],
        recommended: ['image', 'description', 'offers', 'brand', 'sku'],
      },
      Organization: {
        required: ['name'],
        recommended: ['url', 'logo', 'contactPoint'],
      },
      LocalBusiness: {
        required: ['name', 'address'],
        recommended: ['telephone', 'openingHours', 'geo', 'image'],
      },
      Person: { required: ['name'], recommended: ['url', 'image', 'jobTitle'] },
      WebSite: { required: ['name', 'url'], recommended: ['potentialAction'] },
      WebPage: { required: ['name'], recommended: ['url', 'description'] },
      BreadcrumbList: { required: ['itemListElement'], recommended: [] },
      FAQPage: { required: ['mainEntity'], recommended: [] },
      HowTo: { required: ['name', 'step'], recommended: ['image', 'totalTime'] },
      Recipe: {
        required: ['name', 'recipeIngredient'],
        recommended: ['image', 'author', 'recipeInstructions'],
      },
      Event: {
        required: ['name', 'startDate', 'location'],
        recommended: ['endDate', 'image', 'offers', 'performer'],
      },
      VideoObject: {
        required: ['name', 'uploadDate', 'thumbnailUrl'],
        recommended: ['description', 'contentUrl', 'duration'],
      },
      Review: { required: ['itemReviewed', 'reviewRating'], recommended: ['author'] },
      AggregateRating: { required: ['ratingValue', 'reviewCount'], recommended: ['bestRating'] },
    };

    // 验证单个 JSON-LD 对象
    const validateJsonLdItem = (data: Record<string, unknown>, index: number) => {
      const schemaType = String(data['@type'] || 'Unknown');
      const context = data['@context'];
      const entry: Record<string, unknown> = {
        type: 'JSON-LD',
        schema: schemaType,
        valid: true,
        missingRequired: [] as string[],
        missingRecommended: [] as string[],
      };

      // 验证 @context
      const ctxStr = typeof context === 'string' ? context : '';
      if (context && !ctxStr.includes('schema.org')) {
        entry.contextWarning = `@context 不是 schema.org（当前: ${ctxStr.substring(0, 60)})`;
      }

      // 验证必填/推荐属性
      const spec = SCHEMA_REQUIRED_PROPS[schemaType];
      if (spec) {
        const missingReq = spec.required.filter(prop => data[prop] == null);
        const missingRec = spec.recommended.filter(prop => data[prop] == null);
        if (missingReq.length > 0) {
          entry.valid = false;
          entry.missingRequired = missingReq;
          issues.push(
            `JSON-LD #${index + 1} (${schemaType}): 缺少必填属性 ${missingReq.join(', ')}`
          );
          score += 25; // 有类型但必填不全
        } else {
          score += 50; // 必填属性齐全
        }
        if (missingRec.length > 0) {
          entry.missingRecommended = missingRec;
        }
      } else {
        // 未知类型但语法正确
        score += 35;
      }

      structuredData.push(entry);
    };

    // JSON-LD（最推荐的结构化数据格式）
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const scriptContent = $(elem).html?.() ?? '';
        const data = JSON.parse(scriptContent as string);

        if (Array.isArray(data)) {
          // 顶层数组
          data.forEach((item, i) => {
            if (item && typeof item === 'object') validateJsonLdItem(item, i);
          });
        } else if (data && typeof data === 'object') {
          // 检查 @graph 数组（常见于 WordPress/Yoast SEO 等插件）
          const graph = (data as { '@graph'?: unknown[] })['@graph'];
          if (Array.isArray(graph)) {
            graph.forEach((item, i) => {
              if (item && typeof item === 'object')
                validateJsonLdItem(item as Record<string, unknown>, i);
            });
          } else {
            validateJsonLdItem(data as Record<string, unknown>, 0);
          }
        }
      } catch (error) {
        issues.push(`JSON-LD 数据格式错误: ${(error as Error).message}`);
        structuredData.push({
          type: 'JSON-LD',
          valid: false,
          error: (error as Error).message,
        });
      }
    });

    // Microdata（itemscope/itemprop）
    const hasItemScope = ($('[itemscope]').length || 0) > 0;
    if (hasItemScope) {
      const microdataTypes = new Set<string>();
      $('[itemscope]').each((_, el) => {
        const itemtype = $(el).attr('itemtype') || '';
        const typeName = itemtype.split('/').pop() || 'Unknown';
        microdataTypes.add(typeName);
      });
      structuredData.push({
        type: 'Microdata',
        count: $('[itemscope]').length,
        schemas: Array.from(microdataTypes),
        valid: true,
      });
      score += 30;
    }

    // RDFa
    const hasRdfa = ($('[typeof], [property]').not('meta[property^="og:"]').length || 0) > 0;
    if (hasRdfa) {
      structuredData.push({ type: 'RDFa', valid: true });
      score += 20;
    }

    if (structuredData.length === 0) {
      issues.push('未检测到结构化数据（JSON-LD / Microdata / RDFa）');
    }

    score = Math.min(100, score);

    return {
      status: score >= 50 ? 'passed' : score >= 30 ? 'warning' : 'failed',
      score,
      details: {
        structuredData,
        hasJsonLd: structuredData.some(d => d.type === 'JSON-LD'),
        hasMicrodata: hasItemScope,
        hasRdfa,
      },
      issues,
    };
  }

  async checkRobotsTxt(url: string): Promise<SeoCheckResult> {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500,
      });

      if (response.status === 200) {
        const content = response.data as string;
        const lines = content.split('\n').filter(line => line.trim());

        const hasUserAgent = lines.some(line => line.toLowerCase().startsWith('user-agent:'));
        const hasSitemap = lines.some(line => line.toLowerCase().startsWith('sitemap:'));
        const hasDisallow = lines.some(line => line.toLowerCase().startsWith('disallow:'));
        const hasAllow = lines.some(line => line.toLowerCase().startsWith('allow:'));

        let score = 50;
        const issues: string[] = [];

        if (!hasUserAgent) {
          issues.push('robots.txt缺少User-agent指令');
          score -= 20;
        }

        if (!hasSitemap) {
          issues.push('robots.txt中未指定sitemap');
          score -= 10;
        } else {
          score += 30;
        }

        if (hasDisallow || hasAllow) {
          score += 20;
        }

        return {
          status: 'passed',
          score,
          details: {
            exists: true,
            url: robotsUrl,
            hasUserAgent,
            hasSitemap,
            hasDirectives: hasDisallow || hasAllow,
            size: content.length,
          },
          issues,
        };
      }

      return {
        status: 'warning',
        score: 0,
        details: {
          exists: false,
          url: robotsUrl,
          statusCode: response.status,
          diagnosis: 'not_found',
        },
        issues: [
          `robots.txt 不存在（HTTP ${response.status}）`,
          `排查步骤：1) 确认文件已部署到 ${robotsUrl}；2) 检查服务器是否屏蔽了该路径；3) 确认返回 200 状态码`,
          `配置示例：\nUser-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${new URL(robotsUrl).origin}/sitemap.xml`,
        ],
      };
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: robotsUrl,
          error: (error as Error).message,
          diagnosis: 'network_error',
        },
        issues: [
          `无法访问 robots.txt: ${(error as Error).message}`,
          `排查步骤：1) 确认服务器可达；2) 检查防火墙/CDN 是否屏蔽了 ${robotsUrl}；3) 确认 DNS 解析正常`,
        ],
      };
    }
  }

  async checkSitemap(url: string): Promise<SeoCheckResult> {
    const urlObj = new URL(url);
    const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;

    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500,
      });

      if (response.status === 200) {
        const content = response.data as string;
        const $ = cheerio.load(content, { xmlMode: true }) as CheerioAPI;

        const urls = $('url').length || 0;
        const hasLastmod = ($('lastmod').length || 0) > 0;
        const hasChangefreq = ($('changefreq').length || 0) > 0;
        const hasPriority = ($('priority').length || 0) > 0;

        let score = 50;
        const issues: string[] = [];

        if (urls === 0) {
          issues.push('sitemap.xml为空或格式错误');
          score = 0;
        } else {
          score += 30;
        }

        if (hasLastmod) {
          score += 10;
        } else {
          issues.push('sitemap缺少lastmod标签');
        }

        if (hasChangefreq) {
          score += 5;
        }

        if (hasPriority) {
          score += 5;
        }

        return {
          status: score >= 50 ? 'passed' : 'warning',
          score,
          details: {
            exists: true,
            url: sitemapUrl,
            urlCount: urls,
            hasLastmod,
            hasChangefreq,
            hasPriority,
          },
          issues,
        };
      }

      return {
        status: 'warning',
        score: 0,
        details: {
          exists: false,
          url: sitemapUrl,
          statusCode: response.status,
          diagnosis: 'not_found',
        },
        issues: [
          `sitemap.xml 不存在（HTTP ${response.status}）`,
          `排查步骤：1) 确认文件已部署到 ${sitemapUrl}；2) 检查 robots.txt 中是否声明了不同路径的 Sitemap；3) 尝试访问 /sitemap_index.xml 或 /sitemap-index.xml`,
          `配置示例：\n<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${new URL(sitemapUrl).origin}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`,
        ],
      };
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: sitemapUrl,
          error: (error as Error).message,
          diagnosis: 'network_error',
        },
        issues: [
          `无法访问 sitemap.xml: ${(error as Error).message}`,
          `排查步骤：1) 确认服务器可达；2) 检查防火墙/CDN 是否屏蔽了 ${sitemapUrl}；3) 确认 DNS 解析正常`,
        ],
      };
    }
  }

  calculateSeoScore(checks: Record<string, SeoCheckResult>) {
    let totalScore = 0;
    let totalWeight = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    // 权重设计理念：
    // - 核心 SEO 信号（meta/canonical/content/headings）权重均衡，避免单项失分过度拉低总分
    // - mobile 权重高（Google Mobile-First Indexing）
    // - 社交媒体（OG/TC）和国际化（hreflang）权重较低，缺失不应严重影响总分
    // - 最佳实践（robots/sitemap/favicon/https）权重适中
    // - pwa 为加分项，权重最低
    const weights: Record<string, number> = {
      meta: 12,
      headings: 10,
      images: 8,
      links: 8,
      canonical: 10,
      openGraph: 5,
      twitterCard: 3,
      hreflang: 2,
      structuredData: 8,
      robots: 5,
      sitemap: 5,
      deadLinks: 8,
      favicon: 3,
      httpsRedirect: 6,
      mobile: 12,
      content: 12,
      accessibility: 8,
      pwa: 3,
      performance: 10,
    };

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;

        totalScore += (score * weight) / 100;
        totalWeight += weight;

        if (checkResult.status === 'passed') {
          passed++;
        } else if (checkResult.status === 'failed') {
          failed++;
        } else if (checkResult.status === 'warning') {
          warnings++;
        }
      }
    }

    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

    return {
      totalChecks: Object.keys(checks).length,
      passed,
      failed,
      warnings,
      score: finalScore,
      grade: this.getGrade(finalScore),
      level: this.getSEOLevel(finalScore),
      breakdown: this.getScoreBreakdown(checks, weights),
      competitiveness: this.calculateCompetitiveness(finalScore),
      recommendations: this.generateRecommendations(checks),
    };
  }

  getGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  generateRecommendations(checks: Record<string, SeoCheckResult>): SeoRecommendations {
    const recommendations: SeoRecommendationItem[] = [];
    const actionableItems: SeoRecommendationItem[] = [];
    const quickWins: SeoRecommendationItem[] = [];

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && checkResult.issues && checkResult.issues.length > 0) {
        const categoryRecommendations: SeoRecommendationItem = {
          category: checkName,
          priority: this.getPriorityLevel(checkResult.status, checkResult.score),
          issues: checkResult.issues,
          estimatedImpact: this.calculateImpact(checkName, checkResult.score),
          difficulty: this.getDifficultyLevel(checkName),
          timeToImplement: this.getImplementationTime(checkName, checkResult.issues.length),
        };

        recommendations.push(categoryRecommendations);

        if (
          categoryRecommendations.difficulty <= 3 &&
          categoryRecommendations.estimatedImpact >= 7
        ) {
          actionableItems.push(categoryRecommendations);
        }

        if (
          categoryRecommendations.timeToImplement <= 30 &&
          categoryRecommendations.estimatedImpact >= 5
        ) {
          quickWins.push(categoryRecommendations);
        }
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.estimatedImpact - a.estimatedImpact;
    });

    return {
      all: recommendations,
      actionable: actionableItems,
      quickWins,
      summary: {
        total: recommendations.length,
        critical: recommendations.filter(r => r.priority === 'critical').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length,
      },
    };
  }

  async stopTest(testId: string) {
    this.cancelledTests.add(testId);
    const test = this.activeTests.get(testId);
    if (test && test.status === TestStatus.RUNNING) {
      test.status = TestStatus.CANCELLED;
      this.activeTests.set(testId, test);
      this.progressTracker.set(testId, {
        status: TestStatus.CANCELLED,
        progress: test.progress || 0,
        currentStep: '已取消',
        startTime: new Date(test.startTime || Date.now()),
        messages: ['测试已取消'],
      });
      return true;
    }
    return false;
  }

  private isCancelled(testId?: string): boolean {
    return testId ? this.cancelledTests.has(testId) : false;
  }

  getSEOLevel(score: number): SeoCompetitiveness {
    if (score >= 90) return { level: 'Excellent', description: '优秀：SEO优化非常完善' };
    if (score >= 80) return { level: 'Good', description: '良好：SEO基础扎实，还有优化空间' };
    if (score >= 70) return { level: 'Fair', description: '一般：需要重点优化SEO策略' };
    if (score >= 60) return { level: 'Poor', description: '较差：SEO存在重大问题' };
    return { level: 'Very Poor', description: '很差：急需全面SEO优化' };
  }

  getScoreBreakdown(
    checks: Record<string, SeoCheckResult>,
    weights: Record<string, number>
  ): SeoScoreBreakdown {
    const breakdown: Record<string, SeoScoreBreakdownItem> = {};
    let totalPossibleScore = 0;

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;

        breakdown[checkName] = {
          score,
          weight,
          contribution: Math.round((score * weight) / 100),
          status: checkResult.status,
        };

        totalPossibleScore += weight;
      }
    }

    return { breakdown, totalPossibleScore };
  }

  calculateCompetitiveness(score: number): SeoCompetitiveness {
    // 必须从高到低排列，避免 JS 对象数字键升序遍历导致低阈值先匹配
    const levels: Array<{ threshold: number; data: SeoCompetitiveness }> = [
      {
        threshold: 90,
        data: { level: 'Highly Competitive', description: '在搜索结果中具有很强竞争力' },
      },
      { threshold: 80, data: { level: 'Competitive', description: '在搜索结果中具有竞争力' } },
      {
        threshold: 70,
        data: { level: 'Moderately Competitive', description: '在搜索结果中具有中等竞争力' },
      },
      { threshold: 60, data: { level: 'Low Competitive', description: '在搜索结果中竞争力较低' } },
    ];

    for (const { threshold, data } of levels) {
      if (score >= threshold) {
        return data;
      }
    }

    return { level: 'Not Competitive', description: '在搜索结果中缺乏竞争力' };
  }

  getPriorityLevel(status: string, score: number) {
    if (status === 'failed' && score < 30) return 'critical';
    if (status === 'failed' || score < 50) return 'high';
    if (status === 'warning' || score < 70) return 'medium';
    return 'low';
  }

  calculateImpact(category: string, score: number) {
    const categoryImpacts: Record<string, number> = {
      meta: 9,
      headings: 7,
      mobile: 8,
      content: 8,
      performance: 7,
      structuredData: 6,
      links: 5,
      images: 4,
      robots: 3,
      sitemap: 4,
      canonical: 7,
      openGraph: 5,
      hreflang: 4,
      accessibility: 6,
      pwa: 3,
    };

    const baseImpact = categoryImpacts[category] || 5;
    const scoreFactor = (100 - score) / 100;

    return Math.min(10, Math.round(baseImpact * (1 + scoreFactor)));
  }

  getDifficultyLevel(category: string) {
    const categoryDifficulties: Record<string, number> = {
      meta: 2,
      headings: 2,
      images: 3,
      content: 7,
      mobile: 6,
      performance: 8,
      structuredData: 5,
      links: 4,
      robots: 1,
      sitemap: 2,
      canonical: 1,
      openGraph: 3,
      hreflang: 4,
      accessibility: 6,
      pwa: 7,
    };

    return categoryDifficulties[category] || 5;
  }

  getImplementationTime(category: string, issueCount: number) {
    const baseTimes: Record<string, number> = {
      meta: 30,
      headings: 45,
      images: 60,
      content: 240,
      mobile: 180,
      performance: 360,
      structuredData: 120,
      links: 90,
      robots: 15,
      sitemap: 30,
      canonical: 15,
      openGraph: 45,
      hreflang: 60,
      accessibility: 180,
      pwa: 480,
    };

    const baseTime = baseTimes[category] || 60;
    return baseTime * Math.min(issueCount, 3);
  }

  async checkMobileOptimization(url: string, $: CheerioAPI): Promise<SeoCheckResult> {
    void url;
    let score = 0;
    const issues: string[] = [];

    // ── 1. viewport 标签（30 分）──
    const viewportSel = $('meta[name="viewport"]');
    const viewport = viewportSel.first?.() ?? viewportSel;
    const vpContent = viewport?.attr?.('content') ?? '';
    const vpPresent = (viewport?.length || 0) > 0;
    const vpOptimal =
      vpContent.includes('width=device-width') && vpContent.includes('initial-scale=1');
    const vpNoUserScalable = /user-scalable\s*=\s*no/i.test(vpContent);

    if (vpPresent && vpOptimal) {
      score += vpNoUserScalable ? 22 : 30;
      if (vpNoUserScalable) {
        issues.push('viewport 禁用了用户缩放 (user-scalable=no)，影响可访问性');
      }
    } else if (vpPresent) {
      score += 12;
      issues.push('viewport 设置不是最优的（建议：width=device-width, initial-scale=1）');
    } else {
      issues.push('缺少 viewport meta 标签，移动端无法正确渲染');
    }

    // ── 2. 字体大小可读性（15 分）──
    let smallFontCount = 0;
    $('[style]').each((_, elem) => {
      const style = $(elem).attr?.('style') ?? '';
      const match = style.match(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
      if (match && parseFloat(match[1]) < 12) smallFontCount++;
    });
    if (smallFontCount === 0) {
      score += 15;
    } else {
      score += 7;
      issues.push(`发现 ${smallFontCount} 个元素使用了小于 12px 的字号，移动端难以阅读`);
    }

    // ── 3. 点击目标间距（15 分）──
    const tappableElements = $(
      'a, button, input[type="submit"], input[type="button"], [role="button"]'
    );
    const tappableCount = tappableElements.length || 0;
    let tinyLinkCount = 0;
    $('a').each((_, elem) => {
      const text = ($(elem).text?.() ?? '').trim();
      if (text.length > 0 && text.length <= 2) tinyLinkCount++;
    });
    if (tappableCount > 0 && tinyLinkCount <= 3) {
      score += 15;
    } else if (tinyLinkCount > 3) {
      score += 7;
      issues.push(`发现 ${tinyLinkCount} 个极短文本链接，移动端点击目标可能过小`);
    } else {
      score += 15; // 无交互元素不扣分
    }

    // ── 4. 响应式图片（20 分）──
    const totalImages = $('img').length || 0;
    const hasPicture = ($('picture').length || 0) > 0;
    const hasSrcset = ($('img[srcset], source[srcset]').length || 0) > 0;
    const hasSizes = ($('img[sizes]').length || 0) > 0;
    const hasResponsiveImages = hasPicture || hasSrcset;

    if (totalImages === 0) {
      score += 20; // 无图片不扣分
    } else if (hasResponsiveImages && hasSizes) {
      score += 20;
    } else if (hasResponsiveImages) {
      score += 14;
      issues.push('使用了 srcset/picture 但缺少 sizes 属性，浏览器无法选择最优图片尺寸');
    } else if (totalImages <= 2) {
      score += 12; // 图片很少，不强制要求响应式
    } else {
      score += 5;
      issues.push('图片未使用 srcset 或 <picture> 标签，移动端可能加载过大的图片');
    }

    // ── 5. 移动端友好标记（20 分）──
    const hasAppleMobileWebApp = ($('meta[name="apple-mobile-web-app-capable"]').length || 0) > 0;
    const hasFormatDetection = ($('meta[name="format-detection"]').length || 0) > 0;
    const hasThemeColor = ($('meta[name="theme-color"]').length || 0) > 0;
    const hasAMP = ($('html[amp], html[⚡]').length || 0) > 0;
    const mobileHints = [hasAppleMobileWebApp, hasFormatDetection, hasThemeColor, hasAMP].filter(
      Boolean
    ).length;

    if (mobileHints >= 2) {
      score += 20;
    } else if (mobileHints === 1) {
      score += 10;
    } else {
      issues.push('建议添加 theme-color 或 apple-mobile-web-app-capable 等移动端优化标记');
    }

    return {
      status: score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.min(100, score),
      details: {
        viewport: { present: vpPresent, optimal: vpOptimal, noUserScalable: vpNoUserScalable },
        smallFontCount,
        tappableElements: tappableCount,
        tinyLinkCount,
        responsiveImages: { hasPicture, hasSrcset, hasSizes, totalImages },
        mobileHints: { hasAppleMobileWebApp, hasFormatDetection, hasThemeColor, hasAMP },
      },
      issues,
    };
  }

  checkContentQuality($: CheerioAPI): SeoCheckResult {
    let score = 0;
    const issues: string[] = [];

    const mainContentSelection = $('main, article, .content, #content, .post, #main');
    const mainContent = mainContentSelection.first?.() ?? mainContentSelection;
    const mainSelection = (mainContent?.length || 0) > 0 ? mainContent : $('body');
    const contentText = (mainSelection.text?.() ?? '').trim() || '';

    // 智能字符计数：支持中文（按字符）和英文（按空格分词）
    // 中文字符范围 + 日韩字符
    const cjkChars = contentText.match(
      /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g
    );
    const cjkCount = cjkChars ? cjkChars.length : 0;
    // 英文按空格分词
    const nonCjkText = contentText.replace(
      /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g,
      ' '
    );
    const englishWords = nonCjkText.split(/\s+/).filter(w => w.length > 0 && /[a-zA-Z]/.test(w));
    // 等效字数：1 个中文字 ≈ 1.5 个英文词
    const effectiveWordCount = Math.round(cjkCount / 1.5) + englishWords.length;
    const isChinese = cjkCount > englishWords.length;

    // ── 1. 内容量（30 分）──
    if (effectiveWordCount >= 300) {
      score += 30;
    } else if (effectiveWordCount >= 150) {
      score += 20;
      issues.push(
        isChinese
          ? `内容约 ${cjkCount} 字，建议增加到 500 字以上`
          : `内容约 ${englishWords.length} 词，建议增加到 300 词以上`
      );
    } else if (effectiveWordCount >= 50) {
      score += 10;
      issues.push(
        isChinese
          ? `内容仅约 ${cjkCount} 字，内容过少影响 SEO`
          : `内容仅约 ${englishWords.length} 词，内容过少影响 SEO`
      );
    } else {
      issues.push('页面几乎没有正文内容，严重影响 SEO 排名');
    }

    // ── 2. 段落结构（25 分）──
    const paragraphCount = $('p').length || 0;
    const listCount = $('ul, ol').length || 0;
    const tableCount = $('table').length || 0;
    const contentElements = paragraphCount + listCount + tableCount;

    if (contentElements >= 5) {
      score += 25;
    } else if (contentElements >= 2) {
      score += 15;
    } else {
      issues.push('内容结构单一，建议使用段落、列表等丰富内容层次');
    }

    // ── 3. 内容可读性（25 分）──
    // 标题层级检查已由 checkHeadings 负责，此处关注段落可读性
    const paragraphs: string[] = [];
    $('p').each((_, elem) => {
      const text = ($(elem).text?.() ?? '').trim();
      if (text.length > 0) paragraphs.push(text);
    });

    if (paragraphs.length > 0) {
      // 检查段落长度分布
      const longParagraphs = paragraphs.filter(p => p.length > 300);
      const shortParagraphs = paragraphs.filter(p => p.length < 20 && p.length > 0);
      const avgParagraphLength = Math.round(
        paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
      );

      if (longParagraphs.length === 0 && avgParagraphLength <= 200) {
        score += 25;
      } else if (longParagraphs.length <= 2) {
        score += 15;
        if (longParagraphs.length > 0) {
          issues.push(`${longParagraphs.length} 个段落超过 300 字符，建议拆分以提升可读性`);
        }
      } else {
        score += 5;
        issues.push(`${longParagraphs.length} 个段落过长，影响用户阅读体验和 SEO`);
      }
      void shortParagraphs; // 短段落不扣分
    } else if (effectiveWordCount >= 50) {
      // 有内容但没有 <p> 标签
      issues.push('正文内容未使用 <p> 段落标签包裹，影响语义结构');
    }

    // ── 4. 内容丰富度（20 分）──
    const hasImages = ($('img').length || 0) > 0;
    const hasLinks = ($('a[href]').length || 0) > 0;
    const hasLists = listCount > 0;
    const hasMedia = ($('video, audio, iframe, embed').length || 0) > 0;
    const richElements = [hasImages, hasLinks, hasLists, hasMedia].filter(Boolean).length;

    if (richElements >= 3) {
      score += 20;
    } else if (richElements >= 2) {
      score += 15;
    } else if (richElements === 1) {
      score += 8;
    } else {
      issues.push('建议添加图片、链接或列表等多媒体元素丰富内容');
    }

    score = Math.min(100, score);

    return {
      status: score >= 70 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score,
      details: {
        effectiveWordCount,
        cjkCount,
        englishWordCount: englishWords.length,
        isChinese,
        paragraphCount,
        paragraphsAnalyzed: paragraphs.length,
        listCount,
        tableCount,
        richElements,
      },
      issues,
    };
  }

  checkCanonical($: CheerioAPI, pageUrl: string): SeoCheckResult {
    let score = 0;
    const issues: string[] = [];

    const canonicalSelection = $('link[rel="canonical"]');
    const canonical = canonicalSelection.first?.() ?? canonicalSelection;
    const canonicalHref = canonical?.attr?.('href') ?? '';

    if ((canonical?.length || 0) > 0 && canonicalHref) {
      score += 50;
      try {
        const canonicalUrl = new URL(canonicalHref, pageUrl);
        const currentUrl = new URL(pageUrl);
        if (canonicalUrl.href === currentUrl.href) {
          score += 50;
        } else {
          score += 20;
          issues.push(`Canonical URL (${canonicalHref}) 与当前页面 URL 不一致`);
        }
      } catch {
        issues.push(`Canonical URL 格式无效: ${canonicalHref}`);
      }
    } else {
      issues.push('缺少 canonical 标签，可能导致重复内容问题');
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score,
      details: { canonical: canonicalHref || null, present: (canonical?.length || 0) > 0 },
      issues,
    };
  }

  checkOpenGraph($: CheerioAPI): SeoCheckResult {
    // 仅检查 Open Graph 标签。Twitter Card 由独立的 checkTwitterCard 负责。
    let score = 0;
    const issues: string[] = [];
    const ogTags: Record<string, string> = {};

    const requiredOg = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
    const optionalOg = ['og:site_name', 'og:locale', 'og:image:width', 'og:image:height'];

    $('meta[property^="og:"]').each((_, elem) => {
      const prop = $(elem).attr?.('property') ?? '';
      const content = $(elem).attr?.('content') ?? '';
      if (prop) ogTags[prop] = content;
    });

    const presentRequired = requiredOg.filter(tag => ogTags[tag]);
    const missingRequired = requiredOg.filter(tag => !ogTags[tag]);
    score += Math.round((presentRequired.length / requiredOg.length) * 80);

    if (missingRequired.length > 0) {
      issues.push(`缺少 Open Graph 必需标签: ${missingRequired.join(', ')}`);
    }

    // og:image 尺寸检查（社交平台推荐 1200x630）
    if (ogTags['og:image'] && !ogTags['og:image:width']) {
      issues.push('建议为 og:image 指定 og:image:width 和 og:image:height');
    }

    // 可选标签加分
    const presentOptional = optionalOg.filter(tag => ogTags[tag]);
    score += Math.round((presentOptional.length / optionalOg.length) * 20);

    // og:title 长度检查
    if (ogTags['og:title'] && ogTags['og:title'].length > 60) {
      issues.push('og:title 过长（建议不超过 60 字符）');
    }

    // og:description 长度检查
    if (ogTags['og:description'] && ogTags['og:description'].length > 200) {
      issues.push('og:description 过长（建议不超过 200 字符）');
    }

    return {
      status: score >= 75 ? 'passed' : score >= 40 ? 'warning' : 'failed',
      score: Math.min(100, score),
      details: {
        ogTags,
        presentRequired: presentRequired.length,
        missingRequired: missingRequired.length,
        presentOptional: presentOptional.length,
        totalOgTags: Object.keys(ogTags).length,
      },
      issues,
    };
  }

  checkTwitterCard($: CheerioAPI): SeoCheckResult {
    let score = 0;
    const issues: string[] = [];
    const twitterTags: Record<string, string> = {};

    $('meta[name^="twitter:"]').each((_, elem) => {
      const name = $(elem).attr?.('name') ?? '';
      const content = $(elem).attr?.('content') ?? '';
      if (name) twitterTags[name] = content;
    });

    const requiredTags = ['twitter:card', 'twitter:title', 'twitter:description'];
    const optionalTags = ['twitter:image', 'twitter:site', 'twitter:creator'];

    const presentRequired = requiredTags.filter(tag => twitterTags[tag]);
    const missingRequired = requiredTags.filter(tag => !twitterTags[tag]);
    score += Math.round((presentRequired.length / requiredTags.length) * 70);

    if (missingRequired.length > 0) {
      issues.push(`缺少 Twitter Card 必需标签: ${missingRequired.join(', ')}`);
    }

    const presentOptional = optionalTags.filter(tag => twitterTags[tag]);
    score += Math.round((presentOptional.length / optionalTags.length) * 30);

    // 验证 twitter:card 值是否合法
    const cardType = twitterTags['twitter:card'];
    if (cardType && !['summary', 'summary_large_image', 'app', 'player'].includes(cardType)) {
      issues.push(
        `twitter:card 值无效: ${cardType}（应为 summary/summary_large_image/app/player）`
      );
      score -= 10;
    }

    return {
      status: score >= 70 ? 'passed' : score >= 40 ? 'warning' : 'failed',
      score: Math.max(0, Math.min(100, score)),
      details: {
        twitterTags,
        presentRequired: presentRequired.length,
        missingRequired: missingRequired.length,
        presentOptional: presentOptional.length,
      },
      issues,
    };
  }

  checkHreflang($: CheerioAPI): SeoCheckResult {
    let score = 100;
    const issues: string[] = [];
    const hreflangTags: Array<{ lang: string; href: string }> = [];

    $('link[rel="alternate"][hreflang]').each((_, elem) => {
      const lang = $(elem).attr?.('hreflang') ?? '';
      const href = $(elem).attr?.('href') ?? '';
      hreflangTags.push({ lang, href });
    });

    if (hreflangTags.length === 0) {
      // 单语言网站没有 hreflang 是正常的，不扣分
      // 仅作为信息提示，不影响评分
      score = 100;
      issues.push('未设置 hreflang 标签（仅多语言网站需要）');
    } else {
      const hasXDefault = hreflangTags.some(tag => tag.lang === 'x-default');
      if (!hasXDefault) {
        score -= 20;
        issues.push('已设置 hreflang 但缺少 x-default 回退标签');
      }
      const emptyHrefs = hreflangTags.filter(tag => !tag.href);
      if (emptyHrefs.length > 0) {
        score -= 20;
        issues.push(`${emptyHrefs.length} 个 hreflang 标签缺少 href 属性`);
      }
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: { tags: hreflangTags, count: hreflangTags.length },
      issues,
    };
  }

  checkAccessibility($: CheerioAPI): SeoCheckResult {
    // 仅保留 SEO 视角独有的可访问性信号检查。
    // lang、alt、form-label、ARIA、tabindex 等深度检查已由独立的 Accessibility 引擎负责，
    // 此处不再重复，避免引擎间功能耦合。
    let score = 100;
    const issues: string[] = [];

    // 1. 跳转链接（skip link）—— SEO 爬虫关注的导航可达性信号
    const hasSkipLink =
      ($('a[href^="#main"], a[href^="#content"], a.skip-link, a.skip-nav').length || 0) > 0;
    if (!hasSkipLink) {
      score -= 15;
      issues.push('缺少跳转到主内容的快捷链接 (skip link)');
    }

    // 2. color-scheme 声明 —— 影响搜索引擎对暗色模式的渲染判断
    const hasColorScheme = ($('meta[name="color-scheme"]').length || 0) > 0;
    if (!hasColorScheme) {
      score -= 10;
      issues.push('未声明 color-scheme，可能影响暗色模式下的可访问性');
    }

    // 3. lang 属性存在性（SEO 排名信号，轻量检查，不做深度验证）
    const htmlLang = $('html').attr?.('lang') ?? '';
    if (!htmlLang) {
      score -= 25;
      issues.push('HTML 标签缺少 lang 属性（影响搜索引擎语言识别）');
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        hasSkipLink,
        hasColorScheme,
        htmlLang: htmlLang || null,
      },
      issues,
    };
  }

  async checkPWA($: CheerioAPI, url: string): Promise<SeoCheckResult> {
    let score = 0;
    const issues: string[] = [];

    // 检查 manifest
    const manifestLink = $('link[rel="manifest"]');
    const manifestHref = manifestLink.attr?.('href') ?? '';
    let manifestValid = false;

    if ((manifestLink.length || 0) > 0 && manifestHref) {
      score += 30;
      try {
        const manifestUrl = new URL(manifestHref, url).href;
        const res = await axios.get(manifestUrl, { timeout: 5000, validateStatus: s => s < 500 });
        if (res.status === 200 && typeof res.data === 'object') {
          const manifest = res.data as Record<string, unknown>;
          manifestValid = true;
          if (manifest.name) score += 10;
          else issues.push('manifest 缺少 name 字段');
          if (manifest.short_name) score += 5;
          if (manifest.start_url) score += 10;
          else issues.push('manifest 缺少 start_url 字段');
          if (Array.isArray(manifest.icons) && (manifest.icons as unknown[]).length > 0)
            score += 10;
          else issues.push('manifest 缺少 icons');
          if (manifest.display) score += 5;
          if (manifest.theme_color) score += 5;
          if (manifest.background_color) score += 5;
        } else {
          issues.push('manifest 文件无法解析');
        }
      } catch {
        issues.push('manifest 文件无法访问');
      }
    } else {
      issues.push('缺少 Web App Manifest');
    }

    // 检查 service worker 注册（通过 HTML 中的脚本检测）
    const scripts = $('script').toArray?.() ?? [];
    const hasSW = scripts.some(s => {
      const text = $(s).html?.() ?? '';
      return text.includes('serviceWorker') || text.includes('service-worker');
    });
    if (hasSW) {
      score += 10;
    } else {
      issues.push('未检测到 Service Worker 注册');
    }

    // 检查 theme-color
    const themeColor = $('meta[name="theme-color"]');
    if ((themeColor.length || 0) > 0) {
      score += 5;
    } else {
      issues.push('缺少 theme-color meta 标签');
    }

    return {
      status: score >= 60 ? 'passed' : score >= 30 ? 'warning' : 'failed',
      score: Math.min(100, score),
      details: {
        hasManifest: (manifestLink.length || 0) > 0,
        manifestValid,
        hasServiceWorker: hasSW,
        hasThemeColor: (themeColor.length || 0) > 0,
      },
      issues,
    };
  }

  identifyStrengths(checks: Record<string, SeoCheckResult>): SeoStrengthItem[] {
    const strengths: SeoStrengthItem[] = [];

    for (const [category, result] of Object.entries(checks)) {
      if (result && result.status === 'passed' && result.score >= 80) {
        strengths.push({
          category,
          score: result.score,
          description: this.getStrengthDescription(category),
        });
      }
    }

    return strengths.sort((a, b) => b.score - a.score);
  }

  identifyWeaknesses(checks: Record<string, SeoCheckResult>): SeoWeaknessItem[] {
    const weaknesses: SeoWeaknessItem[] = [];

    for (const [category, result] of Object.entries(checks)) {
      if (result && (result.status === 'failed' || result.score < 60)) {
        weaknesses.push({
          category,
          score: result.score,
          status: result.status,
          description: this.getWeaknessDescription(category),
          impact: this.calculateImpact(category, result.score),
        });
      }
    }

    return weaknesses.sort((a, b) => b.impact - a.impact);
  }

  async generateCompetitorInsights(score: number): Promise<SeoCompetitorInsights> {
    return {
      marketPosition: this.getMarketPosition(score),
      competitiveAdvantages: this.getCompetitiveAdvantages(score),
      improvementAreas: this.getImprovementAreas(score),
      benchmarkComparison: await this.getBenchmarkComparison(score),
    };
  }

  generateActionPlan(recommendations?: SeoRecommendations): SeoActionPlan {
    const plan: SeoActionPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    };

    if (recommendations?.all) {
      recommendations.all.forEach(rec => {
        // 深拷贝每个 rec，避免 actionPlan 和 recommendations.all 共享同一对象引用
        const cloned: SeoRecommendationItem = { ...rec, issues: [...rec.issues] };
        const timeToImplement = cloned.timeToImplement || 0;
        if (timeToImplement <= 4320) {
          plan.immediate.push(cloned);
        } else if (timeToImplement <= 40320) {
          plan.shortTerm.push(cloned);
        } else {
          plan.longTerm.push(cloned);
        }
      });
    }

    return plan;
  }

  getStrengthDescription(category: string) {
    const descriptions: Record<string, string> = {
      meta: '页面元标签优化优秀，有利于搜索引擎理解页面内容',
      headings: '标题结构清晰合理，便于用户和搜索引擎理解内容层次',
      mobile: '移动端优化出色，提供良好的移动用户体验',
      content: '内容质量高，有深度且易读性好',
      performance: '页面性能优秀，加载速度快',
      structuredData: '结构化数据实现完善，增强搜索结果展示',
      links: '链接结构合理，内部链接和外部链接管理良好',
      images: '图片优化到位，所有图片都有适当的alt属性',
      robots: 'robots.txt配置正确，搜索引擎抓取指导清晰',
      sitemap: '站点地图完整，有助于搜索引擎发现和索引页面',
      canonical: 'Canonical URL 设置正确，有效避免重复内容问题',
      openGraph: 'Open Graph 和 Twitter Card 标签完善，社交分享效果好',
      hreflang: '多语言标签配置正确，国际化 SEO 表现优秀',
      accessibility: '页面可访问性良好，符合无障碍标准',
      pwa: 'PWA 配置完善，支持离线访问和安装',
    };

    return descriptions[category] || '该项SEO指标表现优秀';
  }

  getWeaknessDescription(category: string) {
    const descriptions: Record<string, string> = {
      meta: '页面元标签需要优化，影响搜索引擎对页面的理解',
      headings: '标题结构需要改进，不利于内容层次的展现',
      mobile: '移动端优化不足，可能影响移动用户体验和排名',
      content: '内容质量有待提升，需要增加深度和可读性',
      performance: '页面性能较差，加载速度影响用户体验和SEO',
      structuredData: '结构化数据缺失或不完整，错失搜索结果增强机会',
      links: '链接结构需要优化，影响页面权重传递',
      images: '图片优化不足，缺少alt属性影响可访问性',
      robots: 'robots.txt配置有问题，可能影响搜索引擎抓取',
      sitemap: '站点地图缺失或有问题，影响页面被搜索引擎发现',
      canonical: 'Canonical URL 缺失或配置错误，可能导致重复内容被索引',
      openGraph: 'Open Graph 标签不完整，社交媒体分享效果差',
      hreflang: '多语言标签缺失，影响国际化搜索排名',
      accessibility: '页面可访问性不足，影响残障用户体验和 SEO 评分',
      pwa: 'PWA 配置不完善，缺少离线支持和安装能力',
    };

    return descriptions[category] || '该项SEO指标需要改进';
  }

  getMarketPosition(score: number) {
    if (score >= 90) return '市场领先者 - SEO优化水平处于行业顶尖';
    if (score >= 80) return '强力竞争者 - SEO基础扎实，具备竞争优势';
    if (score >= 70) return '稳定参与者 - SEO水平中等，需要持续优化';
    if (score >= 60) return '努力追赶者 - SEO存在明显短板，需要重点改进';
    return '亟需提升者 - SEO严重滞后，需要全面重构';
  }

  getCompetitiveAdvantages(score: number) {
    const advantages: string[] = [];
    if (score >= 85) advantages.push('整体SEO水平较高');
    if (score >= 80) advantages.push('基础SEO配置完善');
    if (score >= 75) advantages.push('用户体验较好');
    if (score >= 70) advantages.push('内容质量尚可');

    return advantages.length > 0 ? advantages : ['需要建立SEO竞争优势'];
  }

  getImprovementAreas(score: number) {
    const areas: string[] = [];
    if (score < 90) areas.push('进一步优化技术SEO');
    if (score < 80) areas.push('提升内容质量和相关性');
    if (score < 70) areas.push('改善用户体验和页面性能');
    if (score < 60) areas.push('建立基础SEO配置');

    return areas;
  }

  async getBenchmarkComparison(score: number) {
    const scores = await this.fetchSeoScores();
    const comparison = this.buildScoreComparison(score, scores);

    return {
      industryAverage: comparison.industry,
      yourScore: score,
      percentile: comparison.percentile,
      gap: Math.max(0, comparison.benchmark - score),
      recommendation: score >= comparison.benchmark ? '保持优势，持续优化' : '重点改进，缩小差距',
    };
  }

  private async fetchSeoScores(limit = 200): Promise<number[]> {
    const result = await query(
      `SELECT tr.score
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.engine_type = 'seo'
         AND tr.score IS NOT NULL
       ORDER BY tr.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return (result.rows || [])
      .map((row: { score?: number | string }) => Number(row.score))
      .filter((score: number) => Number.isFinite(score));
  }

  private buildScoreComparison(score: number, scores: number[]) {
    if (!scores.length) {
      const fallback = score || 0;
      return {
        industry: fallback,
        competitors: fallback,
        benchmark: fallback,
        percentile: 0,
      };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const industry = this.calculateAverage(sorted);
    const competitors = this.calculatePercentileValue(sorted, 0.75);
    const benchmark = this.calculatePercentileValue(sorted, 0.9);
    const percentile = this.calculatePercentileRank(sorted, score);

    return {
      industry: Math.round(industry * 100) / 100,
      competitors: Math.round(competitors * 100) / 100,
      benchmark: Math.round(benchmark * 100) / 100,
      percentile,
    };
  }

  private calculateAverage(values: number[]): number {
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  }

  private calculatePercentileValue(values: number[], percentile: number): number {
    if (values.length === 1) {
      return values[0];
    }
    const index = Math.min(values.length - 1, Math.floor(percentile * (values.length - 1)));
    return values[index];
  }

  private calculatePercentileRank(values: number[], score: number): number {
    if (!values.length) return 0;
    const below = values.filter(value => value <= score).length;
    return Math.round((below / values.length) * 100);
  }

  async cleanup() {
    this.cancelledTests.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }
}

export default SeoTestEngine;
