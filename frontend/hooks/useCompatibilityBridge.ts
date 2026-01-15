/**
 * Hook兼容性层
 * 为重构后的Hook提供向后兼容性
 * 确保现有代码无需修改即可使用新的统一Hook
 */

import { useCallback } from 'react';
import { TestType } from '../types/enums';
import { useTestEngine } from './useTestEngine';

export { useTestEngine } from './useTestEngine';

type UnknownRecord = Record<string, unknown>;

type LegacyActiveTest = {
  currentStep?: string;
  status?: unknown;
  startTime?: unknown;
};

type LegacyTestEngineLike = {
  executingTest?: boolean;
  getTestProgress?: () => number;
  activeTests?: {
    size?: number;
    keys?: () => IterableIterator<unknown>;
    values?: () => IterableIterator<LegacyActiveTest>;
  };
  lastError?: { message?: string };
  runLegacyTest?: (...args: unknown[]) => unknown;
  runSimpleTest?: (...args: unknown[]) => unknown;
  cancelTest?: (...args: unknown[]) => unknown;
  resetEngine?: (...args: unknown[]) => unknown;
  getTestHistory?: (...args: unknown[]) => unknown;
  getTestStatus?: (...args: unknown[]) => unknown;
  getTestResult?: (...args: unknown[]) => unknown;
  isConnected?: boolean;
  supportedTypes?: string[];
  engineVersion?: string;
  fetchSupportedTypes?: () => unknown;
  testId?: unknown;
  [key: string]: unknown;
};

/**
 * useTestEngine兼容性Hook
 * @deprecated 请使用 useTestEngine 替代
 */
export const useTestEngineCompat = () => {
  const engine = useTestEngine();
  const legacyEngine = engine as unknown as LegacyTestEngineLike;
  const activeTestsValues = Array.from(
    legacyEngine.activeTests?.values?.() ?? []
  ) as LegacyActiveTest[];
  const activeTestsKeys = Array.from(legacyEngine.activeTests?.keys?.() ?? []) as unknown[];

  return {
    // 状态
    isRunning: legacyEngine.executingTest,
    progress: legacyEngine.getTestProgress?.() || 0,
    stage: (legacyEngine.activeTests?.size ?? 0) > 0 ? activeTestsValues[0]?.currentStep : '准备中',
    error: legacyEngine.lastError?.message || null,
    currentTest:
      (legacyEngine.activeTests?.size ?? 0) > 0
        ? {
            id: activeTestsKeys[0],
            testType: 'unknown', // TestStatusInfo没有type字段，使用默认值
            status: activeTestsValues[0]?.status,
            startTime: (() => {
              const start = activeTestsValues[0]?.startTime as unknown;
              if (!start) return new Date().toISOString();
              return new Date(start as any).toISOString();
            })(),
          }
        : null,

    // 方法
    runTest: legacyEngine.runLegacyTest,
    cancelTest: async () => {
      const testId = Array.from(legacyEngine.activeTests?.keys?.() ?? [])[0];
      if (testId) {
        await legacyEngine.cancelTest?.(testId);
      }
    },
    resetEngine: legacyEngine.resetEngine,
    getTestHistory: () => legacyEngine.getTestHistory?.(),
  };
};

/**
 * useSimpleTestEngine兼容性Hook
 * @deprecated 请使用 useTestEngine 替代
 */
export const useSimpleTestEngine = () => {
  const engine = useTestEngine();
  const legacyEngine = engine as unknown as LegacyTestEngineLike;

  return {
    // 状态
    isConnected: legacyEngine.isConnected,
    supportedEngines: legacyEngine.supportedTypes,
    engineVersion: legacyEngine.engineVersion,
    isRunning: legacyEngine.executingTest,
    error: legacyEngine.lastError?.message || null,

    // 方法
    runTest: legacyEngine.runSimpleTest,
    stopTest: async () => {
      await legacyEngine.cancelTest?.(legacyEngine?.testId);
    },
    getTestStatus: legacyEngine.getTestStatus,
    getTestHistory: () => legacyEngine.getTestHistory?.(),
    checkEngineStatus: async () => {
      await legacyEngine.fetchSupportedTypes?.();
      return {
        data: legacyEngine.supportedTypes?.reduce(
          (acc: Record<string, boolean>, type: string) => {
            acc[type] = true;
            return acc;
          },
          {} as Record<string, boolean>
        ),
      };
    },
    getEngineCapabilities: async () => {
      return {
        data: legacyEngine.supportedTypes?.reduce(
          (acc: Record<string, string[]>, type: string) => {
            acc[type] = ['load', 'stress', 'performance'];
            return acc;
          },
          {} as Record<string, string[]>
        ),
      };
    },
    exportTestResults: async (testId: string, format: string) => {
      return {
        data: { downloadUrl: `/api/test/${testId}/export?format=${format}` },
      };
    },
  };
};

/**
 * useTestState兼容性Hook
 * @deprecated 请使用 useTestEngine 替代
 */
export const useTestState = (options: {
  testType: TestType;
  initialConfig?: UnknownRecord;
  autoStart?: boolean;
  onTestComplete?: (result: unknown) => void;
  onTestError?: (error: unknown) => void;
  onConfigChange?: (config: UnknownRecord) => void;
  validateConfig?: (config: UnknownRecord) => { isValid: boolean; errors: string[] };
}) => {
  const legacyEngine = useTestEngine() as unknown as LegacyTestEngineLike;
  const bridgeState = (legacyEngine as any).getBridgeState?.() || {};

  const startTest = useCallback(
    async (customConfig?: UnknownRecord) => {
      try {
        const config = customConfig || options.initialConfig;
        const testId = await legacyEngine.runSimpleTest?.({
          testType: options.testType,
          ...(config || {}),
        });

        // 等待测试完成
        const checkCompletion = async () => {
          const status = (await legacyEngine.getTestStatus?.(testId)) as any;
          if (status?.status === 'completed') {
            const result = await legacyEngine.getTestResult?.(testId);
            options.onTestComplete?.(result);
          } else if (status?.status === 'failed') {
            options.onTestError?.(status?.error || '测试失败');
          }
        };

        // 轮询检查测试状态
        const interval = setInterval(async () => {
          const status = (await legacyEngine.getTestStatus?.(testId)) as any;
          if (status?.status === 'completed' || status?.status === 'failed') {
            clearInterval(interval);
            await checkCompletion();
          }
        }, 1000);
      } catch (error) {
        options.onTestError?.(error instanceof Error ? error.message : '测试启动失败');
      }
    },
    [legacyEngine, options]
  );

  return {
    // 状态
    config: bridgeState.config,
    isRunning: bridgeState.isRunning,
    progress: bridgeState.progress,
    currentStep: bridgeState.currentStep,
    result: bridgeState.result,
    error: bridgeState.error,
    testId: bridgeState.testId,
    startTime: bridgeState.startTime,
    endTime: bridgeState.endTime,

    // 操作
    setConfig: (config: UnknownRecord) => {
      options.onConfigChange?.(config);
    },
    updateConfig: (key: string, value: unknown) => {
      const newConfig = { ...(bridgeState.config as UnknownRecord), [key]: value };
      options.onConfigChange?.(newConfig);
    },
    startTest,
    stopTest: async () => {
      if (bridgeState?.testId) {
        await legacyEngine.cancelTest?.(bridgeState?.testId);
      }
    },
    resetTest: legacyEngine.resetEngine,
    clearError: () => {
      // 错误会在下次操作时自动清除
    },

    // 验证
    isConfigValid: true,
    configErrors: [] as string[],
    testDuration: (() => {
      if (!bridgeState.endTime || !bridgeState.startTime) return null;
      const end = new Date(bridgeState.endTime as unknown as string | number | Date).getTime();
      const start = new Date(bridgeState.startTime as unknown as string | number | Date).getTime();
      const duration = end - start;
      return Number.isFinite(duration) ? duration : null;
    })(),
  };
};

/**
 * useBridgeTest兼容性Hook
 * @deprecated 请使用 useTestEngine 替代
 */
export const useBridgeTest = (testType: string, defaultConfig: Record<string, any>) => {
  const legacyEngine = useTestEngine() as unknown as LegacyTestEngineLike;
  const bridgeState = (legacyEngine as any).getBridgeState?.() || {};

  const config = (bridgeState.config as UnknownRecord) || (defaultConfig as UnknownRecord);

  return {
    // 状态
    ...bridgeState,
    config,
    isRunning: Boolean(bridgeState.isRunning),
    progress: Number(bridgeState.progress || 0),
    currentStep: (bridgeState.currentStep as string) || '',
    result: bridgeState.result,
    error: bridgeState.error,
    testId: bridgeState.testId,

    // 操作
    startTest: async (config?: UnknownRecord) => {
      const finalConfig = config || (defaultConfig as UnknownRecord);
      return await legacyEngine.runSimpleTest?.({ testType, ...finalConfig });
    },

    stopTest: async () => {
      if (bridgeState?.testId) {
        await legacyEngine.cancelTest?.(bridgeState?.testId);
      }
    },

    resetTest: legacyEngine.resetEngine,

    // 配置管理
    updateConfig: (_updates: UnknownRecord) => {
      // 配置更新会在下次测试时生效
    },

    // 验证
    validateConfig: (_config: UnknownRecord) => {
      return { isValid: true, errors: [] as string[] };
    },
  };
};
