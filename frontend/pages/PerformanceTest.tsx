/**
 * 性能测试页面
 * 提供完整的网站性能测试功能，包括Core Web Vitals、Lighthouse审计等
 */

import { Activity, CheckCircle, Loader, Monitor, Play, RotateCcw, Settings, Smartphone, Square } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import { URLInput } from '../components/ui';
import TestPageLayout from '../components/testing/TestPageLayout';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';

// 性能测试配置接口
interface PerformanceTestConfig {
  url: string;
  device: 'desktop' | 'mobile' | 'tablet';
  networkCondition: 'fast-3g' | 'slow-3g' | 'offline' | 'no-throttling';
  includeScreenshots: boolean;
  lighthouseCategories: string[];
  customMetrics: string[];
  testType: 'performance';
}

// 性能测试结果接口
interface PerformanceTestResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    firstContentfulPaint: number;
    speedIndex: number;
    timeToInteractive: number;
    totalBlockingTime: number;
  };
  opportunities: Array<{
    title: string;
    description: string;
    savings: number;
  }>;
  diagnostics: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

const PerformanceTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "性能测试",
    description: "使用性能测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 测试配置状态
  const [config, setConfig] = useState<PerformanceTestConfig>({
    url: '',
    device: 'desktop',
    networkCondition: 'fast-3g',
    includeScreenshots: true,
    lighthouseCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    customMetrics: [],
    testType: 'performance'
  });

  // 测试状态
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PerformanceTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  // 测试进度
  const _testProgressHook = useTestProgress();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('准备就绪');

  const resetProgress = () => {
    setProgress(0);
    setCurrentStep('准备就绪');
  };

  // 后台测试信息
  const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 页面加载时检查是否有正在运行的测试
  useEffect(() => {
    const runningTests = backgroundTestManager.getRunningTests();
    const runningTest = runningTests.find(test => test.type === 'performance');
    if (runningTest) {
      setCurrentTestId(runningTest.id);
      setBackgroundTestInfo(runningTest);
      setIsRunning(true);
      setProgress(runningTest.progress);
      setCurrentStep(runningTest.currentStep);
      setCanSwitchPages(runningTest.canSwitchPages ?? true);
    }
  }, [setProgress, setCurrentStep]);

  // 监听后台测试状态变化
  useEffect(() => {
    const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: any) => {
      if (testInfo.type === 'performance' && testInfo.id === currentTestId) {
        switch (event) {
          case 'testProgress':
            setBackgroundTestInfo(testInfo);
            setProgress(testInfo.progress);
            setCurrentStep(testInfo.currentStep);
            setCanSwitchPages(testInfo.canSwitchPages);
            break;
          case 'testCompleted':
            setBackgroundTestInfo(testInfo);
            setResult(testInfo.result);
            setIsRunning(false);
            setCurrentTestId(null);
            setCanSwitchPages(true);

            // 记录测试完成统计
            if (testInfo.result) {
              const success = testInfo.result.overallScore > 0;
              const score = testInfo.result.overallScore;
              const duration = testInfo.result.duration || 60;
              recordTestCompletion('性能测试', success, score, duration);
            }
            break;
          case 'testFailed':
            setBackgroundTestInfo(testInfo);
            setError(testInfo.error || '测试失败');
            setIsRunning(false);
            setCurrentTestId(null);
            setCanSwitchPages(true);
            break;
        }
      }
    });

    return unsubscribe;
  }, [currentTestId, recordTestCompletion, setProgress, setCurrentStep]);

  // 开始测试
  const handleStartTest = useCallback(async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!config.url) {
      setError('请输入要测试的URL');
      return;
    }

    try {
      setError(null);
      setResult(null);
      setIsRunning(true);
      resetProgress();
      setCanSwitchPages(false);

      // 启动后台测试
      const testId = backgroundTestManager.startTest(
        'performance' as TestType,
        config,
        (progress: number, step: string) => {
          setProgress(progress);
          setCurrentStep(step);
        },
        (result: PerformanceTestResult) => {
          setResult(result);
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);

          // 记录测试完成统计
          const success = result.overallScore > 0;
          recordTestCompletion('性能测试', success, result.overallScore, 60);
        },
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setError(errorMessage || '测试失败');
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
        }
      );

      setCurrentTestId(testId);
    } catch (err: any) {
      setError(err.message || '启动测试失败');
      setIsRunning(false);
      setCanSwitchPages(true);
    }
  }, [config, requireLogin, resetProgress, setProgress, setCurrentStep, recordTestCompletion]);

  // 停止测试
  const handleStopTest = useCallback(() => {
    if (currentTestId) {
      backgroundTestManager.cancelTest(currentTestId);
      setIsRunning(false);
      setCurrentTestId(null);
      setCanSwitchPages(true);
      resetProgress();
    }
  }, [currentTestId, resetProgress]);

  // 重置测试
  const handleResetTest = useCallback(() => {
    setResult(null);
    setError(null);
    resetProgress();
  }, [resetProgress]);

  // 渲染配置面板
  const renderConfigPanel = () => (
    <div className="space-y-6">
      <URLInput
        value={config.url}
        onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
        placeholder="请输入要测试的网站URL"
        disabled={isRunning}
      />

      {/* 设备选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          测试设备
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'desktop', label: '桌面端', icon: Monitor },
            { value: 'mobile', label: '移动端', icon: Smartphone },
            { value: 'tablet', label: '平板端', icon: Monitor }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, device: value as any }))}
              disabled={isRunning}
              className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${config.device === value
                ? 'border-blue-500 themed-bg-tertiary themed-text-primary ring-2 ring-blue-500/20'
                : 'themed-border-primary hover:themed-border-secondary themed-text-secondary hover:themed-bg-secondary'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 网络条件 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          网络条件
        </label>
        <select
          value={config.networkCondition}
          onChange={(e) => setConfig(prev => ({ ...prev, networkCondition: e.target.value as any }))}
          disabled={isRunning}
          className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          <option value="no-throttling">无限制</option>
          <option value="fast-3g">快速3G</option>
          <option value="slow-3g">慢速3G</option>
          <option value="offline">离线</option>
        </select>
      </div>

      {/* Lighthouse类别 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lighthouse测试类别
        </label>
        <div className="space-y-2">
          {[
            { value: 'performance', label: '性能' },
            { value: 'accessibility', label: '可访问性' },
            { value: 'best-practices', label: '最佳实践' },
            { value: 'seo', label: 'SEO' }
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center">
              <input
                type="checkbox"
                checked={config.lighthouseCategories.includes(value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig(prev => ({
                      ...prev,
                      lighthouseCategories: [...prev.lighthouseCategories, value]
                    }));
                  } else {
                    setConfig(prev => ({
                      ...prev,
                      lighthouseCategories: prev.lighthouseCategories.filter(c => c !== value)
                    }));
                  }
                }}
                disabled={isRunning}
                className="mr-2"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 其他选项 */}
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.includeScreenshots}
            onChange={(e) => setConfig(prev => ({ ...prev, includeScreenshots: e.target.checked }))}
            disabled={isRunning}
            className="mr-2"
          />
          <span className="text-sm">包含截图</span>
        </label>
      </div>
    </div>
  );

  return (
    <TestPageLayout
      testType="performance"
      title="性能测试"
      description="全面分析网站性能，包括Core Web Vitals、Lighthouse审计等关键指标"
      icon={Activity}
      testContent={
        <div className="space-y-6">
          {/* 未登录提示 */}
          {!isAuthenticated && <>{LoginPromptComponent}</>}

          {/* 配置面板 */}
          <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
            <h2 className="text-xl font-semibold themed-text-primary mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              测试配置
            </h2>
            {renderConfigPanel()}
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isRunning && (
                <button
                  type="button"
                  onClick={handleStopTest}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center space-x-2 transition-all"
                >
                  <Square className="w-4 h-4" />
                  <span>停止测试</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStartTest}
                disabled={isRunning || !config.url}
                className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all ${isRunning || !config.url
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                {isRunning ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>测试进行中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>开始测试</span>
                  </>
                )}
              </button>

              {!isRunning && (result || error) && (
                <button
                  type="button"
                  onClick={handleResetTest}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center space-x-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重新测试</span>
                </button>
              )}
            </div>
          </div>

          {/* 进度显示 */}
          {isRunning && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-400" />
                测试进度
              </h3>
              <ProgressBar value={progress} />
              <p className="text-sm text-gray-600 mt-2">{currentStep}</p>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">测试失败</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                测试结果
              </h3>

              {/* 总体评分 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">总体评分</span>
                  <span className="text-2xl font-bold text-blue-600">{result.overallScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${result.overallScore}%` }}
                  />
                </div>
              </div>

              {/* Core Web Vitals */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Core Web Vitals</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.coreWebVitals.lcp}s</div>
                    <div className="text-sm text-gray-600">LCP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.coreWebVitals.fid}ms</div>
                    <div className="text-sm text-gray-600">FID</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.coreWebVitals.cls}</div>
                    <div className="text-sm text-gray-600">CLS</div>
                  </div>
                </div>
              </div>

              {/* Lighthouse评分 */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Lighthouse评分</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.lighthouse).map(([key, score]) => (
                    <div key={key} className="text-center">
                      <div className="text-xl font-bold text-blue-600">{score}</div>
                      <div className="text-sm text-gray-600 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default PerformanceTest;
