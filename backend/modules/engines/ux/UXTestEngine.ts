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
import BaseTestEngine from '../base/BaseTestEngine';
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import ScreenshotService, { type ScreenshotResult } from '../shared/services/ScreenshotService';
import { calculateUXScore, scoreToGrade } from '../shared/utils/uxScore';

type DevicePreset = 'desktop' | 'mobile' | 'tablet';

type DeviceEmulation = {
  preset?: DevicePreset;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  userAgent?: string;
};

type UXRunConfig = BaseTestConfig & {
  testId?: string;
  iterations?: number;
  sampleDelayMs?: number;
  cpuSlowdownMultiplier?: number;
  network?: {
    downloadKbps?: number;
    uploadKbps?: number;
    latencyMs?: number;
  };
  device?: DeviceEmulation;
  enableScreenshot?: boolean;
};

type UXConfig = UXRunConfig & {
  testId: string;
};

type UXNavigationTiming = {
  ttfb: number;
  dcl: number;
  loadTime: number;
  domContentLoaded: number;
  domInteractive: number;
};

type UXMetrics = {
  navigation: UXNavigationTiming | null;
  fcp: number;
  lcp: number;
  fid: number;
  inp: number;
  cls: number;
  tbt: number;
  longTaskCount: number;
  userAgent: string;
  timestamp: string;
};

type UXMetricDistribution = {
  mean: number;
  min: number;
  max: number;
  p50: number;
  p75: number;
  p95: number;
  variance: number;
  stdDev: number;
};

type UXMetricStats = {
  fcp: UXMetricDistribution;
  lcp: UXMetricDistribution;
  fid: UXMetricDistribution;
  inp: UXMetricDistribution;
  cls: UXMetricDistribution;
  tbt: UXMetricDistribution;
  ttfb: UXMetricDistribution;
  loadTime: UXMetricDistribution;
};

type UXSummary = {
  description: string;
  highlights: string[];
  issues: string[];
  tags: Array<{ label: string; level: 'good' | 'warn' | 'bad' }>;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  levelLabel: string;
};

type UXRecommendation = {
  type: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
};

type UXResult = {
  url: string;
  metrics: UXMetrics;
  samples?: UXMetrics[];
  sampleCount: number;
  stats: UXMetricStats;
  score: number;
  grade: string;
  summary: UXSummary;
  recommendations: UXRecommendation[];
  screenshot?: ScreenshotResult;
};

type UXFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  status: TestStatus;
  score?: number;
  results?: UXResult;
  error?: string;
};

type UXProgressPayload = {
  testId: string;
  progress: number;
  message: string;
};

class UXTestEngine extends BaseTestEngine implements ITestEngine<UXRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  lifecycle?: ITestEngine<UXRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private onProgressCallbacks: Map<string, (progress: TestProgress) => void>;

  constructor() {
    super();
    this.type = TestEngineType.UX;
    this.name = 'ux';
    this.version = '2.0.0';
    this.description = 'UX测试引擎（支持 INP/TBT/设备仿真）';
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'lcp',
        'cls',
        'fcp',
        'inp',
        'tbt',
        'ttfb',
        'user-experience',
        'multi-sample',
        'device-emulation',
      ],
      requiredConfig: ['url'],
      optionalConfig: ['iterations', 'sampleDelayMs', 'cpuSlowdownMultiplier', 'network', 'device'],
      outputFormat: ['summary', 'metrics', 'samples', 'stats', 'recommendations'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 5000,
        max: 60000,
        typical: 20000,
      },
    };
    this.progressTracker = new Map();
    this.onProgressCallbacks = new Map();
  }

  async initialize(): Promise<void> {
    return;
  }

  validate(config: UXRunConfig): ValidationResult {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      timeout: Joi.number().min(1000),
      testId: Joi.string(),
      confirmPuppeteer: Joi.boolean().default(true),
      iterations: Joi.number().min(1).default(3),
      sampleDelayMs: Joi.number().min(0).max(10000).default(500),
      cpuSlowdownMultiplier: Joi.number().min(1).max(6).default(1),
      network: Joi.object({
        downloadKbps: Joi.number().min(0),
        uploadKbps: Joi.number().min(0),
        latencyMs: Joi.number().min(0),
      }).optional(),
      device: Joi.alternatives()
        .try(
          Joi.string().valid('desktop', 'mobile', 'tablet'),
          Joi.object({
            preset: Joi.string().valid('desktop', 'mobile', 'tablet'),
            width: Joi.number().min(320).max(3840),
            height: Joi.number().min(480).max(2160),
            deviceScaleFactor: Joi.number().min(1).max(4),
            isMobile: Joi.boolean(),
            hasTouch: Joi.boolean(),
            userAgent: Joi.string().allow(''),
          })
        )
        .optional(),
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
    const iterations = typeof cfgAny.iterations === 'number' ? cfgAny.iterations : 3;
    // 每次迭代：页面加载 + 交互模拟 + Observer 等待 ≈ 15s，加上截图和分析时间
    cfgAny.executionTimeout = Math.max(60000, iterations * 15000 + 30000);

    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }

  async run(
    config: UXRunConfig,
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
      currentStep: '准备UX测试环境',
      startTime,
      messages: [],
    };
    this.progressTracker.set(testId, initialProgress);
    if (onProgress) {
      this.onProgressCallbacks.set(testId, onProgress);
      onProgress(initialProgress);
    }

    try {
      const result = await this.executeTest({
        ...config,
        testId,
      });
      const endTime = new Date();
      const uxScore = result.results?.score ?? 0;
      const uxGrade =
        result.results?.grade ||
        (uxScore >= 90
          ? 'A'
          : uxScore >= 80
            ? 'B'
            : uxScore >= 60
              ? 'C'
              : uxScore >= 40
                ? 'D'
                : 'F');
      const uxSummaryData = result.results?.summary;
      const structuredSummary = {
        score: uxScore,
        grade: uxGrade,
        passed: uxScore >= 60,
        description: uxSummaryData?.description ?? '',
        highlights: uxSummaryData?.highlights ?? [],
        issues: uxSummaryData?.issues ?? [],
      };
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: uxScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || 'UX测试失败')],
        warnings: [],
        recommendations: (result.results?.recommendations || []).map(item => item.recommendation),
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
        summary: 'UX测试失败',
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
    }
  }

  async cancel(testId: string): Promise<void> {
    this.cancelTest(testId);
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

  estimateDuration(config: UXRunConfig): number {
    const iterations = typeof config.iterations === 'number' ? config.iterations : 3;
    return iterations * 5000;
  }

  getDependencies(): TestEngineType[] {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getMetrics(): Record<string, unknown> {
    return {
      activeTests: this.activeTests.size,
    };
  }

  private normalizeConfig(config: UXConfig): UXConfig {
    // 展开 options：前端发送 { url, testType, options: { iterations, network, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as UXConfig;
    }

    // advancedSettings.device 是字符串 preset（如 "desktop"），转为 { preset } 对象
    const rawDevice = (config as unknown as Record<string, unknown>).device;
    if (typeof rawDevice === 'string' && rawDevice) {
      (config as unknown as Record<string, unknown>).device = { preset: rawDevice };
    }

    const schema = Joi.object({
      url: Joi.string().uri().required(),
      timeout: Joi.number().min(1000).max(120000),
      testId: Joi.string().required(),
      confirmPuppeteer: Joi.boolean().default(true),
      iterations: Joi.number().min(1).max(50).default(3),
      sampleDelayMs: Joi.number().min(0).max(10000).default(500),
      cpuSlowdownMultiplier: Joi.number().min(1).max(6).default(1),
      network: Joi.object({
        downloadKbps: Joi.number().min(0),
        uploadKbps: Joi.number().min(0),
        latencyMs: Joi.number().min(0),
      }).optional(),
      device: Joi.object({
        preset: Joi.string().valid('desktop', 'mobile', 'tablet'),
        width: Joi.number().min(320).max(3840),
        height: Joi.number().min(480).max(2160),
        deviceScaleFactor: Joi.number().min(1).max(4),
        isMobile: Joi.boolean(),
        hasTouch: Joi.boolean(),
        userAgent: Joi.string().allow(''),
      }).optional(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as UXConfig;
  }

  async executeTest(config: Record<string, unknown>) {
    const validatedConfig = this.normalizeConfig(config as unknown as UXConfig);
    const testId = validatedConfig.testId;
    const timeout = validatedConfig.timeout || 60000;
    const url = validatedConfig.url || '';
    const iterations = validatedConfig.iterations || 3;
    const sampleDelayMs = validatedConfig.sampleDelayMs ?? 500;

    if (!url) {
      throw new Error('UX测试URL不能为空');
    }

    const poolAvailable = await puppeteerPool.isAvailable();
    if (!poolAvailable) {
      const result: UXFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        status: TestStatus.FAILED,
        error: '未检测到 Puppeteer 依赖，无法执行UX测试',
      };
      return result;
    }

    const showBrowser = config.showBrowser === true;
    const engineMode = typeof config.engineMode === 'string' ? config.engineMode : undefined;
    const { page, release } = await puppeteerPool.acquirePage({
      disableCache: true,
      warmupUrl: url,
      headed: showBrowser,
      engineMode,
    });
    try {
      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 5, '初始化UX测试');
      this.updateTestProgress(testId, 12, '启动真实浏览器');
      this.updateTestProgress(testId, 25, '准备测试页面');

      await this.applyDeviceEmulation(page, validatedConfig);
      await this.applyThrottling(page, validatedConfig);

      const samples: UXMetrics[] = [];
      this.updateTestProgress(testId, 40, '加载页面资源');
      for (let index = 0; index < iterations; index += 1) {
        const testRecord = this.activeTests.get(testId);
        if (testRecord?.status === TestStatus.CANCELLED) {
          break;
        }
        if (index > 0 && sampleDelayMs > 0) {
          await this.sleep(sampleDelayMs);
        }

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout });
          // 模拟用户交互以触发 INP/CLS 真实数据
          await this.simulateUserInteraction(page);
          const metrics = await this.collectMetrics(page);
          samples.push(metrics);
        } catch (sampleError) {
          const msg = sampleError instanceof Error ? sampleError.message : String(sampleError);
          this.updateTestProgress(
            testId,
            40 + Math.round(((index + 1) / iterations) * 35),
            `第 ${index + 1} 次采样失败，跳过: ${msg}`
          );
        }
        const progress = 40 + Math.round(((index + 1) / iterations) * 35);
        this.updateTestProgress(testId, progress, `采集用户体验指标 (${index + 1}/${iterations})`);
      }

      if (samples.length === 0) {
        throw new Error(`所有 ${iterations} 次UX采样均失败，无法生成有效结果`);
      }

      const metrics = this.aggregateMetrics(samples);

      this.updateTestProgress(testId, 85, '分析用户体验数据');
      const score = calculateUXScore(metrics);
      const summary = this.buildExperienceSummary(metrics, score);
      const recommendations = this.buildStructuredRecommendations(metrics);
      this.updateTestProgress(testId, 90, '生成UX评分');

      // U6: 截图在评分之后执行，进度条顺序正确
      let screenshotResult: ScreenshotResult | undefined;
      if (validatedConfig.enableScreenshot) {
        this.updateTestProgress(testId, 93, '截取页面截图');
        try {
          const ssService = new ScreenshotService();
          const devicePreset = validatedConfig.device?.preset;
          const presetDims = devicePreset ? UXTestEngine.DEVICE_PRESETS[devicePreset] : null;
          const ssWidth = validatedConfig.device?.width ?? presetDims?.width ?? 1920;
          const ssHeight = validatedConfig.device?.height ?? presetDims?.height ?? 1080;
          screenshotResult = await ssService.capture({
            url,
            width: ssWidth,
            height: ssHeight,
            fullPage: false,
            timeout: 15000,
          });
        } catch {
          // 截图失败不影响测试结果
        }
      }

      const stats = this.buildMetricStats(samples);
      const results: UXResult = {
        url,
        metrics,
        samples,
        sampleCount: samples.length,
        stats,
        score,
        grade: scoreToGrade(score),
        summary,
        recommendations,
        screenshot: screenshotResult,
      };

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results,
      });
      this.updateTestProgress(testId, 100, 'UX测试完成');

      const finalResult: UXFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        status: TestStatus.COMPLETED,
        score,
        results,
      };

      // 不在此处调用 emitCompletion —— 由 UserTestManager 统一处理

      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
          this.onProgressCallbacks.delete(testId);
        },
        5 * 60 * 1000
      );

      return finalResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.activeTests.set(testId, { status: TestStatus.FAILED, error: message });
      // 不在此处调用 emitError —— 由 UserTestManager 统一处理

      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
          this.onProgressCallbacks.delete(testId);
        },
        5 * 60 * 1000
      );

      return {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        status: TestStatus.FAILED,
        error: message,
      } as UXFinalResult;
    } finally {
      await release();
    }
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId);
    this.activeTests.set(testId, {
      status: test?.status || TestStatus.RUNNING,
      progress,
      startTime: test?.startTime,
      results: test?.results,
      error: test?.error,
    });

    const progressPayload: UXProgressPayload = {
      testId,
      progress,
      message,
    };
    this.emitProgress(progressPayload.testId, progressPayload.progress, progressPayload.message);
    const current = this.progressTracker.get(testId);
    const updatedProgress: TestProgress = {
      status: TestStatus.RUNNING,
      progress,
      currentStep: message,
      startTime: current?.startTime || new Date(),
      messages: current?.messages ? [...current.messages, message].slice(-20) : [message],
    };
    this.progressTracker.set(testId, updatedProgress);
    const cb = this.onProgressCallbacks.get(testId);
    if (cb) {
      cb(updatedProgress);
    }
  }

  private buildExperienceSummary(metrics: UXMetrics, score: number): UXSummary {
    const issues: string[] = [];
    const highlights: string[] = [];
    const tags: Array<{ label: string; level: 'good' | 'warn' | 'bad' }> = [];
    const lcp = Number(metrics.lcp || 0);
    const fcp = Number(metrics.fcp || 0);
    const inp = Number(metrics.inp || 0);
    const tbt = Number(metrics.tbt || 0);
    const cls = Number(metrics.cls || 0);
    const ttfb = Number(metrics.navigation?.ttfb || 0);
    const longTaskCount = Number(metrics.longTaskCount || 0);

    // LCP
    if (lcp > 4000) {
      issues.push(`首屏内容呈现严重偏慢 (LCP ${Math.round(lcp)}ms)，需要紧急优化关键渲染路径`);
      tags.push({ label: 'LCP差', level: 'bad' });
    } else if (lcp > 2500) {
      issues.push(`首屏内容呈现偏慢 (LCP ${Math.round(lcp)}ms)，建议优化关键资源加载`);
      tags.push({ label: 'LCP待改善', level: 'warn' });
    } else {
      highlights.push(`首屏渲染速度良好 (LCP ${Math.round(lcp)}ms)`);
      tags.push({ label: 'LCP优秀', level: 'good' });
    }

    // FCP
    if (fcp > 3000) {
      issues.push(`首次内容绘制严重偏慢 (FCP ${Math.round(fcp)}ms)`);
      tags.push({ label: 'FCP差', level: 'bad' });
    } else if (fcp > 1800) {
      issues.push(`首次内容绘制偏慢 (FCP ${Math.round(fcp)}ms)，建议减少阻塞脚本`);
      tags.push({ label: 'FCP待改善', level: 'warn' });
    } else {
      highlights.push(`首次内容绘制表现稳定 (FCP ${Math.round(fcp)}ms)`);
      tags.push({ label: 'FCP良好', level: 'good' });
    }

    // INP (替代 FID 作为核心交互指标)
    if (inp > 500) {
      issues.push(`交互响应严重延迟 (INP ${Math.round(inp)}ms)，页面交互体验差`);
      tags.push({ label: 'INP差', level: 'bad' });
    } else if (inp > 200) {
      issues.push(`交互响应偏慢 (INP ${Math.round(inp)}ms)，建议优化事件处理`);
      tags.push({ label: 'INP待改善', level: 'warn' });
    } else {
      highlights.push('交互响应迅速');
      tags.push({ label: 'INP良好', level: 'good' });
    }

    // TBT
    if (tbt > 600) {
      issues.push(`主线程阻塞严重 (TBT ${Math.round(tbt)}ms)，存在大量长任务`);
      tags.push({ label: 'TBT差', level: 'bad' });
    } else if (tbt > 200) {
      issues.push(`主线程存在阻塞 (TBT ${Math.round(tbt)}ms, ${longTaskCount}个长任务)`);
      tags.push({ label: 'TBT待改善', level: 'warn' });
    } else {
      highlights.push('主线程畅通，无明显阻塞');
      tags.push({ label: 'TBT良好', level: 'good' });
    }

    // CLS
    if (cls > 0.25) {
      issues.push(`布局严重不稳定 (CLS ${cls.toFixed(3)})，用户体验受到严重影响`);
      tags.push({ label: 'CLS差', level: 'bad' });
    } else if (cls > 0.1) {
      issues.push(`布局稳定性不足 (CLS ${cls.toFixed(3)})，建议为动态内容预留空间`);
      tags.push({ label: 'CLS待改善', level: 'warn' });
    } else {
      highlights.push(`布局稳定性良好 (CLS ${cls.toFixed(3)})`);
      tags.push({ label: '布局稳定', level: 'good' });
    }

    // TTFB
    if (ttfb > 1800) {
      issues.push(`服务端响应严重偏慢 (TTFB ${Math.round(ttfb)}ms)`);
      tags.push({ label: 'TTFB差', level: 'bad' });
    } else if (ttfb > 800) {
      issues.push(`服务端响应偏慢 (TTFB ${Math.round(ttfb)}ms)，建议优化后端与缓存`);
      tags.push({ label: 'TTFB待改善', level: 'warn' });
    } else {
      highlights.push(`服务端响应迅速 (TTFB ${Math.round(ttfb)}ms)`);
      tags.push({ label: 'TTFB良好', level: 'good' });
    }

    const description =
      score >= 90
        ? '体验优秀，加载与交互表现稳定，各项核心指标均达到 Google 推荐标准。'
        : score >= 75
          ? '体验良好，大部分指标表现正常，仍有少量优化空间。'
          : score >= 60
            ? '体验一般，部分核心指标未达标，建议优先优化性能瓶颈。'
            : '体验较弱，多项核心指标不达标，需要系统性优化。';

    return {
      description,
      highlights,
      issues,
      tags,
      level: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
      levelLabel: score >= 90 ? '优秀' : score >= 75 ? '良好' : score >= 60 ? '一般' : '较弱',
    };
  }

  private buildStructuredRecommendations(metrics: UXMetrics): UXRecommendation[] {
    const recommendations: UXRecommendation[] = [];

    const lcp = Number(metrics.lcp || 0);
    const fcp = Number(metrics.fcp || 0);
    const inp = Number(metrics.inp || 0);
    const tbt = Number(metrics.tbt || 0);
    const cls = Number(metrics.cls || 0);
    const ttfb = Number(metrics.navigation?.ttfb || 0);

    if (lcp > 2500) {
      recommendations.push({
        type: 'lcp',
        label: '首屏渲染优化',
        severity: lcp > 4000 ? 'high' : 'medium',
        metric: 'LCP(ms)',
        value: Math.round(lcp),
        threshold: 2500,
        recommendation:
          '优化 LCP 元素加载：预加载关键图片/字体，内联关键 CSS，移除渲染阻塞资源，使用 CDN 加速静态资源。',
      });
    }

    if (fcp > 1800) {
      recommendations.push({
        type: 'fcp',
        label: '首次内容绘制优化',
        severity: fcp > 3000 ? 'high' : 'medium',
        metric: 'FCP(ms)',
        value: Math.round(fcp),
        threshold: 1800,
        recommendation:
          '减少首屏渲染阻塞：内联关键 CSS，延迟加载非关键 JS，启用 gzip/brotli 压缩，减少服务端处理时间。',
      });
    }

    if (inp > 200) {
      recommendations.push({
        type: 'inp',
        label: '交互响应优化 (INP)',
        severity: inp > 500 ? 'high' : 'medium',
        metric: 'INP(ms)',
        value: Math.round(inp),
        threshold: 200,
        recommendation:
          '优化交互响应：拆分长任务使用 requestIdleCallback/scheduler.yield()，减少事件处理器复杂度，避免同步布局/样式计算。',
      });
    }

    if (tbt > 200) {
      recommendations.push({
        type: 'tbt',
        label: '主线程阻塞优化 (TBT)',
        severity: tbt > 600 ? 'high' : 'medium',
        metric: 'TBT(ms)',
        value: Math.round(tbt),
        threshold: 200,
        recommendation:
          '减少主线程阻塞：将长任务拆分为 <50ms 的小任务，使用 Web Worker 处理计算密集型逻辑，延迟加载第三方脚本。',
      });
    }

    if (cls > 0.1) {
      recommendations.push({
        type: 'cls',
        label: '布局稳定性优化',
        severity: cls > 0.25 ? 'high' : 'medium',
        metric: 'CLS',
        value: Number(cls.toFixed(4)),
        threshold: 0.1,
        recommendation:
          '改善布局稳定性：为图片/视频/广告预设尺寸(width/height)，避免动态插入内容导致位移，使用 CSS contain 属性。',
      });
    }

    if (ttfb > 800) {
      recommendations.push({
        type: 'ttfb',
        label: '服务端响应优化',
        severity: ttfb > 1800 ? 'high' : 'medium',
        metric: 'TTFB(ms)',
        value: Math.round(ttfb),
        threshold: 800,
        recommendation:
          '优化服务端响应：启用 HTTP 缓存与 CDN，优化数据库查询，使用 Edge Computing/SSG，减少重定向链。',
      });
    }

    // U7: loadTime 超标建议
    const loadTime = Number(metrics.navigation?.loadTime || 0);
    if (loadTime > 3000) {
      recommendations.push({
        type: 'loadTime',
        label: '页面加载时间优化',
        severity: loadTime > 6000 ? 'high' : 'medium',
        metric: 'Load Time(ms)',
        value: Math.round(loadTime),
        threshold: 3000,
        recommendation:
          '缩短页面加载时间：减少请求数量（合并/内联关键资源），启用 HTTP/2 多路复用，延迟加载非首屏资源，优化图片体积（WebP/AVIF）。',
      });
    }

    // 按严重度排序：high > medium > low
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
    );

    return recommendations;
  }

  async stopTest(testId: string) {
    const cancelled = this.cancelTest(testId);
    if (cancelled) {
      const test = this.activeTests.get(testId);
      this.progressTracker.set(testId, {
        status: TestStatus.CANCELLED,
        progress: test?.progress || 0,
        currentStep: '已取消',
        startTime: new Date(test?.startTime || Date.now()),
        messages: ['测试已取消'],
      });
    }
    return cancelled;
  }

  private static readonly DEVICE_PRESETS: Record<
    DevicePreset,
    Required<Omit<DeviceEmulation, 'preset'>>
  > = {
    desktop: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      userAgent: '',
    },
    mobile: {
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
    tablet: {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
  };

  private async applyDeviceEmulation(
    page: import('puppeteer').Page,
    config: UXConfig
  ): Promise<void> {
    const device = config.device;
    if (!device) return;

    const preset =
      device.preset && UXTestEngine.DEVICE_PRESETS[device.preset]
        ? UXTestEngine.DEVICE_PRESETS[device.preset]
        : null;

    const viewport = {
      width: device.width ?? preset?.width ?? 1920,
      height: device.height ?? preset?.height ?? 1080,
      deviceScaleFactor: device.deviceScaleFactor ?? preset?.deviceScaleFactor ?? 1,
      isMobile: device.isMobile ?? preset?.isMobile ?? false,
      hasTouch: device.hasTouch ?? preset?.hasTouch ?? false,
    };

    await page.setViewport(viewport);

    const ua = device.userAgent ?? preset?.userAgent;
    if (ua) {
      await page.setUserAgent(ua);
    }
  }

  private async applyThrottling(page: import('puppeteer').Page, config: UXConfig): Promise<void> {
    type PageThrottling = {
      emulateCPUThrottling?: (rate: number) => Promise<void>;
      emulateNetworkConditions?: (conditions: {
        download: number;
        upload: number;
        latency: number;
      }) => Promise<void>;
    };
    const cpuSlowdown = config.cpuSlowdownMultiplier ?? 1;
    const throttlingPage = page as import('puppeteer').Page & PageThrottling;
    if (cpuSlowdown > 1 && typeof throttlingPage.emulateCPUThrottling === 'function') {
      await throttlingPage.emulateCPUThrottling(cpuSlowdown);
    }

    // U8: 网络限速参数为 0 时跳过，避免 download=0 完全禁止下载
    const network = config.network;
    if (network && typeof throttlingPage.emulateNetworkConditions === 'function') {
      const downloadKbps = network.downloadKbps ?? 0;
      const uploadKbps = network.uploadKbps ?? 0;
      const latency = network.latencyMs ?? 0;
      if (downloadKbps > 0 || uploadKbps > 0 || latency > 0) {
        const download = (downloadKbps * 1024) / 8;
        const upload = (uploadKbps * 1024) / 8;
        await throttlingPage.emulateNetworkConditions({
          download,
          upload,
          latency,
        });
      }
    }
  }

  private async simulateUserInteraction(page: import('puppeteer').Page): Promise<void> {
    try {
      // 1. 渐进式滚动（触发 lazy-load 和 layout shift）
      await page.evaluate(async () => {
        const scrollStep = Math.max(200, Math.floor(window.innerHeight * 0.6));
        const maxScroll = Math.min(document.body.scrollHeight, window.innerHeight * 5);
        let scrolled = 0;
        while (scrolled < maxScroll) {
          window.scrollBy(0, scrollStep);
          scrolled += scrollStep;
          await new Promise(r => setTimeout(r, 150));
        }
        // 滚回顶部
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 200));
      });

      // 2. 点击可交互元素（触发 INP event timing，最多点击 3 个不同元素）
      // U5: 排除 a[href] 避免点击导致页面导航离开，影响后续指标采集
      const clickableSelectors = [
        'button:not([disabled]):not([aria-hidden="true"])',
        'input[type="button"]:not([disabled])',
        '[role="button"]:not([disabled])',
        '[tabindex="0"]',
      ];
      let clickCount = 0;
      const maxClicks = 3;
      for (const selector of clickableSelectors) {
        if (clickCount >= maxClicks) break;
        try {
          const elements = await page.$$(selector);
          for (const el of elements) {
            if (clickCount >= maxClicks) break;
            const visible = await el.isIntersectingViewport();
            if (visible) {
              await el.click({ delay: 30 });
              clickCount += 1;
              await this.sleep(150);
            }
          }
        } catch {
          // 点击失败不影响测试
        }
      }

      // 3. 键盘 Tab 导航（触发额外的 INP event timing）
      try {
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Tab');
          await this.sleep(80);
        }
      } catch {
        // 键盘导航失败不影响测试
      }

      // 4. 等待交互效果稳定
      await this.sleep(300);
    } catch {
      // 交互模拟失败不影响测试结果
    }
  }

  private async collectMetrics(page: import('puppeteer').Page): Promise<UXMetrics> {
    // 等待页面稳定后再采集（给 PerformanceObserver 更多时间）
    await this.sleep(500);

    return page.evaluate(async () => {
      // ── Navigation Timing（同步采集，无需 Observer） ──
      const getNavTiming = () => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (!nav) return null;
        return {
          ttfb: nav.responseStart - nav.startTime,
          dcl: nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd - nav.startTime : 0,
          loadTime: nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : 0,
          domContentLoaded:
            nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd - nav.startTime : 0,
          domInteractive: nav.domInteractive > 0 ? nav.domInteractive - nav.startTime : 0,
        };
      };

      // ── Paint Timing (FCP)（同步采集） ──
      const getPaintMetric = (name: string) => {
        const entry = performance.getEntriesByName(name)[0] as PerformanceEntry | undefined;
        return entry ? entry.startTime : 0;
      };

      // ── 所有 PerformanceObserver 并行启动，统一等待 2s ──
      const OBSERVER_TIMEOUT = 2000;

      const observeLCP = () =>
        new Promise<number>(resolve => {
          let value = 0;
          try {
            const observer = new PerformanceObserver(list => {
              const entries = list.getEntries();
              const entry = entries[entries.length - 1] as PerformanceEntry | undefined;
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

      // FID 已被 Google 废弃（2024.03 替换为 INP），不再采集

      const observeINP = () =>
        new Promise<number>(resolve => {
          const durations: number[] = [];
          try {
            const observer = new PerformanceObserver(list => {
              for (const entry of list.getEntries()) {
                const evt = entry as PerformanceEntry & {
                  duration?: number;
                  interactionId?: number;
                };
                if (
                  evt.interactionId &&
                  evt.interactionId > 0 &&
                  typeof evt.duration === 'number'
                ) {
                  durations.push(evt.duration);
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
              if (durations.length === 0) {
                resolve(0);
                return;
              }
              durations.sort((a, b) => a - b);
              const idx = Math.min(durations.length - 1, Math.ceil(durations.length * 0.98) - 1);
              resolve(durations[Math.max(0, idx)]);
            }, OBSERVER_TIMEOUT);
          } catch {
            resolve(0);
          }
        });

      const observeCLS = () =>
        new Promise<number>(resolve => {
          let maxSessionValue = 0;
          let currentSessionValue = 0;
          let currentSessionStart = -1;
          let lastEntryTime = 0;
          try {
            const observer = new PerformanceObserver(list => {
              for (const entry of list.getEntries() as PerformanceEntry[]) {
                const layoutShift = entry as PerformanceEntry & {
                  value?: number;
                  hadRecentInput?: boolean;
                };
                if (layoutShift.hadRecentInput) continue;
                const shiftValue = layoutShift.value || 0;
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

      const observeTBT = () =>
        new Promise<{ tbt: number; longTaskCount: number }>(resolve => {
          let totalBlockingTime = 0;
          let count = 0;
          try {
            const observer = new PerformanceObserver(list => {
              for (const entry of list.getEntries()) {
                if (entry.duration > 50) {
                  totalBlockingTime += entry.duration - 50;
                  count += 1;
                }
              }
            });
            observer.observe({ type: 'longtask', buffered: true });
            setTimeout(() => {
              observer.disconnect();
              resolve({ tbt: totalBlockingTime, longTaskCount: count });
            }, OBSERVER_TIMEOUT);
          } catch {
            resolve({ tbt: 0, longTaskCount: 0 });
          }
        });

      // 并行启动所有 Observer（~2s 而非串行 ~10s）
      const [lcp, inp, cls, tbtResult] = await Promise.all([
        observeLCP(),
        observeINP(),
        observeCLS(),
        observeTBT(),
      ]);

      return {
        navigation: getNavTiming(),
        fcp: getPaintMetric('first-contentful-paint'),
        lcp,
        fid: 0,
        inp,
        cls,
        tbt: tbtResult.tbt,
        longTaskCount: tbtResult.longTaskCount,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
    });
  }

  private aggregateMetrics(samples: UXMetrics[]): UXMetrics {
    // U2: 过滤 0 值（0 表示采集失败），仅保留有效样本
    const validValues = (values: number[]) => values.filter(v => v > 0);
    // U1: Google 标准用 P75 评估 Web Vitals，而非平均值
    const p75 = (values: number[]) => {
      const valid = validValues(values);
      if (!valid.length) return 0;
      const sorted = [...valid].sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.75) - 1));
      return sorted[idx];
    };
    const average = (values: number[]) => {
      const valid = validValues(values);
      return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
    };
    // 四舍五入：ms 级指标取整，CLS 保留 4 位小数
    const roundMs = (v: number) => Math.round(v);
    const roundCls = (v: number) => Math.round(v * 10000) / 10000;

    const navigationSamples = samples
      .map(sample => sample.navigation)
      .filter(Boolean) as UXNavigationTiming[];

    // Navigation timing 用平均值（非 Web Vitals 核心指标）
    const navigation = navigationSamples.length
      ? {
          ttfb: roundMs(p75(navigationSamples.map(sample => sample.ttfb))),
          dcl: roundMs(average(navigationSamples.map(sample => sample.dcl))),
          loadTime: roundMs(average(navigationSamples.map(sample => sample.loadTime))),
          domContentLoaded: roundMs(
            average(navigationSamples.map(sample => sample.domContentLoaded))
          ),
          domInteractive: roundMs(average(navigationSamples.map(sample => sample.domInteractive))),
        }
      : null;

    return {
      navigation,
      fcp: roundMs(p75(samples.map(sample => sample.fcp))),
      lcp: roundMs(p75(samples.map(sample => sample.lcp))),
      fid: 0, // FID 已废弃，固定为 0
      inp: roundMs(p75(samples.map(sample => sample.inp))),
      cls: roundCls(p75(samples.map(sample => sample.cls))),
      tbt: roundMs(p75(samples.map(sample => sample.tbt))),
      longTaskCount: Math.round(average(samples.map(sample => sample.longTaskCount))),
      userAgent: samples[0]?.userAgent || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  private buildMetricStats(samples: UXMetrics[]): UXMetricStats {
    const pick = (values: number[], percentile: number) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(sorted.length * percentile) - 1)
      );
      return sorted[index];
    };
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const statsFor = (values: number[]): UXMetricDistribution => {
      if (!values.length) {
        return { mean: 0, min: 0, max: 0, p50: 0, p75: 0, p95: 0, variance: 0, stdDev: 0 };
      }
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance =
        values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const sorted = [...values].sort((a, b) => a - b);
      return {
        mean: round2(mean),
        min: round2(sorted[0]),
        max: round2(sorted[sorted.length - 1]),
        p50: round2(pick(sorted, 0.5)),
        p75: round2(pick(sorted, 0.75)),
        p95: round2(pick(sorted, 0.95)),
        variance: round2(variance),
        stdDev: round2(stdDev),
      };
    };
    const ttfbValues = samples.map(sample => sample.navigation?.ttfb || 0);
    const loadValues = samples.map(sample => sample.navigation?.loadTime || 0);
    return {
      fcp: statsFor(samples.map(sample => sample.fcp)),
      lcp: statsFor(samples.map(sample => sample.lcp)),
      fid: { mean: 0, min: 0, max: 0, p50: 0, p75: 0, p95: 0, variance: 0, stdDev: 0 }, // FID 已废弃
      inp: statsFor(samples.map(sample => sample.inp)),
      cls: statsFor(samples.map(sample => sample.cls)),
      tbt: statsFor(samples.map(sample => sample.tbt)),
      ttfb: statsFor(ttfbValues),
      loadTime: statsFor(loadValues),
    };
  }

  private sleep(durationMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, durationMs));
  }

  async cleanup() {
    this.progressTracker.clear();
    this.onProgressCallbacks.clear();
    this.reset(); // BaseTestEngine: clears activeTests, testHistory, callbacks
  }
}

export default UXTestEngine;
