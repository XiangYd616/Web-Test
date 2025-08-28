import React from 'react';
import { useState } from 'react';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
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
      {/* 椤堕儴瀵艰埅锟?*/}
      <TopNavbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 渚ц竟锟?*/}
        <ModernSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        {/* 涓诲唴瀹瑰尯锟?*/}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 涓诲唴锟?*/}
          <main className="flex-1 overflow-y-auto dark-page-scrollbar">
            <div className="p-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ModernLayout;

