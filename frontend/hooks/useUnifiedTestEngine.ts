/**
 * 🧠 统一测试引擎Hook - 重构优化版本
 * 整合了useTestEngine、useSimpleTestEngine、useTestState等Hook的功能
 * 基于阿里巴巴hooks最佳实践，为前端提供统一的测试引擎接口
 *
 * 重构目标：
 * - 消除85%的Hook重复代码
 * - 统一测试引擎接口
 * - 提供向后兼容性
 * - 支持所有测试类型
 */

import { useMount, useRequest, useSafeState, useSetState, useUnmount } from 'ahooks';
import { useCallback, useRef } from 'react';
import { TestPriority, TestStatus, TestType } from '../types/enums';
import type {
  EngineState,
  EngineStats,
  TestConfig,
  TestExecutionHook,
  TestExecutionRequest,
  TestResult,
  TestResultAnalysisHook,
  TestStatusInfo,
  UnifiedTestEngineHook,
  WebSocketMessage
} from '../types/unifiedEngine.types';

// 兼容性类型定义 - 整合其他Hook的接口
export interface LegacyTestConfig {
  url: string;
  testType: string;
  options: Record<string, any>;
}

export interface LegacyTestResult {
  id: string;
  testType: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  score?: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  summary?: string;
  details?: any;
  recommendations?: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    solution: string;
  }>;
  error?: string;
}

// 通用测试状态接口 - 整合useTestState功能
export interface UniversalTestState {
  config: Record<string, any>;
  isRunning: boolean;
  progress: number;
  currentStep: string;
  result: any;
  error: string | null;
  testId: string | null;
  startTime: number | null;
  endTime: number | null;
}

// 扩展的Hook返回类型 - 包含兼容性方法
export interface ExtendedUnifiedTestEngineHook extends UnifiedTestEngineHook {
  // 兼容性方法
  runLegacyTest: (config: LegacyTestConfig) => Promise<LegacyTestResult>;
  runSimpleTest: (testType: string, config: any) => Promise<string>;
  getUniversalState: () => UniversalTestState;

  // 增强的状态管理
  resetEngine: () => void;
  getTestHistory: (testType?: string) => Promise<LegacyTestResult[]>;
}

/**
 * 统一测试引擎Hook - 重构优化版本
 * 整合了所有测试相关Hook的功能
 */
export const useUnifiedTestEngine = (): ExtendedUnifiedTestEngineHook => {
  // 使用ahooks的useSafeState确保组件卸载后不会更新状态
  const [activeTests, setActiveTests] = useSafeState<Map<string, TestStatusInfo>>(new Map());
  const [testResults, setTestResults] = useSafeState<Map<string, TestResult>>(new Map());

  // 使用useSetState管理引擎状态
  const [engineState, setEngineState] = useSetState<EngineState>({
    isConnected: false,
    supportedTypes: [] as string[],
    engineVersion: '',
    lastError: null as Error | null
  });

  // 使用useRef保存WebSocket实例
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * 获取支持的测试类型
   */
  const {
    data: supportedTypesData,
    loading: loadingSupportedTypes,
    error: supportedTypesError,
    run: fetchSupportedTypes
  } = useRequest(
    async () => {
      const response = await fetch('/api/unified-engine/test-types');
      if (!response.ok) {
        throw new Error('获取支持的测试类型失败');
      }
      return response.json();
    },
    {
      manual: true,
      onSuccess: (data) => {
        if (data.success) {
          setEngineState({
            supportedTypes: data.data.testTypes.map((t: any) => t.id),
            engineVersion: data.data.engineVersion
          });
        }
      },
      onError: (error) => {
        setEngineState({ lastError: error });
        console.error('获取支持的测试类型失败:', error);
      }
    }
  );

  /**
   * 执行测试
   */
  const {
    loading: executingTest,
    run: executeTestRequest
  } = useRequest(
    async (config: TestExecutionRequest) => {
      const response = await fetch('/api/unified-engine/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '测试执行失败');
      }

      return response.json();
    },
    {
      manual: true,
      onSuccess: (data) => {
        if (data.success) {
          const { testId, result } = data.data;

          // 更新测试状态
          setActiveTests(prev => {
            const newMap = new Map(prev);
            newMap.set(testId, {
              testId,
              status: 'completed',
              progress: 100,
              currentStep: '测试完成',
              startTime: Date.now(),
              lastUpdate: Date.now()
            } as TestStatusInfo);
            return newMap;
          });

          // 保存测试结果
          setTestResults(prev => {
            const newMap = new Map(prev);
            newMap.set(testId, result);
            return newMap;
          });
        }
      },
      onError: (error) => {
        setEngineState({ lastError: error });
        console.error('测试执行失败:', error);
      }
    }
  );

  /**
   * 获取测试状态
   */
  const getTestStatus = useCallback(async (testId: string): Promise<TestStatusInfo | null> => {
    try {
      const response = await fetch(`/api/unified-engine/status/${testId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('获取测试状态失败');
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('获取测试状态失败:', error);
      return null;
    }
  }, []);

  /**
   * 获取测试结果
   */
  const getTestResult = useCallback(async (testId: string): Promise<TestResult | null> => {
    try {
      const response = await fetch(`/api/unified-engine/result/${testId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('获取测试结果失败');
      }

      const data = await response.json();
      return data.success ? data.data.result : null;
    } catch (error) {
      console.error('获取测试结果失败:', error);
      return null;
    }
  }, []);

  /**
   * 取消测试
   */
  const cancelTest = useCallback(async (testId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/unified-engine/cancel/${testId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('取消测试失败');
      }

      const data = await response.json();

      if (data.success) {
        // 更新本地状态
        setActiveTests(prev => {
          const newMap = new Map(prev);
          const test = newMap.get(testId);
          if (test) {
            newMap.set(testId, { ...test, status: TestStatus.CANCELLED });
          }
          return newMap;
        });
      }

      return data.success;
    } catch (error) {
      console.error('取消测试失败:', error);
      return false;
    }
  }, [setActiveTests]);

  /**
   * WebSocket连接管理
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // 已连接
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/unified-engine`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔌 统一测试引擎WebSocket已连接');
        setEngineState({ isConnected: true });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 统一测试引擎WebSocket已断开');
        setEngineState({ isConnected: false });

        // 5秒后尝试重连
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setEngineState({ isConnected: false });
      };

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      setEngineState({ isConnected: false });
    }
  }, [setEngineState]);

  /**
   * 处理WebSocket消息
   */
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    const { type, testId, data } = message;

    switch (type) {
      case 'testProgress':
        setActiveTests(prev => {
          const newMap = new Map(prev);
          const existingTest = newMap.get(testId);
          newMap.set(testId, {
            ...existingTest,
            testId,
            status: 'running',
            progress: data.progress,
            currentStep: data.step,
            lastUpdate: Date.now()
          } as TestStatusInfo);
          return newMap;
        });
        break;

      case 'testCompleted':
        setActiveTests(prev => {
          const newMap = new Map(prev);
          newMap.set(testId, {
            testId,
            status: 'completed',
            progress: 100,
            currentStep: '测试完成',
            startTime: data.startTime || Date.now(),
            lastUpdate: Date.now()
          } as TestStatusInfo);
          return newMap;
        });

        setTestResults(prev => {
          const newMap = new Map(prev);
          newMap.set(testId, data.result);
          return newMap;
        });
        break;

      case 'testFailed':
        setActiveTests(prev => {
          const newMap = new Map(prev);
          const existingTest = newMap.get(testId);
          newMap.set(testId, {
            ...existingTest,
            testId,
            status: 'failed',
            error: data.error,
            lastUpdate: Date.now()
          } as TestStatusInfo);
          return newMap;
        });
        break;
    }
  }, [setActiveTests, setTestResults]);

  /**
   * 执行测试的主要函数
   */
  const executeTest = useCallback(async (config: TestExecutionRequest): Promise<string> => {
    try {
      // 生成测试ID
      const testId = config.options?.testId || `${config.testType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 初始化测试状态
      setActiveTests(prev => {
        const newMap = new Map(prev);
        newMap.set(testId, {
          testId,
          status: 'pending',
          progress: 0,
          currentStep: '准备启动测试...',
          startTime: Date.now(),
          lastUpdate: Date.now()
        } as TestStatusInfo);
        return newMap;
      });

      // 执行测试请求
      const enhancedConfig = {
        ...config,
        options: {
          ...config.options,
          testId
        }
      };

      await executeTestRequest(enhancedConfig);

      return testId;
    } catch (error) {
      console.error('执行测试失败:', error);
      throw error;
    }
  }, [executeTestRequest, setActiveTests]);

  /**
   * 订阅测试更新
   */
  const subscribeToTest = useCallback((testId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribeTest',
        testId
      }));
    }
  }, []);

  /**
   * 取消订阅测试更新
   */
  const unsubscribeFromTest = useCallback((testId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribeTest',
        testId
      }));
    }
  }, []);

  // 组件挂载时初始化
  useMount(() => {
    fetchSupportedTypes();
    connectWebSocket();
  });

  // 组件卸载时清理
  useUnmount(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  });

  // 兼容性方法 - 整合useTestEngine功能
  const runLegacyTest = useCallback(async (config: LegacyTestConfig): Promise<LegacyTestResult> => {
    try {
      const testRequest: TestExecutionRequest = {
        testType: config.testType as TestType,
        config: {
          url: config.url,
          ...config.options
        },
        options: {
          priority: TestPriority.MEDIUM
        }
      };

      const testId = await executeTest(testRequest);

      // 等待测试完成
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60秒

      while (attempts < maxAttempts) {
        const status = await getTestStatus(testId);
        if (status?.status === 'completed' || status?.status === 'failed') {
          const result = await getTestResult(testId);

          // 转换为Legacy格式
          return {
            id: testId,
            testType: config.testType,
            status: status.status as any,
            score: result?.overallScore,
            startTime: new Date(status.startTime).toISOString(),
            endTime: undefined, // TestStatusInfo没有endTime字段
            duration: undefined, // TestStatusInfo没有duration字段
            summary: typeof result?.summary === 'string' ? result.summary : JSON.stringify(result?.summary),
            details: result?.results,
            recommendations: Array.isArray(result?.recommendations?.immediate) ?
              result.recommendations.immediate.map(rec => ({
                title: rec,
                description: rec,
                priority: 'medium' as const,
                solution: rec
              })) : [],
            error: status.error
          };
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      throw new Error('测试超时');
    } catch (error) {
      throw error;
    }
  }, [executeTest, getTestStatus, getTestResult]);

  // 简单测试引擎兼容方法 - 整合useSimpleTestEngine功能
  const runSimpleTest = useCallback(async (testType: string, config: any) => {
    const testRequest: TestExecutionRequest = {
      testType: testType as TestType,
      config,
      options: {
        priority: TestPriority.MEDIUM
      }
    };

    return await executeTest(testRequest);
  }, [executeTest]);

  // 通用测试状态管理 - 整合useTestState和useUniversalTest功能
  const getUniversalState = useCallback((): UniversalTestState => {
    const currentTest = Array.from(activeTests.values())[0];

    return {
      config: {}, // TestStatusInfo没有config字段，使用空对象
      isRunning: executingTest,
      progress: currentTest?.progress || 0,
      currentStep: currentTest?.currentStep || '',
      result: currentTest ? testResults.get(currentTest.testId) : null,
      error: engineState.lastError?.message || null,
      testId: currentTest?.testId || null,
      startTime: currentTest?.startTime ? currentTest.startTime : null,
      endTime: null // TestStatusInfo没有endTime字段
    };
  }, [activeTests, testResults, executingTest, engineState.lastError]);

  return {
    // 引擎状态
    engineState,
    isConnected: engineState.isConnected,
    supportedTypes: engineState.supportedTypes,
    engineVersion: engineState.engineVersion,
    lastError: engineState.lastError,

    // 测试管理
    activeTests,
    testResults,
    executingTest,

    // 操作函数
    executeTest,
    getTestStatus,
    getTestResult,
    cancelTest,

    // WebSocket管理
    subscribeToTest,
    unsubscribeFromTest,
    connectWebSocket,

    // 工具函数
    fetchSupportedTypes,

    // 兼容性方法 - 整合其他Hook功能
    runLegacyTest,
    runSimpleTest,
    getUniversalState,

    // 状态查询
    isTestRunning: (testId: string) => {
      const test = activeTests.get(testId);
      return test?.status === 'running' || test?.status === 'pending';
    },

    getTestProgress: (testId: string) => {
      const test = activeTests.get(testId);
      return test?.progress || 0;
    },

    getTestCurrentStep: (testId: string) => {
      const test = activeTests.get(testId);
      return test?.currentStep || '';
    },

    hasTestResult: (testId: string) => {
      return testResults.has(testId);
    },

    // 批量操作
    cancelAllTests: async () => {
      const runningTests = Array.from(activeTests.values())
        .filter(test => test.status === 'running' || test.status === 'pending');

      const cancelPromises = runningTests.map(test => cancelTest(test.testId));
      await Promise.allSettled(cancelPromises);
    },

    clearCompletedTests: () => {
      setActiveTests(prev => {
        const newMap = new Map();
        prev.forEach((test, testId) => {
          if (test.status === 'running' || test.status === 'pending') {
            newMap.set(testId, test);
          }
        });
        return newMap;
      });
    },

    // 统计信息
    getStats: (): EngineStats => ({
      totalActiveTests: activeTests.size,
      runningTests: Array.from(activeTests.values()).filter(t => t.status === 'running').length,
      completedTests: Array.from(activeTests.values()).filter(t => t.status === 'completed').length,
      failedTests: Array.from(activeTests.values()).filter(t => t.status === 'failed').length,
      totalResults: testResults.size,
      uptime: Date.now() - (engineState.lastError ? 0 : Date.now()),
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      performance: {
        averageExecutionTime: 0,
        successRate: activeTests.size > 0 ?
          Array.from(activeTests.values()).filter(t => t.status === 'completed').length / activeTests.size * 100 : 0,
        errorRate: activeTests.size > 0 ?
          Array.from(activeTests.values()).filter(t => t.status === 'failed').length / activeTests.size * 100 : 0
      }
    }),

    // 增强的状态管理
    resetEngine: () => {
      setActiveTests(new Map());
      setTestResults(new Map());
      setEngineState({
        isConnected: false,
        supportedTypes: [],
        engineVersion: '',
        lastError: null
      });
    },

    getTestHistory: async (testType?: string): Promise<LegacyTestResult[]> => {
      try {
        // 从testResults中获取历史记录
        const history: LegacyTestResult[] = [];

        for (const [testId, result] of testResults.entries()) {
          if (!testType || result.testType === testType) {
            const test = activeTests.get(testId);
            history.push({
              id: testId,
              testType: result.testType,
              status: 'completed' as any, // TestResult没有status字段，使用默认值
              score: result.overallScore,
              startTime: test ? new Date(test.startTime).toISOString() : new Date().toISOString(),
              endTime: undefined, // TestStatusInfo没有endTime字段
              duration: result.duration,
              summary: typeof result.summary === 'string' ? result.summary : JSON.stringify(result.summary),
              details: result.results,
              recommendations: Array.isArray(result.recommendations?.immediate) ?
                result.recommendations.immediate.map(rec => ({
                  title: rec,
                  description: rec,
                  priority: 'medium' as const,
                  solution: rec
                })) : [],
              error: undefined // TestResult没有error字段
            });
          }
        }

        return history.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
      } catch (error) {
        console.error('获取测试历史失败:', error);
        return [];
      }
    }
  };
};

/**
 * 简化的测试执行Hook
 * 为特定测试类型提供简化的接口
 */
export const useTestExecution = (testType: TestType): TestExecutionHook => {
  const engine = useUnifiedTestEngine();

  const executeSpecificTest = useCallback(async (config: Record<string, any>, options?: any) => {
    return engine.executeTest({
      testType,
      config: config as TestConfig,
      options
    });
  }, [engine.executeTest, testType]);

  return {
    ...engine,
    executeTest: executeSpecificTest,
    execute: executeSpecificTest,
    cancel: engine.cancelTest,
    getStatus: engine.getTestStatus,
    isSupported: engine.supportedTypes.includes(testType),
    testType
  };
};

/**
 * 测试结果分析Hook
 */
export const useTestResultAnalysis = (testId: string): TestResultAnalysisHook => {
  const engine = useUnifiedTestEngine();
  const result = testId ? engine.testResults.get(testId) : null;

  const analysis = useCallback(() => {
    if (!result) return null;

    return {
      hasResult: true,
      overallScore: result.overallScore,
      grade: getGrade(result.overallScore),
      hasRecommendations: result.recommendations.immediate.length > 0 ||
        result.recommendations.shortTerm.length > 0,
      priorityLevel: result.recommendations.priority,
      testDuration: result.duration,
      completedAt: result.timestamp,

      // 转换为属性而不是方法
      scoreColor: (result.overallScore >= 80 ? 'green' :
        result.overallScore >= 60 ? 'yellow' : 'red') as 'green' | 'yellow' | 'red',

      recommendationCount: {
        immediate: result.recommendations.immediate.length,
        shortTerm: result.recommendations.shortTerm.length,
        longTerm: result.recommendations.longTerm.length,
        total: result.recommendations.immediate.length +
          result.recommendations.shortTerm.length +
          result.recommendations.longTerm.length
      },

      topIssues: [
        ...result.recommendations.immediate.slice(0, 3),
        ...result.recommendations.shortTerm.slice(0, Math.max(0, 3 - result.recommendations.immediate.length))
      ]
    };
  }, [result]);

  return {
    result,
    analysis: analysis(),
    hasResult: !!result,
    testId,
    loading: false,
    error: null,
    refresh: async () => {
      // 刷新测试结果分析
      // 这里可以重新获取测试结果
    }
  };
};

/**
 * 获取评分等级
 */
const getGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export default useUnifiedTestEngine;
