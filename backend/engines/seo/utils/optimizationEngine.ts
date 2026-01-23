/**
 * 智能优化建议引擎
 * 本地化程度：100%
 * 提供具体的代码示例、实施步骤和效果预估
 */

import {
  CodeExample,
  ImpactEstimate,
  ImplementationStep,
  OptimizationSuggestionTemplateMap,
  OptimizationTemplates,
  defaultOptimizationSuggestionTemplates,
  defaultOptimizationTemplates,
  validateOptimizationSuggestionTemplates,
  validateOptimizationTemplates,
} from './optimizationTemplates';

interface OptimizationContext {
  url: string;
  keywords: string[];
  brand: string;
  industry: string;
  targetAudience: string;
  contentType: string;
}

interface AnalysisHeading {
  level?: number;
  text?: string;
}

interface AnalysisImage {
  alt?: string;
  src?: string;
}

interface AnalysisLinks {
  internal?: { issues?: string[] };
  external?: { issues?: string[] };
  broken?: { count?: number };
}

interface OptimizationAnalysisData {
  meta?: {
    title?: string;
    description?: string;
  };
  content?: {
    headings?: AnalysisHeading[];
    content?: string;
    images?: AnalysisImage[];
  };
  links?: AnalysisLinks;
}

interface OptimizationSuggestion {
  type: string;
  category: string;
  title: string;
  description: string;
  current: string;
  suggested: string;
  improvement: string;
  implementation: ImplementationStep[];
  examples: CodeExample[];
  expectedImpact: ImpactEstimate;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

interface OptimizationEngineConfig {
  templates?: OptimizationTemplates;
  suggestionTemplates?: OptimizationSuggestionTemplateMap;
}

class OptimizationEngine {
  private optimizationTemplates: OptimizationTemplates;
  private suggestionTemplates: OptimizationSuggestionTemplateMap;

  constructor(config: OptimizationEngineConfig = {}) {
    this.optimizationTemplates = config.templates ?? defaultOptimizationTemplates;
    this.suggestionTemplates = config.suggestionTemplates ?? defaultOptimizationSuggestionTemplates;

    const templateValidation = validateOptimizationTemplates(this.optimizationTemplates);
    if (!templateValidation.isValid) {
      throw new Error(`SEO优化模板配置无效: ${templateValidation.errors.join('; ')}`);
    }

    const suggestionValidation = validateOptimizationSuggestionTemplates(this.suggestionTemplates);
    if (!suggestionValidation.isValid) {
      throw new Error(`SEO优化建议模板配置无效: ${suggestionValidation.errors.join('; ')}`);
    }
  }

  setTemplates(templates: OptimizationTemplates): void {
    const validation = validateOptimizationTemplates(templates);
    if (!validation.isValid) {
      throw new Error(`SEO优化模板配置无效: ${validation.errors.join('; ')}`);
    }
    this.optimizationTemplates = templates;
  }

  setSuggestionTemplates(templates: OptimizationSuggestionTemplateMap): void {
    const validation = validateOptimizationSuggestionTemplates(templates);
    if (!validation.isValid) {
      throw new Error(`SEO优化建议模板配置无效: ${validation.errors.join('; ')}`);
    }
    this.suggestionTemplates = templates;
  }

  /**
   * 生成优化建议
   */
  generateOptimizations(
    analysisData: OptimizationAnalysisData,
    context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 标题优化
    if (analysisData.meta?.title) {
      suggestions.push(...this.generateTitleOptimizations(analysisData.meta.title, context));
    }

    // Meta描述优化
    if (analysisData.meta?.description) {
      suggestions.push(
        ...this.generateMetaDescriptionOptimizations(analysisData.meta.description, context)
      );
    }

    // 标题结构优化
    if (analysisData.content?.headings) {
      suggestions.push(
        ...this.generateHeadingOptimizations(analysisData.content.headings, context)
      );
    }

    // 内容优化
    if (analysisData.content?.content) {
      suggestions.push(...this.generateContentOptimizations(analysisData.content.content, context));
    }

    // 图片优化
    if (analysisData.content?.images) {
      suggestions.push(...this.generateImageOptimizations(analysisData.content.images, context));
    }

    // 链接优化
    if (analysisData.links) {
      suggestions.push(...this.generateLinkOptimizations(analysisData.links, context));
    }

    return this.prioritizeSuggestions(suggestions);
  }

  /**
   * 生成标题优化建议
   */
  private generateTitleOptimizations(
    currentTitle: string,
    context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const template = this.optimizationTemplates.title;
    const minLength = template.rules.minLength ?? 30;
    const maxLength = template.rules.maxLength ?? 60;

    // 检查长度
    if (currentTitle.length < minLength || currentTitle.length > maxLength) {
      const suggestedTitle = this.generateOptimalTitle(currentTitle, context);
      suggestions.push(
        this.buildSuggestion('title-length', 'medium', {
          currentTitle,
          suggestedTitle,
          currentLength: currentTitle.length,
          minLength,
          maxLength,
        })
      );
    }

    // 检查关键词
    if (template.rules.includeKeyword && !this.containsKeyword(currentTitle, context.keywords)) {
      const primaryKeyword = context.keywords[0] || '';
      const suggestedTitle = this.addKeywordToTitle(currentTitle, context.keywords);
      suggestions.push(
        this.buildSuggestion('title-keyword', 'medium', {
          currentTitle,
          suggestedTitle,
          primaryKeyword,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成Meta描述优化建议
   */
  private generateMetaDescriptionOptimizations(
    currentDescription: string,
    context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const template = this.optimizationTemplates.metaDescription;
    const minLength = template.rules.minLength ?? 120;
    const maxLength = template.rules.maxLength ?? 160;

    // 检查长度
    if (currentDescription.length < minLength || currentDescription.length > maxLength) {
      const suggestedDescription = this.generateOptimalMetaDescription(currentDescription, context);
      suggestions.push(
        this.buildSuggestion('meta-description-length', 'medium', {
          currentDescription,
          suggestedDescription,
          currentLength: currentDescription.length,
          minLength,
          maxLength,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成标题结构优化建议
   */
  private generateHeadingOptimizations(
    headings: AnalysisHeading[],
    _context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查标题结构
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count !== 1) {
      suggestions.push(
        this.buildSuggestion('heading-structure', h1Count > 2 ? 'high' : 'medium', {
          h1Count,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成内容优化建议
   */
  private generateContentOptimizations(
    content: string,
    _context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const template = this.optimizationTemplates.content;

    // 检查内容长度
    const wordCount = this.countWords(content);
    const minLength = template.rules.minLength ?? 300;
    if (wordCount < minLength) {
      suggestions.push(
        this.buildSuggestion('content-length', wordCount < minLength * 0.5 ? 'high' : 'medium', {
          wordCount,
          minLength,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成图片优化建议
   */
  private generateImageOptimizations(
    images: AnalysisImage[],
    _context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查图片alt属性
    const imagesWithoutAlt = images.filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      suggestions.push(
        this.buildSuggestion('image-alt', imagesWithoutAlt.length > 5 ? 'high' : 'medium', {
          missingAltCount: imagesWithoutAlt.length,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成链接优化建议
   */
  private generateLinkOptimizations(
    links: AnalysisLinks,
    _context: OptimizationContext
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查内部链接
    const issueCount = links.internal?.issues?.length ?? 0;
    if (issueCount > 0) {
      suggestions.push(
        this.buildSuggestion('internal-links', issueCount > 10 ? 'high' : 'medium', {
          issueCount,
        })
      );
    }

    return suggestions;
  }

  /**
   * 生成最优标题
   */
  private generateOptimalTitle(currentTitle: string, context: OptimizationContext): string {
    const primaryKeyword = context.keywords[0] || '';
    const brand = context.brand || '';

    // 使用模板生成标题
    const pattern = this.optimizationTemplates.title.patterns[0];
    return pattern
      .replace('主要关键词', primaryKeyword)
      .replace('次要关键词', context.keywords[1] || '')
      .replace('品牌名', brand)
      .replace('[年份]', new Date().getFullYear().toString());
  }

  /**
   * 生成最优Meta描述
   */
  private generateOptimalMetaDescription(
    currentDescription: string,
    context: OptimizationContext
  ): string {
    const pattern = this.optimizationTemplates.metaDescription.patterns[0];
    const primaryKeyword = context.keywords[0] || context.industry || '主题';
    const tokens = this.buildMetaDescriptionTokens(primaryKeyword, currentDescription, context);
    return this.replaceBracketTokens(pattern, tokens);
  }

  /**
   * 检查是否包含关键词
   */
  private containsKeyword(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * 向标题添加关键词
   */
  private addKeywordToTitle(currentTitle: string, keywords: string[]): string {
    const primaryKeyword = keywords[0] || '';
    if (this.containsKeyword(currentTitle, keywords)) {
      return currentTitle;
    }

    return `${primaryKeyword} - ${currentTitle}`;
  }

  /**
   * 计算字数
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 优先级排序建议
   */
  private prioritizeSuggestions(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
    const priorityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return suggestions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 如果优先级相同，按影响程度排序
      return b.expectedImpact.traffic - a.expectedImpact.traffic;
    });
  }

  /**
   * 获取快速见效建议
   */
  getQuickWins(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
    return suggestions.filter(
      s => s.effort === 'low' && (s.priority === 'high' || s.priority === 'medium')
    );
  }

  /**
   * 获取高影响建议
   */
  getHighImpactSuggestions(suggestions: OptimizationSuggestion[]): OptimizationSuggestion[] {
    return suggestions.filter(
      s => s.expectedImpact.traffic >= 15 || s.expectedImpact.ranking >= 15
    );
  }

  /**
   * 生成实施计划
   */
  generateImplementationPlan(suggestions: OptimizationSuggestion[]): {
    phases: Array<{
      phase: number;
      title: string;
      duration: string;
      suggestions: OptimizationSuggestion[];
      expectedImpact: string;
    }>;
    totalDuration: string;
    totalImpact: string;
  } {
    const phases = [
      {
        phase: 1,
        title: '紧急修复',
        duration: '1周',
        suggestions: suggestions.filter(s => s.priority === 'critical'),
        expectedImpact: '解决关键SEO问题',
      },
      {
        phase: 2,
        title: '快速优化',
        duration: '2周',
        suggestions: this.getQuickWins(suggestions),
        expectedImpact: '快速提升SEO表现',
      },
      {
        phase: 3,
        title: '深度优化',
        duration: '4周',
        suggestions: suggestions.filter(s => s.effort === 'medium'),
        expectedImpact: '全面提升SEO表现',
      },
      {
        phase: 4,
        title: '长期建设',
        duration: '8周',
        suggestions: suggestions.filter(s => s.effort === 'high'),
        expectedImpact: '建立长期SEO优势',
      },
    ];

    const totalDuration = '15周';
    const totalImpact = 'SEO排名显著提升，流量增长30-50%';

    return {
      phases: phases.filter(p => p.suggestions.length > 0),
      totalDuration,
      totalImpact,
    };
  }

  /**
   * 导出优化建议
   */
  exportOptimizations(suggestions: OptimizationSuggestion[]): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        suggestions,
        quickWins: this.getQuickWins(suggestions),
        highImpact: this.getHighImpactSuggestions(suggestions),
        implementationPlan: this.generateImplementationPlan(suggestions),
      },
      null,
      2
    );
  }

  /**
   * 获取优化模板
   */
  getOptimizationTemplates(): OptimizationTemplates {
    return { ...this.optimizationTemplates };
  }

  /**
   * 设置优化模板
   */
  setOptimizationTemplates(templates: Partial<OptimizationTemplates>): void {
    const merged = { ...this.optimizationTemplates, ...templates } as OptimizationTemplates;
    const validation = validateOptimizationTemplates(merged);
    if (!validation.isValid) {
      throw new Error(`SEO优化模板配置无效: ${validation.errors.join('; ')}`);
    }
    this.optimizationTemplates = merged;
  }

  setOptimizationSuggestionTemplates(templates: OptimizationSuggestionTemplateMap): void {
    const validation = validateOptimizationSuggestionTemplates(templates);
    if (!validation.isValid) {
      throw new Error(`SEO优化建议模板配置无效: ${validation.errors.join('; ')}`);
    }
    this.suggestionTemplates = templates;
  }

  private buildSuggestion(
    templateId: string,
    impactLevel: 'low' | 'medium' | 'high',
    tokens: Record<string, string | number>
  ): OptimizationSuggestion {
    const template = this.suggestionTemplates[templateId];
    if (!template) {
      throw new Error(`缺少优化建议模板: ${templateId}`);
    }
    const impact = template.impactRanges[impactLevel];
    const description = this.interpolate(template.description, tokens);
    const current = this.interpolate(template.current, tokens);
    const suggested = this.interpolate(template.suggested, tokens);

    return {
      type: template.id,
      category: template.category,
      title: template.title,
      description,
      current,
      suggested,
      improvement: template.improvement,
      implementation: template.implementation,
      examples: template.examples,
      expectedImpact: {
        traffic: this.pickImpactValue(impact.traffic),
        ranking: this.pickImpactValue(impact.ranking),
        ctr: this.pickImpactValue(impact.ctr),
        conversions: this.pickImpactValue(impact.conversions),
        timeframe: impact.timeframe,
        confidence: impact.confidence,
      },
      priority: template.priority,
      effort: template.effort,
    };
  }

  private interpolate(template: string, tokens: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = tokens[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private pickImpactValue([min, max]: [number, number]): number {
    return Math.round((min + max) / 2);
  }

  private buildMetaDescriptionTokens(
    primaryKeyword: string,
    currentDescription: string,
    context: OptimizationContext
  ): Record<string, string | number> {
    const keywordCount = context.keywords.length;
    const derivedFromContent = Math.max(3, Math.round(this.countWords(currentDescription) / 60));
    const number = Math.min(12, keywordCount > 0 ? keywordCount + 4 : derivedFromContent);
    const value = context.industry ? `提升${context.industry}曝光与转化` : '提升搜索曝光与流量';
    const benefit = context.targetAudience
      ? `更贴合${context.targetAudience}需求`
      : '更高相关性与点击率';
    const action = this.getCallToAction(context.contentType);
    const issue = primaryKeyword ? `解决${primaryKeyword}相关痛点` : '解决关键问题';
    const solution = primaryKeyword ? `${primaryKeyword}优化方案` : '专业优化方案';
    const result = context.brand ? `强化${context.brand}认知` : '带来更多潜在客户';

    return {
      主题: primaryKeyword,
      数字: number,
      具体价值: value,
      行动号召: action,
      具体收益: benefit,
      问题: issue,
      解决方案: solution,
      具体结果: result,
    };
  }

  private getCallToAction(contentType: string): string {
    const callToActionMap: Record<string, string> = {
      ecommerce: '立即查看精选方案',
      landing: '立即咨询获取方案',
      blog: '阅读全文获取细节',
      service: '获取专业服务建议',
    };
    return callToActionMap[contentType] ?? '立即开始优化';
  }

  private replaceBracketTokens(template: string, tokens: Record<string, string | number>): string {
    return template.replace(/\[([^\]]+)\]/g, (_, key: string) => {
      const value = tokens[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }
}

export default OptimizationEngine;
