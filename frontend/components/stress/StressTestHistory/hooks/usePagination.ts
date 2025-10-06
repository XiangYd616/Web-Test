/**
 * usePagination Hook - 管理分页状态和操作
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/hooks/usePagination.ts
 * 创建时间: 2025-10-05
 */

import { useState, useMemo } from 'react';

interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  startRecord: number;
  endRecord: number;
  goToPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  changePageSize: (newPageSize: number) => void;
}

/**
 * usePagination Hook - 管理分页状态和计算
 * @param totalRecords - 总记录数
 * @param initialPageSize - 初始每页大小（默认10）
 */
export const usePagination = (
  totalRecords: number,
  initialPageSize: number = 10
): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // 计算总页数
  const totalPages = useMemo(() => {
    if (totalRecords === 0) return 0;
    return Math.ceil(totalRecords / pageSize);
  }, [totalRecords, pageSize]);

  // 计算起始记录位置
  const startRecord = useMemo(() => {
    if (totalRecords === 0) return 0;
    return (currentPage - 1) * pageSize + 1;
  }, [currentPage, pageSize, totalRecords]);

  // 计算结束记录位置
  const endRecord = useMemo(() => {
    if (totalRecords === 0) return 0;
    return Math.min(currentPage * pageSize, totalRecords);
  }, [currentPage, pageSize, totalRecords]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    startRecord,
    endRecord,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    changePageSize
  };
};

