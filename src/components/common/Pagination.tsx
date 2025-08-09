/**
 * 高级分页组件
 * 支持多种分页模式、虚拟滚动和性能优化
 * 版本: v2.0.0
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronsLeft, ChevronsRight } from 'lucide-react';

// 分页配置接口
export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  showFirstLast?: boolean;
  pageSizeOptions?: number[];
  maxVisiblePages?: number;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// 分页事件接口
export interface PaginationEvents {
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

// 分页组件属性
export interface PaginationProps extends PaginationConfig, PaginationEvents {
  className?: string;
  style?: React.CSSProperties;
}

// 分页信息计算
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  visiblePages: number[];
}

/**
 * 计算分页信息
 */
export function calculatePaginationInfo(
  page: number,
  limit: number,
  total: number,
  maxVisiblePages: number = 7
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const startIndex = (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, total);
  
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  
  // 计算可见页码
  const visiblePages: number[] = [];
  const halfVisible = Math.floor(maxVisiblePages / 2);
  
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, currentPage + halfVisible);
  
  // 调整范围以确保显示足够的页码
  if (endPage - startPage + 1 < maxVisiblePages) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }
  
  return {
    currentPage,
    pageSize: limit,
    totalItems: total,
    totalPages,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
    visiblePages
  };
}

/**
 * 分页组件
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal = true,
  showFirstLast = true,
  pageSizeOptions = [10, 20, 50, 100],
  maxVisiblePages = 7,
  disabled = false,
  size = 'medium',
  className = '',
  style,
  onPageChange,
  onPageSizeChange,
  onShowSizeChange
}) => {
  const [jumpValue, setJumpValue] = useState('');
  
  // 计算分页信息
  const paginationInfo = useMemo(() => 
    calculatePaginationInfo(page, limit, total, maxVisiblePages),
    [page, limit, total, maxVisiblePages]
  );
  
  // 样式类名
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };
  
  const buttonSizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base'
  };
  
  // 页码变更处理
  const handlePageChange = useCallback((newPage: number) => {
    if (disabled || newPage === page || newPage < 1 || newPage > paginationInfo.totalPages) {
      return;
    }
    onPageChange(newPage);
  }, [disabled, page, paginationInfo.totalPages, onPageChange]);
  
  // 页面大小变更处理
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (disabled || newPageSize === limit) {
      return;
    }
    
    // 计算新页码，保持当前数据位置
    const currentIndex = (page - 1) * limit;
    const newPage = Math.floor(currentIndex / newPageSize) + 1;
    
    onPageSizeChange?.(newPageSize);
    onShowSizeChange?.(newPage, newPageSize);
  }, [disabled, limit, page, onPageSizeChange, onShowSizeChange]);
  
  // 快速跳转处理
  const handleQuickJump = useCallback(() => {
    const targetPage = parseInt(jumpValue, 10);
    if (!isNaN(targetPage)) {
      handlePageChange(targetPage);
      setJumpValue('');
    }
  }, [jumpValue, handlePageChange]);
  
  // 键盘事件处理
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickJump();
    }
  }, [handleQuickJump]);
  
  // 如果没有数据，不显示分页
  if (total === 0) {
    return null;
  }
  
  return (
    <div 
      className={`flex items-center justify-between gap-4 ${sizeClasses[size]} ${className}`}
      style={style}
    >
      {/* 总数信息 */}
      {showTotal && (
        <div className="text-gray-600 dark:text-gray-400">
          共 {paginationInfo.totalItems} 条，第 {paginationInfo.startIndex}-{paginationInfo.endIndex} 条
        </div>
      )}
      
      {/* 分页控件 */}
      <div className="flex items-center gap-2">
        {/* 首页按钮 */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(1)}
            disabled={disabled || !paginationInfo.hasPrev}
            className={`
              ${buttonSizeClasses[size]}
              border border-gray-300 dark:border-gray-600 rounded
              hover:bg-gray-50 dark:hover:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
            title="首页"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
        
        {/* 上一页按钮 */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={disabled || !paginationInfo.hasPrev}
          className={`
            ${buttonSizeClasses[size]}
            border border-gray-300 dark:border-gray-600 rounded
            hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
          title="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {paginationInfo.visiblePages.map((pageNum, index) => {
            const isCurrentPage = pageNum === paginationInfo.currentPage;
            const showEllipsis = index === 0 && pageNum > 1;
            const showEndEllipsis = index === paginationInfo.visiblePages.length - 1 && 
                                   pageNum < paginationInfo.totalPages;
            
            return (
              <React.Fragment key={pageNum}>
                {/* 前省略号 */}
                {showEllipsis && pageNum > 2 && (
                  <span className="px-2 text-gray-400">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                )}
                
                {/* 页码按钮 */}
                <button
                  onClick={() => handlePageChange(pageNum)}
                  disabled={disabled}
                  className={`
                    ${buttonSizeClasses[size]}
                    border rounded transition-colors duration-200
                    ${isCurrentPage 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {pageNum}
                </button>
                
                {/* 后省略号 */}
                {showEndEllipsis && pageNum < paginationInfo.totalPages - 1 && (
                  <span className="px-2 text-gray-400">
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* 下一页按钮 */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={disabled || !paginationInfo.hasNext}
          className={`
            ${buttonSizeClasses[size]}
            border border-gray-300 dark:border-gray-600 rounded
            hover:bg-gray-50 dark:hover:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
          title="下一页"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        
        {/* 末页按钮 */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(paginationInfo.totalPages)}
            disabled={disabled || !paginationInfo.hasNext}
            className={`
              ${buttonSizeClasses[size]}
              border border-gray-300 dark:border-gray-600 rounded
              hover:bg-gray-50 dark:hover:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
            title="末页"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* 页面大小选择器 */}
      {showSizeChanger && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">每页</span>
          <select
            value={limit}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className={`
              ${buttonSizeClasses[size]}
              border border-gray-300 dark:border-gray-600 rounded
              bg-white dark:bg-gray-800
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {pageSizeOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-gray-600 dark:text-gray-400">条</span>
        </div>
      )}
      
      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">跳至</span>
          <input
            type="number"
            min="1"
            max={paginationInfo.totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className={`
              ${buttonSizeClasses[size]}
              w-16 border border-gray-300 dark:border-gray-600 rounded
              text-center bg-white dark:bg-gray-800
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            placeholder="页"
          />
          <button
            onClick={handleQuickJump}
            disabled={disabled || !jumpValue}
            className={`
              ${buttonSizeClasses[size]}
              bg-blue-500 text-white rounded
              hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
          >
            跳转
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
