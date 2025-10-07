/**
 * CompatibilityTest.tsx - 兼容性测试页面
 */

import React, { useState, useCallback } from 'react';
import { Globe, Play, Square, RotateCcw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { URLInput } from '../components/ui';
import { toast } from 'react-hot-toast';

interface CompatibilityTestConfig {
  url: string;
  browsers: string[];
  devices: string[];
  viewportSizes: string[];
}

interface BrowserResult {
  browser: string;
  version: string;
  status: 'pass' | 'fail' | 'warning';
  issues: string[];
}

const CompatibilityTest: React.FC = () => {
  const { requireLogin } = useAuthCheck({
    feature: "兼容性测试",
    description: "使用兼容性测试功能"
  });
  
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');
  const [config, setConfig] = useState<CompatibilityTestConfig>({
    url: '',
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    devices: ['Desktop', 'Mobile', 'Tablet'],
    viewportSizes: ['1920x1080', '1366x768', '375x667']
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BrowserResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleStartTest = useCallback(async () => {
    if (!requireLogin()) return;
    
    if (!config.url) {
      setError('请输入要测试的URL');
      return;
    }
    
    try {
      setError(null);
      setResult(null);
      setIsRunning(true);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults: BrowserResult[] = config.browsers.map(browser => ({
        browser,
        version: '120.0',
        status: Math.random() > 0.3 ? 'pass' : Math.random() > 0.5 ? 'warning' : 'fail',
        issues: Math.random() > 0.7 ? ['布局问题', 'CSS 不兼容'] : []
      }));
      
      setResult(mockResults);
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
  
  const toggleBrowser = (browser: string) => {
    setConfig(prev => ({
      ...prev,
      browsers: prev.browsers.includes(browser)
        ? prev.browsers.filter(b => b !== browser)
        : [...prev.browsers, browser]
    }));
  };

  return (
    <TestPageLayout
      title="兼容性测试"
      description="跨浏览器和设备兼容性检测"
      icon={Globe}
      testStatus={isRunning ? 'running' : result ? 'completed' : 'idle'}
      isTestDisabled={!config.url || config.browsers.length === 0}
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
                placeholder="输入要测试的网站URL"
                disabled={isRunning}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择测试浏览器
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Chrome', 'Firefox', 'Safari', 'Edge'].map(browser => (
                    <button
                      key={browser}
                      onClick={() => toggleBrowser(browser)}
                      disabled={isRunning}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        config.browsers.includes(browser)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {browser}
                    </button>
                  ))}
                </div>
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
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>
              <div className="space-y-3">
                {result.map((browserResult, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {browserResult.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {browserResult.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {browserResult.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
                      <div>
                        <p className="text-white font-medium">{browserResult.browser} {browserResult.version}</p>
                        {browserResult.issues.length > 0 && (
                          <p className="text-sm text-gray-400">{browserResult.issues.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      browserResult.status === 'pass' ? 'bg-green-500/20 text-green-400' :
                      browserResult.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {browserResult.status === 'pass' ? '通过' : browserResult.status === 'warning' ? '警告' : '失败'}
                    </span>
                  </div>
                ))}
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

export default CompatibilityTest;

