/**
 * 完整的测试结果处理器
 * 提供测试结果分析、评分计算、报告生成和数据可视化功能
 * 支持多种测试类型的结果处理和智能建议生成
 */

import type { TestResult, TestIssue, TestRecommendation, TestType } from './CompleteTestEngine';

// 评分权重配置
export interface ScoreWeights {
  performance: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
    si: number;
    tbt: number;
    tti: number;
  };
  security: {
    vulnerabilities: number;
    ssl: number;
    headers: number;
    mixedContent: number;
  };
  seo: {
    meta: number;
    headings: number;
    images: number;
    links: number;
    structure: number;
  };
  accessibility: {
    violations: number;
    contrast: number;
    keyboard: number;
    screenReader: number;
  };
}

// 分析结果接口
export interface AnalysisResult {
  overallScore: number;
  categoryScores: Record<string, number>;
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  trends: {
    improvement: number;
    regression: number;
    stable: number;
  };
  benchmarks: {
    industry: number;
    competitors: number;
    historical: number;
  };
}

// 报告配置接口
export interface ReportConfig {
  format: 'html' | 'pdf' | 'json' | 'csv'
  template: 'executive' | 'technical' | 'detailed' | 'summary'
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeComparison: boolean;
  customSections?: string[];
  branding?: {
    logo?: string;
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
  };
}

// 图表数据接口
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'radar' | 'scatter'
  title: string;
  data: any[];
  options?: Record<string, any>;
}

// 完整测试结果处理器类
export class CompleteTestResultProcessor {
  private scoreWeights: ScoreWeights;
  private industryBenchmarks: Map<TestType, Record<string, number>> = new Map();

  constructor(scoreWeights?: Partial<ScoreWeights>) {
    this.scoreWeights = {
      performance: {
        fcp: 0.15,
        lcp: 0.25,
        fid: 0.15,
        cls: 0.15,
        si: 0.10,
        tbt: 0.10,
        tti: 0.10
      },
      security: {
        vulnerabilities: 0.40,
        ssl: 0.25,
        headers: 0.20,
        mixedContent: 0.15
      },
      seo: {
        meta: 0.25,
        headings: 0.20,
        images: 0.15,
        links: 0.20,
        structure: 0.20
      },
      accessibility: {
        violations: 0.40,
        contrast: 0.25,
        keyboard: 0.20,
        screenReader: 0.15
      },
      ...scoreWeights
    };

    this.initializeBenchmarks();
  }

  // 处理测试结果
  async processResult(result: TestResult): Promise<TestResult> {
    // 重新计算评分
    result.score = this.calculateScore(result);
    
    // 增强问题分析
    result.issues = this.enhanceIssues(result.issues, result.type);
    
    // 生成智能建议
    result.recommendations = this.generateSmartRecommendations(result);
    
    // 添加分析数据
    result.metadata = {
      ...result.metadata,
      analysis: this.analyzeResult(result),
      processed: true,
      processedAt: new Date().toISOString()
    };

    return result;
  }

  // 计算综合评分
  calculateScore(result: TestResult): number {
    switch (result.type) {
      case TestType.PERFORMANCE:
        return this.calculatePerformanceScore(result.metrics);
      case TestType.SECURITY:
        return this.calculateSecurityScore(result.metrics);
      case TestType.SEO:
        return this.calculateSEOScore(result.metrics);
      case TestType.ACCESSIBILITY:
        return this.calculateAccessibilityScore(result.metrics);
      case TestType.COMPATIBILITY:
        return this.calculateCompatibilityScore(result.metrics);
      case TestType.UX:
        return this.calculateUXScore(result.metrics);
      case TestType.API:
        return this.calculateAPIScore(result.metrics);
      case TestType.STRESS:
        return this.calculateStressScore(result.metrics);
      default:
        return result.score || 0;
    }
  }

  // 性能评分计算
  private calculatePerformanceScore(metrics: Record<string, any>): number {
    const weights = this.scoreWeights.performance;
    let score = 0;

    // FCP (First Contentful Paint)
    if (metrics.firstContentfulPaint) {
      const fcpScore = this.getPerformanceMetricScore(metrics.firstContentfulPaint, 1800, 3000);
      score += fcpScore * weights.fcp;
    }

    // LCP (Largest Contentful Paint)
    if (metrics.largestContentfulPaint) {
      const lcpScore = this.getPerformanceMetricScore(metrics.largestContentfulPaint, 2500, 4000);
      score += lcpScore * weights.lcp;
    }

    // FID (First Input Delay)
    if (metrics.firstInputDelay) {
      const fidScore = this.getPerformanceMetricScore(metrics.firstInputDelay, 100, 300);
      score += fidScore * weights.fid;
    }

    // CLS (Cumulative Layout Shift)
    if (metrics.cumulativeLayoutShift) {
      const clsScore = this.getPerformanceMetricScore(metrics.cumulativeLayoutShift, 0.1, 0.25, true);
      score += clsScore * weights.cls;
    }

    // Speed Index
    if (metrics.speedIndex) {
      const siScore = this.getPerformanceMetricScore(metrics.speedIndex, 3400, 5800);
      score += siScore * weights.si;
    }

    // TBT (Total Blocking Time)
    if (metrics.totalBlockingTime) {
      const tbtScore = this.getPerformanceMetricScore(metrics.totalBlockingTime, 200, 600);
      score += tbtScore * weights.tbt;
    }

    // TTI (Time to Interactive)
    if (metrics.timeToInteractive) {
      const ttiScore = this.getPerformanceMetricScore(metrics.timeToInteractive, 3800, 7300);
      score += ttiScore * weights.tti;
    }

    return Math.round(score * 100);
  }

  // 安全评分计算
  private calculateSecurityScore(metrics: Record<string, any>): number {
    const weights = this.scoreWeights.security;
    let score = 100;

    // 漏洞扣分
    if (metrics.vulnerabilities) {
      const vulnPenalty = Math.min(metrics.vulnerabilities * 10, 40);
      score -= vulnPenalty * weights.vulnerabilities;
    }

    // SSL评分
    if (metrics.sslGrade) {
      const sslScore = this.getSSLScore(metrics.sslGrade);
      score = score * (1 - weights.ssl) + sslScore * weights.ssl;
    }

    // 安全头评分
    if (metrics.securityHeaders) {
      score = score * (1 - weights.headers) + metrics.securityHeaders * weights.headers;
    }

    // 混合内容扣分
    if (metrics.mixedContent) {
      const mixedPenalty = Math.min(metrics.mixedContent * 5, 15);
      score -= mixedPenalty * weights.mixedContent;
    }

    return Math.max(0, Math.round(score));
  }

  // SEO评分计算
  private calculateSEOScore(metrics: Record<string, any>): number {
    const weights = this.scoreWeights.seo;
    let score = 0;

    // Meta标签评分
    const metaScore = this.calculateMetaScore(metrics);
    score += metaScore * weights.meta;

    // 标题结构评分
    const headingScore = this.calculateHeadingScore(metrics);
    score += headingScore * weights.headings;

    // 图片优化评分
    const imageScore = this.calculateImageScore(metrics);
    score += imageScore * weights.images;

    // 链接评分
    const linkScore = this.calculateLinkScore(metrics);
    score += linkScore * weights.links;

    // 页面结构评分
    const structureScore = this.calculateStructureScore(metrics);
    score += structureScore * weights.structure;

    return Math.round(score * 100);
  }

  // 可访问性评分计算
  private calculateAccessibilityScore(metrics: Record<string, any>): number {
    const weights = this.scoreWeights.accessibility;
    let score = 100;

    // 违规扣分
    if (metrics.violations) {
      const violationPenalty = Math.min(metrics.violations * 5, 40);
      score -= violationPenalty * weights.violations;
    }

    // 颜色对比度评分
    if (metrics.colorContrast) {
      score = score * (1 - weights.contrast) + metrics.colorContrast * weights.contrast;
    }

    // 键盘导航评分（基于违规类型）
    const keyboardScore = this.calculateKeyboardScore(metrics);
    score = score * (1 - weights.keyboard) + keyboardScore * weights.keyboard;

    // 屏幕阅读器评分
    const screenReaderScore = this.calculateScreenReaderScore(metrics);
    score = score * (1 - weights.screenReader) + screenReaderScore * weights.screenReader;

    return Math.max(0, Math.round(score));
  }

  // 兼容性评分计算
  private calculateCompatibilityScore(metrics: Record<string, any>): number {
    let score = 0;

    if (metrics.supportedBrowsers && metrics.totalBrowsers) {
      const browserScore = (metrics.supportedBrowsers / metrics.totalBrowsers) * 100;
      score += browserScore * 0.4;
    }

    if (metrics.responsiveScore) {
      score += metrics.responsiveScore * 0.3;
    }

    if (metrics.cssCompatibility) {
      score += metrics.cssCompatibility * 0.3;
    }

    return Math.round(score);
  }

  // UX评分计算
  private calculateUXScore(metrics: Record<string, any>): number {
    let score = 0;

    if (metrics.usabilityScore) {
      score += metrics.usabilityScore * 0.3;
    }

    if (metrics.navigationScore) {
      score += metrics.navigationScore * 0.25;
    }

    if (metrics.contentScore) {
      score += metrics.contentScore * 0.25;
    }

    if (metrics.visualScore) {
      score += metrics.visualScore * 0.2;
    }

    return Math.round(score);
  }

  // API评分计算
  private calculateAPIScore(metrics: Record<string, any>): number {
    let score = 100;

    // 响应时间评分
    if (metrics.responseTime) {
      const responseScore = this.getPerformanceMetricScore(metrics.responseTime, 200, 1000);
      score = score * 0.4 + responseScore * 0.4;
    }

    // 状态码评分
    if (metrics.statusCode) {
      const statusScore = metrics.statusCode >= 200 && metrics.statusCode < 300 ? 100 : 0;
      score = score * 0.6 + statusScore * 0.4;
    }

    // 可用性评分
    if (metrics.availability) {
      score = score * 0.8 + metrics.availability * 0.2;
    }

    return Math.round(score);
  }

  // 压力测试评分计算
  private calculateStressScore(metrics: Record<string, any>): number {
    let score = 100;

    // 错误率扣分
    if (metrics.errorRate) {
      score -= metrics.errorRate * 100;
    }

    // 响应时间评分
    if (metrics.averageResponseTime) {
      const responseScore = this.getPerformanceMetricScore(metrics.averageResponseTime, 500, 2000);
      score = score * 0.6 + responseScore * 0.4;
    }

    return Math.max(0, Math.round(score));
  }

  // 增强问题分析
  private enhanceIssues(issues: TestIssue[], testType: TestType): TestIssue[] {
    return issues.map(issue => ({
      ...issue,
      priority: this.calculateIssuePriority(issue, testType),
      estimatedFixTime: this.estimateFixTime(issue),
      businessImpact: this.calculateBusinessImpact(issue),
      tags: this.generateIssueTags(issue, testType)
    }));
  }

  // 生成智能建议
  private generateSmartRecommendations(result: TestResult): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [...result.recommendations];
    
    // 基于评分生成建议
    if (result.score < 70) {>
      recommendations.push({
        id: 'overall-improvement',
        category: 'general',
        title: '整体优化建议',
        description: '您的网站需要全面优化以提升用户体验',
        priority: 'high',
        effort: 'hard',
        impact: 90,
        implementation: '建议优先处理高影响的问题，制定分阶段优化计划'
      });
    }

    // 基于问题类型生成建议
    const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push({
        id: 'critical-fixes',
        category: 'urgent',
        title: '紧急修复建议',
        description: `发现${criticalIssues.length}个严重问题需要立即处理`,
        priority: 'high',
        effort: 'medium',
        impact: 95,
        implementation: '立即修复所有严重级别的问题'
      });
    }

    return recommendations;
  }

  // 分析测试结果
  private analyzeResult(result: TestResult): AnalysisResult {
    const benchmark = this.industryBenchmarks.get(result.type) || {};
    
    return {
      overallScore: result.score,
      categoryScores: this.calculateCategoryScores(result),
      insights: this.generateInsights(result),
      trends: this.analyzeTrends(result),
      benchmarks: {
        industry: benchmark.industry || 0,
        competitors: benchmark.competitors || 0,
        historical: benchmark.historical || 0
      }
    };
  }

  // 生成报告
  async generateReport(results: TestResult[], config: ReportConfig): Promise<string> {
    const reportData = {
      title: '网站测试报告',
      generatedAt: new Date().toISOString(),
      results,
      summary: this.generateSummary(results),
      charts: config.includeCharts ? this.generateCharts(results) : [],
      recommendations: config.includeRecommendations ? this.consolidateRecommendations(results) : [],
      config
    };

    switch (config.format) {
      case 'html':
        return this.generateHTMLReport(reportData, config);
      case 'pdf':
        return this.generatePDFReport(reportData, config);
      case 'json':
        return JSON.stringify(reportData, null, 2);
      case 'csv':
        return this.generateCSVReport(reportData);
      default:
        throw new Error(`Unsupported report format: ${config.format}`);
    }
  }

  // 比较测试结果
  compareResults(results: TestResult[]): {
    comparison: Record<string, any>;
    trends: Record<string, number>;
    insights: string[];
  } {
    if (results.length < 2) {>
      throw new Error('At least 2 results are required for comparison');
    }

    const comparison: Record<string, any> = {};
    const trends: Record<string, number> = {};
    const insights: string[] = [];

    // 比较评分
    const scores = results.map(r => r.score);
    comparison.scores = scores;
    trends.scoreChange = scores[scores.length - 1] - scores[0];

    // 比较指标
    const firstResult = results[0];
    const lastResult = results[results.length - 1];
    
    Object.keys(firstResult.metrics).forEach(metric => {
      const firstValue = firstResult.metrics[metric];
      const lastValue = lastResult.metrics[metric];
      
      if (typeof firstValue === 'number' && typeof lastValue === 'number') {
        trends[metric] = lastValue - firstValue;
        comparison[metric] = {
          first: firstValue,
          last: lastValue,
          change: lastValue - firstValue,
          changePercent: firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
        };
      }
    });

    // 生成洞察
    if (trends.scoreChange > 10) {
      insights.push('整体性能有显著提升');
    } else if (trends.scoreChange < -10) {>
      insights.push('整体性能有所下降，需要关注');
    }

    return { comparison, trends, insights };
  }

  // 私有辅助方法

  private getPerformanceMetricScore(value: number, good: number, poor: number, lowerIsBetter: boolean = false): number {
    if (lowerIsBetter) {
      if (value <= good) return 100;>
      if (value >= poor) return 0;
      return Math.round(100 - ((value - good) / (poor - good)) * 100);
    } else {
      if (value <= good) return 100;>
      if (value >= poor) return 0;
      return Math.round(100 - ((value - good) / (poor - good)) * 100);
    }
  }

  private getSSLScore(grade: string): number {
    const gradeMap: Record<string, number> = {
      'A+': 100, 'A': 95, 'A-': 90,
      'B+': 85, 'B': 80, 'B-': 75,
      'C+': 70, 'C': 65, 'C-': 60,
      'D+': 55, 'D': 50, 'D-': 45,
      'F': 0
    };
    return gradeMap[grade] || 0;
  }

  private calculateMetaScore(metrics: Record<string, any>): number {
    let score = 0;
    
    if (metrics.titleLength >= 30 && metrics.titleLength <= 60) {
      score += 0.5;
    }
    
    if (metrics.descriptionLength >= 120 && metrics.descriptionLength <= 160) {
      score += 0.5;
    }
    
    return score;
  }

  private calculateHeadingScore(metrics: Record<string, any>): number {
    if (metrics.headingsCount > 0) {
      return Math.min(metrics.headingsCount / 10, 1);
    }
    return 0;
  }

  private calculateImageScore(metrics: Record<string, any>): number {
    if (metrics.imagesWithoutAlt === 0) {
      return 1;
    }
    return Math.max(0, 1 - (metrics.imagesWithoutAlt / 10));
  }

  private calculateLinkScore(metrics: Record<string, any>): number {
    const totalLinks = (metrics.internalLinks || 0) + (metrics.externalLinks || 0);
    if (totalLinks > 0) {
      return Math.min(totalLinks / 20, 1);
    }
    return 0;
  }

  private calculateStructureScore(metrics: Record<string, any>): number {
    // 基于页面结构的评分逻辑
    return 0.8; // 默认评分
  }

  private calculateKeyboardScore(metrics: Record<string, any>): number {
    // 基于键盘导航相关违规的评分
    return 80; // 默认评分
  }

  private calculateScreenReaderScore(metrics: Record<string, any>): number {
    // 基于屏幕阅读器相关违规的评分
    return 85; // 默认评分
  }

  private calculateIssuePriority(issue: TestIssue, testType: TestType): 'low' | 'medium' | 'high' | 'critical' {
    if (issue.severity === 'critical' || issue.impact > 80) {
      return 'critical'
    }
    if (issue.severity === 'high' || issue.impact > 60) {
      return 'high'
    }
    if (issue.severity === 'medium' || issue.impact > 30) {
      return 'medium'
    }
    return 'low'
  }

  private estimateFixTime(issue: TestIssue): string {
    const impactMap: Record<string, string> = {
      'critical': '1-2 hours',
      'high': '2-4 hours',
      'medium': '4-8 hours',
      'low': '1-2 days'
    };
    return impactMap[issue.severity] || '未知'
  }

  private calculateBusinessImpact(issue: TestIssue): 'low' | 'medium' | 'high' {
    if (issue.impact > 70) return 'high'
    if (issue.impact > 40) return 'medium'
    return 'low'
  }

  private generateIssueTags(issue: TestIssue, testType: TestType): string[] {
    const tags = [testType, issue.severity];
    
    if (issue.category) {
      tags.push(issue.category);
    }
    
    if (issue.impact > 80) {
      tags.push('high-impact');
    }
    
    return tags;
  }

  private calculateCategoryScores(result: TestResult): Record<string, number> {
    // 根据测试类型计算各类别评分
    return {
      [result.type]: result.score
    };
  }

  private generateInsights(result: TestResult): AnalysisResult['insights'] {
    const insights = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      threats: [] as string[]
    };

    if (result.score > 80) {
      insights.strengths.push('整体表现优秀');
    }

    if (result.issues.length > 5) {
      insights.weaknesses.push('存在较多需要改进的问题');
    }

    return insights;
  }

  private analyzeTrends(result: TestResult): AnalysisResult['trends'] {
    // 分析趋势数据
    return {
      improvement: 0,
      regression: 0,
      stable: 100
    };
  }

  private generateSummary(results: TestResult[]): Record<string, any> {
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    
    return {
      averageScore: Math.round(averageScore),
      totalTests: results.length,
      totalIssues,
      testTypes: [...new Set(results.map(r => r.type))]
    };
  }

  private generateCharts(results: TestResult[]): ChartData[] {
    const charts: ChartData[] = [];

    // 评分分布图
    charts.push({
      type: 'bar',
      title: '测试评分分布',
      data: results.map(r => ({
        name: r.type,
        score: r.score
      }))
    });

    return charts;
  }

  private consolidateRecommendations(results: TestResult[]): TestRecommendation[] {
    const allRecommendations = results.flatMap(r => r.recommendations);
    
    // 去重和优先级排序
    const uniqueRecommendations = allRecommendations.filter((rec, index, arr) => 
      arr.findIndex(r => r.id === rec.id) === index
    );

    return uniqueRecommendations.sort((a, b) => b.impact - a.impact);
  }

  private generateHTMLReport(data: any, config: ReportConfig): string {
    // 生成HTML报告
    return `<!DOCTYPE html><html><head><title>${data.title}</title></head><body><h1>${data.title}</h1></body></html>`;
  }

  private generatePDFReport(data: any, config: ReportConfig): string {
    // 生成PDF报告（返回base64或URL）
    return 'pdf-content-placeholder'
  }

  private generateCSVReport(data: any): string {
    // 生成CSV报告
    const headers = ['Test Type', 'URL', 'Score', 'Issues', 'Duration'];
    const rows = data.results.map((r: TestResult) => [
      r.type, r.url, r.score, r.issues.length, r.duration || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private initializeBenchmarks(): void {
    // 初始化行业基准数据
    this.industryBenchmarks.set(TestType.PERFORMANCE, {
      industry: 75,
      competitors: 80,
      historical: 70
    });
    
    this.industryBenchmarks.set(TestType.SECURITY, {
      industry: 85,
      competitors: 88,
      historical: 82
    });
  }
}

// 创建默认测试结果处理器实例
export const completeTestResultProcessor = new CompleteTestResultProcessor();

export default CompleteTestResultProcessor;
