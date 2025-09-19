/**
 * 网站综合测试引擎
 * 执行网站的综合健康检查
 */

const Joi = require('joi');
const axios = require('axios');
const cheerio = require('cheerio');

class WebsiteTestEngine {
  constructor() {
    this.name = 'website';
    this.version = '1.0.0';
    this.activeTests = new Map();
  }

  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      testTypes: ['health', 'links', 'images', 'scripts', 'meta']
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      depth: Joi.number().min(1).max(5).default(2),
      checkBrokenLinks: Joi.boolean().default(true),
      checkImages: Joi.boolean().default(true),
      checkMeta: Joi.boolean().default(true),
      timeout: Joi.number().min(5000).max(60000).default(30000)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runWebsiteTest(config) {
    const testId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        health: {},
        issues: [],
        score: 0
      };

      // 获取网页内容
      const response = await axios.get(validatedConfig.url, {
        timeout: validatedConfig.timeout
      });

      const $ = cheerio.load(response.data);

      // 健康检查
      results.health = {
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || 'N/A',
        contentType: response.headers['content-type']
      };

      // 检查Meta标签
      if (validatedConfig.checkMeta) {
        results.meta = this.checkMetaTags($);
      }

      // 检查图片
      if (validatedConfig.checkImages) {
        results.images = await this.checkImages($, validatedConfig.url);
      }

      // 检查链接
      if (validatedConfig.checkBrokenLinks) {
        results.links = await this.checkLinks($, validatedConfig.url);
      }

      // 计算评分
      results.score = this.calculateScore(results);

      this.activeTests.delete(testId);
      return results;

    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  checkMetaTags($) {
    const meta = {
      title: $('title').text() || 'Missing',
      description: $('meta[name="description"]').attr('content') || 'Missing',
      keywords: $('meta[name="keywords"]').attr('content') || 'Missing',
      viewport: $('meta[name="viewport"]').attr('content') || 'Missing',
      charset: $('meta[charset]').attr('charset') || 'Missing'
    };

    return meta;
  }

  async checkImages($, baseUrl) {
    const images = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      const alt = $(elem).attr('alt');
      images.push({
        src: src || 'Missing',
        alt: alt || 'Missing',
        hasAlt: !!alt
      });
    });

    return {
      total: images.length,
      withAlt: images.filter(img => img.hasAlt).length,
      withoutAlt: images.filter(img => !img.hasAlt).length,
      images: images.slice(0, 10) // 只返回前10个图片
    };
  }

  async checkLinks($, baseUrl) {
    const links = [];
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        links.push({
          href,
          text: $(elem).text().trim()
        });
      }
    });

    return {
      total: links.length,
      internal: links.filter(l => !l.href.startsWith('http')).length,
      external: links.filter(l => l.href.startsWith('http')).length,
      links: links.slice(0, 10) // 只返回前10个链接
    };
  }

  calculateScore(results) {
    let score = 0;
    
    // 基础健康分数
    if (results.health.statusCode === 200) score += 30;
    
    // Meta标签分数
    if (results.meta) {
      if (results.meta.title !== 'Missing') score += 10;
      if (results.meta.description !== 'Missing') score += 10;
      if (results.meta.viewport !== 'Missing') score += 10;
    }
    
    // 图片分数
    if (results.images) {
      const altRatio = results.images.withAlt / (results.images.total || 1);
      score += altRatio * 20;
    }
    
    // 链接分数
    if (results.links) {
      score += Math.min(20, results.links.total > 0 ? 20 : 0);
    }
    
    return Math.round(score);
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

module.exports = WebsiteTestEngine;