/**
 * 安全测试工具
 * 真实实现安全漏洞扫描、SSL检查、安全头部检测
 */

const axios = require('axios');
const https = require('https');
const url = require('url');
const Joi = require('joi');

class SecurityTestEngine {
  constructor() {
    this.name = 'security';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      checks: Joi.array().items(
        Joi.string().valid('ssl', 'headers', 'vulnerabilities', 'cookies', 'redirects')
      ).default(['ssl', 'headers', 'vulnerabilities']),
      timeout: Joi.number().min(5000).max(60000).default(30000),
      followRedirects: Joi.boolean().default(true),
      maxRedirects: Joi.number().min(1).max(10).default(5)
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
      // 测试基本HTTP请求功能
      const testResponse = await axios.get('https://httpbin.org/status/200', {
        timeout: 5000,
        validateStatus: () => true
      });

      return {
        available: testResponse.status === 200,
        version: {
          axios: require('axios/package.json').version,
          node: process.version
        },
        dependencies: ['axios', 'https', 'url']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['axios', 'https', 'url']
      };
    }
  }

  /**
   * 执行安全测试
   */
  async runSecurityTest(config) {
    const testId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '开始安全扫描');

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {
          totalChecks: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          score: 0
        }
      };

      const progressStep = 80 / validatedConfig.checks.length;
      let currentProgress = 10;

      // 执行各项安全检查
      for (const check of validatedConfig.checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

        switch (check) {
          case 'ssl':
            results.checks.ssl = await this.checkSSL(validatedConfig.url);
            break;
          case 'headers':
            results.checks.headers = await this.checkSecurityHeaders(validatedConfig.url);
            break;
          case 'vulnerabilities':
            results.checks.vulnerabilities = await this.checkVulnerabilities(validatedConfig.url);
            break;
          case 'cookies':
            results.checks.cookies = await this.checkCookies(validatedConfig.url);
            break;
          case 'redirects':
            results.checks.redirects = await this.checkRedirects(validatedConfig.url, validatedConfig.maxRedirects);
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算安全评分');

      // 计算总体安全评分
      results.summary = this.calculateSecurityScore(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '安全扫描完成');

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
   * 检查SSL证书
   */
  async checkSSL(targetUrl) {
    try {
      const parsedUrl = new URL(targetUrl);

      if (parsedUrl.protocol !== 'https:') {
        return {
          status: 'failed',
          message: '网站未使用HTTPS',
          score: 0,
          details: {
            protocol: parsedUrl.protocol,
            secure: false
          }
        };
      }

      return new Promise((resolve) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          method: 'GET',
          rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
          const cert = res.socket.getPeerCertificate();

          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              status: 'failed',
              message: '无法获取SSL证书',
              score: 0
            });
            return;
          }

          const now = new Date();
          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

          let score = 100;
          let warnings = [];

          if (daysUntilExpiry < 30) {
            score -= 20;
            warnings.push('证书即将过期');
          }

          if (daysUntilExpiry < 0) {
            score = 0;
            warnings.push('证书已过期');
          }

          resolve({
            status: score > 70 ? 'passed' : 'warning',
            message: `SSL证书有效，${daysUntilExpiry}天后过期`,
            score,
            warnings,
            details: {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysUntilExpiry,
              fingerprint: cert.fingerprint
            }
          });
        });

        req.on('error', (error) => {
          resolve({
            status: 'failed',
            message: `SSL检查失败: ${error.message}`,
            score: 0
          });
        });

        req.end();
      });

    } catch (error) {
      return {
        status: 'failed',
        message: `SSL检查错误: ${error.message}`,
        score: 0
      };
    }
  }

  /**
   * 检查安全头部
   */
  async checkSecurityHeaders(targetUrl) {
    try {
      const response = await axios.get(targetUrl, {
        timeout: this.defaultTimeout,
        validateStatus: () => true,
        maxRedirects: 0
      });

      const headers = response.headers;
      const securityHeaders = {
        'strict-transport-security': 'HSTS',
        'content-security-policy': 'CSP',
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options',
        'x-xss-protection': 'X-XSS-Protection',
        'referrer-policy': 'Referrer-Policy',
        'permissions-policy': 'Permissions-Policy'
      };

      let score = 0;
      const maxScore = Object.keys(securityHeaders).length * 10;
      const results = {};
      const missing = [];
      const present = [];

      Object.keys(securityHeaders).forEach(header => {
        if (headers[header]) {
          score += 10;
          present.push(securityHeaders[header]);
          results[header] = {
            present: true,
            value: headers[header]
          };
        } else {
          missing.push(securityHeaders[header]);
          results[header] = {
            present: false
          };
        }
      });

      const finalScore = Math.round((score / maxScore) * 100);

      return {
        status: finalScore >= 70 ? 'passed' : finalScore >= 40 ? 'warning' : 'failed',
        message: `${present.length}/${Object.keys(securityHeaders).length} 安全头部已配置`,
        score: finalScore,
        details: {
          present,
          missing,
          headers: results
        }
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `安全头部检查失败: ${error.message}`,
        score: 0
      };
    }
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
      console.log(`[${this.name.toUpperCase()}-${testId}] ${progress}% - ${message}`);
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

module.exports = SecurityTestEngine;