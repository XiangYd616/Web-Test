/**
 * 优化的数据表格组件;
 * 集成虚拟滚动和性能优化;
 */

import React, { useMemo, useCallback    } from 'react';import { VirtualTable    } from '../ui/VirtualTable';import { useVirtualization, useDebounce, useThrottle    } from '../../hooks/usePerformanceOptimization';import { withPerformanceOptimization    } from '../../utils/componentOptimization';interface OptimizedDataTableProps<T>   {
  data: T[];,
  columns: Array<{
    key: string;,
  title: string;
    dataIndex: keyof T;
    width?: number;
    render?: (value: any, record: T, index: number) => React.ReactNode;
  }>
  height?: number;
  rowHeight?: number;
  onRowClick?: (record: T, index: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  loading?: boolean;
  pagination?: {
    current: number;,
  pageSize: number;
    total: number;,
  onChange: (page: number, pageSize: number) => void;
  };
}

const OptimizedDataTableComponent = <T extends Record<string, any>>({
  data,;
  columns,;
  height = 400,;
  rowHeight = 50,;
  onRowClick,;
  onSort,;
  onFilter,;
  loading = false,;
  pagination;
}: OptimizedDataTableProps<T>) => {
  // 防抖搜索
  const debouncedFilter = useDebounce(onFilter, 300);

  // 节流滚动处理
  const throttledScroll = useThrottle((scrollTop: number) => {
    // 处理滚动事件
  }, 16); // 60fps

  // 优化的列配置
  const optimizedColumns = useMemo(() => {
    return columns.map(column => ({
      ...column,;)
      render: column.render ? React.memo(column.render): undefined;
    }));
  }, [columns]);

  // 优化的行点击处理
  const handleRowClick = useCallback((record: T, index: number)  => {
    onRowClick?.(record, index);
  }, [onRowClick]);

  // 优化的排序处理
  const handleSort = useCallback((column: string, direction: 'asc' | "desc') => {"
    onSort?.(column, direction);
  }, [onSort]);

  // 渲染行内容
  const renderRow = useCallback((record: T, index: number, style: React.CSSProperties) => {
    return (;
      <div
        key={index}
        style={style}
        className='table-row'
        onClick={() => handleRowClick(record, index)}
      >
        {optimizedColumns.map((column, colIndex) => (
          <div
            key={column.key}
            className='table-cell'
            style={ { width: column.width || "auto'  }}"
          >
            {column.render
              ? column.render(record[column.dataIndex], record, index);
              : record[column.dataIndex];
            }
          </div>
        ))}
      </div>
    );
  }, [optimizedColumns, handleRowClick]);

  if (loading) {
    return (;
      <div className='table-loading' style={{ height }}>
        <div className='loading-spinner'>加载中...</div>
      </div>
    );
  }

  return (<div className='optimized-data-table'>
      {/* 表头 */}
      <div className='table-header'>
        {optimizedColumns.map((column) => (
          <div
            key={column.key}
            className='table-header-cell'
            style={ { width: column.width || 'auto'  }}
            onClick={() => handleSort(column.key, 'asc')}
          >
            {column.title}
          </div>
        ))}
      </div>

      {/* 虚拟滚动表格内容 */}
      <VirtualTable columns={optimizedColumns}
        dataSource={data}
        rowHeight={rowHeight}
        containerHeight={height - 50} // 减去表头高度
        onRowClick={handleRowClick}
        rowKey='id'
         />

      {/* 分页 */}
      {pagination && (<div className='table-pagination'>
          <button
            disabled={pagination.current <= 1}
            onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
          >
            上一页;
          </button>
          <span>
            {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
          </span>
          <button
            disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
            onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
          >
            下一页;
          </button>
        </div>
      )}
    </div>
  );
};

// 应用性能优化
export const OptimizedDataTable = withPerformanceOptimization(OptimizedDataTableComponent,;
  {
    memoize: true,;
    displayName: 'OptimizedDataTable',';)'
    areEqual: (prevProps, nextProps) => {
      // 自定义比较逻辑
      return (;
        prevProps.data === nextProps.data &&;
        prevProps.columns === nextProps.columns &&;
        prevProps.loading === nextProps.loading;
      );
    }
  }
);

export default OptimizedDataTable;