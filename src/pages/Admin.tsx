import React, { useState, useEffect } from 'react';
import {
  Users,
  TestTube,
  Settings,
  Activity,
  Shield,
  Database,
  Monitor,
  AlertTriangle,
  TrendingUp,
  Clock,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  BarChart3
} from 'lucide-react';
import { adminService } from '../services/adminService';
import type { SystemStats, SystemMonitor } from '../types/admin';
import UserManagement from '../components/admin/UserManagement';
import SystemMonitorComponent from '../components/admin/SystemMonitor';
import TestManagement from '../components/admin/TestManagement';
import SystemSettings from '../components/admin/SystemSettings';
import BackupManagement from '../components/admin/BackupManagement';
import SecurityCenter from '../components/admin/SecurityCenter';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [monitor, setMonitor] = useState<SystemMonitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // 每30秒更新一次监控数据
    const interval = setInterval(loadMonitorData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, monitorData] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getSystemMonitor()
      ]);
      
      setStats(statsData);
      setMonitor(monitorData);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitorData = async () => {
    try {
      const monitorData = await adminService.getSystemMonitor();
      setMonitor(monitorData);
    } catch (error) {
      console.error('更新监控数据失败:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const getStatusColor = (usage: number): string => {
    if (usage < 50) return 'text-green-300 bg-green-500/20 border border-green-500/30';
    if (usage < 80) return 'text-yellow-300 bg-yellow-500/20 border border-yellow-500/30';
    return 'text-red-300 bg-red-500/20 border border-red-500/30';
  };

  const tabs = [
    { id: 'dashboard', name: '仪表板', icon: BarChart3 },
    { id: 'users', name: '用户管理', icon: Users },
    { id: 'tests', name: '测试管理', icon: TestTube },
    { id: 'monitor', name: '系统监控', icon: Monitor },
    { id: 'security', name: '安全中心', icon: Shield },
    { id: 'settings', name: '系统设置', icon: Settings },
    { id: 'logs', name: '活动日志', icon: Activity },
    { id: 'backup', name: '备份管理', icon: Database },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载后台管理数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* 顶部导航 */}
      <div className="bg-gray-800/50 backdrop-blur-sm shadow-lg border border-gray-700/50 rounded-xl mb-6">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-400 mr-3" />
              <h1 className="text-xl font-bold text-white">后台管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Clock className="w-4 h-4" />
                <span>系统运行时间: {stats ? formatUptime(stats.system.uptime) : '--'}</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                monitor && monitor.metrics.application.errorRate < 5
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {monitor && monitor.metrics.application.errorRate < 5 ? '系统正常' : '系统异常'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 侧边栏 */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 主内容区 */}
        <div className="flex-1">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">系统概览</h2>

                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                          <Users className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-300">总用户数</p>
                        <p className="text-2xl font-bold text-white">{stats?.users.total.toLocaleString()}</p>
                        <p className="text-sm text-green-400">
                          <TrendingUp className="w-4 h-4 inline mr-1" />
                          +{stats?.users.growthRate}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-green-500/20 p-3 rounded-lg border border-green-500/30">
                          <TestTube className="w-8 h-8 text-green-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-300">总测试数</p>
                        <p className="text-2xl font-bold text-white">{stats?.tests.total.toLocaleString()}</p>
                        <p className="text-sm text-blue-400">今日: {stats?.tests.todayCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
                          <Server className="w-8 h-8 text-purple-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-300">成功率</p>
                        <p className="text-2xl font-bold text-white">{stats?.performance.successRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-300">平均响应: {stats?.tests.averageResponseTime}s</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-orange-500/20 p-3 rounded-lg border border-orange-500/30">
                          <Activity className="w-8 h-8 text-orange-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-300">活跃用户</p>
                        <p className="text-2xl font-bold text-white">{monitor?.metrics.application.activeUsers}</p>
                        <p className="text-sm text-gray-300">运行中测试: {monitor?.metrics.application.runningTests}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 系统资源监控 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6">
                    <h3 className="text-lg font-medium text-white mb-4">系统资源</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Cpu className="w-5 h-5 text-blue-400 mr-2" />
                          <span className="text-sm font-medium text-gray-300">CPU 使用率</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(monitor?.metrics.cpu.usage || 0)}`}>
                            {monitor?.metrics.cpu.usage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MemoryStick className="w-5 h-5 text-green-400 mr-2" />
                          <span className="text-sm font-medium text-gray-300">内存使用率</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(monitor?.metrics.memory.usage || 0)}`}>
                            {monitor?.metrics.memory.usage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <HardDrive className="w-5 h-5 text-purple-400 mr-2" />
                          <span className="text-sm font-medium text-gray-300">磁盘使用率</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(monitor?.metrics.disk.usage || 0)}`}>
                            {monitor?.metrics.disk.usage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Network className="w-5 h-5 text-orange-400 mr-2" />
                          <span className="text-sm font-medium text-gray-300">网络连接</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-300">
                            {monitor?.metrics.network.connections} 连接
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6">
                    <h3 className="text-lg font-medium text-white mb-4">应用状态</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">数据库连接</span>
                        <span className="text-sm text-gray-300">{monitor?.metrics.database.connections} / 100</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">查询平均时间</span>
                        <span className="text-sm text-gray-300">{monitor?.metrics.database.queryTime.toFixed(2)}ms</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">数据库大小</span>
                        <span className="text-sm text-gray-300">{formatBytes(monitor?.metrics.database.size || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">错误率</span>
                        <span className={`text-sm font-medium ${
                          (monitor?.metrics.application.errorRate || 0) < 5 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {monitor?.metrics.application.errorRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && <UserManagement />}

            {activeTab === 'tests' && <TestManagement />}

            {activeTab === 'monitor' && <SystemMonitorComponent />}

            {activeTab === 'logs' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">活动日志</h3>
                <p className="text-gray-300">活动日志功能已移除</p>
              </div>
            )}

            {activeTab === 'settings' && <SystemSettings />}

            {activeTab === 'backup' && <BackupManagement />}

            {activeTab === 'security' && <SecurityCenter />}

            {(activeTab !== 'dashboard' &&
              activeTab !== 'users' &&
              activeTab !== 'tests' &&
              activeTab !== 'monitor' &&
              activeTab !== 'logs' &&
              activeTab !== 'settings' &&
              activeTab !== 'backup' &&
              activeTab !== 'security') && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-6">
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Settings className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">功能开发中</h3>
                  <p className="text-gray-300">
                    {tabs.find(tab => tab.id === activeTab)?.name} 功能正在开发中，敬请期待。
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
