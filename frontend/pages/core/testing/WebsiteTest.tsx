import { AlertTriangle, CheckCircle, Clock, Code, Download, Eye, Gauge, Globe, Loader, Lock, Play, RotateCcw, Search, Share2, Shield, Square, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';
import TestResults from '../components/TestResults';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthCheck } from '../../../components/auth/WithAuthCheck.tsx';
// // import TestCharts - 文件已删除
// 文件已删除;
import BaseTestPage from '../../../components/testing/BaseTestPage.tsx';
import URLInput from '../../../components/testing/URLInput';
import { ProgressBar } from '../../../components/ui/ProgressBar.tsx';
import { useUserStats } from '../../../hooks/useUserStats.ts';

// CSS样式已迁移到组件库中
// 进度条样式已集成到ProgressBar组件

// 合并性能测试配置
type TestMode = 'basic' | 'standard' | 'comprehensive' | 'lighthouse';
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

interface WebsiteTestConfig {
  url: string;
  testType: string;
  testTypes: {
    seo: boolean;
    security: boolean;
    compatibility: boolean;
    api: boolean;
    accessibility: boolean;
    performance: boolean; // 新增性能测试选项
  };
  // 增强的性能测试配置
  performanceConfig: {
    mode: TestMode;
    engine: TestEngine;
    device: DeviceType;
    networkCondition: NetworkCondition;
    location: string;
    includeScreenshots: boolean;
    includeFilmstrip: boolean;
    runs: number;
  };
  options: {
    device: string;
    location: string;
    throttling: string;
  };
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
  filmstrip?: Array<{
    timestamp: number;
    image: string;
  }>;
}

// 综合测试结果接口
interface ComprehensiveTestResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  performance?: PerformanceTestResult;
  seo?: any;
  security?: any;
  compatibility?: any;
  accessibility?: any;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
}

const WebsiteTest: React.FC = () => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  
  const runTest = async (config) => {
    setIsRunning(true);
    const result = await executeAsync(
      () => fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'performance', config })
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }
    );
    
    if (result && result.success) {
      setTestResult(result.data);
      // 轮询获取测试结果
      pollTestResult(result.data.executionId);
    }
    setIsRunning(false);
  };
  
  const pollTestResult = async (executionId) => {
    const interval = setInterval(async () => {
      const result = await executeAsync(
        () => fetch(`/api/tests/results/${executionId}`).then(res => res.json()),
        { context: 'TestExecution.pollResult' }
      );
      
      if (result && result.success && result.data.status === 'completed') {
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };
  const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [searchParams] = useSearchParams();

  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "网站综合测试",
    description: "使用网站测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<WebsiteTestConfig>({
    url: searchParams.get('url') || '',
    testType: 'website',
    testTypes: {
      seo: true,
      security: false,
      compatibility: false,
      api: false,
      accessibility: false,
      performance: true, // 默认启用性能测试
    },
    performanceConfig: {
      mode: 'standard',
      engine: 'lighthouse',
      device: 'both',
      networkCondition: '4g',
      location: 'beijing',
      includeScreenshots: true,
      includeFilmstrip: false,
      runs: 1,
    },
    options: {
      device: 'desktop',
      location: 'beijing',
      throttling: 'none'
    }
  });

  // 网站测试状态管理 - 使用统一的类型
  const [testStatus, setTestStatus] = useState<'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'stopped'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 兼容性状态
  const isRunning = testStatus === 'running' || testStatus === 'starting';

  const runTest = async (testConfig?: any) => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    setTestStatus('running');
    setProgress(0);
    setCurrentStep('正在初始化测试...');
    setError(null);

    try {
      // 模拟测试过程
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        setCurrentStep(`正在测试... ${i}%`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 模拟测试结果
      const mockResult = {
        id: `test_${Date.now()}`,
        url: config.url,
        timestamp: new Date().toISOString(),
        overallScore: Math.floor(Math.random() * 30) + 70,
        performance: Math.floor(Math.random() * 30) + 70,
        accessibility: Math.floor(Math.random() * 30) + 70,
        bestPractices: Math.floor(Math.random() * 30) + 70,
        seo: Math.floor(Math.random() * 30) + 70
      };

      setResults(mockResult);
      setTestHistory(prev => [mockResult, ...prev.slice(0, 9)]);
      setTestStatus('completed');
      setCurrentStep('测试完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败');
      setTestStatus('failed');
    }
  };

  const stopTest = async () => {
    setTestStatus('stopped');
    setCurrentStep('');
    setProgress(0);
  };

  const clearResults = () => {
    setResults(null);
    setTestStatus('idle');
    setCurrentStep('');
    setProgress(0);
  };

  const clearError = () => {
    setError(null);
  };

  // 处理测试选择（从历史记录）
  const handleTestSelect = (record: any) => {
    // 将历史记录转换为测试结果格式
    if (record.results) {
      setResults(record.results);
    }
  };

  // 处理测试重新运行
  const handleTestRerun = (record: any) => {
    // 从历史记录中恢复配置
    if (record.config) {
      setConfig(record.config);
    }
    if (record.url) {
      setConfig(prev => ({ ...prev, url: record.url }));
    }
  };

  // 监听测试状态变化
  useEffect(() => {
    if (isRunning) {
      setTestStatus('running');
    } else if (results) {
      setTestStatus('completed');

      // 调试：打印测试结果数据
      console.log('🔍 Website test results received:', results);
      console.log('📊 Overall score:', results.overallScore);
      console.log('🧪 Tests data:', results.tests);

      // 记录测试完成统计
      const success = !error && !!results;
      const score = results.overallScore || (results as any)?.performance?.score || (results as any)?.seo?.score || (results as any)?.security?.score;
      const duration = results.duration || (results as any)?.performance?.metrics?.loadTime || 30; // 默认30秒
      recordTestCompletion('网站综合测试', success, score, duration);
    } else if (error) {
      setTestStatus('failed');

      // 记录测试失败统计
      recordTestCompletion('网站综合测试', false);
    } else {
      setTestStatus('idle');
    }
  }, [isRunning, results, error, recordTestCompletion]);

  const testTypes = [
    {
      key: 'performance',
      name: '性能测试',
      icon: Gauge,
      description: '测试页面加载速度、Core Web Vitals和性能优化建议',
      color: 'blue',
      estimatedTime: '30-60秒',
      featured: true // 标记为主要功能
    },
    {
      key: 'seo',
      name: 'SEO分析',
      icon: Search,
      description: '检测搜索引擎优化状况，提供SEO改进建议',
      color: 'green',
      estimatedTime: '20-40秒'
    },
    {
      key: 'security',
      name: '安全检测',
      icon: Shield,
      description: '扫描常见安全漏洞和威胁',
      color: 'red',
      estimatedTime: '60-120秒'
    },
    {
      key: 'compatibility',
      name: '兼容性测试',
      icon: Globe,
      description: '检测跨浏览器和设备兼容性',
      color: 'purple',
      estimatedTime: '45-90秒'
    },
    {
      key: 'api',
      name: 'API测试',
      icon: Code,
      description: '测试API接口性能和可靠性',
      color: 'orange',
      estimatedTime: '30-60秒'
    },
    {
      key: 'accessibility',
      name: '可访问性',
      icon: Eye,
      description: '检测网站可访问性和无障碍设计',
      color: 'indigo',
      estimatedTime: '20-40秒'
    }
  ];

  const locations = [
    { value: 'beijing', label: '北京' },
    { value: 'shanghai', label: '上海' },
    { value: 'guangzhou', label: '广州' },
    { value: 'shenzhen', label: '深圳' },
    { value: 'hongkong', label: '香港' },
    { value: 'singapore', label: '新加坡' },
    { value: 'tokyo', label: '东京' },
    { value: 'seoul', label: '首尔' }
  ];

  const handleTestTypeChange = (type: keyof WebsiteTestConfig['testTypes']) => {
    setConfig(prev => ({
      ...prev,
      testTypes: {
        ...prev.testTypes,
        [type]: !prev.testTypes[type]
      }
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

    // 验证URL格式
    try {
      new URL(config.url);
    } catch (urlError) {
      return;
    }

    const selectedTests = Object.entries(config.testTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => type);

    if (selectedTests.length === 0) {
      
        return;
      }

    clearError();
    clearResults();
    setTestStatus('starting');

    // 准备高级测试配置
    const testConfig: any = {
      ...config,
      testType: 'website',
      options: {
        ...config.options,
        testTypes: config.testTypes
      }
    };

    try {
      await runTest(testConfig);
    } catch (err: any) {
      console.error('Website test failed:', err);
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

  // 移除模拟数据生成函数 - 使用真实API数据

  const generateMockRecommendations = (testType: string) => {
    const recommendations = {
      performance: [
        '优化图片大小和格式',
        '启用浏览器缓存',
        '压缩CSS和JavaScript文件',
        '使用CDN加速静态资源'
      ],
      seo: [
        '优化页面标题长度',
        '添加结构化数据',
        '改善内部链接结构',
        '优化移动端体验'
      ],
      security: [
        '添加Content Security Policy头部',
        '启用HSTS',
        '更新SSL证书配置',
        '修复发现的安全漏洞'
      ]
    };

    return recommendations[testType as keyof typeof recommendations] || [];
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const selectedTestsCount = Object.values(config.testTypes).filter(Boolean).length;
  const estimatedTime = selectedTestsCount * 45; // 平均45秒每个测试

  
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              操作失败
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BaseTestPage
      testType="performance"
      title="网站综合测试"
      description="全面检测网站的性能、安全性、SEO和用户体验"
      icon={Globe}
      historyTabLabel="测试历史"
      testStatus={testStatus === 'starting' ? 'running' : testStatus as 'idle' | 'running' | 'completed' | 'failed'}
      isTestDisabled={!config.url}
      onStartTest={handleStartTest}
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
      additionalComponents={LoginPromptComponent}
      testContent={
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">网站综合测试</h2>
                <p className="text-gray-300 mt-1">全方位分析您的网站性能、SEO、安全性和用户体验</p>
              </div>

              {/* 测试控制按钮 */}
              <div>
                {testStatus === 'idle' ? (
                  <button
                    type="button"
                    onClick={handleStartTest}
                    disabled={!config.url.trim() || selectedTestsCount === 0}
                    className={`btn btn-md flex items-center space-x-2 ${!config.url.trim() || selectedTestsCount === 0
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
                    <span>开始测试</span>
                  </button>
                ) : testStatus === 'starting' ? (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <Loader className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">正在启动...</span>
                  </div>
                ) : testStatus === 'running' ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium text-blue-300">
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
                      className="btn btn-md flex items-center space-x-2 btn-primary hover:btn-primary-dark"
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
                      className="btn btn-md flex items-center space-x-2 btn-primary hover:btn-primary-dark"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重试</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 详细进度显示 */}
            {(currentStep || isRunning) && (
              <div className="mt-4 space-y-3">
                {/* 当前步骤 */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-blue-300">测试进度</h4>
                    <span className="text-sm text-blue-200">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <ProgressBar
                      value={progress}
                      variant="primary"
                      size="md"
                      animated
                    />
                  </div>

                  <p className="text-sm text-blue-300">{currentStep}</p>

                  {/* 测试阶段和预计时间 */}
                  <div className="flex items-center justify-between mt-2 text-xs text-blue-200">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3" />
                      <span>状态: {testStatus}</span>
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

            {/* URL 输入 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">测试URL</label>
              <URLInput
                value={config.url}
                onChange={(url) => setConfig(prev => ({ ...prev, url }))}
                placeholder="输入要测试的网站URL..."
                enableReachabilityCheck={false}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 测试配置 */}
            <div className="lg:col-span-2 space-y-6">

              {/* 性能测试配置 */}
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Gauge className="w-5 h-5 mr-2 text-blue-400" />
                  性能测试配置
                </h3>

                <div className="space-y-4">
                  {/* 是否包含性能测试 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-white font-medium">包含性能测试</label>
                      <p className="text-sm text-gray-400">检测页面加载速度和Core Web Vitals</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.testTypes.performance}
                        onChange={(e) => setConfig(prev => ({ ...prev, includePerformance: e.target.checked }))}
                        className="sr-only peer"
                        aria-label="包含性能测试"
                        title="是否包含性能测试"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* 性能测试级别 */}
                  {config.testTypes.performance && (
                    <div>
                      <label className="block text-white font-medium mb-2">性能测试级别</label>
                      <select
                        value={config.performanceConfig.mode}
                        onChange={(e) => setConfig(prev => ({ ...prev, performanceLevel: e.target.value as 'basic' | 'standard' | 'comprehensive' }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="选择性能测试级别"
                        aria-label="性能测试级别"
                      >
                        <option value="basic">基础检测 - 页面速度</option>
                        <option value="standard">标准检测 - 包含Core Web Vitals</option>
                        <option value="comprehensive">全面检测 - 完整性能分析</option>
                      </select>
                      <p className="text-sm text-gray-400 mt-1">
                        {config.performanceConfig.mode === 'basic' && '快速检测页面加载时间和基本指标'}
                        {config.performanceConfig.mode === 'standard' && '包含Core Web Vitals和资源优化分析'}
                        {config.performanceConfig.mode === 'comprehensive' && '完整的性能分析，包含所有优化建议'}
                        {config.performanceConfig.mode === 'lighthouse' && '使用Google Lighthouse进行专业性能分析'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 测试类型选择 */}
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">选择其他测试类型</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testTypes.map((test) => (
                    <div
                      key={test.key}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${config.testTypes[test.key as keyof WebsiteTestConfig['testTypes']]
                        ? `border-${test.color}-500 bg-${test.color}-500/10`
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                        }`}
                      onClick={() => handleTestTypeChange(test.key as keyof WebsiteTestConfig['testTypes'])}
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
                                id={`website-test-${test.key}`}
                                checked={config.testTypes[test.key as keyof WebsiteTestConfig['testTypes']]}
                                onChange={() => handleTestTypeChange(test.key as keyof WebsiteTestConfig['testTypes'])}
                                title={`启用或禁用${test.name}测试`}
                                aria-label={`启用或禁用${test.name}测试`}
                                className="sr-only"
                              />
                              <div
                                className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${config.testTypes[test.key as keyof WebsiteTestConfig['testTypes']]
                                  ? `border-${test.color}-500 bg-${test.color}-500 shadow-lg shadow-${test.color}-500/25`
                                  : 'border-gray-500 bg-gray-700/50 hover:border-gray-400 hover:bg-gray-600/50'
                                  }`}
                              >
                                {config.testTypes[test.key as keyof WebsiteTestConfig['testTypes']] && (
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

              {/* 高级选项 */}
              <div className="themed-card p-6">
                <h3 className="text-xl font-semibold mb-4 text-themed-primary">高级选项</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-themed-secondary">
                      设备类型
                    </label>
                    <select
                      value={config.options.device}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        options: { ...prev.options, device: e.target.value as any }
                      }))}
                      title="选择测试设备类型"
                      className="themed-input w-full px-3 py-2"
                    >
                      <option value="desktop">桌面端</option>
                      <option value="mobile">移动端</option>
                      <option value="both">桌面端+移动端</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-themed-secondary">
                      测试节点
                    </label>
                    <select
                      value={config.options.location}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        options: { ...prev.options, location: e.target.value }
                      }))}
                      title="选择测试节点位置"
                      className="themed-input w-full px-3 py-2"
                    >
                      {locations.map((location) => (
                        <option key={location.value} value={location.value}>
                          {location.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-themed-secondary">
                      网络限制
                    </label>
                    <select
                      value={config.options.throttling}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        options: { ...prev.options, throttling: e.target.value as any }
                      }))}
                      title="选择网络限制类型"
                      className="themed-input w-full px-3 py-2"
                    >
                      <option value="none">无限制</option>
                      <option value="4g">4G网络</option>
                      <option value="3g">3G网络</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 测试控制和结果 */}
            <div className="space-y-6">
              {/* 测试信息面板 */}
              <div className="themed-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-themed-primary">测试信息</h3>
                <div className="space-y-4">
                  <div className="text-sm text-themed-secondary">
                    <p>已选择 {selectedTestsCount} 项测试</p>
                    <p>预计耗时: {Math.ceil(estimatedTime / 60)} 分钟</p>
                  </div>

                  {isRunning && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-themed-secondary">
                        <span>进度</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <ProgressBar
                        value={progress}
                        variant="primary"
                        size="md"
                        animated
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 测试结果 */}
              {results && (
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gray-700/50 rounded-lg">
                      <div className={`text-4xl font-bold ${results.overallScore >= 90 ? 'text-green-400' :
                        results.overallScore >= 70 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                        {Math.round(results.overallScore)}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">总体评分</div>
                    </div>

                    {/* 测试指标 */}
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

                    {/* 问题和建议 */}
                    {results.findings && results.findings.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-md font-medium text-white mb-3">发现的问题</h4>
                          <div className="space-y-2">
                            {results.findings.slice(0, 5).map((finding: any, index: number) => (
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
                            {results.recommendations?.slice(0, 5).map((rec: any, index: number) => (
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

                  {!isRunning && (
                    <div className="mt-6 flex space-x-3">
                      <button type="button" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                        <span>下载报告</span>
                      </button>
                      <button type="button" className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span>分享结果</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 高级网站测试图表 */}
          {
            results && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <TestCharts
                  results={results}
                  testType="website"
                  theme="dark"
                  height={400}
                  interactive={true}
                  showComparison={testHistory.length > 1}
                />
              </div>
            )
          }

          {/* 网站测试历史 */}
          {
            testHistory.length > 0 && (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">测试历史</h3>
                <div className="space-y-3">
                  {testHistory.slice(0, 5).map((test) => (
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
            )
          }
        </div>
      }
    />
  );
};

export default WebsiteTest;
