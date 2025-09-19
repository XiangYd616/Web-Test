/**
 * 浏览器兼容性测试引擎
 * 测试跨浏览器和跨设备的兼容性
 */

const { chromium, firefox, webkit } = require('playwright');
const Joi = require('joi');

class CompatibilityTestEngine {
  constructor() {
    this.name = 'compatibility';
    this.version = '1.0.0';
    this.activeTests = new Map();
    this.browsers = {
      chromium: { name: 'Chromium', engine: chromium },
      firefox: { name: 'Firefox', engine: firefox },
      webkit: { name: 'WebKit (Safari)', engine: webkit }
    };
  }

  async checkAvailability() {
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return {
        available: true,
        version: this.version,
        supportedBrowsers: Object.keys(this.browsers)
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      browsers: Joi.array().items(
        Joi.string().valid('chromium', 'firefox', 'webkit')
      ).default(['chromium']),
      devices: Joi.array().items(
        Joi.string().valid('desktop', 'mobile', 'tablet')
      ).default(['desktop']),
      timeout: Joi.number().min(10000).max(120000).default(30000)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runCompatibilityTest(config) {
    const testId = `compat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
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
        browsers: {},
        summary: {
          total: 0,
          passed: 0,
          failed: 0
        }
      };

      for (const browserName of validatedConfig.browsers) {
        results.browsers[browserName] = await this.testBrowser(
          browserName, 
          validatedConfig
        );
        results.summary.total++;
        if (results.browsers[browserName].success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      }

      this.activeTests.delete(testId);
      return results;

    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  async testBrowser(browserName, config) {
    let browser = null;
    try {
      const browserEngine = this.browsers[browserName].engine;
      browser = await browserEngine.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(config.url, {
        waitUntil: 'networkidle',
        timeout: config.timeout
      });

      const title = await page.title();
      
      await browser.close();
      
      return {
        browser: browserName,
        success: true,
        title,
        loadTime: Date.now() - this.activeTests.values().next().value?.startTime || 0
      };

    } catch (error) {
      if (browser) await browser.close();
      return {
        browser: browserName,
        success: false,
        error: error.message
      };
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