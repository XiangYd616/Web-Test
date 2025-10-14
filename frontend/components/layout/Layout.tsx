/**
 * Layout.tsx - Modern Layout Wrapper
 * 
 * This component provides a modern layout wrapper that uses the unified layout system
 * from components/common/Layout.tsx. It serves as the main application layout with
 * modern styling and responsive design.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageLayout, PageLayoutProps } from '../common/Layout';

interface ModernLayoutProps extends Omit<PageLayoutProps, 'children'> {
  showHeader?: boolean;
  showFooter?: boolean;
}

const Layout: React.FC<ModernLayoutProps> = ({
  showHeader = false,
  showFooter = false,
  background = 'default',
  maxWidth = 'full',
  ...props
}) => {
  return (
    <PageLayout
      background={background}
      maxWidth={maxWidth}
      className="min-h-screen"
      {...props}
    >
      {/* Main Content Area */}
      <div className="flex-1">
        <Outlet />
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
