import { Shield, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { SecurityTestPanel } from '../components/security/SecurityTestPanel';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';
import type { TestProgress } from '../services/api/testProgressService';
import type {
  SecurityTestConfig,
  SecurityTestResult
} from '../types';

// CSS样式已迁移到组件库中

const SecurityTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "安全测试",
    description: "使用安全测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 状态管理 - 使用统一类型系统
  const [testUrl, setTestUrl] = useState('');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<any>(null);
  const [canStartTest, setCanStartTest] = useState(false);
  const [testConfig, setTestConfig] = useState<Partial<SecurityTestConfig>>({
    url: '',
    testType: 'security',
    scanDepth: 'standard',
    securityChecks: ['ssl', 'headers', 'vulnerabilities']
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const testPanelRef = useRef<any>(null);

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
      console.log('安全测试进度:', progressData);
    },
    onComplete: (result) => {
      setTestResult(result);
      recordTestCompletion('security');
    },
    onError: (error) => {
      console.error('安全测试失败:', error);
    }
  });

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
    if (!testUrl) {
      console.warn('请输入要测试的URL');
      return;
    }

    try {
      console.log('开始安全测试:', testUrl, testConfig);

      // 执行安全测试
      const response = await testApiService.executeSecurityTest(testUrl, testConfig);

      if (response.success) {
        const testId = response.data.id || response.data.testId;
        setCurrentTestId(testId);

        // 开始监控测试进度
        if (testId) {
          startMonitoring(testId);
        }
      } else {
        throw new Error(response.message || '启动安全测试失败');
      }

    } catch (error) {
      console.error('安全测试失败:', error);
    }
  };

  // 停止测试
  const handleStopTest = async () => {
    if (currentTestId) {
      try {
        await cancelTest();
        setCurrentTestId(null);
      } catch (error) {
        console.error('停止安全测试失败:', error);
      }
    }
  };

  // 更新按钮状态
  useEffect(() => {
    const updateButtonState = () => {
      if (testPanelRef.current) {
        const canStart = testPanelRef.current.canStartTest();
        setCanStartTest(canStart);
      }
    };

    // 初始检查
    updateButtonState();

    // 定期检查状态
    const interval = setInterval(updateButtonState, 500);
    return () => clearInterval(interval);
  }, []);

  // 处理测试开始
  const handleTestStart = () => {
    setIsTestRunning(true);
    setError(null);
    setTestResult(null);
    setTestProgress(null);
  };

  // 处理测试进度
  const handleTestProgress = (progress: TestProgress) => {
    setTestProgress(progress);
  };

  // 处理测试完成
  const handleTestComplete = (result: SecurityTestResult) => {
    setTestResult(result);
    setIsTestRunning(false);
    setTestProgress(null);

    // 记录测试完成统计
    recordTestCompletion('安全测试', true, result.overallScore, Math.round(result.duration / 1000));
  };

  // 处理测试错误
  const handleTestError = (errorMessage: string) => {
    setError(errorMessage);
    setIsTestRunning(false);
    setTestProgress(null);
  };

  // 处理测试对比
  const handleCompareTests = (results: SecurityTestResult[]) => {
    setComparisonResults(results);
    setActiveTab('comparison');
  };

  // 关闭对比页面
  const handleCloseComparison = () => {
    setActiveTab('history');
    setComparisonResults([]);
  };

  // 移除强制登录检查，允许未登录用户查看页面
  // 在使用功能时才提示登录

  return (
    <div className="space-y-4 dark-page-scrollbar">
      <div className="space-y-6">
        {/* 美化的页面标题和控制 - 统一设计风格 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-orange-600/5 to-yellow-600/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-xl"></div>

          {/* 内容区域 */}
          <div className="relative p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* 标题区域 */}
              <div className="flex items-center space-x-4">
                {/* 图标装饰 */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
                </div>

                {/* 标题文字 */}
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-orange-100 bg-clip-text text-transparent">
                      安全测试
                    </h2>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm mt-1 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    <span>全面检测网站安全漏洞和防护措施</span>
                  </p>

                  {/* 状态指示器 */}
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${isTestRunning ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className="text-gray-400">
                        {isTestRunning ? '安全扫描进行中' : '等待开始'}
                      </span>
                    </div>

                    {testConfig.url && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        <span className="text-gray-400 truncate max-w-48">
                          目标: {testConfig.url}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 测试控制按钮 */}
              <div className="flex items-center space-x-2">
                {!isTestRunning ? (
                  <button
                    type="button"
                    onClick={handleTestStart}
                    disabled={!canStartTest}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${!canStartTest
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : isAuthenticated
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>开始扫描</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-md">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-300 font-medium">
                        扫描进行中
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestStop}
                      className="px-3 py-1.5 text-white rounded-md transition-colors flex items-center space-x-1.5 text-xs bg-gray-600 hover:bg-gray-700"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>停止</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 测试内容区域 */}
        <div className="space-y-6">
          {/* 统一安全测试面板 */}
          <SecurityTestPanel
            ref={testPanelRef}
            onTestStart={handleTestStart}
            onTestProgress={handleTestProgress}
            onTestComplete={handleTestComplete}
            onTestError={handleTestError}
          />

          {/* 测试结果展示 */}
          {testResult && (
            <SecurityResults result={testResult} />
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="font-semibold text-red-400 text-sm">测试失败</h4>
                  <p className="text-xs text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityTest;
