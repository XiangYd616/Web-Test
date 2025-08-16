import React, { useState, useEffect } from 'react';
import {TestHistoryPanel} from './TestHistoryPanel';
import {TestConfigPanel} from './TestConfigPanel';
import {TestResultsPanel} from './TestResultsPanel';
import {TestProgressPanel} from './TestProgressPanel';
import {testService} from '../../services/testService';
import {configService} from '../../services/configService';

interface TestPageTemplateProps {
  testType: string;
  testName: string;
  children?: React.ReactNode;
  customConfigPanel?: React.ReactNode;
  customResultsPanel?: React.ReactNode;
  onTestStart?: (config: any) => Promise<string>;
  onTestStop?: (testId: string) => Promise<void>;
  className?: string;
}

export const TestPageTemplate: React.FC<TestPageTemplateProps> = ({
  testType,
  testName,
  children,
  customConfigPanel,
  customResultsPanel,
  onTestStart,
  onTestStop,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'progress' | 'results' | 'history'>('config');
  const [testConfig, setTestConfig] = useState<any>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [testProgress, setTestProgress] = useState<any>({
    current: 0,
    total: 100,
    percentage: 0,
    stage: '准备中...',
    message: '等待开始测试'
  });
  const [testResults, setTestResults] = useState<any>(null);
  const [testError, setTestError] = useState<string>('');
  const [currentTestId, setCurrentTestId] = useState<string>('');

  // 加载默认配置
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        const defaultConfig = configService.getDefaultConfig(testType);
        setTestConfig(defaultConfig);
      } catch (error) {
        console.error('加载默认配置失败:', error);
      }
    };

    loadDefaultConfig();
  }, [testType]);

  // 处理测试开始
  const handleTestStart = async () => {
    if (!onTestStart) return;

    try {
      setTestStatus('running');
      setTestError('');
      setTestResults(null);
      setActiveTab('progress');

      const testId = await onTestStart(testConfig);
      setCurrentTestId(testId);

      // 注册进度和结果回调
      testService.onProgress(testId, (progress) => {
        setTestProgress(progress);
      });

      testService.onResult(testId, (result) => {
        setTestStatus(result.status as any);
        setTestResults(result.results);
        if (result.error) {
          setTestError(result.error);
        }
        if (result.status === 'completed') {
          setActiveTab('results');
        }
      });

    } catch (error) {
      setTestStatus('failed');
      setTestError(error.message);
      console.error('测试启动失败:', error);
    }
  };

  // 处理测试停止
  const handleTestStop = async () => {
    if (!onTestStop || !currentTestId) return;

    try {
      await onTestStop(currentTestId);
      setTestStatus('cancelled');
    } catch (error) {
      console.error('停止测试失败:', error);
    }
  };

  // 处理配置变更
  const handleConfigChange = (newConfig: any) => {
    setTestConfig(newConfig);
  };

  // 处理配置保存
  const handleConfigSave = async (config: any) => {
    try {
      await configService.saveConfigTemplate({
        name: `${testName}自定义配置`,
        testType,
        config,
        description: `${testName}的自定义配置模板`
      });
      console.log('配置保存成功');
    } catch (error) {
      console.error('配置保存失败:', error);
    }
  };

  // 处理历史记录选择
  const handleHistorySelect = (test: any) => {
    setTestResults(test.results);
    setActiveTab('results');
  };

  // 处理历史记录重运行
  const handleHistoryRerun = async (test: any) => {
    setTestConfig(test.config);
    setActiveTab('config');
    // 可以自动开始测试
    // await handleTestStart();
  };

  // 处理结果导出
  const handleResultsExport = () => {
    if (!testResults) return;

    const dataStr = JSON.stringify(testResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${testType}-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // 处理结果分享
  const handleResultsShare = async () => {
    if (!testResults) return;

    try {
      const shareData = {
        title: `${testName}测试结果`,
        text: `查看我的${testName}测试结果`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 复制到剪贴板
        await navigator.clipboard.writeText(window.location.href);
        console.log('链接已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {testName}
              </h1>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {testType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['config', 'progress', 'results', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'config' ? '配置' :
                 tab === 'progress' ? '进度' :
                 tab === 'results' ? '结果' : '历史'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要面板区域 */}
          <div className="lg:col-span-2">
            {activeTab === 'config' && (
              <div className="space-y-6">
                {customConfigPanel || (
                  <TestConfigPanel
                    testType={testType}
                    config={testConfig}
                    onConfigChange={handleConfigChange}
                    onSaveConfig={handleConfigSave}
                    disabled={testStatus === 'running'}
                  />
                )}
                {children}
              </div>
            )}

            {activeTab === 'progress' && (
              <TestProgressPanel
                testType={testType}
                status={testStatus}
                progress={testProgress}
                onStart={handleTestStart}
                onStop={handleTestStop}
                disabled={false}
              />
            )}

            {activeTab === 'results' && (
              <div>
                {customResultsPanel || (
                  <TestResultsPanel
                    testType={testType}
                    results={testResults}
                    loading={testStatus === 'running'}
                    error={testError}
                    onExport={handleResultsExport}
                    onShare={handleResultsShare}
                    onRetest={handleTestStart}
                  />
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <TestHistoryPanel
                testType={testType}
                onTestSelect={handleHistorySelect}
                onTestRerun={handleHistoryRerun}
              />
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 快速操作 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                快速操作
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleTestStart}
                  disabled={testStatus === 'running'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testStatus === 'running' ? '测试进行中...' : '开始测试'}
                </button>

                {testStatus === 'running' && (
                  <button
                    onClick={handleTestStop}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    停止测试
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('history')}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  查看历史
                </button>
              </div>
            </div>

            {/* 测试状态 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                测试状态
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">状态:</span>
                  <span className={`text-sm font-medium ${
                    testStatus === 'running' ? 'text-blue-600' :
                    testStatus === 'completed' ? 'text-green-600' :
                    testStatus === 'failed' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {testStatus === 'idle' ? '准备就绪' :
                     testStatus === 'running' ? '运行中' :
                     testStatus === 'completed' ? '已完成' :
                     testStatus === 'failed' ? '失败' : '已取消'}
                  </span>
                </div>

                {testStatus === 'running' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">进度:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {testProgress.percentage}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPageTemplate;
