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
