/**
 * 统一的测试数据流管理Hook
 */

import { useState, useCallback, useRef    } from 'react';import { testService    } from '../services/unifiedTestService';import { TestConfig, TestResult, TestProgress, TestError    } from '../types/index';export interface UseUnifiedTestFlowReturn<T extends TestResult = TestResult>     {'
  // 状态
  isRunning: boolean;
  progress: number;
  result: T | null;
  error: TestError | null;
  
  // 操作
  startTest: (config: TestConfig) => Promise<void>;
  cancelTest: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  
  // 历史记录
  history: T[];
  historyLoading: boolean;
  loadHistory: () => Promise<void>;
  deleteHistoryItem: (testId: string) => Promise<void>;
}

export function useUnifiedTestFlow<T extends TestResult = TestResult>(
  testType: string
): UseUnifiedTestFlowReturn<T>   {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<TestError | null>(null);
  const [history, setHistory] = useState<T[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const currentTestId = useRef<string | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const startTest = useCallback(async (config: TestConfig) => {
    try {
      setIsRunning(true);
      setProgress(0);
      setResult(null);
      setError(null);

      // 启动测试
      const { testId } = await testService.startTest(testType, config);
      currentTestId.current = testId;

      // 开始轮询进度
      progressInterval.current = setInterval(async () => {
        try {
          const progressData = await testService.getTestProgress(testType, testId);
          setProgress(progressData.percentage);

          // 如果测试完成，获取结果
          if (progressData.percentage >= 100) {
            const testResult = await testService.getTestResult(testType, testId);
            setResult(testResult as T);
            setIsRunning(false);
            
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }
          }
        } catch (err) {
          console.error('获取测试进度失败:', err);'
        }
      }, 1000);

    } catch (err) {
      setError(err as TestError);
      setIsRunning(false);
    }
  }, [testType]);

  const cancelTest = useCallback(async () => {
    if (currentTestId.current) {
      try {
        await testService.cancelTest(testType, currentTestId.current);
      } catch (err) {
        console.error('取消测试失败:', err);'
      }
    }
    
    setIsRunning(false);
    setProgress(0);
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, [testType]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const historyData = await testService.getTestHistory(testType);
      setHistory(historyData as T[]);
    } catch (err) {
      console.error('加载测试历史失败:', err);'
    } finally {
      setHistoryLoading(false);
    }
  }, [testType]);

  const deleteHistoryItem = useCallback(async (testId: string) => {
    try {
      await testService.deleteHistoryItem(testType, testId);
      setHistory(prev => prev.filter(item => item.testId !== testId));
    } catch (err) {
      console.error('删除历史记录失败:', err);'
    }
  }, [testType]);

  return {
    isRunning,
    progress,
    result,
    error,
    startTest,
    cancelTest,
    clearResult,
    clearError,
    history,
    historyLoading,
    loadHistory,
    deleteHistoryItem
  };
}