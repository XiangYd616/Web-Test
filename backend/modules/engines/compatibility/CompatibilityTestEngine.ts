import axios from 'axios';
import * as cheerio from 'cheerio';
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
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import ScreenshotService from '../shared/services/ScreenshotService';
import {
  extractPageSignals as extractPageSignalsShared,
  type PageSignalsResult,
} from '../shared/utils/pageSignals';

const DEFAULT_BROWSERS = [
  { name: 'Chrome', version: '125' },
  { name: 'Firefox', version: '126' },
  { name: 'Safari', version: '17.5' },
  { name: 'Edge', version: '125' },
  { name: 'Samsung', version: '25' },
  { name: 'Opera', version: '111' },
];

const DEFAULT_DEVICES = [
  { name: 'Desktop', viewport: { width: 1920, height: 1080 } },
  { name: 'Laptop', viewport: { width: 1366, height: 768 } },
  { name: 'iPad Pro', viewport: { width: 1024, height: 1366 } },
  { name: 'Tablet', viewport: { width: 768, height: 1024 } },
  { name: 'iPhone 15', viewport: { width: 393, height: 852 } },
  { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
  { name: 'Galaxy S24', viewport: { width: 360, height: 780 } },
  { name: 'Pixel 8', viewport: { width: 412, height: 915 } },
];

const DEFAULT_USER_AGENTS: Record<string, string> = {
  Chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  Safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  Edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  Samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  Opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0',
  Desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Laptop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'iPad Pro':
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  Tablet:
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'iPhone 15':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'iPhone SE':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Galaxy S24':
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  'Pixel 8':
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
};

const FEATURE_SUPPORT: Record<string, Record<string, number>> = {
  // HTML / JS
  es6module: { Chrome: 61, Firefox: 60, Safari: 10.1, Edge: 16, Samsung: 8.2, Opera: 48 },
  responsiveImages: { Chrome: 38, Firefox: 38, Safari: 9.1, Edge: 13, Samsung: 4, Opera: 25 },
  webp: { Chrome: 32, Firefox: 65, Safari: 14, Edge: 18, Samsung: 4, Opera: 19 },
  avif: { Chrome: 85, Firefox: 93, Safari: 16, Edge: 85, Samsung: 14, Opera: 71 },
  lazyloading: { Chrome: 76, Firefox: 75, Safari: 15.4, Edge: 79, Samsung: 12, Opera: 63 },
  // CSS Layout
  cssGrid: { Chrome: 57, Firefox: 52, Safari: 10.1, Edge: 16, Samsung: 6.2, Opera: 44 },
  flexbox: { Chrome: 29, Firefox: 28, Safari: 9, Edge: 12, Samsung: 4, Opera: 17 },
  cssVariables: { Chrome: 49, Firefox: 31, Safari: 9.1, Edge: 15, Samsung: 5, Opera: 36 },
  containerQueries: { Chrome: 105, Firefox: 110, Safari: 16, Edge: 105, Samsung: 20, Opera: 91 },
  cssHas: { Chrome: 105, Firefox: 121, Safari: 15.4, Edge: 105, Samsung: 20, Opera: 91 },
  cssNesting: { Chrome: 120, Firefox: 117, Safari: 17.2, Edge: 120, Samsung: 25, Opera: 106 },
  // CSS Functions
  cssCalc: { Chrome: 26, Firefox: 16, Safari: 7, Edge: 12, Samsung: 4, Opera: 15 },
  cssClamp: { Chrome: 79, Firefox: 75, Safari: 13.1, Edge: 79, Samsung: 12, Opera: 66 },
  // Media
  videoWebm: { Chrome: 6, Firefox: 4, Safari: 16, Edge: 14, Samsung: 4, Opera: 10.6 },
  videoMp4: { Chrome: 3, Firefox: 35, Safari: 3.2, Edge: 12, Samsung: 4, Opera: 25 },
  audioOpus: { Chrome: 33, Firefox: 15, Safari: 11, Edge: 14, Samsung: 4, Opera: 20 },
  // Fonts
  woff2: { Chrome: 36, Firefox: 39, Safari: 10, Edge: 14, Samsung: 4, Opera: 23 },
  woff: { Chrome: 6, Firefox: 3.5, Safari: 5.1, Edge: 12, Samsung: 4, Opera: 11.1 },
};

type BrowserConfig = {
  name: string;
  version?: string;
  userAgent?: string;
};

type DeviceConfig = {
  name: string;
  viewport: { width: number; height: number };
  userAgent?: string;
};

type PageSignals = PageSignalsResult;

type CompatibilityRunConfig = BaseTestConfig & {
  url?: string;
  browsers?: BrowserConfig[];
  devices?: DeviceConfig[];
  enableMatrix?: boolean;
  featureDetection?: boolean;
  realBrowser?: boolean;
  captureScreenshot?: boolean;
  timeout?: number;
  testId?: string;
  /** 截图路径列表（相对于 url），为空时自动发现 */
  screenshotPaths?: string[];
  /** 截图最大页面数 */
  screenshotMaxPages?: number;
  /** 截图爬取深度 (0=仅首页, 1=首页+直接链接) */
  screenshotCrawlDepth?: number;
  /** 截图前等待时间 (ms) */
  screenshotDelay?: number;
  /** 是否全页截图 */
  screenshotFullPage?: boolean;
};

type CompatibilityConfig = CompatibilityRunConfig & {
  url: string;
  testId: string;
};

type CompatibilitySummary = {
  overallScore: number;
  browserCount: number;
  deviceCount: number;
  matrixCount: number;
  realBrowserCount: number;
};

type CompatibilityBrowserResult = {
  browser: string;
  version: string;
  compatible: boolean;
  issues: string[];
  signals: PageSignals;
};

type CompatibilityDeviceResult = {
  device: string;
  viewport: { width: number; height: number };
  compatible: boolean;
  issues: string[];
  signals: PageSignals;
};

type CompatibilityMatrixResult = {
  browser: string;
  version: string;
  device: string;
  viewport: { width: number; height: number };
  userAgent: string | null;
  compatible: boolean;
  issues: string[];
  warnings: string[];
  features: string[];
  signals: PageSignals;
};

type CompatibilityRealBrowserMetrics = {
  title: string;
  scrollWidth: number;
  scrollHeight: number;
  timing: { domContentLoaded: number; loadEvent: number } | null;
  failedRequests: number;
  firstContentfulPaint: number;
  screenshot: string | null;
};

type CompatibilityRealBrowserResult = {
  browser: string;
  version: string;
  device: string;
  viewport: { width: number; height: number };
  userAgent: string | null;
  available: boolean;
  compatible?: boolean;
  issues: string[];
  warnings: string[];
  metrics?: CompatibilityRealBrowserMetrics;
};

type CompatibilityFeatureSummary = {
  requiredFeatures: string[];
  meta: PageSignals['meta'];
  resources: PageSignals['resources'];
  css: PageSignals['css'];
  fonts: PageSignals['fonts'];
  media: PageSignals['media'];
  polyfill: PageSignals['polyfill'];
};

type CompatibilityScreenshotItem = {
  path: string;
  url: string;
  device: string;
  viewport: { width: number; height: number };
  screenshotBase64: string;
  format: string;
  meta?: {
    title: string;
    statusCode: number;
    loadTime: number;
  };
};

type CompatibilityScreenshotSummary = {
  totalPaths: number;
  totalScreenshots: number;
  devices: string[];
  failedPaths: string[];
};

type CompatibilityResults = {
  url: string;
  timestamp: string;
  summary: CompatibilitySummary;
  browsers: CompatibilityBrowserResult[];
  devices: CompatibilityDeviceResult[];
  matrix: CompatibilityMatrixResult[];
  realBrowser: CompatibilityRealBrowserResult[];
  featureSummary: CompatibilityFeatureSummary;
  recommendations: string[];
  warnings: string[];
  screenshotResults?: {
    summary: CompatibilityScreenshotSummary;
    items: CompatibilityScreenshotItem[];
  };
};

type CompatibilityFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: CompatibilityResults;
  status: TestStatus;
  score?: number;
  error?: string;
  summary?: CompatibilitySummary | null;
  warnings?: string[];
  errors?: string[];
};

type CompatibilityActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  message?: string;
  error?: string;
  lastUpdate?: number;
  results?: CompatibilityResults;
};

type CompatibilityProgressPayload = {
  testId: string;
  progress: number;
  message: string;
  status?: string;
};

class CompatibilityTestEngine implements ITestEngine<CompatibilityRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  activeTests: Map<string, CompatibilityActiveTestRecord>;
  progressCallback: ((progress: CompatibilityProgressPayload) => void) | null;
  completionCallback: ((results: CompatibilityFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  lifecycle?: ITestEngine<CompatibilityRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private cancelledTests: Set<string>;

  constructor() {
    this.type = TestEngineType.COMPATIBILITY;
    this.name = 'compatibility';
    this.version = '1.0.0';
    this.description = '兼容性测试引擎';
    this.cancelledTests = new Set();
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'browser-compatibility',
        'device-compatibility',
        'responsive-checks',
        'browser-matrix',
        'user-agent-simulation',
        'feature-compatibility',
        'multi-path-screenshot',
      ],
      requiredConfig: ['url'],
      optionalConfig: [
        'browsers',
        'devices',
        'enableMatrix',
        'featureDetection',
        'realBrowser',
        'captureScreenshot',
        'screenshotPaths',
        'screenshotMaxPages',
        'screenshotCrawlDepth',
        'screenshotDelay',
        'screenshotFullPage',
      ],
      outputFormat: ['summary', 'browsers', 'devices', 'matrix', 'realBrowser', 'warnings'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 5000,
        max: 60000,
        typical: 20000,
      },
    };
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.progressTracker = new Map();
  }

  private async checkPuppeteerAvailable(): Promise<boolean> {
    return puppeteerPool.isAvailable();
  }

  validate(config: CompatibilityRunConfig): ValidationResult {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browsers: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          version: Joi.string(),
          userAgent: Joi.string(),
        })
      ),
      devices: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          viewport: Joi.object({
            width: Joi.number().min(320).required(),
            height: Joi.number().min(480).required(),
          }).required(),
          userAgent: Joi.string(),
        })
      ),
      enableMatrix: Joi.boolean(),
      featureDetection: Joi.boolean(),
      realBrowser: Joi.boolean(),
      captureScreenshot: Joi.boolean(),
      timeout: Joi.number().min(1000),
      testId: Joi.string(),
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
    const browserCount = Array.isArray(cfgAny.browsers) ? (cfgAny.browsers as unknown[]).length : 6;
    const deviceCount = Array.isArray(cfgAny.devices) ? (cfgAny.devices as unknown[]).length : 8;
    const hasRealBrowser = cfgAny.realBrowser === true;
    // 真实浏览器测试需要 Puppeteer 打开页面，每个组合约 10s
    const realBrowserTime = hasRealBrowser ? browserCount * deviceCount * 10000 : 0;
    cfgAny.executionTimeout = Math.max(
      60000,
      browserCount * 5000 + deviceCount * 3000 + realBrowserTime
    );

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: CompatibilityConfig) {
    // 展开 options：前端发送 { url, testType, options: { browsers, devices, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as CompatibilityConfig;
    }

    // 预处理：为只有 name 的设备补全 viewport，为只有 name 的浏览器补全 version
    const defaultDeviceMap = new Map(DEFAULT_DEVICES.map(d => [d.name.toLowerCase(), d]));
    const defaultBrowserMap = new Map(DEFAULT_BROWSERS.map(b => [b.name.toLowerCase(), b]));

    if (Array.isArray(config.devices)) {
      config = {
        ...config,
        devices: config.devices
          .map((d: Record<string, unknown>) => {
            const name = String(d.name || '');
            if (d.viewport && typeof d.viewport === 'object') return d as unknown as DeviceConfig;
            const matched = defaultDeviceMap.get(name.toLowerCase());
            if (matched) return { ...d, viewport: matched.viewport } as DeviceConfig;
            return null;
          })
          .filter((d): d is DeviceConfig => d !== null),
      };
    }

    if (Array.isArray(config.browsers)) {
      config = {
        ...config,
        browsers: config.browsers.map((b: Record<string, unknown>) => {
          const name = String(b.name || '');
          if (b.version) return b as unknown as BrowserConfig;
          const matched = defaultBrowserMap.get(name.toLowerCase());
          return { ...b, version: matched?.version || 'latest' } as BrowserConfig;
        }),
      };
    }

    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browsers: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          version: Joi.string(),
          userAgent: Joi.string(),
        })
      ),
      devices: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          viewport: Joi.object({
            width: Joi.number().min(320).required(),
            height: Joi.number().min(480).required(),
          }).required(),
          userAgent: Joi.string(),
        })
      ),
      enableMatrix: Joi.boolean(),
      featureDetection: Joi.boolean(),
      realBrowser: Joi.boolean(),
      captureScreenshot: Joi.boolean(),
      timeout: Joi.number().min(1000),
      testId: Joi.string().required(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as CompatibilityConfig;
  }

  async initialize(): Promise<void> {
    return;
  }

  async run(
    config: CompatibilityRunConfig,
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
      currentStep: '准备兼容性测试环境',
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
      const result = await this.executeTest({
        ...config,
        testId,
      } as CompatibilityConfig);
      const endTime = new Date();
      const compatScore = result.score ?? 0;
      const compatGrade =
        compatScore >= 90
          ? 'A'
          : compatScore >= 80
            ? 'B'
            : compatScore >= 60
              ? 'C'
              : compatScore >= 40
                ? 'D'
                : 'F';
      const compatSummaryData = result.results?.summary;
      const structuredSummary = {
        score: compatScore,
        grade: compatGrade,
        passed: compatScore >= 60,
        browserCount: compatSummaryData?.browserCount ?? 0,
        deviceCount: compatSummaryData?.deviceCount ?? 0,
        overallScore: compatSummaryData?.overallScore ?? compatScore,
      };
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: compatScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || '兼容性测试失败')],
        warnings: result.warnings || [],
        recommendations: (result.results as { recommendations?: string[] })?.recommendations || [],
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
        summary: '兼容性测试失败',
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

  estimateDuration(config: CompatibilityRunConfig): number {
    const browserCount = config.browsers?.length ?? 6;
    const deviceCount = config.devices?.length ?? 8;
    const hasRealBrowser = config.realBrowser === true;
    const base = browserCount * 2000 + deviceCount * 1500;
    const realBrowserTime = hasRealBrowser ? browserCount * deviceCount * 8000 : 0;
    return Math.max(10000, base + realBrowserTime);
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

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'browser-compatibility',
        'device-compatibility',
        'responsive-checks',
        'browser-matrix',
        'user-agent-simulation',
        'feature-compatibility',
      ],
    };
  }

  async executeTest(config: CompatibilityConfig) {
    const validatedConfig = this.normalizeConfig(config);
    const testId = validatedConfig.testId;
    const timeout = validatedConfig.timeout || 30000;
    const url = validatedConfig.url;

    if (!url) {
      throw new Error('兼容性测试URL不能为空');
    }

    try {
      // realBrowser 默认 auto：Puppeteer 可用时自动启用，不可用时回退到静态分析
      const puppeteerAvailable = await this.checkPuppeteerAvailable();
      const enableRealBrowser = validatedConfig.realBrowser === false ? false : puppeteerAvailable;

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 10, '获取页面内容');

      const response = await axios.get(url, { timeout });
      if (this.isCancelled(testId)) throw new Error('测试已取消');
      const baseHtml = String(response.data || '');
      const baseSignals = this.extractPageSignals(baseHtml);

      const browsers = validatedConfig.browsers?.length
        ? validatedConfig.browsers
        : DEFAULT_BROWSERS;
      const devices = validatedConfig.devices?.length ? validatedConfig.devices : DEFAULT_DEVICES;
      const enableMatrix = validatedConfig.enableMatrix !== false;
      const enableFeatureDetection = validatedConfig.featureDetection !== false;
      const captureScreenshot = validatedConfig.captureScreenshot === true;

      this.updateTestProgress(testId, 35, '准备UA矩阵');
      const variantMap = enableMatrix
        ? await this.fetchVariants(url, timeout, browsers, devices, testId)
        : new Map<string, { html: string; signals: PageSignals }>();
      if (this.isCancelled(testId)) throw new Error('测试已取消');

      this.updateTestProgress(testId, 55, '执行浏览器兼容性检查');
      const browserResults: CompatibilityBrowserResult[] = browsers.map(browser => {
        const signals = this.resolveSignals(baseSignals, browser, null, variantMap);
        const issues = [...signals.issues];
        // C4: 增加浏览器特性兼容性检测
        if (enableFeatureDetection && signals.requiredFeatures.length > 0) {
          const featureResult = this.evaluateFeatureSupport(browser, signals.requiredFeatures);
          issues.push(...featureResult.issues);
        }
        return {
          browser: browser.name,
          version: browser.version || 'latest',
          compatible: issues.length === 0,
          issues,
          signals,
        };
      });

      this.updateTestProgress(testId, 70, '执行设备适配检查');
      const deviceResults: CompatibilityDeviceResult[] = devices.map(device => {
        const signals = this.resolveSignals(baseSignals, null, device, variantMap);
        const issues: string[] = [];

        if (!signals.meta.hasViewport) {
          issues.push('缺少viewport meta标签');
        } else {
          const vc = signals.meta.viewportContent.toLowerCase();
          if (!vc.includes('width=device-width')) {
            issues.push('viewport 未设置 width=device-width，可能导致移动端缩放异常');
          }
        }

        const isMobile = device.viewport.width < 768;
        if (isMobile) {
          if (!signals.resources.hasPicture) {
            issues.push('移动端缺少响应式图片（picture/srcset），可能浪费带宽');
          }
          if (!signals.resources.hasLazyLoading) {
            issues.push('移动端未使用图片懒加载（loading="lazy"）');
          }
        }

        if (signals.fonts.fontFaceCount > 0 && !signals.fonts.hasWoff2) {
          issues.push('使用了自定义字体但缺少 WOFF2 格式，影响加载性能');
        }

        if (signals.media.videoSources.length > 0 && !signals.media.hasVideoFallback) {
          issues.push('视频元素缺少多格式 source 回退');
        }

        return {
          device: device.name,
          viewport: device.viewport,
          compatible: issues.length === 0,
          issues,
          signals,
        };
      });

      const matrixResults = enableMatrix
        ? this.buildCompatibilityMatrix(
            browsers,
            devices,
            baseSignals,
            variantMap,
            enableFeatureDetection
          )
        : [];

      if (this.isCancelled(testId)) throw new Error('测试已取消');
      const _cfgRaw = config as unknown as Record<string, unknown>;
      if (typeof _cfgRaw.engineMode === 'string') {
        puppeteerPool.applyEngineMode(_cfgRaw.engineMode);
      }
      const showBrowser = _cfgRaw.showBrowser === true;
      const realBrowserResults = enableRealBrowser
        ? await this.runRealBrowserChecks(
            url,
            timeout,
            browsers,
            devices,
            false,
            testId,
            showBrowser
          )
        : [];

      // ── 多路径截图 ──
      if (this.isCancelled(testId)) throw new Error('测试已取消');
      let screenshotResults: CompatibilityResults['screenshotResults'] | undefined;
      if (captureScreenshot && enableRealBrowser) {
        this.updateTestProgress(testId, 85, '执行多路径截图');
        screenshotResults = await this.runMultiPathScreenshots(
          url,
          devices,
          validatedConfig,
          testId
        );
      }

      const overallScore = this.calculateScore(
        matrixResults.length ? matrixResults : browserResults,
        deviceResults,
        realBrowserResults
      );
      const warnings: string[] = [];
      if (enableRealBrowser) {
        warnings.push(
          '真实浏览器测试基于 Chromium 渲染引擎，无法检测 Firefox(Gecko)/Safari(WebKit) 特有的渲染差异'
        );
      } else {
        warnings.push('Puppeteer 不可用，结果基于 User-Agent 模拟和 HTML 静态分析，可信度受限');
      }
      const results: CompatibilityResults = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          browserCount: browserResults.length,
          deviceCount: deviceResults.length,
          matrixCount: matrixResults.length,
          realBrowserCount: realBrowserResults.length,
        },
        browsers: browserResults,
        devices: deviceResults,
        matrix: matrixResults,
        realBrowser: realBrowserResults,
        featureSummary: this.buildFeatureSummary(baseSignals),
        recommendations: this.buildRecommendations(
          browserResults,
          deviceResults,
          matrixResults,
          baseSignals
        ),
        warnings,
        screenshotResults,
      };

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results,
      });
      this.updateTestProgress(testId, 100, '兼容性测试完成');

      const finalResult: CompatibilityFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        status: TestStatus.COMPLETED,
        score: overallScore,
      };

      // 不在此处调用 completionCallback —— 由 UserTestManager 统一处理

      this.cancelledTests.delete(testId);
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
      const friendlyMessage = diagnoseNetworkError(error, '兼容性测试', url);
      this.activeTests.set(testId, {
        status: TestStatus.FAILED,
        error: rawMessage,
      });

      // 不在此处调用 errorCallback —— 由 UserTestManager 统一处理

      this.cancelledTests.delete(testId);
      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
        },
        5 * 60 * 1000
      );

      return {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        error: rawMessage,
        status: TestStatus.FAILED,
        score: 0,
        summary: null,
        warnings: [],
        errors: [friendlyMessage],
      } as CompatibilityFinalResult;
    }
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId) || { status: TestStatus.RUNNING };
    this.activeTests.set(testId, {
      ...test,
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
    const current = this.progressTracker.get(testId);
    this.progressTracker.set(testId, {
      status: TestStatus.RUNNING,
      progress,
      currentStep: message,
      startTime: current?.startTime || new Date(),
      messages: current?.messages ? [...current.messages, message].slice(-20) : [message],
    });
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    this.cancelledTests.add(testId);
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: TestStatus.CANCELLED,
      });
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

  private isCancelled(testId?: string | null): boolean {
    return testId ? this.cancelledTests.has(testId) : false;
  }

  setProgressCallback(callback: (progress: CompatibilityProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: CompatibilityFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  calculateScore(
    browsers: Array<{ compatible: boolean; issues: string[] }>,
    devices: Array<{ compatible: boolean; issues: string[] }>,
    realBrowser: Array<{ available: boolean; compatible?: boolean; issues: string[] }> = []
  ) {
    if (!browsers.length && !devices.length) return 0;

    // 动态权重：有真实浏览器结果时分配更多权重给它
    const hasRealBrowser = realBrowser.filter(r => r.available).length > 0;
    const BROWSER_WEIGHT = hasRealBrowser ? 0.35 : 0.6;
    const DEVICE_WEIGHT = hasRealBrowser ? 0.25 : 0.4;
    const REAL_BROWSER_WEIGHT = hasRealBrowser ? 0.4 : 0;

    const scoreGroup = (items: Array<{ compatible: boolean; issues: string[] }>) => {
      if (!items.length) return 100;
      let total = 0;
      for (const item of items) {
        if (item.compatible) {
          total += 100;
        } else {
          // 渐进惩罚：第 1 个 issue 扣 20，后续每个扣 10，上限 70
          const penalty = Math.min(20 + (item.issues.length - 1) * 10, 70);
          total += Math.max(100 - penalty, 30);
        }
      }
      return total / items.length;
    };

    const scoreRealBrowser = (
      items: Array<{ available: boolean; compatible?: boolean; issues: string[] }>
    ) => {
      const available = items.filter(r => r.available);
      if (!available.length) return 100;
      let total = 0;
      for (const item of available) {
        if (item.compatible) {
          total += 100;
        } else {
          // 真实浏览器问题更严重：第 1 个 issue 扣 25，后续每个扣 15
          const penalty = Math.min(25 + (item.issues.length - 1) * 15, 80);
          total += Math.max(100 - penalty, 20);
        }
      }
      return total / available.length;
    };

    const browserScore = browsers.length ? scoreGroup(browsers) : 100;
    const deviceScore = devices.length ? scoreGroup(devices) : 100;
    const realBrowserScore = hasRealBrowser ? scoreRealBrowser(realBrowser) : 100;

    return Math.round(
      browserScore * BROWSER_WEIGHT +
        deviceScore * DEVICE_WEIGHT +
        realBrowserScore * REAL_BROWSER_WEIGHT
    );
  }

  private resolveSignals(
    baseSignals: PageSignals,
    browser: BrowserConfig | null,
    device: DeviceConfig | null,
    variantMap: Map<string, { html: string; signals: PageSignals }>
  ) {
    const userAgent = this.resolveUserAgent(browser, device);
    if (!userAgent) return baseSignals;
    return variantMap.get(userAgent)?.signals || baseSignals;
  }

  private buildCompatibilityMatrix(
    browsers: BrowserConfig[],
    devices: DeviceConfig[],
    baseSignals: PageSignals,
    variantMap: Map<string, { html: string; signals: PageSignals }>,
    enableFeatureDetection: boolean
  ) {
    const results: CompatibilityMatrixResult[] = [];
    for (const browser of browsers) {
      for (const device of devices) {
        const signals = this.resolveSignals(baseSignals, browser, device, variantMap);
        const featureResults = enableFeatureDetection
          ? this.evaluateFeatureSupport(browser, signals.requiredFeatures)
          : { issues: [], warnings: [], supported: [] };
        const issues = [...signals.issues, ...featureResults.issues];
        const warnings = featureResults.warnings;
        results.push({
          browser: browser.name,
          version: browser.version || 'latest',
          device: device.name,
          viewport: device.viewport,
          userAgent: this.resolveUserAgent(browser, device),
          compatible: issues.length === 0,
          issues,
          warnings,
          features: featureResults.supported,
          signals,
        });
      }
    }
    return results;
  }

  private resolveUserAgent(browser: BrowserConfig | null, device: DeviceConfig | null) {
    return (
      browser?.userAgent ||
      device?.userAgent ||
      (device?.name && DEFAULT_USER_AGENTS[device.name]) ||
      (browser?.name && DEFAULT_USER_AGENTS[browser.name]) ||
      null
    );
  }

  private async fetchVariants(
    url: string,
    timeout: number,
    browsers: BrowserConfig[],
    devices: DeviceConfig[],
    testId?: string
  ) {
    const map = new Map<string, { html: string; signals: PageSignals }>();
    const userAgents = new Set<string>();
    for (const browser of browsers) {
      const agent = this.resolveUserAgent(browser, null);
      if (agent) userAgents.add(agent);
    }
    for (const device of devices) {
      const agent = this.resolveUserAgent(null, device);
      if (agent) userAgents.add(agent);
    }

    // 并行请求（并发上限 4）
    const agents = Array.from(userAgents);
    const CONCURRENCY = 4;
    for (let i = 0; i < agents.length; i += CONCURRENCY) {
      if (this.isCancelled(testId)) break;
      const batch = agents.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(agent =>
          axios
            .get(url, { timeout, headers: { 'User-Agent': agent } })
            .then(response => ({ agent, html: String(response.data || '') }))
        )
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { agent, html } = result.value;
          map.set(agent, { html, signals: this.extractPageSignals(html) });
        } else {
          // 失败的请求：从 batch 中找到对应的 agent
          const idx = results.indexOf(result);
          const agent = batch[idx];
          if (agent) {
            map.set(agent, { html: '', signals: this.extractPageSignals('') });
          }
        }
      }
    }
    return map;
  }

  private extractPageSignals(html: string): PageSignals {
    const $ = cheerio.load(html || '');
    return extractPageSignalsShared($);
  }

  private evaluateFeatureSupport(browser: BrowserConfig, requiredFeatures: string[]) {
    const issues: string[] = [];
    const warnings: string[] = [];
    const supported: string[] = [];
    if (!requiredFeatures.length) {
      return { issues, warnings, supported };
    }

    const version = browser.version ? parseFloat(browser.version) : null;
    for (const feature of requiredFeatures) {
      const support = FEATURE_SUPPORT[feature];
      const minVersion = support?.[browser.name];
      if (!minVersion || version === null) {
        warnings.push(`无法确认 ${browser.name} 对 ${feature} 的支持情况`);
        continue;
      }
      if (version < minVersion) {
        issues.push(`${browser.name} ${browser.version} 不支持 ${feature}`);
      } else {
        supported.push(feature);
      }
    }
    return { issues, warnings, supported };
  }

  private buildFeatureSummary(signals: PageSignals): CompatibilityFeatureSummary {
    return {
      requiredFeatures: signals.requiredFeatures,
      meta: signals.meta,
      resources: signals.resources,
      css: signals.css,
      fonts: signals.fonts,
      media: signals.media,
      polyfill: signals.polyfill,
    };
  }

  private async runRealBrowserChecks(
    url: string,
    timeout: number,
    browsers: BrowserConfig[],
    devices: DeviceConfig[],
    captureScreenshot: boolean,
    testId?: string,
    showBrowser?: boolean
  ): Promise<CompatibilityRealBrowserResult[]> {
    // C5: 限制组合数量 — 选择代表性组合而非全量笛卡尔积
    // 策略：每个浏览器测试 Desktop + 最小移动端；每个设备测试第一个浏览器
    const combinations: Array<{ browser: BrowserConfig; device: DeviceConfig }> = [];
    const desktopDevice = devices.find(d => d.viewport.width >= 1024) || devices[0];
    const mobileDevice = devices
      .filter(d => d.viewport.width < 768)
      .sort((a, b) => a.viewport.width - b.viewport.width)[0];
    const seen = new Set<string>();

    // 每个浏览器 × (Desktop + Mobile)
    for (const browser of browsers) {
      if (desktopDevice) {
        const key = `${browser.name}|${desktopDevice.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          combinations.push({ browser, device: desktopDevice });
        }
      }
      if (mobileDevice) {
        const key = `${browser.name}|${mobileDevice.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          combinations.push({ browser, device: mobileDevice });
        }
      }
    }
    // 每个设备 × 第一个浏览器（补充未覆盖的设备）
    const firstBrowser = browsers[0];
    if (firstBrowser) {
      for (const device of devices) {
        const key = `${firstBrowser.name}|${device.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          combinations.push({ browser: firstBrowser, device });
        }
      }
    }

    const poolAvailable = await puppeteerPool.isAvailable();
    if (!poolAvailable) {
      return combinations.map(({ browser, device }) => ({
        browser: browser.name,
        version: browser.version || 'latest',
        device: device.name,
        viewport: device.viewport,
        userAgent: this.resolveUserAgent(browser, device),
        available: false,
        issues: ['未检测到 Puppeteer 依赖，无法执行真实浏览器测试'],
        warnings: [] as string[],
      }));
    }

    const results: CompatibilityRealBrowserResult[] = [];

    for (const { browser, device } of combinations) {
      if (this.isCancelled(testId)) break;
      const issues: string[] = [];
      const warnings: string[] = [];
      const userAgent = this.resolveUserAgent(browser, device);
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      let screenshotBase64: string | null = null;
      let release: (() => Promise<void>) | null = null;
      try {
        const acquired = await puppeteerPool.acquirePage({
          width: device.viewport.width,
          height: device.viewport.height,
          deviceScaleFactor: device.viewport.width < 768 ? 2 : 1,
          userAgent: userAgent || undefined,
          warmupUrl: url,
          headed: showBrowser,
        });
        release = acquired.release;
        const page = acquired.page;

        page.on('pageerror', (error: unknown) =>
          pageErrors.push(error instanceof Error ? error.message : String(error))
        );
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        page.on('requestfailed', request => {
          failedRequests.push(request.url());
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout });
        if (captureScreenshot) {
          try {
            screenshotBase64 = (await page.screenshot({ fullPage: true, encoding: 'base64' })) as
              | string
              | null;
          } catch {
            screenshotBase64 = null;
          }
        }
        const domStats = await page.evaluate(() => {
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as
            | PerformanceEntry
            | undefined;
          // 优先使用 PerformanceNavigationTiming（替代已废弃的 performance.timing）
          const navEntry = performance.getEntriesByType('navigation')[0] as
            | PerformanceNavigationTiming
            | undefined;
          let timing: { domContentLoaded: number; loadEvent: number } | null = null;
          if (navEntry) {
            timing = {
              domContentLoaded: navEntry.domContentLoadedEventEnd,
              loadEvent: navEntry.loadEventEnd,
            };
          }
          return {
            title: document.title,
            viewportMeta: !!document.querySelector('meta[name="viewport"]'),
            h1Count: document.querySelectorAll('h1').length,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            timing,
            firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
          };
        });

        if (!domStats.viewportMeta) {
          issues.push('缺少viewport meta标签');
        }
        if (!domStats.h1Count) {
          warnings.push('页面缺少H1标题');
        }
        if (domStats.scrollWidth > device.viewport.width + 5) {
          issues.push('存在水平溢出，可能影响布局适配');
        }
        if (pageErrors.length) {
          issues.push(`页面脚本错误: ${pageErrors.join(' | ')}`);
        }
        if (consoleErrors.length) {
          warnings.push(`控制台错误: ${consoleErrors.join(' | ')}`);
        }
        if (failedRequests.length) {
          warnings.push(`资源加载失败: ${failedRequests.length} 个`);
        }

        results.push({
          browser: browser.name,
          version: browser.version || 'latest',
          device: device.name,
          viewport: device.viewport,
          userAgent,
          available: true,
          compatible: issues.length === 0,
          issues,
          warnings,
          metrics: {
            title: domStats.title,
            scrollWidth: domStats.scrollWidth,
            scrollHeight: domStats.scrollHeight,
            timing: domStats.timing,
            failedRequests: failedRequests.length,
            firstContentfulPaint: domStats.firstContentfulPaint,
            screenshot: screenshotBase64,
          },
        });
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
        results.push({
          browser: browser.name,
          version: browser.version || 'latest',
          device: device.name,
          viewport: device.viewport,
          userAgent,
          available: false,
          compatible: false,
          issues,
          warnings,
        });
      } finally {
        if (release) {
          await release();
        }
      }
    }

    return results;
  }

  buildRecommendations(
    browsers: Array<{ issues: string[] }>,
    devices: Array<{ issues: string[] }>,
    matrix: CompatibilityMatrixResult[],
    signals: PageSignals
  ) {
    const recommendations: string[] = [];
    const seen = new Set<string>();
    const add = (rec: string, dedupeKey?: string) => {
      const key = dedupeKey || rec;
      if (seen.has(key)) return;
      seen.add(key);
      recommendations.push(rec);
    };

    // ── 1. 基础 HTML 信号（提供修复方案而非重复 issue 描述） ──
    if (!signals.meta.hasViewport) {
      add(
        '[关键] 添加 <meta name="viewport" content="width=device-width, initial-scale=1">，确保移动端正确渲染',
        'viewport'
      );
    }
    if (!signals.meta.hasCharset) {
      add('[关键] 添加 <meta charset="UTF-8">，避免字符编码问题', 'charset');
    }
    if (!signals.meta.hasLang) {
      add('[建议] 为 <html> 标签添加 lang 属性，帮助浏览器和辅助技术识别语言', 'lang');
    }

    // ── 2. Polyfill / 降级 ──
    if (signals.requiredFeatures.length > 0 && !signals.polyfill.hasPolyfillHint) {
      add(
        `[重要] 页面使用了 ${signals.requiredFeatures.length} 项现代特性（${signals.requiredFeatures.slice(0, 5).join('、')}），建议引入 Polyfill 或提供 nomodule 降级脚本`,
        'polyfill'
      );
    }
    if (signals.resources.hasModuleScript && !signals.resources.hasNoModule) {
      add(
        '[重要] 使用了 ES Module 脚本但缺少 <script nomodule> 兜底，旧浏览器将无法执行 JS',
        'nomodule'
      );
    }

    // ── 3. CSS 兼容性 ──
    if (signals.css.usesContainerQueries) {
      add(
        '[注意] 使用了 CSS Container Queries，Safari 16 以下和旧版 Firefox 不支持',
        'containerQueries'
      );
    }
    if (signals.css.usesHas) {
      add('[注意] 使用了 CSS :has() 选择器，Firefox 121 以下不支持', 'cssHas');
    }
    if (signals.css.usesNesting) {
      add('[注意] 使用了 CSS 原生嵌套语法，需要 Chrome 120+ / Safari 17.2+', 'cssNesting');
    }
    if (signals.css.vendorPrefixes.length > 0) {
      add(
        `[信息] 检测到 vendor prefix（${signals.css.vendorPrefixes.join('、')}），建议使用 Autoprefixer 自动管理`,
        'vendorPrefix'
      );
    }

    // ── 4. 字体兼容性 ──
    if (signals.fonts.fontFaceCount > 0 && !signals.fonts.hasWoff2) {
      add(
        '[重要] 使用了 @font-face 但缺少 WOFF2 格式，建议至少提供 WOFF2 + WOFF 双格式以覆盖所有现代浏览器',
        'woff2'
      );
    }

    // ── 5. 媒体兼容性 ──
    if (signals.media.videoSources.length > 0 && !signals.media.hasVideoFallback) {
      add(
        '[建议] 视频元素仅有单一格式，建议同时提供 MP4 和 WebM 以确保跨浏览器播放',
        'videoFallback'
      );
    }
    if (signals.resources.hasWebp && !signals.resources.hasPicture) {
      add(
        '[建议] 使用了 WebP 图片但未通过 <picture> 提供回退格式，Safari 13 及以下不支持 WebP',
        'webpFallback'
      );
    }
    if (signals.resources.hasAvif && !signals.resources.hasPicture) {
      add(
        '[建议] 使用了 AVIF 图片但未通过 <picture> 提供回退格式，旧浏览器不支持 AVIF',
        'avifFallback'
      );
    }

    // ── 6. 从浏览器/设备/矩阵 issues 中提取未覆盖的修复建议 ──
    const allIssues = new Map<string, number>();
    [...browsers, ...devices, ...matrix].forEach(item => {
      for (const issue of item.issues) {
        allIssues.set(issue, (allIssues.get(issue) || 0) + 1);
      }
    });
    // 按出现频率排序，提取高频问题的修复建议
    const sortedIssues = Array.from(allIssues.entries()).sort((a, b) => b[1] - a[1]);
    for (const [issue, count] of sortedIssues) {
      if (recommendations.length >= 15) break;
      // 跳过已被上面覆盖的基础信号问题
      if (
        (/viewport|charset|lang|nomodule/.test(issue) && seen.has('viewport')) ||
        seen.has('charset') ||
        seen.has('lang') ||
        seen.has('nomodule')
      )
        continue;
      if (issue.includes('不支持') && count >= 2) {
        add(`[兼容] ${issue}（影响 ${count} 个测试组合）`, issue);
      }
    }

    // ── 7. 设备适配 ──
    const mobileDeviceIssues = devices.filter(d => d.issues.length > 0);
    if (mobileDeviceIssues.length > 0) {
      add(
        `[重要] ${mobileDeviceIssues.length} 个设备存在适配问题，建议优先修复移动端兼容性`,
        'deviceIssues'
      );
    }

    // ── 8. 矩阵告警 ──
    const matrixWarningCount = matrix.filter(m => m.warnings.length > 0).length;
    if (matrixWarningCount > 0) {
      add(
        `[注意] 浏览器×设备矩阵中 ${matrixWarningCount} 个组合存在告警，建议重点验证`,
        'matrixWarnings'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('兼容性表现良好，未发现明显问题，建议保持现有实现');
    }

    return recommendations;
  }

  /**
   * 多路径截图：对目标 URL 及其子页面在不同设备视口下进行批量截图
   * 路径发现与元数据采集合并在一次 HTTP 请求中完成，避免重复请求。
   */
  private async runMultiPathScreenshots(
    baseUrl: string,
    devices: DeviceConfig[],
    config: CompatibilityConfig,
    testId?: string
  ): Promise<CompatibilityResults['screenshotResults']> {
    const screenshotService = new ScreenshotService();
    const available = await screenshotService.isAvailable();
    if (!available) {
      return {
        summary: { totalPaths: 0, totalScreenshots: 0, devices: [], failedPaths: [] },
        items: [],
      };
    }

    const maxPages = config.screenshotMaxPages ?? 5;
    const crawlDepth = config.screenshotCrawlDepth ?? 1;
    const delay = config.screenshotDelay ?? 500;
    const fullPage = config.screenshotFullPage ?? true;

    // 1. 收集路径 + 元数据（一次 HTTP 同时完成爬取和元数据采集）
    type PathWithMeta = { path: string; meta: NonNullable<CompatibilityScreenshotItem['meta']> };
    let pathEntries: PathWithMeta[];
    if (config.screenshotPaths && config.screenshotPaths.length > 0) {
      // 用户指定路径：需要单独采集元数据
      pathEntries = await this.fetchPathsMeta(baseUrl, config.screenshotPaths.slice(0, maxPages));
    } else {
      pathEntries = await this.discoverPathsWithMeta(baseUrl, maxPages, crawlDepth);
    }

    // 2. 选择截图视口：从 devices 中选择代表性设备（desktop + tablet + mobile）
    const viewportDevices = this.selectRepresentativeDevices(devices);
    const items: CompatibilityScreenshotItem[] = [];
    const failedPaths: string[] = [];

    // 3. 逐路径逐视口截图（无额外 HTTP 请求）
    for (const entry of pathEntries) {
      if (this.isCancelled(testId)) break;
      const pageUrl = this.resolveScreenshotUrl(baseUrl, entry.path);
      let pathFailed = true;

      for (const dev of viewportDevices) {
        if (this.isCancelled(testId)) break;
        try {
          const result = await screenshotService.capture({
            url: pageUrl,
            width: dev.viewport.width,
            height: dev.viewport.height,
            fullPage,
            delay,
            format: 'png',
            hideScrollbar: true,
            timeout: config.timeout || 30000,
            mobile: dev.viewport.width < 768,
          });

          try {
            await screenshotService.saveScreenshot(result, {
              testId: testId || 'compat',
              label: `${entry.path.replace(/\//g, '_')}-${dev.name}`,
              subDir: 'compatibility-screenshots',
            });
          } catch {
            // 保存失败不影响结果
          }

          items.push({
            path: entry.path,
            url: pageUrl,
            device: dev.name,
            viewport: dev.viewport,
            screenshotBase64: result.filePath ? '' : result.data.substring(0, 200) + '...',
            format: 'png',
            meta: entry.meta,
          });
          pathFailed = false;
        } catch {
          // 截图失败，跳过
        }
      }

      if (pathFailed) {
        failedPaths.push(entry.path);
      }
    }

    return {
      summary: {
        totalPaths: pathEntries.length,
        totalScreenshots: items.length,
        devices: viewportDevices.map(d => d.name),
        failedPaths,
      },
      items,
    };
  }

  /**
   * BFS 爬取同源页面路径，同时在一次 HTTP 请求中采集元数据（title/statusCode/loadTime），
   * 避免后续截图阶段重复请求。
   */
  private async discoverPathsWithMeta(
    baseUrl: string,
    maxPages: number,
    crawlDepth: number
  ): Promise<Array<{ path: string; meta: NonNullable<CompatibilityScreenshotItem['meta']> }>> {
    const baseOrigin = new URL(baseUrl).origin;
    const results: Array<{ path: string; meta: NonNullable<CompatibilityScreenshotItem['meta']> }> =
      [];
    const discoveredPaths = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0 && discoveredPaths.size < maxPages) {
      const item = queue.shift();
      if (!item) break;
      if (visited.has(item.url)) continue;
      visited.add(item.url);

      try {
        const parsedUrl = new URL(item.url);
        if (parsedUrl.origin !== baseOrigin) continue;
        const pathname = parsedUrl.pathname || '/';
        if (discoveredPaths.has(pathname)) continue;
        discoveredPaths.add(pathname);

        // 单次请求：同时用于链接发现 + 元数据采集
        const start = Date.now();
        const resp = await axios.get(item.url, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CompatBot/1.0)', Accept: 'text/html' },
          maxRedirects: 3,
          validateStatus: () => true,
        });
        const loadTime = Date.now() - start;
        const html = typeof resp.data === 'string' ? resp.data : '';
        const $ = cheerio.load(html);

        results.push({
          path: pathname,
          meta: {
            title: $('title').text().trim() || '(无标题)',
            statusCode: resp.status,
            loadTime,
          },
        });

        // 链接发现（仅在深度允许且未达上限时）
        if (item.depth < crawlDepth && discoveredPaths.size < maxPages && resp.status < 400) {
          $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (
              !href ||
              href.startsWith('#') ||
              href.startsWith('mailto:') ||
              href.startsWith('tel:') ||
              href.startsWith('javascript:')
            )
              return;
            if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|mp4|woff|woff2|ttf)$/i.test(href))
              return;
            try {
              const resolved = new URL(href, item.url);
              if (resolved.origin === baseOrigin && !visited.has(resolved.href)) {
                queue.push({ url: resolved.href, depth: item.depth + 1 });
              }
            } catch {
              // 无效链接跳过
            }
          });
        }
      } catch {
        // 请求失败仍记录路径
        const pathname = new URL(item.url).pathname || '/';
        if (!discoveredPaths.has(pathname)) {
          discoveredPaths.add(pathname);
          results.push({
            path: pathname,
            meta: { title: '(请求失败)', statusCode: 0, loadTime: 0 },
          });
        }
      }
    }

    return results.slice(0, maxPages);
  }

  /**
   * 为用户指定的路径列表采集元数据（批量请求）
   */
  private async fetchPathsMeta(
    baseUrl: string,
    paths: string[]
  ): Promise<Array<{ path: string; meta: NonNullable<CompatibilityScreenshotItem['meta']> }>> {
    const results: Array<{ path: string; meta: NonNullable<CompatibilityScreenshotItem['meta']> }> =
      [];
    for (const p of paths) {
      const pageUrl = this.resolveScreenshotUrl(baseUrl, p);
      try {
        const start = Date.now();
        const resp = await axios.get(pageUrl, { timeout: 10000, validateStatus: () => true });
        const loadTime = Date.now() - start;
        const html = typeof resp.data === 'string' ? resp.data : '';
        const $ = cheerio.load(html);
        results.push({
          path: p,
          meta: {
            title: $('title').text().trim() || '(无标题)',
            statusCode: resp.status,
            loadTime,
          },
        });
      } catch {
        results.push({ path: p, meta: { title: '(请求失败)', statusCode: 0, loadTime: 0 } });
      }
    }
    return results;
  }

  /**
   * 从设备列表中选择代表性设备（最多 3 个：桌面、平板、移动）
   */
  private selectRepresentativeDevices(devices: DeviceConfig[]): DeviceConfig[] {
    if (devices.length <= 3) return devices;
    const desktop = devices.find(d => d.viewport.width >= 1200);
    const tablet = devices.find(d => d.viewport.width >= 768 && d.viewport.width < 1200);
    const mobile = devices.find(d => d.viewport.width < 768);
    const selected = [desktop, tablet, mobile].filter((d): d is DeviceConfig => !!d);
    return selected.length > 0 ? selected : devices.slice(0, 3);
  }

  private resolveScreenshotUrl(base: string, path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return new URL(path, new URL(base).origin).href;
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

export default CompatibilityTestEngine;
