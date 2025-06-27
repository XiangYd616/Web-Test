import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Users, TestTube, Shield, BarChart3, AlertTriangle } from 'lucide-react';
import SystemHealthCheck from './SystemHealthCheck';
import { useNotifications } from './NotificationSystem';

interface SystemMetrics {
  totalTests: number;
  activeUsers: number;
  systemUptime: string;
  databaseConnections: number;
  apiResponseTime: number;
  errorRate: number;
  lastUpdate: string;
}

interface RecentActivity {
  id: string;
  type: 'test' | 'user' | 'system' | 'error';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

const SystemStatusDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalTests: 0,
    activeUsers: 0,
    systemUptime: '0h 0m',
    databaseConnections: 0,
    apiResponseTime: 0,
    errorRate: 0,
    lastUpdate: new Date().toLocaleTimeString()
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error: showError } = useNotifications();

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/admin/system/metrics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics({
            ...data.data,
            lastUpdate: new Date().toLocaleTimeString()
          });
        }
      } else {
        // 使用模拟数据
        setMetrics({
          totalTests: 1247,
          activeUsers: 23,
          systemUptime: '15h 32m',
          databaseConnections: 8,
          apiResponseTime: 145,
          errorRate: 0.02,
          lastUpdate: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      console.error('获取系统指标失败:', error);
      showError('系统指标获取失败', '无法连接到监控服务');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/system/activity');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentActivity(data.data);
        }
      } else {
        // 使用模拟数据
        setRecentActivity([
          {
            id: '1',
            type: 'test',
            message: '用户 admin 执行了压力测试',
            timestamp: '2分钟前',
            severity: 'info'
          },
          {
            id: '2',
            type: 'user',
            message: '新用户注册: test@example.com',
            timestamp: '5分钟前',
            severity: 'info'
          },
          {
            id: '3',
            type: 'system',
            message: '数据库连接池已优化',
            timestamp: '10分钟前',
            severity: 'info'
          },
          {
            id: '4',
            type: 'error',
            message: 'API响应时间超过阈值',
            timestamp: '15分钟前',
            severity: 'warning'
          }
        ]);
      }
    } catch (error) {
      console.error('获取活动日志失败:', error);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    fetchRecentActivity();

    // 每30秒更新一次
    const interval = setInterval(() => {
      fetchSystemMetrics();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'test':
        return <TestTube className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'system':
        return <Server className="w-4 h-4 text-purple-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getSeverityColor = (severity: RecentActivity['severity']) => {
    switch (severity) {
      case 'info':
        return 'border-l-blue-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统健康检查 */}
      <SystemHealthCheck showDetails={true} />

      {/* 系统指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">总测试数</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalTests.toLocaleString()}</p>
            </div>
            <TestTube className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">活跃用户</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">系统运行时间</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.systemUptime}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">API响应时间</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.apiResponseTime}ms</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 性能指标 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">性能指标</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">数据库连接数</span>
              <span className="font-medium">{metrics.databaseConnections}/20</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(metrics.databaseConnections / 20) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">错误率</span>
              <span className="font-medium">{(metrics.errorRate * 100).toFixed(2)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${metrics.errorRate > 0.05 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(metrics.errorRate * 2000, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-start space-x-3 p-3 border-l-4 bg-gray-50 rounded-r ${getSeverityColor(activity.severity)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最后更新时间 */}
      <div className="text-center text-sm text-gray-500">
        最后更新: {metrics.lastUpdate}
      </div>
    </div>
  );
};

export default SystemStatusDashboard;
