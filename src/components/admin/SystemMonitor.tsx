import { Activity, AlertTriangle, CheckCircle, Cpu, Database, HardDrive, MemoryStick, Monitor, Network, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { SystemMonitor as SystemMonitorType } from '../../types/admin';

const SystemMonitor: React.FC = () => {
  const [monitor, setMonitor] = useState<SystemMonitorType | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒

  useEffect(() => {
    loadMonitorData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadMonitorData, refreshInterval * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadMonitorData = async () => {
    try {
      const data = await adminService.getSystemMonitor();
      setMonitor(data);
    } catch (error) {
      console.error('加载监控数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (usage: number): string => {
    if (usage < 50) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsageBarColor = (usage: number): string => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const percentage = (value / max) * 100;
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className={getUsageColor(percentage)}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatBytes(value)}</span>
          <span>{formatBytes(max)}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载监控数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和控制 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">系统监控</h2>
          <p className="text-gray-600 mt-1">实时监控系统资源使用情况</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label htmlFor="auto-refresh-checkbox" className="text-sm font-medium text-gray-700">自动刷新</label>
            <input
              id="auto-refresh-checkbox"
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-label="启用或禁用自动刷新"
            />
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="input text-sm"
            disabled={!autoRefresh}
            aria-label="刷新间隔"
          >
            <option value={10}>10秒</option>
            <option value={30}>30秒</option>
            <option value={60}>1分钟</option>
            <option value={300}>5分钟</option>
          </select>
          <button
            type="button"
            onClick={loadMonitorData}
            className="btn btn-outline btn-sm flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">CPU 使用率</p>
              <p className={`text-2xl font-bold ${getUsageColor(monitor?.metrics.cpu.usage || 0)}`}>
                {monitor?.metrics.cpu.usage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">{monitor?.metrics.cpu.cores} 核心</p>
            </div>
            <Cpu className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">内存使用率</p>
              <p className={`text-2xl font-bold ${getUsageColor(monitor?.metrics.memory.usage || 0)}`}>
                {monitor?.metrics.memory.usage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                {formatBytes(monitor?.metrics.memory.used || 0)} / {formatBytes(monitor?.metrics.memory.total || 0)}
              </p>
            </div>
            <MemoryStick className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">磁盘使用率</p>
              <p className={`text-2xl font-bold ${getUsageColor(monitor?.metrics.disk.usage || 0)}`}>
                {monitor?.metrics.disk.usage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                {formatBytes(monitor?.metrics.disk.used || 0)} / {formatBytes(monitor?.metrics.disk.total || 0)}
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">网络连接</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitor?.metrics.network.connections}
              </p>
              <p className="text-sm text-gray-600">活跃连接</p>
            </div>
            <Network className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* 详细监控信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 系统资源 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">系统资源</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-6">
            <ProgressBar
              value={monitor?.metrics.memory.used || 0}
              max={monitor?.metrics.memory.total || 1}
              label="内存使用"
            />

            <ProgressBar
              value={monitor?.metrics.disk.used || 0}
              max={monitor?.metrics.disk.total || 1}
              label="磁盘使用"
            />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">CPU 温度</span>
                <span className={getUsageColor(monitor?.metrics.cpu.temperature || 0)}>
                  {monitor?.metrics.cpu.temperature?.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 网络流量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">网络流量</h3>
            <Network className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium">入站流量</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatBytes(monitor?.metrics.network.incoming || 0)}/s
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium">出站流量</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatBytes(monitor?.metrics.network.outgoing || 0)}/s
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium">活跃连接</span>
              </div>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.network.connections}
              </span>
            </div>
          </div>
        </div>

        {/* 数据库状态 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">数据库状态</h3>
            <Database className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">连接数</span>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.database.connections} / 100
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">平均查询时间</span>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.database.queryTime.toFixed(2)}ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">数据库大小</span>
              <span className="text-sm text-gray-600">
                {formatBytes(monitor?.metrics.database.size)}
              </span>
            </div>
          </div>
        </div>

        {/* 应用状态 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">应用状态</h3>
            <Monitor className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">活跃用户</span>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.application.activeUsers}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">运行中测试</span>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.application.runningTests}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">队列中测试</span>
              <span className="text-sm text-gray-600">
                {monitor?.metrics.application.queuedTests}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">错误率</span>
              <span className={`text-sm font-medium ${(monitor?.metrics.application.errorRate || 0) < 5 ? 'text-green-600' : 'text-red-600'
                }`}>
                {monitor?.metrics.application.errorRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 系统健康状态 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">系统健康状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">系统运行正常</p>
              <p className="text-xs text-green-700">所有服务正常运行</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-900">内存使用偏高</p>
              <p className="text-xs text-yellow-700">建议关注内存使用情况</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">性能良好</p>
              <p className="text-xs text-blue-700">响应时间在正常范围内</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
