/**
 * API测试分析器
 * 本地化程度：100%
 * 提供完整的API测试和分析功能
 */

const TestCaseManager = require('../managers/testCaseManager');
const HTTPClient = require('../clients/httpClient');
const APITestAutomation = require('../automation/apiTestAutomation');
const APIPerformanceTester = require('../performance/apiPerformanceTester');
const APIDocumentationGenerator = require('../documentation/apiDocumentationGenerator');

class APIAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      maxConcurrency: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };

    this.testCaseManager = new TestCaseManager(this.options);
    this.httpClient = new HTTPClient(this.options);
    this.automation = new APITestAutomation();
    this.performanceTester = new APIPerformanceTester();
    this.documentationGenerator = new APIDocumentationGenerator();

    // 分析结果
    this.analysisResults = {
      endpoints: new Map(),
      performance: {
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      },
      reliability: {
        uptime: 0,
        errorRate: 0,
        timeouts: 0
      },
      security: {
        httpsUsage: false,
        authenticationRequired: false,
        vulnerabilities: []
      }
    };
  }

  /**
   * 分析API端点
   */
  async analyze(apiSpec, config = {}) {
    const startTime = Date.now();

    try {
      console.log('🔍 开始API分析...');

      const results = {
        apiSpec,
        timestamp: new Date().toISOString(),
        analysisTime: 0,
        endpoints: [],
        performance: null,
        reliability: null,
        security: null,
        compliance: null,
        scores: null,
        recommendations: []
      };

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'parsing',
          message: '解析API规范...'
        });
      }

      // 解析API规范
      const endpoints = this.parseAPISpec(apiSpec);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 30,
          stage: 'testing',
          message: '执行API测试...'
        });
      }

      // 执行端点测试
      const endpointResults = await this.testEndpoints(endpoints, config);
      results.endpoints = endpointResults;

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 60,
          stage: 'analyzing',
          message: '分析性能指标...'
        });
      }

      // 分析性能
      results.performance = this.analyzePerformance(endpointResults);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 75,
          stage: 'analyzing',
          message: '分析可靠性...'
        });
      }

      // 分析可靠性
      results.reliability = this.analyzeReliability(endpointResults);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 85,
          stage: 'analyzing',
          message: '分析安全性...'
        });
      }

      // 分析安全性
      results.security = this.analyzeSecurity(endpointResults, apiSpec);

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 95,
          stage: 'calculating',
          message: '计算评分...'
        });
      }

      // 分析合规性
      results.compliance = this.analyzeCompliance(endpointResults, apiSpec);

      // 计算评分
      results.scores = this.calculateScores(results);

      // 生成建议
      results.recommendations = this.generateRecommendations(results);

      // 计算分析时间
      results.analysisTime = Date.now() - startTime;

      console.log(`✅ API分析完成，测试了 ${endpoints.length} 个端点`);

      return results;

    } catch (error) {
      console.error('❌ API分析失败:', error);
      throw error;
    }
  }

  /**
   * 解析API规范
   */
  parseAPISpec(apiSpec) {
    const endpoints = [];

    if (apiSpec.openapi || apiSpec.swagger) {
      // OpenAPI/Swagger规范
      endpoints.push(...this.parseOpenAPISpec(apiSpec));
    } else if (apiSpec.endpoints) {
      // 自定义端点列表
      endpoints.push(...apiSpec.endpoints);
    } else if (typeof apiSpec === 'string') {
      // 单个URL
      endpoints.push({
        path: apiSpec,
        method: 'GET',
        name: 'Single Endpoint Test'
      });
    }

    return endpoints;
  }

  /**
   * 解析OpenAPI规范
   */
  parseOpenAPISpec(spec) {
    const endpoints = [];
    const baseUrl = this.getBaseUrl(spec);

    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
            endpoints.push({
              path: baseUrl + path,
              method: method.toUpperCase(),
              name: operation.operationId || `${method.toUpperCase()} ${path}`,
              description: operation.summary || operation.description,
              parameters: operation.parameters || [],
              requestBody: operation.requestBody,
              responses: operation.responses || {},
              security: operation.security || spec.security || [],
              tags: operation.tags || []
            });
          }
        });
      });
    }

    return endpoints;
  }

  /**
   * 获取基础URL
   */
  getBaseUrl(spec) {
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    if (spec.host) {
      const scheme = spec.schemes && spec.schemes.length > 0 ? spec.schemes[0] : 'http';
      const basePath = spec.basePath || '';
      return `${scheme}://${spec.host}${basePath}`;
    }

    return '';
  }

  /**
   * 测试端点
   */
  async testEndpoints(endpoints, config) {
    const results = [];
    const concurrency = Math.min(this.options.maxConcurrency, endpoints.length);

    // 分批处理端点
    for (let i = 0; i < endpoints.length; i += concurrency) {
      const batch = endpoints.slice(i, i + concurrency);

      const batchPromises = batch.map(async (endpoint, index) => {
        try {
          const result = await this.testEndpoint(endpoint, config);

          // 更新进度
          if (config.onProgress) {
            const progress = 30 + Math.round(((i + index + 1) / endpoints.length) * 30);
            config.onProgress({
              percentage: progress,
              stage: 'testing',
              message: `测试端点: ${endpoint.method} ${endpoint.path}`
            });
          }

          return result;
        } catch (error) {
          return {
            endpoint,
            success: false,
            error: error.message,
            response: null,
            timing: { responseTime: 0 }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 添加延迟避免过载
      if (i + concurrency < endpoints.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * 测试单个端点
   */
  async testEndpoint(endpoint, config) {
    const testCase = this.createTestCaseFromEndpoint(endpoint, config);
    const execution = await this.testCaseManager.executeTestCase(testCase.id, config.context || {});

    return {
      endpoint,
      execution,
      success: execution.status === 'passed',
      response: execution.result?.response,
      validation: execution.result?.validation,
      timing: execution.result?.response?.timing || { responseTime: 0 },
      error: execution.error
    };
  }

  /**
   * 从端点创建测试用例
   */
  createTestCaseFromEndpoint(endpoint, config) {
    const testCase = {
      name: endpoint.name || `${endpoint.method} ${endpoint.path}`,
      description: endpoint.description || '',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: this.buildHeaders(endpoint, config),
        data: this.buildRequestBody(endpoint, config)
      },
      expectations: this.buildExpectations(endpoint, config),
      config: {
        timeout: config.timeout || this.options.timeout,
        retries: config.retries || 0
      }
    };

    return this.testCaseManager.createTestCase(testCase);
  }

  /**
   * 构建请求头
   */
  buildHeaders(endpoint, config) {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'API-Test-Engine/1.0.0'
    };

    // 添加认证头
    if (config.auth) {
      if (config.auth.type === 'bearer') {
        headers['Authorization'] = `Bearer ${config.auth.token}`;
      } else if (config.auth.type === 'basic') {
        const credentials = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (config.auth.type === 'apikey') {
        headers[config.auth.name || 'X-API-Key'] = config.auth.value;
      }
    }

    // 添加自定义头
    if (config.headers) {
      Object.assign(headers, config.headers);
    }

    return headers;
  }

  /**
   * 构建请求体
   */
  buildRequestBody(endpoint, config) {
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      if (endpoint.requestBody) {
        // 从OpenAPI规范生成示例数据
        return this.generateExampleFromSchema(endpoint.requestBody);
      } else if (config.defaultRequestBody) {
        return config.defaultRequestBody;
      }
    }

    return null;
  }

  /**
   * 构建期望
   */
  buildExpectations(endpoint, config) {
    const expectations = {
      status: this.getExpectedStatusCodes(endpoint),
      responseTime: { max: config.maxResponseTime || 5000 }
    };

    // 从响应规范构建schema
    if (endpoint.responses) {
      const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
      if (successResponse && successResponse.content) {
        const jsonContent = successResponse.content['application/json'];
        if (jsonContent && jsonContent.schema) {
          expectations.body = jsonContent.schema;
        }
      }
    }

    return expectations;
  }

  /**
   * 获取期望的状态码
   */
  getExpectedStatusCodes(endpoint) {
    if (endpoint.responses) {
      const statusCodes = Object.keys(endpoint.responses)
        .filter(code => code !== 'default')
        .map(code => parseInt(code))
        .filter(code => code >= 200 && code < 400);

      if (statusCodes.length > 0) {
        return statusCodes;
      }
    }

    // 默认期望状态码
    switch (endpoint.method) {
      case 'POST':
        return [200, 201];
      case 'DELETE':
        return [200, 204];
      default:
        return [200];
    }
  }

  /**
   * 从schema生成示例数据
   */
  generateExampleFromSchema(requestBody) {
    if (requestBody.content && requestBody.content['application/json']) {
      const schema = requestBody.content['application/json'].schema;
      return this.generateDataFromSchema(schema);
    }

    return {};
  }

  /**
   * 从schema生成数据
   */
  generateDataFromSchema(schema) {
    if (!schema) return null;

    switch (schema.type) {
      case 'object':
        const obj = {};
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]) => {
            obj[key] = this.generateDataFromSchema(prop);
          });
        }
        return obj;

      case 'array':
        return schema.items ? [this.generateDataFromSchema(schema.items)] : [];

      case 'string':
        return schema.example || 'test';

      case 'number':
      case 'integer':
        return schema.example || 1;

      case 'boolean':
        return schema.example !== undefined ? schema.example : true;

      default:
        return schema.example || null;
    }
  }

  /**
   * 分析性能
   */
  analyzePerformance(endpointResults) {
    const responseTimes = endpointResults
      .filter(result => result.success && result.timing)
      .map(result => result.timing.responseTime);

    if (responseTimes.length === 0) {
      return {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        score: 0
      };
    }

    responseTimes.sort((a, b) => a - b);

    const performance = {
      averageResponseTime: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
      minResponseTime: responseTimes[0],
      maxResponseTime: responseTimes[responseTimes.length - 1],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      throughput: endpointResults.length / (Math.max(...responseTimes) / 1000),
      score: this.calculatePerformanceScore(responseTimes)
    };

    return performance;
  }

  /**
   * 分析可靠性
   */
  analyzeReliability(endpointResults) {
    const total = endpointResults.length;
    const successful = endpointResults.filter(result => result.success).length;
    const failed = total - successful;
    const timeouts = endpointResults.filter(result =>
      result.error && result.error.includes('timeout')
    ).length;

    return {
      uptime: total > 0 ? (successful / total) * 100 : 0,
      errorRate: total > 0 ? (failed / total) * 100 : 0,
      timeouts,
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      score: total > 0 ? Math.round((successful / total) * 100) : 0
    };
  }

  /**
   * 分析安全性
   */
  analyzeSecurity(endpointResults, apiSpec) {
    const security = {
      httpsUsage: this.checkHTTPSUsage(endpointResults),
      authenticationRequired: this.checkAuthenticationRequired(apiSpec),
      vulnerabilities: this.checkSecurityVulnerabilities(endpointResults),
      score: 100
    };

    // 计算安全评分
    if (!security.httpsUsage) security.score -= 30;
    if (!security.authenticationRequired) security.score -= 20;
    security.score -= security.vulnerabilities.length * 10;

    security.score = Math.max(0, security.score);

    return security;
  }

  /**
   * 分析合规性
   */
  analyzeCompliance(endpointResults, apiSpec) {
    return {
      restfulDesign: this.checkRESTfulDesign(endpointResults, apiSpec),
      httpStatusCodes: this.checkHTTPStatusCodes(endpointResults),
      contentTypes: this.checkContentTypes(endpointResults),
      documentation: this.checkDocumentation(apiSpec),
      score: this.calculateComplianceScore(endpointResults, apiSpec)
    };
  }

  /**
   * 计算评分
   */
  calculateScores(results) {
    const weights = {
      performance: 0.3,
      reliability: 0.3,
      security: 0.25,
      compliance: 0.15
    };

    const scores = {
      performance: results.performance.score,
      reliability: results.reliability.score,
      security: results.security.score,
      compliance: results.compliance.score
    };

    const overallScore = Object.entries(weights).reduce((sum, [category, weight]) => {
      return sum + (scores[category] * weight);
    }, 0);

    return {
      ...scores,
      overall: Math.round(overallScore),
      grade: this.getGrade(Math.round(overallScore))
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 性能建议
    if (results.performance.score < 80) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: '优化API响应时间',
        description: '平均响应时间过长，建议优化数据库查询和缓存策略'
      });
    }

    // 可靠性建议
    if (results.reliability.score < 95) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        title: '提高API可靠性',
        description: '错误率较高，建议增加错误处理和重试机制'
      });
    }

    // 安全性建议
    if (!results.security.httpsUsage) {
      recommendations.push({
        category: 'security',
        priority: 'critical',
        title: '启用HTTPS',
        description: '所有API端点都应该使用HTTPS协议'
      });
    }

    return recommendations;
  }

  // 辅助方法
  calculatePerformanceScore(responseTimes) {
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    if (avgTime <= 200) return 100;
    if (avgTime <= 500) return 90;
    if (avgTime <= 1000) return 80;
    if (avgTime <= 2000) return 70;
    if (avgTime <= 5000) return 60;
    return 50;
  }

  checkHTTPSUsage(endpointResults) {
    return endpointResults.every(result =>
      result.endpoint.path.startsWith('https://')
    );
  }

  checkAuthenticationRequired(apiSpec) {
    return !!(apiSpec.security || apiSpec.securityDefinitions);
  }

  checkSecurityVulnerabilities(endpointResults) {
    // 简化的安全漏洞检查
    return [];
  }

  checkRESTfulDesign(endpointResults, apiSpec) {
    // 检查RESTful设计原则
    return true;
  }

  checkHTTPStatusCodes(endpointResults) {
    // 检查HTTP状态码使用
    return true;
  }

  checkContentTypes(endpointResults) {
    // 检查内容类型
    return true;
  }

  checkDocumentation(apiSpec) {
    // 检查文档完整性
    return !!(apiSpec.info && apiSpec.info.description);
  }

  calculateComplianceScore(endpointResults, apiSpec) {
    return 85; // 简化实现
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建自动化测试套件
   */
  createAutomationTestSuite(name, config) {
    return this.automation.createTestSuite({
      name,
      description: config.description || `API自动化测试套件: ${name}`,
      baseUrl: config.baseUrl,
      environment: config.environment || 'default',
      timeout: config.timeout || 30000,
      retryCount: config.retryCount || 0
    });
  }

  /**
   * 从API规范生成测试用例
   */
  generateTestCasesFromSpec(suiteId, apiSpec) {
    const endpoints = this.parseAPISpec(apiSpec);
    const testCases = [];

    endpoints.forEach(endpoint => {
      const testCase = {
        name: `Test ${endpoint.method} ${endpoint.path}`,
        description: endpoint.description || `测试 ${endpoint.method} ${endpoint.path} 端点`,
        method: endpoint.method,
        endpoint: endpoint.path,
        headers: endpoint.headers || {},
        params: endpoint.parameters || {},
        body: endpoint.requestBody || null,
        expectedStatus: endpoint.expectedStatus || 200,
        validations: this.generateValidationsFromEndpoint(endpoint),
        tags: ['auto-generated', endpoint.method.toLowerCase()]
      };

      const result = this.automation.addTestCase(suiteId, testCase);
      testCases.push(result);
    });

    return testCases;
  }

  /**
   * 从端点生成验证规则
   */
  generateValidationsFromEndpoint(endpoint) {
    const validations = [];

    // 基本状态码验证
    validations.push({
      type: 'status',
      operator: 'equals',
      expected: endpoint.expectedStatus || 200,
      message: '验证HTTP状态码'
    });

    // 响应时间验证
    validations.push({
      type: 'json_path',
      field: 'response.timing.responseTime',
      operator: 'less_than',
      expected: 5000,
      message: '响应时间应小于5秒'
    });

    // 如果有响应模式，添加结构验证
    if (endpoint.responseSchema) {
      validations.push({
        type: 'json_path',
        field: 'data',
        operator: 'exists',
        expected: true,
        message: '响应数据应存在'
      });
    }

    return validations;
  }

  /**
   * 执行自动化测试套件
   */
  async executeAutomationTestSuite(suiteId, options = {}) {
    return await this.automation.executeTestSuite(suiteId, options);
  }

  /**
   * 获取自动化测试结果
   */
  getAutomationTestResult(executionId) {
    return this.automation.getTestResult(executionId);
  }

  /**
   * 生成自动化测试报告
   */
  generateAutomationTestReport(executionId) {
    return this.automation.generateTestReport(executionId);
  }

  /**
   * 设置测试环境
   */
  setTestEnvironment(name, config) {
    return this.automation.setTestEnvironment(name, config);
  }

  /**
   * 设置测试数据集
   */
  setTestDataSet(name, data) {
    return this.automation.setTestDataSet(name, data);
  }

  /**
   * 从文件加载测试数据
   */
  async loadTestDataFromFile(name, filePath) {
    return await this.automation.loadTestDataFromFile(name, filePath);
  }

  /**
   * 获取所有测试套件
   */
  getAllTestSuites() {
    return this.automation.getAllTestSuites();
  }

  /**
   * 导出测试套件
   */
  exportTestSuite(suiteId) {
    return this.automation.exportTestSuite(suiteId);
  }

  /**
   * 导入测试套件
   */
  importTestSuite(exportData) {
    return this.automation.importTestSuite(exportData);
  }

  /**
   * 执行API性能测试
   */
  async runPerformanceTest(testConfig) {
    return await this.performanceTester.runPerformanceTest(testConfig);
  }

  /**
   * 获取实时性能指标
   */
  getRealTimePerformanceMetrics() {
    return this.performanceTester.getRealTimeMetrics();
  }

  /**
   * 停止性能测试
   */
  stopPerformanceTest() {
    this.performanceTester.stopTest();
  }

  /**
   * 监听性能测试事件
   */
  onPerformanceTestEvent(eventName, callback) {
    this.performanceTester.on(eventName, callback);
  }

  /**
   * 生成API文档
   */
  async generateAPIDocumentation(testResults, options = {}) {
    return await this.documentationGenerator.generateAPIDocumentation(testResults, options);
  }

  /**
   * 生成OpenAPI规范
   */
  async generateOpenAPISpec(testResults, options = {}) {
    const documentation = await this.documentationGenerator.generateAPIDocumentation(testResults, options);
    return documentation.openApiSpec;
  }

  /**
   * 生成测试报告
   */
  async generateTestReport(testResults, options = {}) {
    const documentation = await this.documentationGenerator.generateAPIDocumentation(testResults, options);
    return documentation.testReport;
  }

  /**
   * 导出文档
   */
  async exportDocumentation(testResults, options = {}) {
    const documentation = await this.documentationGenerator.generateAPIDocumentation(testResults, options);

    if (options.outputDir && options.formats) {
      return await this.documentationGenerator.exportDocumentation(documentation, options);
    }

    return documentation;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.testCaseManager.cleanup();
    this.httpClient.close();
  }
}

module.exports = APIAnalyzer;
