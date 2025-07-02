const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * 本地SEO分析器
 * 支持分析本地HTML文件、站点地图、robots.txt等
 */
class LocalSEOAnalyzer {
  constructor() {
    this.name = 'Local SEO Analyzer';
    this.version = '1.0.0';
    this.supportedFormats = ['.html', '.htm', '.xml', '.txt', '.css', '.js'];
  }

  /**
   * 分析上传的文件
   */
  async analyzeUploadedFiles(files, options = {}) {
    const results = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      analyzedFiles: 0,
      fileAnalysis: [],
      siteStructure: {},
      overallScore: 0,
      issues: [],
      recommendations: [],
      summary: {}
    };

    console.log(`📁 开始分析 ${files.length} 个文件...`);

    for (const file of files) {
      try {
        const fileAnalysis = await this.analyzeFile(file, options);
        results.fileAnalysis.push(fileAnalysis);
        results.analyzedFiles++;
      } catch (error) {
        console.error(`分析文件失败: ${file.originalname}`, error);
        results.issues.push({
          type: 'file_error',
          severity: 'medium',
          message: `无法分析文件: ${file.originalname} - ${error.message}`
        });
      }
    }

    // 分析站点结构
    results.siteStructure = this.analyzeSiteStructure(results.fileAnalysis);

    // 生成整体建议
    this.generateOverallRecommendations(results);

    // 计算总体分数
    results.overallScore = this.calculateOverallScore(results);

    console.log(`✅ 本地SEO分析完成，总体评分: ${results.overallScore}`);
    return results;
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(file, options = {}) {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const analysis = {
      filename: file.originalname,
      fileType: fileExt,
      size: file.size,
      encoding: 'utf-8',
      analysis: {},
      issues: [],
      score: 0
    };

    const content = file.buffer.toString('utf-8');

    switch (fileExt) {
      case '.html':
      case '.htm':
        analysis.analysis = await this.analyzeHTMLFile(content, file.originalname, options);
        break;
      case '.xml':
        analysis.analysis = await this.analyzeXMLFile(content, file.originalname);
        break;
      case '.txt':
        analysis.analysis = await this.analyzeTxtFile(content, file.originalname);
        break;
      case '.css':
        analysis.analysis = await this.analyzeCSSFile(content, file.originalname);
        break;
      case '.js':
        analysis.analysis = await this.analyzeJSFile(content, file.originalname);
        break;
      default:
        analysis.issues.push({
          type: 'unsupported_format',
          severity: 'low',
          message: `不支持的文件格式: ${fileExt}`
        });
    }

    analysis.score = this.calculateFileScore(analysis);
    return analysis;
  }

  /**
   * 分析HTML文件
   */
  async analyzeHTMLFile(content, filename, options = {}) {
    const $ = cheerio.load(content);
    const analysis = {
      type: 'html',
      title: $('title').text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      metaKeywords: $('meta[name="keywords"]').attr('content') || '',
      headings: this.extractHeadings($),
      images: this.analyzeImages($),
      links: this.analyzeLinks($),
      structuredData: this.extractStructuredData($),
      openGraph: this.extractOpenGraph($),
      twitterCard: this.extractTwitterCard($),
      technicalSEO: this.analyzeTechnicalSEO($),
      content: this.analyzeContent($),
      performance: this.analyzePerformance($),
      accessibility: this.analyzeAccessibility($),
      issues: [],
      recommendations: []
    };

    // 执行各种SEO检查
    this.checkTitleTag(analysis);
    this.checkMetaDescription(analysis);
    this.checkHeadingStructure(analysis);
    this.checkImageOptimization(analysis);
    this.checkInternalLinks(analysis);
    this.checkContentQuality(analysis);

    return analysis;
  }

  /**
   * 提取标题结构
   */
  extractHeadings($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const $el = $(el);
      headings.push({
        level: parseInt(el.tagName.substring(1)),
        text: $el.text().trim(),
        id: $el.attr('id') || '',
        class: $el.attr('class') || ''
      });
    });
    return headings;
  }

  /**
   * 分析图片
   */
  analyzeImages($) {
    const images = [];
    $('img').each((i, el) => {
      const $el = $(el);
      images.push({
        src: $el.attr('src') || '',
        alt: $el.attr('alt') || '',
        title: $el.attr('title') || '',
        width: $el.attr('width') || '',
        height: $el.attr('height') || '',
        loading: $el.attr('loading') || '',
        hasAlt: !!$el.attr('alt'),
        hasTitle: !!$el.attr('title'),
        hasLazyLoading: $el.attr('loading') === 'lazy'
      });
    });
    return images;
  }

  /**
   * 分析链接
   */
  analyzeLinks($) {
    const links = [];
    $('a[href]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      links.push({
        href: href,
        text: $el.text().trim(),
        title: $el.attr('title') || '',
        rel: $el.attr('rel') || '',
        target: $el.attr('target') || '',
        isExternal: this.isExternalLink(href),
        isInternal: this.isInternalLink(href),
        hasTitle: !!$el.attr('title'),
        hasNofollow: ($el.attr('rel') || '').includes('nofollow')
      });
    });
    return links;
  }

  /**
   * 提取结构化数据
   */
  extractStructuredData($) {
    const structuredData = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        structuredData.push({
          type: 'json-ld',
          data: data
        });
      } catch (error) {
        // 忽略解析错误
      }
    });

    // Microdata
    $('[itemscope]').each((i, el) => {
      const $el = $(el);
      structuredData.push({
        type: 'microdata',
        itemtype: $el.attr('itemtype') || '',
        itemscope: true
      });
    });

    return structuredData;
  }

  /**
   * 提取Open Graph数据
   */
  extractOpenGraph($) {
    const og = {};
    $('meta[property^="og:"]').each((i, el) => {
      const $el = $(el);
      const property = $el.attr('property').replace('og:', '');
      og[property] = $el.attr('content') || '';
    });
    return og;
  }

  /**
   * 提取Twitter Card数据
   */
  extractTwitterCard($) {
    const twitter = {};
    $('meta[name^="twitter:"]').each((i, el) => {
      const $el = $(el);
      const name = $el.attr('name').replace('twitter:', '');
      twitter[name] = $el.attr('content') || '';
    });
    return twitter;
  }

  /**
   * 技术SEO分析
   */
  analyzeTechnicalSEO($) {
    return {
      doctype: this.checkDoctype($),
      lang: $('html').attr('lang') || '',
      charset: this.getCharset($),
      viewport: $('meta[name="viewport"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      hreflang: this.getHreflangTags($),
      schema: this.hasSchemaMarkup($)
    };
  }

  /**
   * 内容分析
   */
  analyzeContent($) {
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const words = textContent.split(' ').filter(word => word.length > 0);

    return {
      wordCount: words.length,
      characterCount: textContent.length,
      paragraphCount: $('p').length,
      readabilityScore: this.calculateReadabilityScore(textContent),
      keywordDensity: this.calculateKeywordDensity(words),
      duplicateContent: this.checkDuplicateContent($)
    };
  }

  /**
   * 性能分析
   */
  analyzePerformance($) {
    return {
      cssFiles: $('link[rel="stylesheet"]').length,
      jsFiles: $('script[src]').length,
      inlineStyles: $('style').length,
      inlineScripts: $('script:not([src])').length,
      images: $('img').length,
      totalElements: $('*').length,
      hasMinifiedResources: this.checkMinifiedResources($)
    };
  }

  /**
   * 可访问性分析
   */
  analyzeAccessibility($) {
    return {
      imagesWithoutAlt: $('img:not([alt])').length,
      linksWithoutText: $('a:not(:has(text))').length,
      headingStructure: this.checkHeadingStructure($),
      formLabels: this.checkFormLabels($),
      colorContrast: this.checkColorContrast($),
      skipLinks: $('a[href^="#"]').length
    };
  }

  /**
   * 检查标题标签
   */
  checkTitleTag(analysis) {
    const title = analysis.title;
    if (!title) {
      analysis.issues.push({
        type: 'missing_title',
        severity: 'high',
        message: '缺少页面标题'
      });
    } else if (title.length < 30) {
      analysis.issues.push({
        type: 'short_title',
        severity: 'medium',
        message: `页面标题过短 (${title.length} 字符)`
      });
    } else if (title.length > 60) {
      analysis.issues.push({
        type: 'long_title',
        severity: 'medium',
        message: `页面标题过长 (${title.length} 字符)`
      });
    }
  }

  /**
   * 检查Meta描述
   */
  checkMetaDescription(analysis) {
    const description = analysis.metaDescription;
    if (!description) {
      analysis.issues.push({
        type: 'missing_meta_description',
        severity: 'high',
        message: '缺少Meta描述'
      });
    } else if (description.length < 120) {
      analysis.issues.push({
        type: 'short_meta_description',
        severity: 'medium',
        message: `Meta描述过短 (${description.length} 字符)`
      });
    } else if (description.length > 160) {
      analysis.issues.push({
        type: 'long_meta_description',
        severity: 'medium',
        message: `Meta描述过长 (${description.length} 字符)`
      });
    }
  }

  /**
   * 检查标题结构
   */
  checkHeadingStructure(analysis) {
    const headings = analysis.headings;
    const h1Count = headings.filter(h => h.level === 1).length;

    if (h1Count === 0) {
      analysis.issues.push({
        type: 'missing_h1',
        severity: 'high',
        message: '缺少H1标签'
      });
    } else if (h1Count > 1) {
      analysis.issues.push({
        type: 'multiple_h1',
        severity: 'medium',
        message: `页面有多个H1标签 (${h1Count}个)`
      });
    }

    // 检查标题层级结构
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      if (current.level > previous.level + 1) {
        analysis.issues.push({
          type: 'heading_structure',
          severity: 'low',
          message: `标题层级跳跃: H${previous.level} 到 H${current.level}`
        });
      }
    }
  }

  /**
   * 检查图片优化
   */
  checkImageOptimization(analysis) {
    const images = analysis.images;
    const imagesWithoutAlt = images.filter(img => !img.hasAlt);

    if (imagesWithoutAlt.length > 0) {
      analysis.issues.push({
        type: 'images_without_alt',
        severity: 'medium',
        message: `${imagesWithoutAlt.length} 张图片缺少alt属性`
      });
    }

    const imagesWithoutLazyLoading = images.filter(img => !img.hasLazyLoading);
    if (imagesWithoutLazyLoading.length > 3) {
      analysis.recommendations.push({
        type: 'lazy_loading',
        priority: 'medium',
        message: '建议为图片添加懒加载以提升性能'
      });
    }
  }

  /**
   * 辅助方法
   */
  isExternalLink(href) {
    return href && (href.startsWith('http://') || href.startsWith('https://'));
  }

  isInternalLink(href) {
    return href && (href.startsWith('/') || href.startsWith('#') || href.startsWith('./'));
  }

  checkDoctype($) {
    // 简化的doctype检查
    return true;
  }

  getCharset($) {
    return $('meta[charset]').attr('charset') ||
      $('meta[http-equiv="Content-Type"]').attr('content') || '';
  }

  getHreflangTags($) {
    const hreflang = [];
    $('link[rel="alternate"][hreflang]').each((i, el) => {
      const $el = $(el);
      hreflang.push({
        hreflang: $el.attr('hreflang'),
        href: $el.attr('href')
      });
    });
    return hreflang;
  }

  hasSchemaMarkup($) {
    return $('script[type="application/ld+json"]').length > 0 ||
      $('[itemscope]').length > 0;
  }

  calculateReadabilityScore(text) {
    // 简化的可读性评分
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;

    if (avgWordsPerSentence < 15) return 'easy';
    if (avgWordsPerSentence < 20) return 'medium';
    return 'hard';
  }

  calculateKeywordDensity(words) {
    const wordCount = {};
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });

    const sortedWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        density: ((count / words.length) * 100).toFixed(2)
      }));

    return sortedWords;
  }

  checkDuplicateContent($) {
    // 简化的重复内容检查
    const paragraphs = [];
    $('p').each((i, el) => {
      paragraphs.push($(el).text().trim());
    });

    const duplicates = paragraphs.filter((p, i) =>
      paragraphs.indexOf(p) !== i && p.length > 50
    );

    return duplicates.length;
  }

  checkMinifiedResources($) {
    // 检查是否有压缩的资源
    const cssFiles = [];
    $('link[rel="stylesheet"]').each((i, el) => {
      cssFiles.push($(el).attr('href'));
    });

    const jsFiles = [];
    $('script[src]').each((i, el) => {
      jsFiles.push($(el).attr('src'));
    });

    const minifiedCss = cssFiles.filter(file => file && file.includes('.min.')).length;
    const minifiedJs = jsFiles.filter(file => file && file.includes('.min.')).length;

    return {
      cssMinified: minifiedCss,
      jsMinified: minifiedJs,
      totalCss: cssFiles.length,
      totalJs: jsFiles.length
    };
  }

  checkHeadingStructure($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push(parseInt(el.tagName.substring(1)));
    });

    let structureScore = 100;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        structureScore -= 10;
      }
    }

    return Math.max(0, structureScore);
  }

  checkFormLabels($) {
    const inputs = $('input, textarea, select').length;
    const labels = $('label').length;
    return {
      totalInputs: inputs,
      totalLabels: labels,
      ratio: inputs > 0 ? (labels / inputs * 100).toFixed(2) : 100
    };
  }

  checkColorContrast($) {
    // 简化的颜色对比度检查
    return {
      score: 85, // 默认评分
      issues: []
    };
  }

  /**
   * 计算文件分数
   */
  calculateFileScore(analysis) {
    let score = 100;

    analysis.issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * 分析站点结构
   */
  analyzeSiteStructure(fileAnalysis) {
    const htmlFiles = fileAnalysis.filter(f => f.fileType === '.html' || f.fileType === '.htm');
    const xmlFiles = fileAnalysis.filter(f => f.fileType === '.xml');
    const txtFiles = fileAnalysis.filter(f => f.fileType === '.txt');

    return {
      totalPages: htmlFiles.length,
      sitemaps: xmlFiles.filter(f => f.filename.toLowerCase().includes('sitemap')).length,
      robotsTxt: txtFiles.filter(f => f.filename.toLowerCase() === 'robots.txt').length,
      structure: this.buildSiteStructure(htmlFiles)
    };
  }

  buildSiteStructure(htmlFiles) {
    // 构建站点结构树
    const structure = {
      pages: htmlFiles.map(file => ({
        filename: file.filename,
        title: file.analysis.title || '',
        score: file.score,
        issues: file.issues.length
      }))
    };

    return structure;
  }

  /**
   * 生成整体建议
   */
  generateOverallRecommendations(results) {
    const allIssues = results.fileAnalysis.flatMap(f => f.issues || []);
    const issueTypes = {};

    allIssues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });

    // 根据常见问题生成建议
    Object.entries(issueTypes).forEach(([type, count]) => {
      if (count >= 2) {
        results.recommendations.push({
          type: 'global',
          priority: 'high',
          title: `修复 ${type} 问题`,
          description: `在 ${count} 个文件中发现了 ${type} 问题，建议统一修复`
        });
      }
    });
  }

  /**
   * 分析XML文件（站点地图等）
   */
  async analyzeXMLFile(content, filename) {
    const analysis = {
      type: 'xml',
      isSitemap: filename.toLowerCase().includes('sitemap'),
      isRobotsTxt: false,
      urls: [],
      issues: [],
      recommendations: []
    };

    if (analysis.isSitemap) {
      try {
        // 解析站点地图
        const cheerio = require('cheerio');
        const $ = cheerio.load(content, { xmlMode: true });

        $('url').each((i, el) => {
          const $el = $(el);
          analysis.urls.push({
            loc: $el.find('loc').text(),
            lastmod: $el.find('lastmod').text(),
            changefreq: $el.find('changefreq').text(),
            priority: $el.find('priority').text()
          });
        });

        // 检查站点地图质量
        if (analysis.urls.length === 0) {
          analysis.issues.push({
            type: 'empty_sitemap',
            severity: 'high',
            message: '站点地图为空'
          });
        } else if (analysis.urls.length > 50000) {
          analysis.issues.push({
            type: 'large_sitemap',
            severity: 'medium',
            message: `站点地图包含过多URL (${analysis.urls.length}个)`
          });
        }

        // 检查URL格式
        const invalidUrls = analysis.urls.filter(url => !this.isValidUrl(url.loc));
        if (invalidUrls.length > 0) {
          analysis.issues.push({
            type: 'invalid_urls',
            severity: 'high',
            message: `${invalidUrls.length} 个无效的URL格式`
          });
        }

      } catch (error) {
        analysis.issues.push({
          type: 'xml_parse_error',
          severity: 'high',
          message: `XML解析错误: ${error.message}`
        });
      }
    }

    return analysis;
  }

  /**
   * 分析TXT文件（robots.txt等）
   */
  async analyzeTxtFile(content, filename) {
    const analysis = {
      type: 'txt',
      isRobotsTxt: filename.toLowerCase() === 'robots.txt',
      directives: [],
      issues: [],
      recommendations: []
    };

    if (analysis.isRobotsTxt) {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      let currentUserAgent = '*';

      lines.forEach(line => {
        if (line.startsWith('User-agent:')) {
          currentUserAgent = line.split(':')[1].trim();
        } else if (line.startsWith('Disallow:') || line.startsWith('Allow:')) {
          const directive = line.split(':')[0];
          const path = line.split(':')[1].trim();
          analysis.directives.push({
            userAgent: currentUserAgent,
            directive: directive,
            path: path
          });
        } else if (line.startsWith('Sitemap:')) {
          const sitemapUrl = line.split(':').slice(1).join(':').trim();
          analysis.directives.push({
            type: 'sitemap',
            url: sitemapUrl
          });
        }
      });

      // 检查robots.txt质量
      if (analysis.directives.length === 0) {
        analysis.issues.push({
          type: 'empty_robots',
          severity: 'medium',
          message: 'robots.txt文件为空'
        });
      }

      const sitemapDirectives = analysis.directives.filter(d => d.type === 'sitemap');
      if (sitemapDirectives.length === 0) {
        analysis.recommendations.push({
          type: 'add_sitemap',
          priority: 'medium',
          message: '建议在robots.txt中添加站点地图引用'
        });
      }
    }

    return analysis;
  }

  /**
   * 分析CSS文件
   */
  async analyzeCSSFile(content, filename) {
    const analysis = {
      type: 'css',
      size: content.length,
      isMinified: filename.includes('.min.'),
      rules: 0,
      selectors: 0,
      issues: [],
      recommendations: []
    };

    // 简单的CSS分析
    const ruleMatches = content.match(/\{[^}]*\}/g) || [];
    analysis.rules = ruleMatches.length;

    const selectorMatches = content.match(/[^{}]+(?=\s*\{)/g) || [];
    analysis.selectors = selectorMatches.length;

    // 检查CSS优化
    if (!analysis.isMinified && content.length > 10000) {
      analysis.recommendations.push({
        type: 'minify_css',
        priority: 'medium',
        message: '建议压缩CSS文件以提升性能'
      });
    }

    // 检查媒体查询（响应式设计）
    const mediaQueries = content.match(/@media[^{]+\{/g) || [];
    if (mediaQueries.length === 0) {
      analysis.issues.push({
        type: 'no_responsive',
        severity: 'medium',
        message: '未检测到响应式设计的媒体查询'
      });
    }

    return analysis;
  }

  /**
   * 分析JS文件
   */
  async analyzeJSFile(content, filename) {
    const analysis = {
      type: 'js',
      size: content.length,
      isMinified: filename.includes('.min.'),
      functions: 0,
      issues: [],
      recommendations: []
    };

    // 简单的JS分析
    const functionMatches = content.match(/function\s+\w+\s*\(/g) || [];
    analysis.functions = functionMatches.length;

    // 检查JS优化
    if (!analysis.isMinified && content.length > 10000) {
      analysis.recommendations.push({
        type: 'minify_js',
        priority: 'medium',
        message: '建议压缩JavaScript文件以提升性能'
      });
    }

    // 检查SEO相关的JS问题
    if (content.includes('document.write')) {
      analysis.issues.push({
        type: 'document_write',
        severity: 'medium',
        message: '使用document.write可能影响SEO'
      });
    }

    return analysis;
  }

  /**
   * 验证URL格式
   */
  isValidUrl(urlString) {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 计算总体分数
   */
  calculateOverallScore(results) {
    if (results.fileAnalysis.length === 0) return 0;

    const totalScore = results.fileAnalysis.reduce((sum, file) => sum + file.score, 0);
    return Math.round(totalScore / results.fileAnalysis.length);
  }
}

module.exports = { LocalSEOAnalyzer };
