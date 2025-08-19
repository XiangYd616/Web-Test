import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import ResultCard from './ResultCard';

interface TestResult {
  id: string;
  type: string;
  name: string;
  score: number;
  status: 'success' | 'warning' | 'error';
  startedAt: string;
  completedAt?: string;
  metrics: Record<string, any>;
}

interface ResultListProps {
  /** 测试结果数据 */
  results: TestResult[];
  /** 是否加载中 */
  loading?: boolean;
  /** 错误信息 */
  error?: string;
  /** 每页显示数量 */
  pageSize?: number;
  /** 是否启用虚拟滚动 */
  virtual?: boolean;
  /** 容器高度（虚拟滚动时使用） */
  height?: number;
  /** 项目高度（虚拟滚动时使用） */
  itemHeight?: number;
  /** 点击结果项的回调 */
  onResultClick?: (result: TestResult) => void;
  /** 删除结果的回调 */
  onResultDelete?: (id: string) => void;
  /** 自定义类名 */
  className?: string;
}

export const ResultList: React.FC<ResultListProps> = memo(({
  results,
  loading = false,
  error,
  pageSize = 20,
  virtual = false,
  height = 400,
  itemHeight = 120,
  onResultClick,
  onResultDelete,
  className = ''
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: pageSize });
  const [scrollTop, setScrollTop] = useState(0);

  // 计算虚拟滚动的可见项目
  const visibleItems = useMemo(() => {
    if (!virtual) {
      return results.slice(0, visibleRange.end);
    }

    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(height / itemHeight) + 1,
      results.length
    );

    return results.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index
    }));
  }, [results, virtual, scrollTop, itemHeight, height, visibleRange.end]);

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // 非虚拟滚动的无限加载
    if (!virtual) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        setVisibleRange(prev => ({
          ...prev,
          end: Math.min(prev.end + pageSize, results.length)
        }));
      }
    }
  }, [virtual, pageSize, results.length]);

  // 重置可见范围当结果变化时
  useEffect(() => {
    setVisibleRange({ start: 0, end: pageSize });
    setScrollTop(0);
  }, [results, pageSize]);

  // 渲染加载状态
  if (loading && results.length === 0) {
    return (
      <div className={`result-list-loading ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className={`result-list-error ${className}`}>
        <div className="text-center p-8 text-red-600">
          <div className="text-lg font-medium mb-2">加载失败</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // 渲染空状态
  if (results.length === 0) {
    return (
      <div className={`result-list-empty ${className}`}>
        <div className="text-center p-8 text-gray-500">
          <div className="text-lg font-medium mb-2">暂无测试结果</div>
          <div className="text-sm">开始您的第一个测试吧</div>
        </div>
      </div>
    );
  }

  // 虚拟滚动渲染
  if (virtual) {
    const totalHeight = results.length * itemHeight;
    const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight;

    return (
      <div className={`result-list-virtual ${className}`}>
        <div
          className="overflow-auto"
          style={{ height: `${height}px` }}
          onScroll={handleScroll}
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {visibleItems.map((result) => (
                <div
                  key={result.id}
                  style={{ height: `${itemHeight}px` }}
                  className="p-2"
                >
                  <ResultCard
                    result={result}
                    onClick={() => onResultClick?.(result)}
                    onDelete={() => onResultDelete?.(result.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 普通滚动渲染
  return (
    <div className={`result-list ${className}`}>
      <div
        className="space-y-4 max-h-96 overflow-y-auto"
        onScroll={handleScroll}
      >
        {visibleItems.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            onClick={() => onResultClick?.(result)}
            onDelete={() => onResultDelete?.(result.id)}
          />
        ))}
        
        {/* 加载更多指示器 */}
        {loading && visibleRange.end < results.length && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">加载更多...</span>
          </div>
        )}
        
        {/* 已加载全部指示器 */}
        {visibleRange.end >= results.length && results.length > pageSize && (
          <div className="text-center p-4 text-gray-500 text-sm">
            已显示全部 {results.length} 条结果
          </div>
        )}
      </div>
    </div>
  );
});

ResultList.displayName = 'ResultList';

// 结果列表的筛选和排序组件
interface ResultListFiltersProps {
  /** 当前筛选条件 */
  filters: {
    type?: string;
    status?: string;
    dateRange?: [string, string];
  };
  /** 当前排序 */
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  /** 筛选变化回调 */
  onFiltersChange: (filters: any) => void;
  /** 排序变化回调 */
  onSortChange: (sort: any) => void;
  /** 可用的测试类型 */
  testTypes?: string[];
}

export const ResultListFilters: React.FC<ResultListFiltersProps> = ({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  testTypes = ['stress', 'performance', 'security', 'api']
}) => {
  return (
    <div className="result-list-filters bg-white p-4 border-b border-gray-200">
      <div className="flex flex-wrap gap-4 items-center">
        {/* 测试类型筛选 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">类型:</label>
          <select
            value={filters.type || ''}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">全部</option>
            {testTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">状态:</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
          </select>
        </div>

        {/* 排序 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">排序:</label>
          <select
            value={`${sort.field}-${sort.order}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              onSortChange({ field, order });
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="startedAt-desc">最新创建</option>
            <option value="startedAt-asc">最早创建</option>
            <option value="score-desc">分数最高</option>
            <option value="score-asc">分数最低</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ResultList;
