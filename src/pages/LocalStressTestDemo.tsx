import React, { useState, useEffect } from 'react';
import { Zap, Monitor, Users, Clock, TrendingUp, AlertCircle, CheckCircle, XCircle, Play, Square } from 'lucide-react';
import { useLocalStressTest } from '../hooks/useLocalStressTest';

/**
 * 本地压力测试演示页面
 * 用于测试和演示Electron本地压力测试功能
 */
const LocalStressTestDemo: React.FC = () => {
  const localStressTest = useLocalStressTest();
  const [testConfig, setTestConfig] = useState({
    url: 'https://httpbin.org/delay/1',
    users: 50,
    duration: 30,
    testType: 'load' as 'load' | 'stress' | 'spike' | 'volume',
    rampUp: 10,
    thinkTime: 1,
    method: 'GET',
    timeout: 10
  });

  const [testLog, setTestLog] = useState<string[]>([]);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 监听测试事件
  useEffect(() => {
    if (!localStressTest.isAvailable) return;

    addLog('本地压力测试功能已初始化');

    return () => {
      localStressTest.cleanup();
    };
  }, [localStressTest.isAvailable]);

  // 监听测试结果更新
  useEffect(() => {
    if (localStressTest.results) {
      addLog(`测试更新: ${localStressTest.results.totalRequests} 请求, 成功率: ${localStressTest.results.successRate.toFixed(2)}%`);
    }
  }, [localStressTest.results]);

  // 监听错误
  useEffect(() => {
    if (localStressTest.error) {
      addLog(`错误: ${localStressTest.error}`);
    }
  }, [localStressTest.error]);

  const handleStartTest = async () => {
    try {
      addLog('开始启动本地压力测试...');
      await localStressTest.startTest(testConfig);
      addLog('本地压力测试已启动');
    } catch (error) {
      addLog(`启动失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleStopTest = async () => {
    try {
      addLog('停止本地压力测试...');
      await localStressTest.stopTest();
      addLog('本地压力测试已停止');
    } catch (error) {
      addLog(`停止失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const getStatusIcon = () => {
    if (localStressTest.isRunning) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (localStressTest.error) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (localStressTest.isRunning) {
      return '运行中';
    } else if (localStressTest.error) {
      return '错误';
    } else {
      return '就绪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center space-x-3">
            <Zap className="w-8 h-8 text-purple-400" />
            <span>本地压力测试演示</span>
          </h1>
          <p className="text-gray-400">测试Electron桌面应用的本地压力测试功能</p>
        </div>

        {/* 功能可用性状态 */}
        <div className={`mb-6 p-4 rounded-lg border ${
          localStressTest.isAvailable 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center space-x-3">
            {localStressTest.isAvailable ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className="font-medium">
                {localStressTest.isAvailable ? '本地压力测试功能可用' : '本地压力测试功能不可用'}
              </div>
              <div className="text-sm text-gray-400">
                {localStressTest.isAvailable 
                  ? '您正在使用Electron桌面应用，可以进行本地压力测试' 
                  : '请使用Electron桌面应用以启用本地压力测试功能'}
              </div>
            </div>
          </div>
        </div>

        {localStressTest.isAvailable && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 测试配置 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                <span>测试配置</span>
              </h2>

              <div className="space-y-4">
                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">测试URL</label>
                  <input
                    type="url"
                    value={testConfig.url}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="https://example.com"
                  />
                </div>

                {/* 用户数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">并发用户数</label>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={testConfig.users}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, users: parseInt(e.target.value) || 0 }))}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      min="1"
                      max="10000"
                    />
                  </div>
                </div>

                {/* 测试时长 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">测试时长 (秒)</label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={testConfig.duration}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      min="1"
                      max="3600"
                    />
                  </div>
                </div>

                {/* 加压时间 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">加压时间 (秒)</label>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={testConfig.rampUp}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, rampUp: parseInt(e.target.value) || 0 }))}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      min="0"
                      max="300"
                    />
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleStartTest}
                    disabled={localStressTest.isRunning}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>开始测试</span>
                  </button>
                  <button
                    onClick={handleStopTest}
                    disabled={!localStressTest.isRunning}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>停止测试</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 测试状态和结果 */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                {getStatusIcon()}
                <span>测试状态: {getStatusText()}</span>
              </h2>

              {/* 测试结果 */}
              {localStressTest.results && (
                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <div className="text-lg font-bold text-blue-400">{localStressTest.results.totalRequests}</div>
                      <div className="text-xs text-gray-400">总请求数</div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{localStressTest.results.successRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">成功率</div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <div className="text-lg font-bold text-yellow-400">{localStressTest.results.averageResponseTime.toFixed(0)}ms</div>
                      <div className="text-xs text-gray-400">平均响应时间</div>
                    </div>
                    <div className="bg-gray-700 rounded p-3 text-center">
                      <div className="text-lg font-bold text-purple-400">{localStressTest.results.throughput.toFixed(1)}</div>
                      <div className="text-xs text-gray-400">吞吐量 (req/s)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 系统使用情况 */}
              {localStressTest.systemUsage && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">系统资源使用</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>内存使用:</span>
                      <span>{localStressTest.systemUsage.memory.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>活跃Worker:</span>
                      <span>{localStressTest.systemUsage.workers}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 测试日志 */}
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">测试日志</h3>
                <div className="bg-gray-900 rounded p-3 h-40 overflow-y-auto text-xs font-mono">
                  {testLog.map((log, index) => (
                    <div key={index} className="text-gray-300 mb-1">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalStressTestDemo;
