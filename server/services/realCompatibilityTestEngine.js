/**
 * 真实的兼容性测试引擎 - 使用Playwright进行多浏览器兼容性测试
 */

const { chromium, firefox, webkit } = require('playwright');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class RealCompatibilityTestEngine {
  constructor() {
    this.name = 'real-compatibility-test-engine';
    this.version = '1.0.0';
    this.supportedBrowsers = {
      'Chrome': chromium,
      'Firefox': firefox,
      'Safari': webkit,
      'Edge': chromium // Edge使用Chromium内核
    };
  }

  /**
   * 运行真实的兼容性测试
   */
  async runCompatibilityTest(url, config = {}) {
    const {
      devices = { desktop: true, tablet: true, mobile: true },
      browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'],
      accessibility = true
    } = config;

    console.log(`🌐 Starting real compatibility test for: ${url}`);
    console.log(`📱 Devices: ${Object.keys(devices).filter(d => devices[d]).join(', ')}`);
    console.log(`🌍 Browsers: ${browsers.join(', ')}`);

    const testId = `compatibility-${Date.now()}`;
    const startTime = Date.now();
    
    const results = {
      testId,
      url,
      config,
      startTime: new Date(startTime).toISOString(),
      status: 'running',
      overallScore: 0,
      browserCompatibility: {},
      deviceCompatibility: {},
      accessibilityScore: 0,
      issues: [],
      recommendations: [],
      detailedResults: {}
    };

    try {
      // 并行测试所有浏览器
      const browserTests = browsers.map(browser => 
        this.testBrowser(url, browser, devices, accessibility)
      );

      const browserResults = await Promise.all(browserTests);

      // 处理测试结果
      browserResults.forEach((result, index) => {
        const browser = browsers[index];
        results.browserCompatibility[browser] = result.score;
        results.detailedResults[browser] = result;
        
        // 收集问题和建议
        results.issues.push(...result.issues);
        results.recommendations.push(...result.recommendations);
      });

      // 计算设备兼容性
      results.deviceCompatibility = this.calculateDeviceCompatibility(browserResults, devices);

      // 计算可访问性分数
      if (accessibility) {
        results.accessibilityScore = this.calculateAccessibilityScore(browserResults);
      }

      // 计算总体分数
      results.overallScore = this.calculateOverallScore(results);

      // 去重建议
      results.recommendations = [...new Set(results.recommendations)];

      // 生成通用建议
      results.recommendations.push(...this.generateGeneralRecommendations(results));

      results.status = 'completed';
      results.endTime = new Date().toISOString();
      results.actualDuration = (Date.now() - startTime) / 1000;

      console.log(`✅ Compatibility test completed for: ${url}`);
      console.log(`📊 Overall Score: ${Math.round(results.overallScore)}`);
      
      return { success: true, data: results };

    } catch (error) {
      console.error(`❌ Compatibility test failed for: ${url}`, error);
      results.status = 'failed';
      results.error = error.message;
      results.endTime = new Date().toISOString();
      
      return { 
        success: false, 
        error: error.message,
        data: results 
      };
    }
  }

  /**
   * 测试单个浏览器
   */
  async testBrowser(url, browserName, devices, checkAccessibility) {
    const browserEngine = this.supportedBrowsers[browserName];
    if (!browserEngine) {
      return {
        score: 0,
        issues: [{ type: '浏览器不支持', description: `${browserName} 浏览器不支持`, severity: 'high' }],
        recommendations: [`请使用支持的浏览器进行测试`],
        deviceResults: {}
      };
    }

    let browser = null;
    const result = {
      score: 0,
      issues: [],
      recommendations: [],
      deviceResults: {},
      accessibilityScore: 0
    };

    try {
      // 启动浏览器
      browser = await browserEngine.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // 测试不同设备
      const deviceTests = [];
      
      if (devices.desktop) {
        deviceTests.push(this.testDevice(browser, url, 'desktop', browserName));
      }
      if (devices.tablet) {
        deviceTests.push(this.testDevice(browser, url, 'tablet', browserName));
      }
      if (devices.mobile) {
        deviceTests.push(this.testDevice(browser, url, 'mobile', browserName));
      }

      const deviceResults = await Promise.all(deviceTests);
      
      // 处理设备测试结果
      deviceResults.forEach(deviceResult => {
        result.deviceResults[deviceResult.device] = deviceResult;
        result.issues.push(...deviceResult.issues);
        result.recommendations.push(...deviceResult.recommendations);
      });

      // 计算浏览器分数
      const deviceScores = deviceResults.map(dr => dr.score);
      result.score = deviceScores.length > 0 ? 
        Math.round(deviceScores.reduce((a, b) => a + b, 0) / deviceScores.length) : 0;

      // 可访问性检查
      if (checkAccessibility && deviceResults.length > 0) {
        result.accessibilityScore = deviceResults[0].accessibilityScore || 0;
      }

    } catch (error) {
      console.error(`Browser test failed for ${browserName}:`, error);
      result.issues.push({
        type: '浏览器测试失败',
        description: `${browserName} 测试失败: ${error.message}`,
        severity: 'high'
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return result;
  }

  /**
   * 测试单个设备
   */
  async testDevice(browser, url, deviceType, browserName) {
    const deviceConfigs = {
      desktop: { width: 1920, height: 1080, isMobile: false },
      tablet: { width: 768, height: 1024, isMobile: false },
      mobile: { width: 375, height: 667, isMobile: true }
    };

    const config = deviceConfigs[deviceType];
    const result = {
      device: deviceType,
      score: 100,
      issues: [],
      recommendations: [],
      accessibilityScore: 0,
      performanceMetrics: {}
    };

    let page = null;

    try {
      page = await browser.newPage();
      
      // 设置视口
      await page.setViewportSize({ width: config.width, height: config.height });

      // 导航到页面
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // 等待页面加载
      await page.waitForLoadState('domcontentloaded');

      // 检查页面基本功能
      await this.checkBasicFunctionality(page, result, deviceType, browserName);

      // 检查响应式设计
      await this.checkResponsiveDesign(page, result, deviceType);

      // 检查JavaScript错误
      await this.checkJavaScriptErrors(page, result);

      // 检查可访问性（仅在桌面端进行详细检查）
      if (deviceType === 'desktop') {
        result.accessibilityScore = await this.checkAccessibility(page);
      }

      // 性能检查
      result.performanceMetrics = await this.checkPerformance(page);

    } catch (error) {
      console.error(`Device test failed for ${deviceType}:`, error);
      result.score = 0;
      result.issues.push({
        type: '设备测试失败',
        description: `${deviceType} 测试失败: ${error.message}`,
        severity: 'high'
      });
    } finally {
      if (page) {
        await page.close();
      }
    }

    return result;
  }

  /**
   * 检查基本功能
   */
  async checkBasicFunctionality(page, result, deviceType, browserName) {
    try {
      // 检查页面标题
      const title = await page.title();
      if (!title || title.length === 0) {
        result.issues.push({
          type: '页面标题缺失',
          description: '页面没有标题',
          severity: 'medium',
          browser: browserName,
          device: deviceType
        });
        result.score -= 10;
      }

      // 检查主要内容是否可见
      const bodyText = await page.textContent('body');
      if (!bodyText || bodyText.trim().length < 100) {
        result.issues.push({
          type: '内容不足',
          description: '页面内容过少或无法加载',
          severity: 'high',
          browser: browserName,
          device: deviceType
        });
        result.score -= 20;
      }

      // 检查现代Web特性支持
      const webFeatures = await this.checkModernWebFeatures(page, result, browserName, deviceType);

      // 检查CSS兼容性
      await this.checkCSSCompatibility(page, result, browserName, deviceType);

      // 检查JavaScript兼容性
      await this.checkJavaScriptCompatibility(page, result, browserName, deviceType);

      // 检查图片加载
      const images = await page.$$('img');
      let brokenImages = 0;

      for (const img of images) {
        const naturalWidth = await img.evaluate(el => el.naturalWidth);
        if (naturalWidth === 0) {
          brokenImages++;
        }
      }

      if (brokenImages > 0) {
        result.issues.push({
          type: '图片加载失败',
          description: `${brokenImages} 张图片无法加载`,
          severity: 'medium'
        });
        result.score -= Math.min(15, brokenImages * 3);
      }

      // 检查链接
      const links = await page.$$('a[href]');
      if (links.length === 0) {
        result.issues.push({
          type: '缺少导航链接',
          description: '页面没有导航链接',
          severity: 'low'
        });
        result.score -= 5;
      }

    } catch (error) {
      console.error('Basic functionality check failed:', error);
    }
  }

  /**
   * 检查现代Web特性支持
   */
  async checkModernWebFeatures(page, result, browserName, deviceType) {
    try {
      const features = await page.evaluate(() => {
        const testResults = {};

        // CSS特性检测
        testResults.css = {
          grid: CSS.supports('display', 'grid'),
          flexbox: CSS.supports('display', 'flex'),
          customProperties: CSS.supports('color', 'var(--test)'),
          transforms: CSS.supports('transform', 'translateX(10px)'),
          animations: CSS.supports('animation', 'test 1s'),
          filters: CSS.supports('filter', 'blur(5px)'),
          backdrop: CSS.supports('backdrop-filter', 'blur(5px)')
        };

        // JavaScript特性检测
        testResults.js = {
          es6Classes: typeof class {} === 'function',
          arrow: (() => { try { eval('() => {}'); return true; } catch(e) { return false; } })(),
          async: (() => { try { eval('async function() {}'); return true; } catch(e) { return false; } })(),
          modules: 'noModule' in document.createElement('script'),
          fetch: typeof fetch !== 'undefined',
          promises: typeof Promise !== 'undefined',
          webWorkers: typeof Worker !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator
        };

        // HTML5特性检测
        testResults.html5 = {
          canvas: !!document.createElement('canvas').getContext,
          video: !!document.createElement('video').canPlayType,
          audio: !!document.createElement('audio').canPlayType,
          localStorage: typeof Storage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
          webGL: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
              return false;
            }
          })()
        };

        return testResults;
      });

      // 分析特性支持情况
      const unsupportedFeatures = [];

      // 检查关键CSS特性
      if (!features.css.flexbox) {
        unsupportedFeatures.push('Flexbox');
        result.issues.push({
          type: 'CSS兼容性',
          description: `${browserName} 不支持 Flexbox`,
          severity: 'high',
          browser: browserName,
          device: deviceType
        });
        result.score -= 15;
      }

      if (!features.css.grid) {
        unsupportedFeatures.push('CSS Grid');
        result.issues.push({
          type: 'CSS兼容性',
          description: `${browserName} 不支持 CSS Grid`,
          severity: 'medium',
          browser: browserName,
          device: deviceType
        });
        result.score -= 10;
      }

      // 检查JavaScript特性
      if (!features.js.fetch) {
        unsupportedFeatures.push('Fetch API');
        result.issues.push({
          type: 'JavaScript兼容性',
          description: `${browserName} 不支持 Fetch API`,
          severity: 'medium',
          browser: browserName,
          device: deviceType
        });
        result.score -= 8;
      }

      if (!features.js.promises) {
        unsupportedFeatures.push('Promises');
        result.issues.push({
          type: 'JavaScript兼容性',
          description: `${browserName} 不支持 Promises`,
          severity: 'high',
          browser: browserName,
          device: deviceType
        });
        result.score -= 12;
      }

      // 添加建议
      if (unsupportedFeatures.length > 0) {
        result.recommendations.push(`考虑为 ${browserName} 添加 polyfill 支持: ${unsupportedFeatures.join(', ')}`);
      }

      return features;
    } catch (error) {
      console.error('Modern web features check failed:', error);
      result.score -= 5;
      return {};
    }
  }

  /**
   * 检查CSS兼容性
   */
  async checkCSSCompatibility(page, result, browserName, deviceType) {
    try {
      const cssIssues = await page.evaluate(() => {
        const issues = [];
        const styles = window.getComputedStyle(document.documentElement);

        // 检查CSS变量使用
        const cssText = Array.from(document.styleSheets)
          .map(sheet => {
            try {
              return Array.from(sheet.cssRules).map(rule => rule.cssText).join('');
            } catch (e) {
              return '';
            }
          }).join('');

        // 检查现代CSS特性使用
        const modernFeatures = {
          'CSS Grid': /display:\s*grid/i.test(cssText),
          'Flexbox': /display:\s*flex/i.test(cssText),
          'CSS Variables': /var\(--/i.test(cssText),
          'CSS Transforms': /transform:/i.test(cssText),
          'CSS Animations': /@keyframes|animation:/i.test(cssText)
        };

        return { issues, modernFeatures };
      });

      // 记录CSS特性使用情况
      result.cssFeatures = cssIssues.modernFeatures;

    } catch (error) {
      console.error('CSS compatibility check failed:', error);
    }
  }

  /**
   * 检查JavaScript兼容性
   */
  async checkJavaScriptCompatibility(page, result, browserName, deviceType) {
    try {
      // 监听JavaScript错误
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push({
          message: error.message,
          stack: error.stack
        });
      });

      // 检查JavaScript特性使用
      const jsFeatures = await page.evaluate(() => {
        const features = {
          usesES6: false,
          usesAsync: false,
          usesModules: false,
          usesWebAPIs: false
        };

        // 检查脚本标签
        const scripts = Array.from(document.querySelectorAll('script'));
        const scriptContent = scripts.map(s => s.textContent || '').join('');

        features.usesES6 = /const |let |=>|class /.test(scriptContent);
        features.usesAsync = /async |await /.test(scriptContent);
        features.usesModules = scripts.some(s => s.type === 'module');
        features.usesWebAPIs = /fetch\(|navigator\.|localStorage|sessionStorage/.test(scriptContent);

        return features;
      });

      // 记录JavaScript特性
      result.jsFeatures = jsFeatures;
      result.jsErrors = jsErrors;

      if (jsErrors.length > 0) {
        result.issues.push({
          type: 'JavaScript错误',
          description: `发现 ${jsErrors.length} 个JavaScript错误`,
          severity: 'high',
          browser: browserName,
          device: deviceType,
          details: jsErrors.slice(0, 3) // 只显示前3个错误
        });
        result.score -= Math.min(20, jsErrors.length * 5);
      }

    } catch (error) {
      console.error('JavaScript compatibility check failed:', error);
    }
  }

  /**
   * 检查响应式设计
   */
  async checkResponsiveDesign(page, result, deviceType) {
    try {
      // 检查水平滚动
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll && (deviceType === 'mobile' || deviceType === 'tablet')) {
        result.issues.push({
          type: '响应式设计问题',
          description: `${deviceType}设备出现水平滚动条`,
          severity: 'medium'
        });
        result.score -= 15;
        result.recommendations.push('优化响应式设计，避免水平滚动');
      }

      // 检查字体大小
      const fontSize = await page.evaluate(() => {
        const body = document.body;
        return window.getComputedStyle(body).fontSize;
      });

      const fontSizeNum = parseInt(fontSize);
      if (deviceType === 'mobile' && fontSizeNum < 14) {
        result.issues.push({
          type: '字体过小',
          description: '移动端字体过小，影响可读性',
          severity: 'medium'
        });
        result.score -= 10;
        result.recommendations.push('增大移动端字体大小，提高可读性');
      }

    } catch (error) {
      console.error('Responsive design check failed:', error);
    }
  }

  /**
   * 检查JavaScript错误
   */
  async checkJavaScriptErrors(page, result) {
    const errors = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待一段时间收集错误
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      result.issues.push({
        type: 'JavaScript错误',
        description: `发现 ${errors.length} 个JavaScript错误`,
        severity: 'high'
      });
      result.score -= Math.min(25, errors.length * 5);
      result.recommendations.push('修复JavaScript错误，确保功能正常');
    }
  }

  /**
   * 检查可访问性
   */
  async checkAccessibility(page) {
    let score = 100;

    try {
      // 检查图片alt属性
      const imagesWithoutAlt = await page.$$eval('img', imgs => 
        imgs.filter(img => !img.alt).length
      );
      if (imagesWithoutAlt > 0) score -= 20;

      // 检查表单标签
      const inputsWithoutLabels = await page.$$eval('input, textarea, select', inputs => 
        inputs.filter(input => !input.labels?.length && !input.getAttribute('aria-label')).length
      );
      if (inputsWithoutLabels > 0) score -= 15;

      // 检查标题结构
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings => 
        headings.map(h => h.tagName)
      );
      if (headings.length === 0 || !headings.includes('H1')) score -= 15;

    } catch (error) {
      console.error('Accessibility check failed:', error);
      score = 50;
    }

    return Math.max(0, score);
  }

  /**
   * 检查性能
   */
  async checkPerformance(page) {
    try {
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
        };
      });

      return metrics;
    } catch (error) {
      console.error('Performance check failed:', error);
      return {};
    }
  }

  /**
   * 计算设备兼容性
   */
  calculateDeviceCompatibility(browserResults, devices) {
    const deviceScores = { Desktop: 0, Tablet: 0, Mobile: 0 };
    const deviceCounts = { Desktop: 0, Tablet: 0, Mobile: 0 };

    browserResults.forEach(result => {
      Object.entries(result.deviceResults).forEach(([device, deviceResult]) => {
        const deviceKey = device.charAt(0).toUpperCase() + device.slice(1);
        if (deviceScores[deviceKey] !== undefined) {
          deviceScores[deviceKey] += deviceResult.score;
          deviceCounts[deviceKey]++;
        }
      });
    });

    // 计算平均分数
    Object.keys(deviceScores).forEach(device => {
      if (deviceCounts[device] > 0) {
        deviceScores[device] = Math.round(deviceScores[device] / deviceCounts[device]);
      }
    });

    return deviceScores;
  }

  /**
   * 计算可访问性分数
   */
  calculateAccessibilityScore(browserResults) {
    const scores = browserResults
      .map(result => result.accessibilityScore)
      .filter(score => score > 0);

    return scores.length > 0 ? 
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  /**
   * 计算总体分数
   */
  calculateOverallScore(results) {
    const browserScores = Object.values(results.browserCompatibility);
    const deviceScores = Object.values(results.deviceCompatibility);
    
    const avgBrowserScore = browserScores.length > 0 ? 
      browserScores.reduce((a, b) => a + b, 0) / browserScores.length : 0;
    
    const avgDeviceScore = deviceScores.length > 0 ? 
      deviceScores.reduce((a, b) => a + b, 0) / deviceScores.length : 0;

    // 权重分配：浏览器兼容性60%，设备兼容性30%，可访问性10%
    let score = avgBrowserScore * 0.6 + avgDeviceScore * 0.3;
    
    if (results.accessibilityScore > 0) {
      score += results.accessibilityScore * 0.1;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 生成通用建议
   */
  generateGeneralRecommendations(results) {
    const recommendations = [];

    if (results.overallScore < 80) {
      recommendations.push('提升整体兼容性，关注主要浏览器支持');
    }

    const lowBrowsers = Object.entries(results.browserCompatibility)
      .filter(([browser, score]) => score < 80)
      .map(([browser]) => browser);

    if (lowBrowsers.length > 0) {
      recommendations.push(`重点优化 ${lowBrowsers.join(', ')} 浏览器的兼容性`);
    }

    const lowDevices = Object.entries(results.deviceCompatibility)
      .filter(([device, score]) => score < 80)
      .map(([device]) => device);

    if (lowDevices.length > 0) {
      recommendations.push(`改善 ${lowDevices.join(', ')} 设备的显示效果`);
    }

    if (results.accessibilityScore < 80) {
      recommendations.push('提升网站可访问性，遵循WCAG指南');
    }

    return recommendations;
  }

  /**
   * 获取测试引擎状态
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      available: true,
      supportedBrowsers: Object.keys(this.supportedBrowsers),
      capabilities: [
        '多浏览器兼容性测试',
        '响应式设计检查',
        '可访问性评估',
        'JavaScript错误检测',
        '性能基础检查',
        '多设备模拟'
      ]
    };
  }
}

module.exports = { RealCompatibilityTestEngine };
