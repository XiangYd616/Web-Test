/**
 * ResponsiveTable - 响应式表格组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/ResponsiveTable.tsx
 * 创建时间: 2025-11-14
 * 
 * 功能特性:
 * - 桌面端显示标准表格
 * - 移动端显示卡片列表
 * - 平板端自适应布局
 * - 触摸优化交互
 */

import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import type { TestRecord, ColumnConfig } from '../types';

/**
 * 组件Props
 */
interface ResponsiveTableProps {
  records: TestRecord[];
  columns: ColumnConfig[];
  selectedIds: string[];
  isMobile: boolean;
  isTablet: boolean;
  onSelectAll: (ids: string[]) => void;
  onToggleSelect: (id: string) => void;
  onView: (record: TestRecord) => void;
  onDelete: (id: string) => void;
  formatters?: any;
  customActions?: any[];
  StatusBadge: React.ComponentType<any>;
}

/**
 * 移动端卡片视图
 */
const MobileCard: React.FC<{
  record: TestRecord;
  columns: ColumnConfig[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (record: TestRecord) => void;
  onDelete: (id: string) => void;
  formatters?: any;
  StatusBadge: React.ComponentType<any>;
}> = ({ record, columns, isSelected, onToggleSelect, onView, onDelete, formatters, StatusBadge }) => {
  return (
    <div 
      className={`
        bg-gray-800/60 rounded-lg p-4 border transition-all duration-200
        ${isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-gray-700/30'}
        active:scale-[0.98]
      `}
    >
      {/* 头部: 选择框 + 主要信息 */}
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(record.id)}
          className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer touch-manipulation"
          aria-label={`选择 ${record.testName || record.id}`}
        />
        <div className="flex-1 min-w-0">
          {/* 测试名称 */}
          <div className="font-medium text-white text-base mb-1 truncate">
            {record.testName || record.id}
          </div>
          {/* 状态 */}
          {record.status && (
            <div className="mb-2">
              <StatusBadge status={record.status} formatter={formatters?.status} />
            </div>
          )}
        </div>
      </div>

      {/* 详细信息 */}
      <div className="space-y-2 text-sm">
        {columns
          .filter(col => col.key !== 'testName' && col.key !== 'status' && !col.hideOnMobile)
          .slice(0, 3) // 移动端最多显示3个字段
          .map(column => {
            const value = (record as any)[column.key];
            let displayValue: React.ReactNode = value;

            // 应用格式化器
            if (column.formatter) {
              displayValue = column.formatter(value, record);
            } else if (formatters?.[column.key]) {
              displayValue = formatters[column.key](value);
            } else if (value === null || value === undefined) {
              displayValue = '-';
            }

            return (
              <div key={column.key} className="flex justify-between items-center">
                <span className="text-gray-400">{column.title}:</span>
                <span className="text-gray-200 font-medium">{displayValue}</span>
              </div>
            );
          })}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
        <button
          onClick={() => onView(record)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors touch-manipulation"
        >
          <Eye className="w-4 h-4" />
          查看详情
        </button>
        <button
          onClick={() => onDelete(record.id)}
          className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors touch-manipulation"
          aria-label="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * 平板端紧凑表格
 */
const TabletRow: React.FC<{
  record: TestRecord;
  columns: ColumnConfig[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (record: TestRecord) => void;
  onDelete: (id: string) => void;
  formatters?: any;
  StatusBadge: React.ComponentType<any>;
}> = ({ record, columns, isSelected, onToggleSelect, onView, onDelete, formatters, StatusBadge }) => {
  // 平板端只显示重要列
  const visibleColumns = columns.filter(col => !col.hideOnTablet).slice(0, 4);

  return (
    <tr className="hover:bg-gray-700/30 transition-colors duration-150">
      {/* 选择框 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(record.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          aria-label={`选择 ${record.testName || record.id}`}
        />
      </td>

      {/* 数据列 */}
      {visibleColumns.map((column) => {
        const value = (record as any)[column.key];
        let displayValue: React.ReactNode = value;

        if (column.formatter) {
          displayValue = column.formatter(value, record);
        } else if (formatters?.[column.key]) {
          displayValue = formatters[column.key](value);
        } else if (column.key === 'status') {
          displayValue = <StatusBadge status={value} formatter={formatters?.status} />;
        } else if (value === null || value === undefined) {
          displayValue = '-';
        }

        return (
          <td 
            key={column.key} 
            className="px-3 py-3 text-sm text-gray-300 truncate max-w-[150px]"
          >
            {displayValue}
          </td>
        );
      })}

      {/* 操作列 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(record)}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
            title="查看"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * 桌面端完整表格行 (与原TableRow相同)
 */
const DesktopRow: React.FC<{
  record: TestRecord;
  columns: ColumnConfig[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (record: TestRecord) => void;
  onDelete: (id: string) => void;
  customActions?: any[];
  formatters?: any;
  StatusBadge: React.ComponentType<any>;
}> = ({ record, columns, isSelected, onToggleSelect, onView, onDelete, customActions = [], formatters, StatusBadge }) => {
  return (
    <tr className="hover:bg-gray-700/30 transition-colors duration-150">
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(record.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          aria-label={`选择 ${record.testName || record.id}`}
        />
      </td>

      {columns.map((column) => {
        const value = (record as any)[column.key];
        let displayValue: React.ReactNode = value;

        if (column.formatter) {
          displayValue = column.formatter(value, record);
        } else if (formatters?.[column.key]) {
          displayValue = formatters[column.key](value);
        } else if (column.key === 'status') {
          displayValue = <StatusBadge status={value} formatter={formatters?.status} />;
        } else if (value === null || value === undefined) {
          displayValue = '-';
        }

        const alignClass = column.align === 'right' ? 'text-right' : 
                          column.align === 'center' ? 'text-center' : 
                          'text-left';

        return (
          <td 
            key={column.key} 
            className={`px-4 py-3 text-sm text-gray-300 ${alignClass}`}
            style={{ width: column.width }}
          >
            {displayValue}
          </td>
        );
      })}

      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onView(record)}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {customActions.map((action) => {
            const isVisible = !action.visible || action.visible(record);
            const isDisabled = action.disabled && action.disabled(record);
            if (!isVisible) return null;

            return (
              <button
                key={action.key}
                onClick={() => action.onClick(record)}
                disabled={isDisabled}
                className={`p-1.5 rounded transition-colors ${
                  isDisabled 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/30'
                }`}
                title={action.label}
              >
                {action.icon || action.label}
              </button>
            );
          })}

          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * 响应式表格主组件
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  records,
  columns,
  selectedIds,
  isMobile,
  isTablet,
  onSelectAll,
  onToggleSelect,
  onView,
  onDelete,
  formatters,
  customActions,
  StatusBadge,
}) => {
  // 移动端: 卡片列表
  if (isMobile) {
    return (
      <div className="space-y-3 p-4">
        {/* 全选 */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-700/50">
          <input
            type="checkbox"
            checked={records.length > 0 && selectedIds.length === records.length}
            onChange={() => onSelectAll(records.map(r => r.id))}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer touch-manipulation"
            aria-label="全选"
          />
          <span className="text-sm text-gray-400">
            {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 项` : '全选'}
          </span>
        </div>

        {/* 卡片列表 */}
        {records.map(record => (
          <MobileCard
            key={record.id}
            record={record}
            columns={columns}
            isSelected={selectedIds.includes(record.id)}
            onToggleSelect={onToggleSelect}
            onView={onView}
            onDelete={onDelete}
            formatters={formatters}
            StatusBadge={StatusBadge}
          />
        ))}
      </div>
    );
  }

  // 平板端: 紧凑表格
  if (isTablet) {
    const visibleColumns = columns.filter(col => !col.hideOnTablet).slice(0, 4);
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/30 border-b border-gray-700/50">
            <tr>
              <th className="px-3 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={records.length > 0 && selectedIds.length === records.length}
                  onChange={() => onSelectAll(records.map(r => r.id))}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  aria-label="全选"
                />
              </th>
              {visibleColumns.map(column => (
                <th key={column.key} className="px-3 py-3 text-left text-sm font-medium text-gray-300">
                  {column.title}
                </th>
              ))}
              <th className="px-3 py-3 text-left text-sm font-medium text-gray-300 w-20">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {records.map(record => (
              <TabletRow
                key={record.id}
                record={record}
                columns={columns}
                isSelected={selectedIds.includes(record.id)}
                onToggleSelect={onToggleSelect}
                onView={onView}
                onDelete={onDelete}
                formatters={formatters}
                StatusBadge={StatusBadge}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 桌面端: 完整表格
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700/30 border-b border-gray-700/50">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={records.length > 0 && selectedIds.length === records.length}
                onChange={() => onSelectAll(records.map(r => r.id))}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                aria-label="全选"
              />
            </th>
            {columns.map(column => (
              <th
                key={column.key}
                className={`px-4 py-3 text-sm font-medium text-gray-300 ${
                  column.align === 'right' ? 'text-right' :
                  column.align === 'center' ? 'text-center' :
                  'text-left'
                }`}
                style={{ width: column.width }}
              >
                {column.title}
              </th>
            ))}
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/30">
          {records.map(record => (
            <DesktopRow
              key={record.id}
              record={record}
              columns={columns}
              isSelected={selectedIds.includes(record.id)}
              onToggleSelect={onToggleSelect}
              onView={onView}
              onDelete={onDelete}
              customActions={customActions}
              formatters={formatters}
              StatusBadge={StatusBadge}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;
