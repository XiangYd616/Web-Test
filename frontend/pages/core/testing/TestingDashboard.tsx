/**
 * 测试工具仪表板
 * 展示所有9个测试工具的统一入口
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Badge, Typography, Space } from 'antd';
import { 
  ApiOutlined, 
  ThunderboltOutlined, 
  SecurityScanOutlined, 
  SearchOutlined,
  BugOutlined,
  GlobalOutlined,
  UserOutlined,
  DesktopOutlined,
  CloudServerOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const TestingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 设置页面标题
  useEffect(() => {
    document.title = 'Web测试工具集 - Test Web';
  }, []);

  // 测试工具配置
  const testTools = [
    {
      id: 'api',
      name: 'API测试',
      description: '测试REST API端点的功能、性能和可靠性',
      icon: <ApiOutlined />,
      complexity: 'simple',
      estimatedTime: '2-5分钟',
      path: '/stress-test' // 暂时重定向到压力测试
    },
    {
      id: 'performance',
      name: '性能测试',
      description: '基于Google Lighthouse的全面性能分析',
      icon: <ThunderboltOutlined />,
      complexity: 'medium',
      estimatedTime: '30-60秒',
      path: '/stress-test'
    },
    {
      id: 'security',
      name: '安全测试',
      description: '检测SSL证书、安全头部和常见安全漏洞',
      icon: <SecurityScanOutlined />,
      complexity: 'medium',
      estimatedTime: '10-20秒',
      path: '/stress-test'
    },
    {
      id: 'seo',
      name: 'SEO测试',
      description: 'SEO优化分析和建议',
      icon: <SearchOutlined />,
      complexity: 'simple',
      estimatedTime: '15-30秒',
      path: '/stress-test'
    },
    {
      id: 'stress',
      name: '压力测试',
      description: '高并发负载测试和性能评估',
      icon: <BugOutlined />,
      complexity: 'complex',
      estimatedTime: '1-5分钟',
      path: '/stress-test'
    },
    {
      id: 'compatibility',
      name: '兼容性测试',
      description: '跨浏览器和设备的兼容性测试',
      icon: <GlobalOutlined />,
      complexity: 'complex',
      estimatedTime: '60-120秒',
      path: '/stress-test'
    },
    {
      id: 'ux',
      name: 'UX测试',
      description: '用户体验和可访问性测试',
      icon: <UserOutlined />,
      complexity: 'complex',
      estimatedTime: '20-40秒',
      path: '/stress-test'
    },
    {
      id: 'website',
      name: '网站综合测试',
      description: '全面的网站质量评估',
      icon: <DesktopOutlined />,
      complexity: 'complex',
      estimatedTime: '30-90秒',
      path: '/stress-test'
    },
    {
      id: 'infrastructure',
      name: '基础设施测试',
      description: '服务器和基础设施性能测试',
      icon: <CloudServerOutlined />,
      complexity: 'complex',
      estimatedTime: '1-3分钟',
      path: '/stress-test'
    }
  ];

  // 复杂度标签
  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '简单';
      case 'medium': return '中等';
      case 'complex': return '复杂';
      default: return '未知';
    }
  };

  // 启动测试
  const handleStartTest = (tool: any) => {
    setLoading(true);
    setTimeout(() => {
      navigate(tool.path);
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title level={1}>Web测试工具集</Title>
        <Text style={{ fontSize: '18px', color: '#666' }}>
          全面的Web应用测试解决方案，涵盖性能、安全、兼容性、用户体验等各个方面
        </Text>
        <div style={{ marginTop: '16px' }}>
          <Space>
            <Badge color="green" text="9个测试工具" />
            <Badge color="blue" text="企业级质量" />
            <Badge color="purple" text="实时结果" />
          </Space>
        </div>
      </div>

      {/* 测试工具网格 */}
      <Row gutter={[24, 24]}>
        {testTools.map(tool => (
          <Col xs={24} sm={12} lg={8} key={tool.id}>
            <Card
              hoverable
              style={{ height: '100%' }}
              actions={[
                <Button 
                  type="primary" 
                  loading={loading}
                  onClick={() => handleStartTest(tool)}
                  style={{ width: '80%' }}
                >
                  开始测试
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<div style={{ fontSize: '32px' }}>{tool.icon}</div>}
                title={
                  <Space>
                    {tool.name}
                    <Badge 
                      color={tool.complexity === 'simple' ? 'green' : tool.complexity === 'medium' ? 'orange' : 'red'}
                      text={getComplexityLabel(tool.complexity)}
                    />
                  </Space>
                }
                description={
                  <div>
                    <Text>{tool.description}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      预计时间: {tool.estimatedTime}
                    </Text>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 快速开始指南 */}
      <Card style={{ marginTop: '48px' }} title="快速开始">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>1️⃣</div>
            <Title level={4}>选择测试工具</Title>
            <Text>根据需求选择合适的测试工具</Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>2️⃣</div>
            <Title level={4}>配置测试参数</Title>
            <Text>输入URL和相关配置参数</Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>3️⃣</div>
            <Title level={4}>查看测试结果</Title>
            <Text>获取详细的测试报告和建议</Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default TestingDashboard;
