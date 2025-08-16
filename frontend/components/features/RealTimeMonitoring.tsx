import React, { useEffect, useState } from 'react';
import {Activity, AlertTriangle, CheckCircle, Clock, Database, Server, Users, Zap} from 'lucide-react';

export interface MonitoringMetrics {
  activeUsers: number;
  serverLoad: number;
  responseTime: number;
  errorRate: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  networkTraffic: number;
}

export interface RealTimeMonitoringProps {
  refreshInterval?: number;
  showAlerts?: boolean;
  compactMode?: boolean;
}

const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({
  refreshInterval = 5000,
  showAlerts = true,
  compactMode = false
}) => {
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    activeUsers: 0,
    serverLoad: 0,
    responseTime: 0,
    errorRate: 0,
    databaseConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkTraffic: 0
  });

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 模拟实时数据更新
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        activeUsers: Math.floor(Math.random() * 1000) + 100,
        serverLoad: Math.random() * 100,
        responseTime: Math.random() * 500 + 50,
        errorRate: Math.random() * 5,
        databaseConnections: Math.floor(Math.random() * 50) + 10,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        networkTraffic: Math.random() * 1000
      });
      setLastUpdate(new Date());
      setIsConnected(true);
    };

    // 初始更新
    updateMetrics();

    // 设置定时更新
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-50 border-red-200';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <AlertTriangle className="w-4 h-4" />;
    if (value >= thresholds.warning) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    thresholds: { warning: number; critical: number };
    format?: (value: number) => string;
  }> = ({ title, value, unit, icon, thresholds, format }) => {
    const formattedValue = format ? format(value) : value.toFixed(1);
    const statusColor = getStatusColor(value, thresholds);
    const statusIcon = getStatusIcon(value, thresholds);

    if (compactMode) {
      
        return (
        <div className={`flex items-center gap-2 p-2 rounded border ${statusColor
      }`}>
          {icon}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{title}</div>
            <div className="text-sm font-bold">{formattedValue}{unit}</div>
          </div>
          {statusIcon}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-600">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          {statusIcon}
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {formattedValue}
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        </div>
        <div className={`mt-2 text-xs px-2 py-1 rounded ${statusColor}`}>
          {value >= thresholds.critical ? '严重' : value >= thresholds.warning ? '警告' : '正常'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 连接状态 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">实时监控</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? '已连接' : '连接中...'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              更新于 {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* 指标网格 */}
      <div className={`grid gap-4 ${compactMode ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <MetricCard
          title="活跃用户"
          value={metrics.activeUsers}
          unit=""
          icon={<Users className="w-4 h-4" />}
          thresholds={{ warning: 800, critical: 900 }}
          format={(value) => value.toString()}
        />
        
        <MetricCard
          title="服务器负载"
          value={metrics.serverLoad}
          unit="%"
          icon={<Server className="w-4 h-4" />}
          thresholds={{ warning: 70, critical: 90 }}
        />
        
        <MetricCard
          title="响应时间"
          value={metrics.responseTime}
          unit="ms"
          icon={<Zap className="w-4 h-4" />}
          thresholds={{ warning: 200, critical: 400 }}
        />
        
        <MetricCard
          title="错误率"
          value={metrics.errorRate}
          unit="%"
          icon={<AlertTriangle className="w-4 h-4" />}
          thresholds={{ warning: 2, critical: 5 }}
        />
        
        <MetricCard
          title="数据库连接"
          value={metrics.databaseConnections}
          unit=""
          icon={<Database className="w-4 h-4" />}
          thresholds={{ warning: 40, critical: 45 }}
          format={(value) => value.toString()}
        />
        
        <MetricCard
          title="内存使用"
          value={metrics.memoryUsage}
          unit="%"
          icon={<Activity className="w-4 h-4" />}
          thresholds={{ warning: 80, critical: 95 }}
        />
        
        <MetricCard
          title="CPU使用"
          value={metrics.cpuUsage}
          unit="%"
          icon={<Activity className="w-4 h-4" />}
          thresholds={{ warning: 70, critical: 90 }}
        />
        
        <MetricCard
          title="网络流量"
          value={metrics.networkTraffic}
          unit="MB/s"
          icon={<Activity className="w-4 h-4" />}
          thresholds={{ warning: 800, critical: 950 }}
        />
      </div>

      {/* 警报区域 */}
      {showAlerts && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">系统警报</span>
          </div>
          <div className="text-sm text-yellow-700">
            {metrics.serverLoad > 70 && <div>• 服务器负载过高 ({metrics.serverLoad.toFixed(1)}%)</div>}
            {metrics.responseTime > 200 && <div>• 响应时间较慢 ({metrics.responseTime.toFixed(0)}ms)</div>}
            {metrics.errorRate > 2 && <div>• 错误率偏高 ({metrics.errorRate.toFixed(1)}%)</div>}
            {metrics.serverLoad <= 70 && metrics.responseTime <= 200 && metrics.errorRate <= 2 && (
              <div>• 系统运行正常</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMonitoring;
