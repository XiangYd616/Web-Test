const { calculateUXScore, scoreToGrade } = require('../shared/utils/uxScore');
const Joi = require('joi');

type UXConfig = {
  url?: string;
  timeout?: number;
  testId?: string;
  confirmPuppeteer?: boolean;
};

class UXTestEngine {
  name: string;
  version: string;
  description: string;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor() {
    this.name = 'ux';
    this.version = '1.0.0';
    this.description = 'UX测试引擎';
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: ['lcp', 'cls', 'fcp', 'ttfb', 'user-experience'],
    };
  }

  private validateConfig(config: UXConfig) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      timeout: Joi.number().min(1000).max(120000),
      testId: Joi.string(),
      confirmPuppeteer: Joi.boolean(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });
    if (error) {
      throw new Error(
        `配置验证失败: ${error.details.map((item: { message: string }) => item.message).join(', ')}`
      );
    }
    return value as UXConfig;
  }

  async executeTest(config: UXConfig) {
    const validatedConfig = this.validateConfig(config);
    const testId = validatedConfig.testId || `ux_${Date.now()}`;
    const timeout = validatedConfig.timeout || 60000;
    const url = validatedConfig.url || '';

    if (!url) {
      throw new Error('UX测试URL不能为空');
    }

    if (validatedConfig.confirmPuppeteer !== true) {
      throw new Error('需确认Puppeteer环境后才能执行UX测试');
    }

    let puppeteer: typeof import('puppeteer') | null = null;
    try {
      puppeteer = require('puppeteer');
    } catch {
      const result = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        status: 'failed',
        error: '未检测到 Puppeteer 依赖，无法执行UX测试',
      };
      if (this.errorCallback) {
        this.errorCallback(new Error(result.error));
      }
      return result;
    }

    if (!puppeteer) {
      throw new Error('Puppeteer未初始化');
    }

    const browserLauncher = puppeteer as typeof import('puppeteer');
    let browser: import('puppeteer').Browser | null = null;
    try {
      this.activeTests.set(testId, { status: 'running', progress: 0, startTime: Date.now() });
      this.updateTestProgress(testId, 10, '启动真实浏览器');

      browser = await browserLauncher.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      this.updateTestProgress(testId, 30, '加载页面');

      await page.goto(url, { waitUntil: 'networkidle2', timeout });
      this.updateTestProgress(testId, 60, '采集用户体验指标');

      const metrics = await page.evaluate(async () => {
        const getNavTiming = () => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (!nav) return null;
          return {
            ttfb: nav.responseStart - nav.requestStart,
            fcp: nav.domContentLoadedEventEnd - nav.startTime,
            loadTime: nav.loadEventEnd - nav.startTime,
          };
        };

        const getPaintMetric = (name: string) => {
          const entry = performance.getEntriesByName(name)[0] as PerformanceEntry | undefined;
          return entry ? entry.startTime : 0;
        };

        const lcp = await new Promise<number>(resolve => {
          let value = 0;
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            const entry = entries[entries.length - 1] as PerformanceEntry | undefined;
            if (entry) {
              value = entry.startTime;
            }
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(value);
          }, 1000);
        });

        const fid = await new Promise<number>(resolve => {
          let value = 0;
          const observer = new PerformanceObserver(list => {
            const entry = list.getEntries()[0] as PerformanceEntry | undefined;
            if (entry) {
              const fidEntry = entry as PerformanceEntry & { processingStart?: number };
              value = (fidEntry.processingStart || fidEntry.startTime) - fidEntry.startTime;
            }
          });
          observer.observe({ type: 'first-input', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(value);
          }, 1000);
        });

        const cls = await new Promise<number>(resolve => {
          let total = 0;
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries() as PerformanceEntry[]) {
              const layoutShift = entry as PerformanceEntry & {
                value?: number;
                hadRecentInput?: boolean;
              };
              if (!layoutShift.hadRecentInput) {
                total += layoutShift.value || 0;
              }
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(total);
          }, 1000);
        });

        return {
          navigation: getNavTiming(),
          fcp: getPaintMetric('first-contentful-paint'),
          lcp,
          fid,
          cls,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        };
      });

      this.updateTestProgress(testId, 90, '生成UX评分');
      const score = calculateUXScore(metrics);

      const results = {
        url,
        metrics,
        score,
        grade: scoreToGrade(score),
      };

      this.activeTests.set(testId, { status: 'completed', progress: 100, results });
      this.updateTestProgress(testId, 100, 'UX测试完成');

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        status: 'completed',
        score,
        results,
      };

      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      return finalResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.activeTests.set(testId, { status: 'failed', error: message });
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      return {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        status: 'failed',
        error: message,
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const progressPayload = {
      testId,
      progress,
      message,
    };
    if (this.progressCallback) {
      this.progressCallback(progressPayload);
    }
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

  async stopTest(testId: string) {
    if (!this.activeTests.has(testId)) {
      return false;
    }
    this.activeTests.set(testId, { status: 'stopped' });
    return true;
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId) || null;
  }
}

module.exports = UXTestEngine;

export {};
