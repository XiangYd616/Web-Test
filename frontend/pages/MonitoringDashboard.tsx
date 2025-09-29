/**
 * 系统监控仪表板页面 - 仅管理员可访问
 * 显示服务器性能、资源使用情况、错误监控等管理员级别的信息
 */

import { Activity, AlertTriangle, BarChart3, Clock, Cpu, Database, HardDrive, Network, RefreshCw, Server, TrendingUp, Users, Wifi, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface SystemMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeUsers: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
}

interface PerformanceTrend {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

const MonitoringDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    responseTime: 60,
    throughput: 30,
    errorRate: 0.2,
    activeUsers: 509,
    cpuUsage: 23.6,
    memoryUsage: 40.4,
    diskUsage: 58.5,
    networkUsage: 56.7
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);

  // 检查管理员权限
  const isAdmin = user.role === 'admin' || user?.permissions?.includes('monitoring');

  // 获取系统指标
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdate(new Date());

        // 更新趋势数据
        const newTrend: PerformanceTrend = {
          timestamp: new Date().toISOString(),
          responseTime: data.responseTime,
          throughput: data.throughput,
          errorRate: data.errorRate
        };

        setTrends(prev => [...prev.slice(-19), newTrend]); // 保留最近20个数据点
      }
    } catch (error) {
      console.error('获取监控指标失败:', error);
    }
  }, []);

  // 开始/停止监控
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // 手动刷新
  const handleRefresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // 自动刷新
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isMonitoring) {
      interval = setInterval(fetchMetrics, 5000); // 每5秒刷新
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, fetchMetrics]);

  // 初始加载
  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
    }
  }, [isAdmin, fetchMetrics]);

  // 权限检查
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问受限</h2>
          <p className="text-gray-600 mb-6">
            系统监控仪表板仅限管理员访问。如需查看此页面，请联系系统管理员获取相应权限。
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBg = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'bg-red-100';
    if (value >= thresholds.warning) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和控制 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统监控仪表板</h1>
            <p className="mt-2 text-gray-600">
              实时系统性能监控 - 最后更新: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </button>

            <button
              onClick={toggleMonitoring}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${isMonitoring
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {isMonitoring ? (
                <>
                  <Server className="h-4 w-4 mr-2" />
                  停止监控
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  开始监控
                </>
              )}
            </button>
          </div>
        </div>

        {/* 实时性能指标 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">实时性能指标</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 响应时间 */}
            <div className={`bg-white rounded-lg shadow p-6 ${getStatusBg(metrics.responseTime, { warning: 200, critical: 500 })}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">响应时间</p>
                  <p className={`text-2xl font-semibold ${getStatusColor(metrics.responseTime, { warning: 200, critical: 500 })}`}>
                    {metrics.responseTime} ms
                  </p>
                  <p className="text-xs text-gray-500 mt-1">阈值: 200ms</p>
                </div>
                <Clock className={`h-8 w-8 ${getStatusColor(metrics.responseTime, { warning: 200, critical: 500 })}`} />
              </div>
            </div>

            {/* 吞吐量 */}
            <div className={`bg-white rounded-lg shadow p-6 ${getStatusBg(100 - metrics.throughput, { warning: 50, critical: 80 })}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">吞吐量</p>
                  <p className={`text-2xl font-semibold ${getStatusColor(100 - metrics.throughput, { warning: 50, critical: 80 })}`}>
                    {metrics.throughput} req/s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">阈值: 100 req/s</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${getStatusColor(100 - metrics.throughput, { warning: 50, critical: 80 })}`} />
              </div>
            </div>

            {/* 错误率 */}
            <div className={`bg-white rounded-lg shadow p-6 ${getStatusBg(metrics.errorRate, { warning: 1, critical: 5 })}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">错误率</p>
                  <p className={`text-2xl font-semibold ${getStatusColor(metrics.errorRate, { warning: 1, critical: 5 })}`}>
                    {metrics.errorRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">阈值: 5.0%</p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${getStatusColor(metrics.errorRate, { warning: 1, critical: 5 })}`} />
              </div>
            </div>

            {/* 活跃用户 */}
            <div className="bg-white rounded-lg shadow p-6 bg-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">活跃用户</p>
                  <p className="text-2xl font-semibold text-blue-600">{metrics.activeUsers} users</p>
                  <p className="text-xs text-gray-500 mt-1">阈值: 1000 users</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 系统资源使用情况 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统资源</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU使用率 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Cpu className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">CPU使用率</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(metrics.cpuUsage, { warning: 70, critical: 90 })}`}>
                  {metrics.cpuUsage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metrics.cpuUsage >= 90 ? 'bg-red-500' :
                      metrics.cpuUsage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">阈值: 100%</p>
            </div>

            {/* 内存使用率 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">内存使用率</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(metrics.memoryUsage, { warning: 70, critical: 90 })}`}>
                  {metrics.memoryUsage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metrics.memoryUsage >= 90 ? 'bg-red-500' :
                      metrics.memoryUsage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.memoryUsage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">阈值: 100%</p>
            </div>

            {/* 磁盘使用率 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 text-orange-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">磁盘使用率</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(metrics.diskUsage, { warning: 80, critical: 95 })}`}>
                  {metrics.diskUsage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metrics.diskUsage >= 95 ? 'bg-red-500' :
                      metrics.diskUsage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.diskUsage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">阈值: 100%</p>
            </div>

            {/* 网络使用率 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Network className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">网络使用率</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(metrics.networkUsage, { warning: 80, critical: 95 })}`}>
                  {metrics.networkUsage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metrics.networkUsage >= 95 ? 'bg-red-500' :
                      metrics.networkUsage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${metrics.networkUsage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">阈值: 100%</p>
            </div>
          </div>
        </div>

        {/* 性能趋势图表 */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">性能趋势</h2>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">响应时间</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">吞吐量</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">错误率</span>
                </div>
              </div>
            </div>

            {trends.length > 0 ? (
              <div className="h-64 flex items-end justify-between space-x-1">
                {trends.map((trend, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center space-y-1">
                      <div
                        className="w-2 bg-blue-500 rounded-t"
                        style={{ height: `${(trend.responseTime / 500) * 100}px` }}
                        title={`响应时间: ${trend.responseTime}ms`}
                      ></div>
                      <div
                        className="w-2 bg-green-500 rounded-t"
                        style={{ height: `${(trend.throughput / 100) * 100}px` }}
                        title={`吞吐量: ${trend.throughput} req/s`}
                      ></div>
                      <div
                        className="w-2 bg-red-500 rounded-t"
                        style={{ height: `${(trend.errorRate / 10) * 100}px` }}
                        title={`错误率: ${trend.errorRate}%`}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">开始监控以查看性能趋势</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 系统状态和警告 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 系统服务状态 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">系统服务状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Web服务器</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">运行中</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">数据库</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">运行中</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="h-5 w-5 text-yellow-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">测试引擎</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-yellow-600">负载中</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">WebSocket</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600">连接正常</span>
                </div>
              </div>
            </div>
          </div>

          {/* 系统警告 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">系统警告</h3>
            <div className="space-y-3">
              {metrics.errorRate > 1 && (
                <div className="flex items-start p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">错误率过高</p>
                    <p className="text-xs text-red-600">当前错误率 {metrics.errorRate}% 超过警告阈值</p>
                  </div>
                </div>
              )}

              {metrics.responseTime > 200 && (
                <div className="flex items-start p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">响应时间较慢</p>
                    <p className="text-xs text-yellow-600">当前响应时间 {metrics.responseTime}ms 超过建议值</p>
                  </div>
                </div>
              )}

              {metrics.cpuUsage > 70 && (
                <div className="flex items-start p-3 bg-orange-50 rounded-lg">
                  <Cpu className="h-5 w-5 text-orange-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">CPU使用率较高</p>
                    <p className="text-xs text-orange-600">当前CPU使用率 {metrics.cpuUsage}% 需要关注</p>
                  </div>
                </div>
              )}

              {metrics.errorRate <= 1 && metrics.responseTime <= 200 && metrics.cpuUsage <= 70 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">系统运行正常，无警告信息</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
