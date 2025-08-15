/**
 * 批量操作服务
 * 提供批量测试、批量导出、批量管理等功能
 */

import { createApiUrl } from '../../config/api';

export interface BatchTestConfig {
  urls: string[];
  testTypes: string[];
  options: {
    concurrent?: number;
    timeout?: number;
    retryAttempts?: number;
    notifyOnComplete?: boolean;
    exportResults?: boolean;
  };
}

export interface BatchExportConfig {
  dataType: 'test-results' | 'test-history' | 'analytics' | 'reports';
  filters: {
    startDate?: string;
    endDate?: string;
    testTypes?: string[];
    urls?: string[];
    status?: string[];
  };
  format: 'json' | 'csv' | 'excel' | 'pdf';
  options: {
    includeDetails?: boolean;
    compressOutput?: boolean;
    splitByType?: boolean;
  };
}

export interface BatchOperation {
  id: string;
  type: 'test' | 'export' | 'delete' | 'update';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  startTime: string;
  endTime?: string;
  config: any;
  results?: any;
  error?: string;
}

export interface BatchTestResult {
  operationId: string;
  results: Array<{
    url: string;
    testType: string;
    status: 'success' | 'failed';
    result?: any;
    error?: string;
    duration: number;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
    averageDuration: number;
  };
}

class BatchOperationService {
  private operations = new Map<string, BatchOperation>();
  private eventListeners = new Map<string, ((operation: BatchOperation) => void)[]>();

  /**
   * 批量测试
   */
  async startBatchTest(config: BatchTestConfig): Promise<string> {
    try {
      const response = await fetch(createApiUrl('/api/batch/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`批量测试启动失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const operation: BatchOperation = {
          id: result.data.operationId,
          type: 'test',
          status: 'pending',
          progress: 0,
          totalItems: config.urls.length * config.testTypes.length,
          completedItems: 0,
          failedItems: 0,
          startTime: new Date().toISOString(),
          config
        };

        this.operations.set(operation.id, operation);
        this.startPolling(operation.id);

        return operation.id;
      } else {
        throw new Error(result.message || '批量测试启动失败');
      }
    } catch (error) {
      console.error('批量测试启动失败:', error);
      throw error;
    }
  }

  /**
   * 批量导出
   */
  async startBatchExport(config: BatchExportConfig): Promise<string> {
    try {
      const response = await fetch(createApiUrl('/api/batch/export'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`批量导出启动失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const operation: BatchOperation = {
          id: result.data.operationId,
          type: 'export',
          status: 'pending',
          progress: 0,
          totalItems: result.data.totalItems || 1,
          completedItems: 0,
          failedItems: 0,
          startTime: new Date().toISOString(),
          config
        };

        this.operations.set(operation.id, operation);
        this.startPolling(operation.id);

        return operation.id;
      } else {
        throw new Error(result.message || '批量导出启动失败');
      }
    } catch (error) {
      console.error('批量导出启动失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除
   */
  async startBatchDelete(
    dataType: string,
    ids: string[],
    options: { confirmDelete?: boolean } = {}
  ): Promise<string> {
    try {
      const response = await fetch(createApiUrl('/api/batch/delete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          dataType,
          ids,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`批量删除启动失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const operation: BatchOperation = {
          id: result.data.operationId,
          type: 'delete',
          status: 'pending',
          progress: 0,
          totalItems: ids.length,
          completedItems: 0,
          failedItems: 0,
          startTime: new Date().toISOString(),
          config: { dataType, ids, options }
        };

        this.operations.set(operation.id, operation);
        this.startPolling(operation.id);

        return operation.id;
      } else {
        throw new Error(result.message || '批量删除启动失败');
      }
    } catch (error) {
      console.error('批量删除启动失败:', error);
      throw error;
    }
  }

  /**
   * 获取操作状态
   */
  async getOperationStatus(operationId: string): Promise<BatchOperation | null> {
    try {
      const response = await fetch(createApiUrl(`/api/batch/status/${operationId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取操作状态失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const operation = result.data;
        this.operations.set(operationId, operation);
        this.notifyListeners(operationId, operation);
        return operation;
      } else {
        throw new Error(result.message || '获取操作状态失败');
      }
    } catch (error) {
      console.error('获取操作状态失败:', error);
      return null;
    }
  }

  /**
   * 取消操作
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    try {
      const response = await fetch(createApiUrl(`/api/batch/cancel/${operationId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`取消操作失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const operation = this.operations.get(operationId);
        if (operation) {
          operation.status = 'cancelled';
          operation.endTime = new Date().toISOString();
          this.notifyListeners(operationId, operation);
        }
        return true;
      } else {
        throw new Error(result.message || '取消操作失败');
      }
    } catch (error) {
      console.error('取消操作失败:', error);
      return false;
    }
  }

  /**
   * 获取操作结果
   */
  async getOperationResults(operationId: string): Promise<any> {
    try {
      const response = await fetch(createApiUrl(`/api/batch/results/${operationId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取操作结果失败: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || '获取操作结果失败');
      }
    } catch (error) {
      console.error('获取操作结果失败:', error);
      throw error;
    }
  }

  /**
   * 下载导出文件
   */
  async downloadExportFile(operationId: string): Promise<void> {
    try {
      const response = await fetch(createApiUrl(`/api/batch/download/${operationId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`下载文件失败: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 从响应头获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export-${operationId}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有操作
   */
  getAllOperations(): BatchOperation[] {
    return Array.from(this.operations.values()).sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * 监听操作状态变化
   */
  onOperationUpdate(operationId: string, callback: (operation: BatchOperation) => void): () => void {
    if (!this.eventListeners.has(operationId)) {
      this.eventListeners.set(operationId, []);
    }

    this.eventListeners.get(operationId)!.push(callback);

    // 返回取消监听的函数
    return () => {
      const listeners = this.eventListeners.get(operationId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 开始轮询操作状态
   */
  private startPolling(operationId: string): void {
    const poll = async () => {
      const operation = await this.getOperationStatus(operationId);

      if (operation && ['completed', 'failed', 'cancelled'].includes(operation.status)) {
        return; // 停止轮询
      }

      // 继续轮询
      setTimeout(poll, 2000);
    };

    poll();
  }

  /**
   * 通知监听器
   */
  private notifyListeners(operationId: string, operation: BatchOperation): void {
    const listeners = this.eventListeners.get(operationId);
    if (listeners) {
      listeners.forEach(callback => callback(operation));
    }
  }

  /**
   * 清理已完成的操作
   */
  cleanupCompletedOperations(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [id, operation] of this.operations) {
      if (operation.endTime && new Date(operation.endTime) < cutoff) {
        this.operations.delete(id);
        this.eventListeners.delete(id);
      }
    }
  }
}

export const batchOperationService = new BatchOperationService();

// 自动清理已完成的操作（每小时执行一次）
setInterval(() => {
  batchOperationService.cleanupCompletedOperations();
}, 60 * 60 * 1000);
