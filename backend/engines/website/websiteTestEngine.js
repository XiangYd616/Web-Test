/**
 * 网站综合测试引擎
 * 提供网站的综合性测试功能
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const PerformanceTestEngine = require('../performance/PerformanceTestEngine');
const SeoTestEngine = require('../seo/SeoTestEngine');
const AccessibilityTestEngine = require('../accessibility/AccessibilityTestEngine');

class WebsiteTestEngine {
  constructor(options = {}) {
    this.name = 'website';
    this.version = '2.0.0';
    this.description = '网站综合测试引擎';
    this.options = options;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    this.performanceEngine = new PerformanceTestEngine();
    this.seoEngine = new SeoTestEngine();
    this.accessibilityEngine = new AccessibilityTestEngine();
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'website-testing',
        'comprehensive-analysis',
        'seo-checking',
        'performance-monitoring'
      ]
    };
  }

  /**
   * 执行网站测试
   */
  async executeTest(config) {
    try {
      const testId = config.testId || `website-${Date.now()}`;
      const { url = 'https://example.com', timeout = 30000 } = config;

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });
      this.updateTestProgress(testId, 5, '获取页面内容', 'started', { url });

      const response = await axios.get(url, { timeout });
      const $ = cheerio.load(response.data);

      // 执行基础网站检查
      const basicChecks = await this.performBasicChecks($);

      // 执行性能检查
      this.updateTestProgress(testId, 35, '执行性能测试', 'running');
      const performanceResult = await this.performanceEngine.executeTest({
        url,
        testId: `${testId}_performance`
      });
      const performanceChecks = performanceResult?.results || {};

      // 执行SEO检查
      this.updateTestProgress(testId, 60, '执行SEO测试', 'running');
      const seoResult = await this.seoEngine.executeTest({
        url,
        testId: `${testId}_seo`
      });
      const seoChecks = seoResult || {};

      // 执行可访问性检查
      this.updateTestProgress(testId, 80, '执行可访问性测试', 'running');
      const accessibilityResult = await this.accessibilityEngine.executeTest({
        url,
        testId: `${testId}_accessibility`
      });
      const accessibilityChecks = accessibilityResult?.results || {};

      const scores = [
        basicChecks?.score,
        performanceChecks?.summary?.score,
        seoChecks?.summary?.score,
        accessibilityChecks?.summary?.score
      ].filter(score => Number.isFinite(score));
      const overallScore = scores.length > 0
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      const results = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore,
          accessibility: accessibilityChecks?.summary?.score ?? basicChecks?.accessibility,
          performance: performanceChecks?.summary?.score ?? 0,
          seo: seoChecks?.summary?.score ?? 0,
          status: 'completed'
        },
        checks: {
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks
        },
        recommendations: this.buildRecommendations({
          basic: basicChecks,
          performance: performanceChecks,
          seo: seoChecks,
          accessibility: accessibilityChecks
        })
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      this.updateTestProgress(testId, 100, '网站测试完成', 'completed');

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        timestamp: new Date().toISOString()
      };

      emitTestComplete(testId, finalResult);
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      return finalResult;
    } catch (error) {
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      emitTestError(config?.testId || 'website', {
        error: error.message,
        stack: error.stack
      });
      if (this.errorCallback) {
        this.errorCallback(error);
      }

      return errorResult;
    }
  }

  /**
   * 执行基础检查
   */
  async performBasicChecks($) {
    const warnings = [];
    const errors = [];

    const images = $('img');
    const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt')).length;
    if (imagesWithoutAlt > 0) {
      warnings.push(`图片缺少alt属性: ${imagesWithoutAlt}个`);
    }

    const links = $('a');
    const linksWithoutText = links.filter((_, el) => !$(el).text().trim()).length;
    if (linksWithoutText > 0) {
      warnings.push(`链接缺少文本描述: ${linksWithoutText}个`);
    }

    const hasViewport = $('meta[name="viewport"]').length > 0;
    if (!hasViewport) {
      errors.push('缺少viewport meta，移动端适配风险');
    }

    const h1Count = $('h1').length;
    if (h1Count === 0) {
      warnings.push('页面缺少H1标题');
    }

    const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5);

    return {
      score,
      accessibility: Math.max(60, score),
      responsiveness: hasViewport ? 85 : 60,
      codeQuality: Math.max(70, score - 10),
      errors,
      warnings
    };
  }

  /**
   * 执行性能检查
   */
  buildRecommendations({ basic, performance, seo, accessibility }) {
    const recommendations = [];
    if (basic?.warnings?.length) {
      recommendations.push(...basic.warnings);
    }
    if (basic?.errors?.length) {
      recommendations.push(...basic.errors);
    }
    if (performance?.recommendations?.length) {
      recommendations.push(...performance.recommendations);
    }
    if (seo?.summary?.recommendations?.length) {
      recommendations.push(...seo.summary.recommendations);
    }
    if (accessibility?.recommendations?.length) {
      recommendations.push(...accessibility.recommendations);
    }

    if (recommendations.length === 0) {
      recommendations.push('页面表现良好，可继续保持当前优化策略');
    }
    return recommendations;
  }

  updateTestProgress(testId, progress, message, stage = 'running', extra = {}) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now()
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: test.status || 'running'
      });
    }
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped'
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback) {
    this.errorCallback = callback;
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('✅ 网站测试引擎清理完成');
  }
}

module.exports = WebsiteTestEngine;
