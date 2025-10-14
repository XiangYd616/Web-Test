/**
 * API测试引擎
 * 提供真实的API端点测试、性能分析、错误检测等功能
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { performance } = require('perf_hooks');

class ApiTestEngine {
  constructor(options = {}) {
    this.name = 'api';
    this.version = '2.0.0';
    this.description = 'API端点测试引擎';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      maxRedirects: 5,
      userAgent: 'API-Test-Engine/2.0.0',
      ...options
    };
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'api-testing',
        'endpoint-analysis',
        'performance-testing'
      ]
    };
  }

  /**
   * 执行API测试
   */
  async executeTest(config) {
    try {
      const { url, method = 'GET', headers = {}, body = null, endpoints = [] } = config;
      
      console.log(`🔍 开始API测试: ${url || '多个端点'}`);
      
      let results;
      
      if (endpoints && endpoints.length > 0) {
        // 测试多个端点
        results = await this.testMultipleEndpoints(endpoints);
      } else if (url) {
        // 测试单个端点
        results = await this.testSingleEndpoint({ url, method, headers, body });
      } else {
        throw new Error('必须提供URL或端点列表');
      }
      
      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ API测试失败: ${error.message}`);
      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 测试单个API端点
   */
  async testSingleEndpoint({ url, method = 'GET', headers = {}, body = null }) {
    const startTime = performance.now();
    
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'application/json, text/plain, */*',
          ...headers
        },
        timeout: this.options.timeout
      };
      
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        if (!requestOptions.headers['Content-Type']) {
          requestOptions.headers['Content-Type'] = 'application/json';
        }
      }
      
      const response = await this.makeRequest(client, requestOptions, body);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      // 分析响应数据
      const analysis = this.analyzeResponse(response, responseTime);
      
      return {
        url,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        ...analysis,
        summary: {
          success: response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          contentType: response.headers['content-type'] || 'unknown',
          contentLength: response.headers['content-length'] || response.body.length
        },
        recommendations: this.generateRecommendations(analysis, responseTime)
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        url,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        error: error.message,
        success: false,
        summary: {
          success: false,
          error: error.message,
          responseTime: `${responseTime}ms`
        },
        recommendations: [
          '检查URL是否正确',
          '确认网络连接正常',
          '检查服务器是否正在运行'
        ]
      };
    }
  }

  /**
   * 测试多个API端点
   */
  async testMultipleEndpoints(endpoints) {
    const results = [];
    const startTime = performance.now();
    
    for (const endpoint of endpoints) {
      const result = await this.testSingleEndpoint(endpoint);
      results.push(result);
    }
    
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    const summary = this.calculateSummary(results);
    
    return {
      totalEndpoints: endpoints.length,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString(),
      summary,
      results,
      recommendations: this.generateBatchRecommendations(summary)
    };
  }

  /**
   * 发送HTTP请求
   */
  async makeRequest(client, options, body = null) {
    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      
      if (body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyStr);
      }
      
      req.end();
    });
  }

  /**
   * 分析响应数据
   */
  analyzeResponse(response, responseTime) {
    const analysis = {
      status: {
        code: response.statusCode,
        message: response.statusMessage,
        category: this.getStatusCategory(response.statusCode)
      },
      headers: this.analyzeHeaders(response.headers),
      body: this.analyzeBody(response.body, response.headers['content-type']),
      performance: {
        responseTime,
        category: this.getPerformanceCategory(responseTime)
      }
    };
    
    return analysis;
  }

  /**
   * 获取状态码类别
   */
  getStatusCategory(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  /**
   * 分析响应头
   */
  analyzeHeaders(headers) {
    const security = {
      hasHttps: false,
      hasCORS: !!headers['access-control-allow-origin'],
      hasSecurityHeaders: {
        'x-frame-options': !!headers['x-frame-options'],
        'x-content-type-options': !!headers['x-content-type-options'],
        'x-xss-protection': !!headers['x-xss-protection'],
        'strict-transport-security': !!headers['strict-transport-security']
      }
    };
    
    return {
      contentType: headers['content-type'] || 'unknown',
      contentLength: parseInt(headers['content-length']) || 0,
      server: headers['server'] || 'unknown',
      caching: {
        cacheControl: headers['cache-control'],
        expires: headers['expires'],
        etag: headers['etag']
      },
      security,
      compression: headers['content-encoding']
    };
  }

  /**
   * 分析响应体
   */
  analyzeBody(body, contentType = '') {
    const analysis = {
      size: Buffer.byteLength(body, 'utf8'),
      type: 'text',
      valid: true,
      structure: null
    };
    
    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        analysis.type = 'json';
        analysis.structure = this.analyzeJSONStructure(parsed);
      } catch (error) {
        analysis.valid = false;
        analysis.error = '无效的JSON格式';
      }
    } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
      analysis.type = 'xml';
    } else if (contentType.includes('text/html')) {
      analysis.type = 'html';
    }
    
    return analysis;
  }

  /**
   * 分析JSON结构
   */
  analyzeJSONStructure(data) {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemTypes: data.length > 0 ? [typeof data[0]] : []
      };
    } else if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        keys: Object.keys(data),
        keyCount: Object.keys(data).length
      };
    } else {
      return {
        type: typeof data,
        value: data
      };
    }
  }

  /**
   * 获取性能类别
   */
  getPerformanceCategory(responseTime) {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'acceptable';
    if (responseTime < 2000) return 'slow';
    return 'very_slow';
  }

  /**
   * 生成建议
   */
  generateRecommendations(analysis, responseTime) {
    const recommendations = [];
    
    // 性能建议
    if (responseTime > 1000) {
      recommendations.push('响应时间较慢，建议优化服务器性能或数据库查询');
    }
    
    // 安全建议
    if (!analysis.headers.security.hasSecurityHeaders['x-frame-options']) {
      recommendations.push('建议添加 X-Frame-Options 头部防止点击劫持');
    }
    
    if (!analysis.headers.security.hasSecurityHeaders['x-content-type-options']) {
      recommendations.push('建议添加 X-Content-Type-Options 头部防止MIME类型混淆');
    }
    
    // 缓存建议
    if (!analysis.headers.caching.cacheControl) {
      recommendations.push('建议设置 Cache-Control 头部优化缓存策略');
    }
    
    // 压缩建议
    if (!analysis.headers.compression && analysis.body.size > 1024) {
      recommendations.push('建议启用响应压缩减少数据传输量');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('API响应正常，无需特别优化');
    }
    
    return recommendations;
  }

  /**
   * 计算批量测试的总结
   */
  calculateSummary(results) {
    const total = results.length;
    const successful = results.filter(r => r.summary?.success).length;
    const failed = total - successful;
    
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / total;
    
    const statusCodes = {};
    results.forEach(r => {
      if (r.summary?.statusCode) {
        statusCodes[r.summary.statusCode] = (statusCodes[r.summary.statusCode] || 0) + 1;
      }
    });
    
    return {
      total,
      successful,
      failed,
      successRate: `${Math.round((successful / total) * 100)}%`,
      averageResponseTime: `${Math.round(avgResponseTime)}ms`,
      statusCodes
    };
  }

  /**
   * 生成批量测试建议
   */
  generateBatchRecommendations(summary) {
    const recommendations = [];
    
    if (summary.failed > 0) {
      recommendations.push(`${summary.failed} 个端点测试失败，建议检查服务器状态`);
    }
    
    // 安全地解析平均响应时间,移除'ms'后缀
    const avgTimeStr = String(summary.averageResponseTime || '0').replace(/ms$/i, '').trim();
    const avgTime = parseInt(avgTimeStr, 10);
    if (!isNaN(avgTime) && avgTime > 1000) {
      recommendations.push(`平均响应时间较长 (${summary.averageResponseTime})，建议优化性能`);
    }
    
    // 安全地解析成功率,移除'%'后缀
    const successRateStr = String(summary.successRate || '100').replace(/%$/i, '').trim();
    const successRate = parseInt(successRateStr, 10);
    if (!isNaN(successRate) && successRate < 95) {
      recommendations.push(`成功率较低 (${summary.successRate})，建议检查失败的端点`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('所有API端点运行正常，性能良好');
    }
    
    return recommendations;
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('✅ API测试引擎清理完成');
  }
}

module.exports = ApiTestEngine;
