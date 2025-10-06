/**
 * PaginationBar - 分页控制栏组件
 * 
 * 文件路径: frontend/components/stress/StressTestHistory/components/PaginationBar.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  startRecord: number;
  endRecord: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  pageSize,
  startRecord,
  endRecord,
  totalRecords,
  onPageChange,
  onPreviousPage,
  onNextPage,
  onPageSizeChange
}) => {
  if (totalRecords === 0) {
    return null;
  }

  // 生成页码数组 (智能显示7个页码)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPages = Math.min(totalPages, 7);

    if (totalPages <= 7) {
      // 总页数不超过7，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (currentPage <= 4) {
      // 当前页在前面，显示前7页
      for (let i = 1; i <= 7; i++) {
        pages.push(i);
      }
    } else if (currentPage >= totalPages - 3) {
      // 当前页在后面，显示后7页
      for (let i = totalPages - 6; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 当前页在中间，以当前页为中心显示7页
      for (let i = currentPage - 3; i <= currentPage + 3; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/20 dark:bg-gray-800/40 backdrop-blur-sm border border-gray-700/30 rounded-lg">
      {/* 分页信息和每页数量选择 */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          显示 {startRecord}-{endRecord} 条，共 {totalRecords} 条记录
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-gray-300">
            每页显示:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-[70px] pagination-select"
          >
            <option value={5}>5 条</option>
            <option value={10}>10 条</option>
            <option value={20}>20 条</option>
            <option value={50}>50 条</option>
          </select>
        </div>
      </div>

      {/* 分页控制按钮 */}
      <div className="flex items-center gap-2">
        {/* 上一页 */}
        <button
          type="button"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="上一页"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一页
        </button>

        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                currentPage === pageNumber
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-600/40 bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60'
              }`}
              aria-label={`第 ${pageNumber} 页`}
              aria-current={currentPage === pageNumber ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        {/* 下一页 */}
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-600/40 rounded-lg bg-gray-700/30 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="下一页"
        >
          下一页
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

