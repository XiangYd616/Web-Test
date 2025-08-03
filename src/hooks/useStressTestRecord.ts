
import { useCallback, useEffect, useRef, useState } from 'react';
import { stressTestQueueManager, type QueueStats } from '../services/stressTestQueueManager';

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

  // 队列状态
  queueStats: QueueStats;
  currentQueueId: string | null;

  // 操作状态
  operationStates: {
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    completing: boolean;
    queuing: boolean;
  };

  // 操作方法
  createRecord: (testData: Partial<StressTestRecord>) => Promise<StressTestRecord>;
  updateRecord: (id: string, updates: Partial<StressTestRecord>) => Promise<StressTestRecord>;
  completeRecord: (id: string, results: StressTestRecord['results'], score?: number) => Promise<StressTestRecord>;
  failRecord: (id: string, error: string) => Promise<StressTestRecord>;
  cancelRecord: (id: string, reason?: string) => Promise<StressTestRecord>;
  setWaitingRecord: (id: string, reason?: string) => Promise<StressTestRecord>;
  startFromWaitingRecord: (id: string) => Promise<StressTestRecord>;
  interruptTestRecord: (id: string, reason?: string) => Promise<StressTestRecord>;
  resumeTestRecord: (id: string) => Promise<StressTestRecord>;
  deleteRecord: (id: string) => Promise<boolean>;
  loadRecords: (query?: TestRecordQuery) => Promise<void>;
  loadRecord: (id: string) => Promise<StressTestRecord>;
  refreshRecords: () => Promise<void>;

  // 队列管理方法
  enqueueTest: (testData: Partial<StressTestRecord>, priority?: 'high' | 'normal' | 'low') => Promise<string>;
  cancelQueuedTest: (queueId: string, reason?: string) => Promise<boolean>;
  getQueuePosition: (queueId: string) => number;
  estimateWaitTime: (queueId: string) => number;

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

  // 操作状态管理
  const [operationStates, setOperationStates] = useState({
    creating: false,
    updating: false,
    deleting: false,
    completing: false,
    queuing: false
  });

  // 队列状态管理
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalQueued: 0,
    totalRunning: 0,
    totalCompleted: 0,
    totalFailed: 0,
    averageWaitTime: 0,
    averageExecutionTime: 0,
    queueLength: 0,
    runningTests: [],
    nextInQueue: null
  });
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null);

  // 实时数据缓存，避免频繁更新
  const realTimeDataCache = useRef<Map<string, any[]>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 本地状态验证函数
  const isValidStatusTransition = useCallback((
    fromStatus: StressTestRecord['status'],
    toStatus: StressTestRecord['status']
  ): boolean => {
    const validTransitions: Record<string, string[]> = {
      'pending': ['running', 'cancelled'],
      'running': ['completed', 'failed', 'cancelled'],
      'completed': [], // 完成状态不能转换到其他状态
      'failed': [], // 失败状态不能转换到其他状态
      'cancelled': [] // 取消状态不能转换到其他状态
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }, []);

  // 创建测试记录 - 增强版本，包含状态管理和错误恢复
  const createRecord = useCallback(async (testData: Partial<StressTestRecord>): Promise<StressTestRecord> => {
    setOperationStates(prev => ({ ...prev, creating: true }));
    try {
      setError(null);

      // 状态验证
      if (testData.status && !['pending', 'running'].includes(testData.status)) {
        throw new Error(`创建记录时状态无效: ${testData.status}`);
      }

      const record = await stressTestRecordService.createTestRecord(testData);

      // 原子性更新本地状态
      setRecords(prev => {
        const newRecords = [record, ...prev];
        return newRecords;
      });
      setCurrentRecord(record);

      return record;
    } catch (err: any) {
      const errorMessage = `创建测试记录失败: ${err.message}`;
      setError(errorMessage);
      console.error('创建测试记录失败:', err);
      throw new Error(errorMessage);
    } finally {
      setOperationStates(prev => ({ ...prev, creating: false }));
    }
  }, []);

  // 更新测试记录 - 增强版本，包含状态验证和原子性操作
  const updateRecord = useCallback(async (id: string, updates: Partial<StressTestRecord>): Promise<StressTestRecord> => {
    setOperationStates(prev => ({ ...prev, updating: true }));
    try {
      setError(null);

      // 状态转换验证
      if (updates.status) {
        const currentRecord = records.find(r => r.id === id);
        if (currentRecord && !isValidStatusTransition(currentRecord.status, updates.status)) {
          throw new Error(`无效的状态转换: ${currentRecord.status} -> ${updates.status}`);
        }
      }

      const updatedRecord = await stressTestRecordService.updateTestRecord(id, updates);

      // 原子性更新本地状态
      setRecords(prev => {
        const newRecords = prev.map(record =>
          record.id === id ? updatedRecord : record
        );
        return newRecords;
      });

      if (currentRecord?.id === id) {
        setCurrentRecord(updatedRecord);
      }

      return updatedRecord;
    } catch (err: any) {
      const errorMessage = `更新测试记录失败: ${err.message}`;
      setError(errorMessage);
      console.error('更新测试记录失败:', err);
      throw new Error(errorMessage);
    } finally {
      setOperationStates(prev => ({ ...prev, updating: false }));
    }
  }, [currentRecord, records]);

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
      const waitingRecord = await stressTestRecordService.setTestPending(id, reason);

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
      const runningRecord = await stressTestRecordService.startFromPending(id);

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

  // 中断测试记录
  const interruptTestRecord = useCallback(async (id: string, reason?: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const interruptedRecord = await stressTestRecordService.setTestPending(id, reason || '用户中断');

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? interruptedRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(interruptedRecord);
      }

      return interruptedRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 恢复测试记录
  const resumeTestRecord = useCallback(async (id: string): Promise<StressTestRecord> => {
    try {
      setError(null);
      const resumedRecord = await stressTestRecordService.startFromPending(id);

      // 更新本地状态
      setRecords(prev => prev.map(record =>
        record.id === id ? resumedRecord : record
      ));

      if (currentRecord?.id === id) {
        setCurrentRecord(resumedRecord);
      }

      return resumedRecord;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentRecord]);

  // 队列测试 - 新增方法
  const enqueueTest = useCallback(async (
    testData: Partial<StressTestRecord>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> => {
    setOperationStates(prev => ({ ...prev, queuing: true }));
    try {
      setError(null);

      // 首先创建测试记录
      const record = await createRecord({
        ...testData,
        status: 'pending'
      });

      // 然后加入队列
      const queueId = await stressTestQueueManager.enqueueTest({
        recordId: record.id,
        testName: record.testName,
        url: record.url,
        config: record.config,
        priority,
        userId: record.userId,
        estimatedDuration: testData.config?.duration || 60,
        maxRetries: 3,
        onProgress: (progress: number, message: string) => {
          console.log(`队列测试进度: ${progress}% - ${message}`);
        },
        onComplete: (result: any) => {
          console.log('队列测试完成:', result);
          setCurrentQueueId(null);
          // 记录刷新将通过队列事件监听器处理
        },
        onError: (error: Error) => {
          console.error('队列测试失败:', error);
          setCurrentQueueId(null);
          // 记录刷新将通过队列事件监听器处理
        }
      }, priority);

      setCurrentQueueId(queueId);
      // 队列统计将通过事件监听器自动更新

      return queueId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setOperationStates(prev => ({ ...prev, queuing: false }));
    }
  }, [createRecord]);

  // 取消队列中的测试
  const cancelQueuedTest = useCallback(async (queueId: string, reason?: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await stressTestQueueManager.cancelQueuedTest(queueId, reason);

      if (success && currentQueueId === queueId) {
        setCurrentQueueId(null);
      }

      // 队列统计和记录刷新将通过事件监听器自动处理

      return success;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [currentQueueId]);

  // 获取队列位置
  const getQueuePosition = useCallback((queueId: string): number => {
    return stressTestQueueManager.getQueuePosition(queueId);
  }, []);

  // 估算等待时间
  const estimateWaitTime = useCallback((queueId: string): number => {
    return stressTestQueueManager.estimateWaitTime(queueId);
  }, []);

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

  // 添加实时数据 - 优化版本，使用缓存和批量更新
  const addRealTimeData = useCallback(async (id: string, dataPoint: any): Promise<void> => {
    try {
      // 获取记录，如果找不到则尝试从服务器获取
      let record = records.find(r => r.id === id) || currentRecord;
      if (!record) {
        try {
          record = await stressTestRecordService.getTestRecord(id);
          // 更新本地记录列表
          setRecords(prev => {
            const exists = prev.some(r => r.id === id);
            return exists ? prev : [record!, ...prev];
          });
        } catch (err) {
          console.warn(`无法获取测试记录 ${id}，跳过实时数据更新:`, err);
          return;
        }
      }

      // 使用缓存避免频繁更新
      const cachedData = realTimeDataCache.current.get(id) || [];
      cachedData.push(dataPoint);
      realTimeDataCache.current.set(id, cachedData);

      // 清除之前的定时器
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // 批量更新，减少API调用频率
      updateTimeoutRef.current = setTimeout(async () => {
        try {
          const batchData = realTimeDataCache.current.get(id) || [];
          if (batchData.length === 0) return;

          const existingData = record!.results?.realTimeData || [];
          const newRealTimeData = [...existingData, ...batchData];

          await updateRecord(id, {
            results: {
              ...record!.results,
              realTimeData: newRealTimeData
            }
          });

          // 清空缓存
          realTimeDataCache.current.delete(id);
        } catch (err) {
          console.error('批量更新实时数据失败:', err);
        }
      }, 1000); // 1秒批量更新一次

    } catch (err: any) {
      console.error('添加实时数据失败:', err);
      setError(`添加实时数据失败: ${err.message}`);
    }
  }, [records, currentRecord, updateRecord]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadRecords(defaultQuery);
    }
  }, [autoLoad, defaultQuery, loadRecords]);

  // 队列状态监听
  useEffect(() => {
    // 初始化队列统计
    const stats = stressTestQueueManager.getQueueStats();
    setQueueStats(stats);

    // 添加队列事件监听
    const removeListener = stressTestQueueManager.addListener((event: string, data: any) => {
      console.log(`队列事件: ${event}`, data);

      // 更新队列统计
      const newStats = stressTestQueueManager.getQueueStats();
      setQueueStats(newStats);

      // 根据事件类型更新本地状态
      if (event === 'testCompleted' || event === 'testFailed' || event === 'testCancelled') {
        // 延迟刷新记录，避免依赖问题
        setTimeout(() => {
          loadRecords(currentQuery);
        }, 100);
      }
    });

    return removeListener;
  }, [loadRecords, currentQuery]);

  // 清理定时器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      realTimeDataCache.current.clear();
    };
  }, []);

  return {
    // 状态
    records,
    loading,
    error,
    pagination,
    currentRecord,
    queueStats,
    currentQueueId,
    operationStates,

    // 操作方法
    createRecord,
    updateRecord,
    completeRecord,
    failRecord,
    cancelRecord,
    setWaitingRecord,
    startFromWaitingRecord,
    interruptTestRecord,
    resumeTestRecord,
    deleteRecord,
    loadRecords,
    loadRecord,
    refreshRecords,

    // 队列管理方法
    enqueueTest,
    cancelQueuedTest,
    getQueuePosition,
    estimateWaitTime,

    // 实时更新
    startRecording,
    updateProgress,
    addRealTimeData
  };
};

export default useStressTestRecord;
