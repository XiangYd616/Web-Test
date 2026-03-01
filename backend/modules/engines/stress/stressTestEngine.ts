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
import { getAlertManager } from '../../alert/services/AlertManager';
import Logger from '../../utils/logger';
// 进度事件统一由 UserTestManager.progressCallback -> sendToUser 推送，不再直接走房间广播
import StressAnalyzer, {
  type StressConfig,
  type StressProgress,
  type StressResult,
} from './StressAnalyzer';

type StressAlertPayload = {
  testId: string;
  testType: string;
  url: string;
  error?: string;
  results?: StressResult;
  analysis?: StressAnalysis;
};

type StressRunConfig = BaseTestConfig & {
  testId?: string;
  url?: string;
  duration?: number;
  concurrency?: number;
  rampUp?: number;
  timeout?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  thinkTime?: number;
  stressMode?: string;
  maxResponseTimeThreshold?: number;
  maxErrorRateThreshold?: number;
  minSuccessRateThreshold?: number;
};

type StressAnalysis = {
  performance: 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
};

type StressSummary = {
  totalRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  throughput: number;
  latency: { p50: number; p90: number; p95: number; p99: number };
  performance: StressAnalysis['performance'];
};

type StressNormalizedResult = {
  testId: string;
  status: TestStatus;
  score: number;
  summary: StressSummary;
  metrics: StressResult['performance'];
  warnings: string[];
  errors: string[];
  details: {
    url: string;
    results: StressResult;
    analysis: StressAnalysis;
    stressMode?: string;
    duration?: number;
    rampUp?: number;
    thinkTime?: number;
    timeout?: number;
    method?: string;
    concurrency?: number;
  };
};

type StressFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  url: string;
  results?: StressNormalizedResult;
  status: TestStatus;
  score?: number;
  summary?: StressSummary | null;
  warnings?: string[];
  errors?: string[];
  analysis?: StressAnalysis;
  error?: string;
  timestamp: string;
};

type StressActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  lastUpdate?: number;
  message?: string;
  error?: string;
  results?: StressNormalizedResult;
};

type StressProgressExtra = {
  url?: string;
  stats?: {
    completed?: number;
    failed?: number;
    avgResponseTime?: number;
  };
};

type StressProgressPayload = {
  testId: string;
  progress: number;
  message: string;
  status?: string;
} & StressProgressExtra;

class StressTestEngine implements ITestEngine<StressRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  options: Partial<StressConfig>;
  analyzer: StressAnalyzer;
  alertManager: {
    checkAlert?: (type: string, payload: StressAlertPayload) => Promise<void>;
  } | null;
  activeTests: Map<string, StressActiveTestRecord>;
  progressCallback: ((progress: StressProgressPayload) => void) | null;
  completionCallback: ((results: StressFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  lifecycle?: ITestEngine<StressRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private abortControllers: Map<string, AbortController>;

  constructor(options: Partial<StressConfig> = {}) {
    this.type = TestEngineType.STRESS;
    this.name = 'stress';
    this.version = '3.0.0';
    this.description = '压力测试引擎 - 支持WebSocket实时通知和告警';
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'stress-testing',
        'load-generation',
        'performance-analysis',
        'concurrency-testing',
      ],
      requiredConfig: ['url'],
      optionalConfig: ['duration', 'concurrency', 'rampUp'],
      outputFormat: ['summary', 'metrics', 'warnings', 'errors', 'details'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 5000,
        max: 60000,
        typical: 20000,
      },
    };
    this.options = options;
    this.analyzer = new StressAnalyzer(options);
    this.alertManager = null;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.progressTracker = new Map();
    this.abortControllers = new Map();

    try {
      this.alertManager = getAlertManager() as {
        checkAlert?: (type: string, payload: StressAlertPayload) => Promise<void>;
      };
    } catch (error) {
      Logger.warn('告警管理器未初始化', { error: (error as Error).message });
    }
  }

  validate(config: StressRunConfig): ValidationResult {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      duration: Joi.number().min(1),
      concurrency: Joi.number().min(1),
      rampUp: Joi.number().min(0),
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
    // 注入 executionTimeout：必须在 validate 阶段完成，
    // 因为 TestEngineRegistry.execute() 在调用 engine.run() 之前就读取 config.executionTimeout
    const cfgAny = config as Record<string, unknown>;
    const durationSec = typeof cfgAny.duration === 'number' ? cfgAny.duration : 60;
    const rampUpSec = typeof cfgAny.rampUp === 'number' ? cfgAny.rampUp : 15;
    // 超时 = duration + rampUp + 60s 余量（结果分析 + 清理）
    cfgAny.executionTimeout = (durationSec + rampUpSec + 60) * 1000;

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: StressConfig) {
    // 展开 options：前端发送 { url, testType, options: { duration, concurrency, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as StressConfig;
    }

    // 前端字段映射：users → concurrency, customHeaders → headers
    const raw = config as unknown as Record<string, unknown>;
    if (raw.users !== undefined && raw.concurrency === undefined) {
      raw.concurrency = raw.users;
    }
    if (raw.customHeaders !== undefined && raw.headers === undefined) {
      raw.headers = raw.customHeaders;
    }

    const schema = Joi.object({
      testId: Joi.string().required(),
      url: Joi.string().uri().required(),
      duration: Joi.number().min(1).max(3600),
      concurrency: Joi.number().min(1).max(1000),
      rampUp: Joi.number().min(0).max(600),
      timeout: Joi.number().min(1000).max(120000),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as StressConfig;
  }

  async initialize(): Promise<void> {
    return;
  }

  checkAvailability() {
    return {
      engine: this.name,
      available: true,
      version: this.version,
      features: [
        'stress-testing',
        'load-generation',
        'performance-analysis',
        'concurrency-testing',
      ],
    };
  }

  async run(
    config: StressRunConfig,
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
    const abortController = new AbortController();
    this.abortControllers.set(testId, abortController);
    const initialProgress: TestProgress = {
      status: TestStatus.PREPARING,
      progress: 0,
      currentStep: '准备压力测试环境',
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
          extra: payload.stats ? { stats: payload.stats } : undefined,
        };
        this.progressTracker.set(testId, progress);
        onProgress(progress);
      };
    }

    try {
      const result = await this.executeTest({
        ...config,
        testId,
        signal: abortController.signal,
      } as StressConfig);
      const endTime = new Date();
      const stressScore = result.results?.score ?? 0;
      const stressGrade =
        stressScore >= 90
          ? 'A'
          : stressScore >= 80
            ? 'B'
            : stressScore >= 60
              ? 'C'
              : stressScore >= 40
                ? 'D'
                : 'F';
      const stressSummaryData = result.results?.summary;
      const structuredSummary = {
        score: stressScore,
        grade: stressGrade,
        passed: stressScore >= 60,
        totalRequests: stressSummaryData?.totalRequests ?? 0,
        failedRequests: stressSummaryData?.failedRequests ?? 0,
        successRate: stressSummaryData?.successRate ?? 0,
        averageResponseTime: stressSummaryData?.averageResponseTime ?? 0,
        requestsPerSecond: stressSummaryData?.requestsPerSecond ?? 0,
      };
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: stressScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || '压力测试失败')],
        warnings: result.results?.warnings || [],
        recommendations: result.analysis?.recommendations || [],
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
      const isCancelled =
        message.includes('测试已取消') ||
        message.toLowerCase().includes('aborted') ||
        message.toLowerCase().includes('cancel');
      if (isCancelled) {
        const cancelled: BaseTestResult = {
          testId,
          engineType: this.type,
          status: TestStatus.CANCELLED,
          score: 0,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          summary: '压力测试已取消',
          details: { error: message },
          errors: [],
          warnings: [],
          recommendations: [],
        };
        this.progressTracker.set(testId, {
          status: TestStatus.CANCELLED,
          progress: 100,
          currentStep: '已取消',
          startTime,
          messages: [message],
        });
        return cancelled;
      }
      const failed: BaseTestResult = {
        testId,
        engineType: this.type,
        status: TestStatus.FAILED,
        score: 0,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: '压力测试失败',
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
      this.abortControllers.delete(testId);
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

  estimateDuration(config: StressRunConfig): number {
    const duration = typeof config.duration === 'number' ? config.duration : 60;
    const rampUp = typeof config.rampUp === 'number' ? config.rampUp : 15;
    // 实际测试时间 ≈ duration + 分析/清理余量
    return Math.max(5000, (duration + rampUp) * 1000);
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

  async executeTest(config: StressConfig) {
    const validatedConfig = this.normalizeConfig(config);
    const testId = validatedConfig.testId;
    const { url } = validatedConfig;
    if (!url) {
      throw new Error('压力测试URL不能为空');
    }

    try {
      Logger.info(`🚀 开始压力测试: ${testId} - ${url}`);

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 0, '压力测试开始', 'started', { url });

      // 读取前端高级参数
      const runConfig = config as StressRunConfig;
      const userAgent =
        typeof (validatedConfig as unknown as Record<string, unknown>).userAgent === 'string'
          ? ((validatedConfig as unknown as Record<string, unknown>).userAgent as string)
          : undefined;

      const testConfig = {
        ...validatedConfig,
        duration: validatedConfig.duration ?? 60,
        concurrency: validatedConfig.concurrency ?? 50,
        rampUp: validatedConfig.rampUp ?? 15,
        userAgent,
        testType: (runConfig.stressMode || 'load') as StressConfig['testType'],
        onProgress: (progress: StressProgress) => {
          const pct = Math.min(10 + Math.round((progress.percentage || 0) * 0.8), 89);
          const msg =
            progress.message ||
            `已完成 ${progress.completed || 0} 请求${progress.failed ? `（${progress.failed} 失败）` : ''}`;
          this.updateTestProgress(testId, pct, msg, 'running', {
            stats: {
              completed: progress.completed,
              failed: progress.failed,
              avgResponseTime: progress.avgResponseTime,
            },
          });
        },
      };

      this.updateTestProgress(testId, 10, '正在生成负载...', 'running');

      const results = await this.analyzer.analyze(url, testConfig as StressConfig);

      this.updateTestProgress(testId, 90, '分析测试结果...', 'analyzing');

      const stressMode = (runConfig.stressMode || 'load') as string;
      const analysis = this._analyzeResults(results, {
        maxResponseTime: runConfig.maxResponseTimeThreshold,
        maxErrorRate: runConfig.maxErrorRateThreshold,
        minSuccessRate: runConfig.minSuccessRateThreshold,
        stressMode,
      });

      // 合并 StressAnalyzer 的深度建议（状态码/错误类型/时间线劣化等）
      const analyzerRecommendations = this.analyzer.generateRecommendations(results);
      const existingSet = new Set(analysis.recommendations);
      for (const rec of analyzerRecommendations) {
        if (!existingSet.has(rec)) {
          analysis.recommendations.push(rec);
          existingSet.add(rec);
        }
      }

      const rawIssues = analysis.issues || [];
      const warnings = rawIssues.map(item => String(item));
      const errors: string[] = [];
      const failedRequests = (results as { failedRequests?: number }).failedRequests || 0;
      if (failedRequests > 0) {
        errors.push(`存在失败请求: ${failedRequests}`);
      }

      const normalizedResult: StressNormalizedResult = {
        testId,
        status: TestStatus.COMPLETED,
        score: this.calculateScore(results, analysis, stressMode),
        summary: this.buildSummary(results, analysis),
        metrics: results.performance,
        warnings,
        errors,
        details: {
          url,
          results,
          analysis,
          stressMode: runConfig.stressMode,
          duration: testConfig.duration,
          rampUp: validatedConfig.rampUp,
          thinkTime: validatedConfig.thinkTime,
          timeout: validatedConfig.timeout,
          method: validatedConfig.method,
          concurrency: testConfig.concurrency,
        },
      };

      if (this.alertManager?.checkAlert) {
        await this._checkAlerts(testId, url, results, analysis);
      }

      const finalResult: StressFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        url,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: normalizedResult.summary,
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        analysis,
        timestamp: new Date().toISOString(),
      };

      // 先发送 100% 进度（此时 activeTests 状态仍为 RUNNING，不会被 guard 拦截）
      this.updateTestProgress(testId, 100, '压力测试完成', 'completed');

      // 再更新状态为 COMPLETED
      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results: normalizedResult,
      });

      // 不在此处调用 emitTestComplete —— 由 UserTestManager.completionCallback 统一处理
      // 避免前端收到双重完成通知

      Logger.info(`✅ 压力测试完成: ${testId}`);

      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
        },
        5 * 60 * 1000
      );

      return finalResult;
    } catch (error) {
      Logger.error(`❌ 压力测试失败: ${testId}`, error as Error);

      const errorResult: StressFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: (error as Error).message,
        status: TestStatus.FAILED,
        score: 0,
        summary: null,
        warnings: [],
        errors: [(error as Error).message],
        timestamp: new Date().toISOString(),
      };

      const isCancelled =
        (error as Error).message.includes('测试已取消') ||
        (error as Error).message.toLowerCase().includes('aborted') ||
        (error as Error).message.toLowerCase().includes('cancel');

      this.activeTests.set(testId, {
        status: isCancelled ? TestStatus.CANCELLED : TestStatus.FAILED,
        error: (error as Error).message,
      });

      // 不在此处调用 emitTestError —— 由 UserTestManager.errorCallback 统一处理

      if (!isCancelled && this.alertManager?.checkAlert) {
        try {
          await this.alertManager.checkAlert('TEST_FAILURE', {
            testId,
            testType: 'stress',
            url,
            error: (error as Error).message,
          });
        } catch (alertError) {
          Logger.warn('发送测试失败告警时出错', { testId, alertError });
        }
      }

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

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: StressProgressExtra = {}
  ) {
    // 如果测试已取消/完成/失败，不再发送进度事件
    const controller = this.abortControllers.get(testId);
    if (controller?.signal.aborted) return;
    const existing = this.activeTests.get(testId);
    if (
      existing?.status === TestStatus.CANCELLED ||
      existing?.status === TestStatus.COMPLETED ||
      existing?.status === TestStatus.FAILED
    )
      return;

    const test = existing || { status: TestStatus.RUNNING };
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
      messages: current?.messages ? [...current.messages, message].slice(-20) : [message],
    });
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      const controller = this.abortControllers.get(testId);
      if (controller && !controller.signal.aborted) {
        controller.abort();
      }
      this.activeTests.set(testId, {
        ...test,
        status: TestStatus.CANCELLED,
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: StressProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: StressFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  _analyzeResults(
    results: StressResult,
    thresholds: {
      maxResponseTime?: number;
      maxErrorRate?: number;
      minSuccessRate?: number;
      stressMode?: string;
    } = {}
  ): StressAnalysis {
    const analysis: StressAnalysis = {
      performance: 'good',
      issues: [],
      recommendations: [],
    };

    const mode = thresholds.stressMode || 'load';
    const avgResponseTime = results.averageResponseTime || 0;
    const failedRequests = results.failedRequests || 0;
    const totalRequests = results.totalRequests || 0;
    const successRate =
      totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 100;

    // 不同模式的默认阈值
    const modeDefaults: Record<string, { maxRt: number; maxErr: number; minSucc: number }> = {
      load: { maxRt: 3000, maxErr: 5, minSucc: 95 },
      stress: { maxRt: 5000, maxErr: 10, minSucc: 85 },
      spike: { maxRt: 8000, maxErr: 15, minSucc: 80 },
      volume: { maxRt: 4000, maxErr: 5, minSucc: 95 },
    };
    const defaults = modeDefaults[mode] || modeDefaults.load;

    // 用户自定义阈值优先，回退到模式默认值
    const maxRtThreshold = thresholds.maxResponseTime ?? defaults.maxRt;
    const maxErrThreshold = thresholds.maxErrorRate ?? defaults.maxErr;
    const minSuccThreshold = thresholds.minSuccessRate ?? defaults.minSucc;

    // 响应时间分析
    if (avgResponseTime > maxRtThreshold) {
      analysis.performance = 'poor';
      analysis.issues.push(
        `平均响应时间 ${Math.round(avgResponseTime)}ms 超过阈值 ${maxRtThreshold}ms`
      );
      analysis.recommendations.push(
        mode === 'spike'
          ? '峰值测试下响应时间超标，建议检查服务器突发流量处理能力（连接池、队列、限流策略）'
          : '考虑优化服务器性能或增加服务器资源'
      );
    } else if (avgResponseTime > maxRtThreshold * 0.6) {
      analysis.performance = analysis.performance === 'poor' ? 'poor' : 'fair';
      analysis.issues.push(
        `平均响应时间 ${Math.round(avgResponseTime)}ms 接近阈值 ${maxRtThreshold}ms`
      );
      analysis.recommendations.push('建议检查数据库查询和外部API调用');
    }

    // 错误率分析
    if (errorRate > maxErrThreshold) {
      analysis.performance = 'poor';
      analysis.issues.push(`错误率 ${errorRate.toFixed(2)}% 超过阈值 ${maxErrThreshold}%`);
      analysis.recommendations.push(
        mode === 'stress'
          ? '压力测试下错误率超标，已接近系统极限，建议记录此并发数作为最大承载参考'
          : '检查错误日志，修复导致失败的问题'
      );
    }

    // 成功率分析
    if (successRate < minSuccThreshold) {
      analysis.performance = 'poor';
      analysis.issues.push(`成功率 ${successRate.toFixed(2)}% 低于阈值 ${minSuccThreshold}%`);
      analysis.recommendations.push('检查服务器稳定性和资源是否充足');
    }

    // P99 延迟分析（spike 模式放宽阈值）
    const p99Threshold = mode === 'spike' ? maxRtThreshold * 3 : maxRtThreshold * 2;
    if (results.performance.latency.p99 > p99Threshold) {
      analysis.issues.push(`P99 延迟 ${Math.round(results.performance.latency.p99)}ms 过高`);
      analysis.recommendations.push('建议减少并发数或优化慢请求路径');
    }

    // P99/P50 比值分析
    const { p50, p99 } = results.performance.latency;
    if (p50 > 0 && p99 / p50 > 5) {
      analysis.issues.push(`P99/P50 延迟比值 ${(p99 / p50).toFixed(1)}x，响应时间波动剧烈`);
      analysis.recommendations.push('存在长尾请求，建议排查慢路径或不稳定因素');
    }

    // 吞吐量分析
    const requestsPerSecond = results.requestsPerSecond || 0;
    if (requestsPerSecond < 1 && totalRequests > 0) {
      analysis.issues.push(`吞吐量仅 ${requestsPerSecond.toFixed(2)} RPS，极低`);
      analysis.recommendations.push('考虑使用缓存或优化代码逻辑');
    }

    // 容量测试专属：时间线劣化检测
    if (mode === 'volume' && results.timeline.length >= 10) {
      const n = results.timeline.length;
      const firstThird = results.timeline.slice(0, Math.floor(n / 3));
      const lastThird = results.timeline.slice(Math.floor((n * 2) / 3));
      const avg = (arr: typeof results.timeline) =>
        arr.reduce((s, t) => s + t.responseTime, 0) / Math.max(1, arr.length);
      const firstAvg = avg(firstThird);
      const lastAvg = avg(lastThird);
      if (firstAvg > 0 && lastAvg / firstAvg >= 2) {
        analysis.performance = 'poor';
        analysis.issues.push('响应时间随测试进行显著劣化（可能存在内存泄漏或资源耗尽）');
        analysis.recommendations.push('建议检查内存使用、连接池状态和 GC 日志');
      }
    }

    return analysis;
  }

  /**
   * 多维度加权评分，感知测试模式
   * - 成功率 (40%) — 核心指标，所有模式通用
   * - 响应时间 (25%) — 不同模式有不同的合理阈值
   * - 吞吐量 (15%) — 衡量系统处理能力
   * - 稳定性 (20%) — P99/P50 比值 + 时间线劣化
   */
  private calculateScore(results: StressResult, _analysis: StressAnalysis, stressMode?: string) {
    const total = results.totalRequests || 1;
    const failed = results.failedRequests || 0;
    const successRate = (total - failed) / total;
    const avgRt = results.averageResponseTime || 0;
    const { p50, p99 } = results.performance.latency;
    const rps = results.requestsPerSecond || 0;

    // 不同模式的响应时间合理阈值（ms）
    const rtThresholds: Record<string, { good: number; fair: number }> = {
      load: { good: 1000, fair: 3000 },
      stress: { good: 2000, fair: 5000 },
      spike: { good: 3000, fair: 8000 },
      volume: { good: 1500, fair: 4000 },
    };
    const mode = stressMode || 'load';
    const { good: rtGood, fair: rtFair } = rtThresholds[mode] || rtThresholds.load;

    // 1. 成功率评分 (40分)
    const successScore = successRate * 40;

    // 2. 响应时间评分 (25分) — 渐变扣分
    let rtScore: number;
    if (avgRt <= rtGood) {
      rtScore = 25;
    } else if (avgRt <= rtFair) {
      rtScore = 25 * (1 - ((avgRt - rtGood) / (rtFair - rtGood)) * 0.6);
    } else {
      rtScore = Math.max(0, 25 * 0.4 * (1 - Math.min(1, (avgRt - rtFair) / rtFair)));
    }

    // 3. 吞吐量评分 (15分) — 基于 RPS
    const rpsThresholds: Record<string, { good: number; fair: number }> = {
      load: { good: 50, fair: 10 },
      stress: { good: 30, fair: 5 },
      spike: { good: 20, fair: 3 },
      volume: { good: 20, fair: 5 },
    };
    const { good: rpsGood, fair: rpsFair } = rpsThresholds[mode] || rpsThresholds.load;
    let rpsScore: number;
    if (rps >= rpsGood) {
      rpsScore = 15;
    } else if (rps >= rpsFair) {
      rpsScore = 15 * ((rps - rpsFair) / (rpsGood - rpsFair));
    } else {
      rpsScore = Math.max(0, 15 * 0.3 * (rps / Math.max(1, rpsFair)));
    }

    // 4. 稳定性评分 (20分) — P99/P50 比值 + 时间线劣化
    let stabilityScore = 20;
    // P99/P50 比值惩罚（比值越大越不稳定）
    if (p50 > 0) {
      const ratio = p99 / p50;
      if (ratio > 10) {
        stabilityScore -= 12;
      } else if (ratio > 5) {
        stabilityScore -= 8;
      } else if (ratio > 3) {
        stabilityScore -= 4;
      }
    }
    // 时间线劣化惩罚
    if (results.timeline.length >= 10) {
      const n = results.timeline.length;
      const firstThird = results.timeline.slice(0, Math.floor(n / 3));
      const lastThird = results.timeline.slice(Math.floor((n * 2) / 3));
      const avg = (arr: typeof results.timeline) =>
        arr.reduce((s, t) => s + t.responseTime, 0) / Math.max(1, arr.length);
      const firstAvg = avg(firstThird);
      const lastAvg = avg(lastThird);
      if (firstAvg > 0 && lastAvg / firstAvg >= 2) {
        stabilityScore -= 6;
      } else if (firstAvg > 0 && lastAvg / firstAvg >= 1.5) {
        stabilityScore -= 3;
      }
    }
    stabilityScore = Math.max(0, stabilityScore);

    const finalScore = Math.round(successScore + rtScore + rpsScore + stabilityScore);
    return Math.max(0, Math.min(100, finalScore));
  }

  private buildSummary(results: StressResult, analysis: StressAnalysis): StressSummary {
    const total = results.totalRequests || 0;
    const failed = results.failedRequests || 0;
    const avgResponseTime = results.averageResponseTime || 0;
    const requestsPerSecond = results.requestsPerSecond || 0;
    const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 0;

    const round2 = (v: number) => Math.round(v * 100) / 100;
    return {
      totalRequests: total,
      failedRequests: failed,
      successRate,
      averageResponseTime: round2(avgResponseTime),
      minResponseTime: round2(results.minResponseTime || 0),
      maxResponseTime: round2(results.maxResponseTime || 0),
      requestsPerSecond: round2(requestsPerSecond),
      throughput: round2(results.performance?.throughput || 0),
      latency: results.performance?.latency || { p50: 0, p90: 0, p95: 0, p99: 0 },
      performance: analysis.performance || 'good',
    };
  }

  async _checkAlerts(testId: string, url: string, results: StressResult, analysis: StressAnalysis) {
    await this.alertManager?.checkAlert?.('STRESS_TEST_ALERT', {
      testId,
      testType: 'stress',
      url,
      results,
      analysis,
    });
  }

  async cleanup() {
    // 中止所有进行中的测试
    for (const [testId, controller] of this.abortControllers) {
      if (!controller.signal.aborted) {
        controller.abort();
      }
      Logger.info(`清理压力测试: ${testId}`);
    }
    this.abortControllers.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    Logger.info('✅ 压力测试引擎清理完成');
  }
}

export default StressTestEngine;
