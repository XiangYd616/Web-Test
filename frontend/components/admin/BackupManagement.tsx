/**
 * BackupManagement.tsx - React组件
 * 
 * 文件路径: frontend\components\admin\BackupManagement.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { useState } from 'react';

import { AlertTriangle, Calendar, Database, Download, HardDrive, RefreshCw, Upload } from 'lucide-react';

interface BackupRecord {
  id: string;
  name: string;
  type: 'auto' | 'manual';
  size: number;
  createdAt: string;
  status: 'completed' | 'in_progress' | 'failed';
  description?: string;
}

const BackupManagement: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([
    {
      id: '1',
      name: 'daily_backup_20250115',
      type: 'auto',
      size: 1024 * 1024 * 45, // 45MB
      createdAt: '2025-01-15 02:00:00',
      status: 'completed',
      description: '每日自动备份'
    },
    {
      id: '2',
      name: 'manual_backup_20250114',
      type: 'manual',
      size: 1024 * 1024 * 42, // 42MB
      createdAt: '2025-01-14 16:30:00',
      status: 'completed',
      description: '手动备份 - 系统更新前'
    },
    {
      id: '3',
      name: 'weekly_backup_20250113',
      type: 'auto',
      size: 1024 * 1024 * 48, // 48MB
      createdAt: '2025-01-13 03:00:00',
      status: 'completed',
      description: '每周自动备份'
    },
    {
      id: '4',
      name: 'backup_in_progress',
      type: 'manual',
      size: 0,
      createdAt: '2025-01-15 14:00:00',
      status: 'in_progress',
      description: '正在进行的备份'
    }
  ]);

  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupInterval: 'daily',
    retentionDays: 30,
    maxBackups: 10
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'auto': return 'bg-blue-100 text-blue-800';
      case 'manual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);

    // 模拟备份创建过程
    setTimeout(() => {
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        name: `manual_backup_${new Date().toISOString().split('T')[0]?.replace(/-/g, '') || new Date().getFullYear() + (new Date().getMonth() + 1).toString().padStart(2, '0') + new Date().getDate().toString().padStart(2, '0')}`,
        type: 'manual',
        size: Math.floor(Math.random() * 50 * 1024 * 1024), // 随机大小
        createdAt: new Date().toLocaleString('zh-CN'),
        status: 'completed',
        description: '手动创建的备份'
      };

      setBackups(prev => [newBackup, ...prev]);
      setIsCreatingBackup(false);
    }, 3000);
  };

  const handleDownloadBackup = (backup: BackupRecord) => {
    // 模拟下载
    alert(`开始下载备份: ${backup.name}`);
  };

  const handleDeleteBackup = (backupId: string) => {
    if (confirm('确定要删除这个备份吗？此操作不可恢复。')) {
      setBackups(prev => prev.filter(backup => backup.id !== backupId));
    }
  };

  const handleRestoreBackup = (backup: BackupRecord) => {
    if (confirm(`确定要恢复到备份 "${backup.name}" 吗？这将覆盖当前数据。`)) {
      alert('恢复功能正在开发中...');
    }
  };

  const totalBackups = backups.length;
  const completedBackups = backups.filter(b => b.status === 'completed').length;
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
  const inProgressBackups = backups.filter(b => b.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">备份管理</h2>
        </div>
        <button
          type="button"
          onClick={handleCreateBackup}
          disabled={isCreatingBackup}
          className={`btn btn-primary flex items-center space-x-2 ${isCreatingBackup ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {isCreatingBackup ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          <span>{isCreatingBackup ? '创建中...' : '创建备份'}</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总备份数</p>
              <p className="text-2xl font-bold text-gray-900">{totalBackups}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{completedBackups}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总大小</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <RefreshCw className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">进行中</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressBackups}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 备份设置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">备份设置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={backupSettings.autoBackup}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">启用自动备份</span>
            </label>
          </div>

          <div>
            <label htmlFor="backup-interval-select" className="block text-sm font-medium text-gray-700 mb-2">备份频率</label>
            <select
              id="backup-interval-select"
              value={backupSettings.backupInterval}
              onChange={(e) => setBackupSettings(prev => ({ ...prev, backupInterval: e.target.value }))}
              className="input"
              aria-label="选择备份频率"
            >
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>

          <div>
            <label htmlFor="retention-days-input" className="block text-sm font-medium text-gray-700 mb-2">保留天数</label>
            <input
              id="retention-days-input"
              type="number"
              value={backupSettings.retentionDays}
              onChange={(e) => setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
              className="input"
              min="1"
              max="365"
              aria-label="设置备份保留天数"
            />
          </div>

          <div>
            <label htmlFor="max-backups-input" className="block text-sm font-medium text-gray-700 mb-2">最大备份数</label>
            <input
              id="max-backups-input"
              type="number"
              value={backupSettings.maxBackups}
              onChange={(e) => setBackupSettings(prev => ({ ...prev, maxBackups: parseInt(e.target.value) }))}
              className="input"
              min="1"
              max="100"
              aria-label="设置最大备份数量"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">注意事项：</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>备份文件包含所有用户数据和测试记录</li>
                <li>恢复备份将覆盖当前所有数据</li>
                <li>建议定期下载备份文件到本地存储</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 备份列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">备份记录</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  备份名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                      {backup.description && (
                        <div className="text-sm text-gray-500">{backup.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(backup.type)}`}>
                      {backup.type === 'auto' ? '自动' : '手动'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {backup.size > 0 ? formatFileSize(backup.size) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(backup.status)}`}>
                      {getStatusLabel(backup.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {backup.createdAt}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {backup.status === 'completed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownloadBackup(backup)}
                            className="text-blue-600 hover:text-blue-900"
                            title="下载备份"
                            aria-label="下载备份"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreBackup(backup)}
                            className="text-green-600 hover:text-green-900"
                            title="恢复备份"
                            aria-label="恢复备份"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除备份"
                        aria-label="删除备份"
                      >
                        <Database className="w-4 h-4" />
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
  );
};

export default BackupManagement;
