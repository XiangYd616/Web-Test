const http = require('http');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');
const { SEOReportGenerator } = require('./seoReportGenerator');

/**
 * 真实的SEO分析测试引擎
 * 提供全面的SEO分析功能
 */
class RealSEOTestEngine {
  constructor() {
    this.name = 'seo';
    this.version = '2.0.0';
    this.isAvailable = true;
    this.activeTests = new Map();
    this.reportGenerator = new SEOReportGenerator();
  }

  /**
   * 检查SEO测试引擎是否可用
   */
  async checkAvailability() {
    return true;
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
      console.log('🔍 Fetching page content...');
      results.progress = 10;
      const pageData = await this.fetchPageData(url);
      results.pageInfo = pageData.info;
      results.metadata = pageData.metadata;

      // 2. 技术SEO分析
      console.log('⚙️ Analyzing technical SEO...');
      results.progress = 25;
      results.checks.technical = await this.analyzeTechnicalSEO(pageData);
      results.scores.technical = results.checks.technical.score;

      // 3. 内容分析
      console.log('📝 Analyzing content quality...');
      results.progress = 40;
      results.checks.content = await this.analyzeContentSEO(pageData, options.keywords);
      results.scores.content = results.checks.content.score;

      // 4. 页面SEO分析
      console.log('📋 Analyzing on-page SEO...');
      results.progress = 55;
      results.checks.onPage = await this.analyzeOnPageSEO(pageData);
      results.scores.onPage = results.checks.onPage.score;

      // 5. 性能分析
      console.log('⚡ Analyzing performance factors...');
      results.progress = 70;
      results.checks.performance = await this.analyzePerformanceSEO(pageData);
      results.scores.performance = results.checks.performance.score;

      // 6. 移动端SEO分析
      console.log('📱 Analyzing mobile SEO...');
      results.progress = 80;
      results.checks.mobile = await this.analyzeMobileSEO(pageData);
      results.scores.mobile = results.checks.mobile.score;

      // 7. 社交媒体SEO分析
      console.log('📢 Analyzing social media SEO...');
      results.progress = 90;
      results.checks.social = await this.analyzeSocialSEO(pageData);
      results.scores.social = results.checks.social.score;

      // 8. 结构化数据分析
      console.log('🏗️ Analyzing structured data...');
      results.checks.structured = await this.analyzeStructuredData(pageData);

      // 9. Core Web Vitals分析
      console.log('⚡ Analyzing Core Web Vitals...');
      results.progress = 85;
      results.checks.coreWebVitals = await this.analyzeCoreWebVitals(pageData);

      // 10. 页面体验分析
      console.log('👤 Analyzing page experience...');
      results.progress = 88;
      results.checks.pageExperience = await this.analyzePageExperience(pageData);

      // 11. 关键词分析
      if (options.keywords) {
        console.log('🔑 Analyzing keywords...');
        results.keywords = await this.analyzeKeywords(pageData, options.keywords);
      }

      // 12. 竞争对手分析（如果启用）
      if (options.checkCompetitors) {
        console.log('🏆 Analyzing competitors...');
        results.progress = 92;
        results.competitors = await this.analyzeCompetitors(pageData, options.competitorUrls);
      }

      // 13. 计算总体分数和生成建议
      console.log('📊 Calculating overall score...');
      results.progress = 95;
      this.calculateOverallScore(results);
      this.generateRecommendations(results);
      this.categorizeIssues(results);

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
  async fetchPageData(url) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 30000,
        headers: {
          'User-Agent': 'SEO-Analyzer/2.0 (Real SEO Test Engine)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        const responseHeaders = res.headers;
        const statusCode = res.statusCode;
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const loadTime = Date.now() - startTime;

          // 提取页面标题
          const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';

          // 使用cheerio解析HTML
          const $ = cheerio.load(data);

          resolve({
            html: data,
            $: $, // 添加cheerio实例
            headers: responseHeaders,
            statusCode: statusCode,
            info: {
              title: title,
              url: url,
              statusCode: statusCode,
              redirects: res.headers.location ? [res.headers.location] : []
            },
            metadata: {
              crawlTime: loadTime,
              pageSize: Buffer.byteLength(data, 'utf8'),
              loadTime: loadTime,
              contentType: responseHeaders['content-type'] || '',
              lastModified: responseHeaders['last-modified'] || '',
              server: responseHeaders['server'] || '',
              resources: []
            }
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to fetch page: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * 技术SEO分析
   */
  async analyzeTechnicalSEO(pageData) {
    const { html, headers, statusCode } = pageData;
    const checks = [];
    let score = 100;

    // HTTP状态码检查
    if (statusCode === 200) {
      checks.push({ type: 'success', message: 'HTTP状态码正常 (200)', impact: 'positive' });
    } else if (statusCode >= 300 && statusCode < 400) {
      checks.push({ type: 'warning', message: `重定向状态码 (${statusCode})`, impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: `HTTP错误状态码 (${statusCode})`, impact: 'negative' });
      score -= 30;
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
    const pageSizeKB = Math.round(pageData.metadata.pageSize / 1024);
    if (pageSizeKB < 500) {
      checks.push({ type: 'success', message: `页面大小合理 (${pageSizeKB}KB)`, impact: 'positive' });
    } else if (pageSizeKB < 1000) {
      checks.push({ type: 'warning', message: `页面大小较大 (${pageSizeKB}KB)`, impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: `页面大小过大 (${pageSizeKB}KB)`, impact: 'negative' });
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
   * 内容SEO分析
   */
  async analyzeContentSEO(pageData, keywords = '') {
    const { html } = pageData;
    const checks = [];
    let score = 100;

    // 获取页面文本内容
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const textContent = bodyContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;

    // 内容长度检查
    if (wordCount >= 300) {
      checks.push({ type: 'success', message: `内容丰富 (${wordCount} 词)`, impact: 'positive' });
    } else if (wordCount >= 150) {
      checks.push({ type: 'warning', message: `内容较少 (${wordCount} 词)`, impact: 'neutral' });
      score -= 15;
    } else {
      checks.push({ type: 'error', message: `内容过少 (${wordCount} 词)`, impact: 'negative' });
      score -= 30;
    }

    // 关键词密度分析
    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
      const contentLower = textContent.toLowerCase();
      
      keywordList.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = contentLower.match(regex) || [];
        const density = (matches.length / wordCount) * 100;
        
        if (density >= 1 && density <= 3) {
          checks.push({ type: 'success', message: `关键词"${keyword}"密度合适 (${density.toFixed(1)}%)`, impact: 'positive' });
        } else if (density > 3) {
          checks.push({ type: 'warning', message: `关键词"${keyword}"密度过高 (${density.toFixed(1)}%)`, impact: 'neutral' });
          score -= 10;
        } else if (density > 0) {
          checks.push({ type: 'warning', message: `关键词"${keyword}"密度偏低 (${density.toFixed(1)}%)`, impact: 'neutral' });
          score -= 5;
        } else {
          checks.push({ type: 'error', message: `未找到关键词"${keyword}"`, impact: 'negative' });
          score -= 15;
        }
      });
    }

    // 内容重复检查
    const sentences = textContent.split(/[.!?。！？]/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    const duplicateRatio = (sentences.length - uniqueSentences.size) / sentences.length;
    
    if (duplicateRatio < 0.1) {
      checks.push({ type: 'success', message: '内容原创性良好', impact: 'positive' });
    } else if (duplicateRatio < 0.3) {
      checks.push({ type: 'warning', message: '存在少量重复内容', impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: '存在大量重复内容', impact: 'negative' });
      score -= 25;
    }

    return {
      category: 'content',
      score: Math.max(0, score),
      checks: checks,
      wordCount: wordCount,
      summary: `内容SEO检查完成，内容质量${score >= 80 ? '优秀' : score >= 60 ? '良好' : '需要改进'}`
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
    const pageSizeKB = Math.round(pageData.metadata.pageSize / 1024);
    if (pageSizeKB < 100) {
      checks.push({ type: 'success', message: `页面大小优秀 (${pageSizeKB}KB)`, impact: 'positive' });
    } else if (pageSizeKB < 500) {
      checks.push({ type: 'success', message: `页面大小良好 (${pageSizeKB}KB)`, impact: 'positive' });
    } else if (pageSizeKB < 1000) {
      checks.push({ type: 'warning', message: `页面大小偏大 (${pageSizeKB}KB)`, impact: 'neutral' });
      score -= 10;
    } else {
      checks.push({ type: 'error', message: `页面大小过大 (${pageSizeKB}KB)`, impact: 'negative' });
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
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, freq]) => ({ word, frequency: freq }));

    return analysis;
  }

  /**
   * Core Web Vitals分析
   */
  async analyzeCoreWebVitals(pageData) {
    const checks = [];
    let score = 100;
    const metrics = {};

    // 基于页面加载时间估算Core Web Vitals
    const loadTime = pageData.metadata.loadTime;
    const pageSize = pageData.metadata.pageSize;

    // LCP (Largest Contentful Paint) 估算
    const estimatedLCP = Math.max(loadTime * 0.8, 1000); // 估算LCP约为加载时间的80%
    metrics.lcp = estimatedLCP;

    if (estimatedLCP <= 2500) {
      checks.push({ type: 'success', message: `LCP良好 (估算: ${(estimatedLCP/1000).toFixed(1)}s)`, impact: 'positive' });
    } else if (estimatedLCP <= 4000) {
      checks.push({ type: 'warning', message: `LCP需要改进 (估算: ${(estimatedLCP/1000).toFixed(1)}s)`, impact: 'neutral' });
      score -= 20;
    } else {
      checks.push({ type: 'error', message: `LCP较差 (估算: ${(estimatedLCP/1000).toFixed(1)}s)`, impact: 'negative' });
      score -= 40;
    }

    // FID (First Input Delay) 估算 - 基于页面复杂度
    const { $ } = pageData;
    const scriptCount = $('script').length;
    const estimatedFID = Math.min(scriptCount * 10, 300); // 基于脚本数量估算
    metrics.fid = estimatedFID;

    if (estimatedFID <= 100) {
      checks.push({ type: 'success', message: `FID良好 (估算: ${estimatedFID}ms)`, impact: 'positive' });
    } else if (estimatedFID <= 300) {
      checks.push({ type: 'warning', message: `FID需要改进 (估算: ${estimatedFID}ms)`, impact: 'neutral' });
      score -= 15;
    } else {
      checks.push({ type: 'error', message: `FID较差 (估算: ${estimatedFID}ms)`, impact: 'negative' });
      score -= 30;
    }

    // CLS (Cumulative Layout Shift) 估算 - 基于页面结构
    const imgWithoutDimensions = $('img:not([width]):not([height])').length;
    const estimatedCLS = Math.min(imgWithoutDimensions * 0.05, 0.5);
    metrics.cls = estimatedCLS;

    if (estimatedCLS <= 0.1) {
      checks.push({ type: 'success', message: `CLS良好 (估算: ${estimatedCLS.toFixed(2)})`, impact: 'positive' });
    } else if (estimatedCLS <= 0.25) {
      checks.push({ type: 'warning', message: `CLS需要改进 (估算: ${estimatedCLS.toFixed(2)})`, impact: 'neutral' });
      score -= 15;
    } else {
      checks.push({ type: 'error', message: `CLS较差 (估算: ${estimatedCLS.toFixed(2)})`, impact: 'negative' });
      score -= 30;
    }

    // 提供改进建议
    if (estimatedLCP > 2500) {
      checks.push({ type: 'info', message: '建议: 优化图片大小、使用CDN、减少服务器响应时间', impact: 'neutral' });
    }
    if (estimatedFID > 100) {
      checks.push({ type: 'info', message: '建议: 减少JavaScript执行时间、使用Web Workers、优化第三方脚本', impact: 'neutral' });
    }
    if (estimatedCLS > 0.1) {
      checks.push({ type: 'info', message: '建议: 为图片和视频设置尺寸属性、避免在现有内容上方插入内容', impact: 'neutral' });
    }

    return {
      category: 'coreWebVitals',
      score: Math.max(0, score),
      checks: checks,
      metrics: metrics,
      summary: `Core Web Vitals分析完成，${score >= 80 ? '表现良好' : score >= 60 ? '需要改进' : '表现较差'}`
    };
  }

  /**
   * 页面体验分析
   */
  async analyzePageExperience(pageData) {
    const { $, headers } = pageData;
    const checks = [];
    let score = 100;

    // HTTPS检查
    if (pageData.info.url.startsWith('https://')) {
      checks.push({ type: 'success', message: '使用HTTPS安全连接', impact: 'positive' });
    } else {
      checks.push({ type: 'error', message: '未使用HTTPS安全连接', impact: 'negative' });
      score -= 30;
    }

    // 移动友好性检查
    const viewport = $('meta[name="viewport"]').attr('content');
    if (viewport && viewport.includes('width=device-width')) {
      checks.push({ type: 'success', message: '页面对移动设备友好', impact: 'positive' });
    } else {
      checks.push({ type: 'error', message: '页面对移动设备不友好', impact: 'negative' });
      score -= 25;
    }

    // 安全浏览检查（基于基本安全指标）
    const hasSecurityHeaders = headers['strict-transport-security'] ||
                              headers['content-security-policy'] ||
                              headers['x-frame-options'];
    if (hasSecurityHeaders) {
      checks.push({ type: 'success', message: '检测到安全头部设置', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: '建议添加安全头部设置', impact: 'neutral' });
      score -= 10;
    }

    // 广告体验检查
    const adElements = $('[class*="ad"], [id*="ad"], [class*="advertisement"], [id*="advertisement"]');
    if (adElements.length === 0) {
      checks.push({ type: 'success', message: '未检测到明显的广告元素', impact: 'positive' });
    } else if (adElements.length <= 3) {
      checks.push({ type: 'info', message: `检测到 ${adElements.length} 个广告元素，数量适中`, impact: 'neutral' });
    } else {
      checks.push({ type: 'warning', message: `检测到 ${adElements.length} 个广告元素，可能影响用户体验`, impact: 'neutral' });
      score -= 15;
    }

    // 弹窗检查
    const popupElements = $('[class*="popup"], [class*="modal"], [id*="popup"], [id*="modal"]');
    if (popupElements.length === 0) {
      checks.push({ type: 'success', message: '未检测到弹窗元素', impact: 'positive' });
    } else {
      checks.push({ type: 'warning', message: `检测到 ${popupElements.length} 个弹窗元素，注意用户体验`, impact: 'neutral' });
      score -= 10;
    }

    return {
      category: 'pageExperience',
      score: Math.max(0, score),
      checks: checks,
      summary: `页面体验分析完成，用户体验${score >= 80 ? '优秀' : score >= 60 ? '良好' : '需要改进'}`
    };
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
   * 计算总体SEO分数
   */
  calculateOverallScore(results) {
    const weights = {
      technical: 0.20,
      content: 0.18,
      onPage: 0.20,
      performance: 0.12,
      mobile: 0.10,
      social: 0.05,
      coreWebVitals: 0.10,
      pageExperience: 0.05
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
      if (check.checks) {
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
