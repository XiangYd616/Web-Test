/**
 * 优化测试页面
 * 展示和测试所有的性能优化和用户体验改进
 */

import { AlertCircle, BarChart3, CheckCircle, Clock, Play, Users, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';
import React, { useEffect, useState } from 'react';
import { useLoadingState } from '../../../components/ui/LoadingStates.tsx';
import { Tooltip, useSmartNotification } from '../../../components/ui/UX.tsx';
import { usePerformanceOptimization } from '../../../hooks/usePerformanceOptimization.ts';
import { createTestRunner, PerformanceTestResult, TestResult, UXTestResult } from '../../../utils/testUtils.ts';

interface TestResults {
  performance: PerformanceTestResult[];
  ux: UXTestResult[];
  api: TestResult[];
  summary: any;
}

const TestOptimizations: React.FC = () => {
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  
  const runTest = async (config) => {
    setIsRunning(true);
    const result = await executeAsync(
      () => fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'performance', config })
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }
    );
    
    if (result && result.success) {
      setTestResult(result.data);
      // 轮询获取测试结果
      pollTestResult(result.data.executionId);
    }
    setIsRunning(false);
  };
  
  const pollTestResult = async (executionId) => {
    const interval = setInterval(async () => {
      const result = await executeAsync(
        () => fetch(`/api/tests/results/${executionId}`).then(res => res.json()),
        { context: 'TestExecution.pollResult' }
      );
      
      if (result && result.success && result.data.status === 'completed') {
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };
  const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'performance' | 'ux' | 'api'>('performance');

  const { metrics, measureRenderTime, getOptimizationSuggestions, applyOptimizations } = usePerformanceOptimization();
  const { success: showSuccess, error: showError, info: showInfo } = useSmartNotification();
  const loadingState = useLoadingState();

  useEffect(() => {
    // 测量页面渲染时间
    const renderMeasure = measureRenderTime('TestOptimizations');
    renderMeasure.start();

    // 模拟组件渲染完成
    setTimeout(() => {
      renderMeasure.end();
    }, 100);
  }, [measureRenderTime]);

  /**
   * 运行完整测试套件
   */
  const runTestSuite = async () => {
    setIsRunningTests(true);
    loadingState.startLoading('正在运行测试套件...');

    try {
      const testRunner = createTestRunner();
      const results = await testRunner.runFullTestSuite();

      setTestResults(results);
      loadingState.finishLoading();

      showSuccess(
        `测试套件完成 - 性能测试: ${results.summary.performance.passed}/${results.summary.performance.total} 通过`
      );
    } catch (error) {
      loadingState.setLoadingError('测试失败');
      showError(error instanceof Error ? error.message : '测试失败');
    } finally {
      setIsRunningTests(false);
    }
  };

  /**
   * 应用性能优化
   */
  const handleApplyOptimizations = () => {
    applyOptimizations();
    showInfo('性能优化已应用，页面将自动刷新');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  /**
   * 渲染性能指标卡片
   */
  const renderMetricCard = (title: string, value: number, unit: string, threshold: number, icon: React.ReactNode) => {
    const isGood = value <= threshold;
    const percentage = Math.min((value / threshold) * 100, 100);

    
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              操作失败
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${isGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {icon}
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <Tooltip content={`阈值: ${threshold}${unit}`}>
            <div className={`px-2 py-1 rounded text-xs font-medium ${isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {isGood ? '良好' : '需优化'}
            </div>
          </Tooltip>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {value.toFixed(1)}
            </span>
            <span className="ml-1 text-sm text-gray-500">
              {unit}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${isGood ? 'bg-green-500' : 'bg-red-500'
                }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            {percentage.toFixed(1)}% of threshold
          </p>
        </div>
      </div>
    );
  };

  /**
   * 渲染测试结果表格
   */
  const renderTestResults = () => {
    if (!testResults) return null;

    const currentResults = testResults[selectedTab];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            测试结果
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  测试项
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  结果
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentResults.map((result: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {result.name || result.metric || result.component}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {result.value !== undefined ? `${result.value.toFixed(2)} ${result.unit || 'ms'}` :
                      result.duration !== undefined ? `${result.duration.toFixed(2)} ms` :
                        result.responseTime !== undefined ? `${result.responseTime.toFixed(2)} ms` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {result.threshold && `阈值: ${result.threshold} ${result.unit || 'ms'}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {result.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      )}
                      <span className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.passed ? '通过' : '失败'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            性能优化测试
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            测试和验证前端性能优化、用户体验改进和API响应性能
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={runTestSuite}
            disabled={isRunningTests}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunningTests ? '运行中...' : '运行测试套件'}
          </button>

          <button
            onClick={handleApplyOptimizations}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            应用优化
          </button>
        </div>

        {/* 加载状态 */}
        {loadingState.isLoading && (
          <div className="mb-8">
            <LoadingStates
              state="loading"
              message={loadingState.stage}
              progress={loadingState.progress}
              showProgress={true}
            />
          </div>
        )}

        {/* 性能指标概览 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            实时性能指标
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderMetricCard('加载时间', metrics.loadTime, 'ms', 3000, <Clock className="w-5 h-5" />)}
            {renderMetricCard('渲染时间', metrics.renderTime, 'ms', 1000, <BarChart3 className="w-5 h-5" />)}
            {renderMetricCard('内存使用', metrics.memoryUsage, 'MB', 50, <Users className="w-5 h-5" />)}
            {renderMetricCard('包大小', metrics.bundleSize, 'KB', 1000, <Zap className="w-5 h-5" />)}
          </div>
        </div>

        {/* 优化建议 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            优化建议
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {getOptimizationSuggestions().length > 0 ? (
              <ul className="space-y-2">
                {getOptimizationSuggestions().map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {suggestion}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  所有性能指标都在良好范围内
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        {testResults && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              详细测试结果
            </h2>

            {/* 标签页 */}
            <div className="mb-4">
              <nav className="flex space-x-8">
                {[
                  { key: 'performance', label: '性能测试', icon: BarChart3 },
                  { key: 'ux', label: '用户体验', icon: Users },
                  { key: 'api', label: 'API测试', icon: Zap }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTab(key as any)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg ${selectedTab === key
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {renderTestResults()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestOptimizations;
