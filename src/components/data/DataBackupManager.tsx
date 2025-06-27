import React, { useState, useEffect } from 'react';
import {
  Archive,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Settings,
  HardDrive,
  Cloud,
  Shield,
  Zap,
  Plus,
  X,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { advancedDataManager, DataBackup } from '../../services/advancedDataManager';

interface DataBackupManagerProps {
  className?: string;
}

const DataBackupManager: React.FC<DataBackupManagerProps> = ({ className = '' }) => {
  const [backups, setBackups] = useState<DataBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<DataBackup | null>(null);

  const [createConfig, setCreateConfig] = useState({
    name: '',
    type: 'full' as 'full' | 'incremental' | 'differential',
    includeTypes: [] as string[],
    compression: 'gzip' as 'none' | 'gzip' | 'brotli',
    encryption: false,
    description: '',
    tags: [] as string[],
    retentionDays: 30
  });

  const dataTypes = [
    { value: 'test', label: '测试数据', icon: '🧪' },
    { value: 'user', label: '用户数据', icon: '👥' },
    { value: 'report', label: '报告数据', icon: '📊' },
    { value: 'log', label: '日志数据', icon: '📝' },
    { value: 'config', label: '配置数据', icon: '⚙️' }
  ];

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const backupList = await advancedDataManager.getBackups();
      setBackups(backupList);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backup = await advancedDataManager.createBackup({
        ...createConfig,
        tags: createConfig.tags.filter(tag => tag.trim())
      });

      setBackups(prev => [backup, ...prev]);
      setShowCreateModal(false);
      setCreateConfig({
        name: '',
        type: 'full',
        includeTypes: [],
        compression: 'gzip',
        encryption: false,
        description: '',
        tags: [],
        retentionDays: 30
      });
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('创建备份失败，请稍后重试');
    }
  };

  const handleRestoreBackup = async (backup: DataBackup) => {
    if (!confirm(`确定要恢复备份 "${backup.name}" 吗？此操作可能会覆盖现有数据。`)) {
      return;
    }

    try {
      const result = await advancedDataManager.restoreBackup(backup.id, {
        overwrite: true
      });

      alert(`恢复任务已创建，任务ID: ${result.taskId}`);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('恢复备份失败，请稍后重试');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'full':
        return <Archive className="w-5 h-5 text-blue-400" />;
      case 'incremental':
        return <Zap className="w-5 h-5 text-green-400" />;
      case 'differential':
        return <RefreshCw className="w-5 h-5 text-yellow-400" />;
      default:
        return <Archive className="w-5 h-5 text-gray-400" />;
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'cloud':
        return <Cloud className="w-4 h-4 text-blue-400" />;
      case 'local':
        return <HardDrive className="w-4 h-4 text-green-400" />;
      default:
        return <HardDrive className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Archive className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">数据备份管理</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadBackups}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>刷新</span>
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>创建备份</span>
            </button>
          </div>
        </div>
      </div>

      {/* 备份列表 */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">加载备份列表...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">暂无备份记录</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              创建第一个备份
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup) => (
              <div key={backup.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(backup.type)}
                    <div>
                      <h3 className="text-white font-medium">{backup.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          {getLocationIcon(backup.location)}
                          <span className="capitalize">{backup.location}</span>
                        </div>
                        <span>•</span>
                        <span className="capitalize">{backup.type}</span>
                        <span>•</span>
                        <span>{formatDate(backup.createdAt)}</span>
                        {backup.size && (
                          <>
                            <span>•</span>
                            <span>{formatSize(backup.size)}</span>
                          </>
                        )}
                        {backup.recordCount && (
                          <>
                            <span>•</span>
                            <span>{backup.recordCount.toLocaleString()} 条记录</span>
                          </>
                        )}
                      </div>
                      {backup.metadata.description && (
                        <p className="text-sm text-gray-300 mt-2">{backup.metadata.description}</p>
                      )}
                      {backup.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {backup.metadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getStatusIcon(backup.status)}
                    
                    {backup.status === 'completed' && (
                      <button
                        onClick={() => handleRestoreBackup(backup)}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>恢复</span>
                      </button>
                    )}
                    
                    <button
                      className="text-red-400 hover:text-red-300 p-2"
                      title="删除备份"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {backup.status === 'running' && (
                  <div className="mt-3">
                    <div className="bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300 w-1/3"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建备份模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">创建数据备份</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">备份名称</label>
                <input
                  type="text"
                  value={createConfig.name}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入备份名称"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">备份类型</label>
                <select
                  value={createConfig.type}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="full">完整备份</option>
                  <option value="incremental">增量备份</option>
                  <option value="differential">差异备份</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">包含数据类型</label>
                <div className="space-y-2">
                  {dataTypes.map((type) => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createConfig.includeTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateConfig(prev => ({
                              ...prev,
                              includeTypes: [...prev.includeTypes, type.value]
                            }));
                          } else {
                            setCreateConfig(prev => ({
                              ...prev,
                              includeTypes: prev.includeTypes.filter(t => t !== type.value)
                            }));
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="ml-2 text-sm text-gray-300">
                        {type.icon} {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">压缩方式</label>
                <select
                  value={createConfig.compression}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, compression: e.target.value as any }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">无压缩</option>
                  <option value="gzip">GZIP 压缩</option>
                  <option value="brotli">Brotli 压缩</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="encryption"
                  checked={createConfig.encryption}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, encryption: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <label htmlFor="encryption" className="ml-2 text-sm text-gray-300 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  启用加密
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">保留天数</label>
                <input
                  type="number"
                  value={createConfig.retentionDays}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                  min="1"
                  max="365"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">描述（可选）</label>
                <textarea
                  value={createConfig.description}
                  onChange={(e) => setCreateConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="备份描述信息"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={!createConfig.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建备份
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataBackupManager;
