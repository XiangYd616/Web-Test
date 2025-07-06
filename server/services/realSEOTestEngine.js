const http = require('http');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');
const { SEOReportGenerator } = require('./seoReportGenerator');

/**
 * 真实的SEO分析测试引擎
 * 提供全面的SEO分析功能，包括技术SEO、内容分析、性能优化等
 */
class RealSEOTestEngine {
  constructor() {
    this.name = 'Enhanced SEO Analyzer';
    this.version = '3.0.0';
    this.isAvailable = true;
    this.activeTests = new Map();
    this.reportGenerator = new SEOReportGenerator();

    // SEO分析配置
    this.config = {
      userAgent: 'Mozilla/5.0 (compatible; SEOBot/3.0; +https://testweb.com/bot)',
      timeout: 30000,
      maxRedirects: 5,
      maxContentLength: 10 * 1024 * 1024, // 10MB
      enableJavaScript: false, // 基础版本不执行JS
      followRobots: true,
      respectCrawlDelay: true
    };

    // 初始化SEO规则库
    this.initializeSEORules();
  }

  /**
   * 初始化SEO规则库
   */
  initializeSEORules() {
    this.seoRules = {
      title: {
        minLength: 30,
        maxLength: 60,
        weight: 25
      },
      metaDescription: {
        minLength: 120,
        maxLength: 160,
        weight: 20
      },
      headings: {
        h1Count: { min: 1, max: 1, weight: 15 },
        h2Count: { min: 1, max: 10, weight: 10 },
        hierarchyWeight: 10
      },
      content: {
        minWordCount: 300,
        optimalWordCount: 1000,
        weight: 15
      },
      images: {
        altTextWeight: 10,
        sizeOptimizationWeight: 5
      },
      links: {
        internalWeight: 5,
        externalWeight: 5
      },
      technical: {
        httpsWeight: 10,
        robotsWeight: 5,
        sitemapWeight: 5,
        canonicalWeight: 5,
        schemaWeight: 10
      }
    };
  }

  /**
   * 检查SEO测试引擎是否可用
   */
  async checkAvailability() {
    try {
      // 测试基本HTTP请求能力
      await this.makeHttpRequest('https://httpbin.org/status/200', { timeout: 5000 });
      return true;
    } catch (error) {
      console.error('SEO引擎可用性检查失败:', error.message);
      return false;
    }
  }

  /**
   * 运行SEO分析测试
   */
  async runSEOTest(url, options = {}) {
    const testId = `seo-${Date.now()}`;
    console.log(`📄 Starting comprehensive SEO analysis for: ${url}`);

    const startTime = Date.now();
    const results = {
      testId,
      url,
      timestamp: new Date().toISOString(),
      testType: 'seo',
      status: 'running',
      progress: 0,

      // SEO分析结果
      overallScore: 0,
      scores: {
        technical: 0,
        content: 0,
        onPage: 0,
        performance: 0,
        mobile: 0,
        social: 0
      },

      // 详细检查结果
      checks: {
        technical: {},
        content: {},
        onPage: {},
        performance: {},
        mobile: {},
        social: {},
        structured: {}
      },

      // 问题和建议
      issues: [],
      recommendations: [],

      // 关键词分析
      keywords: {
        density: {},
        suggestions: [],
        missing: []
      },

      // 竞争对手分析
      competitors: [],

      // 页面信息
      pageInfo: {},

      // 元数据
      metadata: {
        crawlTime: 0,
        pageSize: 0,
        loadTime: 0,
        resources: []
      }
    };

    this.activeTests.set(testId, results);

    try {
      // 1. 获取页面内容和元数据
      console.log('🔍 Fetching page content and metadata...');
      results.progress = 5;
      const pageData = await this.fetchPageData(url, options);
      results.pageInfo = pageData.info;
      results.metadata = pageData.metadata;

      // 2. 技术SEO分析 - 基础技术要素
      console.log('⚙️ Analyzing technical SEO fundamentals...');
      results.progress = 15;
      results.checks.technical = await this.analyzeTechnicalSEO(pageData, options);
      results.scores.technical = results.checks.technical.score;

      // 3. 页面SEO分析 - 标题、描述、标签等
      console.log('📄 Analyzing on-page SEO elements...');
      results.progress = 25;
      results.checks.onPage = await this.analyzeOnPageSEO(pageData, options);
      results.scores.onPage = results.checks.onPage.score;

      // 4. 内容质量分析 - 内容深度、关键词等
      console.log('📝 Analyzing content quality and relevance...');
      results.progress = 35;
      results.checks.content = await this.analyzeContentSEO(pageData, options);
      results.scores.content = results.checks.content.score;

      // 5. 性能分析 - 加载速度、优化等
      console.log('⚡ Analyzing performance and speed factors...');
      results.progress = 45;
      results.checks.performance = await this.analyzePerformanceSEO(pageData, options);
      results.scores.performance = results.checks.performance.score;

      // 6. 移动友好性分析
      console.log('📱 Analyzing mobile-friendliness...');
      results.progress = 55;
      results.checks.mobile = await this.analyzeMobileSEO(pageData, options);
      results.scores.mobile = results.checks.mobile.score;

      // 7. 社交媒体优化分析
      console.log('📢 Analyzing social media optimization...');
      results.progress = 65;
      results.checks.social = await this.analyzeSocialSEO(pageData, options);
      results.scores.social = results.checks.social.score;

      // 8. 结构化数据分析
      console.log('🏗️ Analyzing structured data and schema markup...');
      results.progress = 65;
      results.checks.structured = await this.analyzeStructuredData(pageData, options);
      results.scores.structured = results.checks.structured.score;

      // 9. 可访问性分析
      console.log('♿ Analyzing accessibility features...');
      results.progress = 70;
      results.checks.accessibility = await this.analyzeAccessibility(pageData, options);
      results.scores.accessibility = results.checks.accessibility.score;

      // 10. 安全性分析
      console.log('🔒 Analyzing security features...');
      results.progress = 75;
      results.checks.security = await this.analyzeSecurity(pageData, options);
      results.scores.security = results.checks.security.score;

      // 11. Core Web Vitals分析
      console.log('⚡ Analyzing Core Web Vitals...');
      results.progress = 80;
      results.checks.coreWebVitals = await this.analyzeCoreWebVitals(pageData, options);
      results.scores.coreWebVitals = results.checks.coreWebVitals.score;

      // 12. 页面体验分析
      console.log('🎯 Analyzing page experience...');
      results.progress = 85;
      results.checks.pageExperience = await this.analyzePageExperience(pageData, options);
      results.scores.pageExperience = results.checks.pageExperience.score;

      // 13. 关键词分析（如果提供了关键词）
      if (options.keywords && options.keywords.trim()) {
        console.log('🔑 Analyzing keyword optimization...');
        results.progress = 88;
        results.keywords = await this.analyzeKeywords(pageData, options.keywords);
      }

      // 14. 竞争对手分析（如果启用）
      if (options.checkCompetitors && options.competitorUrls?.length > 0) {
        console.log('🏆 Analyzing competitor comparison...');
        results.progress = 92;
        results.competitors = await this.analyzeCompetitors(pageData, options.competitorUrls);
      }

      // 15. 计算总体分数和生成建议
      console.log('📊 Calculating overall score and generating recommendations...');
      results.progress = 95;
      this.calculateOverallScore(results);
      this.generateRecommendations(results);
      this.categorizeIssues(results);

      // 12. 生成SEO报告摘要
      console.log('📋 Generating SEO report summary...');
      results.summary = this.generateSEOSummary(results);

      results.status = 'completed';
      results.progress = 100;
      results.duration = Date.now() - startTime;

      console.log(`✅ SEO analysis completed for: ${url} (Score: ${results.overallScore})`);
      return results;

    } catch (error) {
      console.error('❌ SEO analysis failed:', error);
      results.status = 'failed';
      results.error = error.message;
      results.duration = Date.now() - startTime;
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * 获取页面数据和元数据
   */
  async fetchPageData(url, options = {}) {
    const startTime = Date.now();
    console.log(`🌐 Fetching page data from: ${url}`);

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        const responseHeaders = res.headers;
        const statusCode = res.statusCode;
        let redirectCount = 0;
        const redirectChain = [];

        // 处理重定向
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          redirectChain.push({
            from: url,
            to: res.headers.location,
            statusCode: statusCode
          });

          if (redirectCount < this.config.maxRedirects) {
            // 递归处理重定向
            return this.fetchPageData(res.headers.location, options)
              .then(result => {
                result.redirectChain = [...redirectChain, ...(result.redirectChain || [])];
                resolve(result);
              })
              .catch(reject);
          } else {
            reject(new Error('Too many redirects'));
            return;
          }
        }

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const loadTime = Date.now() - startTime;
            const pageSize = Buffer.byteLength(data, 'utf8');

            // 使用cheerio解析HTML
            const $ = cheerio.load(data);

            // 提取基本页面信息
            const title = $('title').text().trim();
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
            const canonical = $('link[rel="canonical"]').attr('href') || '';
            const lang = $('html').attr('lang') || $('html').attr('xml:lang') || '';

            // 提取所有meta标签
            const metaTags = [];
            $('meta').each((i, elem) => {
              const name = $(elem).attr('name') || $(elem).attr('property') || $(elem).attr('http-equiv');
              const content = $(elem).attr('content');
              if (name && content) {
                metaTags.push({ name, content });
              }
            });

            // 提取链接信息
            const links = [];
            $('link').each((i, elem) => {
              const rel = $(elem).attr('rel');
              const href = $(elem).attr('href');
              const type = $(elem).attr('type');
              if (rel && href) {
                links.push({ rel, href, type });
              }
            });

            // 提取脚本和样式信息
            const scripts = [];
            $('script').each((i, elem) => {
              const src = $(elem).attr('src');
              const type = $(elem).attr('type') || 'text/javascript';
              const async = $(elem).attr('async') !== undefined;
              const defer = $(elem).attr('defer') !== undefined;
              scripts.push({ src, type, async, defer, inline: !src });
            });

            const stylesheets = [];
            $('link[rel="stylesheet"]').each((i, elem) => {
              const href = $(elem).attr('href');
              const media = $(elem).attr('media') || 'all';
              stylesheets.push({ href, media });
            });

            resolve({
              html: data,
              $: $,
              headers: responseHeaders,
              statusCode: statusCode,
              redirectChain: redirectChain,
              info: {
                title: title,
                url: url,
                statusCode: statusCode,
                redirects: redirectChain,
                canonical: canonical,
                language: lang,
                metaDescription: metaDescription,
                metaKeywords: metaKeywords
              },
              metadata: {
                crawlTime: loadTime,
                pageSize: pageSize,
                loadTime: loadTime,
                contentType: responseHeaders['content-type'] || '',
                lastModified: responseHeaders['last-modified'] || '',
                server: responseHeaders['server'] || '',
                etag: responseHeaders['etag'] || '',
                cacheControl: responseHeaders['cache-control'] || '',
                expires: responseHeaders['expires'] || '',
                metaTags: metaTags,
                links: links,
                scripts: scripts,
                stylesheets: stylesheets,
                resources: {
                  total: scripts.length + stylesheets.length,
                  scripts: scripts.length,
                  stylesheets: stylesheets.length,
                  external: scripts.filter(s => s.src).length + stylesheets.length,
                  inline: scripts.filter(s => !s.src).length
                }
              }
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse page data: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to fetch page: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      });

      req.end();
    });
  }

  /**
   * 技术SEO分析 - 全面的技术要素检查
   */
  async analyzeTechnicalSEO(pageData, options = {}) {
    const { html, headers, statusCode, $, info, metadata } = pageData;
    const checks = [];
    const issues = [];
    const recommendations = [];
    let score = 100;

    console.log('🔧 Analyzing technical SEO factors...');

    // 1. HTTP状态码检查
    if (statusCode === 200) {
      checks.push({
        type: 'success',
        category: 'HTTP Status',
        message: 'HTTP状态码正常 (200)',
        impact: 'positive',
        score: 10
      });
    } else if (statusCode >= 300 && statusCode < 400) {
      checks.push({
        type: 'warning',
        category: 'HTTP Status',
        message: `重定向状态码 (${statusCode})`,
        impact: 'neutral',
        score: -5
      });
      score -= 5;
      recommendations.push({
        priority: 'medium',
        category: 'Redirects',
        message: '检查重定向链是否必要，过多重定向会影响页面加载速度'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'HTTP Status',
        message: `HTTP错误状态码 (${statusCode})`,
        impact: 'negative',
        score: -25
      });
      score -= 25;
      issues.push({
        severity: 'critical',
        category: 'HTTP Status',
        message: `页面返回错误状态码 ${statusCode}，搜索引擎无法正常索引`
      });
    }

    // 2. HTTPS检查
    const isHttps = info.url.startsWith('https://');
    if (isHttps) {
      checks.push({
        type: 'success',
        category: 'Security',
        message: '使用HTTPS安全协议',
        impact: 'positive',
        score: 10
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Security',
        message: '未使用HTTPS协议',
        impact: 'negative',
        score: -15
      });
      score -= 15;
      issues.push({
        severity: 'high',
        category: 'Security',
        message: 'HTTPS是现代SEO的基本要求，建议立即启用SSL证书'
      });
    }

    // 3. 页面大小检查
    const pageSizeKB = metadata.pageSize / 1024;
    if (pageSizeKB < 100) {
      checks.push({
        type: 'success',
        category: 'Performance',
        message: `页面大小优秀 (${pageSizeKB.toFixed(1)}KB)`,
        impact: 'positive',
        score: 5
      });
    } else if (pageSizeKB < 500) {
      checks.push({
        type: 'success',
        category: 'Performance',
        message: `页面大小良好 (${pageSizeKB.toFixed(1)}KB)`,
        impact: 'positive',
        score: 3
      });
    } else if (pageSizeKB < 1000) {
      checks.push({
        type: 'warning',
        category: 'Performance',
        message: `页面大小较大 (${pageSizeKB.toFixed(1)}KB)`,
        impact: 'neutral',
        score: -3
      });
      score -= 3;
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        message: '考虑压缩图片、CSS和JavaScript文件以减小页面大小'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Performance',
        message: `页面大小过大 (${pageSizeKB.toFixed(1)}KB)`,
        impact: 'negative',
        score: -10
      });
      score -= 10;
      issues.push({
        severity: 'medium',
        category: 'Performance',
        message: '页面大小超过1MB，严重影响加载速度和用户体验'
      });
    }

    // 4. 响应时间检查
    const loadTime = metadata.loadTime;
    if (loadTime < 1000) {
      checks.push({
        type: 'success',
        category: 'Performance',
        message: `响应时间优秀 (${loadTime}ms)`,
        impact: 'positive',
        score: 10
      });
    } else if (loadTime < 3000) {
      checks.push({
        type: 'success',
        category: 'Performance',
        message: `响应时间良好 (${loadTime}ms)`,
        impact: 'positive',
        score: 5
      });
    } else if (loadTime < 5000) {
      checks.push({
        type: 'warning',
        category: 'Performance',
        message: `响应时间较慢 (${loadTime}ms)`,
        impact: 'neutral',
        score: -5
      });
      score -= 5;
      recommendations.push({
        priority: 'high',
        category: 'Performance',
        message: '优化服务器响应时间，考虑使用CDN或升级服务器配置'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Performance',
        message: `响应时间过慢 (${loadTime}ms)`,
        impact: 'negative',
        score: -15
      });
      score -= 15;
      issues.push({
        severity: 'high',
        category: 'Performance',
        message: '响应时间超过5秒，严重影响SEO排名和用户体验'
      });
    }

    // HTTPS检查
    if (pageData.info.url.startsWith('https://')) {
      checks.push({ type: 'success', message: '使用HTTPS安全协议', impact: 'positive' });
    } else {
      checks.push({ type: 'error', message: '未使用HTTPS安全协议', impact: 'negative' });
      score -= 25;
    }

    // 页面加载速度
    if (pageData.metadata.loadTime < 2000) {
      checks.push({ type: 'success', message: `页面加载速度良好 (${pageData.metadata.loadTime}ms)`, impact: 'positive' });
    } else if (pageData.metadata.loadTime < 5000) {
      checks.push({ type: 'warning', message: `页面加载速度一般 (${pageData.metadata.loadTime}ms)`, impact: 'neutral' });
      score -= 15;
    } else {
      checks.push({ type: 'error', message: `页面加载速度过慢 (${pageData.metadata.loadTime}ms)`, impact: 'negative' });
      score -= 30;
    }

    // 页面大小检查
    const pageSizeKB2 = Math.round(pageData.metadata.pageSize / 1024);
    if (pageSizeKB2 < 500) {
      checks.push({ type: 'success', message: `页面大小合理 (${pageSizeKB2}KB)`, impact: 'positive' });
    } else if (pageSizeKB2 < 1000) {
      checks.push({ type: 'warning', message: `页面大小较大 (${pageSizeKB2}KB)`, impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: `页面大小过大 (${pageSizeKB2}KB)`, impact: 'negative' });
      score -= 20;
    }

    // Robots.txt检查
    // 这里可以添加robots.txt检查逻辑

    // XML Sitemap检查
    // 这里可以添加sitemap检查逻辑

    return {
      category: 'technical',
      score: Math.max(0, score),
      checks: checks,
      summary: `技术SEO检查完成，发现 ${checks.filter(c => c.type === 'error').length} 个错误，${checks.filter(c => c.type === 'warning').length} 个警告`
    };
  }

  /**
   * 内容质量SEO分析
   */
  async analyzeContentSEO(pageData, options = {}) {
    const { html, $ } = pageData;
    const checks = [];
    const issues = [];
    const recommendations = [];
    let score = 100;

    console.log('📝 Analyzing content quality and relevance...');

    // 获取页面文本内容
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    const words = textContent.split(' ').filter(word => word.length > 2);
    const wordCount = words.length;

    // 1. 内容长度检查
    if (wordCount >= 1000) {
      checks.push({
        type: 'success',
        category: 'Content Length',
        message: `内容丰富充实 (${wordCount} 词)`,
        impact: 'positive',
        score: 15
      });
    } else if (wordCount >= 500) {
      checks.push({
        type: 'success',
        category: 'Content Length',
        message: `内容长度良好 (${wordCount} 词)`,
        impact: 'positive',
        score: 10
      });
    } else if (wordCount >= 300) {
      checks.push({
        type: 'warning',
        category: 'Content Length',
        message: `内容长度一般 (${wordCount} 词)`,
        impact: 'neutral',
        score: -5
      });
      score -= 5;
      recommendations.push({
        priority: 'medium',
        category: 'Content',
        message: '建议增加内容长度至500词以上，提供更多有价值的信息'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Content Length',
        message: `内容过少 (${wordCount} 词)`,
        impact: 'negative',
        score: -20
      });
      score -= 20;
      issues.push({
        severity: 'high',
        category: 'Content',
        message: '内容长度不足300词，搜索引擎难以理解页面主题'
      });
    }

    // 2. 段落结构检查
    const paragraphs = $('p').length;
    if (paragraphs >= 3) {
      checks.push({
        type: 'success',
        category: 'Content Structure',
        message: `段落结构良好 (${paragraphs} 个段落)`,
        impact: 'positive',
        score: 5
      });
    } else if (paragraphs >= 1) {
      checks.push({
        type: 'warning',
        category: 'Content Structure',
        message: `段落较少 (${paragraphs} 个段落)`,
        impact: 'neutral',
        score: -3
      });
      score -= 3;
      recommendations.push({
        priority: 'low',
        category: 'Content',
        message: '建议将内容分成更多段落，提高可读性'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Content Structure',
        message: '缺少段落结构',
        impact: 'negative',
        score: -10
      });
      score -= 10;
      issues.push({
        severity: 'medium',
        category: 'Content',
        message: '内容缺少段落结构，影响用户阅读体验'
      });
    }

    // 3. 关键词分析
    const keywords = options.keywords || '';
    if (keywords && keywords.trim()) {
      const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
      const contentLower = textContent.toLowerCase();

      keywordList.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = contentLower.match(regex) || [];
        const density = wordCount > 0 ? (matches.length / wordCount) * 100 : 0;

        if (density >= 0.5 && density <= 2.5) {
          checks.push({
            type: 'success',
            category: 'Keywords',
            message: `关键词"${keyword}"密度适中 (${density.toFixed(1)}%)`,
            impact: 'positive',
            score: 5
          });
        } else if (density > 2.5) {
          checks.push({
            type: 'warning',
            category: 'Keywords',
            message: `关键词"${keyword}"密度过高 (${density.toFixed(1)}%)`,
            impact: 'neutral',
            score: -5
          });
          score -= 5;
          recommendations.push({
            priority: 'medium',
            category: 'Keywords',
            message: `减少关键词"${keyword}"的使用频率，避免过度优化`
          });
        } else if (density > 0) {
          checks.push({
            type: 'warning',
            category: 'Keywords',
            message: `关键词"${keyword}"密度偏低 (${density.toFixed(1)}%)`,
            impact: 'neutral',
            score: -3
          });
          score -= 3;
          recommendations.push({
            priority: 'low',
            category: 'Keywords',
            message: `适当增加关键词"${keyword}"的使用，但要保持自然`
          });
        } else {
          checks.push({
            type: 'error',
            category: 'Keywords',
            message: `关键词"${keyword}"未在内容中出现`,
            impact: 'negative',
            score: -10
          });
          score -= 10;
          issues.push({
            severity: 'medium',
            category: 'Keywords',
            message: `关键词"${keyword}"未在页面内容中出现，影响相关性`
          });
        }
      });
    }

    // 4. 内容重复检查
    const sentences = textContent.split(/[.!?。！？]/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    const duplicateRatio = sentences.length > 0 ? (sentences.length - uniqueSentences.size) / sentences.length : 0;

    if (duplicateRatio < 0.1) {
      checks.push({
        type: 'success',
        category: 'Content Quality',
        message: '内容原创性良好',
        impact: 'positive',
        score: 5
      });
    } else if (duplicateRatio < 0.3) {
      checks.push({
        type: 'warning',
        category: 'Content Quality',
        message: '存在少量重复内容',
        impact: 'neutral',
        score: -5
      });
      score -= 5;
      recommendations.push({
        priority: 'medium',
        category: 'Content',
        message: '减少重复内容，提供更多原创和有价值的信息'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Content Quality',
        message: '存在大量重复内容',
        impact: 'negative',
        score: -15
      });
      score -= 15;
      issues.push({
        severity: 'medium',
        category: 'Content',
        message: '大量重复内容影响SEO效果，需要提供更多原创内容'
      });
    }

    // 5. 内容可读性检查
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    if (avgWordsPerSentence <= 20) {
      checks.push({
        type: 'success',
        category: 'Readability',
        message: `句子长度适中 (平均${avgWordsPerSentence.toFixed(1)}词/句)`,
        impact: 'positive',
        score: 3
      });
    } else if (avgWordsPerSentence <= 30) {
      checks.push({
        type: 'warning',
        category: 'Readability',
        message: `句子稍长 (平均${avgWordsPerSentence.toFixed(1)}词/句)`,
        impact: 'neutral',
        score: -2
      });
      score -= 2;
      recommendations.push({
        priority: 'low',
        category: 'Content',
        message: '建议缩短句子长度，提高可读性'
      });
    } else {
      checks.push({
        type: 'error',
        category: 'Readability',
        message: `句子过长 (平均${avgWordsPerSentence.toFixed(1)}词/句)`,
        impact: 'negative',
        score: -5
      });
      score -= 5;
      issues.push({
        severity: 'low',
        category: 'Content',
        message: '句子过长影响阅读体验，建议分解长句'
      });
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      checks: checks,
      issues: issues,
      recommendations: recommendations,
      details: {
        wordCount: wordCount,
        paragraphs: paragraphs,
        sentences: sentences.length,
        avgWordsPerSentence: avgWordsPerSentence,
        duplicateRatio: duplicateRatio,
        keywordAnalysis: keywords ? 'completed' : 'skipped'
      }
    };
  }

  /**
   * 页面SEO分析
   */
  async analyzeOnPageSEO(pageData) {
    const { html } = pageData;
    const checks = [];
    let score = 100;

    // Title标签检查
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (title) {
      if (title.length >= 30 && title.length <= 60) {
        checks.push({ type: 'success', message: `页面标题长度合适 (${title.length} 字符)`, impact: 'positive' });
      } else if (title.length < 30) {
        checks.push({ type: 'warning', message: `页面标题过短 (${title.length} 字符)`, impact: 'neutral' });
        score -= 15;
      } else {
        checks.push({ type: 'warning', message: `页面标题过长 (${title.length} 字符)`, impact: 'neutral' });
        score -= 10;
      }
    } else {
      checks.push({ type: 'error', message: '缺少页面标题', impact: 'negative' });
      score -= 30;
    }

    // Meta Description检查
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1] : '';
    if (metaDescription) {
      if (metaDescription.length >= 120 && metaDescription.length <= 160) {
        checks.push({ type: 'success', message: `Meta描述长度合适 (${metaDescription.length} 字符)`, impact: 'positive' });
      } else if (metaDescription.length < 120) {
        checks.push({ type: 'warning', message: `Meta描述过短 (${metaDescription.length} 字符)`, impact: 'neutral' });
        score -= 10;
      } else {
        checks.push({ type: 'warning', message: `Meta描述过长 (${metaDescription.length} 字符)`, impact: 'neutral' });
        score -= 10;
      }
    } else {
      checks.push({ type: 'error', message: '缺少Meta描述', impact: 'negative' });
      score -= 25;
    }

    // H1标签检查
    const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi) || [];
    if (h1Matches.length === 1) {
      const h1Text = h1Matches[0].replace(/<[^>]*>/g, '').trim();
      if (h1Text.length > 0) {
        checks.push({ type: 'success', message: 'H1标签使用正确', impact: 'positive' });
      } else {
        checks.push({ type: 'warning', message: 'H1标签为空', impact: 'neutral' });
        score -= 10;
      }
    } else if (h1Matches.length === 0) {
      checks.push({ type: 'error', message: '缺少H1标签', impact: 'negative' });
      score -= 20;
    } else {
      checks.push({ type: 'warning', message: `存在多个H1标签 (${h1Matches.length}个)`, impact: 'neutral' });
      score -= 15;
    }

    // 标题层级结构检查
    const headingMatches = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    if (headingMatches.length >= 3) {
      checks.push({ type: 'success', message: '标题层级结构良好', impact: 'positive' });
    } else if (headingMatches.length >= 1) {
      checks.push({ type: 'warning', message: '标题层级结构简单', impact: 'neutral' });
      score -= 5;
    } else {
      checks.push({ type: 'error', message: '缺少标题层级结构', impact: 'negative' });
      score -= 15;
    }

    // 图片Alt属性检查
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = imgMatches.filter(img => !img.match(/alt=["'][^"']*["']/i)).length;
    if (imgMatches.length === 0) {
      checks.push({ type: 'info', message: '页面无图片', impact: 'neutral' });
    } else if (imagesWithoutAlt === 0) {
      checks.push({ type: 'success', message: '所有图片都有Alt属性', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: `${imagesWithoutAlt}/${imgMatches.length} 图片缺少Alt属性`, impact: 'neutral' });
      score -= Math.min(20, imagesWithoutAlt * 2);
    }

    return {
      category: 'onPage',
      score: Math.max(0, score),
      checks: checks,
      summary: `页面SEO检查完成，${checks.filter(c => c.type === 'success').length} 项通过，${checks.filter(c => c.type === 'error').length} 项需要修复`
    };
  }

  /**
   * 性能SEO分析
   */
  async analyzePerformanceSEO(pageData) {
    const { headers } = pageData;
    const checks = [];
    let score = 100;

    // Gzip压缩检查
    if (headers['content-encoding'] && headers['content-encoding'].includes('gzip')) {
      checks.push({ type: 'success', message: '启用了Gzip压缩', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '未启用Gzip压缩', impact: 'neutral' });
      score -= 15;
    }

    // 缓存策略检查
    const cacheControl = headers['cache-control'];
    if (cacheControl) {
      if (cacheControl.includes('max-age') || cacheControl.includes('public')) {
        checks.push({ type: 'success', message: '设置了缓存策略', impact: 'positive' });
      } else {
        checks.push({ type: 'warning', message: '缓存策略不完善', impact: 'neutral' });
        score -= 10;
      }
    } else {
      checks.push({ type: 'warning', message: '未设置缓存策略', impact: 'neutral' });
      score -= 15;
    }

    // Content-Type检查
    const contentType = headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      if (contentType.includes('charset')) {
        checks.push({ type: 'success', message: '正确设置了字符编码', impact: 'positive' });
      } else {
        checks.push({ type: 'warning', message: '未明确指定字符编码', impact: 'neutral' });
        score -= 5;
      }
    }

    // 页面大小评估
    const pageSizeKB3 = Math.round(pageData.metadata.pageSize / 1024);
    if (pageSizeKB3 < 100) {
      checks.push({ type: 'success', message: `页面大小优秀 (${pageSizeKB3}KB)`, impact: 'positive' });
    } else if (pageSizeKB3 < 500) {
      checks.push({ type: 'success', message: `页面大小良好 (${pageSizeKB3}KB)`, impact: 'positive' });
    } else if (pageSizeKB3 < 1000) {
      checks.push({ type: 'warning', message: `页面大小偏大 (${pageSizeKB3}KB)`, impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: `页面大小过大 (${pageSizeKB3}KB)`, impact: 'negative' });
      score -= 20;
    }

    return {
      category: 'performance',
      score: Math.max(0, score),
      checks: checks,
      summary: `性能SEO检查完成，性能优化${score >= 80 ? '良好' : '需要改进'}`
    };
  }

  /**
   * 移动端SEO分析
   */
  async analyzeMobileSEO(pageData) {
    const { html } = pageData;
    const checks = [];
    let score = 100;

    // Viewport meta标签检查
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const viewport = viewportMatch ? viewportMatch[1] : '';
    if (viewport) {
      if (viewport.includes('width=device-width')) {
        checks.push({ type: 'success', message: '正确设置了移动端视口', impact: 'positive' });
      } else {
        checks.push({ type: 'warning', message: '移动端视口设置不完善', impact: 'neutral' });
        score -= 15;
      }
    } else {
      checks.push({ type: 'error', message: '缺少移动端视口设置', impact: 'negative' });
      score -= 30;
    }

    // 响应式设计检查（基于CSS媒体查询）
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    const cssContent = styleMatches.join(' ');
    if (cssContent.includes('@media') || cssContent.includes('responsive') || html.includes('bootstrap') || html.includes('responsive')) {
      checks.push({ type: 'success', message: '检测到响应式设计', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '未检测到明显的响应式设计', impact: 'neutral' });
      score -= 20;
    }

    // 触摸友好的链接和按钮
    const linkMatches = html.match(/<(a|button)[^>]*>/gi) || [];
    if (linkMatches.length > 0) {
      checks.push({ type: 'info', message: `检测到 ${linkMatches.length} 个可交互元素`, impact: 'neutral' });
    }

    return {
      category: 'mobile',
      score: Math.max(0, score),
      checks: checks,
      summary: `移动端SEO检查完成，移动端友好性${score >= 80 ? '良好' : '需要改进'}`
    };
  }

  /**
   * 社交媒体SEO分析
   */
  async analyzeSocialSEO(pageData) {
    const { $ } = pageData;
    const checks = [];
    let score = 100;

    // Open Graph标签检查
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogUrl = $('meta[property="og:url"]').attr('content');
    const ogType = $('meta[property="og:type"]').attr('content');

    if (ogTitle) {
      checks.push({ type: 'success', message: '设置了Open Graph标题', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Open Graph标题', impact: 'neutral' });
      score -= 15;
    }

    if (ogDescription) {
      checks.push({ type: 'success', message: '设置了Open Graph描述', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Open Graph描述', impact: 'neutral' });
      score -= 15;
    }

    if (ogImage) {
      checks.push({ type: 'success', message: '设置了Open Graph图片', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Open Graph图片', impact: 'neutral' });
      score -= 15;
    }

    if (ogUrl) {
      checks.push({ type: 'success', message: '设置了Open Graph URL', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Open Graph URL', impact: 'neutral' });
      score -= 10;
    }

    if (ogType) {
      checks.push({ type: 'success', message: `设置了Open Graph类型: ${ogType}`, impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Open Graph类型', impact: 'neutral' });
      score -= 10;
    }

    // Twitter Card标签检查
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');

    if (twitterCard) {
      checks.push({ type: 'success', message: `设置了Twitter Card: ${twitterCard}`, impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '缺少Twitter Card设置', impact: 'neutral' });
      score -= 10;
    }

    if (twitterTitle) {
      checks.push({ type: 'success', message: '设置了Twitter标题', impact: 'positive' });
    } else if (twitterCard) {
      checks.push({ type: 'warning', message: '缺少Twitter标题', impact: 'neutral' });
      score -= 5;
    }

    if (twitterDescription) {
      checks.push({ type: 'success', message: '设置了Twitter描述', impact: 'positive' });
    } else if (twitterCard) {
      checks.push({ type: 'warning', message: '缺少Twitter描述', impact: 'neutral' });
      score -= 5;
    }

    if (twitterImage) {
      checks.push({ type: 'success', message: '设置了Twitter图片', impact: 'positive' });
    } else if (twitterCard && twitterCard !== 'summary') {
      checks.push({ type: 'warning', message: '缺少Twitter图片', impact: 'neutral' });
      score -= 5;
    }

    // 社交媒体链接检查
    const socialLinks = $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"], a[href*="weibo.com"], a[href*="wechat.com"]');
    if (socialLinks.length > 0) {
      checks.push({ type: 'success', message: `检测到 ${socialLinks.length} 个社交媒体链接`, impact: 'positive' });
    } else {
      checks.push({ type: 'info', message: '未检测到社交媒体链接', impact: 'neutral' });
    }

    // 检查社交媒体分享按钮
    const shareButtons = $('[class*="share"], [class*="social"], [id*="share"], [id*="social"]');
    if (shareButtons.length > 0) {
      checks.push({ type: 'success', message: `检测到 ${shareButtons.length} 个社交分享元素`, impact: 'positive' });
    } else {
      checks.push({ type: 'info', message: '未检测到社交分享按钮', impact: 'neutral' });
    }

    return {
      category: 'social',
      score: Math.max(0, score),
      checks: checks,
      summary: `社交媒体SEO检查完成，社交媒体优化${score >= 80 ? '良好' : '需要改进'}`
    };
  }

  /**
   * 结构化数据分析
   */
  async analyzeStructuredData(pageData) {
    const { $ } = pageData;
    const checks = [];
    let score = 100;
    const structuredDataTypes = [];

    // JSON-LD结构化数据检查
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      checks.push({ type: 'success', message: `检测到 ${jsonLdScripts.length} 个JSON-LD结构化数据`, impact: 'positive' });

      // 尝试解析JSON-LD数据
      jsonLdScripts.each((i, script) => {
        try {
          const scriptContent = $(script).text().trim();
          if (scriptContent) {
            const jsonData = JSON.parse(scriptContent);

            // 处理单个对象或数组
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

            dataArray.forEach(data => {
              if (data['@type']) {
                const type = Array.isArray(data['@type']) ? data['@type'].join(', ') : data['@type'];
                structuredDataTypes.push(type);
                checks.push({ type: 'success', message: `结构化数据类型: ${type}`, impact: 'positive' });

                // 检查常见的必需属性
                if (type.includes('Organization') && !data.name) {
                  checks.push({ type: 'warning', message: 'Organization类型缺少name属性', impact: 'neutral' });
                  score -= 5;
                }
                if (type.includes('Person') && !data.name) {
                  checks.push({ type: 'warning', message: 'Person类型缺少name属性', impact: 'neutral' });
                  score -= 5;
                }
                if (type.includes('Article') && (!data.headline || !data.author)) {
                  checks.push({ type: 'warning', message: 'Article类型缺少必需属性', impact: 'neutral' });
                  score -= 5;
                }
                if (type.includes('Product') && (!data.name || !data.offers)) {
                  checks.push({ type: 'warning', message: 'Product类型缺少必需属性', impact: 'neutral' });
                  score -= 5;
                }
              }
            });
          }
        } catch (e) {
          checks.push({ type: 'warning', message: `JSON-LD数据格式错误: ${e.message}`, impact: 'neutral' });
          score -= 10;
        }
      });
    } else {
      checks.push({ type: 'warning', message: '未检测到JSON-LD结构化数据', impact: 'neutral' });
      score -= 20;
    }

    // Microdata检查
    const microdataElements = $('[itemscope], [itemtype], [itemprop]');
    if (microdataElements.length > 0) {
      checks.push({ type: 'success', message: `检测到 ${microdataElements.length} 个Microdata元素`, impact: 'positive' });

      // 检查Microdata类型
      const itemTypes = [];
      $('[itemtype]').each((i, el) => {
        const itemType = $(el).attr('itemtype');
        if (itemType && !itemTypes.includes(itemType)) {
          itemTypes.push(itemType);
          const typeName = itemType.split('/').pop();
          checks.push({ type: 'success', message: `Microdata类型: ${typeName}`, impact: 'positive' });
        }
      });
    } else {
      checks.push({ type: 'info', message: '未检测到Microdata标记', impact: 'neutral' });
    }

    // RDFa检查
    const rdfaElements = $('[typeof], [property], [resource]');
    if (rdfaElements.length > 0) {
      checks.push({ type: 'success', message: `检测到 ${rdfaElements.length} 个RDFa元素`, impact: 'positive' });
    } else {
      checks.push({ type: 'info', message: '未检测到RDFa标记', impact: 'neutral' });
    }

    // 检查常见的结构化数据类型
    const commonTypes = ['Organization', 'Person', 'Article', 'Product', 'LocalBusiness', 'WebSite', 'BreadcrumbList'];
    const foundTypes = structuredDataTypes.filter(type =>
      commonTypes.some(commonType => type.includes(commonType))
    );

    if (foundTypes.length > 0) {
      checks.push({ type: 'success', message: `包含常见结构化数据类型: ${foundTypes.join(', ')}`, impact: 'positive' });
    } else if (structuredDataTypes.length > 0) {
      checks.push({ type: 'info', message: '建议添加更多常见的结构化数据类型', impact: 'neutral' });
    }

    return {
      category: 'structured',
      score: Math.max(0, score),
      checks: checks,
      types: structuredDataTypes,
      summary: `结构化数据检查完成，${jsonLdScripts.length + microdataElements.length + rdfaElements.length} 个结构化数据元素`
    };
  }

  /**
   * 关键词分析
   */
  async analyzeKeywords(pageData, keywords) {
    const { $ } = pageData;
    const textContent = $('body').text().replace(/\s+/g, ' ').trim().toLowerCase();
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;

    const analysis = {
      density: {},
      suggestions: [],
      missing: [],
      distribution: {},
      prominence: {},
      relatedKeywords: []
    };

    if (!keywords || keywords.trim() === '') {
      return analysis;
    }

    const keywordList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

    keywordList.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = textContent.match(regex) || [];
      const density = wordCount > 0 ? (matches.length / wordCount) * 100 : 0;

      analysis.density[keyword] = {
        count: matches.length,
        density: density,
        status: density >= 1 && density <= 3 ? 'optimal' : density > 3 ? 'high' : density > 0 ? 'low' : 'missing'
      };

      // 检查关键词在重要位置的分布
      const titleText = $('title').text().toLowerCase();
      const h1Text = $('h1').text().toLowerCase();
      const h2Text = $('h2').text().toLowerCase();
      const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const firstParagraph = $('p').first().text().toLowerCase();
      const altTexts = $('img[alt]').map((i, el) => $(el).attr('alt')).get().join(' ').toLowerCase();

      analysis.distribution[keyword] = {
        inTitle: titleText.includes(keyword),
        inH1: h1Text.includes(keyword),
        inH2: h2Text.includes(keyword),
        inMetaDescription: metaDesc.includes(keyword),
        inFirstParagraph: firstParagraph.includes(keyword),
        inAltText: altTexts.includes(keyword),
        inUrl: pageData.info.url.toLowerCase().includes(keyword)
      };

      // 计算关键词突出度分数
      let prominenceScore = 0;
      if (analysis.distribution[keyword].inTitle) prominenceScore += 25;
      if (analysis.distribution[keyword].inH1) prominenceScore += 20;
      if (analysis.distribution[keyword].inMetaDescription) prominenceScore += 15;
      if (analysis.distribution[keyword].inFirstParagraph) prominenceScore += 10;
      if (analysis.distribution[keyword].inH2) prominenceScore += 10;
      if (analysis.distribution[keyword].inAltText) prominenceScore += 5;
      if (analysis.distribution[keyword].inUrl) prominenceScore += 15;

      analysis.prominence[keyword] = {
        score: prominenceScore,
        status: prominenceScore >= 60 ? 'excellent' : prominenceScore >= 40 ? 'good' : prominenceScore >= 20 ? 'fair' : 'poor'
      };

      // 生成建议
      if (density === 0) {
        analysis.missing.push(keyword);
        analysis.suggestions.push(`添加关键词"${keyword}"到页面内容中`);
      } else if (density > 3) {
        analysis.suggestions.push(`减少关键词"${keyword}"的使用频率，当前密度过高(${density.toFixed(1)}%)`);
      } else if (density < 1) {
        analysis.suggestions.push(`适当增加关键词"${keyword}"的使用频率，当前密度偏低(${density.toFixed(1)}%)`);
      }

      // 位置优化建议
      if (!analysis.distribution[keyword].inTitle) {
        analysis.suggestions.push(`考虑在页面标题中包含关键词"${keyword}"`);
      }
      if (!analysis.distribution[keyword].inMetaDescription) {
        analysis.suggestions.push(`考虑在Meta描述中包含关键词"${keyword}"`);
      }
      if (!analysis.distribution[keyword].inH1) {
        analysis.suggestions.push(`考虑在H1标签中包含关键词"${keyword}"`);
      }
      if (!analysis.distribution[keyword].inUrl && keyword.length <= 20) {
        analysis.suggestions.push(`考虑在URL中包含关键词"${keyword}"`);
      }
    });

    // 分析相关关键词（基于页面内容中的高频词汇）
    const words = textContent.split(/\s+/).filter(word =>
      word.length > 3 &&
      !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'some', 'these', 'many', 'would', 'there'].includes(word)
    );

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    analysis.relatedKeywords = Object.entries(wordFreq)
      .filter(([word, freq]) => freq >= 3 && !keywordList.includes(word))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, freq]) => ({ word, frequency: freq }));

    return analysis;
  }



  /**
   * 可访问性分析
   */
  async analyzeAccessibility(pageData, options = {}) {
    const $ = pageData.$;
    const analysis = {
      score: 0,
      checks: {},
      issues: [],
      recommendations: []
    };

    try {
      // 1. 图片Alt属性检查
      const images = $('img');
      const imagesWithoutAlt = images.filter((i, img) => !$(img).attr('alt')).length;
      const imagesWithEmptyAlt = images.filter((i, img) => $(img).attr('alt') === '').length;

      analysis.checks.imageAlt = {
        total: images.length,
        withoutAlt: imagesWithoutAlt,
        withEmptyAlt: imagesWithEmptyAlt,
        score: images.length > 0 ? Math.max(0, 100 - (imagesWithoutAlt * 20)) : 100
      };

      // 2. 表单标签检查
      const inputs = $('input, textarea, select');
      const inputsWithoutLabels = inputs.filter((i, input) => {
        const $input = $(input);
        const id = $input.attr('id');
        const hasLabel = id && $(`label[for="${id}"]`).length > 0;
        const hasAriaLabel = $input.attr('aria-label');
        const hasAriaLabelledby = $input.attr('aria-labelledby');
        return !hasLabel && !hasAriaLabel && !hasAriaLabelledby;
      }).length;

      analysis.checks.formLabels = {
        total: inputs.length,
        withoutLabels: inputsWithoutLabels,
        score: inputs.length > 0 ? Math.max(0, 100 - (inputsWithoutLabels * 25)) : 100
      };

      // 3. 标题层级检查
      const headings = $('h1, h2, h3, h4, h5, h6');
      const headingLevels = [];
      headings.each((i, heading) => {
        headingLevels.push(parseInt(heading.tagName.substring(1)));
      });

      let headingStructureScore = 100;
      let hasH1 = headingLevels.includes(1);
      if (!hasH1) headingStructureScore -= 30;

      // 检查标题层级跳跃
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i - 1] > 1) {
          headingStructureScore -= 10;
        }
      }

      analysis.checks.headingStructure = {
        hasH1: hasH1,
        levels: headingLevels,
        score: Math.max(0, headingStructureScore)
      };

      // 4. 颜色对比度检查（基础检查）
      const hasColorOnlyInfo = $('[style*="color"]').length > 0;
      analysis.checks.colorContrast = {
        hasColorOnlyInfo: hasColorOnlyInfo,
        score: hasColorOnlyInfo ? 70 : 100,
        note: '需要专业工具进行详细的颜色对比度检查'
      };

      // 5. 键盘导航检查
      const focusableElements = $('a, button, input, textarea, select, [tabindex]');
      const elementsWithTabindex = $('[tabindex]');
      const negativeTabindex = elementsWithTabindex.filter((i, el) => parseInt($(el).attr('tabindex')) < 0).length;

      analysis.checks.keyboardNavigation = {
        focusableElements: focusableElements.length,
        elementsWithTabindex: elementsWithTabindex.length,
        negativeTabindex: negativeTabindex,
        score: negativeTabindex > 0 ? 80 : 100
      };

      // 6. ARIA属性检查
      const elementsWithAria = $('[aria-label], [aria-labelledby], [aria-describedby], [role]');
      analysis.checks.ariaAttributes = {
        elementsWithAria: elementsWithAria.length,
        score: elementsWithAria.length > 0 ? 100 : 80
      };

      // 计算总体可访问性分数
      const scores = [
        analysis.checks.imageAlt.score,
        analysis.checks.formLabels.score,
        analysis.checks.headingStructure.score,
        analysis.checks.colorContrast.score,
        analysis.checks.keyboardNavigation.score,
        analysis.checks.ariaAttributes.score
      ];
      analysis.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // 生成问题和建议
      if (imagesWithoutAlt > 0) {
        analysis.issues.push(`${imagesWithoutAlt}个图片缺少Alt属性`);
        analysis.recommendations.push('为所有图片添加描述性的Alt属性');
      }

      if (inputsWithoutLabels > 0) {
        analysis.issues.push(`${inputsWithoutLabels}个表单元素缺少标签`);
        analysis.recommendations.push('为所有表单元素添加适当的标签');
      }

      if (!hasH1) {
        analysis.issues.push('页面缺少H1标题');
        analysis.recommendations.push('添加一个描述页面主要内容的H1标题');
      }

    } catch (error) {
      console.error('可访问性分析失败:', error);
      analysis.score = 0;
      analysis.issues.push('可访问性分析过程中发生错误');
    }

    return analysis;
  }

  /**
   * 安全性分析
   */
  async analyzeSecurity(pageData, options = {}) {
    const $ = pageData.$;
    const headers = pageData.headers;
    const analysis = {
      score: 0,
      checks: {},
      issues: [],
      recommendations: []
    };

    try {
      // 1. HTTPS检查
      const isHttps = pageData.info.url.startsWith('https://');
      analysis.checks.https = {
        enabled: isHttps,
        score: isHttps ? 100 : 0
      };

      // 2. 安全头检查
      const securityHeaders = {
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy'],
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'referrer-policy': headers['referrer-policy']
      };

      let securityHeadersScore = 0;
      let securityHeadersCount = 0;

      Object.entries(securityHeaders).forEach(([header, value]) => {
        if (value) {
          securityHeadersScore += 100;
          securityHeadersCount++;
        }
      });

      analysis.checks.securityHeaders = {
        headers: securityHeaders,
        count: securityHeadersCount,
        total: Object.keys(securityHeaders).length,
        score: securityHeadersCount > 0 ? securityHeadersScore / Object.keys(securityHeaders).length : 0
      };

      // 3. 混合内容检查
      const httpResources = [];
      $('img, script, link, iframe').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('href');
        if (src && src.startsWith('http://')) {
          httpResources.push(src);
        }
      });

      analysis.checks.mixedContent = {
        httpResources: httpResources.length,
        resources: httpResources,
        score: httpResources.length === 0 ? 100 : Math.max(0, 100 - httpResources.length * 10)
      };

      // 4. 表单安全检查
      const forms = $('form');
      let insecureForms = 0;
      forms.each((i, form) => {
        const action = $(form).attr('action');
        const method = $(form).attr('method');
        if (method && method.toLowerCase() === 'post' && action && action.startsWith('http://')) {
          insecureForms++;
        }
      });

      analysis.checks.formSecurity = {
        totalForms: forms.length,
        insecureForms: insecureForms,
        score: forms.length > 0 ? Math.max(0, 100 - insecureForms * 50) : 100
      };

      // 计算总体安全分数
      const scores = [
        analysis.checks.https.score,
        analysis.checks.securityHeaders.score,
        analysis.checks.mixedContent.score,
        analysis.checks.formSecurity.score
      ];
      analysis.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // 生成问题和建议
      if (!isHttps) {
        analysis.issues.push('网站未使用HTTPS加密');
        analysis.recommendations.push('启用HTTPS以保护用户数据安全');
      }

      if (securityHeadersCount < 3) {
        analysis.issues.push('缺少重要的安全头');
        analysis.recommendations.push('添加安全头如CSP、HSTS、X-Frame-Options等');
      }

      if (httpResources.length > 0) {
        analysis.issues.push(`发现${httpResources.length}个HTTP资源（混合内容）`);
        analysis.recommendations.push('将所有资源更改为HTTPS以避免混合内容警告');
      }

    } catch (error) {
      console.error('安全性分析失败:', error);
      analysis.score = 0;
      analysis.issues.push('安全性分析过程中发生错误');
    }

    return analysis;
  }

  /**
   * 竞争对手分析
   */
  async analyzeCompetitors(pageData, competitorUrls = []) {
    const analysis = {
      competitors: [],
      comparison: {},
      insights: []
    };

    if (!competitorUrls || competitorUrls.length === 0) {
      return analysis;
    }

    // 这里可以实现竞争对手分析逻辑
    // 由于需要获取其他网站数据，这里提供一个基础框架
    analysis.insights.push('竞争对手分析功能需要额外的数据获取，建议使用专业的SEO工具进行深入分析');

    return analysis;
  }

  /**
   * Core Web Vitals分析
   */
  async analyzeCoreWebVitals(pageData, options = {}) {
    const analysis = {
      score: 0,
      metrics: {},
      issues: [],
      recommendations: []
    };

    try {
      // 基于页面大小和资源数量估算性能指标
      const pageSize = pageData.metadata.pageSize;
      const loadTime = pageData.metadata.loadTime;
      const scripts = pageData.metadata.scripts.length;
      const stylesheets = pageData.metadata.stylesheets.length;

      // 1. Largest Contentful Paint (LCP) 估算
      let lcpScore = 100;
      if (pageSize > 1024 * 1024) lcpScore -= 20; // 大于1MB
      if (loadTime > 2500) lcpScore -= 30; // 加载时间超过2.5秒
      if (scripts > 10) lcpScore -= 15; // 脚本过多

      analysis.metrics.lcp = {
        estimated: loadTime > 2500 ? 'Poor' : loadTime > 1000 ? 'Needs Improvement' : 'Good',
        score: Math.max(0, lcpScore),
        threshold: '2.5s',
        description: '最大内容绘制时间'
      };

      // 2. First Input Delay (FID) 估算
      let fidScore = 100;
      if (scripts > 15) fidScore -= 25; // 脚本过多可能影响交互
      const hasHeavyScripts = pageData.metadata.scripts.some(script => !script.async && !script.defer);
      if (hasHeavyScripts) fidScore -= 20;

      analysis.metrics.fid = {
        estimated: hasHeavyScripts ? 'Needs Improvement' : 'Good',
        score: Math.max(0, fidScore),
        threshold: '100ms',
        description: '首次输入延迟'
      };

      // 3. Cumulative Layout Shift (CLS) 估算
      let clsScore = 100;
      const $ = pageData.$;
      const imagesWithoutDimensions = $('img').filter((i, img) => !$(img).attr('width') || !$(img).attr('height')).length;
      const iframesWithoutDimensions = $('iframe').filter((i, iframe) => !$(iframe).attr('width') || !$(iframe).attr('height')).length;

      if (imagesWithoutDimensions > 0) clsScore -= imagesWithoutDimensions * 10;
      if (iframesWithoutDimensions > 0) clsScore -= iframesWithoutDimensions * 15;

      analysis.metrics.cls = {
        estimated: clsScore < 70 ? 'Poor' : clsScore < 90 ? 'Needs Improvement' : 'Good',
        score: Math.max(0, clsScore),
        threshold: '0.1',
        description: '累积布局偏移'
      };

      // 计算总体Core Web Vitals分数
      const scores = [
        analysis.metrics.lcp.score,
        analysis.metrics.fid.score,
        analysis.metrics.cls.score
      ];
      analysis.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // 生成建议
      if (analysis.metrics.lcp.score < 80) {
        analysis.issues.push('LCP性能需要改进');
        analysis.recommendations.push('优化图片大小、减少服务器响应时间、使用CDN');
      }

      if (analysis.metrics.fid.score < 80) {
        analysis.issues.push('FID性能需要改进');
        analysis.recommendations.push('减少JavaScript执行时间、使用async/defer属性');
      }

      if (analysis.metrics.cls.score < 80) {
        analysis.issues.push('CLS性能需要改进');
        analysis.recommendations.push('为图片和iframe设置尺寸属性、避免动态插入内容');
      }

    } catch (error) {
      console.error('Core Web Vitals分析失败:', error);
      analysis.score = 0;
      analysis.issues.push('Core Web Vitals分析过程中发生错误');
    }

    return analysis;
  }

  /**
   * 页面体验分析
   */
  async analyzePageExperience(pageData, options = {}) {
    const analysis = {
      score: 0,
      factors: {},
      issues: [],
      recommendations: []
    };

    try {
      const $ = pageData.$;
      const headers = pageData.headers;

      // 1. 移动友好性
      const viewport = $('meta[name="viewport"]').attr('content');
      const hasMobileViewport = viewport && viewport.includes('width=device-width');
      analysis.factors.mobileFriendly = {
        hasViewport: hasMobileViewport,
        score: hasMobileViewport ? 100 : 50
      };

      // 2. 安全浏览
      const isHttps = pageData.info.url.startsWith('https://');
      analysis.factors.safeBrowsing = {
        isSecure: isHttps,
        score: isHttps ? 100 : 0
      };

      // 3. 无侵入性插页式广告
      const hasPopups = $('[style*="position: fixed"], [style*="position: absolute"]').length > 5;
      analysis.factors.noIntrusiveInterstitials = {
        hasPopups: hasPopups,
        score: hasPopups ? 70 : 100
      };

      // 4. 页面加载速度
      const loadTime = pageData.metadata.loadTime;
      let speedScore = 100;
      if (loadTime > 3000) speedScore = 50;
      else if (loadTime > 1500) speedScore = 80;

      analysis.factors.pageSpeed = {
        loadTime: loadTime,
        score: speedScore
      };

      // 计算总体页面体验分数
      const scores = [
        analysis.factors.mobileFriendly.score,
        analysis.factors.safeBrowsing.score,
        analysis.factors.noIntrusiveInterstitials.score,
        analysis.factors.pageSpeed.score
      ];
      analysis.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // 生成建议
      if (!hasMobileViewport) {
        analysis.issues.push('缺少移动端viewport设置');
        analysis.recommendations.push('添加<meta name="viewport" content="width=device-width, initial-scale=1">');
      }

      if (!isHttps) {
        analysis.issues.push('网站未使用HTTPS');
        analysis.recommendations.push('启用HTTPS以提供安全的浏览体验');
      }

      if (hasPopups) {
        analysis.issues.push('可能存在侵入性插页式广告');
        analysis.recommendations.push('减少或优化弹窗和覆盖层的使用');
      }

      if (speedScore < 80) {
        analysis.issues.push('页面加载速度需要优化');
        analysis.recommendations.push('优化图片、压缩资源、使用缓存策略');
      }

    } catch (error) {
      console.error('页面体验分析失败:', error);
      analysis.score = 0;
      analysis.issues.push('页面体验分析过程中发生错误');
    }

    return analysis;
  }

  /**
   * 计算总体SEO分数
   */
  calculateOverallScore(results) {
    const weights = {
      technical: 0.18,
      content: 0.16,
      onPage: 0.18,
      performance: 0.12,
      mobile: 0.10,
      social: 0.04,
      structured: 0.06,
      accessibility: 0.08,
      security: 0.04,
      coreWebVitals: 0.02,
      pageExperience: 0.02
    };

    let weightedSum = 0;
    let totalWeight = 0;

    // 计算各类别分数
    Object.keys(weights).forEach(category => {
      let categoryScore = 0;

      if (results.scores && results.scores[category] !== undefined) {
        categoryScore = results.scores[category];
      } else if (results.checks && results.checks[category] && results.checks[category].score !== undefined) {
        categoryScore = results.checks[category].score;
        // 同时更新scores对象
        if (!results.scores) results.scores = {};
        results.scores[category] = categoryScore;
      }

      if (categoryScore !== undefined && categoryScore !== null) {
        weightedSum += categoryScore * weights[category];
        totalWeight += weights[category];
      }
    });

    results.overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // 添加分数等级
    if (results.overallScore >= 90) {
      results.scoreGrade = 'A+';
      results.scoreDescription = '优秀';
    } else if (results.overallScore >= 80) {
      results.scoreGrade = 'A';
      results.scoreDescription = '良好';
    } else if (results.overallScore >= 70) {
      results.scoreGrade = 'B';
      results.scoreDescription = '一般';
    } else if (results.overallScore >= 60) {
      results.scoreGrade = 'C';
      results.scoreDescription = '需要改进';
    } else {
      results.scoreGrade = 'D';
      results.scoreDescription = '较差';
    }
  }

  /**
   * 生成SEO建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 基于分数生成建议
    if ((results.scores.technical || 0) < 80) {
      recommendations.push({
        category: 'technical',
        priority: 'high',
        title: '改善技术SEO',
        description: '优化页面加载速度、启用HTTPS、设置正确的HTTP状态码',
        actionItems: [
          '确保网站使用HTTPS协议',
          '优化服务器响应时间',
          '设置正确的HTTP状态码',
          '创建并提交XML网站地图',
          '优化robots.txt文件'
        ]
      });
    }

    if ((results.scores.content || 0) < 70) {
      recommendations.push({
        category: 'content',
        priority: 'high',
        title: '提升内容质量',
        description: '增加内容长度、优化关键词密度、提高内容原创性',
        actionItems: [
          '增加页面内容长度至300字以上',
          '优化关键词密度至1-3%',
          '提高内容原创性和价值',
          '定期更新页面内容',
          '添加相关的内部链接'
        ]
      });
    }

    if ((results.scores.onPage || 0) < 80) {
      recommendations.push({
        category: 'onPage',
        priority: 'medium',
        title: '优化页面SEO元素',
        description: '完善标题标签、Meta描述、标题层级结构和图片Alt属性',
        actionItems: [
          '优化页面标题长度至30-60字符',
          '编写吸引人的Meta描述(120-160字符)',
          '确保每页只有一个H1标签',
          '为所有图片添加Alt属性',
          '优化URL结构'
        ]
      });
    }

    if ((results.scores.performance || 0) < 70) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: '提升页面性能',
        description: '启用Gzip压缩、优化缓存策略、减小页面大小',
        actionItems: [
          '启用Gzip压缩',
          '设置浏览器缓存策略',
          '压缩和优化图片',
          '减少HTTP请求数量',
          '使用CDN加速'
        ]
      });
    }

    if ((results.scores.mobile || 0) < 80) {
      recommendations.push({
        category: 'mobile',
        priority: 'high',
        title: '改善移动端体验',
        description: '设置正确的viewport、实现响应式设计、优化移动端字体大小',
        actionItems: [
          '设置正确的viewport meta标签',
          '实现响应式设计',
          '优化移动端字体大小',
          '确保按钮和链接易于点击',
          '测试移动端加载速度'
        ]
      });
    }

    if ((results.scores.social || 0) < 60) {
      recommendations.push({
        category: 'social',
        priority: 'low',
        title: '完善社交媒体优化',
        description: '添加Open Graph标签、Twitter Card和社交媒体链接',
        actionItems: [
          '添加Open Graph标签',
          '设置Twitter Card',
          '添加社交媒体分享按钮',
          '优化社交媒体预览图片',
          '添加社交媒体链接'
        ]
      });
    }

    // Core Web Vitals建议
    if ((results.scores.coreWebVitals || 0) < 70) {
      recommendations.push({
        category: 'coreWebVitals',
        priority: 'high',
        title: '优化Core Web Vitals',
        description: '改善LCP、FID和CLS指标，提升页面体验',
        actionItems: [
          '优化最大内容绘制(LCP)至2.5秒以内',
          '减少首次输入延迟(FID)至100毫秒以内',
          '控制累积布局偏移(CLS)至0.1以内',
          '优化关键渲染路径',
          '减少JavaScript执行时间'
        ]
      });
    }

    // 页面体验建议
    if ((results.scores.pageExperience || 0) < 70) {
      recommendations.push({
        category: 'pageExperience',
        priority: 'medium',
        title: '提升页面体验',
        description: '改善安全性、移动友好性和用户体验',
        actionItems: [
          '确保网站安全浏览',
          '优化移动端用户体验',
          '减少侵入性广告',
          '添加安全头部设置',
          '优化页面交互性'
        ]
      });
    }

    // 添加关键词相关建议
    if (results.keywords && results.keywords.suggestions && results.keywords.suggestions.length > 0) {
      recommendations.push({
        category: 'keywords',
        priority: 'medium',
        title: '优化关键词策略',
        description: results.keywords.suggestions.slice(0, 3).join('；'),
        actionItems: results.keywords.suggestions.slice(0, 5)
      });
    }

    // 结构化数据建议
    if (results.checks.structured && results.checks.structured.score < 70) {
      recommendations.push({
        category: 'structured',
        priority: 'low',
        title: '添加结构化数据',
        description: '实施Schema.org标记，提高搜索结果展示效果',
        actionItems: [
          '添加JSON-LD结构化数据',
          '实施适当的Schema.org类型',
          '验证结构化数据格式',
          '添加面包屑导航标记',
          '实施本地商业信息标记'
        ]
      });
    }

    // 按优先级排序
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    results.recommendations = recommendations;
  }

  /**
   * 分类问题
   */
  categorizeIssues(results) {
    const issues = [];

    // 收集所有检查中的问题
    Object.values(results.checks).forEach(check => {
      if (check.checks && Array.isArray(check.checks)) {
        check.checks.forEach(item => {
          if (item.type === 'error' || item.type === 'warning') {
            issues.push({
              type: item.type,
              category: check.category,
              message: item.message,
              impact: item.impact,
              severity: item.type === 'error' ? 'high' : 'medium'
            });
          }
        });
      }

      // 处理issues数组
      if (check.issues && Array.isArray(check.issues)) {
        check.issues.forEach(issue => {
          issues.push({
            type: 'warning',
            category: check.category || 'general',
            message: issue,
            impact: 'neutral',
            severity: 'medium'
          });
        });
      }
    });

    // 按严重程度排序
    issues.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    results.issues = issues;
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId) || null;
  }

  /**
   * 停止测试
   */
  stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'stopped';
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * 导出SEO报告
   */
  async exportReport(seoResults, format = 'pdf', options = {}) {
    try {
      console.log(`📄 Generating SEO report in ${format} format...`);
      const result = await this.reportGenerator.generateReport(seoResults, format, options);
      console.log(`✅ SEO report generated: ${result.filename}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to generate SEO report:', error);
      throw error;
    }
  }

  /**
   * 获取支持的报告格式
   */
  getSupportedReportFormats() {
    return ['pdf', 'html', 'json', 'csv'];
  }

  /**
   * 生成SEO摘要
   */
  generateSEOSummary(seoResults) {
    const summary = {
      url: seoResults.url,
      overallScore: seoResults.overallScore,
      scoreGrade: seoResults.scoreGrade,
      timestamp: seoResults.timestamp,
      duration: seoResults.duration,

      // 分数统计
      scores: seoResults.scores,
      averageScore: 0,

      // 问题统计
      totalIssues: seoResults.issues ? seoResults.issues.length : 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,

      // 建议统计
      totalRecommendations: seoResults.recommendations ? seoResults.recommendations.length : 0,
      highPriorityRecommendations: 0,
      mediumPriorityRecommendations: 0,
      lowPriorityRecommendations: 0,

      // 关键词统计
      keywordStats: {
        total: 0,
        optimal: 0,
        high: 0,
        low: 0,
        missing: 0
      }
    };

    // 计算平均分数
    const scores = Object.values(seoResults.scores || {}).filter(score => score > 0);
    summary.averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // 统计问题
    if (seoResults.issues) {
      seoResults.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical': summary.criticalIssues++; break;
          case 'high': summary.highIssues++; break;
          case 'medium': summary.mediumIssues++; break;
          case 'low': summary.lowIssues++; break;
        }
      });
    }

    // 统计建议
    if (seoResults.recommendations) {
      seoResults.recommendations.forEach(rec => {
        switch (rec.priority) {
          case 'high': summary.highPriorityRecommendations++; break;
          case 'medium': summary.mediumPriorityRecommendations++; break;
          case 'low': summary.lowPriorityRecommendations++; break;
        }
      });
    }

    // 统计关键词
    if (seoResults.keywords && seoResults.keywords.density) {
      Object.values(seoResults.keywords.density).forEach(data => {
        summary.keywordStats.total++;
        switch (data.status) {
          case 'optimal': summary.keywordStats.optimal++; break;
          case 'high': summary.keywordStats.high++; break;
          case 'low': summary.keywordStats.low++; break;
          case 'missing': summary.keywordStats.missing++; break;
        }
      });
    }

    return summary;
  }
}

module.exports = { RealSEOTestEngine };
