import { AlertTriangle, CheckCircle, Download, Eye, Globe, Loader, Lock, RotateCcw, Server, Share2, Shield, Square, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { EnhancedSecurityAnalysis } from '../components/analysis';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { AdvancedTestCharts } from '../components/charts';
import { URLInput } from '../components/testing';
import { useTheme } from '../contexts/ThemeContext';
import { useAdvancedTestEngine } from '../hooks/useAdvancedTestEngine';
import { useUserStats } from '../hooks/useUserStats';
import { AdvancedTestConfig } from '../services/advancedTestEngine';

interface SecurityTestConfig extends AdvancedTestConfig {
  checkSSL: boolean;
  checkHeaders: boolean;
  checkVulnerabilities: boolean;
  checkCookies: boolean;
  checkCSP: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
  checkMixedContent: boolean;
  depth: 'basic' | 'standard' | 'comprehensive';
}

interface SecurityResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  sslScore: number;
  headersScore: number;
  vulnerabilityScore: number;
  cookieScore: number;
  cspScore: number;
  findings: SecurityFinding[];
  recommendations: string[];
  status: 'completed' | 'failed';
}

interface SecurityFinding {
  type: 'ssl' | 'headers' | 'vulnerability' | 'cookie' | 'csp' | 'xss' | 'sql' | 'mixed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  details?: any;
}

const SecurityTest: React.FC = () => {
  const { actualTheme } = useTheme();

  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "安全检测",
    description: "使用安全检测功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    testType: 'security',
    checkSSL: true,
    checkHeaders: true,
    checkVulnerabilities: true,
    checkCookies: true,
    checkCSP: true,
    checkXSS: false,
    checkSQLInjection: false,
    checkMixedContent: true,
    depth: 'standard',
    options: {},
    device: 'desktop',
    screenshots: true,
    timeout: 180000
  });

  // 使用高级测试引擎
  const {
    isRunning,
    progress,
    currentStep,
    testPhase,
    estimatedTimeRemaining,
    results,
    testHistory,
    error,
    engineStatus,
    runTest,
    stopTest,
    clearResults,
    clearError
  } = useAdvancedTestEngine();

  // 添加本地状态管理
  const [localResults, setLocalResults] = useState<any>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLocalRunning, setIsLocalRunning] = useState(false);

  // 状态管理
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');

  // 监听本地测试状态变化
  useEffect(() => {
    if (isLocalRunning) {
      setTestStatus('running');
    } else if (localResults) {
      setTestStatus('completed');
    } else if (localError) {
      setTestStatus('failed');
    } else {
      setTestStatus('idle');
    }
  }, [isLocalRunning, localResults, localError]);



  const securityTests = [
    {
      key: 'checkSSL',
      name: 'SSL/TLS 检测',
      description: '检查SSL证书有效性、加密强度和配置',
      icon: Lock,
      color: 'green',
      estimatedTime: '30秒'
    },
    {
      key: 'checkHeaders',
      name: 'HTTP 安全头',
      description: '检查安全相关的HTTP响应头',
      icon: Shield,
      color: 'blue',
      estimatedTime: '20秒'
    },
    {
      key: 'checkVulnerabilities',
      name: '漏洞扫描',
      description: '检查常见的Web安全漏洞',
      icon: AlertTriangle,
      color: 'red',
      estimatedTime: '60秒'
    },
    {
      key: 'checkCookies',
      name: 'Cookie 安全',
      description: '检查Cookie的安全配置',
      icon: Server,
      color: 'purple',
      estimatedTime: '15秒'
    },
    {
      key: 'checkCSP',
      name: '内容安全策略',
      description: '检查CSP配置和有效性',
      icon: Eye,
      color: 'indigo',
      estimatedTime: '25秒'
    },
    {
      key: 'checkMixedContent',
      name: '混合内容检测',
      description: '检查HTTPS页面中的HTTP资源',
      icon: Globe,
      color: 'yellow',
      estimatedTime: '20秒'
    }
  ];

  const selectedTestsCount = Object.values(config).filter((value, index) =>
    index > 0 && index < 9 && value === true
  ).length;

  const estimatedTime = selectedTestsCount * 25; // 平均每项测试25秒

  const handleTestTypeChange = (testKey: keyof SecurityTestConfig) => {
    setConfig(prev => ({
      ...prev,
      [testKey]: !prev[testKey]
    }));
  };



  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!config.url.trim()) {
      return;
    }

    if (selectedTestsCount === 0) {
      return;
    }

    // 清除之前的结果和错误
    setLocalResults(null);
    setLocalError(null);
    setIsLocalRunning(true);
    setTestStatus('starting');

    try {
      // 调用真实的安全测试API
      const response = await fetch('/api/test/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          options: {
            checkSSL: config.checkSSL,
            checkHeaders: config.checkHeaders,
            checkVulnerabilities: config.checkVulnerabilities,
            checkCookies: config.checkCookies,
            timeout: 30000
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '安全测试失败');
      }

      // 转换API返回的数据格式为前端期望的格式
      const testResults = data.data;

      // 设置结果
      setLocalResults(testResults);
      setTestStatus('completed');
      setIsLocalRunning(false);

      console.log('✅ Security test completed:', testResults);

      // 记录测试完成统计
      const score = testResults?.securityScore || 0;
      recordTestCompletion('安全检测', true, score, 30); // 假设30秒完成

    } catch (err: any) {
      console.error('❌ Security test failed:', err);
      setLocalError(err.message || '安全测试失败');
      setTestStatus('failed');
      setIsLocalRunning(false);

      // 记录测试失败统计
      recordTestCompletion('安全检测', false);
    }
  };

  const handleStopTest = async () => {
    try {
      setIsLocalRunning(false);
      setTestStatus('idle');
      setLocalError('测试已被用户停止');
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };



  return (
    <div className={`space-y-6 ${actualTheme === 'light' ? 'light-security-test' : 'dark-security-test'}`}>
      {/* 页面标题 */}
      <div className="themed-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold themed-text-primary">安全检测</h2>
            <p className="themed-text-secondary mt-1">全面检测网站安全漏洞、SSL配置和安全策略</p>
          </div>
        </div>

        <URLInput
          value={config.url}
          onChange={(url) => setConfig(prev => ({ ...prev, url }))}
          placeholder="输入要进行安全检测的网站URL..."
        />

        {localError && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{localError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 安全检测配置 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 检测项目选择 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">选择检测项目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityTests.map((test) => (
                <div
                  key={test.key}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${config[test.key as keyof SecurityTestConfig]
                    ? `border-${test.color}-500 bg-${test.color}-500/10`
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                    }`}
                  onClick={() => handleTestTypeChange(test.key as keyof SecurityTestConfig)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 bg-${test.color}-500/20 rounded-lg flex items-center justify-center`}>
                      <test.icon className={`w-5 h-5 text-${test.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white">{test.name}</h4>
                        <div className="relative">
                          <input
                            type="checkbox"
                            id={`security-test-${test.key}`}
                            checked={config[test.key as keyof SecurityTestConfig] as boolean}
                            onChange={() => handleTestTypeChange(test.key as keyof SecurityTestConfig)}
                            title={`启用或禁用${test.name}检测`}
                            aria-label={`启用或禁用${test.name}检测`}
                            className="sr-only"
                          />
                          <div
                            className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${config[test.key as keyof SecurityTestConfig]
                              ? `border-${test.color}-500 bg-${test.color}-500 shadow-lg shadow-${test.color}-500/25`
                              : 'border-gray-500 bg-gray-700/50 hover:border-gray-400 hover:bg-gray-600/50'
                              }`}
                            onClick={() => handleTestTypeChange(test.key as keyof SecurityTestConfig)}
                          >
                            {config[test.key as keyof SecurityTestConfig] && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{test.description}</p>
                      <p className="text-xs text-gray-400 mt-2">预计时间: {test.estimatedTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 检测深度配置 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">检测深度</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="basic"
                  checked={config.depth === 'basic'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">基础检测</span>
                  <span className="block text-sm text-gray-300">快速检测主要安全问题</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="standard"
                  checked={config.depth === 'standard'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">标准检测</span>
                  <span className="block text-sm text-gray-300">全面的安全检测（推荐）</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="depth"
                  value="comprehensive"
                  checked={config.depth === 'comprehensive'}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: e.target.value as any }))}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-white">
                  <span className="font-medium">深度检测</span>
                  <span className="block text-sm text-gray-300">详细的安全审计和漏洞扫描</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 测试控制和结果 */}
        <div className="space-y-6">
          {/* 测试控制面板 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">安全检测控制</h3>

            {testStatus === 'idle' ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-300">
                  <p>已选择 {selectedTestsCount} 项检测</p>
                  <p>预计耗时: {Math.ceil(estimatedTime / 60)} 分钟</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!config.url.trim() || selectedTestsCount === 0 || isLocalRunning}
                  className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${!config.url.trim() || selectedTestsCount === 0 || isLocalRunning
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : isAuthenticated
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-500/30'
                    }`}
                >
                  {isAuthenticated ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span>{isAuthenticated ? '开始安全检测' : '需要登录后检测'}</span>
                </button>
              </div>
            ) : testStatus === 'starting' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <Loader className="w-8 h-8 mx-auto mb-2 animate-spin text-red-400" />
                  <p className="text-sm font-medium text-white">正在启动...</p>
                  <p className="text-sm text-gray-300">{currentStep}</p>
                </div>
              </div>
            ) : testStatus === 'running' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-red-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                  </div>
                  <p className="text-sm font-medium text-white">
                    安全检测中...
                  </p>
                  <p className="text-sm text-gray-300">{currentStep}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>阶段: {testPhase}</span>
                    {estimatedTimeRemaining > 0 && (
                      <span>预计剩余: {Math.ceil(estimatedTimeRemaining / 1000)}秒</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* 后台运行提示 */}
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-300 font-medium">后台运行模式</span>
                  </div>
                  <p className="text-xs text-green-200 mt-1">
                    测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStopTest}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>停止检测</span>
                </button>
              </div>
            ) : testStatus === 'completed' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm font-medium text-white">检测完成</p>
                  <p className="text-sm text-gray-300">安全检测已成功完成</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearResults();
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>重新检测</span>
                </button>
              </div>
            ) : testStatus === 'failed' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm font-medium text-white">检测失败</p>
                  <p className="text-sm text-gray-300">请检查网络连接或重试</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>重试</span>
                </button>
              </div>
            ) : null}
          </div>

          {/* 安全检测结果 */}
          {localResults && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">安全检测结果</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>下载报告</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>分享结果</span>
                  </button>
                </div>
              </div>

              {/* 使用增强的安全分析组件 */}
              <EnhancedSecurityAnalysis result={localResults as any} />


            </div>
          )}
        </div>
      </div>

      {/* 高级安全图表 */}
      {localResults && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <AdvancedTestCharts
            results={localResults}
            testType="security"
            theme="dark"
            height={400}
            interactive={true}
            showComparison={testHistory.length > 1}
          />
        </div>
      )}

      {/* 安全检测历史 */}
      {testHistory.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">检测历史</h3>
          <div className="space-y-3">
            {testHistory.slice(0, 5).map((test, index) => (
              <div key={test.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${test.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{test.url}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(test.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${test.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
                    test.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                    {Math.round(test.overallScore)}分
                  </div>
                  <div className="text-xs text-gray-400">
                    {test.findings.length} 问题
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 登录提示组件 */}
      {LoginPromptComponent}
    </div>
  );
};

export default SecurityTest;
