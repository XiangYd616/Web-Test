/**
 * UX测试专用状态管理Hook
 * 可选的升级方案，UXTest.tsx可以选择使用或保持现有实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  UXTestConfig,
  UXTestHook,
  UXTestResult
} from '../types';

// 所有类型定义已迁移到统一的类型系统
// 请从 '../types' 导入所需的类型

interface UXTestAction {
  action: 'click' | 'type' | 'scroll' | 'wait';
  selector?: string;
  value?: string;
  duration?: number;
}

// UX测试结果接口
export interface UXTestResult {
  id: string;
  config: UXTestConfig;
  status: 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    overallScore: number;
    usabilityScore: number;
    accessibilityScore: number;
    performanceScore: number;
    interactivityScore: number;
  };
  coreWebVitals: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
  };
  accessibilityResults: {
    score: number;
    violations: Array<{
      id: string;
      impact: 'minor' | 'moderate' | 'serious' | 'critical';
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        html: string;
        target: string[];
      }>;
    }>;
    passes: number;
    incomplete: number;
  };
  usabilityResults: {
    score: number;
    issues: Array<{
      type: 'navigation' | 'content' | 'interaction' | 'visual';
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    heatmapData?: Array<{
      x: number;
      y: number;
      intensity: number;
    }>;
  };
  performanceResults: {
    score: number;
    metrics: {
      loadTime: number;
      renderTime: number;
      interactiveTime: number;
      resourceCount: number;
      totalSize: number;
    };
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      savings: number;
    }>;
  };
  userScenarioResults: Array<{
    scenario: string;
    status: 'passed' | 'failed';
    duration: number;
    steps: Array<{
      step: string;
      status: 'passed' | 'failed';
      duration: number;
      error?: string;
    }>;
  }>;
  recommendations: string[];
}

// Hook状态接口
export interface UseUXTestStateReturn {
  // 配置状态
  config: UXTestConfig;
  updateConfig: (updates: Partial<UXTestConfig>) => void;
  resetConfig: () => void;

  // 测试状态
  isRunning: boolean;
  progress: number;
  currentStep: string;
  testId: string | null;

  // 结果状态
  result: UXTestResult | null;
  error: string | null;

  // 操作方法
  startTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  resetTest: () => void;

  // 用户场景管理
  addUserScenario: (scenario: Omit<UXTestConfig['userScenarios'][0], 'id'>) => void;
  updateUserScenario: (id: string, updates: Partial<UXTestConfig['userScenarios'][0]>) => void;
  removeUserScenario: (id: string) => void;

  // 自定义检查管理
  addCustomCheck: (check: string) => void;
  removeCustomCheck: (check: string) => void;

  // 预设配置
  loadPreset: (preset: 'basic' | 'comprehensive' | 'accessibility' | 'performance') => void;

  // 验证方法
  validateConfig: () => { isValid: boolean; errors: string[] };
}

/**
 * UX测试专用状态管理Hook
 * 已迁移到新的类型系统，返回 UXTestHook 类型
 */
export const useUXTestState = (): UXTestHook => {
  // 基础状态
  const [config, setConfig] = useState<UXTestConfig>({
    url: '',
    device: 'desktop',
    networkCondition: 'fast-3g',
    accessibilityLevel: 'AA',
    includeUsability: true,
    includeMobile: true,
    includePerformance: true,
    includeAccessibility: true,
    includeInteractivity: true,
    customChecks: [],
    timeout: 120000,
    viewport: {
      width: 1920,
      height: 1080
    },
    userScenarios: []
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [result, setResult] = useState<UXTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((updates: Partial<UXTestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  /**
   * 重置配置
   */
  const resetConfig = useCallback(() => {
    setConfig({
      url: '',
      device: 'desktop',
      networkCondition: 'fast-3g',
      accessibilityLevel: 'AA',
      includeUsability: true,
      includeMobile: true,
      includePerformance: true,
      includeAccessibility: true,
      includeInteractivity: true,
      customChecks: [],
      timeout: 120000,
      viewport: {
        width: 1920,
        height: 1080
      },
      userScenarios: []
    });
  }, []);

  /**
   * 验证配置
   */
  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('请输入测试URL');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL格式无效');
      }
    }

    if (config.viewport.width < 320 || config.viewport.width > 3840) {
      errors.push('视口宽度应在320-3840像素之间');
    }

    if (config.viewport.height < 240 || config.viewport.height > 2160) {
      errors.push('视口高度应在240-2160像素之间');
    }

    // 验证用户场景
    config.userScenarios.forEach((scenario, index) => {
      if (!scenario.name) {
        errors.push(`用户场景 ${index + 1}: 请输入场景名称`);
      }
      if (scenario.steps.length === 0) {
        errors.push(`用户场景 ${index + 1}: 请至少添加一个步骤`);
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
    const validation = validateConfig();
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setCurrentStep('正在初始化UX测试...');
      setError(null);
      setResult(null);

      abortControllerRef.current = new AbortController();

      // 启动后台测试
      const newTestId = backgroundTestManager.startTest(
        'ux',
        config,
        (progress, step) => {
          setProgress(progress);
          setCurrentStep(step);
        },
        (testResult) => {
          setResult(testResult);
          setIsRunning(false);
          setProgress(100);
          setCurrentStep('测试完成');
        },
        (testError) => {
          setError(testError.message);
          setIsRunning(false);
          setCurrentStep('测试失败');
        }
      );

      setTestId(newTestId);

    } catch (err: any) {
      setError(err.message || 'UX测试启动失败');
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
      } catch (err: any) {
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
   * 添加用户场景
   */
  const addUserScenario = useCallback((scenario: Omit<UXTestConfig['userScenarios'][0], 'id'>) => {
    const newScenario = {
      ...scenario,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    };

    setConfig(prev => ({
      ...prev,
      userScenarios: [...prev.userScenarios, newScenario]
    }));
  }, []);

  /**
   * 更新用户场景
   */
  const updateUserScenario = useCallback((id: string, updates: Partial<UXTestConfig['userScenarios'][0]>) => {
    setConfig(prev => ({
      ...prev,
      userScenarios: prev.userScenarios.map(scenario =>
        scenario.id === id ? { ...scenario, ...updates } : scenario
      )
    }));
  }, []);

  /**
   * 移除用户场景
   */
  const removeUserScenario = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      userScenarios: prev.userScenarios.filter(scenario => scenario.id !== id)
    }));
  }, []);

  /**
   * 添加自定义检查
   */
  const addCustomCheck = useCallback((check: string) => {
    setConfig(prev => ({
      ...prev,
      customChecks: [...prev.customChecks, check].filter((c, i, arr) => arr.indexOf(c) === i)
    }));
  }, []);

  /**
   * 移除自定义检查
   */
  const removeCustomCheck = useCallback((check: string) => {
    setConfig(prev => ({
      ...prev,
      customChecks: prev.customChecks.filter(c => c !== check)
    }));
  }, []);

  /**
   * 加载预设配置
   */
  const loadPreset = useCallback((preset: 'basic' | 'comprehensive' | 'accessibility' | 'performance') => {
    const presets = {
      basic: {
        includeUsability: true,
        includeMobile: false,
        includePerformance: false,
        includeAccessibility: true,
        includeInteractivity: false,
        accessibilityLevel: 'AA' as const,
        customChecks: []
      },
      comprehensive: {
        includeUsability: true,
        includeMobile: true,
        includePerformance: true,
        includeAccessibility: true,
        includeInteractivity: true,
        accessibilityLevel: 'AAA' as const,
        customChecks: ['color-contrast', 'keyboard-navigation', 'screen-reader', 'focus-management']
      },
      accessibility: {
        includeUsability: false,
        includeMobile: true,
        includePerformance: false,
        includeAccessibility: true,
        includeInteractivity: true,
        accessibilityLevel: 'AAA' as const,
        customChecks: ['color-contrast', 'keyboard-navigation', 'screen-reader', 'focus-management', 'aria-labels']
      },
      performance: {
        includeUsability: false,
        includeMobile: true,
        includePerformance: true,
        includeAccessibility: false,
        includeInteractivity: true,
        accessibilityLevel: 'AA' as const,
        customChecks: ['core-web-vitals', 'resource-optimization', 'render-blocking']
      }
    };

    const presetConfig = presets[preset];
    setConfig(prev => ({
      ...prev,
      ...presetConfig
    }));
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 计算派生状态
  const status: TestStatus = isRunning ? 'running' : (result ? 'completed' : (error ? 'failed' : 'idle'));
  const isCompleted = status === 'completed';
  const hasError = status === 'failed';
  const currentFlow = config.userScenarios?.length > 0 ? config.userScenarios[0]?.name || null : null;

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

    // ==================== UXTestState ====================
    config,
    currentFlow,

    // ==================== BaseTestActions ====================
    startTest: (config: UXTestConfig) => startTest(),
    stopTest,
    reset: resetTest,
    clearError: () => setError(null),

    // ==================== UXTestActions ====================
    updateConfig,
    addUserFlow: addUserScenario,
    removeUserFlow: removeUserScenario,
    updateUserFlow: updateUserScenario,

    // ==================== 额外的便利方法（保持向后兼容） ====================
    resetConfig,
    addCustomCheck,
    removeCustomCheck,
    loadPreset,
    validateConfig,
    testId  // 保留testId以便调试
  };
};

export default useUXTestState;
