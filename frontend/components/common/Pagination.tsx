/**
 * 增强分页组件
 * 支持虚拟分页、预加载、智能缓存
 * 版本: v1.0.0
 */

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaginationInfo } from '../../types/apiResponse.types';

// ==================== 类型定义 ====================

export interface EnhancedPaginationProps {
  current: number;
  total: number;
  pageSize: number;
  totalPages: number;
  onChange: (page: number, pageSize?: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  showPageInfo?: boolean;
  pageSizeOptions?: number[];
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  // 增强功能
  enablePreload?: boolean;
  enableCache?: boolean;
  preloadPages?: number;
  maxVisiblePages?: number;
  onPreload?: (page: number) => Promise<void>;
  renderTotal?: (total: number, range: [number, number]) => React.ReactNode;
  renderPageItem?: (page: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next') => React.ReactNode;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  preloadedPages: Set<number>;
  isPreloading: boolean;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  enablePreload?: boolean;
  preloadPages?: number;
  enableCache?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
  onPreload?: (page: number) => Promise<void>;
}

// ==================== 分页状态管理Hook ====================

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    enablePreload = false,
    preloadPages = 2,
    enableCache = true,
    onPageChange,
    onPreload
  } = options;

  const [state, setState] = useState<PaginationState>({
    currentPage: initialPage,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
    preloadedPages: new Set(),
    isPreloading: false
  });

  const preloadTimeoutRef = useRef<NodeJS.Timeout>();

  // 更新分页信息
  const updatePagination = useCallback((pagination: Partial<PaginationInfo>) => {
    setState(prev => ({
      ...prev,
      ...pagination,
      totalPages: pagination.total && pagination.limit
        ? Math.ceil(pagination.total / pagination.limit)
        : prev.totalPages
    }));
  }, []);

  // 页面变化处理
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    const newPageSize = pageSize || state.pageSize;
    const newTotalPages = Math.ceil(state.total / newPageSize);

    if (page < 1 || page > newTotalPages) {
      return;
    }

    setState(prev => ({
      ...prev,
      currentPage: page,
      pageSize: newPageSize,
      totalPages: newTotalPages
    }));

    onPageChange?.(page, newPageSize);

    // 预加载相邻页面
    if (enablePreload && onPreload) {
      schedulePreload(page, newTotalPages);
    }
  }, [state.pageSize, state.total, onPageChange, enablePreload, onPreload]);

  // 预加载调度
  const schedulePreload = useCallback((currentPage: number, totalPages: number) => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(async () => {
      setState(prev => ({ ...prev, isPreloading: true }));

      const pagesToPreload: number[] = [];

      // 预加载前后几页
      for (let i = 1; i <= preloadPages; i++) {
        const prevPage = currentPage - i;
        const nextPage = currentPage + i;

        if (prevPage >= 1 && !state.preloadedPages.has(prevPage)) {
          pagesToPreload.push(prevPage);
        }

        if (nextPage <= totalPages && !state.preloadedPages.has(nextPage)) {
          pagesToPreload.push(nextPage);
        }
      }

      // 执行预加载
      for (const page of pagesToPreload) {
        try {
          await onPreload!(page);
          setState(prev => ({
            ...prev,
            preloadedPages: new Set([...prev.preloadedPages, page])
          }));
        } catch (error) {
          console.warn(`预加载页面 ${page} 失败:`, error);
        }
      }

      setState(prev => ({ ...prev, isPreloading: false }));
    }, 500); // 延迟500ms执行预加载
  }, [preloadPages, state.preloadedPages, onPreload]);

  // 清理
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    handlePageChange,
    updatePagination,
    goToFirst: () => handlePageChange(1),
    goToLast: () => handlePageChange(state.totalPages),
    goToPrev: () => handlePageChange(Math.max(1, state.currentPage - 1)),
    goToNext: () => handlePageChange(Math.min(state.totalPages, state.currentPage + 1)),
    canGoPrev: state.currentPage > 1,
    /**
     * 获取getPageRange数据
     * @param {string} id - 对象ID
     * @returns {Promise<Object|null>} 获取的数据
     */
    canGoNext: state.currentPage < state.totalPages,
    getPageRange: () => {
      const start = (state.currentPage - 1) * state.pageSize + 1;
      const end = Math.min(state.currentPage * state.pageSize, state.total);
      return [start, end] as [number, number];
    }
  };
}

// ==================== 增强分页组件 ====================

export const EnhancedPagination: React.FC<EnhancedPaginationProps> = ({
  current,
  total,
  pageSize,
  totalPages,
  onChange,
  onPageSizeChange,
  showSizeChanger = true,
  showQuickJumper = false,
  showTotal = true,
  showPageInfo = true,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
  loading = false,
  className = '',
  size = 'medium',
  enablePreload = false,
  enableCache = false,
  preloadPages = 2,
  maxVisiblePages = 7,
  onPreload,
  renderTotal,
  renderPageItem
}) => {
  const [jumpValue, setJumpValue] = useState('');
  const [isPreloading, setIsPreloading] = useState(false);

  // 计算显示的页码范围
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const half = Math.floor(maxVisiblePages / 2);

    let start = Math.max(1, current - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    // 调整起始位置
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    // 添加第一页和省略号
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push('ellipsis');
      }
    }

    // 添加中间页码
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // 添加省略号和最后一页
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }

    return pages;
  }, [current, totalPages, maxVisiblePages]);

  // 页面变化处理
  const handlePageChange = useCallback((page: number) => {
    if (page === current || disabled || loading) return;

    onChange(page, pageSize);

    // 预加载
    if (enablePreload && onPreload) {
      setIsPreloading(true);
      const preloadPromises: Promise<void>[] = [];

      for (let i = 1; i <= preloadPages; i++) {
        const prevPage = page - i;
        const nextPage = page + i;

        if (prevPage >= 1) {
          preloadPromises.push(onPreload(prevPage));
        }

        if (nextPage <= totalPages) {
          preloadPromises.push(onPreload(nextPage));
        }
      }

      Promise.allSettled(preloadPromises).finally(() => {
        setIsPreloading(false);
      });
    }
  }, [current, disabled, loading, onChange, pageSize, enablePreload, onPreload, preloadPages, totalPages]);

  // 页面大小变化处理
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
    // 重新计算当前页
    const newTotalPages = Math.ceil(total / newPageSize);
    const newCurrentPage = Math.min(current, newTotalPages);
    onChange(newCurrentPage, newPageSize);
  }, [onPageSizeChange, total, current, onChange]);

  // 快速跳转处理
  const handleQuickJump = useCallback(() => {
    const page = parseInt(jumpValue);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpValue('');
    }
  }, [jumpValue, totalPages, handlePageChange]);

  // 样式类
  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const buttonSizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-2 text-base'
  };

  // 渲染页码按钮
  const renderPageButton = (page: number | 'ellipsis', index: number) => {
    if (page === 'ellipsis') {
      return (
        <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-400">
          <MoreHorizontal className="w-4 h-4" />
        </span>
      );
    }

    const isActive = page === current;
    const buttonClass = `
      ${buttonSizeClasses[size]}
      ${isActive
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white'
      }
      border rounded-lg transition-colors duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    if (renderPageItem) {
      return (
        <div key={page} onClick={() => !disabled && handlePageChange(page)}>
          {renderPageItem(page, 'page')}
        </div>
      );
    }

    return (
      <button
        key={page}
        type="button"
        onClick={() => handlePageChange(page)}
        disabled={disabled || isActive}
        className={buttonClass}
      >
        {page}
      </button>
    );
  };

  // 计算显示范围
  const range = useMemo(() => {
    const start = (current - 1) * pageSize + 1;
    const end = Math.min(current * pageSize, total);
    return [start, end] as [number, number];
  }, [current, pageSize, total]);

  return (
    <div className={`flex items-center justify-between gap-4 ${sizeClasses[size]} ${className}`}>
      {/* 总数显示 */}
      {showTotal && (
        <div className="text-gray-400">
          {renderTotal ? renderTotal(total, range) : (
            `共 ${total} 条记录，第 ${range[0]}-${range[1]} 条`
          )}
        </div>
      )}

      {/* 分页控件 */}
      <div className="flex items-center gap-2">
        {/* 首页按钮 */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={disabled || current === 1}
          className={`${buttonSizeClasses[size]} bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="首页"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* 上一页按钮 */}
        <button
          type="button"
          onClick={() => handlePageChange(current - 1)}
          disabled={disabled || current === 1}
          className={`${buttonSizeClasses[size]} bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => renderPageButton(page, index))}
        </div>

        {/* 下一页按钮 */}
        <button
          type="button"
          onClick={() => handlePageChange(current + 1)}
          disabled={disabled || current === totalPages}
          className={`${buttonSizeClasses[size]} bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="下一页"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* 末页按钮 */}
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={disabled || current === totalPages}
          className={`${buttonSizeClasses[size]} bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          title="末页"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* 预加载指示器 */}
        {(isPreloading || loading) && (
          <div className="flex items-center gap-1 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">
              {loading ? '加载中...' : '预加载中...'}
            </span>
          </div>
        )}
      </div>

      {/* 页面大小选择器 */}
      {showSizeChanger && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">每页</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e?.target.value))}
            disabled={disabled}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {pageSizeOptions?.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-gray-400">条</span>
        </div>
      )}

      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e?.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuickJump()}
            disabled={disabled}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 text-center focus:outline-none focus:border-blue-500 disabled:opacity-50"
            placeholder="页"
          />
          <button
            type="button"
            onClick={handleQuickJump}
            disabled={disabled || !jumpValue}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            跳转
          </button>
        </div>
      )}

      {/* 页面信息 */}
      {showPageInfo && (
        <div className="text-gray-400">
          第 {current} 页，共 {totalPages} 页
        </div>
      )}
    </div>
  );
};

export default EnhancedPagination;
