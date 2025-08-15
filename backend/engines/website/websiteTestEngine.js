/**
 * 网站综合测试工具
 * 真实实现网站整体健康检查、最佳实践分析
 */

const cheerio = require('cheerio');
const axios = require('axios');
const { URL } = require('url');
const Joi = require('joi');

class WebsiteTestEngine {
  constructor() {
    this.name = 'website';
    this.activeTests = new Map();
    this.defaultTimeout = 60000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      checks: Joi.array().items(
        Joi.string().valid('health', 'seo', 'performance', 'security', 'accessibility', 'best-practices')
      ).default(['health', 'seo', 'performance', 'security']),
      timeout: Joi.number().min(30000).max(300000).default(60000),
      depth: Joi.number().min(1).max(5).default(1), // 检查深度（页面层级）
      maxPages: Joi.number().min(1).max(50).default(10), // 最大检查页面数
      followExternalLinks: Joi.boolean().default(false),
      userAgent: Joi.string().default('Mozilla/5.0 (compatible; WebsiteTestEngine/1.0)')
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
   * 执行网站综合测试
   */
  async runWebsiteTest(config) {
    const testId = `website_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '开始网站综合测试');

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        pages: {},
        summary: {
          totalPages: 0,
          healthyPages: 0,
          warningPages: 0,
          errorPages: 0,
          overallScore: 0,
          categories: {}
        },
        recommendations: []
      };

      // 发现页面
      this.updateTestProgress(testId, 10, '发现网站页面');
      const discoveredPages = await this.discoverPages(validatedConfig);
      results.summary.totalPages = discoveredPages.length;

      this.updateTestProgress(testId, 20, `发现 ${discoveredPages.length} 个页面`);

      const progressStep = 70 / discoveredPages.length;
      let currentProgress = 20;

      // 测试每个页面
      for (const pageUrl of discoveredPages) {
        this.updateTestProgress(testId, currentProgress, `测试页面: ${pageUrl}`);

        const pageResult = await this.testSinglePage(pageUrl, validatedConfig);
        results.pages[pageUrl] = pageResult;

        // 更新汇总统计
        switch (pageResult.status) {
          case 'healthy':
            results.summary.healthyPages++;
            break;
          case 'warning':
            results.summary.warningPages++;
            break;
          case 'error':
            results.summary.errorPages++;
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算综合评分');

      // 计算总体评分和建议
      results.summary = this.calculateWebsiteSummary(results.pages, validatedConfig.checks);
      results.recommendations = this.generateRecommendations(results.pages);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '网站综合测试完成');

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
   * 发现网站页面
   */
  async discoverPages(config) {
    const pages = new Set([config.url]);
    const visited = new Set();
    const toVisit = [config.url];

    const baseUrl = new URL(config.url);

    while (toVisit.length > 0 && pages.size < config.maxPages) {
      const currentUrl = toVisit.shift();

      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const response = await axios.get(currentUrl, {
          timeout: config.timeout,
          headers: { 'User-Agent': config.userAgent }
        });

        const $ = cheerio.load(response.data);

        // 提取链接
        $('a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (!href) return;

          try {
            const linkUrl = new URL(href, currentUrl);

            // 只处理同域名链接（除非允许外部链接）
            if (!config.followExternalLinks && linkUrl.hostname !== baseUrl.hostname) {
              return;
            }

            // 过滤掉锚点、邮件、电话等链接
            if (linkUrl.protocol === 'http:' || linkUrl.protocol === 'https:') {
              const fullUrl = linkUrl.toString();

              if (!pages.has(fullUrl) && pages.size < config.maxPages) {
                pages.add(fullUrl);

                // 如果还在深度范围内，添加到待访问列表
                if (this.getUrlDepth(fullUrl, config.url) <= config.depth) {
                  toVisit.push(fullUrl);
                }
              }
            }
          } catch (error) {
            // 忽略无效URL
          }
        });

      } catch (error) {
        // 忽略无法访问的页面
      }
    }

    return Array.from(pages);
  }

  /**
   * 计算URL深度
   */
  getUrlDepth(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(baseUrl);

      const urlPath = urlObj.pathname.split('/').filter(p => p);
      const basePath = baseUrlObj.pathname.split('/').filter(p => p);

      return Math.max(0, urlPath.length - basePath.length);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 测试单个页面
   */
  async testSinglePage(url, config) {
    try {
      const startTime = Date.now();

      const response = await axios.get(url, {
        timeout: config.timeout,
        headers: { 'User-Agent': config.userAgent },
        validateStatus: () => true // 接受所有状态码
      });

      const loadTime = Date.now() - startTime;
      const $ = cheerio.load(response.data);

      const result = {
        url,
        status: 'healthy',
        statusCode: response.status,
        loadTime,
        checks: {},
        issues: [],
        score: 100
      };

      // 基本健康检查
      if (response.status >= 400) {
        result.issues.push(`HTTP错误: ${response.status}`);
        result.score -= 30;
      }

      if (loadTime > 5000) {
        result.issues.push('页面加载时间过长');
        result.score -= 20;
      }

      // 执行各项检查
      for (const check of config.checks) {
        switch (check) {
          case 'health':
            result.checks.health = this.checkPageHealth($, response);
            break;
          case 'seo':
            result.checks.seo = this.checkPageSEO($);
            break;
          case 'performance':
            result.checks.performance = this.checkPagePerformance($, response, loadTime);
            break;
          case 'security':
            result.checks.security = this.checkPageSecurity(response);
            break;
          case 'accessibility':
            result.checks.accessibility = this.checkPageAccessibility($);
            break;
          case 'best-practices':
            result.checks.bestPractices = this.checkBestPractices($, response);
            break;
        }
      }

      // 计算页面总分
      result.score = this.calculatePageScore(result.checks, result.issues);
      result.status = result.score >= 80 ? 'healthy' : result.score >= 60 ? 'warning' : 'error';

      return result;

    } catch (error) {
      return {
        url,
        status: 'error',
        statusCode: 0,
        loadTime: 0,
        checks: {},
        issues: [`页面测试失败: ${error.message}`],
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * 检查页面健康状况
   */
  checkPageHealth($, response) {
    const result = {
      title: $('title').text().trim(),
      hasContent: $('body').text().trim().length > 0,
      images: { total: 0, withAlt: 0 },
      links: { total: 0, broken: 0 },
      score: 100,
      issues: []
    };

    // 检查标题
    if (!result.title) {
      result.issues.push('缺少页面标题');
      result.score -= 20;
    }

    // 检查内容
    if (!result.hasContent) {
      result.issues.push('页面内容为空');
      result.score -= 30;
    }

    // 检查图片
    $('img').each((i, elem) => {
      result.images.total++;
      if ($(elem).attr('alt')) {
        result.images.withAlt++;
      }
    });

    if (result.images.total > 0) {
      const altCoverage = result.images.withAlt / result.images.total;
      if (altCoverage < 0.8) {
        result.issues.push('部分图片缺少alt属性');
        result.score -= 10;
      }
    }

    return {
      status: result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed',
      score: result.score,
      details: result
    };
  }

  /**
   * 计算页面评分
   */
  calculatePageScore(checks, issues) {
    if (Object.keys(checks).length === 0) return 0;

    let totalScore = 0;
    let checkCount = 0;

    Object.values(checks).forEach(check => {
      totalScore += check.score;
      checkCount++;
    });

    let averageScore = checkCount > 0 ? totalScore / checkCount : 0;

    // 根据问题数量调整分数
    averageScore -= issues.length * 5;

    return Math.max(0, Math.round(averageScore));
  }

  /**
   * 计算网站综合评分
   */
  calculateWebsiteSummary(pages, checks) {
    const pageResults = Object.values(pages);
    const totalPages = pageResults.length;

    if (totalPages === 0) {
      return {
        totalPages: 0,
        healthyPages: 0,
        warningPages: 0,
        errorPages: 0,
        overallScore: 0,
        categories: {}
      };
    }

    let totalScore = 0;
    let healthyPages = 0;
    let warningPages = 0;
    let errorPages = 0;

    const categoryScores = {};

    // 初始化分类分数
    checks.forEach(check => {
      categoryScores[check] = { total: 0, count: 0 };
    });

    pageResults.forEach(page => {
      totalScore += page.score;

      switch (page.status) {
        case 'healthy':
          healthyPages++;
          break;
        case 'warning':
          warningPages++;
          break;
        case 'error':
          errorPages++;
          break;
      }

      // 累计分类分数
      Object.keys(page.checks).forEach(checkName => {
        if (categoryScores[checkName]) {
          categoryScores[checkName].total += page.checks[checkName].score;
          categoryScores[checkName].count++;
        }
      });
    });

    // 计算分类平均分
    const categories = {};
    Object.keys(categoryScores).forEach(category => {
      const data = categoryScores[category];
      categories[category] = data.count > 0 ? Math.round(data.total / data.count) : 0;
    });

    return {
      totalPages,
      healthyPages,
      warningPages,
      errorPages,
      overallScore: Math.round(totalScore / totalPages),
      categories
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(pages) {
    const recommendations = [];
    const pageResults = Object.values(pages);

    // 分析常见问题
    const commonIssues = {};

    pageResults.forEach(page => {
      page.issues.forEach(issue => {
        commonIssues[issue] = (commonIssues[issue] || 0) + 1;
      });
    });

    // 生成基于频率的建议
    Object.entries(commonIssues).forEach(([issue, count]) => {
      if (count > pageResults.length * 0.3) { // 超过30%的页面有此问题
        recommendations.push({
          priority: 'high',
          category: 'common_issue',
          description: `${count}个页面存在问题: ${issue}`,
          suggestion: this.getIssueSuggestion(issue)
        });
      }
    });

    return recommendations;
  }

  /**
   * 获取问题建议
   */
  getIssueSuggestion(issue) {
    const suggestions = {
      '缺少页面标题': '为每个页面添加描述性的title标签',
      '页面内容为空': '确保页面包含有意义的内容',
      '部分图片缺少alt属性': '为所有图片添加描述性的alt属性',
      '页面加载时间过长': '优化图片、压缩资源、使用CDN加速',
      'HTTP错误': '修复服务器错误，确保页面正常访问'
    };

    return suggestions[issue] || '请检查并修复此问题';
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
      console.log(`[${this.name.toUpperCase()}-${testId}] ${progress}% - ${message}`);
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

module.exports = WebsiteTestEngine;