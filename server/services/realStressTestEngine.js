/**
 * 真实的压力测试引擎 - 使用Node.js原生模块进行真实的压力测试
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

class RealStressTestEngine {
  constructor() {
    this.name = 'real-stress-test-engine';
    this.version = '1.0.0';
    this.maxConcurrentUsers = Math.min(1000, os.cpus().length * 50); // 基于CPU核心数限制
    this.runningTests = new Map(); // 存储正在运行的测试状态
  }

  /**
   * 运行真实的压力测试
   */
  async runStressTest(url, config = {}) {
    const {
      users = 10,
      duration = 30,
      rampUpTime = 5,
      testType = 'gradual',
      method = 'GET',
      timeout = 10,
      thinkTime = 1
    } = config;

    // 生成测试ID
    const testId = `stress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 初始化测试状态
    this.updateTestStatus(testId, {
      status: 'running',
      progress: 0,
      startTime: Date.now(),
      url: url,
      config: config,
      realTimeMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastResponseTime: 0,
        lastRequestSuccess: true,
        activeRequests: 0
      }
    });

    console.log(`⚡ Starting real stress test for: ${url} (ID: ${testId})`);
    console.log(`👥 Users: ${users}, Duration: ${duration}s, Ramp-up: ${rampUpTime}s, Type: ${testType}`);

    // 验证参数
    if (users > this.maxConcurrentUsers) {
      throw new Error(`用户数不能超过 ${this.maxConcurrentUsers}`);
    }

    if (duration > 600) { // 最大10分钟
      throw new Error('测试时长不能超过600秒');
    }

    if (!this.validateUrl(url)) {
      throw new Error('无效的URL格式');
    }

    const startTime = Date.now();

    const results = {
      testId,
      url,
      config: { users, duration, rampUpTime, testType, method, timeout, thinkTime },
      startTime: startTime, // 保留数字时间戳用于计算
      startTimeISO: new Date(startTime).toISOString(), // ISO字符串用于显示
      status: 'running',
      progress: 0,
      currentPhase: 'initializing',
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: [],
        throughput: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        requestsPerSecond: 0
      },
      realTimeData: []
    };

    try {
      // 执行压力测试
      await this.executeStressTest(url, users, duration, rampUpTime, testType, method, timeout, thinkTime, results);

      // 计算最终指标
      this.calculateFinalMetrics(results);

      results.status = 'completed';
      results.progress = 100;
      results.currentPhase = 'completed';
      results.endTime = new Date().toISOString();
      results.actualDuration = (Date.now() - startTime) / 1000;

      console.log(`✅ Stress test completed for: ${url}`);
      console.log(`📊 Results: ${results.metrics.successfulRequests}/${results.metrics.totalRequests} requests successful`);
      console.log(`⚡ Average response time: ${results.metrics.averageResponseTime}ms`);
      console.log(`🚀 Throughput: ${results.metrics.throughput} req/s`);
      console.log(`❌ Error rate: ${results.metrics.errorRate}%`);

      // 广播测试完成
      this.broadcastTestComplete(testId, results);

      // 清理测试状态
      this.removeTestStatus(testId);

      return { success: true, data: results };

    } catch (error) {
      console.error(`❌ Stress test failed for: ${url}`, error);
      results.status = 'failed';
      results.error = error.message;
      results.endTime = new Date().toISOString();
      results.actualDuration = (Date.now() - startTime) / 1000;

      return {
        success: false,
        error: error.message,
        data: results
      };
    }
  }

  /**
   * 执行压力测试的核心逻辑
   */
  async executeStressTest(url, users, duration, rampUpTime, testType, method, timeout, thinkTime, results) {
    console.log(`🚀 Executing ${testType} stress test...`);

    // 根据测试类型调整执行策略
    switch (testType) {
      case 'gradual':
        await this.executeGradualTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results);
        break;
      case 'spike':
        await this.executeSpikeTest(url, users, duration, method, timeout, thinkTime, results);
        break;
      case 'constant':
        await this.executeConstantTest(url, users, duration, method, timeout, thinkTime, results);
        break;
      case 'stress':
        await this.executeStressLimitTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results);
        break;
      default:
        await this.executeGradualTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results);
    }
  }

  /**
   * 梯度加压测试
   */
  async executeGradualTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results) {
    results.currentPhase = 'ramp-up';
    const promises = [];
    const userStartInterval = (rampUpTime * 1000) / users;

    // 启动进度监控
    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    // 启动所有虚拟用户
    for (let i = 0; i < users; i++) {
      const userStartDelay = i * userStartInterval;
      const userDuration = (duration * 1000) - userStartDelay;

      if (userDuration > 0) {
        const userPromise = new Promise((resolve) => {
          setTimeout(() => {
            results.metrics.activeUsers++;
            this.runVirtualUser(url, userDuration, method, timeout, thinkTime, results).then(() => {
              results.metrics.activeUsers--;
              resolve();
            });
          }, userStartDelay);
        });

        promises.push(userPromise);
      }
    }

    // 等待所有用户完成
    await Promise.all(promises);
    clearInterval(progressMonitor);
  }

  /**
   * 峰值测试 - 快速启动所有用户
   */
  async executeSpikeTest(url, users, duration, method, timeout, thinkTime, results) {
    results.currentPhase = 'spike';
    const promises = [];

    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    // 快速启动所有用户（在1秒内）
    for (let i = 0; i < users; i++) {
      const userStartDelay = (i * 1000) / users; // 在1秒内分散启动

      const userPromise = new Promise((resolve) => {
        setTimeout(() => {
          results.metrics.activeUsers++;
          this.runVirtualUser(url, duration * 1000, method, timeout, thinkTime, results).then(() => {
            results.metrics.activeUsers--;
            resolve();
          });
        }, userStartDelay);
      });

      promises.push(userPromise);
    }

    await Promise.all(promises);
    clearInterval(progressMonitor);
  }

  /**
   * 恒定负载测试
   */
  async executeConstantTest(url, users, duration, method, timeout, thinkTime, results) {
    results.currentPhase = 'constant';
    const promises = [];

    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    // 立即启动所有用户
    for (let i = 0; i < users; i++) {
      const userPromise = new Promise((resolve) => {
        results.metrics.activeUsers++;
        this.runVirtualUser(url, duration * 1000, method, timeout, thinkTime, results).then(() => {
          results.metrics.activeUsers--;
          resolve();
        });
      });

      promises.push(userPromise);
    }

    await Promise.all(promises);
    clearInterval(progressMonitor);
  }

  /**
   * 压力极限测试 - 逐步增加到极限
   */
  async executeStressLimitTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results) {
    results.currentPhase = 'stress-limit';
    const promises = [];

    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    // 分阶段增加用户数
    const phases = 3;
    const usersPerPhase = Math.ceil(users / phases);
    const phaseInterval = (rampUpTime * 1000) / phases;

    for (let phase = 0; phase < phases; phase++) {
      const phaseUsers = Math.min(usersPerPhase, users - phase * usersPerPhase);
      const phaseStartDelay = phase * phaseInterval;

      for (let i = 0; i < phaseUsers; i++) {
        const userStartDelay = phaseStartDelay + (i * 100); // 每个用户间隔100ms
        const userDuration = (duration * 1000) - userStartDelay;

        if (userDuration > 0) {
          const userPromise = new Promise((resolve) => {
            setTimeout(() => {
              results.metrics.activeUsers++;
              this.runVirtualUser(url, userDuration, method, timeout, thinkTime, results).then(() => {
                results.metrics.activeUsers--;
                resolve();
              });
            }, userStartDelay);
          });

          promises.push(userPromise);
        }
      }
    }

    await Promise.all(promises);
    clearInterval(progressMonitor);
  }

  /**
   * 启动进度监控
   */
  startProgressMonitor(results, totalDuration) {
    const startTime = Date.now();

    return setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      results.progress = Math.round(progress);

      // 更新实时数据
      const currentTime = new Date().toISOString();
      const recentRequests = results.metrics.totalRequests;
      const recentResponseTime = results.metrics.responseTimes.length > 0 ?
        results.metrics.responseTimes[results.metrics.responseTimes.length - 1] : 0;

      // 计算当前吞吐量（基于已完成的请求数和经过的时间）
      const elapsedSeconds = elapsed / 1000;
      const currentThroughput = elapsedSeconds > 0 ? recentRequests / elapsedSeconds : 0;

      results.realTimeData.push({
        timestamp: currentTime,
        totalRequests: recentRequests,
        activeUsers: results.metrics.activeUsers,
        responseTime: recentResponseTime,
        throughput: Math.round(currentThroughput * 100) / 100, // 保留2位小数
        errorRate: results.metrics.totalRequests > 0 ?
          (results.metrics.failedRequests / results.metrics.totalRequests) * 100 : 0
      });

      // 限制实时数据数量
      if (results.realTimeData.length > 100) {
        results.realTimeData = results.realTimeData.slice(-100);
      }

      console.log(`📊 Progress: ${results.progress}%, Active users: ${results.metrics.activeUsers}, Total requests: ${results.metrics.totalRequests}`);
    }, 1000); // 每秒更新一次
  }

  /**
   * 运行单个虚拟用户
   */
  async runVirtualUser(url, duration, method, timeout, thinkTime, results) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const userId = Math.random().toString(36).substr(2, 9);
    const userResults = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      userId: userId
    };

    console.log(`🤖 Virtual user ${userId} started for ${duration}ms`);

    while (Date.now() < endTime) {
      try {
        const requestStart = Date.now();
        const response = await this.makeRequest(url, method, timeout);
        const responseTime = Date.now() - requestStart;

        userResults.requests++;
        userResults.responseTimes.push(responseTime);

        if (response.success) {
          userResults.successes++;
        } else {
          userResults.failures++;
          if (results.metrics.errors.length < 100) { // 增加错误记录数量
            results.metrics.errors.push({
              timestamp: new Date().toISOString(),
              error: response.error || 'Unknown error',
              statusCode: response.statusCode,
              url: url,
              userId: userId,
              responseTime: responseTime
            });
          }
        }

        // 更新全局结果（线程安全）
        this.updateGlobalResults(results, responseTime, response.success);

        // 更新实时状态并广播数据
        if (results.testId) {
          const testStatus = this.getTestStatus(results.testId);
          if (testStatus) {
            testStatus.realTimeMetrics.totalRequests = results.metrics.totalRequests;
            testStatus.realTimeMetrics.successfulRequests = results.metrics.successfulRequests;
            testStatus.realTimeMetrics.failedRequests = results.metrics.failedRequests;
            testStatus.realTimeMetrics.lastResponseTime = responseTime;
            testStatus.realTimeMetrics.lastRequestSuccess = response.success;
            testStatus.realTimeMetrics.activeRequests = results.metrics.activeUsers;
            this.updateTestStatus(results.testId, testStatus);

            // 广播实时数据点
            const elapsedTime = (Date.now() - results.startTime) / 1000;
            const currentThroughput = elapsedTime > 0 ? results.metrics.totalRequests / elapsedTime : 0;
            const errorRate = results.metrics.totalRequests > 0 ?
              (results.metrics.failedRequests / results.metrics.totalRequests) * 100 : 0;

            this.broadcastRealTimeData(results.testId, {
              timestamp: Date.now(),
              responseTime: responseTime,
              throughput: Math.round(currentThroughput * 100) / 100,
              activeUsers: results.metrics.activeUsers,
              errorRate: Math.round(errorRate * 100) / 100,
              totalRequests: results.metrics.totalRequests,
              successfulRequests: results.metrics.successfulRequests,
              failedRequests: results.metrics.failedRequests,
              success: response.success,
              phase: results.currentPhase || 'running'
            });
          }
        }

        // 记录实时数据点用于图表显示
        // 计算当前吞吐量
        const elapsedTime = (Date.now() - results.startTime) / 1000;
        const currentThroughput = elapsedTime > 0 ? results.metrics.totalRequests / elapsedTime : 0;

        this.recordRealTimeDataPoint(results, {
          timestamp: Date.now(),
          responseTime: responseTime,
          status: response.statusCode || (response.success ? 200 : 500),
          success: response.success,
          activeUsers: results.metrics.activeUsers,
          throughput: Math.round(currentThroughput * 100) / 100, // 保留2位小数
          userId: userId,
          phase: results.currentPhase || 'running'
        });

        // 动态思考时间 - 基于当前性能调整
        const dynamicThinkTime = this.calculateDynamicThinkTime(thinkTime, results.metrics);
        if (dynamicThinkTime > 0) {
          await this.sleep(dynamicThinkTime);
        } else {
          // 最小延迟避免过于密集的请求
          await this.sleep(Math.random() * 20 + 10); // 10-30ms随机延迟，减少延迟提高请求频率
        }

      } catch (error) {
        const responseTime = Date.now() - requestStart;
        userResults.requests++;
        userResults.failures++;

        if (results.metrics.errors.length < 100) {
          results.metrics.errors.push({
            timestamp: new Date().toISOString(),
            error: error.message,
            url: url,
            userId: userId,
            responseTime: responseTime,
            type: 'network_error'
          });
        }

        this.updateGlobalResults(results, responseTime, false);

        // 记录错误的实时数据点
        this.recordRealTimeDataPoint(results, {
          timestamp: Date.now(),
          responseTime: responseTime,
          status: 0,
          success: false,
          activeUsers: results.metrics.activeUsers,
          userId: userId,
          error: error.message,
          phase: results.currentPhase || 'running'
        });

        // 错误后适当延迟，避免连续错误
        await this.sleep(Math.min(2000, 500 + Math.random() * 1500));
      }
    }

    console.log(`🏁 Virtual user ${userId} completed: ${userResults.successes}/${userResults.requests} successful`);
    return userResults;
  }

  /**
   * 记录实时数据点
   */
  recordRealTimeDataPoint(results, dataPoint) {
    results.realTimeData.push(dataPoint);

    // 限制实时数据点数量，避免内存溢出
    if (results.realTimeData.length > 1000) {
      results.realTimeData = results.realTimeData.slice(-800);
    }

    // 通过WebSocket广播实时数据
    this.broadcastRealTimeData(results.testId, {
      dataPoint,
      metrics: {
        totalRequests: results.metrics.totalRequests,
        successfulRequests: results.metrics.successfulRequests,
        failedRequests: results.metrics.failedRequests,
        averageResponseTime: results.metrics.averageResponseTime,
        errorRate: results.metrics.errorRate,
        activeUsers: results.metrics.activeUsers,
        throughput: results.metrics.throughput
      },
      progress: results.progress || 0,
      phase: results.currentPhase || 'running'
    });
  }

  /**
   * 计算动态思考时间
   */
  calculateDynamicThinkTime(baseThinkTime, metrics) {
    // 基于错误率调整思考时间
    const errorRate = metrics.totalRequests > 0 ?
      (metrics.failedRequests / metrics.totalRequests) * 100 : 0;

    // 基于平均响应时间调整
    const avgResponseTime = metrics.averageResponseTime || 0;

    let multiplier = 1;

    // 如果错误率高，增加思考时间以减少服务器压力
    if (errorRate > 20) {
      multiplier = 3; // 三倍思考时间
    } else if (errorRate > 10) {
      multiplier = 2; // 双倍思考时间
    } else if (errorRate > 5) {
      multiplier = 1.5; // 1.5倍思考时间
    }

    // 如果响应时间过长，也增加思考时间
    if (avgResponseTime > 5000) {
      multiplier = Math.max(multiplier, 2);
    } else if (avgResponseTime > 2000) {
      multiplier = Math.max(multiplier, 1.5);
    }

    return baseThinkTime * 1000 * multiplier;
  }

  /**
   * 发起HTTP请求
   */
  async makeRequest(url, method = 'GET', timeout = 10) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const startTime = Date.now();
      const timeoutMs = timeout * 1000;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method.toUpperCase(),
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'RealStressTest/1.0 (Node.js)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      };

      // 添加HTTPS特定选项
      if (urlObj.protocol === 'https:') {
        options.rejectUnauthorized = false; // 允许自签名证书（测试环境）
      }

      const req = client.request(options, (res) => {
        let data = '';
        let dataLength = 0;

        res.on('data', (chunk) => {
          data += chunk;
          dataLength += chunk.length;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          const success = res.statusCode >= 200 && res.statusCode < 400;

          resolve({
            success,
            statusCode: res.statusCode,
            responseTime,
            contentLength: dataLength,
            headers: res.headers
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: false,
          error: error.message,
          responseTime,
          statusCode: 0
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: `Request timeout after ${timeout}s`,
          responseTime: timeoutMs,
          statusCode: 0
        });
      });

      // 处理POST/PUT等方法的请求体
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        req.write(''); // 空请求体，实际应用中可以添加数据
      }

      req.end();
    });
  }

  /**
   * 更新全局测试结果
   */
  updateGlobalResults(results, responseTime, success) {
    results.metrics.totalRequests++;

    if (success) {
      results.metrics.successfulRequests++;
    } else {
      results.metrics.failedRequests++;
    }

    if (responseTime > 0) {
      results.metrics.responseTimes.push(responseTime);

      // 实时更新响应时间统计
      this.updateResponseTimeStats(results.metrics, responseTime);
    }
  }

  /**
   * 更新响应时间统计
   */
  updateResponseTimeStats(metrics, responseTime) {
    // 更新最小/最大响应时间
    if (metrics.minResponseTime === 0 || responseTime < metrics.minResponseTime) {
      metrics.minResponseTime = responseTime;
    }
    if (responseTime > metrics.maxResponseTime) {
      metrics.maxResponseTime = responseTime;
    }

    // 计算平均响应时间
    if (metrics.totalRequests > 0) {
      const totalTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0);
      metrics.averageResponseTime = Math.round(totalTime / metrics.totalRequests);
    }

    // 每100个请求计算一次百分位数以提高性能
    if (metrics.totalRequests % 100 === 0) {
      this.calculatePercentiles(metrics);
    }

    // 计算错误率
    metrics.errorRate = metrics.totalRequests > 0 ?
      ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2) : 0;
  }

  /**
   * 计算百分位数
   */
  calculatePercentiles(metrics) {
    if (metrics.responseTimes.length === 0) return;

    const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
    const length = sortedTimes.length;

    metrics.p50ResponseTime = this.getPercentile(sortedTimes, 50);
    metrics.p90ResponseTime = this.getPercentile(sortedTimes, 90);
    metrics.p95ResponseTime = this.getPercentile(sortedTimes, 95);
    metrics.p99ResponseTime = this.getPercentile(sortedTimes, 99);
  }

  /**
   * 获取指定百分位数
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 计算最终指标
   */
  calculateFinalMetrics(results) {
    const metrics = results.metrics;

    // 计算平均响应时间
    if (metrics.responseTimes.length > 0) {
      metrics.averageResponseTime = Math.round(
        metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
      );

      // 计算百分位数
      const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
      metrics.p50ResponseTime = this.getPercentile(sortedTimes, 50);
      metrics.p90ResponseTime = this.getPercentile(sortedTimes, 90);
      metrics.p95ResponseTime = this.getPercentile(sortedTimes, 95);
      metrics.p99ResponseTime = this.getPercentile(sortedTimes, 99);
    }

    // 计算错误率
    if (metrics.totalRequests > 0) {
      metrics.errorRate = ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2);
    }

    // 计算吞吐量 (requests per second)
    if (results.actualDuration > 0 && metrics.totalRequests > 0) {
      const throughputValue = metrics.totalRequests / results.actualDuration;
      metrics.throughput = isNaN(throughputValue) ? 0 : parseFloat(throughputValue.toFixed(2));
      metrics.requestsPerSecond = metrics.throughput; // 确保两个字段都有值
    } else {
      metrics.throughput = 0;
      metrics.requestsPerSecond = 0;
    }

    // 清理详细数据以减少响应大小
    delete metrics.responseTimes; // 保留统计信息，删除原始数据

    // 限制错误信息数量
    if (metrics.errors.length > 10) {
      metrics.errors = metrics.errors.slice(0, 10);
      metrics.errors.push({ message: `... and ${metrics.errors.length - 10} more errors` });
    }
  }

  /**
   * 计算百分位数
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证URL格式
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 获取测试引擎状态
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      available: true,
      maxConcurrentUsers: this.maxConcurrentUsers,
      systemInfo: {
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
        platform: os.platform(),
        arch: os.arch()
      }
    };
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.runningTests.get(testId) || null;
  }

  /**
   * 更新测试状态
   */
  updateTestStatus(testId, status) {
    this.runningTests.set(testId, {
      ...this.runningTests.get(testId),
      ...status,
      lastUpdated: Date.now()
    });
  }

  /**
   * 移除测试状态
   */
  removeTestStatus(testId) {
    this.runningTests.delete(testId);
  }

  /**
   * 通过WebSocket广播实时数据
   */
  broadcastRealTimeData(testId, data) {
    try {
      // 检查全局io实例是否存在
      if (global.io) {
        global.io.to(`stress-test-${testId}`).emit('stress-test-data', {
          testId,
          timestamp: Date.now(),
          ...data
        });
      }
    } catch (error) {
      console.error('WebSocket广播失败:', error);
    }
  }

  /**
   * 广播测试状态更新
   */
  broadcastTestStatus(testId, status) {
    try {
      if (global.io) {
        global.io.to(`stress-test-${testId}`).emit('stress-test-status', {
          testId,
          timestamp: Date.now(),
          ...status
        });
      }
    } catch (error) {
      console.error('WebSocket状态广播失败:', error);
    }
  }

  /**
   * 广播测试完成
   */
  broadcastTestComplete(testId, results) {
    try {
      if (global.io) {
        global.io.to(`stress-test-${testId}`).emit('stress-test-complete', {
          testId,
          timestamp: Date.now(),
          results
        });
      }
    } catch (error) {
      console.error('WebSocket完成广播失败:', error);
    }
  }
}

module.exports = { RealStressTestEngine };
