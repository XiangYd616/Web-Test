/**
 * API性能和负载测试器
 * 本地化程度：100%
 * 实现API性能测试：响应时间监控、并发请求测试、吞吐量测试、负载均衡测试等
 */

const axios = require('axios');
const EventEmitter = require('events');

class APIPerformanceTester extends EventEmitter {
  constructor() {
    super();

    // 测试配置
    this.defaultConfig = {
      timeout: 30000,
      maxConcurrency: 100,
      rampUpTime: 10000, // 10秒
      testDuration: 60000, // 60秒
      thinkTime: 1000, // 用户思考时间
      retryCount: 3,
      retryDelay: 1000
    };

    // 性能指标
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      throughput: 0,
      errorRate: 0,
      concurrentUsers: 0,
      startTime: null,
      endTime: null
    };

    // 错误统计
    this.errors = new Map();

    // 活动连接
    this.activeConnections = new Set();

    // 测试状态
    this.isRunning = false;
    this.shouldStop = false;
  }

  /**
   * 执行性能测试
   */
  async runPerformanceTest(testConfig) {
    console.log('🚀 开始API性能测试...');

    const config = { ...this.defaultConfig, ...testConfig };
    this.resetMetrics();
    this.isRunning = true;
    this.shouldStop = false;

    const results = {
      testConfig: config,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      metrics: null,
      performanceAnalysis: null,
      bottleneckAnalysis: null,
      recommendations: []
    };

    try {
      this.metrics.startTime = Date.now();

      // 执行不同类型的测试
      if (config.testType === 'load') {
        await this.runLoadTest(config);
      } else if (config.testType === 'stress') {
        await this.runStressTest(config);
      } else if (config.testType === 'spike') {
        await this.runSpikeTest(config);
      } else if (config.testType === 'volume') {
        await this.runVolumeTest(config);
      } else {
        // 默认负载测试
        await this.runLoadTest(config);
      }

      this.metrics.endTime = Date.now();
      results.endTime = new Date().toISOString();
      results.duration = this.metrics.endTime - this.metrics.startTime;

      // 计算最终指标
      this.calculateFinalMetrics();
      results.metrics = { ...this.metrics };

      // 性能分析
      results.performanceAnalysis = this.analyzePerformance();

      // 瓶颈分析
      results.bottleneckAnalysis = this.analyzeBottlenecks();

      // 生成建议
      results.recommendations = this.generateRecommendations(results);

      console.log(`✅ 性能测试完成 - 总请求: ${this.metrics.totalRequests}, 成功率: ${(100 - this.metrics.errorRate).toFixed(2)}%`);

      return results;

    } catch (error) {
      console.error('性能测试失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.shouldStop = false;
    }
  }

  /**
   * 负载测试
   */
  async runLoadTest(config) {
    console.log(`📊 执行负载测试 - 目标并发: ${config.maxConcurrency}`);

    const promises = [];
    const startTime = Date.now();

    // 逐步增加负载
    for (let i = 0; i < config.maxConcurrency; i++) {
      if (this.shouldStop) break;

      // 计算延迟启动时间
      const delay = (config.rampUpTime / config.maxConcurrency) * i;

      const promise = this.scheduleVirtualUser(config, delay);
      promises.push(promise);

      // 发送进度更新
      this.emit('progress', {
        type: 'rampup',
        currentUsers: i + 1,
        targetUsers: config.maxConcurrency,
        percentage: Math.round(((i + 1) / config.maxConcurrency) * 100)
      });
    }

    // 等待所有虚拟用户完成
    await Promise.allSettled(promises);
  }

  /**
   * 压力测试
   */
  async runStressTest(config) {
    console.log('💪 执行压力测试 - 逐步增加负载直到系统极限');

    let currentConcurrency = 1;
    const maxConcurrency = config.maxConcurrency || 500;
    const stepSize = config.stepSize || 10;
    const stepDuration = config.stepDuration || 30000;

    while (currentConcurrency <= maxConcurrency && !this.shouldStop) {
      console.log(`🔄 压力测试步骤: ${currentConcurrency} 并发用户`);

      // 重置当前步骤的指标
      const stepMetrics = this.createStepMetrics();

      // 执行当前并发级别的测试
      const promises = [];
      for (let i = 0; i < currentConcurrency; i++) {
        const promise = this.scheduleVirtualUser({
          ...config,
          testDuration: stepDuration
        }, 0);
        promises.push(promise);
      }

      await Promise.allSettled(promises);

      // 分析当前步骤结果
      const stepResults = this.analyzeStepResults(stepMetrics);

      // 如果错误率过高，停止测试
      if (stepResults.errorRate > 50) {
        console.log(`⚠️ 错误率过高 (${stepResults.errorRate}%)，停止压力测试`);
        break;
      }

      currentConcurrency += stepSize;

      this.emit('progress', {
        type: 'stress_step',
        currentConcurrency,
        errorRate: stepResults.errorRate,
        avgResponseTime: stepResults.avgResponseTime
      });
    }
  }

  /**
   * 峰值测试
   */
  async runSpikeTest(config) {
    console.log('⚡ 执行峰值测试 - 突然增加负载');

    const normalLoad = config.normalLoad || 10;
    const spikeLoad = config.spikeLoad || 100;
    const spikeDuration = config.spikeDuration || 10000;

    // 正常负载阶段
    console.log(`📈 正常负载阶段: ${normalLoad} 并发用户`);
    await this.runConcurrentRequests(normalLoad, config, 30000);

    // 峰值负载阶段
    console.log(`🚀 峰值负载阶段: ${spikeLoad} 并发用户`);
    await this.runConcurrentRequests(spikeLoad, config, spikeDuration);

    // 恢复正常负载
    console.log(`📉 恢复正常负载: ${normalLoad} 并发用户`);
    await this.runConcurrentRequests(normalLoad, config, 30000);
  }

  /**
   * 容量测试
   */
  async runVolumeTest(config) {
    console.log('📦 执行容量测试 - 大量数据处理');

    const dataVolumes = config.dataVolumes || [
      { size: 'small', requests: 1000 },
      { size: 'medium', requests: 5000 },
      { size: 'large', requests: 10000 }
    ];

    for (const volume of dataVolumes) {
      if (this.shouldStop) break;

      console.log(`📊 测试数据量: ${volume.size} (${volume.requests} 请求)`);

      const promises = [];
      for (let i = 0; i < volume.requests; i++) {
        if (this.shouldStop) break;

        const promise = this.makeRequest(config);
        promises.push(promise);

        // 控制请求频率
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await Promise.allSettled(promises);

      this.emit('progress', {
        type: 'volume_test',
        volume: volume.size,
        completed: volume.requests,
        total: dataVolumes.reduce((sum, v) => sum + v.requests, 0)
      });
    }
  }

  /**
   * 调度虚拟用户
   */
  async scheduleVirtualUser(config, delay = 0) {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const endTime = Date.now() + config.testDuration;

    while (Date.now() < endTime && !this.shouldStop) {
      try {
        await this.makeRequest(config);

        // 用户思考时间
        if (config.thinkTime > 0) {
          await new Promise(resolve => setTimeout(resolve, config.thinkTime));
        }
      } catch (error) {
        // 错误已在makeRequest中处理
      }
    }
  }

  /**
   * 执行并发请求
   */
  async runConcurrentRequests(concurrency, config, duration) {
    const promises = [];

    for (let i = 0; i < concurrency; i++) {
      const promise = this.scheduleVirtualUser({
        ...config,
        testDuration: duration
      }, 0);
      promises.push(promise);
    }

    await Promise.allSettled(promises);
  }

  /**
   * 发送单个请求
   */
  async makeRequest(config) {
    const requestId = Date.now() + Math.random();
    this.activeConnections.add(requestId);
    this.metrics.concurrentUsers = this.activeConnections.size;

    const startTime = Date.now();

    try {
      const response = await axios({
        method: config.method || 'GET',
        url: config.url,
        headers: config.headers || {},
        data: config.data || null,
        params: config.params || {},
        timeout: config.timeout,
        validateStatus: () => true // 不抛出HTTP错误
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 更新指标
      this.updateMetrics(responseTime, response.status >= 200 && response.status < 400);

      this.emit('request_completed', {
        requestId,
        responseTime,
        status: response.status,
        success: response.status >= 200 && response.status < 400
      });

      return {
        success: true,
        responseTime,
        status: response.status,
        data: response.data
      };

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 更新错误指标
      this.updateMetrics(responseTime, false);
      this.recordError(error);

      this.emit('request_failed', {
        requestId,
        responseTime,
        error: error.message
      });

      return {
        success: false,
        responseTime,
        error: error.message
      };

    } finally {
      this.activeConnections.delete(requestId);
    }
  }

  /**
   * 更新性能指标
   */
  updateMetrics(responseTime, success) {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.responseTimes.push(responseTime);

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // 更新最小/最大响应时间
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
  }

  /**
   * 记录错误
   */
  recordError(error) {
    const errorType = error.code || error.message || 'Unknown Error';
    const count = this.errors.get(errorType) || 0;
    this.errors.set(errorType, count + 1);
  }

  /**
   * 计算最终指标
   */
  calculateFinalMetrics() {
    if (this.metrics.totalRequests === 0) return;

    // 计算平均响应时间
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // 计算错误率
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;

    // 计算吞吐量 (请求/秒)
    const durationSeconds = (this.metrics.endTime - this.metrics.startTime) / 1000;
    this.metrics.throughput = this.metrics.totalRequests / durationSeconds;

    // 计算百分位数
    this.metrics.percentiles = this.calculatePercentiles(this.metrics.responseTimes);

    // 重置无限值
    if (this.metrics.minResponseTime === Infinity) {
      this.metrics.minResponseTime = 0;
    }
  }

  /**
   * 计算百分位数
   */
  calculatePercentiles(responseTimes) {
    if (responseTimes.length === 0) return {};

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const percentiles = [50, 75, 90, 95, 99];
    const result = {};

    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });

    return result;
  }

  /**
   * 性能分析
   */
  analyzePerformance() {
    const analysis = {
      responseTimeAnalysis: this.analyzeResponseTimes(),
      throughputAnalysis: this.analyzeThroughput(),
      errorAnalysis: this.analyzeErrors(),
      scalabilityAnalysis: this.analyzeScalability(),
      reliabilityAnalysis: this.analyzeReliability()
    };

    return analysis;
  }

  /**
   * 分析响应时间
   */
  analyzeResponseTimes() {
    const responseTimes = this.metrics.responseTimes;
    if (responseTimes.length === 0) return { status: 'no_data' };

    const analysis = {
      average: this.metrics.avgResponseTime,
      min: this.metrics.minResponseTime,
      max: this.metrics.maxResponseTime,
      percentiles: this.metrics.percentiles,
      distribution: this.analyzeResponseTimeDistribution(responseTimes),
      trends: this.analyzeResponseTimeTrends(responseTimes),
      performance_rating: this.rateResponseTimePerformance()
    };

    return analysis;
  }

  /**
   * 分析响应时间分布
   */
  analyzeResponseTimeDistribution(responseTimes) {
    const buckets = {
      'fast': 0,      // < 200ms
      'acceptable': 0, // 200-1000ms
      'slow': 0,      // 1000-5000ms
      'very_slow': 0  // > 5000ms
    };

    responseTimes.forEach(time => {
      if (time < 200) buckets.fast++;
      else if (time < 1000) buckets.acceptable++;
      else if (time < 5000) buckets.slow++;
      else buckets.very_slow++;
    });

    const total = responseTimes.length;
    return {
      fast: { count: buckets.fast, percentage: (buckets.fast / total) * 100 },
      acceptable: { count: buckets.acceptable, percentage: (buckets.acceptable / total) * 100 },
      slow: { count: buckets.slow, percentage: (buckets.slow / total) * 100 },
      very_slow: { count: buckets.very_slow, percentage: (buckets.very_slow / total) * 100 }
    };
  }

  /**
   * 分析响应时间趋势
   */
  analyzeResponseTimeTrends(responseTimes) {
    if (responseTimes.length < 10) return { trend: 'insufficient_data' };

    const chunkSize = Math.floor(responseTimes.length / 10);
    const chunks = [];

    for (let i = 0; i < responseTimes.length; i += chunkSize) {
      const chunk = responseTimes.slice(i, i + chunkSize);
      const avg = chunk.reduce((sum, time) => sum + time, 0) / chunk.length;
      chunks.push(avg);
    }

    // 计算趋势
    const firstHalf = chunks.slice(0, Math.floor(chunks.length / 2));
    const secondHalf = chunks.slice(Math.floor(chunks.length / 2));

    const firstAvg = firstHalf.reduce((sum, avg) => sum + avg, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, avg) => sum + avg, 0) / secondHalf.length;

    const trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100;

    let trend = 'stable';
    if (trendPercentage > 10) trend = 'degrading';
    else if (trendPercentage < -10) trend = 'improving';

    return {
      trend,
      percentage_change: trendPercentage,
      first_half_avg: firstAvg,
      second_half_avg: secondAvg
    };
  }

  /**
   * 评估响应时间性能
   */
  rateResponseTimePerformance() {
    const avg = this.metrics.avgResponseTime;
    const p95 = this.metrics.percentiles?.p95 || avg;

    if (avg < 200 && p95 < 500) return 'excellent';
    if (avg < 500 && p95 < 1000) return 'good';
    if (avg < 1000 && p95 < 2000) return 'acceptable';
    if (avg < 2000 && p95 < 5000) return 'poor';
    return 'unacceptable';
  }

  /**
   * 分析吞吐量
   */
  analyzeThroughput() {
    const throughput = this.metrics.throughput;

    return {
      requests_per_second: throughput,
      requests_per_minute: throughput * 60,
      requests_per_hour: throughput * 3600,
      performance_rating: this.rateThroughputPerformance(throughput),
      capacity_estimation: this.estimateCapacity(throughput)
    };
  }

  /**
   * 评估吞吐量性能
   */
  rateThroughputPerformance(throughput) {
    if (throughput > 1000) return 'excellent';
    if (throughput > 500) return 'good';
    if (throughput > 100) return 'acceptable';
    if (throughput > 10) return 'poor';
    return 'unacceptable';
  }

  /**
   * 估算容量
   */
  estimateCapacity(throughput) {
    const dailyCapacity = throughput * 86400; // 24小时
    const monthlyCapacity = dailyCapacity * 30;

    return {
      daily_requests: Math.round(dailyCapacity),
      monthly_requests: Math.round(monthlyCapacity),
      concurrent_users_supported: Math.round(throughput * 10) // 假设每用户10秒一个请求
    };
  }

  /**
   * 分析错误
   */
  analyzeErrors() {
    const errorTypes = Array.from(this.errors.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: (count / this.metrics.totalRequests) * 100
    }));

    return {
      total_errors: this.metrics.failedRequests,
      error_rate: this.metrics.errorRate,
      error_types: errorTypes,
      error_severity: this.assessErrorSeverity(),
      most_common_error: errorTypes.length > 0 ? errorTypes.reduce((max, current) =>
        current.count > max.count ? current : max
      ) : null
    };
  }

  /**
   * 评估错误严重性
   */
  assessErrorSeverity() {
    const errorRate = this.metrics.errorRate;

    if (errorRate === 0) return 'none';
    if (errorRate < 1) return 'low';
    if (errorRate < 5) return 'medium';
    if (errorRate < 10) return 'high';
    return 'critical';
  }

  /**
   * 分析可扩展性
   */
  analyzeScalability() {
    // 基于响应时间和错误率的变化分析可扩展性
    const responseTimes = this.metrics.responseTimes;
    if (responseTimes.length < 100) return { status: 'insufficient_data' };

    const early = responseTimes.slice(0, Math.floor(responseTimes.length * 0.2));
    const late = responseTimes.slice(Math.floor(responseTimes.length * 0.8));

    const earlyAvg = early.reduce((sum, time) => sum + time, 0) / early.length;
    const lateAvg = late.reduce((sum, time) => sum + time, 0) / late.length;

    const degradation = ((lateAvg - earlyAvg) / earlyAvg) * 100;

    let scalability = 'good';
    if (degradation > 50) scalability = 'poor';
    else if (degradation > 20) scalability = 'limited';

    return {
      scalability_rating: scalability,
      performance_degradation: degradation,
      early_avg_response_time: earlyAvg,
      late_avg_response_time: lateAvg,
      recommendations: this.generateScalabilityRecommendations(scalability, degradation)
    };
  }

  /**
   * 分析可靠性
   */
  analyzeReliability() {
    const uptime = ((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) * 100;

    let reliability = 'excellent';
    if (uptime < 99.9) reliability = 'good';
    if (uptime < 99.5) reliability = 'acceptable';
    if (uptime < 99) reliability = 'poor';
    if (uptime < 95) reliability = 'unacceptable';

    return {
      uptime_percentage: uptime,
      reliability_rating: reliability,
      mtbf: this.calculateMTBF(), // Mean Time Between Failures
      availability_sla: this.assessSLACompliance(uptime)
    };
  }

  /**
   * 计算平均故障间隔时间
   */
  calculateMTBF() {
    if (this.metrics.failedRequests === 0) return 'infinite';

    const totalTime = this.metrics.endTime - this.metrics.startTime;
    return Math.round(totalTime / this.metrics.failedRequests);
  }

  /**
   * 评估SLA合规性
   */
  assessSLACompliance(uptime) {
    const slaLevels = [
      { level: '99.99%', threshold: 99.99, name: 'Tier 4' },
      { level: '99.95%', threshold: 99.95, name: 'Tier 3' },
      { level: '99.9%', threshold: 99.9, name: 'Tier 2' },
      { level: '99.5%', threshold: 99.5, name: 'Tier 1' },
      { level: '99%', threshold: 99, name: 'Basic' }
    ];

    for (const sla of slaLevels) {
      if (uptime >= sla.threshold) {
        return {
          compliant_sla: sla.level,
          tier: sla.name,
          meets_requirement: true
        };
      }
    }

    return {
      compliant_sla: 'None',
      tier: 'Below Basic',
      meets_requirement: false
    };
  }

  /**
   * 瓶颈分析
   */
  analyzeBottlenecks() {
    const bottlenecks = [];

    // 响应时间瓶颈
    if (this.metrics.avgResponseTime > 2000) {
      bottlenecks.push({
        type: 'response_time',
        severity: 'high',
        description: '平均响应时间过长',
        value: this.metrics.avgResponseTime,
        threshold: 2000
      });
    }

    // 错误率瓶颈
    if (this.metrics.errorRate > 5) {
      bottlenecks.push({
        type: 'error_rate',
        severity: 'high',
        description: '错误率过高',
        value: this.metrics.errorRate,
        threshold: 5
      });
    }

    // 吞吐量瓶颈
    if (this.metrics.throughput < 10) {
      bottlenecks.push({
        type: 'throughput',
        severity: 'medium',
        description: '吞吐量较低',
        value: this.metrics.throughput,
        threshold: 10
      });
    }

    return {
      total_bottlenecks: bottlenecks.length,
      bottlenecks,
      severity_distribution: this.categorizeBottlenecksBySeverity(bottlenecks),
      primary_bottleneck: bottlenecks.length > 0 ? bottlenecks[0] : null
    };
  }

  /**
   * 按严重性分类瓶颈
   */
  categorizeBottlenecksBySeverity(bottlenecks) {
    const distribution = { high: 0, medium: 0, low: 0 };

    bottlenecks.forEach(bottleneck => {
      distribution[bottleneck.severity]++;
    });

    return distribution;
  }

  /**
   * 生成建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 响应时间建议
    if (results.performanceAnalysis.responseTimeAnalysis.performance_rating === 'poor' ||
      results.performanceAnalysis.responseTimeAnalysis.performance_rating === 'unacceptable') {
      recommendations.push({
        category: 'response_time',
        priority: 'high',
        title: '优化响应时间',
        description: '响应时间过长，影响用户体验',
        suggestions: [
          '优化数据库查询',
          '实施缓存策略',
          '优化算法复杂度',
          '增加服务器资源',
          '使用CDN加速'
        ]
      });
    }

    // 错误率建议
    if (results.performanceAnalysis.errorAnalysis.error_severity === 'high' ||
      results.performanceAnalysis.errorAnalysis.error_severity === 'critical') {
      recommendations.push({
        category: 'error_handling',
        priority: 'high',
        title: '改善错误处理',
        description: '错误率过高，需要改善系统稳定性',
        suggestions: [
          '实施重试机制',
          '改善错误处理逻辑',
          '增加监控和告警',
          '优化资源管理',
          '实施熔断器模式'
        ]
      });
    }

    // 可扩展性建议
    if (results.performanceAnalysis.scalabilityAnalysis.scalability_rating === 'poor') {
      recommendations.push({
        category: 'scalability',
        priority: 'medium',
        title: '提升可扩展性',
        description: '系统在负载增加时性能下降明显',
        suggestions: [
          '实施水平扩展',
          '优化数据库连接池',
          '使用负载均衡',
          '实施微服务架构',
          '优化资源分配'
        ]
      });
    }

    // 吞吐量建议
    if (results.performanceAnalysis.throughputAnalysis.performance_rating === 'poor' ||
      results.performanceAnalysis.throughputAnalysis.performance_rating === 'unacceptable') {
      recommendations.push({
        category: 'throughput',
        priority: 'medium',
        title: '提升吞吐量',
        description: '系统吞吐量较低，需要优化处理能力',
        suggestions: [
          '优化并发处理',
          '使用异步处理',
          '实施队列机制',
          '优化I/O操作',
          '增加处理节点'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 生成可扩展性建议
   */
  generateScalabilityRecommendations(scalability, degradation) {
    const recommendations = [];

    if (scalability === 'poor') {
      recommendations.push('考虑实施水平扩展');
      recommendations.push('优化数据库查询和索引');
      recommendations.push('实施缓存策略');
    }

    if (degradation > 30) {
      recommendations.push('检查内存泄漏');
      recommendations.push('优化垃圾回收');
      recommendations.push('增加服务器资源');
    }

    return recommendations;
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      throughput: 0,
      errorRate: 0,
      concurrentUsers: 0,
      startTime: null,
      endTime: null
    };

    this.errors.clear();
    this.activeConnections.clear();
  }

  /**
   * 创建步骤指标
   */
  createStepMetrics() {
    return {
      requests: 0,
      errors: 0,
      totalResponseTime: 0
    };
  }

  /**
   * 分析步骤结果
   */
  analyzeStepResults(stepMetrics) {
    return {
      errorRate: stepMetrics.requests > 0 ? (stepMetrics.errors / stepMetrics.requests) * 100 : 0,
      avgResponseTime: stepMetrics.requests > 0 ? stepMetrics.totalResponseTime / stepMetrics.requests : 0
    };
  }

  /**
   * 停止测试
   */
  stopTest() {
    this.shouldStop = true;
    console.log('🛑 正在停止性能测试...');
  }

  /**
   * 获取实时指标
   */
  getRealTimeMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.activeConnections.size,
      isRunning: this.isRunning
    };
  }
}

module.exports = APIPerformanceTester;
