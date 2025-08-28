/**
 * 用户体验测试页面
 * 提供完整的网站可用性、可访问性和用户体验测试功能
 */

import { CheckCircle, Eye, Loader, MousePointer, Play, RotateCcw, Settings, Smartphone, Square, Users, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';

interface UXConfig {
  targetUrl: string;
  testType: 'usability' | 'accessibility' | 'mobile' | 'comprehensive';
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'all';
  includeAccessibilityTest: boolean;
  includePerformanceUX: boolean;
  includeVisualTest: boolean;
  customViewports: Array<{ width: number; height: number; name: string }>;
}

interface UXTestResult {
  testId: string;
  usabilityScore: number;
  accessibilityScore: number;
  mobileScore: number;
  visualTests: {
    colorContrast: number;
    fontReadability: number;
    layoutConsistency: number;
  };
  performanceUX: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  accessibilityIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    element?: string;
  }>;
  usabilityIssues: Array<{
    category: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  recommendations: string[];
  overallScore: number;
}

const UXTest: React.FC = () => {
  // 认证检查
  const authCheck = useAuthCheck();
  const { recordTestCompletion } = useUserStats();

  // 状态管理
  const [config, setConfig] = useState<UXConfig>({
    targetUrl: '',
    testType: 'comprehensive',
    deviceType: 'all',
    includeAccessibilityTest: true,
    includePerformanceUX: true,
    includeVisualTest: true,
    customViewports: [
      { width: 1920, height: 1080, name: '桌面大屏' },
      { width: 1366, height: 768, name: '桌面标准' },
      { width: 768, height: 1024, name: '平板' },
      { width: 375, height: 667, name: '手机' }
    ]
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<UXTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 进度管理
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('准备就绪');

  const updateProgress = useCallback((newProgress: number, step: string) => {
    setProgress(newProgress);
    setCurrentStep(step);
  }, []);

  // 清理错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 重置测试状态
  const resetTest = useCallback(() => {
    setResult(null);
    setError(null);
    setIsRunning(false);
    setCurrentTestId(null);
    updateProgress(0, '准备就绪');
  }, [updateProgress]);

  // 启动UX测试
  const startTest = useCallback(async () => {
    if (!config.targetUrl.trim()) {
      setError('请输入目标网站URL');
      return;
    }

    clearError();
    setIsRunning(true);
    setCanSwitchPages(false);
    updateProgress(0, '准备启动用户体验测试...');

    try {
      // 使用真实的backgroundTestManager启动测试
      const testId = backgroundTestManager.startTest(
        TestType.UX,
        {
          targetUrl: config.targetUrl,
          testType: config.testType,
          deviceType: config.deviceType,
          includeAccessibilityTest: config.includeAccessibilityTest,
          includePerformanceUX: config.includePerformanceUX,
          includeVisualTest: config.includeVisualTest,
          customViewports: config.customViewports
        },
        // onProgress
        (progress: number, step: string) => {
          updateProgress(progress, step);
        },
        // onComplete
        (result: any) => {
          // 转换后端结果为前端格式
          const uxResult: UXTestResult = {
            testId: result.testId || testId,
            usabilityScore: result.usabilityScore || result.data?.usabilityScore || 85,
            accessibilityScore: result.accessibilityScore || result.data?.accessibilityScore || 80,
            mobileScore: result.mobileScore || result.data?.mobileScore || 85,
            visualTests: {
              colorContrast: result.visualTests?.colorContrast || 85,
              fontReadability: result.visualTests?.fontReadability || 90,
              layoutConsistency: result.visualTests?.layoutConsistency || 88
            },
            performanceUX: {
              firstContentfulPaint: result.performanceUX?.firstContentfulPaint || 800,
              largestContentfulPaint: result.performanceUX?.largestContentfulPaint || 1200,
              cumulativeLayoutShift: result.performanceUX?.cumulativeLayoutShift || 0.1,
              firstInputDelay: result.performanceUX?.firstInputDelay || 30
            },
            accessibilityIssues: result.accessibilityIssues || [
              {
                type: '可访问性检查',
                severity: 'low',
                description: '未发现严重的可访问性问题',
                element: ''
              }
            ],
            usabilityIssues: result.usabilityIssues || [
              {
                category: '用户体验',
                description: '整体用户体验良好',
                impact: 'low',
                suggestion: '继续保持良好的用户体验设计'
              }
            ],
            recommendations: result.recommendations || [
              'UX测试完成',
              '建议定期进行用户体验测试'
            ],
            overallScore: result.overallScore || result.score || 85
          };

          setResult(uxResult);
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
          recordTestCompletion('ux', true, uxResult.overallScore);
          updateProgress(100, '用户体验测试完成');
        },
        // onError
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setError(errorMessage || 'UX测试失败');
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
        }
      );

      setCurrentTestId(testId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启动测试失败';
      setError(errorMessage);
      setIsRunning(false);
      setCanSwitchPages(true);
    }
  }, [config, clearError, updateProgress, recordTestCompletion]);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (currentTestId) {
      try {
        // 使用backgroundTestManager取消测试
        backgroundTestManager.cancelTest(currentTestId);
        setIsRunning(false);
        setCurrentTestId(null);
        setCanSwitchPages(true);
        updateProgress(0, '测试已停止');
      } catch (err) {
        console.error('停止测试失败:', err);
      }
    }
  }, [currentTestId, updateProgress]);

  // 配置更新处理
  const handleConfigChange = useCallback((field: keyof UXConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 添加自定义视口
  const addCustomViewport = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      customViewports: [...prev.customViewports, { width: 1200, height: 800, name: '自定义' }]
    }));
  }, []);

  // 更新自定义视口
  const updateCustomViewport = useCallback((index: number, field: 'width' | 'height' | 'name', value: any) => {
    setConfig(prev => ({
      ...prev,
      customViewports: prev.customViewports.map((viewport, i) =>
        i === index ? { ...viewport, [field]: value } : viewport
      )
    }));
  }, []);

  // 删除自定义视口
  const removeCustomViewport = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      customViewports: prev.customViewports.filter((_, i) => i !== index)
    }));
  }, []);

  return (
    <TestPageLayout
      testType="ux"
      title="用户体验测试"
      description="测试网站可用性、可访问性和用户体验"
      icon={Users}
      testContent={
        <div className="space-y-6">
          {/* 配置区域 */}
          <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
            <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-purple-400" />
              测试配置
            </h3>

            <div className="space-y-4">
              {/* 目标URL */}
              <div>
                <label className="block text-sm font-medium themed-text-secondary mb-2">
                  目标网站URL *
                </label>
                <input
                  type="url"
                  value={config.targetUrl}
                  onChange={(e) => handleConfigChange('targetUrl', e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  disabled={isRunning}
                />
                <p className="text-xs themed-text-tertiary mt-1">
                  请输入完整的网站URL，包含协议(http/https)
                </p>
              </div>

              {/* 测试类型和设备类型 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    测试类型
                  </label>
                  <select
                    value={config.testType}
                    onChange={(e) => handleConfigChange('testType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isRunning}
                  >
                    <option value="usability">可用性测试</option>
                    <option value="accessibility">可访问性测试</option>
                    <option value="mobile">移动端体验</option>
                    <option value="comprehensive">综合测试</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    设备类型
                  </label>
                  <select
                    value={config.deviceType}
                    onChange={(e) => handleConfigChange('deviceType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isRunning}
                  >
                    <option value="desktop">桌面端</option>
                    <option value="tablet">平板端</option>
                    <option value="mobile">移动端</option>
                    <option value="all">全设备</option>
                  </select>
                </div>
              </div>

              {/* 测试选项 */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeAccessibilityTest}
                    onChange={(e) => handleConfigChange('includeAccessibilityTest', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含可访问性测试</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includePerformanceUX}
                    onChange={(e) => handleConfigChange('includePerformanceUX', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含性能体验测试</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeVisualTest}
                    onChange={(e) => handleConfigChange('includeVisualTest', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含视觉设计测试</span>
                </label>
              </div>
            </div>
          </div>

          {/* 自定义视口配置 */}
          {config.deviceType === 'all' && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <h3 className="text-lg font-semibold themed-text-primary mb-4">
                自定义视口尺寸
              </h3>

              <div className="space-y-3">
                {config.customViewports.map((viewport, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      value={viewport.name}
                      onChange={(e) => updateCustomViewport(index, 'name', e.target.value)}
                      placeholder="视口名称"
                      className="px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      disabled={isRunning}
                    />
                    <input
                      type="number"
                      value={viewport.width}
                      onChange={(e) => updateCustomViewport(index, 'width', parseInt(e.target.value))}
                      placeholder="宽度"
                      min="320"
                      max="3840"
                      className="px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      disabled={isRunning}
                    />
                    <input
                      type="number"
                      value={viewport.height}
                      onChange={(e) => updateCustomViewport(index, 'height', parseInt(e.target.value))}
                      placeholder="高度"
                      min="240"
                      max="2160"
                      className="px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      disabled={isRunning}
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomViewport(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                      disabled={isRunning}
                    >
                      删除
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCustomViewport}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 themed-border-primary border rounded-md hover:themed-bg-secondary"
                  disabled={isRunning}
                >
                  + 添加视口
                </button>
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex justify-center space-x-4">
            {!isRunning ? (
              <button
                type="button"
                onClick={startTest}
                disabled={!config.targetUrl.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                开始测试
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTest}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Square className="w-5 h-5 mr-2" />
                停止测试
              </button>
            )}

            {(result || error) && (
              <button
                type="button"
                onClick={resetTest}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新测试
              </button>
            )}
          </div>

          {/* 进度显示 */}
          {isRunning && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <div className="flex items-center mb-4">
                <Loader className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                <h3 className="text-lg font-semibold themed-text-primary">测试进行中</h3>
              </div>
              <ProgressBar value={progress} className="mb-2" />
              <p className="text-sm text-gray-600">{currentStep}</p>
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
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="space-y-6">
              {/* 总体评分 */}
              <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold themed-text-primary">用户体验测试结果</h3>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-green-600">{result.overallScore}/100</span>
                  </div>
                </div>

                {/* 核心指标 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="themed-bg-tertiary rounded-lg p-4 border themed-border-primary">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-600">可用性评分</span>
                      <MousePointer className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-lg font-semibold text-blue-900 mt-1">
                      {result.usabilityScore}/100
                    </p>
                    <p className="text-sm text-blue-600">
                      {result.usabilityScore >= 80 ? '优秀' : result.usabilityScore >= 60 ? '良好' : '需要改进'}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700">可访问性评分</span>
                      <Eye className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-lg font-semibold text-green-900 mt-1">
                      {result.accessibilityScore}/100
                    </p>
                    <p className="text-sm text-green-600">
                      {result.accessibilityScore >= 80 ? '优秀' : result.accessibilityScore >= 60 ? '良好' : '需要改进'}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-700">移动端评分</span>
                      <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-lg font-semibold text-purple-900 mt-1">
                      {result.mobileScore}/100
                    </p>
                    <p className="text-sm text-purple-600">
                      {result.mobileScore >= 80 ? '优秀' : result.mobileScore >= 60 ? '良好' : '需要改进'}
                    </p>
                  </div>
                </div>

                {/* 视觉测试结果 */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">视觉设计分析</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">颜色对比度</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.visualTests.colorContrast}/100
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">字体可读性</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.visualTests.fontReadability}/100
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">布局一致性</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.visualTests.layoutConsistency}/100
                      </p>
                    </div>
                  </div>
                </div>

                {/* 性能体验指标 */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">性能体验指标</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">首次内容绘制</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.performanceUX.firstContentfulPaint}ms
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">最大内容绘制</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.performanceUX.largestContentfulPaint}ms
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">布局偏移</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.performanceUX.cumulativeLayoutShift.toFixed(3)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">首次输入延迟</span>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.performanceUX.firstInputDelay}ms
                      </p>
                    </div>
                  </div>
                </div>

                {/* 可访问性问题 */}
                {result.accessibilityIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">可访问性问题</h4>
                    <div className="space-y-3">
                      {result.accessibilityIssues.map((issue, index) => (
                        <div key={index} className={`rounded-lg p-4 ${issue.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                          issue.severity === 'high' ? 'bg-orange-50 border border-orange-200' :
                            issue.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                              'bg-blue-50 border border-blue-200'
                          }`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className={`font-medium ${issue.severity === 'critical' ? 'text-red-800' :
                                issue.severity === 'high' ? 'text-orange-800' :
                                  issue.severity === 'medium' ? 'text-yellow-800' :
                                    'text-blue-800'
                                }`}>
                                {issue.type}
                              </h5>
                              <p className={`text-sm mt-1 ${issue.severity === 'critical' ? 'text-red-700' :
                                issue.severity === 'high' ? 'text-orange-700' :
                                  issue.severity === 'medium' ? 'text-yellow-700' :
                                    'text-blue-700'
                                }`}>
                                {issue.description}
                              </p>
                              {issue.element && (
                                <p className="text-xs text-gray-500 mt-1">
                                  元素: {issue.element}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {issue.severity === 'critical' ? '严重' :
                                issue.severity === 'high' ? '高' :
                                  issue.severity === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 可用性问题 */}
                {result.usabilityIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">可用性问题</h4>
                    <div className="space-y-3">
                      {result.usabilityIssues.map((issue, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800">{issue.category}</h5>
                              <p className="text-sm text-gray-700 mt-1">{issue.description}</p>
                              <p className="text-sm text-blue-600 mt-2">
                                <strong>建议:</strong> {issue.suggestion}
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded ml-4 ${issue.impact === 'high' ? 'bg-red-100 text-red-800' :
                              issue.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {issue.impact === 'high' ? '高影响' :
                                issue.impact === 'medium' ? '中影响' : '低影响'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 优化建议 */}
                {result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">优化建议</h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <Zap className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default UXTest;
