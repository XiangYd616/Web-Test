/**
 * SEO建议生成器
 * 基于分析结果生成具体的优化建议
 */

class RecommendationEngine {
  constructor() {
    this.priorityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
  }

  /**
   * 生成所有优化建议
   */
  generateRecommendations(analysisResults) {
    const recommendations = [];

    // Meta标签建议
    recommendations.push(...this.generateMetaRecommendations(analysisResults.meta));

    // 内容建议
    recommendations.push(...this.generateContentRecommendations(analysisResults.content));

    // 内容质量建议
    recommendations.push(...this.generateContentQualityRecommendations(analysisResults.contentQuality));

    // 性能建议
    recommendations.push(...this.generatePerformanceRecommendations(analysisResults.performance));

    // 结构化数据建议
    recommendations.push(...this.generateStructuredDataRecommendations(analysisResults.structuredData));

    // 链接建议
    recommendations.push(...this.generateLinkRecommendations(analysisResults.links));

    // 移动端建议
    recommendations.push(...this.generateMobileRecommendations(analysisResults.mobile));

    // 按优先级排序
    return this.sortRecommendationsByPriority(recommendations);
  }

  /**
   * 生成Meta标签建议
   */
  generateMetaRecommendations(metaAnalysis) {
    const recommendations = [];

    if (!metaAnalysis) return recommendations;

    // Title标签建议
    if (!metaAnalysis.title?.exists) {
      recommendations.push({
        category: 'meta',
        type: 'title-missing',
        priority: this.priorityLevels.CRITICAL,
        title: '添加页面标题',
        description: '页面缺少title标签，这对SEO极其重要',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '在<head>部分添加<title>标签',
          '确保标题长度在30-60个字符之间',
          '包含主要关键词',
          '使标题具有描述性和吸引力'
        ]
      });
    } else if (metaAnalysis.title.isEmpty) {
      recommendations.push({
        category: 'meta',
        type: 'title-empty',
        priority: this.priorityLevels.CRITICAL,
        title: '填写页面标题内容',
        description: 'title标签存在但内容为空',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '为title标签添加有意义的内容',
          '确保标题准确描述页面内容',
          '包含相关关键词'
        ]
      });
    } else if (metaAnalysis.title.isTooShort) {
      recommendations.push({
        category: 'meta',
        type: 'title-too-short',
        priority: this.priorityLevels.HIGH,
        title: '优化页面标题长度',
        description: `当前标题过短(${metaAnalysis.title.length}字符)，建议30-60字符`,
        impact: 'medium',
        effort: 'low',
        actionItems: [
          '扩展标题内容，增加描述性词汇',
          '添加品牌名称或网站名称',
          '确保标题仍然简洁明了'
        ]
      });
    } else if (metaAnalysis.title.isTooLong) {
      recommendations.push({
        category: 'meta',
        type: 'title-too-long',
        priority: this.priorityLevels.MEDIUM,
        title: '缩短页面标题长度',
        description: `当前标题过长(${metaAnalysis.title.length}字符)，可能在搜索结果中被截断`,
        impact: 'medium',
        effort: 'low',
        actionItems: [
          '删除不必要的词汇',
          '使用更简洁的表达',
          '保留最重要的关键词'
        ]
      });
    }

    // Description建议
    if (!metaAnalysis.description?.exists) {
      recommendations.push({
        category: 'meta',
        type: 'description-missing',
        priority: this.priorityLevels.HIGH,
        title: '添加页面描述',
        description: '缺少meta description，影响搜索结果展示',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '添加<meta name="description" content="...">标签',
          '描述长度控制在120-160字符',
          '包含页面主要关键词',
          '写出吸引用户点击的描述'
        ]
      });
    } else if (metaAnalysis.description.isEmpty) {
      recommendations.push({
        category: 'meta',
        type: 'description-empty',
        priority: this.priorityLevels.HIGH,
        title: '填写页面描述内容',
        description: 'meta description标签存在但内容为空',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '为description添加有意义的内容',
          '准确描述页面内容',
          '包含行动号召词汇'
        ]
      });
    } else if (metaAnalysis.description.isTooShort || metaAnalysis.description.isTooLong) {
      recommendations.push({
        category: 'meta',
        type: 'description-length',
        priority: this.priorityLevels.MEDIUM,
        title: '优化页面描述长度',
        description: `当前描述长度为${metaAnalysis.description.length}字符，建议120-160字符`,
        impact: 'medium',
        effort: 'low',
        actionItems: [
          metaAnalysis.description.isTooShort ? '扩展描述内容，提供更多信息' : '精简描述内容，突出重点',
          '确保描述完整且有吸引力',
          '包含相关关键词'
        ]
      });
    }

    // Open Graph建议
    if (!metaAnalysis.openGraph?.exists) {
      recommendations.push({
        category: 'meta',
        type: 'opengraph-missing',
        priority: this.priorityLevels.MEDIUM,
        title: '添加Open Graph标签',
        description: '缺少Open Graph标签，影响社交媒体分享效果',
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '添加og:title标签',
          '添加og:description标签',
          '添加og:image标签',
          '添加og:url标签',
          '添加og:type标签'
        ]
      });
    } else if (!metaAnalysis.openGraph.isComplete) {
      recommendations.push({
        category: 'meta',
        type: 'opengraph-incomplete',
        priority: this.priorityLevels.LOW,
        title: '完善Open Graph标签',
        description: `缺少必需的Open Graph标签: ${metaAnalysis.openGraph.missingTags.join(', ')}`,
        impact: 'low',
        effort: 'low',
        actionItems: metaAnalysis.openGraph.missingTags.map(tag => `添加${tag}标签`)
      });
    }

    // Viewport建议
    if (!metaAnalysis.viewport?.exists) {
      recommendations.push({
        category: 'meta',
        type: 'viewport-missing',
        priority: this.priorityLevels.HIGH,
        title: '添加Viewport标签',
        description: '缺少viewport标签，影响移动端显示',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '添加<meta name="viewport" content="width=device-width, initial-scale=1">',
          '确保页面支持响应式设计'
        ]
      });
    } else if (!metaAnalysis.viewport.isResponsive) {
      recommendations.push({
        category: 'meta',
        type: 'viewport-not-responsive',
        priority: this.priorityLevels.MEDIUM,
        title: '优化Viewport设置',
        description: '当前viewport设置不适合响应式设计',
        impact: 'medium',
        effort: 'low',
        actionItems: [
          '设置width=device-width',
          '设置initial-scale=1',
          '测试移动端显示效果'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 生成内容建议
   */
  generateContentRecommendations(contentAnalysis) {
    const recommendations = [];

    if (!contentAnalysis) return recommendations;

    // 内容长度建议
    if (!contentAnalysis.textContent?.isAdequateLength) {
      recommendations.push({
        category: 'content',
        type: 'content-too-short',
        priority: this.priorityLevels.HIGH,
        title: '增加页面内容',
        description: `当前内容过短(${contentAnalysis.textContent.wordCount}词)，建议至少300词`,
        impact: 'high',
        effort: 'high',
        actionItems: [
          '添加更多有价值的内容',
          '详细描述产品或服务',
          '添加相关的背景信息',
          '包含用户关心的问题解答'
        ]
      });
    }

    // 标题结构建议
    if (!contentAnalysis.headingStructure?.hasH1) {
      recommendations.push({
        category: 'content',
        type: 'h1-missing',
        priority: this.priorityLevels.CRITICAL,
        title: '添加H1标题',
        description: '页面缺少H1标题，这对SEO非常重要',
        impact: 'high',
        effort: 'low',
        actionItems: [
          '为页面添加一个H1标题',
          '确保H1标题包含主要关键词',
          'H1标题应该准确描述页面内容'
        ]
      });
    } else if (contentAnalysis.headingStructure.hasMultipleH1) {
      recommendations.push({
        category: 'content',
        type: 'multiple-h1',
        priority: this.priorityLevels.HIGH,
        title: '修复多个H1标题',
        description: `页面有${contentAnalysis.headingStructure.h1Count}个H1标题，建议只保留一个`,
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '保留最重要的H1标题',
          '将其他H1改为H2或H3',
          '确保标题层次结构合理'
        ]
      });
    }

    if (!contentAnalysis.headingStructure?.hasProperHierarchy) {
      recommendations.push({
        category: 'content',
        type: 'heading-hierarchy',
        priority: this.priorityLevels.MEDIUM,
        title: '优化标题层次结构',
        description: '标题层次结构不当，影响内容组织',
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '按照H1 > H2 > H3的顺序组织标题',
          '不要跳过标题级别',
          '确保每个标题都有意义'
        ]
      });
    }

    // 图片优化建议
    if (contentAnalysis.images?.missingAltPercentage > 10) {
      recommendations.push({
        category: 'content',
        type: 'images-missing-alt',
        priority: this.priorityLevels.HIGH,
        title: '添加图片Alt属性',
        description: `${contentAnalysis.images.missingAltPercentage}%的图片缺少alt属性`,
        impact: 'high',
        effort: 'medium',
        actionItems: [
          '为所有信息性图片添加alt属性',
          '描述图片内容和作用',
          '装饰性图片使用空alt属性(alt="")',
          '避免使用"图片"、"照片"等通用词汇'
        ]
      });
    }

    // 关键词优化建议
    if (contentAnalysis.keywords?.isKeywordStuffing) {
      recommendations.push({
        category: 'content',
        type: 'keyword-stuffing',
        priority: this.priorityLevels.HIGH,
        title: '减少关键词密度',
        description: `关键词密度过高(${contentAnalysis.keywords.maxKeywordDensity}%)，可能被视为关键词堆砌`,
        impact: 'high',
        effort: 'medium',
        actionItems: [
          '减少关键词重复使用',
          '使用同义词和相关词汇',
          '确保内容自然流畅',
          '关键词密度控制在1-3%之间'
        ]
      });
    }

    // 可读性建议
    if (contentAnalysis.readability?.isDifficultToRead) {
      recommendations.push({
        category: 'content',
        type: 'readability-poor',
        priority: this.priorityLevels.MEDIUM,
        title: '提高内容可读性',
        description: `内容可读性较差(Flesch评分: ${contentAnalysis.readability.fleschScore})`,
        impact: 'medium',
        effort: 'high',
        actionItems: [
          '使用更简单的词汇',
          '缩短句子长度',
          '增加段落分隔',
          '使用项目符号和编号列表'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 生成内容质量建议
   */
  generateContentQualityRecommendations(contentQualityAnalysis) {
    const recommendations = [];

    if (!contentQualityAnalysis) return recommendations;

    // 内容深度建议
    if (!contentQualityAnalysis.contentDepth?.hasAdequateDepth) {
      recommendations.push({
        category: 'content-quality',
        type: 'content-depth',
        priority: this.priorityLevels.HIGH,
        title: '增加内容深度',
        description: `内容深度不足(${contentQualityAnalysis.contentDepth?.depthLevel || 'Unknown'})，需要更详细的信息`,
        impact: 'high',
        effort: 'high',
        actionItems: [
          `增加内容长度至${contentQualityAnalysis.contentDepth?.wordCount < 800 ? '800+' : '1500+'}词`,
          '添加更多子标题和段落结构',
          '包含具体示例和案例研究',
          '提供深入的分析和见解'
        ]
      });
    }

    // 用户参与度建议
    if (!contentQualityAnalysis.userEngagement?.isEngaging) {
      recommendations.push({
        category: 'content-quality',
        type: 'user-engagement',
        priority: this.priorityLevels.MEDIUM,
        title: '提高用户参与度',
        description: `用户参与度较低(评分: ${contentQualityAnalysis.userEngagement?.engagementScore || 0})`,
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '增加互动问题和思考点',
          '使用更多个人化表达(你、我们)',
          '添加行动号召(CTA)',
          '包含互动元素和表单'
        ]
      });
    }

    // 专业性建议
    if (!contentQualityAnalysis.expertiseSignals?.showsExpertise) {
      recommendations.push({
        category: 'content-quality',
        type: 'expertise-signals',
        priority: this.priorityLevels.MEDIUM,
        title: '增强内容专业性',
        description: `专业性信号不足(评分: ${contentQualityAnalysis.expertiseSignals?.expertiseScore || 0})`,
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '添加统计数据和研究引用',
          '包含作者信息和资质',
          '使用专业术语和技术细节',
          '提供权威来源链接'
        ]
      });
    }

    // 主题相关性建议
    if (!contentQualityAnalysis.topicalRelevance?.isTopicallyFocused) {
      recommendations.push({
        category: 'content-quality',
        type: 'topical-focus',
        priority: this.priorityLevels.MEDIUM,
        title: '提高主题聚焦度',
        description: '内容主题不够集中，建议围绕核心主题展开',
        impact: 'medium',
        effort: 'medium',
        actionItems: [
          '明确核心主题和关键概念',
          '删除偏离主题的内容',
          '确保标题与内容高度相关',
          '使用相关的语义词汇'
        ]
      });
    }

    // 可操作性建议
    if (!contentQualityAnalysis.actionability?.isActionable) {
      recommendations.push({
        category: 'content-quality',
        type: 'actionability',
        priority: this.priorityLevels.LOW,
        title: '增强内容可操作性',
        description: `内容可操作性不足(评分: ${contentQualityAnalysis.actionability?.actionabilityScore || 0})`,
        impact: 'low',
        effort: 'medium',
        actionItems: [
          '添加具体的步骤指导',
          '提供实用工具和资源',
          '包含实际操作示例',
          '使用更多行动动词'
        ]
      });
    }

    // 内容完整性建议
    if (!contentQualityAnalysis.contentCompleteness?.isComplete) {
      const missingElements = contentQualityAnalysis.contentCompleteness?.missingElements || [];
      if (missingElements.length > 0) {
        recommendations.push({
          category: 'content-quality',
          type: 'content-completeness',
          priority: this.priorityLevels.MEDIUM,
          title: '完善内容结构',
          description: `内容结构不完整，缺少: ${missingElements.join(', ')}`,
          impact: 'medium',
          effort: 'low',
          actionItems: [
            '添加引言部分介绍主题',
            '包含结论总结要点',
            '使用列表组织信息',
            '添加相关图片和媒体'
          ]
        });
      }
    }

    // 基于质量问题生成建议
    if (contentQualityAnalysis.qualityIssues) {
      contentQualityAnalysis.qualityIssues.forEach(issue => {
        if (issue.severity === 'high') {
          recommendations.push({
            category: 'content-quality',
            type: issue.type,
            priority: this.priorityLevels.HIGH,
            title: `修复${issue.type}问题`,
            description: issue.message,
            impact: 'high',
            effort: 'medium',
            actionItems: ['根据具体问题进行针对性优化']
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * 生成性能建议
   */
  generatePerformanceRecommendations(performanceAnalysis) {
    const recommendations = [];

    if (!performanceAnalysis) return recommendations;

    // 使用性能分析中的优化机会
    if (performanceAnalysis.optimizationOpportunities) {
      performanceAnalysis.optimizationOpportunities.forEach(opportunity => {
        recommendations.push({
          category: 'performance',
          type: opportunity.type,
          priority: opportunity.priority,
          title: this.getPerformanceTitle(opportunity.type),
          description: opportunity.description,
          impact: this.getImpactFromSavings(opportunity.savings),
          effort: this.getEffortFromType(opportunity.type),
          actionItems: this.getPerformanceActionItems(opportunity.type),
          savings: opportunity.savings
        });
      });
    }

    return recommendations;
  }

  /**
   * 生成结构化数据建议
   */
  generateStructuredDataRecommendations(structuredDataAnalysis) {
    const recommendations = [];

    // 这里需要实现结构化数据的建议生成逻辑
    // 暂时返回空数组

    return recommendations;
  }

  /**
   * 生成链接建议
   */
  generateLinkRecommendations(linkAnalysis) {
    const recommendations = [];

    // 这里需要实现链接分析的建议生成逻辑
    // 暂时返回空数组

    return recommendations;
  }

  /**
   * 生成移动端建议
   */
  generateMobileRecommendations(mobileAnalysis) {
    const recommendations = [];

    // 这里需要实现移动端优化的建议生成逻辑
    // 暂时返回空数组

    return recommendations;
  }

  /**
   * 按优先级排序建议
   */
  sortRecommendationsByPriority(recommendations) {
    const priorityOrder = {
      [this.priorityLevels.CRITICAL]: 0,
      [this.priorityLevels.HIGH]: 1,
      [this.priorityLevels.MEDIUM]: 2,
      [this.priorityLevels.LOW]: 3
    };

    return recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 相同优先级按影响程度排序
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  // 辅助方法
  getPerformanceTitle(type) {
    const titles = {
      'image-optimization': '优化图片',
      'javascript-optimization': '优化JavaScript',
      'css-optimization': '优化CSS',
      'server-response-optimization': '优化服务器响应时间'
    };
    return titles[type] || '性能优化';
  }

  getImpactFromSavings(savings) {
    if (savings > 1000000) return 'high';    // > 1MB
    if (savings > 500000) return 'medium';   // > 500KB
    return 'low';
  }

  getEffortFromType(type) {
    const effortMap = {
      'image-optimization': 'medium',
      'javascript-optimization': 'high',
      'css-optimization': 'medium',
      'server-response-optimization': 'high'
    };
    return effortMap[type] || 'medium';
  }

  getPerformanceActionItems(type) {
    const actionItems = {
      'image-optimization': [
        '压缩图片文件大小',
        '使用现代图片格式(WebP, AVIF)',
        '实施响应式图片',
        '使用图片懒加载'
      ],
      'javascript-optimization': [
        '压缩JavaScript文件',
        '移除未使用的代码',
        '实施代码分割',
        '使用现代JavaScript语法'
      ],
      'css-optimization': [
        '压缩CSS文件',
        '移除未使用的CSS',
        '合并CSS文件',
        '使用CSS预处理器'
      ],
      'server-response-optimization': [
        '优化数据库查询',
        '使用缓存机制',
        '升级服务器硬件',
        '优化服务器配置'
      ]
    };
    return actionItems[type] || [];
  }
}

module.exports = RecommendationEngine;
