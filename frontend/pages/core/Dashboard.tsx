import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Alert, Space, Typography, Button } from 'antd';
import { 
  DashboardOutlined, 
  BugOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface DashboardStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  successRate: number;
  lastUpdate: string;
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  uptime: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    pendingTests: 0,
    successRate: 0,
    lastUpdate: new Date().toLocaleString('zh-CN')
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'healthy',
    message: '系统运行正常',
    uptime: '99.9%'
  });

  const [isLoading, setIsLoading] = useState(false);

  // 模拟数据加载
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockStats: DashboardStats = {
      totalTests: 156,
      passedTests: 142,
      failedTests: 8,
      pendingTests: 6,
      successRate: 91.0,
      lastUpdate: new Date().toLocaleString('zh-CN')
    };

    setStats(mockStats);
    setIsLoading(false);
  };

  const refreshData = () => {
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#52c41a';
      case 'warning': return '#faad14';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error': return <BugOutlined style={{ color: '#ff4d4f' }} />;
      default: return <ClockCircleOutlined />;
    }
  };

  return (
    <div className="dashboard-page" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            测试仪表板
          </Title>
          <Text type="secondary">实时监控测试状态和系统性能</Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={refreshData}
          loading={isLoading}
        >
          刷新数据
        </Button>
      </div>

      {/* 系统状态警告 */}
      <Alert
        message={`系统状态: ${systemStatus.message}`}
        description={`运行时间: ${systemStatus.uptime} | 最后更新: ${stats.lastUpdate}`}
        type={systemStatus.status === 'healthy' ? 'success' : systemStatus.status === 'warning' ? 'warning' : 'error'}
        icon={getStatusIcon(systemStatus.status)}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总测试数"
              value={stats.totalTests}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="通过测试"
              value={stats.passedTests}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失败测试"
              value={stats.failedTests}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pendingTests}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 成功率和详细信息 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="测试成功率" loading={isLoading}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={stats.successRate}
                format={(percent) => `${percent}%`}
                strokeColor={stats.successRate >= 90 ? '#52c41a' : stats.successRate >= 70 ? '#faad14' : '#ff4d4f'}
                size={120}
              />
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ fontSize: 16 }}>
                  {stats.passedTests} / {stats.totalTests} 通过
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="快速操作" loading={isLoading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block>
                开始新的压力测试
              </Button>
              <Button block>
                查看兼容性报告
              </Button>
              <Button block>
                内容检测分析
              </Button>
              <Button block>
                系统设置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 最近活动 */}
      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="最近活动" loading={isLoading}>
            <div style={{ padding: '16px 0' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>压力测试 #001 完成</Text>
                  <Text type="secondary">2分钟前</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>兼容性检测发现 3 个问题</Text>
                  <Text type="secondary">5分钟前</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>内容检测扫描完成</Text>
                  <Text type="secondary">10分钟前</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>系统配置已更新</Text>
                  <Text type="secondary">1小时前</Text>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
