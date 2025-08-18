import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

interface TopNavbarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ collapsed, onToggle }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 16px',
      height: '64px'
    }}>
      <Space>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          style={{ fontSize: '16px', width: 64, height: 64 }}
        />
        <Title level={4} style={{ margin: 0 }}>
          Web测试平台
        </Title>
      </Space>

      <Space>
        <Button type="primary">
          新建测试
        </Button>
      </Space>
    </div>
  );
};

export default TopNavbar;