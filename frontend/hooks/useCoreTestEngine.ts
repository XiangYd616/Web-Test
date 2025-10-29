/**
 * 核心测试引擎Hook - 统一重构版本
 * 
 * 整合功能：
 * - useTest.ts 的测试管理功能
 * - useTestManager.ts 的API调用功能  
 * - useUnifiedTestEngine.ts 的统一引擎功能
 * - useTestState.ts 的状态管理功能
 * - useTestProgress.ts 的进度监控功能
 * 
 * 设计目标：
 * - 消除代码重复
 * - 提供统一的测试接口
 * - 支持所有测试类型
 * - 保持向后兼容性
 * 
 * 文件路径: frontend/hooks/useCoreTestEngine.ts
 */

import Logger from '@/utils/logger';
import { useState, useCallback, useRef, useEffect } from 'react';
import { testApiClient, TestResult, TestProgress } from '../services/api/test/testApiClient';
import { testProgressService } from '../services/api/testProgressService';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';
import { useUserStats } from './useUserStats';

// 统一的配置接口
export interface TestConfig {
  id?: string;
  name: string;
  type: string;
  url: string;
  options: Record<string, any>;
  engineId?: string;
  timeout?: number;
  [key: string]: any;
}

// 统一的测试结果接口
export interface UnifiedTestResult extends TestResult {
  id: string;
  type: string;
  testId?: string;
  testType?: string;
  overallScore?: number;
  duration?: number;
  recommendations?: {
    immediate?: string[];
    shortTerm?: string[];
    longTerm?: string[];
  };
  details?: {
    duration?: number;
    url?: string;
    config?: Record<string, any>;
    engineId?: string;
    [key: string]: any;
  };
}

// 测试状态接口
export interface TestState {
  config: TestConfig;
  isRunning: boolean;
  progress: number;
  currentStep: string;
  result: UnifiedTestResult | null;
  error: string | null;
  testId: string | null;
  startTime: number | null;
  endTime: number | null;
}

// 队列统计接口
export interface QueueStats {
  totalRunning: number;
  totalQueued: number;
  maxConcurrent: number;
  estimatedWaitTime: number;
}

// Hook选项接口
export interface CoreTestEngineOptions {
  testType?: TestType;
  defaultConfig?: TestConfig;
  maxConcurrentTests?: number;
  defaultTimeout?: number;
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  enablePersistence?: boolean;
  autoStart?: boolean;

  // 回调函数
  onTestComplete?: (result: UnifiedTestResult) => void;
  onTestError?: (error: string) => void;
  onConfigChange?: (config: TestConfig) => void;
  onTestStarted?: (data: any) => void;
  onTestProgress?: (data: TestProgress) => void;
  onTestFailed?: (data: any) => void;
  onTestCancelled?: (data: any) => void;
  onTestQueued?: (data: any) => void;
  onStatusUpdate?: (data: any) => void;
  
  // 验证函数
  validateConfig?: (config: TestConfig) => { isValid: boolean; errors: string[] };
}

// Hook返回值接口
export interface CoreTestEngineReturn {
  // 基础状态
  state: TestState;
  isLoading: boolean;
  isRunning: boolean;
  progress: number;
  results: UnifiedTestResult[];
  activeTests: any[];
  testHistory: UnifiedTestResult[];
  currentTest: string | null;
  error: string | null;
  
  // 配置管理
  config: TestConfig;
  isConfigValid: boolean;
  configErrors: string[];
  setConfig: (config: TestConfig) => void;
  updateConfig: (key: string, value: any) => void;
  
  // 测试控制
  startTest: (customConfig?: TestConfig) => Promise<string>;
  stopTest: (testId?: string) => Promise<void>;
  cancelTest: (testId: string) => Promise<void>;
  cancelAllTests: () => Promise<void>;
  resetTest: () => void;
  retryTest: (testId: string) => Promise<string>;
  
  // 进度监控
  currentProgress: TestProgress | null;
  isMonitoring: boolean;
  startMonitoring: (testId: string) => void;
  stopMonitoring: () => void;
  
  // 队列管理
  recordId: string | null;
  phase: string;
  message: string;
  queueStats: QueueStats;
  isQueued: boolean;
  canStartTest: boolean;
  
  // 数据获取
  getStats: () => {
    runningTests: number;
    completedTests: number;
    failedTests: number;
    totalTests: number;
  };
  getTestHistory: (filters?: any) => Promise<UnifiedTestResult[]>;
  getTestStatus: (testId: string) => Promise<any>;
  getTestResult: (testId: string) => Promise<UnifiedTestResult | null>;
  getTestDetails: (testId: string) => Promise<UnifiedTestResult | null>;
  getConfigurations: () => Promise<TestConfig[]>;
  
  // 配置管理
  saveConfiguration: (config: TestConfig) => Promise<void>;
  deleteConfiguration: (configId: string) => Promise<void>;
  
  // 导出功能
  exportTestResult: (testId: string, format: 'json' | 'pdf' | 'csv') => Promise<Blob>;
  
  // 状态工具
  getState: () => TestState;
  clearError: () => void;
  clearResults: () => void;
  clearCompletedTests: () => void;
  hasRunningTests: () => boolean;
  getActiveTest: (testId: string) => any;
  
  // 连接状态
  isConnected: boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // 测试类型支持
  supportedTypes: string[];
  fetchSupportedTypes: () => Promise<void>;
  
  // 执行相关
  executingTest: boolean;
  executeTest: (params: any) => Promise<string>;
  subscribeToTest: (testId: string) => void;
  
  // 版本信息
  engineVersion?: string;
}

/**
 * 核心测试引擎Hook
 * 提供统一的测试管理功能
 */
export const useCoreTestEngine = (options: CoreTestEngineOptions = {}): CoreTestEngineReturn => {
  const {
    testType,
    defaultConfig = { name: '', type: '', url: '', options: {} },
    maxConcurrentTests = 3,
    defaultTimeout = 300000,
    enableQueue = true,
    enableWebSocket = true,
    enablePersistence = true,
    autoStart = false,
    onTestComplete,
    onTestError,
    onConfigChange,
    onTestStarted,
    onTestProgress,
    onTestFailed,
    onTestCancelled,
    onTestQueued,
    onStatusUpdate,
    validateConfig
  } = options;

  const { recordTestCompletion } = useUserStats();
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTestIdRef = useRef<string | null>(null);
  const listenerRef = useRef<any | null>(null);

  // 基础状态
  const [state, setState] = useState<TestState>({
    config: { ...defaultConfig },
    isRunning: false,
    progress: 0,
    currentStep: '',
    result: null,
    error: null,
    testId: null,
    startTime: null,
    endTime: null
  });

  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<UnifiedTestResult[]>([]);
  const [testHistory, setTestHistory] = useState<UnifiedTestResult[]>([]);
  const [activeTests, setActiveTests] = useState<any[]>([]);
  
  // 进度监控状态
  const [currentProgress, setCurrentProgress] = useState<TestProgress | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // 队列管理状态
  const [queueState, setQueueState] = useState({
    recordId: null as string | null,
    phase: 'IDLE',
    message: '',
    queueStats: {
      totalRunning: 0,
      totalQueued: 0,
      maxConcurrent: maxConcurrentTests,
      estimatedWaitTime: 0
    } as QueueStats,
    isQueued: false,
    canStartTest: true
  });

  // 配置验证状态
  const [configValidation, setConfigValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });

  // 连接状态
  const [isConnected, setIsConnected] = useState(true);
  const [supportedTypes, setSupportedTypes] = useState<string[]>([
    'performance', 'security', 'api', 'seo', 'stress', 'compatibility',
    'network', 'database', 'ux', 'accessibility'
  ]);
  const [executingTest, setExecutingTest] = useState(false);

  // 清理函数
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (currentTestIdRef.current && listenerRef.current) {
        testProgressService.stopMonitoring(currentTestIdRef.current, listenerRef.current);
      }
    };
  }, []);

  // 配置变更时重新验证
  useEffect(() => {
    if (validateConfig) {
      const validation = validateConfig(state.config);
      setConfigValidation(validation);
    }
  }, [state.config, validateConfig]);

  // 设置配置
  const setConfig = useCallback((config: TestConfig) => {
    setState(prev => ({
      ...prev,
      config: { ...config },
      error: null
    }));
    onConfigChange?.(config);
  }, [onConfigChange]);

  // 更新单个配置项
  const updateConfig = useCallback((key: string, value: any) => {
    setState(prev => {
      const newConfig = {
        ...prev.config,
        [key]: value
      };
      onConfigChange?.(newConfig);
      return {
        ...prev,
        config: newConfig,
        error: null
      };
    });
  }, [onConfigChange]);

  // 创建进度监听器
  const createProgressListener = useCallback(() => {
    return {
      onProgress: (progressData: TestProgress) => {
        setCurrentProgress(progressData);
        setState(prev => ({
          ...prev,
          progress: progressData.progress || 0,
          currentStep: progressData.currentStep || '',
          error: null
        }));
        onTestProgress?.(progressData);
      },
      onComplete: (result: any) => {
        setIsMonitoring(false);
        setState(prev => ({
          ...prev,
          isRunning: false,
          endTime: Date.now(),
          result: result as UnifiedTestResult
        }));
        if (result) {
          setResults(prev => [...prev, result as UnifiedTestResult]);
          recordTestCompletion(testType || 'unknown');
        }
        onTestComplete?.(result as UnifiedTestResult);
      },
      onError: (errorMessage: string) => {
        setIsMonitoring(false);
        setState(prev => ({
          ...prev,
          isRunning: false,
          error: errorMessage,
          endTime: Date.now()
        }));
        onTestError?.(errorMessage);
      }
    };
  }, [testType, recordTestCompletion, onTestProgress, onTestComplete, onTestError]);

  // 开始测试 - 整合所有启动逻辑
  const startTest = useCallback(async (customConfig?: TestConfig): Promise<string> => {
    const testConfig = customConfig || state.config;

    // 验证配置
    if (validateConfig) {
      const validation = validateConfig(testConfig);
      if (!validation.isValid) {
        const errorMessage = `配置验证失败: ${validation.errors.join(', ')}`;
        setState(prev => ({ ...prev, error: errorMessage }));
        onTestError?.(errorMessage);
        throw new Error(errorMessage);
      }
    }

    // 检查队列状态
    if (!queueState.canStartTest) {
      throw new Error('当前无法启动新测试，请等待队列空闲');
    }

    setIsLoading(true);
    setExecutingTest(true);
    
    try {
      // 生成测试ID
      const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 更新状态
      setState(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        currentStep: '正在初始化测试...',
        error: null,
        testId,
        startTime: Date.now(),
        endTime: null,
        result: null
      }));

      // 创建中止控制器
      abortControllerRef.current = new AbortController();
      
      onTestStarted?.({ testId, config: testConfig });

      // 启动进度监控
      if (enableWebSocket) {
        currentTestIdRef.current = testId;
        listenerRef.current = createProgressListener();
        testProgressService.startMonitoring(testId, listenerRef.current);
        setIsMonitoring(true);
      }

      // 调用API启动测试
      let result: UnifiedTestResult;
      
      if (testConfig.engineId) {
        // 使用testApiClient
        result = await testApiClient.runTest({
          engineId: testConfig.engineId,
          config: testConfig,
          options: {
            async: true,
            timeout: testConfig.timeout || defaultTimeout
          }
        });
      } else {
        // 使用backgroundTestManager
        result = await backgroundTestManager.startTest(testConfig);
      }

      // 添加到活跃测试列表
      setActiveTests(prev => [...prev, { id: testId, config: testConfig, startTime: Date.now() }]);

      return testId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试启动失败';
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: errorMessage,
        endTime: Date.now()
      }));
      onTestError?.(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
      setExecutingTest(false);
    }
  }, [state.config, validateConfig, queueState.canStartTest, enableWebSocket, createProgressListener, defaultTimeout, onTestStarted, onTestError, testType]);

  // 停止测试
  const stopTest = useCallback(async (testId?: string): Promise<void> => {
    const targetTestId = testId || state.testId;
    
    try {
      // 中止本地操作
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 停止进度监控
      if (isMonitoring && currentTestIdRef.current && listenerRef.current) {
        testProgressService.stopMonitoring(currentTestIdRef.current, listenerRef.current);
        setIsMonitoring(false);
      }

      // 调用API停止测试
      if (targetTestId) {
        try {
          await testApiClient.stopTest(targetTestId);
        } catch (apiError) {
          Logger.warn('API停止测试失败:', apiError);
        }
      }

      // 更新状态
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: '测试已停止',
        endTime: Date.now()
      }));

      // 从活跃测试列表中移除
      setActiveTests(prev => prev.filter(test => test.id !== targetTestId));

      onTestCancelled?.({ testId: targetTestId });

    } catch (error) {
      Logger.error('停止测试失败:', error);
      // 即使API调用失败，也要更新本地状态
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: '测试已停止',
        endTime: Date.now()
      }));
    }
  }, [state.testId, isMonitoring, onTestCancelled]);

  // 取消测试 (别名)
  const cancelTest = useCallback(async (testId: string): Promise<void> => {
    await stopTest(testId);
  }, [stopTest]);

  // 取消所有测试
  const cancelAllTests = useCallback(async (): Promise<void> => {
    const promises = activeTests.map(test => stopTest(test.id));
    await Promise.allSettled(promises);
    setActiveTests([]);
  }, [activeTests, stopTest]);

  // 重置测试
  const resetTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      progress: 0,
      currentStep: '',
      result: null,
      error: null,
      testId: null,
      startTime: null,
      endTime: null
    }));
    setResults([]);
    setCurrentProgress(null);
  }, []);

  // 开始进度监控
  const startMonitoring = useCallback((testId: string) => {
    if (currentTestIdRef.current && listenerRef.current) {
      testProgressService.stopMonitoring(currentTestIdRef.current, listenerRef.current);
    }

    currentTestIdRef.current = testId;
    listenerRef.current = createProgressListener();
    
    testProgressService.startMonitoring(testId, listenerRef.current);
    setIsMonitoring(true);
  }, [createProgressListener]);

  // 停止进度监控
  const stopMonitoring = useCallback(() => {
    if (currentTestIdRef.current && listenerRef.current) {
      testProgressService.stopMonitoring(currentTestIdRef.current, listenerRef.current);
      currentTestIdRef.current = null;
      listenerRef.current = null;
      setIsMonitoring(false);
    }
  }, []);

  // 获取统计信息
  const getStats = useCallback(() => {
    const completedTests = results.length;
    const failedTests = results.filter(r => r.status === 'failed').length;
    const runningTests = activeTests.length;
    
    return {
      runningTests,
      completedTests,
      failedTests,
      totalTests: completedTests + runningTests
    };
  }, [results, activeTests]);

  // 获取测试历史
  const getTestHistory = useCallback(async (filters?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<UnifiedTestResult[]> => {
    try {
      const history = await testApiClient.getTestHistory();
      let filteredHistory = history as UnifiedTestResult[];

      if (filters?.type) {
        filteredHistory = filteredHistory.filter(test => test.type === filters.type);
      }
      if (filters?.status) {
        filteredHistory = filteredHistory.filter(test => test.status === filters.status);
      }
      if (filters?.limit) {
        filteredHistory = filteredHistory.slice(0, filters.limit);
      }

      setTestHistory(filteredHistory);
      return filteredHistory;
    } catch (error) {
      Logger.error('获取测试历史失败:', error);
      return testHistory;
    }
  }, [testHistory]);

  // 获取测试状态
  const getTestStatus = useCallback(async (testId: string) => {
    try {
      return await testApiClient.getTestStatus(testId);
    } catch (error) {
      Logger.error('获取测试状态失败:', error);
      return null;
    }
  }, []);

  // 获取测试结果
  const getTestResult = useCallback(async (testId: string): Promise<UnifiedTestResult | null> => {
    try {
      const result = results.find(r => r.id === testId);
      if (result) {
        return result;
      }
      
      // 如果本地没有，尝试从API获取
      const apiResult = await testApiClient.getTestStatus(testId);
      return apiResult as UnifiedTestResult;
    } catch (error) {
      Logger.error('获取测试结果失败:', error);
      return null;
    }
  }, [results]);

  // 获取测试详情 (别名)
  const getTestDetails = useCallback(async (testId: string): Promise<UnifiedTestResult | null> => {
    return await getTestResult(testId);
  }, [getTestResult]);

  // 重试测试
  const retryTest = useCallback(async (testId: string): Promise<string> => {
    const testDetails = await getTestDetails(testId);
    if (!testDetails) {
      throw new Error('无法获取测试配置');
    }

    const config: TestConfig = {
      name: `重试-${testDetails.type}`,
      type: testDetails.type,
      url: testDetails.details?.url || '',
      options: testDetails.details?.config || {},
      engineId: testDetails.details?.engineId
    };

    return await startTest(config);
  }, [getTestDetails, startTest]);

  // 获取配置列表
  const getConfigurations = useCallback(async (): Promise<TestConfig[]> => {
    try {
      // 这里应该调用实际的API
      return [];
    } catch (error) {
      Logger.error('获取配置列表失败:', error);
      return [];
    }
  }, []);

  // 保存配置
  const saveConfiguration = useCallback(async (config: TestConfig): Promise<void> => {
    try {
      // 这里应该调用实际的API保存配置
      Logger.debug('保存配置:', config);
    } catch (error) {
      Logger.error('保存配置失败:', error);
      throw error;
    }
  }, []);

  // 删除配置
  const deleteConfiguration = useCallback(async (configId: string): Promise<void> => {
    try {
      // 这里应该调用实际的API删除配置
      Logger.debug('删除配置:', configId);
    } catch (error) {
      Logger.error('删除配置失败:', error);
      throw error;
    }
  }, []);

  // 导出测试结果
  const exportTestResult = useCallback(async (testId: string, format: 'json' | 'pdf' | 'csv'): Promise<Blob> => {
    try {
      // 这里应该调用实际的导出API
      const result = await getTestResult(testId);
      if (!result) {
        throw new Error('测试结果不存在');
      }
      
      let content: string;
      let mimeType: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(result, null, 2);
          mimeType = 'application/json';
          break;
        case 'csv':
          // 简单的CSV导出
          content = `ID,Type,Status,Score,Timestamp\n${result.id},${result.type},${result.status},${result.score || ''},${result.timestamp}`;
          mimeType = 'text/csv';
          break;
        default:
          throw new Error('不支持的导出格式');
      }
      
      return new Blob([content], { type: mimeType });
    } catch (error) {
      Logger.error('导出测试结果失败:', error);
      throw error;
    }
  }, [getTestResult]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 清除结果
  const clearResults = useCallback(() => {
    setResults([]);
    setTestHistory([]);
    setCurrentProgress(null);
  }, []);

  // 清除已完成的测试
  const clearCompletedTests = useCallback(() => {
    setActiveTests(prev => prev.filter(test => {
      // 这里可以添加更多逻辑来判断测试是否完成
      return state.isRunning && test.id === state.testId;
    }));
  }, [state.isRunning, state.testId]);

  // 检查是否有正在运行的测试
  const hasRunningTests = useCallback(() => {
    return activeTests.length > 0 || state.isRunning;
  }, [activeTests.length, state.isRunning]);

  // 获取活跃测试
  const getActiveTest = useCallback((testId: string) => {
    return activeTests.find(test => test.id === testId);
  }, [activeTests]);

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    setIsConnected(true);
  }, []);

  const disconnectWebSocket = useCallback(() => {
    setIsConnected(false);
    if (isMonitoring) {
      stopMonitoring();
    }
  }, [isMonitoring, stopMonitoring]);

  // 获取支持的测试类型
  const fetchSupportedTypes = useCallback(async () => {
    try {
      // 这里应该从API获取支持的测试类型
      setSupportedTypes([
        'performance', 'security', 'api', 'seo', 'stress', 'compatibility',
        'network', 'database', 'ux', 'accessibility'
      ]);
    } catch (error) {
      Logger.error('获取支持的测试类型失败:', error);
    }
  }, []);

  // 执行测试 (别名)
  const executeTest = useCallback(async (params: any): Promise<string> => {
    return await startTest(params.config || params);
  }, [startTest]);

  // 订阅测试 (别名)
  const subscribeToTest = useCallback((testId: string) => {
    startMonitoring(testId);
  }, [startMonitoring]);

  // 获取当前状态
  const getState = useCallback(() => {
    return state;
  }, [state]);

  // 计算测试持续时间
  const testDuration = state.startTime && state.endTime 
    ? state.endTime - state.startTime 
    : state.startTime 
    ? Date.now() - state.startTime 
    : null;

  return {
    // 基础状态
    state,
    isLoading,
    isRunning: state.isRunning,
    progress: state.progress,
    results,
    activeTests,
    testHistory,
    currentTest: state.currentStep,
    error: state.error,

    // 配置管理
    config: state.config,
    isConfigValid: configValidation.isValid,
    configErrors: configValidation.errors,
    setConfig,
    updateConfig,

    // 测试控制
    startTest,
    stopTest,
    cancelTest,
    cancelAllTests,
    resetTest,
    retryTest,

    // 进度监控
    currentProgress,
    isMonitoring,
    startMonitoring,
    stopMonitoring,

    // 队列管理
    recordId: queueState.recordId,
    phase: queueState.phase,
    message: queueState.message,
    queueStats: queueState.queueStats,
    isQueued: queueState.isQueued,
    canStartTest: queueState.canStartTest,

    // 数据获取
    getStats,
    getTestHistory,
    getTestStatus,
    getTestResult,
    getTestDetails,
    getConfigurations,

    // 配置管理
    saveConfiguration,
    deleteConfiguration,

    // 导出功能
    exportTestResult,

    // 状态工具
    getState,
    clearError,
    clearResults,
    clearCompletedTests,
    hasRunningTests,
    getActiveTest,

    // 连接状态
    isConnected,
    connectWebSocket,
    disconnectWebSocket,

    // 测试类型支持
    supportedTypes,
    fetchSupportedTypes,

    // 执行相关
    executingTest,
    executeTest,
    subscribeToTest,

    // 版本信息
    engineVersion: '2.0.0'
  };
};

export default useCoreTestEngine;
