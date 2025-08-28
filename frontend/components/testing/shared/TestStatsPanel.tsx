/**
 * 📊 测试统计面板组件
 * 从UnifiedTestExecutor中提取的专用统计展示
 * 提供测试统计数据的可视化展示
 */

import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography
} from 'antd';
import React from 'react';

const { Text } = Typography;

export interface TestStatsData {
  totalActiveTests: number;
  runningTests: number;
  completedTests: number;
  failedTests: number;
  totalResults: number;
  performance?: {
    successRate?: number;
    averageExecutionTime?: number;
    averageScore?: number;
  };
}

export interface TestStatsPanelProps {
  stats: TestStatsData;
  className?: string;
}

/**
 * 测试统计面板组件
 */
export const TestStatsPanel: React.FC<TestStatsPanelProps> = ({
  stats,
  className = ''
}) => {
  return (
    <Card title="📊 测试统计" className={`mb-4 ${className}`}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总测试数"
            value={stats.totalActiveTests}
            prefix={<BarChartOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="运行中"
            value={stats.runningTests}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已完成"
            value={stats.completedTests}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="失败数"
            value={stats.failedTests}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>
      
      {/* 性能指标 */}
      {stats.performance && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Row gutter={16}>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {stats.performance.successRate?.toFixed(1) || '0'}%
                </div>
                <div className="text-sm text-gray-500">成功率</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {stats.performance.averageExecutionTime?.toFixed(1) || '0'}ms
                </div>
                <div className="text-sm text-gray-500">平均执行时间</div>
              </div>
            </Col>
            <Col span={8}>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {stats.performance.averageScore?.toFixed(1) || '0'}
                </div>
                <div className="text-sm text-gray-500">平均分数</div>
              </div>
            </Col>
          </Row>
        </div>
      )}
      
      {/* 额外信息 */}
      <div className="mt-4">
        <Text type="secondary" className="text-sm">
          数据更新时间: {new Date().toLocaleString()}
        </Text>
      </div>
    </Card>
  );
};

export default TestStatsPanel;
