/**
 * 统一测试结果展示组件
 * 支持多种测试类型的结果可视化和分析
 */

import {
    AlertTriangle,
    BarChart3,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    Download,
    Eye,
    Filter,
    Share2,
    TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FC } from 'react';
import {
    Badge,
    Button,
    Card,
    Input,
    Modal,
    Select,
    Table,
    type SelectOption,
    type TableColumn
} from '../ui';
import { TestResult } from './TestRunner';

// 结果详情接口
export interface ResultDetails {
    metrics: Record<string, number>;
    charts: Array<{
        type: 'line' | 'bar' | 'pie' | 'doughnut';
        title: string;
        data: any;
        options?: any;
    }>;
    issues: Array<{
        id: string;
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        category: string;
        solution: string;
        impact: string;
    }>;
    recommendations: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        solution: string;
        estimatedImpact: string;
    }>;
    rawData?: any;
}

// 组件属性接口
export interface ResultViewerProps {
    result: TestResult;
    details?: ResultDetails;
    onDownload?: (format: 'pdf' | 'json' | 'csv') => void;
    onShare?: () => void;
    onRetry?: () => void;
    className?: string;
}

// 筛选选项
const severityOptions: SelectOption[] = [
    { value: 'all', label: '全部' },
    { value: 'critical', label: '严重' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
];

const categoryOptions: SelectOption[] = [
    { value: 'all', label: '全部分类' },
    { value: 'performance', label: '性能' },
    { value: 'security', label: '安全' },
    { value: 'seo', label: 'SEO' },
    { value: 'accessibility', label: '可访问性' },
    { value: 'compatibility', label: '兼容性' }
];

export const ResultViewer: React.FC<ResultViewerProps> = ({
    result,
    details,
    onDownload,
    onShare,
    onRetry,
    className = ''
}) => {
    // 状态管理
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'issues' | 'recommendations'>('overview');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showRawData, setShowRawData] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // 计算筛选后的问题列表
    const filteredIssues = useMemo(() => {
        if (!details?.issues) return [];

        return details.issues.filter(issue => {
            const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
            const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
            const matchesSearch = searchQuery === '' ||
                issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                issue.description.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSeverity && matchesCategory && matchesSearch;
        });
    }, [details?.issues, severityFilter, categoryFilter, searchQuery]);

    // 获取状态颜色
    const getStatusColor = (status: TestResult['status']) => {
        switch (status) {
            case 'completed': return 'green';
            case 'failed': return 'red';
            case 'running': return 'blue';
            case 'cancelled': return 'gray';
            default: return 'gray';
        }
    };

    // 获取分数颜色和等级
    const getScoreInfo = (score: number) => {
        if (score >= 90) return { color: 'text-green-600', grade: 'A', bg: 'bg-green-50' };
        if (score >= 80) return { color: 'text-green-500', grade: 'B', bg: 'bg-green-50' };
        if (score >= 70) return { color: 'text-yellow-600', grade: 'C', bg: 'bg-yellow-50' };
        if (score >= 60) return { color: 'text-orange-600', grade: 'D', bg: 'bg-orange-50' };
        return { color: 'text-red-600', grade: 'F', bg: 'bg-red-50' };
    };

    // 获取严重程度颜色
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'red';
            case 'high': return 'orange';
            case 'medium': return 'yellow';
            case 'low': return 'blue';
            default: return 'gray';
        }
    };

    // 切换展开状态
    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    // 格式化持续时间
    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
    };

    // 渲染概览标签页
    const renderOverview = () => (
        <div className="space-y-6">
            {/* 总体评分 */}
            {result.score !== undefined && (
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">总体评分</h3>
                            <p className="text-gray-600">{result.summary || '测试已完成'}</p>
                        </div>
                        <div className={`text-center p-6 rounded-xl ${getScoreInfo(result.score).bg}`}>
                            <div className={`text-4xl font-bold ${getScoreInfo(result.score).color} mb-1`}>
                                {result.score}
                            </div>
                            <div className={`text-lg font-semibold ${getScoreInfo(result.score).color}`}>
                                {getScoreInfo(result.score).grade}级
                            </div>
                            <div className="text-sm text-gray-500 mt-1">满分100</div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 关键指标 */}
            {details?.metrics && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">关键指标</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(details.metrics).map(([key, value]) => (
                            <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                    {typeof value === 'number' ? value.toFixed(1) : value}
                                </div>
                                <div className="text-sm text-gray-600 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* 问题统计 */}
            {details?.issues && details.issues.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">问题统计</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['critical', 'high', 'medium', 'low'].map(severity => {
                            const count = details.issues.filter(issue => issue.severity === severity).length;
                            return (
                                <div key={severity} className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className={`text-2xl font-bold mb-1 ${getSeverityColor(severity) === 'red' ? 'text-red-600' :
                                        getSeverityColor(severity) === 'orange' ? 'text-orange-600' :
                                            getSeverityColor(severity) === 'yellow' ? 'text-yellow-600' : 'text-blue-600'}`}>
                                        {count}
                                    </div>
                                    <div className="text-sm text-gray-600 capitalize">{severity}</div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* 快速建议 */}
            {result.recommendations && result.recommendations.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">快速建议</h3>
                    <div className="space-y-3">
                        {result.recommendations.slice(0, 3).map((rec, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                                <div className="flex-shrink-0 mt-1">
                                    <Badge variant={rec.priority === 'critical' ? 'danger' : 'primary'} size="sm">
                                        {rec.priority}
                                    </Badge>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                                    <p className="text-sm text-blue-600">{rec.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );

    // 渲染详细信息标签页
    const renderDetails = () => (
        <div className="space-y-6">
            {/* 测试信息 */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">测试信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">测试ID:</span>
                        <span className="ml-2 font-mono">{result.id}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">测试类型:</span>
                        <span className="ml-2">{result.testType}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">开始时间:</span>
                        <span className="ml-2">{new Date(result.startTime).toLocaleString()}</span>
                    </div>
                    {result.endTime && (
                        <div>
                            <span className="text-gray-500">结束时间:</span>
                            <span className="ml-2">{new Date(result.endTime).toLocaleString()}</span>
                        </div>
                    )}
                    {result.duration && (
                        <div>
                            <span className="text-gray-500">测试耗时:</span>
                            <span className="ml-2">{formatDuration(result.duration)}</span>
                        </div>
                    )}
                    <div>
                        <span className="text-gray-500">状态:</span>
                        <Badge variant={getStatusColor(result.status) as any} size="sm" className="ml-2">
                            {result.status}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* 图表展示 */}
            {details?.charts && details.charts.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">数据图表</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {details.charts.map((chart, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3">{chart.title}</h4>
                                <div className="h-64 flex items-center justify-center bg-white rounded border">
                                    <BarChart3 className="w-12 h-12 text-gray-400" />
                                    <span className="ml-2 text-gray-500">图表占位符</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* 原始数据 */}
            {details?.rawData && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">原始数据</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRawData(true)}
                            icon={<Eye className="w-4 h-4" />}
                        >
                            查看详情
                        </Button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(details.rawData, null, 2).slice(0, 500)}...
                        </pre>
                    </div>
                </Card>
            )}
        </div>
    );

    // 渲染问题列表标签页
    const renderIssues = () => {
        const issueColumns: TableColumn[] = [
            {
                key: 'severity',
                title: '严重程度',
                render: (value) => (
                    <Badge variant={getSeverityColor(value) as any} size="sm">
                        {value}
                    </Badge>
                )
            },
            {
                key: 'title',
                title: '问题标题',
                render: (value, record) => (
                    <div>
                        <div className="font-medium text-gray-900">{value}</div>
                        <div className="text-sm text-gray-500">{record.category}</div>
                    </div>
                )
            },
            {
                key: 'description',
                title: '描述',
                render: (value) => (
                    <div className="max-w-xs truncate" title={value}>
                        {value}
                    </div>
                )
            },
            {
                key: 'actions',
                title: '操作',
                render: (_, record) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection(record.id)}
                        icon={expandedSections.has(record.id) ?
                            <ChevronDown className="w-4 h-4" /> :
                            <ChevronRight className="w-4 h-4" />
                        }
                    >
                        详情
                    </Button>
                )
            }
        ];

        return (
            <div className="space-y-6">
                {/* 筛选器 */}
                <Card className="p-4">
                    <div className="flex items-center space-x-4">
                        <Select
                            options={severityOptions}
                            value={severityFilter}
                            onChange={(value) => setSeverityFilter(value as string)}
                            placeholder="筛选严重程度"
                        />
                        <Select
                            options={categoryOptions}
                            value={categoryFilter}
                            onChange={(value) => setCategoryFilter(value as string)}
                            placeholder="筛选分类"
                        />
                        <Input
                            placeholder="搜索问题..."
                            value={searchQuery}
                            onChange={(value) => setSearchQuery(value as string)}
                            leftIcon={<Filter className="w-4 h-4" />}
                        />
                    </div>
                </Card>

                {/* 问题列表 */}
                <Card>
                    <Table
                        columns={issueColumns}
                        data={filteredIssues}
                        rowKey="id"
                    />
                </Card>

                {/* 展开的问题详情 */}
                {filteredIssues.map(issue => (
                    expandedSections.has(issue.id) && (
                        <Card key={`detail-${issue.id}`} className="p-6 border-l-4 border-blue-500">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">问题描述</h4>
                                    <p className="text-gray-700">{issue.description}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">影响</h4>
                                    <p className="text-gray-700">{issue.impact}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">解决方案</h4>
                                    <p className="text-blue-600">{issue.solution}</p>
                                </div>
                            </div>
                        </Card>
                    )
                ))}
            </div>
        );
    };

    // 渲染建议标签页
    const renderRecommendations = () => (
        <div className="space-y-4">
            {details?.recommendations?.map((rec, index) => (
                <Card key={index} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <Badge variant={rec.priority === 'critical' ? 'danger' : 'primary'} size="sm">
                            {rec.priority}
                        </Badge>
                    </div>
                    <p className="text-gray-700 mb-3">{rec.description}</p>
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <h5 className="font-medium text-blue-900 mb-1">解决方案</h5>
                        <p className="text-blue-800 text-sm">{rec.solution}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="font-medium text-green-900 mb-1">预期影响</h5>
                        <p className="text-green-800 text-sm">{rec.estimatedImpact}</p>
                    </div>
                </Card>
            )) || (
                    <Card className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无优化建议</h3>
                        <p className="text-gray-600">当前测试结果良好，无需特别优化</p>
                    </Card>
                )}
        </div>
    );

    return (
        <div className={`space-y-6 ${className}`}>
            {/* 头部信息 */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${result.status === 'completed' ? 'bg-green-50' :
                            result.status === 'failed' ? 'bg-red-50' : 'bg-blue-50'}`}>
                            {result.status === 'completed' ? (
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : result.status === 'failed' ? (
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            ) : (
                                <Clock className="w-8 h-8 text-blue-600" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">测试结果</h1>
                            <p className="text-gray-600 mt-1">
                                {result.testType} • {new Date(result.startTime).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {onShare && (
                            <Button
                                variant="ghost"
                                onClick={onShare}
                                icon={<Share2 className="w-4 h-4" />}
                            >
                                分享
                            </Button>
                        )}
                        {onDownload && (
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="ghost"
                                    onClick={() => onDownload('pdf')}
                                    icon={<Download className="w-4 h-4" />}
                                >
                                    PDF
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => onDownload('json')}
                                >
                                    JSON
                                </Button>
                            </div>
                        )}
                        {result.status === 'failed' && onRetry && (
                            <Button
                                variant="primary"
                                onClick={onRetry}
                                icon={<TrendingUp className="w-4 h-4" />}
                            >
                                重新测试
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* 标签页导航 */}
            <Card className="p-0">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { key: 'overview', label: '概览' },
                            { key: 'details', label: '详细信息' },
                            { key: 'issues', label: `问题 (${details?.issues?.length || 0})` },
                            { key: 'recommendations', label: `建议 (${details?.recommendations?.length || 0})` }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'details' && renderDetails()}
                    {activeTab === 'issues' && renderIssues()}
                    {activeTab === 'recommendations' && renderRecommendations()}
                </div>
            </Card>

            {/* 原始数据模态框 */}
            <Modal
                isOpen={showRawData}
                onClose={() => setShowRawData(false)}
                title="原始数据"
                size="xl"
            >
                <div className="max-h-96 overflow-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(details?.rawData, null, 2)}
                    </pre>
                </div>
            </Modal>
        </div>
    );
};

export default ResultViewer;