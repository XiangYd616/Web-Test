import { ChevronDown, ChevronUp, SortAsc } from 'lucide-react';
import React from 'react';
import '../../styles/data-table.css';

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: keyof T, order: 'asc' | 'desc') => void;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  rowKey?: keyof T | ((record: T) => string);
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
  emptyText = '暂无数据',
  emptyIcon,
  className = '',
  rowKey = 'id'
}: DataTableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 生成网格CSS类名，避免内联样式
  const getGridClassName = (): string => {
    const columnCount = columns.length;
    if (columnCount <= 12) {
      return `grid-cols-${columnCount}`;
    }
    return 'grid-fixed-md'; // 超过12列时使用固定宽度
  };

  // 生成ARIA sort属性值
  const getAriaSortValue = (columnKey: keyof T): "ascending" | "descending" | "none" | undefined => {
    if (sortBy === columnKey) {
      return sortOrder === 'asc' ? 'ascending' : 'descending';
    }
    return columns.find(col => col.key === columnKey)?.sortable ? 'none' : undefined;
  };

  const handleSort = (key: keyof T) => {
    if (!onSort) return;

    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  const getSortIcon = (key: keyof T) => {
    if (sortBy !== key) {
      return <SortAsc className="w-4 h-4 text-gray-500" />;
    }
    return sortOrder === 'asc' ?
      <ChevronUp className="w-4 h-4 text-blue-400" /> :
      <ChevronDown className="w-4 h-4 text-blue-400" />;
  };

  if (loading) {
    return (
      <section className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden ${className}`} aria-busy="true" aria-label="加载数据表格">
        <div className="animate-pulse">
          {/* 表头骨架 */}
          <header className="bg-gray-700/30 px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-600 rounded" aria-hidden="true"></div>
              ))}
            </div>
          </header>

          {/* 表格内容骨架 */}
          <div className="divide-y divide-gray-700/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-700 rounded" aria-hidden="true"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
      {data.length === 0 ? (
        <div className="text-center py-12" role="status" aria-label="数据表格状态">
          {emptyIcon && <div className="mb-4" aria-hidden="true">{emptyIcon}</div>}
          <p className="text-gray-400">{emptyText}</p>
        </div>
      ) : (
        <div role="table" aria-label="数据表格">
          {/* 表头 */}
          <div className="bg-gray-700/30" role="rowgroup">
            <div className={`grid gap-4 px-6 py-4 ${getGridClassName()}`} role="row">
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={`flex items-center space-x-2 text-sm font-medium text-gray-300 ${column.align === 'center' ? 'justify-center' :
                    column.align === 'right' ? 'justify-end' : 'justify-start'
                    } ${column.sortable ? 'sortable-column' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  aria-sort={getAriaSortValue(column.key)}
                  role="columnheader"
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column.key);
                    }
                  }}
                >
                  <span>{column.title}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              ))}
            </div>
          </div>

          {/* 表格内容 */}
          <div className="divide-y divide-gray-700/50" role="rowgroup">
            {data.map((record, index) => (
              <div
                key={getRowKey(record, index)}
                className={`grid gap-4 px-6 py-4 hover:bg-gray-700/20 transition-colors ${getGridClassName()}`}
                role="row"
              >
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className={`text-sm ${column.align === 'center' ? 'text-center' :
                      column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    role="cell"
                  >
                    {column.render ?
                      column.render(record[column.key], record) :
                      String(record[column.key] || '-')
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
