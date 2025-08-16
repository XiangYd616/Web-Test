/**
 * 负载生成器
 * 本地化程度：100%
 * 生成各种类型的负载测试请求
 */

const axios = require('axios');
const https = require('https');
const http = require('http');

class LoadGenerator {
  constructor(options = {}) {
    this.options = {
      maxConcurrency: 100,
      timeout: 30000,
      keepAlive: true,
      maxSockets: 1000,
      ...options
    };
    
    // 创建HTTP代理池
    this.httpAgent = new http.Agent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: 50,
      timeout: this.options.timeout
    });
    
    this.httpsAgent = new https.Agent({
      keepAlive: this.options.keepAlive,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: 50,
      timeout: this.options.timeout,
      rejectUnauthorized: false
    });
    
    // 统计信息
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
      errorCounts: new Map(),
      statusCodes: new Map(),
      throughput: 0,
      startTime: null,
      endTime: null
    };
    
    // 运行状态
    this.isRunning = false;
    this.shouldStop = false;
    this.activeRequests = new Set();
  }

  /**
   * 启动负载测试
   */
  async startLoad(config) {
    try {
      console.log('🚀 启动负载测试...');
      
      this.isRunning = true;
      this.shouldStop = false;
      this.stats.startTime = Date.now();
      
      const {
        url,
        method = 'GET',
        headers = {},
        data = null,
        duration = 60, // 秒
        concurrency = 10,
        rampUp = 0, // 渐增时间（秒）
        pattern = 'constant', // constant, ramp, spike, wave
        onProgress = null
      } = config;
      
      // 验证URL
      if (!url) {
        throw new Error('URL是必需的');
      }
      
      // 根据模式执行负载测试
      switch (pattern) {
        case 'constant':
          await this.constantLoad(config);
          break;
        case 'ramp':
          await this.rampLoad(config);
          break;
        case 'spike':
          await this.spikeLoad(config);
          break;
        case 'wave':
          await this.waveLoad(config);
          break;
        default:
          await this.constantLoad(config);
      }
      
      this.stats.endTime = Date.now();
      this.isRunning = false;
      
      console.log('✅ 负载测试完成');
      
      return this.getResults();
      
    } catch (error) {
      this.isRunning = false;
      console.error('❌ 负载测试失败:', error);
      throw error;
    }
  }

  /**
   * 恒定负载模式
   */
  async constantLoad(config) {
    const { duration, concurrency, onProgress } = config;
    const endTime = Date.now() + (duration * 1000);
    
    // 创建并发请求池
    const requestPromises = [];
    
    for (let i = 0; i < concurrency; i++) {
      const promise = this.continuousRequests(config, endTime, onProgress);
      requestPromises.push(promise);
    }
    
    // 等待所有请求完成
    await Promise.all(requestPromises);
  }

  /**
   * 渐增负载模式
   */
  async rampLoad(config) {
    const { duration, concurrency, rampUp, onProgress } = config;
    const endTime = Date.now() + (duration * 1000);
    const rampUpMs = rampUp * 1000;
    const stepInterval = rampUpMs / concurrency;
    
    const requestPromises = [];
    
    for (let i = 0; i < concurrency; i++) {
      // 延迟启动每个并发请求
      setTimeout(() => {
        if (!this.shouldStop) {
          const promise = this.continuousRequests(config, endTime, onProgress);
          requestPromises.push(promise);
        }
      }, i * stepInterval);
    }
    
    // 等待渐增完成后再等待所有请求完成
    await this.sleep(rampUpMs);
    await Promise.all(requestPromises);
  }

  /**
   * 峰值负载模式
   */
  async spikeLoad(config) {
    const { duration, concurrency, onProgress } = config;
    const spikeDuration = Math.min(10, duration / 4); // 峰值持续时间
    const normalConcurrency = Math.max(1, Math.floor(concurrency / 4));
    
    // 正常负载阶段
    console.log(`开始正常负载阶段: ${normalConcurrency} 并发`);
    await this.runLoadPhase({
      ...config,
      concurrency: normalConcurrency,
      duration: (duration - spikeDuration) / 2
    }, onProgress);
    
    // 峰值负载阶段
    console.log(`开始峰值负载阶段: ${concurrency} 并发`);
    await this.runLoadPhase({
      ...config,
      concurrency: concurrency,
      duration: spikeDuration
    }, onProgress);
    
    // 恢复正常负载阶段
    console.log(`恢复正常负载阶段: ${normalConcurrency} 并发`);
    await this.runLoadPhase({
      ...config,
      concurrency: normalConcurrency,
      duration: (duration - spikeDuration) / 2
    }, onProgress);
  }

  /**
   * 波浪负载模式
   */
  async waveLoad(config) {
    const { duration, concurrency, onProgress } = config;
    const waveCount = 4; // 波浪数量
    const waveDuration = duration / waveCount;
    
    for (let i = 0; i < waveCount; i++) {
      if (this.shouldStop) break;
      
      // 计算当前波浪的并发数（正弦波）
      const phase = (i / waveCount) * 2 * Math.PI;
      const currentConcurrency = Math.max(1, 
        Math.floor(concurrency * (0.5 + 0.5 * Math.sin(phase)))
      );
      
      console.log(`波浪 ${i + 1}/${waveCount}: ${currentConcurrency} 并发`);
      
      await this.runLoadPhase({
        ...config,
        concurrency: currentConcurrency,
        duration: waveDuration
      }, onProgress);
    }
  }

  /**
   * 运行负载阶段
   */
  async runLoadPhase(config, onProgress) {
    const { duration, concurrency } = config;
    const endTime = Date.now() + (duration * 1000);
    
    const requestPromises = [];
    
    for (let i = 0; i < concurrency; i++) {
      const promise = this.continuousRequests(config, endTime, onProgress);
      requestPromises.push(promise);
    }
    
    await Promise.all(requestPromises);
  }

  /**
   * 持续发送请求
   */
  async continuousRequests(config, endTime, onProgress) {
    const { url, method, headers, data, delay = 0 } = config;
    
    while (Date.now() < endTime && !this.shouldStop) {
      try {
        const requestId = this.generateRequestId();
        this.activeRequests.add(requestId);
        
        const startTime = Date.now();
        
        // 发送请求
        const response = await this.sendRequest({
          url,
          method,
          headers,
          data,
          timeout: this.options.timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        // 更新统计信息
        this.updateStats(response, responseTime);
        
        this.activeRequests.delete(requestId);
        
        // 发送进度更新
        if (onProgress && this.stats.totalRequests % 10 === 0) {
          onProgress(this.getCurrentStats());
        }
        
        // 添加延迟
        if (delay > 0) {
          await this.sleep(delay);
        }
        
      } catch (error) {
        this.updateStats({ status: 0, statusText: error.message }, 0, error);
        
        // 短暂延迟后重试
        await this.sleep(100);
      }
    }
  }

  /**
   * 发送HTTP请求
   */
  async sendRequest(config) {
    const requestConfig = {
      method: config.method,
      url: config.url,
      headers: config.headers,
      data: config.data,
      timeout: config.timeout,
      validateStatus: () => true, // 接受所有状态码
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent
    };
    
    const response = await axios(requestConfig);
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      size: this.calculateResponseSize(response)
    };
  }

  /**
   * 更新统计信息
   */
  updateStats(response, responseTime, error = null) {
    this.stats.totalRequests++;
    
    if (error || response.status >= 400) {
      this.stats.failedRequests++;
      
      // 记录错误类型
      const errorType = error ? error.code || 'network_error' : `http_${response.status}`;
      this.stats.errorCounts.set(errorType, (this.stats.errorCounts.get(errorType) || 0) + 1);
    } else {
      this.stats.successfulRequests++;
    }
    
    // 记录状态码
    const statusCode = response.status || 0;
    this.stats.statusCodes.set(statusCode, (this.stats.statusCodes.get(statusCode) || 0) + 1);
    
    // 更新响应时间统计
    if (responseTime > 0) {
      this.stats.totalResponseTime += responseTime;
      this.stats.minResponseTime = Math.min(this.stats.minResponseTime, responseTime);
      this.stats.maxResponseTime = Math.max(this.stats.maxResponseTime, responseTime);
      this.stats.responseTimes.push(responseTime);
      
      // 保持响应时间数组大小在合理范围内
      if (this.stats.responseTimes.length > 10000) {
        this.stats.responseTimes = this.stats.responseTimes.slice(-5000);
      }
    }
    
    // 计算吞吐量
    if (this.stats.startTime) {
      const elapsedSeconds = (Date.now() - this.stats.startTime) / 1000;
      this.stats.throughput = this.stats.totalRequests / elapsedSeconds;
    }
  }

  /**
   * 获取当前统计信息
   */
  getCurrentStats() {
    const avgResponseTime = this.stats.totalRequests > 0 ? 
      this.stats.totalResponseTime / this.stats.totalRequests : 0;
    
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0;
    
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: this.stats.minResponseTime === Infinity ? 0 : this.stats.minResponseTime,
      maxResponseTime: this.stats.maxResponseTime,
      throughput: Math.round(this.stats.throughput * 100) / 100,
      activeRequests: this.activeRequests.size,
      elapsedTime: this.stats.startTime ? Date.now() - this.stats.startTime : 0
    };
  }

  /**
   * 获取最终结果
   */
  getResults() {
    const currentStats = this.getCurrentStats();
    
    // 计算百分位数
    const sortedTimes = [...this.stats.responseTimes].sort((a, b) => a - b);
    const percentiles = this.calculatePercentiles(sortedTimes);
    
    return {
      ...currentStats,
      percentiles,
      errorBreakdown: Object.fromEntries(this.stats.errorCounts),
      statusCodeBreakdown: Object.fromEntries(this.stats.statusCodes),
      duration: this.stats.endTime ? this.stats.endTime - this.stats.startTime : 0,
      responseTimes: sortedTimes.slice(-1000) // 返回最后1000个响应时间用于图表
    };
  }

  /**
   * 计算百分位数
   */
  calculatePercentiles(sortedTimes) {
    if (sortedTimes.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const getPercentile = (p) => {
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      return sortedTimes[Math.max(0, index)];
    };
    
    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  /**
   * 停止负载测试
   */
  stop() {
    console.log('🛑 停止负载测试...');
    this.shouldStop = true;
  }

  /**
   * 计算响应大小
   */
  calculateResponseSize(response) {
    let size = 0;
    
    // 计算头部大小
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        size += Buffer.byteLength(`${key}: ${value}/r/n`, 'utf8');
      });
    }
    
    // 计算响应体大小
    if (response.data) {
      if (typeof response.data === 'string') {
        size += Buffer.byteLength(response.data, 'utf8');
      } else if (typeof response.data === 'object') {
        size += Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      }
    }
    
    return size;
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stop();
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

module.exports = LoadGenerator;
