/**
 * 高级SEO报告生成器
 * 本地化程度：100%
 * 智能化SEO报告生成，包括问题优先级排序、具体优化建议、代码示例、效果预估等
 */

interface ImpactWeights {
  high: number;
  medium: number;
  low: number;
}

interface EffortWeights {
  low: number;
  medium: number;
  high: number;
}

interface SeoImpactFactors {
  title: { traffic: number; ranking: number; ctr: number };
  meta_description: { traffic: number; ranking: number; ctr: number };
  headings: { traffic: number; ranking: number; ctr: number };
  content_quality: { traffic: number; ranking: number; ctr: number };
  internal_links: { traffic: number; ranking: number; ctr: number };
  page_speed: { traffic: number; ranking: number; ctr: number };
  mobile_friendly: { traffic: number; ranking: number; ctr: number };
  structured_data: { traffic: number; ranking: number; ctr: number };
}

interface AnalysisData {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: string;
  };
  meta?: any;
  content?: any;
  contentQuality?: any;
  links?: any;
  mobile?: any;
  structuredData?: any;
  performance?: any;
}

interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  examples: any[];
  implementation: any[];
  resources: any[];
}

interface SeoReport {
  url: string;
  timestamp: Date;
  summary: ReportSummary;
  scores: ScoreAnalysis;
  issues: IssueAnalysis;
  recommendations: RecommendationAnalysis;
  roadmap: OptimizationRoadmap;
  metrics: ExpectedMetrics;
  resources: ReportResources;
}

interface ReportSummary {
  overallScore: number;
  grade: string;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  estimatedImpact: string;
  estimatedEffort: string;
}

interface ScoreAnalysis {
  overall: number;
  categories: CategoryScore[];
  trend: ScoreTrend;
  comparison: ScoreComparison;
}

interface CategoryScore {
  category: string;
  score: number;
  weight: number;
  impact: number;
  issues: number;
}

interface ScoreTrend {
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

interface ScoreComparison {
  industry: number;
  competitors: number;
  benchmark: number;
}

interface IssueAnalysis {
  total: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byImpact: Record<string, number>;
  critical: CriticalIssue[];
}

interface CriticalIssue {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  urgency: 'immediate' | 'urgent' | 'important';
  fixTime: string;
}

interface RecommendationAnalysis {
  total: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byEffort: Record<string, number>;
  topRecommendations: Recommendation[];
  quickWins: Recommendation[];
  longTerm: Recommendation[];
}

interface OptimizationRoadmap {
  phases: RoadmapPhase[];
  timeline: string;
  totalEffort: string;
  expectedResults: string;
}

interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  effort: string;
  recommendations: string[];
  expectedImpact: string;
}

interface ExpectedMetrics {
  traffic: MetricProjection;
  ranking: MetricProjection;
  ctr: MetricProjection;
  conversions: MetricProjection;
}

interface MetricProjection {
  current: number;
  projected: number;
  increase: number;
  timeframe: string;
  confidence: number;
}

interface ReportResources {
  tools: ToolResource[];
  guides: GuideResource[];
  references: ReferenceResource[];
}

interface ToolResource {
  name: string;
  type: string;
  url: string;
  description: string;
  free: boolean;
}

interface GuideResource {
  title: string;
  type: string;
  url: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: string;
}

interface ReferenceResource {
  title: string;
  source: string;
  url: string;
  type: string;
  authority: number;
}

class ReportGenerator {
  private impactWeights: ImpactWeights;
  private effortWeights: EffortWeights;
  private seoImpactFactors: SeoImpactFactors;

  constructor() {
    this.impactWeights = {
      high: 3,
      medium: 2,
      low: 1,
    };

    this.effortWeights = {
      low: 3,
      medium: 2,
      high: 1,
    };

    // SEO影响因子
    this.seoImpactFactors = {
      title: { traffic: 0.25, ranking: 0.3, ctr: 0.35 },
      meta_description: { traffic: 0.15, ranking: 0.1, ctr: 0.4 },
      headings: { traffic: 0.2, ranking: 0.25, ctr: 0.15 },
      content_quality: { traffic: 0.3, ranking: 0.35, ctr: 0.2 },
      internal_links: { traffic: 0.15, ranking: 0.2, ctr: 0.1 },
      page_speed: { traffic: 0.25, ranking: 0.3, ctr: 0.25 },
      mobile_friendly: { traffic: 0.2, ranking: 0.25, ctr: 0.2 },
      structured_data: { traffic: 0.1, ranking: 0.15, ctr: 0.25 },
    };
  }

  /**
   * 生成完整的SEO报告
   */
  generateReport(analysisData: AnalysisData, recommendations: Recommendation[]): SeoReport {
    const timestamp = new Date();

    // 生成报告摘要
    const summary = this.generateSummary(analysisData, recommendations);

    // 生成分数分析
    const scores = this.generateScoreAnalysis(analysisData);

    // 生成问题分析
    const issues = this.generateIssueAnalysis(analysisData, recommendations);

    // 生成建议分析
    const recommendationAnalysis = this.generateRecommendationAnalysis(recommendations);

    // 生成优化路线图
    const roadmap = this.generateRoadmap(recommendations);

    // 生成预期指标
    const metrics = this.generateExpectedMetrics(analysisData, recommendations);

    // 生成资源推荐
    const resources = this.generateResources(recommendations);

    return {
      url: analysisData.url,
      timestamp,
      summary,
      scores,
      issues,
      recommendations: recommendationAnalysis,
      roadmap,
      metrics,
      resources,
    };
  }

  /**
   * 生成报告摘要
   */
  private generateSummary(
    analysisData: AnalysisData,
    recommendations: Recommendation[]
  ): ReportSummary {
    const totalIssues = recommendations.length;
    const criticalIssues = recommendations.filter(r => r.priority === 'critical').length;
    const highIssues = recommendations.filter(r => r.priority === 'high').length;
    const mediumIssues = recommendations.filter(r => r.priority === 'medium').length;
    const lowIssues = recommendations.filter(r => r.priority === 'low').length;

    const estimatedImpact = this.calculateEstimatedImpact(recommendations);
    const estimatedEffort = this.calculateEstimatedEffort(recommendations);

    return {
      overallScore: analysisData.overall.score,
      grade: analysisData.overall.grade,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      estimatedImpact,
      estimatedEffort,
    };
  }

  /**
   * 生成分数分析
   */
  private generateScoreAnalysis(analysisData: AnalysisData): ScoreAnalysis {
    const categories: CategoryScore[] = [];

    // 分析各个类别的分数
    if (analysisData.meta) {
      categories.push({
        category: 'meta',
        score: analysisData.meta.overall?.score || 0,
        weight: 0.25,
        impact:
          this.seoImpactFactors.title.ranking + this.seoImpactFactors.meta_description.ranking,
        issues:
          (analysisData.meta.title?.issues?.length || 0) +
          (analysisData.meta.description?.issues?.length || 0),
      });
    }

    if (analysisData.content) {
      categories.push({
        category: 'content',
        score: analysisData.content.overall?.score || 0,
        weight: 0.2,
        impact: this.seoImpactFactors.content_quality.ranking,
        issues: analysisData.content.issues?.length || 0,
      });
    }

    if (analysisData.links) {
      categories.push({
        category: 'links',
        score: analysisData.links.overall?.score || 0,
        weight: 0.15,
        impact: this.seoImpactFactors.internal_links.ranking,
        issues: analysisData.links.issues?.length || 0,
      });
    }

    if (analysisData.mobile) {
      categories.push({
        category: 'mobile',
        score: analysisData.mobile.overall?.score || 0,
        weight: 0.2,
        impact: this.seoImpactFactors.mobile_friendly.ranking,
        issues: analysisData.mobile.issues?.length || 0,
      });
    }

    if (analysisData.structuredData) {
      categories.push({
        category: 'structured-data',
        score: analysisData.structuredData.overall?.score || 0,
        weight: 0.1,
        impact: this.seoImpactFactors.structured_data.ranking,
        issues: analysisData.structuredData.issues?.length || 0,
      });
    }

    if (analysisData.performance) {
      categories.push({
        category: 'performance',
        score: analysisData.performance.overall?.score || 0,
        weight: 0.1,
        impact: this.seoImpactFactors.page_speed.ranking,
        issues: analysisData.performance.issues?.length || 0,
      });
    }

    const trend: ScoreTrend = {
      direction: 'stable',
      change: 0,
      period: '30天',
    };

    const comparison: ScoreComparison = {
      industry: 75,
      competitors: 80,
      benchmark: 85,
    };

    return {
      overall: analysisData.overall.score,
      categories,
      trend,
      comparison,
    };
  }

  /**
   * 生成问题分析
   */
  private generateIssueAnalysis(
    analysisData: AnalysisData,
    recommendations: Recommendation[]
  ): IssueAnalysis {
    const total = recommendations.length;
    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byCategory: Record<string, number> = {};
    const byImpact: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    recommendations.forEach(rec => {
      byPriority[rec.priority]++;

      if (!byCategory[rec.category]) {
        byCategory[rec.category] = 0;
      }
      byCategory[rec.category]++;

      // 根据影响程度分类
      const impactLevel = this.getImpactLevel(rec.impact);
      byImpact[impactLevel]++;
    });

    const critical: CriticalIssue[] = recommendations
      .filter(rec => rec.priority === 'critical')
      .map(rec => ({
        id: rec.id,
        category: rec.category,
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        urgency: this.getUrgency(rec.priority),
        fixTime: this.getFixTime(rec.effort),
      }));

    return {
      total,
      byPriority,
      byCategory,
      byImpact,
      critical,
    };
  }

  /**
   * 生成建议分析
   */
  private generateRecommendationAnalysis(
    recommendations: Recommendation[]
  ): RecommendationAnalysis {
    const total = recommendations.length;
    const byPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const byCategory: Record<string, number> = {};
    const byEffort: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    recommendations.forEach(rec => {
      byPriority[rec.priority]++;

      if (!byCategory[rec.category]) {
        byCategory[rec.category] = 0;
      }
      byCategory[rec.category]++;

      byEffort[rec.effort]++;
    });

    // 获取顶级建议
    const topRecommendations = recommendations
      .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
      .slice(0, 5);

    // 获取快速见效的建议
    const quickWins = recommendations
      .filter(rec => rec.effort === 'low' && (rec.priority === 'high' || rec.priority === 'medium'))
      .slice(0, 3);

    // 获取长期项目
    const longTerm = recommendations.filter(rec => rec.effort === 'high').slice(0, 3);

    return {
      total,
      byPriority,
      byCategory,
      byEffort,
      topRecommendations,
      quickWins,
      longTerm,
    };
  }

  /**
   * 生成优化路线图
   */
  private generateRoadmap(recommendations: Recommendation[]): OptimizationRoadmap {
    const phases: RoadmapPhase[] = [];

    // 第一阶段：紧急修复
    const criticalRecs = recommendations.filter(rec => rec.priority === 'critical');
    if (criticalRecs.length > 0) {
      phases.push({
        phase: 1,
        title: '紧急修复',
        duration: '1-2周',
        effort: '高',
        recommendations: criticalRecs.map(rec => rec.id),
        expectedImpact: '解决关键SEO问题，提升基础排名',
      });
    }

    // 第二阶段：快速优化
    const quickRecs = recommendations.filter(
      rec => rec.effort === 'low' && (rec.priority === 'high' || rec.priority === 'medium')
    );
    if (quickRecs.length > 0) {
      phases.push({
        phase: 2,
        title: '快速优化',
        duration: '2-3周',
        effort: '中等',
        recommendations: quickRecs.map(rec => rec.id),
        expectedImpact: '快速提升SEO表现，获得早期收益',
      });
    }

    // 第三阶段：深度优化
    const mediumRecs = recommendations.filter(
      rec => rec.effort === 'medium' && rec.priority !== 'critical'
    );
    if (mediumRecs.length > 0) {
      phases.push({
        phase: 3,
        title: '深度优化',
        duration: '4-6周',
        effort: '中等',
        recommendations: mediumRecs.map(rec => rec.id),
        expectedImpact: '全面提升SEO表现，建立竞争优势',
      });
    }

    // 第四阶段：长期建设
    const longRecs = recommendations.filter(rec => rec.effort === 'high');
    if (longRecs.length > 0) {
      phases.push({
        phase: 4,
        title: '长期建设',
        duration: '8-12周',
        effort: '高',
        recommendations: longRecs.map(rec => rec.id),
        expectedImpact: '建立长期SEO优势，持续提升排名',
      });
    }

    const totalEffort = this.calculateTotalEffort(recommendations);
    const expectedResults = this.calculateExpectedResults(recommendations);

    return {
      phases,
      timeline: '3-4个月',
      totalEffort,
      expectedResults,
    };
  }

  /**
   * 生成预期指标
   */
  private generateExpectedMetrics(
    analysisData: AnalysisData,
    recommendations: Recommendation[]
  ): ExpectedMetrics {
    const currentMetrics = this.getCurrentMetrics(analysisData);
    const projectedMetrics = this.calculateProjectedMetrics(currentMetrics, recommendations);

    return {
      traffic: {
        current: currentMetrics.traffic,
        projected: projectedMetrics.traffic,
        increase:
          ((projectedMetrics.traffic - currentMetrics.traffic) / currentMetrics.traffic) * 100,
        timeframe: '3个月',
        confidence: 0.75,
      },
      ranking: {
        current: currentMetrics.ranking,
        projected: projectedMetrics.ranking,
        increase: currentMetrics.ranking - projectedMetrics.ranking,
        timeframe: '3个月',
        confidence: 0.7,
      },
      ctr: {
        current: currentMetrics.ctr,
        projected: projectedMetrics.ctr,
        increase: ((projectedMetrics.ctr - currentMetrics.ctr) / currentMetrics.ctr) * 100,
        timeframe: '1个月',
        confidence: 0.8,
      },
      conversions: {
        current: currentMetrics.conversions,
        projected: projectedMetrics.conversions,
        increase:
          ((projectedMetrics.conversions - currentMetrics.conversions) /
            currentMetrics.conversions) *
          100,
        timeframe: '3个月',
        confidence: 0.65,
      },
    };
  }

  /**
   * 生成资源推荐
   */
  private generateResources(recommendations: Recommendation[]): ReportResources {
    const tools: ToolResource[] = [
      {
        name: 'Google Search Console',
        type: 'analytics',
        url: 'https://search.google.com/search-console/',
        description: 'Google官方搜索分析工具',
        free: true,
      },
      {
        name: 'Google PageSpeed Insights',
        type: 'performance',
        url: 'https://pagespeed.web.dev/',
        description: '页面性能分析工具',
        free: true,
      },
      {
        name: 'Schema.org Validator',
        type: 'structured-data',
        url: 'https://validator.schema.org/',
        description: '结构化数据验证工具',
        free: true,
      },
    ];

    const guides: GuideResource[] = [
      {
        title: 'SEO优化完整指南',
        type: 'guide',
        url: 'https://moz.com/beginners-guide-to-seo',
        difficulty: 'beginner',
        readTime: '2小时',
      },
      {
        title: '技术SEO最佳实践',
        type: 'tutorial',
        url: 'https://developers.google.com/search/docs/fundamentals/seo/',
        difficulty: 'intermediate',
        readTime: '3小时',
      },
    ];

    const references: ReferenceResource[] = [
      {
        title: 'Google搜索质量指南',
        source: 'Google',
        url: 'https://developers.google.com/search/docs/essentials/quality-guidelines',
        type: 'documentation',
        authority: 10,
      },
      {
        title: 'Schema.org规范',
        source: 'Schema.org',
        url: 'https://schema.org/',
        type: 'documentation',
        authority: 9,
      },
    ];

    return {
      tools,
      guides,
      references,
    };
  }

  /**
   * 计算预估影响
   */
  private calculateEstimatedImpact(recommendations: Recommendation[]): string {
    const totalImpact = recommendations.reduce((sum, rec) => {
      const impactValue = this.getImpactValue(rec.impact);
      return sum + impactValue;
    }, 0);

    if (totalImpact > 80) return '极高';
    if (totalImpact > 60) return '高';
    if (totalImpact > 40) return '中等';
    if (totalImpact > 20) return '低';
    return '极低';
  }

  /**
   * 计算预估工作量
   */
  private calculateEstimatedEffort(recommendations: Recommendation[]): string {
    const totalEffort = recommendations.reduce((sum, rec) => {
      const effortValue = this.getEffortValue(rec.effort);
      return sum + effortValue;
    }, 0);

    if (totalEffort > 100) return '极高 (3个月以上)';
    if (totalEffort > 60) return '高 (2-3个月)';
    if (totalEffort > 30) return '中等 (1-2个月)';
    if (totalEffort > 10) return '低 (2-4周)';
    return '极低 (1-2周)';
  }

  /**
   * 获取影响程度
   */
  private getImpactLevel(impact: string): 'high' | 'medium' | 'low' {
    if (impact.includes('高') || impact.includes('30%')) return 'high';
    if (impact.includes('中') || impact.includes('15%')) return 'medium';
    return 'low';
  }

  /**
   * 获取紧急程度
   */
  private getUrgency(priority: string): 'immediate' | 'urgent' | 'important' {
    switch (priority) {
      case 'critical':
        return 'immediate';
      case 'high':
        return 'urgent';
      case 'medium':
        return 'important';
      default:
        return 'important';
    }
  }

  /**
   * 获取修复时间
   */
  private getFixTime(effort: string): string {
    switch (effort) {
      case 'low':
        return '1-3天';
      case 'medium':
        return '1-2周';
      case 'high':
        return '2-4周';
      default:
        return '1-2周';
    }
  }

  /**
   * 获取影响值
   */
  private getImpactValue(impact: string): number {
    if (impact.includes('30%')) return 30;
    if (impact.includes('25%')) return 25;
    if (impact.includes('20%')) return 20;
    if (impact.includes('15%')) return 15;
    if (impact.includes('10%')) return 10;
    return 5;
  }

  /**
   * 获取工作量值
   */
  private getEffortValue(effort: string): number {
    switch (effort) {
      case 'low':
        return 5;
      case 'medium':
        return 15;
      case 'high':
        return 30;
      default:
        return 10;
    }
  }

  /**
   * 计算总工作量
   */
  private calculateTotalEffort(recommendations: Recommendation[]): string {
    const totalHours = recommendations.reduce(
      (sum, rec) => sum + this.getEffortValue(rec.effort),
      0
    );

    if (totalHours > 200) return '极高 (200+小时)';
    if (totalHours > 100) return '高 (100-200小时)';
    if (totalHours > 50) return '中等 (50-100小时)';
    return '低 (50小时以下)';
  }

  /**
   * 计算预期结果
   */
  private calculateExpectedResults(recommendations: Recommendation[]): string {
    const totalImpact = recommendations.reduce(
      (sum, rec) => sum + this.getImpactValue(rec.impact),
      0
    );

    if (totalImpact > 200) return 'SEO排名显著提升，流量增长50%以上';
    if (totalImpact > 150) return 'SEO排名大幅提升，流量增长30-50%';
    if (totalImpact > 100) return 'SEO排名明显提升，流量增长20-30%';
    if (totalImpact > 50) return 'SEO排名有所提升，流量增长10-20%';
    return 'SEO排名小幅提升，流量增长5-10%';
  }

  /**
   * 获取当前指标
   */
  private getCurrentMetrics(analysisData: AnalysisData): {
    traffic: number;
    ranking: number;
    ctr: number;
    conversions: number;
  } {
    // 简化的当前指标计算
    return {
      traffic: 1000,
      ranking: 50,
      ctr: 2.5,
      conversions: 25,
    };
  }

  /**
   * 计算预期指标
   */
  private calculateProjectedMetrics(current: any, recommendations: Recommendation[]): any {
    const totalImpact = recommendations.reduce(
      (sum, rec) => sum + this.getImpactValue(rec.impact),
      0
    );
    const impactMultiplier = 1 + totalImpact / 100;

    return {
      traffic: Math.round(current.traffic * impactMultiplier),
      ranking: Math.max(1, current.ranking - Math.round(totalImpact / 10)),
      ctr: Math.round(current.ctr * (1 + totalImpact / 200) * 100) / 100,
      conversions: Math.round(current.conversions * impactMultiplier),
    };
  }

  /**
   * 导出报告
   */
  exportReport(report: SeoReport): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        report,
      },
      null,
      2
    );
  }

  /**
   * 生成HTML报告
   */
  generateHtmlReport(report: SeoReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO分析报告 - ${report.url}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
        .score { font-size: 2em; font-weight: bold; color: #4CAF50; }
        .grade { font-size: 1.5em; font-weight: bold; margin: 10px 0; }
        .recommendations { margin: 20px 0; }
        .recommendation { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
        .priority-critical { border-left-color: #f44336; }
        .priority-high { border-left-color: #ff9800; }
        .priority-medium { border-left-color: #2196F3; }
        .priority-low { border-left-color: #4CAF50; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SEO分析报告</h1>
        <p><strong>URL:</strong> ${report.url}</p>
        <p><strong>生成时间:</strong> ${report.timestamp.toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="score">${report.summary.overallScore}</div>
            <div>总体分数</div>
        </div>
        <div class="metric">
            <div class="grade">${report.summary.grade}</div>
            <div>评级</div>
        </div>
        <div class="metric">
            <div>${report.summary.totalIssues}</div>
            <div>问题总数</div>
        </div>
        <div class="metric">
            <div>${report.summary.criticalIssues}</div>
            <div>紧急问题</div>
        </div>
    </div>

    <div class="recommendations">
        <h2>优化建议</h2>
        ${report.recommendations.topRecommendations
          .map(
            rec => `
            <div class="recommendation priority-${rec.priority}">
                <h3>${rec.title}</h3>
                <p><strong>优先级:</strong> ${rec.priority}</p>
                <p><strong>类别:</strong> ${rec.category}</p>
                <p><strong>描述:</strong> ${rec.description}</p>
                <p><strong>预期影响:</strong> ${rec.impact}</p>
                <p><strong>工作量:</strong> ${rec.effort}</p>
            </div>
        `
          )
          .join('')}
    </div>
</body>
</html>`;
  }
}

export default ReportGenerator;
