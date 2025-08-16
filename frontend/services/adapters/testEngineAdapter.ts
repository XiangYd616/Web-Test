import { handleAsyncError } from '../utils/errorHandler';
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
    const response = try {
  await fetch('/api/test/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
} catch (error) {
  console.error('Await error:', error);
  throw error;
}

    const data = try {
  await response.json();
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
    return data.testId;
  }

  async getTestStatus(testId: string): Promise<any> {
    const response = try {
  await fetch(`/api/test/${testId}/status`);
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
    return response.json();
  }

  async stopTest(testId: string): Promise<void> {
    try {
  await fetch(`/api/test/${testId}/stop`, { method: 'POST' });
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
  }

  async getTestResult(testId: string): Promise<any> {
    const response = try {
  await fetch(`/api/test/${testId}/result`);
} catch (error) {
  console.error('Await error:', error);
  throw error;
}
    return response.json();
  }
}

export const testEngineAdapter = new TestEngineAdapter();
