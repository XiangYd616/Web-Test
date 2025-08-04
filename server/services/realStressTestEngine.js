/**
 * 真实的压力测试引擎 - 重构优化版本
 * 
 * 主要改进：
 * - 提取公共方法和常量
 * - 简化虚拟用户线程管理
 * - 统一错误处理和日志
 * - 优化取消和清理机制
 * - 移除重复代码
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const os = require('os');

// ==================== 常量定义 ====================
const CONSTANTS = {
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },
  LIMITS: {
    MAX_CONCURRENT_USERS: Math.min(1000, os.cpus().length * 50),
    MAX_DURATION: 600, // 10分钟
    MAX_ERRORS: 100,
    MAX_RESPONSE_TIMES: 10000
  },
  TIMEOUTS: {
    DEFAULT_REQUEST: 10000, // 10秒
    CANCEL_CHECK_INTERVAL: 100, // 100ms
    PROGRESS_UPDATE_INTERVAL: 1000, // 1秒
    CLEANUP_DELAY: 30000 // 30秒
  },
  HTTP: {
    USER_AGENT: 'RealStressTest/2.0 (Node.js)',
    DEFAULT_HEADERS: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    }
  },
  TEST_TYPES: {
    GRADUAL: 'gradual',
    SPIKE: 'spike',
    CONSTANT: 'constant',
    STRESS: 'stress'
  }
};

// 当前日志级别
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production'
  ? CONSTANTS.LOG_LEVELS.INFO
  : CONSTANTS.LOG_LEVELS.DEBUG;

// ==================== 工具类 ====================

/**
 * 日志工具类
 */
class Logger {
  static error(message, ...args) {
    if (CURRENT_LOG_LEVEL >= CONSTANTS.LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    if (CURRENT_LOG_LEVEL >= CONSTANTS.LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  static info(message, ...args) {
    if (CURRENT_LOG_LEVEL >= CONSTANTS.LOG_LEVELS.INFO) {
      console.info(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  static debug(message, ...args) {
    if (CURRENT_LOG_LEVEL >= CONSTANTS.LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  }
}

/**
 * 验证工具类
 */
class Validator {
  static validateUrl(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  static validateConfig(config) {
    const { users, duration } = config;

    if (users > CONSTANTS.LIMITS.MAX_CONCURRENT_USERS) {
      throw new Error(`用户数不能超过 ${CONSTANTS.LIMITS.MAX_CONCURRENT_USERS}`);
    }

    if (duration > CONSTANTS.LIMITS.MAX_DURATION) {
      throw new Error(`测试时长不能超过 ${CONSTANTS.LIMITS.MAX_DURATION} 秒`);
    }

    return true;
  }
}

/**
 * 指标计算工具类
 */
class MetricsCalculator {
  static calculateFinalMetrics(results) {
    const { metrics } = results;

    if (metrics.responseTimes.length > 0) {
      // 计算平均响应时间
      metrics.averageResponseTime = Math.round(
        metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
      );

      // 计算最小和最大响应时间
      metrics.minResponseTime = Math.min(...metrics.responseTimes);
      metrics.maxResponseTime = Math.max(...metrics.responseTimes);

      // 计算百分位数
      const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
      const len = sortedTimes.length;

      metrics.p50 = sortedTimes[Math.floor(len * 0.5)];
      metrics.p90 = sortedTimes[Math.floor(len * 0.9)];
      metrics.p95 = sortedTimes[Math.floor(len * 0.95)];
      metrics.p99 = sortedTimes[Math.floor(len * 0.99)];
    }

    // 计算错误率
    metrics.errorRate = metrics.totalRequests > 0
      ? Math.round((metrics.failedRequests / metrics.totalRequests) * 100 * 100) / 100
      : 0;

    // 计算总体吞吐量
    const actualDuration = results.actualDuration || 1;
    if (metrics.totalRequests > 0 && actualDuration > 0) {
      metrics.throughput = Math.round((metrics.totalRequests / actualDuration) * 100) / 100;
    } else {
      metrics.throughput = 0;
    }

    // 确保吞吐量不为负数或无穷大
    if (!isFinite(metrics.throughput) || metrics.throughput < 0) {
      metrics.throughput = 0;
    }

    // 🔧 修复：确保 requestsPerSecond 使用正确的吞吐量值
    // 在测试结束时，使用平均吞吐量作为 requestsPerSecond
    metrics.requestsPerSecond = metrics.throughput;

    // 🔧 修复：不要将currentTPS设置为平均吞吐量，保持它们的独立性
    // currentTPS应该反映最近的瞬时性能，而throughput反映整体平均性能
    // 如果 currentTPS 为0或无效，保持为0，不要用平均值覆盖
    if (!metrics.currentTPS || metrics.currentTPS === 0 || !isFinite(metrics.currentTPS)) {
      metrics.currentTPS = 0; // 保持为0，表示当前没有活跃请求
    }

    Logger.debug('最终指标计算完成', {
      totalRequests: metrics.totalRequests,
      averageResponseTime: metrics.averageResponseTime,
      errorRate: metrics.errorRate,
      throughput: metrics.throughput,
      requestsPerSecond: metrics.requestsPerSecond,
      currentTPS: metrics.currentTPS
    });
  }

  static updateResponseTimeStats(metrics, responseTime) {
    if (responseTime > 0) {
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

      // 🔧 实时计算平均响应时间
      if (metrics.responseTimes.length > 0) {
        const totalTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0);
        metrics.averageResponseTime = Math.round(totalTime / metrics.responseTimes.length);

        // 实时计算百分位数（每10个请求计算一次以提高性能）
        if (metrics.responseTimes.length % 10 === 0) {
          const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
          const len = sortedTimes.length;

          metrics.p50ResponseTime = sortedTimes[Math.floor(len * 0.5)] || metrics.averageResponseTime;
          metrics.p90ResponseTime = sortedTimes[Math.floor(len * 0.9)] || metrics.averageResponseTime;
          metrics.p95ResponseTime = sortedTimes[Math.floor(len * 0.95)] || metrics.averageResponseTime;
          metrics.p99ResponseTime = sortedTimes[Math.floor(len * 0.99)] || metrics.averageResponseTime;
        }
      }

      // 限制响应时间数组大小
      if (metrics.responseTimes.length >= CONSTANTS.LIMITS.MAX_RESPONSE_TIMES) {
        metrics.responseTimes.shift();
      }
    }
  }

  static updateCurrentThroughput(metrics, now) {
    // 清理超过5秒的旧请求记录
    metrics.recentRequests = metrics.recentRequests.filter(time => now - time < 5000);
    metrics.recentRequests.push(now);

    // 计算当前TPS（每秒事务数）
    const recentCount = metrics.recentRequests.length;

    if (recentCount <= 1) {
      // 如果只有1个或没有请求，TPS为0或基于单个请求的估算
      metrics.currentTPS = recentCount;
    } else {
      // 计算实际时间跨度
      const timeSpan = (now - metrics.recentRequests[0]) / 1000;
      if (timeSpan > 0) {
        metrics.currentTPS = Math.round((recentCount / timeSpan) * 10) / 10;
      } else {
        metrics.currentTPS = recentCount;
      }
    }

    metrics.peakTPS = Math.max(metrics.peakTPS, metrics.currentTPS);

    // 更新上次吞吐量更新时间
    metrics.lastThroughputUpdate = now;

    // 更新每秒请求数（RPS）
    metrics.requestsPerSecond = metrics.currentTPS;
  }
}

/**
 * HTTP请求工具类
 */
class HttpClient {
  static async makeRequest(url, method = 'GET', timeout = CONSTANTS.TIMEOUTS.DEFAULT_REQUEST, testId = null) {
    return new Promise((resolve) => {
      // 检查取消状态
      if (testId && RealStressTestEngine.shouldStopTest(testId)) {
        resolve({
          success: false,
          error: 'Test cancelled before request',
          statusCode: 0,
          responseTime: 0,
          cancelled: true
        });
        return;
      }

      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: method.toUpperCase(),
        timeout: timeout,
        headers: {
          'User-Agent': CONSTANTS.HTTP.USER_AGENT,
          ...CONSTANTS.HTTP.DEFAULT_HEADERS
        }
      };

      // HTTPS特定选项
      if (urlObj.protocol === 'https:') {
        options.rejectUnauthorized = false;
      }

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            responseTime: responseTime,
            data: data.length,
            headers: res.headers
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: false,
          error: error.message,
          responseTime: responseTime,
          statusCode: 0
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: `Request timeout after ${timeout}ms`,
          responseTime: timeout,
          statusCode: 0
        });
      });

      // 处理POST/PUT等方法的请求体
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        req.write('');
      }

      req.end();
    });
  }
}

// ==================== 主要引擎类 ====================

/**
 * 重构后的压力测试引擎
 */
class RealStressTestEngine {
  constructor() {
    this.name = 'real-stress-test-engine';
    this.version = '2.0.0';
    this.maxConcurrentUsers = CONSTANTS.LIMITS.MAX_CONCURRENT_USERS;
    this.runningTests = new Map(); // 存储正在运行的测试状态
    this.globalTimers = new Map(); // 全局定时器跟踪
  }

  /**
   * 运行压力测试 - 主入口方法
   */
  async runStressTest(url, config = {}) {
    const testId = this.generateTestId(config.testId);
    const testConfig = this.normalizeConfig(config);

    Logger.info(`启动压力测试: ${url}`, { testId, config: testConfig });

    try {
      // 验证参数
      Validator.validateConfig(testConfig);
      if (!Validator.validateUrl(url)) {
        throw new Error('无效的URL格式');
      }

      // 初始化测试结果
      const results = this.initializeTestResults(testId, url, testConfig);

      // 执行测试
      await this.executeTest(url, testConfig, results);

      // 检查测试是否已经被其他机制（如进度监控器）处理完成
      const currentStatus = this.getTestStatus(testId);
      if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'cancelled')) {
        Logger.info(`测试 ${testId} 已被其他机制处理完成，状态: ${currentStatus.status}`);
        return { success: true, data: results };
      }

      // 处理测试完成
      return this.handleTestCompletion(testId, results);

    } catch (error) {
      Logger.error(`压力测试失败: ${url}`, error);
      return this.handleTestFailure(testId, error);
    }
  }

  /**
   * 生成测试ID
   */
  generateTestId(preGeneratedTestId) {
    const testId = preGeneratedTestId || `stress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!preGeneratedTestId) {
      Logger.warn('没有收到预生成的testId，使用引擎生成的testId:', testId);
    } else {
      Logger.debug('使用前端预生成的testId:', testId);
    }

    return testId;
  }

  /**
   * 标准化配置参数
   */
  normalizeConfig(config) {
    return {
      users: config.users || 10,
      duration: config.duration || 30,
      rampUpTime: config.rampUpTime || 5,
      testType: config.testType || CONSTANTS.TEST_TYPES.GRADUAL,
      method: config.method || 'GET',
      timeout: config.timeout || 10,
      thinkTime: config.thinkTime || 1,
      userId: config.userId,
      recordId: config.recordId
    };
  }

  /**
   * 初始化测试结果对象
   */
  initializeTestResults(testId, url, config) {
    const startTime = Date.now();

    const results = {
      testId,
      url,
      config,
      startTime,
      startTimeISO: new Date(startTime).toISOString(),
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
        requestsPerSecond: 0,
        currentTPS: 0,
        peakTPS: 0,
        recentRequests: [],
        lastThroughputUpdate: Date.now()
      },
      realTimeData: []
    };

    // 更新测试状态
    this.updateTestStatus(testId, {
      status: 'running',
      progress: 0,
      startTime,
      url,
      config,
      userId: config.userId,
      recordId: config.recordId,
      realTimeMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastResponseTime: 0,
        lastRequestSuccess: true,
        activeRequests: 0
      }
    });

    return results;
  }

  /**
   * 执行测试 - 根据测试类型选择执行策略
   */
  async executeTest(url, config, results) {
    const { testType, users, duration, rampUpTime, method, timeout, thinkTime } = config;

    Logger.info(`执行 ${testType} 类型的压力测试...`);

    const testStrategies = {
      [CONSTANTS.TEST_TYPES.GRADUAL]: () => this.executeGradualTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results),
      [CONSTANTS.TEST_TYPES.SPIKE]: () => this.executeSpikeTest(url, users, duration, method, timeout, thinkTime, results),
      [CONSTANTS.TEST_TYPES.CONSTANT]: () => this.executeConstantTest(url, users, duration, method, timeout, thinkTime, results),
      [CONSTANTS.TEST_TYPES.STRESS]: () => this.executeStressLimitTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results)
    };

    const strategy = testStrategies[testType] || testStrategies[CONSTANTS.TEST_TYPES.GRADUAL];
    await strategy();
  }

  /**
   * 处理测试完成
   */
  handleTestCompletion(testId, results) {
    // 检查是否已经处理过，避免重复处理
    const currentStatus = this.getTestStatus(testId);
    if (currentStatus && currentStatus.finalProcessed) {
      Logger.info(`测试 ${testId} 已经最终处理过，跳过重复处理`);
      return { success: true, data: results };
    }

    Logger.info(`开始最终处理测试完成: ${testId}`);

    // 设置实际持续时间
    results.actualDuration = (Date.now() - results.startTime) / 1000;

    // 计算最终指标
    console.log('🔍 计算最终指标前的数据:', {
      totalRequests: results.metrics?.totalRequests,
      responseTimes: results.metrics?.responseTimes?.length,
      hasMetrics: !!results.metrics
    });

    MetricsCalculator.calculateFinalMetrics(results);

    console.log('✅ 最终指标计算完成:', {
      totalRequests: results.metrics?.totalRequests,
      averageResponseTime: results.metrics?.averageResponseTime,
      throughput: results.metrics?.throughput,
      errorRate: results.metrics?.errorRate
    });

    // 检查测试是否被取消
    if (this.shouldStopTest(testId)) {
      Logger.info(`测试 ${testId} 已被取消，设置最终状态为 cancelled`);
      results.status = 'cancelled';
      results.progress = Math.min(100, results.progress || 0);
      results.currentPhase = 'cancelled';
      results.cancelled = true;
      results.cancelReason = '用户手动取消';
    } else {
      results.status = 'completed';
      results.progress = 100;
      results.currentPhase = 'completed';
    }

    results.endTime = new Date().toISOString();

    // 标记为最终处理完成，防止重复处理
    this.updateTestStatus(testId, {
      finalProcessed: true,
      finalProcessedAt: new Date().toISOString()
    });

    // 发送WebSocket完成事件
    this.broadcastTestComplete(testId, results);

    // 保存最终测试结果
    this.saveFinalTestResults(testId, results);

    // 清理资源
    this.cleanupTest(testId);

    Logger.info(`压力测试最终处理完成: ${testId}`, {
      status: results.status,
      totalRequests: results.metrics.totalRequests,
      duration: results.actualDuration,
      finalProcessed: true
    });

    return { success: true, data: results };
  }

  /**
   * 处理测试失败
   */
  handleTestFailure(testId, error) {
    Logger.error(`测试失败: ${testId}`, error);

    // 清理资源
    this.cleanupTest(testId);

    return {
      success: false,
      error: error.message,
      data: { testId, error: error.message }
    };
  }

  // ==================== 测试执行策略 ====================

  /**
   * 渐进式测试 - 逐步增加用户数
   */
  async executeGradualTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results) {
    results.currentPhase = 'gradual';
    const promises = [];

    // 🔧 调试：检查duration值
    console.log('🔧 executeGradualTest 参数检查:', {
      duration: duration,
      'typeof duration': typeof duration,
      'duration * 1000': duration * 1000,
      users: users,
      rampUpTime: rampUpTime
    });

    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    try {
      // 分批启动用户
      const userStartInterval = (rampUpTime * 1000) / users;

      for (let i = 0; i < users; i++) {
        const userStartDelay = i * userStartInterval;
        const userDuration = (duration * 1000) - userStartDelay;

        if (userDuration > 0) {
          const userPromise = this.scheduleVirtualUser(
            url, userDuration, method, timeout, thinkTime, results, userStartDelay
          );
          promises.push(userPromise);
        }
      }

      await Promise.all(promises);
    } finally {
      this.clearProgressMonitor(progressMonitor);
    }
  }

  /**
   * 峰值测试 - 快速启动所有用户
   */
  async executeSpikeTest(url, users, duration, method, timeout, thinkTime, results) {
    results.currentPhase = 'spike';
    const promises = [];
    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    try {
      // 在1秒内快速启动所有用户
      for (let i = 0; i < users; i++) {
        const userStartDelay = (i * 1000) / users;
        const userPromise = this.scheduleVirtualUser(
          url, duration * 1000, method, timeout, thinkTime, results, userStartDelay
        );
        promises.push(userPromise);
      }

      await Promise.all(promises);
    } finally {
      this.clearProgressMonitor(progressMonitor);
    }
  }

  /**
   * 恒定负载测试 - 立即启动所有用户
   */
  async executeConstantTest(url, users, duration, method, timeout, thinkTime, results) {
    results.currentPhase = 'constant';
    const promises = [];
    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    try {
      // 立即启动所有用户
      for (let i = 0; i < users; i++) {
        const userPromise = this.scheduleVirtualUser(
          url, duration * 1000, method, timeout, thinkTime, results, 0
        );
        promises.push(userPromise);
      }

      await Promise.all(promises);
    } finally {
      this.clearProgressMonitor(progressMonitor);
    }
  }

  /**
   * 压力极限测试 - 分阶段增加用户数
   */
  async executeStressLimitTest(url, users, duration, rampUpTime, method, timeout, thinkTime, results) {
    results.currentPhase = 'stress-limit';
    const promises = [];
    const progressMonitor = this.startProgressMonitor(results, duration * 1000);

    try {
      // 分3个阶段增加用户数
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
            const userPromise = this.scheduleVirtualUser(
              url, userDuration, method, timeout, thinkTime, results, userStartDelay
            );
            promises.push(userPromise);
          }
        }
      }

      await Promise.all(promises);
    } finally {
      this.clearProgressMonitor(progressMonitor);
    }
  }

  /**
   * 调度虚拟用户
   */
  scheduleVirtualUser(url, duration, method, timeout, thinkTime, results, startDelay) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        results.metrics.activeUsers++;
        this.runVirtualUser(url, duration, method, timeout, thinkTime, results)
          .then(() => {
            results.metrics.activeUsers--;
            resolve();
          })
          .catch(() => {
            results.metrics.activeUsers--;
            resolve();
          });
      }, startDelay);

      // 跟踪定时器以便取消时清理
      this.trackTimer(results.testId, timer);
    });
  }

  /**
   * 运行虚拟用户
   */
  async runVirtualUser(url, duration, method, timeout, thinkTime, results) {
    const userId = Math.random().toString(36).substr(2, 9);
    const endTime = Date.now() + duration;
    const userResults = { requests: 0, successes: 0, failures: 0 };

    Logger.debug(`虚拟用户 ${userId} 开始运行，持续时间: ${duration}ms`);

    while (Date.now() < endTime) {
      // 检查测试是否被取消
      if (this.shouldStopTest(results.testId)) {
        Logger.debug(`虚拟用户 ${userId} 检测到测试取消，退出循环`);
        break;
      }

      try {
        const requestStart = Date.now();

        // 再次检查取消状态
        if (this.shouldStopTest(results.testId)) {
          Logger.debug(`虚拟用户 ${userId} 在请求前检测到测试取消，退出循环`);
          break;
        }

        const response = await HttpClient.makeRequest(url, method, timeout * 1000, results.testId);
        const responseTime = Date.now() - requestStart;

        // 检查响应是否表明测试已取消
        if (response.cancelled) {
          Logger.debug(`虚拟用户 ${userId} 收到取消响应，退出循环`);
          break;
        }

        userResults.requests++;
        this.updateGlobalResults(results, responseTime, response.success);

        if (response.success) {
          userResults.successes++;
        } else {
          userResults.failures++;
          this.recordError(results, response.error, url, userId, responseTime);
        }

        // 记录实时数据点
        this.recordRealTimeDataPoint(results, {
          timestamp: Date.now(),
          responseTime: responseTime,
          status: response.statusCode,
          success: response.success,
          activeUsers: results.metrics.activeUsers,
          throughput: results.metrics.currentTPS || 0, // 🔧 添加吞吐量字段
          userId: userId,
          phase: results.currentPhase || 'running'
        });

        // 思考时间
        const dynamicThinkTime = this.calculateDynamicThinkTime(thinkTime, results.metrics);
        if (dynamicThinkTime > 0) {
          await this.sleep(dynamicThinkTime, results.testId);
        } else {
          await this.sleep(Math.random() * 20 + 10, results.testId); // 最小延迟
        }

      } catch (error) {
        userResults.requests++;
        userResults.failures++;
        this.recordError(results, error.message, url, userId, 0);

        // 错误后延迟
        await this.sleep(Math.min(2000, 500 + Math.random() * 1500), results.testId);
      }
    }

    Logger.debug(`虚拟用户 ${userId} 完成: ${userResults.successes}/${userResults.requests} 成功`);
    return userResults;
  }

  // ==================== 工具方法 ====================

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
      MetricsCalculator.updateResponseTimeStats(results.metrics, responseTime);
    }

    // 🔧 实时计算错误率
    results.metrics.errorRate = results.metrics.totalRequests > 0
      ? Math.round((results.metrics.failedRequests / results.metrics.totalRequests) * 100 * 100) / 100
      : 0;

    // 更新当前吞吐量
    MetricsCalculator.updateCurrentThroughput(results.metrics, now);

    // 🔧 修复：计算实时平均吞吐量
    // 实时更新时，也要更新平均吞吐量（throughput）
    const elapsedTime = (now - results.startTime) / 1000; // 已经过的时间（秒）
    if (elapsedTime > 0 && results.metrics.totalRequests > 0) {
      results.metrics.throughput = Math.round((results.metrics.totalRequests / elapsedTime) * 10) / 10;
    }

    // requestsPerSecond 使用当前TPS
    results.metrics.requestsPerSecond = results.metrics.currentTPS || 0;
  }

  /**
   * 记录错误
   */
  recordError(results, error, url, userId, responseTime) {
    if (results.metrics.errors.length < CONSTANTS.LIMITS.MAX_ERRORS) {
      results.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: error || 'Unknown error',
        url: url,
        userId: userId,
        responseTime: responseTime,
        type: 'network_error'
      });
    }
  }

  /**
   * 记录实时数据点
   */
  recordRealTimeDataPoint(results, dataPoint) {
    if (!dataPoint) {
      Logger.warn('recordRealTimeDataPoint called with undefined dataPoint');
      return;
    }

    // 检查测试是否已被取消
    if (this.shouldStopTest(results.testId)) {
      Logger.debug(`测试 ${results.testId} 已取消，跳过实时数据记录和广播`);
      return;
    }

    results.realTimeData.push(dataPoint);

    // 🔧 修复：动态计算数据点限制，确保完整测试数据不被截断
    const testDurationSeconds = results.config?.duration || 30;
    const userCount = results.config?.users || 1;
    const rampUpTime = results.config?.rampUpTime || 0;

    // 计算预期的总数据点数：测试时长 × 用户数 × 每用户每秒平均请求数
    const totalTestTime = testDurationSeconds + rampUpTime + 30; // 额外30秒缓冲
    const expectedDataPoints = totalTestTime * userCount * 3; // 每用户每秒最多3个数据点
    const maxDataPoints = Math.max(expectedDataPoints, 5000); // 至少保留5000个数据点

    // 只有在数据点数量远超预期时才进行截断（保留策略更宽松）
    if (results.realTimeData.length > maxDataPoints * 1.5) {
      // 删除最早的25%数据，而不是逐个删除
      const removeCount = Math.floor(results.realTimeData.length * 0.25);
      results.realTimeData.splice(0, removeCount);
      Logger.info(`数据点过多，删除最早的 ${removeCount} 个数据点，当前保留: ${results.realTimeData.length}`);
    }

    // 广播实时数据
    this.broadcastRealTimeData(results.testId, dataPoint);
  }

  /**
   * 计算动态思考时间
   */
  calculateDynamicThinkTime(baseThinkTime, metrics) {
    const errorRate = metrics.totalRequests > 0
      ? (metrics.failedRequests / metrics.totalRequests) * 100
      : 0;
    const avgResponseTime = metrics.averageResponseTime || 0;

    let multiplier = 1;

    // 根据错误率调整
    if (errorRate > 20) {
      multiplier = 3;
    } else if (errorRate > 10) {
      multiplier = 2;
    } else if (errorRate > 5) {
      multiplier = 1.5;
    }

    // 根据响应时间调整
    if (avgResponseTime > 5000) {
      multiplier = Math.max(multiplier, 2);
    } else if (avgResponseTime > 2000) {
      multiplier = Math.max(multiplier, 1.5);
    }

    // 🔧 修复：减少思考时间，提高请求频率
    // 将基础思考时间从秒转换为毫秒，但使用更合理的值
    const baseThinkTimeMs = Math.max(100, baseThinkTime * 200); // 最小100ms，基础值降低到200ms
    return baseThinkTimeMs * multiplier;
  }

  /**
   * 睡眠函数 - 支持取消检查
   */
  sleep(ms, testId = null) {
    return new Promise((resolve) => {
      const checkInterval = Math.min(CONSTANTS.TIMEOUTS.CANCEL_CHECK_INTERVAL, ms);
      let elapsed = 0;

      const check = () => {
        // 检查是否应该取消
        if (testId && this.shouldStopTest(testId)) {
          Logger.debug(`睡眠期间检测到测试取消，立即中断: ${testId}`);
          resolve();
          return;
        }

        elapsed += checkInterval;
        if (elapsed >= ms) {
          resolve();
        } else {
          setTimeout(check, Math.min(checkInterval, ms - elapsed));
        }
      };

      setTimeout(check, Math.min(checkInterval, ms));
    });
  }

  // ==================== 状态管理 ====================

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
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.runningTests.get(testId);
  }

  /**
   * 获取所有运行中的测试
   */
  getAllRunningTests() {
    const runningTests = [];
    for (const [testId, status] of this.runningTests.entries()) {
      runningTests.push({
        testId,
        status: status.status,
        startTime: status.startTime,
        duration: status.duration,
        cancelled: status.cancelled,
        lastUpdated: status.lastUpdated,
        userId: status.userId,
        recordId: status.recordId
      });
    }
    return runningTests;
  }

  /**
   * 获取运行中测试的数量
   */
  getRunningTestsCount() {
    return this.runningTests.size;
  }

  /**
   * 移除测试状态
   */
  removeTestStatus(testId) {
    this.runningTests.delete(testId);
  }

  /**
   * 检查是否应该停止测试
   */
  shouldStopTest(testId) {
    const testStatus = this.getTestStatus(testId);
    if (!testStatus) {
      return false;
    }

    const shouldCancel = testStatus.cancelled === true || testStatus.status === 'cancelled';

    if (shouldCancel) {
      Logger.debug(`检查测试 ${testId} 是否应该取消:`, {
        hasTestStatus: !!testStatus,
        status: testStatus.status,
        cancelled: testStatus.cancelled,
        broadcastStopped: testStatus.broadcastStopped,
        shouldCancel: shouldCancel,
        allRunningTests: Array.from(this.runningTests.keys())
      });
    }

    return shouldCancel;
  }

  /**
   * 取消测试
   */
  async cancelTest(testId, reason = '用户取消') {
    Logger.info(`取消测试: ${testId}`, { reason });

    const testStatus = this.getTestStatus(testId);
    if (testStatus) {
      // 更新状态为已取消
      this.updateTestStatus(testId, {
        cancelled: true,
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: Date.now()
      });

      // 停止数据广播
      this.stopBroadcast(testId);

      // 清理定时器
      this.clearTestTimers(testId);

      Logger.info(`测试 ${testId} 已标记为取消`);
      return { success: true, message: '测试已取消' };
    }

    return { success: false, message: '测试不存在或已完成' };
  }

  /**
   * 取消压力测试 - 增强版本，包含完整的资源清理
   * 这是路由中调用的主要方法
   */
  async cancelStressTest(testId, cancelReason = '用户手动取消', preserveData = true) {
    try {
      Logger.info(`🛑 取消压力测试: ${testId}`, { reason: cancelReason, preserveData });

      // 获取测试状态
      const testStatus = this.getTestStatus(testId);
      if (!testStatus) {
        Logger.warn(`⚠️ 测试 ${testId} 不存在或已完成`);
        return {
          success: false,
          message: '测试不存在或已完成'
        };
      }

      // 记录取消开始时间
      const cancelStartTime = Date.now();

      // 标记测试为已取消
      const updatedStatus = {
        ...testStatus,
        status: 'cancelled',
        cancelled: true,
        cancelReason: cancelReason,
        cancelledAt: new Date().toISOString(),
        endTime: new Date().toISOString(),
        actualDuration: (Date.now() - new Date(testStatus.startTime).getTime()) / 1000
      };

      // 更新测试状态
      this.updateTestStatus(testId, updatedStatus);

      Logger.info(`🛑 测试 ${testId} 已标记为取消: status=${updatedStatus.status}, cancelled=${updatedStatus.cancelled}`);

      // 立即广播取消状态
      this.broadcastTestStatus(testId, {
        status: 'cancelled',
        message: '测试已被用户取消',
        endTime: updatedStatus.endTime,
        actualDuration: updatedStatus.actualDuration,
        metrics: updatedStatus.metrics || {},
        realTimeData: updatedStatus.realTimeData || [],
        cancelReason: cancelReason,
        cancelled: true
      });

      // 停止数据广播
      this.stopBroadcast(testId);

      // 清理定时器
      this.clearTestTimers(testId);

      // 清理WebSocket房间
      await this.cleanupTestRoom(testId);

      // 计算最终指标
      if (updatedStatus.metrics) {
        MetricsCalculator.calculateFinalMetrics(updatedStatus);
      }

      Logger.info(`✅ 压力测试 ${testId} 已成功取消`);

      // 🔧 修复：延迟清理取消状态，确保前端有时间查询到正确状态
      setTimeout(() => {
        this.removeTestStatus(testId);
        Logger.debug(`已清理取消的测试状态: ${testId}`);
      }, 60000); // 60秒后清理，给前端足够时间查询状态

      return {
        success: true,
        message: '测试已成功取消',
        data: {
          testId,
          status: 'cancelled',
          endTime: updatedStatus.endTime,
          actualDuration: updatedStatus.actualDuration,
          metrics: updatedStatus.metrics || {},
          realTimeData: updatedStatus.realTimeData || [],
          cancelReason: cancelReason,
          cancelledAt: updatedStatus.endTime
        }
      };

    } catch (error) {
      Logger.error(`❌ 取消压力测试失败 ${testId}:`, error);
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
   * 清理测试的WebSocket房间
   */
  async cleanupTestRoom(testId) {
    try {
      const roomName = `stress-test-${testId}`;
      Logger.info(`🧹 清理WebSocket房间: ${roomName}`);

      if (this.io) {
        // 通知房间内的所有客户端测试已结束
        this.io.to(roomName).emit('test-room-cleanup', {
          testId,
          message: '测试已结束，房间即将清理',
          timestamp: Date.now()
        });

        // 让所有客户端离开房间
        this.io.socketsLeave(roomName);
        Logger.info(`✅ 房间 ${roomName} 已清理`);
      }
    } catch (error) {
      Logger.error(`❌ 清理房间 ${testId} 失败:`, error);
    }
  }

  // ==================== 监控和清理 ====================

  /**
   * 启动进度监控器
   */
  startProgressMonitor(results, totalDuration) {
    const startTime = Date.now();

    // 🔧 调试：检查totalDuration值
    console.log('🔧 startProgressMonitor 参数检查:', {
      testId: results.testId,
      totalDuration: totalDuration,
      'typeof totalDuration': typeof totalDuration,
      'totalDuration / 1000': totalDuration / 1000,
      startTime: startTime
    });

    const monitor = setInterval(() => {
      // 检查测试是否被取消
      if (this.shouldStopTest(results.testId)) {
        Logger.debug(`进度监控器检测到测试取消: ${results.testId}`);
        clearInterval(monitor);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));

      results.progress = progress;

      // 检查是否达到测试时间，自动结束测试
      if (elapsed >= totalDuration) {
        Logger.info(`测试 ${results.testId} 达到预定时间 ${totalDuration}ms，自动结束`);
        clearInterval(monitor);

        // 检查测试是否已经完成，避免重复处理
        const currentStatus = this.getTestStatus(results.testId);
        if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'cancelled')) {
          Logger.info(`测试 ${results.testId} 已经完成，跳过重复处理`);
          return;
        }

        // 设置测试为完成状态
        this.updateTestStatus(results.testId, {
          status: 'completed',
          progress: 100,
          endTime: new Date().toISOString(),
          actualDuration: elapsed / 1000,
          autoCompleted: true,
          completedBy: 'progress-monitor'
        });

        // 广播测试完成状态
        this.broadcastTestStatus(results.testId, {
          status: 'completed',
          message: '测试已自动完成',
          progress: 100,
          endTime: new Date().toISOString(),
          actualDuration: elapsed / 1000,
          metrics: results.metrics || {},
          realTimeData: results.realTimeData || []
        });

        // 处理测试完成 - 延迟执行以确保状态更新完成
        setTimeout(() => {
          // 再次检查状态，确保不重复处理
          const finalStatus = this.getTestStatus(results.testId);
          if (finalStatus && finalStatus.status === 'completed' && !finalStatus.finalProcessed) {
            // 标记为已最终处理
            this.updateTestStatus(results.testId, { finalProcessed: true });
            this.handleTestCompletion(results.testId, results);
          }
        }, 1000);

        return;
      }

      // 🔧 调试：检查 metrics 数据
      console.log('🔍 进度监控器检查 metrics:', {
        testId: results.testId,
        hasMetrics: !!results.metrics,
        totalRequests: results.metrics?.totalRequests,
        currentTPS: results.metrics?.currentTPS,
        progress: progress
      });

      // 广播进度更新
      this.broadcastProgress(results.testId, {
        progress,
        metrics: results.metrics,
        currentPhase: results.currentPhase
      });

    }, CONSTANTS.TIMEOUTS.PROGRESS_UPDATE_INTERVAL);

    // 跟踪监控器
    this.trackTimer(results.testId, monitor);

    // 设置测试自动结束定时器（作为备用机制）
    const autoEndTimer = setTimeout(() => {
      Logger.info(`测试 ${results.testId} 备用定时器触发，检查是否需要强制结束测试`);

      // 检查测试状态，只有在测试仍在运行且未被取消时才强制结束
      const currentStatus = this.getTestStatus(results.testId);
      if (currentStatus && currentStatus.status === 'running' && !this.shouldStopTest(results.testId)) {
        Logger.info(`测试 ${results.testId} 备用定时器强制结束测试`);

        this.updateTestStatus(results.testId, {
          status: 'completed',
          progress: 100,
          endTime: new Date().toISOString(),
          actualDuration: totalDuration / 1000,
          autoCompleted: true,
          completedBy: 'backup-timer'
        });

        this.broadcastTestStatus(results.testId, {
          status: 'completed',
          message: '测试已自动完成（备用定时器）',
          progress: 100,
          endTime: new Date().toISOString(),
          actualDuration: totalDuration / 1000,
          metrics: results.metrics || {},
          realTimeData: results.realTimeData || []
        });

        // 延迟处理，确保状态更新完成
        setTimeout(() => {
          const finalStatus = this.getTestStatus(results.testId);
          if (finalStatus && finalStatus.status === 'completed' && !finalStatus.finalProcessed) {
            this.updateTestStatus(results.testId, { finalProcessed: true });
            this.handleTestCompletion(results.testId, results);
          }
        }, 500);
      } else {
        Logger.info(`测试 ${results.testId} 备用定时器检查：测试已完成或被取消，无需处理`);
      }
    }, totalDuration + 5000); // 额外5秒缓冲时间

    // 跟踪自动结束定时器
    this.trackTimer(results.testId, autoEndTimer);

    return monitor;
  }

  /**
   * 清理进度监控器
   */
  clearProgressMonitor(monitor) {
    if (monitor) {
      clearInterval(monitor);
    }
  }

  /**
   * 跟踪定时器
   */
  trackTimer(testId, timer) {
    if (!this.globalTimers.has(testId)) {
      this.globalTimers.set(testId, []);
    }
    this.globalTimers.get(testId).push(timer);
  }

  /**
   * 清理测试相关的所有定时器
   */
  clearTestTimers(testId) {
    const timers = this.globalTimers.get(testId);
    if (timers) {
      timers.forEach(timer => {
        if (timer) {
          clearTimeout(timer);
          clearInterval(timer);
        }
      });
      this.globalTimers.delete(testId);
      Logger.debug(`已清理测试 ${testId} 的 ${timers.length} 个定时器`);
    }
  }

  /**
   * 清理测试资源
   */
  cleanupTest(testId) {
    Logger.debug(`开始清理测试资源: ${testId}`);

    // 清理定时器
    this.clearTestTimers(testId);

    // 停止数据广播
    this.stopBroadcast(testId);

    // 清理WebSocket房间
    this.cleanupWebSocketRoom(testId);

    // 延迟移除测试状态（保留30秒用于取消检查）
    setTimeout(() => {
      this.removeTestStatus(testId);
      Logger.debug(`已移除测试状态: ${testId}`);
    }, CONSTANTS.TIMEOUTS.CLEANUP_DELAY);

    Logger.debug(`测试资源清理完成: ${testId}`);
  }

  // ==================== 外部接口方法 ====================

  /**
   * 广播实时数据
   */
  broadcastRealTimeData(testId, dataPoint) {
    try {
      // 检查测试是否已被取消
      if (this.shouldStopTest(testId)) {
        Logger.debug(`测试 ${testId} 已取消，跳过实时数据广播`);
        return;
      }

      // 检查测试状态是否已停止广播
      const testStatus = this.getTestStatus(testId);
      if (testStatus && testStatus.broadcastStopped) {
        Logger.debug(`测试 ${testId} 广播已停止，跳过数据广播`);
        return;
      }

      if (global.io) {
        const roomName = `stress-test-${testId}`;
        global.io.to(roomName).emit('realTimeData', dataPoint);
        console.log(`📡 广播实时数据到房间: ${roomName}`, {
          dataPoint: dataPoint,
          hasGlobalIO: !!global.io,
          roomName: roomName
        });
      } else {
        console.warn('⚠️ global.io 不存在，无法广播实时数据');
      }
    } catch (error) {
      Logger.error(`广播实时数据失败: ${testId}`, error);
    }
  }

  /**
   * 广播进度更新 - 需要外部实现
   */
  broadcastProgress(testId, progressData) {
    // 这个方法需要在外部实现WebSocket广播逻辑
    if (global.io) {
      // 🔧 修复：确保发送完整的指标数据，包含testId
      const completeProgressData = {
        testId,
        ...progressData
      };

      console.log('📡 广播进度更新:', {
        testId,
        progress: progressData.progress,
        hasMetrics: !!progressData.metrics,
        totalRequests: progressData.metrics?.totalRequests,
        currentTPS: progressData.metrics?.currentTPS,
        requestsPerSecond: progressData.metrics?.requestsPerSecond,
        throughput: progressData.metrics?.throughput
      });

      global.io.to(`stress-test-${testId}`).emit('progress', completeProgressData);
    }
  }

  /**
   * 广播测试状态变化
   */
  broadcastTestStatus(testId, statusData) {
    try {
      if (global.io) {
        const roomName = `stress-test-${testId}`;
        const broadcastData = {
          testId,
          timestamp: Date.now(),
          ...statusData
        };

        global.io.to(roomName).emit('testStatus', broadcastData);
        Logger.info(`📡 广播测试状态: ${testId}`, {
          status: statusData.status,
          message: statusData.message,
          hasGlobalIO: !!global.io,
          roomName: roomName
        });

        // 如果是完成或取消状态，延迟清理房间
        if (statusData.status === 'completed' || statusData.status === 'cancelled') {
          setTimeout(() => {
            this.cleanupTestRoom(testId);
          }, 2000);
        }
      } else {
        Logger.warn('⚠️ global.io 未设置，无法广播测试状态');
      }
    } catch (error) {
      Logger.error('广播测试状态失败:', error);
    }
  }

  /**
   * 广播测试完成事件
   */
  broadcastTestComplete(testId, results) {
    try {
      if (global.io) {
        const completeData = {
          testId,
          timestamp: Date.now(),
          success: true,
          data: results,
          results: results,
          metrics: results.metrics || {},
          duration: results.actualDuration || results.duration,
          testType: results.testType || 'stress',
          status: results.status
        };

        console.log('📡 准备广播测试完成数据:', {
          testId,
          hasMetrics: !!results.metrics,
          metricsKeys: results.metrics ? Object.keys(results.metrics) : [],
          totalRequests: results.metrics?.totalRequests,
          throughput: results.metrics?.throughput
        });

        global.io.to(`stress-test-${testId}`).emit('stress-test-complete', completeData);

        Logger.info(`📡 测试完成事件已广播: ${testId}`, {
          status: results.status,
          totalRequests: results.metrics?.totalRequests || 0
        });
      } else {
        Logger.warn('Global io instance not found for WebSocket broadcast');
      }
    } catch (error) {
      Logger.error('WebSocket完成广播失败:', error);
    }
  }

  /**
   * 停止数据广播 - 需要外部实现
   */
  stopBroadcast(testId) {
    // 这个方法需要在外部实现停止广播逻辑
    Logger.debug(`停止数据广播: ${testId}`);
  }

  /**
   * 清理WebSocket房间 - 需要外部实现
   */
  cleanupWebSocketRoom(testId) {
    // 这个方法需要在外部实现WebSocket房间清理逻辑
    if (global.io) {
      const roomName = `stress-test-${testId}`;
      // 清理房间中的所有客户端
      global.io.in(roomName).disconnectSockets();
      Logger.debug(`清理WebSocket房间: ${roomName}`);
    }
  }

  /**
   * 保存最终测试结果
   */
  async saveFinalTestResults(testId, results) {
    try {
      const testStatus = this.getTestStatus(testId);
      if (!testStatus || !testStatus.recordId || !testStatus.userId) {
        Logger.warn('没有数据库记录ID或用户ID，跳过保存最终结果');
        return;
      }

      // 检查测试是否被取消
      if (this.shouldStopTest(testId)) {
        Logger.info(`测试 ${testId} 已被取消，跳过保存最终完成结果`);

        // 保存取消记录
        try {
          Logger.info(`保存取消的测试记录: ${testId}`);

          // 调用测试历史服务保存取消状态
          if (global.testHistoryService) {
            await global.testHistoryService.cancelTest(
              testStatus.recordId,
              results.cancelReason || '用户手动取消',
              testStatus.userId
            );
            Logger.info(`取消记录保存成功: ${testId}`);
          }
        } catch (error) {
          Logger.error(`保存取消记录失败: ${testId}`, error);
        }
        return;
      }

      Logger.info(`保存最终测试结果: ${testId}`);

      // 调用测试历史服务保存完成状态
      if (global.testHistoryService) {
        const finalResults = {
          results: results.metrics,
          overallScore: this.calculateOverallScore(results),
          performanceGrade: this.calculatePerformanceGrade(results),
          totalRequests: results.metrics.totalRequests,
          successfulRequests: results.metrics.successfulRequests,
          failedRequests: results.metrics.failedRequests,
          averageResponseTime: results.metrics.averageResponseTime,
          peakTps: results.metrics.peakTPS,
          errorRate: results.metrics.errorRate,
          realTimeData: results.realTimeData
        };

        await global.testHistoryService.completeTest(
          testStatus.recordId,
          finalResults,
          testStatus.userId
        );
        Logger.info(`测试结果保存完成: ${testId}`);
      }
    } catch (error) {
      Logger.error(`保存测试结果失败: ${testId}`, error);
    }
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(results) {
    const { metrics } = results;
    let score = 100;

    // 根据错误率扣分
    if (metrics.errorRate > 0) {
      score -= Math.min(50, metrics.errorRate * 2);
    }

    // 根据平均响应时间扣分
    if (metrics.averageResponseTime > 1000) {
      score -= Math.min(30, (metrics.averageResponseTime - 1000) / 100);
    }

    // 根据吞吐量加分
    if (metrics.throughput > 10) {
      score += Math.min(10, metrics.throughput / 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 计算性能等级
   */
  calculatePerformanceGrade(results) {
    const score = this.calculateOverallScore(results);

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // ==================== 静态方法 ====================

  /**
   * 静态方法：检查是否应该停止测试
   */
  static shouldStopTest(testId) {
    // 使用全局实例检查测试状态
    if (global.stressTestEngine) {
      return global.stressTestEngine.shouldStopTest(testId);
    }
    return false;
  }

  /**
   * 清理所有测试房间 - 服务器启动时调用
   */
  async cleanupAllTestRooms() {
    try {
      Logger.info('🧹 开始清理所有WebSocket测试房间...');

      if (!this.io) {
        Logger.warn('⚠️ WebSocket实例未设置，跳过房间清理');
        return;
      }

      // 获取所有房间
      const rooms = this.io.sockets.adapter.rooms;
      let cleanedRooms = 0;

      // 清理所有以 'stress-test-' 开头的房间
      for (const [roomName, room] of rooms) {
        if (roomName.startsWith('stress-test-')) {
          Logger.info(`🧹 清理测试房间: ${roomName} (${room.size} 个连接)`);

          // 让所有客户端离开房间
          this.io.to(roomName).emit('test-room-cleanup', {
            message: '服务器重启，测试房间已清理',
            timestamp: Date.now()
          });

          // 清空房间
          this.io.socketsLeave(roomName);
          cleanedRooms++;
        }
      }

      // 清理运行中的测试状态
      if (this.runningTests && this.runningTests.size > 0) {
        Logger.info(`🧹 清理 ${this.runningTests.size} 个运行中的测试状态`);
        this.runningTests.clear();
      }

      // 清理全局定时器
      if (this.globalTimers && this.globalTimers.size > 0) {
        Logger.info(`🧹 清理 ${this.globalTimers.size} 个全局定时器`);
        for (const [timerId, timer] of this.globalTimers) {
          if (timer) {
            clearInterval(timer);
            clearTimeout(timer);
          }
        }
        this.globalTimers.clear();
      }

      Logger.info(`✅ 房间清理完成: 清理了 ${cleanedRooms} 个测试房间`);

    } catch (error) {
      Logger.error('❌ 清理测试房间时发生错误:', error);
      throw error;
    }
  }
}

// 创建全局实例
const createGlobalInstance = () => {
  if (!global.stressTestEngine) {
    global.stressTestEngine = new RealStressTestEngine();
    Logger.info('创建全局压力测试引擎实例');
  }
  return global.stressTestEngine;
};

// 导出引擎类和工厂函数
module.exports = RealStressTestEngine;
module.exports.createGlobalInstance = createGlobalInstance;
module.exports.RealStressTestEngine = RealStressTestEngine;
