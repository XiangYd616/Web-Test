import { Shield, XCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { SecurityTestPanel } from '../components/security/SecurityTestPanel';
import TestPageLayout from '../components/testing/TestPageLayout';
import { useTestProgress } from '../hooks/useTestProgress';
import { useUserStats } from '../hooks/useUserStats';
import type {
  SecurityTestConfig,
  SecurityTestResult, TestProgress
} from '../services/unifiedSecurityEngine';

// CSS样式已迁移到组件库中

// 临时testApiService实现
const testApiService = {
  executeSecurityTest: async (url: string, config: any) => ({
    success: true,
    data: {
      id: `security_test_${Date.now()}`,
      testId: `security_test_${Date.now()}`
    },
    message: '安全测试启动成功'
  })
};

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
    depth: 'standard',
    modules: {
      ssl: { enabled: true, checkCertificate: true },
      headers: { enabled: true, checkSecurity: true },
      vulnerabilities: { enabled: true, checkXSS: true }
    }
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const [comparisonResults, setComparisonResults] = useState<SecurityTestResult[]>([]);
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
    },
    onComplete: (result) => {
      setTestResult(result);
      recordTestCompletion('安全测试', true, result?.overallScore || 0, result?.duration || 180);
    },
    onError: (error) => {
      console.error('安全测试失败:', error);
    }
  });

  // 处理测试选择和重新运行
  const handleTestSelect = (test: any) => {
    // 可以在这里加载选中的测试配置
  };

  const handleTestRerun = (test: any) => {
    // 可以在这里重新运行选中的测试
  };

  // 开始测试的处理函数
  const handleStartTest = async () => {
    if (!testUrl) {
      console.warn('请输入要测试的URL');
      return;
    }

    try {

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

  // 停止测试
  const handleTestStop = () => {
    if (currentTestId) {
      setCurrentTestId(null);
      setTestResult(null);
    }
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
          {!isAuthenticated && <>{LoginPromptComponent}</>}

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
