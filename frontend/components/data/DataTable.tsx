/**
 * 完整的数据表格组件
 * 提供排序、筛选、分页、导出、选择等功能的专业数据表格
 * 支持虚拟滚动、响应式设计和自定义渲染
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// 数据表格列定义
export interface DataTableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  fixed?: 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: (a: T, b: T) => number;
  filters?: Array<{ text: string; value: any }>;
  filterMultiple?: boolean;
  onFilter?: (value: any, record: T) => boolean;
}

// 排序配置
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// 筛选配置
export interface FilterConfig {
  [key: string]: any[];
}

// 分页配置
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  pageSizeOptions?: number[];
}

// 选择配置
export interface SelectionConfig<T> {
  type?: 'checkbox' | 'radio';
  selectedRowKeys?: React.Key[];
  onChange?: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
  onSelect?: (record: T, selected: boolean, selectedRows: T[], nativeEvent: Event) => void;
  onSelectAll?: (selected: boolean, selectedRows: T[], changeRows: T[]) => void;
  getCheckboxProps?: (record: T) => { disabled?: boolean; name?: string };
}

// 数据表格属性
export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T) => React.Key);
  loading?: boolean;
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  showHeader?: boolean;
  pagination?: PaginationConfig | false;
  selection?: SelectionConfig<T>;
  scroll?: { x?: number | string; y?: number | string };
  expandable?: {
    expandedRowRender?: (record: T, index: number) => React.ReactNode;
    expandedRowKeys?: React.Key[];
    onExpand?: (expanded: boolean, record: T) => void;
    onExpandedRowsChange?: (expandedKeys: React.Key[]) => void;
  };
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  className?: string;
  style?: React.CSSProperties;
  // 事件回调
  onChange?: (pagination: PaginationConfig, filters: FilterConfig, sorter: SortConfig) => void;
  onSearch?: (value: string) => void;
  onExport?: (data: T[], format: 'csv' | 'excel' | 'json') => void;
}

// 工具函数
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((value, key) => value?.[key], obj);
};

const exportToCSV = (data: any[], filename: string = 'data.csv') => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const exportToJSON = (data: any[], filename: string = 'data.json') => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// 数据表格组件
export const DataTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  size = 'middle',
  bordered = false,
  showHeader = true,
  pagination = { current: 1, pageSize: 10, total: 0 },
  selection,
  scroll,
  expandable,
  onRow,
  className = '',
  style,
  onChange,
  onSearch,
  onExport
}: DataTableProps<T>) => {
  // 状态管理
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [searchValue, setSearchValue] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(
    selection?.selectedRowKeys || []
  );
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>(
    expandable?.expandedRowKeys || []
  );
  const [currentPage, setCurrentPage] = useState(pagination ? pagination.current : 1);
  const [pageSize, setPageSize] = useState(pagination ? pagination.pageSize : 10);

  const tableRef = useRef<HTMLDivElement>(null);

  // 获取行键
  const getRowKey = useCallback((record: T, index: number): React.Key => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index;
  }, [rowKey]);

  // 排序处理
  const handleSort = useCallback((column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    const newSortConfig: SortConfig = {
      key: column.key,
      direction: sortConfig?.key === column.key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    };

    setSortConfig(newSortConfig);
    onChange?.(
      pagination ? { ...pagination, current: currentPage, pageSize } : { current: 1, pageSize: 10, total: 0 },
      filterConfig,
      newSortConfig
    );
  }, [sortConfig, pagination, currentPage, pageSize, filterConfig, onChange]);

  // 筛选处理
  const handleFilter = useCallback((columnKey: string, values: any[]) => {
    const newFilterConfig = { ...filterConfig, [columnKey]: values };
    setFilterConfig(newFilterConfig);
    setCurrentPage(1); // 重置到第一页

    onChange?.(
      pagination ? { ...pagination, current: 1, pageSize } : { current: 1, pageSize: 10, total: 0 },
      newFilterConfig,
      sortConfig || { key: '', direction: 'asc' }
    );
  }, [filterConfig, pagination, pageSize, sortConfig, onChange]);

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
    onSearch?.(value);
  }, [onSearch]);

  // 选择处理
  const handleSelect = useCallback((record: T, selected: boolean, nativeEvent: Event) => {
    const key = getRowKey(record, 0);
    let newSelectedKeys: React.Key[];

    if (selection?.type === 'radio') {
      newSelectedKeys = selected ? [key] : [];
    } else {
      newSelectedKeys = selected
        ? [...selectedRowKeys, key]
        : selectedRowKeys.filter(k => k !== key);
    }

    setSelectedRowKeys(newSelectedKeys);
    const selectedRows = dataSource.filter(item => 
      newSelectedKeys.includes(getRowKey(item, 0))
    );

    selection?.onChange?.(newSelectedKeys, selectedRows);
    selection?.onSelect?.(record, selected, selectedRows, nativeEvent);
  }, [selectedRowKeys, selection, dataSource, getRowKey]);

  // 全选处理
  const handleSelectAll = useCallback((selected: boolean) => {
    const newSelectedKeys = selected 
      ? dataSource.map((item, index) => getRowKey(item, index))
      : [];
    
    setSelectedRowKeys(newSelectedKeys);
    const selectedRows = selected ? [...dataSource] : [];
    const changeRows = selected ? dataSource : dataSource.filter(item => 
      selectedRowKeys.includes(getRowKey(item, 0))
    );

    selection?.onChange?.(newSelectedKeys, selectedRows);
    selection?.onSelectAll?.(selected, selectedRows, changeRows);
  }, [dataSource, selectedRowKeys, selection, getRowKey]);

  // 展开处理
  const handleExpand = useCallback((expanded: boolean, record: T) => {
    const key = getRowKey(record, 0);
    const newExpandedKeys = expanded
      ? [...expandedRowKeys, key]
      : expandedRowKeys.filter(k => k !== key);
    
    setExpandedRowKeys(newExpandedKeys);
    expandable?.onExpand?.(expanded, record);
    expandable?.onExpandedRowsChange?.(newExpandedKeys);
  }, [expandedRowKeys, expandable, getRowKey]);

  // 分页处理
  const handlePageChange = useCallback((page: number, size?: number) => {
    const newPageSize = size || pageSize;
    setCurrentPage(page);
    if (size) setPageSize(newPageSize);

    onChange?.(
      pagination ? { ...pagination, current: page, pageSize: newPageSize } : { current: page, pageSize: newPageSize, total: 0 },
      filterConfig,
      sortConfig || { key: '', direction: 'asc' }
    );
  }, [pageSize, pagination, filterConfig, sortConfig, onChange]);

  // 导出处理
  const handleExport = useCallback((format: 'csv' | 'excel' | 'json') => {
    const exportData = processedData.map(record => {
      const exportRecord: any = {};
      columns.forEach(column => {
        if (column.dataIndex) {
          exportRecord[column.title] = getNestedValue(record, column.dataIndex as string);
        }
      });
      return exportRecord;
    });

    if (format === 'csv') {
      exportToCSV(exportData);
    } else if (format === 'json') {
      exportToJSON(exportData);
    }

    onExport?.(exportData, format);
  }, [columns, onExport]);

  // 数据处理
  const processedData = useMemo(() => {
    let result = [...dataSource];

    // 搜索过滤
    if (searchValue) {
      const searchableColumns = columns.filter(col => col.searchable);
      result = result.filter(record => 
        searchableColumns.some(column => {
          const value = column.dataIndex ? getNestedValue(record, column.dataIndex as string) : '';
          return String(value).toLowerCase().includes(searchValue.toLowerCase());
        })
      );
    }

    // 列筛选
    Object.entries(filterConfig).forEach(([columnKey, filterValues]) => {
      if (filterValues.length > 0) {
        const column = columns.find(col => col.key === columnKey);
        if (column?.onFilter) {
          result = result.filter(record => 
            filterValues.some(value => column.onFilter!(value, record))
          );
        }
      }
    });

    // 排序
    if (sortConfig) {
      const column = columns.find(col => col.key === sortConfig.key);
      if (column) {
        result.sort((a, b) => {
          if (column.sorter) {
            return sortConfig.direction === 'asc' 
              ? column.sorter(a, b) 
              : column.sorter(b, a);
          }
          
          const aValue = column.dataIndex ? getNestedValue(a, column.dataIndex as string) : '';
          const bValue = column.dataIndex ? getNestedValue(b, column.dataIndex as string) : '';
          
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [dataSource, searchValue, filterConfig, sortConfig, columns]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedData.slice(start, end);
  }, [processedData, pagination, currentPage, pageSize]);

  // 表格尺寸类名
  const sizeClass = {
    small: 'table-small',
    middle: 'table-middle',
    large: 'table-large'
  }[size];

  return (
    <div className={`data-table ${className}`} style={style} ref={tableRef}>
      {/* 表格工具栏 */}
      <div className="table-toolbar flex justify-between items-center mb-4">
        <div className="table-actions flex items-center gap-2">
          {/* 搜索框 */}
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {/* 导出按钮 */}
          <div className="export-buttons flex gap-1">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              导出CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              导出JSON
            </button>
          </div>
        </div>

        {/* 表格信息 */}
        <div className="table-info text-sm text-gray-600">
          {selection && selectedRowKeys.length > 0 && (
            <span className="mr-4">已选择 {selectedRowKeys.length} 项</span>
          )}
          <span>共 {processedData.length} 条记录</span>
        </div>
      </div>

      {/* 表格容器 */}
      <div className={`table-container ${bordered ? 'bordered' : ''} ${sizeClass}`}>
        <div className="table-wrapper" style={scroll}>
          <table className="w-full">
            {/* 表头 */}
            {showHeader && (
              <thead className="bg-gray-50">
                <tr>
                  {/* 选择列 */}
                  {selection && (
                    <th className="table-cell-selection">
                      {selection.type !== 'radio' && (
                        <input
                          type="checkbox"
                          checked={selectedRowKeys.length === dataSource.length && dataSource.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      )}
                    </th>
                  )}
                  
                  {/* 展开列 */}
                  {expandable && (
                    <th className="table-cell-expand w-12"></th>
                  )}
                  
                  {/* 数据列 */}
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`table-cell ${column.align ? `text-${column.align}` : ''} ${
                        column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      style={{ 
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth
                      }}
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.title}</span>
                        {column.sortable && (
                          <div className="sort-indicators">
                            <span className={`sort-asc ${
                              sortConfig?.key === column.key && sortConfig.direction === 'asc' 
                                ? 'text-blue-500' : 'text-gray-300'
                            }`}>▲</span>
                            <span className={`sort-desc ${
                              sortConfig?.key === column.key && sortConfig.direction === 'desc' 
                                ? 'text-blue-500' : 'text-gray-300'
                            }`}>▼</span>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* 表体 */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)}>
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-gray-500">加载中...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)}>
                    <div className="text-center py-8 text-gray-500">
                      暂无数据
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, index) => {
                  const key = getRowKey(record, index);
                  const isSelected = selectedRowKeys.includes(key);
                  const isExpanded = expandedRowKeys.includes(key);
                  const rowProps = onRow?.(record, index) || {};

                  return (
                    <React.Fragment key={key}>
                      <tr
                        className={`table-row ${isSelected ? 'selected' : ''} hover:bg-gray-50`}
                        {...rowProps}
                      >
                        {/* 选择列 */}
                        {selection && (
                          <td className="table-cell-selection">
                            <input
                              type={selection.type || 'checkbox'}
                              checked={isSelected}
                              onChange={(e) => handleSelect(record, e.target.checked, e.nativeEvent)}
                              {...(selection.getCheckboxProps?.(record) || {})}
                            />
                          </td>
                        )}
                        
                        {/* 展开列 */}
                        {expandable && (
                          <td className="table-cell-expand">
                            <button
                              onClick={() => handleExpand(!isExpanded, record)}
                              className="expand-button"
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          </td>
                        )}
                        
                        {/* 数据列 */}
                        {columns.map((column) => {
                          const value = column.dataIndex ? getNestedValue(record, column.dataIndex as string) : '';
                          const cellContent = column.render ? column.render(value, record, index) : value;
                          
                          return (
                            <td
                              key={column.key}
                              className={`table-cell ${column.align ? `text-${column.align}` : ''} ${
                                column.ellipsis ? 'truncate' : ''
                              }`}
                              style={{ 
                                width: column.width,
                                minWidth: column.minWidth,
                                maxWidth: column.maxWidth
                              }}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                      
                      {/* 展开行 */}
                      {expandable && isExpanded && expandable.expandedRowRender && (
                        <tr className="expanded-row">
                          <td colSpan={columns.length + (selection ? 1 : 0) + 1}>
                            {expandable.expandedRowRender(record, index)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页器 */}
      {pagination && (
        <div className="table-pagination flex justify-between items-center mt-4">
          <div className="pagination-info text-sm text-gray-600">
            {pagination.showTotal && (
              <span>
                显示 {(currentPage - 1) * pageSize + 1} 到{' '}
                {Math.min(currentPage * pageSize, processedData.length)} 条，
                共 {processedData.length} 条记录
              </span>
            )}
          </div>
          
          <div className="pagination-controls flex items-center gap-2">
            {pagination.showSizeChanger && (
              <select
                value={pageSize}
                onChange={(e) => handlePageChange(1, Number(e.target.value))}
                className="px-2 py-1 border rounded"
              >
                {(pagination.pageSizeOptions || [10, 20, 50, 100]).map(size => (
                  <option key={size} value={size}>{size} 条/页</option>
                ))}
              </select>
            )}
            
            <div className="page-buttons flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              {/* 页码按钮 */}
              {Array.from({ length: Math.ceil(processedData.length / pageSize) }, (_, i) => i + 1)
                .filter(page => {
                  const totalPages = Math.ceil(processedData.length / pageSize);
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 2) return true;
                  return false;
                })
                .map((page, index, array) => {
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-2">...</span>}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 border rounded ${
                          page === currentPage 
                            ? 'bg-blue-500 text-white border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(processedData.length / pageSize)}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
            
            {pagination.showQuickJumper && (
              <div className="quick-jumper flex items-center gap-2">
                <span className="text-sm">跳至</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(processedData.length / pageSize)}
                  className="w-16 px-2 py-1 border rounded text-center"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const page = Number((e.target as HTMLInputElement).value);
                      if (page >= 1 && page <= Math.ceil(processedData.length / pageSize)) {
                        handlePageChange(page);
                      }
                    }
                  }}
                />
                <span className="text-sm">页</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
