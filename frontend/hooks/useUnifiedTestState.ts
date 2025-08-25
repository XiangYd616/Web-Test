/**
 * 统一测试状态管理Hook
 * 基于压力测试的完整状态管理系统，适用于所有测试类型
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { UnifiedTestStateManager, type BaseTestConfig, type QueueStats, type TestPhase, type TestStatus } from '../services/testing/unifiedTestStateManager';
import { TestProgress } from '../services/api/testProgressService';

export interface UseUnifiedTestStateOptions {
  testType: string;
  maxConcurrentTests?: number;
  defaultTimeout?: number;
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  enablePersistence?: boolean;
  onTestStarted?: (data: any) => void;
  onTestProgress?: (data: any) => void;
  onTestCompleted?: (data: any) => void;
  onTestFailed?: (data: any) => void;
  onTestCancelled?: (data: any) => void;
  onTestQueued?: (data: any) => void;
  onStatusUpdate?: (data: any) => void;
}

export interface UseUnifiedTestStateReturn {
  // 状态
  testId: string | null;
  recordId: string | null;
  status: TestStatus;
  phase: TestPhase;
  message: string;
  queueStats: QueueStats;
  isRunning: boolean;
  isQueued: boolean;
  canStartTest: boolean;

  // 操作
  startTest: (config: BaseTestConfig) => Promise<string>;
  cancelTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  reset: () => void;

  // 数据
  getState: () => any;

  // 错误
  error: string | null;
}

/**
 * 统一测试状态管理Hook
 */
export function useUnifiedTestState(options: UseUnifiedTestStateOptions): UseUnifiedTestStateReturn {
  const managerRef = useRef<UnifiedTestStateManager | null>(null);

  // 状态
  const [testId, setTestId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [status, setStatus] = useState<TestStatus>('idle');
  const [phase, setPhase] = useState<TestPhase>('IDLE');
  const [message, setMessage] = useState<string>('');
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalRunning: 0,
    totalQueued: 0,
    maxConcurrent: options.maxConcurrentTests || 3,
    estimatedWaitTime: 0
  });
  const [error, setError] = useState<string | null>(null);

  // 初始化管理器
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new UnifiedTestStateManager({
        testType: options.testType,
        maxConcurrentTests: options.maxConcurrentTests,
        defaultTimeout: options.defaultTimeout,
        enableQueue: options.enableQueue,
        enableWebSocket: options.enableWebSocket,
        enablePersistence: options.enablePersistence
      });

      const manager = managerRef.current;

      // 注册事件监听器
      manager.on('testStarted', (data) => {
        setTestId(data.testId);
        setRecordId(data.recordId);
        setError(null);
        options.onTestStarted?.(data);
      });

      manager.on('testProgress', (data) => {
        options.onTestProgress?.(data);
      });

      manager.on('testCompleted', (data) => {
        setError(null);
        options.onTestCompleted?.(data);
      });

      manager.on('testFailed', (data) => {
        setError(data.error);
        options.onTestFailed?.(data);
      });

      manager.on('testCancelled', (data) => {
        setError(null);
        options.onTestCancelled?.(data);
      });

      manager.on('testQueued', (data) => {
        setQueueStats(data.queueStats);
        options.onTestQueued?.(data);
      });

      manager.on('statusUpdate', (data) => {
        setStatus(data.status);
        setPhase(data.phase);
        setMessage(data.message);
        setTestId(data.testId);
        options.onStatusUpdate?.(data);
      });

      manager.on('testTimeout', (data) => {
        setError('测试超时');
      });

      manager.on('cancelError', (data) => {
        setError(data.error);
      });

      manager.on('reset', () => {
        setTestId(null);
        setRecordId(null);
        setStatus('idle');
        setPhase('IDLE');
        setMessage('');
        setError(null);
      });
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [options]);

  // 启动测试
  const startTest = useCallback(async (config: BaseTestConfig): Promise<string> => {
    if (!managerRef.current) {
      throw new Error('测试管理器未初始化');
    }

    try {
      setError(null);
      const testId = await managerRef.current.startTest(config);
      return testId;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, []);

  // 取消测试
  const cancelTest = useCallback(async (): Promise<void> => {
    if (!managerRef.current) {
      throw new Error('测试管理器未初始化');
    }

    try {
      await managerRef.current.cancelTest();
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  }, []);

  // 停止测试
  const stopTest = useCallback(async (): Promise<void> => {
    return cancelTest();
  }, [cancelTest]);

  // 重置状态
  const reset = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reset();
    }
  }, []);

  // 获取状态
  const getState = useCallback(() => {
    return managerRef.current?.getState() || null;
  }, []);

  // 计算派生状态
  const isRunning = status === 'running' || status === 'starting';
  const isQueued = status === 'queued';
  const canStartTest = status === 'idle' && !error;

  return {
    // 状态
    testId,
    recordId,
    status,
    phase,
    message,
    queueStats,
    isRunning,
    isQueued,
    canStartTest,

    // 操作
    startTest,
    cancelTest,
    stopTest,
    reset,

    // 数据
    getState,

    // 错误
    error
  };
}

/**
 * 简化版测试状态Hook - 用于简单的测试场景
 */
export interface UseSimpleTestStateOptions {
  testType: string;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useSimpleTestState(options: UseSimpleTestStateOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const unifiedState = useUnifiedTestState({
    testType: options.testType,
    enableQueue: false,
    enableWebSocket: true,
    onTestStarted: () => {
      setIsRunning(true);
      setProgress(0);
      setMessage('测试已启动');
      setResult(null);
      setError(null);
    },
    onTestProgress: (data) => {
      setProgress(data.progress || 0);
      setMessage(data.message || '');
      options.onProgress?.(data.progress || 0, data.message || '');
    },
    onTestCompleted: (data) => {
      setIsRunning(false);
      setProgress(100);
      setMessage('测试完成');
      setResult(data.result);
      options.onComplete?.(data.result);
    },
    onTestFailed: (data) => {
      setIsRunning(false);
      setError(data.error);
      options.onError?.(data.error);
    },
    onTestCancelled: () => {
      setIsRunning(false);
      setMessage('测试已取消');
    }
  });

  const startTest = useCallback(async (config: BaseTestConfig) => {
    return unifiedState.startTest(config);
  }, [unifiedState.startTest]);

  const cancelTest = useCallback(async () => {
    return unifiedState.cancelTest();
  }, [unifiedState.cancelTest]);

  return {
    isRunning,
    progress,
    message,
    result,
    error,
    startTest,
    cancelTest,
    canStartTest: unifiedState.canStartTest
  };
}

/**
 * 批量测试状态Hook - 用于管理多个测试
 */
export interface UseBatchTestStateOptions {
  testType: string;
  maxConcurrent?: number;
  onBatchProgress?: (completed: number, total: number) => void;
  onBatchComplete?: (results: any[]) => void;
}

export function useBatchTestState(options: UseBatchTestStateOptions) {
  const [tests, setTests] = useState<Map<string, any>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);

  const unifiedState = useUnifiedTestState({
    testType: options.testType,
    maxConcurrentTests: options.maxConcurrent || 3,
    enableQueue: true,
    onTestCompleted: (data) => {
      setTests(prev => {
        const newTests = new Map(prev);
        newTests.set(data.testId, { ...newTests.get(data.testId), result: data.result, status: 'completed' });
        return newTests;
      });

      setCompleted(prev => {
        const newCompleted = prev + 1;
        options.onBatchProgress?.(newCompleted, total);

        if (newCompleted >= total) {
          setIsRunning(false);
          const results = Array.from(tests.values()).map(test => test.result);
          options.onBatchComplete?.(results);
        }

        return newCompleted;
      });
    },
    onTestFailed: (data) => {
      setTests(prev => {
        const newTests = new Map(prev);
        newTests.set(data.testId, { ...newTests.get(data.testId), error: data.error, status: 'failed' });
        return newTests;
      });

      setCompleted(prev => prev + 1);
    }
  });

  const startBatchTests = useCallback(async (configs: BaseTestConfig[]) => {
    setTests(new Map());
    setCompleted(0);
    setTotal(configs.length);
    setIsRunning(true);

    const testPromises = configs.map(async (config) => {
      try {
        const testId = await unifiedState.startTest(config);
        setTests(prev => {
          const newTests = new Map(prev);
          newTests.set(testId, { config, status: 'running' });
          return newTests;
        });
        return testId;
      } catch (error) {
        console.error('启动测试失败:', error);
        return null;
      }
    });

    return Promise.all(testPromises);
  }, [unifiedState.startTest]);

  const cancelAllTests = useCallback(async () => {
    // 这里应该取消所有正在运行的测试
    // 简化实现
    await unifiedState.cancelTest();
    setIsRunning(false);
  }, [unifiedState.cancelTest]);

  return {
    tests: Array.from(tests.values()),
    isRunning,
    completed,
    total,
    progress: total > 0 ? (completed / total) * 100 : 0,
    startBatchTests,
    cancelAllTests
  };
}

export default useUnifiedTestState;
