/**
 * 内容分析服务
 * 统一内容分析逻辑，整合内容质量、可读性、关键词分析等功能
 */

import { ErrorCode, ErrorFactory, ErrorSeverity } from '../errors/ErrorTypes';
import BaseService, { ServiceConfig } from './BaseService';

// 内容分析配置接口
export interface ContentAnalysisConfig {
  language: 'en' | 'zh' | 'auto';
  includeReadability: boolean;
  includeKeywordAnalysis: boolean;
  includeQualityAssessment: boolean;
  includeSentimentAnalysis: boolean;
  customStopWords?: string[];
  qualityThresholds?: QualityThresholds;
}

// 质量阈值接口
export interface QualityThresholds {
  content: {
    minWordCount: number;
    optimalWordCount: number;
    maxKeywordDensity: number;
    optimalKeywordDensity: number;
  };
  readability: {
    minScore: number;
    maxSentenceLength: number;
    maxParagraphLength: number;
  };
  structure: {
    minHeadings: number;
    optimalHeadings: number;
    minLists: number;
    minImages: number;
  };
}

// 内容分析结果接口
export interface ContentAnalysisResult {
  url?: string;
  timestamp: Date;
  language: string;
  content: ContentMetrics;
  readability: ReadabilityMetrics;
  keywords: KeywordAnalysis;
  quality: QualityAssessment;
  structure: StructureAnalysis;
  sentiment?: SentimentAnalysis;
  recommendations: ContentRecommendation[];
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: number;
    improvements: number;
  };
}

// 内容指标接口
export interface ContentMetrics {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
  listCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  readingTime: number; // 分钟
}

// 可读性指标接口
export interface ReadabilityMetrics {
  score: number;
  grade: string;
  fleschKincaid: {
    readingEase: number;
    gradeLevel: number;
  };
  avgSentenceLength: number;
  avgWordLength: number;
  complexWords: number;
  simpleWords: number;
  issues: ReadabilityIssue[];
}

// 可读性问题接口
export interface ReadabilityIssue {
  type: 'long_sentence' | 'short_sentence' | 'complex_word' | 'passive_voice' | 'repetition';
  severity: 'low' | 'medium' | 'high';
  position: number;
  text: string;
  suggestion: string;
}

// 关键词分析接口
export interface KeywordAnalysis {
  primary: KeywordInfo[];
  secondary: KeywordInfo[];
  density: Record<string, number>;
  prominence: Record<string, number>;
  distribution: KeywordDistribution[];
  issues: KeywordIssue[];
}

// 关键词信息接口
export interface KeywordInfo {
  keyword: string;
  count: number;
  density: number;
  prominence: number;
  positions: number[];
  variations: string[];
}

// 关键词分布接口
export interface KeywordDistribution {
  section: string;
  keywords: string[];
  density: number;
}

// 关键词问题接口
export interface KeywordIssue {
  type: 'overuse' | 'underuse' | 'stuffing' | 'missing' | 'irrelevant';
  severity: 'low' | 'medium' | 'high';
  keyword: string;
  description: string;
  suggestion: string;
}

// 质量评估接口
export interface QualityAssessment {
  overall: number;
  content: number;
  readability: number;
  structure: number;
  seo: number;
  issues: QualityIssue[];
}

// 质量问题接口
export interface QualityIssue {
  category: 'content' | 'readability' | 'structure' | 'seo';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  impact: string;
}

// 结构分析接口
export interface StructureAnalysis {
  headings: HeadingStructure;
  paragraphs: ParagraphStructure;
  lists: ListStructure;
  images: ImageStructure;
  links: LinkStructure;
  issues: StructureIssue[];
}

// 标题结构接口
export interface HeadingStructure {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
  hierarchy: boolean;
  issues: string[];
}

// 段落结构接口
export interface ParagraphStructure {
  total: number;
  averageLength: number;
  maxLength: number;
  minLength: number;
  issues: string[];
}

// 列表结构接口
export interface ListStructure {
  ordered: number;
  unordered: number;
  total: number;
  averageItems: number;
  issues: string[];
}

// 图片结构接口
export interface ImageStructure {
  total: number;
  withAlt: number;
  withTitle: number;
  optimized: number;
  issues: string[];
}

// 链接结构接口
export interface LinkStructure {
  internal: number;
  external: number;
  total: number;
  withText: number;
  withTitle: number;
  issues: string[];
}

// 结构问题接口
export interface StructureIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

// 情感分析接口
export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  emotions: Record<string, number>;
  sentences: SentenceSentiment[];
}

// 句子情感接口
export interface SentenceSentiment {
  sentence: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  position: number;
}

// 内容建议接口
export interface ContentRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  examples: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

class ContentAnalysisService extends BaseService {
  private stopWords: Record<string, string[]>;
  private qualityThresholds: QualityThresholds;
  private defaultConfig: ContentAnalysisConfig;

  constructor(config?: Partial<ServiceConfig>) {
    const serviceConfig: ServiceConfig = {
      name: 'ContentAnalysisService',
      version: '1.0.0',
      timeout: 30000,
      retries: 2,
      dependencies: [],
      logging: {
        enabled: true,
        level: 'info',
      },
      metrics: {
        enabled: true,
        interval: 60000,
      },
      ...config,
    };

    super(serviceConfig);

    this.stopWords = {
      en: [
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'could',
        'should',
        'may',
        'might',
        'must',
        'can',
        'this',
        'that',
        'these',
        'those',
        'i',
        'you',
        'he',
        'she',
        'it',
        'we',
        'they',
        'me',
        'him',
        'her',
        'us',
        'them',
      ],
      zh: [
        '的',
        '是',
        '在',
        '有',
        '和',
        '与',
        '或',
        '但',
        '不',
        '也',
        '都',
        '很',
        '更',
        '最',
        '就',
        '会',
        '能',
        '要',
        '可以',
        '应该',
        '必须',
        '这',
        '那',
        '这个',
        '那个',
        '什么',
        '怎么',
        '为什么',
        '哪里',
        '哪个',
        '我',
        '你',
        '他',
        '她',
        '它',
        '我们',
        '你们',
        '他们',
        '她们',
        '它们',
      ],
    };

    this.qualityThresholds = {
      content: {
        minWordCount: 300,
        optimalWordCount: 1000,
        maxKeywordDensity: 3.0,
        optimalKeywordDensity: 1.5,
      },
      readability: {
        minScore: 60,
        maxSentenceLength: 25,
        maxParagraphLength: 150,
      },
      structure: {
        minHeadings: 2,
        optimalHeadings: 5,
        minLists: 1,
        minImages: 1,
      },
    };

    this.defaultConfig = {
      language: 'auto',
      includeReadability: true,
      includeKeywordAnalysis: true,
      includeQualityAssessment: true,
      includeSentimentAnalysis: false,
    };
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    this.log('info', 'ContentAnalysisService initialized successfully');
  }

  /**
   * 执行关闭
   */
  protected async performShutdown(): Promise<void> {
    this.log('info', 'ContentAnalysisService shutdown successfully');
  }

  /**
   * 分析内容
   */
  async analyzeContent(
    content: string,
    options: Partial<ContentAnalysisConfig> = {}
  ): Promise<ContentAnalysisResult> {
    if (!content || typeof content !== 'string') {
      throw ErrorFactory.createValidationError('Content is required and must be a string', [
        {
          field: 'content',
          value: content,
          constraint: 'non-empty string',
          message: 'Content must be a non-empty string',
        },
      ]);
    }

    const config = { ...this.defaultConfig, ...options };
    const timestamp = new Date();
    const startTime = Date.now();

    try {
      // 检测语言
      const language = this.detectLanguage(content, config.language);

      // 分析内容指标
      const contentMetrics = this.analyzeContentMetrics(content);

      // 分析可读性
      const readability = config.includeReadability
        ? this.analyzeReadability(content, language)
        : this.createEmptyReadabilityMetrics();

      // 分析关键词
      const keywords = config.includeKeywordAnalysis
        ? this.analyzeKeywords(content, language)
        : this.createEmptyKeywordAnalysis();

      // 评估质量
      const quality = config.includeQualityAssessment
        ? this.assessQuality(contentMetrics, readability, keywords)
        : this.createEmptyQualityAssessment();

      // 分析结构
      const structure = this.analyzeStructure(content);

      // 情感分析
      const sentiment = config.includeSentimentAnalysis
        ? this.analyzeSentiment(content)
        : undefined;

      // 生成建议
      const recommendations = this.generateRecommendations(
        contentMetrics,
        readability,
        keywords,
        quality,
        structure
      );

      // 计算总体分数
      const overall = this.calculateOverallScore(quality, readability, structure);

      const result: ContentAnalysisResult = {
        timestamp,
        language,
        content: contentMetrics,
        readability,
        keywords,
        quality,
        structure,
        sentiment,
        recommendations,
        overall,
      };

      const responseTime = Date.now() - startTime;
      this.recordRequest(true, responseTime);
      this.log('debug', 'Content analysis completed', {
        wordCount: contentMetrics.wordCount,
        score: overall.score,
        responseTime,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordRequest(false, responseTime);

      throw ErrorFactory.createSystemError(
        `Content analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          code: ErrorCode.PARSING_FAILED,
          severity: ErrorSeverity.MEDIUM,
          context: { contentLength: content.length },
        }
      );
    }
  }

  /**
   * 检测语言
   */
  private detectLanguage(content: string, configLanguage: string): string {
    if (configLanguage !== 'auto') {
      return configLanguage;
    }

    const chineseChars = content.match(/[\u4e00-\u9fff]/g) || [];
    const latinChars = content.match(/[a-zA-Z]/g) || [];
    const englishWords = content.match(/\b[a-zA-Z]+\b/g) || [];

    const totalLetters = chineseChars.length + latinChars.length;
    if (totalLetters === 0) {
      return englishWords.length > 0 ? 'en' : 'zh';
    }

    const chineseRatio = chineseChars.length / totalLetters;
    const englishRatio = latinChars.length / totalLetters;

    return chineseRatio >= englishRatio ? 'zh' : 'en';
  }

  /**
   * 分析内容指标
   */
  private analyzeContentMetrics(content: string): ContentMetrics {
    const words = this.extractWords(content);
    const sentences = this.extractSentences(content);
    const paragraphs = this.extractParagraphs(content);
    const headings = this.extractHeadings(content);
    const images = this.extractImages(content);
    const links = this.extractLinks(content);
    const lists = this.extractLists(content);

    const wordCount = words.length;
    const characterCount = content.length;
    const sentenceCount = sentences.length;
    const paragraphCount = paragraphs.length;
    const headingCount = headings.length;
    const imageCount = images.length;
    const linkCount = links.length;
    const listCount = lists.length;

    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const averageSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;
    const readingTime = Math.ceil(wordCount / 200); // 假设每分钟200词

    return {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      headingCount,
      imageCount,
      linkCount,
      listCount,
      averageWordsPerSentence,
      averageSentencesPerParagraph,
      readingTime,
    };
  }

  /**
   * 分析可读性
   */
  private analyzeReadability(content: string, language: string): ReadabilityMetrics {
    const sentences = this.extractSentences(content);
    const words = this.extractWords(content);

    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgWordLength =
      words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0;

    // Flesch-Kincaid计算
    const fleschReadingEase = this.calculateFleschReadingEase(
      avgSentenceLength,
      avgWordLength,
      language
    );
    const fleschGradeLevel = this.calculateFleschGradeLevel(
      avgSentenceLength,
      avgWordLength,
      language
    );

    const complexWords = words.filter(word => word.length > 6).length;
    const simpleWords = words.length - complexWords;

    const punctuationMatches = content.match(/[。！？!?.,;:，；：]/g) || [];
    const punctuationDensity = content.length > 0 ? punctuationMatches.length / content.length : 0;

    const issues = this.identifyReadabilityIssues(sentences, words, language);
    if (punctuationDensity < 0.01 && content.length > 120) {
      issues.push({
        type: 'repetition',
        severity: 'medium',
        position: 0,
        text: '标点密度偏低，句子结构可能过于单一',
        suggestion: '增加标点分隔，提升句子结构层次',
      });
    }

    const longSentenceRatio = sentences.length
      ? sentences.filter(sentence => sentence.trim().split(/\s+/).length > avgSentenceLength * 1.3)
          .length / sentences.length
      : 0;
    const penalty = Math.min(30, issues.length * 3 + longSentenceRatio * 20);
    const score = Math.max(0, Math.min(100, fleschReadingEase - penalty));
    const grade = this.getReadabilityGrade(score);

    return {
      score,
      grade,
      fleschKincaid: {
        readingEase: fleschReadingEase,
        gradeLevel: fleschGradeLevel,
      },
      avgSentenceLength,
      avgWordLength,
      complexWords,
      simpleWords,
      issues,
    };
  }

  /**
   * 分析关键词
   */
  private analyzeKeywords(content: string, language: string): KeywordAnalysis {
    const words = this.extractWords(content);
    const stopWords = this.stopWords[language] || [];

    // 过滤停用词
    const filteredWords = words.filter(word => !stopWords.includes(word.toLowerCase()));

    // 计算词频（包含双词组）
    const wordFreq: Record<string, number> = {};
    filteredWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      wordFreq[lowerWord] = (wordFreq[lowerWord] || 0) + 1;
    });

    for (let index = 0; index < filteredWords.length - 1; index += 1) {
      const first = filteredWords[index]?.toLowerCase();
      const second = filteredWords[index + 1]?.toLowerCase();
      if (first && second) {
        const bigram = `${first} ${second}`;
        wordFreq[bigram] = (wordFreq[bigram] || 0) + 1;
      }
    }

    // 排序并获取关键词
    const sortedKeywords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    const totalWords = filteredWords.length;
    const primary: KeywordInfo[] = [];
    const secondary: KeywordInfo[] = [];
    const density: Record<string, number> = {};
    const prominence: Record<string, number> = {};

    sortedKeywords.forEach(([keyword, count], index) => {
      const divisor = keyword.includes(' ') ? Math.max(totalWords - 1, 1) : Math.max(totalWords, 1);
      const keywordDensity = (count / divisor) * 100;
      density[keyword] = keywordDensity;

      // 计算显著性
      const keywordProminence = this.calculateProminence(content, keyword);
      prominence[keyword] = keywordProminence;

      const keywordInfo: KeywordInfo = {
        keyword,
        count,
        density: keywordDensity,
        prominence: keywordProminence,
        positions: this.findKeywordPositions(content, keyword),
        variations: this.findVariations(words, keyword),
      };

      if (index < 5) {
        primary.push(keywordInfo);
      } else {
        secondary.push(keywordInfo);
      }
    });

    const distribution = this.analyzeKeywordDistribution(
      content,
      primary.map(k => k.keyword)
    );
    const issues = this.identifyKeywordIssues(content, primary, secondary, density);

    return {
      primary,
      secondary,
      density,
      prominence,
      distribution,
      issues,
    };
  }

  /**
   * 评估质量
   */
  private assessQuality(
    content: ContentMetrics,
    readability: ReadabilityMetrics,
    keywords: KeywordAnalysis
  ): QualityAssessment {
    const thresholds = this.qualityThresholds;

    // 内容质量分数
    let contentScore = 0;
    if (content.wordCount >= thresholds.content.minWordCount) contentScore += 25;
    if (content.wordCount >= thresholds.content.optimalWordCount) contentScore += 25;
    if (content.readingTime >= 2) contentScore += 25;
    if (content.readingTime <= 10) contentScore += 25;

    // 可读性分数
    const readabilityScore = readability.score;

    // 结构分数
    let structureScore = 0;
    if (content.headingCount >= thresholds.structure.minHeadings) structureScore += 25;
    if (content.headingCount <= thresholds.structure.optimalHeadings) structureScore += 25;
    if (content.listCount >= thresholds.structure.minLists) structureScore += 25;
    if (content.imageCount >= thresholds.structure.minImages) structureScore += 25;

    // SEO分数
    let seoScore = 0;
    const primaryKeywordDensity = keywords.primary[0]?.density || 0;
    if (primaryKeywordDensity <= thresholds.content.maxKeywordDensity) seoScore += 25;
    if (primaryKeywordDensity >= thresholds.content.optimalKeywordDensity * 0.5) seoScore += 25;
    if (keywords.primary.length >= 3) seoScore += 25;
    if (keywords.secondary.length >= 5) seoScore += 25;

    const overall = (contentScore + readabilityScore + structureScore + seoScore) / 4;

    const issues = this.identifyQualityIssues(content, readability, keywords);

    return {
      overall,
      content: contentScore,
      readability: readabilityScore,
      structure: structureScore,
      seo: seoScore,
      issues,
    };
  }

  /**
   * 分析结构
   */
  private analyzeStructure(content: string): StructureAnalysis {
    const headings = this.analyzeHeadingStructure(content);
    const paragraphs = this.analyzeParagraphStructure(content);
    const lists = this.analyzeListStructure(content);
    const images = this.analyzeImageStructure(content);
    const links = this.analyzeLinkStructure(content);

    const issues = this.identifyStructureIssues(headings, paragraphs, lists, images, links);

    return {
      headings,
      paragraphs,
      lists,
      images,
      links,
      issues,
    };
  }

  /**
   * 分析情感
   */
  private analyzeSentiment(content: string): SentimentAnalysis {
    const sentences = this.extractSentences(content);
    const sentenceSentiments: SentenceSentiment[] = [];

    let totalScore = 0;
    const emotions: Record<string, number> = {};

    sentences.forEach((sentence, index) => {
      const sentiment = this.analyzeSentenceSentiment(sentence);
      sentenceSentiments.push({
        sentence,
        sentiment: sentiment.overall,
        score: sentiment.score,
        position: index,
      });

      totalScore += sentiment.score;

      // 累积情感
      emotions[sentiment.overall] = (emotions[sentiment.overall] || 0) + 1;
    });

    const avgScore = sentences.length > 0 ? totalScore / sentences.length : 0;
    const overall = avgScore > 0.1 ? 'positive' : avgScore < -0.1 ? 'negative' : 'neutral';
    const confidence = Math.abs(avgScore);

    return {
      overall,
      score: avgScore,
      confidence,
      emotions,
      sentences: sentenceSentiments,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    content: ContentMetrics,
    readability: ReadabilityMetrics,
    keywords: KeywordAnalysis,
    _quality: QualityAssessment,
    _structure: StructureAnalysis
  ): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = [];

    // 内容建议
    if (content.wordCount < this.qualityThresholds.content.minWordCount) {
      recommendations.push({
        priority: 'high',
        category: 'content',
        title: '增加内容长度',
        description: `当前内容${content.wordCount}词，建议增加到${this.qualityThresholds.content.minWordCount}词以上`,
        examples: ['添加更详细的解释和说明', '增加实例和案例分析', '扩展相关背景信息'],
        impact: '提高内容价值和SEO效果',
        effort: 'medium',
      });
    }

    // 可读性建议
    if (readability.score < this.qualityThresholds.readability.minScore) {
      recommendations.push({
        priority: 'medium',
        category: 'readability',
        title: '改善可读性',
        description: `当前可读性分数${readability.score}，建议提高到${this.qualityThresholds.readability.minScore}以上`,
        examples: ['拆分长句子', '使用更简单的词汇', '增加段落间距'],
        impact: '提高用户体验和阅读完成率',
        effort: 'low',
      });
    }

    // 关键词建议
    const primaryDensity = keywords.primary[0]?.density || 0;
    if (primaryDensity > this.qualityThresholds.content.maxKeywordDensity) {
      recommendations.push({
        priority: 'high',
        category: 'seo',
        title: '降低关键词密度',
        description: `主关键词密度${primaryDensity.toFixed(2)}%超过建议值${this.qualityThresholds.content.maxKeywordDensity}%`,
        examples: ['使用同义词替换', '增加相关词汇', '自然地融入关键词'],
        impact: '避免关键词堆砌，提高SEO效果',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    quality: QualityAssessment,
    readability: ReadabilityMetrics,
    structure: StructureAnalysis
  ): ContentAnalysisResult['overall'] {
    const score = (quality.overall + readability.score + (100 - structure.issues.length * 5)) / 3;
    const grade = this.getGrade(score);
    const issues = quality.issues.length + readability.issues.length + structure.issues.length;
    const improvements = Math.max(0, 10 - Math.floor(score / 10));

    return {
      score: Math.round(score),
      grade,
      issues,
      improvements,
    };
  }

  // 辅助方法
  private extractWords(content: string): string[] {
    return content.match(/\b[\w\u4e00-\u9fff]+\b/g) || [];
  }

  private extractSentences(content: string): string[] {
    return content.match(/[^.!?]+[.!?]+/g) || [];
  }

  private extractParagraphs(content: string): string[] {
    return content.split(/\n\n+/).filter(p => p.trim().length > 0);
  }

  private extractHeadings(content: string): string[] {
    return content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
  }

  private extractImages(content: string): string[] {
    return content.match(/<img[^>]*>/gi) || [];
  }

  private extractLinks(content: string): string[] {
    return content.match(/<a[^>]*>.*?<\/a>/gi) || [];
  }

  private extractLists(content: string): string[] {
    return content.match(/<[ou]l[^>]*>.*?<\/[ou]l>/gi) || [];
  }

  private calculateFleschReadingEase(
    avgSentenceLength: number,
    avgWordLength: number,
    language: string
  ): number {
    if (language === 'zh') {
      const sentencePenalty = avgSentenceLength * 1.5;
      const wordPenalty = avgWordLength * 0.8;
      return Math.max(0, 120 - sentencePenalty - wordPenalty);
    } else {
      // 英文Flesch Reading Ease
      return 206.835 - 1.015 * avgSentenceLength - 84.6 * (avgWordLength / 100);
    }
  }

  private calculateFleschGradeLevel(
    avgSentenceLength: number,
    avgWordLength: number,
    language: string
  ): number {
    if (language === 'zh') {
      return avgSentenceLength / 10 + avgWordLength / 5;
    } else {
      return 0.39 * avgSentenceLength + 11.8 * (avgWordLength / 100) - 15.59;
    }
  }

  private getReadabilityGrade(score: number): string {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateProminence(content: string, keyword: string): number {
    const positions = this.findKeywordPositions(content, keyword);
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const titleMatch = lowerContent.includes(`<title>`) && lowerContent.includes(lowerKeyword);
    const headingMatch = content.match(new RegExp(`<h[1-6][^>]*>.*${keyword}.*</h[1-6]>`, 'i'));
    const earlyMatch = positions.some(position => position < 200);

    const totalWords = this.extractWords(content).length || 1;
    const density = (positions.length / totalWords) * 100;

    let prominence = 0;
    if (titleMatch) prominence += 35;
    if (headingMatch) prominence += 25;
    if (earlyMatch) prominence += 20;
    prominence += Math.min(20, positions.length * 3);
    prominence += Math.min(20, density * 4);

    return Math.min(100, Math.round(prominence));
  }

  private findKeywordPositions(content: string, keyword: string): number[] {
    const positions: number[] = [];
    const regex = new RegExp(keyword, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
      positions.push(match.index);
    }

    return positions;
  }

  private findVariations(words: string[], keyword: string): string[] {
    const variations: string[] = [];
    const lowerKeyword = keyword.toLowerCase();

    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      if (lowerWord !== lowerKeyword && lowerWord.includes(lowerKeyword)) {
        if (!variations.includes(lowerWord)) {
          variations.push(lowerWord);
        }
      }
    });

    return variations;
  }

  private analyzeKeywordDistribution(content: string, keywords: string[]): KeywordDistribution[] {
    const sections = ['introduction', 'body', 'conclusion'];
    const chunkSize = Math.ceil(content.length / sections.length);

    return sections.map((section, index) => {
      const slice = content.slice(index * chunkSize, (index + 1) * chunkSize);
      const words = this.extractWords(slice);
      const totalWords = words.length || 1;
      const keywordMatches = keywords.filter(keyword =>
        slice.toLowerCase().includes(keyword.toLowerCase())
      );
      const keywordCount = keywordMatches.reduce((sum, keyword) => {
        return sum + this.findKeywordPositions(slice, keyword).length;
      }, 0);

      return {
        section,
        keywords: keywordMatches,
        density: Number(((keywordCount / totalWords) * 100).toFixed(2)),
      };
    });
  }

  // 创建空结果的方法
  private createEmptyReadabilityMetrics(): ReadabilityMetrics {
    return {
      score: 0,
      grade: 'Unknown',
      fleschKincaid: { readingEase: 0, gradeLevel: 0 },
      avgSentenceLength: 0,
      avgWordLength: 0,
      complexWords: 0,
      simpleWords: 0,
      issues: [],
    };
  }

  private createEmptyKeywordAnalysis(): KeywordAnalysis {
    return {
      primary: [],
      secondary: [],
      density: {},
      prominence: {},
      distribution: [],
      issues: [],
    };
  }

  private createEmptyQualityAssessment(): QualityAssessment {
    return {
      overall: 0,
      content: 0,
      readability: 0,
      structure: 0,
      seo: 0,
      issues: [],
    };
  }

  // 可读性问题识别
  private identifyReadabilityIssues(
    sentences: string[],
    words: string[],
    language: string
  ): ReadabilityIssue[] {
    const issues: ReadabilityIssue[] = [];
    const maxSentenceLength = this.qualityThresholds.readability.maxSentenceLength;
    const minSentenceLength = language === 'zh' ? 6 : 5;
    const stopWords = this.stopWords[language] || [];
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > maxSentenceLength) {
        issues.push({
          type: 'long_sentence',
          severity: wordCount > maxSentenceLength * 1.5 ? 'high' : 'medium',
          position: index,
          text: sentence.slice(0, 120),
          suggestion: '拆分长句并减少从句数量',
        });
      }
      if (wordCount > 0 && wordCount < minSentenceLength) {
        issues.push({
          type: 'short_sentence',
          severity: 'low',
          position: index,
          text: sentence.slice(0, 120),
          suggestion: '适当合并短句增强语义完整度',
        });
      }
    });

    const wordLengths = words.map(word => word.length);
    const avgWordLength = wordLengths.length
      ? wordLengths.reduce((sum, len) => sum + len, 0) / wordLengths.length
      : 0;
    const complexWords = words.filter(word => word.length > 6).length;
    const complexRatio = words.length > 0 ? complexWords / words.length : 0;
    if (avgWordLength > 6 && language === 'en') {
      issues.push({
        type: 'complex_word',
        severity: 'medium',
        position: 0,
        text: '复杂词汇比例偏高',
        suggestion: '使用更简单的词汇替换长词',
      });
    }
    if (complexRatio > 0.2) {
      issues.push({
        type: 'complex_word',
        severity: 'high',
        position: 0,
        text: '复杂词汇占比过高',
        suggestion: '减少复杂词汇，提升阅读流畅度',
      });
    }

    const filteredWords = words
      .map(word => word.toLowerCase())
      .filter(word => word && !stopWords.includes(word));
    const wordFrequency: Record<string, number> = {};
    filteredWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    const repeated = Object.entries(wordFrequency).find(
      ([, count]) => filteredWords.length > 0 && count / filteredWords.length > 0.08 && count > 5
    );
    if (repeated) {
      issues.push({
        type: 'repetition',
        severity: 'medium',
        position: 0,
        text: `高频重复词: ${repeated[0]}`,
        suggestion: '使用同义词或变换表达，降低重复度',
      });
    }

    const passiveMatches = sentences.filter(sentence =>
      language === 'zh'
        ? /\b被\b/.test(sentence)
        : /\b(was|were|is|are|be|been|being)\b.*\bby\b/i.test(sentence)
    );
    if (passiveMatches.length > 0) {
      issues.push({
        type: 'passive_voice',
        severity: passiveMatches.length > 3 ? 'medium' : 'low',
        position: 0,
        text: '被动语态使用频率偏高',
        suggestion: '将被动句改为主动语态',
      });
    }

    return issues;
  }

  private identifyKeywordIssues(
    content: string,
    primary: KeywordInfo[],
    secondary: KeywordInfo[],
    density: Record<string, number>
  ): KeywordIssue[] {
    const issues: KeywordIssue[] = [];
    const maxDensity = this.qualityThresholds.content.maxKeywordDensity;
    const optimalDensity = this.qualityThresholds.content.optimalKeywordDensity;
    const contentLength = content.length || 1;

    if (primary.length === 0) {
      issues.push({
        type: 'missing',
        severity: 'high',
        keyword: '主关键词',
        description: '未检测到主关键词',
        suggestion: '在标题与正文中加入明确的主关键词',
      });
    }

    primary.forEach(keyword => {
      const keywordDensity = density[keyword.keyword] || keyword.density;
      const firstPosition = keyword.positions.length > 0 ? Math.min(...keyword.positions) : null;
      if (keywordDensity > maxDensity) {
        issues.push({
          type: 'stuffing',
          severity: 'high',
          keyword: keyword.keyword,
          description: `关键词密度${keywordDensity.toFixed(2)}%过高`,
          suggestion: '降低关键词频次，使用同义词替换',
        });
      } else if (keywordDensity < optimalDensity) {
        issues.push({
          type: 'underuse',
          severity: 'medium',
          keyword: keyword.keyword,
          description: `关键词密度${keywordDensity.toFixed(2)}%偏低`,
          suggestion: '在正文和小标题中适度增加关键词',
        });
      }
      if (firstPosition !== null && firstPosition > contentLength * 0.3) {
        issues.push({
          type: 'missing',
          severity: 'medium',
          keyword: keyword.keyword,
          description: '关键词未出现在内容前段',
          suggestion: '在开头段落中加入主关键词',
        });
      }
      if (keyword.positions.length < 2) {
        issues.push({
          type: 'underuse',
          severity: 'low',
          keyword: keyword.keyword,
          description: '关键词出现频次过低',
          suggestion: '适当增加关键词出现次数',
        });
      }
    });

    secondary.forEach(keyword => {
      if ((density[keyword.keyword] || 0) > maxDensity) {
        issues.push({
          type: 'overuse',
          severity: 'low',
          keyword: keyword.keyword,
          description: '次级关键词密度偏高',
          suggestion: '减少次级关键词重复',
        });
      }
    });

    return issues;
  }

  private identifyQualityIssues(
    content: ContentMetrics,
    readability: ReadabilityMetrics,
    keywords: KeywordAnalysis
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const thresholds = this.qualityThresholds;

    if (content.wordCount < thresholds.content.minWordCount) {
      issues.push({
        category: 'content',
        severity: 'high',
        description: '内容长度不足',
        suggestion: '补充更多背景、案例与细节内容',
        impact: '内容价值不足影响排名',
      });
    }

    if (readability.score < thresholds.readability.minScore) {
      issues.push({
        category: 'readability',
        severity: 'medium',
        description: '可读性评分偏低',
        suggestion: '拆分长句并增加段落间距',
        impact: '降低用户阅读体验',
      });
    }

    if (content.headingCount < thresholds.structure.minHeadings) {
      issues.push({
        category: 'structure',
        severity: 'medium',
        description: '标题层级不足',
        suggestion: '增加h2/h3标题以组织结构',
        impact: '结构不清影响SEO理解',
      });
    }

    if (keywords.primary.length === 0) {
      issues.push({
        category: 'seo',
        severity: 'high',
        description: '主关键词缺失',
        suggestion: '明确页面主题并添加核心关键词',
        impact: '关键词信号不足影响排名',
      });
    }

    return issues;
  }

  private analyzeHeadingStructure(content: string): HeadingStructure {
    const headings = this.extractHeadings(content);
    const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    headings.forEach(heading => {
      const match = heading.match(/<h([1-6])/i);
      if (match) {
        const level = `h${match[1]}` as keyof typeof counts;
        counts[level] += 1;
      }
    });

    const issues: string[] = [];
    if (counts.h1 === 0) issues.push('缺少H1标题');
    if (counts.h1 > 1) issues.push('H1标题数量过多');
    if (counts.h2 === 0) issues.push('缺少H2层级标题');

    const hierarchy = !(counts.h3 > 0 && counts.h2 === 0);
    if (!hierarchy) issues.push('标题层级不连续，缺少H2');

    return {
      ...counts,
      hierarchy,
      issues,
    };
  }

  private analyzeParagraphStructure(content: string): ParagraphStructure {
    const paragraphs = this.extractParagraphs(content);
    const lengths = paragraphs.map(p => p.length);

    return {
      total: paragraphs.length,
      averageLength:
        lengths.length > 0 ? lengths.reduce((sum, len) => sum + len, 0) / lengths.length : 0,
      maxLength: lengths.length > 0 ? Math.max(...lengths) : 0,
      minLength: lengths.length > 0 ? Math.min(...lengths) : 0,
      issues: [],
    };
  }

  private analyzeListStructure(content: string): ListStructure {
    const orderedMatches = content.match(/<ol[^>]*>/gi) || [];
    const unorderedMatches = content.match(/<ul[^>]*>/gi) || [];
    const listItems = content.match(/<li[^>]*>/gi) || [];
    const totalLists = orderedMatches.length + unorderedMatches.length;
    const averageItems = totalLists > 0 ? listItems.length / totalLists : 0;
    const issues: string[] = [];
    if (totalLists === 0) issues.push('未检测到列表结构');

    return {
      ordered: orderedMatches.length,
      unordered: unorderedMatches.length,
      total: totalLists,
      averageItems,
      issues,
    };
  }

  private analyzeImageStructure(content: string): ImageStructure {
    const images = this.extractImages(content);
    const withAlt = images.filter(img => /alt=/.test(img)).length;
    const withTitle = images.filter(img => /title=/.test(img)).length;
    const optimized = images.filter(img => /(\.webp|\.avif|\.svg)/i.test(img)).length;
    const issues: string[] = [];
    if (images.length > 0 && withAlt < images.length) issues.push('部分图片缺少alt');
    if (images.length > 0 && optimized === 0) issues.push('图片未使用优化格式');

    return {
      total: images.length,
      withAlt,
      withTitle,
      optimized,
      issues,
    };
  }

  private analyzeLinkStructure(content: string): LinkStructure {
    const links = this.extractLinks(content);
    const internal = links.filter(link => /href=["']\//i.test(link)).length;
    const external = links.filter(link => /href=["']https?:\/\//i.test(link)).length;
    const withText = links.filter(link => !/>\s*<\/a>/.test(link)).length;
    const withTitle = links.filter(link => /title=/.test(link)).length;
    const issues: string[] = [];
    if (links.length > 0 && withText < links.length) issues.push('存在空文本链接');
    if (links.length > 0 && withTitle === 0) issues.push('链接缺少title说明');

    return {
      internal,
      external,
      total: links.length,
      withText,
      withTitle,
      issues,
    };
  }

  private identifyStructureIssues(
    headings: HeadingStructure,
    paragraphs: ParagraphStructure,
    lists: ListStructure,
    images: ImageStructure,
    links: LinkStructure
  ): StructureIssue[] {
    const issues: StructureIssue[] = [];

    if (headings.h1 === 0) {
      issues.push({
        type: 'missing-h1',
        severity: 'high',
        description: '缺少H1标题',
        suggestion: '添加一个清晰的H1标题',
      });
    }

    if (paragraphs.maxLength > this.qualityThresholds.readability.maxParagraphLength) {
      issues.push({
        type: 'long-paragraph',
        severity: 'medium',
        description: '存在过长段落',
        suggestion: '拆分段落提升可读性',
      });
    }

    if (lists.total < this.qualityThresholds.structure.minLists) {
      issues.push({
        type: 'missing-list',
        severity: 'low',
        description: '缺少列表结构',
        suggestion: '使用列表组织关键点',
      });
    }

    if (images.total < this.qualityThresholds.structure.minImages) {
      issues.push({
        type: 'missing-image',
        severity: 'low',
        description: '缺少图片内容',
        suggestion: '补充图片或示意图提升信息密度',
      });
    }

    if (links.total === 0) {
      issues.push({
        type: 'missing-links',
        severity: 'medium',
        description: '缺少链接结构',
        suggestion: '增加内部或外部参考链接',
      });
    }

    return issues;
  }

  private analyzeSentenceSentiment(sentence: string): {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  } {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'positive',
      'improve',
      'success',
      '优质',
      '优秀',
      '满意',
      '提升',
      '成功',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'horrible',
      'disgusting',
      'disappointing',
      'negative',
      'fail',
      'problem',
      '差',
      '糟糕',
      '失败',
      '问题',
      '不足',
    ];

    const lowerSentence = sentence.toLowerCase();
    const negations = ['not', 'never', 'no', '无', '不', '没有', '未', '难以'];
    const intensifiers = ['very', 'extremely', 'highly', '特别', '非常', '很', '太', '极其'];

    const positiveCount = positiveWords.filter(word => lowerSentence.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerSentence.includes(word)).length;
    const intensity = intensifiers.filter(word => lowerSentence.includes(word)).length;
    const weight = 1 + Math.min(3, intensity) * 0.2;
    let score = (positiveCount - negativeCount) * 0.2 * weight;

    if (negations.some(word => lowerSentence.includes(word))) {
      score = -score;
    }

    score = Math.max(-1, Math.min(1, score));

    return {
      overall: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      score,
    };
  }
}

export default ContentAnalysisService;
