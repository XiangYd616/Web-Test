import React, { useEffect, useState } from 'react';

import { Activity, AlertTriangle, BarChart3, Copy, Edit, Eye, EyeOff, Globe, Key, Package, Plus, RefreshCw, Trash2, Webhook, Zap } from 'lucide-react';
import IntegrationService, {
  APIKey,
  IntegrationStats,
  ThirdPartyIntegration,
  // WebhookConfig
} from '../../../services/integration/integrationService.ts'; // 已修复
interface IntegrationsProps { }

const Integrations: React.FC<IntegrationsProps> = () => {
  
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
  const [activeTab, setActiveTab] = useState<'overview' | 'api-keys' | 'webhooks' | 'third-party'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 数据状态
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [thirdPartyIntegrations, setThirdPartyIntegrations] = useState<ThirdPartyIntegration[]>([]);

  // UI状态
  const [showCreateAPIKey, setShowCreateAPIKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // 获取集成数据
  const fetchIntegrationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, apiKeysData, webhooksData, integrationsData] = await Promise.all([
        IntegrationService.getIntegrationStats(),
        IntegrationService.getAPIKeys(),
        IntegrationService.getWebhooks(),
        IntegrationService.getThirdPartyIntegrations()
      ]);

      setStats(statsData);
      setApiKeys(apiKeysData);
      setWebhooks(webhooksData);
      setThirdPartyIntegrations(integrationsData);

    } catch (error) {
      console.error('Failed to fetch integration data:', error);
      setError(error instanceof Error ? error.message : '获取集成数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchIntegrationData();
  }, []);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'disconnected':
      case 'error':
      case 'failure':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'disabled':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  // 获取集成类型图标
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack': return '💬';
      case 'discord': return '🎮';
      case 'teams': return '👥';
      case 'email': return '📧';
      case 'github': return '🐙';
      case 'gitlab': return '🦊';
      case 'jenkins': return '🔧';
      case 'aws': return '☁️';
      case 'gcp': return '🌐';
      case 'azure': return '🔷';
      default: return '🔗';
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 这里可以添加成功提示
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // 切换API密钥可见性
  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  // 格式化API密钥显示
  const formatAPIKey = (key: string, isVisible: boolean) => {
    if (isVisible) {
      
        return key;
      }
    const prefix = key.substring(0, 12);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${'*'.repeat(16)}${suffix}`;
  };

  if (loading && !stats) {
    
        return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mr-3" />
          <span className="text-white text-lg">正在加载集成配置...</span>
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
            onClick={fetchIntegrationData}
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
            <Package className="w-8 h-8 text-purple-400" />
            集成配置
          </h1>
          <p className="text-gray-300">管理API密钥、Webhook和第三方服务集成</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={fetchIntegrationData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-4 border border-gray-700 backdrop-blur-sm">
        <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1">
          {[
            { id: 'overview', label: '概览', icon: BarChart3 },
            { id: 'api-keys', label: 'API密钥', icon: Key },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'third-party', label: '第三方集成', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-600/50'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 概览标签页 */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Key className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-white">{stats.activeAPIKeys}/{stats.totalAPIKeys}</span>
              </div>
              <h3 className="text-gray-300 text-sm font-medium">活跃API密钥</h3>
              <p className="text-xs text-gray-400 mt-1">今日调用: {stats.apiCallsToday.toLocaleString()}</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Webhook className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-2xl font-bold text-white">{stats.activeWebhooks}/{stats.totalWebhooks}</span>
              </div>
              <h3 className="text-gray-300 text-sm font-medium">活跃Webhooks</h3>
              <p className="text-xs text-gray-400 mt-1">今日调用: {stats.webhookCallsToday}</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-2xl font-bold text-white">{stats.activeIntegrations}/{stats.totalIntegrations}</span>
              </div>
              <h3 className="text-gray-300 text-sm font-medium">第三方集成</h3>
              <p className="text-xs text-gray-400 mt-1">已连接服务</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-2xl font-bold text-white">
                  {stats.lastActivity ? new Date(stats.lastActivity).toLocaleTimeString() : '--'}
                </span>
              </div>
              <h3 className="text-gray-300 text-sm font-medium">最后活动</h3>
              <p className="text-xs text-gray-400 mt-1">最近API调用</p>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              快速操作
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('api-keys')}
                className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-600/30"
              >
                <Key className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-white font-medium">创建API密钥</div>
                  <div className="text-gray-400 text-sm">生成新的API访问密钥</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('webhooks')}
                className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-600/30"
              >
                <Webhook className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-white font-medium">配置Webhook</div>
                  <div className="text-gray-400 text-sm">设置事件通知回调</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('third-party')}
                className="flex items-center space-x-3 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-600/30"
              >
                <Globe className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="text-white font-medium">连接服务</div>
                  <div className="text-gray-400 text-sm">集成第三方服务</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API密钥标签页 */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          {/* API密钥列表头部 */}
          <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                API密钥管理
              </h3>
              <button
                onClick={() => setShowCreateAPIKey(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>创建密钥</span>
              </button>
            </div>

            {/* API密钥列表 */}
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-600/30 rounded-lg p-4 bg-gray-700/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white mb-1">{apiKey.name}</h4>
                      <p className="text-sm text-gray-400">{apiKey.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${apiKey.isActive
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                        }`}>
                        {apiKey.isActive ? '活跃' : '禁用'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">API密钥</label>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm text-gray-300 bg-gray-800/50 px-2 py-1 rounded flex-1">
                          {formatAPIKey(apiKey.key, visibleKeys.has(apiKey.id))}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          aria-label={visibleKeys.has(apiKey.id) ? "隐藏API密钥" : "显示API密钥"}
                          title={visibleKeys.has(apiKey.id) ? "隐藏API密钥" : "显示API密钥"}
                        >
                          {visibleKeys.has(apiKey.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          aria-label="复制API密钥"
                          title="复制API密钥"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">权限</label>
                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">使用次数:</span>
                      <span className="text-white ml-1">{apiKey.usageCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">速率限制:</span>
                      <span className="text-white ml-1">{apiKey.rateLimit}/小时</span>
                    </div>
                    <div>
                      <span className="text-gray-400">创建时间:</span>
                      <span className="text-white ml-1">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">最后使用:</span>
                      <span className="text-white ml-1">
                        {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : '从未使用'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-600/30">
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title="编辑集成配置"
                      aria-label="编辑集成配置"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="删除集成配置"
                      aria-label="删除集成配置"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks标签页 */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Webhooks列表头部 */}
          <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-green-400" />
                Webhook配置
              </h3>
              <button
                onClick={() => setShowCreateWebhook(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>创建Webhook</span>
              </button>
            </div>

            {/* Webhooks列表 */}
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-gray-600/30 rounded-lg p-4 bg-gray-700/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-white mb-1">{webhook.name}</h4>
                      <p className="text-sm text-gray-400">{webhook.url}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${webhook.isActive
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                        }`}>
                        {webhook.isActive ? '活跃' : '禁用'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">监听事件</label>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">重试策略</label>
                      <div className="text-sm text-gray-300">
                        最大重试: {webhook.retryPolicy.maxRetries}次，延迟: {webhook.retryPolicy.retryDelay}ms
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">成功次数:</span>
                      <span className="text-green-400 ml-1">{webhook.successCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">失败次数:</span>
                      <span className="text-red-400 ml-1">{webhook.failureCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">超时时间:</span>
                      <span className="text-white ml-1">{webhook.timeout / 1000}秒</span>
                    </div>
                    <div>
                      <span className="text-gray-400">最后触发:</span>
                      <span className="text-white ml-1">
                        {webhook.lastTriggered ? new Date(webhook.lastTriggered).toLocaleDateString() : '从未触发'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-600/30">
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title="编辑集成配置"
                      aria-label="编辑集成配置"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="删除集成配置"
                      aria-label="删除集成配置"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 第三方集成标签页 */}
      {activeTab === 'third-party' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              第三方服务集成
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {thirdPartyIntegrations.map((integration) => (
                <div key={integration.id} className="border border-gray-600/30 rounded-lg p-4 bg-gray-700/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getIntegrationIcon(integration.type)}</span>
                      <div>
                        <h4 className="font-medium text-white">{integration.name}</h4>
                        <p className="text-xs text-gray-400">{integration.category}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}>
                      {integration.status === 'connected' ? '已连接' :
                        integration.status === 'disconnected' ? '未连接' :
                          integration.status === 'error' ? '错误' : '待处理'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">{integration.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {integration.lastSync ? `最后同步: ${new Date(integration.lastSync).toLocaleDateString()}` : '从未同步'}
                    </div>
                    <button
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${integration.isEnabled
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                      {integration.isEnabled ? '禁用' : '启用'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
