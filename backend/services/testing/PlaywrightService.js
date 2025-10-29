/**
 * Playwright 浏览器自动化测试服务
 * 提供真实的跨浏览器测试功能
 */

const { chromium, firefox, webkit } = require('playwright');
const logger = require('../../utils/logger');

class PlaywrightService {
  /**
   * 构造函数
   */
  constructor() {
    this.supportedBrowsers = ['chromium', 'firefox', 'webkit'];
    this.browserInstances = new Map();
  }

  /**
   * 运行 Playwright 测试
   * @param {string} url - 要测试的 URL
   * @param {Object} options - 测试选项
   * @returns {Promise<Object>} 测试结果
   */
  async runTest(url, options = {}) {
    const browsers = options.browsers || ['chromium'];
    const tests = options.tests || ['basic'];
    const viewport = options.viewport || { width: 1920, height: 1080 };

    try {
      logger.info(`🚀 Starting Playwright test for: ${url}`);
      logger.info(`📊 Testing browsers: ${browsers.join(', ')}`);

      const results = {
        url,
        timestamp: new Date().toISOString(),
        browsers: {},
        summary: {
          totalBrowsers: browsers.length,
          passedBrowsers: 0,
          failedBrowsers: 0,
          totalTests: tests.length
        }
      };

      // 对每个浏览器运行测试
      for (const browserType of browsers) {
        if (!this.supportedBrowsers.includes(browserType)) {
          logger.warn(`⚠️ Unsupported browser: ${browserType}, skipping`);
          continue;
        }

        try {
          const browserResult = await this.runBrowserTest(url, browserType, tests, viewport);
          results.browsers[browserType] = browserResult;

          if (browserResult.success) {
            results.summary.passedBrowsers++;
          } else {
            results.summary.failedBrowsers++;
          }

        } catch (error) {
          logger.error(`❌ ${browserType} test failed:`, error);
          results.browsers[browserType] = {
            success: false,
            error: error.message,
            tests: {}
          };
          results.summary.failedBrowsers++;
        }
      }

      logger.info(`✅ Playwright test completed`);

      return {
        success: true,
        data: results
      };

    } catch (error) {
      logger.error('❌ Playwright test execution failed:', error);
      
      return {
        success: false,
        error: {
          code: 'PLAYWRIGHT_TEST_FAILED',
          message: error.message || 'Playwright test execution failed',
          details: error.stack
        }
      };
    }
  }

  /**
   * 在指定浏览器中运行测试
   * @param {string} url - 测试 URL
   * @param {string} browserType - 浏览器类型
   * @param {Array} tests - 测试列表
   * @param {Object} viewport - 视口配置
   * @returns {Promise<Object>} 浏览器测试结果
   */
  async runBrowserTest(url, browserType, tests, viewport) {
    let browser = null;
    let page = null;

    try {
      // 启动浏览器
      const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };

      switch (browserType) {
        case 'chromium':
          browser = await chromium.launch(launchOptions);
          break;
        case 'firefox':
          browser = await firefox.launch(launchOptions);
          break;
        case 'webkit':
          browser = await webkit.launch(launchOptions);
          break;
        default:
          throw new Error(`Unsupported browser: ${browserType}`);
      }

      logger.info(`✅ ${browserType} browser launched`);

      // 创建页面
      page = await browser.newPage({
        viewport
      });

      // 导航到 URL
      const startTime = Date.now();
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      const loadTime = Date.now() - startTime;

      logger.info(`✅ Page loaded in ${loadTime}ms`);

      // 运行测试
      const testResults = {};
      for (const testType of tests) {
        testResults[testType] = await this.runSpecificTest(page, testType, url);
      }

      // 收集性能指标
      const performanceMetrics = await this.collectPerformanceMetrics(page);

      // 截图（可选）
      let screenshot = null;
      if (tests.includes('screenshot')) {
        screenshot = await page.screenshot({ 
          fullPage: false,
          type: 'png',
          encoding: 'base64'
        });
      }

      return {
        success: true,
        browser: browserType,
        loadTime,
        statusCode: response?.status() || 200,
        performance: performanceMetrics,
        tests: testResults,
        screenshot: screenshot ? `data:image/png;base64,${screenshot.substring(0, 100)}...` : null,
        viewport
      };

    } finally {
      // 清理资源
      if (page) {
        try {
          await page.close();
        } catch (err) {
          logger.error(`Failed to close page:`, err);
        }
      }

      if (browser) {
        try {
          await browser.close();
          logger.info(`✅ ${browserType} browser closed`);
        } catch (err) {
          logger.error(`Failed to close browser:`, err);
        }
      }
    }
  }

  /**
   * 运行特定类型的测试
   * @param {Page} page - Playwright 页面对象
   * @param {string} testType - 测试类型
   * @param {string} url - 测试 URL
   * @returns {Promise<Object>} 测试结果
   */
  async runSpecificTest(page, testType, url) {
    try {
      switch (testType) {
        case 'basic':
          return await this.runBasicTest(page);
        
        case 'accessibility':
          return await this.runAccessibilityTest(page);
        
        case 'console':
          return await this.runConsoleTest(page);
        
        case 'network':
          return await this.runNetworkTest(page);
        
        case 'screenshot':
          return { passed: true, message: 'Screenshot captured' };
        
        default:
          return { 
            passed: false, 
            message: `Unknown test type: ${testType}` 
          };
      }
    } catch (error) {
      logger.error(`Test ${testType} failed:`, error);
      return {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * 基础测试
   */
  async runBasicTest(page) {
    const title = await page.title();
    const url = page.url();
    
    return {
      passed: true,
      title,
      url,
      message: 'Page loaded successfully'
    };
  }

  /**
   * 可访问性测试
   */
  async runAccessibilityTest(page) {
    try {
      // 检查基本可访问性元素
      const hasTitle = await page.title() !== '';
      const hasLang = await page.getAttribute('html', 'lang') !== null;
      const imageCount = await page.locator('img').count();
      const imagesWithAlt = await page.locator('img[alt]').count();
      
      const issues = [];
      if (!hasTitle) issues.push('Missing page title');
      if (!hasLang) issues.push('Missing language attribute');
      if (imageCount > 0 && imagesWithAlt < imageCount) {
        issues.push(`${imageCount - imagesWithAlt} images missing alt text`);
      }

      return {
        passed: issues.length === 0,
        issues,
        stats: {
          hasTitle,
          hasLang,
          totalImages: imageCount,
          imagesWithAlt
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * 控制台日志测试
   */
  async runConsoleTest(page) {
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // 等待一下收集日志
    await page.waitForTimeout(1000);

    return {
      passed: errors.length === 0,
      consoleMessages: consoleMessages.slice(0, 10),
      errors
    };
  }

  /**
   * 网络请求测试
   */
  async runNetworkTest(page) {
    const requests = [];
    const failedRequests = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    return {
      passed: failedRequests.length === 0,
      totalRequests: requests.length,
      failedRequests
    };
  }

  /**
   * 收集性能指标
   */
  async collectPerformanceMetrics(page) {
    try {
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          loadTime: perf?.loadEventEnd - perf?.fetchStart || 0,
          domContentLoaded: perf?.domContentLoadedEventEnd - perf?.fetchStart || 0,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          domInteractive: perf?.domInteractive - perf?.fetchStart || 0,
          domComplete: perf?.domComplete - perf?.fetchStart || 0
        };
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect performance metrics:', error);
      return {};
    }
  }

  /**
   * 验证 Playwright 是否可用
   * @returns {Promise<Object>} 可用性状态
   */
  async checkAvailability() {
    try {
      const playwrightPackage = require('playwright/package.json');
      
      // 测试启动 chromium
      const browser = await chromium.launch({ headless: true });
      await browser.close();

      return {
        available: true,
        version: playwrightPackage.version,
        status: 'ready',
        supportedBrowsers: this.supportedBrowsers
      };

    } catch (error) {
      logger.error('Playwright availability check failed:', error);
      
      return {
        available: false,
        status: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * 获取支持的测试类型
   * @returns {Array<string>} 支持的测试类型列表
   */
  getSupportedTests() {
    return ['basic', 'accessibility', 'console', 'network', 'screenshot'];
  }

  /**
   * 清理所有浏览器实例
   */
  async cleanup() {
    for (const [browserType, browser] of this.browserInstances) {
      try {
        await browser.close();
        logger.info(`✅ Closed ${browserType} browser`);
      } catch (error) {
        logger.error(`Failed to close ${browserType} browser:`, error);
      }
    }
    this.browserInstances.clear();
  }
}

module.exports = PlaywrightService;

