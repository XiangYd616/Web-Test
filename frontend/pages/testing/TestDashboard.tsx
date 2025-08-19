/**
 * 测试总览页面
 * 
 * 提供所有测试工具的统一入口和概览信息
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  BugOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  SearchOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Badge, Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

interface TestTool {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  status: 'available' | 'new' | 'beta';
  color: string;
}

const TestDashboard: React.FC = () => {
  const navigate = useNavigate();

  const testTools: TestTool[] = [
    {
      key: 'stress',
      title: '压力测试',
      description: '模拟高并发访问，测试系统性能极限',
      icon: <ThunderboltOutlined />,
      path: '/app/testing/stress',
      status: 'available',
      color: '#ff4d4f'
    },
    {
      key: 'performance',
      title: '性能测试',
      description: '分析页面加载速度和Core Web Vitals',
      icon: <RocketOutlined />,
      path: '/app/testing/performance',
      status: 'available',
      color: '#52c41a'
    },
    {
      key: 'security',
      title: '安全测试',
      description: 'SSL证书、安全头、漏洞扫描检查',
      icon: <SafetyOutlined />,
      path: '/app/testing/security',
      status: 'available',
      color: '#1890ff'
    },
    {
      key: 'seo',
      title: 'SEO测试',
      description: 'Meta标签、结构化数据、搜索优化',
      icon: <SearchOutlined />,
      path: '/app/testing/seo',
      status: 'available',
      color: '#722ed1'
    },
    {
      key: 'api',
      title: 'API测试',
      description: 'REST API功能、性能、安全测试',
      icon: <GlobalOutlined />,
      path: '/app/testing/api',
      status: 'available',
      color: '#13c2c2'
    },
    {
      key: 'website',
      title: '网站综合测试',
      description: '全方位网站健康检查和分析',
      icon: <BugOutlined />,
      path: '/app/testing/website',
      status: 'new',
      color: '#fa8c16'
    },
    {
      key: 'content',
      title: '内容安全检测',
      description: '恶意内容、敏感信息、合规性检查',
      icon: <SafetyOutlined />,
      path: '/app/testing/content',
      status: 'new',
      color: '#eb2f96'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge status="success" text="新功能" />;
      case 'beta':
        return <Badge status="warning" text="测试版" />;
      default:
        return null;
    }
  };

  return (
    <div className="test-dashboard">
      <div className="mb-6">
        <Title level={2}>测试工具</Title>
        <Paragraph>
          选择适合的测试工具来检查您的网站性能、安全性和用户体验。
        </Paragraph>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="可用工具"
              value={testTools.length}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="新增功能"
              value={testTools.filter(t => t.status === 'new').length}
              suffix="个"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日测试"
              value={42}
              suffix="次"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={96.8}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 测试工具网格 */}
      <Row gutter={[16, 16]}>
        {testTools.map((tool) => (
          <Col xs={24} sm={12} lg={8} key={tool.key}>
            <Card
              hoverable
              style={{ height: '100%' }}
              actions={[
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => navigate(tool.path)}
                >
                  开始测试
                </Button>
              ]}
            >
              <Card.Meta
                avatar={
                  <div
                    style={{
                      fontSize: 32,
                      color: tool.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 64,
                      height: 64,
                      borderRadius: 8,
                      backgroundColor: `${tool.color}15`
                    }}
                  >
                    {tool.icon}
                  </div>
                }
                title={
                  <Space>
                    {tool.title}
                    {getStatusBadge(tool.status)}
                  </Space>
                }
                description={tool.description}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快速开始指南 */}
      <Card title="快速开始" className="mt-6">
        <Row gutter={16}>
          <Col span={8}>
            <div className="text-center">
              <div className="mb-2" style={{ fontSize: 24, color: '#1890ff' }}>1</div>
              <Title level={5}>选择测试工具</Title>
              <Paragraph type="secondary">
                根据您的需求选择合适的测试工具
              </Paragraph>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center">
              <div className="mb-2" style={{ fontSize: 24, color: '#1890ff' }}>2</div>
              <Title level={5}>配置测试参数</Title>
              <Paragraph type="secondary">
                设置URL、测试深度和其他参数
              </Paragraph>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center">
              <div className="mb-2" style={{ fontSize: 24, color: '#1890ff' }}>3</div>
              <Title level={5}>查看测试结果</Title>
              <Paragraph type="secondary">
                获得详细的分析报告和优化建议
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TestDashboard;
