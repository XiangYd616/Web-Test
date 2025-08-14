const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// 安全地导入浏览器安全配置
let browserSecurity;
try {
  browserSecurity = require('../../config/browser-security');
} catch (error) {
  console.warn('⚠️ 无法加载浏览器安全配置，使用默认配置');
  // 提供默认的安全配置
  browserSecurity = {
    getChromeLauncherConfig: () => ({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox', // 默认启用以确保兼容性
        '--disable-setuid-sandbox'
      ]
    }),
    printSecurityWarning: () => {
      console.warn('🔒 使用默认浏览器配置（已禁用沙盒）');
    }
  };
}

/**
 * 真实的Lighthouse性能测试引擎
 */
class RealLighthouseEngine {
  constructor() {
    this.name = 'lighthouse';
    this.version = '10.4.0';
    this.isAvailable = false;
  }

  /**
   * 检查Lighthouse是否可用
   */
  async checkAvailability() {
    try {
      // 检查lighthouse模块是否可用
      const lighthouseVersion = require('lighthouse/package.json').version;
      console.log(`✅ Lighthouse ${lighthouseVersion} is available`);
      this.isAvailable = true;
      return true;
    } catch (error) {
      console.error('❌ Lighthouse not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * 安装Lighthouse
   */
  async install() {
    try {
      console.log('🔧 Installing Lighthouse...');

      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const npmProcess = spawn('npm', ['install', 'lighthouse', 'chrome-launcher'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        npmProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Lighthouse installed successfully');
            this.isAvailable = true;
            resolve(true);
          } else {
            console.error('❌ Lighthouse installation failed');
            resolve(false);
          }
        });

        npmProcess.on('error', (error) => {
          console.error('❌ Lighthouse installation error:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('❌ Lighthouse installation error:', error);
      return false;
    }
  }

  /**
   * 运行Lighthouse性能测试
   */
  async runPerformanceTest(config) {
    const {
      url,
      device = 'desktop',
      categories = ['performance', 'accessibility', 'best-practices', 'seo'],
      throttling = 'simulated3G',
      emulatedFormFactor = 'desktop'
    } = config;

    console.log(`🔍 Starting Lighthouse test: ${url}`);
    console.log(`📱 Device: ${device}, Categories: ${categories.join(', ')}`);

    let chrome;

    try {
      // 启动Chrome浏览器 - 使用安全配置
      browserSecurity.printSecurityWarning();
      const launcherConfig = browserSecurity.getChromeLauncherConfig();

      chrome = await chromeLauncher.launch(launcherConfig);

      // 配置Lighthouse选项
      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: categories,
        port: chrome.port,
        emulatedFormFactor: device === 'mobile' ? 'mobile' : 'desktop',
        throttling: this.getThrottlingConfig(throttling),
        screenEmulation: this.getScreenEmulation(device),
        locale: 'zh-CN'
      };

      // 运行Lighthouse
      console.log('🚀 Running Lighthouse audit...');
      const runnerResult = await lighthouse(url, options);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Lighthouse audit failed - no results returned');
      }

      // 解析结果
      const results = this.parseLighthouseResults(runnerResult.lhr);

      console.log('✅ Lighthouse audit completed');
      return results;

    } catch (error) {
      console.error('❌ Lighthouse test failed:', error);
      throw new Error(`Lighthouse测试执行失败: ${error.message}`);
    } finally {
      // 关闭Chrome浏览器
      if (chrome) {
        await chrome.kill();
      }
    }
  }

  /**
   * 获取网络节流配置
   */
  getThrottlingConfig(throttling) {
    const configs = {
      'simulated3G': {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 675
      },
      'simulated4G': {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 40,
        downloadThroughputKbps: 10240,
        uploadThroughputKbps: 10240
      },
      'none': null
    };

    return configs[throttling] || configs['simulated3G'];
  }

  /**
   * 获取屏幕模拟配置
   */
  getScreenEmulation(device) {
    if (device === 'mobile') {
      return {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        disabled: false
      };
    } else {
      return {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      };
    }
  }

  /**
   * 解析Lighthouse结果
   */
  parseLighthouseResults(lhr) {
    const categories = lhr.categories;
    const audits = lhr.audits;

    // 提取核心指标
    const metrics = {
      // 性能指标
      firstContentfulPaint: this.getMetricValue(audits['first-contentful-paint']),
      largestContentfulPaint: this.getMetricValue(audits['largest-contentful-paint']),
      firstMeaningfulPaint: this.getMetricValue(audits['first-meaningful-paint']),
      speedIndex: this.getMetricValue(audits['speed-index']),
      timeToInteractive: this.getMetricValue(audits['interactive']),
      totalBlockingTime: this.getMetricValue(audits['total-blocking-time']),
      cumulativeLayoutShift: this.getMetricValue(audits['cumulative-layout-shift']),

      // 资源指标
      totalByteWeight: this.getMetricValue(audits['total-byte-weight']),
      unusedCssRules: this.getMetricValue(audits['unused-css-rules']),
      unusedJavaScript: this.getMetricValue(audits['unused-javascript']),

      // 图片优化
      unoptimizedImages: this.getMetricValue(audits['unoptimized-images']),
      modernImageFormats: this.getMetricValue(audits['modern-image-formats']),

      // 网络指标
      serverResponseTime: this.getMetricValue(audits['server-response-time']),
      redirects: this.getMetricValue(audits['redirects'])
    };

    // 提取分数
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100)
    };

    // 提取建议
    const opportunities = this.extractOpportunities(audits);
    const diagnostics = this.extractDiagnostics(audits);

    return {
      url: lhr.finalUrl,
      fetchTime: lhr.fetchTime,
      scores,
      metrics,
      opportunities,
      diagnostics,
      overallScore: Math.round((scores.performance + scores.accessibility + scores.bestPractices + scores.seo) / 4),
      rawLighthouseResult: lhr
    };
  }

  /**
   * 获取指标值
   */
  getMetricValue(audit) {
    if (!audit) return null;

    return {
      value: audit.numericValue || audit.score,
      displayValue: audit.displayValue,
      score: audit.score,
      title: audit.title,
      description: audit.description
    };
  }

  /**
   * 提取优化建议
   */
  extractOpportunities(audits) {
    const opportunityAudits = [
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'unoptimized-images',
      'next-gen-images',
      'offscreen-images',
      'minify-css',
      'minify-js',
      'efficient-animated-content',
      'duplicated-javascript'
    ];

    return opportunityAudits
      .map(auditId => audits[auditId])
      .filter(audit => audit && audit.score !== null && audit.score < 1)
      .map(audit => ({
        id: audit.id,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
        details: audit.details,
        numericValue: audit.numericValue
      }));
  }

  /**
   * 提取诊断信息
   */
  extractDiagnostics(audits) {
    const diagnosticAudits = [
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-long-cache-ttl',
      'total-byte-weight',
      'dom-size',
      'critical-request-chains',
      'user-timings',
      'diagnostics'
    ];

    return diagnosticAudits
      .map(auditId => audits[auditId])
      .filter(audit => audit && audit.score !== null)
      .map(audit => ({
        id: audit.id,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        displayValue: audit.displayValue,
        details: audit.details
      }));
  }

  /**
   * 生成性能报告
   */
  async generateReport(results, format = 'html') {
    try {
      const reportGenerator = require('lighthouse/lighthouse-core/report/report-generator');

      if (format === 'html') {
        const html = reportGenerator.generateReport(results.rawLighthouseResult, 'html');
        return {
          format: 'html',
          content: html,
          filename: `lighthouse-report-${Date.now()}.html`
        };
      } else if (format === 'json') {
        const json = JSON.stringify(results.rawLighthouseResult, null, 2);
        return {
          format: 'json',
          content: json,
          filename: `lighthouse-report-${Date.now()}.json`
        };
      }
    } catch (error) {
      console.error('Failed to generate Lighthouse report:', error);
      throw error;
    }
  }

  /**
   * 运行多页面测试
   */
  async runMultiPageTest(urls, config = {}) {
    const results = [];

    for (const url of urls) {
      try {
        console.log(`🔍 Testing page: ${url}`);
        const result = await this.runPerformanceTest({ ...config, url });
        results.push(result);

        // 添加延迟避免过度负载
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to test ${url}:`, error);
        results.push({
          url,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }
}

module.exports = RealLighthouseEngine;
