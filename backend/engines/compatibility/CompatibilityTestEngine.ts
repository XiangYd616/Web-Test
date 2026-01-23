const axios = require('axios');
const cheerio = require('cheerio');
const Joi = require('joi');

const DEFAULT_BROWSERS = [
  { name: 'Chrome', version: '120' },
  { name: 'Firefox', version: '121' },
  { name: 'Safari', version: '17' },
  { name: 'Edge', version: '120' },
];

const DEFAULT_DEVICES = [
  { name: 'Desktop', viewport: { width: 1366, height: 768 } },
  { name: 'Tablet', viewport: { width: 768, height: 1024 } },
  { name: 'Mobile', viewport: { width: 390, height: 844 } },
];

const DEFAULT_USER_AGENTS: Record<string, string> = {
  Chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  Safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  Edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  Mobile:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Tablet:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const FEATURE_SUPPORT: Record<string, Record<string, number>> = {
  es6module: { Chrome: 61, Firefox: 60, Safari: 10.1, Edge: 16 },
  responsiveImages: { Chrome: 38, Firefox: 38, Safari: 9.1, Edge: 13 },
  webp: { Chrome: 32, Firefox: 65, Safari: 14, Edge: 18 },
  lazyloading: { Chrome: 76, Firefox: 75, Safari: 15.4, Edge: 79 },
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

type PageSignals = {
  meta: {
    hasViewport: boolean;
    hasH1: boolean;
    hasCharset: boolean;
    hasLang: boolean;
  };
  resources: {
    hasPicture: boolean;
    hasModuleScript: boolean;
    hasNoModule: boolean;
    hasWebp: boolean;
    hasLazyLoading: boolean;
  };
  polyfill: { hasPolyfillHint: boolean };
  requiredFeatures: string[];
  issues: string[];
};

type CompatibilityConfig = {
  url: string;
  browsers?: BrowserConfig[];
  devices?: DeviceConfig[];
  enableMatrix?: boolean;
  featureDetection?: boolean;
  realBrowser?: boolean;
  captureScreenshot?: boolean;
  timeout?: number;
  testId?: string;
};

class CompatibilityTestEngine {
  name: string;
  version: string;
  description: string;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor() {
    this.name = 'compatibility';
    this.version = '1.0.0';
    this.description = '兼容性测试引擎';
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  private validateConfig(config: CompatibilityConfig) {
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
      timeout: Joi.number().min(1000).max(120000),
      testId: Joi.string(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as CompatibilityConfig;
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
    const validatedConfig = this.validateConfig(config);
    const testId = validatedConfig.testId || `compatibility_${Date.now()}`;
    const timeout = validatedConfig.timeout || 30000;
    const url = validatedConfig.url;

    if (!url) {
      throw new Error('兼容性测试URL不能为空');
    }

    try {
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });
      this.updateTestProgress(testId, 10, '获取页面内容');

      const response = await axios.get(url, { timeout });
      const baseHtml = String(response.data || '');
      const baseSignals = this.extractPageSignals(baseHtml);

      const browsers = validatedConfig.browsers?.length
        ? validatedConfig.browsers
        : DEFAULT_BROWSERS;
      const devices = validatedConfig.devices?.length ? validatedConfig.devices : DEFAULT_DEVICES;
      const enableMatrix = validatedConfig.enableMatrix !== false;
      const enableFeatureDetection = validatedConfig.featureDetection !== false;
      const enableRealBrowser = validatedConfig.realBrowser === true;
      const captureScreenshot = validatedConfig.captureScreenshot === true;

      this.updateTestProgress(testId, 35, '准备UA矩阵');
      const variantMap = enableMatrix
        ? await this.fetchVariants(url, timeout, browsers, devices)
        : new Map<string, { html: string; signals: PageSignals }>();

      this.updateTestProgress(testId, 55, '执行浏览器兼容性检查');
      const browserResults = browsers.map(browser => {
        const signals = this.resolveSignals(baseSignals, browser, null, variantMap);
        const issues = [...signals.issues];
        return {
          browser: browser.name,
          version: browser.version || 'latest',
          compatible: issues.length === 0,
          issues,
          signals,
        };
      });

      this.updateTestProgress(testId, 70, '执行设备适配检查');
      const deviceResults = devices.map(device => {
        const signals = this.resolveSignals(baseSignals, null, device, variantMap);
        const compatible = signals.meta.hasViewport;
        return {
          device: device.name,
          viewport: device.viewport,
          compatible,
          issues: compatible ? [] : ['缺少viewport meta标签'],
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

      const realBrowserResults = enableRealBrowser
        ? await this.runRealBrowserChecks(url, timeout, browsers, devices, captureScreenshot)
        : [];

      const overallScore = this.calculateScore(
        (matrixResults.length ? matrixResults : browserResults) as Array<{ compatible: boolean }>,
        deviceResults
      );
      const warnings = enableRealBrowser
        ? []
        : ['未启用真实浏览器渲染，结果基于User-Agent模拟，可信度可能受限'];
      const results = {
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
        recommendations: this.buildRecommendations(browserResults, deviceResults),
        warnings,
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results,
      });
      this.updateTestProgress(testId, 100, '兼容性测试完成');

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        status: 'completed',
        score: overallScore,
      };

      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      return finalResult;
    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
      });

      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }

      return {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        error: (error as Error).message,
        status: 'failed',
        score: 0,
        summary: {},
        metrics: {},
        warnings: [],
        errors: [(error as Error).message],
      };
    }
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId) || { status: 'running' };
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

  calculateScore(
    browsers: Array<{ compatible: boolean }>,
    devices: Array<{ compatible: boolean }>
  ) {
    const total = browsers.length + devices.length;
    if (!total) return 0;
    const passed =
      browsers.filter(item => item.compatible).length +
      devices.filter(item => item.compatible).length;
    return Math.round((passed / total) * 100);
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
    const results: Array<Record<string, unknown>> = [];
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
    devices: DeviceConfig[]
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
    for (const agent of userAgents) {
      try {
        const response = await axios.get(url, {
          timeout,
          headers: { 'User-Agent': agent },
        });
        const html = String(response.data || '');
        map.set(agent, { html, signals: this.extractPageSignals(html) });
      } catch {
        map.set(agent, { html: '', signals: this.extractPageSignals('') });
      }
    }
    return map;
  }

  private extractPageSignals(html: string): PageSignals {
    const $ = cheerio.load(html || '');
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const hasH1 = $('h1').length > 0;
    const hasCharset = $('meta[charset]').length > 0;
    const hasLang = $('html').attr('lang') ? true : false;
    const hasPicture = $('picture, img[srcset]').length > 0;
    const hasModuleScript = $('script[type="module"]').length > 0;
    const hasNoModule = $('script[nomodule]').length > 0;
    const hasWebp = $('img[src$=".webp"], source[type="image/webp"]').length > 0;
    const hasLazyLoading = $('img[loading="lazy"]').length > 0;
    const hasPolyfillHint = $('script[src*="polyfill"], script[src*="core-js"]').length > 0;

    const issues: string[] = [];
    if (!hasViewport) issues.push('缺少viewport meta标签');
    if (!hasH1) issues.push('缺少H1标题');
    if (!hasCharset) issues.push('缺少charset声明');
    if (!hasLang) issues.push('html缺少lang属性');
    if (hasModuleScript && !hasNoModule) {
      issues.push('使用ES模块但缺少nomodule兜底脚本');
    }

    const requiredFeatures: string[] = [];
    if (hasModuleScript) requiredFeatures.push('es6module');
    if (hasPicture) requiredFeatures.push('responsiveImages');
    if (hasWebp) requiredFeatures.push('webp');
    if (hasLazyLoading) requiredFeatures.push('lazyloading');

    return {
      meta: { hasViewport, hasH1, hasCharset, hasLang },
      resources: { hasPicture, hasModuleScript, hasNoModule, hasWebp, hasLazyLoading },
      polyfill: { hasPolyfillHint },
      requiredFeatures,
      issues,
    };
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

  private buildFeatureSummary(signals: PageSignals) {
    return {
      requiredFeatures: signals.requiredFeatures,
      meta: signals.meta,
      resources: signals.resources,
      polyfill: signals.polyfill,
    };
  }

  private async runRealBrowserChecks(
    url: string,
    timeout: number,
    browsers: BrowserConfig[],
    devices: DeviceConfig[],
    captureScreenshot: boolean
  ) {
    let puppeteer: typeof import('puppeteer') | null = null;
    try {
      puppeteer = require('puppeteer');
    } catch {
      return [
        {
          available: false,
          issues: ['未检测到 Puppeteer 依赖，无法执行真实浏览器测试'],
        },
      ];
    }

    if (!puppeteer) {
      return [
        {
          available: false,
          issues: ['Puppeteer未初始化'],
        },
      ];
    }

    const browserLauncher = puppeteer as typeof import('puppeteer');

    const results: Array<Record<string, unknown>> = [];
    const combinations: Array<{ browser: BrowserConfig; device: DeviceConfig }> = [];
    for (const browser of browsers) {
      for (const device of devices) {
        combinations.push({ browser, device });
      }
    }

    for (const { browser, device } of combinations) {
      const issues: string[] = [];
      const warnings: string[] = [];
      const userAgent = this.resolveUserAgent(browser, device);
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      let screenshotBase64: string | null = null;
      let browserInstance: import('puppeteer').Browser | null = null;
      try {
        browserInstance = await browserLauncher.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        if (!browserInstance) {
          throw new Error('无法启动浏览器实例');
        }
        const page = await browserInstance.newPage();
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        page.on('requestfailed', request => {
          failedRequests.push(request.url());
        });
        if (userAgent) {
          await page.setUserAgent(userAgent);
        }
        await page.setViewport({
          width: device.viewport.width,
          height: device.viewport.height,
          deviceScaleFactor: device.name === 'Mobile' ? 2 : 1,
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
          return {
            title: document.title,
            viewportMeta: !!document.querySelector('meta[name="viewport"]'),
            h1Count: document.querySelectorAll('h1').length,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            timing: performance.timing
              ? {
                  domContentLoaded:
                    performance.timing.domContentLoadedEventEnd -
                    performance.timing.navigationStart,
                  loadEvent: performance.timing.loadEventEnd - performance.timing.navigationStart,
                }
              : null,
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
        if (browserInstance) {
          await browserInstance.close();
        }
      }
    }

    return results;
  }

  buildRecommendations(
    browsers: Array<{ issues: string[] }>,
    devices: Array<{ issues: string[] }>
  ) {
    const recommendations: string[] = [];
    const allIssues = [...browsers, ...devices].flatMap(item => item.issues).filter(Boolean);

    if (allIssues.length > 0) {
      recommendations.push(...Array.from(new Set(allIssues)));
    } else {
      recommendations.push('兼容性表现良好，建议保持现有实现');
    }

    return recommendations;
  }
}

module.exports = CompatibilityTestEngine;

export {};
