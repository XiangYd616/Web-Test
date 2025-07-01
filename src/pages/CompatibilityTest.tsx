import { AlertTriangle, CheckCircle, Clock, Globe, Loader, Lock, Monitor, Play, RotateCcw, Settings, Smartphone, Square, Tablet, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { AdvancedTestCharts } from '../components/charts';
import { URLInput } from '../components/testing';
import { useAdvancedTestEngine } from '../hooks/useAdvancedTestEngine';
import { useUserStats } from '../hooks/useUserStats';
import { AdvancedTestConfig } from '../services/advancedTestEngine';
import '../styles/progress-bars.css';

interface CompatibilityConfig extends AdvancedTestConfig {
  checkDesktop: boolean;
  checkMobile: boolean;
  checkTablet: boolean;
  checkAccessibility: boolean;
  browsers: string[];
}

interface CompatibilityResult {
  overallScore: number;
  browserCompatibility: Record<string, number>;
  deviceCompatibility: Record<string, number>;
  accessibilityScore: number;
  issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  recommendations: string[];
}

const CompatibilityTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "兼容性测试",
    description: "使用兼容性测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<CompatibilityConfig>({
    url: '',
    testType: 'compatibility',
    checkDesktop: true,
    checkMobile: true,
    checkTablet: true,
    checkAccessibility: true,
    browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    options: {},
    device: 'desktop',
    screenshots: true,
    timeout: 300000
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

  // 状态管理
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');

  // 监听测试状态变化
  useEffect(() => {
    if (isRunning) {
      setTestStatus('running');
    } else if (results) {
      setTestStatus('completed');

      // 记录测试完成统计
      const success = !error && !!results;
      const score = (results as any)?.overallScore || (results as any)?.compatibility?.score;
      const duration = (results as any)?.duration || 180; // 默认3分钟
      recordTestCompletion('兼容性测试', success, score, duration);
    } else if (error) {
      setTestStatus('failed');

      // 记录测试失败统计
      recordTestCompletion('兼容性测试', false);
    } else {
      setTestStatus('idle');
    }
  }, [isRunning, results, error, recordTestCompletion]);



  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!config.url) {
      return;
    }

    clearError();
    clearResults();
    setTestStatus('starting');

    // 准备高级测试配置
    const testConfig: AdvancedTestConfig = {
      ...config,
      testType: 'compatibility',
      options: {
        devices: {
          desktop: config.checkDesktop,
          tablet: config.checkTablet,
          mobile: config.checkMobile
        },
        browsers: config.browsers,
        accessibility: config.checkAccessibility
      }
    };

    try {
      await runTest(testConfig);
    } catch (err: any) {
      console.error('Compatibility test failed:', err);
      setTestStatus('failed');
    }
  };

  const handleStopTest = async () => {
    try {
      await stopTest();
      setTestStatus('idle');
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">兼容性测试</h2>
            <p className="text-gray-300 mt-1">检测网站在不同浏览器和设备上的兼容性</p>
          </div>
          <div className="flex items-center space-x-2">
            {testStatus === 'idle' ? (
              <button
                type="button"
                onClick={handleStartTest}
                disabled={!config.url}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${!config.url
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : isAuthenticated
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white border border-yellow-500/30'
                  }`}
              >
                {isAuthenticated ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{isAuthenticated ? '开始测试' : '需要登录后测试'}</span>
              </button>
            ) : testStatus === 'starting' ? (
              <div className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                <Loader className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-purple-300 font-medium">正在启动...</span>
              </div>
            ) : testStatus === 'running' ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-purple-300 font-medium">
                    测试进行中 {Math.round(progress)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopTest}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Square className="w-3 h-3" />
                  <span className="text-sm">停止</span>
                </button>
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-300">
                  <Clock className="w-3 h-3" />
                  <span>可切换页面</span>
                </div>
              </div>
            ) : testStatus === 'completed' ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">测试完成</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearResults();
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重新测试</span>
                </button>
              </div>
            ) : testStatus === 'failed' ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300 font-medium">测试失败</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setTestStatus('idle');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重试</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* URL输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            测试URL
          </label>
          <URLInput
            value={config.url}
            onChange={(url) => setConfig(prev => ({ ...prev, url }))}
            placeholder="https://www.example.com"
            enableReachabilityCheck={false}
          />
        </div>

        {/* 详细进度显示 */}
        {(currentStep || isRunning) && (
          <div className="mt-4 space-y-3">
            {/* 当前步骤 */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-purple-300">测试进度</h4>
                <span className="text-sm text-purple-200">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300 progress-fill progress-fill-blue" style={{ width: `progress%` }}
                ></div>
              </div>

              <p className="text-sm text-purple-300">{currentStep}</p>

              {/* 测试阶段和预计时间 */}
              <div className="flex items-center justify-between mt-2 text-xs text-purple-200">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3" />
                  <span>阶段: {testPhase}</span>
                </div>
                {estimatedTimeRemaining > 0 && (
                  <span>
                    预计剩余: {Math.ceil(estimatedTimeRemaining / 1000)}秒
                  </span>
                )}
              </div>
            </div>

            {/* 后台运行提示 */}
            {testStatus === 'running' && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">后台运行模式</span>
                </div>
                <p className="text-xs text-green-200 mt-1">
                  测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">测试错误</span>
            </div>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试配置 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-gray-300 mr-2" />
              <h3 className="text-lg font-semibold text-white">测试配置</h3>
            </div>

            <div className="space-y-4">
              {/* 设备类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  设备类型
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.checkDesktop}
                      onChange={(e) => setConfig(prev => ({ ...prev, checkDesktop: e.target.checked }))}
                      className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                    />
                    <Monitor className="w-4 h-4 ml-2 mr-1 text-gray-300" />
                    <span className="text-sm text-gray-300">桌面端</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.checkTablet}
                      onChange={(e) => setConfig(prev => ({ ...prev, checkTablet: e.target.checked }))}
                      className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                    />
                    <Tablet className="w-4 h-4 ml-2 mr-1 text-gray-300" />
                    <span className="text-sm text-gray-300">平板端</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.checkMobile}
                      onChange={(e) => setConfig(prev => ({ ...prev, checkMobile: e.target.checked }))}
                      className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                    />
                    <Smartphone className="w-4 h-4 ml-2 mr-1 text-gray-300" />
                    <span className="text-sm text-gray-300">移动端</span>
                  </label>
                </div>
              </div>

              {/* 浏览器选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  浏览器
                </label>
                <div className="space-y-2">
                  {['Chrome', 'Firefox', 'Safari', 'Edge'].map(browser => (
                    <label key={browser} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.browsers.includes(browser)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({ ...prev, browsers: [...prev.browsers, browser] }));
                          } else {
                            setConfig(prev => ({ ...prev, browsers: prev.browsers.filter(b => b !== browser) }));
                          }
                        }}
                        className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                      />
                      <Globe className="w-4 h-4 ml-2 mr-1 text-gray-300" />
                      <span className="text-sm text-gray-300">{browser}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 可访问性检查 */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.checkAccessibility}
                    onChange={(e) => setConfig(prev => ({ ...prev, checkAccessibility: e.target.checked }))}
                    className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-300">可访问性检查</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>

            {!results && !isRunning ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p>点击"开始测试"查看兼容性结果</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* 总体评分 */}
                <div className={`text-center p-6 rounded-lg border ${getScoreBg(results.overallScore)}`}>
                  <div className={`text-4xl font-bold ${getScoreColor(results.overallScore)}`}>
                    {Math.round(results.overallScore)}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">总体兼容性评分</div>
                  <div className="text-xs text-gray-400 mt-2">
                    测试时间: {results.duration ? `${results.duration.toFixed(1)}秒` : '未知'}
                  </div>
                </div>

                {/* 浏览器兼容性详情 */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    浏览器兼容性详情
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries((results as any)?.browserCompatibility || {}).map(([browser, score]) => (
                      <div key={browser} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">{browser}</span>
                          <span className={`text-sm font-bold ${getScoreColor(Number(score))}`}>
                            {Math.round(Number(score))}
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getScoreBg(Number(score)).includes('green') ? 'bg-green-500' :
                              getScoreBg(Number(score)).includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 设备兼容性 */}
                <div className="bg-gray-800/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    设备兼容性
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries((results as any)?.deviceCompatibility || {}).map(([device, score]) => {
                      const DeviceIcon = device === 'desktop' ? Monitor :
                        device === 'tablet' ? Tablet : Smartphone;
                      return (
                        <div key={device} className="bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <DeviceIcon className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-sm font-medium text-gray-300">
                                {device === 'desktop' ? '桌面端' :
                                  device === 'tablet' ? '平板端' : '移动端'}
                              </span>
                            </div>
                            <span className={`text-sm font-bold ${getScoreColor(Number(score))}`}>
                              {Math.round(Number(score))}
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getScoreBg(Number(score)).includes('green') ? 'bg-green-500' :
                                getScoreBg(Number(score)).includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 兼容性问题 */}
                {results.issues && results.issues.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                      发现的兼容性问题
                    </h3>
                    <div className="space-y-3">
                      {results.issues.slice(0, 10).map((issue, index) => (
                        <div key={index} className={`p-3 rounded-lg border-l-4 ${issue.severity === 'high' ? 'bg-red-900/20 border-red-500' :
                          issue.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                            'bg-blue-900/20 border-blue-500'
                          }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-white">{issue.type}</span>
                                {issue.browser && (
                                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                    {issue.browser}
                                  </span>
                                )}
                                {issue.device && (
                                  <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                                    {issue.device}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-300">{issue.description}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${issue.severity === 'high' ? 'bg-red-600 text-white' :
                              issue.severity === 'medium' ? 'bg-yellow-600 text-white' :
                                'bg-blue-600 text-white'
                              }`}>
                              {issue.severity === 'high' ? '严重' :
                                issue.severity === 'medium' ? '中等' : '轻微'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {results.issues.length > 10 && (
                        <div className="text-center text-sm text-gray-400">
                          还有 {results.issues.length - 10} 个问题未显示...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 优化建议 */}
                {results.recommendations && results.recommendations.length > 0 && (
                  <div className="bg-gray-800/30 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      优化建议
                    </h3>
                    <div className="space-y-2">
                      {results.recommendations.slice(0, 8).map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-300">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 测试指标 */}
                <div>
                  <h4 className="text-md font-medium text-white mb-3">测试指标</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                      <div className="text-lg font-bold text-white">{results.duration?.toFixed(1) || 0}s</div>
                      <div className="text-xs text-gray-400">测试时长</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                      <div className="text-lg font-bold text-white">{results.findings?.length || 0}</div>
                      <div className="text-xs text-gray-400">发现问题</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                      <div className="text-lg font-bold text-white">{results.recommendations?.length || 0}</div>
                      <div className="text-xs text-gray-400">优化建议</div>
                    </div>
                    <div className="p-3 bg-gray-700/50 rounded-lg text-center">
                      <div className="text-lg font-bold text-white">{results.engine || 'auto'}</div>
                      <div className="text-xs text-gray-400">测试引擎</div>
                    </div>
                  </div>
                </div>

                {/* 问题和建议 */}
                {results.findings && results.findings.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-white mb-3">发现的问题</h4>
                      <div className="space-y-2">
                        {results.findings.slice(0, 5).map((finding, index) => (
                          <div key={index} className="flex items-start space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-300">{finding.title}</p>
                              <p className="text-xs text-red-400">{finding.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-md font-medium text-white mb-3">优化建议</h4>
                      <div className="space-y-2">
                        {results.recommendations?.slice(0, 5).map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                            <p className="text-sm text-blue-300">{typeof rec === 'string' ? rec : rec.description || rec.title || String(rec)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 高级兼容性图表 */}
      {results && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <AdvancedTestCharts
            results={results}
            testType="compatibility"
            theme="dark"
            height={400}
            interactive={true}
            showComparison={testHistory.length > 1}
          />
        </div>
      )}

      {/* 兼容性测试历史 */}
      {testHistory.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试历史</h3>
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

export default CompatibilityTest;
