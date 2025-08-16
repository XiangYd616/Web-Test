/**
 * 统一测试运行器组件
 * 支持多种测试类型的统一界面和流程管理
 */

import { Download, History, Play, RefreshCw, Settings, Square } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useTestEngine } from '../../hooks/useTestEngine';
import { Badge, Button, Card, Input, Loading, Modal, ProgressBar, Select, // type SelectOption } from '../ui/index'; // 已修复
// 测试类型定义
export type TestType = 'api' | 'compatibility' | 'infrastructure' | 'security' | 'seo' | 'stress' | 'ux' | 'website';

// 测试配置接口
export interface TestConfig {
    url: string;
    testType: TestType;
    options: Record<string, any>;
}

// 测试结果接口
export interface TestResult {
    id: string;
    testType: TestType;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    score?: number;
    startTime: string;
    endTime?: string;
    duration?: number;
    summary?: string;
    details?: any;
    recommendations?: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        solution: string;
    }>;
    error?: string;
}

// 组件属性接口
export interface TestRunnerProps {
    testType: TestType;
    title: string;
    description: string;
    icon: React.ReactNode;
    defaultConfig?: Partial<TestConfig>;
    onTestComplete?: (result: TestResult) => void;
    onTestStart?: (config: TestConfig) => void;
    className?: string;
}

// 测试类型选项
const testTypeOptions: SelectOption[] = [
    { value: 'stress', label: '压力测试' },
    { value: 'security', label: '安全测试' },
    { value: 'seo', label: 'SEO测试' },
    { value: 'api', label: 'API测试' },
    { value: 'performance', label: '性能测试' },
    { value: 'accessibility', label: '可访问性测试' },
    { value: 'compatibility', label: '兼容性测试' },
];

export const TestRunner: React.FC<TestRunnerProps> = ({
    testType,
    title,
    description,
    icon,
    defaultConfig = {},
    onTestComplete,
    onTestStart,
    className = ''
}) => {
  
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
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
    // 状态管理
    const [config, setConfig] = useState<TestConfig>({
        url: '',
        testType,
        options: {},
        ...defaultConfig
    });
    const [currentTest, setCurrentTest] = useState<TestResult | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [testHistory, setTestHistory] = useState<TestResult[]>([]);

    // 自定义钩子
    const { showNotification } = useNotification();
    const {
        runTest,
        cancelTest,
        isRunning,
        progress,
        stage,
        error: testError
    } = useTestEngine();

    // 加载测试历史
    useEffect(() => {
        loadTestHistory();
    }, [testType]);

    // 加载测试历史记录
    const loadTestHistory = useCallback(async () => {
        try {
            // 这里应该调用实际的API获取历史记录
            // const history = await testService.getTestHistory(testType);
            // setTestHistory(history);

            // 临时模拟数据
            const mockHistory: TestResult[] = [
                {
                    id: '1',
                    testType,
                    status: 'completed',
                    score: 85,
                    startTime: new Date(Date.now() - 3600000).toISOString(),
                    endTime: new Date(Date.now() - 3500000).toISOString(),
                    duration: 100000,
                    summary: '测试完成，发现一些需要优化的问题'
                },
                {
                    id: '2',
                    testType,
                    status: 'failed',
                    startTime: new Date(Date.now() - 7200000).toISOString(),
                    error: '连接超时'
                }
            ];
            setTestHistory(mockHistory);
        } catch (error) {
            console.error('Failed to load test history:', error);
        }
    }, [testType]);

    // 开始测试
    const handleStartTest = useCallback(async () => {
        if (!config.url) {
            
        showNotification('请输入有效的URL', 'error');
            return;
      }

        try {
            // 通知测试开始
            onTestStart?.(config);

            // 创建测试记录
            const testResult: TestResult = {
                id: Date.now().toString(),
                testType: config.testType,
                status: 'running',
                startTime: new Date().toISOString()
            };
            setCurrentTest(testResult);

            // 运行测试
            const result = await runTest(config);

            // 更新测试结果
            const completedResult: TestResult = {
                ...testResult,
                ...result,
                status: 'completed',
                endTime: new Date().toISOString()
            };

            setCurrentTest(completedResult);
            setTestHistory(prev => [completedResult, ...prev]);

            // 通知测试完成
            onTestComplete?.(completedResult);
            showNotification('测试完成', 'success');

        } catch (error) {
            const failedResult: TestResult = {
                ...currentTest!,
                status: 'failed',
                endTime: new Date().toISOString(),
                error: error instanceof Error ? error.message : '测试失败'
            };

            setCurrentTest(failedResult);
            setTestHistory(prev => [failedResult, ...prev]);

            showNotification(`测试失败: ${failedResult.error}`, 'error');
        }
    }, [config, onTestStart, onTestComplete, runTest, showNotification, currentTest]);

    // 取消测试
    const handleCancelTest = useCallback(async () => {
        try {
            await cancelTest();

            if (currentTest) {
                const cancelledResult: TestResult = {
                    ...currentTest,
                    status: 'cancelled',
                    endTime: new Date().toISOString()
                };
                setCurrentTest(cancelledResult);
                setTestHistory(prev => [cancelledResult, ...prev]);
            }

            showNotification('测试已取消', 'info');
        } catch (error) {
            showNotification('取消测试失败', 'error');
        }
    }, [cancelTest, currentTest, showNotification]);

    // 重新运行测试
    const handleRetryTest = useCallback(() => {
        handleStartTest();
    }, [handleStartTest]);

    // 下载测试报告
    const handleDownloadReport = useCallback((result: TestResult) => {
        try {
            const reportData = {
                testType: result.testType,
                url: config.url,
                result: result,
                generatedAt: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `test-report-${result.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('报告下载成功', 'success');
        } catch (error) {
            showNotification('报告下载失败', 'error');
        }
    }, [config.url, showNotification]);

    // 获取状态颜色
    const getStatusColor = (status: TestResult['status']) => {
        switch (status) {
            case 'running': return 'blue';
            case 'completed': return 'green';
            case 'failed': return 'red';
            case 'cancelled': return 'gray';
            default: return 'gray';
        }
    };

    // 获取分数颜色
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        if (score >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    // 渲染测试配置表单
    const renderConfigForm = () => (
        <div className="space-y-4">
            <Input
                label="测试URL"
                placeholder="https://example.com"
                value={config.url}
                onChange={(value) => setConfig(prev => ({ ...prev, url: value as string }))}
                required
                disabled={isRunning}
            />

            <Select
                label="测试类型"
                options={testTypeOptions}
                value={config.testType}
                onChange={(value) => setConfig(prev => ({ ...prev, testType: value as TestType }))}
                disabled={isRunning}
            />

            {/* 根据测试类型显示特定配置 */}
            {testType === 'stress' && (
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="并发用户数"
                        type="number"
                        value={config.options.users || 10}
                        onChange={(value) => setConfig(prev => ({
                            ...prev,
                            options: { ...prev.options, users: parseInt(value as string) || 10 }
                        }))}
                        min={1}
                        max={1000}
                        disabled={isRunning}
                    />
                    <Input
                        label="测试时长(秒)"
                        type="number"
                        value={config.options.duration || 30}
                        onChange={(value) => setConfig(prev => ({
                            ...prev,
                            options: { ...prev.options, duration: parseInt(value as string) || 30 }
                        }))}
                        min={10}
                        max={3600}
                        disabled={isRunning}
                    />
                </div>
            )}

            {testType === 'security' && (
                <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={config.options.checkSSL || false}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                options: { ...prev.options, checkSSL: e.target.checked }
                            }))}
                            disabled={isRunning}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">SSL/TLS检查</span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={config.options.checkHeaders || false}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                options: { ...prev.options, checkHeaders: e.target.checked }
                            }))}
                            disabled={isRunning}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">安全头检查</span>
                    </label>
                </div>
            )}
        </div>
    );

    // 渲染测试结果
    const renderTestResult = (result: TestResult) => (
        <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={getStatusColor(result.status) as any}>
                            {result.status === 'running' ? '运行中' :
                                result.status === 'completed' ? '已完成' :
                                    result.status === 'failed' ? '失败' : '已取消'}
                        </Badge>
                        {result.score !== undefined && (
                            <span className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                                {result.score}分
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">
                        开始时间: {new Date(result.startTime).toLocaleString()}
                    </p>
                    {result.endTime && (
                        <p className="text-sm text-gray-600">
                            结束时间: {new Date(result.endTime).toLocaleString()}
                        </p>
                    )}
                    {result.duration && (
                        <p className="text-sm text-gray-600">
                            耗时: {(result.duration / 1000).toFixed(1)}秒
                        </p>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {result.status === 'completed' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReport(result)}
                            icon={<Download className="w-4 h-4" />}
                        >
                            下载报告
                        </Button>
                    )}
                    {result.status === 'failed' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRetryTest}
                            icon={<RefreshCw className="w-4 h-4" />}
                        >
                            重试
                        </Button>
                    )}
                </div>
            </div>

            {result.summary && (
                <p className="text-gray-700 mb-4">{result.summary}</p>
            )}

            {result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-700 text-sm">{result.error}</p>
                </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">优化建议</h4>
                    {result.recommendations.slice(0, 3).map((rec, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-medium text-gray-900">{rec.title}</h5>
                                <Badge variant={rec.priority === 'critical' ? 'danger' : 'secondary'} size="sm">
                                    {rec.priority}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{rec.description}</p>
                            <p className="text-sm text-blue-600">{rec.solution}</p>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );

    return (
        <div className={`space-y-6 ${className}`}>
            {/* 头部 */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            {icon}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                            <p className="text-gray-600 mt-1">{description}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            onClick={() => setShowHistory(true)}
                            icon={<History className="w-4 h-4" />}
                        >
                            历史记录
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowSettings(true)}
                            icon={<Settings className="w-4 h-4" />}
                        >
                            设置
                        </Button>
                        {!isRunning ? (
                            <Button
                                variant="primary"
                                onClick={handleStartTest}
                                icon={<Play className="w-4 h-4" />}
                                disabled={!config.url}
                            >
                                开始测试
                            </Button>
                        ) : (
                            <Button
                                variant="danger"
                                onClick={handleCancelTest}
                                icon={<Square className="w-4 h-4" />}
                            >
                                停止测试
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* 配置表单 */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">测试配置</h2>
                {renderConfigForm()}
            </Card>

            {/* 进度显示 */}
            {isRunning && (
                <Card className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">测试进行中</h3>
                            <span className="text-sm text-gray-600">{stage}</span>
                        </div>
                        <ProgressBar value={progress} />
                        <Loading type="spinner" text="正在执行测试..." />
                    </div>
                </Card>
            )}

            {/* 错误显示 */}
            {testError && (
                <Card className="p-6 border-red-200 bg-red-50">
                    <div className="flex items-center space-x-2 text-red-700">
                        <span className="font-medium">测试错误:</span>
                        <span>{testError}</span>
                    </div>
                </Card>
            )}

            {/* 当前测试结果 */}
            {currentTest && renderTestResult(currentTest)}

            {/* 设置模态框 */}
            <Modal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                title="测试设置"
                size="lg"
            >
                <div className="space-y-4">
                    {renderConfigForm()}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowSettings(false)}>
                            取消
                        </Button>
                        <Button variant="primary" onClick={() => setShowSettings(false)}>
                            保存设置
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 历史记录模态框 */}
            <Modal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                title="测试历史"
                size="xl"
            >
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {testHistory.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">暂无测试历史记录</p>
                        </div>
                    ) : (
                        testHistory.map((result) => (
                            <div key={result.id}>
                                {renderTestResult(result)}
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default TestRunner;