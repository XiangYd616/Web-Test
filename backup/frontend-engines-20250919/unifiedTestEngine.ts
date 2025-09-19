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

// TestType 已迁移到统一类型系统
import { TestType } from '@shared/types';

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
  
  // 通用的后端API调用方法
  protected async callBackendAPI(endpoint: string, config: BaseTestConfig): Promise<TestResult> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          ...config,
          testId: this.testId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '测试执行失败');
      }
      
      return this.formatApiResponse(result.data);
    } catch (error) {
      throw new Error(`测试引擎调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 格式API响应为统一格式
  private formatApiResponse(data: any): TestResult {
    return {
      id: data.id || this.testId,
      type: data.type || 'unknown',
      url: this.config.url || '',
      timestamp: data.timestamp || new Date().toISOString(),
      duration: data.duration || 0,
      status: data.status || 'completed',
      score: data.score || 0,
      summary: data.summary || '测试完成',
      details: data.details || {},
      recommendations: data.recommendations || [],
      metrics: data.metrics || {},
      errors: data.errors || [],
      warnings: data.warnings || []
    };
  }
}

/**
 * 测试调度器 - 前端不实现具体测试逻辑，只负责调度后端测试
 * 
 * 正确的架构:
 * - 前端: UI + 调度 + 结果展示
 * - 后端: 实际测试执行 + 工具集成
 */
export class TestScheduler {
  /**
   * 调度后端测试执行
   */
  static async scheduleTest(
    type: TestType, 
    config: BaseTestConfig, 
    progressCallback?: ProgressCallback
  ): Promise<TestResult> {
    // 获取对应的API端点
    const endpoint = this.getApiEndpoint(type);
    
    try {
      // 调用后端API执行实际测试
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          testType: type,
          config,
          testId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`测试调度失败: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '测试执行失败');
      }
      
      return result.data;
      
    } catch (error) {
      throw new Error(`测试调度错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 获取测试类型对应的API端点
   */
  private static getApiEndpoint(type: TestType): string {
    const endpoints: Record<string, string> = {
      [TestType.API]: '/api/test/api',
      [TestType.PERFORMANCE]: '/api/test/performance',
      [TestType.SECURITY]: '/api/test/security', 
      [TestType.STRESS]: '/api/test/stress',
      [TestType.SEO]: '/api/test/seo',
      [TestType.ACCESSIBILITY]: '/api/test/accessibility',
      [TestType.COMPATIBILITY]: '/api/test/compatibility',
      [TestType.WEBSITE]: '/api/test/website',
      [TestType.INFRASTRUCTURE]: '/api/test/infrastructure'
    };
    
    const endpoint = endpoints[type];
    if (!endpoint) {
      throw new Error(`不支持的测试类型: ${type}`);
    }
    
    return endpoint;
  }
  
  /**
   * 获取支持的测试类型 (从配置文件读取)
   */
  static async getSupportedTestTypes(): Promise<TestType[]> {
    try {
      const response = await fetch('/config/testTools.json');
      if (!response.ok) return [];
      
      const config = await response.json();
      const types = [];
      
      // 从配置文件提取支持的测试类型
      if (config.engines) {
        ['core', 'analysis', 'composite'].forEach(layer => {
          if (config.engines[layer]) {
            config.engines[layer].forEach((engine: any) => {
              if (engine.enabled && engine.id) {
                types.push(engine.id);
              }
            });
          }
        });
      }
      
      return types;
    } catch (error) {
      console.warn('无法读取测试配置:', error);
      // 默认支持的类型
      return [TestType.API, TestType.PERFORMANCE, TestType.SECURITY, TestType.STRESS];
    }
  }

  /**
   * 获取所有支持的引擎类型
   */
  static getSupportedEngines(): TestType[] {
    return [
      TestType.API,
      TestType.PERFORMANCE, 
      TestType.SECURITY,
      TestType.STRESS,
      TestType.SEO,
      TestType.ACCESSIBILITY,
      TestType.COMPATIBILITY,
      TestType.WEBSITE,
      TestType.INFRASTRUCTURE
    ];
  }

  /**
   * 根据层次获取引擎
   */
  static getEnginesByLayer(layer: 'core' | 'analysis' | 'composite'): TestType[] {
    switch (layer) {
      case 'core':
        return [TestType.API, TestType.PERFORMANCE, TestType.SECURITY, TestType.STRESS];
      case 'analysis':
        return [TestType.SEO, TestType.ACCESSIBILITY, TestType.COMPATIBILITY];
      case 'composite':
        return [TestType.WEBSITE, TestType.INFRASTRUCTURE];
      default:
        return [];
    }
  }
}

// 注意: 前端不实现具体的测试引擎，只负责调度
// 实际的测试执行由后端完成，UnifiedTestEngine 仅用于类型定义
// 具体的测试调度使用 TestScheduler

// 默认导出工厂类
export default TestEngineFactory;
