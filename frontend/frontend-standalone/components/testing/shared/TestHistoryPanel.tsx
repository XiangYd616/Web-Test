/**
 * 📋 测试历史面板组件
 * 从UnifiedTestExecutor中提取的专用历史记录展示
 * 提供测试历史的列表展示和操作
 */

import {DeleteOutlined, DownloadOutlined, EyeOutlined} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Empty,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import React from 'react';

const { Text } = Typography;

export interface TestHistoryItem {
  id: string;
  testType: string;
  status: string;
  score?: number;
  startTime: string;
  duration?: number;
  url?: string;
}

export interface TestHistoryPanelProps {
  testHistory: TestHistoryItem[];
  onViewResult: (testId: string) => void;
  onExportResult?: (testId: string, format: 'json' | 'csv' | 'pdf') => void;
  onClearHistory?: () => void;
  enableExport?: boolean;
  className?: string;
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: 'success',
    failed: 'error',
    running: 'processing',
    cancelled: 'default'
  };
  return colors[status] || 'default';
};

/**
 * 获取状态文本
 */
const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    completed: '已完成',
    failed: '失败',
    running: '运行中',
    cancelled: '已取消'
  };
  return texts[status] || status;
};

/**
 * 测试历史面板组件
 */
export const TestHistoryPanel: React.FC<TestHistoryPanelProps> = ({
  testHistory,
  onViewResult,
  onExportResult,
  onClearHistory,
  enableExport = true,
  className = ''
}) => {
  const historyColumns = [
    {
      title: '测试ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Text code copyable={{ text: id }}>
          {id.substring(0, 8)}...
        </Text>
      )
    },
    {
      title: '类型',
      dataIndex: 'testType',
      key: 'testType',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge 
          status={getStatusColor(status) as any} 
          text={getStatusText(status)} 
        />
      )
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => score ? `${score}/100` : '-'
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => duration ? `${(duration / 1000).toFixed(1)}s` : '-'
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => new Date(time).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: TestHistoryItem) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewResult(record.id)}
          >
            查看
          </Button>
          {enableExport && onExportResult && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onExportResult(record.id, 'json')}
            >
              导出
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (testHistory.length === 0) {
    return (
      <Card title="📋 测试历史" className={`mb-4 ${className}`}>
        <Empty description="暂无测试历史" />
      </Card>
    );
  }

  return (
    <Card 
      title="📋 测试历史" 
      className={`mb-4 ${className}`}
      extra={
        onClearHistory && (
          <Button
            size="small"
            icon={<DeleteOutlined />}
            onClick={onClearHistory}
            danger
          >
            清理历史
          </Button>
        )
      }
    >
      <Table
        dataSource={testHistory}
        columns={historyColumns}
        rowKey="id"
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
          showQuickJumper: false,
          showTotal: (total) => `共 ${total} 条历史记录`
        }}
        locale={{
          emptyText: <Empty description="暂无测试历史" />
        }}
      />
    </Card>
  );
};

export default TestHistoryPanel;
