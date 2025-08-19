import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Server, TestTube, Users } from 'lucide-react';
import { useNotifications } from '../ui/NotificationSystem';
import SystemHealthCheck from './SystemHealthCheck';

interface SystemMetrics {
  totalTests: number;
  activeUsers: number;
  systemUptime: string;
  databaseConnections: number;
  errorRate: number;
  responseTime: number;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

const SystemStatusDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalTests: 0,
    activeUsers: 0,
    systemUptime: '0d 0h 0m',
    databaseConnections: 0,
    errorRate: 0,
    responseTime: 0
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        // 模拟获取系统指标
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockMetrics: SystemMetrics = {
          totalTests: Math.floor(Math.random() * 10000) + 5000,
          activeUsers: Math.floor(Math.random() * 100) + 20,
          systemUptime: '15d 8h 32m',
          databaseConnections: Math.floor(Math.random() * 15) + 5,
          errorRate: Math.random() * 0.1,
          responseTime: Math.floor(Math.random() * 200) + 50
        };

        setMetrics(mockMetrics);

        // 模拟系统警告
        const mockAlerts: SystemAlert[] = [
          {
            id: '1',
            type: 'warning',
            message: '数据库连接数接近上限',
            timestamp: new Date(Date.now() - 300000)
          },
          {
            id: '2',
            type: 'info',
            message: '系统维护计划：明天凌晨2点',
            timestamp: new Date(Date.now() - 600000)
          }
        ];

        setAlerts(mockAlerts);

        // 检查是否需要发送通知
        if (mockMetrics.errorRate > 0.05) {
          addNotification({
            type: 'warning',
            title: '系统警告',
            message: '错误率超过阈值，请检查系统状态'
          });
        }

      } catch (error) {
        console.error('获取系统指标失败:', error);
        addNotification({
          type: 'error',
          title: '系统错误',
          message: '无法获取系统状态信息'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, [addNotification]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <span className="ml-4 text-xl text-gray-300">加载系统状态...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3">
            <Server className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">系统状态监控</h1>
              <p className="text-gray-300">实时监控系统运行状态和性能指标</p>
            </div>
          </div>
        </div>

        {/* 系统指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">总测试数</p>
                <p className="text-2xl font-bold text-white">{metrics.totalTests.toLocaleString()}</p>
              </div>
              <TestTube className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">活跃用户</p>
                <p className="text-2xl font-bold text-white">{metrics.activeUsers}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">系统运行时间</p>
                <p className="text-2xl font-bold text-white">{metrics.systemUptime}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">响应时间</p>
                <p className="text-2xl font-bold text-white">{metrics.responseTime}ms</p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* 系统健康检查 */}
        <SystemHealthCheck />

        {/* 详细指标和警告 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 系统性能指标 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">性能指标</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">数据库连接</span>
                  <span className="font-medium">{metrics.databaseConnections}/20</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.databaseConnections / 20) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">错误率</span>
                  <span className="font-medium">{(metrics.errorRate * 100).toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${metrics.errorRate > 0.05 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(metrics.errorRate * 2000, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 系统警告 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">系统警告</h3>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-gray-400 text-center py-4">暂无系统警告</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-white text-sm">{alert.message}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusDashboard;
