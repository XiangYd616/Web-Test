/**
 * 通用测试状态管理Hook
 * 为各个独立测试页面提供共享的基础状态管理逻辑
 * 消除重复代码，但保持页面独立性
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';
import { useUserStats } from './useUserStats';

export interface TestConfig {
  [key: string]: any;
}

export interface TestState {
  config: TestConfig;
  isRunning: boolean;
  progress: number;
  currentStep: string;
  result: any;
  error: string | null;
  testId: string | null;
  startTime: number | null;
  endTime: number | null;
}

export interface TestActions {
  setConfig: (config: TestConfig) => void;
  updateConfig: (key: string, value: any) => void;
  startTest: (customConfig?: TestConfig) => Promise<void>;
  stopTest: () => void;
  resetTest: () => void;
  clearError: () => void;
}

export interface UseTestStateOptions {
  testType: TestType;
  defaultConfig: TestConfig;
  onTestComplete?: (result: any) => void;
  onTestError?: (error: string) => void;
  onConfigChange?: (config: TestConfig) => void;
  validateConfig?: (config: TestConfig) => { isValid: boolean; errors: string[] };
}

export interface UseTestStateReturn extends TestState, TestActions {
  isConfigValid: boolean;
  configErrors: string[];
  testDuration: number | null;
}

/**
 * 通用测试状态管理Hook
 * 提供所有测试页面共同需要的状态管理逻辑
 */
export const useTestState = (options: UseTestStateOptions): UseTestStateReturn => {
  const {
    testType,
    defaultConfig,
    onTestComplete,
    onTestError,
    onConfigChange,
    validateConfig
  } = options;

  const { recordTestCompletion } = useUserStats();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // 配置验证状态
  const [configValidation, setConfigValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });

  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
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

  // 开始测试
  const startTest = useCallback(async (customConfig?: TestConfig) => {
    const testConfig = customConfig || state.config;

    // 验证配置
    if (validateConfig) {
      const validation = validateConfig(testConfig);
      if (!validation.isValid) {
        const errorMessage = `配置验证失败: ${validation.errors.join(', ')}`;
        setState(prev => ({ ...prev, error: errorMessage }));
        onTestError?.(errorMessage);
        return;
      }
    }

    try {
      setState(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        currentStep: '准备测试...',
        result: null,
        error: null,
        startTime: Date.now(),
        endTime: null
      }));

      // 启动测试
      const testId = backgroundTestManager.startTest(
        testType,
        testConfig,
        // 进度回调
        (progress: number, step: string) => {
          setState(prev => ({
            ...prev,
            progress,
            currentStep: step
          }));
        },
        // 完成回调
        (result: any) => {
          setState(prev => ({
            ...prev,
            isRunning: false,
            progress: 100,
            currentStep: '测试完成',
            result,
            endTime: Date.now(),
            testId
          }));

          // 记录测试完成
          recordTestCompletion(testType, true);
          onTestComplete?.(result);
        },
        // 错误回调
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setState(prev => ({
            ...prev,
            isRunning: false,
            error: errorMessage,
            endTime: Date.now()
          }));
          onTestError?.(errorMessage);
        }
      );

      setState(prev => ({
        ...prev,
        testId
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试启动失败';
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: errorMessage,
        endTime: Date.now()
      }));
      onTestError?.(errorMessage);
    }
  }, [state.config, testType, validateConfig, recordTestCompletion, onTestComplete, onTestError]);

  // 停止测试
  const stopTest = useCallback(() => {
    if (state.testId) {
      backgroundTestManager.cancelTest(state.testId);
    }

    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStep: '测试已停止',
      endTime: Date.now()
    }));
  }, [state.testId]);

  // 重置测试
  const resetTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      progress: 0,
      currentStep: '',
      result: null,
      error: null,
      testId: null,
      startTime: null,
      endTime: null
    }));
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // 计算测试持续时间
  const testDuration = state.startTime && state.endTime
    ? state.endTime - state.startTime
    : null;

  return {
    // 状态
    ...state,
    isConfigValid: configValidation.isValid,
    configErrors: configValidation.errors,
    testDuration,

    // 操作
    setConfig,
    updateConfig,
    startTest,
    stopTest,
    resetTest,
    clearError
  };
};

export default useTestState;
