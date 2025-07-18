import { Search, Shield, XCircle } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import SecurityTestComparison from '../components/security/SecurityTestComparison';
import { SecurityTestHistory } from '../components/security/SecurityTestHistory';
import { UnifiedSecurityResults } from '../components/security/UnifiedSecurityResults';
import { UnifiedSecurityTestPanel } from '../components/security/UnifiedSecurityTestPanel';
import { TestPageLayout } from '../components/testing/UnifiedTestingComponents';
import { useUserStats } from '../hooks/useUserStats';
import { SecurityTestResult, TestProgress } from '../services/unifiedSecurityEngine';
import '../styles/compact-layout.css';
import '../styles/unified-testing-tools.css';

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

  // 状态管理
  const [testResult, setTestResult] = useState<SecurityTestResult | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const [canStartTest, setCanStartTest] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<SecurityTestResult[]>([]);
  const historyRef = useRef<any>(null);
  const testPanelRef = useRef<any>(null);

  // 更新按钮状态
  React.useEffect(() => {
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

    // 保存到历史记录
    if (historyRef.current?.saveTestResult) {
      historyRef.current.saveTestResult(result);
    }

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

  if (!isAuthenticated) {
    return LoginPromptComponent;
  }

  return (
    <TestPageLayout className="space-y-3 dark-page-scrollbar compact-layout">
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-400" />
              安全测试
            </h2>
            <p className="text-gray-300 text-sm">全面检测网站安全漏洞和防护措施</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* 测试状态指示器 */}
            {activeTab === 'test' && (
              <>
                {!isTestRunning ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (testPanelRef.current) {
                        testPanelRef.current.startTest();
                      }
                    }}
                    disabled={!canStartTest}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${canStartTest
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <Search className="w-3 h-3" />
                    <span>开始测试</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-300 font-medium">测试中</span>
                  </div>
                )}
              </>
            )}

            {/* 标签页切换 */}
            <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('test')}
                className={`px-2 py-1 text-xs rounded transition-colors ${activeTab === 'test'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  }`}
              >
                安全测试
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-2 py-1 text-xs rounded transition-colors ${activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  }`}
              >
                测试历史
              </button>
              {comparisonResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('comparison')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeTab === 'comparison'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                    }`}
                >
                  结果对比
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'test' ? (
        <>
          {/* 统一安全测试面板 */}
          <UnifiedSecurityTestPanel
            ref={testPanelRef}
            onTestStart={handleTestStart}
            onTestProgress={handleTestProgress}
            onTestComplete={handleTestComplete}
            onTestError={handleTestError}
          />

          {/* 测试结果展示 */}
          {testResult && (
            <UnifiedSecurityResults result={testResult} />
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
        </>
      ) : activeTab === 'history' ? (
        /* 安全测试历史 */
        <SecurityTestHistory
          ref={historyRef}
          onSelectTest={(result) => {
            setTestResult(result);
            setActiveTab('test');
          }}
          onCompareTests={handleCompareTests}
        />
      ) : activeTab === 'comparison' ? (
        /* 测试结果对比 */
        <SecurityTestComparison
          results={comparisonResults}
          onClose={handleCloseComparison}
        />
      ) : null}
    </TestPageLayout>
  );
};

export default SecurityTest;
