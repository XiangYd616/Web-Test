/**
 * 压力测试分析器
 * 本地化程度：100%
 * 集成负载生成和性能分析功能
 */

const LoadGenerator = require('./generators/LoadGenerator');

class StressAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '10'),
      defaultDuration: 60,
      ...options
    };
    
    this.loadGenerator = null;
    this.isRunning = false;
  }

  /**
   * 执行压力测试分析
   */
  async analyze(url, config = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 开始压力测试分析: ${url}`);
      
      const analysisConfig = { ...this.options, ...config };
      const results = {
        url,
        timestamp: new Date().toISOString(),
        analysisTime: 0,
        testConfig: null,
        loadResults: null,
        performanceAnalysis: null,
        recommendations: []
      };
      
      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'initializing',
          message: '初始化压力测试...'
        });
      }
      
      // 准备测试配置
      const testConfig = this.prepareTestConfig(url, analysisConfig);
      results.testConfig = testConfig;
      
      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 20,
          stage: 'testing',
          message: '开始负载测试...'
        });
      }
      
      // 创建负载生成器
      this.loadGenerator = new LoadGenerator(analysisConfig);
      this.isRunning = true;
      
      // 执行负载测试
      const loadResults = await this.loadGenerator.startLoad({
        ...testConfig,
        onProgress: (stats) => {
          if (config.onProgress) {
            const percentage = 20 + Math.round((stats.elapsedTime / (testConfig.duration * 1000)) * 60);
            config.onProgress({
              percentage: Math.min(80, percentage),
              stage: 'testing',
              message: `负载测试进行中... ${stats.totalRequests} 请求`,
              stats
            });
          }
        }
      });
      
      results.loadResults = loadResults;
      
      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 85,
          stage: 'analyzing',
          message: '分析测试结果...'
        });
      }
      
      // 分析性能结果
      results.performanceAnalysis = this.analyzePerformance(loadResults, testConfig);
      
      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 95,
          stage: 'generating',
          message: '生成优化建议...'
        });
      }
      
      // 生成建议
      results.recommendations = this.generateRecommendations(results);
      
      // 计算分析时间
      results.analysisTime = Date.now() - startTime;
      
      console.log(`✅ 压力测试分析完成，处理了 ${loadResults.totalRequests} 个请求`);
      
      return results;
      
    } catch (error) {
      console.error(`❌ 压力测试分析失败: ${url}`, error);
      throw error;
    } finally {
      this.isRunning = false;
      if (this.loadGenerator) {
        this.loadGenerator.cleanup();
        this.loadGenerator = null;
      }
    }
  }

  /**
   * 准备测试配置
   */
  prepareTestConfig(url, config) {
    return {
      url,
      method: config.method || 'GET',
      headers: config.headers || {
        'User-Agent': 'Stress-Test-Engine/1.0.0',
        'Accept': '*/*'
      },
      data: config.data || null,
      duration: config.duration || this.options.defaultDuration,
      concurrency: Math.min(config.concurrency || 10, this.options.maxConcurrency),
      rampUp: config.rampUp || 0,
      pattern: config.pattern || 'constant',
      delay: config.delay || 0,
      timeout: config.timeout || this.options.timeout
    };
  }

  /**
   * 分析性能结果
   */
  analyzePerformance(loadResults, testConfig) {
    const analysis = {
      summary: {
        totalRequests: loadResults.totalRequests,
        successfulRequests: loadResults.successfulRequests,
        failedRequests: loadResults.failedRequests,
        successRate: loadResults.successRate,
        duration: loadResults.duration,
        throughput: loadResults.throughput
      },
      responseTime: {
        average: loadResults.avgResponseTime,
        minimum: loadResults.minResponseTime,
        maximum: loadResults.maxResponseTime,
        percentiles: loadResults.percentiles
      },
      errors: {
        breakdown: loadResults.errorBreakdown,
        statusCodes: loadResults.statusCodeBreakdown,
        errorRate: 100 - loadResults.successRate
      },
      performance: {
        rps: loadResults.throughput, // 每秒请求数
        concurrency: testConfig.concurrency,
        efficiency: this.calculateEfficiency(loadResults, testConfig),
        stability: this.calculateStability(loadResults),
        scalability: this.calculateScalability(loadResults, testConfig)
      },
      bottlenecks: this.identifyBottlenecks(loadResults, testConfig)
    };
    
    return analysis;
  }

  /**
   * 计算效率指标
   */
  calculateEfficiency(loadResults, testConfig) {
    // 理论最大吞吐量 vs 实际吞吐量
    const theoreticalMaxRPS = testConfig.concurrency / (testConfig.timeout / 1000);
    const actualRPS = loadResults.throughput;
    const efficiency = (actualRPS / theoreticalMaxRPS) * 100;
    
    return {
      score: Math.min(100, Math.round(efficiency)),
      theoreticalMaxRPS: Math.round(theoreticalMaxRPS),
      actualRPS: Math.round(actualRPS),
      description: efficiency > 80 ? '高效' : efficiency > 60 ? '中等' : '低效'
    };
  }

  /**
   * 计算稳定性指标
   */
  calculateStability(loadResults) {
    const { percentiles, avgResponseTime } = loadResults;
    
    // 响应时间变异系数
    const p99_p50_ratio = percentiles.p99 / Math.max(percentiles.p50, 1);
    const stability = Math.max(0, 100 - (p99_p50_ratio - 1) * 20);
    
    return {
      score: Math.round(stability),
      p99_p50_ratio: Math.round(p99_p50_ratio * 100) / 100,
      description: stability > 80 ? '稳定' : stability > 60 ? '一般' : '不稳定'
    };
  }

  /**
   * 计算可扩展性指标
   */
  calculateScalability(loadResults, testConfig) {
    // 基于错误率和响应时间增长评估可扩展性
    const errorRate = 100 - loadResults.successRate;
    const avgResponseTime = loadResults.avgResponseTime;
    
    let scalabilityScore = 100;
    
    // 错误率影响
    if (errorRate > 5) scalabilityScore -= errorRate * 2;
    
    // 响应时间影响
    if (avgResponseTime > 1000) scalabilityScore -= (avgResponseTime - 1000) / 100;
    
    scalabilityScore = Math.max(0, scalabilityScore);
    
    return {
      score: Math.round(scalabilityScore),
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      description: scalabilityScore > 80 ? '良好' : scalabilityScore > 60 ? '一般' : '较差'
    };
  }

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(loadResults, testConfig) {
    const bottlenecks = [];
    
    // 高错误率
    if (loadResults.successRate < 95) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'high',
        description: `错误率过高: ${(100 - loadResults.successRate).toFixed(2)}%`,
        impact: '严重影响系统可用性',
        suggestion: '检查服务器配置、数据库连接池、内存使用情况'
      });
    }
    
    // 响应时间过长
    if (loadResults.avgResponseTime > 2000) {
      bottlenecks.push({
        type: 'slow_response',
        severity: 'medium',
        description: `平均响应时间过长: ${loadResults.avgResponseTime}ms`,
        impact: '用户体验较差',
        suggestion: '优化数据库查询、增加缓存、优化代码逻辑'
      });
    }
    
    // 响应时间不稳定
    const p99_p50_ratio = loadResults.percentiles.p99 / Math.max(loadResults.percentiles.p50, 1);
    if (p99_p50_ratio > 3) {
      bottlenecks.push({
        type: 'unstable_response',
        severity: 'medium',
        description: `响应时间不稳定，P99/P50比值: ${p99_p50_ratio.toFixed(2)}`,
        impact: '部分请求响应极慢',
        suggestion: '检查垃圾回收、数据库锁、网络延迟'
      });
    }
    
    // 吞吐量过低
    const expectedThroughput = testConfig.concurrency * 0.8; // 期望达到80%的理论值
    if (loadResults.throughput < expectedThroughput) {
      bottlenecks.push({
        type: 'low_throughput',
        severity: 'medium',
        description: `吞吐量低于预期: ${loadResults.throughput.toFixed(2)} RPS`,
        impact: '系统处理能力不足',
        suggestion: '增加服务器资源、优化并发处理、使用负载均衡'
      });
    }
    
    // 特定错误分析
    Object.entries(loadResults.errorBreakdown).forEach(([errorType, count]) => {
      const percentage = (count / loadResults.totalRequests) * 100;
      if (percentage > 1) {
        bottlenecks.push({
          type: 'specific_error',
          severity: percentage > 5 ? 'high' : 'low',
          description: `${errorType} 错误频发: ${count} 次 (${percentage.toFixed(2)}%)`,
          impact: '特定类型错误影响稳定性',
          suggestion: this.getErrorSuggestion(errorType)
        });
      }
    });
    
    return bottlenecks;
  }

  /**
   * 获取错误建议
   */
  getErrorSuggestion(errorType) {
    const suggestions = {
      'ECONNRESET': '检查服务器连接池配置和网络稳定性',
      'ETIMEDOUT': '增加超时时间或优化服务器响应速度',
      'ECONNREFUSED': '确认服务器正在运行并检查防火墙设置',
      'http_500': '检查服务器内部错误日志',
      'http_502': '检查上游服务器状态和负载均衡配置',
      'http_503': '服务器过载，考虑增加资源或限流',
      'http_504': '网关超时，检查后端服务响应时间'
    };
    
    return suggestions[errorType] || '检查服务器日志以确定具体原因';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results) {
    const recommendations = [];
    const { performanceAnalysis, loadResults } = results;
    
    // 基于性能分析生成建议
    if (performanceAnalysis.performance.efficiency.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'efficiency',
        title: '提高系统效率',
        description: `当前效率评分: ${performanceAnalysis.performance.efficiency.score}`,
        solution: '优化代码逻辑、增加缓存、优化数据库查询'
      });
    }
    
    if (performanceAnalysis.performance.stability.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'stability',
        title: '提高系统稳定性',
        description: `响应时间波动较大，稳定性评分: ${performanceAnalysis.performance.stability.score}`,
        solution: '优化垃圾回收、减少数据库锁竞争、优化网络配置'
      });
    }
    
    if (performanceAnalysis.performance.scalability.score < 70) {
      recommendations.push({
        priority: 'medium',
        category: 'scalability',
        title: '提高系统可扩展性',
        description: `可扩展性评分: ${performanceAnalysis.performance.scalability.score}`,
        solution: '实施水平扩展、使用负载均衡、优化架构设计'
      });
    }
    
    // 基于瓶颈生成建议
    performanceAnalysis.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'high') {
        recommendations.push({
          priority: 'high',
          category: 'bottleneck',
          title: `解决${bottleneck.type}问题`,
          description: bottleneck.description,
          solution: bottleneck.suggestion
        });
      }
    });
    
    // 基于整体性能生成建议
    if (loadResults.successRate < 99) {
      recommendations.push({
        priority: 'medium',
        category: 'reliability',
        title: '提高系统可靠性',
        description: `成功率: ${loadResults.successRate.toFixed(2)}%`,
        solution: '增加错误处理、实施重试机制、监控系统健康状态'
      });
    }
    
    if (loadResults.avgResponseTime > 500) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: '优化响应时间',
        description: `平均响应时间: ${loadResults.avgResponseTime}ms`,
        solution: '使用CDN、优化静态资源、实施缓存策略'
      });
    }
    
    // 按优先级排序
    recommendations.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    return recommendations.slice(0, 10); // 返回前10个建议
  }

  /**
   * 停止压力测试
   */
  stop() {
    if (this.loadGenerator) {
      this.loadGenerator.stop();
    }
    this.isRunning = false;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentStats: this.loadGenerator ? this.loadGenerator.getCurrentStats() : null
    };
  }
}

module.exports = StressAnalyzer;
