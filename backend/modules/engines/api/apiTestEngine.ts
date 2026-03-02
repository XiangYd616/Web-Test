import http, { type RequestOptions } from 'http';
import https from 'https';
import Joi from 'joi';
import { performance } from 'perf_hooks';
import { URL } from 'url';
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
import { getAlertManager } from '../../alert/services/AlertManager';
import { insertExecutionLog } from '../../testing/services/testLogService';
import Logger from '../../utils/logger';
// 进度/完成/错误事件统一由 UserTestManager 回调 -> sendToUser 推送，不再直接走房间广播
import { diagnoseNetworkError } from '../shared/utils/networkDiagnostics';
import { AssertionSystem } from './AssertionSystem';

type HeaderValue = string | number;
type HeaderMap = Record<string, HeaderValue>;
type ApiVariables = Record<string, string>;
type AssertionInput = { type?: string; [key: string]: unknown };

type ApiProgressPayload = {
  testId?: string;
  progress: number;
  message: string;
  status?: string;
};

type ApiProgressExtra = {
  url?: string;
};

type ApiAlertPayload = {
  testId: string;
  url?: string;
  testType?: 'api';
  error?: string;
  value?: number;
  threshold?: number;
  statusCode?: number;
  message?: string;
  failedAssertions?: number;
  totalAssertions?: number;
};

type ApiTestOptions = {
  timeout?: number | string;
  maxRedirects?: number;
  userAgent?: string;
  [key: string]: unknown;
};

type RequestConfigFromUI = {
  method?: string;
  contentType?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'apikey';
  authToken?: string;
  headers?: Array<{ key: string; value: string; enabled?: boolean }>;
  queryParams?: Array<{ key: string; value: string; enabled?: boolean }>;
  body?: string;
  bodyType?: 'none' | 'json' | 'form' | 'text' | 'xml' | 'formdata';
  formData?: Array<{ key: string; value: string; type?: 'text' | 'file' }>;
};

type ApiRunConfig = BaseTestConfig & {
  testId?: string;
  url?: string;
  method?: string;
  headers?: HeaderMap;
  body?: unknown;
  endpoints?: ApiEndpointConfig[];
  assertions?: AssertionInput[];
  variables?: ApiVariables;
  request?: RequestConfigFromUI;
  followRedirects?: boolean;
  userAgent?: string;
};

type ApiTestConfig = ApiRunConfig & {
  testId: string;
};

type ApiEndpointConfig = {
  name?: string;
  url: string;
  method?: string;
  headers?: HeaderMap;
  body?: unknown;
  assertions?: AssertionInput[];
  variables?: ApiVariables;
};

type ApiEndpointSummary = {
  success: boolean;
  statusCode?: number;
  error?: string;
  responseTime: string;
  contentType?: string;
  contentLength?: number;
};

type ApiAssertionResult = {
  passed: boolean;
  message?: string;
  details?: unknown;
};

type ApiAssertionSummary = {
  passed: boolean;
  total: number;
  passedCount?: number;
  failedCount?: number;
  results: ApiAssertionResult[];
};

type ApiEndpointResult = Partial<ApiAnalysis> & {
  url: string;
  method?: string;
  timestamp: string;
  responseTime: number;
  error?: string;
  success?: boolean;
  validations?: ApiAssertionSummary;
  extractions?: ApiVariables;
  summary: ApiEndpointSummary;
  recommendations?: string[];
  responseBody?: string;
  responseHeaders?: Record<string, string | undefined>;
};

type ApiBatchSummary = {
  total: number;
  successful: number;
  failed: number;
  successRate: string;
  averageResponseTime: string;
  statusCodes: Record<string, number>;
};

type ApiBatchResult = {
  totalEndpoints: number;
  totalTime: string;
  timestamp: string;
  summary: ApiBatchSummary;
  results: ApiEndpointResult[];
  chainVariables?: ApiVariables;
  recommendations: string[];
};

type ApiFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: ApiEndpointResult | ApiBatchResult;
  timestamp: string;
  error?: string;
  status?: TestStatus;
  score?: number;
  summary?: ApiBatchSummary | ApiEndpointSummary | null;
  warnings?: string[];
  errors?: string[];
};

type ApiActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  message?: string;
  error?: string;
  lastUpdate?: number;
  results?: ApiFinalResult;
};

type ApiResponse = {
  statusCode?: number;
  statusMessage?: string;
  headers: Record<string, string | undefined>;
  body: string;
};

type AssertionSchema = Parameters<AssertionSystem['jsonSchema']>[0];
type StatusRule = Parameters<AssertionSystem['status']>[0];
type ResponseTimeRule = Parameters<AssertionSystem['responseTime']>[0];
type ErrorRule = Parameters<AssertionSystem['error']>[0];
type BodyRegexRule = Parameters<AssertionSystem['bodyRegex']>[0];

type ApiAnalysis = {
  status: {
    code: number | undefined;
    message: string | undefined;
    category: string;
  };
  headers: {
    contentType: string;
    contentLength: number;
    server: string;
    caching: {
      cacheControl?: string;
      expires?: string;
      etag?: string;
    };
    security: {
      hasHttps: boolean;
      hasCORS: boolean;
      corsDetails: {
        allowOrigin: string | null;
        allowMethods: string | null;
        allowHeaders: string | null;
        allowCredentials: boolean;
        isWildcard: boolean;
      } | null;
      hasSecurityHeaders: Record<string, boolean>;
      securityHeaderScore: { present: number; total: number };
    };
    compression?: string;
    rateLimiting: {
      limit: string | null;
      remaining: string | null;
      reset: string | null;
      retryAfter: string | null;
    } | null;
    apiVersion: string | null;
  };
  body: {
    size: number;
    type: string;
    valid: boolean;
    structure: ApiBodyStructure | null;
    error?: string;
  };
  performance: {
    responseTime: number;
    category: string;
  };
};

type ApiBodyStructure =
  | {
      type: 'array';
      length: number;
      itemTypes: string[];
      itemTypeDistribution?: Record<string, number>;
      sampleItem?: ApiBodyStructure | null;
    }
  | {
      type: 'object';
      keys: string[];
      keyCount: number;
      depth?: number;
      valueTypes?: Record<string, number>;
    }
  | { type: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'unknown'; value: unknown };

class ApiTestEngine implements ITestEngine<ApiRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  options: ApiTestOptions;
  alertManager: {
    checkAlert?: (type: string, payload: ApiAlertPayload) => Promise<void>;
  } | null;
  activeTests: Map<string, ApiActiveTestRecord>;
  progressCallback: ((progress: ApiProgressPayload) => void) | null;
  lifecycle?: ITestEngine<ApiRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private cancelledTests: Set<string>;
  assertionSystem: InstanceType<typeof AssertionSystem>;
  completionCallback: ((results: ApiFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor(options: ApiTestOptions = {}) {
    this.type = TestEngineType.API;
    this.name = 'api';
    this.version = '3.0.0';
    this.description = 'API测试引擎';
    this.cancelledTests = new Set();
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: ['rest-api-testing', 'assertions', 'response-analysis', 'batch-testing'],
      requiredConfig: ['url'],
      optionalConfig: ['method', 'headers', 'body', 'endpoints', 'assertions', 'variables'],
      outputFormat: ['summary', 'metrics', 'warnings', 'errors', 'details'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 2000,
        max: 60000,
        typical: 10000,
      },
    };
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      maxRedirects: 5,
      userAgent: 'Api-Test/3.0.0',
      ...options,
    };
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.progressTracker = new Map();

    this.assertionSystem = new AssertionSystem();

    this.alertManager = null;
    try {
      this.alertManager = getAlertManager() as {
        checkAlert?: (type: string, payload: ApiAlertPayload) => Promise<void>;
      };
    } catch (error) {
      Logger.warn('告警管理器未初始化', { error: (error as Error).message });
    }
  }

  validate(config: ApiRunConfig): ValidationResult {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      method: Joi.string().default('GET'),
      headers: Joi.object(),
      body: Joi.any(),
      endpoints: Joi.array(),
      assertions: Joi.array(),
      variables: Joi.object(),
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
    const endpointCount = Array.isArray(cfgAny.endpoints)
      ? (cfgAny.endpoints as unknown[]).length
      : 1;
    cfgAny.executionTimeout = Math.max(30000, endpointCount * 15000);

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: ApiTestConfig) {
    // 展开 options：前端发送 { url, testType, options: { method, headers, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as ApiTestConfig;
    }

    const schema = Joi.object({
      testId: Joi.string().required(),
      url: Joi.string().uri().allow('').optional(),
      method: Joi.string().default('GET'),
      headers: Joi.object(),
      body: Joi.any(),
      endpoints: Joi.array(),
      assertions: Joi.array(),
      variables: Joi.object(),
    })
      .unknown(true)
      .custom(value => {
        if (!value.url && (!value.endpoints || value.endpoints.length === 0)) {
          throw new Error('必须提供 URL 或端点列表');
        }
        return value;
      });

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as ApiTestConfig;
  }

  async initialize(): Promise<void> {
    return;
  }

  async run(
    config: ApiRunConfig,
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
      currentStep: '准备API测试环境',
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
      } as ApiTestConfig);
      const endTime = new Date();
      // ── 构建结构化 summary ──
      const score = result.score ?? 0;
      const grade =
        score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
      const batchSummary =
        result.results && 'summary' in result.results
          ? (result.results as ApiBatchResult).summary
          : null;
      const batchResults =
        result.results && 'results' in result.results
          ? (result.results as ApiBatchResult).results
          : [];
      const totalEndpoints = batchSummary?.total ?? batchResults.length;
      const successfulEndpoints = batchSummary?.successful ?? 0;
      const failedEndpoints = batchSummary?.failed ?? totalEndpoints;
      const allPassed = failedEndpoints === 0;

      // 聚合所有端点的断言统计
      let totalAssertions = 0;
      let failedAssertions = 0;
      for (const ep of batchResults) {
        if (ep.validations) {
          totalAssertions += ep.validations.total || 0;
          failedAssertions += ep.validations.failedCount || 0;
        }
      }

      // 收集失败端点的错误摘要
      const failedEndpointSummaries = batchResults
        .filter(ep => !ep.summary?.success)
        .map(ep => ({
          url: ep.url,
          method: ep.method || 'GET',
          statusCode: ep.summary?.statusCode ?? 0,
          error: ep.error || (ep.summary?.error as string) || '断言失败',
          responseTime: ep.responseTime,
        }));

      // 聚合所有端点的建议（去重）
      const allRecommendations: string[] = [];
      const batchRecs =
        result.results && 'recommendations' in result.results
          ? (result.results as ApiBatchResult).recommendations || []
          : [];
      for (const rec of batchRecs) {
        if (!allRecommendations.includes(rec)) allRecommendations.push(rec);
      }
      for (const ep of batchResults) {
        if (ep.recommendations) {
          for (const rec of ep.recommendations) {
            if (!allRecommendations.includes(rec)) allRecommendations.push(rec);
          }
        }
      }
      // API 测试专属建议
      if (totalAssertions === 0) {
        allRecommendations.unshift(
          '未配置任何断言规则 — 建议添加状态码、响应体结构等断言以验证接口正确性'
        );
      }
      if (failedAssertions > 0) {
        allRecommendations.unshift(
          `${failedAssertions}/${totalAssertions} 个断言失败 — 请检查接口返回值是否符合预期`
        );
      }
      for (const ep of failedEndpointSummaries) {
        const sc = ep.statusCode;
        if (sc === 401 || sc === 403) {
          const tip = `${ep.method} ${ep.url} 返回 ${sc} — 请检查认证配置（Token/API Key 是否正确）`;
          if (!allRecommendations.includes(tip)) allRecommendations.unshift(tip);
        } else if (sc === 404) {
          const tip = `${ep.method} ${ep.url} 返回 404 — 请检查 URL 路径是否正确`;
          if (!allRecommendations.includes(tip)) allRecommendations.unshift(tip);
        } else if (sc === 0 && ep.error) {
          const tip = diagnoseNetworkError(ep.error, 'API 请求', ep.url);
          if (!allRecommendations.includes(tip)) allRecommendations.unshift(tip);
        }
      }

      const structuredSummary = {
        score,
        grade,
        passed: allPassed,
        total: totalEndpoints,
        successful: successfulEndpoints,
        failed: failedEndpoints,
        successRate: batchSummary?.successRate ?? '0%',
        averageResponseTime: batchSummary?.averageResponseTime ?? '0ms',
        totalAssertions,
        failedAssertions,
        statusCodes: batchSummary?.statusCodes ?? {},
        failedEndpoints: failedEndpointSummaries.slice(0, 10),
      };

      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || 'API测试失败')],
        warnings: result.warnings || [],
        recommendations: allRecommendations,
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
        summary: 'API测试失败',
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

  estimateDuration(config: ApiRunConfig): number {
    const endpoints = config.endpoints?.length ?? 1;
    const assertions = config.assertions?.length ?? 0;
    return Math.max(2000, endpoints * 1500 + assertions * 200);
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

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: ['api-testing', 'endpoint-analysis', 'performance-testing'],
    };
  }

  /**
   * 将前端 RequestConfigPanel 传来的 request 对象桥接到引擎顶层字段
   */
  private bridgeRequestConfig(config: ApiTestConfig): ApiTestConfig {
    const req = (config as { request?: RequestConfigFromUI }).request;
    if (!req) return config;

    const bridged = { ...config };

    // method: 前端配置面板 > 顶层 > 默认 GET
    if (req.method && !config.method) {
      bridged.method = req.method;
    }

    // headers: 合并前端配置面板的 headers 到顶层（跳过 enabled=false）
    if (Array.isArray(req.headers) && req.headers.length > 0) {
      const uiHeaders: HeaderMap = {};
      for (const h of req.headers) {
        if (h.enabled === false) continue;
        if (h.key?.trim()) {
          uiHeaders[h.key.trim()] = h.value || '';
        }
      }
      // Content-Type 从 contentType 字段获取
      if (req.contentType) {
        uiHeaders['Content-Type'] = req.contentType;
      }
      bridged.headers = { ...uiHeaders, ...(config.headers || {}) };
    }

    // auth: 根据 authType 注入 Authorization 头
    if (req.authType && req.authType !== 'none' && req.authToken) {
      const authHeaders: HeaderMap = {};
      if (req.authType === 'bearer') {
        authHeaders['Authorization'] = `Bearer ${req.authToken}`;
      } else if (req.authType === 'basic') {
        const encoded = Buffer.from(req.authToken).toString('base64');
        authHeaders['Authorization'] = `Basic ${encoded}`;
      } else if (req.authType === 'apikey') {
        const [keyName, ...rest] = req.authToken.split('=');
        const keyValue = rest.join('=');
        if (keyName && keyValue) {
          authHeaders[keyName] = keyValue;
        }
      }
      bridged.headers = { ...authHeaders, ...(bridged.headers || {}) };
    }

    // queryParams: 追加到 URL（跳过 enabled=false）
    if (Array.isArray(req.queryParams) && req.queryParams.length > 0) {
      try {
        const urlObj = new URL(bridged.url || '');
        for (const p of req.queryParams) {
          if ((p as { enabled?: boolean }).enabled === false) continue;
          if (p.key?.trim()) {
            urlObj.searchParams.append(p.key.trim(), p.value || '');
          }
        }
        bridged.url = urlObj.toString();
      } catch {
        // URL 解析失败时忽略 queryParams
      }
    }

    // body: 前端配置面板 > 顶层
    if (req.bodyType && req.bodyType !== 'none' && !config.body) {
      if (req.bodyType === 'formdata' && Array.isArray(req.formData)) {
        // multipart/form-data：构建 boundary 和 body Buffer
        const boundary = `----FormBoundary${Date.now().toString(36)}`;
        const parts: string[] = [];
        for (const field of req.formData) {
          if (!field.key?.trim()) continue;
          parts.push(`--${boundary}`);
          parts.push(`Content-Disposition: form-data; name="${field.key.trim()}"`);
          parts.push('');
          parts.push(field.value || '');
        }
        if (parts.length > 0) {
          parts.push(`--${boundary}--`);
          bridged.body = parts.join('\r\n');
          bridged.headers = {
            ...(bridged.headers || {}),
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          };
        }
      } else if (req.body) {
        bridged.body = req.body;
        // 根据 bodyType 设置 Content-Type（如果尚未设置）
        if (!bridged.headers?.['Content-Type']) {
          const contentTypeMap: Record<string, string> = {
            json: 'application/json',
            form: 'application/x-www-form-urlencoded',
            text: 'text/plain',
            xml: 'application/xml',
          };
          if (contentTypeMap[req.bodyType]) {
            bridged.headers = {
              ...(bridged.headers || {}),
              'Content-Type': contentTypeMap[req.bodyType],
            };
          }
        }
      }
    }

    // userAgent: 高级设置中的 userAgent
    if ((config as { userAgent?: string }).userAgent) {
      this.options.userAgent = (config as { userAgent?: string }).userAgent;
    }

    return bridged;
  }

  async executeTest(config: ApiTestConfig) {
    const bridgedConfig = this.bridgeRequestConfig(config);
    const validatedConfig = this.normalizeConfig(bridgedConfig);
    const testId = validatedConfig.testId;

    // 使用局部变量覆盖选项，避免并发测试互相影响（不再修改共享 this.options）
    const cfgAny = validatedConfig as unknown as Record<string, unknown>;
    const localOptions: ApiTestOptions = { ...this.options };
    // 确保 timeout 始终为数字
    const rawTimeout = cfgAny.timeout ?? localOptions.timeout;
    localOptions.timeout =
      typeof rawTimeout === 'number' && rawTimeout > 0
        ? rawTimeout
        : typeof rawTimeout === 'string'
          ? parseInt(rawTimeout, 10) || 30000
          : 30000;
    if (typeof cfgAny.followRedirects === 'boolean') {
      localOptions.maxRedirects = cfgAny.followRedirects ? 5 : 0;
    }
    if (typeof cfgAny.userAgent === 'string' && (cfgAny.userAgent as string).length > 0) {
      localOptions.userAgent = cfgAny.userAgent;
    }

    try {
      const {
        url,
        method = 'GET',
        headers = {},
        body = null,
        endpoints = [],
        assertions = [],
        variables = {},
      } = validatedConfig;

      Logger.info(`🚀 开始API测试: ${testId} - ${url || '多个端点'}`);

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 0, `API测试开始: ${url || '多个端点'}`, 'started', { url });
      void insertExecutionLog(
        testId,
        'info',
        `API 测试开始: ${method} ${url || `${endpoints.length} 个端点`}`,
        { url, method }
      );

      let batchResult: ApiBatchResult;

      if (endpoints && endpoints.length > 0) {
        batchResult = await this.testMultipleEndpoints(endpoints, testId, variables, localOptions);
      } else if (url) {
        const startTime = performance.now();
        const singleResult = await this.testSingleEndpoint({
          url,
          method,
          headers,
          body,
          assertions,
          testId,
          variables,
          localOptions,
        });
        const totalTime = Math.round(performance.now() - startTime);
        // 将单端点结果包装为与批量测试一致的 ApiBatchResult 结构
        // 使前端 ApiChartPanel 可以统一读取 results 数组和 summary
        const singleResults = [singleResult];
        batchResult = {
          totalEndpoints: 1,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString(),
          summary: this.calculateSummary(singleResults),
          results: singleResults,
          chainVariables: variables,
          recommendations: singleResult.recommendations || [],
        };
      } else {
        throw new Error('必须提供URL或端点列表');
      }

      const score = this.calculateTestScore(batchResult);
      const finalResult: ApiFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results: batchResult,
        timestamp: new Date().toISOString(),
        status: TestStatus.COMPLETED,
        score,
        summary: batchResult.summary,
        warnings: [],
        errors: [],
      };

      // 先发送 100% 进度（此时 activeTests 状态仍为 RUNNING，不会被 guard 拦截）
      this.updateTestProgress(testId, 100, 'API测试完成', 'completed');
      void insertExecutionLog(
        testId,
        'info',
        `API 测试完成 · 得分 ${score} · 端点 ${batchResult.totalEndpoints} · 总耗时 ${batchResult.totalTime}`,
        {
          score,
          totalEndpoints: batchResult.totalEndpoints,
        }
      );

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results: finalResult,
      });

      // 不在此处调用 emitTestComplete —— 由 UserTestManager.completionCallback 统一处理

      Logger.info(`✅ API测试完成: ${testId}`);

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
      Logger.error(`❌ API测试失败: ${testId}`, error as Error);

      const errorResult: ApiFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        status: TestStatus.FAILED,
        score: 0,
        summary: null,
        warnings: [],
        errors: [(error as Error).message],
      };

      this.activeTests.set(testId, {
        status: TestStatus.FAILED,
        error: (error as Error).message,
      });
      // 不在此处调用 emitTestError —— 由 UserTestManager.errorCallback 统一处理

      if (this.alertManager?.checkAlert) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'api',
          error: (error as Error).message,
        });
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

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: ApiProgressExtra = {}
  ) {
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

  setProgressCallback(callback: (progress: ApiProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: ApiFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  async testSingleEndpoint({
    url,
    method = 'GET',
    headers = {},
    body = null,
    assertions = [],
    testId = null,
    variables = {},
    cookieJar = null,
    localOptions,
  }: {
    url: string;
    method?: string;
    headers?: HeaderMap;
    body?: unknown;
    assertions?: AssertionInput[];
    testId?: string | null;
    variables?: ApiVariables;
    cookieJar?: Map<string, string> | null;
    localOptions?: ApiTestOptions;
  }) {
    const opts = localOptions || this.options;
    const startTime = performance.now();

    const resolvedUrl = String(this.resolveTemplate(url, variables));
    const resolvedHeaders = this.resolveTemplate(headers, variables) as HeaderMap;
    const resolvedBody = this.resolveTemplate(body, variables);

    if (testId) {
      this.updateTestProgress(testId, 30, `测试: ${method} ${resolvedUrl}`, 'running');
    }

    try {
      const urlObj = new URL(resolvedUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      // 从 cookieJar 注入 Cookie 头
      const cookieHeader: HeaderMap = {};
      if (cookieJar && cookieJar.size > 0) {
        cookieHeader['Cookie'] = Array.from(cookieJar.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      }
      const requestHeaders: RequestOptions['headers'] = {
        'User-Agent': opts.userAgent,
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        ...cookieHeader,
        ...resolvedHeaders,
      };
      const timeoutNum =
        typeof opts.timeout === 'number'
          ? opts.timeout
          : typeof opts.timeout === 'string'
            ? parseInt(opts.timeout, 10) || 30000
            : 30000;
      const requestOptions: RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: requestHeaders,
        timeout: timeoutNum,
        ...(isHttps ? { agent: new https.Agent({ rejectUnauthorized: false }) } : {}),
      };

      if (resolvedBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyStr =
          typeof resolvedBody === 'string' ? resolvedBody : JSON.stringify(resolvedBody);
        if (requestHeaders) {
          requestHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
          if (!requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
          }
        }
      }

      const response = await this.makeRequest(client, requestOptions, resolvedBody);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // 从 set-cookie 响应头提取 Cookie 到 cookieJar
      if (cookieJar) {
        const setCookieRaw = response.headers['set-cookie'];
        if (setCookieRaw) {
          const cookies =
            typeof setCookieRaw === 'string'
              ? [setCookieRaw]
              : (setCookieRaw as unknown as string[]);
          for (const cookie of cookies) {
            const pair = cookie.split(';')[0]?.trim();
            if (pair) {
              const eqIdx = pair.indexOf('=');
              if (eqIdx > 0) {
                cookieJar.set(pair.slice(0, eqIdx), pair.slice(eqIdx + 1));
              }
            }
          }
        }
      }

      const analysis = this.analyzeResponse(response, responseTime);

      if (testId) {
        this.updateTestProgress(testId, 70, '验证响应结果...', 'validating');
      }

      const validationResults = this._runAssertions(response, responseTime, assertions, variables);
      const extractions = this.extractVariables(response, variables, assertions);

      if (this.alertManager && testId) {
        await this._checkAlerts(testId, url, response, responseTime, validationResults);
      }

      const statusCode = Number(response.statusCode || 0);
      const bodyText = response.body || '';
      // 响应体截断到 10KB，防止结果过大
      const maxBodySize = 10 * 1024;
      const truncatedBody =
        bodyText.length > maxBodySize
          ? bodyText.slice(0, maxBodySize) + `\n... [truncated, total ${bodyText.length} bytes]`
          : bodyText;
      return {
        url: resolvedUrl,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        extractions,
        validations: validationResults,
        ...analysis,
        responseBody: truncatedBody,
        responseHeaders: response.headers,
        summary: {
          success:
            statusCode >= 200 &&
            statusCode < 400 &&
            (validationResults.total === 0 || validationResults.passed),
          statusCode,
          responseTime: `${responseTime}ms`,
          contentType: response.headers['content-type'] || 'unknown',
          contentLength: parseInt(response.headers['content-length'] || '0', 10) || bodyText.length,
        },
        recommendations: this.generateRecommendations(analysis, responseTime),
      } as ApiEndpointResult;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      const errorMessage = (error as Error).message;
      const validationResults = this._runAssertions(
        {
          headers: {},
          body: '',
          statusCode: 0,
        },
        responseTime,
        assertions,
        variables,
        errorMessage
      );

      return {
        url,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        error: errorMessage,
        success: false,
        validations: validationResults,
        responseBody: '',
        responseHeaders: {},
        summary: {
          success: false,
          error: errorMessage,
          responseTime: `${responseTime}ms`,
        },
        recommendations: [diagnoseNetworkError(errorMessage, 'API 请求', url)],
      } as ApiEndpointResult;
    }
  }

  _runAssertions(
    response: ApiResponse,
    responseTime: number,
    assertions: AssertionInput[],
    variables: ApiVariables = {},
    errorMessage: string | undefined = undefined
  ): ApiAssertionSummary {
    if (!assertions || assertions.length === 0) {
      return {
        passed: true,
        total: 0,
        results: [],
      };
    }

    const assertionResults: ApiAssertionResult[] = [];
    let passedCount = 0;
    let actualAssertionCount = 0;
    const contentType = response.headers['content-type'] || '';
    const jsonBody = contentType.includes('application/json')
      ? this.safeParseJson(response.body)
      : null;

    for (const assertion of assertions) {
      try {
        let assertResult;
        const resolved = this.resolveAssertion(assertion, variables);

        if (resolved.type === 'extract') {
          continue;
        }
        actualAssertionCount++;

        const result = {
          status: response.statusCode,
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          jsonBody,
          responseTime,
          error: errorMessage ?? undefined,
        };

        switch (resolved.type) {
          case 'allOf': {
            const group = Array.isArray(resolved.assertions) ? resolved.assertions : [];
            const groupResults = group.map(item =>
              this._runAssertions(response, responseTime, [item], variables, errorMessage)
            );
            const passed = groupResults.every(item => item.passed);
            assertResult = {
              passed,
              message: passed ? '组合断言(allOf)通过' : '组合断言(allOf)失败',
              details: groupResults,
            };
            break;
          }
          case 'anyOf': {
            const group = Array.isArray(resolved.assertions) ? resolved.assertions : [];
            const groupResults = group.map(item =>
              this._runAssertions(response, responseTime, [item], variables, errorMessage)
            );
            const passed = groupResults.some(item => item.passed);
            assertResult = {
              passed,
              message: passed ? '组合断言(anyOf)通过' : '组合断言(anyOf)失败',
              details: groupResults,
            };
            break;
          }
          case 'status':
            assertResult = this.assertionSystem
              .status(resolved.expected as StatusRule)
              .validate(result);
            break;
          case 'header':
            assertResult = this.assertionSystem
              .header(String(resolved.name ?? ''), resolved.value)
              .validate(result);
            break;
          case 'json': {
            const operator = typeof resolved.operator === 'string' ? resolved.operator : 'equals';
            assertResult = this.assertionSystem
              .json(String(resolved.path ?? ''), resolved.expected, operator)
              .validate(result);
            break;
          }
          case 'error':
            assertResult = this.assertionSystem
              .error(resolved.expected as ErrorRule)
              .validate(result);
            break;
          case 'jsonSchema':
            assertResult = this.assertionSystem
              .jsonSchema(resolved.schema as AssertionSchema)
              .validate(result);
            break;
          case 'bodyContains':
            assertResult = this.assertionSystem
              .bodyContains(String(resolved.expected ?? ''))
              .validate(result);
            break;
          case 'bodyRegex':
            assertResult = this.assertionSystem
              .bodyRegex(resolved.pattern as BodyRegexRule)
              .validate(result);
            break;
          case 'responseTime':
            assertResult = this.assertionSystem
              .responseTime(resolved.max as ResponseTimeRule)
              .validate(result);
            break;
          default:
            assertResult = {
              passed: false,
              message: `未知的断言类型: ${resolved.type}`,
            };
        }

        assertionResults.push(assertResult);
        if (assertResult.passed) passedCount++;
      } catch (error) {
        actualAssertionCount++;
        assertionResults.push({
          passed: false,
          message: `断言执行错误: ${(error as Error).message}`,
        });
      }
    }

    return {
      passed: actualAssertionCount === 0 || passedCount === actualAssertionCount,
      total: actualAssertionCount,
      passedCount,
      failedCount: actualAssertionCount - passedCount,
      results: assertionResults,
    };
  }

  safeParseJson(body: string): unknown | null {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  resolveTemplate(value: unknown, variables: ApiVariables): unknown {
    if (typeof value === 'string') {
      return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => variables[key] ?? '');
    }
    if (Array.isArray(value)) {
      return value.map(item => this.resolveTemplate(item, variables));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [
          key,
          this.resolveTemplate(val, variables),
        ])
      );
    }
    return value;
  }

  resolveAssertion(assertion: AssertionInput, variables: ApiVariables): AssertionInput {
    return this.resolveTemplate(assertion, variables) as AssertionInput;
  }

  extractVariables(response: ApiResponse, variables: ApiVariables, assertions: AssertionInput[]) {
    const extractionRules = assertions.filter(item => item.type === 'extract');
    if (!extractionRules.length) {
      return {};
    }
    const contentType = response.headers['content-type'] || '';
    const jsonBody = contentType.includes('application/json')
      ? this.safeParseJson(response.body)
      : null;
    const extracted: Record<string, string> = {};
    for (const rule of extractionRules) {
      const name = String(rule.name || '');
      if (!name) continue;
      if (rule.source === 'header') {
        const value = response.headers[String(rule.path || '')];
        if (value !== undefined) extracted[name] = String(value);
        continue;
      }
      if (rule.source === 'json') {
        const value = this.getValueByPath(jsonBody, String(rule.path || ''));
        if (value !== undefined) extracted[name] = String(value);
        continue;
      }
      if (rule.source === 'regex') {
        try {
          const regex = new RegExp(String(rule.pattern || ''));
          const match = regex.exec(response.body || '');
          if (match?.[1]) {
            extracted[name] = String(match[1]);
          }
        } catch {
          continue;
        }
      }
    }
    Object.assign(variables, extracted);
    return extracted;
  }

  getValueByPath(value: unknown, path: string) {
    if (!path) return value;
    const segments = path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(Boolean);
    let current: unknown = value;
    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  async _checkAlerts(
    testId: string,
    url: string,
    response: ApiResponse,
    responseTime: number,
    validationResults: ApiAssertionSummary
  ) {
    try {
      await this.alertManager?.checkAlert?.('RESPONSE_TIME_THRESHOLD', {
        testId,
        url,
        value: responseTime,
        threshold: 3000,
      });

      if (response.statusCode && response.statusCode >= 500) {
        await this.alertManager?.checkAlert?.('API_ERROR', {
          testId,
          url,
          statusCode: response.statusCode,
          message: `API返回服务器错误: ${response.statusCode}`,
        });
      }

      if (!validationResults.passed) {
        await this.alertManager?.checkAlert?.('VALIDATION_FAILURE', {
          testId,
          url,
          failedAssertions: validationResults.failedCount,
          totalAssertions: validationResults.total,
        });
      }
    } catch (error) {
      Logger.warn('告警检查失败', { error: (error as Error).message });
    }
  }

  async testMultipleEndpoints(
    endpoints: ApiEndpointConfig[],
    testId: string | null = null,
    variables: ApiVariables = {},
    localOptions?: ApiTestOptions
  ) {
    const results: ApiEndpointResult[] = [];
    const startTime = performance.now();
    const chainVariables: ApiVariables = { ...variables };
    // 共享 Cookie Jar：跨端点自动保持会话
    const cookieJar = new Map<string, string>();

    for (let i = 0; i < endpoints.length; i++) {
      if (this.isCancelled(testId)) throw new Error('测试已取消');
      const endpoint = endpoints[i];
      const endpointUrl = typeof endpoint.url === 'string' ? endpoint.url : '';

      if (testId) {
        this.updateTestProgress(
          testId,
          Math.round(30 + (i / endpoints.length) * 60),
          `测试端点 ${i + 1}/${endpoints.length}: ${endpointUrl || 'unknown'}`,
          'running'
        );
      }

      if (!endpointUrl) {
        results.push({
          url: 'unknown',
          method: endpoint.method || 'GET',
          timestamp: new Date().toISOString(),
          responseTime: 0,
          error: '端点缺少url',
          success: false,
          summary: {
            success: false,
            error: '端点缺少url',
            responseTime: '0ms',
          },
        } as ApiEndpointResult);
      } else {
        const endpointVariables: ApiVariables = {
          ...chainVariables,
          ...(endpoint.variables || {}),
        };
        const result = await this.testSingleEndpoint({
          ...endpoint,
          url: endpointUrl,
          testId: null,
          variables: endpointVariables,
          cookieJar,
          localOptions,
        });
        if (result.extractions) {
          Object.assign(chainVariables, result.extractions);
        }
        results.push(result);
      }
    }

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    const summary = this.calculateSummary(results);

    return {
      totalEndpoints: endpoints.length,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString(),
      summary,
      results,
      chainVariables,
      recommendations: this.generateBatchRecommendations(summary),
    };
  }

  async makeRequest(
    client: typeof http | typeof https,
    options: RequestOptions,
    body: unknown = null,
    _redirectDepth = 0
  ): Promise<ApiResponse> {
    const raw = Number(this.options.maxRedirects);
    const maxRedirects = Number.isNaN(raw) ? 5 : raw;

    return new Promise<ApiResponse>((resolve, reject) => {
      const req = (client as typeof http).request(
        options,
        (res: import('http').IncomingMessage) => {
          const statusCode = res.statusCode || 0;

          // 处理重定向
          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            res.headers.location &&
            _redirectDepth < maxRedirects
          ) {
            res.resume();
            try {
              const currentUrl = `${options.protocol || 'http:'}//${options.hostname}${options.path}`;
              const redirectUrl = new URL(res.headers.location, currentUrl);
              const redirectClient = redirectUrl.protocol === 'https:' ? https : http;
              const isRedirectHttps = redirectUrl.protocol === 'https:';
              const redirectOptions: RequestOptions = {
                hostname: redirectUrl.hostname,
                port: redirectUrl.port || (isRedirectHttps ? 443 : 80),
                path: redirectUrl.pathname + redirectUrl.search,
                method: statusCode === 303 ? 'GET' : (options.method as string),
                headers: options.headers,
                timeout: options.timeout,
                ...(isRedirectHttps
                  ? { agent: new https.Agent({ rejectUnauthorized: false }) }
                  : {}),
              };
              this.makeRequest(
                redirectClient,
                redirectOptions,
                statusCode === 303 ? null : body,
                _redirectDepth + 1
              )
                .then(resolve)
                .catch(reject);
            } catch (err) {
              reject(err);
            }
            return;
          }

          // 根据 content-encoding 解压响应
          const encoding = (res.headers['content-encoding'] || '').toLowerCase();
          let decompressed: NodeJS.ReadableStream = res;
          if (encoding === 'gzip' || encoding === 'x-gzip') {
            decompressed = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            decompressed = res.pipe(zlib.createInflate());
          } else if (encoding === 'br') {
            decompressed = res.pipe(zlib.createBrotliDecompress());
          }

          let data = '';
          let truncated = false;
          const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB 响应体上限
          decompressed.on('data', (chunk: Buffer) => {
            if (truncated) return;
            data += chunk.toString();
            if (data.length > MAX_BODY_BYTES) {
              truncated = true;
              data = data.slice(0, MAX_BODY_BYTES);
              res.destroy();
            }
          });

          decompressed.on('error', () => {
            // 解压失败时仍然 resolve（body 可能为空）
            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: res.headers as Record<string, string | undefined>,
              body: data,
            });
          });

          decompressed.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: res.headers as Record<string, string | undefined>,
              body: data,
            });
          });
        }
      );

      req.on('error', (error: Error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      if (body && ['POST', 'PUT', 'PATCH'].includes(options.method as string)) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyStr);
      }

      req.end();
    });
  }

  analyzeHeaders(headers: Record<string, string | undefined>) {
    const securityHeaders: Record<string, boolean> = {
      'x-frame-options': !!headers['x-frame-options'],
      'x-content-type-options': !!headers['x-content-type-options'],
      'x-xss-protection': !!headers['x-xss-protection'],
      'strict-transport-security': !!headers['strict-transport-security'],
      'content-security-policy': !!headers['content-security-policy'],
      'referrer-policy': !!headers['referrer-policy'],
      'permissions-policy': !!headers['permissions-policy'],
    };
    const presentCount = Object.values(securityHeaders).filter(Boolean).length;
    const totalCount = Object.keys(securityHeaders).length;

    // CORS 详情
    const corsOrigin = headers['access-control-allow-origin'] || null;
    const corsMethods = headers['access-control-allow-methods'] || null;
    const corsHeaders = headers['access-control-allow-headers'] || null;
    const corsCredentials = headers['access-control-allow-credentials'] || null;
    const hasCORS = !!corsOrigin;

    // 速率限制头
    const rateLimiting = {
      limit: headers['x-ratelimit-limit'] || headers['ratelimit-limit'] || null,
      remaining: headers['x-ratelimit-remaining'] || headers['ratelimit-remaining'] || null,
      reset: headers['x-ratelimit-reset'] || headers['ratelimit-reset'] || null,
      retryAfter: headers['retry-after'] || null,
    };
    const hasRateLimiting = !!(rateLimiting.limit || rateLimiting.retryAfter);

    // API 版本头
    const apiVersion = headers['x-api-version'] || headers['api-version'] || null;

    return {
      contentType: headers['content-type'] || 'unknown',
      contentLength: parseInt(headers['content-length'] || '0', 10) || 0,
      server: headers['server'] || 'unknown',
      caching: {
        cacheControl: headers['cache-control'],
        expires: headers['expires'],
        etag: headers['etag'],
      },
      security: {
        hasHttps: !!headers['strict-transport-security'],
        hasCORS,
        corsDetails: hasCORS
          ? {
              allowOrigin: corsOrigin,
              allowMethods: corsMethods,
              allowHeaders: corsHeaders,
              allowCredentials: corsCredentials === 'true',
              isWildcard: corsOrigin === '*',
            }
          : null,
        hasSecurityHeaders: securityHeaders,
        securityHeaderScore: { present: presentCount, total: totalCount },
      },
      compression: headers['content-encoding'],
      rateLimiting: hasRateLimiting ? rateLimiting : null,
      apiVersion,
    };
  }

  analyzeResponse(response: ApiResponse, responseTime: number): ApiAnalysis {
    const statusCode = Number(response.statusCode || 0);
    return {
      status: {
        code: statusCode,
        message: response.statusMessage,
        category: this.getStatusCategory(statusCode),
      },
      headers: this.analyzeHeaders(response.headers),
      body: this.analyzeBody(response.body, response.headers['content-type'] || ''),
      performance: {
        responseTime,
        category: this.getPerformanceCategory(responseTime),
      },
    };
  }

  getStatusCategory(statusCode: number) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  analyzeBody(body: string, contentType = ''): ApiAnalysis['body'] {
    const analysis: ApiAnalysis['body'] = {
      size: Buffer.byteLength(body, 'utf8'),
      type: 'text',
      valid: true,
      structure: null,
    };

    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        analysis.type = 'json';
        // 超过 1MB 的 JSON 跳过深度结构分析（防止大对象遍历过慢）
        if (analysis.size <= 1024 * 1024) {
          analysis.structure = this.analyzeJSONStructure(parsed as Record<string, unknown>);
        }
      } catch (_error) {
        void _error;
        analysis.valid = false;
        analysis.error = '无效的JSON格式';
      }
    } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
      analysis.type = 'xml';
    } else if (contentType.includes('text/html')) {
      analysis.type = 'html';
    }

    return analysis;
  }

  analyzeJSONStructure(data: unknown, _currentDepth = 0): ApiBodyStructure {
    if (Array.isArray(data)) {
      // 元素类型分布
      const typeDist: Record<string, number> = {};
      const uniqueTypes = new Set<string>();
      for (const item of data.slice(0, 100)) {
        const t = item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
        uniqueTypes.add(t);
        typeDist[t] = (typeDist[t] || 0) + 1;
      }
      // 采样第一个非 null 元素的结构（仅对象/数组，限制深度 ≤ 2）
      let sampleItem: ApiBodyStructure | null = null;
      if (_currentDepth < 2 && data.length > 0) {
        const first = data.find(i => i !== null && typeof i === 'object');
        if (first !== undefined) {
          sampleItem = this.analyzeJSONStructure(first, _currentDepth + 1);
        }
      }
      return {
        type: 'array',
        length: data.length,
        itemTypes: Array.from(uniqueTypes),
        itemTypeDistribution: typeDist,
        sampleItem,
      };
    }
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);
      // 值类型统计
      const valueTypes: Record<string, number> = {};
      for (const key of keys) {
        const v = obj[key];
        const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
        valueTypes[t] = (valueTypes[t] || 0) + 1;
      }
      // 计算嵌套深度（限制递归深度 ≤ 5 防止无限递归）
      let maxChildDepth = 0;
      if (_currentDepth < 5) {
        for (const key of keys.slice(0, 20)) {
          const v = obj[key];
          if (v && typeof v === 'object') {
            const child = this.analyzeJSONStructure(v, _currentDepth + 1);
            const childDepth =
              child.type === 'object' ? (child.depth ?? 1) : child.type === 'array' ? 1 : 0;
            if (childDepth > maxChildDepth) maxChildDepth = childDepth;
          }
        }
      }
      return {
        type: 'object',
        keys: keys.slice(0, 50),
        keyCount: keys.length,
        depth: 1 + maxChildDepth,
        valueTypes,
      };
    }
    const primitiveType = typeof data;
    return {
      type:
        primitiveType === 'string' ||
        primitiveType === 'number' ||
        primitiveType === 'boolean' ||
        primitiveType === 'undefined'
          ? primitiveType
          : data === null
            ? 'null'
            : 'unknown',
      value: data,
    };
  }

  getPerformanceCategory(responseTime: number) {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'acceptable';
    if (responseTime < 2000) return 'slow';
    return 'very_slow';
  }

  generateRecommendations(analysis: ApiAnalysis, responseTime: number) {
    const recommendations: string[] = [];

    // ── API 功能测试核心建议 ──

    // 响应时间
    if (responseTime > 3000) {
      recommendations.push(`响应时间 ${responseTime}ms 过慢，建议排查服务器性能瓶颈`);
    } else if (responseTime > 1000) {
      recommendations.push('响应时间较慢，建议优化服务器性能或数据库查询');
    }

    // 响应体结构异常检测
    const contentType = analysis.headers.contentType || '';
    if (contentType.includes('text/html') && analysis.body.size > 0) {
      recommendations.push(
        '响应 Content-Type 为 text/html — 可能返回了错误页面而非 API 数据，请检查 URL 是否正确'
      );
    }
    if (analysis.body.type === 'json' && !analysis.body.valid) {
      recommendations.push('响应声明为 JSON 但解析失败 — 接口返回了无效的 JSON 格式');
    }

    // 响应压缩（仅作为优化建议）
    if (!analysis.headers.compression && analysis.body.size > 10240) {
      recommendations.push('响应体较大且未启用压缩，建议启用 gzip/br 减少传输量');
    }

    // ── 安全头建议 ──
    const secHeaders = analysis.headers.security?.hasSecurityHeaders;
    if (secHeaders && typeof secHeaders === 'object') {
      const missing = Object.entries(secHeaders as Record<string, boolean>)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      if (missing.length > 0 && missing.length <= 4) {
        recommendations.push(`缺少安全响应头: ${missing.join(', ')}`);
      } else if (missing.length > 4) {
        recommendations.push(
          `缺少 ${missing.length} 个安全响应头（${missing.slice(0, 3).join(', ')} 等），建议逐步添加`
        );
      }
    }

    // CORS 通配符风险
    const corsDetails = analysis.headers.security.corsDetails;
    if (corsDetails) {
      if (corsDetails.isWildcard) {
        recommendations.push('CORS Allow-Origin 为 *（通配符），生产环境建议限定具体域名');
        if (corsDetails.allowCredentials) {
          recommendations.push(
            '⚠️ CORS 同时配置了 Allow-Origin: * 和 Allow-Credentials: true，浏览器会拒绝此组合'
          );
        }
      }
    }

    // 速率限制
    if (!analysis.headers.rateLimiting) {
      recommendations.push(
        '未检测到速率限制头（X-RateLimit-Limit），建议为 API 配置速率限制防止滥用'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('API 响应正常，无需特别优化');
    }

    return recommendations;
  }

  calculateSummary(results: ApiEndpointResult[]): ApiBatchSummary {
    const total = results.length;
    if (total === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: '0%',
        averageResponseTime: '0ms',
        statusCodes: {},
      };
    }
    const successful = results.filter(r => r.summary?.success).length;
    const failed = total - successful;

    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / total;

    const statusCodes: Record<string, number> = {};
    results.forEach(r => {
      const statusCode = r.summary?.statusCode;
      if (statusCode) {
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
      }
    });

    return {
      total,
      successful,
      failed,
      successRate: `${Math.round((successful / total) * 100)}%`,
      averageResponseTime: `${Math.round(avgResponseTime)}ms`,
      statusCodes,
    };
  }

  generateBatchRecommendations(summary: ApiBatchSummary) {
    const recommendations: string[] = [];

    const failed = summary.failed as number;
    if (failed > 0) {
      recommendations.push(`${failed} 个端点测试失败，建议检查服务器状态`);
    }

    const avgTime = parseInt(summary.averageResponseTime as string, 10);
    if (avgTime > 1000) {
      recommendations.push(`平均响应时间较长 (${summary.averageResponseTime})，建议优化性能`);
    }

    const successRate = parseInt(summary.successRate as string, 10);
    if (successRate < 95) {
      recommendations.push(`成功率较低 (${summary.successRate})，建议检查失败的端点`);
    }

    if (recommendations.length === 0) {
      recommendations.push('所有API端点运行正常，性能良好');
    }

    return recommendations;
  }

  /**
   * 计算单个端点的评分
   *
   * 权重分配（以 API 功能测试为核心）：
   *   - 断言通过率  45%  ← API 测试的核心价值
   *   - 状态码      35%  ← 接口是否正常响应
   *   - 响应时间    15%  ← 性能基线
   *   - 错误惩罚     5%  ← 请求级错误（DNS/超时/连接拒绝）
   */
  calculateEndpointScore(result: ApiEndpointResult): number {
    let score = 100;

    // ── 状态码（35%）──
    const statusCode = result.summary?.statusCode || 0;
    if (statusCode === 0)
      score -= 35; // 请求未到达服务器
    else if (statusCode >= 500)
      score -= 35; // 服务器错误
    else if (statusCode >= 400)
      score -= 20; // 客户端错误
    else if (statusCode >= 300) score -= 5; // 重定向

    // ── 断言通过率（45%）──
    if (result.validations && result.validations.total > 0) {
      const passRate = (result.validations.passedCount || 0) / result.validations.total;
      score -= Math.round((1 - passRate) * 45);
    }
    // 无断言时不扣分，但会在建议中提示

    // ── 响应时间（15%）──
    const responseTime = result.responseTime || 0;
    if (responseTime > 5000) score -= 15;
    else if (responseTime > 3000) score -= 10;
    else if (responseTime > 1000) score -= 5;

    // ── 错误惩罚（5%）──
    if (result.error) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算测试总体评分（单端点或批量）
   */
  calculateTestScore(results: ApiEndpointResult | ApiBatchResult): number {
    // 批量测试：取所有端点评分的加权平均
    if ('results' in results && Array.isArray((results as ApiBatchResult).results)) {
      const batch = results as ApiBatchResult;
      const endpointResults = batch.results;
      if (endpointResults.length === 0) return 0;
      const scores = endpointResults.map(r => this.calculateEndpointScore(r));
      return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    }

    // 单端点
    return this.calculateEndpointScore(results as ApiEndpointResult);
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
    this.cancelledTests.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    console.log('✅ API测试引擎清理完成');
  }
}

export default ApiTestEngine;
