import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Download, Globe, TestTube } from 'lucide-react';
import type { useEffect, useState, FC } from 'react';
import { ModernDoughnutChart, ModernLineChart } from '../../components/modern/ModernChart';
import { useTheme } from '../../contexts/ThemeContext';

// CSS样式已迁移到组件库和主题配置中

const ModernDashboard: React.FC = () => {
  const { actualTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // 网站测试平台统计数据 - 结合参考图片风格
  const statsData = [
    {
      title: '总测试次数',
      value: '1,234',
      subtitle: 'Total Tests',
      icon: TestTube,
      trend: { value: 12, direction: 'up' as const, label: '较昨日增长' },
      variant: 'primary' as const,
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: '成功率',
      value: '98.5%',
      subtitle: 'Success Rate',
      icon: CheckCircle,
      trend: { value: 2.3, direction: 'up' as const, label: '本周平均' },
      variant: 'success' as const,
      bgGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
    },
    {
      title: '平均响应时间',
      value: '245ms',
      subtitle: 'Avg Response',
      icon: Clock,
      trend: { value: 8.1, direction: 'down' as const, label: '性能提升' },
      variant: 'warning' as const,
      bgGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    },
    {
      title: '活跃网站',
      value: '89',
      subtitle: 'Active Sites',
      icon: Globe,
      trend: { value: 5.2, direction: 'up' as const, label: '本月新增' },
      variant: 'info' as const,
      bgGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    }
  ];

  // 网站测试趋势图表数据 - 结合参考图片风格
  const lineChartData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [
      {
        label: '性能测试',
        data: [65, 78, 90, 81, 95, 88],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#667eea',
        pointRadius: 4
      },
      {
        label: '安全扫描',
        data: [45, 52, 68, 74, 82, 79],
        borderColor: '#11998e',
        backgroundColor: 'rgba(17, 153, 142, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#11998e',
        pointBorderColor: '#11998e',
        pointRadius: 4
      }
    ]
  };

  // 柱状图数据
  const barChartData = {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    datasets: [
      {
        label: '测试次数',
        data: [120, 190, 300, 500, 200, 300, 450],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#6366F1',
          '#8B5CF6',
          '#06B6D4'
        ],
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const doughnutData = {
    labels: ['性能测试', '安全扫描', '兼容性测试', 'API测试'],
    datasets: [
      {
        data: [35, 25, 20, 20],
        backgroundColor: [
          '#667eea',  // 紫蓝色
          '#11998e',  // 青绿色
          '#ff9a9e',  // 粉红色
          '#a8edea'   // 浅青色
        ],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
        cutout: '70%'
      }
    ]
  };

  // 应用销售数据 - 参考图片风格
  const applicationSales = [
    {
      id: 1,
      application: 'Able Pro',
      description: 'Powerful Admin Theme',
      sales: 16300,
      change: 5.3,
      avgPrice: 53,
      total: '$15,652',
      trend: 'up'
    },
    {
      id: 2,
      application: 'Photoshop',
      description: 'Design Software',
      sales: 26421,
      change: -2.5,
      avgPrice: 35,
      total: '$18,785',
      trend: 'down'
    },
    {
      id: 3,
      application: 'Guruable',
      description: 'Best Admin Template',
      sales: 8265,
      change: 8.2,
      avgPrice: 98,
      total: '$9,652',
      trend: 'up'
    }
  ];

  // 用户活动数据 - 参考图片风格
  const userActivity = [
    {
      id: 1,
      user: 'John Doe',
      description: 'Lorem ipsum is simply dummy text.',
      time: '2 min ago',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 2,
      user: 'John Doe',
      description: 'Lorem ipsum is simply dummy text.',
      time: '2 min ago',
      avatar: '/api/placeholder/32/32'
    },
    {
      id: 3,
      user: 'John Doe',
      description: 'Lorem ipsum is simply dummy text.',
      time: '2 min ago',
      avatar: '/api/placeholder/32/32'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      default:
        return <Clock className="w-4 h-4 text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = 'modern-badge';
    switch (status) {
      case 'success':
        return `${baseClass} modern-badge-success`;
      case 'warning':
        return `${baseClass} modern-badge-warning`;
      case 'error':
        return `${baseClass} modern-badge-error`;
      default:
        return `${baseClass} modern-badge-gray`;
    }
  };

  return (
    <div className={`min-h-screen p-6 ${actualTheme === 'light' ? 'bg-gray-100' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部统计卡片 - 参考图片风格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl p-6 text-white shadow-lg"
              style={{ background: stat.bgGradient }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm opacity-90">{stat.title}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-75">{stat.subtitle}</div>
                <div className="text-xs opacity-75">{stat.trend.label}</div>
              </div>
              {/* 装饰性图表线 */}
              <div className="absolute bottom-0 right-0 w-16 h-8 opacity-30">
                <svg viewBox="0 0 64 32" className="w-full h-full">
                  <path
                    d="M0,20 Q16,10 32,15 T64,12"
                    stroke="white"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* 主要图表区域 - 结合项目实际需要 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 测试趋势分析 */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl p-6 shadow-sm ${actualTheme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>测试趋势分析</h3>
                  <p className={`text-sm ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>过去6个月的网站测试数据趋势</p>
                </div>
                <div className="flex space-x-2">
                  <button type="button" className="p-2 hover:bg-gray-100 rounded" title="图表视图">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button type="button" className="p-2 hover:bg-gray-100 rounded" title="活动视图">
                    <Activity className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="loading-shimmer w-full h-64 rounded-lg"></div>
              ) : (
                <ModernLineChart data={lineChartData} height={300} />
              )}
            </div>
          </div>

          {/* 测试类型分布 */}
          <div>
            <div className={`rounded-xl p-6 shadow-sm ${actualTheme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>测试类型分布</h3>
                </div>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="更多选项">
                  <Activity className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {loading ? (
                <div className="loading-shimmer w-full h-64 rounded-lg"></div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ModernDoughnutChart data={doughnutData} size={200} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">85%</div>
                        <div className={`text-sm ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>健康度</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <button type="button" className="text-blue-600 text-sm hover:underline">
                      查看详细报告
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部数据区域 - 结合参考图片风格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 网站测试统计表格 */}
          <div className={`rounded-xl p-6 shadow-sm ${actualTheme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>网站测试统计</h3>
              </div>
              <div className="flex space-x-2">
                <button type="button" className={`p-2 rounded ${actualTheme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`} title="刷新">
                  <Activity className="w-4 h-4 text-gray-400" />
                </button>
                <button type="button" className={`p-2 rounded ${actualTheme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`} title="导出">
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="loading-shimmer w-32 h-4 rounded"></div>
                    <div className="loading-shimmer w-16 h-4 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${actualTheme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
                      <th className={`text-left py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-200'}`}>网站</th>
                      <th className={`text-left py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-200'}`}>测试次数</th>
                      <th className={`text-left py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-200'}`}>变化</th>
                      <th className={`text-left py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-200'}`}>平均分</th>
                      <th className={`text-left py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-200'}`}>总分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicationSales.map((item) => (
                      <tr key={item.id} className={`border-b ${actualTheme === 'light' ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-700 hover:bg-gray-700'}`}>
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div>
                              <div className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>{item.application}</div>
                              <div className={`text-sm ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>{item.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-2 ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>{item.sales.toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-1">
                            <div className={`w-16 h-8 rounded flex items-center justify-center ${actualTheme === 'light' ? 'bg-gray-100' : 'bg-gray-700'}`}>
                              <svg className="w-12 h-4" viewBox="0 0 48 16">
                                <path
                                  d={item.trend === 'up' ? "M2,12 Q12,4 24,8 T46,6" : "M2,4 Q12,12 24,8 T46,10"}
                                  stroke={item.trend === 'up' ? "#10B981" : "#EF4444"}
                                  strokeWidth="2"
                                  fill="none"
                                />
                              </svg>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-2 ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>{item.avgPrice}</td>
                        <td className={`py-3 px-2 font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 用户活动 */}
          <div className={`rounded-xl p-6 shadow-sm ${actualTheme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>用户活动</h3>
              </div>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="loading-shimmer w-8 h-8 rounded-full"></div>
                    <div className="flex-1">
                      <div className="loading-shimmer w-32 h-4 rounded mb-2"></div>
                      <div className="loading-shimmer w-24 h-3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {userActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${actualTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'}`}>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {activity.user.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>{activity.user}</div>
                      <div className={`text-sm mt-1 ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{activity.description}</div>
                      <div className={`text-xs mt-1 ${actualTheme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex justify-center mt-8">
          <button
            type="button"
            className={`px-6 py-3 rounded-lg font-medium transition-colors text-white ${actualTheme === 'light'
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            下载整体报告
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
