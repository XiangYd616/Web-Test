/**
 * 性能测试页面
 * 提供性能和可访问性测试功能
 */

import React, { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';
import { Button } from '../../../components/ui/Button';
import { LoadingStates } from '../../../components/ui/LoadingStates';
import { TestConfig } from '../../../components/testing/TestConfig';
import { TestResults } from '../../../components/testing/TestResults';
import { useTestExecution } from '../../../hooks/useTestRunner';
import { useTestHistory } from '../../../hooks/useTestData';

interface PerformanceTestConfig {
  url: string;
  device: 'desktop' | 'mobile';
  categories: string[];
  timeout: number;
  retries: number;
  advanced: {
    throttling?: 'none' | '3g' | '4g';
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
    wcagTags?: string[];
    includeAccessibility?: boolean;
  };
}

interface PerformanceTestResult {
  testId: string;
  url: string;
  timestamp: number;
  overallScore: number;
  performanceScore: number;
  accessibilityScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  coreWebVitals: {
    lcp: { value: number; rating: string };
    fid: { value: number; rating: string };
    cls: { value: number; rating: string };
    fcp: { value: number; rating: string };
    ttfb: { value: number; rating: string };
  };
  performance: {
    lighthouse: any;
    opportunities: Array<{
      title: string;
      description: string;
      savings: number;
      impact: string;
    }>;
    diagnostics: Array<{
      title: string;
      description: string;
      value: string;
    }>;
  };
  accessibility: {
    violations: Array<{
      id: string;
      title: string;
      description: string;
      impact: string;
      nodes: number;
    }>;
    passes: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    summary: {
      totalViolations: number;
      complianceLevel: string;
    };
  };
  recommendations: string[];
  duration: number;
}

const PerformanceTest: React.FC = () => {
  
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
  const [config, setConfig] = useState<PerformanceTestConfig>({
    url: '',
    device: 'desktop',
    categories: ['performance', 'accessibility', 'best-practices', 'seo'],
    timeout: 180000, // 3分钟
    retries: 1,
    advanced: {
      throttling: '4g',
      includeAccessibility: true,
      wcagTags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    }
  });

  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'history'>('config');

  const {
    isRunning,
    progress,
    result,
    error,
    startTest,
    cancelTest,
    clearResult
  } = useTestExecution<PerformanceTestResult>('performance');

  const {
    history,
    loading: historyLoading,
    loadHistory,
    deleteHistoryItem
  } = useTestHistory('performance');

  useEffect(() => {
    loadHistory();
  }, []);

  const handleConfigChange = (newConfig: Partial<PerformanceTestConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleStartTest = async () => {
    if (!config.url) {
      
        alert('请输入测试URL');
      return;
      }

    try {
      await startTest(config);
      setActiveTab('results');
    } catch (err) {
      console.error('启动性能测试失败:', err);
    }
  };

  const handleRetryTest = () => {
    clearResult();
    handleStartTest();
  };

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          性能测试配置
        </h3>

        {/* 基础配置 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              测试URL *
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => handleConfigChange({ url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                设备类型
              </label>
              <select
                value={config.device}
                onChange={(e) => handleConfigChange({ device: e.target.value as 'desktop' | 'mobile' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desktop">桌面端</option>
                <option value="mobile">移动端</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                网络限制
              </label>
              <select
                value={config.advanced.throttling}
                onChange={(e) => handleConfigChange({ 
                  advanced: { ...config.advanced, throttling: e.target.value as any }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">无限制</option>
                <option value="4g">4G网络</option>
                <option value="3g">3G网络</option>
              </select>
            </div>
          </div>

          {/* 测试类别 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              测试类别
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'performance', label: '性能' },
                { key: 'accessibility', label: '可访问性' },
                { key: 'best-practices', label: '最佳实践' },
                { key: 'seo', label: 'SEO' }
              ].map(category => (
                <label key={category.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.categories.includes(category.key)}
                    onChange={(e) => {
                      const newCategories = e.target.checked
                        ? [...config.categories, category.key]
                        : config.categories.filter(c => c !== category.key);
                      handleConfigChange({ categories: newCategories });
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 可访问性选项 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.advanced.includeAccessibility}
                onChange={(e) => handleConfigChange({
                  advanced: { ...config.advanced, includeAccessibility: e.target.checked }
                })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                包含详细可访问性测试
              </span>
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setConfig({
              url: '',
              device: 'desktop',
              categories: ['performance', 'accessibility', 'best-practices', 'seo'],
              timeout: 180000,
              retries: 1,
              advanced: {
                throttling: '4g',
                includeAccessibility: true,
                wcagTags: ['wcag2a', 'wcag2aa', 'wcag21aa']
              }
            })}
            disabled={isRunning}
          >
            重置
          </Button>
          
          <Button
            variant="primary"
            onClick={handleStartTest}
            disabled={!config.url || isRunning}
            loading={isRunning}
          >
            {isRunning ? '测试中...' : '开始测试'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (isRunning) {
      
        
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <LoadingStates
              type="progress"
              progress={progress
      }
              message="正在执行性能测试，请稍候..."
            />
            <div className="mt-4">
              <Button variant="secondary" onClick={cancelTest}>
                取消测试
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      
        return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <h3 className="text-lg font-semibold mb-2">测试失败</h3>
            <p className="mb-4">{error
      }</p>
            <Button variant="primary" onClick={handleRetryTest}>
              重新测试
            </Button>
          </div>
        </div>
      );
    }

    if (result) {
      
        return (
        <TestResults
          result={{
            id: result.testId,
            testType: '性能测试',
            url: result.url,
            status: result.overallScore >= 90 ? 'success' : result.overallScore >= 70 ? 'warning' : 'failed',
            score: result.overallScore,
            startTime: new Date(result.timestamp).toISOString(),
            endTime: new Date(result.timestamp + result.duration).toISOString(),
            duration: result.duration,
            summary: {
              total: (result.performance?.opportunities?.length || 0) + (result.accessibility?.violations?.length || 0),
              passed: result.accessibility?.passes?.length || 0,
              failed: result.accessibility?.violations?.length || 0,
              warnings: result.performance?.opportunities?.length || 0
      },
            details: [
              ...(result.performance?.opportunities?.map(opp => ({
                category: '性能优化',
                name: opp.title,
                status: 'warning' as const,
                description: opp.description,
                value: `${(opp.savings / 1000).toFixed(2)}秒`,
                impact: opp.impact
              })) || []),
              ...(result.accessibility?.violations?.map(violation => ({
                category: '可访问性',
                name: violation.title,
                status: 'fail' as const,
                description: violation.description,
                value: `${violation.nodes}个节点`,
                impact: violation.impact
              })) || [])
            ],
            recommendations: result.recommendations
          }}
          onRetry={handleRetryTest}
          onDownload={() => {
            const dataStr = JSON.stringify(result, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `performance-test-${result.testId}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
        />
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          配置测试参数并点击"开始测试"来执行性能测试
        </p>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        测试历史
      </h3>
      
      {historyLoading ? (
        <LoadingStates message="加载历史记录..." />
      ) : history.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          暂无测试历史记录
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.url}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(item.timestamp).toLocaleString()} • 评分: {item.score}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setConfig(prev => ({ ...prev, url: item.url }));
                      setActiveTab('config');
                    }}
                  >
                    重新测试
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => deleteHistoryItem(item.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="performance-test-page max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          性能测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          使用Lighthouse和专业工具进行网站性能和可访问性测试
        </p>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'config', label: '测试配置' },
            { key: 'results', label: '测试结果' },
            { key: 'history', label: '历史记录' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div>
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'results' && renderResults()}
        {activeTab === 'history' && renderHistory()}
      </div>
    </div>
  );
};

export default PerformanceTest;
