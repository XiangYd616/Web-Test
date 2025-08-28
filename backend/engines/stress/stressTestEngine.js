/**
 * 压力测试工具
 * 真实实现负载测试、并发测试、性能压力测试
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const Joi = require('joi');

class StressTestEngine {
  constructor() {
    this.name = 'stress';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      concurrency: Joi.number().min(1).max(1000).default(10),
      requests: Joi.number().min(1).max(10000).default(100),
      duration: Joi.number().min(1).max(300).optional(), // 秒
      timeout: Joi.number().min(1000).max(60000).default(30000),
      method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').default('GET'),
      headers: Joi.object().default({}),
      body: Joi.string().optional(),
      rampUp: Joi.number().min(0).max(60).default(0), // 渐进加压时间(秒)
      keepAlive: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * 检查可用性
   */
  async checkAvailability() {
    try {
      // 测试基本HTTP请求功能
      const testUrl = 'https://httpbin.org/status/200';
      const result = await this.makeRequest(testUrl, 'GET', {}, null, 5000);

      return {
        available: result.statusCode === 200,
        version: {
          node: process.version,
          platform: process.platform
        },
        dependencies: ['http', 'https', 'url']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['http', 'https', 'url']
      };
    }
  }

  /**
   * 执行压力测试
   */
  async runStressTest(config) {
    const testId = `stress_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
        cancelled: false
      });

      this.updateTestProgress(testId, 5, '初始化压力测试');

      const results = {
        testId,
        url: validatedConfig.url,
        config: {
          concurrency: validatedConfig.concurrency,
          requests: validatedConfig.requests,
          duration: validatedConfig.duration,
          method: validatedConfig.method
        },
        timestamp: new Date().toISOString(),
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTime: 0,
          avgResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          requestsPerSecond: 0,
          errors: []
        },
        timeline: []
      };

      this.updateTestProgress(testId, 10, '开始压力测试');

      // 执行压力测试
      if (validatedConfig.duration) {
        // 基于时间的测试
        await this.runDurationBasedTest(testId, validatedConfig, results);
      } else {
        // 基于请求数量的测试
        await this.runRequestBasedTest(testId, validatedConfig, results);
      }

      // 计算最终指标
      this.calculateFinalMetrics(results);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '压力测试完成');

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      return results;

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        progress: 0,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 执行基于请求数量的测试
   */
  async runRequestBasedTest(testId, config, results) {
    const batchSize = Math.min(config.concurrency, config.requests);
    const totalBatches = Math.ceil(config.requests / batchSize);
    let completedRequests = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const testState = this.activeTests.get(testId);
      if (testState?.cancelled) {
        break;
      }

      const currentBatchSize = Math.min(batchSize, config.requests - completedRequests);
      const promises = [];

      // 创建并发请求
      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.executeRequest(config, results));
      }

      // 等待当前批次完成
      await Promise.allSettled(promises);

      completedRequests += currentBatchSize;
      const progress = 10 + Math.round((completedRequests / config.requests) * 80);
      this.updateTestProgress(testId, progress, `已完成 ${completedRequests}/${config.requests} 请求`);

      // 渐进加压延迟
      if (config.rampUp > 0 && batch < totalBatches - 1) {
        const delay = (config.rampUp * 1000) / totalBatches;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 执行基于时间的测试
   */
  async runDurationBasedTest(testId, config, results) {
    const endTime = Date.now() + (config.duration * 1000);
    let requestCount = 0;

    while (Date.now() < endTime) {
      const testState = this.activeTests.get(testId);
      if (testState?.cancelled) {
        break;
      }

      const promises = [];

      // 创建并发请求
      for (let i = 0; i < config.concurrency; i++) {
        promises.push(this.executeRequest(config, results));
        requestCount++;
      }

      // 等待当前批次完成
      await Promise.allSettled(promises);

      const elapsed = Date.now() - this.activeTests.get(testId).startTime;
      const progress = 10 + Math.round((elapsed / (config.duration * 1000)) * 80);
      this.updateTestProgress(testId, progress, `运行时间 ${Math.round(elapsed / 1000)}/${config.duration} 秒`);

      // 短暂延迟以避免过度消耗资源
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * 执行单个请求
   */
  async executeRequest(config, results) {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(
        config.url,
        config.method,
        config.headers,
        config.body,
        config.timeout
      );

      const responseTime = Date.now() - startTime;

      // 更新指标
      results.metrics.totalRequests++;
      results.metrics.successfulRequests++;
      results.metrics.minResponseTime = Math.min(results.metrics.minResponseTime, responseTime);
      results.metrics.maxResponseTime = Math.max(results.metrics.maxResponseTime, responseTime);

      // 记录时间线数据（采样）
      if (results.timeline.length < 1000) {
        results.timeline.push({
          timestamp: Date.now(),
          responseTime,
          statusCode: response.statusCode,
          success: true
        });
      }

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // 更新错误指标
      results.metrics.totalRequests++;
      results.metrics.failedRequests++;

      const errorInfo = {
        message: error.message,
        timestamp: Date.now(),
        responseTime
      };

      results.metrics.errors.push(errorInfo);

      // 记录错误到时间线
      if (results.timeline.length < 1000) {
        results.timeline.push({
          timestamp: Date.now(),
          responseTime,
          error: error.message,
          success: false
        });
      }

      return null;
    }
  }

  /**
   * 发起HTTP请求
   */
  makeRequest(url, method, headers, body, timeout) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'StressTestEngine/1.0',
          ...headers
        },
        timeout
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body && (method === 'POST' || method === 'PUT')) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * 计算最终指标
   */
  calculateFinalMetrics(results) {
    const metrics = results.metrics;

    if (metrics.totalRequests > 0) {
      // 计算平均响应时间
      const successfulTimeline = results.timeline.filter(t => t.success);
      if (successfulTimeline.length > 0) {
        metrics.avgResponseTime = Math.round(
          successfulTimeline.reduce((sum, t) => sum + t.responseTime, 0) / successfulTimeline.length
        );
      }

      // 计算每秒请求数
      const totalTimeSeconds = results.totalTime / 1000;
      metrics.requestsPerSecond = Math.round(metrics.totalRequests / totalTimeSeconds);

      // 修正最小响应时间
      if (metrics.minResponseTime === Infinity) {
        metrics.minResponseTime = 0;
      }
    }

    // 计算成功率
    metrics.successRate = metrics.totalRequests > 0
      ? Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)
      : 0;
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
      console.log(`[${this.name.toUpperCase()}-${testId}] ${progress}% - ${message}`);
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {

      test.status = 'cancelled';
      this.activeTests.set(testId, test);
      return true;
    }
    return false;
  }

  /**
   * 清理所有测试房间
   */
  async cleanupAllTestRooms() {
    try {
      console.log('🧹 开始清理压力测试房间...');

      // 取消所有运行中的测试
      let cancelledCount = 0;
      for (const [testId, test] of this.activeTests.entries()) {
        if (test.status === 'running') {
          await this.stopTest(testId);
          cancelledCount++;
        }
      }

      // 清理过期的测试记录 (超过1小时的)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      let cleanedCount = 0;
      for (const [testId, test] of this.activeTests.entries()) {
        if (test.startTime && test.startTime < oneHourAgo) {
          this.activeTests.delete(testId);
          cleanedCount++;
        }
      }

      console.log(`✅ 压力测试房间清理完成: 取消 ${cancelledCount} 个运行中的测试, 清理 ${cleanedCount} 个过期记录`);

      return {
        cancelled: cancelledCount,
        cleaned: cleanedCount,
        remaining: this.activeTests.size
      };
    } catch (error) {
      console.error('❌ 清理压力测试房间失败:', error);
      throw error;
    }
  }
}

module.exports = StressTestEngine;