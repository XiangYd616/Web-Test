/**
 * 高级性能分析器
 * 本地化程度：100%
 * 深度分析Core Web Vitals、资源加载、网络优化、缓存策略等
 */

class PerformanceAnalyzer {
  constructor() {
    this.performanceThresholds = {
      coreWebVitals: {
        lcp: { good: 2500, needsImprovement: 4000 },
        fid: { good: 100, needsImprovement: 300 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        fcp: { good: 1800, needsImprovement: 3000 },
        ttfb: { good: 800, needsImprovement: 1800 }
      },
      resources: {
        totalSize: { good: 1000000, warning: 3000000 }, // 1MB, 3MB
        imageSize: { good: 500000, warning: 1500000 },   // 500KB, 1.5MB
        jsSize: { good: 300000, warning: 1000000 },      // 300KB, 1MB
        cssSize: { good: 100000, warning: 300000 }       // 100KB, 300KB
      },
      timing: {
        domContentLoaded: { good: 1500, warning: 3000 },
        loadComplete: { good: 3000, warning: 6000 },
        firstPaint: { good: 1000, warning: 2000 }
      }
    };
  }

  /**
   * 执行高级性能分析
   */
  async analyze(page, url) {
    try {
      console.log('🚀 开始高级性能分析...');

      const analysis = {
        url,
        timestamp: new Date().toISOString(),
        coreWebVitals: await this.analyzeCoreWebVitals(page),
        resourceAnalysis: await this.analyzeResources(page),
        networkAnalysis: await this.analyzeNetwork(page),
        renderingAnalysis: await this.analyzeRendering(page),
        cacheAnalysis: await this.analyzeCache(page),
        performanceTimeline: await this.analyzePerformanceTimeline(page),
        bottleneckAnalysis: null,
        optimizationOpportunities: null,
        performanceScore: null
      };

      // 瓶颈分析
      analysis.bottleneckAnalysis = this.identifyBottlenecks(analysis);

      // 优化机会识别
      analysis.optimizationOpportunities = this.identifyOptimizationOpportunities(analysis);

      // 性能评分
      analysis.performanceScore = this.calculatePerformanceScore(analysis);

      console.log('✅ 高级性能分析完成');

      return analysis;

    } catch (error) {
      console.error('❌ 高级性能分析失败:', error);
      throw error;
    }
  }

  /**
   * 深度分析Core Web Vitals
   */
  async analyzeCoreWebVitals(page) {
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {};

        // 获取Navigation Timing API数据
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          metrics.navigationTiming = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            domComplete: navigation.domComplete - navigation.fetchStart
          };
        }

        // 获取Paint Timing API数据
        const paintEntries = performance.getEntriesByType('paint');
        metrics.paintTiming = {};
        paintEntries.forEach(entry => {
          metrics.paintTiming[entry.name.replace('-', '')] = entry.startTime;
        });

        // 获取Layout Shift数据
        let clsValue = 0;
        let clsEntries = [];

        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                  clsEntries.push({
                    value: entry.value,
                    startTime: entry.startTime,
                    sources: entry.sources ? entry.sources.map(source => ({
                      node: source.node ? source.node.tagName : 'unknown',
                      previousRect: source.previousRect,
                      currentRect: source.currentRect
                    })) : []
                  });
                }
              }
            });

            observer.observe({ entryTypes: ['layout-shift'] });

            // 等待一段时间收集数据
            setTimeout(() => {
              observer.disconnect();
              metrics.cls = {
                value: clsValue,
                entries: clsEntries,
                rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor'
              };
            }, 1000);
          } catch (e) {
            metrics.cls = { value: 0, entries: [], rating: 'unknown', error: e.message };
          }
        }

        // 获取Largest Contentful Paint
        if ('PerformanceObserver' in window) {
          try {
            let lcpValue = 0;
            let lcpElement = null;

            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              if (lastEntry) {
                lcpValue = lastEntry.startTime;
                lcpElement = lastEntry.element ? {
                  tagName: lastEntry.element.tagName,
                  id: lastEntry.element.id,
                  className: lastEntry.element.className,
                  url: lastEntry.url
                } : null;
              }
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });

            setTimeout(() => {
              observer.disconnect();
              metrics.lcp = {
                value: lcpValue,
                element: lcpElement,
                rating: lcpValue <= 2500 ? 'good' : lcpValue <= 4000 ? 'needs-improvement' : 'poor'
              };
            }, 1000);
          } catch (e) {
            metrics.lcp = { value: 0, element: null, rating: 'unknown', error: e.message };
          }
        }

        // 模拟等待所有观察器完成
        setTimeout(() => resolve(metrics), 2000);
      });
    });

    return {
      ...metrics,
      analysis: this.analyzeCoreWebVitalsData(metrics),
      recommendations: this.generateCoreWebVitalsRecommendations(metrics)
    };
  }

  /**
   * 资源分析
   */
  async analyzeResources(page) {
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      const resourceData = [];

      entries.forEach(entry => {
        const resource = {
          name: entry.name,
          type: this.getResourceType(entry),
          size: entry.transferSize || 0,
          duration: entry.duration,
          startTime: entry.startTime,
          timing: {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            connect: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart
          },
          cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
          compressed: entry.encodedBodySize < entry.decodedBodySize,
          compressionRatio: entry.decodedBodySize > 0 ?
            (1 - entry.encodedBodySize / entry.decodedBodySize) * 100 : 0
        };

        resourceData.push(resource);
      });

      // 辅助函数
      function getResourceType(entry) {
        const url = entry.name.toLowerCase();
        if (entry.initiatorType) return entry.initiatorType;
        if (url.match(/\.(js|mjs)$/)) return 'script';
        if (url.match(/\.(css)$/)) return 'stylesheet';
        if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
        return 'other';
      }

      return resourceData;
    });

    return {
      resources,
      summary: this.analyzeResourceSummary(resources),
      waterfall: this.generateResourceWaterfall(resources),
      optimization: this.analyzeResourceOptimization(resources)
    };
  }

  /**
   * 网络分析
   */
  async analyzeNetwork(page) {
    const networkMetrics = await page.evaluate(() => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const timing = performance.getEntriesByType('navigation')[0];

      return {
        connection: connection ? {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        } : null,
        timing: timing ? {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          connect: timing.connectEnd - timing.connectStart,
          ssl: timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
          ttfb: timing.responseStart - timing.requestStart,
          download: timing.responseEnd - timing.responseStart,
          total: timing.loadEventEnd - timing.fetchStart
        } : null
      };
    });

    return {
      ...networkMetrics,
      analysis: this.analyzeNetworkPerformance(networkMetrics),
      recommendations: this.generateNetworkRecommendations(networkMetrics)
    };
  }

  /**
   * 渲染分析
   */
  async analyzeRendering(page) {
    const renderingMetrics = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      const metrics = {
        timing: timing ? {
          domLoading: timing.domLoading - timing.fetchStart,
          domInteractive: timing.domInteractive - timing.fetchStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.fetchStart,
          domComplete: timing.domComplete - timing.fetchStart,
          loadEvent: timing.loadEventEnd - timing.fetchStart
        } : null,
        paint: {}
      };

      paintEntries.forEach(entry => {
        metrics.paint[entry.name.replace('-', '')] = entry.startTime;
      });

      // 分析DOM复杂度
      metrics.domComplexity = {
        totalElements: document.querySelectorAll('*').length,
        depth: this.calculateDOMDepth(document.body),
        scripts: document.querySelectorAll('script').length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
        images: document.querySelectorAll('img').length
      };

      return metrics;
    });

    return {
      ...renderingMetrics,
      analysis: this.analyzeRenderingPerformance(renderingMetrics),
      recommendations: this.generateRenderingRecommendations(renderingMetrics)
    };
  }

  /**
   * 缓存分析
   */
  async analyzeCache(page) {
    const cacheMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const cacheAnalysis = {
        total: resources.length,
        cached: 0,
        notCached: 0,
        cacheableButNotCached: 0,
        cacheHitRate: 0,
        resourceTypes: {}
      };

      resources.forEach(resource => {
        const type = this.getResourceType(resource);
        if (!cacheAnalysis.resourceTypes[type]) {
          cacheAnalysis.resourceTypes[type] = { total: 0, cached: 0 };
        }
        cacheAnalysis.resourceTypes[type].total++;

        const isCached = resource.transferSize === 0 && resource.decodedBodySize > 0;
        if (isCached) {
          cacheAnalysis.cached++;
          cacheAnalysis.resourceTypes[type].cached++;
        } else {
          cacheAnalysis.notCached++;

          // 检查是否可缓存但未缓存
          if (this.isCacheable(resource)) {
            cacheAnalysis.cacheableButNotCached++;
          }
        }
      });

      cacheAnalysis.cacheHitRate = cacheAnalysis.total > 0 ?
        (cacheAnalysis.cached / cacheAnalysis.total) * 100 : 0;

      return cacheAnalysis;
    });

    return {
      ...cacheMetrics,
      analysis: this.analyzeCacheEffectiveness(cacheMetrics),
      recommendations: this.generateCacheRecommendations(cacheMetrics)
    };
  }

  /**
   * 性能时间线分析
   */
  async analyzePerformanceTimeline(page) {
    const timeline = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure').concat(
        performance.getEntriesByType('mark')
      );

      return entries.map(entry => ({
        name: entry.name,
        type: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration || 0
      })).sort((a, b) => a.startTime - b.startTime);
    });

    return {
      timeline,
      analysis: this.analyzeTimelineData(timeline),
      criticalPath: this.identifyCriticalPath(timeline)
    };
  }

  // 分析方法
  analyzeCoreWebVitalsData(metrics) {
    const analysis = {
      overall: 'good',
      issues: [],
      strengths: []
    };

    // 分析LCP
    if (metrics.lcp && metrics.lcp.value > 4000) {
      analysis.overall = 'poor';
      analysis.issues.push({
        metric: 'LCP',
        value: metrics.lcp.value,
        threshold: 2500,
        severity: 'high',
        description: 'Largest Contentful Paint过慢，影响用户感知加载速度'
      });
    } else if (metrics.lcp && metrics.lcp.value > 2500) {
      analysis.overall = analysis.overall === 'good' ? 'needs-improvement' : analysis.overall;
      analysis.issues.push({
        metric: 'LCP',
        value: metrics.lcp.value,
        threshold: 2500,
        severity: 'medium',
        description: 'Largest Contentful Paint需要优化'
      });
    }

    // 分析CLS
    if (metrics.cls && metrics.cls.value > 0.25) {
      analysis.overall = 'poor';
      analysis.issues.push({
        metric: 'CLS',
        value: metrics.cls.value,
        threshold: 0.1,
        severity: 'high',
        description: 'Cumulative Layout Shift过高，页面布局不稳定'
      });
    }

    return analysis;
  }

  analyzeResourceSummary(resources) {
    const summary = {
      total: resources.length,
      totalSize: 0,
      byType: {},
      largestResources: [],
      slowestResources: []
    };

    resources.forEach(resource => {
      summary.totalSize += resource.size;

      if (!summary.byType[resource.type]) {
        summary.byType[resource.type] = { count: 0, size: 0 };
      }
      summary.byType[resource.type].count++;
      summary.byType[resource.type].size += resource.size;
    });

    // 找出最大和最慢的资源
    summary.largestResources = resources
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    summary.slowestResources = resources
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    return summary;
  }

  generateResourceWaterfall(resources) {
    return resources
      .sort((a, b) => a.startTime - b.startTime)
      .map(resource => ({
        name: resource.name,
        type: resource.type,
        startTime: resource.startTime,
        duration: resource.duration,
        size: resource.size,
        timing: resource.timing
      }));
  }

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(analysis) {
    const bottlenecks = [];

    // 检查Core Web Vitals瓶颈
    if (analysis.coreWebVitals.lcp && analysis.coreWebVitals.lcp.value > 2500) {
      bottlenecks.push({
        type: 'lcp',
        severity: analysis.coreWebVitals.lcp.value > 4000 ? 'critical' : 'high',
        description: 'Largest Contentful Paint过慢',
        impact: 'high',
        causes: this.identifyLCPCauses(analysis),
        solutions: this.getLCPSolutions()
      });
    }

    if (analysis.coreWebVitals.cls && analysis.coreWebVitals.cls.value > 0.1) {
      bottlenecks.push({
        type: 'cls',
        severity: analysis.coreWebVitals.cls.value > 0.25 ? 'critical' : 'high',
        description: 'Cumulative Layout Shift过高',
        impact: 'high',
        causes: this.identifyCLSCauses(analysis),
        solutions: this.getCLSSolutions()
      });
    }

    // 检查资源瓶颈
    const largeResources = analysis.resourceAnalysis.summary.largestResources
      .filter(resource => resource.size > this.performanceThresholds.resources.totalSize.warning);

    if (largeResources.length > 0) {
      bottlenecks.push({
        type: 'large_resources',
        severity: 'medium',
        description: `发现 ${largeResources.length} 个大型资源`,
        impact: 'medium',
        resources: largeResources,
        solutions: this.getLargeResourceSolutions()
      });
    }

    // 检查网络瓶颈
    if (analysis.networkAnalysis.timing && analysis.networkAnalysis.timing.ttfb > 1000) {
      bottlenecks.push({
        type: 'slow_ttfb',
        severity: 'high',
        description: 'Time to First Byte过慢',
        impact: 'high',
        value: analysis.networkAnalysis.timing.ttfb,
        solutions: this.getTTFBSolutions()
      });
    }

    // 检查缓存瓶颈
    if (analysis.cacheAnalysis.cacheHitRate < 50) {
      bottlenecks.push({
        type: 'poor_caching',
        severity: 'medium',
        description: '缓存命中率过低',
        impact: 'medium',
        cacheHitRate: analysis.cacheAnalysis.cacheHitRate,
        solutions: this.getCacheSolutions()
      });
    }

    return bottlenecks;
  }

  /**
   * 识别优化机会
   */
  identifyOptimizationOpportunities(analysis) {
    const opportunities = [];

    // 图片优化机会
    const imageResources = analysis.resourceAnalysis.resources
      .filter(r => r.type === 'image' && r.size > 100000);

    if (imageResources.length > 0) {
      const totalImageSize = imageResources.reduce((sum, img) => sum + img.size, 0);
      const potentialSavings = totalImageSize * 0.6; // 假设可节省60%

      opportunities.push({
        type: 'image_optimization',
        priority: 'high',
        title: '图片优化',
        description: `优化 ${imageResources.length} 个图片文件`,
        currentSize: totalImageSize,
        potentialSavings,
        impact: 'high',
        effort: 'medium',
        techniques: [
          '使用现代图片格式（WebP、AVIF）',
          '实施响应式图片',
          '启用图片懒加载',
          '压缩图片质量'
        ]
      });
    }

    // JavaScript优化机会
    const jsResources = analysis.resourceAnalysis.resources
      .filter(r => r.type === 'script');
    const totalJSSize = jsResources.reduce((sum, js) => sum + js.size, 0);

    if (totalJSSize > this.performanceThresholds.resources.jsSize.warning) {
      opportunities.push({
        type: 'javascript_optimization',
        priority: 'high',
        title: 'JavaScript优化',
        description: 'JavaScript文件过大，影响加载性能',
        currentSize: totalJSSize,
        potentialSavings: totalJSSize * 0.3,
        impact: 'high',
        effort: 'high',
        techniques: [
          '代码分割和懒加载',
          '移除未使用的代码',
          '启用Gzip/Brotli压缩',
          '使用CDN加速'
        ]
      });
    }

    // CSS优化机会
    const cssResources = analysis.resourceAnalysis.resources
      .filter(r => r.type === 'stylesheet');
    const totalCSSSize = cssResources.reduce((sum, css) => sum + css.size, 0);

    if (totalCSSSize > this.performanceThresholds.resources.cssSize.warning) {
      opportunities.push({
        type: 'css_optimization',
        priority: 'medium',
        title: 'CSS优化',
        description: 'CSS文件可以进一步优化',
        currentSize: totalCSSSize,
        potentialSavings: totalCSSSize * 0.25,
        impact: 'medium',
        effort: 'medium',
        techniques: [
          '移除未使用的CSS',
          '内联关键CSS',
          '延迟加载非关键CSS',
          'CSS压缩和合并'
        ]
      });
    }

    // 缓存优化机会
    if (analysis.cacheAnalysis.cacheableButNotCached > 0) {
      opportunities.push({
        type: 'caching_optimization',
        priority: 'medium',
        title: '缓存策略优化',
        description: `${analysis.cacheAnalysis.cacheableButNotCached} 个资源可以缓存但未缓存`,
        impact: 'medium',
        effort: 'low',
        techniques: [
          '设置适当的Cache-Control头',
          '启用浏览器缓存',
          '使用CDN缓存',
          '实施服务工作者缓存'
        ]
      });
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(analysis) {
    let score = 100;
    const weights = {
      coreWebVitals: 0.5,
      resources: 0.2,
      network: 0.15,
      caching: 0.15
    };

    // Core Web Vitals评分
    let cwvScore = 100;
    if (analysis.coreWebVitals.lcp) {
      const lcpScore = this.calculateMetricScore(
        analysis.coreWebVitals.lcp.value,
        this.performanceThresholds.coreWebVitals.lcp
      );
      cwvScore = Math.min(cwvScore, lcpScore);
    }

    if (analysis.coreWebVitals.cls) {
      const clsScore = this.calculateMetricScore(
        analysis.coreWebVitals.cls.value,
        this.performanceThresholds.coreWebVitals.cls
      );
      cwvScore = Math.min(cwvScore, clsScore);
    }

    // 资源评分
    const resourceScore = this.calculateResourceScore(analysis.resourceAnalysis);

    // 网络评分
    const networkScore = this.calculateNetworkScore(analysis.networkAnalysis);

    // 缓存评分
    const cacheScore = Math.min(100, analysis.cacheAnalysis.cacheHitRate * 2);

    // 加权计算总分
    const finalScore = Math.round(
      cwvScore * weights.coreWebVitals +
      resourceScore * weights.resources +
      networkScore * weights.network +
      cacheScore * weights.caching
    );

    return {
      overall: finalScore,
      breakdown: {
        coreWebVitals: Math.round(cwvScore),
        resources: Math.round(resourceScore),
        network: Math.round(networkScore),
        caching: Math.round(cacheScore)
      },
      grade: this.getGrade(finalScore),
      rating: this.getRating(finalScore)
    };
  }

  // 辅助计算方法
  calculateMetricScore(value, thresholds) {
    if (value <= thresholds.good) return 100;
    if (value <= thresholds.needsImprovement) return 75;
    return Math.max(0, 50 - ((value - thresholds.needsImprovement) / thresholds.needsImprovement) * 50);
  }

  calculateResourceScore(resourceAnalysis) {
    const totalSize = resourceAnalysis.summary.totalSize;
    const thresholds = this.performanceThresholds.resources.totalSize;

    if (totalSize <= thresholds.good) return 100;
    if (totalSize <= thresholds.warning) return 75;
    return Math.max(0, 50 - ((totalSize - thresholds.warning) / thresholds.warning) * 50);
  }

  calculateNetworkScore(networkAnalysis) {
    if (!networkAnalysis.timing) return 80;

    const ttfb = networkAnalysis.timing.ttfb;
    if (ttfb <= 800) return 100;
    if (ttfb <= 1800) return 75;
    return Math.max(0, 50 - ((ttfb - 1800) / 1800) * 50);
  }

  // 原因分析方法
  identifyLCPCauses(analysis) {
    const causes = [];

    if (analysis.resourceAnalysis.summary.largestResources.length > 0) {
      const largestResource = analysis.resourceAnalysis.summary.largestResources[0];
      if (largestResource.size > 1000000) {
        causes.push('大型资源文件影响LCP');
      }
    }

    if (analysis.networkAnalysis.timing && analysis.networkAnalysis.timing.ttfb > 1000) {
      causes.push('服务器响应时间过慢');
    }

    return causes;
  }

  identifyCLSCauses(analysis) {
    const causes = [];

    if (analysis.coreWebVitals.cls && analysis.coreWebVitals.cls.entries) {
      const entries = analysis.coreWebVitals.cls.entries;
      if (entries.some(entry => entry.sources.some(source => source.node === 'IMG'))) {
        causes.push('图片未设置尺寸导致布局偏移');
      }
      if (entries.length > 3) {
        causes.push('多次布局偏移累积');
      }
    }

    return causes;
  }

  // 解决方案方法
  getLCPSolutions() {
    return [
      '优化服务器响应时间',
      '使用CDN加速资源加载',
      '预加载关键资源',
      '优化图片和字体加载',
      '移除阻塞渲染的资源'
    ];
  }

  getCLSSolutions() {
    return [
      '为图片和视频设置明确的尺寸',
      '避免在现有内容上方插入内容',
      '使用transform动画替代改变布局的动画',
      '预留广告和嵌入内容的空间'
    ];
  }

  getLargeResourceSolutions() {
    return [
      '压缩和优化资源文件',
      '实施代码分割',
      '使用现代文件格式',
      '启用Gzip/Brotli压缩',
      '移除未使用的代码'
    ];
  }

  getTTFBSolutions() {
    return [
      '优化服务器配置',
      '使用CDN',
      '实施服务器端缓存',
      '优化数据库查询',
      '减少服务器处理时间'
    ];
  }

  getCacheSolutions() {
    return [
      '设置适当的缓存头',
      '实施浏览器缓存策略',
      '使用CDN缓存',
      '启用服务工作者缓存'
    ];
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Very Poor';
  }

  // 其他分析方法的简化实现
  analyzeResourceOptimization(resources) {
    return {
      uncompressed: resources.filter(r => !r.compressed && r.size > 10000),
      uncached: resources.filter(r => !r.cached && r.type !== 'document'),
      oversized: resources.filter(r => r.size > 500000)
    };
  }

  analyzeNetworkPerformance(networkMetrics) {
    return {
      connectionQuality: networkMetrics.connection ?
        this.assessConnectionQuality(networkMetrics.connection) : 'unknown',
      timingAnalysis: networkMetrics.timing ?
        this.assessTimingPerformance(networkMetrics.timing) : null
    };
  }

  assessConnectionQuality(connection) {
    if (connection.effectiveType === '4g' && connection.downlink > 10) return 'excellent';
    if (connection.effectiveType === '4g') return 'good';
    if (connection.effectiveType === '3g') return 'fair';
    return 'poor';
  }

  assessTimingPerformance(timing) {
    return {
      dns: timing.dns < 50 ? 'good' : timing.dns < 200 ? 'fair' : 'poor',
      connect: timing.connect < 100 ? 'good' : timing.connect < 300 ? 'fair' : 'poor',
      ttfb: timing.ttfb < 800 ? 'good' : timing.ttfb < 1800 ? 'fair' : 'poor'
    };
  }

  analyzeRenderingPerformance(renderingMetrics) {
    return {
      domComplexity: this.assessDOMComplexity(renderingMetrics.domComplexity),
      renderingSpeed: this.assessRenderingSpeed(renderingMetrics.timing)
    };
  }

  assessDOMComplexity(domComplexity) {
    if (domComplexity.totalElements > 3000) return 'high';
    if (domComplexity.totalElements > 1500) return 'medium';
    return 'low';
  }

  assessRenderingSpeed(timing) {
    if (!timing) return 'unknown';

    return {
      domInteractive: timing.domInteractive < 1500 ? 'good' : 'needs-improvement',
      domContentLoaded: timing.domContentLoaded < 2000 ? 'good' : 'needs-improvement'
    };
  }

  analyzeCacheEffectiveness(cacheMetrics) {
    return {
      effectiveness: cacheMetrics.cacheHitRate > 80 ? 'excellent' :
        cacheMetrics.cacheHitRate > 60 ? 'good' :
          cacheMetrics.cacheHitRate > 40 ? 'fair' : 'poor',
      opportunities: cacheMetrics.cacheableButNotCached
    };
  }

  analyzeTimelineData(timeline) {
    return {
      totalEvents: timeline.length,
      longestEvent: timeline.reduce((max, event) =>
        event.duration > max.duration ? event : max, { duration: 0 }),
      criticalEvents: timeline.filter(event => event.duration > 100)
    };
  }

  identifyCriticalPath(timeline) {
    return timeline
      .filter(event => event.duration > 50)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }

  generateCoreWebVitalsRecommendations(metrics) {
    const recommendations = [];

    if (metrics.lcp && metrics.lcp.value > 2500) {
      recommendations.push({
        metric: 'LCP',
        priority: 'high',
        title: '优化Largest Contentful Paint',
        actions: this.getLCPSolutions()
      });
    }

    if (metrics.cls && metrics.cls.value > 0.1) {
      recommendations.push({
        metric: 'CLS',
        priority: 'high',
        title: '减少Cumulative Layout Shift',
        actions: this.getCLSSolutions()
      });
    }

    return recommendations;
  }

  generateNetworkRecommendations(networkMetrics) {
    const recommendations = [];

    if (networkMetrics.timing && networkMetrics.timing.ttfb > 1000) {
      recommendations.push({
        type: 'network',
        priority: 'high',
        title: '优化服务器响应时间',
        actions: this.getTTFBSolutions()
      });
    }

    return recommendations;
  }

  generateRenderingRecommendations(renderingMetrics) {
    const recommendations = [];

    if (renderingMetrics.domComplexity && renderingMetrics.domComplexity.totalElements > 2000) {
      recommendations.push({
        type: 'rendering',
        priority: 'medium',
        title: '简化DOM结构',
        actions: [
          '减少DOM元素数量',
          '优化CSS选择器',
          '避免深层嵌套',
          '使用虚拟滚动'
        ]
      });
    }

    return recommendations;
  }

  generateCacheRecommendations(cacheMetrics) {
    const recommendations = [];

    if (cacheMetrics.cacheHitRate < 60) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: '改善缓存策略',
        actions: this.getCacheSolutions()
      });
    }

    return recommendations;
  }
}

module.exports = PerformanceAnalyzer;
