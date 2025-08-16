import React from 'react';
import {cn} from '../../utils/cn';
import {Table, TableColumn} from './Table';

// 原DataTable的列定义接口
export interface DataTableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// 原DataTable的属性接口
interface DataTableCompatProps<T> {
  columns: DataTableColumn<T>[];
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

function DataTableCompat<T extends Record<string, any>>({
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
}: DataTableCompatProps<T>) {

  // 转换列定义：从DataTable格式转换为Table格式
  const tableColumns: TableColumn<T>[] = columns.map(col => ({
    key: String(col.key),
    title: col.title,
    dataIndex: String(col.key),
    align: col.align || 'left',
    sortable: col.sortable || false,
    render: col.render ? (value: any, record: T, index: number) => {
      return col.render!(value, record);
    } : undefined,
    width: col.width,
    className: col.align === 'center' ? 'text-center' :
      col.align === 'right' ? 'text-right' : 'text-left'
  }));

  // 处理排序状态
  const [currentSortField, setCurrentSortField] = React.useState<string | null>(
    sortBy ? String(sortBy) : null
  );
  const [currentSortOrder, setCurrentSortOrder] = React.useState<'ascend' | 'descend' | null>(
    sortOrder === 'asc' ? 'ascend' : sortOrder === 'desc' ? 'descend' : null
  );

  // 同步外部排序状态
  React.useEffect(() => {
    setCurrentSortField(sortBy ? String(sortBy) : null);
    setCurrentSortOrder(sortOrder === 'asc' ? 'ascend' : sortOrder === 'desc' ? 'descend' : null);
  }, [sortBy, sortOrder]);

  // 处理排序变化
  const handleSortChange = (field: string | null, order: 'ascend' | 'descend' | null) => {
    if (onSort && field && order) {
      const dataTableOrder = order === 'ascend' ? 'asc' : 'desc';
      onSort(field as keyof T, dataTableOrder);
    }
  };

  // 转换行键值函数
  const getRowKey = (record: T): string => {
    if (typeof rowKey === 'function') {
      
        return rowKey(record);
      }
    return record[rowKey] || record.id?.toString() || Math.random().toString();
  };

  // 自定义空状态内容
  const emptyContent = emptyIcon ? (
    <div className="text-center py-12">
      <div className="mb-4" aria-hidden="true">{emptyIcon}</div>
      <p className="text-gray-400">{emptyText}</p>
    </div>
  ) : emptyText;

  return (
    <div className={cn(
      // 保持原DataTable的视觉风格
      'bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden',
      // 添加自定义样式类
      'datatable-compat-container',
      className
    )}>
      <Table
        columns={tableColumns}
        data={data}
        loading={loading}
        rowKey={getRowKey}
        emptyText={emptyContent}
        showHeader={true}
        size="middle"
        className={cn(
          // 自定义样式类来模拟原DataTable外观
          'datatable-compat',
          // 移除默认的Table样式
          '[&_table]:bg-transparent',
          '[&_thead]:bg-gray-700/30',
          '[&_tbody_tr]:transition-colors',
          '[&_tbody_tr:hover]:bg-gray-700/20',
          '[&_th]:border-none [&_th]:px-6 [&_th]:py-4 [&_th]:text-gray-300 [&_th]:font-medium [&_th]:text-sm',
          '[&_td]:border-none [&_td]:px-6 [&_td]:py-4 [&_td]:text-gray-100 [&_td]:text-sm',
          // 响应式样式
          'md:[&_th]:px-4 md:[&_th]:py-3 md:[&_td]:px-4 md:[&_td]:py-3',
          'sm:[&_th]:px-3 sm:[&_th]:py-2 sm:[&_td]:px-3 sm:[&_td]:py-2 sm:[&_th]:text-xs sm:[&_td]:text-xs'
        )}
      />
    </div>
  );
}

export default DataTableCompat;

// 导出类型以保持兼容性
// 向后兼容的别名
export type Column<T> = DataTableColumn<T>;
export type DataTableProps<T> = DataTableCompatProps<T>;
