/**
 * 测试结果展示组件
 * 用于统一展示各种测试结果，支持多种视图模式和详细分析
 */

import React, { useState, useMemo } from 'react';
import {CheckCircle, XCircle, AlertCircle, Clock, Share2, FileText, ChevronDown, ChevronRight, Info, ExternalLink, Copy} from 'lucide-react';
import {Doughnut, Radar} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { toast } from 'react-hot-toast';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 测试结果数据接口
interface TestResult {
  id: string;
  type: 'performance' | 'security' | 'seo' | 'api' | 'stress' | 'compatibility' | 'ux';
  name: string;
  url?: string;
  status: 'success' | 'warning' | 'error' | 'running';
  score: number;
  maxScore: number;
  startTime: Date;
  endTime?: Date;
  duration: number;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  metrics: Record<string, any>;
  details: TestResultDetail[];
  recommendations: Recommendation[];
  rawData?: unknown;
}

interface TestResultDetail {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  value: unknown;
  expected?: unknown;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

interface Recommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  category: string;
  resources?: string[];
}

interface TestResultDisplayProps {
  results: TestResult | TestResult[];
  viewMode?: 'summary' | 'detailed' | 'comparison';
  showCharts?: boolean;
  showRecommendations?: boolean;
  allowExport?: boolean;
  onExport?: (format: 'json' | 'pdf' | 'csv') => void;
  onShare?: () => void;
  className?: string;
}

const TestResultDisplay: React.FC<TestResultDisplayProps> = ({
  results,
  viewMode = 'detailed',
  showCharts = true,
  showRecommendations = true,
  allowExport = true,
  onExport,
  onShare,
  className = ''
}) => {
  // 状态管理
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'metrics']));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'category'>('priority');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // 处理单个或多个结果
  const resultList = Array.isArray(results) ? results : [results];
  const primaryResult = resultList[0];

  // 获取状态颜色和图标
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return { color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle };
      case 'warning':
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle };
      case 'error':
        return { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle };
      case 'running':
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Clock };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Info };
    }
  };

  // 计算总体评分
  const overallScore = useMemo(() => {
    if (resultList.length === 1) {
      return (primaryResult.score / primaryResult.maxScore) * 100;
    }
    const totalScore = resultList.reduce((sum, result) => sum + result.score, 0);
    const totalMaxScore = resultList.reduce((sum, result) => sum + result.maxScore, 0);
    return (totalScore / totalMaxScore) * 100;
  }, [resultList, primaryResult]);

  // 分组详情
  const groupedDetails = useMemo(() => {
    const groups: Record<string, TestResultDetail[]> = {};
    primaryResult.details.forEach(detail => {
      if (!groups[detail.category]) {
        groups[detail.category] = [];
      }
      groups[detail.category].push(detail);
    });
    return groups;
  }, [primaryResult.details]);

  // 筛选推荐
  const filteredRecommendations = useMemo(() => {
    let filtered = [...primaryResult.recommendations];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(rec => rec.category === selectedCategory);
    }
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(rec => rec.priority === filterLevel);
    }

    filtered.sort((a, b) => {

      /**

       * switch功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      switch (sortBy) {
        case 'priority':
          return priorityOrder[b.priority] - priorityOrder[a?.priority];
        case 'impact':
          return b.impact.localeCompare(a?.impact);
        case 'category':
          return a?.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [primaryResult.recommendations, selectedCategory, filterLevel, sortBy]);

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 复制结果到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 渲染评分圆环
  const renderScoreChart = () => {
    const data = {
      datasets: [{
        data: [overallScore, 100 - overallScore],
        backgroundColor: [
          overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444',
          '#e5e7eb'
        ],
        borderWidth: 0,
        cutout: '70%'
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    };

    return (
      <div className="relative w-32 h-32">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(overallScore)}</div>
            <div className="text-xs text-gray-500">分数</div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染指标图表
  const renderMetricsChart = () => {
    const metrics = primaryResult.metrics;
    const labels = Object.keys(metrics);
    const values = Object.values(metrics).map(v => typeof v === 'number' ? v : 0);

    const data = {
      labels,
      datasets: [{
        label: '指标值',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
      }]
    };

    const options = {
      responsive: true,
      scales: {
        r: {
          angleLines: { display: false },
          suggestedMin: 0,
          suggestedMax: 100
        }
      },
      plugins: {
        legend: { display: false }
      }
    };

    return <Radar data={data} options={options} />;
  };

  // 渲染摘要卡片
  const renderSummaryCards = () => {
    const { summary } = primaryResult;
    const cards = [
      { label: '总计', value: summary.total, color: 'blue', icon: FileText },
      { label: '通过', value: summary.passed, color: 'green', icon: CheckCircle },
      { label: '警告', value: summary.warnings, color: 'yellow', icon: AlertCircle },
      { label: '失败', value: summary.failed, color: 'red', icon: XCircle }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Icon className={`h-8 w-8 text-${color}-600`} />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className={`text-2xl font-semibold text-${color}-600`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染详细信息表格
  const renderDetailsTable = (category: string, details: TestResultDetail[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                检查项
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                值
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                影响
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {details.map((detail, index) => {
              const statusConfig = getStatusConfig(detail.status === 'pass' ? 'success' : detail.status === 'fail' ? 'error' : 'warning');
              const Icon = statusConfig.icon;

              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{detail.name}</div>
                      <div className="text-sm text-gray-500">{detail.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 ${statusConfig.color}`} />
                      <span className={`ml-2 text-sm font-medium ${statusConfig.color}`}>
                        {detail.status === 'pass' ? '通过' : detail.status === 'fail' ? '失败' : '警告'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {JSON.stringify(detail.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      detail.impact === 'critical' ? 'bg-red-100 text-red-800' :
                      detail.impact === 'high' ? 'bg-orange-100 text-orange-800' :
                      detail.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {detail.impact === 'critical' ? '严重' : 
                       detail.impact === 'high' ? '高' :
                       detail.impact === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => copyToClipboard(`${detail.name}: ${detail.value}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部信息 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{primaryResult.name}</h2>
            {primaryResult.url && (
              <p className="text-sm text-gray-600 mt-1">
                <ExternalLink className="inline h-4 w-4 mr-1" />
                {primaryResult.url}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              执行时间: {primaryResult.duration}秒 | 
              完成时间: {primaryResult.endTime?.toLocaleString()}
            </p>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex space-x-2">
            {allowExport && onExport && (
              <div className="relative">
                <select
                  onChange={(e) => onExport(e?.target.value as 'json' | 'pdf' | 'csv')}
                  className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">导出格式</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                分享
              </button>
            )}
          </div>
        </div>

        {/* 评分和摘要 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex justify-center">
            {renderScoreChart()}
          </div>
          <div className="lg:col-span-2">
            {renderSummaryCards()}
          </div>
        </div>
      </div>

      {/* 详细结果 */}
      {Object.entries(groupedDetails).map(([category, details]) => (
        <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div
            className="px-6 py-4 border-b border-gray-200 cursor-pointer"
            onClick={() => toggleSection(category)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              {expandedSections.has(category) ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
          {expandedSections.has(category) && (
            <div className="p-6">
              {renderDetailsTable(category, details)}
            </div>
          )}
        </div>
      ))}

      {/* 指标图表 */}
      {showCharts && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">性能指标</h3>
          <div className="h-64">
            {renderMetricsChart()}
          </div>
        </div>
      )}

      {/* 建议和推荐 */}
      {showRecommendations && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">优化建议</h3>
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e?.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">所有分类</option>
                {[...new Set(primaryResult.recommendations.map(r => r.category))].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e?.target.value as 'priority' | 'impact' | 'category')}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="priority">按优先级</option>
                <option value="impact">按影响</option>
                <option value="category">按分类</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredRecommendations.map((rec, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                rec.priority === 'critical' ? 'border-red-500 bg-red-50' :
                rec.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-md font-semibold text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.priority === 'critical' ? '严重' :
                         rec.priority === 'high' ? '高优先级' :
                         rec.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                      <span className="text-xs text-gray-500">
                        实施难度: {rec.effort === 'easy' ? '简单' : rec.effort === 'medium' ? '中等' : '困难'}
                      </span>
                      <span className="text-xs text-gray-500">
                        分类: {rec.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultDisplay;
