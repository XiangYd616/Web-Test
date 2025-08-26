import { Activity, AlertTriangle, CheckCircle, Clock, Copy, Edit, Eye, EyeOff, Filter, Key, Plus, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';
import type { useEffect, useState, FC } from 'react';
import IntegrationService, { APIKey } from '../services/integrationService';

interface APIKeysProps { }

const APIKeys: React.FC<APIKeysProps> = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // 创建API密钥表单状态
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    rateLimit: 1000,
    expiresAt: ''
  });

  // 获取API密钥列表
  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const keys = await IntegrationService.getAPIKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      setError(error instanceof Error ? error.message : '获取API密钥失败');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchAPIKeys();
  }, []);

  // 过滤API密钥
  const filteredAPIKeys = apiKeys.filter(key => {
    const matchesSearch = key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && key.isActive) ||
      (filterStatus === 'inactive' && !key.isActive);
    return matchesSearch && matchesFilter;
  });

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

  // 创建API密钥
  const handleCreateAPIKey = async () => {
    try {
      const newKey = await IntegrationService.createAPIKey(newKeyForm);
      setApiKeys(prev => [newKey, ...prev]);
      setShowCreateModal(false);
      setNewKeyForm({
        name: '',
        description: '',
        permissions: [],
        rateLimit: 1000,
        expiresAt: ''
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  // 删除API密钥
  const handleDeleteAPIKey = async (keyId: string) => {
    if (!confirm('确定要删除这个API密钥吗？此操作不可撤销。')) {
      return;
    }

    try {
      await IntegrationService.deleteAPIKey(keyId);
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  // 获取权限颜色
  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'write': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'read': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  if (loading && apiKeys.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mr-3" />
          <span className="text-white text-lg">正在加载API密钥...</span>
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
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchAPIKeys}
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
            <Key className="w-8 h-8 text-blue-400" />
            API密钥管理
          </h1>
          <p className="text-gray-300">管理和监控您的API访问密钥</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={fetchAPIKeys}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            type="button">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>创建密钥</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <Key className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">{apiKeys.length}</span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">总密钥数</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-white">{apiKeys.filter(k => k.isActive).length}</span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">活跃密钥</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold text-white">
              {apiKeys.reduce((sum, key) => sum + key.usageCount, 0).toLocaleString()}
            </span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">总调用次数</h3>
        </div>

        <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">
              {apiKeys.filter(k => k.permissions.includes('admin')).length}
            </span>
          </div>
          <h3 className="text-gray-300 text-sm font-medium">管理员密钥</h3>
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
              placeholder="搜索API密钥名称或描述..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select aria-label="选择选项" title="请选择"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="inactive">禁用</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* API密钥列表 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 backdrop-blur-sm">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">API密钥列表</h3>
          <p className="text-gray-400 text-sm mt-1">共 {filteredAPIKeys.length} 个密钥</p>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredAPIKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-6 hover:bg-gray-700/20 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium text-white mb-1 flex items-center gap-2">
                    {apiKey.name}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${apiKey.isActive
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                      }`}>
                      {apiKey.isActive ? '活跃' : '禁用'}
                    </span>
                  </h4>
                  <p className="text-sm text-gray-400">{apiKey.description}</p>
                </div>

                <div className="flex items-center space-x-2">
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
                    onClick={() => handleDeleteAPIKey(apiKey.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">API密钥</label>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded flex-1 font-mono">
                      {formatAPIKey(apiKey.key, visibleKeys.has(apiKey.id))}
                    </code>
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title={visibleKeys.has(apiKey.id) ? '隐藏' : '显示'}
                    >
                      {visibleKeys.has(apiKey.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">权限</label>
                  <div className="flex flex-wrap gap-2">
                    {apiKey.permissions.map((permission) => (
                      <span
                        key={permission}
                        className={`px-2 py-1 text-xs rounded border font-medium ${getPermissionColor(permission)}`}
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
                  <span className="text-white ml-1 font-medium">{apiKey.usageCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">速率限制:</span>
                  <span className="text-white ml-1 font-medium">{apiKey.rateLimit}/小时</span>
                </div>
                <div>
                  <span className="text-gray-400">创建时间:</span>
                  <span className="text-white ml-1 font-medium">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">最后使用:</span>
                  <span className="text-white ml-1 font-medium">
                    {apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : '从未使用'}
                  </span>
                </div>
              </div>

              {apiKey.expiresAt && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      过期时间: {new Date(apiKey.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredAPIKeys.length === 0 && (
            <div className="p-12 text-center">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">没有找到API密钥</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? '尝试调整搜索条件或过滤器'
                  : '创建您的第一个API密钥开始使用'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建API密钥
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建API密钥模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">创建API密钥</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">名称</label>
                <input
                  type="text"
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入API密钥名称"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
                <textarea
                  value={newKeyForm.description}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入API密钥描述"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">权限</label>
                <div className="space-y-2">
                  {['read', 'write', 'admin'].map((permission) => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newKeyForm.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyForm(prev => ({
                              ...prev,
                              permissions: [...prev.permissions, permission]
                            }));
                          } else {
                            setNewKeyForm(prev => ({
                              ...prev,
                              permissions: prev.permissions.filter(p => p !== permission)
                            }));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">速率限制 (每小时)</label>
                <input
                  type="number" placeholder="请输入数字"
                  value={newKeyForm.rateLimit}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 1000 }))}
                  min="1"
                  max="10000"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                onClick={handleCreateAPIKey}
                disabled={!newKeyForm.name || newKeyForm.permissions.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                type="button">
                创建密钥
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIKeys;
