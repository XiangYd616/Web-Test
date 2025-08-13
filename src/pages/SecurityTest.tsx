import { Shield, XCircle } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import SecurityResults from '../components/security/SecurityResults';
import { SecurityTestPanel } from '../components/security/SecurityTestPanel';
import TestPageLayout from '../components/testing/TestPageLayout';
import { useUserStats } from '../hooks/useUserStats';
import { SecurityTestResult, TestProgress } from '../services/unifiedSecurityEngine';

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

  // 状态管理
  const [testResult, setTestResult] = useState<SecurityTestResult | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const [canStartTest, setCanStartTest] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<SecurityTestResult[]>([]);
  const testPanelRef = useRef<any>(null);

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
    if (testPanelRef.current) {
      testPanelRef.current.startTest();
    }
  };

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
    <TestPageLayout
      testType="security"
      title="安全测试"
      description="全面检测网站安全漏洞和防护措施"
      icon={Shield}
      testTabLabel="安全测试"
      historyTabLabel="测试历史"
      testStatus={isTestRunning ? 'running' : 'idle'}
      isTestDisabled={!canStartTest}
      onStartTest={handleStartTest}
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
      additionalComponents={LoginPromptComponent}
      testContent={
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
      }
    />
  );
};

export default SecurityTest;
