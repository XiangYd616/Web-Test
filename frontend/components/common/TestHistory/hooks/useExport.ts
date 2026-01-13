/**
 * useExport Hook - 管理导出功能
 *
 * 文件路径: frontend/components/common/TestHistory/hooks/useExport.ts
 * 创建时间: 2025-10-05
 */

import Logger from '@/utils/logger';
import { useCallback, useState } from 'react';
import ExportUtils from '../../../../utils/exportUtils';
import type { TestRecord } from '../types';

interface UseExportReturn {
  isExportModalOpen: boolean;
  selectedExportRecord: TestRecord | null;
  openExportModal: (record: TestRecord) => void;
  closeExportModal: () => void;
  handleExport: (exportType: string, data: any, exportUtils?: typeof ExportUtils) => Promise<void>;
  exportToJson: (data: any) => Promise<void>;
  exportToCsv: (data: any) => Promise<void>;
  exportToExcel: (data: any) => Promise<void>;
}

/**
 * useExport Hook - 管理导出功能和模态框状态
 */
export const useExport = (): UseExportReturn => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportRecord, setSelectedExportRecord] = useState<TestRecord | null>(null);

  // 打开导出模态框
  const openExportModal = useCallback((record: TestRecord) => {
    setSelectedExportRecord(record);
    setIsExportModalOpen(true);
  }, []);

  // 关闭导出模态框
  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
    setSelectedExportRecord(null);
  }, []);

  // 处理导出操作
  const handleExport = useCallback(
    async (exportType: string, data: any, exportUtils: typeof ExportUtils = ExportUtils) => {
      try {
        await exportUtils.exportByType(exportType, data);
        closeExportModal();
      } catch (error) {
        Logger.error('导出失败:', error);
        throw error;
      }
    },
    [closeExportModal]
  );

  // 导出为 JSON
  const exportToJson = useCallback(async (data: any) => {
    try {
      await ExportUtils.exportByType('json', data);
      Logger.info('成功导出为 JSON');
    } catch (error) {
      Logger.error('导出 JSON 失败:', error);
      throw error;
    }
  }, []);

  // 导出为 CSV
  const exportToCsv = useCallback(async (data: any) => {
    try {
      await ExportUtils.exportByType('csv', data);
      Logger.info('成功导出为 CSV');
    } catch (error) {
      Logger.error('导出 CSV 失败:', error);
      throw error;
    }
  }, []);

  // 导出为 Excel
  const exportToExcel = useCallback(async (data: any) => {
    try {
      await ExportUtils.exportByType('excel', data);
      Logger.info('成功导出为 Excel');
    } catch (error) {
      Logger.error('导出 Excel 失败:', error);
      throw error;
    }
  }, []);

  return {
    isExportModalOpen,
    selectedExportRecord,
    openExportModal,
    closeExportModal,
    handleExport,
    exportToJson,
    exportToCsv,
    exportToExcel,
  };
};
