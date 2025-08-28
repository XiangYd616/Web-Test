/**
 * 通用测试状态管理Hook
 * 解决各测试工具重复状态管理逻辑的问题
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TestTypeConfig, ValidationRule } from '../components/testing/UniversalTestPage';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';
import { useUserStats } from './useUserStats';

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

export interface UniversalTestActions {
  setConfig: (config: Record<string, any>) => void;
  updateConfig: (key: string, value: any) => void;
  startTest: (config?: Record<string, any>) => Promise<void>;
  stopTest: () => void;
  resetTest: () => void;
  validateConfig: () => { isValid: boolean; errors: string[] };
}

export interface UniversalTestHook extends UniversalTestState, UniversalTestActions { }

/**
 * 通用测试Hook
 * 提供统一的测试状态管理和操作方法
 */
export const useUniversalTest = (testType: TestTypeConfig): UniversalTestHook => {
  const { recordTestCompletion } = useUserStats();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 状态管理
  const [state, setState] = useState<UniversalTestState>({
    config: { ...testType.defaultConfig },
    isRunning: false,
    progress: 0,
    currentStep: '',
    result: null,
    error: null,
    testId: null,
    startTime: null,
    endTime: null
  });

  // 清理定时器
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // 设置配置
  const setConfig = useCallback((config: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      config: { ...config },
      error: null
    }));
  }, []);

  // 更新单个配置项
  const updateConfig = useCallback((key: string, value: any) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      },
      error: null
    }));
  }, []);

  // 验证配置
  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { config } = state;

    // 验证必填字段
    testType.configSchema.fields.forEach(field => {
      if (field.required && (!config[field.key] || config[field.key] === '')) {
        errors.push(`${field.label}是必填项`);
      }

      // 验证字段特定规则
      if (field.validation && config[field.key]) {
        field.validation.forEach(rule => {
          if (!validateField(config[field.key], rule, config)) {
            errors.push(rule.message);
          }
        });
      }
    });

    // 验证全局规则
    if (testType.configSchema.validation) {
      testType.configSchema.validation.forEach(rule => {
        if (!validateField(config, rule, config)) {
          errors.push(rule.message);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [state.config, testType.configSchema]);

  // 字段验证辅助函数
  const validateField = (value: any, rule: ValidationRule, config: Record<string, any>): boolean => {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'min':
        return typeof value === 'number' ? value >= rule.value : value.length >= rule.value;
      case 'max':
        return typeof value === 'number' ? value <= rule.value : value.length <= rule.value;
      case 'pattern':
        return new RegExp(rule.value).test(value);
      case 'custom':
        return rule.validator ? rule.validator(value, config) : true;
      default:
        return true;
    }
  };

  // 开始测试
  const startTest = useCallback(async (configOverride?: Record<string, any>) => {
    const testConfig = configOverride || state.config;

    // 验证配置
    const validation = validateConfig();
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        error: `配置验证失败: ${validation.errors.join(', ')}`
      }));
      return;
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

      // 映射测试类型到枚举
      const testTypeEnum = getTestTypeEnum(testType.id);

      // 启动测试
      const testId = backgroundTestManager.startTest(
        testTypeEnum,
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
          recordTestCompletion(testType.id, true);
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
        }
      );

      setState(prev => ({
        ...prev,
        testId
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : '测试启动失败',
        endTime: Date.now()
      }));
    }
  }, [state.config, testType.id, validateConfig, recordTestCompletion]);

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

  // 测试类型映射
  const getTestTypeEnum = (testTypeId: string): TestType => {
    const mapping: Record<string, TestType> = {
      'stress': TestType.STRESS,
      'api': TestType.API,
      'performance': TestType.PERFORMANCE,
      'security': TestType.SECURITY,
      'seo': TestType.SEO,
      'ux': TestType.UX,
      'database': TestType.DATABASE,
      'network': TestType.NETWORK,
      'compatibility': TestType.COMPATIBILITY,
      'website': TestType.WEBSITE
    };

    return mapping[testTypeId] || TestType.PERFORMANCE;
  };

  return {
    ...state,
    setConfig,
    updateConfig,
    startTest,
    stopTest,
    resetTest,
    validateConfig
  };
};

export default useUniversalTest;
