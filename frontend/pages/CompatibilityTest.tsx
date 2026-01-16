/**
 * CompatibilityTest.tsx - 兼容性测试页面
 */

import Logger from '@/utils/logger';
import { AlertCircle, CheckCircle, Monitor, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import CompatibilityTestHistory from '../components/compatibility/CompatibilityTestHistory';
import TestPageLayout from '../components/testing/TestPageLayout';
import { URLInput } from '../components/ui';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useCompatibilityTestState } from '../hooks/useCompatibilityTestState';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';
import type { TestInfo } from '../services/backgroundTestManager';
import backgroundTestManager from '../services/backgroundTestManager';

const CompatibilityTest: React.FC = () => {
  const { isAuthenticated, requireLogin, LoginPromptComponent } = useAuthCheck({
    feature: '兼容性测试',
    description: '使用兼容性测试功能',
  });
  const { recordTestCompletion } = useUserStats();

  const {
    config,
    updateConfig,
    isRunning,
    progress,
    currentStep,
    result,
    error,
    startTest,
    stopTest,
    validateConfig,
    loadPreset,
  } = useCompatibilityTestState();

  const [testStatus, setTestStatus] = useState<
    'idle' | 'starting' | 'running' | 'completed' | 'failed'
  >('idle');
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useTestProgress(currentTestId || undefined, {
    onProgress: progressData => {
      setStatusMessage(progressData.message);
      setTestStatus('running');
    },
    onComplete: resultData => {
      setTestStatus('completed');
      setStatusMessage('兼容性测试完成');
      recordTestCompletion(
        '兼容性测试',
        true,
        resultData?.overallScore || 0,
        resultData?.duration || 30
      );
    },
    onError: errorMessage => {
      setTestStatus('failed');
      setStatusMessage(errorMessage);
    },
  });

  useEffect(() => {
    const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: TestInfo) => {
      if (testInfo.type === 'compatibility' && testInfo.id === currentTestId) {
        switch (event) {
          case 'testProgress':
            setStatusMessage(testInfo.currentStep || '测试进行中');
            setTestStatus('running');
            break;
          case 'testCompleted':
            setTestStatus('completed');
            setStatusMessage('兼容性测试完成');
            setCurrentTestId(null);
            if (testInfo.result) {
              recordTestCompletion(
                '兼容性测试',
                testInfo.result.success !== false,
                testInfo.result.overallScore || testInfo.result.score || 0,
                testInfo.result.duration || 30
              );
            }
            break;
          case 'testFailed':
            setTestStatus('failed');
            setStatusMessage(testInfo.error || '测试失败');
            setCurrentTestId(null);
            break;
          case 'testCancelled':
            setTestStatus('idle');
            setStatusMessage('');
            setCurrentTestId(null);
            break;
        }
      }
    });

    const runningTests = backgroundTestManager.getRunningTests();
    const compatibilityTest = runningTests.find(test => test.type === 'compatibility');
    if (compatibilityTest) {
      setCurrentTestId(compatibilityTest.id);
      setTestStatus('running');
      setStatusMessage(compatibilityTest.currentStep || '测试进行中');
    }

    return unsubscribe;
  }, [currentTestId, recordTestCompletion]);

  useEffect(() => {
    if (!isRunning && testStatus === 'running') {
      if (result) {
        setTestStatus('completed');
      } else if (error) {
        setTestStatus('failed');
      } else {
        setTestStatus('idle');
      }
    }
  }, [isRunning, testStatus, result, error]);

  const validation = validateConfig();
  const isConfigValid = validation.isValid;

  const summaryStats = useMemo(() => {
    if (!result) return null;
    return {
      overallScore: result.overallScore || 0,
      summary: result.summary || '兼容性测试完成',
      browserCount: result.browserResults?.length || 0,
      deviceCount: result.deviceResults?.length || 0,
    };
  }, [result]);

  const handleStartTest = async () => {
    if (!requireLogin()) return;
    if (!isConfigValid) {
      setStatusMessage(validation.errors.join('; '));
      return;
    }

    try {
      setTestStatus('starting');
      setStatusMessage('正在启动兼容性测试...');
      await startTest();
      setTestStatus('running');
    } catch (err) {
      Logger.error('兼容性测试启动失败:', err as Error);
      setTestStatus('failed');
      setStatusMessage(err instanceof Error ? err.message : '兼容性测试启动失败');
    }
  };

  const handleStopTest = () => {
    if (currentTestId) {
      backgroundTestManager.cancelTest(currentTestId);
    }
    stopTest();
    setTestStatus('idle');
    setStatusMessage('');
  };

  return (
    <TestPageLayout
      testType="compatibility"
      title="兼容性测试"
      description="检测网站在主流浏览器与设备上的显示一致性"
      icon={Monitor}
      testStatus={testStatus === 'starting' ? 'running' : testStatus}
      isTestDisabled={!isConfigValid}
      onStartTest={handleStartTest}
      onStopTest={handleStopTest}
      testContent={
        <div className="space-y-6">
          {!isAuthenticated && <>{LoginPromptComponent}</>}

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">测试配置</h3>
                <p className="text-sm text-gray-400">选择浏览器、设备与测试维度</p>
              </div>
              <div className="flex items-center gap-2">
                {(['modern', 'legacy', 'mobile', 'desktop'] as const).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    disabled={isRunning}
                    className="px-3 py-1 text-xs rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700/60 disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">测试URL</label>
                <URLInput
                  value={config.url}
                  onChange={e => updateConfig({ url: e.target.value })}
                  placeholder="https://example.com"
                  disabled={isRunning}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-4">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">浏览器</h4>
                  <div className="space-y-2">
                    {config.browsers.map(browser => (
                      <label
                        key={browser.name}
                        className="flex items-center justify-between text-sm text-gray-300"
                      >
                        <span>{browser.name}</span>
                        <input
                          type="checkbox"
                          checked={browser.enabled}
                          disabled={isRunning}
                          onChange={() =>
                            updateConfig({
                              browsers: config.browsers.map(item =>
                                item.name === browser.name
                                  ? { ...item, enabled: !item.enabled }
                                  : item
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-4">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">设备</h4>
                  <div className="space-y-2">
                    {config.devices.map(device => (
                      <label
                        key={device.name}
                        className="flex items-center justify-between text-sm text-gray-300"
                      >
                        <span>{device.name}</span>
                        <input
                          type="checkbox"
                          checked={device.enabled}
                          disabled={isRunning}
                          onChange={() =>
                            updateConfig({
                              devices: config.devices.map(item =>
                                item.name === device.name
                                  ? { ...item, enabled: !item.enabled }
                                  : item
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-700/60 bg-gray-900/40 p-4">
                  <h4 className="text-sm font-medium text-gray-200 mb-3">测试选项</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <label className="flex items-center justify-between">
                      <span>包含辅助功能</span>
                      <input
                        type="checkbox"
                        checked={config.includeAccessibility ?? false}
                        disabled={isRunning}
                        onChange={e => updateConfig({ includeAccessibility: e.target.checked })}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>包含性能检查</span>
                      <input
                        type="checkbox"
                        checked={config.includePerformance ?? false}
                        disabled={isRunning}
                        onChange={e => updateConfig({ includePerformance: e.target.checked })}
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>生成截图</span>
                      <input
                        type="checkbox"
                        checked={config.includeScreenshots ?? false}
                        disabled={isRunning}
                        onChange={e => updateConfig({ includeScreenshots: e.target.checked })}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {!isConfigValid && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{validation.errors.join('；')}</span>
                </div>
              )}
            </div>
          </div>

          {(isRunning || progress > 0) && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-white">测试进度</h3>
                <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} />
              <div className="mt-3 text-sm text-gray-300">
                {currentStep || statusMessage || '准备就绪'}
              </div>
            </div>
          )}

          {(error || statusMessage) && testStatus === 'failed' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>{error || statusMessage}</span>
              </div>
            </div>
          )}

          {summaryStats && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">测试结果</h3>
                  <p className="text-sm text-gray-400">{summaryStats.summary}</p>
                </div>
                <div className="flex items-center gap-2 text-green-300">
                  <CheckCircle className="w-5 h-5" />
                  <span>{summaryStats.overallScore} 分</span>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-gray-300">
                <div className="rounded-lg bg-gray-900/40 p-3">
                  浏览器测试: {summaryStats.browserCount}
                </div>
                <div className="rounded-lg bg-gray-900/40 p-3">
                  设备测试: {summaryStats.deviceCount}
                </div>
                <div className="rounded-lg bg-gray-900/40 p-3">状态: {testStatus}</div>
              </div>
            </div>
          )}
        </div>
      }
      additionalComponents={<CompatibilityTestHistory className="mt-6" />}
    />
  );
};

export default CompatibilityTest;
