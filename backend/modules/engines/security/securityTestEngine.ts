/**
 * 安全测试引擎
 * 提供真实的安全扫描、SSL检测、头部分析、漏洞检测等功能
 *
 * 增强功能:
 * - WebSocket实时进度通知
 * - 告警系统集成
 * - 测试ID支持
 */

import axios from 'axios';
import Joi from 'joi';
import tls from 'tls';
import { URL } from 'url';
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
import { puppeteerPool } from '../shared/services/PuppeteerPool';
import ScreenshotService, { type ScreenshotResult } from '../shared/services/ScreenshotService';
import ContentSecurityAnalyzer, {
  type ContentSecurityResult,
} from './analyzers/ContentSecurityAnalyzer';
import CookieAuditor, { type CookieAuditResult } from './analyzers/CookieAuditor';
import CorsChecker, { type CorsCheckResult } from './analyzers/CorsChecker';
import CsrfAnalyzer, { type CsrfAnalysisResult } from './analyzers/CsrfAnalyzer';
import PortScanner, { type PortScanResult } from './analyzers/PortScanner';
import SecurityHeadersAnalyzer from './analyzers/securityHeadersAnalyzer';

type SecurityHeaderMissing = {
  name: string;
  importance: 'high' | 'medium' | 'low';
};

type VulnerabilityItem = {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
};

type VulnerabilityAnalysis = {
  xss: { vulnerabilities: VulnerabilityItem[]; summary: { totalTests: number; riskLevel: string } };
  sqlInjection: {
    vulnerabilities: VulnerabilityItem[];
    summary: { totalTests: number; riskLevel: string };
  };
  other: VulnerabilityItem[];
};

type SecurityAnalyses = {
  ssl?: { score: number; issues?: string[]; enabled?: boolean };
  headers?: { score: number; missingHeaders?: SecurityHeaderMissing[] };
  vulnerabilities?: {
    xss?: { vulnerabilities: VulnerabilityItem[] };
    sqlInjection?: { vulnerabilities: VulnerabilityItem[] };
    other?: VulnerabilityItem[];
  };
  informationDisclosure?: { score: number; issues?: string[] };
  accessControl?: { score: number; issues?: string[] };
  portScan?: PortScanResult;
  csrf?: CsrfAnalysisResult;
  cookies?: CookieAuditResult;
  cors?: CorsCheckResult;
  contentSecurity?: ContentSecurityResult;
};

type SSLAnalysis = {
  enabled: boolean;
  version: string;
  certificate: { valid: boolean; issuer: string; expires: string | null };
  score: number;
  issues: string[];
};

type HeadersAnalysis = {
  score: number;
  headers: unknown;
  missingHeaders: SecurityHeaderMissing[];
  warnings: string[];
  cspDetails?: Record<string, unknown>;
};

type InfoDisclosureAnalysis = {
  score: number;
  issues: string[];
  warnings: string[];
};

type AccessControlAnalysis = {
  score: number;
  issues: string[];
  warnings: string[];
};

type SecurityRunConfig = BaseTestConfig & {
  testId?: string;
  enableDeepScan?: boolean;
  enablePortScan?: boolean;
  enableScreenshot?: boolean;
  checkSSL?: boolean;
  checkHeaders?: boolean;
  checkVulnerabilities?: boolean;
  checkCsrf?: boolean;
  checkCookies?: boolean;
  checkCors?: boolean;
  checkContentSecurity?: boolean;
  checkXss?: boolean;
  checkSqlInjection?: boolean;
  checkSensitiveInfo?: boolean;
  portScanPorts?: number[];
  screenshotOptions?: {
    fullPage?: boolean;
    width?: number;
    height?: number;
    highlightIssues?: boolean;
  };
};

type SecurityConfig = SecurityRunConfig & { testId: string; url: string };

type SecurityOptions = {
  timeout: number | string;
  userAgent: string;
};

type SecurityComplianceStatus = {
  owasp: { status: 'compliant' | 'partial' | 'non-compliant' | 'unknown'; issues: string[] };
  gdpr: { status: 'compliant' | 'partial' | 'non-compliant' | 'unknown'; issues: string[] };
  pci: { status: 'compliant' | 'partial' | 'non-compliant' | 'unknown'; issues: string[] };
};

type SecurityRecommendationItem = {
  priority: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  action: string;
  timeframe: string;
};

type SecurityRecommendations = {
  immediate: SecurityRecommendationItem[];
  shortTerm: SecurityRecommendationItem[];
  longTerm: SecurityRecommendationItem[];
  preventive: SecurityRecommendationItem[];
};

type SecurityThreatIntelligence = {
  threatLevel: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  attackVectors: Array<{ type: string; risk: string; description: string }>;
  mitigationStrategies: string[];
  industryTrends: string[];
};

type SecurityMetrics = {
  score: number;
  rating: string;
  totalIssues: number;
  criticalIssues: number;
  highRiskIssues: number;
};

type SecuritySummaryReport = {
  totalIssues: number;
  criticalIssues: number;
  highRiskIssues: number;
  recommendations: number;
};

type SecurityNormalizedResult = {
  testId: string;
  status: TestStatus;
  score: number;
  summary: SecuritySummaryReport;
  metrics: SecurityMetrics;
  warnings: string[];
  errors: string[];
  recommendations: SecurityRecommendations;
  details: SecurityScanResult;
};

type SecurityFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: SecurityNormalizedResult;
  status: TestStatus;
  score?: number;
  summary?: SecuritySummaryReport | null;
  warnings?: string[];
  errors?: string[];
  recommendations?: SecurityRecommendations;
  error?: string;
  timestamp: string;
  startTime?: string;
  endTime?: string;
  url?: string;
};

type SecurityActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  lastUpdate?: number;
  message?: string;
  error?: string;
  results?: SecurityNormalizedResult;
};

type SecurityProgressPayload = {
  testId: string;
  progress: number;
  message: string;
  status?: string;
};

type SecurityProgressExtra = {
  url?: string;
};

type SecurityAlertPayload = {
  testId: string;
  testType: string;
  url: string;
  error?: string;
};

type SecurityScanResult = {
  success: boolean;
  testId?: string;
  url: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  results?: {
    checks: {
      ssl?: SSLAnalysis;
      headers?: HeadersAnalysis;
      informationDisclosure?: InfoDisclosureAnalysis;
      accessControl?: AccessControlAnalysis;
      vulnerabilities?: VulnerabilityAnalysis;
      portScan?: PortScanResult;
      csrf?: CsrfAnalysisResult;
      cookies?: CookieAuditResult;
      cors?: CorsCheckResult;
      contentSecurity?: ContentSecurityResult;
    };
    score?: number;
    rating?: string;
    compliance?: SecurityComplianceStatus;
    summary?: SecuritySummaryReport;
    metrics?: SecurityMetrics;
    recommendations?: SecurityRecommendations;
    detailedAnalysis?: {
      threatIntelligence?: SecurityThreatIntelligence;
    };
    screenshot?: ScreenshotResult;
  };
  error?: string;
  timestamp?: string;
};

class SecurityTestEngine implements ITestEngine<SecurityRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  description: string;
  options: SecurityOptions;
  lifecycle?: ITestEngine<SecurityRunConfig, BaseTestResult>['lifecycle'];
  activeTests: Map<string, SecurityActiveTestRecord>;
  progressCallback: ((progress: SecurityProgressPayload) => void) | null;
  completionCallback: ((results: SecurityFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  private progressTracker: Map<string, TestProgress>;
  private cancelledTests: Set<string>;
  alertManager: {
    checkAlert?: (type: string, payload: SecurityAlertPayload) => Promise<void>;
  } | null;
  constructor(options: Partial<SecurityOptions> = {}) {
    this.type = TestEngineType.SECURITY;
    this.name = 'security';
    this.version = '3.0.0';
    this.description = '安全测试引擎 - 支持实时通知和告警';
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: this.description,
      version: this.version,
      supportedFeatures: [
        'security-testing',
        'vulnerability-scanning',
        'ssl-analysis',
        'security-headers',
        'csrf-detection',
        'cookie-security-audit',
        'cors-configuration-check',
        'sri-check',
        'mixed-content-detection',
        'http-method-check',
      ],
      requiredConfig: ['url'],
      optionalConfig: ['enableDeepScan', 'enablePortScan', 'enableScreenshot'],
      outputFormat: ['summary', 'metrics', 'recommendations', 'details'],
      maxConcurrent: 1,
      estimatedDuration: {
        min: 5000,
        max: 60000,
        typical: 20000,
      },
    };
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Security-Scanner/3.0.0',
      ...options,
    };
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.progressTracker = new Map();
    this.cancelledTests = new Set();

    // 初始化告警管理器
    this.alertManager = null;
    try {
      this.alertManager = getAlertManager() as {
        checkAlert?: (type: string, payload: SecurityAlertPayload) => Promise<void>;
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.warn('告警管理器未初始化', { error: message });
    }
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: SecurityProgressExtra = {}
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

  private isCancelled(testId?: string): boolean {
    return testId ? this.cancelledTests.has(testId) : false;
  }

  setProgressCallback(callback: (progress: SecurityProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: SecurityFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  validate(config: SecurityRunConfig): ValidationResult {
    const schema = Joi.object({
      testId: Joi.string(),
      url: Joi.string().uri().required(),
      enableDeepScan: Joi.boolean(),
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
    let baseTimeout = cfgAny.enableDeepScan ? 180000 : 120000;
    if (cfgAny.enablePortScan !== false) baseTimeout += 30000;
    if (cfgAny.enableScreenshot) baseTimeout += 20000;
    cfgAny.executionTimeout = baseTimeout;

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  private normalizeConfig(config: SecurityConfig) {
    // 展开 options：前端发送 { url, testType, options: { checkSSL, ... } }
    const rawOptions = (config as unknown as Record<string, unknown>).options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      config = { ...config, ...(rawOptions as Record<string, unknown>) } as SecurityConfig;
    }

    const schema = Joi.object({
      testId: Joi.string().required(),
      url: Joi.string().uri().required(),
      enableDeepScan: Joi.boolean(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as SecurityConfig;
  }

  async initialize(): Promise<void> {
    return;
  }

  async run(
    config: SecurityRunConfig,
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
      currentStep: '准备安全测试环境',
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
      } as SecurityConfig);
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const scanSummary = result.results?.details?.results?.summary;
      const summaryObj =
        scanSummary && typeof scanSummary === 'object' && !Array.isArray(scanSummary)
          ? { ...scanSummary, duration: durationMs }
          : { duration: durationMs, message: result.success ? '安全测试完成' : '安全测试失败' };
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: result.results?.score ?? 0,
        startTime,
        endTime,
        duration: durationMs,
        summary: summaryObj as unknown as string,
        details: {
          ...result,
        },
        errors: result.success ? [] : [String(result.error || '安全测试失败')],
        warnings: result.results?.warnings || [],
        recommendations: result.results?.recommendations
          ? [
              ...result.results.recommendations.immediate,
              ...result.results.recommendations.shortTerm,
              ...result.results.recommendations.longTerm,
              ...result.results.recommendations.preventive,
            ].map(item => `${item.priority}: ${item.issue}`)
          : [],
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
        summary: '安全测试失败',
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

  estimateDuration(config: SecurityRunConfig): number {
    let estimate = config.enableDeepScan ? 30000 : 15000;
    if (config.enablePortScan !== false) estimate += 10000;
    if (config.enableScreenshot) estimate += 10000;
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

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      engine: this.name,
      available: true,
      version: this.version,
      features: [
        'security-testing',
        'vulnerability-scanning',
        'ssl-analysis',
        'security-headers',
        'csrf-detection',
        'cookie-security-audit',
        'cors-configuration-check',
        'sri-check',
        'mixed-content-detection',
        'http-method-check',
      ],
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config: SecurityConfig) {
    const validatedConfig = this.normalizeConfig(config);
    const testId = validatedConfig.testId;
    const { url } = validatedConfig as { url: string };
    if (!url) {
      throw new Error('安全测试URL不能为空');
    }

    // 从 config 读取 timeout 覆盖默认值，让前端配置生效
    // 注意：使用局部变量传递给子方法，避免修改共享实例属性导致并发竞态
    const originalTimeout = this.options.timeout;
    const configTimeout = (validatedConfig as unknown as Record<string, unknown>).timeout;
    const effectiveTimeout =
      typeof configTimeout === 'number' && configTimeout > 0 ? configTimeout : originalTimeout;
    // 临时设置（子方法通过 this.options.timeout 读取），在 finally 中恢复
    this.options.timeout = effectiveTimeout;

    try {
      Logger.info(`🚀 开始安全测试: ${testId} - ${url}`);

      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });

      // 发送测试开始事件
      this.updateTestProgress(testId, 0, '安全扫描开始', 'started', { url });

      const enabledChecks: string[] = [];
      if (validatedConfig.checkSSL !== false) enabledChecks.push('SSL/TLS');
      if (validatedConfig.checkHeaders !== false) enabledChecks.push('安全头部');
      if (validatedConfig.checkVulnerabilities !== false) enabledChecks.push('漏洞扫描');
      if (validatedConfig.enablePortScan !== false) enabledChecks.push('端口扫描');
      if (validatedConfig.checkCsrf !== false) enabledChecks.push('CSRF');
      if (validatedConfig.checkCookies !== false) enabledChecks.push('Cookie');
      if (validatedConfig.checkCors !== false) enabledChecks.push('CORS');
      if (validatedConfig.checkContentSecurity !== false) enabledChecks.push('内容安全');
      void insertExecutionLog(
        testId,
        'info',
        `安全测试配置: ${enabledChecks.join(' · ')}${validatedConfig.enableDeepScan ? ' · 深度扫描' : ''}`,
        { url }
      );

      const _cfgRaw = validatedConfig as unknown as Record<string, unknown>;
      if (typeof _cfgRaw.engineMode === 'string') {
        puppeteerPool.applyEngineMode(_cfgRaw.engineMode);
      }
      const showBrowser = _cfgRaw.showBrowser === true;
      const results = await this.performSecurityScan(url, {
        testId,
        enableDeepScan: validatedConfig.enableDeepScan,
        enablePortScan: validatedConfig.enablePortScan,
        enableScreenshot: validatedConfig.enableScreenshot,
        checkSSL: validatedConfig.checkSSL,
        checkHeaders: validatedConfig.checkHeaders,
        checkVulnerabilities: validatedConfig.checkVulnerabilities,
        checkCsrf: validatedConfig.checkCsrf,
        checkCookies: validatedConfig.checkCookies,
        checkCors: validatedConfig.checkCors,
        checkContentSecurity: validatedConfig.checkContentSecurity,
        portScanPorts: validatedConfig.portScanPorts,
        screenshotOptions: validatedConfig.screenshotOptions,
        showBrowser,
      });

      // 检查扫描是否失败（performSecurityScan 内部 catch 后返回 success: false）
      if (!results.success) {
        throw new Error((results as { error?: string }).error || '安全扫描失败');
      }

      const warnings: string[] = [];
      const errors: string[] = [];
      // 合并扫描过程中的 warnings（子步骤失败/超时等）
      const scanWarnings = (results.results as Record<string, unknown> | undefined)?._scanWarnings;
      if (Array.isArray(scanWarnings)) {
        warnings.push(...scanWarnings);
      }
      const checks = results.results?.checks || {};
      const sslIssues = checks.ssl?.issues || [];
      const headerWarnings = checks.headers?.warnings || [];
      const infoIssues = checks.informationDisclosure?.issues || [];
      const infoWarnings = checks.informationDisclosure?.warnings || [];
      const accessIssues = checks.accessControl?.issues || [];
      const accessWarnings = checks.accessControl?.warnings || [];
      errors.push(...sslIssues, ...infoIssues, ...accessIssues);
      warnings.push(...headerWarnings, ...infoWarnings, ...accessWarnings);

      const vulnerabilities = checks.vulnerabilities;
      const vulnerabilityLists = [
        ...(vulnerabilities?.xss?.vulnerabilities || []),
        ...(vulnerabilities?.sqlInjection?.vulnerabilities || []),
        ...(vulnerabilities?.other || []),
      ];
      vulnerabilityLists.forEach(item => {
        const severity = (item.severity || 'low').toLowerCase();
        const description = item.description || '安全漏洞';
        if (severity === 'critical' || severity === 'high') {
          errors.push(String(description));
        } else {
          warnings.push(String(description));
        }
      });

      const summary: SecuritySummaryReport = results.results?.summary || {
        totalIssues: 0,
        criticalIssues: 0,
        highRiskIssues: 0,
        recommendations: 0,
      };
      const metrics: SecurityMetrics = results.results?.metrics || {
        score: results.results?.score ?? 0,
        rating: results.results?.rating ?? 'unknown',
        totalIssues: summary.totalIssues,
        criticalIssues: summary.criticalIssues,
        highRiskIssues: summary.highRiskIssues,
      };
      const recommendations: SecurityRecommendations = results.results?.recommendations || {
        immediate: [],
        shortTerm: [],
        longTerm: [],
        preventive: [],
      };

      const normalizedResult: SecurityNormalizedResult = {
        testId,
        status: TestStatus.COMPLETED,
        score: results.results?.score ?? 0,
        summary,
        metrics,
        warnings,
        errors,
        recommendations,
        details: results,
      };

      const finalResult: SecurityFinalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: normalizedResult.summary,
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        recommendations: normalizedResult.recommendations,
        timestamp: new Date().toISOString(),
      };

      // 先发送 100% 进度（此时 activeTests 状态仍为 RUNNING）
      this.updateTestProgress(testId, 100, '安全测试完成', 'completed');
      void insertExecutionLog(
        testId,
        'info',
        `安全测试完成 · 得分 ${normalizedResult.score} · 问题 ${summary.totalIssues} 个（严重 ${summary.criticalIssues} / 高危 ${summary.highRiskIssues}）`,
        {
          score: normalizedResult.score,
          totalIssues: summary.totalIssues,
          criticalIssues: summary.criticalIssues,
          highRiskIssues: summary.highRiskIssues,
        }
      );

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results: normalizedResult,
      });

      // 不在此处调用 emitTestComplete —— 由 UserTestManager.completionCallback 统一处理

      Logger.info(`✅ 安全测试完成: ${testId}`);

      this.cancelledTests.delete(testId);
      this.options.timeout = originalTimeout;
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
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`❌ 安全测试失败: ${testId}`, message);

      const startTimestamp = this.activeTests.get(testId)?.startTime;
      const startAt = typeof startTimestamp === 'number' ? new Date(startTimestamp) : new Date();
      const errorResult: SecurityFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: message,
        status: TestStatus.FAILED,
        score: 0,
        summary: null,
        warnings: [],
        errors: [message],
        timestamp: new Date().toISOString(),
        startTime: startAt.toISOString(),
        endTime: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: TestStatus.FAILED,
        error: message,
      });
      // 不在此处调用 emitTestError —— 由 UserTestManager.errorCallback 统一处理

      setTimeout(
        () => {
          this.activeTests.delete(testId);
          this.progressTracker.delete(testId);
        },
        5 * 60 * 1000
      );

      this.cancelledTests.delete(testId);
      this.options.timeout = originalTimeout;

      // 触发错误告警
      if (this.alertManager?.checkAlert) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'security',
          url,
          error: message,
        });
      }

      return errorResult;
    }
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(
    url: string,
    options: Partial<SecurityConfig> & { page?: unknown; showBrowser?: boolean } = {}
  ): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const testId = options.testId;

    try {
      Logger.info(`🔍 开始全面安全扫描: ${url}`);
      const scanWarnings: string[] = [];

      // 发送进度: SSL分析
      if (testId) {
        this.updateTestProgress(testId, 10, '分析SSL/TLS配置...', 'running');
      }

      // 初始化漏洞分析器
      const { default: XSSAnalyzer } = await import('./analyzers/XSSAnalyzer');
      const { default: SQLInjectionAnalyzer } = await import('./analyzers/SQLInjectionAnalyzer');

      const xssAnalyzer = new XSSAnalyzer();
      const sqlAnalyzer = new SQLInjectionAnalyzer();

      // 并行执行基础安全检查（根据配置开关控制）
      const _defaultSSL: SSLAnalysis = {
        enabled: false,
        version: '',
        certificate: { valid: false, issuer: '', expires: null },
        score: 0,
        issues: [],
      };
      const _defaultHeaders: HeadersAnalysis = {
        score: 0,
        headers: {},
        missingHeaders: [],
        warnings: [],
      };

      const [sslAnalysis, headersAnalysis, informationDisclosure, accessControl]: [
        SSLAnalysis,
        HeadersAnalysis,
        InfoDisclosureAnalysis,
        AccessControlAnalysis,
      ] = await Promise.all([
        options.checkSSL !== false ? this.analyzeSSL(urlObj) : Promise.resolve(_defaultSSL),
        options.checkHeaders !== false
          ? this.analyzeSecurityHeaders(url)
          : Promise.resolve(_defaultHeaders),
        this.checkInformationDisclosure(url),
        this.testAccessControl(url),
      ]);

      // 发送进度: 基础检查完成
      if (testId) {
        this.updateTestProgress(testId, 40, 'SSL和安全头部分析完成', 'running');
        const sslScore = sslAnalysis?.score ?? 0;
        const headerScore = headersAnalysis?.score ?? 0;
        const sslIssueCount = sslAnalysis?.issues?.length ?? 0;
        const missingHeaderCount = headersAnalysis?.missingHeaders?.length ?? 0;
        void insertExecutionLog(
          testId,
          'info',
          `SSL 得分 ${sslScore} · 安全头部得分 ${headerScore} · SSL 问题 ${sslIssueCount} 个 · 缺失头部 ${missingHeaderCount} 个`
        );
      }
      if (this.isCancelled(testId)) throw new Error('测试已取消');

      // 深度漏洞扫描（需要浏览器环境）
      let vulnerabilityAnalysis: VulnerabilityAnalysis = {
        xss: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        sqlInjection: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        other: [],
      };

      if (options.checkVulnerabilities === false) {
        Logger.info('⏭️ 漏洞扫描已关闭，跳过');
      } else if (options.enableDeepScan) {
        Logger.info('🔍 开始深度漏洞扫描...');

        if (testId) {
          this.updateTestProgress(testId, 50, '执行深度漏洞扫描...', 'running');
        }

        // 深度扫描也使用并行 + 超时保护，防止单项扫描无限挂起
        const deepTimeout = 60000;
        const DEEP_SENTINEL = Symbol('deepTimeout');
        const withDeepTimeout = <T>(p: Promise<T>, ms: number): Promise<T | typeof DEEP_SENTINEL> =>
          Promise.race([
            p,
            new Promise<typeof DEEP_SENTINEL>(resolve =>
              setTimeout(() => resolve(DEEP_SENTINEL), ms)
            ),
          ]);

        const [xssRaw, sqlRaw, otherRaw] = await Promise.all([
          withDeepTimeout(
            xssAnalyzer.analyze(url, {
              timeout: this.options.timeout as number,
              userAgent: this.options.userAgent as string,
              testHeaders: true,
              testCookies: true,
              delay: 100,
              headless: !options.showBrowser,
            }),
            deepTimeout
          ).catch((err: unknown) => {
            scanWarnings.push(
              `深度 XSS 扫描失败: ${err instanceof Error ? err.message : String(err)}`
            );
            return DEEP_SENTINEL as typeof DEEP_SENTINEL;
          }),
          withDeepTimeout(
            sqlAnalyzer.analyze(url, {
              timeout: this.options.timeout as number,
              userAgent: this.options.userAgent as string,
              followRedirects: true,
              maxRedirects: 5,
              testHeaders: true,
              testCookies: true,
              delay: 100,
            }),
            deepTimeout
          ).catch((err: unknown) => {
            scanWarnings.push(
              `深度 SQL 扫描失败: ${err instanceof Error ? err.message : String(err)}`
            );
            return DEEP_SENTINEL as typeof DEEP_SENTINEL;
          }),
          withDeepTimeout(this.scanOtherVulnerabilities(undefined, url), deepTimeout).catch(
            (err: unknown) => {
              scanWarnings.push(
                `其他漏洞扫描失败: ${err instanceof Error ? err.message : String(err)}`
              );
              return DEEP_SENTINEL as typeof DEEP_SENTINEL;
            }
          ),
        ]);

        if (xssRaw !== DEEP_SENTINEL) {
          const xssResults = xssRaw as Awaited<ReturnType<typeof xssAnalyzer.analyze>>;
          vulnerabilityAnalysis.xss = {
            ...xssResults,
            summary: { totalTests: xssResults.summary?.totalTests || 0, riskLevel: 'low' },
          };
        } else {
          scanWarnings.push('深度 XSS 扫描超时（60s），已跳过');
        }

        if (sqlRaw !== DEEP_SENTINEL) {
          const sqlResults = sqlRaw as Awaited<ReturnType<typeof sqlAnalyzer.analyze>>;
          vulnerabilityAnalysis.sqlInjection = {
            ...sqlResults,
            summary: { totalTests: sqlResults.summary?.totalTests || 0, riskLevel: 'low' },
          };
        } else {
          scanWarnings.push('深度 SQL 扫描超时（60s），已跳过');
        }

        if (otherRaw !== DEEP_SENTINEL) {
          vulnerabilityAnalysis.other = otherRaw as VulnerabilityItem[];
        } else {
          scanWarnings.push('其他漏洞扫描超时（60s），已跳过');
        }
      } else {
        Logger.info('🔍 执行快速安全扫描...');

        if (testId) {
          this.updateTestProgress(testId, 50, '执行快速漏洞扫描...', 'running');
        }

        const quickResult = await this.performQuickVulnerabilityScan(url);
        const { _warnings: quickWarnings, ...quickVulns } = quickResult;
        vulnerabilityAnalysis = quickVulns as unknown as VulnerabilityAnalysis;
        if (quickWarnings && quickWarnings.length > 0) {
          scanWarnings.push(...quickWarnings);
        }
      }

      if (this.isCancelled(testId)) throw new Error('测试已取消');

      // 端口扫描（可选）
      let portScanResult: PortScanResult | undefined;
      if (options.enablePortScan !== false) {
        if (testId) {
          this.updateTestProgress(testId, 65, '执行端口扫描...', 'running');
          void insertExecutionLog(testId, 'info', '开始端口扫描');
        }
        try {
          const host = PortScanner.extractHost(url);
          portScanResult = options.portScanPorts?.length
            ? await PortScanner.scan({
                host,
                ports: options.portScanPorts,
                timeout: 2000,
                concurrency: 8,
              })
            : await PortScanner.quickScan(host);
        } catch (portScanError) {
          const msg =
            portScanError instanceof Error ? portScanError.message : String(portScanError);
          scanWarnings.push(`端口扫描失败: ${msg}`);
          Logger.warn('端口扫描失败', { error: msg });
        }
      }

      if (this.isCancelled(testId)) throw new Error('测试已取消');

      // 扩展安全检测：CSRF / Cookie / CORS / 内容安全（SRI + 混合内容 + HTTP 方法）
      let csrfResult: CsrfAnalysisResult | undefined;
      let cookieResult: CookieAuditResult | undefined;
      let corsResult: CorsCheckResult | undefined;
      let contentSecurityResult: ContentSecurityResult | undefined;

      if (testId) {
        this.updateTestProgress(testId, 70, '执行扩展安全检测...', 'running');
      }

      const analyzerTimeout = Math.min((this.options.timeout as number) || 30000, 30000);
      const analyzerOpts = {
        timeout: analyzerTimeout,
        userAgent: this.options.userAgent as string,
      };

      try {
        const [csrf, cookie, cors, contentSec] = await Promise.all([
          options.checkCsrf !== false
            ? new CsrfAnalyzer(analyzerOpts).analyze(url).catch((err: unknown): undefined => {
                scanWarnings.push(
                  `CSRF 检测失败: ${err instanceof Error ? err.message : String(err)}`
                );
                return undefined;
              })
            : Promise.resolve(undefined),
          options.checkCookies !== false
            ? new CookieAuditor(analyzerOpts).analyze(url).catch((err: unknown): undefined => {
                scanWarnings.push(
                  `Cookie 审计失败: ${err instanceof Error ? err.message : String(err)}`
                );
                return undefined;
              })
            : Promise.resolve(undefined),
          options.checkCors !== false
            ? new CorsChecker(analyzerOpts).analyze(url).catch((err: unknown): undefined => {
                scanWarnings.push(
                  `CORS 检测失败: ${err instanceof Error ? err.message : String(err)}`
                );
                return undefined;
              })
            : Promise.resolve(undefined),
          options.checkContentSecurity !== false
            ? new ContentSecurityAnalyzer(analyzerOpts)
                .analyze(url)
                .catch((err: unknown): undefined => {
                  scanWarnings.push(
                    `内容安全检测失败: ${err instanceof Error ? err.message : String(err)}`
                  );
                  return undefined;
                })
            : Promise.resolve(undefined),
        ]);

        csrfResult = csrf;
        cookieResult = cookie;
        corsResult = cors;
        contentSecurityResult = contentSec;
      } catch (extError: unknown) {
        const msg = extError instanceof Error ? extError.message : String(extError);
        scanWarnings.push(`扩展安全检测失败: ${msg}`);
        Logger.warn('扩展安全检测失败', { error: msg });
      }

      if (this.isCancelled(testId)) throw new Error('测试已取消');

      // 页面截图（可选）
      let screenshotResult: ScreenshotResult | undefined;
      if (options.enableScreenshot) {
        if (testId) {
          this.updateTestProgress(testId, 75, '正在截取页面截图...', 'running');
        }
        try {
          const screenshotService = new ScreenshotService();
          const ssOpts = options.screenshotOptions || {};
          screenshotResult = await screenshotService.capture({
            url,
            width: ssOpts.width || 1920,
            height: ssOpts.height || 1080,
            fullPage: ssOpts.fullPage ?? false,
            timeout: 20000,
            hideScrollbar: true,
          });
          if (testId) {
            await screenshotService.saveScreenshot(screenshotResult, {
              testId,
              label: 'security',
              subDir: 'security',
            });
          }
        } catch (ssError) {
          const msg = ssError instanceof Error ? ssError.message : String(ssError);
          scanWarnings.push(`页面截图失败: ${msg}`);
          Logger.warn('安全测试截图失败', { error: msg });
        }
      }

      const endTime = Date.now();

      // 发送进度: 分析结果
      if (testId) {
        this.updateTestProgress(testId, 85, '分析安全测试结果...', 'analyzing');
      }

      // 构建完整的分析对象（仅包含已启用的检测维度，关闭的不参与评分）
      const fullAnalyses: SecurityAnalyses = {
        ssl: options.checkSSL !== false ? sslAnalysis : undefined,
        headers: options.checkHeaders !== false ? headersAnalysis : undefined,
        vulnerabilities: options.checkVulnerabilities !== false ? vulnerabilityAnalysis : undefined,
        informationDisclosure,
        accessControl,
        portScan: portScanResult,
        csrf: options.checkCsrf !== false ? csrfResult : undefined,
        cookies: options.checkCookies !== false ? cookieResult : undefined,
        cors: options.checkCors !== false ? corsResult : undefined,
        contentSecurity: options.checkContentSecurity !== false ? contentSecurityResult : undefined,
      };

      // 计算总体安全评分（增强版，含端口扫描权重）
      const overallScore = this.calculateSecurityScore(fullAnalyses);

      const securityRating = this.calculateRiskRating(vulnerabilityAnalysis);

      const complianceStatus = this.assessComplianceStatus(fullAnalyses);
      const recommendations = this.generateSecurityRecommendations(fullAnalyses);

      // 合并端口扫描的建议
      if (portScanResult && portScanResult.recommendations.length > 0) {
        for (const rec of portScanResult.recommendations) {
          const isCritical = rec.startsWith('[严重]');
          const isHigh = rec.startsWith('[高危]');
          const target = isCritical
            ? recommendations.immediate
            : isHigh
              ? recommendations.shortTerm
              : recommendations.longTerm;
          target.push({
            priority: isCritical ? 'critical' : isHigh ? 'high' : 'medium',
            issue: '端口暴露风险',
            action: rec,
            timeframe: isCritical ? '24小时内' : isHigh ? '1周内' : '1个月内',
          });
        }
      }

      const totalIssues =
        this.countTotalSecurityIssues(fullAnalyses) + (portScanResult?.openPorts || 0);

      // 判断扫描完整性：核心漏洞扫描（XSS/SQL）是否被跳过
      const skippedScans: string[] = [];
      if (vulnerabilityAnalysis.xss?.summary?.riskLevel === 'unknown') {
        skippedScans.push('XSS');
      }
      if (vulnerabilityAnalysis.sqlInjection?.summary?.riskLevel === 'unknown') {
        skippedScans.push('SQL Injection');
      }
      const scanConfidence: 'full' | 'partial' | 'minimal' =
        skippedScans.length === 0 ? 'full' : skippedScans.length >= 2 ? 'minimal' : 'partial';

      // 当核心漏洞扫描被跳过时，评分上限为 70（不能因为没扫描就给高分）
      const cappedScore =
        scanConfidence === 'full'
          ? overallScore
          : Math.min(overallScore, scanConfidence === 'partial' ? 70 : 60);

      const results = {
        url,
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        score: cappedScore,
        rating: securityRating,
        scanConfidence,
        skippedScans,
        compliance: complianceStatus,
        summary: {
          totalIssues,
          criticalIssues: this.countCriticalVulnerabilities(vulnerabilityAnalysis),
          highRiskIssues: this.countHighRiskIssues(vulnerabilityAnalysis),
          recommendations: recommendations.immediate.length + recommendations.shortTerm.length,
          duration: endTime - startTime,
        },
        checks: {
          ssl: options.checkSSL !== false ? sslAnalysis : undefined,
          headers: options.checkHeaders !== false ? headersAnalysis : undefined,
          informationDisclosure,
          accessControl,
          vulnerabilities:
            options.checkVulnerabilities !== false ? vulnerabilityAnalysis : undefined,
          portScan: portScanResult,
          csrf: options.checkCsrf !== false ? csrfResult : undefined,
          cookies: options.checkCookies !== false ? cookieResult : undefined,
          cors: options.checkCors !== false ? corsResult : undefined,
          contentSecurity:
            options.checkContentSecurity !== false ? contentSecurityResult : undefined,
        },
        recommendations,
        detailedAnalysis: {
          threatIntelligence: this.generateThreatIntelligence(vulnerabilityAnalysis),
        },
        screenshot: screenshotResult,
        _scanWarnings: scanWarnings,
      };

      if (testId) {
        this.updateTestProgress(testId, 100, '安全测试完成', 'completed');
      }

      return {
        success: true,
        testId,
        url,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`❌ 安全扫描失败: ${url}`, message);

      if (testId) {
        this.updateTestProgress(testId, 100, '安全测试失败', 'failed');
      }

      return {
        success: false,
        testId,
        url,
        error: message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async analyzeSSL(urlObj: {
    protocol: string;
    hostname: string;
    port?: string;
  }): Promise<SSLAnalysis> {
    if (urlObj.protocol !== 'https:') {
      return {
        enabled: false,
        version: 'unknown',
        certificate: {
          valid: false,
          issuer: '',
          expires: null,
        },
        score: 0,
        issues: ['未启用HTTPS'],
      };
    }

    const hostname = urlObj.hostname;
    const port = urlObj.port ? Number(urlObj.port) : 443;

    return new Promise(resolve => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
        },
        () => {
          const cert = socket.getPeerCertificate(true) as unknown as Record<
            string,
            Record<string, string> | string
          >;
          const expiresAt = cert.valid_to ? new Date(cert.valid_to as string) : null;
          const daysUntilExpiry = expiresAt
            ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;
          const certIssuer = cert.issuer as Record<string, string> | undefined;
          const certSubject = cert.subject as Record<string, string> | undefined;
          const selfSigned = certIssuer && certSubject ? certIssuer.CN === certSubject.CN : false;

          const issues: string[] = [];
          let score = 100;

          if (!socket.authorized) {
            issues.push('SSL证书无效或不被信任');
            score -= 40;
          }
          if (selfSigned) {
            issues.push('使用自签名证书');
            score -= 20;
          }
          if (daysUntilExpiry > 0 && daysUntilExpiry < 30) {
            issues.push(`SSL证书将在${daysUntilExpiry}天内过期`);
            score -= 15;
          }

          const protocol = socket.getProtocol() || 'unknown';
          if (protocol !== 'TLSv1.2' && protocol !== 'TLSv1.3') {
            issues.push(`使用不安全的协议: ${protocol}`);
            score -= 15;
          }

          // 密码套件检测
          const cipher = socket.getCipher?.() || { name: 'unknown', version: '' };
          const cipherName = (cipher.name || '').toUpperCase();
          const weakCiphers = ['RC4', 'DES', '3DES', 'NULL', 'EXPORT', 'anon'];
          const isWeakCipher = weakCiphers.some(w => cipherName.includes(w));
          if (isWeakCipher) {
            issues.push(`使用弱密码套件: ${cipher.name}`);
            score -= 15;
          }

          socket.destroy();

          resolve({
            enabled: true,
            version: protocol,
            certificate: {
              valid: socket.authorized || false,
              issuer: String((cert.issuer as Record<string, string>)?.CN || ''),
              expires: expiresAt ? expiresAt.toISOString() : null,
            },
            score: Math.max(0, score),
            issues,
          });
        }
      );

      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({
          enabled: true,
          version: 'unknown',
          certificate: { valid: false, issuer: '', expires: null },
          score: 0,
          issues: ['SSL连接超时'],
        });
      });

      socket.on('error', () => {
        resolve({
          enabled: true,
          version: 'unknown',
          certificate: { valid: false, issuer: '', expires: null },
          score: 0,
          issues: ['无法获取SSL证书信息'],
        });
      });
    });
  }

  async analyzeSecurityHeaders(url: string): Promise<HeadersAnalysis> {
    const analyzer = new SecurityHeadersAnalyzer();
    const analysis = await analyzer.analyze(url, {
      timeout: Number(this.options.timeout) || 30000,
      userAgent: this.options.userAgent as string,
      followRedirects: true,
      maxRedirects: 5,
    });

    const importanceMap: Record<string, 'high' | 'medium' | 'low'> = {
      'Content-Security-Policy': 'high',
      'Strict-Transport-Security': 'high',
      'X-Frame-Options': 'high',
      'X-Content-Type-Options': 'high',
      'X-XSS-Protection': 'medium',
      'Referrer-Policy': 'medium',
      'Permissions-Policy': 'medium',
      'Cross-Origin-Embedder-Policy': 'low',
      'Cross-Origin-Opener-Policy': 'low',
      'Cross-Origin-Resource-Policy': 'low',
    };

    const missingHeaders = (analysis.headers as Array<{ header: string; present: boolean }>)
      .filter(header => !header.present)
      .map(header => ({
        name: header.header,
        importance: importanceMap[header.header] || 'low',
      }));

    const warnings = (
      analysis.headers as Array<{ header: string; present: boolean; valid: boolean }>
    )
      .filter(header => header.present && !header.valid)
      .map(header => `安全头配置不符合要求: ${header.header}`);

    // CSP 策略深度分析
    let cspScore = analysis.overall.score;
    const cspDetails: Record<string, unknown> = {};
    try {
      const resp = await axios.get(url, {
        timeout: Number(this.options.timeout) || 15000,
        headers: { 'User-Agent': this.options.userAgent as string },
        maxContentLength: 5 * 1024 * 1024, // 5MB
      });
      const cspHeader =
        resp.headers['content-security-policy'] ||
        resp.headers['content-security-policy-report-only'] ||
        '';
      if (cspHeader) {
        cspDetails.raw = cspHeader;
        const directives = cspHeader
          .split(';')
          .map((d: string) => d.trim())
          .filter(Boolean);
        cspDetails.directiveCount = directives.length;

        // 检查危险指令
        const dangerousPatterns: Array<{ pattern: RegExp; message: string; penalty: number }> = [
          {
            pattern: /unsafe-inline/i,
            message: "CSP 包含 'unsafe-inline'，削弱了 XSS 防护",
            penalty: 10,
          },
          {
            pattern: /unsafe-eval/i,
            message: "CSP 包含 'unsafe-eval'，允许动态代码执行",
            penalty: 10,
          },
          { pattern: /\*(?!\.)/, message: "CSP 使用通配符 '*'，策略过于宽松", penalty: 8 },
          { pattern: /data:/i, message: 'CSP 允许 data: URI，可能被用于注入', penalty: 5 },
        ];
        for (const { pattern, message, penalty } of dangerousPatterns) {
          if (pattern.test(cspHeader)) {
            warnings.push(message);
            cspScore -= penalty;
          }
        }

        // 检查是否缺少关键指令
        const hasDefaultSrc = directives.some((d: string) => d.startsWith('default-src'));
        const hasScriptSrc = directives.some((d: string) => d.startsWith('script-src'));
        if (!hasDefaultSrc && !hasScriptSrc) {
          warnings.push('CSP 缺少 default-src 和 script-src 指令');
          cspScore -= 5;
        }
      }
    } catch {
      // CSP 分析失败不影响主流程
    }

    return {
      score: Math.max(0, cspScore),
      headers: analysis.headers,
      missingHeaders,
      warnings,
      cspDetails: Object.keys(cspDetails).length > 0 ? cspDetails : undefined,
    };
  }

  async checkInformationDisclosure(url: string): Promise<InfoDisclosureAnalysis> {
    const result = {
      score: 100,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      const response = await axios.get(url, {
        timeout: Number(this.options.timeout) || 15000,
        headers: { 'User-Agent': this.options.userAgent as string },
        maxContentLength: 5 * 1024 * 1024, // 5MB
      });

      const headers = response.headers || {};
      const disclosedHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
      disclosedHeaders.forEach(header => {
        if (headers[header]) {
          result.issues.push(`响应头暴露敏感信息: ${header}`);
          result.score -= 10;
        }
      });

      const body = typeof response.data === 'string' ? response.data : '';
      const leakagePatterns = ['Stack trace', 'Traceback', 'Exception', 'SQLSTATE'];
      leakagePatterns.forEach(pattern => {
        if (body.includes(pattern)) {
          result.issues.push(`页面内容疑似泄露错误信息: ${pattern}`);
          result.score -= 15;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.warnings.push(`无法检查信息泄露: ${message}`);
      result.score = Math.max(0, result.score - 10);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  async testAccessControl(url: string): Promise<AccessControlAnalysis> {
    const result = {
      score: 100,
      issues: [] as string[],
      warnings: [] as string[],
    };

    const target = new URL(url);

    // 高风险路径：返回 200 且内容匹配特征时才报问题
    // 中风险路径：仅作为信息提示
    const sensitivePaths: Array<{
      path: string;
      risk: 'critical' | 'high' | 'medium';
      penalty: number;
      // 可选：响应体中包含这些关键词才算真正暴露
      contentPatterns?: RegExp[];
    }> = [
      {
        path: '/.env',
        risk: 'critical',
        penalty: 25,
        contentPatterns: [/DB_|APP_KEY|SECRET|PASSWORD/i],
      },
      {
        path: '/.git/config',
        risk: 'critical',
        penalty: 25,
        contentPatterns: [/\[core\]|\[remote/],
      },
      {
        path: '/.htpasswd',
        risk: 'critical',
        penalty: 25,
        contentPatterns: [/\$apr1\$|\$2[aby]\$/],
      },
      {
        path: '/wp-config.php',
        risk: 'critical',
        penalty: 20,
        contentPatterns: [/DB_NAME|DB_PASSWORD/i],
      },
      {
        path: '/phpinfo.php',
        risk: 'high',
        penalty: 15,
        contentPatterns: [/phpinfo\(\)|PHP Version/i],
      },
      {
        path: '/server-status',
        risk: 'high',
        penalty: 15,
        contentPatterns: [/Apache Server Status/i],
      },
      {
        path: '/server-info',
        risk: 'high',
        penalty: 15,
        contentPatterns: [/Apache Server Information/i],
      },
      { path: '/elmah.axd', risk: 'high', penalty: 15, contentPatterns: [/Error Log|ELMAH/i] },
      {
        path: '/actuator',
        risk: 'high',
        penalty: 15,
        contentPatterns: [/"_links"|"health"|"info"/],
      },
      // 云服务 / 容器 / CI 配置泄露
      {
        path: '/.aws/credentials',
        risk: 'critical',
        penalty: 25,
        contentPatterns: [/aws_access_key_id|aws_secret_access_key/i],
      },
      {
        path: '/.docker/config.json',
        risk: 'critical',
        penalty: 25,
        contentPatterns: [/"auths"|"credsStore"/],
      },
      {
        path: '/.github/workflows',
        risk: 'medium',
        penalty: 5,
        contentPatterns: [/on:|jobs:|steps:/],
      },
      // 管理后台
      { path: '/admin', risk: 'medium', penalty: 5 },
      { path: '/wp-admin/', risk: 'medium', penalty: 5, contentPatterns: [/wp-login|WordPress/i] },
      // GraphQL 端点
      {
        path: '/graphql',
        risk: 'medium',
        penalty: 5,
        contentPatterns: [/query|mutation|__schema/i],
      },
      { path: '/debug', risk: 'medium', penalty: 5 },
      { path: '/trace', risk: 'medium', penalty: 5 },
      { path: '/swagger-ui.html', risk: 'medium', penalty: 5, contentPatterns: [/swagger/i] },
      { path: '/api-docs', risk: 'medium', penalty: 5, contentPatterns: [/openapi|swagger/i] },
      { path: '/backup', risk: 'medium', penalty: 5 },
      { path: '/web.config', risk: 'medium', penalty: 5, contentPatterns: [/<configuration/i] },
    ];

    // 并发限制：最多 5 个同时请求，避免对目标服务器造成压力
    const CONCURRENCY = 5;
    for (let i = 0; i < sensitivePaths.length; i += CONCURRENCY) {
      const batch = sensitivePaths.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ path, risk, penalty, contentPatterns }) => {
          try {
            const response = await axios.get(`${target.origin}${path}`, {
              timeout: 5000,
              maxRedirects: 0,
              validateStatus: (status: number) => status >= 200 && status < 500,
              headers: { 'User-Agent': this.options.userAgent as string },
            });

            if (response.status === 200) {
              const body = typeof response.data === 'string' ? response.data : '';
              // 如果有内容特征模式，需要匹配才算真正暴露
              if (contentPatterns && contentPatterns.length > 0) {
                const matched = contentPatterns.some(p => p.test(body));
                if (matched) {
                  result.issues.push(`[${risk}] 敏感路径可访问且内容暴露: ${path}`);
                  result.score -= penalty;
                }
                // 不匹配则忽略（可能是自定义 404 页面返回 200）
              } else if (risk === 'critical' || risk === 'high') {
                // 无特征模式的高风险路径，200 仍然报警告（不报 issue）
                result.warnings.push(`敏感路径返回 200: ${path}（建议人工确认）`);
                result.score -= Math.round(penalty / 3);
              }
            }
            // 401/403 说明路径存在但受保护，不报任何问题
            // 404/其他状态码 = 路径不存在，正常
          } catch {
            // 网络错误/超时 = 静默忽略，不产生噪音
          }
        })
      );
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  async scanOtherVulnerabilities(_page: unknown, url: string) {
    const issues: VulnerabilityItem[] = [];

    const redirectPayloads = ['http://evil.com', '//evil.com', 'javascript:alert(1)'];
    for (const payload of redirectPayloads) {
      try {
        const response = await axios.get(url, {
          params: { redirect: payload },
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: (status: number) => status >= 200 && status < 500,
        });
        if (response.status >= 300 && response.status < 400) {
          issues.push({
            type: 'open-redirect',
            severity: 'medium',
            description: '检测到开放重定向风险',
          });
          break;
        }
      } catch {
        // ignore
      }
    }

    const traversalPayloads = ['../etc/passwd', '..\\..\\windows\\system32\\drivers\\etc\\hosts'];
    for (const payload of traversalPayloads) {
      try {
        const response = await axios.get(url, {
          params: { file: payload },
          timeout: 5000,
          validateStatus: (status: number) => status >= 200 && status < 500,
        });
        const body = typeof response.data === 'string' ? response.data : '';
        if (body.includes('root:x:0:0') || body.includes('localhost')) {
          issues.push({
            type: 'directory-traversal',
            severity: 'high',
            description: '检测到目录遍历风险',
          });
          break;
        }
      } catch {
        // ignore
      }
    }

    return issues;
  }

  async performQuickVulnerabilityScan(url: string) {
    const scanWarnings: string[] = [];
    const { default: XSSAnalyzer } = await import('./analyzers/XSSAnalyzer');
    const { default: SQLInjectionAnalyzer } = await import('./analyzers/SQLInjectionAnalyzer');
    const xssAnalyzer = new XSSAnalyzer();
    const sqlAnalyzer = new SQLInjectionAnalyzer();

    const buildRiskLevel = (vulnerabilities: Array<{ severity: string }>) => {
      if (vulnerabilities.some(v => v.severity === 'critical')) return 'critical';
      if (vulnerabilities.some(v => v.severity === 'high')) return 'high';
      if (vulnerabilities.some(v => v.severity === 'medium')) return 'medium';
      return 'low';
    };

    // ── 探测目标站点安全防护（WAF / CDN / 频率限制） ──
    let siteProtected = false;
    let protectionDetail = '';
    try {
      const probeUA =
        (this.options.userAgent as string) || 'Mozilla/5.0 (compatible; SecurityScanner/1.0)';
      const normalResp = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': probeUA },
        maxRedirects: 5,
        validateStatus: () => true,
      });
      const probeResp = await axios.get(url, {
        timeout: 10000,
        params: { test: '<script>alert(1)</script>' },
        headers: { 'User-Agent': probeUA },
        maxRedirects: 5,
        validateStatus: () => true,
      });
      const probeStatus = probeResp.status;
      const probeBody = typeof probeResp.data === 'string' ? probeResp.data.toLowerCase() : '';
      const probeHeaders = probeResp.headers || {};
      const normalStatus = normalResp.status;
      const wafSignatures = [
        'cloudflare',
        'cf-ray',
        'akamai',
        'incapsula',
        'sucuri',
        'barracuda',
        'fortiweb',
        'modsecurity',
        'webknight',
        'access denied',
        'request blocked',
        'forbidden',
        'waf',
        'firewall',
        'protection',
      ];
      const headerStr = JSON.stringify(probeHeaders).toLowerCase();
      const hasWafHeader = wafSignatures.some(sig => headerStr.includes(sig));
      const hasWafBody = wafSignatures.some(sig => probeBody.includes(sig));
      if (probeStatus === 403 && normalStatus < 400) {
        siteProtected = true;
        protectionDetail = '目标站点启用了 Web 应用防火墙 (WAF)，攻击性请求被拦截';
      } else if (probeStatus === 429) {
        siteProtected = true;
        protectionDetail = '目标站点启用了请求频率限制，扫描请求被限流';
      } else if (probeStatus === 503 && (hasWafHeader || hasWafBody)) {
        siteProtected = true;
        protectionDetail = '目标站点启用了 CDN/DDoS 防护，需要通过安全验证';
      } else if (hasWafHeader && probeStatus >= 400) {
        siteProtected = true;
        protectionDetail = '目标站点检测到安全防护机制（WAF/CDN），部分扫描可能受限';
      } else if (probeStatus === 406 || probeStatus === 451) {
        siteProtected = true;
        protectionDetail = '目标站点拒绝了带安全测试特征的请求';
      }
    } catch {
      // 探测本身失败不阻塞后续扫描
    }
    if (siteProtected) {
      scanWarnings.push(`${protectionDetail}，漏洞注入扫描（XSS/SQL）结果可能不完整`);
    }

    // ── 辅助：根据错误类型生成精确的警告文案 ──
    const classifyError = (label: string, err: unknown): string => {
      if (!err) return `${label}失败`;
      const msg = err instanceof Error ? err.message : String(err);
      const axiosErr = err as { response?: { status?: number }; code?: string };
      const status = axiosErr?.response?.status;
      if (status === 403) return `${label}被目标站点防火墙拦截 (HTTP 403)`;
      if (status === 429) return `${label}被目标站点频率限制 (HTTP 429)`;
      if (status === 503) return `${label}被目标站点防护系统阻断 (HTTP 503)`;
      if (axiosErr?.code === 'ECONNREFUSED') return `${label}失败，目标站点拒绝连接`;
      if (axiosErr?.code === 'ENOTFOUND') return `${label}失败，无法解析目标域名`;
      if (msg.includes('timeout') || msg.includes('ETIMEDOUT'))
        return `${label}超时（目标站点响应过慢，可尝试增大超时时间）`;
      return `${label}失败: ${msg.length > 80 ? msg.slice(0, 80) + '…' : msg}`;
    };

    const TIMEOUT_SENTINEL = Symbol('timeout');
    const withTimeout = <T>(
      promise: Promise<T>,
      ms: number
    ): Promise<T | typeof TIMEOUT_SENTINEL> =>
      Promise.race([
        promise,
        new Promise<typeof TIMEOUT_SENTINEL>(resolve =>
          setTimeout(() => resolve(TIMEOUT_SENTINEL), ms)
        ),
      ]);

    // 单项扫描超时，三项并行执行；上限 60s 以保证 Puppeteer 启动 + 多轮 payload 有足够时间
    const scanTimeout = Math.min((this.options.timeout as number) || 60000, 60000);
    const emptyVuln = {
      vulnerabilities: [] as Array<{ severity: string }>,
      summary: { totalTests: 0 },
    };
    let xssSkipped = false;
    let sqlSkipped = false;

    let xssResult = emptyVuln;
    let sqlResult = emptyVuln;
    let other: Array<Record<string, unknown>> = [];

    const [xssRaw, sqlRaw, otherRaw] = await Promise.all([
      withTimeout(
        xssAnalyzer.analyze(url, {
          timeout: scanTimeout,
          userAgent: this.options.userAgent as string,
          testHeaders: false,
          testCookies: false,
          delay: 50,
          headless: true,
        }),
        scanTimeout
      ).catch((err: unknown) => {
        scanWarnings.push(classifyError('XSS 漏洞扫描', err));
        return TIMEOUT_SENTINEL as typeof TIMEOUT_SENTINEL;
      }),
      withTimeout(
        sqlAnalyzer.analyze(url, {
          timeout: scanTimeout,
          userAgent: this.options.userAgent as string,
          followRedirects: true,
          maxRedirects: 3,
          testHeaders: false,
          testCookies: false,
          delay: 50,
        }),
        scanTimeout
      ).catch((err: unknown) => {
        scanWarnings.push(classifyError('SQL 注入扫描', err));
        return TIMEOUT_SENTINEL as typeof TIMEOUT_SENTINEL;
      }),
      withTimeout(this.scanOtherVulnerabilities(undefined, url), scanTimeout).catch(
        (err: unknown) => {
          scanWarnings.push(classifyError('其他漏洞扫描', err));
          return TIMEOUT_SENTINEL as typeof TIMEOUT_SENTINEL;
        }
      ),
    ]);

    if (xssRaw === TIMEOUT_SENTINEL) {
      if (!scanWarnings.some(w => w.startsWith('XSS'))) {
        scanWarnings.push(
          siteProtected
            ? 'XSS 漏洞扫描超时，可能因站点防护拦截导致'
            : 'XSS 漏洞扫描超时，已跳过（目标站点响应较慢或页面结构复杂，可尝试增大超时时间后重试）'
        );
      }
      xssSkipped = true;
    } else {
      xssResult = xssRaw as typeof emptyVuln;
    }

    if (sqlRaw === TIMEOUT_SENTINEL) {
      if (!scanWarnings.some(w => w.startsWith('SQL'))) {
        scanWarnings.push(
          siteProtected
            ? 'SQL 注入扫描超时，可能因站点防护拦截导致'
            : 'SQL 注入扫描超时，已跳过（目标站点响应较慢或参数点较多，可尝试增大超时时间后重试）'
        );
      }
      sqlSkipped = true;
    } else {
      sqlResult = sqlRaw as typeof emptyVuln;
    }

    if (otherRaw !== TIMEOUT_SENTINEL) {
      other = otherRaw as Array<Record<string, unknown>>;
    } else {
      if (!scanWarnings.some(w => w.startsWith('其他'))) {
        scanWarnings.push('其他漏洞扫描超时，已跳过');
      }
    }

    return {
      xss: {
        ...xssResult,
        summary: {
          totalTests: xssResult.summary?.totalTests || 0,
          riskLevel: xssSkipped ? 'unknown' : buildRiskLevel(xssResult.vulnerabilities || []),
        },
      },
      sqlInjection: {
        ...sqlResult,
        summary: {
          totalTests: sqlResult.summary?.totalTests || 0,
          riskLevel: sqlSkipped ? 'unknown' : buildRiskLevel(sqlResult.vulnerabilities || []),
        },
      },
      other,
      _warnings: scanWarnings,
    };
  }

  calculateSecurityScore(analyses: SecurityAnalyses) {
    // 统一加权评分：所有已启用的检测维度都参与权重计算
    // 未启用（undefined）的维度不参与，权重自动归一化
    const dimensionScores: Array<{ score: number; weight: number }> = [];

    // ── 核心维度 ──
    if (analyses.ssl && analyses.ssl.score !== undefined) {
      dimensionScores.push({ score: analyses.ssl.score, weight: 25 });
    }
    if (analyses.headers && analyses.headers.score !== undefined) {
      dimensionScores.push({ score: analyses.headers.score, weight: 15 });
    }
    if (analyses.vulnerabilities) {
      let vulnScore = 100;
      const { xss, sqlInjection } = analyses.vulnerabilities;
      if (xss && xss.vulnerabilities) {
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'critical').length * 25;
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'high').length * 15;
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'medium').length * 8;
      }
      if (sqlInjection && sqlInjection.vulnerabilities) {
        vulnScore -=
          sqlInjection.vulnerabilities.filter(v => v.severity === 'critical').length * 30;
        vulnScore -= sqlInjection.vulnerabilities.filter(v => v.severity === 'high').length * 20;
        vulnScore -= sqlInjection.vulnerabilities.filter(v => v.severity === 'medium').length * 10;
      }
      if (analyses.vulnerabilities.other) {
        vulnScore -= analyses.vulnerabilities.other.filter(v => v.severity === 'high').length * 12;
        vulnScore -= analyses.vulnerabilities.other.filter(v => v.severity === 'medium').length * 8;
      }
      dimensionScores.push({ score: Math.max(0, vulnScore), weight: 20 });
    }
    if (analyses.informationDisclosure && analyses.informationDisclosure.score !== undefined) {
      dimensionScores.push({ score: analyses.informationDisclosure.score, weight: 8 });
    }
    if (analyses.accessControl && analyses.accessControl.score !== undefined) {
      dimensionScores.push({ score: analyses.accessControl.score, weight: 8 });
    }
    if (analyses.portScan) {
      dimensionScores.push({ score: analyses.portScan.score, weight: 10 });
    }

    // ── 扩展维度（正式纳入权重） ──
    if (analyses.csrf && analyses.csrf.score !== undefined) {
      dimensionScores.push({ score: analyses.csrf.score, weight: 8 });
    }
    if (analyses.cookies && analyses.cookies.score !== undefined) {
      dimensionScores.push({ score: analyses.cookies.score, weight: 6 });
    }
    if (analyses.cors && analyses.cors.score !== undefined) {
      dimensionScores.push({ score: analyses.cors.score, weight: 8 });
    }
    if (analyses.contentSecurity) {
      const cs = analyses.contentSecurity;
      // 将内容安全的子维度合并为一个综合分
      const subScores: number[] = [];
      if (cs.sri) subScores.push(cs.sri.score);
      if (cs.mixedContent) subScores.push(cs.mixedContent.score);
      if (cs.httpMethods) subScores.push(cs.httpMethods.score);
      if (subScores.length > 0) {
        const csAvg = Math.round(subScores.reduce((s, v) => s + v, 0) / subScores.length);
        dimensionScores.push({ score: csAvg, weight: 6 });
      }
    }

    // 加权平均（自动归一化）
    const totalWeight = dimensionScores.reduce((s, d) => s + d.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = dimensionScores.reduce((s, d) => s + d.score * d.weight, 0);
    return Math.max(0, Math.round(weightedSum / totalWeight));
  }

  calculateRiskRating(vulnerabilities: VulnerabilityAnalysis) {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    [vulnerabilities.xss, vulnerabilities.sqlInjection].forEach(vulnCategory => {
      if (vulnCategory && vulnCategory.vulnerabilities) {
        vulnCategory.vulnerabilities.forEach(vuln => {
          if (vuln.severity === 'critical') criticalCount++;
          else if (vuln.severity === 'high') highCount++;
          else if (vuln.severity === 'medium') mediumCount++;
        });
      }
    });

    if (vulnerabilities.other) {
      vulnerabilities.other.forEach(vuln => {
        if (vuln.severity === 'critical') criticalCount++;
        else if (vuln.severity === 'high') highCount++;
        else if (vuln.severity === 'medium') mediumCount++;
      });
    }

    if (criticalCount > 0) return 'Critical';
    if (highCount > 2) return 'High';
    if (highCount > 0 || mediumCount > 3) return 'Medium';
    if (mediumCount > 0) return 'Low';
    return 'Minimal';
  }

  countCriticalVulnerabilities(vulnerabilities: VulnerabilityAnalysis) {
    let count = 0;

    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'critical').length;
    }

    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(
        v => v.severity === 'critical'
      ).length;
    }

    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'critical').length;
    }

    return count;
  }

  countHighRiskIssues(vulnerabilities: VulnerabilityAnalysis) {
    let count = 0;

    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'high').length;
    }

    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(
        v => v.severity === 'high'
      ).length;
    }

    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'high').length;
    }

    return count;
  }

  countTotalSecurityIssues(analyses: SecurityAnalyses) {
    let count = 0;

    if (analyses.ssl?.issues) {
      count += analyses.ssl.issues.length;
    }

    if (analyses.headers?.missingHeaders) {
      count += analyses.headers.missingHeaders.filter(h => h.importance === 'high').length;
    }

    if (analyses.vulnerabilities) {
      if (analyses.vulnerabilities.xss?.vulnerabilities) {
        count += analyses.vulnerabilities.xss.vulnerabilities.length;
      }
      if (analyses.vulnerabilities.sqlInjection?.vulnerabilities) {
        count += analyses.vulnerabilities.sqlInjection.vulnerabilities.length;
      }
      if (analyses.vulnerabilities.other) {
        count += analyses.vulnerabilities.other.length;
      }
    }

    // 扩展检测维度的问题计数
    if (analyses.csrf?.vulnerabilities) {
      count += analyses.csrf.vulnerabilities.length;
    }
    if (analyses.cookies?.issues) {
      count += analyses.cookies.issues.filter(
        i => i.severity === 'high' || i.severity === 'critical'
      ).length;
    }
    if (analyses.cors?.issues) {
      count += analyses.cors.issues.filter(
        i => i.severity === 'high' || i.severity === 'critical'
      ).length;
    }
    if (analyses.contentSecurity) {
      const cs = analyses.contentSecurity;
      if (cs.sri?.issues) {
        count += cs.sri.issues.filter(i => i.severity === 'high').length;
      }
      if (cs.mixedContent?.issues) {
        count += cs.mixedContent.issues.filter(i => i.type === 'active').length;
      }
      if (cs.httpMethods?.issues) {
        count += cs.httpMethods.issues.filter(i => i.severity === 'high').length;
      }
    }

    return count;
  }

  assessComplianceStatus(analyses: SecurityAnalyses): SecurityComplianceStatus {
    const compliance: SecurityComplianceStatus = {
      owasp: { status: 'unknown', issues: [] as string[] },
      gdpr: { status: 'unknown', issues: [] as string[] },
      pci: { status: 'unknown', issues: [] as string[] },
    };

    let owaspIssues = 0;
    if (analyses.vulnerabilities) {
      if ((analyses.vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
        compliance.owasp.issues.push('A03: Injection (XSS)');
        owaspIssues++;
      }
      if ((analyses.vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
        compliance.owasp.issues.push('A03: Injection (SQL)');
        owaspIssues++;
      }
      if (analyses.vulnerabilities.other?.some(v => v.type === 'csrf')) {
        compliance.owasp.issues.push('A01: Broken Access Control (CSRF)');
        owaspIssues++;
      }
    }

    // 新增：CSRF 检测结果纳入 OWASP 合规判断
    if (analyses.csrf) {
      const highCsrf = (analyses.csrf.vulnerabilities || []).filter(
        v => v.severity === 'high' || v.severity === 'critical'
      );
      if (highCsrf.length > 0) {
        compliance.owasp.issues.push('A01: Broken Access Control (CSRF - 表单缺少 token)');
        owaspIssues++;
      }
    }

    // 新增：CORS 错误配置纳入 OWASP 合规判断
    if (analyses.cors) {
      const criticalCors = (analyses.cors.issues || []).filter(i => i.severity === 'critical');
      if (criticalCors.length > 0) {
        compliance.owasp.issues.push('A05: Security Misconfiguration (CORS)');
        owaspIssues++;
      }
    }

    compliance.owasp.status =
      owaspIssues === 0 ? 'compliant' : owaspIssues <= 2 ? 'partial' : 'non-compliant';

    if (analyses.ssl && analyses.ssl.enabled && analyses.ssl.score >= 80) {
      compliance.gdpr.status = 'partial';
    } else {
      compliance.gdpr.issues.push('缺少适当的数据传输加密');
      compliance.gdpr.status = 'non-compliant';
    }
    // 新增：Cookie 安全影响 GDPR 合规
    if (analyses.cookies) {
      const highCookieIssues = (analyses.cookies.issues || []).filter(
        i => i.severity === 'high' && i.attribute === 'Secure'
      );
      if (highCookieIssues.length > 0) {
        compliance.gdpr.issues.push('Cookie 未启用 Secure 属性，数据传输可能不安全');
      }
    }

    if (analyses.ssl && analyses.ssl.enabled && analyses.headers && analyses.headers.score >= 70) {
      compliance.pci.status = 'partial';
    } else {
      compliance.pci.issues.push('不满足PCI DSS基础安全要求');
      compliance.pci.status = 'non-compliant';
    }

    return compliance;
  }

  generateSecurityRecommendations(analyses: SecurityAnalyses): SecurityRecommendations {
    const recommendations: SecurityRecommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: [],
    };

    if (analyses.vulnerabilities) {
      if ((analyses.vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
        recommendations.immediate.push({
          priority: 'critical',
          issue: 'SQL注入漏洞',
          action: '立即修复所有SQL注入漏洞，使用参数化查询',
          timeframe: '24小时内',
        });
      }
      if ((analyses.vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
        recommendations.immediate.push({
          priority: 'high',
          issue: 'XSS漏洞',
          action: '对所有用户输入进行输出编码，使用CSP',
          timeframe: '48小时内',
        });
      }
    }

    if (analyses.headers && analyses.headers.missingHeaders) {
      analyses.headers.missingHeaders.forEach((header: SecurityHeaderMissing) => {
        if (header.importance === 'high') {
          recommendations.shortTerm.push({
            priority: 'medium',
            issue: `缺少安全头部: ${header.name}`,
            action: `添加 ${header.name} 头部`,
            timeframe: '1周内',
          });
        }
      });
    }

    // CSRF 相关建议
    if (analyses.csrf) {
      const csrfVulns = analyses.csrf.vulnerabilities || [];
      const highCsrf = csrfVulns.filter(v => v.severity === 'high' || v.severity === 'critical');
      if (highCsrf.length > 0) {
        recommendations.immediate.push({
          priority: 'high',
          issue: 'CSRF 防护缺失',
          action: '为所有状态变更表单添加 CSRF token，设置 SameSite Cookie 属性',
          timeframe: '48小时内',
        });
      } else if (csrfVulns.length > 0) {
        recommendations.shortTerm.push({
          priority: 'medium',
          issue: 'CSRF 防护不完整',
          action: '检查并完善 CSRF token 机制和 SameSite Cookie 配置',
          timeframe: '1周内',
        });
      }
    }

    // Cookie 安全建议
    if (analyses.cookies) {
      const cookieIssues = analyses.cookies.issues || [];
      const highCookie = cookieIssues.filter(
        i => i.severity === 'high' || i.severity === 'critical'
      );
      if (highCookie.length > 0) {
        recommendations.shortTerm.push({
          priority: 'high',
          issue: `${highCookie.length} 个 Cookie 安全配置问题`,
          action: '为敏感 Cookie 添加 HttpOnly、Secure、SameSite 属性',
          timeframe: '1周内',
        });
      }
    }

    // CORS 安全建议
    if (analyses.cors) {
      const corsIssues = analyses.cors.issues || [];
      const criticalCors = corsIssues.filter(i => i.severity === 'critical');
      const highCors = corsIssues.filter(i => i.severity === 'high');
      if (criticalCors.length > 0) {
        recommendations.immediate.push({
          priority: 'critical',
          issue: 'CORS 配置严重漏洞',
          action:
            '立即修复 CORS 配置，禁止通配符 Origin 与 Credentials 同时使用，实现 Origin 白名单',
          timeframe: '24小时内',
        });
      } else if (highCors.length > 0) {
        recommendations.shortTerm.push({
          priority: 'high',
          issue: 'CORS 配置风险',
          action: '实现严格的 Origin 白名单验证，避免反射任意 Origin',
          timeframe: '1周内',
        });
      }
    }

    // 内容安全建议（SRI / 混合内容 / HTTP 方法）
    if (analyses.contentSecurity) {
      const cs = analyses.contentSecurity;
      if (cs.mixedContent && cs.mixedContent.activeMixedContent > 0) {
        recommendations.shortTerm.push({
          priority: 'high',
          issue: `${cs.mixedContent.activeMixedContent} 个活跃混合内容`,
          action:
            '将所有 HTTP 资源引用升级为 HTTPS，添加 Content-Security-Policy: upgrade-insecure-requests',
          timeframe: '1周内',
        });
      }
      if (cs.sri && cs.sri.resourcesWithoutSri > 0) {
        recommendations.longTerm.push({
          priority: 'medium',
          issue: `${cs.sri.resourcesWithoutSri} 个外部资源缺少 SRI`,
          action: '为所有外部 JS/CSS 资源添加 integrity 属性，防止供应链攻击',
          timeframe: '1个月内',
        });
      }
      if (cs.httpMethods && cs.httpMethods.dangerousMethods.length > 0) {
        recommendations.shortTerm.push({
          priority: 'medium',
          issue: `危险 HTTP 方法已启用: ${cs.httpMethods.dangerousMethods.join(', ')}`,
          action: '在服务器配置中禁用不必要的 HTTP 方法（特别是 TRACE）',
          timeframe: '1周内',
        });
      }
    }

    recommendations.preventive.push({
      priority: 'medium',
      issue: '安全测试流程',
      action: '建立定期安全扫描和渗透测试流程',
      timeframe: '1个月内',
    });

    return recommendations;
  }

  generateThreatIntelligence(vulnerabilities: VulnerabilityAnalysis): SecurityThreatIntelligence {
    const intelligence: SecurityThreatIntelligence = {
      threatLevel: 'unknown',
      attackVectors: [] as Array<{ type: string; risk: string; description: string }>,
      mitigationStrategies: [] as string[],
      industryTrends: [] as string[],
    };

    const criticalCount = this.countCriticalVulnerabilities(vulnerabilities);
    const highCount = this.countHighRiskIssues(vulnerabilities);

    if (criticalCount > 0) {
      intelligence.threatLevel = 'critical';
    } else if (highCount > 2) {
      intelligence.threatLevel = 'high';
    } else if (highCount > 0) {
      intelligence.threatLevel = 'medium';
    } else {
      intelligence.threatLevel = 'low';
    }

    if ((vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
      intelligence.attackVectors.push({
        type: 'Cross-Site Scripting (XSS)',
        risk: 'High',
        description: '攻击者可能通过XSS攻击窃取用户凭据或执行恶意代码',
      });
    }

    if ((vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
      intelligence.attackVectors.push({
        type: 'SQL Injection',
        risk: 'Critical',
        description: '攻击者可能通过SQL注入访问或修改数据库数据',
      });
    }

    intelligence.mitigationStrategies = [
      '实施Web应用防火墙(WAF)',
      '建立入侵检测系统(IDS)',
      '定期进行安全扫描和渗透测试',
      '保持软件和依赖项更新',
      '实施最小权限原则',
    ];

    intelligence.industryTrends = [
      'XSS 和注入攻击持续是 OWASP Top 10 常见威胁',
      'API 安全问题呈上升趋势，需关注认证和授权',
      '供应链攻击（第三方依赖）成为重要攻击面',
      '零信任架构逐渐成为安全防护主流方向',
    ];

    return intelligence;
  }

  async cleanup() {
    this.cancelledTests.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    console.log('✅ 安全测试引擎清理完成');
  }
}

export default SecurityTestEngine;
