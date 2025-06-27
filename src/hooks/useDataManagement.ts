import { useState, useEffect, useCallback } from 'react';
import { advancedDataManager, DataRecord, DataQuery, DataAnalytics, DataBackup, DataSyncConfig } from '../services/advancedDataManager';

export interface UseDataManagementReturn {
  // 数据浏览
  records: DataRecord[];
  totalRecords: number;
  loading: boolean;
  error: string | null;
  
  // 分析数据
  analytics: DataAnalytics | null;
  analyticsLoading: boolean;
  
  // 备份管理
  backups: DataBackup[];
  backupsLoading: boolean;
  
  // 同步配置
  syncConfig: DataSyncConfig | null;
  syncLoading: boolean;
  
  // 查询和过滤
  query: DataQuery;
  setQuery: (query: DataQuery) => void;
  
  // 数据操作
  loadData: () => Promise<void>;
  loadAnalytics: () => Promise<void>;
  loadBackups: () => Promise<void>;
  loadSyncConfig: () => Promise<void>;
  
  createRecord: (type: string, data: any, metadata?: any) => Promise<DataRecord>;
  updateRecord: (id: string, data: any, metadata?: any) => Promise<DataRecord>;
  deleteRecord: (id: string) => Promise<boolean>;
  batchDelete: (ids: string[]) => Promise<void>;
  
  // 备份操作
  createBackup: (config: any) => Promise<DataBackup>;
  restoreBackup: (backupId: string, options?: any) => Promise<{ taskId: string }>;
  
  // 同步操作
  updateSyncConfig: (config: Partial<DataSyncConfig>) => Promise<DataSyncConfig>;
  triggerSync: (targetId?: string) => Promise<{ taskId: string }>;
  
  // 导入导出
  exportData: (format: 'json' | 'csv' | 'xlsx', selectedIds?: string[]) => Promise<void>;
  importData: (file: File, config: any) => Promise<{ taskId: string }>;
  
  // 数据验证和清理
  validateData: (query?: DataQuery) => Promise<any>;
  cleanupData: (config: any) => Promise<{ taskId: string }>;
}

export const useDataManagement = (): UseDataManagementReturn => {
  // 状态管理
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [analytics, setAnalytics] = useState<DataAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const [backups, setBackups] = useState<DataBackup[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  
  const [syncConfig, setSyncConfig] = useState<DataSyncConfig | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  
  const [query, setQuery] = useState<DataQuery>({
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 数据加载函数
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await advancedDataManager.queryData(query);
      setRecords(result.data);
      setTotalRecords(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    
    try {
      const analyticsData = await advancedDataManager.getAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    setBackupsLoading(true);
    
    try {
      const backupList = await advancedDataManager.getBackups();
      setBackups(backupList);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setBackupsLoading(false);
    }
  }, []);

  const loadSyncConfig = useCallback(async () => {
    setSyncLoading(true);
    
    try {
      const config = await advancedDataManager.getSyncConfig();
      setSyncConfig(config);
    } catch (err) {
      console.error('Failed to load sync config:', err);
      // 设置默认配置
      setSyncConfig({
        enabled: false,
        interval: 60,
        targets: [],
        conflictResolution: 'local',
        retryAttempts: 3
      });
    } finally {
      setSyncLoading(false);
    }
  }, []);

  // 数据操作函数
  const createRecord = useCallback(async (type: string, data: any, metadata?: any): Promise<DataRecord> => {
    try {
      const record = await advancedDataManager.createRecord(type, data, metadata);
      await loadData(); // 重新加载数据
      return record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建记录失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const updateRecord = useCallback(async (id: string, data: any, metadata?: any): Promise<DataRecord> => {
    try {
      const record = await advancedDataManager.updateRecord(id, data, metadata);
      await loadData(); // 重新加载数据
      return record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新记录失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await advancedDataManager.deleteRecord(id);
      if (success) {
        await loadData(); // 重新加载数据
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除记录失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  const batchDelete = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const operations = ids.map(id => ({
        type: 'delete' as const,
        id
      }));
      
      await advancedDataManager.batchOperation(operations);
      await loadData(); // 重新加载数据
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量删除失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  // 备份操作函数
  const createBackup = useCallback(async (config: any): Promise<DataBackup> => {
    try {
      const backup = await advancedDataManager.createBackup(config);
      await loadBackups(); // 重新加载备份列表
      return backup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建备份失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadBackups]);

  const restoreBackup = useCallback(async (backupId: string, options?: any): Promise<{ taskId: string }> => {
    try {
      const result = await advancedDataManager.restoreBackup(backupId, options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '恢复备份失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 同步操作函数
  const updateSyncConfig = useCallback(async (config: Partial<DataSyncConfig>): Promise<DataSyncConfig> => {
    try {
      const updatedConfig = await advancedDataManager.updateSyncConfig(config);
      setSyncConfig(updatedConfig);
      return updatedConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新同步配置失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const triggerSync = useCallback(async (targetId?: string): Promise<{ taskId: string }> => {
    try {
      const result = await advancedDataManager.triggerSync(targetId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '触发同步失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 导入导出函数
  const exportData = useCallback(async (format: 'json' | 'csv' | 'xlsx', selectedIds?: string[]): Promise<void> => {
    try {
      const exportQuery = selectedIds && selectedIds.length > 0 
        ? { ...query, ids: selectedIds }
        : query;
        
      const result = await advancedDataManager.exportData({
        query: exportQuery,
        format,
        compression: true
      });

      if (result.downloadUrl) {
        // 直接下载
        window.open(result.downloadUrl, '_blank');
      } else {
        // 异步任务，显示任务ID
        alert(`导出任务已创建，任务ID: ${result.taskId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [query]);

  const importData = useCallback(async (file: File, config: any): Promise<{ taskId: string }> => {
    try {
      const result = await advancedDataManager.importData(file, config);
      await loadData(); // 重新加载数据
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入数据失败';
      setError(errorMessage);
      throw err;
    }
  }, [loadData]);

  // 数据验证和清理函数
  const validateData = useCallback(async (validateQuery?: DataQuery): Promise<any> => {
    try {
      const result = await advancedDataManager.validateData(validateQuery);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据验证失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const cleanupData = useCallback(async (config: any): Promise<{ taskId: string }> => {
    try {
      const result = await advancedDataManager.cleanupData(config);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据清理失败';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  useEffect(() => {
    loadSyncConfig();
  }, [loadSyncConfig]);

  return {
    // 数据状态
    records,
    totalRecords,
    loading,
    error,
    
    // 分析数据
    analytics,
    analyticsLoading,
    
    // 备份数据
    backups,
    backupsLoading,
    
    // 同步配置
    syncConfig,
    syncLoading,
    
    // 查询状态
    query,
    setQuery,
    
    // 数据操作
    loadData,
    loadAnalytics,
    loadBackups,
    loadSyncConfig,
    
    createRecord,
    updateRecord,
    deleteRecord,
    batchDelete,
    
    // 备份操作
    createBackup,
    restoreBackup,
    
    // 同步操作
    updateSyncConfig,
    triggerSync,
    
    // 导入导出
    exportData,
    importData,
    
    // 数据验证和清理
    validateData,
    cleanupData
  };
};
