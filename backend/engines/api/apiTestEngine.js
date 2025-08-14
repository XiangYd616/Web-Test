const axios = require('axios');
const https = require('https');
const webSocketService = require('../../services/WebSocketService');

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
  async runAPITest(config, testId = null) {
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
      generateDocumentation = false,
      concurrentUsers = 1,
      headers = {},
      auth = null,
      testEnvironment = 'development'
    } = config;

    console.log(`🔌 Starting API test: ${baseUrl}`);
    console.log(`📊 Testing ${endpoints.length} endpoints`);

    const actualTestId = testId || Date.now().toString();
    const startTime = Date.now();

    // 发送测试开始通知
    if (testId) {
      webSocketService.broadcastTestStatusUpdate(testId, 'running', 0, '开始API测试...');
    }

    const results = {
      testId: actualTestId,
      baseUrl,
      testEnvironment,
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
        p99ResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimeDistribution: {
          fast: 0,    // < 200ms
          medium: 0,  // 200-1000ms
          slow: 0     // > 1000ms
        },
        statusCodeDistribution: {},
        errorTypes: {}
      },
      reliabilityMetrics: {
        uptime: 100,
        errorRate: 0,
        retryCount: 0,
        timeouts: 0,
        consecutiveFailures: 0
      },
      documentation: generateDocumentation ? {
        endpoints: [],
        schemas: {},
        examples: {},
        generatedAt: new Date().toISOString()
      } : null,
      recommendations: [],
      overallScore: 0,
      testSummary: {
        duration: 0,
        testConfig: {
          timeout,
          retries,
          validateSchema,
          testSecurity,
          testPerformance,
          testReliability,
          generateDocumentation,
          concurrentUsers
        }
      }
    };

    this.activeTests.set(testId, { config, results, status: 'running' });

    try {
      // 创建axios实例
      const apiClient = this.createAPIClient(baseUrl, timeout, headers, auth);

      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`🎯 Testing endpoint: ${endpoint.method || 'GET'} ${endpoint.path}`);

        // 发送进度更新
        if (testId) {
          const progress = Math.round((i / endpoints.length) * 100);
          webSocketService.broadcastTestProgress(
            testId,
            progress,
            i + 1,
            endpoints.length,
            `测试端点: ${endpoint.method || 'GET'} ${endpoint.path}`
          );
        }

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
      results.success = true;

      this.activeTests.set(actualTestId, { config, results, status: 'completed' });

      // 发送测试完成通知
      if (testId) {
        webSocketService.broadcastTestCompleted(testId, results, true);
        webSocketService.broadcastTestStatusUpdate(testId, 'completed', 100, '测试完成');
      }

      console.log(`✅ API test completed. Score: ${results.overallScore}/100`);
      return results;

    } catch (error) {
      console.error('❌ API test failed:', error);
      results.endTime = new Date().toISOString();
      results.error = error.message;
      results.success = false;
      this.activeTests.set(actualTestId, { config, results, status: 'failed' });

      // 发送测试错误通知
      if (testId) {
        webSocketService.broadcastTestError(testId, error, 'API_TEST_FAILED');
        webSocketService.broadcastTestStatusUpdate(testId, 'failed', 100, `测试失败: ${error.message}`);
      }

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
   * 增强的端点测试
   */
  async testEndpoint(apiClient, endpoint, options) {
    const { retries, validateSchema, testSecurity, testPerformance, concurrentUsers } = options;
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
      retryCount: 0,
      // 新增字段
      responseData: null,
      requestDetails: {
        url: '',
        headers: {},
        body: null,
        timestamp: new Date().toISOString()
      },
      performanceMetrics: {
        dnsLookup: 0,
        tcpConnection: 0,
        tlsHandshake: 0,
        firstByte: 0,
        contentTransfer: 0
      },
      cacheInfo: {
        cacheable: false,
        cacheHeaders: [],
        etag: null,
        lastModified: null
      },
      compressionInfo: {
        compressed: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0
      }
    };

    let lastError = null;

    // 增强的重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 记录请求详情
        result.requestDetails = {
          url: `${apiClient.defaults.baseURL}${endpoint.path}`,
          method: endpoint.method || 'GET',
          headers: { ...apiClient.defaults.headers, ...endpoint.headers },
          body: endpoint.body,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1
        };

        const requestStartTime = performance.now();
        const response = await apiClient({
          method: endpoint.method || 'GET',
          url: endpoint.path,
          data: endpoint.body,
          params: endpoint.params,
          headers: endpoint.headers,
          // 添加性能监控
          onUploadProgress: (progressEvent) => {
            // 上传进度监控
          },
          onDownloadProgress: (progressEvent) => {
            // 下载进度监控
          }
        });

        const responseTime = performance.now() - requestStartTime;

        // 基础响应信息
        result.statusCode = response.status;
        result.responseTime = Math.round(responseTime);
        result.headers = response.headers;
        result.retryCount = attempt;
        result.responseData = response.data;

        // 计算响应大小
        const responseText = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
        result.responseSize = new Blob([responseText]).size;

        // 分析缓存信息
        this.analyzeCacheInfo(response.headers, result);

        // 分析压缩信息
        this.analyzeCompressionInfo(response.headers, result);

        // 检查状态码
        const expectedStatus = endpoint.expectedStatus || [200, 201, 202, 204];
        const isStatusValid = Array.isArray(expectedStatus)
          ? expectedStatus.includes(response.status)
          : response.status === expectedStatus;

        if (isStatusValid) {
          result.status = 'pass';
        } else {
          result.status = 'fail';
          result.error = `Unexpected status code: ${response.status}, expected: ${JSON.stringify(expectedStatus)}`;
        }

        // 验证响应模式
        if (validateSchema && endpoint.responseSchema) {
          const validationErrors = this.validateResponseSchema(response.data, endpoint.responseSchema);
          result.validationErrors = validationErrors;
          if (validationErrors.length > 0) {
            result.status = 'fail';
          }
        }

        // 增强的安全检查
        if (testSecurity) {
          this.performSecurityChecks(response, result);
        }

        // 增强的性能分析
        if (testPerformance) {
          this.analyzePerformanceMetrics(result, endpoint);
        }

        // 添加响应数据分析
        result.responseAnalysis = {
          contentType: response.headers['content-type'] || 'unknown',
          hasData: !!response.data,
          dataType: typeof response.data,
          isJson: this.isJsonResponse(response),
          statusText: response.statusText || '',
          charset: this.extractCharset(response.headers['content-type']),
          language: response.headers['content-language'] || null
        };

        // 添加性能分类
        result.performanceCategory = this.categorizePerformance(result.responseTime);

        break; // 成功，退出重试循环

      } catch (error) {
        lastError = error;
        result.retryCount = attempt;

        if (attempt === retries) {
          // 最后一次重试失败
          result.status = 'fail';
          result.error = error.message;
          result.responseTime = Math.round(performance.now() - startTime);

          // 分析错误类型和添加诊断信息
          result.errorType = this.categorizeError(error);
          result.errorDiagnosis = this.diagnoseError(error, endpoint);
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

  /**
   * 检查是否为JSON响应
   */
  isJsonResponse(response) {
    const contentType = response.headers['content-type'] || '';
    return contentType.includes('application/json');
  }

  /**
   * 分析缓存头
   */
  analyzeCacheHeaders(headers) {
    return {
      cacheControl: headers['cache-control'] || null,
      expires: headers['expires'] || null,
      etag: headers['etag'] || null,
      lastModified: headers['last-modified'] || null,
      isCacheable: !!(headers['cache-control'] || headers['expires'])
    };
  }

  /**
   * 性能分类
   */
  categorizePerformance(responseTime) {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'fair';
    if (responseTime < 2000) return 'poor';
    return 'very-poor';
  }

  /**
   * 错误分类
   */
  categorizeError(error) {
    if (error.code === 'ECONNREFUSED') return 'connection-refused';
    if (error.code === 'ENOTFOUND') return 'dns-error';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    if (error.code === 'ECONNRESET') return 'connection-reset';
    if (error.response) {
      if (error.response.status >= 400 && error.response.status < 500) return 'client-error';
      if (error.response.status >= 500) return 'server-error';
    }
    return 'unknown-error';
  }

  /**
   * 错误诊断
   */
  diagnoseError(error, endpoint) {
    const diagnosis = {
      errorCode: error.code || 'unknown',
      suggestion: '',
      possibleCauses: [],
      troubleshooting: []
    };

    switch (this.categorizeError(error)) {
      case 'connection-refused':
        diagnosis.suggestion = '服务器拒绝连接，请检查服务是否运行';
        diagnosis.possibleCauses = ['服务未启动', '端口被占用', '防火墙阻止'];
        diagnosis.troubleshooting = ['检查服务状态', '验证端口配置', '检查网络连接'];
        break;
      case 'dns-error':
        diagnosis.suggestion = 'DNS解析失败，请检查域名是否正确';
        diagnosis.possibleCauses = ['域名不存在', 'DNS服务器问题', '网络连接问题'];
        diagnosis.troubleshooting = ['验证域名拼写', '尝试使用IP地址', '检查DNS设置'];
        break;
      case 'timeout':
        diagnosis.suggestion = '请求超时，请检查网络连接或增加超时时间';
        diagnosis.possibleCauses = ['网络延迟高', '服务器响应慢', '超时设置过短'];
        diagnosis.troubleshooting = ['增加超时时间', '检查网络质量', '优化服务器性能'];
        break;
      case 'client-error':
        diagnosis.suggestion = '客户端错误，请检查请求参数和认证信息';
        diagnosis.possibleCauses = ['参数错误', '认证失败', '权限不足'];
        diagnosis.troubleshooting = ['验证请求参数', '检查认证信息', '确认API权限'];
        break;
      case 'server-error':
        diagnosis.suggestion = '服务器内部错误，请联系API提供方';
        diagnosis.possibleCauses = ['服务器故障', '数据库问题', '代码错误'];
        diagnosis.troubleshooting = ['查看服务器日志', '联系技术支持', '稍后重试'];
        break;
      default:
        diagnosis.suggestion = '未知错误，请检查网络连接和API配置';
        diagnosis.possibleCauses = ['网络问题', '配置错误', '服务异常'];
        diagnosis.troubleshooting = ['检查网络连接', '验证配置', '查看错误日志'];
    }

    return diagnosis;
  }

  // ==================== 增强分析方法 ====================

  /**
   * 分析缓存信息
   */
  analyzeCacheInfo(headers, result) {
    const cacheControl = headers['cache-control'] || '';
    const etag = headers['etag'] || null;
    const lastModified = headers['last-modified'] || null;
    const expires = headers['expires'] || null;

    result.cacheInfo = {
      cacheable: !cacheControl.includes('no-cache') && !cacheControl.includes('no-store'),
      cacheHeaders: [],
      etag: etag,
      lastModified: lastModified,
      expires: expires,
      maxAge: null
    };

    // 提取缓存头
    if (cacheControl) result.cacheInfo.cacheHeaders.push(`Cache-Control: ${cacheControl}`);
    if (etag) result.cacheInfo.cacheHeaders.push(`ETag: ${etag}`);
    if (lastModified) result.cacheInfo.cacheHeaders.push(`Last-Modified: ${lastModified}`);
    if (expires) result.cacheInfo.cacheHeaders.push(`Expires: ${expires}`);

    // 提取max-age
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    if (maxAgeMatch) {
      result.cacheInfo.maxAge = parseInt(maxAgeMatch[1]);
    }
  }

  /**
   * 分析压缩信息
   */
  analyzeCompressionInfo(headers, result) {
    const contentEncoding = headers['content-encoding'] || '';
    const contentLength = headers['content-length'];

    result.compressionInfo = {
      compressed: !!contentEncoding,
      encoding: contentEncoding,
      originalSize: 0,
      compressedSize: contentLength ? parseInt(contentLength) : result.responseSize,
      compressionRatio: 0
    };

    if (contentEncoding) {
      // 估算压缩比（实际应用中需要更精确的计算）
      const estimatedOriginalSize = result.responseSize * 3; // 假设压缩比为3:1
      result.compressionInfo.originalSize = estimatedOriginalSize;
      result.compressionInfo.compressionRatio =
        ((estimatedOriginalSize - result.responseSize) / estimatedOriginalSize * 100).toFixed(1);
    }
  }

  /**
   * 增强的性能分析
   */
  analyzePerformanceMetrics(result, endpoint) {
    const { responseTime, responseSize } = result;

    // 性能阈值
    const thresholds = {
      excellent: 100,
      good: 300,
      acceptable: 1000,
      poor: 3000
    };

    // 响应时间分析
    let performanceLevel = 'poor';
    if (responseTime <= thresholds.excellent) {
      performanceLevel = 'excellent';
    } else if (responseTime <= thresholds.good) {
      performanceLevel = 'good';
    } else if (responseTime <= thresholds.acceptable) {
      performanceLevel = 'acceptable';
    }

    // 响应大小分析
    const sizeThresholds = {
      small: 1024,      // 1KB
      medium: 10240,    // 10KB
      large: 102400,    // 100KB
      huge: 1048576     // 1MB
    };

    let sizeCategory = 'huge';
    if (responseSize <= sizeThresholds.small) {
      sizeCategory = 'small';
    } else if (responseSize <= sizeThresholds.medium) {
      sizeCategory = 'medium';
    } else if (responseSize <= sizeThresholds.large) {
      sizeCategory = 'large';
    }

    // 生成性能建议
    const suggestions = [];

    if (responseTime > thresholds.good) {
      suggestions.push('考虑优化API响应时间');
    }

    if (responseSize > sizeThresholds.large) {
      suggestions.push('响应数据较大，考虑分页或数据压缩');
    }

    if (!result.cacheInfo.cacheable && endpoint.method === 'GET') {
      suggestions.push('GET请求建议添加缓存策略');
    }

    if (!result.compressionInfo.compressed && responseSize > sizeThresholds.medium) {
      suggestions.push('建议启用响应压缩（gzip/brotli）');
    }

    result.performanceAnalysis = {
      level: performanceLevel,
      sizeCategory: sizeCategory,
      suggestions: suggestions,
      score: this.calculatePerformanceScore(responseTime, responseSize, result)
    };
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(responseTime, responseSize, result) {
    let score = 100;

    // 响应时间评分 (40%)
    if (responseTime > 3000) score -= 40;
    else if (responseTime > 1000) score -= 30;
    else if (responseTime > 300) score -= 15;
    else if (responseTime > 100) score -= 5;

    // 响应大小评分 (20%)
    if (responseSize > 1048576) score -= 20; // 1MB
    else if (responseSize > 102400) score -= 15; // 100KB
    else if (responseSize > 10240) score -= 10; // 10KB

    // 缓存策略评分 (20%)
    if (!result.cacheInfo.cacheable) score -= 20;
    else if (!result.cacheInfo.maxAge) score -= 10;

    // 压缩策略评分 (20%)
    if (!result.compressionInfo.compressed && responseSize > 1024) {
      score -= 20;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 辅助方法
   */
  isJsonResponse(response) {
    const contentType = response.headers['content-type'] || '';
    return contentType.includes('application/json');
  }

  extractCharset(contentType) {
    if (!contentType) return null;
    const charsetMatch = contentType.match(/charset=([^;]+)/);
    return charsetMatch ? charsetMatch[1] : null;
  }

  categorizePerformance(responseTime) {
    if (responseTime <= 100) return 'excellent';
    if (responseTime <= 300) return 'good';
    if (responseTime <= 1000) return 'acceptable';
    return 'poor';
  }

  /**
   * 增强的响应模式验证
   */
  validateResponseSchema(data, schema) {
    const errors = [];

    if (!schema) return errors;

    try {
      // 简单的模式验证
      if (schema.type && typeof data !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${typeof data}`);
      }

      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (!(field in data)) {
            errors.push(`Missing required field: ${field}`);
          }
        }
      }

      if (schema.properties && typeof data === 'object') {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (field in data) {
            const fieldErrors = this.validateResponseSchema(data[field], fieldSchema);
            errors.push(...fieldErrors.map(err => `${field}.${err}`));
          }
        }
      }

    } catch (error) {
      errors.push(`Schema validation error: ${error.message}`);
    }

    return errors;
  }
}

module.exports = { RealAPITestEngine };
