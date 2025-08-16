// 测试引擎适配器
// 统一不同测试引擎的API接口

export interface TestEngineAdapter {
  startTest(config: any): Promise<string>;
  getTestStatus(testId: string): Promise<any>;
  stopTest(testId: string): Promise<void>;
  getTestResult(testId: string): Promise<any>;
}

export class TestEngineAdapter implements TestEngineAdapter {
  async startTest(config: any): Promise<string> {
    // 统一的测试启动接口
    const response = await fetch('/api/test/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const data = await response.json();
    return data.testId;
  }

  async getTestStatus(testId: string): Promise<any> {
    const response = await fetch(`/api/test/${testId}/status`);
    return response.json();
  }

  async stopTest(testId: string): Promise<void> {
    await fetch(`/api/test/${testId}/stop`, { method: 'POST' });
  }

  async getTestResult(testId: string): Promise<any> {
    const response = await fetch(`/api/test/${testId}/result`);
    return response.json();
  }
}

export const testEngineAdapter = new TestEngineAdapter();
