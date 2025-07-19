import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { DebugPanel } from '../system';
import ModernSidebar from './ModernSidebar';
import TopNavbar from './TopNavbar';

const ModernLayout: React.FC = () => {
  const { actualTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={`h-screen flex flex-col theme-transition ${actualTheme === 'light' ? 'light-theme-wrapper' : 'dark-theme-wrapper'}`}>
      {/* 顶部导航栏 */}
      <TopNavbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <ModernSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 主内容 */}
          <main className="flex-1 overflow-y-auto dark-page-scrollbar">
            <div className="p-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* 调试面板 */}
      <DebugPanel />
    </div>
  );
};

export default ModernLayout;
