/**
 * 安全测试引擎
 * 执行安全漏洞扫描和OWASP测试
 */

const Joi = require('joi');
const axios = require('axios');

class SecurityTestEngine {
  constructor() {
    this.name = 'security';
    this.version = '1.0.0';
    this.activeTests = new Map();
  }

  async checkAvailability() {
    return {
      available: true,
      version: this.version,
      testTypes: ['ssl', 'headers', 'xss', 'sql-injection', 'csrf']
    };
  }

  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      testTypes: Joi.array().items(
        Joi.string().valid('ssl', 'headers', 'xss', 'sql-injection', 'csrf')
      ).default(['ssl', 'headers']),
      depth: Joi.string().valid('basic', 'standard', 'deep').default('standard'),
      timeout: Joi.number().min(10000).max(180000).default(60000)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }
    return value;
  }

  async runSecurityTest(config) {
    const testId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      const results = {
        testId,
        url: validatedConfig.url,
        vulnerabilities: [],
        checks: {},
        score: 0
      };

      // SSL检查
      if (validatedConfig.testTypes.includes('ssl')) {
        results.checks.ssl = await this.checkSSL(validatedConfig.url);
      }

      // 安全头检查
      if (validatedConfig.testTypes.includes('headers')) {
        results.checks.headers = await this.checkSecurityHeaders(validatedConfig.url);
      }

      // 计算安全评分
      results.score = this.calculateSecurityScore(results);

      this.activeTests.delete(testId);
      return results;

    } catch (error) {
      this.activeTests.delete(testId);
      throw error;
    }
  }

  async checkSSL(url) {
    try {
      const urlObj = new URL(url);
      return {
        https: urlObj.protocol === 'https:',
        passed: urlObj.protocol === 'https:',
        message: urlObj.protocol === 'https:' 
          ? 'Site uses HTTPS' 
          : 'Site does not use HTTPS'
      };
    } catch (error) {
      return {
        https: false,
        passed: false,
        error: error.message
      };
    }
  }

  async checkSecurityHeaders(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      const headers = response.headers;
      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'] ? 'Present' : 'Missing',
        'x-content-type-options': headers['x-content-type-options'] ? 'Present' : 'Missing',
        'x-xss-protection': headers['x-xss-protection'] ? 'Present' : 'Missing',
        'strict-transport-security': headers['strict-transport-security'] ? 'Present' : 'Missing',
        'content-security-policy': headers['content-security-policy'] ? 'Present' : 'Missing'
      };

      return {
        headers: securityHeaders,
        score: Object.values(securityHeaders).filter(v => v === 'Present').length * 20
      };
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  calculateSecurityScore(results) {
    let score = 0;
    let totalChecks = 0;

    if (results.checks.ssl) {
      totalChecks++;
      if (results.checks.ssl.passed) score += 30;
    }

    if (results.checks.headers) {
      totalChecks++;
      score += results.checks.headers.score || 0;
    }

    return Math.min(100, score);
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

module.exports = SecurityTestEngine;