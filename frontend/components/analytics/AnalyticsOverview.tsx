import { Activity, AlertTriangle, BarChart3, Calendar, CheckCircle, Download, Filter, Globe, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { createElement, useEffect, useState } from 'react';
import type { ReactNode, FC } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsData, dataAnalysisService } from '../../services/dataAnalysisService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
            )}
            <span className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const AnalyticsOverview: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'tests' | 'scores' | 'types'>('tests');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  // 自动刷新功能
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAnalyticsData();
      }, 30000); // 每30秒刷新一次
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    // 返回undefined或清理函数
    return undefined;
  }, [autoRefresh]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // 直接调用测试历史API获取原始数据
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/test/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success && result.data && result.data.tests) {
        // 使用dataAnalysisService处理数据
        const processedData = await dataAnalysisService.processTestData(result.data.tests, dateRange);
        setAnalyticsData(processedData);
        setLastUpdated(new Date());
      } else {
        console.warn('No test data found in response:', result);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const exportData = (format: 'json' | 'csv') => {
    if (!analyticsData) return;

    const exportData = {
      summary: {
        totalTests: analyticsData.totalTests,
        successRate: analyticsData.successRate,
        averageScore: analyticsData.averageScore,
        exportedAt: new Date().toISOString()
      },
      dailyTests: analyticsData.dailyTests,
      testsByType: analyticsData.testsByType,
      testsByStatus: analyticsData.testsByStatus,
      topUrls: analyticsData.topUrls
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${dateRange}days-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">加载分析数据...</span>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">暂无数据</h3>
        <p className="text-gray-400">请先运行一些测试以查看分析数据</p>
      </div>
    );
  }

  const testTypeData = Object.entries(analyticsData.testsByType).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const statusData = Object.entries(analyticsData.testsByStatus).map(([status, count]) => ({
    name: status === 'completed' ? '成功' : status === 'failed' ? '失败' : '运行中',
    value: count
  }));

  return (
    <div className="space-y-6">
      {/* 头部控制区域 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">数据概览</h2>
          <div className="flex items-center space-x-4 mt-2">
            {lastUpdated && (
              <span className="text-sm text-gray-400">
                最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
              </span>
            )}
            {autoRefresh && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">自动刷新中</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>筛选</span>
          </button>

          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? '停止自动刷新' : '自动刷新'}</span>
          </button>

          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>

          <button
            onClick={() => exportData('json')}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="选择时间范围"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
        </div>
      </div>

      {/* 筛选器面板 */}
      {showFilters && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">数据筛选</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">显示指标</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="选择显示指标"
              >
                <option value="tests">测试数量</option>
                <option value="scores">分数趋势</option>
                <option value="types">类型分布</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">快速时间范围</label>
              <div className="flex space-x-2">
                {[7, 30, 90].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDateRange(days)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${dateRange === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">数据导出</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => exportData('json')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => exportData('csv')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <StatCard
          title="总测试数"
          value={analyticsData.totalTests}
          change={analyticsData.totalTests > 0 ? 12.5 : undefined}
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-blue-500/20"
        />
        <StatCard
          title="成功率"
          value={`${analyticsData.successRate.toFixed(1)}%`}
          change={analyticsData.successRate > 80 ? 5.2 : -2.1}
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          color="bg-green-500/20"
        />
        <StatCard
          title="平均分数"
          value={analyticsData.averageScore.toFixed(1)}
          change={analyticsData.averageScore > 70 ? 8.3 : -3.7}
          icon={<BarChart3 className="w-6 h-6 text-white" />}
          color="bg-purple-500/20"
        />
        <StatCard
          title="活跃URL"
          value={analyticsData.topUrls.length}
          icon={<Globe className="w-6 h-6 text-white" />}
          color="bg-orange-500/20"
        />
        <StatCard
          title="失败测试"
          value={analyticsData.testsByStatus.failed || 0}
          change={analyticsData.testsByStatus.failed > 0 ? -15.2 : 0}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          color="bg-red-500/20"
        />
        <StatCard
          title="今日测试"
          value={analyticsData.dailyTests[analyticsData.dailyTests.length - 1]?.count || 0}
          change={25.6}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-cyan-500/20"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每日测试趋势 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">每日测试趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.dailyTests}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('zh-CN')}
              />
              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="总测试"
              />
              <Area
                type="monotone"
                dataKey="successCount"
                stackId="2"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="成功测试"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 测试类型分布 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试类型分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={testTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {testTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 性能趋势 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">性能趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.performanceTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
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
                dataKey="avgScore"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="平均分数"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 分数分布 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">分数分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="range" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 热门URL */}
      {analyticsData.topUrls.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">热门测试URL</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">URL</th>
                  <th className="text-left py-3 px-4 text-gray-300">测试次数</th>
                  <th className="text-left py-3 px-4 text-gray-300">平均分数</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.topUrls.map((url, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-3 px-4 text-white truncate max-w-xs" title={url.url}>
                      {url.url}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{url.count}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${url.avgScore >= 80 ? 'bg-green-500/20 text-green-400' :
                        url.avgScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {url.avgScore.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsOverview;
