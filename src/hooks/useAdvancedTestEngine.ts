/**
 * 高级测试引擎钩子 - 统一管理所有测试工具
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { advancedTestEngine, AdvancedTestConfig, TestResult, TestProgress } from '../services/advancedTestEngine';

export interface UseAdvancedTestEngineReturn {
  // 状态
  isRunning: boolean;
  progress: number;
  currentStep: string;
  testPhase: 'initializing' | 'running' | 'analyzing' | 'completing' | 'idle';
  estimatedTimeRemaining: number;
  results: TestResult | null;
  testHistory: TestResult[];
  error: string | null;
  engineStatus: Record<string, boolean>;
  activeTests: any[];

  // 测试控制
  runTest: (config: AdvancedTestConfig) => Promise<TestResult>;
  stopTest: () => Promise<boolean>;
  clearResults: () => void;
  clearError: () => void;

  // 数据管理
  getTestHistory: (limit?: number) => TestResult[];
  exportResult: (testId: string, format: 'json' | 'csv' | 'pdf' | 'html') => Promise<any>;
  getTestResult: (testId: string) => Promise<TestResult | null>;

  // 实时监控
  realTimeMetrics: Record<string, any>;
}

export const useAdvancedTestEngine = (): UseAdvancedTestEngineReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testPhase, setTestPhase] = useState<'initializing' | 'running' | 'analyzing' | 'completing' | 'idle'>('idle');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [results, setResults] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<Record<string, boolean>>({});
  const [activeTests, setActiveTests] = useState<any[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<Record<string, any>>({});

  const currentTestId = useRef<string | null>(null);
  const metricsInterval = useRef<NodeJS.Timeout | null>(null);

  // 初始化引擎状态
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        const status = advancedTestEngine.getEngineStatus();
        setEngineStatus(status);
        
        const history = advancedTestEngine.getTestHistory();
        setTestHistory(history);
        
        const active = advancedTestEngine.getActiveTests();
        setActiveTests(active);
      } catch (err) {
        console.error('Failed to initialize advanced test engine:', err);
      }
    };

    initializeEngine();
  }, []);

  // 监听测试引擎事件
  useEffect(() => {
    const handleTestProgress = (progressData: TestProgress) => {
      if (progressData.testId === currentTestId.current) {
        setProgress(progressData.progress);
        setCurrentStep(progressData.currentStep);
        setTestPhase(progressData.phase);
        setEstimatedTimeRemaining(progressData.estimatedTimeRemaining || 0);
        
        if (progressData.metrics) {
          setRealTimeMetrics(progressData.metrics);
        }
      }
    };

    const handleTestCompleted = (result: TestResult) => {
      if (result.id === currentTestId.current) {
        setResults(result);
        setIsRunning(false);
        setProgress(100);
        setCurrentStep('测试完成');
        setTestPhase('idle');
        setEstimatedTimeRemaining(0);
        currentTestId.current = null;
        
        // 更新历史记录
        setTestHistory(prev => [result, ...prev.slice(0, 49)]);
      }
    };

    const handleTestFailed = (result: TestResult, err: Error) => {
      if (result.id === currentTestId.current) {
        setError(err.message || '测试失败');
        setIsRunning(false);
        setTestPhase('idle');
        currentTestId.current = null;
        
        // 仍然保存失败的结果
        setTestHistory(prev => [result, ...prev.slice(0, 49)]);
      }
    };

    const handleTestCancelled = (testId: string) => {
      if (testId === currentTestId.current) {
        setIsRunning(false);
        setProgress(0);
        setCurrentStep('');
        setTestPhase('idle');
        setEstimatedTimeRemaining(0);
        currentTestId.current = null;
      }
    };

    // 添加事件监听器
    advancedTestEngine.on('testProgress', handleTestProgress);
    advancedTestEngine.on('testCompleted', handleTestCompleted);
    advancedTestEngine.on('testFailed', handleTestFailed);
    advancedTestEngine.on('testCancelled', handleTestCancelled);

    return () => {
      // 清理事件监听器
      advancedTestEngine.off('testProgress', handleTestProgress);
      advancedTestEngine.off('testCompleted', handleTestCompleted);
      advancedTestEngine.off('testFailed', handleTestFailed);
      advancedTestEngine.off('testCancelled', handleTestCancelled);
    };
  }, []);

  // 实时指标更新
  const startRealTimeMetrics = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
    }

    metricsInterval.current = setInterval(() => {
      const active = advancedTestEngine.getActiveTests();
      setActiveTests(active);
      
      // 更新当前测试的实时指标
      if (currentTestId.current) {
        const currentTest = active.find(test => test.id === currentTestId.current);
        if (currentTest && currentTest.metrics) {
          setRealTimeMetrics(currentTest.metrics);
        }
      }
    }, 2000);
  }, []);

  const stopRealTimeMetrics = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
      metricsInterval.current = null;
    }
  }, []);

  // 运行测试
  const runTest = useCallback(async (config: AdvancedTestConfig): Promise<TestResult> => {
    if (isRunning) {
      throw new Error('另一个测试正在运行中');
    }

    setError(null);
    setResults(null);
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('正在初始化测试...');
    setTestPhase('initializing');
    setRealTimeMetrics({});

    try {
      const { testId, promise } = await advancedTestEngine.runAdvancedTest(config);
      currentTestId.current = testId;
      
      // 开始实时指标监控
      startRealTimeMetrics();
      
      const result = await promise;
      return result;
    } catch (err: any) {
      setError(err.message || '测试失败');
      setIsRunning(false);
      setTestPhase('idle');
      currentTestId.current = null;
      throw err;
    } finally {
      stopRealTimeMetrics();
    }
  }, [isRunning, startRealTimeMetrics, stopRealTimeMetrics]);

  // 停止测试
  const stopTest = useCallback(async (): Promise<boolean> => {
    if (currentTestId.current) {
      const success = await advancedTestEngine.stopTest(currentTestId.current);
      if (success) {
        setIsRunning(false);
        setProgress(0);
        setCurrentStep('');
        setTestPhase('idle');
        setEstimatedTimeRemaining(0);
        currentTestId.current = null;
        stopRealTimeMetrics();
      }
      return success;
    }
    return false;
  }, [stopRealTimeMetrics]);

  // 清理结果
  const clearResults = useCallback(() => {
    setResults(null);
    setProgress(0);
    setCurrentStep('');
    setTestPhase('idle');
    setRealTimeMetrics({});
  }, []);

  // 清理错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 获取测试历史
  const getTestHistory = useCallback((limit = 50): TestResult[] => {
    return advancedTestEngine.getTestHistory(limit);
  }, []);

  // 导出结果
  const exportResult = useCallback(async (testId: string, format: 'json' | 'csv' | 'pdf' | 'html'): Promise<any> => {
    try {
      return await advancedTestEngine.exportTestResult(testId, format);
    } catch (err: any) {
      setError(err.message || '导出失败');
      throw err;
    }
  }, []);

  // 获取测试结果
  const getTestResult = useCallback(async (testId: string): Promise<TestResult | null> => {
    try {
      return await advancedTestEngine.getTestResult(testId);
    } catch (err: any) {
      setError(err.message || '获取结果失败');
      return null;
    }
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      stopRealTimeMetrics();
      if (currentTestId.current) {
        advancedTestEngine.stopTest(currentTestId.current);
      }
    };
  }, [stopRealTimeMetrics]);

  return {
    // 状态
    isRunning,
    progress,
    currentStep,
    testPhase,
    estimatedTimeRemaining,
    results,
    testHistory,
    error,
    engineStatus,
    activeTests,
    realTimeMetrics,

    // 测试控制
    runTest,
    stopTest,
    clearResults,
    clearError,

    // 数据管理
    getTestHistory,
    exportResult,
    getTestResult
  };
};

export default useAdvancedTestEngine;
