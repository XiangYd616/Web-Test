/**
 * 内容分析器
 * 本地化程度：100%
 * 分析页面内容质量、结构、关键词密度等
 */

import type { Page } from 'puppeteer';
import puppeteer from 'puppeteer';

interface ContentRules {
  content: {
    minWordCount: number;
    optimalWordCount: number;
    maxKeywordDensity: number;
    optimalKeywordDensity: number;
  };
  headings: {
    maxH1Count: number;
    requiredH1: boolean;
    maxDepth: number;
  };
  images: {
    maxMissingAlt: number;
    maxLargeImages: number;
  };
}

interface ContentAnalysisResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
  };
  content: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    sentenceCount: number;
    averageWordsPerSentence: number;
    readabilityLevel: string;
    issues: ContentIssue[];
  };
  structure: {
    headings: HeadingAnalysis;
    lists: ListAnalysis;
    links: LinkAnalysis;
    images: ImageAnalysis;
  };
  keywords: {
    primary: string[];
    secondary: string[];
    density: Record<string, number>;
    prominence: KeywordProminence[];
    issues: KeywordIssue[];
  };
  recommendations: ContentRecommendation[];
}

interface ContentIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  impact: string;
}

interface HeadingAnalysis {
  h1: HeadingInfo[];
  h2: HeadingInfo[];
  h3: HeadingInfo[];
  h4: HeadingInfo[];
  h5: HeadingInfo[];
  h6: HeadingInfo[];
  structure: string;
  issues: string[];
  score: number;
}

interface HeadingInfo {
  text: string;
  wordCount: number;
  containsKeywords: boolean;
  position: number;
}

interface ListAnalysis {
  ordered: ListInfo[];
  unordered: ListInfo[];
  totalItems: number;
  averageItemsPerList: number;
  issues: string[];
  score: number;
}

interface ListInfo {
  type: 'ordered' | 'unordered';
  itemCount: number;
  depth: number;
  position: number;
}

interface LinkAnalysis {
  internal: LinkInfo[];
  external: LinkInfo[];
  total: number;
  averageTextLength: number;
  issues: string[];
  score: number;
}

interface LinkInfo {
  url: string;
  text: string;
  isInternal: boolean;
  hasTitle: boolean;
  isNoFollow: boolean;
  position: number;
}

interface ImageAnalysis {
  total: number;
  withAlt: number;
  withoutAlt: number;
  optimized: number;
  largeImages: number[];
  issues: string[];
  score: number;
}

interface KeywordProminence {
  keyword: string;
  prominence: number;
  locations: string[];
  score: number;
}

interface KeywordIssue {
  keyword: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

interface ContentRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  examples: CodeExample[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

type ExtractedHeading = {
  level: number;
  text: string;
  position: number;
};

type ExtractedImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
};

type ExtractedLink = {
  href: string;
  text: string;
  title: string;
  rel: string;
  position: number;
};

type ExtractedList = {
  type: string;
  itemCount: number;
  position: number;
};

type ExtractedContent = {
  text: string;
  title: string;
  description: string;
  headings: ExtractedHeading[];
  images: ExtractedImage[];
  links: ExtractedLink[];
  lists: ExtractedList[];
};

type HeadingEvaluationResult = {
  h1: Array<{ text: string; wordCount: number; position: number }>;
  h2: Array<{ text: string; wordCount: number; position: number }>;
  h3: Array<{ text: string; wordCount: number; position: number }>;
  h4: Array<{ text: string; wordCount: number; position: number }>;
  h5: Array<{ text: string; wordCount: number; position: number }>;
  h6: Array<{ text: string; wordCount: number; position: number }>;
};

type ListEvaluationResult = {
  ordered: Array<{ type: 'ordered'; itemCount: number; depth: number; position: number }>;
  unordered: Array<{ type: 'unordered'; itemCount: number; depth: number; position: number }>;
};

type LinkEvaluationResult = {
  internal: Array<{
    url: string;
    text: string;
    isInternal: boolean;
    hasTitle: boolean;
    isNoFollow: boolean;
    position: number;
  }>;
  external: Array<{
    url: string;
    text: string;
    isInternal: boolean;
    hasTitle: boolean;
    isNoFollow: boolean;
    position: number;
  }>;
};

type ContentQualityResult = {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  readabilityLevel: string;
  issues: ContentIssue[];
};

type StructureAnalysisResult = {
  headings: HeadingAnalysis;
  lists: ListAnalysis;
  links: LinkAnalysis;
  images: ImageAnalysis;
};

type KeywordsAnalysisResult = {
  primary: string[];
  secondary: string[];
  density: Record<string, number>;
  prominence: KeywordProminence[];
  issues: KeywordIssue[];
};

class ContentAnalyzer {
  private rules: ContentRules;

  constructor() {
    this.rules = {
      content: {
        minWordCount: 300,
        optimalWordCount: 1000,
        maxKeywordDensity: 3.0,
        optimalKeywordDensity: 1.5,
      },
      headings: {
        maxH1Count: 1,
        requiredH1: true,
        maxDepth: 6,
      },
      images: {
        maxMissingAlt: 0.1, // 10%
        maxLargeImages: 0.2, // 20%
      },
    };
  }

  /**
   * 执行内容分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      keywords?: string[];
      waitTime?: number;
    } = {}
  ): Promise<ContentAnalysisResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      keywords = [],
      waitTime = 5000,
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

      // 等待页面完全加载
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // 提取页面内容
      const contentData = await this.extractContent(page, keywords);

      // 分析内容
      const content = this.analyzeContentQuality(contentData);

      // 分析结构
      const structure = await this.analyzeStructure(page);

      // 分析关键词
      const keywordsAnalysis = this.analyzeKeywords(contentData, keywords);

      // 计算总体分数
      const overall = this.calculateOverallScore(content, structure, keywordsAnalysis);

      // 生成建议
      const recommendations = this.generateRecommendations(content, structure, keywordsAnalysis);

      return {
        url,
        timestamp,
        overall,
        content,
        structure,
        keywords: keywordsAnalysis,
        recommendations,
      };
    } catch (error) {
      throw new Error(`内容分析失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 提取页面内容
   */
  private async extractContent(page: Page, keywords: string[]): Promise<ExtractedContent> {
    return await page.evaluate((_targetKeywords: string[]) => {
      // 提取文本内容
      const textContent = document.body.innerText || '';

      // 提取标题
      const title = document.title || '';

      // 提取描述
      const descriptionMeta = document.querySelector('meta[name="description"]');
      const description = descriptionMeta ? descriptionMeta.getAttribute('content') || '' : '';

      // 提取标题
      const headings: Array<{ level: number; text: string; position: number }> = [];
      for (let i = 1; i <= 6; i++) {
        const elements = document.querySelectorAll(`h${i}`);
        elements.forEach((element, index) => {
          const headingElement = element as HTMLElement;
          headings.push({
            level: i,
            text: headingElement.innerText || '',
            position: index,
          });
        });
      }

      // 提取图片
      const images: Array<{
        src: string;
        alt: string;
        width: number;
        height: number;
        position: number;
      }> = [];
      document.querySelectorAll('img').forEach((img, index) => {
        const imageElement = img as HTMLImageElement;
        images.push({
          src: imageElement.src || '',
          alt: imageElement.alt || '',
          width: imageElement.naturalWidth || 0,
          height: imageElement.naturalHeight || 0,
          position: index,
        });
      });

      // 提取链接
      const links: Array<{
        href: string;
        text: string;
        title: string;
        rel: string;
        position: number;
      }> = [];
      document.querySelectorAll('a[href]').forEach((link, index) => {
        const anchorElement = link as HTMLAnchorElement;
        links.push({
          href: anchorElement.href || '',
          text: anchorElement.innerText || '',
          title: anchorElement.title || '',
          rel: anchorElement.rel || '',
          position: index,
        });
      });

      // 提取列表
      const lists: Array<{ type: string; itemCount: number; position: number }> = [];
      document.querySelectorAll('ol, ul').forEach((list, index) => {
        const items = list.querySelectorAll('li');
        lists.push({
          type: list.tagName.toLowerCase(),
          itemCount: items.length,
          position: index,
        });
      });

      return {
        text: textContent,
        title,
        description,
        headings,
        images,
        links,
        lists,
      };
    }, keywords);
  }

  /**
   * 分析内容质量
   */
  private analyzeContentQuality(contentData: ExtractedContent): ContentQualityResult {
    const text = contentData.text;
    const wordCount = this.countWords(text);
    const characterCount = text.length;
    const paragraphCount = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const readabilityLevel = this.calculateReadabilityLevel(text);

    const issues: ContentIssue[] = [];

    // 字数检查
    if (wordCount < this.rules.content.minWordCount) {
      issues.push({
        type: 'content-length',
        severity: 'medium',
        description: `内容字数过少 (${wordCount}字)`,
        suggestion: `建议增加内容到至少${this.rules.content.minWordCount}字`,
        impact: '影响SEO排名和用户体验',
      });
    }

    // 段落检查
    if (paragraphCount < 3) {
      issues.push({
        type: 'paragraph-count',
        severity: 'low',
        description: `段落数量过少 (${paragraphCount}个)`,
        suggestion: '建议增加段落数量，提高内容可读性',
        impact: '影响内容结构和可读性',
      });
    }

    // 句子长度检查
    if (averageWordsPerSentence > 25) {
      issues.push({
        type: 'sentence-length',
        severity: 'low',
        description: `句子过长 (平均${averageWordsPerSentence.toFixed(1)}词)`,
        suggestion: '建议拆分长句子，提高可读性',
        impact: '影响用户体验和可读性',
      });
    }

    return {
      wordCount,
      characterCount,
      paragraphCount,
      sentenceCount,
      averageWordsPerSentence,
      readabilityLevel,
      issues,
    };
  }

  /**
   * 分析页面结构
   */
  private async analyzeStructure(page: Page): Promise<StructureAnalysisResult> {
    // 分析标题结构
    const headings = await this.analyzeHeadings(page);

    // 分析列表
    const lists = await this.analyzeLists(page);

    // 分析链接
    const links = await this.analyzeLinks(page);

    // 分析图片
    const images = await this.analyzeImages(page);

    return {
      headings,
      lists,
      links,
      images,
    };
  }

  /**
   * 分析标题结构
   */
  private async analyzeHeadings(page: Page): Promise<HeadingAnalysis> {
    const headings = await page.evaluate(() => {
      const result: HeadingEvaluationResult = {
        h1: [],
        h2: [],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      };

      for (let i = 1; i <= 6; i++) {
        const elements = document.querySelectorAll(`h${i}`);
        elements.forEach((element, index) => {
          const headingElement = element as HTMLElement;
          const key = `h${i}` as keyof HeadingEvaluationResult;
          result[key].push({
            text: headingElement.innerText || '',
            wordCount: (headingElement.innerText || '').split(/\s+/).length,
            position: index,
          });
        });
      }

      return result;
    });

    const headingsWithKeywords = {
      h1: headings.h1.map(h => ({ ...h, containsKeywords: false })),
      h2: headings.h2.map(h => ({ ...h, containsKeywords: false })),
      h3: headings.h3.map(h => ({ ...h, containsKeywords: false })),
      h4: headings.h4.map(h => ({ ...h, containsKeywords: false })),
      h5: headings.h5.map(h => ({ ...h, containsKeywords: false })),
      h6: headings.h6.map(h => ({ ...h, containsKeywords: false })),
    };

    const issues: string[] = [];
    let score = 100;

    // H1检查
    if (headingsWithKeywords.h1.length === 0 && this.rules.headings.requiredH1) {
      issues.push('缺少H1标题');
      score -= 30;
    } else if (headingsWithKeywords.h1.length > this.rules.headings.maxH1Count) {
      issues.push(`H1标题过多 (${headingsWithKeywords.h1.length}个)`);
      score -= 20;
    }

    // 标题层级检查
    const allHeadings = [
      ...headingsWithKeywords.h1.map(h => ({ ...h, level: 1 })),
      ...headingsWithKeywords.h2.map(h => ({ ...h, level: 2 })),
      ...headingsWithKeywords.h3.map(h => ({ ...h, level: 3 })),
      ...headingsWithKeywords.h4.map(h => ({ ...h, level: 4 })),
      ...headingsWithKeywords.h5.map(h => ({ ...h, level: 5 })),
      ...headingsWithKeywords.h6.map(h => ({ ...h, level: 6 })),
    ].sort((a, b) => a.position - b.position);

    // 检查标题层级跳跃
    for (let i = 1; i < allHeadings.length; i++) {
      const current = allHeadings[i];
      const previous = allHeadings[i - 1];

      if (current.level > previous.level + 1) {
        issues.push(`标题层级跳跃: H${previous.level} -> H${current.level}`);
        score -= 10;
      }
    }

    const structure = this.getHeadingStructure(headingsWithKeywords);

    return {
      ...headingsWithKeywords,
      structure,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析列表
   */
  private async analyzeLists(page: Page): Promise<ListAnalysis> {
    const lists = await page.evaluate(() => {
      const result: ListEvaluationResult = {
        ordered: [],
        unordered: [],
      };

      document.querySelectorAll('ol').forEach((list, index) => {
        const items = list.querySelectorAll('li');
        const depth = (() => {
          let current = list.parentElement;
          let level = 0;
          while (current) {
            if (current.tagName === 'UL' || current.tagName === 'OL') {
              level += 1;
            }
            current = current.parentElement;
          }
          return level;
        })();
        result.ordered.push({
          type: 'ordered',
          itemCount: items.length,
          depth,
          position: index,
        });
      });

      document.querySelectorAll('ul').forEach((list, index) => {
        const items = list.querySelectorAll('li');
        const depth = (() => {
          let current = list.parentElement;
          let level = 0;
          while (current) {
            if (current.tagName === 'UL' || current.tagName === 'OL') {
              level += 1;
            }
            current = current.parentElement;
          }
          return level;
        })();
        result.unordered.push({
          type: 'unordered',
          itemCount: items.length,
          depth,
          position: index,
        });
      });

      return result;
    });

    const totalItems = [...lists.ordered, ...lists.unordered].reduce(
      (sum, list) => sum + list.itemCount,
      0
    );
    const averageItemsPerList =
      lists.ordered.length + lists.unordered.length > 0
        ? totalItems / (lists.ordered.length + lists.unordered.length)
        : 0;

    const issues: string[] = [];
    let score = 100;

    // 检查列表项数量
    if (averageItemsPerList > 10) {
      issues.push('列表项过多，建议拆分');
      score -= 10;
    }

    return {
      ...lists,
      totalItems,
      averageItemsPerList,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析链接
   */
  private async analyzeLinks(page: Page): Promise<LinkAnalysis> {
    const links = await page.evaluate(() => {
      const result: LinkEvaluationResult = {
        internal: [],
        external: [],
      };

      document.querySelectorAll('a[href]').forEach((link, index) => {
        const anchorElement = link as HTMLAnchorElement;
        const href = anchorElement.href || '';
        const text = anchorElement.innerText || '';
        const isInternal = href.includes(window.location.hostname);

        if (isInternal) {
          result.internal.push({
            url: href,
            text,
            isInternal: true,
            hasTitle: !!anchorElement.title,
            isNoFollow: anchorElement.rel.includes('nofollow'),
            position: index,
          });
        } else {
          result.external.push({
            url: href,
            text,
            isInternal: false,
            hasTitle: !!anchorElement.title,
            isNoFollow: anchorElement.rel.includes('nofollow'),
            position: index,
          });
        }
      });

      return result;
    });

    const total = links.internal.length + links.external.length;
    const averageTextLength =
      total > 0
        ? [...links.internal, ...links.external].reduce((sum, link) => sum + link.text.length, 0) /
          total
        : 0;

    const issues: string[] = [];
    let score = 100;

    // 检查链接文本长度
    if (averageTextLength < 10) {
      issues.push('链接文本过短，影响可访问性');
      score -= 15;
    }

    // 检查外部链接数量
    if (links.external.length > 20) {
      issues.push('外部链接过多，可能影响SEO');
      score -= 10;
    }

    return {
      ...links,
      total,
      averageTextLength,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析图片
   */
  private async analyzeImages(page: Page): Promise<ImageAnalysis> {
    const images = await page.evaluate(() => {
      const result: Array<{
        src: string;
        alt: string;
        width: number;
        height: number;
        position: number;
      }> = [];

      document.querySelectorAll('img').forEach((img, index) => {
        result.push({
          src: img.src || '',
          alt: img.alt || '',
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0,
          position: index,
        });
      });

      return result;
    });

    const total = images.length;
    const withAlt = images.filter(img => img.alt.length > 0).length;
    const withoutAlt = total - withAlt;
    const optimized = images.filter(img => img.width > 0 && img.height > 0).length;
    const largeImages = images
      .filter(img => img.width > 2000 || img.height > 2000)
      .map(img => img.position);

    const issues: string[] = [];
    let score = 100;

    // 检查Alt文本
    const missingAltRatio = withoutAlt / total;
    if (missingAltRatio > this.rules.images.maxMissingAlt) {
      issues.push(`缺少Alt文本的图片过多 (${withoutAlt}/${total})`);
      score -= 25;
    }

    // 检查大图片
    const largeImageRatio = largeImages.length / total;
    if (largeImageRatio > this.rules.images.maxLargeImages) {
      issues.push(`大图片过多 (${largeImages.length}个)`);
      score -= 15;
    }

    return {
      total,
      withAlt,
      withoutAlt,
      optimized,
      largeImages,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析关键词
   */
  private analyzeKeywords(
    contentData: ExtractedContent,
    _targetKeywords: string[]
  ): KeywordsAnalysisResult {
    const text = contentData.text.toLowerCase();
    const title = contentData.title.toLowerCase();
    const description = contentData.description.toLowerCase();

    // 计算词频
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const wordFrequency: Record<string, number> = {};

    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 2) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    });

    // 计算关键词密度
    const totalWords = words.length;
    const density: Record<string, number> = {};

    Object.keys(wordFrequency).forEach(word => {
      density[word] = (wordFrequency[word] / totalWords) * 100;
    });

    // 识别主要关键词
    const sortedKeywords = Object.entries(density)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    const primary = sortedKeywords.slice(0, 3);
    const secondary = sortedKeywords.slice(3, 10);

    // 计算关键词显著性
    const prominence: KeywordProminence[] = [];

    primary.forEach(keyword => {
      const locations: string[] = [];
      let score = 0;

      // 标题中的关键词
      if (title.includes(keyword)) {
        locations.push('title');
        score += 30;
      }

      // 描述中的关键词
      if (description.includes(keyword)) {
        locations.push('description');
        score += 20;
      }

      // H1中的关键词
      contentData.headings.forEach(heading => {
        if (heading.level === 1 && heading.text.toLowerCase().includes(keyword)) {
          locations.push('h1');
          score += 25;
        }
      });

      // H2中的关键词
      contentData.headings.forEach(heading => {
        if (heading.level === 2 && heading.text.toLowerCase().includes(keyword)) {
          locations.push('h2');
          score += 15;
        }
      });

      prominence.push({
        keyword,
        prominence: score,
        locations,
        score,
      });
    });

    // 检查关键词问题
    const issues: KeywordIssue[] = [];

    primary.forEach(keyword => {
      const keywordDensity = density[keyword] || 0;

      if (keywordDensity > this.rules.content.maxKeywordDensity) {
        issues.push({
          keyword,
          type: 'over-optimization',
          severity: 'high',
          description: `关键词密度过高 (${keywordDensity.toFixed(2)}%)`,
          suggestion: '减少关键词使用频率',
        });
      } else if (keywordDensity < 0.5) {
        issues.push({
          keyword,
          type: 'under-optimization',
          severity: 'medium',
          description: `关键词密度过低 (${keywordDensity.toFixed(2)}%)`,
          suggestion: '适当增加关键词使用频率',
        });
      }
    });

    return {
      primary,
      secondary,
      density,
      prominence,
      issues,
    };
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    content: ContentQualityResult,
    structure: StructureAnalysisResult,
    keywords: KeywordsAnalysisResult
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
  } {
    const contentScore = 100 - content.issues.length * 10;
    const structureScore =
      structure.headings.score * 0.4 +
      structure.lists.score * 0.2 +
      structure.links.score * 0.2 +
      structure.images.score * 0.2;
    const keywordScore = 100 - keywords.issues.length * 15;

    const overallScore = contentScore * 0.4 + structureScore * 0.4 + keywordScore * 0.2;
    const grade = this.getGrade(overallScore);

    const avgKeywordDensity =
      keywords.primary.length > 0
        ? keywords.primary.reduce(
            (sum: number, keyword: string) => sum + (keywords.density[keyword] || 0),
            0
          ) / keywords.primary.length
        : 0;

    return {
      score: Math.round(overallScore),
      grade,
      wordCount: content.wordCount,
      readabilityScore: this.calculateReadabilityScore(content),
      keywordDensity: avgKeywordDensity,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    content: ContentQualityResult,
    structure: StructureAnalysisResult,
    keywords: KeywordsAnalysisResult
  ): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = [];

    // 内容建议
    if (content.wordCount < this.rules.content.minWordCount) {
      recommendations.push({
        priority: 'high',
        category: 'content',
        title: '增加内容长度',
        description: `当前内容${content.wordCount}字，建议增加到${this.rules.content.optimalWordCount}字`,
        examples: [
          {
            title: '内容扩展示例',
            language: 'markdown',
            code: `# 原始内容
简短的介绍内容...

# 扩展后的内容
## 详细介绍
更详细的说明内容...

## 具体细节
具体的实现细节...

## 总结
内容总结和结论...`,
            explanation: '通过增加更多详细内容来提升内容质量',
          },
        ],
        impact: '提升SEO排名和用户体验',
        effort: 'medium',
      });
    }

    // 标题建议
    if (structure.headings.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: '优化标题结构',
        description: '改进页面标题层级结构',
        examples: [
          {
            title: '标题结构示例',
            language: 'html',
            code: `<h1>主标题</h1>
<h2>二级标题</h2>
  <h3>三级标题</h3>
  <h3>另一个三级标题</h3>
<h2>另一个二级标题</h2>
  <h3>三级标题</h3>`,
            explanation: '使用正确的标题层级结构',
          },
        ],
        impact: '改善内容结构和SEO',
        effort: 'low',
      });
    }

    // 图片建议
    if (structure.images.withoutAlt > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'accessibility',
        title: '添加图片Alt文本',
        description: `为${structure.images.withoutAlt}个图片添加Alt文本`,
        examples: [
          {
            title: 'Alt文本示例',
            language: 'html',
            code: `<img src="image.jpg" alt="描述性的图片替代文本">
<img src="logo.png" alt="公司Logo">`,
            explanation: '为所有图片添加描述性的Alt文本',
          },
        ],
        impact: '提升可访问性和SEO',
        effort: 'low',
      });
    }

    // 关键词建议
    if (keywords.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'seo',
        title: '优化关键词使用',
        description: '调整关键词密度和分布',
        examples: [
          {
            title: '关键词优化示例',
            language: 'html',
            code: `<title>包含主要关键词的页面标题</title>
<meta name="description" content="包含关键词的页面描述">
<h1>包含关键词的主标题</h1>
<p>在内容中自然地使用<strong>关键词</strong>，但不要过度堆砌。</p>`,
            explanation: '在重要位置合理使用关键词',
          },
        ],
        impact: '提升关键词排名',
        effort: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * 计算词数
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 计算可读性等级
   */
  private calculateReadabilityLevel(text: string): string {
    const words = this.countWords(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = words / sentences;

    if (avgWordsPerSentence < 10) return 'easy';
    if (avgWordsPerSentence < 15) return 'medium';
    if (avgWordsPerSentence < 20) return 'hard';
    return 'very-hard';
  }

  /**
   * 计算可读性分数
   */
  private calculateReadabilityScore(content: ContentQualityResult): number {
    const level = content.readabilityLevel;
    const scores = {
      easy: 100,
      medium: 80,
      hard: 60,
      'very-hard': 40,
    };
    return scores[level as keyof typeof scores] || 50;
  }

  /**
   * 获取标题结构
   */
  private getHeadingStructure(
    headings: Pick<HeadingAnalysis, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>
  ): string {
    const levels = [];

    if (headings.h1.length > 0) levels.push('H1');
    if (headings.h2.length > 0) levels.push('H2');
    if (headings.h3.length > 0) levels.push('H3');
    if (headings.h4.length > 0) levels.push('H4');
    if (headings.h5.length > 0) levels.push('H5');
    if (headings.h6.length > 0) levels.push('H6');

    return levels.join(' → ') || '无标题';
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取规则配置
   */
  getRules(): ContentRules {
    return { ...this.rules };
  }

  /**
   * 设置规则配置
   */
  setRules(rules: Partial<ContentRules>): void {
    this.rules = { ...this.rules, ...rules };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: ContentAnalysisResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        rules: this.rules,
      },
      null,
      2
    );
  }
}

export default ContentAnalyzer;
