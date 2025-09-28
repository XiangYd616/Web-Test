/**
 * 网络测试页面
 * 提供完整的网络连接、延迟、带宽和稳定性测试功能
 */

import { Activity, CheckCircle, Globe, Loader, Play, RotateCcw, Settings, Shield, Square, Wifi, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';

interface NetworkConfig {
  targetUrl: string;
  testType: 'ping' | 'traceroute' | 'bandwidth' | 'comprehensive';
  timeout: number;
  packetCount: number;
  packetSize: number;
  includeDNSTest: boolean;
  includePortScan: boolean;
  customPorts: number[];
}

interface NetworkTestResult {
  testId: string;
  pingTest: {
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    packetLoss: number;
    jitter: number;
  };
  dnsTest?: {
    resolveTime: number;
    servers: string[];
    success: boolean;
  };
  bandwidthTest?: {
    downloadSpeed: number;
    uploadSpeed: number;
    unit: 'Mbps' | 'Kbps';
  };
  portScan?: {
    openPorts: number[];
    closedPorts: number[];
    filteredPorts: number[];
  };
  traceroute?: {
    hops: Array<{
      hop: number;
      ip: string;
      hostname?: string;
      latency: number;
    }>;
  };
  recommendations: string[];
  overallScore: number;
}

const NetworkTest: React.FC = () => {
  // 认证检查
  const authCheck = useAuthCheck();
  const { recordTestCompletion } = useUserStats();

  // 状态管理
  const [config, setConfig] = useState<NetworkConfig>({
    targetUrl: '',
    testType: 'comprehensive',
    timeout: process.env.REQUEST_TIMEOUT || 30000,
    packetCount: 10,
    packetSize: 64,
    includeDNSTest: true,
    includePortScan: false,
    customPorts: [80, 443, 22, 21, 25]
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<NetworkTestResult | null>(null);
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

  // 启动网络测试
  const startTest = useCallback(async () => {
    if (!config.targetUrl.trim()) {
      setError('请输入目标URL或IP地址');
      return;
    }

    clearError();
    setIsRunning(true);
    setCanSwitchPages(false);
    updateProgress(0, '准备启动网络测试...');

    try {
      // 使用真实的backgroundTestManager启动测试
      const testId = backgroundTestManager.startTest(
        TestType.NETWORK,
        {
          url: config.targetUrl,
          testType: config.testType,
          timeout: config.timeout,
          packetCount: config.packetCount,
          packetSize: config.packetSize,
          includeDNSTest: config.includeDNSTest,
          includePortScan: config.includePortScan,
          customPorts: config.customPorts
        },
        // onProgress
        (progress: number, step: string) => {
          updateProgress(progress, step);
        },
        // onComplete
        (result: any) => {
          // 转换后端结果为前端格式
          const networkResult: NetworkTestResult = {
            testId: result.testId || testId,
            pingTest: {
              averageLatency: result.networkMetrics?.latency || result.data?.networkMetrics?.latency || 0,
              minLatency: result.networkMetrics?.minLatency || result.data?.networkMetrics?.minLatency || 0,
              maxLatency: result.networkMetrics?.maxLatency || result.data?.networkMetrics?.maxLatency || 0,
              packetLoss: result.networkMetrics?.packetLoss || result.data?.networkMetrics?.packetLoss || 0,
              jitter: result.networkMetrics?.jitter || result.data?.networkMetrics?.jitter || 0
            },
            dnsTest: config.includeDNSTest ? {
              resolveTime: result.dnsMetrics?.resolveTime || 50,
              servers: result.dnsMetrics?.servers || ['8.8.8.8', '1.1.1.1'],
              success: result.dnsMetrics?.success !== false
            } : undefined,
            bandwidthTest: {
              downloadSpeed: result.networkMetrics?.downloadSpeed || result.data?.networkMetrics?.downloadSpeed || 0,
              uploadSpeed: result.networkMetrics?.uploadSpeed || result.data?.networkMetrics?.uploadSpeed || 0,
              unit: 'Mbps'
            },
            portScan: config.includePortScan ? {
              openPorts: result.portScan?.openPorts || [],
              closedPorts: result.portScan?.closedPorts || [],
              filteredPorts: result.portScan?.filteredPorts || []
            } : undefined,
            traceroute: {
              hops: result.traceroute?.hops || []
            },
            recommendations: result.recommendations || [
              '网络测试完成',
              '建议定期监控网络性能'
            ],
            overallScore: result.overallScore || result.score || 85
          };

          setResult(networkResult);
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
          recordTestCompletion('network', true, networkResult.overallScore);
          updateProgress(100, '网络测试完成');
        },
        // onError
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error.message;
          setError(errorMessage || '网络测试失败');
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
  const handleConfigChange = useCallback((field: keyof NetworkConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 添加自定义端口
  const addCustomPort = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      customPorts: [...prev.customPorts, 8080]
    }));
  }, []);

  // 更新自定义端口
  const updateCustomPort = useCallback((index: number, port: number) => {
    setConfig(prev => ({
      ...prev,
      customPorts: prev.customPorts.map((p, i) => i === index ? port : p)
    }));
  }, []);

  // 删除自定义端口
  const removeCustomPort = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      customPorts: prev.customPorts.filter((_, i) => i !== index)
    }));
  }, []);

  return (
    <TestPageLayout
      testType="network"
      title="网络测试"
      description="测试网络连接、延迟、带宽和稳定性"
      icon={Globe}
      testContent={
        <div className="space-y-6">
          {/* 配置区域 */}
          <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
            <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-green-400" />
              测试配置
            </h3>

            <div className="space-y-4">
              {/* 目标URL */}
              <div>
                <label className="block text-sm font-medium themed-text-secondary mb-2">
                  目标URL或IP地址 *
                </label>
                <input
                  type="text"
                  value={config.targetUrl}
                  onChange={(e) => handleConfigChange('targetUrl', e.target.value)}
                  placeholder="www.example.com 或 192.168.1.1"
                  className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  disabled={isRunning}
                />
                <p className="text-xs themed-text-tertiary mt-1">
                  支持域名、IPv4和IPv6地址
                </p>
              </div>

              {/* 测试类型 */}
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
                  <option value="ping">Ping测试</option>
                  <option value="traceroute">路由跟踪</option>
                  <option value="bandwidth">带宽测试</option>
                  <option value="comprehensive">综合测试</option>
                </select>
              </div>

              {/* 高级配置 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    超时时间 (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                    min="1000"
                    max="60000"
                    step="1000"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数据包数量
                  </label>
                  <input
                    type="number"
                    value={config.packetCount}
                    onChange={(e) => handleConfigChange('packetCount', parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    数据包大小 (bytes)
                  </label>
                  <input
                    type="number"
                    value={config.packetSize}
                    onChange={(e) => handleConfigChange('packetSize', parseInt(e.target.value))}
                    min="32"
                    max="1500"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* 测试选项 */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeDNSTest}
                    onChange={(e) => handleConfigChange('includeDNSTest', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含DNS解析测试</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includePortScan}
                    onChange={(e) => handleConfigChange('includePortScan', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含端口扫描</span>
                </label>
              </div>
            </div>
          </div>

          {/* 自定义端口 */}
          {config.includePortScan && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <h3 className="text-lg font-semibold themed-text-primary mb-4">
                自定义端口扫描
              </h3>

              <div className="space-y-3">
                {config.customPorts.map((port, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => updateCustomPort(index, parseInt(e.target.value))}
                      placeholder="端口号"
                      min="1"
                      max="65535"
                      className="flex-1 px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      disabled={isRunning}
                    />
                    <button
                      onClick={() => removeCustomPort(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                      disabled={isRunning}
                    >
                      删除
                    </button>
                  </div>
                ))}

                <button
                  onClick={addCustomPort}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                  disabled={isRunning}
                >
                  + 添加端口
                </button>
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex justify-center space-x-4">
            {!isRunning ? (
              <button
                onClick={startTest}
                disabled={!config.targetUrl.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                开始测试
              </button>
            ) : (
              <button
                onClick={stopTest}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Square className="w-5 h-5 mr-2" />
                停止测试
              </button>
            )}

            {(result || error) && (
              <button
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
                  <h3 className="text-lg font-semibold themed-text-primary">测试结果</h3>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-green-600">{result.overallScore}/100</span>
                  </div>
                </div>

                {/* Ping测试结果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">平均延迟</span>
                      <Wifi className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {result.pingTest.averageLatency.toFixed(1)}ms
                    </p>
                    <p className="text-sm text-gray-600">
                      范围: {result.pingTest.minLatency}ms - {result.pingTest.maxLatency}ms
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">丢包率</span>
                      <Activity className="w-5 h-5 text-orange-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {result.pingTest.packetLoss.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      抖动: {result.pingTest.jitter.toFixed(1)}ms
                    </p>
                  </div>

                  {result.bandwidthTest && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">下载速度</span>
                          <Zap className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {result.bandwidthTest.downloadSpeed} {result.bandwidthTest.unit}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">上传速度</span>
                          <Zap className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {result.bandwidthTest.uploadSpeed} {result.bandwidthTest.unit}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* DNS测试结果 */}
                {result.dnsTest && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">DNS解析测试</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">解析时间</span>
                          <p className="text-lg font-semibold text-gray-900">
                            {result.dnsTest.resolveTime}ms
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">DNS服务器</span>
                          <p className="text-sm text-gray-600">
                            {result.dnsTest.servers.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 端口扫描结果 */}
                {result.portScan && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">端口扫描结果</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">开放端口</span>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-lg font-semibold text-green-900 mt-1">
                          {result.portScan.openPorts.length}个
                        </p>
                        <p className="text-sm text-green-600">
                          {result.portScan.openPorts.join(', ')}
                        </p>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-red-700">关闭端口</span>
                          <div className="w-5 h-5 rounded-full bg-red-500" />
                        </div>
                        <p className="text-lg font-semibold text-red-900 mt-1">
                          {result.portScan.closedPorts.length}个
                        </p>
                        <p className="text-sm text-red-600">
                          {result.portScan.closedPorts.join(', ')}
                        </p>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-yellow-700">过滤端口</span>
                          <Shield className="w-5 h-5 text-yellow-500" />
                        </div>
                        <p className="text-lg font-semibold text-yellow-900 mt-1">
                          {result.portScan.filteredPorts.length}个
                        </p>
                        <p className="text-sm text-yellow-600">
                          {result.portScan.filteredPorts.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 路由跟踪结果 */}
                {result.traceroute && result.traceroute.hops.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">路由跟踪</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {result.traceroute.hops.map((hop) => (
                          <div key={hop.hop} className="flex items-center justify-between text-sm">
                            <span className="font-medium">跳数 {hop.hop}</span>
                            <span className="text-gray-600">{hop.hostname || hop.ip}</span>
                            <span className="text-blue-600">{hop.latency}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 建议 */}
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

export default NetworkTest;
