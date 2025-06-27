import React, { useState, useEffect } from 'react';
import {
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Zap,
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  BarChart3,
  Activity,
  MapPin,
  Pause,
  Play,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface MonitoringSite {
  id: string;
  name: string;
  url: string;
  status: 'up' | 'down' | 'warning';
  responseTime: number;
  uptime: number;
  lastCheck: string;
  location: string;
  checkInterval: number;
  alerts: boolean;
}

interface Alert {
  id: string;
  siteId: string;
  siteName: string;
  type: 'down' | 'slow' | 'ssl' | 'content';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface GlobalStats {
  totalSites: number;
  upSites: number;
  downSites: number;
  avgResponseTime: number;
  totalChecks: number;
  avgUptime: number;
}

const MonitoringDashboard: React.FC = () => {
  const [sites, setSites] = useState<MonitoringSite[]>([]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalSites: 0,
    upSites: 0,
    downSites: 0,
    avgResponseTime: 0,
    totalChecks: 0,
    avgUptime: 0
  });
  const [loading, setLoading] = useState(true);

  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [addSiteForm, setAddSiteForm] = useState({
    url: '',
    name: '',
    interval: 300,
    timeout: 10000
  });
  const [addingSite, setAddingSite] = useState(false);

  // 获取API基础URL
  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  };

  // 添加监控站点
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSiteForm.url.trim()) return;

    setAddingSite(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiBaseUrl()}/monitoring/sites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addSiteForm)
      });

      if (response.ok) {
        // 重新加载监控数据
        await loadMonitoringData();
        // 重置表单
        setAddSiteForm({
          url: '',
          name: '',
          interval: 300,
          timeout: 10000
        });
        setShowAddSiteModal(false);
      } else {
        console.error('Failed to add monitoring site');
      }
    } catch (error) {
      console.error('Error adding monitoring site:', error);
    } finally {
      setAddingSite(false);
    }
  };

  // 获取认证头
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // 加载监控数据
  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      const baseUrl = getApiBaseUrl();

      // 获取监控站点
      const sitesResponse = await fetch(`${baseUrl}/monitoring/sites`, {
        headers: getAuthHeaders()
      });
      const sitesData = await sitesResponse.json();

      if (sitesData.success) {
        setSites(sitesData.data || []);
      }

      // 获取告警信息
      const alertsResponse = await fetch(`${baseUrl}/monitoring/alerts`, {
        headers: getAuthHeaders()
      });
      const alertsData = await alertsResponse.json();

      if (alertsData.success) {
        setAlerts(alertsData.data || []);
      }

      // 获取全局统计
      const statsResponse = await fetch(`${baseUrl}/monitoring/stats`, {
        headers: getAuthHeaders()
      });
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setGlobalStats(statsData.data || {
          totalSites: 0,
          upSites: 0,
          downSites: 0,
          avgResponseTime: 0,
          totalChecks: 0,
          avgUptime: 0
        });
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      // 如果API失败，使用示例数据
      setSites([
        {
          id: '1',
          name: '主网站',
          url: 'https://example.com',
          status: 'up',
          responseTime: 245,
          uptime: 99.8,
          lastCheck: '2分钟前',
          location: '北京',
          checkInterval: 5,
          alerts: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取数据
  useEffect(() => {
    loadMonitoringData();

    // 设置定时刷新
    const interval = setInterval(loadMonitoringData, 30000); // 每30秒刷新

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'down':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'down':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'slow':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'ssl':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const timeRanges = [
    { value: '1h', label: '1小时' },
    { value: '24h', label: '24小时' },
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' }
  ];

  return (
    <div className="space-y-8">
      {/* 页面标题和控制 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">实时监控</h1>
            <p className="text-gray-300">7x24小时网站监控和告警服务</p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <label htmlFor="time-range-select" className="sr-only">
              选择时间范围
            </label>
            <select
              id="time-range-select"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="选择时间范围"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddSiteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加监控</span>
            </button>
          </div>
        </div>
      </div>

      {/* 全局统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">总站点数</p>
              <p className="text-2xl font-bold text-white">{globalStats.totalSites}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
              <Globe className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">正常运行</p>
              <p className="text-2xl font-bold text-green-400">{globalStats.upSites}</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg border border-green-500/30">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">故障站点</p>
              <p className="text-2xl font-bold text-red-400">{globalStats.downSites}</p>
            </div>
            <div className="bg-red-500/20 p-3 rounded-lg border border-red-500/30">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-yellow-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">平均响应时间</p>
              <p className="text-2xl font-bold text-white">{globalStats.avgResponseTime}ms</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-500/30">
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">总检查次数</p>
              <p className="text-2xl font-bold text-white">{(globalStats.totalChecks || 0).toLocaleString()}</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">平均可用性</p>
              <p className="text-2xl font-bold text-white">{globalStats.avgUptime}%</p>
            </div>
            <div className="bg-indigo-500/20 p-3 rounded-lg border border-indigo-500/30">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 监控站点列表 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-semibold text-white">监控站点</h2>
            </div>
            <div className="divide-y divide-gray-700/50">
              {sites.map((site) => (
                <div key={site.id} className="p-6 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(site.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white">{site.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            site.status === 'up' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            site.status === 'down' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {site.status === 'up' ? '正常' : site.status === 'down' ? '故障' : '警告'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{site.url}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                          <span>响应时间: {site.responseTime}ms</span>
                          <span>可用性: {site.uptime}%</span>
                          <span>最后检查: {site.lastCheck}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="查看详细图表"
                        aria-label="查看详细图表"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="监控设置"
                        aria-label="监控设置"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="访问网站"
                        aria-label="访问网站"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 响应时间图表占位符 */}
                  <div className="mt-4 h-16 bg-gray-700/30 rounded-lg flex items-center justify-center border border-gray-600/50">
                    <span className="text-sm text-gray-400">响应时间趋势图</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 告警和活动 */}
        <div className="space-y-6">
          {/* 活跃告警 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">活跃告警</h2>
                <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-1 rounded-full border border-red-500/30">
                  {alerts.filter(a => !a.resolved).length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-700/50">
              {alerts.filter(a => !a.resolved).map((alert) => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">{alert.siteName}</h4>
                        <span className="text-xs text-gray-400">{alert.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.filter(a => !a.resolved).length === 0 && (
                <div className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">暂无活跃告警</p>
                </div>
              )}
            </div>
          </div>

          {/* 监控节点 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-semibold text-white">监控节点</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {['北京', '上海', '广州', '深圳', '香港'].map((location, index) => (
                  <div key={location} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">{location}</span>
                    </div>
                    <span className="text-xs text-gray-400">{120 + index * 20}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-lg font-semibold text-white">快速操作</h2>
            </div>
            <div className="p-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowAddSiteModal(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加新监控</span>
              </button>
              <button type="button" className="w-full flex items-center space-x-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
                <span>告警设置</span>
              </button>
              <button type="button" className="w-full flex items-center space-x-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors">
                <BarChart3 className="w-4 h-4" />
                <span>查看报告</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 添加监控站点模态框 */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">添加监控站点</h3>
            </div>

            <form onSubmit={handleAddSite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  网站URL *
                </label>
                <input
                  type="url"
                  value={addSiteForm.url}
                  onChange={(e) => setAddSiteForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  站点名称
                </label>
                <input
                  type="text"
                  value={addSiteForm.name}
                  onChange={(e) => setAddSiteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="自动从URL提取"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="interval-select" className="block text-sm font-medium text-gray-300 mb-2">
                    检查间隔 (秒)
                  </label>
                  <select
                    id="interval-select"
                    value={addSiteForm.interval}
                    onChange={(e) => setAddSiteForm(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="选择检查间隔"
                  >
                    <option value={60}>1分钟</option>
                    <option value={300}>5分钟</option>
                    <option value={600}>10分钟</option>
                    <option value={1800}>30分钟</option>
                    <option value={3600}>1小时</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="timeout-select" className="block text-sm font-medium text-gray-300 mb-2">
                    超时时间 (毫秒)
                  </label>
                  <select
                    id="timeout-select"
                    value={addSiteForm.timeout}
                    onChange={(e) => setAddSiteForm(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="选择超时时间"
                  >
                    <option value={5000}>5秒</option>
                    <option value={10000}>10秒</option>
                    <option value={15000}>15秒</option>
                    <option value={30000}>30秒</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={addingSite}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={addingSite || !addSiteForm.url.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addingSite ? '添加中...' : '添加监控'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
