/**
 * 主应用布局组件
 * 
 * 提供统一的应用布局，包括侧边栏、顶部导航、主内容区域
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import { Layout, theme } from 'antd';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ModernSidebar from '../components/layout/ModernSidebar';
import TopNavbar from '../components/layout/TopNavbar';

const { Header, Sider, Content } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 侧边栏 */}
      <ModernSidebar collapsed={collapsed} />

      {/* 主内容区域 */}
      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-72'}`}>
        {/* 顶部导航 */}
        <TopNavbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        {/* 页面内容 */}
        <main className="p-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[calc(100vh-8rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
