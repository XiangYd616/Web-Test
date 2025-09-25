/**
 * 浏览器管理器
 * 本地化程度：100%
 * 管理多个浏览器实例和测试执行
 */

const puppeteer = require('puppeteer');
const { chromium, firefox, webkit } = require('playwright');

class BrowserManager {
  constructor(options = {}) {
    this.options = {
      headless: true,
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...options
    };
    
    // 支持的浏览器配置
    this.browserConfigs = {
      chrome: {
        name: 'Chrome',
        engine: 'chromium',
        versions: ['latest', '120', '119', '118'],
        userAgents: {
          'latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '120': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '119': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      },
      firefox: {
        name: 'Firefox',
        engine: 'firefox',
        versions: ['latest', '121', '120', '119'],
        userAgents: {
          'latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          '121': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          '120': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
        }
      },
      safari: {
        name: 'Safari',
        engine: 'webkit',
        versions: ['latest', '17', '16'],
        userAgents: {
          'latest': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
          '17': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
          '16': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'
        }
      },
      edge: {
        name: 'Edge',
        engine: 'chromium',
        versions: ['latest', '120', '119'],
        userAgents: {
          'latest': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          '120': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        }
      }
    };
    
    // 活跃的浏览器实例
    this.activeBrowsers = new Map();
    this.activePages = new Map();
  }

  /**
   * 启动浏览器
   */
  async launchBrowser(browserType, version = 'latest') {
    try {
      const config = this.browserConfigs[browserType];
      if (!config) {
        throw new Error(`不支持的浏览器类型: ${browserType}`);
      }
      
      const browserKey = `${browserType}_${version}`;
      
      // 如果浏览器已经启动，直接返回
      if (this.activeBrowsers.has(browserKey)) {
        return this.activeBrowsers.get(browserKey);
      }
      
      console.log(`🚀 启动浏览器: ${config.name} ${version}`);
      
      let browser;
      const launchOptions = {
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };
      
      // 根据引擎类型启动浏览器
      switch (config.engine) {
        case 'chromium':
          if (browserType === 'chrome') {
            browser = await puppeteer.launch(launchOptions);
          } else {
            browser = await chromium.launch(launchOptions);
          }
          break;
        case 'firefox':
          browser = await firefox.launch(launchOptions);
          break;
        case 'webkit':
          browser = await webkit.launch(launchOptions);
          break;
        default:
          throw new Error(`不支持的浏览器引擎: ${config.engine}`);
      }
      
      // 存储浏览器实例
      this.activeBrowsers.set(browserKey, {
        browser,
        type: browserType,
        version,
        config,
        launchedAt: new Date()
      });
      
      console.log(`✅ 浏览器启动成功: ${config.name} ${version}`);
      
      return this.activeBrowsers.get(browserKey);
      
    } catch (error) {
      console.error(`❌ 启动浏览器失败: ${browserType} ${version}`, error);
      throw error;
    }
  }

  /**
   * 创建页面
   */
  async createPage(browserType, version = 'latest', pageOptions = {}) {
    try {
      const browserInstance = await this.launchBrowser(browserType, version);
      const { browser, config } = browserInstance;
      
      // 创建新页面
      const page = await browser.newPage();
      
      // 设置视口
      await page.setViewportSize(this.options.viewport);
      
      // 设置用户代理
      const userAgent = config.userAgents[version] || config.userAgents['latest'];
      await page.setUserAgent(userAgent);
      
      // 设置超时
      page.setDefaultTimeout(this.options.timeout);
      
      // 应用页面选项
      if (pageOptions.extraHTTPHeaders) {
        await page.setExtraHTTPHeaders(pageOptions.extraHTTPHeaders);
      }
      
      if (pageOptions.geolocation) {
        await page.setGeolocation(pageOptions.geolocation);
      }
      
      if (pageOptions.permissions) {
        await page.grantPermissions(pageOptions.permissions);
      }
      
      const pageKey = `${browserType}_${version}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // 存储页面实例
      this.activePages.set(pageKey, {
        page,
        browserType,
        version,
        createdAt: new Date(),
        lastActivity: new Date()
      });
      
      return { pageKey, page };
      
    } catch (error) {
      console.error(`❌ 创建页面失败: ${browserType} ${version}`, error);
      throw error;
    }
  }

  /**
   * 导航到URL
   */
  async navigateToURL(pageKey, url, options = {}) {
    try {
      const pageInstance = this.activePages.get(pageKey);
      if (!pageInstance) {
        throw new Error(`页面不存在: ${pageKey}`);
      }
      
      const { page } = pageInstance;
      
      const navigationOptions = {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
        ...options
      };
      
      
      const response = await page.goto(url, navigationOptions);
      
      // 更新最后活动时间
      pageInstance.lastActivity = new Date();
      
      return {
        success: response.ok(),
        status: response.status(),
        url: response.url(),
        headers: response.headers(),
        loadTime: Date.now() - pageInstance.lastActivity.getTime()
      };
      
    } catch (error) {
      console.error(`❌ 导航失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 截图
   */
  async takeScreenshot(pageKey, options = {}) {
    try {
      const pageInstance = this.activePages.get(pageKey);
      if (!pageInstance) {
        throw new Error(`页面不存在: ${pageKey}`);
      }
      
      const { page } = pageInstance;
      
      const screenshotOptions = {
        type: 'png',
        fullPage: true,
        ...options
      };
      
      const screenshot = await page.screenshot(screenshotOptions);
      
      // 更新最后活动时间
      pageInstance.lastActivity = new Date();
      
      return screenshot;
      
    } catch (error) {
      console.error(`❌ 截图失败: ${pageKey}`, error);
      throw error;
    }
  }

  /**
   * 执行JavaScript
   */
  async executeScript(pageKey, script, args = []) {
    try {
      const pageInstance = this.activePages.get(pageKey);
      if (!pageInstance) {
        throw new Error(`页面不存在: ${pageKey}`);
      }
      
      const { page } = pageInstance;
      
      const result = await page.evaluate(script, ...args);
      
      // 更新最后活动时间
      pageInstance.lastActivity = new Date();
      
      return result;
      
    } catch (error) {
      console.error(`❌ 执行脚本失败: ${pageKey}`, error);
      throw error;
    }
  }

  /**
   * 获取页面信息
   */
  async getPageInfo(pageKey) {
    try {
      const pageInstance = this.activePages.get(pageKey);
      if (!pageInstance) {
        throw new Error(`页面不存在: ${pageKey}`);
      }
      
      const { page, browserType, version } = pageInstance;
      
      const info = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          documentReady: document.readyState,
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
      });
      
      return {
        ...info,
        browserType,
        version,
        pageKey
      };
      
    } catch (error) {
      console.error(`❌ 获取页面信息失败: ${pageKey}`, error);
      throw error;
    }
  }

  /**
   * 关闭页面
   */
  async closePage(pageKey) {
    try {
      const pageInstance = this.activePages.get(pageKey);
      if (!pageInstance) {
        
        return false;
      }
      
      const { page } = pageInstance;
      await page.close();
      
      this.activePages.delete(pageKey);
      
      
      return true;
      
    } catch (error) {
      console.error(`❌ 关闭页面失败: ${pageKey}`, error);
      return false;
    }
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser(browserType, version = 'latest') {
    try {
      const browserKey = `${browserType}_${version}`;
      const browserInstance = this.activeBrowsers.get(browserKey);
      
      if (!browserInstance) {
        
        return false;
      }
      
      const { browser } = browserInstance;
      
      // 关闭所有相关页面
      for (const [pageKey, pageInstance] of this.activePages.entries()) {
        if (pageInstance.browserType === browserType && pageInstance.version === version) {
          await this.closePage(pageKey);
        }
      }
      
      // 关闭浏览器
      await browser.close();
      
      this.activeBrowsers.delete(browserKey);
      
      
      return true;
      
    } catch (error) {
      console.error(`❌ 关闭浏览器失败: ${browserType} ${version}`, error);
      return false;
    }
  }

  /**
   * 获取支持的浏览器列表
   */
  getSupportedBrowsers() {
    return Object.keys(this.browserConfigs).map(type => ({
      type,
      name: this.browserConfigs[type].name,
      versions: this.browserConfigs[type].versions,
      engine: this.browserConfigs[type].engine
    }));
  }

  /**
   * 获取活跃浏览器状态
   */
  getActiveBrowsers() {
    const browsers = [];
    
    for (const [key, instance] of this.activeBrowsers.entries()) {
      const pages = Array.from(this.activePages.values())
        .filter(page => page.browserType === instance.type && page.version === instance.version);
      
      browsers.push({
        key,
        type: instance.type,
        version: instance.version,
        name: instance.config.name,
        launchedAt: instance.launchedAt,
        pageCount: pages.length
      });
    }
    
    return browsers;
  }

  /**
   * 清理非活跃页面
   */
  async cleanupInactivePages(maxIdleTime = 30 * 60 * 1000) { // 30分钟
    const now = new Date();
    const pagesToClose = [];
    
    for (const [pageKey, pageInstance] of this.activePages.entries()) {
      if (now - pageInstance.lastActivity > maxIdleTime) {
        pagesToClose.push(pageKey);
      }
    }
    
    for (const pageKey of pagesToClose) {
      await this.closePage(pageKey);
    }
    
    
    return pagesToClose.length;
  }

  /**
   * 关闭所有浏览器和页面
   */
  async closeAll() {
    try {
      
      // 关闭所有页面
      const pageKeys = Array.from(this.activePages.keys());
      for (const pageKey of pageKeys) {
        await this.closePage(pageKey);
      }
      
      // 关闭所有浏览器
      const browserKeys = Array.from(this.activeBrowsers.keys());
      for (const browserKey of browserKeys) {
        const [type, version] = browserKey.split('_');
        await this.closeBrowser(type, version);
      }
      
      console.log('✅ 所有浏览器和页面已关闭');
      
    } catch (error) {
      console.error('❌ 关闭浏览器失败:', error);
    }
  }
}

module.exports = BrowserManager;
