/**
 * 告警管理组件
 * 提供告警查看、管理和配置功能
 */

import { apiClient } from '@/services/api/client';
import Logger from '@/utils/logger';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface Alert {
  id: string;
  site_name: string;
  site_url: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  details: any;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by_username?: string;
}

interface AlertStats {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  timeRange: string;
}

interface AlertRules {
  enabled: boolean;
  thresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  notifications: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
    webhook_url?: string;
    slack_webhook?: string;
  };
  cooldown: number;
}

interface AlertManagerProps {
  className?: string;
}

const AlertManager: React.FC<AlertManagerProps> = ({ className = '' }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRules | null>(null);

  // 过滤和搜索状态
  const [filters, setFilters] = useState({
    severity: '',
    status: 'active',
    timeRange: '24h',
    search: '',
  });

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 获取告警列表
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);

      // 在开发环境下检查后端是否可用
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        // 使用模拟数据
        setAlerts([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0,
        }));
        return;
      }

      const params = new URLSearchParams({
        page: pagination?.page.toString(),
        limit: pagination?.limit.toString(),
        status: filters.status,
        timeRange: filters.timeRange,
        ...(filters.severity && { severity: filters.severity }),
      });

      const response = await apiClient.get('/v1/alerts', { params: filters });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('获取告警列表失败');
      }

      const data = await response.json();
      setAlerts(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }));
    } catch (err) {
      // 静默处理错误，使用空数据
      setAlerts([]);
      if (err instanceof Error && err.name !== 'AbortError') {
        Logger.info('告警数据获取失败，使用空数据');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination?.page, pagination?.limit, filters]);

  // 获取告警统计
  const fetchStats = useCallback(async () => {
    try {
      // 在开发环境下使用模拟数据
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        setStats({
          totalAlerts: 0,
          criticalAlerts: 0,
          highAlerts: 0,
          mediumAlerts: 0,
          lowAlerts: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
          timeRange: '24h',
        });
        return;
      }

      const response = await apiClient.get('/v1/alerts/stats', {
        params: { timeRange: filters.timeRange },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('获取告警统计失败');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      // 静默处理错误，使用默认数据
      setStats({
        totalAlerts: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        timeRange: '24h',
      });
      if (err instanceof Error && err.name !== 'AbortError') {
        Logger.info('告警统计获取失败，使用默认数据');
      }
    }
  }, [filters.timeRange]);

  // 获取告警规则
  const fetchAlertRules = useCallback(async () => {
    try {
      // 在开发环境下使用模拟数据
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        setAlertRules({
          enabled: false,
          thresholds: {
            critical: 90,
            high: 80,
            medium: 70,
          },
          notifications: {
            email: false,
            webhook: false,
            slack: false,
          },
          cooldown: 300,
        });
        return;
      }

      const response = await apiClient.get('/v1/alerts/rules');

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('获取告警规则失败');
      }

      const data = await response.json();
      setAlertRules(data.data);
    } catch (err) {
      // 静默处理错误，使用空数据
      setAlertRules({
        enabled: false,
        thresholds: {
          critical: 90,
          high: 80,
          medium: 70,
        },
        notifications: {
          email: false,
          webhook: false,
          slack: false,
        },
        cooldown: 300,
      });
      if (err instanceof Error && err.name !== 'AbortError') {
        Logger.info('告警规则获取失败，使用空数据');
      }
    }
  }, []);

  // 确认告警
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await apiClient.put(`/v1/alerts/${alertId}/acknowledge`);

      if (!response.ok) {
        throw new Error('确认告警失败');
      }

      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认告警失败');
    }
  };

  // 解决告警
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await apiClient.put(`/v1/alerts/${alertId}/resolve`);

      if (!response.ok) {
        throw new Error('解决告警失败');
      }

      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解决告警失败');
    }
  };

  // 删除告警
  const deleteAlert = async (alertId: string) => {
    try {
      const response = await apiClient.delete(`/v1/alerts/${alertId}`);

      if (!response.ok) {
        throw new Error('删除告警失败');
      }

      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除告警失败');
    }
  };

  // 批量操作
  const batchAction = async (action: 'acknowledge' | 'resolve' | 'delete') => {
    if (selectedAlerts.length === 0) return;

    try {
      const response = await apiClient.post('/v1/alerts/batch', {
        action,
        alertIds: selectedAlerts,
      });

      if (!response.ok) {
        throw new Error(`批量${action}操作失败`);
      }

      setSelectedAlerts([]);
      await fetchAlerts();
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : `批量${action}操作失败`);
    }
  };

  // 更新告警规则
  const updateAlertRules = async (rules: AlertRules) => {
    try {
      const response = await apiClient.put('/v1/alerts/rules', rules);

      if (!response.ok) {
        throw new Error('更新告警规则失败');
      }

      setAlertRules(rules);
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新告警规则失败');
    }
  };

  // 测试通知配置
  const testNotification = async (config: any) => {
    try {
      const response = await apiClient.post('/v1/alerts/test-notification', config);

      const data = await response.json();

      if (data.success) {
        alert('测试通知发送成功！');
      } else {
        alert(`测试通知发送失败: ${data.message}`);
      }
    } catch (err) {
      alert('测试通知发送失败');
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchStats();
    fetchAlertRules();
  }, [fetchAlerts, fetchStats, fetchAlertRules]);

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100',
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-red-600 bg-red-100',
      acknowledged: 'text-yellow-600 bg-yellow-100',
      resolved: 'text-green-600 bg-green-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  if (loading && alerts.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">加载告警数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">告警管理</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            设置
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">严重告警</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.criticalAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">高级告警</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.highAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">活跃告警</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">已解决</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.resolvedAlerts}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 过滤和搜索 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e?.target.value }))}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="active">活跃</option>
              <option value="acknowledged">已确认</option>
              <option value="resolved">已解决</option>
            </select>
          </div>

          <select
            value={filters.severity}
            onChange={e => setFilters(prev => ({ ...prev, severity: e?.target.value }))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">所有严重程度</option>
            <option value="critical">严重</option>
            <option value="high">高级</option>
            <option value="medium">中级</option>
            <option value="low">低级</option>
          </select>

          <select
            value={filters.timeRange}
            onChange={e => setFilters(prev => ({ ...prev, timeRange: e?.target.value }))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="1h">最近1小时</option>
            <option value="24h">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>

          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索告警..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e?.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* 批量操作 */}
      {selectedAlerts.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-700">已选择 {selectedAlerts.length} 个告警</span>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => batchAction('acknowledge')}>
                批量确认
              </Button>
              <Button size="sm" variant="outline" onClick={() => batchAction('resolve')}>
                批量解决
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => batchAction('delete')}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                批量删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 告警列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无告警数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAlerts.length === alerts?.length}
                      /**

                                                 * if功能函数

                                                 * @param {Object} params - 参数对象

                                                 * @returns {Promise<Object>} 返回结果

                                                 */
                      onChange={e => {
                        if (e?.target.checked) {
                          setSelectedAlerts(alerts?.map(alert => alert.id));
                        } else {
                          setSelectedAlerts([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    站点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    严重程度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    消息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts?.map(alert => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAlerts.includes(alert.id)}
                        /**

                                                     * if功能函数

                                                     * @param {Object} params - 参数对象

                                                     * @returns {Promise<Object>} 返回结果

                                                     */
                        onChange={e => {
                          if (e?.target.checked) {
                            setSelectedAlerts(prev => [...prev, alert.id]);
                          } else {
                            setSelectedAlerts(prev => prev.filter(id => id !== alert.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{alert.site_name}</div>
                        <div className="text-sm text-gray-500">{alert.site_url}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}
                      >
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}
                      >
                        {alert.status === 'active'
                          ? '活跃'
                          : alert.status === 'acknowledged'
                            ? '已确认'
                            : '已解决'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{alert.message}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        <div>{formatTime(alert.created_at)}</div>
                        {alert.acknowledged_at && (
                          <div className="text-xs text-gray-400">
                            确认: {formatTime(alert.acknowledged_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowDetails(alert.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="查看详情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {alert.status === 'active' && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="确认告警"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        )}
                        {alert.status !== 'resolved' && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="text-green-600 hover:text-green-800"
                            title="解决告警"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除告警"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* 分页 */}
      {pagination?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {(pagination?.page - 1) * pagination?.limit + 1} 到{' '}
            {Math.min(pagination?.page * pagination?.limit, pagination?.total)} 条， 共{' '}
            {pagination?.total} 条
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination?.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-700">
              第 {pagination?.page} 页，共 {pagination?.totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination?.page >= pagination?.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 告警设置模态框 */}
      {showSettings && alertRules && (
        <AlertSettingsModal
          rules={alertRules}
          onSave={updateAlertRules}
          onClose={() => setShowSettings(false)}
          onTestNotification={testNotification}
        />
      )}

      {/* 告警详情模态框 */}
      {showDetails && (
        <AlertDetailsModal alertId={showDetails} onClose={() => setShowDetails(null)} />
      )}
    </div>
  );
};

// 告警设置模态框组件
interface AlertSettingsModalProps {
  rules: AlertRules;
  onSave: (rules: AlertRules) => void;
  onClose: () => void;
  onTestNotification: (config: any) => void;
}

const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  rules,
  onSave,
  onClose,
  onTestNotification,
}) => {
  /**


     * 处理handleSubmit事件


     * @param {Object} event - 事件对象


     * @returns {Promise<void>}


     */
  const [formData, setFormData] = useState<AlertRules>(rules);

  const handleSubmit = (e: React.FormEvent) => {
    e?.preventDefault();
    onSave(formData);
  };

  const handleTestNotification = () => {
    onTestNotification({
      email: formData.notifications.email,
      webhook: formData.notifications.webhook,
      slack: formData.notifications.slack,
      webhook_url: formData.notifications.webhook_url,
      slack_webhook: formData.notifications.slack_webhook,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="告警设置">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本设置 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本设置</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={e => setFormData(prev => ({ ...prev, enabled: e?.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                启用告警系统
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                告警冷却时间（分钟）
              </label>
              <Input
                type="number"
                value={formData.cooldown / 60000}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    cooldown: parseInt(e?.target.value) * 60000,
                  }))
                }
                min="1"
                max="60"
              />
            </div>
          </div>
        </div>

        {/* 告警阈值 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">告警阈值</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                中级告警（连续失败次数）
              </label>
              <Input
                type="number"
                value={formData.thresholds.medium}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    thresholds: { ...prev.thresholds, medium: parseInt(e?.target.value) },
                  }))
                }
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                高级告警（连续失败次数）
              </label>
              <Input
                type="number"
                value={formData.thresholds.high}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    thresholds: { ...prev.thresholds, high: parseInt(e?.target.value) },
                  }))
                }
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                严重告警（连续失败次数）
              </label>
              <Input
                type="number"
                value={formData.thresholds.critical}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    thresholds: { ...prev.thresholds, critical: parseInt(e?.target.value) },
                  }))
                }
                min="1"
                max="10"
              />
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">通知设置</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="email"
                checked={formData.notifications.email}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: e?.target.checked },
                  }))
                }
                className="rounded border-gray-300"
              />
              <Mail className="h-4 w-4 ml-2 mr-1 text-gray-500" />
              <label htmlFor="email" className="text-sm text-gray-700">
                邮件通知
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="webhook"
                  checked={formData.notifications.webhook}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, webhook: e?.target.checked },
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <Webhook className="h-4 w-4 ml-2 mr-1 text-gray-500" />
                <label htmlFor="webhook" className="text-sm text-gray-700">
                  Webhook通知
                </label>
              </div>
              {formData.notifications.webhook && (
                <Input
                  placeholder="Webhook URL"
                  value={formData.notifications.webhook_url || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, webhook_url: e?.target.value },
                    }))
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="slack"
                  checked={formData.notifications.slack}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, slack: e?.target.checked },
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <MessageSquare className="h-4 w-4 ml-2 mr-1 text-gray-500" />
                <label htmlFor="slack" className="text-sm text-gray-700">
                  Slack通知
                </label>
              </div>
              {formData.notifications.slack && (
                <Input
                  placeholder="Slack Webhook URL"
                  value={formData.notifications.slack_webhook || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, slack_webhook: e?.target.value },
                    }))
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={handleTestNotification}>
            测试通知
          </Button>
          <div className="flex items-center space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">保存设置</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// 告警详情模态框组件
interface AlertDetailsModalProps {
  alertId: string;
  onClose: () => void;
}

const AlertDetailsModal: React.FC<AlertDetailsModalProps> = ({ alertId, onClose }) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlertDetails = async () => {
      try {
        const response = await apiClient.get(`/v1/alerts/${alertId}`);

        if (!response.ok) {
          throw new Error('获取告警详情失败');
        }

        const data = await response.json();
        setAlert(data.data);
      } catch (err) {
        Logger.error('获取告警详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertDetails();
  }, [alertId]);

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="告警详情">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">加载中...</span>
        </div>
      </Modal>
    );
  }

  if (!alert) {
    return (
      <Modal isOpen={true} onClose={onClose} title="告警详情">
        <div className="text-center py-8">
          <p className="text-gray-500">告警详情不存在</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="告警详情">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">站点名称</label>
            <p className="text-sm text-gray-900">{alert.site_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">站点URL</label>
            <p className="text-sm text-gray-900 break-all">{alert.site_url}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">告警类型</label>
            <p className="text-sm text-gray-900">{alert.alert_type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}
            >
              {alert.severity.toUpperCase()}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}
            >
              {alert.status === 'active'
                ? '活跃'
                : alert.status === 'acknowledged'
                  ? '已确认'
                  : '已解决'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
            <p className="text-sm text-gray-900">{formatTime(alert.created_at)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">告警消息</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{alert.message}</p>
        </div>

        {alert.details && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">详细信息</label>
            <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(alert.details, null, 2)}
            </pre>
          </div>
        )}

        {alert.acknowledged_at && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">确认信息</label>
            <p className="text-sm text-gray-900">
              确认时间: {formatTime(alert.acknowledged_at)}
              {alert.acknowledged_by_username && (
                <span className="ml-2">确认人: {alert.acknowledged_by_username}</span>
              )}
            </p>
          </div>
        )}

        {alert.resolved_at && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">解决时间</label>
            <p className="text-sm text-gray-900">{formatTime(alert.resolved_at)}</p>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </div>
    </Modal>
  );
};

// 辅助函数
const getSeverityColor = (severity: string) => {
  const colors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
  };
  return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-100';
};

const getStatusColor = (status: string) => {
  const colors = {
    active: 'text-red-600 bg-red-100',
    acknowledged: 'text-yellow-600 bg-yellow-100',
    resolved: 'text-green-600 bg-green-100',
  };
  return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleString('zh-CN');
};

export default AlertManager;
