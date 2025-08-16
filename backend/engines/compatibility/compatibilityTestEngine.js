/**
 * 浏览器兼容性测试工具
 * 真实实现跨浏览器、跨设备兼容性测试
 */

const { chromium, firefox, webkit } = require('playwright');
const Joi = require('joi');

class CompatibilityTestEngine {
  constructor() {
    this.name = 'compatibility';
    this.activeTests = new Map();
    this.defaultTimeout = 60000;

    // 支持的浏览器
    this.browsers = {
      chromium: { name: 'Chromium', engine: chromium },
      firefox: { name: 'Firefox', engine: firefox },
      webkit: { name: 'WebKit (Safari)', engine: webkit }
    };

    // 预定义设备
    this.devices = {
      desktop: { width: 1366, height: 768, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      mobile: { width: 375, height: 667, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
      tablet: { width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15' }
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browsers: Joi.array().items(
        Joi.string().valid('chromium', 'firefox', 'webkit')
      ).default(['chromium', 'firefox']),
      devices: Joi.array().items(
        Joi.string().valid('desktop', 'mobile', 'tablet')
      ).default(['desktop', 'mobile']),
      checks: Joi.array().items(
        Joi.string().valid('rendering', 'javascript', 'css', 'responsive', 'features')
      ).default(['rendering', 'javascript', 'css']),
      timeout: Joi.number().min(30000).max(300000).default(60000),
      screenshots: Joi.boolean().default(false),
      waitForSelector: Joi.string().optional()
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
      // 测试Playwright浏览器是否可用
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('data:text/html,<h1>Test</h1>');
      const title = await page.title();
      await browser.close();

      return {
        available: true,
        version: {
          playwright: require('playwright/package.json').version
        },
        supportedBrowsers: Object.keys(this.browsers),
        dependencies: ['playwright']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['playwright']
      };
    }
  }

  /**
   * 执行兼容性测试
   */
  async runCompatibilityTest(config) {
    const testId = `compat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '开始兼容性测试');

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        browsers: {},
        summary: {
          totalCombinations: 0,
          passedCombinations: 0,
          failedCombinations: 0,
          warningCombinations: 0,
          overallScore: 0
        }
      };

      const totalCombinations = validatedConfig.browsers.length * validatedConfig.devices.length;
      results.summary.totalCombinations = totalCombinations;

      let currentProgress = 5;
      const progressStep = 90 / totalCombinations;

      // 测试每个浏览器和设备组合
      for (const browserName of validatedConfig.browsers) {
        results.browsers[browserName] = {};

        for (const deviceName of validatedConfig.devices) {
          this.updateTestProgress(testId, currentProgress, `测试 ${browserName} - ${deviceName}`);

          const testResult = await this.testBrowserDeviceCombination(
            browserName,
            deviceName,
            validatedConfig
          );

          results.browsers[browserName][deviceName] = testResult;

          // 更新汇总统计
          switch (testResult.status) {
            case 'passed':
              results.summary.passedCombinations++;
              break;
            case 'warning':
              results.summary.warningCombinations++;
              break;
            case 'failed':
              results.summary.failedCombinations++;
              break;
          }

          currentProgress += progressStep;
        }
      }

      this.updateTestProgress(testId, 95, '计算兼容性评分');

      // 计算总体兼容性评分
      results.summary.overallScore = this.calculateCompatibilityScore(results.browsers);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '兼容性测试完成');

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
   * 测试浏览器设备组合
   */
  async testBrowserDeviceCombination(browserName, deviceName, config) {
    let browser = null;

    try {
      const browserEngine = this.browsers[browserName].engine;
      const device = this.devices[deviceName];

      // 启动浏览器
      browser = await browserEngine.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // 设置设备参数
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.setUserAgent(device.userAgent);

      const result = {
        browser: browserName,
        device: deviceName,
        status: 'passed',
        score: 100,
        checks: {},
        issues: [],
        metrics: {
          loadTime: 0,
          renderTime: 0,
          jsErrors: 0,
          cssErrors: 0
        }
      };

      const startTime = Date.now();

      // 加载页面
      await page.goto(config.url, {
        waitUntil: 'networkidle',
        timeout: config.timeout
      });

      result.metrics.loadTime = Date.now() - startTime;

      // 等待特定选择器（如果指定）
      if (config.waitForSelector) {
        try {
          await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
        } catch (error) {
          result.issues.push(`等待选择器失败: ${config.waitForSelector}`);
        }
      }

      // 执行各项兼容性检查
      for (const check of config.checks) {
        switch (check) {
          case 'rendering':
            result.checks.rendering = await this.checkRendering(page);
            break;
          case 'javascript':
            result.checks.javascript = await this.checkJavaScript(page);
            break;
          case 'css':
            result.checks.css = await this.checkCSS(page);
            break;
          case 'responsive':
            result.checks.responsive = await this.checkResponsive(page, device);
            break;
          case 'features':
            result.checks.features = await this.checkBrowserFeatures(page);
            break;
        }
      }

      // 截图（如果启用）
      if (config.screenshots) {
        try {
          result.screenshot = await page.screenshot({
            encoding: 'base64',
            fullPage: false
          });
        } catch (error) {
          result.issues.push(`截图失败: ${error.message}`);
        }
      }

      // 计算组合评分
      result.score = this.calculateCombinationScore(result.checks, result.issues);
      result.status = result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      return {
        browser: browserName,
        device: deviceName,
        status: 'failed',
        score: 0,
        error: error.message,
        checks: {},
        issues: [`测试失败: ${error.message}`],
        metrics: {}
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 检查页面渲染
   */
  async checkRendering(page) {
    try {
      const result = {
        viewport: await page.viewportSize(),
        title: await page.title(),
        bodyContent: false,
        images: { total: 0, loaded: 0 },
        score: 0,
        issues: []
      };

      // 检查页面是否有内容
      const bodyText = await page.textContent('body');
      result.bodyContent = bodyText && bodyText.trim().length > 0;

      if (!result.bodyContent) {
        result.issues.push('页面内容为空');
      }

      // 检查图片加载
      const images = await page.$$('img');
      result.images.total = images.length;

      for (const img of images) {
        const naturalWidth = await img.evaluate(el => el.naturalWidth);
        if (naturalWidth > 0) {
          result.images.loaded++;
        }
      }

      // 计算渲染评分
      let score = 100;

      if (!result.bodyContent) score -= 50;
      if (result.images.total > 0) {
        const imageLoadRate = result.images.loaded / result.images.total;
        score -= (1 - imageLoadRate) * 30;
      }

      result.score = Math.max(0, Math.round(score));

      return {
        status: result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed',
        score: result.score,
        details: result
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查JavaScript兼容性
   */
  async checkJavaScript(page) {
    try {
      const result = {
        errors: [],
        features: {},
        score: 100
      };

      // 监听JavaScript错误
      page.on('pageerror', (error) => {
        result.errors.push(error.message);
      });

      // 检查基本JavaScript功能
      const jsFeatures = await page.evaluate(() => {
        const features = {};

        // 检查ES6+特性
        try {
          features.arrow_functions = typeof (() => { }) === 'function';
          features.const_let = typeof const !== 'undefined';
          features.template_literals = `test` === 'test';
          features.promises = typeof Promise !== 'undefined';
          features.fetch = typeof fetch !== 'undefined';
        } catch (e) {
          features.error = e.message;
        }

        return features;
      });

      result.features = jsFeatures;

      // 根据错误数量和特性支持计算分数
      let score = 100;
      score -= result.errors.length * 10; // 每个错误扣10分

      const supportedFeatures = Object.values(jsFeatures).filter(Boolean).length;
      const totalFeatures = Object.keys(jsFeatures).length;
      const featureSupport = supportedFeatures / totalFeatures;
      score = Math.round(score * featureSupport);

      result.score = Math.max(0, score);

      return {
        status: result.score >= 80 ? 'passed' : result.score >= 60 ? 'warning' : 'failed',
        score: result.score,
        details: result
      };

    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算组合评分
   */
  calculateCombinationScore(checks, issues) {
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
   * 计算总体兼容性评分
   */
  calculateCompatibilityScore(browsers) {
    let totalScore = 0;
    let combinationCount = 0;

    Object.values(browsers).forEach(browserResults => {
      Object.values(browserResults).forEach(deviceResult => {
        totalScore += deviceResult.score;
        combinationCount++;
      });
    });

    return combinationCount > 0 ? Math.round(totalScore / combinationCount) : 0;
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

module.exports = CompatibilityTestEngine;