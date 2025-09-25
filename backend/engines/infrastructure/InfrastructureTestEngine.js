/**
 * 基础设施测试工具
 * 真实实现服务器健康检查、网络连接、DNS解析等基础设施测试
 */

const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');
const Joi = require('joi');

class InfrastructureTestEngine {
  constructor() {
    this.name = 'infrastructure';
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
        Joi.string().valid('connectivity', 'dns', 'ssl', 'ports', 'headers', 'redirects')
      ).default(['connectivity', 'dns', 'ssl']),
      timeout: Joi.number().min(5000).max(60000).default(30000),
      ports: Joi.array().items(Joi.number().min(1).max(65535)).default([80, 443]),
      dnsServers: Joi.array().items(Joi.string().ip()).optional(),
      maxRedirects: Joi.number().min(0).max(10).default(5)
    });

    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
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
      // 测试DNS解析
      await dns.resolve('google.com', 'A');

      // 测试HTTP请求
      const response = await axios.get('https://httpbin.org/status/200', {
        timeout: 5000
      });

      return {
        available: response.status === 200,
        version: {
          axios: require('axios/package.json').version,
          node: process.version
        },
        dependencies: ['axios', 'dns', 'net']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['axios', 'dns', 'net']
      };
    }
  }

  /**
   * 执行基础设施测试
   */
  async runInfrastructureTest(config) {
    const testId = `infra_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 10, '开始基础设施测试');

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

      // 执行各项基础设施检查
      for (const check of validatedConfig.checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

        switch (check) {
          case 'connectivity':
            results.checks.connectivity = await this.checkConnectivity(validatedConfig.url, validatedConfig.timeout);
            break;
          case 'dns':
            results.checks.dns = await this.checkDNS(validatedConfig.url, validatedConfig.dnsServers);
            break;
          case 'ssl':
            results.checks.ssl = await this.checkSSL(validatedConfig.url);
            break;
          case 'ports':
            results.checks.ports = await this.checkPorts(validatedConfig.url, validatedConfig.ports);
            break;
          case 'headers':
            results.checks.headers = await this.checkHeaders(validatedConfig.url, validatedConfig.timeout);
            break;
          case 'redirects':
            results.checks.redirects = await this.checkRedirects(validatedConfig.url, validatedConfig.maxRedirects);
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算基础设施评分');

      // 计算总体评分
      results.summary = this.calculateInfrastructureScore(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '基础设施测试完成');

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
   * 检查网络连接性
   */
  async checkConnectivity(url, timeout) {
    try {
      const startTime = Date.now();

      const response = await axios.get(url, {
        timeout,
        validateStatus: () => true, // 接受所有状态码
        maxRedirects: 0
      });

      const responseTime = Date.now() - startTime;

      return {
        status: response.status < 400 ? 'passed' : 'warning',
        message: `HTTP连接成功，状态码: ${response.status}`,
        score: response.status < 400 ? 100 : 70,
        details: {
          statusCode: response.status,
          responseTime,
          headers: {
            server: response.headers.server,
            'content-type': response.headers['content-type'],
            'content-length': response.headers['content-length']
          }
        }
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `连接失败: ${error.message}`,
        score: 0,
        details: {
          error: error.message,
          code: error.code
        }
      };
    }
  }

  /**
   * 检查DNS解析
   */
  async checkDNS(url, customServers) {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      const results = {
        hostname,
        records: {},
        responseTime: 0,
        issues: []
      };

      const startTime = Date.now();

      // 解析A记录
      try {
        results.records.A = await dns.resolve(hostname, 'A');
      } catch (error) {
        results.issues.push(`A记录解析失败: ${error.message}`);
      }

      // 解析AAAA记录（IPv6）
      try {
        results.records.AAAA = await dns.resolve(hostname, 'AAAA');
      } catch (error) {
        // IPv6不是必需的，不算错误
      }

      // 解析CNAME记录
      try {
        results.records.CNAME = await dns.resolve(hostname, 'CNAME');
      } catch (error) {
        // CNAME不是必需的
      }

      // 解析MX记录
      try {
        results.records.MX = await dns.resolve(hostname, 'MX');
      } catch (error) {
        // MX不是必需的
      }

      results.responseTime = Date.now() - startTime;

      let score = 100;
      if (results.issues.length > 0) {
        score = Math.max(0, 100 - (results.issues.length * 25));
      }

      return {
        status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
        message: `DNS解析${results.issues.length === 0 ? '成功' : '部分成功'}`,
        score,
        details: results
      };

    } catch (error) {
      return {
        status: 'failed',
        message: `DNS解析失败: ${error.message}`,
        score: 0,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * 检查端口连接
   */
  async checkPorts(url, ports) {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    const results = {
      hostname,
      ports: [],
      openPorts: 0,
      closedPorts: 0
    };

    for (const port of ports) {
      const portResult = await this.checkSinglePort(hostname, port);
      results.ports.push(portResult);

      if (portResult.open) {
        results.openPorts++;
      } else {
        results.closedPorts++;
      }
    }

    const score = Math.round((results.openPorts / ports.length) * 100);

    return {
      status: score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      message: `${results.openPorts}/${ports.length} 端口开放`,
      score,
      details: results
    };
  }

  /**
   * 检查单个端口
   */
  checkSinglePort(hostname, port, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      const onConnect = () => {
        socket.destroy();
        resolve({
          port,
          open: true,
          responseTime: Date.now() - startTime
        });
      };

      const onError = (error) => {
        socket.destroy();
        resolve({
          port,
          open: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      };

      socket.setTimeout(timeout);
      socket.on('connect', onConnect);
      socket.on('error', onError);
      socket.on('timeout', onError);

      socket.connect(port, hostname);
    });
  }

  /**
   * 计算基础设施评分
   */
  calculateInfrastructureScore(checks) {
    let totalScore = 0;
    let totalChecks = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    Object.values(checks).forEach(check => {
      totalChecks++;
      totalScore += check.score;

      switch (check.status) {
        case 'passed':
          passed++;
          break;
        case 'warning':
          warnings++;
          break;
        case 'failed':
          failed++;
          break;
      }
    });

    const averageScore = totalChecks > 0 ? Math.round(totalScore / totalChecks) : 0;

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      score: averageScore,
      status: averageScore >= 80 ? 'healthy' : averageScore >= 60 ? 'warning' : 'critical'
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

module.exports = InfrastructureTestEngine;