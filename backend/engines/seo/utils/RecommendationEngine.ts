/**
 * SEO建议生成器
 * 基于分析结果生成具体的优化建议
 */

import {
  defaultRecommendationTemplates,
  RecommendationTemplate,
  RecommendationTemplateMap,
  validateRecommendationTemplates,
} from './recommendationTemplates';

interface PriorityLevels {
  CRITICAL: 'critical';
  HIGH: 'high';
  MEDIUM: 'medium';
  LOW: 'low';
}

interface RecommendationEngineConfig {
  templates?: RecommendationTemplateMap;
}

interface AnalysisResults {
  meta?: {
    title?: { optimized?: boolean };
    description?: { optimized?: boolean };
    keywords?: { present?: boolean };
  };
  content?: {
    wordCount?: number;
    hasStructure?: boolean;
    hasMultimedia?: boolean;
  };
  contentQuality?: {
    readability?: { score?: number };
    uniqueness?: number;
  };
  links?: {
    internal?: { issues?: string[] };
    external?: { issues?: string[] };
    broken?: { count?: number };
  };
  mobile?: {
    viewport?: { configured?: boolean };
    responsive?: boolean;
    touchFriendly?: boolean;
  };
  structuredData?: {
    jsonLd?: { present?: boolean };
    microdata?: { present?: boolean };
  };
  performance?: {
    loadTime?: number;
    timeToInteractive?: number;
    resourceCount?: number;
  };
}

interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  impactScore?: number;
  impactLevel?: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  examples: CodeExample[];
  implementation: ImplementationStep[];
  resources: Resource[];
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

interface ImplementationStep {
  step: number;
  action: string;
  details: string;
  estimatedTime: string;
}

interface Resource {
  title: string;
  type: 'documentation' | 'tool' | 'example' | 'guide';
  url: string;
  description: string;
}

interface RecommendationSummary {
  total: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  estimatedEffort: {
    low: number;
    medium: number;
    high: number;
  };
}

class RecommendationEngine {
  private priorityLevels: PriorityLevels;
  private templates: RecommendationTemplateMap;

  constructor(config: RecommendationEngineConfig = {}) {
    this.priorityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    this.templates = config.templates ?? defaultRecommendationTemplates;
    const validation = validateRecommendationTemplates(this.templates);
    if (!validation.isValid) {
      throw new Error(`SEO建议模板配置无效: ${validation.errors.join('; ')}`);
    }
  }

  setTemplates(templates: RecommendationTemplateMap): void {
    const validation = validateRecommendationTemplates(templates);
    if (!validation.isValid) {
      throw new Error(`SEO建议模板配置无效: ${validation.errors.join('; ')}`);
    }
    this.templates = templates;
  }

  /**
   * 生成所有优化建议
   */
  generateRecommendations(analysisResults: AnalysisResults): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const missingTemplates: string[] = [];

    // Meta标签建议
    if (analysisResults.meta) {
      recommendations.push(
        ...this.generateMetaRecommendations(analysisResults.meta, missingTemplates)
      );
    }

    // 内容建议
    if (analysisResults.content) {
      recommendations.push(
        ...this.generateContentRecommendations(analysisResults.content, missingTemplates)
      );
    }

    // 内容质量建议
    if (analysisResults.contentQuality) {
      recommendations.push(
        ...this.generateContentQualityRecommendations(
          analysisResults.contentQuality,
          missingTemplates
        )
      );
    }

    // 链接建议
    if (analysisResults.links) {
      recommendations.push(
        ...this.generateLinkRecommendations(analysisResults.links, missingTemplates)
      );
    }

    // 移动端建议
    if (analysisResults.mobile) {
      recommendations.push(
        ...this.generateMobileRecommendations(analysisResults.mobile, missingTemplates)
      );
    }

    // 结构化数据建议
    if (analysisResults.structuredData) {
      recommendations.push(
        ...this.generateStructuredDataRecommendations(
          analysisResults.structuredData,
          missingTemplates
        )
      );
    }

    // 性能建议
    if (analysisResults.performance) {
      recommendations.push(
        ...this.generatePerformanceRecommendations(analysisResults.performance, missingTemplates)
      );
    }

    if (missingTemplates.length > 0) {
      throw new Error(`缺少SEO建议模板: ${missingTemplates.join(', ')}`);
    }

    // 按优先级排序
    return this.sortRecommendationsByPriority(recommendations);
  }

  /**
   * 生成Meta标签建议
   */
  private generateMetaRecommendations(
    metaAnalysis: AnalysisResults['meta'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 标题建议
    if (!metaAnalysis?.title?.optimized) {
      recommendations.push(
        this.buildRecommendation('meta-title-optimization', 'medium', missingTemplates)
      );
    }

    // 描述建议
    if (!metaAnalysis?.description?.optimized) {
      recommendations.push(
        this.buildRecommendation('meta-description-optimization', 'medium', missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成内容建议
   */
  private generateContentRecommendations(
    contentAnalysis: AnalysisResults['content'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 内容长度建议
    const wordCount = contentAnalysis?.wordCount ?? 0;
    if (wordCount < 300) {
      const impactLevel = wordCount < 150 ? 'high' : 'medium';
      recommendations.push(
        this.buildRecommendation('content-length-optimization', impactLevel, missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成内容质量建议
   */
  private generateContentQualityRecommendations(
    qualityAnalysis: AnalysisResults['contentQuality'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 可读性建议
    const readabilityScore = qualityAnalysis?.readability?.score ?? 100;
    if (readabilityScore < 70) {
      const impactLevel = readabilityScore < 40 ? 'high' : 'medium';
      recommendations.push(
        this.buildRecommendation('content-readability-optimization', impactLevel, missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成链接建议
   */
  private generateLinkRecommendations(
    linkAnalysis: AnalysisResults['links'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 内部链接建议
    if (linkAnalysis?.internal?.issues?.length) {
      const issueCount = linkAnalysis.internal.issues.length;
      const impactLevel = issueCount > 10 ? 'high' : 'medium';
      recommendations.push(
        this.buildRecommendation('internal-link-optimization', impactLevel, missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成移动端建议
   */
  private generateMobileRecommendations(
    mobileAnalysis: AnalysisResults['mobile'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 视口配置建议
    if (!mobileAnalysis?.viewport?.configured) {
      const impactLevel = mobileAnalysis?.responsive === false ? 'high' : 'medium';
      recommendations.push(
        this.buildRecommendation('mobile-viewport-optimization', impactLevel, missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成结构化数据建议
   */
  private generateStructuredDataRecommendations(
    structuredDataAnalysis: AnalysisResults['structuredData'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // JSON-LD建议
    if (!structuredDataAnalysis?.jsonLd?.present) {
      recommendations.push(
        this.buildRecommendation('structured-data-jsonld', 'medium', missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 生成性能建议
   */
  private generatePerformanceRecommendations(
    performanceAnalysis: AnalysisResults['performance'] = {},
    missingTemplates: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 页面加载速度建议
    if ((performanceAnalysis?.loadTime ?? 0) > 3000) {
      const loadTime = performanceAnalysis?.loadTime ?? 0;
      const impactLevel = loadTime > 6000 ? 'high' : 'medium';
      recommendations.push(
        this.buildRecommendation('performance-load-time', impactLevel, missingTemplates)
      );
    }

    return recommendations;
  }

  /**
   * 按优先级排序建议
   */
  private sortRecommendationsByPriority(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 如果优先级相同，按类别排序
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * 生成建议摘要
   */
  generateRecommendationSummary(recommendations: Recommendation[]): RecommendationSummary {
    const summary: RecommendationSummary = {
      total: recommendations.length,
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      byCategory: {},
      estimatedEffort: {
        low: 0,
        medium: 0,
        high: 0,
      },
    };

    recommendations.forEach(rec => {
      // 按优先级统计
      summary.byPriority[rec.priority]++;

      // 按类别统计
      if (!summary.byCategory[rec.category]) {
        summary.byCategory[rec.category] = 0;
      }
      summary.byCategory[rec.category]++;

      // 按工作量统计
      summary.estimatedEffort[rec.effort]++;
    });

    return summary;
  }

  /**
   * 获取高优先级建议
   */
  getHighPriorityRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.filter(rec => rec.priority === 'critical' || rec.priority === 'high');
  }

  /**
   * 获取特定类别建议
   */
  getRecommendationsByCategory(
    recommendations: Recommendation[],
    category: string
  ): Recommendation[] {
    return recommendations.filter(rec => rec.category === category);
  }

  /**
   * 导出建议报告
   */
  exportRecommendations(recommendations: Recommendation[]): string {
    const summary = this.generateRecommendationSummary(recommendations);

    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary,
        recommendations,
        highPriority: this.getHighPriorityRecommendations(recommendations),
      },
      null,
      2
    );
  }

  /**
   * 获取优先级级别
   */
  getPriorityLevels(): PriorityLevels {
    return { ...this.priorityLevels };
  }

  private buildRecommendation(
    templateId: string,
    impactLevel: 'low' | 'medium' | 'high',
    missingTemplates: string[]
  ): Recommendation {
    const template = this.templates[templateId];
    if (!template) {
      missingTemplates.push(templateId);
      return {
        id: templateId,
        priority: 'low',
        category: 'unknown',
        title: '缺少模板配置',
        description: '建议模板缺失，无法生成具体建议内容',
        impact: '影响未知',
        effort: 'low',
        examples: [],
        implementation: [],
        resources: [],
      };
    }

    const impact = this.formatImpact(template, impactLevel);

    return {
      id: template.id,
      priority: template.priority,
      category: template.category,
      title: template.title,
      description: template.description,
      impact: impact.text,
      impactScore: impact.score,
      impactLevel: impact.level,
      effort: template.effort,
      examples: template.examples,
      implementation: template.implementation,
      resources: template.resources,
    };
  }

  private formatImpact(
    template: RecommendationTemplate,
    impactLevel: 'low' | 'medium' | 'high'
  ): { text: string; score: number; level: 'low' | 'medium' | 'high' } {
    const range = template.impactRanges[impactLevel];
    const score = Math.round((range[0] + range[1]) / 2);
    return {
      text: `预计综合提升${range[0]}-${range[1]}%`,
      score,
      level: impactLevel,
    };
  }
}

export default RecommendationEngine;
