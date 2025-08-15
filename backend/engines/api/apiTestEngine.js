/**
 * API测试引擎
 * 真实实现API端点测试功能
 */

const axios = require('axios');
const Joi = require('joi');

class ApiTestEngine {
  constructor() {
    this.name = 'api';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      endpoints: Joi.array().items(Joi.string()).default([]),
      methods: Joi.array().items(Joi.string().valid('GET', 'POST', 'PUT', 'DELETE')).default(['GET']),
      timeout: Joi.number().min(1000).max(60000).default(30000),
      headers: Joi.object().default({}),
      authentication: Joi.object({
        type: Joi.string().valid('bearer', 'basic', 'apikey'),
        token: Joi.string(),
        username: Joi.string(),
        password: Joi.string(),
        apiKey: Joi.string(),
        apiKeyHeader: Joi.string()
      }).optional()
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
      // 检查axios是否可用
      const testResponse = await axios.get('https://httpbin.org/status/200', {
        timeout: 5000
      });
      
      return {
        available: testResponse.status === 200,
        version: require('axios/package.json').version,
        dependencies: ['axios', 'joi']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['axios', 'joi']
      };
    }
  }

  /**
   * 执行API测试
   */
  async runApiTest(config) {
    const testId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '开始API测试');

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        endpoints: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          avgResponseTime: 0,
          totalTime: 0
        }
      };

      // 测试基础URL
      this.updateTestProgress(testId, 20, '测试基础URL');
      const baseTest = await this.testEndpoint(validatedConfig.url, 'GET', validatedConfig);
      results.endpoints.push(baseTest);

      // 测试指定的端点
      if (validatedConfig.endpoints.length > 0) {
        const progressStep = 60 / validatedConfig.endpoints.length;
        
        for (let i = 0; i < validatedConfig.endpoints.length; i++) {
          const endpoint = validatedConfig.endpoints[i];
          const progress = 20 + (i + 1) * progressStep;
          
          this.updateTestProgress(testId, progress, `测试端点: ${endpoint}`);
          
          for (const method of validatedConfig.methods) {
            const fullUrl = this.buildUrl(validatedConfig.url, endpoint);
            const endpointTest = await this.testEndpoint(fullUrl, method, validatedConfig);
            results.endpoints.push(endpointTest);
          }
        }
      }

      // 计算汇总统计
      this.updateTestProgress(testId, 90, '计算测试结果');
      results.summary = this.calculateSummary(results.endpoints);
      results.summary.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '测试完成');
      
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
   * 测试单个端点
   */
  async testEndpoint(url, method, config) {
    const startTime = Date.now();
    
    try {
      const axiosConfig = {
        method: method.toLowerCase(),
        url,
        timeout: config.timeout,
        headers: { ...config.headers },
        validateStatus: () => true // 接受所有状态码
      };

      // 添加认证
      if (config.authentication) {
        this.addAuthentication(axiosConfig, config.authentication);
      }

      const response = await axios(axiosConfig);
      const responseTime = Date.now() - startTime;

      return {
        url,
        method,
        status: 'passed',
        statusCode: response.status,
        responseTime,
        headers: response.headers,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'] || response.data?.length || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        url,
        method,
        status: 'failed',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 添加认证信息
   */
  addAuthentication(axiosConfig, auth) {
    switch (auth.type) {
      case 'bearer':
        axiosConfig.headers.Authorization = `Bearer ${auth.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        axiosConfig.headers.Authorization = `Basic ${credentials}`;
        break;
      case 'apikey':
        const headerName = auth.apiKeyHeader || 'X-API-Key';
        axiosConfig.headers[headerName] = auth.apiKey;
        break;
    }
  }

  /**
   * 构建完整URL
   */
  buildUrl(baseUrl, endpoint) {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return base + path;
  }

  /**
   * 计算汇总统计
   */
  calculateSummary(endpoints) {
    const total = endpoints.length;
    const passed = endpoints.filter(e => e.status === 'passed').length;
    const failed = total - passed;
    
    const responseTimes = endpoints
      .filter(e => e.responseTime)
      .map(e => e.responseTime);
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      total,
      passed,
      failed,
      avgResponseTime: Math.round(avgResponseTime),
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
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
      console.log(`[API-${testId}] ${progress}% - ${message}`);
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
}

module.exports = ApiTestEngine;