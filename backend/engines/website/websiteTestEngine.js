/**
 * 网站综合测试引擎
 * 提供网站的综合性测试功能
 */

const axios = require('axios');
const cheerio = require('cheerio');

class WebsiteTestEngine {
  constructor(options = {}) {
    this.name = 'website';
    this.version = '2.0.0';
    this.description = '网站综合测试引擎';
    this.options = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (compatible; WebsiteTestBot/2.0)',
      ...options
    };
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'website-testing',
        'comprehensive-analysis',
        'seo-checking',
        'performance-monitoring'
      ]
    };
  }

  /**
   * 执行网站测试
   */
  async executeTest(config) {
    try {
      const { url = 'https://example.com' } = config;
      console.log(`🔍 开始网站综合测试: ${url}`);
      
      // 获取网页内容
      const pageData = await this.fetchPageData(url);
      
      // 执行基础网站检查
      const basicChecks = await this.performBasicChecks(url, pageData);
      
      // 执行性能检查
      const performanceChecks = await this.performPerformanceChecks(url, pageData);
      
      // 执行SEO检查
      const seoChecks = await this.performSEOChecks(url, pageData);
      
      // 计算总体评分
      const overallScore = Math.round(
        (basicChecks.accessibility * 0.3 + 
         performanceChecks.score * 0.4 + 
         seoChecks.score * 0.3)
      );
      
      const results = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          accessibility: basicChecks.accessibility,
          performance: performanceChecks.score,
          seo: seoChecks.score,
          status: 'completed'
        },
        checks: {
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks
        },
        recommendations: this.generateRecommendations(basicChecks, performanceChecks, seoChecks)
      };
      
      console.log(`✅ 网站测试完成: ${url}, 总分: ${results.summary.overallScore}`);
      
      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ 网站测试失败: ${error.message}`);
      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取网页数据
   */
  async fetchPageData(url) {
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: this.options.timeout,
      headers: {
        'User-Agent': this.options.userAgent
      },
      maxRedirects: 5
    });
    const loadTime = Date.now() - startTime;
    
    return {
      html: response.data,
      headers: response.headers,
      statusCode: response.status,
      loadTime,
      $: cheerio.load(response.data)
    };
  }

  /**
   * 执行基础检查
   */
  async performBasicChecks(url, pageData) {
    const { $ } = pageData;
    const errors = [];
    const warnings = [];
    
    // 检查基本HTML结构
    const hasDoctype = pageData.html.toLowerCase().includes('<!doctype');
    if (!hasDoctype) {
      warnings.push('缺少DOCTYPE声明');
    }
    
    // 检查title标签
    const title = $('title').text();
    if (!title) {
      errors.push('缺少title标签');
    } else if (title.length < 10) {
      warnings.push('title标签内容过短');
    }
    
    // 检查图片alt属性
    const totalImages = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    const imagesWithoutAlt = totalImages - imagesWithAlt;
    
    if (imagesWithoutAlt > 0) {
      warnings.push(`${imagesWithoutAlt}个图片缺少alt属性`);
    }
    
    // 检查链接
    const totalLinks = $('a').length;
    const linksWithoutTitle = $('a').not('[title]').length;
    if (linksWithoutTitle > totalLinks * 0.3) {
      warnings.push(`${linksWithoutTitle}个链接缺少title属性`);
    }
    
    // 检查表单标签
    const forms = $('form');
    forms.each((i, form) => {
      const inputs = $(form).find('input, textarea, select');
      inputs.each((j, input) => {
        const hasLabel = $(input).attr('id') && $(`label[for="${$(input).attr('id')}"]`).length > 0;
        if (!hasLabel) {
          warnings.push(`表单控件缺少label标签`);
          return false; // 只警告一次
        }
      });
    });
    
    // 计算可访问性评分
    let accessibility = 100;
    accessibility -= errors.length * 10;
    accessibility -= warnings.length * 5;
    accessibility = Math.max(0, accessibility);
    
    // 响应式设计检查
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const responsiveness = hasViewport ? 85 : 60;
    
    // 代码质量评分
    const codeQuality = this.assessCodeQuality($);
    
    return {
      accessibility,
      responsiveness,
      codeQuality,
      errors,
      warnings,
      metrics: {
        totalImages,
        imagesWithAlt,
        totalLinks,
        hasViewport
      }
    };
  }

  /**
   * 评估代码质量
   */
  assessCodeQuality($) {
    let score = 100;
    
    // 检查是否有过多的内联样式
    const inlineStyles = $('[style]').length;
    if (inlineStyles > 20) {
      score -= 10;
    }
    
    // 检查是否有废弃的标签
    const deprecatedTags = $('center, font, marquee, blink').length;
    score -= deprecatedTags * 5;
    
    // 检查JavaScript错误（简单检查）
    const scripts = $('script').length;
    if (scripts > 50) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  /**
   * 执行性能检查
   */
  async performPerformanceChecks(url, pageData) {
    const { loadTime, headers, $ } = pageData;
    
    // 资源统计
    const scripts = $('script').length;
    const styles = $('link[rel="stylesheet"], style').length;
    const images = $('img').length;
    
    // 性能评分
    let score = 100;
    
    // 基于加载时间评分
    if (loadTime > 3000) {
      score -= 30;
    } else if (loadTime > 1500) {
      score -= 15;
    }
    
    // 基于资源数量评分
    if (scripts > 20) score -= 10;
    if (styles > 10) score -= 5;
    if (images > 50) score -= 10;
    
    // 检查缓存头
    const hasCaching = headers['cache-control'] || headers['expires'];
    if (!hasCaching) {
      score -= 10;
    }
    
    // 检查压缩
    const hasCompression = headers['content-encoding'];
    if (!hasCompression) {
      score -= 10;
    }
    
    score = Math.max(0, score);
    
    // 性能分类
    let speed = 'good';
    if (loadTime > 3000) speed = 'poor';
    else if (loadTime > 1500) speed = 'needs improvement';
    
    return {
      score,
      loadTime,
      firstContentfulPaint: loadTime * 0.4, // 估算
      largestContentfulPaint: loadTime * 0.7, // 估算
      cumulativeLayoutShift: 0.1, // 估算值
      timeToInteractive: loadTime * 1.2, // 估算
      metrics: {
        speed,
        optimization: score > 80 ? 'good' : 'needs improvement',
        caching: hasCaching ? 'good' : 'poor',
        compression: hasCompression ? 'enabled' : 'disabled'
      },
      resources: {
        scripts,
        styles,
        images
      }
    };
  }

  /**
   * 执行SEO检查
   */
  async performSEOChecks(url, pageData) {
    const { $ } = pageData;
    let score = 100;
    
    // Title检查
    const title = $('title').text();
    const titleCheck = {
      present: !!title,
      length: title ? (title.length >= 30 && title.length <= 60 ? 'optimal' : 'suboptimal') : 'missing',
      value: title
    };
    
    if (!titleCheck.present) {
      score -= 20;
    } else if (titleCheck.length !== 'optimal') {
      score -= 10;
    }
    
    // Meta描述检查
    const metaDescription = $('meta[name="description"]').attr('content');
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    const hasViewport = $('meta[name="viewport"]').length > 0;
    
    const meta = {
      description: !!metaDescription,
      keywords: !!metaKeywords,
      viewport: hasViewport
    };
    
    if (!meta.description) score -= 15;
    if (!meta.viewport) score -= 10;
    
    // 标题结构检查
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    
    const headings = {
      h1Count,
      h2Count,
      h3Count,
      structure: h1Count === 1 ? 'good' : (h1Count === 0 ? 'poor' : 'needs improvement')
    };
    
    if (h1Count !== 1) score -= 15;
    
    // 图片alt属性检查
    const totalImages = $('img').length;
    const withAlt = $('img[alt]').length;
    const withoutAlt = totalImages - withAlt;
    
    const images = {
      withAlt,
      withoutAlt,
      totalImages,
      altRatio: totalImages > 0 ? (withAlt / totalImages) : 1
    };
    
    if (images.altRatio < 0.9) {
      score -= 10;
    }
    
    score = Math.max(0, score);
    
    return {
      score,
      title: titleCheck,
      meta,
      headings,
      images
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(basicChecks, performanceChecks, seoChecks) {
    const recommendations = [];
    
    // SEO建议
    if (!seoChecks.title.present) {
      recommendations.push('🔴 添加title标签');
    }
    if (!seoChecks.meta.description) {
      recommendations.push('🟡 添加meta描述标签');
    }
    if (seoChecks.images.altRatio < 0.9) {
      recommendations.push('🟡 为图片添加alt属性');
    }
    
    // 性能建议
    if (performanceChecks.loadTime > 3000) {
      recommendations.push('🔴 优化页面加载速度（当前超过3秒）');
    }
    if (performanceChecks.metrics.caching === 'poor') {
      recommendations.push('🟡 启用浏览器缓存');
    }
    if (performanceChecks.metrics.compression === 'disabled') {
      recommendations.push('🟡 启用Gzip/Brotli压缩');
    }
    
    // 可访问性建议
    if (!basicChecks.metrics.hasViewport) {
      recommendations.push('🟡 添加viewport meta标签以支持移动端');
    }
    if (basicChecks.warnings.length > 0) {
      recommendations.push('🟢 修复可访问性警告');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ 网站配置良好！');
    }
    
    return recommendations;
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('✅ 网站测试引擎清理完成');
  }
}

module.exports = WebsiteTestEngine;
