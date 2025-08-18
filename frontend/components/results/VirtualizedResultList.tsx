/**
 * 虚拟化结果列表组件;
 * 用于高性能渲染大量测试结果;
 */

import React, { memo, useMemo, useCallback, useState, useEffect    } from 'react;import ResultCard from './ResultCard;interface TestResult {';
  id: string,
  type: string;
  url: string,
  score: number;
  status: 'success' | 'warning' | 'error,
  timestamp: string;
  duration: number,
  metrics: Record<string, any>
  details: any
}

interface VirtualizedResultListProps   {
  results: TestResult[],
  selectedResults: Set<string>
  showDetails: Record<string, boolean>
  onToggleSelection: (id: string) => void,
  onToggleDetails: (id: string) => void;
  onShare?: (result: TestResult) => void;
  onResultClick?: (result: TestResult) => void;
  itemHeight?: number;
  height?: number
}

interface ListItemProps   {
  index: number,
  style: React.CSSProperties;
  data: {,
  results: TestResult[]
    selectedResults: Set<string>,
  showDetails: Record<string, boolean>
    onToggleSelection: (id: string) => void,
  onToggleDetails: (id: string) => void;
    onShare?: (result: TestResult) => void;
    onResultClick?: (result: TestResult) => void
}
}

const ListItem: React.FC<ListItemProps>  = memo(({ index, style, data }) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
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
      error ? errorId: null,
      description ? descriptionId: null,
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
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => { updateState({ focused: true  });
    onFocus?.(event)
}, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => { updateState({ focused: false  });
    onBlur?.(event)
}, [onBlur, updateState]);
  const {
    results,
    selectedResults,
    showDetails,
    onToggleSelection,
    onToggleDetails,
    onShare,
    onResultClick
} = data;`
  const result = results[index]
  if (!result) return null;`
  return (
    <div style={style} className="px-2 py-1'>
      <ResultCard result={result}
        isSelected={selectedResults.has(result.id)}
        showDetails={showDetails[result.id] || false}
        onToggleSelection={onToggleSelection}
        onToggleDetails={onToggleDetails}
        onShare={onShare}
        onResultClick={onResultClick}
         />
    </div>
  )
});`;
ListItem.displayName = ListItem;
const VirtualizedResultList: React.FC<VirtualizedResultListProps>  = memo(({
  results,
  selectedResults,
  showDetails,
  onToggleSelection,
  onToggleDetails,
  onShare,
  onResultClick,
  itemHeight = 200,
  height = 600;)
}) => {
  const [containerHeight, setContainerHeight] = useState(height); // 响应式高度调整
  useEffect(() => {
    const updateHeight = () => {
      const windowHeight = window.innerHeight;
      const availableHeight = windowHeight - 300; // 减去头部和其他元素的高度
      setContainerHeight(Math.max(400, Math.min(availableHeight, height)))}
    updateHeight();
    window.addEventListener(resize, updateHeight);
    return () => window.removeEventListener(resize, updateHeight)
}, [height]); // 计算动态项目高度
  const getItemSize = useCallback((index: number) => {
    const result = results[index]
    if (!result) return itemHeight; // 基础高度
    let calculatedHeight = 180; // 如果显示详情，增加高度
    if (showDetails[result.id]) {
      const metricsCount = Object.keys(result.metrics || {}).length;
      calculatedHeight += Math.max(60, metricsCount * 24 + 40)
}`
    return calculatedHeight
}, [results, showDetails, itemHeight]); // 准备传递给列表项的数据
  const itemData = useMemo(() => ({
    results,
    selectedResults,
    showDetails,
    onToggleSelection,
    onToggleDetails,
    onShare,
    onResultClick
}), [
    results,
    selectedResults,
    showDetails,
    onToggleSelection,
    onToggleDetails,
    onShare,
    onResultClick;
  ]); // 如果结果数量较少，使用普通渲染
  if (results.length <= 20) {;
    ;
        return (<div className="space-y-4>
        {results.map((result) => (
          <ResultCard key={result.id
      }
            result={result}
            isSelected={selectedResults.has(result.id)}
            showDetails={showDetails[result.id] || false}
            onToggleSelection={onToggleSelection}
            onToggleDetails={onToggleDetails}
            onShare={onShare}
            onResultClick={onResultClick}
             />
        ))}
      </div>
    )
}`
  // 大量结果时使用虚拟化列表
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden>
      <List
        height={containerHeight}
        itemCount={results.length}
        itemSize={getItemSize}
        itemData={itemData}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800;
      >
        {ListItem}
      </List>
    </div>
  )
});`;
VirtualizedResultList.displayName = VirtualizedResultList;
export default VirtualizedResultList;`"