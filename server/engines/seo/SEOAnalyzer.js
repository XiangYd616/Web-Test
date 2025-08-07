/**
 * SEO本地分析引擎
 * 本地化程度：80%
 * 提供全面的SEO分析功能，减少对第三方API的依赖
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { URL } = require('url');

// 导入分析模块
const MetaTagAnalyzer = require('./analyzers/MetaTagAnalyzer');
const ContentAnalyzer = require('./analyzers/ContentAnalyzer');
const PerformanceAnalyzer = require('./analyzers/PerformanceAnalyzer');
const StructuredDataAnalyzer = require('./analyzers/StructuredDataAnalyzer');
const LinkAnalyzer = require('./analyzers/LinkAnalyzer');
const MobileOptimizationAnalyzer = require('./analyzers/MobileOptimizationAnalyzer');
const ScoreCalculator = require('./utils/ScoreCalculator');
const RecommendationEngine = require('./utils/RecommendationEngine');

class SEOAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; TestWeb-SEO-Bot/1.0)',
      viewport: options.viewport || { width: 1920, height: 1080 },
      enableThirdPartyValidation: options.enableThirdPartyValidation || false,
      maxRetries: options.maxRetries || 3,
      ...options
    };
    
    this.browser = null;
    this.page = null;
    this.analysisStartTime = null;
    this.analysisResults = {};
  }

  /**
   * 执行完整的SEO分析
   */
  async analyze(url, config = {}) {
    this.analysisStartTime = Date.now();
    
    try {
      console.log(`🔍 开始SEO分析: ${url}`);
      
      // 验证URL
      await this.validateUrl(url);
      
      // 初始化浏览器
      await this.initializeBrowser();
      
      // 加载页面
      const pageData = await this.loadPage(url);
      
      // 并行执行所有分析模块
      const analysisPromises = [
        this.analyzeMetaTags(pageData),
        this.analyzeContent(pageData),
        this.analyzePerformance(pageData),
        this.analyzeStructuredData(pageData),
        this.analyzeLinks(pageData),
        this.analyzeMobileOptimization(pageData)
      ];
      
      const [
        metaAnalysis,
        contentAnalysis,
        performanceAnalysis,
        structuredDataAnalysis,
        linkAnalysis,
        mobileAnalysis
      ] = await Promise.all(analysisPromises);
      
      // 汇总分析结果
      this.analysisResults = {
        url,
        timestamp: new Date().toISOString(),
        analysisTime: Date.now() - this.analysisStartTime,
        meta: metaAnalysis,
        content: contentAnalysis,
        performance: performanceAnalysis,
        structuredData: structuredDataAnalysis,
        links: linkAnalysis,
        mobile: mobileAnalysis
      };
      
      // 计算综合评分
      const scoreCalculator = new ScoreCalculator();
      const scores = scoreCalculator.calculateScores(this.analysisResults);
      this.analysisResults.scores = scores;
      
      // 生成优化建议
      const recommendationEngine = new RecommendationEngine();
      const recommendations = recommendationEngine.generateRecommendations(this.analysisResults);
      this.analysisResults.recommendations = recommendations;
      
      console.log(`✅ SEO分析完成: ${url} (${this.analysisResults.analysisTime}ms)`);
      
      return this.analysisResults;
      
    } catch (error) {
      console.error(`❌ SEO分析失败: ${url}`, error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 验证URL有效性
   */
  async validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL必须使用HTTP或HTTPS协议');
      }
    } catch (error) {
      throw new Error(`无效的URL: ${error.message}`);
    }
  }

  /**
   * 初始化浏览器
   */
  async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // 设置用户代理和视口
      await this.page.setUserAgent(this.options.userAgent);
      await this.page.setViewport(this.options.viewport);
      
      // 设置请求拦截（可选：阻止某些资源以提高性能）
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const resourceType = request.resourceType();
        // 可以选择性地阻止某些资源类型
        if (['image', 'stylesheet', 'font'].includes(resourceType) && this.options.blockResources) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
    } catch (error) {
      throw new Error(`浏览器初始化失败: ${error.message}`);
    }
  }

  /**
   * 加载页面并获取数据
   */
  async loadPage(url) {
    try {
      console.log(`📄 加载页面: ${url}`);
      
      // 记录性能指标
      const startTime = Date.now();
      
      // 导航到页面
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });
      
      const loadTime = Date.now() - startTime;
      
      // 检查响应状态
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }
      
      // 等待页面完全加载
      await this.page.waitForTimeout(2000);
      
      // 获取页面内容
      const html = await this.page.content();
      const $ = cheerio.load(html);
      
      // 获取页面性能指标
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize
        };
      });
      
      // 获取页面基本信息
      const pageInfo = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          referrer: document.referrer,
          readyState: document.readyState,
          characterSet: document.characterSet,
          contentType: document.contentType,
          lastModified: document.lastModified
        };
      });
      
      return {
        url,
        html,
        $,
        response,
        loadTime,
        performanceMetrics,
        pageInfo,
        page: this.page
      };
      
    } catch (error) {
      throw new Error(`页面加载失败: ${error.message}`);
    }
  }

  /**
   * Meta标签分析
   */
  async analyzeMetaTags(pageData) {
    const analyzer = new MetaTagAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 内容分析
   */
  async analyzeContent(pageData) {
    const analyzer = new ContentAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 性能分析
   */
  async analyzePerformance(pageData) {
    const analyzer = new PerformanceAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 结构化数据分析
   */
  async analyzeStructuredData(pageData) {
    const analyzer = new StructuredDataAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 链接分析
   */
  async analyzeLinks(pageData) {
    const analyzer = new LinkAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 移动端优化分析
   */
  async analyzeMobileOptimization(pageData) {
    const analyzer = new MobileOptimizationAnalyzer();
    return await analyzer.analyze(pageData);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('清理资源时出错:', error);
    }
  }

  /**
   * 获取分析结果摘要
   */
  getSummary() {
    if (!this.analysisResults.scores) {
      return null;
    }
    
    const { scores } = this.analysisResults;
    
    return {
      overallScore: scores.overall.score,
      grade: scores.overall.grade,
      analysisTime: this.analysisResults.analysisTime,
      url: this.analysisResults.url,
      timestamp: this.analysisResults.timestamp,
      scores: {
        meta: scores.meta.score,
        content: scores.content.score,
        performance: scores.performance.score,
        structuredData: scores.structuredData.score,
        links: scores.links.score,
        mobile: scores.mobile.score
      },
      issueCount: {
        critical: this.analysisResults.recommendations.filter(r => r.priority === 'critical').length,
        high: this.analysisResults.recommendations.filter(r => r.priority === 'high').length,
        medium: this.analysisResults.recommendations.filter(r => r.priority === 'medium').length,
        low: this.analysisResults.recommendations.filter(r => r.priority === 'low').length
      }
    };
  }
}

module.exports = SEOAnalyzer;
