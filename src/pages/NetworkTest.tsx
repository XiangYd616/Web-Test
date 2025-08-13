import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Cloud, Download, Globe, MapPin, Play, Router, Server, Signal, Square, Upload, Wifi, XCircle, Zap } from 'lucide-react';
import React, { useState } from 'react';
import TestPageLayout from '../components/testing/TestPageLayout';

interface NetworkTestConfig {
  target: string;
  testType: 'latency' | 'bandwidth' | 'dns' | 'traceroute' | 'comprehensive';
  locations: string[];
  iterations: number;
  timeout: number;
  packetSize: number;
  testDuration: number;
}

interface NetworkTestResult {
  id: string;
  timestamp: string;
  target: string;
  overallScore: number;
  latencyResults: {
    min: number;
    max: number;
    avg: number;
    jitter: number;
    packetLoss: number;
  };
  bandwidthResults: {
    downloadSpeed: number;
    uploadSpeed: number;
    ping: number;
  };
  dnsResults: {
    resolveTime: number;
    servers: Array<{
      server: string;
      responseTime: number;
      status: 'success' | 'failed';
    }>;
  };
  tracerouteResults: {
    hops: Array<{
      hop: number;
      ip: string;
      hostname?: string;
      responseTime: number;
      location?: string;
    }>;
    totalHops: number;
  };
  cdnAnalysis: {
    nearestPop: string;
    distance: number;
    responseTime: number;
    cacheHitRate: number;
  };
  recommendations: string[];
}

const NetworkTest: React.FC = () => {
  const [config, setConfig] = useState<NetworkTestConfig>({
    target: '',
    testType: 'comprehensive',
    locations: ['beijing', 'shanghai', 'guangzhou'],
    iterations: 10,
    timeout: 5000,
    packetSize: 64,
    testDuration: 30
  });

  const [isRunning, setIsRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');
  const [result, setResult] = useState<NetworkTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  const testTypes = [
    { value: 'latency', label: '延迟测试', description: '测试网络延迟和丢包率' },
    { value: 'bandwidth', label: '带宽测试', description: '测试上传下载速度' },
    { value: 'dns', label: 'DNS解析', description: '测试DNS解析性能' },
    { value: 'traceroute', label: '路由追踪', description: '分析网络路径和跳数' },
    { value: 'comprehensive', label: '综合测试', description: '执行所有网络测试项目' }
  ];

  const locations = [
    { value: 'beijing', label: '北京' },
    { value: 'shanghai', label: '上海' },
    { value: 'guangzhou', label: '广州' },
    { value: 'shenzhen', label: '深圳' },
    { value: 'hangzhou', label: '杭州' },
    { value: 'chengdu', label: '成都' },
    { value: 'hongkong', label: '香港' },
    { value: 'singapore', label: '新加坡' },
    { value: 'tokyo', label: '东京' },
    { value: 'seoul', label: '首尔' }
  ];

  // 处理测试选择（从历史记录）
  const handleTestSelect = (record: any) => {
    // 将历史记录转换为测试结果格式
    if (record.results) {
      setResult(record.results);
    }
  };

  // 处理测试重新运行
  const handleTestRerun = (record: any) => {
    // 从历史记录中恢复配置
    if (record.config) {
      setConfig(record.config);
    }
    if (record.url) {
      setConfig(prev => ({ ...prev, target: record.url }));
    }
  };

  const handleStartTest = async () => {
    if (!config.target) {
      setError('请输入要测试的目标地址');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError('');

    try {
      const steps = [
        '正在初始化网络测试...',
        '测试网络延迟...',
        '测试带宽速度...',
        '进行DNS解析测试...',
        '执行路由追踪...',
        '分析CDN性能...',
        '生成测试报告...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 调用真实的网络测试API
      const response = await fetch('/api/test/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          target: config.target,
          config: {
            testType: config.testType,
            locations: config.locations,
            iterations: config.iterations,
            timeout: config.timeout,
            packetSize: config.packetSize,
            testDuration: config.testDuration
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        setCurrentStep('网络测试完成！');
      } else {
        throw new Error(data.message || '网络测试失败');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(`网络测试失败: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLatencyColor = (latency: number) => {
    if (latency <= 50) return 'text-green-400';
    if (latency <= 100) return 'text-yellow-400';
    return 'text-red-400';
  };



  return (
    <TestPageLayout
      testType="performance"
      title="网络测试"
      description="检测网络连接质量、延迟、带宽和DNS解析性能"
      icon={Wifi}
      testTabLabel="网络测试"
      historyTabLabel="测试历史"
      testStatus={testStatus === 'starting' ? 'running' : testStatus as 'idle' | 'running' | 'completed' | 'failed'}
      isTestDisabled={!config.target}
      onStartTest={handleStartTest}
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
      testContent={
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">网络测试</h2>
                <p className="text-gray-300 mt-1">测试网络延迟、带宽、DNS解析和路由性能</p>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            {/* 目标配置 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  测试目标
                </label>
                <input
                  type="text"
                  value={config.target}
                  onChange={(e) => setConfig(prev => ({ ...prev, target: e.target.value }))}
                  placeholder="example.com 或 192.168.1.1"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="test-type-select" className="block text-sm font-medium text-gray-300 mb-2">
                    测试类型
                  </label>
                  <select
                    id="test-type-select"
                    value={config.testType}
                    onChange={(e) => setConfig(prev => ({ ...prev, testType: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择测试类型"
                  >
                    {testTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="iterations-select" className="block text-sm font-medium text-gray-300 mb-2">
                    测试次数
                  </label>
                  <select
                    id="iterations-select"
                    value={config.iterations}
                    onChange={(e) => setConfig(prev => ({ ...prev, iterations: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择测试次数"
                  >
                    <option value={5}>5次</option>
                    <option value={10}>10次</option>
                    <option value={20}>20次</option>
                    <option value={50}>50次</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timeout-select" className="block text-sm font-medium text-gray-300 mb-2">
                    超时时间
                  </label>
                  <select
                    id="timeout-select"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择超时时间"
                  >
                    <option value={3000}>3秒</option>
                    <option value={5000}>5秒</option>
                    <option value={10000}>10秒</option>
                    <option value={30000}>30秒</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="packet-size-select" className="block text-sm font-medium text-gray-300 mb-2">
                    数据包大小
                  </label>
                  <select
                    id="packet-size-select"
                    value={config.packetSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, packetSize: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="选择数据包大小"
                  >
                    <option value={32}>32字节</option>
                    <option value={64}>64字节</option>
                    <option value={128}>128字节</option>
                    <option value={256}>256字节</option>
                    <option value={512}>512字节</option>
                    <option value={1024}>1024字节</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 测试位置选择 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试位置</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {locations.map((location) => (
                <label key={location.value} className="flex items-center space-x-2 p-3 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.locations.includes(location.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig(prev => ({ ...prev, locations: [...prev.locations, location.value] }));
                      } else {
                        setConfig(prev => ({ ...prev, locations: prev.locations.filter(l => l !== location.value) }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">{location.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 测试控制 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">测试控制</h3>
                {isRunning && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">{currentStep}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-label={`测试进度 ${progress}%`}
                      ></div>
                    </div>
                  </div>
                )}
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleStartTest}
                disabled={isRunning || !config.target || config.locations.length === 0}
                className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all ${isRunning || !config.target || config.locations.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>测试中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>开始测试</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 测试结果 */}
          {
            result && (
              <div className="space-y-4">
                {/* 总体评分 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">网络性能评分</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.overallScore / 100)}`}
                          className={getScoreColor(result.overallScore)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                          {Math.round(result.overallScore)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 延迟测试结果 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">延迟测试结果</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: '最小延迟', value: result.latencyResults.min, unit: 'ms', icon: Clock },
                      { label: '最大延迟', value: result.latencyResults.max, unit: 'ms', icon: Clock },
                      { label: '平均延迟', value: result.latencyResults.avg, unit: 'ms', icon: Activity },
                      { label: '抖动', value: result.latencyResults.jitter, unit: 'ms', icon: Signal },
                      { label: '丢包率', value: result.latencyResults.packetLoss, unit: '%', icon: AlertTriangle }
                    ].map((metric, index) => (
                      <div key={index} className="bg-gray-700/30 rounded-lg p-4 text-center">
                        <metric.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <div className={`text-xl font-bold ${metric.unit === '%' ?
                          (metric.value > 5 ? 'text-red-400' : metric.value > 1 ? 'text-yellow-400' : 'text-green-400') :
                          getLatencyColor(metric.value)
                          }`}>
                          {metric.value.toFixed(1)}{metric.unit}
                        </div>
                        <div className="text-sm text-white mt-1">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 带宽测试结果 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">带宽测试结果</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: '下载速度', value: result.bandwidthResults.downloadSpeed, unit: 'Mbps', icon: Download, color: 'text-green-400' },
                      { label: '上传速度', value: result.bandwidthResults.uploadSpeed, unit: 'Mbps', icon: Upload, color: 'text-blue-400' },
                      { label: 'Ping延迟', value: result.bandwidthResults.ping, unit: 'ms', icon: Zap, color: getLatencyColor(result.bandwidthResults.ping) }
                    ].map((metric, index) => (
                      <div key={index} className="bg-gray-700/30 rounded-lg p-6 text-center">
                        <metric.icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                        <div className={`text-2xl font-bold ${metric.color}`}>
                          {metric.value.toFixed(1)}{metric.unit}
                        </div>
                        <div className="text-sm text-white mt-2">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DNS解析结果 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">DNS解析结果</h3>
                  <div className="mb-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Server className="w-5 h-5 text-blue-400" />
                        <span className="text-white">平均解析时间</span>
                      </div>
                      <span className={`font-bold ${getLatencyColor(result.dnsResults.resolveTime)}`}>
                        {result.dnsResults.resolveTime.toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-md font-semibold text-white">DNS服务器响应</h4>
                    {result.dnsResults.servers.map((server, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {server.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-white font-mono">{server.server}</span>
                        </div>
                        <span className={`font-bold ${getLatencyColor(server.responseTime)}`}>
                          {server.responseTime.toFixed(1)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 路由追踪结果 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">路由追踪结果</h3>
                  <div className="mb-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Router className="w-5 h-5 text-blue-400" />
                        <span className="text-white">总跳数</span>
                      </div>
                      <span className="font-bold text-blue-400">
                        {result.tracerouteResults.totalHops}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.tracerouteResults.hops.map((hop, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-blue-400 font-bold w-6">{hop.hop}</span>
                          <div>
                            <div className="text-white font-mono text-sm">{hop.ip}</div>
                            {hop.hostname && (
                              <div className="text-gray-400 text-xs">{hop.hostname}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${getLatencyColor(hop.responseTime)}`}>
                            {hop.responseTime.toFixed(1)}ms
                          </div>
                          {hop.location && (
                            <div className="text-gray-400 text-xs">{hop.location}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CDN分析结果 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">CDN性能分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: '最近节点', value: result.cdnAnalysis.nearestPop, unit: '', icon: MapPin },
                      { label: '距离', value: result.cdnAnalysis.distance, unit: 'km', icon: Globe },
                      { label: '响应时间', value: result.cdnAnalysis.responseTime, unit: 'ms', icon: Clock },
                      { label: '缓存命中率', value: result.cdnAnalysis.cacheHitRate, unit: '%', icon: Cloud }
                    ].map((metric, index) => (
                      <div key={index} className="bg-gray-700/30 rounded-lg p-4 text-center">
                        <metric.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-white">
                          {typeof metric.value === 'number' ? metric.value.toFixed(metric.unit === 'ms' ? 1 : 0) : metric.value}{metric.unit}
                        </div>
                        <div className="text-sm text-gray-300 mt-1">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 优化建议 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
                  <div className="space-y-3">
                    {result.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">测试报告</h3>
                      <p className="text-gray-400 text-sm">导出详细的网络测试报告</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载PDF</span>
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>查看详情</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </div>
      }
    />
  );
};

export default NetworkTest;
