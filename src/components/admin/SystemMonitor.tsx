import { Activity, AlertTriangle, CheckCircle, Cpu, Database, HardDrive, MemoryStick, Monitor, Network, RefreshCw, Shield } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import type { SystemMonitor as SystemMonitorType } from '../../types/admin';

// 自动保护配置接口
interface AutoProtectionConfig {
  enabled: boolean;
  errorRateThreshold: number;
  responseTimeThreshold: number;
  systemCpuThreshold: number;
  systemMemoryThreshold: number;
  autoStopEnabled: boolean;
}

// 活跃测试接口
interface ActiveTest {
  id: string;
  url: string;
  testType: string;
  users: number;
  currentUsers: number;
  errorRate: number;
  averageResponseTime: number;
  status: 'running' | 'warning' | 'critical';
  warnings: string[];
}

const SystemMonitor: React.FC = () => {
  const [monitor, setMonitor] = useState<SystemMonitorType | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒

  // 自动保护配置
  const [autoProtection, setAutoProtection] = useState({
    enabled: true,
    errorRateThreshold: 50,
    responseTimeThreshold: 10000,
    systemCpuThreshold: 85,
    systemMemoryThreshold: 90,
    autoStopEnabled: true
  });

  // 系统警报
  const [alerts, setAlerts] = useState<string[]>([]);

  // 活跃测试模拟数据
  const [activeTests, setActiveTests] = useState([
    {
      id: 'test-001',
      url: 'https://api.example.com',
      testType: 'stress',
      users: 500,
      currentUsers: 450,
      errorRate: 15.5,
      averageResponseTime: 2500,
      status: 'running' as 'running' | 'warning' | 'critical',
      warnings: []
    },
    {
      id: 'test-002',
      url: 'https://web.example.com',
      testType: 'load',
      users: 200,
      currentUsers: 200,
      errorRate: 65.2,
      averageResponseTime: 12000,
      status: 'critical' as const,
      warnings: ['错误率过高', '响应时间超时']
    }
  ]);

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

      // 检查自动保护规则
      checkAutoProtection(data);
    } catch (error) {
      console.error('加载监控数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查自动保护规则
  const checkAutoProtection = (monitorData: SystemMonitorType) => {
    if (!autoProtection.enabled) return;

    const newAlerts: string[] = [];

    // 检查CPU使用率
    if (monitorData.metrics.system.cpuUsage.percentage > autoProtection.systemCpuThreshold) {
      newAlerts.push(`CPU使用率过高: ${monitorData.metrics.system.cpuUsage.percentage.toFixed(1)}%`);
    }

    // 检查内存使用率
    const memoryUsage = monitorData.metrics.system.memoryUsage.percentage;
    if (memoryUsage > autoProtection.systemMemoryThreshold) {
      newAlerts.push(`内存使用率过高: ${memoryUsage.toFixed(1)}%`);
    }

    // 检查活跃测试
    activeTests.forEach(test => {
      if (test.errorRate > autoProtection.errorRateThreshold) {
        newAlerts.push(`测试 ${test.id} 错误率过高: ${test.errorRate.toFixed(1)}%`);
      }
      if (test.averageResponseTime > autoProtection.responseTimeThreshold) {
        newAlerts.push(`测试 ${test.id} 响应时间过长: ${test.averageResponseTime}ms`);
      }
    });

    setAlerts(newAlerts);

    // 自动停止危险测试
    if (autoProtection.autoStopEnabled && newAlerts.length > 0) {
      console.warn('🚨 自动保护触发，检测到以下问题:', newAlerts);
      // 这里可以调用API停止危险测试
    }
  };

  // 强制停止测试
  const forceStopTest = async (testId: string) => {
    console.log('🛑 管理员强制停止测试:', testId);
    setActiveTests(prev => prev.filter(test => test.id !== testId));
    setAlerts(prev => prev.filter(alert => !alert.includes(testId)));
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

      {/* 系统警报面板 */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-red-800">系统警报</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-700">{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自动保护状态 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-blue-800">自动保护系统</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${autoProtection.enabled
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
              }`}>
              {autoProtection.enabled ? '已启用' : '已禁用'}
            </span>
            <button
              type="button"
              onClick={() => setAutoProtection(prev => ({ ...prev, enabled: !prev.enabled }))}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {autoProtection.enabled ? '禁用' : '启用'}
            </button>
          </div>
        </div>
        {autoProtection.enabled && (
          <div className="mt-3 text-sm text-blue-700">
            <p>监控阈值: CPU &gt; {autoProtection.systemCpuThreshold}%, 内存 &gt; {autoProtection.systemMemoryThreshold}%</p>
            <p>错误率阈值: {autoProtection.errorRateThreshold}%, 响应时间阈值: {autoProtection.responseTimeThreshold}ms</p>
          </div>
        )}
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

      {/* 活跃测试监控 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-500" />
            <span>活跃测试监控</span>
          </h3>
          <span className="text-sm text-gray-500">
            {activeTests.length} 个活跃测试
          </span>
        </div>

        {activeTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>当前没有活跃的测试</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTests.map((test) => (
              <div key={test.id} className={`p-4 rounded-lg border ${test.status === 'critical' ? 'bg-red-50 border-red-200' :
                test.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${test.status === 'critical' ? 'bg-red-500 animate-pulse' :
                      test.status === 'warning' ? 'bg-yellow-500 animate-pulse' :
                        'bg-green-500'
                      }`}></div>
                    <div>
                      <div className="font-medium text-gray-900">{test.id}</div>
                      <div className="text-sm text-gray-600">{test.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-700">
                        {test.currentUsers}/{test.users} 用户
                      </div>
                      <div className="text-xs text-gray-500">
                        {test.testType} 测试
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => forceStopTest(test.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="强制停止测试"
                    >
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${test.errorRate > 50 ? 'text-red-600' :
                      test.errorRate > 20 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                      {test.errorRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">错误率</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${test.averageResponseTime > 10000 ? 'text-red-600' :
                      test.averageResponseTime > 5000 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                      {test.averageResponseTime}ms
                    </div>
                    <div className="text-xs text-gray-500">响应时间</div>
                  </div>
                </div>

                {test.warnings.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {test.warnings.map((warning, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        {warning}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitor;
