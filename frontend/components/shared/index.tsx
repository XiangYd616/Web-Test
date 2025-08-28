// 共享组件导出
import React from 'react';

// 基础表格组件
export interface Column {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps {
  columns: Column[];
  dataSource: any[];
  loading?: boolean;
  pagination?: any;
  rowKey?: string | ((record: any) => string);
}

export const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  dataSource, 
  loading = false,
  pagination,
  rowKey = 'id'
}) => {
  return (
    <div className="data-table">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className="border border-gray-300 p-2 bg-gray-100">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center p-4">
                加载中...
              </td>
            </tr>
          ) : (
            dataSource.map((record, index) => (
              <tr key={typeof rowKey === 'function' ? rowKey(record) : record[rowKey]}>
                {columns.map(col => (
                  <td key={col.key} className="border border-gray-300 p-2">
                    {col.render 
                      ? col.render(record[col.dataIndex || col.key], record, index)
                      : record[col.dataIndex || col.key]
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// 统计卡片组件
export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend }) => {
  return (
    <div className="stat-card bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && <div className="text-3xl text-gray-400">{icon}</div>}
      </div>
    </div>
  );
};
