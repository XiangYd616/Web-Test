/**
 * 虚拟滚动组件
 * 支持大数据量列表的高性能渲染
 * 版本: v2.0.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// 虚拟滚动配置接口
export interface VirtualScrollConfig {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number; // 预渲染的额外项目数量
  scrollBehavior?: 'auto' | 'smooth';
  threshold?: number; // 滚动阈值
  enableHorizontal?: boolean; // 是否启用横向滚动
  itemWidth?: number | ((index: number) => number);
  containerWidth?: number;
}

// 虚拟滚动属性
export interface VirtualScrollProps<T> extends VirtualScrollConfig {
  data: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number, scrollLeft?: number) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

// 可见范围接口
export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
}

/**
 * 计算可见范围
 */
function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number | ((index: number) => number),
  totalItems: number,
  overscan: number = 5
): VisibleRange {
  if (typeof itemHeight === 'number') {
    
        // 固定高度
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItems = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems);
    
    return { startIndex, endIndex, visibleItems
      };
  } else {
    // 动态高度 - 简化实现，实际项目中需要更复杂的计算
    const startIndex = Math.max(0, Math.floor(scrollTop / 50) - overscan);
    const visibleItems = Math.ceil(containerHeight / 50) + overscan * 2;
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems);
    
    return { startIndex, endIndex, visibleItems };
  }
}

/**
 * 计算总高度
 */
function calculateTotalHeight(
  itemCount: number,
  itemHeight: number | ((index: number) => number)
): number {
  if (typeof itemHeight === 'number') {
    
        return itemCount * itemHeight;
      } else {
    // 动态高度 - 简化实现
    let totalHeight = 0;
    for (let i = 0; i < itemCount; i++) {
      totalHeight += itemHeight(i);
    }
    return totalHeight;
  }
}

/**
 * 计算项目偏移量
 */
function calculateItemOffset(
  index: number,
  itemHeight: number | ((index: number) => number)
): number {
  if (typeof itemHeight === 'number') {
    
        return index * itemHeight;
      } else {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += itemHeight(i);
    }
    return offset;
  }
}

/**
 * 虚拟滚动组件
 */
export const VirtualScroll = <T,>({
  data,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  scrollBehavior = 'auto',
  threshold = 100,
  enableHorizontal = false,
  itemWidth,
  containerWidth,
  className = '',
  style,
  onScroll,
  onVisibleRangeChange,
  loadMore,
  hasMore = false,
  loading = false,
  loadingComponent,
  emptyComponent
}: VirtualScrollProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 计算可见范围
  const visibleRange = useMemo(() => 
    calculateVisibleRange(scrollTop, containerHeight, itemHeight, data.length, overscan),
    [scrollTop, containerHeight, itemHeight, data.length, overscan]
  );
  
  // 计算总尺寸
  const totalHeight = useMemo(() => 
    calculateTotalHeight(data.length, itemHeight),
    [data.length, itemHeight]
  );
  
  const totalWidth = useMemo(() => {
    if (!enableHorizontal || !itemWidth) return 0;
    return calculateTotalHeight(data.length, itemWidth);
  }, [enableHorizontal, itemWidth, data.length]);
  
  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;
    
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
    setIsScrolling(true);
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 设置新的定时器
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    onScroll?.(newScrollTop, newScrollLeft);
    
    // 检查是否需要加载更多
    if (loadMore && hasMore && !loading) {
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      const scrollPosition = newScrollTop + clientHeight;
      
      if (scrollHeight - scrollPosition < threshold) {
        loadMore();
      }
    }
  }, [onScroll, loadMore, hasMore, loading, threshold]);
  
  // 可见范围变化通知
  useEffect(() => {
    onVisibleRangeChange?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange.startIndex, visibleRange.endIndex, onVisibleRangeChange]);
  
  // 滚动到指定位置
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = scrollBehavior) => {
    if (!containerRef.current) return;
    
    const offset = calculateItemOffset(index, itemHeight);
    containerRef.current.scrollTo({
      top: offset,
      behavior
    });
  }, [itemHeight, scrollBehavior]);
  
  // 滚动到顶部
  const scrollToTop = useCallback((behavior: ScrollBehavior = scrollBehavior) => {
    if (!containerRef.current) return;
    
    containerRef.current.scrollTo({
      top: 0,
      behavior
    });
  }, [scrollBehavior]);
  
  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = scrollBehavior) => {
    if (!containerRef.current) return;
    
    containerRef.current.scrollTo({
      top: totalHeight,
      behavior
    });
  }, [totalHeight, scrollBehavior]);
  
  // 渲染可见项目
  const renderVisibleItems = useCallback(() => {
    const items: React.ReactNode[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= data.length) break;
      
      const item = data[i];
      const top = calculateItemOffset(i, itemHeight);
      const height = typeof itemHeight === 'number' ? itemHeight : itemHeight(i);
      
      let left = 0;
      let width = '100%';
      
      if (enableHorizontal && itemWidth) {
        left = calculateItemOffset(i, itemWidth);
        width = typeof itemWidth === 'number' ? itemWidth : itemWidth(i);
      }
      
      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        top,
        left,
        width,
        height,
        transform: isScrolling ? 'translateZ(0)' : undefined // 硬件加速
      };
      
      items.push(
        <div key={i} style={itemStyle}>
          {renderItem(item, i, itemStyle)}
        </div>
      );
    }
    
    return items;
  }, [
    visibleRange,
    data,
    itemHeight,
    itemWidth,
    enableHorizontal,
    isScrolling,
    renderItem
  ]);
  
  // 如果没有数据且有空状态组件
  if (data.length === 0 && emptyComponent) {
    
        return (
      <div 
        className={`flex items-center justify-center ${className
      }`}
        style={{ height: containerHeight, ...style }}
      >
        {emptyComponent}
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
        ...style
      }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div
        style={{
          height: totalHeight,
          width: enableHorizontal ? totalWidth : '100%',
          position: 'relative'
        }}
      >
        {/* 可见项目 */}
        {renderVisibleItems()}
        
        {/* 加载更多指示器 */}
        {loading && loadingComponent && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            {loadingComponent}
          </div>
        )}
      </div>
    </div>
  );
};

// 导出滚动控制方法的Hook
export function useVirtualScrollControl() {
  const scrollRef = useRef<{
    scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
    scrollToTop: (behavior?: ScrollBehavior) => void;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
  }>();
  
  const setScrollMethods = useCallback((methods: typeof scrollRef.current) => {
    scrollRef.current = methods;
  }, []);
  
  return {
    scrollToIndex: useCallback((index: number, behavior?: ScrollBehavior) => {
      scrollRef.current?.scrollToIndex(index, behavior);
    }, []),
    scrollToTop: useCallback((behavior?: ScrollBehavior) => {
      scrollRef.current?.scrollToTop(behavior);
    }, []),
    scrollToBottom: useCallback((behavior?: ScrollBehavior) => {
      scrollRef.current?.scrollToBottom(behavior);
    }, []),
    setScrollMethods
  };
}

export default VirtualScroll;
