/**
 * 真实的HTTP请求引擎
 * 完全替换模拟数据，执行真实的网络请求
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');

class RealHTTPEngine {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      validateStatus: () => true, // 接受所有状态码
      ...options
    };
    
    this.requestHistory = [];
    this.certificates = new Map();
  }

  /**
   * 执行HTTP请求
   */
  async makeRequest(config) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // 预处理配置
      const processedConfig = this.preprocessConfig(config);
      
      // 记录请求开始
      this.logRequestStart(requestId, processedConfig);
      
      // 执行真实的HTTP请求
      const response = await this.executeRequest(processedConfig);
      
      // 计算请求时间
      const duration = Date.now() - startTime;
      
      // 处理响应
      const processedResponse = this.processResponse(response, duration, requestId);
      
      // 记录请求完成
      this.logRequestComplete(requestId, processedResponse);
      
      return processedResponse;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResponse = this.processError(error, duration, requestId);
      
      // 记录请求错误
      this.logRequestError(requestId, errorResponse);
      
      return errorResponse;
    }
  }

  /**
   * 预处理请求配置
   */
  preprocessConfig(config) {
    const processed = {
      method: (config.method || 'GET').toUpperCase(),
      url: this.normalizeUrl(config.url),
      headers: this.processHeaders(config.headers || {}),
      timeout: config.timeout || this.options.timeout,
      maxRedirects: config.maxRedirects || this.options.maxRedirects,
      validateStatus: this.options.validateStatus
    };

    // 处理请求体
    if (config.data || config.body) {
      processed.data = this.processRequestBody(config.data || config.body, processed.headers);
    }

    // 处理查询参数
    if (config.params) {
      processed.params = config.params;
    }

    // 处理认证
    if (config.auth) {
      this.processAuthentication(processed, config.auth);
    }

    // 处理代理
    if (config.proxy) {
      processed.proxy = config.proxy;
    }

    // 处理SSL配置
    if (config.ssl) {
      processed.httpsAgent = this.createHttpsAgent(config.ssl);
    }

    return processed;
  }

  /**
   * 执行真实的HTTP请求
   */
  async executeRequest(config) {
    // 创建axios实例，支持自定义配置
    const axiosInstance = axios.create({
      timeout: config.timeout,
      maxRedirects: config.maxRedirects,
      validateStatus: config.validateStatus,
      httpsAgent: config.httpsAgent
    });

    // 添加请求拦截器
    axiosInstance.interceptors.request.use(
      (requestConfig) => {
        console.log(`🚀 执行HTTP请求: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );

    // 添加响应拦截器  
    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // 即使是错误响应也返回，让上层处理
        if (error.response) {
          return error.response;
        }
        throw error;
      }
    );

    return await axiosInstance.request(config);
  }

  /**
   * 处理响应数据
   */
  processResponse(response, duration, requestId) {
    const processed = {
      id: requestId,
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: this.processResponseHeaders(response.headers),
      data: response.data,
      duration: duration,
      size: this.calculateResponseSize(response),
      timing: this.extractTimingInfo(response),
      certificates: this.extractCertificateInfo(response),
      redirects: this.extractRedirectInfo(response),
      metadata: {
        url: response.config?.url,
        method: response.config?.method?.toUpperCase(),
        timestamp: new Date().toISOString(),
        userAgent: response.config?.headers?.['User-Agent']
      }
    };

    // 分析内容类型
    const contentType = response.headers['content-type'] || '';
    processed.contentType = contentType.split(';')[0].trim();

    // 尝试解析JSON
    if (processed.contentType.includes('application/json') && typeof processed.data === 'string') {
      try {
        processed.data = JSON.parse(processed.data);
        processed.parsedJson = true;
      } catch (e) {
        processed.parsedJson = false;
        processed.parseError = e.message;
      }
    }

    // 计算响应特征
    processed.features = this.analyzeResponseFeatures(processed);

    return processed;
  }

  /**
   * 处理错误响应
   */
  processError(error, duration, requestId) {
    const processed = {
      id: requestId,
      success: false,
      error: true,
      message: error.message,
      code: error.code,
      duration: duration,
      timestamp: new Date().toISOString()
    };

    // 网络错误详细信息
    if (error.code) {
      processed.errorType = this.classifyErrorType(error.code);
      processed.description = this.getErrorDescription(error.code);
    }

    // 如果有部分响应信息
    if (error.response) {
      processed.status = error.response.status;
      processed.statusText = error.response.statusText;
      processed.headers = this.processResponseHeaders(error.response.headers);
      processed.data = error.response.data;
    }

    // 请求配置信息
    if (error.config) {
      processed.request = {
        method: error.config.method?.toUpperCase(),
        url: error.config.url,
        timeout: error.config.timeout
      };
    }

    return processed;
  }

  /**
   * 处理请求头
   */
  processHeaders(headers) {
    const processed = {
      'User-Agent': 'Test-Web/1.0.0 (Real HTTP Engine)',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      ...headers
    };

    // 规范化头部名称
    const normalized = {};
    Object.entries(processed).forEach(([key, value]) => {
      normalized[key.toLowerCase()] = value;
    });

    return normalized;
  }

  /**
   * 处理请求体
   */
  processRequestBody(data, headers) {
    if (!data) return undefined;

    // 字符串数据直接返回
    if (typeof data === 'string') {
      return data;
    }

    // FormData处理
    if (data instanceof FormData) {
      return data;
    }

    // 文件上传处理
    if (data.files) {
      const formData = new FormData();
      Object.entries(data.files).forEach(([key, file]) => {
        if (file.path && fs.existsSync(file.path)) {
          formData.append(key, fs.createReadStream(file.path), file.name);
        }
      });
      
      if (data.fields) {
        Object.entries(data.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      return formData;
    }

    // JSON数据处理
    if (typeof data === 'object') {
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
      }
      return JSON.stringify(data);
    }

    return data;
  }

  /**
   * 处理认证
   */
  processAuthentication(config, auth) {
    switch (auth.type) {
      case 'basic':
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        config.headers.authorization = `Basic ${credentials}`;
        break;
        
      case 'bearer':
        config.headers.authorization = `Bearer ${auth.token}`;
        break;
        
      case 'apikey':
        if (auth.location === 'header') {
          config.headers[auth.key || 'x-api-key'] = auth.value;
        } else if (auth.location === 'query') {
          config.params = config.params || {};
          config.params[auth.key || 'api_key'] = auth.value;
        }
        break;
        
      case 'oauth2':
        config.headers.authorization = `Bearer ${auth.accessToken}`;
        break;
    }
  }

  /**
   * 创建HTTPS代理
   */
  createHttpsAgent(sslConfig) {
    const agentOptions = {
      rejectUnauthorized: sslConfig.verifyCertificate !== false
    };

    // 客户端证书
    if (sslConfig.cert && sslConfig.key) {
      if (fs.existsSync(sslConfig.cert)) {
        agentOptions.cert = fs.readFileSync(sslConfig.cert);
      }
      if (fs.existsSync(sslConfig.key)) {
        agentOptions.key = fs.readFileSync(sslConfig.key);
      }
    }

    // CA证书
    if (sslConfig.ca && fs.existsSync(sslConfig.ca)) {
      agentOptions.ca = fs.readFileSync(sslConfig.ca);
    }

    return new https.Agent(agentOptions);
  }

  /**
   * 分析响应特征
   */
  analyzeResponseFeatures(response) {
    const features = {
      hasJsonData: response.contentType?.includes('application/json'),
      hasXmlData: response.contentType?.includes('application/xml') || response.contentType?.includes('text/xml'),
      hasHtmlData: response.contentType?.includes('text/html'),
      hasImageData: response.contentType?.startsWith('image/'),
      isCompressed: this.checkIfCompressed(response.headers),
      hasCookies: !!(response.headers['set-cookie']),
      hasCors: this.checkCorsHeaders(response.headers),
      isRedirect: response.status >= 300 && response.status < 400,
      isSuccess: response.status >= 200 && response.status < 300,
      isClientError: response.status >= 400 && response.status < 500,
      isServerError: response.status >= 500
    };

    // 性能特征
    features.performance = {
      isFast: response.duration < 200,
      isAcceptable: response.duration < 1000,
      isSlow: response.duration > 2000,
      sizeCategory: this.categorizeSizeLevel(response.size)
    };

    return features;
  }

  /**
   * 工具方法
   */
  generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  calculateResponseSize(response) {
    if (response.headers['content-length']) {
      return parseInt(response.headers['content-length']);
    }
    
    if (typeof response.data === 'string') {
      return Buffer.byteLength(response.data, 'utf8');
    }
    
    if (response.data) {
      return JSON.stringify(response.data).length;
    }
    
    return 0;
  }

  processResponseHeaders(headers) {
    const processed = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
      processed[key.toLowerCase()] = value;
    });
    return processed;
  }

  extractTimingInfo(response) {
    // 尝试从响应中提取时序信息
    const timing = {};
    
    if (response.config?.metadata?.requestStartTime) {
      timing.total = Date.now() - response.config.metadata.requestStartTime;
    }
    
    // 从服务器响应头中提取时序信息
    const serverTiming = response.headers['server-timing'];
    if (serverTiming) {
      timing.server = this.parseServerTiming(serverTiming);
    }
    
    return timing;
  }

  extractCertificateInfo(response) {
    // 如果是HTTPS请求，尝试提取证书信息
    if (response.request?.socket?.authorized !== undefined) {
      return {
        authorized: response.request.socket.authorized,
        authorizationError: response.request.socket.authorizationError,
        peerCertificate: response.request.socket.getPeerCertificate ? 
          response.request.socket.getPeerCertificate() : null
      };
    }
    return null;
  }

  extractRedirectInfo(response) {
    // 提取重定向信息
    if (response.request?._redirects) {
      return {
        count: response.request._redirects.length,
        chain: response.request._redirects
      };
    }
    return null;
  }

  checkIfCompressed(headers) {
    const encoding = headers['content-encoding'];
    return !!(encoding && ['gzip', 'deflate', 'br'].includes(encoding));
  }

  checkCorsHeaders(headers) {
    return !!(headers['access-control-allow-origin'] || headers['access-control-allow-methods']);
  }

  categorizeSizeLevel(size) {
    if (size < 1024) return 'tiny';      // < 1KB
    if (size < 10240) return 'small';    // < 10KB  
    if (size < 102400) return 'medium';  // < 100KB
    if (size < 1048576) return 'large';  // < 1MB
    return 'huge';                       // >= 1MB
  }

  classifyErrorType(code) {
    const errorTypes = {
      'ENOTFOUND': 'DNS_ERROR',
      'ECONNREFUSED': 'CONNECTION_REFUSED',
      'ECONNRESET': 'CONNECTION_RESET',
      'ETIMEDOUT': 'TIMEOUT',
      'ECONNABORTED': 'REQUEST_ABORTED',
      'EHOSTUNREACH': 'HOST_UNREACHABLE',
      'ENETUNREACH': 'NETWORK_UNREACHABLE',
      'EPROTO': 'PROTOCOL_ERROR',
      'ECERT': 'CERTIFICATE_ERROR'
    };
    
    return errorTypes[code] || 'UNKNOWN_ERROR';
  }

  getErrorDescription(code) {
    const descriptions = {
      'ENOTFOUND': '域名解析失败，请检查URL是否正确',
      'ECONNREFUSED': '连接被拒绝，目标服务器可能未运行',
      'ECONNRESET': '连接被重置，网络可能不稳定',
      'ETIMEDOUT': '请求超时，服务器响应时间过长',
      'ECONNABORTED': '请求被中止',
      'EHOSTUNREACH': '主机不可达，请检查网络连接',
      'ENETUNREACH': '网络不可达',
      'EPROTO': '协议错误',
      'ECERT': '证书验证失败'
    };
    
    return descriptions[code] || '未知网络错误';
  }

  parseServerTiming(serverTiming) {
    // 解析Server-Timing头部
    const metrics = {};
    serverTiming.split(',').forEach(metric => {
      const parts = metric.trim().split(';');
      const name = parts[0];
      const duration = parts.find(p => p.startsWith('dur='));
      if (duration) {
        metrics[name] = parseFloat(duration.split('=')[1]);
      }
    });
    return metrics;
  }

  /**
   * 记录方法
   */
  logRequestStart(requestId, config) {
    this.requestHistory.push({
      id: requestId,
      startTime: Date.now(),
      method: config.method,
      url: config.url,
      status: 'started'
    });
  }

  logRequestComplete(requestId, response) {
    const record = this.requestHistory.find(r => r.id === requestId);
    if (record) {
      record.status = 'completed';
      record.endTime = Date.now();
      record.responseStatus = response.status;
      record.duration = response.duration;
    }
  }

  logRequestError(requestId, error) {
    const record = this.requestHistory.find(r => r.id === requestId);
    if (record) {
      record.status = 'failed';
      record.endTime = Date.now();
      record.error = error.message;
    }
  }

  /**
   * 获取请求历史
   */
  getRequestHistory(limit = 100) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * 清理历史记录
   */
  clearHistory() {
    this.requestHistory = [];
  }
}

module.exports = RealHTTPEngine;
