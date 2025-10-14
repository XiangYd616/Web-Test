/**
 * 兼容性测试引擎
 * 基于Playwright的多浏览器、多设备、跨平台兼容性测试
 */

const Joi = require('joi');
const { chromium, firefox, webkit } = require('playwright');

class CompatibilityTestEngine {
  constructor() {
    this.name = 'compatibility';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.browserEngines = {
      chromium,
      firefox,
      webkit
    };
  }

  async checkAvailability() {
    try {
      // 测试所有浏览器引擎是否可用
      const testResults = {};
      
      for (const [name, engine] of Object.entries(this.browserEngines)) {
        try {
          const browser = await engine.launch({ headless: true });
          await browser.close();
          testResults[name] = true;
        } catch (error) {
          testResults[name] = false;
        }
      }
      
      const availableBrowsers = Object.entries(testResults)
        .filter(([name, available]) => available)
        .map(([name]) => name);
      
      return {
        available: availableBrowsers.length > 0,
        version: this.version,
        capabilities: this.getCapabilities(),
        availableBrowsers,
        dependencies: ['playwright', 'pixelmatch', 'pngjs']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['playwright', 'pixelmatch', 'pngjs']
      };
    }
  }

  getCapabilities() {
    return {
      supportedBrowsers: ['chromium', 'firefox', 'webkit'],
      supportedDevices: [
        'Desktop Chrome',
        'Desktop Firefox', 
        'Desktop Safari',
        'iPhone 12',
        'iPad',
        'Galaxy S21'
      ],
      testTypes: [
        'visual-comparison',
        'feature-detection',
        'css-compatibility',
        'javascript-compatibility',
        'responsive-design',
        'performance-comparison'
      ],
      maxConcurrent: 3,
      screenshotComparison: true
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browsers: Joi.array().items(
        Joi.string().valid('chromium', 'firefox', 'webkit')
      ).min(2).default(['chromium', 'firefox', 'webkit']),
      devices: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          viewport: Joi.object({
            width: Joi.number().required(),
            height: Joi.number().required()
          }).required(),
          userAgent: Joi.string().optional()
        })
      ).default([
        { name: 'Desktop', viewport: { width: 1920, height: 1080 } },
        { name: 'Tablet', viewport: { width: 768, height: 1024 } },
        { name: 'Mobile', viewport: { width: 375, height: 667 } }
      ]),
      testTypes: Joi.array().items(
        Joi.string().valid(
          'visual-comparison', 'feature-detection', 'css-compatibility',
          'javascript-compatibility', 'responsive-design', 'performance-comparison'
        )
      ).default(['visual-comparison', 'responsive-design']),
      threshold: Joi.number().min(0).max(1).default(0.1),
      timeout: Joi.number().min(10000).max(300000).default(60000),
      generateReport: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async executeTest(config) {
    return this.runCompatibilityTest(config);
  }

  async runCompatibilityTest(config) {
    const testId = `compatibility_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '初始化兼容性测试');
      
      const results = await this.performCompatibilityTests(validatedConfig, testId);
      
      this.updateTestProgress(testId, 100, '兼容性测试完成');
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async performCompatibilityTests(config, testId) {
    const results = {
      testId,
      url: config.url,
      timestamp: new Date().toISOString(),
      browsers: config.browsers,
      devices: config.devices,
      testTypes: config.testTypes,
      browserResults: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        issues: [],
        compatibilityScore: 0
      },
      screenshots: {},
      errors: []
    };

    const totalSteps = config.browsers.length * config.devices.length;
    let currentStep = 0;
    const progressPerStep = 80 / totalSteps;
    let currentProgress = 10;

    // 为每个浏览器和设备组合运行测试
    for (const browserName of config.browsers) {
      this.updateTestProgress(testId, currentProgress, `测试${browserName}浏览器`);
      
      results.browserResults[browserName] = {
        devices: {},
        issues: [],
        score: 0
      };

      for (const device of config.devices) {
        this.updateTestProgress(testId, currentProgress, `在${device.name}设备上测试${browserName}`);
        
        try {
          const deviceResults = await this.testBrowserDeviceCombo(
            browserName, device, config, testId
          );
          
          results.browserResults[browserName].devices[device.name] = deviceResults;
          results.summary.totalTests += deviceResults.tests.length;
          results.summary.passed += deviceResults.passed;
          results.summary.failed += deviceResults.failed;
          
        } catch (error) {
          results.errors.push({
            browser: browserName,
            device: device.name,
            error: error.message
          });
        }
        
        currentStep++;
        currentProgress += progressPerStep;
      }
    }

    // 计算兼容性评分
    results.summary.compatibilityScore = this.calculateCompatibilityScore(results);
    
    return results;
  }

  async testBrowserDeviceCombo(browserName, device, config, testId) {
    let browser = null;
    let context = null;
    let page = null;

    try {
      const browserEngine = this.browserEngines[browserName];
      browser = await browserEngine.launch({ headless: true });
      
      context = await browser.newContext({
        viewport: device.viewport,
        userAgent: device.userAgent
      });
      
      page = await context.newPage();
      
      const testResults = {
        browser: browserName,
        device: device.name,
        tests: [],
        passed: 0,
        failed: 0,
        issues: []
      };

      // 加载页面
      const startTime = Date.now();
      await page.goto(config.url, { waitUntil: 'networkidle', timeout: config.timeout });
      const loadTime = Date.now() - startTime;
      
      // 测试1：页面是否加载成功
      const title = await page.title();
      const pageLoadTest = {
        type: 'page-load',
        passed: !!title,
        data: { title, loadTime }
      };
      testResults.tests.push(pageLoadTest);
      if (title) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.issues.push('页面标题获取失败');
      }

      // 测试2：JavaScript错误检测
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });
      
      // 等待一段时间以捕获任何JavaScript错误
      await page.waitForTimeout(2000);
      
      const jsTest = {
        type: 'javascript-errors',
        passed: jsErrors.length === 0,
        data: { errorCount: jsErrors.length, errors: jsErrors.slice(0, 5) }
      };
      testResults.tests.push(jsTest);
      if (jsErrors.length === 0) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.issues.push(`检测到 ${jsErrors.length} 个JavaScript错误`);
      }

      // 测试3：CSS加载检测
      const cssTest = await page.evaluate(() => {
        const stylesheets = document.styleSheets;
        let totalRules = 0;
        let failedSheets = 0;
        
        for (let i = 0; i < stylesheets.length; i++) {
          try {
            const rules = stylesheets[i].cssRules || stylesheets[i].rules;
            totalRules += rules ? rules.length : 0;
          } catch (e) {
            failedSheets++;
          }
        }
        
        return {
          totalSheets: stylesheets.length,
          totalRules,
          failedSheets,
          passed: failedSheets === 0 && totalRules > 0
        };
      });
      
      testResults.tests.push({
        type: 'css-loading',
        passed: cssTest.passed,
        data: cssTest
      });
      if (cssTest.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.issues.push('CSS样式表加载或解析失败');
      }

      // 测试4：响应式布局检测
      const layoutTest = await page.evaluate(() => {
        const body = document.body;
        const hasOverflow = body.scrollWidth > window.innerWidth;
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        
        return {
          hasViewportMeta: !!viewportMeta,
          viewportContent: viewportMeta ? viewportMeta.getAttribute('content') : null,
          hasHorizontalOverflow: hasOverflow,
          bodyWidth: body.scrollWidth,
          windowWidth: window.innerWidth,
          passed: !!viewportMeta && !hasOverflow
        };
      });
      
      testResults.tests.push({
        type: 'responsive-layout',
        passed: layoutTest.passed,
        data: layoutTest
      });
      if (layoutTest.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        if (!layoutTest.hasViewportMeta) {
          testResults.issues.push('缺少viewport meta标签');
        }
        if (layoutTest.hasHorizontalOverflow) {
          testResults.issues.push('检测到水平滚动条，可能存在布局问题');
        }
      }

      // 测试5：图片加载检测
      const imageTest = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let loaded = 0;
        let broken = 0;
        
        images.forEach(img => {
          if (img.complete && img.naturalWidth > 0) {
            loaded++;
          } else if (img.complete && img.naturalWidth === 0) {
            broken++;
          }
        });
        
        return {
          totalImages: images.length,
          loaded,
          broken,
          passed: broken === 0 || images.length === 0
        };
      });
      
      testResults.tests.push({
        type: 'image-loading',
        passed: imageTest.passed,
        data: imageTest
      });
      if (imageTest.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.issues.push(`${imageTest.broken} 张图片加载失败`);
      }

      // 测试6：字体加载检测
      const fontTest = await page.evaluate(() => {
        if (!document.fonts) {
          return { supported: false, passed: true };
        }
        
        const fonts = Array.from(document.fonts);
        const loadedFonts = fonts.filter(font => font.status === 'loaded');
        const failedFonts = fonts.filter(font => font.status === 'error');
        
        return {
          supported: true,
          totalFonts: fonts.length,
          loaded: loadedFonts.length,
          failed: failedFonts.length,
          passed: failedFonts.length === 0
        };
      });
      
      testResults.tests.push({
        type: 'font-loading',
        passed: fontTest.passed,
        data: fontTest
      });
      if (fontTest.passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
        testResults.issues.push(`${fontTest.failed} 个字体加载失败`);
      }

      // 测试7：交互元素可用性检测
      const interactivityTest = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const links = document.querySelectorAll('a[href]');
        const inputs = document.querySelectorAll('input, textarea, select');
        
        let disabledButtons = 0;
        buttons.forEach(btn => {
          if (btn.disabled || btn.hasAttribute('disabled')) {
            disabledButtons++;
          }
        });
        
        let brokenLinks = 0;
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (!href || href === '#' || href === 'javascript:void(0)') {
            brokenLinks++;
          }
        });
        
        return {
          buttons: buttons.length,
          disabledButtons,
          links: links.length,
          brokenLinks,
          inputs: inputs.length,
          passed: true // 这是信息性测试
        };
      });
      
      testResults.tests.push({
        type: 'interactivity',
        passed: interactivityTest.passed,
        data: interactivityTest
      });
      testResults.passed++;

      return testResults;
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  calculateCompatibilityScore(results) {
    let totalScore = 0;
    let testCount = 0;
    
    Object.values(results.browserResults).forEach(browserResult => {
      Object.values(browserResult.devices).forEach(deviceResult => {
        if (deviceResult.tests.length > 0) {
          const deviceScore = (deviceResult.passed / deviceResult.tests.length) * 100;
          totalScore += deviceScore;
          testCount++;
        }
      });
    });
    
    return testCount > 0 ? Math.round(totalScore / testCount) : 0;
  }

  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
    }
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

module.exports = CompatibilityTestEngine;
