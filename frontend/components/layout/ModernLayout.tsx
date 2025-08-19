import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import ModernSidebar from './ModernSidebar';
import TopNavbar from './TopNavbar';

const ModernLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { actualTheme } = useTheme();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: actualTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div className={`min-h-screen bg-gray-900 ${actualTheme === 'dark' ? 'dark' : ''}`}>
        {/* 侧边栏 */}
        <ModernSidebar collapsed={collapsed} />

        {/* 主内容区域 */}
        <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          {/* 顶部导航栏 */}
          <TopNavbar collapsed={collapsed} onToggle={toggleSidebar} />

          {/* 页面内容 */}
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ModernLayout;
