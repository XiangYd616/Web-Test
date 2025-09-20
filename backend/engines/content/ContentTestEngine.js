/**
 * 内容测试引擎
 * 内容质量分析、可读性检测、SEO优化建议
 */

const Joi = require('joi');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class ContentTestEngine {
  constructor() {
    this.name = 'content';
    this.version = '1.0.0';
    this.activeTests = new Map();
    this.stopWords = {
      en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'],
      zh: ['的', '是', '在', '有', '和', '与', '或', '但', '不', '也', '都', '很', '更', '最', '就', '会', '能', '要', '可以', '应该', '必须', '这', '那', '这个', '那个', '什么', '怎么', '为什么', '哪里', '哪个']
    };
  }

  async checkAvailability() {
    try {
      return {
        available: true,
        version: this.version,
        capabilities: this.getCapabilities(),
        dependencies: ['axios', 'cheerio']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['axios', 'cheerio']
      };
    }
  }

  getCapabilities() {
    return {
      analysisTypes: [
        'content-quality',    // 内容质量分析
        'readability',        // 可读性检测
        'seo-optimization',   // SEO优化
        'keyword-analysis',   // 关键词分析
        'content-structure',  // 内容结构分析
        'duplicate-content',  // 重复内容检测
        'content-freshness',  // 内容时效性
        'multimedia-analysis' // 多媒体内容分析
      ],
      languages: ['en', 'zh', 'auto-detect'],
      metrics: [
        'flesch-reading-ease',
        'word-count',
        'sentence-count',
        'paragraph-count',
        'keyword-density',
        'content-uniqueness',
        'seo-score'
      ],
      seoFactors: [
        'title-optimization',
        'meta-description',
        'heading-structure',
        'internal-links',
        'external-links',
        'image-optimization',
        'schema-markup'
      ]
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      analysisTypes: Joi.array().items(
        Joi.string().valid(
          'content-quality', 'readability', 'seo-optimization',
          'keyword-analysis', 'content-structure', 'duplicate-content',
          'content-freshness', 'multimedia-analysis'
        )
      ).default(['content-quality', 'readability', 'seo-optimization']),
      language: Joi.string().valid('en', 'zh', 'auto-detect').default('auto-detect'),
      targetKeywords: Joi.array().items(Joi.string()).default([]),
      minWordCount: Joi.number().min(0).default(300),
      maxWordCount: Joi.number().min(100).default(10000),
      includeImages: Joi.boolean().default(true),
      includeLinks: Joi.boolean().default(true),
      seoChecks: Joi.object({
        titleLength: Joi.object({
          min: Joi.number().default(30),
          max: Joi.number().default(60)
        }).default(),
        metaDescriptionLength: Joi.object({
          min: Joi.number().default(120),
          max: Joi.number().default(160)
        }).default(),
        headingStructure: Joi.boolean().default(true),
        keywordDensity: Joi.object({
          min: Joi.number().default(0.5),
          max: Joi.number().default(3.0)
        }).default()
      }).default({})
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runContentTest(config) {
    const testId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '获取页面内容');
      
      const results = await this.performContentAnalysis(validatedConfig, testId);
      
      this.updateTestProgress(testId, 100, '内容测试完成');
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async performContentAnalysis(config, testId) {
    try {
      // 获取页面内容
      const pageData = await this.fetchPageContent(config.url);
      this.updateTestProgress(testId, 15, '解析页面结构');
      
      const $ = cheerio.load(pageData.html);
      
      // 提取内容
      const contentData = this.extractContentData($, config);
      this.updateTestProgress(testId, 25, '提取文本内容');
      
      // 检测语言
      const detectedLanguage = config.language === 'auto-detect' 
        ? this.detectLanguage(contentData.textContent)
        : config.language;
      
      const results = {
        testId,
        url: config.url,
        timestamp: new Date().toISOString(),
        config,
        language: detectedLanguage,
        contentData,
        analyses: {},
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          suggestions: 0,
          overallScore: 0
        },
        recommendations: []
      };

      // 执行各种分析
      let currentProgress = 30;
      const progressPerAnalysis = 60 / config.analysisTypes.length;

      for (const analysisType of config.analysisTypes) {
        this.updateTestProgress(testId, currentProgress, `执行${this.getAnalysisTypeName(analysisType)}`);
        
        try {
          const analysisResult = await this.performSpecificAnalysis(
            analysisType, contentData, $, config, detectedLanguage
          );
          results.analyses[analysisType] = analysisResult;
          
          // 更新摘要统计
          results.summary.totalIssues += analysisResult.issues?.length || 0;
          results.summary.criticalIssues += analysisResult.critical?.length || 0;
          results.summary.warnings += analysisResult.warnings?.length || 0;
          results.summary.suggestions += analysisResult.suggestions?.length || 0;
        } catch (analysisError) {
          results.analyses[analysisType] = {
            error: analysisError.message,
            completed: false
          };
        }
        
        currentProgress += progressPerAnalysis;
      }

      // 计算综合评分
      this.updateTestProgress(testId, 90, '计算综合评分');
      results.summary.overallScore = this.calculateOverallScore(results.analyses);
      
      // 生成综合建议
      this.updateTestProgress(testId, 95, '生成优化建议');
      results.recommendations = this.generateComprehensiveRecommendations(results.analyses, config);

      return results;
    } catch (error) {
      throw new Error(`内容分析失败: ${error.message}`);
    }
  }

  async fetchPageContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'ContentTestEngine/1.0.0 (Content Analysis Bot)'
        }
      });
      
      return {
        html: response.data,
        statusCode: response.status,
        headers: response.headers,
        size: response.data.length
      };
    } catch (error) {
      throw new Error(`无法获取页面内容: ${error.message}`);
    }
  }

  extractContentData($, config) {
    const contentData = {
      title: $('title').text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      metaKeywords: $('meta[name="keywords"]').attr('content') || '',
      headings: {
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: []
      },
      textContent: '',
      paragraphs: [],
      links: {
        internal: [],
        external: []
      },
      images: [],
      lists: [],
      tables: [],
      forms: [],
      scripts: [],
      styles: [],
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0
    };

    // 提取标题
    for (let i = 1; i <= 6; i++) {
      $(`h${i}`).each((index, element) => {
        const text = $(element).text().trim();
        if (text) {
          contentData.headings[`h${i}`].push({
            text,
            level: i,
            position: index
          });
        }
      });
    }

    // 提取主要文本内容
    $('p, article, section, main, .content, .post, .article').each((index, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 10) {
        contentData.paragraphs.push(text);
        contentData.textContent += text + ' ';
      }
    });

    // 如果没有找到主要内容，使用body
    if (contentData.textContent.trim().length === 0) {
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      contentData.textContent = bodyText;
      contentData.paragraphs = [bodyText];
    }

    // 统计字词句段落
    contentData.wordCount = this.countWords(contentData.textContent);
    contentData.sentenceCount = this.countSentences(contentData.textContent);
    contentData.paragraphCount = contentData.paragraphs.length;

    // 提取链接
    if (config.includeLinks) {
      $('a[href]').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        const linkData = { href, text, title: $(element).attr('title') || '' };
        
        if (href.startsWith('http') || href.startsWith('//')) {
          contentData.links.external.push(linkData);
        } else if (href.startsWith('/') || href.startsWith('#') || !href.includes('://')) {
          contentData.links.internal.push(linkData);
        }
      });
    }

    // 提取图片
    if (config.includeImages) {
      $('img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        const title = $(element).attr('title') || '';
        const width = $(element).attr('width');
        const height = $(element).attr('height');
        
        contentData.images.push({
          src,
          alt,
          title,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          hasAlt: !!alt,
          hasTitle: !!title
        });
      });
    }

    // 提取列表
    $('ul, ol').each((index, element) => {
      const type = element.tagName.toLowerCase();
      const items = [];
      $(element).find('li').each((i, li) => {
        items.push($(li).text().trim());
      });
      contentData.lists.push({ type, items, count: items.length });
    });

    // 提取表格
    $('table').each((index, element) => {
      const rows = $(element).find('tr').length;
      const cols = $(element).find('tr:first th, tr:first td').length;
      const hasHeaders = $(element).find('th').length > 0;
      contentData.tables.push({ rows, cols, hasHeaders });
    });

    return contentData;
  }

  detectLanguage(text) {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (chineseChars / totalChars > 0.3) {
      return 'zh';
    }
    return 'en';
  }

  countWords(text) {
    if (!text) return 0;
    // 处理中文和英文混合文本
    const chineseWords = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
    return chineseWords + englishWords;
  }

  countSentences(text) {
    if (!text) return 0;
    // 匹配句号、问号、感叹号等
    const sentences = text.match(/[.!?。！？]+/g);
    return sentences ? sentences.length : 0;
  }

  async performSpecificAnalysis(analysisType, contentData, $, config, language) {
    switch (analysisType) {
      case 'content-quality':
        return this.analyzeContentQuality(contentData, config, language);
      case 'readability':
        return this.analyzeReadability(contentData, language);
      case 'seo-optimization':
        return this.analyzeSEO(contentData, $, config);
      case 'keyword-analysis':
        return this.analyzeKeywords(contentData, config, language);
      case 'content-structure':
        return this.analyzeContentStructure(contentData, $);
      case 'duplicate-content':
        return this.analyzeDuplicateContent(contentData);
      case 'content-freshness':
        return this.analyzeContentFreshness($, contentData);
      case 'multimedia-analysis':
        return this.analyzeMultimedia(contentData);
      default:
        throw new Error(`未支持的分析类型: ${analysisType}`);
    }
  }

  analyzeContentQuality(contentData, config, language) {
    const analysis = {
      score: 0,
      issues: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    // 字数检查
    analysis.metrics.wordCount = contentData.wordCount;
    if (contentData.wordCount < config.minWordCount) {
      analysis.issues.push(`内容字数(${contentData.wordCount})少于建议最少字数(${config.minWordCount})`);
    } else if (contentData.wordCount > config.maxWordCount) {
      analysis.warnings.push(`内容字数(${contentData.wordCount})超过建议最大字数(${config.maxWordCount})`);
    }

    // 段落数量检查
    analysis.metrics.paragraphCount = contentData.paragraphCount;
    if (contentData.paragraphCount < 3) {
      analysis.warnings.push(`段落数量较少(${contentData.paragraphCount})，建议增加段落以提高可读性`);
    }

    // 平均段落长度
    const avgParagraphLength = contentData.wordCount / contentData.paragraphCount;
    analysis.metrics.avgParagraphLength = Math.round(avgParagraphLength);
    if (avgParagraphLength > 100) {
      analysis.suggestions.push('段落平均长度较长，建议分割为较短的段落');
    }

    // 句子数量和平均长度
    analysis.metrics.sentenceCount = contentData.sentenceCount;
    const avgSentenceLength = contentData.wordCount / contentData.sentenceCount;
    analysis.metrics.avgSentenceLength = Math.round(avgSentenceLength);
    
    if (avgSentenceLength > 20) {
      analysis.suggestions.push('句子平均长度较长，建议使用更简洁的表达');
    }

    // 内容丰富度
    const uniqueWords = new Set(this.extractWords(contentData.textContent, language)).size;
    analysis.metrics.vocabularyRichness = Math.round((uniqueWords / contentData.wordCount) * 100);
    
    if (analysis.metrics.vocabularyRichness < 30) {
      analysis.suggestions.push('词汇多样性较低，建议使用更丰富的词汇');
    }

    // 计算质量评分
    let score = 100;
    score -= analysis.issues.length * 15;
    score -= analysis.warnings.length * 10;
    score -= analysis.suggestions.length * 5;
    analysis.score = Math.max(0, score);

    return analysis;
  }

  analyzeReadability(contentData, language) {
    const analysis = {
      score: 0,
      readabilityScore: 0,
      readingLevel: '',
      issues: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    const wordCount = contentData.wordCount;
    const sentenceCount = contentData.sentenceCount;
    const syllableCount = this.estimateSyllables(contentData.textContent, language);

    // Flesch Reading Ease (适配中文)
    let fleschScore;
    if (language === 'zh') {
      // 中文可读性评分（简化版）
      const avgWordsPerSentence = wordCount / sentenceCount;
      const avgSyllablesPerWord = syllableCount / wordCount;
      fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    } else {
      // 英文 Flesch Reading Ease
      const avgWordsPerSentence = wordCount / sentenceCount;
      const avgSyllablesPerWord = syllableCount / wordCount;
      fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    }

    analysis.readabilityScore = Math.max(0, Math.min(100, Math.round(fleschScore)));
    analysis.metrics.avgWordsPerSentence = Math.round(wordCount / sentenceCount);
    analysis.metrics.avgSyllablesPerWord = Math.round((syllableCount / wordCount) * 100) / 100;

    // 确定阅读水平
    if (analysis.readabilityScore >= 90) {
      analysis.readingLevel = '非常容易';
    } else if (analysis.readabilityScore >= 80) {
      analysis.readingLevel = '容易';
    } else if (analysis.readabilityScore >= 70) {
      analysis.readingLevel = '较容易';
    } else if (analysis.readabilityScore >= 60) {
      analysis.readingLevel = '标准';
    } else if (analysis.readabilityScore >= 50) {
      analysis.readingLevel = '较难';
    } else if (analysis.readabilityScore >= 30) {
      analysis.readingLevel = '困难';
    } else {
      analysis.readingLevel = '非常困难';
    }

    // 生成建议
    if (analysis.readabilityScore < 50) {
      analysis.issues.push(`可读性评分较低(${analysis.readabilityScore})，需要简化内容表达`);
    } else if (analysis.readabilityScore < 70) {
      analysis.warnings.push(`可读性评分一般(${analysis.readabilityScore})，建议适当简化`);
    }

    if (analysis.metrics.avgWordsPerSentence > 20) {
      analysis.suggestions.push('句子平均长度较长，建议分解为较短的句子');
    }

    analysis.score = Math.min(100, analysis.readabilityScore + 10);
    return analysis;
  }

  analyzeSEO(contentData, $, config) {
    const analysis = {
      score: 0,
      issues: [],
      warnings: [],
      suggestions: [],
      metrics: {},
      seoFactors: {}
    };

    // 标题分析
    const titleLength = contentData.title.length;
    analysis.seoFactors.title = {
      text: contentData.title,
      length: titleLength,
      optimal: titleLength >= config.seoChecks.titleLength.min && titleLength <= config.seoChecks.titleLength.max
    };

    if (titleLength === 0) {
      analysis.issues.push('页面缺少标题标签');
    } else if (titleLength < config.seoChecks.titleLength.min) {
      analysis.warnings.push(`标题过短(${titleLength}字符)，建议${config.seoChecks.titleLength.min}-${config.seoChecks.titleLength.max}字符`);
    } else if (titleLength > config.seoChecks.titleLength.max) {
      analysis.warnings.push(`标题过长(${titleLength}字符)，建议${config.seoChecks.titleLength.min}-${config.seoChecks.titleLength.max}字符`);
    }

    // Meta描述分析
    const metaDescLength = contentData.metaDescription.length;
    analysis.seoFactors.metaDescription = {
      text: contentData.metaDescription,
      length: metaDescLength,
      optimal: metaDescLength >= config.seoChecks.metaDescriptionLength.min && metaDescLength <= config.seoChecks.metaDescriptionLength.max
    };

    if (metaDescLength === 0) {
      analysis.issues.push('页面缺少Meta描述');
    } else if (metaDescLength < config.seoChecks.metaDescriptionLength.min) {
      analysis.warnings.push(`Meta描述过短(${metaDescLength}字符)`);
    } else if (metaDescLength > config.seoChecks.metaDescriptionLength.max) {
      analysis.warnings.push(`Meta描述过长(${metaDescLength}字符)`);
    }

    // 标题结构分析
    const h1Count = contentData.headings.h1.length;
    analysis.seoFactors.headingStructure = {
      h1Count,
      hasH1: h1Count > 0,
      multipleH1: h1Count > 1,
      hierarchical: this.checkHeadingHierarchy(contentData.headings)
    };

    if (h1Count === 0) {
      analysis.issues.push('页面缺少H1标题');
    } else if (h1Count > 1) {
      analysis.warnings.push(`页面有多个H1标题(${h1Count}个)，建议只使用一个`);
    }

    if (!analysis.seoFactors.headingStructure.hierarchical) {
      analysis.suggestions.push('标题层次结构不规范，建议按H1>H2>H3的顺序组织');
    }

    // 图片SEO分析
    const imagesWithoutAlt = contentData.images.filter(img => !img.hasAlt).length;
    analysis.seoFactors.images = {
      total: contentData.images.length,
      withoutAlt: imagesWithoutAlt,
      altOptimization: ((contentData.images.length - imagesWithoutAlt) / contentData.images.length) * 100
    };

    if (imagesWithoutAlt > 0) {
      analysis.warnings.push(`${imagesWithoutAlt}张图片缺少Alt属性`);
    }

    // 链接分析
    analysis.seoFactors.links = {
      internal: contentData.links.internal.length,
      external: contentData.links.external.length,
      total: contentData.links.internal.length + contentData.links.external.length
    };

    if (contentData.links.internal.length < 3) {
      analysis.suggestions.push('内部链接较少，建议增加相关页面链接');
    }

    // 计算SEO评分
    let score = 100;
    score -= analysis.issues.length * 20;
    score -= analysis.warnings.length * 10;
    score -= analysis.suggestions.length * 5;
    analysis.score = Math.max(0, score);

    return analysis;
  }

  analyzeKeywords(contentData, config, language) {
    const analysis = {
      score: 0,
      targetKeywords: config.targetKeywords,
      keywordDensity: {},
      topKeywords: [],
      issues: [],
      warnings: [],
      suggestions: []
    };

    const words = this.extractWords(contentData.textContent, language);
    const totalWords = words.length;
    
    // 统计词频
    const wordFreq = {};
    words.forEach(word => {
      word = word.toLowerCase();
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // 计算目标关键词密度
    config.targetKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const count = wordFreq[keywordLower] || 0;
      const density = (count / totalWords) * 100;
      
      analysis.keywordDensity[keyword] = {
        count,
        density: Math.round(density * 100) / 100
      };

      if (density < config.seoChecks.keywordDensity.min) {
        analysis.warnings.push(`关键词"${keyword}"密度过低(${density.toFixed(2)}%)`);
      } else if (density > config.seoChecks.keywordDensity.max) {
        analysis.issues.push(`关键词"${keyword}"密度过高(${density.toFixed(2)}%)，可能被认为是关键词堆砌`);
      }
    });

    // 找出高频词汇
    const stopWords = this.stopWords[language] || this.stopWords.en;
    const filteredWords = Object.entries(wordFreq)
      .filter(([word]) => !stopWords.includes(word.toLowerCase()))
      .filter(([word]) => word.length > 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    analysis.topKeywords = filteredWords.map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / totalWords) * 10000) / 100
    }));

    // 计算关键词分析评分
    let score = 70;
    if (config.targetKeywords.length > 0) {
      const wellOptimizedKeywords = Object.values(analysis.keywordDensity)
        .filter(kw => kw.density >= config.seoChecks.keywordDensity.min && 
                     kw.density <= config.seoChecks.keywordDensity.max).length;
      score += (wellOptimizedKeywords / config.targetKeywords.length) * 30;
    }
    
    score -= analysis.issues.length * 15;
    score -= analysis.warnings.length * 5;
    analysis.score = Math.max(0, Math.min(100, score));

    return analysis;
  }

  analyzeContentStructure(contentData, $) {
    const analysis = {
      score: 0,
      structure: {},
      issues: [],
      warnings: [],
      suggestions: []
    };

    // 分析内容结构
    analysis.structure = {
      headings: {
        total: Object.values(contentData.headings).flat().length,
        distribution: {
          h1: contentData.headings.h1.length,
          h2: contentData.headings.h2.length,
          h3: contentData.headings.h3.length,
          h4: contentData.headings.h4.length,
          h5: contentData.headings.h5.length,
          h6: contentData.headings.h6.length
        }
      },
      lists: {
        total: contentData.lists.length,
        types: contentData.lists.reduce((acc, list) => {
          acc[list.type] = (acc[list.type] || 0) + 1;
          return acc;
        }, {})
      },
      tables: {
        total: contentData.tables.length,
        withHeaders: contentData.tables.filter(t => t.hasHeaders).length
      },
      paragraphs: contentData.paragraphCount,
      textToCodeRatio: this.calculateTextToCodeRatio($)
    };

    // 检查结构问题
    if (analysis.structure.headings.total === 0) {
      analysis.issues.push('页面缺少标题结构，影响内容组织和SEO');
    }

    if (analysis.structure.headings.distribution.h2 === 0 && contentData.paragraphCount > 5) {
      analysis.warnings.push('内容较长但缺少H2子标题，建议添加章节标题');
    }

    if (contentData.lists.length === 0 && contentData.wordCount > 500) {
      analysis.suggestions.push('考虑使用列表来组织要点，提高可读性');
    }

    if (analysis.structure.tables.total > 0 && analysis.structure.tables.withHeaders === 0) {
      analysis.warnings.push('表格缺少标题行，影响可访问性');
    }

    // 计算结构评分
    let score = 60;
    if (analysis.structure.headings.total > 0) score += 20;
    if (analysis.structure.headings.distribution.h2 > 0) score += 10;
    if (contentData.lists.length > 0) score += 5;
    if (analysis.structure.tables.withHeaders === analysis.structure.tables.total) score += 5;
    
    score -= analysis.issues.length * 15;
    score -= analysis.warnings.length * 5;
    analysis.score = Math.max(0, Math.min(100, score));

    return analysis;
  }

  analyzeDuplicateContent(contentData) {
    const analysis = {
      score: 90, // 默认高分，因为无法检测外部重复
      duplicateRisk: 'low',
      issues: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    // 检查内部重复内容
    const paragraphs = contentData.paragraphs;
    const duplicateParagraphs = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const similarity = this.calculateTextSimilarity(paragraphs[i], paragraphs[j]);
        if (similarity > 0.8) {
          duplicateParagraphs.push({ index1: i, index2: j, similarity });
        }
      }
    }

    analysis.metrics.duplicateParagraphs = duplicateParagraphs.length;
    
    if (duplicateParagraphs.length > 0) {
      analysis.warnings.push(`发现${duplicateParagraphs.length}组高度相似的段落`);
      analysis.score -= duplicateParagraphs.length * 10;
    }

    // 检查重复标题
    const allHeadings = Object.values(contentData.headings).flat().map(h => h.text);
    const duplicateHeadings = allHeadings.filter((heading, index) => 
      allHeadings.indexOf(heading) !== index
    );

    if (duplicateHeadings.length > 0) {
      analysis.warnings.push(`发现${duplicateHeadings.length}个重复的标题`);
      analysis.score -= duplicateHeadings.length * 5;
    }

    // 设置风险等级
    if (analysis.score < 70) {
      analysis.duplicateRisk = 'high';
    } else if (analysis.score < 85) {
      analysis.duplicateRisk = 'medium';
    }

    return analysis;
  }

  analyzeContentFreshness($, contentData) {
    const analysis = {
      score: 50, // 中等分数，因为无法确定确切的更新时间
      publishDate: null,
      lastModified: null,
      freshnessIndicators: [],
      issues: [],
      warnings: [],
      suggestions: []
    };

    // 查找发布日期
    const dateSelectors = [
      'time[datetime]',
      '.publish-date', '.published', '.date',
      'meta[property="article:published_time"]',
      'meta[name="date"]'
    ];

    dateSelectors.forEach(selector => {
      const element = $(selector).first();
      if (element.length) {
        const dateText = element.attr('datetime') || element.attr('content') || element.text();
        if (dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime())) {
            analysis.publishDate = parsedDate.toISOString();
            analysis.freshnessIndicators.push(`发布日期: ${selector}`);
          }
        }
      }
    });

    // 查找更新日期
    const updateSelectors = [
      'meta[property="article:modified_time"]',
      '.update-date', '.modified', '.last-updated'
    ];

    updateSelectors.forEach(selector => {
      const element = $(selector).first();
      if (element.length) {
        const dateText = element.attr('content') || element.text();
        if (dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime())) {
            analysis.lastModified = parsedDate.toISOString();
            analysis.freshnessIndicators.push(`更新日期: ${selector}`);
          }
        }
      }
    });

    // 分析时效性
    if (analysis.publishDate) {
      const publishDate = new Date(analysis.publishDate);
      const now = new Date();
      const daysSincePublish = (now - publishDate) / (1000 * 60 * 60 * 24);

      if (daysSincePublish < 30) {
        analysis.score = 95;
        analysis.freshnessIndicators.push('内容非常新鲜（30天内）');
      } else if (daysSincePublish < 90) {
        analysis.score = 85;
        analysis.freshnessIndicators.push('内容较新（3个月内）');
      } else if (daysSincePublish < 365) {
        analysis.score = 70;
        analysis.suggestions.push('内容超过3个月，建议考虑更新');
      } else {
        analysis.score = 40;
        analysis.warnings.push('内容超过1年，建议及时更新以保持时效性');
      }
    } else {
      analysis.warnings.push('未找到发布日期信息，建议添加结构化的日期标记');
    }

    return analysis;
  }

  analyzeMultimedia(contentData) {
    const analysis = {
      score: 0,
      multimedia: {
        images: contentData.images.length,
        optimizedImages: contentData.images.filter(img => img.hasAlt && img.hasTitle).length,
        videos: 0,
        audio: 0
      },
      issues: [],
      warnings: [],
      suggestions: []
    };

    // 图片分析
    if (contentData.images.length === 0) {
      analysis.suggestions.push('页面没有图片，考虑添加相关图片以增强内容吸引力');
      analysis.score = 60;
    } else {
      const imagesWithAlt = contentData.images.filter(img => img.hasAlt).length;
      const altOptimization = (imagesWithAlt / contentData.images.length) * 100;
      
      if (altOptimization < 50) {
        analysis.issues.push(`${contentData.images.length - imagesWithAlt}张图片缺少Alt文本`);
      } else if (altOptimization < 80) {
        analysis.warnings.push('部分图片缺少Alt文本，影响可访问性');
      }
      
      analysis.score = Math.max(70, altOptimization);
    }

    // 图片尺寸建议
    const largeImages = contentData.images.filter(img => 
      (img.width && img.width > 1200) || (img.height && img.height > 800)
    ).length;
    
    if (largeImages > 0) {
      analysis.suggestions.push(`${largeImages}张图片尺寸较大，建议优化以提高加载速度`);
    }

    return analysis;
  }

  // 辅助方法
  extractWords(text, language) {
    if (language === 'zh') {
      // 中文分词（简单版）
      const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
      const englishWords = text.match(/[a-zA-Z]+/g) || [];
      return [...chineseChars, ...englishWords];
    } else {
      // 英文分词
      return text.match(/\b[a-zA-Z]+\b/g) || [];
    }
  }

  estimateSyllables(text, language) {
    if (language === 'zh') {
      // 中文字符数近似音节数
      return (text.match(/[\u4e00-\u9fff]/g) || []).length;
    } else {
      // 英文音节估算
      const words = text.match(/\b[a-zA-Z]+\b/g) || [];
      return words.reduce((total, word) => {
        let syllables = word.toLowerCase().match(/[aeiouy]+/g) || [];
        if (word.endsWith('e')) syllables.pop();
        return total + Math.max(1, syllables.length);
      }, 0);
    }
  }

  checkHeadingHierarchy(headings) {
    const levels = [];
    for (let i = 1; i <= 6; i++) {
      if (headings[`h${i}`].length > 0) {
        levels.push(i);
      }
    }
    
    // 检查是否按顺序出现
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i + 1] - levels[i] > 1) {
        return false;
      }
    }
    return true;
  }

  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  calculateTextToCodeRatio($) {
    const textLength = $('body').text().replace(/\s+/g, ' ').trim().length;
    const codeLength = $('script, style').text().length;
    
    return textLength / (textLength + codeLength);
  }

  calculateOverallScore(analyses) {
    const scores = Object.values(analyses)
      .filter(analysis => typeof analysis.score === 'number')
      .map(analysis => analysis.score);
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  generateComprehensiveRecommendations(analyses, config) {
    const recommendations = [];
    
    // 收集所有问题和建议
    const allIssues = [];
    const allSuggestions = [];
    
    Object.values(analyses).forEach(analysis => {
      if (analysis.issues) allIssues.push(...analysis.issues);
      if (analysis.suggestions) allSuggestions.push(...analysis.suggestions);
    });
    
    // 生成优先级建议
    if (allIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: '严重问题',
        items: allIssues.slice(0, 5) // 只显示前5个最重要的问题
      });
    }
    
    if (allSuggestions.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: '改进建议',
        items: allSuggestions.slice(0, 10) // 只显示前10个建议
      });
    }
    
    // 添加通用最佳实践建议
    recommendations.push({
      priority: 'low',
      category: '最佳实践',
      items: [
        '定期更新内容以保持时效性',
        '确保所有多媒体内容都有适当的描述',
        '使用内部链接建立页面间的关联',
        '保持一致的内容风格和语调',
        '考虑添加目录或导航以改善用户体验'
      ]
    });
    
    return recommendations;
  }

  getAnalysisTypeName(type) {
    const names = {
      'content-quality': '内容质量分析',
      'readability': '可读性检测',
      'seo-optimization': 'SEO优化分析',
      'keyword-analysis': '关键词分析',
      'content-structure': '内容结构分析',
      'duplicate-content': '重复内容检测',
      'content-freshness': '内容时效性分析',
      'multimedia-analysis': '多媒体内容分析'
    };
    return names[type] || type;
  }

  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
    }
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

module.exports = ContentTestEngine;
