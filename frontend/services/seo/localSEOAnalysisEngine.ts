
import {AccessibilityResult, ContentQualityResult, MobileFriendlyResult, PageMetadata, PerformanceResult, SecurityResult, SEOAnalysisResult, SEOIssue, SEORecommendation, SocialMediaResult, StructuredDataResult, TechnicalSEOResult} from './seoAnalysisEngine';

export interface LocalSEOConfig {
  files: File[];
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
}

export class LocalSEOAnalysisEngine {
  private abortController: AbortController | null = null;

  /**
   * 开始本地文件SEO分析
   */
  async analyzeLocalFiles(
    config: LocalSEOConfig,
    onProgress?: (progress: number, step: string) => void
  ): Promise<SEOAnalysisResult> {
    this.abortController = new AbortController();

    try {
      onProgress?.(5, '准备分析本地文件...');

      // 验证文件
      const mainFile = this.validateFiles(config.files);
      onProgress?.(10, '读取文件内容...');

      // 读取主HTML文件内容
      const htmlContent = await this.readFileContent(mainFile);
      onProgress?.(15, '解析HTML结构...');

      // 解析HTML
      const dom = this.parseHTML(htmlContent);

      // 创建虚拟URL用于分析
      const virtualUrl = `file:/\${mainFile.name}`;

      // 执行各项检测
      const results: Partial<SEOAnalysisResult> = {
        url: virtualUrl,
        timestamp: Date.now(),
        metadata: this.extractMetadata(dom)
      };

      let currentProgress = 20;
      const progressStep = 70 / this.getEnabledChecksCount(config);

      if (config.checkTechnicalSEO !== false) {
        onProgress?.(currentProgress, '检查技术SEO...');
        results.technicalSEO = await this.analyzeTechnicalSEO(virtualUrl, dom, config.files);
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
        results.performance = await this.analyzePerformance(mainFile, htmlContent);
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
        results.security = await this.analyzeSecurity(virtualUrl, htmlContent);
        currentProgress += progressStep;
      }

      onProgress?.(90, '生成分析报告...');

      // 计算总分和等级
      const { score, grade, issues, recommendations } = this.calculateOverallScore(results as SEOAnalysisResult);

      onProgress?.(100, '本地文件分析完成');

      return {
        ...results,
        score,
        grade,
        issues,
        recommendations
      } as SEOAnalysisResult;

    } catch (error) {
      console.error('Local SEO analysis failed:', error);
      throw new Error(`本地文件SEO分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
   * 验证文件
   */
  private validateFiles(files: File[]): File {
    if (!files || files.length === 0) {
      throw new Error('请选择要分析的HTML文件');
    }

    // 查找主HTML文件
    const htmlFiles = files.filter(file =>
      file.name.toLowerCase().endsWith('.html') ||
      file.name.toLowerCase().endsWith('.htm')
    );

    if (htmlFiles.length === 0) {
      throw new Error('请上传至少一个HTML文件');
    }

    // 返回第一个HTML文件作为主文件
    return htmlFiles[0];
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content || content.trim().length === 0) {
          reject(new Error('文件内容为空'));
          return;
        }
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 解析HTML
   */
  private parseHTML(html: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 检查解析是否成功
    if (doc.querySelector('parsererror')) {
      throw new Error('HTML文件格式错误，无法解析');
    }

    return doc;
  }

  /**
   * 获取启用的检查项数量
   */
  private getEnabledChecksCount(config: LocalSEOConfig): number {
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

    return checks.filter(check => config[check as keyof LocalSEOConfig] !== false).length;
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
   * 分析技术SEO（本地文件版本）
   */
  private async analyzeTechnicalSEO(url: string, dom: Document, files: File[]): Promise<TechnicalSEOResult> {
    // 本地文件无法检查robots.txt和sitemap，给出相应说明
    const robotsTxt = {
      exists: false,
      accessible: false,
      issues: ['本地文件无法检查robots.txt，部署到服务器后需要添加']
    };

    const sitemap = {
      exists: false,
      accessible: false,
      urls: 0,
      issues: ['本地文件无法检查sitemap，建议创建XML sitemap']
    };

    // 检查canonical标签
    const canonicalTags = this.checkCanonicalTags(dom, url);

    // 检查meta robots
    const metaRobots = this.checkMetaRobots(dom);

    // 检查hreflang
    const hreflang = this.checkHreflang(dom);

    // 检查URL结构（基于文件名）
    const urlStructure = this.checkLocalUrlStructure(url);

    // 计算技术SEO分数（调整本地文件评分标准）
    const score = this.calculateLocalTechnicalSEOScore({
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
   * 检查canonical标签（本地版本）
   */
  private checkCanonicalTags(dom: Document, currentUrl: string): {
    present: boolean;
    correct: boolean;
    issues: string[];
  } {
    const canonicalLinks = dom.querySelectorAll('link[rel="canonical"]');
    const issues: string[] = [];

    if (canonicalLinks.length === 0) {
      issues.push('建议添加canonical标签，部署后指向正确的URL');
      return {
        present: false,
        correct: false,
        issues
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

    // 对于本地文件，给出部署建议
    if (canonicalUrl.startsWith('file://') || canonicalUrl.includes('localhost')) {
      issues.push('canonical URL指向本地地址，部署时需要更新为正式域名');
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
        issues: ['建议添加meta robots标签以控制搜索引擎行为']
      };
    }

    const content = metaRobots.getAttribute('content') || '';
    const directives = content.toLowerCase().split(',').map(d => d.trim());

    if (directives.includes('noindex')) {
      issues.push('页面设置为不被索引，如需被搜索引擎收录请移除noindex');
    }

    if (directives.includes('nofollow')) {
      issues.push('页面链接设置为不被跟踪，可能影响链接权重传递');
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
        issues: ['如果是多语言网站，建议添加hreflang标签']
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
   * 检查本地URL结构
   */
  private checkLocalUrlStructure(url: string): {
    score: number;
    issues: string[];
    https: boolean;
    friendly: boolean;
  } {
    const issues: string[] = [];
    let score = 100;

    // 本地文件无HTTPS
    const https = false;
    issues.push('本地文件无HTTPS，部署时建议启用HTTPS');
    score -= 10; // 减少扣分，因为这是本地文件的正常情况

    // 检查文件名
    const fileName = url.split('/').pop() || '';

    if (fileName.length > 50) {
      issues.push('文件名过长，建议使用简短的描述性文件名');
      score -= 10;
    }

    if (fileName.includes('_')) {
      issues.push('建议使用连字符(-)而不是下划线(_)');
      score -= 5;
    }

    if (!/^[a-zA-Z0-9\-._]+$/.test(fileName)) {
      issues.push('文件名包含特殊字符，建议使用SEO友好的命名');
      score -= 10;
    }

    const friendly = fileName.length <= 50 && !fileName.includes('_') && /^[a-zA-Z0-9\-._]+$/.test(fileName);

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
    const hreflangPattern = /^[a-z]{2}(-[A-Z]{2})?$|^x-default$/;
    return hreflangPattern.test(hreflang);
  }

  /**
   * 计算本地文件技术SEO分数
   */
  private calculateLocalTechnicalSEOScore(results: any): number {
    let score = 100;

    // 对于本地文件，robots.txt和sitemap不扣分（因为无法检查）
    // canonical (30分)
    if (!results.canonicalTags.present) score -= 20;
    if (!results.canonicalTags.correct) score -= 10;

    // meta robots (20分)
    if (!results.metaRobots.present) score -= 10;
    if (results.metaRobots.issues.length > 0) score -= 10;

    // URL结构 (50分)
    score = score - (100 - results.urlStructure.score) * 0.5;

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析内容质量（复用现有逻辑）
   */
  private async analyzeContentQuality(dom: Document, keywords?: string): Promise<ContentQualityResult> {
    // 分析标题标签
    const titleTag = this.analyzeTitleTag(dom);
    const metaDescription = this.analyzeMetaDescription(dom);
    const headings = this.analyzeHeadings(dom);
    const content = this.analyzeContent(dom, keywords);
    const images = this.analyzeImages(dom);
    const links = this.analyzeLinks(dom);

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
   * 分析内容
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

    const readability = this.calculateReadability(textContent);

    // 计算关键词密度
    const keywordDensity: { [keyword: string]: number } = {};
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
      keywordList.forEach(keyword => {
        const density = this.calculateKeywordDensity(textContent, keyword);
        keywordDensity[keyword] = density;

        if (density === 0) {
          issues.push(`关键词"${keyword}"未在内容中出现`);
        } else if (density > 4) {
          issues.push(`关键词"${keyword}"密度过高(${density.toFixed(1)}%)，可能被视为关键词堆砌`);
        }
      });
    }

    // 内容长度检查
    if (wordCount < 150) {
      issues.push('内容过短（<150词），建议增加有价值的内容');
    } else if (wordCount < 300) {
      issues.push('内容较短（<300词），建议增加更多详细内容');
    }

    return {
      wordCount,
      readability,
      keywordDensity,
      issues
    };
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

      // 检查图片格式
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

    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (!href) return;

      try {
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          // 这些是有效的特殊链接
          internal++;
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          external++;
        } else if (href.startsWith('./') || href.startsWith('../') || !href.includes('://')) {
          // 相对链接
          internal++;
          issues.push(`相对链接"${href}"在本地文件中可能无法正常工作，部署时需要检查`);
        } else {
          new URL(href); // 验证URL格式
          external++;
        }
      } catch (error) {
        broken++;
        issues.push(`第${index + 1}个链接格式无效: ${href}`);
      }
    });

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
   * 计算可读性分数
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;

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
   * 检查颜色对比度
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

    // 简化的对比度检查
    textElements.forEach((element) => {
      const style = element.getAttribute('style') || '';
      const className = element.getAttribute('class') || '';

      // 检查常见的低对比度类名
      const lowContrastClasses = ['text-gray-400', 'text-light', 'text-muted', 'opacity-50'];
      if (lowContrastClasses.some(cls => className.includes(cls))) {
        failed++;
      } else {
        passed++;
      }
    });

    if (failed > 0) {
      issues.push('建议使用对比度检查工具验证颜色对比度是否符合WCAG标准');
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
   * 分析性能（本地文件版本）
   */
  private async analyzePerformance(file: File, htmlContent: string): Promise<PerformanceResult> {
    const fileSize = file.size;
    const estimatedRequests = this.estimateResourceCount(htmlContent);

    // 本地文件的性能分析主要基于文件大小和复杂度
    const issues: string[] = [];

    if (fileSize > 1024 * 1024) { // 1MB
      issues.push('HTML文件过大（>1MB），建议优化文件大小');
    }

    if (estimatedRequests > 50) {
      issues.push('页面引用的资源过多，建议合并CSS/JS文件');
    }

    // 检查内联样式和脚本
    const inlineStyles = htmlContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
    const inlineScripts = htmlContent.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];

    if (inlineStyles.length > 3) {
      issues.push('内联样式过多，建议使用外部CSS文件');
    }

    if (inlineScripts.length > 3) {
      issues.push('内联脚本过多，建议使用外部JS文件');
    }

    const score = this.calculateLocalPerformanceScore({
      fileSize,
      estimatedRequests,
      inlineStyles: inlineStyles.length,
      inlineScripts: inlineScripts.length
    });

    return {
      score,
      loadTime: 0, // 本地文件无加载时间
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      pageSize: fileSize,
      requests: estimatedRequests,
      issues,
      opportunities: [
        {
          id: 'local-optimization',
          title: '本地文件优化建议',
          description: '优化HTML结构和资源引用',
          impact: 'medium' as const
        }
      ],
      webVitalsAssessment: {
        lcp: 'unknown' as const,
        fid: 'unknown' as const,
        cls: 'unknown' as const,
        overall: 'poor' as const
      },
      coreWebVitals: {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0
      }
    };
  }

  /**
   * 估算资源数量
   */
  private estimateResourceCount(html: string): number {
    let count = 1; // HTML本身

    count += (html.match(/<img[^>]+src=/gi) || []).length; // 图片
    count += (html.match(/<link[^>]+href=[^>]*/.css / gi) || []).length; // CSS
    count += (html.match(/<script[^>]+src=/gi) || []).length; // JavaScript
    count += (html.match(/<link[^>]+href=[^>]*/.ico / gi) || []).length; // 图标

    return count;
  }

  /**
   * 计算本地文件性能分数
   */
  private calculateLocalPerformanceScore(metrics: {
    fileSize: number;
    estimatedRequests: number;
    inlineStyles: number;
    inlineScripts: number;
  }): number {
    let score = 100;

    // 文件大小 (40分)
    if (metrics.fileSize > 2 * 1024 * 1024) score -= 30; // >2MB
    else if (metrics.fileSize > 1024 * 1024) score -= 20; // >1MB
    else if (metrics.fileSize > 512 * 1024) score -= 10; // >512KB

    // 资源数量 (30分)
    if (metrics.estimatedRequests > 100) score -= 25;
    else if (metrics.estimatedRequests > 50) score -= 15;
    else if (metrics.estimatedRequests > 30) score -= 10;

    // 内联资源 (30分)
    if (metrics.inlineStyles > 5) score -= 15;
    else if (metrics.inlineStyles > 3) score -= 10;

    if (metrics.inlineScripts > 5) score -= 15;
    else if (metrics.inlineScripts > 3) score -= 10;

    return Math.max(0, Math.round(score));
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
    if (!viewport.present) issues.push('缺少viewport meta标签');
    if (!responsive) issues.push('页面可能不是响应式设计');

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
   * 检查viewport
   */
  private checkViewport(dom: Document): {
    present: boolean;
    correct: boolean;
    content: string;
  } {
    const viewport = dom.querySelector('meta[name="viewport"]');

    if (!viewport) {
      return {
        present: false,
        correct: false,
        content: ''
      };
    }

    const content = viewport.getAttribute('content') || '';
    const correct = content.includes('width=device-width');

    return {
      present: true,
      correct,
      content
    };
  }

  /**
   * 检查响应式设计
   */
  private checkResponsive(dom: Document): boolean {
    // 简单检查是否有媒体查询
    const styles = dom.querySelectorAll('style');
    const links = dom.querySelectorAll('link[rel="stylesheet"]');

    let hasMediaQueries = false;

    styles.forEach(style => {
      if (style.textContent && style.textContent.includes('@media')) {
        hasMediaQueries = true;
      }
    });

    return hasMediaQueries;
  }

  /**
   * 检查触摸元素
   */
  private checkTouchElements(dom: Document): {
    appropriate: boolean;
    issues: string[];
  } {
    const buttons = dom.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    const issues: string[] = [];

    // 简单检查：如果有很多小的可点击元素，可能不适合触摸
    if (buttons.length > 20) {
      issues.push('可点击元素较多，建议确保触摸目标足够大（至少44px）');
    }

    return {
      appropriate: issues.length === 0,
      issues
    };
  }

  /**
   * 检查文本大小
   */
  private checkTextSize(dom: Document): {
    readable: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 检查是否有设置过小的字体
    const styles = dom.querySelectorAll('style');
    let hasSmallFonts = false;

    styles.forEach(style => {
      if (style.textContent && /font-size\s*:\s*[0-9]+px/.test(style.textContent)) {
        const matches = style.textContent.match(/font-size\s*:\s*([0-9]+)px/g);
        matches?.forEach(match => {
          const size = parseInt(match.match(/([0-9]+)/)?.[1] || '0');
          if (size < 14) {
            hasSmallFonts = true;
          }
        });
      }
    });

    if (hasSmallFonts) {
      issues.push('检测到小于14px的字体，可能在移动设备上难以阅读');
    }

    return {
      readable: !hasSmallFonts,
      issues
    };
  }

  /**
   * 计算移动友好性分数
   */
  private calculateMobileFriendlyScore(results: any): number {
    let score = 100;

    if (!results.viewport.present) score -= 30;
    else if (!results.viewport.correct) score -= 15;

    if (!results.responsive) score -= 25;
    if (!results.touchElements.appropriate) score -= 20;
    if (!results.textSize.readable) score -= 25;

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

    if (!present) {
      issues.push('缺少Open Graph标签，影响社交媒体分享效果');
    } else if (!complete) {
      requiredTags.forEach(tag => {
        if (!tags[tag]) {
          issues.push(`缺少${tag}标签`);
        }
      });
    }

    return {
      present,
      complete,
      tags,
      issues
    };
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

    if (!present) {
      issues.push('缺少Twitter Card标签');
    } else if (!complete) {
      requiredTags.forEach(tag => {
        if (!tags[tag]) {
          issues.push(`缺少${tag}标签`);
        }
      });
    }

    return {
      present,
      complete,
      tags,
      issues
    };
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
      issues.push('缺少Facebook专用标签（可选）');
    }

    return {
      present,
      tags,
      issues
    };
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
    const jsonLd = this.checkJsonLd(dom);
    const microdata = this.checkMicrodata(dom);
    const schemas = this.extractSchemas(dom);

    const issues: string[] = [];
    if (!jsonLd.present && !microdata.present) {
      issues.push('缺少结构化数据，建议添加JSON-LD或Microdata');
    }

    const score = this.calculateStructuredDataScore({
      jsonLd,
      microdata,
      schemas
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
   * 检查JSON-LD
   */
  private checkJsonLd(dom: Document): {
    present: boolean;
    valid: boolean;
    schemas: string[];
  } {
    const scripts = dom.querySelectorAll('script[type="application/ld+json"]');
    const schemas: string[] = [];
    let valid = true;

    scripts.forEach(script => {
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
      present: scripts.length > 0,
      valid,
      schemas
    };
  }

  /**
   * 检查Microdata
   */
  private checkMicrodata(dom: Document): {
    present: boolean;
    valid: boolean;
    items: number;
  } {
    const itemscopes = dom.querySelectorAll('[itemscope]');

    return {
      present: itemscopes.length > 0,
      valid: true, // 简化检查
      items: itemscopes.length
    };
  }

  /**
   * 提取Schema类型
   */
  private extractSchemas(dom: Document): {
    type: string;
    valid: boolean;
    errors: string[];
  }[] {
    const schemas: { type: string; valid: boolean; errors: string[] }[] = [];

    // 检查JSON-LD schemas
    const scripts = dom.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type']) {
          schemas.push({
            type: data['@type'],
            valid: true,
            errors: []
          });
        }
      } catch (error) {
        schemas.push({
          type: 'Unknown',
          valid: false,
          errors: ['JSON格式错误']
        });
      }
    });

    return schemas;
  }

  /**
   * 计算结构化数据分数
   */
  private calculateStructuredDataScore(results: any): number {
    let score = 100;

    if (!results.jsonLd.present && !results.microdata.present) {
      score -= 60;
    } else {
      if (results.jsonLd.present && !results.jsonLd.valid) score -= 20;
      if (results.microdata.present && !results.microdata.valid) score -= 20;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 分析安全配置（本地文件版本）
   */
  private async analyzeSecurity(url: string, htmlContent: string): Promise<SecurityResult> {
    const issues: string[] = [];

    // 本地文件无法检查HTTPS和安全头
    issues.push('本地文件无法检查HTTPS和安全头配置，部署时需要配置');

    // 检查混合内容
    const mixedContent = this.checkMixedContent(htmlContent);

    const score = this.calculateLocalSecurityScore({
      mixedContent
    });

    return {
      score,
      https: {
        enabled: false,
        certificate: {
          valid: false,
          issuer: '',
          expires: ''
        }
      },
      headers: {
        contentSecurityPolicy: false,
        strictTransportSecurity: false,
        xFrameOptions: false,
        xContentTypeOptions: false,
        referrerPolicy: false
      },
      mixedContent,
      issues
    };
  }

  /**
   * 检查混合内容
   */
  private checkMixedContent(htmlContent: string): {
    present: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // 检查HTTP资源引用
    const httpResources = htmlContent.match(/src=["']http:\/\/[^"']+["']/gi) || [];
    const httpLinks = htmlContent.match(/href=["']http:\/\/[^"']+["']/gi) || [];

    if (httpResources.length > 0) {
      issues.push(`发现${httpResources.length}个HTTP资源引用，部署HTTPS时需要更新`);
    }

    if (httpLinks.length > 0) {
      issues.push(`发现${httpLinks.length}个HTTP链接，建议使用HTTPS`);
    }

    return {
      present: httpResources.length > 0 || httpLinks.length > 0,
      issues
    };
  }

  /**
   * 计算本地安全分数
   */
  private calculateLocalSecurityScore(results: any): number {
    let score = 60; // 本地文件基础分数

    if (results.mixedContent.present) {
      score -= 20;
    }

    return Math.max(0, Math.round(score));
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
    // 权重配置（针对本地文件调整）
    const weights = {
      technicalSEO: 0.15, // 降低权重，因为本地文件无法检查某些项目
      contentQuality: 0.35, // 提高权重，这是本地文件最重要的部分
      accessibility: 0.2,
      performance: 0.1, // 降低权重，本地文件性能分析有限
      mobileFriendly: 0.1,
      socialMedia: 0.05,
      structuredData: 0.03,
      security: 0.02 // 大幅降低权重，本地文件无法检查安全配置
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

    // 生成本地文件特定的问题和建议
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];

    // 添加本地文件特定建议
    recommendations.push({
      priority: 'high',
      category: '本地文件优化',
      title: '准备部署检查清单',
      description: '本地文件分析完成，准备部署时需要注意以下事项',
      implementation: '1. 配置HTTPS；2. 添加robots.txt和sitemap；3. 设置安全头；4. 检查相对路径',
      expectedImpact: '确保网站正常部署和SEO效果'
    });

    if (score < 80) {
      recommendations.push({
        priority: 'medium',
        category: '内容优化',
        title: '重点优化内容质量',
        description: '本地文件分析主要关注内容质量，这是最容易改进的部分',
        implementation: '优化标题、描述、标题结构和图片alt属性',
        expectedImpact: '显著提升SEO基础分数'
      });
    }

    return { score, grade, issues, recommendations };
  }
}
