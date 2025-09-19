/**
 * 压力测试引擎
 * 执行负载测试和并发测试
 */

const Joi = require('joi');
const http = require('http');
const https = require('https');

class StressTestEngine {
  constructor() {
    this.name = 'stress';
    this.version = '1.0.0';
    this.activeTests = new Map();
  }

  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      maxConcurrent: 1000,
      testTypes: ['load', 'spike', 'endurance']
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      duration: Joi.number().min(1000).max(300000).default(10000),
      concurrent: Joi.number().min(1).max(1000).default(10),
      rampUp: Joi.number().min(0).max(60000).default(1000),
      testType: Joi.string().valid('load', 'spike', 'endurance').default('load')
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runStressTest(config) {
    const testId = `stress_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
        results: {
          requests: 0,
          errors: 0,
          totalTime: 0,
          responseTimes: []
        }
      });

      const results = await this.performLoadTest(testId, validatedConfig);
      
      this.activeTests.delete(testId);
      return results;

    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  async performLoadTest(testId, config) {
    const testData = this.activeTests.get(testId);
    const promises = [];
    const startTime = Date.now();

    // 创建并发请求
    for (let i = 0; i < config.concurrent; i++) {
      // 实现渐进式增加负载
      const delay = (config.rampUp / config.concurrent) * i;
      
      const promise = new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));
        
        while (Date.now() - startTime < config.duration) {
          const reqStartTime = Date.now();
          
          try {
            await this.makeRequest(config.url);
            const responseTime = Date.now() - reqStartTime;
            
            testData.results.requests++;
            testData.results.responseTimes.push(responseTime);
          } catch (error) {
            testData.results.errors++;
          }
          
          // 短暂延迟避免过度请求
          await new Promise(r => setTimeout(r, 100));
        }
        
        resolve();
      });
      
      promises.push(promise);
    }

    await Promise.all(promises);

    // 计算统计数据
    const responseTimes = testData.results.responseTimes;
    const stats = {
      testId,
      duration: Date.now() - startTime,
      totalRequests: testData.results.requests,
      errors: testData.results.errors,
      successRate: ((testData.results.requests - testData.results.errors) / testData.results.requests * 100).toFixed(2),
      avgResponseTime: responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
        : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: (testData.results.requests / ((Date.now() - startTime) / 1000)).toFixed(2)
    };

    return stats;
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });
    });
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

module.exports = StressTestEngine;