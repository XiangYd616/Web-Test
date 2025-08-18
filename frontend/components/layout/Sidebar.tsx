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
      key: 'testing',
      icon: <BugOutlined />,
      label: '测试工具',
      children: [
        {
          key: '/testing/api',
          label: 'API测试',
        },
        {
          key: '/testing/performance',
          label: '性能测试',
        },
        {
          key: '/testing/security',
          label: '安全测试',
        },
        {
          key: '/testing/seo',
          label: 'SEO测试',
        },
        {
          key: '/testing/stress',
          label: '压力测试',
        },
        {
          key: '/testing/compatibility',
          label: '兼容性测试',
        },
        {
          key: '/testing/ux',
          label: 'UX测试',
        },
        {
          key: '/testing/website',
          label: '网站综合测试',
        },
        {
          key: '/testing/infrastructure',
          label: '基础设施测试',
        },
      ],
    },
    {
      key: 'data',
      icon: <GlobalOutlined />,
      label: '数据管理',
      children: [
        {
          key: '/data/reports',
          label: '测试报告',
        },
        {
          key: '/data/results',
          label: '测试结果',
        },
        {
          key: '/data/analytics',
          label: '数据分析',
        },
      ],
    },
    {
      key: 'management',
      icon: <SecurityScanOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/management/admin',
          label: '管理员面板',
        },
        {
          key: '/management/integration',
          label: '集成管理',
        },
        {
          key: '/management/scheduling',
          label: '任务调度',
        },
      ],
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