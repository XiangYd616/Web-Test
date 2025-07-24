/**
 * 压力测试记录管理 Hook
 * 提供测试记录的创建、更新、查询等功能
 */

import { useCallback, useEffect, useState } from 'react';
import { stressTestRecordService, type StressTestRecord, type TestRecordQuery } from '../services/stressTestRecordService';

export interface UseStressTestRecordOptions {
  autoLoad?: boolean;
  defaultQuery?: TestRecordQuery;
}

export interface UseStressTestRecordReturn {
  // 状态
  records: StressTestRecord[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // 当前测试记录
  currentRecord: StressTestRecord | null;

  // 操作方法
  createRecord: (testData: Partial<StressTestRecord>) => Promise<StressTestRecord>;
  updateRecord: (id: string, updates: Partial<StressTestRecord>) => Promise<StressTestRecord>;
  completeRecord: (id: string, results: StressTestRecord['results'], score?: number) => Promise<StressTestRecord>;
  failRecord: (id: string, error: string) => Promise<StressTestRecord>;
  cancelRecord: (id: string, reason?: string) => Promise<StressTestRecord>;
  setWaitingRecord: (id: string, reason?: string) => Promise<StressTestRecord>;
  startFromWaitingRecord: (id: string) => Promise<StressTestRecord>;
  deleteRecord: (id: string) => Promise<boolean>;
  loadRecords: (query?: TestRecordQuery) => Promise<void>;
  loadRecord: (id: string) => Promise<StressTestRecord>;
  refreshRecords: () => Promise<void>;

  // 实时更新
  startRecording: (testData: Partial<StressTestRecord>) => Promise<string>;
  updateProgress: (id: string, progress: number, phase?: string) => Promise<void>;
  addRealTimeData: (id: string, dataPoint: any) => Promise<void>;
}

export const useStressTestRecord = (options: UseStressTestRecordOptions = {}): UseStressTestRecordReturn => {
  const { autoLoad = true, defaultQuery = {} } = options;

  // 状态管理
  const [records, setRecords] = useState<StressTestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentRecord, setCurrentRecord] = useState<StressTestRecord | null>(null);
  const [currentQuery, setCurrentQuery] = useState<TestRecordQuery>(defaultQuery);

  // 创建测试记录
  const createRecord = useCallback(async (testData: Partial<StressTestRecord>): Promise<StressTestRecord> => {
    try {
      setError(null);
      const record = await stressTestRecordService.createTestRecord(testData);

      // 更新本地状态
      setRecords(prev => [record, ...prev]);
      setCurrentRecord(record);

      return record;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 更新测试记录
  const updateRecord = useCallback(async (id: string, updates: Partial<StressTestRecord>): Promise<StressTestRecord> => {
    try {
      setError(null);
      const updatedRecord = await stressTestRecordService.updateTestRecord(id, updates);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? updatedRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(updatedRecord);
      }

      return updatedRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 完成测试记录
  const completeRecord = useCallback(async (
    id: string,
    results: StressTestRecord['results'],
    score?: number
  ): Promise<StressTestRecord> => {
    try {
      setError(null);
      const completedRecord = await stressTestRecordService.completeTestRecord(id, results, score);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? completedRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(completedRecord);
      }

      return completedRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 标记测试失败
  const failRecord = useCallback(async (id: string, errorMsg: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const failedRecord = await stressTestRecordService.failTestRecord(id, errorMsg);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? failedRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(failedRecord);
      }

      return failedRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 取消测试记录
  const cancelRecord = useCallback(async (id: string, reason?: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const cancelledRecord = await stressTestRecordService.cancelTestRecord(id, reason);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? cancelledRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(cancelledRecord);
      }

      return cancelledRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 设置等待状态
  const setWaitingRecord = useCallback(async (id: string, reason?: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const waitingRecord = await stressTestRecordService.setTestWaiting(id, reason);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? waitingRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(waitingRecord);
      }

      return waitingRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 从等待状态开始测试
  const startFromWaitingRecord = useCallback(async (id: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const runningRecord = await stressTestRecordService.startFromWaiting(id);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? runningRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(runningRecord);
      }

      return runningRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 删除测试记录
  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await stressTestRecordService.deleteTestRecord(id);

      if (success) {
        // 更新本地状态
        setRecords(prev => prev.filter(record => record.id !== id));

        if (currentRecord?.id === id) {
          setCurrentRecord(null);
        }
      }

      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentRecord]);

  // 加载测试记录列表
  const loadRecords = useCallback(async (query: TestRecordQuery = {}): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const mergedQuery = { ...currentQuery, ...query };
      setCurrentQuery(mergedQuery);

      const response = await stressTestRecordService.getTestRecords(mergedQuery);

      setRecords(response.data.tests);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentQuery]);

  // 加载单个测试记录
  const loadRecord = useCallback(async (id: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const record = await stressTestRecordService.getTestRecord(id);
      setCurrentRecord(record);
      return record;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 刷新记录列表
  const refreshRecords = useCallback(async (): Promise<void> => {
    await loadRecords(currentQuery);
  }, [loadRecords, currentQuery]);

  // 开始记录测试
  const startRecording = useCallback(async (testData: Partial<StressTestRecord>): Promise<string> => {
    const record = await createRecord({
      ...testData,
      status: 'running',
      startTime: new Date().toISOString()
    });
    return record.id;
  }, [createRecord]);

  // 更新测试进度
  const updateProgress = useCallback(async (id: string, progress: number, phase?: string): Promise<void> => {
    await updateRecord(id, {
      progress,
      currentPhase: phase,
      updatedAt: new Date().toISOString()
    });
  }, [updateRecord]);

  // 添加实时数据
  const addRealTimeData = useCallback(async (id: string, dataPoint: any): Promise<void> => {
    const record = records.find(r => r.id === id) || currentRecord;
    if (!record) return;

    const existingData = record.results?.realTimeData || [];
    const newRealTimeData = [...existingData, dataPoint];

    await updateRecord(id, {
      results: {
        ...record.results,
        realTimeData: newRealTimeData
      }
    });
  }, [records, currentRecord, updateRecord]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadRecords(defaultQuery);
    }
  }, [autoLoad, defaultQuery, loadRecords]);

  return {
    // 状态
    records,
    loading,
    error,
    pagination,
    currentRecord,

    // 操作方法
    createRecord,
    updateRecord,
    completeRecord,
    failRecord,
    cancelRecord,
    setWaitingRecord,
    startFromWaitingRecord,
    deleteRecord,
    loadRecords,
    loadRecord,
    refreshRecords,

    // 实时更新
    startRecording,
    updateProgress,
    addRealTimeData
  };
};

export default useStressTestRecord;
