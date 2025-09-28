
// DataTable组件Props接口
interface DataTableProps {
  columns: Array<{ key: string; title: string; dataIndex?: keyof TestRecord; render?: (value: any, record: TestRecord, index: number) => React.ReactNode; sorter?: boolean; width?: number; }>;
  dataSource: TestRecord[];
  loading?: boolean;
  sortBy?: keyof TestRecord;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: keyof TestRecord, order: 'asc' | 'desc') => void;
  emptyText?: string;
  emptyIcon?: React.ReactElement;
  rowKey?: string;
}

import { TestRecord } from '@/hooks/useDataStorage';
import { Code, Copy, Database, Edit, Eye, Globe, Shield, Trash2, Wifi, Zap } from 'lucide-react';
import React from 'react';
import { DataTable } from '../shared/index';

interface DataListProps {
  records: TestRecord[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'date' | 'score' | 'type' | 'status') => void;
  onView: (record: TestRecord) => void;
  onEdit: (record: TestRecord) => void;
  onCopy: (record: TestRecord) => void;
  onDelete: (id: string) => void;
}

const DataList: React.FC<DataListProps> = ({
  records,
  loading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onCopy,
  onDelete
}) => {
  const getTestTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'website': <Globe className="w-5 h-5" />,
      'security': <Shield className="w-5 h-5" />,
      'api': <Code className="w-5 h-5" />,
      'network': <Wifi className="w-5 h-5" />,
      'performance': <Zap className="w-5 h-5" />
    };
    return iconMap[type] || <Database className="w-5 h-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 基于Context7最佳实践：定义具体的列类型
  // 基于Context7最佳实践：定义与Ant Design兼容的列类型
  interface ColumnType<T = any> {
    key: string;
    title: string;
    dataIndex?: keyof T;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    sorter?: boolean | ((a: T, b: T) => number);
    width?: number;
    align?: 'left' | 'center' | 'right';
    fixed?: 'left' | 'right';
  }

  const columns: ColumnType<TestRecord>[] = [
    {
      key: 'test_type',
      title: '测试类型',
      sorter: true,
      width: 120,
      render: (value: any, record: TestRecord, index: number) => (
        <div className="flex items-center space-x-2">
          {getTestTypeIcon(value)}
          <span className="text-gray-300 capitalize">{value}</span>
        </div>
      )
    },
    {
      key: 'id',
      title: '测试ID',
      width: 100,
      render: (value: any) => (
        <span className="text-blue-400 font-mono text-xs">
          {value.slice(0, 8)}...
        </span>
      )
    },
    {
      key: 'url',
      title: 'URL',
      width: 200,
      render: (value: any) => (
        <span className="text-gray-300 truncate" title={value}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: '状态',
      sorter: true,
      width: 80,
      render: (value: any) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value === 'completed' ? 'bg-green-500/20 text-green-400' :
          value === 'failed' ? 'bg-red-500/20 text-red-400' :
            value === 'running' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
          }`}>
          {value === 'completed' ? '完成' :
            value === 'failed' ? '失败' :
              value === 'running' ? '运行中' : value}
        </span>
      )
    },
    {
      key: 'overallScore',
      title: '总分',
      sorter: true,
      width: 80,
      align: 'center',
      render: (value: any) => (
        <span className={`font-semibold ${getScoreColor(value || 0)}`}>
          {value || '-'}
        </span>
      )
    },
    {
      key: 'actualDuration',
      title: '耗时',
      width: 80,
      align: 'center',
      render: (value: any) => (
        <span className="text-gray-400">
          {value ? `${(value / 1000).toFixed(1)}s` : '-'}
        </span>
      )
    },
    {
      key: 'startTime',
      title: '创建时间',
      sorter: true,
      width: 140,
      render: (value: any) => (
        <span className="text-gray-400 text-xs">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: 'savedAt' as keyof TestRecord, // 使用不同的字段作为key避免重复
      title: '操作',
      width: 120,
      align: 'center',
      render: (_: any, record: TestRecord) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            type="button"
            onClick={() => onView(record)}
            className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(record)}
            className="p-1 text-gray-400 hover:text-green-400 transition-colors"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onCopy(record)}
            className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
            title="复制"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleSort = (key: keyof TestRecord, order: 'asc' | 'desc') => {
    if (key === 'testType') onSort('type');
    else if (key === 'status') onSort('status');
    else if ((key as string) === 'overallScore') onSort('score');
    else if ((key as string) === 'startTime') onSort('date');
  };

  return (
    <DataTable
      columns={columns}
      dataSource={records}
      loading={loading}
      rowKey="id"
    />
  );
};

export default DataList;
