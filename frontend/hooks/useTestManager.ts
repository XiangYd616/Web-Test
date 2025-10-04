/**
 * 测试管理器 Hook
 * 
 * 职责：
 * - 管理前端测试相关的UI状态
 * - 调用后端API执行测试
 * - 处理测试结果的展示
 * - 不包含任何测试执行逻辑
 */

import { useState, useCallback } from 'react';
import {testApiClient, TestResult, TestProgress} from '../services/api/test/testApiClient';

export interface TestManagerState {
  isLoading: boolean;
  error: Error | null;
  currentTest: TestProgress | null;
  testResults: TestResult[];
}

export interface TestManagerActions {
  startTest: (engineId: string, config: any) => Promise<TestResult>;
  stopTest: (testId: string) => Promise<void>;
  getTestStatus: (testId: string) => Promise<TestProgress | null>;
  getTestHistory: () => Promise<TestResult[]>;
  clearError: () => void;
  clearResults: () => void;
}

export type TestManagerHook = TestManagerState & TestManagerActions;

/**
 * 使用测试管理器
 * 只负责调用API和管理UI状态
 */
export function useTestManager(): TestManagerHook {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentTest, setCurrentTest] = useState<TestProgress | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // 开始测试 - 调用后端API
  const startTest = useCallback(async (engineId: string, config: any): Promise<TestResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await testApiClient.runTest({
        engineId,
        config,
        options: {
          async: true
        }
      });
      
      // 注册进度监听
      if (result.testId) {
        testApiClient.onProgress(result.testId, (progress) => {
          setCurrentTest(progress);
        });
      }
      
      // 添加到结果列表
      setTestResults(prev => [...prev, result]);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 停止测试
  const stopTest = useCallback(async (testId: string): Promise<void> => {
    try {
      await testApiClient.stopTest(testId);
      testApiClient.offProgress(testId);
      setCurrentTest(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('停止测试失败');
      setError(error);
      throw error;
    }
  }, []);

  // 获取测试状态
  const getTestStatus = useCallback(async (testId: string): Promise<TestProgress | null> => {
    try {
      const status = await testApiClient.getTestStatus(testId);
      return status;
    } catch (err) {
      console.error('获取测试状态失败:', err);
      return null;
    }
  }, []);

  // 获取测试历史
  const getTestHistory = useCallback(async (): Promise<TestResult[]> => {
    try {
      const history = await testApiClient.getTestHistory();
      setTestResults(history);
      return history;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('获取测试历史失败');
      setError(error);
      throw error;
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 清除结果
  const clearResults = useCallback(() => {
    setTestResults([]);
    setCurrentTest(null);
  }, []);

  return {
    // 状态
    isLoading,
    error,
    currentTest,
    testResults,
    
    // 方法
    startTest,
    stopTest,
    getTestStatus,
    getTestHistory,
    clearError,
    clearResults
  };
}

export default useTestManager;
