const { RealSEOTestEngine } = require('./realSEOTestEngine');
const { LocalSEOAnalyzer } = require('./localSEOAnalyzer');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');

/**
 * 增强的SEO测试引擎
 * 集成在线分析和本地文件分析功能
 * 添加专业SEO工具的高级功能
 */
class EnhancedSEOEngine extends RealSEOTestEngine {
  constructor() {
    super();
    this.name = 'Enhanced SEO Engine';
    this.version = '2.0.0';
    this.localAnalyzer = new LocalSEOAnalyzer();
    this.crawledPages = new Map();
    this.siteStructure = {};
  }

  /**
   * 运行增强的SEO分析
   */
  async runEnhancedSEOTest(url, options = {}) {
    console.log(`🚀 Starting enhanced SEO analysis for: ${url}`);
    
    const results = await super.runSEOTest(url, options);
    
    // 添加增强功能
    if (options.deepCrawl) {
      results.deepCrawl = await this.performDeepCrawl(url, options);
    }
    
    if (options.competitorAnalysis && options.competitorUrls) {
      results.competitorAnalysis = await this.performCompetitorAnalysis(url, options.competitorUrls);
    }
    
    if (options.backlinksAnalysis) {
      results.backlinks = await this.analyzeBacklinks(url);
    }
    
    if (options.keywordRanking && options.keywords) {
      results.keywordRanking = await this.analyzeKeywordRanking(url, options.keywords);
    }
    
    if (options.internationalSEO) {
      results.internationalSEO = await this.analyzeInternationalSEO(url);
    }
    
    if (options.technicalAudit) {
      results.technicalAudit = await this.performTechnicalAudit(url);
    }
    
    // 重新计算增强后的总体分数
    this.calculateEnhancedScore(results);
    
    return results;
  }

  /**
   * 分析本地文件
   */
  async analyzeLocalFiles(files, options = {}) {
    console.log(`📁 Starting local file SEO analysis...`);
    return await this.localAnalyzer.analyzeUploadedFiles(files, options);
  }

  /**
   * 深度爬取分析
   */
  async performDeepCrawl(baseUrl, options = {}) {
    const maxPages = options.maxPages || 50;
    const maxDepth = options.maxDepth || 3;
    
    console.log(`🕷️ Starting deep crawl (max ${maxPages} pages, depth ${maxDepth})`);
    
    const crawlResults = {
      totalPages: 0,
      crawledPages: [],
      internalLinks: [],
      externalLinks: [],
      brokenLinks: [],
      duplicateContent: [],
      siteStructure: {},
      issues: [],
      recommendations: []
    };

    const urlsToCrawl = [{ url: baseUrl, depth: 0 }];
    const crawledUrls = new Set();
    
    while (urlsToCrawl.length > 0 && crawlResults.totalPages < maxPages) {
      const { url, depth } = urlsToCrawl.shift();
      
      if (crawledUrls.has(url) || depth > maxDepth) continue;
      
      try {
        const pageData = await this.crawlPage(url);
        crawledUrls.add(url);
        crawlResults.totalPages++;
        
        crawlResults.crawledPages.push({
          url: url,
          depth: depth,
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          statusCode: pageData.statusCode,
          loadTime: pageData.loadTime,
          wordCount: pageData.wordCount,
          issues: pageData.issues
        });
        
        // 提取内部链接用于进一步爬取
        if (depth < maxDepth) {
          pageData.internalLinks.forEach(link => {
            if (!crawledUrls.has(link)) {
              urlsToCrawl.push({ url: link, depth: depth + 1 });
            }
          });
        }
        
        crawlResults.internalLinks.push(...pageData.internalLinks);
        crawlResults.externalLinks.push(...pageData.externalLinks);
        
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error.message);
        crawlResults.brokenLinks.push({
          url: url,
          error: error.message
        });
      }
    }
    
    // 分析爬取结果
    this.analyzeCrawlResults(crawlResults);
    
    return crawlResults;
  }

  /**
   * 爬取单个页面
   */
  async crawlPage(url) {
    const startTime = Date.now();
    const pageData = await this.fetchPageData(url);
    const loadTime = Date.now() - startTime;
    
    const $ = pageData.$;
    const html = pageData.html;
    
    // 提取页面信息
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').length;
    
    // 提取链接
    const internalLinks = [];
    const externalLinks = [];
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const absoluteUrl = this.resolveUrl(href, url);
      
      if (this.isInternalUrl(absoluteUrl, url)) {
        internalLinks.push(absoluteUrl);
      } else if (this.isExternalUrl(absoluteUrl)) {
        externalLinks.push(absoluteUrl);
      }
    });
    
    // 检查页面问题
    const issues = [];
    if (!title) issues.push('缺少页面标题');
    if (!metaDescription) issues.push('缺少Meta描述');
    if (wordCount < 300) issues.push('内容过少');
    
    return {
      title,
      metaDescription,
      statusCode: pageData.statusCode || 200,
      loadTime,
      wordCount,
      internalLinks: [...new Set(internalLinks)],
      externalLinks: [...new Set(externalLinks)],
      issues
    };
  }

  /**
   * 竞争对手分析
   */
  async performCompetitorAnalysis(targetUrl, competitorUrls) {
    console.log(`🏆 Analyzing ${competitorUrls.length} competitors`);
    
    const analysis = {
      target: {},
      competitors: [],
      comparison: {},
      insights: []
    };
    
    // 分析目标网站
    try {
      analysis.target = await this.analyzeCompetitorSite(targetUrl);
    } catch (error) {
      console.error('Failed to analyze target site:', error);
    }
    
    // 分析竞争对手
    for (const competitorUrl of competitorUrls) {
      try {
        const competitorData = await this.analyzeCompetitorSite(competitorUrl);
        analysis.competitors.push(competitorData);
      } catch (error) {
        console.error(`Failed to analyze competitor ${competitorUrl}:`, error);
      }
    }
    
    // 生成对比分析
    analysis.comparison = this.generateCompetitorComparison(analysis.target, analysis.competitors);
    analysis.insights = this.generateCompetitorInsights(analysis.comparison);
    
    return analysis;
  }

  /**
   * 分析竞争对手网站
   */
  async analyzeCompetitorSite(url) {
    const pageData = await this.fetchPageData(url);
    const $ = pageData.$;
    
    return {
      url: url,
      title: $('title').text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1Count: $('h1').length,
      imageCount: $('img').length,
      linkCount: $('a').length,
      wordCount: $('body').text().replace(/\s+/g, ' ').trim().split(' ').length,
      hasOpenGraph: $('meta[property^="og:"]').length > 0,
      hasTwitterCard: $('meta[name^="twitter:"]').length > 0,
      hasStructuredData: $('script[type="application/ld+json"]').length > 0,
      loadTime: pageData.loadTime || 0,
      technologies: this.detectTechnologies($)
    };
  }

  /**
   * 检测网站技术栈
   */
  detectTechnologies($) {
    const technologies = [];
    
    // 检测常见的CMS和框架
    if ($('meta[name="generator"]').attr('content')) {
      technologies.push($('meta[name="generator"]').attr('content'));
    }
    
    // 检测JavaScript框架
    if ($('script[src*="react"]').length > 0) technologies.push('React');
    if ($('script[src*="vue"]').length > 0) technologies.push('Vue.js');
    if ($('script[src*="angular"]').length > 0) technologies.push('Angular');
    if ($('script[src*="jquery"]').length > 0) technologies.push('jQuery');
    
    // 检测CSS框架
    if ($('link[href*="bootstrap"]').length > 0) technologies.push('Bootstrap');
    if ($('link[href*="tailwind"]').length > 0) technologies.push('Tailwind CSS');
    
    return technologies;
  }

  /**
   * 反向链接分析
   */
  async analyzeBacklinks(url) {
    console.log(`🔗 Analyzing backlinks for: ${url}`);
    
    // 注意：真实的反向链接分析需要专门的数据源
    // 这里提供一个基础框架
    const analysis = {
      totalBacklinks: 0,
      domains: 0,
      topBacklinks: [],
      anchorTexts: [],
      linkTypes: {
        dofollow: 0,
        nofollow: 0
      },
      recommendations: []
    };
    
    // 模拟一些基础的反向链接检查
    try {
      // 检查一些常见的反向链接来源
      const commonSources = [
        'https://www.google.com',
        'https://www.bing.com',
        'https://www.yahoo.com'
      ];
      
      for (const source of commonSources) {
        try {
          // 这里可以实现更复杂的反向链接检查逻辑
          // 由于需要专门的数据源，这里只是示例
        } catch (error) {
          // 忽略错误
        }
      }
      
      analysis.recommendations.push({
        type: 'backlink_strategy',
        priority: 'high',
        title: '建立反向链接策略',
        description: '建议使用专业的SEO工具（如Ahrefs、Majestic）进行详细的反向链接分析'
      });
      
    } catch (error) {
      console.error('Backlink analysis error:', error);
    }
    
    return analysis;
  }

  /**
   * 关键词排名分析
   */
  async analyzeKeywordRanking(url, keywords) {
    console.log(`🔑 Analyzing keyword rankings for: ${keywords}`);
    
    const analysis = {
      keywords: [],
      averagePosition: 0,
      topKeywords: [],
      opportunities: [],
      recommendations: []
    };
    
    const keywordList = keywords.split(',').map(k => k.trim());
    
    for (const keyword of keywordList) {
      try {
        // 模拟关键词排名检查
        // 真实实现需要搜索引擎API或专门的SEO工具
        const ranking = {
          keyword: keyword,
          position: Math.floor(Math.random() * 100) + 1, // 模拟排名
          searchVolume: Math.floor(Math.random() * 10000), // 模拟搜索量
          difficulty: Math.floor(Math.random() * 100), // 模拟难度
          opportunity: 'medium'
        };
        
        analysis.keywords.push(ranking);
        
      } catch (error) {
        console.error(`Failed to analyze keyword: ${keyword}`, error);
      }
    }
    
    // 计算平均排名
    if (analysis.keywords.length > 0) {
      analysis.averagePosition = Math.round(
        analysis.keywords.reduce((sum, k) => sum + k.position, 0) / analysis.keywords.length
      );
    }
    
    // 生成建议
    analysis.recommendations.push({
      type: 'keyword_optimization',
      priority: 'high',
      title: '关键词优化建议',
      description: '建议使用专业的关键词研究工具进行深入分析'
    });
    
    return analysis;
  }

  /**
   * 国际化SEO分析
   */
  async analyzeInternationalSEO(url) {
    console.log(`🌍 Analyzing international SEO for: ${url}`);
    
    const pageData = await this.fetchPageData(url);
    const $ = pageData.$;
    
    const analysis = {
      hreflang: [],
      language: $('html').attr('lang') || '',
      alternateVersions: [],
      issues: [],
      recommendations: []
    };
    
    // 检查hreflang标签
    $('link[rel="alternate"][hreflang]').each((i, el) => {
      const $el = $(el);
      analysis.hreflang.push({
        hreflang: $el.attr('hreflang'),
        href: $el.attr('href')
      });
    });
    
    // 检查语言设置
    if (!analysis.language) {
      analysis.issues.push({
        type: 'missing_lang',
        severity: 'medium',
        message: '缺少HTML lang属性'
      });
    }
    
    // 检查国际化最佳实践
    if (analysis.hreflang.length === 0) {
      analysis.recommendations.push({
        type: 'hreflang',
        priority: 'medium',
        title: '添加hreflang标签',
        description: '如果网站有多语言版本，建议添加hreflang标签'
      });
    }
    
    return analysis;
  }

  /**
   * 技术审计
   */
  async performTechnicalAudit(url) {
    console.log(`🔧 Performing technical audit for: ${url}`);
    
    const audit = {
      crawlability: {},
      indexability: {},
      siteSpeed: {},
      mobileUsability: {},
      security: {},
      issues: [],
      recommendations: []
    };
    
    try {
      const pageData = await this.fetchPageData(url);
      const $ = pageData.$;
      
      // 爬取性检查
      audit.crawlability = await this.checkCrawlability(url);
      
      // 索引性检查
      audit.indexability = this.checkIndexability($);
      
      // 网站速度检查
      audit.siteSpeed = await this.checkSiteSpeed(url);
      
      // 移动可用性检查
      audit.mobileUsability = this.checkMobileUsability($);
      
      // 安全性检查
      audit.security = await this.checkSecurity(url);
      
    } catch (error) {
      console.error('Technical audit error:', error);
      audit.issues.push({
        type: 'audit_error',
        severity: 'high',
        message: `技术审计失败: ${error.message}`
      });
    }
    
    return audit;
  }

  /**
   * 辅助方法
   */
  resolveUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  isInternalUrl(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);
      return urlObj.hostname === baseUrlObj.hostname;
    } catch {
      return false;
    }
  }

  isExternalUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 计算增强后的总体分数
   */
  calculateEnhancedScore(results) {
    // 基于更多因素重新计算分数
    const weights = {
      technical: 0.15,
      content: 0.15,
      onPage: 0.15,
      performance: 0.10,
      mobile: 0.08,
      social: 0.05,
      coreWebVitals: 0.08,
      pageExperience: 0.05,
      deepCrawl: 0.07,
      competitorAnalysis: 0.05,
      backlinks: 0.04,
      internationalSEO: 0.03
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      if (results.scores && results.scores[key] !== undefined) {
        totalScore += results.scores[key] * weight;
        totalWeight += weight;
      } else if (results[key] && results[key].score !== undefined) {
        totalScore += results[key].score * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight > 0) {
      results.overallScore = Math.round(totalScore / totalWeight);
    }
  }
}

module.exports = { EnhancedSEOEngine };
