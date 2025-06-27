import React, { useState, useEffect } from 'react';
import { Play, Square, Settings, Users, Clock, TrendingUp, AlertCircle, Download, FileText, Loader, BarChart3, CheckCircle, XCircle, RotateCcw, Pause, SkipForward, Lock } from 'lucide-react';
import { testAPI } from '../services/testApi';
import { testEngineManager } from '../services/testEngines';
import backgroundTestManager, { TestInfo, TestEvent } from '../services/BackgroundTestManager.js';
import { useAdvancedTestEngine, AdvancedStressTestConfig as ImportedAdvancedStressTestConfig } from '../hooks/useSimpleTestEngine';
import { AdvancedStressTestChart } from '../components/SimpleCharts';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { useUserStats } from '../hooks/useUserStats';

// 本地配置接口，继承导入的配置
interface StressTestConfig extends ImportedAdvancedStressTestConfig {
  // 可以添加额外的本地配置
}

const StressTest: React.FC = () => {
  // 登录检查
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

  const [testConfig, setTestConfig] = useState<StressTestConfig>({
    url: '', // 用户自定义测试URL
    users: 100,
    duration: 60,
    rampUp: 10,
    testType: 'gradual',
    method: 'GET',
    timeout: 30,
    thinkTime: 1,
    warmupDuration: 5,
    cooldownDuration: 5,
  });
  const [testData, setTestData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [browserCapabilities] = useState({ fetch: true, webWorkers: true });
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed'>('idle');
  const [testProgress, setTestProgress] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // 后台测试管理状态
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 监听后台测试状态变化
  useEffect(() => {
    const unsubscribe = backgroundTestManager.addListener((event: string, testInfo: any) => {
      if (testInfo.type === 'stress' && testInfo.id === currentTestId) {
        switch (event) {
          case 'testProgress':
            setBackgroundTestInfo(testInfo);
            setTestProgress(testInfo.currentStep);
            setTestStatus('running');
            setIsRunning(true);
            break;
          case 'testCompleted':
            setBackgroundTestInfo(testInfo);

            // 处理压力测试结果数据结构
            const processedResult = testInfo.result;
            console.log('🔍 Processing stress test result:', processedResult);

            // 确保 metrics 数据正确提取
            if (processedResult && processedResult.metrics) {
              setMetrics(processedResult.metrics);
              console.log('📊 Extracted metrics:', processedResult.metrics);
            }

            setResult(processedResult);
            setTestStatus('completed');
            setTestProgress('压力测试完成！');
            setIsRunning(false);
            setCurrentTestId(null);

            // 记录测试完成统计
            if (processedResult) {
              const success = processedResult.success !== false;
              const score = processedResult.metrics?.averageResponseTime ?
                Math.max(0, 100 - Math.min(100, processedResult.metrics.averageResponseTime / 10)) : undefined;
              const duration = processedResult.actualDuration || processedResult.duration || testConfig.duration;
              recordTestCompletion('压力测试', success, score, duration);
            }
            break;
          case 'testFailed':
            setBackgroundTestInfo(testInfo);
            setError(testInfo.error || '测试失败');
            setTestStatus('failed');
            setIsRunning(false);
            setCurrentTestId(null);
            break;
          case 'testCancelled':
            setBackgroundTestInfo(null);
            setTestStatus('idle');
            setTestProgress('');
            setIsRunning(false);
            setCurrentTestId(null);
            break;
        }
      }
    });

    // 检查是否有正在运行的压力测试
    const runningTests = backgroundTestManager.getRunningTests();
    const stressTest = runningTests.find((test: any) => test.type === 'stress');
    if (stressTest) {
      setCurrentTestId(stressTest.id);
      setBackgroundTestInfo(stressTest);
      setTestStatus('running');
      setTestProgress(stressTest.currentStep);
      setIsRunning(true);
    }

    return unsubscribe;
  }, [currentTestId]);

  // 检查测试引擎状态
  useEffect(() => {
    const checkEngines = async () => {
      try {
        await testEngineManager.initializeEngines();
        const status = await testEngineManager.checkAllEngines();
        setEngineStatus({
          k6: status.k6 || false,
          lighthouse: status.lighthouse || false,
          playwright: status.playwright || false
        });
      } catch (error) {
        console.error('Failed to check engines:', error);
        setEngineStatus({
          k6: false,
          lighthouse: false,
          playwright: false
        });
      }
    };
    checkEngines();
  }, []);

  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!testConfig.url) {
      setError('请输入测试 URL');
      return;
    }

    setError('');
    setTestStatus('starting');
    setTestProgress('正在初始化压力测试...');
    setTestData([]);
    setMetrics(null);

    // 准备测试配置
    const testConfigData = {
      url: testConfig.url,
      vus: testConfig.users,
      duration: `${testConfig.duration}s`,
      testType: testConfig.testType,
      rampUp: testConfig.rampUp,
      method: testConfig.method,
      timeout: testConfig.timeout,
      thinkTime: testConfig.thinkTime,
      warmupDuration: testConfig.warmupDuration
    };

    // 使用后台测试管理器启动测试
    const testId = backgroundTestManager.startTest(
      'stress',
      testConfigData,
      // onProgress 回调
      (progress: number, step: string) => {
        setTestProgress(step);
        setTestStatus('running');
        setIsRunning(true);
      },
      // onComplete 回调
      (result: any) => {
        console.log('🔍 Direct test completion result:', result);

        // 处理压力测试结果数据结构
        const processedResult = result;

        // 确保 metrics 数据正确提取
        if (processedResult && processedResult.metrics) {
          setMetrics(processedResult.metrics);
          console.log('📊 Direct extracted metrics:', processedResult.metrics);
        }

        setResult(processedResult);
        setTestStatus('completed');
        setTestProgress('压力测试完成！');
        setIsRunning(false);
        setCanSwitchPages(true);

        // 记录测试完成统计
        const success = processedResult.success !== false;
        const score = processedResult.metrics?.averageResponseTime ?
          Math.max(0, 100 - Math.min(100, processedResult.metrics.averageResponseTime / 10)) : undefined;
        const duration = processedResult.actualDuration || processedResult.duration || testConfig.duration;
        recordTestCompletion('压力测试', success, score, duration);
      },
      // onError 回调
      (error: any) => {
        setError(error.message || '测试失败');
        setTestStatus('failed');
        setIsRunning(false);
        setCanSwitchPages(true);
      }
    );

    setCurrentTestId(testId);
    setCanSwitchPages(true); // 允许切换页面
    setTestStatus('running');
    setIsRunning(true);
  };

  const handleStopTest = async () => {
    if (currentTestId) {
      backgroundTestManager.cancelTest(currentTestId);
      setCurrentTestId(null);
      setBackgroundTestInfo(null);
      setTestStatus('idle');
      setTestProgress('');
      setIsRunning(false);
      setError('');
      setCanSwitchPages(true);
    }
  };



  const handleExportReport = (format: 'json' | 'csv' | 'html') => {
    if (!result) {
      alert('没有测试结果可导出');
      return;
    }

    const report = {
      type: 'stress' as const,
      timestamp: Date.now(),
      url: testConfig.url,
      metrics: result.metrics,
      duration: testConfig.duration
    };

    // 简单的导出功能
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stress-test-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyTemplate = (templateId: string) => {
    // 简化的模板应用
    const templates: Record<string, Partial<StressTestConfig>> = {
      'light-load': { users: 5, duration: 30, testType: 'gradual' },
      'medium-load': { users: 20, duration: 60, testType: 'gradual' },
      'heavy-load': { users: 50, duration: 120, testType: 'stress' }
    };

    const template = templates[templateId];
    if (template) {
      setTestConfig((prev: StressTestConfig) => ({ ...prev, ...template }));
      setShowTemplates(false);
    }
  };

  return (
    <div className="space-y-6 dark-page-scrollbar">

        {/* 页面标题 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">压力测试</h2>
              <p className="text-gray-300 mt-1">测试网站在高并发访问下的性能表现</p>
            </div>
            <div className="flex items-center space-x-2">
            {testStatus === 'idle' ? (
              <button
                type="button"
                onClick={() => {
                  console.log('🔥 按钮被点击!');
                  console.log('📋 当前URL:', testConfig.url);
                  handleStartTest();
                }}
                disabled={!testConfig.url}
                className={`btn btn-md flex items-center space-x-2 ${
                  !testConfig.url
                    ? 'btn-disabled opacity-50 cursor-not-allowed'
                    : isAuthenticated
                    ? 'btn-primary hover:btn-primary-dark'
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
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <Loader className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">正在启动...</span>
              </div>
            ) : testStatus === 'running' || isRunning ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-300 font-medium">
                    {backgroundTestInfo ? '后台运行中' : '测试进行中'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopTest}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>停止</span>
                </button>
                {canSwitchPages && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-300">
                    <Clock className="w-3 h-3" />
                    <span>可切换页面</span>
                  </div>
                )}
              </div>
            ) : testStatus === 'completed' ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-300 font-medium">测试完成</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestStatus('idle');
                    setTestProgress('');
                    setTestData([]);
                    setMetrics(null);
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>重新测试</span>
                </button>
              </div>
            ) : testStatus === 'failed' ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-red-300 font-medium">测试失败</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestStatus('idle');
                    setTestProgress('');
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>重试</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* 详细进度显示 */}
        {(testProgress || backgroundTestInfo) && (
          <div className="mt-4 space-y-3">
            {/* 当前步骤 */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-300">测试进度</h4>
                {backgroundTestInfo && (
                  <span className="text-sm text-blue-200">
                    {Math.round(backgroundTestInfo.progress || 0)}%
                  </span>
                )}
              </div>

              {/* 进度条 */}
              {backgroundTestInfo && (
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${backgroundTestInfo.progress || 0}%` }}
                  ></div>
                </div>
              )}

              <p className="text-sm text-blue-300">{testProgress}</p>

              {/* 测试时间 */}
              {backgroundTestInfo && backgroundTestInfo.startTime && (
                <div className="flex items-center space-x-2 mt-2 text-xs text-blue-200">
                  <Clock className="w-3 h-3" />
                  <span>
                    开始时间: {new Date(backgroundTestInfo.startTime).toLocaleTimeString()}
                  </span>
                  <span>•</span>
                  <span>
                    运行时长: {Math.floor((Date.now() - new Date(backgroundTestInfo.startTime).getTime()) / 1000)}秒
                  </span>
                </div>
              )}
            </div>

            {/* 后台运行提示 */}
            {testStatus === 'running' && canSwitchPages && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300 font-medium">后台运行模式</span>
                </div>
                <p className="text-xs text-green-200 mt-1">
                  测试正在后台运行，您可以自由切换到其他页面，测试不会中断。
                  完成后会自动通知您。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* URL 输入 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">测试URL</label>
          <input
            type="url"
            value={testConfig.url}
            onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, url: e.target.value }))}
            placeholder="输入要进行压力测试的网站URL..."
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主要内容区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 测试类型选择 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">选择测试类型</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'gradual',
                  name: '梯度加压',
                  description: '逐步增加并发用户数，模拟真实负载增长',
                  icon: TrendingUp,
                  color: 'green',
                  estimatedTime: '2-5分钟'
                },
                {
                  key: 'spike',
                  name: '峰值测试',
                  description: '突然增加大量用户，测试系统峰值处理能力',
                  icon: BarChart3,
                  color: 'blue',
                  estimatedTime: '1-3分钟'
                },
                {
                  key: 'constant',
                  name: '恒定负载',
                  description: '保持固定并发数，测试系统稳定性',
                  icon: Users,
                  color: 'purple',
                  estimatedTime: '3-10分钟'
                },
                {
                  key: 'stress',
                  name: '压力极限',
                  description: '超出正常负载，找出系统性能瓶颈',
                  icon: AlertCircle,
                  color: 'red',
                  estimatedTime: '5-15分钟'
                }
              ].map((test) => (
                <div
                  key={test.key}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    testConfig.testType === test.key
                      ? `border-${test.color}-500 bg-${test.color}-500/10`
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                  }`}
                  onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: test.key as any }))}
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
                            type="radio"
                            id={`stress-test-type-${test.key}`}
                            name="testType"
                            value={test.key}
                            checked={testConfig.testType === test.key}
                            onChange={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: test.key as any }))}
                            title={`选择${test.name}测试类型`}
                            aria-label={`选择${test.name}测试类型`}
                            className="sr-only"
                          />
                          <div
                            className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                              testConfig.testType === test.key
                                ? `border-${test.color}-500 bg-${test.color}-500 shadow-lg shadow-${test.color}-500/25`
                                : 'border-gray-500 bg-gray-700/50 hover:border-gray-400 hover:bg-gray-600/50'
                            }`}
                          >
                            {testConfig.testType === test.key && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
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

          {/* 测试配置 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">测试配置</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 并发用户数 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  并发用户数
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={testConfig.users}
                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-10 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="1000"
                    placeholder="用户数"
                  />
                </div>
              </div>

              {/* 测试时长 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  测试时长 (秒)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={testConfig.duration}
                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-10 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="10"
                    max="3600"
                    placeholder="时长"
                  />
                </div>
              </div>

              {/* 加压时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  加压时间 (秒)
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={testConfig.rampUp}
                    onChange={(e) => setTestConfig((prev: StressTestConfig) => ({ ...prev, rampUp: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-10 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="300"
                    placeholder="加压时间"
                  />
                </div>
              </div>
            </div>

            {/* 快速模板按钮 */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-300 mr-2">快速模板:</span>
              <button
                type="button"
                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: 5, duration: 30, testType: 'gradual' }))}
                className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30 transition-colors"
              >
                轻量测试
              </button>
              <button
                type="button"
                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: 20, duration: 60, testType: 'gradual' }))}
                className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full hover:bg-yellow-500/30 transition-colors"
              >
                中等负载
              </button>
              <button
                type="button"
                onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, users: 50, duration: 120, testType: 'stress' }))}
                className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
              >
                重负载
              </button>
            </div>
          </div>
        </div>

        {/* 测试控制和结果 */}
        <div className="space-y-6">
          {/* 测试控制面板 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">压力测试控制</h3>

            {!isRunning ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-300">
                  <p>并发用户: {testConfig.users} 个</p>
                  <p>测试时长: {testConfig.duration} 秒</p>
                  <p>测试类型: {
                    testConfig.testType === 'gradual' ? '梯度加压' :
                    testConfig.testType === 'spike' ? '峰值测试' :
                    testConfig.testType === 'constant' ? '恒定负载' : '压力极限'
                  }</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url.trim()}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Play className="w-5 h-5" />
                  <span>开始压力测试</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                  </div>
                  <p className="text-sm font-medium text-white">压力测试中...</p>
                  <p className="text-sm text-gray-300">{testProgress}</p>
                </div>

                <button
                  type="button"
                  onClick={handleStopTest}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>停止测试</span>
                </button>
              </div>
            )}
          </div>

          {/* 实时监控 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">实时监控</h3>

            {!isRunning && testData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p>点击"开始测试"查看实时数据</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 测试进度 */}
                <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-medium text-white">测试进度</span>
                    <span className="text-sm text-gray-300">{testProgress}</span>
                  </div>
                  <div className="w-full bg-gray-600/50 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full transition-all duration-300 animate-pulse w-1/2"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="lg:col-span-1">
          {/* 快速操作 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleApplyTemplate('light-load')}
                className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center space-x-2"
              >
                <span className="text-green-400">🟢</span>
                <span>轻量测试 (30s)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('medium-load')}
                className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center space-x-2"
              >
                <span className="text-yellow-400">🟡</span>
                <span>中等负载 (60s)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('heavy-load')}
                className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center space-x-2"
              >
                <span className="text-red-400">🟠</span>
                <span>重负载 (120s)</span>
              </button>
              <hr className="my-3 border-gray-600" />
              <button
                type="button"
                onClick={() => handleExportReport('html')}
                className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>导出报告</span>
              </button>
            </div>
          </div>

          {/* 测试引擎信息 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试引擎</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">真实网络测试</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">准确性能指标</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-sm text-gray-300">实时错误检测</span>
              </div>
              {!browserCapabilities.fetch && (
                <div className="mt-3 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-300">建议使用桌面版获得最佳性能</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 性能建议 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">性能建议</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                <span>建议测试时长不超过5分钟</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                <span>并发数建议从小到大逐步增加</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                <span>关注平均响应时间变化趋势</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                <span>成功率低于95%需要关注</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 性能指标 */}
      {result && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">详细测试结果</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleExportReport('html')}
                className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                title="导出HTML报告"
              >
                <FileText className="w-4 h-4" />
                <span>HTML</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportReport('csv')}
                className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                title="导出CSV数据"
              >
                <BarChart3 className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportReport('json')}
                className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                title="导出JSON数据"
              >
                <Download className="w-4 h-4" />
                <span>JSON</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <div className="text-2xl font-bold text-blue-400">{result.metrics.totalRequests}</div>
              <div className="text-sm text-blue-300">总请求数</div>
            </div>
            <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{result.metrics.successfulRequests}</div>
              <div className="text-sm text-green-300">成功请求</div>
            </div>
            <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <div className="text-2xl font-bold text-orange-400">{result.metrics.averageResponseTime}ms</div>
              <div className="text-sm text-orange-300">平均响应时间</div>
            </div>
            <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">
                {typeof result.metrics.errorRate === 'string'
                  ? result.metrics.errorRate
                  : (result.metrics.errorRate || 0).toFixed(1)
                }%
              </div>
              <div className="text-sm text-red-300">错误率</div>
            </div>
          </div>
        </div>
      )}

      {/* 简化性能指标（向后兼容） */}
      {metrics && !result && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <div className="text-2xl font-bold text-blue-400">{metrics.totalRequests}</div>
              <div className="text-sm text-blue-300">总请求数</div>
            </div>
            <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{metrics.successfulRequests}</div>
              <div className="text-sm text-green-300">成功请求</div>
            </div>
            <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
              <div className="text-2xl font-bold text-orange-400">{metrics.averageResponseTime}ms</div>
              <div className="text-sm text-orange-300">平均响应时间</div>
            </div>
            <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">
                {typeof metrics.errorRate === 'string'
                  ? metrics.errorRate
                  : (metrics.errorRate || 0).toFixed(1)
                }%
              </div>
              <div className="text-sm text-red-300">错误率</div>
            </div>
          </div>
        </div>
      )}

      {/* 高级测试图表 */}
      {(testData.length > 0 || result) && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <AdvancedStressTestChart
            data={testData.map((point: any) => ({
              time: new Date(point.timestamp).toLocaleTimeString(),
              timestamp: point.timestamp,
              responseTime: point.responseTime,
              throughput: point.rps || point.throughput,
              errors: point.errors,
              users: point.users,
              p95ResponseTime: point.p95ResponseTime,
              errorRate: point.errorRate,
              phase: point.phase || 'steady'
            }))}
            showAdvancedMetrics={true}
            height={400}
            theme="dark"
            interactive={true}
            realTime={testStatus === 'running'}
          />
        </div>
      )}

      {/* 测试日志 */}
      {isRunning && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">实时测试日志</h3>
          <div className="bg-gray-900/80 text-green-400 p-4 rounded-lg font-mono text-sm h-40 overflow-y-auto border border-gray-700">
            <div>[{new Date().toLocaleTimeString()}] 🚀 压力测试开始...</div>
            <div>[{new Date().toLocaleTimeString()}] 📊 测试配置: {testConfig.users}用户, {testConfig.duration}秒, {testConfig.testType}模式</div>
            <div>[{new Date().toLocaleTimeString()}] ⏳ 测试进行中...</div>
            <div>[{new Date().toLocaleTimeString()}] 📈 正在收集性能数据...</div>
            {testProgress && (
              <div>[{new Date().toLocaleTimeString()}] 📋 {testProgress}</div>
            )}
          </div>
        </div>
      )}

      {/* 测试结果摘要 */}
      {result && testStatus === 'completed' && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试结果摘要</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="text-blue-400 text-sm font-medium">平均响应时间</div>
              <div className="text-white text-2xl font-bold">
                {result.metrics?.averageResponseTime?.toFixed(0) || 0}ms
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="text-green-400 text-sm font-medium">吞吐量</div>
              <div className="text-white text-2xl font-bold">
                {result.metrics?.throughput?.toFixed(1) || 0} req/s
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="text-yellow-400 text-sm font-medium">错误率</div>
              <div className="text-white text-2xl font-bold">
                {typeof result.metrics?.errorRate === 'string'
                  ? result.metrics.errorRate
                  : (result.metrics?.errorRate || 0).toFixed(2)
                }%
              </div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="text-purple-400 text-sm font-medium">总请求数</div>
              <div className="text-white text-2xl font-bold">
                {result.metrics?.totalRequests || 0}
              </div>
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => handleExportReport('json')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出 JSON</span>
            </button>
            <button
              onClick={() => handleExportReport('csv')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>导出 CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* 登录提示组件 */}
      {LoginPromptComponent}
    </div>
  );
};

export default StressTest;
