import type { useEffect, useState, FC } from 'react';

import { Activity, BarChart3, Calendar, PieChart, TrendingUp } from 'lucide-react';

interface StatisticsData {
  overview: {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageScore: number;
    averageDuration: number;
    successRate: number;
  };
  typeStats: Array<{
    type: string;
    count: number;
    averageScore: number;
    successRate: number;
  }>;
  statusStats: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    count: number;
    averageScore: number;
  }>;
  topUrls: Array<{
    url: string;
    count: number;
    averageScore: number;
  }>;
}

const Statistics: React.FC = () => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  // 获取统计数据
  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-management/statistics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.data);
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 格式化时长
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  // 获取测试类型的中文名称
  const getTestTypeName = (type: string) => {
    const typeNames: { [key: string]: string } = {
      'website': '网站测试',
      'performance': '性能测试',
      'security': '安全测试',
      'seo': 'SEO测试',
      'stress': '压力测试',
      'api': 'API测试',
      'compatibility': '兼容性测试',
      'ux': '用户体验测试'
    };
    return typeNames[type] || type;
  };

  // 获取状态的中文名称
  const getStatusName = (status: string) => {
    const statusNames: { [key: string]: string } = {
      'completed': '已完成',
      'failed': '失败',
      'pending': '等待中',
      'running': '运行中',
      'cancelled': '已取消'
    };
    return statusNames[status] || status;
  };

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">加载统计数据中...</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">暂无统计数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-management-container">
      <div className="data-management-wrapper">
        {/* 页面标题和筛选器 */}
        <div className="data-page-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <BarChart3 className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="data-page-title text-white font-bold">统计分析</h1>
                <p className="data-page-subtitle text-gray-300">
                  测试数据的详细统计和趋势分析
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-0 flex items-center gap-4">
              <div className="flex items-center gap-3 bg-gray-800/60 backdrop-blur-md rounded-xl px-4 py-3 border border-gray-600/30">
                <Calendar className="w-5 h-5 text-gray-400" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(parseInt(e.target.value))}
                  className="bg-transparent border-none text-white focus:outline-none cursor-pointer"
                  title="选择统计时间范围"
                  aria-label="时间范围选择"
                >
                  <option value={7}>最近 7 天</option>
                  <option value={30}>最近 30 天</option>
                  <option value={90}>最近 90 天</option>
                  <option value={365}>最近一年</option>
                </select>
              </div>
            </div>
          </div>

          {/* 概览卡片 */}
          <div className="data-stats-grid">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">总测试数</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(statistics.overview.totalTests)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">成功率</p>
                  <p className="text-2xl font-bold text-green-400">
                    {statistics.overview.successRate ? statistics.overview.successRate.toFixed(1) : '0.0'}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">平均分数</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.overview.averageScore ? statistics.overview.averageScore.toFixed(1) : '0.0'}
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">平均时长</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(statistics.overview.averageDuration)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 测试类型统计 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  测试类型分布
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {statistics.typeStats.map((stat, index) => (
                    <div key={stat.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          // 动态计算的颜色值，需要使用内联样式
                          style={{
                            backgroundColor: `hsl(${(index * 360) / statistics.typeStats.length}, 70%, 50%)`
                          }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getTestTypeName(stat.type)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.count} 次
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          成功率 {stat.successRate ? stat.successRate.toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 状态分布 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  状态分布
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {statistics.statusStats.map((stat) => (
                    <div key={stat.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${stat.status === 'completed' ? 'bg-green-500' :
                            stat.status === 'failed' ? 'bg-red-500' :
                              stat.status === 'running' ? 'bg-blue-500' :
                                'bg-gray-500'
                            }`}
                        ></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getStatusName(stat.status)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.count} 次
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stat.percentage ? stat.percentage.toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 热门URL */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  热门测试URL
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {statistics.topUrls.slice(0, 5).map((urlStat) => (
                    <div key={urlStat.url} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {urlStat.url}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          平均分数: {urlStat.averageScore ? urlStat.averageScore.toFixed(1) : '0.0'}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {urlStat.count} 次
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 趋势图 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  测试趋势
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {statistics.trends.slice(0, 7).map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {trend.count} 次测试
                        </span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          平均 {trend.averageScore ? trend.averageScore.toFixed(1) : '0.0'} 分
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
