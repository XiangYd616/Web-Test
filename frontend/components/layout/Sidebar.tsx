import {
  BugOutlined,
  DashboardOutlined,
  GlobalOutlined,
  QuestionCircleOutlined,
  SecurityScanOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Menu } from 'antd';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/testing',
      icon: <BugOutlined />,
      label: '测试工具',
    },
    {
      key: '/stress-test',
      icon: <GlobalOutlined />,
      label: '压力测试',
    },
    {
      key: '/content-detection',
      icon: <SecurityScanOutlined />,
      label: '内容检测',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: '帮助文档',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <div style={{ height: '100%', paddingTop: '16px' }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default Sidebar;