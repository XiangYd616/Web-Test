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

    console.log(`⚡ Starting real stress test for: ${url}`);
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

    const testId = `stress-${Date.now()}`;
    const startTime = Date.now();

    const results = {
      testId,
      url,
      config: { users, duration, rampUpTime, testType, method, timeout, thinkTime },
      startTime: new Date(startTime).toISOString(),
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

      results.realTimeData.push({
        timestamp: currentTime,
        totalRequests: recentRequests,
        activeUsers: results.metrics.activeUsers,
        responseTime: recentResponseTime,
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
    const userResults = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: []
    };

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
          if (results.metrics.errors.length < 50) { // 限制错误数量
            results.metrics.errors.push({
              timestamp: new Date().toISOString(),
              error: response.error || 'Unknown error',
              statusCode: response.statusCode,
              url: url
            });
          }
        }

        // 更新全局结果（线程安全）
        this.updateGlobalResults(results, responseTime, response.success);

        // 思考时间 - 模拟真实用户行为
        if (thinkTime > 0) {
          const actualThinkTime = thinkTime * 1000 + (Math.random() * 1000); // 基础思考时间 + 随机延迟
          await this.sleep(actualThinkTime);
        } else {
          // 最小延迟避免过于密集的请求
          await this.sleep(Math.random() * 100 + 50); // 50-150ms随机延迟
        }

      } catch (error) {
        userResults.requests++;
        userResults.failures++;

        if (results.metrics.errors.length < 50) {
          results.metrics.errors.push({
            timestamp: new Date().toISOString(),
            error: error.message,
            url: url
          });
        }

        this.updateGlobalResults(results, 0, false);

        // 错误后稍微延迟
        await this.sleep(1000);
      }
    }

    return userResults;
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
      results.metrics.minResponseTime = Math.min(results.metrics.minResponseTime, responseTime);
      results.metrics.maxResponseTime = Math.max(results.metrics.maxResponseTime, responseTime);
    }
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
    if (results.actualDuration > 0) {
      metrics.throughput = (metrics.totalRequests / results.actualDuration).toFixed(2);
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
}

module.exports = { RealStressTestEngine };
