/**
 * useSelection Hook - 管理记录的选择状态
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/hooks/useSelection.ts
 * 创建时间: 2025-10-05
 */

import { useState, useCallback } from 'react';
import type { TestRecord } from '../types';

interface UseSelectionReturn {
  selectedRecords: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectRecord: (recordId: string) => void;
  clearSelection: () => void;
}

/**
 * useSelection Hook - 管理记录选择状态
 * @param records - 当前记录列表
 */
export const useSelection = (records: TestRecord[]): UseSelectionReturn => {
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // 切换全选/取消全选
  const toggleSelectAll = useCallback(() => {
    setSelectedRecords(prev => {
      if (prev.size === records.length && records.length > 0) {
        // 当前全选，取消全选
        return new Set();
      } else {
        // 当前未全选，全选
        return new Set(records.map(r => r.id));
      }
    });
  }, [records]);

  const toggleSelectRecord = useCallback((recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  // 清除所有选择
  const clearSelection = useCallback(() => {
    setSelectedRecords(new Set());
  }, []);

  return {
    selectedRecords,
    toggleSelectAll,
    toggleSelectRecord,
    clearSelection
  };
};

