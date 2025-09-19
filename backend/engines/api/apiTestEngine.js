/**
 * API测试引擎
 * 负责REST API端点测试、负载测试和API文档验证
 */

const Joi = require('joi');
const axios = require('axios');

class ApiTestEngine {
  constructor() {
    this.name = 'api';
    this.version = '1.0.0';
    this.activeTests = new Map();
  }

  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      dependencies: ['axios', 'joi']
    };
  }

  async runApiTest(config) {
    const testId = `api_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      // 执行API测试
      const results = await this.performApiTests(validatedConfig);
      
      this.activeTests.delete(testId);
      
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };
    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      endpoints: Joi.array().items(Joi.string()).default([]),
      methods: Joi.array().items(Joi.string().valid('GET', 'POST', 'PUT', 'DELETE')).default(['GET']),
      timeout: Joi.number().min(1000).max(60000).default(30000)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async performApiTests(config) {
    const results = {
      url: config.url,
      endpoints: [],
      summary: {
        total: 0,
        success: 0,
        failed: 0
      }
    };

    for (const endpoint of config.endpoints) {
      for (const method of config.methods) {
        try {
          const response = await axios({
            method,
            url: `${config.url}${endpoint}`,
            timeout: config.timeout
          });

          results.endpoints.push({
            endpoint,
            method,
            status: response.status,
            success: true,
            responseTime: response.headers['x-response-time'] || 'N/A'
          });

          results.summary.success++;
        } catch (error) {
          results.endpoints.push({
            endpoint,
            method,
            status: error.response?.status || 0,
            success: false,
            error: error.message
          });

          results.summary.failed++;
        }
        results.summary.total++;
      }
    }

    return results;
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

module.exports = ApiTestEngine;