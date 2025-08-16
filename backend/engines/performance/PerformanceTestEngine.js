/**
 * 性能测试工具
 * 真实实现性能测试功能，使用Lighthouse进行专业性能分析
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const Joi = require('joi');

class PerformanceTestEngine {
  constructor() {
    this.name = 'performance';
    this.activeTests = new Map();
    this.defaultTimeout = 60000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      device: Joi.string().valid('desktop', 'mobile').default('desktop'),
      throttling: Joi.string().valid('none', '3g', '4g').default('none'),
      categories: Joi.array().items(
        Joi.string().valid('performance', 'accessibility', 'best-practices', 'seo', 'pwa')
      ).default(['performance']),
      timeout: Joi.number().min(30000).max(300000).default(60000),
      locale: Joi.string().default('zh-CN'),
      onlyCategories: Joi.array().items(Joi.string()).optional(),
      skipAudits: Joi.array().items(Joi.string()).optional()
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * 检查可用性
   */
  async checkAvailability() {
    try {
      // 检查Chrome是否可用
      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox'],
        logLevel: 'silent'
      });

      await chrome.kill();

      return {
        available: true,
        version: {
          lighthouse: require('lighthouse/package.json').version,
          chromeLauncher: require('chrome-launcher/package.json').version
        },
        dependencies: ['lighthouse', 'chrome-launcher', 'puppeteer']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['lighthouse', 'chrome-launcher', 'puppeteer']
      };
    }
  }

  /**
   * 执行性能测试
   */
  async runPerformanceTest(config) {
    const testId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '启动Chrome浏览器');

      // 启动Chrome
      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
        logLevel: 'silent'
      });

      try {
        this.updateTestProgress(testId, 20, '配置Lighthouse');

        // 配置Lighthouse选项
        const options = {
          logLevel: 'silent',
          output: 'json',
          onlyCategories: validatedConfig.categories,
          port: chrome.port,
          locale: validatedConfig.locale
        };

        // 设备配置
        if (validatedConfig.device === 'mobile') {
          options.emulatedFormFactor = 'mobile';
        } else {
          options.emulatedFormFactor = 'desktop';
        }

        this.updateTestProgress(testId, 30, '开始性能分析');

        // 运行Lighthouse
        const runnerResult = await lighthouse(validatedConfig.url, options);

        this.updateTestProgress(testId, 80, '分析测试结果');

        // 解析结果
        const results = this.parseResults(runnerResult, validatedConfig);
        results.testId = testId;
        results.timestamp = new Date().toISOString();
        results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

        this.updateTestProgress(testId, 100, '测试完成');

        this.activeTests.set(testId, {
          status: 'completed',
          progress: 100,
          results
        });

        return results;

      } finally {
        // 确保Chrome进程被关闭
        await chrome.kill();
      }

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        progress: 0,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 解析Lighthouse结果
   */
  parseResults(runnerResult, config) {
    const lhr = runnerResult.lhr;

    const results = {
      url: config.url,
      device: config.device,
      scores: {},
      metrics: {},
      opportunities: [],
      diagnostics: [],
      audits: {}
    };

    // 提取分数
    if (lhr.categories) {
      Object.keys(lhr.categories).forEach(category => {
        results.scores[category] = Math.round(lhr.categories[category].score * 100);
      });
    }

    // 提取核心Web指标
    if (lhr.audits) {
      const coreMetrics = {
        'first-contentful-paint': 'FCP',
        'largest-contentful-paint': 'LCP',
        'first-input-delay': 'FID',
        'cumulative-layout-shift': 'CLS',
        'speed-index': 'Speed Index',
        'total-blocking-time': 'TBT',
        'interactive': 'TTI'
      };

      Object.keys(coreMetrics).forEach(auditId => {
        if (lhr.audits[auditId]) {
          const audit = lhr.audits[auditId];
          results.metrics[coreMetrics[auditId]] = {
            value: audit.numericValue,
            displayValue: audit.displayValue,
            score: audit.score
          };
        }
      });

      // 提取优化建议
      Object.keys(lhr.audits).forEach(auditId => {
        const audit = lhr.audits[auditId];
        if (audit.details && audit.details.type === 'opportunity' && audit.score < 1) {
          results.opportunities.push({
            id: auditId,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            savings: audit.details.overallSavingsMs || 0
          });
        }
      });
    }

    return results;
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
      console.log(`[${this.name.toUpperCase()}-${testId}] ${progress}% - ${message}`);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      test.status = 'cancelled';
      this.activeTests.set(testId, test);
      return true;
    }
    return false;
  }
}

module.exports = PerformanceTestEngine;