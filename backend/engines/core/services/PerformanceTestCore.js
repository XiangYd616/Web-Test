/**
 * 🚀 性能测试核心服务
 * 统一所有性能测试功能，消除重复代码
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const axios = require('axios');

class PerformanceTestCore {
  constructor() {
    this.name = 'performance-core';
    this.cache = new Map(); // 结果缓存
    this.defaultConfig = {
      device: 'desktop',
      locale: 'zh-CN',
      throttling: 'simulated3G',
      categories: ['performance', 'accessibility', 'best-practices', 'seo']
    };
  }

  /**
   * 获取 Core Web Vitals - 统一实现
   * 消除在多个测试工具中的重复实现
   */
  async getCoreWebVitals(url, config = {}) {
    const cacheKey = `cwv_${url}_${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      
      // 启动 Chrome
      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
        logLevel: 'silent'
      });

      try {
        // 配置 Lighthouse
        const options = {
          logLevel: 'silent',
          output: 'json',
          onlyCategories: ['performance'],
          port: chrome.port,
          locale: config.locale || this.defaultConfig.locale
        };

        // 运行 Lighthouse
        const runnerResult = await lighthouse(url, options);
        const lhr = runnerResult.lhr;

        // 提取 Core Web Vitals
        const vitals = {
          // Largest Contentful Paint
          LCP: this.extractMetric(lhr, 'largest-contentful-paint'),
          // First Input Delay (模拟)
          FID: this.extractMetric(lhr, 'max-potential-fid'),
          // Cumulative Layout Shift
          CLS: this.extractMetric(lhr, 'cumulative-layout-shift'),
          // First Contentful Paint
          FCP: this.extractMetric(lhr, 'first-contentful-paint'),
          // Time to Interactive
          TTI: this.extractMetric(lhr, 'interactive'),
          // Total Blocking Time
          TBT: this.extractMetric(lhr, 'total-blocking-time'),
          // Speed Index
          SI: this.extractMetric(lhr, 'speed-index')
        };

        // 计算综合评分
        vitals.overallScore = this.calculateVitalsScore(vitals);
        vitals.grade = this.getPerformanceGrade(vitals.overallScore);
        vitals.timestamp = new Date().toISOString();

        // 缓存结果
        this.cache.set(cacheKey, vitals);
        
        return vitals;

      } finally {
        await chrome.kill();
      }

    } catch (error) {
      console.error('Core Web Vitals 检测失败:', error);
      throw new Error(`Core Web Vitals 检测失败: ${error.message}`);
    }
  }

  /**
   * 页面速度分析 - 统一实现
   */
  async analyzePageSpeed(url, config = {}) {
    const cacheKey = `speed_${url}_${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {

      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();
        
        // 设置设备模拟
        if (config.device === 'mobile') {
          await page.emulate(puppeteer.devices['iPhone X']);
        }

        // 监听网络请求
        const requests = [];
        const responses = [];
        
        page.on('request', request => {
          requests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType(),
            timestamp: Date.now()
          });
        });

        page.on('response', response => {
          responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            timestamp: Date.now()
          });
        });

        // 开始性能监控
        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: process.env.REQUEST_TIMEOUT || 30000 });
        const loadTime = Date.now() - startTime;

        // 获取性能指标
        const metrics = await page.metrics();
        const performanceTiming = await page.evaluate(() => {
          const timing = performance.timing;
          return {
            navigationStart: timing.navigationStart,
            domainLookupStart: timing.domainLookupStart,
            domainLookupEnd: timing.domainLookupEnd,
            connectStart: timing.connectStart,
            connectEnd: timing.connectEnd,
            requestStart: timing.requestStart,
            responseStart: timing.responseStart,
            responseEnd: timing.responseEnd,
            domLoading: timing.domLoading,
            domInteractive: timing.domInteractive,
            domContentLoadedEventStart: timing.domContentLoadedEventStart,
            domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
            loadEventStart: timing.loadEventStart,
            loadEventEnd: timing.loadEventEnd
          };
        });

        // 计算关键时间点
        const analysis = {
          totalLoadTime: loadTime,
          dnsLookupTime: performanceTiming.domainLookupEnd - performanceTiming.domainLookupStart,
          connectionTime: performanceTiming.connectEnd - performanceTiming.connectStart,
          requestTime: performanceTiming.responseStart - performanceTiming.requestStart,
          responseTime: performanceTiming.responseEnd - performanceTiming.responseStart,
          domProcessingTime: performanceTiming.domInteractive - performanceTiming.domLoading,
          domContentLoadedTime: performanceTiming.domContentLoadedEventEnd - performanceTiming.domContentLoadedEventStart,
          
          // 资源统计
          totalRequests: requests.length,
          totalResponses: responses.length,
          
          // 性能指标
          jsHeapUsedSize: metrics.JSHeapUsedSize,
          jsHeapTotalSize: metrics.JSHeapTotalSize,
          
          timestamp: new Date().toISOString()
        };

        // 性能评级
        analysis.grade = this.getSpeedGrade(loadTime);
        analysis.recommendations = this.generateSpeedRecommendations(analysis);

        // 缓存结果
        this.cache.set(cacheKey, analysis);
        
        return analysis;

      } finally {
        await browser.close();
      }

    } catch (error) {
      console.error('页面速度分析失败:', error);
      throw new Error(`页面速度分析失败: ${error.message}`);
    }
  }

  /**
   * 资源优化分析 - 统一实现
   */
  async analyzeResources(url, config = {}) {
    const cacheKey = `resources_${url}_${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {

      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();
        
        // 监听资源加载
        const resources = [];
        
        page.on('response', async response => {
          try {
            const request = response.request();
            const headers = response.headers();
            
            resources.push({
              url: response.url(),
              method: request.method(),
              status: response.status(),
              resourceType: request.resourceType(),
              size: parseInt(headers['content-length']) || 0,
              contentType: headers['content-type'] || '',
              cacheControl: headers['cache-control'] || '',
              compression: headers['content-encoding'] || '',
              timestamp: Date.now()
            });
          } catch (err) {
            // 忽略资源分析错误
          }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: process.env.REQUEST_TIMEOUT || 30000 });

        // 分析资源
        const analysis = {
          totalResources: resources.length,
          resourcesByType: this.groupResourcesByType(resources),
          totalSize: resources.reduce((sum, r) => sum + r.size, 0),
          compressionAnalysis: this.analyzeCompression(resources),
          cacheAnalysis: this.analyzeCaching(resources),
          optimizationOpportunities: this.findOptimizationOpportunities(resources),
          timestamp: new Date().toISOString()
        };

        // 缓存结果
        this.cache.set(cacheKey, analysis);
        
        return analysis;

      } finally {
        await browser.close();
      }

    } catch (error) {
      console.error('资源分析失败:', error);
      throw new Error(`资源分析失败: ${error.message}`);
    }
  }

  /**
   * 缓存策略分析 - 统一实现
   */
  async analyzeCaching(url, config = {}) {
    try {

      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      const headers = response.headers;
      
      const analysis = {
        cacheControl: headers['cache-control'] || null,
        expires: headers['expires'] || null,
        etag: headers['etag'] || null,
        lastModified: headers['last-modified'] || null,
        
        // 缓存策略分析
        hasCacheControl: !!headers['cache-control'],
        hasExpires: !!headers['expires'],
        hasETag: !!headers['etag'],
        hasLastModified: !!headers['last-modified'],
        
        // 缓存评分
        cacheScore: this.calculateCacheScore(headers),
        recommendations: this.generateCacheRecommendations(headers),
        
        timestamp: new Date().toISOString()
      };

      return analysis;

    } catch (error) {
      console.error('缓存分析失败:', error);
      throw new Error(`缓存分析失败: ${error.message}`);
    }
  }

  /**
   * 提取 Lighthouse 指标
   */
  extractMetric(lhr, auditId) {
    const audit = lhr.audits[auditId];
    if (!audit) return null;

    return {
      value: audit.numericValue,
      displayValue: audit.displayValue,
      score: audit.score,
      description: audit.description,
      title: audit.title
    };
  }

  /**
   * 计算 Core Web Vitals 综合评分
   */
  calculateVitalsScore(vitals) {
    const weights = {
      LCP: 0.25,  // 25%
      FID: 0.25,  // 25%
      CLS: 0.25,  // 25%
      FCP: 0.15,  // 15%
      TTI: 0.10   // 10%
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(key => {
      if (vitals[key] && vitals[key].score !== null) {
        totalScore += vitals[key].score * weights[key];
        totalWeight += weights[key];
      }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
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
   * 获取速度等级
   */
  getSpeedGrade(loadTime) {
    if (loadTime < 1000) return 'A';
    if (loadTime < 2000) return 'B';
    if (loadTime < 3000) return 'C';
    if (loadTime < 5000) return 'D';
    return 'F';
  }

  /**
   * 按类型分组资源
   */
  groupResourcesByType(resources) {
    const groups = {};
    resources.forEach(resource => {
      const type = resource.resourceType;
      if (!groups[type]) {
        groups[type] = { count: 0, totalSize: 0 };
      }
      groups[type].count++;
      groups[type].totalSize += resource.size;
    });
    return groups;
  }

  /**
   * 分析压缩情况
   */
  analyzeCompression(resources) {
    const compressible = resources.filter(r => 
      ['document', 'stylesheet', 'script', 'xhr', 'fetch'].includes(r.resourceType)
    );
    
    const compressed = compressible.filter(r => r.compression);
    
    return {
      compressibleResources: compressible.length,
      compressedResources: compressed.length,
      compressionRate: compressible.length > 0 ? (compressed.length / compressible.length) * 100 : 0,
      potentialSavings: this.calculateCompressionSavings(compressible.filter(r => !r.compression))
    };
  }

  /**
   * 计算缓存评分
   */
  calculateCacheScore(headers) {
    let score = 0;
    
    if (headers['cache-control']) score += 30;
    if (headers['expires']) score += 20;
    if (headers['etag']) score += 25;
    if (headers['last-modified']) score += 25;
    
    return score;
  }

  /**
   * 生成速度优化建议
   */
  generateSpeedRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.totalLoadTime > 3000) {
      recommendations.push('页面加载时间过长，建议优化关键资源');
    }
    
    if (analysis.dnsLookupTime > 200) {
      recommendations.push('DNS查询时间较长，考虑使用CDN');
    }
    
    if (analysis.totalRequests > 100) {
      recommendations.push('HTTP请求数量过多，建议合并资源');
    }
    
    return recommendations;
  }

  /**
   * 生成缓存优化建议
   */
  generateCacheRecommendations(headers) {
    const recommendations = [];
    
    if (!headers['cache-control']) {
      recommendations.push('建议设置 Cache-Control 头');
    }
    
    if (!headers['etag'] && !headers['last-modified']) {
      recommendations.push('建议设置 ETag 或 Last-Modified 头以支持条件请求');
    }
    
    return recommendations;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = PerformanceTestCore;
