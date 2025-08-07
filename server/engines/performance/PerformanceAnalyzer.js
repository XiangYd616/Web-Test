/**
 * 性能分析引擎
 * 本地化程度：90%
 * 集成Core Web Vitals、资源分析、网络分析等功能
 */

const puppeteer = require('puppeteer');
const CoreWebVitalsAnalyzer = require('./analyzers/CoreWebVitalsAnalyzer');
const ResourceAnalyzer = require('./analyzers/ResourceAnalyzer');
const AdvancedPerformanceAnalyzer = require('./analyzers/AdvancedPerformanceAnalyzer');
const RealTimePerformanceMonitor = require('./monitors/RealTimePerformanceMonitor');
const PerformanceOptimizationEngine = require('./optimizers/PerformanceOptimizationEngine');

class PerformanceAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      waitUntil: 'networkidle2',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };

    this.browser = null;
    this.page = null;

    // 分析器实例
    this.coreWebVitalsAnalyzer = new CoreWebVitalsAnalyzer();
    this.resourceAnalyzer = new ResourceAnalyzer();
    this.advancedAnalyzer = new AdvancedPerformanceAnalyzer();
    this.realTimeMonitor = new RealTimePerformanceMonitor();
    this.optimizationEngine = new PerformanceOptimizationEngine();
  }

  /**
   * 执行性能分析
   */
  async analyze(url, config = {}) {
    const startTime = Date.now();

    try {
      console.log(`🚀 开始性能分析: ${url}`);

      // 初始化浏览器
      await this.initBrowser();

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'loading',
          message: '加载页面...'
        });
      }

      // 加载页面
      await this.loadPage(url);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 30,
          stage: 'analyzing',
          message: '分析Core Web Vitals...'
        });
      }

      // 执行各项分析
      const coreWebVitals = await this.coreWebVitalsAnalyzer.analyze(this.page);

      if (config.onProgress) {
        config.onProgress({
          percentage: 50,
          stage: 'analyzing',
          message: '分析资源加载...'
        });
      }

      const resourceAnalysis = await this.resourceAnalyzer.analyze(this.page);

      if (config.onProgress) {
        config.onProgress({
          percentage: 70,
          stage: 'analyzing',
          message: '分析网络性能...'
        });
      }

      const networkAnalysis = await this.analyzeNetwork();

      if (config.onProgress) {
        config.onProgress({
          percentage: 85,
          stage: 'calculating',
          message: '计算性能评分...'
        });
      }

      // 执行高级性能分析
      if (config.onProgress) {
        config.onProgress({
          percentage: 90,
          stage: 'advanced-analysis',
          message: '执行高级性能分析...'
        });
      }

      const advancedAnalysis = await this.advancedAnalyzer.analyze(this.page, url);

      // 综合分析结果
      const analysisTime = Date.now() - startTime;
      const results = {
        url,
        timestamp: new Date().toISOString(),
        analysisTime,
        coreWebVitals,
        resources: resourceAnalysis,
        network: networkAnalysis,
        advanced: advancedAnalysis,
        scores: null,
        recommendations: []
      };

      // 计算评分
      results.scores = this.calculateScores(results);

      // 生成建议
      results.recommendations = this.generateRecommendations(results);

      // 生成智能优化建议
      results.optimizationRecommendations = this.optimizationEngine.generateOptimizationRecommendations(results);

      console.log(`✅ 性能分析完成: ${url} - 总评分: ${results.scores.overall.score} - 优化建议: ${results.optimizationRecommendations.prioritizedRecommendations.length}条`);

      return results;
    } catch (error) {
      console.error('性能分析失败:', error);
      throw error;
    }
  }

  /**
   * 启动实时性能监控
   */
  async startRealTimeMonitoring(config) {
    return await this.realTimeMonitor.startMonitoring(config);
  }

  /**
   * 停止实时性能监控
   */
  async stopRealTimeMonitoring(monitorId) {
    return await this.realTimeMonitor.stopMonitoring(monitorId);
  }

  /**
   * 获取性能趋势分析
   */
  getPerformanceTrends(monitorId, timeRange) {
    return this.realTimeMonitor.getPerformanceTrends(monitorId, timeRange);
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(monitorId) {
    return this.realTimeMonitor.getMonitoringStatus(monitorId);
  }

  /**
   * 获取所有监控任务
   */
  getAllMonitors() {
    return this.realTimeMonitor.getAllMonitors();
  }

  /**
   * 生成性能优化建议
   */
  generatePerformanceOptimizations(analysisResults) {
    return this.optimizationEngine.generateOptimizationRecommendations(analysisResults);
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(optimizationRecommendations) {
    return this.optimizationEngine.generateOptimizationReport(optimizationRecommendations);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.realTimeMonitor) {
      await this.realTimeMonitor.cleanup();
    }
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();

      // 设置视口
      await this.page.setViewport(this.options.viewport);

      // 设置用户代理
      await this.page.setUserAgent(this.options.userAgent);

      // 设置超时
      this.page.setDefaultTimeout(this.options.timeout);

      console.log('✅ 浏览器初始化完成');
    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载页面
   */
  async loadPage(url) {
    try {
      // 开始性能监控
      await this.page.coverage.startJSCoverage();
      await this.page.coverage.startCSSCoverage();

      // 导航到页面
      const response = await this.page.goto(url, {
        waitUntil: this.options.waitUntil,
        timeout: this.options.timeout
      });

      if (!response.ok()) {
        throw new Error(`页面加载失败: ${response.status()} ${response.statusText()}`);
      }

      // 等待页面稳定
      await this.page.waitForTimeout(2000);

      console.log('✅ 页面加载完成');
    } catch (error) {
      console.error('❌ 页面加载失败:', error);
      throw error;
    }
  }

  /**
   * 分析网络性能
   */
  async analyzeNetwork() {
    try {
      // 获取网络信息
      const networkInfo = await this.page.evaluate(() => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        return {
          effectiveType: connection?.effectiveType || 'unknown',
          downlink: connection?.downlink || null,
          rtt: connection?.rtt || null,
          saveData: connection?.saveData || false
        };
      });

      // 获取导航时间
      const navigationTiming = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];

        if (!navigation) return null;

        return {
          redirectTime: navigation.redirectEnd - navigation.redirectStart,
          dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
          connectTime: navigation.connectEnd - navigation.connectStart,
          requestTime: navigation.responseStart - navigation.requestStart,
          responseTime: navigation.responseEnd - navigation.responseStart,
          domProcessingTime: navigation.domContentLoadedEventStart - navigation.responseEnd,
          loadEventTime: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        };
      });

      return {
        connection: networkInfo,
        timing: navigationTiming,
        analysis: this.analyzeNetworkTiming(navigationTiming)
      };
    } catch (error) {
      console.error('网络分析失败:', error);
      return {
        connection: null,
        timing: null,
        analysis: null,
        error: error.message
      };
    }
  }

  /**
   * 分析网络时间
   */
  analyzeNetworkTiming(timing) {
    if (!timing) return null;

    const issues = [];
    const recommendations = [];

    // DNS查询时间
    if (timing.dnsTime > 200) {
      issues.push({
        type: 'slow_dns',
        severity: 'medium',
        message: `DNS查询时间过长 (${Math.round(timing.dnsTime)}ms)`
      });
      recommendations.push('考虑使用DNS预解析或更快的DNS服务');
    }

    // 连接时间
    if (timing.connectTime > 500) {
      issues.push({
        type: 'slow_connection',
        severity: 'medium',
        message: `连接建立时间过长 (${Math.round(timing.connectTime)}ms)`
      });
      recommendations.push('优化服务器位置或使用CDN');
    }

    // 服务器响应时间
    if (timing.requestTime > 1000) {
      issues.push({
        type: 'slow_server',
        severity: 'high',
        message: `服务器响应时间过长 (${Math.round(timing.requestTime)}ms)`
      });
      recommendations.push('优化服务器性能或数据库查询');
    }

    // DOM处理时间
    if (timing.domProcessingTime > 2000) {
      issues.push({
        type: 'slow_dom_processing',
        severity: 'medium',
        message: `DOM处理时间过长 (${Math.round(timing.domProcessingTime)}ms)`
      });
      recommendations.push('优化JavaScript执行和DOM操作');
    }

    return {
      issues,
      recommendations,
      score: this.calculateNetworkScore(timing)
    };
  }

  /**
   * 计算网络评分
   */
  calculateNetworkScore(timing) {
    if (!timing) return 0;

    let score = 100;

    // DNS时间扣分
    if (timing.dnsTime > 100) {
      score -= Math.min(10, (timing.dnsTime - 100) / 20);
    }

    // 连接时间扣分
    if (timing.connectTime > 300) {
      score -= Math.min(15, (timing.connectTime - 300) / 50);
    }

    // 服务器响应时间扣分
    if (timing.requestTime > 500) {
      score -= Math.min(25, (timing.requestTime - 500) / 100);
    }

    // DOM处理时间扣分
    if (timing.domProcessingTime > 1000) {
      score -= Math.min(20, (timing.domProcessingTime - 1000) / 200);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 计算综合评分
   */
  calculateScores(results) {
    // 如果有高级分析结果，优先使用高级分析的评分
    if (results.advanced && results.advanced.performanceScore) {
      return {
        ...results.advanced.performanceScore.breakdown,
        overall: {
          score: results.advanced.performanceScore.overall,
          grade: results.advanced.performanceScore.grade,
          rating: results.advanced.performanceScore.rating
        },
        advanced: true
      };
    }

    // 否则使用原有的评分计算方法
    const scores = {
      coreWebVitals: {
        score: results.coreWebVitals.overall.score,
        grade: this.getGrade(results.coreWebVitals.overall.score),
        weight: 0.4
      },
      resources: {
        score: results.resources.performance.performanceScore,
        grade: this.getGrade(results.resources.performance.performanceScore),
        weight: 0.3
      },
      network: {
        score: results.network.analysis?.score || 0,
        grade: this.getGrade(results.network.analysis?.score || 0),
        weight: 0.3
      }
    };

    // 计算总分
    const totalScore = Object.values(scores).reduce((sum, category) => {
      return sum + (category.score * category.weight);
    }, 0);

    scores.overall = {
      score: Math.round(totalScore),
      grade: this.getGrade(Math.round(totalScore))
    };

    return scores;
  }

  /**
   * 获取等级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results) {
    let recommendations = [];

    // 如果有高级分析结果，优先使用高级分析的建议
    if (results.advanced) {
      // 添加瓶颈分析建议
      if (results.advanced.bottleneckAnalysis) {
        recommendations.push(...results.advanced.bottleneckAnalysis.map(bottleneck => ({
          category: 'bottleneck',
          type: bottleneck.type,
          priority: bottleneck.severity === 'critical' ? 'critical' :
            bottleneck.severity === 'high' ? 'high' : 'medium',
          title: bottleneck.description,
          impact: bottleneck.impact,
          solutions: bottleneck.solutions,
          causes: bottleneck.causes
        })));
      }

      // 添加优化机会建议
      if (results.advanced.optimizationOpportunities) {
        recommendations.push(...results.advanced.optimizationOpportunities.map(opportunity => ({
          category: 'optimization',
          type: opportunity.type,
          priority: opportunity.priority,
          title: opportunity.title,
          description: opportunity.description,
          impact: opportunity.impact,
          effort: opportunity.effort,
          techniques: opportunity.techniques,
          currentSize: opportunity.currentSize,
          potentialSavings: opportunity.potentialSavings
        })));
      }

      // 添加Core Web Vitals建议
      if (results.advanced.coreWebVitals && results.advanced.coreWebVitals.recommendations) {
        recommendations.push(...results.advanced.coreWebVitals.recommendations);
      }

      return recommendations;
    }

    // 否则使用原有的建议生成方法
    // Core Web Vitals建议
    if (results.coreWebVitals.lcp.recommendations) {
      recommendations.push(...results.coreWebVitals.lcp.recommendations.map(rec => ({
        category: 'core-web-vitals',
        type: 'lcp',
        priority: 'high',
        title: rec,
        impact: 'high'
      })));
    }

    if (results.coreWebVitals.fid.recommendations) {
      recommendations.push(...results.coreWebVitals.fid.recommendations.map(rec => ({
        category: 'core-web-vitals',
        type: 'fid',
        priority: 'high',
        title: rec,
        impact: 'high'
      })));
    }

    if (results.coreWebVitals.cls.recommendations) {
      recommendations.push(...results.coreWebVitals.cls.recommendations.map(rec => ({
        category: 'core-web-vitals',
        type: 'cls',
        priority: 'high',
        title: rec,
        impact: 'high'
      })));
    }

    // 资源优化建议
    recommendations.push(...results.resources.recommendations);

    // 网络优化建议
    if (results.network.analysis?.recommendations) {
      recommendations.push(...results.network.analysis.recommendations.map(rec => ({
        category: 'network',
        priority: 'medium',
        title: rec,
        impact: 'medium'
      })));
    }

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      console.log('✅ 资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error);
    }
  }
}

module.exports = PerformanceAnalyzer;
