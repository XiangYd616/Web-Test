/**
 * 性能指标服务
 * 统一性能指标收集和分析，消除多个引擎中的重复性能分析代码
 */

import BaseService from './BaseService.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { performance } from 'perf_hooks';
import dns from 'dns';
import { promisify } from 'util';


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
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

  /**
   * 收集完整的性能指标
   */
  async collectMetrics(url, options = {}) {
    try {
      const metrics = {
        url,
        timestamp: new Date().toISOString(),
        basicTiming: null,
        networkMetrics: null,
        coreWebVitals: null,
        resourceMetrics: null,
        performanceScore: null
      };

      // 基础时间指标
      metrics.basicTiming = await this.measureBasicTiming(url, options);
      
      // 网络指标
      metrics.networkMetrics = await this.measureNetworkMetrics(url, options);
      
      // Core Web Vitals模拟
      metrics.coreWebVitals = this.simulateCoreWebVitals(metrics.basicTiming, metrics.networkMetrics);
      
      // 资源指标（如果提供了HTML内容）
      if (options.htmlContent) {
        metrics.resourceMetrics = this.analyzeResourceMetrics(options.htmlContent);
      }
      
      // 计算综合性能评分
      metrics.performanceScore = this.calculatePerformanceScore(metrics);
      
      return this.createSuccessResponse(metrics, {
        iterations: options.iterations || 1,
        options
      });
    } catch (error) {
      return this.handleError(error, 'collectMetrics');
    }
  }

  /**
   * 测量基础时间指标
   */
  async measureBasicTiming(url, options = {}) {
    const iterations = options.iterations || 3;
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const iteration = await this.singleIterationTiming(url, options);
      results.push(iteration);
      
      // 避免过快请求
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return this.aggregateTimingResults(results);
  }

  /**
   * 单次时间测量
   */
  async singleIterationTiming(url, options = {}) {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const metrics = {
      startTime: 0,
      dnsTime: 0,
      connectionTime: 0,
      tlsTime: 0,
      ttfb: 0,
      downloadTime: 0,
      totalTime: 0,
      contentLength: 0,
      statusCode: 0
    };
    
    // DNS查询时间
    const dnsStart = performance.now();
    const dnsLookup = promisify(dns.lookup);
    try {
      await dnsLookup(urlObj.hostname);
    } catch (error) {
      // 忽略DNS错误，可能已缓存
    }
    metrics.dnsTime = performance.now() - dnsStart;
    
    // HTTP请求
    return new Promise((resolve) => {
      const startTime = performance.now();
      metrics.startTime = startTime;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': options.userAgent || 'PerformanceMetricsService/1.0.0',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': options.cacheControl || 'no-cache',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: options.timeout || 30000
      };
      
      const req = client.request(requestOptions, (res) => {
        const firstByteTime = performance.now();
        metrics.ttfb = firstByteTime - startTime;
        metrics.statusCode = res.statusCode;
        
        let data = '';
        let contentLength = 0;
        
        res.on('data', (chunk) => {
          data += chunk;
          contentLength += chunk.length;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          metrics.totalTime = endTime - startTime;
          metrics.downloadTime = endTime - firstByteTime;
          metrics.contentLength = contentLength;

          
          /**

          
           * if功能函数

          
           * @param {Object} params - 参数对象

          
           * @returns {Promise<Object>} 返回结果

          
           */
          metrics.connectionTime = firstByteTime - startTime - metrics.dnsTime;
          
          if (isHttps) {
            // 模拟TLS握手时间
            metrics.tlsTime = Math.max(0, metrics.connectionTime * 0.3);
            metrics.connectionTime -= metrics.tlsTime;
          }
          
          resolve({
            ...metrics,
            content: options.includeContent ? data : null,
            headers: res.headers,
            success: true
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          ...metrics,
          error: error.message,
          success: false
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          ...metrics,
          error: '请求超时',
          success: false
        });
      });
      
      req.end();
    });
  }

  /**
   * 聚合时间结果
   */
  aggregateTimingResults(results) {
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      return {
        success: false,
        error: '所有测试迭代都失败了',
        attempts: results.length
      };
    }
    
    const aggregate = (field) => {
      const values = successful.map(r => r[field]).filter(v => typeof v === 'number');
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        median: this.calculateMedian(values)
      };
    };
    
    return {
      iterations: results.length,
      successful: successful.length,
      dnsTime: aggregate('dnsTime'),
      connectionTime: aggregate('connectionTime'),
      tlsTime: aggregate('tlsTime'),
      ttfb: aggregate('ttfb'),
      downloadTime: aggregate('downloadTime'),
      totalTime: aggregate('totalTime'),
      contentLength: aggregate('contentLength'),
      statusCode: successful[0].statusCode,
      headers: successful[0].headers,
      success: true,
      rawResults: results
    };
  }

  /**
   * 测量网络指标
   */
  async measureNetworkMetrics(url, options = {}) {
    const urlObj = new URL(url);
    
    try {
      // 网络连接测试
      const connectionTest = await this.testConnection(urlObj.hostname, urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80));
      
      // 带宽估算（粗略）
      const bandwidthTest = await this.estimateBandwidth(url, options);
      
      return {
        connection: connectionTest,
        bandwidth: bandwidthTest,
        latency: connectionTest.averageTime,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'measureNetworkMetrics');
    }
  }

  /**
   * 测试连接
   */
  async testConnection(hostname, port, tests = 3) {
    const results = [];
    
    for (let i = 0; i < tests; i++) {
      const startTime = performance.now();
      
      try {
        const net = await import('net');
        const socket = net.createConnection(port, hostname);
        
        await new Promise((resolve, reject) => {
          socket.on('connect', () => {
            socket.end();
            resolve();
          });
          socket.on('error', reject);
          setTimeout(() => reject(new Error('连接超时')), 5000);
        });
        
        results.push(performance.now() - startTime);
      } catch (error) {
        results.push(-1); // 标记失败
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const successful = results.filter(r => r >= 0);
    
    return {
      tests,
      successful: successful.length,
      averageTime: successful.length > 0 ? successful.reduce((sum, t) => sum + t, 0) / successful.length : -1,
      minTime: successful.length > 0 ? Math.min(...successful) : -1,
      maxTime: successful.length > 0 ? Math.max(...successful) : -1,
      success: successful.length > 0
    };
  }

  /**
   * 估算带宽
   */
  async estimateBandwidth(url, options = {}) {
    try {
      // 下载小文件测试带宽
      const startTime = performance.now();
      const result = await this.singleIterationTiming(url, { ...options, includeContent: false });
      const endTime = performance.now();
      
      if (result.success && result.contentLength > 0) {
        const timeInSeconds = (endTime - startTime) / 1000;
        const sizeInBits = result.contentLength * 8;
        const bandwidthBps = sizeInBits / timeInSeconds;
        
        return {
          estimatedBandwidth: {
            bps: Math.round(bandwidthBps),
            kbps: Math.round(bandwidthBps / 1024),
            mbps: Math.round(bandwidthBps / 1024 / 1024 * 100) / 100
          },
          testSize: result.contentLength,
          testDuration: Math.round(timeInSeconds * 1000),
          accuracy: result.contentLength > 10000 ? 'good' : 'low',
          success: true
        };
      }
      
      return {
        success: false,
        error: '无法获取有效的内容长度'
      };
    } catch (error) {
      return this.handleError(error, 'estimateBandwidth');
    }
  }

  /**
   * 模拟Core Web Vitals
   */
  simulateCoreWebVitals(basicTiming, networkMetrics) {
    if (!basicTiming.success) {
      return {
        success: false,
        error: 'Basic timing data not available'
      };
    }
    
    const timing = basicTiming;
    
    // 基于实际测量数据模拟Core Web Vitals
    const lcp = timing.ttfb.avg + timing.downloadTime.avg + 500; // 模拟LCP
    const fcp = timing.ttfb.avg + 200; // 模拟FCP
    const cls = Math.random() * 0.1; // 随机CLS值，实际需要浏览器测量
    const fid = Math.random() * 50; // 随机FID值，实际需要用户交互
    const ttfb = timing.ttfb.avg;
    
    return {
      lcp: {
        value: Math.round(lcp),
        rating: this.getRating(lcp, this.thresholds.coreWebVitals.lcp),
        threshold: this.thresholds.coreWebVitals.lcp
      },
      fcp: {
        value: Math.round(fcp),
        rating: this.getRating(fcp, this.thresholds.coreWebVitals.fcp),
        threshold: this.thresholds.coreWebVitals.fcp
      },
      cls: {
        value: Math.round(cls * 1000) / 1000,
        rating: this.getRating(cls, this.thresholds.coreWebVitals.cls),
        threshold: this.thresholds.coreWebVitals.cls
      },
      fid: {
        value: Math.round(fid),
        rating: this.getRating(fid, this.thresholds.coreWebVitals.fid),
        threshold: this.thresholds.coreWebVitals.fid,
        note: 'FID需要真实用户交互才能准确测量'
      },
      ttfb: {
        value: Math.round(ttfb),
        rating: this.getRating(ttfb, this.thresholds.coreWebVitals.ttfb),
        threshold: this.thresholds.coreWebVitals.ttfb
      },
      success: true
    };
  }

  /**
   * 分析资源指标
   */
  analyzeResourceMetrics(htmlContent) {
    try {
      const resources = {
        images: [],
        scripts: [],
        stylesheets: [],
        other: []
      };
      
      // 简单的正则匹配提取资源
      const imgMatches = htmlContent.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      const scriptMatches = htmlContent.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      const cssMatches = htmlContent.match(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi) || [];
      
      resources.images = imgMatches.map(match => {
        const src = match.match(/src=["']([^"']+)["']/i);
        return src ? src[1] : '';
      }).filter(Boolean);
      
      resources.scripts = scriptMatches.map(match => {
        const src = match.match(/src=["']([^"']+)["']/i);
        return src ? src[1] : '';
      }).filter(Boolean);
      
      resources.stylesheets = cssMatches.map(match => {
        const href = match.match(/href=["']([^"']+)["']/i);
        return href ? href[1] : '';
      }).filter(Boolean);
      
      const totalResources = resources.images.length + resources.scripts.length + resources.stylesheets.length;
      
      return {
        resources,
        counts: {
          images: resources.images.length,
          scripts: resources.scripts.length,
          stylesheets: resources.stylesheets.length,
          total: totalResources
        },
        estimatedSizes: {
          // 粗略估算，实际应该发请求获取真实大小
          images: resources.images.length * 50000, // 50KB per image
          scripts: resources.scripts.length * 30000, // 30KB per script
          stylesheets: resources.stylesheets.length * 10000, // 10KB per CSS
          total: totalResources * 30000 // 平均30KB per resource
        },
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'analyzeResourceMetrics');
    }
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(metrics) {
    try {
      let score = 100;
      const weights = {
        ttfb: 0.25,
        lcp: 0.25,
        fcp: 0.20,
        cls: 0.15,
        totalTime: 0.15
      };
      
      if (metrics.basicTiming && metrics.basicTiming.success) {
        const timing = metrics.basicTiming;
        
        // TTFB评分
        const ttfbRating = this.getRating(timing.ttfb.avg, this.thresholds.coreWebVitals.ttfb);
        score -= this.getScorePenalty(ttfbRating) * weights.ttfb * 100;
        
        // 总时间评分
        const totalTimeRating = this.getRating(timing.totalTime.avg, this.thresholds.performance.pageLoad);
        score -= this.getScorePenalty(totalTimeRating) * weights.totalTime * 100;
      }
      
      if (metrics.coreWebVitals && metrics.coreWebVitals.success) {
        const cwv = metrics.coreWebVitals;
        
        // LCP评分
        score -= this.getScorePenalty(cwv.lcp.rating) * weights.lcp * 100;
        
        // FCP评分
        score -= this.getScorePenalty(cwv.fcp.rating) * weights.fcp * 100;
        
        // CLS评分
        score -= this.getScorePenalty(cwv.cls.rating) * weights.cls * 100;
      }
      
      return {
        score: Math.max(0, Math.round(score)),
        grade: this.getPerformanceGrade(score),
        breakdown: {
          ttfb: metrics.basicTiming?.ttfb?.avg || 0,
          lcp: metrics.coreWebVitals?.lcp?.value || 0,
          fcp: metrics.coreWebVitals?.fcp?.value || 0,
          cls: metrics.coreWebVitals?.cls?.value || 0,
          totalTime: metrics.basicTiming?.totalTime?.avg || 0
        },
        weights
      };
    } catch (error) {
      return this.handleError(error, 'calculatePerformanceScore');
    }
  }

  /**
   * 获取评级
   */
  getRating(value, thresholds) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement || value <= thresholds.warning) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 获取评分惩罚
   */
  getScorePenalty(rating) {
    switch (rating) {
      case 'good': return 0;
      case 'needs-improvement': return 0.5;
      case 'poor': return 1;
      default: return 0.3;
    }
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 计算中位数
   */
  calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * 生成性能优化建议
   */
  generateOptimizationRecommendations(metrics) {
    const recommendations = [];
    
    try {
      if (metrics.basicTiming && metrics.basicTiming.success) {
        const timing = metrics.basicTiming;
        
        if (timing.ttfb.avg > this.thresholds.coreWebVitals.ttfb.good) {
          recommendations.push({
            type: 'server-optimization',
            priority: 'high',
            title: '优化服务器响应时间',
            description: `TTFB过高 (${Math.round(timing.ttfb.avg)}ms)，建议优化服务器性能`,
            suggestions: [
              '启用服务器缓存',
              '优化数据库查询',
              '使用CDN加速',
              '升级服务器硬件'
            ]
          });
        }
        
        if (timing.dnsTime.avg > this.thresholds.performance.dnsLookup.good) {
          recommendations.push({
            type: 'dns-optimization',
            priority: 'medium',
            title: '优化DNS查询',
            description: `DNS查询时间过长 (${Math.round(timing.dnsTime.avg)}ms)`,
            suggestions: [
              '使用更快的DNS服务器',
              '启用DNS预解析',
              '考虑使用DNS缓存'
            ]
          });
        }
      }
      
      if (metrics.coreWebVitals && metrics.coreWebVitals.success) {
        const cwv = metrics.coreWebVitals;
        
        if (cwv.lcp.rating === 'poor') {
          recommendations.push({
            type: 'lcp-optimization',
            priority: 'high',
            title: '改善最大内容绘制',
            description: `LCP过慢 (${cwv.lcp.value}ms)，影响用户体验`,
            suggestions: [
              '优化关键资源加载',
              '使用资源预加载',
              '优化图片大小和格式',
              '移除阻塞渲染的资源'
            ]
          });
        }
        
        if (cwv.cls.rating === 'poor') {
          recommendations.push({
            type: 'cls-optimization',
            priority: 'medium',
            title: '减少累积布局位移',
            description: `CLS过高 (${cwv.cls.value})，可能影响用户体验`,
            suggestions: [
              '为图片和视频设置尺寸属性',
              '避免在现有内容上方插入内容',
              '使用transform动画替代改变布局的动画'
            ]
          });
        }
      }
      
      if (metrics.resourceMetrics && metrics.resourceMetrics.success) {

        
        /**

        
         * if功能函数

        
         * @param {Object} params - 参数对象

        
         * @returns {Promise<Object>} 返回结果

        
         */
        const resources = metrics.resourceMetrics;
        
        if (resources.counts.total > 50) {
          recommendations.push({
            type: 'resource-optimization',
            priority: 'medium',
            title: '减少资源请求数量',
            description: `页面包含${resources.counts.total}个资源，可能影响加载速度`,
            suggestions: [
              '合并CSS和JavaScript文件',
              '使用CSS sprites合并图片',
              '启用HTTP/2服务器推送',
              '移除不必要的资源'
            ]
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.error('生成优化建议失败:', error);
      return [];
    }
  }
}

export default PerformanceMetricsService;
