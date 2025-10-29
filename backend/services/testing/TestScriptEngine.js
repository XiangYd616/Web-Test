/**
 * 测试脚本执行引擎
 * 支持 Pre-request Scripts 和 Test Scripts
 * 兼容 Postman 脚本语法
 */

const vm = require('vm');
const chai = require('chai');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const _ = require('lodash');
const moment = require('moment');

class TestScriptEngine {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,
      enableConsoleLog: options.enableConsoleLog !== false,
      sandbox: options.sandbox || {},
      ...options
    };

    // 测试结果存储
    this.testResults = [];
    this.consoleOutput = [];
    this.variables = new Map();
    this.globalVariables = new Map();
    
    // 初始化断言库
    this.expect = chai.expect;
    this.assert = chai.assert;
  }

  /**
   * 执行 Pre-request Script
   */
  async executePreRequestScript(script, context = {}) {
    if (!script || script.trim() === '') {
      return { success: true, variables: {} };
    }

    console.log('🔧 执行 Pre-request Script...');
    
    try {
      const sandbox = this.createSandbox('prerequest', context);
      const result = await this.runScript(script, sandbox, 'Pre-request Script');
      
      // 提取设置的变量
      const variables = this.extractVariables(sandbox);
      
      return {
        success: true,
        variables,
        console: this.consoleOutput,
        execution: result
      };
    } catch (error) {
      console.error('Pre-request Script 执行失败:', error);
      return {
        success: false,
        error: error.message,
        console: this.consoleOutput
      };
    }
  }

  /**
   * 执行 Test Script
   */
  async executeTestScript(script, context = {}) {
    if (!script || script.trim() === '') {
      return { success: true, tests: [], passed: 0, failed: 0 };
    }

    this.testResults = [];
    
    try {
      const sandbox = this.createSandbox('test', context);
      await this.runScript(script, sandbox, 'Test Script');
      
      // 统计测试结果
      const passed = this.testResults.filter(t => t.passed).length;
      const failed = this.testResults.filter(t => !t.passed).length;
      
      return {
        success: true,
        tests: this.testResults,
        passed,
        failed,
        total: this.testResults.length,
        console: this.consoleOutput,
        variables: this.extractVariables(sandbox)
      };
    } catch (error) {
      console.error('Test Script 执行失败:', error);
      return {
        success: false,
        error: error.message,
        tests: this.testResults,
        console: this.consoleOutput
      };
    }
  }

  /**
   * 创建脚本执行沙箱
   */
  createSandbox(type, context) {
    const self = this;
    
    // 基础沙箱对象
    const sandbox = {
      // 控制台
      console: {
        log: (...args) => {
          const message = args.map(arg => this.formatValue(arg)).join(' ');
          this.consoleOutput.push({ type: 'log', message, timestamp: new Date().toISOString() });
          if (this.options.enableConsoleLog) {
          }
        },
        error: (...args) => {
          const message = args.map(arg => this.formatValue(arg)).join(' ');

          /**

           * if功能函数

           * @param {Object} params - 参数对象

           * @returns {Promise<Object>} 返回结果

           */
          this.consoleOutput.push({ type: 'error', message, timestamp: new Date().toISOString() });
          if (this.options.enableConsoleLog) {
            console.error('[Script]', message);
          }
        },
        warn: (...args) => {
          const message = args.map(arg => this.formatValue(arg)).join(' ');

          /**

           * if功能函数

           * @param {Object} params - 参数对象

           * @returns {Promise<Object>} 返回结果

           */
          this.consoleOutput.push({ type: 'warn', message, timestamp: new Date().toISOString() });
          if (this.options.enableConsoleLog) {
            console.warn('[Script]', message);
          }
        }
      },

      // Postman 兼容 API
      pm: {
        info: {
          eventName: type,
          iteration: context.iteration || 0,
          iterationCount: context.iterationCount || 1,
          requestName: context.requestName || '',
          requestId: context.requestId || uuidv4()
        },

        // 环境变量
        environment: {
          get: (key) => context.environment?.get(key),
          set: (key, value) => {
            self.variables.set(key, value);
            if (context.environment) {
              context.environment.set(key, value);
            }
          },
          unset: (key) => {
            self.variables.delete(key);
            if (context.environment) {
              context.environment.unset(key);
            }
          },
          has: (key) => context.environment?.has(key) || false,
          clear: () => {
            self.variables.clear();
            if (context.environment) {
              context.environment.clear();
            }
          },
          toObject: () => {
            const obj = {};
            if (context.environment) {
              for (const [key, value] of context.environment.entries()) {
                obj[key] = value;
              }
            }
            return obj;
          }
        },

        // 全局变量
        globals: {
          get: (key) => self.globalVariables.get(key),
          set: (key, value) => self.globalVariables.set(key, value),
          unset: (key) => self.globalVariables.delete(key),
          has: (key) => self.globalVariables.has(key),
          clear: () => self.globalVariables.clear(),
          toObject: () => {
            const obj = {};
            for (const [key, value] of self.globalVariables.entries()) {
              obj[key] = value;
            }
            return obj;
          }
        },

        // 集合变量
        collectionVariables: {
          get: (key) => context.collectionVariables?.get(key),
          set: (key, value) => context.collectionVariables?.set(key, value),
          unset: (key) => context.collectionVariables?.unset(key),
          has: (key) => context.collectionVariables?.has(key) || false
        },

        // 请求对象
        request: context.request || {
          url: '',
          method: 'GET',
          headers: {},
          body: null
        },

        // 响应对象（仅在测试脚本中可用）
        response: type === 'test' ? (context.response || {
          code: 200,
          status: 'OK',
          headers: {},
          body: null,
          responseTime: 0,
          responseSize: 0,
          text: () => JSON.stringify(context.response?.body),
          json: () => context.response?.body
        }) : undefined,

        // 测试函数（仅在测试脚本中可用）
        test: type === 'test' ? (name, callback) => {
          const testCase = {
            name,
            passed: false,
            error: null,
            duration: 0
          };

          const startTime = Date.now();
          
          try {
            callback();
            testCase.passed = true;
          } catch (error) {
            testCase.passed = false;
            testCase.error = error.message;
          }
          
          testCase.duration = Date.now() - startTime;
          self.testResults.push(testCase);
          
          // 输出测试结果
          const icon = testCase.passed ? '✓' : '✗';
          const status = testCase.passed ? 'PASS' : 'FAIL';
          
          if (!testCase.passed && testCase.error) {
          }
        } : undefined,

        // 期望/断言（仅在测试脚本中可用）
        expect: type === 'test' ? {
          response: {
            to: {
              have: {
                status: (code) => {
                  if (context.response?.code !== code) {
                    throw new Error(`Expected status code ${code}, but got ${context.response?.code}`);
                  }
                },
                header: (name, value) => {

                  /**

                   * if功能函数

                   * @param {Object} params - 参数对象

                   * @returns {Promise<Object>} 返回结果

                   */
                  const headerValue = context.response?.headers[name.toLowerCase()];
                  if (value !== undefined) {
                    if (headerValue !== value) {
                      throw new Error(`Expected header ${name} to be "${value}", but got "${headerValue}"`);
                    }
                  } else {
                    if (!headerValue) {
                      throw new Error(`Expected header ${name} to exist`);
                    }
                  }
                },
                body: (matcher) => {

                  /**

                   * if功能函数

                   * @param {Object} params - 参数对象

                   * @returns {Promise<Object>} 返回结果

                   */
                  const body = context.response?.body;
                  if (typeof matcher === 'string') {
                    if (!JSON.stringify(body).includes(matcher)) {
                      throw new Error(`Expected body to contain "${matcher}"`);
                    }
                  } else if (typeof matcher === 'object') {
                    if (!_.isMatch(body, matcher)) {
                      throw new Error(`Body does not match expected structure`);
                    }
                  }
                },
                jsonBody: (path, value) => {
                  const body = context.response?.body;

                  /**

                   * if功能函数

                   * @param {Object} params - 参数对象

                   * @returns {Promise<Object>} 返回结果

                   */
                  const actual = _.get(body, path);
                  if (value !== undefined) {
                    if (actual !== value) {
                      throw new Error(`Expected ${path} to be "${value}", but got "${actual}"`);
                    }
                  } else {
                    if (actual === undefined) {
                      throw new Error(`Expected ${path} to exist in response`);
                    }
                  }
                }
              },
              be: {
                ok: () => {

                  /**

                   * if功能函数

                   * @param {Object} params - 参数对象

                   * @returns {Promise<Object>} 返回结果

                   */
                  const code = context.response?.code;
                  if (code < 200 || code >= 300) {
                    throw new Error(`Expected successful response (2xx), but got ${code}`);
                  }
                },
                error: () => {

                  /**

                   * if功能函数

                   * @param {Object} params - 参数对象

                   * @returns {Promise<Object>} 返回结果

                   */
                  const code = context.response?.code;
                  if (code < 400) {
                    throw new Error(`Expected error response (4xx or 5xx), but got ${code}`);
                  }
                }
              }
            }
          }
        } : undefined,

        // 发送请求（用于工作流）
        sendRequest: async (request, callback) => {
          // 这里可以集成实际的 HTTP 请求发送
          if (callback) {
            callback(null, { code: 200, body: {} });
          }
        }
      },

      // 实用工具
      _,  // Lodash
      moment,  // Moment.js
      CryptoJS: {
        MD5: (message) => crypto.createHash('md5').update(message).digest('hex'),
        SHA1: (message) => crypto.createHash('sha1').update(message).digest('hex'),
        SHA256: (message) => crypto.createHash('sha256').update(message).digest('hex'),
        SHA512: (message) => crypto.createHash('sha512').update(message).digest('hex'),
        HmacSHA256: (message, secret) => crypto.createHmac('sha256', secret).update(message).digest('hex'),
        enc: {
          Base64: {
            stringify: (data) => Buffer.from(data).toString('base64'),
            parse: (data) => Buffer.from(data, 'base64').toString()
          }
        }
      },
      
      // Base64 编码/解码
      btoa: (str) => Buffer.from(str).toString('base64'),
      atob: (str) => Buffer.from(str, 'base64').toString(),
      
      // JSON 操作
      JSON,
      
      // 数学函数
      Math,
      
      // 日期
      Date,
      
      // 正则表达式
      RegExp,
      
      // 数组和对象
      Array,
      Object,
      
      // 字符串
      String,
      
      // 数字
      Number,
      
      // 布尔
      Boolean,
      
      // 错误
      Error,
      
      // 超时函数
      setTimeout,
      clearTimeout,
      
      // 自定义断言
      chai: {
        expect: chai.expect,
        assert: chai.assert
      },

      // 用户自定义沙箱对象
      ...this.options.sandbox
    };

    // 添加请求上下文
    if (context.request) {
      sandbox.request = context.request;
    }

    // 添加响应上下文（仅测试脚本）
    if (type === 'test' && context.response) {
      sandbox.response = context.response;
      sandbox.responseCode = {
        code: context.response.code || 200,
        name: context.response.status || 'OK',
        detail: context.response.statusText || ''
      };
      sandbox.responseTime = context.response.responseTime || 0;
      sandbox.responseHeaders = context.response.headers || {};
      sandbox.responseBody = context.response.body;
    }

    return sandbox;
  }

  /**
   * 运行脚本
   */
  async runScript(script, sandbox, scriptName = 'Script') {
    return new Promise((resolve, reject) => {
      try {
        // 创建 VM 上下文
        const context = vm.createContext(sandbox);
        
        // 包装脚本以捕获异步错误
        const wrappedScript = `
          (async function() {
            try {
              ${script}
            } catch (error) {
              throw error;
            }
          })()
        `;

        // 设置脚本选项
        const options = {
          filename: scriptName,
          timeout: this.options.timeout,
          displayErrors: true
        };

        // 编译和运行脚本
        const compiledScript = new vm.Script(wrappedScript, options);
        const result = compiledScript.runInContext(context, options);

        // 处理异步结果
        if (result instanceof Promise) {
          result
            .then(resolve)
            .catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 提取变量
   */
  extractVariables(sandbox) {
    const variables = {};
    
    // 从环境变量中提取
    if (this.variables.size > 0) {
      for (const [key, value] of this.variables.entries()) {
        variables[key] = value;
      }
    }

    // 从全局变量中提取
    if (this.globalVariables.size > 0) {
      for (const [key, value] of this.globalVariables.entries()) {
        variables[`global.${key}`] = value;
      }
    }

    return variables;
  }

  /**
   * 格式化值用于输出
   */
  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * 批量运行测试
   */
  async runTestSuite(testSuite, context = {}) {
    const results = {
      name: testSuite.name,
      tests: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalTime: 0,
      startTime: new Date().toISOString(),
      endTime: null
    };

    const startTime = Date.now();

    for (const test of testSuite.tests) {
      
      // 执行 Pre-request Script
      if (test.preRequestScript) {
        const preResult = await this.executePreRequestScript(test.preRequestScript, {
          ...context,
          requestName: test.name
        });
        
        // 合并变量
        if (preResult.variables) {
          Object.assign(context, preResult.variables);
        }
      }

      // 模拟请求执行（实际应该调用 RealHTTPEngine）
      const mockResponse = {
        code: 200,
        status: 'OK',
        headers: { 'content-type': 'application/json' },
        body: { success: true, data: { id: 1, name: 'Test' } },
        responseTime: Math.floor(Math.random() * 1000)
      };

      // 执行测试脚本
      const testResult = await this.executeTestScript(test.testScript, {
        ...context,
        request: test.request,
        response: mockResponse,
        requestName: test.name
      });

      results.tests.push({
        name: test.name,
        ...testResult
      });

      results.totalTests += testResult.total || 0;
      results.passedTests += testResult.passed || 0;
      results.failedTests += testResult.failed || 0;
    }

    results.totalTime = Date.now() - startTime;
    results.endTime = new Date().toISOString();

    // 生成测试报告
    this.generateTestReport(results);

    return results;
  }

  /**
   * 生成测试报告
   */
  generateTestReport(results) {
    console.log('📊 测试报告');
    console.log(`✅ 通过: ${results.passedTests}`);
    console.log(`❌ 失败: ${results.failedTests}`);

    // 详细结果
    if (results.failedTests > 0) {
      for (const test of results.tests) {
        if (test.tests) {
          for (const t of test.tests) {
            if (!t.passed) {
              if (t.error) {
              }
            }
          }
        }
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.testResults = [];
    this.consoleOutput = [];
    this.variables.clear();
    this.globalVariables.clear();
  }
}

module.exports = TestScriptEngine;
