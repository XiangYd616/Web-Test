/**
 * 兼容性测试专用状态管理Hook
 * 可选的升级方案，CompatibilityTest.tsx可以选择使用或保持现有实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  CompatibilityTestConfig,
  CompatibilityTestResult
} from '../types';

// 所有类型定义已迁移到统一的类型系统
// 请从 '../types' 导入所需的类型

// 兼容性测试结果接口
export interface CompatibilityTestResult {
  id: string;
  config: CompatibilityTestConfig;
  status: 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    compatibilityScore: number;
    supportedBrowsers: number;
    totalBrowsers: number;
  };
  browserResults: Array<{
    browser: string;
    version: string;
    device: string;
    status: 'supported' | 'partial' | 'unsupported';
    issues: string[];
    screenshot?: string;
    performanceMetrics?: {
      loadTime: number;
      renderTime: number;
      interactiveTime: number;
    };
  }>;
  featureSupport: Array<{
    feature: string;
    supportLevel: 'full' | 'partial' | 'none';
    supportedBrowsers: string[];
    unsupportedBrowsers: string[];
    notes: string;
  }>;
  accessibilityResults?: {
    score: number;
    issues: Array<{
      type: 'error' | 'warning';
      description: string;
      element: string;
    }>;
  };
  recommendations: string[];
}

// Hook状态接口
export interface UseCompatibilityTestStateReturn {
  // 配置状态
  config: CompatibilityTestConfig;
  updateConfig: (updates: Partial<CompatibilityTestConfig>) => void;
  resetConfig: () => void;

  // 测试状态
  isRunning: boolean;
  progress: number;
  currentStep: string;
  testId: string | null;

  // 结果状态
  result: CompatibilityTestResult | null;
  error: string | null;

  // 操作方法
  startTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  resetTest: () => void;

  // 配置管理
  addBrowser: (browser: string) => void;
  removeBrowser: (browser: string) => void;
  addDevice: (device: string) => void;
  removeDevice: (device: string) => void;
  addFeature: (feature: string) => void;
  removeFeature: (feature: string) => void;
  addViewport: (viewport: { name: string; width: number; height: number }) => void;
  removeViewport: (index: number) => void;

  // 预设配置
  loadPreset: (preset: 'modern' | 'legacy' | 'mobile' | 'desktop') => void;

  // 验证方法
  validateConfig: () => { isValid: boolean; errors: string[] };
}

/**
 * 兼容性测试专用状态管理Hook
 */
export const useCompatibilityTestState = (): UseCompatibilityTestStateReturn => {
  // 基础状态
  const [config, setConfig] = useState<CompatibilityTestConfig>({
    url: '',
    testEngine: 'caniuse',
    browsers: ['chrome', 'firefox', 'safari', 'edge'],
    devices: ['desktop', 'mobile'],
    features: [],
    includeScreenshots: false,
    includeAccessibility: true,
    includePerformance: false,
    testViewports: [
      { name: '桌面', width: 1920, height: 1080 },
      { name: '平板', width: 768, height: 1024 },
      { name: '手机', width: 375, height: 667 }
    ],
    timeout: 60000,
    retries: 2
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((updates: Partial<CompatibilityTestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  /**
   * 重置配置
   */
  const resetConfig = useCallback(() => {
    setConfig({
      url: '',
      testEngine: 'caniuse',
      browsers: ['chrome', 'firefox', 'safari', 'edge'],
      devices: ['desktop', 'mobile'],
      features: [],
      includeScreenshots: false,
      includeAccessibility: true,
      includePerformance: false,
      testViewports: [
        { name: '桌面', width: 1920, height: 1080 },
        { name: '平板', width: 768, height: 1024 },
        { name: '手机', width: 375, height: 667 }
      ],
      timeout: 60000,
      retries: 2
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

    if (config.browsers.length === 0) {
      errors.push('请至少选择一个浏览器');
    }

    if (config.devices.length === 0) {
      errors.push('请至少选择一个设备类型');
    }

    if (config.testViewports.length === 0) {
      errors.push('请至少添加一个测试视口');
    }

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
      setCurrentStep('正在初始化兼容性测试...');
      setError(null);
      setResult(null);

      abortControllerRef.current = new AbortController();

      // 启动后台测试
      const newTestId = backgroundTestManager.startTest(
        'compatibility',
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
      setError(err.message || '兼容性测试启动失败');
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
   * 添加浏览器
   */
  const addBrowser = useCallback((browser: string) => {
    setConfig(prev => ({
      ...prev,
      browsers: [...prev.browsers, browser].filter((b, i, arr) => arr.indexOf(b) === i)
    }));
  }, []);

  /**
   * 移除浏览器
   */
  const removeBrowser = useCallback((browser: string) => {
    setConfig(prev => ({
      ...prev,
      browsers: prev.browsers.filter(b => b !== browser)
    }));
  }, []);

  /**
   * 添加设备
   */
  const addDevice = useCallback((device: string) => {
    setConfig(prev => ({
      ...prev,
      devices: [...prev.devices, device].filter((d, i, arr) => arr.indexOf(d) === i)
    }));
  }, []);

  /**
   * 移除设备
   */
  const removeDevice = useCallback((device: string) => {
    setConfig(prev => ({
      ...prev,
      devices: prev.devices.filter(d => d !== device)
    }));
  }, []);

  /**
   * 添加特性
   */
  const addFeature = useCallback((feature: string) => {
    setConfig(prev => ({
      ...prev,
      features: [...prev.features, feature].filter((f, i, arr) => arr.indexOf(f) === i)
    }));
  }, []);

  /**
   * 移除特性
   */
  const removeFeature = useCallback((feature: string) => {
    setConfig(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== feature)
    }));
  }, []);

  /**
   * 添加视口
   */
  const addViewport = useCallback((viewport: { name: string; width: number; height: number }) => {
    setConfig(prev => ({
      ...prev,
      testViewports: [...prev.testViewports, viewport]
    }));
  }, []);

  /**
   * 移除视口
   */
  const removeViewport = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      testViewports: prev.testViewports.filter((_, i) => i !== index)
    }));
  }, []);

  /**
   * 加载预设配置
   */
  const loadPreset = useCallback((preset: 'modern' | 'legacy' | 'mobile' | 'desktop') => {
    const presets = {
      modern: {
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        devices: ['desktop', 'mobile'],
        features: ['flexbox', 'grid', 'es6', 'webp', 'http2'],
        testViewports: [
          { name: '桌面', width: 1920, height: 1080 },
          { name: '手机', width: 375, height: 667 }
        ]
      },
      legacy: {
        browsers: ['chrome', 'firefox', 'safari', 'edge', 'ie11'],
        devices: ['desktop'],
        features: ['css3', 'html5', 'javascript'],
        testViewports: [
          { name: '桌面', width: 1366, height: 768 }
        ]
      },
      mobile: {
        browsers: ['chrome', 'safari', 'samsung'],
        devices: ['mobile', 'tablet'],
        features: ['touch', 'geolocation', 'camera', 'responsive'],
        testViewports: [
          { name: 'iPhone', width: 375, height: 667 },
          { name: 'Android', width: 360, height: 640 },
          { name: 'iPad', width: 768, height: 1024 }
        ]
      },
      desktop: {
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        devices: ['desktop'],
        features: ['css3', 'html5', 'javascript', 'webgl'],
        testViewports: [
          { name: '1080p', width: 1920, height: 1080 },
          { name: '1440p', width: 2560, height: 1440 }
        ]
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

  return {
    // 配置状态
    config,
    updateConfig,
    resetConfig,

    // 测试状态
    isRunning,
    progress,
    currentStep,
    testId,

    // 结果状态
    result,
    error,

    // 操作方法
    startTest,
    stopTest,
    resetTest,

    // 配置管理
    addBrowser,
    removeBrowser,
    addDevice,
    removeDevice,
    addFeature,
    removeFeature,
    addViewport,
    removeViewport,

    // 预设配置
    loadPreset,

    // 验证方法
    validateConfig
  };
};

export default useCompatibilityTestState;
