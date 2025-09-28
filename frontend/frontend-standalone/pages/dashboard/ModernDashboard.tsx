/**
 * 现代化仪表板页面
 * 显示用户的测试概览、统计数据和快速操作
 */

import { Activity, BarChart3, CheckCircle, Clock, Database, Globe, Play, Users, Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserStats } from '../../hooks/useUserStats';

const ModernDashboard: React.FC = () => {
  const { stats, loading } = useUserStats();

  // 模拟最近测试数据
  const recentTests = [
    { name: '网络测试', status: 'success', timestamp: '2分钟前' },
    { name: 'API测试', status: 'success', timestamp: '5分钟前' },
    { name: '压力测试', status: 'failed', timestamp: '10分钟前' },
    { name: 'UX测试', status: 'success', timestamp: '15分钟前' },
    { name: '数据库测试', status: 'running', timestamp: '20分钟前' }
  ];

  const quickActions = [
    { name: '压力测试', icon: Zap, path: '/stress-test', color: 'bg-red-500', description: '测试系统负载能力' },
    { name: '网络测试', icon: Globe, path: '/network-test', color: 'bg-blue-500', description: '检测网络连接质量' },
    { name: 'API测试', icon: Activity, path: '/api-test', color: 'bg-green-500', description: '验证API接口功能' },
    { name: '数据库测试', icon: Database, path: '/database-test', color: 'bg-purple-500', description: '测试数据库性能' },
    { name: 'UX测试', icon: Users, path: '/ux-test', color: 'bg-orange-500', description: '分析用户体验' },
    { name: '网站测试', icon: BarChart3, path: '/website-test', color: 'bg-indigo-500', description: '综合网站评估' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">现代化仪表板</h1>
          <p className="mt-2 text-gray-600">全面的测试管理和监控中心</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总测试次数</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests || 0}</p>
                <p className="text-xs text-green-600 mt-1">+12% 本月</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">成功率</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round((stats.totalTests / 100) * 85) : 85}%</p>
                <p className="text-xs text-green-600 mt-1">+2.1% 上周</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均响应时间</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalTests ? Math.round(stats.totalTests * 1.2) : 120}ms</p>
                <p className="text-xs text-red-600 mt-1">+5ms 昨日</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均评分</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.averageScore || 0}</p>
                <p className="text-xs text-green-600 mt-1">+1.2 本周</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 快速操作 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">快速开始测试</h2>
                <p className="text-sm text-gray-500 mt-1">选择测试类型开始您的测试</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      to={action.path}
                      className="group relative bg-gray-50 p-6 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-start">
                        <div className={`inline-flex p-3 rounded-lg ${action.color} text-white`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {action.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 系统状态和最近测试 */}
          <div className="space-y-6">
            {/* 系统状态 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">系统状态</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API服务</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">正常</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">数据库</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">正常</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">测试引擎</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-yellow-600">负载中</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近的测试 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近的测试</h2>
              </div>
              <div className="p-6">
                {recentTests && recentTests.length > 0 ? (
                  <div className="space-y-4">
                    {recentTests.slice(0, 5).map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${test.status === 'success' ? 'bg-green-400' :
                            test.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                            }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{test.name}</p>
                            <p className="text-xs text-gray-500">{test.timestamp}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${test.status === 'success' ? 'bg-green-100 text-green-800' :
                          test.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {test.status === 'success' ? '成功' : test.status === 'failed' ? '失败' : '进行中'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无测试记录</h3>
                    <p className="mt-1 text-sm text-gray-500">开始您的第一个测试吧！</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
