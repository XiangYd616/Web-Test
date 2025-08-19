import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Download, Globe, TestTube } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const EnhancedDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // 网站测试平台统计数据
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

  // 快速指南数据
  const quickGuides = [
    {
      id: 1,
      title: '快速开始测试',
      description: '5分钟完成第一次网站测试',
      icon: TestTube,
      time: '5分钟',
      status: 'active',
      progress: 75
    },
    {
      id: 2,
      title: '安全检测优化建议',
      description: '深度分析网站安全漏洞',
      icon: AlertTriangle,
      time: '15分钟',
      status: 'warning',
      progress: 45
    },
    {
      id: 3,
      title: '性能优化建议',
      description: '提升网站加载速度',
      icon: Activity,
      time: '20分钟',
      status: 'active',
      progress: 90
    },
    {
      id: 4,
      title: 'API接口测试',
      description: '自动化API测试流程',
      icon: Globe,
      time: '30分钟',
      status: 'pending',
      progress: 20
    },
    {
      id: 5,
      title: '监控告警配置',
      description: '实时监控网站状态',
      icon: BarChart3,
      time: '10分钟',
      status: 'active',
      progress: 60
    },
    {
      id: 6,
      title: '团队协作功能',
      description: '多人协作测试管理',
      icon: CheckCircle,
      time: '12分钟',
      status: 'success',
      progress: 100
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'pending':
        return 'text-slate-500';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">帮助中心</h1>
          <p className="text-slate-600">快速找到您需要的答案和指南</p>
        </div>

        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ background: stat.bgGradient }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
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

        {/* 快速指南区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">快速指南</h2>
              <p className="text-slate-600">选择一个主题开始您的测试之旅</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                全部
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                快速指南
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                测试记录
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quickGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="group bg-slate-50 rounded-xl p-6 hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer border border-slate-100 hover:border-slate-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <guide.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">{guide.description}</p>
                      </div>
                    </div>
                    {getStatusIcon(guide.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">预计时间</span>
                      <span className={`font-medium ${getStatusColor(guide.status)}`}>
                        {guide.time}
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">完成度</span>
                        <span className="font-medium text-slate-700">{guide.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${guide.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="flex justify-center mt-8">
          <button
            type="button"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>下载整体报告</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
