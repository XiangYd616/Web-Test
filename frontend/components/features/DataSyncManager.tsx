import { AlertCircle, CheckCircle, Clock, Cloud, Database, Edit, FileText, Globe, Play, Plus, RefreshCw, RotateCcw, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// 定义DataSyncConfig接口
interface DataSyncConfig {
  id: string;
  name: string;
  source: {
    type: 'database' | 'api' | 'file' | 'cloud';
    connection: string;
    credentials?: Record<string, any>;
  };
  target: {
    type: 'database' | 'api' | 'file' | 'cloud';
    connection: string;
    credentials?: Record<string, any>;
  };
  schedule: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    time?: string;
  };
  mapping: Record<string, string>;
  filters?: Record<string, any>;
  enabled: boolean;
  lastSync?: string;
  status: 'idle' | 'running' | 'success' | 'error';
  // 添加缺少的属性
  interval: number;
  conflictResolution: 'source' | 'target' | 'manual';
  retryAttempts: number;
  targets: any[];
}

interface DataSyncManagerProps {
  className?: string;
}

const DataSyncManager: React.FC<DataSyncManagerProps> = ({ className = '' }) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [syncConfig, setSyncConfig] = useState<DataSyncConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any>(null);

  const [newTarget, setNewTarget] = useState({
    name: '',
    type: 'database' as 'database' | 'api' | 'file' | 'cloud',
    endpoint: '',
    credentials: {},
    syncTypes: [] as string[]
  });

  const targetTypes = [
    { value: 'database', label: '数据库', icon: Database },
    { value: 'api', label: 'API 接口', icon: Globe },
    { value: 'file', label: '文件系统', icon: FileText },
    { value: 'cloud', label: '云存储', icon: Cloud }
  ];

  const syncTypes = [
    { value: 'test', label: '测试数据' },
    { value: 'user', label: '用户数据' },
    { value: 'report', label: '报告数据' },
    { value: 'log', label: '日志数据' },
    { value: 'config', label: '配置数据' }
  ];

  useEffect(() => {
    loadSyncConfig();
  }, []);

  const loadSyncConfig = async () => {
    setLoading(true);
    try {
      // 模拟获取同步配置，因为服务中没有这个方法
      const config: DataSyncConfig = {
        id: 'default-sync',
        name: '默认同步配置',
        source: {
          type: 'database',
          connection: 'local'
        },
        target: {
          type: 'cloud',
          connection: 'remote'
        },
        schedule: {
          enabled: false,
          frequency: 'hourly'
        },
        mapping: {},
        enabled: false,
        interval: 60,
        conflictResolution: 'source',
        retryAttempts: 3,
        targets: [],
        status: 'idle'
      };
      setSyncConfig(config);
    } catch (error) {
      console.error('Failed to load sync config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (updates: Partial<DataSyncConfig>) => {
    if (!syncConfig) return;

    try {
      // 模拟更新配置，因为服务中没有这个方法
      const updatedConfig = {
        ...syncConfig,
        ...updates
      };
      setSyncConfig(updatedConfig);
      console.log('Sync config updated:', updatedConfig);
    } catch (error) {
      console.error('Failed to update sync config:', error);
      alert('更新配置失败，请稍后重试');
    }
  };

  const handleAddTarget = async () => {
    if (!syncConfig || !newTarget.name.trim() || !newTarget.endpoint.trim()) {
      alert('请填写完整的目标信息');
      return;
    }

    try {
      const target = {
        id: Date.now().toString(),
        ...newTarget,
        lastSync: undefined as string | undefined,
        status: 'inactive' as const
      };

      await handleUpdateConfig({
        targets: [...syncConfig.targets, target]
      });

      setShowAddTargetModal(false);
      setNewTarget({
        name: '',
        type: 'database',
        endpoint: '',
        credentials: {},
        syncTypes: []
      });
    } catch (error) {
      console.error('Failed to add sync target:', error);
      alert('添加同步目标失败，请稍后重试');
    }
  };

  const handleRemoveTarget = async (targetId: string) => {
    if (!syncConfig) return;

    if (!confirm('确定要删除这个同步目标吗？')) {
      return;
    }

    try {
      await handleUpdateConfig({
        targets: syncConfig.targets.filter(t => t.id !== targetId)
      });
    } catch (error) {
      console.error('Failed to remove sync target:', error);
      alert('删除同步目标失败，请稍后重试');
    }
  };

  const handleTriggerSync = async (targetId?: string) => {
    try {
      // 模拟触发同步，因为服务中没有这个方法
      const taskId = `sync_${Date.now()}`;
      console.log('Sync triggered:', { targetId, taskId });
      alert(`同步任务已启动，任务ID: ${taskId}`);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      alert('启动同步失败，请稍后重试');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'inactive':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const typeObj = targetTypes.find(t => t.value === type);
    const IconComponent = typeObj ? typeObj.icon : Database;
    return <IconComponent className="w-5 h-5 text-blue-400" />;
  };

  if (loading) {
    
        return (
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className
      }`}>
        <div className="p-6 text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">加载同步配置...</p>
        </div>
      </div>
    );
  }

  if (!syncConfig) {
    
        return (
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className
      }`}>
        <div className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400">加载同步配置失败</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RotateCcw className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">数据同步管理</h2>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">同步状态:</span>
              {syncConfig.enabled ? (
                <div className="flex items-center space-x-1 text-green-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">已启用</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">已禁用</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleUpdateConfig({ enabled: !syncConfig.enabled })}
              className={`px-3 py-2 rounded-lg transition-colors ${syncConfig.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
            >
              {syncConfig.enabled ? '禁用同步' : '启用同步'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 全局配置 */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">全局配置</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sync-interval-input" className="block text-sm font-medium text-gray-300 mb-2">同步间隔（分钟）</label>
              <input
                id="sync-interval-input"
                type="number"
                value={syncConfig.interval}
                onChange={(e) => handleUpdateConfig({ interval: parseInt(e.target.value) || 60 })}
                min="1"
                max="1440"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="设置同步间隔时间"
              />
            </div>

            <div>
              <label htmlFor="conflict-resolution-select" className="block text-sm font-medium text-gray-300 mb-2">冲突解决策略</label>
              <select
                id="conflict-resolution-select"
                value={syncConfig.conflictResolution}
                onChange={(e) => handleUpdateConfig({ conflictResolution: e.target.value as any })}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="选择冲突解决策略"
              >
                <option value="local">本地优先</option>
                <option value="remote">远程优先</option>
                <option value="manual">手动解决</option>
              </select>
            </div>

            <div>
              <label htmlFor="retry-attempts-input" className="block text-sm font-medium text-gray-300 mb-2">重试次数</label>
              <input
                id="retry-attempts-input"
                type="number"
                value={syncConfig.retryAttempts}
                onChange={(e) => handleUpdateConfig({ retryAttempts: parseInt(e.target.value) || 3 })}
                min="0"
                max="10"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="设置重试次数"
              />
            </div>
          </div>
        </div>

        {/* 同步目标 */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">同步目标</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleTriggerSync()}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>全部同步</span>
              </button>
              <button
                onClick={() => setShowAddTargetModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加目标</span>
              </button>
            </div>
          </div>

          {syncConfig.targets.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">暂无同步目标</p>
              <button
                onClick={() => setShowAddTargetModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                添加第一个同步目标
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {syncConfig.targets.map((target) => (
                <div key={target.id} className="bg-gray-600/30 rounded-lg p-4 border border-gray-600/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getTypeIcon(target.type)}
                      <div>
                        <h4 className="text-white font-medium">{target.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span className="capitalize">{target.type}</span>
                          <span>•</span>
                          <span>{target.endpoint}</span>
                          {target.lastSync && (
                            <>
                              <span>•</span>
                              <span>上次同步: {new Date(target.lastSync).toLocaleString('zh-CN')}</span>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {target.syncTypes.map((type: any, index: number) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded"
                            >
                              {syncTypes.find((t: any) => t.value === type)?.label || type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {getStatusIcon(target.status)}

                      <button
                        onClick={() => handleTriggerSync(target.id)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="立即同步"
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setEditingTarget(target)}
                        className="text-green-400 hover:text-green-300 p-1"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveTarget(target.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 添加目标模态框 */}
      {showAddTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">添加同步目标</h3>
              <button
                type="button"
                onClick={() => setShowAddTargetModal(false)}
                className="text-gray-400 hover:text-gray-300"
                aria-label="关闭添加目标对话框"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">目标名称</label>
                <input
                  type="text"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入目标名称"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="target-type-select" className="block text-sm font-medium text-gray-300 mb-2">目标类型</label>
                <select
                  id="target-type-select"
                  value={newTarget.type}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="选择目标类型"
                >
                  {targetTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">连接地址</label>
                <input
                  type="text"
                  value={newTarget.endpoint}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="输入连接地址或URL"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">同步数据类型</label>
                <div className="space-y-2">
                  {syncTypes.map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newTarget.syncTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTarget(prev => ({
                              ...prev,
                              syncTypes: [...prev.syncTypes, type.value]
                            }));
                          } else {
                            setNewTarget(prev => ({
                              ...prev,
                              syncTypes: prev.syncTypes.filter(t => t !== type.value)
                            }));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="ml-2 text-sm text-gray-300">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddTargetModal(false)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddTarget}
                disabled={!newTarget.name.trim() || !newTarget.endpoint.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加目标
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSyncManager;
