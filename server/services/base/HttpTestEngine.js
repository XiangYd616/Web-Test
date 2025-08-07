/**
 * HTTP测试引擎基类
 * 提供HTTP请求相关的公共功能
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const BaseTestEngine = require('./BaseTestEngine');
const { AppError } = require('../../middleware/errorHandler');

class HttpTestEngine extends BaseTestEngine {
  constructor(options = {}) {
    super(options);
    
    // HTTP特定配置
    this.httpConfig = {
      timeout: 10000,
      maxRedirects: 5,
      userAgent: 'HttpTestEngine/1.0',
      keepAlive: true,
      maxSockets: 100,
      ...options.httpConfig
    };
    
    // HTTP代理配置
    this.agents = {
      http: new http.Agent({
        keepAlive: this.httpConfig.keepAlive,
        maxSockets: this.httpConfig.maxSockets,
        timeout: this.httpConfig.timeout
      }),
      https: new https.Agent({
        keepAlive: this.httpConfig.keepAlive,
        maxSockets: this.httpConfig.maxSockets,
        timeout: this.httpConfig.timeout,
        rejectUnauthorized: false // 允许自签名证书
      })
    };
    
    // 请求统计
    this.requestStats = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      timeouts: 0,
      errors: new Map()
    };
  }

  /**
   * 验证URL
   */
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new AppError(`Unsupported protocol: ${parsedUrl.protocol}`, 400);
      }
      return parsedUrl;
    } catch (error) {
      throw new AppError(`Invalid URL: ${url}`, 400);
    }
  }

  /**
   * 创建HTTP请求选项
   */
  createRequestOptions(url, method = 'GET', headers = {}, body = null) {
    const parsedUrl = this.validateUrl(url);
    const isHttps = parsedUrl.protocol === 'https:';
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: {
        'User-Agent': this.httpConfig.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...headers
      },
      timeout: this.httpConfig.timeout,
      agent: this.agents[isHttps ? 'https' : 'http']
    };
    
    // 添加Content-Length for POST/PUT requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
      
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }
    
    return { options, isHttps, body };
  }

  /**
   * 执行HTTP请求
   */
  async makeRequest(url, method = 'GET', headers = {}, body = null) {
    const startTime = Date.now();
    const { options, isHttps, body: requestBody } = this.createRequestOptions(url, method, headers, body);
    
    this.requestStats.total++;
    this.requestStats.pending++;
    this.recordMetric('request', 1);
    
    return new Promise((resolve, reject) => {
      const httpModule = isHttps ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          this.requestStats.pending--;
          this.requestStats.completed++;
          
          this.recordMetric('responseTime', responseTime);
          
          const result = {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data,
            responseTime,
            url,
            method
          };
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.recordMetric('success', 1);
            resolve(result);
          } else {
            this.recordMetric('failure', 1);
            this.recordMetric('error', 1, { type: 'http_error', statusCode: res.statusCode });
            resolve(result); // 不reject，让调用者决定如何处理
          }
        });
      });
      
      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.requestStats.pending--;
        this.requestStats.failed++;
        
        this.recordMetric('failure', 1);
        this.recordMetric('error', 1, { type: 'network_error', message: error.message });
        
        // 记录错误统计
        const errorKey = error.code || error.message;
        this.requestStats.errors.set(errorKey, (this.requestStats.errors.get(errorKey) || 0) + 1);
        
        reject(new AppError(`Request failed: ${error.message}`, 500, true, error.code));
      });
      
      req.on('timeout', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.requestStats.pending--;
        this.requestStats.timeouts++;
        
        this.recordMetric('failure', 1);
        this.recordMetric('error', 1, { type: 'timeout' });
        
        req.destroy();
        reject(new AppError(`Request timeout after ${this.httpConfig.timeout}ms`, 408));
      });
      
      // 写入请求体
      if (requestBody) {
        const bodyStr = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
        req.write(bodyStr);
      }
      
      req.end();
      
      // 添加清理回调
      this.addCleanupCallback(() => {
        if (!req.destroyed) {
          req.destroy();
        }
      });
    });
  }

  /**
   * 批量执行HTTP请求
   */
  async makeRequests(requests, concurrency = 10) {
    const results = [];
    const errors = [];
    
    // 分批处理请求
    for (let i = 0; i < requests.length; i += concurrency) {
      if (this.isCancelled()) break;
      
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await this.makeRequest(
            request.url,
            request.method || 'GET',
            request.headers || {},
            request.body || null
          );
          return { index: i + index, result, error: null };
        } catch (error) {
          return { index: i + index, result: null, error };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((promiseResult) => {
        if (promiseResult.status === 'fulfilled') {
          const { index, result, error } = promiseResult.value;
          if (error) {
            errors.push({ index, error });
          } else {
            results.push({ index, result });
          }
        } else {
          errors.push({ 
            index: i + batchResults.indexOf(promiseResult), 
            error: promiseResult.reason 
          });
        }
      });
      
      // 更新进度
      this.updateProgress(
        Math.min(i + concurrency, requests.length),
        requests.length,
        'executing',
        `Processed ${Math.min(i + concurrency, requests.length)}/${requests.length} requests`
      );
    }
    
    return { results, errors };
  }

  /**
   * 获取HTTP统计信息
   */
  getHttpStats() {
    return {
      ...this.requestStats,
      errors: Object.fromEntries(this.requestStats.errors),
      successRate: this.requestStats.total > 0 ? 
        ((this.requestStats.completed - this.requestStats.failed) / this.requestStats.total * 100).toFixed(2) : 0
    };
  }

  /**
   * 重置HTTP统计
   */
  resetHttpStats() {
    this.requestStats = {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      timeouts: 0,
      errors: new Map()
    };
  }

  /**
   * 清理HTTP资源
   */
  async cleanup() {
    // 销毁HTTP代理
    if (this.agents.http) {
      this.agents.http.destroy();
    }
    if (this.agents.https) {
      this.agents.https.destroy();
    }
    
    // 调用父类清理
    await super.cleanup();
  }

  /**
   * 获取扩展状态（包含HTTP统计）
   */
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      httpStats: this.getHttpStats(),
      httpConfig: this.httpConfig
    };
  }
}

module.exports = HttpTestEngine;
