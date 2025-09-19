/**
 * 性能测试引擎
 * 支持负载测试、压力测试、并发测试和性能分析
 */

const { performance } = require('perf_hooks');
const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

class PerformanceTestEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxWorkers: options.maxWorkers || os.cpus().length,
      timeout: options.timeout || 60000,
      warmupTime: options.warmupTime || 5000,
      cooldownTime: options.cooldownTime || 5000,
      metricsInterval: options.metricsInterval || 1000,
      ...options
    };

    // 测试配置
    this.testConfigs = new Map();
    this.activeTests = new Map();
    this.workers = [];
    this.metrics = new Map();
    
    // 测试类型
    this.testTypes = {
      LOAD: 'load',           // 负载测试
      STRESS: 'stress',       // 压力测试
      SPIKE: 'spike',         // 峰值测试
      VOLUME: 'volume',       // 容量测试
      ENDURANCE: 'endurance', // 耐久测试
      SCALABILITY: 'scalability' // 可扩展性测试
    };
    
    // 性能指标
    this.metricTypes = {
      RESPONSE_TIME: 'responseTime',
      THROUGHPUT: 'throughput',
      ERROR_RATE: 'errorRate',
      CONCURRENCY: 'concurrency',
      CPU_USAGE: 'cpuUsage',
      MEMORY_USAGE: 'memoryUsage',
      NETWORK_IO: 'networkIO',
      PERCENTILES: 'percentiles'
    };
    
    this.initializeMetricsCollector();
  }

  /**
   * 初始化指标收集器
   */
  initializeMetricsCollector() {
    this.metricsCollector = setInterval(() => {
      this.activeTests.forEach((test, testId) => {
        if (test.status === 'running') {
          this.collectMetrics(testId);
        }
      });
    }, this.options.metricsInterval);
  }

  /**
   * 创建性能测试
   */
  async createPerformanceTest(config) {
    const testId = uuidv4();
    
    const test = {
      id: testId,
      name: config.name || `Performance Test ${testId}`,
      type: config.type || this.testTypes.LOAD,
      status: 'created',
      createdAt: new Date().toISOString(),
      
      // 目标配置
      target: {
        url: config.url,
        method: config.method || 'GET',
        headers: config.headers || {},
        body: config.body,
        auth: config.auth
      },
      
      // 负载配置
      load: {
        users: config.users || 10,              // 虚拟用户数
        rampUpTime: config.rampUpTime || 10000, // 递增时间(ms)
        duration: config.duration || 60000,     // 测试持续时间(ms)
        iterations: config.iterations,          // 迭代次数
        requestsPerSecond: config.rps           // 每秒请求数
      },
      
      // 场景配置
      scenarios: config.scenarios || [{
        name: 'default',
        weight: 1,
        requests: [config]
      }],
      
      // 断言配置
      assertions: config.assertions || {
        maxResponseTime: 2000,
        maxErrorRate: 0.01,
        minThroughput: 100
      },
      
      // 高级配置
      advanced: {
        thinkTime: config.thinkTime || 1000,    // 思考时间
        pacing: config.pacing,                   // 步调控制
        connectionPool: config.connectionPool || 10,
        keepAlive: config.keepAlive !== false,
        followRedirects: config.followRedirects !== false,
        retryOnFailure: config.retryOnFailure || 0
      },
      
      // 结果存储
      results: {
        requests: [],
        errors: [],
        metrics: {},
        summary: null
      }
    };
    
    this.testConfigs.set(testId, test);
    
    console.log(`✅ 创建性能测试: ${test.name} (${testId})`);
    
    return test;
  }

  /**
   * 执行性能测试
   */
  async runPerformanceTest(testId) {
    const test = this.testConfigs.get(testId);
    if (!test) {
      throw new Error(`测试不存在: ${testId}`);
    }
    
    if (test.status === 'running') {
      throw new Error('测试正在运行中');
    }
    
    console.log(`🚀 开始性能测试: ${test.name}`);
    console.log(`   类型: ${test.type}`);
    console.log(`   用户数: ${test.load.users}`);
    console.log(`   持续时间: ${test.load.duration}ms`);
    
    test.status = 'running';
    test.startTime = Date.now();
    this.activeTests.set(testId, test);
    
    // 发射测试开始事件
    this.emit('test:started', { testId, test });
    
    try {
      // 执行预热
      if (this.options.warmupTime > 0) {
        console.log(`♨️ 预热阶段 (${this.options.warmupTime}ms)...`);
        await this.warmup(test);
      }
      
      // 根据测试类型执行
      let result;
      switch (test.type) {
        case this.testTypes.LOAD:
          result = await this.runLoadTest(test);
          break;
        case this.testTypes.STRESS:
          result = await this.runStressTest(test);
          break;
        case this.testTypes.SPIKE:
          result = await this.runSpikeTest(test);
          break;
        case this.testTypes.VOLUME:
          result = await this.runVolumeTest(test);
          break;
        case this.testTypes.ENDURANCE:
          result = await this.runEnduranceTest(test);
          break;
        case this.testTypes.SCALABILITY:
          result = await this.runScalabilityTest(test);
          break;
        default:
          result = await this.runLoadTest(test);
      }
      
      // 执行冷却
      if (this.options.cooldownTime > 0) {
        console.log(`❄️ 冷却阶段 (${this.options.cooldownTime}ms)...`);
        await this.cooldown(test);
      }
      
      // 分析结果
      test.results.summary = this.analyzeResults(test);
      test.status = 'completed';
      test.endTime = Date.now();
      
      // 检查断言
      const assertionResults = this.checkAssertions(test);
      test.results.assertionResults = assertionResults;
      
      // 生成报告
      const report = this.generateReport(test);
      test.results.report = report;
      
      console.log(`✅ 性能测试完成: ${test.name}`);
      
      // 发射测试完成事件
      this.emit('test:completed', { testId, test, report });
      
      return report;
      
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      console.error(`❌ 性能测试失败: ${error.message}`);
      
      // 发射测试失败事件
      this.emit('test:failed', { testId, test, error });
      
      throw error;
      
    } finally {
      this.activeTests.delete(testId);
      await this.cleanupWorkers();
    }
  }

  /**
   * 负载测试
   */
  async runLoadTest(test) {
    console.log('📊 执行负载测试...');
    
    const { users, rampUpTime, duration } = test.load;
    const rampUpInterval = rampUpTime / users;
    const results = [];
    
    // 逐步增加用户
    for (let i = 0; i < users; i++) {
      this.spawnVirtualUser(test, i);
      
      if (i < users - 1) {
        await this.sleep(rampUpInterval);
      }
    }
    
    // 维持负载
    const startTime = Date.now();
    while (Date.now() - startTime < duration) {
      await this.sleep(1000);
      
      // 收集实时指标
      const metrics = this.collectRealtimeMetrics(test);
      this.emit('metrics:update', { testId: test.id, metrics });
    }
    
    return results;
  }

  /**
   * 压力测试
   */
  async runStressTest(test) {
    console.log('💪 执行压力测试...');
    
    let users = test.load.users;
    const duration = test.load.duration;
    const increment = Math.ceil(users * 0.1); // 每次增加10%
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      // 逐步增加负载
      for (let i = 0; i < increment; i++) {
        this.spawnVirtualUser(test, users++);
      }
      
      console.log(`   当前并发用户: ${users}`);
      
      // 检查系统是否崩溃
      const errorRate = this.calculateErrorRate(test);
      if (errorRate > 0.5) {
        console.log(`⚠️ 系统达到压力极限: 错误率 ${(errorRate * 100).toFixed(2)}%`);
        break;
      }
      
      await this.sleep(5000);
    }
    
    test.results.maxUsers = users;
    return test.results;
  }

  /**
   * 峰值测试
   */
  async runSpikeTest(test) {
    console.log('📈 执行峰值测试...');
    
    const { users, duration } = test.load;
    const spikePattern = [
      { users: users * 0.2, duration: duration * 0.2 },  // 低负载
      { users: users * 1.5, duration: duration * 0.3 },  // 突增峰值
      { users: users * 0.3, duration: duration * 0.2 },  // 回落
      { users: users * 2.0, duration: duration * 0.2 },  // 更高峰值
      { users: users * 0.1, duration: duration * 0.1 }   // 最终回落
    ];
    
    for (const phase of spikePattern) {
      console.log(`   阶段: ${phase.users} 用户, ${phase.duration}ms`);
      
      // 调整用户数
      await this.adjustVirtualUsers(test, phase.users);
      
      // 维持当前负载
      await this.sleep(phase.duration);
      
      // 收集指标
      const metrics = this.collectRealtimeMetrics(test);
      test.results.metrics[`phase_${phase.users}`] = metrics;
    }
    
    return test.results;
  }

  /**
   * 容量测试
   */
  async runVolumeTest(test) {
    console.log('📦 执行容量测试...');
    
    const { users, duration } = test.load;
    const dataVolumes = [1, 10, 100, 1000, 10000]; // KB
    
    for (const volume of dataVolumes) {
      console.log(`   测试数据量: ${volume}KB`);
      
      // 调整请求体大小
      test.target.body = this.generateTestData(volume * 1024);
      
      // 执行测试
      const startTime = Date.now();
      for (let i = 0; i < users; i++) {
        this.spawnVirtualUser(test, i);
      }
      
      // 等待完成
      await this.sleep(Math.min(duration, 30000));
      
      // 记录结果
      const metrics = this.collectRealtimeMetrics(test);
      test.results.metrics[`volume_${volume}KB`] = metrics;
      
      // 清理用户
      await this.cleanupVirtualUsers(test);
    }
    
    return test.results;
  }

  /**
   * 创建虚拟用户
   */
  spawnVirtualUser(test, userId) {
    const worker = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const axios = require('axios');
      
      async function runUser() {
        const { test, userId } = workerData;
        const results = [];
        
        while (true) {
          try {
            const startTime = Date.now();
            const response = await axios({
              method: test.target.method,
              url: test.target.url,
              headers: test.target.headers,
              data: test.target.body,
              timeout: 30000
            });
            
            const endTime = Date.now();
            const result = {
              userId,
              timestamp: startTime,
              responseTime: endTime - startTime,
              status: response.status,
              success: true
            };
            
            parentPort.postMessage({ type: 'result', result });
            
            // Think time
            await new Promise(resolve => setTimeout(resolve, test.advanced.thinkTime));
            
          } catch (error) {
            parentPort.postMessage({ 
              type: 'error', 
              error: {
                userId,
                message: error.message,
                timestamp: Date.now()
              }
            });
          }
        }
      }
      
      runUser();
    `, { 
      eval: true,
      workerData: { test, userId }
    });
    
    worker.on('message', (message) => {
      if (message.type === 'result') {
        test.results.requests.push(message.result);
        this.emit('request:completed', message.result);
      } else if (message.type === 'error') {
        test.results.errors.push(message.error);
        this.emit('request:error', message.error);
      }
    });
    
    worker.on('error', (error) => {
      console.error(`Worker error:`, error);
    });
    
    this.workers.push(worker);
    
    return worker;
  }

  /**
   * 收集实时指标
   */
  collectRealtimeMetrics(test) {
    const now = Date.now();
    const recentRequests = test.results.requests.filter(r => 
      now - r.timestamp < this.options.metricsInterval
    );
    
    if (recentRequests.length === 0) {
      return null;
    }
    
    const responseTimes = recentRequests.map(r => r.responseTime);
    const successCount = recentRequests.filter(r => r.success).length;
    
    return {
      timestamp: now,
      requestCount: recentRequests.length,
      throughput: (recentRequests.length / this.options.metricsInterval) * 1000,
      avgResponseTime: this.average(responseTimes),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50: this.percentile(responseTimes, 50),
      p90: this.percentile(responseTimes, 90),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
      successRate: successCount / recentRequests.length,
      errorRate: 1 - (successCount / recentRequests.length),
      activeUsers: this.workers.filter(w => w.threadId).length,
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 分析测试结果
   */
  analyzeResults(test) {
    const { requests, errors } = test.results;
    
    if (requests.length === 0) {
      return { error: '没有完成的请求' };
    }
    
    const responseTimes = requests.map(r => r.responseTime);
    const successfulRequests = requests.filter(r => r.success);
    const failedRequests = requests.filter(r => !r.success);
    
    // 按时间分组统计
    const timeSeriesData = this.groupByTimeWindow(requests, 1000);
    
    return {
      summary: {
        totalRequests: requests.length,
        successfulRequests: successfulRequests.length,
        failedRequests: failedRequests.length + errors.length,
        successRate: (successfulRequests.length / requests.length * 100).toFixed(2) + '%',
        errorRate: ((failedRequests.length + errors.length) / requests.length * 100).toFixed(2) + '%'
      },
      
      responseTime: {
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        avg: this.average(responseTimes),
        median: this.percentile(responseTimes, 50),
        stdDev: this.standardDeviation(responseTimes),
        percentiles: {
          p50: this.percentile(responseTimes, 50),
          p75: this.percentile(responseTimes, 75),
          p90: this.percentile(responseTimes, 90),
          p95: this.percentile(responseTimes, 95),
          p99: this.percentile(responseTimes, 99),
          p99_9: this.percentile(responseTimes, 99.9)
        }
      },
      
      throughput: {
        avg: requests.length / ((test.endTime - test.startTime) / 1000),
        max: Math.max(...timeSeriesData.map(d => d.count)),
        timeSeries: timeSeriesData
      },
      
      errors: {
        total: errors.length,
        types: this.groupErrors(errors),
        rate: (errors.length / requests.length * 100).toFixed(2) + '%'
      },
      
      distribution: {
        responseTime: this.createHistogram(responseTimes, 10),
        statusCodes: this.groupByProperty(requests, 'status')
      }
    };
  }

  /**
   * 检查断言
   */
  checkAssertions(test) {
    const { summary } = test.results;
    const { assertions } = test;
    const results = [];
    
    // 检查最大响应时间
    if (assertions.maxResponseTime) {
      const passed = summary.responseTime.max <= assertions.maxResponseTime;
      results.push({
        type: 'maxResponseTime',
        expected: assertions.maxResponseTime,
        actual: summary.responseTime.max,
        passed,
        message: passed ? 
          `响应时间在限制内 (${summary.responseTime.max}ms <= ${assertions.maxResponseTime}ms)` :
          `响应时间超出限制 (${summary.responseTime.max}ms > ${assertions.maxResponseTime}ms)`
      });
    }
    
    // 检查错误率
    if (assertions.maxErrorRate) {
      const errorRate = parseFloat(summary.errors.rate) / 100;
      const passed = errorRate <= assertions.maxErrorRate;
      results.push({
        type: 'maxErrorRate',
        expected: assertions.maxErrorRate,
        actual: errorRate,
        passed,
        message: passed ?
          `错误率在限制内 (${(errorRate * 100).toFixed(2)}% <= ${(assertions.maxErrorRate * 100).toFixed(2)}%)` :
          `错误率超出限制 (${(errorRate * 100).toFixed(2)}% > ${(assertions.maxErrorRate * 100).toFixed(2)}%)`
      });
    }
    
    // 检查吞吐量
    if (assertions.minThroughput) {
      const passed = summary.throughput.avg >= assertions.minThroughput;
      results.push({
        type: 'minThroughput',
        expected: assertions.minThroughput,
        actual: summary.throughput.avg,
        passed,
        message: passed ?
          `吞吐量满足要求 (${summary.throughput.avg.toFixed(2)} >= ${assertions.minThroughput})` :
          `吞吐量不满足要求 (${summary.throughput.avg.toFixed(2)} < ${assertions.minThroughput})`
      });
    }
    
    const allPassed = results.every(r => r.passed);
    
    return {
      passed: allPassed,
      results,
      summary: allPassed ? '所有断言通过 ✅' : '部分断言失败 ❌'
    };
  }

  /**
   * 生成测试报告
   */
  generateReport(test) {
    const { summary, assertionResults } = test.results;
    
    const report = {
      testId: test.id,
      testName: test.name,
      testType: test.type,
      executionTime: {
        start: new Date(test.startTime).toISOString(),
        end: new Date(test.endTime).toISOString(),
        duration: test.endTime - test.startTime
      },
      
      configuration: {
        targetUrl: test.target.url,
        method: test.target.method,
        virtualUsers: test.load.users,
        testDuration: test.load.duration,
        rampUpTime: test.load.rampUpTime
      },
      
      results: summary,
      
      assertions: assertionResults,
      
      recommendations: this.generateRecommendations(summary),
      
      visualizations: {
        responseTimeChart: this.generateChartData(test.results.requests, 'responseTime'),
        throughputChart: this.generateChartData(test.results.requests, 'throughput'),
        errorRateChart: this.generateChartData(test.results.errors, 'errors')
      }
    };
    
    // 打印报告摘要
    this.printReportSummary(report);
    
    return report;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(summary) {
    const recommendations = [];
    
    // 响应时间建议
    if (summary.responseTime.p95 > 2000) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: '95%的请求响应时间超过2秒，建议优化服务器性能或增加缓存'
      });
    }
    
    // 错误率建议
    const errorRate = parseFloat(summary.errors.rate);
    if (errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        severity: 'critical',
        message: `错误率达到${errorRate}%，需要检查服务稳定性`
      });
    }
    
    // 吞吐量建议
    if (summary.throughput.avg < 100) {
      recommendations.push({
        type: 'scalability',
        severity: 'medium',
        message: '吞吐量较低，考虑横向扩展或优化数据库查询'
      });
    }
    
    // 响应时间分布建议
    const p99_p50_ratio = summary.responseTime.percentiles.p99 / summary.responseTime.percentiles.p50;
    if (p99_p50_ratio > 10) {
      recommendations.push({
        type: 'consistency',
        severity: 'medium',
        message: '响应时间波动较大，可能存在性能瓶颈或资源竞争'
      });
    }
    
    return recommendations;
  }

  /**
   * 打印报告摘要
   */
  printReportSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 性能测试报告');
    console.log('='.repeat(60));
    console.log(`测试名称: ${report.testName}`);
    console.log(`测试类型: ${report.testType}`);
    console.log(`执行时间: ${(report.executionTime.duration / 1000).toFixed(2)}秒`);
    console.log('-'.repeat(60));
    
    const { summary } = report.results;
    console.log('📈 关键指标:');
    console.log(`  总请求数: ${summary.totalRequests}`);
    console.log(`  成功率: ${summary.successRate}`);
    console.log(`  错误率: ${summary.errorRate}`);
    console.log(`  平均响应时间: ${summary.responseTime.avg.toFixed(2)}ms`);
    console.log(`  P95响应时间: ${summary.responseTime.percentiles.p95.toFixed(2)}ms`);
    console.log(`  P99响应时间: ${summary.responseTime.percentiles.p99.toFixed(2)}ms`);
    console.log(`  平均吞吐量: ${summary.throughput.avg.toFixed(2)} req/s`);
    
    if (report.assertions) {
      console.log('-'.repeat(60));
      console.log('✅ 断言结果:');
      report.assertions.results.forEach(assertion => {
        const icon = assertion.passed ? '✓' : '✗';
        console.log(`  ${icon} ${assertion.message}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('-'.repeat(60));
      console.log('💡 优化建议:');
      report.recommendations.forEach(rec => {
        const severity = rec.severity === 'critical' ? '🔴' : 
                         rec.severity === 'high' ? '🟡' : '🟢';
        console.log(`  ${severity} ${rec.message}`);
      });
    }
    
    console.log('='.repeat(60));
  }

  /**
   * 工具方法
   */
  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  groupByTimeWindow(data, windowSize) {
    const grouped = {};
    data.forEach(item => {
      const window = Math.floor(item.timestamp / windowSize) * windowSize;
      if (!grouped[window]) {
        grouped[window] = [];
      }
      grouped[window].push(item);
    });
    
    return Object.entries(grouped).map(([timestamp, items]) => ({
      timestamp: parseInt(timestamp),
      count: items.length,
      avgResponseTime: this.average(items.map(i => i.responseTime))
    }));
  }

  createHistogram(data, bins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;
    const histogram = Array(bins).fill(0);
    
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    return histogram.map((count, i) => ({
      range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
      count
    }));
  }

  groupByProperty(data, property) {
    const grouped = {};
    data.forEach(item => {
      const key = item[property];
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  }

  groupErrors(errors) {
    const grouped = {};
    errors.forEach(error => {
      const type = error.message.split(':')[0];
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  generateChartData(data, type) {
    // 生成图表数据（简化版）
    return {
      type: 'line',
      labels: data.map((d, i) => i),
      data: data.map(d => d[type] || d)
    };
  }

  generateTestData(bytes) {
    return 'x'.repeat(bytes);
  }

  calculateErrorRate(test) {
    const recent = test.results.requests.slice(-100);
    if (recent.length === 0) return 0;
    const errors = recent.filter(r => !r.success).length;
    return errors / recent.length;
  }

  async adjustVirtualUsers(test, targetUsers) {
    const currentUsers = this.workers.length;
    
    if (targetUsers > currentUsers) {
      // 增加用户
      for (let i = currentUsers; i < targetUsers; i++) {
        this.spawnVirtualUser(test, i);
      }
    } else if (targetUsers < currentUsers) {
      // 减少用户
      const toRemove = currentUsers - targetUsers;
      for (let i = 0; i < toRemove; i++) {
        const worker = this.workers.pop();
        if (worker) {
          await worker.terminate();
        }
      }
    }
  }

  async cleanupVirtualUsers(test) {
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
  }

  async warmup(test) {
    // 预热逻辑
    await this.sleep(this.options.warmupTime);
  }

  async cooldown(test) {
    // 冷却逻辑
    await this.sleep(this.options.cooldownTime);
  }

  async cleanupWorkers() {
    for (const worker of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        console.error('清理 worker 失败:', error);
      }
    }
    this.workers = [];
  }

  collectMetrics(testId) {
    const test = this.activeTests.get(testId);
    if (!test) return;
    
    const metrics = this.collectRealtimeMetrics(test);
    if (metrics) {
      if (!this.metrics.has(testId)) {
        this.metrics.set(testId, []);
      }
      this.metrics.get(testId).push(metrics);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  cleanup() {
    clearInterval(this.metricsCollector);
    this.cleanupWorkers();
    this.removeAllListeners();
  }
}

module.exports = PerformanceTestEngine;
