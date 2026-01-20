/**
 * 内容质量分析器
 * 本地化程度：100%
 * 高级内容质量分析，包括语义分析、内容深度、用户意图匹配等
 */

import puppeteer, { Page } from 'puppeteer';

interface ContentHeading {
  level: number;
  text: string;
  position: number;
}

interface ContentList {
  type: string;
  itemCount: number;
  position: number;
}

interface ContentImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
}

interface ContentLink {
  href: string;
  text: string;
  title: string;
  position: number;
}

interface ContentData {
  title: string;
  content: string;
  headings: ContentHeading[];
  paragraphs: string[];
  lists: ContentList[];
  images: ContentImage[];
  links: ContentLink[];
  questions: string[];
  examples: string[];
}

interface QualityMetrics {
  depth: {
    shallow: number;
    moderate: number;
    deep: number;
  };
  engagement: {
    minQuestions: number;
    minLists: number;
    minSubheadings: number;
  };
  expertise: {
    minTechnicalTerms: number;
    minExamples: number;
    minReferences: number;
  };
  readability: {
    maxSentenceLength: number;
    maxParagraphLength: number;
    minFleschScore: number;
  };
}

interface ContentQualityResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    depth: 'shallow' | 'moderate' | 'deep';
  };
  metrics: {
    depth: DepthAnalysis;
    engagement: EngagementAnalysis;
    expertise: ExpertiseAnalysis;
    readability: ReadabilityAnalysis;
    uniqueness: UniquenessAnalysis;
  };
  semantic: SemanticAnalysis;
  intent: IntentAnalysis;
  recommendations: QualityRecommendation[];
}

interface DepthAnalysis {
  wordCount: number;
  depth: 'shallow' | 'moderate' | 'deep';
  topics: TopicAnalysis[];
  coverage: number;
  issues: string[];
  score: number;
}

interface TopicAnalysis {
  topic: string;
  coverage: number;
  relevance: number;
  subtopics: string[];
}

interface EngagementAnalysis {
  questions: number;
  lists: number;
  subheadings: number;
  images: number;
  videos: number;
  interactive: number;
  issues: string[];
  score: number;
}

interface ExpertiseAnalysis {
  technicalTerms: number;
  examples: number;
  references: number;
  citations: number;
  dataPoints: number;
  issues: string[];
  score: number;
}

interface ReadabilityAnalysis {
  fleschScore: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
  complexity: 'simple' | 'moderate' | 'complex';
  issues: string[];
  score: number;
}

interface UniquenessAnalysis {
  uniquenessScore: number;
  duplicateContent: string[];
  originality: number;
  issues: string[];
  score: number;
}

interface SemanticAnalysis {
  entities: SemanticEntity[];
  concepts: SemanticConcept[];
  relationships: SemanticRelationship[];
  coherence: number;
  issues: string[];
  score: number;
}

interface SemanticEntity {
  text: string;
  type: string;
  confidence: number;
  position: number;
}

interface SemanticConcept {
  concept: string;
  weight: number;
  context: string[];
}

interface SemanticRelationship {
  entity1: string;
  entity2: string;
  relationship: string;
  confidence: number;
}

interface IntentAnalysis {
  primaryIntent: string;
  intentConfidence: number;
  userNeeds: string[];
  contentAlignment: number;
  gaps: string[];
  issues: string[];
  score: number;
}

interface QualityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  examples: CodeExample[];
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

class ContentQualityAnalyzer {
  private stopWords: Set<string>;
  private qualityMetrics: QualityMetrics;

  constructor() {
    this.stopWords = new Set([
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
      'being',
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
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'mine',
      'yours',
      'hers',
      'ours',
      'theirs',
    ]);

    this.qualityMetrics = {
      depth: {
        shallow: 300,
        moderate: 800,
        deep: 1500,
      },
      engagement: {
        minQuestions: 1,
        minLists: 1,
        minSubheadings: 3,
      },
      expertise: {
        minTechnicalTerms: 5,
        minExamples: 2,
        minReferences: 1,
      },
      readability: {
        maxSentenceLength: 25,
        maxParagraphLength: 150,
        minFleschScore: 30,
      },
    };
  }

  /**
   * 执行内容质量分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      intent?: string;
      keywords?: string[];
    } = {}
  ): Promise<ContentQualityResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      intent = '',
      keywords = [],
    } = options;

    const timestamp = new Date();

    let browser;
    let page;

    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewport(viewport);

      // 设置用户代理
      const userAgent =
        device === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await page.setUserAgent(userAgent);

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 提取内容数据
      const contentData = await this.extractContentData(page);

      // 分析内容深度
      const depth = this.analyzeDepth(contentData);

      // 分析用户参与度
      const engagement = this.analyzeEngagement(contentData);

      // 分析专业性
      const expertise = this.analyzeExpertise(contentData);

      // 分析可读性
      const readability = this.analyzeReadability(contentData);

      // 分析独特性
      const uniqueness = this.analyzeUniqueness(contentData);

      // 语义分析
      const semantic = this.analyzeSemantic(contentData);

      // 意图分析
      const intentAnalysis = this.analyzeIntent(contentData, intent, keywords);

      // 计算总体分数
      const overall = this.calculateOverallScore(
        depth,
        engagement,
        expertise,
        readability,
        uniqueness,
        semantic,
        intentAnalysis
      );

      // 生成建议
      const recommendations = this.generateRecommendations(
        depth,
        engagement,
        expertise,
        readability,
        uniqueness,
        semantic,
        intentAnalysis
      );

      return {
        url,
        timestamp,
        overall,
        metrics: {
          depth,
          engagement,
          expertise,
          readability,
          uniqueness,
        },
        semantic,
        intent: intentAnalysis,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `内容质量分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 提取内容数据
   */
  private async extractContentData(page: Page): Promise<ContentData> {
    return await page.evaluate(() => {
      const title = document.title || '';
      const content = (document.body as HTMLElement)?.textContent || '';

      // 提取标题
      const headings: ContentHeading[] = [];
      for (let i = 1; i <= 6; i++) {
        const elements = document.querySelectorAll(`h${i}`);
        elements.forEach((element, index) => {
          headings.push({
            level: i,
            text: (element as HTMLElement).textContent || '',
            position: index,
          });
        });
      }

      // 提取段落
      const paragraphs: string[] = [];
      document.querySelectorAll('p').forEach(p => {
        const text = (p as HTMLElement).textContent || '';
        if (text.trim().length > 0) {
          paragraphs.push(text.trim());
        }
      });

      // 提取列表
      const lists: ContentList[] = [];
      document.querySelectorAll('ol, ul').forEach((list, index) => {
        const items = list.querySelectorAll('li');
        lists.push({
          type: list.tagName.toLowerCase(),
          itemCount: items.length,
          position: index,
        });
      });

      // 提取图片
      const images: ContentImage[] = [];
      document.querySelectorAll('img').forEach((img, index) => {
        images.push({
          src: (img as HTMLImageElement).src || '',
          alt: (img as HTMLImageElement).alt || '',
          width: (img as HTMLImageElement).naturalWidth || 0,
          height: (img as HTMLImageElement).naturalHeight || 0,
          position: index,
        });
      });

      // 提取链接
      const links: ContentLink[] = [];
      document.querySelectorAll('a[href]').forEach((link, index) => {
        links.push({
          href: (link as HTMLAnchorElement).href || '',
          text: (link as HTMLElement).textContent || '',
          title: (link as HTMLElement).title || '',
          position: index,
        });
      });

      // 提取问题
      const questions: string[] = [];
      content.split(/[.!?]+/).forEach(sentence => {
        if (
          sentence.trim().includes('?') ||
          sentence.trim().includes('什么') ||
          sentence.trim().includes('如何') ||
          sentence.trim().includes('为什么')
        ) {
          questions.push(sentence.trim());
        }
      });

      // 提取示例
      const examples: string[] = [];
      document.querySelectorAll('code, pre, blockquote').forEach(element => {
        const text = (element as HTMLElement).textContent || '';
        if (text.trim().length > 10) {
          examples.push(text.trim());
        }
      });

      return {
        title,
        content,
        headings,
        paragraphs,
        lists,
        images,
        links,
        questions,
        examples,
      };
    });
  }

  /**
   * 分析内容深度
   */
  private analyzeDepth(contentData: ContentData): DepthAnalysis {
    const wordCount = this.countWords(contentData.content);

    let depth: 'shallow' | 'moderate' | 'deep';
    if (wordCount < this.qualityMetrics.depth.shallow) {
      depth = 'shallow';
    } else if (wordCount < this.qualityMetrics.depth.moderate) {
      depth = 'moderate';
    } else {
      depth = 'deep';
    }

    // 分析主题覆盖
    const topics = this.analyzeTopics(contentData.content);
    const coverage = this.calculateCoverage(topics);

    const issues: string[] = [];
    let score = 100;

    if (wordCount < this.qualityMetrics.depth.shallow) {
      issues.push(`内容过浅，字数仅${wordCount}字`);
      score -= 40;
    } else if (wordCount < this.qualityMetrics.depth.moderate) {
      issues.push(`内容深度中等，建议增加到${this.qualityMetrics.depth.moderate}字以上`);
      score -= 20;
    }

    if (topics.length < 3) {
      issues.push(`主题覆盖不足，仅涉及${topics.length}个主题`);
      score -= 15;
    }

    if (coverage < 0.6) {
      issues.push('主题覆盖不全面');
      score -= 10;
    }

    return {
      wordCount,
      depth,
      topics,
      coverage,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析用户参与度
   */
  private analyzeEngagement(contentData: ContentData): EngagementAnalysis {
    const questions = contentData.questions.length;
    const lists = contentData.lists.length;
    const subheadings = contentData.headings.filter(heading => heading.level >= 2).length;
    const images = contentData.images.length;
    const videos = 0; // 需要更复杂的检测
    const interactive = 0; // 需要检测交互元素

    const issues: string[] = [];
    let score = 100;

    if (questions < this.qualityMetrics.engagement.minQuestions) {
      issues.push('缺少问题引导用户思考');
      score -= 15;
    }

    if (lists < this.qualityMetrics.engagement.minLists) {
      issues.push('缺少列表提高可读性');
      score -= 10;
    }

    if (subheadings < this.qualityMetrics.engagement.minSubheadings) {
      issues.push('子标题不足，影响内容结构');
      score -= 20;
    }

    if (images === 0) {
      issues.push('缺少图片增强视觉效果');
      score -= 10;
    }

    return {
      questions,
      lists,
      subheadings,
      images,
      videos,
      interactive,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析专业性
   */
  private analyzeExpertise(contentData: ContentData): ExpertiseAnalysis {
    const technicalTerms = this.countTechnicalTerms(contentData.content);
    const examples = contentData.examples.length;
    const references = this.countReferences(contentData.content);
    const citations = this.countCitations(contentData.content);
    const dataPoints = this.countDataPoints(contentData.content);

    const issues: string[] = [];
    let score = 100;

    if (technicalTerms < this.qualityMetrics.expertise.minTechnicalTerms) {
      issues.push('专业术语不足，缺乏专业性');
      score -= 20;
    }

    if (examples < this.qualityMetrics.expertise.minExamples) {
      issues.push('缺少实例说明');
      score -= 15;
    }

    if (references < this.qualityMetrics.expertise.minReferences) {
      issues.push('缺少参考资料');
      score -= 10;
    }

    return {
      technicalTerms,
      examples,
      references,
      citations,
      dataPoints,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析可读性
   */
  private analyzeReadability(contentData: ContentData): ReadabilityAnalysis {
    const sentences = contentData.content
      .split(/[.!?]+/)
      .filter((s: string) => s.trim().length > 0);
    const avgSentenceLength =
      sentences.reduce((sum: number, s: string) => sum + this.countWords(s), 0) / sentences.length;

    const paragraphs = contentData.paragraphs;
    const avgParagraphLength =
      paragraphs.reduce((sum: number, p: string) => sum + this.countWords(p), 0) /
      paragraphs.length;

    const fleschScore = this.calculateFleschScore(contentData.content);

    let complexity: 'simple' | 'moderate' | 'complex';
    if (fleschScore > 70) {
      complexity = 'simple';
    } else if (fleschScore > 40) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    const issues: string[] = [];
    let score = 100;

    if (avgSentenceLength > this.qualityMetrics.readability.maxSentenceLength) {
      issues.push(`句子过长，平均${avgSentenceLength.toFixed(1)}词`);
      score -= 15;
    }

    if (avgParagraphLength > this.qualityMetrics.readability.maxParagraphLength) {
      issues.push(`段落过长，平均${avgParagraphLength.toFixed(1)}词`);
      score -= 10;
    }

    if (fleschScore < this.qualityMetrics.readability.minFleschScore) {
      issues.push(`可读性较差，Flesch分数${fleschScore.toFixed(1)}`);
      score -= 20;
    }

    return {
      fleschScore,
      avgSentenceLength,
      avgParagraphLength,
      complexity,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析独特性
   */
  private analyzeUniqueness(contentData: ContentData): UniquenessAnalysis {
    const uniquenessScore = this.calculateUniqueness(contentData.content);
    const duplicateContent = this.extractDuplicatePhrases(contentData.content);
    const originality = Math.max(0, Math.min(1, uniquenessScore - duplicateContent.length * 0.02));

    const issues: string[] = [];
    let score = 100;

    if (uniquenessScore < 0.7) {
      issues.push('内容独特性不足，可能存在重复');
      score -= 30;
    } else if (uniquenessScore < 0.85) {
      issues.push('内容独特性一般，建议增加原创内容');
      score -= 15;
    }

    return {
      uniquenessScore,
      duplicateContent,
      originality,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 语义分析
   */
  private analyzeSemantic(contentData: ContentData): SemanticAnalysis {
    const entities = this.extractEntities(contentData.content);
    const concepts = this.extractConcepts(contentData.content);
    const relationships = this.extractRelationships(contentData.content);
    const coherence = this.calculateCoherence(contentData.content);

    const issues: string[] = [];
    let score = 100;

    if (entities.length < 5) {
      issues.push('语义实体不足');
      score -= 10;
    }

    if (concepts.length < 3) {
      issues.push('概念覆盖不足');
      score -= 10;
    }

    if (coherence < 0.6) {
      issues.push('语义连贯性不足');
      score -= 15;
    }

    return {
      entities,
      concepts,
      relationships,
      coherence,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 意图分析
   */
  private analyzeIntent(
    contentData: ContentData,
    targetIntent: string,
    keywords: string[]
  ): IntentAnalysis {
    const primaryIntent = this.detectPrimaryIntent(contentData.content, keywords);
    const intentConfidence = this.calculateIntentConfidence(contentData.content, primaryIntent);
    const userNeeds = this.identifyUserNeeds(contentData.content, keywords);
    const contentAlignment = this.calculateContentAlignment(
      contentData.content,
      targetIntent,
      keywords
    );
    const gaps = this.identifyContentGaps(contentData.content, userNeeds);

    const issues: string[] = [];
    let score = 100;

    if (intentConfidence < 0.7) {
      issues.push('意图表达不明确');
      score -= 15;
    }

    if (contentAlignment < 0.6) {
      issues.push('内容与用户意图不匹配');
      score -= 25;
    }

    if (gaps.length > 0) {
      issues.push(`存在${gaps.length}个内容缺口`);
      score -= 10;
    }

    return {
      primaryIntent,
      intentConfidence,
      userNeeds,
      contentAlignment,
      gaps,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    depth: DepthAnalysis,
    engagement: EngagementAnalysis,
    expertise: ExpertiseAnalysis,
    readability: ReadabilityAnalysis,
    uniqueness: UniquenessAnalysis,
    semantic: SemanticAnalysis,
    intent: IntentAnalysis
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    depth: 'shallow' | 'moderate' | 'deep';
  } {
    const scores = [
      depth.score * 0.25,
      engagement.score * 0.2,
      expertise.score * 0.2,
      readability.score * 0.15,
      uniqueness.score * 0.1,
      semantic.score * 0.05,
      intent.score * 0.05,
    ];

    const overallScore = scores.reduce((sum, score) => sum + score, 0);
    const grade = this.getGrade(overallScore);

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= 85) quality = 'excellent';
    else if (overallScore >= 70) quality = 'good';
    else if (overallScore >= 55) quality = 'fair';
    else quality = 'poor';

    return {
      score: Math.round(overallScore),
      grade,
      quality,
      depth: depth.depth,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    depth: DepthAnalysis,
    engagement: EngagementAnalysis,
    expertise: ExpertiseAnalysis,
    readability: ReadabilityAnalysis,
    uniqueness: UniquenessAnalysis,
    semantic: SemanticAnalysis,
    intent: IntentAnalysis
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // 深度建议
    if (depth.wordCount < this.qualityMetrics.depth.moderate) {
      recommendations.push({
        priority: 'high',
        category: 'depth',
        title: '增加内容深度',
        description: `当前内容${depth.wordCount}字，建议增加到${this.qualityMetrics.depth.moderate}字以上`,
        impact: '提升内容价值和SEO排名',
        effort: 'medium',
        examples: [
          {
            title: '内容扩展示例',
            language: 'markdown',
            code: `# 原始内容
简短介绍...

# 扩展内容
## 详细说明
更详细的解释...

## 实例分析
具体案例分析...

## 总结
内容总结...`,
            explanation: '通过增加详细说明、实例分析和总结来提升内容深度',
          },
        ],
      });
    }

    if (uniqueness.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'originality',
        title: '提升内容原创度',
        description: '检测到内容独特性不足，可能存在重复表达。',
        impact: '增强内容差异化与权威度',
        effort: 'medium',
        examples: [
          {
            title: '原创性提升示例',
            language: 'markdown',
            code: '补充独家观点、案例或数据来源，以区分同质化内容。',
            explanation: '增加原创观点和独特案例提升差异化',
          },
        ],
      });
    }

    if (semantic.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'semantic',
        title: '增强语义连贯性',
        description: '语义实体或概念覆盖不足，需补充关联信息。',
        impact: '提升搜索引擎对主题的理解',
        effort: 'medium',
        examples: [
          {
            title: '语义优化示例',
            language: 'markdown',
            code: '补充相关概念、关键术语与关联实体，形成主题闭环。',
            explanation: '通过语义扩展提升内容完整度',
          },
        ],
      });
    }

    if (intent.score < 70 || intent.gaps.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'intent',
        title: '对齐用户意图',
        description: '检测到内容与目标意图存在偏差或需求缺口。',
        impact: '提升内容命中用户需求的能力',
        effort: 'medium',
        examples: [
          {
            title: '意图对齐示例',
            language: 'markdown',
            code: '补充用户常见问题、操作步骤或购买决策信息。',
            explanation: '围绕目标意图补齐关键内容',
          },
        ],
      });
    }

    // 参与度建议
    if (engagement.questions < this.qualityMetrics.engagement.minQuestions) {
      recommendations.push({
        priority: 'medium',
        category: 'engagement',
        title: '增加互动元素',
        description: '添加问题、列表和子标题提高用户参与度',
        impact: '提升用户体验和页面停留时间',
        effort: 'low',
        examples: [
          {
            title: '互动元素示例',
            language: 'html',
            code: `<h2>常见问题</h2>
<p>您是否想知道如何解决这个问题？</p>

<h3>解决方案列表</h3>
<ol>
  <li>第一步：分析问题</li>
  <li>第二步：制定方案</li>
  <li>第三步：实施解决</li>
</ol>`,
            explanation: '通过问题和列表引导用户参与',
          },
        ],
      });
    }

    // 专业性建议
    if (expertise.technicalTerms < this.qualityMetrics.expertise.minTechnicalTerms) {
      recommendations.push({
        priority: 'medium',
        category: 'expertise',
        title: '提升专业性',
        description: '增加专业术语、实例和参考资料',
        impact: '建立权威性和可信度',
        effort: 'medium',
        examples: [
          {
            title: '专业性提升示例',
            language: 'markdown',
            code: `## 专业分析
根据<strong>算法优化</strong>原理，我们需要考虑<strong>时间复杂度</strong>和<strong>空间复杂度</strong>。

### 实例说明
例如，在处理大数据集时，使用<strong>哈希表</strong>可以将查找时间从O(n)降低到O(1)。

### 参考资料
1. 《算法导论》- Thomas H. Cormen
2. Stanford CS161 课程笔记`,
            explanation: '通过专业术语、实例和参考资料提升内容专业性',
          },
        ],
      });
    }

    // 可读性建议
    if (readability.avgSentenceLength > this.qualityMetrics.readability.maxSentenceLength) {
      recommendations.push({
        priority: 'medium',
        category: 'readability',
        title: '改善可读性',
        description: '拆分长句子和长段落，提高内容可读性',
        impact: '提升用户体验和理解度',
        effort: 'low',
        examples: [
          {
            title: '可读性改善示例',
            language: 'markdown',
            code: `# 改善前
这是一个非常长的句子，包含了太多的信息，让读者难以理解，需要拆分成多个短句。

# 改善后
这是一个长句。它包含了太多信息。读者难以理解。我们需要拆分它。

每个短句表达一个清晰的意思。这样更容易理解。`,
            explanation: '拆分长句子提高可读性',
          },
        ],
      });
    }

    return recommendations;
  }

  // 辅助方法
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private analyzeTopics(content: string): TopicAnalysis[] {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w\u4e00-\u9fff]/g, ''))
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    const wordFrequency: Record<string, number> = {};
    const bigramFrequency: Record<string, number> = {};

    tokens.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const bigram = `${tokens[index]} ${tokens[index + 1]}`;
      bigramFrequency[bigram] = (bigramFrequency[bigram] || 0) + 1;
    }

    const topics = Object.entries({ ...wordFrequency, ...bigramFrequency })
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, frequency]) => ({
        topic,
        coverage: tokens.length > 0 ? frequency / tokens.length : 0,
        relevance: Math.min(1, frequency / 4),
        subtopics: [],
      }));

    return topics;
  }

  private calculateCoverage(topics: TopicAnalysis[]): number {
    return topics.reduce((sum, topic) => sum + topic.coverage, 0);
  }

  private countTechnicalTerms(content: string): number {
    const technicalTerms = [
      '算法',
      '数据结构',
      '优化',
      '性能',
      '安全',
      '架构',
      '设计',
      '开发',
      '测试',
      '部署',
      '维护',
      '监控',
      '分析',
      '评估',
      '策略',
      '方案',
    ];

    return technicalTerms.reduce((count, term) => {
      const regex = new RegExp(term, 'gi');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countReferences(content: string): number {
    const referencePatterns = [
      /\[\d+\]/g, // [1], [2], etc.
      /\([^)]*\d{4}[^)]*\)/g, // (Author, 2024)
      /https?:\/\/[^\s]+/g, // URLs
    ];

    return referencePatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countCitations(content: string): number {
    const citationPatterns = [/根据.*?研究/g, /.*?研究表明/g, /.*?发现/g];

    return citationPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countDataPoints(content: string): number {
    const dataPatterns = [
      /\d+%?/g, // percentages and numbers
      /\$\d+/g, // monetary values
      /\d+\.\d+/g, // decimal numbers
    ];

    return dataPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private calculateFleschScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    return 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private calculateUniqueness(content: string): number {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w\u4e00-\u9fff]/g, ''))
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    if (tokens.length === 0) return 0;

    const uniqueWords = new Set(tokens);
    const unigramScore = uniqueWords.size / tokens.length;

    const shingles = new Set<string>();
    for (let i = 0; i < tokens.length - 2; i += 1) {
      shingles.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }
    const shingleScore = shingles.size / Math.max(1, tokens.length - 2);

    return Math.min(1, unigramScore * 0.6 + shingleScore * 0.4);
  }

  private extractEntities(content: string): SemanticEntity[] {
    const entityMap: Record<string, { count: number; positions: number[] }> = {};
    const englishMatches = content.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
    const chineseMatches = content.match(/[\u4e00-\u9fff]{2,6}/g) || [];
    const candidates = [...englishMatches, ...chineseMatches].map(text => text.trim());

    candidates.forEach((text, index) => {
      const lower = text.toLowerCase();
      if (this.stopWords.has(lower)) return;
      if (!entityMap[lower]) {
        entityMap[lower] = { count: 0, positions: [] };
      }
      entityMap[lower].count += 1;
      entityMap[lower].positions.push(index);
    });

    return Object.entries(entityMap)
      .sort(([, left], [, right]) => right.count - left.count)
      .slice(0, 20)
      .map(([text, data]) => ({
        text,
        type: 'entity',
        confidence: Math.min(1, 0.4 + data.count * 0.1),
        position: data.positions[0] ?? 0,
      }));
  }

  private extractConcepts(content: string): SemanticConcept[] {
    const topics = this.analyzeTopics(content);
    const concepts = topics.slice(0, 6).map(topic => ({
      concept: topic.topic,
      weight: Math.min(1, topic.relevance + topic.coverage),
      context: [topic.topic],
    }));
    return concepts;
  }

  private extractRelationships(content: string): SemanticRelationship[] {
    const entities = this.extractEntities(content);
    const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const relationshipMap: Record<string, { source: string; target: string; count: number }> = {};

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const present = entities.filter(entity => lowerSentence.includes(entity.text.toLowerCase()));
      for (let i = 0; i < present.length; i += 1) {
        for (let j = i + 1; j < present.length; j += 1) {
          const key = `${present[i].text}::${present[j].text}`;
          if (!relationshipMap[key]) {
            relationshipMap[key] = {
              source: present[i].text,
              target: present[j].text,
              count: 0,
            };
          }
          relationshipMap[key].count += 1;
        }
      }
    });

    return Object.values(relationshipMap)
      .filter(item => item.count > 1)
      .map(item => ({
        entity1: item.source,
        entity2: item.target,
        relationship: 'co-occurrence',
        confidence: Math.min(1, item.count / 3),
      }));
  }

  private calculateCoherence(content: string): number {
    const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return 1;

    let coherenceScore = 0;
    for (let i = 1; i < sentences.length; i++) {
      const prevWords = new Set(
        sentences[i - 1]
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 1 && !this.stopWords.has(word))
      );
      const currWords = sentences[i]
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 1 && !this.stopWords.has(word));
      if (currWords.length === 0) continue;
      const commonWords = currWords.filter(word => prevWords.has(word));
      const jaccard = commonWords.length / (new Set([...prevWords, ...currWords]).size || 1);
      coherenceScore += jaccard;
    }

    return coherenceScore / (sentences.length - 1);
  }

  private detectPrimaryIntent(content: string, keywords: string[]): string {
    const lowerContent = content.toLowerCase();
    const transactionalSignals = [
      '购买',
      '价格',
      '优惠',
      '订阅',
      '试用',
      'order',
      'buy',
      'pricing',
    ];
    const informationalSignals = ['如何', '怎么', '步骤', '指南', 'guide', 'how to'];
    const navigationalSignals = ['官网', '登录', '入口', 'download', '官网', 'login'];

    if (transactionalSignals.some(signal => lowerContent.includes(signal))) return 'commercial';
    if (navigationalSignals.some(signal => lowerContent.includes(signal))) return 'navigational';
    if (informationalSignals.some(signal => lowerContent.includes(signal))) return 'informational';
    if (keywords.length === 0) return 'informational';
    return 'informational';
  }

  private calculateIntentConfidence(content: string, intent: string): number {
    const lowerContent = content.toLowerCase();
    const signals: Record<string, string[]> = {
      informational: ['如何', '怎么', '步骤', '方法', 'guide', 'tutorial', 'how to'],
      navigational: ['官网', '登录', '下载', '入口', 'login', 'download'],
      commercial: ['购买', '价格', '报价', '优惠', '订阅', 'buy', 'pricing', 'trial'],
    };
    const matched = signals[intent]?.filter(signal => lowerContent.includes(signal)).length || 0;
    const total = signals[intent]?.length || 1;
    return Math.min(1, 0.4 + matched / total);
  }

  private identifyUserNeeds(content: string, keywords: string[]): string[] {
    const sentences = content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const questionNeeds = sentences
      .filter(sentence => /\?|？/.test(sentence))
      .map(sentence => sentence.replace(/[?？]/g, '').trim())
      .filter(Boolean);
    const keywordNeeds = keywords.slice(0, 5);
    return Array.from(new Set([...questionNeeds, ...keywordNeeds])).slice(0, 6);
  }

  private calculateContentAlignment(
    content: string,
    targetIntent: string,
    keywords: string[]
  ): number {
    const lowerContent = content.toLowerCase();
    const keywordMatches = keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    const intentConfidence = this.calculateIntentConfidence(lowerContent, targetIntent);
    const density = keywords.length > 0 ? keywordMatches / Math.max(1, keywords.length * 2) : 0;
    return Math.min(1, density * 0.6 + intentConfidence * 0.4);
  }

  private identifyContentGaps(content: string, userNeeds: string[]): string[] {
    const lowerContent = content.toLowerCase();
    return userNeeds.filter(need => !lowerContent.includes(need.toLowerCase()));
  }

  private extractDuplicatePhrases(content: string): string[] {
    const tokens = content
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^\w\u4e00-\u9fff]/g, ''))
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    const phraseMap: Record<string, number> = {};
    for (let i = 0; i < tokens.length - 2; i += 1) {
      const phrase = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      phraseMap[phrase] = (phraseMap[phrase] || 0) + 1;
    }
    return Object.entries(phraseMap)
      .filter(([, count]) => count > 1)
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取质量指标配置
   */
  getQualityMetrics(): QualityMetrics {
    return { ...this.qualityMetrics };
  }

  /**
   * 设置质量指标配置
   */
  setQualityMetrics(metrics: Partial<QualityMetrics>): void {
    this.qualityMetrics = { ...this.qualityMetrics, ...metrics };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: ContentQualityResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        metrics: this.qualityMetrics,
      },
      null,
      2
    );
  }
}

export default ContentQualityAnalyzer;
