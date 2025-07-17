const axios = require('axios');
const https = require('https');

/**
 * 真实的API测试引擎
 */
class RealAPITestEngine {
  constructor() {
    this.name = 'api';
    this.version = '1.0.0';
    this.isAvailable = true;
    this.activeTests = new Map();
  }

  /**
   * 检查API测试引擎是否可用
   */
  async checkAvailability() {
    return true; // API测试引擎总是可用的
  }

  /**
   * 运行API测试
   */
  async runAPITest(config) {
    const {
      baseUrl,
      endpoints = [],
      timeout = 10000,
      retries = 3,
      validateSchema = false,
      loadTest = false,
      testSecurity = false,
      testPerformance = true,
      testReliability = false,
      concurrentUsers = 1,
      headers = {},
      auth = null
    } = config;

    console.log(`🔌 Starting API test: ${baseUrl}`);
    console.log(`📊 Testing ${endpoints.length} endpoints`);

    const testId = Date.now().toString();
    const startTime = Date.now();

    const results = {
      testId,
      baseUrl,
      startTime: new Date(startTime).toISOString(),
      endTime: null,
      totalTests: endpoints.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      endpoints: [],
      securityIssues: [],
      performanceMetrics: {
        totalRequests: 0,
        successRate: 0,
        errorRate: 0,
        throughput: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      },
      overallScore: 0
    };

    this.activeTests.set(testId, { config, results, status: 'running' });

    try {
      // 创建axios实例
      const apiClient = this.createAPIClient(baseUrl, timeout, headers, auth);

      // 测试每个端点
      for (const endpoint of endpoints) {
        console.log(`🎯 Testing endpoint: ${endpoint.method || 'GET'} ${endpoint.path}`);

        const endpointResult = await this.testEndpoint(apiClient, endpoint, {
          retries,
          validateSchema,
          testSecurity,
          testPerformance,
          loadTest,
          concurrentUsers
        });

        results.endpoints.push(endpointResult);
        results.totalResponseTime += endpointResult.responseTime;

        if (endpointResult.status === 'pass') {
          results.passedTests++;
        } else if (endpointResult.status === 'skip') {
          results.skippedTests++;
        } else {
          results.failedTests++;
        }

        // 收集安全问题
        if (endpointResult.securityIssues) {
          results.securityIssues.push(...endpointResult.securityIssues);
        }
      }

      // 计算平均响应时间
      results.averageResponseTime = results.totalResponseTime / endpoints.length;

      // 执行负载测试
      if (loadTest && concurrentUsers > 1) {
        console.log(`⚡ Running load test with ${concurrentUsers} concurrent users`);
        const loadTestResults = await this.runLoadTest(apiClient, endpoints, concurrentUsers);
        results.performanceMetrics = { ...results.performanceMetrics, ...loadTestResults };
      }

      // 计算性能指标
      this.calculatePerformanceMetrics(results);

      // 计算总体分数
      results.overallScore = this.calculateOverallScore(results);

      results.endTime = new Date().toISOString();
      results.duration = Date.now() - startTime;

      this.activeTests.set(testId, { config, results, status: 'completed' });

      console.log(`✅ API test completed. Score: ${results.overallScore}/100`);
      return results;

    } catch (error) {
      console.error('❌ API test failed:', error);
      results.endTime = new Date().toISOString();
      results.error = error.message;
      this.activeTests.set(testId, { config, results, status: 'failed' });
      throw error;
    }
  }

  /**
   * 创建API客户端
   */
  createAPIClient(baseUrl, timeout, headers, auth) {
    const config = {
      baseURL: baseUrl,
      timeout,
      headers: {
        'User-Agent': 'TestWebApp-API/1.0',
        'Accept': 'application/json',
        ...headers
      },
      validateStatus: () => true, // 不抛出状态码错误
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // 允许自签名证书
      })
    };

    if (auth) {
      if (auth.type === 'bearer') {
        config.headers.Authorization = `Bearer ${auth.token}`;
      } else if (auth.type === 'basic') {
        config.auth = {
          username: auth.username,
          password: auth.password
        };
      } else if (auth.type === 'apikey') {
        config.headers[auth.header || 'X-API-Key'] = auth.key;
      }
    }

    return axios.create(config);
  }

  /**
   * 测试单个端点
   */
  async testEndpoint(apiClient, endpoint, options) {
    const { retries, validateSchema, testSecurity, testPerformance } = options;
    const startTime = performance.now();

    const result = {
      id: endpoint.id || `endpoint-${Date.now()}`,
      name: endpoint.name || endpoint.path,
      method: endpoint.method || 'GET',
      path: endpoint.path,
      status: 'fail',
      statusCode: 0,
      responseTime: 0,
      responseSize: 0,
      headers: {},
      securityIssues: [],
      performanceIssues: [],
      validationErrors: [],
      retryCount: 0
    };

    let lastError = null;

    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await apiClient({
          method: endpoint.method || 'GET',
          url: endpoint.path,
          data: endpoint.body,
          params: endpoint.params,
          headers: endpoint.headers
        });

        const responseTime = performance.now() - startTime;

        result.statusCode = response.status;
        result.responseTime = Math.round(responseTime);
        result.responseSize = JSON.stringify(response.data).length;
        result.headers = response.headers;
        result.retryCount = attempt;

        // 检查状态码
        const expectedStatus = endpoint.expectedStatus || [200, 201, 202, 204];
        const isStatusValid = Array.isArray(expectedStatus)
          ? expectedStatus.includes(response.status)
          : response.status === expectedStatus;

        if (isStatusValid) {
          result.status = 'pass';
        } else {
          result.status = 'fail';
          result.error = `Unexpected status code: ${response.status}`;
        }

        // 验证响应模式
        if (validateSchema && endpoint.responseSchema) {
          const validationErrors = this.validateResponseSchema(response.data, endpoint.responseSchema);
          result.validationErrors = validationErrors;
          if (validationErrors.length > 0) {
            result.status = 'fail';
          }
        }

        // 安全检查
        if (testSecurity) {
          result.securityIssues = this.performSecurityChecks(response, endpoint);
        }

        // 性能检查
        if (testPerformance) {
          result.performanceIssues = this.performPerformanceChecks(responseTime, result.responseSize);
        }

        break; // 成功，退出重试循环

      } catch (error) {
        lastError = error;
        result.retryCount = attempt;

        if (attempt === retries) {
          // 最后一次重试失败
          result.status = 'fail';
          result.error = error.message;
          result.responseTime = Math.round(performance.now() - startTime);
        } else {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    return result;
  }

  /**
   * 运行负载测试
   */
  async runLoadTest(apiClient, endpoints, concurrentUsers) {
    const duration = 30000; // 30秒
    const startTime = Date.now();
    const endTime = startTime + duration;

    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: []
    };

    const workers = [];

    // 创建并发用户
    for (let i = 0; i < concurrentUsers; i++) {
      const worker = this.createLoadTestWorker(apiClient, endpoints, endTime, results);
      workers.push(worker);
    }

    // 等待所有工作者完成
    await Promise.all(workers);

    // 计算统计数据
    const sortedTimes = results.responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      totalRequests: results.totalRequests,
      successRate: (results.successfulRequests / results.totalRequests) * 100,
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      throughput: results.totalRequests / (duration / 1000),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0
    };
  }

  /**
   * 创建负载测试工作者
   */
  async createLoadTestWorker(apiClient, endpoints, endTime, results) {
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const startTime = performance.now();

      try {
        const response = await apiClient({
          method: endpoint.method || 'GET',
          url: endpoint.path,
          data: endpoint.body,
          params: endpoint.params
        });

        const responseTime = performance.now() - startTime;
        results.responseTimes.push(responseTime);
        results.totalRequests++;

        if (response.status >= 200 && response.status < 400) {
          results.successfulRequests++;
        } else {
          results.failedRequests++;
        }

      } catch (error) {
        results.totalRequests++;
        results.failedRequests++;
        results.responseTimes.push(performance.now() - startTime);
      }

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 验证响应模式
   */
  validateResponseSchema(data, schema) {
    // 简单的模式验证实现
    const errors = [];

    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push('Response should be an object');
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return errors;
  }

  /**
   * 执行安全检查
   */
  performSecurityChecks(response, endpoint) {
    const issues = [];

    // 检查敏感信息泄露
    const responseText = JSON.stringify(response.data).toLowerCase();
    const sensitivePatterns = ['password', 'secret', 'token', 'key', 'private'];

    for (const pattern of sensitivePatterns) {
      if (responseText.includes(pattern)) {
        issues.push({
          type: 'sensitive_data_exposure',
          severity: 'medium',
          description: `Potential sensitive data exposure: ${pattern}`
        });
      }
    }

    // 检查安全头
    const headers = response.headers;
    if (!headers['x-content-type-options']) {
      issues.push({
        type: 'missing_security_header',
        severity: 'low',
        description: 'Missing X-Content-Type-Options header'
      });
    }

    return issues;
  }

  /**
   * 执行性能检查 - 使用统一的性能评估标准
   */
  performPerformanceChecks(responseTime, responseSize) {
    const issues = [];

    // 使用统一的性能阈值标准
    if (responseTime > 3000) {
      issues.push({
        type: 'slow_response',
        severity: 'critical',
        description: `API响应时间 ${responseTime}ms 严重超标 (>3000ms)`
      });
    } else if (responseTime > 2000) {
      issues.push({
        type: 'slow_response',
        severity: 'high',
        description: `API响应时间 ${responseTime}ms 超过推荐值 (>2000ms)`
      });
    } else if (responseTime > 1000) {
      issues.push({
        type: 'slow_response',
        severity: 'medium',
        description: `API响应时间 ${responseTime}ms 需要优化 (>1000ms)`
      });
    }

    // 统一的响应大小检查
    if (responseSize > 5 * 1024 * 1024) { // 5MB
      issues.push({
        type: 'large_response',
        severity: 'high',
        description: `API响应大小 ${Math.round(responseSize / 1024 / 1024)}MB 过大，影响性能`
      });
    } else if (responseSize > 1024 * 1024) { // 1MB
      issues.push({
        type: 'large_response',
        severity: 'medium',
        description: `API响应大小 ${Math.round(responseSize / 1024)}KB 较大，建议优化`
      });
    }

    return issues;
  }

  /**
   * 计算性能指标
   */
  calculatePerformanceMetrics(results) {
    const responseTimes = results.endpoints.map(e => e.responseTime);
    responseTimes.sort((a, b) => a - b);

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    results.performanceMetrics.p95ResponseTime = responseTimes[p95Index] || 0;
    results.performanceMetrics.p99ResponseTime = responseTimes[p99Index] || 0;
    results.performanceMetrics.successRate = (results.passedTests / results.totalTests) * 100;
    results.performanceMetrics.errorRate = (results.failedTests / results.totalTests) * 100;
  }

  /**
   * 计算总体分数
   */
  calculateOverallScore(results) {
    let score = 100;

    // 成功率评分 (40%)
    const successRate = (results.passedTests / results.totalTests) * 100;
    if (successRate < 50) score -= 40;
    else if (successRate < 80) score -= 20;
    else if (successRate < 95) score -= 10;

    // 响应时间评分 (30%)
    if (results.averageResponseTime > 2000) score -= 30;
    else if (results.averageResponseTime > 1000) score -= 15;
    else if (results.averageResponseTime > 500) score -= 5;

    // 安全问题评分 (20%)
    const highSecurityIssues = results.securityIssues.filter(i => i.severity === 'high').length;
    const mediumSecurityIssues = results.securityIssues.filter(i => i.severity === 'medium').length;
    score -= (highSecurityIssues * 10) + (mediumSecurityIssues * 5);

    // 性能问题评分 (10%)
    const performanceIssues = results.endpoints.reduce((acc, e) => acc + e.performanceIssues.length, 0);
    score -= Math.min(performanceIssues * 2, 10);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'cancelled';
      this.activeTests.set(testId, test);
      return true;
    }
    return false;
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    const test = this.activeTests.get(testId);
    return test ? test.status : 'not_found';
  }
}

module.exports = { RealAPITestEngine };
