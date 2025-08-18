import { apiClient } from './api

export interface DataExportOptions {
  format: 'json' | 'csv' | 'xlsx'
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
}

export interface DataImportOptions {
  file: File;
  format: 'json' | 'csv' | 'xlsx'
  mapping?: Record<string, string>;
}

export interface DataBackupOptions {
  includeUserData?: boolean;
  includeTestResults?: boolean;
  includeSettings?: boolean;
  compression?: boolean;
}

export interface DataSyncOptions {
  endpoint: string;
  apiKey?: string;
  syncDirection: 'upload' | 'download' | 'bidirectional'
  conflictResolution: 'local' | 'remote' | 'merge'
}

class DataService {
  // 数据导出
  async exportData(options: DataExportOptions): Promise<Blob> {
    try {
      const response = await apiClient.post('/data/export', options, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('数据导出失败:', error);
      throw new Error('数据导出失败');
    }
  }

  // 数据导入
  async importData(options: DataImportOptions): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', options.file);
      formData.append('format', options.format);
      if (options.mapping) {
        formData.append('mapping', JSON.stringify(options.mapping));
      }

      const response = await apiClient.post('/data/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('数据导入失败:', error);
      throw new Error('数据导入失败');
    }
  }

  // 数据备份
  async createBackup(options: DataBackupOptions): Promise<{
    backupId: string;
    downloadUrl: string;
    size: number;
  }> {
    try {
      const response = await apiClient.post('/data/backup', options);
      return response.data;
    } catch (error) {
      console.error('数据备份失败:', error);
      throw new Error('数据备份失败');
    }
  }

  // 数据恢复
  async restoreBackup(backupId: string): Promise<{
    success: boolean;
    restoredItems: number;
  }> {
    try {
      const response = await apiClient.post(`/data/restore/${backupId}`);
      return response.data;
    } catch (error) {
      console.error('数据恢复失败:', error);
      throw new Error('数据恢复失败');
    }
  }

  // 数据同步
  async syncData(options: DataSyncOptions): Promise<{
    success: boolean;
    syncedItems: number;
    conflicts: any[];
  }> {
    try {
      const response = await apiClient.post('/data/sync', options);
      return response.data;
    } catch (error) {
      console.error('数据同步失败:', error);
      throw new Error('数据同步失败');
    }
  }

  // 获取数据统计
  async getDataStats(): Promise<{
    totalRecords: number;
    totalSize: number;
    lastBackup?: string;
    lastSync?: string;
    categories: Record<string, number>;
  }> {
    try {
      const response = await apiClient.get('/data/stats');
      return response.data;
    } catch (error) {
      console.error('获取数据统计失败:', error);
      throw new Error('获取数据统计失败');
    }
  }

  // 数据清理
  async cleanupData(options: {
    olderThan?: string;
    categories?: string[];
    dryRun?: boolean;
  }): Promise<{
    deletedItems: number;
    freedSpace: number;
    preview?: any[];
  }> {
    try {
      const response = await apiClient.post('/data/cleanup', options);
      return response.data;
    } catch (error) {
      console.error('数据清理失败:', error);
      throw new Error('数据清理失败');
    }
  }

  // 数据验证
  async validateData(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fixedIssues: number;
  }> {
    try {
      const response = await apiClient.post('/data/validate');
      return response.data;
    } catch (error) {
      console.error('数据验证失败:', error);
      throw new Error('数据验证失败');
    }
  }

  // 获取备份列表
  async getBackups(): Promise<Array<{
    id: string;
    createdAt: string;
    size: number;
    type: string;
    description?: string;
  }>> {
    try {
      const response = await apiClient.get('/data/backups');
      return response.data;
    } catch (error) {
      console.error('获取备份列表失败:', error);
      throw new Error('获取备份列表失败');
    }
  }

  // 删除备份
  async deleteBackup(backupId: string): Promise<void> {
    try {
      await apiClient.delete(`/data/backups/${backupId}`);
    } catch (error) {
      console.error('删除备份失败:', error);
      throw new Error('删除备份失败');
    }
  }
}

export const dataService = new DataService();
