/**
 * 增强的网络测试引擎
 * 提供网络拓扑分析、带宽测试、DNS解析分析、CDN性能测试等高级功能
 */

const ping = require('ping');
const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');
const { promisify } = require('util');
const { exec } = require('child_process');

class EnhancedNetworkTestEngine {
  constructor() {
    this.testResults = [];
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      concurrency: 10
    };
  }

  /**
   * 执行全面的网络测试套件
   */
  async runComprehensiveNetworkTest(targets = []) {
    const results = {
      timestamp: new Date(),
      targets: targets,
      tests: {},
      networkTopology: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      recommendations: []
    };

    try {
      // 1. 连通性测试
      results.tests.connectivity = await this.testConnectivity(targets);
      
      // 2. 延迟和丢包测试
      results.tests.latencyPacketLoss = await this.testLatencyAndPacketLoss(targets);
      
      // 3. 带宽测试
      results.tests.bandwidth = await this.testBandwidth(targets);
      
      // 4. DNS解析测试
      results.tests.dnsResolution = await this.testDNSResolution(targets);
      
      // 5. 路由跟踪分析
      results.tests.routeTracing = await this.performRouteTracing(targets);
      
      // 6. 端口扫描和服务检测
      results.tests.portScanning = await this.scanPorts(targets);
      
      // 7. HTTP/HTTPS性能测试
      results.tests.httpPerformance = await this.testHTTPPerformance(targets);
      
      // 8. SSL/TLS连接测试
      results.tests.sslTls = await this.testSSLTLS(targets);
      
      // 9. CDN性能分析
      results.tests.cdnAnalysis = await this.analyzeCDNPerformance(targets);
      
      // 10. 网络拓扑发现
      results.networkTopology = await this.discoverNetworkTopology(targets);
      
      // 11. 网络质量评估
      results.tests.networkQuality = await this.assessNetworkQuality();
      
      // 12. 防火墙和安全检测
      results.tests.firewallSecurity = await this.testFirewallAndSecurity(targets);

      // 生成总结和建议
      results.summary = this.generateSummary(results.tests);
      results.recommendations = this.generateNetworkRecommendations(results.tests);

      this.testResults = results;
      return results;

    } catch (error) {
      console.error('网络测试执行失败:', error);
      results.error = error.message;
      return results;
    }
  }

  /**
   * 测试网络连通性
   */
  async testConnectivity(targets) {
    const result = {
      name: '连通性测试',
      status: 'pending',
      targets: [],
      statistics: {
        reachable: 0,
        unreachable: 0,
        totalTested: targets.length
      }
    };

    try {
      const connectivityPromises = targets.map(async (target) => {
        const targetResult = {
          target: target,
          reachable: false,
          responseTime: null,
          error: null
        };

        try {
          const startTime = Date.now();
          const pingResult = await ping.promise.probe(target, {
            timeout: this.config.timeout / 1000,
            min_reply: 1
          });
          
          targetResult.reachable = pingResult.alive;
          targetResult.responseTime = pingResult.time === 'unknown' ? null : parseFloat(pingResult.time);
          
          if (targetResult.reachable) {
            result.statistics.reachable++;
          } else {
            result.statistics.unreachable++;
            targetResult.error = '目标不可达';
          }

        } catch (error) {
          targetResult.error = error.message;
          result.statistics.unreachable++;
        }

        return targetResult;
      });

      result.targets = await Promise.all(connectivityPromises);
      
      // 评估连通性状态
      const successRate = result.statistics.reachable / result.statistics.totalTested;
      result.status = successRate === 1 ? 'passed' : 
                     successRate >= 0.8 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试延迟和丢包率
   */
  async testLatencyAndPacketLoss(targets) {
    const result = {
      name: '延迟和丢包测试',
      status: 'pending',
      targets: [],
      overallStats: {
        avgLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        avgPacketLoss: 0
      }
    };

    try {
      const latencyPromises = targets.map(async (target) => {
        const targetResult = {
          target: target,
          latency: {
            min: null,
            max: null,
            avg: null,
            jitter: null
          },
          packetLoss: null,
          samples: []
        };

        try {
          // 进行多次ping测试以获得统计数据
          const pingCount = 10;
          const pingResults = [];
          
          for (let i = 0; i < pingCount; i++) {
            const pingResult = await ping.promise.probe(target, {
              timeout: 5,
              min_reply: 1
            });
            
            if (pingResult.alive && pingResult.time !== 'unknown') {
              pingResults.push(parseFloat(pingResult.time));
            }
          }

          if (pingResults.length > 0) {
            targetResult.latency.min = Math.min(...pingResults);
            targetResult.latency.max = Math.max(...pingResults);
            targetResult.latency.avg = pingResults.reduce((a, b) => a + b, 0) / pingResults.length;
            
            // 计算抖动 (jitter)
            const avgLatency = targetResult.latency.avg;
            const jitterSum = pingResults.reduce((sum, time) => sum + Math.abs(time - avgLatency), 0);
            targetResult.latency.jitter = jitterSum / pingResults.length;

            // 计算丢包率
            targetResult.packetLoss = ((pingCount - pingResults.length) / pingCount) * 100;
            targetResult.samples = pingResults;
          } else {
            targetResult.packetLoss = 100;
          }

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(latencyPromises);

      // 计算整体统计
      const validTargets = result.targets.filter(t => t.latency.avg !== null);
      if (validTargets.length > 0) {
        result.overallStats.avgLatency = validTargets.reduce((sum, t) => sum + t.latency.avg, 0) / validTargets.length;
        result.overallStats.minLatency = Math.min(...validTargets.map(t => t.latency.min));
        result.overallStats.maxLatency = Math.max(...validTargets.map(t => t.latency.max));
        result.overallStats.avgPacketLoss = result.targets.reduce((sum, t) => sum + (t.packetLoss || 0), 0) / result.targets.length;
      }

      // 评估网络质量
      const avgLatency = result.overallStats.avgLatency;
      const avgPacketLoss = result.overallStats.avgPacketLoss;
      
      result.status = avgLatency < 50 && avgPacketLoss < 1 ? 'passed' :
                     avgLatency < 150 && avgPacketLoss < 5 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试带宽
   */
  async testBandwidth(targets) {
    const result = {
      name: '带宽测试',
      status: 'pending',
      targets: [],
      downloadSpeed: null,
      uploadSpeed: null
    };

    try {
      // 选择支持带宽测试的目标
      const httpTargets = targets.filter(target => 
        target.startsWith('http://') || target.startsWith('https://')
      );

      if (httpTargets.length === 0) {
        result.status = 'skipped';
        result.message = '没有找到支持HTTP/HTTPS的目标进行带宽测试';
        return result;
      }

      const bandwidthPromises = httpTargets.slice(0, 3).map(async (target) => {
        const targetResult = {
          target: target,
          downloadSpeed: null,
          uploadSpeed: null,
          error: null
        };

        try {
          // 下载测试
          targetResult.downloadSpeed = await this.measureDownloadSpeed(target);
          
          // 上传测试（如果支持）
          targetResult.uploadSpeed = await this.measureUploadSpeed(target);

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(bandwidthPromises);

      // 计算平均速度
      const validDownloads = result.targets.filter(t => t.downloadSpeed !== null);
      const validUploads = result.targets.filter(t => t.uploadSpeed !== null);

      if (validDownloads.length > 0) {
        result.downloadSpeed = validDownloads.reduce((sum, t) => sum + t.downloadSpeed, 0) / validDownloads.length;
      }

      if (validUploads.length > 0) {
        result.uploadSpeed = validUploads.reduce((sum, t) => sum + t.uploadSpeed, 0) / validUploads.length;
      }

      // 评估带宽状态
      const minAcceptableDownload = 10; // 10 Mbps
      result.status = (result.downloadSpeed && result.downloadSpeed >= minAcceptableDownload) ? 'passed' : 'warning';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * DNS解析测试
   */
  async testDNSResolution(targets) {
    const result = {
      name: 'DNS解析测试',
      status: 'pending',
      targets: [],
      dnsServers: [],
      performanceStats: {
        avgResolutionTime: 0,
        minResolutionTime: Infinity,
        maxResolutionTime: 0
      }
    };

    try {
      // 获取系统DNS服务器
      result.dnsServers = await this.getDNSServers();

      const dnsPromises = targets.map(async (target) => {
        // 提取域名（如果是URL）
        let hostname = target;
        try {
          const url = new URL(target);
          hostname = url.hostname;
        } catch {
          // 如果不是URL，直接使用作为hostname
        }

        const targetResult = {
          hostname: hostname,
          originalTarget: target,
          resolution: {
            ipv4: [],
            ipv6: [],
            resolutionTime: null,
            ttl: null
          },
          dnsRecords: {},
          error: null
        };

        try {
          const startTime = Date.now();
          
          // IPv4解析
          try {
            const ipv4Addresses = await promisify(dns.resolve4)(hostname);
            targetResult.resolution.ipv4 = ipv4Addresses;
          } catch (error) {
            // IPv4解析失败，记录但不算错误
          }

          // IPv6解析
          try {
            const ipv6Addresses = await promisify(dns.resolve6)(hostname);
            targetResult.resolution.ipv6 = ipv6Addresses;
          } catch (error) {
            // IPv6解析失败，记录但不算错误
          }

          targetResult.resolution.resolutionTime = Date.now() - startTime;

          // 获取其他DNS记录
          targetResult.dnsRecords = await this.getDNSRecords(hostname);

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(dnsPromises);

      // 计算性能统计
      const validResolutions = result.targets.filter(t => t.resolution.resolutionTime !== null);
      if (validResolutions.length > 0) {
        const resolutionTimes = validResolutions.map(t => t.resolution.resolutionTime);
        result.performanceStats.avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        result.performanceStats.minResolutionTime = Math.min(...resolutionTimes);
        result.performanceStats.maxResolutionTime = Math.max(...resolutionTimes);
      }

      // 评估DNS性能
      const avgTime = result.performanceStats.avgResolutionTime;
      const failedResolutions = result.targets.filter(t => t.error !== null).length;
      
      result.status = avgTime < 100 && failedResolutions === 0 ? 'passed' :
                     avgTime < 500 && failedResolutions < targets.length * 0.2 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 执行路由跟踪
   */
  async performRouteTracing(targets) {
    const result = {
      name: '路由跟踪分析',
      status: 'pending',
      targets: [],
      networkPath: {},
      hopAnalysis: {}
    };

    try {
      const routePromises = targets.slice(0, 5).map(async (target) => {
        const targetResult = {
          target: target,
          hops: [],
          totalHops: 0,
          avgHopLatency: 0,
          pathMTU: null,
          error: null
        };

        try {
          const hops = await this.traceRoute(target);
          targetResult.hops = hops;
          targetResult.totalHops = hops.length;
          
          const validLatencies = hops.filter(h => h.latency).map(h => h.latency);
          if (validLatencies.length > 0) {
            targetResult.avgHopLatency = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
          }

          // 尝试检测路径MTU
          targetResult.pathMTU = await this.detectPathMTU(target);

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(routePromises);

      // 分析网络路径
      result.networkPath = this.analyzeNetworkPaths(result.targets);
      result.hopAnalysis = this.analyzeHops(result.targets);

      // 评估路由质量
      const avgHops = result.targets.reduce((sum, t) => sum + t.totalHops, 0) / result.targets.length;
      const failedTraces = result.targets.filter(t => t.error !== null).length;
      
      result.status = avgHops < 15 && failedTraces === 0 ? 'passed' :
                     avgHops < 25 && failedTraces < result.targets.length * 0.3 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 端口扫描和服务检测
   */
  async scanPorts(targets) {
    const result = {
      name: '端口扫描和服务检测',
      status: 'pending',
      targets: [],
      commonPorts: [21, 22, 23, 25, 53, 80, 110, 443, 993, 995, 1433, 3306, 3389, 5432, 6379],
      serviceMap: {}
    };

    try {
      const scanPromises = targets.map(async (target) => {
        // 提取主机名或IP
        let hostname = target;
        try {
          const url = new URL(target);
          hostname = url.hostname;
        } catch {
          // 不是URL，直接使用
        }

        const targetResult = {
          target: hostname,
          originalTarget: target,
          openPorts: [],
          closedPorts: [],
          services: {},
          error: null
        };

        try {
          const portScanPromises = result.commonPorts.map(async (port) => {
            const isOpen = await this.checkPort(hostname, port);
            if (isOpen) {
              targetResult.openPorts.push(port);
              
              // 尝试识别服务
              const service = await this.identifyService(hostname, port);
              if (service) {
                targetResult.services[port] = service;
              }
            } else {
              targetResult.closedPorts.push(port);
            }
          });

          await Promise.all(portScanPromises);

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(scanPromises);

      // 构建服务映射
      result.serviceMap = this.buildServiceMap(result.targets);

      // 评估安全状态
      const openPortsCount = result.targets.reduce((sum, t) => sum + t.openPorts.length, 0);
      const riskyServices = this.identifyRiskyServices(result.targets);
      
      result.status = riskyServices.length === 0 ? 'passed' :
                     riskyServices.length < 3 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * HTTP/HTTPS性能测试
   */
  async testHTTPPerformance(targets) {
    const result = {
      name: 'HTTP/HTTPS性能测试',
      status: 'pending',
      targets: [],
      overallStats: {
        avgResponseTime: 0,
        avgTTFB: 0,
        avgTotalTime: 0
      }
    };

    try {
      const httpTargets = targets.filter(target => 
        target.startsWith('http://') || target.startsWith('https://')
      );

      if (httpTargets.length === 0) {
        result.status = 'skipped';
        result.message = '没有HTTP/HTTPS目标进行测试';
        return result;
      }

      const httpPromises = httpTargets.map(async (target) => {
        const targetResult = {
          target: target,
          metrics: {
            responseTime: null,
            ttfb: null, // Time to First Byte
            totalTime: null,
            statusCode: null,
            contentLength: null,
            headers: {},
            timing: {}
          },
          error: null
        };

        try {
          const httpMetrics = await this.measureHTTPMetrics(target);
          targetResult.metrics = httpMetrics;

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(httpPromises);

      // 计算整体统计
      const validTargets = result.targets.filter(t => t.metrics.responseTime !== null);
      if (validTargets.length > 0) {
        result.overallStats.avgResponseTime = validTargets.reduce((sum, t) => sum + t.metrics.responseTime, 0) / validTargets.length;
        result.overallStats.avgTTFB = validTargets.reduce((sum, t) => sum + (t.metrics.ttfb || 0), 0) / validTargets.length;
        result.overallStats.avgTotalTime = validTargets.reduce((sum, t) => sum + (t.metrics.totalTime || 0), 0) / validTargets.length;
      }

      // 评估HTTP性能
      const avgResponseTime = result.overallStats.avgResponseTime;
      result.status = avgResponseTime < 500 ? 'passed' :
                     avgResponseTime < 2000 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * CDN性能分析
   */
  async analyzeCDNPerformance(targets) {
    const result = {
      name: 'CDN性能分析',
      status: 'pending',
      targets: [],
      cdnProviders: {},
      performanceComparison: {}
    };

    try {
      const httpTargets = targets.filter(target => 
        target.startsWith('http://') || target.startsWith('https://')
      );

      const cdnPromises = httpTargets.map(async (target) => {
        const targetResult = {
          target: target,
          cdnInfo: {
            provider: null,
            popLocation: null,
            cacheStatus: null
          },
          performance: {
            responseTime: null,
            cacheHitRate: null,
            edgeLatency: null
          },
          error: null
        };

        try {
          // 分析CDN信息
          const cdnAnalysis = await this.analyzeCDN(target);
          targetResult.cdnInfo = cdnAnalysis.info;
          targetResult.performance = cdnAnalysis.performance;

        } catch (error) {
          targetResult.error = error.message;
        }

        return targetResult;
      });

      result.targets = await Promise.all(cdnPromises);

      // 分析CDN提供商
      result.cdnProviders = this.identifyCDNProviders(result.targets);
      result.performanceComparison = this.compareCDNPerformance(result.targets);

      // 评估CDN性能
      const cdnTargets = result.targets.filter(t => t.cdnInfo.provider !== null);
      const avgPerformance = cdnTargets.length > 0 ? 
        cdnTargets.reduce((sum, t) => sum + (t.performance.responseTime || 0), 0) / cdnTargets.length : 0;
      
      result.status = avgPerformance > 0 && avgPerformance < 200 ? 'passed' :
                     avgPerformance < 800 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  // ========== 辅助方法 ==========

  /**
   * 测量下载速度
   */
  async measureDownloadSpeed(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let downloadedBytes = 0;

      const request = (url.startsWith('https://') ? https : http).get(url, (response) => {
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
        });

        response.on('end', () => {
          const duration = (Date.now() - startTime) / 1000; // 秒
          const speedBps = downloadedBytes / duration; // bytes per second
          const speedMbps = (speedBps * 8) / (1024 * 1024); // Mbps
          resolve(speedMbps);
        });

        response.on('error', reject);
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.abort();
        reject(new Error('下载测试超时'));
      });
    });
  }

  /**
   * 检查端口连通性
   */
  async checkPort(hostname, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
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
      
      socket.connect(port, hostname);
    });
  }

  /**
   * 路由跟踪
   */
  async traceRoute(target) {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? `tracert ${target}` : `traceroute ${target}`;
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const hops = this.parseTraceRoute(stdout, isWindows);
        resolve(hops);
      });
    });
  }

  /**
   * 解析traceroute输出
   */
  parseTraceRoute(output, isWindows) {
    const lines = output.split('\n');
    const hops = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // 简化的解析逻辑
      const hopMatch = isWindows ? 
        trimmedLine.match(/^\s*(\d+)\s+(.+)/) :
        trimmedLine.match(/^\s*(\d+)\s+(.+)/);
        
      if (hopMatch) {
        const hopNumber = parseInt(hopMatch[1]);
        const hopInfo = hopMatch[2];
        
        // 提取IP和延迟信息
        const ipMatch = hopInfo.match(/(\d+\.\d+\.\d+\.\d+)/);
        const latencyMatch = hopInfo.match(/(\d+(?:\.\d+)?)\s*ms/);
        
        hops.push({
          hop: hopNumber,
          ip: ipMatch ? ipMatch[1] : null,
          hostname: null,
          latency: latencyMatch ? parseFloat(latencyMatch[1]) : null,
          rawInfo: hopInfo
        });
      }
    }
    
    return hops;
  }

  /**
   * 获取DNS服务器
   */
  async getDNSServers() {
    return new Promise((resolve) => {
      dns.getServers();
      resolve(dns.getServers());
    });
  }

  /**
   * 测量HTTP指标
   */
  async measureHTTPMetrics(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let ttfbTime = null;
      
      const request = (url.startsWith('https://') ? https : http).get(url, (response) => {
        ttfbTime = Date.now() - startTime;
        
        let contentLength = 0;
        response.on('data', (chunk) => {
          contentLength += chunk.length;
        });
        
        response.on('end', () => {
          const totalTime = Date.now() - startTime;
          
          resolve({
            responseTime: totalTime,
            ttfb: ttfbTime,
            totalTime: totalTime,
            statusCode: response.statusCode,
            contentLength: contentLength,
            headers: response.headers,
            timing: {
              start: startTime,
              ttfb: startTime + ttfbTime,
              end: Date.now()
            }
          });
        });
        
        response.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.abort();
        reject(new Error('HTTP请求超时'));
      });
    });
  }

  /**
   * 生成总结
   */
  generateSummary(tests) {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    Object.values(tests).forEach(test => {
      if (test.status === 'skipped') return;
      
      totalTests++;
      if (test.status === 'passed') passed++;
      else if (test.status === 'failed') failed++;
      else if (test.status === 'warning') warnings++;
    });

    return { totalTests, passed, failed, warnings };
  }

  /**
   * 生成网络优化建议
   */
  generateNetworkRecommendations(tests) {
    const recommendations = [];

    // 基于测试结果生成建议
    if (tests.latencyPacketLoss && tests.latencyPacketLoss.status !== 'passed') {
      recommendations.push({
        category: '网络质量',
        priority: 'high',
        suggestion: '检测到高延迟或丢包，建议检查网络连接质量'
      });
    }

    if (tests.dnsResolution && tests.dnsResolution.status !== 'passed') {
      recommendations.push({
        category: 'DNS优化',
        priority: 'medium',
        suggestion: 'DNS解析性能不佳，考虑使用更快的DNS服务器'
      });
    }

    if (tests.bandwidth && tests.bandwidth.downloadSpeed && tests.bandwidth.downloadSpeed < 50) {
      recommendations.push({
        category: '带宽优化',
        priority: 'medium',
        suggestion: '带宽较低，建议升级网络套餐或优化内容传输'
      });
    }

    if (tests.cdnAnalysis && tests.cdnAnalysis.status !== 'passed') {
      recommendations.push({
        category: 'CDN优化',
        priority: 'medium',
        suggestion: '考虑使用CDN服务以提升全球访问速度'
      });
    }

    return recommendations;
  }
}

module.exports = EnhancedNetworkTestEngine;
