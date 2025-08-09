/**
 * 虚拟滚动列表组件
 * 用于处理大数据量场景，提高渲染性能
 * 版本: v2.0.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';

// ==================== 类型定义 ====================

export interface VirtualScrollItem {
  id: string | number;
  height?: number;
  data: any;
}

export interface VirtualScrollProps<T = any> {
  // 数据源
  items: VirtualScrollItem[];
  
  // 容器配置
  height: number;
  itemHeight?: number | ((index: number, item: VirtualScrollItem) => number);
  overscan?: number; // 预渲染的额外项目数
  
  // 渲染函数
  renderItem: (item: VirtualScrollItem, index: number, style: React.CSSProperties) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  
  // 状态
  loading?: boolean;
  hasMore?: boolean;
  
  // 事件回调
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onLoadMore?: () => Promise<void>;
  onItemsRendered?: (startIndex: number, endIndex: number, visibleStartIndex: number, visibleEndIndex: number) => void;
  
  // 样式
  className?: string;
  itemClassName?: string;
  
  // 高级功能
  enableSmoothScrolling?: boolean;
  enableHorizontalScroll?: boolean;
  scrollToAlignment?: 'auto' | 'start' | 'center' | 'end';
}

interface VirtualScrollState {
  scrollTop: number;
  scrollLeft: number;
  isScrolling: boolean;
  scrollDirection: 'forward' | 'backward';
}

// ==================== 工具函数 ====================

const getItemHeight = (
  itemHeight: number | ((index: number, item: VirtualScrollItem) => number),
  index: number,
  item: VirtualScrollItem
): number => {
  if (typeof itemHeight === 'function') {
    return itemHeight(index, item);
  }
  return item.height || itemHeight;
};

const binarySearch = (
  items: VirtualScrollItem[],
  itemHeight: number | ((index: number, item: VirtualScrollItem) => number),
  targetOffset: number
): number => {
  let low = 0;
  let high = items.length - 1;
  let currentOffset = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    
    // 计算到mid位置的总偏移量
    currentOffset = 0;
    for (let i = 0; i <= mid; i++) {
      currentOffset += getItemHeight(itemHeight, i, items[i]);
    }

    if (currentOffset < targetOffset) {
      low = mid + 1;
    } else if (currentOffset > targetOffset) {
      high = mid - 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, high);
};

// ==================== 主组件 ====================

export const VirtualScrollList = <T extends any>({
  items,
  height,
  itemHeight = 50,
  overscan = 5,
  renderItem,
  renderEmpty,
  renderLoading,
  loading = false,
  hasMore = false,
  onScroll,
  onLoadMore,
  onItemsRendered,
  className,
  itemClassName,
  enableSmoothScrolling = true,
  enableHorizontalScroll = false,
  scrollToAlignment = 'auto'
}: VirtualScrollProps<T>) => {
  // 状态管理
  const [state, setState] = useState<VirtualScrollState>({
    scrollTop: 0,
    scrollLeft: 0,
    isScrolling: false,
    scrollDirection: 'forward'
  });

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTopRef = useRef(0);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return items.reduce((total, item, index) => {
      return total + getItemHeight(itemHeight, index, item);
    }, 0);
  }, [items, itemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleStartIndex: 0, visibleEndIndex: 0 };
    }

    const { scrollTop } = state;
    
    // 使用二分查找找到起始索引
    const startIndex = Math.max(0, binarySearch(items, itemHeight, scrollTop) - overscan);
    
    // 计算结束索引
    let endIndex = startIndex;
    let currentOffset = 0;
    
    // 计算到startIndex的偏移量
    for (let i = 0; i < startIndex; i++) {
      currentOffset += getItemHeight(itemHeight, i, items[i]);
    }
    
    // 继续计算直到超出可见区域
    while (endIndex < items.length && currentOffset < scrollTop + height + overscan * 50) {
      currentOffset += getItemHeight(itemHeight, endIndex, items[endIndex]);
      endIndex++;
    }
    
    endIndex = Math.min(items.length - 1, endIndex + overscan);
    
    // 计算真正可见的范围（不包括overscan）
    const visibleStartIndex = Math.max(0, binarySearch(items, itemHeight, scrollTop));
    let visibleEndIndex = visibleStartIndex;
    let visibleOffset = 0;
    
    for (let i = 0; i < visibleStartIndex; i++) {
      visibleOffset += getItemHeight(itemHeight, i, items[i]);
    }
    
    while (visibleEndIndex < items.length && visibleOffset < scrollTop + height) {
      visibleOffset += getItemHeight(itemHeight, visibleEndIndex, items[visibleEndIndex]);
      visibleEndIndex++;
    }
    
    visibleEndIndex = Math.min(items.length - 1, visibleEndIndex);

    return { startIndex, endIndex, visibleStartIndex, visibleEndIndex };
  }, [items, itemHeight, state.scrollTop, height, overscan]);

  // 计算渲染项目的偏移量
  const getItemOffset = useCallback((index: number): number => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(itemHeight, i, items[i]);
    }
    return offset;
  }, [items, itemHeight]);

  // 滚动处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    
    // 确定滚动方向
    const scrollDirection = scrollTop > lastScrollTopRef.current ? 'forward' : 'backward';
    lastScrollTopRef.current = scrollTop;

    setState(prev => ({
      ...prev,
      scrollTop,
      scrollLeft,
      isScrolling: true,
      scrollDirection
    }));

    // 调用外部滚动回调
    onScroll?.(scrollTop, scrollLeft);

    // 检查是否需要加载更多
    if (hasMore && onLoadMore && scrollDirection === 'forward') {
      const scrollPercentage = (scrollTop + height) / totalHeight;
      if (scrollPercentage > 0.8) { // 滚动到80%时触发加载更多
        onLoadMore();
      }
    }

    // 设置滚动结束标志
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isScrolling: false }));
    }, 150);
  }, [height, totalHeight, hasMore, onLoadMore, onScroll]);

  // 通知可见项目变化
  useEffect(() => {
    const { startIndex, endIndex, visibleStartIndex, visibleEndIndex } = visibleRange;
    onItemsRendered?.(startIndex, endIndex, visibleStartIndex, visibleEndIndex);
  }, [visibleRange, onItemsRendered]);

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number, alignment: 'auto' | 'start' | 'center' | 'end' = scrollToAlignment) => {
    if (!containerRef.current || index < 0 || index >= items.length) return;

    const itemOffset = getItemOffset(index);
    const itemSize = getItemHeight(itemHeight, index, items[index]);
    
    let scrollTop: number;

    switch (alignment) {
      case 'start':
        scrollTop = itemOffset;
        break;
      case 'end':
        scrollTop = itemOffset + itemSize - height;
        break;
      case 'center':
        scrollTop = itemOffset + itemSize / 2 - height / 2;
        break;
      case 'auto':
      default:
        const currentScrollTop = state.scrollTop;
        if (itemOffset < currentScrollTop) {
          scrollTop = itemOffset;
        } else if (itemOffset + itemSize > currentScrollTop + height) {
          scrollTop = itemOffset + itemSize - height;
        } else {
          return; // 已经在可见区域内
        }
        break;
    }

    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - height));
    
    if (enableSmoothScrolling) {
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    } else {
      containerRef.current.scrollTop = scrollTop;
    }
  }, [items, itemHeight, height, state.scrollTop, totalHeight, enableSmoothScrolling, scrollToAlignment, getItemOffset]);

  // 渲染可见项目
  const renderVisibleItems = () => {
    const { startIndex, endIndex } = visibleRange;
    const visibleItems: React.ReactNode[] = [];

    for (let index = startIndex; index <= endIndex; index++) {
      if (index >= items.length) break;

      const item = items[index];
      const offset = getItemOffset(index);
      const size = getItemHeight(itemHeight, index, item);

      const style: React.CSSProperties = {
        position: 'absolute',
        top: offset,
        left: 0,
        width: '100%',
        height: size,
        ...(enableSmoothScrolling && state.isScrolling && {
          pointerEvents: 'none'
        })
      };

      visibleItems.push(
        <div
          key={item.id}
          className={cn('virtual-scroll-item', itemClassName)}
          style={style}
        >
          {renderItem(item, index, style)}
        </div>
      );
    }

    return visibleItems;
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 空状态渲染
  if (items.length === 0 && !loading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {renderEmpty ? renderEmpty() : (
          <div className="text-gray-500 dark:text-gray-400">暂无数据</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'virtual-scroll-container relative overflow-auto',
        enableHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden',
        className
      )}
      style={{ height }}
      onScroll={handleScroll}
    >
      {/* 内容容器 */}
      <div
        className="virtual-scroll-content relative"
        style={{ height: totalHeight, width: '100%' }}
      >
        {renderVisibleItems()}
      </div>

      {/* 加载更多指示器 */}
      {loading && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          {renderLoading ? renderLoading() : (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>加载中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Hook封装 ====================

export interface UseVirtualScrollOptions {
  itemHeight?: number | ((index: number, item: VirtualScrollItem) => number);
  overscan?: number;
  enableSmoothScrolling?: boolean;
}

export function useVirtualScroll(
  items: VirtualScrollItem[],
  containerHeight: number,
  options: UseVirtualScrollOptions = {}
) {
  const {
    itemHeight = 50,
    overscan = 5,
    enableSmoothScrolling = true
  } = options;

  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    isScrolling: false
  });

  const scrollToItem = useCallback((index: number, alignment?: 'auto' | 'start' | 'center' | 'end') => {
    // 这里可以通过ref调用VirtualScrollList的scrollToItem方法
    console.log('Scroll to item:', index, alignment);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollToItem(0, 'start');
  }, [scrollToItem]);

  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1, 'end');
  }, [scrollToItem, items.length]);

  return {
    scrollState,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    setScrollState
  };
}

export default VirtualScrollList;
