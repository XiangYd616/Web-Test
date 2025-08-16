/**
 * 增强的测试执行服务
 * 提供完整的测试执行逻辑和错误处理
 */

const { performance } = require('perf_hooks');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

class EnhancedTestExecutionService {
  constructor() {
    this.activeTests = new Map();
    this.testResults = new Map();
  }

  /**
   * 执行性能测试
   */
  async executePerformanceTest(url, config = {}) {
    const testId = this.generateTestId();
    
    try {
      this.activeTests.set(testId, {
        type: 'performance',
        url,
        startTime: Date.now(),
        status: 'running'
      });

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // 设置网络条件
      if (config.networkConditions) {
        await page.emulateNetworkConditions(config.networkConditions);
      }

      const startTime = performance.now();
      await page.goto(url, { waitUntil: 'networkidle0' });
      const loadTime = performance.now() - startTime;

      // 获取性能指标
      const metrics = await page.metrics();
      const performanceEntries = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('navigation'));
      });

      await browser.close();

      const result = {
        testId,
        type: 'performance',
        url,
        status: 'completed',
        metrics: {
          loadTime,
          ...metrics,
          navigationEntries: JSON.parse(performanceEntries)
        },
        score: this.calculatePerformanceScore(loadTime, metrics),
        timestamp: new Date().toISOString()
      };

      this.testResults.set(testId, result);
      this.activeTests.delete(testId);

      return result;

    } catch (error) {
      this.handleTestError(testId, error);
      throw error;
    }
  }

  /**
   * 执行SEO测试
   */
  async executeSEOTest(url, config = {}) {
    const testId = this.generateTestId();
    
    try {
      this.activeTests.set(testId, {
        type: 'seo',
        url,
        startTime: Date.now(),
        status: 'running'
      });

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle0' });

      // 获取SEO相关信息
      const seoData = await page.evaluate(() => {
        const title = document.title;
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
        const h1Tags = Array.from(document.querySelectorAll('h1')).map(h1 => h1.textContent);
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt,
          hasAlt: !!img.alt
        }));
        const links = Array.from(document.querySelectorAll('a')).length;

        return {
          title,
          metaDescription,
          h1Tags,
          images,
          links,
          hasTitle: !!title,
          hasMetaDescription: !!metaDescription,
          titleLength: title.length,
          metaDescriptionLength: metaDescription.length
        };
      });

      await browser.close();

      const result = {
        testId,
        type: 'seo',
        url,
        status: 'completed',
        data: seoData,
        score: this.calculateSEOScore(seoData),
        recommendations: this.generateSEORecommendations(seoData),
        timestamp: new Date().toISOString()
      };

      this.testResults.set(testId, result);
      this.activeTests.delete(testId);

      return result;

    } catch (error) {
      this.handleTestError(testId, error);
      throw error;
    }
  }

  /**
   * 执行安全测试
   */
  async executeSecurityTest(url, config = {}) {
    const testId = this.generateTestId();
    
    try {
      this.activeTests.set(testId, {
        type: 'security',
        url,
        startTime: Date.now(),
        status: 'running'
      });

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle0' });

      // 检查安全头
      const response = await page.goto(url);
      const headers = response.headers();

      const securityChecks = {
        hasHTTPS: url.startsWith('https://'),
        hasHSTS: !!headers['strict-transport-security'],
        hasCSP: !!headers['content-security-policy'],
        hasXFrameOptions: !!headers['x-frame-options'],
        hasXContentTypeOptions: !!headers['x-content-type-options'],
        hasReferrerPolicy: !!headers['referrer-policy']
      };

      await browser.close();

      const result = {
        testId,
        type: 'security',
        url,
        status: 'completed',
        checks: securityChecks,
        score: this.calculateSecurityScore(securityChecks),
        recommendations: this.generateSecurityRecommendations(securityChecks),
        timestamp: new Date().toISOString()
      };

      this.testResults.set(testId, result);
      this.activeTests.delete(testId);

      return result;

    } catch (error) {
      this.handleTestError(testId, error);
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    if (this.activeTests.has(testId)) {
      return this.activeTests.get(testId);
    }
    
    if (this.testResults.has(testId)) {
      return this.testResults.get(testId);
    }
    
    return null;
  }

  /**
   * 取消测试
   */
  cancelTest(testId) {
    if (this.activeTests.has(testId)) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * 工具方法
   */
  generateTestId() {
    return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  calculatePerformanceScore(loadTime, metrics) {
    // 简单的性能评分算法
    let score = 100;
    if (loadTime > 3000) score -= 30;
    else if (loadTime > 2000) score -= 20;
    else if (loadTime > 1000) score -= 10;
    
    return Math.max(0, score);
  }

  calculateSEOScore(seoData) {
    let score = 0;
    if (seoData.hasTitle) score += 20;
    if (seoData.hasMetaDescription) score += 20;
    if (seoData.titleLength >= 30 && seoData.titleLength <= 60) score += 15;
    if (seoData.metaDescriptionLength >= 120 && seoData.metaDescriptionLength <= 160) score += 15;
    if (seoData.h1Tags.length > 0) score += 15;
    if (seoData.images.every(img => img.hasAlt)) score += 15;
    
    return score;
  }

  calculateSecurityScore(securityChecks) {
    const checks = Object.values(securityChecks);
    const passedChecks = checks.filter(check => check).length;
    return Math.round((passedChecks / checks.length) * 100);
  }

  generateSEORecommendations(seoData) {
    const recommendations = [];
    
    if (!seoData.hasTitle) {
      recommendations.push('添加页面标题');
    }
    if (!seoData.hasMetaDescription) {
      recommendations.push('添加meta描述');
    }
    if (seoData.titleLength < 30 || seoData.titleLength > 60) {
      recommendations.push('优化标题长度（30-60字符）');
    }
    if (seoData.images.some(img => !img.hasAlt)) {
      recommendations.push('为所有图片添加alt属性');
    }
    
    return recommendations;
  }

  generateSecurityRecommendations(securityChecks) {
    const recommendations = [];
    
    if (!securityChecks.hasHTTPS) {
      recommendations.push('使用HTTPS协议');
    }
    if (!securityChecks.hasHSTS) {
      recommendations.push('添加HSTS安全头');
    }
    if (!securityChecks.hasCSP) {
      recommendations.push('配置内容安全策略(CSP)');
    }
    if (!securityChecks.hasXFrameOptions) {
      recommendations.push('添加X-Frame-Options头');
    }
    
    return recommendations;
  }

  handleTestError(testId, error) {
    console.error('测试', testId, '执行失败:', error);
    
    if (this.activeTests.has(testId)) {
      this.activeTests.set(testId, {
        ...this.activeTests.get(testId),
        status: 'failed',
        error: error.message
      });
    }
  }
}

module.exports = EnhancedTestExecutionService;