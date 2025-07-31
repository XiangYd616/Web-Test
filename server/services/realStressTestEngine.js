/**
 * 真实的压力测试引擎 - 使用Node.js原生模块进行真实的压力测试
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// 日志级别配置
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

// 日志工具函数
const logger = {
  error: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
      console.error(message, ...args);
    }
  },
  warn: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARN) {
      console.warn(message, ...args);
    }
  },
  info: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
      console.log(message, ...args);
    }
  },
  debug: (message, ...args) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      console.log(message, ...args);
    }
  }
};

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
      thinkTime = 1,
      testId: preGeneratedTestId,
      userId,
      recordId
    } = config;

    // ✅ 修复：优先使用预生成的testId，确保前后端一致性
    const testId = preGeneratedTestId || `stress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🎯 压力测试引擎testId处理:', {
      testId: testId,
      preGeneratedTestId: preGeneratedTestId,
      isPreGenerated: !!preGeneratedTestId,
      url: url,
      userId: userId,
      recordId: recordId,
      configKeys: Object.keys(config)
    });

    // 如果没有使用预生成的testId，发出警告
    if (!preGeneratedTestId) {
      console.warn('⚠️ 没有收到预生成的testId，使用引擎生成的testId:', testId);
    } else {
      console.log('✅ 使用前端预生成的testId:', testId);
    }

    // 初始化测试状态
    this.updateTestStatus(testId, {
      status: 'running',
      progress: 0,
      startTime: Date.now(),
      url: url,
      config: config,
      userId: userId,
      recordId: recordId,
      realTimeMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastResponseTime: 0,
        lastRequestSuccess: true,
        activeRequests: 0
      }
    });

    logger.info(`⚡ Starting real stress test for: ${url} (ID: ${testId})`);
    logger.info(`👥 Users: ${users}, Duration: ${duration}s, Ramp-up: ${rampUpTime}s, Type: ${testType}`);

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
        throughput: 0, // 总平均吞吐量
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errorRate: 0,
        activeUsers: 0,
        requestsPerSecond: 0,
        currentTPS: 0, // 当前瞬时吞吐量
        peakTPS: 0, // 峰值吞吐量
        recentRequests: [], // 用于计算当前吞吐量的最近请求记录
        lastThroughputUpdate: Date.now()
      },
      realTimeData: []
    };

    try {
      // 执行压力测试
      await this.executeStressTest(url, users, duration, rampUpTime, testType, method, timeout, thinkTime, results);

      // 设置实际持续时间
      results.actualDuration = (Date.now() - startTime) / 1000;

      // 计算最终指标
      this.calculateFinalMetrics(results);

      results.status = 'completed';
      results.progress = 100;
      results.currentPhase = 'completed';
      results.endTime = new Date().toISOString();

      logger.info(`✅ Stress test completed for: ${url}`);
      logger.info(`📊 Results: ${results.metrics.successfulRequests}/${results.metrics.totalRequests} requests successful`);
      logger.info(`⚡ Average response time: ${results.metrics.averageResponseTime}ms`);
      logger.info(`🚀 Total Throughput: ${results.metrics.throughput} req/s`);
      logger.info(`🔥 Current TPS: ${results.metrics.currentTPS} req/s`);
      logger.info(`⭐ Peak TPS: ${results.metrics.peakTPS} req/s`);
      logger.info(`❌ Error rate: ${results.metrics.errorRate}%`);

      // 保存最终测试结果到数据库
      await this.saveFinalTestResults(testId, results);

      // 广播测试完成
      this.broadcastTestComplete(testId, results);

      // 清理测试状态
      this.removeTestStatus(testId);

      return { success: true, data: results };

    } catch (error) {
      logger.error(`❌ Stress test failed for: ${url}`, error);

      // 设置实际持续时间
      results.actualDuration = (Date.now() - startTime) / 1000;

      // 计算最终指标（即使失败也要计算已有的数据）
      this.calculateFinalMetrics(results);

      results.status = 'failed';
      results.error = error.message;
      results.endTime = new Date().toISOString();

      // 保存失败的测试结果到数据库
      await this.saveFinalTestResults(testId, results);

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

    // 将进度监控器存储到测试状态中，以便取消时清理
    const testStatus = this.getTestStatus(results.testId);
    if (testStatus) {
      testStatus.progressMonitor = progressMonitor;
      this.updateTestStatus(results.testId, testStatus);
    }

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

    // 将进度监控器存储到测试状态中
    const testStatus = this.getTestStatus(results.testId);
    if (testStatus) {
      testStatus.progressMonitor = progressMonitor;
      this.updateTestStatus(results.testId, testStatus);
    }

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

    // 将进度监控器存储到测试状态中
    const testStatus = this.getTestStatus(results.testId);
    if (testStatus) {
      testStatus.progressMonitor = progressMonitor;
      this.updateTestStatus(results.testId, testStatus);
    }

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

    // 将进度监控器存储到测试状态中
    const testStatus = this.getTestStatus(results.testId);
    if (testStatus) {
      testStatus.progressMonitor = progressMonitor;
      this.updateTestStatus(results.testId, testStatus);
    }

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
    let progressUpdateCount = 0;

    return setInterval(() => {
      // 检查测试是否已被取消，如果是则停止进度更新
      if (this.shouldStopTest(results.testId)) {
        console.log(`🛑 测试 ${results.testId} 已取消，停止进度监控`);
        return;
      }

      progressUpdateCount++;
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
        throughput: Math.round(currentThroughput * 10) / 10, // 保留1位小数
        currentTPS: typeof results.metrics.currentTPS === 'number' ? results.metrics.currentTPS : 0, // 当前瞬时吞吐量
        peakTPS: typeof results.metrics.peakTPS === 'number' ? results.metrics.peakTPS : 0, // 峰值吞吐量
        errorRate: results.metrics.totalRequests > 0 ?
          Math.round((results.metrics.failedRequests / results.metrics.totalRequests) * 1000) / 10 : 0 // 保留1位小数
      });

      // 限制实时数据数量
      if (results.realTimeData.length > 100) {
        results.realTimeData = results.realTimeData.slice(-100);
      }

      // 每5秒更新一次数据库记录
      if (progressUpdateCount % 5 === 0) {
        this.updateTestRecordProgress(
          results.testId,
          results.progress,
          results.currentPhase,
          results.metrics
        );
      }

      logger.debug(`📊 Progress: ${results.progress}%, Active users: ${results.metrics.activeUsers}, Total requests: ${results.metrics.totalRequests}`);
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

    logger.debug(`🤖 Virtual user ${userId} started for ${duration}ms`);

    while (Date.now() < endTime) {
      // 检查测试是否被中止
      if (this.shouldStopTest(results.testId)) {
        console.log(`🛑 用户 ${userId} 检测到测试取消，退出循环 (testId: ${results.testId})`);
        logger.debug(`🛑 用户 ${userId} 检测到测试中止，退出循环`);
        break;
      }

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

        // 更新实时状态
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
          }
        }

        // 再次检查测试是否被取消，避免发送取消后的数据
        if (this.shouldStopTest(results.testId)) {
          console.log(`🛑 用户 ${userId} 在数据记录前检测到测试取消，跳过数据记录`);
          break;
        }

        // 记录实时数据点用于图表显示（这里会触发WebSocket广播）
        const elapsedTime = (Date.now() - results.startTime) / 1000;
        const currentThroughput = elapsedTime > 0 ? results.metrics.totalRequests / elapsedTime : 0;
        const errorRate = results.metrics.totalRequests > 0 ?
          (results.metrics.failedRequests / results.metrics.totalRequests) * 100 : 0;

        this.recordRealTimeDataPoint(results, {
          timestamp: Date.now(),
          responseTime: responseTime,
          status: response.statusCode || (response.success ? 200 : 500),
          success: response.success,
          activeUsers: results.metrics.activeUsers,
          throughput: Math.round(currentThroughput * 10) / 10,
          currentTPS: typeof results.metrics.currentTPS === 'number' ? results.metrics.currentTPS : 0,
          peakTPS: typeof results.metrics.peakTPS === 'number' ? results.metrics.peakTPS : 0,
          errorRate: Math.round(errorRate * 10) / 10,
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
    // 验证dataPoint参数
    if (!dataPoint) {
      logger.warn('⚠️ recordRealTimeDataPoint called with undefined dataPoint');
      return;
    }

    // 检查测试是否已被取消，如果是则不记录和广播数据
    if (this.shouldStopTest(results.testId)) {
      console.log(`🛑 测试 ${results.testId} 已取消，跳过实时数据记录和广播`);
      return;
    }

    results.realTimeData.push(dataPoint);

    // 限制实时数据点数量，避免内存溢出
    if (results.realTimeData.length > 1000) {
      results.realTimeData = results.realTimeData.slice(-800);
    }

    // 增强数据点，确保所有必要字段都存在
    const enhancedDataPoint = {
      timestamp: dataPoint.timestamp || Date.now(),
      responseTime: dataPoint.responseTime || 0,
      activeUsers: dataPoint.activeUsers || results.metrics.activeUsers || 0,
      throughput: dataPoint.throughput || 0,
      errorRate: dataPoint.errorRate || 0,
      success: dataPoint.success !== undefined ? dataPoint.success : true,
      phase: dataPoint.phase || results.currentPhase || 'running',
      status: dataPoint.status || (dataPoint.success ? 200 : 500),
      ...dataPoint // 保留原始数据的其他字段
    };

    // 增强指标数据
    const enhancedMetrics = {
      totalRequests: results.metrics.totalRequests || 0,
      successfulRequests: results.metrics.successfulRequests || 0,
      failedRequests: results.metrics.failedRequests || 0,
      averageResponseTime: results.metrics.averageResponseTime || 0,
      errorRate: results.metrics.errorRate || 0,
      activeUsers: results.metrics.activeUsers || 0,
      throughput: results.metrics.throughput || 0,
      currentTPS: typeof results.metrics.currentTPS === 'number' ? results.metrics.currentTPS : 0,
      peakTPS: typeof results.metrics.peakTPS === 'number' ? results.metrics.peakTPS : 0
    };

    console.log('📊 准备广播实时数据:', {
      testId: results.testId,
      dataPointKeys: Object.keys(enhancedDataPoint),
      metricsKeys: Object.keys(enhancedMetrics),
      totalDataPoints: results.realTimeData.length,
      hasGlobalIO: !!global.io
    });

    // 通过WebSocket广播实时数据
    this.broadcastRealTimeData(results.testId, {
      dataPoint: enhancedDataPoint,
      metrics: enhancedMetrics,
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
    const now = Date.now();
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

    // 更新当前吞吐量计算所需的数据
    this.updateCurrentThroughput(results.metrics, now);
  }

  /**
   * 更新当前吞吐量
   */
  updateCurrentThroughput(metrics, currentTime) {
    // 记录当前请求时间
    metrics.recentRequests.push(currentTime);

    // 保留最近10秒的请求记录（增加时间窗口以获得更稳定的当前吞吐量）
    const timeWindow = 10000; // 10秒
    const cutoffTime = currentTime - timeWindow;
    metrics.recentRequests = metrics.recentRequests.filter(time => time >= cutoffTime);

    // 计算当前吞吐量
    const recentRequestCount = metrics.recentRequests.length;

    if (recentRequestCount >= 2) {
      // 如果有足够的请求，使用实际时间窗口
      const oldestRequest = metrics.recentRequests[0];
      const actualTimeWindow = currentTime - oldestRequest;

      if (actualTimeWindow > 0) {
        const calculatedTPS = (recentRequestCount / (actualTimeWindow / 1000));
        metrics.currentTPS = Math.round(calculatedTPS * 10) / 10; // 保留1位小数
      } else {
        metrics.currentTPS = metrics.currentTPS || 0; // 保持之前的值
      }
    } else if (recentRequestCount === 1) {
      // 如果只有一个请求，保持之前的值或使用较低的估算值
      metrics.currentTPS = metrics.currentTPS || 0.5; // 估算值
    } else {
      // 没有最近的请求，但保持之前的值一段时间
      if (!metrics.lastThroughputUpdate || (currentTime - metrics.lastThroughputUpdate) < 15000) {
        // 15秒内保持之前的值
        metrics.currentTPS = metrics.currentTPS || 0;
      } else {
        // 超过15秒没有请求，设为0
        metrics.currentTPS = 0;
      }
    }

    // 更新峰值吞吐量
    if (metrics.currentTPS > metrics.peakTPS) {
      metrics.peakTPS = Math.round(metrics.currentTPS * 10) / 10; // 保留1位小数
    }

    metrics.lastThroughputUpdate = currentTime;
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
      parseFloat(((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)) : 0;
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
      metrics.errorRate = parseFloat(((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2));
    } else {
      metrics.errorRate = 0;
    }

    // 计算总平均吞吐量 (requests per second)
    if (results.actualDuration > 0 && metrics.totalRequests > 0) {
      const throughputValue = metrics.totalRequests / results.actualDuration;
      metrics.throughput = isNaN(throughputValue) ? 0 : Math.round(throughputValue * 10) / 10; // 保留1位小数
      metrics.requestsPerSecond = metrics.throughput; // 确保两个字段都有值
    } else {
      metrics.throughput = 0;
      metrics.requestsPerSecond = 0;
    }

    // 确保当前TPS有合理的值
    if (typeof metrics.currentTPS !== 'number' || isNaN(metrics.currentTPS) || metrics.currentTPS === 0) {
      metrics.currentTPS = metrics.throughput || 0; // 使用平均吞吐量作为备选
    }

    // 确保峰值TPS有合理的值
    if (typeof metrics.peakTPS !== 'number' || isNaN(metrics.peakTPS) || metrics.peakTPS === 0) {
      // 峰值TPS至少应该等于当前TPS或总吞吐量中的较大值
      metrics.peakTPS = Math.max(metrics.currentTPS, metrics.throughput);
      // 如果仍然是0，设置一个最小值
      if (metrics.peakTPS === 0 && metrics.totalRequests > 0) {
        metrics.peakTPS = metrics.throughput * 1.2; // 估算峰值为平均值的1.2倍
      }
    }

    // 确保数值精度
    metrics.currentTPS = Math.round(metrics.currentTPS * 10) / 10;
    metrics.peakTPS = Math.round(metrics.peakTPS * 10) / 10;

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
   * 更新数据库中的测试记录进度
   */
  async updateTestRecordProgress(testId, progress, phase, metrics) {
    try {
      const testStatus = this.runningTests.get(testId);
      if (!testStatus || !testStatus.recordId || !testStatus.userId) {
        return; // 没有数据库记录ID或用户ID，跳过更新
      }

      // 导入testHistoryService
      const TestHistoryService = require('./dataManagement/testHistoryService');
      const testHistoryService = new TestHistoryService();

      // 更新测试记录进度
      const updateData = {
        progress: Math.round(progress),
        currentPhase: phase,
        results: {
          metrics: metrics,
          lastUpdate: new Date().toISOString()
        }
      };

      await testHistoryService.updateTestRecord(testStatus.recordId, updateData);

      // 广播测试记录更新到测试历史页面
      if (global.io) {
        global.io.to('test-history-updates').emit('test-record-update', {
          type: 'test-record-update',
          recordId: testStatus.recordId,
          updates: {
            id: testStatus.recordId,
            progress: Math.round(progress),
            currentPhase: phase,
            status: 'running',
            ...updateData
          }
        });
      }

      console.log(`📊 测试记录进度已更新: ${testStatus.recordId} - ${Math.round(progress)}%`);
    } catch (error) {
      console.error('更新测试记录进度失败:', error);
    }
  }

  /**
   * 保存最终测试结果到数据库
   */
  async saveFinalTestResults(testId, results) {
    try {
      const testStatus = this.runningTests.get(testId);
      if (!testStatus || !testStatus.recordId || !testStatus.userId) {
        console.log('⚠️ 没有数据库记录ID或用户ID，跳过保存最终结果');
        return;
      }

      // 导入testHistoryService
      const TestHistoryService = require('./dataManagement/testHistoryService');
      const testHistoryService = new TestHistoryService();

      // 计算性能评分
      const performanceScore = this.calculatePerformanceScore(results.metrics);
      const performanceGrade = this.getPerformanceGrade(performanceScore);

      const finalData = {
        status: results.status,
        end_time: results.endTime,
        duration: Math.round(results.actualDuration || 0),

        // 测试结果
        results: {
          metrics: results.metrics,
          realTimeData: results.realTimeData,
          config: results.config,
          summary: {
            totalRequests: results.metrics.totalRequests,
            successfulRequests: results.metrics.successfulRequests,
            failedRequests: results.metrics.failedRequests,
            averageResponseTime: results.metrics.averageResponseTime,
            peakTPS: results.metrics.peakTPS,
            errorRate: results.metrics.errorRate,
            throughput: results.metrics.throughput
          }
        },

        // 性能评分
        overall_score: performanceScore,
        performance_grade: performanceGrade,

        // 统计信息
        total_requests: results.metrics.totalRequests || 0,
        successful_requests: results.metrics.successfulRequests || 0,
        failed_requests: results.metrics.failedRequests || 0,
        average_response_time: results.metrics.averageResponseTime || 0,
        peak_tps: results.metrics.peakTPS || 0,
        error_rate: results.metrics.errorRate || 0,

        // 错误信息（如果有）
        error_message: results.error || null,
        error_details: results.error ? { error: results.error, stack: results.stack } : null
      };

      await testHistoryService.updateTestRecord(testStatus.recordId, finalData);

      console.log(`💾 测试结果已保存到数据库: ${testStatus.recordId}`);
      console.log(`📊 总请求数: ${results.metrics.totalRequests}, 成功率: ${(100 - results.metrics.errorRate).toFixed(2)}%`);
      console.log(`⭐ 性能评分: ${performanceScore}/100 (${performanceGrade})`);

      // 广播最终结果更新
      if (global.io) {
        global.io.to('test-history-updates').emit('test-record-final', {
          type: 'test-record-final',
          recordId: testStatus.recordId,
          data: finalData
        });
      }

    } catch (error) {
      console.error('保存最终测试结果失败:', error);
    }
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(metrics) {
    try {
      let score = 100;

      // 错误率影响 (40分权重)
      const errorRate = metrics.errorRate || 0;
      if (errorRate > 0) {
        score -= Math.min(errorRate * 2, 40); // 错误率每1%扣2分，最多扣40分
      }

      // 响应时间影响 (30分权重)
      const avgResponseTime = metrics.averageResponseTime || 0;
      if (avgResponseTime > 1000) { // 超过1秒
        score -= Math.min((avgResponseTime - 1000) / 100, 30); // 每100ms扣1分，最多扣30分
      }

      // TPS性能影响 (20分权重)
      const peakTPS = metrics.peakTPS || 0;
      if (peakTPS < 10) { // TPS低于10
        score -= Math.min((10 - peakTPS) * 2, 20); // 每少1TPS扣2分，最多扣20分
      }

      // 成功率影响 (10分权重)
      const successRate = ((metrics.successfulRequests || 0) / (metrics.totalRequests || 1)) * 100;
      if (successRate < 100) {
        score -= Math.min((100 - successRate) * 0.1, 10); // 成功率每少1%扣0.1分，最多扣10分
      }

      return Math.max(0, Math.round(score));
    } catch (error) {
      console.error('计算性能评分失败:', error);
      return 0;
    }
  }

  /**
   * 获取性能等级
   */
  getPerformanceGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 通过WebSocket广播实时数据
   */
  broadcastRealTimeData(testId, data) {
    try {
      // 检查全局io实例是否存在
      if (global.io) {
        // 验证数据完整性
        const hasDataPoint = !!data.dataPoint;
        const hasMetrics = !!data.metrics;
        const metricsValid = hasMetrics && typeof data.metrics.totalRequests === 'number';

        // 检查房间中的客户端数量
        const roomName = `stress-test-${testId}`;
        const room = global.io.sockets.adapter.rooms.get(roomName);
        const clientCount = room ? room.size : 0;

        // 调试：列出所有房间
        const allRooms = Array.from(global.io.sockets.adapter.rooms.keys());
        console.log('🏠 所有活跃房间:', allRooms.filter(r => r.startsWith('stress-test-')));

        console.log('📡 Broadcasting real-time data:', {
          testId,
          roomName,
          clientCount,
          hasDataPoint,
          hasMetrics,
          metricsValid,
          totalRequests: data.metrics?.totalRequests,
          currentTPS: data.metrics?.currentTPS,
          peakTPS: data.metrics?.peakTPS,
          dataPointTimestamp: data.dataPoint?.timestamp,
          dataPointResponseTime: data.dataPoint?.responseTime
        });

        // 如果没有客户端在房间中，记录警告
        if (clientCount === 0) {
          console.warn(`⚠️ 没有客户端在房间 ${roomName} 中，数据将不会被接收`);
        }

        // 放宽验证条件：有数据点或有效指标就发送
        if (hasDataPoint || (hasMetrics && metricsValid)) {
          const broadcastData = {
            testId,
            timestamp: Date.now(),
            ...data
          };

          global.io.to(roomName).emit('stress-test-data', broadcastData);

          console.log('✅ Real-time data broadcasted successfully:', {
            eventName: 'stress-test-data',
            clientCount,
            dataSize: JSON.stringify(broadcastData).length
          });
        } else {
          console.warn('⚠️ Skipping broadcast due to invalid data:', {
            hasDataPoint,
            hasMetrics,
            metricsValid,
            dataKeys: Object.keys(data)
          });
        }
      } else {
        console.warn('⚠️ Global io instance not found for WebSocket broadcast');
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

  /**
   * 取消压力测试
   */
  async cancelStressTest(testId) {
    try {
      console.log(`🛑 取消压力测试: ${testId}`);

      // 获取测试状态
      const testStatus = this.runningTests.get(testId);
      if (!testStatus) {
        console.log(`⚠️ 测试 ${testId} 不存在或已完成`);
        return {
          success: false,
          message: '测试不存在或已完成'
        };
      }

      // 标记测试为已取消
      testStatus.status = 'cancelled';
      testStatus.cancelled = true;
      testStatus.endTime = new Date().toISOString();
      testStatus.actualDuration = (Date.now() - new Date(testStatus.startTime).getTime()) / 1000;

      console.log(`🛑 测试 ${testId} 已标记为取消: status=${testStatus.status}, cancelled=${testStatus.cancelled}`);

      // 清理进度监控器
      if (testStatus.progressMonitor) {
        console.log(`🧹 清理测试 ${testId} 的进度监控器`);
        clearInterval(testStatus.progressMonitor);
        testStatus.progressMonitor = null;
      }

      // 更新测试状态
      this.updateTestStatus(testId, testStatus);

      // 广播测试取消状态
      this.broadcastTestStatus(testId, {
        status: 'cancelled',
        message: '测试已被用户取消',
        endTime: testStatus.endTime,
        actualDuration: testStatus.actualDuration,
        metrics: testStatus.metrics || {},
        realTimeData: testStatus.realTimeData || [],
        cancelReason: '用户手动取消'
      });

      // 计算最终指标
      if (testStatus.metrics) {
        this.calculateFinalMetrics(testStatus);
      }

      // 广播测试完成事件（取消也是一种完成）
      this.broadcastTestComplete(testId, {
        status: 'cancelled',
        message: '测试已被用户取消',
        endTime: testStatus.endTime,
        actualDuration: testStatus.actualDuration,
        metrics: testStatus.metrics || {},
        realTimeData: testStatus.realTimeData || [],
        cancelReason: '用户手动取消',
        success: false,
        cancelled: true
      });

      // 保存取消记录到数据库
      await this.saveCancelledTestRecord(testId, testStatus);

      console.log(`✅ 压力测试 ${testId} 已成功取消`);

      return {
        success: true,
        message: '测试已成功取消',
        data: {
          testId,
          status: 'cancelled',
          endTime: testStatus.endTime,
          actualDuration: testStatus.actualDuration,
          metrics: testStatus.metrics || {},
          realTimeData: testStatus.realTimeData || [],
          cancelReason: '用户手动取消',
          cancelledAt: testStatus.endTime
        }
      };

    } catch (error) {
      console.error(`❌ 取消压力测试失败 ${testId}:`, error);
      return {
        success: false,
        message: '取消测试失败',
        error: error.message
      };
    }
  }

  /**
   * 停止压力测试 (向后兼容)
   */
  async stopStressTest(testId) {
    return await this.cancelStressTest(testId);
  }

  /**
   * 检查测试是否应该取消
   */
  shouldCancelTest(testId) {
    const testStatus = this.runningTests.get(testId);
    const shouldCancel = testStatus && (testStatus.cancelled || testStatus.status === 'cancelled');
    if (shouldCancel) {
      console.log(`🔍 测试 ${testId} 应该取消: status=${testStatus?.status}, cancelled=${testStatus?.cancelled}`);
    }
    return shouldCancel;
  }

  /**
   * 检查测试是否应该停止 (向后兼容)
   */
  shouldStopTest(testId) {
    return this.shouldCancelTest(testId);
  }

  /**
   * 保存取消的测试记录到数据库
   */
  async saveCancelledTestRecord(testId, testStatus) {
    try {
      if (!testStatus.recordId || !testStatus.userId) {
        console.log('⚠️ 没有数据库记录ID或用户ID，跳过保存取消记录');
        return;
      }

      const testHistoryService = require('./dataManagement/testHistoryService');

      // 更新测试记录状态为取消
      const updateData = {
        status: 'cancelled',
        endTime: testStatus.endTime,
        actualDuration: testStatus.actualDuration,
        error: '用户手动取消测试',
        cancelReason: 'user_cancelled',
        results: {
          ...testStatus.results,
          status: 'cancelled',
          cancelledAt: testStatus.endTime,
          cancelReason: '用户手动取消',
          metrics: testStatus.metrics || {},
          realTimeData: testStatus.realTimeData || [],
          partialData: true // 标记为部分数据
        }
      };

      await testHistoryService.updateTestRecord(testStatus.recordId, updateData, testStatus.userId);

      // 广播测试记录更新到测试历史页面
      if (global.io) {
        global.io.to('test-history-updates').emit('test-record-update', {
          type: 'test-record-cancelled',
          recordId: testStatus.recordId,
          updates: {
            id: testStatus.recordId,
            status: 'cancelled',
            endTime: testStatus.endTime,
            actualDuration: testStatus.actualDuration,
            cancelReason: '用户手动取消',
            ...updateData
          }
        });
      }

      console.log(`📊 取消的测试记录已保存: ${testStatus.recordId}`);
    } catch (error) {
      console.error('保存取消测试记录失败:', error);
    }
  }

  /**
   * 清理测试资源
   */
  cleanupTest(testId) {
    try {
      // 移除运行中的测试状态
      this.runningTests.delete(testId);

      // 广播清理完成
      this.broadcastTestStatus(testId, {
        status: 'cleanup_complete',
        message: '测试资源已清理'
      });

      console.log(`🧹 测试 ${testId} 资源已清理`);
    } catch (error) {
      console.error(`❌ 清理测试资源失败 ${testId}:`, error);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.runningTests.get(testId) || null;
  }
}

module.exports = { RealStressTestEngine };
