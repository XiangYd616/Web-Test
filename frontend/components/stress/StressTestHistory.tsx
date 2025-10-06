/**
 * StressTestHistory.tsx - Refactored React Component
 * 
 * File path: frontend\components\stress\StressTestHistory.tsx
 * Created: 2025-09-25
 * Refactored: 2025-01-XX
 * 
 * This component has been refactored to use custom hooks and child components
 * for better modularity, testability, and maintainability.
 */

import React from 'react';
import type { FC } from 'react';
import ExportUtils from '../../utils/exportUtils';
import { DeleteConfirmDialog } from '../common/DeleteConfirmDialog';
import ExportModal from '../common/ExportModal';
import StressTestDetailModal from './StressTestDetailModal';

// Import custom hooks
import {
  useTestRecords,
  useFilters,
  usePagination,
  useSelection,
  useDeleteActions,
  useExport,
  useDetailView,
} from './StressTestHistory/hooks';

// Import child components
import {
  LoadingState,
  EmptyState,
  UnauthorizedState,
  HistoryHeader,
  FilterBar,
  SelectionControls,
  RecordCard,
  PaginationBar,
} from './StressTestHistory/components';

// Import types
import type { TestRecord } from './StressTestHistory/types';

// Import styles
import '../../styles/pagination.css';
import './StatusLabel.css';
import './StressTestHistory.css';

interface StressTestHistoryProps {
  className?: string;
}

/**
 * StressTestHistory - Main Component
 * 
 * This is the refactored main component that orchestrates all custom hooks
 * and child components to display stress test history records.
 */
const StressTestHistory: FC<StressTestHistoryProps> = ({ className = '' }) => {
  // Data loading hook
  const { records, loading, totalRecords, isAuthenticated, handleRefresh } = useTestRecords();

  // Filtering hook
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
    setSortOrder,
  } = useFilters();

  // Pagination hook
  const {
    currentPage,
    pageSize,
    totalPages,
    startRecord,
    endRecord,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    changePageSize,
  } = usePagination(totalRecords);

  // Selection hook
  const {
    selectedRecords,
    toggleSelectAll,
    toggleSelectRecord,
    clearSelection,
  } = useSelection(records);

  // Delete actions hook
  const {
    deleteDialog,
    openDeleteDialog,
    openBatchDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  } = useDeleteActions(records, selectedRecords, currentPage, handleRefresh);

  // Export hook
  const {
    isExportModalOpen,
    selectedExportRecord,
    openExportModal,
    closeExportModal,
    handleExport,
  } = useExport();

  // Detail view hook
  const {
    isDetailModalOpen,
    selectedDetailRecord,
    openDetailModal,
    closeDetailModal,
    navigateToDetailPage,
  } = useDetailView();

  // Render: Show unauthorized state if not authenticated
  if (!isAuthenticated) {
    return <UnauthorizedState className={className} />;
  }

  // Render: Main component JSX
  return (
    <div className={`test-records-container bg-gray-800/30 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/40 dark:border-gray-600/30 shadow-lg ${className}`}>
      {/* Header with selection controls */}
      <HistoryHeader
        records={records}
        selectedRecords={selectedRecords}
        loading={loading}
        toggleSelectAll={toggleSelectAll}
        openBatchDeleteDialog={openBatchDeleteDialog}
        clearSelection={clearSelection}
        handleRefresh={handleRefresh}
      />

      {/* Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        dateFilter={dateFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        setSearchTerm={setSearchTerm}
        setStatusFilter={setStatusFilter}
        setDateFilter={setDateFilter}
        setSortBy={setSortBy}
        setSortOrder={setSortOrder}
      />

      {/* Content Area */}
      <div className="p-6">
        {loading ? (
          <LoadingState />
        ) : totalRecords === 0 ? (
          <EmptyState
            hasFilters={searchTerm !== '' || statusFilter !== 'all' || dateFilter !== 'all'}
          />
        ) : (
          <>
            {/* Records List */}
            <div className="space-y-4">
              {records.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  isSelected={selectedRecords.has(record.id)}
                  onToggleSelect={toggleSelectRecord}
                  onViewQuick={() => openDetailModal(record)}
                  onViewDetail={() => navigateToDetailPage(record)}
                  onExport={() => openExportModal(record)}
                  onDelete={() => openDeleteDialog(record.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalRecords > 0 && (
              <PaginationBar
                currentPage={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                totalRecords={totalRecords}
                startRecord={startRecord}
                endRecord={endRecord}
                goToPage={goToPage}
                goToPreviousPage={goToPreviousPage}
                goToNextPage={goToNextPage}
                changePageSize={changePageSize}
              />
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <StressTestDetailModal
        record={selectedDetailRecord}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={closeExportModal}
        data={{
          testConfig: selectedExportRecord?.config || {},
          result: selectedExportRecord?.results || {},
          metrics: selectedExportRecord?.results?.metrics || {},
          realTimeData: (selectedExportRecord as any)?.realTimeData || [],
          logs: (selectedExportRecord as any)?.logs || [],
          errors: (selectedExportRecord as any)?.errors || [],
        }}
        testType="stress"
        testId={selectedExportRecord?.id}
        testName={selectedExportRecord?.testName}
        onExport={(type, data) => handleExport(type, data, ExportUtils)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        title={deleteDialog.type === 'single' ? '删除测试记录' : '批量删除测试记录'}
        message={
          deleteDialog.type === 'single'
            ? `确定要删除测试记�?"${deleteDialog.recordName}" 吗？`
            : `确定要删除选中�?${selectedRecords.size} 条测试记录吗？`
        }
        itemNames={
          deleteDialog.type === 'single'
            ? [deleteDialog.recordName || '']
            : deleteDialog.recordNames || []
        }
        isLoading={deleteDialog.isLoading}
        type={deleteDialog.type}
      />
    </div>
  );
};

export default StressTestHistory;
