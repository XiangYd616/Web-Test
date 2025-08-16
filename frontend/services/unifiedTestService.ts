/**
 * 统一的测试服务API
 * 支持WebSocket实时更新和完整的测试生命周期管理
 */

import axios from 'axios';
import {TestConfig, TestError, TestProgress, TestResult} from '../types/testConfig';

export class TestService {
  private baseURL: string;
  private timeout: number;
  private wsConnections: Map<string, WebSocket> = new Map();
  private progressCallbacks: Map<string, (progress: TestProgress) => void> = new Map();

  constructor(baseURL: string = '/api/v1', timeout: number = 300000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * 启动测试
   */
  async startTest(testType: string, config: TestConfig): Promise<{ testId: string }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/tests/${testType}/start`,
        config,
        { timeout: this.timeout }
      );

      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 启动测试并建立WebSocket连接进行实时更新
   */
  async startTestWithRealTimeUpdates(
    testType: string,
    config: TestConfig,
    onProgress: (progress: TestProgress) => void,
    onComplete: (result: TestResult) => void,
    onError: (error: TestError) => void
  ): Promise<{ testId: string }> {
    try {
      // 启动测试
      const { testId } = await this.startTest(testType, config);

      // 建立WebSocket连接
      this.connectWebSocket(testId, onProgress, onComplete, onError);

      return { testId };
    } catch (error) {
      onError(this.handleAPIError(error, testType));
      throw error;
    }
  }

  /**
   * 建立WebSocket连接
   */
  private connectWebSocket(
    testId: string,
    onProgress: (progress: TestProgress) => void,
    onComplete: (result: TestResult) => void,
    onError: (error: TestError) => void
  ): void {
    const wsUrl = `${this.getWebSocketURL()}/tests/${testId}/progress`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected for test ${testId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          onProgress(data.payload as TestProgress);
        } else if (data.type === 'complete') {
          onComplete(data.payload as TestResult);
          this.closeWebSocket(testId);
        } else if (data.type === 'error') {
          onError(new TestError(data.payload.message, data.payload.code));
          this.closeWebSocket(testId);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError(new TestError('WebSocket连接错误', 'WEBSOCKET_ERROR'));
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for test ${testId}`);
      this.wsConnections.delete(testId);
    };

    this.wsConnections.set(testId, ws);
  }

  /**
   * 关闭WebSocket连接
   */
  private closeWebSocket(testId: string): void {
    const ws = this.wsConnections.get(testId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(testId);
    }
  }

  /**
   * 获取WebSocket URL
   */
  private getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  /**
   * 获取测试进度
   */
  async getTestProgress(testType: string, testId: string): Promise<TestProgress> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/${testType}/${testId}/progress`
      );

      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testType: string, testId: string): Promise<TestResult> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/${testType}/${testId}/result`
      );

      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testType: string, testId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/tests/${testType}/${testId}/cancel`
      );
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(testType: string, limit: number = 50): Promise<TestResult[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/test/history`,
        { params: { type: testType, limit } }
      );

      // 使用数据转换器转换格式
      const { TestDataTransformer } = await import('../utils/testDataTransformer');
      const historyItems = response.data.data?.tests || response.data.data || [];

      return historyItems.map((item: any) => TestDataTransformer.transformBackendToFrontend(item));
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 删除测试历史项
   */
  async deleteHistoryItem(testType: string, testId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/test/history/${testId}`);
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 获取测试引擎可用性
   */
  async checkEngineAvailability(testType: string): Promise<{ available: boolean; dependencies?: string[] }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/${testType}/availability`
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 验证测试配置
   */
  async validateConfig(testType: string, config: TestConfig): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/tests/${testType}/validate`,
        config
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 导出测试报告
   */
  async exportReport(testId: string, format: 'pdf' | 'html' | 'json' = 'pdf'): Promise<Blob> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/reports/${testId}/export`,
        {
          params: { format },
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, 'export');
    }
  }

  /**
   * 获取测试模板
   */
  async getTestTemplates(testType: string): Promise<Array<{ name: string; config: TestConfig; description: string }>> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/${testType}/templates`
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 保存测试模板
   */
  async saveTestTemplate(
    testType: string,
    name: string,
    config: TestConfig,
    description: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/tests/${testType}/templates`,
        { name, config, description }
      );
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 批量测试
   */
  async startBatchTest(
    tests: Array<{ testType: string; config: TestConfig }>
  ): Promise<{ batchId: string; testIds: string[] }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/tests/batch/start`,
        { tests }
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, 'batch');
    }
  }

  /**
   * 获取批量测试状态
   */
  async getBatchTestStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    progress: number;
    tests: Array<{ testId: string; testType: string; status: string; progress: number }>;
  }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/tests/batch/${batchId}/status`
      );
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, 'batch');
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 关闭所有WebSocket连接
    this.wsConnections.forEach((ws, testId) => {
      ws.close();
    });
    this.wsConnections.clear();
    this.progressCallbacks.clear();
  }

  /**
   * 处理API错误
   */
  private handleAPIError(error: any, testType: string): TestError {
    if (error.response) {
      // 服务器响应错误
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 400) {
        return new TestError(`配置错误: ${message}`, 'CONFIG_ERROR', true);
      } else if (status === 404) {
        return new TestError(`${testType}测试服务不存在`, 'SERVICE_NOT_FOUND', false);
      } else if (status === 500) {
        return new TestError(`服务器内部错误: ${message}`, 'SERVER_ERROR', true);
      } else if (status === 503) {
        return new TestError(`${testType}测试服务暂时不可用`, 'SERVICE_UNAVAILABLE', true);
      }
    } else if (error.request) {
      // 网络错误
      return new TestError('网络连接失败，请检查网络状态', 'NETWORK_ERROR', true);
    }

    // 其他错误
    return new TestError(error.message || '未知错误', 'UNKNOWN_ERROR', true);
  }
}

// 创建默认实例
export const testService = new TestService();