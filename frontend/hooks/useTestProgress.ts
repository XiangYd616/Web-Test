/**
 * 测试进度监控Hook
 * 提供简化的测试进度监控功能
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { testProgressService, type ProgressListener, type TestProgress } from '../services/api/testProgressService';

export interface UseTestProgressOptions {
  autoStart?: boolean; // 是否自动开始监控
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: TestProgress) => void;
}

export interface UseTestProgressReturn {
  progress: TestProgress | null;
  isMonitoring: boolean;
  startMonitoring: (testId: string) => void;
  stopMonitoring: () => void;
  cancelTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  error: string | null;
}

/**
 * 测试进度监控Hook
 */
export function useTestProgress(
  testId?: string,
  options: UseTestProgressOptions = {}
): UseTestProgressReturn {
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentTestId = useRef<string | null>(null);
  const listenerRef = useRef<ProgressListener | null>(null);

  // 创建进度监听器
  const createListener = useCallback((): ProgressListener => {
    return {
      onProgress: (progressData: TestProgress) => {
        setProgress(progressData);
        setError(null);
        options.onProgress?.(progressData);
      },
      onComplete: (result: any) => {
        setIsMonitoring(false);
        options.onComplete?.(result);
      },
      onError: (errorMessage: string) => {
        setError(errorMessage);
        setIsMonitoring(false);
        options.onError?.(errorMessage);
      }
    };
  }, [options]);

  // 开始监控
  const startMonitoring = useCallback((targetTestId: string) => {
    // 如果已经在监控其他测试，先停止
    if (currentTestId.current && listenerRef.current) {
      testProgressService.stopMonitoring(currentTestId.current, listenerRef.current);
    }

    currentTestId.current = targetTestId;
    listenerRef.current = createListener();
    
    testProgressService.startMonitoring(targetTestId, listenerRef.current);
    setIsMonitoring(true);
    setError(null);
  }, [createListener]);

  // 停止监控
  const stopMonitoring = useCallback(() => {
    if (currentTestId.current && listenerRef.current) {
      testProgressService.stopMonitoring(currentTestId.current, listenerRef.current);
      currentTestId.current = null;
      listenerRef.current = null;
      setIsMonitoring(false);
    }
  }, []);

  // 取消测试
  const cancelTest = useCallback(async () => {
    if (!currentTestId.current) return;

    try {
      await testProgressService.cancelTest(currentTestId.current);
      stopMonitoring();
    } catch (error) {
      console.error('取消测试失败:', error);
      setError('取消测试失败');
    }
  }, [stopMonitoring]);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (!currentTestId.current) return;

    try {
      await testProgressService.stopTest(currentTestId.current);
      stopMonitoring();
    } catch (error) {
      console.error('停止测试失败:', error);
      setError('停止测试失败');
    }
  }, [stopMonitoring]);

  // 自动开始监控
  useEffect(() => {
    if (testId && options.autoStart) {
      startMonitoring(testId);
    }

    return () => {
      stopMonitoring();
    };
  }, [testId, options.autoStart, startMonitoring, stopMonitoring]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    progress,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    cancelTest,
    stopTest,
    error
  };
}

/**
 * 批量测试进度监控Hook
 */
export function useBatchTestProgress(
  testIds: string[] = [],
  options: UseTestProgressOptions = {}
): {
  progresses: Map<string, TestProgress>;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  error: string | null;
} {
  const [progresses, setProgresses] = useState<Map<string, TestProgress>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const listenerRef = useRef<ProgressListener | null>(null);

  // 创建批量监听器
  const createBatchListener = useCallback((): ProgressListener => {
    return {
      onProgress: (progressData: TestProgress) => {
        setProgresses(prev => new Map(prev.set(progressData.id, progressData)));
        setError(null);
        options.onProgress?.(progressData);
      },
      onComplete: (result: any) => {
        options.onComplete?.(result);
        
        // 检查是否所有测试都完成了
        const allCompleted = testIds.every(id => {
          const progress = progresses.get(id);
          return progress && (progress.status === 'completed' || progress.status === 'failed');
        });
        
        if (allCompleted) {
          setIsMonitoring(false);
        }
      },
      onError: (errorMessage: string) => {
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
    };
  }, [testIds, progresses, options]);

  // 开始批量监控
  const startMonitoring = useCallback(() => {
    if (testIds.length === 0) return;

    listenerRef.current = createBatchListener();
    testProgressService.startBatchMonitoring(testIds, listenerRef.current);
    setIsMonitoring(true);
    setError(null);
  }, [testIds, createBatchListener]);

  // 停止批量监控
  const stopMonitoring = useCallback(() => {
    if (listenerRef.current) {
      testIds.forEach(testId => {
        testProgressService.stopMonitoring(testId, listenerRef.current!);
      });
      listenerRef.current = null;
      setIsMonitoring(false);
    }
  }, [testIds]);

  // 自动开始监控
  useEffect(() => {
    if (testIds.length > 0 && options.autoStart) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [testIds, options.autoStart, startMonitoring, stopMonitoring]);

  return {
    progresses,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    error
  };
}

/**
 * 测试队列状态Hook
 */
export function useTestQueue() {
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    runningTests: 0,
    estimatedWaitTime: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshQueueStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await testProgressService.getQueueStatus();
      if (response.success) {
        setQueueStatus(response.data);
      } else {
        setError(response.message || '获取队列状态失败');
      }
    } catch (error) {
      setError('获取队列状态失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 定期刷新队列状态
  useEffect(() => {
    refreshQueueStatus();
    
    const interval = setInterval(refreshQueueStatus, 5000); // 每5秒刷新一次
    
    return () => clearInterval(interval);
  }, [refreshQueueStatus]);

  return {
    queueStatus,
    isLoading,
    error,
    refresh: refreshQueueStatus
  };
}

/**
 * 测试统计Hook
 */
export function useTestStatistics(timeRange: number = 30) {
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await testProgressService.getTestStatistics(timeRange);
      if (response.success) {
        setStatistics(response.data);
      } else {
        setError(response.message || '获取统计信息失败');
      }
    } catch (error) {
      setError('获取统计信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    refreshStatistics();
  }, [refreshStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refresh: refreshStatistics
  };
}
