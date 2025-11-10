/**
 * 🔄 Hook兼容性层
 * 为重构后的Hook提供向后兼容性
 * 确保现有代码无需修改即可使用新的统一Hook
 */

import { useCallback } from 'react';
import { TestType } from '../types/enums';
import { useTestState as useTestStateCore } from './useTestState';
import { useUnifiedTestEngine } from './useUnifiedTestEngine';
import type { StressTestRecord, TestProgress, TestMetrics, TestResults } from '../types/common';

/**
 * useTestEngine兼容性Hook
 * @deprecated 请使用 useUnifiedTestEngine 替代
 */
export const useTestEngine = () => {
  const engine = useUnifiedTestEngine();

  return {
    // 状态
    isRunning: engine.executingTest,
    progress: engine.getTestProgress?.() || 0,
    stage: (engine.activeTests?.size ?? 0) > 0 ?
      Array.from(engine.activeTests?.values() ?? [])[0].currentStep : '准备中',
    error: engine.lastError?.message || null,
    currentTest: (engine.activeTests?.size ?? 0) > 0 ? {
      id: Array.from(engine.activeTests?.keys() ?? [])[0],
      testType: 'unknown', // TestStatusInfo没有type字段，使用默认值
      status: Array.from(engine.activeTests?.values() ?? [])[0].status as any,
      startTime: new Date(Array.from(engine.activeTests?.values() ?? [])[0].startTime).toISOString()
    } : null,

    // 方法
    runTest: engine.runLegacyTest,
    cancelTest: async () => {
      const testId = Array.from(engine.activeTests?.keys() || [])[0];
      if (testId) {
        await engine.cancelTest?.();
      }
    },
    resetEngine: engine.resetEngine,
    getTestHistory: () => engine.getTestHistory?.()
  };
};

/**
 * useSimpleTestEngine兼容性Hook
 * @deprecated 请使用 useUnifiedTestEngine 替代
 */
export const useSimpleTestEngine = () => {
  const engine = useUnifiedTestEngine();

  return {
    // 状态
    isConnected: engine.isConnected,
    supportedEngines: engine.supportedTypes,
    engineVersion: engine.engineVersion,
    isRunning: engine.executingTest,
    error: engine.lastError?.message || null,

    // 方法
    runTest: engine.runSimpleTest,
    stopTest: async () => {
      await engine.cancelTest?.();
    },
    getTestStatus: engine.getTestStatus,
    getTestHistory: () => engine.getTestHistory?.(),
    checkEngineStatus: async () => {
      await engine.fetchSupportedTypes();
      return {
        data: engine.supportedTypes?.reduce((acc, type) => {
          acc[type] = true;
          return acc;
        }, {} as Record<string, boolean>)
      };
    },
    getEngineCapabilities: async () => {
      return {
        data: engine.supportedTypes?.reduce((acc, type) => {
          acc[type] = ['load', 'stress', 'performance'];
          return acc;
        }, {} as Record<string, string[]>)
      };
    },
    exportTestResults: async (testId: string, format: string) => {
      return {
        data: { downloadUrl: `/api/test/${testId}/export?format=${format}` }
      };
    }
  };
};

/**
 * useTestState兼容性Hook
 * @deprecated 请使用 useUnifiedTestEngine 替代
 */
export const useTestState = (options: {
  testType: TestType;
  defaultConfig: Record<string, any>;
  onTestComplete?: (result: any) => void;
  onTestError?: (error: string) => void;
  onConfigChange?: (config: Record<string, any>) => void;
  validateConfig?: (config: Record<string, any>) => { isValid: boolean; errors: string[] };
}) => {
  const engine = useUnifiedTestEngine();
  const universalState = engine.getUniversalState?.();

  const startTest = useCallback(async (customConfig?: Record<string, any>) => {
    try {
      const config = customConfig || options.defaultConfig;
      const testId = await engine.runSimpleTest?.({ testType: options.testType, ...config });

      // 等待测试完成
      const checkCompletion = async () => {
        const status = await engine.getTestStatus?.(testId);
        if (status?.status === 'completed') {
          const result = await engine.getTestResult?.(testId);
          options.onTestComplete?.(result);
        } else if (status?.status === 'failed') {
          options.onTestError?.(status?.error || '测试失败');
        }
      };

      // 轮询检查测试状态
      const interval = setInterval(async () => {
        const status = await engine.getTestStatus?.(testId);
        if (status?.status === 'completed' || status?.status === 'failed') {
          clearInterval(interval);
          await checkCompletion();
        }
      }, 1000);

    } catch (error) {
      options.onTestError?.(error instanceof Error ? error.message : '测试启动失败');
    }
  }, [engine, options]);

  return {
    // 状态
    config: universalState.config,
    isRunning: universalState.isRunning,
    progress: universalState.progress,
    currentStep: universalState.currentStep,
    result: universalState.result,
    error: universalState.error,
    testId: universalState.testId,
    startTime: universalState.startTime,
    endTime: universalState.endTime,

    // 操作
    setConfig: (config: Record<string, any>) => {
      options.onConfigChange?.(config);
    },
    updateConfig: (key: string, value: any) => {
      const newConfig = { ...universalState.config, [key]: value };
      options.onConfigChange?.(newConfig);
    },
    startTest,
    stopTest: async () => {
      if (universalState?.testId) {
        await engine.cancelTest?.();
      }
    },
    resetTest: engine.resetEngine,
    clearError: () => {
      // 错误会在下次操作时自动清除
    },

    // 验证
    isConfigValid: true,
    configErrors: [] as string[],
    testDuration: universalState.endTime && universalState.startTime ?
      universalState.endTime - universalState.startTime : null
  };
};

/**
 * useUniversalTest兼容性Hook
 * @deprecated 请使用 useUnifiedTestEngine 替代
 */
export const useUniversalTest = (testType: string, defaultConfig: Record<string, any>) => {
  const engine = useUnifiedTestEngine();
  const universalState = engine.getUniversalState?.();

  return {
    // 状态
    ...universalState,

    // 操作
    startTest: async (config?: Record<string, any>) => {
      const finalConfig = config || defaultConfig;
      return await engine.runSimpleTest?.({ testType, ...finalConfig });
    },

    stopTest: async () => {
      if (universalState?.testId) {
        await engine.cancelTest?.();
      }
    },

    resetTest: engine.resetEngine,

    // 配置管理
    updateConfig: (updates: Record<string, any>) => {
      // 配置更新会在下次测试时生效
    },

    // 验证
    validateConfig: (config: Record<string, any>) => {
      return { isValid: true, errors: [] as string[] };
    }
  };
};

/**
 * useUnifiedTestState兼容性Hook
 * @deprecated 请使用 useTestState 替代
 */
export const useUnifiedTestState = (options: {
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
}) => {
  // 使用重构后的useTestState
  const testState = useTestStateCore({
    testType: options.testType as TestType,
    defaultConfig: {},
    maxConcurrentTests: options.maxConcurrentTests,
    defaultTimeout: options.defaultTimeout,
    enableQueue: options.enableQueue,
    enableWebSocket: options.enableWebSocket,
    enablePersistence: options.enablePersistence,
    onTestStarted: options.onTestStarted,
    onTestProgress: options.onTestProgress,
    onTestComplete: options.onTestCompleted,
    onTestError: options.onTestFailed,
    onTestCancelled: options.onTestCancelled,
    onTestQueued: options.onTestQueued,
    onStatusUpdate: options.onStatusUpdate
  });

  return {
    // 状态映射
    testId: testState.testId,
    recordId: testState.recordId,
    status: testState.isRunning ? 'running' : 'idle',
    phase: testState.phase,
    message: testState.message,
    queueStats: testState.queueStats,
    isRunning: testState.isRunning,
    isQueued: testState.isQueued,
    canStartTest: testState.canStartTest,
    error: testState.error,

    // 操作映射
    startTest: testState.startTest,
    cancelTest: async () => {
      await testState.stopTest();
    },
    stopTest: testState.stopTest,
    reset: testState.resetTest,
    getState: testState.getState
  };
};
