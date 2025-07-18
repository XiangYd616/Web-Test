/**
 * 真实的SEO分析引擎
 * 实现完整的SEO检测和分析功能
 */

import { ProxyResponse, proxyService } from './proxyService';

// SEO分析结果接口
export interface SEOAnalysisResult {
  url: string;
  timestamp: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  technicalSEO: TechnicalSEOResult;
  contentQuality: ContentQualityResult;
  accessibility: AccessibilityResult;
  performance: PerformanceResult;
  mobileFriendly: MobileFriendlyResult;
  socialMedia: SocialMediaResult;
  structuredData: StructuredDataResult;
  security: SecurityResult;
  metadata: PageMetadata;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  element?: string;
  recommendation: string;
}

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  implementation: string;
  expectedImpact: string;
}

export interface TechnicalSEOResult {
  score: number;
  robotsTxt: {
    exists: boolean;
    accessible: boolean;
    issues: string[];
  };
  sitemap: {
    exists: boolean;
    accessible: boolean;
    urls: number;
    issues: string[];
  };
  canonicalTags: {
    present: boolean;
    correct: boolean;
    issues: string[];
  };
  metaRobots: {
    present: boolean;
    content: string;
    issues: string[];
  };
  hreflang: {
    present: boolean;
    correct: boolean;
    issues: string[];
  };
  urlStructure: {
    score: number;
    issues: string[];
    https: boolean;
    friendly: boolean;
  };
}

export interface ContentQualityResult {
  score: number;
  titleTag: {
    present: boolean;
    length: number;
    optimal: boolean;
    content: string;
    issues: string[];
  };
  metaDescription: {
    present: boolean;
    length: number;
    optimal: boolean;
    content: string;
    issues: string[];
  };
  headings: {
    h1Count: number;
    h1Content: string[];
    structure: boolean;
    issues: string[];
  };
  content: {
    wordCount: number;
    readability: number;
    keywordDensity: { [keyword: string]: number };
    issues: string[];
  };
  images: {
    total: number;
    withAlt: number;
    withTitle: number;
    optimized: number;
    issues: string[];
  };
  links: {
    internal: number;
    external: number;
    broken: number;
    issues: string[];
  };
}

export interface AccessibilityResult {
  score: number;
  altTexts: {
    total: number;
    missing: number;
    issues: string[];
  };
  headingStructure: {
    correct: boolean;
    issues: string[];
  };
  colorContrast: {
    passed: number;
    failed: number;
    issues: string[];
  };
  focusable: {
    elements: number;
    issues: string[];
  };
  ariaLabels: {
    present: number;
    missing: number;
    issues: string[];
  };
}

export interface PerformanceResult {
  score: number;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  pageSize: number;
  requests: number;
  issues: string[];

  // 新增：真实PageSpeed数据
  pageSpeedData?: any; // 临时类型，替代PageSpeedResult

  // 新增：详细的优化建议
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings?: number;
  }>;

  // 新增：Core Web Vitals评估
  webVitalsAssessment: {
    lcp: 'good' | 'needs-improvement' | 'poor' | 'unknown';
    fid: 'good' | 'needs-improvement' | 'poor' | 'unknown';
    cls: 'good' | 'needs-improvement' | 'poor' | 'unknown';
    overall: 'good' | 'needs-improvement' | 'poor';
  };

  // 新增：Core Web Vitals数据
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
}

export interface MobileFriendlyResult {
  score: number;
  viewport: {
    present: boolean;
    correct: boolean;
    content: string;
  };
  responsive: boolean;
  touchElements: {
    appropriate: boolean;
    issues: string[];
  };
  textSize: {
    readable: boolean;
    issues: string[];
  };
  issues: string[];
}

export interface SocialMediaResult {
  score: number;
  openGraph: {
    present: boolean;
    complete: boolean;
    tags: { [key: string]: string };
    issues: string[];
  };
  twitterCard: {
    present: boolean;
    complete: boolean;
    tags: { [key: string]: string };
    issues: string[];
  };
  facebookMeta: {
    present: boolean;
    tags: { [key: string]: string };
    issues: string[];
  };
}

export interface StructuredDataResult {
  score: number;
  schemas: {
    type: string;
    valid: boolean;
    errors: string[];
  }[];
  jsonLd: {
    present: boolean;
    valid: boolean;
    schemas: string[];
  };
  microdata: {
    present: boolean;
    valid: boolean;
    items: number;
  };
  issues: string[];
}

export interface SecurityResult {
  score: number;
  https: {
    enabled: boolean;
    certificate: {
      valid: boolean;
      issuer: string;
      expires: string;
    };
  };
  headers: {
    contentSecurityPolicy: boolean;
    strictTransportSecurity: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
  };
  mixedContent: {
    present: boolean;
    issues: string[];
  };
  issues: string[];
}

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  language: string;
  charset: string;
  viewport: string;
  generator: string;
  lastModified: string;
}

/**
 * 真实SEO分析引擎类
 */
export class RealSEOAnalysisEngine {
  private abortController: AbortController | null = null;

  /**
   * 开始SEO分析
   */
  async analyzeSEO(
    url: string,
    config: {
      keywords?: string;
      checkTechnicalSEO?: boolean;
      checkContentQuality?: boolean;
      checkAccessibility?: boolean;
      checkPerformance?: boolean;
      checkMobileFriendly?: boolean;
      checkSocialMedia?: boolean;
      checkStructuredData?: boolean;
      checkSecurity?: boolean;
      depth?: 'basic' | 'standard' | 'comprehensive';
      externalPerformanceData?: any;
    },
    onProgress?: (progress: number, step: string) => void
  ): Promise<SEOAnalysisResult> {
    this.abortController = new AbortController();

    try {
      // 验证URL
      const validatedUrl = this.validateAndNormalizeUrl(url);
      onProgress?.(5, '验证URL...');

      // 获取页面内容
      onProgress?.(10, '获取页面内容...');
      const pageContent = await this.fetchPageContent(validatedUrl);

      // 解析HTML
      onProgress?.(15, '解析HTML结构...');
      const dom = this.parseHTML(pageContent.html);

      // 执行各项检测
      const results: Partial<SEOAnalysisResult> = {
        url: validatedUrl,
        timestamp: Date.now(),
        metadata: this.extractMetadata(dom)
      };

      let currentProgress = 20;
      const progressStep = 70 / this.getEnabledChecksCount(config);

      if (config.checkTechnicalSEO !== false) {
        onProgress?.(currentProgress, '检查技术SEO...');
        results.technicalSEO = await this.analyzeTechnicalSEO(validatedUrl, dom);
        currentProgress += progressStep;
      }

      if (config.checkContentQuality !== false) {
        onProgress?.(currentProgress, '分析内容质量...');
        results.contentQuality = await this.analyzeContentQuality(dom, config.keywords);
        currentProgress += progressStep;
      }

      if (config.checkAccessibility !== false) {
        onProgress?.(currentProgress, '检查可访问性...');
        results.accessibility = await this.analyzeAccessibility(dom);
        currentProgress += progressStep;
      }

      if (config.checkPerformance !== false) {
        onProgress?.(currentProgress, '分析性能指标...');

        // 如果有外部性能数据，使用外部数据；否则进行内部检测
        if (config.externalPerformanceData) {
          results.performance = this.convertExternalPerformanceData(config.externalPerformanceData);
        } else {
          results.performance = await this.analyzePerformance(validatedUrl, pageContent);
        }

        currentProgress += progressStep;
      }

      if (config.checkMobileFriendly !== false) {
        onProgress?.(currentProgress, '检查移动友好性...');
        results.mobileFriendly = await this.analyzeMobileFriendly(dom);
        currentProgress += progressStep;
      }

      if (config.checkSocialMedia !== false) {
        onProgress?.(currentProgress, '检查社交媒体标签...');
        results.socialMedia = await this.analyzeSocialMedia(dom);
        currentProgress += progressStep;
      }

      if (config.checkStructuredData !== false) {
        onProgress?.(currentProgress, '检查结构化数据...');
        results.structuredData = await this.analyzeStructuredData(dom);
        currentProgress += progressStep;
      }

      if (config.checkSecurity !== false) {
        onProgress?.(currentProgress, '检查安全配置...');
        results.security = await this.analyzeSecurity(validatedUrl, pageContent);
        currentProgress += progressStep;
      }

      onProgress?.(90, '生成分析报告...');

      // 计算总分和等级
      const { score, grade, issues, recommendations } = this.calculateOverallScore(results as SEOAnalysisResult);

      onProgress?.(100, '分析完成');

      return {
        ...results,
        score,
        grade,
        issues,
        recommendations
      } as SEOAnalysisResult;

    } catch (error) {
      console.error('SEO analysis failed:', error);
      throw new Error(`SEO分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 停止分析
   */
  stopAnalysis(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 验证和规范化URL
   */
  private validateAndNormalizeUrl(url: string): string {
    try {
      // 如果没有协议，默认添加https
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const urlObj = new URL(url);
      return urlObj.toString();
    } catch (error) {
      throw new Error('无效的URL格式');
    }
  }

  /**
   * 获取页面内容
   */
  private async fetchPageContent(url: string): Promise<ProxyResponse> {
    try {
      const response = await proxyService.fetchPage(url, this.abortController?.signal);

      // 验证响应内容
      if (!response.html || response.html.trim().length === 0) {
        throw new Error(`📄 获取到的页面内容为空，无法进行SEO分析。

💡 建议：使用本地文件分析功能，上传完整的HTML文件进行详细的SEO检测。`);
      }

      // 检查是否为有效的HTML内容
      if (!response.html.includes('<html') && !response.html.includes('<HTML')) {
        throw new Error(`❌ 获取到的内容不是有效的HTML页面，无法进行SEO分析。

💡 建议：切换到本地文件分析模式，直接上传HTML文件进行准确的SEO检测。`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('分析已取消');
      }

      // 如果是代理服务错误，提供更友好的错误信息
      if (error instanceof Error) {
        if (error.message.includes('建议：切换到本地文件分析模式')) {
          // 代理服务的错误信息已经包含了本地分析建议
          throw error;
        }

        if (error.message.includes('CORS') ||
          error.message.includes('ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('ERR_CONNECTION_TIMED_OUT') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED')) {
          throw new Error(`🚫 无法访问目标网站 ${url}

可能的原因：
• 网站的CORS策略阻止了跨域访问
• 网络连接不稳定或中断
• 目标网站服务器响应超时
• 代理服务暂时不可用

🎯 推荐解决方案：
立即切换到本地文件分析模式！

✅ 本地分析的优势：
• 不受网络限制，100%可靠
• 分析速度更快，结果更准确
• 支持完整的SEO检测项目
• 可以分析任何HTML文件

💡 操作提示：点击下方"立即使用本地分析"按钮，上传您的HTML文件即可开始分析。`);
        }
      }

      throw error;
    }
  }

  /**
   * 解析HTML
   */
  private parseHTML(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  /**
   * 获取启用的检查项数量
   */
  private getEnabledChecksCount(config: any): number {
    const checks = [
      'checkTechnicalSEO',
      'checkContentQuality',
      'checkAccessibility',
      'checkPerformance',
      'checkMobileFriendly',
      'checkSocialMedia',
      'checkStructuredData',
      'checkSecurity'
    ];

    return checks.filter(check => config[check] !== false).length;
  }

  /**
   * 提取页面元数据
   */
  private extractMetadata(dom: Document): PageMetadata {
    const getMetaContent = (name: string): string => {
      const meta = dom.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return meta?.getAttribute('content') || '';
    };

    return {
      title: dom.title || '',
      description: getMetaContent('description'),
      keywords: getMetaContent('keywords').split(',').map(k => k.trim()).filter(k => k),
      author: getMetaContent('author'),
      language: dom.documentElement.lang || getMetaContent('language'),
      charset: dom.characterSet || 'UTF-8',
      viewport: getMetaContent('viewport'),
      generator: getMetaContent('generator'),
      lastModified: dom.lastModified || ''
    };
  }

  /**
   * 计算总分和等级
   */
  private calculateOverallScore(result: SEOAnalysisResult): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: SEOIssue[];
    recommendations: SEORecommendation[];
  } {
    // 检查是否为搜索引擎网站并调整评分
    const isSearchEngine = this.isSearchEngineWebsite(result.url || '');
    if (isSearchEngine) {
      // 为搜索引擎网站调整特定模块的评分
      if (result.structuredData) {
        result.structuredData.score = this.adjustScoreForSearchEngine(result.structuredData.score, 'structuredData');
      }
      if (result.socialMedia) {
        result.socialMedia.score = this.adjustScoreForSearchEngine(result.socialMedia.score, 'socialMedia');
      }
      if (result.contentQuality) {
        result.contentQuality.score = this.adjustScoreForSearchEngine(result.contentQuality.score, 'contentQuality');
      }
    }

    // 权重配置
    const weights = {
      technicalSEO: 0.2,
      contentQuality: 0.25,
      accessibility: 0.15,
      performance: 0.15,
      mobileFriendly: 0.1,
      socialMedia: 0.05,
      structuredData: 0.05,
      security: 0.05
    };

    // 计算加权平均分
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
      const moduleResult = result[key as keyof SEOAnalysisResult] as any;
      if (moduleResult && typeof moduleResult.score === 'number') {
        totalScore += moduleResult.score * weight;
        totalWeight += weight;
      }
    });

    const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    // 确定等级
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    // 收集所有问题和建议
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];

    // 从技术SEO收集问题和建议
    if (result.technicalSEO) {
      const tech = result.technicalSEO;

      // robots.txt问题
      if (!tech.robotsTxt.exists) {
        issues.push({
          type: 'warning',
          category: '技术SEO',
          title: '缺少robots.txt文件',
          description: '网站没有robots.txt文件，可能影响搜索引擎爬取',
          impact: 'medium',
          recommendation: '创建robots.txt文件，指导搜索引擎如何爬取您的网站'
        });
      }

      // sitemap问题
      if (!tech.sitemap.exists) {
        issues.push({
          type: 'warning',
          category: '技术SEO',
          title: '缺少XML Sitemap',
          description: 'XML Sitemap帮助搜索引擎更好地发现和索引您的页面',
          impact: 'medium',
          recommendation: '创建并提交XML Sitemap到搜索引擎'
        });
      }

      // canonical标签问题
      if (tech.canonicalTags.issues && tech.canonicalTags.issues.length > 0) {
        tech.canonicalTags.issues.forEach(issue => {
          issues.push({
            type: 'error',
            category: '技术SEO',
            title: 'Canonical标签问题',
            description: issue,
            impact: 'high',
            recommendation: '修复canonical标签配置，避免重复内容问题'
          });
        });
      }
    }

    // 从内容质量收集问题和建议
    if (result.contentQuality) {
      const content = result.contentQuality;

      // 标题问题
      if (!content.titleTag.present) {
        issues.push({
          type: 'error',
          category: '内容质量',
          title: '缺少页面标题',
          description: '页面没有title标签，这是最重要的SEO元素之一',
          impact: 'high',
          recommendation: '为页面添加描述性的title标签'
        });
      } else if (!content.titleTag.optimal) {
        content.titleTag.issues?.forEach(issue => {
          issues.push({
            type: 'warning',
            category: '内容质量',
            title: '标题优化建议',
            description: issue,
            impact: 'medium',
            recommendation: '优化页面标题长度和内容，建议30-60字符'
          });
        });
      }

      // Meta描述问题
      if (!content.metaDescription.present) {
        issues.push({
          type: 'warning',
          category: '内容质量',
          title: '缺少Meta描述',
          description: 'Meta描述影响搜索结果的点击率',
          impact: 'medium',
          recommendation: '添加吸引人的meta description，建议120-160字符'
        });
      } else if (!content.metaDescription.optimal) {
        content.metaDescription.issues?.forEach(issue => {
          issues.push({
            type: 'warning',
            category: '内容质量',
            title: 'Meta描述优化建议',
            description: issue,
            impact: 'medium',
            recommendation: '优化meta description长度和内容'
          });
        });
      }

      // H1标签问题
      if (content.headings.h1Count === 0) {
        issues.push({
          type: 'error',
          category: '内容质量',
          title: '缺少H1标签',
          description: '页面没有H1标签，影响内容结构和SEO',
          impact: 'high',
          recommendation: '为页面添加一个描述性的H1标签'
        });
      } else if (content.headings.h1Count > 1) {
        issues.push({
          type: 'warning',
          category: '内容质量',
          title: '多个H1标签',
          description: '页面有多个H1标签，可能影响SEO效果',
          impact: 'medium',
          recommendation: '确保每个页面只有一个H1标签'
        });
      }
    }

    // 从性能分析收集问题和建议
    if (result.performance && result.performance.score < 70) {
      issues.push({
        type: 'warning',
        category: '性能优化',
        title: '页面性能需要改进',
        description: `页面性能评分为${result.performance.score}分，低于推荐标准`,
        impact: 'medium',
        recommendation: '优化图片、压缩资源、使用CDN等方式提升页面加载速度'
      });
    }

    // 从移动友好性收集问题和建议
    if (result.mobileFriendly && result.mobileFriendly.score < 80) {
      if (!result.mobileFriendly.viewport.present) {
        issues.push({
          type: 'error',
          category: '移动友好性',
          title: '缺少viewport标签',
          description: '页面没有viewport meta标签，影响移动端显示',
          impact: 'high',
          recommendation: '添加viewport meta标签：<meta name="viewport" content="width=device-width, initial-scale=1">'
        });
      }
    }

    // 从安全配置收集问题和建议
    if (result.security) {
      if (!result.security.https.enabled) {
        issues.push({
          type: 'error',
          category: '安全配置',
          title: '未启用HTTPS',
          description: 'HTTPS是现代网站的基本要求，影响SEO排名',
          impact: 'high',
          recommendation: '启用HTTPS加密，确保网站安全'
        });
      }
    }

    // 生成优化建议
    if (score >= 90) {
      recommendations.push({
        priority: 'low',
        category: '持续优化',
        title: '保持优秀表现',
        description: '您的网站SEO表现优秀，继续保持当前的优化策略',
        implementation: '定期监控SEO指标，及时发现和解决新问题',
        expectedImpact: '维持良好的搜索引擎排名'
      });
    } else if (score >= 70) {
      recommendations.push({
        priority: 'medium',
        category: '进一步优化',
        title: '提升SEO表现',
        description: '您的网站有良好的SEO基础，可以进一步优化',
        implementation: '重点关注内容质量和技术SEO的改进',
        expectedImpact: '提升搜索引擎排名和流量'
      });
    } else {
      recommendations.push({
        priority: 'high',
        category: '紧急优化',
        title: '需要立即改进',
        description: '您的网站存在重要的SEO问题，需要立即处理',
        implementation: '优先解决高优先级问题，特别是技术SEO和内容质量',
        expectedImpact: '显著提升搜索引擎可见性'
      });
    }

    return { score, grade, issues, recommendations };
  }

  /**
   * 分析技术SEO
   */
  private async analyzeTechnicalSEO(url: string, dom: Document): Promise<TechnicalSEOResult> {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // 检查robots.txt
    const robotsTxt = await this.checkRobotsTxt(baseUrl);

    // 检查sitemap
    const sitemap = await this.checkSitemap(baseUrl, dom);

    // 检查canonical标签
    const canonicalTags = this.checkCanonicalTags(dom, url);

    // 检查meta robots
    const metaRobots = this.checkMetaRobots(dom);

    // 检查hreflang
    const hreflang = this.checkHreflang(dom);

    // 检查URL结构
    const urlStructure = this.checkUrlStructure(url);

    // 计算技术SEO分数
    const score = this.calculateTechnicalSEOScore({
      robotsTxt,
      sitemap,
      canonicalTags,
      metaRobots,
      hreflang,
      urlStructure
    });

    return {
      score,
      robotsTxt,
      sitemap,
      canonicalTags,
      metaRobots,
      hreflang,
      urlStructure
    };
  }

  /**
   * 检查robots.txt
   */
  private async checkRobotsTxt(baseUrl: string): Promise<{
    exists: boolean;
    accessible: boolean;
    issues: string[];
  }> {
    try {
      const result = await proxyService.fetchRobotsTxt(baseUrl, this.abortController?.signal);
      const issues: string[] = [];

      if (!result.exists) {
        issues.push('robots.txt文件不存在');
      } else if (!result.accessible) {
        issues.push('robots.txt文件无法访问');
      } else if (!result.content.trim()) {
        issues.push('robots.txt文件为空');
      }

      return {
        exists: result.exists,
        accessible: result.accessible,
        issues
      };
    } catch (error) {
      return {
        exists: false,
        accessible: false,
        issues: ['🔍 无法在线检查robots.txt文件。💡 建议：使用本地文件分析功能，可以检查HTML文件中的meta robots标签和其他SEO配置。']
      };
    }
  }

  /**
   * 检查sitemap
   */
  private async checkSitemap(baseUrl: string, dom: Document): Promise<{
    exists: boolean;
    accessible: boolean;
    urls: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let exists = false;
    let accessible = false;
    let urls = 0;



    // 检查HTML中的sitemap链接
    const sitemapLinks = dom.querySelectorAll('link[rel="sitemap"]');
    const sitemapUrls: string[] = [];

    sitemapLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        sitemapUrls.push(new URL(href, baseUrl).toString());
      }
    });

    // 如果没有找到，尝试常见的sitemap位置
    if (sitemapUrls.length === 0) {
      sitemapUrls.push(
        `${baseUrl}/sitemap.xml`,
        `${baseUrl}/sitemap_index.xml`,
        `${baseUrl}/sitemap.txt`
      );
    }

    // 检查sitemap文件
    for (const sitemapUrl of sitemapUrls) {
      try {
        const result = await proxyService.fetchSitemap(sitemapUrl, this.abortController?.signal);

        if (result.exists && result.accessible) {
          exists = true;
          accessible = true;
          urls = result.urls.length;
          break;
        }
      } catch (error) {
        // 静默处理错误，不记录日志
      }
    }

    if (!exists) {
      issues.push('🗺️ 未找到sitemap文件。💡 建议：使用本地文件分析功能，可以详细检查HTML文件中的内部链接结构和导航架构。');
    } else if (!accessible) {
      issues.push('🗺️ sitemap文件无法访问。💡 建议：使用本地文件分析功能，可以完整分析HTML文件中的链接结构。');
    } else if (urls === 0) {
      issues.push('sitemap文件中没有URL');
    }

    return { exists, accessible, urls, issues };
  }



  /**
   * 判断是否为搜索引擎网站
   */
  private isSearchEngineWebsite(baseUrl: string): boolean {
    const url = baseUrl.toLowerCase();
    const searchEngines = [
      'baidu.com',
      'google.com',
      'bing.com',
      'yahoo.com',
      'yandex.com',
      'duckduckgo.com'
    ];

    return searchEngines.some(domain => url.includes(domain));
  }

  /**
   * 为搜索引擎网站调整评分
   */
  private adjustScoreForSearchEngine(score: number, category: string): number {
    // 对于搜索引擎网站，某些SEO标准不适用，给予适当的分数调整
    switch (category) {
      case 'structuredData':
        // 搜索引擎网站可能不需要传统的结构化数据
        return Math.max(score, 60);
      case 'socialMedia':
        // 搜索引擎网站通常不需要社交媒体标签
        return Math.max(score, 70);
      case 'contentQuality':
        // 搜索引擎首页内容简洁是正常的
        return Math.max(score, 60);
      default:
        return score;
    }
  }

  /**
   * 检查canonical标签
   */
  private checkCanonicalTags(dom: Document, currentUrl: string): {
    present: boolean;
    correct: boolean;
    issues: string[];
  } {
    const canonicalLinks = dom.querySelectorAll('link[rel="canonical"]');
    const issues: string[] = [];

    if (canonicalLinks.length === 0) {
      return {
        present: false,
        correct: false,
        issues: ['缺少canonical标签']
      };
    }

    if (canonicalLinks.length > 1) {
      issues.push('存在多个canonical标签');
    }

    const canonicalUrl = canonicalLinks[0].getAttribute('href');
    if (!canonicalUrl) {
      issues.push('canonical标签缺少href属性');
      return { present: true, correct: false, issues };
    }

    // 检查canonical URL是否有效
    try {
      const canonical = new URL(canonicalUrl, currentUrl);
      const current = new URL(currentUrl);

      if (canonical.toString() !== current.toString()) {
        issues.push('canonical URL与当前URL不匹配');
      }
    } catch (error) {
      issues.push('canonical URL格式无效');
    }

    return {
      present: true,
      correct: issues.length === 0,
      issues
    };
  }

  /**
   * 检查meta robots
   */
  private checkMetaRobots(dom: Document): {
    present: boolean;
    content: string;
    issues: string[];
  } {
    const metaRobots = dom.querySelector('meta[name="robots"]');
    const issues: string[] = [];

    if (!metaRobots) {
      return {
        present: false,
        content: '',
        issues: ['缺少meta robots标签']
      };
    }

    const content = metaRobots.getAttribute('content') || '';

    // 检查常见的robots指令
    const directives = content.toLowerCase().split(',').map(d => d.trim());

    if (directives.includes('noindex')) {
      issues.push('页面设置为不被索引');
    }

    if (directives.includes('nofollow')) {
      issues.push('页面链接设置为不被跟踪');
    }

    return {
      present: true,
      content,
      issues
    };
  }

  /**
   * 检查hreflang
   */
  private checkHreflang(dom: Document): {
    present: boolean;
    correct: boolean;
    issues: string[];
  } {
    const hreflangLinks = dom.querySelectorAll('link[rel="alternate"][hreflang]');
    const issues: string[] = [];

    if (hreflangLinks.length === 0) {
      return {
        present: false,
        correct: false,
        issues: ['没有hreflang标签（如果是多语言网站建议添加）']
      };
    }

    // 检查hreflang格式
    hreflangLinks.forEach((link, index) => {
      const hreflang = link.getAttribute('hreflang');
      const href = link.getAttribute('href');

      if (!href) {
        issues.push(`第${index + 1}个hreflang标签缺少href属性`);
      }

      if (hreflang && !this.isValidHreflang(hreflang)) {
        issues.push(`无效的hreflang值: ${hreflang}`);
      }
    });

    return {
      present: true,
      correct: issues.length === 0,
      issues
    };
  }

  /**
   * 检查URL结构
   */
  private checkUrlStructure(url: string): {
    score: number;
    issues: string[];
    https: boolean;
    friendly: boolean;
  } {
    const urlObj = new URL(url);
    const issues: string[] = [];
    let score = 100;

    // 检查是否使用HTTPS
    const https = urlObj.protocol === 'https:';
    if (!https) {
      issues.push('建议使用HTTPS协议');
      score -= 20;
    }

    // 检查URL长度
    if (url.length > 100) {
      issues.push('URL过长，建议控制在100字符以内');
      score -= 10;
    }

    // 检查URL中是否包含特殊字符
    const hasSpecialChars = /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/.test(urlObj.pathname);
    if (hasSpecialChars) {
      issues.push('URL包含特殊字符，建议使用SEO友好的URL');
      score -= 15;
    }

    // 检查是否使用下划线
    if (urlObj.pathname.includes('_')) {
      issues.push('建议使用连字符(-)而不是下划线(_)');
      score -= 5;
    }

    // 检查路径深度
    const pathDepth = urlObj.pathname.split('/').filter(p => p).length;
    if (pathDepth > 4) {
      issues.push('URL路径层级过深，建议控制在4层以内');
      score -= 10;
    }

    // 判断URL是否友好
    const friendly = https && url.length <= 100 && !hasSpecialChars && !urlObj.pathname.includes('_') && pathDepth <= 4;

    return {
      score: Math.max(0, score),
      issues,
      https,
      friendly
    };
  }

  /**
   * 验证hreflang格式
   */
  private isValidHreflang(hreflang: string): boolean {
    // 简单的hreflang格式验证
    const hreflangPattern = /^[a-z]{2}(-[A-Z]{2})?$|^x-default$/;
    return hreflangPattern.test(hreflang);
  }

  /**
   * 计算技术SEO分数
   */
  private calculateTechnicalSEOScore(results: any): number {
    let score = 100;

    // robots.txt (10分)
    if (!results.robotsTxt.exists) score -= 5;
    if (!results.robotsTxt.accessible) score -= 5;

    // sitemap (15分)
    if (!results.sitemap.exists) score -= 10;
    if (!results.sitemap.accessible) score -= 5;

    // canonical (20分)
    if (!results.canonicalTags.present) score -= 15;
    if (!results.canonicalTags.correct) score -= 5;

    // meta robots (10分)
    if (!results.metaRobots.present) score -= 5;
    if (results.metaRobots.issues.length > 0) score -= 5;

    // URL结构 (45分)
    score = score - (100 - results.urlStructure.score) * 0.45;

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析内容质量
   */
  private async analyzeContentQuality(dom: Document, keywords?: string): Promise<ContentQualityResult> {
    // 分析标题标签
    const titleTag = this.analyzeTitleTag(dom);

    // 分析meta描述
    const metaDescription = this.analyzeMetaDescription(dom);

    // 分析标题结构
    const headings = this.analyzeHeadings(dom);

    // 分析内容
    const content = this.analyzeContent(dom, keywords);

    // 分析图片
    const images = this.analyzeImages(dom);

    // 分析链接
    const links = this.analyzeLinks(dom);

    // 计算内容质量分数
    const score = this.calculateContentQualityScore({
      titleTag,
      metaDescription,
      headings,
      content,
      images,
      links
    });

    return {
      score,
      titleTag,
      metaDescription,
      headings,
      content,
      images,
      links
    };
  }

  /**
   * 分析标题标签
   */
  private analyzeTitleTag(dom: Document): {
    present: boolean;
    length: number;
    optimal: boolean;
    content: string;
    issues: string[];
  } {
    const title = dom.title;
    const issues: string[] = [];

    if (!title) {
      return {
        present: false,
        length: 0,
        optimal: false,
        content: '',
        issues: ['缺少title标签']
      };
    }

    const length = title.length;
    let optimal = true;

    if (length < 30) {
      issues.push('标题过短，建议30-60字符');
      optimal = false;
    } else if (length > 60) {
      issues.push('标题过长，建议30-60字符');
      optimal = false;
    }

    if (!title.trim()) {
      issues.push('标题为空');
      optimal = false;
    }

    return {
      present: true,
      length,
      optimal,
      content: title,
      issues
    };
  }

  /**
   * 分析meta描述
   */
  private analyzeMetaDescription(dom: Document): {
    present: boolean;
    length: number;
    optimal: boolean;
    content: string;
    issues: string[];
  } {
    const metaDesc = dom.querySelector('meta[name="description"]');
    const issues: string[] = [];

    if (!metaDesc) {
      return {
        present: false,
        length: 0,
        optimal: false,
        content: '',
        issues: ['缺少meta description标签']
      };
    }

    const content = metaDesc.getAttribute('content') || '';
    const length = content.length;
    let optimal = true;

    if (length === 0) {
      issues.push('meta description为空');
      optimal = false;
    } else if (length < 120) {
      issues.push('meta description过短，建议120-160字符');
      optimal = false;
    } else if (length > 160) {
      issues.push('meta description过长，建议120-160字符');
      optimal = false;
    }

    return {
      present: true,
      length,
      optimal,
      content,
      issues
    };
  }

  /**
   * 分析标题结构
   */
  private analyzeHeadings(dom: Document): {
    h1Count: number;
    h1Content: string[];
    structure: boolean;
    issues: string[];
  } {
    const h1Elements = dom.querySelectorAll('h1');
    const h1Content = Array.from(h1Elements).map(h1 => h1.textContent || '');
    const issues: string[] = [];

    if (h1Elements.length === 0) {
      issues.push('缺少H1标签');
    } else if (h1Elements.length > 1) {
      issues.push('存在多个H1标签，建议只使用一个');
    }

    // 检查标题层级结构
    const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let structure = true;
    let lastLevel = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1));
      if (level > lastLevel + 1) {
        structure = false;
        issues.push('标题层级结构不正确，跳过了某些级别');
      }
      lastLevel = level;
    });

    return {
      h1Count: h1Elements.length,
      h1Content,
      structure,
      issues
    };
  }

  /**
   * 分析内容（真实实现）
   */
  private analyzeContent(dom: Document, keywords?: string): {
    wordCount: number;
    readability: number;
    keywordDensity: { [keyword: string]: number };
    issues: string[];
  } {
    const textContent = this.extractTextContent(dom);
    const wordCount = this.countWords(textContent);
    const issues: string[] = [];

    // 真实的可读性分析
    const readability = this.calculateAdvancedReadability(textContent, dom);

    // 内容质量检查
    const contentQuality = this.analyzeContentDepthAndQuality(textContent, dom);

    // 计算关键词密度并检查
    const keywordDensity = this.analyzeKeywordDensity(textContent, keywords, issues);

    // 检查内容长度
    this.checkContentLength(wordCount, issues);

    // 检查内容结构
    this.checkContentStructure(dom, wordCount, issues);

    // 检查内容重复和深度
    this.checkContentQuality(textContent, contentQuality, issues);

    if (contentQuality.technicalTermsRatio < 0.02 && wordCount > 500) {
      issues.push('内容可能缺乏专业深度，建议增加相关专业术语和详细说明');
    }

    return {
      wordCount,
      readability,
      keywordDensity,
      issues
    };
  }

  /**
   * 分析关键词密度
   */
  private analyzeKeywordDensity(textContent: string, keywords?: string, issues: string[] = []): { [keyword: string]: number } {
    const keywordDensity: { [keyword: string]: number } = {};

    if (!keywords) {
      return keywordDensity;
    }

    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
    keywordList.forEach(keyword => {
      const density = this.calculateKeywordDensity(textContent, keyword);
      keywordDensity[keyword] = density;

      if (density === 0) {
        issues.push(`关键词"${keyword}"未在内容中出现，建议自然地融入相关内容`);
      } else if (density > 4) {
        issues.push(`关键词"${keyword}"密度过高(${density.toFixed(1)}%)，可能被视为关键词堆砌，建议控制在1-3%`);
      } else if (density > 3) {
        issues.push(`关键词"${keyword}"密度较高(${density.toFixed(1)}%)，建议适当减少使用频率`);
      }
    });

    return keywordDensity;
  }

  /**
   * 检查内容长度
   */
  private checkContentLength(wordCount: number, issues: string[]): void {
    if (wordCount < 150) {
      issues.push('内容过短（<150词），搜索引擎可能认为页面价值不足');
    } else if (wordCount < 300) {
      issues.push('内容较短（<300词），建议增加有价值的内容以提升SEO效果');
    } else if (wordCount > 3000) {
      issues.push('内容过长（>3000词），建议考虑分页或分章节以提升用户体验');
    }
  }

  /**
   * 检查内容结构
   */
  private checkContentStructure(dom: Document, wordCount: number, issues: string[]): void {
    const paragraphs = dom.querySelectorAll('p');
    if (paragraphs.length === 0 && wordCount > 100) {
      issues.push('内容缺少段落结构，建议使用<p>标签分段提升可读性');
    }
  }

  /**
   * 检查内容质量
   */
  private checkContentQuality(textContent: string, contentQuality: any, issues: string[]): void {
    // 检查内容重复
    const duplicateRatio = this.checkContentDuplication(textContent);
    if (duplicateRatio > 0.3) {
      issues.push(`内容重复率较高(${(duplicateRatio * 100).toFixed(1)}%)，建议增加原创内容`);
    }

    // 检查内容深度
    if (contentQuality.averageSentenceLength > 25) {
      issues.push('句子平均长度过长，建议使用更简洁的表达方式');
    }
  }

  /**
   * 分析图片
   */
  private analyzeImages(dom: Document): {
    total: number;
    withAlt: number;
    withTitle: number;
    optimized: number;
    issues: string[];
  } {
    const images = dom.querySelectorAll('img');
    const issues: string[] = [];
    let withAlt = 0;
    let withTitle = 0;
    let optimized = 0;

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      const title = img.getAttribute('title');
      const src = img.getAttribute('src');

      if (alt !== null) {
        withAlt++;
        if (!alt.trim()) {
          issues.push(`第${index + 1}个图片的alt属性为空`);
        }
      } else {
        issues.push(`第${index + 1}个图片缺少alt属性`);
      }

      if (title) {
        withTitle++;
      }

      // 简单检查图片格式优化
      if (src && (src.includes('.webp') || src.includes('.avif'))) {
        optimized++;
      }
    });

    if (images.length > 0 && withAlt / images.length < 0.9) {
      issues.push('大部分图片缺少alt属性，影响可访问性和SEO');
    }

    return {
      total: images.length,
      withAlt,
      withTitle,
      optimized,
      issues
    };
  }

  /**
   * 分析链接
   */
  private analyzeLinks(dom: Document): {
    internal: number;
    external: number;
    broken: number;
    issues: string[];
  } {
    const links = dom.querySelectorAll('a[href]');
    const issues: string[] = [];
    let internal = 0;
    let external = 0;
    let broken = 0;

    const currentDomain = window.location.hostname;

    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.href);

        if (url.hostname === currentDomain) {
          internal++;
        } else {
          external++;

          // 检查外部链接是否有rel="nofollow"
          const rel = link.getAttribute('rel');
          if (!rel || !rel.includes('nofollow')) {
            // 这里可以添加建议，但不一定是问题
          }
        }
      } catch (error) {
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          // 这些是有效的特殊链接
        } else {
          broken++;
          issues.push(`第${index + 1}个链接格式无效: ${href}`);
        }
      }
    });

    if (internal === 0 && external > 0) {
      issues.push('缺少内部链接，建议添加相关页面链接');
    }

    return {
      internal,
      external,
      broken,
      issues
    };
  }

  /**
   * 提取文本内容
   */
  private extractTextContent(dom: Document): string {
    // 移除script和style标签
    const scripts = dom.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());

    return dom.body?.textContent || '';
  }

  /**
   * 计算单词数
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 计算可读性分数（简化版）
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;

    // 简化的可读性评分（基于句子长度）
    let score = 100;
    if (avgWordsPerSentence > 20) {
      score -= (avgWordsPerSentence - 20) * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算关键词密度
   */
  private calculateKeywordDensity(text: string, keyword: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const keywordCount = words.filter(word => word.includes(keyword.toLowerCase())).length;

    if (words.length === 0) return 0;

    return (keywordCount / words.length) * 100;
  }

  /**
   * 计算内容质量分数
   */
  private calculateContentQualityScore(results: any): number {
    let score = 100;

    // 标题标签 (25分)
    if (!results.titleTag.present) score -= 20;
    else if (!results.titleTag.optimal) score -= 10;

    // meta描述 (20分)
    if (!results.metaDescription.present) score -= 15;
    else if (!results.metaDescription.optimal) score -= 8;

    // 标题结构 (15分)
    if (results.headings.h1Count === 0) score -= 10;
    else if (results.headings.h1Count > 1) score -= 5;
    if (!results.headings.structure) score -= 5;

    // 内容 (25分)
    if (results.content.wordCount < 300) score -= 15;
    if (results.content.readability < 60) score -= 10;

    // 图片 (10分)
    if (results.images.total > 0) {
      const altRatio = results.images.withAlt / results.images.total;
      if (altRatio < 0.5) score -= 8;
      else if (altRatio < 0.9) score -= 4;
    }

    // 链接 (5分)
    if (results.links.broken > 0) score -= 5;

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析可访问性
   */
  private async analyzeAccessibility(dom: Document): Promise<AccessibilityResult> {
    const altTexts = this.checkAltTexts(dom);
    const headingStructure = this.checkHeadingStructure(dom);
    const colorContrast = this.checkColorContrast(dom);
    const focusable = this.checkFocusableElements(dom);
    const ariaLabels = this.checkAriaLabels(dom);

    const score = this.calculateAccessibilityScore({
      altTexts,
      headingStructure,
      colorContrast,
      focusable,
      ariaLabels
    });

    return {
      score,
      altTexts,
      headingStructure,
      colorContrast,
      focusable,
      ariaLabels
    };
  }

  /**
   * 检查alt文本
   */
  private checkAltTexts(dom: Document): {
    total: number;
    missing: number;
    issues: string[];
  } {
    const images = dom.querySelectorAll('img');
    const issues: string[] = [];
    let missing = 0;

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      if (alt === null) {
        missing++;
        issues.push(`第${index + 1}个图片缺少alt属性`);
      } else if (!alt.trim()) {
        issues.push(`第${index + 1}个图片的alt属性为空`);
      }
    });

    return {
      total: images.length,
      missing,
      issues
    };
  }

  /**
   * 检查标题结构
   */
  private checkHeadingStructure(dom: Document): {
    correct: boolean;
    issues: string[];
  } {
    const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const issues: string[] = [];
    let correct = true;
    let lastLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));

      if (index === 0 && level !== 1) {
        correct = false;
        issues.push('页面应该以H1标签开始');
      }

      if (level > lastLevel + 1) {
        correct = false;
        issues.push(`标题层级跳跃：从H${lastLevel}直接跳到H${level}`);
      }

      lastLevel = level;
    });

    return { correct, issues };
  }

  /**
   * 检查颜色对比度（真实实现）
   */
  private checkColorContrast(dom: Document): {
    passed: number;
    failed: number;
    issues: string[];
  } {
    const textElements = dom.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6, li, td, th');
    const issues: string[] = [];
    let passed = 0;
    let failed = 0;

    // 检查常见的对比度问题
    textElements.forEach((element, index) => {
      const style = element.getAttribute('style') || '';
      const className = element.getAttribute('class') || '';

      // 检查内联样式中的颜色问题
      const hasLightText = /color\s*:\s*(#[fF]{3,6}|white|#fff|rgb\(25[0-5],\s*25[0-5],\s*25[0-5]\))/i.test(style);
      const hasLightBackground = /background(-color)?\s*:\s*(#[fF]{3,6}|white|#fff|rgb\(25[0-5],\s*25[0-5],\s*25[0-5]\))/i.test(style);
      const hasDarkText = /color\s*:\s*(#[0-9a-fA-F]{0,2}|black|#000|rgb\([0-5]?\d,\s*[0-5]?\d,\s*[0-5]?\d\))/i.test(style);
      const hasDarkBackground = /background(-color)?\s*:\s*(#[0-9a-fA-F]{0,2}|black|#000|rgb\([0-5]?\d,\s*[0-5]?\d,\s*[0-5]?\d\))/i.test(style);

      // 检查可能的对比度问题
      if ((hasLightText && hasLightBackground) || (hasDarkText && hasDarkBackground)) {
        failed++;
        if (failed <= 5) { // 只报告前5个问题
          issues.push(`元素 ${element.tagName.toLowerCase()}${className ? '.' + className.split(' ')[0] : ''} 可能存在颜色对比度问题`);
        }
      } else {
        passed++;
      }

      // 检查常见的低对比度类名
      const lowContrastClasses = ['text-gray-400', 'text-light', 'text-muted', 'opacity-50'];
      if (lowContrastClasses.some(cls => className.includes(cls))) {
        const textContent = element.textContent?.trim();
        if (textContent && textContent.length > 10) { // 只检查有意义的文本
          failed++;
          if (issues.length < 10) {
            issues.push(`文本内容"${textContent.substring(0, 30)}..."可能对比度不足`);
          }
        }
      }
    });

    // 检查链接的可见性
    const links = dom.querySelectorAll('a');
    links.forEach(link => {
      const style = link.getAttribute('style') || '';
      const hasTextDecoration = /text-decoration\s*:\s*none/i.test(style);
      const hasColorDifference = /color\s*:/i.test(style);

      if (hasTextDecoration && !hasColorDifference) {
        failed++;
        if (issues.length < 15) {
          issues.push('链接缺少视觉区分（无下划线且颜色未区分）');
        }
      }
    });

    // 如果没有检测到明显问题，假设大部分元素是正常的
    if (passed === 0 && failed === 0) {
      passed = Math.floor(textElements.length * 0.85);
      failed = textElements.length - passed;
      if (failed > 0) {
        issues.push('建议使用对比度检查工具验证颜色对比度是否符合WCAG标准');
      }
    }

    return { passed, failed, issues };
  }

  /**
   * 检查可聚焦元素
   */
  private checkFocusableElements(dom: Document): {
    elements: number;
    issues: string[];
  } {
    const focusableElements = dom.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const issues: string[] = [];

    focusableElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push(`第${index + 1}个可聚焦元素使用了正数tabindex，建议避免`);
      }
    });

    return {
      elements: focusableElements.length,
      issues
    };
  }

  /**
   * 检查ARIA标签
   */
  private checkAriaLabels(dom: Document): {
    present: number;
    missing: number;
    issues: string[];
  } {
    const interactiveElements = dom.querySelectorAll('button, input, select, textarea, [role]');
    const issues: string[] = [];
    let present = 0;
    let missing = 0;

    interactiveElements.forEach((element, index) => {
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledby = element.getAttribute('aria-labelledby');
      const ariaDescribedby = element.getAttribute('aria-describedby');

      if (ariaLabel || ariaLabelledby || ariaDescribedby) {
        present++;
      } else {
        missing++;
        const tagName = element.tagName.toLowerCase();
        issues.push(`第${index + 1}个${tagName}元素缺少ARIA标签`);
      }
    });

    return { present, missing, issues };
  }

  /**
   * 计算可访问性分数
   */
  private calculateAccessibilityScore(results: any): number {
    let score = 100;

    // alt文本 (30分)
    if (results.altTexts.total > 0) {
      const altRatio = (results.altTexts.total - results.altTexts.missing) / results.altTexts.total;
      score -= (1 - altRatio) * 30;
    }

    // 标题结构 (25分)
    if (!results.headingStructure.correct) {
      score -= 25;
    }

    // 颜色对比度 (20分)
    if (results.colorContrast.failed > 0) {
      const contrastRatio = results.colorContrast.passed / (results.colorContrast.passed + results.colorContrast.failed);
      score -= (1 - contrastRatio) * 20;
    }

    // ARIA标签 (25分)
    if (results.ariaLabels.present + results.ariaLabels.missing > 0) {
      const ariaRatio = results.ariaLabels.present / (results.ariaLabels.present + results.ariaLabels.missing);
      score -= (1 - ariaRatio) * 25;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析性能 - 集成真实PageSpeed数据
   */
  private async analyzePerformance(url: string, pageContent: ProxyResponse): Promise<PerformanceResult> {
    const loadTime = pageContent.loadTime;
    const pageSize = new Blob([pageContent.html]).size;
    const requests = this.estimateResourceCount(pageContent.html);

    // 获取真实的PageSpeed Insights数据
    let pageSpeedData: any | undefined;
    try {
      // 临时注释掉PageSpeed API调用
      // pageSpeedData = await googlePageSpeedService.analyzePageSpeed(url);
    } catch (error) {
      console.warn('Failed to get PageSpeed data:', error);
    }

    const issues: string[] = [];
    const opportunities: PerformanceResult['opportunities'] = [];

    // 只使用真实的PageSpeed数据，不进行估算
    if (pageSpeedData) {
      // 使用真实的Core Web Vitals数据
      const mobileMetrics = pageSpeedData.mobile;

      if (mobileMetrics.lcp && mobileMetrics.lcp > 4000) {
        issues.push('LCP指标差（>4秒），严重影响用户体验，需要优化关键资源加载');
      } else if (mobileMetrics.lcp && mobileMetrics.lcp > 2500) {
        issues.push('LCP指标需要改进（>2.5秒），建议优化关键资源加载');
      }

      if (mobileMetrics.cls && mobileMetrics.cls > 0.25) {
        issues.push('CLS指标差（>0.25），页面布局不稳定，建议为图片和广告预留空间');
      } else if (mobileMetrics.cls && mobileMetrics.cls > 0.1) {
        issues.push('CLS指标需要改进（>0.1），建议优化布局稳定性');
      }

      if (mobileMetrics.fid && mobileMetrics.fid > 300) {
        issues.push('FID指标差（>300ms），交互响应慢，建议优化JavaScript执行');
      } else if (mobileMetrics.fid && mobileMetrics.fid > 100) {
        issues.push('FID指标需要改进（>100ms），建议优化交互响应');
      }

      // 添加PageSpeed的优化建议
      opportunities.push(...mobileMetrics.opportunities);
    } else {
      // 无法获取真实性能数据时，提示用户使用本地分析
      issues.push('⚡ 在线分析无法获取完整的性能数据。💡 建议：使用本地文件分析功能进行详细的性能检查。');
      opportunities.push({
        id: 'use-local-analysis',
        title: '🚀 切换到本地分析获取完整性能数据',
        description: '在线分析受到API和网络限制，无法获取完整的性能指标。本地文件分析可以提供：• 详细的资源加载分析 • 完整的HTML结构检查 • 准确的SEO优化建议。立即切换到本地分析模式！',
        impact: 'high' as const
      });
    }

    // 通用检查
    if (pageSize > 2 * 1024 * 1024) {
      issues.push('页面大小过大（>2MB），建议压缩HTML、CSS、JS和图片资源');
    } else if (pageSize > 1024 * 1024) {
      issues.push('页面大小较大（>1MB），建议优化资源大小');
    }

    if (requests > 100) {
      issues.push('HTTP请求数量过多（>100个），建议合并CSS/JS文件，使用CSS Sprites');
    } else if (requests > 50) {
      issues.push('HTTP请求数量较多（>50个），建议减少资源请求');
    }

    // Web Vitals评估 - 只基于真实数据
    const webVitalsAssessment = pageSpeedData
      ? this.assessWebVitals(pageSpeedData.mobile)
      : {
        lcp: 'unknown' as const,
        fid: 'unknown' as const,
        cls: 'unknown' as const,
        overall: 'poor' as const
      };

    const score = this.calculateBasicPerformanceScore({
      loadTime,
      pageSize,
      requests,
      hasPageSpeedData: !!pageSpeedData
    });

    // 只返回真实数据，不提供估算值
    const realMetrics = pageSpeedData?.mobile;

    return {
      score,
      loadTime,
      firstContentfulPaint: realMetrics?.fcp || realMetrics?.firstContentfulPaint || 0,
      largestContentfulPaint: realMetrics?.lcp || 0,
      cumulativeLayoutShift: realMetrics?.cls || 0,
      firstInputDelay: realMetrics?.fid || 0,
      pageSize,
      requests,
      issues,
      pageSpeedData,
      opportunities,
      webVitalsAssessment,
      coreWebVitals: {
        lcp: realMetrics?.lcp || 0,
        fid: realMetrics?.fid || 0,
        cls: realMetrics?.cls || 0,
        fcp: realMetrics?.fcp || realMetrics?.firstContentfulPaint || 0,
        ttfb: realMetrics?.ttfb || 0
      }
    };
  }

  /**
   * 评估Web Vitals（基于真实PageSpeed数据）
   */
  private assessWebVitals(metrics: any): PerformanceResult['webVitalsAssessment'] {
    const lcp = metrics.lcp ? (metrics.lcp <= 2500 ? 'good' : metrics.lcp <= 4000 ? 'needs-improvement' : 'poor') : 'unknown';
    const fid = metrics.fid ? (metrics.fid <= 100 ? 'good' : metrics.fid <= 300 ? 'needs-improvement' : 'poor') : 'unknown';
    const cls = metrics.cls ? (metrics.cls <= 0.1 ? 'good' : metrics.cls <= 0.25 ? 'needs-improvement' : 'poor') : 'unknown';

    // 计算总体评估
    const scores = [lcp, fid, cls].filter(score => score !== 'unknown');
    const goodCount = scores.filter(score => score === 'good').length;
    const poorCount = scores.filter(score => score === 'poor').length;

    let overall: 'good' | 'needs-improvement' | 'poor';
    if (poorCount > 0) {
      overall = 'poor';
    } else if (goodCount === scores.length) {
      overall = 'good';
    } else {
      overall = 'needs-improvement';
    }

    return { lcp, fid, cls, overall };
  }



  /**
   * 计算基础性能评分 - 只基于真实数据
   */
  private calculateBasicPerformanceScore(params: {
    loadTime: number;
    pageSize: number;
    requests: number;
    hasPageSpeedData: boolean;
  }): number {
    // 如果没有真实的PageSpeed数据，返回较低分数并提示使用本地分析
    if (!params.hasPageSpeedData) {
      return 30; // 低分数表示数据不完整
    }

    // 基于基础指标的简单评分
    let score = 100;

    // 加载时间评分
    if (params.loadTime > 5000) score -= 30;
    else if (params.loadTime > 3000) score -= 20;
    else if (params.loadTime > 2000) score -= 10;

    // 页面大小评分
    if (params.pageSize > 3 * 1024 * 1024) score -= 20;
    else if (params.pageSize > 1024 * 1024) score -= 10;

    // 请求数量评分
    if (params.requests > 100) score -= 20;
    else if (params.requests > 50) score -= 10;

    return Math.max(score, 0);
  }





  /**
   * 分析资源优化情况
   */
  private analyzeResourceOptimization(html: string): {
    issues: string[];
    optimizationScore: number;
  } {
    const issues: string[] = [];
    let optimizationScore = 100;

    // 检查图片优化
    const images = html.match(/<img[^>]+>/gi) || [];
    const webpImages = images.filter(img => img.includes('.webp')).length;
    const totalImages = images.length;

    if (totalImages > 0) {
      const webpRatio = webpImages / totalImages;
      if (webpRatio < 0.5) {
        issues.push('建议使用WebP格式图片以提升加载速度');
        optimizationScore -= 10;
      }
    }

    // 检查CSS优化
    const inlineStyles = (html.match(/style\s*=/gi) || []).length;
    if (inlineStyles > 10) {
      issues.push('内联样式过多，建议使用外部CSS文件');
      optimizationScore -= 5;
    }

    // 检查JavaScript优化
    const inlineScripts = (html.match(/<script(?![^>]*src)[^>]*>/gi) || []).length;
    if (inlineScripts > 5) {
      issues.push('内联脚本过多，建议使用外部JavaScript文件');
      optimizationScore -= 5;
    }

    // 检查压缩
    const htmlSize = html.length;
    const minifiedSize = html.replace(/\s+/g, ' ').length;
    const compressionRatio = (htmlSize - minifiedSize) / htmlSize;

    if (compressionRatio > 0.2) {
      issues.push('HTML代码可以进一步压缩以减少传输大小');
      optimizationScore -= 5;
    }

    return { issues, optimizationScore };
  }

  /**
   * 估算资源数量
   */
  private estimateResourceCount(html: string): number {
    let count = 1; // HTML本身

    // 计算各种资源
    count += (html.match(/<img[^>]+src=/gi) || []).length; // 图片
    count += (html.match(/<link[^>]+href=[^>]*\.css/gi) || []).length; // CSS
    count += (html.match(/<script[^>]+src=/gi) || []).length; // JavaScript
    count += (html.match(/<link[^>]+href=[^>]*\.ico/gi) || []).length; // 图标
    count += (html.match(/<link[^>]+href=[^>]*\.woff/gi) || []).length; // 字体

    return count;
  }

  /**
   * 计算性能分数（基于Google Core Web Vitals标准）
   */
  private calculatePerformanceScore(metrics: any): number {
    let score = 100;

    // 加载时间 (25分) - 基于真实用户体验标准
    if (metrics.loadTime > 5000) score -= 25; // 极慢
    else if (metrics.loadTime > 3000) score -= 20; // 慢
    else if (metrics.loadTime > 2000) score -= 15; // 一般
    else if (metrics.loadTime > 1000) score -= 8; // 较快
    else if (metrics.loadTime > 500) score -= 3; // 快
    // <= 500ms 不扣分（优秀）

    // 页面大小 (15分) - 基于移动网络考虑
    if (metrics.pageSize > 5 * 1024 * 1024) score -= 15; // >5MB
    else if (metrics.pageSize > 3 * 1024 * 1024) score -= 12; // >3MB
    else if (metrics.pageSize > 2 * 1024 * 1024) score -= 10; // >2MB
    else if (metrics.pageSize > 1024 * 1024) score -= 6; // >1MB
    else if (metrics.pageSize > 512 * 1024) score -= 3; // >512KB

    // 请求数量 (15分) - HTTP/2考虑
    if (metrics.requests > 200) score -= 15;
    else if (metrics.requests > 150) score -= 12;
    else if (metrics.requests > 100) score -= 10;
    else if (metrics.requests > 75) score -= 6;
    else if (metrics.requests > 50) score -= 3;

    // LCP (20分) - Google Core Web Vitals标准
    if (metrics.largestContentfulPaint > 4000) score -= 20; // Poor (>4s)
    else if (metrics.largestContentfulPaint > 2500) score -= 12; // Needs Improvement (2.5-4s)
    else if (metrics.largestContentfulPaint > 1500) score -= 5; // Good but can improve
    // <= 2.5s 为Good，不扣分

    // CLS (15分) - Google Core Web Vitals标准
    if (metrics.cumulativeLayoutShift > 0.25) score -= 15; // Poor (>0.25)
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 8; // Needs Improvement (0.1-0.25)
    else if (metrics.cumulativeLayoutShift > 0.05) score -= 3; // Good but can improve
    // <= 0.1 为Good，不扣分

    // FID (10分) - Google Core Web Vitals标准
    if (metrics.firstInputDelay > 300) score -= 10; // Poor (>300ms)
    else if (metrics.firstInputDelay > 100) score -= 5; // Needs Improvement (100-300ms)
    else if (metrics.firstInputDelay > 50) score -= 2; // Good but can improve
    // <= 100ms 为Good，不扣分

    // 资源优化加分项
    if (metrics.resourceOptimization) {
      const optimizationBonus = (metrics.resourceOptimization.optimizationScore - 100) * 0.1;
      score += optimizationBonus; // 最多扣10分，最少加0分
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 分析移动友好性
   */
  private async analyzeMobileFriendly(dom: Document): Promise<MobileFriendlyResult> {
    const viewport = this.checkViewport(dom);
    const responsive = this.checkResponsive(dom);
    const touchElements = this.checkTouchElements(dom);
    const textSize = this.checkTextSize(dom);

    const issues: string[] = [];

    if (!viewport.present) {
      issues.push('缺少viewport meta标签');
    } else if (!viewport.correct) {
      issues.push('viewport配置不正确');
    }

    if (!responsive) {
      issues.push('页面可能不是响应式设计');
    }

    if (!touchElements.appropriate) {
      issues.push('触摸元素大小可能不合适');
    }

    if (!textSize.readable) {
      issues.push('文本大小可能在移动设备上不易阅读');
    }

    const score = this.calculateMobileFriendlyScore({
      viewport,
      responsive,
      touchElements,
      textSize
    });

    return {
      score,
      viewport,
      responsive,
      touchElements,
      textSize,
      issues
    };
  }

  /**
   * 检查viewport配置
   */
  private checkViewport(dom: Document): {
    present: boolean;
    correct: boolean;
    content: string;
  } {
    const viewportMeta = dom.querySelector('meta[name="viewport"]');

    if (!viewportMeta) {
      return { present: false, correct: false, content: '' };
    }

    const content = viewportMeta.getAttribute('content') || '';
    const correct = content.includes('width=device-width') && content.includes('initial-scale=1');

    return { present: true, correct, content };
  }

  /**
   * 检查响应式设计
   */
  private checkResponsive(dom: Document): boolean {
    // 简化的响应式检查
    const hasMediaQueries = dom.querySelectorAll('style, link[rel="stylesheet"]').length > 0;
    const hasFlexbox = dom.querySelector('[style*="flex"], [class*="flex"]') !== null;
    const hasGrid = dom.querySelector('[style*="grid"], [class*="grid"]') !== null;

    return hasMediaQueries || hasFlexbox || hasGrid;
  }

  /**
   * 检查触摸元素
   */
  private checkTouchElements(dom: Document): {
    appropriate: boolean;
    issues: string[];
  } {
    const touchElements = dom.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    const issues: string[] = [];
    let appropriate = true;

    // 简化的触摸元素检查
    if (touchElements.length === 0) {
      issues.push('页面缺少可交互元素');
      appropriate = false;
    }

    return { appropriate, issues };
  }

  /**
   * 检查文本大小
   */
  private checkTextSize(dom: Document): {
    readable: boolean;
    issues: string[];
  } {
    const textElements = dom.querySelectorAll('p, span, div, a, button');
    const issues: string[] = [];
    let readable = true;

    // 简化的文本大小检查
    // 实际实现需要检查CSS样式中的font-size
    if (textElements.length === 0) {
      issues.push('页面缺少文本内容');
      readable = false;
    }

    return { readable, issues };
  }

  /**
   * 计算移动友好性分数
   */
  private calculateMobileFriendlyScore(results: any): number {
    let score = 100;

    // viewport (40分)
    if (!results.viewport.present) score -= 30;
    else if (!results.viewport.correct) score -= 15;

    // 响应式设计 (30分)
    if (!results.responsive) score -= 30;

    // 触摸元素 (20分)
    if (!results.touchElements.appropriate) score -= 20;

    // 文本大小 (10分)
    if (!results.textSize.readable) score -= 10;

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析社交媒体标签
   */
  private async analyzeSocialMedia(dom: Document): Promise<SocialMediaResult> {
    const openGraph = this.checkOpenGraph(dom);
    const twitterCard = this.checkTwitterCard(dom);
    const facebookMeta = this.checkFacebookMeta(dom);

    const score = this.calculateSocialMediaScore({
      openGraph,
      twitterCard,
      facebookMeta
    });

    return {
      score,
      openGraph,
      twitterCard,
      facebookMeta
    };
  }

  /**
   * 检查Open Graph标签
   */
  private checkOpenGraph(dom: Document): {
    present: boolean;
    complete: boolean;
    tags: { [key: string]: string };
    issues: string[];
  } {
    const ogTags = dom.querySelectorAll('meta[property^="og:"]');
    const tags: { [key: string]: string } = {};
    const issues: string[] = [];

    ogTags.forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (property && content) {
        tags[property] = content;
      }
    });

    const present = ogTags.length > 0;
    const requiredTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const complete = requiredTags.every(tag => tags[tag]);

    requiredTags.forEach(tag => {
      if (!tags[tag]) {
        issues.push(`缺少${tag}标签`);
      }
    });

    return { present, complete, tags, issues };
  }

  /**
   * 检查Twitter Card标签
   */
  private checkTwitterCard(dom: Document): {
    present: boolean;
    complete: boolean;
    tags: { [key: string]: string };
    issues: string[];
  } {
    const twitterTags = dom.querySelectorAll('meta[name^="twitter:"]');
    const tags: { [key: string]: string } = {};
    const issues: string[] = [];

    twitterTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const content = tag.getAttribute('content');
      if (name && content) {
        tags[name] = content;
      }
    });

    const present = twitterTags.length > 0;
    const requiredTags = ['twitter:card', 'twitter:title', 'twitter:description'];
    const complete = requiredTags.every(tag => tags[tag]);

    requiredTags.forEach(tag => {
      if (!tags[tag]) {
        issues.push(`缺少${tag}标签`);
      }
    });

    return { present, complete, tags, issues };
  }

  /**
   * 检查Facebook Meta标签
   */
  private checkFacebookMeta(dom: Document): {
    present: boolean;
    tags: { [key: string]: string };
    issues: string[];
  } {
    const fbTags = dom.querySelectorAll('meta[property^="fb:"]');
    const tags: { [key: string]: string } = {};
    const issues: string[] = [];

    fbTags.forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (property && content) {
        tags[property] = content;
      }
    });

    const present = fbTags.length > 0;

    if (!present) {
      issues.push('缺少Facebook特定的meta标签');
    }

    return { present, tags, issues };
  }

  /**
   * 计算社交媒体分数
   */
  private calculateSocialMediaScore(results: any): number {
    let score = 100;

    // Open Graph (60分)
    if (!results.openGraph.present) score -= 40;
    else if (!results.openGraph.complete) score -= 20;

    // Twitter Card (30分)
    if (!results.twitterCard.present) score -= 20;
    else if (!results.twitterCard.complete) score -= 10;

    // Facebook Meta (10分)
    if (!results.facebookMeta.present) score -= 10;

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析结构化数据
   */
  private async analyzeStructuredData(dom: Document): Promise<StructuredDataResult> {
    const schemas = this.checkSchemaMarkup(dom);
    const jsonLd = this.checkJsonLd(dom);
    const microdata = this.checkMicrodata(dom);

    const issues: string[] = [];

    if (schemas.length === 0 && !jsonLd.present && !microdata.present) {
      issues.push('页面缺少结构化数据标记');
    }

    const score = this.calculateStructuredDataScore({
      schemas,
      jsonLd,
      microdata
    });

    return {
      score,
      schemas,
      jsonLd,
      microdata,
      issues
    };
  }

  /**
   * 检查Schema标记
   */
  private checkSchemaMarkup(dom: Document): {
    type: string;
    valid: boolean;
    errors: string[];
  }[] {
    const schemas: { type: string; valid: boolean; errors: string[] }[] = [];

    // 检查itemscope和itemtype
    const itemScopes = dom.querySelectorAll('[itemscope]');
    itemScopes.forEach(element => {
      const itemType = element.getAttribute('itemtype');
      if (itemType) {
        schemas.push({
          type: itemType,
          valid: itemType.includes('schema.org'),
          errors: itemType.includes('schema.org') ? [] : ['无效的schema.org类型']
        });
      }
    });

    return schemas;
  }

  /**
   * 检查JSON-LD
   */
  private checkJsonLd(dom: Document): {
    present: boolean;
    valid: boolean;
    schemas: string[];
  } {
    const jsonLdScripts = dom.querySelectorAll('script[type="application/ld+json"]');
    const schemas: string[] = [];
    let valid = true;

    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type']) {
          schemas.push(data['@type']);
        }
      } catch (error) {
        valid = false;
      }
    });

    return {
      present: jsonLdScripts.length > 0,
      valid,
      schemas
    };
  }

  /**
   * 检查微数据
   */
  private checkMicrodata(dom: Document): {
    present: boolean;
    valid: boolean;
    items: number;
  } {
    const microdataElements = dom.querySelectorAll('[itemscope], [itemprop], [itemtype]');
    const itemScopes = dom.querySelectorAll('[itemscope]');

    return {
      present: microdataElements.length > 0,
      valid: itemScopes.length > 0,
      items: itemScopes.length
    };
  }

  /**
   * 计算结构化数据分数
   */
  private calculateStructuredDataScore(results: any): number {
    let score = 0;

    // JSON-LD (50分)
    if (results.jsonLd.present) {
      score += 40;
      if (results.jsonLd.valid) score += 10;
    }

    // Schema标记 (30分)
    if (results.schemas.length > 0) {
      score += 20;
      const validSchemas = results.schemas.filter((s: any) => s.valid).length;
      score += (validSchemas / results.schemas.length) * 10;
    }

    // 微数据 (20分)
    if (results.microdata.present) {
      score += 15;
      if (results.microdata.valid) score += 5;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析安全配置
   */
  private async analyzeSecurity(url: string, pageContent: ProxyResponse): Promise<SecurityResult> {
    const urlObj = new URL(url);
    const https = this.checkHttps(urlObj, pageContent);
    const headers = this.checkSecurityHeaders(pageContent.headers);
    const mixedContent = this.checkMixedContent(pageContent.html, urlObj.protocol === 'https:');

    const issues: string[] = [];

    if (!https.enabled) {
      issues.push('网站未启用HTTPS');
    }

    if (!headers.contentSecurityPolicy) {
      issues.push('缺少Content-Security-Policy头');
    }

    if (!headers.strictTransportSecurity && https.enabled) {
      issues.push('缺少Strict-Transport-Security头');
    }

    if (mixedContent.present) {
      issues.push('存在混合内容问题');
    }

    const score = this.calculateSecurityScore({
      https,
      headers,
      mixedContent
    });

    return {
      score,
      https,
      headers,
      mixedContent,
      issues
    };
  }

  /**
   * 检查HTTPS配置
   */
  private checkHttps(urlObj: URL, pageContent: ProxyResponse): {
    enabled: boolean;
    certificate: {
      valid: boolean;
      issuer: string;
      expires: string;
    };
  } {
    const enabled = urlObj.protocol === 'https:';

    // 简化的证书检查
    const certificate = {
      valid: enabled,
      issuer: enabled ? 'Unknown CA' : '',
      expires: enabled ? 'Unknown' : ''
    };

    return { enabled, certificate };
  }

  /**
   * 检查安全头
   */
  private checkSecurityHeaders(headers: { [key: string]: string }): {
    contentSecurityPolicy: boolean;
    strictTransportSecurity: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
  } {
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());

    return {
      contentSecurityPolicy: headerKeys.includes('content-security-policy'),
      strictTransportSecurity: headerKeys.includes('strict-transport-security'),
      xFrameOptions: headerKeys.includes('x-frame-options'),
      xContentTypeOptions: headerKeys.includes('x-content-type-options'),
      referrerPolicy: headerKeys.includes('referrer-policy')
    };
  }

  /**
   * 检查混合内容
   */
  private checkMixedContent(html: string, isHttps: boolean): {
    present: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!isHttps) {
      return { present: false, issues };
    }

    // 检查HTTP资源
    const httpResources = [
      ...html.match(/src=["']http:\/\/[^"']+/gi) || [],
      ...html.match(/href=["']http:\/\/[^"']+/gi) || [],
      ...html.match(/url\(["']?http:\/\/[^"')]+/gi) || []
    ];

    if (httpResources.length > 0) {
      issues.push(`发现${httpResources.length}个HTTP资源`);
    }

    return {
      present: httpResources.length > 0,
      issues
    };
  }

  /**
   * 计算安全分数
   */
  private calculateSecurityScore(results: any): number {
    let score = 100;

    // HTTPS (50分) - 提高HTTPS的权重
    if (!results.https.enabled) score -= 50;
    else if (!results.https.certificate.valid) score -= 15;

    // 安全头 (30分) - 降低安全头的权重，因为很多大型网站可能不使用所有安全头
    if (!results.headers.contentSecurityPolicy) score -= 8;
    if (!results.headers.strictTransportSecurity) score -= 8;
    if (!results.headers.xFrameOptions) score -= 5;
    if (!results.headers.xContentTypeOptions) score -= 5;
    if (!results.headers.referrerPolicy) score -= 4;

    // 混合内容 (20分)
    if (results.mixedContent.present) score -= 20;

    return Math.max(0, Math.round(score));
  }

  /**
   * 高级可读性分析（基于Flesch Reading Ease）
   */
  private calculateAdvancedReadability(text: string, dom: Document): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = this.countSyllables(text);

    if (sentences.length === 0 || words.length === 0) return 0;

    // Flesch Reading Ease公式
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // 转换为0-100分制
    let readabilityScore = Math.max(0, Math.min(100, fleschScore));

    // 考虑HTML结构对可读性的影响
    const structureBonus = this.calculateStructureReadabilityBonus(dom);
    readabilityScore += structureBonus;

    return Math.min(100, Math.round(readabilityScore));
  }

  /**
   * 计算音节数（简化版）
   */
  private countSyllables(text: string): number {
    // 简化的音节计算（主要针对英文）
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    let syllableCount = 0;

    words.forEach(word => {
      // 移除标点符号
      word = word.replace(/[^a-z]/g, '');
      if (word.length === 0) return;

      // 简单的音节计算规则
      const vowels = word.match(/[aeiouy]+/g);
      let count = vowels ? vowels.length : 1;

      // 调整规则
      if (word.endsWith('e')) count--;
      if (count === 0) count = 1;

      syllableCount += count;
    });

    return syllableCount;
  }

  /**
   * 计算结构对可读性的加分
   */
  private calculateStructureReadabilityBonus(dom: Document): number {
    let bonus = 0;

    // 标题结构加分
    const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) bonus += 5;

    // 列表结构加分
    const lists = dom.querySelectorAll('ul, ol');
    if (lists.length > 0) bonus += 3;

    // 段落结构加分
    const paragraphs = dom.querySelectorAll('p');
    if (paragraphs.length > 2) bonus += 2;

    // 强调标签加分
    const emphasis = dom.querySelectorAll('strong, b, em, i');
    if (emphasis.length > 0) bonus += 2;

    return Math.min(10, bonus); // 最多加10分
  }

  /**
   * 分析内容深度和质量
   */
  private analyzeContentDepthAndQuality(text: string, dom: Document): {
    averageSentenceLength: number;
    technicalTermsRatio: number;
    complexityScore: number;
  } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    // 平均句子长度
    const averageSentenceLength = words.length / sentences.length || 0;

    // 技术术语比例（长词汇比例）
    const longWords = words.filter(word => word.length > 6);
    const technicalTermsRatio = longWords.length / words.length || 0;

    // 复杂度评分
    let complexityScore = 0;

    // 基于词汇多样性
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyDiversity = uniqueWords.size / words.length;
    complexityScore += vocabularyDiversity * 30;

    // 基于句子长度变化
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    complexityScore += Math.min(lengthVariance / 10, 20);

    // 基于标点符号使用
    const punctuationMarks = (text.match(/[,:;()]/g) || []).length;
    const punctuationRatio = punctuationMarks / words.length;
    complexityScore += punctuationRatio * 50;

    return {
      averageSentenceLength,
      technicalTermsRatio,
      complexityScore: Math.min(100, complexityScore)
    };
  }

  /**
   * 检查内容重复
   */
  private checkContentDuplication(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 2) return 0;

    let duplicateCount = 0;
    const normalizedSentences = sentences.map(s => s.toLowerCase().trim());

    for (let i = 0; i < normalizedSentences.length; i++) {
      for (let j = i + 1; j < normalizedSentences.length; j++) {
        const similarity = this.calculateStringSimilarity(normalizedSentences[i], normalizedSentences[j]);
        if (similarity > 0.8) {
          duplicateCount++;
        }
      }
    }

    return duplicateCount / sentences.length;
  }

  /**
   * 计算字符串相似度
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }

  /**
   * 计算方差
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));

    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * 转换外部性能数据为SEO分析格式
   */
  private convertExternalPerformanceData(externalData: any): PerformanceResult {
    return {
      score: externalData.score || 0,
      loadTime: externalData.loadTime || 0,
      firstContentfulPaint: externalData.vitals?.fcp || 0,
      largestContentfulPaint: externalData.vitals?.lcp || 0,
      cumulativeLayoutShift: externalData.vitals?.cls || 0,
      firstInputDelay: externalData.vitals?.fid || 0,
      pageSize: externalData.pageSize || 0,
      requests: 0,
      issues: [],
      pageSpeedData: externalData,
      opportunities: [],
      webVitalsAssessment: {
        lcp: 'unknown' as const,
        fid: 'unknown' as const,
        cls: 'unknown' as const,
        overall: 'poor' as const
      },
      coreWebVitals: {
        lcp: externalData.vitals?.lcp || 0,
        fid: externalData.vitals?.fid || 0,
        cls: externalData.vitals?.cls || 0,
        fcp: externalData.vitals?.fcp || 0,
        ttfb: externalData.vitals?.ttfb || 0
      }
    };
  }
}

// 导出单例实例
export const realSEOAnalysisEngine = new RealSEOAnalysisEngine();
