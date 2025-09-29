/**
 * API测试专用状态管理Hook
 * 可选的升级方案，APITest.tsx可以选择使用或保持现有实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  APIEndpoint,
  APITestConfig,
  APITestResult
} from '../types';

// 注意：现在使用统一的类型定义，从 ../types 导入
// 本地接口定义已迁移到 frontend/types/hooks/testState.types.ts

// 所有类型定义已迁移到统一的类型系统
// 请从 '../types' 导入所需的类型

// 使用统一的Hook类型定义
// 注意：现在返回 APITestHook 类型，它包含了所有必要的状态和操作

interface APITestOperations {
  // 批量操作
  importEndpoints: (endpoints: APIEndpoint[]) => void;
  exportEndpoints: () => APIEndpoint[];

  // 验证方法
  validateConfig: () => { isValid: boolean; errors: string[] };
}

/**
 * API测试专用状态管理Hook
 * 提供完整的API测试状态管理功能
 *
 * 已迁移到新的类型系统，返回 APITestHook 类型
 */
export const useAPITestState = (): unknown => {
  // 基础状态
  const [config, setConfig] = useState<APITestConfig>({
    endpoints: [],
    timeout: 10000,
    retries: 3,
    authentication: {
      type: 'none'
    }
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [result, setResult] = useState<APITestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((updates: Partial<APITestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError(null); // 清除之前的错误
  }, []);

  /**
   * 重置配置
   */
  const resetConfig = useCallback(() => {
    setConfig({
      endpoints: [],
      timeout: 10000,
      retries: 3,
      authentication: {
        type: 'none'
      }
    });
  }, []);

  /**
   * 验证配置
   */
  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (config.endpoints.length === 0) {
      errors.push('请至少添加一个API端点');
    }

    if (config.endpoints.length === 0) {
      errors.push('请至少添加一个API端点');
    }

    // 验证端点
    config.endpoints.forEach((endpoint, index) => {
      if (!endpoint.name) {
        errors.push(`端点 ${index + 1}: 请输入端点名称`);
      }
      if (!endpoint.url) {
        errors.push(`端点 ${index + 1}: 请输入端点URL`);
      }
      if (!endpoint.name) {
        errors.push(`端点 ${index + 1}: 请输入端点名称`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [config]);

  /**
   * 启动测试
   */
  const startTest = useCallback(async () => {
    // 验证配置
    const validation = validateConfig();
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setCurrentStep('正在初始化API测试...');
      setError(null);
      setResult(null);

      // 创建中止控制器
      abortControllerRef.current = new AbortController();

      // 启动后台测试
      const newTestId = backgroundTestManager.startTest(
        'api' as any,
        config,
        (progress: number, step: string) => {
          setProgress(progress);
          setCurrentStep(step);
        },
        (testResult: unknown) => {
          setResult(testResult);
          setIsRunning(false);
          setProgress(100);
          setCurrentStep('测试完成');
        },
        (testError: unknown) => {
          setError(testError.message);
          setIsRunning(false);
          setCurrentStep('测试失败');
        }
      );

      setTestId(newTestId);

    } catch (err: unknown) {
      setError(err.message || 'API测试启动失败');
      setIsRunning(false);
      setCurrentStep('');
    }
  }, [config, validateConfig]);

  /**
   * 停止测试
   */
  const stopTest = useCallback(async () => {
    if (testId) {
      try {
        backgroundTestManager.cancelTest(testId);
        abortControllerRef.current?.abort();
        setIsRunning(false);
        setCurrentStep('测试已停止');
      } catch (err: unknown) {
        setError(err.message || '停止测试失败');
      }
    }
  }, [testId]);

  /**
   * 重置测试
   */
  const resetTest = useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setCurrentStep('');
    setTestId(null);
    setResult(null);
    setError(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  /**
   * 添加端点
   */
  const addEndpoint = useCallback((endpoint: Omit<APIEndpoint, 'id'>) => {
    const newEndpoint: APIEndpoint = {
      ...endpoint,
      id: `endpoint_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    };

    setConfig(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, newEndpoint]
    }));
  }, []);

  /**
   * 更新端点
   */
  const updateEndpoint = useCallback((id: string, updates: Partial<APIEndpoint>) => {
    setConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.map(endpoint =>
        endpoint.id === id ? { ...endpoint, ...updates } : endpoint
      )
    }));
  }, []);

  /**
   * 移除端点
   */
  const removeEndpoint = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter(endpoint => endpoint.id !== id)
    }));
  }, []);

  /**
   * 复制端点
   */
  const duplicateEndpoint = useCallback((id: string) => {
    const endpoint = config.endpoints.find(ep => ep.id === id);
    if (endpoint) {
      const duplicated = {
        ...endpoint,
        id: `endpoint_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: `${endpoint.name} (副本)`
      };

      setConfig(prev => ({
        ...prev,
        endpoints: [...prev.endpoints, duplicated]
      }));
    }
  }, [config.endpoints]);

  /**
   * 导入端点
   */
  const importEndpoints = useCallback((endpoints: APIEndpoint[]) => {
    const newEndpoints = endpoints.map(endpoint => ({
      ...endpoint,
      id: `endpoint_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }));

    setConfig(prev => ({
      ...prev,
      endpoints: [...prev.endpoints, ...newEndpoints]
    }));
  }, []);

  /**
   * 导出端点
   */
  const exportEndpoints = useCallback((): APIEndpoint[] => {
    return config.endpoints;
  }, [config.endpoints]);

  // 清理资源
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 计算派生状态
  const status = isRunning ? 'running' : (result ? 'completed' : (error ? 'failed' : 'idle'));
  const isCompleted = status === 'completed';
  const hasError = status === 'failed';
  const currentEndpoint = config.endpoints.length > 0 ? config.endpoints[0]?.name || null : null;
  const completedEndpoints = result ? config.endpoints.length : 0;

  return {
    // ==================== BaseTestState ====================
    status,
    progress,
    currentStep,
    result,
    error,
    isRunning,
    isCompleted,
    hasError,

    // ==================== APITestState ====================
    config,
    currentEndpoint,
    completedEndpoints,

    // ==================== BaseTestActions ====================
    startTest: (config: APITestConfig) => startTest(),
    stopTest,
    reset: resetTest,
    clearError: () => setError(null),

    // ==================== APITestActions ====================
    updateConfig,
    addEndpoint,
    removeEndpoint,
    updateEndpoint,

    // ==================== 额外的便利方法（保持向后兼容） ====================
    resetConfig,
    duplicateEndpoint,
    importEndpoints,
    exportEndpoints,
    validateConfig,
    testId  // 保留testId以便调试
  };
};

export default useAPITestState;
