const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

class InfrastructureTestEngine {
  constructor() {
    this.testResults = {
      dns: {},
      connectivity: {},
      server: {},
      cdn: {},
      monitoring: {},
      score: 0,
      recommendations: []
    };
  }

  async runInfrastructureTest(url, config = {}) {
    console.log(`开始基础设施测试: ${url}`);

    try {
      const urlObj = new URL(url);

      // 1. DNS 解析测试
      await this.testDNSResolution(urlObj.hostname);

      // 2. 连接性测试
      await this.testConnectivity(urlObj);

      // 3. 服务器信息检测
      await this.testServerInfo(url);

      // 4. CDN 检测
      await this.testCDNUsage(url);

      // 5. 监控和健康检查
      await this.testMonitoring(url);

      // 6. 计算基础设施评分
      this.calculateInfrastructureScore();

      return {
        success: true,
        results: this.testResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('基础设施测试失败:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testDNSResolution(hostname) {
    try {
      const startTime = Date.now();

      // DNS 查询
      const [ipv4, ipv6] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname)
      ]);

      const resolutionTime = Date.now() - startTime;

      // MX 记录
      const mx = await dns.resolveMx(hostname).catch(() => []);

      // TXT 记录
      const txt = await dns.resolveTxt(hostname).catch(() => []);

      this.testResults.dns = {
        hostname,
        resolutionTime,
        ipv4: ipv4.status === 'fulfilled' ? ipv4.value : null,
        ipv6: ipv6.status === 'fulfilled' ? ipv6.value : null,
        mx: mx,
        txt: txt,
        score: this.calculateDNSScore(resolutionTime, ipv4.status, ipv6.status)
      };

    } catch (error) {
      this.testResults.dns = {
        error: error.message,
        score: 0
      };
    }
  }

  async testConnectivity(urlObj) {
    const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);

    try {
      const connectivityTests = await Promise.allSettled([
        this.testTCPConnection(urlObj.hostname, port),
        this.testHTTPConnection(urlObj.href),
        this.testLatency(urlObj.hostname, port)
      ]);

      this.testResults.connectivity = {
        tcp: connectivityTests[0].status === 'fulfilled' ? connectivityTests[0].value : null,
        http: connectivityTests[1].status === 'fulfilled' ? connectivityTests[1].value : null,
        latency: connectivityTests[2].status === 'fulfilled' ? connectivityTests[2].value : null,
        score: this.calculateConnectivityScore(connectivityTests)
      };

    } catch (error) {
      this.testResults.connectivity = {
        error: error.message,
        score: 0
      };
    }
  }

  async testTCPConnection(hostname, port) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(10000);

      socket.connect(port, hostname, () => {
        const connectionTime = Date.now() - startTime;
        socket.destroy();
        resolve({
          success: true,
          connectionTime,
          port
        });
      });

      socket.on('error', (error) => {
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  async testHTTPConnection(url) {
    const startTime = Date.now();

    try {
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        statusCode: response.status,
        headers: response.headers
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async testLatency(hostname, port) {
    const tests = [];

    // 进行5次延迟测试
    for (let i = 0; i < 5; i++) {
      try {
        const startTime = Date.now();
        const socket = new net.Socket();

        await new Promise((resolve, reject) => {
          socket.setTimeout(5000);

          socket.connect(port, hostname, () => {
            const latency = Date.now() - startTime;
            socket.destroy();
            tests.push(latency);
            resolve();
          });

          socket.on('error', reject);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout'));
          });
        });

      } catch (error) {
        // 忽略单次测试失败
      }
    }

    if (tests.length === 0) {
      throw new Error('All latency tests failed');
    }

    const avgLatency = tests.reduce((a, b) => a + b, 0) / tests.length;
    const minLatency = Math.min(...tests);
    const maxLatency = Math.max(...tests);

    return {
      average: Math.round(avgLatency),
      min: minLatency,
      max: maxLatency,
      tests: tests.length
    };
  }

  async testServerInfo(url) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      const headers = response.headers;

      this.testResults.server = {
        server: headers.server || 'Unknown',
        poweredBy: headers['x-powered-by'] || null,
        cloudflare: headers['cf-ray'] ? true : false,
        loadBalancer: this.detectLoadBalancer(headers),
        caching: this.detectCaching(headers),
        compression: headers['content-encoding'] || null,
        score: this.calculateServerScore(headers)
      };

    } catch (error) {
      this.testResults.server = {
        error: error.message,
        score: 0
      };
    }
  }

  async testCDNUsage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      const headers = response.headers;
      const cdnIndicators = {
        cloudflare: headers['cf-ray'] || headers['cf-cache-status'],
        cloudfront: headers['x-amz-cf-id'],
        fastly: headers['fastly-debug-digest'],
        maxcdn: headers['x-maxcdn-cache'],
        keycdn: headers['x-keycdn-cache'],
        generic: headers['x-cache'] || headers['x-served-by']
      };

      const detectedCDNs = Object.entries(cdnIndicators)
        .filter(([, value]) => value)
        .map(([name]) => name);

      this.testResults.cdn = {
        detected: detectedCDNs,
        hasCDN: detectedCDNs.length > 0,
        cacheStatus: headers['x-cache-status'] || headers['cf-cache-status'] || 'unknown',
        score: detectedCDNs.length > 0 ? 100 : 0
      };

    } catch (error) {
      this.testResults.cdn = {
        error: error.message,
        score: 0
      };
    }
  }

  async testMonitoring(url) {
    try {
      // 检查常见的监控和健康检查端点
      const monitoringEndpoints = [
        '/health',
        '/healthcheck',
        '/status',
        '/ping',
        '/.well-known/health-check'
      ];

      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      const healthChecks = await Promise.allSettled(
        monitoringEndpoints.map(endpoint =>
          axios.get(`${baseUrl}${endpoint}`, {
            timeout: 5000,
            validateStatus: () => true
          })
        )
      );

      const availableEndpoints = healthChecks
        .map((result, index) => ({
          endpoint: monitoringEndpoints[index],
          available: result.status === 'fulfilled' && result.value.status < 400
        }))
        .filter(item => item.available);

      this.testResults.monitoring = {
        healthCheckEndpoints: availableEndpoints,
        hasHealthCheck: availableEndpoints.length > 0,
        uptime: await this.estimateUptime(url),
        score: availableEndpoints.length > 0 ? 80 : 20
      };

    } catch (error) {
      this.testResults.monitoring = {
        error: error.message,
        score: 0
      };
    }
  }

  async estimateUptime(url) {
    // 简单的可用性检查
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      return {
        status: response.status < 400 ? 'up' : 'down',
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || null
      };

    } catch (error) {
      return {
        status: 'down',
        error: error.message
      };
    }
  }

  detectLoadBalancer(headers) {
    const lbIndicators = [
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'x-load-balancer'
    ];

    return lbIndicators.some(header => headers[header]);
  }

  detectCaching(headers) {
    const cacheHeaders = [
      'cache-control',
      'expires',
      'etag',
      'last-modified'
    ];

    return cacheHeaders.some(header => headers[header]);
  }

  calculateDNSScore(resolutionTime, ipv4Status, ipv6Status) {
    let score = 100;

    // DNS 解析时间评分
    if (resolutionTime > 1000) score -= 30;
    else if (resolutionTime > 500) score -= 15;

    // IPv4 支持
    if (ipv4Status !== 'fulfilled') score -= 40;

    // IPv6 支持（加分项）
    if (ipv6Status === 'fulfilled') score += 10;

    return Math.max(0, Math.min(100, score));
  }

  calculateConnectivityScore(tests) {
    let score = 0;
    let validTests = 0;

    tests.forEach(test => {
      if (test.status === 'fulfilled') {
        validTests++;
        if (test.value.success) {
          score += 33.33;
        }
      }
    });

    return validTests > 0 ? Math.round(score) : 0;
  }

  calculateServerScore(headers) {
    let score = 50; // 基础分

    // 服务器信息隐藏（安全性）
    if (!headers.server || headers.server === 'Unknown') score += 20;

    // 压缩支持
    if (headers['content-encoding']) score += 15;

    // 缓存配置
    if (headers['cache-control'] || headers['expires']) score += 15;

    return Math.min(100, score);
  }

  calculateInfrastructureScore() {
    const weights = {
      dns: 0.2,
      connectivity: 0.3,
      server: 0.2,
      cdn: 0.15,
      monitoring: 0.15
    };

    let totalScore = 0;

    totalScore += (this.testResults.dns.score || 0) * weights.dns;
    totalScore += (this.testResults.connectivity.score || 0) * weights.connectivity;
    totalScore += (this.testResults.server.score || 0) * weights.server;
    totalScore += (this.testResults.cdn.score || 0) * weights.cdn;
    totalScore += (this.testResults.monitoring.score || 0) * weights.monitoring;

    this.testResults.score = Math.round(totalScore);

    // 生成建议
    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.dns.score < 70) {
      recommendations.push({
        priority: 'medium',
        title: '优化DNS配置',
        description: 'DNS解析速度较慢，建议使用更快的DNS服务商或配置DNS缓存'
      });
    }

    if (!this.testResults.cdn.hasCDN) {
      recommendations.push({
        priority: 'high',
        title: '使用CDN服务',
        description: '建议使用CDN来提高全球访问速度和可用性'
      });
    }

    if (!this.testResults.monitoring.hasHealthCheck) {
      recommendations.push({
        priority: 'medium',
        title: '添加健康检查',
        description: '建议添加健康检查端点以便监控服务状态'
      });
    }

    if (this.testResults.connectivity.score < 80) {
      recommendations.push({
        priority: 'high',
        title: '改善网络连接',
        description: '网络连接存在问题，建议检查服务器配置和网络设置'
      });
    }

    this.testResults.recommendations = recommendations;
  }
}

module.exports = InfrastructureTestEngine;
