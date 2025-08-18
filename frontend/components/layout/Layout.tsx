import { Layout as AntLayout } from 'antd';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../../styles/layout.css';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const { Header, Sider, Content } = AntLayout;

export interface LayoutProps {
  children?: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <AntLayout className="main-layout">
      {/* 侧边栏 */}
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

      {/* 顶部导航栏 */}
      <TopNavbar collapsed={collapsed} onToggle={toggleSidebar} />

      {/* 主内容区域 */}
      <Content className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="content-container">
          {children || <Outlet />}
        </div>
      </Content>
    </AntLayout>
  );
};

export default Layout;
