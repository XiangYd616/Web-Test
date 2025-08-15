/**
 * Meta标签分析器
 * 本地化程度：100%
 * 分析页面的Meta标签，包括title、description、keywords等
 */

class MetaTagAnalyzer {
  constructor() {
    this.rules = {
      title: {
        minLength: 30,
        maxLength: 60,
        optimalLength: 55
      },
      description: {
        minLength: 120,
        maxLength: 160,
        optimalLength: 155
      },
      keywords: {
        maxCount: 10,
        maxLength: 255
      }
    };
  }

  /**
   * 执行Meta标签分析
   */
  async analyze(pageData) {
    const { $, url } = pageData;
    
    const analysis = {
      title: this.analyzeTitle($),
      description: this.analyzeDescription($),
      keywords: this.analyzeKeywords($),
      openGraph: this.analyzeOpenGraph($),
      twitterCard: this.analyzeTwitterCard($),
      canonical: this.analyzeCanonical($, url),
      robots: this.analyzeRobots($),
      viewport: this.analyzeViewport($),
      charset: this.analyzeCharset($),
      language: this.analyzeLanguage($),
      author: this.analyzeAuthor($),
      generator: this.analyzeGenerator($)
    };
    
    // 计算Meta标签评分
    analysis.score = this.calculateMetaScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    
    return analysis;
  }

  /**
   * 分析Title标签
   */
  analyzeTitle($) {
    const titleElement = $('title').first();
    const title = titleElement.text().trim();
    
    const analysis = {
      exists: titleElement.length > 0,
      content: title,
      length: title.length,
      isEmpty: title.length === 0,
      isTooShort: title.length < this.rules.title.minLength,
      isTooLong: title.length > this.rules.title.maxLength,
      isOptimal: title.length >= this.rules.title.minLength && title.length <= this.rules.title.optimalLength,
      hasKeywords: this.detectKeywords(title),
      hasBrandName: this.detectBrandName(title),
      isUnique: true, // 需要与其他页面对比，暂时设为true
      duplicateCount: $('title').length
    };
    
    // 检查标题质量
    analysis.quality = this.assessTitleQuality(title);
    
    return analysis;
  }

  /**
   * 分析Description标签
   */
  analyzeDescription($) {
    const descElement = $('meta[name="description"]').first();
    const description = descElement.attr('content') || '';
    
    const analysis = {
      exists: descElement.length > 0,
      content: description,
      length: description.length,
      isEmpty: description.length === 0,
      isTooShort: description.length < this.rules.description.minLength,
      isTooLong: description.length > this.rules.description.maxLength,
      isOptimal: description.length >= this.rules.description.minLength && description.length <= this.rules.description.optimalLength,
      hasKeywords: this.detectKeywords(description),
      hasCallToAction: this.detectCallToAction(description),
      isUnique: true, // 需要与其他页面对比，暂时设为true
      duplicateCount: $('meta[name="description"]').length
    };
    
    // 检查描述质量
    analysis.quality = this.assessDescriptionQuality(description);
    
    return analysis;
  }

  /**
   * 分析Keywords标签
   */
  analyzeKeywords($) {
    const keywordsElement = $('meta[name="keywords"]').first();
    const keywords = keywordsElement.attr('content') || '';
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    return {
      exists: keywordsElement.length > 0,
      content: keywords,
      count: keywordList.length,
      keywords: keywordList,
      isTooMany: keywordList.length > this.rules.keywords.maxCount,
      isTooLong: keywords.length > this.rules.keywords.maxLength,
      hasRelevantKeywords: this.assessKeywordRelevance(keywordList)
    };
  }

  /**
   * 分析Open Graph标签
   */
  analyzeOpenGraph($) {
    const ogTags = {};
    $('meta[property^="og:"]').each((i, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        ogTags[property] = content;
      }
    });
    
    const requiredTags = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];
    const missingTags = requiredTags.filter(tag => !ogTags[tag]);
    
    return {
      exists: Object.keys(ogTags).length > 0,
      tags: ogTags,
      requiredTags,
      missingTags,
      isComplete: missingTags.length === 0,
      hasImage: !!ogTags['og:image'],
      hasValidImage: this.validateImageUrl(ogTags['og:image']),
      imageCount: $('meta[property="og:image"]').length
    };
  }

  /**
   * 分析Twitter Card标签
   */
  analyzeTwitterCard($) {
    const twitterTags = {};
    $('meta[name^="twitter:"]').each((i, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        twitterTags[name] = content;
      }
    });
    
    const cardType = twitterTags['twitter:card'];
    const requiredTags = this.getRequiredTwitterTags(cardType);
    const missingTags = requiredTags.filter(tag => !twitterTags[tag]);
    
    return {
      exists: Object.keys(twitterTags).length > 0,
      tags: twitterTags,
      cardType,
      requiredTags,
      missingTags,
      isComplete: missingTags.length === 0,
      hasValidCardType: ['summary', 'summary_large_image', 'app', 'player'].includes(cardType)
    };
  }

  /**
   * 分析Canonical标签
   */
  analyzeCanonical($, currentUrl) {
    const canonicalElement = $('link[rel="canonical"]').first();
    const canonicalUrl = canonicalElement.attr('href');
    
    return {
      exists: canonicalElement.length > 0,
      url: canonicalUrl,
      isSelfReferencing: canonicalUrl === currentUrl,
      isAbsolute: canonicalUrl && canonicalUrl.startsWith('http'),
      isValid: this.validateUrl(canonicalUrl),
      duplicateCount: $('link[rel="canonical"]').length
    };
  }

  /**
   * 分析Robots标签
   */
  analyzeRobots($) {
    const robotsElement = $('meta[name="robots"]').first();
    const robotsContent = robotsElement.attr('content') || '';
    const directives = robotsContent.split(',').map(d => d.trim().toLowerCase());
    
    return {
      exists: robotsElement.length > 0,
      content: robotsContent,
      directives,
      isIndexable: !directives.includes('noindex'),
      isFollowable: !directives.includes('nofollow'),
      allowsSnippets: !directives.includes('nosnippet'),
      allowsArchive: !directives.includes('noarchive'),
      allowsImageIndex: !directives.includes('noimageindex')
    };
  }

  /**
   * 分析Viewport标签
   */
  analyzeViewport($) {
    const viewportElement = $('meta[name="viewport"]').first();
    const viewportContent = viewportElement.attr('content') || '';
    
    return {
      exists: viewportElement.length > 0,
      content: viewportContent,
      hasWidth: viewportContent.includes('width='),
      hasDeviceWidth: viewportContent.includes('width=device-width'),
      hasInitialScale: viewportContent.includes('initial-scale='),
      isResponsive: viewportContent.includes('width=device-width') && viewportContent.includes('initial-scale=1')
    };
  }

  /**
   * 分析字符编码
   */
  analyzeCharset($) {
    const charsetElement = $('meta[charset]').first();
    const httpEquivElement = $('meta[http-equiv="Content-Type"]').first();
    
    const charset = charsetElement.attr('charset') || 
                   (httpEquivElement.attr('content') || '').match(/charset=([^;]+)/)?.[1];
    
    return {
      exists: charsetElement.length > 0 || httpEquivElement.length > 0,
      charset: charset,
      isUTF8: charset && charset.toLowerCase().includes('utf-8'),
      isValid: this.validateCharset(charset)
    };
  }

  /**
   * 分析语言设置
   */
  analyzeLanguage($) {
    const htmlLang = $('html').attr('lang');
    const metaLang = $('meta[http-equiv="content-language"]').attr('content');
    
    return {
      htmlLang,
      metaLang,
      hasHtmlLang: !!htmlLang,
      hasMetaLang: !!metaLang,
      isValid: this.validateLanguageCode(htmlLang || metaLang)
    };
  }

  /**
   * 分析作者信息
   */
  analyzeAuthor($) {
    const authorElement = $('meta[name="author"]').first();
    const author = authorElement.attr('content') || '';
    
    return {
      exists: authorElement.length > 0,
      content: author,
      isEmpty: author.length === 0
    };
  }

  /**
   * 分析生成器信息
   */
  analyzeGenerator($) {
    const generatorElement = $('meta[name="generator"]').first();
    const generator = generatorElement.attr('content') || '';
    
    return {
      exists: generatorElement.length > 0,
      content: generator,
      isEmpty: generator.length === 0
    };
  }

  /**
   * 计算Meta标签总体评分
   */
  calculateMetaScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // Title评分 (权重: 25%)
    maxScore += 25;
    if (analysis.title.exists && !analysis.title.isEmpty) {
      if (analysis.title.isOptimal) score += 25;
      else if (!analysis.title.isTooShort && !analysis.title.isTooLong) score += 20;
      else score += 10;
    }
    
    // Description评分 (权重: 25%)
    maxScore += 25;
    if (analysis.description.exists && !analysis.description.isEmpty) {
      if (analysis.description.isOptimal) score += 25;
      else if (!analysis.description.isTooShort && !analysis.description.isTooLong) score += 20;
      else score += 10;
    }
    
    // Open Graph评分 (权重: 20%)
    maxScore += 20;
    if (analysis.openGraph.exists) {
      if (analysis.openGraph.isComplete) score += 20;
      else score += 10;
    }
    
    // Canonical评分 (权重: 15%)
    maxScore += 15;
    if (analysis.canonical.exists && analysis.canonical.isValid) {
      score += 15;
    }
    
    // Viewport评分 (权重: 10%)
    maxScore += 10;
    if (analysis.viewport.exists && analysis.viewport.isResponsive) {
      score += 10;
    }
    
    // 其他标签评分 (权重: 5%)
    maxScore += 5;
    if (analysis.charset.exists && analysis.charset.isUTF8) score += 2;
    if (analysis.language.hasHtmlLang) score += 2;
    if (analysis.robots.exists) score += 1;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别Meta标签问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // Title问题
    if (!analysis.title.exists) {
      issues.push({ type: 'title', severity: 'critical', message: '缺少title标签' });
    } else if (analysis.title.isEmpty) {
      issues.push({ type: 'title', severity: 'critical', message: 'title标签为空' });
    } else if (analysis.title.isTooShort) {
      issues.push({ type: 'title', severity: 'high', message: `title标签过短 (${analysis.title.length}字符)` });
    } else if (analysis.title.isTooLong) {
      issues.push({ type: 'title', severity: 'medium', message: `title标签过长 (${analysis.title.length}字符)` });
    }
    
    // Description问题
    if (!analysis.description.exists) {
      issues.push({ type: 'description', severity: 'high', message: '缺少meta description' });
    } else if (analysis.description.isEmpty) {
      issues.push({ type: 'description', severity: 'high', message: 'meta description为空' });
    } else if (analysis.description.isTooShort) {
      issues.push({ type: 'description', severity: 'medium', message: `meta description过短 (${analysis.description.length}字符)` });
    } else if (analysis.description.isTooLong) {
      issues.push({ type: 'description', severity: 'medium', message: `meta description过长 (${analysis.description.length}字符)` });
    }
    
    // Open Graph问题
    if (!analysis.openGraph.exists) {
      issues.push({ type: 'openGraph', severity: 'medium', message: '缺少Open Graph标签' });
    } else if (!analysis.openGraph.isComplete) {
      issues.push({ type: 'openGraph', severity: 'low', message: `缺少必需的Open Graph标签: ${analysis.openGraph.missingTags.join(', ')}` });
    }
    
    // Viewport问题
    if (!analysis.viewport.exists) {
      issues.push({ type: 'viewport', severity: 'high', message: '缺少viewport meta标签' });
    } else if (!analysis.viewport.isResponsive) {
      issues.push({ type: 'viewport', severity: 'medium', message: 'viewport设置不适合响应式设计' });
    }
    
    return issues;
  }

  // 辅助方法
  detectKeywords(text) {
    // 简单的关键词检测逻辑
    return text.length > 0;
  }

  detectBrandName(text) {
    // 检测品牌名称的逻辑
    return text.includes('|') || text.includes('-');
  }

  detectCallToAction(text) {
    const ctaWords = ['了解', '查看', '立即', '免费', '下载', '注册', '购买', '联系'];
    return ctaWords.some(word => text.includes(word));
  }

  assessTitleQuality(title) {
    let quality = 'good';
    if (title.length === 0) quality = 'poor';
    else if (title.length < 30 || title.length > 60) quality = 'fair';
    return quality;
  }

  assessDescriptionQuality(description) {
    let quality = 'good';
    if (description.length === 0) quality = 'poor';
    else if (description.length < 120 || description.length > 160) quality = 'fair';
    return quality;
  }

  assessKeywordRelevance(keywords) {
    // 简化的关键词相关性评估
    return keywords.length > 0 && keywords.length <= 10;
  }

  validateImageUrl(url) {
    if (!url) return false;
    return url.startsWith('http') && //.(jpg|jpeg|png|gif|webp)$/i.test(url);
  }

  getRequiredTwitterTags(cardType) {
    const baseTags = ['twitter:card'];
    switch (cardType) {
      case 'summary':
      case 'summary_large_image':
        return [...baseTags, 'twitter:title', 'twitter:description'];
      case 'app':
        return [...baseTags, 'twitter:app:name:iphone', 'twitter:app:id:iphone'];
      case 'player':
        return [...baseTags, 'twitter:title', 'twitter:player'];
      default:
        return baseTags;
    }
  }

  validateUrl(url) {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  validateCharset(charset) {
    if (!charset) return false;
    const validCharsets = ['utf-8', 'iso-8859-1', 'windows-1252'];
    return validCharsets.includes(charset.toLowerCase());
  }

  validateLanguageCode(lang) {
    if (!lang) return false;
    // 简化的语言代码验证
    return /^[a-z]{2}(-[A-Z]{2})?$/.test(lang);
  }
}

module.exports = MetaTagAnalyzer;
