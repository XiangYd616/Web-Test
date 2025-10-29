/**
 * Lighthouse 性能测试服务
 * 提供真实的 Lighthouse 性能测试功能
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const logger = require('../../utils/logger');

class LighthouseService {
  /**
   * 构造函数
   */
  constructor() {
    this.defaultCategories = ['performance', 'accessibility', 'best-practices', 'seo'];
  }

  /**
   * 运行 Lighthouse 测试
   * @param {string} url - 要测试的 URL
   * @param {Object} options - 测试选项
   * @returns {Promise<Object>} 测试结果
   */
  async runTest(url, options = {}) {
    let chrome = null;

    try {
      logger.info(`🚀 Starting Lighthouse test for: ${url}`);

      // 启动 Chrome
      chrome = await chromeLauncher.launch({
        chromeFlags: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox'
        ],
        logLevel: 'error'
      });

      logger.info(`✅ Chrome launched on port: ${chrome.port}`);

      // 配置 Lighthouse
      const lighthouseOptions = {
        port: chrome.port,
        output: 'json',
        onlyCategories: options.categories || this.defaultCategories,
        logLevel: 'error',
        formFactor: options.device || 'desktop',
        throttling: this.getThrottlingConfig(options.device)
      };

      // 运行 Lighthouse
      const runnerResult = await lighthouse(url, lighthouseOptions);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Lighthouse test failed: No result returned');
      }

      logger.info(`✅ Lighthouse test completed successfully`);

      // 提取并格式化结果
      const formattedResult = this.formatResult(runnerResult.lhr);

      return {
        success: true,
        data: formattedResult,
        metadata: {
          url,
          device: options.device || 'desktop',
          categories: options.categories || this.defaultCategories,
          timestamp: new Date().toISOString(),
          lighthouseVersion: runnerResult.lhr.lighthouseVersion
        }
      };

    } catch (error) {
      logger.error('❌ Lighthouse test failed:', error);
      
      return {
        success: false,
        error: {
          code: 'LIGHTHOUSE_TEST_FAILED',
          message: error.message || 'Lighthouse test execution failed',
          details: error.stack
        }
      };

    } finally {
      // 确保关闭 Chrome
      if (chrome) {
        try {
          await chrome.kill();
          logger.info('✅ Chrome browser closed');
        } catch (killError) {
          logger.error('⚠️ Failed to close Chrome:', killError);
        }
      }
    }
  }

  /**
   * 格式化 Lighthouse 结果
   * @param {Object} lhr - Lighthouse 结果对象
   * @returns {Object} 格式化后的结果
   */
  formatResult(lhr) {
    const result = {
      scores: {},
      metrics: {},
      audits: {},
      diagnostics: {}
    };

    // 提取分数
    if (lhr.categories) {
      Object.keys(lhr.categories).forEach(categoryKey => {
        const category = lhr.categories[categoryKey];
        result.scores[categoryKey] = {
          score: category.score ? Math.round(category.score * 100) : 0,
          title: category.title,
          description: category.description
        };
      });
    }

    // 提取核心指标
    if (lhr.audits) {
      // 性能指标
      const performanceMetrics = {
        'first-contentful-paint': 'FCP',
        'largest-contentful-paint': 'LCP',
        'total-blocking-time': 'TBT',
        'cumulative-layout-shift': 'CLS',
        'speed-index': 'Speed Index',
        'interactive': 'TTI'
      };

      Object.keys(performanceMetrics).forEach(auditKey => {
        if (lhr.audits[auditKey]) {
          const audit = lhr.audits[auditKey];
          result.metrics[performanceMetrics[auditKey]] = {
            value: audit.numericValue,
            displayValue: audit.displayValue,
            score: audit.score ? Math.round(audit.score * 100) : 0
          };
        }
      });

      // 提取关键审计项
      const keyAudits = [
        'uses-optimized-images',
        'uses-responsive-images',
        'offscreen-images',
        'unminified-css',
        'unminified-javascript',
        'unused-css-rules',
        'unused-javascript',
        'modern-image-formats',
        'uses-text-compression',
        'redirects',
        'uses-rel-preconnect',
        'server-response-time',
        'dom-size',
        'critical-request-chains'
      ];

      keyAudits.forEach(auditKey => {
        if (lhr.audits[auditKey]) {
          const audit = lhr.audits[auditKey];
          result.audits[auditKey] = {
            score: audit.score ? Math.round(audit.score * 100) : 0,
            title: audit.title,
            description: audit.description,
            displayValue: audit.displayValue,
            numericValue: audit.numericValue,
            warnings: audit.warnings,
            details: audit.details?.items?.slice(0, 5) // 只保留前5条详情
          };
        }
      });
    }

    // 提取诊断信息
    if (lhr.audits['diagnostics']) {
      result.diagnostics = {
        numRequests: lhr.audits['diagnostics'].details?.items?.[0]?.numRequests,
        numScripts: lhr.audits['diagnostics'].details?.items?.[0]?.numScripts,
        numStylesheets: lhr.audits['diagnostics'].details?.items?.[0]?.numStylesheets,
        numFonts: lhr.audits['diagnostics'].details?.items?.[0]?.numFonts,
        numTasks: lhr.audits['diagnostics'].details?.items?.[0]?.numTasks,
        totalByteWeight: lhr.audits['diagnostics'].details?.items?.[0]?.totalByteWeight,
        mainDocumentTransferSize: lhr.audits['diagnostics'].details?.items?.[0]?.mainDocumentTransferSize
      };
    }

    // 添加性能时间线
    result.performanceTimeline = {
      fetchTime: lhr.fetchTime,
      requestedUrl: lhr.requestedUrl,
      finalUrl: lhr.finalUrl,
      runWarnings: lhr.runWarnings
    };

    return result;
  }

  /**
   * 获取节流配置
   * @param {string} device - 设备类型
   * @returns {Object} 节流配置
   */
  getThrottlingConfig(device) {
    if (device === 'mobile') {
      return {
        rttMs: 150,
        throughputKbps: 1.6 * 1024,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1.6 * 1024,
        uploadThroughputKbps: 750,
        cpuSlowdownMultiplier: 4
      };
    }

    // Desktop 默认配置
    return {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 1
    };
  }

  /**
   * 验证 Lighthouse 是否可用
   * @returns {Promise<Object>} 可用性状态
   */
  async checkAvailability() {
    try {
      // 检查 lighthouse 包
      const lighthousePackage = require('lighthouse/package.json');
      
      // 尝试启动 Chrome
      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless'],
        logLevel: 'error'
      });
      await chrome.kill();

      return {
        available: true,
        version: lighthousePackage.version,
        status: 'ready'
      };

    } catch (error) {
      logger.error('Lighthouse availability check failed:', error);
      
      return {
        available: false,
        status: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * 获取支持的类别
   * @returns {Array<string>} 支持的类别列表
   */
  getSupportedCategories() {
    return ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
  }
}

module.exports = LighthouseService;

