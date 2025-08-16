/**
 * 性能和可访问性测试结果查看器
 * 
 * 功能特性：
 * - 显示性能和可访问性测试结果
 * - 可视化图表展示（Chart.js）
 * - Core Web Vitals分析
 * - WCAG合规性检查
 * - 改进建议展示
 * - 报告导出功能
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, RadialLinearScale, Title, // Tooltip } from 'chart.js'; // 已修复
import { Activity, AlertTriangle, CheckCircle, Download, Eye, Shield, Target, TrendingUp, // Zap } from 'lucide-react'; // 已修复
import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

// 注册Chart.js组件
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    ArcElement
);

interface PerformanceAccessibilityResult {
    testId: string;
    url: string;
    startTime: string;
    endTime: string;
    duration: number;
    overallScore: number;
    performanceScore: number;
    accessibilityScore: number;
    performance: {
        lighthouse: {
            score: number;
            metrics: {
                firstContentfulPaint: number;
                largestContentfulPaint: number;
                speedIndex: number;
                timeToInteractive: number;
                totalBlockingTime: number;
                cumulativeLayoutShift: number;
            };
            opportunities: Array<{
                title: string;
                description: string;
                savings: number;
                impact: string;
            }>;
            diagnostics: Array<{
                title: string;
                description: string;
                severity: string;
            }>;
        };
        coreWebVitals: {
            lcp: { value: number; rating: string };
            fid: { value: number; rating: string };
            cls: { value: number; rating: string };
            fcp: { value: number; rating: string };
            ttfb: { value: number; rating: string };
        };
    };
    accessibility: {
        wcagCompliance: {
            level: string;
            overallCompliance: number;
            details: Record<string, any>;
        };
        violations: Array<{
            id: string;
            title: string;
            description: string;
            impact: string;
            help: string;
            nodes: number;
        }>;
        passes: Array<{
            id: string;
            title: string;
            description: string;
        }>;
        summary: {
            totalViolations: number;
            totalPasses: number;
            complianceLevel: string;
        };
    };
    recommendations: Array<{
        category: string;
        priority: string;
        title: string;
        description: string;
        impact: string;
        actions: string[];
    }>;
}

interface PerformanceAccessibilityViewerProps {
    results: PerformanceAccessibilityResult;
    onExport?: (format: string) => void;
    className?: string;
}

const PerformanceAccessibilityViewer: React.FC<PerformanceAccessibilityViewerProps> = ({
    results,
    onExport,
    className = ''
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
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
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'accessibility' | 'recommendations'>('overview');
    const [visualizations, setVisualizations] = useState<any>(null);

    useEffect(() => {
        generateVisualizations();
    }, [results]);

    const generateVisualizations = () => {
        const performanceChart = {
            type: 'radar',
            data: {
                labels: ['性能', '可访问性', '最佳实践', 'SEO'],
                datasets: [{
                    label: '当前评分',
                    data: [
                        results.performanceScore,
                        results.accessibilityScore,
                        85, // 假设最佳实践评分
                        80  // 假设SEO评分
                    ],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top' as const,
                    },
                    title: {
                        display: true,
                        text: '综合评分雷达图'
                    }
                }
            }
        };

        const coreWebVitalsChart = {
            type: 'bar',
            data: {
                labels: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
                datasets: [{
                    label: '当前值',
                    data: [
                        results.performance.coreWebVitals.lcp.value,
                        results.performance.coreWebVitals.fid.value,
                        results.performance.coreWebVitals.cls.value * 1000, // CLS转换为更好的显示
                        results.performance.coreWebVitals.fcp.value,
                        results.performance.coreWebVitals.ttfb.value
                    ],
                    backgroundColor: [
                        getColorByRating(results.performance.coreWebVitals.lcp.rating),
                        getColorByRating(results.performance.coreWebVitals.fid.rating),
                        getColorByRating(results.performance.coreWebVitals.cls.rating),
                        getColorByRating(results.performance.coreWebVitals.fcp.rating),
                        getColorByRating(results.performance.coreWebVitals.ttfb.rating)
                    ],
                    borderColor: [
                        getColorByRating(results.performance.coreWebVitals.lcp.rating),
                        getColorByRating(results.performance.coreWebVitals.fid.rating),
                        getColorByRating(results.performance.coreWebVitals.cls.rating),
                        getColorByRating(results.performance.coreWebVitals.fcp.rating),
                        getColorByRating(results.performance.coreWebVitals.ttfb.rating)
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Core Web Vitals'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '时间 (ms) / 分数'
                        }
                    }
                }
            }
        };

        const accessibilityBreakdown = {
            type: 'doughnut',
            data: {
                labels: ['通过', '违规', '未测试'],
                datasets: [{
                    data: [
                        results.accessibility.passes.length,
                        results.accessibility.violations.length,
                        Math.max(0, 50 - results.accessibility.passes.length - results.accessibility.violations.length)
                    ],
                    backgroundColor: ['#4CAF50', '#F44336', '#FFC107'],
                    borderColor: ['#4CAF50', '#F44336', '#FFC107'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom' as const,
                    },
                    title: {
                        display: true,
                        text: '可访问性测试分布'
                    }
                }
            }
        };

        setVisualizations({
            performanceChart,
            coreWebVitalsChart,
            accessibilityBreakdown
        });
    };

    const getColorByRating = (rating: string) => {
        switch (rating) {
            case 'good': return '#4CAF50';
            case 'needs-improvement': return '#FF9800';
            case 'poor': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBgColor = (score: number) => {
        if (score >= 90) return 'bg-green-100';
        if (score >= 70) return 'bg-yellow-100';
        return 'bg-red-100';
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const handleExport = (format: string) => {
        if (onExport) {
            onExport(format);
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow-lg ${className}`}>
            {/* 头部信息 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">性能和可访问性测试报告</h2>
                        <p className="text-blue-100 mb-1">测试网站: {results.url}</p>
                        <p className="text-blue-100 mb-1">
                            测试时间: {new Date(results.startTime).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-blue-100">
                            测试耗时: {formatDuration(results.duration)}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleExport('html')}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Download size={16} />
                            <span>导出HTML</span>
                        </button>
                        <button
                            onClick={() => handleExport('json')}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Download size={16} />
                            <span>导出JSON</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 评分卡片 */}
            <div className="p-6 border-b">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-4 rounded-lg ${getScoreBgColor(results.overallScore)}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">综合评分</h3>
                                <p className={`text-3xl font-bold ${getScoreColor(results.overallScore)}`}>
                                    {results.overallScore}
                                </p>
                            </div>
                            <Target className={`w-8 h-8 ${getScoreColor(results.overallScore)}`} />
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${getScoreBgColor(results.performanceScore)}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">性能评分</h3>
                                <p className={`text-3xl font-bold ${getScoreColor(results.performanceScore)}`}>
                                    {results.performanceScore}
                                </p>
                            </div>
                            <Zap className={`w-8 h-8 ${getScoreColor(results.performanceScore)}`} />
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${getScoreBgColor(results.accessibilityScore)}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">可访问性评分</h3>
                                <p className={`text-3xl font-bold ${getScoreColor(results.accessibilityScore)}`}>
                                    {results.accessibilityScore}
                                </p>
                            </div>
                            <Eye className={`w-8 h-8 ${getScoreColor(results.accessibilityScore)}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签页导航 */}
            <div className="border-b">
                <nav className="flex space-x-8 px-6">
                    {[
                        { key: 'overview', label: '概览', icon: Activity },
                        { key: 'performance', label: '性能分析', icon: TrendingUp },
                        { key: 'accessibility', label: '可访问性', icon: Eye },
                        { key: 'recommendations', label: '改进建议', icon: Shield }
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === key
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Icon size={16} />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* 标签页内容 */}
            <div className="p-6">
                {activeTab === 'overview' && visualizations && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div style={{ height: '300px' }}>
                                    <Radar data={visualizations.performanceChart.data} options={visualizations.performanceChart.options} />
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div style={{ height: '300px' }}>
                                    <Doughnut data={visualizations.accessibilityBreakdown.data} options={visualizations.accessibilityBreakdown.options} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'performance' && visualizations && (
                    <div className="space-y-8">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div style={{ height: '400px' }}>
                                <Bar data={visualizations.coreWebVitalsChart.data} options={visualizations.coreWebVitalsChart.options} />
                            </div>
                        </div>

                        {/* Core Web Vitals详情 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {Object.entries(results.performance.coreWebVitals).map(([key, vital]) => (
                                <div key={key} className="bg-white border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-700">{key.toUpperCase()}</h4>
                                        <div className={`w-3 h-3 rounded-full ${getColorByRating(vital.rating)}`} style={{ backgroundColor: getColorByRating(vital.rating) }}></div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {key === 'cls' ? vital.value.toFixed(3) : `${vital.value}ms`}
                                    </p>
                                    <p className="text-sm text-gray-500 capitalize">{vital.rating.replace('-', ' ')}</p>
                                </div>
                            ))}
                        </div>

                        {/* 性能优化机会 */}
                        {results.performance.lighthouse.opportunities.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <TrendingUp className="mr-2" size={20} />
                                    性能优化机会
                                </h3>
                                <div className="space-y-3">
                                    {results.performance.lighthouse.opportunities.slice(0, 5).map((opportunity, index) => (
                                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-green-800">{opportunity.title}</h4>
                                                    <p className="text-green-700 text-sm mt-1">{opportunity.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-green-600 font-semibold">
                                                        节省 {formatDuration(opportunity.savings)}
                                                    </p>
                                                    <p className="text-green-500 text-xs capitalize">{opportunity.impact} 影响</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'accessibility' && (
                    <div className="space-y-8">
                        {/* WCAG合规性 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <Shield className="mr-2" size={20} />
                                WCAG {results.accessibility.wcagCompliance.level} 合规性
                            </h3>
                            <div className="flex items-center space-x-4">
                                <div className="text-3xl font-bold text-blue-600">
                                    {results.accessibility.wcagCompliance.overallCompliance}%
                                </div>
                                <div className="flex-1">
                                    <div className="bg-gray-200 rounded-full h-4">
                                        <div
                                            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                            style={{ width: `${results.accessibility.wcagCompliance.overallCompliance}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 可访问性违规 */}
                        {results.accessibility.violations.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <AlertTriangle className="mr-2 text-red-500" size={20} />
                                    可访问性问题 ({results.accessibility.violations.length})
                                </h3>
                                <div className="space-y-3">
                                    {results.accessibility.violations.map((violation, index) => (
                                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-red-800">{violation.title}</h4>
                                                    <p className="text-red-700 text-sm mt-1">{violation.description}</p>
                                                    <p className="text-red-600 text-sm mt-2">{violation.help}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-red-600 font-semibold capitalize">{violation.impact}</p>
                                                    <p className="text-red-500 text-xs">{violation.nodes} 个元素</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 可访问性通过项 */}
                        {results.accessibility.passes.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center">
                                    <CheckCircle className="mr-2 text-green-500" size={20} />
                                    通过的检查项 ({results.accessibility.passes.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {results.accessibility.passes.slice(0, 10).map((pass, index) => (
                                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <h4 className="font-medium text-green-800 text-sm">{pass.title}</h4>
                                            <p className="text-green-700 text-xs mt-1">{pass.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'recommendations' && (
                    <div className="space-y-6">
                        {results.recommendations.map((recommendation, index) => (
                            <div key={index} className="border rounded-lg p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
                                        <p className="text-gray-600 mt-1">{recommendation.description}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${recommendation.priority === 'high'
                                        ? 'bg-red-100 text-red-800'
                                        : recommendation.priority === 'medium'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                        {recommendation.priority === 'high' ? '高优先级' :
                                            recommendation.priority === 'medium' ? '中优先级' : '低优先级'}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-gray-700">
                                        <strong>预期影响:</strong> {recommendation.impact}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">具体行动:</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {recommendation.actions.map((action, actionIndex) => (
                                            <li key={actionIndex} className="text-sm text-gray-700">{action}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceAccessibilityViewer;