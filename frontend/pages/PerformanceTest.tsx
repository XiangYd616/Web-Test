import { CheckCircle, Clock, Gauge, Image, Play, Smartphone, Timer, Zap } from 'lucide-react';
import type { useEffect, useState, FC } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import TestHistory from '../components/common/TestHistory';
import { URLInput } from '../components/ui/URLInput';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';

// 性能测试相关类型定义
type TestMode = 'basic' | 'standard' | 'comprehensive' | 'lighthouse';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';
type NetworkCondition = 'fast-3g' | 'slow-3g' | '4g' | 'wifi' | 'cable' | 'no-throttling';
type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'both';
type TestEngine = 'pagespeed' | 'gtmetrix' | 'webpagetest' | 'lighthouse' | 'local';

// Core Web Vitals 指标
interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  si: number; // Speed Index
}

// 性能测试结果接口
interface PerformanceTestResult {
  id: string;
  url: string;
  timestamp: string;
  engine: TestEngine;
  device: DeviceType;
  location: string;
  overallScore: number;
  coreWebVitals: CoreWebVitals;
  metrics: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    pageSize: number;
    requests: number;
    domElements: number;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings: number;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  screenshots?: string[];
  videoUrl?: string;
  waterfallUrl?: string;
  reportUrl?: string;
}

interface TestHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  engine: TestEngine;
  overallScore: number;
  loadTime: number;
  status: 'completed' | 'failed';
}

// 保持与现有配置兼容的接口
interface PerformanceTestConfig {
  url: string;
  mode: TestMode;
  checkPageSpeed: boolean;
  checkCoreWebVitals: boolean;
  checkResourceOptimization: boolean;
  checkCaching: boolean;
  checkCompression: boolean;
  checkImageOptimization: boolean;
  checkJavaScriptOptimization: boolean;
  checkCSSOptimization: boolean;
  checkMobilePerformance: boolean;
  checkAccessibility: boolean;
  device: 'desktop' | 'mobile' | 'both';
  // 新增的高级配置
  testMode?: TestMode;
  networkCondition?: NetworkCondition;
  engine?: TestEngine;
  location?: string;
  runs?: number;
  timeout?: number;
  includeScreenshots?: boolean;
  includeVideo?: boolean;
  includeWaterfall?: boolean;
  blockAds?: boolean;
  blockTrackers?: boolean;
  customUserAgent?: string;
  customHeaders?: Record<string, string>;
  basicAuth?: {
    username: string;
    password: string;
  };
}

const PerformanceTest: React.FC = () => {
  // 登录检查
  const {
    LoginPromptComponent
  } = useAuthCheck({
    feature: "性能测试",
    description: "使用性能测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 标签页状态管理
  const [activeTab, setActiveTab] = useState<'test' | 'history'>(() => {
    return (localStorage.getItem('performanceTest_activeTab') as 'test' | 'history') || 'test';
  });

  const [testConfig, setTestConfig] = useState<PerformanceTestConfig>({
    url: '',
    mode: 'standard',
    checkPageSpeed: true,
    checkCoreWebVitals: true,
    checkResourceOptimization: true,
    checkCaching: true,
    checkCompression: true,
    checkImageOptimization: true,
    checkJavaScriptOptimization: false,
    checkCSSOptimization: false,
    checkMobilePerformance: true,
    checkAccessibility: false,
    device: 'both'
  });

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<PerformanceTestResult | null>(null);

  // 使用测试进度监控Hook
  const {
    progress,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    cancelTest,
    error: progressError
  } = useTestProgress(currentTestId || undefined, {
    onProgress: (progressData) => {
      setTestStatus(progressData.status as TestStatusType);
    },
    onComplete: (result) => {
      setTestResult(result);
      setTestStatus('completed');
      recordTestCompletion('performance');
    },
    onError: (error) => {
      setTestStatus('failed');
      console.error('测试失败:', error);
    }
  });

  // 保存标签页状态到 localStorage
  useEffect(() => {
    localStorage.setItem('performanceTest_activeTab', activeTab);
  }, [activeTab]);

  // 处理测试选择和重新运行
  const handleTestSelect = (test: any) => {
    console.log('选择测试:', test);
    // 可以在这里加载选中的测试配置
  };

  const handleTestRerun = (test: any) => {
    console.log('重新运行测试:', test);
    // 可以在这里重新运行选中的测试
  };

  // 开始测试的处理函数
  const handleStartTest = async () => {
    if (!testConfig.url) {
      console.warn('请输入要测试的URL');
      return;
    }

    setTestStatus('starting');
    setTestResult(null);

    try {
      console.log('开始性能测试:', testConfig);

      // 构建测试配置
      const performanceConfig = {
        device: testConfig.device === 'both' ? 'desktop' : testConfig.device,
        network_condition: testConfig.networkCondition || 'no-throttling',
        lighthouse_config: {
          categories: ['performance'],
          throttling: testConfig.networkCondition || 'none'
        },
        custom_metrics: []
      };

      // 执行性能测试
      const response = await testApiService.executePerformanceTest(
        testConfig.url,
        performanceConfig
      );

      if (response.success) {
        const testId = response.data.id || response.data.testId;
        setCurrentTestId(testId);
        setTestStatus('running');

        // 开始监控测试进度
        if (testId) {
          startMonitoring(testId);
        }
      } else {
        throw new Error(response.message || '启动测试失败');
      }

    } catch (error) {
      console.error('性能测试失败:', error);
      setTestStatus('failed');
    }
  };

  // 停止测试
  const handleStopTest = async () => {
    if (currentTestId) {
      try {
        await cancelTest();
        setTestStatus('idle');
        setCurrentTestId(null);
      } catch (error) {
        console.error('停止测试失败:', error);
      }
    }
  };

  // 性能检测项目
  const performanceTests = [
    {
      key: 'checkCoreWebVitals',
      name: 'Core Web Vitals',
      description: '检测LCP、FID、CLS等核心网页指标',
      icon: Gauge,
      color: 'green',
      estimatedTime: '15-30秒'
    },
    {
      key: 'checkPageSpeed',
      name: '页面速度',
      description: '检测页面加载速度和响应时间',
      icon: Timer,
      color: 'blue',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkResourceOptimization',
      name: '资源优化',
      description: '检查资源加载优化和压缩',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '20-40秒'
    },
    {
      key: 'checkImageOptimization',
      name: '图片优化',
      description: '检查图片压缩和格式优化',
      icon: Image,
      color: 'pink',
      estimatedTime: '20-30秒'
    },
    {
      key: 'checkCaching',
      name: '缓存策略',
      description: '检查缓存配置和策略',
      icon: Clock,
      color: 'purple',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkMobilePerformance',
      name: '移动性能',
      description: '检查移动端性能表现',
      icon: Smartphone,
      color: 'red',
      estimatedTime: '30-60秒'
    }
  ];

  return (
    <div className="space-y-4 dark-page-scrollbar">
      <div className="space-y-6">
        {/* 完整的头部组件 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-700/50 shadow-2xl">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

          {/* 装饰性几何图形 */}
          <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-2xl"></div>

          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {/* 图标和状态指示器 */}
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  {testStatus === 'running' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-gray-900"></div>
                  )}
                </div>

                {/* 标题和描述 */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">性能测试</h1>
                    {testStatus === 'running' && (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm font-medium">测试进行中</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-300 text-lg">全面分析网站性能表现和优化建议</p>
                  {testConfig.url && (
                    <div className="mt-3 flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">目标:</span>
                      <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                        {testConfig.url}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧控制按钮 */}
              <div className="flex items-center space-x-3">
                {/* 模式切换按钮 */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                  className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg border border-gray-600/50 transition-all duration-200 text-sm"
                >
                  {isAdvancedMode ? '简化模式' : '高级模式'}
                </button>

                {/* 标签页切换 */}
                <div className="flex bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
                  <button
                    type="button"
                    onClick={() => setActiveTab('test')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'test'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                      }`}
                  >
                    性能测试
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                      }`}
                  >
                    测试历史
                  </button>
                </div>

                {/* 测试控制按钮 */}
                {testStatus === 'running' || isMonitoring ? (
                  <button
                    type="button"
                    onClick={handleStopTest}
                    className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>停止测试</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartTest}
                    disabled={!testConfig.url || testStatus === 'starting'}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                  >
                    <Play className="w-4 h-4" />
                    <span>{testStatus === 'starting' ? '启动中...' : '开始测试'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 测试进度指示器 */}
            {(testStatus === 'running' || isMonitoring) && progress && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-300 text-sm">{progress.message}</span>
                  </div>
                  <span className="text-blue-400 text-sm font-medium">{progress.progress}%</span>
                </div>

                {/* 进度条 */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 错误显示 */}
            {(testStatus === 'failed' || progressError) && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <h4 className="text-red-400 font-medium">测试失败</h4>
                    <p className="text-red-300 text-sm mt-1">
                      {progressError || '测试过程中发生错误，请重试'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 测试结果显示 */}
            {testStatus === 'completed' && testResult && (
              <div className="mt-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <h3 className="text-white text-lg font-semibold mb-4">测试结果</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {testResult.overallScore || 0}
                    </div>
                    <div className="text-gray-400 text-sm">总体得分</div>
                  </div>

                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">
                      {testResult.metrics?.loadTime || 0}ms
                    </div>
                    <div className="text-gray-400 text-sm">加载时间</div>
                  </div>

                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">
                      {testResult.metrics?.requests || 0}
                    </div>
                    <div className="text-gray-400 text-sm">请求数量</div>
                  </div>
                </div>

                {/* Core Web Vitals */}
                {testResult.coreWebVitals && (
                  <div className="mb-6">
                    <h4 className="text-white font-medium mb-3">Core Web Vitals</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-700/30 p-3 rounded">
                        <div className="text-lg font-semibold text-yellow-400">
                          {testResult.coreWebVitals.lcp}ms
                        </div>
                        <div className="text-gray-400 text-xs">LCP</div>
                      </div>
                      <div className="bg-gray-700/30 p-3 rounded">
                        <div className="text-lg font-semibold text-green-400">
                          {testResult.coreWebVitals.fid}ms
                        </div>
                        <div className="text-gray-400 text-xs">FID</div>
                      </div>
                      <div className="bg-gray-700/30 p-3 rounded">
                        <div className="text-lg font-semibold text-blue-400">
                          {testResult.coreWebVitals.cls}
                        </div>
                        <div className="text-gray-400 text-xs">CLS</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 测试标签页内容 */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            {/* URL输入 */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">性能测试配置</h3>
              <URLInput
                value={testConfig.url}
                onChange={(e) => setTestConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="输入要测试的网站URL..."
                className="mb-4"
              />

              {/* 性能检测项目 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceTests.map((test) => {
                  const IconComponent = test.icon;
                  const isChecked = testConfig[test.key as keyof PerformanceTestConfig] as boolean;

                  return (
                    <div
                      key={test.key}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${isChecked
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      onClick={() => setTestConfig(prev => ({
                        ...prev,
                        [test.key]: !prev[test.key as keyof PerformanceTestConfig]
                      }))}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-${test.color}-500/20`}>
                          <IconComponent className={`w-5 h-5 text-${test.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{test.name}</h4>
                          <p className="text-gray-400 text-sm mt-1">{test.description}</p>
                          <p className="text-gray-500 text-xs mt-2">预计时间: {test.estimatedTime}</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                          }`}>
                          {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 历史标签页内容 */}
        {activeTab === 'history' && (
          <div className="mt-6">
            <TestHistory
              testType="performance"
              onTestSelect={handleTestSelect}
              onTestRerun={handleTestRerun}
            />
          </div>
        )}

        {/* 登录提示组件 */}
        {LoginPromptComponent}
      </div>
    </div>
  );
};

export default PerformanceTest;