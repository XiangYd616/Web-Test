/**
 * useDeleteActions Hook - 管理删除操作逻辑
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/hooks/useDeleteActions.ts
 * 创建时间: 2025-10-05
 */

import Logger from '@/utils/logger';
import { useState, useCallback } from 'react';
import { showToast } from '../../../common/Toast';
import type { TestRecord, DeleteDialogState } from '../types';

interface UseDeleteActionsProps {
  records: TestRecord[];
  selectedRecords: Set<string>;
  onRecordsDeleted: (deletedIds: string[]) => void;
  onSelectionCleared: () => void;
}

interface UseDeleteActionsReturn {
  deleteDialog: DeleteDialogState;
  openDeleteDialog: (recordId: string) => void;
  openBatchDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;
}

export const useDeleteActions = ({
  records,
  selectedRecords,
  onRecordsDeleted,
  onSelectionCleared
}: UseDeleteActionsProps): UseDeleteActionsReturn => {
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    type: 'single',
    isLoading: false
  });

  const openDeleteDialog = useCallback((recordId: string) => {
    const recordToDelete = records.find(r => r.id === recordId);
    const recordName = recordToDelete ? recordToDelete.testName : '测试记录';

    setDeleteDialog({
      isOpen: true,
      type: 'single',
      recordId,
      recordName,
      isLoading: false
    });
  }, [records]);

  const openBatchDeleteDialog = useCallback(() => {
    if (selectedRecords.size === 0) {
      showToast.error('请先选择要删除的记录');
      return;
    }

    const recordsToDelete = records.filter(r => selectedRecords.has(r.id));
    const recordNames = recordsToDelete.map(r => r.testName);

    setDeleteDialog({
      isOpen: true,
      type: 'batch',
      recordNames,
      isLoading: false
    });
  }, [records, selectedRecords]);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const deleteRecord = async (recordId: string): Promise<void> => {
    const recordToDelete = records.find(r => r.id === recordId);
    const recordName = recordToDelete ? recordToDelete.testName : '测试记录';

    const response = await fetch(`/api/test/history/${recordId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token') ? {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        } : {})
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else if (response.status === 404) {
        throw new Error('测试记录不存在或已被删除');
      } else if (response.status === 403) {
        throw new Error('没有权限删除此记录');
      } else {
        throw new Error(`删除失败 (${response.status})`);
      }
    }

    const data = await response.json();

    if (data?.success) {
      showToast.success(`"${recordName}" 已成功删除`);
      onRecordsDeleted([recordId]);
    } else {
      throw new Error(data?.message || '删除失败');
    }
  };

  const batchDeleteRecords = async (): Promise<void> => {
    if (selectedRecords.size === 0) {
      throw new Error('请先选择要删除的记录');
    }

    const response = await fetch('/api/test/history/batch', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token') ? {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        } : {})
      },
      body: JSON.stringify({
        sessionIds: Array.from(selectedRecords)
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else if (response.status === 404) {
        throw new Error('部分测试记录不存在或已被删除');
      } else if (response.status === 403) {
        throw new Error('没有权限删除这些记录');
      } else {
        throw new Error(`批量删除失败 (${response.status})`);
      }
    }

    const data = await response.json();

    if (data?.success) {
      const deletedCount = data?.data?.deletedCount || selectedRecords.size;
      showToast.success(`成功删除 ${deletedCount} 条记录`);
      onRecordsDeleted(Array.from(selectedRecords));
      onSelectionCleared();
    } else {
      throw new Error(data?.error || '批量删除失败');
    }
  };

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.isOpen) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      if (deleteDialog.type === 'single' && deleteDialog.recordId) {
        await deleteRecord(deleteDialog.recordId);
      } else if (deleteDialog.type === 'batch') {
        await batchDeleteRecords();
      }
      closeDeleteDialog();
    } catch (error) {
      Logger.error('删除操作失败:', error);
      const errorMessage = error instanceof Error ? error.message : '删除失败，请稍后重试';
      showToast.error(`删除失败: ${errorMessage}`);
    } finally {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  }, [deleteDialog, closeDeleteDialog]);

  return {
    deleteDialog,
    openDeleteDialog,
    openBatchDeleteDialog,
    closeDeleteDialog,
    confirmDelete
  };
};

