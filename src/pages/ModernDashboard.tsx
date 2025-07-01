import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Globe,
  Shield,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModernButton from '../components/modern/ModernButton';
import ModernCard from '../components/modern/ModernCard';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/modern-design-system.css';

const ModernDashboard: React.FC = () => {
  const { actualTheme } = useTheme();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 快速操作数据
  const quickActions = [
    {
      title: '网站测试',
      description: '检测网站性能和可用性',
      icon: Globe,
      color: 'bg-blue-500',
      path: '/website-test'
    },
    {
      title: '安全扫描',
      description: '全面的安全漏洞检测',
      icon: Shield,
      color: 'bg-green-500',
      path: '/security-test'
    },
    {
      title: 'API 测试',
      description: '接口功能和性能测试',
      icon: Zap,
      color: 'bg-purple-500',
      path: '/api-test'
    },
    {
      title: 'SEO 分析',
      description: '搜索引擎优化检测',
      icon: TrendingUp,
      color: 'bg-orange-500',
      path: '/seo-test'
    }
  ];

  // 最近活动数据
  const recentActivities = [
    {
      id: 1,
      type: '网站测试',
      target: 'example.com',
      status: 'success',
      time: '2分钟前',
      score: 95
    },
    {
      id: 2,
      type: '安全扫描',
      target: 'test-site.com',
      status: 'warning',
      time: '15分钟前',
      score: 78
    },
    {
      id: 3,
      type: 'API测试',
      target: 'api.service.com',
      status: 'success',
      time: '1小时前',
      score: 92
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };



  return (
    <div className={`min-h-screen p-6 ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* 欢迎区域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold mb-2 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                欢迎回来！ 👋
              </h1>
              <p className={`text-lg ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {currentTime.toLocaleString('zh-CN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg ${actualTheme === 'light' ? 'bg-green-100 text-green-800' : 'bg-green-900 text-green-200'}`}>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">系统正常运行</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作区域 */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            快速开始
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <ModernCard
                key={index}
                hover
                className="cursor-pointer transition-all duration-200 hover:scale-105"
                onClick={() => navigate(action.path)}
              >
                <div className="p-6">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {action.title}
                  </h3>
                  <p className={`text-sm ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {action.description}
                  </p>
                  <div className="mt-4 flex items-center text-blue-500 text-sm font-medium">
                    开始测试
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </ModernCard>
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 最近测试活动 */}
          <ModernCard
            title="最近活动"
            subtitle="最新的测试结果"
            headerAction={
              <ModernButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/test-history')}
              >
                查看全部
              </ModernButton>
            }
            hover
          >
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className={`p-4 rounded-lg border ${actualTheme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} hover:shadow-md transition-all duration-200`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <p className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                          {activity.target}
                        </p>
                        <p className={`text-sm ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                          {activity.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${activity.score >= 90 ? 'text-green-500' : activity.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {activity.score}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(activity.status)}`}>
                        {activity.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* 快速链接 */}
          <ModernCard
            title="快速链接"
            subtitle="常用功能和工具"
            hover
          >
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className={`w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md ${actualTheme === 'light' ? 'bg-white border-gray-200 hover:border-blue-300' : 'bg-gray-800 border-gray-700 hover:border-blue-500'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      测试报告
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/analytics')}
                className={`w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md ${actualTheme === 'light' ? 'bg-white border-gray-200 hover:border-green-300' : 'bg-gray-800 border-gray-700 hover:border-green-500'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      数据分析
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className={`w-full p-4 rounded-lg border text-left transition-all duration-200 hover:shadow-md ${actualTheme === 'light' ? 'bg-white border-gray-200 hover:border-purple-300' : 'bg-gray-800 border-gray-700 hover:border-purple-500'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-purple-500" />
                    <span className={`font-medium ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                      系统设置
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            </div>
          </ModernCard>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
