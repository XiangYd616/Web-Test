import Logger from '@/utils/logger';
import {
  AlertCircle,
  Archive,
  CheckCircle,
  Clock,
  Database,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  Settings,
  Trash2,
  Upload
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface DataStats {
  totalSize: string;
  testResults: number;
  reports: number;
  backups: number;
  lastBackup: string;
}

interface BackupItem {
  id: string;
  name: string;
  size: string;
  date: string;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed' | 'in_progress';
}

const DataCenter: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    loadDataStats();
    loadBackupHistory();
  }, []);

  const loadDataStats = async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStats({
        totalSize: '2.4 GB',
        testResults: 1247,
        reports: 89,
        backups: 12,
        lastBackup: '2025-08-28 08:00:00'
      });
    } catch (error) {
      Logger.error('加载数据统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackupHistory = async () => {
    try {
      // 模拟备份历史数据
      setBackups([
        {
          id: '1',
          name: '自动备份_20250828',
          size: '2.4 GB',
          date: '2025-08-28 08:00:00',
          type: 'auto',
          status: 'completed'
        },
        {
          id: '2',
          name: '手动备份_20250827',
          size: '2.3 GB',
          date: '2025-08-27 15:30:00',
          type: 'manual',
          status: 'completed'
        },
        {
          id: '3',
          name: '自动备份_20250827',
          size: '2.3 GB',
          date: '2025-08-27 08:00:00',
          type: 'auto',
          status: 'completed'
        }
      ]);
    } catch (error) {
      Logger.error('加载备份历史失败:', error);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      // 模拟备份创建
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newBackup: BackupItem = {
        id: Date.now().toString(),
        name: `手动备份_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
        size: '2.4 GB',
        date: new Date().toLocaleString('zh-CN'),
        type: 'manual',
        status: 'completed'
      };

      setBackups(prev => [newBackup, ...prev]);
      await loadDataStats(); // 刷新统计
    } catch (error) {
      Logger.error('创建备份失败:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = async () => {
    try {
      // 模拟数据导出
      const link = document.createElement('a');
      link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        exportTime: new Date().toISOString(),
        dataType: 'test-results',
        version: '2.0.0'
      }));
      link.download = `test-data-export-${Date.now()}.json`;
      link.click();
    } catch (error) {
      Logger.error('导出数据失败:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageLayout title="数据中心" icon={Database}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="数据中心"
      description="管理测试数据、备份和存储配置"
      icon={Database}
    >
      <div className="space-y-6">
        {/* 数据统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总存储空间</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalSize}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">测试结果</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.testResults}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">报告数量</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.reports}</p>
              </div>
              <Archive className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">备份数量</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.backups}</p>
              </div>
              <Database className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* 数据操作 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            数据操作
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="flex items-center gap-2"
            >
              {isBackingUp ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              {isBackingUp ? '备份中...' : '创建备份'}
            </Button>

            <Button
              onClick={handleExportData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出数据
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入数据
            </Button>
          </div>
        </Card>

        {/* 备份历史 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5" />
            备份历史
          </h3>

          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(backup.status)}
                  <div>
                    <p className="font-medium">{backup.name}</p>
                    <p className="text-sm text-gray-600">
                      {backup.date} • {backup.size} • {backup.type === 'auto' ? '自动' : '手动'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 存储配置 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            存储配置
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">自动备份</p>
                <p className="text-sm text-gray-600">每日凌晨2点自动创建备份</p>
              </div>
              <Button variant="outline" size="sm">配置</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">数据保留期</p>
                <p className="text-sm text-gray-600">测试数据保留90天，备份保留30天</p>
              </div>
              <Button variant="outline" size="sm">配置</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">存储清理</p>
                <p className="text-sm text-gray-600">自动清理过期数据和临时文件</p>
              </div>
              <Button variant="outline" size="sm">配置</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default DataCenter;
