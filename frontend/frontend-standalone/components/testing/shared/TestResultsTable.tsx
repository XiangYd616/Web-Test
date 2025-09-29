/**
 * 📋 测试结果表格组件
 * 从UnifiedTestExecutor中提取的专用结果表格
 * 提供测试结果的列表展示和操作
 */

import {
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
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
import type { TestResult } from '../../../types/unifiedEngine.types';

const { Text } = Typography;

export interface TestResultsTableProps {
  testResults: Map<string, TestResult>;
  onViewResult: (testId: string) => void;
  onDownloadResult?: (result: TestResult) => void;
  enableExport?: boolean;
  className?: string;
}

/**
 * 获取分数颜色
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#3f8600';
  if (score >= 60) return '#faad14';
  return '#cf1322';
};

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'blue',
    running: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  return colors[status] || 'default';
};

/**
 * 获取状态文本
 */
const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  };
  return texts[status] || status;
};

/**
 * 测试结果表格组件
 */
export const TestResultsTable: React.FC<TestResultsTableProps> = ({
  testResults,
  onViewResult,
  onDownloadResult,
  enableExport = true,
  className = ''
}) => {
  const resultsArray = Array.from(testResults.entries());

  const columns = [
    {
      title: '测试ID',
      dataIndex: '0',
      key: 'testId',
      width: 120,
      render: (testId: string) => (
        <Text code copyable={{ text: testId }}>
          {testId.substring(0, 8)}...
        </Text>
      )
    },
    {
      title: '类型',
      dataIndex: '1',
      key: 'testType',
      render: (result: TestResult) => (
        <Tag color="blue">{result.testType}</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: '1',
      key: 'status',
      render: (result: TestResult) => {
        const status = (result as any).status || 'completed';
        return (
          <Badge
            status={getStatusColor(status) as any}
            text={getStatusText(status)}
          />
        );
      }
    },
    {
      title: '分数',
      dataIndex: '1',
      key: 'score',
      render: (result: TestResult) => (
        <span style={{ color: getScoreColor(result.overallScore) }}>
          {result.overallScore}/100
        </span>
      )
    },
    {
      title: '时长',
      dataIndex: '1',
      key: 'duration',
      render: (result: TestResult) => `${(result.duration / 1000).toFixed(1)}s`
    },
    {
      title: '完成时间',
      dataIndex: '1',
      key: 'timestamp',
      render: (result: TestResult) => new Date(result.timestamp).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: [string, TestResult]) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewResult(record[0])}
          >
            查看
          </Button>
          {enableExport && onDownloadResult && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onDownloadResult(record[1])}
            >
              下载
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (resultsArray.length === 0) {
    return (
      <Card title="📋 测试结果" className={`mb-4 ${className}`}>
        <Empty
          description="暂无测试结果"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card title="📋 测试结果" className={`mb-4 ${className}`}>
      <Table
        dataSource={resultsArray}
        columns={columns}
        rowKey={([testId]) => testId}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条结果`
        }}
        locale={{
          emptyText: <Empty description="暂无测试结果" />
        }}
      />

      {/* 结果统计摘要 */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">
              {resultsArray.length}
            </div>
            <div className="text-sm text-gray-500">总测试数</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {resultsArray.filter(([, result]) => (result as any).status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">成功完成</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {resultsArray.filter(([, result]) => (result as any).status === 'failed').length}
            </div>
            <div className="text-sm text-gray-500">测试失败</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {resultsArray.length > 0 ?
                (resultsArray.reduce((sum, [, result]) => sum + result.overallScore, 0) / resultsArray.length).toFixed(1) :
                '0'
              }
            </div>
            <div className="text-sm text-gray-500">平均分数</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TestResultsTable;
