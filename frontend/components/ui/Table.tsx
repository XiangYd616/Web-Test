import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// 表格列定义接口
export interface TableColumn<T = any> {
    key: string;
    title: string;
    dataIndex?: string;
    width?: string | number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, record: T, index: number) => React.ReactNode;
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
        onChange?: (page: number, pageSize: number) => void;
    };
    rowKey?: string | ((record: T) => string);
    rowSelection?: {
        selectedRowKeys?: string[];
        onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
        type?: 'checkbox' | 'radio';
    };
    onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
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
    className = '',
    emptyText = '暂无数据'
}: TableProps<T>) => {
    const [sortState, setSortState] = useState<{ columnKey: string; order: SortOrder }>({
        columnKey: '',
        order: null
    });
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>(
        rowSelection?.selectedRowKeys || []
    );

    // 获取行键
    const getRowKey = (record: T, index: number): string => {
        if (typeof rowKey === 'function') {
            return rowKey(record);
        }
        return record[rowKey] || index.toString();
    };

    // 处理排序
    const handleSort = (columnKey: string) => {
        const column = columns.find(col => col.key === columnKey);
        if (!column?.sortable) return;

        let newOrder: SortOrder = 'ascend';
        if (sortState.columnKey === columnKey) {
            if (sortState.order === 'ascend') {
                newOrder = 'descend';
            } else if (sortState.order === 'descend') {
                newOrder = null;
            }
        }

        setSortState({ columnKey, order: newOrder });
    };

    // 排序后的数据
    const sortedData = useMemo(() => {
        if (!sortState.order || !sortState.columnKey) {
            return data;
        }

        const column = columns.find(col => col.key === sortState.columnKey);
        if (!column) return data;

        const dataIndex = column.dataIndex || column.key;
        return [...data].sort((a, b) => {
            const aValue = a[dataIndex];
            const bValue = b[dataIndex];

            if (aValue === bValue) return 0;

            const compareResult = aValue > bValue ? 1 : -1;
            return sortState.order === 'ascend' ? compareResult : -compareResult;
        });
    }, [data, sortState, columns]);

    // 处理全选
    const handleSelectAll = (checked: boolean) => {
        const newSelectedKeys = checked
            ? sortedData.map((record, index) => getRowKey(record, index))
            : [];

        setSelectedRowKeys(newSelectedKeys);
        rowSelection?.onChange?.(newSelectedKeys, checked ? sortedData : []);
    };

    // 处理单行选择
    const handleSelectRow = (record: T, index: number, checked: boolean) => {
        const key = getRowKey(record, index);
        const newSelectedKeys = checked
            ? [...selectedRowKeys, key]
            : selectedRowKeys.filter(k => k !== key);

        setSelectedRowKeys(newSelectedKeys);

        const selectedRows = sortedData.filter((item, idx) =>
            newSelectedKeys.includes(getRowKey(item, idx))
        );

        rowSelection?.onChange?.(newSelectedKeys, selectedRows);
    };

    // 获取尺寸样式
    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'text-sm';
            case 'large':
                return 'text-base';
            default:
                return 'text-sm';
        }
    };

    // 渲染表头
    const renderHeader = () => {
        if (!showHeader) return null;

        return (
            <thead className="bg-gray-50">
                <tr>
                    {rowSelection && (
                        <th className="px-4 py-3 text-left">
                            {rowSelection.type !== 'radio' && (
                                <input
                                    type="checkbox"
                                    checked={selectedRowKeys.length === sortedData.length && sortedData.length > 0}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            )}
                        </th>
                    )}
                    {columns.map((column) => (
                        <th
                            key={column.key}
                            className={`px-4 py-3 text-${column.align || 'left'} font-medium text-gray-900 ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                                } ${column.className || ''}`}
                            style={{ width: column.width }}
                            onClick={() => column.sortable && handleSort(column.key)}
                        >
                            <div className="flex items-center space-x-1">
                                <span>{column.title}</span>
                                {column.sortable && (
                                    <div className="flex flex-col">
                                        <ChevronUp
                                            className={`w-3 h-3 ${sortState.columnKey === column.key && sortState.order === 'ascend'
                                                ? 'text-blue-600'
                                                : 'text-gray-400'
                                                }`}
                                        />
                                        <ChevronDown
                                            className={`w-3 h-3 -mt-1 ${sortState.columnKey === column.key && sortState.order === 'descend'
                                                ? 'text-blue-600'
                                                : 'text-gray-400'
                                                }`}
                                        />
                                    </div>
                                )}
                                {column.filterable && (
                                    <Filter className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                )}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
        );
    };

    // 渲染表格行
    const renderRows = () => {
        if (loading) {
            return (
                <tbody>
                    <tr>
                        <td
                            colSpan={columns.length + (rowSelection ? 1 : 0)}
                            className="px-4 py-8 text-center text-gray-500"
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>加载中...</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            );
        }

        if (sortedData.length === 0) {
            return (
                <tbody>
                    <tr>
                        <td
                            colSpan={columns.length + (rowSelection ? 1 : 0)}
                            className="px-4 py-8 text-center text-gray-500"
                        >
                            {emptyText}
                        </td>
                    </tr>
                </tbody>
            );
        }

        return (
            <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((record, index) => {
                    const key = getRowKey(record, index);
                    const isSelected = selectedRowKeys.includes(key);
                    const rowProps = onRow?.(record, index) || {};

                    return (
                        <tr
                            key={key}
                            className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                            {...rowProps}
                        >
                            {rowSelection && (
                                <td className="px-4 py-3">
                                    <input
                                        type={rowSelection.type || 'checkbox'}
                                        checked={isSelected}
                                        onChange={(e) => handleSelectRow(record, index, e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                            )}
                            {columns.map((column) => {
                                const dataIndex = column.dataIndex || column.key;
                                const value = record[dataIndex];

                                return (
                                    <td
                                        key={column.key}
                                        className={`px-4 py-3 text-${column.align || 'left'} ${getSizeClasses()} text-gray-900 ${column.className || ''
                                            }`}
                                        style={{ width: column.width }}
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
        <div className={`table-container ${className}`}>
            <div className={`overflow-hidden ${bordered ? 'border border-gray-200' : ''} rounded-lg`}>
                <div className="overflow-x-auto" style={scroll}>
                    <table className="min-w-full divide-y divide-gray-200">
                        {renderHeader()}
                        {renderRows()}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Table;