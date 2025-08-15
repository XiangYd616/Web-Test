const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * 网站综合测试引擎
 * 提供网站的综合性测试，包括可用性、内容质量、技术指标等
 */
class WebsiteTestEngine {
  constructor() {
    this.testResults = {
      url: '',
      timestamp: new Date().toISOString(),
      testType: 'website',
      success: false,
      score: 0,
      results: {},
      recommendations: [],
      errors: []
    };
  }

  /**
   * 运行网站综合测试
   */
  async runWebsiteTest(url, config = {}) {
    try {
      console.log(`🌐 开始网站综合测试: ${url}`);
      
      this.testResults.url = url;
      this.testResults.config = config;

      // 基础可用性测试
      await this.testBasicAvailability(url);
      
      // 内容分析
      await this.analyzeContent(url);
      
      // 技术指标检测
      await this.checkTechnicalMetrics(url);
      
      // 用户体验评估
      await this.evaluateUserExperience(url);
      
      // 计算综合评分
      this.calculateOverallScore();
      
      // 生成建议
      this.generateRecommendations();

      this.testResults.success = true;
      console.log(`✅ 网站综合测试完成，评分: ${this.testResults.score}/100`);
      
      return this.testResults;

    } catch (error) {
      console.error('❌ 网站综合测试失败:', error);
      this.testResults.success = false;
      this.testResults.error = error.message;
      this.testResults.errors.push({
        type: 'test_execution_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      return this.testResults;
    }
  }

  /**
   * 基础可用性测试
   */
  async testBasicAvailability(url) {
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true, // 接受所有状态码
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const responseTime = Date.now() - startTime;

      this.testResults.results.availability = {
        accessible: response.status < 400,
        statusCode: response.status,
        responseTime,
        contentLength: response.data?.length || 0,
        headers: response.headers
      };

      console.log(`📊 可用性测试: ${response.status} (${responseTime}ms)`);

    } catch (error) {
      this.testResults.results.availability = {
        accessible: false,
        error: error.message,
        responseTime: null
      };
      this.testResults.errors.push({
        type: 'availability_error',
        message: error.message
      });
    }
  }

  /**
   * 内容分析
   */
  async analyzeContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // 基础内容分析
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const headings = {
        h1: $('h1').length,
        h2: $('h2').length,
        h3: $('h3').length,
        h4: $('h4').length,
        h5: $('h5').length,
        h6: $('h6').length
      };
      
      const images = $('img').length;
      const links = $('a').length;
      const forms = $('form').length;
      
      // 文本内容分析
      const textContent = $('body').text().replace(//s+/g, ' ').trim();
      const wordCount = textContent.split(' ').length;
      
      this.testResults.results.content = {
        title: {
          text: title,
          length: title.length,
          present: title.length > 0
        },
        description: {
          text: description,
          length: description.length,
          present: description.length > 0
        },
        headings,
        elements: {
          images,
          links,
          forms
        },
        text: {
          wordCount,
          readabilityScore: this.calculateReadabilityScore(textContent)
        }
      };

      console.log(`📝 内容分析完成: ${wordCount}词, ${images}图片, ${links}链接`);

    } catch (error) {
      this.testResults.errors.push({
        type: 'content_analysis_error',
        message: error.message
      });
    }
  }

  /**
   * 技术指标检测
   */
  async checkTechnicalMetrics(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // HTML验证
      const doctype = response.data.toLowerCase().includes('<!doctype html>');
      const charset = $('meta[charset]').length > 0 || $('meta[http-equiv="content-type"]').length > 0;
      const viewport = $('meta[name="viewport"]').length > 0;
      
      // 性能相关
      const cssFiles = $('link[rel="stylesheet"]').length;
      const jsFiles = $('script[src]').length;
      const inlineStyles = $('style').length;
      const inlineScripts = $('script:not([src])').length;
      
      // SEO基础
      const metaTags = $('meta').length;
      const altTexts = $('img[alt]').length;
      const totalImages = $('img').length;
      
      this.testResults.results.technical = {
        html: {
          doctype,
          charset,
          viewport,
          valid: doctype && charset
        },
        performance: {
          cssFiles,
          jsFiles,
          inlineStyles,
          inlineScripts,
          resourcesOptimized: cssFiles + jsFiles < 10
        },
        seo: {
          metaTags,
          altTextCoverage: totalImages > 0 ? (altTexts / totalImages * 100).toFixed(1) : 100,
          seoFriendly: metaTags > 5 && (altTexts / Math.max(totalImages, 1)) > 0.8
        }
      };

      console.log(`🔧 技术指标检测完成`);

    } catch (error) {
      this.testResults.errors.push({
        type: 'technical_metrics_error',
        message: error.message
      });
    }
  }

  /**
   * 用户体验评估
   */
  async evaluateUserExperience(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // 导航结构
      const navigation = $('nav').length > 0 || $('ul.nav, .navigation, .menu').length > 0;
      const breadcrumbs = $('.breadcrumb, .breadcrumbs, nav[aria-label*="breadcrumb"]').length > 0;
      
      // 表单可用性
      const formsWithLabels = $('form').toArray().map(form => {
        const $form = $(form);
        const inputs = $form.find('input, select, textarea').length;
        const labels = $form.find('label').length;
        return inputs > 0 ? labels / inputs : 1;
      });
      
      const avgLabelCoverage = formsWithLabels.length > 0 
        ? formsWithLabels.reduce((a, b) => a + b, 0) / formsWithLabels.length 
        : 1;
      
      // 可访问性基础
      const skipLinks = $('a[href^="#"]').filter((i, el) => $(el).text().toLowerCase().includes('skip')).length > 0;
      const headingStructure = this.validateHeadingStructure($);
      
      this.testResults.results.userExperience = {
        navigation: {
          present: navigation,
          breadcrumbs,
          score: (navigation ? 50 : 0) + (breadcrumbs ? 25 : 0)
        },
        forms: {
          labelCoverage: (avgLabelCoverage * 100).toFixed(1),
          accessible: avgLabelCoverage > 0.8
        },
        accessibility: {
          skipLinks,
          headingStructure: headingStructure.valid,
          score: (skipLinks ? 25 : 0) + (headingStructure.valid ? 25 : 0)
        }
      };

      console.log(`👤 用户体验评估完成`);

    } catch (error) {
      this.testResults.errors.push({
        type: 'user_experience_error',
        message: error.message
      });
    }
  }

  /**
   * 计算可读性评分（简化版）
   */
  calculateReadabilityScore(text) {
    if (!text || text.length < 100) return 0;
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(//s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => {
      return count + Math.max(1, word.match(/[aeiouAEIOU]/g)?.length || 1);
    }, 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    
    // 简化的Flesch Reading Ease公式
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 验证标题结构
   */
  validateHeadingStructure($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push(parseInt(el.tagName.charAt(1)));
    });
    
    if (headings.length === 0) return { valid: false, reason: 'No headings found' };
    if (headings[0] !== 1) return { valid: false, reason: 'First heading is not H1' };
    
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i-1] + 1) {
        return { valid: false, reason: 'Heading levels skip' };
      }
    }
    
    return { valid: true };
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore() {
    let score = 0;
    let maxScore = 0;
    
    // 可用性评分 (30分)
    if (this.testResults.results.availability) {
      maxScore += 30;
      if (this.testResults.results.availability.accessible) {
        score += 25;
        if (this.testResults.results.availability.responseTime < 3000) score += 5;
      }
    }
    
    // 内容质量评分 (25分)
    if (this.testResults.results.content) {
      maxScore += 25;
      const content = this.testResults.results.content;
      if (content.title.present && content.title.length > 10) score += 8;
      if (content.description.present && content.description.length > 50) score += 7;
      if (content.text.wordCount > 100) score += 5;
      if (content.text.readabilityScore > 60) score += 5;
    }
    
    // 技术指标评分 (25分)
    if (this.testResults.results.technical) {
      maxScore += 25;
      const tech = this.testResults.results.technical;
      if (tech.html.valid) score += 10;
      if (tech.performance.resourcesOptimized) score += 8;
      if (tech.seo.seoFriendly) score += 7;
    }
    
    // 用户体验评分 (20分)
    if (this.testResults.results.userExperience) {
      maxScore += 20;
      const ux = this.testResults.results.userExperience;
      score += Math.round(ux.navigation.score * 0.4);
      if (ux.forms.accessible) score += 5;
      score += Math.round(ux.accessibility.score * 0.4);
    }
    
    this.testResults.score = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // 可用性建议
    if (!this.testResults.results.availability?.accessible) {
      recommendations.push({
        type: 'critical',
        category: 'availability',
        message: '网站无法访问，请检查服务器状态和域名配置'
      });
    } else if (this.testResults.results.availability.responseTime > 3000) {
      recommendations.push({
        type: 'warning',
        category: 'performance',
        message: '页面响应时间较慢，建议优化服务器性能或使用CDN'
      });
    }
    
    // 内容建议
    const content = this.testResults.results.content;
    if (content && !content.title.present) {
      recommendations.push({
        type: 'error',
        category: 'seo',
        message: '缺少页面标题，这对SEO和用户体验都很重要'
      });
    }
    
    if (content && !content.description.present) {
      recommendations.push({
        type: 'warning',
        category: 'seo',
        message: '缺少页面描述，建议添加meta description标签'
      });
    }
    
    // 技术建议
    const tech = this.testResults.results.technical;
    if (tech && !tech.html.doctype) {
      recommendations.push({
        type: 'error',
        category: 'html',
        message: '缺少HTML5文档类型声明'
      });
    }
    
    if (tech && !tech.html.viewport) {
      recommendations.push({
        type: 'warning',
        category: 'mobile',
        message: '缺少viewport meta标签，可能影响移动端显示'
      });
    }
    
    // 用户体验建议
    const ux = this.testResults.results.userExperience;
    if (ux && !ux.navigation.present) {
      recommendations.push({
        type: 'warning',
        category: 'usability',
        message: '建议添加清晰的导航结构'
      });
    }
    
    if (ux && !ux.forms.accessible) {
      recommendations.push({
        type: 'warning',
        category: 'accessibility',
        message: '表单缺少标签，影响可访问性'
      });
    }
    
    this.testResults.recommendations = recommendations;
  }
}

module.exports = WebsiteTestEngine;
