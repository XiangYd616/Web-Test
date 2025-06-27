/**
 * 真实的网络测试引擎 - 进行真实的网络连通性和性能测试
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const dns = require('dns');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const execAsync = promisify(exec);
const dnsLookupAsync = promisify(dns.lookup);
const dnsResolveAsync = promisify(dns.resolve);

class RealNetworkTestEngine {
  constructor() {
    this.name = 'real-network-test-engine';
    this.version = '1.0.0';
  }

  /**
   * 运行真实的网络测试
   */
  async runNetworkTest(config) {
    const {
      targets = [], // 目标主机列表
      testTypes = ['ping', 'traceroute', 'dns', 'port', 'bandwidth'],
      timeout = 30000,
      pingCount = 4,
      maxHops = 30,
      ports = [80, 443, 22, 21, 25, 53, 110, 993, 995],
      dnsServers = ['8.8.8.8', '1.1.1.1', '114.114.114.114'],
      bandwidthTestUrl = 'http://speedtest.ftp.otenet.gr/files/test1Mb.db'
    } = config;

    console.log(`🌐 Starting real network test for ${targets.length} targets`);

    const testId = `network-${Date.now()}`;
    const startTime = Date.now();
    
    const results = {
      testId,
      targets,
      config,
      startTime: new Date(startTime).toISOString(),
      status: 'running',
      summary: {
        totalTargets: targets.length,
        reachableTargets: 0,
        unreachableTargets: 0,
        averageLatency: 0,
        overallScore: 0
      },
      targetResults: [],
      networkDiagnostics: {
        dnsResolution: {},
        routingAnalysis: {},
        portScanning: {},
        bandwidthTest: {}
      },
      recommendations: []
    };

    try {
      // 并行测试所有目标
      const targetTests = targets.map(target => 
        this.testTarget(target, config)
      );

      const targetResults = await Promise.all(targetTests);
      results.targetResults = targetResults;

      // 计算汇总统计
      this.calculateSummaryStats(results);

      // 网络诊断
      if (testTypes.includes('dns')) {
        console.log(`🔍 Running DNS diagnostics...`);
        results.networkDiagnostics.dnsResolution = await this.testDNSResolution(targets, dnsServers);
      }

      if (testTypes.includes('port')) {
        console.log(`🔌 Running port scanning...`);
        results.networkDiagnostics.portScanning = await this.testPortConnectivity(targets, ports);
      }

      if (testTypes.includes('bandwidth')) {
        console.log(`📊 Running bandwidth test...`);
        results.networkDiagnostics.bandwidthTest = await this.testBandwidth(bandwidthTestUrl);
      }

      // 生成建议
      this.generateRecommendations(results);

      // 计算总体分数
      results.summary.overallScore = this.calculateOverallScore(results);

      results.status = 'completed';
      results.endTime = new Date().toISOString();
      results.actualDuration = (Date.now() - startTime) / 1000;

      console.log(`✅ Network test completed. Score: ${Math.round(results.summary.overallScore)}`);
      
      return { success: true, data: results };

    } catch (error) {
      console.error(`❌ Network test failed:`, error);
      results.status = 'failed';
      results.error = error.message;
      results.endTime = new Date().toISOString();
      
      return { 
        success: false, 
        error: error.message,
        data: results 
      };
    }
  }

  /**
   * 测试单个目标
   */
  async testTarget(target, config) {
    const result = {
      target,
      reachable: false,
      latency: 0,
      packetLoss: 0,
      tests: {
        ping: null,
        traceroute: null,
        dns: null,
        httpConnectivity: null
      }
    };

    try {
      // Ping测试
      if (config.testTypes.includes('ping')) {
        result.tests.ping = await this.pingTest(target, config.pingCount);
        result.reachable = result.tests.ping.success;
        result.latency = result.tests.ping.averageLatency;
        result.packetLoss = result.tests.ping.packetLoss;
      }

      // DNS解析测试
      if (config.testTypes.includes('dns')) {
        result.tests.dns = await this.dnsTest(target);
      }

      // HTTP连通性测试
      if (config.testTypes.includes('http')) {
        result.tests.httpConnectivity = await this.httpConnectivityTest(target);
      }

      // Traceroute测试
      if (config.testTypes.includes('traceroute') && result.reachable) {
        result.tests.traceroute = await this.tracerouteTest(target, config.maxHops);
      }

    } catch (error) {
      console.error(`Target test failed for ${target}:`, error);
      result.error = error.message;
    }

    return result;
  }

  /**
   * Ping测试
   */
  async pingTest(target, count = 4) {
    try {
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows 
        ? `ping -n ${count} ${target}`
        : `ping -c ${count} ${target}`;

      const { stdout, stderr } = await execAsync(pingCmd);
      
      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      // 解析ping结果
      const result = this.parsePingOutput(stdout, isWindows);
      return {
        success: true,
        output: stdout,
        ...result
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        averageLatency: 0,
        packetLoss: 100
      };
    }
  }

  /**
   * 解析Ping输出
   */
  parsePingOutput(output, isWindows) {
    const result = {
      averageLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      packetLoss: 0
    };

    try {
      if (isWindows) {
        // Windows ping输出解析
        const lossMatch = output.match(/\((\d+)% loss\)/);
        if (lossMatch) {
          result.packetLoss = parseInt(lossMatch[1]);
        }

        const timeMatch = output.match(/Average = (\d+)ms/);
        if (timeMatch) {
          result.averageLatency = parseInt(timeMatch[1]);
        }
      } else {
        // Linux/Mac ping输出解析
        const lossMatch = output.match(/(\d+)% packet loss/);
        if (lossMatch) {
          result.packetLoss = parseInt(lossMatch[1]);
        }

        const statsMatch = output.match(/min\/avg\/max\/stddev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/);
        if (statsMatch) {
          result.minLatency = parseFloat(statsMatch[1]);
          result.averageLatency = parseFloat(statsMatch[2]);
          result.maxLatency = parseFloat(statsMatch[3]);
        }
      }
    } catch (error) {
      console.error('Failed to parse ping output:', error);
    }

    return result;
  }

  /**
   * DNS测试
   */
  async dnsTest(target) {
    try {
      const startTime = Date.now();
      const result = await dnsLookupAsync(target);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        ipAddress: result.address,
        family: result.family,
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: 0
      };
    }
  }

  /**
   * HTTP连通性测试
   */
  async httpConnectivityTest(target) {
    const testUrls = [
      `http://${target}`,
      `https://${target}`
    ];

    const results = [];

    for (const url of testUrls) {
      try {
        const result = await this.testHttpUrl(url);
        results.push(result);
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error.message,
          responseTime: 0,
          statusCode: 0
        });
      }
    }

    return {
      results,
      httpAvailable: results.some(r => r.success && r.statusCode < 400),
      httpsAvailable: results.some(r => r.success && r.url.startsWith('https'))
    };
  }

  /**
   * 测试HTTP URL
   */
  async testHttpUrl(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'HEAD',
        timeout: 10000
      }, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          url,
          success: true,
          statusCode: res.statusCode,
          responseTime,
          headers: res.headers
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Traceroute测试
   */
  async tracerouteTest(target, maxHops = 30) {
    try {
      const isWindows = process.platform === 'win32';
      const traceCmd = isWindows 
        ? `tracert -h ${maxHops} ${target}`
        : `traceroute -m ${maxHops} ${target}`;

      const { stdout, stderr } = await execAsync(traceCmd);
      
      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      const hops = this.parseTracerouteOutput(stdout, isWindows);
      
      return {
        success: true,
        hops,
        hopCount: hops.length,
        output: stdout
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        hops: [],
        hopCount: 0
      };
    }
  }

  /**
   * 解析Traceroute输出
   */
  parseTracerouteOutput(output, isWindows) {
    const hops = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (isWindows) {
        // Windows tracert格式
        const match = line.match(/^\s*(\d+)\s+(.+)/);
        if (match) {
          hops.push({
            hop: parseInt(match[1]),
            details: match[2].trim()
          });
        }
      } else {
        // Linux/Mac traceroute格式
        const match = line.match(/^\s*(\d+)\s+(.+)/);
        if (match) {
          hops.push({
            hop: parseInt(match[1]),
            details: match[2].trim()
          });
        }
      }
    }

    return hops;
  }

  /**
   * DNS解析测试
   */
  async testDNSResolution(targets, dnsServers) {
    const results = {};

    for (const server of dnsServers) {
      results[server] = {
        server,
        results: [],
        averageResponseTime: 0,
        successRate: 0
      };

      const serverResults = [];

      for (const target of targets) {
        try {
          const startTime = Date.now();
          
          // 设置DNS服务器
          dns.setServers([server]);
          
          const result = await dnsLookupAsync(target);
          const responseTime = Date.now() - startTime;

          serverResults.push({
            target,
            success: true,
            ipAddress: result.address,
            responseTime
          });
        } catch (error) {
          serverResults.push({
            target,
            success: false,
            error: error.message,
            responseTime: 0
          });
        }
      }

      results[server].results = serverResults;
      
      const successfulResults = serverResults.filter(r => r.success);
      results[server].successRate = (successfulResults.length / serverResults.length) * 100;
      
      if (successfulResults.length > 0) {
        results[server].averageResponseTime = Math.round(
          successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
        );
      }
    }

    return results;
  }

  /**
   * 端口连通性测试
   */
  async testPortConnectivity(targets, ports) {
    const results = {};

    for (const target of targets) {
      results[target] = [];

      for (const port of ports) {
        try {
          const isOpen = await this.testPort(target, port);
          results[target].push({
            port,
            open: isOpen,
            service: this.getServiceName(port)
          });
        } catch (error) {
          results[target].push({
            port,
            open: false,
            error: error.message,
            service: this.getServiceName(port)
          });
        }
      }
    }

    return results;
  }

  /**
   * 测试单个端口
   */
  async testPort(host, port, timeout = 5000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }

  /**
   * 获取服务名称
   */
  getServiceName(port) {
    const services = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S'
    };
    
    return services[port] || 'Unknown';
  }

  /**
   * 带宽测试
   */
  async testBandwidth(testUrl) {
    try {
      const startTime = Date.now();
      
      const result = await this.downloadFile(testUrl);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // 秒
      const sizeInMB = result.size / (1024 * 1024); // MB
      const speedMbps = (sizeInMB * 8) / duration; // Mbps

      return {
        success: true,
        downloadSize: result.size,
        duration,
        speedMbps: Math.round(speedMbps * 100) / 100,
        speedMBps: Math.round((sizeInMB / duration) * 100) / 100
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        speedMbps: 0,
        speedMBps: 0
      };
    }
  }

  /**
   * 下载文件进行带宽测试
   */
  async downloadFile(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(url, (res) => {
        let size = 0;
        
        res.on('data', (chunk) => {
          size += chunk.length;
        });
        
        res.on('end', () => {
          resolve({ size });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
      
      req.end();
    });
  }

  /**
   * 计算汇总统计
   */
  calculateSummaryStats(results) {
    const targets = results.targetResults;
    
    results.summary.reachableTargets = targets.filter(t => t.reachable).length;
    results.summary.unreachableTargets = targets.filter(t => !t.reachable).length;

    const reachableTargets = targets.filter(t => t.reachable && t.latency > 0);
    if (reachableTargets.length > 0) {
      results.summary.averageLatency = Math.round(
        reachableTargets.reduce((sum, t) => sum + t.latency, 0) / reachableTargets.length
      );
    }
  }

  /**
   * 生成建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    const reachabilityRate = (results.summary.reachableTargets / results.summary.totalTargets) * 100;
    if (reachabilityRate < 80) {
      recommendations.push('检查网络连通性，部分目标无法访问');
    }

    if (results.summary.averageLatency > 200) {
      recommendations.push('网络延迟较高，考虑优化网络路径或使用CDN');
    }

    const highPacketLoss = results.targetResults.filter(t => t.packetLoss > 5);
    if (highPacketLoss.length > 0) {
      recommendations.push('部分目标存在丢包问题，检查网络质量');
    }

    if (results.networkDiagnostics.bandwidthTest?.speedMbps < 10) {
      recommendations.push('网络带宽较低，考虑升级网络连接');
    }

    results.recommendations = recommendations;
  }

  /**
   * 计算总体分数
   */
  calculateOverallScore(results) {
    let score = 100;

    // 可达性评分 (40%)
    const reachabilityRate = (results.summary.reachableTargets / results.summary.totalTargets) * 100;
    if (reachabilityRate < 50) score -= 40;
    else if (reachabilityRate < 80) score -= 20;
    else if (reachabilityRate < 95) score -= 10;

    // 延迟评分 (30%)
    if (results.summary.averageLatency > 500) score -= 30;
    else if (results.summary.averageLatency > 200) score -= 15;
    else if (results.summary.averageLatency > 100) score -= 5;

    // 丢包评分 (20%)
    const avgPacketLoss = results.targetResults.reduce((sum, t) => sum + t.packetLoss, 0) / results.targetResults.length;
    if (avgPacketLoss > 10) score -= 20;
    else if (avgPacketLoss > 5) score -= 10;
    else if (avgPacketLoss > 1) score -= 5;

    // 带宽评分 (10%)
    if (results.networkDiagnostics.bandwidthTest?.speedMbps) {
      const speed = results.networkDiagnostics.bandwidthTest.speedMbps;
      if (speed < 1) score -= 10;
      else if (speed < 10) score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 获取测试引擎状态
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      available: true,
      capabilities: [
        'Ping连通性测试',
        'DNS解析测试',
        'HTTP/HTTPS连通性测试',
        'Traceroute路径分析',
        '端口扫描',
        '带宽测试',
        '网络延迟测量',
        '丢包率检测'
      ]
    };
  }
}

module.exports = { RealNetworkTestEngine };
