/**
 * 高级分析组件
 * 提供趋势分析、对比分析等高级分析功能
 */

import { Activity, AlertTriangle, BarChart3, CheckCircle, LineChart, RefreshCw, Target, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
// 暂时注释掉缺失的导入
// advancedAnalyticsService,
// TrendAnalysisResult,
// ComparisonResult,
// PerformanceMetrics,
// AnalyticsFilter
// } from '../../services/analytics/analyticsService';
import { Bar, BarChart, CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AnalyticsProps {
  dataType: 'performance' | 'security' | 'seo' | 'accessibility';
  timeRange?: '24h' | '7d' | '30d' | '90d';
  onInsightClick?: (insight: string) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({
  dataType,
  timeRange = '7d',
  onInsightClick
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trend' | 'comparison' | 'performance' | 'insights'>('trend');
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [filter, setFilter] = useState<AnalyticsFilter>({});

  useEffect(() => {
    loadAnalyticsData();
  }, [dataType, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [insightsResult, performanceResult] = await Promise.all([
        advancedAnalyticsService.getAnalyticsInsights(dataType, timeRange),
        advancedAnalyticsService.analyzePerformanceMetrics(filter)
      ]);

      setInsights(insightsResult);
      setPerformanceData(performanceResult);

      // 使用性能数据进行趋势分析
      if (performanceResult.responseTime.length > 0) {
        const trendResult = await advancedAnalyticsService.analyzeTrend(
          performanceResult.responseTime,
          { predictionDays: 7, smoothing: true }
        );
        setTrendData(trendResult);
      }

    } catch (error) {
      console.error('加载分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareData = async () => {
    if (!performanceData) return;

    setLoading(true);
    try {
      // 比较当前周期与上一周期
      const currentData = performanceData.responseTime.slice(-7);
      const previousData = performanceData.responseTime.slice(-14, -7);

      const comparisonResult = await advancedAnalyticsService.compareData(
        previousData,
        currentData,
        { alignByTime: true, significanceThreshold: 0.1 }
      );

      setComparisonData(comparisonResult);
      setActiveTab('comparison');
    } catch (error) {
      console.error('对比分析失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatChartData = (data: any[]) => {
    return data.map(item => ({
      ...item,
      time: new Date(item.timestamp).toLocaleDateString(),
      value: Math.round(item.value * 100) / 100
    }));
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            高级分析 - {dataType.toUpperCase()}
          </h2>
          <p className="text-gray-400 mt-1">深度数据分析和洞察</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCompareData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            对比分析
          </button>

          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex space-x-1 mb-6 bg-gray-700 rounded-lg p-1">
        {[
          { key: 'trend', label: '趋势分析', icon: LineChart },
          { key: 'comparison', label: '对比分析', icon: BarChart3 },
          { key: 'performance', label: '性能指标', icon: Activity },
          { key: 'insights', label: '智能洞察', icon: Target }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === tab.key
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-600'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-400">加载分析数据...</span>
        </div>
      )}

      {/* 趋势分析 */}
      {activeTab === 'trend' && trendData && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon(trendData.trend)}
                <span className="text-white font-medium">趋势方向</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {trendData.trend === 'increasing' ? '上升' :
                  trendData.trend === 'decreasing' ? '下降' : '稳定'}
              </p>
              <p className="text-gray-400 text-sm">
                强度: {(trendData.trendStrength * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-white font-medium">变化率</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {trendData.changeRate > 0 ? '+' : ''}{trendData.changeRate.toFixed(2)}%
              </p>
              <p className="text-gray-400 text-sm">相对于起始值</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-white font-medium">预测置信度</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {(trendData.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-gray-400 text-sm">未来7天预测</p>
            </div>
          </div>

          {/* 趋势图表 */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">趋势预测图</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={formatChartData(trendData.prediction)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-700)" />
                <XAxis dataKey="time" stroke="var(--color-gray-400)" />
                <YAxis stroke="var(--color-gray-400)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-gray-700)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>

          {/* 洞察 */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">趋势洞察</h3>
            <div className="space-y-2">
              {trendData.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-gray-600 rounded cursor-pointer hover:bg-gray-500 transition-colors"
                  onClick={() => onInsightClick?.(insight)}
                >
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 对比分析 */}
      {activeTab === 'comparison' && comparisonData && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">平均差异</h4>
              <p className="text-2xl font-bold text-white">
                {comparisonData.summary.averageDifference.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">最大差异</h4>
              <p className="text-2xl font-bold text-white">
                {comparisonData.summary.maxDifference.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">最小差异</h4>
              <p className="text-2xl font-bold text-white">
                {comparisonData.summary.minDifference.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">显著变化</h4>
              <p className="text-2xl font-bold text-white">
                {comparisonData.summary.significantChanges}
              </p>
            </div>
          </div>

          {/* 对比图表 */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">数据对比</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData.baseline.map((item, index) => ({
                index,
                baseline: item.value,
                comparison: comparisonData.comparison[index]?.value || 0,
                difference: comparisonData.differences.absolute[index]
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-700)" />
                <XAxis dataKey="index" stroke="var(--color-gray-400)" />
                <YAxis stroke="var(--color-gray-400)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-gray-700)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="baseline" fill="#8884d8" name="基准数据" />
                <Bar dataKey="comparison" fill="#82ca9d" name="对比数据" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 性能指标 */}
      {activeTab === 'performance' && performanceData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(performanceData).map(([key, data]) => (
            <div key={key} className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-medium mb-4 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsLineChart data={formatChartData(data)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-700)" />
                  <XAxis dataKey="time" stroke="var(--color-gray-400)" />
                  <YAxis stroke="var(--color-gray-400)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-gray-700)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS[Object.keys(performanceData).indexOf(key)]}
                    strokeWidth={2}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* 智能洞察 */}
      {activeTab === 'insights' && insights && !loading && (
        <div className="space-y-6">
          {/* 总体评分 */}
          <div className="bg-gray-700 rounded-lg p-6 text-center">
            <h3 className="text-white font-medium mb-4">总体评分</h3>
            <div className="text-4xl font-bold text-white mb-2">
              {insights.score.toFixed(1)}
            </div>
            <div className="text-gray-400">满分100分</div>
          </div>

          {/* 洞察列表 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                关键洞察
              </h4>
              <div className="space-y-2">
                {insights.insights.map((insight: string, index: number) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-600 rounded text-gray-300 text-sm cursor-pointer hover:bg-gray-500 transition-colors"
                    onClick={() => onInsightClick?.(insight)}
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                优化建议
              </h4>
              <div className="space-y-2">
                {insights.recommendations.map((rec: string, index: number) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-600 rounded text-gray-300 text-sm cursor-pointer hover:bg-gray-500 transition-colors"
                    onClick={() => onInsightClick?.(rec)}
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                注意事项
              </h4>
              <div className="space-y-2">
                {insights.alerts.length > 0 ? (
                  insights.alerts.map((alert: string, index: number) => (
                    <div
                      key={index}
                      className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm"
                    >
                      {alert}
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
                    暂无需要注意的问题
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
