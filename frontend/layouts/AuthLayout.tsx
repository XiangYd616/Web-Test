/**
 * 认证布局组件
 * 
 * 用于登录、注册等认证相关页面的布局
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { Layout, Card, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;
const { Title } = Typography;

const AuthLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '50px'
      }}>
        <Card 
          style={{ 
            width: '100%', 
            maxWidth: 400,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
              Test-Web
            </Title>
            <Typography.Text type="secondary">
              专业的网站测试平台
            </Typography.Text>
          </div>
          <Outlet />
        </Card>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
