/**
 * API自动化测试流程系统
 * 本地化程度：100%
 * 实现测试用例管理、批量测试执行、数据驱动测试、测试环境管理等功能
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class APITestAutomation extends EventEmitter {
  constructor() {
    super();
    this.testSuites = new Map();
    this.testEnvironments = new Map();
    this.testResults = new Map();
    this.executionQueue = [];
    this.isExecuting = false;
    this.globalVariables = new Map();
    this.testDataSets = new Map();
  }

  /**
   * 创建测试套件
   */
  createTestSuite(config) {
    const {
      name,
      description,
      baseUrl,
      environment = 'default',
      timeout = 30000,
      retryCount = 0,
      beforeAll = [],
      afterAll = [],
      beforeEach = [],
      afterEach = []
    } = config;

    const suiteId = this.generateId();
    const testSuite = {
      id: suiteId,
      name,
      description,
      baseUrl,
      environment,
      timeout,
      retryCount,
      beforeAll,
      afterAll,
      beforeEach,
      afterEach,
      testCases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.testSuites.set(suiteId, testSuite);
    console.log(`✅ 测试套件已创建: ${name} (${suiteId})`);

    return { suiteId, testSuite };
  }

  /**
   * 添加测试用例
   */
  addTestCase(suiteId, testCase) {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`测试套件不存在: ${suiteId}`);
    }

    const caseId = this.generateId();
    const fullTestCase = {
      id: caseId,
      name: testCase.name,
      description: testCase.description || '',
      method: testCase.method || 'GET',
      endpoint: testCase.endpoint,
      headers: testCase.headers || {},
      params: testCase.params || {},
      body: testCase.body || null,
      expectedStatus: testCase.expectedStatus || 200,
      expectedResponse: testCase.expectedResponse || null,
      validations: testCase.validations || [],
      dependencies: testCase.dependencies || [],
      dataSet: testCase.dataSet || null,
      skip: testCase.skip || false,
      timeout: testCase.timeout || suite.timeout,
      retryCount: testCase.retryCount || suite.retryCount,
      tags: testCase.tags || [],
      createdAt: new Date().toISOString()
    };

    suite.testCases.push(fullTestCase);
    suite.updatedAt = new Date().toISOString();

    console.log(`✅ 测试用例已添加: ${testCase.name} -> ${suite.name}`);
    return { caseId, testCase: fullTestCase };
  }

  /**
   * 设置测试环境
   */
  setTestEnvironment(name, config) {
    const environment = {
      name,
      baseUrl: config.baseUrl,
      headers: config.headers || {},
      variables: config.variables || {},
      auth: config.auth || null,
      proxy: config.proxy || null,
      ssl: config.ssl || { verify: true },
      timeout: config.timeout || 30000,
      createdAt: new Date().toISOString()
    };

    this.testEnvironments.set(name, environment);
    console.log(`✅ 测试环境已设置: ${name}`);

    return environment;
  }

  /**
   * 设置测试数据集
   */
  setTestDataSet(name, data) {
    if (Array.isArray(data)) {
      this.testDataSets.set(name, data);
    } else if (typeof data === 'object') {
      this.testDataSets.set(name, [data]);
    } else {
      throw new Error('测试数据必须是对象或对象数组');
    }

    console.log(`✅ 测试数据集已设置: ${name} (${this.testDataSets.get(name).length} 条记录)`);
    return this.testDataSets.get(name);
  }

  /**
   * 从文件加载测试数据
   */
  async loadTestDataFromFile(name, filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();

      let data;
      switch (extension) {
        case '.json':
          data = JSON.parse(fileContent);
          break;
        case '.csv':
          data = this.parseCSV(fileContent);
          break;
        default:
          throw new Error(`不支持的文件格式: ${extension}`);
      }

      return this.setTestDataSet(name, data);
    } catch (error) {
      console.error(`加载测试数据失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 解析CSV数据
   */
  parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  }

  /**
   * 执行测试套件
   */
  async executeTestSuite(suiteId, options = {}) {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`测试套件不存在: ${suiteId}`);
    }

    const executionId = this.generateId();
    const execution = {
      id: executionId,
      suiteId,
      suiteName: suite.name,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      results: [],
      environment: options.environment || suite.environment,
      parallel: options.parallel || false,
      maxConcurrency: options.maxConcurrency || 5
    };

    this.testResults.set(executionId, execution);

    try {
      console.log(`🚀 开始执行测试套件: ${suite.name} (${executionId})`);

      // 获取测试环境
      const environment = this.testEnvironments.get(execution.environment);
      if (!environment) {
        throw new Error(`测试环境不存在: ${execution.environment}`);
      }

      // 执行 beforeAll 钩子
      await this.executeHooks(suite.beforeAll, 'beforeAll', environment);

      // 准备测试用例
      const testCases = suite.testCases.filter(tc => !tc.skip);
      execution.totalTests = testCases.length;

      // 执行测试用例
      if (execution.parallel) {
        await this.executeTestCasesParallel(testCases, execution, environment, suite);
      } else {
        await this.executeTestCasesSequential(testCases, execution, environment, suite);
      }

      // 执行 afterAll 钩子
      await this.executeHooks(suite.afterAll, 'afterAll', environment);

      execution.status = execution.failedTests > 0 ? 'failed' : 'passed';
      execution.endTime = new Date().toISOString();

      console.log(`✅ 测试套件执行完成: ${suite.name} - ${execution.passedTests}/${execution.totalTests} 通过`);

      this.emit('suite_completed', execution);
      return execution;

    } catch (error) {
      execution.status = 'error';
      execution.endTime = new Date().toISOString();
      execution.error = error.message;

      console.error(`❌ 测试套件执行失败: ${suite.name}`, error);
      this.emit('suite_failed', execution);
      throw error;
    }
  }

  /**
   * 顺序执行测试用例
   */
  async executeTestCasesSequential(testCases, execution, environment, suite) {
    for (const testCase of testCases) {
      try {
        // 执行 beforeEach 钩子
        await this.executeHooks(suite.beforeEach, 'beforeEach', environment);

        // 执行测试用例
        const result = await this.executeTestCase(testCase, environment);
        execution.results.push(result);

        if (result.status === 'passed') {
          execution.passedTests++;
        } else {
          execution.failedTests++;
        }

        // 执行 afterEach 钩子
        await this.executeHooks(suite.afterEach, 'afterEach', environment);

        this.emit('test_completed', result);

      } catch (error) {
        const result = {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          status: 'error',
          error: error.message,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        };

        execution.results.push(result);
        execution.failedTests++;

        this.emit('test_failed', result);
      }
    }
  }

  /**
   * 并行执行测试用例
   */
  async executeTestCasesParallel(testCases, execution, environment, suite) {
    const chunks = this.chunkArray(testCases, execution.maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (testCase) => {
        try {
          // 执行 beforeEach 钩子
          await this.executeHooks(suite.beforeEach, 'beforeEach', environment);

          // 执行测试用例
          const result = await this.executeTestCase(testCase, environment);

          // 执行 afterEach 钩子
          await this.executeHooks(suite.afterEach, 'afterEach', environment);

          return result;
        } catch (error) {
          return {
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            status: 'error',
            error: error.message,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0
          };
        }
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        execution.results.push(result);

        if (result.status === 'passed') {
          execution.passedTests++;
        } else {
          execution.failedTests++;
        }

        this.emit('test_completed', result);
      });
    }
  }

  /**
   * 执行单个测试用例
   */
  async executeTestCase(testCase, environment) {
    const startTime = Date.now();
    const result = {
      testCaseId: testCase.id,
      testCaseName: testCase.name,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      request: null,
      response: null,
      validations: [],
      error: null
    };

    try {
      // 处理数据驱动测试
      if (testCase.dataSet) {
        const dataSet = this.testDataSets.get(testCase.dataSet);
        if (dataSet && dataSet.length > 0) {
          // 对于数据驱动测试，这里简化为使用第一条数据
          // 实际实现中应该为每条数据创建单独的测试执行
          const testData = dataSet[0];
          testCase = this.interpolateTestCase(testCase, testData);
        }
      }

      // 构建请求
      const request = await this.buildRequest(testCase, environment);
      result.request = request;

      // 发送请求
      const response = await this.sendRequest(request);
      result.response = {
        status: response.status,
        headers: response.headers,
        data: response.data,
        duration: response.duration
      };

      // 验证响应
      const validations = await this.validateResponse(testCase, response);
      result.validations = validations;

      // 判断测试结果
      const hasFailures = validations.some(v => !v.passed);
      result.status = hasFailures ? 'failed' : 'passed';

      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime;

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - startTime;

      return result;
    }
  }

  /**
   * 构建请求
   */
  async buildRequest(testCase, environment) {
    const request = {
      method: testCase.method,
      url: this.buildUrl(testCase.endpoint, environment.baseUrl),
      headers: { ...environment.headers, ...testCase.headers },
      params: testCase.params,
      data: testCase.body,
      timeout: testCase.timeout,
      validateStatus: () => true // 允许所有状态码，由验证逻辑处理
    };

    // 处理认证
    if (environment.auth) {
      request.auth = environment.auth;
    }

    // 处理代理
    if (environment.proxy) {
      request.proxy = environment.proxy;
    }

    // 处理SSL
    if (environment.ssl) {
      request.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: environment.ssl.verify
      });
    }

    return request;
  }

  /**
   * 发送请求
   */
  async sendRequest(request) {
    const axios = require('axios');
    const startTime = Date.now();

    try {
      const response = await axios(request);
      const duration = Date.now() - startTime;

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error.response) {
        // 服务器响应了错误状态码
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          duration
        };
      } else {
        // 网络错误或其他错误
        throw error;
      }
    }
  }

  /**
   * 验证响应
   */
  async validateResponse(testCase, response) {
    const validations = [];

    // 验证状态码
    validations.push({
      type: 'status_code',
      expected: testCase.expectedStatus,
      actual: response.status,
      passed: response.status === testCase.expectedStatus,
      message: `状态码验证: 期望 ${testCase.expectedStatus}, 实际 ${response.status}`
    });

    // 验证响应体
    if (testCase.expectedResponse) {
      const responseValidation = this.validateResponseBody(
        testCase.expectedResponse,
        response.data
      );
      validations.push(responseValidation);
    }

    // 执行自定义验证
    for (const validation of testCase.validations) {
      const result = await this.executeValidation(validation, response);
      validations.push(result);
    }

    return validations;
  }

  /**
   * 验证响应体
   */
  validateResponseBody(expected, actual) {
    try {
      const isEqual = JSON.stringify(expected) === JSON.stringify(actual);
      return {
        type: 'response_body',
        expected,
        actual,
        passed: isEqual,
        message: isEqual ? '响应体验证通过' : '响应体不匹配'
      };
    } catch (error) {
      return {
        type: 'response_body',
        expected,
        actual,
        passed: false,
        message: `响应体验证失败: ${error.message}`
      };
    }
  }

  /**
   * 执行自定义验证
   */
  async executeValidation(validation, response) {
    const { type, field, operator, expected, message } = validation;

    try {
      let actual;

      // 获取实际值
      switch (type) {
        case 'json_path':
          actual = this.getJsonPath(response.data, field);
          break;
        case 'header':
          actual = response.headers[field.toLowerCase()];
          break;
        case 'status':
          actual = response.status;
          break;
        default:
          actual = response.data;
      }

      // 执行比较
      const passed = this.executeComparison(actual, operator, expected);

      return {
        type,
        field,
        operator,
        expected,
        actual,
        passed,
        message: message || `${type} 验证: ${field} ${operator} ${expected}`
      };

    } catch (error) {
      return {
        type,
        field,
        operator,
        expected,
        actual: null,
        passed: false,
        message: `验证执行失败: ${error.message}`
      };
    }
  }

  /**
   * 执行比较操作
   */
  executeComparison(actual, operator, expected) {
    switch (operator) {
      case 'equals':
      case '==':
        return actual === expected;
      case 'not_equals':
      case '!=':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
      case '>':
        return Number(actual) > Number(expected);
      case 'less_than':
      case '<':
        return Number(actual) < Number(expected);
      case 'greater_equal':
      case '>=':
        return Number(actual) >= Number(expected);
      case 'less_equal':
      case '<=':
        return Number(actual) <= Number(expected);
      case 'regex':
        return new RegExp(expected).test(String(actual));
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      case 'type':
        return typeof actual === expected;
      case 'length':
        return (actual && actual.length) === Number(expected);
      default:
        throw new Error(`不支持的比较操作符: ${operator}`);
    }
  }

  /**
   * 获取JSON路径值
   */
  getJsonPath(data, path) {
    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // 处理数组索引
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current[arrayKey];

        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return undefined;
        }
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /**
   * 执行钩子函数
   */
  async executeHooks(hooks, type, environment) {
    for (const hook of hooks) {
      try {
        if (typeof hook === 'function') {
          await hook(environment, this.globalVariables);
        } else if (typeof hook === 'object' && hook.type === 'request') {
          // 执行HTTP请求钩子
          const request = await this.buildRequest(hook, environment);
          const response = await this.sendRequest(request);

          // 保存响应到全局变量
          if (hook.saveAs) {
            this.globalVariables.set(hook.saveAs, response.data);
          }
        }
      } catch (error) {
        console.error(`钩子执行失败 (${type}):`, error);
        throw error;
      }
    }
  }

  /**
   * 插值测试用例（数据驱动）
   */
  interpolateTestCase(testCase, data) {
    const interpolated = JSON.parse(JSON.stringify(testCase));

    // 递归替换所有字符串中的变量
    const interpolateValue = (value) => {
      if (typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return data[key] !== undefined ? data[key] : match;
        });
      } else if (typeof value === 'object' && value !== null) {
        const result = Array.isArray(value) ? [] : {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = interpolateValue(v);
        }
        return result;
      }
      return value;
    };

    return interpolateValue(interpolated);
  }

  /**
   * 构建完整URL
   */
  buildUrl(endpoint, baseUrl) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');

    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * 数组分块
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取测试套件
   */
  getTestSuite(suiteId) {
    return this.testSuites.get(suiteId);
  }

  /**
   * 获取所有测试套件
   */
  getAllTestSuites() {
    return Array.from(this.testSuites.values());
  }

  /**
   * 获取测试结果
   */
  getTestResult(executionId) {
    return this.testResults.get(executionId);
  }

  /**
   * 获取所有测试结果
   */
  getAllTestResults() {
    return Array.from(this.testResults.values());
  }

  /**
   * 删除测试套件
   */
  deleteTestSuite(suiteId) {
    const deleted = this.testSuites.delete(suiteId);
    if (deleted) {
      console.log(`✅ 测试套件已删除: ${suiteId}`);
    }
    return deleted;
  }

  /**
   * 导出测试套件
   */
  exportTestSuite(suiteId) {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`测试套件不存在: ${suiteId}`);
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      suite
    };
  }

  /**
   * 导入测试套件
   */
  importTestSuite(exportData) {
    if (!exportData.suite) {
      throw new Error('无效的导出数据');
    }

    const suite = exportData.suite;
    const newSuiteId = this.generateId();

    suite.id = newSuiteId;
    suite.importedAt = new Date().toISOString();

    this.testSuites.set(newSuiteId, suite);

    console.log(`✅ 测试套件已导入: ${suite.name} (${newSuiteId})`);
    return { suiteId: newSuiteId, suite };
  }

  /**
   * 生成测试报告
   */
  generateTestReport(executionId) {
    const execution = this.testResults.get(executionId);
    if (!execution) {
      throw new Error(`测试执行不存在: ${executionId}`);
    }

    const suite = this.testSuites.get(execution.suiteId);
    const duration = execution.endTime ?
      new Date(execution.endTime) - new Date(execution.startTime) : 0;

    return {
      execution: {
        id: execution.id,
        suiteName: execution.suiteName,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration,
        environment: execution.environment
      },
      summary: {
        totalTests: execution.totalTests,
        passedTests: execution.passedTests,
        failedTests: execution.failedTests,
        skippedTests: execution.skippedTests,
        successRate: execution.totalTests > 0 ?
          Math.round((execution.passedTests / execution.totalTests) * 100) : 0
      },
      results: execution.results,
      suite: suite ? {
        name: suite.name,
        description: suite.description,
        testCaseCount: suite.testCases.length
      } : null,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = APITestAutomation;
