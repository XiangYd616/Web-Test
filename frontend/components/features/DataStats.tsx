import { BarChart3, CheckCircle, Database, XCircle    } from 'lucide-react';import React from 'react';// StatCard组件暂时使用简单的卡片实现'
import { PaginationInfo, TestRecord    } from '../../hooks/useDataStorage.ts';interface DataStatsProps   {'
  records: TestRecord[];
  pagination: PaginationInfo;
  loading: boolean;
}

const DataStats: React.FC<DataStatsProps>  = ({ records, pagination, loading }) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,'
    'data-testid': testId'
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error: ', error);'
      setError('操作失败，请重试');'
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error: ', error);'
      updateState({ error: '值更新失败' });'
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  // 计算当前页统计
  const currentPageStats = {
    total: records.length,
    completed: records.filter(r => r.status === 'completed').length,'
    failed: records.filter(r => r.status === 'failed').length,'
    running: records.filter(r => r.status === 'running').length,'
    avgScore: records.length > 0 ?
      Math.round(
        records
          .filter(r => r.overallScore)
          .reduce((sum, r) => sum + (r.overallScore || 0), 0) /
        records.filter(r => r.overallScore).length
      ) || 0 : 0
  };

  // 计算成功率
  const successRate = currentPageStats.total > 0 ?
    ((currentPageStats.completed / currentPageStats.total) * 100).toFixed(1) : '0.0';
  return (
    <section className= 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' aria-label= '数据统计概览'>
      <StatCard title= '总记录数';
        value={pagination.total}
        subtitle={`当前页: ${currentPageStats.total}`}`
        icon={Database}
        color= "bg-blue-500/20';'`
        loading={loading}
         />

      <StatCard
        title= '成功测试';
        value={currentPageStats.completed}
        subtitle={`成功率: ${successRate}%`}`
        change={parseFloat(successRate) > 80 ? 5.2 : -2.1}
        icon={CheckCircle}
        color= "bg-green-500/20';'`
        loading={loading}
      />

      <StatCard
        title= '失败测试';
        value={currentPageStats.failed}
        subtitle={`失败率: ${(100 - parseFloat(successRate)).toFixed(1)}%`}`
        change={currentPageStats.failed > currentPageStats.completed ? 3.1 : -1.5}
        icon={XCircle}
        color= "bg-red-500/20';'`
        loading={loading}
      />

      <StatCard
        title= '平均分数';
        value={currentPageStats.avgScore}
        subtitle= '当前页平均';
        change={currentPageStats.avgScore > 70 ? 8.3 : -3.7}
        icon={BarChart3}
        color= 'bg-purple-500/20';
        loading={loading}
      />
    </section>
  );
};

export default DataStats;
