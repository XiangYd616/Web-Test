/**
 * NetworkTest.tsx - 网络测试页面
 */

import React, { useState, useCallback } from 'react';
import { Wifi, Play, Square, RotateCcw, AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { URLInput } from '../components/ui';
import { toast } from 'react-hot-toast';

interface NetworkTestConfig {
  url: string;
  testType: 'latency' | 'bandwidth' | 'traceroute' | 'dns';
  pingCount: number;
  timeout: number;
}

interface NetworkTestResult {
  testType: string;
  latency: {
    min: number;
    avg: number;
    max: number;
  };
  bandwidth: {
    download: number;
    upload: number;
  };
  packetLoss: number;
  jitter: number;
}

const NetworkTest: React.FC = () => {
  const { requireLogin } = useAuthCheck({
    feature: "网络测试",
    description: "使用网络测试功能"
  });
  
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');
  const [config, setConfig] = useState<NetworkTestConfig>({
    url: '',
    testType: 'latency',
    pingCount: 10,
    timeout: 5000
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<NetworkTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleStartTest = useCallback(async () => {
    if (!requireLogin()) return;
    
    if (!config.url) {
      setError('请输入要测试的URL或IP地址');
      return;
    }
    
    try {
      setError(null);
      setResult(null);
      setIsRunning(true);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResult: NetworkTestResult = {
        testType: config.testType,
        latency: {
          min: Math.random() * 20 + 10,
          avg: Math.random() * 50 + 30,
          max: Math.random() * 100 + 50
        },
        bandwidth: {
          download: Math.random() * 100 + 50,
          upload: Math.random() * 50 + 20
        },
        packetLoss: Math.random() * 2,
        jitter: Math.random() * 10 + 2
      };
      
      setResult(mockResult);
      toast.success('测试完成');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '测试失败';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsRunning(false);
    }
  }, [config, requireLogin]);
  
  const handleStopTest = useCallback(() => {
    setIsRunning(false);
    toast('测试已停止');
  }, []);
  
  const handleResetTest = useCallback(() => {
    setResult(null);
    setError(null);
    toast.success('已重置测试');
  }, []);

  return (
    <TestPageLayout
      title="网络测试"
      description="网络延迟、带宽和连接质量检测"
      icon={Wifi}
      testStatus={isRunning ? 'running' : result ? 'completed' : 'idle'}
      isTestDisabled={!config.url}
      onStartTest={handleStartTest}
      onStopTest={handleStopTest}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'test' ? (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
            <div className="space-y-4">
              <URLInput
                value={config.url}
                onChange={(url) => setConfig({ ...config, url })}
                placeholder="输入要测试的网站URL或IP地址"
                disabled={isRunning}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  测试类型
                </label>
                <select
                  value={config.testType}
                  onChange={(e) => setConfig({ ...config, testType: e.target.value as any })}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="latency">延迟测试 (Ping)</option>
                  <option value="bandwidth">带宽测试</option>
                  <option value="traceroute">路由追踪</option>
                  <option value="dns">DNS解析</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ping 次数: {config.pingCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={config.pingCount}
                  onChange={(e) => setConfig({ ...config, pingCount: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  超时时间 (毫秒): {config.timeout}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* 额外控制按钮 - 仅保留重置按钮 */}
          {result && !isRunning && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleResetTest}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                <RotateCcw className="h-5 w-5" />
                <span>重置</span>
              </button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-400 mb-1">测试错误</h4>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {result && (
            <div className="space-y-4">
              {/* 延迟统计 */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">延迟统计</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">最小延迟</p>
                    <p className="text-2xl font-bold text-green-400">{result.latency.min.toFixed(1)} ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">平均延迟</p>
                    <p className="text-2xl font-bold text-blue-400">{result.latency.avg.toFixed(1)} ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-1">最大延迟</p>
                    <p className="text-2xl font-bold text-red-400">{result.latency.max.toFixed(1)} ms</p>
                  </div>
                </div>
              </div>
              
              {/* 带宽测试 */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">带宽测试</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg">
                    <TrendingDown className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">下载速度</p>
                      <p className="text-xl font-bold text-white">{result.bandwidth.download.toFixed(1)} Mbps</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-700 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-400">上传速度</p>
                      <p className="text-xl font-bold text-white">{result.bandwidth.upload.toFixed(1)} Mbps</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 连接质量 */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">连接质量</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">丢包率</span>
                    <span className={`text-lg font-bold ${
                      result.packetLoss < 1 ? 'text-green-400' :
                      result.packetLoss < 3 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{result.packetLoss.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <span className="text-gray-300">抖动</span>
                    <span className={`text-lg font-bold ${
                      result.jitter < 5 ? 'text-green-400' :
                      result.jitter < 10 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{result.jitter.toFixed(1)} ms</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">暂无测试历史</p>
        </div>
      )}
    </TestPageLayout>
  );
};

export default NetworkTest;

