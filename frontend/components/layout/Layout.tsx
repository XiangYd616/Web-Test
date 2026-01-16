/**
 * Layout.tsx - Modern Layout Wrapper
 *
 * This component provides a modern layout wrapper that uses the layout system
 * from components/common/Layout.tsx. It serves as the main application layout with
 * modern styling and responsive design.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLayout, PageLayoutProps } from '../common/Layout';
import TopNavbar from '../modern/TopNavbar';
import Sidebar from './Sidebar';

interface ModernLayoutProps extends Omit<PageLayoutProps, 'children'> {
  showHeader?: boolean;
  showFooter?: boolean;
}

const Layout: React.FC<ModernLayoutProps> = ({
  showHeader = true,
  showFooter = false,
  background = 'default',
  maxWidth = 'full',
  ...props
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <PageLayout
      background={background}
      maxWidth={maxWidth}
      className="h-screen overflow-hidden"
      {...props}
    >
      <div className="flex h-full">
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

        <div className="flex-1 flex flex-col min-h-0">
          {showHeader && (
            <TopNavbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={handleToggleSidebar} />
          )}

          <div className="main-content flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Optional Footer */}
      {showFooter && (
        <footer className="mt-auto py-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            漏 2024 Test-Web Platform. All rights reserved.
          </div>
        </footer>
      )}
    </PageLayout>
  );
};

export default Layout;
export type { ModernLayoutProps };
