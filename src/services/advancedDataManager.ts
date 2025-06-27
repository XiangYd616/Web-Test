/**
 * 高级数据管理器 - 统一管理所有数据操作
 */

export interface DataRecord {
  id: string;
  type: 'test' | 'user' | 'report' | 'log' | 'config';
  data: any;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    tags: string[];
    size: number;
    checksum: string;
  };
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
}

export interface DataQuery {
  type?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DataBackup {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  size?: number;
  recordCount?: number;
  compression?: 'none' | 'gzip' | 'brotli';
  encryption?: boolean;
  location: 'local' | 'cloud' | 'external';
  metadata: {
    description?: string;
    tags: string[];
    retentionDays: number;
  };
}

export interface DataSyncConfig {
  enabled: boolean;
  interval: number; // 分钟
  targets: {
    id: string;
    name: string;
    type: 'database' | 'api' | 'file' | 'cloud';
    endpoint: string;
    credentials?: any;
    syncTypes: string[];
    lastSync?: string;
    status: 'active' | 'inactive' | 'error';
  }[];
  conflictResolution: 'local' | 'remote' | 'manual';
  retryAttempts: number;
}

export interface DataAnalytics {
  totalRecords: number;
  recordsByType: Record<string, number>;
  storageUsage: {
    total: number;
    used: number;
    available: number;
    breakdown: Record<string, number>;
  };
  growthTrends: {
    daily: Array<{ date: string; count: number; size: number }>;
    weekly: Array<{ week: string; count: number; size: number }>;
    monthly: Array<{ month: string; count: number; size: number }>;
  };
  performance: {
    avgQueryTime: number;
    avgWriteTime: number;
    cacheHitRate: number;
    indexEfficiency: number;
  };
  dataQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
    duplicates: number;
  };
}

class AdvancedDataManager {
  private baseUrl = '/api/data-management';
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 数据查询和检索
  async queryData(query: DataQuery): Promise<{ data: DataRecord[]; total: number; hasMore: boolean }> {
    const cacheKey = `query:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const result = await this.request('/query', {
        method: 'POST',
        body: JSON.stringify(query),
      });

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Failed to query data:', error);
      throw error;
    }
  }

  // 创建数据记录
  async createRecord(type: string, data: any, metadata?: Partial<DataRecord['metadata']>): Promise<DataRecord> {
    try {
      const record = await this.request('/records', {
        method: 'POST',
        body: JSON.stringify({
          type,
          data,
          metadata: {
            tags: [],
            ...metadata,
          },
        }),
      });

      this.invalidateCache();
      return record;
    } catch (error) {
      console.error('Failed to create record:', error);
      throw error;
    }
  }

  // 更新数据记录
  async updateRecord(id: string, data: any, metadata?: Partial<DataRecord['metadata']>): Promise<DataRecord> {
    try {
      const record = await this.request(`/records/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data, metadata }),
      });

      this.invalidateCache();
      return record;
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  }

  // 删除数据记录
  async deleteRecord(id: string): Promise<boolean> {
    try {
      await this.request(`/records/${id}`, {
        method: 'DELETE',
      });

      this.invalidateCache();
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  }

  // 批量操作
  async batchOperation(operations: Array<{
    type: 'create' | 'update' | 'delete';
    id?: string;
    data?: any;
    metadata?: any;
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const result = await this.request('/batch', {
        method: 'POST',
        body: JSON.stringify({ operations }),
      });

      this.invalidateCache();
      return result;
    } catch (error) {
      console.error('Failed to execute batch operation:', error);
      throw error;
    }
  }

  // 数据备份
  async createBackup(config: {
    name: string;
    type: 'full' | 'incremental' | 'differential';
    includeTypes?: string[];
    compression?: 'none' | 'gzip' | 'brotli';
    encryption?: boolean;
    description?: string;
    tags?: string[];
  }): Promise<DataBackup> {
    try {
      const backup = await this.request('/backups', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  // 获取备份列表
  async getBackups(): Promise<DataBackup[]> {
    try {
      const result = await this.request('/backups');
      return result.data || [];
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  // 恢复备份
  async restoreBackup(backupId: string, options?: {
    overwrite?: boolean;
    includeTypes?: string[];
    targetLocation?: string;
  }): Promise<{ taskId: string }> {
    try {
      const result = await this.request(`/backups/${backupId}/restore`, {
        method: 'POST',
        body: JSON.stringify(options || {}),
      });

      return result;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // 数据同步配置
  async getSyncConfig(): Promise<DataSyncConfig> {
    try {
      const result = await this.request('/sync/config');
      return result.data;
    } catch (error) {
      console.error('Failed to get sync config:', error);
      throw error;
    }
  }

  async updateSyncConfig(config: Partial<DataSyncConfig>): Promise<DataSyncConfig> {
    try {
      const result = await this.request('/sync/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });

      return result.data;
    } catch (error) {
      console.error('Failed to update sync config:', error);
      throw error;
    }
  }

  // 手动同步
  async triggerSync(targetId?: string): Promise<{ taskId: string }> {
    try {
      const result = await this.request('/sync/trigger', {
        method: 'POST',
        body: JSON.stringify({ targetId }),
      });

      return result;
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      throw error;
    }
  }

  // 数据分析
  async getAnalytics(timeRange?: { start: string; end: string }): Promise<DataAnalytics> {
    try {
      const params = timeRange ? `?start=${timeRange.start}&end=${timeRange.end}` : '';
      const result = await this.request(`/analytics${params}`);
      return result.data;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  // 数据导出
  async exportData(config: {
    query?: DataQuery;
    format: 'json' | 'csv' | 'xlsx' | 'xml';
    compression?: boolean;
    encryption?: boolean;
  }): Promise<{ taskId: string; downloadUrl?: string }> {
    try {
      const result = await this.request('/export', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      return result;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // 数据导入
  async importData(file: File, config: {
    type: string;
    format: 'json' | 'csv' | 'xlsx' | 'xml';
    mapping?: Record<string, string>;
    validation?: boolean;
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  }): Promise<{ taskId: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('config', JSON.stringify(config));

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.invalidateCache();
      return result;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // 数据验证
  async validateData(query?: DataQuery): Promise<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    issues: Array<{
      recordId: string;
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      const result = await this.request('/validate', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      return result.data;
    } catch (error) {
      console.error('Failed to validate data:', error);
      throw error;
    }
  }

  // 数据清理
  async cleanupData(config: {
    removeDuplicates?: boolean;
    removeOrphaned?: boolean;
    removeExpired?: boolean;
    compactStorage?: boolean;
    rebuildIndexes?: boolean;
  }): Promise<{ taskId: string }> {
    try {
      const result = await this.request('/cleanup', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      return result;
    } catch (error) {
      console.error('Failed to cleanup data:', error);
      throw error;
    }
  }

  // 缓存管理
  private invalidateCache(): void {
    this.cache.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }

  // 获取任务状态
  async getTaskStatus(taskId: string): Promise<{
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
    result?: any;
    error?: string;
  }> {
    try {
      const result = await this.request(`/tasks/${taskId}`);
      return result.data;
    } catch (error) {
      console.error('Failed to get task status:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const advancedDataManager = new AdvancedDataManager();
export default advancedDataManager;
