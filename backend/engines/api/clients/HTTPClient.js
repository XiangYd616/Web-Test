/**
 * HTTP客户端
 * 本地化程度：100%
 * 提供完整的HTTP请求功能和性能监控
 */

const axios = require('axios');
const https = require('https');
const http = require('http');

class HTTPClient {
  constructor(options = {}) {
    this.defaultOptions = {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true, // 接受所有状态码
      headers: {
        'User-Agent': 'API-Test-Engine/1.0.0'
      },
      ...options
    };
    
    // 创建HTTP和HTTPS代理
    this.httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: 100,
      maxFreeSockets: 10,
      timeout: 60000
    });
    
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 100,
      maxFreeSockets: 10,
      timeout: 60000,
      rejectUnauthorized: false // 允许自签名证书
    });
    
    // 请求统计
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0
    };
  }

  /**
   * 发送HTTP请求
   */
  async request(config) {
    const startTime = Date.now();
    
    try {
      // 合并配置
      const requestConfig = this.buildRequestConfig(config);
      
      // 记录请求开始
      this.stats.totalRequests++;
      
      // 发送请求
      const response = await axios(requestConfig);
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 更新统计信息
      this.updateStats(responseTime, true);
      
      // 构建响应对象
      return this.buildResponse(response, responseTime, requestConfig);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false);
      
      // 处理错误
      return this.handleError(error, responseTime, config);
    }
  }

  /**
   * GET请求
   */
  async get(url, config = {}) {
    return this.request({
      method: 'GET',
      url,
      ...config
    });
  }

  /**
   * POST请求
   */
  async post(url, data, config = {}) {
    return this.request({
      method: 'POST',
      url,
      data,
      ...config
    });
  }

  /**
   * PUT请求
   */
  async put(url, data, config = {}) {
    return this.request({
      method: 'PUT',
      url,
      data,
      ...config
    });
  }

  /**
   * PATCH请求
   */
  async patch(url, data, config = {}) {
    return this.request({
      method: 'PATCH',
      url,
      data,
      ...config
    });
  }

  /**
   * DELETE请求
   */
  async delete(url, config = {}) {
    return this.request({
      method: 'DELETE',
      url,
      ...config
    });
  }

  /**
   * HEAD请求
   */
  async head(url, config = {}) {
    return this.request({
      method: 'HEAD',
      url,
      ...config
    });
  }

  /**
   * OPTIONS请求
   */
  async options(url, config = {}) {
    return this.request({
      method: 'OPTIONS',
      url,
      ...config
    });
  }

  /**
   * 构建请求配置
   */
  buildRequestConfig(config) {
    const requestConfig = {
      ...this.defaultOptions,
      ...config
    };
    
    // 设置代理
    if (requestConfig.url.startsWith('https:')) {
      requestConfig.httpsAgent = this.httpsAgent;
    } else {
      requestConfig.httpAgent = this.httpAgent;
    }
    
    // 处理认证
    if (config.auth) {
      requestConfig.auth = config.auth;
    }
    
    // 处理Bearer Token
    if (config.bearerToken) {
      requestConfig.headers = {
        ...requestConfig.headers,
        'Authorization': `Bearer ${config.bearerToken}`
      };
    }
    
    // 处理API Key
    if (config.apiKey) {
      if (config.apiKeyLocation === 'header') {
        requestConfig.headers = {
          ...requestConfig.headers,
          [config.apiKeyName || 'X-API-Key']: config.apiKey
        };
      } else if (config.apiKeyLocation === 'query') {
        requestConfig.params = {
          ...requestConfig.params,
          [config.apiKeyName || 'api_key']: config.apiKey
        };
      }
    }
    
    // 处理Content-Type
    if (config.data && !requestConfig.headers['Content-Type']) {
      if (typeof config.data === 'object') {
        requestConfig.headers['Content-Type'] = 'application/json';
      }
    }
    
    return requestConfig;
  }

  /**
   * 构建响应对象
   */
  buildResponse(axiosResponse, responseTime, requestConfig) {
    return {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: axiosResponse.headers,
      data: axiosResponse.data,
      config: {
        method: requestConfig.method,
        url: requestConfig.url,
        headers: requestConfig.headers,
        data: requestConfig.data
      },
      timing: {
        responseTime,
        timestamp: new Date().toISOString()
      },
      size: {
        request: this.calculateRequestSize(requestConfig),
        response: this.calculateResponseSize(axiosResponse)
      },
      success: axiosResponse.status >= 200 && axiosResponse.status < 300
    };
  }

  /**
   * 处理错误
   */
  handleError(error, responseTime, config) {
    let errorResponse = {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      data: null,
      config: {
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.data
      },
      timing: {
        responseTime,
        timestamp: new Date().toISOString()
      },
      size: {
        request: this.calculateRequestSize(config),
        response: 0
      },
      success: false,
      error: {
        message: error.message,
        code: error.code,
        type: 'network_error'
      }
    };
    
    // 如果有响应，提取响应信息
    if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.statusText = error.response.statusText;
      errorResponse.headers = error.response.headers;
      errorResponse.data = error.response.data;
      errorResponse.size.response = this.calculateResponseSize(error.response);
      errorResponse.error.type = 'http_error';
    } else if (error.request) {
      errorResponse.error.type = 'no_response';
    }
    
    return errorResponse;
  }

  /**
   * 更新统计信息
   */
  updateStats(responseTime, success) {
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    this.stats.totalTime += responseTime;
    this.stats.averageTime = this.stats.totalTime / this.stats.totalRequests;
    this.stats.minTime = Math.min(this.stats.minTime, responseTime);
    this.stats.maxTime = Math.max(this.stats.maxTime, responseTime);
  }

  /**
   * 计算请求大小
   */
  calculateRequestSize(config) {
    let size = 0;
    
    // 计算URL大小
    size += Buffer.byteLength(config.url, 'utf8');
    
    // 计算头部大小
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        size += Buffer.byteLength(`${key}: ${value}/r/n`, 'utf8');
      });
    }
    
    // 计算请求体大小
    if (config.data) {
      if (typeof config.data === 'string') {
        size += Buffer.byteLength(config.data, 'utf8');
      } else if (typeof config.data === 'object') {
        size += Buffer.byteLength(JSON.stringify(config.data), 'utf8');
      }
    }
    
    return size;
  }

  /**
   * 计算响应大小
   */
  calculateResponseSize(response) {
    let size = 0;
    
    // 计算头部大小
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        size += Buffer.byteLength(`${key}: ${value}/r/n`, 'utf8');
      });
    }
    
    // 计算响应体大小
    if (response.data) {
      if (typeof response.data === 'string') {
        size += Buffer.byteLength(response.data, 'utf8');
      } else if (typeof response.data === 'object') {
        size += Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      }
    }
    
    return size;
  }

  /**
   * 批量请求
   */
  async batchRequest(requests, options = {}) {
    const { concurrency = 5, delay = 0 } = options;
    const results = [];
    
    // 分批处理请求
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          // 添加延迟
          if (delay > 0 && (i + index) > 0) {
            await this.sleep(delay);
          }
          
          const response = await this.request(request);
          return {
            index: i + index,
            request,
            response,
            success: true
          };
        } catch (error) {
          return {
            index: i + index,
            request,
            response: null,
            error: error.message,
            success: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0,
      errorRate: this.stats.totalRequests > 0 ? 
        (this.stats.failedRequests / this.stats.totalRequests) * 100 : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0
    };
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 关闭连接
   */
  close() {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

module.exports = HTTPClient;
