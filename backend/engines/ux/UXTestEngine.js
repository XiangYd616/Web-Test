/**
 * 用户体验测试工具
 * 真实实现可访问性审计、可用性测试、交互测试
 */

const puppeteer = require('puppeteer');
const Joi = require('joi');

class UxTestEngine {
  constructor() {
    this.name = 'ux';
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
        Joi.string().valid('accessibility', 'usability', 'interactions', 'mobile', 'forms')
      ).default(['accessibility', 'usability', 'interactions']),
      timeout: Joi.number().min(30000).max(300000).default(60000),
      device: Joi.string().valid('desktop', 'mobile', 'tablet').default('desktop'),
      viewport: Joi.object({
        width: Joi.number().min(320).max(1920).default(1366),
        height: Joi.number().min(240).max(1080).default(768)
      }).default({ width: 1366, height: 768 }),
      waitForSelector: Joi.string().optional(),
      interactions: Joi.array().items(Joi.object({
        type: Joi.string().valid('click', 'type', 'scroll', 'hover').required(),
        selector: Joi.string().required(),
        value: Joi.string().optional()
      })).default([])
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
      // 测试Puppeteer是否可用
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>');
      const title = await page.title();

      await browser.close();

      return {
        available: true,
        version: {
          puppeteer: require('puppeteer/package.json').version,
          chromium: await this.getChromiumVersion()
        },
        dependencies: ['puppeteer']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['puppeteer']
      };
    }
  }

  /**
   * 获取Chromium版本
   */
  async getChromiumVersion() {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const version = await browser.version();
      await browser.close();
      return version;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 执行UX测试
   */
  async runUxTest(config) {
    const testId = `ux_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    let browser = null;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '启动浏览器');

      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();

      // 设置视口
      await page.setViewport(validatedConfig.viewport);

      this.updateTestProgress(testId, 10, '加载页面');

      // 加载页面
      await page.goto(validatedConfig.url, {
        waitUntil: 'networkidle2',
        timeout: validatedConfig.timeout
      });

      // 等待特定选择器（如果指定）
      if (validatedConfig.waitForSelector) {
        await page.waitForSelector(validatedConfig.waitForSelector, {
          timeout: 10000
        });
      }

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

      const progressStep = 80 / validatedConfig.checks.length;
      let currentProgress = 10;

      // 执行各项UX检查
      for (const check of validatedConfig.checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

        switch (check) {
          case 'accessibility':
            results.checks.accessibility = await this.checkAccessibility(page);
            break;
          case 'usability':
            results.checks.usability = await this.checkUsability(page);
            break;
          case 'interactions':
            results.checks.interactions = await this.checkInteractions(page, validatedConfig.interactions);
            break;
          case 'mobile':
            results.checks.mobile = await this.checkMobileUsability(page);
            break;
          case 'forms':
            results.checks.forms = await this.checkForms(page);
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算UX评分');

      // 计算总体UX评分
      results.summary = this.calculateUxScore(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, 'UX测试完成');

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
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 检查可访问性
   */
  async checkAccessibility(page) {
    try {
      // 基础可访问性检查
      const results = {
        images: { total: 0, withAlt: 0, withoutAlt: 0 },
        headings: { total: 0, structure: [] },
        links: { total: 0, withText: 0, withoutText: 0 },
        forms: { total: 0, withLabels: 0, withoutLabels: 0 },
        contrast: { issues: [] },
        score: 0,
        issues: []
      };

      // 检查图片alt属性
      const images = await page.$$('img');
      results.images.total = images.length;

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        if (alt && alt.trim()) {
          results.images.withAlt++;
        } else {
          results.images.withoutAlt++;
          results.issues.push('图片缺少alt属性');
        }
      }

      // 检查标题结构
      const headings = await page.$$('h1, h2, h3, h4, h5, h6');
      results.headings.total = headings.length;

      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const text = await heading.evaluate(el => el.textContent.trim());
        results.headings.structure.push({ tag: tagName, text });
      }

      // 检查链接文本
      const links = await page.$$('a');
      results.links.total = links.length;

      for (const link of links) {
        const text = await link.evaluate(el => el.textContent.trim());
        const ariaLabel = await link.getAttribute('aria-label');

        if (text || ariaLabel) {
          results.links.withText++;
        } else {
          results.links.withoutText++;
          results.issues.push('链接缺少描述文本');
        }
      }

      // 检查表单标签
      const inputs = await page.$$('input, textarea, select');
      results.forms.total = inputs.length;

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');

        let hasLabel = false;
        if (id) {
          const label = await page.$(`label[for="${id}"]`);
          hasLabel = !!label;
        }

        if (hasLabel || ariaLabel) {
          results.forms.withLabels++;
        } else {
          results.forms.withoutLabels++;
          results.issues.push('表单元素缺少标签');
        }
      }

      // 计算可访问性分数
      let score = 100;

      if (results.images.total > 0) {
        const altCoverage = (results.images.withAlt / results.images.total) * 100;
        score -= Math.max(0, (100 - altCoverage) * 0.3);
      }

      if (results.links.total > 0) {
        const linkTextCoverage = (results.links.withText / results.links.total) * 100;
        score -= Math.max(0, (100 - linkTextCoverage) * 0.2);
      }

      if (results.forms.total > 0) {
        const labelCoverage = (results.forms.withLabels / results.forms.total) * 100;
        score -= Math.max(0, (100 - labelCoverage) * 0.3);
      }

      results.score = Math.max(0, Math.round(score));

      return {
        status: results.score >= 80 ? 'passed' : results.score >= 60 ? 'warning' : 'failed',
        message: `可访问性评分: ${results.score}%`,
        score: results.score,
        details: results
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `可访问性检查失败: ${error.message}`,
        score: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查可用性
   */
  async checkUsability(page) {
    try {
      const results = {
        pageLoad: 0,
        interactivity: 0,
        navigation: { hasMenu: false, hasBreadcrumb: false },
        search: { hasSearch: false },
        content: { hasHeadings: false, readability: 0 },
        score: 0,
        issues: []
      };

      // 检查页面加载时间
      const performanceTiming = JSON.parse(
        await page.evaluate(() => JSON.stringify(performance.timing))
      );

      results.pageLoad = performanceTiming.loadEventEnd - performanceTiming.navigationStart;

      // 检查导航元素
      const nav = await page.$('nav, .nav, .navigation, .menu');
      results.navigation.hasMenu = !!nav;

      const breadcrumb = await page.$('.breadcrumb, .breadcrumbs, nav[aria-label*="breadcrumb"]');
      results.navigation.hasBreadcrumb = !!breadcrumb;

      // 检查搜索功能
      const searchInput = await page.$('input[type="search"], input[name*="search"], .search input');
      results.search.hasSearch = !!searchInput;

      // 检查内容结构
      const headings = await page.$$('h1, h2, h3, h4, h5, h6');
      results.content.hasHeadings = headings.length > 0;

      // 计算可用性分数
      let score = 0;

      // 页面加载时间评分
      if (results.pageLoad < 3000) score += 25;
      else if (results.pageLoad < 5000) score += 15;
      else score += 5;

      // 导航评分
      if (results.navigation.hasMenu) score += 25;
      if (results.navigation.hasBreadcrumb) score += 10;

      // 搜索功能评分
      if (results.search.hasSearch) score += 15;

      // 内容结构评分
      if (results.content.hasHeadings) score += 25;

      results.score = score;

      return {
        status: results.score >= 70 ? 'passed' : results.score >= 50 ? 'warning' : 'failed',
        message: `可用性评分: ${results.score}%`,
        score: results.score,
        details: results
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `可用性检查失败: ${error.message}`,
        score: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查交互功能
   */
  async checkInteractions(page, interactions) {
    try {
      const results = {
        totalInteractions: interactions.length,
        successfulInteractions: 0,
        failedInteractions: 0,
        interactions: [],
        score: 0
      };

      for (const interaction of interactions) {
        const interactionResult = {
          type: interaction.type,
          selector: interaction.selector,
          success: false,
          error: null,
          responseTime: 0
        };

        const startTime = Date.now();

        try {
          switch (interaction.type) {
            case 'click':
              await page.click(interaction.selector);
              break;
            case 'type':
              await page.type(interaction.selector, interaction.value || 'test');
              break;
            case 'scroll':
              await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) element.scrollIntoView();
              }, interaction.selector);
              break;
            case 'hover':
              await page.hover(interaction.selector);
              break;
          }

          interactionResult.success = true;
          results.successfulInteractions++;

        } catch (error) {
          interactionResult.error = error.message;
          results.failedInteractions++;
        }

        interactionResult.responseTime = Date.now() - startTime;
        results.interactions.push(interactionResult);
      }

      // 计算交互评分
      results.score = results.totalInteractions > 0
        ? Math.round((results.successfulInteractions / results.totalInteractions) * 100)
        : 100;

      return {
        status: results.score >= 80 ? 'passed' : results.score >= 60 ? 'warning' : 'failed',
        message: `${results.successfulInteractions}/${results.totalInteractions} 交互成功`,
        score: results.score,
        details: results
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `交互检查失败: ${error.message}`,
        score: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算UX评分
   */
  calculateUxScore(checks) {
    let totalScore = 0;
    let totalChecks = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    Object.values(checks).forEach(check => {
      totalChecks++;
      totalScore += check.score;

      switch (check.status) {
        case 'passed':
          passed++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'failed':
          failed++;
          break;
      }
    });

    const averageScore = totalChecks > 0 ? Math.round(totalScore / totalChecks) : 0;

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      score: averageScore,
      status: averageScore >= 80 ? 'excellent' : averageScore >= 60 ? 'good' : 'needs_improvement'
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

module.exports = UxTestEngine;