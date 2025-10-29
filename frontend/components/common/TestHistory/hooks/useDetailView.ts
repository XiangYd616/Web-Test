/**
 * useDetailView Hook - 管理详情查看状态
 * 
 * 文件路径: frontend/components/common/TestHistory/hooks/useDetailView.ts
 * 创建时间: 2025-10-05
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestRecord } from '../types';

interface UseDetailViewReturn {
  isDetailModalOpen: boolean;
  selectedDetailRecord: TestRecord | null;
  openDetailModal: (record: TestRecord) => void;
  closeDetailModal: () => void;
  navigateToDetailPage: (record: TestRecord) => void;
}

/**
 * useDetailView Hook - 管理详情查看状态和导航
 */
export const useDetailView = (): UseDetailViewReturn => {
  const navigate = useNavigate();
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TestRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 打开详情模态框
  const openDetailModal = useCallback((record: TestRecord) => {
    setSelectedDetailRecord(record);
    setIsDetailModalOpen(true);
  }, []);

  // 关闭详情模态框
  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedDetailRecord(null);
  }, []);

  // 导航到详情页面
  const navigateToDetailPage = useCallback((record: TestRecord) => {
    navigate(`/stress-test/${record.id}`);
  }, [navigate]);

  return {
    isDetailModalOpen,
    selectedDetailRecord,
    openDetailModal,
    closeDetailModal,
    navigateToDetailPage
  };
};


