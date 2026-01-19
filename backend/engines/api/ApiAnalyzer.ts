/**
 * API分析器 - 提供API端点的深度分析功能
 */

import type { ClientRequest, IncomingMessage } from 'http';
import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';
import { URL } from 'url';

interface ApiEndpoint {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

interface ApiAnalysisResult {
  url: string;
  method: string;
  status: {
    code: number;
    message: string;
    category: 'success' | 'client_error' | 'server_error' | 'network_error';
  };
  headers: {
    contentType: string;
    contentLength: number;
    server: string;
    caching: {
      cacheControl?: string;
      expires?: string;
      etag?: string;
    };
    security: {
      hasHttps: boolean;
      hasCORS: boolean;
      hasSecurityHeaders: Record<string, boolean>;
    };
    compression?: {
      enabled: boolean;
      algorithm: string;
      savings: number;
    };
  };
  body: {
    size: number;
    type: string;
    valid: boolean;
    structure: unknown;
    error?: string;
  };
  performance: {
    responseTime: number;
    category: 'fast' | 'moderate' | 'slow';
    metrics: {
      dnsLookup?: number;
      tcpConnect?: number;
      tlsHandshake?: number;
      firstByte?: number;
      download?: number;
    };
  };
  recommendations: string[];
  score: number;
}

class ApiAnalyzer {
  private defaultTimeout: number;

  constructor(timeout: number = 30000) {
    this.defaultTimeout = timeout;
  }

  /**
   * 分析API端点
   */
  async analyzeEndpoint(endpoint: ApiEndpoint): Promise<ApiAnalysisResult> {
    const startTime = performance.now();

    try {
      const response = await this.makeRequest(endpoint);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const analysis = await this.analyzeResponse(response, responseTime);

      return {
        url: endpoint.url,
        method: endpoint.method,
        ...analysis,
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return this.createErrorAnalysis(endpoint, error as Error, responseTime);
    }
  }

  /**
   * 批量分析API端点
   */
  async analyzeEndpoints(endpoints: ApiEndpoint[]): Promise<ApiAnalysisResult[]> {
    const results: ApiAnalysisResult[] = [];

    for (const endpoint of endpoints) {
      try {
        const result = await this.analyzeEndpoint(endpoint);
        results.push(result);
      } catch (error) {
        results.push(this.createErrorAnalysis(endpoint, error as Error, 0));
      }
    }

    return results;
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(endpoint: ApiEndpoint): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(endpoint.url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const options: Record<string, unknown> = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: endpoint.method,
        timeout: endpoint.timeout || this.defaultTimeout,
        headers: {
          'User-Agent': 'API-Analyzer/1.0.0',
          ...endpoint.headers,
        },
      };

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(endpoint.body).toString(),
        };
      }

      const req: ClientRequest = client.request(options, res => {
        resolve(res);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      if (endpoint.body) {
        req.write(endpoint.body);
      }

      req.end();
    });
  }

  /**
   * 分析响应
   */
  private async analyzeResponse(
    response: IncomingMessage,
    responseTime: number
  ): Promise<Omit<ApiAnalysisResult, 'url' | 'method'>> {
    const statusCode = response.statusCode || 0;
    const headers = response.headers as Record<string, string>;

    // 分析状态码
    const status = this.analyzeStatusCode(statusCode);

    // 分析响应头
    const headerAnalysis = this.analyzeHeaders(headers);

    // 分析响应体
    const bodyAnalysis = await this.analyzeBody(response);

    // 分析性能
    const performanceAnalysis = this.analyzePerformance(responseTime);

    // 生成建议
    const recommendations = this.generateRecommendations(
      status,
      headerAnalysis,
      bodyAnalysis,
      performanceAnalysis
    );

    // 计算评分
    const score = this.calculateScore(status, headerAnalysis, bodyAnalysis, performanceAnalysis);

    return {
      status,
      headers: headerAnalysis,
      body: bodyAnalysis,
      performance: performanceAnalysis,
      recommendations,
      score,
    };
  }

  /**
   * 分析状态码
   */
  private analyzeStatusCode(code: number) {
    let category: 'success' | 'client_error' | 'server_error' | 'network_error';
    let message = '';

    if (code >= 200 && code < 300) {
      category = 'success';
      message = this.getStatusMessage(code);
    } else if (code >= 300 && code < 400) {
      category = 'success';
      message = this.getStatusMessage(code);
    } else if (code >= 400 && code < 500) {
      category = 'client_error';
      message = this.getStatusMessage(code);
    } else if (code >= 500) {
      category = 'server_error';
      message = this.getStatusMessage(code);
    } else {
      category = 'network_error';
      message = '网络错误';
    }

    return {
      code,
      message,
      category,
    };
  }

  /**
   * 获取状态码消息
   */
  private getStatusMessage(code: number): string {
    const messages: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      301: 'Moved Permanently',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return messages[code] || `HTTP ${code}`;
  }

  /**
   * 分析响应头
   */
  private analyzeHeaders(headers: Record<string, string>) {
    const contentType = headers['content-type'] || 'unknown';
    const contentLength = parseInt(headers['content-length'] || '0');
    const server = headers['server'] || 'unknown';

    // 缓存分析
    const caching = {
      cacheControl: headers['cache-control'],
      expires: headers['expires'],
      etag: headers['etag'],
    };

    // 安全分析
    const security = {
      hasHttps: false, // 需要从请求URL获取
      hasCORS: !!headers['access-control-allow-origin'],
      hasSecurityHeaders: {
        'X-Content-Type-Options': !!headers['x-content-type-options'],
        'X-Frame-Options': !!headers['x-frame-options'],
        'X-XSS-Protection': !!headers['x-xss-protection'],
        'Strict-Transport-Security': !!headers['strict-transport-security'],
      },
    };

    // 压缩分析
    let compression: { enabled: boolean; algorithm: string; savings: number } | undefined;
    const encoding = headers['content-encoding'];
    if (encoding) {
      compression = {
        enabled: true,
        algorithm: encoding,
        savings: 0, // 需要实际计算压缩节省
      };
    }

    return {
      contentType,
      contentLength,
      server,
      caching,
      security,
      compression,
    };
  }

  /**
   * 分析响应体
   */
  private async analyzeBody(response: IncomingMessage): Promise<{
    size: number;
    type: string;
    valid: boolean;
    structure: unknown;
    error?: string;
  }> {
    const contentLength = parseInt(response.headers['content-length'] || '0');
    const contentType = response.headers['content-type'] || '';

    let body = '';
    let valid = false;
    let structure: unknown = null;
    let error: string | undefined;

    try {
      // 读取响应体
      body = await this.readResponseBody(response);

      // 验证JSON格式
      if (contentType.includes('application/json')) {
        try {
          structure = JSON.parse(body);
          valid = true;
        } catch (jsonError) {
          error = '无效的JSON格式';
        }
      } else if (contentType.includes('text/html')) {
        structure = { type: 'html', length: body.length };
        valid = true;
      } else {
        structure = { type: 'other', length: body.length };
        valid = true;
      }
    } catch (readError) {
      error = '读取响应体失败';
    }

    return {
      size: contentLength,
      type: contentType,
      valid,
      structure,
      error,
    };
  }

  /**
   * 读取响应体
   */
  private readResponseBody(response: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';

      response.on('data', chunk => {
        body += chunk;
      });

      response.on('end', () => {
        resolve(body);
      });

      response.on('error', reject);
    });
  }

  /**
   * 分析性能
   */
  private analyzePerformance(responseTime: number): {
    responseTime: number;
    category: 'fast' | 'moderate' | 'slow';
    metrics: Record<string, number>;
  } {
    let category: 'fast' | 'moderate' | 'slow';

    if (responseTime < 200) {
      category = 'fast';
    } else if (responseTime < 1000) {
      category = 'moderate';
    } else {
      category = 'slow';
    }

    return {
      responseTime,
      category,
      metrics: {
        total: responseTime,
      },
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    status: { category: string },
    headers: { security: { hasSecurityHeaders: Record<string, boolean> } },
    body: { valid: boolean },
    performance: { category: string }
  ): string[] {
    const recommendations: string[] = [];

    // 状态码建议
    if (status.category === 'client_error') {
      recommendations.push('检查请求参数和认证信息');
    } else if (status.category === 'server_error') {
      recommendations.push('检查服务器状态和日志');
    }

    // 安全头建议
    const missingSecurityHeaders = Object.entries(headers.security.hasSecurityHeaders)
      .filter(([_, present]) => !present)
      .map(([header]) => header);

    if (missingSecurityHeaders.length > 0) {
      recommendations.push(`添加安全头: ${missingSecurityHeaders.join(', ')}`);
    }

    // 响应体建议
    if (!body.valid) {
      recommendations.push('修复响应体格式错误');
    }

    // 性能建议
    if (performance.category === 'slow') {
      recommendations.push('优化API响应性能');
      recommendations.push('考虑使用缓存');
    }

    return recommendations;
  }

  /**
   * 计算评分
   */
  private calculateScore(
    status: { category: string },
    headers: { security: { hasSecurityHeaders: Record<string, boolean> } },
    body: { valid: boolean },
    performance: { category: string }
  ): number {
    let score = 100;

    // 状态码扣分
    if (status.category === 'client_error') score -= 30;
    if (status.category === 'server_error') score -= 50;

    // 安全头扣分
    const securityHeadersCount = Object.keys(headers.security.hasSecurityHeaders).length;
    const presentSecurityHeadersCount = Object.values(headers.security.hasSecurityHeaders).filter(
      Boolean
    ).length;
    const securityScore = (presentSecurityHeadersCount / securityHeadersCount) * 20;
    score = score - 20 + securityScore;

    // 响应体扣分
    if (!body.valid) score -= 20;

    // 性能扣分
    if (performance.category === 'moderate') score -= 10;
    if (performance.category === 'slow') score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 创建错误分析结果
   */
  private createErrorAnalysis(
    endpoint: ApiEndpoint,
    error: Error,
    responseTime: number
  ): ApiAnalysisResult {
    return {
      url: endpoint.url,
      method: endpoint.method,
      status: {
        code: 0,
        message: error.message,
        category: 'network_error',
      },
      headers: {
        contentType: 'unknown',
        contentLength: 0,
        server: 'unknown',
        caching: {},
        security: {
          hasHttps: endpoint.url.startsWith('https'),
          hasCORS: false,
          hasSecurityHeaders: {},
        },
      },
      body: {
        size: 0,
        type: 'unknown',
        valid: false,
        structure: null,
        error: error.message,
      },
      performance: {
        responseTime,
        category: 'slow',
        metrics: {
          total: responseTime,
        },
      },
      recommendations: ['检查网络连接', '验证URL格式', '确认服务器状态'],
      score: 0,
    };
  }

  /**
   * 获取分析器信息
   */
  getAnalyzerInfo() {
    return {
      name: 'ApiAnalyzer',
      version: '1.0.0',
      description: 'API端点分析器',
      capabilities: ['状态码分析', '响应头分析', '响应体验证', '性能分析', '安全检查', '建议生成'],
    };
  }
}

export default ApiAnalyzer;

module.exports = ApiAnalyzer;
