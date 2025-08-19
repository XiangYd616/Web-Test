/**
 * 优化后的侧边栏导航
 * 
 * 重新设计的导航结构，提供清晰的功能分组和直观的用户体验
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  BarChartOutlined,
  BookOutlined,
  BugOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HeartOutlined,
  ImportOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Badge, Layout, Menu, Typography } from 'antd';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const { Sider } = Layout;
const { Title } = Typography;

interface OptimizedSidebarProps {
  collapsed: boolean;
}

const OptimizedSidebar: React.FC<OptimizedSidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>(['testing']);

  // 菜单项配置
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
      onClick: () => navigate('/app/dashboard')
    },
    {
      key: 'testing',
      icon: <BugOutlined />,
      label: '测试工具',
      children: [
        {
          key: 'testing-overview',
          icon: <FileTextOutlined />,
          label: '测试总览',
          onClick: () => navigate('/app/testing')
        },
        {
          key: 'stress-test',
          icon: <ThunderboltOutlined />,
          label: '压力测试',
          onClick: () => navigate('/app/testing/stress')
        },
        {
          key: 'performance-test',
          icon: <RocketOutlined />,
          label: '性能测试',
          onClick: () => navigate('/app/testing/performance')
        },
        {
          key: 'security-test',
          icon: <SafetyOutlined />,
          label: '安全测试',
          onClick: () => navigate('/app/testing/security')
        },
        {
          key: 'seo-test',
          icon: <SearchOutlined />,
          label: 'SEO测试',
          onClick: () => navigate('/app/testing/seo')
        },
        {
          key: 'api-test',
          icon: <GlobalOutlined />,
          label: 'API测试',
          onClick: () => navigate('/app/testing/api')
        },
        {
          key: 'website-test',
          icon: <BugOutlined />,
          label: (
            <span>
              网站测试
              <Badge size="small" count="新" style={{ marginLeft: 8 }} />
            </span>
          ),
          onClick: () => navigate('/app/testing/website')
        },
        {
          key: 'content-detection',
          icon: <SafetyOutlined />,
          label: (
            <span>
              内容检测
              <Badge size="small" count="新" style={{ marginLeft: 8 }} />
            </span>
          ),
          onClick: () => navigate('/app/testing/content')
        }
      ]
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: '数据管理',
      children: [
        {
          key: 'data-center',
          icon: <DatabaseOutlined />,
          label: '数据中心',
          onClick: () => navigate('/app/data/center')
        },
        {
          key: 'reports',
          icon: <BarChartOutlined />,
          label: '测试报告',
          onClick: () => navigate('/app/data/reports')
        },
        {
          key: 'import-export',
          icon: <ImportOutlined />,
          label: '导入导出',
          onClick: () => navigate('/app/data/export')
        }
      ]
    },
    {
      key: 'user',
      icon: <UserOutlined />,
      label: '用户中心',
      children: [
        {
          key: 'profile',
          icon: <ProfileOutlined />,
          label: '个人资料',
          onClick: () => navigate('/app/user/profile')
        },
        {
          key: 'settings',
          icon: <SettingOutlined />,
          label: '账户设置',
          onClick: () => navigate('/app/user/settings')
        },
        {
          key: 'preferences',
          icon: <HeartOutlined />,
          label: '偏好配置',
          onClick: () => navigate('/app/user/preferences')
        }
      ]
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: '帮助支持',
      children: [
        {
          key: 'docs',
          icon: <BookOutlined />,
          label: '使用文档',
          onClick: () => navigate('/app/help/docs')
        },
        {
          key: 'faq',
          icon: <ExclamationCircleOutlined />,
          label: '常见问题',
          onClick: () => navigate('/app/help/faq')
        },
        {
          key: 'support',
          icon: <CustomerServiceOutlined />,
          label: '技术支持',
          onClick: () => navigate('/app/help/support')
        }
      ]
    }
  ];

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;

    // 精确匹配路径到菜单项
    const pathToKeyMap: Record<string, string> = {
      '/app/dashboard': 'dashboard',
      '/app/testing': 'testing-overview',
      '/app/testing/stress': 'stress-test',
      '/app/testing/performance': 'performance-test',
      '/app/testing/security': 'security-test',
      '/app/testing/seo': 'seo-test',
      '/app/testing/api': 'api-test',
      '/app/testing/website': 'website-test',
      '/app/testing/content': 'content-detection',
      '/app/data/center': 'data-center',
      '/app/data/reports': 'reports',
      '/app/data/export': 'import-export',
      '/app/user/profile': 'profile',
      '/app/user/settings': 'settings',
      '/app/user/preferences': 'preferences',
      '/app/help/docs': 'docs',
      '/app/help/faq': 'faq',
      '/app/help/support': 'support'
    };

    return [pathToKeyMap[path] || 'dashboard'];
  };

  // 获取默认展开的菜单项
  const getDefaultOpenKeys = () => {
    const path = location.pathname;

    if (path.startsWith('/app/testing')) return ['testing'];
    if (path.startsWith('/app/data')) return ['data'];
    if (path.startsWith('/app/user')) return ['user'];
    if (path.startsWith('/app/help')) return ['help'];

    return [];
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={280}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100
      }}
    >
      {/* Logo区域 */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 24px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        {!collapsed ? (
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            Test-Web
          </Title>
        ) : (
          <div style={{
            width: 32,
            height: 32,
            background: '#1890ff',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold'
          }}>
            T
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={handleOpenChange}
        style={{
          borderRight: 0,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto'
        }}
        items={menuItems}
      />
    </Sider>
  );
};

export default OptimizedSidebar;
