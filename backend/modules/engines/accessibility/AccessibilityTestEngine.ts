import axios from 'axios';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';
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
import { diagnoseNetworkError } from '../shared/utils/networkDiagnostics';

// ── 前端发送的配置格式（checkXxx 布尔开关 + level 字符串） ──
type FrontendAccessibilityConfig = BaseTestConfig & {
  url?: string;
  level?: 'A' | 'AA' | 'AAA';
  wcagLevel?: 'A' | 'AA' | 'AAA';
  standards?: string[];
  checks?: string[];
  // 前端 12 项布尔开关
  checkColorContrast?: boolean;
  checkKeyboardNavigation?: boolean;
  checkScreenReaders?: boolean;
  checkForms?: boolean;
  checkImages?: boolean;
  checkHeadings?: boolean;
  checkLinks?: boolean;
  checkTables?: boolean;
  checkLists?: boolean;
  checkIFrames?: boolean;
  checkLanguage?: boolean;
  checkZoom?: boolean;
  // 目标选择器
  targetSelectors?: Array<{ selector: string; label?: string }>;
  timeout?: number;
  includeWarnings?: boolean;
  testId?: string;
};

type AccessibilityRunConfig = FrontendAccessibilityConfig;

type AccessibilityConfig = {
  url: string;
  testId: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  standards: string[];
  checks: string[];
  targetSelectors: Array<{ selector: string; label?: string }>;
  timeout: number;
  includeWarnings: boolean;
};

type AccessibilityCheckResult = {
  name: string;
  description: string;
  issues: AccessibilityIssue[];
  passed: number;
  failed: number;
};

type AccessibilityIssue = {
  element?: string;
  text?: string;
  src?: string;
  type?: string;
  name?: string;
  issue?: string;
  description?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  wcagCriterion?: string;
};

type AccessibilitySummary = {
  totalIssues: number;
  errors: number;
  warnings: number;
  passed: number;
  score: number;
};

type AccessibilityResults = {
  testId: string;
  url: string;
  wcagLevel: string;
  standards?: string[];
  timestamp: string;
  checks: Record<string, AccessibilityCheckResult>;
  summary: AccessibilitySummary;
  recommendations: string[];
};

type AccessibilityNormalizedResult = {
  testId: string;
  status: TestStatus;
  score: number;
  summary: AccessibilitySummary;
  metrics: Record<string, AccessibilityCheckResult>;
  warnings: string[];
  errors: string[];
  details: AccessibilityResults;
};

type AccessibilityFinalResult = {
  engine: string;
  version: string;
  success: boolean;
  testId: string;
  results?: AccessibilityNormalizedResult;
  status: TestStatus;
  score?: number;
  summary?: AccessibilitySummary;
  warnings?: string[];
  errors?: string[];
  error?: string;
  duration?: number;
};

type AccessibilityActiveTestRecord = {
  status?: string;
  progress?: number;
  startTime?: number;
  message?: string;
  error?: string;
  lastUpdate?: number;
  results?: AccessibilityNormalizedResult;
};

type AccessibilityProgressPayload = {
  testId: string;
  progress: number;
  message: string;
  status?: string;
};

// 前端布尔开关 → 后端 checks 数组的映射
const FRONTEND_CHECK_MAP: Record<string, string> = {
  checkColorContrast: 'color-contrast',
  checkKeyboardNavigation: 'keyboard-navigation',
  checkScreenReaders: 'screen-readers',
  checkForms: 'form-labels',
  checkImages: 'alt-text',
  checkHeadings: 'headings-structure',
  checkLinks: 'links',
  checkTables: 'tables',
  checkLists: 'semantic-markup',
  checkIFrames: 'aria-attributes',
  checkLanguage: 'language',
  checkZoom: 'focus-management',
};

// 所有支持的检查项
const ALL_CHECKS = [
  'color-contrast',
  'alt-text',
  'headings-structure',
  'form-labels',
  'aria-attributes',
  'keyboard-navigation',
  'focus-management',
  'semantic-markup',
  'links',
  'tables',
  'language',
  'screen-readers',
];

// 有效的 ARIA role 值
const VALID_ARIA_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

// ARIA role 必需的状态/属性（WAI-ARIA 1.2 规范）
const ROLE_REQUIRED_ATTRS: Record<string, string[]> = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded'],
  heading: ['aria-level'],
  meter: ['aria-valuenow'],
  option: ['aria-selected'],
  radio: ['aria-checked'],
  scrollbar: ['aria-controls', 'aria-valuenow'],
  separator: [], // 仅当可聚焦时需要 aria-valuenow
  slider: ['aria-valuenow'],
  spinbutton: ['aria-valuenow'],
  switch: ['aria-checked'],
  tab: ['aria-selected'],
  treeitem: ['aria-selected'],
};

class AccessibilityTestEngine implements ITestEngine<AccessibilityRunConfig, BaseTestResult> {
  readonly type: TestEngineType;
  readonly name: string;
  readonly version: string;
  readonly capabilities: TestEngineCapabilities;
  activeTests: Map<string, AccessibilityActiveTestRecord>;
  wcagLevels: string[];
  progressCallback: ((progress: AccessibilityProgressPayload) => void) | null;
  completionCallback: ((results: AccessibilityFinalResult) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  lifecycle?: ITestEngine<AccessibilityRunConfig, BaseTestResult>['lifecycle'];
  private progressTracker: Map<string, TestProgress>;
  private abortControllers: Map<string, AbortController>;

  constructor() {
    this.type = TestEngineType.ACCESSIBILITY;
    this.name = 'accessibility';
    this.version = '3.0.0';
    this.activeTests = new Map();
    this.wcagLevels = ['A', 'AA', 'AAA'];
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.capabilities = {
      type: this.type,
      name: this.name,
      description: '无障碍测试引擎',
      version: this.version,
      supportedFeatures: ALL_CHECKS,
      requiredConfig: ['url'],
      optionalConfig: [
        'wcagLevel',
        'level',
        'checks',
        'timeout',
        'includeWarnings',
        'targetSelectors',
        'standards',
        ...Object.keys(FRONTEND_CHECK_MAP),
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
    this.abortControllers = new Map();
  }

  async initialize(): Promise<void> {
    return;
  }

  async checkAvailability() {
    return {
      engine: this.name,
      available: true,
      version: this.version,
      capabilities: this.getCapabilities(),
      dependencies: ['axios', 'cheerio'],
    };
  }

  getCapabilities() {
    return {
      supportedTests: ALL_CHECKS,
      wcagLevels: this.wcagLevels,
      maxConcurrent: 5,
      timeout: 60000,
    };
  }

  validate(config: AccessibilityRunConfig): ValidationResult {
    if (!config.url || typeof config.url !== 'string') {
      return {
        isValid: false,
        errors: ['url 是必填项'],
        warnings: [],
        suggestions: [],
      };
    }
    try {
      new URL(config.url);
    } catch {
      return {
        isValid: false,
        errors: ['url 格式无效'],
        warnings: [],
        suggestions: [],
      };
    }
    // 注入 executionTimeout：TestEngineRegistry.execute() 在调用 engine.run() 之前读取
    const cfgAny = config as Record<string, unknown>;
    const checkCount = Array.isArray(cfgAny.checks) ? (cfgAny.checks as unknown[]).length : 12;
    cfgAny.executionTimeout = Math.max(30000, checkCount * 5000);

    return { isValid: true, errors: [], warnings: [], suggestions: [] };
  }

  /**
   * 将前端配置格式转换为后端内部格式。
   * 前端发送 checkXxx 布尔开关 + level 字符串，后端需要 checks 数组 + wcagLevel。
   */
  private normalizeConfig(raw: Record<string, unknown>): AccessibilityConfig {
    // 展开 options：前端发送 { url, testType, options: { level, checkXxx, ... } }
    const rawOptions = raw.options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      raw = { ...raw, ...(rawOptions as Record<string, unknown>) };
    }

    const url = String(raw.url || '');
    const testId = String(raw.testId || '');
    if (!url) throw new Error('配置缺少 url');
    if (!testId) throw new Error('配置缺少 testId');

    // wcagLevel: 优先 level（前端字段），其次 wcagLevel（后端字段）
    const levelRaw = raw.level || raw.wcagLevel || 'AA';
    const wcagLevel = (['A', 'AA', 'AAA'].includes(String(levelRaw)) ? String(levelRaw) : 'AA') as
      | 'A'
      | 'AA'
      | 'AAA';

    // checks: 如果前端发了 checkXxx 布尔开关，转换为 checks 数组
    let checks: string[];
    if (Array.isArray(raw.checks) && raw.checks.length > 0) {
      // 直接使用 checks 数组
      checks = raw.checks.map(String).filter(c => ALL_CHECKS.includes(c));
    } else {
      // 从前端布尔开关转换
      const hasAnyCheckKey = Object.keys(FRONTEND_CHECK_MAP).some(key => key in raw);
      if (hasAnyCheckKey) {
        checks = [];
        for (const [frontKey, backendCheck] of Object.entries(FRONTEND_CHECK_MAP)) {
          if (raw[frontKey] !== false) {
            checks.push(backendCheck);
          }
        }
      } else {
        // 默认启用所有检查
        checks = [...ALL_CHECKS];
      }
    }

    // targetSelectors
    const targetSelectors: Array<{ selector: string; label?: string }> = [];
    if (Array.isArray(raw.targetSelectors)) {
      for (const item of raw.targetSelectors) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as { selector?: unknown }).selector === 'string'
        ) {
          targetSelectors.push(item as { selector: string; label?: string });
        }
      }
    }

    // standards: WCAG 标准版本列表
    let standards: string[] = ['WCAG2.1'];
    if (Array.isArray(raw.standards) && raw.standards.length > 0) {
      standards = raw.standards.map(String).filter(Boolean);
    }

    const timeout = typeof raw.timeout === 'number' && raw.timeout >= 1000 ? raw.timeout : 60000;
    const includeWarnings = raw.includeWarnings !== false;

    return { url, testId, wcagLevel, standards, checks, targetSelectors, timeout, includeWarnings };
  }

  async run(
    config: AccessibilityRunConfig,
    onProgress?: (progress: TestProgress) => void
  ): Promise<BaseTestResult> {
    const metadata = (config.metadata || {}) as Record<string, unknown>;
    const metadataTestId = typeof metadata.testId === 'string' ? metadata.testId : undefined;
    const configTestId = (config as { testId?: string }).testId;
    const testId = configTestId || metadataTestId;
    if (!testId) {
      throw new Error('测试配置缺少 testId');
    }

    // 创建 AbortController 以支持取消
    const ac = new AbortController();
    this.abortControllers.set(testId, ac);

    const startTime = new Date();
    const initialProgress: TestProgress = {
      status: TestStatus.PREPARING,
      progress: 0,
      currentStep: '准备无障碍测试环境',
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
      } as Record<string, unknown>);
      const endTime = new Date();
      const a11yScore = result.results?.score ?? 0;
      const a11yGrade =
        a11yScore >= 90
          ? 'A'
          : a11yScore >= 80
            ? 'B'
            : a11yScore >= 60
              ? 'C'
              : a11yScore >= 40
                ? 'D'
                : 'F';
      const a11ySummaryData = result.results?.summary;
      const structuredSummary = {
        score: a11yScore,
        grade: a11yGrade,
        passed: a11yScore >= 60,
        totalIssues: a11ySummaryData?.totalIssues ?? 0,
        errors: a11ySummaryData?.errors ?? 0,
        warnings: a11ySummaryData?.warnings ?? 0,
        passedChecks: a11ySummaryData?.passed ?? 0,
      };
      const baseResult: BaseTestResult = {
        testId,
        engineType: this.type,
        status: result.success ? TestStatus.COMPLETED : TestStatus.FAILED,
        score: a11yScore,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: structuredSummary as unknown as string,
        details: { ...result },
        errors: result.success ? [] : [String(result.error || '无障碍测试失败')],
        warnings: result.results?.warnings || [],
        recommendations: result.results?.details?.recommendations || [],
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
        summary: '无障碍测试失败',
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
    const ac = this.abortControllers.get(testId);
    if (ac && !ac.signal.aborted) {
      ac.abort();
    }
    await this.stopTest(testId);
  }

  getStatus(testId: string): TestProgress {
    const progress = this.progressTracker.get(testId);
    if (progress) return progress;
    return {
      status: TestStatus.IDLE,
      progress: 0,
      currentStep: 'idle',
      startTime: new Date(),
      messages: [],
    };
  }

  estimateDuration(config: AccessibilityRunConfig): number {
    let checks = config.checks?.length ?? 0;
    if (checks === 0) {
      // 从前端布尔开关计算启用的检查数量
      const cfgAny = config as Record<string, unknown>;
      const hasAnyKey = Object.keys(FRONTEND_CHECK_MAP).some(k => k in cfgAny);
      if (hasAnyKey) {
        checks = Object.keys(FRONTEND_CHECK_MAP).filter(k => cfgAny[k] !== false).length;
      } else {
        checks = ALL_CHECKS.length; // 默认全部启用
      }
    }
    return Math.max(5000, checks * 2000);
  }

  getDependencies(): TestEngineType[] {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getMetrics(): Record<string, unknown> {
    return { activeTests: this.activeTests.size };
  }

  async executeTest(config: Record<string, unknown>) {
    return this.runAccessibilityTest(config);
  }

  async runAccessibilityTest(rawConfig: Record<string, unknown>) {
    const config = this.normalizeConfig(rawConfig);
    const testId = config.testId;
    const ac = this.abortControllers.get(testId);
    const signal = ac?.signal;

    try {
      this.activeTests.set(testId, {
        status: TestStatus.RUNNING,
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 5, '开始可访问性测试');

      const results = await this.performAccessibilityTests(config, testId, signal);

      // 如果被取消，抛出错误
      if (signal?.aborted) {
        throw new Error('测试已取消');
      }

      this.updateTestProgress(testId, 100, '测试完成');

      const warnings: string[] = [];
      const errors: string[] = [];
      Object.values(results.checks).forEach(check => {
        if (!check) return;
        (check.issues || []).forEach(issue => {
          const severity = issue.severity || 'warning';
          const msg = issue.issue || issue.description;
          if (!msg) return;
          if (severity === 'error' || severity === 'critical') {
            errors.push(String(msg));
          } else if (severity === 'warning') {
            warnings.push(String(msg));
          }
        });
      });

      const normalizedResult: AccessibilityNormalizedResult = {
        testId,
        status: TestStatus.COMPLETED,
        score: results.summary.score,
        summary: results.summary,
        metrics: results.checks,
        warnings,
        errors,
        details: results,
      };

      const finalResult: AccessibilityFinalResult = {
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
        duration: Date.now() - ((this.activeTests.get(testId)?.startTime as number) || 0),
      };

      this.updateTestProgress(testId, 100, '可访问性测试完成');

      this.activeTests.set(testId, {
        status: TestStatus.COMPLETED,
        progress: 100,
        results: normalizedResult,
      });

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
      const message = diagnoseNetworkError(error, '无障碍测试', config.url);
      const errorResult: AccessibilityFinalResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        error: rawMessage,
        status: TestStatus.FAILED,
        score: 0,
        summary: { totalIssues: 0, errors: 0, warnings: 0, passed: 0, score: 0 },
        warnings: [],
        errors: [message],
      };

      this.activeTests.set(testId, { status: TestStatus.FAILED, error: rawMessage });

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

  // ── 核心测试执行 ──

  async performAccessibilityTests(
    config: AccessibilityConfig,
    testId: string,
    signal?: AbortSignal
  ): Promise<AccessibilityResults> {
    this.updateTestProgress(testId, 10, '获取页面内容');

    const response = await axios.get(config.url, {
      timeout: config.timeout,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityBot/3.0)' },
      signal,
      maxContentLength: 10 * 1024 * 1024, // 10MB
    });

    if (signal?.aborted) throw new Error('测试已取消');

    const html = typeof response.data === 'string' ? response.data : String(response.data);
    let $ = cheerio.load(html) as CheerioAPI;

    // 如果有 targetSelectors，限定检查范围
    if (config.targetSelectors.length > 0) {
      const fragments: string[] = [];
      for (const sel of config.targetSelectors) {
        $(sel.selector).each((_, el) => {
          fragments.push($.html(el) || '');
        });
      }
      if (fragments.length > 0) {
        $ = cheerio.load(fragments.join('\n')) as CheerioAPI;
      }
    }

    const results: AccessibilityResults = {
      testId,
      url: config.url,
      wcagLevel: config.wcagLevel,
      standards: config.standards,
      timestamp: new Date().toISOString(),
      checks: {},
      summary: { totalIssues: 0, errors: 0, warnings: 0, passed: 0, score: 0 },
      recommendations: [],
    };

    const checkList = config.checks;
    const progressStep = checkList.length > 0 ? 70 / checkList.length : 70;
    let currentProgress = 20;

    const checkMap: Record<
      string,
      () => AccessibilityCheckResult | Promise<AccessibilityCheckResult>
    > = {
      'color-contrast': () => this.checkColorContrast($, config.wcagLevel),
      'alt-text': () => this.checkAltText($, config.wcagLevel),
      'headings-structure': () => this.checkHeadingsStructure($),
      'form-labels': () => this.checkFormLabels($),
      'aria-attributes': () => this.checkAriaAttributes($),
      'keyboard-navigation': () => this.checkKeyboardNavigation($),
      'focus-management': () => this.checkFocusManagement($),
      'semantic-markup': () => this.checkSemanticMarkup($),
      links: () => this.checkLinks($, config.wcagLevel),
      tables: () => this.checkTables($),
      language: () => this.checkLanguage($, config.wcagLevel),
      'screen-readers': () => this.checkScreenReaders($, config.wcagLevel),
    };

    for (const check of checkList) {
      if (signal?.aborted) throw new Error('测试已取消');

      this.updateTestProgress(testId, Math.round(currentProgress), `执行 ${check} 检查`);

      const fn = checkMap[check];
      if (fn) {
        const key = check.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        try {
          results.checks[key] = await fn();
        } catch (checkError) {
          const msg = checkError instanceof Error ? checkError.message : String(checkError);
          results.checks[key] = {
            name: check,
            description: `${check} 检查异常`,
            issues: [{ issue: `检查执行失败: ${msg}`, severity: 'error' as const }],
            passed: 0,
            failed: 1,
          };
        }
      }

      currentProgress += progressStep;
    }

    // ── Puppeteer 真实浏览器动态检测（焦点管理、键盘导航、ARIA 动态状态） ──
    const _cfgRaw = config as unknown as Record<string, unknown>;
    if (typeof _cfgRaw.engineMode === 'string') {
      puppeteerPool.applyEngineMode(_cfgRaw.engineMode);
    }
    try {
      const browserChecks = await this.performBrowserAccessibilityChecks(
        config,
        testId,
        _cfgRaw.showBrowser === true
      );
      if (browserChecks) {
        for (const [key, check] of Object.entries(browserChecks) as Array<
          [string, AccessibilityCheckResult]
        >) {
          const existing = results.checks[key];
          if (existing) {
            existing.issues.push(...check.issues);
            existing.passed += check.passed;
            existing.failed += check.failed;
          } else {
            results.checks[key] = check;
          }
        }
      }
    } catch {
      // 浏览器检测失败不影响静态分析结果
    }

    if (!config.includeWarnings) {
      Object.values(results.checks).forEach(check => {
        check.issues = check.issues.filter(
          issue => issue.severity === 'error' || issue.severity === 'critical'
        );
      });
    }

    // 截断每个检查项的 issues 详情（防止巨型 DOM 导致结果对象过大）
    const MAX_ISSUES_PER_CHECK = 30;
    Object.values(results.checks).forEach(check => {
      if (check.issues.length > MAX_ISSUES_PER_CHECK) {
        const total = check.issues.length;
        check.issues = check.issues.slice(0, MAX_ISSUES_PER_CHECK);
        check.issues.push({
          issue: `… 共 ${total} 个问题，仅显示前 ${MAX_ISSUES_PER_CHECK} 个`,
          severity: 'info',
        });
      }
    });

    results.summary = this.calculateAccessibilityScore(results.checks);
    results.recommendations = this.generateRecommendations(results.checks, config.includeWarnings);

    return results;
  }

  // ── 原有 8 项检查（保留并增强） ──

  checkColorContrast($: CheerioAPI, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA') {
    const result: AccessibilityCheckResult = {
      name: '颜色对比度',
      description: 'WCAG 颜色对比度要求检查',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const textElements = $('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th');

    textElements.each((_, el) => {
      const $el = $(el);
      const text = ($el.text ? $el.text() : '').trim();
      if (!text) return;

      const style = this.parseInlineStyle($el.attr?.('style'));
      const color = this.parseColor(style.color);
      const bg = this.parseColor(style['background-color'] || style.backgroundColor);

      // 也检查 class 中的常见颜色模式
      const classAttr = $el.attr?.('class') || '';
      const classBg = this.parseColorFromClass(classAttr, 'bg');
      const classText = this.parseColorFromClass(classAttr, 'text');

      const fgColor = color || classText;
      const bgColor = bg || classBg;

      if (!fgColor || !bgColor) {
        // 无法从内联样式/class 获取颜色，跳过（由 Puppeteer 动态检测补充）
        return;
      }

      const contrast = this.calculateContrastRatio(fgColor, bgColor);
      const threshold = this.getContrastThreshold(wcagLevel);
      if (contrast >= threshold) {
        result.passed++;
      } else {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          text: text.substring(0, 50),
          issue: `颜色对比度不足 (${contrast.toFixed(2)}:1，要求 ${threshold}:1)`,
          severity: 'error',
          wcagCriterion: '1.4.3',
        });
      }
    });

    return result;
  }

  checkAltText($: CheerioAPI, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA') {
    const result: AccessibilityCheckResult = {
      name: '图片Alt属性',
      description: '检查图片是否有适当的Alt属性',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('img').each((_, el) => {
      const $img = $(el);
      const alt = $img.attr?.('alt');
      const src = $img.attr?.('src') || 'unknown';
      const role = $img.attr?.('role');

      // role="presentation" 或 role="none" 的装饰性图片不需要 alt
      if (role === 'presentation' || role === 'none') {
        result.passed++;
        return;
      }

      if (alt === undefined || alt === null) {
        result.failed++;
        result.issues.push({
          element: 'img',
          src,
          issue: '缺少 alt 属性',
          severity: 'error',
          wcagCriterion: '1.1.1',
        });
      } else if (alt.trim() === '') {
        // 空 alt 表示装饰性图片
        if (wcagLevel === 'AAA') {
          // AAA 级别：装饰性图片应显式标注 role="presentation"
          result.issues.push({
            element: 'img',
            src,
            issue: '空 alt 图片建议添加 role="presentation" 明确标识为装饰性图片 (AAA)',
            severity: 'info',
            wcagCriterion: '1.1.1',
          });
        }
        result.passed++;
      } else {
        result.passed++;
      }
    });

    // 检查 <input type="image">
    $('input[type="image"]').each((_, el) => {
      const $el = $(el);
      const alt = $el.attr?.('alt');
      if (!alt || alt.trim() === '') {
        result.failed++;
        result.issues.push({
          element: 'input[type=image]',
          issue: '图片按钮缺少 alt 属性',
          severity: 'error',
          wcagCriterion: '1.1.1',
        });
      } else {
        result.passed++;
      }
    });

    // 检查 <svg> 是否有 title 或 aria-label
    $('svg').each((_, el) => {
      const $svg = $(el);
      const hasTitle = ($svg.find('title').length || 0) > 0;
      const hasAriaLabel = $svg.attr?.('aria-label');
      const role = $svg.attr?.('role');
      if (role === 'presentation' || role === 'none') {
        result.passed++;
      } else if (!hasTitle && !hasAriaLabel) {
        result.failed++;
        result.issues.push({
          element: 'svg',
          issue: 'SVG 缺少 <title> 或 aria-label',
          severity: 'warning',
          wcagCriterion: '1.1.1',
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkHeadingsStructure($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '标题结构',
      description: '检查标题层级结构是否合理',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const headings = $('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    let h1Count = 0;

    headings.each((_, el) => {
      const tag = ((el as { tagName?: string }).tagName || 'h0').toLowerCase();
      const currentLevel = parseInt(tag.charAt(1), 10);
      const text = ($(el).text?.() || '').trim();

      if (currentLevel === 1) h1Count++;

      if (previousLevel > 0 && currentLevel > previousLevel + 1) {
        result.failed++;
        result.issues.push({
          element: tag,
          text: text.substring(0, 50),
          issue: `标题层级跳跃：从 h${previousLevel} 直接跳到 h${currentLevel}`,
          severity: 'warning',
          wcagCriterion: '1.3.1',
        });
      } else {
        result.passed++;
      }

      if (text === '') {
        result.failed++;
        result.issues.push({
          element: tag,
          issue: '标题元素内容为空',
          severity: 'warning',
          wcagCriterion: '1.3.1',
        });
      }

      previousLevel = currentLevel;
    });

    if (h1Count === 0 && (headings.length || 0) > 0) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: '页面缺少 h1 标题',
        severity: 'error',
        wcagCriterion: '1.3.1',
      });
    } else if (h1Count > 1) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: `页面有 ${h1Count} 个 h1 标题，建议只保留一个`,
        severity: 'warning',
        wcagCriterion: '1.3.1',
      });
    }

    return result;
  }

  checkFormLabels($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '表单标签',
      description: '检查表单控件是否有适当的标签',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('input, select, textarea').each((_, el) => {
      const $el = $(el);
      const type = $el.attr?.('type');
      const id = $el.attr?.('id');
      const name = $el.attr?.('name');

      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') return;

      const hasLabel = id ? ($(`label[for="${id}"]`).length || 0) > 0 : false;
      const hasAriaLabel = !!$el.attr?.('aria-label');
      const hasAriaLabelledby = !!$el.attr?.('aria-labelledby');
      const hasTitle = !!$el.attr?.('title');
      const hasPlaceholder = !!$el.attr?.('placeholder');

      if (hasLabel || hasAriaLabel || hasAriaLabelledby) {
        result.passed++;
      } else if (hasTitle) {
        result.passed++;
        // title 可作为后备但不如 label 理想
        if (hasPlaceholder && !hasLabel) {
          result.issues.push({
            element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
            name: name || 'unnamed',
            issue: '仅使用 title + placeholder 作为标签，建议添加 label 或 aria-label',
            severity: 'info',
            wcagCriterion: '1.3.1',
          });
        }
      } else if (hasPlaceholder) {
        // placeholder 不能替代 label
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          name: name || 'unnamed',
          issue: '仅使用 placeholder 作为标签，placeholder 不能替代 label',
          severity: 'warning',
          wcagCriterion: '1.3.1',
        });
      } else {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          type: type || 'text',
          name: name || 'unnamed',
          issue: '表单控件缺少标签（label、aria-label 或 aria-labelledby）',
          severity: 'error',
          wcagCriterion: '1.3.1',
        });
      }
    });

    return result;
  }

  checkAriaAttributes($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: 'ARIA属性',
      description: '检查ARIA属性的正确使用',
      issues: [],
      passed: 0,
      failed: 0,
    };

    // 检查 role 值是否有效 + 必需属性是否存在
    $('[role]').each((_, el) => {
      const $el = $(el);
      const role = ($el.attr?.('role') || '').trim().toLowerCase();
      if (!role) return;
      const tag = ((el as { tagName?: string }).tagName || '').toLowerCase();

      if (!VALID_ARIA_ROLES.has(role)) {
        result.failed++;
        result.issues.push({
          element: tag,
          issue: `无效的 role 值: "${role}"`,
          severity: 'error',
          wcagCriterion: '4.1.2',
        });
        return;
      }

      // 检查该 role 的必需 ARIA 属性
      const requiredAttrs = ROLE_REQUIRED_ATTRS[role];
      if (requiredAttrs && requiredAttrs.length > 0) {
        const missing = requiredAttrs.filter(attr => $el.attr?.(attr) == null);
        if (missing.length > 0) {
          result.failed++;
          result.issues.push({
            element: tag,
            issue: `role="${role}" 缺少必需属性: ${missing.join(', ')}`,
            severity: 'error',
            wcagCriterion: '4.1.2',
          });
        } else {
          result.passed++;
        }
      } else {
        result.passed++;
      }
    });

    // 检查 aria-hidden="true" 的元素不应包含可聚焦子元素
    $('[aria-hidden="true"]').each((_, el) => {
      const $el = $(el);
      const focusable = $el.find('a[href], button, input, select, textarea, [tabindex]');
      if ((focusable.length || 0) > 0) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: 'aria-hidden="true" 的元素包含可聚焦子元素',
          severity: 'error',
          wcagCriterion: '4.1.2',
        });
      }
    });

    // 检查可点击的非交互元素
    $('div[onclick], span[onclick]').each((_, el) => {
      const $el = $(el);
      const hasRole = $el.attr?.('role');
      const hasTabindex = $el.attr?.('tabindex');

      if (!hasRole) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '可点击元素缺少 role 属性（如 role="button"）',
          severity: 'error',
          wcagCriterion: '4.1.2',
        });
      } else {
        result.passed++;
      }

      if (!hasTabindex) {
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '可点击元素缺少 tabindex，键盘用户无法访问',
          severity: 'warning',
          wcagCriterion: '2.1.1',
        });
      }
    });

    // 检查 aria-labelledby 引用的 ID 是否存在
    $('[aria-labelledby]').each((_, el) => {
      const $el = $(el);
      const ids = ($el.attr?.('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      for (const id of ids) {
        if (($(`#${id}`).length || 0) === 0) {
          result.failed++;
          result.issues.push({
            element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
            issue: `aria-labelledby 引用了不存在的 ID: "${id}"`,
            severity: 'error',
            wcagCriterion: '1.3.1',
          });
        }
      }
    });

    return result;
  }

  checkKeyboardNavigation($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '键盘导航',
      description: '检查键盘导航支持',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const focusableElements = $('a, button, input, select, textarea, [tabindex]');

    focusableElements.each((_, el) => {
      const $el = $(el);
      const tabindex = $el.attr?.('tabindex');
      const tag = ((el as { tagName?: string }).tagName || '').toLowerCase();

      if (tabindex === '-1' && !['button', 'a'].includes(tag)) {
        result.failed++;
        result.issues.push({
          element: tag,
          issue: '元素设置了 tabindex="-1"，无法通过 Tab 键访问',
          severity: 'warning',
          wcagCriterion: '2.1.1',
        });
      } else if (tabindex && parseInt(tabindex, 10) > 0) {
        result.issues.push({
          element: tag,
          issue: `tabindex="${tabindex}" > 0，可能导致不可预期的焦点顺序`,
          severity: 'warning',
          wcagCriterion: '2.4.3',
        });
        result.passed++;
      } else {
        result.passed++;
      }
    });

    // 检查 accesskey 冲突
    const accessKeys = new Map<string, number>();
    $('[accesskey]').each((_, el) => {
      const key = ($(el).attr?.('accesskey') || '').toLowerCase();
      if (key) accessKeys.set(key, (accessKeys.get(key) || 0) + 1);
    });
    for (const [key, count] of accessKeys) {
      if (count > 1) {
        result.issues.push({
          element: 'page',
          issue: `accesskey="${key}" 被 ${count} 个元素重复使用`,
          severity: 'warning',
          wcagCriterion: '2.1.1',
        });
      }
    }

    return result;
  }

  checkFocusManagement($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '焦点管理',
      description: '检查焦点指示器和管理',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const focusable = $('a, button, input, select, textarea, [tabindex]');
    focusable.each((_, el) => {
      const $el = $(el);
      const style = this.parseInlineStyle($el.attr?.('style'));
      const outline = style.outline || style['outline-style'];
      if (outline && (outline.includes('none') || outline === '0')) {
        result.failed++;
        result.issues.push({
          element: ((el as { tagName?: string }).tagName || '').toLowerCase(),
          issue: '元素禁用了焦点样式 (outline: none)，键盘用户无法看到焦点位置',
          severity: 'error',
          wcagCriterion: '2.4.7',
        });
      } else {
        result.passed++;
      }
    });

    return result;
  }

  checkSemanticMarkup($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '语义化标记',
      description: '检查HTML语义化标记的使用',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const semanticElements = ['main', 'nav', 'section', 'article', 'aside', 'header', 'footer'];
    const found: string[] = [];
    const missing: string[] = [];

    semanticElements.forEach(element => {
      if (($(`${element}`).length || 0) > 0) {
        result.passed++;
        found.push(element);
      } else {
        missing.push(element);
      }
    });

    if (missing.length > 0 && found.length < 3) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: `缺少语义化元素: ${missing.join(', ')}`,
        severity: 'warning',
      });
    }

    const divCount = $('div').length || 0;
    const totalElements = $('*').length || 0;

    if (totalElements > 10 && divCount > totalElements * 0.4) {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: `div 元素占比过高 (${Math.round((divCount / totalElements) * 100)}%)，建议使用语义化元素`,
        severity: 'warning',
      });
    }

    // 检查是否使用了 <b>/<i> 而非 <strong>/<em>
    const bCount = $('b').length || 0;
    const iCount = $('i').length || 0;
    if (bCount > 0) {
      result.issues.push({
        element: 'b',
        issue: `使用了 ${bCount} 个 <b> 标签，建议使用 <strong> 表示重要性`,
        severity: 'info',
      });
    }
    if (iCount > 0) {
      result.issues.push({
        element: 'i',
        issue: `使用了 ${iCount} 个 <i> 标签，建议使用 <em> 表示强调`,
        severity: 'info',
      });
    }

    // ── Landmark Region 深度验证 ──

    // <main> 应唯一（WCAG 最佳实践）
    const mainCount = $('main, [role="main"]').length || 0;
    if (mainCount === 0) {
      result.failed++;
      result.issues.push({
        element: 'main',
        issue: '页面缺少 <main> 或 role="main" 地标，屏幕阅读器用户无法快速定位主内容',
        severity: 'error',
        wcagCriterion: '1.3.1',
      });
    } else if (mainCount > 1) {
      result.failed++;
      result.issues.push({
        element: 'main',
        issue: `页面包含 ${mainCount} 个 <main> 地标，建议仅保留一个主内容区域`,
        severity: 'warning',
        wcagCriterion: '1.3.1',
      });
    } else {
      result.passed++;
    }

    // 多个同名 landmark 应有 aria-label 区分
    const landmarkSelectors: Record<string, string> = {
      nav: 'nav, [role="navigation"]',
      aside: 'aside, [role="complementary"]',
      section: 'section[aria-labelledby], section[aria-label], [role="region"]',
      form: 'form, [role="form"]',
    };
    for (const [name, selector] of Object.entries(landmarkSelectors)) {
      const elements = $(selector);
      if ((elements.length || 0) > 1) {
        let unlabeled = 0;
        elements.each((_, el) => {
          const $el = $(el);
          if (!$el.attr?.('aria-label') && !$el.attr?.('aria-labelledby')) {
            unlabeled++;
          }
        });
        if (unlabeled > 1) {
          result.issues.push({
            element: name,
            issue: `页面有 ${elements.length} 个 <${name}> 地标，其中 ${unlabeled} 个缺少 aria-label，屏幕阅读器用户无法区分`,
            severity: 'warning',
            wcagCriterion: '1.3.1',
          });
        }
      }
    }

    // banner (header) 和 contentinfo (footer) 检测
    const hasBanner = ($('header, [role="banner"]').length || 0) > 0;
    const hasContentinfo = ($('footer, [role="contentinfo"]').length || 0) > 0;
    if (!hasBanner) {
      result.issues.push({
        element: 'header',
        issue: '页面缺少 <header> 或 role="banner" 地标',
        severity: 'info',
        wcagCriterion: '1.3.1',
      });
    }
    if (!hasContentinfo) {
      result.issues.push({
        element: 'footer',
        issue: '页面缺少 <footer> 或 role="contentinfo" 地标',
        severity: 'info',
        wcagCriterion: '1.3.1',
      });
    }

    return result;
  }

  // ── 新增 4 项检查 ──

  checkLinks($: CheerioAPI, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA') {
    const result: AccessibilityCheckResult = {
      name: '链接可访问性',
      description: '检查链接是否有意义且可访问',
      issues: [],
      passed: 0,
      failed: 0,
    };

    const vagueTexts = new Set([
      '点击这里',
      '这里',
      '更多',
      '详情',
      'click here',
      'here',
      'more',
      'read more',
      'learn more',
    ]);

    $('a').each((_, el) => {
      const $a = $(el);
      const href = $a.attr?.('href');
      const text = ($a.text?.() || '').trim();
      const ariaLabel = $a.attr?.('aria-label');
      const title = $a.attr?.('title');
      const img = $a.find('img[alt]');
      const effectiveText =
        ariaLabel || text || (img.length ? img.attr?.('alt') : '') || title || '';

      // 空链接
      if (!href || href === '#' || href === 'javascript:void(0)' || href === 'javascript:;') {
        if (!$a.attr?.('role') && !$a.attr?.('onclick')) {
          result.failed++;
          result.issues.push({
            element: 'a',
            text: text.substring(0, 50) || '(空)',
            issue: `链接 href 无效: "${href || '(空)'}"`,
            severity: 'warning',
            wcagCriterion: '2.4.4',
          });
        }
      }

      // 无文本链接
      if (!effectiveText) {
        result.failed++;
        result.issues.push({
          element: 'a',
          issue: '链接没有可识别的文本内容',
          severity: 'error',
          wcagCriterion: '2.4.4',
        });
        return;
      }

      // 模糊链接文本
      if (vagueTexts.has(effectiveText.toLowerCase())) {
        // AAA 级别 (2.4.9)：链接目的仅从链接文本即可理解，模糊文本升级为 error
        const linkSeverity = wcagLevel === 'AAA' ? ('error' as const) : ('warning' as const);
        result.failed++;
        result.issues.push({
          element: 'a',
          text: effectiveText.substring(0, 50),
          issue: `链接文本不具描述性: "${effectiveText}"${wcagLevel === 'AAA' ? ' (WCAG 2.4.9 要求链接目的仅从文本即可理解)' : ''}`,
          severity: linkSeverity,
          wcagCriterion: wcagLevel === 'AAA' ? '2.4.9' : '2.4.4',
        });
      } else {
        result.passed++;
      }

      // 新窗口打开但没有提示
      const target = $a.attr?.('target');
      if (
        target === '_blank' &&
        !ariaLabel?.includes('新窗口') &&
        !ariaLabel?.includes('new window') &&
        !title?.includes('新窗口')
      ) {
        result.issues.push({
          element: 'a',
          text: effectiveText.substring(0, 50),
          issue: '链接在新窗口打开但未提示用户',
          severity: 'warning',
          wcagCriterion: '3.2.5',
        });
      }
    });

    return result;
  }

  checkTables($: CheerioAPI) {
    const result: AccessibilityCheckResult = {
      name: '表格可访问性',
      description: '检查数据表格是否有适当的标记',
      issues: [],
      passed: 0,
      failed: 0,
    };

    $('table').each((_, el) => {
      const $table = $(el);
      const role = $table.attr?.('role');

      // 布局表格跳过
      if (role === 'presentation' || role === 'none') {
        result.passed++;
        return;
      }

      // 检查 caption 或 aria-label
      const hasCaption = ($table.find('caption').length || 0) > 0;
      const hasAriaLabel = !!$table.attr?.('aria-label');
      const hasAriaLabelledby = !!$table.attr?.('aria-labelledby');
      const hasSummary = !!$table.attr?.('summary');

      if (!hasCaption && !hasAriaLabel && !hasAriaLabelledby && !hasSummary) {
        result.failed++;
        result.issues.push({
          element: 'table',
          issue: '数据表格缺少 <caption>、aria-label 或 summary',
          severity: 'warning',
          wcagCriterion: '1.3.1',
        });
      } else {
        result.passed++;
      }

      // 检查 <th>
      const thCount = $table.find('th').length || 0;
      if (thCount === 0) {
        result.failed++;
        result.issues.push({
          element: 'table',
          issue: '数据表格缺少 <th> 表头单元格',
          severity: 'error',
          wcagCriterion: '1.3.1',
        });
      } else {
        result.passed++;
        // 检查 th 是否有 scope
        $table.find('th').each((_, thEl) => {
          const scope = $(thEl).attr?.('scope');
          if (!scope) {
            result.issues.push({
              element: 'th',
              text: ($(thEl).text?.() || '').trim().substring(0, 30),
              issue: '<th> 缺少 scope 属性（col 或 row）',
              severity: 'info',
              wcagCriterion: '1.3.1',
            });
          }
        });
      }
    });

    return result;
  }

  checkLanguage($: CheerioAPI, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA') {
    const result: AccessibilityCheckResult = {
      name: '语言标记',
      description: '检查页面语言标记是否正确',
      issues: [],
      passed: 0,
      failed: 0,
    };

    // 检查 <html lang>
    const htmlLang = $('html').attr?.('lang');
    if (!htmlLang || htmlLang.trim() === '') {
      result.failed++;
      result.issues.push({
        element: 'html',
        issue: '<html> 缺少 lang 属性，屏幕阅读器无法确定页面语言',
        severity: 'error',
        wcagCriterion: '3.1.1',
      });
    } else {
      // 验证 lang 格式
      const langPattern = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
      if (langPattern.test(htmlLang.trim())) {
        result.passed++;
      } else {
        result.issues.push({
          element: 'html',
          issue: `lang 属性值格式可能不正确: "${htmlLang}"`,
          severity: 'warning',
          wcagCriterion: '3.1.1',
        });
      }
    }

    // 检查 dir 属性（RTL 语言）
    const rtlLangs = ['ar', 'he', 'fa', 'ur'];
    if (htmlLang && rtlLangs.some(l => htmlLang.startsWith(l))) {
      const dir = $('html').attr?.('dir');
      if (dir !== 'rtl') {
        result.issues.push({
          element: 'html',
          issue: `RTL 语言 (${htmlLang}) 缺少 dir="rtl" 属性`,
          severity: 'warning',
          wcagCriterion: '1.3.2',
        });
      }
    }

    // 检查 <meta charset>
    const hasCharset =
      ($('meta[charset]').length || 0) > 0 ||
      ($('meta[http-equiv="Content-Type"]').length || 0) > 0;
    if (hasCharset) {
      result.passed++;
    } else {
      result.issues.push({
        element: 'head',
        issue: '缺少字符编码声明 (<meta charset="utf-8">)',
        severity: 'warning',
        wcagCriterion: '3.1.1',
      });
    }

    // 检查 <title>
    const title = $('title').text?.()?.trim();
    if (!title) {
      result.failed++;
      result.issues.push({
        element: 'head',
        issue: '页面缺少 <title> 标签',
        severity: 'error',
        wcagCriterion: '2.4.2',
      });
    } else {
      result.passed++;
    }

    // AAA 级别 (3.1.2)：检查页面内是否有不同语言的内容段落未标注 lang
    if (wcagLevel === 'AAA' && htmlLang) {
      const foreignPatterns = [
        { lang: 'en', pattern: /[a-zA-Z]{20,}/ },
        { lang: 'zh', pattern: /[\u4e00-\u9fff]{5,}/ },
        { lang: 'ja', pattern: /[\u3040-\u309f\u30a0-\u30ff]{3,}/ },
        { lang: 'ko', pattern: /[\uac00-\ud7af]{3,}/ },
      ];
      const pageLangPrefix = htmlLang.split('-')[0].toLowerCase();
      let foreignContentCount = 0;

      $('p, span, div, li, td, th, h1, h2, h3, h4, h5, h6').each((_, el) => {
        const $el = $(el);
        if ($el.attr?.('lang')) return; // 已标注 lang
        const text = ($el.text?.() || '').trim();
        if (!text || text.length < 10) return;

        for (const fp of foreignPatterns) {
          if (fp.lang !== pageLangPrefix && fp.pattern.test(text)) {
            foreignContentCount++;
            break;
          }
        }
      });

      if (foreignContentCount > 3) {
        result.issues.push({
          element: 'page',
          issue: `检测到 ${foreignContentCount} 个可能包含非 ${htmlLang} 语言内容的元素未标注 lang 属性 (WCAG 3.1.2)`,
          severity: 'warning',
          wcagCriterion: '3.1.2',
        });
      }
    }

    return result;
  }

  checkScreenReaders($: CheerioAPI, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA') {
    const result: AccessibilityCheckResult = {
      name: '屏幕阅读器兼容性',
      description: '检查屏幕阅读器相关的可访问性特征',
      issues: [],
      passed: 0,
      failed: 0,
    };

    // 检查 aria-live 区域
    const liveRegions = $('[aria-live]');
    if ((liveRegions.length || 0) > 0) {
      result.passed++;
    }

    // 检查 role="alert" / role="status"
    const alertRegions = $('[role="alert"], [role="status"]');
    if ((alertRegions.length || 0) > 0) {
      result.passed++;
    }

    // 检查 skip navigation link
    const skipLink = $('a[href^="#"]').first();
    const firstLink = $('a').first();
    const hasSkipNav =
      skipLink.length > 0 &&
      firstLink.length > 0 &&
      skipLink.get(0) === firstLink.get(0) &&
      (skipLink.text?.() || '').toLowerCase().includes('skip');

    if (!hasSkipNav) {
      // 也检查 class 包含 skip 的链接
      const skipByClass = $('a.skip-link, a.skip-nav, a.skip-to-content, a.sr-only');
      if ((skipByClass.length || 0) === 0) {
        // AAA 级别下 skip navigation 缺失升级为 error
        result.failed++;
        result.issues.push({
          element: 'page',
          issue: '缺少跳转导航链接 (skip navigation)，键盘用户需要多次 Tab 才能到达主内容',
          severity: wcagLevel === 'AAA' ? 'error' : 'warning',
          wcagCriterion: '2.4.1',
        });
      } else {
        result.passed++;
      }
    } else {
      result.passed++;
    }

    // 检查 sr-only / visually-hidden 类的使用
    const srOnly = $('.sr-only, .visually-hidden, .screen-reader-text');
    if ((srOnly.length || 0) > 0) {
      result.passed++;
    }

    // 检查 <main> landmark
    if (($('main, [role="main"]').length || 0) > 0) {
      result.passed++;
    } else {
      result.failed++;
      result.issues.push({
        element: 'page',
        issue: '缺少 <main> 或 role="main" 地标，屏幕阅读器用户难以定位主内容',
        severity: 'warning',
        wcagCriterion: '1.3.1',
      });
    }

    // 检查 <nav> landmark
    if (($('nav, [role="navigation"]').length || 0) > 0) {
      result.passed++;
    } else {
      result.issues.push({
        element: 'page',
        issue: '缺少 <nav> 或 role="navigation" 地标',
        severity: 'info',
        wcagCriterion: '1.3.1',
      });
    }

    // 检查自动播放的媒体
    $('video[autoplay], audio[autoplay]').each((_, el) => {
      const tag = ((el as { tagName?: string }).tagName || '').toLowerCase();
      result.failed++;
      result.issues.push({
        element: tag,
        issue: `${tag} 设置了自动播放，可能干扰屏幕阅读器用户`,
        severity: 'warning',
        wcagCriterion: '1.4.2',
      });
    });

    return result;
  }

  // ── 评分与建议 ──

  calculateAccessibilityScore(
    checks: Record<string, AccessibilityCheckResult>
  ): AccessibilitySummary {
    let totalIssues = 0;
    let errors = 0;
    let warnings = 0;
    let passed = 0;
    let criticalCount = 0;

    // 检查项权重：核心可访问性检查权重更高
    const checkWeights: Record<string, number> = {
      colorContrast: 12,
      altText: 12,
      formLabels: 12,
      keyboardNavigation: 12,
      ariaAttributes: 10,
      focusManagement: 10,
      screenReaders: 8,
      headingsStructure: 6,
      links: 6,
      language: 5,
      semanticMarkup: 4,
      tables: 3,
    };

    Object.values(checks).forEach(check => {
      passed += check.passed;
      totalIssues += check.failed;
      check.issues.forEach(issue => {
        if (issue.severity === 'critical') {
          criticalCount++;
          errors++;
        } else if (issue.severity === 'error') {
          errors++;
        } else if (issue.severity === 'warning') {
          warnings++;
        }
      });
    });

    // 加权评分：每个检查项按权重计算得分
    let weightedScore = 0;
    let totalWeight = 0;

    for (const [key, check] of Object.entries(checks)) {
      const weight = checkWeights[key] || 5;
      totalWeight += weight;
      const checkTotal = check.passed + check.failed;
      if (checkTotal === 0) {
        weightedScore += weight; // 无元素可检查 = 满分
      } else {
        const checkPassRate = check.passed / checkTotal;
        weightedScore += weight * checkPassRate;
      }
    }

    let score: number;
    if (totalWeight === 0) {
      score = 100;
    } else {
      // 基础分 = 加权通过率 * 100
      score = Math.round((weightedScore / totalWeight) * 100);
      // 严重问题额外扣分：critical 扣 5 分，error 扣 2 分，warning 扣 0.5 分
      const penalty = criticalCount * 5 + (errors - criticalCount) * 2 + warnings * 0.5;
      // 惩罚上限 40 分，避免少量问题导致评分崩塌
      score = Math.max(0, Math.round(score - Math.min(40, penalty)));
    }

    return { totalIssues, errors, warnings, passed, score };
  }

  generateRecommendations(
    checks: Record<string, AccessibilityCheckResult>,
    includeWarnings = true
  ) {
    const recommendations: string[] = [];
    const seen = new Set<string>();

    // 问题类型 → 修复建议的映射
    const fixSuggestions: Record<string, string> = {
      '缺少 alt 属性':
        '为所有 <img> 添加描述性 alt 属性；装饰性图片使用 alt="" 并添加 role="presentation"',
      'SVG 缺少': '为 SVG 元素添加 <title> 子元素或 aria-label 属性',
      颜色对比度不足: '调整前景/背景色使对比度达到 WCAG 要求（AA 级 ≥4.5:1，AAA 级 ≥7:1）',
      标题层级跳跃: '修正标题层级结构，确保从 h1 开始逐级递增，不跳过中间级别',
      '页面缺少 h1': '为页面添加唯一的 h1 标题，描述页面主要内容',
      表单控件缺少标签: '为每个表单控件添加关联的 <label for="id">、aria-label 或 aria-labelledby',
      '无效的 role 值':
        '使用 WAI-ARIA 规范中定义的有效 role 值（如 button、navigation、dialog 等）',
      'aria-hidden="true"':
        '移除 aria-hidden="true" 容器内的可聚焦元素，或将它们设为 tabindex="-1"',
      '可点击元素缺少 role':
        '为可点击的 div/span 添加 role="button" 和 tabindex="0"，并处理键盘事件',
      'aria-labelledby 引用了不存在': '确保 aria-labelledby 引用的 ID 在页面中存在',
      'tabindex="-1"': '移除交互元素上不必要的 tabindex="-1"，确保键盘用户可以访问',
      tabindex: '避免使用正值 tabindex，改用 DOM 顺序控制焦点流',
      'outline: none': '不要移除焦点样式，改用自定义 :focus-visible 样式替代默认 outline',
      缺少语义化元素: '使用 <main>、<nav>、<header>、<footer>、<section> 等语义化元素替代通用 div',
      'div 元素占比过高': '将功能性 div 替换为对应的语义化 HTML5 元素',
      链接没有可识别的文本: '为链接添加描述性文本内容或 aria-label',
      链接文本不具描述性: '将"点击这里"、"更多"等模糊链接文本替换为描述目标内容的文本',
      链接在新窗口打开但未提示: '在 target="_blank" 的链接中添加"（新窗口打开）"提示或 aria-label',
      '缺少 <title>': '为页面添加描述性 <title> 标签',
      '缺少 lang 属性': '在 <html> 标签上添加正确的 lang 属性（如 lang="zh-CN"）',
      缺少跳转导航链接: '在页面顶部添加 skip navigation 链接，让键盘用户可以跳过导航直达主内容',
      '缺少 <main>': '使用 <main> 元素包裹页面主内容区域',
      自动播放: '移除媒体元素的 autoplay 属性，或提供暂停/停止控件',
      数据表格缺少: '为数据表格添加 <caption> 或 aria-label 描述表格用途',
      '缺少 <th>': '为数据表格添加 <th> 表头单元格并设置 scope 属性',
      焦点丢失: '检查页面中是否存在焦点陷阱，确保 Tab 键可以在所有交互元素间正常流转',
      缺少无障碍名称: '为所有交互元素提供可访问名称（label、aria-label 或有意义的文本内容）',
    };

    // 按检查项分组统计问题
    const checkSummaries: Array<{
      name: string;
      errorCount: number;
      warningCount: number;
      issues: string[];
    }> = [];

    Object.values(checks).forEach(check => {
      let errorCount = 0;
      let warningCount = 0;
      const issueTexts: string[] = [];

      check.issues.forEach(issue => {
        const severity = issue.severity || 'warning';
        if (severity === 'error' || severity === 'critical') errorCount++;
        else if (severity === 'warning') warningCount++;

        const text = issue.issue || issue.description;
        if (!text) return;
        if (!includeWarnings && severity !== 'error' && severity !== 'critical') return;
        if (!issueTexts.includes(text)) issueTexts.push(text);
      });

      if (issueTexts.length > 0) {
        checkSummaries.push({ name: check.name, errorCount, warningCount, issues: issueTexts });
      }
    });

    // 按严重程度排序（error 多的优先）
    checkSummaries.sort((a, b) => b.errorCount - a.errorCount || b.warningCount - a.warningCount);

    // 生成修复建议
    for (const summary of checkSummaries) {
      for (const issueText of summary.issues) {
        // 查找匹配的修复建议
        let suggestion: string | null = null;
        for (const [pattern, fix] of Object.entries(fixSuggestions)) {
          if (issueText.includes(pattern)) {
            suggestion = fix;
            break;
          }
        }

        const key = suggestion || issueText;
        if (seen.has(key)) continue;
        seen.add(key);

        if (suggestion) {
          recommendations.push(`[${summary.name}] ${suggestion}`);
        } else {
          recommendations.push(`[${summary.name}] ${issueText}`);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('页面可访问性表现良好，符合 WCAG 标准');
    }

    return recommendations.slice(0, 20);
  }

  // ── 工具方法 ──

  parseInlineStyle(style?: string) {
    const styles: Record<string, string> = {};
    if (!style) return styles;
    style.split(';').forEach(item => {
      const colonIdx = item.indexOf(':');
      if (colonIdx === -1) return;
      const key = item.substring(0, colonIdx).trim();
      const value = item.substring(colonIdx + 1).trim();
      if (key && value) styles[key] = value;
    });
    return styles;
  }

  parseColor(color?: string) {
    if (!color) return null;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }
      if (hex.length >= 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }
    if (color.startsWith('rgb')) {
      const values = color.match(/\d+/g);
      if (!values || values.length < 3) return null;
      return { r: parseInt(values[0], 10), g: parseInt(values[1], 10), b: parseInt(values[2], 10) };
    }
    return null;
  }

  /** 从 Tailwind/Bootstrap 类名中提取常见颜色 */
  parseColorFromClass(classAttr: string, prefix: 'bg' | 'text') {
    const colorMap: Record<string, { r: number; g: number; b: number }> = {
      white: { r: 255, g: 255, b: 255 },
      black: { r: 0, g: 0, b: 0 },
      'red-500': { r: 239, g: 68, b: 68 },
      'red-600': { r: 220, g: 38, b: 38 },
      'blue-500': { r: 59, g: 130, b: 246 },
      'blue-600': { r: 37, g: 99, b: 235 },
      'green-500': { r: 34, g: 197, b: 94 },
      'green-600': { r: 22, g: 163, b: 74 },
      'gray-500': { r: 107, g: 114, b: 128 },
      'gray-600': { r: 75, g: 85, b: 99 },
      'gray-700': { r: 55, g: 65, b: 81 },
      'gray-800': { r: 31, g: 41, b: 55 },
      'gray-900': { r: 17, g: 24, b: 39 },
    };

    const classes = classAttr.split(/\s+/);
    for (const cls of classes) {
      if (cls.startsWith(`${prefix}-`)) {
        const colorKey = cls.substring(prefix.length + 1);
        if (colorMap[colorKey]) return colorMap[colorKey];
      }
    }
    return null;
  }

  calculateContrastRatio(
    color: { r: number; g: number; b: number },
    background: { r: number; g: number; b: number }
  ) {
    const luminance = (c: { r: number; g: number; b: number }) => {
      const [r, g, b] = [c.r, c.g, c.b].map(val => {
        const channel = val / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const l1 = luminance(color) + 0.05;
    const l2 = luminance(background) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  getContrastThreshold(level: string) {
    if (level === 'AAA') return 7;
    return 4.5;
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
    const ac = this.abortControllers.get(testId);
    if (ac && !ac.signal.aborted) {
      ac.abort();
    }
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, { ...test, status: TestStatus.CANCELLED });
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

  setProgressCallback(callback: (progress: AccessibilityProgressPayload) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: AccessibilityFinalResult) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  /**
   * 通过 Puppeteer 真实浏览器执行动态无障碍检测
   * 返回 null 表示 Puppeteer 不可用
   */
  private async performBrowserAccessibilityChecks(
    config: AccessibilityConfig,
    testId: string,
    showBrowser?: boolean
  ): Promise<Record<string, AccessibilityCheckResult> | null> {
    const poolAvailable = await puppeteerPool.isAvailable();
    if (!poolAvailable) return null;

    this.updateTestProgress(testId, 85, '真实浏览器动态检测');

    const { page, release } = await puppeteerPool.acquirePage({
      warmupUrl: config.url,
      headed: showBrowser,
    });
    try {
      await page.goto(config.url, { waitUntil: 'networkidle2', timeout: config.timeout });

      const browserResults = await page.evaluate(
        (threshold: number) => {
          const issues: Array<{
            key: string;
            issue: string;
            severity: 'info' | 'warning' | 'error';
            element?: string;
            wcagCriterion?: string;
          }> = [];

          // 0. 真实颜色对比度检测（通过 getComputedStyle 获取渲染后的实际颜色）
          let contrastPassed = 0;
          let contrastFailed = 0;
          const parseRgb = (color: string): { r: number; g: number; b: number } | null => {
            const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return null;
            return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
          };
          const relativeLuminance = (c: { r: number; g: number; b: number }) => {
            const [r, g, b] = [c.r, c.g, c.b].map(v => {
              const ch = v / 255;
              return ch <= 0.03928 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const contrastRatio = (
            fg: { r: number; g: number; b: number },
            bg: { r: number; g: number; b: number }
          ) => {
            const l1 = relativeLuminance(fg) + 0.05;
            const l2 = relativeLuminance(bg) + 0.05;
            return l1 > l2 ? l1 / l2 : l2 / l1;
          };

          const textSelector = 'p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th';
          const textElements = document.querySelectorAll(textSelector);
          // 抽样检查（最多 100 个元素，避免性能问题）
          const sampleSize = Math.min(textElements.length, 100);
          const step =
            textElements.length > sampleSize ? Math.floor(textElements.length / sampleSize) : 1;
          const contrastIssueElements: string[] = [];

          for (
            let i = 0;
            i < textElements.length && contrastPassed + contrastFailed < sampleSize;
            i += step
          ) {
            const el = textElements[i];
            const text = (el.textContent || '').trim();
            if (!text || text.length > 200) continue;

            const computed = window.getComputedStyle(el);
            const fgColor = parseRgb(computed.color);
            const bgColor = parseRgb(computed.backgroundColor);

            if (!fgColor || !bgColor) {
              contrastPassed++;
              continue;
            }
            // 跳过透明背景（rgba 的 alpha 为 0）
            if (computed.backgroundColor.includes('0)')) {
              contrastPassed++;
              continue;
            }

            const ratio = contrastRatio(fgColor, bgColor);
            if (ratio >= threshold) {
              contrastPassed++;
            } else {
              contrastFailed++;
              if (contrastIssueElements.length < 5) {
                contrastIssueElements.push(
                  `<${el.tagName.toLowerCase()}> "${text.slice(0, 30)}" (${ratio.toFixed(2)}:1)`
                );
              }
            }
          }

          if (contrastFailed > 0) {
            issues.push({
              key: 'colorContrast',
              issue: `${contrastFailed} 个文本元素颜色对比度不足（要求 ${threshold}:1）：${contrastIssueElements.join('；')}`,
              severity: contrastFailed >= 5 ? 'error' : 'warning',
              wcagCriterion: '1.4.3',
            });
          }

          // 1. 焦点顺序检测：Tab 遍历所有可聚焦元素，检查 tabindex 异常
          const focusableSelector =
            'a[href], button, input, select, textarea, [tabindex], [contenteditable]';
          const focusableElements = document.querySelectorAll(focusableSelector);
          let positiveTabindexCount = 0;
          let noFocusIndicatorCount = 0;

          focusableElements.forEach(el => {
            const tabindex = el.getAttribute('tabindex');
            if (tabindex && parseInt(tabindex, 10) > 0) {
              positiveTabindexCount++;
              issues.push({
                key: 'focusManagement',
                issue: `元素 <${el.tagName.toLowerCase()}> 使用了 tabindex="${tabindex}"，正值 tabindex 会破坏自然焦点顺序`,
                severity: 'warning',
                element: el.outerHTML.slice(0, 120),
                wcagCriterion: '2.4.3',
              });
            }

            // 检查焦点可见性：元素是否有 outline 或自定义焦点样式
            const computed = window.getComputedStyle(el);
            if (computed.outlineStyle === 'none' && computed.outlineWidth === '0px') {
              const hasFocusClass =
                el.className && typeof el.className === 'string' && /focus|ring/.test(el.className);
              if (!hasFocusClass) {
                noFocusIndicatorCount++;
              }
            }
          });

          if (positiveTabindexCount > 3) {
            issues.push({
              key: 'focusManagement',
              issue: `页面有 ${positiveTabindexCount} 个元素使用正值 tabindex，严重影响焦点导航顺序`,
              severity: 'error',
              wcagCriterion: '2.4.3',
            });
          }

          if (
            noFocusIndicatorCount > focusableElements.length * 0.5 &&
            focusableElements.length > 3
          ) {
            issues.push({
              key: 'focusManagement',
              issue: `${noFocusIndicatorCount}/${focusableElements.length} 个可聚焦元素可能缺少焦点指示器（outline: none 且无 focus/ring 类名）`,
              severity: 'warning',
              wcagCriterion: '2.4.7',
            });
          }

          // 2. ARIA live region 检测
          const liveRegions = document.querySelectorAll(
            '[aria-live], [role="alert"], [role="status"], [role="log"]'
          );
          liveRegions.forEach(el => {
            const ariaLive = el.getAttribute('aria-live');
            const role = el.getAttribute('role');
            if (ariaLive === 'assertive' && !role) {
              issues.push({
                key: 'screenReaders',
                issue: `aria-live="assertive" 区域缺少语义 role，屏幕阅读器可能无法正确播报`,
                severity: 'warning',
                element: el.outerHTML.slice(0, 120),
                wcagCriterion: '4.1.3',
              });
            }
          });

          // 3. 交互元素无障碍名称检测
          const interactiveElements = document.querySelectorAll(
            'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"]'
          );
          let missingNameCount = 0;
          interactiveElements.forEach(el => {
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledby = el.getAttribute('aria-labelledby');
            const title = el.getAttribute('title');
            const textContent = (el.textContent || '').trim();
            const tagName = el.tagName.toLowerCase();

            // input/select/textarea 需要关联 label
            if (['input', 'select', 'textarea'].includes(tagName)) {
              const id = el.getAttribute('id');
              const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
              const parentLabel = el.closest('label');
              if (!hasLabel && !parentLabel && !ariaLabel && !ariaLabelledby && !title) {
                missingNameCount++;
                if (missingNameCount <= 5) {
                  issues.push({
                    key: 'keyboardNavigation',
                    issue: `<${tagName}> 元素缺少无障碍名称（无 label/aria-label/title）`,
                    severity: 'error',
                    element: el.outerHTML.slice(0, 120),
                    wcagCriterion: '4.1.2',
                  });
                }
              }
            } else if (!textContent && !ariaLabel && !ariaLabelledby && !title) {
              missingNameCount++;
              if (missingNameCount <= 5) {
                issues.push({
                  key: 'keyboardNavigation',
                  issue: `<${tagName}> 交互元素缺少可访问名称`,
                  severity: 'error',
                  element: el.outerHTML.slice(0, 120),
                  wcagCriterion: '4.1.2',
                });
              }
            }
          });

          if (missingNameCount > 5) {
            issues.push({
              key: 'keyboardNavigation',
              issue: `共 ${missingNameCount} 个交互元素缺少无障碍名称（仅显示前 5 个）`,
              severity: 'error',
              wcagCriterion: '4.1.2',
            });
          }

          // 4. 键盘陷阱检测：检查 tabindex="-1" 的交互元素
          const trappedElements = document.querySelectorAll(
            'button[tabindex="-1"], a[href][tabindex="-1"], input[tabindex="-1"]:not([type="hidden"]), select[tabindex="-1"], textarea[tabindex="-1"]'
          );
          if (trappedElements.length > 0) {
            issues.push({
              key: 'keyboardNavigation',
              issue: `${trappedElements.length} 个交互元素设置了 tabindex="-1"，键盘用户无法访问`,
              severity: 'warning',
              wcagCriterion: '2.1.1',
            });
          }

          // 5. Dialog/Modal 焦点管理检测
          const dialogs = document.querySelectorAll(
            'dialog, [role="dialog"], [role="alertdialog"]'
          );
          dialogs.forEach(dialog => {
            const tag = dialog.tagName.toLowerCase();
            const isOpen =
              tag === 'dialog'
                ? (dialog as HTMLDialogElement).open
                : dialog.getAttribute('aria-hidden') !== 'true' &&
                  window.getComputedStyle(dialog).display !== 'none';
            if (!isOpen) return;

            // 打开的 dialog 应有 aria-modal="true"
            if (!dialog.getAttribute('aria-modal')) {
              issues.push({
                key: 'focusManagement',
                issue: `已打开的 ${tag === 'dialog' ? '<dialog>' : `[role="${dialog.getAttribute('role')}"]`} 缺少 aria-modal="true"，屏幕阅读器可能无法识别为模态对话框`,
                severity: 'warning',
                element: dialog.outerHTML.slice(0, 120),
                wcagCriterion: '1.3.1',
              });
            }

            // 打开的 dialog 应有无障碍名称（aria-label 或 aria-labelledby）
            if (!dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby')) {
              issues.push({
                key: 'focusManagement',
                issue: `已打开的对话框缺少无障碍名称（aria-label 或 aria-labelledby），屏幕阅读器用户无法得知对话框用途`,
                severity: 'error',
                element: dialog.outerHTML.slice(0, 120),
                wcagCriterion: '4.1.2',
              });
            }

            // 打开的 dialog 内部应有可聚焦元素
            const innerFocusable = dialog.querySelectorAll(
              'a[href], button, input, select, textarea, [tabindex]'
            );
            if (innerFocusable.length === 0) {
              issues.push({
                key: 'focusManagement',
                issue: '已打开的对话框内部没有可聚焦元素，键盘用户无法与其交互',
                severity: 'error',
                element: dialog.outerHTML.slice(0, 120),
                wcagCriterion: '2.1.1',
              });
            }
          });

          return {
            focusableCount: focusableElements.length,
            interactiveCount: interactiveElements.length,
            liveRegionCount: liveRegions.length,
            contrastPassed,
            contrastFailed,
            dialogCount: dialogs.length,
            issues,
          };
        },
        config.wcagLevel === 'AAA' ? 7 : 4.5
      );

      // 5. 真实键盘 Tab 导航测试
      const tabIssues: AccessibilityIssue[] = [];
      try {
        const tabOrder: string[] = [];
        for (let i = 0; i < Math.min(20, browserResults.focusableCount); i++) {
          await page.keyboard.press('Tab');
          const activeTag = await page.evaluate(() => {
            const el = document.activeElement;
            return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : 'none';
          });
          if (activeTag === 'none' || activeTag === 'body') {
            tabIssues.push({
              issue: `第 ${i + 1} 次 Tab 后焦点丢失（落在 body 上），可能存在焦点陷阱`,
              severity: 'warning',
              wcagCriterion: '2.1.2',
            });
            break;
          }
          tabOrder.push(activeTag);
        }
      } catch {
        // Tab 导航测试失败不影响结果
      }

      // 汇总结果
      const checksResult: Record<string, AccessibilityCheckResult> = {};

      // 按 key 分组
      const grouped = new Map<string, AccessibilityIssue[]>();
      for (const item of browserResults.issues) {
        const arr = grouped.get(item.key) || [];
        arr.push({
          issue: item.issue,
          severity: item.severity,
          element: item.element,
          wcagCriterion: item.wcagCriterion,
        });
        grouped.set(item.key, arr);
      }

      // Tab 导航问题归入 keyboardNavigation
      if (tabIssues.length > 0) {
        const arr = grouped.get('keyboardNavigation') || [];
        arr.push(...tabIssues);
        grouped.set('keyboardNavigation', arr);
      }

      for (const [key, issues] of grouped) {
        // 根据检测到的元素总数估算 passed：总元素 - 有问题的元素
        let estimatedPassed = 0;
        if (key === 'colorContrast') {
          estimatedPassed = browserResults.contrastPassed;
        } else if (key === 'focusManagement') {
          estimatedPassed = Math.max(0, browserResults.focusableCount - issues.length);
        } else if (key === 'keyboardNavigation') {
          estimatedPassed = Math.max(0, browserResults.interactiveCount - issues.length);
        } else if (key === 'screenReaders') {
          estimatedPassed = Math.max(0, browserResults.liveRegionCount);
        }
        checksResult[key] = {
          name: `${key} (浏览器动态检测)`,
          description: '通过真实浏览器执行的动态无障碍检测',
          issues,
          passed: estimatedPassed,
          failed: issues.length,
        };
      }

      this.updateTestProgress(testId, 92, '浏览器动态检测完成');
      return Object.keys(checksResult).length > 0 ? checksResult : null;
    } catch {
      return null;
    } finally {
      await release();
    }
  }

  async cleanup() {
    for (const [, ac] of this.abortControllers) {
      if (!ac.signal.aborted) ac.abort();
    }
    this.abortControllers.clear();
    this.activeTests.clear();
    this.progressTracker.clear();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }
}

export default AccessibilityTestEngine;
