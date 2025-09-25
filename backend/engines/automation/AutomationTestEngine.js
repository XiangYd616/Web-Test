/**
 * 自动化测试引擎
 * 基于Playwright的UI自动化测试和端到端测试
 */

const Joi = require('joi');
const { chromium, firefox, webkit } = require('playwright');

class AutomationTestEngine {
  constructor() {
    this.name = 'automation';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.browsers = new Map();
    this.supportedBrowsers = ['chromium', 'firefox', 'webkit'];
  }

  async checkAvailability() {
    try {
      // 测试Playwright是否可用
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      
      return {
        available: true,
        version: this.version,
        capabilities: this.getCapabilities(),
        dependencies: ['playwright', 'chromium', 'firefox', 'webkit']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['playwright']
      };
    }
  }

  getCapabilities() {
    return {
      supportedTests: [
        'page-load',
        'form-interaction',
        'navigation',
        'element-interaction',
        'screenshot-comparison',
        'performance-timing',
        'accessibility-scan',
        'responsive-design',
        'user-flow'
      ],
      supportedBrowsers: this.supportedBrowsers,
      maxConcurrent: 3,
      timeout: process.env.REQUEST_TIMEOUT || 300000,
      screenshots: true,
      videoRecording: true
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browser: Joi.string().valid('chromium', 'firefox', 'webkit').default('chromium'),
      headless: Joi.boolean().default(true),
      timeout: Joi.number().min(10000).max(300000).default(60000),
      viewport: Joi.object({
        width: Joi.number().default(1280),
        height: Joi.number().default(720)
      }).default({ width: 1280, height: 720 }),
      tests: Joi.array().items(
        Joi.object({
          type: Joi.string().valid(
            'page-load', 'form-interaction', 'navigation', 'element-interaction',
            'screenshot-comparison', 'performance-timing', 'accessibility-scan',
            'responsive-design', 'user-flow'
          ).required(),
          config: Joi.object().optional()
        })
      ).default([{ type: 'page-load' }]),
      screenshot: Joi.boolean().default(true),
      recordVideo: Joi.boolean().default(false),
      slowMo: Joi.number().min(0).max(5000).default(0)
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

  async runAutomationTest(config) {
    const testId = `automation_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '启动浏览器');
      
      const results = await this.performAutomationTests(validatedConfig, testId);
      
      this.updateTestProgress(testId, 100, '自动化测试完成');
      
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

  async performAutomationTests(config, testId) {
    let browser = null;
    let context = null;
    let page = null;

    try {
      this.updateTestProgress(testId, 20, `启动${config.browser}浏览器`);
      
      // 启动浏览器
      const browserType = config.browser === 'chromium' ? chromium : 
                         config.browser === 'firefox' ? firefox : webkit;
      
      browser = await browserType.launch({
        headless: config.headless,
        slowMo: config.slowMo
      });

      // 创建浏览器上下文
      context = await browser.newContext({
        viewport: config.viewport,
        recordVideo: config.recordVideo ? { dir: './test-videos/' } : undefined
      });

      page = await context.newPage();

      const results = {
        testId,
        url: config.url,
        browser: config.browser,
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
          total: config.tests.length,
          passed: 0,
          failed: 0,
          duration: 0
        },
        screenshots: [],
        performance: {},
        errors: []
      };

      const startTime = Date.now();
      const progressStep = 70 / config.tests.length;
      let currentProgress = 30;

      // 执行各项测试
      for (const test of config.tests) {
        this.updateTestProgress(testId, currentProgress, `执行${test.type}测试`);
        
        try {
          const testResult = await this.runSingleTest(page, test, config, results);
          results.tests.push(testResult);
          
          if (testResult.passed) {
            results.summary.passed++;
          } else {
            results.summary.failed++;
          }
        } catch (error) {
          results.tests.push({
            type: test.type,
            passed: false,
            error: error.message,
            duration: 0
          });
          results.summary.failed++;
          results.errors.push({
            test: test.type,
            error: error.message
          });
        }
        
        currentProgress += progressStep;
      }

      results.summary.duration = Date.now() - startTime;

      // 截图（如果启用）
      if (config.screenshot) {
        this.updateTestProgress(testId, 90, '生成截图');
        const screenshot = await page.screenshot({ 
          path: `./screenshots/automation-${testId}.png`,
          fullPage: true 
        });
        results.screenshots.push({
          type: 'final',
          path: `./screenshots/automation-${testId}.png`,
          timestamp: new Date().toISOString()
        });
      }

      return results;

    } finally {
      // 清理资源
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  async runSingleTest(page, test, config, results) {
    const startTime = Date.now();
    
    try {
      switch (test.type) {
        case 'page-load':
          return await this.testPageLoad(page, config.url, test.config);
        case 'form-interaction':
          return await this.testFormInteraction(page, test.config);
        case 'navigation':
          return await this.testNavigation(page, test.config);
        case 'element-interaction':
          return await this.testElementInteraction(page, test.config);
        case 'screenshot-comparison':
          return await this.testScreenshotComparison(page, test.config);
        case 'performance-timing':
          return await this.testPerformanceTiming(page, config.url, test.config);
        case 'accessibility-scan':
          return await this.testAccessibilityScan(page, test.config);
        case 'responsive-design':
          return await this.testResponsiveDesign(page, test.config);
        case 'user-flow':
          return await this.testUserFlow(page, test.config);
        default:
          throw new Error(`不支持的测试类型: ${test.type}`);
      }
    } catch (error) {
      return {
        type: test.type,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async testPageLoad(page, url, config = {}) {
    const startTime = Date.now();
    
    try {
      await page.goto(url, { 
        waitUntil: config.waitUntil || 'networkidle',
        timeout: config.timeout || 30000 
      });
      
      // 检查页面标题
      const title = await page.title();
      const loadTime = Date.now() - startTime;
      
      return {
        type: 'page-load',
        passed: title.length > 0,
        duration: loadTime,
        data: {
          title,
          url: page.url(),
          loadTime
        }
      };
    } catch (error) {
      throw new Error(`页面加载失败: ${error.message}`);
    }
  }

  async testFormInteraction(page, config = {}) {
    const startTime = Date.now();
    
    try {
      const forms = await page.$$('form');
      let interactionCount = 0;
      
      for (const form of forms) {
        // 查找输入字段
        const inputs = await form.$$('input[type="text"], input[type="email"], textarea');
        
        for (const input of inputs) {
          const isVisible = await input.isVisible();
          if (isVisible) {
            await input.fill(config.testText || 'test input');
            interactionCount++;
          }
        }
      }
      
      return {
        type: 'form-interaction',
        passed: interactionCount > 0,
        duration: Date.now() - startTime,
        data: {
          formsFound: forms.length,
          interactionsPerformed: interactionCount
        }
      };
    } catch (error) {
      throw new Error(`表单交互测试失败: ${error.message}`);
    }
  }

  async testNavigation(page, config = {}) {
    const startTime = Date.now();
    
    try {
      const links = await page.$$('a[href]');
      let navigationCount = 0;
      
      /**
      
       * for功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      const maxNavigations = Math.min(config.maxLinks || 3, links.length);
      
      for (let i = 0; i < maxNavigations; i++) {
        const link = links[i];
        const href = await link.getAttribute('href');
        
        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          try {
            await link.click({ timeout: 5000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            navigationCount++;
          } catch (navError) {
            // 忽略单个导航失败
          }
        }
      }
      
      return {
        type: 'navigation',
        passed: navigationCount > 0,
        duration: Date.now() - startTime,
        data: {
          linksFound: links.length,
          navigationSuccessful: navigationCount
        }
      };
    } catch (error) {
      throw new Error(`导航测试失败: ${error.message}`);
    }
  }

  async testElementInteraction(page, config = {}) {
    const startTime = Date.now();
    
    try {
      const buttons = await page.$$('button, input[type="button"], input[type="submit"]');
      let clickCount = 0;
      
      for (const button of buttons) {
        const isVisible = await button.isVisible();
        
        /**
        
         * if功能函数
        
         * @param {Object} params - 参数对象
        
         * @returns {Promise<Object>} 返回结果
        
         */
        const isEnabled = await button.isEnabled();
        
        if (isVisible && isEnabled) {
          try {
            await button.click({ timeout: 3000 });
            clickCount++;
          } catch (clickError) {
            // 忽略单个点击失败
          }
        }
      }
      
      return {
        type: 'element-interaction',
        passed: clickCount > 0,
        duration: Date.now() - startTime,
        data: {
          buttonsFound: buttons.length,
          successfulClicks: clickCount
        }
      };
    } catch (error) {
      throw new Error(`元素交互测试失败: ${error.message}`);
    }
  }

  async testPerformanceTiming(page, url, config = {}) {
    const startTime = Date.now();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 获取性能指标
      const performanceData = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      const thresholds = {
        domContentLoaded: config.domThreshold || 2000,
        loadComplete: config.loadThreshold || 5000,
        firstContentfulPaint: config.fcpThreshold || 2000
      };
      
      const passed = performanceData.domContentLoaded < thresholds.domContentLoaded &&
                     performanceData.loadComplete < thresholds.loadComplete;
      
      return {
        type: 'performance-timing',
        passed,
        duration: Date.now() - startTime,
        data: {
          ...performanceData,
          thresholds
        }
      };
    } catch (error) {
      throw new Error(`性能计时测试失败: ${error.message}`);
    }
  }

  async testAccessibilityScan(page, config = {}) {
    const startTime = Date.now();
    
    try {
      // 基础可访问性检查
      const accessibility = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let imagesWithoutAlt = 0;
        
        images.forEach(img => {
          if (!img.getAttribute('alt')) {
            imagesWithoutAlt++;
          }
        });
        
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const forms = document.querySelectorAll('form');
        let formsWithoutLabels = 0;
        
        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            const id = input.getAttribute('id');
            if (!id || !document.querySelector(`label[for="${id}"]`)) {
              formsWithoutLabels++;
            }
          });
        });
        
        return {
          totalImages: images.length,
          imagesWithoutAlt,
          totalHeadings: headings.length,
          hasH1: document.querySelector('h1') !== null,
          formsWithoutLabels
        };
      });
      
      const issues = [];
      if (accessibility.imagesWithoutAlt > 0) {
        issues.push(`${accessibility.imagesWithoutAlt}个图片缺少alt属性`);
      }
      if (!accessibility.hasH1) {
        issues.push('页面缺少H1标题');
      }
      if (accessibility.formsWithoutLabels > 0) {
        issues.push(`${accessibility.formsWithoutLabels}个表单控件缺少标签`);
      }
      
      return {
        type: 'accessibility-scan',
        passed: issues.length === 0,
        duration: Date.now() - startTime,
        data: {
          ...accessibility,
          issues
        }
      };
    } catch (error) {
      throw new Error(`可访问性扫描失败: ${error.message}`);
    }
  }

  async testResponsiveDesign(page, config = {}) {
    const startTime = Date.now();
    
    try {
      const viewports = config.viewports || [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];
      
      const results = [];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000); // 等待布局调整
        
        const layoutInfo = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientWidth: document.documentElement.clientWidth,
            clientHeight: document.documentElement.clientHeight
          };
        });
        
        results.push({
          viewport: viewport.name,
          size: viewport,
          layout: layoutInfo,
          hasHorizontalScroll: layoutInfo.scrollWidth > layoutInfo.clientWidth
        });
      }
      
      const passed = results.every(result => !result.hasHorizontalScroll);
      
      return {
        type: 'responsive-design',
        passed,
        duration: Date.now() - startTime,
        data: {
          viewportsTested: viewports.length,
          results
        }
      };
    } catch (error) {
      throw new Error(`响应式设计测试失败: ${error.message}`);
    }
  }

  async testUserFlow(page, config = {}) {
    const startTime = Date.now();
    
    try {
      const steps = config.steps || [];
      let completedSteps = 0;
      const errors = [];
      
      for (const step of steps) {
        try {
          switch (step.action) {
            case 'click':
              await page.click(step.selector);
              break;
            case 'fill':
              await page.fill(step.selector, step.value);
              break;
            case 'navigate':
              await page.goto(step.url);
              break;
            case 'wait':
              await page.waitForTimeout(step.duration || 1000);
              break;
            case 'waitForSelector':
              await page.waitForSelector(step.selector);
              break;
          }
          completedSteps++;
        } catch (stepError) {
          errors.push(`步骤${completedSteps + 1}: ${stepError.message}`);
        }
      }
      
      return {
        type: 'user-flow',
        passed: completedSteps === steps.length,
        duration: Date.now() - startTime,
        data: {
          totalSteps: steps.length,
          completedSteps,
          errors
        }
      };
    } catch (error) {
      throw new Error(`用户流程测试失败: ${error.message}`);
    }
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
      // 清理浏览器资源
      if (this.browsers.has(testId)) {
        const browser = this.browsers.get(testId);
        await browser.close();
        this.browsers.delete(testId);
      }
      
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

module.exports = AutomationTestEngine;
