/**
 * 增强虚拟滚动列表组件
 * 支持大数据量、动态高度、缓存优化
 * 版本: v1.0.0
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { FixedSizeGrid as Grid, VariableSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import memoize from 'memoize-one';

// ==================== 类型定义 ====================

export interface VirtualScrollItem {
  id: string | number;
  data: any;
  height?: number;
  [key: string]: any;
}

export interface VirtualScrollProps<T extends VirtualScrollItem = VirtualScrollItem> {
  items: T[];
  itemHeight?: number | ((index: number, item: T) => number);
  containerHeight?: number;
  containerWidth?: number;
  overscan?: number;
  threshold?: number;
  loadMoreItems?: (startIndex: number, stopIndex: number) => Promise<void>;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  renderItem: (props: {
    index: number;
    item: T;
    style: React.CSSProperties;
    isScrolling?: boolean;
  }) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onItemsRendered?: (visibleRange: { startIndex: number; endIndex: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  enableCache?: boolean;
  cacheSize?: number;
  estimatedItemSize?: number;
  direction?: 'vertical' | 'horizontal';
  layout?: 'list' | 'grid';
  gridColumns?: number;
  gridItemWidth?: number | ((columnIndex: number) => number);
}

export interface VirtualScrollRef {
  scrollTo: (offset: number) => void;
  scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void;
  getVisibleRange: () => { startIndex: number; endIndex: number };
  refresh: () => void;
}

// ==================== 缓存管理 ====================

class VirtualScrollCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 更新访问顺序
      this.updateAccessOrder(key);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 删除最久未访问的项
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

// ==================== 高度计算器 ====================

class ItemSizeCalculator {
  private sizeCache = new Map<number, number>();
  private estimatedSize: number;
  private measuredCount = 0;
  private totalMeasuredSize = 0;

  constructor(estimatedSize: number = 50) {
    this.estimatedSize = estimatedSize;
  }

  getSize(index: number): number {
    return this.sizeCache.get(index) || this.getEstimatedSize();
  }

  setSize(index: number, size: number): void {
    const oldSize = this.sizeCache.get(index);
    this.sizeCache.set(index, size);

    if (oldSize === undefined) {
      this.measuredCount++;
      this.totalMeasuredSize += size;
    } else {
      this.totalMeasuredSize += size - oldSize;
    }
  }

  getEstimatedSize(): number {
    if (this.measuredCount === 0) {
      return this.estimatedSize;
    }
    return Math.round(this.totalMeasuredSize / this.measuredCount);
  }

  clear(): void {
    this.sizeCache.clear();
    this.measuredCount = 0;
    this.totalMeasuredSize = 0;
  }
}

// ==================== 主组件 ====================

export const VirtualScrollList = forwardRef<VirtualScrollRef, VirtualScrollProps>(
  <T extends VirtualScrollItem = VirtualScrollItem>(
    {
      items,
      itemHeight = 50,
      containerHeight,
      containerWidth,
      overscan = 5,
      threshold = 15,
      loadMoreItems,
      hasNextPage = false,
      isNextPageLoading = false,
      renderItem,
      renderEmpty,
      renderLoading,
      onScroll,
      onItemsRendered,
      className = '',
      style,
      enableCache = true,
      cacheSize = 1000,
      estimatedItemSize = 50,
      direction = 'vertical',
      layout = 'list',
      gridColumns = 1,
      gridItemWidth = 200
    }: VirtualScrollProps<T>,
    ref
  ) => {
    const listRef = useRef<any>(null);
    const cacheRef = useRef(new VirtualScrollCache(cacheSize));
    const sizeCalculatorRef = useRef(new ItemSizeCalculator(estimatedItemSize));
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();

    // 是否为动态高度
    const isDynamicHeight = typeof itemHeight === 'function';

    // 计算项目总数（包括加载项）
    const itemCount = hasNextPage ? items.length + 1 : items.length;

    // 检查项目是否已加载
    const isItemLoaded = useCallback((index: number) => {
      return !!items[index];
    }, [items]);

    // 获取项目高度
    const getItemSize = useCallback((index: number) => {
      if (typeof itemHeight === 'function') {
        const item = items[index];
        if (item) {
          return itemHeight(index, item);
        }
        return sizeCalculatorRef.current.getEstimatedSize();
      }
      return itemHeight as number;
    }, [itemHeight, items]);

    // 缓存的渲染函数
    const createItemRenderer = memoize((
      renderItemFn: typeof renderItem,
      itemsData: T[],
      isScrollingState: boolean,
      cache: VirtualScrollCache<React.ReactNode>
    ) => {
      return ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const cacheKey = `${index}-${isScrollingState}`;
        
        if (enableCache) {
          const cached = cache.get(cacheKey);
          if (cached) {
            return cached;
          }
        }

        let content: React.ReactNode;

        if (!isItemLoaded(index)) {
          // 渲染加载项
          content = renderLoading ? renderLoading() : (
            <div style={style} className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-400">加载中...</span>
            </div>
          );
        } else {
          const item = itemsData[index];
          content = renderItemFn({
            index,
            item,
            style,
            isScrolling: isScrollingState
          });
        }

        if (enableCache) {
          cache.set(cacheKey, content);
        }

        return content;
      };
    });

    // 处理滚动事件
    const handleScroll = useCallback(({ scrollTop, scrollLeft }: { scrollTop: number; scrollLeft: number }) => {
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      onScroll?.(scrollTop, scrollLeft);
    }, [onScroll]);

    // 处理可见项变化
    const handleItemsRendered = useCallback((props: any) => {
      const { visibleStartIndex, visibleStopIndex } = props;
      onItemsRendered?.({ startIndex: visibleStartIndex, endIndex: visibleStopIndex });
    }, [onItemsRendered]);

    // 暴露的方法
    useImperativeHandle(ref, () => ({
      scrollTo: (offset: number) => {
        listRef.current?.scrollTo(offset);
      },
      scrollToItem: (index: number, align = 'auto') => {
        listRef.current?.scrollToItem(index, align);
      },
      getVisibleRange: () => {
        // 这里需要根据实际的react-window API来实现
        return { startIndex: 0, endIndex: 0 };
      },
      refresh: () => {
        cacheRef.current.clear();
        sizeCalculatorRef.current.clear();
        listRef.current?.resetAfterIndex?.(0);
      }
    }), []);

    // 渲染器
    const itemRenderer = createItemRenderer(
      renderItem,
      items,
      isScrolling,
      cacheRef.current
    );

    // 清理定时器
    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    // 空状态渲染
    if (items.length === 0 && !hasNextPage) {
      return (
        <div className={`flex items-center justify-center h-64 ${className}`} style={style}>
          {renderEmpty ? renderEmpty() : (
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <div>暂无数据</div>
            </div>
          )}
        </div>
      );
    }

    // 网格布局
    if (layout === 'grid') {
      const GridComponent = isDynamicHeight ? VariableSizeGrid : Grid;
      
      return (
        <div className={className} style={style}>
          <AutoSizer>
            {({ height, width }) => (
              <GridComponent
                ref={listRef}
                height={containerHeight || height}
                width={containerWidth || width}
                columnCount={gridColumns}
                rowCount={Math.ceil(itemCount / gridColumns)}
                columnWidth={typeof gridItemWidth === 'function' ? gridItemWidth : () => gridItemWidth}
                rowHeight={isDynamicHeight ? getItemSize : itemHeight as number}
                onScroll={handleScroll}
                overscanRowCount={overscan}
                overscanColumnCount={1}
              >
                {({ columnIndex, rowIndex, style }) => {
                  const index = rowIndex * gridColumns + columnIndex;
                  if (index >= itemCount) return null;
                  return itemRenderer({ index, style });
                }}
              </GridComponent>
            )}
          </AutoSizer>
        </div>
      );
    }

    // 列表布局
    const ListComponent = isDynamicHeight ? VariableSizeList : List;

    if (loadMoreItems) {
      // 无限滚动列表
      return (
        <div className={className} style={style}>
          <AutoSizer>
            {({ height, width }) => (
              <InfiniteLoader
                isItemLoaded={isItemLoaded}
                itemCount={itemCount}
                loadMoreItems={loadMoreItems}
                threshold={threshold}
              >
                {({ onItemsRendered: onItemsRenderedInfinite, ref: infiniteRef }) => (
                  <ListComponent
                    ref={(list: any) => {
                      listRef.current = list;
                      infiniteRef(list);
                    }}
                    height={containerHeight || height}
                    width={containerWidth || width}
                    itemCount={itemCount}
                    itemSize={isDynamicHeight ? getItemSize : itemHeight as number}
                    onItemsRendered={onItemsRenderedInfinite}
                    onScroll={handleScroll}
                    overscanCount={overscan}
                    direction={direction}
                  >
                    {itemRenderer}
                  </ListComponent>
                )}
              </InfiniteLoader>
            )}
          </AutoSizer>
        </div>
      );
    }

    // 普通虚拟列表
    return (
      <div className={className} style={style}>
        <AutoSizer>
          {({ height, width }) => (
            <ListComponent
              ref={listRef}
              height={containerHeight || height}
              width={containerWidth || width}
              itemCount={itemCount}
              itemSize={isDynamicHeight ? getItemSize : itemHeight as number}
              onItemsRendered={handleItemsRendered}
              onScroll={handleScroll}
              overscanCount={overscan}
              direction={direction}
            >
              {itemRenderer}
            </ListComponent>
          )}
        </AutoSizer>
      </div>
    );
  }
);

VirtualScrollList.displayName = 'VirtualScrollList';

// ==================== Hook封装 ====================

export function useVirtualScroll<T extends VirtualScrollItem>(
  items: T[],
  options: {
    itemHeight?: number | ((index: number, item: T) => number);
    containerHeight?: number;
    overscan?: number;
    enableCache?: boolean;
  } = {}
) {
  const {
    itemHeight = 50,
    containerHeight = 400,
    overscan = 5,
    enableCache = true
  } = options;

  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  const [isScrolling, setIsScrolling] = useState(false);

  const handleItemsRendered = useCallback((range: { startIndex: number; endIndex: number }) => {
    setVisibleRange(range);
  }, []);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
  }, []);

  return {
    visibleRange,
    isScrolling,
    handleItemsRendered,
    handleScroll,
    VirtualScrollList: (props: Omit<VirtualScrollProps<T>, 'items' | 'itemHeight' | 'containerHeight' | 'overscan' | 'enableCache'>) => (
      <VirtualScrollList
        items={items}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        overscan={overscan}
        enableCache={enableCache}
        onItemsRendered={handleItemsRendered}
        onScroll={handleScroll}
        {...props}
      />
    )
  };
}

export default VirtualScrollList;
