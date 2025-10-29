/**
 * 📊 统一测试引擎监控组件
 * 实时显示引擎状态、性能指标和系统健康状�? */

import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  HeartOutlined,
  LineChartOutlined,
  ReloadOutlined, SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Timeline,
  Typography
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useTestEngine } from '../../hooks/useTestEngine';

const { Title, Text } = Typography;

interface EngineMonitorProps {
  className?: string;
  refreshInterval?: number;
  showDetailedStats?: boolean;
}

/**
 * 引擎监控组件
 */
export const EngineMonitor: React.FC<EngineMonitorProps> = ({
  className = '',
  refreshInterval = 5000,
  showDetailedStats = true
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // 使用统一测试引擎Hook
  const engine = useTestEngine();
  const stats = engine.getStats?.() || {
    totalActiveTests: 0,
    runningTests: 0,
    completedTests: 0,
    failedTests: 0,
    performance: {
      successRate: 0,
      errorRate: 0,
      averageExecutionTime: 0
    }
  };

  /**
   * 手动刷新
   */
  const handleRefresh = useCallback(() => {
    engine.fetchSupportedTypes();
    setLastRefresh(Date.now());
  }, [engine]);

  /**
   * 自动刷新定时�?   */
  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, handleRefresh]);

  /**
   * 渲染引擎状态卡�?   */
  const renderEngineStatus = () => (
    <Card
      title={
        <Space>
          <DashboardOutlined />
          引擎状�?          <Badge
            status={engine.isConnected ? 'success' : 'error'}
            text={engine.isConnected ? '在线' : '离线'}
          />
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={false}
          >
            刷新
          </Button>
          <Button
            size="small"
            type={autoRefresh ? 'primary' : 'default'}
            icon={<HeartOutlined />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            自动刷新
          </Button>
        </Space>
      }
      className="mb-4"
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="连接状�?
            value={engine.isConnected ? '已连�? : '未连�?}
            valueStyle={{
              color: engine.isConnected ? '#3f8600' : '#cf1322',
              fontSize: '16px'
            }}
            prefix={
              <CheckCircleOutlined
                style={{ color: engine.isConnected ? '#3f8600' : '#cf1322' }}
              />
            }
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="引擎版本"
            value={engine.engineVersion || 'Unknown'}
            valueStyle={{ color: '#1890ff' }}
            prefix={<SettingOutlined />}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="支持类型"
            value={engine.supportedTypes?.length || 0}
            suffix="�?
            valueStyle={{ color: '#52c41a' }}
            prefix={<ThunderboltOutlined />}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="最后更�?
            value={Math.floor((Date.now() - lastRefresh) / 1000)}
            suffix="秒前"
            valueStyle={{ color: '#faad14' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );

  /**
   * 渲染测试统计
   */
  const renderTestStats = () => (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          测试统计
        </Space>
      }
      className="mb-4"
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="活跃测试"
            value={stats.totalActiveTests}
            valueStyle={{ color: '#1890ff' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="运行�?
            value={stats.runningTests}
            valueStyle={{ color: '#faad14' }}
            prefix={<ThunderboltOutlined />}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="已完�?
            value={stats.completedTests}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="失败"
            value={stats.failedTests}
            valueStyle={{ color: '#cf1322' }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {showDetailedStats && (
        <>
          <Divider />
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="成功�?
                value={stats.performance.successRate}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: stats.performance.successRate >= 90 ? '#3f8600' :
                    stats.performance.successRate >= 70 ? '#faad14' : '#cf1322'
                }}
              />
            </Col>

            <Col span={8}>
              <Statistic
                title="错误�?
                value={stats.performance.errorRate}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: stats.performance.errorRate <= 5 ? '#3f8600' :
                    stats.performance.errorRate <= 15 ? '#faad14' : '#cf1322'
                }}
              />
            </Col>

            <Col span={8}>
              <Statistic
                title="平均执行时间"
                value={stats.performance.averageExecutionTime / 1000}
                precision={1}
                suffix="�?
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </>
      )}
    </Card>
  );

  /**
   * 渲染支持的测试类�?   */
  const renderSupportedTypes = () => (
    <Card
      title={
        <Space>
          <GlobalOutlined />
          支持的测试类�?        </Space>
      }
      className="mb-4"
    >
      <Space wrap>
        {engine.supportedTypes?.map(type => (
          <Tag
            key={type}
            color="blue"
            icon={getTestTypeIcon(type)}
          >
            {getTestTypeLabel(type)}
          </Tag>
        )) || []}
      </Space>

      {(!engine.supportedTypes || engine.supportedTypes.length === 0) && (
        <Text type="secondary">暂无支持的测试类�?/Text>
      )}
    </Card>
  );

  /**
   * 渲染活跃测试列表
   */
  const renderActiveTests = () => {
    const activeTestsArray = Array.from(engine.activeTests?.values() || [])
      .filter(test => test.status === 'running' || test.status === 'pending');

    return (
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            活跃测试 ({activeTestsArray.length})
          </Space>
        }
        className="mb-4"
      >
        {activeTestsArray.length === 0 ? (
          <Text type="secondary">暂无活跃测试</Text>
        ) : (
          <Timeline>
            {activeTestsArray.map(test => (
              <Timeline.Item
                key={test.testId}
                color={getStatusColor(test.status)}
                dot={getStatusIcon(test.status)}
              >
                <div>
                  <Text strong>{test.testId}</Text>
                  <Tag color={getStatusColor(test.status)} className="ml-2">
                    {getStatusText(test.status)}
                  </Tag>
                </div>
                <div className="mt-1">
                  <Progress
                    percent={test.progress}
                    size="small"
                    status={test.status === 'failed' ? 'exception' : 'active'}
                  />
                </div>
                <Text type="secondary" className="text-sm">
                  {test.currentStep}
                </Text>
                <div className="text-xs text-gray-400 mt-1">
                  开始时�? {new Date(test.startTime).toLocaleString()}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>
    );
  };

  /**
   * 渲染系统健康状况
   */
  const renderSystemHealth = () => {
    const healthScore = calculateHealthScore();

    return (
      <Card
        title={
          <Space>
            <HeartOutlined />
            系统健康
          </Space>
        }
        className="mb-4"
      >
        <Row gutter={16}>
          <Col span={12}>
            <div className="text-center">
              <Progress
                type="circle"
                percent={healthScore}
                strokeColor={getHealthColor(healthScore)}
                format={(percent) => `${percent}%`}
              />
              <div className="mt-2">
                <Text strong>健康评分</Text>
              </div>
            </div>
          </Col>

          <Col span={12}>
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between">
                <Text>引擎连接:</Text>
                <Badge
                  status={engine.isConnected ? 'success' : 'error'}
                  text={engine.isConnected ? '正常' : '异常'}
                />
              </div>

              <div className="flex justify-between">
                <Text>错误�?</Text>
                <Text style={{
                  color: stats.performance.errorRate <= 5 ? '#3f8600' : '#cf1322'
                }}>
                  {stats.performance.errorRate.toFixed(1)}%
                </Text>
              </div>

              <div className="flex justify-between">
                <Text>活跃测试:</Text>
                <Text>{stats.runningTests} / {stats.totalActiveTests}</Text>
              </div>

              <div className="flex justify-between">
                <Text>最后错�?</Text>
                <Text type={engine.lastError ? 'danger' : 'secondary'}>
                  {engine.lastError ? '有错�? : '无错�?}
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  /**
   * 计算系统健康评分
   */
  const calculateHealthScore = (): number => {
    let score = 100;

    // 连接状态影�?    if (!engine.isConnected) score -= 30;

    // 错误率影�?    if (stats.performance.errorRate > 15) score -= 25;
    else if (stats.performance.errorRate > 5) score -= 10;

    // 最后错误影�?    if (engine.lastError) score -= 15;

    // 活跃测试过多影响
    if (stats.runningTests > 10) score -= 10;

    return Math.max(0, score);
  };

  return (
    <div className={`engine-monitor ${className}`}>
      <div className="mb-4">
        <Title level={3}>
          📊 引擎监控面板
        </Title>
        <Text type="secondary">
          实时监控统一测试引擎的状态和性能
        </Text>
      </div>

      {renderEngineStatus()}
      {renderTestStats()}
      {renderSupportedTypes()}
      {renderActiveTests()}
      {renderSystemHealth()}

      {/* 错误提示 */}
      {engine.lastError && (
        <Alert
          message="引擎错误"
          description={engine.lastError.message}
          type="error"
          showIcon
          closable
          className="mt-4"
        />
      )}
    </div>
  );
};

/**
 * 工具函数
 */
const getTestTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    performance: '性能测试',
    security: '安全测试',
    api: 'API测试',
    stress: '压力测试',
    database: '数据库测�?,
    network: '网络测试',
    ux: '用户体验',
    seo: 'SEO测试',
    compatibility: '兼容性测�?,
    website: '网站测试'
  };
  return labels[type] || type;
};

const getTestTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    performance: <ThunderboltOutlined />,
    security: <ExclamationCircleOutlined />,
    api: <GlobalOutlined />,
    stress: <BarChartOutlined />,
    database: <DatabaseOutlined />,
    network: <GlobalOutlined />,
    ux: <HeartOutlined />,
    seo: <LineChartOutlined />,
    compatibility: <SettingOutlined />,
    website: <DashboardOutlined />
  };
  return icons[type] || <SettingOutlined />;
};

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

const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '等待�?,
    running: '运行�?,
    completed: '已完�?,
    failed: '失败',
    cancelled: '已取�?
  };
  return texts[status] || status;
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    pending: <ClockCircleOutlined />,
    running: <ThunderboltOutlined />,
    completed: <CheckCircleOutlined />,
    failed: <ExclamationCircleOutlined />,
    cancelled: <ExclamationCircleOutlined />
  };
  return icons[status] || <ClockCircleOutlined />;
};

const getHealthColor = (score: number): string => {
  if (score >= 90) return '#3f8600';
  if (score >= 70) return '#faad14';
  if (score >= 50) return '#fa8c16';
  return '#cf1322';
};

export default EngineMonitor;
