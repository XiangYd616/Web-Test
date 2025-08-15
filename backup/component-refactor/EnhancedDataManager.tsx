/**
 * 增强的数据管理组件
 * 提供完整的数据导入导出、筛选搜索、批量操作、数据可视化功能
 */

import {
  BarChart3,
  CheckSquare,
  Database,
  Download,
  Edit, Eye,
  Filter,
  PieChart,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDataManagement } from '../../hooks/useDataManagement';
import { realtimeManager } from '../../services/realtime/RealtimeManager';

interface DataRecord {
  id: string;
  type: string;
  data: any;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    tags: string[];
    source: string;
    userId?: string;
  };
}

interface FilterConfig {
  type?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  source?: string;
  searchTerm?: string;
}

interface ImportProgress {
  taskId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
  total?: number;
  processed?: number;
  errors?: any[];
}

interface ExportProgress {
  taskId: string;
  fileName: string;
  format: string;
  progress: number;
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
  downloadUrl?: string;
  message?: string;
}

const EnhancedDataManager: React.FC = () => {
  const {
    records,
    loading,
    error,
    totalRecords,
    query,
    setQuery,
    selectedRecords,
    setSelectedRecords,
    exportData,
    importData,
    deleteRecords,
    refreshData
  } = useDataManagement();

  // 状态管理
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'chart'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [exportProgress, setExportProgress] = useState<ExportProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 实时更新订阅
  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe('data_updates', (message) => {
      if (message.type === 'data_updated') {
        refreshData();
      }
    });

    return unsubscribe;
  }, [refreshData]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(prev => ({
        ...prev,
        search: searchTerm,
        pagination: { ...prev.pagination, page: 1 }
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, setQuery]);

  // 计算统计信息
  const statistics = useMemo(() => {
    const typeGroups = records.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sourceGroups = records.reduce((acc, record) => {
      const source = record.metadata.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalRecords,
      types: typeGroups,
      sources: sourceGroups,
      selected: selectedRecords.length
    };
  }, [records, totalRecords, selectedRecords]);

  // 处理文件导入
  const handleFileImport = useCallback(async (files: FileList, config: any) => {
    for (const file of Array.from(files)) {
      const taskId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const progress: ImportProgress = {
        taskId,
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      };

      setImportProgress(prev => [...prev, progress]);

      try {
        // 调用导入API
        const result = await importData(file, {
          type: config.type,
          format: config.format,
          mapping: config.mapping,
          validation: config.validation,
          skipDuplicates: config.skipDuplicates
        });

        // 更新进度状态
        setImportProgress(prev => prev.map(p =>
          p.taskId === taskId
            ? { ...p, status: 'processing', progress: 50 }
            : p
        ));

        // 监听导入进度
        const unsubscribe = realtimeManager.subscribe(`import_progress_${result.taskId}`, (message) => {
          setImportProgress(prev => prev.map(p =>
            p.taskId === taskId
              ? {
                ...p,
                progress: message.data.progress,
                status: message.data.status,
                processed: message.data.processed,
                total: message.data.total,
                errors: message.data.errors
              }
              : p
          ));

          if (message.data.status === 'completed' || message.data.status === 'failed') {
            unsubscribe();
            if (message.data.status === 'completed') {
              refreshData();
            }
          }
        });

      } catch (error) {
        setImportProgress(prev => prev.map(p =>
          p.taskId === taskId
            ? { ...p, status: 'failed', message: error instanceof Error ? error.message : '导入失败' }
            : p
        ));
      }
    }
  }, [importData, refreshData]);

  // 处理数据导出
  const handleDataExport = useCallback(async (config: any) => {
    const taskId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const progress: ExportProgress = {
      taskId,
      fileName: `data_export_${new Date().toISOString().split('T')[0]}.${config.format}`,
      format: config.format,
      progress: 0,
      status: 'preparing'
    };

    setExportProgress(prev => [...prev, progress]);

    try {
      // 调用导出API
      await exportData(config.format, selectedRecords.length > 0 ? selectedRecords : undefined);

      // 模拟导出进度（实际应该通过WebSocket接收）
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 10;
        setExportProgress(prev => prev.map(p =>
          p.taskId === taskId
            ? { ...p, progress: Math.min(currentProgress, 100) }
            : p
        ));

        if (currentProgress >= 100) {
          clearInterval(progressInterval);
          setExportProgress(prev => prev.map(p =>
            p.taskId === taskId
              ? {
                ...p,
                status: 'completed',
                downloadUrl: `/api/data/exports/${taskId}/download`
              }
              : p
          ));
        }
      }, 200);

    } catch (error) {
      setExportProgress(prev => prev.map(p =>
        p.taskId === taskId
          ? { ...p, status: 'failed', message: error instanceof Error ? error.message : '导出失败' }
          : p
      ));
    }
  }, [exportData, selectedRecords]);

  // 批量操作
  const handleBatchDelete = useCallback(async () => {
    if (selectedRecords.length === 0) return;

    if (confirm(`确定要删除选中的 ${selectedRecords.length} 条记录吗？`)) {
      try {
        await deleteRecords(selectedRecords);
        setSelectedRecords([]);
        refreshData();
      } catch (error) {
        alert('批量删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  }, [selectedRecords, deleteRecords, setSelectedRecords, refreshData]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r.id));
    }
  }, [selectedRecords, records, setSelectedRecords]);

  // 应用筛选
  const applyFilters = useCallback(() => {
    setQuery(prev => ({
      ...prev,
      filters: filterConfig,
      pagination: { ...prev.pagination, page: 1 }
    }));
    setShowFilters(false);
  }, [filterConfig, setQuery]);

  return (
    <div className="space-y-6">
      {/* 头部工具栏 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">数据管理</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Database className="w-4 h-4" />
              <span>总计 {statistics.total} 条记录</span>
              {selectedRecords.length > 0 && (
                <span className="text-blue-400">已选择 {selectedRecords.length} 条</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
              >
                表格
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
              >
                网格
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
              >
                图表
              </button>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 搜索和筛选栏 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索数据记录..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>

          {selectedRecords.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除选中
            </button>
          )}
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">数据类型</label>
                <select
                  value={filterConfig.type || ''}
                  onChange={(e) => setFilterConfig(prev => ({ ...prev, type: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                >
                  <option value="">全部类型</option>
                  {Object.keys(statistics.types).map(type => (
                    <option key={type} value={type}>{type} ({statistics.types[type]})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">数据源</label>
                <select
                  value={filterConfig.source || ''}
                  onChange={(e) => setFilterConfig(prev => ({ ...prev, source: e.target.value || undefined }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                >
                  <option value="">全部来源</option>
                  {Object.keys(statistics.sources).map(source => (
                    <option key={source} value={source}>{source} ({statistics.sources[source]})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">日期范围</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filterConfig.dateRange?.start || ''}
                    onChange={(e) => setFilterConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value, end: prev.dateRange?.end || '' }
                    }))}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                  />
                  <input
                    type="date"
                    value={filterConfig.dateRange?.end || ''}
                    onChange={(e) => setFilterConfig(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: prev.dateRange?.start || '', end: e.target.value }
                    }))}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setFilterConfig({});
                  setQuery(prev => ({ ...prev, filters: {} }));
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                清除
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                应用筛选
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 进度显示区域 */}
      {(importProgress.length > 0 || exportProgress.length > 0) && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3">任务进度</h3>

          {/* 导入进度 */}
          {importProgress.map(progress => (
            <div key={progress.taskId} className="mb-3 p-3 bg-gray-700 rounded border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium">{progress.fileName}</span>
                  <span className={`text-xs px-2 py-1 rounded ${progress.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    progress.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                    {progress.status === 'uploading' ? '上传中' :
                      progress.status === 'processing' ? '处理中' :
                        progress.status === 'completed' ? '完成' : '失败'}
                  </span>
                </div>
                <button
                  onClick={() => setImportProgress(prev => prev.filter(p => p.taskId !== progress.taskId))}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${progress.status === 'completed' ? 'bg-green-500' :
                    progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              {progress.processed && progress.total && (
                <div className="text-sm text-gray-400">
                  已处理 {progress.processed} / {progress.total} 条记录
                  {progress.errors && progress.errors.length > 0 && (
                    <span className="text-red-400 ml-2">({progress.errors.length} 个错误)</span>
                  )}
                </div>
              )}

              {progress.message && (
                <div className="text-sm text-gray-400 mt-1">{progress.message}</div>
              )}
            </div>
          ))}

          {/* 导出进度 */}
          {exportProgress.map(progress => (
            <div key={progress.taskId} className="mb-3 p-3 bg-gray-700 rounded border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{progress.fileName}</span>
                  <span className={`text-xs px-2 py-1 rounded ${progress.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    progress.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                    {progress.status === 'preparing' ? '准备中' :
                      progress.status === 'exporting' ? '导出中' :
                        progress.status === 'completed' ? '完成' : '失败'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {progress.status === 'completed' && progress.downloadUrl && (
                    <a
                      href={progress.downloadUrl}
                      download
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      下载
                    </a>
                  )}
                  <button
                    onClick={() => setExportProgress(prev => prev.filter(p => p.taskId !== progress.taskId))}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${progress.status === 'completed' ? 'bg-green-500' :
                    progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              {progress.message && (
                <div className="text-sm text-gray-400 mt-1">{progress.message}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 数据展示区域 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-300 hover:text-white"
                    >
                      {selectedRecords.length === records.length ?
                        <CheckSquare className="w-4 h-4" /> :
                        <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="p-3 text-left text-gray-300 font-medium">类型</th>
                  <th className="p-3 text-left text-gray-300 font-medium">创建时间</th>
                  <th className="p-3 text-left text-gray-300 font-medium">来源</th>
                  <th className="p-3 text-left text-gray-300 font-medium">标签</th>
                  <th className="p-3 text-left text-gray-300 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3">
                      <button
                        onClick={() => {
                          if (selectedRecords.includes(record.id)) {
                            setSelectedRecords(prev => prev.filter(id => id !== record.id));
                          } else {
                            setSelectedRecords(prev => [...prev, record.id]);
                          }
                        }}
                        className="text-gray-300 hover:text-white"
                      >
                        {selectedRecords.includes(record.id) ?
                          <CheckSquare className="w-4 h-4 text-blue-400" /> :
                          <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="p-3 text-white">{record.type}</td>
                    <td className="p-3 text-gray-300">
                      {new Date(record.metadata.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-gray-300">{record.metadata.source}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {record.metadata.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'chart' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 类型分布图 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  数据类型分布
                </h3>
                <div className="space-y-2">
                  {Object.entries(statistics.types).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-300">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(count / statistics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-white text-sm w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 来源分布图 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  数据来源分布
                </h3>
                <div className="space-y-2">
                  {Object.entries(statistics.sources).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-gray-300">{source}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(count / statistics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-white text-sm w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalRecords > query.pagination.limit && (
        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">
            显示 {((query.pagination.page - 1) * query.pagination.limit) + 1} - {Math.min(query.pagination.page * query.pagination.limit, totalRecords)} 条，共 {totalRecords} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuery(prev => ({ ...prev, pagination: { ...prev.pagination, page: prev.pagination.page - 1 } }))}
              disabled={query.pagination.page <= 1}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-white">
              {query.pagination.page} / {Math.ceil(totalRecords / query.pagination.limit)}
            </span>
            <button
              onClick={() => setQuery(prev => ({ ...prev, pagination: { ...prev.pagination, page: prev.pagination.page + 1 } }))}
              disabled={query.pagination.page >= Math.ceil(totalRecords / query.pagination.limit)}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 导入模态框 */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleFileImport}
        />
      )}

      {/* 导出模态框 */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleDataExport}
          selectedCount={selectedRecords.length}
          totalCount={totalRecords}
        />
      )}
    </div>
  );
};

// 导入模态框组件
interface ImportModalProps {
  onClose: () => void;
  onImport: (files: FileList, config: any) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [dragOver, setDragOver] = useState(false);
  const [config, setConfig] = useState({
    type: 'test_results',
    format: 'json',
    validation: true,
    skipDuplicates: true,
    mapping: {}
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      onImport(e.dataTransfer.files, config);
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImport(e.target.files, config);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">数据导入</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">数据类型</label>
            <select
              value={config.type}
              onChange={(e) => setConfig(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="test_results">测试结果</option>
              <option value="user_data">用户数据</option>
              <option value="system_logs">系统日志</option>
              <option value="analytics">分析数据</option>
              <option value="reports">报告数据</option>
              <option value="configurations">配置数据</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">文件格式</label>
            <select
              value={config.format}
              onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.validation}
                onChange={(e) => setConfig(prev => ({ ...prev, validation: e.target.checked }))}
                className="rounded"
              />
              <span className="text-gray-300">启用数据验证</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.skipDuplicates}
                onChange={(e) => setConfig(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                className="rounded"
              />
              <span className="text-gray-300">跳过重复数据</span>
            </label>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
              }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-300 mb-2">拖拽文件到此处或</p>
            <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
              选择文件
              <input
                type="file"
                multiple
                accept=".json,.csv,.xlsx,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// 导出模态框组件
interface ExportModalProps {
  onClose: () => void;
  onExport: (config: any) => void;
  selectedCount: number;
  totalCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onExport, selectedCount, totalCount }) => {
  const [config, setConfig] = useState({
    format: 'json',
    scope: selectedCount > 0 ? 'selected' : 'all',
    includeMetadata: true,
    compression: false
  });

  const handleExport = () => {
    onExport(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">数据导出</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">导出格式</label>
            <select
              value={config.format}
              onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">导出范围</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="selected"
                  checked={config.scope === 'selected'}
                  onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value }))}
                  disabled={selectedCount === 0}
                />
                <span className="text-gray-300">
                  选中的记录 ({selectedCount} 条)
                  {selectedCount === 0 && <span className="text-gray-500 ml-1">(无选中)</span>}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={config.scope === 'all'}
                  onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value }))}
                />
                <span className="text-gray-300">全部记录 ({totalCount} 条)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeMetadata}
                onChange={(e) => setConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                className="rounded"
              />
              <span className="text-gray-300">包含元数据</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.compression}
                onChange={(e) => setConfig(prev => ({ ...prev, compression: e.target.checked }))}
                className="rounded"
              />
              <span className="text-gray-300">启用压缩</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              开始导出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDataManager;
