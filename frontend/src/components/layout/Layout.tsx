import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { 
  Layout as AntdLayout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Button,
  theme
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  SecurityScanOutlined,
  BugOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = AntdLayout

const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制台',
      onClick: () => navigate('/dashboard')
    },
    {
      key: 'stress-test',
      icon: <ThunderboltOutlined />,
      label: '压力测试',
      onClick: () => navigate('/stress-test')
    },
    {
      key: 'content-detection',
      icon: <SecurityScanOutlined />,
      label: '内容检测',
      onClick: () => navigate('/content-detection')
    },
    {
      key: 'compatibility-test',
      icon: <BugOutlined />,
      label: '兼容性测试',
      onClick: () => navigate('/compatibility-test')
    },
    {
      key: 'seo-analysis',
      icon: <SearchOutlined />,
      label: 'SEO分析',
      onClick: () => navigate('/seo-analysis')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings')
    },
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => navigate('/login')
    },
  ]

  return (
    <AntdLayout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="shadow-lg"
      >
        <div className="flex items-center justify-center h-16 bg-blue-600 text-white font-bold text-lg">
          {collapsed ? 'TW' : 'Test-Web'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
        />
      </Sider>
      
      <AntdLayout>
        <Header 
          style={{ 
            padding: 0, 
            background: colorBgContainer,
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
          }}
          className="flex items-center justify-between"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-base w-16 h-16"
          />
          
          <div className="mr-6">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center cursor-pointer">
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />} 
                  className="mr-2" 
                />
                <span className="text-gray-700">管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
          }}
          className="overflow-auto"
        >
          <Outlet />
        </Content>
      </AntdLayout>
    </AntdLayout>
  )
}

export default Layout
