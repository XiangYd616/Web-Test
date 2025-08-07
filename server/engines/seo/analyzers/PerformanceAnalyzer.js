/**
 * 性能分析器
 * 本地化程度：90%
 * 分析页面性能指标，包括Core Web Vitals等
 */

class PerformanceAnalyzer {
  constructor() {
    this.thresholds = {
      // Core Web Vitals阈值
      lcp: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
      fid: { good: 100, poor: 300 },   // First Input Delay (ms)
      cls: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
      
      // 其他性能指标阈值
      fcp: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
      tti: { good: 3800, poor: 7300 }, // Time to Interactive (ms)
      si: { good: 3400, poor: 5800 },  // Speed Index (ms)
      tbt: { good: 200, poor: 600 },   // Total Blocking Time (ms)
      
      // 资源大小阈值
      totalSize: { good: 1000000, poor: 3000000 }, // 1MB, 3MB
      imageSize: { good: 500000, poor: 1500000 },  // 500KB, 1.5MB
      jsSize: { good: 300000, poor: 1000000 },     // 300KB, 1MB
      cssSize: { good: 100000, poor: 300000 }      // 100KB, 300KB
    };
  }

  /**
   * 执行性能分析
   */
  async analyze(pageData) {
    const { page, performanceMetrics, loadTime } = pageData;
    
    const analysis = {
      coreWebVitals: await this.analyzeCoreWebVitals(page),
      loadingMetrics: this.analyzeLoadingMetrics(performanceMetrics, loadTime),
      resourceAnalysis: await this.analyzeResources(page),
      networkMetrics: await this.analyzeNetworkMetrics(page),
      renderingMetrics: await this.analyzeRenderingMetrics(page),
      optimizationOpportunities: []
    };
    
    // 识别优化机会
    analysis.optimizationOpportunities = this.identifyOptimizationOpportunities(analysis);
    
    // 计算性能评分
    analysis.score = this.calculatePerformanceScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    
    return analysis;
  }

  /**
   * 分析Core Web Vitals
   */
  async analyzeCoreWebVitals(page) {
    try {
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          // 使用Performance Observer API获取Core Web Vitals
          const metrics = {};
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              metrics.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay (模拟)
          metrics.fid = 0; // 需要真实用户交互才能测量
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            metrics.cls = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              metrics.fcp = entries[0].startTime;
            }
          }).observe({ entryTypes: ['paint'] });
          
          // 等待一段时间收集指标
          setTimeout(() => {
            resolve(metrics);
          }, 3000);
        });
      });
      
      return {
        lcp: {
          value: metrics.lcp || 0,
          rating: this.getRating(metrics.lcp || 0, this.thresholds.lcp),
          isGood: (metrics.lcp || 0) <= this.thresholds.lcp.good
        },
        fid: {
          value: metrics.fid || 0,
          rating: this.getRating(metrics.fid || 0, this.thresholds.fid),
          isGood: (metrics.fid || 0) <= this.thresholds.fid.good,
          note: 'FID需要真实用户交互才能准确测量'
        },
        cls: {
          value: metrics.cls || 0,
          rating: this.getRating(metrics.cls || 0, this.thresholds.cls),
          isGood: (metrics.cls || 0) <= this.thresholds.cls.good
        },
        fcp: {
          value: metrics.fcp || 0,
          rating: this.getRating(metrics.fcp || 0, this.thresholds.fcp),
          isGood: (metrics.fcp || 0) <= this.thresholds.fcp.good
        }
      };
    } catch (error) {
      console.error('Core Web Vitals分析失败:', error);
      return {
        lcp: { value: 0, rating: 'unknown', isGood: false },
        fid: { value: 0, rating: 'unknown', isGood: false },
        cls: { value: 0, rating: 'unknown', isGood: false },
        fcp: { value: 0, rating: 'unknown', isGood: false }
      };
    }
  }

  /**
   * 分析加载指标
   */
  analyzeLoadingMetrics(performanceMetrics, loadTime) {
    const {
      domContentLoaded,
      loadComplete,
      firstPaint,
      firstContentfulPaint,
      transferSize,
      encodedBodySize,
      decodedBodySize
    } = performanceMetrics;
    
    return {
      pageLoadTime: {
        value: loadTime,
        rating: this.getRating(loadTime, { good: 3000, poor: 7000 }),
        isGood: loadTime <= 3000
      },
      domContentLoaded: {
        value: domContentLoaded,
        rating: this.getRating(domContentLoaded, { good: 1500, poor: 3000 }),
        isGood: domContentLoaded <= 1500
      },
      loadComplete: {
        value: loadComplete,
        rating: this.getRating(loadComplete, { good: 2000, poor: 4000 }),
        isGood: loadComplete <= 2000
      },
      firstPaint: {
        value: firstPaint,
        rating: this.getRating(firstPaint, { good: 1000, poor: 2000 }),
        isGood: firstPaint <= 1000
      },
      firstContentfulPaint: {
        value: firstContentfulPaint,
        rating: this.getRating(firstContentfulPaint, this.thresholds.fcp),
        isGood: firstContentfulPaint <= this.thresholds.fcp.good
      },
      transferSize,
      encodedBodySize,
      decodedBodySize,
      compressionRatio: encodedBodySize > 0 ? Math.round((1 - transferSize / encodedBodySize) * 100) : 0
    };
  }

  /**
   * 分析资源
   */
  async analyzeResources(page) {
    try {
      const resources = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const resourceTypes = {};
        let totalSize = 0;
        
        entries.forEach(entry => {
          const type = this.getResourceType(entry.name);
          if (!resourceTypes[type]) {
            resourceTypes[type] = {
              count: 0,
              size: 0,
              resources: []
            };
          }
          
          const size = entry.transferSize || entry.encodedBodySize || 0;
          resourceTypes[type].count++;
          resourceTypes[type].size += size;
          totalSize += size;
          
          resourceTypes[type].resources.push({
            url: entry.name,
            size,
            duration: entry.duration,
            startTime: entry.startTime
          });
        });
        
        return { resourceTypes, totalSize };
      });
      
      // 分析各类资源
      const analysis = {
        total: {
          count: Object.values(resources.resourceTypes).reduce((sum, type) => sum + type.count, 0),
          size: resources.totalSize,
          rating: this.getRating(resources.totalSize, this.thresholds.totalSize),
          isOptimal: resources.totalSize <= this.thresholds.totalSize.good
        }
      };
      
      // 分析各种资源类型
      ['image', 'script', 'stylesheet', 'font', 'document', 'other'].forEach(type => {
        const typeData = resources.resourceTypes[type] || { count: 0, size: 0, resources: [] };
        analysis[type] = {
          count: typeData.count,
          size: typeData.size,
          resources: typeData.resources,
          averageSize: typeData.count > 0 ? Math.round(typeData.size / typeData.count) : 0
        };
        
        // 为主要资源类型添加评级
        if (type === 'image') {
          analysis[type].rating = this.getRating(typeData.size, this.thresholds.imageSize);
          analysis[type].isOptimal = typeData.size <= this.thresholds.imageSize.good;
        } else if (type === 'script') {
          analysis[type].rating = this.getRating(typeData.size, this.thresholds.jsSize);
          analysis[type].isOptimal = typeData.size <= this.thresholds.jsSize.good;
        } else if (type === 'stylesheet') {
          analysis[type].rating = this.getRating(typeData.size, this.thresholds.cssSize);
          analysis[type].isOptimal = typeData.size <= this.thresholds.cssSize.good;
        }
      });
      
      return analysis;
    } catch (error) {
      console.error('资源分析失败:', error);
      return {
        total: { count: 0, size: 0, rating: 'unknown', isOptimal: false },
        image: { count: 0, size: 0, resources: [], averageSize: 0 },
        script: { count: 0, size: 0, resources: [], averageSize: 0 },
        stylesheet: { count: 0, size: 0, resources: [], averageSize: 0 },
        font: { count: 0, size: 0, resources: [], averageSize: 0 },
        document: { count: 0, size: 0, resources: [], averageSize: 0 },
        other: { count: 0, size: 0, resources: [], averageSize: 0 }
      };
    }
  }

  /**
   * 分析网络指标
   */
  async analyzeNetworkMetrics(page) {
    try {
      const networkMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) return {};
        
        return {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
          sslHandshake: navigation.connectEnd - navigation.secureConnectionStart,
          serverResponse: navigation.responseStart - navigation.requestStart,
          contentDownload: navigation.responseEnd - navigation.responseStart,
          redirectTime: navigation.redirectEnd - navigation.redirectStart,
          redirectCount: navigation.redirectCount || 0
        };
      });
      
      return {
        dnsLookup: {
          value: networkMetrics.dnsLookup || 0,
          rating: this.getRating(networkMetrics.dnsLookup || 0, { good: 100, poor: 500 }),
          isGood: (networkMetrics.dnsLookup || 0) <= 100
        },
        tcpConnect: {
          value: networkMetrics.tcpConnect || 0,
          rating: this.getRating(networkMetrics.tcpConnect || 0, { good: 100, poor: 300 }),
          isGood: (networkMetrics.tcpConnect || 0) <= 100
        },
        sslHandshake: {
          value: networkMetrics.sslHandshake || 0,
          rating: this.getRating(networkMetrics.sslHandshake || 0, { good: 100, poor: 300 }),
          isGood: (networkMetrics.sslHandshake || 0) <= 100
        },
        serverResponse: {
          value: networkMetrics.serverResponse || 0,
          rating: this.getRating(networkMetrics.serverResponse || 0, { good: 200, poor: 600 }),
          isGood: (networkMetrics.serverResponse || 0) <= 200
        },
        contentDownload: {
          value: networkMetrics.contentDownload || 0,
          rating: this.getRating(networkMetrics.contentDownload || 0, { good: 500, poor: 1500 }),
          isGood: (networkMetrics.contentDownload || 0) <= 500
        },
        redirects: {
          count: networkMetrics.redirectCount || 0,
          time: networkMetrics.redirectTime || 0,
          hasRedirects: (networkMetrics.redirectCount || 0) > 0
        }
      };
    } catch (error) {
      console.error('网络指标分析失败:', error);
      return {};
    }
  }

  /**
   * 分析渲染指标
   */
  async analyzeRenderingMetrics(page) {
    try {
      const renderingMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) return {};
        
        return {
          domProcessing: navigation.domComplete - navigation.domLoading,
          domInteractive: navigation.domInteractive - navigation.navigationStart,
          domComplete: navigation.domComplete - navigation.navigationStart,
          loadEventTime: navigation.loadEventEnd - navigation.loadEventStart
        };
      });
      
      return {
        domProcessing: {
          value: renderingMetrics.domProcessing || 0,
          rating: this.getRating(renderingMetrics.domProcessing || 0, { good: 1000, poor: 3000 }),
          isGood: (renderingMetrics.domProcessing || 0) <= 1000
        },
        domInteractive: {
          value: renderingMetrics.domInteractive || 0,
          rating: this.getRating(renderingMetrics.domInteractive || 0, { good: 2000, poor: 5000 }),
          isGood: (renderingMetrics.domInteractive || 0) <= 2000
        },
        domComplete: {
          value: renderingMetrics.domComplete || 0,
          rating: this.getRating(renderingMetrics.domComplete || 0, { good: 3000, poor: 7000 }),
          isGood: (renderingMetrics.domComplete || 0) <= 3000
        },
        loadEventTime: {
          value: renderingMetrics.loadEventTime || 0,
          rating: this.getRating(renderingMetrics.loadEventTime || 0, { good: 100, poor: 500 }),
          isGood: (renderingMetrics.loadEventTime || 0) <= 100
        }
      };
    } catch (error) {
      console.error('渲染指标分析失败:', error);
      return {};
    }
  }

  /**
   * 识别优化机会
   */
  identifyOptimizationOpportunities(analysis) {
    const opportunities = [];
    
    // 图片优化
    if (analysis.resourceAnalysis.image && analysis.resourceAnalysis.image.size > this.thresholds.imageSize.good) {
      opportunities.push({
        type: 'image-optimization',
        priority: 'high',
        savings: analysis.resourceAnalysis.image.size - this.thresholds.imageSize.good,
        description: '优化图片大小和格式'
      });
    }
    
    // JavaScript优化
    if (analysis.resourceAnalysis.script && analysis.resourceAnalysis.script.size > this.thresholds.jsSize.good) {
      opportunities.push({
        type: 'javascript-optimization',
        priority: 'medium',
        savings: analysis.resourceAnalysis.script.size - this.thresholds.jsSize.good,
        description: '压缩和优化JavaScript文件'
      });
    }
    
    // CSS优化
    if (analysis.resourceAnalysis.stylesheet && analysis.resourceAnalysis.stylesheet.size > this.thresholds.cssSize.good) {
      opportunities.push({
        type: 'css-optimization',
        priority: 'medium',
        savings: analysis.resourceAnalysis.stylesheet.size - this.thresholds.cssSize.good,
        description: '压缩和优化CSS文件'
      });
    }
    
    // 服务器响应时间优化
    if (analysis.networkMetrics.serverResponse && analysis.networkMetrics.serverResponse.value > 200) {
      opportunities.push({
        type: 'server-response-optimization',
        priority: 'high',
        savings: analysis.networkMetrics.serverResponse.value - 200,
        description: '优化服务器响应时间'
      });
    }
    
    return opportunities;
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // Core Web Vitals评分 (权重: 50%)
    maxScore += 50;
    const cwvScore = (
      (analysis.coreWebVitals.lcp.isGood ? 15 : 5) +
      (analysis.coreWebVitals.fid.isGood ? 10 : 5) +
      (analysis.coreWebVitals.cls.isGood ? 15 : 5) +
      (analysis.coreWebVitals.fcp.isGood ? 10 : 5)
    );
    score += cwvScore;
    
    // 加载性能评分 (权重: 30%)
    maxScore += 30;
    const loadingScore = (
      (analysis.loadingMetrics.pageLoadTime.isGood ? 15 : 5) +
      (analysis.loadingMetrics.domContentLoaded.isGood ? 10 : 5) +
      (analysis.loadingMetrics.firstPaint.isGood ? 5 : 2)
    );
    score += loadingScore;
    
    // 资源优化评分 (权重: 20%)
    maxScore += 20;
    const resourceScore = (
      (analysis.resourceAnalysis.total.isOptimal ? 10 : 3) +
      (analysis.resourceAnalysis.image?.isOptimal ? 5 : 2) +
      (analysis.resourceAnalysis.script?.isOptimal ? 3 : 1) +
      (analysis.resourceAnalysis.stylesheet?.isOptimal ? 2 : 1)
    );
    score += resourceScore;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别性能问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // Core Web Vitals问题
    if (!analysis.coreWebVitals.lcp.isGood) {
      issues.push({
        type: 'core-web-vitals',
        severity: 'critical',
        message: `LCP过慢 (${Math.round(analysis.coreWebVitals.lcp.value)}ms)，影响用户体验`
      });
    }
    
    if (!analysis.coreWebVitals.cls.isGood) {
      issues.push({
        type: 'core-web-vitals',
        severity: 'high',
        message: `CLS过高 (${analysis.coreWebVitals.cls.value.toFixed(3)})，页面布局不稳定`
      });
    }
    
    // 加载性能问题
    if (!analysis.loadingMetrics.pageLoadTime.isGood) {
      issues.push({
        type: 'loading-performance',
        severity: 'high',
        message: `页面加载时间过长 (${Math.round(analysis.loadingMetrics.pageLoadTime.value)}ms)`
      });
    }
    
    // 资源优化问题
    if (analysis.resourceAnalysis.total && !analysis.resourceAnalysis.total.isOptimal) {
      issues.push({
        type: 'resource-optimization',
        severity: 'medium',
        message: `页面总大小过大 (${Math.round(analysis.resourceAnalysis.total.size / 1024)}KB)`
      });
    }
    
    return issues;
  }

  // 辅助方法
  getRating(value, threshold) {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  getResourceType(url) {
    if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url)) return 'image';
    if (/\.(js|mjs)$/i.test(url)) return 'script';
    if (/\.css$/i.test(url)) return 'stylesheet';
    if (/\.(woff|woff2|ttf|otf|eot)$/i.test(url)) return 'font';
    if (/\.(html|htm)$/i.test(url)) return 'document';
    return 'other';
  }
}

module.exports = PerformanceAnalyzer;
