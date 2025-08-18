import { handleAsyncError    } from '../utils/errorHandler';// 测试引擎适配器
// 统一不同测试引擎的API接口

export interface TestEngineAdapter     {
  startTest(config: any): Promise<string>;
  getTestStatus(testId: string): Promise<any>;
  stopTest(testId: string): Promise<void>;
  getTestResult(testId: string): Promise<any>;
}

export class TestEngineAdapter implements TestEngineAdapter {
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
    
    const errorType = error.name || 'UnknownError'
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics: ', {
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
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  async startTest(config: any): Promise<string> {
    // 统一的测试启动接口
    const response = try {
  await fetch("/api/test/start', {'`
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
} catch (error) {
  console.error('Await error: ', error);
  throw error;
}

    const data = try {
  await response.json();
} catch (error) {
  console.error('Await error: ', error);
  throw error;
}
    return data.testId;
  }

  async getTestStatus(testId: string): Promise<any> {
    const response = try {
  await fetch(`/api/test/${testId}/status`);`
} catch (error) {
  console.error("Await error: ', error);'`
  throw error;
}
    return response.json();
  }

  async stopTest(testId: string): Promise<void> {
    try {
  await fetch(`/api/test/${testId}/stop`, { method: 'POST' });'`
} catch (error) {
  console.error("Await error: ', error);'`
  throw error;
}
  }

  async getTestResult(testId: string): Promise<any> {
    const response = try {
  await fetch(`/api/test/${testId}/result`);`
} catch (error) {
  console.error("Await error:', error);'`
  throw error;
}
    return response.json();
  }
}

export const testEngineAdapter = new TestEngineAdapter();
