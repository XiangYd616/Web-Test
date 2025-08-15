/**
 * 统一的测试服务API
 */

import axios, { AxiosResponse } from 'axios';
import { TestConfig, TestResult, TestProgress, TestError } from '../types';

export class UnifiedTestService {
  private baseURL: string;
  private timeout: number;

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
        `${this.baseURL}/tests/${testType}/history`,
        { params: { limit } }
      );
      
      return response.data;
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
  }

  /**
   * 删除测试历史项
   */
  async deleteHistoryItem(testType: string, testId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseURL}/tests/${testType}/history/${testId}`
      );
    } catch (error) {
      throw this.handleAPIError(error, testType);
    }
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
export const testService = new UnifiedTestService();