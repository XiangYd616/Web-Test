/**
 * useTests Hook
 * 封装测试相关的状态管理和业务逻辑
 */

import testRepository, {
  TestConfig,
  TestExecution as TestResult,
} from '@/services/api/repositories/testRepository';
import { useCallback, useEffect, useState } from 'react';

// 定义TestQueryParams类型
export interface TestQueryParams {
  page?: number;
  limit?: number;
  testType?: string;
  status?: string;
}

/**
 * Hook返回值接口
 */
export interface UseTestsReturn {
  // 状态
  tests: TestResult[];
  loading: boolean;
  error: Error | null;

  // 操作方法
  loadTests: (params?: TestQueryParams) => Promise<void>;
  createTest: (config: TestConfig) => Promise<TestResult>;
  createAndStart: (config: TestConfig) => Promise<TestResult>;
  startTest: (testId: string) => Promise<TestResult>;
  stopTest: (testId: string) => Promise<TestResult>;
  deleteTest: (testId: string) => Promise<void>;
  deleteMultiple: (testIds: string[]) => Promise<void>;
  retryTest: (testId: string) => Promise<TestResult>;
  refreshTests: () => Promise<void>;
  clearError: () => void;
}

/**
 * useTests Hook配置
 */
export interface UseTestsOptions {
  autoLoad?: boolean;
  initialParams?: TestQueryParams;
}

/**
 * useTests Hook
 *
 * @example
 * ```tsx
 * function TestPage() {
 *   const { tests, loading, createAndStart } = useTests({ autoLoad: true });
 *
 *   const handleCreate = async () => {
 *     await createAndStart({ url: 'https://example.com' });
 *   };
 *
 *   if (loading) return <Loading />;
 *   return <TestList tests={tests} onCreate={handleCreate} />;
 * }
 * ```
 */
export function useTests(options: UseTestsOptions = {}): UseTestsReturn {
  const { autoLoad = false, initialParams } = options;

  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 加载测试列表
   */
  const loadTests = useCallback(async (params?: TestQueryParams) => {
    setLoading(true);
    setError(null);

    try {
      const history = await testRepository.getTestHistory(params);
      setTests(history.tests);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('加载测试失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 创建测试
   */
  const createTest = useCallback(async (config: TestConfig): Promise<TestResult> => {
    setError(null);

    try {
      const test = await testRepository.executeTest(config);
      setTests(prev => [test, ...prev]);
      return test;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 创建并启动测试
   */
  const createAndStart = useCallback(async (config: TestConfig): Promise<TestResult> => {
    setError(null);

    try {
      const test = await testRepository.executeTest(config);
      setTests(prev => [test, ...prev]);
      return test;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 启动测试
   */
  const startTest = useCallback(async (testId: string): Promise<TestResult> => {
    setError(null);

    try {
      // 当前 repository API 没有单独的 start 端点，这里返回最新状态
      const test = await testRepository.getTestStatus(testId);
      setTests(prev => prev.map(t => (t.id === testId ? test : t)));
      return test;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 停止测试
   */
  const stopTest = useCallback(async (testId: string): Promise<TestResult> => {
    setError(null);

    try {
      await testRepository.stopTest(testId);
      const test = await testRepository.getTestStatus(testId);

      // 更新列表中的测试状态
      setTests(prev => prev.map(t => (t.id === testId ? test : t)));

      return test;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 删除测试
   */
  const deleteTest = useCallback(async (testId: string): Promise<void> => {
    setError(null);

    try {
      await testRepository.deleteTest(testId);

      // 从列表中移除
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 批量删除测试
   */
  const deleteMultiple = useCallback(async (testIds: string[]): Promise<void> => {
    setError(null);

    try {
      await Promise.all(testIds.map(id => testRepository.deleteTest(id)));

      // 从列表中移除
      setTests(prev => prev.filter(t => !testIds.includes(t.id)));
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 重试测试
   */
  const retryTest = useCallback(async (testId: string): Promise<TestResult> => {
    setError(null);

    try {
      // 当前 API 不提供从历史记录中反推 URL 的能力，先返回最新状态
      const test = await testRepository.getTestStatus(testId);
      setTests(prev => prev.map(t => (t.id === testId ? test : t)));
      return test;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    }
  }, []);

  /**
   * 刷新测试列表
   */
  const refreshTests = useCallback(async () => {
    await loadTests(initialParams);
  }, [loadTests, initialParams]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadTests(initialParams);
    }
  }, [autoLoad, loadTests, initialParams]);

  return {
    tests,
    loading,
    error,
    loadTests,
    createTest,
    createAndStart,
    startTest,
    stopTest,
    deleteTest,
    deleteMultiple,
    retryTest,
    refreshTests,
    clearError,
  };
}

/**
 * 默认导出
 */
export default useTests;
