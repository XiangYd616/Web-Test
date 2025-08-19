import {
  BarChartOutlined,
  BugOutlined,
  DashboardOutlined,
  QuestionCircleOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Sider } = Layout;

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
      icon: <ThunderboltOutlined />,
      label: '压力测试',
    },
    {
      key: '/content-detection',
      icon: <SecurityScanOutlined />,
      label: 'SEO测试',
    },
    {
      key: '/performance-test',
      icon: <BarChartOutlined />,
      label: '性能测试',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: '帮助文档',
    },
  ];

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}
    >
      {/* Logo区域 */}
      <div className={`sidebar-logo ${collapsed ? 'collapsed' : ''}`}>
        <div className={`sidebar-logo-text ${collapsed ? 'collapsed' : ''}`}>
          {collapsed ? 'TW' : 'Test Web App'}
        </div>
      </div>

      {/* 菜单区域 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }: { key: string }) => navigate(key)}
        className="sidebar-menu"
      />
    </Sider>
  );
};

export default Sidebar;
