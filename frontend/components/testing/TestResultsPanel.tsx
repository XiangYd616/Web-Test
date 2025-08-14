import React, { useState } from 'react';
import { BarChart3, Download, Share2, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface TestResultsPanelProps {
  testType: string;
  results: any;
  loading?: boolean;
  error?: string;
  onExport?: () => void;
  onShare?: () => void;
  onRetest?: () => void;
  className?: string;
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  testType,
  results,
  loading = false,
  error,
  onExport,
  onShare,
  onRetest,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverview = () => {
    if (!results) return null;

    const score = results.score || results.overallScore || 0;
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'text-green-600 bg-green-100';
      if (score >= 70) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    };

    return (
      <div className="space-y-6">
        {/* 总体评分 */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {score >= 90 ? '优秀' : score >= 70 ? '良好' : '需要改进'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">总体评分</p>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.metrics && Object.entries(results.metrics).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {formatMetricName(key)}
                </span>
                {getMetricIcon(key, value)}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMetricValue(key, value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 测试摘要 */}
        {results.summary && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">测试摘要</h4>
            <p className="text-blue-800 dark:text-blue-200">{results.summary}</p>
          </div>
        )}
      </div>
    );
  };

  const renderDetails = () => {
    if (!results || !results.details) return null;

    return (
      <div className="space-y-4">
        {Object.entries(results.details).map(([category, data]: [string, any]) => (
          <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {formatCategoryName(category)}
              </h4>
            </div>
            <div className="p-4">
              {Array.isArray(data) ? (
                <ul className="space-y-2">
                  {data.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      {getStatusIcon(item.status)}
                      <span className="text-gray-700 dark:text-gray-300">{item.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!results || !results.recommendations) return null;

    return (
      <div className="space-y-4">
        {results.recommendations.map((rec: any, index: number) => (
          <div key={index} className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  {rec.title || '建议'}
                </h4>
                <p className="text-blue-800 dark:text-blue-200 mt-1">
                  {rec.description || rec.message}
                </p>
                {rec.priority && (
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority === 'high' ? '高优先级' :
                     rec.priority === 'medium' ? '中优先级' : '低优先级'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const formatMetricName = (key: string) => {
    const names = {
      responseTime: '响应时间',
      throughput: '吞吐量',
      errorRate: '错误率',
      availability: '可用性',
      performance: '性能',
      security: '安全性',
      accessibility: '可访问性'
    };
    return names[key] || key;
  };

  const formatMetricValue = (key: string, value: any) => {
    if (key.includes('Time')) return `${value}ms`;
    if (key.includes('Rate')) return `${value}%`;
    if (key.includes('Score')) return value;
    return value;
  };

  const getMetricIcon = (key: string, value: any) => {
    if (key.includes('Rate') && value > 5) return <XCircle className="w-4 h-4 text-red-500" />;
    if (key.includes('Score') && value >= 90) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatCategoryName = (category: string) => {
    const names = {
      performance: '性能分析',
      security: '安全检查',
      accessibility: '可访问性',
      seo: 'SEO优化',
      compatibility: '兼容性',
      usability: '可用性'
    };
    return names[category] || category;
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">分析测试结果...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">测试失败</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          {onRetest && (
            <button
              onClick={onRetest}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重新测试
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无测试结果</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">运行测试后，结果将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">测试结果</h3>
          </div>

          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="导出结果"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {onShare && (
              <button
                onClick={onShare}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="分享结果"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {onRetest && (
              <button
                onClick={onRetest}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="重新测试"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex space-x-4">
          {['overview', 'details', 'recommendations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'overview' ? '概览' : tab === 'details' ? '详细' : '建议'}
            </button>
          ))}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

export default TestResultsPanel;
