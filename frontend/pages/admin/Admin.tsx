/**
 * 管理员主页面 - 统一管理面板
 * 集成系统监控、用户管理、设置管理等管理员功能
 */

import React, { useState } from 'react';
import {Users, Settings, Monitor, Database, Shield, FileText, Server, Activity, BarChart3, AlertTriangle, CheckCircle} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';
import Settings from './Settings';
import DataStorage from './DataStorage';
import MonitoringDashboard from '../dashboard/MonitoringDashboard';

interface AdminSection {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  component?: React.ComponentType<any>;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // 管理员功能模块
  const adminSections: AdminSection[] = [
    {
      id: 'overview',
      name: '系统概览',
      icon: BarChart3,
      description: '系统状态和关键指标概览'
    },
    {
      id: 'users',
      name: '用户管理',
      icon: Users,
      description: '管理系统用户、角色和权限',
      component: UserManagement
    },
    {
      id: 'monitoring',
      name: '系统监控',
      icon: Monitor,
      description: '实时系统监控和性能分析',
      component: MonitoringDashboard
    },
    {
      id: 'settings',
      name: '系统设置',
      icon: Settings,
      description: '系统配置和偏好设置',
      component: Settings
    },
    {
      id: 'data',
      name: '数据管理',
      icon: Database,
      description: '数据备份、恢复和存储管理',
      component: DataStorage
    },
    {
      id: 'security',
      name: '安全中心',
      icon: Shield,
      description: '安全配置和权限管理'
    },
    {
      id: 'logs',
      name: '系统日志',
      icon: FileText,
      description: '查看和分析系统日志'
    },
    {
      id: 'maintenance',
      name: '系统维护',
      icon: Server,
      description: '系统维护和性能优化'
    }
  ];

  // 检查管理员权限
  const isAdmin = user.role === 'admin' || user?.permissions?.includes('admin:access');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问受限</h2>
          <p className="text-gray-600">您没有权限访问管理员面板。</p>
        </div>
      </div>
    );
  }

  // 系统概览组件
  const SystemOverview: React.FC = () => {
    const systemStats = {
      totalUsers: 156,
      activeUsers: 89,
      testsToday: 234,
      systemHealth: 'excellent',
      uptime: '99.9%',
      avgResponseTime: '120ms'
    };

    return (
      <div className="space-y-6">
        {/* 关键指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">总用户数</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.totalUsers}</p>
                <p className="text-xs text-green-600">+12% 本月</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">活跃用户</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.activeUsers}</p>
                <p className="text-xs text-green-600">在线中</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">今日测试</p>
                <p className="text-2xl font-semibold text-gray-900">{systemStats.testsToday}</p>
                <p className="text-xs text-green-600">+8% 昨日</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">系统健康度</p>
                <p className="text-2xl font-semibold text-green-600">优秀</p>
                <p className="text-xs text-gray-500">运行时间 {systemStats.uptime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 系统状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">系统服务状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API服务</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常运行</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">数据库</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常运行</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">缓存服务</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-yellow-600">负载中</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">测试引擎</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">正常运行</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">最近活动</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">新用户注册</p>
                  <p className="text-xs text-gray-500">2分钟前</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">系统备份完成</p>
                  <p className="text-xs text-gray-500">1小时前</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">性能测试峰值</p>
                  <p className="text-xs text-gray-500">3小时前</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {adminSections.filter(section => section?.id !== 'overview').map((section) => (
              <button
                key={section?.id}
                onClick={() => setActiveSection(section?.id)}
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {section?.icon && React.createElement(section.icon, { className: "h-8 w-8 text-gray-600 mb-2" })}
                <span className="text-sm font-medium text-gray-900">{section?.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染活动模块内容
  const renderActiveSection = () => {
    if (activeSection === 'overview') {
      return <SystemOverview />;
    }

    const section = adminSections.find(s => s.id === activeSection);
    if (section?.component) {
      const Component = section?.component;
      return <Component />;
    }

    // 未实现的模块显示占位符
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
          {adminSections.find(s => s.id === activeSection)?.icon && 
            React.createElement(adminSections.find(s => s.id === activeSection)!.icon, {
              className: "h-16 w-16"
            })
          }
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {adminSections.find(s => s.id === activeSection)?.name}
        </h3>
        <p className="text-gray-600 mb-4">
          {adminSections.find(s => s.id === activeSection)?.description}
        </p>
        <p className="text-sm text-gray-500">此功能正在开发中，敬请期待...</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员面板</h1>
          <p className="mt-2 text-gray-600">系统管理和监控中心</p>
        </div>

        {/* 导航标签 */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {adminSections.map((section) => (
                <button
                  key={section?.id}
                  onClick={() => setActiveSection(section?.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === section?.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {section?.icon && React.createElement(section.icon, { className: "h-4 w-4 mr-2" })}
                  {section?.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 活动内容 */}
        <div>
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
};

export default Admin;
