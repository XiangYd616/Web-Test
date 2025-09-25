/**
 * 🌐 HTTP测试核心服务
 * 统一所有HTTP相关测试功能，消除重复代码
 * 支持API测试、压力测试、网络测试等
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class HTTPTestCore {
  constructor() {
    this.name = 'http-core';
    this.activeRequests = new Map();
    this.requestHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * 测试API端点 - 统一实现
   * 消除在API测试、压力测试等工具中的重复实现
   */
  async testAPIEndpoints(endpoints, config = {}) {
    
    const results = [];
    const concurrency = config.concurrency || 5;
    
    // 分批并发测试
    for (let i = 0; i < endpoints.length; i += concurrency) {
      const batch = endpoints.slice(i, i + concurrency);
      const batchPromises = batch.map(endpoint => this.testSingleEndpoint(endpoint, config));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            endpoint: batch[index],
            success: false,
            error: result.reason.message,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // 添加延迟避免过载
      if (i + concurrency < endpoints.length) {
        await this.sleep(100);
      }
    }
    
    return {
      totalEndpoints: endpoints.length,
      successfulEndpoints: results.filter(r => r.success).length,
      failedEndpoints: results.filter(r => !r.success).length,
      averageResponseTime: this.calculateAverageResponseTime(results),
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 测试单个端点
   */
  async testSingleEndpoint(endpoint, config = {}) {
    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // 构建请求配置
      const requestConfig = this.buildRequestConfig(endpoint, config);
      
      // 记录请求开始
      this.activeRequests.set(requestId, {
        endpoint,
        startTime,
        status: 'pending'
      });
      
      // 执行请求
      const response = await axios(requestConfig);
      const responseTime = performance.now() - startTime;
      
      // 验证响应
      const validation = this.validateResponse(response, endpoint);
      
      const result = {
        endpoint: endpoint.path || endpoint.url,
        method: endpoint.method || 'GET',
        success: validation.isValid,
        statusCode: response.status,
        responseTime: Math.round(responseTime),
        responseSize: this.getResponseSize(response),
        headers: response.headers,
        validation,
        timestamp: new Date().toISOString()
      };
      
      // 记录到历史
      this.addToHistory(requestId, result);
      this.activeRequests.delete(requestId);
      
      return result;
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      const result = {
        endpoint: endpoint.path || endpoint.url,
        method: endpoint.method || 'GET',
        success: false,
        statusCode: error.response?.status || 0,
        responseTime: Math.round(responseTime),
        error: error.message,
        validation: { isValid: false, errors: [error.message] },
        timestamp: new Date().toISOString()
      };
      
      this.addToHistory(requestId, result);
      this.activeRequests.delete(requestId);
      
      return result;
    }
  }

  /**
   * API性能测试 - 统一实现
   */
  async testAPIPerformance(endpoints, config = {}) {
    
    const performanceResults = [];
    const iterations = config.iterations || 10;
    
    for (const endpoint of endpoints) {
      
      const endpointResults = [];
      
      // 多次测试获取平均性能
      for (let i = 0; i < iterations; i++) {
        const result = await this.testSingleEndpoint(endpoint, config);
        endpointResults.push(result);
        
        // 短暂延迟
        await this.sleep(50);
      }
      
      // 计算性能指标
      const performanceMetrics = this.calculatePerformanceMetrics(endpointResults);
      
      performanceResults.push({
        endpoint: endpoint.path || endpoint.url,
        method: endpoint.method || 'GET',
        iterations,
        metrics: performanceMetrics,
        results: endpointResults
      });
    }
    
    return {
      totalEndpoints: endpoints.length,
      iterations,
      results: performanceResults,
      summary: this.generatePerformanceSummary(performanceResults),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * API安全测试 - 统一实现
   */
  async testAPISecurity(endpoints, config = {}) {
    
    const securityResults = [];
    
    for (const endpoint of endpoints) {
      
      const securityChecks = await Promise.allSettled([
        this.checkAuthenticationSecurity(endpoint, config),
        this.checkInputValidation(endpoint, config),
        this.checkRateLimiting(endpoint, config),
        this.checkHTTPSRedirection(endpoint, config),
        this.checkSecurityHeaders(endpoint, config)
      ]);
      
      const checks = securityChecks.map((result, index) => ({
        name: ['authentication', 'input_validation', 'rate_limiting', 'https_redirection', 'security_headers'][index],
        status: result.status,
        result: result.status === 'fulfilled' ? result.value : { error: result.reason.message }
      }));
      
      securityResults.push({
        endpoint: endpoint.path || endpoint.url,
        method: endpoint.method || 'GET',
        checks,
        overallScore: this.calculateSecurityScore(checks),
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      totalEndpoints: endpoints.length,
      results: securityResults,
      summary: this.generateSecuritySummary(securityResults),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 压力测试 - 统一实现
   */
  async executeStressTest(url, config = {}) {
    
    const {
      users = 10,
      duration = 60,
      rampUpTime = 10,
      requestsPerSecond = null
    } = config;
    
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimeStats: [],
      errorStats: {},
      startTime: Date.now()
    };
    
    const endTime = Date.now() + (duration * 1000);
    const rampUpEndTime = Date.now() + (rampUpTime * 1000);
    
    // 压力测试主循环
    while (Date.now() < endTime) {
      const currentTime = Date.now();
      
      // 计算当前并发用户数（渐进增加）
      let currentUsers = users;
      if (currentTime < rampUpEndTime) {
        const rampUpProgress = (currentTime - results.startTime) / (rampUpTime * 1000);
        currentUsers = Math.ceil(users * rampUpProgress);
      }
      
      // 创建并发请求
      const requests = [];
      for (let i = 0; i < currentUsers; i++) {
        requests.push(this.executeStressRequest(url, config, results));
      }
      
      // 等待当前批次完成
      await Promise.allSettled(requests);
      
      // 控制请求频率
      if (requestsPerSecond) {
        const delayMs = Math.max(0, 1000 - (1000 / requestsPerSecond));
        await this.sleep(delayMs);
      } else {
        await this.sleep(10); // 默认短暂延迟
      }
    }
    
    // 计算最终统计
    results.duration = Date.now() - results.startTime;
    results.requestsPerSecond = (results.totalRequests / (results.duration / 1000)).toFixed(2);
    results.averageResponseTime = this.calculateAverage(results.responseTimeStats);
    results.errorRate = ((results.failedRequests / results.totalRequests) * 100).toFixed(2);
    
    return results;
  }

  /**
   * 执行单个压力测试请求
   */
  async executeStressRequest(url, config, results) {
    const startTime = performance.now();
    
    try {
      const response = await axios.get(url, {
        timeout: config.timeout || 10000,
        validateStatus: () => true
      });
      
      const responseTime = performance.now() - startTime;
      
      results.totalRequests++;
      
      /**
      
       * if功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      results.responseTimeStats.push(responseTime);
      
      if (response.status >= 200 && response.status < 400) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        const errorKey = `status_${response.status}`;
        results.errorStats[errorKey] = (results.errorStats[errorKey] || 0) + 1;
      }
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      results.totalRequests++;
      results.failedRequests++;
      results.responseTimeStats.push(responseTime);
      
      const errorKey = error.code || 'unknown_error';
      results.errorStats[errorKey] = (results.errorStats[errorKey] || 0) + 1;
    }
  }

  /**
   * 构建请求配置
   */
  buildRequestConfig(endpoint, config) {
    const requestConfig = {
      method: endpoint.method || 'GET',
      url: endpoint.url || `${config.baseUrl}${endpoint.path}`,
      timeout: config.timeout || 10000,
      /**
       * 分析validateStatus数据
       * @param {Object} options - 分析选项
       * @returns {Promise<Object>} 分析结果
       */
      headers: { ...config.headers, ...endpoint.headers },
      validateStatus: () => true
    };
    
    // 添加认证
    if (config.authentication) {
      this.addAuthentication(requestConfig, config.authentication);
    }
    
    // 添加请求体
    if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(requestConfig.method)) {
      requestConfig.data = endpoint.body;
    }
    
    // 添加查询参数
    if (endpoint.params) {
      requestConfig.params = endpoint.params;
    }
    
    return requestConfig;
  }

  /**
   * 添加认证信息
   */
  addAuthentication(requestConfig, auth) {
    switch (auth.type) {
      case 'bearer':
        requestConfig.headers.Authorization = `Bearer ${auth.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        requestConfig.headers.Authorization = `Basic ${credentials}`;
        break;
      case 'apikey':
        requestConfig.headers[auth.headerName || 'X-API-Key'] = auth.apiKey;
        break;
    }
  }

  /**
   * 验证响应
   */
  validateResponse(response, endpoint) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // 状态码验证
    const expectedStatus = endpoint.expectedStatus || [200];
    if (!expectedStatus.includes(response.status)) {
      validation.isValid = false;
      validation.errors.push(`期望状态码 ${expectedStatus.join('/')}, 实际 ${response.status}`);
    }
    
    // 响应时间验证
    if (endpoint.maxResponseTime && response.responseTime > endpoint.maxResponseTime) {
      validation.warnings.push(`响应时间 ${response.responseTime}ms 超过期望 ${endpoint.maxResponseTime}ms`);
    }
    
    // 内容类型验证
    if (endpoint.expectedContentType) {
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes(endpoint.expectedContentType)) {
        validation.warnings.push(`期望内容类型 ${endpoint.expectedContentType}, 实际 ${contentType}`);
      }
    }
    
    return validation;
  }

  /**
   * 获取响应大小
   */
  getResponseSize(response) {
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength);
    }
    
    if (response.data) {
      return JSON.stringify(response.data).length;
    }
    
    return 0;
  }

  /**
   * 计算平均响应时间
   */
  calculateAverageResponseTime(results) {
    const validResults = results.filter(r => r.success && r.responseTime);
    if (validResults.length === 0) return 0;
    
    const total = validResults.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(total / validResults.length);
  }

  /**
   * 计算性能指标
   */
  calculatePerformanceMetrics(results) {
    const responseTimes = results.map(r => r.responseTime).filter(t => t > 0);
    
    if (responseTimes.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }
    
    responseTimes.sort((a, b) => a - b);
    
    return {
      average: Math.round(this.calculateAverage(responseTimes)),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      median: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99)
    };
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 计算平均值
   */
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * 生成性能摘要
   */
  generatePerformanceSummary(results) {
    const allResponseTimes = results.flatMap(r => r.results.map(res => res.responseTime));
    
    return {
      totalEndpoints: results.length,
      averageResponseTime: Math.round(this.calculateAverage(allResponseTimes)),
      fastestEndpoint: results.reduce((fastest, current) => 
        current.metrics.average < fastest.metrics.average ? current : fastest
      ),
      slowestEndpoint: results.reduce((slowest, current) => 
        current.metrics.average > slowest.metrics.average ? current : slowest
      )
    };
  }

  /**
   * 检查认证安全
   */
  async checkAuthenticationSecurity(endpoint, config) {
    // 尝试无认证访问
    try {
      const response = await axios({
        method: endpoint.method || 'GET',
        url: endpoint.url || `${config.baseUrl}${endpoint.path}`,
        timeout: 5000,
        validateStatus: () => true
      });
      
      return {
        hasAuthentication: response.status === 401 || response.status === 403,
        status: response.status,
        secure: response.status === 401 || response.status === 403
      };
    } catch (error) {
      return {
        hasAuthentication: false,
        error: error.message,
        secure: false
      };
    }
  }

  /**
   * 检查输入验证
   */
  async checkInputValidation(endpoint, config) {
    // 测试恶意输入
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      "' OR '1'='1",
      '../../../etc/passwd'
    ];
    
    const results = [];
    
    for (const input of maliciousInputs) {
      try {
        const response = await axios({
          method: endpoint.method || 'GET',
          url: endpoint.url || `${config.baseUrl}${endpoint.path}`,
          params: { test: input },
          timeout: 5000,
          validateStatus: () => true
        });
        
        results.push({
          input,
          reflected: response.data && response.data.includes(input),
          status: response.status
        });
      } catch (error) {
        results.push({
          input,
          error: error.message
        });
      }
    }
    
    return {
      tests: results,
      vulnerable: results.some(r => r.reflected),
      secure: !results.some(r => r.reflected)
    };
  }

  /**
   * 检查速率限制
   */
  async checkRateLimiting(endpoint, config) {
    const requests = [];
    const requestCount = 20;
    
    // 快速发送多个请求
    for (let i = 0; i < requestCount; i++) {
      requests.push(axios({
        method: endpoint.method || 'GET',
        url: endpoint.url || `${config.baseUrl}${endpoint.path}`,
        timeout: 5000,
        validateStatus: () => true
      }));
    }
    
    try {
      const responses = await Promise.allSettled(requests);
      const statusCodes = responses.map(r => 
        r.status === 'fulfilled' ? r.value.status : 0
      );
      
      const rateLimited = statusCodes.some(status => status === 429);
      
      return {
        requestCount,
        rateLimited,
        statusCodes,
        secure: rateLimited
      };
    } catch (error) {
      return {
        error: error.message,
        secure: false
      };
    }
  }

  /**
   * 检查HTTPS重定向
   */
  async checkHTTPSRedirection(endpoint, config) {
    try {
      const httpUrl = (endpoint.url || `${config.baseUrl}${endpoint.path}`).replace('https://', 'http://');
      
      const response = await axios.get(httpUrl, {
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: () => true
      });
      
      const redirectsToHTTPS = response.status >= 300 && response.status < 400 &&
        response.headers.location && response.headers.location.startsWith('https://');
      
      return {
        redirectsToHTTPS,
        status: response.status,
        location: response.headers.location,
        secure: redirectsToHTTPS
      };
    } catch (error) {
      return {
        error: error.message,
        secure: false
      };
    }
  }

  /**
   * 检查安全头
   */
  async checkSecurityHeaders(endpoint, config) {
    try {
      const response = await axios({
        method: endpoint.method || 'GET',
        url: endpoint.url || `${config.baseUrl}${endpoint.path}`,
        timeout: 5000,
        validateStatus: () => true
      });
      
      const securityHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options'
      ];
      
      const presentHeaders = securityHeaders.filter(header => response.headers[header]);
      
      return {
        totalHeaders: securityHeaders.length,
        presentHeaders: presentHeaders.length,
        headers: presentHeaders,
        score: (presentHeaders.length / securityHeaders.length) * 100,
        secure: presentHeaders.length >= securityHeaders.length / 2
      };
    } catch (error) {
      return {
        error: error.message,
        secure: false
      };
    }
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(checks) {
    const secureChecks = checks.filter(check => 
      check.result && check.result.secure
    ).length;
    
    return Math.round((secureChecks / checks.length) * 100);
  }

  /**
   * 生成安全摘要
   */
  generateSecuritySummary(results) {
    const totalChecks = results.reduce((sum, r) => sum + r.checks.length, 0);
    const secureChecks = results.reduce((sum, r) => 
      sum + r.checks.filter(c => c.result && c.result.secure).length, 0
    );
    
    return {
      totalEndpoints: results.length,
      totalChecks,
      secureChecks,
      securityScore: Math.round((secureChecks / totalChecks) * 100),
      averageEndpointScore: Math.round(
        results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
      )
    };
  }

  /**
   * 添加到历史记录
   */
  addToHistory(requestId, result) {
    this.requestHistory.push({
      requestId,
      ...result
    });
    
    // 限制历史记录大小
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(limit = 100) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * 获取活跃请求
   */
  getActiveRequests() {
    return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
      id,
      ...request,
      duration: performance.now() - request.startTime
    }));
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
    this.activeRequests.clear();
    this.requestHistory = [];
  }
}

module.exports = HTTPTestCore;
