/**
 * 统一测试页面
 * 整合配置、进度、结果展示的完整测试流程
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';
import { useParams, useNavigate } from 'react-router-dom';
import { TestConfig, TestResult, TestProgress, TestType, TestStatus, TestError } from '../../../types/testConfig';
import { TestService } from '../../../services/unifiedTestService';
import { TestConfigPanel } from '../../../components/testing/TestConfigPanel';
import { RealTimeTestProgress } from '../../../components/testing/TestProgress';
import { TestResultsPanel } from '../../../components/testing/TestResultsPanel';

interface TestPageProps {
  testType?: TestType;
}

export const TestPage: React.FC<TestPageProps> = ({ testType: propTestType }) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  const { testType: paramTestType } = useParams<{ testType: string }>();
  const navigate = useNavigate();
  
  const testType = propTestType || (paramTestType as TestType);
  
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [isConfigValid, setIsConfigValid] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testService] = useState(() => new TestService());

  // 页面状态
  const [currentStep, setCurrentStep] = useState<'config' | 'running' | 'results'>('config');

  // 清理资源
  useEffect(() => {
    
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

  return () => {
      testService.cleanup();
    };
  }, [testService]);

  // 处理配置变化
  const handleConfigChange = useCallback((newConfig: TestConfig) => {
    setConfig(newConfig);
  }, []);

  // 处理配置验证
  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setIsConfigValid(isValid);
    setConfigErrors(errors);
  }, []);

  // 开始测试
  const handleStartTest = async () => {
  
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
    if (!config || !isConfigValid) {
      
        setError('请先完成有效的测试配置');
      return;
      }

    setIsLoading(true);
    setError(null);
    setTestResult(null);
    setCurrentStep('running');

    try {
      const { testId } = await testService.startTestWithRealTimeUpdates(
        testType,
        config,
        handleProgressUpdate,
        handleTestComplete,
        handleTestError
      );

      setCurrentTestId(testId);
      setTestProgress({
        testId,
        status: TestStatus.RUNNING,
        progress: 0,
        message: '正在初始化测试...'
      });
    } catch (error) {
      handleTestError(error as TestError);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理进度更新
  const handleProgressUpdate = useCallback((progress: TestProgress) => {
    setTestProgress(progress);
  }, []);

  // 处理测试完成
  const handleTestComplete = useCallback((result: TestResult) => {
    setTestResult(result);
    setCurrentStep('results');
    setTestProgress(prev => prev ? { ...prev, status: TestStatus.COMPLETED, progress: 100 } : null);
  }, []);

  // 处理测试错误
  const handleTestError = useCallback((error: TestError) => {
    setError(error.message);
    setCurrentStep('config');
    setTestProgress(prev => prev ? { ...prev, status: TestStatus.FAILED } : null);
    setIsLoading(false);
  }, []);

  // 取消测试
  const handleCancelTest = async () => {
    if (currentTestId) {
      try {
        await testService.stopTest(testType, currentTestId);
        setCurrentStep('config');
        setTestProgress(null);
        setCurrentTestId(null);
      } catch (error) {
        console.error('取消测试失败:', error);
      }
    }
  };

  // 重新测试
  const handleRetryTest = () => {
    setCurrentStep('config');
    setTestResult(null);
    setTestProgress(null);
    setCurrentTestId(null);
    setError(null);
  };

  // 导出报告
  const handleExportReport = async (format: 'pdf' | 'html' | 'json') => {
    if (!testResult) return;

    try {
      const blob = await testService.exportReport(testResult.testId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-report-${testResult.testId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出报告失败:', error);
      setError('导出报告失败，请稍后重试');
    }
  };

  // 对比历史结果
  const handleCompareResults = () => {
    navigate(`/testing/${testType}/history`);
  };

  // 保存为模板
  const handleSaveTemplate = async () => {
    if (!config || !testResult) return;

    const templateName = prompt('请输入模板名称:');
    if (!templateName) return;

    const description = prompt('请输入模板描述:') || '';

    try {
      await testService.saveTestTemplate(testType, templateName, config, description);
      alert('模板保存成功！');
    } catch (error) {
      console.error('保存模板失败:', error);
      setError('保存模板失败，请稍后重试');
    }
  };

  const getTestTypeLabel = (testType: TestType): string => {
    const labels = {
      [TestType.API]: 'API测试',
      [TestType.PERFORMANCE]: '性能测试',
      [TestType.SECURITY]: '安全测试',
      [TestType.SEO]: 'SEO测试',
      [TestType.STRESS]: '压力测试',
      [TestType.INFRASTRUCTURE]: '基础设施测试',
      [TestType.UX]: 'UX测试',
      [TestType.COMPATIBILITY]: '兼容性测试',
      [TestType.WEBSITE]: '网站综合测试'
    };
    return labels[testType];
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { key: 'config', label: '配置测试', icon: '⚙️' },
          { key: 'running', label: '执行测试', icon: '🔄' },
          { key: 'results', label: '查看结果', icon: '📊' }
        ].map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center space-x-2 ${
              currentStep === step.key ? 'text-blue-600' : 
              ['config', 'running', 'results'].indexOf(currentStep) > index ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === step.key ? 'border-blue-600 bg-blue-50' :
                ['config', 'running', 'results'].indexOf(currentStep) > index ? 'border-green-600 bg-green-50' : 'border-gray-300'
              }`}>
                <span className="text-sm">{step.icon}</span>
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </div>
            {index < 2 && (
              <div className={`w-8 h-0.5 ${
                ['config', 'running', 'results'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面头部 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getTestTypeLabel(testType)}
          </h1>
          <p className="text-lg text-gray-600">
            配置并执行{getTestTypeLabel(testType).toLowerCase()}，获取详细的分析报告
          </p>
        </div>

        {/* 步骤指示器 */}
        {renderStepIndicator()}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">测试错误</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 主要内容区域 */}
        <div className="space-y-6">
          {/* 配置阶段 */}
          {currentStep === 'config' && (
            <div className="space-y-6">
              <TestConfigPanel
                testType={testType}
                initialConfig={config || undefined}
                onConfigChange={handleConfigChange}
                onValidationChange={handleValidationChange}
              />

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate('/testing')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  返回
                </button>
                <button
                  onClick={handleStartTest}
                  disabled={!isConfigValid || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '启动中...' : '开始测试'}
                </button>
              </div>
            </div>
          )}

          {/* 执行阶段 */}
          {currentStep === 'running' && testProgress && (
            <RealTimeTestProgress
              testId={testProgress.testId}
              testType={testType}
              initialProgress={testProgress}
              onProgressUpdate={handleProgressUpdate}
              onComplete={handleTestComplete}
              onError={handleTestError}
              onCancel={handleCancelTest}
            />
          )}

          {/* 结果阶段 */}
          {currentStep === 'results' && testResult && (
            <div className="space-y-6">
              <TestResultsPanel
                testType={testType}
                result={testResult}
                onExport={handleExportReport}
                onCompare={handleCompareResults}
                onSaveTemplate={handleSaveTemplate}
              />

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleRetryTest}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  重新测试
                </button>
                <button
                  onClick={() => navigate('/testing')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  返回首页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPage;
