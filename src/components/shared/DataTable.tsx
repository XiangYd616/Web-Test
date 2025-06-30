import React from 'react';
import { ChevronUp, ChevronDown, SortAsc, SortDesc } from 'lucide-react';

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
      <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
        <div className="animate-pulse">
          {/* 表头骨架 */}
          <div className="bg-gray-700/30 px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-600 rounded"></div>
              ))}
            </div>
          </div>
          
          {/* 表格内容骨架 */}
          <div className="divide-y divide-gray-700/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
      {/* 表头 */}
      <div className="bg-gray-700/30">
        <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
          {columns.map((column) => (
            <div
              key={String(column.key)}
              className={`flex items-center space-x-2 text-sm font-medium text-gray-300 ${
                column.align === 'center' ? 'justify-center' : 
                column.align === 'right' ? 'justify-end' : 'justify-start'
              } ${column.sortable ? 'cursor-pointer hover:text-white' : ''}`}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <span>{column.title}</span>
              {column.sortable && getSortIcon(column.key)}
            </div>
          ))}
        </div>
      </div>

      {/* 表格内容 */}
      {data.length === 0 ? (
        <div className="text-center py-12">
          {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
          <p className="text-gray-400">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700/50">
          {data.map((record, index) => (
            <div
              key={getRowKey(record, index)}
              className="grid gap-4 px-6 py-4 hover:bg-gray-700/20 transition-colors"
              style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}
            >
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={`text-sm ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
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
      )}
    </div>
  );
}

export default DataTable;
