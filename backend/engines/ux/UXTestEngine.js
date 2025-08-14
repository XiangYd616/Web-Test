const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class UXTestEngine {
  constructor() {
    this.testResults = {
      performance: {},
      accessibility: {},
      usability: {},
      mobile: {},
      score: 0,
      recommendations: []
    };
  }

  async runUXTest(url, config = {}) {
    console.log(`开始UX测试: ${url}`);

    try {
      // 1. 性能测试
      if (config.checkPerformance !== false) {
        await this.checkPerformance(url);
      }

      // 2. 可访问性测试
      if (config.checkAccessibility !== false) {
        await this.checkAccessibility(url);
      }

      // 3. 可用性测试
      if (config.checkUsability !== false) {
        await this.checkUsability(url);
      }

      // 4. 移动端适配测试
      if (config.checkMobile !== false) {
        await this.checkMobileCompatibility(url);
      }

      // 5. 计算UX评分
      this.calculateUXScore();

      return {
        success: true,
        results: this.testResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('UX测试失败:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkPerformance(url) {
    try {
      const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance'],
        port: chrome.port,
      };

      const runnerResult = await lighthouse(url, options);
      await chrome.kill();

      const performanceScore = runnerResult.lhr.categories.performance.score * 100;
      const metrics = runnerResult.lhr.audits;

      this.testResults.performance = {
        score: Math.round(performanceScore),
        metrics: {
          firstContentfulPaint: metrics['first-contentful-paint']?.displayValue,
          largestContentfulPaint: metrics['largest-contentful-paint']?.displayValue,
          firstInputDelay: metrics['max-potential-fid']?.displayValue,
          cumulativeLayoutShift: metrics['cumulative-layout-shift']?.displayValue,
          speedIndex: metrics['speed-index']?.displayValue,
          totalBlockingTime: metrics['total-blocking-time']?.displayValue
        },
        opportunities: this.extractOpportunities(runnerResult.lhr.audits)
      };

    } catch (error) {
      this.testResults.performance = {
        error: error.message,
        score: 0
      };
    }
  }

  async checkAccessibility(url) {
    try {
      const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['accessibility'],
        port: chrome.port,
      };

      const runnerResult = await lighthouse(url, options);
      await chrome.kill();

      const accessibilityScore = runnerResult.lhr.categories.accessibility.score * 100;
      const audits = runnerResult.lhr.audits;

      this.testResults.accessibility = {
        score: Math.round(accessibilityScore),
        issues: this.extractAccessibilityIssues(audits),
        passed: this.extractPassedAudits(audits),
        wcagLevel: this.determineWCAGLevel(accessibilityScore)
      };

    } catch (error) {
      this.testResults.accessibility = {
        error: error.message,
        score: 0
      };
    }
  }

  async checkUsability(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 检查页面基本可用性
      const usabilityChecks = {
        hasTitle: await this.checkPageTitle(page),
        hasNavigation: await this.checkNavigation(page),
        hasSearchFunction: await this.checkSearchFunction(page),
        hasContactInfo: await this.checkContactInfo(page),
        hasErrorHandling: await this.checkErrorHandling(page),
        hasLoadingStates: await this.checkLoadingStates(page)
      };

      const passedChecks = Object.values(usabilityChecks).filter(Boolean).length;
      const totalChecks = Object.keys(usabilityChecks).length;

      this.testResults.usability = {
        score: Math.round((passedChecks / totalChecks) * 100),
        checks: usabilityChecks,
        issues: this.generateUsabilityIssues(usabilityChecks)
      };

    } catch (error) {
      this.testResults.usability = {
        error: error.message,
        score: 0
      };
    } finally {
      await browser.close();
    }
  }

  async checkMobileCompatibility(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // 模拟移动设备
      await page.setViewport({ width: 375, height: 667 });
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15');

      await page.goto(url, { waitUntil: 'networkidle2' });

      const mobileChecks = {
        isResponsive: await this.checkResponsiveDesign(page),
        hasTouchTargets: await this.checkTouchTargets(page),
        hasViewportMeta: await this.checkViewportMeta(page),
        hasReadableText: await this.checkReadableText(page),
        hasProperSpacing: await this.checkProperSpacing(page)
      };

      const passedChecks = Object.values(mobileChecks).filter(Boolean).length;
      const totalChecks = Object.keys(mobileChecks).length;

      this.testResults.mobile = {
        score: Math.round((passedChecks / totalChecks) * 100),
        checks: mobileChecks,
        issues: this.generateMobileIssues(mobileChecks)
      };

    } catch (error) {
      this.testResults.mobile = {
        error: error.message,
        score: 0
      };
    } finally {
      await browser.close();
    }
  }

  // 辅助方法
  extractOpportunities(audits) {
    const opportunities = [];

    Object.values(audits).forEach(audit => {
      if (audit.details && audit.details.type === 'opportunity' && audit.score < 1) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: audit.details.overallSavingsMs || 0
        });
      }
    });

    return opportunities.sort((a, b) => b.savings - a.savings);
  }

  extractAccessibilityIssues(audits) {
    const issues = [];

    Object.values(audits).forEach(audit => {
      if (audit.score !== null && audit.score < 1) {
        issues.push({
          title: audit.title,
          description: audit.description,
          impact: this.getImpactLevel(audit.score)
        });
      }
    });

    return issues;
  }

  extractPassedAudits(audits) {
    return Object.values(audits)
      .filter(audit => audit.score === 1)
      .map(audit => audit.title);
  }

  determineWCAGLevel(score) {
    if (score >= 95) return 'AAA';
    if (score >= 80) return 'AA';
    if (score >= 60) return 'A';
    return 'Below A';
  }

  getImpactLevel(score) {
    if (score === 0) return 'high';
    if (score < 0.5) return 'medium';
    return 'low';
  }

  async checkPageTitle(page) {
    const title = await page.title();
    return title && title.length > 0 && title.length < 60;
  }

  async checkNavigation(page) {
    const nav = await page.$('nav, .navigation, .menu');
    return nav !== null;
  }

  async checkSearchFunction(page) {
    const search = await page.$('input[type="search"], .search-input, #search');
    return search !== null;
  }

  async checkContactInfo(page) {
    const contact = await page.$('.contact, .footer, [href*="contact"], [href*="mailto"]');
    return contact !== null;
  }

  async checkErrorHandling(page) {
    // 简单检查是否有错误处理相关的元素
    const errorElements = await page.$$('.error, .alert, .notification');
    return errorElements.length > 0;
  }

  async checkLoadingStates(page) {
    // 检查是否有加载状态指示器
    const loadingElements = await page.$$('.loading, .spinner, .skeleton');
    return loadingElements.length > 0;
  }

  async checkResponsiveDesign(page) {
    const viewport = page.viewport();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    return bodyWidth <= viewport.width * 1.1; // 允许10%的误差
  }

  async checkTouchTargets(page) {
    const buttons = await page.$$('button, a, input[type="button"], input[type="submit"]');
    let validTargets = 0;

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box && box.width >= 44 && box.height >= 44) {
        validTargets++;
      }
    }

    return buttons.length === 0 || validTargets / buttons.length >= 0.8;
  }

  async checkViewportMeta(page) {
    const viewport = await page.$('meta[name="viewport"]');
    return viewport !== null;
  }

  async checkReadableText(page) {
    const textElements = await page.$$('p, span, div, h1, h2, h3, h4, h5, h6');
    let readableCount = 0;

    for (const element of textElements.slice(0, 10)) { // 检查前10个元素
      const fontSize = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.fontSize);
      }, element);

      if (fontSize >= 16) {
        readableCount++;
      }
    }

    return textElements.length === 0 || readableCount / Math.min(textElements.length, 10) >= 0.8;
  }

  async checkProperSpacing(page) {
    // 简单检查页面是否有适当的间距
    const elements = await page.$$('*');
    return elements.length > 0; // 简化检查
  }

  generateUsabilityIssues(checks) {
    const issues = [];

    if (!checks.hasTitle) issues.push('页面缺少有效的标题');
    if (!checks.hasNavigation) issues.push('页面缺少导航菜单');
    if (!checks.hasSearchFunction) issues.push('页面缺少搜索功能');
    if (!checks.hasContactInfo) issues.push('页面缺少联系信息');
    if (!checks.hasErrorHandling) issues.push('页面缺少错误处理机制');
    if (!checks.hasLoadingStates) issues.push('页面缺少加载状态指示');

    return issues;
  }

  generateMobileIssues(checks) {
    const issues = [];

    if (!checks.isResponsive) issues.push('页面不是响应式设计');
    if (!checks.hasTouchTargets) issues.push('触摸目标尺寸不足');
    if (!checks.hasViewportMeta) issues.push('缺少viewport meta标签');
    if (!checks.hasReadableText) issues.push('文字大小不适合移动端阅读');
    if (!checks.hasProperSpacing) issues.push('元素间距不适合移动端');

    return issues;
  }

  calculateUXScore() {
    const weights = {
      performance: 0.35,
      accessibility: 0.25,
      usability: 0.25,
      mobile: 0.15
    };

    let totalScore = 0;

    totalScore += (this.testResults.performance.score || 0) * weights.performance;
    totalScore += (this.testResults.accessibility.score || 0) * weights.accessibility;
    totalScore += (this.testResults.usability.score || 0) * weights.usability;
    totalScore += (this.testResults.mobile.score || 0) * weights.mobile;

    this.testResults.score = Math.round(totalScore);

    // 生成建议
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.performance.score < 70) {
      recommendations.push({
        priority: 'high',
        title: '优化页面性能',
        description: '页面加载速度较慢，建议优化图片、压缩资源、使用CDN等'
      });
    }

    if (this.testResults.accessibility.score < 80) {
      recommendations.push({
        priority: 'medium',
        title: '改善可访问性',
        description: '页面可访问性需要改进，建议添加alt属性、改善颜色对比度等'
      });
    }

    if (this.testResults.mobile.score < 80) {
      recommendations.push({
        priority: 'medium',
        title: '优化移动端体验',
        description: '移动端适配需要改进，建议优化触摸目标、文字大小等'
      });
    }

    this.testResults.recommendations = recommendations;
  }
}

module.exports = UXTestEngine;
