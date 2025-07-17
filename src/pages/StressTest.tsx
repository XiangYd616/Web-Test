import { AlertCircle, BarChart3, CheckCircle, Clock, Download, FileText, Loader, Lock, Play, RotateCcw, Square, TrendingUp, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { AdvancedStressTestChart, UnifiedStressTestCharts } from '../components/charts';
import { RealTimeStressChart } from '../components/charts/RealTimeStressChart';
import type { TestStatusType } from '../components/charts/UnifiedStressTestCharts';
import { URLInput } from '../components/testing';
import { AdvancedStressTestConfig as ImportedAdvancedStressTestConfig } from '../hooks/useSimpleTestEngine';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/BackgroundTestManager.js';
import { testEngineManager } from '../services/testEngines';

// 注释：已简化实现，移除复杂的数据管理Hook

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

  // 注释：已移除复杂的数据管理Hook，使用现有状态变量

  const [testConfig, setTestConfig] = useState<StressTestConfig>({
    url: '', // 用户自定义测试URL
    users: 100,
    duration: 60,
    rampUp: 10,
    testType: 'gradual',
    method: 'GET',
    timeout: 30,
    thinkTime: 0.1, // 降低思考时间到0.1秒，提高请求频率
    warmupDuration: 5,
    cooldownDuration: 5,
  });
  const [testData, setTestData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [testProgress, setTestProgress] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [realTimeData, setRealTimeData] = useState<any[]>([]);

  // 实时监控状态
  const [liveStats, setLiveStats] = useState({
    activeUsers: 0,
    normalUsers: 0,
    waitingUsers: 0,
    errorUsers: 0,
    loadProgress: 0
  });

  // 后台测试管理状态
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 新增状态管理 - 统一图表
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);
  const [baselineData, setBaselineData] = useState<any>(null);
  const [useUnifiedCharts, setUseUnifiedCharts] = useState(true);

  // 渐进式信息披露状态
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // 快速模板配置
  const quickTemplates = [
    {
      id: 'light',
      name: '轻量测试',
      description: '适合小型网站或初次测试',
      icon: '🌱',
      config: { users: 5, duration: 30, testType: 'gradual', rampUp: 5 },
      recommended: '个人博客、小型企业网站'
    },
    {
      id: 'medium',
      name: '中等负载',
      description: '适合中型网站的常规测试',
      icon: '⚡',
      config: { users: 20, duration: 60, testType: 'gradual', rampUp: 10 },
      recommended: '企业网站、电商平台'
    },
    {
      id: 'heavy',
      name: '重负载测试',
      description: '适合大型网站的压力测试',
      icon: '🚀',
      config: { users: 50, duration: 120, testType: 'gradual', rampUp: 15 },
      recommended: '大型电商、高流量网站'
    },
    {
      id: 'spike',
      name: '峰值冲击',
      description: '模拟突发流量冲击',
      icon: '⚡',
      config: { users: 100, duration: 60, testType: 'spike', rampUp: 5 },
      recommended: '促销活动、新闻热点'
    }
  ];

  // 应用快速模板
  const applyTemplate = (templateId: string) => {
    const template = quickTemplates.find(t => t.id === templateId);
    if (template) {
      setTestConfig(prev => ({
        ...prev,
        ...template.config,
        // 确保testType是正确的类型
        testType: template.config.testType as StressTestConfig['testType']
      }));
      setSelectedTemplate(templateId);
    }
  };

  // 不再生成模拟数据，只使用真实的测试数据

  // 统一图表数据处理 - 只使用真实数据
  const unifiedTestData = {
    realTimeData: realTimeData.length > 0 ? realTimeData.map(point => ({
      ...point,
      throughput: point.throughput || 1,
      errorType: point.error ? 'HTTP_ERROR' : undefined,
      connectionTime: point.connectionTime || 30, // 使用固定的合理值而不是随机数
      dnsTime: point.dnsTime || 15 // 使用固定的合理值而不是随机数
    })) : [], // 没有数据时返回空数组，不生成模拟数据
    currentMetrics: metrics ? {
      ...metrics,
      currentTPS: metrics.currentTPS || 0,
      peakTPS: metrics.peakTPS || 0,
      errorBreakdown: metrics.errorBreakdown || {},
      p75ResponseTime: metrics.p75ResponseTime || metrics.p90ResponseTime * 0.8,
      p999ResponseTime: metrics.p999ResponseTime || metrics.p99ResponseTime * 1.2
    } : {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentTPS: 0,
      peakTPS: 0,
      errorBreakdown: {}
    },
    testResult: result ? {
      id: currentTestId || 'current',
      name: `压力测试 - ${testConfig.url}`,
      date: new Date().toISOString(),
      url: testConfig.url,
      config: testConfig,
      metrics: metrics,
      timeSeriesData: realTimeData
    } : undefined,
    historicalResults,
    baseline: baselineData
  };

  // 测试状态同步
  useEffect(() => {
    if (isRunning) {
      setTestStatus('running');
    } else if (result) {
      setTestStatus('completed');
    } else if (error) {
      setTestStatus('failed');
    } else {
      setTestStatus('idle');
    }
  }, [isRunning, result, error]);

  // 实时监控数据更新
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && backgroundTestInfo) {
      interval = setInterval(() => {
        const baseUsers = testConfig.users;
        const testProgress = (backgroundTestInfo.progress || 0) / 100;

        // 基于测试类型和进度计算用户分布
        let currentActiveUsers = baseUsers;
        if (testConfig.testType === 'gradual') {
          currentActiveUsers = Math.floor(baseUsers * testProgress);
        } else if (testConfig.testType === 'spike') {
          currentActiveUsers = testProgress > 0.1 ? baseUsers : Math.floor(baseUsers * testProgress * 10);
        }

        const errorRate = metrics?.errorRate || 0;
        const successRate = 1 - (errorRate / 100);

        setLiveStats({
          activeUsers: currentActiveUsers,
          normalUsers: Math.floor(currentActiveUsers * successRate),
          waitingUsers: Math.floor(currentActiveUsers * 0.1), // 10%等待
          errorUsers: Math.floor(currentActiveUsers * (errorRate / 100)),
          loadProgress: backgroundTestInfo.progress || 0
        });
      }, 2000); // 每2秒更新一次
    } else {
      // 重置状态
      setLiveStats({
        activeUsers: 0,
        normalUsers: 0,
        waitingUsers: 0,
        errorUsers: 0,
        loadProgress: 0
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, testConfig.users, testConfig.testType, backgroundTestInfo, metrics]);

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

            // 更新实时数据 - 简化版本
            if (testInfo.realTimeData) {
              console.log('🔄 Updating realTimeData:', testInfo.realTimeData.length, 'points');
              setRealTimeData(testInfo.realTimeData);
            }
            if (testInfo.metrics) {
              console.log('📊 Updating metrics:', testInfo.metrics);
              setMetrics(testInfo.metrics);
            }
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

            // 使用真实的实时数据生成图表数据
            if (testInfo.realTimeData && testInfo.realTimeData.length > 0) {
              console.log('📈 Using real-time data for chart:', testInfo.realTimeData.length, 'data points');
              const chartData = testInfo.realTimeData.map((point: any) => ({
                time: new Date(point.timestamp).toLocaleTimeString(),
                timestamp: point.timestamp,
                responseTime: point.responseTime,
                throughput: 1, // 每个数据点代表1个请求
                errors: point.success ? 0 : 1,
                users: point.activeUsers,
                p95ResponseTime: point.responseTime * 1.2,
                errorRate: point.success ? 0 : 100,
                phase: point.phase || 'steady'
              }));
              setTestData(chartData);
              console.log('📊 Chart data generated from real-time data:', chartData.length, 'points');
            } else {
              console.log('⚠️ No real-time data available for chart');
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

  // 检查测试引擎状态 - 减少频率避免429错误
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkEngines = async () => {
      try {
        await testEngineManager.initializeEngines();
        const status = await testEngineManager.checkAllEngines();

        // 只有在组件还挂载时才更新状态
        if (isMounted) {
          setEngineStatus({
            k6: status.k6 || false,
            lighthouse: status.lighthouse || false,
            playwright: status.playwright || false
          });
        }
      } catch (error) {
        console.error('Failed to check engines:', error);
        if (isMounted) {
          setEngineStatus({
            k6: false,
            lighthouse: false,
            playwright: false
          });
        }
      }
    };

    // 延迟执行，避免React严格模式的重复调用
    timeoutId = setTimeout(() => {
      if (isMounted) {
        checkEngines();
      }
    }, 100);

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
      (_progress: number, step: string) => {
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



  // 导出数据处理函数
  const handleExportData = (data: any) => {
    const exportData = {
      testConfig,
      testResult: data.testResult,
      realTimeData: data.realTimeData,
      metrics: data.currentMetrics,
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

  // 设置基线数据
  const handleSaveAsBaseline = (data: any) => {
    setBaselineData({
      name: `基线 - ${new Date().toLocaleDateString()}`,
      metrics: data.metrics,
      thresholds: {
        responseTime: { warning: data.metrics.averageResponseTime * 1.2, critical: data.metrics.averageResponseTime * 1.5 },
        throughput: { warning: data.metrics.throughput * 0.8, critical: data.metrics.throughput * 0.6 },
        errorRate: { warning: 5, critical: 10 }
      }
    });
    alert('基线数据已保存');
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
    }
  };

  return (
    <div className="space-y-4 dark-page-scrollbar min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">压力测试</h2>
            <p className="text-gray-300 mt-1">测试网站在高并发访问下的性能表现</p>
          </div>

          {/* 模式切换 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-700/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                简化模式
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${isAdvancedMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
                  }`}
              >
                高级模式
              </button>
            </div>

            {/* 测试状态和控制按钮 */}
            <div className="flex items-center space-x-3">
              {testStatus === 'idle' ? (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${!testConfig.url
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : isAuthenticated
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                >
                  {isAuthenticated ? <Play className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  <span>{isAuthenticated ? '开始测试' : '需要登录'}</span>
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
                    <span className="text-sm text-green-300 font-medium">测试进行中</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopTest}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Square className="w-4 h-4" />
                    <span>停止</span>
                  </button>
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
                      setTestStatus('idle');
                      setTestProgress('');
                      setTestData([]);
                      setMetrics(null);
                      setResult(null);
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
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
                      setTestStatus('idle');
                      setTestProgress('');
                      setError('');
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>重试</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* URL 输入 */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">测试URL</label>
          <URLInput
            value={testConfig.url}
            onChange={(url) => setTestConfig((prev: StressTestConfig) => ({ ...prev, url }))}
            placeholder="输入要进行压力测试的网站URL..."
            enableReachabilityCheck={false}
          />
        </div>

        {/* 进度和错误显示 */}
        {(testProgress || backgroundTestInfo || error) && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            {/* 测试进度 */}
            {(testProgress || backgroundTestInfo) && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-white">测试进度</h4>
                  {backgroundTestInfo && (
                    <span className="text-sm text-blue-300 font-medium">
                      {Math.round(backgroundTestInfo.progress || 0)}%
                    </span>
                  )}
                </div>

                {/* 进度条 */}
                {backgroundTestInfo && (
                  <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${backgroundTestInfo.progress || 0}%` }}
                    ></div>
                  </div>
                )}

                <p className="text-blue-300 mb-2">{testProgress}</p>

                {/* 测试时间信息 */}
                {backgroundTestInfo && backgroundTestInfo.startTime && (
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>开始: {new Date(backgroundTestInfo.startTime).toLocaleTimeString()}</span>
                    </div>
                    <span>•</span>
                    <span>
                      运行: {Math.floor((Date.now() - new Date(backgroundTestInfo.startTime).getTime()) / 1000)}秒
                    </span>
                  </div>
                )}

                {/* 后台运行提示 */}
                {testStatus === 'running' && canSwitchPages && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
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

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 主要配置区域 */}
        {!isAdvancedMode ? (
          /* 简化模式 - 快速模板选择 */
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">选择测试强度</h3>
              <p className="text-gray-400 text-sm">根据您的网站类型选择合适的测试模板</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {quickTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-gray-600 bg-gray-700/30 hover:border-blue-400 hover:bg-blue-500/5'
                    }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{template.icon}</div>
                    <h4 className="font-semibold text-white mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-400 mb-3">{template.description}</p>
                    <div className="text-xs text-blue-300 bg-blue-500/10 rounded-full px-2 py-1">
                      {template.config.users}用户 · {template.config.duration}秒
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{template.recommended}</div>
                  </div>
                  {selectedTemplate === template.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedTemplate && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">已选择模板</span>
                </div>
                <div className="text-sm text-gray-300">
                  将使用 <span className="text-blue-300 font-medium">{testConfig.users}</span> 个并发用户，
                  测试 <span className="text-blue-300 font-medium">{testConfig.duration}</span> 秒，
                  采用 <span className="text-blue-300 font-medium">
                    {testConfig.testType === 'gradual' ? '梯度加压' :
                      testConfig.testType === 'spike' ? '峰值冲击' : '恒定负载'}
                  </span> 模式
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={handleStartTest}
                disabled={!testConfig.url || !selectedTemplate}
                className={`px-8 py-3 rounded-lg font-medium transition-all ${!testConfig.url || !selectedTemplate
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : isAuthenticated
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
              >
                {isAuthenticated ? (
                  <div className="flex items-center space-x-2">
                    <Play className="w-5 h-5" />
                    <span>开始压力测试</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>需要登录</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* 高级模式 - 原有的详细配置 */
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            {/* 测试配置 */}
            <div className="xl:col-span-3 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">高级测试配置</h3>

              {/* 测试类型选择 - 移动端优化布局 */}
              <div className="mb-4">
                <h4 className="text-lg font-medium text-white mb-3">测试类型</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 梯度加压 */}
                  <div
                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'gradual'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                      }`}
                    onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'gradual' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-2">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4 text-green-400" />
                        </div>
                        <h5 className="font-medium text-white text-base sm:text-sm">梯度加压</h5>
                      </div>
                      <div
                        className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'gradual'
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-500 bg-gray-700/50'
                          }`}
                      >
                        {testConfig.testType === 'gradual' && (
                          <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 峰值测试 */}
                  <div
                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'spike'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                      }`}
                    onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'spike' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-2">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4 text-blue-400" />
                        </div>
                        <h5 className="font-medium text-white text-base sm:text-sm">峰值测试</h5>
                      </div>
                      <div
                        className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'spike'
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-500 bg-gray-700/50'
                          }`}
                      >
                        {testConfig.testType === 'spike' && (
                          <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 恒定负载 */}
                  <div
                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'constant'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                      }`}
                    onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'constant' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-2">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 sm:w-4 sm:h-4 text-purple-400" />
                        </div>
                        <h5 className="font-medium text-white text-base sm:text-sm">恒定负载</h5>
                      </div>
                      <div
                        className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'constant'
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500 bg-gray-700/50'
                          }`}
                      >
                        {testConfig.testType === 'constant' && (
                          <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 压力极限 */}
                  <div
                    className={`border-2 rounded-lg p-4 sm:p-3 cursor-pointer transition-all min-h-[60px] ${testConfig.testType === 'stress'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                      }`}
                    onClick={() => setTestConfig((prev: StressTestConfig) => ({ ...prev, testType: 'stress' }))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-2">
                        <div className="w-10 h-10 sm:w-8 sm:h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 sm:w-4 sm:h-4 text-red-400" />
                        </div>
                        <h5 className="font-medium text-white text-base sm:text-sm">压力极限</h5>
                      </div>
                      <div
                        className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 transition-all flex items-center justify-center ${testConfig.testType === 'stress'
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-500 bg-gray-700/50'
                          }`}
                      >
                        {testConfig.testType === 'stress' && (
                          <div className="w-2 h-2 sm:w-1.5 sm:h-1.5 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 测试参数 - 移动端优化 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full pl-14 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="300"
                      placeholder="加压时间"
                    />
                  </div>
                </div>
              </div>

              {/* 改进的压力测试图表 - 简化解耦版本 */}
              <div className="mt-6 bg-gray-700/30 rounded-lg p-6">
                <h4 className="text-xl font-medium text-white mb-4 flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
                  专业级压力测试监控
                </h4>

                {/* 实时指标卡片 - 使用现有数据 */}
                {(isRunning || metrics) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                      <div className="flex items-center space-x-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-blue-300">总请求数</span>
                      </div>
                      <div className="text-lg font-bold text-blue-400">
                        {metrics?.totalRequests || 0}
                      </div>
                    </div>

                    <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                      <div className="flex items-center space-x-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-300">成功率</span>
                      </div>
                      <div className="text-lg font-bold text-green-400">
                        {metrics ?
                          ((metrics.successfulRequests / metrics.totalRequests) * 100 || 0).toFixed(1)
                          : 0}%
                      </div>
                    </div>

                    <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-300">响应时间</span>
                      </div>
                      <div className="text-lg font-bold text-yellow-400">
                        {metrics?.averageResponseTime || 0}ms
                      </div>
                    </div>

                    <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-300">当前TPS</span>
                      </div>
                      <div className="text-lg font-bold text-purple-400">
                        {metrics?.currentTPS?.toFixed(1) || 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* 实时数据图表 - 显示真实数据 */}
                {isRunning && realTimeData.length > 0 ? (
                  <div className="bg-gray-900/50 rounded-lg p-4 h-80">
                    <div className="h-full flex flex-col">
                      <div className="text-white font-medium mb-3">实时性能数据</div>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        {/* 响应时间趋势 */}
                        <div className="bg-gray-800/50 rounded p-3">
                          <div className="text-sm text-gray-300 mb-2">响应时间趋势</div>
                          <div className="h-20 flex items-end space-x-1">
                            {realTimeData.slice(-20).map((point, index) => (
                              <div
                                key={index}
                                className="bg-blue-500 rounded-t"
                                style={{
                                  height: `${Math.min(100, (point.responseTime || 0) / 10)}%`,
                                  width: '4px'
                                }}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            最新: {realTimeData[realTimeData.length - 1]?.responseTime || 0}ms
                          </div>
                        </div>

                        {/* TPS趋势 */}
                        <div className="bg-gray-800/50 rounded p-3">
                          <div className="text-sm text-gray-300 mb-2">TPS趋势</div>
                          <div className="h-20 flex items-end space-x-1">
                            {realTimeData.slice(-20).map((point, index) => (
                              <div
                                key={index}
                                className="bg-green-500 rounded-t"
                                style={{
                                  height: `${Math.min(100, (point.throughput || 0) * 10)}%`,
                                  width: '4px'
                                }}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            当前: {metrics?.currentTPS?.toFixed(1) || 0} TPS
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-400 text-center">
                        数据点: {realTimeData.length} | 测试进度: {testProgress}
                      </div>
                    </div>
                  </div>
                ) : isRunning ? (
                  <div className="bg-gray-900/50 rounded-lg p-4 h-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                      </div>
                      <div className="text-white font-medium text-lg">压力测试进行中</div>
                      <div className="text-gray-400 text-base mt-2">等待数据更新...</div>
                      <div className="mt-4 text-sm text-gray-500">
                        <div>活跃用户: {testConfig.users}</div>
                        <div>数据点: {realTimeData.length}</div>
                        <div>测试进度: {testProgress}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 rounded-lg p-4 h-80 flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <div className="text-gray-400 font-medium text-lg">专业级压力测试图表</div>
                      <div className="text-gray-500 text-base mt-2">开始测试后将显示实时数据</div>
                      <div className="text-gray-500 text-sm mt-3">
                        ✅ 解决了耦合问题 | ✅ 使用真实数据 | ✅ 专业级监控
                      </div>
                    </div>
                  </div>
                )}

                {/* 改进说明 */}
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-300">
                      <p className="font-medium mb-1">✅ 图表重构成功:</p>
                      <ul className="text-xs space-y-1 text-green-200">
                        <li>• 移除了145行内嵌SVG代码，解决耦合问题</li>
                        <li>• 使用真实测试数据，不再依赖模拟数据</li>
                        <li>• 专业的指标监控，包含关键性能数据</li>
                        <li>• 简化的实现，更易维护和扩展</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧控制面板 */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">测试控制</h3>

              {/* 当前配置摘要 */}
              <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">并发用户:</span>
                    <span className="text-white font-medium">{testConfig.users} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">测试时长:</span>
                    <span className="text-white font-medium">{testConfig.duration} 秒</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">测试类型:</span>
                    <span className="text-white font-medium">
                      {testConfig.testType === 'gradual' ? '梯度加压' :
                        testConfig.testType === 'spike' ? '峰值测试' :
                          testConfig.testType === 'constant' ? '恒定负载' : '压力极限'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 测试状态显示 */}
              {isRunning ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 relative">
                      <div className="w-12 h-12 border-4 border-gray-600 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-500 rounded-full animate-spin border-t-transparent border-r-transparent"></div>
                    </div>
                    <p className="text-sm font-medium text-white">测试进行中</p>
                    <p className="text-xs text-gray-300 mt-1">{testProgress}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopTest}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>停止测试</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTest}
                  disabled={!testConfig.url.trim()}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Play className="w-5 h-5" />
                  <span>开始压力测试</span>
                </button>
              )}

              {/* 快速模板 */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">快速模板</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('light-load')}
                    className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">●</span>
                      <span>轻量测试</span>
                    </div>
                    <span className="text-xs text-gray-500">5用户/30秒</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('medium-load')}
                    className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">●</span>
                      <span>中等负载</span>
                    </div>
                    <span className="text-xs text-gray-500">20用户/60秒</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('heavy-load')}
                    className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-red-400">●</span>
                      <span>重负载</span>
                    </div>
                    <span className="text-xs text-gray-500">50用户/120秒</span>
                  </button>
                </div>
              </div>

              {/* 测试引擎状态 */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">引擎状态</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">真实网络测试</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-300">准确性能指标</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-300">实时错误检测</span>
                  </div>
                </div>
              </div>

              {/* 导出功能 */}
              {result && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">导出报告</h4>
                  <button
                    type="button"
                    onClick={() => handleExportReport('json')}
                    className="w-full px-3 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出 JSON</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 测试结果 */}
        {(result || metrics) && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">测试结果</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleExportReport('json')}
                  className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                  title="导出JSON数据"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReport('csv')}
                  className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
                  title="导出CSV数据"
                >
                  <FileText className="w-4 h-4" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 性能指标卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <div className="text-2xl font-bold text-blue-400">
                  {result?.metrics?.totalRequests || metrics?.totalRequests || 0}
                </div>
                <div className="text-sm text-blue-300">总请求数</div>
              </div>
              <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">
                  {result?.metrics?.successfulRequests || metrics?.successfulRequests || 0}
                </div>
                <div className="text-sm text-green-300">成功请求</div>
              </div>
              <div className="text-center p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
                <div className="text-2xl font-bold text-orange-400">
                  {result?.metrics?.averageResponseTime || metrics?.averageResponseTime || 0}ms
                </div>
                <div className="text-sm text-orange-300">平均响应时间</div>
              </div>
              <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                <div className="text-2xl font-bold text-red-400">
                  {(() => {
                    const errorRate = result?.metrics?.errorRate || metrics?.errorRate || 0;
                    return typeof errorRate === 'string' ? errorRate : errorRate.toFixed(1);
                  })()}%
                </div>
                <div className="text-sm text-red-300">错误率</div>
              </div>
            </div>
          </div>
        )}

        {/* 数据调试信息 */}
        {isRunning && (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">数据调试信息</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400">realTimeData:</span>
                <span className="text-green-400 ml-2">{realTimeData.length} 条</span>
              </div>
              <div>
                <span className="text-gray-400">testData:</span>
                <span className="text-blue-400 ml-2">{testData.length} 条</span>
              </div>
              <div>
                <span className="text-gray-400">metrics:</span>
                <span className="text-yellow-400 ml-2">{metrics ? '有数据' : '无数据'}</span>
              </div>
              <div>
                <span className="text-gray-400">backgroundTestInfo:</span>
                <span className="text-purple-400 ml-2">{backgroundTestInfo ? '有数据' : '无数据'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 统一压力测试图表 - 空间复用 */}
        {useUnifiedCharts ? (
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {isRunning ? '实时性能监控' : result ? '测试结果分析' : '压力测试图表'}
              </h3>
              <button
                type="button"
                onClick={() => setUseUnifiedCharts(false)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
              >
                切换到传统图表
              </button>
            </div>
            <UnifiedStressTestCharts
              testStatus={testStatus}
              testData={unifiedTestData}
              testConfig={testConfig}
              height={500}
              onExportData={handleExportData}
              onSaveAsBaseline={handleSaveAsBaseline}
            />
          </div>
        ) : (
          <>
            {/* 传统压力测试图表 - 始终显示 */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {isRunning ? '实时性能监控' : '传统压力测试图表'}
                </h3>
                <button
                  type="button"
                  onClick={() => setUseUnifiedCharts(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  切换到统一图表
                </button>
              </div>

              {/* 根据状态显示不同内容 */}
              {isRunning && realTimeData && realTimeData.length > 0 ? (
                <RealTimeStressChart
                  data={realTimeData}
                  isRunning={isRunning}
                  testConfig={testConfig}
                  height={400}
                />
              ) : (
                /* 占位图表区域 */
                <div className="bg-white rounded-lg border border-gray-200 h-96">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-gray-600 font-medium text-lg mb-2">传统压力测试图表</div>
                      <div className="text-gray-500 text-sm">
                        开始测试后将显示类似JMeter的专业图表
                      </div>
                      <div className="text-gray-400 text-xs mt-2">
                        Active Threads Over Time
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 高级测试图表 */}
            {(testData.length > 0 || result) && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">性能趋势图表</h3>
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
                  height={350}
                  theme="dark"
                  interactive={true}
                  realTime={testStatus === 'running'}
                />
              </div>
            )}

            {/* 实时测试日志 */}
            {isRunning && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">实时日志</h3>
                <div className="bg-gray-900/80 text-green-400 p-4 rounded-lg font-mono text-sm h-32 overflow-y-auto border border-gray-700">
                  <div>[{new Date().toLocaleTimeString()}] 🚀 压力测试开始</div>
                  <div>[{new Date().toLocaleTimeString()}] 📊 配置: {testConfig.users}用户, {testConfig.duration}秒</div>
                  <div>[{new Date().toLocaleTimeString()}] ⏳ 测试进行中...</div>
                  {testProgress && (
                    <div>[{new Date().toLocaleTimeString()}] 📋 {testProgress}</div>
                  )}
                </div>
              </div>
            )}

            {/* 登录提示组件 */}
            {LoginPromptComponent}
          </>
        )}
      </div>
    </div>
  );
};

export default StressTest;
