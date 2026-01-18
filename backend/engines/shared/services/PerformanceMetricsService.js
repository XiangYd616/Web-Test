/**
 * 性能指标服务
 * 统一性能指标收集和分析，消除多个引擎中的重复性能分析代码
 */

const BaseService = require('./BaseService');

class PerformanceMetricsService extends BaseService {
  constructor() {
    super('PerformanceMetricsService');
    this.dependencies = [];
    
    // Core Web Vitals阈值
    this.thresholds = {
      coreWebVitals: {
        lcp: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
        fid: { good: 100, needsImprovement: 300 },   // First Input Delay (ms)
        cls: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
        fcp: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint (ms)
        ttfb: { good: 800, needsImprovement: 1800 }  // Time to First Byte (ms)
      },
      performance: {
        pageLoad: { good: 3000, warning: 7000 },
        domContentLoaded: { good: 1500, warning: 3000 },
        loadComplete: { good: 2000, warning: 4000 },
        dnsLookup: { good: 100, warning: 500 },
        connection: { good: 200, warning: 1000 },
        tlsHandshake: { good: 300, warning: 1500 }
      },
      resources: {
        totalSize: { good: 1000000, warning: 3000000 }, // 1MB, 3MB
        imageSize: { good: 500000, warning: 1500000 },   // 500KB, 1.5MB
        jsSize: { good: 300000, warning: 1000000 },      // 300KB, 1MB
        cssSize: { good: 100000, warning: 300000 }       // 100KB, 300KB
      }
    };
  }

  // ... (其他代码保持不变)
}

module.exports = PerformanceMetricsService;
