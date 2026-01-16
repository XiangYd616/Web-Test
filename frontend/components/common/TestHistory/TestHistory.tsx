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

import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import Logger from '@/utils/logger';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

// 导入类型定义
import type { DeleteDialogState, TestHistoryProps, TestRecord } from './types';

// 导入hooks
import { useExport } from './hooks/useExport';
import { useFilters } from './hooks/useFilters';
import { usePagination } from './hooks/usePagination';
import { useSelection } from './hooks/useSelection';
import { useTestRecords } from './hooks/useTestRecords';

// 导入子组件
import { EmptyState } from './components/EmptyState';
import { FilterBar } from './components/FilterBar';
import { HistoryHeader } from './components/HistoryHeader';
import { ResponsiveTable } from './components/ResponsiveTable';
import { useAriaLiveAnnouncer } from './hooks/useAccessibility';
import { useCommonMediaQueries } from './hooks/useResponsive';

/**
 * 状态徽章组件
 */
const StatusBadge: React.FC<{ status: string; formatter?: (status: string) => string }> =
  React.memo(({ status, formatter }) => {
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
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
      >
        {displayText}
      </span>
    );
  });

StatusBadge.displayName = 'StatusBadge';

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
  const {
    records,
    loading: loadingState,
    totalRecords,
    loadTestRecords,
    setRecords,
  } = useTestRecords({
    apiEndpoint: config.apiEndpoint,
    testType: config.testType,
  });
  const loading = Boolean(loadingState);
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
  const { currentPage, pageSize, totalPages, startRecord, endRecord, goToPage, changePageSize } =
    usePagination(totalRecords, config.defaultPageSize || 10);
  const { selectedIds, selectAll, toggleSelect, clearSelection } = useSelection(records);
  const { exportToJson, exportToCsv } = useExport();

  // 响应式状态
  const { isMobile, isTablet } = useCommonMediaQueries();

  // 删除对话框状态
  const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
    isOpen: false,
    type: 'single',
    isLoading: false,
  });

  // 无障碍支持
  const { announcement, announce } = useAriaLiveAnnouncer();

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
  }, [
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    dateFilter,
    sortBy,
    sortOrder,
    additionalFilters,
    loadTestRecords,
  ]);

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
  }, [
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    dateFilter,
    sortBy,
    sortOrder,
    additionalFilters,
    loadTestRecords,
  ]);

  // 查看详情
  const handleViewDetails = useCallback(
    (record: TestRecord) => {
      if (onRecordClick) {
        onRecordClick(record);
      } else {
        // 默认行为:导航到详情页
        const detailPath = `/testing/${config.testType}/detail/${record.id}`;
        window.location.href = detailPath;
      }
    },
    [onRecordClick, config.testType]
  );

  // 单个删除
  const handleDeleteSingle = useCallback(
    async (id: string) => {
      const record = records.find(r => r.id === id);
      setDeleteDialogState({
        isOpen: true,
        type: 'single',
        recordId: id,
        recordName: record?.testName || record?.id || '',
        isLoading: false,
      });
    },
    [records]
  );

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
              ...(localStorage.getItem('auth_token')
                ? {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                  }
                : {}),
            },
          });
          if (!response.ok) throw new Error('删除失败');
        }

        // 更新本地状态
        setRecords(prev => prev.filter(r => r.id !== deleteDialogState.recordId));
        Logger.info('成功删除测试记录');
        announce('成功删除测试记录');
      } else if (deleteDialogState.type === 'batch') {
        // 批量删除
        if (onBatchDelete) {
          await onBatchDelete(selectedIds);
        } else {
          // 默认批量删除逻辑
          await Promise.all(
            selectedIds.map((id: string) =>
              fetch(`${config.apiEndpoint}/${id}`, {
                method: 'DELETE',
                headers: {
                  ...(localStorage.getItem('auth_token')
                    ? {
                        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                      }
                    : {}),
                },
              })
            )
          );
        }

        // 更新本地状态
        setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)));
        clearSelection();
        Logger.info(`成功删除 ${selectedIds.length} 条测试记录`);
        announce(`成功删除 ${selectedIds.length} 条测试记录`);
      }

      // 关闭对话框
      setDeleteDialogState({ isOpen: false, type: 'single', isLoading: false });

      // 刷新数据
      handleRefresh();
    } catch (error) {
      Logger.error('删除失败:', error);
      setDeleteDialogState(prev => ({ ...prev, isLoading: false }));
      announce('删除失败,请重试');
    }
  }, [
    deleteDialogState,
    onRecordDelete,
    onBatchDelete,
    selectedIds,
    config.apiEndpoint,
    handleRefresh,
    announce,
    clearSelection,
    setRecords,
  ]);

  // 取消删除
  const cancelDelete = useCallback(() => {
    setDeleteDialogState({ isOpen: false, type: 'single', isLoading: false });
  }, []);

  // 导出数据
  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      try {
        if (format === 'json') {
          await exportToJson(records);
        } else {
          await exportToCsv(records);
        }
        Logger.info(`成功导出 ${format.toUpperCase()} 格式数据`);
        announce(`成功导出 ${format.toUpperCase()} 格式数据`);
      } catch (error) {
        Logger.error('导出失败:', error);
        announce('导出失败,请重试');
      }
    },
    [records, exportToJson, exportToCsv, announce]
  );

  // ===== 渲染 =====
  const hasFilters = searchTerm || statusFilter !== 'all' || dateFilter !== 'all';
  const showEmptyState = !loading && records.length === 0;
  const features = config.features || {};

  return (
    <div
      className={`test-history-container ${className}`}
      role="region"
      aria-label={`${config.title || '测试历史'}记录列表`}
    >
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
          <EmptyState hasFilters={!!hasFilters} />
        ) : loading ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        ) : (
          <ResponsiveTable
            records={records}
            columns={config.columns}
            selectedIds={selectedIds}
            isMobile={features.responsive !== false && isMobile}
            isTablet={features.responsive !== false && isTablet}
            onSelectAll={selectAll}
            onToggleSelect={toggleSelect}
            onView={handleViewDetails}
            onDelete={handleDeleteSingle}
            formatters={config.formatters}
            customActions={config.customActions}
            StatusBadge={StatusBadge}
          />
        )}

        {/* 分页 */}
        {!showEmptyState && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">每页显示</span>
              <select
                value={pageSize}
                onChange={e => changePageSize(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-gray-700/50 border border-gray-600/40 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50"
              >
                {(config.pageSizeOptions || [10, 20, 50, 100]).map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
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

      {/* ARIA实时通知 */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialogState.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="确认删除"
        message={
          deleteDialogState.type === 'single'
            ? `确定要删除测试记录 "${deleteDialogState.recordName || '该测试记录'}" 吗？此操作无法撤销。`
            : `确定要删除选中的 ${deleteDialogState.recordNames?.length || 0} 条测试记录吗？此操作无法撤销。`
        }
        itemNames={
          deleteDialogState.type === 'single'
            ? deleteDialogState.recordName
              ? [deleteDialogState.recordName]
              : []
            : deleteDialogState.recordNames || []
        }
        isLoading={deleteDialogState.isLoading}
        type={deleteDialogState.type}
      />
    </div>
  );
};

// 默认导出
export default TestHistory;
