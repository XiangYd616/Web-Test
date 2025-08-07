/**
 * 兼容性测试分析器
 * 本地化程度：100%
 * 集成多浏览器测试、截图对比、CSS特性检测等功能
 */

const BrowserManager = require('./managers/BrowserManager');
const ScreenshotComparator = require('./analyzers/ScreenshotComparator');
const CSSFeatureDetector = require('./analyzers/CSSFeatureDetector');
const ResponsiveDesignAnalyzer = require('./analyzers/ResponsiveDesignAnalyzer');

class CompatibilityAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      viewport: { width: 1920, height: 1080 },
      browsers: ['chrome', 'firefox', 'safari', 'edge'],
      versions: ['latest'],
      screenshotComparison: true,
      cssFeatureDetection: true,
      ...options
    };

    this.browserManager = new BrowserManager(this.options);
    this.screenshotComparator = new ScreenshotComparator(this.options.screenshot);
    this.cssFeatureDetector = new CSSFeatureDetector();
    this.responsiveDesignAnalyzer = new ResponsiveDesignAnalyzer();

    // 测试结果存储
    this.testResults = new Map();
  }

  /**
   * 执行兼容性分析
   */
  async analyze(url, config = {}) {
    const startTime = Date.now();

    try {
      console.log(`🌐 开始兼容性分析: ${url}`);

      const analysisConfig = { ...this.options, ...config };
      const results = {
        url,
        timestamp: new Date().toISOString(),
        analysisTime: 0,
        browsers: [],
        screenshots: [],
        cssFeatures: [],
        visualComparison: null,
        featureComparison: null,
        scores: null,
        recommendations: []
      };

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'initializing',
          message: '初始化浏览器...'
        });
      }

      // 启动所有浏览器并创建页面
      const browserPages = await this.initializeBrowsers(analysisConfig);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 30,
          stage: 'testing',
          message: '在各浏览器中加载页面...'
        });
      }

      // 在所有浏览器中加载页面
      const loadResults = await this.loadPageInAllBrowsers(browserPages, url, config);
      results.browsers = loadResults;

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 50,
          stage: 'capturing',
          message: '捕获截图...'
        });
      }

      // 截图对比分析
      if (analysisConfig.screenshotComparison) {
        const screenshotResults = await this.performScreenshotAnalysis(browserPages, config);
        results.screenshots = screenshotResults.screenshots;
        results.visualComparison = screenshotResults.comparison;
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 70,
          stage: 'detecting',
          message: '检测CSS特性支持...'
        });
      }

      // CSS特性检测
      if (analysisConfig.cssFeatureDetection) {
        const featureResults = await this.performFeatureDetection(browserPages, config);
        results.cssFeatures = featureResults.detections;
        results.featureComparison = featureResults.comparison;
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 75,
          stage: 'responsive',
          message: '分析响应式设计...'
        });
      }

      // 响应式设计分析
      if (analysisConfig.responsiveDesign !== false) {
        results.responsiveDesign = await this.responsiveDesignAnalyzer.analyzeResponsiveDesign(url, config.responsiveOptions);
      }

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 85,
          stage: 'analyzing',
          message: '分析兼容性问题...'
        });
      }

      // 分析兼容性问题
      const compatibilityIssues = this.analyzeCompatibilityIssues(results);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 95,
          stage: 'calculating',
          message: '计算兼容性评分...'
        });
      }

      // 计算评分
      results.scores = this.calculateScores(results, compatibilityIssues);

      // 生成建议
      results.recommendations = this.generateRecommendations(results, compatibilityIssues);

      // 计算分析时间
      results.analysisTime = Date.now() - startTime;

      console.log(`✅ 兼容性分析完成，测试了 ${browserPages.length} 个浏览器`);

      return results;

    } catch (error) {
      console.error(`❌ 兼容性分析失败: ${url}`, error);
      throw error;
    } finally {
      // 清理浏览器资源
      await this.cleanup();
    }
  }

  /**
   * 初始化浏览器
   */
  async initializeBrowsers(config) {
    const browserPages = [];

    for (const browserType of config.browsers) {
      for (const version of config.versions) {
        try {
          const { pageKey, page } = await this.browserManager.createPage(browserType, version);

          browserPages.push({
            browserType,
            version,
            pageKey,
            page,
            initialized: true
          });

          console.log(`✅ 浏览器初始化成功: ${browserType} ${version}`);

        } catch (error) {
          console.warn(`⚠️ 浏览器初始化失败: ${browserType} ${version}`, error.message);

          browserPages.push({
            browserType,
            version,
            pageKey: null,
            page: null,
            initialized: false,
            error: error.message
          });
        }
      }
    }

    return browserPages;
  }

  /**
   * 在所有浏览器中加载页面
   */
  async loadPageInAllBrowsers(browserPages, url, config) {
    const loadResults = [];

    for (const browserPage of browserPages) {
      if (!browserPage.initialized) {
        loadResults.push({
          browserType: browserPage.browserType,
          version: browserPage.version,
          success: false,
          error: browserPage.error,
          loadTime: 0
        });
        continue;
      }

      try {
        const startTime = Date.now();

        // 导航到URL
        const navigationResult = await this.browserManager.navigateToURL(
          browserPage.pageKey,
          url,
          { waitUntil: 'networkidle', timeout: config.timeout }
        );

        const loadTime = Date.now() - startTime;

        // 获取页面信息
        const pageInfo = await this.browserManager.getPageInfo(browserPage.pageKey);

        loadResults.push({
          browserType: browserPage.browserType,
          version: browserPage.version,
          success: navigationResult.success,
          status: navigationResult.status,
          loadTime,
          pageInfo,
          error: null
        });

        // 更新进度
        if (config.onProgress) {
          const progress = 30 + Math.round((loadResults.length / browserPages.length) * 20);
          config.onProgress({
            percentage: progress,
            stage: 'testing',
            message: `页面加载完成: ${browserPage.browserType} ${browserPage.version}`
          });
        }

      } catch (error) {
        console.error(`页面加载失败: ${browserPage.browserType} ${browserPage.version}`, error);

        loadResults.push({
          browserType: browserPage.browserType,
          version: browserPage.version,
          success: false,
          error: error.message,
          loadTime: 0
        });
      }
    }

    return loadResults;
  }

  /**
   * 执行截图分析
   */
  async performScreenshotAnalysis(browserPages, config) {
    const screenshots = [];
    const screenshotData = [];

    // 在所有浏览器中截图
    for (const browserPage of browserPages) {
      if (!browserPage.initialized) {
        continue;
      }

      try {
        const screenshot = await this.browserManager.takeScreenshot(browserPage.pageKey, {
          fullPage: true
        });

        const screenshotInfo = {
          browserType: browserPage.browserType,
          version: browserPage.version,
          timestamp: new Date().toISOString(),
          size: screenshot.length
        };

        screenshots.push(screenshotInfo);
        screenshotData.push({
          info: screenshotInfo,
          data: screenshot
        });

      } catch (error) {
        console.error(`截图失败: ${browserPage.browserType} ${browserPage.version}`, error);
      }
    }

    // 执行截图对比
    let comparison = null;
    if (screenshotData.length >= 2) {
      try {
        comparison = await this.screenshotComparator.batchCompare(screenshotData);
      } catch (error) {
        console.error('截图对比失败:', error);
      }
    }

    return {
      screenshots,
      comparison
    };
  }

  /**
   * 执行CSS特性检测
   */
  async performFeatureDetection(browserPages, config) {
    const detections = [];

    // 在所有浏览器中检测CSS特性
    for (const browserPage of browserPages) {
      if (!browserPage.initialized) {
        continue;
      }

      try {
        const detection = await this.cssFeatureDetector.detectFeatures(browserPage.page);

        detections.push({
          browserType: browserPage.browserType,
          version: browserPage.version,
          detection,
          success: true
        });

      } catch (error) {
        console.error(`CSS特性检测失败: ${browserPage.browserType} ${browserPage.version}`, error);

        detections.push({
          browserType: browserPage.browserType,
          version: browserPage.version,
          detection: null,
          success: false,
          error: error.message
        });
      }
    }

    // 比较特性支持差异
    let comparison = null;
    if (detections.length >= 2) {
      try {
        comparison = this.cssFeatureDetector.compareFeatureSupport(detections);
      } catch (error) {
        console.error('特性对比失败:', error);
      }
    }

    return {
      detections,
      comparison
    };
  }

  /**
   * 分析兼容性问题
   */
  analyzeCompatibilityIssues(results) {
    const issues = [];

    // 分析加载问题
    const loadIssues = results.browsers.filter(b => !b.success);
    loadIssues.forEach(issue => {
      issues.push({
        type: 'load_failure',
        severity: 'high',
        browser: `${issue.browserType} ${issue.version}`,
        description: `页面在 ${issue.browserType} ${issue.version} 中加载失败`,
        error: issue.error
      });
    });

    // 分析视觉差异
    if (results.visualComparison) {
      results.visualComparison.forEach(comparison => {
        if (comparison.comparison.summary.diffPercentage > 5) {
          issues.push({
            type: 'visual_difference',
            severity: comparison.comparison.summary.diffPercentage > 20 ? 'high' : 'medium',
            browsers: `${comparison.baseInfo.browserType} vs ${comparison.compareInfo.browserType}`,
            description: `视觉差异: ${comparison.comparison.summary.diffPercentage.toFixed(2)}%`,
            differences: comparison.comparison.differences.length
          });
        }
      });
    }

    // 分析CSS特性支持差异
    if (results.featureComparison) {
      Object.entries(results.featureComparison.featureComparison).forEach(([feature, data]) => {
        if (data.partialSupport) {
          const supportedBrowsers = Object.entries(data.browserSupport)
            .filter(([browser, supported]) => supported)
            .map(([browser]) => browser);

          const unsupportedBrowsers = Object.entries(data.browserSupport)
            .filter(([browser, supported]) => !supported)
            .map(([browser]) => browser);

          issues.push({
            type: 'feature_support_difference',
            severity: 'medium',
            feature: data.name,
            category: data.category,
            description: `${data.name} 特性支持不一致`,
            supportedBrowsers,
            unsupportedBrowsers
          });
        }
      });
    }

    return issues;
  }

  /**
   * 计算兼容性评分
   */
  calculateScores(results, issues) {
    const scores = {
      loading: 100,
      visual: 100,
      features: 100,
      overall: 100
    };

    // 加载评分
    const totalBrowsers = results.browsers.length;
    const successfulLoads = results.browsers.filter(b => b.success).length;
    scores.loading = totalBrowsers > 0 ? Math.round((successfulLoads / totalBrowsers) * 100) : 0;

    // 视觉评分
    if (results.visualComparison && results.visualComparison.length > 0) {
      const avgDifference = results.visualComparison.reduce((sum, comp) =>
        sum + comp.comparison.summary.diffPercentage, 0) / results.visualComparison.length;
      scores.visual = Math.max(0, Math.round(100 - avgDifference * 2));
    }

    // 特性评分
    if (results.featureComparison) {
      const features = Object.values(results.featureComparison.featureComparison);
      const universalFeatures = features.filter(f => f.universalSupport).length;
      scores.features = features.length > 0 ? Math.round((universalFeatures / features.length) * 100) : 100;
    }

    // 总体评分
    scores.overall = Math.round((scores.loading * 0.4 + scores.visual * 0.3 + scores.features * 0.3));

    return scores;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results, issues) {
    const recommendations = [];

    // 基于问题生成建议
    issues.forEach(issue => {
      switch (issue.type) {
        case 'load_failure':
          recommendations.push({
            priority: 'high',
            category: 'loading',
            title: `修复 ${issue.browser} 中的加载问题`,
            description: issue.description,
            solution: '检查浏览器兼容性和JavaScript错误'
          });
          break;

        case 'visual_difference':
          recommendations.push({
            priority: 'medium',
            category: 'visual',
            title: '修复视觉差异',
            description: `${issue.browsers} 之间存在 ${issue.differences} 个视觉差异`,
            solution: '检查CSS样式和布局兼容性'
          });
          break;

        case 'feature_support_difference':
          recommendations.push({
            priority: 'medium',
            category: 'features',
            title: `为 ${issue.feature} 提供兼容性方案`,
            description: issue.description,
            solution: '使用Polyfill或提供降级方案'
          });
          break;
      }
    });

    // 基于评分生成通用建议
    if (results.scores.overall < 80) {
      recommendations.push({
        priority: 'high',
        category: 'general',
        title: '提高整体兼容性',
        description: '网站在多浏览器兼容性方面需要改进',
        solution: '实施渐进增强和优雅降级策略'
      });
    }

    return recommendations;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      await this.browserManager.closeAll();
      console.log('✅ 兼容性测试资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error);
    }
  }
}

module.exports = CompatibilityAnalyzer;
