import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  Pause,
  Play,
  Plus,
  Settings,
  Shield,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wifi,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { MonitoringData, monitoringService, MonitoringSite, MonitoringStats } from '../../services/monitoring';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  notifications: string[];
}

interface RealTimeData {
  timestamp: string;
  responseTime: number;
  status: number;
  uptime: number;
}

const RealTimeMonitoring: React.FC = () => {
  const [monitoringSites, setMonitoringSites] = useState<MonitoringSite[]>([]);
  const [realTimeData, setRealTimeData] = useState<MonitoringData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', url: '', region: '默认' });
  const [selectedSite, setSelectedSite] = useState<MonitoringSite | null>(null);
  const [showSiteDetails, setShowSiteDetails] = useState(false);
  const [monitoringStats, setMonitoringStats] = useState<MonitoringStats>({
    totalSites: 0,
    onlineSites: 0,
    avgResponseTime: 0,
    totalUptime: 0,
    activeAlerts: 0,
    validCertificates: 0,
    totalChecks: 0,
    incidents: 0
  });
  const [loading, setLoading] = useState(true);

  // 初始化数据加载
  useEffect(() => {
    loadMonitoringData();
  }, []);

  // 监控状态变化
  useEffect(() => {
    if (isMonitoring) {
      monitoringService.startMonitoring(30000); // 30秒间隔

      // 定期更新数据
      const interval = setInterval(() => {
        updateRealTimeData();
        updateMonitoringStats();
      }, 5000);

      return () => {
        clearInterval(interval);
      };
    } else {
      monitoringService.stopMonitoring();
    }
    return undefined;
  }, [isMonitoring]);

  // 加载监控数据
  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const sites = await monitoringService.getSites();
      setMonitoringSites(sites);

      const stats = monitoringService.getMonitoringStats();
      setMonitoringStats(stats);

      const data = monitoringService.getMonitoringData();
      setRealTimeData(data);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新实时数据
  const updateRealTimeData = () => {
    const data = monitoringService.getMonitoringData(undefined, 50);
    setRealTimeData(data);
  };

  // 更新监控统计
  const updateMonitoringStats = () => {
    const stats = monitoringService.getMonitoringStats();
    setMonitoringStats(stats);
  };

  const addMonitoringSite = async () => {
    console.log('添加监控站点被调用', { newSite });

    if (!newSite.name || !newSite.url) {
      console.log('站点名称或URL为空', { name: newSite.name, url: newSite.url });
      alert('请填写站点名称和URL');
      return;
    }

    try {
      console.log('开始添加站点...');
      const site = await monitoringService.addSite({
        name: newSite.name,
        url: newSite.url,
        region: newSite.region,
        enabled: true
      });

      console.log('站点添加成功', site);
      setMonitoringSites(prev => {
        const updated = [...prev, site];
        console.log('更新站点列表', updated);
        return updated;
      });

      setNewSite({ name: '', url: '', region: '默认' });
      setShowAddSite(false);

      // 更新统计
      updateMonitoringStats();

      // 立即重新加载数据
      await loadMonitoringData();

    } catch (error) {
      console.error('Failed to add monitoring site:', error);
      alert('添加站点失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const removeSite = async (id: string) => {
    try {
      await monitoringService.removeSite(id);
      setMonitoringSites(prev => prev.filter(site => site.id !== id));
      updateMonitoringStats();
    } catch (error) {
      console.error('Failed to remove monitoring site:', error);
    }
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-500/20';
      case 'offline': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'offline': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">实时监控</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAlertConfig(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>告警设置</span>
          </button>
          <button
            onClick={() => setShowAddSite(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加站点</span>
          </button>
          <button
            onClick={toggleMonitoring}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isMonitoring
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isMonitoring ? '停止监控' : '开始监控'}</span>
          </button>
        </div>
      </div>

      {/* 监控状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">监控站点</p>
              <p className="text-2xl font-bold text-white mt-1">{monitoringStats.totalSites}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm text-green-400">+2 本周</span>
              </div>
            </div>
            <Globe className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">在线站点</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {monitoringStats.onlineSites}
              </p>
              <div className="flex items-center mt-2">
                <Wifi className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm text-green-400">
                  {monitoringStats.totalSites > 0
                    ? Math.round((monitoringStats.onlineSites / monitoringStats.totalSites) * 100)
                    : 0}% 可用
                </span>
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">平均响应时间</p>
              <p className="text-2xl font-bold text-white mt-1">
                {Math.round(monitoringStats.avgResponseTime)}ms
              </p>
              <div className="flex items-center mt-2">
                <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm text-green-400">-15ms 今日</span>
              </div>
            </div>
            <Zap className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">活跃告警</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {monitoringStats.activeAlerts}
              </p>
              <div className="flex items-center mt-2">
                <Bell className="w-4 h-4 text-red-400 mr-1" />
                <span className="text-sm text-red-400">需要关注</span>
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">SSL证书</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {monitoringStats.validCertificates}
              </p>
              <div className="flex items-center mt-2">
                <Shield className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm text-green-400">全部有效</span>
              </div>
            </div>
            <Shield className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">总可用性</p>
              <p className="text-2xl font-bold text-white mt-1">
                {monitoringStats.totalUptime.toFixed(1)}%
              </p>
              <div className="flex items-center mt-2">
                <Target className="w-4 h-4 text-blue-400 mr-1" />
                <span className="text-sm text-blue-400">SLA 99.9%</span>
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* 实时图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 响应时间图表 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">实时响应时间</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN')}
                formatter={(value: number) => [`${value.toFixed(0)}ms`, '响应时间']}
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="响应时间"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 可用性图表 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">服务可用性</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[95, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => new Date(value).toLocaleTimeString('zh-CN')}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '可用性']}
              />
              <Area
                type="monotone"
                dataKey="uptime"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="可用性"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 监控站点列表 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">监控站点</h3>
        {monitoringSites.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">暂无监控站点</p>
            <button
              onClick={() => setShowAddSite(true)}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              添加第一个站点
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">站点</th>
                  <th className="text-left py-3 px-4 text-gray-300">状态</th>
                  <th className="text-left py-3 px-4 text-gray-300">响应时间</th>
                  <th className="text-left py-3 px-4 text-gray-300">可用性</th>
                  <th className="text-left py-3 px-4 text-gray-300">最后检查</th>
                  <th className="text-left py-3 px-4 text-gray-300">操作</th>
                </tr>
              </thead>
              <tbody>
                {monitoringSites.map((site) => (
                  <tr key={site.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-white font-medium">{site.name}</div>
                        <div className="text-gray-400 text-xs">{site.url}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(site.status)}`}>
                        {getStatusIcon(site.status)}
                        <span>{site.status === 'online' ? '在线' : site.status === 'offline' ? '离线' : '警告'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">{site.responseTime}ms</td>
                    <td className="py-3 px-4 text-white">{site.uptime}%</td>
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(site.lastCheck).toLocaleTimeString('zh-CN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          title="查看详情"
                          aria-label="查看站点详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSite(site.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="删除站点"
                          aria-label="删除监控站点"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 添加站点模态框 */}
      {showAddSite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">添加监控站点</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">站点名称</label>
                <input
                  type="text"
                  value={newSite.name}
                  onChange={(e) => setNewSite(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：我的网站"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                <input
                  type="url"
                  value={newSite.url}
                  onChange={(e) => setNewSite(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddSite(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                title="取消添加"
                aria-label="取消添加站点"
              >
                取消
              </button>
              <button
                type="button"
                onClick={addMonitoringSite}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeMonitoring;
