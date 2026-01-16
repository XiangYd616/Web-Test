import Logger from '@/utils/logger';
import { Shield, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import {
  SecurityTestPanel,
  type SecurityTestPanelRef,
} from '../components/security/SecurityTestPanel';
import TestPageLayout from '../components/testing/TestPageLayout';
import { useUserStats } from '../hooks/useUserStats';

// CSS样式已迁移到组件库中

const SecurityTest: React.FC = () => {
  // 登录检查
  const { isAuthenticated, requireLogin, LoginPromptComponent } = useAuthCheck({
    feature: '安全测试',
    description: '使用安全测试功能',
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 状态管理 - 使用统一类型系统
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canStartTest, setCanStartTest] = useState(false);
  const [testResult, setTestResult] = useState<unknown | null>(null);
  const testPanelRef = useRef<SecurityTestPanelRef | null>(null);

  // 开始测试的处理函数
  const handleStartTest = () => {
    if (!requireLogin()) {
      return;
    }

    if (!testPanelRef.current) {
      Logger.warn('测试面板尚未就绪');
      return;
    }

    if (!testPanelRef.current.canStartTest()) {
      Logger.warn('请先完成测试配置');
      return;
    }

    testPanelRef.current.startTest();
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
  };

  // 处理测试完成
  const handleTestComplete = (result: unknown) => {
    setTestResult(result);
    setIsTestRunning(false);

    // 记录测试完成统计
    const resultData = result as { overallScore?: number; duration?: number } | null;

    recordTestCompletion(
      '安全测试',
      true,
      resultData?.overallScore ?? 0,
      Math.round((resultData?.duration ?? 0) / 1000)
    );
  };

  // 处理测试错误
  const handleTestError = (errorMessage: string) => {
    setError(errorMessage);
    setIsTestRunning(false);
  };

  // 移除强制登录检查，允许未登录用户查看页面
  // 在使用功能时才提示登录

  return (
    <TestPageLayout
      testType="security"
      title="安全测试"
      description="全面检测网站安全漏洞和防护措施"
      icon={Shield}
      testStatus={isTestRunning ? 'running' : 'idle'}
      isTestDisabled={!canStartTest}
      onStartTest={handleStartTest}
      testContent={
        <div className="space-y-6">
          {/* 未登录提示 */}
          {!isAuthenticated && LoginPromptComponent}

          {/* 统一安全测试面板 */}
          <SecurityTestPanel
            ref={testPanelRef}
            onTestStart={handleTestStart}
            onTestComplete={handleTestComplete}
            onTestError={handleTestError}
          />

          {/* 测试结果展示 */}
          {!!testResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">安全测试结果</h3>
              <p className="text-gray-600">测试结果展示功能开发中...</p>
            </div>
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
