const http = require('http');
const https = require('https');
const { URL } = require('url');
const { performance } = require('perf_hooks');
const { AssertionSystem } = require('./AssertionSystem');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const { getAlertManager } = require('../../alert/AlertManager');
const Logger = require('../../utils/logger');

type TestProgress = Record<string, unknown> & { testId?: string };

class ApiTestEngine {
  name: string;
  version: string;
  description: string;
  options: Record<string, unknown>;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: TestProgress) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  assertionSystem: InstanceType<typeof AssertionSystem>;
  alertManager: {
    checkAlert?: (type: string, payload: Record<string, unknown>) => Promise<void>;
  } | null;

  constructor(options: Record<string, unknown> = {}) {
    this.name = 'api';
    this.version = '3.0.0';
    this.description = 'API端点测试引擎 - 支持断言和告警';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      maxRedirects: 5,
      userAgent: 'API-Test-Engine/3.0.0',
      ...options,
    };
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;

    this.assertionSystem = new AssertionSystem();

    this.alertManager = null;
    try {
      this.alertManager = getAlertManager();
    } catch (error) {
      Logger.warn('告警管理器未初始化:', (error as Error).message);
    }
  }

  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: ['api-testing', 'endpoint-analysis', 'performance-testing'],
    };
  }

  async executeTest(config: Record<string, unknown>) {
    const testId = (config as { testId?: string }).testId || `api-${Date.now()}`;

    try {
      const {
        url,
        method = 'GET',
        headers = {},
        body = null,
        endpoints = [],
        assertions = [],
      } = config as {
        url?: string;
        method?: string;
        headers?: Record<string, unknown>;
        body?: unknown;
        endpoints?: Array<Record<string, unknown>>;
        assertions?: Array<Record<string, unknown>>;
      };

      Logger.info(`🚀 开始API测试: ${testId} - ${url || '多个端点'}`);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 0, `API测试开始: ${url || '多个端点'}`, 'started', { url });

      let results: Record<string, unknown>;

      if (endpoints && endpoints.length > 0) {
        results = await this.testMultipleEndpoints(
          endpoints as Array<Record<string, unknown>>,
          testId
        );
      } else if (url) {
        results = await this.testSingleEndpoint({
          url,
          method,
          headers,
          body,
          assertions,
          testId,
        });
      } else {
        throw new Error('必须提供URL或端点列表');
      }

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results: finalResult,
      });
      this.updateTestProgress(testId, 100, 'API测试完成', 'completed');
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      emitTestComplete(testId, finalResult);

      Logger.info(`✅ API测试完成: ${testId}`);

      return finalResult;
    } catch (error) {
      Logger.error(`❌ API测试失败: ${testId}`, error as Error);

      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
      });
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }

      emitTestError(testId, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      if (this.alertManager?.checkAlert) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'api',
          error: (error as Error).message,
        });
      }

      return errorResult;
    }
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: Record<string, unknown> = {}
  ) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now(),
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra,
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: (test as { status?: string }).status || 'running',
      });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped',
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: TestProgress) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  async testSingleEndpoint({
    url,
    method = 'GET',
    headers = {},
    body = null,
    assertions = [],
    testId = null,
  }: {
    url: string;
    method?: string;
    headers?: Record<string, unknown>;
    body?: unknown;
    assertions?: Array<Record<string, unknown>>;
    testId?: string | null;
  }) {
    const startTime = performance.now();

    if (testId) {
      emitTestProgress(testId, {
        stage: 'running',
        progress: 30,
        message: `测试: ${method} ${url}`,
      });
    }

    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'User-Agent': (this.options as { userAgent?: string }).userAgent,
          Accept: 'application/json, text/plain, */*',
          ...headers,
        },
        timeout: (this.options as { timeout?: number }).timeout,
      } as Record<string, unknown>;

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        (requestOptions.headers as Record<string, unknown>)['Content-Length'] =
          Buffer.byteLength(bodyStr);
        if (!(requestOptions.headers as Record<string, unknown>)['Content-Type']) {
          (requestOptions.headers as Record<string, unknown>)['Content-Type'] = 'application/json';
        }
      }

      const response = await this.makeRequest(client, requestOptions, body);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      const analysis = this.analyzeResponse(response, responseTime);

      if (testId) {
        emitTestProgress(testId, {
          stage: 'validating',
          progress: 70,
          message: '验证响应结果...',
        });
      }

      const validationResults = this._runAssertions(response, responseTime, assertions);

      if (this.alertManager && testId) {
        await this._checkAlerts(testId, url, response, responseTime, validationResults);
      }

      return {
        url,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        validations: validationResults,
        ...analysis,
        summary: {
          success: response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          contentType: response.headers['content-type'] || 'unknown',
          contentLength: response.headers['content-length'] || response.body.length,
        },
        recommendations: this.generateRecommendations(analysis, responseTime),
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      return {
        url,
        method,
        timestamp: new Date().toISOString(),
        responseTime,
        error: (error as Error).message,
        success: false,
        summary: {
          success: false,
          error: (error as Error).message,
          responseTime: `${responseTime}ms`,
        },
        recommendations: ['检查URL是否正确', '确认网络连接正常', '检查服务器是否正在运行'],
      };
    }
  }

  _runAssertions(
    response: Record<string, unknown>,
    responseTime: number,
    assertions: Array<Record<string, unknown>>
  ) {
    if (!assertions || assertions.length === 0) {
      return {
        passed: true,
        total: 0,
        results: [],
      };
    }

    const assertionResults: Array<Record<string, unknown>> = [];
    let passed = 0;

    for (const assertion of assertions) {
      try {
        let assertResult;

        const result = {
          status: response.statusCode,
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          responseTime,
        };

        switch (assertion.type) {
          case 'status':
            assertResult = this.assertionSystem.status(assertion.expected).validate(result);
            break;
          case 'header':
            assertResult = this.assertionSystem
              .header(assertion.name, assertion.value)
              .validate(result);
            break;
          case 'json':
            assertResult = this.assertionSystem
              .json(assertion.path, assertion.expected)
              .validate(result);
            break;
          case 'responseTime':
            assertResult = this.assertionSystem.responseTime(assertion.max).validate(result);
            break;
          default:
            assertResult = {
              passed: false,
              message: `未知的断言类型: ${assertion.type}`,
            };
        }

        assertionResults.push(assertResult);
        if (assertResult.passed) passed++;
      } catch (error) {
        assertionResults.push({
          passed: false,
          message: `断言执行错误: ${(error as Error).message}`,
        });
      }
    }

    return {
      passed: passed === assertions.length,
      total: assertions.length,
      passedCount: passed,
      failedCount: assertions.length - passed,
      results: assertionResults,
    };
  }

  async _checkAlerts(
    testId: string,
    url: string,
    response: Record<string, unknown>,
    responseTime: number,
    validationResults: Record<string, unknown>
  ) {
    try {
      await this.alertManager?.checkAlert?.('RESPONSE_TIME_THRESHOLD', {
        testId,
        url,
        value: responseTime,
        threshold: 3000,
      });

      if (
        (response as { statusCode?: number }).statusCode &&
        (response as { statusCode?: number }).statusCode >= 500
      ) {
        await this.alertManager?.checkAlert?.('API_ERROR', {
          testId,
          url,
          statusCode: (response as { statusCode?: number }).statusCode,
          message: `API返回服务器错误: ${(response as { statusCode?: number }).statusCode}`,
        });
      }

      if (!(validationResults as { passed?: boolean }).passed) {
        await this.alertManager?.checkAlert?.('VALIDATION_FAILURE', {
          testId,
          url,
          failedAssertions: (validationResults as { failedCount?: number }).failedCount,
          totalAssertions: (validationResults as { total?: number }).total,
        });
      }
    } catch (error) {
      Logger.warn('告警检查失败:', (error as Error).message);
    }
  }

  async testMultipleEndpoints(
    endpoints: Array<Record<string, unknown>>,
    testId: string | null = null
  ) {
    const results = [];
    const startTime = performance.now();

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];

      if (testId) {
        emitTestProgress(testId, {
          stage: 'running',
          progress: Math.round(30 + (i / endpoints.length) * 60),
          message: `测试端点 ${i + 1}/${endpoints.length}: ${endpoint.url}`,
        });
      }

      const result = await this.testSingleEndpoint({
        ...(endpoint as Record<string, unknown>),
        testId: null,
      });
      results.push(result);
    }

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    const summary = this.calculateSummary(results as Array<Record<string, unknown>>);

    return {
      totalEndpoints: endpoints.length,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString(),
      summary,
      results,
      recommendations: this.generateBatchRecommendations(summary),
    };
  }

  async makeRequest(
    client: typeof http | typeof https,
    options: Record<string, unknown>,
    body: unknown = null
  ) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const req = client.request(options, (res: Record<string, unknown>) => {
        let data = '';

        res.on('data', (chunk: string) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (error: Error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      if (body && ['POST', 'PUT', 'PATCH'].includes(options.method as string)) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyStr);
      }

      req.end();
    });
  }

  analyzeResponse(response: Record<string, unknown>, responseTime: number) {
    return {
      status: {
        code: response.statusCode,
        message: response.statusMessage,
        category: this.getStatusCategory(response.statusCode as number),
      },
      headers: this.analyzeHeaders(response.headers as Record<string, unknown>),
      body: this.analyzeBody(
        response.body as string,
        (response.headers as Record<string, string>)['content-type']
      ),
      performance: {
        responseTime,
        category: this.getPerformanceCategory(responseTime),
      },
    };
  }

  getStatusCategory(statusCode: number) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'redirect';
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  analyzeHeaders(headers: Record<string, unknown>) {
    const security = {
      hasHttps: false,
      hasCORS: !!headers['access-control-allow-origin'],
      hasSecurityHeaders: {
        'x-frame-options': !!headers['x-frame-options'],
        'x-content-type-options': !!headers['x-content-type-options'],
        'x-xss-protection': !!headers['x-xss-protection'],
        'strict-transport-security': !!headers['strict-transport-security'],
      },
    };

    return {
      contentType: (headers['content-type'] as string) || 'unknown',
      contentLength: parseInt(headers['content-length'] as string) || 0,
      server: (headers['server'] as string) || 'unknown',
      caching: {
        cacheControl: headers['cache-control'],
        expires: headers['expires'],
        etag: headers['etag'],
      },
      security,
      compression: headers['content-encoding'],
    };
  }

  analyzeBody(body: string, contentType = '') {
    const analysis: Record<string, unknown> = {
      size: Buffer.byteLength(body, 'utf8'),
      type: 'text',
      valid: true,
      structure: null,
    };

    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        analysis.type = 'json';
        analysis.structure = this.analyzeJSONStructure(parsed as Record<string, unknown>);
      } catch (_error) {
        void _error;
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

  analyzeJSONStructure(data: Record<string, unknown>) {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemTypes: data.length > 0 ? [typeof data[0]] : [],
      };
    }
    if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        keys: Object.keys(data),
        keyCount: Object.keys(data).length,
      };
    }
    return {
      type: typeof data,
      value: data,
    };
  }

  getPerformanceCategory(responseTime: number) {
    if (responseTime < 200) return 'excellent';
    if (responseTime < 500) return 'good';
    if (responseTime < 1000) return 'acceptable';
    if (responseTime < 2000) return 'slow';
    return 'very_slow';
  }

  generateRecommendations(analysis: Record<string, any>, responseTime: number) {
    const recommendations: string[] = [];

    if (responseTime > 1000) {
      recommendations.push('响应时间较慢，建议优化服务器性能或数据库查询');
    }

    if (!analysis.headers.security.hasSecurityHeaders['x-frame-options']) {
      recommendations.push('建议添加 X-Frame-Options 头部防止点击劫持');
    }

    if (!analysis.headers.security.hasSecurityHeaders['x-content-type-options']) {
      recommendations.push('建议添加 X-Content-Type-Options 头部防止MIME类型混淆');
    }

    if (!analysis.headers.caching.cacheControl) {
      recommendations.push('建议设置 Cache-Control 头部优化缓存策略');
    }

    if (!analysis.headers.compression && analysis.body.size > 1024) {
      recommendations.push('建议启用响应压缩减少数据传输量');
    }

    if (recommendations.length === 0) {
      recommendations.push('API响应正常，无需特别优化');
    }

    return recommendations;
  }

  calculateSummary(results: Array<Record<string, unknown>>) {
    const total = results.length;
    const successful = results.filter(r => (r.summary as { success?: boolean })?.success).length;
    const failed = total - successful;

    const avgResponseTime =
      results.reduce((sum, r) => sum + ((r.responseTime as number) || 0), 0) / total;

    const statusCodes: Record<string, number> = {};
    results.forEach(r => {
      const statusCode = (r.summary as { statusCode?: number })?.statusCode;
      if (statusCode) {
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
      }
    });

    return {
      total,
      successful,
      failed,
      successRate: `${Math.round((successful / total) * 100)}%`,
      averageResponseTime: `${Math.round(avgResponseTime)}ms`,
      statusCodes,
    };
  }

  generateBatchRecommendations(summary: Record<string, unknown>) {
    const recommendations: string[] = [];

    const failed = summary.failed as number;
    if (failed > 0) {
      recommendations.push(`${failed} 个端点测试失败，建议检查服务器状态`);
    }

    const avgTime = parseInt(summary.averageResponseTime as string, 10);
    if (avgTime > 1000) {
      recommendations.push(`平均响应时间较长 (${summary.averageResponseTime})，建议优化性能`);
    }

    const successRate = parseInt(summary.successRate as string, 10);
    if (successRate < 95) {
      recommendations.push(`成功率较低 (${summary.successRate})，建议检查失败的端点`);
    }

    if (recommendations.length === 0) {
      recommendations.push('所有API端点运行正常，性能良好');
    }

    return recommendations;
  }

  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability(),
    };
  }

  async cleanup() {
    console.log('✅ API测试引擎清理完成');
  }
}

module.exports = ApiTestEngine;

export {};
