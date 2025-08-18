import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd';
import React from 'react';

const { Title, Text } = Typography;

interface DashboardStats {
  totalTests: number;
  runningTests: number;
  completedTests: number;
  successRate: number;
}

const Dashboard: React.FC = () => {
  // 模拟数据
  const stats: DashboardStats = {
    totalTests: 156,
    runningTests: 3,
    completedTests: 153,
    successRate: 94.2
  };

  const recentTests = [
    { id: 1, name: 'API压力测试', status: '运行中', progress: 65 },
    { id: 2, name: '数据库连接测试', status: '已完成', progress: 100 },
    { id: 3, name: '前端性能测试', status: '等待中', progress: 0 },
  ];

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <Title level={2} className="page-title">
          <RocketOutlined /> 测试控制台
        </Title>
        <Text type="secondary" className="page-description">
          欢迎使用Test-Web压力测试平台，实时监控您的测试进度
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总测试数"
              value={stats.totalTests}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="运行中"
              value={stats.runningTests}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completedTests}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={stats.successRate}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作" style={{ marginTop: 24 }}>
        <Space size="large">
          <Button type="primary" icon={<PlayCircleOutlined />} size="large">
            开始新测试
          </Button>
          <Button icon={<BarChartOutlined />} size="large">
            查看报告
          </Button>
          <Button icon={<SettingOutlined />} size="large">
            测试配置
          </Button>
        </Space>
      </Card>

      {/* 最近测试 */}
      <Card title="最近测试" style={{ marginTop: 24 }}>
        <div className="recent-tests">
          {recentTests.map(test => (
            <Card key={test.id} size="small" style={{ marginBottom: 12 }}>
              <Row align="middle">
                <Col span={8}>
                  <Text strong>{test.name}</Text>
                </Col>
                <Col span={4}>
                  <Text type={test.status === '运行中' ? 'warning' : test.status === '已完成' ? 'success' : 'secondary'}>
                    {test.status}
                  </Text>
                </Col>
                <Col span={8}>
                  <Progress
                    percent={test.progress}
                    size="small"
                    status={test.status === '运行中' ? 'active' : 'normal'}
                  />
                </Col>
                <Col span={4}>
                  <Button type="link" size="small">
                    查看详情
                  </Button>
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      </Card>

      {/* 系统状态 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="系统资源">
            <div style={{ marginBottom: 16 }}>
              <Text>CPU使用率</Text>
              <Progress percent={45} status="active" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text>内存使用率</Text>
              <Progress percent={67} status="active" />
            </div>
            <div>
              <Text>磁盘使用率</Text>
              <Progress percent={23} />
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="网络状态">
            <div style={{ marginBottom: 16 }}>
              <Text>上行带宽</Text>
              <Progress percent={34} strokeColor="#52c41a" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text>下行带宽</Text>
              <Progress percent={78} strokeColor="#1890ff" />
            </div>
            <div>
              <Text>延迟</Text>
              <Progress percent={12} strokeColor="#faad14" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
