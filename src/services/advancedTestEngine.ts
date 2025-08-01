/**
 * 高级测试引擎 - 统一管理所有测试工具
 */

import backgroundTestManager from './backgroundTestManager';
import { testAPI } from './testApiService';

// 浏览器兼容的事件发射器
class BrowserEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export interface AdvancedTestConfig {
  url: string;
  testType: 'website' | 'security' | 'performance' | 'compatibility' | 'seo' | 'accessibility' | 'api' | 'stress' | 'ux';
  options: Record<string, any>;
  engine?: 'lighthouse' | 'playwright' | 'puppeteer' | 'k6' | 'auto';
  device?: 'desktop' | 'mobile' | 'both';
  location?: string;
  throttling?: 'none' | '3g' | '4g';
  screenshots?: boolean;
  videoRecording?: boolean;
  realUserMetrics?: boolean;
  customMetrics?: string[];
  thresholds?: Record<string, number>;
  iterations?: number;
  timeout?: number;
}

export interface TestResult {
  id: string;
  testType: string;
  url: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'failed' | 'cancelled';
  overallScore: number;
  metrics: Record<string, any>;
  tests?: Record<string, any>; // 添加 tests 字段以支持新的数据结构
  findings: TestFinding[];
  recommendations: string[] | SEORecommendation[];
  screenshots?: Record<string, string>;
  videoPath?: string;
  rawData?: any;
  engine: string;
  config: AdvancedTestConfig;

  // SEO特定属性
  scores?: Record<string, number>;
  scoreGrade?: string;
  scoreDescription?: string;
  issues?: SEOIssue[];
  keywords?: SEOKeywordAnalysis;
  pageInfo?: {
    title?: string;
    statusCode?: number;
    redirects?: string[];
  };
  metadata?: {
    crawlTime?: number;
    pageSize?: number;
    loadTime?: number;
    contentType?: string;
    lastModified?: string;
    server?: string;
  };
  checks?: Record<string, SEOCheckResult>;
}

export interface SEORecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
}

export interface SEOIssue {
  type: string;
  category: string;
  message: string;
  impact: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface SEOKeywordAnalysis {
  density: Record<string, {
    count: number;
    density: number;
    status: 'optimal' | 'high' | 'low' | 'missing';
  }>;
  suggestions: string[];
  missing: string[];
  distribution?: Record<string, {
    inTitle: boolean;
    inH1: boolean;
    inH2?: boolean;
    inMetaDescription: boolean;
    inFirstParagraph: boolean;
    inAltText?: boolean;
    inUrl?: boolean;
  }>;
  prominence?: Record<string, {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  }>;
  relatedKeywords?: Array<{
    word: string;
    frequency: number;
  }>;
}

export interface SEOCheckResult {
  category: string;
  score: number;
  checks: Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    impact: 'positive' | 'neutral' | 'negative';
  }>;
  summary: string;
  metrics?: Record<string, any>;
  types?: string[];
}

export interface TestFinding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  details?: any;
  impact?: string;
  solution?: string;
}

export interface TestProgress {
  testId: string;
  progress: number;
  currentStep: string;
  phase: 'initializing' | 'running' | 'analyzing' | 'completing';
  estimatedTimeRemaining?: number;
  metrics?: Record<string, any>;
}

class AdvancedTestEngine extends BrowserEventEmitter {
  private activeTests = new Map<string, any>();
  private testHistory: TestResult[] = [];
  private maxConcurrentTests = 10;
  private engines = {
    lighthouse: false,
    playwright: false,
    puppeteer: false,
    k6: false
  };

  constructor() {
    super();
    this.initializeEngines();
  }

  async initializeEngines() {
    try {
      // 检查各种测试引擎的可用性
      const status = await testAPI.checkEngineStatus();
      if (status.success && status.data) {
        this.engines = {
          lighthouse: status.data.lighthouse?.available || false,
          playwright: status.data.playwright?.available || false,
          puppeteer: false, // 暂未实现
          k6: status.data.k6?.available || false
        };
      } else {
        // 如果API调用失败，使用默认值
        this.engines = {
          lighthouse: false,
          playwright: false,
          puppeteer: false,
          k6: false
        };
      }

      console.log('🔧 Test engines status:', this.engines);
    } catch (error) {
      console.error('Failed to initialize test engines:', error);
      // 设置默认值
      this.engines = {
        lighthouse: false,
        playwright: false,
        puppeteer: false,
        k6: false
      };
    }
  }

  async runAdvancedTest(config: AdvancedTestConfig): Promise<{ testId: string; promise: Promise<TestResult> }> {
    if (this.activeTests.size >= this.maxConcurrentTests) {
      throw new Error(`Maximum concurrent tests (${this.maxConcurrentTests}) reached`);
    }

    const testId = `${config.testType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    console.log(`🚀 Starting advanced ${config.testType} test:`, testId);

    // 选择最佳引擎
    const selectedEngine = config.engine === 'auto' ? this.selectBestEngine(config.testType) : config.engine || 'auto';

    const testPromise = new Promise<TestResult>((resolve, reject) => {
      // 使用后台测试管理器
      const backgroundTestId = backgroundTestManager.startTest(
        config.testType as any,
        config,
        // onProgress
        (progress: number, step: string, metrics?: any) => {
          const progressData: TestProgress = {
            testId,
            progress,
            currentStep: step,
            phase: this.getTestPhase(progress),
            estimatedTimeRemaining: this.estimateTimeRemaining(progress, startTime),
            metrics
          };
          this.emit('testProgress', progressData);
        },
        // onComplete
        (result: any) => {
          const testResult: TestResult = {
            id: testId,
            testType: config.testType,
            url: config.url,
            timestamp: new Date(startTime).toISOString(),
            duration: (Date.now() - startTime) / 1000,
            status: 'completed',
            overallScore: this.calculateOverallScore(result, config.testType),
            metrics: this.extractMetrics(result, config.testType),
            tests: result.tests, // 直接传递 tests 数据
            findings: this.extractFindings(result, config.testType),
            recommendations: this.generateRecommendations(result, config.testType),
            screenshots: result.screenshots,
            videoPath: result.videoPath,
            rawData: result,
            engine: selectedEngine,
            config
          };

          this.activeTests.delete(testId);
          this.testHistory.unshift(testResult);
          if (this.testHistory.length > 100) {
            this.testHistory = this.testHistory.slice(0, 100);
          }

          this.emit('testCompleted', testResult);
          resolve(testResult);
        },
        // onError
        (error: any) => {
          const testResult: TestResult = {
            id: testId,
            testType: config.testType,
            url: config.url,
            timestamp: new Date(startTime).toISOString(),
            duration: (Date.now() - startTime) / 1000,
            status: 'failed',
            overallScore: 0,
            metrics: {},
            findings: [],
            recommendations: [],
            rawData: { error: error.message },
            engine: selectedEngine,
            config
          };

          this.activeTests.delete(testId);
          this.emit('testFailed', testResult, error);
          reject(error);
        }
      );

      this.activeTests.set(testId, {
        id: testId,
        backgroundTestId,
        config,
        startTime,
        engine: selectedEngine
      });
    });

    return { testId, promise: testPromise };
  }

  private selectBestEngine(testType: string): string {
    switch (testType) {
      case 'performance':
      case 'seo':
      case 'accessibility':
        return this.engines.lighthouse ? 'lighthouse' :
          this.engines.playwright ? 'playwright' :
            this.engines.puppeteer ? 'puppeteer' : 'auto';

      case 'stress':
      case 'api':
        return this.engines.k6 ? 'k6' :
          this.engines.playwright ? 'playwright' : 'auto';

      case 'security':
      case 'compatibility':
        return this.engines.playwright ? 'playwright' :
          this.engines.puppeteer ? 'puppeteer' : 'auto';

      default:
        return this.engines.lighthouse ? 'lighthouse' : 'auto';
    }
  }

  private getTestPhase(progress: number): 'initializing' | 'running' | 'analyzing' | 'completing' {
    if (progress < 10) return 'initializing';
    if (progress < 80) return 'running';
    if (progress < 95) return 'analyzing';
    return 'completing';
  }

  private estimateTimeRemaining(progress: number, startTime: number): number {
    if (progress <= 0) return 0;
    const elapsed = Date.now() - startTime;
    const totalEstimated = elapsed / (progress / 100);
    return Math.max(0, totalEstimated - elapsed);
  }

  private calculateOverallScore(result: any, testType: string): number {
    // 优先使用后端计算的总体分数
    if (result.overallScore !== undefined && result.overallScore !== null) {
      return result.overallScore;
    }

    // 根据测试类型计算总体分数
    switch (testType) {
      case 'performance':
        return this.calculatePerformanceScore(result);
      case 'security':
        return this.calculateSecurityScore(result);
      case 'seo':
        return this.calculateSEOScore(result);
      case 'accessibility':
        return this.calculateAccessibilityScore(result);
      case 'website':
        // 对于网站综合测试，如果有tests数据，计算平均分
        if (result.tests) {
          const scores: number[] = [];
          Object.values(result.tests).forEach((test: any) => {
            if (test.score !== undefined && test.score !== null) {
              scores.push(test.score);
            }
          });
          return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        }
        return 0;
      default:
        return 0;
    }
  }

  private calculatePerformanceScore(result: any): number {
    if (result.lighthouse?.categories?.performance) {
      return result.lighthouse.categories.performance.score * 100;
    }
    // 基于Core Web Vitals计算
    const metrics = result.metrics || {};
    let score = 100;

    if (metrics.lcp > 2.5) score -= 20;
    if (metrics.fid > 100) score -= 20;
    if (metrics.cls > 0.1) score -= 20;
    if (metrics.loadTime > 3000) score -= 20;

    return Math.max(0, score);
  }

  private calculateSecurityScore(result: any): number {
    const findings = result.findings || [];
    let score = 100;

    findings.forEach((finding: TestFinding) => {
      switch (finding.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    return Math.max(0, score);
  }

  private calculateSEOScore(result: any): number {
    if (result.lighthouse?.categories?.seo) {
      return result.lighthouse.categories.seo.score * 100;
    }
    return result.seoScore || 0;
  }

  private calculateAccessibilityScore(result: any): number {
    if (result.lighthouse?.categories?.accessibility) {
      return result.lighthouse.categories.accessibility.score * 100;
    }
    return result.accessibilityScore || 0;
  }

  private extractMetrics(result: any, _testType: string): Record<string, any> {
    // 根据测试类型提取相关指标
    const metrics: Record<string, any> = {};

    // 处理旧格式的 metrics
    if (result.metrics) {
      Object.assign(metrics, result.metrics);
    }

    // 处理新格式的 tests 数据结构
    if (result.tests) {
      const tests = result.tests;

      // 提取各种测试的指标
      if (tests.performance) {
        metrics.performanceScore = tests.performance.score || 0;
        if (tests.performance.metrics) {
          Object.assign(metrics, tests.performance.metrics);
        }
      }

      if (tests.seo) {
        metrics.seoScore = tests.seo.score || 0;
      }

      if (tests.accessibility) {
        metrics.accessibilityScore = tests.accessibility.score || 0;
      }

      if (tests.security) {
        metrics.securityScore = tests.security.score || 0;
      }

      if (tests.connectivity) {
        metrics.connectivityScore = tests.connectivity.score || 0;
      }

      if (tests.compatibility) {
        metrics.compatibilityScore = tests.compatibility.score || 0;
      }

      if (tests.api) {
        metrics.apiScore = tests.api.score || 0;
      }
    }

    // 处理 Lighthouse 数据
    if (result.lighthouse) {
      const lhr = result.lighthouse;
      metrics.performanceScore = lhr.categories?.performance?.score * 100;
      metrics.seoScore = lhr.categories?.seo?.score * 100;
      metrics.accessibilityScore = lhr.categories?.accessibility?.score * 100;
      metrics.bestPracticesScore = lhr.categories?.['best-practices']?.score * 100;

      // Core Web Vitals
      if (lhr.audits) {
        metrics.lcp = lhr.audits['largest-contentful-paint']?.numericValue / 1000;
        metrics.fid = lhr.audits['max-potential-fid']?.numericValue;
        metrics.cls = lhr.audits['cumulative-layout-shift']?.numericValue;
        metrics.fcp = lhr.audits['first-contentful-paint']?.numericValue / 1000;
        metrics.ttfb = lhr.audits['server-response-time']?.numericValue;
      }
    }

    return metrics;
  }

  private extractFindings(result: any, _testType: string): TestFinding[] {
    const findings: TestFinding[] = [];

    if (result.findings && Array.isArray(result.findings)) {
      findings.push(...result.findings);
    }

    if (result.userExperienceIssues && Array.isArray(result.userExperienceIssues)) {
      findings.push(...result.userExperienceIssues.map((issue: any) => ({
        type: issue.type || 'ux',
        severity: issue.severity || 'medium',
        title: issue.description || issue.title || 'User Experience Issue',
        description: issue.description || '',
        recommendation: issue.recommendation || '',
        details: issue
      })));
    }

    return findings;
  }

  private generateRecommendations(result: any, testType: string): string[] {
    const recommendations: string[] = [];

    if (result.recommendations && Array.isArray(result.recommendations)) {
      recommendations.push(...result.recommendations);
    }

    // 基于测试类型生成通用建议
    switch (testType) {
      case 'performance':
        if (result.metrics?.loadTime > 3000) {
          recommendations.push('优化页面加载时间：压缩资源、启用缓存、使用CDN');
        }
        break;
      case 'security':
        if (result.findings?.some((f: any) => f.type === 'ssl')) {
          recommendations.push('加强SSL/TLS配置：使用强加密算法、及时更新证书');
        }
        break;
      case 'seo':
        if (result.metrics?.seoScore < 80) {
          recommendations.push('改善SEO：优化标题和描述、添加结构化数据、改善内链结构');
        }
        break;
    }

    return [...new Set(recommendations)]; // 去重
  }

  // 公共方法
  async stopTest(testId: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (test) {
      backgroundTestManager.cancelTest(test.backgroundTestId);
      this.activeTests.delete(testId);
      this.emit('testCancelled', testId);
      return true;
    }
    return false;
  }

  getActiveTests(): any[] {
    return Array.from(this.activeTests.values());
  }

  getTestHistory(limit = 50): TestResult[] {
    return this.testHistory.slice(0, limit);
  }

  getEngineStatus() {
    return { ...this.engines };
  }

  async getTestResult(testId: string): Promise<TestResult | null> {
    return this.testHistory.find(test => test.id === testId) || null;
  }

  async exportTestResult(testId: string, format: 'json' | 'csv' | 'pdf' | 'html'): Promise<any> {
    const result = await this.getTestResult(testId);
    if (!result) {
      throw new Error('Test result not found');
    }

    try {
      const response = await testAPI.exportTestResults(testId, format);
      return response.data;
    } catch (error) {
      console.error('Failed to export test result:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const advancedTestEngine = new AdvancedTestEngine();
export default advancedTestEngine;
