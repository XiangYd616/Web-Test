import React, { useState, useEffect } from 'react';

import { Database, Download, Upload, Trash2, RefreshCw, HardDrive, CheckCircle, XCircle, Clock, Settings, Pause, AlertTriangle, FileText, Archive, Shield } from 'lucide-react';

interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'completed' | 'failed' | 'in_progress';
  size: number;
  createdAt: string;
  duration: number;
  location: string;
  description?: string;
  checksum?: string;
  compressed: boolean;
  encrypted: boolean;
}

interface BackupConfig {
  enabled: boolean;
  schedule: string;
  type: 'full' | 'incremental' | 'differential';
  retentionDays: number;
  compression: boolean;
  encryption: boolean;
  location: 'local' | 'cloud' | 's3';
  maxBackups: number;
  autoCleanup: boolean;
}

const BackupManagement: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    schedule: '0 2 * * *',
    type: 'full',
    retentionDays: 30,
    compression: true,
    encryption: true,
    location: 'local',
    maxBackups: 10,
    autoCleanup: true
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    loadBackups();
    loadConfig();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups');
      if (response.ok) {
        const data = await response.json();
        setBackups(data.data || []);
      } else {
        // 使用模拟数据
        setBackups(getMockBackups());
      }
    } catch (error) {
      console.error('加载备份记录失败:', error);
      setBackups(getMockBackups());
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/backup-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.data || config);
      }
    } catch (error) {
      console.error('加载备份配置失败:', error);
    }
  };

  const getMockBackups = (): BackupRecord[] => [
    {
      id: '1',
      name: 'daily-backup-2025-06-19',
      type: 'full',
      status: 'completed',
      size: 2.3 * 1024 * 1024 * 1024, // 2.3GB
      createdAt: '2025-06-19 02:00:00',
      duration: 180,
      location: '/backups/daily-backup-2025-06-19.sql.gz',
      description: '每日自动全量备份',
      checksum: 'sha256:a1b2c3d4e5f6...',
      compressed: true,
      encrypted: true
    },
    {
      id: '2',
      name: 'manual-backup-2025-06-18',
      type: 'full',
      status: 'completed',
      size: 2.1 * 1024 * 1024 * 1024, // 2.1GB
      createdAt: '2025-06-18 15:30:00',
      duration: 165,
      location: '/backups/manual-backup-2025-06-18.sql.gz',
      description: '手动创建的全量备份',
      checksum: 'sha256:b2c3d4e5f6a1...',
      compressed: true,
      encrypted: true
    },
    {
      id: '3',
      name: 'daily-backup-2025-06-18',
      type: 'full',
      status: 'completed',
      size: 2.2 * 1024 * 1024 * 1024, // 2.2GB
      createdAt: '2025-06-18 02:00:00',
      duration: 175,
      location: '/backups/daily-backup-2025-06-18.sql.gz',
      description: '每日自动全量备份',
      checksum: 'sha256:c3d4e5f6a1b2...',
      compressed: true,
      encrypted: true
    },
    {
      id: '4',
      name: 'daily-backup-2025-06-17',
      type: 'full',
      status: 'failed',
      size: 0,
      createdAt: '2025-06-17 02:00:00',
      duration: 30,
      location: '',
      description: '备份失败：磁盘空间不足',
      compressed: true,
      encrypted: true
    },
    {
      id: '5',
      name: 'incremental-backup-2025-06-16',
      type: 'incremental',
      status: 'completed',
      size: 150 * 1024 * 1024, // 150MB
      createdAt: '2025-06-16 14:00:00',
      duration: 45,
      location: '/backups/incremental-backup-2025-06-16.sql.gz',
      description: '增量备份',
      checksum: 'sha256:d4e5f6a1b2c3...',
      compressed: true,
      encrypted: true
    }
  ];

  const createBackup = async (type: 'full' | 'incremental' = 'full') => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: `手动创建的${type === 'full' ? '全量' : '增量'}备份` })
      });

      if (response.ok) {
        // 刷新备份列表
        loadBackups();
      }
    } catch (error) {
      console.error('创建备份失败:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('确定要删除这个备份吗？此操作不可恢复。')) return;

    try {
      const response = await fetch(`/api/admin/backups/${backupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setBackups(backups.filter(backup => backup.id !== backupId));
      }
    } catch (error) {
      console.error('删除备份失败:', error);
    }
  };

  const downloadBackup = async (backup: BackupRecord) => {
    try {
      const response = await fetch(`/api/admin/backups/${backup.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.name + '.sql.gz';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('下载备份失败:', error);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('确定要恢复这个备份吗？这将覆盖当前数据库。')) return;

    try {
      const response = await fetch(`/api/admin/backups/${backupId}/restore`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('备份恢复成功！');
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
    }
  };

  const updateConfig = async (newConfig: BackupConfig) => {
    try {
      const response = await fetch('/api/admin/backup-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        setConfig(newConfig);
        setShowConfig(false);
      }
    } catch (error) {
      console.error('更新备份配置失败:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'full': return <Database className="w-4 h-4 text-blue-500" />;
      case 'incremental': return <Archive className="w-4 h-4 text-green-500" />;
      case 'differential': return <FileText className="w-4 h-4 text-yellow-500" />;
      default: return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const completedBackups = backups.filter(b => b.status === 'completed');
  const totalSize = completedBackups.reduce((sum, backup) => sum + backup.size, 0);
  const failedBackups = backups.filter(b => b.status === 'failed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">加载备份数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 dark-page-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题区域 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Database className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">备份管理</h1>
                <p className="text-gray-300 mt-1">管理数据库备份和恢复</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700/50 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-600/50 hover:text-white transition-all duration-200 shadow-lg"
              >
                <Settings className="w-4 h-4" />
                备份设置
              </button>
              <button
                type="button"
                onClick={() => createBackup('incremental')}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-green-500/25 disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                增量备份
              </button>
              <button
                type="button"
                onClick={() => createBackup('full')}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {creating ? '创建中...' : '立即备份'}
              </button>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">总备份数</p>
                <p className="text-2xl font-bold text-white">{backups.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Database className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-green-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">成功备份</p>
                <p className="text-2xl font-bold text-green-400">{completedBackups.length}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">总大小</p>
                <p className="text-2xl font-bold text-blue-400">{formatSize(totalSize)}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <HardDrive className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6 hover:shadow-2xl hover:border-red-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">失败备份</p>
                <p className="text-2xl font-bold text-red-400">{failedBackups}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* 备份状态 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">备份状态</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  自动备份: <span className={config.enabled ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {config.enabled ? '已启用' : '已禁用'}
                  </span>
                </span>
                <span className="text-gray-500">|</span>
                <span>调度: <span className="font-mono bg-gray-700/50 px-2 py-0.5 rounded border border-gray-600/50">{config.schedule}</span></span>
                <span className="text-gray-500">|</span>
                <span>保留期: <span className="font-medium">{config.retentionDays}天</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config.enabled ? (
                <span className="flex items-center gap-2 text-green-400 bg-green-500/20 px-3 py-1.5 rounded-lg border border-green-500/30">
                  <CheckCircle className="w-4 h-4" />
                  运行中
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-400 bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30">
                  <Pause className="w-4 h-4" />
                  已暂停
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 备份列表 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50">
          <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">备份记录</h2>
            <button
              type="button"
              onClick={loadBackups}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 hover:text-white transition-colors duration-150 border border-gray-600/50"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>

          <div className="overflow-x-auto dark-table-scrollbar">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-700/50 to-gray-600/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    备份信息
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    持续时间
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700/50">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-6 py-5">
                      <div>
                        <div className="text-sm font-semibold text-white">{backup.name}</div>
                        <div className="text-sm text-gray-400 mt-1">{backup.description}</div>
                        {backup.checksum && (
                          <div className="text-xs text-gray-500 font-mono mt-1 bg-gray-700/50 px-2 py-1 rounded border border-gray-600/50">
                            {backup.checksum.substring(0, 20)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getTypeIcon(backup.type)}
                        </div>
                        <span className="text-sm text-gray-300 capitalize font-medium">
                          {backup.type === 'full' ? '全量' :
                           backup.type === 'incremental' ? '增量' : '差异'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {backup.compressed && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                            <Archive className="w-3 h-3" />
                            压缩
                          </span>
                        )}
                        {backup.encrypted && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                            <Shield className="w-3 h-3" />
                            加密
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-700/50 rounded-lg border border-gray-600/50">
                          {getStatusIcon(backup.status)}
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          backup.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          backup.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {backup.status === 'completed' ? '完成' :
                           backup.status === 'failed' ? '失败' : '进行中'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-300 font-medium">
                      {formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-300 font-mono">
                      {backup.createdAt}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-300 font-medium">
                      {backup.duration}秒
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {backup.status === 'completed' && (
                          <>
                            <button
                              type="button"
                              onClick={() => downloadBackup(backup)}
                              className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors duration-150 border border-transparent hover:border-blue-500/30"
                              title="下载备份"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => restoreBackup(backup.id)}
                              className="p-2 rounded-lg hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-colors duration-150 border border-transparent hover:border-green-500/30"
                              title="恢复备份"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteBackup(backup.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors duration-150 border border-transparent hover:border-red-500/30"
                          title="删除备份"
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
        </div>
      </div>
    </div>
  );
};

export default BackupManagement;
