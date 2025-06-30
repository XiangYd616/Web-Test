import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Plus,
  Settings,
  Bell,
  BellOff,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { RealTimeMonitoringService, MonitoringTarget, MonitoringStats, Alert } from '../services/realTimeMonitoring';

interface RealTimeMonitoringDashboardProps {
  className?: string;
}

const RealTimeMonitoringDashboard: React.FC<RealTimeMonitoringDashboardProps> = ({ className = '' }) => {
  const [monitoringService] = useState(() => RealTimeMonitoringService.getInstance());
  const [targets, setTargets] = useState<MonitoringTarget[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<MonitoringTarget | null>(null);

  useEffect(() => {
    // 初始化数据
    loadData();

    // 设置事件监听
    const handleTargetAdded = () => loadData();
    const handleTargetUpdated = () => loadData();
    const handleTargetRemoved = () => loadData();
    const handleCheckCompleted = () => loadData();
    const handleAlertCreated = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev]);
      loadData();
    };

    monitoringService.on('targetAdded', handleTargetAdded);
    monitoringService.on('targetUpdated', handleTargetUpdated);
    monitoringService.on('targetRemoved', handleTargetRemoved);
    monitoringService.on('checkCompleted', handleCheckCompleted);
    monitoringService.on('alertCreated', handleAlertCreated);

    return () => {
      monitoringService.off('targetAdded', handleTargetAdded);
      monitoringService.off('targetUpdated', handleTargetUpdated);
      monitoringService.off('targetRemoved', handleTargetRemoved);
      monitoringService.off('checkCompleted', handleCheckCompleted);
      monitoringService.off('alertCreated', handleAlertCreated);
    };
  }, [monitoringService]);

  const loadData = () => {
    setTargets(monitoringService.getTargets());
    setStats(monitoringService.getStats());
  };

  const handleStartMonitoring = () => {
    monitoringService.startGlobalMonitoring();
    setIsMonitoring(true);
  };

  const handleStopMonitoring = () => {
    monitoringService.stopGlobalMonitoring();
    setIsMonitoring(false);
  };

  const handleToggleTarget = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (target) {
      monitoringService.updateTarget(targetId, { enabled: !target.enabled });
    }
  };

  const handleDeleteTarget = (targetId: string) => {
    if (confirm('确定要删除这个监控目标吗？')) {
      monitoringService.removeTarget(targetId);
    }
  };

  const getStatusIcon = (status: MonitoringTarget['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: MonitoringTarget['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatLastChecked = (timestamp?: string) => {
    if (!timestamp) return '从未检查';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">实时监控</h2>
            <p className="text-gray-600">7x24小时网站和服务监控</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加监控</span>
            </button>
            {!isMonitoring ? (
              <button
                type="button"
                onClick={handleStartMonitoring}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>开始监控</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopMonitoring}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span>停止监控</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">监控目标</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTargets}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {stats.activeTargets} 个活跃
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">整体可用性</p>
                <p className="text-3xl font-bold text-gray-900">{stats.overallAvailability}%</p>
                <p className="text-sm text-green-600 mt-1">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  正常运行
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">平均响应时间</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgResponseTime}ms</p>
                <p className="text-sm text-blue-600 mt-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  性能良好
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">活跃告警</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeAlerts}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {stats.resolvedAlerts} 个已解决
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <Bell className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 监控目标列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">监控目标</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {targets.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无监控目标</h3>
              <p className="text-gray-600 mb-4">添加您的第一个监控目标开始使用</p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加监控目标</span>
              </button>
            </div>
          ) : (
            targets.map((target) => (
              <div key={target.id} className={`p-6 ${getStatusColor(target.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(target.status)}
                    <div>
                      <h4 className="font-semibold text-gray-900">{target.name}</h4>
                      <p className="text-sm text-gray-600">{target.url}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>类型: {target.type}</span>
                        <span>间隔: {target.interval}s</span>
                        <span>最后检查: {formatLastChecked(target.lastChecked)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleToggleTarget(target.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        target.enabled 
                          ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                          : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                      }`}
                      title={target.enabled ? '禁用监控' : '启用监控'}
                    >
                      {target.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTarget(target)}
                      className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTarget(target.id)}
                      className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 最近告警 */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">最近告警</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.resolved && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      未解决
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMonitoringDashboard;
