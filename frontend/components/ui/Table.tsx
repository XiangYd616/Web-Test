import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cn } from '../../utils/cn';
// 表格列定义接口
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  className?: string;
}

// 表格属性接口
export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    onChange?: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: T) => string);
  rowSelection?: {
    selectedRowKeys?: string[];
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
  onRow?: (
    record: T,
    index: number
  ) => {
    onClick?: () => void;
    onDoubleClick?: () => void;
    className?: string;
  };
  scroll?: {
    x?: number | string;
    y?: number | string;
  };
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  showHeader?: boolean;
  className?: string;
  emptyText?: React.ReactNode;
}

// 排序状态类型
type SortOrder = 'ascend' | 'descend' | null;

// 表格组件
export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  rowKey = 'id',
  rowSelection,
  onRow,
  scroll,
  size = 'middle',
  bordered = false,
  showHeader = true,
  className,
  emptyText = '暂无数据',
}: TableProps<T>) => {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 获取行键值
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // 处理排序
  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    const field = column.dataIndex || column.key;

    if (sortField === field) {
      // 切换排序顺序：升序 -> 降序 -> 无排序
      if (sortOrder === 'ascend') {
        setSortOrder('descend');
      } else if (sortOrder === 'descend') {
        setSortOrder(null);
        setSortField(null);
      } else {
        setSortOrder('ascend');
      }
    } else {
      setSortField(field);
      setSortOrder('ascend');
    }
  };

  // 处理筛选
  const _handleFilter = (column: TableColumn<T>, value: string) => {
    const field = column.dataIndex || column.key;
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 排序和筛选数据
  const processedData = useMemo(() => {
    let result = [...data];

    // 应用筛选
    Object.entries(filters).forEach(([field, value]) => {
      if (value) {
        result = result.filter(record => {
          const fieldValue = record[field];
          return String(fieldValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    // 应用排序
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortOrder === 'ascend' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortField, sortOrder]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;

    const { current, pageSize } = pagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;

    return processedData.slice(start, end);
  }, [processedData, pagination]);

  // 表格尺寸样式
  const sizeClasses = {
    small: 'text-xs',
    middle: 'text-sm',
    large: 'text-base',
  };

  // 单元格内边距
  const cellPadding = {
    small: 'px-2 py-1',
    middle: 'px-3 py-2',
    large: 'px-4 py-3',
  };

  // 渲染表头
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {rowSelection && (
            <th
              className={cn(
                'border-b border-gray-200 dark:border-gray-700',
                cellPadding[size],
                bordered && 'border-r'
              )}
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                onChange={e => {
                  const allKeys = paginatedData.map((record, index) => getRowKey(record, index));
                  if (e?.target.checked) {
                    rowSelection?.onChange?.(allKeys, paginatedData);
                  } else {
                    rowSelection?.onChange?.([], []);
                  }
                }}
                checked={
                  paginatedData.length > 0 &&
                  paginatedData.every((record, index) =>
                    rowSelection?.selectedRowKeys?.includes(getRowKey(record, index))
                  )
                }
              />
            </th>
          )}
          {columns.map(column => (
            <th
              key={column.key}
              className={cn(
                'border-b border-gray-200 dark:border-gray-700 text-left font-medium text-gray-900 dark:text-gray-100',
                cellPadding[size],
                bordered && 'border-r border-gray-200 dark:border-gray-700',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right',
                column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                column.className
              )}
              style={{ width: column.width }}
              onClick={() => handleSort(column)}
            >
              <div className="flex items-center gap-2">
                <span>{column.title}</span>
                {column.sortable && (
                  <div className="flex flex-col">
                    <ChevronUp
                      className={cn(
                        'w-3 h-3',
                        sortField === (column.dataIndex || column.key) && sortOrder === 'ascend'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      )}
                    />
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 -mt-1',
                        sortField === (column.dataIndex || column.key) && sortOrder === 'descend'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      )}
                    />
                  </div>
                )}
                {column.filterable && <Filter className="w-3 h-3 text-gray-400" />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  // 渲染表体
  const renderBody = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td
              colSpan={columns.length + (rowSelection ? 1 : 0)}
              className={cn('text-center text-gray-500 dark:text-gray-400', cellPadding[size])}
            >
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                加载中...
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td
              colSpan={columns.length + (rowSelection ? 1 : 0)}
              className={cn('text-center text-gray-500 dark:text-gray-400', cellPadding[size])}
            >
              {emptyText}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        {paginatedData.map((record, index) => {
          const key = getRowKey(record, index);
          const rowProps = onRow?.(record, index) || {};

          return (
            <tr
              key={key}
              className={cn(
                'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                rowProps.className
              )}
              onClick={rowProps.onClick}
              onDoubleClick={rowProps.onDoubleClick}
            >
              {rowSelection && (
                <td
                  className={cn(
                    'border-gray-200 dark:border-gray-700',
                    cellPadding[size],
                    bordered && 'border-r'
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={rowSelection?.selectedRowKeys?.includes(key) || false}
                    disabled={rowSelection?.getCheckboxProps?.(record)?.disabled}
                    onChange={e => {
                      const currentSelected = rowSelection?.selectedRowKeys || [];
                      let newSelected: string[];
                      let newSelectedRows: T[];

                      if (e?.target.checked) {
                        newSelected = [...currentSelected, key];
                        const existingRows =
                          rowSelection?.selectedRowKeys
                            ?.map(k => paginatedData.find((r, i) => getRowKey(r, i) === k))
                            .filter((r): r is T => r !== undefined) || [];
                        newSelectedRows = [...existingRows, record];
                      } else {
                        newSelected = currentSelected.filter(k => k !== key);
                        newSelectedRows = newSelected
                          .map(k => paginatedData.find((r, i) => getRowKey(r, i) === k))
                          .filter((r): r is T => r !== undefined);
                      }

                      rowSelection?.onChange?.(newSelected, newSelectedRows);
                    }}
                  />
                </td>
              )}
              {columns.map(column => {
                const dataIndex = column.dataIndex || column.key;
                const value = record[dataIndex];

                return (
                  <td
                    key={column.key}
                    className={cn(
                      'text-gray-900 dark:text-gray-100',
                      cellPadding[size],
                      bordered && 'border-r border-gray-200 dark:border-gray-700',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {column.render ? column.render(value, record, index) : value}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'overflow-auto',
          scroll?.x && 'overflow-x-auto',
          scroll?.y && 'overflow-y-auto'
        )}
        style={{ maxHeight: scroll?.y }}
      >
        <table
          className={cn(
            'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
            sizeClasses[size],
            bordered && 'border border-gray-200 dark:border-gray-700'
          )}
        >
          {renderHeader()}
          {renderBody()}
        </table>
      </div>

      {pagination && (
        <TablePagination
          current={pagination?.current}
          pageSize={pagination?.pageSize}
          total={pagination?.total}
          showSizeChanger={pagination?.showSizeChanger}
          showQuickJumper={pagination?.showQuickJumper}
          onChange={pagination?.onChange}
        />
      )}
    </div>
  );
};

// 分页组件
interface TablePaginationProps {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  current,
  pageSize,
  total,
  showSizeChanger = false,
  showQuickJumper = false,
  onChange,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (current - 1) * pageSize + 1;

  /**

   * 处理handlePageChange事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  const endItem = Math.min(current * pageSize, total);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange?.(page, pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const newPage = Math.ceil(((current - 1) * pageSize + 1) / newPageSize);
    onChange?.(newPage, newPageSize);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
        显示 {startItem} 到 {endItem} 条，共 {total} 条
      </div>

      <div className="flex items-center gap-2">
        {showSizeChanger && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 dark:text-gray-300">每页显示:</span>
            <select
              value={pageSize}
              onChange={e => handlePageSizeChange(Number(e?.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-w-[70px]"
            >
              <option value={10} className="dark:bg-gray-700 dark:text-white">
                10 条
              </option>
              <option value={20} className="dark:bg-gray-700 dark:text-white">
                20 条
              </option>
              <option value={50} className="dark:bg-gray-700 dark:text-white">
                50 条
              </option>
              <option value={100} className="dark:bg-gray-700 dark:text-white">
                100 条
              </option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(current - 1)}
            disabled={current <= 1}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            上一页
          </button>

          <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            {current} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(current + 1)}
            disabled={current >= totalPages}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            下一页
          </button>
        </div>

        {showQuickJumper && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 dark:text-gray-300">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              className="w-12 px-1 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  const page = parseInt((e?.target as HTMLInputElement).value);
                  handlePageChange(page);
                }
              }}
            />
            <span className="text-gray-700 dark:text-gray-300">页</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Table;
