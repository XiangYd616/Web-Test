import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Avatar, Badge, Button, Dropdown, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

interface TopNavbarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ collapsed, onToggle }) => {
  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
    },
    {
      key: 'settings',
      label: '账户设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
    },
  ];

  return (
    <div className={`top-navbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="top-navbar-left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="top-navbar-toggle"
        />
        <Title level={4} className="top-navbar-title">
          Test-Web 压力测试平台
        </Title>
      </div>

      <div className="top-navbar-right">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="top-navbar-new-test-btn"
        >
          新建测试
        </Button>

        <Badge count={3} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            className="top-navbar-notification"
          />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text" className="top-navbar-user">
            <Avatar size={32} icon={<UserOutlined />} />
            <span className="top-navbar-user-name">管理员</span>
          </Button>
        </Dropdown>
      </div>
    </div>
  );
};

export default TopNavbar;