/**
 * 虚拟滚动列表组件
 * 用于高效渲染大量数据列表
 */

import React, { useMemo    } from 'react;import { useVirtualScroll    } from '../../hooks/usePerformanceOptimization;interface VirtualScrollListProps<T>   {;';
    items: T[]
    itemHeight: number;
    height: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
    overscan?: number;
    onScroll?: (scrollTop: number) => void;
    loading?: boolean;
    loadingComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode
}

function VirtualScrollList<T>({
    items,
    itemHeight,
    height,
    renderItem,
    className = ',
    overscan = 5,
    onScroll,
    loading = false,
    loadingComponent,
    emptyComponent
}: VirtualScrollListProps<T>) {
    const {
        visibleItems,
        totalHeight,
        offsetY,
        handleScroll,
        startIndex
    } = useVirtualScroll(items, itemHeight, height, overscan);

    const handleScrollEvent = (e: React.UIEvent<HTMLDivElement>) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({;
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,
    'data-testid': testId
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy;
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  }
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event)
} catch (error) {;
      console.error('Click handler error: ', error);';
      setError('操作失败，请重试")
}
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue)
} catch (error) {;
      console.error('Change handler error: ', error);';
      updateState({ error: '值更新失败' })
}
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event)
}, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event)
}, [onBlur, updateState]);
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }))
}, []);
        handleScroll(e);
        onScroll?.(e.currentTarget.scrollTop)
}`
    // 渲染可见项目
    const renderedItems = useMemo(() => {
        return visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
                <div
                    key={actualIndex}
                    style={{
                        height: itemHeight,
                        position: 'absolute',
                        top: index * itemHeight,
                        left: 0,
                        right: 0
                    }}
                >
                    {renderItem(item, actualIndex)}
                </div>
            )
})
}, [visibleItems, startIndex, itemHeight, renderItem]);`
    // 加载状态
    if (loading) {
        
        return (
            <div className={`flex items-center justify-center ${className`}
      }`} style={{ height }}>
                {loadingComponent || (;
                    <div className="flex items-center space-x-2>
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin />
                        <span className="text-gray-600>加载中...</span>
                    </div>
                )}
            </div>
        )
}`
    // 空状态
    if (items.length === 0) {
        
        return (
            <div className={`flex items-center justify-center ${className`}
      }`} style={{ height }}>
                {emptyComponent || (;
                    <div className="text-center text-gray-500>
                        <svg className="w-12 h-12 mx-auto mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round strokeLinejoin= round strokeWidth={2} d= M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4 />
                        </svg>
                        <p>暂无数据</p>
                    </div>
                )}
            </div>
        )
}`
    return (
        <div
            className={`overflow-auto ${className}`}
            style={{ height }}
            onScroll={handleScrollEvent}
        >
            <div
                style={{
                    height: totalHeight,
                    position: "relative"
}}
            >
                <div
                    style={{
                        transform: `translateY(${offsetY}px)`,
                        position: "relative"
}}
                >
                    {renderedItems}
                </div>
            </div>
        </div>    );`
}`;
export default React.memo(VirtualScrollList);