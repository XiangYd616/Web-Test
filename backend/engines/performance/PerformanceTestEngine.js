/**
 * 性能测试引擎
 * 专注于网站性能指标测试
 */

const HttpTestEngine = require('../api/HttpTestEngine.js');
const { AppError } = require('../../middleware/errorHandler');

class PerformanceTestEngine extends HttpTestEngine {
  constructor(options = {}) {
    super({
      name: 'PerformanceTestEngine',
      version: '2.0.0',
      ...options
    });
    
    // 性能测试配置
    this.perfConfig = {
      iterations: 10,
      warmupIterations: 3,
      timeout: 30000,
      collectDetailedMetrics: true,
      ...options.perfConfig
    };
    
    // 性能指标
    this.performanceMetrics = {
      dns: [],
      tcp: [],
      tls: [],
      firstByte: [],
      download: [],
      total: [],
      contentSize: [],
      headers: []
    };
  }

  /**
   * 验证性能测试配置
   */
  validateConfig(config) {
    super.validateConfig(config);
    
    if (!config.url) {
      throw new AppError('Target URL is required for performance test', 400);
    }
    
    if (config.iterations && (config.iterations < 1 || config.iterations > 100)) {
      throw new AppError('Iterations must be between 1 and 100', 400);
    }
    
    return true;
  }

  /**
   * 执行性能测试
   */
  async executeTest(config) {
    const { url, iterations = this.perfConfig.iterations } = config;
    
    this.log('info', `Starting performance test`, { url, iterations });
    
    const testResult = {
      success: true,
      url,
      iterations,
      warmupResults: [],
      testResults: [],
      summary: {}
    };
    
    try {
      // 预热阶段
      this.updateProgress(0, 100, 'warmup', 'Running warmup iterations');
      const warmupResults = await this.runWarmupIterations(url);
      testResult.warmupResults = warmupResults;
      
      if (this.isCancelled()) return this.getCancelledResult();
      
      // 正式测试阶段
      this.updateProgress(25, 100, 'testing', 'Running performance test iterations');
      const testResults = await this.runTestIterations(url, iterations);
      testResult.testResults = testResults;
      
      if (this.isCancelled()) return this.getCancelledResult();
      
      // 分析结果
      this.updateProgress(90, 100, 'analyzing', 'Analyzing performance metrics');
      const summary = this.analyzeResults(testResults);
      testResult.summary = summary;
      
      this.updateProgress(100, 100, 'completed', 'Performance test completed');
      
      return testResult;
      
    } catch (error) {
      this.log('error', `Performance test failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 运行预热迭代
   */
  async runWarmupIterations(url) {
    const warmupResults = [];
    
    for (let i = 0; i < this.perfConfig.warmupIterations; i++) {
      if (this.isCancelled()) break;
      
      try {
        const result = await this.runSingleIteration(url, `warmup_${i + 1}`);
        warmupResults.push(result);
        
        this.updateProgress(
          (i + 1) / this.perfConfig.warmupIterations * 25,
          100,
          'warmup',
          `Warmup ${i + 1}/${this.perfConfig.warmupIterations}`
        );
        
      } catch (error) {
        this.log('warn', `Warmup iteration ${i + 1} failed: ${error.message}`);
      }
      
      // 短暂延迟
      await this.sleep(1000);
    }
    
    return warmupResults;
  }

  /**
   * 运行测试迭代
   */
  async runTestIterations(url, iterations) {
    const testResults = [];
    
    for (let i = 0; i < iterations; i++) {
      if (this.isCancelled()) break;
      
      try {
        const result = await this.runSingleIteration(url, `test_${i + 1}`);
        testResults.push(result);
        
        // 收集性能指标
        this.collectPerformanceMetrics(result);
        
        this.updateProgress(
          25 + (i + 1) / iterations * 65,
          100,
          'testing',
          `Test ${i + 1}/${iterations} - ${result.total}ms`
        );
        
      } catch (error) {
        this.log('warn', `Test iteration ${i + 1} failed: ${error.message}`);
        this.recordMetric('error', 1, { type: 'iteration_error', iteration: i + 1 });
      }
      
      // 迭代间延迟
      await this.sleep(500);
    }
    
    return testResults;
  }

  /**
   * 运行单次迭代
   */
  async runSingleIteration(url, iterationId) {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await this.makeDetailedRequest(url);
      const endTime = process.hrtime.bigint();
      
      const timing = {
        id: iterationId,
        timestamp: Date.now(),
        dns: result.timings?.dns || 0,
        tcp: result.timings?.tcp || 0,
        tls: result.timings?.tls || 0,
        firstByte: result.timings?.firstByte || 0,
        download: result.timings?.download || 0,
        total: Number(endTime - startTime) / 1000000, // 转换为毫秒
        statusCode: result.statusCode,
        contentLength: result.contentLength || 0,
        headers: Object.keys(result.headers || {}).length
      };
      
      this.recordMetric('responseTime', timing.total);
      
      if (result.statusCode >= 200 && result.statusCode < 300) {
        this.recordMetric('success', 1);
      } else {
        this.recordMetric('failure', 1);
      }
      
      return timing;
      
    } catch (error) {
      this.recordMetric('failure', 1);
      throw error;
    }
  }

  /**
   * 执行详细的HTTP请求（包含时间测量）
   */
  async makeDetailedRequest(url) {
    const startTime = Date.now();
    
    // 这里可以集成更详细的时间测量
    // 目前使用简化版本
    const result = await this.makeRequest(url);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    return {
      ...result,
      contentLength: result.body ? Buffer.byteLength(result.body) : 0,
      timings: {
        total: totalTime,
        dns: Math.round(totalTime * 0.1), // 模拟DNS时间
        tcp: Math.round(totalTime * 0.1), // 模拟TCP时间
        tls: Math.round(totalTime * 0.1), // 模拟TLS时间
        firstByte: Math.round(totalTime * 0.6), // 模拟首字节时间
        download: Math.round(totalTime * 0.1) // 模拟下载时间
      }
    };
  }

  /**
   * 收集性能指标
   */
  collectPerformanceMetrics(result) {
    if (!this.perfConfig.collectDetailedMetrics) return;
    
    this.performanceMetrics.dns.push(result.dns);
    this.performanceMetrics.tcp.push(result.tcp);
    this.performanceMetrics.tls.push(result.tls);
    this.performanceMetrics.firstByte.push(result.firstByte);
    this.performanceMetrics.download.push(result.download);
    this.performanceMetrics.total.push(result.total);
    this.performanceMetrics.contentSize.push(result.contentLength);
    this.performanceMetrics.headers.push(result.headers);
  }

  /**
   * 分析测试结果
   */
  analyzeResults(testResults) {
    if (testResults.length === 0) {
      return { error: 'No test results to analyze' };
    }
    
    const summary = {
      iterations: testResults.length,
      timing: this.calculateTimingStats(testResults),
      performance: this.calculatePerformanceStats(),
      reliability: this.calculateReliabilityStats(testResults),
      recommendations: this.generateRecommendations(testResults)
    };
    
    return summary;
  }

  /**
   * 计算时间统计
   */
  calculateTimingStats(results) {
    const times = results.map(r => r.total).sort((a, b) => a - b);
    
    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      stdDev: this.calculateStandardDeviation(times)
    };
  }

  /**
   * 计算性能统计
   */
  calculatePerformanceStats() {
    if (!this.perfConfig.collectDetailedMetrics) {
      return { message: 'Detailed metrics collection disabled' };
    }
    
    const stats = {};
    
    for (const [metric, values] of Object.entries(this.performanceMetrics)) {
      if (values.length > 0 && typeof values[0] === 'number') {
        const sorted = [...values].sort((a, b) => a - b);
        stats[metric] = {
          min: Math.min(...sorted),
          max: Math.max(...sorted),
          avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          median: sorted[Math.floor(sorted.length / 2)]
        };
      }
    }
    
    return stats;
  }

  /**
   * 计算可靠性统计
   */
  calculateReliabilityStats(results) {
    const successCount = results.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const errorCount = results.length - successCount;
    
    return {
      successRate: (successCount / results.length * 100).toFixed(2),
      errorRate: (errorCount / results.length * 100).toFixed(2),
      totalRequests: results.length,
      successfulRequests: successCount,
      failedRequests: errorCount
    };
  }

  /**
   * 生成性能建议
   */
  generateRecommendations(results) {
    const recommendations = [];
    const avgTime = results.reduce((sum, r) => sum + r.total, 0) / results.length;
    
    if (avgTime > 3000) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: '平均响应时间超过3秒，建议优化服务器性能或使用CDN'
      });
    } else if (avgTime > 1000) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: '响应时间可以进一步优化，建议检查数据库查询和缓存策略'
      });
    }
    
    const errorRate = results.filter(r => r.statusCode >= 400).length / results.length;
    if (errorRate > 0.05) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        message: '错误率超过5%，建议检查服务器稳定性和错误处理'
      });
    }
    
    return recommendations;
  }

  /**
   * 计算标准差
   */
  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * 获取取消结果
   */
  getCancelledResult() {
    return {
      success: false,
      cancelled: true,
      summary: { message: 'Performance test was cancelled by user' }
    };
  }

  /**
   * 获取扩展状态
   */
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      performanceMetrics: this.performanceMetrics,
      perfConfig: this.perfConfig
    };
  }
}

module.exports = PerformanceTestEngine;
