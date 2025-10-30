/**
 * 测试进度监控服务
 * 提供实时测试进度更新和状态监控
 */

import Logger from '@/utils/logger';
import { apiService } from './baseApiService';
import type { ApiResponse } from '../../types/api';
// 测试进度接口
export interface TestProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message: string;
  startTime: string;
  endTime?: string;
  result?: any;
  error?: string;
}

// 进度监听器接口
export interface ProgressListener {
  onProgress: (progress: TestProgress) => void;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

class TestProgressService {
  private activeMonitors = new Map<string, {
    intervalId: NodeJS.Timeout;
    listeners: ProgressListener[];
  }>();

  private baseUrl = '/api/test';

  /**
   * 开始监控测试进度
   */
  startMonitoring(testId: string, listener: ProgressListener): void {
    if (!this.activeMonitors.has(testId)) {
      // 创建新的监控
      const intervalId = setInterval(() => {
        this.checkProgress(testId);
      }, 2000); // 每2秒检查一次

      this.activeMonitors.set(testId, {
        intervalId,
        listeners: [listener]
      });
    } else {
      // 添加监听器到现有监控
      const monitor = this.activeMonitors.get(testId)!;
      monitor.listeners.push(listener);
    }

    // 立即检查一次进度
    this.checkProgress(testId);
  }

  /**
   * 停止监控测试进度
   */
  stopMonitoring(testId: string, listener?: ProgressListener): void {
    const monitor = this.activeMonitors.get(testId);
    if (!monitor) return;

    if (listener) {
      // 移除特定监听器
      const index = monitor.listeners.indexOf(listener);
      if (index > -1) {
        monitor.listeners.splice(index, 1);
      }
    }

    // 如果没有监听器了，停止监控
    if (!listener || monitor.listeners.length === 0) {
      clearInterval(monitor.intervalId);
      this.activeMonitors.delete(testId);
    }
  }

  /**
   * 检查测试进度
   */
  private async checkProgress(testId: string): Promise<void> {
    try {
      const response = await this.getTestStatus(testId);
      const monitor = this.activeMonitors.get(testId);
      
      if (!monitor || !response.success) return;

      const progress: TestProgress = {
        id: testId,
        status: response.data.status,
        progress: response.data.progress || 0,
        message: response.data.message || '',
        startTime: response.data.startTime || response.data.created_at,
        endTime: response.data.endTime || response.data.completed_at,
        result: response.data.result,
        error: response.data.error
      };

      // 通知所有监听器
      monitor.listeners.forEach(listener => {
        listener?.onProgress(progress);

        // 如果测试完成，通知完成或错误
        if (progress.status === 'completed') {
          listener?.onComplete(progress.result);
          this.stopMonitoring(testId);
        } else if (progress.status === 'failed') {
          listener?.onError(progress.error || '测试失败');
          this.stopMonitoring(testId);
        }
      });

    } catch (error) {
      Logger.error('检查测试进度失败:', error);
      
      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const monitor = this.activeMonitors.get(testId);
      if (monitor) {
        monitor.listeners.forEach(listener => {
          listener?.onError('无法获取测试进度');
        });
      }
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId: string): Promise<ApiResponse<any>> {
    try {
      // 首先尝试从测试历史获取
      const historyResponse = await apiService.apiGet(`${this.baseUrl}/history/${testId}`);
      if (historyResponse.success) {
        return historyResponse;
      }

      // 如果历史记录中没有，尝试从实时状态获取
      return await apiService.apiGet(`${this.baseUrl}/${testId}/status`);
    } catch (error) {
      Logger.error('获取测试状态失败:', error);
      return {
        success: false,
        data: null,
        message: '获取测试状态失败'
      };
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId: string): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/${testId}/result`);
    } catch (error) {
      Logger.error('获取测试结果失败:', error);
      return {
        success: false,
        data: null,
        message: '获取测试结果失败'
      };
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.apiPost(`${this.baseUrl}/${testId}/cancel`);
      
      // 停止监控
      this.stopMonitoring(testId);
      
      return response;
    } catch (error) {
      Logger.error('取消测试失败:', error);
      return {
        success: false,
        data: null,
        message: '取消测试失败'
      };
    }
  }

  /**
   * 停止测试
   */
  async stopTest(testId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.apiPost(`${this.baseUrl}/${testId}/stop`);
      
      // 停止监控
      this.stopMonitoring(testId);
      
      return response;
    } catch (error) {
      Logger.error('停止测试失败:', error);
      return {
        success: false,
        data: null,
        message: '停止测试失败'
      };
    }
  }

  /**
   * 获取所有活跃的监控
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  /**
   * 清理所有监控
   */
  cleanup(): void {
    this.activeMonitors.forEach((monitor, testId) => {
      clearInterval(monitor.intervalId);
    });
    this.activeMonitors.clear();
  }

  /**
   * 批量监控多个测试
   */
  startBatchMonitoring(testIds: string[], listener: ProgressListener): void {
    testIds.forEach(testId => {
      this.startMonitoring(testId, listener);
    });
  }

  /**
   * 获取测试队列状态
   */
  async getQueueStatus(): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/queue/status`);
    } catch (error) {
      Logger.error('获取队列状态失败:', error);
      return {
        success: false,
        data: { queueLength: 0, runningTests: 0, estimatedWaitTime: 0 },
        message: '获取队列状态失败'
      };
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStatistics(timeRange: string = '7d'): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/statistics?timeRange=${timeRange}`);
    } catch (error) {
      Logger.error('获取测试统计失败:', error);
      return {
        success: false,
        data: null,
        message: '获取测试统计失败'
      };
    }
  }
}

// 创建单例实例
export const testProgressService = new TestProgressService();

// 页面卸载时清理资源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    testProgressService.cleanup();
  });
}

export default testProgressService;
