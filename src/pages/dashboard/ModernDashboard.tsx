import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Shield,
  TestTube,
  Users,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
// Layout is provided by the router, no need to import
import ModernButton from '../../components/modern/ModernButton';
import ModernCard from '../../components/modern/ModernCard';
import {
  MiniLineChart,
  ModernBarChart,
  ModernDoughnutChart,
  ModernLineChart,
  ProgressRing,
  chartColors
} from '../../components/modern/ModernChart';
import StatCard from '../../components/modern/StatCard';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/modern-design-system.css';

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

  // 模拟数据
  const statsData = [
    {
      title: '总测试次数',
      value: 23090,
      icon: TestTube,
      trend: { value: 12, direction: 'up' as const, label: '较昨日' },
      variant: 'primary' as const
    },
    {
      title: '活跃用户',
      value: 1245,
      icon: Users,
      trend: { value: 8, direction: 'up' as const, label: '本周' },
      variant: 'success' as const
    },
    {
      title: '安全扫描',
      value: 6525,
      icon: Shield,
      trend: { value: 3, direction: 'down' as const, label: '本月' },
      variant: 'warning' as const
    },
    {
      title: '系统状态',
      value: '99.9%',
      icon: Activity,
      trend: { value: 0, direction: 'neutral' as const, label: '可用性' },
      variant: 'info' as const
    }
  ];

  // 折线图数据
  const lineChartData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [
      {
        label: '性能测试',
        data: [65, 78, 90, 81, 95, 88],
        borderColor: chartColors.primary,
        backgroundColor: `${chartColors.primary}20`,
        fill: true,
        tension: 0.4
      },
      {
        label: '安全扫描',
        data: [45, 52, 68, 74, 82, 79],
        borderColor: chartColors.success,
        backgroundColor: `${chartColors.success}20`,
        fill: true,
        tension: 0.4
      },
      {
        label: '兼容性测试',
        data: [35, 42, 58, 65, 71, 68],
        borderColor: chartColors.warning,
        backgroundColor: `${chartColors.warning}20`,
        fill: true,
        tension: 0.4
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
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.error,
          chartColors.info,
          chartColors.purple,
          chartColors.cyan
        ],
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  // 圆环图数据
  const doughnutData = {
    labels: ['性能测试', '安全扫描', '兼容性测试', 'API测试'],
    datasets: [
      {
        data: [35, 25, 20, 20],
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.info
        ],
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff'
      }
    ]
  };

  // 最近测试数据
  const recentTests = [
    {
      id: 1,
      name: 'example.com',
      type: '性能测试',
      status: 'success',
      score: 95,
      time: '2分钟前'
    },
    {
      id: 2,
      name: 'test-site.com',
      type: '安全扫描',
      status: 'warning',
      score: 78,
      time: '5分钟前'
    },
    {
      id: 3,
      name: 'demo.org',
      type: '兼容性测试',
      status: 'success',
      score: 92,
      time: '8分钟前'
    },
    {
      id: 4,
      name: 'api.service.com',
      type: 'API测试',
      status: 'error',
      score: 45,
      time: '12分钟前'
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
    <div className={`p-6 ${actualTheme === 'light' ? 'light-dashboard' : 'dark-dashboard'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${actualTheme === 'light' ? 'gradient-text' : 'text-primary'}`}>
              仪表板概览
            </h1>
            <p className={`${actualTheme === 'light' ? 'themed-text-secondary' : 'text-secondary'}`}>
              实时监控您的网站测试和性能数据
            </p>
          </div>
          <div className="flex gap-3">
            <ModernButton variant="outline" icon={BarChart3}>
              查看报告
            </ModernButton>
            <ModernButton variant="primary" icon={Zap}>
              开始测试
            </ModernButton>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              trend={stat.trend}
              variant={stat.variant}
              loading={loading}
            />
          ))}
        </div>

        {/* 主要图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 趋势图表 */}
          <div className="lg:col-span-2">
            <ModernCard
              title="测试趋势分析"
              subtitle="过去6个月的测试数据趋势"
              headerAction={
                <ModernButton variant="ghost" size="sm">
                  查看详情
                </ModernButton>
              }
              hover
            >
              {loading ? (
                <div className="loading-shimmer w-full h-64 rounded-lg"></div>
              ) : (
                <ModernLineChart data={lineChartData} height={300} />
              )}
            </ModernCard>
          </div>

          {/* 测试类型分布 */}
          <div>
            <ModernCard
              title="测试类型分布"
              subtitle="本月测试类型占比"
              hover
            >
              {loading ? (
                <div className="loading-shimmer w-full h-64 rounded-lg"></div>
              ) : (
                <div className="flex flex-col items-center">
                  <ModernDoughnutChart data={doughnutData} size={200} />
                  <div className="mt-4 text-center">
                    <ProgressRing percentage={85} size={80} showText />
                    <p className="text-sm text-secondary mt-2">总体健康度</p>
                  </div>
                </div>
              )}
            </ModernCard>
          </div>
        </div>

        {/* 详细数据区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 每日测试统计 */}
          <ModernCard
            title="每日测试统计"
            subtitle="本周测试活动概览"
            hover
          >
            {loading ? (
              <div className="loading-shimmer w-full h-64 rounded-lg"></div>
            ) : (
              <ModernBarChart data={barChartData} height={250} />
            )}
          </ModernCard>

          {/* 最近测试 */}
          <ModernCard
            title="最近测试"
            subtitle="最新的测试结果"
            headerAction={
              <ModernButton variant="ghost" size="sm">
                查看全部
              </ModernButton>
            }
            hover
          >
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="loading-shimmer w-32 h-4 rounded"></div>
                    <div className="loading-shimmer w-16 h-4 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-elevated hover:bg-tertiary transition-colors">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium text-primary">{test.name}</p>
                        <p className="text-sm text-secondary">{test.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-primary">{test.score}</span>
                        <MiniLineChart
                          data={[65, 70, 75, 80, test.score]}
                          color={test.status === 'success' ? chartColors.success : chartColors.warning}
                        />
                      </div>
                      <span className={getStatusBadge(test.status)}>
                        {test.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModernCard>
        </div>

        {/* 系统状�?*/}
        <ModernCard
          title="系统监控"
          subtitle="实时系统状态和性能指标"
          hover
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="loading-shimmer w-16 h-16 rounded-full mx-auto mb-2"></div>
                  <div className="loading-shimmer w-20 h-4 rounded mx-auto"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <ProgressRing percentage={92} color={chartColors.success} size={80} />
                <p className="text-sm text-secondary mt-2">CPU 使用率</p>
              </div>
              <div className="text-center">
                <ProgressRing percentage={68} color={chartColors.info} size={80} />
                <p className="text-sm text-secondary mt-2">内存使用率</p>
              </div>
              <div className="text-center">
                <ProgressRing percentage={45} color={chartColors.warning} size={80} />
                <p className="text-sm text-secondary mt-2">磁盘使用率</p>
              </div>
              <div className="text-center">
                <ProgressRing percentage={99} color={chartColors.primary} size={80} />
                <p className="text-sm text-secondary mt-2">网络状态</p>
              </div>
            </div>
          )}
        </ModernCard>
      </div>
    </div>
  );
};

export default ModernDashboard;
