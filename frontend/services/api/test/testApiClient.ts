/**
 * 统一测试API客户�?
 * 
 * 这是前端与后端测试引擎交互的唯一接口
 * 前端不执行任何测试逻辑，只负责�?
 * 1. 发送测试请求到后端
 * 2. 接收测试进度和结�?
 * 3. 处理UI展示
 */

import Logger from '@/utils/logger';
import axios, { AxiosInstance } from 'axios';

export interface TestRequest {
  engineId: string;
  config: Record<string, any>;
  options?: {
    timeout?: number;
    priority?: 'low' | 'medium' | 'high';
    async?: boolean;
  };
}

export interface TestProgress {
  testId: string;
  engineId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  estimatedTime?: number;
  messages?: string[];
}

export interface TestResult {
  testId: string;
  engineId: string;
  status: 'success' | 'failure' | 'partial';
  score?: number;
  results: Record<string, any>;
  errors?: string[];
  warnings?: string[];
  recommendations?: string[];
  timestamp: string;
  duration: number;
}

/**
 * 测试API客户端类
 * 职责：与后端测试引擎通信
 */
export class TestApiClient {
  private api: AxiosInstance;
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private progressCallbacks: Map<string, (progress: TestProgress) => void> = new Map();

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截�?- 添加认证token�?
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截�?- 统一错误处理
    this.api.interceptors.response.use(
      (response) => response?.data,
      (error) => {
        const errorMessage = error.response?.data?.message || error.message || '未知错误';
        Logger.error('API Error:', errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * 获取所有可用的测试引擎
   */
  async getAvailableEngines(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    features: string[];
  }>> {
    return this.api.get('/test/engines');
  }

  /**
   * 获取测试引擎配置模板
   */
  async getEngineConfig(engineId: string): Promise<Record<string, any>> {
    return this.api.get(`/test/${engineId}/config`);
  }

  /**
   * 验证测试配置
   */
  async validateConfig(engineId: string, config: Record<string, any>): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> {
    return this.api.post(`/test/${engineId}/validate`, config);
  }

  /**
   * 运行测试
   */
  async runTest(request: TestRequest): Promise<TestResult> {
    const { engineId, config, options = {} } = request;
    
    try {
      // 发送测试请求到后端
      const response: any = await this.api.post(`/test/${engineId}/run`, {
        config,
        options
      });

      // 如果是异步测试，建立WebSocket连接接收进度
      if (options?.async && response?.testId) {
        this.connectWebSocket(response?.testId);
      }

      return response;
    } catch (error) {
      throw new Error(`测试执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量运行测试
   */
  async runBatchTests(requests: TestRequest[]): Promise<TestResult[]> {
    try {
      const response: any = await this.api.post('/test/batch', {
        tests: requests
      });
      return response?.results || [];
    } catch (error) {
      throw new Error(`批量测试执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 停止运行中的测试
   */
  async stopTest(testId: string): Promise<void> {
    return this.api.post(`/test/${testId}/stop`);
  }

  /**
   * 获取测试状�?
   */
  async getTestStatus(testId: string): Promise<TestProgress> {
    return this.api.get(`/test/${testId}/status`);
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<TestResult> {
    return this.api.get(`/test/${testId}/result`);
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(filters?: {
    engineId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<TestResult[]> {
    return this.api.get('/test/history', { params: filters });
  }

  /**
   * 导出测试报告
   */
  async exportReport(testId: string, format: 'pdf' | 'html' | 'json' = 'pdf'): Promise<Blob> {
    const response = await this.api.get(`/test/${testId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response as unknown as Blob;
  }

  /**
   * 建立WebSocket连接接收实时进度
   */
  private connectWebSocket(testId: string): void {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    const wsUrl = this.baseUrl.replace('http', 'ws') + `/test/${testId}/progress`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onmessage = (event) => {
      try {
        const progress: TestProgress = JSON.parse(event.data);

        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
        const callback = this.progressCallbacks.get(progress.testId);
        if (callback) {
          callback(progress);
        }
      } catch (error) {
        Logger.error('WebSocket消息解析失败:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      Logger.error('WebSocket错误:', error);
    };

    this.wsConnection.onclose = () => {
      this.wsConnection = null;
    };
  }

  /**
   * 注册进度回调
   */
  onProgress(testId: string, callback: (progress: TestProgress) => void): void {
    this.progressCallbacks.set(testId, callback);
  }

  /**
   * 取消进度回调
   */
  offProgress(testId: string): void {
    this.progressCallbacks.delete(testId);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.progressCallbacks.clear();
  }
}

// 导出单例实例
export const testApiClient = new TestApiClient();

// 导出便捷函数
export const runTest = (engineId: string, config: Record<string, any>) => {
  return testApiClient.runTest({ engineId, config });
};

export const getTestEngines = () => {
  return testApiClient.getAvailableEngines();
};

export const validateTestConfig = (engineId: string, config: Record<string, any>) => {
  return testApiClient.validateConfig(engineId, config);
};

export default testApiClient;
