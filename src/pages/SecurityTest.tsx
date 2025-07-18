import { Search } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import SecurityTestComparison from '../components/security/SecurityTestComparison';
import { SecurityTestHistory } from '../components/security/SecurityTestHistory';
import { UnifiedSecurityResults } from '../components/security/UnifiedSecurityResults';
import { UnifiedSecurityTestPanel } from '../components/security/UnifiedSecurityTestPanel';
import { useUserStats } from '../hooks/useUserStats';
import { SecurityTestResult, TestProgress } from '../services/unifiedSecurityEngine';
import '../styles/security-test-clarity.css';
import '../styles/security-test-enhanced.css';
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
    <div className="dark security-test space-y-6 dark-page-scrollbar min-h-screen security-test-bg">
      {/* 页面标题 - 增强可读性 */}
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700/60 p-7 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
              <span className="text-4xl mr-3">🛡️</span>
              安全测试
            </h2>
            <p className="text-gray-200 text-lg font-medium">全面检测网站安全漏洞和防护措施</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* 测试状态和控制按钮 */}
            {activeTab === 'test' && (
              <div className="flex items-center space-x-4">
                {!isTestRunning ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (testPanelRef.current) {
                        testPanelRef.current.startTest();
                      }
                    }}
                    disabled={!canStartTest}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${canStartTest
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <Search className="w-5 h-5" />
                    <span>开始测试</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                    <span className="text-sm text-blue-300 font-medium">测试中...</span>
                  </div>
                )}
              </div>
            )}

            {/* 标签页切换 - 增强可读性 */}
            <div className="bg-gray-700/60 border border-gray-600/70 rounded-xl p-1.5 flex gap-1.5 shadow-md">
              <button
                type="button"
                onClick={() => setActiveTab('test')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'test'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/60'
                  }`}
              >
                安全测试
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600/60'
                  }`}
              >
                测试历史
              </button>
              {comparisonResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('comparison')}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'comparison'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'text-gray-300 hover:text-white hover:bg-gray-600/60'
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
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">⚠️</div>
                <span className="text-red-300">{error}</span>
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
    </div>
  );
};

export default SecurityTest;
