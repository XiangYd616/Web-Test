/**
 * 高级分析页面
 * 提供完整的数据分析和洞察功能
 */

import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Settings,
  Share2,
  Target,
  TrendingUp
} from 'lucide-react';
import React, { useState } from 'react';
import Analytics from '../../components/analytics/Analytics';
import { useAuthCheck } from '../../components/auth/WithAuthCheck';

const AnalyticsPage: React.FC = () => {
  useAuthCheck();

  const [selectedDataType, setSelectedDataType] = useState<'performance' | 'security' | 'seo' | 'accessibility'>('performance');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [showFilters, setShowFilters] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  const dataTypes = [
    { key: 'performance', label: '性能分析', icon: TrendingUp, color: 'blue' },
    { key: 'security', label: '安全分析', icon: Target, color: 'red' },
    { key: 'seo', label: 'SEO分析', icon: BarChart3, color: 'green' },
    { key: 'accessibility', label: '可访问性', icon: Settings, color: 'purple' }
  ];

  const timeRanges = [
    { key: '24h', label: '过去24小时' },
    { key: '7d', label: '过去7天' },
    { key: '30d', label: '过去30天' },
    { key: '90d', label: '过去90天' }
  ];

  const handleInsightClick = (insight: string) => {
    setInsights(prev => [...prev, insight]);
    // 这里可以添加更多的洞察处理逻辑
    console.log('洞察点击:', insight);
  };

  const handleExportReport = () => {
    // 导出分析报告
    const reportData = {
      dataType: selectedDataType,
      timeRange: selectedTimeRange,
      generatedAt: new Date().toISOString(),
      insights
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${selectedDataType}-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedDataType.toUpperCase()} 分析报告`,
          text: `查看 ${selectedTimeRange} 的${selectedDataType}分析报告`,
          url: window.location.href
        });
      } catch (error) {
        console.log('分享失败:', error);
      }
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              高级数据分析
            </h1>
            <p className="text-gray-400 mt-2">
              深度分析您的网站数据，获取智能洞察和优化建议
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>

            <button
              onClick={handleExportReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>

            <button
              onClick={handleShareReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
          </div>
        </div>

        {/* 筛选器 */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-white font-medium mb-4">分析筛选器</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 数据类型选择 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  数据类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dataTypes.map(type => (
                    <button
                      key={type.key}
                      onClick={() => setSelectedDataType(type.key as any)}
                      className={`p-3 rounded-lg border transition-colors flex items-center gap-2 ${selectedDataType === type.key
                        ? `bg-${type.color}-600 border-${type.color}-500 text-white`
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      <type.icon className="w-4 h-4" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 时间范围选择 */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  时间范围
                </label>
                <div className="space-y-2">
                  {timeRanges.map(range => (
                    <button
                      key={range.key}
                      onClick={() => setSelectedTimeRange(range.key as any)}
                      className={`w-full p-3 rounded-lg border transition-colors flex items-center gap-2 ${selectedTimeRange === range.key
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{range.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 快速选择器 */}
        <div className="flex flex-wrap gap-3">
          {dataTypes.map(type => (
            <button
              key={type.key}
              onClick={() => setSelectedDataType(type.key as any)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${selectedDataType === type.key
                ? `bg-${type.color}-600 border-${type.color}-500 text-white`
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
            </button>
          ))}
        </div>

        {/* 时间范围选择器 */}
        <div className="flex gap-2">
          {timeRanges.map(range => (
            <button
              key={range.key}
              onClick={() => setSelectedTimeRange(range.key as any)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedTimeRange === range.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* 主要分析组件 */}
        <Analytics
          dataType={selectedDataType}
          timeRange={selectedTimeRange}
          onInsightClick={handleInsightClick}
        />

        {/* 洞察收集器 */}
        {insights.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              收集的洞察 ({insights.length})
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700 rounded-lg text-gray-300 text-sm flex items-start gap-2"
                >
                  <span className="text-blue-400 font-medium">{index + 1}.</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setInsights([])}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                清空洞察
              </button>

              <button
                onClick={() => {
                  const insightText = insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n');
                  navigator.clipboard.writeText(insightText);
                  alert('洞察已复制到剪贴板');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                复制洞察
              </button>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">💡 使用提示</h4>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• 点击图表中的数据点可以查看详细信息</li>
            <li>• 使用"对比分析"按钮比较不同时期的数据</li>
            <li>• 点击洞察和建议可以收集到下方的洞察收集器中</li>
            <li>• 使用导出功能保存分析报告</li>
            <li>• 切换不同的数据类型和时间范围获取更全面的分析</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
