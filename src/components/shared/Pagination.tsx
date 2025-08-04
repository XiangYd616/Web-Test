import React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  totalPages: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showQuickJumper?: boolean;
  showTotal?: boolean;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  totalPages,
  onChange,
  onPageSizeChange,
  showSizeChanger = true,
  pageSizeOptions = [5, 10, 20, 50],
  showQuickJumper = false,
  showTotal = true,
  className = ''
}) => {
  const startRecord = (current - 1) * pageSize + 1;
  const endRecord = Math.min(current * pageSize, total);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, current - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 第一页
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          type="button"
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis" className="px-2 text-gray-400">...</span>);
      }
    }

    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm rounded-lg transition-colors ${i === current
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
        >
          {i}
        </button>
      );
    }

    // 最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="px-2 text-gray-400">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          type="button"
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 总数信息 */}
      {showTotal && (
        <div className="text-sm text-gray-400">
          显示第 {startRecord} - {endRecord} 条，共 {total} 条记录
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* 每页显示数量 */}
        {showSizeChanger && onPageSizeChange && (
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span>每页显示:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-[70px]"
              aria-label="选择每页显示数量"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size} className="bg-gray-700 text-white">{size} 条</option>
              ))}
            </select>
          </div>
        )}

        {/* 分页控制 */}
        <div className="flex items-center space-x-2">
          {/* 上一页按钮 */}
          <button
            type="button"
            onClick={() => handlePageChange(current - 1)}
            disabled={current <= 1}
            className="flex items-center px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            title="上一页"
          >
            <ChevronLeft className="w-4 h-4" />
            上一页
          </button>

          {/* 页码按钮 */}
          <div className="flex items-center space-x-1">
            {renderPageNumbers()}
          </div>

          {/* 下一页按钮 */}
          <button
            type="button"
            onClick={() => handlePageChange(current + 1)}
            disabled={current >= totalPages}
            className="flex items-center px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            title="下一页"
          >
            下一页
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* 快速跳转 */}
        {showQuickJumper && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <label htmlFor="page-jump-input" className="text-sm text-gray-400">跳至</label>
            <input
              id="page-jump-input"
              type="number"
              min={1}
              max={totalPages}
              className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`跳转到指定页面，当前第${current}页，共${totalPages}页`}
              placeholder="页码"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const page = parseInt((e.target as HTMLInputElement).value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <span>页</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
