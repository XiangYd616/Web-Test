/**
 * 性能测试引擎（重构版本）
 * 使用共享服务，避免代码重复
 */

const PerformanceMetricsService = require('../shared/services/PerformanceMetricsService');
const HTMLParsingService = require('../shared/services/HTMLParsingService');

class PerformanceTestEngine {
  constructor() {
    this.name = 'performance';
    this.version = '3.0.0';
    this.description = '性能测试引擎 (使用共享服务)';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Performance-Test/3.0.0'
    };
    
    this.metricsService = new PerformanceMetricsService();
    this.htmlService = new HTMLParsingService();
    this.initialized = false;
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  /**
   * 初始化引擎
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    // 初始化服务
    await this.metricsService.initialize();
    await this.htmlService.initialize();
    
    this.initialized = true;
    return true;
  }

  /**
   * 检查引擎可用性
   */
  async checkAvailability() {
    await this.initialize();

    return {
      available: this.initialized,
      version: this.version,
      features: [
        'page-load-timing',
        'dns-performance',
        'ttfb-measurement',
        'resource-analysis',
        'performance-scoring',
        'core-web-vitals-simulation'
      ],
      services: {
        metrics: this.metricsService.checkAvailability(),
        html: this.htmlService.checkAvailability()
      }
    };
  }

  /**
   * 执行性能测试
   */
  async executeTest(config) {
    const testId = config.testId || `performance-${Date.now()}`;
    try {
      // 确保初始化
      await this.initialize();

      this.updateTestProgress(testId, 5, '初始化性能测试');
      
      const { 
        url = 'https://example.com', 
        iterations = 3,
        includeResources = true,
        fetchHtml = true,
        verbose = false
      } = config;
      
      if (verbose) {
        console.debug(`[PerformanceTestEngine] 测试中: ${url}`);
      }
      
      // 收集性能指标
      const metricsOptions = {
        iterations,
        userAgent: this.options.userAgent,
        timeout: this.options.timeout,
        includeContent: fetchHtml,
        cacheControl: 'no-cache'
      };
      

      
      /**

      
       * if功能函数

      
       * @param {Object} params - 参数对象

      
       * @returns {Promise<Object>} 返回结果

      
       */
      const metricsResult = await this.metricsService.collectMetrics(url, metricsOptions);
      
      if (!metricsResult.success) {
        throw new Error(`性能指标收集失败: ${metricsResult.error}`);
      }
      
      // 分析HTML资源（如果获取了HTML内容）
      let resourceAnalysis = null;
      
      if (includeResources && fetchHtml && metricsResult.data.basicTiming.rawResults[0]?.content) {
        const htmlContent = metricsResult.data.basicTiming.rawResults[0].content;
        
        if (htmlContent) {

          
          /**

          
           * if功能函数

          
           * @param {Object} params - 参数对象

          
           * @returns {Promise<Object>} 返回结果

          
           */
          const parseResult = this.htmlService.parseHTML(htmlContent);
          
          if (parseResult.success) {
            resourceAnalysis = {
              resources: this.analyzeResources(parseResult.$),
              contentAnalysis: this.analyzeContent(parseResult.$, url)
            };
          }
        }
      }
      
      // 格式化结果
      const results = this.formatResults(metricsResult.data, resourceAnalysis);
      
      // 生成优化建议
      results.recommendations = this.generateRecommendations(results);
      
      if (verbose) {
        console.log(`✅ 性能测试完成，评分: ${results.summary.score}/100 (${results.summary.grade})`);
      }
      
      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      this.updateTestProgress(testId, 100, '性能测试完成');
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }
      return finalResult;
    } catch (error) {
      console.error(`❌ 性能测试失败: ${error.message}`);
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      return errorResult;
    }
  }

  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      status: test.status || 'running',
      progress,
      message,
      lastUpdate: Date.now()
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
   * 格式化结果
   */
  formatResults(metrics, resourceAnalysis) {
    const results = {
      url: metrics.url,
      timestamp: metrics.timestamp,
      iterations: metrics.basicTiming.iterations,
      summary: {
        score: metrics.performanceScore.score,
        grade: metrics.performanceScore.grade,
        averageLoadTime: `${Math.round(metrics.basicTiming.totalTime.avg)}ms`,
        fastestLoadTime: `${Math.round(metrics.basicTiming.totalTime.min)}ms`,
        slowestLoadTime: `${Math.round(metrics.basicTiming.totalTime.max)}ms`
      },
      metrics: {
        dns: {
          average: `${Math.round(metrics.basicTiming.dnsTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.dnsTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.dnsTime.max)}ms`
        },
        connection: {
          average: `${Math.round(metrics.basicTiming.connectionTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.connectionTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.connectionTime.max)}ms`
        },
        ttfb: {
          average: `${Math.round(metrics.basicTiming.ttfb.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.ttfb.min)}ms`,
          max: `${Math.round(metrics.basicTiming.ttfb.max)}ms`,
          rating: this.getRating(metrics.basicTiming.ttfb.avg)
        },
        download: {
          average: `${Math.round(metrics.basicTiming.downloadTime.avg)}ms`,
          min: `${Math.round(metrics.basicTiming.downloadTime.min)}ms`,
          max: `${Math.round(metrics.basicTiming.downloadTime.max)}ms`
        },
        contentSize: {
          average: `${Math.round(metrics.basicTiming.contentLength.avg / 1024)}KB`,
          min: `${Math.round(metrics.basicTiming.contentLength.min / 1024)}KB`,
          max: `${Math.round(metrics.basicTiming.contentLength.max / 1024)}KB`
        }
      },
      webVitals: {
        lcp: {
          value: metrics.coreWebVitals.lcp.value,
          rating: metrics.coreWebVitals.lcp.rating
        },
        fcp: {
          value: metrics.coreWebVitals.fcp.value,
          rating: metrics.coreWebVitals.fcp.rating
        },
        cls: {
          value: metrics.coreWebVitals.cls.value,
          rating: metrics.coreWebVitals.cls.rating
        },
        ttfb: {
          value: metrics.coreWebVitals.ttfb.value,
          rating: metrics.coreWebVitals.ttfb.rating
        }
      }
    };
    
    // 添加资源分析（如果有）
    if (resourceAnalysis) {
      results.resources = resourceAnalysis.resources;
      results.contentAnalysis = resourceAnalysis.contentAnalysis;
    }
    
    return results;
  }

  /**
   * 分析资源
   */
  analyzeResources($) {
    // 分析页面中的资源
    const resources = {
      images: [],
      scripts: [],
      stylesheets: [],
      fonts: [],
      other: []
    };
    
    // 提取图片
    $('img[src]').each((i, el) => {
      const $el = $(el);
      resources.images.push({
        src: $el.attr('src'),
        alt: $el.attr('alt') || '',
        width: $el.attr('width') || null,
        height: $el.attr('height') || null,
        loading: $el.attr('loading') || null,
        type: 'image'
      });
    });
    
    // 提取脚本
    $('script[src]').each((i, el) => {
      const $el = $(el);
      resources.scripts.push({
        src: $el.attr('src'),
        type: $el.attr('type') || 'text/javascript',
        async: $el.attr('async') !== undefined,
        defer: $el.attr('defer') !== undefined,
        integrity: $el.attr('integrity') || null
      });
    });
    
    // 提取样式表
    $('link[rel="stylesheet"]').each((i, el) => {
      const $el = $(el);
      resources.stylesheets.push({
        href: $el.attr('href'),
        media: $el.attr('media') || 'all',
        type: $el.attr('type') || 'text/css'
      });
    });
    
    // 提取字体
    $('link[rel="preload"][as="font"]').each((i, el) => {
      const $el = $(el);
      resources.fonts.push({
        href: $el.attr('href'),
        type: $el.attr('type') || null,
        crossOrigin: $el.attr('crossorigin') || null
      });
    });
    
    // 统计信息
    const counts = {
      images: resources.images.length,
      scripts: resources.scripts.length,
      stylesheets: resources.stylesheets.length,
      fonts: resources.fonts.length,
      total: resources.images.length + resources.scripts.length + resources.stylesheets.length + resources.fonts.length
    };
    
    return { resources, counts };
  }

  /**
   * 分析内容
   */
  analyzeContent($, url) {
    void url;
    try {
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const h1 = $('h1').first().text().trim();
      
      // 基本HTML结构分析
      const structureAnalysis = {
        title: {
          content: title,
          length: title.length,
          hasTitle: title.length > 0
        },
        meta: {
          description: metaDescription,
          descriptionLength: metaDescription.length,
          hasDescription: metaDescription.length > 0
        },
        h1: {
          content: h1,
          hasH1: h1.length > 0
        },
        resourceHints: {
          preconnect: $('link[rel="preconnect"]').length,
          prefetch: $('link[rel="prefetch"]').length,
          preload: $('link[rel="preload"]').length,
          dns_prefetch: $('link[rel="dns-prefetch"]').length
        }
      };
      
      return structureAnalysis;
    } catch (error) {
      console.error('内容分析失败:', error);
      return { error: error.message };
    }
  }

  /**
   * 获取性能评级
   */
  getRating(ttfb) {
    if (ttfb <= 800) return 'good';
    if (ttfb <= 1800) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 生成性能优化建议
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    try {
      // TTFB建议
      if (results.metrics.ttfb.rating === 'poor') {
        recommendations.push({
          type: 'server-response',
          priority: 'high',
          title: '优化服务器响应时间',
          description: `服务器响应时间 (TTFB) 为 ${results.metrics.ttfb.average}，远超理想值 (800ms)`,
          impact: '高',
          suggestions: [
            '使用内容分发网络 (CDN)',
            '优化服务器配置和资源使用',
            '改进缓存策略',
            '优化数据库查询',
            '检查第三方服务响应时间'
          ]
        });
      }
      
      // LCP建议
      if (results.webVitals.lcp.rating === 'poor') {
        recommendations.push({
          type: 'largest-contentful-paint',
          priority: 'high',
          title: '优化最大内容绘制 (LCP)',
          description: `最大内容绘制时间为 ${results.webVitals.lcp.value}ms，超过推荐的 2500ms`,
          impact: '高',
          suggestions: [
            '优化关键渲染路径',
            '移除渲染阻塞资源',
            '优化和压缩图片',
            '实现适当的资源提示',
            '使用服务工作器缓存资源'
          ]
        });
      }
      
      // CLS建议
      if (results.webVitals.cls && results.webVitals.cls.rating === 'poor') {
        recommendations.push({
          type: 'cumulative-layout-shift',
          priority: 'medium',
          title: '减少累积布局偏移 (CLS)',
          description: `累积布局偏移值为 ${results.webVitals.cls.value}，超过推荐的 0.1`,
          impact: '中',
          suggestions: [
            '为所有图片设置尺寸属性（宽度和高度）',
            '确保广告元素有保留空间',
            '避免在用户交互之外插入内容',
            '使用transform动画替代影响布局的属性'
          ]
        });
      }
      
      // 资源建议
      if (results.resources && results.resources.counts.total > 30) {
        recommendations.push({
          type: 'resource-optimization',
          priority: 'medium',
          title: '优化资源加载',
          description: `页面包含 ${results.resources.counts.total} 个资源，可能影响加载性能`,
          impact: '中',
          suggestions: [
            '合并和压缩CSS和JavaScript文件',
            '延迟加载非关键JavaScript',
            '优化和压缩图片资源',
            '实现有效的HTTP缓存策略',
            '使用资源优先级提示'
          ]
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('生成建议失败:', error);
      return [];
    }
  }
}

module.exports = PerformanceTestEngine;
