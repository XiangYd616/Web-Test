/**
 * ���Խ��ȼ�ط���
 * �ṩʵʱ���Խ��ȸ��º�״̬���
 */

import Logger from '@/utils/logger';
import { apiService } from './baseApiService';
import type { ApiResponse } from '../../types/api';
// ���Խ��Ƚӿ�
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

// ���ȼ������ӿ�
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
   * ��ʼ��ز��Խ���
   */
  startMonitoring(testId: string, listener: ProgressListener): void {
    if (!this.activeMonitors.has(testId)) {
      // �����µļ��
      const intervalId = setInterval(() => {
        this.checkProgress(testId);
      }, 2000); // ÿ2����һ��

      this.activeMonitors.set(testId, {
        intervalId,
        listeners: [listener]
      });
    } else {
      // ��Ӽ����������м��
      const monitor = this.activeMonitors.get(testId)!;
      monitor.listeners.push(listener);
    }

    // �������һ�ν���
    this.checkProgress(testId);
  }

  /**
   * ֹͣ��ز��Խ���
   */
  stopMonitoring(testId: string, listener?: ProgressListener): void {
    const monitor = this.activeMonitors.get(testId);
    if (!monitor) return;

    if (listener) {
      // �Ƴ��ض�������
      const index = monitor.listeners.indexOf(listener);
      if (index > -1) {
        monitor.listeners.splice(index, 1);
      }
    }

    // ���û�м������ˣ�ֹͣ���
    if (!listener || monitor.listeners.length === 0) {
      clearInterval(monitor.intervalId);
      this.activeMonitors.delete(testId);
    }
  }

  /**
   * �����Խ���
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

      // ֪ͨ���м�����
      monitor.listeners.forEach(listener => {
        listener?.onProgress(progress);

        // ���������ɣ�֪ͨ��ɻ����
        if (progress.status === 'completed') {
          listener?.onComplete(progress.result);
          this.stopMonitoring(testId);
        } else if (progress.status === 'failed') {
          listener?.onError(progress.error || '����ʧ��');
          this.stopMonitoring(testId);
        }
      });

    } catch (error) {
      Logger.error('�����Խ���ʧ��:', error);
      
      /**
       * if���ܺ���
       * @param {Object} params - ��������
       * @returns {Promise<Object>} ���ؽ��
       */
      const monitor = this.activeMonitors.get(testId);
      if (monitor) {
        monitor.listeners.forEach(listener => {
          listener?.onError('�޷���ȡ���Խ���');
        });
      }
    }
  }

  /**
   * ��ȡ����״̬
   */
  async getTestStatus(testId: string): Promise<ApiResponse<any>> {
    try {
      // ���ȳ��ԴӲ�����ʷ��ȡ
      const historyResponse = await apiService.apiGet(`${this.baseUrl}/history/${testId}`);
      if (historyResponse.success) {
        return historyResponse;
      }

      // �����ʷ��¼��û�У����Դ�ʵʱ״̬��ȡ
      return await apiService.apiGet(`${this.baseUrl}/${testId}/status`);
    } catch (error) {
      Logger.error('��ȡ����״̬ʧ��:', error);
      return {
        success: false,
        data: null,
        message: '��ȡ����״̬ʧ��'
      };
    }
  }

  /**
   * ��ȡ���Խ��
   */
  async getTestResult(testId: string): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/${testId}/result`);
    } catch (error) {
      Logger.error('��ȡ���Խ��ʧ��:', error);
      return {
        success: false,
        data: null,
        message: '��ȡ���Խ��ʧ��'
      };
    }
  }

  /**
   * ȡ������
   */
  async cancelTest(testId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.apiPost(`${this.baseUrl}/${testId}/cancel`);
      
      // ֹͣ���
      this.stopMonitoring(testId);
      
      return response;
    } catch (error) {
      Logger.error('ȡ������ʧ��:', error);
      return {
        success: false,
        data: null,
        message: 'ȡ������ʧ��'
      };
    }
  }

  /**
   * ֹͣ����
   */
  async stopTest(testId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiService.apiPost(`${this.baseUrl}/${testId}/stop`);
      
      // ֹͣ���
      this.stopMonitoring(testId);
      
      return response;
    } catch (error) {
      Logger.error('ֹͣ����ʧ��:', error);
      return {
        success: false,
        data: null,
        message: 'ֹͣ����ʧ��'
      };
    }
  }

  /**
   * ��ȡ���л�Ծ�ļ��
   */
  getActiveMonitors(): string[] {
    return Array.from(this.activeMonitors.keys());
  }

  /**
   * �������м��
   */
  cleanup(): void {
    this.activeMonitors.forEach((monitor, testId) => {
      clearInterval(monitor.intervalId);
    });
    this.activeMonitors.clear();
  }

  /**
   * ������ض������
   */
  startBatchMonitoring(testIds: string[], listener: ProgressListener): void {
    testIds.forEach(testId => {
      this.startMonitoring(testId, listener);
    });
  }

  /**
   * ��ȡ���Զ���״̬
   */
  async getQueueStatus(): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/queue/status`);
    } catch (error) {
      Logger.error('��ȡ����״̬ʧ��:', error);
      return {
        success: false,
        data: { queueLength: 0, runningTests: 0, estimatedWaitTime: 0 },
        message: '��ȡ����״̬ʧ��'
      };
    }
  }

  /**
   * ��ȡ����ͳ����Ϣ
   */
  async getTestStatistics(timeRange: string = '7d'): Promise<ApiResponse<any>> {
    try {
      return await apiService.apiGet(`${this.baseUrl}/statistics?timeRange=${timeRange}`);
    } catch (error) {
      Logger.error('��ȡ����ͳ��ʧ��:', error);
      return {
        success: false,
        data: null,
        message: '��ȡ����ͳ��ʧ��'
      };
    }
  }
}

// ��������ʵ��
export const testProgressService = new TestProgressService();

// ҳ��ж��ʱ������Դ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    testProgressService.cleanup();
  });
}

export default testProgressService;
