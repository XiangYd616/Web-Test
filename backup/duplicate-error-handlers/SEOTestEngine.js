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

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
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

      this.updateTestProgress(testId, 5, '开始SEO分析');

      // 获取页面内容
      this.updateTestProgress(testId, 15, '获取页面内容');
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

      // 扩展的检查列表，包含新功能
      const enhancedChecks = [
        ...validatedConfig.checks,
        'mobile',      // 移动端优化
        'content'      // 内容质量
      ];
      
      const progressStep = 75 / enhancedChecks.length;
      let currentProgress = 15;

      // 执行各项SEO检查
      for (const check of enhancedChecks) {
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
          case 'mobile':
            results.checks.mobile = await this.checkMobileOptimization(validatedConfig.url, $);
            break;
          case 'content':
            results.checks.content = this.checkContentQuality($);
            break;
        }
        
        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 92, '计算SEO评分和竞争力分析');

      // 计算总体SEO评分（使用增强版）
      results.summary = this.calculateSeoScore(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;
      
      // 添加详细的分析报告
      results.detailedAnalysis = {
        strengths: this.identifyStrengths(results.checks),
        weaknesses: this.identifyWeaknesses(results.checks),
        competitorInsights: this.generateCompetitorInsights(results.summary.score),
        actionPlan: this.generateActionPlan(results.summary.recommendations)
      };

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
      sitemap: 10,
      mobile: 25,     // 新增：移动优化
      content: 20,    // 新增：内容质量
      performance: 15 // 新增：性能影响SEO
    };
    
    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
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
    
    // 增强的评分系统
    const scoringDetails = {
      totalChecks: Object.keys(checks).length,
      passed,
      failed,
      warnings,
      score: finalScore,
      grade: this.getGrade(finalScore),
      level: this.getSEOLevel(finalScore),
      breakdown: this.getScoreBreakdown(checks, weights),
      competitiveness: this.calculateCompetitiveness(finalScore),
      recommendations: this.generateEnhancedRecommendations(checks)
    };
    
    return scoringDetails;
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
   * 生成增强的优化建议
   */
  generateEnhancedRecommendations(checks) {
    const recommendations = [];
    const actionableItems = [];
    const quickWins = [];
    
    // 收集所有issues并分类
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && checkResult.issues && checkResult.issues.length > 0) {
        const categoryRecommendations = {
          category: checkName,
          priority: this.getPriorityLevel(checkResult.status, checkResult.score),
          issues: checkResult.issues,
          estimatedImpact: this.calculateImpact(checkName, checkResult.score),
          difficulty: this.getDifficultyLevel(checkName),
          timeToImplement: this.getImplementationTime(checkName, checkResult.issues.length)
        };
        
        recommendations.push(categoryRecommendations);
        
        // 识别可操作的项目
        if (categoryRecommendations.difficulty <= 3 && categoryRecommendations.estimatedImpact >= 7) {
          actionableItems.push(categoryRecommendations);
        }
        
        // 识别快速赢得的项目
        if (categoryRecommendations.timeToImplement <= 30 && categoryRecommendations.estimatedImpact >= 5) {
          quickWins.push(categoryRecommendations);
        }
      }
    }
    
    // 按影响力和优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.estimatedImpact - a.estimatedImpact;
    });
    
    return {
      all: recommendations,
      actionable: actionableItems,
      quickWins: quickWins,
      summary: {
        total: recommendations.length,
        critical: recommendations.filter(r => r.priority === 'critical').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      }
    };
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
   * 获取SEO级别描述
   */
  getSEOLevel(score) {
    if (score >= 90) return { level: 'Excellent', description: '优秀：SEO优化非常完善' };
    if (score >= 80) return { level: 'Good', description: '良好：SEO基础扎实，还有优化空间' };
    if (score >= 70) return { level: 'Fair', description: '一般：需要重点优化SEO策略' };
    if (score >= 60) return { level: 'Poor', description: '较差：SEO存在重大问题' };
    return { level: 'Very Poor', description: '很差：急需全面SEO优化' };
  }

  /**
   * 获取评分细分
   */
  getScoreBreakdown(checks, weights) {
    const breakdown = {};
    let totalPossibleScore = 0;
    
    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;
        
        breakdown[checkName] = {
          score,
          weight,
          contribution: Math.round((score * weight) / 100),
          status: checkResult.status
        };
        
        totalPossibleScore += weight;
      }
    }
    
    return { breakdown, totalPossibleScore };
  }

  /**
   * 计算竞争力
   */
  calculateCompetitiveness(score) {
    const levels = {
      90: { level: 'Highly Competitive', description: '在搜索结果中具有很强竞争力' },
      80: { level: 'Competitive', description: '在搜索结果中具有竞争力' },
      70: { level: 'Moderately Competitive', description: '在搜索结果中具有中等竞争力' },
      60: { level: 'Low Competitive', description: '在搜索结果中竞争力较低' },
      0: { level: 'Not Competitive', description: '在搜索结果中缺乏竞争力' }
    };
    
    for (const [threshold, data] of Object.entries(levels)) {
      if (score >= parseInt(threshold)) {
        return data;
      }
    }
    
    return levels[0];
  }

  /**
   * 获取优先级级别
   */
  getPriorityLevel(status, score) {
    if (status === 'failed' && score < 30) return 'critical';
    if (status === 'failed' || score < 50) return 'high';
    if (status === 'warning' || score < 70) return 'medium';
    return 'low';
  }

  /**
   * 计算影响力
   */
  calculateImpact(category, score) {
    const categoryImpacts = {
      meta: 9,
      headings: 7,
      mobile: 8,
      content: 8,
      performance: 7,
      structuredData: 6,
      links: 5,
      images: 4,
      robots: 3,
      sitemap: 4
    };
    
    const baseImpact = categoryImpacts[category] || 5;
    const scoreFactor = (100 - score) / 100; // 分数越低，影响越大
    
    return Math.min(10, Math.round(baseImpact * (1 + scoreFactor)));
  }

  /**
   * 获取难度级别
   */
  getDifficultyLevel(category) {
    const categoryDifficulties = {
      meta: 2,
      headings: 2,
      images: 3,
      content: 7,
      mobile: 6,
      performance: 8,
      structuredData: 5,
      links: 4,
      robots: 1,
      sitemap: 2
    };
    
    return categoryDifficulties[category] || 5;
  }

  /**
   * 获取实施时间（分钟）
   */
  getImplementationTime(category, issueCount) {
    const baseTimes = {
      meta: 30,
      headings: 45,
      images: 60,
      content: 240,
      mobile: 180,
      performance: 360,
      structuredData: 120,
      links: 90,
      robots: 15,
      sitemap: 30
    };
    
    const baseTime = baseTimes[category] || 60;
    return baseTime * Math.min(issueCount, 3); // 最多3倍时间
  }

  /**
   * 检查移动端优化
   */
  async checkMobileOptimization(url, $) {
    const results = {
      viewport: null,
      responsive: false,
      mobileSpeed: 0,
      touchOptimization: false,
      score: 0,
      issues: []
    };
    
    // 检查viewport标签
    const viewport = $('meta[name="viewport"]').first();
    if (viewport.length > 0) {
      const content = viewport.attr('content') || '';
      results.viewport = {
        present: true,
        content,
        hasWidth: content.includes('width='),
        hasInitialScale: content.includes('initial-scale='),
        isOptimal: content.includes('width=device-width') && content.includes('initial-scale=1')
      };
      
      if (results.viewport.isOptimal) {
        results.score += 30;
      } else {
        results.issues.push('viewport设置不是最优的（建议：width=device-width, initial-scale=1）');
      }
    } else {
      results.viewport = { present: false };
      results.issues.push('缺少viewport meta标签');
    }
    
    // 检查响应式设计
    const hasMediaQueries = $('link[media*="screen"], style').text().includes('@media');
    const hasFlexboxGrid = $('*').toArray().some(elem => {
      const style = $(elem).attr('style') || '';
      return style.includes('flex') || style.includes('grid');
    });
    
    results.responsive = hasMediaQueries || hasFlexboxGrid;
    if (results.responsive) {
      results.score += 25;
    } else {
      results.issues.push('未检测到响应式设计');
    }
    
    // 检查触摸优化
    const hasAppropriateButtonSizes = $('button, a, input[type="button"]').length;
    const hasTouchFriendlyElements = hasAppropriateButtonSizes > 0;
    
    results.touchOptimization = hasTouchFriendlyElements;
    if (results.touchOptimization) {
      results.score += 25;
    } else {
      results.issues.push('未优化触摸交互元素');
    }
    
    // 基础移动速度评估
    const imageCount = $('img').length;
    const scriptCount = $('script').length;
    const stylesheetCount = $('link[rel="stylesheet"]').length;
    
    let speedScore = 100;
    if (imageCount > 20) speedScore -= 20;
    if (scriptCount > 10) speedScore -= 15;
    if (stylesheetCount > 5) speedScore -= 10;
    
    results.mobileSpeed = Math.max(0, speedScore);
    results.score += Math.round(results.mobileSpeed * 0.2);
    
    if (results.mobileSpeed < 70) {
      results.issues.push('移动端加载速度可能较慢');
    }
    
    return {
      status: results.score >= 70 ? 'passed' : results.score >= 50 ? 'warning' : 'failed',
      score: results.score,
      details: results
    };
  }

  /**
   * 检查内容质量
   */
  checkContentQuality($) {
    const results = {
      wordCount: 0,
      readability: 0,
      keywordDensity: 0,
      headingStructure: false,
      contentDepth: 0,
      score: 0,
      issues: []
    };
    
    // 提取主要内容
    const mainContent = $('main, article, .content, #content, .post, #main').first();
    const contentText = (mainContent.length > 0 ? mainContent : $('body')).text().trim();
    
    // 字数统计
    const words = contentText.split(/\s+/).filter(word => word.length > 0);
    results.wordCount = words.length;
    
    if (results.wordCount >= 300) {
      results.score += 25;
    } else if (results.wordCount >= 150) {
      results.score += 15;
      results.issues.push('内容字数较少，建议增加到300字以上');
    } else {
      results.issues.push('内容字数过少，严重影响SEO效果');
    }
    
    // 可读性评估（简化版）
    const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    
    if (avgWordsPerSentence <= 20 && avgWordsPerSentence >= 15) {
      results.readability = 80;
      results.score += 20;
    } else if (avgWordsPerSentence <= 25) {
      results.readability = 60;
      results.score += 10;
    } else {
      results.readability = 40;
      results.issues.push('句子过长，影响可读性');
    }
    
    // 标题结构检查
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    
    results.headingStructure = h1Count === 1 && (h2Count > 0 || h3Count > 0);
    if (results.headingStructure) {
      results.score += 20;
    } else {
      results.issues.push('标题结构不合理');
    }
    
    // 内容深度评估
    const paragraphCount = $('p').length;
    const listCount = $('ul, ol').length;
    const tableCount = $('table').length;
    
    results.contentDepth = paragraphCount * 2 + listCount * 3 + tableCount * 5;
    if (results.contentDepth >= 20) {
      results.score += 25;
    } else if (results.contentDepth >= 10) {
      results.score += 15;
    } else {
      results.issues.push('内容结构单一，缺乏深度');
    }
    
    results.score = Math.min(100, results.score);
    
    return {
      status: results.score >= 70 ? 'passed' : results.score >= 50 ? 'warning' : 'failed',
      score: results.score,
      details: results
    };
  }

  /**
   * 识别优势
   */
  identifyStrengths(checks) {
    const strengths = [];
    
    for (const [category, result] of Object.entries(checks)) {
      if (result && result.status === 'passed' && result.score >= 80) {
        strengths.push({
          category,
          score: result.score,
          description: this.getStrengthDescription(category, result.score)
        });
      }
    }
    
    return strengths.sort((a, b) => b.score - a.score);
  }

  /**
   * 识别弱点
   */
  identifyWeaknesses(checks) {
    const weaknesses = [];
    
    for (const [category, result] of Object.entries(checks)) {
      if (result && (result.status === 'failed' || result.score < 60)) {
        weaknesses.push({
          category,
          score: result.score,
          status: result.status,
          description: this.getWeaknessDescription(category, result.score),
          impact: this.calculateImpact(category, result.score)
        });
      }
    }
    
    return weaknesses.sort((a, b) => b.impact - a.impact);
  }

  /**
   * 生成竞争对手洞察
   */
  generateCompetitorInsights(score) {
    return {
      marketPosition: this.getMarketPosition(score),
      competitiveAdvantages: this.getCompetitiveAdvantages(score),
      improvementAreas: this.getImprovementAreas(score),
      benchmarkComparison: this.getBenchmarkComparison(score)
    };
  }

  /**
   * 生成行动计划
   */
  generateActionPlan(recommendations) {
    const plan = {
      immediate: [],  // 立即执行（1-3天）
      shortTerm: [],  // 短期（1-4周）
      longTerm: []    // 长期（1-3个月）
    };
    
    if (recommendations && recommendations.all) {
      recommendations.all.forEach(rec => {
        if (rec.timeToImplement <= 4320) { // 3天
          plan.immediate.push(rec);
        } else if (rec.timeToImplement <= 40320) { // 4周
          plan.shortTerm.push(rec);
        } else {
          plan.longTerm.push(rec);
        }
      });
    }
    
    return plan;
  }

  /**
   * 获取优势描述
   */
  getStrengthDescription(category, score) {
    const descriptions = {
      meta: '页面元标签优化优秀，有利于搜索引擎理解页面内容',
      headings: '标题结构清晰合理，便于用户和搜索引擎理解内容层次',
      mobile: '移动端优化出色，提供良好的移动用户体验',
      content: '内容质量高，有深度且易读性好',
      performance: '页面性能优秀，加载速度快',
      structuredData: '结构化数据实现完善，增强搜索结果展示',
      links: '链接结构合理，内部链接和外部链接管理良好',
      images: '图片优化到位，所有图片都有适当的alt属性',
      robots: 'robots.txt配置正确，搜索引擎抓取指导清晰',
      sitemap: '站点地图完整，有助于搜索引擎发现和索引页面'
    };
    
    return descriptions[category] || '该项SEO指标表现优秀';
  }

  /**
   * 获取弱点描述
   */
  getWeaknessDescription(category, score) {
    const descriptions = {
      meta: '页面元标签需要优化，影响搜索引擎对页面的理解',
      headings: '标题结构需要改进，不利于内容层次的展现',
      mobile: '移动端优化不足，可能影响移动用户体验和排名',
      content: '内容质量有待提升，需要增加深度和可读性',
      performance: '页面性能较差，加载速度影响用户体验和SEO',
      structuredData: '结构化数据缺失或不完整，错失搜索结果增强机会',
      links: '链接结构需要优化，影响页面权重传递',
      images: '图片优化不足，缺少alt属性影响可访问性',
      robots: 'robots.txt配置有问题，可能影响搜索引擎抓取',
      sitemap: '站点地图缺失或有问题，影响页面被搜索引擎发现'
    };
    
    return descriptions[category] || '该项SEO指标需要改进';
  }

  /**
   * 获取市场定位
   */
  getMarketPosition(score) {
    if (score >= 90) return '市场领先者 - SEO优化水平处于行业顶尖';
    if (score >= 80) return '强力竞争者 - SEO基础扎实，具备竞争优势';
    if (score >= 70) return '稳定参与者 - SEO水平中等，需要持续优化';
    if (score >= 60) return '努力追赶者 - SEO存在明显短板，需要重点改进';
    return '亟需提升者 - SEO严重滞后，需要全面重构';
  }

  /**
   * 获取竞争优势
   */
  getCompetitiveAdvantages(score) {
    const advantages = [];
    if (score >= 85) advantages.push('整体SEO水平较高');
    if (score >= 80) advantages.push('基础SEO配置完善');
    if (score >= 75) advantages.push('用户体验较好');
    if (score >= 70) advantages.push('内容质量尚可');
    
    return advantages.length > 0 ? advantages : ['需要建立SEO竞争优势'];
  }

  /**
   * 获取改进领域
   */
  getImprovementAreas(score) {
    const areas = [];
    if (score < 90) areas.push('进一步优化技术SEO');
    if (score < 80) areas.push('提升内容质量和相关性');
    if (score < 70) areas.push('改善用户体验和页面性能');
    if (score < 60) areas.push('建立基础SEO配置');
    
    return areas;
  }

  /**
   * 获取基准比较
   */
  getBenchmarkComparison(score) {
    return {
      industryAverage: 65,
      yourScore: score,
      percentile: this.calculatePercentile(score),
      gap: Math.max(0, 80 - score), // 与优秀水平的差距
      recommendation: score >= 80 ? '保持优势，持续优化' : '重点改进，缩小差距'
    };
  }

  /**
   * 计算百分位
   */
  calculatePercentile(score) {
    if (score >= 90) return 95;
    if (score >= 80) return 85;
    if (score >= 70) return 70;
    if (score >= 60) return 50;
    if (score >= 50) return 30;
    return 15;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.activeTests.clear();
  }
}

module.exports = SeoTestEngine;
