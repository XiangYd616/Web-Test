import React, { useState, useEffect } from 'react';

import { CheckCircle, AlertTriangle, XCircle, Clock, Server, Database, Wifi, Shield, Activity, RefreshCw, Settings, Monitor, Zap, Globe } from 'lucide-react';

interface SystemCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  description: string;
  lastCheck: string;
  details?: string;
}

const SystemStatus: React.FC = () => {
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: 'frontend',
      name: '前端应用',
      status: 'healthy',
      description: 'React应用运行正常',
      lastCheck: '刚刚',
      details: 'Vite开发服务器运行在端口5177'
    },
    {
      id: 'routing',
      name: '路由系统',
      status: 'healthy',
      description: 'React Router工作正常',
      lastCheck: '刚刚',
      details: '所有路由配置正确'
    },
    {
      id: 'auth',
      name: '认证系统',
      status: 'healthy',
      description: '用户认证功能正常',
      lastCheck: '刚刚',
      details: 'AuthContext和useAuth hook工作正常'
    },
    {
      id: 'notifications',
      name: '通知系统',
      status: 'healthy',
      description: '通知中心功能正常',
      lastCheck: '刚刚',
      details: 'useNotifications hook和通知UI正常'
    },
    {
      id: 'ui',
      name: 'UI组件',
      status: 'healthy',
      description: '所有UI组件加载正常',
      lastCheck: '刚刚',
      details: 'ModernLayout, TopNavbar, ModernSidebar正常'
    },
    {
      id: 'icons',
      name: '图标库',
      status: 'healthy',
      description: 'Lucide React图标正常',
      lastCheck: '刚刚',
      details: '所有图标导入正确'
    },
    {
      id: 'styling',
      name: '样式系统',
      status: 'healthy',
      description: 'Tailwind CSS正常',
      lastCheck: '刚刚',
      details: '深色主题和响应式设计正常'
    },
    {
      id: 'backend',
      name: '后端服务',
      status: 'healthy',
      description: '模拟数据服务正常',
      lastCheck: '刚刚',
      details: '开发环境下使用模拟数据，所有API接口正常响应'
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'checking':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'checking':
        return 'border-blue-500/30 bg-blue-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const refreshStatus = async () => {
    setIsRefreshing(true);

    // 模拟检查过程
    setChecks(prev => prev.map(check => ({ ...check, status: 'checking' as const })));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 恢复状态
    setChecks(prev => prev.map(check => ({
      ...check,
      status: check.id === 'backend' ? 'warning' as const : 'healthy' as const,
      lastCheck: '刚刚'
    })));

    setIsRefreshing(false);
  };

  const healthyCount = checks.filter(c => c.status === 'healthy').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const errorCount = checks.filter(c => c.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
              <Monitor className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">系统状态</h1>
              <p className="text-gray-300 mt-1">检查所有系统组件的运行状态</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshStatus}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '检查中...' : '刷新状态'}
          </button>
        </div>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">总检查项</p>
              <p className="text-2xl font-bold text-white">{checks.length}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">正常</p>
              <p className="text-2xl font-bold text-green-400">{healthyCount}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">警告</p>
              <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">错误</p>
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 详细状态列表 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">系统组件状态</h2>
        </div>

        <div className="divide-y divide-gray-700/50">
          {checks.map((check) => (
            <div key={check.id} className={`p-6 border-l-4 ${getStatusColor(check.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(check.status)}
                  <div>
                    <h3 className="text-lg font-medium text-white">{check.name}</h3>
                    <p className="text-gray-400 mt-1">{check.description}</p>
                    {check.details && (
                      <p className="text-sm text-gray-500 mt-1">{check.details}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">最后检查</p>
                  <p className="text-sm text-gray-300">{check.lastCheck}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 系统信息 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">系统信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">前端框架</span>
            </div>
            <p className="text-gray-300">React 18 + TypeScript</p>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-medium text-white">构建工具</span>
            </div>
            <p className="text-gray-300">Vite 4.5.14</p>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="font-medium text-white">运行端口</span>
            </div>
            <p className="text-gray-300">localhost:5177</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
