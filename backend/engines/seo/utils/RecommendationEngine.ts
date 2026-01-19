/**
 * SEO建议生成器
 * 基于分析结果生成具体的优化建议
 */

interface PriorityLevels {
  CRITICAL: 'critical';
  HIGH: 'high';
  MEDIUM: 'medium';
  LOW: 'low';
}

interface AnalysisResults {
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

  constructor() {
    this.priorityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };
  }

  /**
   * 生成所有优化建议
   */
  generateRecommendations(analysisResults: AnalysisResults): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Meta标签建议
    if (analysisResults.meta) {
      recommendations.push(...this.generateMetaRecommendations(analysisResults.meta));
    }

    // 内容建议
    if (analysisResults.content) {
      recommendations.push(...this.generateContentRecommendations(analysisResults.content));
    }

    // 内容质量建议
    if (analysisResults.contentQuality) {
      recommendations.push(
        ...this.generateContentQualityRecommendations(analysisResults.contentQuality)
      );
    }

    // 链接建议
    if (analysisResults.links) {
      recommendations.push(...this.generateLinkRecommendations(analysisResults.links));
    }

    // 移动端建议
    if (analysisResults.mobile) {
      recommendations.push(...this.generateMobileRecommendations(analysisResults.mobile));
    }

    // 结构化数据建议
    if (analysisResults.structuredData) {
      recommendations.push(
        ...this.generateStructuredDataRecommendations(analysisResults.structuredData)
      );
    }

    // 性能建议
    if (analysisResults.performance) {
      recommendations.push(...this.generatePerformanceRecommendations(analysisResults.performance));
    }

    // 按优先级排序
    return this.sortRecommendationsByPriority(recommendations);
  }

  /**
   * 生成Meta标签建议
   */
  private generateMetaRecommendations(metaAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 标题建议
    if (!metaAnalysis.title?.optimized) {
      recommendations.push({
        id: 'meta-title-optimization',
        priority: 'high',
        category: 'meta',
        title: '优化页面标题',
        description: '改进标题长度和内容质量以提高搜索排名和点击率',
        impact: '提升搜索排名15-30%，提高点击率20-40%',
        effort: 'low',
        examples: [
          {
            title: '标题优化示例',
            language: 'html',
            code: `<title>优化后的页面标题 - 品牌名称</title>`,
            explanation: '标题长度30-60字符，包含主要关键词，具有吸引力',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '分析当前标题',
            details: '检查标题长度、关键词使用和吸引力',
            estimatedTime: '5分钟',
          },
          {
            step: 2,
            action: '重写标题',
            details: '创建符合SEO最佳实践的新标题',
            estimatedTime: '10分钟',
          },
          {
            step: 3,
            action: '测试效果',
            details: '监控搜索排名和点击率变化',
            estimatedTime: '持续监控',
          },
        ],
        resources: [
          {
            title: 'Google标题优化指南',
            type: 'documentation',
            url: 'https://developers.google.com/search/docs/advanced/appearance/title-link',
            description: 'Google官方标题优化最佳实践',
          },
        ],
      });
    }

    // 描述建议
    if (!metaAnalysis.description?.optimized) {
      recommendations.push({
        id: 'meta-description-optimization',
        priority: 'high',
        category: 'meta',
        title: '优化Meta描述',
        description: '改进描述内容以提高搜索结果展示效果和点击率',
        impact: '提高点击率10-25%，改善搜索结果展示',
        effort: 'low',
        examples: [
          {
            title: '描述优化示例',
            language: 'html',
            code: `<meta name="description" content="这是一个优化的页面描述，长度在120-160字符之间，包含关键词和吸引人的内容。">`,
            explanation: '描述长度120-160字符，包含关键词，具有吸引力',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '分析当前描述',
            details: '检查描述长度、关键词和吸引力',
            estimatedTime: '5分钟',
          },
          {
            step: 2,
            action: '重写描述',
            details: '创建符合SEO最佳实践的新描述',
            estimatedTime: '10分钟',
          },
        ],
        resources: [
          {
            title: 'Meta描述优化指南',
            type: 'documentation',
            url: 'https://moz.com/learn/seo/meta-description',
            description: 'Meta描述优化最佳实践',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成内容建议
   */
  private generateContentRecommendations(contentAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 内容长度建议
    if (contentAnalysis.wordCount < 300) {
      recommendations.push({
        id: 'content-length-optimization',
        priority: 'medium',
        category: 'content',
        title: '增加内容长度',
        description: '扩展内容长度以提供更全面的信息和更好的SEO效果',
        impact: '提升搜索排名10-20%，提高用户停留时间',
        effort: 'medium',
        examples: [
          {
            title: '内容扩展示例',
            language: 'markdown',
            code: `# 原始内容
简短介绍...

# 扩展内容
## 详细说明
更详细的解释和背景信息...

## 实例分析
具体案例和数据支持...

## 常见问题
用户可能关心的问题解答...

## 总结
内容总结和行动建议...`,
            explanation: '通过添加详细说明、实例分析和常见问题来扩展内容',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '内容规划',
            details: '确定需要扩展的内容部分',
            estimatedTime: '15分钟',
          },
          {
            step: 2,
            action: '内容扩展',
            details: '添加详细说明、实例和案例分析',
            estimatedTime: '1-2小时',
          },
          {
            step: 3,
            action: '内容优化',
            details: '确保内容质量和可读性',
            estimatedTime: '30分钟',
          },
        ],
        resources: [
          {
            title: '内容长度最佳实践',
            type: 'documentation',
            url: 'https://backlinko.com/hub/content/seo-content-length',
            description: 'SEO内容长度研究和建议',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成内容质量建议
   */
  private generateContentQualityRecommendations(qualityAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 可读性建议
    if (qualityAnalysis.readability?.score < 70) {
      recommendations.push({
        id: 'content-readability-optimization',
        priority: 'medium',
        category: 'content-quality',
        title: '改善内容可读性',
        description: '优化句子结构、段落长度和语言表达以提高可读性',
        impact: '提高用户体验30-50%，降低跳出率',
        effort: 'medium',
        examples: [
          {
            title: '可读性优化示例',
            language: 'markdown',
            code: `# 改善前
这是一个非常长的句子，包含了太多的技术术语和复杂的概念，让读者难以理解和消化。

# 改善后
这是第一个句子。它使用简单的语言表达概念。

这是第二个句子。它分解了复杂的思想。

使用短句提高可读性。`,
            explanation: '使用短句、简单词汇和清晰的段落结构',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '可读性分析',
            details: '使用工具分析当前内容的可读性指标',
            estimatedTime: '10分钟',
          },
          {
            step: 2,
            action: '句子优化',
            details: '拆分长句，简化复杂表达',
            estimatedTime: '30分钟',
          },
          {
            step: 3,
            action: '段落优化',
            details: '调整段落长度和结构',
            estimatedTime: '20分钟',
          },
        ],
        resources: [
          {
            title: '可读性测试工具',
            type: 'tool',
            url: 'https://hemingwayapp.com/',
            description: '免费的可读性分析和优化工具',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成链接建议
   */
  private generateLinkRecommendations(linkAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 内部链接建议
    if (linkAnalysis.internal?.issues?.length > 0) {
      recommendations.push({
        id: 'internal-link-optimization',
        priority: 'medium',
        category: 'links',
        title: '优化内部链接结构',
        description: '改善内部链接以提高网站结构和用户体验',
        impact: '改善网站结构，提高页面权重分配',
        effort: 'medium',
        examples: [
          {
            title: '内部链接优化示例',
            language: 'html',
            code: `<nav>
  <ul>
    <li><a href="/" title="首页">首页</a></li>
    <li><a href="/services" title="服务">服务</a></li>
    <li><a href="/about" title="关于我们">关于我们</a></li>
  </ul>
</nav>

<!-- 内容中的相关链接 -->
<p>了解更多关于<a href="/services/seo" title="SEO优化服务">SEO优化</a>的信息。</p>`,
            explanation: '使用描述性锚文本，确保链接有效性',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '链接审计',
            details: '检查所有内部链接的有效性和锚文本',
            estimatedTime: '30分钟',
          },
          {
            step: 2,
            action: '链接优化',
            details: '修复无效链接，改善锚文本',
            estimatedTime: '1小时',
          },
          {
            step: 3,
            action: '结构优化',
            details: '优化链接结构和层次',
            estimatedTime: '45分钟',
          },
        ],
        resources: [
          {
            title: '内部链接优化指南',
            type: 'documentation',
            url: 'https://moz.com/learn/seo/internal-links',
            description: '内部链接最佳实践和策略',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成移动端建议
   */
  private generateMobileRecommendations(mobileAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 视口配置建议
    if (!mobileAnalysis.viewport?.configured) {
      recommendations.push({
        id: 'mobile-viewport-optimization',
        priority: 'critical',
        category: 'mobile',
        title: '添加移动端视口配置',
        description: '添加viewport meta标签确保移动端正确显示',
        impact: '修复移动端显示问题，提高移动端用户体验',
        effort: 'low',
        examples: [
          {
            title: '视口配置示例',
            language: 'html',
            code: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`,
            explanation: '设置viewport为设备宽度，禁用缩放',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '添加meta标签',
            details: '在HTML head中添加viewport meta标签',
            estimatedTime: '5分钟',
          },
          {
            step: 2,
            action: '测试显示效果',
            details: '在不同移动设备上测试显示效果',
            estimatedTime: '15分钟',
          },
        ],
        resources: [
          {
            title: '移动端视口配置指南',
            type: 'documentation',
            url: 'https://developers.google.com/web/fundamentals/design-and-ux/responsive/',
            description: 'Google移动端最佳实践',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成结构化数据建议
   */
  private generateStructuredDataRecommendations(structuredDataAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // JSON-LD建议
    if (!structuredDataAnalysis.jsonLd?.present) {
      recommendations.push({
        id: 'structured-data-jsonld',
        priority: 'medium',
        category: 'structured-data',
        title: '添加JSON-LD结构化数据',
        description: '使用JSON-LD格式添加结构化数据以提高搜索结果显示',
        impact: '改善搜索结果显示，提高点击率15-30%',
        effort: 'medium',
        examples: [
          {
            title: 'JSON-LD示例',
            language: 'json',
            code: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "author": {
    "@type": "Person",
    "name": "作者姓名"
  },
  "datePublished": "2024-01-01",
  "image": "https://example.com/image.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "发布者名称"
  }
}`,
            explanation: '使用JSON-LD格式定义文章结构化数据',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '选择Schema类型',
            details: '根据内容类型选择合适的Schema.org类型',
            estimatedTime: '10分钟',
          },
          {
            step: 2,
            action: '创建JSON-LD',
            details: '编写符合Schema.org规范的结构化数据',
            estimatedTime: '30分钟',
          },
          {
            step: 3,
            action: '添加到页面',
            details: '将JSON-LD添加到HTML head中',
            estimatedTime: '5分钟',
          },
        ],
        resources: [
          {
            title: 'Schema.org文档',
            type: 'documentation',
            url: 'https://schema.org/',
            description: 'Schema.org完整类型文档',
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * 生成性能建议
   */
  private generatePerformanceRecommendations(performanceAnalysis: any): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 页面加载速度建议
    if (performanceAnalysis.loadTime > 3000) {
      recommendations.push({
        id: 'performance-load-time',
        priority: 'high',
        category: 'performance',
        title: '优化页面加载速度',
        description: '减少页面加载时间以提高用户体验和搜索排名',
        impact: '提高用户体验，提升搜索排名5-15%',
        effort: 'high',
        examples: [
          {
            title: '图片优化示例',
            language: 'html',
            code: `<img src="image.webp" alt="描述" loading="lazy" width="800" height="600">

<!-- 响应式图片 -->
<picture>
  <source srcset="image-large.webp" media="(min-width: 768px)">
  <source srcset="image-small.webp" media="(max-width: 767px)">
  <img src="image-fallback.jpg" alt="描述">
</picture>`,
            explanation: '使用现代图片格式和懒加载技术',
          },
        ],
        implementation: [
          {
            step: 1,
            action: '性能分析',
            details: '使用PageSpeed Insights分析性能瓶颈',
            estimatedTime: '15分钟',
          },
          {
            step: 2,
            action: '图片优化',
            details: '压缩图片，使用现代格式',
            estimatedTime: '1-2小时',
          },
          {
            step: 3,
            action: '代码优化',
            details: '压缩CSS/JS，启用缓存',
            estimatedTime: '2-3小时',
          },
        ],
        resources: [
          {
            title: 'PageSpeed Insights',
            type: 'tool',
            url: 'https://pagespeed.web.dev/',
            description: 'Google免费性能分析工具',
          },
        ],
      });
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
}

export default RecommendationEngine;
