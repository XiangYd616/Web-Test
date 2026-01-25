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
      this.updateTestProgress(testId, 5, '初始化UX测试');
      this.updateTestProgress(testId, 12, '启动真实浏览器');

      browser = await browserLauncher.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      this.updateTestProgress(testId, 25, '准备测试页面');

      this.updateTestProgress(testId, 40, '加载页面资源');
      await page.goto(url, { waitUntil: 'networkidle2', timeout });
      this.updateTestProgress(testId, 65, '采集用户体验指标');

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

      this.updateTestProgress(testId, 88, '分析用户体验数据');
      const score = calculateUXScore(metrics);
      const summary = this.buildExperienceSummary(metrics, score);
      const recommendations = this.buildStructuredRecommendations(metrics);
      this.updateTestProgress(testId, 94, '生成UX评分');

      const results = {
        url,
        metrics,
        score,
        grade: scoreToGrade(score),
        summary,
        recommendations,
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

  private buildExperienceSummary(metrics: Record<string, unknown>, score: number) {
    const typedMetrics = metrics as {
      lcp?: number;
      fcp?: number;
      fid?: number;
      cls?: number;
      navigation?: { ttfb?: number } | null;
    };
    const issues: string[] = [];
    const highlights: string[] = [];
    const tags: Array<{ label: string; level: 'good' | 'warn' | 'bad' }> = [];
    const lcp = Number(typedMetrics.lcp || 0);
    const fcp = Number(typedMetrics.fcp || 0);
    const fid = Number(typedMetrics.fid || 0);
    const cls = Number(typedMetrics.cls || 0);
    const ttfb = Number(typedMetrics.navigation?.ttfb || 0);

    if (lcp > 2500) {
      issues.push('首屏内容呈现偏慢，建议优化关键资源加载');
      tags.push({ label: 'LCP偏慢', level: 'warn' });
    } else {
      highlights.push('首屏渲染速度良好');
      tags.push({ label: 'LCP优秀', level: 'good' });
    }

    if (fcp > 1800) {
      issues.push('首次内容绘制偏慢，建议减少阻塞脚本');
      tags.push({ label: 'FCP偏慢', level: 'warn' });
    } else {
      highlights.push('首次内容绘制表现稳定');
      tags.push({ label: 'FCP稳定', level: 'good' });
    }

    if (fid > 100) {
      issues.push('交互响应略慢，建议减少主线程阻塞');
      tags.push({ label: '交互延迟', level: 'warn' });
    } else {
      highlights.push('交互响应良好');
      tags.push({ label: '交互顺畅', level: 'good' });
    }

    if (cls > 0.1) {
      issues.push('布局稳定性不足，建议避免大幅位移');
      tags.push({ label: '布局抖动', level: 'warn' });
    } else {
      highlights.push('布局稳定性良好');
      tags.push({ label: '布局稳定', level: 'good' });
    }

    if (ttfb > 800) {
      issues.push('服务端响应偏慢，建议优化后端与缓存');
      tags.push({ label: 'TTFB偏慢', level: 'warn' });
    } else {
      highlights.push('服务端响应稳定');
      tags.push({ label: 'TTFB稳定', level: 'good' });
    }

    const description =
      score >= 90
        ? '体验优秀，加载与交互表现稳定。'
        : score >= 75
          ? '体验良好，仍有少量优化空间。'
          : score >= 60
            ? '体验一般，建议优先优化性能瓶颈。'
            : '体验较弱，需要系统性优化。';

    return {
      description,
      highlights,
      issues,
      tags,
      level: score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor',
      levelLabel: score >= 90 ? '优秀' : score >= 75 ? '良好' : score >= 60 ? '一般' : '较弱',
    };
  }

  private buildStructuredRecommendations(metrics: Record<string, unknown>) {
    const typedMetrics = metrics as {
      lcp?: number;
      fcp?: number;
      fid?: number;
      cls?: number;
      navigation?: { ttfb?: number } | null;
    };
    const recommendations: Array<{
      type: string;
      label: string;
      severity: 'low' | 'medium' | 'high';
      metric: string;
      value: number;
      threshold: number;
      recommendation: string;
    }> = [];

    const lcp = Number(typedMetrics.lcp || 0);
    const fcp = Number(typedMetrics.fcp || 0);
    const fid = Number(typedMetrics.fid || 0);
    const cls = Number(typedMetrics.cls || 0);
    const ttfb = Number(typedMetrics.navigation?.ttfb || 0);

    if (lcp > 2500) {
      recommendations.push({
        type: 'lcp',
        label: '首屏渲染优化',
        severity: lcp > 4000 ? 'high' : 'medium',
        metric: 'LCP(ms)',
        value: lcp,
        threshold: 2500,
        recommendation: '优化关键资源加载，减少首屏阻塞脚本。',
      });
    }

    if (fcp > 1800) {
      recommendations.push({
        type: 'fcp',
        label: '首屏内容绘制优化',
        severity: fcp > 3000 ? 'high' : 'medium',
        metric: 'FCP(ms)',
        value: fcp,
        threshold: 1800,
        recommendation: '减少首屏渲染阻塞资源，延后非关键脚本。',
      });
    }

    if (fid > 100) {
      recommendations.push({
        type: 'fid',
        label: '交互响应优化',
        severity: fid > 300 ? 'high' : 'medium',
        metric: 'FID(ms)',
        value: fid,
        threshold: 100,
        recommendation: '降低主线程阻塞，拆分长任务。',
      });
    }

    if (cls > 0.1) {
      recommendations.push({
        type: 'cls',
        label: '布局稳定性优化',
        severity: cls > 0.25 ? 'high' : 'medium',
        metric: 'CLS',
        value: cls,
        threshold: 0.1,
        recommendation: '为图片/组件预留空间，避免布局抖动。',
      });
    }

    if (ttfb > 800) {
      recommendations.push({
        type: 'ttfb',
        label: '服务端响应优化',
        severity: ttfb > 1500 ? 'high' : 'medium',
        metric: 'TTFB(ms)',
        value: ttfb,
        threshold: 800,
        recommendation: '优化后端响应与缓存策略。',
      });
    }

    return recommendations;
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
