import { Layout as AntLayout } from 'antd';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const { Header, Sider, Content } = AntLayout;

export interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <Header style={{ padding: 0, background: '#fff' }}>
        <TopNavbar collapsed={collapsed} onToggle={toggleSidebar} />
      </Header>

      <AntLayout>
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          style={{ background: '#fff' }}
        >
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </Sider>

        {/* 主内容区域 */}
        <Content style={{ margin: '16px', background: '#fff', borderRadius: '8px' }}>
          {children || <Outlet />}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
