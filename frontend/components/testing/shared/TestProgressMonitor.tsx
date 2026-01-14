/**
 * 📊 测试进度监控组件
 * 从UnifiedTestExecutor中提取的专用进度监控
 * 提供实时测试进度和状态监控
 */

import { LoadingOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, Progress, Row, Space, Tag, Timeline, Typography } from 'antd';
import React from 'react';
import type { TestStatusInfo } from '../../../types/engine.types';

const { Title, Text, Paragraph } = Typography;

export interface TestProgressMonitorProps {
  activeTests: Map<string, TestStatusInfo>;
  realTimeMetrics?: any;
  onStopTest: (testId: string) => void;
  onCancelTest: (testId: string) => void;
  className?: string;
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'blue',
    running: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray',
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
    cancelled: '已取消',
  };
  return texts[status] || status;
};

/**
 * 测试进度监控组件
 */
export const TestProgressMonitor: React.FC<TestProgressMonitorProps> = ({
  activeTests,
  realTimeMetrics,
  onStopTest,
  onCancelTest,
  className = '',
}) => {
  const activeTestsArray = Array.from(activeTests.values());
  const runningTests = activeTestsArray.filter(test => test.status === 'running');

  if (activeTestsArray.length === 0) {
    return (
      <Card title="📊 测试监控" className={`mb-4 ${className}`}>
        <Empty description="暂无运行中的测试" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card title="📊 测试监控" className={`mb-4 ${className}`}>
      <div className="space-y-4">
        {activeTestsArray.map(test => (
          <div key={test.testId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Text strong>{test.testId.substring(0, 8)}...</Text>
                  <Tag color={getStatusColor(test.status)}>{getStatusText(test.status)}</Tag>
                  <Tag color="blue">{(test as any).testType || 'Unknown'}</Tag>
                </div>
                <Text type="secondary" className="text-sm">
                  {test.currentStep}
                </Text>
              </div>

              <Space>
                {test.status === 'running' && (
                  <>
                    <Button
                      size="small"
                      icon={<StopOutlined />}
                      onClick={() => onStopTest(test.testId)}
                      danger
                    >
                      停止
                    </Button>
                    <Button size="small" onClick={() => onCancelTest(test.testId)}>
                      取消
                    </Button>
                  </>
                )}
              </Space>
            </div>

            {/* 进度条 */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <Text className="text-sm">测试进度</Text>
                <Text className="text-sm">{Math.round(test.progress)}%</Text>
              </div>
              <Progress
                percent={test.progress}
                status={test.status === 'failed' ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>

            {/* 实时指标 */}
            {realTimeMetrics && test.status === 'running' && (
              <Row gutter={16} className="mt-3">
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {realTimeMetrics?.currentUsers || 0}
                    </div>
                    <div className="text-xs text-gray-500">当前用户</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {realTimeMetrics?.successfulRequests || 0}
                    </div>
                    <div className="text-xs text-gray-500">成功请求</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {realTimeMetrics?.averageResponseTime || 0}ms
                    </div>
                    <div className="text-xs text-gray-500">平均响应</div>
                  </div>
                </Col>
              </Row>
            )}

            {/* 测试步骤时间线 */}
            {test.status === 'running' && (
              <div className="mt-4">
                <Timeline
                  pending={test.status === 'running' ? '测试进行中...' : undefined}
                  items={[
                    {
                      color: 'green',
                      children: '测试初始化完成',
                    },
                    {
                      color: 'blue',
                      children: test.currentStep,
                      dot: test.status === 'running' ? <LoadingOutlined /> : undefined,
                    },
                  ]}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 批量操作 */}
      {runningTests.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Space>
            <Button
              icon={<StopOutlined />}
              onClick={() => runningTests.forEach(test => onStopTest(test.testId))}
              danger
            >
              停止所有测试
            </Button>
            <Button onClick={() => runningTests.forEach(test => onCancelTest(test.testId))}>
              取消所有测试
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default TestProgressMonitor;
