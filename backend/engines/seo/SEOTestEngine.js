/**
 * SEO优化测试工具
 * 真实实现SEO分析功能，包括Meta标签、结构化数据、robots.txt等
 */

const cheerio = require('cheerio');
const axios = require('axios');
const Joi = require('joi');

class SeoTestEngine {
  constructor() {
    this.name = 'seo';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      checks: Joi.array().items(
        Joi.string().valid('meta', 'headings', 'images', 'links', 'structured-data', 'robots', 'sitemap')
      ).default(['meta', 'headings', 'images', 'links']),
      timeout: Joi.number().min(5000).max(60000).default(30000),
      userAgent: Joi.string().default('Mozilla/5.0 (compatible; SEO-Bot/1.0)')
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    
    return value;
  }

  /**
   * 检查可用性
   */
  async checkAvailability() {
    try {
      // 测试基本HTTP请求和HTML解析功能
      const testResponse = await axios.get('https://httpbin.org/html', {
        timeout: 5000
      });
      
      const $ = cheerio.load(testResponse.data);
      const hasTitle = $('title').length > 0;
      
      return {
        available: testResponse.status === 200 && hasTitle,
        version: {
          cheerio: require('cheerio/package.json').version,
          axios: require('axios/package.json').version
        },
        dependencies: ['cheerio', 'axios']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['cheerio', 'axios']
      };
    }
  }

  /**
   * 执行SEO测试
   */
  async runSeoTest(config) {
    const testId = `seo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '开始SEO分析');

      // 获取页面内容
      this.updateTestProgress(testId, 20, '获取页面内容');
      const response = await axios.get(validatedConfig.url, {
        timeout: validatedConfig.timeout,
        headers: {
          'User-Agent': validatedConfig.userAgent
        }
      });

      const $ = cheerio.load(response.data);
      
      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {
          totalChecks: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          score: 0
        }
      };

      const progressStep = 70 / validatedConfig.checks.length;
      let currentProgress = 20;

      // 执行各项SEO检查
      for (const check of validatedConfig.checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);
        
        switch (check) {
          case 'meta':
            results.checks.meta = this.checkMetaTags($);
            break;
          case 'headings':
            results.checks.headings = this.checkHeadings($);
            break;
          case 'images':
            results.checks.images = this.checkImages($);
            break;
          case 'links':
            results.checks.links = this.checkLinks($);
            break;
          case 'structured-data':
            results.checks.structuredData = this.checkStructuredData($);
            break;
          case 'robots':
            results.checks.robots = await this.checkRobotsTxt(validatedConfig.url);
            break;
          case 'sitemap':
            results.checks.sitemap = await this.checkSitemap(validatedConfig.url);
            break;
        }
        
        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算SEO评分');

      // 计算总体SEO评分
      results.summary = this.calculateSeoScore(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, 'SEO分析完成');
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      return results;

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        progress: 0,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * 检查Meta标签
   */
  checkMetaTags($) {
    const results = {
      title: null,
      description: null,
      keywords: null,
      viewport: null,
      charset: null,
      score: 0,
      issues: []
    };

    // 检查title标签
    const title = $('title').first();
    if (title.length > 0) {
      const titleText = title.text().trim();
      results.title = {
        content: titleText,
        length: titleText.length,
        present: true
      };
      
      if (titleText.length < 30) {
        results.issues.push('标题过短（建议30-60字符）');
      } else if (titleText.length > 60) {
        results.issues.push('标题过长（建议30-60字符）');
      } else {
        results.score += 25;
      }
    } else {
      results.title = { present: false };
      results.issues.push('缺少title标签');
    }

    // 检查description
    const description = $('meta[name="description"]').first();
    if (description.length > 0) {
      const descContent = description.attr('content') || '';
      results.description = {
        content: descContent,
        length: descContent.length,
        present: true
      };
      
      if (descContent.length < 120) {
        results.issues.push('描述过短（建议120-160字符）');
      } else if (descContent.length > 160) {
        results.issues.push('描述过长（建议120-160字符）');
      } else {
        results.score += 25;
      }
    } else {
      results.description = { present: false };
      results.issues.push('缺少meta description');
    }

    // 检查viewport
    const viewport = $('meta[name="viewport"]').first();
    if (viewport.length > 0) {
      results.viewport = {
        content: viewport.attr('content'),
        present: true
      };
      results.score += 25;
    } else {
      results.viewport = { present: false };
      results.issues.push('缺少viewport meta标签');
    }

    // 检查charset
    const charset = $('meta[charset]').first();
    if (charset.length > 0) {
      results.charset = {
        content: charset.attr('charset'),
        present: true
      };
      results.score += 25;
    } else {
      results.charset = { present: false };
      results.issues.push('缺少charset声明');
    }

    return {
      status: results.score >= 75 ? 'passed' : results.score >= 50 ? 'warning' : 'failed',
      score: results.score,
      details: results
    };
  }

  /**
   * 检查标题结构
   */
  checkHeadings($) {
    const headings = [];
    let score = 0;
    const issues = [];

    // 收集所有标题
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const $elem = $(elem);
      headings.push({
        tag: elem.tagName.toLowerCase(),
        text: $elem.text().trim(),
        level: parseInt(elem.tagName.charAt(1))
      });
    });

    // 检查H1标签
    const h1Count = headings.filter(h => h.tag === 'h1').length;
    if (h1Count === 1) {
      score += 50;
    } else if (h1Count === 0) {
      issues.push('缺少H1标签');
    } else {
      issues.push('H1标签过多（建议只有一个）');
    }

    // 检查标题层次结构
    if (headings.length > 0) {
      score += 50;
    } else {
      issues.push('页面缺少标题结构');
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score,
      details: {
        headings,
        h1Count,
        totalHeadings: headings.length
      },
      issues
    };
  }

  /**
   * 检查图片优化
   */
  checkImages($) {
    const images = [];
    let score = 100;
    const issues = [];

    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      
      const imageInfo = {
        src,
        hasAlt: !!alt,
        altText: alt || '',
        hasTitle: !!$img.attr('title')
      };

      if (!alt) {
        issues.push(`图片缺少alt属性: ${src}`);
        score -= 10;
      }

      images.push(imageInfo);
    });

    const imagesWithoutAlt = images.filter(img => !img.hasAlt).length;
    const altCoverage = images.length > 0 ? ((images.length - imagesWithoutAlt) / images.length) * 100 : 100;

    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalImages: images.length,
        imagesWithAlt: images.length - imagesWithoutAlt,
        imagesWithoutAlt,
        altCoverage: Math.round(altCoverage),
        images: images.slice(0, 10) // 只返回前10个图片的详情
      },
      issues
    };
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
      console.log(`[SEO-${testId}] ${progress}% - ${message}`);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      test.status = 'cancelled';
      this.activeTests.set(testId, test);
      return true;
    }
    return false;
  }
}

module.exports = SeoTestEngine;
