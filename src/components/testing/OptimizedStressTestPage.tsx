/**
 * 优化的压力测试页面组件
 * 集成所有优化组件的完整示例
 */

import React, { useState } from 'react';
import { useOptimizedStressTest } from '../../hooks/useOptimizedStressTest';
import { useUserStats } from '../../hooks/useUserStats';
import { TestState, type TestConfig } from '../../services/TestStateManager';
import { useAuthCheck } from '../auth/withAuthCheck';
import { OptimizedStressTestChart } from '../charts/OptimizedStressTestChart';
import { URLInput } from './index';
import { OptimizedTestControls } from './OptimizedTestControls';
import { TestPageLayout } from './UnifiedTestingComponents';

/**
 * 优化的压力测试页面组件
 */
export const OptimizedStressTestPage: React.FC = () => {
  // 认证检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "压力测试",
    description: "使用压力测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 测试配置
  const [testConfig, setTestConfig] = useState<TestConfig>({
    url: '',
    users: 10,
    duration: 30,
    rampUp: 5,
    testType: 'gradual',
    method: 'GET',
    timeout: 10,
    thinkTime: 1,
  });

  // 使用优化的压力测试Hook
  const {
    testState,
    testPhase,
    testConfig: currentTestConfig,
    metrics,
    dataPoints,
    error,
    progress,
    duration,
    startTest,
    stopTest,
    resetTest,
    getLatestDataPoints,
    getCurrentDataSource,
    isConnected
  } = useOptimizedStressTest({
    enableWebSocket: true,
    enableAPIPolling: true,
    pollingInterval: 2000,
    maxDataPoints: 1000,
    autoReconnect: true
  });

  // 标签页状态
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');

  // 处理开始测试
  const handleStartTest = async () => {
    if (!requireLogin()) {
      return;
    }

    if (!testConfig.url.trim()) {
      alert('请输入测试 URL');
      return;
    }

    try {
      // 发送测试请求到后端
      const response = await fetch('/api/test/stress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify({
          url: testConfig.url.trim(),
          options: {
            users: testConfig.users,
            duration: testConfig.duration,
            rampUpTime: testConfig.rampUp,
            testType: testConfig.testType,
            method: testConfig.method,
            timeout: testConfig.timeout,
            thinkTime: testConfig.thinkTime
          }
        })
      });

      const data = await response.json();

      if (data.success && data.data?.testId) {
        // 使用状态管理器开始测试
        startTest(data.data.testId, testConfig);
      } else {
        throw new Error(data.message || '测试启动失败');
      }
    } catch (error: any) {
      console.error('压力测试失败:', error);
      alert(error.message || '测试失败');
    }
  };

  // 处理停止测试
  const handleStopTest = () => {
    stopTest();
  };

  // 处理重置测试
  const handleResetTest = () => {
    resetTest();
  };

  // 处理导出数据
  const handleExportData = () => {
    const exportData = {
      testConfig: currentTestConfig,
      metrics,
      dataPoints: getLatestDataPoints(1000),
      duration,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 检查是否可以开始测试
  const canStartTest = testConfig.url.trim().length > 0 && testState === TestState.IDLE;

  return (
    <TestPageLayout className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">优化压力测试</h2>
            <p className="text-gray-300 text-sm">使用优化的状态管理和数据处理进行压力测试</p>
          </div>

          {/* 标签页切换 */}
          <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
            >
              压力测试
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                }`}
            >
              测试历史
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'test' && (
        <>
          {/* 测试控制区域 */}
          <OptimizedTestControls
            testState={testState}
            testPhase={testPhase}
            progress={progress}
            error={error}
            isAuthenticated={isAuthenticated}
            canStartTest={canStartTest}
            isConnected={isConnected}
            onStartTest={handleStartTest}
            onStopTest={handleStopTest}
            onResetTest={handleResetTest}
            onRequireLogin={requireLogin}
          />

          {/* URL输入区域 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>

            <div className="space-y-4">
              <URLInput
                value={testConfig.url}
                onChange={(url) => setTestConfig(prev => ({ ...prev, url }))}
                placeholder="请输入要测试的网站URL"
                disabled={testState !== TestState.IDLE}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="users-input" className="block text-sm font-medium text-gray-300 mb-1">
                    并发用户数
                  </label>
                  <input
                    id="users-input"
                    type="number"
                    min="1"
                    max="1000"
                    value={testConfig.users}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, users: Number(e.target.value) }))}
                    disabled={testState !== TestState.IDLE}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-describedby="users-help"
                    title="设置并发用户数量，范围1-1000"
                  />
                  <div id="users-help" className="sr-only">设置并发用户数量，范围1-1000</div>
                </div>

                <div>
                  <label htmlFor="duration-input" className="block text-sm font-medium text-gray-300 mb-1">
                    测试时长(秒)
                  </label>
                  <input
                    id="duration-input"
                    type="number"
                    min="10"
                    max="3600"
                    value={testConfig.duration}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    disabled={testState !== TestState.IDLE}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-describedby="duration-help"
                    title="设置测试持续时间，范围10-3600秒"
                  />
                  <div id="duration-help" className="sr-only">设置测试持续时间，范围10-3600秒</div>
                </div>

                <div>
                  <label htmlFor="rampup-input" className="block text-sm font-medium text-gray-300 mb-1">
                    加压时间(秒)
                  </label>
                  <input
                    id="rampup-input"
                    type="number"
                    min="1"
                    max="300"
                    value={testConfig.rampUp}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, rampUp: Number(e.target.value) }))}
                    disabled={testState !== TestState.IDLE}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-describedby="rampup-help"
                    title="设置加压时间，范围1-300秒"
                  />
                  <div id="rampup-help" className="sr-only">设置加压时间，范围1-300秒</div>
                </div>

                <div>
                  <label htmlFor="testtype-select" className="block text-sm font-medium text-gray-300 mb-1">
                    测试类型
                  </label>
                  <select
                    id="testtype-select"
                    value={testConfig.testType}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, testType: e.target.value as any }))}
                    disabled={testState !== TestState.IDLE}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-describedby="testtype-help"
                    title="选择压力测试类型"
                  >
                    <option value="gradual">渐进式</option>
                    <option value="spike">峰值冲击</option>
                    <option value="stress">压力测试</option>
                  </select>
                  <div id="testtype-help" className="sr-only">选择压力测试类型：渐进式、峰值冲击或压力测试</div>
                </div>
              </div>
            </div>
          </div>

          {/* 优化的图表组件 */}
          <OptimizedStressTestChart
            testState={testState}
            testPhase={testPhase}
            dataPoints={dataPoints}
            metrics={metrics}
            height={500}
            onExportData={handleExportData}
          />

          {/* 连接状态和数据源信息 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-gray-300">
                    连接状态: {isConnected ? '已连接' : '离线'}
                  </span>
                </div>
                <div className="text-gray-400">
                  数据源: {getCurrentDataSource()}
                </div>
                <div className="text-gray-400">
                  数据点: {dataPoints.length}
                </div>
              </div>
              {duration > 0 && (
                <div className="text-gray-400">
                  测试时长: {Math.floor(duration / 1000)}秒
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试历史</h3>
          <p className="text-gray-300">测试历史功能正在开发中...</p>
        </div>
      )}

      {/* 登录提示组件 */}
      <LoginPromptComponent />
    </TestPageLayout>
  );
};
