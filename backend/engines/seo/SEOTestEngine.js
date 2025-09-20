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
   * 检查链接
   */
  checkLinks($) {
    const links = [];
    let score = 100;
    const issues = [];
    
    $('a').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const title = $link.attr('title');
      const target = $link.attr('target');
      const rel = $link.attr('rel');
      
      const linkInfo = {
        href: href || '',
        text,
        hasTitle: !!title,
        target: target || '_self',
        rel: rel || ''
      };
      
      // 检查外部链接的安全性
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        if (target === '_blank' && !rel?.includes('noopener')) {
          issues.push(`外部链接缺少rel="noopener": ${href}`);
          score -= 5;
        }
      }
      
      // 检查空链接
      if (!href || href === '#') {
        issues.push(`发现空链接或占位符链接`);
        score -= 2;
      }
      
      // 检查链接文本
      if (!text && !title) {
        issues.push(`链接缺少描述文本: ${href}`);
        score -= 3;
      }
      
      links.push(linkInfo);
    });
    
    const internalLinks = links.filter(l => !l.href.startsWith('http'));
    const externalLinks = links.filter(l => l.href.startsWith('http'));
    
    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalLinks: links.length,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        links: links.slice(0, 10)
      },
      issues
    };
  }

  /**
   * 检查结构化数据
   */
  checkStructuredData($) {
    const structuredData = [];
    let score = 0;
    const issues = [];
    
    // 检查JSON-LD
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        structuredData.push({
          type: 'JSON-LD',
          schema: data['@type'] || 'Unknown',
          valid: true
        });
        score += 50;
      } catch (error) {
        issues.push('JSON-LD数据格式错误');
        structuredData.push({
          type: 'JSON-LD',
          valid: false,
          error: error.message
        });
      }
    });
    
    // 检查微数据
    const hasItemScope = $('[itemscope]').length > 0;
    if (hasItemScope) {
      structuredData.push({
        type: 'Microdata',
        count: $('[itemscope]').length,
        valid: true
      });
      score += 30;
    }
    
    // 检查Open Graph
    const ogTags = [];
    $('meta[property^="og:"]').each((i, elem) => {
      const $meta = $(elem);
      ogTags.push({
        property: $meta.attr('property'),
        content: $meta.attr('content')
      });
    });
    
    if (ogTags.length > 0) {
      structuredData.push({
        type: 'Open Graph',
        tags: ogTags,
        valid: true
      });
      score += 20;
    }
    
    if (structuredData.length === 0) {
      issues.push('未检测到结构化数据');
    }
    
    return {
      status: score >= 50 ? 'passed' : score >= 30 ? 'warning' : 'failed',
      score,
      details: {
        structuredData,
        hasJsonLd: structuredData.some(d => d.type === 'JSON-LD'),
        hasMicrodata: hasItemScope,
        hasOpenGraph: ogTags.length > 0
      },
      issues
    };
  }

  /**
   * 检查robots.txt
   */
  async checkRobotsTxt(url) {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        const content = response.data;
        const lines = content.split('\n').filter(line => line.trim());
        
        const hasUserAgent = lines.some(line => line.toLowerCase().startsWith('user-agent:'));
        const hasSitemap = lines.some(line => line.toLowerCase().startsWith('sitemap:'));
        const hasDisallow = lines.some(line => line.toLowerCase().startsWith('disallow:'));
        const hasAllow = lines.some(line => line.toLowerCase().startsWith('allow:'));
        
        let score = 50; // 基础分
        const issues = [];
        
        if (!hasUserAgent) {
          issues.push('robots.txt缺少User-agent指令');
          score -= 20;
        }
        
        if (!hasSitemap) {
          issues.push('robots.txt中未指定sitemap');
          score -= 10;
        } else {
          score += 30;
        }
        
        if (hasDisallow || hasAllow) {
          score += 20;
        }
        
        return {
          status: 'passed',
          score,
          details: {
            exists: true,
            url: robotsUrl,
            hasUserAgent,
            hasSitemap,
            hasDirectives: hasDisallow || hasAllow,
            size: content.length
          },
          issues
        };
      } else {
        return {
          status: 'warning',
          score: 0,
          details: {
            exists: false,
            url: robotsUrl,
            statusCode: response.status
          },
          issues: ['robots.txt不存在或无法访问']
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: robotsUrl,
          error: error.message
        },
        issues: [`无法检查robots.txt: ${error.message}`]
      };
    }
  }

  /**
   * 检查站点地图
   */
  async checkSitemap(url) {
    const urlObj = new URL(url);
    const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;
    
    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        const content = response.data;
        const $ = cheerio.load(content, { xmlMode: true });
        
        const urls = $('url').length;
        const hasLastmod = $('lastmod').length > 0;
        const hasChangefreq = $('changefreq').length > 0;
        const hasPriority = $('priority').length > 0;
        
        let score = 50;
        const issues = [];
        
        if (urls === 0) {
          issues.push('sitemap.xml为空或格式错误');
          score = 0;
        } else {
          score += 30;
        }
        
        if (hasLastmod) {
          score += 10;
        } else {
          issues.push('sitemap缺少lastmod标签');
        }
        
        if (hasChangefreq) {
          score += 5;
        }
        
        if (hasPriority) {
          score += 5;
        }
        
        return {
          status: score >= 50 ? 'passed' : 'warning',
          score,
          details: {
            exists: true,
            url: sitemapUrl,
            urlCount: urls,
            hasLastmod,
            hasChangefreq,
            hasPriority
          },
          issues
        };
      } else {
        return {
          status: 'warning',
          score: 0,
          details: {
            exists: false,
            url: sitemapUrl,
            statusCode: response.status
          },
          issues: ['sitemap.xml不存在或无法访问']
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: sitemapUrl,
          error: error.message
        },
        issues: [`无法检查sitemap: ${error.message}`]
      };
    }
  }

  /**
   * 计算SEO总评分
   */
  calculateSeoScore(checks) {
    let totalScore = 0;
    let totalWeight = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    
    const weights = {
      meta: 30,
      headings: 20,
      images: 15,
      links: 10,
      structuredData: 10,
      robots: 5,
      sitemap: 10
    };
    
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;
        
        totalScore += (score * weight) / 100;
        totalWeight += weight;
        
        if (checkResult.status === 'passed') {
          passed++;
        } else if (checkResult.status === 'failed') {
          failed++;
        } else if (checkResult.status === 'warning') {
          warnings++;
        }
      }
    }
    
    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    
    return {
      totalChecks: Object.keys(checks).length,
      passed,
      failed,
      warnings,
      score: finalScore,
      grade: this.getGrade(finalScore),
      recommendations: this.generateRecommendations(checks)
    };
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(checks) {
    const recommendations = [];
    
    // 收集所有issues
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && checkResult.issues && checkResult.issues.length > 0) {
        recommendations.push({
          category: checkName,
          priority: checkResult.status === 'failed' ? 'high' : 'medium',
          issues: checkResult.issues
        });
      }
    }
    
    // 按优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return recommendations;
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

  /**
   * 清理资源
   */
  async cleanup() {
    this.activeTests.clear();
    console.log('SEO测试引擎清理完成');
  }
}

module.exports = SeoTestEngine;
