/**
 * TestHistory - 配置驱动的通用测试历史记录组件
 * 
 * 文件路径: frontend/components/common/TestHistory/TestHistory.tsx
 * 创建时间: 2025-11-13
 * 
 * 功能特性:
 * - 配置驱动:通过传入配置对象控制所有行为
 * - 完全可复用:支持所有测试类型(stress, seo, api, performance等)
 * - 高性能:使用React hooks优化渲染和状态管理
 * - 丰富功能:分页、筛选、排序、批量操作、导出等
 */

import React, { useEffect, useCallback, useState } from 'react';
import { Trash2, Eye, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import Logger from '@/utils/logger';

// 导入类型定义
import type { 
  TestHistoryProps, 
  TestRecord,
  DeleteDialogState,
  ColumnConfig 
} from './types';

// 导入hooks
import { useTestRecords } from './hooks/useTestRecords';
import { useFilters } from './hooks/useFilters';
import { usePagination } from './hooks/usePagination';
import { useSelection } from './hooks/useSelection';
import { useDeleteActions } from './hooks/useDeleteActions';
import { useExport } from './hooks/useExport';

// 导入子组件
import { HistoryHeader } from './components/HistoryHeader';
import { FilterBar } from './components/FilterBar';
import { EmptyState } from './components/EmptyState';

/**
 * 状态徽章组件
 */
const StatusBadge: React.FC<{ status: string; formatter?: (status: string) => string }> = ({ 
  status, 
  formatter 
}) => {
  const statusColors: Record<string, string> = {
    idle: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    starting: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    running: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-300 border-green-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
    cancelled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  const colorClass = statusColors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  const displayText = formatter ? formatter(status) : status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}>
      {displayText}
    </span>
  );
};

/**
 * 表格行组件
 */
const TableRow: React.FC<{
  record: TestRecord;
  columns: ColumnConfig[];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (record: TestRecord) => void;
  onDelete: (id: string) => void;
  customActions?: any[];
  formatters?: any;
}> = ({ 
  record, 
  columns, 
  isSelected, 
  onSelect, 
  onView, 
  onDelete,
  customActions = [],
  formatters = {}
}) => {
  return (
    <tr className="hover:bg-gray-700/30 transition-colors duration-150">
      {/* 复选框列 */}
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(record.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          aria-label={`选择 ${record.testName || record.id}`}
        />
      </td>

      {/* 数据列 */}
      {columns.map((column) => {
        const value = (record as any)[column.key];
        let displayValue: React.ReactNode = value;

        // 应用列级格式化器
        if (column.formatter) {
          displayValue = column.formatter(value, record);
        }
        // 应用全局格式化器
        else if (formatters[column.key]) {
          displayValue = formatters[column.key](value);
        }
        // 特殊处理status列
        else if (column.key === 'status') {
          displayValue = <StatusBadge status={value} formatter={formatters.status} />;
        }
        // 默认显示
        else if (value === null || value === undefined) {
          displayValue = '-';
        }

        const alignClass = column.align === 'right' ? 'text-right' : 
                          column.align === 'center' ? 'text-center' : 
                          'text-left';

        return (
          <td 
            key={column.key} 
            className={`px-4 py-3 text-sm text-gray-300 ${alignClass}`}
            style={{ width: column.width }}
          >
            {displayValue}
          </td>
        );
      })}

      {/* 操作列 */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {/* 查看详情 */}
          <button
            onClick={() => onView(record)}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
            title="查看详情"
            aria-label={`查看 ${record.testName || record.id} 的详情`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* 自定义操作 */}
          {customActions.map((action) => {
            const isVisible = !action.visible || action.visible(record);
            const isDisabled = action.disabled && action.disabled(record);
            
            if (!isVisible) return null;

            return (
              <button
                key={action.key}
                onClick={() => action.onClick(record)}
                disabled={isDisabled}
                className={`p-1.5 rounded transition-colors ${
                  isDisabled 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/30'
                }`}
                title={action.label}
                aria-label={`${action.label}: ${record.testName || record.id}`}
              >
                {action.icon || action.label}
              </button>
            );
          })}

          {/* 删除 */}
          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            title="删除"
            aria-label={`删除 ${record.testName || record.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * 删除确认对话框组件
 */
const DeleteDialog: React.FC<{
  state: DeleteDialogState;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ state, onConfirm, onCancel }) => {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">
          确认删除
        </h3>
        <p className="text-gray-300 mb-6">
          {state.type === 'single' 
            ? `确定要删除测试记录 "${state.recordName}" 吗?` 
            : `确定要删除选中的 ${state.recordNames?.length || 0} 条测试记录吗?`}
          <br />
          <span className="text-sm text-gray-400 mt-2 block">此操作无法撤销</span>
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={state.isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={state.isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {state.isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {state.isLoading ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * TestHistory 主组件
 */
export const TestHistory: React.FC<TestHistoryProps> = ({
  config,
  onRecordClick,
  onRecordDelete,
  onBatchDelete,
  additionalFilters = {},
  className = '',
}) => {
  // ===== Hooks =====
  const { records, loading, totalRecords, loadTestRecords, setRecords } = useTestRecords({
    apiEndpoint: config.apiEndpoint
  });
  const {
    searchTerm,
    statusFilter,
    dateFilter,
    sortBy,
    sortOrder,
    setSearchTerm,
    setStatusFilter,
    setDateFilter,
    setSortBy,
    toggleSortOrder,
  } = useFilters();
  const { currentPage, pageSize, totalPages, startRecord, endRecord, goToPage, changePageSize } = usePagination(totalRecords, config.defaultPageSize || 10);
  const { selectedIds, isSelected, selectAll, toggleSelect, clearSelection } = useSelection();
  const { exportToJson, exportToCsv } = useExport(config.testType);
  
  // 删除对话框状态
  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
    isOpen: false,
    type: 'single',
    isLoading: false,
  });

  // ===== 数据加载 =====
  useEffect(() => {
    loadTestRecords({
      page: currentPage,
      pageSize,
      search: searchTerm,
      status: statusFilter,
      dateFilter,
      sortBy,
      sortOrder,
      ...additionalFilters,
    });
  }, [currentPage, pageSize, searchTerm, statusFilter, dateFilter, sortBy, sortOrder, additionalFilters]);

  // ===== 事件处理 =====
  
  // 刷新数据
  const handleRefresh = useCallback(() => {
    loadTestRecords({
      page: currentPage,
      pageSize,
      search: searchTerm,
      status: statusFilter,
      dateFilter,
      sortBy,
      sortOrder,
      ...additionalFilters,
    });
  }, [currentPage, pageSize, searchTerm, statusFilter, dateFilter, sortBy, sortOrder, additionalFilters]);

  // 查看详情
  const handleViewDetails = useCallback((record: TestRecord) => {
    if (onRecordClick) {
      onRecordClick(record);
    } else {
      // 默认行为:导航到详情页
      const detailPath = `/testing/${config.testType}/detail/${record.id}`;
      window.location.href = detailPath;
    }
  }, [onRecordClick, config.testType]);

  // 单个删除
  const handleDeleteSingle = useCallback(async (id: string) => {
    const record = records.find(r => r.id === id);
    setDeleteDialogState({
      isOpen: true,
      type: 'single',
      recordId: id,
      recordName: record?.testName || record?.id || '',
      isLoading: false,
    });
  }, [records]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    const selectedRecords = records.filter(r => selectedIds.includes(r.id));
    setDeleteDialogState({
      isOpen: true,
      type: 'batch',
      recordNames: selectedRecords.map(r => r.testName || r.id),
      isLoading: false,
    });
  }, [records, selectedIds]);

  // 确认删除
  const confirmDelete = useCallback(async () => {
    setDeleteDialogState(prev => ({ ...prev, isLoading: true }));

    try {
      if (deleteDialogState.type === 'single' && deleteDialogState.recordId) {
        // 单个删除
        if (onRecordDelete) {
          await onRecordDelete(deleteDialogState.recordId);
        } else {
          // 默认删除逻辑
          const response = await fetch(`${config.apiEndpoint}/${deleteDialogState.recordId}`, {
            method: 'DELETE',
            headers: {
              ...(localStorage.getItem('auth_token') ? {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              } : {})
            },
          });
          if (!response.ok) throw new Error('删除失败');
        }
        
        // 更新本地状态
        setRecords(prev => prev.filter(r => r.id !== deleteDialogState.recordId));
        Logger.info('成功删除测试记录');
      } else if (deleteDialogState.type === 'batch') {
        // 批量删除
        if (onBatchDelete) {
          await onBatchDelete(selectedIds);
        } else {
          // 默认批量删除逻辑
          await Promise.all(
            selectedIds.map(id =>
              fetch(`${config.apiEndpoint}/${id}`, {
                method: 'DELETE',
                headers: {
                  ...(localStorage.getItem('auth_token') ? {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                  } : {})
                },
              })
            )
          );
        }
        
        // 更新本地状态
        setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)));
        clearSelection();
        Logger.info(`成功删除 ${selectedIds.length} 条测试记录`);
      }

      // 关闭对话框
      setDeleteDialogState({ isOpen: false, type: 'single', isLoading: false });
      
      // 刷新数据
      handleRefresh();
    } catch (error) {
      Logger.error('删除失败:', error);
      setDeleteDialogState(prev => ({ ...prev, isLoading: false }));
      alert('删除失败,请重试');
    }
  }, [deleteDialogState, onRecordDelete, onBatchDelete, selectedIds, config.apiEndpoint, handleRefresh]);

  // 取消删除
  const cancelDelete = useCallback(() => {
    setDeleteDialogState({ isOpen: false, type: 'single', isLoading: false });
  }, []);

  // 导出数据
  const handleExport = useCallback(async (format: 'json' | 'csv') => {
    try {
      if (format === 'json') {
        await exportToJson(records);
      } else {
        await exportToCsv(records, config.columns);
      }
      Logger.info(`成功导出 ${format.toUpperCase()} 格式数据`);
    } catch (error) {
      Logger.error('导出失败:', error);
      alert('导出失败,请重试');
    }
  }, [records, config.columns, exportToJson, exportToCsv]);

  // ===== 渲染 =====
  const hasFilters = searchTerm || statusFilter !== 'all' || dateFilter !== 'all';
  const showEmptyState = !loading && records.length === 0;
  const features = config.features || {};

  return (
    <div className={`test-history-container ${className}`}>
      {/* 头部 */}
      <HistoryHeader
        loading={loading}
        selectedCount={selectedIds.length}
        onRefresh={handleRefresh}
        onBatchDelete={handleBatchDelete}
        onClearSelection={clearSelection}
      />

      {/* 筛选栏 */}
      {features.search !== false && (
        <FilterBar
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          dateFilter={dateFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onDateChange={setDateFilter}
          onSortByChange={setSortBy}
          onSortOrderToggle={toggleSortOrder}
        />
      )}

      {/* 表格容器 */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/30 mt-6 overflow-hidden">
        {/* 工具栏 */}
        {(features.export || features.batchDelete) && (
          <div className="px-6 py-4 border-b border-gray-700/30 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              显示 {startRecord} - {endRecord} 共 {totalRecords} 条记录
            </div>
            <div className="flex items-center gap-2">
              {features.export && config.features?.exportFormats?.includes('json') && (
                <button
                  onClick={() => handleExport('json')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 rounded-lg transition-colors"
                  title="导出为JSON"
                >
                  <FileJson className="w-4 h-4" />
                  JSON
                </button>
              )}
              {features.export && config.features?.exportFormats?.includes('csv') && (
                <button
                  onClick={() => handleExport('csv')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 rounded-lg transition-colors"
                  title="导出为CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
              )}
            </div>
          </div>
        )}

        {/* 表格 */}
        {showEmptyState ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/30 border-b border-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={records.length > 0 && selectedIds.length === records.length}
                      onChange={() => selectAll(records.map(r => r.id))}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      aria-label="全选"
                    />
                  </th>
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-sm font-medium text-gray-300 ${
                        column.align === 'right' ? 'text-right' :
                        column.align === 'center' ? 'text-center' :
                        'text-left'
                      }`}
                      style={{ width: column.width }}
                    >
                      {column.title}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={config.columns.length + 2} className="px-4 py-12 text-center">
                      <div className="inline-flex items-center gap-3 text-gray-400">
                        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        <span>加载中...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      record={record}
                      columns={config.columns}
                      isSelected={isSelected(record.id)}
                      onSelect={toggleSelect}
                      onView={handleViewDetails}
                      onDelete={handleDeleteSingle}
                      customActions={config.customActions}
                      formatters={config.formatters}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {!showEmptyState && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-gray-700/50 border border-gray-600/40 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50"
              >
                {(config.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400">条</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-gray-300">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/40 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <DeleteDialog
        state={deleteDialogState}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

// 默认导出
export default TestHistory;
