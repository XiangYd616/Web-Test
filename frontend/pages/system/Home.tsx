/**
 * 首页
 * 
 * Test-Web平台的首页，展示产品特色和快速入口
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  ArrowRightOutlined,
  GlobalOutlined,
  RocketOutlined,
  SafetyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: '性能测试',
      description: '全面的网站性能分析，包含Core Web Vitals等关键指标'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: '安全检测',
      description: 'SSL证书、安全头、漏洞扫描等多维度安全检查'
    },
    {
      icon: <RocketOutlined style={{ fontSize: 48, color: '#fa8c16' }} />,
      title: '压力测试',
      description: '模拟高并发访问，测试系统承载能力和稳定性'
    },
    {
      icon: <GlobalOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      title: '综合分析',
      description: 'SEO优化、内容检测、API测试等全方位网站分析'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 头部导航 */}
      <div style={{
        padding: '20px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          Test-Web
        </Title>
        <Space>
          <Button type="text" style={{ color: 'white' }}>
            关于我们
          </Button>
          <Button type="primary" onClick={() => navigate('/auth/login')}>
            登录
          </Button>
        </Space>
      </div>

      {/* 主要内容 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        padding: '0 50px'
      }}>
        <Row style={{ width: '100%' }} gutter={48}>
          <Col span={12}>
            <div style={{ color: 'white' }}>
              <Title level={1} style={{ color: 'white', fontSize: '3.5rem', marginBottom: 24 }}>
                专业的网站测试平台
              </Title>
              <Paragraph style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1.2rem',
                lineHeight: 1.6,
                marginBottom: 32
              }}>
                提供全面的网站性能测试、安全检测、SEO分析等服务，
                帮助您优化网站性能，提升用户体验。
              </Paragraph>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/app/testing')}
                >
                  开始测试
                </Button>
                <Button
                  size="large"
                  style={{
                    background: 'transparent',
                    borderColor: 'white',
                    color: 'white'
                  }}
                  onClick={() => navigate('/app/help/docs')}
                >
                  了解更多
                </Button>
              </Space>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 400,
                height: 300,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>
                  产品演示图
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 特色功能 */}
      <div style={{
        background: 'white',
        padding: '80px 50px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Title level={2}>核心功能</Title>
          <Paragraph style={{ fontSize: '1.1rem', color: '#666' }}>
            全方位的网站测试解决方案
          </Paragraph>
        </div>

        <Row gutter={32}>
          {features.map((feature, index) => (
            <Col span={6} key={index}>
              <Card
                hoverable
                style={{
                  textAlign: 'center',
                  height: '100%',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: 24 }}>
                  {feature.icon}
                </div>
                <Title level={4}>{feature.title}</Title>
                <Paragraph style={{ color: '#666' }}>
                  {feature.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/app/testing')}
          >
            立即体验
          </Button>
        </div>
      </div>

      {/* 页脚 */}
      <div style={{
        background: '#001529',
        color: 'white',
        padding: '40px 50px',
        textAlign: 'center'
      }}>
        <Paragraph style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          © 2025 Test-Web. All rights reserved.
        </Paragraph>
      </div>
    </div>
  );
};

export default Home;
