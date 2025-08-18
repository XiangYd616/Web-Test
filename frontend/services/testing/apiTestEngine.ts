// ApiTestEngine - API测试引擎
export interface TestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface TestResult {
  success: boolean;
  status: number;
  responseTime: number;
  data?: any;
  error?: string;
}

export class ApiTestEngine {
  private defaultTimeout: number = 5000;

  /**
   * 执行API测试
   */
  public async runTest(config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log('执行API测试:', config.url);
      
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: AbortSignal.timeout(config.timeout || this.defaultTimeout)
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json().catch(() => null);

      return {
        success: response.ok,
        status: response.status,
        responseTime,
        data
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        status: 0,
        responseTime,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 批量测试
   */
  public async runBatchTests(configs: TestConfig[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const config of configs) {
      const result = await this.runTest(config);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 设置默认超时时间
   */
  public setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

export default ApiTestEngine;
