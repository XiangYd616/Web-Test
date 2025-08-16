import { Activity, AlertTriangle, CheckCircle, Edit, ExternalLink, Filter, Globe, Pause, Play, Plus, RefreshCw, Search, Send, Shield, Trash2, Webhook, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import IntegrationService, { WebhookConfig } from '../../../services/integration/integrationService.ts';

interface WebhooksProps { }

const Webhooks: React.FC<WebhooksProps> = () => {
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateForm = (data) => {
    const errors = {};
    
    // 基础验证规则
    if (!data.name || data.name.trim() === '') {
      errors.name = '名称不能为空';
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // 提交表单
    await submitForm(formData);
  };
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 创建Webhook表单状态
  const [newWebhookForm, setNewWebhookForm] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    timeout: 30000,
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    },
    headers: {} as Record<string, string>
  });

  // 可用事件类型
  const availableEvents = [
    { id: 'test.completed', label: '测试完成', description: '当任何测试完成时触发' },
    { id: 'test.failed', label: '测试失败', description: '当测试失败时触发' },
    { id: 'alert.triggered', label: '告警触发', description: '当监控告警触发时' },
    { id: 'system.maintenance', label: '系统维护', description: '系统维护通知' },
    { id: 'quota.exceeded', label: '配额超限', description: '当使用配额超限时' },
    { id: 'user.registered', label: '用户注册', description: '新用户注册时' },
    { id: 'integration.connected', label: '集成连接', description: '第三方集成连接时' },
    { id: 'security.incident', label: '安全事件', description: '检测到安全事件时' }
  ];

  // 获取Webhook列表
  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const webhookList = await IntegrationService.getWebhooks();
      setWebhooks(webhookList);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      setError(error instanceof Error ? error.message : '获取Webhook失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchWebhooks();
  }, []);

  // 过滤Webhook
  const filteredWebhooks = webhooks.filter(webhook => {
    const matchesSearch = webhook.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      webhook.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && webhook.isActive) ||
      (filterStatus === 'inactive' && !webhook.isActive);
    return matchesSearch && matchesFilter;
  });

  // 创建Webhook
  const handleCreateWebhook = async () => {
    try {
      const newWebhook = await IntegrationService.createWebhook(newWebhookForm);
      setWebhooks(prev => [newWebhook, ...prev]);
      setShowCreateModal(false);
      setNewWebhookForm({
        name: '',
        url: '',
        events: [],
        secret: '',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        headers: {}
      });
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      // 这里可以调用测试API
      console.log('Testing webhook:', webhookId);
    } catch (error) {
      console.error('Failed to test webhook:', error);
    }
  };

  // 切换Webhook状态
  const handleToggleWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.map(webhook =>
        webhook.id === webhookId
          ? { ...webhook, isActive: !webhook.isActive }
          : webhook
      ));
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  // 删除Webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('确定要删除这个Webhook吗？此操作不可撤销。')) {
      return;
    }

    try {
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  // 获取成功率
  const getSuccessRate = (webhook: WebhookConfig) => {
    const total = webhook.successCount + webhook.failureCount;
    if (total === 0) return 0;
    return Math.round((webhook.successCount / total) * 100);
  };

  // 获取成功率颜色
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-400';
    if (rate >= 85) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading && webhooks.length === 0) {
    
        return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-green-400 animate-spin mr-3" />
          <span className="text-white text-lg">正在加载Webhook配置...</span>
        </div>
      </div>
    );
      }

  if (error) {
    
        return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
            <h3 className="text-xl font-semibold text-white">加载失败</h3>
          </div>
          <p className="text-gray-300 mb-4">{error
      }</p>
          <button
            type="button"
            onClick={fetchWebhooks}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Webhook className="w-8 h-8 text-green-400" />
            Webhook配置
          </h1>
          <p className="text-gray-300">管理事件通知和回调配置</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={fetchWebhooks}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>创建Webhook</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <Webhook className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">{webhooks.length}</span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">总Webhook数</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">{webhooks.filter(w => w.isActive).length}</span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">活跃Webhook</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">
              {webhooks.reduce((sum, webhook) => sum + webhook.successCount, 0).toLocaleString()}
            </span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">成功调用</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-red-400" />
            <span className="text-2xl font-bold text-white">
              {webhooks.reduce((sum, webhook) => sum + webhook.failureCount, 0)}
            </span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">失败调用</h3>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索Webhook名称或URL..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select aria-label="选择选项" title="请选择"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="inactive">禁用</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook列表 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Webhook列表</h3>
          <p className="text-gray-400 text-sm mt-1">共 {filteredWebhooks.length} 个Webhook</p>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredWebhooks.map((webhook) => (
            <div key={webhook.id} className="p-6 hover:bg-gray-700/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium text-white mb-1 flex items-center gap-2">
                    {webhook.name}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${webhook.isActive
                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                      }`}>
                      {webhook.isActive ? '活跃' : '禁用'}
                    </span>
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Globe className="w-4 h-4" />
                    <span className="font-mono">{webhook.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleTestWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="测试Webhook"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                    title={webhook.isActive ? '禁用' : '启用'}
                  >
                    {webhook.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {/* 编辑功能 */ }}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">监听事件</label>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20"
                      >
                        {availableEvents.find(e => e.id === event)?.label || event}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">重试策略</label>
                  <div className="text-sm text-gray-300">
                    最大重试: {webhook.retryPolicy.maxRetries}次，延迟: {webhook.retryPolicy.retryDelay}ms
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">成功率:</span>
                  <span className={`ml-1 font-medium ${getSuccessRateColor(getSuccessRate(webhook))}`}>
                    {getSuccessRate(webhook)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">成功:</span>
                  <span className="text-green-400 ml-1 font-medium">{webhook.successCount}</span>
                </div>
                <div>
                  <span className="text-gray-400">失败:</span>
                  <span className="text-red-400 ml-1 font-medium">{webhook.failureCount}</span>
                </div>
                <div>
                  <span className="text-gray-400">超时:</span>
                  <span className="text-white ml-1 font-medium">{webhook.timeout / 1000}秒</span>
                </div>
                <div>
                  <span className="text-gray-400">最后触发:</span>
                  <span className="text-white ml-1 font-medium">
                    {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleDateString() : '从未触发'}
                  </span>
                </div>
              </div>

              {webhook.secret && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">已配置签名验证</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredWebhooks.length === 0 && (
            <div className="p-12 text-center">
              <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">没有找到Webhook</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? '尝试调整搜索条件或过滤器'
                  : '创建您的第一个Webhook开始接收事件通知'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  创建Webhook
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建Webhook模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">创建Webhook</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">名称</label>
                  <input
                    type="text"
                    value={newWebhookForm.name}
                    onChange={(e) => setNewWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入Webhook名称"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">超时时间 (毫秒)</label>
                  <input
                    type="number" placeholder="请输入数字"
                    value={newWebhookForm.timeout}
                    onChange={(e) => setNewWebhookForm(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    min="1000"
                    max="300000"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                <input
                  type="url"
                  value={newWebhookForm.url}
                  onChange={(e) => setNewWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://your-domain.com/webhook"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">监听事件</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <label key={event.id} className="flex items-start space-x-2 p-2 hover:bg-gray-700/30 rounded">
                      <input
                        type="checkbox"
                        checked={newWebhookForm.events.includes(event.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhookForm(prev => ({
                              ...prev,
                              events: [...prev.events, event.id]
                            }));
                          } else {
                            setNewWebhookForm(prev => ({
                              ...prev,
                              events: prev.events.filter(e => e !== event.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500 mt-0.5"
                      />
                      <div>
                        <div className="text-gray-300 text-sm font-medium">{event.label}</div>
                        <div className="text-gray-400 text-xs">{event.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">签名密钥 (可选)</label>
                <input
                  type="password"
                  value={newWebhookForm.secret}
                  onChange={(e) => setNewWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="用于验证Webhook请求的密钥"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">重试策略</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">最大重试次数</label>
                    <input
                      type="number" placeholder="请输入数字"
                      value={newWebhookForm.retryPolicy.maxRetries}
                      onChange={(e) => setNewWebhookForm(prev => ({
                        ...prev,
                        retryPolicy: {
                          ...prev.retryPolicy,
                          maxRetries: parseInt(e.target.value) || 3
                        }
                      }))}
                      min="0"
                      max="10"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">重试延迟 (ms)</label>
                    <input
                      type="number" placeholder="请输入数字"
                      value={newWebhookForm.retryPolicy.retryDelay}
                      onChange={(e) => setNewWebhookForm(prev => ({
                        ...prev,
                        retryPolicy: {
                          ...prev.retryPolicy,
                          retryDelay: parseInt(e.target.value) || 1000
                        }
                      }))}
                      min="100"
                      max="60000"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">退避倍数</label>
                    <input
                      type="number" placeholder="请输入数字"
                      value={newWebhookForm.retryPolicy.backoffMultiplier}
                      onChange={(e) => setNewWebhookForm(prev => ({
                        ...prev,
                        retryPolicy: {
                          ...prev.retryPolicy,
                          backoffMultiplier: parseFloat(e.target.value) || 2
                        }
                      }))}
                      min="1"
                      max="5"
                      step="0.1"
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateWebhook}
                disabled={!newWebhookForm.name || !newWebhookForm.url || newWebhookForm.events.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Webhooks;
