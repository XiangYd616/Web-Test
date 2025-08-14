/**
 * 组件使用示例
 * 展示如何使用重构后的业务组件和状态管理
 */

import { Activity, Download, Globe, TestTube } from 'lucide-react';
import React from 'react';
import { DataExporter } from '..\components\features\DataExporter.tsx';
import { MonitorDashboard } from '..\components\features\MonitorDashboard.tsx';
import { ResultViewer } from '..\components\features\ResultViewer.tsx';
import { TestRunner } from '..\components\features\TestRunner.tsx';
import { Card } from '../components/ui';
import { AppProvider } from '../contexts/AppContext';

// 示例：使用TestRunner组件
const TestRunnerExample: React.FC = () => {
    const handleTestComplete = (result: any) => {
        console.log('测试完成:', result);
    };

    const handleTestStart = (config: any) => {
        console.log('测试开始:', config);
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">测试运行器示例</h2>
            <TestRunner
                testType="stress"
                title="压力测试"
                description="测试网站在高并发情况下的性能表现"
                icon={<TestTube className="w-6 h-6 text-blue-600" />}
                onTestComplete={handleTestComplete}
                onTestStart={handleTestStart}
                defaultConfig={{
                    url: 'https://example.com',
                    options: { users: 10, duration: 60 }
                }}
            />
        </div>
    );
};

// 示例：使用ResultViewer组件
const ResultViewerExample: React.FC = () => {
    const mockResult = {
        id: 'test-123',
        testType: 'seo' as const,
        status: 'completed' as const,
        score: 85,
        startTime: new Date(Date.now() - 300000).toISOString(),
        endTime: new Date().toISOString(),
        duration: 300000,
        summary: 'SEO测试完成，发现一些需要优化的问题',
        recommendations: [
            {
                title: '优化页面标题',
                description: '页面标题过长，建议控制在60字符以内',
                priority: 'high' as const,
                solution: '修改HTML的title标签，使其更简洁明了'
            },
            {
                title: '添加meta描述',
                description: '缺少meta description标签',
                priority: 'medium' as const,
                solution: '在HTML head中添加meta description标签'
            }
        ]
    };

    const mockDetails = {
        metrics: {
            titleLength: 65,
            metaDescriptionLength: 0,
            headingCount: 12,
            imageCount: 8,
            linkCount: 25
        },
        charts: [
            {
                type: 'bar' as const,
                title: 'SEO指标分析',
                data: {}
            }
        ],
        issues: [
            {
                id: 'issue-1',
                title: '页面标题过长',
                description: '当前页面标题长度为65字符，超过推荐的60字符',
                severity: 'high' as const,
                category: 'seo',
                solution: '缩短页面标题至60字符以内',
                impact: '可能影响搜索引擎结果页面的显示效果'
            }
        ],
        recommendations: [
            {
                title: '优化页面标题',
                description: '页面标题是SEO的重要因素',
                priority: 'high' as const,
                solution: '修改title标签，使其更简洁明了',
                estimatedImpact: '提升搜索引擎排名和点击率'
            }
        ]
    };

    const handleDownload = (format: 'pdf' | 'json' | 'csv') => {
        console.log('下载报告:', format);
    };

    const handleShare = () => {
        console.log('分享结果');
    };

    const handleRetry = () => {
        console.log('重新测试');
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">结果查看器示例</h2>
            <ResultViewer
                result={mockResult}
                details={mockDetails}
                onDownload={handleDownload}
                onShare={handleShare}
                onRetry={handleRetry}
            />
        </div>
    );
};

// 示例：使用MonitorDashboard组件
const MonitorDashboardExample: React.FC = () => {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">监控仪表板示例</h2>
            <MonitorDashboard />
        </div>
    );
};

// 示例：使用DataExporter组件
const DataExporterExample: React.FC = () => {
    const handleExport = async (config: any) => {
        console.log('开始导出:', config);

        // 模拟导出过程
        return new Promise<any>((resolve) => {
            setTimeout(() => {
                resolve({
                    id: Date.now().toString(),
                    name: `export-${config.format}`,
                    config,
                    status: 'completed',
                    progress: 100,
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    downloadUrl: `/downloads/export-${Date.now()}.${config.format}`,
                    fileSize: Math.floor(Math.random() * 1000000) + 100000
                });
            }, 2000);
        });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">数据导出器示例</h2>
            <DataExporter onExport={handleExport} />
        </div>
    );
};

// 主示例组件
const ComponentUsageExample: React.FC = () => {
    const [activeExample, setActiveExample] = React.useState<string>('testRunner');

    const examples = [
        { key: 'testRunner', label: '测试运行器', icon: <TestTube className="w-5 h-5" /> },
        { key: 'resultViewer', label: '结果查看器', icon: <Activity className="w-5 h-5" /> },
        { key: 'monitorDashboard', label: '监控仪表板', icon: <Globe className="w-5 h-5" /> },
        { key: 'dataExporter', label: '数据导出器', icon: <Download className="w-5 h-5" /> }
    ];

    const renderExample = () => {
        switch (activeExample) {
            case 'testRunner':
                return <TestRunnerExample />;
            case 'resultViewer':
                return <ResultViewerExample />;
            case 'monitorDashboard':
                return <MonitorDashboardExample />;
            case 'dataExporter':
                return <DataExporterExample />;
            default:
                return <TestRunnerExample />;
        }
    };

    return (
        <AppProvider>
            <div className="min-h-screen bg-gray-50">
                {/* 导航栏 */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                                组件使用示例
                            </h1>
                            <div className="flex space-x-4">
                                {examples.map((example) => (
                                    <button
                                        key={example.key}
                                        onClick={() => setActiveExample(example.key)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${activeExample === example.key
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        {example.icon}
                                        <span>{example.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="max-w-7xl mx-auto py-6">
                    <Card className="bg-white shadow-sm">
                        {renderExample()}
                    </Card>
                </div>

                {/* 说明文档 */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Card className="p-6 bg-blue-50 border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-3">
                            组件重构说明
                        </h3>
                        <div className="text-blue-800 space-y-2">
                            <p>
                                <strong>TestRunner:</strong> 统一的测试运行器，支持多种测试类型，提供一致的用户界面和交互体验。
                            </p>
                            <p>
                                <strong>ResultViewer:</strong> 统一的结果展示组件，支持多种测试结果的可视化和分析。
                            </p>
                            <p>
                                <strong>MonitorDashboard:</strong> 实时监控仪表板，集成监控目标管理和告警功能。
                            </p>
                            <p>
                                <strong>DataExporter:</strong> 数据导出组件，支持多种格式的数据导出和任务管理。
                            </p>
                            <p className="mt-4">
                                <strong>状态管理:</strong> 使用React Context + useReducer实现全局状态管理，
                                配合自定义Hook（useAuth、useTest、useMonitoring）提供统一的状态访问接口。
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </AppProvider>
    );
};

export default ComponentUsageExample;