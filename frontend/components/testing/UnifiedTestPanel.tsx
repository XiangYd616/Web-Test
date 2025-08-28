/**
 * 统一测试管理面板
 * 展示统一状态管理系统的完整功能
 */

import {
  Activity, AlertCircle, BarChart3, CheckCircle, Clock, Download,
  History, Loader, Play, Settings, StopCircle, Users, XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useUnifiedTestState } from '../../hooks/legacy-compatibility';
import type { BaseTestConfig } from '../../services/testing/unifiedTestStateManager';
;

export interface UnifiedTestPanelProps {
  testType: string;
  defaultConfig?: Partial<BaseTestConfig>;
  onTestComplete?: (result: any) => void;
  onTestError?: (error: string) => void;
  className?: string;
}

export const UnifiedTestPanel: React.FC<UnifiedTestPanelProps> = ({
  testType,
  defaultConfig = {},
  onTestComplete,
  onTestError,
  className = ''
}) => {
  // 测试配置状态
  const [testConfig, setTestConfig] = useState<BaseTestConfig>({
    url: '',
    testType,
    testName: `${testType}测试`,
    timeout: 300000,
    ...defaultConfig
  });

  // 历史记录和统计
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [testStatistics, setTestStatistics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'progress' | 'history' | 'stats'>('config');

  // 使用统一测试状态管理
  const {
    testId,
    recordId,
    status,
    phase,
    message,
    queueStats,
    isRunning,
    isQueued,
    canStartTest,
    startTest,
    cancelTest,
    stopTest,
    reset,
    getState,
    error
  } = useUnifiedTestState({
    testType,
    maxConcurrentTests: 3,
    enableQueue: true,
    enableWebSocket: true,
    enablePersistence: true,
    onTestStarted: (data: any) => {
      console.log('🚀 测试已启动:', data);
      setActiveTab('progress');
    },
    onTestProgress: (data: any) => {
      console.log('📊 测试进度:', data);
    },
    onTestCompleted: (data: any) => {
      console.log('✅ 测试完成:', data);
      onTestComplete?.(data.result);
      loadTestHistory();
      loadTestStatistics();
    },
    onTestFailed: (data: any) => {
      console.error('❌ 测试失败:', data);
      onTestError?.(data.error);
    },
    onTestQueued: (data: any) => {
      console.log('⏳ 测试已排队:', data);
    },
    onStatusUpdate: (data: any) => {
      console.log('📋 状态更新:', data);
    }
  });

  // 加载测试历史
  const loadTestHistory = async () => {
    try {
      const manager = (getState() as any)?.manager;
      if (manager) {
        const history = await manager.getTestHistory(10);
        setTestHistory(history);
      }
    } catch (error) {
      console.error('加载测试历史失败:', error);
    }
  };

  // 加载测试统计
  const loadTestStatistics = async () => {
    try {
      const manager = (getState() as any)?.manager;
      if (manager) {
        const stats = await manager.getTestStatistics();
        setTestStatistics(stats);
      }
    } catch (error) {
      console.error('加载测试统计失败:', error);
    }
  };

  // 组件初始化
  useEffect(() => {
    loadTestHistory();
    loadTestStatistics();
  }, []);

  // 启动测试
  const handleStartTest = async () => {
    if (!testConfig.url) {
      alert('请输入测试URL');
      return;
    }

    try {
      await startTest(testConfig);
    } catch (error: any) {
      console.error('启动测试失败:', error);
      alert(`启动测试失败: ${error.message}`);
    }
  };

  // 导出测试结果
  const handleExportResult = async (format: 'json' | 'csv' | 'pdf') => {
    if (!testId) return;

    try {
      const manager = (getState() as any)?.manager;
      if (manager) {
        const blob = await manager.exportTestResult(testId, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-result-${testId}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      alert(`导出失败: ${error.message}`);
    }
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'cancelled':
        return <StopCircle className="w-5 h-5 text-yellow-400" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-orange-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h2 className="text-white text-lg font-semibold">{testType}测试管理</h2>
            <p className="text-gray-400 text-sm">{message || '准备就绪'}</p>
          </div>
        </div>

        {/* 系统状态指示器 */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">运行中: {queueStats.totalRunning}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-gray-300">队列: {queueStats.totalQueued}</span>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex border-b border-gray-700">
        {[
          { key: 'config', label: '配置', icon: Settings },
          { key: 'progress', label: '进度', icon: Activity },
          { key: 'history', label: '历史', icon: History },
          { key: 'stats', label: '统计', icon: BarChart3 }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === key
              ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="p-4">
        {/* 配置标签页 */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                测试URL
              </label>
              <input
                type="url"
                value={testConfig.url}
                onChange={(e) => setTestConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                测试名称
              </label>
              <input
                type="text"
                value={testConfig.testName || ''}
                onChange={(e) => setTestConfig(prev => ({ ...prev, testName: e.target.value }))}
                placeholder="输入测试名称"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                超时时间 (秒)
              </label>
              <input
                type="number"
                value={(testConfig.timeout || 300000) / 1000}
                onChange={(e) => setTestConfig(prev => ({
                  ...prev,
                  timeout: parseInt(e.target.value) * 1000
                }))}
                min="30"
                max="3600"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 控制按钮 */}
            <div className="flex space-x-3 pt-4">
              {isRunning || isQueued ? (
                <>
                  <button
                    onClick={stopTest}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>停止测试</span>
                  </button>
                  <button
                    onClick={cancelTest}
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>取消测试</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartTest}
                  disabled={!canStartTest || !testConfig.url}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>开始测试</span>
                </button>
              )}

              <button
                onClick={reset}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Activity className="w-4 h-4" />
                <span>重置</span>
              </button>
            </div>
          </div>
        )}

        {/* 进度标签页 */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {/* 当前状态 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">当前状态</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${status === 'running' ? 'bg-blue-600 text-blue-100' :
                  status === 'completed' ? 'bg-green-600 text-green-100' :
                    status === 'failed' ? 'bg-red-600 text-red-100' :
                      status === 'queued' ? 'bg-orange-600 text-orange-100' :
                        'bg-gray-600 text-gray-100'
                  }`}>
                  {status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">阶段</span>
                  <span className="text-white">{phase}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">测试ID</span>
                  <span className="text-white font-mono">{testId || '无'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">记录ID</span>
                  <span className="text-white font-mono">{recordId || '无'}</span>
                </div>
              </div>
            </div>

            {/* 队列信息 */}
            {isQueued && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <h3 className="text-orange-400 font-medium mb-2">队列信息</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">预估等待时间</span>
                    <span className="text-orange-300">{queueStats.estimatedWaitTime}秒</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">队列位置</span>
                    <span className="text-orange-300">{queueStats.totalQueued}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-medium">错误信息</h3>
                </div>
                <p className="text-red-300 text-sm mt-2">{error}</p>
              </div>
            )}

            {/* 导出按钮 */}
            {testId && status === 'completed' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportResult('json')}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => handleExportResult('csv')}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExportResult('pdf')}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 历史标签页 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">测试历史</h3>
              <button
                onClick={loadTestHistory}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                刷新
              </button>
            </div>

            <div className="space-y-2">
              {testHistory.length > 0 ? (
                testHistory.map((test, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-sm font-medium">{test.testName}</h4>
                        <p className="text-gray-400 text-xs">{test.url}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${test.status === 'completed' ? 'bg-green-600 text-green-100' :
                          test.status === 'failed' ? 'bg-red-600 text-red-100' :
                            'bg-gray-600 text-gray-100'
                          }`}>
                          {test.status}
                        </span>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(test.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">暂无测试历史</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 统计标签页 */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">测试统计</h3>
              <button
                onClick={loadTestStatistics}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                刷新
              </button>
            </div>

            {testStatistics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {testStatistics.totalTests || 0}
                  </div>
                  <div className="text-gray-400 text-sm">总测试数</div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {testStatistics.successRate || 0}%
                  </div>
                  <div className="text-gray-400 text-sm">成功率</div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {testStatistics.averageDuration || 0}s
                  </div>
                  <div className="text-gray-400 text-sm">平均时长</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">暂无统计数据</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedTestPanel;
