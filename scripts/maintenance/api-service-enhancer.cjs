#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ApiServiceEnhancer {
  constructor() {
    this.projectRoot = process.cwd();
    this.enhancedServices = [];
    this.fixes = [];

    // API服务增强模板
    this.enhancementTemplates = {
      errorHandling: {
        basic: `
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || \`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    
    // 记录错误日志
    this.logError(error, { url, options });
    
    // 重新抛出错误供上层处理
    throw error;
  }`,

        advanced: `
  const maxRetries = options.retries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: options.timeout || 30000
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || \`HTTP \${response.status}: \${response.statusText}\`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = response;
        
        // 对于某些错误码不进行重试
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(\`API调用失败，第\${attempt}次重试 (共\${maxRetries}次):\`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
      
      const result = await response.json();

      // 记录成功日志
      this.logSuccess({ url, attempt, result });

      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        // 记录最终失败日志
        this.logError(error, { url, options, attempts: maxRetries });
        throw error;
      }

      // 网络错误或其他异常，进行重试
      console.warn(\`API调用异常，第\${attempt}次重试:\`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }`
      },

      requestInterceptor: `
  // 请求拦截器
  private interceptRequest(url: string, options: RequestInit): RequestInit {
    const token = this.getAuthToken();

    return {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': this.generateRequestId(),
        'X-Timestamp': new Date().toISOString(),
        ...(token && { 'Authorization': \`Bearer \${token}\` }),
        ...options.headers,
      },
    };
  }`,

      responseInterceptor: `
  // 响应拦截器
  private interceptResponse(response: Response, requestInfo: any): Response {
    // 记录响应时间
    const responseTime = Date.now() - requestInfo.startTime;
    this.logMetrics({
      url: requestInfo.url,
      method: requestInfo.method,
      status: response.status,
      responseTime
    });
    
    // 处理认证过期
    if (response.status === 401) {
      this.handleAuthExpired();
    }
    
    // 处理服务器错误
    if (response.status >= 500) {
      this.handleServerError(response, requestInfo);
    }
    
    return response;
  }`,

      caching: `
  // 缓存机制
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private getCacheKey(url: string, options: RequestInit): string {
    return \`\${options.method || 'GET'}:\${url}:\${JSON.stringify(options.body || {})}\`;
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }`,

      monitoring: `
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }`
    };
  }

  /**
   * 执行API服务增强
   */
  async execute() {
    console.log('🔧 开始API服务增强...\n');

    try {
      // 1. 扫描需要增强的API服务
      const services = await this.scanApiServices();

      // 2. 为每个服务添加增强功能
      for (const service of services) {
        await this.enhanceApiService(service);
      }

      // 3. 创建增强的API基础设施
      await this.createEnhancedApiInfrastructure();

      // 4. 生成增强报告
      this.generateEnhancementReport();

    } catch (error) {
      console.error('❌ API服务增强过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描API服务
   */
  async scanApiServices() {
    console.log('🔍 扫描需要增强的API服务...');

    const servicesDir = path.join(this.projectRoot, 'frontend/services');
    const services = [];

    if (fs.existsSync(servicesDir)) {
      const serviceFiles = this.getFilesRecursively(servicesDir, ['.ts', '.js']);

      for (const serviceFile of serviceFiles) {
        const analysis = await this.analyzeApiService(serviceFile);
        if (analysis.needsEnhancement) {
          services.push(analysis);
        }
      }
    }

    console.log(`   发现 ${services.length} 个API服务需要增强\n`);
    return services;
  }

  /**
   * 分析API服务
   */
  async analyzeApiService(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // 检查现有功能
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    const hasRetryMechanism = content.includes('retry') || content.includes('attempt');
    const hasLogging = content.includes('console.') || content.includes('log');
    const hasCaching = content.includes('cache') || content.includes('Cache');
    const hasMonitoring = content.includes('metrics') || content.includes('monitor');
    const hasApiCalls = content.includes('fetch') || content.includes('axios') || content.includes('request');

    // 确定需要的增强
    const enhancements = [];
    if (!hasErrorHandling) enhancements.push('errorHandling');
    if (!hasRetryMechanism) enhancements.push('retryMechanism');
    if (!hasLogging) enhancements.push('logging');
    if (!hasCaching && this.shouldHaveCache(fileName)) enhancements.push('caching');
    if (!hasMonitoring) enhancements.push('monitoring');

    const needsEnhancement = hasApiCalls && enhancements.length > 0;

    return {
      filePath,
      fileName,
      hasErrorHandling,
      hasRetryMechanism,
      hasLogging,
      hasCaching,
      hasMonitoring,
      hasApiCalls,
      enhancements,
      needsEnhancement,
      content
    };
  }

  /**
   * 判断服务是否应该有缓存
   */
  shouldHaveCache(fileName) {
    const cacheableServices = [
      'config', 'settings', 'user', 'profile',
      'data', 'list', 'search', 'analytics'
    ];
    return cacheableServices.some(service =>
      fileName.toLowerCase().includes(service)
    );
  }

  /**
   * 增强API服务
   */
  async enhanceApiService(serviceInfo) {
    console.log(`🔧 增强API服务: ${serviceInfo.fileName} (${serviceInfo.enhancements.join(', ')})`);

    let newContent = serviceInfo.content;
    let modified = false;

    // 添加必要的导入
    newContent = this.addRequiredImports(newContent, serviceInfo.enhancements);

    // 根据需要的增强功能添加相应代码
    for (const enhancement of serviceInfo.enhancements) {
      switch (enhancement) {
        case 'errorHandling':
          newContent = this.addErrorHandling(newContent);
          modified = true;
          break;

        case 'retryMechanism':
          newContent = this.addRetryMechanism(newContent);
          modified = true;
          break;

        case 'logging':
          newContent = this.addLogging(newContent);
          modified = true;
          break;

        case 'caching':
          newContent = this.addCaching(newContent);
          modified = true;
          break;

        case 'monitoring':
          newContent = this.addMonitoring(newContent);
          modified = true;
          break;
      }
    }

    if (modified) {
      fs.writeFileSync(serviceInfo.filePath, newContent);
      this.enhancedServices.push({
        file: path.relative(this.projectRoot, serviceInfo.filePath),
        enhancements: serviceInfo.enhancements
      });
      this.addFix('api_service', serviceInfo.filePath, `添加${serviceInfo.enhancements.join('、')}功能`);
    }
  }

  /**
   * 添加必要的导入
   */
  addRequiredImports(content, enhancements) {
    // 这里可以根据需要添加特定的导入
    return content;
  }

  /**
   * 添加错误处理
   */
  addErrorHandling(content) {
    // 查找fetch调用并包装错误处理
    const fetchPattern = /fetch\s*\([^)]+\)/g;
    const matches = content.match(fetchPattern);

    if (matches) {
      for (const match of matches) {
        const enhancedFetch = `
        try {
          const response = await ${match};
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || \`HTTP \${response.status}: \${response.statusText}\`);
          }
          
          return await response.json();
        } catch (error) {
          console.error('API调用失败:', error);
          throw error;
        }`;

        content = content.replace(match, enhancedFetch);
      }
    }

    return content;
  }

  /**
   * 添加重试机制
   */
  addRetryMechanism(content) {
    // 在类或函数开始处添加重试逻辑
    const retryMethod = `
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(\`请求失败，第\${attempt}次重试:\`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }`;

    return this.insertIntoClass(content, retryMethod);
  }

  /**
   * 添加日志记录
   */
  addLogging(content) {
    const loggingMethod = `
  private logApiCall(url: string, method: string, success: boolean, responseTime ?: number): void {
  const logData = {
    url,
    method,
    success,
    responseTime,
    timestamp: new Date().toISOString()
  };

  if(success) {
    console.log('API调用成功:', logData);
  } else {
    console.error('API调用失败:', logData);
  }
}`;

    return this.insertIntoClass(content, loggingMethod);
  }

  /**
   * 添加缓存机制
   */
  addCaching(content) {
    return this.insertIntoClass(content, this.enhancementTemplates.caching);
  }

  /**
   * 添加监控
   */
  addMonitoring(content) {
    return this.insertIntoClass(content, this.enhancementTemplates.monitoring);
  }

  /**
   * 在类中插入代码
   */
  insertIntoClass(content, code) {
    // 查找类定义
    const classMatch = content.match(/class\s+\w+.*{/);
    if (classMatch) {
      const insertIndex = content.indexOf(classMatch[0]) + classMatch[0].length;
      content = content.slice(0, insertIndex) + code + content.slice(insertIndex);
    } else {
      // 如果不是类，在文件末尾添加
      content += '\n' + code;
    }
    return content;
  }

  /**
   * 创建增强的API基础设施
   */
  async createEnhancedApiInfrastructure() {
    console.log('🏗️ 创建增强的API基础设施...');

    // 创建增强的API客户端
    await this.createEnhancedApiClient();

    // 创建API监控服务
    await this.createApiMonitoringService();

    // 创建API缓存管理器
    await this.createApiCacheManager();

    console.log('   ✅ API基础设施创建完成\n');
  }

  /**
   * 创建增强的API客户端
   */
  async createEnhancedApiClient() {
    const enhancedApiClientPath = path.join(this.projectRoot, 'frontend/utils/enhancedApiClient.ts');

    if (!fs.existsSync(enhancedApiClientPath)) {
      const enhancedApiClientContent = `/**
 * 增强的API客户端
 * 提供完整的错误处理、重试、缓存和监控功能
 */

import authService from '../services/authService';

export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
  };
}

class EnhancedApiClient {
  private baseUrl: string;
  private cache = new Map < string, { data: any; timestamp: number; ttl: number }> ();
  private metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  errorsByType: new Map < string, number> ()
  };

constructor(baseUrl: string = '/api') {
  this.baseUrl = baseUrl;
}

  /**
   * 通用请求方法
   */
  async request < T > (
  endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise < ApiResponse < T >> {
  const requestId = this.generateRequestId();
  const startTime = Date.now();
  const url = \`\${this.baseUrl}\${endpoint}\`;
    
    // 检查缓存
    if (options.cache && options.method === 'GET') {
      const cacheKey = this.getCacheKey(url, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const requestOptions = this.interceptRequest(url, options);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        this.interceptResponse(response, { url, method: options.method, startTime, responseTime });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || \`HTTP \${response.status}: \${response.statusText}\`);
          (error as any).status = response.status;
          (error as any).statusText = response.statusText;
          
          // 对于某些错误码不进行重试
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          console.warn(\`API调用失败，第\${attempt}次重试:\`, error.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      continue;
    }

    const result = await response.json();
    const apiResponse: ApiResponse<T> = {
      success: true,
      data: result.data || result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime
      }
    };

    // 缓存GET请求结果
    if (options.cache && options.method === 'GET') {
      const cacheKey = this.getCacheKey(url, options);
      this.setCache(cacheKey, apiResponse, options.cacheTTL);
    }

    this.logSuccess({ url, attempt, responseTime });
    return apiResponse;

  } catch(error) {
    if (attempt === maxRetries) {
      this.logError(error as Error, { url, options, attempts: maxRetries });

      return {
        success: false,
        error: {
          code: (error as any).status?.toString() || 'UNKNOWN_ERROR',
          message: (error as Error).message,
          details: error
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime
        }
      };
    }

    console.warn(\`API调用异常，第\${attempt}次重试:\`, (error as Error).message);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

// 这里不应该到达，但为了类型安全
throw new Error('Unexpected error in request method');
  }

  /**
   * GET请求
   */
  async get < T > (endpoint: string, options: Omit < ApiRequestOptions, 'method' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, { ...options, method: 'GET', cache: true });
}

  /**
   * POST请求
   */
  async post < T > (endpoint: string, data ?: any, options: Omit < ApiRequestOptions, 'method' | 'body' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

  /**
   * PUT请求
   */
  async put < T > (endpoint: string, data ?: any, options: Omit < ApiRequestOptions, 'method' | 'body' > = { }): Promise < ApiResponse < T >> {
  return this.request < T > (endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

  /**
   * DELETE请求
   */
  async delete <T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = { }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {...options, method: 'DELETE' });
  }

    /**
     * 请求拦截器
     */
    private interceptRequest(url: string, options: ApiRequestOptions): RequestInit {
    const token = authService.getToken();

    return {
      ...options,
      headers: {
      'Content-Type': 'application/json',
    'X-Request-ID': this.generateRequestId(),
    'X-Timestamp': new Date().toISOString(),
    ...(token && {'Authorization': \`Bearer \${token}\` }),
    ...options.headers,
      },
    };
  }

    /**
     * 响应拦截器
     */
    private interceptResponse(response: Response, requestInfo: any): Response {
      this.logMetrics({
        url: requestInfo.url,
        method: requestInfo.method,
        status: response.status,
        responseTime: requestInfo.responseTime
      });

    if (response.status === 401) {
      this.handleAuthExpired();
    }
    
    if (response.status >= 500) {
      this.handleServerError(response, requestInfo);
    }

    return response;
  }

    /**
     * 缓存相关方法
     */
    private getCacheKey(url: string, options: ApiRequestOptions): string {
    return \`\${options.method || 'GET'}:\${url}:\${JSON.stringify(options.body || {})}\`;
  }

    private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
    return null;
    }

    return cached.data;
  }

    private setCache(key: string, data: any, ttl: number = 300000): void {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
  }

    /**
     * 监控和日志方法
     */
    private logSuccess(info: any): void {
      this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime =
    (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) /
    this.metrics.successfulRequests;
  }

    private logError(error: Error, context: any): void {
      this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
    errorType,
    (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
  }

    private logMetrics(info: any): void {
      console.debug('API Metrics:', {
        url: info.url,
        method: info.method,
        status: info.status,
        responseTime: info.responseTime
      });
  }

    private handleAuthExpired(): void {
      console.warn('认证已过期，正在重新登录...');
    // 可以触发重新登录流程
  }

    private handleServerError(response: Response, requestInfo: any): void {
      console.error('服务器错误:', {
        status: response.status,
        url: requestInfo.url,
        method: requestInfo.method
      });
  }

    private generateRequestId(): string {
    return \`req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }

    /**
     * 获取监控指标
     */
    getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0
    ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
    : 0
    };
  }

    /**
     * 清除缓存
     */
    clearCache(): void {
      this.cache.clear();
  }

    /**
     * 重置指标
     */
    resetMetrics(): void {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorsByType: new Map < string, number> ()
    };
  }
}

    export const enhancedApiClient = new EnhancedApiClient();
    export default enhancedApiClient;`;

      fs.writeFileSync(enhancedApiClientPath, enhancedApiClientContent);
      this.addFix('api_infrastructure', enhancedApiClientPath, '创建增强的API客户端');
    }
  }

  /**
   * 创建API监控服务
   */
  async createApiMonitoringService() {
    const monitoringServicePath = path.join(this.projectRoot, 'frontend/services/apiMonitoringService.ts');

    if (!fs.existsSync(monitoringServicePath)) {
      const monitoringServiceContent = `/**
    * API监控服务
    * 收集和分析API调用的性能指标
    */

    export interface ApiMetrics {
      totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errorsByType: Record<string, number>;
    successRate: number;
    endpointMetrics: Record<string, {
      requests: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
}

    export interface ApiCallLog {
      id: string;
    url: string;
    method: string;
    status: number;
    responseTime: number;
    timestamp: string;
    success: boolean;
    error?: string;
}

    class ApiMonitoringService {
      private metrics: ApiMetrics = {
      totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: { },
    successRate: 0,
    endpointMetrics: { }
  };

    private callLogs: ApiCallLog[] = [];
    private maxLogSize = 1000; // 最多保存1000条日志

    /**
     * 记录API调用
     */
    logApiCall(log: Omit<ApiCallLog, 'id' | 'timestamp'>): void {
    const apiLog: ApiCallLog = {
      ...log,
      id: this.generateId(),
    timestamp: new Date().toISOString()
    };

    // 添加到日志
    this.callLogs.unshift(apiLog);
    if (this.callLogs.length > this.maxLogSize) {
      this.callLogs.pop();
    }

    // 更新指标
    this.updateMetrics(apiLog);
  }

    /**
     * 更新指标
     */
    private updateMetrics(log: ApiCallLog): void {
      this.metrics.totalRequests++;

    if (log.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;

    // 记录错误类型
    const errorType = log.error || 'Unknown';
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    }

    // 更新平均响应时间
    this.metrics.averageResponseTime =
    (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + log.responseTime) /
    this.metrics.totalRequests;

    // 更新成功率
    this.metrics.successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;

    // 更新端点指标
    const endpoint = \`\${log.method} \${log.url}\`;
    if (!this.metrics.endpointMetrics[endpoint]) {
      this.metrics.endpointMetrics[endpoint] = {
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }

    const endpointMetric = this.metrics.endpointMetrics[endpoint];
    endpointMetric.requests++;
    endpointMetric.averageResponseTime =
    (endpointMetric.averageResponseTime * (endpointMetric.requests - 1) + log.responseTime) /
    endpointMetric.requests;

    const endpointErrors = this.callLogs.filter(l =>
    \`\${l.method} \${l.url}\` === endpoint && !l.success
    ).length;
    endpointMetric.errorRate = (endpointErrors / endpointMetric.requests) * 100;
  }

    /**
     * 获取指标
     */
    getMetrics(): ApiMetrics {
    return {...this.metrics};
  }

    /**
     * 获取调用日志
     */
    getCallLogs(limit?: number): ApiCallLog[] {
    return limit ? this.callLogs.slice(0, limit) : [...this.callLogs];
  }

    /**
     * 获取错误日志
     */
    getErrorLogs(limit?: number): ApiCallLog[] {
    const errorLogs = this.callLogs.filter(log => !log.success);
    return limit ? errorLogs.slice(0, limit) : errorLogs;
  }

    /**
     * 获取慢请求日志
     */
    getSlowRequests(threshold: number = 2000, limit?: number): ApiCallLog[] {
    const slowRequests = this.callLogs.filter(log => log.responseTime > threshold);
    return limit ? slowRequests.slice(0, limit) : slowRequests;
  }

    /**
     * 重置指标
     */
    resetMetrics(): void {
      this.metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorsByType: {},
        successRate: 0,
        endpointMetrics: {}
      };
    this.callLogs = [];
  }

    /**
     * 导出指标报告
     */
    exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
    metrics: this.metrics,
    recentErrors: this.getErrorLogs(10),
    slowRequests: this.getSlowRequests(2000, 10),
    topEndpoints: Object.entries(this.metrics.endpointMetrics)
        .sort(([,a], [,b]) => b.requests - a.requests)
    .slice(0, 10)
    };

    return JSON.stringify(report, null, 2);
  }

    private generateId(): string {
    return \`log_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }
}

    export const apiMonitoringService = new ApiMonitoringService();
    export default apiMonitoringService;`;

      fs.writeFileSync(monitoringServicePath, monitoringServiceContent);
      this.addFix('api_infrastructure', monitoringServicePath, '创建API监控服务');
    }
  }

  /**
   * 创建API缓存管理器
   */
  async createApiCacheManager() {
    const cacheManagerPath = path.join(this.projectRoot, 'frontend/services/apiCacheManager.ts');

    if (!fs.existsSync(cacheManagerPath)) {
      const cacheManagerContent = `/**
    * API缓存管理器
    * 提供智能的API响应缓存功能
    */

    export interface CacheEntry {
      data: any;
    timestamp: number;
    ttl: number;
    hits: number;
    lastAccessed: number;
}

    export interface CacheConfig {
      defaultTTL: number;
    maxSize: number;
    enableCompression: boolean;
}

    class ApiCacheManager {
      private cache = new Map<string, CacheEntry>();
    private config: CacheConfig = {
      defaultTTL: 300000, // 5分钟
    maxSize: 1000,
    enableCompression: false
  };

    constructor(config?: Partial<CacheConfig>) {
    if (config) {
        this.config = { ...this.config, ...config };
    }
  }

      /**
       * 设置缓存
       */
      set(key: string, data: any, ttl?: number): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
        this.evictLeastRecentlyUsed();
    }

      const entry: CacheEntry = {
        data: this.config.enableCompression ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
      lastAccessed: Date.now()
    };

      this.cache.set(key, entry);
  }

      /**
       * 获取缓存
       */
      get(key: string): any | null {
    const entry = this.cache.get(key);
      if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      return null;
    }

      // 更新访问统计
      entry.hits++;
      entry.lastAccessed = Date.now();

      return this.config.enableCompression ? this.decompress(entry.data) : entry.data;
  }

      /**
       * 检查缓存是否存在且有效
       */
      has(key: string): boolean {
    const entry = this.cache.get(key);
      if (!entry) {
      return false;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      return false;
    }

      return true;
  }

      /**
       * 删除缓存
       */
      delete(key: string): boolean {
    return this.cache.delete(key);
  }

      /**
       * 清空所有缓存
       */
      clear(): void {
        this.cache.clear();
  }

      /**
       * 获取缓存统计
       */
      getStats(): {
        size: number;
      hitRate: number;
      totalHits: number;
      totalEntries: number;
      memoryUsage: number;
  } {
        let totalHits = 0;
      let totalEntries = this.cache.size;

      for (const entry of this.cache.values()) {
        totalHits += entry.hits;
    }

      return {
        size: this.cache.size,
      hitRate: totalEntries > 0 ? (totalHits / totalEntries) : 0,
      totalHits,
      totalEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

      /**
       * 清理过期缓存
       */
      cleanup(): number {
        let cleaned = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      cleaned++;
      }
    }

      return cleaned;
  }

      /**
       * 驱逐最少使用的缓存项
       */
      private evictLeastRecentlyUsed(): void {
        let lruKey: string | null = null;
      let lruTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
      lruKey = key;
      }
    }

      if (lruKey) {
        this.cache.delete(lruKey);
    }
  }

      /**
       * 压缩数据（简单实现）
       */
      private compress(data: any): string {
    return JSON.stringify(data);
  }

      /**
       * 解压数据
       */
      private decompress(data: string): any {
    return JSON.parse(data);
  }

      /**
       * 估算内存使用量
       */
      private estimateMemoryUsage(): number {
        let size = 0;
      for (const [key, entry] of this.cache.entries()) {
        size += key.length * 2; // 字符串按2字节计算
      size += JSON.stringify(entry).length * 2;
    }
      return size;
  }

      /**
       * 生成缓存键
       */
      static generateKey(url: string, method: string = 'GET', params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
      return \`\${method}:\${url}:\${paramStr}\`;
  }
}

      export const apiCacheManager = new ApiCacheManager();
      export default apiCacheManager;`;

      fs.writeFileSync(cacheManagerPath, cacheManagerContent);
      this.addFix('api_infrastructure', cacheManagerPath, '创建API缓存管理器');
    }
  }

  /**
   * 工具方法
   */
  getFilesRecursively(dir, extensions) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成增强报告
   */
  generateEnhancementReport() {
    const reportPath = path.join(this.projectRoot, 'api-service-enhancement-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEnhancements: this.enhancedServices.length,
        totalFixes: this.fixes.length,
        enhancementTypes: {
          errorHandling: this.enhancedServices.filter(s => s.enhancements.includes('errorHandling')).length,
          retryMechanism: this.enhancedServices.filter(s => s.enhancements.includes('retryMechanism')).length,
          logging: this.enhancedServices.filter(s => s.enhancements.includes('logging')).length,
          caching: this.enhancedServices.filter(s => s.enhancements.includes('caching')).length,
          monitoring: this.enhancedServices.filter(s => s.enhancements.includes('monitoring')).length
        }
      },
      enhancedServices: this.enhancedServices,
      fixes: this.fixes,
      nextSteps: [
        '测试API服务增强功能',
        '验证错误处理和重试机制',
        '监控API性能指标',
        '优化缓存策略',
        '集成到现有页面'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 API服务增强报告:');
    console.log(`   增强服务: ${report.summary.totalEnhancements}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   增强类型分布:`);
    console.log(`   - 错误处理: ${report.summary.enhancementTypes.errorHandling}`);
    console.log(`   - 重试机制: ${report.summary.enhancementTypes.retryMechanism}`);
    console.log(`   - 日志记录: ${report.summary.enhancementTypes.logging}`);
    console.log(`   - 缓存机制: ${report.summary.enhancementTypes.caching}`);
    console.log(`   - 监控指标: ${report.summary.enhancementTypes.monitoring}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const enhancer = new ApiServiceEnhancer();
  enhancer.execute().catch(error => {
    console.error('❌ API服务增强失败:', error);
    process.exit(1);
  });
}

module.exports = ApiServiceEnhancer;
