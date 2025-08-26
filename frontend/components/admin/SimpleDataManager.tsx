import type { useEffect, useState, FC } from 'react';
import { AlertTriangle, Database, Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import Logger from '../../utils/logger';

interface DataManagerProps {
  className?: string;
}

interface DataStats {
  totalRecords: number;
  totalSize: string;
  lastBackup: string;
  status: 'healthy' | 'warning' | 'error';
}

const DataManager: React.FC<DataManagerProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<DataStats>({
    totalRecords: 0,
    totalSize: '0 MB',
    lastBackup: '从未备份',
    status: 'healthy'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载数据统计
    const loadStats = async () => {
      setLoading(true);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStats({
        totalRecords: Math.floor(Math.random() * 10000) + 1000,
        totalSize: `${(Math.random() * 500 + 100).toFixed(1)} MB`,
        lastBackup: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: Math.random() > 0.8 ? 'warning' : 'healthy'
      });

      setLoading(false);
    };

    loadStats();
  }, []);

  const handleBackup = async () => {
    Logger.userAction('data_backup_started', undefined, { component: 'DataManager' });
    // TODO: 实现真实的备份功能
  };

  const handleRestore = async () => {
    Logger.userAction('data_restore_started', undefined, { component: 'DataManager' });
    // TODO: 实现真实的恢复功能
  };

  const handleCleanup = async () => {
    Logger.userAction('data_cleanup_started', undefined, { component: 'DataManager' });
    // TODO: 实现真实的清理功能
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 border-green-200';
      case 'warning': return 'bg-yellow-100 border-yellow-200';
      case 'error': return 'bg-red-100 border-red-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="flex space-x-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <Database className="w-6 h-6 text-blue-500 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">数据管理</h2>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-lg p-4 border ${getStatusBg(stats.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总记录数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
            </div>
            <Database className={`w-8 h-8 ${getStatusColor(stats.status)}`} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">数据大小</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSize}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">最后备份</p>
              <p className="text-lg font-semibold text-gray-900">{stats.lastBackup}</p>
            </div>
            <Download className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* 状态警告 */}
      {stats.status === 'warning' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            <p className="text-yellow-800">数据状态异常，建议进行备份和清理操作</p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleBackup}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          备份数据
        </button>

        <button
          onClick={handleRestore}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          恢复数据
        </button>

        <button
          onClick={handleCleanup}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          清理数据
        </button>
      </div>
    </div>
  );
};

export default DataManager;
