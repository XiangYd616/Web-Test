/**
 * 测试用例管理器
 * 本地化程度：100%
 * 管理API测试用例的创建、执行、验证等功能
 */

const HTTPClient = require('../clients/HTTPClient');
const JSONSchemaValidator = require('../validators/JSONSchemaValidator');

class TestCaseManager {
  constructor(options = {}) {
    this.httpClient = new HTTPClient(options.httpClient);
    this.validator = new JSONSchemaValidator(options.validator);
    this.testCases = new Map();
    this.testSuites = new Map();
    this.executionHistory = [];
    
    // 默认配置
    this.defaultConfig = {
      timeout: 30000,
      retries: 0,
      validateResponse: true,
      followRedirects: true,
      ...options.defaultConfig
    };
  }

  /**
   * 创建测试用例
   */
  createTestCase(testCase) {
    const id = testCase.id || this.generateId();
    
    const normalizedTestCase = {
      id,
      name: testCase.name || `Test Case ${id}`,
      description: testCase.description || '',
      request: this.normalizeRequest(testCase.request),
      expectations: this.normalizeExpectations(testCase.expectations),
      config: { ...this.defaultConfig, ...testCase.config },
      tags: testCase.tags || [],
      dependencies: testCase.dependencies || [],
      setup: testCase.setup || null,
      teardown: testCase.teardown || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.testCases.set(id, normalizedTestCase);
    return normalizedTestCase;
  }

  /**
   * 创建测试套件
   */
  createTestSuite(testSuite) {
    const id = testSuite.id || this.generateId();
    
    const normalizedTestSuite = {
      id,
      name: testSuite.name || `Test Suite ${id}`,
      description: testSuite.description || '',
      testCases: testSuite.testCases || [],
      config: { ...this.defaultConfig, ...testSuite.config },
      setup: testSuite.setup || null,
      teardown: testSuite.teardown || null,
      parallel: testSuite.parallel || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.testSuites.set(id, normalizedTestSuite);
    return normalizedTestSuite;
  }

  /**
   * 执行单个测试用例
   */
  async executeTestCase(testCaseId, context = {}) {
    const testCase = this.testCases.get(testCaseId);
    if (!testCase) {
      throw new Error(`测试用例不存在: ${testCaseId}`);
    }
    
    const execution = {
      id: this.generateId(),
      testCaseId,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      status: 'running',
      result: null,
      error: null,
      context
    };
    
    try {
      // 执行setup
      if (testCase.setup) {
        await this.executeSetup(testCase.setup, context);
      }
      
      // 准备请求
      const request = this.prepareRequest(testCase.request, context);
      
      // 发送请求
      const response = await this.httpClient.request(request);
      
      // 验证响应
      const validationResult = await this.validateResponse(response, testCase.expectations);
      
      // 构建结果
      execution.result = {
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          data: request.data
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          timing: response.timing,
          size: response.size
        },
        validation: validationResult,
        success: response.success && validationResult.valid
      };
      
      execution.status = execution.result.success ? 'passed' : 'failed';
      
      // 执行teardown
      if (testCase.teardown) {
        await this.executeTeardown(testCase.teardown, context, execution.result);
      }
      
    } catch (error) {
      execution.status = 'error';
      execution.error = {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      };
    } finally {
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      
      this.executionHistory.push(execution);
    }
    
    return execution;
  }

  /**
   * 执行测试套件
   */
  async executeTestSuite(testSuiteId, context = {}) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`测试套件不存在: ${testSuiteId}`);
    }
    
    const execution = {
      id: this.generateId(),
      testSuiteId,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      status: 'running',
      results: [],
      summary: {
        total: testSuite.testCases.length,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0
      },
      context
    };
    
    try {
      // 执行套件setup
      if (testSuite.setup) {
        await this.executeSetup(testSuite.setup, context);
      }
      
      // 执行测试用例
      if (testSuite.parallel) {
        // 并行执行
        const promises = testSuite.testCases.map(testCaseId => 
          this.executeTestCase(testCaseId, { ...context })
        );
        execution.results = await Promise.all(promises);
      } else {
        // 串行执行
        for (const testCaseId of testSuite.testCases) {
          const result = await this.executeTestCase(testCaseId, context);
          execution.results.push(result);
          
          // 更新上下文（用于依赖传递）
          if (result.result && result.result.success) {
            context = { ...context, ...this.extractContextFromResult(result.result) };
          }
        }
      }
      
      // 计算摘要
      execution.results.forEach(result => {
        switch (result.status) {
          case 'passed':
            execution.summary.passed++;
            break;
          case 'failed':
            execution.summary.failed++;
            break;
          case 'error':
            execution.summary.errors++;
            break;
          default:
            execution.summary.skipped++;
        }
      });
      
      execution.status = execution.summary.failed === 0 && execution.summary.errors === 0 ? 'passed' : 'failed';
      
      // 执行套件teardown
      if (testSuite.teardown) {
        await this.executeTeardown(testSuite.teardown, context, execution.results);
      }
      
    } catch (error) {
      execution.status = 'error';
      execution.error = {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      };
    } finally {
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
    }
    
    return execution;
  }

  /**
   * 标准化请求
   */
  normalizeRequest(request) {
    return {
      method: (request.method || 'GET').toUpperCase(),
      url: request.url,
      headers: request.headers || {},
      data: request.data || null,
      params: request.params || {},
      auth: request.auth || null,
      bearerToken: request.bearerToken || null,
      apiKey: request.apiKey || null,
      apiKeyLocation: request.apiKeyLocation || 'header',
      apiKeyName: request.apiKeyName || 'X-API-Key',
      timeout: request.timeout || this.defaultConfig.timeout,
      followRedirects: request.followRedirects !== false
    };
  }

  /**
   * 标准化期望
   */
  normalizeExpectations(expectations) {
    if (!expectations) {
      return {
        status: { min: 200, max: 299 },
        headers: {},
        body: null,
        responseTime: { max: 5000 }
      };
    }
    
    return {
      status: expectations.status || { min: 200, max: 299 },
      headers: expectations.headers || {},
      body: expectations.body || null,
      responseTime: expectations.responseTime || { max: 5000 },
      custom: expectations.custom || []
    };
  }

  /**
   * 准备请求
   */
  prepareRequest(request, context) {
    // 替换模板变量
    const preparedRequest = JSON.parse(JSON.stringify(request));
    
    // 替换URL中的变量
    preparedRequest.url = this.replaceVariables(preparedRequest.url, context);
    
    // 替换头部中的变量
    if (preparedRequest.headers) {
      Object.keys(preparedRequest.headers).forEach(key => {
        preparedRequest.headers[key] = this.replaceVariables(preparedRequest.headers[key], context);
      });
    }
    
    // 替换请求体中的变量
    if (preparedRequest.data && typeof preparedRequest.data === 'string') {
      preparedRequest.data = this.replaceVariables(preparedRequest.data, context);
    }
    
    return preparedRequest;
  }

  /**
   * 替换变量
   */
  replaceVariables(template, context) {
    if (typeof template !== 'string') {
      return template;
    }
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return context[varName] !== undefined ? context[varName] : match;
    });
  }

  /**
   * 验证响应
   */
  async validateResponse(response, expectations) {
    const result = {
      valid: true,
      errors: [],
      details: {}
    };
    
    // 验证状态码
    const statusValidation = this.validator.validateStatus(response.status, expectations.status);
    result.details.status = statusValidation;
    if (!statusValidation.valid) {
      result.valid = false;
      result.errors.push(...statusValidation.errors);
    }
    
    // 验证响应头
    if (Object.keys(expectations.headers).length > 0) {
      const headersValidation = this.validator.validateHeaders(response.headers, expectations.headers);
      result.details.headers = headersValidation;
      if (!headersValidation.valid) {
        result.valid = false;
        result.errors.push(...headersValidation.errors);
      }
    }
    
    // 验证响应体
    if (expectations.body) {
      const bodyValidation = this.validator.validate(response.data, expectations.body);
      result.details.body = bodyValidation;
      if (!bodyValidation.valid) {
        result.valid = false;
        result.errors.push(...bodyValidation.errors);
      }
    }
    
    // 验证响应时间
    if (expectations.responseTime) {
      const responseTimeValidation = this.validateResponseTime(response.timing.responseTime, expectations.responseTime);
      result.details.responseTime = responseTimeValidation;
      if (!responseTimeValidation.valid) {
        result.valid = false;
        result.errors.push(...responseTimeValidation.errors);
      }
    }
    
    // 执行自定义验证
    if (expectations.custom && expectations.custom.length > 0) {
      const customValidation = await this.executeCustomValidations(response, expectations.custom);
      result.details.custom = customValidation;
      if (!customValidation.valid) {
        result.valid = false;
        result.errors.push(...customValidation.errors);
      }
    }
    
    return result;
  }

  /**
   * 验证响应时间
   */
  validateResponseTime(actualTime, expectedTime) {
    const errors = [];
    let valid = true;
    
    if (expectedTime.max !== undefined && actualTime > expectedTime.max) {
      valid = false;
      errors.push({
        type: 'response_time_too_slow',
        message: `响应时间 ${actualTime}ms 超过最大值 ${expectedTime.max}ms`,
        expected: expectedTime.max,
        actual: actualTime
      });
    }
    
    if (expectedTime.min !== undefined && actualTime < expectedTime.min) {
      valid = false;
      errors.push({
        type: 'response_time_too_fast',
        message: `响应时间 ${actualTime}ms 低于最小值 ${expectedTime.min}ms`,
        expected: expectedTime.min,
        actual: actualTime
      });
    }
    
    return { valid, errors };
  }

  /**
   * 执行自定义验证
   */
  async executeCustomValidations(response, customValidations) {
    const errors = [];
    let valid = true;
    
    for (const validation of customValidations) {
      try {
        if (typeof validation === 'function') {
          const result = await validation(response);
          if (!result || (typeof result === 'object' && !result.valid)) {
            valid = false;
            errors.push({
              type: 'custom_validation_failed',
              message: result?.message || '自定义验证失败',
              validation: validation.name || 'anonymous'
            });
          }
        }
      } catch (error) {
        valid = false;
        errors.push({
          type: 'custom_validation_error',
          message: `自定义验证执行错误: ${error.message}`,
          validation: validation.name || 'anonymous'
        });
      }
    }
    
    return { valid, errors };
  }

  /**
   * 执行setup
   */
  async executeSetup(setup, context) {
    if (typeof setup === 'function') {
      await setup(context);
    }
  }

  /**
   * 执行teardown
   */
  async executeTeardown(teardown, context, result) {
    if (typeof teardown === 'function') {
      await teardown(context, result);
    }
  }

  /**
   * 从结果中提取上下文
   */
  extractContextFromResult(result) {
    const context = {};
    
    // 从响应中提取常用字段
    if (result.response.data) {
      if (typeof result.response.data === 'object') {
        // 提取ID字段
        if (result.response.data.id) {
          context.lastId = result.response.data.id;
        }
        
        // 提取token字段
        if (result.response.data.token) {
          context.token = result.response.data.token;
        }
        
        // 提取access_token字段
        if (result.response.data.access_token) {
          context.accessToken = result.response.data.access_token;
        }
      }
    }
    
    return context;
  }

  /**
   * 生成ID
   */
  generateId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取测试用例
   */
  getTestCase(id) {
    return this.testCases.get(id);
  }

  /**
   * 获取测试套件
   */
  getTestSuite(id) {
    return this.testSuites.get(id);
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      testCases: this.testCases.size,
      testSuites: this.testSuites.size,
      executions: this.executionHistory.length,
      httpStats: this.httpClient.getStats()
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.httpClient.close();
    this.validator.clearCache();
  }
}

module.exports = TestCaseManager;
