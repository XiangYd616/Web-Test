/**
 * 结构化数据分析器
 * 本地化程度：100%
 * 分析页面的结构化数据，包括JSON-LD、Microdata、RDFa等
 */

class StructuredDataAnalyzer {
  constructor() {
    this.supportedTypes = [
      'Organization',
      'Person',
      'Product',
      'Article',
      'BlogPosting',
      'NewsArticle',
      'Recipe',
      'Event',
      'LocalBusiness',
      'WebSite',
      'WebPage',
      'BreadcrumbList',
      'FAQPage',
      'HowTo'
    ];
  }

  /**
   * 执行结构化数据分析
   */
  async analyze(pageData) {
    const { $ } = pageData;
    
    const analysis = {
      jsonLd: this.analyzeJsonLd($),
      microdata: this.analyzeMicrodata($),
      rdfa: this.analyzeRdfa($),
      openGraph: this.analyzeOpenGraphStructured($),
      twitterCard: this.analyzeTwitterCardStructured($)
    };
    
    // 汇总分析结果
    analysis.summary = this.createSummary(analysis);
    analysis.score = this.calculateScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    analysis.recommendations = this.generateRecommendations(analysis);
    
    return analysis;
  }

  /**
   * 分析JSON-LD结构化数据
   */
  analyzeJsonLd($) {
    const jsonLdScripts = [];
    const errors = [];
    const types = new Set();
    
    $('script[type="application/ld+json"]').each((i, el) => {
      const content = $(el).html().trim();
      
      try {
        const data = JSON.parse(content);
        const processed = this.processJsonLdData(data);
        
        jsonLdScripts.push({
          index: i,
          content,
          parsed: data,
          processed,
          isValid: true
        });
        
        // 收集类型信息
        if (processed.types) {
          processed.types.forEach(type => types.add(type));
        }
        
      } catch (error) {
        errors.push({
          index: i,
          content,
          error: error.message,
          isValid: false
        });
      }
    });
    
    return {
      count: jsonLdScripts.length + errors.length,
      valid: jsonLdScripts.length,
      invalid: errors.length,
      scripts: jsonLdScripts,
      errors,
      types: Array.from(types),
      hasStructuredData: jsonLdScripts.length > 0
    };
  }

  /**
   * 分析Microdata
   */
  analyzeMicrodata($) {
    const items = [];
    const types = new Set();
    
    $('[itemscope]').each((i, el) => {
      const $item = $(el);
      const itemType = $item.attr('itemtype');
      const itemId = $item.attr('itemid');
      
      if (itemType) {
        types.add(itemType);
      }
      
      const properties = {};
      $item.find('[itemprop]').each((j, propEl) => {
        const $prop = $(propEl);
        const propName = $prop.attr('itemprop');
        const propValue = this.extractMicrodataValue($prop);
        
        if (propName && propValue) {
          if (properties[propName]) {
            if (Array.isArray(properties[propName])) {
              properties[propName].push(propValue);
            } else {
              properties[propName] = [properties[propName], propValue];
            }
          } else {
            properties[propName] = propValue;
          }
        }
      });
      
      items.push({
        index: i,
        itemType,
        itemId,
        properties,
        element: el.tagName.toLowerCase()
      });
    });
    
    return {
      count: items.length,
      items,
      types: Array.from(types),
      hasStructuredData: items.length > 0
    };
  }

  /**
   * 分析RDFa
   */
  analyzeRdfa($) {
    const items = [];
    const types = new Set();
    
    $('[typeof]').each((i, el) => {
      const $item = $(el);
      const typeOf = $item.attr('typeof');
      const about = $item.attr('about');
      const resource = $item.attr('resource');
      
      if (typeOf) {
        types.add(typeOf);
      }
      
      const properties = {};
      $item.find('[property]').each((j, propEl) => {
        const $prop = $(propEl);
        const propName = $prop.attr('property');
        const propValue = this.extractRdfaValue($prop);
        
        if (propName && propValue) {
          if (properties[propName]) {
            if (Array.isArray(properties[propName])) {
              properties[propName].push(propValue);
            } else {
              properties[propName] = [properties[propName], propValue];
            }
          } else {
            properties[propName] = propValue;
          }
        }
      });
      
      items.push({
        index: i,
        typeof: typeOf,
        about,
        resource,
        properties,
        element: el.tagName.toLowerCase()
      });
    });
    
    return {
      count: items.length,
      items,
      types: Array.from(types),
      hasStructuredData: items.length > 0
    };
  }

  /**
   * 分析Open Graph作为结构化数据
   */
  analyzeOpenGraphStructured($) {
    const ogData = {};
    
    $('meta[property^="og:"]').each((i, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        ogData[property] = content;
      }
    });
    
    return {
      exists: Object.keys(ogData).length > 0,
      data: ogData,
      type: ogData['og:type'],
      isComplete: this.validateOpenGraphCompleteness(ogData)
    };
  }

  /**
   * 分析Twitter Card作为结构化数据
   */
  analyzeTwitterCardStructured($) {
    const twitterData = {};
    
    $('meta[name^="twitter:"]').each((i, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        twitterData[name] = content;
      }
    });
    
    return {
      exists: Object.keys(twitterData).length > 0,
      data: twitterData,
      cardType: twitterData['twitter:card'],
      isComplete: this.validateTwitterCardCompleteness(twitterData)
    };
  }

  /**
   * 处理JSON-LD数据
   */
  processJsonLdData(data) {
    const types = [];
    const items = [];
    
    const processItem = (item) => {
      if (item['@type']) {
        if (Array.isArray(item['@type'])) {
          types.push(...item['@type']);
        } else {
          types.push(item['@type']);
        }
      }
      
      items.push({
        type: item['@type'],
        context: item['@context'],
        id: item['@id'],
        properties: Object.keys(item).filter(key => !key.startsWith('@')),
        data: item
      });
    };
    
    if (Array.isArray(data)) {
      data.forEach(processItem);
    } else {
      processItem(data);
    }
    
    return {
      types: [...new Set(types)],
      items,
      hasValidContext: items.some(item => item.context),
      hasValidTypes: types.some(type => this.supportedTypes.includes(type))
    };
  }

  /**
   * 提取Microdata值
   */
  extractMicrodataValue($element) {
    const tagName = $element.prop('tagName').toLowerCase();
    
    switch (tagName) {
      case 'meta':
        return $element.attr('content');
      case 'img':
      case 'audio':
      case 'video':
      case 'embed':
      case 'iframe':
      case 'source':
        return $element.attr('src');
      case 'a':
      case 'area':
      case 'link':
        return $element.attr('href');
      case 'object':
        return $element.attr('data');
      case 'time':
        return $element.attr('datetime') || $element.text();
      default:
        return $element.text().trim();
    }
  }

  /**
   * 提取RDFa值
   */
  extractRdfaValue($element) {
    const content = $element.attr('content');
    if (content) return content;
    
    const resource = $element.attr('resource');
    if (resource) return resource;
    
    const href = $element.attr('href');
    if (href) return href;
    
    const src = $element.attr('src');
    if (src) return src;
    
    return $element.text().trim();
  }

  /**
   * 创建分析摘要
   */
  createSummary(analysis) {
    const totalStructuredData = 
      analysis.jsonLd.count + 
      analysis.microdata.count + 
      analysis.rdfa.count;
    
    const allTypes = [
      ...analysis.jsonLd.types,
      ...analysis.microdata.types,
      ...analysis.rdfa.types
    ];
    
    const uniqueTypes = [...new Set(allTypes)];
    
    return {
      totalItems: totalStructuredData,
      hasAnyStructuredData: totalStructuredData > 0,
      formats: {
        jsonLd: analysis.jsonLd.hasStructuredData,
        microdata: analysis.microdata.hasStructuredData,
        rdfa: analysis.rdfa.hasStructuredData,
        openGraph: analysis.openGraph.exists,
        twitterCard: analysis.twitterCard.exists
      },
      types: uniqueTypes,
      supportedTypes: uniqueTypes.filter(type => 
        this.supportedTypes.some(supported => type.includes(supported))
      )
    };
  }

  /**
   * 计算结构化数据评分
   */
  calculateScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // JSON-LD评分 (权重: 40%)
    maxScore += 40;
    if (analysis.jsonLd.hasStructuredData) {
      if (analysis.jsonLd.valid > 0 && analysis.jsonLd.invalid === 0) {
        score += 40;
      } else if (analysis.jsonLd.valid > 0) {
        score += 25;
      } else {
        score += 10;
      }
    }
    
    // Microdata评分 (权重: 20%)
    maxScore += 20;
    if (analysis.microdata.hasStructuredData) {
      score += 20;
    }
    
    // RDFa评分 (权重: 15%)
    maxScore += 15;
    if (analysis.rdfa.hasStructuredData) {
      score += 15;
    }
    
    // Open Graph评分 (权重: 15%)
    maxScore += 15;
    if (analysis.openGraph.exists) {
      if (analysis.openGraph.isComplete) {
        score += 15;
      } else {
        score += 8;
      }
    }
    
    // Twitter Card评分 (权重: 10%)
    maxScore += 10;
    if (analysis.twitterCard.exists) {
      if (analysis.twitterCard.isComplete) {
        score += 10;
      } else {
        score += 5;
      }
    }
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别结构化数据问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // JSON-LD问题
    if (analysis.jsonLd.invalid > 0) {
      issues.push({
        type: 'json-ld-invalid',
        severity: 'high',
        message: `${analysis.jsonLd.invalid}个JSON-LD脚本包含语法错误`
      });
    }
    
    if (!analysis.summary.hasAnyStructuredData) {
      issues.push({
        type: 'no-structured-data',
        severity: 'medium',
        message: '页面缺少结构化数据，影响搜索引擎理解'
      });
    }
    
    if (analysis.summary.supportedTypes.length === 0 && analysis.summary.hasAnyStructuredData) {
      issues.push({
        type: 'unsupported-types',
        severity: 'low',
        message: '结构化数据类型不被主要搜索引擎支持'
      });
    }
    
    return issues;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (!analysis.summary.hasAnyStructuredData) {
      recommendations.push({
        priority: 'medium',
        title: '添加结构化数据',
        description: '添加适当的结构化数据可以帮助搜索引擎更好地理解页面内容',
        actionItems: [
          '根据页面类型选择合适的Schema.org类型',
          '使用JSON-LD格式实现结构化数据',
          '验证结构化数据的正确性'
        ]
      });
    }
    
    if (analysis.jsonLd.invalid > 0) {
      recommendations.push({
        priority: 'high',
        title: '修复JSON-LD语法错误',
        description: '修复JSON-LD中的语法错误以确保搜索引擎能正确解析',
        actionItems: [
          '检查JSON语法错误',
          '验证数据格式',
          '使用结构化数据测试工具验证'
        ]
      });
    }
    
    return recommendations;
  }

  // 辅助方法
  validateOpenGraphCompleteness(ogData) {
    const required = ['og:title', 'og:description', 'og:image', 'og:url'];
    return required.every(prop => ogData[prop]);
  }

  validateTwitterCardCompleteness(twitterData) {
    const cardType = twitterData['twitter:card'];
    if (!cardType) return false;
    
    const baseRequired = ['twitter:title', 'twitter:description'];
    return baseRequired.every(prop => twitterData[prop]);
  }
}

module.exports = StructuredDataAnalyzer;
