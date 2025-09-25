/**
 * 内容分析服务
 * 统一内容分析逻辑，整合内容质量、可读性、关键词分析等功能
 */

import BaseService from './BaseService.js';

class ContentAnalysisService extends BaseService {
  constructor() {
    super('ContentAnalysisService');
    this.dependencies = [];
    
    // 停用词表
    this.stopWords = {
      en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
           'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 
           'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'],
      zh: ['的', '是', '在', '有', '和', '与', '或', '但', '不', '也', '都', '很', '更', '最', 
           '就', '会', '能', '要', '可以', '应该', '必须', '这', '那', '这个', '那个', '什么', '怎么', '为什么', '哪里', '哪个']
    };
    
    // 质量评估阈值
    this.qualityThresholds = {
      content: {
        minWordCount: 300,
        optimalWordCount: 1000,
        maxKeywordDensity: 3.0,
        optimalKeywordDensity: 1.5
      },
      readability: {
        fleschGood: 60,
        fleschExcellent: 80,
        avgSentenceLengthMax: 20,
        avgWordsPerParagraphMax: 150
      },
      seo: {
        titleMinLength: 30,
        titleMaxLength: 60,
        metaDescriptionMinLength: 120,
        metaDescriptionMaxLength: 160
      }
    };
  }

  async performInitialization() {
    // 内容分析服务不需要额外的初始化
  }

  /**
   * 执行完整内容分析
   */
  async analyzeContent(contentData, options = {}) {
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        language: options.language || 'auto-detect',
        analyses: {},
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          suggestions: 0,
          overallScore: 0
        }
      };

      // 执行不同类型的分析
      if (options.analysisTypes.includes('content-quality')) {
        analysis.analyses.contentQuality = await this.analyzeContentQuality(contentData, options);
      }
      
      if (options.analysisTypes.includes('readability')) {
        analysis.analyses.readability = await this.analyzeReadability(contentData, options);
      }
      
      if (options.analysisTypes.includes('keyword-analysis')) {
        analysis.analyses.keywords = await this.analyzeKeywords(contentData, options);
      }
      
      if (options.analysisTypes.includes('content-structure')) {
        analysis.analyses.structure = await this.analyzeContentStructure(contentData, options);
      }
      
      if (options.analysisTypes.includes('duplicate-content')) {
        analysis.analyses.duplicateContent = await this.analyzeDuplicateContent(contentData, options);
      }
      
      if (options.analysisTypes.includes('content-freshness')) {
        analysis.analyses.freshness = await this.analyzeContentFreshness(contentData, options);
      }

      // 计算综合评分
      analysis.summary = this.calculateSummary(analysis.analyses);
      
      // 生成改进建议
      analysis.recommendations = this.generateRecommendations(analysis.analyses);

      return this.createSuccessResponse(analysis, {
        analysisTypes: options.analysisTypes,
        language: analysis.language
      });
    } catch (error) {
      return this.handleError(error, 'analyzeContent');
    }
  }

  /**
   * 分析内容质量
   */
  async analyzeContentQuality(contentData, options) {
    try {
      const { textContent, headings, images, links } = contentData;
      
      // 基础统计
      const wordCount = this.countWords(textContent);
      const sentenceCount = this.countSentences(textContent);
      const paragraphCount = contentData.paragraphCount || 0;
      
      // 内容长度评估
      const lengthAssessment = {
        wordCount,
        isAdequate: wordCount >= this.qualityThresholds.content.minWordCount,
        isOptimal: wordCount >= this.qualityThresholds.content.optimalWordCount,
        lengthScore: this.calculateLengthScore(wordCount)
      };

      // 结构质量评估
      const structureAssessment = {
        headingCount: headings.length,
        hasH1: headings.some(h => h.level === 1),
        hasMultipleH1: headings.filter(h => h.level === 1).length > 1,
        headingHierarchy: this.analyzeHeadingHierarchy(headings),
        structureScore: this.calculateStructureScore(headings)
      };

      // 内容丰富度评估
      const richnessAssessment = {
        imageCount: images.length,
        linkCount: links.length,
        hasImages: images.length > 0,
        hasLinks: links.length > 0,
        imageToTextRatio: wordCount > 0 ? images.length / (wordCount / 100) : 0,
        richnessScore: this.calculateRichnessScore(images.length, links.length, wordCount)
      };

      // 综合质量评分
      const overallScore = Math.round(
        (lengthAssessment.lengthScore * 0.4) +
        (structureAssessment.structureScore * 0.35) +
        (richnessAssessment.richnessScore * 0.25)
      );

      return {
        length: lengthAssessment,
        structure: structureAssessment,
        richness: richnessAssessment,
        overallScore,
        grade: this.getQualityGrade(overallScore),
        issues: this.identifyQualityIssues(lengthAssessment, structureAssessment, richnessAssessment)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeContentQuality');
    }
  }

  /**
   * 分析可读性
   */
  async analyzeReadability(contentData, options) {
    try {
      const { textContent } = contentData;
      const words = this.getWords(textContent);
      const sentences = this.getSentences(textContent);
      
      if (sentences.length === 0 || words.length === 0) {
        return {
          fleschScore: 0,
          readingLevel: 'Unknown',
          avgWordsPerSentence: 0,
          avgSyllablesPerWord: 0,
          isEasyToRead: false,
          issues: ['内容过短，无法进行可读性分析']
        };
      }

      // 计算Flesch Reading Ease Score
      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = this.calculateAverageSyllables(words);
      
      const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
      const readingLevel = this.getReadingLevel(fleschScore);

      // 句子长度分析
      const sentenceLengths = sentences.map(s => this.countWords(s));
      const avgSentenceLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
      const maxSentenceLength = Math.max(...sentenceLengths);
      const longSentences = sentenceLengths.filter(len => len > 25).length;

      // 词汇复杂度分析
      const complexWords = words.filter(word => this.countSyllables(word) >= 3).length;
      const complexWordPercentage = (complexWords / words.length) * 100;

      return {
        fleschScore: Math.round(fleschScore),
        readingLevel,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
        avgSentenceLength: Math.round(avgSentenceLength),
        maxSentenceLength,
        longSentences,
        complexWords,
        complexWordPercentage: Math.round(complexWordPercentage),
        isEasyToRead: fleschScore >= this.qualityThresholds.readability.fleschGood,
        isVeryEasyToRead: fleschScore >= this.qualityThresholds.readability.fleschExcellent,
        issues: this.identifyReadabilityIssues(fleschScore, avgSentenceLength, complexWordPercentage)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeReadability');
    }
  }

  /**
   * 分析关键词
   */
  async analyzeKeywords(contentData, options) {
    try {
      const { textContent } = contentData;
      const language = options.language || 'auto-detect';
      const targetKeywords = options.targetKeywords || [];
      
      // 提取所有词汇
      const words = this.getWords(textContent.toLowerCase());
      const filteredWords = this.filterStopWords(words, language);
      
      // 计算词频
      const wordFrequency = this.calculateWordFrequency(filteredWords);
      
      // 获取最常见的关键词
      const topKeywords = Object.entries(wordFrequency)
        .filter(([word]) => word.length > 3)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({
          word,
          count,
          density: Math.round((count / words.length) * 10000) / 100
        }));

      // 分析目标关键词
      const targetKeywordAnalysis = targetKeywords.map(keyword => {
        const keywordLower = keyword.toLowerCase();
        const count = words.filter(word => word.includes(keywordLower)).length;
        const density = words.length > 0 ? (count / words.length) * 100 : 0;
        
        return {
          keyword,
          count,
          density: Math.round(density * 100) / 100,
          isOptimal: density >= this.qualityThresholds.content.optimalKeywordDensity && 
                    density <= this.qualityThresholds.content.maxKeywordDensity,
          isOverOptimized: density > this.qualityThresholds.content.maxKeywordDensity
        };
      });

      const maxDensity = topKeywords.length > 0 ? topKeywords[0].density : 0;

      return {
        totalWords: words.length,
        uniqueWords: Object.keys(wordFrequency).length,
        topKeywords,
        targetKeywords: targetKeywordAnalysis,
        maxKeywordDensity: maxDensity,
        isKeywordStuffing: maxDensity > this.qualityThresholds.content.maxKeywordDensity,
        vocabularyRichness: words.length > 0 ? Math.round((Object.keys(wordFrequency).length / words.length) * 100) : 0,
        issues: this.identifyKeywordIssues(maxDensity, targetKeywordAnalysis)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeKeywords');
    }
  }

  /**
   * 分析内容结构
   */
  async analyzeContentStructure(contentData, options) {
    try {
      const { headings, textContent, paragraphCount } = contentData;
      
      // 标题结构分析
      const headingAnalysis = {
        totalHeadings: headings.length,
        h1Count: headings.filter(h => h.level === 1).length,
        h2Count: headings.filter(h => h.level === 2).length,
        h3Count: headings.filter(h => h.level === 3).length,
        hasH1: headings.some(h => h.level === 1),
        hasMultipleH1: headings.filter(h => h.level === 1).length > 1,
        hierarchy: this.analyzeHeadingHierarchy(headings)
      };

      // 段落结构分析
      const avgWordsPerParagraph = paragraphCount > 0 ? this.countWords(textContent) / paragraphCount : 0;
      const paragraphAnalysis = {
        paragraphCount,
        avgWordsPerParagraph: Math.round(avgWordsPerParagraph),
        hasOptimalParagraphs: avgWordsPerParagraph >= 50 && avgWordsPerParagraph <= 150,
        tooLongParagraphs: avgWordsPerParagraph > this.qualityThresholds.readability.avgWordsPerParagraphMax
      };

      // 内容组织分析
      const organizationScore = this.calculateOrganizationScore(headingAnalysis, paragraphAnalysis);

      return {
        headings: headingAnalysis,
        paragraphs: paragraphAnalysis,
        organizationScore,
        grade: this.getOrganizationGrade(organizationScore),
        issues: this.identifyStructureIssues(headingAnalysis, paragraphAnalysis)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeContentStructure');
    }
  }

  /**
   * 分析重复内容
   */
  async analyzeDuplicateContent(contentData, options) {
    try {
      const { textContent } = contentData;
      const sentences = this.getSentences(textContent);
      
      // 检测重复句子
      const sentenceFreq = {};
      const normalizedSentences = sentences.map(s => s.trim().toLowerCase());
      
      normalizedSentences.forEach(sentence => {
        if (sentence.length > 10) { // 只检查长度大于10的句子
          sentenceFreq[sentence] = (sentenceFreq[sentence] || 0) + 1;
        }
      });

      const duplicateSentences = Object.entries(sentenceFreq)
        .filter(([, count]) => count > 1)
        .map(([sentence, count]) => ({ sentence, count }));

      // 计算唯一性评分
      const totalSentences = normalizedSentences.filter(s => s.length > 10).length;
      const uniqueSentences = totalSentences - duplicateSentences.reduce((sum, item) => sum + (item.count - 1), 0);
      const uniquenessScore = totalSentences > 0 ? Math.round((uniqueSentences / totalSentences) * 100) : 100;

      // 检测常见模板内容
      const templatePatterns = [
        /欢迎访问|welcome to/gi,
        /版权所有|copyright/gi,
        /联系我们|contact us/gi,
        /免责声明|disclaimer/gi
      ];

      const templateContent = templatePatterns.reduce((count, pattern) => {
        return count + (textContent.match(pattern) || []).length;
      }, 0);

      return {
        totalSentences,
        uniqueSentences,
        duplicateSentences: duplicateSentences.length,
        uniquenessScore,
        templateContent,
        isHighlyUnique: uniquenessScore >= 90,
        hasSignificantDuplication: uniquenessScore < 70,
        duplicateDetails: duplicateSentences.slice(0, 5), // 只返回前5个重复句子
        issues: this.identifyDuplicationIssues(uniquenessScore, templateContent)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeDuplicateContent');
    }
  }

  /**
   * 分析内容时效性
   */
  async analyzeContentFreshness(contentData, options) {
    try {
      const { textContent } = contentData;
      
      // 时间相关词汇检测
      const timeWords = {
        recent: ['最近', '近期', '最新', '新', '今天', '昨天', '这周', '本月', '今年', 'recent', 'new', 'latest', 'today', 'this week', 'this month'],
        dated: ['去年', '前年', '很久以前', '过去', '以前', 'last year', 'years ago', 'in the past', 'previously'],
        current: ['现在', '目前', '当前', '此刻', 'now', 'currently', 'at present', 'today']
      };

      const timeAnalysis = {
        recentWords: 0,
        datedWords: 0,
        currentWords: 0
      };

      const textLower = textContent.toLowerCase();
      
      Object.entries(timeWords).forEach(([category, words]) => {
        words.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          const matches = textLower.match(regex) || [];
          timeAnalysis[category + 'Words'] += matches.length;
        });
      });

      // 年份检测
      const currentYear = new Date().getFullYear();
      const yearPattern = /\b(19|20)\d{2}\b/g;
      const years = textContent.match(yearPattern) || [];
      const yearAnalysis = {
        yearsFound: years.length,
        latestYear: years.length > 0 ? Math.max(...years.map(y => parseInt(y))) : null,
        hasCurrentYear: years.includes(currentYear.toString()),
        outdatedYears: years.filter(year => parseInt(year) < currentYear - 2).length
      };

      // 计算时效性评分
      const freshnessScore = this.calculateFreshnessScore(timeAnalysis, yearAnalysis);

      return {
        timeWords: timeAnalysis,
        years: yearAnalysis,
        freshnessScore,
        grade: this.getFreshnessGrade(freshnessScore),
        isTimely: freshnessScore >= 70,
        needsUpdate: freshnessScore < 50,
        issues: this.identifyFreshnessIssues(freshnessScore, yearAnalysis)
      };
    } catch (error) {
      return this.handleError(error, 'analyzeContentFreshness');
    }
  }

  // 工具方法

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  countSentences(text) {
    if (!text) return 0;
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  getWords(text) {
    if (!text) return [];
    return text.toLowerCase().match(/\b\w+\b/g) || [];
  }

  getSentences(text) {
    if (!text) return [];
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  }

  filterStopWords(words, language) {
    const stopWordList = this.stopWords[language] || this.stopWords.en;
    return words.filter(word => !stopWordList.includes(word.toLowerCase()));
  }

  calculateWordFrequency(words) {
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }

    if (word.endsWith('e')) syllableCount--;
    return Math.max(1, syllableCount);
  }

  calculateAverageSyllables(words) {
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    return words.length > 0 ? totalSyllables / words.length : 0;
  }

  // 评分和等级方法

  calculateLengthScore(wordCount) {
    if (wordCount >= this.qualityThresholds.content.optimalWordCount) return 100;
    if (wordCount >= this.qualityThresholds.content.minWordCount) return 80;
    return Math.max(0, Math.round((wordCount / this.qualityThresholds.content.minWordCount) * 60));
  }

  calculateStructureScore(headings) {
    let score = 0;
    
    // 有H1标题
    if (headings.some(h => h.level === 1)) score += 30;
    
    // 有子标题
    if (headings.filter(h => h.level >= 2).length >= 2) score += 30;
    
    // 标题层次合理
    const hierarchy = this.analyzeHeadingHierarchy(headings);
    if (hierarchy.isLogical) score += 40;
    else score += 20;

    return Math.min(100, score);
  }

  calculateRichnessScore(imageCount, linkCount, wordCount) {
    let score = 50; // 基础分
    
    // 图片丰富度
    if (imageCount > 0) score += 20;
    if (imageCount >= 3) score += 10;
    
    // 链接丰富度
    if (linkCount > 0) score += 20;
    if (linkCount >= 5) score += 10;
    
    // 内容比例
    if (wordCount > 500) score += 10;

    return Math.min(100, score);
  }

  analyzeHeadingHierarchy(headings) {
    let isLogical = true;
    const gaps = [];
    let previousLevel = 0;

    for (const heading of headings) {
      if (heading.level > previousLevel + 1) {
        gaps.push({ from: previousLevel, to: heading.level });
        isLogical = false;
      }
      previousLevel = heading.level;
    }

    return {
      isLogical,
      gaps,
      flowScore: isLogical ? 100 : Math.max(0, 100 - gaps.length * 20)
    };
  }

  calculateOrganizationScore(headingAnalysis, paragraphAnalysis) {
    let score = 0;
    
    // 标题结构 (60%)
    if (headingAnalysis.hasH1) score += 20;
    if (headingAnalysis.h2Count >= 2) score += 20;
    if (headingAnalysis.hierarchy.isLogical) score += 20;
    
    // 段落结构 (40%)
    if (paragraphAnalysis.paragraphCount >= 3) score += 20;
    if (paragraphAnalysis.hasOptimalParagraphs) score += 20;
    
    return Math.min(100, score);
  }

  calculateFreshnessScore(timeAnalysis, yearAnalysis) {
    let score = 50; // 基础分
    
    // 时间词汇
    score += Math.min(30, timeAnalysis.recentWords * 5);
    score += Math.min(20, timeAnalysis.currentWords * 3);
    score -= Math.min(30, timeAnalysis.datedWords * 5);
    
    // 年份分析
    if (yearAnalysis.hasCurrentYear) score += 20;
    score -= yearAnalysis.outdatedYears * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  // 等级评定方法

  getQualityGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getReadingLevel(fleschScore) {
    if (fleschScore >= 90) return 'Very Easy';
    if (fleschScore >= 80) return 'Easy';
    if (fleschScore >= 70) return 'Fairly Easy';
    if (fleschScore >= 60) return 'Standard';
    if (fleschScore >= 50) return 'Fairly Difficult';
    if (fleschScore >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  getOrganizationGrade(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  getFreshnessGrade(score) {
    if (score >= 80) return 'Very Fresh';
    if (score >= 60) return 'Fresh';
    if (score >= 40) return 'Somewhat Dated';
    return 'Outdated';
  }

  // 问题识别方法

  identifyQualityIssues(lengthAssessment, structureAssessment, richnessAssessment) {
    const issues = [];

    if (!lengthAssessment.isAdequate) {
      issues.push({
        type: 'content-length',
        severity: 'high',
        message: `内容过短 (${lengthAssessment.wordCount}词)，建议至少${this.qualityThresholds.content.minWordCount}词`
      });
    }

    if (!structureAssessment.hasH1) {
      issues.push({
        type: 'heading-structure',
        severity: 'critical',
        message: '缺少H1标题'
      });
    }

    if (structureAssessment.hasMultipleH1) {
      issues.push({
        type: 'heading-structure',
        severity: 'high',
        message: '页面有多个H1标题'
      });
    }

    return issues;
  }

  identifyReadabilityIssues(fleschScore, avgSentenceLength, complexWordPercentage) {
    const issues = [];

    if (fleschScore < 30) {
      issues.push({
        type: 'readability',
        severity: 'high',
        message: `可读性较差 (Flesch评分: ${Math.round(fleschScore)})`
      });
    }

    if (avgSentenceLength > 25) {
      issues.push({
        type: 'sentence-length',
        severity: 'medium',
        message: `句子过长 (平均${avgSentenceLength}词/句)`
      });
    }

    if (complexWordPercentage > 20) {
      issues.push({
        type: 'vocabulary',
        severity: 'medium',
        message: `复杂词汇过多 (${complexWordPercentage}%)`
      });
    }

    return issues;
  }

  identifyKeywordIssues(maxDensity, targetKeywordAnalysis) {
    const issues = [];

    if (maxDensity > this.qualityThresholds.content.maxKeywordDensity) {
      issues.push({
        type: 'keyword-stuffing',
        severity: 'high',
        message: `关键词密度过高 (${maxDensity}%)，可能被视为关键词堆砌`
      });
    }

    targetKeywordAnalysis.forEach(keyword => {
      if (keyword.isOverOptimized) {
        issues.push({
          type: 'keyword-over-optimization',
          severity: 'medium',
          message: `关键词"${keyword.keyword}"过度优化 (${keyword.density}%)`
        });
      }
    });

    return issues;
  }

  identifyStructureIssues(headingAnalysis, paragraphAnalysis) {
    const issues = [];

    if (!headingAnalysis.hasH1) {
      issues.push({
        type: 'structure',
        severity: 'critical',
        message: '缺少H1标题'
      });
    }

    if (paragraphAnalysis.tooLongParagraphs) {
      issues.push({
        type: 'paragraph-length',
        severity: 'medium',
        message: `段落过长 (平均${paragraphAnalysis.avgWordsPerParagraph}词/段)`
      });
    }

    return issues;
  }

  identifyDuplicationIssues(uniquenessScore, templateContent) {
    const issues = [];

    if (uniquenessScore < 70) {
      issues.push({
        type: 'duplicate-content',
        severity: 'high',
        message: `内容重复度较高 (唯一性${uniquenessScore}%)`
      });
    }

    if (templateContent > 3) {
      issues.push({
        type: 'template-content',
        severity: 'medium',
        message: '检测到过多模板内容'
      });
    }

    return issues;
  }

  identifyFreshnessIssues(freshnessScore, yearAnalysis) {
    const issues = [];

    if (freshnessScore < 50) {
      issues.push({
        type: 'content-freshness',
        severity: 'medium',
        message: `内容时效性较差 (${freshnessScore}分)`
      });
    }

    if (yearAnalysis.outdatedYears > 0) {
      issues.push({
        type: 'outdated-information',
        severity: 'medium',
        message: `包含${yearAnalysis.outdatedYears}个过时年份信息`
      });
    }

    return issues;
  }

  // 综合分析方法

  calculateSummary(analyses) {
    let totalScore = 0;
    let scoreCount = 0;
    let totalIssues = 0;
    let criticalIssues = 0;
    let warnings = 0;


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
    Object.values(analyses).forEach(analysis => {
      if (analysis.overallScore !== undefined) {
        totalScore += analysis.overallScore;
        scoreCount++;
      }
      
      if (analysis.issues) {
        totalIssues += analysis.issues.length;
        criticalIssues += analysis.issues.filter(issue => issue.severity === 'critical').length;
        warnings += analysis.issues.filter(issue => issue.severity === 'medium').length;
      }
    });

    return {
      totalIssues,
      criticalIssues,
      warnings,
      suggestions: totalIssues - criticalIssues - warnings,
      overallScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
    };
  }

  generateRecommendations(analyses) {
    const recommendations = [];


      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
    Object.entries(analyses).forEach(([type, analysis]) => {
      if (analysis.issues) {
        analysis.issues.forEach(issue => {
          recommendations.push({
            category: type,
            type: issue.type,
            priority: issue.severity,
            message: issue.message,
            suggestion: this.getSuggestionForIssue(issue)
          });
        });
      }
    });

    // 按优先级排序
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  getSuggestionForIssue(issue) {
    const suggestions = {
      'content-length': '增加内容长度，提供更详细和有价值的信息',
      'heading-structure': '添加合适的H1标题，确保页面结构清晰',
      'readability': '简化句子结构，使用更常见的词汇',
      'keyword-stuffing': '减少关键词密度，确保内容自然流畅',
      'duplicate-content': '创建更多原创内容，避免重复表述',
      'content-freshness': '更新内容信息，添加最新数据和时间引用'
    };

    return suggestions[issue.type] || '请根据具体情况进行优化';
  }
}

export default ContentAnalysisService;
