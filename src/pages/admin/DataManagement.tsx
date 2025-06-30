import {
  Activity,
  AlertCircle,
  Archive,
  CheckCircle,
  Clock,
  Database,
  Download,
  File,
  FileJson,
  FileSpreadsheet,
  FileText,
  Plus,
  RotateCcw,
  TestTube,
  Trash2,
  Upload,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import DataBackupManager from '../../components/data/DataBackupManager';
import DataManager from '../../components/data/DataManager';
import DataSyncManager from '../../components/data/DataSyncManager';

interface DataExportTask {
  id: string;
  name: string;
  type: 'users' | 'tests' | 'reports' | 'logs' | 'all';
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  fileSize?: string;
  downloadUrl?: string;
  progress?: number;
}

interface DataImportTask {
  id: string;
  name: string;
  type: 'users' | 'tests' | 'reports';
  format: 'json' | 'csv' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  recordsProcessed?: number;
  totalRecords?: number;
  errors?: string[];
}

const DataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'advanced' | 'backup' | 'sync' | 'export' | 'import' | 'history'>('advanced');
  const [exportTasks, setExportTasks] = useState<DataExportTask[]>([]);
  const [importTasks, setImportTasks] = useState<DataImportTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // 导出配置
  const [exportConfig, setExportConfig] = useState({
    type: 'all' as 'users' | 'tests' | 'reports' | 'logs' | 'all',
    format: 'json' as 'json' | 'csv' | 'xlsx' | 'pdf',
    dateRange: {
      start: '',
      end: ''
    },
    includeDeleted: false,
    filters: {}
  });

  // 导入配置
  const [importConfig, setImportConfig] = useState({
    type: 'tests' as 'users' | 'tests' | 'reports',
    format: 'json' as 'json' | 'csv' | 'xlsx',
    skipDuplicates: true,
    updateExisting: false,
    validateOnly: false
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      // 获取真实的导出和导入任务数据
      const [exportResponse, importResponse] = await Promise.all([
        fetch('/api/data-management/exports', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/data-management/imports', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (exportResponse.ok && importResponse.ok) {
        const exportData = await exportResponse.json();
        const importData = await importResponse.json();

        setExportTasks(exportData.data || []);
        setImportTasks(importData.data || []);
      } else {
        console.error('Failed to load tasks');
        // 如果API失败，使用模拟数据作为后备
        setExportTasks([]);
        setImportTasks([]);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
      // 使用模拟数据作为后备
      setExportTasks([]);
      setImportTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'users':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'tests':
        return <TestTube className="w-5 h-5 text-green-400" />;
      case 'reports':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'logs':
        return <Activity className="w-5 h-5 text-yellow-400" />;
      case 'all':
        return <Database className="w-5 h-5 text-gray-400" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <FileJson className="w-4 h-4 text-green-400" />;
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-blue-400" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, progress?: number) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-900 text-green-300 rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          已完成
        </span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-900 text-blue-300 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3 animate-spin" />
          处理中 {progress ? `${progress}%` : ''}
        </span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-900 text-red-300 rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          失败
        </span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-900 text-yellow-300 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          等待中
        </span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">未知</span>;
    }
  };

  const handleExport = async () => {
    try {
      console.log('开始导出:', exportConfig);

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch('/api/data-management/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exportConfig)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('导出成功:', result);
        setShowExportModal(false);
        // 重新加载任务列表
        loadTasks();
      } else {
        const error = await response.json();
        console.error('导出失败:', error);
        alert(`导出失败: ${error.error}`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('请选择要导入的文件');
      return;
    }

    try {
      console.log('开始导入:', importConfig, selectedFile);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importConfig.type);
      formData.append('format', importConfig.format);
      formData.append('skipDuplicates', importConfig.skipDuplicates.toString());
      formData.append('updateExisting', importConfig.updateExisting.toString());
      formData.append('validateOnly', importConfig.validateOnly.toString());

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch('/api/data-management/imports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('导入成功:', result);
        setShowImportModal(false);
        setSelectedFile(null);
        // 重新加载任务列表
        loadTasks();
      } else {
        const error = await response.json();
        console.error('导入失败:', error);
        alert(`导入失败: ${error.error}`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请稍后重试');
    }
  };

  const handleDownload = async (task: DataExportTask) => {
    if (task.downloadUrl) {
      try {
        const response = await fetch(task.downloadUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = task.name || 'download';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          console.error('下载失败');
          alert('下载失败，请稍后重试');
        }
      } catch (error) {
        console.error('下载失败:', error);
        alert('下载失败，请稍后重试');
      }
    }
  };

  const handleDelete = async (taskId: string, type: 'export' | 'import') => {
    try {
      const endpoint = type === 'export' ? 'exports' : 'imports';
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`/api/data-management/${endpoint}/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 从本地状态中移除
        if (type === 'export') {
          setExportTasks(prev => prev.filter(task => task.id !== taskId));
        } else {
          setImportTasks(prev => prev.filter(task => task.id !== taskId));
        }
      } else {
        console.error('删除失败');
        alert('删除失败，请稍后重试');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">高级数据管理中心</h1>
              <p className="text-gray-300">统一的数据管理、备份、同步和分析平台</p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">导出任务</p>
                <p className="text-2xl font-bold text-white">{exportTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center">
              <Upload className="w-8 h-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">导入任务</p>
                <p className="text-2xl font-bold text-white">{importTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">已完成</p>
                <p className="text-2xl font-bold text-white">
                  {[...exportTasks, ...importTasks].filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">处理中</p>
                <p className="text-2xl font-bold text-white">
                  {[...exportTasks, ...importTasks].filter(t => t.status === 'processing').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
          {/* 标签页导航 */}
          <div className="border-b border-gray-700/50">
            <nav className="flex space-x-1 px-6 overflow-x-auto">
              {[
                { id: 'advanced', label: '高级管理', icon: Database, badge: 'NEW' },
                { id: 'backup', label: '备份管理', icon: Archive },
                { id: 'sync', label: '数据同步', icon: RotateCcw },
                { id: 'export', label: '数据导出', icon: Download },
                { id: 'import', label: '数据导入', icon: Upload },
                { id: 'history', label: '历史记录', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 标签页内容 */}
          <div className="p-6">
            {activeTab === 'advanced' && (
              <DataManager className="mb-6" />
            )}

            {activeTab === 'backup' && (
              <DataBackupManager className="mb-6" />
            )}

            {activeTab === 'sync' && (
              <DataSyncManager className="mb-6" />
            )}

            {activeTab === 'export' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">数据导出</h2>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    新建导出任务
                  </button>
                </div>

                {/* 导出任务列表 */}
                <div className="space-y-4">
                  {exportTasks.map((task) => (
                    <div key={task.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getTypeIcon(task.type)}
                          <div>
                            <h3 className="text-white font-medium">{task.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                              {getFormatIcon(task.format)}
                              <span>{task.format.toUpperCase()}</span>
                              <span>•</span>
                              <span>{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                              {task.fileSize && (
                                <>
                                  <span>•</span>
                                  <span>{task.fileSize}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(task.status, task.progress)}
                          {task.status === 'completed' && task.downloadUrl && (
                            <button
                              onClick={() => handleDownload(task)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="下载"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(task.id, 'export')}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {task.status === 'processing' && task.progress && (
                        <div className="mt-3">
                          <div className="bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">数据导入</h2>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    新建导入任务
                  </button>
                </div>

                {/* 导入任务列表 */}
                <div className="space-y-4">
                  {importTasks.map((task) => (
                    <div key={task.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getTypeIcon(task.type)}
                          <div>
                            <h3 className="text-white font-medium">{task.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-400">
                              {getFormatIcon(task.format)}
                              <span>{task.format.toUpperCase()}</span>
                              <span>•</span>
                              <span>{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                              {task.recordsProcessed && task.totalRecords && (
                                <>
                                  <span>•</span>
                                  <span>{task.recordsProcessed}/{task.totalRecords} 条记录</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(task.status)}
                          <button
                            onClick={() => handleDelete(task.id, 'import')}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {task.errors && task.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded">
                          <h4 className="text-red-400 font-medium mb-2">导入错误:</h4>
                          <ul className="text-sm text-red-300 space-y-1">
                            {task.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-6">历史记录</h2>
                <div className="space-y-4">
                  {[...exportTasks, ...importTasks]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((task) => (
                      <div key={`${task.id}-history`} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getTypeIcon(task.type)}
                            <div>
                              <h3 className="text-white font-medium">{task.name}</h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <span>{'downloadUrl' in task ? '导出' : '导入'}</span>
                                <span>•</span>
                                {getFormatIcon('format' in task ? task.format : 'json')}
                                <span>{'format' in task ? task.format.toUpperCase() : 'JSON'}</span>
                                <span>•</span>
                                <span>{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(task.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 导出模态框 */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">新建导出任务</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                  aria-label="关闭导出模态框"
                  title="关闭导出模态框"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">数据类型</label>
                  <select
                    value={exportConfig.type}
                    onChange={(e) => setExportConfig(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="选择导出数据类型"
                    title="选择要导出的数据类型"
                  >
                    <option value="all">全部数据</option>
                    <option value="users">用户数据</option>
                    <option value="tests">测试结果</option>
                    <option value="reports">报告数据</option>
                    <option value="logs">系统日志</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">导出格式</label>
                  <select
                    value={exportConfig.format}
                    onChange={(e) => setExportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="选择导出格式"
                    title="选择导出文件的格式"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">开始日期</label>
                    <input
                      type="date"
                      value={exportConfig.dateRange.start}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="选择开始日期"
                      title="选择数据导出的开始日期"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">结束日期</label>
                    <input
                      type="date"
                      value={exportConfig.dateRange.end}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="选择结束日期"
                      title="选择数据导出的结束日期"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeDeleted"
                    checked={exportConfig.includeDeleted}
                    onChange={(e) => setExportConfig(prev => ({ ...prev, includeDeleted: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <label htmlFor="includeDeleted" className="ml-2 text-sm text-gray-300">
                    包含已删除的数据
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  开始导出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 导入模态框 */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">新建导入任务</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                  aria-label="关闭导入模态框"
                  title="关闭导入模态框"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">数据类型</label>
                  <select
                    value={importConfig.type}
                    onChange={(e) => setImportConfig(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="选择导入数据类型"
                    title="选择要导入的数据类型"
                  >
                    <option value="users">用户数据</option>
                    <option value="tests">测试数据</option>
                    <option value="reports">报告数据</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">文件格式</label>
                  <select
                    value={importConfig.format}
                    onChange={(e) => setImportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="选择导入文件格式"
                    title="选择导入文件的格式"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">选择文件</label>
                  <input
                    type="file"
                    accept={`.${importConfig.format}`}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    aria-label="选择要导入的文件"
                    title="选择要导入的数据文件"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-400">
                      已选择: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="skipDuplicates"
                      checked={importConfig.skipDuplicates}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="skipDuplicates" className="ml-2 text-sm text-gray-300">
                      跳过重复数据
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="updateExisting"
                      checked={importConfig.updateExisting}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, updateExisting: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="updateExisting" className="ml-2 text-sm text-gray-300">
                      更新现有数据
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="validateOnly"
                      checked={importConfig.validateOnly}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, validateOnly: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="validateOnly" className="ml-2 text-sm text-gray-300">
                      仅验证不导入
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  开始导入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;
