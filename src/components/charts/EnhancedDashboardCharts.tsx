import React from 'react';
import { TrendingUp, TrendingDown, Activity, Clock, Target, Users } from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

interface EnhancedDashboardChartsProps {
  className?: string;
}

const EnhancedDashboardCharts: React.FC<EnhancedDashboardChartsProps> = ({ className = '' }) => {
  // 模拟图表数据
  const performanceData = [
    { time: '00:00', value: 85 },
    { time: '04:00', value: 88 },
    { time: '08:00', value: 82 },
    { time: '12:00', value: 79 },
    { time: '16:00', value: 86 },
    { time: '20:00', value: 91 },
    { time: '24:00', value: 87 },
  ];

  const testVolumeData = [
    { day: '周一', tests: 45 },
    { day: '周二', tests: 52 },
    { day: '周三', tests: 38 },
    { day: '周四', tests: 61 },
    { day: '周五', tests: 73 },
    { day: '周六', tests: 29 },
    { day: '周日', tests: 34 },
  ];

  const keyMetrics: ChartData[] = [
    { label: '平均响应时间', value: 245, change: -12, trend: 'down' },
    { label: '成功率', value: 94.8, change: 2.3, trend: 'up' },
    { label: '并发用户', value: 1247, change: 156, trend: 'up' },
    { label: '错误率', value: 0.8, change: -0.3, trend: 'down' },
  ];

  const getMaxValue = (data: any[], key: string) => {
    return Math.max(...data.map(item => item[key]));
  };

  const renderMiniChart = (data: any[], dataKey: string, color: string) => {
    const maxValue = getMaxValue(data, dataKey);
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (item[dataKey] / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          className="drop-shadow-sm"
        />
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <polygon
          fill={`url(#gradient-${color})`}
          points={`0,100 ${points} 100,100`}
        />
      </svg>
    );
  };

  const renderBarChart = (data: any[], dataKey: string, color: string) => {
    const maxValue = getMaxValue(data, dataKey);

    return (
      <div className="flex items-end space-x-1 h-16">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full ${color} rounded-t transition-all duration-500 hover:opacity-80`}
              style={{ height: `${(item[dataKey] / maxValue) * 100}%` }}
            ></div>
            <span className="text-xs text-gray-500 mt-1">{item.day}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{metric.label}</span>
              {metric.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Activity className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {metric.value.toLocaleString()}
              </span>
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' :
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 性能趋势图 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">24小时性能趋势</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">性能评分</span>
            </div>
          </div>
          <div className="relative">
            {renderMiniChart(performanceData, 'value', '#3B82F6')}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {performanceData.map((item, index) => (
                <span key={index}>{item.time}</span>
              ))}
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>当前评分：87</strong> - 性能良好，建议继续优化图片压缩
            </p>
          </div>
        </div>

        {/* 测试量统计 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">本周测试量</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">测试次数</span>
            </div>
          </div>
          <div className="relative">
            {renderBarChart(testVolumeData, 'tests', 'bg-green-500')}
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>本周总计：332次</strong> - 比上周增长18%
            </p>
          </div>
        </div>
      </div>

      {/* 实时活动 */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">实时活动</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600">实时更新</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">正在进行的测试</p>
              <p className="text-lg font-bold text-blue-600">12</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <Target className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">今日完成</p>
              <p className="text-lg font-bold text-green-600">87</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
            <Users className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">活跃用户</p>
              <p className="text-lg font-bold text-purple-600">23</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardCharts;
