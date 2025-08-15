/**
 * 真实压力测试引擎
 * 提供高性能的压力测试功能
 */

const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class RealStressTestEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrency: options.maxConcurrency || 100,
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      keepAlive: options.keepAlive !== false,
      ...options
    };

    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      totalBytes: 0,
      startTime: null,
      endTime: null,
      responseTimes: [],
      statusCodes: {},
      errors: []
    };

    this.activeRequests = 0;
    this.isRunning = false;
    this.shouldStop = false;

    // HTTP代理配置
    this.httpAgent = new http.Agent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxConcurrency
    });

    this.httpsAgent = new https.Agent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxConcurrency,
      rejectUnauthorized: false // 允许自签名证书
    });
  }

  /**
   * 开始压力测试
   * @param {object} testConfig - 测试配置
   */
  async startTest(testConfig) {
    if (this.isRunning) {
      throw new Error('测试已在运行中');
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.resetStats();

    const {
      url,
      method = 'GET',
      headers = {},
      body = null,
      duration = 60000, // 默认60秒
      requestsPerSecond = 10,
      totalRequests = null
    } = testConfig;

    this.stats.startTime = Date.now();
    this.emit('test:started', { config: testConfig });

    try {
      if (totalRequests) {
        await this.runFixedRequestTest(url, method, headers, body, totalRequests);
      } else {
        await this.runDurationTest(url, method, headers, body, duration, requestsPerSecond);
      }
    } catch (error) {
      this.emit('test:error', error);
    } finally {
      this.isRunning = false;
      this.stats.endTime = Date.now();
      this.emit('test:completed', this.getResults());
    }
  }

  /**
   * 运行固定请求数量的测试
   */
  async runFixedRequestTest(url, method, headers, body, totalRequests) {
    const promises = [];
    
    for (let i = 0; i < totalRequests && !this.shouldStop; i++) {
      if (this.activeRequests >= this.options.maxConcurrency) {
        await this.waitForSlot();
      }

      const promise = this.makeRequest(url, method, headers, body, i);
      promises.push(promise);
      
      // 发送进度更新
      if (i % 100 === 0) {
        this.emit('test:progress', {
          completed: this.stats.completedRequests,
          total: totalRequests,
          active: this.activeRequests
        });
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * 运行基于时间的测试
   */
  async runDurationTest(url, method, headers, body, duration, requestsPerSecond) {
    const interval = 1000 / requestsPerSecond;
    const endTime = Date.now() + duration;

    while (Date.now() < endTime && !this.shouldStop) {
      if (this.activeRequests < this.options.maxConcurrency) {
        this.makeRequest(url, method, headers, body);
      }

      await this.sleep(interval);
      
      // 发送进度更新
      if (this.stats.totalRequests % 100 === 0) {
        this.emit('test:progress', {
          elapsed: Date.now() - this.stats.startTime,
          duration: duration,
          requestsPerSecond: this.calculateCurrentRPS(),
          active: this.activeRequests
        });
      }
    }

    // 等待所有活跃请求完成
    while (this.activeRequests > 0) {
      await this.sleep(100);
    }
  }

  /**
   * 发送单个HTTP请求
   */
  async makeRequest(url, method, headers, body, requestId = null) {
    this.activeRequests++;
    this.stats.totalRequests++;

    const startTime = Date.now();
    
    try {
      const result = await this.sendHttpRequest(url, method, headers, body);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.stats.completedRequests++;
      this.stats.responseTimes.push(responseTime);
      this.stats.totalBytes += result.bytes || 0;

      // 记录状态码
      const statusCode = result.statusCode;
      this.stats.statusCodes[statusCode] = (this.stats.statusCodes[statusCode] || 0) + 1;

      this.emit('request:completed', {
        requestId,
        statusCode,
        responseTime,
        bytes: result.bytes
      });

    } catch (error) {
      this.stats.failedRequests++;
      this.stats.errors.push({
        timestamp: Date.now(),
        error: error.message,
        requestId
      });

      this.emit('request:failed', {
        requestId,
        error: error.message
      });
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * 发送HTTP请求的底层实现
   */
  sendHttpRequest(url, method, headers, body) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      const agent = isHttps ? this.httpsAgent : this.httpAgent;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method.toUpperCase(),
        headers: {
          'User-Agent': 'StressTestEngine/1.0',
          ...headers
        },
        agent,
        timeout: this.options.timeout
      };

      const req = client.request(options, (res) => {
        let data = '';
        let bytes = 0;

        res.on('data', (chunk) => {
          data += chunk;
          bytes += chunk.length;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            bytes
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

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * 停止测试
   */
  stopTest() {
    this.shouldStop = true;
    this.emit('test:stopped');
  }

  /**
   * 等待请求槽位可用
   */
  async waitForSlot() {
    while (this.activeRequests >= this.options.maxConcurrency && !this.shouldStop) {
      await this.sleep(10);
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      totalBytes: 0,
      startTime: null,
      endTime: null,
      responseTimes: [],
      statusCodes: {},
      errors: []
    };
  }

  /**
   * 计算当前RPS
   */
  calculateCurrentRPS() {
    if (!this.stats.startTime) return 0;
    
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    return elapsed > 0 ? this.stats.completedRequests / elapsed : 0;
  }

  /**
   * 获取测试结果
   */
  getResults() {
    const duration = this.stats.endTime - this.stats.startTime;
    const responseTimes = this.stats.responseTimes.sort((a, b) => a - b);
    
    return {
      summary: {
        totalRequests: this.stats.totalRequests,
        completedRequests: this.stats.completedRequests,
        failedRequests: this.stats.failedRequests,
        successRate: this.stats.totalRequests > 0 ? 
          (this.stats.completedRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
        duration: duration,
        requestsPerSecond: duration > 0 ? (this.stats.completedRequests / (duration / 1000)).toFixed(2) : 0,
        totalBytes: this.stats.totalBytes,
        averageBytesPerRequest: this.stats.completedRequests > 0 ? 
          Math.round(this.stats.totalBytes / this.stats.completedRequests) : 0
      },
      responseTimes: {
        min: responseTimes.length > 0 ? responseTimes[0] : 0,
        max: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
        average: responseTimes.length > 0 ? 
          Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
        median: responseTimes.length > 0 ? 
          responseTimes[Math.floor(responseTimes.length / 2)] : 0,
        p95: responseTimes.length > 0 ? 
          responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
        p99: responseTimes.length > 0 ? 
          responseTimes[Math.floor(responseTimes.length * 0.99)] : 0
      },
      statusCodes: this.stats.statusCodes,
      errors: this.stats.errors.slice(0, 100) // 只返回前100个错误
    };
  }

  /**
   * 获取实时统计信息
   */
  getRealTimeStats() {
    return {
      totalRequests: this.stats.totalRequests,
      completedRequests: this.stats.completedRequests,
      failedRequests: this.stats.failedRequests,
      activeRequests: this.activeRequests,
      currentRPS: this.calculateCurrentRPS(),
      isRunning: this.isRunning
    };
  }
}

module.exports = {
  RealStressTestEngine
};
