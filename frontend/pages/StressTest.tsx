import React, { useCallback, useEffect, useRef, useState } from 'react';
import StressTestForm from '../components/stress/StressTestForm';
import StressTestHeader from '../components/stress/StressTestHeader';
import StressTestHistory from '../components/stress/StressTestHistory';
import StressTestResults from '../components/stress/StressTestResults';
import StressTestTabs from '../components/stress/StressTestTabs';
import { useErrorHandler } from '../components/system/ErrorHandling';
import { useAuth } from '../hooks/useAuth';
import useStressTestWebSocket from '../hooks/useStressTestWebSocket';

// 类型定义
type CurrentStatusType = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface StressTestConfig {
    url: string;
    users: number;
    duration: number;
    testType: string;
}

interface TestResult {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    timestamp: string;
}

interface CurrentMetrics {
    activeUsers: number;
    requestsSent: number;
    responsesReceived: number;
    currentRPS: number;
    averageResponseTime: number;
}

const StressTest: React.FC = () => {
    // 认证和错误处理
    const { user } = useAuth();
    const { handleError } = useErrorHandler();

    // 状态管理
    const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');
    const [testMode, setTestMode] = useState<'real' | 'local'>('real');
    const [currentStatus, setCurrentStatus] = useState<CurrentStatusType>('IDLE');
    const [statusMessage, setStatusMessage] = useState('准备开始测试');
    const [testProgress, setTestProgress] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentTestId, setCurrentTestId] = useState<string | null>(null);
    const [result, setResult] = useState<TestResult | null>(null);
    const [currentMetrics, setCurrentMetrics] = useState<CurrentMetrics | null>(null);
    const [error, setError] = useState<string>('');

    // 测试配置
    const [config, setConfig] = useState<StressTestConfig>({
        url: '',
        users: 10,
        duration: 60,
        testType: 'load'
    });

    // WebSocket集成
    const {
        connectionStatus,
        isConnected,
        latestProgress,
        latestStatus
    } = useStressTestWebSocket({
        testId: currentTestId,
        autoConnect: true,
        onProgress: (progress) => {
            setCurrentMetrics({
                activeUsers: progress.activeUsers,
                requestsSent: 0, // 这些值需要从progress中获取或计算
                responsesReceived: 0,
                currentRPS: progress.throughput,
                averageResponseTime: progress.responseTime
            });
        },
        onStatusChange: (status) => {
            setCurrentStatus(status.status.toUpperCase() as CurrentStatusType);
            setStatusMessage(status.message || '');
        },
        onComplete: (result) => {
            handleTestComplete();
        },
        onError: (error) => {
            handleError(error, '测试执行');
        }
    });

    const currentTestIdRef = useRef<string | null>(null);

    // 开始测试
    const handleStartTest = useCallback(async () => {
        if (!config.url) {
            setError('请输入测试URL');
            return;
        }

        try {
            setError('');
            setIsRunning(true);
            setCurrentStatus('RUNNING');
            setStatusMessage('正在启动测试...');
            setTestProgress('初始化测试环境');
            setResult(null);
            setCurrentMetrics({
                activeUsers: 0,
                requestsSent: 0,
                responsesReceived: 0,
                currentRPS: 0,
                averageResponseTime: 0
            });

            // 生成测试ID
            const testId = `stress_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            setCurrentTestId(testId);
            currentTestIdRef.current = testId;

            // 调用后端API启动测试
            const response = await fetch('/api/tests/stress/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    testId,
                    config: {
                        duration: config.duration,
                        users: config.users,
                        rampUpTime: 10,
                        url: config.url,
                        testType: config.testType
                    }
                })
            });

            if (!response.ok) {
                throw new Error('启动测试失败');
            }

            const data = await response.json();
            console.log('测试启动成功:', data);
            setStatusMessage('测试已启动，正在建立连接...');
            setTestProgress('WebSocket连接建立中...');

        } catch (error) {
            handleError(error as Error, '启动测试');
            setIsRunning(false);
            setCurrentStatus('FAILED');
            setStatusMessage('测试启动失败');
        }
    }, [config, handleError]);

    // 停止测试
    const handleStopTest = useCallback(async () => {
        if (!currentTestId) return;

        try {
            // 调用后端API停止测试
            const response = await fetch('/api/tests/stress/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    testId: currentTestId,
                    reason: '用户手动停止'
                })
            });

            if (response.ok) {
                console.log('测试停止成功');
            }
        } catch (error) {
            console.error('停止测试失败:', error);
        }

        setIsRunning(false);
        setCurrentStatus('CANCELLED');
        setStatusMessage('测试已取消');
        setTestProgress('');
        setCurrentTestId(null);
        currentTestIdRef.current = null;
    }, [currentTestId]);

    // 重置测试
    const handleResetTest = useCallback(() => {
        setCurrentStatus('IDLE');
        setStatusMessage('准备开始测试');
        setTestProgress('');
        setResult(null);
        setCurrentMetrics(null);
        setError('');
        setCurrentTestId(null);
        currentTestIdRef.current = null;
    }, []);

    // 测试完成处理
    const handleTestComplete = useCallback(() => {
        setIsRunning(false);
        setCurrentStatus('COMPLETED');
        setStatusMessage('测试完成');
        setTestProgress('正在生成报告...');

        // 模拟测试结果
        const mockResult: TestResult = {
            totalRequests: config.users * config.duration * 2,
            successfulRequests: Math.floor(config.users * config.duration * 2 * 0.95),
            failedRequests: Math.floor(config.users * config.duration * 2 * 0.05),
            averageResponseTime: 150 + Math.random() * 100,
            maxResponseTime: 500 + Math.random() * 200,
            minResponseTime: 50 + Math.random() * 50,
            requestsPerSecond: config.users * 2,
            errorRate: 5,
            timestamp: new Date().toISOString()
        };

        setResult(mockResult);
        setTestProgress('报告生成完成');
        setCurrentTestId(null);
        currentTestIdRef.current = null;
    }, [config]);

    // 显示设置
    const handleShowSettings = useCallback(() => {
        // TODO: 实现设置对话框
        console.log('显示设置');
    }, []);

    // 清理资源
    useEffect(() => {
        return () => {
            // WebSocket清理由useStressTestWebSocket Hook自动处理
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 页面标题和控制区域 */}
                <StressTestHeader
                    isRunning={isRunning}
                    currentStatus={currentStatus}
                    statusMessage={statusMessage}
                    testProgress={testProgress}
                    onStartTest={handleStartTest}
                    onStopTest={handleStopTest}
                    onResetTest={handleResetTest}
                    onShowSettings={handleShowSettings}
                />

                {/* 标签页切换 */}
                <StressTestTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    testMode={testMode}
                    onModeChange={setTestMode}
                />

                {/* 内容区域 */}
                {activeTab === 'test' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 测试配置 */}
                        <StressTestForm
                            config={config}
                            onConfigChange={setConfig}
                            isRunning={isRunning}
                            error={error}
                        />

                        {/* 测试结果 */}
                        <StressTestResults
                            result={result}
                            isRunning={isRunning}
                            testId={currentTestId}
                            currentMetrics={currentMetrics}
                        />
                    </div>
                ) : (
                    <StressTestHistory />
                )}
            </div>
        </div>
    );
};

export default StressTest;
