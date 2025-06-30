// 统一测试引擎接口
export interface BaseTestConfig {
  url: string;
  timeout?: number;
  retries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface TestResult {
  id: string;
  type: TestType;
  url: string;
  timestamp: string;
  duration: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  score: number;
  summary: string;
  details: any;
  recommendations: Recommendation[];
  metrics: TestMetrics;
  errors?: string[];
  warnings?: string[];
}

export interface TestMetrics {
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  security: SecurityMetrics;
  accessibility: AccessibilityMetrics;
}

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  speedIndex: number;
  totalBlockingTime: number;
}

export interface ReliabilityMetrics {
  uptime: number;
  errorRate: number;
  responseTime: number;
  availability: number;
  consistency: number;
}

export interface SecurityMetrics {
  httpsUsage: boolean;
  securityHeaders: Record<string, boolean>;
  vulnerabilities: SecurityVulnerability[];
  securityScore: number;
  certificateValid: boolean;
}

export interface AccessibilityMetrics {
  score: number;
  violations: AccessibilityViolation[];
  bestPractices: number;
  seoScore: number;
}

export interface Recommendation {
  id: string;
  category: 'performance' | 'security' | 'accessibility' | 'seo' | 'reliability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  solution: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  resources?: string[];
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  solution: string;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: any[];
}

export type TestType = 'stress' | 'content' | 'compatibility' | 'api' | 'security' | 'accessibility' | 'performance';

export interface TestProgress {
  stage: string;
  progress: number;
  message: string;
  details?: any;
}

export type ProgressCallback = (progress: TestProgress) => void;

// 统一测试引擎抽象类
export abstract class UnifiedTestEngine {
  protected testId: string;
  protected config: BaseTestConfig;
  protected progressCallback?: ProgressCallback;

  constructor(config: BaseTestConfig, progressCallback?: ProgressCallback) {
    this.testId = this.generateTestId();
    this.config = config;
    this.progressCallback = progressCallback;
  }

  protected generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected updateProgress(stage: string, progress: number, message: string, details?: any) {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message, details });
    }
  }

  protected async validateUrl(url: string): Promise<boolean> {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  protected async checkConnectivity(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  protected calculateOverallScore(metrics: TestMetrics): number {
    const weights = {
      performance: 0.3,
      reliability: 0.25,
      security: 0.25,
      accessibility: 0.2,
    };

    const performanceScore = this.calculatePerformanceScore(metrics.performance);
    const reliabilityScore = this.calculateReliabilityScore(metrics.reliability);
    const securityScore = metrics.security.securityScore;
    const accessibilityScore = metrics.accessibility.score;

    return Math.round(
      performanceScore * weights.performance +
      reliabilityScore * weights.reliability +
      securityScore * weights.security +
      accessibilityScore * weights.accessibility
    );
  }

  protected calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // 基于 Lighthouse 评分算法的简化版本
    const scores = {
      fcp: this.scoreMetric(metrics.firstContentfulPaint, [1.8, 3.0]),
      lcp: this.scoreMetric(metrics.largestContentfulPaint, [2.5, 4.0]),
      cls: this.scoreMetric(metrics.cumulativeLayoutShift, [0.1, 0.25], true),
      fid: this.scoreMetric(metrics.firstInputDelay, [100, 300]),
      tti: this.scoreMetric(metrics.timeToInteractive, [3.8, 7.3]),
      si: this.scoreMetric(metrics.speedIndex, [3.4, 5.8]),
      tbt: this.scoreMetric(metrics.totalBlockingTime, [200, 600]),
    };

    const weights = {
      fcp: 0.1,
      lcp: 0.25,
      cls: 0.15,
      fid: 0.1,
      tti: 0.1,
      si: 0.1,
      tbt: 0.2,
    };

    return Math.round(
      Object.entries(scores).reduce((total, [key, score]) => {
        return total + score * weights[key as keyof typeof weights];
      }, 0)
    );
  }

  protected calculateReliabilityScore(metrics: ReliabilityMetrics): number {
    const uptimeScore = metrics.uptime;
    const errorScore = Math.max(0, 100 - metrics.errorRate * 10);
    const responseScore = this.scoreMetric(metrics.responseTime, [200, 1000]);
    const availabilityScore = metrics.availability;
    const consistencyScore = metrics.consistency;

    return Math.round(
      (uptimeScore * 0.3 +
        errorScore * 0.2 +
        responseScore * 0.2 +
        availabilityScore * 0.15 +
        consistencyScore * 0.15)
    );
  }

  protected scoreMetric(value: number, thresholds: [number, number], inverse = false): number {
    const [good, poor] = thresholds;
    let score: number;

    if (inverse) {
      // 对于像 CLS 这样的指标，值越小越好
      if (value <= good) score = 100;
      else if (value >= poor) score = 0;
      else score = 100 - ((value - good) / (poor - good)) * 100;
    } else {
      // 对于像响应时间这样的指标，值越小越好
      if (value <= good) score = 100;
      else if (value >= poor) score = 0;
      else score = 100 - ((value - good) / (poor - good)) * 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  protected generateRecommendations(metrics: TestMetrics, testType: TestType): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 性能建议
    if (metrics.performance.largestContentfulPaint > 2.5) {
      recommendations.push({
        id: 'lcp-optimization',
        category: 'performance',
        priority: 'high',
        title: '优化最大内容绘制 (LCP)',
        description: `当前 LCP 为 ${metrics.performance.largestContentfulPaint.toFixed(2)}s，超过了推荐的 2.5s`,
        solution: '优化图片大小、使用 CDN、减少服务器响应时间',
        impact: '提升用户体验和搜索引擎排名',
        effort: 'medium',
        resources: ['https://web.dev/lcp/']
      });
    }

    // 安全建议
    if (!metrics.security.httpsUsage) {
      recommendations.push({
        id: 'https-migration',
        category: 'security',
        priority: 'critical',
        title: '启用 HTTPS',
        description: '网站未使用 HTTPS 加密连接',
        solution: '配置 SSL 证书并强制使用 HTTPS',
        impact: '保护用户数据安全，提升搜索引擎排名',
        effort: 'low',
        resources: ['https://developers.google.com/web/fundamentals/security/encrypt-in-transit/why-https']
      });
    }

    // 可访问性建议
    if (metrics.accessibility.score < 80) {
      recommendations.push({
        id: 'accessibility-improvement',
        category: 'accessibility',
        priority: 'medium',
        title: '改善网站可访问性',
        description: `可访问性评分为 ${metrics.accessibility.score}，低于推荐的 80 分`,
        solution: '添加 alt 属性、改善颜色对比度、优化键盘导航',
        impact: '提升残障用户体验，符合法律法规要求',
        effort: 'medium',
        resources: ['https://web.dev/accessibility/']
      });
    }

    return recommendations;
  }

  // 抽象方法，由具体的测试引擎实现
  abstract runTest(): Promise<TestResult>;
  abstract cancelTest(): Promise<void>;
  abstract getTestStatus(): 'running' | 'completed' | 'failed' | 'cancelled';
}

// 测试引擎工厂
export class TestEngineFactory {
  static createEngine(type: TestType, config: BaseTestConfig, progressCallback?: ProgressCallback): UnifiedTestEngine {
    switch (type) {
      case 'stress':
        return new StressTestEngine(config, progressCallback);
      case 'content':
        return new ContentTestEngine(config, progressCallback);
      case 'compatibility':
        return new CompatibilityTestEngine(config, progressCallback);
      case 'api':
        return new APITestEngine(config, progressCallback);
      case 'security':
        return new SecurityTestEngine(config, progressCallback);
      case 'accessibility':
        return new AccessibilityTestEngine(config, progressCallback);
      case 'performance':
        return new PerformanceTestEngine(config, progressCallback);
      default:
        throw new Error(`Unsupported test type: ${type}`);
    }
  }
}

// 占位符类，实际实现将在各自的文件中
class StressTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class ContentTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class CompatibilityTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class APITestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class SecurityTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class AccessibilityTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

class PerformanceTestEngine extends UnifiedTestEngine {
  async runTest(): Promise<TestResult> { throw new Error('Not implemented'); }
  async cancelTest(): Promise<void> { throw new Error('Not implemented'); }
  getTestStatus() { return 'running' as const; }
}

// 默认导出工厂类
export default TestEngineFactory;
