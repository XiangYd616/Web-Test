/**
 * Layout.tsx - Modern Layout Wrapper
 * 
 * This component provides a modern layout wrapper with navigation and sidebar.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../navigation/Navigation';
import Sidebar from './Sidebar';

interface ModernLayoutProps {
  showHeader?: boolean;
  showFooter?: boolean;
  showSidebar?: boolean;
}

const Layout: React.FC<ModernLayoutProps> = ({
  showHeader = true,
  showFooter = false,
  showSidebar = true
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top Navigation */}
      {showHeader && <Navigation />}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-800/50">
          <div className="p-6 max-w-[1920px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Optional Footer */}
      {showFooter && (
        <footer className="py-6 border-t border-gray-800 bg-gray-900">
          <div className="text-center text-sm text-gray-400">
            © 2024 Test-Web Platform. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
export type { ModernLayoutProps };
