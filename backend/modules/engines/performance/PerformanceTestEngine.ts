import type { CheerioAPI } from 'cheerio';
import http, { type ClientRequest, type IncomingMessage } from 'http';
import https from 'https';
import Joi from 'joi';
import { performance } from 'perf_hooks';
import zlib from 'zlib';
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
import { insertExecutionLog } from '../../testing/services/testLogService';
import HTMLParsingService from '../shared/services/HTMLParsingService';
import PerformanceMetricsService from '../shared/services/PerformanceMetricsService';
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import { diagnoseNetworkError, isFatalNetworkError } from '../shared/utils/networkDiagnostics';

type RequestConfig = {
  method?: string;
  contentType?: string;
  authType?: string;
  authToken?: string;
  headers?: Array<{ key: string; value: string; enabled?: boolean }>;
  queryParams?: Array<{ key: string; value: string; enabled?: boolean }>;
  body?: string;
  bodyType?: string;
};

type PerformanceRunConfig = BaseTestConfig & {
  testId?: string;
  iterations?: number;
  timeout?: number;
  cacheControl?: string;
  includeResources?: boolean;
  fetchHtml?: boolean;
  verbose?: boolean;
  // 高级面板字段
  maxRetries?: number;
  retryOnFail?: boolean;
  followRedirects?: boolean;
  device?: string;
  userAgent?: string;
  networkThrottle?: string;
  // 请求面板字段
  request?: RequestConfig;
};

const NETWORK_PRESETS: Record<
  string,
  { downloadThroughput: number; uploadThroughput: number; latency: number }
> = {
  wifi: {
    downloadThroughput: (30 * 1024 * 1024) / 8,
    uploadThroughput: (15 * 1024 * 1024) / 8,
    latency: 10,
  },
  '5g': {
    downloadThroughput: (100 * 1024 * 1024) / 8,
    uploadThroughput: (50 * 1024 * 1024) / 8,
    latency: 20,
  },
  '4g': {
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (4 * 1024 * 1024) / 8,
    latency: 170,
  },
  '3g': {
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 300,
  },
  'slow-3g': {
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (250 * 1024) / 8,
    latency: 400,
  },
  '2g': { downloadThroughput: (250 * 1024) / 8, uploadThroughput: (50 * 1024) / 8, latency: 800 },
};

type PerformanceConfig = PerformanceRunConfig & {
  testId: string;
  url: string;
};

type ResourceItem = {
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
};

type ContentAnalysis = {
  title?: { content: string; length: number; hasTitle: boolean };
  meta?: { description: string; descriptionLength: number; hasDescription: boolean };
  h1?: { content: string; hasH1: boolean };
  resourceHints?: {
    preconnect: number;
    prefetch: number;
    preload: number;
    dns_prefetch: number;
  };
  error?: string;
};

type ResourceAnalysis = {
  resources: ResourceItem;
  counts: {
    images: number;
    scripts: number;
    stylesheets: number;
    fonts: number;
    total: number;
    [key: string]: number;
  };
};

type RecommendationItem = {
  title?: string;
  type?: string;
  priority?: string;
  description?: string;
  impact?: string;
  suggestions?: string[];
};

type PerformanceTestRecord = {
  testId: string;
  status: string;
  score: number;
  summary: PerformanceResults['summary'];
  metrics: PerformanceResults['metrics'];
  warnings: string[];
  errors: string[];
  details: PerformanceResults;
};

type PerformanceProgressPayload = {
  testId?: string;
  progress: number;
  message: string;
  status?: string;
};

type PerformanceCompletionPayload = PerformanceFinalResult;

type PerformanceFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  results?: PerformanceTestRecord;
  status: string;
  score?: number;
  summary?: PerformanceResults['summary'];
  warnings?: string[];
  errors?: string[];
  error?: string;
  timestamp: string;
};

type BrowserNetworkResources = {
  counts: Record<string, number>;
  items: Array<{
    url: string;
    type: string;
    size: number;
    duration: number;
    compressed?: boolean;
    encoding?: string;
    renderBlocking?: boolean;
    decodedSize?: number;
  }>;
};

type InpDiagnosticsData = {
  interactionEvents: Array<{
    name: string;
    duration: number;
    startTime: number;
    interactionId: number;
    processingStart: number;
    processingEnd: number;
    inputDelay: number;
    processingTime: number;
    presentationDelay: number;
  }>;
  longTasks: Array<{
    duration: number;
    startTime: number;
    blockingTime: number;
    name: string;
  }>;
  totalInteractions: number;
  totalLongTasks: number;
} | null;

type PerformanceMetrics = {
  url: string;
  timestamp: string;
  basicTiming: {
    iterations: number;
    totalTime: { avg: number; min: number; max: number };
    dnsTime: { avg: number; min: number; max: number };
    connectionTime: { avg: number; min: number; max: number };
    tlsTime: { avg: number; min: number; max: number };
    ttfb: { avg: number; min: number; max: number };
    downloadTime: { avg: number; min: number; max: number };
    contentLength: { avg: number; min: number; max: number };
    rawResults?: Array<{ content?: string }>;
  };
  performanceScore: { score: number; grade: string };
  coreWebVitals: {
    lcp: { value: number; rating: string; estimated?: boolean };
    fcp: { value: number; rating: string; estimated?: boolean };
    cls: { value: number; rating: string; estimated?: boolean };
    inp: { value: number; rating: string; estimated?: boolean };
    ttfb: { value: number; rating: string; estimated?: boolean };
  };
  rawTimingResults?: PerformanceTimingResult[];
  browserNetworkResources?: BrowserNetworkResources;
  inpDiagnostics?: InpDiagnosticsData;
};

type PerformanceMetricsOptions = {
  iterations: number;
  userAgent: string;
  timeout: number | string;
  includeContent: boolean;
  cacheControl?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
};

type PerformanceTimingResult = {
  totalTime: number;
  ttfb: number;
  downloadTime: number;
  dnsTime: number;
  connectionTime: number;
  tlsTime: number;
  contentLength: number;
  content?: string;
  statusCode: number;
  redirectCount: number;
  headers: Record<string, string>;
  httpVersion: string;
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
    tls: { average: string; min: string; max: string };
    ttfb: { average: string; min: string; max: string; rating: string };
    download: { average: string; min: string; max: string };
    contentSize: { average: string; min: string; max: string };
  };
  webVitals: {
    lcp: { value: number; rating: string; estimated?: boolean };
    fcp: { value: number; rating: string; estimated?: boolean };
    cls: { value: number; rating: string; estimated?: boolean };
    inp: { value: number; rating: string; estimated?: boolean };
    ttfb: { value: number; rating: string; estimated?: boolean };
  };
  httpInfo?: {
    statusCode: number;
    httpVersion: string;
    redirectCount: number;
    compression: string;
    cacheControl: string;
    server: string;
    contentType: string;
  };
  resources?: { resources: ResourceItem; counts: { total: number } };
  contentAnalysis?: ContentAnalysis;
  recommendations?: RecommendationItem[];
  inpDiagnostics?: InpDiagnosticsData;
};

class PerformanceTestEngine implements ITestEngine<PerformanceRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  options: { timeout: number | string; userAgent: string };
  metricsService: PerformanceMetricsService;
  htmlService: HTMLParsingService;
  initialized: boolean;
  lifecycle?: ITestEngine<PerformanceRunConfig, BaseTestResult>['lifecycle'];
  activeTests: Map<
    string,
    {
      status?: string;
      progress?: number;
      startTime?: number;
      lastUpdate?: number;
      message?: string;
      error?: string;
      results?: PerformanceResults | PerformanceTestRecord;
    }
  >;
  progressCallback: ((progress: PerformanceProgressPayload) => void) | null;
  completionCallback: ((results: PerformanceFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  private progressTracker: Map<string, TestProgress>;
  private abortControllers: Map<string, AbortController>;
  private customThresholds: { ttfb?: number; lcp?: number; fcp?: number } = {};

  constructor() {
    this.type = TestEngineType.PERFORMANCE;
    this.name = 'performance';
    this.version = '3.0.0';
    this.description = '性能测试引擎 (使用共享服务)';
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'page-load-timing',
        'dns-performance',
        'ttfb-measurement',
        'resource-analysis',
        'performance-scoring',
        'core-web-vitals-simulation',
      ],
      requiredConfig: ['url'],
      optionalConfig: ['iterations', 'includeResources', 'fetchHtml', 'verbose'],
      outputFormat: ['summary', 'metrics', 'resources', 'contentAnalysis', 'recommendations'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 3000,
        max: 60000,
        typical: 15000,
      },
    };
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
    this.progressTracker = new Map();
    this.abortControllers = new Map();
  }

  validate(config: PerformanceRunConfig): ValidationResult {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      iterations: Joi.number().min(1).default(3),
      timeout: Joi.number().min(100).default(30000),
      cacheControl: Joi.string().default('no-cache'),
      includeResources: Joi.boolean().default(true),
      fetchHtml: Joi.boolean().default(true),
      verbose: Joi.boolean().default(false),
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

    // 超出推荐范围时给出警告，但不阻止执行
    const warnings: string[] = [];
    const cfg = config as Record<string, unknown>;
    if (typeof cfg.iterations === 'number' && cfg.iterations > 100) {
      warnings.push(`迭代次数 ${cfg.iterations} 较大，测试可能耗时较长`);
    }
    if (typeof cfg.timeout === 'number' && cfg.timeout > 120000) {
      warnings.push(`单次请求超时 ${cfg.timeout}ms 较长`);
    }
    // 注入 executionTimeout：TestEngineRegistry.execute() 在调用 engine.run() 之前读取
    const cfgAny = config as Record<string, unknown>;
    const iterations = typeof cfgAny.iterations === 'number' ? cfgAny.iterations : 3;
    const perTimeout = typeof cfgAny.timeout === 'number' ? cfgAny.timeout : 30000;
    // 超时 = 迭代次数 × 单次超时 + 60s 余量（资源分析 + 报告生成）
    cfgAny.executionTimeout = iterations * perTimeout + 60000;

    return { isValid: true, errors: [], warnings, suggestions: [] };
  }

  private normalizeConfig(config: PerformanceConfig): PerformanceConfig {
    // 展开 options：前端发送 { url, testType, options: { iterations, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as PerformanceConfig;
    }

    const schema = Joi.object({
      testId: Joi.string().required(),
      url: Joi.string().uri().required(),
      iterations: Joi.number().min(1).max(1000).default(3),
      timeout: Joi.number().min(100).max(300000).default(30000),
      cacheControl: Joi.string().default('no-cache'),
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

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.metricsService.initialize();
    await this.htmlService.initialize();

    this.initialized = true;
    return;
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
        metrics: await this.metricsService.getHealth(),
        html: await this.htmlService.getHealth(),
      },
    };
  }

  async run(
    config: PerformanceRunConfig,
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
      currentStep: '准备性能测试环境',
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
      } as PerformanceConfig);
      const endTime = new Date();
      const perfScore = result.results?.score ?? 0;
      const perfGrade =
        result.results?.summary?.grade ||
        (perfScore >= 90
          ? 'A'
          : perfScore >= 80
            ? 'B'
            : perfScore >= 60
              ? 'C'
              : perfScore >= 40
                ? 'D'
                : 'F');
      const perfSummary = result.results?.summary;
      const structuredSummary = {
        score: perfScore,
        grade: perfGrade,
        passed: perfScore >= 60,
        averageLoadTime: perfSummary?.averageLoadTime ?? 'N/A',
        fastestLoadTime: perfSummary?.fastestLoadTime ?? 'N/A',
        slowestLoadTime: perfSummary?.slowestLoadTime ?? 'N/A',
      };
      const recItems = (result.results?.details?.recommendations || []) as RecommendationItem[];
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: perfScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || '性能测试失败')],
        warnings: result.results?.warnings || [],
        recommendations: recItems.map(item => {
          const title = String(item.title || item.type || '性能优化建议');
          const desc = item.description ? `: ${item.description}` : '';
          return `${title}${desc}`;
        }),
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
        summary: '性能测试失败',
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

  estimateDuration(config: PerformanceRunConfig): number {
    const iterations = typeof config.iterations === 'number' ? config.iterations : 3;
    const timeout = typeof config.timeout === 'number' ? config.timeout : 30000;
    // 预估 = 迭代次数 × min(单次超时, 10s 典型值) + 分析余量
    return Math.max(5000, iterations * Math.min(timeout, 10000) + 5000);
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
      initialized: this.initialized,
    };
  }

  async executeTest(config: PerformanceConfig): Promise<PerformanceFinalResult> {
    const testId = config.testId;
    const ac = new AbortController();
    this.abortControllers.set(testId, ac);
    try {
      if (ac.signal.aborted) throw new Error('测试已取消');
      await this.initialize();

      // 应用前端传来的引擎性能模式（仅桌面端生效）
      const _cfgRaw = config as unknown as Record<string, unknown>;
      if (typeof _cfgRaw.engineMode === 'string') {
        puppeteerPool.applyEngineMode(_cfgRaw.engineMode);
      }

      this.updateTestProgress(testId, 5, '初始化性能测试');

      const validatedConfig = this.normalizeConfig(config);
      const {
        url,
        iterations = 3,
        timeout: configTimeout = 30000,
        cacheControl: configCacheControl = 'no-cache',
        includeResources = true,
        fetchHtml = true,
        verbose = false,
        // 高级面板字段
        maxRetries = 0,
        retryOnFail = false,
        followRedirects = true,
        device = 'desktop',
        userAgent: configUserAgent = '',
        networkThrottle = 'none',
        // 请求面板字段
        request: requestConfig,
        // 自定义阈值
        ttfbThreshold,
        lcpThreshold,
        fcpThreshold,
      } = validatedConfig as PerformanceConfig & {
        url: string;
        ttfbThreshold?: number;
        lcpThreshold?: number;
        fcpThreshold?: number;
      };

      this.customThresholds = {
        ttfb: typeof ttfbThreshold === 'number' ? ttfbThreshold : undefined,
        lcp: typeof lcpThreshold === 'number' ? lcpThreshold : undefined,
        fcp: typeof fcpThreshold === 'number' ? fcpThreshold : undefined,
      };

      // 解析请求面板配置
      const reqMethod = requestConfig?.method || 'GET';
      const reqHeaders: Record<string, string> = {};
      if (requestConfig?.headers?.length) {
        for (const h of requestConfig.headers) {
          if (h.key && h.enabled !== false) reqHeaders[h.key] = h.value;
        }
      }
      if (requestConfig?.contentType && reqMethod !== 'GET' && reqMethod !== 'HEAD') {
        reqHeaders['Content-Type'] = requestConfig.contentType;
      }
      if (requestConfig?.authType === 'bearer' && requestConfig?.authToken) {
        reqHeaders['Authorization'] = `Bearer ${requestConfig.authToken}`;
      } else if (requestConfig?.authType === 'basic' && requestConfig?.authToken) {
        reqHeaders['Authorization'] =
          `Basic ${Buffer.from(requestConfig.authToken).toString('base64')}`;
      } else if (requestConfig?.authType === 'apikey' && requestConfig?.authToken) {
        const [keyName, ...keyVal] = requestConfig.authToken.split('=');
        if (keyName) reqHeaders[keyName] = keyVal.join('=');
      }
      const reqBody =
        reqMethod !== 'GET' && reqMethod !== 'HEAD' ? requestConfig?.body || undefined : undefined;

      // 构建 URL（附加 queryParams）
      let finalUrl = url;
      if (requestConfig?.queryParams?.length) {
        const urlObj = new URL(url);
        for (const p of requestConfig.queryParams) {
          if (p.key) urlObj.searchParams.append(p.key, p.value);
        }
        finalUrl = urlObj.toString();
      }

      // 设备预设：viewport + UA
      const DEVICE_PRESETS: Record<
        string,
        { width: number; height: number; isMobile: boolean; ua: string }
      > = {
        desktop: { width: 1920, height: 1080, isMobile: false, ua: '' },
        laptop: { width: 1366, height: 768, isMobile: false, ua: '' },
        mobile: {
          width: 375,
          height: 812,
          isMobile: true,
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        'iphone-14': {
          width: 393,
          height: 852,
          isMobile: true,
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
        'pixel-7': {
          width: 412,
          height: 915,
          isMobile: true,
          ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        },
        'galaxy-s23': {
          width: 360,
          height: 780,
          isMobile: true,
          ua: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        },
        tablet: {
          width: 768,
          height: 1024,
          isMobile: true,
          ua: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/604.1',
        },
        'ipad-pro': {
          width: 1024,
          height: 1366,
          isMobile: true,
          ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1',
        },
      };
      const devicePreset = DEVICE_PRESETS[device] || DEVICE_PRESETS.desktop;

      // 解析 userAgent：优先用户自定义 > device 默认
      const resolvedUserAgent = configUserAgent || devicePreset.ua || this.options.userAgent;

      // 输出配置状态到测试日志，让用户看到开关生效
      const configParts = [
        `迭代 ${iterations} 次`,
        `超时 ${configTimeout}ms`,
        `缓存策略 ${configCacheControl}`,
        `请求方法 ${reqMethod}`,
      ];
      if (!fetchHtml) configParts.push('HTML 抓取: 关闭');
      if (!includeResources) configParts.push('资源分析: 关闭');
      if (verbose) configParts.push('详细日志: 开启');
      if (retryOnFail && maxRetries > 0) configParts.push(`失败重试 ${maxRetries} 次`);
      if (!followRedirects) configParts.push('重定向跟随: 关闭');
      if (networkThrottle && networkThrottle !== 'none')
        configParts.push(`网络模拟 ${networkThrottle}`);
      if (configUserAgent) configParts.push(`自定义 UA`);
      else if (device !== 'desktop') configParts.push(`设备 ${device}`);
      void insertExecutionLog(testId, 'info', `性能测试配置: ${configParts.join(' · ')}`, {
        iterations,
        timeout: configTimeout,
        cacheControl: configCacheControl,
        fetchHtml,
        includeResources,
        verbose,
        method: reqMethod,
        device,
      });

      // 超出推荐范围时写入警告日志（不阻止执行）
      if (iterations > 100) {
        void insertExecutionLog(testId, 'warn', `迭代次数 ${iterations} 较大，测试可能耗时较长`);
      }
      if (configTimeout > 120000) {
        void insertExecutionLog(testId, 'warn', `单次请求超时 ${configTimeout}ms 较长`);
      }

      if (verbose) {
        void insertExecutionLog(testId, 'debug', `目标 URL: ${finalUrl}`, {
          url: finalUrl,
          userAgent: resolvedUserAgent,
        });
      }

      const metricsOptions: PerformanceMetricsOptions = {
        iterations,
        userAgent: resolvedUserAgent,
        timeout: configTimeout,
        includeContent: fetchHtml,
        cacheControl: configCacheControl === 'default' ? undefined : configCacheControl,
        method: reqMethod,
        headers: Object.keys(reqHeaders).length ? reqHeaders : undefined,
        body: reqBody,
        followRedirects,
      };

      const perfWarnings: string[] = [];
      let metricsResult: Awaited<ReturnType<typeof this.collectBasicMetrics>> =
        this.buildFallbackMetrics(finalUrl);
      const effectiveRetries = retryOnFail ? Math.max(0, maxRetries) : 0;
      let metricsCollected = false;
      for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
        if (ac.signal.aborted) throw new Error('测试已取消');
        try {
          if (attempt > 0 && verbose) {
            console.debug(`[PerformanceTestEngine] 重试 ${attempt}/${effectiveRetries}`);
          }
          metricsResult = await this.collectBasicMetrics(
            finalUrl,
            metricsOptions,
            testId,
            ac.signal,
            networkThrottle,
            devicePreset,
            (config as unknown as Record<string, unknown>).showBrowser === true
          );
          metricsCollected = true;
          break;
        } catch (metricsError) {
          const err =
            metricsError instanceof Error ? metricsError : new Error(String(metricsError));
          const code = (metricsError as NodeJS.ErrnoException)?.code ?? '';
          const fatalCodes = [
            'ENOTFOUND',
            'ECONNREFUSED',
            'ECONNRESET',
            'ETIMEDOUT',
            'ERR_INVALID_URL',
          ];
          if (
            fatalCodes.includes(code) ||
            /ENOTFOUND|ECONNREFUSED|ERR_INVALID_URL/.test(err.message)
          ) {
            throw new Error(`无法访问目标网址: ${err.message}`);
          }
          if (attempt < effectiveRetries) {
            perfWarnings.push(`第 ${attempt + 1} 次采集失败，准备重试: ${err.message}`);
          } else {
            perfWarnings.push(`性能指标采集失败（使用降级数据）: ${err.message}`);
          }
        }
      }
      if (!metricsCollected) {
        metricsResult = this.buildFallbackMetrics(finalUrl);
      }

      let resourceAnalysis: null | {
        resources: ResourceAnalysis;
        contentAnalysis: ContentAnalysis;
      } = null;
      const rawResults = metricsResult.basicTiming.rawResults;
      const firstContent = rawResults?.[0]?.content as string | undefined;
      const rawTimingResults = metricsResult.rawTimingResults || [];

      this.updateTestProgress(testId, 88, '分析资源与内容');

      if (includeResources && fetchHtml && firstContent) {
        if (verbose) {
          void insertExecutionLog(
            testId,
            'debug',
            `开始资源分析，HTML 内容长度: ${firstContent.length} 字符`
          );
        }
        try {
          const parsed = await this.htmlService.parseHTML(firstContent);
          resourceAnalysis = {
            resources: this.analyzeResources(parsed.$),
            contentAnalysis: this.analyzeContent(parsed.$, url),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          resourceAnalysis = {
            resources: this.analyzeResources({} as unknown as CheerioAPI),
            contentAnalysis: { error: message },
          };
        }
      } else {
        const reasons: string[] = [];
        if (!includeResources) reasons.push('资源分析已关闭');
        if (!fetchHtml) reasons.push('HTML 抓取已关闭');
        if (!firstContent && fetchHtml) reasons.push('未获取到 HTML 内容');
        if (reasons.length) {
          void insertExecutionLog(testId, 'info', `跳过资源分析: ${reasons.join('、')}`);
        }
      }

      // 合并浏览器网络资源到资源分析结果
      const browserNetRes = metricsResult.browserNetworkResources;

      if (browserNetRes && includeResources) {
        const netCounts = browserNetRes.counts;
        const mergedCounts = (existing: ResourceAnalysis['counts'] | null) => {
          const ec = existing || { images: 0, scripts: 0, stylesheets: 0, fonts: 0, total: 0 };
          const images = Math.max(ec.images || 0, netCounts.images || 0);
          const scripts = Math.max(ec.scripts || 0, netCounts.scripts || 0);
          const stylesheets = Math.max(ec.stylesheets || 0, netCounts.stylesheets || 0);
          const fonts = Math.max(ec.fonts || 0, netCounts.fonts || 0);
          return {
            images,
            scripts,
            stylesheets,
            fonts,
            total: images + scripts + stylesheets + fonts,
          };
        };

        if (resourceAnalysis) {
          resourceAnalysis.resources.counts = mergedCounts(resourceAnalysis.resources.counts);
        } else {
          resourceAnalysis = {
            resources: {
              resources: { images: [], scripts: [], stylesheets: [], fonts: [], other: [] },
              counts: mergedCounts(null),
            },
            contentAnalysis: {},
          };
        }

        // 附加浏览器采集的网络资源详情
        const ra = resourceAnalysis.resources as unknown as Record<string, unknown>;
        ra.networkItems = browserNetRes.items;
        ra.networkCounts = netCounts;
        ra.totalTransferSize = browserNetRes.items.reduce((sum, i) => sum + i.size, 0);

        if (verbose && testId) {
          void insertExecutionLog(
            testId,
            'debug',
            `浏览器网络资源: ${browserNetRes.items.length} 个请求, ` +
              `图片 ${netCounts.images || 0}, JS ${netCounts.scripts || 0}, ` +
              `CSS ${netCounts.stylesheets || 0}, 字体 ${netCounts.fonts || 0}`
          );
        }
      }

      this.updateTestProgress(testId, 92, '生成测试报告');
      const results = this.formatResults(metricsResult, resourceAnalysis, rawTimingResults);
      results.recommendations = this.generateRecommendations(results);

      const warnings = [...perfWarnings];

      const perfErrors: string[] = [];
      if (!metricsCollected) {
        perfErrors.push('性能指标采集失败，当前结果为降级数据，不代表真实性能');
      }

      const normalizedResult = {
        testId,
        status: TestStatus.COMPLETED,
        score: results.summary.score,
        summary: results.summary,
        metrics: results.metrics,
        warnings,
        errors: perfErrors,
        details: results,
        degraded: !metricsCollected,
      };

      if (verbose) {
        const summary = results.summary;
        console.log(`✅ 性能测试完成，评分: ${summary.score}/100 (${summary.grade})`);
      }

      const finalResult: PerformanceFinalResult = {
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
        status: TestStatus.COMPLETED,
        progress: 100,
        results: normalizedResult,
      });
      this.updateTestProgress(testId, 100, '性能测试完成');
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }
      this.abortControllers.delete(testId);
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
      const rawMessage = error instanceof Error ? error.message : String(error);
      const friendlyMessage = diagnoseNetworkError(error, '性能测试', config.url);
      console.error(`❌ 性能测试失败: ${rawMessage}`);
      const errorResult: PerformanceFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: rawMessage,
        status: TestStatus.FAILED,
        score: 0,
        summary: {
          score: 0,
          grade: 'F',
          averageLoadTime: 'N/A',
          fastestLoadTime: 'N/A',
          slowestLoadTime: 'N/A',
        },
        warnings: [],
        errors: [friendlyMessage],
        timestamp: new Date().toISOString(),
      };
      this.activeTests.set(testId, {
        status: TestStatus.FAILED,
        error: rawMessage,
      });
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(rawMessage));
      }
      this.abortControllers.delete(testId);
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

  updateTestProgress(testId: string, progress: number, message: string) {
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
        status: test.status || TestStatus.RUNNING,
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
    // 中止进行中的 HTTP 请求
    const controller = this.abortControllers.get(testId);
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
    this.abortControllers.delete(testId);

    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: TestStatus.CANCELLED,
      });
      this.progressTracker.set(testId, {
        status: TestStatus.CANCELLED,
        progress: 100,
        currentStep: '已取消',
        startTime: new Date(test.startTime || Date.now()),
        messages: ['测试已取消'],
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: PerformanceProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: PerformanceCompletionPayload) => void) {
    this.completionCallback = callback;
  }

  private async collectBasicMetrics(
    url: string,
    options: PerformanceMetricsOptions,
    testId?: string,
    signal?: AbortSignal,
    networkThrottle?: string,
    devicePreset?: { width: number; height: number; isMobile: boolean },
    showBrowser?: boolean
  ): Promise<PerformanceMetrics> {
    const iterations = Math.max(1, options.iterations || 1);
    const results: PerformanceTimingResult[] = [];

    // 冷启动预热：在正式采集前先执行一次请求，预热 DNS/TLS/连接池
    // 预热结果不计入评分，避免首次测试分数偏低
    if (testId) {
      this.updateTestProgress(testId, 3, '预热连接...');
    }
    try {
      await this.fetchTiming(url, options, 0, signal);
      if (testId) {
        void insertExecutionLog(testId, 'info', '预热完成，开始正式采集');
      }
    } catch {
      // 预热失败不阻塞正式采集
      if (testId) {
        void insertExecutionLog(testId, 'warn', '预热请求失败，直接开始正式采集');
      }
    }

    for (let i = 0; i < iterations; i += 1) {
      if (signal?.aborted) throw new Error('测试已取消');
      // 每次迭代的进度子区间
      const iterBase = 5 + (i / iterations) * 80;
      const iterSpan = 80 / iterations;
      if (testId) {
        this.updateTestProgress(
          testId,
          Math.round(iterBase),
          `[${i + 1}/${iterations}] DNS 解析与连接建立`
        );
      }
      try {
        const timing = await this.fetchTiming(url, options, 0, signal);
        results.push(timing);
        if (testId) {
          const dnsMs = Math.round(timing.dnsTime);
          const connMs = Math.round(timing.connectionTime);
          const ttfbMs = Math.round(timing.ttfb);
          const dlMs = Math.round(timing.downloadTime);
          void insertExecutionLog(
            testId,
            'info',
            `[${i + 1}/${iterations}] DNS ${dnsMs}ms · 连接 ${connMs}ms · TTFB ${ttfbMs}ms · 下载 ${dlMs}ms`
          );
        }
      } catch (iterError) {
        const msg = iterError instanceof Error ? iterError.message : String(iterError);
        // 致命网络错误（DNS 解析失败、连接拒绝等）直接抛出，不再继续迭代
        if (isFatalNetworkError(iterError)) {
          throw iterError;
        }
        if (testId) {
          void insertExecutionLog(testId, 'warn', `第 ${i + 1} 次采集失败，跳过: ${msg}`);
        }
      }
      if (testId) {
        const iterProgress = Math.round(iterBase + iterSpan);
        this.updateTestProgress(testId, iterProgress, `性能采集中 (${i + 1}/${iterations})`);
      }
    }
    if (results.length === 0) {
      throw new Error(`所有 ${iterations} 次采集均失败`);
    }

    const aggregate = (values: number[]) => {
      const safe = values.length ? values : [0];
      const total = safe.reduce((sum, value) => sum + value, 0);
      return {
        avg: total / safe.length,
        min: Math.min(...safe),
        max: Math.max(...safe),
      };
    };

    const totalTimes = results.map(item => item.totalTime);
    const ttfbTimes = results.map(item => item.ttfb);
    const downloadTimes = results.map(item => item.downloadTime);
    const contentLengths = results.map(item => item.contentLength);

    // DNS/连接/TLS：后续迭代复用 TCP 连接导致值为 0，使用首次迭代作为代表值
    const first = results[0];
    const dnsAgg = { avg: first.dnsTime, min: first.dnsTime, max: first.dnsTime };
    const connAgg = {
      avg: first.connectionTime,
      min: first.connectionTime,
      max: first.connectionTime,
    };
    const tlsAgg = { avg: first.tlsTime, min: first.tlsTime, max: first.tlsTime };

    const estimatedVitals = this.estimateWebVitals(results, aggregate);
    const avgLoadTime = aggregate(totalTimes).avg;
    const score = this.calculatePerformanceScore(avgLoadTime, results, estimatedVitals);
    const grade = this.scoreToGrade(score);

    const collected: PerformanceMetrics = {
      url,
      timestamp: new Date().toISOString(),
      basicTiming: {
        iterations,
        totalTime: aggregate(totalTimes),
        dnsTime: dnsAgg,
        connectionTime: connAgg,
        tlsTime: tlsAgg,
        ttfb: aggregate(ttfbTimes),
        downloadTime: aggregate(downloadTimes),
        contentLength: aggregate(contentLengths),
        rawResults: results
          .map(item => (item.content ? { content: item.content } : {}))
          .filter(item => Object.keys(item).length > 0),
      },
      performanceScore: { score, grade },
      coreWebVitals: estimatedVitals,
      rawTimingResults: results,
    };

    // 尝试用 Puppeteer 采集真实 Web Vitals 替代估算值，同时收集网络资源
    // 硬超时 15s：防止 Electron 环境下 Puppeteer 挂起
    try {
      const vitalsTimeout = 15000;
      const realResult = await Promise.race([
        this.collectRealWebVitals(
          url,
          Number(options.timeout) || 30000,
          networkThrottle,
          devicePreset,
          showBrowser
        ),
        new Promise<null>(resolve => setTimeout(() => resolve(null), vitalsTimeout)),
      ]);
      if (realResult) {
        collected.coreWebVitals = realResult.vitals;
        collected.browserNetworkResources = realResult.networkResources;
        // 真实 Vitals 替换后重新计算评分
        const newScore = this.calculatePerformanceScore(avgLoadTime, results, realResult.vitals);
        collected.performanceScore = { score: newScore, grade: this.scoreToGrade(newScore) };
        // 附加 INP 诊断数据（长任务列表 + 交互事件详情）
        if (realResult.inpDiagnostics) {
          collected.inpDiagnostics = realResult.inpDiagnostics;
        }
        if (testId) {
          const resMsg = collected.browserNetworkResources
            ? `（同时采集到 ${collected.browserNetworkResources.items.length} 个网络资源）`
            : '';
          const inpMsg = realResult.inpDiagnostics?.totalInteractions
            ? `（${realResult.inpDiagnostics.totalInteractions} 个交互事件, ${realResult.inpDiagnostics.totalLongTasks} 个长任务）`
            : '';
          void insertExecutionLog(
            testId,
            'info',
            `已通过真实浏览器采集 Core Web Vitals，评分已更新为 ${newScore}${resMsg}${inpMsg}`
          );
        }
      }
    } catch (realErr: unknown) {
      const msg = realErr instanceof Error ? realErr.message : String(realErr);
      if (testId) {
        void insertExecutionLog(
          testId,
          'info',
          `真实浏览器采集 Web Vitals 不可用，使用估算值: ${msg}`
        );
      }
    }

    return collected;
  }

  private estimateWebVitals(
    results: PerformanceTimingResult[],
    aggregate: (values: number[]) => { avg: number; min: number; max: number }
  ) {
    const ttfbAvg = aggregate(results.map(r => r.ttfb)).avg;
    const downloadAvg = aggregate(results.map(r => r.downloadTime)).avg;
    const contentAvg = aggregate(results.map(r => r.contentLength)).avg;

    // FCP 估算: TTFB + 首次渲染开销（基于内容大小）
    const renderOverhead = Math.min(contentAvg / 5000, 500);
    const fcpEstimate = Math.round(ttfbAvg + renderOverhead + 50);

    // LCP 估算: FCP + 额外加载时间（大页面需要更多时间渲染主要内容）
    const lcpOverhead = Math.min(downloadAvg * 0.8 + contentAvg / 3000, 2000);
    const lcpEstimate = Math.round(fcpEstimate + lcpOverhead);

    // CLS 估算: 基于 HTML 结构分析（有内容时检查图片是否有尺寸属性等）
    let clsEstimate = 0.05;
    const firstContent = results[0]?.content;
    if (firstContent) {
      const imgWithoutSize = (firstContent.match(/<img(?![^>]*width)[^>]*>/gi) || []).length;
      const totalImages = (firstContent.match(/<img[^>]*>/gi) || []).length;
      if (totalImages > 0) {
        clsEstimate = Math.min(0.5, (imgWithoutSize / totalImages) * 0.3);
      }
      const hasViewport = /<meta[^>]*viewport[^>]*>/i.test(firstContent);
      if (!hasViewport) clsEstimate += 0.1;
    }
    clsEstimate = Math.round(clsEstimate * 1000) / 1000;

    // INP 估算: 基于 TTFB + 主线程阻塞推断（JS 越大交互延迟越高）
    let inpEstimate = Math.round(ttfbAvg * 0.3 + 50);
    if (firstContent) {
      const scriptCount = (firstContent.match(/<script[^>]*>/gi) || ([] as string[])).length;
      const inlineScriptSize = (
        firstContent.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || ([] as string[])
      ).reduce((sum: number, s: string) => sum + s.length, 0);
      inpEstimate += Math.min(scriptCount * 15 + inlineScriptSize / 2000, 300);
    }
    inpEstimate = Math.round(Math.max(50, inpEstimate));

    // TTFB 是真实测量值，FCP/LCP/CLS/INP 是基于网络指标的估算值
    return {
      lcp: {
        value: lcpEstimate,
        rating: this.getWebVitalRating('lcp', lcpEstimate),
        estimated: true,
      },
      fcp: {
        value: fcpEstimate,
        rating: this.getWebVitalRating('fcp', fcpEstimate),
        estimated: true,
      },
      cls: {
        value: clsEstimate,
        rating: this.getWebVitalRating('cls', clsEstimate),
        estimated: true,
      },
      inp: {
        value: inpEstimate,
        rating: this.getWebVitalRating('inp', inpEstimate),
        estimated: true,
      },
      ttfb: { value: Math.round(ttfbAvg), rating: this.getRating(ttfbAvg), estimated: false },
    };
  }

  private getWebVitalRating(metric: string, value: number): string {
    const defaults: Record<string, [number, number]> = {
      lcp: [2500, 4000],
      fcp: [1800, 3000],
      cls: [0.1, 0.25],
      inp: [200, 500],
      ttfb: [800, 1800],
    };
    const base = defaults[metric] || [800, 1800];
    let good = base[0];
    const poor = base[1];
    // 使用前端传递的自定义阈值覆盖 good 阈值
    if (metric === 'ttfb' && this.customThresholds.ttfb) good = this.customThresholds.ttfb;
    else if (metric === 'lcp' && this.customThresholds.lcp) good = this.customThresholds.lcp;
    else if (metric === 'fcp' && this.customThresholds.fcp) good = this.customThresholds.fcp;
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  private async fetchTiming(
    url: string,
    options: PerformanceMetricsOptions,
    _redirectDepth = 0,
    signal?: AbortSignal
  ): Promise<PerformanceTimingResult> {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const timeout = Number(options.timeout) || 30000;
    const method = (options.method || 'GET').toUpperCase();

    // 合并默认 headers 和用户自定义 headers
    const mergedHeaders: Record<string, string> = {
      'User-Agent': options.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      ...(options.cacheControl ? { 'Cache-Control': options.cacheControl } : {}),
      ...(options.headers || {}),
    };

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('测试已取消'));
        return;
      }
      const startTime = performance.now();
      let dnsTime = 0;
      let connectionTime = 0;
      let tlsTime = 0;
      let ttfb = 0;
      let responseStart = 0;
      let contentLength = 0;
      let body = '';
      let redirectCount = 0;

      const req: ClientRequest = client.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method,
          headers: mergedHeaders,
          timeout,
          rejectUnauthorized: false,
        },
        (res: IncomingMessage) => {
          responseStart = performance.now();
          ttfb = responseStart - startTime;
          const statusCode = res.statusCode || 0;

          // 处理重定向
          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            res.headers.location &&
            options.followRedirects !== false &&
            _redirectDepth < 10
          ) {
            res.resume();
            const redirectUrl = new URL(res.headers.location, url).toString();
            this.fetchTiming(redirectUrl, options, _redirectDepth + 1, signal)
              .then(result => resolve({ ...result, redirectCount: result.redirectCount + 1 }))
              .catch(reject);
            return;
          }
          if (statusCode >= 300 && statusCode < 400) {
            redirectCount++;
          }

          const rawHeaders: Record<string, string> = {};
          const headerNames = res.headers;
          for (const [key, val] of Object.entries(headerNames)) {
            rawHeaders[key] = Array.isArray(val) ? val.join(', ') : val || '';
          }
          const httpVersion = `HTTP/${res.httpVersion}`;

          // 根据 content-encoding 解压响应流，确保 body 是可读文本
          const encoding = (res.headers['content-encoding'] || '').toLowerCase();
          const isCompressed = ['gzip', 'x-gzip', 'deflate', 'br'].includes(encoding);
          let decompressed: NodeJS.ReadableStream = res;
          if (encoding === 'gzip' || encoding === 'x-gzip') {
            decompressed = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            decompressed = res.pipe(zlib.createInflate());
          } else if (encoding === 'br') {
            decompressed = res.pipe(zlib.createBrotliDecompress());
          }

          const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB body 上限
          if (isCompressed) {
            // 压缩场景：res 统计传输大小，decompressed 读取解压后的 body
            res.on('data', (chunk: Buffer) => {
              contentLength += Buffer.byteLength(chunk);
            });
            decompressed.on('data', (chunk: Buffer) => {
              if (options.includeContent && body.length < MAX_BODY_BYTES) {
                body += chunk.toString();
              }
            });
          } else {
            // 无压缩：只监听一次
            res.on('data', (chunk: Buffer) => {
              contentLength += Buffer.byteLength(chunk);
              if (options.includeContent && body.length < MAX_BODY_BYTES) {
                body += chunk.toString();
              }
            });
          }
          if (isCompressed) {
            decompressed.on('error', (err: Error) => {
              console.warn(`[PerformanceTestEngine] 解压失败 (${encoding}): ${err.message}`);
              // 解压失败时仍然 resolve（body 为空，不影响计时指标）
            });
          }
          decompressed.on('end', () => {
            const endTime = performance.now();
            resolve({
              totalTime: endTime - startTime,
              ttfb,
              downloadTime: endTime - responseStart,
              dnsTime,
              connectionTime,
              tlsTime,
              contentLength,
              content: options.includeContent ? body : undefined,
              statusCode,
              redirectCount,
              headers: rawHeaders,
              httpVersion,
            });
          });
        }
      );

      req.on('socket', (socket: import('net').Socket) => {
        const socketStart = performance.now();
        socket.once('lookup', () => {
          dnsTime = performance.now() - socketStart;
        });
        socket.once('connect', () => {
          connectionTime = performance.now() - socketStart - dnsTime;
        });
        socket.once('secureConnect', () => {
          tlsTime = performance.now() - socketStart - dnsTime - connectionTime;
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.on('error', (error: Error) => {
        reject(error);
      });

      // 支持外部取消
      if (signal) {
        const onAbort = () => {
          req.destroy();
          reject(new Error('测试已取消'));
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * 对数正态分布评分函数（与 Lighthouse 对齐）
   * p10 = 90 分阈值（值 ≤ p10 得 ≥90 分），median = 50 分阈值
   */
  private static logNormalScore(value: number, p10: number, median: number): number {
    if (value <= 0) return 100;
    if (p10 <= 0 || median <= 0 || p10 >= median) return value <= p10 ? 100 : 0;
    const logRatio = Math.log(median / p10);
    if (logRatio === 0) return 50;
    const complementaryPercentile =
      0.5 * (1 - this.erf((Math.log(value / median) / logRatio) * (Math.SQRT2 / 2)));
    return Math.round(Math.max(0, Math.min(100, complementaryPercentile * 100)));
  }

  /** 高斯误差函数近似（Abramowitz & Stegun） */
  private static erf(x: number): number {
    const sign = x >= 0 ? 1 : -1;
    const a = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * a);
    const y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
        t *
        Math.exp(-a * a);
    return sign * y;
  }

  /**
   * 计算单项 Web Vital 的分数
   * 参数参考 Lighthouse 6+ 的 p10/median 阈值
   */
  private static vitalScore(metric: string, value: number): number {
    const PARAMS: Record<string, [number, number]> = {
      fcp: [1800, 3000],
      lcp: [2500, 4000],
      cls: [0.1, 0.25],
      inp: [200, 500],
      tbt: [200, 600],
      ttfb: [800, 1800],
    };
    const [p10, median] = PARAMS[metric] || [800, 1800];
    return PerformanceTestEngine.logNormalScore(value, p10, median);
  }

  /**
   * 综合评分：Web Vitals 加权 + HTTP 传输层评分
   * 固定权重 Vitals 60% + HTTP 40%，避免真实/估算模式切换导致评分跳变
   */
  private calculatePerformanceScore(
    avgLoadTime: number,
    results?: PerformanceTimingResult[],
    webVitals?: PerformanceMetrics['coreWebVitals']
  ) {
    // HTTP 传输层评分（对数正态）
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    const ttfbAvg = results?.length ? avg(results.map(r => r.ttfb)) : avgLoadTime * 0.3;
    const httpScore =
      PerformanceTestEngine.logNormalScore(avgLoadTime, 1500, 5000) * 0.5 +
      PerformanceTestEngine.vitalScore('ttfb', ttfbAvg) * 0.5;

    if (!webVitals) {
      return Math.round(Math.max(0, Math.min(100, httpScore)));
    }

    // Web Vitals 加权评分（权重参考 Lighthouse 10）
    const fcpScore = PerformanceTestEngine.vitalScore('fcp', webVitals.fcp.value);
    const lcpScore = PerformanceTestEngine.vitalScore('lcp', webVitals.lcp.value);
    const clsScore = PerformanceTestEngine.vitalScore('cls', webVitals.cls.value);
    const inpScore = PerformanceTestEngine.vitalScore('inp', webVitals.inp.value);
    const ttfbScore = PerformanceTestEngine.vitalScore('ttfb', webVitals.ttfb.value);

    // FCP 10%, LCP 25%, CLS 25%, INP 30%, TTFB 10%
    const vitalsScore =
      fcpScore * 0.1 + lcpScore * 0.25 + clsScore * 0.25 + inpScore * 0.3 + ttfbScore * 0.1;

    // 固定权重：Vitals 60% + HTTP 40%
    const weighted = vitalsScore * 0.6 + httpScore * 0.4;
    return Math.round(Math.max(0, Math.min(100, weighted)));
  }

  private scoreToGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  buildFallbackMetrics(url: string): PerformanceMetrics {
    return {
      url,
      timestamp: new Date().toISOString(),
      basicTiming: {
        iterations: 1,
        totalTime: { avg: 0, min: 0, max: 0 },
        dnsTime: { avg: 0, min: 0, max: 0 },
        connectionTime: { avg: 0, min: 0, max: 0 },
        tlsTime: { avg: 0, min: 0, max: 0 },
        ttfb: { avg: 0, min: 0, max: 0 },
        downloadTime: { avg: 0, min: 0, max: 0 },
        contentLength: { avg: 0, min: 0, max: 0 },
        rawResults: [],
      },
      performanceScore: { score: 0, grade: 'F' },
      coreWebVitals: {
        lcp: { value: 0, rating: 'good', estimated: true },
        fcp: { value: 0, rating: 'good', estimated: true },
        cls: { value: 0, rating: 'good', estimated: true },
        inp: { value: 0, rating: 'good', estimated: true },
        ttfb: { value: 0, rating: 'good', estimated: true },
      },
    };
  }

  formatResults(
    metrics: PerformanceMetrics,
    resourceAnalysis: { resources: ResourceAnalysis; contentAnalysis: ContentAnalysis } | null,
    rawTimingResults?: PerformanceTimingResult[]
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
        tls: {
          average: `${Math.round(metrics.basicTiming.tlsTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.tlsTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.tlsTime.max)}ms`,
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
          estimated: metrics.coreWebVitals.lcp.estimated,
        },
        fcp: {
          value: metrics.coreWebVitals.fcp.value,
          rating: metrics.coreWebVitals.fcp.rating,
          estimated: metrics.coreWebVitals.fcp.estimated,
        },
        cls: {
          value: metrics.coreWebVitals.cls.value,
          rating: metrics.coreWebVitals.cls.rating,
          estimated: metrics.coreWebVitals.cls.estimated,
        },
        inp: {
          value: metrics.coreWebVitals.inp.value,
          rating: metrics.coreWebVitals.inp.rating,
          estimated: metrics.coreWebVitals.inp.estimated,
        },
        ttfb: {
          value: metrics.coreWebVitals.ttfb.value,
          rating: metrics.coreWebVitals.ttfb.rating,
          estimated: metrics.coreWebVitals.ttfb.estimated,
        },
      },
      inpDiagnostics: metrics.inpDiagnostics ?? null,
    };

    if (rawTimingResults && rawTimingResults.length > 0) {
      const first = rawTimingResults[0];
      const headers = first.headers || {};
      results.httpInfo = {
        statusCode: first.statusCode,
        httpVersion: first.httpVersion,
        redirectCount: first.redirectCount,
        compression: headers['content-encoding'] || 'none',
        cacheControl: headers['cache-control'] || 'not set',
        server: headers['server'] || 'unknown',
        contentType: headers['content-type'] || 'unknown',
      };
    }

    if (resourceAnalysis) {
      results.resources = resourceAnalysis.resources;
      results.contentAnalysis = resourceAnalysis.contentAnalysis;
    }

    return results;
  }

  analyzeResources($: CheerioAPI): ResourceAnalysis {
    const resources: ResourceItem = {
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

  analyzeContent($: CheerioAPI, _url: string): ContentAnalysis {
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
    const good = this.customThresholds.ttfb || 800;
    if (ttfb <= good) return 'good';
    if (ttfb <= 1800) return 'needs-improvement';
    return 'poor';
  }

  generateRecommendations(results: PerformanceResults) {
    const recommendations: RecommendationItem[] = [];
    const notGood = (rating?: string) => rating && rating !== 'good';

    try {
      // ── Core Web Vitals ──

      if (notGood(results.metrics.ttfb.rating)) {
        const isPoor = results.metrics.ttfb.rating === 'poor';
        recommendations.push({
          type: 'server-response',
          priority: isPoor ? 'high' : 'medium',
          title: '优化服务器响应时间 (TTFB)',
          description: `TTFB 为 ${results.metrics.ttfb.average}，${isPoor ? '远超' : '略高于'}理想值 (${this.customThresholds.ttfb || 800}ms)`,
          impact: isPoor ? '高' : '中',
          suggestions: [
            '使用内容分发网络 (CDN) 缩短地理距离',
            '优化服务器配置和资源使用',
            '改进缓存策略（Redis/Memcached）',
            '优化数据库查询，添加索引',
            '检查第三方服务响应时间',
            '考虑使用 Edge Computing / Serverless 架构',
          ],
        });
      }

      if (notGood(results.webVitals.lcp.rating)) {
        const isPoor = results.webVitals.lcp.rating === 'poor';
        recommendations.push({
          type: 'largest-contentful-paint',
          priority: isPoor ? 'high' : 'medium',
          title: '优化最大内容绘制 (LCP)',
          description: `LCP 为 ${results.webVitals.lcp.value}ms，${isPoor ? '超过' : '接近'}推荐阈值 ${this.customThresholds.lcp || 2500}ms`,
          impact: isPoor ? '高' : '中',
          suggestions: [
            '优化 LCP 元素（通常是 <img>、<video> 或大型文本块）',
            '使用 <link rel="preload"> 预加载 LCP 资源',
            '优化和压缩图片（WebP/AVIF 格式）',
            '移除渲染阻塞的 CSS/JS 资源',
            '使用 fetchpriority="high" 提升 LCP 资源优先级',
            '实现服务端渲染 (SSR) 或静态生成 (SSG)',
          ],
        });
      }

      if (notGood(results.webVitals.fcp?.rating)) {
        const isPoor = results.webVitals.fcp.rating === 'poor';
        recommendations.push({
          type: 'first-contentful-paint',
          priority: isPoor ? 'high' : 'medium',
          title: '优化首次内容绘制 (FCP)',
          description: `FCP 为 ${results.webVitals.fcp.value}ms，${isPoor ? '超过' : '接近'}推荐阈值 ${this.customThresholds.fcp || 1800}ms`,
          impact: isPoor ? '高' : '中',
          suggestions: [
            '减少服务器响应时间 (TTFB)',
            '消除渲染阻塞资源（CSS/JS）',
            '内联关键 CSS（Critical CSS）',
            '使用 <link rel="preload"> 预加载关键资源',
            '减少 DOM 大小和嵌套深度',
          ],
        });
      }

      if (notGood(results.webVitals.inp?.rating)) {
        const isPoor = results.webVitals.inp.rating === 'poor';
        recommendations.push({
          type: 'interaction-to-next-paint',
          priority: isPoor ? 'high' : 'medium',
          title: '优化交互到下一次绘制 (INP)',
          description: `INP 为 ${results.webVitals.inp.value}ms，${isPoor ? '远超' : '略高于'}推荐阈值 200ms`,
          impact: isPoor ? '高' : '中',
          suggestions: [
            '减少主线程长任务（Long Tasks > 50ms）',
            '使用 requestIdleCallback 或 scheduler.yield() 拆分耗时任务',
            '避免在事件处理器中执行同步布局（强制回流）',
            '减少 JavaScript 包体积，实现代码分割（Code Splitting）',
            '使用 Web Worker 将计算密集型任务移出主线程',
            '优化第三方脚本加载（async/defer/延迟初始化）',
            '减少 DOM 节点数量，避免过深嵌套',
          ],
        });
      }

      if (notGood(results.webVitals.cls?.rating)) {
        const isPoor = results.webVitals.cls.rating === 'poor';
        recommendations.push({
          type: 'cumulative-layout-shift',
          priority: isPoor ? 'high' : 'medium',
          title: '减少累积布局偏移 (CLS)',
          description: `CLS 为 ${results.webVitals.cls.value}，${isPoor ? '超过' : '接近'}推荐阈值 0.1`,
          impact: isPoor ? '高' : '中',
          suggestions: [
            '为所有 <img> 和 <video> 设置 width/height 属性',
            '使用 CSS aspect-ratio 为媒体元素预留空间',
            '确保广告/嵌入内容有固定占位空间',
            '避免在可视区域上方动态插入内容',
            '使用 transform 动画替代影响布局的属性（top/left/width/height）',
            '预加载 Web 字体，使用 font-display: swap',
          ],
        });
      }

      // ── HTTP 与传输优化 ──

      if (results.httpInfo) {
        if (!results.httpInfo.compression || results.httpInfo.compression === 'none') {
          recommendations.push({
            type: 'compression',
            priority: 'high',
            title: '启用响应压缩',
            description: '服务器未启用 Gzip/Brotli 压缩，传输体积可能偏大',
            impact: '高',
            suggestions: [
              '优先启用 Brotli 压缩（压缩率比 Gzip 高 15-25%）',
              '在 Nginx/Apache 配置中启用 Gzip 作为回退',
              '确保 CDN 也启用了压缩',
              '对 HTML/CSS/JS/JSON/SVG 等文本资源启用压缩',
            ],
          });
        }

        if (results.httpInfo.cacheControl === 'not set' || !results.httpInfo.cacheControl) {
          recommendations.push({
            type: 'caching',
            priority: 'medium',
            title: '配置 HTTP 缓存策略',
            description: '未检测到 Cache-Control 响应头，浏览器无法有效缓存资源',
            impact: '中',
            suggestions: [
              '为静态资源设置 Cache-Control: public, max-age=31536000, immutable',
              '为 HTML 页面设置 Cache-Control: no-cache（配合 ETag 验证）',
              '使用内容哈希命名静态文件（如 app.a1b2c3.js）实现长期缓存',
              '使用 ETag 或 Last-Modified 实现条件请求 (304)',
            ],
          });
        }
      }

      const tlsAvg = parseFloat(results.metrics.tls?.average || '0');
      if (tlsAvg > 200) {
        recommendations.push({
          type: 'tls-optimization',
          priority: 'medium',
          title: '优化 TLS 握手时间',
          description: `TLS 握手平均耗时 ${results.metrics.tls.average}，建议优化到 200ms 以下`,
          impact: '中',
          suggestions: [
            '启用 TLS 1.3（握手只需 1-RTT）',
            '启用 OCSP Stapling 减少证书验证延迟',
            '使用 TLS Session Resumption / 0-RTT',
          ],
        });
      }

      const dnsAvg = parseFloat(results.metrics.dns?.average || '0');
      if (dnsAvg > 100) {
        recommendations.push({
          type: 'dns-optimization',
          priority: 'low',
          title: '优化 DNS 解析时间',
          description: `DNS 解析平均耗时 ${results.metrics.dns.average}，建议优化到 100ms 以下`,
          impact: '低',
          suggestions: [
            '使用 <link rel="dns-prefetch"> 预解析第三方域名',
            '减少页面中使用的不同域名数量',
            '使用快速 DNS 提供商（如 Cloudflare 1.1.1.1）',
          ],
        });
      }

      // ── 资源优化 ──

      if (results.resources) {
        const counts = results.resources.counts as Record<string, number>;
        const resources = results.resources.resources as ResourceItem;

        if (counts.total > 30) {
          recommendations.push({
            type: 'resource-count',
            priority: 'medium',
            title: '减少资源请求数量',
            description: `页面包含 ${counts.total} 个资源请求，过多的请求会增加加载延迟`,
            impact: '中',
            suggestions: [
              '合并 CSS/JS 文件，减少 HTTP 请求数',
              '使用 CSS Sprites 或 SVG Symbol 合并图标',
              '使用 HTTP/2 多路复用减少连接开销',
              '延迟加载非关键资源（lazy loading）',
            ],
          });
        }

        if (resources.images && resources.images.length > 0) {
          const noLazy = resources.images.filter(img => img.loading !== 'lazy');
          const noSize = resources.images.filter(img => !img.width || !img.height);
          if (noLazy.length > 3) {
            recommendations.push({
              type: 'image-lazy-loading',
              priority: 'medium',
              title: '启用图片懒加载',
              description: `${noLazy.length} 张图片未设置 loading="lazy"，首屏外图片应延迟加载`,
              impact: '中',
              suggestions: [
                '为首屏外的 <img> 添加 loading="lazy" 属性',
                '首屏关键图片使用 fetchpriority="high" 而非 lazy',
                '使用 Intersection Observer API 实现自定义懒加载',
              ],
            });
          }
          if (noSize.length > 0) {
            recommendations.push({
              type: 'image-dimensions',
              priority: 'medium',
              title: '为图片设置尺寸',
              description: `${noSize.length} 张图片缺少 width/height 属性，可能导致布局偏移 (CLS)`,
              impact: '中',
              suggestions: [
                '为所有 <img> 标签设置 width 和 height 属性',
                '使用 CSS aspect-ratio 属性预留空间',
                '使用 <picture> + srcset 提供响应式图片',
              ],
            });
          }
          if (resources.images.length > 10) {
            recommendations.push({
              type: 'image-optimization',
              priority: 'medium',
              title: '优化图片资源',
              description: `页面包含 ${resources.images.length} 张图片，建议进行格式和体积优化`,
              impact: '中',
              suggestions: [
                '使用 WebP/AVIF 等现代图片格式（体积减少 25-50%）',
                '根据显示尺寸提供合适分辨率的图片（srcset）',
                '使用图片 CDN 自动优化（如 Cloudinary、imgix）',
                '对 SVG 图标使用内联或 Symbol 引用',
              ],
            });
          }
        }

        if (resources.scripts && resources.scripts.length > 0) {
          const noAsync = resources.scripts.filter(s => !s.async && !s.defer);
          if (noAsync.length > 0) {
            recommendations.push({
              type: 'script-optimization',
              priority: 'high',
              title: '优化 JavaScript 加载',
              description: `${noAsync.length} 个脚本未使用 async/defer，会阻塞页面渲染`,
              impact: '高',
              suggestions: [
                '为非关键脚本添加 defer 属性（保持执行顺序）',
                '为独立脚本添加 async 属性（如分析、广告脚本）',
                '实现代码分割（Code Splitting），按需加载模块',
                '使用 Tree Shaking 移除未使用的代码',
                '将大型第三方库替换为轻量替代方案',
              ],
            });
          }
          const noIntegrity = resources.scripts.filter(s => !s.integrity);
          if (noIntegrity.length > 3) {
            recommendations.push({
              type: 'script-integrity',
              priority: 'low',
              title: '添加子资源完整性校验 (SRI)',
              description: `${noIntegrity.length} 个脚本缺少 integrity 属性`,
              impact: '低',
              suggestions: [
                '为 CDN 加载的脚本添加 integrity 和 crossorigin 属性',
                '使用构建工具自动生成 SRI 哈希',
              ],
            });
          }
        }

        if (resources.stylesheets && resources.stylesheets.length > 5) {
          recommendations.push({
            type: 'css-optimization',
            priority: 'medium',
            title: '优化 CSS 资源',
            description: `页面加载了 ${resources.stylesheets.length} 个样式表，过多的 CSS 文件会阻塞渲染`,
            impact: '中',
            suggestions: [
              '合并 CSS 文件减少请求数',
              '内联关键 CSS（Critical CSS），异步加载其余样式',
              '使用 PurgeCSS/UnCSS 移除未使用的样式规则',
              '考虑使用 CSS-in-JS 或 Tailwind CSS 按需生成样式',
            ],
          });
        }
      }

      // ── 内容分析建议 ──

      if (results.contentAnalysis && !results.contentAnalysis.error) {
        const hints = results.contentAnalysis.resourceHints;
        if (hints && hints.preconnect === 0 && hints.preload === 0 && hints.dns_prefetch === 0) {
          recommendations.push({
            type: 'resource-hints',
            priority: 'low',
            title: '添加资源提示 (Resource Hints)',
            description: '页面未使用任何资源提示，可通过预连接/预加载加速关键资源',
            impact: '低',
            suggestions: [
              '为关键第三方域名添加 <link rel="preconnect">',
              '为首屏关键资源添加 <link rel="preload">',
              '为后续页面资源添加 <link rel="prefetch">',
              '为第三方域名添加 <link rel="dns-prefetch">',
            ],
          });
        }
      }

      // ── 基于浏览器网络资源的深度建议 ──
      type NetItem = {
        url: string;
        type: string;
        size: number;
        duration: number;
        compressed?: boolean;
        encoding?: string;
        renderBlocking?: boolean;
        decodedSize?: number;
      };
      const netItems = (
        results.resources as unknown as {
          networkItems?: NetItem[];
          totalTransferSize?: number;
        }
      )?.networkItems;

      if (netItems && netItems.length > 0) {
        // 大资源警告（>200KB）
        const largeResources = netItems.filter(i => i.size > 200 * 1024);
        if (largeResources.length > 0) {
          recommendations.push({
            type: 'large-resources',
            priority: 'high',
            title: `发现 ${largeResources.length} 个大体积资源`,
            description: `以下资源超过 200KB，可能影响页面加载速度`,
            impact: '高',
            suggestions: largeResources.slice(0, 5).map(r => {
              const sizeKB = Math.round(r.size / 1024);
              const name = r.url.split('/').pop()?.split('?')[0] || r.url;
              return `${r.type} ${name} (${sizeKB}KB, ${r.duration}ms)`;
            }),
          });
        }

        // 未压缩的文本资源（JS/CSS/HTML >10KB 且无 Content-Encoding）
        const textTypes = new Set(['scripts', 'stylesheets', 'documents', 'xhr']);
        const uncompressed = netItems.filter(
          i => textTypes.has(i.type) && i.size > 10 * 1024 && i.compressed === false
        );
        if (uncompressed.length > 0) {
          const totalWaste = uncompressed.reduce((s, i) => s + i.size, 0);
          recommendations.push({
            type: 'uncompressed-resources',
            priority: 'high',
            title: `${uncompressed.length} 个文本资源未启用压缩`,
            description: `共 ${Math.round(totalWaste / 1024)}KB 文本资源未经 Gzip/Brotli 压缩传输，启用后可减少 60-80% 传输体积`,
            impact: '高',
            suggestions: [
              ...uncompressed.slice(0, 5).map(r => {
                const name = r.url.split('/').pop()?.split('?')[0] || r.url;
                return `${r.type} ${name} (${Math.round(r.size / 1024)}KB 未压缩)`;
              }),
              '在 Nginx/Apache/CDN 中启用 Brotli（优先）或 Gzip 压缩',
            ],
          });
        }

        // 渲染阻塞资源（render-blocking CSS/JS）
        const renderBlockingItems = netItems.filter(
          i => i.renderBlocking && (i.type === 'scripts' || i.type === 'stylesheets')
        );
        if (renderBlockingItems.length > 3) {
          const totalBlockingSize = renderBlockingItems.reduce((s, i) => s + i.size, 0);
          recommendations.push({
            type: 'render-blocking',
            priority: 'high',
            title: `${renderBlockingItems.length} 个渲染阻塞资源`,
            description: `${renderBlockingItems.length} 个 CSS/JS 资源阻塞了首次渲染（共 ${Math.round(totalBlockingSize / 1024)}KB），直接影响 FCP 和 LCP`,
            impact: '高',
            suggestions: [
              ...renderBlockingItems.slice(0, 4).map(r => {
                const name = r.url.split('/').pop()?.split('?')[0] || r.url;
                return `${r.type === 'scripts' ? 'JS' : 'CSS'} ${name} (${Math.round(r.size / 1024)}KB, ${r.duration}ms)`;
              }),
              '为非关键 JS 添加 defer/async 属性',
              '内联关键 CSS，异步加载其余样式表',
              '使用 <link rel="preload"> 提升关键资源优先级',
            ],
          });
        }

        // 慢资源警告（>1000ms）
        const slowResources = netItems.filter(i => i.duration > 1000);
        if (slowResources.length > 0) {
          recommendations.push({
            type: 'slow-resources',
            priority: 'medium',
            title: `发现 ${slowResources.length} 个加载缓慢的资源`,
            description: '以下资源加载时间超过 1 秒，建议优化或使用 CDN',
            impact: '中',
            suggestions: slowResources.slice(0, 5).map(r => {
              const name = r.url.split('/').pop()?.split('?')[0] || r.url;
              return `${r.type} ${name} (${r.duration}ms, ${Math.round(r.size / 1024)}KB)`;
            }),
          });
        }

        // 第三方资源统计
        try {
          const mainHost = new URL(results.url).hostname;
          const thirdParty = netItems.filter(i => {
            try {
              return new URL(i.url).hostname !== mainHost;
            } catch {
              return false;
            }
          });
          if (thirdParty.length > 5) {
            const totalSize = thirdParty.reduce((s, i) => s + i.size, 0);
            recommendations.push({
              type: 'third-party',
              priority: 'medium',
              title: `${thirdParty.length} 个第三方资源请求`,
              description: `第三方资源总传输量 ${Math.round(totalSize / 1024)}KB，过多的第三方请求会增加 DNS 查询和连接开销`,
              impact: '中',
              suggestions: [
                '审查并移除不必要的第三方脚本（分析、广告、社交插件等）',
                '为关键第三方域名添加 <link rel="preconnect">',
                '考虑自托管关键的第三方资源',
                '使用 async/defer 加载非关键第三方脚本',
              ],
            });
          }
        } catch {
          /* URL 解析失败忽略 */
        }
      }

      // ── 去重：按 type 字段去重，保留优先级更高的 ──
      const seen = new Map<string, number>();
      const priorityRank = (p: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);
      for (let i = 0; i < recommendations.length; i++) {
        const key = recommendations[i].type || recommendations[i].title || '';
        if (seen.has(key)) {
          const existingIdx = seen.get(key) ?? i;
          const existingPri = priorityRank(recommendations[existingIdx].priority || 'low');
          const currentPri = priorityRank(recommendations[i].priority || 'low');
          if (currentPri < existingPri) {
            recommendations[existingIdx] = recommendations[i];
          }
          recommendations.splice(i, 1);
          i--;
        } else {
          seen.set(key, i);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('生成建议失败:', error);
      return [];
    }
  }
  /**
   * 通过 Puppeteer 真实浏览器采集 Core Web Vitals（LCP/FCP/CLS/INP/TBT/TTFB）
   * 同时通过 CDP 收集网络请求统计真实资源分布
   * 返回 null 表示 Puppeteer 不可用，调用方应回退到估算值
   */
  private async collectRealWebVitals(
    url: string,
    timeout: number,
    networkThrottle?: string,
    devicePreset?: { width: number; height: number; isMobile: boolean },
    showBrowser?: boolean
  ): Promise<{
    vitals: PerformanceMetrics['coreWebVitals'];
    networkResources?: BrowserNetworkResources;
    inpDiagnostics?: {
      interactionEvents: Array<{
        name: string;
        duration: number;
        startTime: number;
        interactionId: number;
        processingStart: number;
        processingEnd: number;
        inputDelay: number;
        processingTime: number;
        presentationDelay: number;
      }>;
      longTasks: Array<{
        duration: number;
        startTime: number;
        blockingTime: number;
        name: string;
      }>;
      totalInteractions: number;
      totalLongTasks: number;
    };
  } | null> {
    const poolAvailable = await puppeteerPool.isAvailable();
    if (!poolAvailable) return null;

    const { page, release } = await puppeteerPool.acquirePage({
      disableCache: true,
      warmupUrl: url,
      headed: showBrowser,
    });
    try {
      const cdp = await page.createCDPSession();

      // 收集网络请求资源（含压缩状态和渲染阻塞标识）
      const networkItems: Array<{
        url: string;
        type: string;
        size: number;
        duration: number;
        compressed?: boolean;
        encoding?: string;
        renderBlocking?: boolean;
        decodedSize?: number;
      }> = [];
      const resourceCounts: Record<string, number> = {
        images: 0,
        scripts: 0,
        stylesheets: 0,
        fonts: 0,
        documents: 0,
        xhr: 0,
        other: 0,
      };

      // 应用设备 viewport 仿真
      if (devicePreset) {
        await page.setViewport({
          width: devicePreset.width,
          height: devicePreset.height,
          isMobile: devicePreset.isMobile,
          deviceScaleFactor: devicePreset.isMobile ? 2 : 1,
        });
      }

      await cdp.send('Network.enable');
      const pendingRequests = new Map<string, { url: string; type: string; startTime: number }>();
      // 响应元数据缓存（Content-Encoding、内容长度、渲染阻塞标识）
      const responseMeta = new Map<
        string,
        { encoding: string; decodedSize: number; renderBlocking: boolean }
      >();

      cdp.on(
        'Network.requestWillBeSent',
        (params: {
          requestId: string;
          request: { url: string; initialPriority?: string };
          type?: string;
          initiator?: { type?: string };
        }) => {
          pendingRequests.set(params.requestId, {
            url: params.request.url,
            type: String(params.type || 'Other'),
            startTime: Date.now(),
          });
        }
      );

      cdp.on(
        'Network.responseReceived',
        (params: {
          requestId: string;
          type?: string;
          response: {
            headers: Record<string, string>;
            encodedDataLength?: number;
            url?: string;
          };
        }) => {
          const headers = params.response.headers || {};
          const encoding = headers['content-encoding'] || headers['Content-Encoding'] || '';
          const contentLength = parseInt(
            headers['content-length'] || headers['Content-Length'] || '0',
            10
          );
          // Render-blocking: <head> 中的同步 script/stylesheet（无 async/defer）
          const resType = String(params.type || '').toLowerCase();
          const isRenderBlocking = resType === 'stylesheet' || resType === 'script';
          responseMeta.set(params.requestId, {
            encoding,
            decodedSize: contentLength || 0,
            renderBlocking: isRenderBlocking,
          });
        }
      );

      cdp.on(
        'Network.loadingFinished',
        (params: { requestId: string; encodedDataLength?: number }) => {
          const req = pendingRequests.get(params.requestId);
          if (!req) return;
          pendingRequests.delete(params.requestId);
          const size = params.encodedDataLength || 0;
          const duration = Date.now() - req.startTime;
          const cdpType = req.type.toLowerCase();
          let category = 'other';
          if (cdpType === 'image') category = 'images';
          else if (cdpType === 'script') category = 'scripts';
          else if (cdpType === 'stylesheet') category = 'stylesheets';
          else if (cdpType === 'font') category = 'fonts';
          else if (cdpType === 'document') category = 'documents';
          else if (cdpType === 'xhr' || cdpType === 'fetch') category = 'xhr';
          resourceCounts[category] = (resourceCounts[category] || 0) + 1;
          const meta = responseMeta.get(params.requestId);
          networkItems.push({
            url: req.url,
            type: category,
            size,
            duration,
            compressed: !!meta?.encoding,
            encoding: meta?.encoding || '',
            renderBlocking: meta?.renderBlocking || false,
            decodedSize: meta?.decodedSize || 0,
          });
          responseMeta.delete(params.requestId);
        }
      );

      // 应用网络节流
      if (networkThrottle && networkThrottle !== 'none' && NETWORK_PRESETS[networkThrottle]) {
        const preset = NETWORK_PRESETS[networkThrottle];
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: preset.downloadThroughput,
          uploadThroughput: preset.uploadThroughput,
          latency: preset.latency,
        });
      }
      await page.goto(url, { waitUntil: 'networkidle2', timeout });

      // 模拟用户交互以触发 INP/CLS 真实数据
      try {
        await page.evaluate(async () => {
          const scrollStep = Math.max(200, Math.floor(window.innerHeight * 0.6));
          const maxScroll = Math.min(document.body.scrollHeight, window.innerHeight * 3);
          let scrolled = 0;
          while (scrolled < maxScroll) {
            window.scrollBy(0, scrollStep);
            scrolled += scrollStep;
            await new Promise(r => setTimeout(r, 100));
          }
          window.scrollTo(0, 0);
          await new Promise(r => setTimeout(r, 200));
        });
        // 点击可交互元素
        const clickableSelectors = [
          'button:not([disabled]):not([aria-hidden="true"])',
          'a[href]:not([target="_blank"])',
          '[role="button"]:not([disabled])',
        ];
        let clickCount = 0;
        for (const selector of clickableSelectors) {
          if (clickCount >= 2) break;
          try {
            const elements = await page.$$(selector);
            for (const el of elements) {
              if (clickCount >= 2) break;
              const visible = await el.isIntersectingViewport();
              if (visible) {
                await el.click({ delay: 30 });
                clickCount++;
                await new Promise(r => setTimeout(r, 100));
              }
            }
          } catch {
            // 点击失败不影响测试
          }
        }
      } catch {
        // 交互模拟失败不影响采集
      }

      // 等待页面稳定
      await new Promise(r => setTimeout(r, 500));

      // 在浏览器内部采集真实指标
      const vitals = await page.evaluate(async () => {
        const OBSERVER_TIMEOUT = 2000;

        // Navigation Timing（同步）— 此代码在浏览器上下文执行，'navigation' 是有效的 EntryType
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = (performance as any).getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined;
        const ttfbValue = nav ? nav.responseStart - nav.startTime : 0;

        // FCP（同步）
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0] as
          | PerformanceEntry
          | undefined;
        const fcpValue = fcpEntry ? fcpEntry.startTime : 0;

        // LCP
        const observeLCP = () =>
          new Promise<number>(resolve => {
            let value = 0;
            try {
              const observer = new PerformanceObserver(list => {
                const entries = list.getEntries();
                const entry = entries[entries.length - 1];
                if (entry) value = entry.startTime;
              });
              observer.observe({ type: 'largest-contentful-paint', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                resolve(value);
              }, OBSERVER_TIMEOUT);
            } catch {
              resolve(0);
            }
          });

        // INP（增强版：返回详细交互事件列表）
        type InteractionEvent = {
          name: string;
          duration: number;
          startTime: number;
          interactionId: number;
          processingStart: number;
          processingEnd: number;
          inputDelay: number;
          processingTime: number;
          presentationDelay: number;
        };
        const observeINP = () =>
          new Promise<{ value: number; events: InteractionEvent[] }>(resolve => {
            const events: InteractionEvent[] = [];
            try {
              const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                  const evt = entry as PerformanceEntry & {
                    duration?: number;
                    interactionId?: number;
                    processingStart?: number;
                    processingEnd?: number;
                  };
                  if (
                    evt.interactionId &&
                    evt.interactionId > 0 &&
                    typeof evt.duration === 'number'
                  ) {
                    const pStart = evt.processingStart ?? evt.startTime;
                    const pEnd = evt.processingEnd ?? evt.startTime + evt.duration;
                    events.push({
                      name: evt.name || 'unknown',
                      duration: evt.duration,
                      startTime: Math.round(evt.startTime),
                      interactionId: evt.interactionId,
                      processingStart: Math.round(pStart),
                      processingEnd: Math.round(pEnd),
                      inputDelay: Math.round(pStart - evt.startTime),
                      processingTime: Math.round(pEnd - pStart),
                      presentationDelay: Math.round(evt.startTime + evt.duration - pEnd),
                    });
                  }
                }
              });
              observer.observe({
                type: 'event',
                buffered: true,
                durationThreshold: 16,
              } as PerformanceObserverInit);
              setTimeout(() => {
                observer.disconnect();
                if (events.length === 0) {
                  resolve({ value: 0, events: [] });
                  return;
                }
                const durations = events.map(e => e.duration).sort((a, b) => a - b);
                const idx = Math.min(durations.length - 1, Math.ceil(durations.length * 0.98) - 1);
                const inpValue = durations[Math.max(0, idx)];
                // 按 duration 降序排列，取前 10 个最慢的交互
                const topEvents = [...events].sort((a, b) => b.duration - a.duration).slice(0, 10);
                resolve({ value: inpValue, events: topEvents });
              }, OBSERVER_TIMEOUT);
            } catch {
              resolve({ value: 0, events: [] });
            }
          });

        // CLS (Session Window)
        const observeCLS = () =>
          new Promise<number>(resolve => {
            let maxSessionValue = 0;
            let currentSessionValue = 0;
            let currentSessionStart = -1;
            let lastEntryTime = 0;
            try {
              const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                  const ls = entry as PerformanceEntry & {
                    value?: number;
                    hadRecentInput?: boolean;
                  };
                  if (ls.hadRecentInput) continue;
                  const shiftValue = ls.value || 0;
                  if (
                    currentSessionStart < 0 ||
                    entry.startTime - lastEntryTime > 1000 ||
                    entry.startTime - currentSessionStart > 5000
                  ) {
                    currentSessionValue = shiftValue;
                    currentSessionStart = entry.startTime;
                  } else {
                    currentSessionValue += shiftValue;
                  }
                  lastEntryTime = entry.startTime;
                  maxSessionValue = Math.max(maxSessionValue, currentSessionValue);
                }
              });
              observer.observe({ type: 'layout-shift', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                resolve(maxSessionValue);
              }, OBSERVER_TIMEOUT);
            } catch {
              resolve(0);
            }
          });

        // TBT（增强版：返回详细长任务列表）
        type LongTaskEntry = {
          duration: number;
          startTime: number;
          blockingTime: number;
          name: string;
        };
        const observeTBT = () =>
          new Promise<{ value: number; tasks: LongTaskEntry[] }>(resolve => {
            let totalBlockingTime = 0;
            const tasks: LongTaskEntry[] = [];
            try {
              const observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                  if (entry.duration > 50) {
                    const bt = entry.duration - 50;
                    totalBlockingTime += bt;
                    tasks.push({
                      duration: Math.round(entry.duration),
                      startTime: Math.round(entry.startTime),
                      blockingTime: Math.round(bt),
                      name: entry.name || 'self',
                    });
                  }
                }
              });
              observer.observe({ type: 'longtask', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                // 按 duration 降序排列，取前 15 个最长的任务
                const topTasks = [...tasks].sort((a, b) => b.duration - a.duration).slice(0, 15);
                resolve({ value: totalBlockingTime, tasks: topTasks });
              }, OBSERVER_TIMEOUT);
            } catch {
              resolve({ value: 0, tasks: [] });
            }
          });

        const [lcp, inpResult, cls, tbtResult] = await Promise.all([
          observeLCP(),
          observeINP(),
          observeCLS(),
          observeTBT(),
        ]);

        return {
          fcp: fcpValue,
          lcp,
          inp: inpResult.value,
          cls,
          tbt: tbtResult.value,
          ttfb: ttfbValue,
          inpDiagnostics: {
            interactionEvents: inpResult.events,
            longTasks: tbtResult.tasks,
            totalInteractions: inpResult.events.length,
            totalLongTasks: tbtResult.tasks.length,
          },
        };
      });

      const ratingFor = (metric: string, value: number) => this.getWebVitalRating(metric, value);

      // 构建网络资源统计（排除主文档请求）
      const totalResources =
        Object.values(resourceCounts).reduce((a, b) => a + b, 0) - (resourceCounts.documents || 0);
      const networkResourceResult =
        totalResources > 0
          ? {
              counts: {
                ...resourceCounts,
                total: totalResources,
              },
              items: networkItems.filter(i => i.type !== 'documents'),
            }
          : undefined;

      return {
        vitals: {
          fcp: {
            value: Math.round(vitals.fcp),
            rating: ratingFor('fcp', vitals.fcp),
            estimated: false,
          },
          lcp: {
            value: Math.round(vitals.lcp),
            rating: ratingFor('lcp', vitals.lcp),
            estimated: false,
          },
          cls: {
            value: Math.round(vitals.cls * 1000) / 1000,
            rating: ratingFor('cls', vitals.cls),
            estimated: false,
          },
          inp: {
            value: Math.round(vitals.inp),
            rating: ratingFor('inp', vitals.inp),
            estimated: false,
          },
          ttfb: {
            value: Math.round(vitals.ttfb),
            rating: ratingFor('ttfb', vitals.ttfb),
            estimated: false,
          },
        },
        networkResources: networkResourceResult,
        inpDiagnostics: vitals.inpDiagnostics,
      };
    } catch {
      return null;
    } finally {
      await release();
    }
  }

  async cleanup() {
    // 中止所有进行中的测试
    for (const [testId, controller] of this.abortControllers) {
      if (!controller.signal.aborted) {
        controller.abort();
      }
      console.log(`清理性能测试: ${testId}`);
    }
    this.abortControllers.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    console.log('✅ 性能测试引擎清理完成');
  }
}

export default PerformanceTestEngine;
