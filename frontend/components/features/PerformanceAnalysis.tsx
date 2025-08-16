import {AlertTriangle, CheckCircle, Clock, Gauge, Minus, TrendingDown, TrendingUp, Zap} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {dataAnalysisService, PerformanceAnalysis} from '../../services/analytics/dataAnalysisService';

interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  description: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, unit, description, color }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-gray-400';

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    </div>
  );
};

interface RecommendationCardProps {
  recommendation: {
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  };
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };

  const priorityIcons = {
    high: <AlertTriangle className="w-4 h-4" />,
    medium: <Clock className="w-4 h-4" />,
    low: <CheckCircle className="w-4 h-4" />
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[recommendation.priority]}`}>
            {priorityIcons[recommendation.priority]}
            <span className="ml-1">{recommendation.priority.toUpperCase()}</span>
          </span>
          <span className="text-xs text-gray-400">{recommendation.category}</span>
        </div>
      </div>
      <h4 className="text-white font-semibold mb-2">{recommendation.title}</h4>
      <p className="text-gray-400 text-sm mb-3">{recommendation.description}</p>
      <div className="flex items-center space-x-2">
        <Zap className="w-4 h-4 text-green-400" />
        <span className="text-green-400 text-sm font-medium">{recommendation.impact}</span>
      </div>
    </div>
  );
};

const PerformanceAnalysisComponent: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await dataAnalysisService.getPerformanceAnalysis();
      setPerformanceData(data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    
        return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">加载性能数据...</span>
      </div>
    );
      }

  if (!performanceData) {
    
        return (
      <div className="text-center py-12">
        <Gauge className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">暂无性能数据</h3>
        <p className="text-gray-400">请先运行一些网站测试以查看性能分析</p>
      </div>
    );
      }

  // 准备雷达图数据
  const radarData = [
    {
      metric: 'FCP',
      value: Math.max(0, 100 - (performanceData.coreWebVitals.fcp.average * 50)),
      fullMark: 100
    },
    {
      metric: 'LCP',
      value: Math.max(0, 100 - (performanceData.coreWebVitals.lcp.average * 25)),
      fullMark: 100
    },
    {
      metric: 'CLS',
      value: Math.max(0, 100 - (performanceData.coreWebVitals.cls.average * 1000)),
      fullMark: 100
    },
    {
      metric: 'TTI',
      value: Math.max(0, 100 - (performanceData.coreWebVitals.tti.average * 20)),
      fullMark: 100
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">性能分析</h2>
        <button
          onClick={loadPerformanceData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          刷新数据
        </button>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="First Contentful Paint"
          value={performanceData.coreWebVitals.fcp.average.toFixed(1)}
          trend={performanceData.coreWebVitals.fcp.trend}
          unit="s"
          description="首次内容绘制时间"
          color="text-blue-400"
        />
        <MetricCard
          title="Largest Contentful Paint"
          value={performanceData.coreWebVitals.lcp.average.toFixed(1)}
          trend={performanceData.coreWebVitals.lcp.trend}
          unit="s"
          description="最大内容绘制时间"
          color="text-green-400"
        />
        <MetricCard
          title="Cumulative Layout Shift"
          value={performanceData.coreWebVitals.cls.average.toFixed(3)}
          trend={performanceData.coreWebVitals.cls.trend}
          unit=""
          description="累积布局偏移"
          color="text-yellow-400"
        />
        <MetricCard
          title="Time to Interactive"
          value={performanceData.coreWebVitals.tti.average.toFixed(1)}
          trend={performanceData.coreWebVitals.tti.trend}
          unit="s"
          description="可交互时间"
          color="text-purple-400"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 性能分数趋势 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">性能分数趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData.performanceScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('zh-CN')}
              />
              <Line
                type="monotone"
                dataKey="performance"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="性能"
              />
              <Line
                type="monotone"
                dataKey="seo"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="SEO"
              />
              <Line
                type="monotone"
                dataKey="accessibility"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                name="可访问性"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Core Web Vitals 雷达图 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Core Web Vitals 概览</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="性能指标"
                dataKey="value"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* URL性能分析 */}
      {performanceData.urlPerformance.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">URL性能分析</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">URL</th>
                  <th className="text-left py-3 px-4 text-gray-300">平均分数</th>
                  <th className="text-left py-3 px-4 text-gray-300">测试次数</th>
                  <th className="text-left py-3 px-4 text-gray-300">趋势</th>
                  <th className="text-left py-3 px-4 text-gray-300">最后测试</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.urlPerformance.map((url, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-white truncate max-w-xs" title={url.url}>
                      {url.url}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${url.avgScore >= 80 ? 'bg-green-500/20 text-green-400' :
                          url.avgScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                        {url.avgScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{url.testCount}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        {url.trend === 'improving' ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : url.trend === 'declining' ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-xs ${url.trend === 'improving' ? 'text-green-400' :
                            url.trend === 'declining' ? 'text-red-400' :
                              'text-gray-400'
                          }`}>
                          {url.trend === 'improving' ? '改善' : url.trend === 'declining' ? '下降' : '稳定'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(url.lastTested).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 优化建议 */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {performanceData.recommendations.map((recommendation, index) => (
            <RecommendationCard key={index} recommendation={recommendation} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalysisComponent;
