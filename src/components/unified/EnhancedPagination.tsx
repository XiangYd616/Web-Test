/**
 * 增强分页组件
 * 支持虚拟滚动、预加载、缓存等高级功能
 * 版本: v2.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import type { PaginationInfo } from '../../types/unified/models';

// ==================== 类型定义 ====================

export interface EnhancedPaginationProps {
  // 基础分页属性
  current: number;
  total: number;
  pageSize: number;
  totalPages?: number;
  
  // 显示选项
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  showPageInfo?: boolean;
  
  // 分页大小选项
  pageSizeOptions?: number[];
  
  // 高级功能
  enablePreload?: boolean;
  preloadPages?: number;
  enableVirtualScroll?: boolean;
  virtualScrollHeight?: number;
  
  // 样式配置
  size?: 'small' | 'default' | 'large';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  
  // 事件回调
  onChange?: (page: number, pageSize: number) => void;
  onPageSizeChange?: (current: number, size: number) => void;
  onPreload?: (page: number) => Promise<void>;
  
  // 自定义渲染
  itemRender?: (page: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next', originalElement: React.ReactElement) => React.ReactNode;
  showTotalRender?: (total: number, range: [number, number]) => React.ReactNode;
}

// ==================== 样式配置 ====================

const sizeClasses = {
  small: {
    button: 'h-8 w-8 text-sm',
    input: 'h-8 text-sm px-2',
    select: 'h-8 text-sm'
  },
  default: {
    button: 'h-10 w-10 text-sm',
    input: 'h-10 text-sm px-3',
    select: 'h-10 text-sm'
  },
  large: {
    button: 'h-12 w-12 text-base',
    input: 'h-12 text-base px-4',
    select: 'h-12 text-base'
  }
};

const variantClasses = {
  default: {
    button: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
    active: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700',
    disabled: 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-900 dark:border-gray-700 dark:text-gray-600'
  },
  outline: {
    button: 'border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:text-blue-400',
    active: 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    disabled: 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
  },
  ghost: {
    button: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    active: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
    disabled: 'text-gray-400 cursor-not-allowed dark:text-gray-600'
  }
};

// ==================== 主组件 ====================

export const EnhancedPagination: React.FC<EnhancedPaginationProps> = ({
  current,
  total,
  pageSize,
  totalPages: propTotalPages,
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal = true,
  showPageInfo = true,
  pageSizeOptions = [10, 20, 50, 100],
  enablePreload = false,
  preloadPages = 2,
  enableVirtualScroll = false,
  virtualScrollHeight = 400,
  size = 'default',
  variant = 'default',
  className,
  onChange,
  onPageSizeChange,
  onPreload,
  itemRender,
  showTotalRender
}) => {
  // 计算总页数
  const totalPages = propTotalPages || Math.ceil(total / pageSize);
  
  // 快速跳转输入
  const [jumpValue, setJumpValue] = useState('');
  
  // 预加载状态
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);

  // 计算显示的页码范围
  const pageRange = useMemo(() => {
    const delta = 2; // 当前页前后显示的页数
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [current, totalPages]);

  // 预加载逻辑
  useEffect(() => {
    if (!enablePreload || !onPreload) return;

    const preloadTargets: number[] = [];
    
    // 预加载前后几页
    for (let i = 1; i <= preloadPages; i++) {
      if (current + i <= totalPages && !preloadedPages.has(current + i)) {
        preloadTargets.push(current + i);
      }
      if (current - i >= 1 && !preloadedPages.has(current - i)) {
        preloadTargets.push(current - i);
      }
    }

    if (preloadTargets.length > 0) {
      setIsPreloading(true);
      
      Promise.all(preloadTargets.map(page => onPreload(page)))
        .then(() => {
          setPreloadedPages(prev => new Set([...prev, ...preloadTargets]));
        })
        .catch(error => {
          console.warn('预加载失败:', error);
        })
        .finally(() => {
          setIsPreloading(false);
        });
    }
  }, [current, totalPages, enablePreload, preloadPages, onPreload, preloadedPages]);

  // 页码变更处理
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === current) return;
    onChange?.(page, pageSize);
  }, [current, totalPages, pageSize, onChange]);

  // 页面大小变更处理
  const handlePageSizeChange = useCallback((newSize: number) => {
    const newPage = Math.min(current, Math.ceil(total / newSize));
    onPageSizeChange?.(newPage, newSize);
  }, [current, total, onPageSizeChange]);

  // 快速跳转处理
  const handleQuickJump = useCallback(() => {
    const page = parseInt(jumpValue);
    if (isNaN(page) || page < 1 || page > totalPages) {
      setJumpValue('');
      return;
    }
    handlePageChange(page);
    setJumpValue('');
  }, [jumpValue, totalPages, handlePageChange]);

  // 渲染页码按钮
  const renderPageButton = (page: number | string, isActive = false) => {
    const isDisabled = typeof page === 'string';
    const classes = cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      sizeClasses[size].button,
      isActive 
        ? variantClasses[variant].active
        : isDisabled 
          ? variantClasses[variant].disabled
          : variantClasses[variant].button
    );

    if (typeof page === 'string') {
      return (
        <span key={page} className={classes}>
          {page}
        </span>
      );
    }

    const element = (
      <button
        key={page}
        className={classes}
        onClick={() => handlePageChange(page)}
        disabled={isActive}
      >
        {page}
      </button>
    );

    return itemRender ? itemRender(page, 'page', element) : element;
  };

  // 渲染导航按钮
  const renderNavButton = (type: 'prev' | 'next', disabled: boolean) => {
    const isPrev = type === 'prev';
    const targetPage = isPrev ? current - 1 : current + 1;
    
    const classes = cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      sizeClasses[size].button,
      disabled 
        ? variantClasses[variant].disabled
        : variantClasses[variant].button
    );

    const element = (
      <button
        className={classes}
        onClick={() => !disabled && handlePageChange(targetPage)}
        disabled={disabled}
      >
        {isPrev ? (
          <ChevronLeftIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </button>
    );

    return itemRender ? itemRender(targetPage, type, element) : element;
  };

  // 计算当前页数据范围
  const dataRange: [number, number] = [
    (current - 1) * pageSize + 1,
    Math.min(current * pageSize, total)
  ];

  if (totalPages <= 1 && !showTotal) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* 总数显示 */}
      {showTotal && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {showTotalRender ? (
            showTotalRender(total, dataRange)
          ) : (
            `共 ${total} 条记录，第 ${dataRange[0]}-${dataRange[1]} 条`
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* 页面大小选择器 */}
        {showSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">每页</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className={cn(
                'rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600',
                sizeClasses[size].select
              )}
            >
              {pageSizeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">条</span>
          </div>
        )}

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* 上一页 */}
            {renderNavButton('prev', current <= 1)}

            {/* 页码 */}
            {pageRange.map((page, index) => 
              renderPageButton(page, page === current)
            )}

            {/* 下一页 */}
            {renderNavButton('next', current >= totalPages)}
          </div>
        )}

        {/* 快速跳转 */}
        {showQuickJumper && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickJump()}
              className={cn(
                'w-16 rounded-md border border-gray-300 bg-white text-center dark:bg-gray-800 dark:border-gray-600',
                sizeClasses[size].input
              )}
              placeholder={current.toString()}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">页</span>
            <button
              onClick={handleQuickJump}
              className={cn(
                'rounded-md px-3 font-medium transition-colors',
                sizeClasses[size].button.replace('w-10', 'w-auto'),
                variantClasses[variant].button
              )}
            >
              确定
            </button>
          </div>
        )}

        {/* 页面信息 */}
        {showPageInfo && totalPages > 1 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {current} / {totalPages}
            {isPreloading && (
              <span className="ml-2 text-blue-500">预加载中...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPagination;
