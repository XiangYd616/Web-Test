/**
 * Meta标签分析器
 * 本地化程度：100%
 * 分析页面的Meta标签，包括title、description、keywords等
 */

import puppeteer from 'puppeteer';

interface MetaTagRules {
  title: {
    minLength: number;
    maxLength: number;
    optimalLength: number;
  };
  description: {
    minLength: number;
    maxLength: number;
    optimalLength: number;
  };
  keywords: {
    maxCount: number;
    maxLength: number;
  };
}

interface MetaTagAnalysisResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    optimized: boolean;
  };
  title: TitleAnalysis;
  description: DescriptionAnalysis;
  keywords: KeywordsAnalysis;
  openGraph: OpenGraphAnalysis;
  twitter: TwitterAnalysis;
  other: OtherMetaAnalysis;
  recommendations: MetaTagRecommendation[];
}

interface TitleAnalysis {
  content: string;
  length: number;
  optimized: boolean;
  issues: TitleIssue[];
  score: number;
  preview: string;
}

interface TitleIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface DescriptionAnalysis {
  content: string;
  length: number;
  optimized: boolean;
  issues: DescriptionIssue[];
  score: number;
  preview: string;
}

interface DescriptionIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface KeywordsAnalysis {
  content: string;
  keywords: string[];
  count: number;
  optimized: boolean;
  issues: KeywordsIssue[];
  score: number;
}

interface KeywordsIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

interface OpenGraphAnalysis {
  present: boolean;
  tags: OpenGraphTag[];
  optimized: boolean;
  issues: string[];
  score: number;
}

interface OpenGraphTag {
  property: string;
  content: string;
  valid: boolean;
  issues: string[];
}

interface TwitterAnalysis {
  present: boolean;
  tags: TwitterTag[];
  optimized: boolean;
  issues: string[];
  score: number;
}

interface TwitterTag {
  name: string;
  content: string;
  valid: boolean;
  issues: string[];
}

interface OtherMetaAnalysis {
  canonical: string;
  robots: string;
  viewport: string;
  language: string;
  author: string;
  favicon: string;
  issues: string[];
  score: number;
}

interface MetaTagRecommendation {
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

class MetaTagAnalyzer {
  private rules: MetaTagRules;

  constructor() {
    this.rules = {
      title: {
        minLength: 30,
        maxLength: 60,
        optimalLength: 55,
      },
      description: {
        minLength: 120,
        maxLength: 160,
        optimalLength: 155,
      },
      keywords: {
        maxCount: 10,
        maxLength: 255,
      },
    };
  }

  /**
   * 执行Meta标签分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      checkOpenGraph?: boolean;
      checkTwitter?: boolean;
    } = {}
  ): Promise<MetaTagAnalysisResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      checkOpenGraph = true,
      checkTwitter = true,
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

      // 提取Meta标签数据
      const metaTagsData = await this.extractMetaTags(page);

      // 分析标题
      const title = this.analyzeTitle(metaTagsData);

      // 分析描述
      const description = this.analyzeDescription(metaTagsData);

      // 分析关键词
      const keywords = this.analyzeKeywords(metaTagsData);

      // 分析Open Graph
      const openGraph = checkOpenGraph
        ? this.analyzeOpenGraph(metaTagsData)
        : this.createEmptyOpenGraph();

      // 分析Twitter Cards
      const twitter = checkTwitter ? this.analyzeTwitter(metaTagsData) : this.createEmptyTwitter();

      // 分析其他Meta标签
      const other = this.analyzeOtherMeta(metaTagsData);

      // 计算总体分数
      const overall = this.calculateOverallScore(
        title,
        description,
        keywords,
        openGraph,
        twitter,
        other
      );

      // 生成建议
      const recommendations = this.generateRecommendations(
        title,
        description,
        keywords,
        openGraph,
        twitter,
        other
      );

      return {
        url,
        timestamp,
        overall,
        title,
        description,
        keywords,
        openGraph,
        twitter,
        other,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Meta标签分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 提取Meta标签数据
   */
  private async extractMetaTags(page: any): Promise<{
    title: string;
    description: string;
    keywords: string;
    canonical: string;
    robots: string;
    viewport: string;
    language: string;
    author: string;
    favicon: string;
    openGraph: Array<{ property: string; content: string }>;
    twitter: Array<{ name: string; content: string }>;
    other: Array<{ name: string; content: string }>;
  }> {
    return await page.evaluate(() => {
      // 获取页面标题
      const title = document.title || '';

      // 获取Meta描述
      const descriptionMeta = document.querySelector('meta[name="description"]');
      const description = descriptionMeta ? descriptionMeta.getAttribute('content') || '' : '';

      // 获取Meta关键词
      const keywordsMeta = document.querySelector('meta[name="keywords"]');
      const keywords = keywordsMeta ? keywordsMeta.getAttribute('content') || '' : '';

      // 获取Canonical URL
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      const canonical = canonicalLink ? canonicalLink.getAttribute('href') || '' : '';

      // 获取Robots
      const robotsMeta = document.querySelector('meta[name="robots"]');
      const robots = robotsMeta ? robotsMeta.getAttribute('content') || '' : '';

      // 获取Viewport
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const viewport = viewportMeta ? viewportMeta.getAttribute('content') || '' : '';

      // 获取语言
      const htmlLang = document.documentElement.getAttribute('lang') || '';
      const languageMeta = document.querySelector('meta[http-equiv="content-language"]');
      const language = htmlLang || (languageMeta ? languageMeta.getAttribute('content') || '' : '');

      // 获取作者
      const authorMeta = document.querySelector('meta[name="author"]');
      const author = authorMeta ? authorMeta.getAttribute('content') || '' : '';

      // 获取Favicon
      const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      const favicon = faviconLink ? faviconLink.getAttribute('href') || '' : '';

      // 获取Open Graph标签
      const openGraph: Array<{ property: string; content: string }> = [];
      document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
        const property = meta.getAttribute('property') || '';
        const content = meta.getAttribute('content') || '';
        if (property && content) {
          openGraph.push({ property, content });
        }
      });

      // 获取Twitter Cards标签
      const twitter: Array<{ name: string; content: string }> = [];
      document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
        const name = meta.getAttribute('name') || '';
        const content = meta.getAttribute('content') || '';
        if (name && content) {
          twitter.push({ name, content });
        }
      });

      // 获取其他Meta标签
      const other: Array<{ name: string; content: string }> = [];
      document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
        const content = meta.getAttribute('content') || '';
        if (
          name &&
          content &&
          !name.includes('description') &&
          !name.includes('keywords') &&
          !name.includes('robots') &&
          !name.includes('viewport') &&
          !name.includes('author') &&
          !name.startsWith('og:') &&
          !name.startsWith('twitter:')
        ) {
          other.push({ name, content });
        }
      });

      return {
        title,
        description,
        keywords,
        canonical,
        robots,
        viewport,
        language,
        author,
        favicon,
        openGraph,
        twitter,
        other,
      };
    });
  }

  /**
   * 分析标题
   */
  private analyzeTitle(metaData: any): TitleAnalysis {
    const content = metaData.title || '';
    const length = content.length;
    const optimized = length >= this.rules.title.minLength && length <= this.rules.title.maxLength;

    const issues: TitleIssue[] = [];
    let score = 100;

    if (!content) {
      issues.push({
        type: 'missing',
        severity: 'critical',
        description: '缺少页面标题',
        suggestion: '添加描述性的页面标题',
      });
      score = 0;
    } else {
      if (length < this.rules.title.minLength) {
        issues.push({
          type: 'too-short',
          severity: 'high',
          description: `标题过短 (${length}字符)`,
          suggestion: `标题长度建议在${this.rules.title.minLength}-${this.rules.title.maxLength}字符之间`,
        });
        score -= 30;
      } else if (length > this.rules.title.maxLength) {
        issues.push({
          type: 'too-long',
          severity: 'high',
          description: `标题过长 (${length}字符)`,
          suggestion: `标题长度建议在${this.rules.title.minLength}-${this.rules.title.maxLength}字符之间`,
        });
        score -= 20;
      }

      // 检查标题质量
      if (content.toLowerCase() === content) {
        issues.push({
          type: 'case',
          severity: 'medium',
          description: '标题全部小写',
          suggestion: '使用适当的大小写格式',
        });
        score -= 10;
      }

      if (content.includes('Untitled') || content.includes('无标题')) {
        issues.push({
          type: 'default',
          severity: 'high',
          description: '使用默认标题',
          suggestion: '使用描述性的自定义标题',
        });
        score -= 25;
      }
    }

    const preview = this.generateSearchPreview(content, metaData.description);

    return {
      content,
      length,
      optimized,
      issues,
      score: Math.max(0, score),
      preview,
    };
  }

  /**
   * 分析描述
   */
  private analyzeDescription(metaData: any): DescriptionAnalysis {
    const content = metaData.description || '';
    const length = content.length;
    const optimized =
      length >= this.rules.description.minLength && length <= this.rules.description.maxLength;

    const issues: DescriptionIssue[] = [];
    let score = 100;

    if (!content) {
      issues.push({
        type: 'missing',
        severity: 'critical',
        description: '缺少Meta描述',
        suggestion: '添加描述性的Meta描述',
      });
      score = 0;
    } else {
      if (length < this.rules.description.minLength) {
        issues.push({
          type: 'too-short',
          severity: 'high',
          description: `描述过短 (${length}字符)`,
          suggestion: `描述长度建议在${this.rules.description.minLength}-${this.rules.description.maxLength}字符之间`,
        });
        score -= 25;
      } else if (length > this.rules.description.maxLength) {
        issues.push({
          type: 'too-long',
          severity: 'medium',
          description: `描述过长 (${length}字符)`,
          suggestion: `描述长度建议在${this.rules.description.minLength}-${this.rules.description.maxLength}字符之间`,
        });
        score -= 15;
      }

      // 检查描述质量
      if (content.toLowerCase() === content) {
        issues.push({
          type: 'case',
          severity: 'low',
          description: '描述全部小写',
          suggestion: '使用适当的大小写格式',
        });
        score -= 5;
      }

      if (content.includes(metaData.title)) {
        issues.push({
          type: 'duplicate',
          severity: 'medium',
          description: '描述包含标题内容',
          suggestion: '描述应该是独立的，不要重复标题内容',
        });
        score -= 10;
      }

      if (content.split(/\s+/).length < 10) {
        issues.push({
          type: 'content',
          severity: 'medium',
          description: '描述内容过于简单',
          suggestion: '提供更详细的描述内容',
        });
        score -= 10;
      }
    }

    const preview = this.generateSearchPreview(metaData.title, content);

    return {
      content,
      length,
      optimized,
      issues,
      score: Math.max(0, score),
      preview,
    };
  }

  /**
   * 分析关键词
   */
  private analyzeKeywords(metaData: any): KeywordsAnalysis {
    const content = metaData.keywords || '';
    const keywords = content
      ? content
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0)
      : [];
    const count = keywords.length;
    const optimized =
      count > 0 &&
      count <= this.rules.keywords.maxCount &&
      content.length <= this.rules.keywords.maxLength;

    const issues: KeywordsIssue[] = [];
    let score = 100;

    if (!content) {
      issues.push({
        type: 'missing',
        severity: 'low',
        description: '缺少Meta关键词',
        suggestion: '添加相关的关键词标签',
      });
      score -= 10;
    } else {
      if (count > this.rules.keywords.maxCount) {
        issues.push({
          type: 'too-many',
          severity: 'medium',
          description: `关键词过多 (${count}个)`,
          suggestion: `关键词数量建议不超过${this.rules.keywords.maxCount}个`,
        });
        score -= 15;
      }

      if (content.length > this.rules.keywords.maxLength) {
        issues.push({
          type: 'too-long',
          severity: 'medium',
          description: `关键词内容过长`,
          suggestion: `关键词长度建议不超过${this.rules.keywords.maxLength}字符`,
        });
        score -= 10;
      }

      // 检查关键词质量
      const duplicateKeywords = keywords.filter((k, i) => keywords.indexOf(k) !== i);
      if (duplicateKeywords.length > 0) {
        issues.push({
          type: 'duplicate',
          severity: 'medium',
          description: '存在重复关键词',
          suggestion: '移除重复的关键词',
        });
        score -= 10;
      }

      const shortKeywords = keywords.filter(k => k.length < 2);
      if (shortKeywords.length > 0) {
        issues.push({
          type: 'too-short',
          severity: 'low',
          description: '存在过短的关键词',
          suggestion: '关键词长度建议至少2个字符',
        });
        score -= 5;
      }
    }

    return {
      content,
      keywords,
      count,
      optimized,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析Open Graph
   */
  private analyzeOpenGraph(metaData: any): OpenGraphAnalysis {
    const tags = metaData.openGraph || [];
    const present = tags.length > 0;

    const requiredTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const presentTags = tags.map(tag => tag.property);

    const issues: string[] = [];
    let score = 100;

    if (!present) {
      issues.push('缺少Open Graph标签');
      score = 0;
    } else {
      // 检查必需标签
      requiredTags.forEach(required => {
        if (!presentTags.includes(required)) {
          issues.push(`缺少${required}标签`);
          score -= 20;
        }
      });

      // 检查标签质量
      tags.forEach(tag => {
        if (!tag.content) {
          issues.push(`${tag.property}标签内容为空`);
          score -= 10;
        }
      });
    }

    const analyzedTags = tags.map(tag => ({
      property: tag.property,
      content: tag.content,
      valid: !!tag.content,
      issues: !tag.content ? ['内容为空'] : [],
    }));

    return {
      present,
      tags: analyzedTags,
      optimized: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析Twitter Cards
   */
  private analyzeTwitter(metaData: any): TwitterAnalysis {
    const tags = metaData.twitter || [];
    const present = tags.length > 0;

    const requiredTags = ['twitter:card', 'twitter:title', 'twitter:description'];
    const presentTags = tags.map(tag => tag.name);

    const issues: string[] = [];
    let score = 100;

    if (!present) {
      issues.push('缺少Twitter Cards标签');
      score = 0;
    } else {
      // 检查必需标签
      requiredTags.forEach(required => {
        if (!presentTags.includes(required)) {
          issues.push(`缺少${required}标签`);
          score -= 20;
        }
      });

      // 检查标签质量
      tags.forEach(tag => {
        if (!tag.content) {
          issues.push(`${tag.name}标签内容为空`);
          score -= 10;
        }
      });
    }

    const analyzedTags = tags.map(tag => ({
      name: tag.name,
      content: tag.content,
      valid: !!tag.content,
      issues: !tag.content ? ['内容为空'] : [],
    }));

    return {
      present,
      tags: analyzedTags,
      optimized: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 分析其他Meta标签
   */
  private analyzeOtherMeta(metaData: any): OtherMetaAnalysis {
    const issues: string[] = [];
    let score = 100;

    // 检查Canonical
    if (!metaData.canonical) {
      issues.push('缺少Canonical URL');
      score -= 15;
    }

    // 检查Robots
    if (!metaData.robots) {
      issues.push('缺少Robots标签');
      score -= 10;
    }

    // 检查Viewport
    if (!metaData.viewport) {
      issues.push('缺少Viewport标签');
      score -= 20;
    } else if (!metaData.viewport.includes('width')) {
      issues.push('Viewport标签缺少width设置');
      score -= 10;
    }

    // 检查语言
    if (!metaData.language) {
      issues.push('缺少语言设置');
      score -= 5;
    }

    // 检查Favicon
    if (!metaData.favicon) {
      issues.push('缺少Favicon');
      score -= 5;
    }

    return {
      canonical: metaData.canonical,
      robots: metaData.robots,
      viewport: metaData.viewport,
      language: metaData.language,
      author: metaData.author,
      favicon: metaData.favicon,
      issues,
      score: Math.max(0, score),
    };
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    title: TitleAnalysis,
    description: DescriptionAnalysis,
    keywords: KeywordsAnalysis,
    openGraph: OpenGraphAnalysis,
    twitter: TwitterAnalysis,
    other: OtherMetaAnalysis
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    optimized: boolean;
  } {
    const weights = {
      title: 0.3,
      description: 0.25,
      keywords: 0.1,
      openGraph: 0.15,
      twitter: 0.1,
      other: 0.1,
    };

    const overallScore =
      title.score * weights.title +
      description.score * weights.description +
      keywords.score * weights.keywords +
      openGraph.score * weights.openGraph +
      twitter.score * weights.twitter +
      other.score * weights.other;

    const grade = this.getGrade(overallScore);
    const optimized = overallScore >= 85;

    return {
      score: Math.round(overallScore),
      grade,
      optimized,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    title: TitleAnalysis,
    description: DescriptionAnalysis,
    keywords: KeywordsAnalysis,
    openGraph: OpenGraphAnalysis,
    twitter: TwitterAnalysis,
    other: OtherMetaAnalysis
  ): MetaTagRecommendation[] {
    const recommendations: MetaTagRecommendation[] = [];

    // 标题建议
    if (!title.optimized) {
      recommendations.push({
        priority: 'high',
        category: 'title',
        title: '优化页面标题',
        description: '改进标题长度和内容质量',
        examples: [
          {
            title: '标题优化示例',
            language: 'html',
            code: `<title>优化后的页面标题 - 网站名称</title>`,
            explanation: '标题长度在30-60字符之间，包含主要关键词',
          },
        ],
        impact: '提升搜索排名和点击率',
        effort: 'low',
      });
    }

    // 描述建议
    if (!description.optimized) {
      recommendations.push({
        priority: 'high',
        category: 'description',
        title: '优化Meta描述',
        description: '改进描述长度和内容质量',
        examples: [
          {
            title: '描述优化示例',
            language: 'html',
            code: `<meta name="description" content="这是一个优化的页面描述，长度在120-160字符之间，包含关键词和吸引人的内容。">`,
            explanation: '描述长度在120-160字符之间，独立于标题内容',
          },
        ],
        impact: '提升搜索排名和点击率',
        effort: 'low',
      });
    }

    // Open Graph建议
    if (!openGraph.optimized) {
      recommendations.push({
        priority: 'medium',
        category: 'opengraph',
        title: '添加Open Graph标签',
        description: '完善社交媒体分享显示效果',
        examples: [
          {
            title: 'Open Graph示例',
            language: 'html',
            code: `<meta property="og:title" content="页面标题">
<meta property="og:description" content="页面描述">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/page">`,
            explanation: '添加完整的Open Graph标签以优化社交媒体分享',
          },
        ],
        impact: '改善社交媒体分享效果',
        effort: 'medium',
      });
    }

    // Twitter Cards建议
    if (!twitter.optimized) {
      recommendations.push({
        priority: 'medium',
        category: 'twitter',
        title: '添加Twitter Cards标签',
        description: '完善Twitter分享显示效果',
        examples: [
          {
            title: 'Twitter Cards示例',
            language: 'html',
            code: `<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="页面标题">
<meta name="twitter:description" content="页面描述">
<meta name="twitter:image" content="https://example.com/image.jpg">`,
            explanation: '添加Twitter Cards标签以优化Twitter分享',
          },
        ],
        impact: '改善Twitter分享效果',
        effort: 'medium',
      });
    }

    // 其他Meta标签建议
    if (other.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'other',
        title: '完善其他Meta标签',
        description: '添加Canonical、Robots、Viewport等重要标签',
        examples: [
          {
            title: '其他Meta标签示例',
            language: 'html',
            code: `<link rel="canonical" href="https://example.com/page">
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<html lang="zh-CN">`,
            explanation: '添加重要的技术性Meta标签',
          },
        ],
        impact: '改善SEO和技术实现',
        effort: 'low',
      });
    }

    return recommendations;
  }

  /**
   * 生成搜索预览
   */
  private generateSearchPreview(title: string, description: string): string {
    const maxLength = 160;
    let preview = title;

    if (description) {
      preview += ' - ' + description;
    }

    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength - 3) + '...';
    }

    return preview;
  }

  /**
   * 创建空的Open Graph分析结果
   */
  private createEmptyOpenGraph(): OpenGraphAnalysis {
    return {
      present: false,
      tags: [],
      optimized: false,
      issues: ['未检查Open Graph标签'],
      score: 0,
    };
  }

  /**
   * 创建空的Twitter分析结果
   */
  private createEmptyTwitter(): TwitterAnalysis {
    return {
      present: false,
      tags: [],
      optimized: false,
      issues: ['未检查Twitter Cards标签'],
      score: 0,
    };
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
  getRules(): MetaTagRules {
    return { ...this.rules };
  }

  /**
   * 设置规则配置
   */
  setRules(rules: Partial<MetaTagRules>): void {
    this.rules = { ...this.rules, ...rules };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: MetaTagAnalysisResult): string {
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

export default MetaTagAnalyzer;
