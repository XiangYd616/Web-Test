/**
 * Layout.tsx - React组件
 * 
 * 文件路径: frontend\components\layout\Layout.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`layout ${className}`}>
      {title && <h1 className="layout-title">{title}</h1>}
      <div className="layout-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;
